/** API contract types — mirror the backend Pydantic schemas exactly. */

export type Role = "analyst" | "admin";
export type RiskCategory = "LOW" | "MEDIUM" | "HIGH";
export type Prediction = "fraud" | "legit";
export type BatchStatus = "queued" | "processing" | "done" | "failed";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

export interface RegisterInput {
  email: string;
  full_name: string;
  password: string;
  role?: "analyst";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ShapContribution {
  feature: string;
  value: number;
  shap_value: number;
  direction: "increases_fraud_risk" | "decreases_fraud_risk";
  magnitude: number;
}

export interface Explanation {
  available: boolean;
  method?: string | null;
  model_version?: string | null;
  base_value?: number | null;
  predicted_probability?: number | null;
  human_readable?: string | null;
  contributions: ShapContribution[];
  feature_columns: string[];
  note: string;
}

export interface RuleFlag {
  rule: string;
  human_readable: string;
}

export interface ScreenInput {
  amount: number;
  occurred_at: string;
  features: Record<string, number>;
  external_ref?: string | null;
  true_label?: number | null;
}

export interface ScreenResponse {
  screening_id: string;
  transaction_id: string;
  external_ref: string;
  occurred_at: string;
  amount: number;
  fraud_probability: number;
  prediction: Prediction;
  risk_category: RiskCategory;
  decision_threshold: number;
  threshold_selected_by: string;
  model_version: string | null;
  risk_bands: { low_cut: number; high_cut: number };
  decided_by_rule: boolean;
  rule_flags: RuleFlag[];
  explanation: Explanation;
  created_at: string;
  disclaimer: string;
}

export interface ScreeningSummary {
  id: string;
  fraud_probability: number;
  prediction: Prediction;
  risk_category: RiskCategory;
  decision_threshold: number;
  model_version: string | null;
  rule_flags: string[];
  decided_by_rule: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  external_ref: string;
  amount: number;
  occurred_at: string;
  true_label: number | null;
  created_at: string;
  features: Record<string, number>;
  latest_screening?: ScreeningSummary | null;
}

export interface TransactionDetail extends Transaction {
  screenings: ScreeningSummary[];
}

export interface TransactionsSummary {
  total_transactions: number;
  assessed_transactions: number;
  fraud_count: number;
  legit_count: number;
  detection_rate: number;
  detection_rate_note: string;
  risk_distribution: Record<RiskCategory, number>;
  trend: { day: string; screenings: number; fraud: number }[];
  window_label: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface BatchJob {
  id: string;
  filename: string;
  status: BatchStatus;
  total_rows: number;
  processed_rows: number;
  flagged_rows: number;
  error: string | null;
  result_path: string | null;
  preview: Record<string, unknown>[] | null;
  created_at: string;
  finished_at: string | null;
}

export interface BatchCreateResponse {
  job: BatchJob;
  ok: boolean;
  message: string;
}

export interface ThresholdInfo {
  value: number;
  selected_by: string;
  alternatives: Record<string, number>;
}

export interface ModelInfo {
  available: boolean;
  version: string | null;
  model_type: string | null;
  metadata: Record<string, unknown>;
  threshold: ThresholdInfo | null;
  risk: { low_cut?: number; high_cut?: number };
  metrics: Record<string, unknown> | null;
  explainability: boolean;
  message?: string | null;
  disclaimer: string;
}

export interface MetricsInfo {
  available: boolean;
  model_version: string | null;
  message?: string | null;
  metrics: {
    threshold?: number;
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    roc_auc?: number;
    pr_auc?: number;
    fraud_count?: number;
    legit_count?: number;
    confusion_matrix?: {
      true_negative: number;
      false_positive: number;
      false_negative: number;
      true_positive: number;
    };
  } | null;
  baseline: Record<string, number> | null;
  threshold: { value?: number; selected_by?: string } | null;
  dataset: string | null;
  metric_note: string;
}

export interface GlobalShapFeature {
  rank: number;
  feature: string;
  mean_abs_shap: number;
  mean_shap: number;
  direction: "positive" | "negative";
}

export interface GlobalExplanation {
  available: boolean;
  model_version: string;
  explainer_method?: string;
  features: GlobalShapFeature[];
  summary_plot?: string | null;
  note: string;
}

export interface Alert {
  id: string;
  transaction_id: string;
  external_ref: string;
  amount: number;
  occurred_at: string;
  fraud_probability: number;
  prediction: Prediction;
  risk_category: RiskCategory;
  rule_flags: string[];
  decided_by_rule: boolean;
  model_version: string | null;
  decision_threshold: number;
  created_at: string;
}

export interface AlertsResponse extends Paginated<Alert> {
  window_days: number;
  note: string;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
  time: string;
  database: { status: string; error?: string };
  redis_backend: string;
  model: { available: boolean; version: string | null };
  environment: string;
}

export interface ApiErrorBody {
  detail?: string | { msg?: string }[];
}
