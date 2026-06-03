/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // ---- Color system: tokens reference CSS variables (see src/index.css) ----
      // Using <alpha-value> lets utilities like bg-gold/40 work with the variables.
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          bright: 'rgb(var(--c-gold-bright) / <alpha-value>)',
          deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
        },
        teal: 'rgb(var(--c-teal) / <alpha-value>)',
        clay: 'rgb(var(--c-clay) / <alpha-value>)',
        sand: 'rgb(var(--c-sand) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        content: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Rakkas', 'Cairo', 'serif'],
        body: ['Cairo', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgb(var(--c-gold) / 0.25), 0 18px 50px -12px rgb(var(--c-gold) / 0.35)',
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 24px 60px -24px rgb(0 0 0 / 0.7)',
        inset: '0 2px 0 0 rgb(255 255 255 / 0.05) inset',
      },
      backgroundImage: {
        'gold-sheen':
          'linear-gradient(135deg, rgb(var(--c-gold-bright)) 0%, rgb(var(--c-gold)) 45%, rgb(var(--c-gold-deep)) 100%)',
        'nile-fade':
          'radial-gradient(120% 80% at 50% -10%, rgb(var(--c-surface-2) / 0.9), transparent 60%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.94)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '70%': { transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'dice-shake': {
          '0%':   { transform: 'rotate(-10deg) scale(1.1)' },
          '25%':  { transform: 'rotate(10deg)  scale(1.15)' },
          '50%':  { transform: 'rotate(-7deg)  scale(1.08)' },
          '75%':  { transform: 'rotate(7deg)   scale(1.12)' },
          '100%': { transform: 'rotate(-10deg) scale(1.1)' },
        },
        'tile-ping': {
          '0%,100%': { boxShadow: '0 0 0 2px rgba(224,180,60,0.9)' },
          '50%':     { boxShadow: '0 0 0 3px rgba(224,180,60,1.0), 0 0 28px rgba(224,180,60,0.5)' },
        },
        'smoke-out': {
          '0%':   { opacity: '0.9', transform: 'scale(0.8) translateY(0px)' },
          '100%': { opacity: '0',   transform: 'scale(1.6) translateY(-6px)' },
        },
        'vehicle-land': {
          '0%':   { transform: 'scale(0.7) translateY(-4px)' },
          '60%':  { transform: 'scale(1.3) translateY(0px)' },
          '100%': { transform: 'scale(1)   translateY(0px)' },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.4s ease-out both',
        'rise-in':    'rise-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-in':   'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in':     'pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        shimmer:      'shimmer 2.5s linear infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'dice-shake': 'dice-shake 0.12s linear infinite',
        'tile-ping':  'tile-ping 0.9s ease-in-out infinite',
        'smoke-out':  'smoke-out 0.45s ease-out forwards',
        'vehicle-land': 'vehicle-land 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
    },
  },
  plugins: [],
};
