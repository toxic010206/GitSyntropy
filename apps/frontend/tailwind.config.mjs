/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#ccff00",
        "primary-text": "#e5ff66",
        "accent-teal": "#00d4ff",
        "accent-green": "#39ff14",
        "accent-neon": "#ccff00",
        "accent-pink": "#ff00ff",
        "background-light": "#dcd4ec",
        "background-dark": "#0A0A0B",
        "midnight": "#0f0f0f",
        "surface-dark": "#1e1e24",
        "glass-border": "rgba(255, 255, 255, 0.2)",
        "glass-surface": "rgba(255, 255, 255, 0.03)",
        gs: {
          bg: "#0A0A0B",
          surface: "rgba(255, 255, 255, 0.03)",
          primary: "#ccff00",
          primaryText: "#e5ff66",
          neon: "#39ff14",
          info: "#00d4ff"
        }
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "body": ["Inter", "Noto Sans", "sans-serif"],
        "scribble": ["Reenie Beanie", "cursive"],
      },
      borderRadius: {
        "DEFAULT": "0px",
        "sm": "0px",
        "md": "0px",
        "lg": "0px", 
        "xl": "0px",
        "2xl": "0px",
        "3xl": "0px",
        "lgx": "0px",
        "full": "9999px"
      },
      boxShadow: {
        'neon': '4px 4px 0px rgba(204, 255, 0, 1)',
        'glow-green': '4px 4px 0px rgba(57, 255, 20, 1)',
        'glow': '4px 4px 0px rgba(204, 255, 0, 1)'
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(at 0% 0%, hsla(70,100%,50%,0.1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(80,100%,70%,0.1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(60,100%,40%,0.1) 0, transparent 50%)',
        'hero-glow': 'radial-gradient(circle at center, rgba(204, 255, 0, 0.15) 0%, rgba(0, 0, 0, 0) 70%)',
        'grid-pattern': "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    }
  },
  plugins: []
};
