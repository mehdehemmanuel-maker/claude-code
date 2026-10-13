#!/usr/bin/env node
// Manny's gate. A Stop hook: the harness runs it when Claude tries to end a turn, so it is the one place a rule
// about Claude's own behaviour can be a guarantee rather than a hope. Everything else this project has tried -
// a rule in CLAUDE.md, a line in a checklist - depends on Claude reading it and choosing to comply, and every
// drift in docs/ROUNDS.md happened with the rule already written down.
//
// It refuses to let a turn end when any is true:
//   1. docs/MANNY.md holds an OPEN **BLOCK** finding. Fix it, or answer it in writing (mark it [~]).
//   2. docs/MANNY.md holds an OPEN **SIGHT** request: a thing the critic could not see, and asked to be given eyes
//      for. Build it, or write why it cannot exist. A critic who can only report what he happens to be able to see
//      grades the easy half of the work, so asking for sight has to cost something or it does not get asked.
//   3. src/ or tests/ changed since the commit Manny last ran on. He has not seen the current code.
//
// It never blocks for a QUEUE finding - that is the user's own split: hard interrupt vs queue, by importance.
//
// It fails OPEN on everything it cannot establish (no git, no ledger, bad parse, its own crash). A gate that
// bricks the session would be switched off within a day, and then there is no gate at all.
//
// Off switches, both deliberate and visible: MANNY=off in the environment, or a line `Gate: off` in docs/MANNY.md.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'docs/MANNY.md');
const pass = (note) => { if (note) process.stdout.write(JSON.stringify({ suppressOutput: true, systemMessage: note })); process.exit(0); };
const block = (reason) => { process.stdout.write(JSON.stringify({ decision: 'block', reason })); process.exit(0); };

/** stdin is the hook payload; `stop_hook_active` is true when this stop is already the continuation of a block,
 *  so blocking again would loop forever. */
let hook = {};
try { hook = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no payload: carry on */ }
if (hook.stop_hook_active) pass();
if ((process.env.MANNY ?? '').toLowerCase() === 'off') pass();
if (!existsSync(LEDGER)) pass();

const text = readFileSync(LEDGER, 'utf8');
if (/^Gate:\s*off\b/im.test(text)) pass();

// ---- 1. open blocking findings and sight requests ----
const open = [], sight = [];
for (const line of text.split('\n')) {
  const m = /^\s*-\s*\[( |x|~)\]\s*\*{0,2}(BLOCK|QUEUE|SIGHT)\*{0,2}\s*(.*)$/i.exec(line);
  if (!m || m[1] !== ' ') continue;
  const kind = m[2].toUpperCase();
  if (kind === 'BLOCK') open.push(m[3].trim());
  else if (kind === 'SIGHT') sight.push(m[3].trim());
}
// BLOCK and SIGHT are reported TOGETHER. They were two `block()` calls in order, and `block()` exits, so while any
// blocking finding was open the sight requests were never printed at all - they sat open across three commits and the
// turn ending that did fire named four BLOCKs and said nothing about them. A gate that hides half of what it holds
// teaches its reader that the other half does not exist (docs/MANNY.md #47).
const parts = [];
if (open.length) {
  parts.push(
    `Manny is holding ${open.length} blocking finding${open.length === 1 ? '' : 's'} open in vr-sandbox/docs/MANNY.md:\n\n` +
      open.map((o, i) => `  ${i + 1}. ${o}`).join('\n') +
      `\n\nThis turn cannot end until each one is either FIXED (then mark it [x] with the commit that fixed it) or ` +
      `ANSWERED IN WRITING (mark it [~] and write, under the finding, why it stands as it is - "already fixed", ` +
      `"does not reproduce", "out of scope because ...", "Manny is wrong because ..."). Answering is a real option ` +
      `and Manny can be wrong; what is not an option is leaving it silent.`);
}
if (sight.length) {
  parts.push(
    `Manny asked to be able to SEE ${sight.length} thing${sight.length === 1 ? '' : 's'} and cannot yet ` +
      `(vr-sandbox/docs/MANNY.md):\n\n` +
      sight.map((o, i) => `  ${i + 1}. ${o}`).join('\n') +
      `\n\nA critic judges what he can see, so what he cannot see is the part of the work nobody is checking. ` +
      `This turn cannot end until each request is either BUILT - a tool, a view, a dump, a command, a number the ` +
      `library did not carry; add it to vr-sandbox/docs/TOOLS.md, then mark the request [x] naming what was built ` +
      `and how he runs it - or ANSWERED: mark it [~] and write why that sight cannot exist here (no photo of that ` +
      `face is reachable, the figure is the maker's unpublished CAD, this network cannot run the page). ` +
      `"Not now" is not an answer; "here is the command" and "here is why it is impossible" both are. ` +
      `If it is real work rather than a tool, build the smallest thing that lets him look, and say what is still dark.`);
}
if (parts.length) block(parts.join('\n\n----------------------------------------------------------------\n\n'));

// ---- 2. has Manny seen the current code? ----
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
let head, since;
try {
  head = git('rev-parse', '--short', 'HEAD');
  const m = /^Last run:\s*([0-9a-f]{7,40})\b/im.exec(text);
  if (!m) pass();                                   // never run: say nothing, the ledger's own header asks for it
  if (m[1].startsWith(head) || head.startsWith(m[1])) pass();
  since = git('diff', '--name-only', `${m[1]}..HEAD`, '--', 'src', 'tests');
} catch {
  pass();                                           // no git, unknown commit, shallow clone: fail open
}
if (!since) pass();

const files = since.split('\n').filter(Boolean);
block(
  `Manny has not seen the current code. ${files.length} file${files.length === 1 ? '' : 's'} under src/ or tests/ ` +
    `changed since the commit he last ran on:\n\n` +
    files.slice(0, 12).map((f) => `  ${f}`).join('\n') +
    (files.length > 12 ? `\n  ... and ${files.length - 12} more` : '') +
    `\n\nRun him before ending the turn:\n\n  Agent(subagent_type: "manny", prompt: "Review the current head. ` +
    `The round just done: <what changed and why>.")\n\nThen write what he found into vr-sandbox/docs/MANNY.md, ` +
    `update its "Last run:" line to ${head}, and act on his blocking findings.`,
);
