import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { VideoBackground } from "@/components/layout/VideoBackground";

function setMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

describe("VideoBackground", () => {
  beforeEach(() => setMatchMedia(false));

  it("configures the video exactly for the local asset: autoplay, muted, loop, playsInline, cover, non-interactive", () => {
    render(<VideoBackground />);
    const video = screen.getByTestId("video-bg-video") as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.getAttribute("playsinline")).not.toBeNull();
    expect(video.controls).toBe(false);
    expect(video.getAttribute("controls")).toBeNull();
    expect(video.tabIndex).toBe(-1);
    expect(video.getAttribute("aria-hidden")).toBe("true");
    expect(video).toHaveClass("pointer-events-none");
    expect(video).toHaveClass("object-cover");

    const source = video.querySelector("source");
    expect(source?.getAttribute("src")).toBe("/videos/credit-card-fraud-background.mp4");
    expect(source?.type).toBe("video/mp4");
  });

  it("is a fixed, non-layout-affecting layer behind the app with pointer-events disabled", () => {
    const { container } = render(<VideoBackground />);
    const layer = screen.getByTestId("video-background");
    expect(layer).toHaveClass("fixed");
    expect(layer).toHaveClass("inset-0");
    expect(layer).toHaveClass("pointer-events-none");
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    // The overlay (Layer 2) sits after the video (Layer 1) in paint order.
    const children = Array.from(container.firstElementChild?.children ?? []);
    expect(children.map((c) => c.getAttribute("data-testid"))).toEqual([
      "video-bg-fallback",
      "video-bg-video",
      "video-bg-overlay",
    ]);
  });

  it("applies the correct overlay darkness per intensity", () => {
    const { rerender } = render(<VideoBackground intensity="strong" />);
    expect(screen.getByTestId("video-bg-overlay")).toHaveStyle("background-color: rgba(0, 0, 0, 0.3)");
    rerender(<VideoBackground intensity="subdued" />);
    expect(screen.getByTestId("video-bg-overlay")).toHaveStyle("background-color: rgba(0, 0, 0, 0.4)");
    rerender(<VideoBackground intensity="subtle" />);
    expect(screen.getByTestId("video-bg-overlay")).toHaveStyle("background-color: rgba(0, 0, 0, 0.5)");
  });

  it("keeps the SAME video element across intensity changes (no re-creation on route change)", () => {
    const { rerender } = render(<VideoBackground intensity="strong" />);
    const first = screen.getByTestId("video-bg-video");
    rerender(<VideoBackground intensity="subtle" />);
    const second = screen.getByTestId("video-bg-video");
    expect(second).toBe(first);
  });

  it("falls back to the static backdrop when the video cannot load, logging the failure (dev-friendly)", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<VideoBackground />);
    const video = screen.getByTestId("video-bg-video");
    const source = video.querySelector("source");
    fireEvent.error(source as Element);
    expect(screen.queryByTestId("video-bg-video")).not.toBeInTheDocument();
    expect(screen.getByTestId("video-bg-fallback")).toBeInTheDocument();
    // The page remains fully usable: the layer still renders without crashing.
    expect(screen.getByTestId("video-bg-overlay")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
    expect(String(consoleError.mock.calls[0][0])).toMatch(/failed to load/i);
    consoleError.mockRestore();
  });

  it("respects prefers-reduced-motion by omitting the video but keeping the backdrop + overlay", () => {
    setMatchMedia(true);
    render(<VideoBackground />);
    expect(screen.queryByTestId("video-bg-video")).not.toBeInTheDocument();
    expect(screen.getByTestId("video-bg-fallback")).toBeInTheDocument();
    expect(screen.getByTestId("video-bg-overlay")).toBeInTheDocument();
  });
});
