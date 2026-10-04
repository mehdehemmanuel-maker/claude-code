import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The workbench bundle: the Nexus generator and its instruments as one script that defines a global, Nexus.
export default defineConfig({
  build: {
    outDir: fileURLToPath(new URL('../../dist-workbench', import.meta.url)),
    emptyOutDir: true,
    minify: true,
    lib: { entry: fileURLToPath(new URL('./entry.ts', import.meta.url)), name: 'Nexus', formats: ['iife'], fileName: () => 'nexus.js' },
  },
});
