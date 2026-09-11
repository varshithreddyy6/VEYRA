import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { registerSchema, type RegisterFormValues } from "@/lib/validators";
import { useAuthStore } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api";
import { VeyraMark } from "@/components/brand/VeyraBrand";
import { usePageTitle } from "@/lib/usePageTitle";

export default function Register() {
  usePageTitle("Create account");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });
  const registerUser = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerUser({
        email: values.email,
        full_name: values.full_name,
        password: values.password,
        role: "analyst",
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setServerError(apiErrorMessage(err, "Registration failed"));
    }
  };

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="auth-corner"><Link to="/" className="back-home"><ArrowLeft className="h-4 w-4" /> Back</Link><span /></div>
      <div className="relative z-10 w-full max-w-[440px] animate-fadeUp">
        <div className="mb-8 flex flex-col items-center text-center">
          <VeyraMark size={46} />
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-text">VEYRA</h1>
          <p className="mt-1 text-[13px] font-medium text-muted">
            AI Fraud Intelligence
          </p>
          <p className="mt-3 text-sm text-textdim">Create your analyst account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-card space-y-5 p-7" noValidate data-testid="register-form">
          <div>
            <label htmlFor="full_name" className="label">Full name</label>
            <input id="full_name" className="input" placeholder="Jane Analyst" {...register("full_name")} />
            {errors.full_name && <p className="field-error" role="alert">{errors.full_name.message}</p>}
          </div>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="field-error" role="alert">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="input pr-11"
                placeholder="Min 8 chars, letters + digits"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="field-error" role="alert">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="confirm_password" className="label">Confirm password</label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                className="input pr-11"
                {...register("confirm_password")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
                aria-pressed={showConfirm}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.confirm_password && <p className="field-error" role="alert">{errors.confirm_password.message}</p>}
          </div>

          {serverError && (
            <p className="flex items-start gap-2.5 rounded-[10px] border border-alert/20 bg-alert/[0.06] px-3.5 py-3 text-sm text-alert" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {serverError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
          <p className="text-center text-sm text-textdim">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-accent transition-colors hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
