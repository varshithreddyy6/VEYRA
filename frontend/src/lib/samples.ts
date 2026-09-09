/**
 * Demo sample inputs for the screening page ("Load sample transaction").
 *
 * These are INPUT vectors only — they are demo data for demonstrations and
 * testing, NOT real transactions. Scored against the currently active model
 * (CCDFS-XGB-20260902-165705), the live backend produced:
 *
 *   fraudLike  → 99.4% probability · HIGH · rule: amount_anomaly · SHAP V14/V17/V12
 *   cleanLow   → ~0% probability · LOW  · no rule flags
 *   highAmount → ~0% probability · MEDIUM (escalated by the rule engine only)
 *
 * Those outcomes were verified by running the real pipeline; the UI never
 * hard-codes a prediction — every screening still goes through the backend.
 */
export interface DemoTransactionSample {
  id: string;
  label: string;
  description: string;
  amount: number;
  externalRef: string;
  features: Record<string, number>;
}

const v = (values: number[]): Record<string, number> =>
  Object.fromEntries(values.map((value, i) => [`V${i + 1}`, value]));

export const DEMO_SAMPLES: DemoTransactionSample[] = [
  {
    id: "fraud-like",
    label: "Fraud-like pattern",
    description: "Unusual anonymized feature profile + high amount (demo input).",
    amount: 4200.0,
    externalRef: "DEMO-FRAUDLIKE-01",
    features: v([-3.2, 2.4, -1.8, 3.1, -2.5, 1.2, -0.8, 0.5, -1.1, 0.9, -2.2, -4.5, 1.7, -6.0, 2.2, -1.5, -4.8, 0.7, 1.3, -0.6, 0.4, -1.9, 0.3, -0.7, 0.8, -0.4, 0.2, 0.1]),
  },
  {
    id: "clean-low-risk",
    label: "Typical low-risk pattern",
    description: "Small amount, neutral feature profile (demo input).",
    amount: 62.5,
    externalRef: "DEMO-CLEAN-01",
    features: v([0.12, -0.45, 0.31, 0.05, -0.22, 0.18, -0.09, 0.27, -0.14, 0.38, -0.21, 0.16, -0.33, 0.08, 0.24, -0.19, 0.11, -0.27, 0.42, -0.15, 0.23, -0.07, 0.19, -0.31, 0.13, -0.26, 0.17, -0.04]),
  },
  {
    id: "high-amount-clean",
    label: "High amount, clean pattern",
    description: "Large amount with a neutral profile — shows rule-engine escalation (demo input).",
    amount: 2500.0,
    externalRef: "DEMO-HIGHAMT-01",
    features: v([0.12, -0.45, 0.31, 0.05, -0.22, 0.18, -0.09, 0.27, -0.14, 0.38, -0.21, 0.16, -0.33, 0.08, 0.24, -0.19, 0.11, -0.27, 0.42, -0.15, 0.23, -0.07, 0.19, -0.31, 0.13, -0.26, 0.17, -0.04]),
  },
];
