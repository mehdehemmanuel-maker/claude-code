import { defineConfig } from 'vite';

// The breakdown queue as a Node program (npm run breakdown), bundled to run without a test runner.
export default defineConfig({
  build: { ssr: true, outDir: 'dist-nexus', emptyOutDir: true, minify: false, rollupOptions: { input: { breakdown: 'src/nexus/breakdown-main.ts' }, output: { entryFileNames: '[name].mjs' } } },
});
