import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerMentee } from "../services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

function LeafLogo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-28 24 24)">
        {/* Warm Golden Leaf Silhouette */}
        <path
          d="M24 4C24 4 10 14 10 27C10 35 16 41 24 41C32 41 38 35 38 27C38 14 24 4 24 4Z"
          fill="#C58211"
        />
        {/* Center stem vein cut */}
        <line x1="24" y1="39" x2="24" y2="9" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        {/* Left side vein cuts */}
        <line x1="24" y1="31" x2="16" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="23" x2="15" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="15" x2="18" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        {/* Right side vein cuts */}
        <line x1="24" y1="31" x2="32" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="23" x2="33" y2="19" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="15" x2="30" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function WatermarkLeaf({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="rotate(-28 24 24)">
        <path
          d="M24 4C24 4 10 14 10 27C10 35 16 41 24 41C32 41 38 35 38 27C38 14 24 4 24 4Z"
          fill="white"
        />
        <line x1="24" y1="39" x2="24" y2="9" stroke="#9A6208" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="31" x2="16" y2="27" stroke="#9A6208" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="24" y1="23" x2="15" y2="19" stroke="#9A6208" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="24" y1="31" x2="32" y2="27" stroke="#9A6208" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="24" y1="23" x2="33" y2="19" stroke="#9A6208" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function MenteeRegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError(null);
    try {
      await registerMentee(data.email, data.password, data.displayName);
      navigate("/form");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message.includes("auth/email-already-in-use")
            ? "An account with this email address already exists. Please sign in instead."
            : err.message.includes("auth/weak-password")
            ? "Password is too weak. Please use at least 6 characters."
            : "Registration failed. Please check network connection and try again."
          : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-cover bg-center font-sans select-none overflow-x-hidden"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Ambient overlay */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />

      {/* Main Content: Left Headline & Right Register Card */}
      <div className="relative z-10 max-w-7xl w-full mx-auto flex-1 flex flex-col lg:flex-row items-center justify-between gap-8 py-6 lg:py-8">
        {/* Left Side: Motivational Headline */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-start pl-2 sm:pl-8 lg:pl-16">
          <div className="relative">
            <h1 className="font-handwriting font-bold text-slate-800 text-5xl sm:text-6xl lg:text-7xl leading-[0.98] tracking-tight">
              Track<br />
              Your Progress<br />
              <span className="relative inline-block">
                Every Day
                {/* 3 yellow radiant rays over "Day" */}
                <span className="absolute -top-3 -right-8 pointer-events-none">
                  <svg
                    className="w-8 h-8"
                    viewBox="0 0 32 32"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  >
                    <line x1="5" y1="26" x2="2" y2="28" />
                    <line x1="16" y1="18" x2="16" y2="26" />
                    <line x1="27" y1="26" x2="30" y2="28" />
                  </svg>
                </span>
              </span>
            </h1>

            {/* Hand-drawn yellow underline curve */}
            <div className="mt-1">
              <svg
                className="w-48 sm:w-56 h-4"
                viewBox="0 0 220 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 11C65 3 155 3 217 10"
                  stroke="#EAB308"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Subtitle */}
            <p className="text-slate-700 text-sm sm:text-base font-semibold tracking-wide leading-snug mt-4">
              Small steps make<br />
              big achievements
            </p>
          </div>
        </div>

        {/* Right Side: Clean White Floating Register Card */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end pr-0 lg:pr-14">
          <div className="bg-white rounded-[28px] shadow-[0_25px_60px_-10px_rgba(0,0,0,0.16)] p-7 sm:p-9 w-full max-w-[425px] border border-slate-100/90 transition-all">
            {/* Card Header */}
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-1">
                <LeafLogo className="h-10 w-10 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
                  Mentee Registration
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium pl-1">
                Create an account to submit your daily status
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Full Name Field */}
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Full name (e.g. Alex Johnson)"
                    className="pl-10 h-10.5 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-[#C58211] focus:ring-[#C58211]/20 transition-all"
                    {...register("displayName")}
                  />
                </div>
                {errors.displayName && (
                  <p className="text-xs text-rose-500 pl-1">{errors.displayName.message}</p>
                )}
              </div>

              {/* Email Address Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email address"
                    className="pl-10 h-10.5 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-[#C58211] focus:ring-[#C58211]/20 transition-all"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-500 pl-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min 6 characters)"
                    className="pl-10 pr-10 h-10.5 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-[#C58211] focus:ring-[#C58211]/20 transition-all"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-500 pl-1">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    className="pl-10 pr-10 h-10.5 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm focus:border-[#C58211] focus:ring-[#C58211]/20 transition-all"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-500 pl-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-1.5">
                <Button
                  type="submit"
                  className="w-full h-11 bg-[#C58211] hover:bg-[#B0730D] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-[#C58211]/25 transition-all flex items-center justify-center gap-2 cursor-pointer border-0 active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Account...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>Create Account</span>
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>

              {/* Already have an account link */}
              <div className="text-center pt-1">
                <p className="text-xs text-slate-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#C58211] hover:underline cursor-pointer"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>

              {/* Secure Registration Divider */}
              <div className="relative pt-3 pb-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/90" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-white px-3 text-slate-400 font-medium">
                    Secure Registration
                  </span>
                </div>
              </div>

              {/* Firebase Protected Badge */}
              <p className="text-[11px] text-slate-400 text-center font-normal">
                Your data is protected with Firebase Authentication
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Center Watermark */}
      <div className="relative z-10 text-center space-y-1 py-3 drop-shadow-md">
        <div className="flex items-center justify-center gap-2 text-white font-bold text-xs sm:text-sm">
          <WatermarkLeaf className="h-4 w-4 shrink-0" />
          <span>Mentee Daily Status Tracking</span>
        </div>
        <p className="text-[10px] uppercase font-bold text-white/90 tracking-[0.3em]">
          TRACK &nbsp;•&nbsp; UPDATE &nbsp;•&nbsp; GROW
        </p>
      </div>
    </div>
  );
}
