import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D0D0D',
          light: '#2D2D2D',
          dark: '#000000',
          50: '#F5F5F5',
          100: '#E8E8E8',
        },
        accent: {
          DEFAULT: '#F5A623',
          dark: '#D4891A',
          light: '#F7BB5A',
          50: '#FEF3DC',
        },
        slate: {
          DEFAULT: '#4A4A4A',
          light: '#6B7280',
          muted: '#9CA3AF',
        },
        border: '#E0E7EF',
        'surface': '#F7F9FC',
      },
      fontFamily: {
        heading: ['var(--font-heading)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(13,13,13,0.08), 0 4px 12px rgba(13,13,13,0.04)',
        'card-hover': '0 4px 16px rgba(13,13,13,0.14), 0 8px 24px rgba(13,13,13,0.07)',
        nav: '0 1px 0 #E0E7EF',
        modal: '0 20px 60px rgba(13,13,13,0.18)',
      },
      borderRadius: {
        card: '4px',
        btn: '3px',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
        'marquee': 'marquee 20s linear infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      backgroundSize: {
        '200': '200% 100%',
      },
    },
  },
  plugins: [],
}
export default config
