import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/States";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { formatCurrency, formatDateTime, formatProbability, timeAgo } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";

/** Analyst review queue: each alert is a row where the probability is the
 *  focal number, followed by amount, reference, rules and the one action. */
export default function Alerts() {
  usePageTitle("Alerts");
  const [page, setPage] = useState(1);
  const [includeMedium, setIncludeMedium] = useState(false);

  const alerts = useQuery({
    queryKey: ["alerts", page, includeMedium],
    queryFn: () => apiClient.alerts({ page, page_size: 15, days: 7, include_medium: includeMedium }),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Review queue"
        title="Alerts"
        description="High-risk screenings from the last 7 days. Alerts are analyst review queues — the system never blocks a transaction on its own."
        actions={
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text">
            <input
              type="checkbox"
              checked={includeMedium}
              onChange={(e) => {
                setIncludeMedium(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-white/15 bg-white/[0.04] accent-[#F59E0B]"
            />
            Include flagged MEDIUM
          </label>
        }
      />

      <section data-testid="alerts-grid">
        <div className="section-head">
          <h2 className="section-title">Detection queue</h2>
          <span className="section-sub">last 7 days · {alerts.data?.total ?? "—"} alerts</span>
        </div>

        {alerts.isLoading && <LoadingRows rows={6} />}
        {alerts.isError && <ErrorState message={apiErrorMessage(alerts.error)} onRetry={() => void alerts.refetch()} />}
        {alerts.data && alerts.data.items.length === 0 && (
          <EmptyState
            title="No alerts in this window"
            hint="Nothing in the last 7 days hits the HIGH screening band (or flagged MEDIUM, if enabled)."
            action={
              <Link to="/screening" className="btn-primary btn-sm">
                Screen a transaction
              </Link>
            }
          />
        )}

        {alerts.data && alerts.data.items.length > 0 && (
          <ul className="divide-y divide-white/[0.05]">
            {alerts.data.items.map((a) => (
              <li key={a.id} className="group grid gap-x-8 gap-y-3 py-5 md:grid-cols-[110px_minmax(0,1fr)_auto] md:items-center">
                {/* Focal probability */}
                <div>
                  <div
                    className="font-mono text-[1.65rem] font-semibold leading-none tabular-nums"
                    style={{ color: a.risk_category === "HIGH" ? "#F6153C" : "#F59E0B" }}
                  >
                    {formatProbability(a.fraud_probability)}
                  </div>
                  <div className="mt-1.5 text-2xs uppercase tracking-[0.14em] text-textdim">fraud probability</div>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="text-lg font-semibold tracking-tight text-white">{formatCurrency(a.amount)}</span>
                    <RiskBadge risk={a.risk_category} size="sm" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-textdim">
                    <span className="truncate font-mono" title={a.external_ref}>{a.external_ref}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateTime(a.occurred_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{timeAgo(a.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{a.prediction === "fraud" ? "Predicted fraud" : "Predicted legit"} · thresh {a.decision_threshold.toFixed(3)}</span>
                  </div>
                  {a.rule_flags.length > 0 && (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {a.rule_flags.map((r) => (
                        <li key={r} className="chip border-medium/25 bg-medium/[0.08] text-medium">{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <Link
                  to={`/activity?tx=${a.transaction_id}`}
                  className="btn-secondary btn-sm justify-self-start md:justify-self-end"
                >
                  View transaction <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {alerts.data && alerts.data.pages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-white/[0.06] pt-5 text-sm">
          <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span className="text-2xs text-textdim">
            Page {alerts.data.page} of {alerts.data.pages}
          </span>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={page >= alerts.data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
