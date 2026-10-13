#!/usr/bin/env node
// Manny's eyes. One command that gives the critic everything there is to see about an ask, so "I could not see it"
// stops being a reason and becomes a thing he ran.
//
//   node tools/manny-see.mjs "a gantry that moves 25 kg at 1000 mm/s over 2000 x 1000 x 600"
//   node tools/manny-see.mjs "pulley GT2 60 8" --part
//   node tools/manny-see.mjs "<words>" --views three,top,explode,cut --out /tmp/see
//   node tools/manny-see.mjs "<words>" --numbers        (no browser: the figures only, in seconds)
//
// It does the two things a judgement needs, together:
//
//   1. THE NUMBERS. Every door the project has, run against the same words, with its refusals kept rather than
//      swallowed: what the machine composer makes of it, what the plan buys, what the works can and cannot do, what
//      the breakdown queue says is not in the table. A render with no figures beside it cannot be judged - a lattice
//      of posts looks fine until its own bill says it weighs 4 kg.
//   2. THE PICTURE. The viewer built, the look page opened from several views, a PNG a view. **The Read tool shows
//      a PNG as a picture**, so these are really seen, not described - that is the whole point of this half, and the
//      paths are printed at the end for exactly that.
//
// The views are chosen to be the ones that expose fakery, not the ones that flatter: `three` is what a person sees
// first, `explode` asks whether it comes apart into real parts or is one lump wearing a name, and `cut` asks whether
// it is hollow. Pass `--views` to ask for others (view=top|three|front|side|rear|under, plus zoom, only, hide, hi,
// ortho=1, dir=x,y,z: src/nexus/view/look.ts is the list).
//
// Everything it cannot do, it says. A build that fails, a browser that will not start, a door that errors: printed
// as the failure it was, never as silence. A tool that quietly shows less than it promised is worse than no tool,
// because the critic then reports on what he thinks he saw.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// one pass, so a word that happens to equal an earlier one does not get eaten as a flag's value
const TAKES = new Set(['views', 'out']);
const flags = new Map(); const rest = [];
for (let i = 0, a = process.argv.slice(2); i < a.length; i++) {
  if (!a[i].startsWith('--')) { rest.push(a[i]); continue; }
  const name = a[i].slice(2);
  if (TAKES.has(name)) { flags.set(name, a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : ''); } else flags.set(name, true);
}
const flag = (n) => (typeof flags.get(n) === 'string' ? flags.get(n) : null);
const has = (n) => flags.has(n);
const words = rest.join(' ').trim();

if (!words || has('help')) {
  console.log(`Manny's eyes: the numbers and the picture for one ask.

  node tools/manny-see.mjs "<words>"                    everything
  node tools/manny-see.mjs "<words>" --numbers          the figures only, no browser
  node tools/manny-see.mjs "<words>" --part             the words name a library part, not a machine ask
  node tools/manny-see.mjs "<words>" --views three,top,explode,cut
  node tools/manny-see.mjs "<words>" --out <dir>        where the PNGs go (default /tmp/manny-see)

Then READ each PNG it prints. The Read tool shows it to you as a picture.`);
  process.exit(words ? 0 : 1);
}

const out = resolve(flag('out') || '/tmp/manny-see');
mkdirSync(out, { recursive: true });
const say = (s) => process.stdout.write(s + '\n');
const rule = (t) => say(`\n${'='.repeat(78)}\n${t}\n${'='.repeat(78)}`);

/** Run a command and keep whatever it said, stdout and stderr alike, failure included. A door that refuses an ask is
 *  the most informative thing it can do, and a refusal arrives as a non-zero exit often as not. */
