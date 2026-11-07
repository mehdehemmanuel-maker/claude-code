#!/usr/bin/env node
// The push gate (spec 00, S3; C11), as git's pre-push hook (the refs come on stdin) or, with `--head`, for the commit at
// HEAD (the Claude Code hook). Refuses a commit whose tree of this folder is not the one `npm run gate` stamped.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPush, commitTree, gitEnv, whereIs } from './lib.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { repo, prefix } = whereIs(project);
const stamp = existsSync(join(project, '.gate-ok')) ? JSON.parse(readFileSync(join(project, '.gate-ok'), 'utf8')) : null;
const shas = process.argv.includes('--head') ? ['HEAD']
  : readFileSync(0, 'utf8').split('\n').map((l) => l.trim().split(/\s+/)[1]).filter((s) => s && !/^0+$/.test(s));
// (every ref pushed is judged, not only the last: one push can carry several branches (the evaluator, 2026-11-01))
for (const sha of shas) {
  // (a commit that holds no folder of this project has nothing the gate judges and goes; one that cannot be read at all is
  // refused, as claude-push.mjs refuses what it cannot read (critique 2026-11-07, finding 9))
  let tree; try { tree = commitTree(repo, prefix, sha); } catch {
    if (spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: repo, env: gitEnv() }).status === 0) continue;
    console.error(`\npush refused (the push gate): ${sha} cannot be read as a commit\n`); process.exit(process.argv.includes('--head') ? 2 : 1);
  }
  const r = checkPush(stamp, tree);
  if (!r.ok) { console.error(`\npush refused (the push gate): ${r.why}\n`); process.exit(process.argv.includes('--head') ? 2 : 1); }
}
