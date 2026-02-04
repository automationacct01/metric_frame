import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Determine proxy target based on environment
// Inside Docker: use 'backend:8000' (Docker service name)
// Local dev: use 'localhost:8002' (exposed Docker port)
const getProxyTarget = () => {
  // Check if running inside Docker (backend service will be resolvable)
  // Default to localhost:8002 for local development
  return process.env.DOCKER_ENV === 'true'
    ? 'http://backend:8000'
    : 'http://localhost:8002';
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths for assets - required for Electron file:// protocol
  base: './',
  server: {
    host: true,
    port: 5175,
    proxy: {
      '/api': {
        target: getProxyTarget(),
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request:', req.method, req.url, '->', options.target + req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', req.method, req.url, '->', proxyRes.statusCode);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
