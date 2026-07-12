import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'plex-dark': '#0E1015',
        'plex-orange': '#E5A00D',
        'plex-orange-hover': '#c98d0b',
      },
    },
  },
  plugins: [],
}
export default config
