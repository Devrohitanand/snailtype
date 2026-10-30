import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#050405",
        panel: "#090709",
        surface: "#141315",
        surfaceLow: "#1d1b1d",
        surfaceHigh: "#2b292c",
        surfaceHighest: "#363436",
        outlineVar: "#574146",
        outlineText: "#a58a90",
        hairline: "#30212A",
        burgundy: "#46182E",
        burgundySoft: "#6d384f",
        primaryText: "#F0EAED",
        secondaryText: "#94858D",
        pendingText: "#5C4E56",
        accent: "#FF6B9F",
        accentSoft: "#ffb1c6",
        error: "#E05263",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        base: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
      spacing: {
        gutter: "1.5rem",
        gutterMobile: "1rem",
        margin: "3rem",
        marginMobile: "1.25rem",
        spaceXs: "0.25rem",
        spaceSm: "0.5rem",
        spaceMd: "1rem",
        spaceLg: "1.5rem",
        spaceXl: "2.5rem",
      },
      fontFamily: {
        sans: [
          "Google Sans",
          "Product Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      fontSize: {
        bodyTyping: ["28px", { lineHeight: "46px", letterSpacing: "0.01em" }],
        bodyTypingMobile: ["20px", { lineHeight: "34px", letterSpacing: "0.01em" }],
        "label-code-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.04em" }],
        "label-code-md": ["13px", { lineHeight: "18px", letterSpacing: "0.02em" }],
        "label-code-lg": ["20px", { lineHeight: "24px", letterSpacing: "-0.02em" }],
        "headline-xl": ["56px", { lineHeight: "64px", letterSpacing: "-0.03em" }],
        "headline-md": ["22px", { lineHeight: "30px" }],
      },
    },
  },
  plugins: [],
};

export default config;
