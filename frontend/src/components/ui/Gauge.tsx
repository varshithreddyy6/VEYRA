import { useEffect, useState } from "react";
import type { RiskCategory } from "@/types";
import { clamp01 } from "@/lib/formatters";

const CIRCUMFERENCE = 2 * Math.PI * 84;

interface GaugeProps {
  probability: number; // 0..1
  risk: RiskCategory;
  threshold?: number;
  label?: string;
}

/** Animated semicircular risk gauge. Number drives colour; colour never alone. */
export function Gauge({ probability, risk, threshold, label = "Fraud probability" }: GaugeProps) {
  const [display, setDisplay] = useState(0);
  const p = clamp01(probability);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(p);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(p * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [p]);

  const colour = risk === "HIGH" ? "#E03E5E" : risk === "MEDIUM" ? "#D97706" : "#16A34A";
  const targetOffset = CIRCUMFERENCE * (1 - 0.5); // half arc when full
  const dashOffset = targetOffset * (1 - display);

  return (
    <div className="flex flex-col items-center" data-testid="risk-gauge">
      <svg viewBox="0 0 200 120" className="w-56 max-w-full" role="img" aria-label={`${label}: ${(probability * 100).toFixed(1)}%`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colour} stopOpacity="0.55" />
            <stop offset="100%" stopColor={colour} />
          </linearGradient>
        </defs>
        {/* track */}
        <path
          d="M 16 104 A 84 84 0 0 1 184 104"
          fill="none"
          stroke="#E7E4F2"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* value arc */}
        <path
          d="M 16 104 A 84 84 0 0 1 184 104"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className="animate-gaugeFill"
          style={
            {
              "--gauge-circumference": `${CIRCUMFERENCE}`,
              "--gauge-target": `${dashOffset}`,
            } as React.CSSProperties
          }
        />
        {typeof threshold === "number" && (
          <line
            x1={16 + 168 * threshold}
            y1={104 - 70 * threshold}
            x2={16 + 168 * threshold}
            y2={104 - 78 * threshold}
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="2 3"
            opacity="0.8"
          >
            <title>{`Decision threshold: ${threshold.toFixed(3)}`}</title>
          </line>
        )}
      </svg>
      <div className="-mt-10 text-center">
        <div className="font-display text-4xl font-bold tracking-tight text-text" aria-hidden="true">
          {(probability * 100).toFixed(1)}
          <span className="text-xl text-muted">%</span>
        </div>
        <div className="mt-1 text-xs font-medium text-muted">{label}</div>
      </div>
    </div>
  );
}
