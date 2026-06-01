import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./stores/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        field: "#f7f7f4",
        line: "#e4e0d6",
        pitch: "#156f5b",
        coral: "#e85445",
        gold: "#d7a73f"
      },
      boxShadow: {
        lift: "0 10px 30px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: [forms]
};

export default config;
