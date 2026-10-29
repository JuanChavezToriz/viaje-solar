import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// Use Three's published source entry. Some managed Windows installations
// quarantine its generated ESM bundle while leaving the source modules intact.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    rollupOptions: {
      input: {
        atlas: fileURLToPath(new URL('./index.html', import.meta.url)),
        orbital: fileURLToPath(new URL('./automovil/index.html', import.meta.url))
      }
    }
  },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [{
      find: /^three$/,
      replacement: fileURLToPath(new URL('./node_modules/three/src/Three.js', import.meta.url))
    }]
  }
});
