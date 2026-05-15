/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan:   '#06b6d4',
          blue:   '#3b82f6',
          green:  '#10b981',
          yellow: '#f59e0b',
          red:    '#ef4444',
          purple: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in':   'fadeIn .3s ease',
        'slide-up':  'slideUp .35s ease',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 },                     to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
