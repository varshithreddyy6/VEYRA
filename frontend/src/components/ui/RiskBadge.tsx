import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { RiskCategory } from "@/types";

/** Colour + icon + text for risk communication (never colour alone). Compact. */
export function RiskBadge({ risk, size = "md" }: { risk: RiskCategory; size?: "sm" | "md" | "lg" }) {
  const sizeCls =
    size === "sm" ? "h-5 px-1.5 text-2xs" : size === "lg" ? "h-8 px-3 text-[13px]" : "h-6 px-2 text-2xs";
  const cls = risk === "HIGH" ? "risk-high" : risk === "MEDIUM" ? "risk-medium" : "risk-low";
  const Icon = risk === "HIGH" ? AlertTriangle : risk === "MEDIUM" ? ShieldAlert : CheckCircle2;
  return (
    <span className={`badge ${sizeCls} ${cls}`}>
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3 w-3"} aria-hidden="true" />
      <span>{risk === "HIGH" ? "HIGH RISK" : risk === "MEDIUM" ? "MEDIUM RISK" : "LOW RISK"}</span>
    </span>
  );
}

export function PredictionBadge({ prediction }: { prediction: "fraud" | "legit" }) {
  return (
    <span className={`badge ${prediction === "fraud" ? "risk-high" : "risk-low"}`}>
      {prediction === "fraud" ? "Potentially fraudulent" : "Likely legitimate"}
    </span>
  );
}
