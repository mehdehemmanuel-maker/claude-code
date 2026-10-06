import { defineConfig } from 'vite';

// Nexus as Node programs: the runtime with its text channel, and a round of intents it draws for itself, bundled to
// run without a test runner.
export default defineConfig({
  build: { ssr: true, outDir: 'dist-nexus', emptyOutDir: true, minify: false, rollupOptions: { input: { nexus: 'src/nexus/main.ts', round: 'src/nexus/round-main.ts', scene: 'src/nexus/scene-main.ts', census: 'src/nexus/census-main.ts', invent: 'src/nexus/invent-main.ts' }, output: { entryFileNames: '[name].mjs' } } },
});
