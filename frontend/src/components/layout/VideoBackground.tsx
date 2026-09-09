import { useEffect, useState } from "react";

/**
 * Site-wide decorative video background.
 *
 * Exactly ONE instance is mounted at the application root (above the router),
 * so the video element is created once and persists across route changes —
 * only the overlay opacity varies per page. It is purely presentational:
 * it knows nothing about auth, routing, API state, ML results or data.
 *
 * Layer stack (low → high):
 *   Layer 0  static dark backdrop (pre-load / missing-file / reduced-motion)
 *   Layer 1  background video (muted, looping, object-fit: cover)
 *   Layer 2  readable dark overlay (opacity per page intensity)
 *            → the real application UI renders above (router adds z-10)
 *
 * The whole layer is `fixed`, `pointer-events: none` and `aria-hidden`, so it
 * never affects document flow, scrolling, click targets or keyboard focus.
 *
 * Asset: /videos/credit-card-fraud-background.mp4 (served locally from
 * `frontend/public/videos/`). If the file is missing or fails to decode, the
 * component fails silently into the static backdrop — the application never
 * depends on the video.
 */
const VIDEO_SRC = "/videos/credit-card-fraud-background.mp4";

/** How strongly the video is dimmed, per the page-intensity map in the router. */
export type VideoBackgroundIntensity = "strong" | "subdued" | "subtle";

/** Overlay darkness per intensity. Lower = video more visible.
 *  Strong: landing / auth — video clearly present.
 *  Subdued / subtle: app pages — video stays visible as atmosphere while
 *  solid panels keep content readable. Values verified on live screenshots. */
const OVERLAY_ALPHA: Record<VideoBackgroundIntensity, number> = {
  strong: 0.3, // landing / login / register — video clearly present
  subdued: 0.4, // app pages — visible atmosphere
  subtle: 0.5, // dense data pages — quieter but still visible
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function VideoBackground({
  intensity = "subdued",
}: {
  intensity?: VideoBackgroundIntensity;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const handleVideoError = () => {
    // Development-friendly: surface the failure instead of swallowing it.
    console.error("[VideoBackground] background video failed to load — using the static branded fallback.");
    setVideoFailed(true);
  };
  const showVideo = !videoFailed && !reducedMotion;

  return (
    <div
      aria-hidden="true"
      data-testid="video-background"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Layer 0 — static branded backdrop (always present underneath) */}
      <div className="video-bg-fallback absolute inset-0" data-testid="video-bg-fallback" />

      {/* Layer 1 — background video (decorative: muted, looping, no controls) */}
      {showVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          onError={handleVideoError}
          data-testid="video-bg-video"
        >
          <source src={VIDEO_SRC} type="video/mp4" onError={handleVideoError} />
        </video>
      )}

      {/* Layer 2 — readability overlay (opacity per page intensity) */}
      <div
        className="pointer-events-none absolute inset-0 transition-colors duration-300"
        style={{ backgroundColor: `rgba(0, 0, 0, ${OVERLAY_ALPHA[intensity]})` }}
        data-testid="video-bg-overlay"
      />
    </div>
  );
}
