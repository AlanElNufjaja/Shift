import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    // Proxy local: la SPA consulta /nasa-power y evita bloqueos CORS en desarrollo.
    proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true }, '/nasa-power': { target: 'https://power.larc.nasa.gov', changeOrigin: true, rewrite: (path) => path.replace(/^\/nasa-power/, '') } },
  },
});
