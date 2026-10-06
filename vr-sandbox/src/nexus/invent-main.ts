// The intent pipeline as a program anyone can ask for anything, and read what it did:
//   npm run invent -- "a lamp that follows the sun" [--answers "2 kg, 1 m"] [--n 3] [--seed 7] [--log stress.jsonl] [--steps]
// It reads the words, says what it heard, what it could not use and what it would ask; answers its own questions
// with what it would take (or with --answers, in the order asked); designs from a seed (or several, each unlike the
// others), each checked under every law it keeps and with real physics (Jolt, loaded here); and prints each design:
// whether it holds, how much of what was asked it does, the plan (what met each want, what was not chosen and why),
// the checks and what they found, what it could not do, and with --steps every step with what called it, when, why,
// where and how. With --log, each run is kept as a line of JSON, for a stress test.

import { appendFileSync } from 'node:fs';
import { answersFrom, conceive, designs, len, sayConception, showValue } from './conceive';
import type { Jolt } from './realize';

const args = process.argv.slice(2), flag = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const answersSaid = flag('--answers'), n = Number(flag('--n') ?? 1), seed = Number(flag('--seed') ?? ((Date.now() % 1e9) | 0)), log = flag('--log'), steps = args.includes('--steps');
const words = args.filter((x) => x !== '--steps').join(' ').trim();
if (!words) { console.log('Say what to invent: npm run invent -- "a table that holds 30 kg"'); process.exit(1); }

const t0 = Date.now();
// the physics engine where it can be loaded; without it, what moves or stands is not tested, and it says so
let J: Jolt | null = null; try { J = (await (await import('jolt-physics/wasm-compat')).default()) as unknown as Jolt; } catch (e) { console.log(`(the physics engine is not here: ${(e as Error).message.split('\n')[0]}; standing, pushing and moving are not tested)`); }
let c = conceive(words);
process.on('uncaughtException', (e) => { console.log(`\nTHE GENERATOR FAILED: ${e.message}\n${(e.stack ?? '').split('\n').slice(1, 4).join('\n')}`); if (log) appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), words, failed: e.message })}\n`); process.exit(2); });
console.log(`ASKED: ${words}\nREAD: ${sayConception(c)}`);
// the questions: answered as said, or (no one being here to answer) with what it would take, said as taken
let answers: Record<string, string> = {};
for (let round = 0; round < 3 && c.questions.length; round++) {
  const a = answersSaid ? answersFrom(c, answersSaid) : answersFrom(c, 'go');
  if (!a || !Object.keys(a).length) break;
  answers = { ...answers, ...a };
  console.log(`${answersSaid ? 'ANSWERED' : 'NO ONE ANSWERED; IT TOOK WHAT IT WOULD'}: ${c.questions.map((q) => `${q.kind === 'what' ? q.ask.replace(/ Shall I.*$/, '').slice(0, 160) : q.ask} → ${q.kind === 'what' ? (answers[q.key] ? answers[q.key] : c.wants.length ? 'make the part it can' : '(nothing said)') : `${answers[q.key] ?? '(not answered)'} [${showValue(q)}]`}`).join(' | ')}`);
  c = conceive(words, answers);
}
// what its size asks, and what the laws say of what was asked: whether or not anything is made
if (c.scale) console.log(`AT ITS SIZE (${len(c.scale.L)}):\n  ${c.scale.groups.map((g) => `${g.past ? '!' : '·'} ${g.name}: ${g.says}`).join('\n  ')}${c.scale.must.length ? `\n  SO IT WOULD HAVE TO BE BUILT SO:\n    - ${c.scale.must.join('\n    - ')}` : ''}`);
if (c.bounds.length) console.log(`WHAT THE LAWS SAY OF WHAT WAS ASKED:\n  ${c.bounds.map((b) => `${b.ok === null ? '·' : b.ok ? '✓' : '✗'} ${b.what}: ${b.says}`).join('\n  ')}`);
// nothing is made: what was read is said above, each part with what it would need; it is not said again
if (!c.wants.length) { console.log(`NOTHING MADE: ${c.asked.some((a) => a.kind !== 'for' && !a.got) ? `none of what was asked is something I make yet (each part is said above with what it would need)${c.bounds.length || c.scale ? '; what its size and the laws say of it is above' : ''}` : 'nothing in the words says what it is to do'}.`); finish([]); }
const ds = designs(c, n, { seed, physics: J, at: [0, 0] });
// every want barred (by its size, or nothing kept meets it): nothing is made, and why is said
if (ds.every((d) => d.parts === 0)) { console.log(`NOTHING MADE: ${[...new Set(ds.flatMap((d) => d.gaps))].join('; ')}`); finish(ds); }
for (const d of ds) {
  console.log(`\n=== ${d.title}: ${d.ok ? 'HOLDS' : 'DOES NOT HOLD'} · ${d.does[0] === d.does[1] ? 'DOES WHAT WAS ASKED' : `DOES ${d.does[0]} OF ${d.does[1]} THINGS ASKED`}${d.gaps.length ? ' · NOT ALL DERIVED' : ''} — ${d.parts} parts, ${+d.mass.toPrecision(3)} kg, footprint ${d.footprint.map(len).join(' × ')}`);
  console.log(`WHAT WAS ASKED:\n  ${d.asked.map((a) => `${a.kind === 'for' ? '·' : a.got ? '✓' : '✗'} ${a.kind === 'for' ? 'for' : a.kind}: ${a.text}${a.got ? ` → ${a.got}` : a.why ? ` (${a.why})` : ''}`).join('\n  ') || '(nothing said but numbers)'}`);
  if (c.dropped.length) console.log(`NUMBERS NOT USED:\n  ${c.dropped.join('\n  ')}`);
  console.log(`PLAN:\n  ${d.plan.join('\n  ')}`);
  console.log(`CHOICES: ${d.choices.join('; ')}`);
  console.log(`CHECKS:\n  ${d.checks.map((x) => `${x.ok ? '✓' : '✗'} ${x.what}: ${x.says}`).join('\n  ')}`);
  if (d.gaps.length) console.log(`NOT YET: ${d.gaps.join('; ')}`);
  if (d.tries.length) console.log(`DRAWN AGAIN FIRST: ${d.tries.map((t) => `seed ${t.seed}: ${t.why}`).join(' | ')}`);
  if (steps) console.log(`STEPS:\n  ${d.traces.map((t) => `${t.step}\n      what ${t.what} · called by "${t.called}" · ${t.when} · why: ${t.why} · where: ${t.where} · how: ${t.how}`).join('\n  ')}`);
}
finish(ds);

function finish(ds: ReturnType<typeof designs>): never {
  console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if (log) appendFileSync(log, `${JSON.stringify({ at: new Date().toISOString(), words, answers, seed, wants: c.wants.map((w) => ({ fn: w.fn, says: w.says, q: Object.fromEntries(Object.entries(w.q).map(([k, f]) => [k, [f.v, f.unit, f.by]])) })), asked: c.asked, dropped: c.dropped, limits: c.limits, scale: c.scale ? { L: c.scale.L, past: c.scale.groups.filter((g) => g.past).map((g) => g.key), must: c.scale.must } : null, bounds: c.bounds, designs: ds.map((d) => ({ title: d.title, ok: d.ok, does: d.does, whole: d.whole, parts: d.parts, mass: d.mass, choices: d.choices, failed: d.checks.filter((x) => !x.ok).map((x) => `${x.what}: ${x.says}`), gaps: d.gaps, tries: d.tries.length })), ms: Date.now() - t0 })}\n`);
  process.exit(0);
}
