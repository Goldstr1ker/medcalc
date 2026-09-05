import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// Preact вместо React: тот же код на хуках, но пресет подменяет react/react-dom
// на preact/compat через алиасы — стартовый бандл легче примерно вдвое.
// base: './' — приложение работает из подпапки (GitHub Pages: /medcalc/) и позже
// из обёртки Capacitor (file:// / capacitor://), без доп. настройки.
export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Иконки генерируются из public/logo.svg на этапе сборки и
      // подставляются в <head> автоматически (в т.ч. apple-touch-icon).
      pwaAssets: {
        image: 'public/logo.svg',
        preset: 'minimal-2023',
        injectThemeColor: false,
      },

      manifest: {
        name: 'МедКалк — клинические калькуляторы',
        short_name: 'МедКалк',
        description:
          'Клинические калькуляторы и шкалы с разбором по клиническим рекомендациям. Работает офлайн.',
        lang: 'ru',
        theme_color: '#0f172a',
        background_color: '#f4f6f8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        categories: ['medical', 'education'],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
