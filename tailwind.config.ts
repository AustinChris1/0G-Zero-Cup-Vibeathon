import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0b0c0e",
          soft: "#121417",
          raised: "#181b1f",
          line: "#23272d",
        },
        paper: {
          DEFAULT: "#f4f0e6",
          dim: "#e7e1d2",
          edge: "#d8d1bd",
        },
        acid: {
          DEFAULT: "#ceff1a",
          deep: "#a8d600",
        },
        seal: {
          DEFAULT: "#ff4326",
          deep: "#d62f17",
        },
        chalk: "#f4f0e6",
        muted: "#8b9097",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.05em",
      },
      boxShadow: {
        hard: "6px 6px 0 0 #0b0c0e",
        "hard-acid": "6px 6px 0 0 #ceff1a",
        "hard-paper": "5px 5px 0 0 #0b0c0e",
        glow: "0 0 0 1px rgba(206,255,26,0.4), 0 0 40px -8px rgba(206,255,26,0.5)",
      },
      backgroundImage: {
        "grid-ink":
          "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(200%)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "stamp-in": {
          "0%": { transform: "scale(2.4) rotate(-18deg)", opacity: "0" },
          "60%": { transform: "scale(0.92) rotate(-12deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(-12deg)", opacity: "1" },
        },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        "marquee-slow": "marquee 70s linear infinite",
        scan: "scan 6s linear infinite",
        blink: "blink 1.1s step-end infinite",
        "stamp-in": "stamp-in 0.45s cubic-bezier(0.2,0.9,0.3,1.4) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
