import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Budget Tracker',
        short_name: 'Budget',
        description: 'Offline-first workspace budget tracker',
        theme_color: '#0f172a',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'app-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: 'app-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      '@finance/config': resolve(__dirname, '../../packages/config/src/index.ts'),
      '@finance/shared-types': resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@finance/shared-validation': resolve(__dirname, '../../packages/shared-validation/src/index.ts'),
      '@finance/sync-engine': resolve(__dirname, '../../packages/sync-engine/src/index.ts'),
      '@finance/ui': resolve(__dirname, '../../packages/ui/src/index.tsx'),
    },
  },
});
