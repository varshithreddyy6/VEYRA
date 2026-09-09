import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PredictionBadge, RiskBadge } from "@/components/ui/RiskBadge";

describe("RiskBadge", () => {
  it("renders HIGH risk with colour, icon and text", () => {
    const { container } = render(<RiskBadge risk="HIGH" />);
    expect(screen.getByText("HIGH RISK")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.firstChild).toHaveClass("risk-high");
  });

  it("renders MEDIUM and LOW variants", () => {
    const { rerender } = render(<RiskBadge risk="MEDIUM" />);
    expect(screen.getByText("MEDIUM RISK")).toBeInTheDocument();
    rerender(<RiskBadge risk="LOW" />);
    expect(screen.getByText("LOW RISK")).toBeInTheDocument();
  });
});

describe("PredictionBadge", () => {
  it("distinguishes fraud from legit", () => {
    render(<PredictionBadge prediction="fraud" />);
    expect(screen.getByText("Potentially fraudulent")).toBeInTheDocument();
  });
});
