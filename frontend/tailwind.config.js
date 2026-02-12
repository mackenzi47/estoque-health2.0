/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores exatas do seu modelo de dashboard
        brandBlue: '#1e5bb0',
        brandGreen: '#43a047',
        brandOrange: '#f2994a',
        brandRed: '#eb5757',
      }
    },
  },
  plugins: [],
}