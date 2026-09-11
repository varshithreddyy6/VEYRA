import { Link } from "react-router-dom";
import { ArrowRight, ScanSearch } from "lucide-react";
import { useAuthStore } from "@/lib/auth";

/**
 * Full-screen hero over the site-wide video background.
 *
 * Composition: eyebrow → VEYRA → descriptor → subtitle → primary + secondary
 * CTAs → disclaimer. Typography carries identity; the video provides
 * atmosphere only. Fully functional with or without the video.
 */
export function VideoHero() {
  const authenticated = useAuthStore((s) => s.status === "authenticated");

  return (
    <section
      aria-labelledby="video-hero-title"
      className="relative z-10 flex w-full flex-1 items-center justify-center overflow-hidden bg-black/10"
    >
      <div className="mx-auto w-full max-w-5xl px-5 py-20 text-center md:px-8">
        <p className="mb-7 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.42em] text-white/70 md:mb-9">
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-white/20 bg-white/[0.06]">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" aria-hidden="true">
              <path d="M5.5 5.5 12 19 18.5 5.5" stroke="#F5F5F2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          AI Fraud Intelligence
        </p>

        <h1
          id="video-hero-title"
          className="text-[clamp(3rem,10vw,5.25rem)] font-extrabold leading-[0.98] tracking-[0.14em] text-[#F5F5F2] [text-shadow:0_2px_32px_rgba(0,0,0,0.55)]"
        >
          VEYRA
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/80 md:text-[19px]">
          Intelligent transaction screening, explanation, and risk analysis.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3.5 md:mt-12 md:flex-row">
          <Link to="/screening" className="btn-hero">
            <ScanSearch className="h-[18px] w-[18px]" aria-hidden="true" />
            Analyze a transaction
          </Link>
          <Link to={authenticated ? "/overview" : "/login"} className="btn-hero-ghost">
            Explore platform
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <p className="mx-auto mt-9 max-w-md text-xs leading-relaxed text-white/45">
          LOW / MEDIUM / HIGH are model screening outputs for analyst review — not automated
          banking decisions. Educational prototype.
        </p>
      </div>
    </section>
  );
}
