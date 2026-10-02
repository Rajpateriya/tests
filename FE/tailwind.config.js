/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep scholarly & institutional palette (Anti-AI, High-Trust)
        charcoal: {
          950: '#0B0F19',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
          500: '#64748B',
          400: '#94A3B8',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        institutional: {
          900: '#0F274A',
          800: '#153E75',
          700: '#1A56A0',
          600: '#1E64B5',
          500: '#2563EB',
          400: '#3B82F6',
          100: '#EFF6FF',
          50: '#F0F7FF',
        },
        // Functional Academic & Exam Semantic States
        exam: {
          correct: '#059669',
          'correct-light': '#ECFDF5',
          'correct-border': '#A7F3D0',
          incorrect: '#E11D48',
          'incorrect-light': '#FFF1F2',
          'incorrect-border': '#FECDD3',
          review: '#D97706',
          'review-light': '#FFFBEB',
          'review-border': '#FDE68A',
          reviewAnswered: '#7C3AED',
          'reviewAnswered-light': '#F5F3FF',
          'reviewAnswered-border': '#DDD6FE',
          unvisited: '#94A3B8',
          'unvisited-light': '#F8FAFC',
          unattempted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'question': ['1.125rem', { lineHeight: '1.6', letterSpacing: '-0.01em' }],
        'question-lg': ['1.25rem', { lineHeight: '1.65', letterSpacing: '-0.01em' }],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 6px -1px rgba(15, 23, 42, 0.04), 0 2px 4px -2px rgba(15, 23, 42, 0.03)',
        'lifted': '0 10px 15px -3px rgba(15, 23, 42, 0.05), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
        'drawer': '0 -10px 25px -5px rgba(15, 23, 42, 0.1)',
      },
      lineHeight: {
        'question': '1.6',
      },
      animation: {
        'fade-in': 'fadeIn 250ms ease-out forwards',
        'slide-up': 'slideUp 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blob': 'blob 10s infinite',
        'blob-delayed': 'blob 10s infinite 2s',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'drift-slow': 'driftSlow 14s ease-in-out infinite',
        'pulse-ring': 'pulseRing 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'radar-sweep': 'radarSweep 6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -40px) scale(1.08)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.94)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        driftSlow: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '33%': { transform: 'translate(25px, -20px) rotate(2deg)' },
          '66%': { transform: 'translate(-20px, 15px) rotate(-2deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.25)', opacity: '0.2' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },

    },
  },
  plugins: [],
}
