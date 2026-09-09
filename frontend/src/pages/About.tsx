import { Github, Linkedin, Mail, Phone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { usePageTitle } from "@/lib/usePageTitle";
import { VeyraMark } from "@/components/brand/VeyraBrand";

const STACK_BACKEND = [
  "Python 3.11+ / FastAPI", "Pydantic v2", "SQLAlchemy 2 + Alembic", "PostgreSQL 16",
  "Redis 7 + Celery", "JWT (access + refresh)", "pwdlib / Argon2id", "Gunicorn",
];
const STACK_FRONTEND = [
  "React 18 + TypeScript", "Vite", "Tailwind CSS", "React Router", "TanStack Query",
  "Zustand", "React Hook Form + Zod", "Recharts",
];
const STACK_ML = [
  "Pandas / NumPy", "Scikit-learn", "XGBoost", "SHAP (TreeExplainer)", "Matplotlib",
  "Joblib artifacts", "Threshold optimization", "Class-imbalance handling",
];
const STACK_OPS = [
  "Docker + Docker Compose", "pytest (backend)", "Vitest + RTL (frontend)",
  "GitHub Actions CI", "Alembic migrations", "12-factor config via .env",
];

const METHODOLOGY = [
  {
    title: "One shared preprocessing module",
    body: "Anonymized PCA features (V1–V28) plus Hour_sin/cos and Amount_log1p — the same module for training and inference, so scoring never drifts from training.",
  },
  {
    title: "Honest splits, fixed seed",
    body: "Stratified train/validation/test splits with a fixed seed; preprocessing is fitted on training data only and never sees the test set.",
  },
  {
    title: "Baseline vs XGBoost",
    body: "A class-weighted Logistic Regression baseline compared against XGBoost (scale_pos_weight, optional randomized search on PR-AUC).",
  },
  {
    title: "Threshold tuned on validation",
    body: "F1 / min-recall / min-precision / business-cost strategies on validation data — never tuned on the test set — then reported on the untouched test split.",
  },
  {
    title: "Explainability built in",
    body: "Evaluation includes accuracy, precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix and threshold sweeps, plus SHAP global and local explanations.",
  },
];

function StackColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="section-title mb-4">{title}</h3>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i} className="chip">{i}</li>
        ))}
      </ul>
    </div>
  );
}

