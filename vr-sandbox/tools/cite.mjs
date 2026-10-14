#!/usr/bin/env node
// `node tools/cite.mjs` — re-runs the commands the ledger cites and checks its figures still come out.
//
// `tidy`'s claim rule requires a block of figures in ROUNDS.md to name the command that produced it. That catches a
// MISSING citation. It does not catch a WRONG one, and I proved that on myself within the hour of building it: Run
// 7w's first draft cited `node tools/unwired.mjs` for numbers a deleted probe had produced, and the lint accepted it
// because a command was present. A citation nobody re-runs is the same trust the claim rule exists to remove, moved
// one step along (docs/ROUNDS.md Run 7w, 7x).
//
// So this runs them. For each cited block it takes the figures out of the block, runs the command, and says whether
// those figures are still in its output:
//
//   node tools/cite.mjs              every citation it can run
//   node tools/cite.mjs moves        only citations whose command matches /moves/
//   node tools/cite.mjs --list       what it would run, and what it cannot
//
// It is a DOOR and not a gate: some of these take minutes and one needs a browser, so putting it in `npm run gate`
// would make the gate unusable and the rule would be deleted within a week. The gate holds the cheap half (a command
// is named, and it exists); this holds the expensive half, run when a round quotes numbers it wants to trust.
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const LEDGER = `${ROOT}/docs/ROUNDS.md`;
const argv = process.argv.slice(2), list = argv.includes('--list'), only = argv.find((a) => !a.startsWith('--'));

// a cited block: a fence of figures with a command in it or in the six lines above
const CMD = /(?:^|\s)(?:\$ )?((?:npm run |npx |node )[^\n`]+?)\s*$/m;
const lines = readFileSync(LEDGER, 'utf8').split('\n');
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  if (!/^\s*```/.test(lines[i])) continue;
  let j = i + 1;
  while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++;
  const body = lines.slice(i + 1, j), above = lines.slice(Math.max(0, i - 6), i);
  if (body.filter((l) => /\d/.test(l)).length >= 2) {
    const inBlock = body.map((l) => CMD.exec(l)?.[1]).filter(Boolean);
    const inAbove = above.map((l) => CMD.exec(l)?.[1]).filter(Boolean);
    const cmd = inBlock[0] ?? inAbove[inAbove.length - 1] ?? null;
    // a citation often carries a note after it — "(this run's numbers)", "(a probe, deleted …)" — which is for the
    // reader and not for the shell, so it is taken off before running and kept as the reason it may not run
    if (cmd) {
      const note = /\s+\((.+)\)\s*$/.exec(cmd.trim());
      blocks.push({ at: i + 1, cmd: (note ? cmd.trim().slice(0, note.index) : cmd.trim()).trim(), note: note?.[1] ?? '', body: body.filter((l) => !CMD.test(l)).join('\n') });
    }
  }
  i = j;
}

// THE FIGURES, not every digit. A version, a date, a line number and a one-digit count are noise: what a reader
// would check is the measurements — numbers of two digits or more, and decimals.
const figuresOf = (text) => [...new Set([...text.matchAll(/\b\d[\d,]{1,}(?:\.\d+)?\b/g)].map((m) => m[0].replace(/,/g, '')))]
  .filter((n) => Number(n) >= 10);

const PLACEHOLDER = /<[a-z]|\bdist-view-dev\b|\.\.\./i;
// a citation the ledger itself says is gone (a probe, deleted as probes are) is not a broken citation: it is an
// honest one that cannot be re-run, and saying so is the whole point of printing the note
const runnable = (b) => !PLACEHOLDER.test(b.cmd) && !/delet|removed|since gone/i.test(b.note);
// A BLOCK THE LEDGER ITSELF MARKS HISTORICAL IS NOT DRIFT. An old round's numbers are supposed to differ from
// today's — that is what a ledger is for — so a note saying a later round changed them turns a failure into a
// record. Without this the tool would cry on its ordinary path, which is the fault that teaches a reader to ignore
// the tool (docs/ROUNDS.md Run 7o, #40).
const historical = (b) => /changed them|changed it|this run's numbers|at the time|before Run|superseded/i.test(b.note);
const wanted = blocks.filter((b) => !only || new RegExp(only, 'i').test(b.cmd));

if (list) {
  for (const b of wanted) console.log(`${runnable(b) ? 'run ' : 'SKIP'}  docs/ROUNDS.md:${b.at}  ${b.cmd}${b.note ? `   — ${b.note}` : ''}`);
  console.log(`CITE: ${wanted.filter(runnable).length} of ${wanted.length} citations are runnable here`);
  process.exit(0);
}

let ok = 0, drifted = 0, skipped = 0, broke = 0, historic = 0;
for (const b of wanted) {
  const want = figuresOf(b.body);
  if (!runnable(b)) { console.log(`SKIP     :${b.at}  ${b.cmd}\n           ${b.note ? `the ledger says: ${b.note}` : 'its command has a placeholder in it, so only a person can run it'}`); skipped++; continue; }
  if (!want.length) { console.log(`SKIP     :${b.at}  ${b.cmd}\n           no figure of two digits or more to check`); skipped++; continue; }
  let out = '';
  try { out = execSync(b.cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 }); }
  catch (e) { out = `${e.stdout ?? ''}${e.stderr ?? ''}`; if (!out.trim()) { console.log(`BROKE    :${b.at}  ${b.cmd}\n           would not run: ${String(e.message).split('\n')[0].slice(0, 90)}`); broke++; continue; } }
  const gone = want.filter((n) => !out.includes(n));
  if (!gone.length) { console.log(`holds    :${b.at}  ${b.cmd}   (${want.length} figures still in its output)`); ok++; }
  else if (historical(b)) { console.log(`historic :${b.at}  ${b.cmd}\n           ${gone.length} of ${want.length} figures have moved on, as the ledger says they did: ${b.note}`); historic++; }
  else { console.log(`DRIFTED  :${b.at}  ${b.cmd}\n           ${gone.length} of ${want.length} figures are no longer in its output: ${gone.slice(0, 8).join(', ')}`); drifted++; }
}
console.log('');
console.log(`CITE: ${ok} hold, ${historic} historical, ${drifted} DRIFTED, ${broke} would not run, ${skipped} skipped, of ${wanted.length} citations`);
process.exit(drifted || broke ? 1 : 0);
