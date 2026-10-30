import { defineConfig } from 'vitest/config';

// The tests (the gate runs them all); the pages are built by vite.view.config.ts, the breakdown queue's program by
// vite.nexus.config.ts.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 4000 },
  worker: { format: 'es' },
  test: {
    include: ['tests/{unit,golden,nexus}/**/*.test.ts'],
    testTimeout: 60_000,
    // (the TypeScript each run compiles, kept on disk between runs: about a quarter of the gate's time was this, redone each time)
    fsModuleCache: true,
  },
});
