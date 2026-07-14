/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff0ed',
          100: '#ffe0d8',
          200: '#ffbfb0',
          300: '#ff9479',
          400: '#ff6b47',
          500: '#F54927',
          600: '#e33015',
          700: '#c93a1e',
          800: '#a12d18',
          900: '#7f2413',
        },
        // Sidebar agora é branca — token mantido para retrocompatibilidade
        sidebar: {
          DEFAULT: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
      borderRadius: {
        'xl2': '20px',
      },
      animation: {
        'fade-in':   'fadeIn 0.35s ease both',
        'slide-up':  'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
        'spin-fast': 'spin 0.7s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      boxShadow: {
        'xs':     '0 1px 2px rgba(0,0,0,0.05)',
        'sm':     '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
        'md':     '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)',
        'lg':     '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)',
        'xl':     '0 20px 25px -5px rgba(0,0,0,0.09), 0 10px 10px -5px rgba(0,0,0,0.03)',
        'orange': '0 4px 14px rgba(245,73,39,0.30)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
};
