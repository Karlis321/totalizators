import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand-green":       "#166534",
        "brand-green-light": "#dcfce7",
        "brand-gold":        "#ca8a04",
        "brand-gold-light":  "#fef9c3",
        "grey-50":  "#f9fafb",
        "grey-100": "#f3f4f6",
        "grey-200": "#e5e7eb",
        "grey-300": "#d1d5db",
        "grey-400": "#9ca3af",
        "grey-500": "#6b7280",
        "grey-600": "#4b5563",
        "grey-700": "#374151",
        "grey-900": "#111827",
      },
    },
  },
  plugins: [],
};
export default config;
