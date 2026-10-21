// ONE ASK THROUGH EVERY DOOR, side by side: does this project have a loop, or a pile of doors?
//   node tools/loop.mjs "a desk lamp with an arm that stays where you put it"
//   node tools/loop.mjs --asks asks.txt      one ask a line, each run and scored
//   node tools/loop.mjs "<ask>" --keep out/  keep every door's whole answer under out/
//
// WHY IT EXISTS. 2026-10-17: the end goal was written down for the first time (docs/DONE.md) and it is a LOOP —
// words → a design → a bill that can be ordered → a lesson that teaches the build → the works that makes it. So
// the first thing to measure is whether an ask survives the loop. One ask was put through three doors by hand:
//   pack    → a 25-pack of 5 mm LEDs, $12.50, and a lesson called "Put it together" that never names the thing
//   machine → a two-link arm on NEMA 17s and GT2 belts, and "nothing in those words says what the machine must do"
//   part    → "No family makes this."
// Three doors, one ask, three unrelated answers, none of which is a desk lamp. Nothing in the tree had ever asked
// the doors the SAME question, so nothing had ever shown that they do not feed each other. This does, in one run.
//
// It judges nothing about quality. It records, per door: did it answer, what did it say it could not do, how many
// parts it named, and whether the next door in the loop could take what it produced. The last column is the loop.
import { execFile } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';

const args = process.argv.slice(2);
const ki = args.indexOf('--keep'), keep = ki >= 0 ? args[ki + 1] : null;
const ai = args.indexOf('--asks');
const asks = ai >= 0
  ? fs.readFileSync(args[ai + 1], 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  : args.filter((a, i) => i !== ki && i !== ai && !(ki >= 0 && i === ki + 1) && !(ai >= 0 && i === ai + 1));
if (!asks.length) { console.log('node tools/loop.mjs "<what you want>" [--keep <folder>] [--asks <file>]'); process.exit(1); }
if (!fs.existsSync('dist-nexus/pack.mjs')) { console.log('build the doors first: node tools/bundle.mjs'); process.exit(1); }
if (keep) fs.mkdirSync(keep, { recursive: true });

const run = (door, argv) => new Promise((ok) => {
  execFile('node', [`dist-nexus/${door}.mjs`, ...argv], { maxBuffer: 64 << 20, timeout: 600_000 },
    (err, out, errOut) => ok({ out: String(out ?? ''), err: String(errOut ?? ''), threw: Boolean(err) && !out }));
});

// What each door is asked, and how its answer is read. A door's own refusal is the answer, not a failure to hide:
// `said` is what it told us it could not do, and it is printed whole.
// "3 × bolt M5x12" anywhere (a plan lists several to a line, separated by semicolons), and a bill row in a pack
const PARTS = /(?:^|[;\t] *)\d+\s*×\s*([^;\n]+)|^\|\s*([^|]+?)\s*\|\s*\[/gm;
const DOORS = [
  { id: 'part', of: (a) => [a], says: (t) => /No family makes this|refus/i.test(t) ? t.split('\n').filter((l) => l.trim()).slice(1, 4).join(' ') : '' },
  { id: 'machine', of: (a) => [a], says: (t) => (t.match(/It will not:\n([\s\S]*?)(\n\n|$)/)?.[1] ?? '').trim() },
  { id: 'pack', of: (a, dir) => [a, dir], says: (t) => (t.match(/## Said\n([\s\S]*?)(\n##|$)/)?.[1] ?? '').trim() },
];

const count = (t) => { const s = new Set(); let m; PARTS.lastIndex = 0; while ((m = PARTS.exec(t))) s.add((m[1] ?? m[2]).trim()); return s; };
const safe = (s) => s.replace(/[^a-z0-9]+/gi, '-').slice(0, 48).replace(/^-|-$/g, '');

for (const ask of asks) {
  console.log(`\n=== ${ask}`);
  const got = {};
  for (const d of DOORS) {
    const dir = keep ? path.join(keep, safe(ask), d.id) : fs.mkdtempSync('/tmp/loop-');
    if (d.id === 'pack') fs.mkdirSync(dir, { recursive: true });
    const r = await run(d.id, d.of(ask, dir));
    // a pack writes its answer to a file and prints only the path, so the written pack is the answer
    const file = d.id === 'pack' ? path.join(dir, 'pack.md') : null;
    const text = file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : r.out;
    if (keep) { fs.mkdirSync(path.dirname(path.join(keep, safe(ask), `${d.id}.txt`)), { recursive: true }); fs.writeFileSync(path.join(keep, safe(ask), `${d.id}.txt`), text || r.err); }
    const parts = count(text);
    got[d.id] = { answered: !r.threw && Boolean(text.trim()), parts, said: d.says(text), text };
    const said = got[d.id].said.replace(/\s+/g, ' ').slice(0, 150);
    console.log(`  ${d.id.padEnd(8)} ${got[d.id].answered ? `${parts.size} parts named` : 'no answer'}${said ? `  — said: ${said}` : ''}`);
  }
  // THE LOOP: the pack prices parts by the LIBRARY's name for them ("NEMA 17 stepper") while the machine orders them
  // by the words that draw them ("stepper nema17 40"), so comparing those two lists of names answers nothing — it was
  // the first version of this line and it said "the doors do not feed each other" on a bill that was entirely the
  // machine's. What does answer it is the REASON the pack writes on each line, "for its <unit>": the question is
  // whether the pack is buying the machine the composer designed, so it is how many composed units the bill accounts for.
  const units = [...got.machine.text.matchAll(/^ {2}(\S.*?) — /gm)].map((m) => m[1].trim());
  const covered = units.filter((u) => got.pack.text.includes(u));
  if (!units.length) console.log('  LOOP     the composer afforded nothing for these words: nothing to carry');
  else console.log(`  LOOP     ${covered.length} of ${units.length} composed units are in the bill`
    + (covered.length === units.length ? '  — the design is what is being bought' : covered.length ? '  — partly carried' : '  — the doors do not feed each other'));
}
if (keep) console.log(`\nevery door's whole answer under ${keep}`);
