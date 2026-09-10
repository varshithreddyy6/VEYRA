import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { VeyraWordmark } from "@/components/brand/VeyraBrand";
import { ThemeToggle } from "@/components/navigation/ThemeToggle";
import { usePageTitle } from "@/lib/usePageTitle";

export default function HeroLanding() {
  usePageTitle("AI Fraud Intelligence");
  const authenticated = useAuthStore((s) => s.status === "authenticated");
  return <div className="landing-shell min-h-screen">
    <header className="landing-nav"><Link to="/" aria-label="VEYRA home"><VeyraWordmark /></Link><div className="flex items-center gap-3"><ThemeToggle /><Link to={authenticated ? "/home" : "/login"} className="landing-signin">{authenticated ? "Open Home" : "Sign in"}</Link></div></header>
    <main className="landing-hero"><div className="landing-copy"><div className="eyebrow landing-eyebrow">AI · ML · ALGORITHM · TRUST</div><h1>VEYRA</h1><p className="landing-tagline">INTELLIGENCE AGAINST FRAUD</p><p className="landing-lede">Intelligent transaction screening, explanation, and risk analysis for safer decisions.</p><Link to={authenticated ? "/home" : "/login"} className="landing-cta">{authenticated ? "Open workspace" : "Get started"}<ArrowRight className="h-4 w-4" /></Link></div></main>
    <footer className="landing-footer">Safer transactions. Smarter decisions. A more secure tomorrow.</footer>
  </div>;
}
