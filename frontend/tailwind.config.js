/**
 * Design tokens — VEYRA · AI Fraud Intelligence · TurboHire-inspired edition.
 *
 * Light minimal system in the TurboHire look and feel: deep-navy ink,
 * vivid purple primary, lavender washes, Archivo display + Manrope body.
 * Colour is still reserved for meaning outside the brand accent
 * (risk/semantic states only).
 *
 * Single source of truth — every component reads these tokens. No hardcoded
 * hex values in components.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Foundations — light
        bg: "#FFFFFF", // page background
        surface: "#FBFAFF", // lavender mist wash (bands, table heads, insets)
        panel: "#FFFFFF", // primary card surface
        elevated: "#FFFFFF", // raised surface (same as panel on light)
        card: "#FFFFFF", // legacy alias → panel
        cardhover: "#F1ECFF", // legacy alias → lavender wash hover
        border: "#E7E4F2", // hairline structural border, lavender-tinted

        // Typography
        text: "#01033E", // deep-navy ink
        textdim: "#475569", // secondary
        muted: "#94A3B8", // tertiary / metadata

        // Brand accent — TurboHire purple. CTAs, links, active states.
        accent: "#6438E7",
        ink: "#01033E",
        primary: "#6438E7",
        primarydeep: "#4E2CB4",
        vivid: "#6E3EFE",
        light: "#9E7EFE",
        wash: "#F1ECFF",
        mist: "#FBFAFF",

        // Semantic — reserved for meaning, never decoration
        alert: "#E03E5E",
        alertalt: "#BE123C",
        safe: "#16A34A",
        medium: "#D97706",
      },
      borderRadius: {
        card: "16px",
        xl2: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(1, 3, 62, 0.05), 0 12px 32px -20px rgba(1, 3, 62, 0.22)",
        panel: "0 1px 2px rgba(1, 3, 62, 0.04), 0 8px 24px -16px rgba(1, 3, 62, 0.16)",
        soft: "0 1px 2px rgba(1, 3, 62, 0.05)",
        glow: "0 0 0 3px rgba(100, 56, 231, 0.14)",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Archivo", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": "11px",
      },
      letterSpacing: {
        widest2: "0.24em",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        gaugeFill: {
          "0%": { "stroke-dashoffset": "var(--gauge-circumference)" },
          "100%": { "stroke-dashoffset": "var(--gauge-target)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        fadeIn: "fadeIn 0.3s ease-out both",
        gaugeFill: "gaugeFill 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
