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
        // ===== UI FOUNDATION =====
        // Deep charcoal base - the "track" at night
        track: {
          50: '#F0F2F5',
          100: '#E0E4EB',
          200: '#C1C9D6',
          300: '#96A3B8',
          400: '#6B7B96',
          500: '#4A5A7A',
          600: '#36435E',
          700: '#283147',
          800: '#1E2436',  // raised surfaces
          900: '#121826',  // base background
          950: '#0A0D14',
        },

        // Cold grays - structural, professional
        cold: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },

        // Sky blue - primary brand, energy, action
        sky: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',  // primary sky
          600: '#0284C7',
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },

        // Vibrant yellow/gold - achievement, warning, energy
        amber: {
          50: '#FFFEF0',
          100: '#FFFBD5',
          200: '#FFF6A3',
          300: '#FFED5A',
          400: '#FFE31A',
          500: '#FFD600',  // primary amber
          600: '#CCAB00',
          700: '#998100',
          800: '#665700',
          900: '#332B00',
        },

        // ===== FUNCTIONAL / DATA VIS COLORS =====
        // Green - success, good, completed, healthy
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',  // primary success
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        // Red - danger, injury, critical, behind
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',  // primary danger
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },

        // Blue - info, active, in-progress, neutral progress
        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',  // primary info
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#1E40AF',
        },

        // Neutral black/white for charts
        neutral: {
          0: '#FFFFFF',
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
          1000: '#000000',
        },

        // Semantic aliases for easy use
        surface: {
          DEFAULT: '#1E2436',
          raised: '#283147',
          overlay: '#121826',
        },
        border: {
          DEFAULT: '#36435E',
          subtle: '#283147',
          strong: '#4A5A7A',
        },
        text: {
          primary: '#F0F2F5',
          secondary: '#94A3B8',
          muted: '#64748B',
          inverse: '#0F172A',
        },
      },

      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Grotesk', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display-xl': ['clamp(3.5rem, 8vw, 6rem)', { lineHeight: '1.0', letterSpacing: '-0.03em', fontFeatureSettings: '"tnum" 1' }],
        'display-lg': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em', fontFeatureSettings: '"tnum" 1' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em', fontFeatureSettings: '"tnum" 1' }],
        'display-sm': ['1.25rem', { lineHeight: '1.3', fontFeatureSettings: '"tnum" 1' }],
        'heading-xl': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-md': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.5' }],
      },

      spacing: {
        'space-4xs': '0.125rem',
        'space-3xs': '0.25rem',
        'space-2xs': '0.375rem',
        'space-xs': '0.5rem',
        'space-sm': '0.75rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'space-2xl': '3rem',
        'space-3xl': '4rem',
        'space-4xl': '6rem',
      },

      borderRadius: {
        'radius-xs': '0.25rem',
        'radius-sm': '0.375rem',
        'radius-md': '0.5rem',
        'radius-lg': '0.75rem',
        'radius-xl': '1rem',
        'radius-2xl': '1.5rem',
        'radius-full': '9999px',
      },

      boxShadow: {
        'shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'shadow-inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        'shadow-glow-sm': '0 0 0 1px rgb(14 165 233 / 0.3), 0 0 8px 0 rgb(14 165 233 / 0.15)',
        'shadow-glow-md': '0 0 0 1px rgb(14 165 233 / 0.3), 0 0 16px 0 rgb(14 165 233 / 0.2)',
        'shadow-glow-lg': '0 0 0 1px rgb(14 165 233 / 0.3), 0 0 32px 0 rgb(14 165 233 / 0.25)',
        'shadow-glow-success': '0 0 0 1px rgb(34 197 94 / 0.3), 0 0 16px 0 rgb(34 197 94 / 0.2)',
        'shadow-glow-danger': '0 0 0 1px rgb(239 68 68 / 0.3), 0 0 16px 0 rgb(239 68 68 / 0.2)',
        'shadow-glow-amber': '0 0 0 1px rgb(255 214 0 / 0.3), 0 0 16px 0 rgb(255 214 0 / 0.2)',
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'scale-out': 'scaleOut 0.2s ease-in',
        'spin': 'spin 1s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'progress-fill': 'progressFill 0.8s ease-out forwards',
        'counter-up': 'counterUp 0.6s ease-out forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        scaleOut: { '0%': { opacity: '1', transform: 'scale(1)' }, '100%': { opacity: '0', transform: 'scale(0.96)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '0.5' }, '100%': { transform: 'scale(1.4)', opacity: '0' } },
        progressFill: { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } },
        counterUp: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'track-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L40 20M20 0L20 40' stroke='%230EA5E9' stroke-width='0.5' stroke-opacity='0.03'/%3E%3C/svg%3E\")",
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L20 20M20 0L20 20' stroke='%23FFFFFF' stroke-width='0.5' stroke-opacity='0.02'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}