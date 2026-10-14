#!/usr/bin/env node
// `node tools/cost.mjs` — times a door's three legs, so a round can decide whether to optimise it from numbers.
//
// WHY THIS EXISTS. Run 7x nearly spent a day caching the bundle every door rebuilds before it runs, on a figure
// ("30–60 s of build") carried in my head from nothing. Timing it took ninety seconds and the answer was "do
// nothing": the build is a second of a three-second command, so a perfect cache saves a third of a second and adds a
// staleness bug to every tool. That measurement was then typed into the ledger by hand under the wrong command, and
// `node tools/cite.mjs` caught the citation — a figure nobody can re-run is a figure nobody can check (ROUNDS 7x/7y).
//
// So the measurement is a command. It prints the three legs, the build's share, and what a perfect cache would save,
// against the threshold it judges by — so the reader is not asked to trust the judgement, only to read it.
//
//   node tools/cost.mjs                                 the moves door on the car
//   node tools/cost.mjs --door why --words "a drone"     any door, any ask
//   node tools/cost.mjs --runs 3                        median of n runs per leg (default 1)
//
// Wall clock swings on this host, so every figure here is a wall clock and will differ run to run. That is why the
// ledger marks its block as a wall clock and `cite.mjs` checks that this command still PRODUCES timings rather than
// that it reproduces these ones: a timing citation that demanded equality would fail on its ordinary path, which is
// the fault that teaches a reader to ignore the alarm (ROUNDS 7o, #40).
import { execSync } from 'node:child_process';
import { rmSync, existsSync, readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : argv[i + 1]; };
const door = flag('door', 'moves');
const words = flag('words', 'a small hatchback');
const kit = flag('kit', 'car');
const runs = Math.max(1, Number(flag('runs', '1')) || 1);

// THE LEGS ARE READ OUT OF THE DOOR'S OWN SCRIPT, never typed here. A door is `<build> && <run>` in package.json;
// typing those commands into this tool would make it measure what I believe the door does, and it would go on
// reporting that after the scripts changed — a tool that lies by holding still. So the script is split on `&&`:
// the last leg is the door's own work, everything before it is what it pays to get there.
const script = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).scripts?.[door];
if (!script) { console.log(`cost: there is no \`npm run ${door}\` in package.json — the doors are: ${Object.keys(JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8')).scripts).join(', ')}`); process.exit(1); }
const legs = script.split('&&').map((x) => x.trim());
const BUILD = legs.slice(0, -1).join(' && ');
const RUN = `${legs[legs.length - 1]} --kit ${kit} ${JSON.stringify(words)}`;
if (!BUILD) { console.log(`cost: \`npm run ${door}\` is one command — there is no build leg to measure.`); process.exit(1); }

const ms = (cmd) => {
  const t = process.hrtime.bigint();
  try { execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000 }); }
  catch (e) { console.log(`cost: the leg would not run — ${cmd}\n       ${String(e.message).split('\n')[0].slice(0, 120)}`); process.exit(1); }
  return Number(process.hrtime.bigint() - t) / 1e6;
};
const median = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const leg = (label, before, cmd) => {
  const taken = [];
  for (let i = 0; i < runs; i++) { before?.(); taken.push(ms(cmd)); }
  const v = median(taken);
  console.log(`${label.padEnd(20)} ${String(Math.round(v)).padStart(5)} ms${runs > 1 ? `   (median of ${runs}: ${taken.map((x) => Math.round(x)).join(', ')})` : ''}`);
  return v;
};

// A COLD BUILD IS ONE WITH NOTHING KEPT. Deleting only the output would leave vite's own cache and time a warm build
// under a cold label, which is the measurement lying by a default — the fault family this session keeps finding.
const cold = () => { for (const d of ['node_modules/.vite', 'dist-nexus']) if (existsSync(`${ROOT}/${d}`)) rmSync(`${ROOT}/${d}`, { recursive: true, force: true }); };

console.log(`cost: the ${door} door, on ${JSON.stringify(words)} as a ${kit}`);
console.log(`      its build leg: ${BUILD}\n      its own work:  ${RUN}\n`);
const coldMs = leg('cold build', cold, BUILD);
const warmMs = leg('rebuild, no change', null, BUILD);
const runMs = leg('run built door', null, RUN);

// WHAT A CACHE COULD SAVE is the rebuild, not the cold build: a door run twice pays the rebuild, and a cache that
// skips it saves exactly that. The threshold is a tenth of the command — below it the saving is inside this host's
// own run-to-run swing, so a cache would buy noise and owe a staleness bug on every tool that reads the bundle.
const total = warmMs + runMs, share = (warmMs / total) * 100, FLOOR = 10;
console.log('');
console.log(`a second run of the door costs ${Math.round(total)} ms: ${Math.round(warmMs)} building, ${Math.round(runMs)} working.`);
console.log(`the build is ${share.toFixed(0)}% of it, so a perfect cache saves at most ${Math.round(warmMs)} ms.`);
console.log(share < FLOOR
  ? `COST: under the ${FLOOR}% floor — what is left of the build is inside this host's own run-to-run swing. Nothing to win here.`
  : `COST: over the ${FLOOR}% floor — the build is worth skipping when nothing changed, if the skip can be keyed on the inputs themselves.`);
console.log(`(cold first build: ${Math.round(coldMs)} ms, paid once per container.)`);
