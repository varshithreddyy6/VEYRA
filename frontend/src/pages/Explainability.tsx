import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lightbulb, ScanSearch } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingRows } from "@/components/ui/States";
import { GlobalShapBars, ShapBars } from "@/components/charts/ShapBars";
import { useGlobalExplanation } from "@/hooks/useModel";
import { formatProbability } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";

/** AI explanation workspace: global feature attribution and on-demand local
 *  explanations for any stored transaction. */
export default function Explainability() {
  usePageTitle("Explainability");
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const global = useGlobalExplanation();
  const [txId, setTxId] = useState(params.get("tx") ?? "");

  const local = useQuery({
    queryKey: ["local-explanation", txId],
    queryFn: () => apiClient.transactionExplanation(txId),
    enabled: txId.length > 0,
    retry: false,
  });

  const contributions = local.data?.contributions ?? [];
  const positive = contributions.filter((c) => c.direction === "increases_fraud_risk").slice(0, 8);
  const negative = contributions.filter((c) => c.direction === "decreases_fraud_risk").slice(0, 8);

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Interpretability"
        title="Explainability"
        description="Global feature importance (SHAP summary) plus on-demand local explanations for any stored transaction. SHAP describes the model's reasoning — it is not evidence of causality."
      />

      <div className="grid gap-14 lg:grid-cols-2">
        {/* ── Global ───────────────────────────────────────────────────── */}
        <section data-testid="global-explanation">
          <div className="section-head">
            <h2 className="section-title">Global explanation</h2>
            <span className="section-sub">1,000-row test sample</span>
          </div>
          <p className="mb-6 text-sm leading-relaxed text-textdim">
            Mean absolute SHAP values — which anonymized features move the model most, on average.
          </p>

          {global.isLoading && <LoadingRows rows={8} />}
          {global.isError && (
            <ErrorState
              message={apiErrorMessage(global.error, "Global explanation unavailable")}
              onRetry={() => void global.refetch()}
            />
          )}
          {global.data && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="chip">model {global.data.model_version}</span>
                <span className="chip">{global.data.explainer_method ?? "TreeExplainer"}</span>
              </div>
              <GlobalShapBars features={global.data.features} limit={16} />
              <p className="mt-5 text-xs leading-relaxed text-textdim">{global.data.note}</p>
            </>
          )}
        </section>

        {/* ── Local ────────────────────────────────────────────────────── */}
        <section data-testid="local-explanation">
          <div className="section-head">
            <h2 className="section-title">Local explanation</h2>
            {txId.trim() && (
              <nav aria-label="Breadcrumb" className="text-2xs text-textdim">
                <Link to="/explainability" className="transition-colors hover:text-text" onClick={() => setParams({})}>
                  Explainability
                </Link>
                <span aria-hidden="true"> / </span>
                <span className="font-mono text-text">{txId.slice(0, 8)}…</span>
              </nav>
            )}
          </div>
          <p className="mb-6 text-sm leading-relaxed text-textdim">
            Pick a screened transaction (or use the activity page) to see which features pushed its score up or down.
          </p>

          <form
            className="mb-8 flex gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (txId.trim()) {
                setParams((p) => {
                  p.set("tx", txId.trim());
                  return p;
                });
                void local.refetch();
              }
            }}
          >
            <input
              className="input h-10 flex-1 font-mono text-xs"
              placeholder="Transaction ID (e.g. paste from Activity)"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              aria-label="Transaction ID"
            />
            <button type="submit" className="btn-primary btn-sm shrink-0" disabled={!txId.trim()}>
              <ScanSearch className="h-4 w-4" aria-hidden="true" /> Explain
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm shrink-0"
              onClick={() => navigate("/activity")}
              aria-label="Pick from activity"
            >
              Browse
            </button>
          </form>

          {local.isLoading && <LoadingRows rows={6} />}
          {local.isError && (
            <p className="rounded-[10px] border border-alert/20 bg-alert/[0.06] px-4 py-3 text-sm text-alert" role="alert">
              {apiErrorMessage(local.error, "Explanation unavailable for that transaction")}
            </p>
          )}
          {local.data?.available === false && (
            <p className="blockquote-note">{local.data.note ?? "SHAP is unavailable for the active model version."}</p>
          )}
          {local.data?.available && (
            <>
              {/* Focal numbers */}
              <div className="grid gap-x-8 gap-y-6 border-y border-border py-6 sm:grid-cols-3">
                <div>
                  <div className="label-sm">Fraud probability</div>
                  <div className="mt-2 font-mono text-3xl font-semibold text-text tabular-nums">
                    {formatProbability(local.data.predicted_probability ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="label-sm">Base rate</div>
                  <div className="mt-2 font-mono text-3xl font-semibold text-text tabular-nums">
                    {formatProbability(local.data.base_value ?? 0)}
                  </div>
                </div>
                <div>
                  <div className="label-sm">Features</div>
                  <div className="mt-2 font-mono text-3xl font-semibold text-text tabular-nums">{contributions.length}</div>
                </div>
              </div>

              <p className="mb-8 mt-6 flex items-start gap-2.5 rounded-[10px] border border-accent/20 bg-accent/[0.05] px-4 py-3.5 text-sm leading-relaxed text-text">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {local.data.human_readable}
              </p>

              {positive.length > 0 && (
                <div className="mb-8">
                  <h3 className="section-title mb-4 text-alert">Pushed toward fraud</h3>
                  <ShapBars contributions={positive} limit={8} />
                </div>
              )}
              {negative.length > 0 && (
                <div>
                  <h3 className="section-title mb-4 text-safe">Pushed toward legitimate</h3>
                  <ShapBars contributions={negative} limit={8} />
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className="border-t border-border pt-6 text-sm leading-relaxed text-textdim">
        <strong className="font-semibold text-text">Reading these charts:</strong> each bar is one feature's contribution to
        the model's score for that row. Positive (red) values push the fraud probability up; negative (green) values push it
        down. The sum of all contributions plus the base value reconstructs the model's probability. Because the dataset's
        features are PCA-transformed, a feature like <code className="font-mono">V14</code> is statistically meaningful but has
        no simple real-world translation — do not over-interpret individual feature names.
      </div>
    </div>
  );
}
