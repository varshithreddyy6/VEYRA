import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";

/** Quiet, useful states — hierarchy via typography, not heavy chrome. */

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-dashed border-border bg-surface px-6 py-12 text-left">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-white text-muted">
        <Inbox className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-[15px] font-semibold text-text">{title}</h3>
        {hint && <p className="mt-1 max-w-md text-sm leading-relaxed text-textdim">{hint}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[14px] border border-alert/20 bg-alert/[0.04] px-6 py-10" role="alert">
      <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-alert/25 bg-alert/10 text-alert">
        <AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-[15px] font-semibold text-text">Something went wrong</h3>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-textdim">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-1">
          Try again
        </button>
      )}
    </div>
  );
}

/** Skeleton row list — used by tables and list sections. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-14 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Skeleton block for charts / panels. */
export function LoadingBlock({ h = "h-52" }: { h?: string }) {
  return (
    <div className={`skeleton w-full ${h}`} role="status" aria-label="Loading">
      <span className="sr-only">Loading…</span>
    </div>
  );
}

/** Editorial metric skeletons (label line + value line). */
export function LoadingMetric({ n = 4 }: { n?: number }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading metrics">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-9 w-32" />
          <div className="skeleton h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

export function CtaLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:underline"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
