import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // для веб-версии на GitHub Pages: GRAIN_BASE=/-/
  base: process.env.GRAIN_BASE || '/',
  server: { host: '127.0.0.1', port: 5173 },
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome130', assetsInlineLimit: 0 },
});
