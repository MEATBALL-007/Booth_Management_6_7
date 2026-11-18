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
      // ui-overhaul §2: "Radius: sm 10px · md 14px · lg 16px · xl 20px".
      // px, not rem, and that is deliberate: index.css sets html{font-size:120%},
      // so a rem radius would render 20% over the number the spec names
      // (10px -> 12px). §2 scopes the +20% base scale to ตัวหนังสือ/ปุ่ม/สเปซ/ตัวเลข
      // — type, buttons, spacing, numbers — and does not list corner radius.
      // Tailwind's 2xl/3xl/full/DEFAULT are NOT in the spec's four-step scale and
      // stay at their rem defaults; see rounded-scale.audit.test.ts for what that
      // leaves inverted.
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        'glow-o': '0 6px 20px rgba(250,70,22,0.35)',
        'glow-y': '0 0 18px rgba(255,199,44,0.35)',
      },
    },
  },
  plugins: [],
}
