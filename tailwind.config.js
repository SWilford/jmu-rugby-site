/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        arvo: ["Arvo", "serif"],
      },
      colors: {
        jmuPurple: "#450084",
        jmuGold: "#CBB677",
      },
    },
  },
  plugins: [],
};
