import {
  ArrowRight,
  BrainCircuit,
  ClipboardList,
  FileQuestion,
  History,
  ScanSearch,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/lib/auth";
import { VeyraWordmark } from "@/components/brand/VeyraBrand";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { usePageTitle } from "@/lib/usePageTitle";

const NAV_ANCHORS = [
  { href: "#platform", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#why-veyra", label: "Why Veyra" },
];

const TECH_STACK = ["XGBoost", "SHAP", "FastAPI", "React", "PostgreSQL", "Redis", "Docker"];

const PROBLEMS = [
  {
    icon: FileQuestion,
    title: "Scores without reasons",
    body: "A bare probability forces analysts to guess — so they either rubber-stamp the model or ignore it entirely.",
  },
  {
    icon: Siren,
    title: "Rules without context",
    body: "Static thresholds flag everything or nothing. Nobody can say why a transaction was pulled for review.",
  },
  {
    icon: History,
    title: "Reviews without records",
    body: "Verdicts made in chat threads and spreadsheets can't be audited, reproduced, or defended later.",
  },
];

const PILLARS = [
  {
    icon: ScanSearch,
    title: "Screen",
    body: "Score one transaction or a whole CSV batch through the same pipeline — model probability, risk band, and rule flags together.",
  },
  {
    icon: BrainCircuit,
    title: "Explain",
    body: "Every score ships with SHAP feature attributions and a human-readable statement of what moved it.",
  },
  {
    icon: ClipboardList,
    title: "Review",
    body: "Triage HIGH-risk alerts, filter screening history, and open any transaction's full verdict trail.",
  },
  {
    icon: ShieldCheck,
    title: "Govern",
    body: "Inspect precision, recall, thresholds, and the confusion matrix — metrics computed on held-out test data.",
  },
];

const STEPS = [
  { n: "01", title: "Submit", body: "Send anonymized features only — V1–V28, amount, time. No card numbers, ever." },
  { n: "02", title: "Score", body: "XGBoost returns a fraud probability; rules add independent signals; a band is assigned." },
  { n: "03", title: "Explain", body: "SHAP shows which features pushed the score up or down, in plain language." },
  { n: "04", title: "Record", body: "The screening, verdict, and explanation are stored — ready for audit and review." },
];

const STATS = [
  { value: "28", label: "anonymized features per screening" },
  { value: "3", label: "independent signals — model, rules, SHAP" },
  { value: "100%", label: "of scores shipped with an explanation" },
  { value: "0", label: "card numbers ever accepted or stored" },
];

/** Static product illustration for the hero — mirrors the real screening result panel. */
function ProductMock() {
  return (
    <div className="panel-em overflow-hidden text-left" role="img" aria-label="Illustrative preview of a Veyra screening result: 94.0% fraud probability, high risk, with SHAP explanation bars.">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 hidden rounded-md bg-white px-2.5 py-1 font-mono text-[11px] text-muted sm:inline">
          veyra / screening
        </span>
      </div>
      <div className="p-6 sm:p-8" aria-hidden="true">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="eyebrow">Screening result</div>
          <div className="meta-row">
            <span className="chip">model CCDFS-XGB</span>
            <span className="chip">threshold 0.500</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div className="metric-value text-5xl leading-none">
            94.0<span className="ml-1 text-2xl text-muted">%</span>
          </div>
          <div className="flex flex-col gap-2 pb-1">
            <RiskBadge risk="HIGH" size="lg" />
            <span className="badge risk-high">Potentially fraudulent</span>
          </div>
        </div>
        <div className="relative mt-6 h-1.5 rounded-full bg-border">
          <div className="absolute inset-y-0 left-0 w-[94%] rounded-full bg-alert" />
          <div className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-text" style={{ left: "50%" }} />
        </div>
        <div className="mb-6 mt-2 flex justify-between text-[11px] text-muted">
          <span>0%</span>
          <span>threshold 0.500</span>
          <span>100%</span>
        </div>
        <div className="border-t border-border pt-5">
          <div className="label-sm mb-3">Why was this flagged?</div>
          <ul className="space-y-2.5">
            {[
              { f: "V14", w: "88%", pos: true, v: "+0.824" },
              { f: "V17", w: "64%", pos: true, v: "+0.601" },
              { f: "V10", w: "38%", pos: false, v: "−0.312" },
            ].map((b) => (
              <li key={b.f} className="grid grid-cols-[52px_1fr_64px] items-center gap-3">
                <span className="font-mono text-xs text-textdim">{b.f}</span>
                <span className="relative h-1.5 overflow-hidden rounded-full bg-border">
                  <span className={`absolute inset-y-0 left-0 rounded-full ${b.pos ? "bg-alert/80" : "bg-safe/80"}`} style={{ width: b.w }} />
                </span>
                <span className={`text-right font-mono text-xs tabular-nums ${b.pos ? "text-alert" : "text-safe"}`}>{b.v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function HeroLanding() {
  usePageTitle("AI Fraud Intelligence");
  const authenticated = useAuthStore((s) => s.status === "authenticated");
  const primaryTo = authenticated ? "/home" : "/register";
  const primaryLabel = authenticated ? "Open workspace" : "Get started";

  return (
    <div className="min-h-screen bg-white text-text">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-white/90 backdrop-blur">
        <div className="landing-section flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="VEYRA home">
            <VeyraWordmark compact />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Page">
            {NAV_ANCHORS.map((l) => (
              <a key={l.href} href={l.href} className="feature-link">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {authenticated ? (
              <Link to="/home" className="btn-primary btn-sm">
                {primaryLabel} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <main>
        <section className="landing-section pb-16 pt-16 text-center sm:pt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-wash px-3.5 py-1.5 text-[13px] font-semibold text-primarydeep">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            AI fraud intelligence for analysts
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Every fraud score, explained.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-textdim sm:text-lg">
            Veyra screens transactions with machine learning, cross-checks them with deterministic
            rules, and shows your analysts exactly why each score was produced.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryTo} className="btn-primary btn-lg">
              {primaryLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="btn-secondary btn-lg">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-[13px] text-muted">Demo accounts included · No card data required</p>
          <div className="mx-auto mt-12 max-w-3xl animate-fadeUp">
            <ProductMock />
            <p className="mt-3 text-xs text-muted">Illustrative preview of a screening result</p>
          </div>
        </section>

        {/* ── Tech strip ────────────────────────────────── */}
        <section className="border-y border-border bg-surface py-8">
          <div className="landing-section text-center">
            <p className="eyebrow">Built on proven technology</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {TECH_STACK.map((t) => (
                <span key={t} className="text-[15px] font-semibold text-textdim">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Problem ───────────────────────────────────── */}
        <section id="why-veyra" className="landing-section scroll-mt-24 py-20 sm:py-24">
          <p className="eyebrow">The problem</p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            Fraud review breaks in the middle
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-textdim">
            Models produce numbers. Analysts need reasons. Everything between the score and the
            decision is where fraud operations slow down — and where mistakes hide.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((c) => (
              <div key={c.title} className="landing-card">
                <div className="landing-icon">
                  <c.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textdim">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Platform ──────────────────────────────────── */}
        <section id="platform" className="scroll-mt-24 border-y border-border bg-surface py-20 sm:py-24">
          <div className="landing-section">
            <p className="eyebrow">The platform</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              One workspace for the whole review
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-textdim">
              Screening, explanation, triage, and governance live in one place — so a transaction
              moves from suspicious to resolved without leaving the workspace.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PILLARS.map((c) => (
                <div key={c.title} className="landing-card">
                  <div className="landing-icon">
                    <c.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-textdim">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────── */}
        <section id="how-it-works" className="landing-section scroll-mt-24 py-20 sm:py-24">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            From transaction to verdict in four steps
          </h2>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="border-t-2 border-text pt-5">
                <div className="font-mono text-sm font-semibold text-accent">{s.n}</div>
                <h3 className="mt-2 text-[17px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-textdim">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Stats band ────────────────────────────────── */}
        <section className="bg-text py-16 text-white">
          <div className="landing-section grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="font-display text-4xl font-bold tracking-tight">{s.value}</div>
                <p className="mt-2 text-sm leading-snug text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className="landing-section py-20 sm:py-24">
          <div className="rounded-3xl border border-accent/15 bg-wash/60 px-6 py-14 text-center sm:px-12 sm:py-16">
          <h2 className="mx-auto max-w-xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Start screening in minutes.
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-textdim">
            Create an analyst account, load a demo sample, and run your first real screening —
            no setup, no card data.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to={primaryTo} className="btn-primary btn-lg">
              {primaryLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {!authenticated && (
              <Link to="/login" className="btn-secondary btn-lg">
                Sign in
              </Link>
            )}
          </div>
          <p className="mt-4 text-[13px] text-muted">Educational prototype · Demo accounts included</p>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="landing-section grid gap-10 py-14 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <VeyraWordmark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-textdim">
              AI fraud intelligence — screen transactions, explain every score, and keep an
              auditable review trail.
            </p>
          </div>
          <nav aria-label="Platform">
            <div className="label-sm mb-3">Platform</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/overview" className="text-textdim transition-colors hover:text-text">Overview</Link></li>
              <li><Link to="/screening" className="text-textdim transition-colors hover:text-text">Screening</Link></li>
              <li><Link to="/batch" className="text-textdim transition-colors hover:text-text">Bulk screening</Link></li>
              <li><Link to="/alerts" className="text-textdim transition-colors hover:text-text">Alerts</Link></li>
              <li><Link to="/explainability" className="text-textdim transition-colors hover:text-text">Explainability</Link></li>
            </ul>
          </nav>
          <nav aria-label="Workspace">
            <div className="label-sm mb-3">Workspace</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/home" className="text-textdim transition-colors hover:text-text">Home</Link></li>
              <li><Link to="/activity" className="text-textdim transition-colors hover:text-text">Activity</Link></li>
              <li><Link to="/model-performance" className="text-textdim transition-colors hover:text-text">Model performance</Link></li>
              <li><Link to="/about" className="text-textdim transition-colors hover:text-text">About</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border">
          <div className="landing-section flex flex-wrap items-center justify-between gap-2 py-5 text-[13px] text-muted">
            <span>© 2026 Veyra · Educational fraud-screening prototype — decision support, not a banking decision.</span>
            <a href="https://github.com/varshithreddyy6" target="_blank" rel="noreferrer" className="transition-colors hover:text-text">
              Built by Varshith Reddy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
