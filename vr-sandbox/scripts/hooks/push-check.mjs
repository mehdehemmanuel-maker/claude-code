#!/usr/bin/env node
// The push gate (spec 00, S3; C11), as git's pre-push hook (the refs come on stdin) or, with `--head`, for the commit at
// HEAD (the Claude Code hook). Refuses a commit whose tree of this folder is not the one `npm run gate` stamped.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPush, commitTree } from './lib.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: project, encoding: 'utf8' }).trim(), prefix = relative(repo, project);
const stamp = existsSync(join(project, '.gate-ok')) ? JSON.parse(readFileSync(join(project, '.gate-ok'), 'utf8')) : null;
const shas = process.argv.includes('--head') ? ['HEAD']
  : readFileSync(0, 'utf8').split('\n').map((l) => l.trim().split(/\s+/)[1]).filter((s) => s && !/^0+$/.test(s));
for (const sha of shas.slice(-1)) {
  let tree; try { tree = commitTree(repo, prefix, sha); } catch { continue; }
  const r = checkPush(stamp, tree);
  if (!r.ok) { console.error(`\npush refused (the push gate): ${r.why}\n`); process.exit(process.argv.includes('--head') ? 2 : 1); }
}
