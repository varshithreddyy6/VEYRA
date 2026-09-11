import { screen, within } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import HeroLanding from "@/pages/HeroLanding";
import { renderWithProviders } from "@/test/utils";
import { useAuthStore } from "@/lib/auth";

const anonymous = { user: null, status: "anonymous" as const };
const authedUser = { user: { id: "u1", email: "a@b.com", full_name: "Ana", role: "analyst" as const, is_active: true, created_at: new Date().toISOString() }, status: "authenticated" as const };

describe("HeroLanding", () => {
  beforeEach(() => useAuthStore.setState(anonymous));
  it("shows the marketing landing experience", () => {
    renderWithProviders(<HeroLanding />);
    const home = screen.getByRole("link", { name: /veyra home/i });
    expect(within(home).getByText("VEYRA")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /every fraud score, explained/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /get started/i })[0]).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /see how it works/i })).toHaveAttribute("href", "#how-it-works");
    // Marketing sections render
    expect(screen.getByRole("heading", { name: /fraud review breaks in the middle/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /one workspace for the whole review/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /from transaction to verdict/i })).toBeInTheDocument();
    expect(screen.getByText(/illustrative preview of a screening result/i)).toBeInTheDocument();
  });
  it("has no application sidebar or feature navigation", () => {
    const { container } = renderWithProviders(<HeroLanding />);
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.queryByRole("navigation", { name: /primary/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Batch analysis")).not.toBeInTheDocument();
  });
  it("shows sign in for anonymous visitors", () => {
    renderWithProviders(<HeroLanding />);
    expect(screen.getAllByRole("link", { name: /^sign in$/i })[0]).toHaveAttribute("href", "/login");
  });
  it("shows workspace entry for authenticated visitors", () => {
    useAuthStore.setState(authedUser);
    renderWithProviders(<HeroLanding />);
    expect(screen.getAllByRole("link", { name: /open workspace/i })[0]).toHaveAttribute("href", "/home");
    expect(screen.queryByRole("link", { name: /^sign in$/i })).not.toBeInTheDocument();
  });
});
