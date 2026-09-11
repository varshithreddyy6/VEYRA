import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Screening from "@/pages/Screening";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";
import { apiClient } from "@/lib/api";
import { useModelInfo } from "@/hooks/useModel";
import type { ScreenResponse } from "@/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiClient: { ...actual.apiClient, screen: vi.fn() } };
});

vi.mock("@/hooks/useModel", () => ({
  useModelInfo: vi.fn(() => ({
    data: { available: true, version: "CCDFS-TEST", message: null },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

const result: ScreenResponse = {
  screening_id: "s1",
  transaction_id: "t1",
  external_ref: "ref-1",
  occurred_at: "2026-01-15T10:30:00+00:00",
  amount: 120.5,
  fraud_probability: 0.94,
  prediction: "fraud",
  risk_category: "HIGH",
  decision_threshold: 0.4273,
  threshold_selected_by: "max_f1",
  model_version: "CCDFS-TEST",
  risk_bands: { low_cut: 0.3, high_cut: 0.7 },
  decided_by_rule: false,
  rule_flags: [{ rule: "amount_anomaly", human_readable: "Amount above bound." }],
  explanation: {
    available: true,
    method: "TreeExplainer",
    model_version: "CCDFS-TEST",
    base_value: 0.02,
    predicted_probability: 0.94,
    human_readable: "V14 pushed the score up.",
    contributions: [
      { feature: "V14", value: -4.2, shap_value: 0.41, direction: "increases_fraud_risk", magnitude: 0.41 },
      { feature: "V2", value: 0.7, shap_value: -0.05, direction: "decreases_fraud_risk", magnitude: 0.05 },
    ],
    feature_columns: ["V14", "V2"],
    note: "SHAP explains the model output.",
  },
  created_at: "2026-01-15T10:30:05+00:00",
  disclaimer: "decision support only",
};

async function goAdvanced() {
  await userEvent.click(screen.getByRole("tab", { name: /advanced view/i }));
}

function fillFeatures() {
  for (const input of screen.getAllByRole("spinbutton")) {
    const label = input.getAttribute("aria-label");
    if (label && label.startsWith("V")) fireEvent.change(input, { target: { value: "0.1" } });
  }
}

describe("Screening page", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "authenticated",
      user: { id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst", is_active: true, created_at: "" },
    });
    vi.mocked(apiClient.screen).mockReset();
    vi.mocked(useModelInfo).mockReturnValue({
      data: { available: true, version: "CCDFS-TEST", message: null },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
  });

  it("renders the screening form (quick view) and the awaiting state", () => {
    renderWithProviders(<Screening />);
    expect(screen.getByTestId("screening-form")).toBeInTheDocument();
    expect(screen.getByText(/Awaiting a screening/)).toBeInTheDocument();
    // Quick view: only the amount input is a numeric field; features behind Advanced.
    expect(screen.getAllByRole("spinbutton").length).toBe(1);
    expect(screen.getByRole("tab", { name: /advanced view/i })).toBeInTheDocument();
  });

  it("exposes the full V1–V28 feature set in Advanced view", async () => {
    renderWithProviders(<Screening />);
    await goAdvanced();
    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThanOrEqual(29); // amount + 28 features
  });

  it("blocks submission when required fields are missing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Screening />);
    await user.click(screen.getByRole("button", { name: /Run screening/i }));
    expect(await screen.findByText(/Amount is required/)).toBeInTheDocument();
    expect(apiClient.screen).not.toHaveBeenCalled();
  });

  it("loads a demo sample (labeled as demo input) without hard-coding a prediction", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Screening />);
    await user.click(screen.getByRole("button", { name: /fraud-like pattern/i }));
    expect(screen.getByText(/Demo input loaded/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toHaveValue(4200);
    // Unique per load so repeated demo screenings never collide with the
    // per-user external_ref uniqueness constraint.
    const ref = (screen.getByLabelText(/External reference/i) as HTMLInputElement).value;
    expect(ref).toMatch(/^DEMO-FRAUDLIKE-01-/);
    // The submission still goes through the real API.
    vi.mocked(apiClient.screen).mockResolvedValue(result);
    await user.click(screen.getByRole("button", { name: /Run screening/i }));
    expect(await screen.findByTestId("screening-result")).toBeInTheDocument();
    expect(apiClient.screen).toHaveBeenCalledTimes(1);
  });

  it("renders the verdict, risk, model + rule signals and SHAP after a screening", async () => {
    vi.mocked(apiClient.screen).mockResolvedValue(result);
    const user = userEvent.setup();
    renderWithProviders(<Screening />);

    await user.type(screen.getByLabelText(/Amount/i), "120.5");
    await goAdvanced();
    fillFeatures();
    await user.click(screen.getByRole("button", { name: /Run screening/i }));

    expect(await screen.findByTestId("screening-result")).toBeInTheDocument();
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
    expect(screen.getByText("Potentially fraudulent")).toBeInTheDocument();
    expect(screen.getByText("94.0")).toBeInTheDocument();
    // MODEL vs RULE signals separated.
    expect(screen.getByText("Model signal")).toBeInTheDocument();
    expect(screen.getByText("Rule-engine signals")).toBeInTheDocument();
    expect(screen.getByText("amount_anomaly")).toBeInTheDocument();
    // Prominent why-flagged section with real SHAP.
    expect(screen.getByText(/Why was this transaction flagged/)).toBeInTheDocument();
    expect(screen.getByText(/V14 pushed the score up/)).toBeInTheDocument();
    expect(screen.getByTestId("shap-bars")).toBeInTheDocument();
    // Next actions.
    expect(screen.getByRole("link", { name: /view transaction/i })).toHaveAttribute("href", "/activity?tx=t1");
    expect(apiClient.screen).toHaveBeenCalledTimes(1);
  });

  it("shows an error state when the API rejects", async () => {
    vi.mocked(apiClient.screen).mockRejectedValue({
      isAxiosError: true,
      response: { status: 422, data: { detail: "Feature V3 must be finite" } },
    });
    const user = userEvent.setup();
    renderWithProviders(<Screening />);
    await user.type(screen.getByLabelText(/Amount/i), "50");
    await goAdvanced();
    fillFeatures();
    await user.click(screen.getByRole("button", { name: /Run screening/i }));
    expect(await screen.findByText(/Feature V3 must be finite/)).toBeInTheDocument();
  });

  it("reports an honest unavailable state when no model is trained", () => {
    vi.mocked(useModelInfo).mockReturnValue({
      data: { available: false, version: null, message: "No trained model available. Run train_model.py" },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as never);
    renderWithProviders(<Screening />);
    expect(screen.getByText("Model not available yet")).toBeInTheDocument();
  });
});
