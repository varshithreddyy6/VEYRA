/**
 * Design tokens — VEYRA · AI Fraud Intelligence.
 *
 * Luxury fintech visual system: deep graphite foundation, warm-white
 * typography, one restrained indigo accent, SOLID rich surfaces (no glass),
 * minimal borders, soft grounded shadows, moderate radii.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Foundations
        bg: "#080A0F", // deep charcoal — page
        surface: "#10131A", // secondary background (sidebar, inputs, drawer)
        panel: "#171B23", // primary solid panel
        elevated: "#1D222C", // elevated panel / interactive hover
        card: "#171B23", // legacy alias → panel
        cardhover: "#222834", // legacy alias → elevated hover
        border: "#262C39", // subtle structural border

        // Typography
        text: "#F5F5F2", // warm white primary
        textdim: "#A7ACB8", // secondary
        muted: "#747B87", // tertiary / metadata

        // Accent (restrained — never a surface colour)
        accent: "#848AF2",

        // Semantic
        alert: "#F0445C", // controlled crimson
        alertalt: "#EF4444",
        safe: "#35C98B", // muted green
        medium: "#F5A524", // warm amber
      },
      borderRadius: {
        card: "14px",
        xl2: "16px",
      },
      boxShadow: {
        card: "0 14px 34px -18px rgba(0,0,0,0.6)",
        panel: "0 10px 28px -16px rgba(0,0,0,0.55)",
        soft: "0 6px 18px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(132,138,242,0.16), 0 8px 24px -14px rgba(132,138,242,0.22)",
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
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
