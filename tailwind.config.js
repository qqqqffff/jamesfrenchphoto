const flowbite = require('flowbite-react/tailwind')
const colors = require('tailwindcss/colors')

delete colors['lightBlue']
delete colors['warmGray']
delete colors['trueGray']
delete colors['coolGray']
delete colors['blueGray']

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
        main: ['Main Font'],
        birthstone: ['Birthstone']
      },
      colors: {
        ...colors
      }
    },
    screens: {
      'xs': '400px'
    }
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

