#!/usr/bin/env node
// The push gate (spec 00, S3; C11), as git's pre-push hook (the refs come on stdin) or, with `--head`, for the commit at
// HEAD (the Claude Code hook). Refuses a commit whose tree of this folder is not the one `npm run gate` stamped.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPush, commitTree, whereIs } from './lib.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { repo, prefix } = whereIs(project);
const stamp = existsSync(join(project, '.gate-ok')) ? JSON.parse(readFileSync(join(project, '.gate-ok'), 'utf8')) : null;
const shas = process.argv.includes('--head') ? ['HEAD']
  : readFileSync(0, 'utf8').split('\n').map((l) => l.trim().split(/\s+/)[1]).filter((s) => s && !/^0+$/.test(s));
// (every ref pushed is judged, not only the last: one push can carry several branches (the evaluator, 2026-11-01))
for (const sha of shas) {
  let tree; try { tree = commitTree(repo, prefix, sha); } catch { continue; }
  const r = checkPush(stamp, tree);
  if (!r.ok) { console.error(`\npush refused (the push gate): ${r.why}\n`); process.exit(process.argv.includes('--head') ? 2 : 1); }
}
