import { useState } from "react";
import { registerUser } from "../../api/authApi";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  LockKeyhole,
  ShieldUser,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.png";

export default function RegisterForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    password: "",
    role: "",
    unitId: "",
  });

  const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

const handleSubmit = async (event) => {
  event.preventDefault();

  setError("");
  setSuccess("");

  try {
    setLoading(true);

    await registerUser(formData);

    setSuccess(
      "Registration successful. Redirecting to login..."
    );

    setFormData({
      username: "",
      fullName: "",
      password: "",
      role: "",
      unitId: "",
    });

    setTimeout(() => {
      navigate("/login", { replace: true });
    }, 1000);
  } catch (err) {
    console.error("Registration failed:", err);

    setError(
      err?.message ||
        "Unable to register. Please try again."
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div
      className="
        w-full
        max-w-md
        rounded-3xl
        border
        border-pink-100
        bg-white/85
        p-8
        shadow-xl
        shadow-[#ce2d5d]/5
        backdrop-blur-md
        transition-all
        sm:p-10
      "
    >
      {/* Logo */}
      <div className="flex flex-col items-center justify-center text-center">
        <div
          className="
            mb-5
            flex
            h-24
            w-24
            items-center
            justify-center
            overflow-hidden
            rounded-full
            border
            border-pink-100
            bg-white
            p-2
            shadow-md
            ring-4
            ring-pink-50
            sm:h-28
            sm:w-28
          "
        >
          <img
            src={logo}
            alt="Chitta Shanti Logo"
            className="
              h-full
              w-full
              object-contain
              transition-transform
              duration-300
              hover:scale-105
            "
          />
        </div>

        <h1
          className="
            text-2xl
            font-extrabold
            tracking-tight
            text-slate-900
            sm:text-3xl
          "
          style={{
            fontFamily: "var(--font-display)",
          }}
        >
          Register
        </h1>
      </div>

      {/* Registration form */}
      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5"
      >

        {error && (
  <div
    className="
      rounded-xl
      border
      border-red-200
      bg-red-50
      px-4
      py-3
      text-sm
      font-medium
      text-red-700
    "
  >
    {error}
  </div>
)}

{success && (
  <div
    className="
      rounded-xl
      border
      border-green-200
      bg-green-50
      px-4
      py-3
      text-sm
      font-medium
      text-green-700
    "
  >
    {success}
  </div>
)}
        {/* Username */}
        <RegisterField
          icon={UserRound}
          label="Username"
          name="username"
          placeholder="Enter Username"
          value={formData.username}
          onChange={handleChange}
        />

        {/* Full Name */}
        <RegisterField
          icon={BadgeCheck}
          label="Full Name"
          name="fullName"
          placeholder="Enter Full Name"
          value={formData.fullName}
          onChange={handleChange}
        />

        {/* Password */}
        <RegisterField
          icon={LockKeyhole}
          label="Password"
          name="password"
          placeholder="Create password"
          type="password"
          value={formData.password}
          onChange={handleChange}
        />

        {/* Role */}
        <RegisterField
          icon={ShieldUser}
          label="Role"
          name="role"
          placeholder="Enter Role (e.g. Officer, Specialist)"
          value={formData.role}
          onChange={handleChange}
        />

        {/* Unit ID */}
        <RegisterField
          icon={Building2}
          label="Unit ID"
          name="unitId"
          placeholder="Enter Unit ID / Batt. Code"
          value={formData.unitId}
          onChange={handleChange}
        />

        {/* Register button */}
        <div className="flex justify-center pt-3">
          <button
  type="submit"
  disabled={loading}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-full
              bg-[#ce2d5d]
              px-8
              py-3.5
              text-base
              font-bold
              text-white
              shadow-lg
              shadow-[#ce2d5d]/30
              transition
              duration-200
              hover:bg-[#b8204c]
              active:scale-[0.99]
              sm:w-2/3
            "
          >
            <span>
  {loading ? "Registering..." : "Register"}
</span>

            <ArrowRight
              size={19}
              strokeWidth={2}
            />
          </button>
        </div>
      </form>

      {/* Login link */}
      <div
        className="
          mt-8
          border-t
          border-slate-100
          pt-6
          text-center
          text-xs
          text-slate-500
          sm:text-sm
        "
      >
        Already have an account?

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="
            ml-1
            font-bold
            text-[#b8204c]
            transition
            hover:text-[#9b163d]
            hover:underline
          "
        >
          Login
        </button>
      </div>
    </div>
  );
}


/*
 * Reusable registration field.
 */
function RegisterField({
  icon: Icon,
  label,
  name,
  placeholder,
  type = "text",
  value,
  onChange,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {/* Label */}
      <div
        className="
          flex
          shrink-0
          items-center
          gap-1.5
          rounded-xl
          border
          border-pink-100
          bg-pink-50/80
          px-3.5
          py-3
          text-xs
          font-semibold
          text-slate-700
          shadow-sm
          sm:w-32
          sm:text-sm
        "
      >
        <Icon
          size={17}
          strokeWidth={2}
          className="text-[#b8204c]"
        />

        <span>{label}</span>
      </div>

      {/* Input */}
      <div className="relative flex-1">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          className="
            w-full
            rounded-xl
            border
            border-slate-200
            bg-slate-50/70
            px-4
            py-3
            text-sm
            font-medium
            text-slate-800
            outline-none
            transition
            placeholder:text-slate-400
            hover:bg-slate-50
            focus:border-[#ce2d5d]
            focus:bg-white
            focus:ring-2
            focus:ring-[#ce2d5d]/20
          "
        />
      </div>
    </div>
  );
}