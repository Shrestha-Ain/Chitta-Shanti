from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from datetime import datetime, timezone
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
import shutil
import os
import hashlib

from database import get_db
from models_db import gen_id
from api.auth_api import require_role, get_current_user
from pipelines.video_processing import run_opencv_processing, run_audio_processing_from_video
from pipelines.pipeline_utils import score_stress

router = APIRouter()


class InterventionPayload(BaseModel):
    personnel_id: str
    action_type: str
    notes: str


# ---------------------------------------------------------
# The candidate app's one real endpoint
# ---------------------------------------------------------
@router.post("/full-evaluate")
async def full_evaluate(
    video: UploadFile = File(...),
    # Questionnaire Form Parameters
    age: int = Form(22),
    gender: str = Form("Male"),
    sleep_duration: float = Form(7.0),
    sleep_quality: int = Form(3),
    wake_up_time: float = Form(7.0),
    bed_time: float = Form(23.0),
    physical_activity: float = Form(1.0),
    screen_time: float = Form(6.0),
    caffeine_intake: int = Form(1),
    alcohol_intake: int = Form(0),
    smoking_habit: str = Form("No"),
    work_hours: float = Form(8.0),
    travel_time: float = Form(1.0),
    social_interactions: float = Form(2.0),
    meditation_practice: str = Form("No"),
    exercise_type: str = Form("Cardio"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    personnel_id = current_user["Username"]

    video_temp = f"temp_{video.filename}"
    with open(video_temp, "wb") as f:
        shutil.copyfileobj(video.file, f)
    try:
        video_metrics = await run_in_threadpool(run_opencv_processing, video_temp)
        voice_metrics = await run_in_threadpool(run_audio_processing_from_video, video_temp)
    finally:
        if os.path.exists(video_temp):
            os.remove(video_temp)

    video_features = {
        "hr_bpm": video_metrics["hr_bpm"],
        "rmssd_ms": video_metrics["rmssd_ms"],
        "blink_rate_bpm": video_metrics["blink_rate"],
        "brow_ratio": video_metrics["brow_ratio"],
        "pitch_mean_hz": voice_metrics["pitch_mean_hz"],
        "pitch_std_hz": voice_metrics["pitch_std_hz"],
    }

    survey_data = {
        "Age": age,
        "Gender": gender,
        "Sleep_Duration": sleep_duration,
        "Sleep_Quality": sleep_quality,
        "Wake_Up_Time": wake_up_time,
        "Bed_Time": bed_time,
        "Physical_Activity": physical_activity,
        "Screen_Time": screen_time,
        "Caffeine_Intake": caffeine_intake,
        "Alcohol_Intake": alcohol_intake,
        "Smoking_Habit": smoking_habit,
        "Work_Hours": work_hours,
        "Travel_Time": travel_time,
        "Social_Interactions": social_interactions,
        "Meditation_Practice": meditation_practice,
        "Exercise_Type": exercise_type,
    }

    result = score_stress(video_features, survey_data)

    session_doc = {
        "_id": gen_id(),
        "personnel_id": personnel_id,
        "video_features": video_features,
        "survey_data": survey_data,
        "stress_score": result["final_stress_score"],
        "stress_probability": result["stress_probability"],
        "classification": result["classification"],
        "created_at": datetime.now(timezone.utc),
    }
    db.assessment_sessions.insert_one(session_doc)

    return {
        "session_id": session_doc["_id"],
        "personnel_id": personnel_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **result
    }


# ---------------------------------------------------------
# Commander / Officer Dashboards (RBAC-protected)
# ---------------------------------------------------------
@router.get("/commander/roster")
def get_commander_roster(
    db=Depends(get_db),
    _current_user=Depends(require_role("commander", "medical_officer")),
):
    latest_sessions = list(
        db.assessment_sessions.find().sort("created_at", -1).limit(50)
    )
    seen = set()
    roster = []
    for s in latest_sessions:
        pid = s["personnel_id"]
        if pid in seen:
            continue
        seen.add(pid)
        # Commanders only ever see an anonymized ID + a simple flag — never
        # the real ID, raw numbers, or reasoning. Only medical_officer role
        # (see /welfare/triage below) can see the real personnel_id and why.
        anonymized_id = hashlib.sha256(pid.encode()).hexdigest()[:12]
        roster.append({
            "candidate_id": anonymized_id,
            "readiness_tag": "Mandatory Rest Required" if s.get("classification") == "Critical Fatigue" else "Fit for Duty",
        })
    return {"total_evaluated": len(roster), "roster": roster}


@router.get("/welfare/triage")
def get_welfare_triage(
    db=Depends(get_db),
    _current_user=Depends(require_role("medical_officer")),
):
    """Medical/welfare officers only — real personnel_id and full clinical
    reasoning. Commanders cannot reach this endpoint (see roster above for
    what they're allowed to see instead)."""
    critical_sessions = list(
        db.assessment_sessions.find({"classification": "Critical Fatigue"})
        .sort("created_at", -1)
        .limit(20)
    )
    pending = []
    for s in critical_sessions:
        shap_attr = s.get("shap_attribution") or []
        top_driver = shap_attr[0]["description"] if shap_attr else "High stress probability"
        pending.append({
            "personnel_id": s["personnel_id"],
            "risk_tier": "Critical",
            "primary_shap_driver": top_driver,
            "suggested_action": "Clinical rest order & psychological check-in.",
        })
    return {"pending_triages": pending}


@router.post("/welfare/interventions")
def log_welfare_intervention(
    data: InterventionPayload,
    db=Depends(get_db),
    _current_user=Depends(require_role("medical_officer")),
):
    doc = {
        "_id": gen_id(),
        "personnel_id": data.personnel_id,
        "action_type": data.action_type,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc),
    }
    db.welfare_interventions.insert_one(doc)
    return {"status": "success", "message": f"Intervention '{data.action_type}' recorded for {data.personnel_id}."}