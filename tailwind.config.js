/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-dark-purple/80',
    'bg-neon-purple/20',
    'bg-neon-purple/10',
    'bg-neon-pink/10',
    'bg-neon-pink/20',
    'border-neon-purple/20',
    'border-neon-pink/20'
  ],
  theme: {
    extend: {
      colors: {
        'neon-pink': 'var(--neon-pink)',
        'neon-purple': 'var(--neon-purple)',
        'dark-purple': '#1a0b2e',
        'darker-purple': '#0f051d',
        'frontend-accent': 'var(--frontend-accent-color)',
        'frontend-secondary-accent': 'var(--frontend-secondary-accent)',
        'frontend-bg': 'var(--frontend-bg-color)',
        'frontend-header-bg': 'var(--frontend-header-bg)',
        'song-border': 'var(--song-border-color)',
        'nav-bg': 'var(--nav-bg-color)',
        'highlight': 'var(--highlight-color)',
      },
      backgroundImage: {
        'gradient-neon': 'linear-gradient(45deg, var(--neon-purple), var(--neon-pink))',
      },
      screens: {
        'xs': '375px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
};