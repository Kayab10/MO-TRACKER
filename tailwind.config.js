/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // MO Track primary violet
        violet: {
          50: '#f2effe',
          100: '#e6e0fd',
          200: '#cec3fb',
          300: '#b0a0f7',
          400: '#9078f1',
          500: '#7c5cfc',
          600: '#6c4ce0',
          700: '#5a3ec0',
          800: '#4a349b',
          900: '#3d2f7d',
        },
        lime: {
          300: '#d6f24a',
          400: '#c8e938',
          500: '#b9dc1f',
          600: '#a3c40f',
        },
        // stat card accents (from the screens)
        navy: '#1e2a5a',
        magenta: '#c21c8a',
        teal: '#128b9c',
        // login gradient
        sky1: '#6e93d6',
        sky2: '#3ec6d9',
        loginbtn: '#3b5fc4',
        shell: '#f0f0f3',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 20px -6px rgba(24, 20, 60, 0.14)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
