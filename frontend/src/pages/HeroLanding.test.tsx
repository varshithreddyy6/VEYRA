import { screen, within } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import HeroLanding from "@/pages/HeroLanding";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";

const anonymous = { user: null, status: "anonymous" as const };
describe("HeroLanding", () => {
  beforeEach(() => useAuthStore.setState(anonymous));
  it("shows the minimal static landing experience", () => {
    renderWithProviders(<HeroLanding />);
    const home = screen.getByRole("link", { name: /veyra home/i });
    expect(within(home).getByText("VEYRA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /veyra/i })).toBeInTheDocument();
    expect(screen.getByText("Intelligent transaction screening, explanation, and risk analysis for safer decisions.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: /video/i })).not.toBeInTheDocument();
  });
  it("has no application sidebar or feature navigation", () => {
    const { container } = renderWithProviders(<HeroLanding />);
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.queryByRole("navigation", { name: /primary/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Batch analysis")).not.toBeInTheDocument();
  });
  it("shows sign in for anonymous visitors", () => {
    renderWithProviders(<HeroLanding />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute("href", "/login");
  });
  it("shows Home for authenticated visitors", () => {
    useAuthStore.setState({ user: { id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst", is_active: true, created_at: new Date().toISOString() }, status: "authenticated" });
    renderWithProviders(<HeroLanding />);
    expect(screen.getByRole("link", { name: /open home/i })).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});
