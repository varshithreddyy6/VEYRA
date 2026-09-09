import { motion, useReducedMotion } from "framer-motion";
import { featureDisplayName, round } from "@/lib/formatters";
import type { ShapContribution } from "@/types";

/** Horizontal SHAP contribution bars — thin tracks, clear direction splits.*/
export function ShapBars({ contributions, limit = 10 }: { contributions: ShapContribution[]; limit?: number }) {
  const reduced = useReducedMotion();
  const items = [...contributions].slice(0, limit);
  const maxAbs = Math.max(...items.map((c) => Math.abs(c.shap_value)), 0.0001);

  return (
    <ul className="space-y-3" data-testid="shap-bars">
      {items.map((c) => {
        const width = (Math.abs(c.shap_value) / maxAbs) * 100;
        const positive = c.direction === "increases_fraud_risk";
        return (
          <li key={c.feature} className="grid grid-cols-[120px_1fr_72px] items-center gap-4">
            <span className="truncate font-mono text-xs text-textdim" title={c.feature}>
              {featureDisplayName(c.feature)}
            </span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.span
                className={`absolute inset-y-0 left-0 rounded-full ${positive ? "bg-alert/75" : "bg-safe/75"}`}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className={`text-right font-mono text-xs font-semibold tabular-nums ${positive ? "text-alert" : "text-safe"}`}>
              {positive ? "+" : "−"}
              {round(Math.abs(c.shap_value), 3).toFixed(3)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function GlobalShapBars({
  features,
  limit = 15,
}: {
  features: { rank: number; feature: string; mean_abs_shap: number; direction: string }[];
  limit?: number;
}) {
  const reduced = useReducedMotion();
  const items = [...features].slice(0, limit);
  const maxAbs = Math.max(...items.map((f) => f.mean_abs_shap), 0.0001);
  return (
    <ul className="space-y-3" data-testid="global-shap-bars">
      {items.map((f) => {
        const width = (f.mean_abs_shap / maxAbs) * 100;
        return (
          <li key={f.feature} className="grid grid-cols-[120px_1fr_72px] items-center gap-4">
            <span className="truncate font-mono text-xs text-textdim">{featureDisplayName(f.feature)}</span>
            <span className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-accent/70"
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="text-right font-mono text-xs tabular-nums text-text">{round(f.mean_abs_shap, 4).toFixed(4)}</span>
          </li>
        );
      })}
    </ul>
  );
}
