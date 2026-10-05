import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/** Which build this is, shown on the launch card and the tablet: the commit and when it was built. */
function buildStamp() {
  let sha = process.env['GITHUB_SHA'] ?? '';
  if (!sha) {
    try { sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { sha = 'dev'; }
  }
  return `${sha.slice(0, 7)} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * Which physics this is: a hash over every file that realises a law (the kernel, its connectors, the creatures and
 * places), so that anything Ego learned from the simulator carries the physics it was learned under and is set aside
 * when that physics changes (docs/AUDIT-3-EGO-KNOWLEDGE.md: a belief whose ancestor changed is not knowledge until
 * it is derived again). Content-addressed: the same code gives the same stamp wherever it is built.
 */
function physicsStamp() {
  const dirs = ['src/physics', 'src/connectors', 'src/engineering', 'src/world', 'src/data'];
  const files: string[] = [];
  const walk = (d: string) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.ts$/.test(e.name)) files.push(p); } };
  for (const d of dirs) walk(d);
  const h = createHash('sha256');
  for (const f of files.sort()) { h.update(f); h.update(readFileSync(f)); }
  return h.digest('hex').slice(0, 12);
}

// Relative base so the build works from any path (GitHub Pages project sites, file hosts).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(buildStamp()), __PHYSICS__: JSON.stringify(physicsStamp()) },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
  },
  worker: { format: 'es' },
  test: {
    include: ['tests/{unit,golden,conformance,codec,nexus}/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
