import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Cpu,
  ListChecks,
  ScanSearch,
  ShieldCheck,
  Siren,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { PredictionBadge, RiskBadge } from "@/components/ui/RiskBadge";
import { ShapBars } from "@/components/charts/ShapBars";
import { Spinner } from "@/components/ui/Spinner";
import { screeningSchema, type ScreeningFormValues } from "@/lib/validators";
import { useModelInfo } from "@/hooks/useModel";
import { DEMO_SAMPLES } from "@/lib/samples";
import { useToast } from "@/lib/toast";
import { formatCurrency, formatProbability } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";
import type { ScreenResponse } from "@/types";

const FEATURE_NAMES = Array.from({ length: 28 }, (_, i) => `V${i + 1}`);

/** Real request stages — each advances only when its actual work completes. */
const STAGES = [
  { key: "features", label: "Preparing features…" },
  { key: "model", label: "Running fraud model…" },
  { key: "rules", label: "Evaluating screening rules…" },
  { key: "explain", label: "Generating explanation…" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

export default function Screening() {
  usePageTitle("Transaction Screening");
  const model = useModelInfo();
  const toast = useToast();
  const [result, setResult] = useState<ScreenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [stage, setStage] = useState<StageKey | null>(null);
  const [loadedSample, setLoadedSample] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<ScreeningFormValues>({
    resolver: zodResolver(screeningSchema),
    defaultValues: {
      amount: undefined,
      occurred_at: new Date().toISOString().slice(0, 16),
      external_ref: "",
      features: Object.fromEntries(FEATURE_NAMES.map((f) => [f, 0])) as Record<string, number>,
    },
  });

  const watchedFeatures = watch("features");

  const onSubmit = async (values: ScreeningFormValues) => {
    setError(null);
    setResult(null);
    setStage("features");
    try {
      const payload = {
        amount: values.amount,
        occurred_at: new Date(values.occurred_at).toISOString(),
        features: values.features,
        external_ref: values.external_ref || null,
        true_label: null,
      };
      setStage("model");
      const res = await apiClient.screen(payload);
      setStage("rules");
      setStage("explain");
      setResult(res);
      setStage(null);
      toast.push("Transaction screened successfully");
    } catch (err) {
      setStage(null);
      setError(apiErrorMessage(err, "Screening failed"));
    }
  };

  const loadSample = (sampleId: string) => {
    const sample = DEMO_SAMPLES.find((s) => s.id === sampleId);
    if (!sample) return;
    setValue("amount", sample.amount);
    setValue("external_ref", `${sample.externalRef}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    setValue("features", sample.features as unknown as never);
    setLoadedSample(sample.id);
    setError(null);
    setResult(null);
    toast.push(`Sample loaded — ${sample.label}. Prediction runs through the real model.`);
  };

  const filledCount = FEATURE_NAMES.filter(
    (f) => watchedFeatures?.[f] !== undefined && watchedFeatures?.[f] !== null,
  ).length;

  if (model.data && !model.data.available) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Screen transaction" title="Transaction screening" />
        <EmptyModelState message={model.data.message} />
      </div>
    );
  }

  const p = result?.fraud_probability ?? 0;
  const riskColour =
    result?.risk_category === "HIGH" ? "#E03E5E" : result?.risk_category === "MEDIUM" ? "#D97706" : "#16A34A";

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Screen transaction"
        title="Transaction screening"
        description="Score a single anonymized transaction end-to-end: rule signals, model probability, threshold verdict, risk band and a SHAP explanation of why."
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── Transaction input ─────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-9" noValidate data-testid="screening-form">
          {/* Quick / Advanced + demo samples */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div role="tablist" aria-label="Input mode" className="flex rounded-[10px] border border-border bg-surface p-1">
              <button
                type="button"
                role="tab"
                aria-selected={!advanced}
                onClick={() => setAdvanced(false)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  !advanced ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                Quick view
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={advanced}
                onClick={() => setAdvanced(true)}
                className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  advanced ? "bg-white text-text shadow-sm" : "text-muted hover:text-text"
                }`}
              >
                Advanced view
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="label-sm">Demo inputs</span>
              {DEMO_SAMPLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadSample(s.id)}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-textdim transition-colors hover:border-accent/40 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loadedSample && (
            <div className="flex items-start gap-2.5 rounded-[10px] border border-accent/20 bg-accent/[0.06] px-3.5 py-3 text-[13px] leading-relaxed text-text">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>
                <strong className="font-semibold text-text">Demo input loaded.</strong> Values are sample data for
                demonstration only — the prediction is computed by the real model through the backend.
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoadedSample(null);
                  setValue("external_ref", "");
                  toast.push("Demo input cleared");
                }}
                className="ml-auto shrink-0 rounded p-0.5 text-muted transition-colors hover:text-text"
                aria-label="Clear demo input"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Transaction details */}
          <section aria-labelledby="screening-details">
            <div className="section-head">
              <h2 id="screening-details" className="section-title">Transaction details</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="amount" className="label">Amount (USD)</label>
                <input id="amount" type="number" step="0.01" min="0" placeholder="2481.90" className="input" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="field-error" role="alert">{errors.amount.message}</p>}
              </div>
              <div>
                <label htmlFor="occurred_at" className="label">Occurred at (local time)</label>
                <input id="occurred_at" type="datetime-local" className="input" {...register("occurred_at")} />
                {errors.occurred_at && <p className="field-error" role="alert">{errors.occurred_at.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="external_ref" className="label">External reference <span className="font-normal text-muted">(optional)</span></label>
                <input id="external_ref" placeholder="e.g. merchant-reference-42 (no card numbers!)" className="input" {...register("external_ref")} />
                {errors.external_ref && <p className="field-error" role="alert">{errors.external_ref.message}</p>}
                <p className="mt-1.5 text-[13px] text-muted">Used for velocity rules. Raw card numbers are rejected by the API.</p>
              </div>
            </div>
          </section>

          {/* Anonymized features */}
          <section aria-labelledby="screening-features">
            <div className="section-head">
              <h2 id="screening-features" className="section-title">Anonymized features <span className="font-normal text-muted">V1–V28</span></h2>
              {advanced && <span className="section-sub">{filledCount}/28 filled</span>}
            </div>
            {advanced ? (
              <div className="grid max-h-80 grid-cols-2 gap-2.5 overflow-y-auto pr-2 sm:grid-cols-3 md:grid-cols-4">
                {FEATURE_NAMES.map((f) => (
                  <div key={f}>
                    <input
                      type="number"
                      step="any"
                      placeholder={f}
                      aria-label={f}
                      className="input h-10 px-2.5 py-0 font-mono text-xs"
                      {...register(`features.${f}` as never, { valueAsNumber: true })}
                    />
                    {errors.features?.[f as keyof typeof errors.features] && (
                      <p className="mt-1 text-[11px] text-alert">Required</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="blockquote-note text-[13px]">
                <span className="font-semibold text-text">Anonymized features (V1–V28)</span> are set to{" "}
                <span className="font-mono">0.0000</span> in Quick view. Switch to{" "}
                <button type="button" onClick={() => setAdvanced(true)} className="font-semibold text-accent hover:underline">
                  Advanced view
                </button>{" "}
                to set the full feature vector the model expects.
              </div>
            )}
          </section>

          {error && (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-alert/20 bg-alert/[0.08] px-3.5 py-3 text-sm text-alert" role="alert">
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
            </div>
          )}

          {isSubmitting && stage && (
            <ol className="space-y-2 rounded-[10px] border border-border bg-surface px-4 py-3.5 text-[13px]" aria-label="Analysis progress">
              {STAGES.map((s) => {
                const idx = STAGES.findIndex((x) => x.key === stage);
                const thisIdx = STAGES.findIndex((x) => x.key === s.key);
                const done = thisIdx < idx;
                const active = thisIdx === idx;
                return (
                  <li key={s.key} className={`flex items-center gap-2.5 ${done ? "text-safe" : active ? "text-text" : "text-muted/50"}`}>
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : active ? (
                      <Spinner label="" />
                    ) : (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-border" aria-hidden="true" />
                    )}
                    {s.label}
                  </li>
                );
              })}
            </ol>
          )}

          <button type="submit" className="btn-primary btn-lg w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Spinner label="Screening…" />
            ) : (
              <>
                <ScanSearch className="h-4 w-4" aria-hidden="true" /> Run screening
              </>
            )}
          </button>
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
            <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Anonymized PCA features only. This prototype never accepts — nor needs — card numbers, CVVs or merchants.
          </p>
        </form>

        {/* ── Screening result — the dominant event ─────────────────────── */}
        <div className="space-y-6">
          {!result && (
            <div className="panel-em relative flex min-h-[480px] flex-col items-center justify-center gap-4 px-8 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-muted">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-text">Awaiting a screening</h2>
                <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-textdim">
                  The verdict, risk band, triggered rules and SHAP explanation will appear here.
                </p>
              </div>
              {model.data?.version && <span className="chip">model {model.data.version}</span>}
            </div>
          )}

          {result && (
            <div className="panel-em animate-fadeUp relative overflow-hidden p-7 md:p-9" data-testid="screening-result">
              {/* Subtle risk accent rule */}
              <span
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: `linear-gradient(90deg, transparent, ${riskColour} 30%, ${riskColour} 70%, transparent)` }}
                aria-hidden="true"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                <div>
                  <div className="eyebrow">Screening result</div>
                  <div className="mt-1.5 font-mono text-xs text-muted">{result.screening_id.slice(0, 8)}…</div>
                </div>
                <div className="meta-row">
                  <span className="chip">model {result.model_version ?? "—"}</span>
                  <span className="chip">threshold {result.decision_threshold.toFixed(3)}</span>
                  <span className="chip">{result.threshold_selected_by}</span>
                </div>
              </div>

              {/* Dominant probability */}
              <div className="mt-8">
                <div className="eyebrow">Fraud probability</div>
                <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
                  <div className="metric-value text-[3.5rem] leading-none text-text">
                    {(result.fraud_probability * 100).toFixed(1)}
                    <span className="ml-1 text-[1.75rem] text-muted" aria-hidden="true">%</span>
                  </div>
                  <div className="flex flex-col gap-2 pb-1">
                    <RiskBadge risk={result.risk_category} size="lg" />
                    <PredictionBadge prediction={result.prediction} />
                  </div>
                </div>
                <p className="mt-4 text-sm text-textdim">
                  Model flagged this transaction for analyst review.
                </p>
              </div>

              {/* Probability meter with threshold marker */}
              <div className="mt-7">
                <div className="relative h-1.5 rounded-full bg-border">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, p * 100)}%`, background: riskColour, opacity: 0.85 }}
                  />
                  <div
                    className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-text"
                    style={{ left: `${Math.min(100, result.decision_threshold * 100)}%` }}
                    title={`Decision threshold: ${result.decision_threshold.toFixed(3)}`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-2xs text-muted">
                  <span>0%</span>
                  <span>threshold {result.decision_threshold.toFixed(3)}</span>
                  <span>100%</span>
                </div>
              </div>

              {result.decided_by_rule && (
                <p className="mt-6 flex items-center gap-2 rounded-[10px] border border-medium/20 bg-medium/[0.08] px-3.5 py-2.5 text-[13px] font-medium text-medium">
                  <Siren className="h-4 w-4 shrink-0" aria-hidden="true" /> Rule signal adjusted the review band
                </p>
              )}

              {/* Transaction metadata */}
              <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-border pt-6">
                <div>
                  <dt className="label-sm">Amount</dt>
                  <dd className="mt-1.5 font-mono text-[15px] font-semibold text-text tabular-nums">{formatCurrency(result.amount)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="label-sm">Reference</dt>
                  <dd className="mt-1.5 truncate font-mono text-[13px] text-text" title={result.external_ref}>{result.external_ref}</dd>
                </div>
                <div>
                  <dt className="label-sm">Screening id</dt>
                  <dd className="mt-1.5 font-mono text-[13px] text-text">{result.screening_id.slice(0, 8)}…</dd>
                </div>
              </dl>

              {/* MODEL SIGNAL vs RULE ENGINE SIGNALS */}
              <div className="mt-9 grid gap-9 border-t border-border pt-7 sm:grid-cols-2">
                <div>
                  <h3 className="section-title flex items-center gap-2 text-[15px]">
                    <Cpu className="h-4 w-4 text-accent" aria-hidden="true" /> Model signal
                  </h3>
                  <p className="mt-3 text-sm text-text">
                    Fraud probability{" "}
                    <span className="font-mono font-semibold text-text tabular-nums">{formatProbability(result.fraud_probability)}</span>
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    Prediction: <span className="text-text">{result.prediction === "fraud" ? "fraud" : "legit"}</span> · model{" "}
                    {result.model_version ?? "—"}
                  </p>
                </div>
                <div>
                  <h3 className="section-title flex items-center gap-2 text-[15px]">
                    <Beaker className="h-4 w-4 text-medium" aria-hidden="true" /> Rule-engine signals
                  </h3>
                  {result.rule_flags.length === 0 ? (
                    <p className="mt-3 text-sm text-textdim">No determinable rules triggered.</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {result.rule_flags.map((f) => (
                        <li key={f.rule}>
                          <span className="chip border-medium/25 bg-medium/[0.08] text-medium">{f.rule}</span>
                          <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.human_readable}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* WHY WAS THIS FLAGGED? */}
              <div className="mt-9 border-t border-border pt-7">
                <h3 className="section-title flex items-center gap-2 text-[15px]">
                  <CheckCircle2 className="h-4 w-4 text-safe" aria-hidden="true" /> Why was this transaction flagged?
                </h3>
                {result.explanation.available ? (
                  <>
                    <p className="mb-5 mt-3 text-sm leading-relaxed text-text">{result.explanation.human_readable}</p>
                    <h4 className="label-sm mb-3">Local SHAP explanation</h4>
                    <ShapBars contributions={result.explanation.contributions} limit={8} />
                    <Link
                      to={`/explainability?tx=${result.transaction_id}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent transition-colors hover:text-text"
                    >
                      View full explanation <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </>
                ) : (
                  <p className="blockquote-note mt-3">
                    SHAP is unavailable for this screening (the active model was trained without SHAP).
                  </p>
                )}
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                <div className="min-w-0 text-[13px] leading-relaxed text-muted">{result.disclaimer}</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => { setResult(null); setError(null); }}>
                    Screen another
                  </button>
                  <Link to={`/activity?tx=${result.transaction_id}`} className="btn-secondary btn-sm">
                    View transaction
                  </Link>
                  <Link to="/activity" className="btn-ghost btn-sm">
                    View activity
                  </Link>
                </div>
              </div>
            </div>
          )}

          {result && (
            <p className="text-[13px] leading-relaxed text-muted">
              Probability {formatProbability(result.fraud_probability)} · bands: LOW &lt; {result.risk_bands.low_cut} ≤
              MEDIUM &lt; {result.risk_bands.high_cut} ≤ HIGH · model output is a screening signal for analyst review.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyModelState({ message }: { message?: string | null }) {
  return (
    <div className="panel-em flex flex-col items-center gap-4 px-8 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-alert/25 bg-alert/[0.07] text-alert">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-text">Model not available yet</h2>
      <p className="max-w-lg text-sm leading-relaxed text-textdim">{message}</p>
      <code className="rounded-lg border border-border bg-surface px-3.5 py-2 font-mono text-xs text-text">
        cd backend && python train_model.py
      </code>
    </div>
  );
}
