import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#09090b',
        mist: '#d6d3d1',
        lime: {
          300: '#bef264',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Manrope"', 'sans-serif'],
      },
      boxShadow: {
        halo: '0 30px 80px rgba(0, 0, 0, 0.30)',
      },
      backgroundImage: {
        'app-radial':
          'radial-gradient(circle at top left, rgba(190, 242, 100, 0.18), transparent 32%), radial-gradient(circle at top right, rgba(251, 191, 36, 0.10), transparent 30%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
