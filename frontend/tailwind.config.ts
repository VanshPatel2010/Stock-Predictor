import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        mist: "#e4ecf7",
        tide: "#0f766e",
        coral: "#f97316",
        sky: "#38bdf8"
      },
      backgroundImage: {
        "dashboard-grid":
          "radial-gradient(circle at top, rgba(56,189,248,0.15), transparent 35%), linear-gradient(rgba(16,24,40,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,24,40,0.06) 1px, transparent 1px)"
      },
      backgroundSize: {
        "dashboard-grid": "auto, 32px 32px, 32px 32px"
      },
      boxShadow: {
        panel: "0 18px 50px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

