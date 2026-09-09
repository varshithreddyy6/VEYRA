import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatShortDateTime, formatProbability } from "@/lib/formatters";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { Transaction } from "@/types";

/** Transaction table (Overview + Activity). Comfortable rows, aligned
 *  numbers, risk immediately recognizable, quiet hover, one clear action. */
export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto pb-1">
      <table className="data-table min-w-[820px]" data-testid="transactions-table">
        <thead>
          <tr>
            <th className="pr-6">Timestamp</th>
            <th className="pr-6">Reference</th>
            <th className="pr-6 text-right">Amount</th>
            <th className="pr-6 text-right">Risk score</th>
            <th className="pr-6">Risk</th>
            <th className="pr-6">Prediction</th>
            <th className="pr-4">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const s = tx.latest_screening;
            return (
              <tr key={tx.id} data-testid="transaction-row" className="cursor-pointer" onClick={() => navigate(`/activity?tx=${tx.id}`)}>
                <td className="whitespace-nowrap pr-6 text-textdim">{formatShortDateTime(tx.occurred_at)}</td>
                <td className="max-w-[220px] truncate pr-6 font-mono text-[13px]" title={tx.external_ref}>
                  {tx.external_ref || tx.id.slice(0, 8) + "…"}
                </td>
                <td className="num pr-6 text-right text-white">{formatCurrency(tx.amount)}</td>
                <td className="num pr-6 text-right text-text">
                  {s ? formatProbability(s.fraud_probability) : <span className="text-textdim">—</span>}
                </td>
                <td className="pr-6">
                  {s ? <RiskBadge risk={s.risk_category} size="sm" /> : <span className="text-2xs text-textdim">unscored</span>}
                </td>
                <td className="pr-6">
                  {s ? (
                    <span className={`text-[13px] font-medium ${s.prediction === "fraud" ? "text-alert" : "text-safe"}`}>
                      {s.prediction === "fraud" ? "Fraud" : "Legit"}
                    </span>
                  ) : (
                    <span className="text-textdim">—</span>
                  )}
                </td>
                <td className="text-right">
                  <span
                    role="link"
                    tabIndex={0}
                    aria-label={`Open transaction ${tx.id.slice(0, 8)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/activity?tx=${tx.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        navigate(`/activity?tx=${tx.id}`);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  >
                    View
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
