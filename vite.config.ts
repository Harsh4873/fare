import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fare/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/fatsecret': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fatsecret/, '') || '/',
      },
    },
  },
});
