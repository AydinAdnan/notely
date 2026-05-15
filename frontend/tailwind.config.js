/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neu: {
          bg: '#FFFDF5',
          'bg-warm': '#f5f0e8',
          yellow: '#FFD23F',
          pink: '#FF6B6B',
          blue: '#74B9FF',
          green: '#88D498',
          orange: '#FFA552',
          purple: '#B8A9FA',
          cyan: '#7FDBDA',
          red: '#FF4444',
          black: '#000000',
          white: '#ffffff',
        }
      },
      boxShadow: {
        'neu-sm': '3px 3px 0 0 #000',
        'neu': '5px 5px 0 0 #000',
        'neu-lg': '8px 8px 0 0 #000',
        'neu-xl': '12px 12px 0 0 #000',
      },
      borderWidth: {
        'neu-thick': '4px',
        'neu': '3px',
        'neu-thin': '2px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
