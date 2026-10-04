import { defineConfig } from 'vite';

// Nexus as a Node program: the runtime and its text channel, bundled to run without a test runner.
export default defineConfig({
  build: { ssr: 'src/nexus/main.ts', outDir: 'dist-nexus', emptyOutDir: true, minify: false, rollupOptions: { output: { entryFileNames: 'nexus.mjs' } } },
});
