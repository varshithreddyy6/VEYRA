import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { apiClient, apiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingRows } from "@/components/ui/States";
import { TransactionsTable } from "@/components/tables/TransactionsTable";
import { ShapBars } from "@/components/charts/ShapBars";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { Spinner } from "@/components/ui/Spinner";
import { formatCurrency, formatDateTime, formatProbability } from "@/lib/formatters";
import type { Paginated, RiskCategory, Transaction } from "@/types";
import { usePageTitle } from "@/lib/usePageTitle";

export default function Activity() {
  usePageTitle("Activity");
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [risk, setRisk] = useState<RiskCategory | "">("");
  const [prediction, setPrediction] = useState<"" | "fraud" | "legit">("");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("occurred_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("tx"));

  useEffect(() => {
    const tx = params.get("tx");
    if (tx) setSelectedId(tx);
  }, [params]);

  // Keyboard accessibility: Escape closes the detail drawer.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setParams((p) => {
          p.delete("tx");
          return p;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, setParams]);

  const txQuery = useQuery({
    queryKey: ["transactions", page, risk, prediction, q, dateFrom, dateTo, sort, order],
    queryFn: () =>
      apiClient.transactions({
        page,
        page_size: 12,
        risk: risk || undefined,
        prediction: prediction || undefined,
        q: q || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort,
        order,
      }),
    placeholderData: (prev) => prev,
  });

  const detailQuery = useQuery({
    queryKey: ["transaction", selectedId],
    queryFn: () => apiClient.transaction(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const explanationQuery = useQuery({
    queryKey: ["transaction-explanation", selectedId],
    queryFn: () => apiClient.transactionExplanation(selectedId as string),
    enabled: Boolean(selectedId),
    retry: false,
  });

  const data: Paginated<Transaction> | undefined = txQuery.data;
  const filtersActive = Boolean(q || risk || prediction || dateFrom || dateTo);

  const clearFilters = () => {
    setQ("");
    setRisk("");
    setPrediction("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Review"
        title="Activity"
        description="Every screened transaction with its verdict, risk band and rule flags. Filters apply to the latest screening of each transaction."
      />

      {/* Filter bar — quiet hairline workspace row */}
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-6">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textdim" aria-hidden="true" />
          <input
            className="input h-10 pl-10"
            placeholder="Transaction ID or external reference…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search transactions"
          />
        </div>
        <input
          type="date"
          className="input h-10 w-auto"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          aria-label="From date"
        />
        <input
          type="date"
          className="input h-10 w-auto"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          aria-label="To date"
        />
        <select
          className="input h-10 w-auto"
          value={risk}
          onChange={(e) => {
            setRisk(e.target.value as RiskCategory | "");
            setPage(1);
          }}
          aria-label="Filter by risk"
        >
          <option value="">All risk levels</option>
          <option value="LOW">LOW risk</option>
          <option value="MEDIUM">MEDIUM risk</option>
          <option value="HIGH">HIGH risk</option>
        </select>
        <select
          className="input h-10 w-auto"
          value={prediction}
          onChange={(e) => {
            setPrediction(e.target.value as "" | "fraud" | "legit");
            setPage(1);
          }}
          aria-label="Filter by prediction"
        >
          <option value="">All predictions</option>
          <option value="fraud">Predicted fraud</option>
          <option value="legit">Predicted legit</option>
        </select>
        <select
          className="input h-10 w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort by"
        >
          <option value="occurred_at">Occurred at</option>
          <option value="amount">Amount</option>
          <option value="created_at">Screened at</option>
        </select>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => setOrder((o) => (o === "desc" ? "asc" : "desc"))}
          aria-label="Toggle sort direction"
        >
          {order === "desc" ? "Desc" : "Asc"}
        </button>
        {filtersActive && (
          <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
            <X className="h-4 w-4" aria-hidden="true" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div>
        {txQuery.isLoading && <LoadingRows rows={6} />}
        {txQuery.isError && <ErrorState message={apiErrorMessage(txQuery.error)} onRetry={() => void txQuery.refetch()} />}
        {data && data.items.length === 0 && (
          <EmptyState
            title={filtersActive ? "No transactions match the current filters" : "No transactions yet"}
            hint={
              filtersActive
                ? "Try adjusting or clearing the filters above."
                : "Screen a transaction and it will appear here with its verdict, risk band and explanation."
            }
            action={
              filtersActive ? (
                <button type="button" className="btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/screening" className="btn-primary btn-sm">
                  Screen a transaction
                </Link>
              )
            }
          />
        )}
        {data && data.items.length > 0 && <TransactionsTable transactions={data.items} />}

        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
            <button type="button" className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span className="text-2xs text-textdim">
              Page {data.page} of {data.pages} · {data.total} transactions
            </span>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={page >= data.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Transaction detail">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            aria-label="Close detail"
            onClick={() => {
              setSelectedId(null);
              setParams((p) => {
                p.delete("tx");
                return p;
              });
            }}
          />
          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-8 shadow-2xl animate-fadeUp"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="min-w-0">
                <nav aria-label="Breadcrumb" className="text-2xs text-textdim">
                  <Link
                    to="/activity"
                    className="transition-colors hover:text-text"
                    onClick={() =>
                      setParams((p) => {
                        p.delete("tx");
                        return p;
                      })
                    }
                  >
                    Activity
                  </Link>
                  <span aria-hidden="true"> / </span>
                  <span className="font-mono text-text">{selectedId.slice(0, 8)}…</span>
                </nav>
                <h2 className="mt-1.5 truncate text-lg font-semibold text-text">
                  {detailQuery.data ? detailQuery.data.external_ref : "Transaction detail"}
                </h2>
              </div>
              <button
                type="button"
                className="btn-ghost px-2.5"
                onClick={() => {
                  setSelectedId(null);
                  setParams((p) => {
                    p.delete("tx");
                    return p;
                  });
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailQuery.isLoading && <Spinner label="Loading transaction…" />}
            {detailQuery.isError && <ErrorState message={apiErrorMessage(detailQuery.error)} />}

            {detailQuery.data && (
              <>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
                  <div className="border-t border-border pt-3">
                    <dt className="label-sm">Reference</dt>
                    <dd className="mt-1.5 break-all font-mono text-[13px] text-text">{detailQuery.data.external_ref}</dd>
                  </div>
                  <div className="border-t border-border pt-3">
                    <dt className="label-sm">Amount</dt>
                    <dd className="mt-1.5 font-mono tabular-nums text-text">{formatCurrency(detailQuery.data.amount)}</dd>
                  </div>
                  <div className="border-t border-border pt-3">
                    <dt className="label-sm">Occurred</dt>
                    <dd className="mt-1.5 text-[13px] text-text">{formatDateTime(detailQuery.data.occurred_at)}</dd>
                  </div>
                  <div className="border-t border-border pt-3">
                    <dt className="label-sm">True label</dt>
                    <dd className="mt-1.5 text-[13px] text-text">
                      {detailQuery.data.true_label === null ? "Unknown" : detailQuery.data.true_label === 1 ? "Fraud" : "Legit"}
                    </dd>
                  </div>
                </dl>

                <h3 className="section-title mt-9">Latest screening</h3>
                {detailQuery.data.screenings.length === 0 && (
                  <p className="blockquote-note mt-3">No screenings for this transaction.</p>
                )}
                <div className="mt-4 space-y-3">
                  {detailQuery.data.screenings.slice(0, 3).map((s) => (
                    <div key={s.id} className="rounded-[10px] border border-border bg-surface p-4">
                      <div className="flex items-center justify-between">
                        <RiskBadge risk={s.risk_category} size="sm" />
                        <span className="font-mono text-[13px] tabular-nums text-text">{formatProbability(s.fraud_probability)}</span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1 text-xs text-textdim">
                        <span>Model: {s.model_version ?? "—"}</span>
                        <span>Threshold: {s.decision_threshold.toFixed(3)}</span>
                        <span>{formatDateTime(s.created_at)}</span>
                      </div>
                      {s.rule_flags.length > 0 && (
                        <ul className="mt-2.5 flex flex-wrap gap-1.5">
                          {s.rule_flags.map((r) => (
                            <li key={r} className="chip border-medium/25 bg-medium/[0.08] text-medium">{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <h3 className="section-title mt-9">Local SHAP explanation</h3>
                <div className="mt-3">
                  {explanationQuery.isLoading && <Spinner label="Computing SHAP…" />}
                  {explanationQuery.isError && (
                    <p className="blockquote-note">SHAP explanation unavailable for this transaction.</p>
                  )}
                  {explanationQuery.data?.available && (
                    <>
                      <p className="mb-4 text-sm leading-relaxed text-text">{explanationQuery.data.human_readable}</p>
                      <ShapBars contributions={explanationQuery.data.contributions} limit={10} />
                    </>
                  )}
                </div>
                <p className="mt-5 text-xs leading-relaxed text-textdim">
                  SHAP values explain the model output for this row; they are not evidence of fraud or of causation.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
