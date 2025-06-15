import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      'khasanah-crypto': resolve(__dirname, 'rust-crypto/pkg'),
    },
  },
  optimizeDeps: {
    exclude: ['khasanah-crypto'],
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5000,
  },
});
