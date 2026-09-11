import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowRight, ArrowUpRight, CreditCard, Percent, ScanSearch, Siren } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Metric } from "@/components/ui/StatCard";
import { ErrorState, LoadingBlock, LoadingMetric, LoadingRows } from "@/components/ui/States";
import type { RiskCategory } from "@/types";
import { TransactionsTable } from "@/components/tables/TransactionsTable";
import { SystemStatus } from "@/components/ui/SystemStatus";
import { useModelInfo } from "@/hooks/useModel";
import { formatProbability } from "@/lib/formatters";
import { usePageTitle } from "@/lib/usePageTitle";

const RISK_COLOURS: Record<RiskCategory, string> = { LOW: "#16A34A", MEDIUM: "#D97706", HIGH: "#E03E5E" };
const TOOLTIP_STYLE = {
  background: "#FFFFFF",
  border: "1px solid #E7E4F2",
  borderRadius: 10,
  color: "#475569",
  fontSize: 12,
  boxShadow: "0 12px 30px -16px rgba(1,3,62,0.25)",
};
const AXIS_TICK = { fill: "#94A3B8", fontSize: 11 };

export default function Overview() {
  usePageTitle("Overview");
  const summary = useQuery({ queryKey: ["tx-summary"], queryFn: () => apiClient.transactionsSummary() });
  const transactions = useQuery({
    queryKey: ["tx-list-overview"],
    queryFn: () => apiClient.transactions({ page: 1, page_size: 10, sort: "occurred_at", order: "desc" }),
  });
  const alerts = useQuery({
    queryKey: ["alerts-overview"],
    queryFn: () => apiClient.alerts({ page: 1, page_size: 5, days: 7 }),
  });
  const model = useModelInfo();
  const health = useQuery({
    queryKey: ["system-health"],
    queryFn: () => apiClient.health(),
    refetchInterval: 60_000,
    retry: false,
  });

  const chartData = summary.data?.trend ?? [];
  const riskData = summary.data
    ? Object.entries(summary.data.risk_distribution).map(([name, value]) => ({
        name: name as RiskCategory,
        value,
      }))
    : [];

  const kpis = summary.data;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Overview"
        title="Overview"
        description="Fraud monitoring across your screening workspace. Every score is a model screening output for analyst review — not an automated banking decision."
      />

      {/* Quick action — primary workflow, elegant */}
      <section className="flex flex-wrap items-center justify-between gap-x-10 gap-y-4 border-y border-border py-6">
        <div>
          <div className="eyebrow">Quick action</div>
          <p className="mt-2 text-[15px] text-text">Need the verdict, risk band and explanation for one transaction?</p>
        </div>
        <Link to="/screening" className="btn-primary">
          <ScanSearch className="h-4 w-4" aria-hidden="true" /> Screen a transaction
        </Link>
      </section>

      {/* System status — real values from /health */}
      {health.isSuccess && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="label-sm">System status</span>
          <SystemStatus health={health.data} />
        </div>
      )}

      {/* Model unavailable strip */}
      {model.data && !model.data.available && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-alert/20 bg-alert/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-alert" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-text">No trained model yet</div>
              <div className="text-[13px] text-textdim">{model.data.message}</div>
            </div>
          </div>
          <Link to="/model-performance" className="btn-secondary btn-sm">See model status</Link>
        </div>
      )}

      {/* Key metrics — editorial strip */}
      <section aria-label="Key metrics">
        {summary.isLoading && <LoadingMetric n={4} />}
        {summary.isError && (
          <ErrorState message={apiErrorMessage(summary.error)} onRetry={() => void summary.refetch()} />
        )}
        {kpis && (
          <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Total transactions"
              value={kpis.total_transactions}
              icon={CreditCard}
              hint={kpis ? `${kpis.assessed_transactions} assessed` : undefined}
            />
            <Metric
              label="Fraud cases"
              value={kpis.fraud_count}
              icon={AlertTriangle}
              dot="#E03E5E"
              hint="latest screening per transaction"
            />
            <Metric
              label="Detection rate"
              value={kpis ? formatProbability(kpis.detection_rate) : "—"}
              icon={Percent}
              dot="#D97706"
              hint="share screened as fraud (unlabeled data)"
            />
            <Metric
              label="Open alerts"
              value={alerts.data?.total ?? "—"}
              icon={Siren}
              dot={alerts.data && alerts.data.total > 0 ? "#E03E5E" : "#16A34A"}
              hint="HIGH risk, last 7 days"
            />
          </div>
        )}
      </section>

      {/* Fraud activity + risk distribution */}
      <section className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <div className="section-head">
            <h2 className="section-title">Fraud activity</h2>
            <span className="section-sub">{summary.data?.window_label ?? "screening activity"}</span>
          </div>
          {summary.isLoading && <LoadingBlock h="h-60" />}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ left: -14, right: 4, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fraudGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E03E5E" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#E03E5E" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="allGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6438E7" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#6438E7" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(1,3,62,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#01033E", fontWeight: 600 }} />
                <Area type="monotone" dataKey="screenings" name="Screenings" stroke="#6438E7" strokeWidth={1.75} fill="url(#allGrad)" />
                <Area type="monotone" dataKey="fraud" name="Fraud" stroke="#E03E5E" strokeWidth={1.75} fill="url(#fraudGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-[14px] border border-dashed border-border text-sm text-textdim">
              No screening activity in the last 7 days yet.
            </div>
          )}
          <div className="mt-2.5 flex items-center gap-6 text-[13px] text-muted">
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" /> Screenings</span>
            <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-alert" aria-hidden="true" /> Fraud</span>
          </div>
        </div>

        <div>
          <div className="section-head">
            <h2 className="section-title">Risk distribution</h2>
          </div>
          {summary.isLoading && <LoadingBlock h="h-60" />}
          {riskData.some((d) => d.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                    {riskData.map((d) => (
                      <Cell key={d.name} fill={RISK_COLOURS[d.name] ?? "#6438E7"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-4 space-y-2.5">
                {(Object.keys(RISK_COLOURS) as Array<keyof typeof RISK_COLOURS>).map((k) => (
                  <li key={k} className="flex items-center justify-between border-b border-border pb-2.5 text-sm">
                    <span className="flex items-center gap-2.5 text-textdim">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_COLOURS[k] }} />
                      {k} risk
                    </span>
                    <span className="font-mono tabular-nums text-text">{summary.data?.risk_distribution[k] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex h-60 items-center justify-center rounded-[14px] border border-dashed border-border text-sm text-textdim">
              No screenings yet.
            </div>
          )}
        </div>
      </section>

      {/* Recent high-risk activity */}
      <section>
        <div className="section-head">
          <h2 className="section-title">Recent high-risk activity</h2>
          <Link to="/alerts" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition-colors hover:text-text">
            View all alerts <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {alerts.isLoading && <LoadingRows rows={3} />}
        {alerts.isError && <ErrorState message={apiErrorMessage(alerts.error)} onRetry={() => void alerts.refetch()} />}
        {alerts.data && alerts.data.items.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-border px-6 py-10 text-center text-sm text-textdim">
            No HIGH-risk alerts in the last 7 days.
          </div>
        )}
        {alerts.data && alerts.data.items.length > 0 && (
          <ul className="divide-y divide-border">
            {alerts.data.items.map((a) => (
              <li key={a.id} className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-muted">{a.external_ref}</div>
                  <div className="mt-0.5 text-sm text-text">
                    <span className="font-mono font-semibold tabular-nums" style={{ color: RISK_COLOURS[a.risk_category] }}>
                      {formatProbability(a.fraud_probability)}
                    </span>{" "}
                    fraud probability · {a.rule_flags.length} rule flag(s)
                  </div>
                </div>
                <Link
                  to={`/activity?tx=${a.transaction_id}`}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition-colors hover:text-text"
                >
                  Review <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent transactions */}
      <section>
        <div className="section-head">
          <h2 className="section-title">Recent transactions</h2>
          <Link to="/activity" className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition-colors hover:text-text">
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {transactions.isLoading && <LoadingRows rows={6} />}
        {transactions.isError && (
          <ErrorState message={apiErrorMessage(transactions.error)} onRetry={() => void transactions.refetch()} />
        )}
        {transactions.data && transactions.data.items.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-border px-6 py-10 text-center text-sm text-textdim">
            Nothing here yet — head to{" "}
            <Link to="/screening" className="font-semibold text-accent hover:underline">Screening</Link> to score your first transaction.
          </div>
        )}
        {transactions.data && transactions.data.items.length > 0 && (
          <TransactionsTable transactions={transactions.data.items} />
        )}
      </section>
    </div>
  );
}
