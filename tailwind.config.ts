import type { Config } from "tailwindcss";

// Colours resolve from CSS variables (HSL channels) in app/globals.css.
// `<alpha-value>` keeps opacity modifiers like `bg-primary/90` working.
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        background: token("background"),
        foreground: token("foreground"),
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        // The marked-script world
        sheet: token("sheet"),
        ink: { DEFAULT: token("ink"), soft: token("ink-soft") },
        pencil: token("pencil"),
        rule: token("rule"),
        marker: { DEFAULT: token("marker"), foreground: token("marker-foreground") },
        highlight: token("highlight"),
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        hand: ["var(--font-hand)", "var(--font-geist-sans)", "cursive"],
      },
      fontSize: {
        meta: ["0.8125rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 2px)",
      },
      boxShadow: {
        xs: "none",
        sheet: "0 1px 0 hsl(var(--rule)), 0 12px 28px -18px hsl(var(--ink) / 0.18)",
        lift: "0 18px 40px -20px hsl(var(--ink) / 0.35)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "mark-draw": {
          from: { strokeDashoffset: "var(--mark-length, 400)" },
          to: { strokeDashoffset: "0" },
        },
        "ink-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pencil-scan": {
          "0%": { transform: "scaleX(0)", transformOrigin: "left" },
          "50%": { transform: "scaleX(1)", transformOrigin: "left" },
          "50.01%": { transform: "scaleX(1)", transformOrigin: "right" },
          "100%": { transform: "scaleX(0)", transformOrigin: "right" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "mark-draw": "mark-draw 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "ink-in": "ink-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "pencil-scan": "pencil-scan 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};

export default config;
