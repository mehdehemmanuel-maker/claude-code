import { defineConfig } from 'vitest/config';

// Relative base so the build works from any path (GitHub Pages project sites, file hosts).
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
  },
  worker: { format: 'es' },
  test: {
    include: ['tests/{unit,golden,conformance,codec}/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
