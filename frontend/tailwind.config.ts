import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kbt: {
          bg:          '#07090f',
          surface:     '#0d1117',
          card:        '#111827',
          'card-hover':'#161f30',
          border:      'rgba(255,255,255,0.07)',
          'border-2':  'rgba(255,255,255,0.12)',
          green:       '#00c87a',
          'green-dim': '#00a866',
          'green-dark':'#004d2e',
          'green-glow':'rgba(0,200,122,0.18)',
          blue:        '#3b82f6',
          'blue-dim':  '#1d4ed8',
          'blue-glow': 'rgba(59,130,246,0.18)',
          cyan:        '#22d3ee',
          text:        '#e2e8f0',
          'text-2':    '#94a3b8',
          'text-3':    '#4b5563',
          success:     '#22c55e',
          'success-bg':'rgba(34,197,94,0.12)',
          warning:     '#f59e0b',
          'warning-bg':'rgba(245,158,11,0.12)',
          error:       '#ef4444',
          'error-bg':  'rgba(239,68,68,0.12)',
          info:        '#3b82f6',
          'info-bg':   'rgba(59,130,246,0.12)',
          sidebar:     '#0a0d16',
          header:      '#060912',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'kbt-green': '0 0 20px rgba(0,200,122,0.3)',
        'kbt-blue':  '0 0 20px rgba(59,130,246,0.25)',
        'kbt-card':  '0 4px 24px rgba(0,0,0,0.4)',
        'kbt-lg':    '0 8px 40px rgba(0,0,0,0.6)',
        'kbt-inset': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'kbt-gradient': 'linear-gradient(135deg, #00c87a 0%, #3b82f6 100%)',
        'kbt-gradient-dark': 'linear-gradient(135deg, #004d2e 0%, #1d3a5e 100%)',
        'kbt-dot': 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      backgroundSize: {
        'kbt-dot': '28px 28px',
      },
      animation: {
        'pulse-green': 'pulseGreen 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-in': 'slideIn 0.25s ease',
      },
      keyframes: {
        pulseGreen: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
