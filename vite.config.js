import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' — приложение работает на любом статическом хостинге и из подпапки,
// а также после `npm run build` — прямо из файла (пригодится для обёртки Capacitor).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
