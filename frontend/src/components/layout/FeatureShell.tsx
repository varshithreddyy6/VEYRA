import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { VeyraWordmark } from "@/components/brand/VeyraBrand";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { useAuthStore } from "@/lib/auth";

export function FeatureShell({ title, children }: { title: string; children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  return <div className="feature-shell min-h-screen">
    <header className="feature-nav">
      <Link to="/home" aria-label="Return to VEYRA home"><VeyraWordmark compact /></Link>
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden truncate text-sm font-semibold text-textdim sm:inline">{title}</span>
        <ThemeToggle />
        <button type="button" onClick={() => navigate("/home")} className="back-home"><ArrowLeft className="h-4 w-4" /> <span>Back to Home</span></button>
        <span className="hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-text sm:flex" title={user?.full_name}>{(user?.full_name || "U").slice(0, 1).toUpperCase()}</span>
      </div>
    </header>
    <main className="feature-content">{children}</main>
  </div>;
}
