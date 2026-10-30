import { defineConfig } from 'vite';

// The Nexus pages (view/): the dashboard (index.html), the space (space.html, on a screen or through WebXR in a
// headset), the part viewer (look.html), the gauntlet (gauntlet.html). Relative base, so it runs from any path.
export default defineConfig({
  root: 'view',
  base: './',
  publicDir: 'public',
  // (the pool's workers (src/nexus/pool.ts) as modules: each loads the whole library, and waits on it at its top level)
  worker: { format: 'es' },
  build: { outDir: '../dist-view', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000, rollupOptions: { input: { index: 'view/index.html', space: 'view/space.html', look: 'view/look.html', nodes: 'view/nodes.html', gauntlet: 'view/gauntlet.html' } } },
});
