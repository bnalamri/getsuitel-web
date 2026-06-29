import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4fa',
          100: '#d9e3f2',
          200: '#b3c7e5',
          300: '#7da3d1',
          400: '#4d7dba',
          500: '#2d5a9e',
          600: '#1e3f7a',
          700: '#1B3A6B',   // brand primary
          800: '#152d54',
          900: '#0e1f3a',
          950: '#080f1e',
        },
        gold: {
          50:  '#fdf9ee',
          100: '#f9efcc',
          200: '#f2db8a',
          300: '#EBB535',   // brand gold light
          400: '#e4a020',
          500: '#C9931A',   // brand gold
          600: '#a57214',
          700: '#7d5410',
          800: '#6B4D0C',   // brand gold dark
          900: '#3d2c07',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
}

export default config
