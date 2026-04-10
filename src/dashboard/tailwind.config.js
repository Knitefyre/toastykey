/** @type {import('tailwindcss').Config} */
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  content: [
    join(__dirname, "./index.html"),
    join(__dirname, "./src/**/*.{js,ts,jsx,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        bg: {
          base:    '#09090B',
          surface: 'rgba(255,255,255,0.03)',
          elevated:'rgba(255,255,255,0.05)',
          hover:   'rgba(255,255,255,0.04)',
          input:   'rgba(255,255,255,0.06)',
        },
        // Text hierarchy
        text: {
          primary:   'rgba(255,255,255,0.92)',
          secondary: 'rgba(255,255,255,0.50)',
          muted:     'rgba(255,255,255,0.30)',
          disabled:  'rgba(255,255,255,0.18)',
        },
        // Border
        border: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong:  'rgba(255,255,255,0.12)',
        },
        // Semantic accents
        accent: {
          green:  '#34D399',
          amber:  '#FBBF24',
          red:    '#F87171',
          blue:   '#60A5FA',
          purple: '#A78BFA',
          teal:   '#2DD4BF',
          indigo: '#818CF8',
        },
        // Keep legacy aliases for old code compatibility
        success: '#34D399',
        warning: '#FBBF24',
        error:   '#F87171',
        info:    '#60A5FA',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        // Keep legacy alias
        code:  ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        'label': ['11px', { lineHeight: '1.4', letterSpacing: '0.06em' }],
        'body':  ['13px', { lineHeight: '1.6', letterSpacing: '0' }],
        'sub':   ['15px', { lineHeight: '1.5', letterSpacing: '-0.01em' }],
        'title': ['20px', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'page':  ['28px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        // Tailwind defaults kept for compatibility
        'xs':   ['0.75rem', { lineHeight: '1rem' }],
        'sm':   ['0.8125rem', { lineHeight: '1.4' }],
        'base': ['0.875rem', { lineHeight: '1.6' }],
        'lg':   ['1rem', { lineHeight: '1.5' }],
        'xl':   ['1.125rem', { lineHeight: '1.4' }],
        '2xl':  ['1.5rem', { lineHeight: '1.3' }],
        '3xl':  ['1.75rem', { lineHeight: '1.2' }],
        '4xl':  ['2.25rem', { lineHeight: '1.1' }],
      },
      borderRadius: {
        'sm':  '6px',
        'md':  '10px',
        'lg':  '14px',
        'xl':  '16px',
        '2xl': '20px',
        'full': '9999px',
      },
      backdropBlur: {
        xs:  '4px',
        sm:  '8px',
        md:  '12px',
        lg:  '20px',
        xl:  '40px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%':   { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer:       'shimmer 2s linear infinite',
        'fade-in':     'fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in':    'slideInRight 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        pulse:         'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        ping:          'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        spin:          'spin 1s linear infinite',
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(52, 211, 153, 0.15)',
        'glow-amber': '0 0 20px rgba(251, 191, 36, 0.15)',
        'glow-red':   '0 0 20px rgba(248, 113, 113, 0.15)',
        'glass':      '0 1px 0 rgba(255,255,255,0.06) inset',
      },
    },
  },
  plugins: [],
}
