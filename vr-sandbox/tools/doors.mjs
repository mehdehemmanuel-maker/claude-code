#!/usr/bin/env node
// Every door into this project, what each one opens, and when it was last touched.
//
//   node tools/doors.mjs            every door, newest-touched first
//   node tools/doors.mjs --cold     only the ones nothing has opened in a while
//
// It exists because the critic judged `ask/machine.ts` and the look page five runs running and had never opened
// `teach/`, `life/` or the forge room — not from choosing badly, but because nothing anywhere says what there is to
// look at. A list of commands lives in `package.json`, a paragraph about each lives at the top of its own file, and
// the two had never been put side by side. (docs/MANNY.md SIGHT #33.)
//
// The "last touched" column is the file's own last commit, which is a proxy for attention and not for quality: a door
// nobody has changed may be finished or may be forgotten, and the point is only that you can see which ones they are.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cold = process.argv.includes('--cold');
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

/** The first sentence of a file's own header: every file here says what it owns, because the tidy lint requires it. */
const saysOf = (p) => {
  if (!existsSync(p)) return null;
  const head = readFileSync(p, 'utf8').split('\n').slice(0, 24);
  const lines = [];
  for (const l of head) { if (!l.startsWith('//')) break; lines.push(l.replace(/^\/\/\s?/, '')); }
  const text = lines.join(' ').trim();
  const stop = text.search(/\.\s|\. $/);
  return (stop > 0 ? text.slice(0, stop + 1) : text).slice(0, 150) || null;
};

const when = (p) => {
  try { return execFileSync('git', ['log', '-1', '--format=%as', '--', p], { cwd: ROOT, encoding: 'utf8' }).trim() || '—'; } catch { return '—'; }
};

// 1. the command-line doors: a script in package.json that runs one of cli/'s entry points
const cli = join(ROOT, 'src/nexus/cli');
const doors = [];
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) {
  const m = /dist-nexus\/([\w-]+)\.mjs/.exec(cmd);
  if (!m) continue;
  const file = readdirSync(cli).find((f) => f === `${m[1]}-main.ts` || (m[1] === 'nexus' && f === 'main.ts'));
  const p = file ? join(cli, file) : null;
  doors.push({ how: `npm run ${name}`, what: (p && saysOf(p)) || '(no header says what it opens)', at: p ? `src/nexus/cli/${file}` : '—', when: p ? when(p) : '—' });
}

// 2. the tools beside them
for (const f of readdirSync(join(ROOT, 'tools')).filter((x) => x.endsWith('.mjs')).sort()) {
  doors.push({ how: `node tools/${f}`, what: saysOf(join(ROOT, 'tools', f)) || '(no header)', at: `tools/${f}`, when: when(join(ROOT, 'tools', f)) });
}

// 3. the pages, which are doors a person walks through rather than types
for (const [how, at] of [['view/look.html (tools/look.mjs)', 'src/nexus/view/look.ts'], ['the forge room (tools/forge-look.mjs)', 'src/nexus/view/forge.ts'], ['the phone', 'src/nexus/view/apps.ts']]) {
  doors.push({ how, what: saysOf(join(ROOT, at)) || '(no header)', at, when: when(join(ROOT, at)) });
}

doors.sort((a, b) => (a.when < b.when ? 1 : a.when > b.when ? -1 : 0));
const old = doors.filter((d) => d.when !== '—').slice(-8).map((d) => d.how);
const show = cold ? doors.filter((d) => old.includes(d.how)) : doors;

console.log(`${doors.length} doors into this project${cold ? `, the ${show.length} least recently touched` : ', newest-touched first'}.\n`);
for (const d of show) {
  console.log(`${d.when}  ${d.how}`);
  console.log(`            ${d.what}`);
  console.log(`            ${d.at}\n`);
}
if (!cold) console.log(`The ${old.length} nothing has touched in longest, which is where a critic has not been looking:\n  ${old.join('\n  ')}\n\n(--cold prints only those. "Last touched" is a proxy for attention, not for quality.)`);
