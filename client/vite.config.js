import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api to the Express server so the SPA and API share an origin.
// Override the target with API_PROXY_TARGET if the API runs elsewhere.
const target = process.env.API_PROXY_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
    },
  },
});
