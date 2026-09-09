/**
 * VEYRA brand: mark + wordmark.
 *
 * Product identity hierarchy:
 *   VEYRA
 *   AI FRAUD INTELLIGENCE
 * The descriptive project title (CREDIT CARD FRAUD DETECTION SYSTEM) appears
 * where appropriate (About, auth screens, footer).
 */

export function VeyraMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[9px] border border-white/[0.09] bg-[#14181F]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width={size * 0.56} height={size * 0.56} fill="none">
        <path d="M5.5 5.5 12 19 18.5 5.5" stroke="#F5F5F2" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="19" r="1.7" fill="#848AF2" />
      </svg>
    </span>
  );
}

export function VeyraWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <VeyraMark size={compact ? 30 : 34} />
      <span className="leading-none">
        <span className="block text-[15px] font-extrabold tracking-[0.22em] text-[#F5F5F2]">VEYRA</span>
        <span className="mt-[5px] block text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">
          AI Fraud Intelligence
        </span>
      </span>
    </span>
  );
}
