import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/** Pyodide (Python in the browser) shipped with the forge, beside its pages: its computer runs Python where no CDN can
 *  be reached (a headset offline, a locked-down network); the code worker tries this copy first, then the CDN. */
function pyodideLocal(): Plugin {
  let out = '';
  return {
    name: 'pyodide-local', apply: 'build',
    configResolved(c) { out = resolve(c.root, c.build.outDir); },
    closeBundle() {
      const from = resolve(__dirname, 'node_modules/pyodide'); if (!existsSync(from)) return;
      const to = join(out, 'pyodide'); mkdirSync(to, { recursive: true });
      for (const f of ['pyodide.mjs', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) copyFileSync(join(from, f), join(to, f));
    },
  };
}

// The Nexus room (view/): a static page that reads the scene Nexus generated (npm run nexus:scene) and shows it on a
// screen or, through WebXR, in a headset. Relative base, so it runs from any path.
export default defineConfig({
  root: 'view',
  base: './',
  publicDir: 'public',
  plugins: [pyodideLocal()],
  build: { outDir: '../dist-view', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000, rollupOptions: { input: { index: 'view/index.html', room: 'view/room.html', forge: 'view/forge.html', look: 'view/look.html' } } },
});
