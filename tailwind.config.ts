import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141A33",
        paper: "#F7F2E8",
        blue: "#1F3BE0",
        yellow: "#F9E547",
      },
      fontFamily: {
        display: ["'Archivo Black'", "'Arial Black'", "sans-serif"],
        body: ["Archivo", "'Helvetica Neue'", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
