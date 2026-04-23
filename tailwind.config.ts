import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dceeff",
          200: "#b2dcff",
          300: "#72c0ff",
          400: "#2a9cff",
          500: "#007efc",
          600: "#0063d9",
          700: "#0050b0",
          800: "#064591",
          900: "#0b2a4a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
