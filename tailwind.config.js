/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a0a16',      // Deep space black
          card: '#131326',      // Glass/card background
          border: '#2a2b4a',    // Border glow color
          accent: '#6366f1',    // Neon Indigo
          accentHolo: '#8b5cf6',// Holo Purple
          success: '#10b981',   // Emerald Green
          warning: '#f59e0b',   // Amber Warning
          danger: '#ef4444',    // Bright Red
          info: '#3b82f6'       // Scanner/Check-out blue
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
