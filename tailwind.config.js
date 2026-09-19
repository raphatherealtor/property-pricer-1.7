/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        background: { DEFAULT: 'var(--background)' },
        foreground: { DEFAULT: 'var(--foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        border: { DEFAULT: 'var(--border)' },
        input: { DEFAULT: 'var(--input)' },
        ring: { DEFAULT: 'var(--ring)' },
        // Domain tokens
        'pp-blue': { DEFAULT: 'var(--blue)', soft: 'var(--blue-soft)' },
        'pp-amber': { DEFAULT: 'var(--amber)', soft: 'var(--amber-soft)' },
        'pp-red': { DEFAULT: 'var(--red)', soft: 'var(--red-soft)' },
        'pp-teal': { DEFAULT: 'var(--teal)', soft: 'var(--teal-soft)' },
        'pp-gray': { DEFAULT: 'var(--gray)', soft: 'var(--gray-soft)' },
        paper: { DEFAULT: 'var(--paper)' },
        panel: { DEFAULT: 'var(--panel)' },
        ink: { DEFAULT: 'var(--ink)', '2': 'var(--ink-2)' },
        line: { DEFAULT: 'var(--line)', '2': 'var(--line-2)' },
        dark: { DEFAULT: 'var(--dark)', panel: 'var(--dark-panel)', line: 'var(--dark-line)', ink: 'var(--dark-ink)', muted: 'var(--dark-muted)' },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        sm: '6px',
        xs: '4px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};