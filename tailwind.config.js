const flowbite = require('flowbite-react/tailwind')
const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    flowbite.content(),
  ],
  theme: {
    extend: {
      fontFamily: {
        main: ['Main Font']
      },
      colors: {
        ...colors
      }
    },
  },
  plugins: [
    flowbite.plugin(),
  ],
  safelist: [
    {
      pattern:
        /(bg|text|border|fill)-(transparent|current|pink|rose|red|fuchsia|purple|blue|sky|cyan|emerald|green|lime|yellow|orange|amber|gray|black)/,
    },
  ],
}

