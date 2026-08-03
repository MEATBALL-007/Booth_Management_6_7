/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'phantom-orange': '#FA4616',
        'phantom-yellow': '#FFC72C',
        'phantom-bg': '#0a0a0c',
        'phantom-surface': '#151517',
        'phantom-surface2': '#1c1c20',
        'phantom-line': 'rgba(255,255,255,0.09)',
        'phantom-text': '#f4f4f6',
        'phantom-muted': '#9a9aa2',
        'phantom-success': '#3ad35a',
        'phantom-danger': '#ff5a4d',
      },
      fontFamily: {
        kanit: ['Kanit', 'sans-serif'],
        sarabun: ['Sarabun', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-o': '0 6px 20px rgba(250,70,22,0.35)',
        'glow-y': '0 0 18px rgba(255,199,44,0.35)',
      },
    },
  },
  plugins: [],
}
