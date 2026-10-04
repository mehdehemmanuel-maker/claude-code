import { defineConfig } from 'vite';

// The Nexus room (view/): a static page that reads the scene Nexus generated (npm run nexus:scene) and shows it on a
// screen or, through WebXR, in a headset. Relative base, so it runs from any path.
export default defineConfig({
  root: 'view',
  base: './',
  publicDir: 'public',
  build: { outDir: '../dist-view', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000 },
});
