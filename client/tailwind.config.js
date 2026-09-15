/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'warm-cream':    '#FFF8E7',
        'deep-brown':    '#2C1810',
        'rust-red':      '#C0392B',
        'mustard-gold':  '#D4A017',
        'sage-green':    '#7A9E7E',
        'dusty-blue':    '#5B7FA6',
        'warm-gray':     '#8B7355',
        'light-tan':     '#F5E6C8',
        'terracotta':    '#C46B47',
        'soft-black':    '#1A1208',
        'navrang-gold':  '#E8A838',
        'mauve-evening': '#9B7BA6',
        'warm-shadow':   '#3D2B1F',
        'night-indigo':  '#1C1F3A',
      },
      fontFamily: {
        pixel:   ['"Press Start 2P"', 'monospace'],
        serif:   ['"Crimson Text"', 'Georgia', 'serif'],
        script:  ['Caveat', 'cursive'],
        mono:    ['"Courier Prime"', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'fade-in':        'fadeIn 0.3s ease-out',
        'pulse-warm':     'pulseWarm 2s ease-in-out infinite',
        'stamp':          'stamp 0.3s ease-out',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to:   { transform: 'translateX(0)',    opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        pulseWarm: {
          '0%, 100%': { boxShadow: '0 0 8px #D4A017' },
          '50%':      { boxShadow: '0 0 20px #E8A838, 0 0 40px #D4A01766' },
        },
        stamp: {
          from: { transform: 'scale(1.5)', opacity: 0 },
          to:   { transform: 'scale(1)',   opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
