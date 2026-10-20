import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        surface: {
          light: '#F8F9FB',
          'light-card': '#FFFFFF',
          'light-elevated': '#F1F3F7',
          dark: '#0B0D12',
          'dark-card': '#12141C',
          'dark-elevated': '#1B1E2B',
        },
        border: {
          light: '#E2E8F0',
          dark: 'rgba(255, 255, 255, 0.08)',
          'dark-accent': 'rgba(239, 68, 68, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card-light': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'card-hover-light': '0 12px 32px -4px rgba(239, 68, 68, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'glow-primary': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        'glow-dark': '0 0 30px -5px rgba(248, 113, 113, 0.15)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(239, 68, 68, 0.7)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
