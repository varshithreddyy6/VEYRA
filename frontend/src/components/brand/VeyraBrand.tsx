/**
 * VEYRA brand: mark + wordmark — light minimal edition.
 *
 * Product identity hierarchy:
 *   VEYRA
 *   AI Fraud Intelligence
 * Sentence case, tight tracking, one accent dot. No letterspaced caps.
 */

export function VeyraMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] bg-text"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none">
        <path d="M5.5 5.5 12 19 18.5 5.5" stroke="#FFFFFF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="19" r="1.7" fill="#9E7EFE" />
      </svg>
    </span>
  );
}

export function VeyraWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <VeyraMark size={compact ? 30 : 32} />
      <span className="leading-none">
        <span className="block font-display text-[15px] font-extrabold tracking-tight text-text">VEYRA</span>
        <span className="mt-[3px] block text-[11px] font-medium text-muted">
          AI Fraud Intelligence
        </span>
      </span>
    </span>
  );
}
