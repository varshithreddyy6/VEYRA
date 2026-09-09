import { Gauge as GaugeIcon, HelpCircle, TimerReset } from "lucide-react";
import { apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingMetric, LoadingRows } from "@/components/ui/States";
import { Metric } from "@/components/ui/StatCard";
import { useModelMetrics } from "@/hooks/useModel";
import { formatProbability } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";

/** ML governance workspace: model summary → key metrics → operating point →
 *  confusion matrix → threshold trade-offs → evaluation metadata. */
export default function ModelPerformance() {
  usePageTitle("Model Performance");
  const metrics = useModelMetrics();
  const m = metrics.data?.metrics;
  const cm = m?.confusion_matrix;

  const operatingPoints = m
    ? [
        { label: "Threshold (active)", value: m.threshold?.toFixed(4) ?? "—" },
        { label: "Recall at threshold", value: formatProbability(m.recall ?? null) },
        { label: "Precision at threshold", value: formatProbability(m.precision ?? null) },
        { label: "F1 at threshold", value: formatProbability(m.f1 ?? null) },
      ]
    : [];

  const curveBars = m
    ? [
        { label: "ROC-AUC", value: m.roc_auc ?? 0, hint: "ranking quality", colour: "#35C98B" },
        { label: "PR-AUC", value: m.pr_auc ?? 0, hint: "rare-event benchmark", colour: "#F0445C" },
        { label: "Accuracy", value: m.accuracy ?? 0, hint: "context only", colour: "#747B87" },
      ]
    : [];

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Model governance"
        title="Model performance"
        description="Evaluation metrics computed on the held-out test split during training. Threshold-sensitive numbers are reported at the active operating point selected on validation data."
      />

      {metrics.isLoading && (
        <>
          <LoadingMetric n={5} />
          <LoadingRows rows={6} />
        </>
      )}
      {metrics.isError && <ErrorState message={apiErrorMessage(metrics.error)} onRetry={() => void metrics.refetch()} />}

      {metrics.data && !metrics.data.available && (
        <div className="panel-em flex flex-col items-center gap-4 px-8 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-textdim">
            <GaugeIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold text-white">No metrics available</h2>
          <p className="max-w-lg text-sm leading-relaxed text-textdim">{metrics.data.message ?? "No trained model exists yet."}</p>
          <code className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 font-mono text-xs text-text">
            cd backend && python train_model.py
          </code>
        </div>
      )}

      {metrics.data?.available && m && (
        <>
          {/* Model summary — one quiet meta line */}
          <section className="flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-white/[0.06] py-4">
            <div>
              <div className="label-sm">Model version</div>
              <div className="mt-1 font-mono text-[13px] text-white">{metrics.data.model_version}</div>
            </div>
            <div>
              <div className="label-sm">Dataset</div>
              <div className="mt-1 font-mono text-[13px] text-white">{metrics.data.dataset ?? "—"}</div>
            </div>
            <div>
              <div className="label-sm">Threshold selected by</div>
              <div className="mt-1 font-mono text-[13px] text-white">{metrics.data.threshold?.selected_by ?? "max_f1"}</div>
            </div>
            <div>
              <div className="label-sm">Test split</div>
              <div className="mt-1 font-mono text-[13px] text-white">
                {m.legit_count?.toLocaleString() ?? "—"} legit · {m.fraud_count?.toLocaleString() ?? "—"} fraud
              </div>
            </div>
          </section>

          {/* Key metrics — editorial, plain language inline */}
          <section aria-label="Key metrics">
            <div className="section-head">
              <h2 className="section-title">Key metrics</h2>
            </div>
            <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label="Precision" value={formatProbability(m.precision)} hint="of the flagged transactions, how many were actually fraud." />
              <Metric label="Recall" value={formatProbability(m.recall)} dot="#F59E0B" hint="of the real fraud, how much the model caught." />
              <Metric label="F1 score" value={formatProbability(m.f1)} dot="#22C55E" hint="one score balancing precision and recall." />
              <Metric label="PR-AUC" value={formatProbability(m.pr_auc)} dot="#22C55E" hint="the right benchmark for 0.2% fraud rates." />
              <Metric label="ROC-AUC" value={formatProbability(m.roc_auc)} hint="how well scores separate fraud from legit." />
            </div>
          </section>

          <section className="grid gap-12 lg:grid-cols-2">
            {/* Operating point */}
            <div>
              <div className="section-head">
                <h2 className="section-title">Operating point</h2>
              </div>
              <dl className="divide-y divide-white/[0.05]">
                {operatingPoints.map((c) => (
                  <div key={c.label} className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="text-sm text-textdim">{c.label}</dt>
                    <dd className="font-mono text-[15px] font-semibold text-white tabular-nums">{c.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-textdim">
                Threshold selected by {metrics.data.threshold?.selected_by ?? "max_f1"} on the validation split. The test
                set is reported here untouched.
              </p>
            </div>

            {/* Confusion matrix */}
            {cm && (
              <div>
                <div className="section-head">
                  <h2 className="section-title">Confusion matrix <span className="normal-case tracking-normal text-textdim">· test set</span></h2>
                </div>
                <div className="grid grid-cols-[auto_auto_auto] gap-2">
                  <span />
                  <span className="pb-1 text-center text-2xs uppercase tracking-[0.14em] text-textdim">Predicted fraud</span>
                  <span className="pb-1 text-center text-2xs uppercase tracking-[0.14em] text-textdim">Predicted legit</span>
                  <span className="label-sm self-center pr-4">Actual fraud</span>
                  <div className="rounded-[10px] border border-alert/20 bg-alert/[0.06] px-5 py-4 text-center">
                    <div className="font-mono text-2xl font-semibold text-safe tabular-nums">{cm.true_positive.toLocaleString()}</div>
                    <div className="mt-1 text-2xs text-textdim">TP · fraud caught</div>
                  </div>
                  <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-center">
                    <div className="font-mono text-2xl font-semibold text-alert tabular-nums">{cm.false_negative.toLocaleString()}</div>
                    <div className="mt-1 text-2xs text-textdim">FN · fraud missed <span className="text-alert">(expensive)</span></div>
                  </div>
                  <span className="label-sm self-center pr-4">Actual legit</span>
                  <div className="rounded-[10px] border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-center">
                    <div className="font-mono text-2xl font-semibold text-medium tabular-nums">{cm.false_positive.toLocaleString()}</div>
                    <div className="mt-1 text-2xs text-textdim">FP · legit flagged for review</div>
                  </div>
                  <div className="rounded-[10px] border border-safe/20 bg-safe/[0.05] px-5 py-4 text-center">
                    <div className="font-mono text-2xl font-semibold text-white tabular-nums">{cm.true_negative.toLocaleString()}</div>
                    <div className="mt-1 text-2xs text-textdim">TN · legit correctly passed</div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Threshold trade-offs */}
          <section>
            <div className="section-head">
              <h2 className="section-title">Threshold trade-offs</h2>
              <span className="section-sub">reported at training time · full sweeps in results/figures/</span>
            </div>
            <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
              {curveBars.map((c) => (
                <div key={c.label} className="border-t border-white/[0.07] pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium text-text">{c.label}</span>
                    <span className="text-2xs text-textdim">{c.hint}</span>
                  </div>
                  <div className="mt-2 font-mono text-3xl font-semibold tabular-nums" style={{ color: c.colour }}>
                    {c.value.toFixed(4)}
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.value * 100)}%`, background: c.colour, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-textdim">
              The threshold picks one point on each curve: lower thresholds catch more fraud (recall) at the cost of more
              false positives to review. The relationship is fixed per model version.
            </p>
          </section>

          <section className="grid gap-12 lg:grid-cols-2">
            {/* Evaluation metadata */}
            <div>
              <div className="section-head">
                <h2 className="section-title flex items-center gap-2">
                  <TimerReset className="h-3.5 w-3.5 text-accent" aria-hidden="true" /> Evaluation metadata
                </h2>
              </div>
              <dl className="divide-y divide-white/[0.05]">
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-sm text-textdim">Model version</dt>
                  <dd className="font-mono text-[13px] text-white">{metrics.data.model_version}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-sm text-textdim">Dataset</dt>
                  <dd className="font-mono text-[13px] text-white">{metrics.data.dataset ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-sm text-textdim">Fraud count (test)</dt>
                  <dd className="font-mono text-[13px] text-white">{m.fraud_count?.toLocaleString() ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-6 py-3">
                  <dt className="text-sm text-textdim">Legit count (test)</dt>
                  <dd className="font-mono text-[13px] text-white">{m.legit_count?.toLocaleString() ?? "—"}</dd>
                </div>
              </dl>
            </div>

            {/* Responsible use */}
            <div>
              <div className="section-head">
                <h2 className="section-title flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-medium" aria-hidden="true" /> Responsible use
                </h2>
              </div>
              <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-text">
                <li>These metrics describe the trained model <em>on this dataset</em> — not live production traffic.</li>
                <li>Accuracy is misleading for 0.2% fraud rates; PR-AUC and recall are the meaningful numbers.</li>
                <li>Threshold selection trades false positives (review burden) against false negatives (missed fraud).</li>
                <li>LOW/MEDIUM/HIGH are screening categories for analyst review, never automated blocks.</li>
                <li>Fraud patterns drift; a model trained on 2013-era data needs re-evaluation before any use.</li>
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
