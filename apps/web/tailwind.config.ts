import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        mist: "var(--surface-mist)",
        sand: "var(--surface-sand)",
        ink: "var(--surface-ink)",
        border: "var(--border)",
        command: "var(--command)",
        mesh: "var(--mesh)",
        safe: "var(--safe)",
        attention: "var(--attention)",
        critical: "var(--critical)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"]
      },
      boxShadow: {
        soft: "0 18px 40px -28px rgb(var(--shadow-tint-rgb) / 0.35)",
        panel: "0 24px 70px -45px rgb(var(--shadow-tint-rgb) / 0.45)"
      }
    }
  },
  plugins: []
};

export default config;