export default function About() {
  usePageTitle("About");
  return (
    <div className="space-y-14">
      <PageHeader
        eyebrow="About"
        title="About VEYRA"
        description="The application brand and the story behind the CREDIT CARD FRAUD DETECTION SYSTEM — purpose, methodology, architecture and responsible-use boundaries."
      />

      {/* Brand + purpose */}
      <section className="max-w-3xl">
        <div className="mb-6 flex items-center gap-4">
          <VeyraMark size={48} />
          <div className="leading-none">
            <div className="text-lg font-extrabold tracking-[0.22em] text-[#F5F5F2]">VEYRA</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">AI Fraud Intelligence</div>
          </div>
        </div>
        <p className="text-lg leading-relaxed text-text">
          <strong className="font-semibold text-white">VEYRA</strong> is the application brand for the{" "}
          <strong className="font-semibold text-white">CREDIT CARD FRAUD DETECTION SYSTEM</strong> — an end-to-end fraud
          screening prototype: an imbalanced-classification ML pipeline (XGBoost), an explainability layer (SHAP), a
          deterministic rule engine, and a full-stack analyst workspace (FastAPI + React) that screens individual
          transactions or whole CSV batches and explains <em>why</em> each score was produced.
        </p>
      </section>

      {/* Methodology */}
      <section className="max-w-3xl">
        <div className="section-head">
          <h2 className="section-title">Purpose</h2>
        </div>
        <p className="text-[15px] leading-relaxed text-text">
          VEYRA turns a single fraud-screening question — <em className="text-white">“is this transaction suspicious, and
          why?”</em> — into an analyst-facing workflow: screen one transaction or a whole CSV batch, get a probability,
          a risk band and the model's own reasoning in feature-level terms, and keep an auditable record of every
          screening. It is a prototype of a real-world pattern: models decide, analysts decide what to do about it.
        </p>
      </section>

      <section className="max-w-3xl">
        <div className="section-head">
          <h2 className="section-title">How it works</h2>
        </div>
        <ol className="space-y-3 text-[15px] leading-relaxed text-text">
          <li><strong className="font-semibold text-white">Validate.</strong> The transaction payload is checked (amount, required anonymized features, reference), and the analyst is authenticated.</li>
          <li><strong className="font-semibold text-white">Prepare features.</strong> The shared preprocessing module — the exact pipeline used at training time — transforms the row.</li>
          <li><strong className="font-semibold text-white">Run the model.</strong> The active XGBoost model (CCDFS-XGB-…) predicts a fraud probability for the transaction.</li>
          <li><strong className="font-semibold text-white">Evaluate rules.</strong> Deterministic rules (e.g. amount anomalies, empty fields, unusual velocity) run alongside the model and contribute independent signals.</li>
          <li><strong className="font-semibold text-white">Explain.</strong> A TreeExplainer produces per-feature SHAP contributions, summarized into a human-readable statement.</li>
          <li><strong className="font-semibold text-white">Persist.</strong> The screening, its verdict and its explanation are stored and appear in Activity, Alerts and the audit trail.</li>
        </ol>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Machine-learning methodology</h2>
        </div>
        <ol className="divide-y divide-white/[0.05]">
          {METHODOLOGY.map((step, i) => (
            <li key={step.title} className="grid gap-3 py-5 sm:grid-cols-[64px_minmax(0,1fr)]">
              <span className="font-mono text-sm font-semibold text-accent">0{i + 1}</span>
              <div>
                <h3 className="text-[15px] font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-textdim">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Dataset + Architecture */}
      <section className="grid gap-14 lg:grid-cols-2">
        <div>
          <div className="section-head">
            <h2 className="section-title">Dataset</h2>
          </div>
          <p className="text-sm leading-relaxed text-text">
            The public ULB/Kaggle anonymized credit card transaction dataset (<code className="font-mono">creditcard.csv</code>,
            31 columns, no cardholder details). It is <strong className="font-semibold text-white">not committed</strong> to
            the repository — instructions and download guidance live in{" "}
            <code className="font-mono">data/README.md</code>. Metrics are computed from the dataset at training time;
            nothing is hard-coded.
          </p>
        </div>
        <div>
          <div className="section-head">
            <h2 className="section-title">Architecture</h2>
          </div>
          <p className="text-sm leading-relaxed text-text">
            React (Vite/TypeScript) → FastAPI <code className="font-mono">/api/v1</code> → PostgreSQL 16 (SQLAlchemy 2 +
            Alembic) with Redis 7 + Celery for async batch scoring. ML artifacts are versioned under{" "}
            <code className="font-mono">artifacts/models/CCDFS-XGB-&lt;version&gt;/</code> and loaded once at API startup;
            retraining makes a new version active without a restart. Docker Compose runs the whole stack.
          </p>
        </div>
      </section>

      {/* Explainability */}
      <section>
        <div className="section-head">
          <h2 className="section-title">Explainability</h2>
        </div>
        <p className="max-w-3xl text-sm leading-relaxed text-text">
          SHAP <code className="font-mono">TreeExplainer</code> produces global importance (mean |SHAP| per feature) and
          per-transaction contributions with human-readable summaries. Explanations describe the model's reasoning — they
          are not causal evidence, and PCA features cannot be mapped to specific real-world behaviours.
        </p>
      </section>

      {/* Developer + responsible use */}
      <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="panel-flat p-7">
          <h2 className="section-title mb-6">Developer</h2>
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-lg font-bold text-white">
              V
            </span>
            <div>
              <div className="text-lg font-semibold text-white">VARSHITH REDDY</div>
              <div className="text-sm text-textdim">Full-stack & ML engineering portfolio</div>
            </div>
          </div>
          <ul className="space-y-3.5 text-sm">
            <li className="flex items-center gap-3 text-text">
              <Phone className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href="tel:+919393081415" className="transition-colors hover:text-white">+91 93930 81415</a>
            </li>
            <li className="flex items-center gap-3 text-text">
              <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href="mailto:varshithreddyy6@gmail.com" className="break-all transition-colors hover:text-white">varshithreddyy6@gmail.com</a>
            </li>
            <li className="flex items-center gap-3 text-text">
              <Linkedin className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href="https://linkedin.com/in/varshithreddyvangeti" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                linkedin.com/in/varshithreddyvangeti
              </a>
            </li>
            <li className="flex items-center gap-3 text-text">
              <Github className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href="https://github.com/varshithreddyy6" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
                github.com/varshithreddyy6
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="section-head">
            <h2 className="section-title flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-medium" aria-hidden="true" /> Responsible use & limitations
            </h2>
          </div>
          <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-text">
            <li>LOW / MEDIUM / HIGH are <strong className="font-semibold text-white">model screening categories</strong>, not banking decisions.</li>
            <li>Outputs are decision-support signals; human review is required for consequential actions.</li>
            <li>The system never blocks transactions and accepts no PANs, CVVs or cardholder data.</li>
            <li>The dataset is a single 2013-era snapshot — fraud patterns and models drift over time.</li>
            <li>Threshold choice trades false positives against false negatives; there is no free lunch.</li>
            <li>Production use requires privacy, security, fairness, compliance, monitoring and governance work that this prototype intentionally does not claim.</li>
          </ul>
        </div>
      </section>

      {/* Stack */}
      <section>
        <div className="section-head">
          <h2 className="section-title">Technology stack</h2>
        </div>
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2 xl:grid-cols-4">
          <StackColumn title="Backend" items={STACK_BACKEND} />
          <StackColumn title="Frontend" items={STACK_FRONTEND} />
          <StackColumn title="Machine learning" items={STACK_ML} />
          <StackColumn title="DevOps & quality" items={STACK_OPS} />
        </div>
      </section>
    </div>
  );
}
