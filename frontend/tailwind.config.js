/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#000000',
          surface: '#050607',
          elevated: '#0A0C0F',
        },
        accent: {
          cyan: '#FF8A3D',
          azure: '#C55424',
          warm: '#FFB36B',
        },
        status: {
          success: '#71E2A3',
          warning: '#F6C85F',
          error: '#FF6F7D',
        },
        text: {
          primary: '#F7FAFB',
          secondary: '#A7B1B8',
          muted: '#626D76',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 3s infinite',
      },
    },
  },
  plugins: [],
};
