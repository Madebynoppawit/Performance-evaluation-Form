import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kbt: {
          bg:          '#07111f',
          surface:     '#0b1728',
          card:        '#101c2f',
          'card-hover':'#15243a',
          border:      'rgba(255,255,255,0.07)',
          'border-2':  'rgba(255,255,255,0.12)',
          green:       '#0a6ed1',
          'green-dim': '#0854a0',
          'green-dark':'#292552',
          'green-glow':'rgba(10,110,209,0.18)',
          blue:        '#0a6ed1',
          'blue-dim':  '#0854a0',
          'blue-glow': 'rgba(10,110,209,0.18)',
          cyan:        '#009de0',
          navy:        '#292552',
          red:         '#ed1c24',
          text:        '#eaf2ff',
          'text-2':    '#a8b7cc',
          'text-3':    '#6b7a90',
          success:     '#81c4ff',
          'success-bg':'rgba(10,110,209,0.12)',
          warning:     '#ed1c24',
          'warning-bg':'rgba(237,28,36,0.1)',
          error:       '#ed1c24',
          'error-bg':  'rgba(237,28,36,0.12)',
          info:        '#0a6ed1',
          'info-bg':   'rgba(10,110,209,0.12)',
          sidebar:     '#0b1530',
          header:      '#071326',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'kbt-green': '0 0 20px rgba(10,110,209,0.26)',
        'kbt-blue':  '0 0 20px rgba(10,110,209,0.25)',
        'kbt-card':  '0 4px 24px rgba(0,0,0,0.4)',
        'kbt-lg':    '0 8px 40px rgba(0,0,0,0.6)',
        'kbt-inset': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'kbt-gradient': 'linear-gradient(135deg, #292552 0%, #16588e 46%, #0a6ed1 74%, #ed1c24 100%)',
        'kbt-gradient-dark': 'linear-gradient(135deg, #07111f 0%, #0b1530 58%, #292552 100%)',
        'brand-line': 'linear-gradient(90deg, #292552 0%, #0a6ed1 58%, #ed1c24 100%)',
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
