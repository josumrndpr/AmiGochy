import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: { '@shared': resolve(__dirname, 'shared') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        settings: resolve(__dirname, 'renderer/settings/index.html'),
        pet: resolve(__dirname, 'renderer/pet/index.html'),
      },
    },
  },
});