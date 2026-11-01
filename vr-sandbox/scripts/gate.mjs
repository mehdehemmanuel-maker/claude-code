#!/usr/bin/env node
// `npm run gate`: the type check and the one test, then the stamp the push hook reads (spec 00, task S3).
//   - Before it runs: the loop breaker (C13). Three failed runs on the task in hand (PROGRESS.md) and it refuses, until a
//     line "pipeline: <task>: …" in PROGRESS.md says whether a pipeline is missing.
//   - When it passes: `.gate-ok` holds the tree of this folder exactly as it was tested, so a push is refused unless the
//     commit holds that same tree (C11). Files the run itself changed void the stamp.
import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLoop, progressOf, workingTree } from './hooks/lib.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: project, encoding: 'utf8' }).trim(), prefix = relative(repo, project);
const STATE = join(project, '.gate-fails.json'), STAMP = join(project, '.gate-ok'), PROGRESS = join(project, 'PROGRESS.md');
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const { task, note } = progressOf(existsSync(PROGRESS) ? readFileSync(PROGRESS, 'utf8') : '');

const loop = checkLoop(state, task, note);
if (!loop.ok) { console.error(`\ngate refused (the loop breaker): ${loop.why}\n`); process.exit(1); }
if (loop.reset) state[task] = { fails: 0, note };

if (existsSync(STAMP)) rmSync(STAMP);
const before = workingTree(repo, prefix);
const run = (cmd, args) => spawnSync(cmd, args, { cwd: project, stdio: 'inherit' }).status === 0;
const passed = run('npx', ['tsc', '--noEmit', '-p', '.']) && run('npx', ['vitest', 'run']);
const s = state[task] ?? { fails: 0, note };
if (!passed) {
  state[task] = { ...s, fails: s.fails + 1 }; writeFileSync(STATE, JSON.stringify(state, null, 1));
  console.error(`\ngate failed: ${state[task].fails} failed run(s) on ${task || 'no task in hand'}${state[task].fails >= 3 ? ' (the next run is refused until PROGRESS.md answers whether a pipeline is missing)' : ''}\n`);
  process.exit(1);
}
state[task] = { ...s, fails: 0 }; writeFileSync(STATE, JSON.stringify(state, null, 1));
const after = workingTree(repo, prefix);
if (after !== before) { console.error('\ngate passed, but the run changed files in this folder: no stamp. Commit what it wrote, and run it again.\n'); process.exit(1); }
writeFileSync(STAMP, JSON.stringify({ tree: after, task, at: new Date().toISOString() }, null, 1));
console.log(`\ngate passed; stamped tree ${after.slice(0, 10)} (push only a commit holding exactly this)\n`);
