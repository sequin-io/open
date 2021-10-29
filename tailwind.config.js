module.exports = {
  purge: ["./pages/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        "ghost-blue": "#26a6ed",
      },
    },
    inset: {
      "3/9": "35%",
      "1/9": "5%",
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
