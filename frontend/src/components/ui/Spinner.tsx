export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-textdim" role="status">
      <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      {label && <span>{label}</span>}
      <span className="sr-only">{label ?? "Loading"}</span>
    </span>
  );
}

export function FullScreenLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="app-atmosphere flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-white/[0.09] bg-[#14181F]">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">
            <path d="M5.5 5.5 12 19 18.5 5.5" stroke="#F5F5F2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="19" r="1.7" fill="#848AF2" />
          </svg>
        </div>
        <div className="text-center">
          <div className="text-sm font-extrabold uppercase tracking-[0.24em] text-white">VEYRA</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">AI Fraud Intelligence</div>
          <div className="mt-4">
            <Spinner label={label} />
          </div>
        </div>
      </div>
    </div>
  );
}
