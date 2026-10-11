import { defineConfig } from 'vite';

// Nexus as Node programs: the runtime with its text channel, and a round of intents it draws for itself, bundled to
// run without a test runner.
export default defineConfig({
  build: { ssr: true, outDir: 'dist-nexus', emptyOutDir: true, minify: false, rollupOptions: { input: { nexus: 'src/nexus/cli/main.ts', round: 'src/nexus/cli/round-main.ts', scene: 'src/nexus/cli/scene-main.ts', census: 'src/nexus/cli/census-main.ts', invent: 'src/nexus/cli/invent-main.ts', breakdown: 'src/nexus/cli/breakdown-main.ts', pack: 'src/nexus/cli/pack-main.ts', boardmap: 'src/nexus/cli/boardmap-main.ts', works: 'src/nexus/cli/works-main.ts', machine: 'src/nexus/cli/machine-main.ts' }, output: { entryFileNames: '[name].mjs' } } },
});
