/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./index.html"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        gold: "#d4a843",
        chrome: "#b8b8b8"
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        condensed: ["var(--font-barlow)", "sans-serif"],
        sans: ["var(--font-dm)", "sans-serif"]
      }
    }
  },
  plugins: []
};
