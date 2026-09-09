import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { VideoHero } from "@/components/layout/VideoHero";
import { VeyraMark } from "@/components/brand/VeyraBrand";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * Public landing page ("/") — the cinematic entry experience.
 * Minimal top bar (brand + one action), centered hero, no application sidebar.
 */
export default function HeroLanding() {
  usePageTitle("AI Fraud Intelligence");
  const authenticated = useAuthStore((s) => s.status === "authenticated");

  return (
    <div className="relative z-10 flex min-h-svh flex-col">
      {/* Minimal top bar — navigation, not the application sidebar */}
      <header className="flex h-[4.5rem] shrink-0 items-center justify-between px-5 md:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="VEYRA — AI Fraud Intelligence — home"
        >
          <VeyraMark size={38} />
          <span className="leading-none">
            <span className="block whitespace-nowrap text-[15px] font-extrabold tracking-[0.22em] text-[#F5F5F2]">
              VEYRA
            </span>
            <span className="mt-[5px] block whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">
              AI Fraud Intelligence
            </span>
          </span>
        </Link>

        {authenticated ? (
          <Link to="/overview" className="btn-hero-ghost !h-10 !px-4">
            <span className="sm:hidden">Dashboard</span>
            <span className="hidden sm:inline">Open dashboard</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <Link to="/login" className="btn-hero-ghost !h-10 !px-4">
            Sign in
          </Link>
        )}
      </header>

      {/* Centered hero composition over the video background */}
      <main className="flex flex-1 flex-col">
        <VideoHero />
      </main>

      <footer className="shrink-0 px-5 pb-6 text-center text-xs text-white/40 md:px-8">
        CREDIT CARD FRAUD DETECTION SYSTEM · machine learning + rules + SHAP · decision-support, not a banking decision
      </footer>
    </div>
  );
}
