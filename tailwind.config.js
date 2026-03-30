/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand / Medical Trust
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#3B82F6',
          600: '#2563EB',
          900: '#1E3A8A',
        },
        // Backgrounds
        background: '#F8FAFC',
        card: '#FFFFFF',
        // Status — Color Psychology
        status: {
          green: '#10B981',
          yellow: '#F59E0B',
          red: '#EF4444',
        },
        // Text
        textPrimary: '#1E3A8A',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
