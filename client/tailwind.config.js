/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: '#18100a',   // main page background
          surface: '#251710',   // card / panel background
          raised:  '#301e12',   // subtle lifted surfaces
          border:  '#4a2e1a',   // borders and dividers
        },
        espresso: {
          50:  '#fdf6f0',
          100: '#fae8d4',
          200: '#f3c89a',
          300: '#e8a060',
          400: '#d4722a',
          500: '#b85c1a',
          600: '#924612',
          700: '#6b320d',
          800: '#4a2108',
          900: '#2c1105',
        },
        cream: {
          50:  '#fffdf9',
          100: '#fdf5e8',
          200: '#f8e8cc',
          300: '#f0d4a0',
          400: '#e5bc72',
          500: '#d4a044',
        },
        roast: {
          dark:  '#1a0f08',
          mid:   '#3d1f0d',
          light: '#6b3820',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
