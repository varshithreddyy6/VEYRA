import { screen, within } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import HeroLanding from "@/pages/HeroLanding";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";

const anonymous = { user: null, status: "anonymous" as const };

describe("HeroLanding (initial entry experience)", () => {
  beforeEach(() => useAuthStore.setState(anonymous));

  it("shows the premium hero: brand, title, subtitle and CTA to the existing screening page", () => {
    renderWithProviders(<HeroLanding />);
    const home = screen.getByRole("link", { name: /veyra — ai fraud intelligence — home/i });
    expect(within(home).getByText("VEYRA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /veyra/i })).toBeInTheDocument();
    expect(screen.getByText("Intelligent transaction screening, explanation, and risk analysis.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /analyze a transaction/i });
    expect(cta).toHaveAttribute("href", "/screening");
    const explore = screen.getByRole("link", { name: /explore platform/i });
    expect(explore).toHaveAttribute("href", "/login");
  });

  it("has NO application sidebar on the landing page", () => {
    const { container } = renderWithProviders(<HeroLanding />);
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.queryByRole("navigation", { name: /primary/i })).not.toBeInTheDocument();
    // No dashboard nav labels either.
    expect(screen.queryByText("Batch analysis")).not.toBeInTheDocument();
    expect(screen.queryByText("Model performance")).not.toBeInTheDocument();
  });

  it("shows a Sign in action for anonymous visitors", () => {
    renderWithProviders(<HeroLanding />);
    const signIn = screen.getByRole("link", { name: /sign in/i });
    expect(signIn).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("link", { name: /open dashboard/i })).not.toBeInTheDocument();
  });

  it("shows an Open dashboard action for authenticated visitors", () => {
    useAuthStore.setState({
      user: {
        id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst",
        is_active: true, created_at: new Date().toISOString(),
      },
      status: "authenticated",
    });
    renderWithProviders(<HeroLanding />);
    const open = screen.getByRole("link", { name: /open dashboard/i });
    expect(open).toHaveAttribute("href", "/overview");
    expect(screen.queryByRole("link", { name: /sign in/i })).not.toBeInTheDocument();
  });
});
