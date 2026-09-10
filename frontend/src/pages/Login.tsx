import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { loginSchema, type LoginFormValues } from "@/lib/validators";
import { useAuthStore } from "@/lib/auth";
import { apiErrorMessage } from "@/lib/api";
import { VeyraMark } from "@/components/brand/VeyraBrand";
import { usePageTitle } from "@/lib/usePageTitle";

export default function Login() {
  usePageTitle("Sign in");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/home";
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") navigate(from, { replace: true });
  }, [status, from, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(apiErrorMessage(err, "Login failed"));
    }
  };

  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="auth-corner"><Link to="/" className="back-home"><ArrowLeft className="h-4 w-4" /> Back</Link><ThemeToggle /></div>
      <div className="relative z-10 w-full max-w-[420px] animate-fadeUp">
        <div className="mb-9 flex flex-col items-center text-center">
          <VeyraMark size={48} />
          <h1 className="mt-5 text-[15px] font-extrabold uppercase tracking-[0.24em] text-[#F5F5F2]">VEYRA</h1>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            AI Fraud Intelligence
          </p>
          <p className="mt-3 text-sm text-textdim">Analyst sign-in · credit card fraud screening and explainability</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="panel space-y-5 p-7" noValidate data-testid="login-form">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="email" type="email" autoComplete="email" placeholder="analyst@example.com"
                className="input h-11 pl-10" {...register("email")} />
            </div>
            {errors.email && <p className="field-error" role="alert">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="••••••••"
                className="input h-11 pl-10 pr-11" {...register("password")} />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && <p className="field-error" role="alert">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="flex items-start gap-2.5 rounded-[10px] border border-alert/20 bg-alert/[0.08] px-3.5 py-3 text-sm text-alert" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {serverError}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-sm text-textdim">
            No account?{" "}
            <Link to="/register" className="font-semibold text-accent transition-colors hover:text-white">
              Create one
            </Link>
          </p>
          <div className="border-t border-white/[0.06] pt-4 text-[13px] leading-relaxed text-textdim">
            <div className="label-sm mb-2.5">Demo accounts (seeded)</div>
            <div className="space-y-1.5">
              <div><span className="font-mono text-text">analyst@example.com</span> · <span className="font-mono text-text">Password123!</span></div>
              <div><span className="font-mono text-text">admin@example.com</span> · <span className="font-mono text-text">Password123!</span></div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
