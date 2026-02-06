import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Static site build config for landing page + download page only
// Used for hosting on Vercel/Netlify/Cloudflare Pages
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist-static',
    sourcemap: false,
  },
  define: {
    // Mark as static site (no backend)
    'import.meta.env.VITE_STATIC_SITE': JSON.stringify('true'),
  },
});
