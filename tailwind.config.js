module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D9622F',
          50: '#FCEFE7',
          100: '#F8D9C4',
          200: '#F0B48C',
          300: '#E68E5C',
          400: '#DF7642',
          500: '#D9622F',
          600: '#B54D22',
          700: '#8C3B1A',
          800: '#642A13',
          900: '#3F1A0C',
        },
        secondary: {
          DEFAULT: '#3F5A3F',
          50: '#F1F6EE',
          100: '#DCE8D3',
          200: '#BFD6AE',
          300: '#A0C189',
          400: '#7FA968',
          500: '#5F8C4C',
          600: '#3F5A3F',
          700: '#334A33',
          800: '#273A27',
          900: '#1B2A1B',
        },
        sand: {
          50: '#FDFBF7',
          100: '#F7EEE0',
          200: '#F0E1C8',
          300: '#E6CFA8',
          400: '#D9B481',
        },
        ink: {
          DEFAULT: '#3B2A1E',
          50: '#F5EFE8',
          100: '#E8DBCB',
          700: '#4A3826',
          800: '#2B2018',
          900: '#201812',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}