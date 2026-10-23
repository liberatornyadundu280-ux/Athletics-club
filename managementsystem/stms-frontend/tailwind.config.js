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
        // ===== BRAND SURFACES =====
        // One continuous ramp from the track at night up to a raised card.
        ink: '#07080B',
        coal: '#0B0D12',
        asphalt: '#0E1116',
        panel: '#11161D',
        raise: '#161C25',
        lane: '#232C38',
        line: '#232C38',
        chalk: '#EDF1F5',
        mist: '#98A2B3',
        fog: '#6B7889',

        // ===== THE ACCENT =====
        // Volt is spent on exactly three things: the primary action, "today",
        // and "done". Nothing decorative.
        volt: '#D8FF3E',
        'volt-deep': '#B4DC1F',
        'volt-soft': 'rgba(216, 255, 62, 0.12)',

        // ===== STRUCTURAL RAMP =====
        track: {
          50: '#F3F5F8',
          100: '#E3E7EE',
          200: '#C6CDD8',
          300: '#9AA5B5',
          400: '#6E7B8F',
          500: '#4D596B',
          600: '#2F3947',
          700: '#222A35',
          800: '#181F27',
          900: '#0E1218',
          950: '#07080B',
        },

        // Neutral structural greys
        cold: {
          50: '#F7F9FB',
          100: '#E9EDF1',
          200: '#D2D9E1',
          300: '#AEB8C4',
          400: '#8894A4',
          500: '#67717F',
          600: '#4C5663',
          700: '#333C48',
          800: '#1C232C',
          900: '#12171E',
          950: '#080B10',
        },

        // `sky` is retained as the accent alias so existing screens pick up the
        // brand without a class-by-class rewrite. It is progressively replaced
        // by `volt` and removed once the module sweep lands.
        sky: {
          50: '#F7FFE0',
          100: '#ECFFBF',
          200: '#E2FF9C',
          300: '#EAFF8F',
          400: '#D8FF3E',
          500: '#C4F02A',
          600: '#A8CC12',
          700: '#7F9C0D',
          800: '#5A7009',
          900: '#3B4A06',
          950: '#232D03',
        },

        // Caution / attention. Never decorative.
        amber: {
          50: '#FFF9EA',
          100: '#FFF0CC',
          200: '#FFE29B',
          300: '#FFD166',
          400: '#FFC24D',
          500: '#FFB020',
          600: '#D98F0F',
          700: '#A96D08',
          800: '#7A4E06',
          900: '#4A2F04',
        },

        // ===== SEMANTIC / DATA VIZ =====
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },

        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },

        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#1E40AF',
        },

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

        // Semantic aliases
        surface: {
          DEFAULT: '#161C25',
          raised: '#1C232C',
          overlay: '#0E1218',
        },
        border: {
          DEFAULT: '#232C38',
          subtle: '#1C232C',
          strong: '#38465A',
        },
        text: {
          primary: '#EDF1F5',
          secondary: '#98A2B3',
          muted: '#6B7889',
          inverse: '#07080B',
        },
      },

      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Anton', 'Arial Black', 'sans-serif'],
      },

      fontSize: {
        'display-xl': ['clamp(3.5rem, 8vw, 6rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2.5rem, 5vw, 4rem)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.5rem)', { lineHeight: '1.05', letterSpacing: '-0.01em' }],
        'display-sm': ['1.5rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'heading-xl': ['1.875rem', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.5rem', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-md': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.75rem', { lineHeight: '1.4' }],
        'micro': ['0.6875rem', { lineHeight: '1.3' }],
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
        'lane': '16rem',
        'lane-sm': '14rem',
        'lane-wide': '18rem',
      },

      borderRadius: {
        'radius-xs': '0.25rem',
        'radius-sm': '0.375rem',
        'radius-md': '0.5rem',
        'radius-lg': '0.75rem',
        'radius-xl': '1rem',
        'radius-2xl': '1.25rem',
        'radius-full': '9999px',
      },
      borderWidth: {
        '0': '0',
        '1': '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
        '8': '8px',
      },

      boxShadow: {
        'shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.4)',
        'shadow-sm': '0 2px 4px rgba(0, 0, 0, 0.35)',
        'shadow-md': '0 8px 20px -8px rgba(0, 0, 0, 0.55)',
        'shadow-lg': '0 18px 40px -18px rgba(0, 0, 0, 0.65)',
        'shadow-xl': '0 28px 60px -24px rgba(0, 0, 0, 0.7)',
        'shadow-2xl': '0 40px 90px -40px rgba(0, 0, 0, 0.8)',
        'shadow-inner': 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
        'shadow-glow-sm': '0 0 0 1px rgba(216, 255, 62, 0.28)',
        'shadow-glow-md': '0 0 0 1px rgba(216, 255, 62, 0.32), 0 8px 30px -12px rgba(216, 255, 62, 0.22)',
        'shadow-glow-lg': '0 0 0 1px rgba(216, 255, 62, 0.35), 0 18px 50px -18px rgba(216, 255, 62, 0.28)',
        'shadow-glow-success': '0 0 0 1px rgba(34, 197, 94, 0.3), 0 8px 30px -12px rgba(34, 197, 94, 0.2)',
        'shadow-glow-danger': '0 0 0 1px rgba(239, 68, 68, 0.3), 0 8px 30px -12px rgba(239, 68, 68, 0.2)',
        'shadow-glow-amber': '0 0 0 1px rgba(255, 176, 32, 0.3), 0 8px 30px -12px rgba(255, 176, 32, 0.2)',
      },

      animation: {
        'fade-in': 'fadeIn 0.18s ease-out',
        'fade-out': 'fadeOut 0.18s ease-in',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-down': 'slideDown 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slideInRight 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-left': 'slideInLeft 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scaleIn 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-out': 'scaleOut 0.15s ease-in',
        'spin': 'spin 1s linear infinite',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'pulse-ring': 'pulseRing 1.6s ease-out infinite',
        'progress-fill': 'progressFill 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'counter-up': 'counterUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeOut: { '0%': { opacity: '1' }, '100%': { opacity: '0' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        slideInLeft: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.97)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        scaleOut: { '0%': { opacity: '1', transform: 'scale(1)' }, '100%': { opacity: '0', transform: 'scale(0.97)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.62' } },
        pulseRing: { '0%': { transform: 'scale(1)', opacity: '0.5' }, '100%': { transform: 'scale(1.5)', opacity: '0' } },
        progressFill: { '0%': { width: '0%' }, '100%': { width: 'var(--progress-width)' } },
        counterUp: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20L20 20M20 0L20 20' stroke='%23FFFFFF' stroke-width='0.5' stroke-opacity='0.02'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