function run(cmd, args, { cwd = ROOT, ms = 300000 } = {}) {
  try {
    return { ok: true, text: execFileSync(cmd, args, { cwd, encoding: 'utf8', timeout: ms, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) };
  } catch (e) {
    const text = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
    return { ok: false, text: text || String(e.message ?? e), why: e.signal === 'SIGTERM' ? `timed out after ${ms} ms` : `exit ${e.status ?? '?'}` };
  }
}

/** The same, with text on standard input, for a door that reads a sketch rather than an argument. */
function runIn(cmd, args, input, { ms = 300000 } = {}) {
  try { return { ok: true, text: execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', input, timeout: ms, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }) }; }
  catch (e) { return { ok: false, text: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() || String(e.message ?? e), why: `exit ${e.status ?? '?'}` }; }
}

// ---- 1. the numbers -------------------------------------------------------------------------------------------
rule(`WHAT THE LIBRARY SAYS ABOUT: ${words}`);

const built = join(ROOT, 'dist-nexus');
say('\nbuilding the command-line doors (vite, once for all of them)...');
const b = run('npx', ['vite', 'build', '--config', 'vite.nexus.config.ts', '--logLevel', 'error']);
if (!b.ok) {
  say(`COULD NOT BUILD, so none of the figures below are available (${b.why}):\n${b.text.slice(0, 2000)}`);
  say('\nThis is a real failure, not a missing feature. Report it as one.');
} else {
  // Each door, with what it is for, so a refusal can be read against the right question. Only doors that really
  // take WORDS are given the words: `works.mjs` wants a build id and `plan.mjs` a sketch, and handing either a
  // sentence gets a stack trace, not an answer. What has no door is said to have none.
  const buildIds = (() => { const r = run('node', [join(built, 'works.mjs'), 'builds']); return r.ok ? r.text : ''; })();
  const namesABuild = words.split(/\s+/).some((w) => new RegExp(`(^|\\s)${w.replace(/[^\w-]/g, '')}(\\s|$)`).test(buildIds) && w.length > 3);

  const doors = has('part')
    ? []
    : [
        ['machine.mjs', 'composed from units by what each affords, and how its arrangement fails', [words], true],
        ['invent.mjs', 'the intent pipeline: what it heard in the words, what it could not use, what it would ask', [words, '--n', '1'], true],
        ['plan.mjs', 'the sketch reader, fed these words as a sketch - if it makes nothing of them, that is the finding', ['-'], true, words],
        ['works.mjs', 'what the works would have to do to build it', [words], namesABuild],
      ];

  if (has('part')) {
    rule('a library part: there is NO command-line door that prints one part\'s figures');
    say(`The words "${words}" name a part, and this project has no door that prints a single part's mass, size,
interfaces and what it contains. \`npm run machine\`, \`invent\` and \`plan\` are *ask* doors; \`breakdown\` and \`pack\`
work on the whole tree. So the numbers half is missing for a part, and you are seeing only the picture below.

That is a gap, not a limit of yours. It is worth a SIGHT request if you need it:
  want: a door that takes a part's words and prints what the library makes of it - mass, size, the interfaces it
        declares, the parts its inventory lists, and what it refuses and why.`);
  }

  for (const [file, why, args, when, stdin] of doors) {
    if (!when) { say(`\n--- ${file}: not run. It takes a build id, and "${words}" is not one. Nothing was hidden from you.`); continue; }
    const q = join(built, file);
    if (!existsSync(q)) { say(`\n--- ${file}: NOT BUILT (no ${q}). The door does not exist; say so rather than guessing.`); continue; }
    rule(`${file} — ${why}`);
    const r = stdin === undefined ? run('node', [q, ...args]) : runIn('node', [q, ...args], stdin);
    if (!r.ok) say(`[the door refused or failed: ${r.why}. Its own words follow, and a refusal with a number in it is a good answer]`);
    say(r.text.trim().slice(0, 12000) || '(it said nothing at all, which is itself a finding)');
  }
}

// ---- 2. the picture -------------------------------------------------------------------------------------------
if (has('numbers')) {
  say('\n--numbers: stopping before the renders.');
  process.exit(0);
}

rule(`WHAT IT LOOKS LIKE: ${words}`);
// vite.view.config.ts has `root: 'view'`, so its `--outDir ../dist-view-dev` lands HERE, beside this tool's own
// root, not a level above it. Getting that wrong serves a directory with no look.html and every view 404s.
const viewer = join(ROOT, 'dist-view-dev');
say('\nbuilding the viewer...');
const v = run('npx', ['vite', 'build', '--config', 'vite.view.config.ts', '--logLevel', 'error', '--outDir', '../dist-view-dev', '--emptyOutDir']);
if (!v.ok) {
  say(`COULD NOT BUILD THE VIEWER, so there are no pictures below (${v.why}):\n${v.text.slice(0, 2000)}`);
  say('\nYou are blind on this ask. Say that in your report rather than judging the look of it.');
  process.exit(0);
}

// The views that expose fakery, not the ones that flatter it.
// `cut` is NOT in this list, and that is a measured decision rather than an oversight. Three plane rules were tried
// against a NEMA 17 and every one left the motor whole: the world origin (z>0) shaved a corner, the bounding box's
// middle sits half a metre out along the 500 mm lead lying on the floor, and the biggest mesh by box volume is that
// same lead, because a long curved wire's BOX is bigger than the motor it hangs off. Clipping itself works - the
// corner really was sliced - so the fault is only in choosing the plane, and the honest answer is that no rule tried
// chooses it on a part with a long thin appendage. A cutaway that renders the thing uncut tells you it is solid when
// nobody looked inside, which is the exact lie this view exists to catch. It stays reachable as `--views cut`, with
// the caveat printed, and is not offered as a detector until it detects.
const DEFAULT = ['three', 'top', 'front', 'explode'];
const views = (flag('views') || '').split(',').map((s) => s.trim()).filter(Boolean);
const wanted = views.length ? views : DEFAULT;
// `cut` and `explode` take VALUES, not flags. They were sent `=1` and both were inert: look.ts parses cut as
// /^([xyz])([<>])(-?[\d.]+)$/, which "1" never matches, and explode=1 is one level, which on a 78-mesh stepper moved
// 7 pixels of a million. Both views were the plain three-quarter view wearing another name.
const q = (v) => {
  const w = `words=${encodeURIComponent(words)}`;
  if (v === 'explode') return `${w}&view=three&explode=4`;    // four levels deep: does it come apart into real parts?
  if (v === 'cut') return `${w}&view=three&cut=z`;            // sliced through the middle of what was drawn: is it hollow, or solid where it should not be?
  return `${w}&view=${encodeURIComponent(v)}`;
};
const asks = wanted.map((v) => `${v}|${q(v)}`);

say(`rendering ${asks.length} views: ${wanted.join(', ')}`);
if (wanted.includes('cut')) say(`CAVEAT on \`cut\`: the clipping works, but the PLANE is chosen by a heuristic that
fails on anything with a long thin appendage (a lead, a belt, a rail), where it misses the body and the view renders
UNCUT. So an uncut-looking cut view is not evidence that the thing is solid - it is evidence of nothing. Judge it only
where you can see an actual cut face.`);
const r = run('node', [join(ROOT, 'tools/look.mjs'), viewer, out, ...asks], { ms: 420000 });
const reported = r.text.trim();
say(reported.slice(0, 8000) || '(look.mjs said nothing)');

// WHAT WAS ACTUALLY DRAWN. look.mjs prints each view's `lookReady`, which now carries the resolved name and says.
// A render that renders is not a render of the ask: the part kit answers unknown words with its family's example,
// and until this check that substitution was invisible in both the picture and the log.
const drew = [...reported.matchAll(/"name":"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
const faked = /NOT THE WORDS ASKED/.test(reported);
if (drew.length) say(`\nit drew: ${[...new Set(drew)].join(' | ')}`);
if (faked) say(`\n*** THE RENDER IS NOT OF YOUR ASK ***
The library could not make "${words}" and drew its family's EXAMPLE PART instead. Every picture below is of that
example, not of what you asked for. Do not judge the look of this ask from them, and do not report that you saw it.
That the words do not reach a drawable thing is itself the finding, and a bigger one than anything in the picture.`);
if (!r.ok) say(`\n[look.mjs failed: ${r.why}. Any view missing below was not rendered, and you did not see it]`);

const pngs = existsSync(out) ? readdirSync(out).filter((f) => f.endsWith('.png')).sort() : [];
rule('NOW READ THESE — the Read tool shows a PNG to you as a picture');
if (!pngs.length) {
  say('\nNo PNG was produced. You have no picture of this ask, and the honest report says so.');
} else {
  for (const f of pngs) say(`  ${join(out, f)}`);
  const missed = wanted.filter((v) => !pngs.includes(`${v}.png`));
  if (missed.length) say(`\nNOT rendered, so NOT seen: ${missed.join(', ')}. Do not judge those views.`);
  say(`\nRead every one. What you cannot answer from them is a SIGHT request, not a guess:
write it in docs/MANNY.md as "- [ ] **SIGHT** <#id> <what you could not see>", with what would let you see it.
The Stop hook will not let the turn end until it is built or answered in writing.`);
}
