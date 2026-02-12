/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dash-blue': '#1e5bb0',
        'dash-green': '#43a047',
        'dash-orange': '#f2994a',
        'dash-red': '#eb5757',
      }
    },
  },
  plugins: [],
}