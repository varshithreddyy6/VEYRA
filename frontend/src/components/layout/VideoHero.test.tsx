import { screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { VideoHero } from "@/components/layout/VideoHero";
import { renderWithProviders } from "@/test/utils";

describe("VideoHero", () => {
  beforeEach(() => {
    window.matchMedia = (window.matchMedia ??
      ((query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList)) as typeof window.matchMedia;
  });

  it("renders the title, subtitle and CTA in the correct visual order", () => {
    renderWithProviders(<VideoHero />);
    const heading = screen.getByRole("heading", {
      level: 1,
      name: /veyra/i,
    });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Intelligent transaction screening, explanation, and risk analysis.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /analyze a transaction/i });
    expect(cta).toHaveAttribute("href", "/screening");
    // The title must be the first heading in the viewport region (visual focal point).
    const headings = screen.getAllByRole("heading");
    expect(headings[0]).toBe(heading);
  });

  it("does not render its own video element — the site-wide VideoBackground owns it", () => {
    const { container } = renderWithProviders(<VideoHero />);
    expect(container.querySelector("video")).toBeNull();
    // It only adds a subtle readability dim above the global background.
    expect(container.querySelector("section")?.className).toContain("bg-black/10");
  });

  it("keeps content and CTA fully available (content never depends on video)", () => {
    renderWithProviders(<VideoHero />);
    expect(screen.getByRole("link", { name: /analyze a transaction/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
