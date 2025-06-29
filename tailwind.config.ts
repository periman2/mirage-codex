import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair-display)", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      colors: {
        // Mirage Codex Theme
        mirage: {
          // Background colors
          bg: {
            primary: "rgb(255 251 235)", // amber-50 - main background
            secondary: "rgb(255 255 255)", // white - cards and overlays
            tertiary: "rgb(254 243 199)", // amber-100 - subtle highlights
          },
          // Text colors
          text: {
            primary: "rgb(120 53 15)", // amber-900 - main headings
            secondary: "rgb(146 64 14)", // amber-800 - secondary text
            tertiary: "rgb(180 83 9)", // amber-700 - body text
            muted: "rgb(217 119 6)", // amber-600 - muted text
            light: "rgb(245 158 11)", // amber-500 - light text
          },
          // Border colors
          border: {
            primary: "rgb(254 215 170)", // amber-200 - main borders
            secondary: "rgb(253 230 138)", // amber-200/50 - subtle borders
          },
          // Accent colors (for buttons, highlights)
          accent: {
            primary: "rgb(217 119 6)", // amber-600 - main accent
            hover: "rgb(180 83 9)", // amber-700 - hover state
            light: "rgb(245 158 11)", // amber-500 - light accent
          }
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        'mirage-gradient': 'linear-gradient(to bottom right, rgb(255 251 235), rgb(255 255 255), rgb(255 251 235))',
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/line-clamp")],
} satisfies Config; 