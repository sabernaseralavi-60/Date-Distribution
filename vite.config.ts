import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'خرمای صابر — سامانه جامع پخش و فروش',
        short_name: 'خرمای صابر',
        description: 'پلتفرم یکپارچه فروش چندکاناله، پخش امانی، انبارداری و مدیریت مالی خرمای صابر',
        theme_color: '#14532d',
        background_color: '#FAF8F5',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        dir: 'rtl',
        lang: 'fa',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // the API (and private attachments) are never answered from the service-worker cache
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/],
      },
    }),
  ],
  server: { proxy: { '/api': 'http://127.0.0.1:3000', '/healthz': 'http://127.0.0.1:3000' } },
});
