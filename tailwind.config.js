/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EAF4FF',
          100: '#D6EAFF',
          200: '#A9D4FF',
          300: '#76BAFF',
          400: '#46A2FF',
          500: '#1E8BFF',
          600: '#1472E8',
          700: '#1455C8',
          800: '#123E91',
          900: '#0D2D68'
        },
        app: {
          sidebar: '#F3F4F6',
          canvas: '#FFFFFF',
          border: '#E6E8EC',
          hover: '#E9EAED',
          selected: '#E4E5E8',
          text: '#111827',
          muted: '#8A9099'
        },
        gold: '#F7C948'
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(30, 139, 255, 0.14)'
      }
    }
  },
  plugins: []
}
