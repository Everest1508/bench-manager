import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../build/renderer',
    emptyOutDir: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
    },
  },
});
