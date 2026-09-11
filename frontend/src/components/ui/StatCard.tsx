import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Editorial metric: label → primary number → contextual hint.
 * Sentence-case label, hairline top rule, tabular number.
 */
export function Metric({
  label,
  value,
  hint,
  dot,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  dot?: string; // hex colour accent (only when semantically meaningful)
  icon?: LucideIcon;
}) {
  return (
    <div className="relative border-t border-border pt-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted" aria-hidden="true" />}
        <div className="text-[13px] font-semibold text-textdim">{label}</div>
        {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} aria-hidden="true" />}
      </div>
      <div className="metric-value mt-2 text-[2.1rem] leading-none">{value}</div>
      {hint && <p className="mt-2 text-[13px] leading-snug text-textdim">{hint}</p>}
    </div>
  );
}

/** Legacy alias: the old StatCard is now the editorial Metric (no box). */
export function StatCard(props: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone?: "default" | "safe" | "alert" | "amber";
  hint?: string;
}) {
  const toneDot: Record<string, string | undefined> = {
    safe: "#16A34A",
    alert: "#E03E5E",
    amber: "#D97706",
  };
  return <Metric label={props.title} value={props.value} hint={props.hint} icon={props.icon} dot={toneDot[props.tone ?? "default"]} />;
}
