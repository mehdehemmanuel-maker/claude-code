import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

/** Which build this is, shown on the launch card and the tablet: the commit and when it was built. */
function buildStamp() {
  let sha = process.env['GITHUB_SHA'] ?? '';
  if (!sha) {
    try { sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { sha = 'dev'; }
  }
  return `${sha.slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

// Relative base so the build works from any path (GitHub Pages project sites, file hosts).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(buildStamp()) },
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
