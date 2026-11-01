#!/usr/bin/env node
// git's commit-msg hook (spec 00, S3): the change budget (C12: the files a commit changes keep to its task's owners, or the
// message names a decision record) and honesty (C10: what the commit adds to REALITY.md or PROGRESS.md that states a
// number names the command or test it came from). The message file is the first argument.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBudget, checkHonesty, entriesOf, gitEnv, ownersFromPlan, whereIs } from './lib.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { repo, prefix } = whereIs(project);
// (git keeps the index it was given (GIT_INDEX_FILE, a partial commit's), but not GIT_DIR: see gitEnv)
const git = (...a) => execFileSync('git', a, { cwd: repo, env: gitEnv(), encoding: 'utf8' });
if (existsSync(join(git('rev-parse', '--absolute-git-dir').trim(), 'MERGE_HEAD'))) process.exit(0); // (a merge brings others' commits, each already judged)
const msg = readFileSync(process.argv[2], 'utf8').split('\n').filter((l) => !l.startsWith('#')).join('\n');
const files = git('diff', '--cached', '--name-only').split('\n').filter(Boolean).map((f) => (f.startsWith(`${prefix}/`) ? f.slice(prefix.length + 1) : `../${f}`));
if (!files.some((f) => !f.startsWith('../')) && !files.some((f) => f === '../CLAUDE.md' || f === '../.claude/settings.json')) process.exit(0); // (nothing of this project)
const decisions = readdirSync(join(project, 'plan/decisions')).map((f) => f.slice(0, 4)).filter((n) => /^\d{4}$/.test(n));
const budget = checkBudget(msg, files, ownersFromPlan(join(project, 'plan')), decisions);
if (!budget.ok) { console.error(`\ncommit refused (the change budget): ${budget.why}\n`); process.exit(1); }
// (the added hunks of the log, one entry each; the added lines of the handoff, each on its own)
const added = (file, perLine) => {
  // (the path from the top of the repository: git reads a path relative to where it runs, and this runs in the project
  // folder; the first version read nothing at all, and a planted entry passed on a live try)
  const d = git('diff', '--cached', '-U0', '--', `:(top)${prefix}/${file}`), out = [];
  for (const hunk of d.split(/^@@.*@@.*$/m).slice(1)) { const lines = hunk.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    if (perLine) out.push(...lines.filter((l) => l.trim())); else out.push(...entriesOf(lines.join('\n'))); }
  return out;
};
const honesty = checkHonesty([...added('docs/REALITY.md', false), ...added('PROGRESS.md', true)]);
if (!honesty.ok) { console.error(`\ncommit refused (honesty): ${honesty.why}\n`); process.exit(1); }
