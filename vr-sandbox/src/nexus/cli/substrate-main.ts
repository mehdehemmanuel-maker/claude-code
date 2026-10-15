// `npm run substrate` — the door the substrate never had.
//
// `src/nexus/substrate/` holds the Nexus engine: an intent manifolded into a system of laws, a section left free and
// chosen from a catalogue, a contract measured against a rigid-body realization, and a journal of why. Twenty of its
// files are tested — some of them heavily — and `node tools/unwired.mjs` showed that **not one of them is reached
// from any entry point**: no CLI imported them, no page imported them, so every one of their exports was finished
// work that only its own test could run (docs/ROUNDS.md Run 7s).
//
// That is the same fault as `mobility()` and as the look page's three silent judges, at the scale of a whole
// directory: 2,300 lines behind a green gate with nothing to calculate it by. The user's rule for it was three words —
// merge, reattach, or delete. This is the reattachment: one door that runs each slice end to end and prints its
// verdict, so the engine can be worked rather than only tested.
//
//   npm run substrate                  every slice: the beam, the bracket, the swinging bar
//   npm run substrate -- beam          one of them
//
// It takes no Jolt: a realization needs the physics engine, and without it a slice still derives its system, solves
// it with the section free and makes its choice from the catalogue — which is the part this door is for. What it
// cannot do without Jolt it says, rather than printing a verdict that looks complete.
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, type Slice } from '../substrate/beam';
import { bracketOnPost, bracketCatalogue, bracketIntent, bracketMaterial, type BracketSlice } from '../substrate/bracket';
import { barOnHinge, swingIntent, swingMaterial, type SwingSlice } from '../substrate/swing';
import { restIntent, toppleStudy } from '../substrate/study';
import type { Solution } from '../substrate/solve';

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// `npm run substrate -- time` — THE ONE LAW, AND THE BOOK BESIDE IT.
//
// The reframe of 2026-10-15: one universal law (time), and every other "law" demoted to a sensor — something that
// explains behaviour without governing it. This prints both halves: what proper time does, and what the book's 252
// laws turn into once c, ħ, k_B and the Coulomb constant are taken as one, which is a power of time each.
if (want[0] === 'time') {
  const { LIGHT, CONVERSIONS, asTime, apart, bookInTime, branches, downstream, elapse, graphSummary, kinshipFeeds,
    placeOf, rate, calculate, sense, spacetimeSplit, timeTreeLines, upstream } = await import('../substrate/time');
  const { measured, says } = await import('../substrate/record');
  const { lawById } = await import('../book');
  const pc = (b: number) => `${(b * 100).toString().padStart(5)}% of c`;
  console.log('THE ONE LAW   d\u03C4/dt = \u221A(1 \u2212 v\u00B2/c\u00B2)      c = ' + LIGHT + ' m/s, exact by definition');
  console.log('');
  console.log('      speed        through time     through space     total        a year of the world is');
  for (const b of [0, 0.1, 0.5, 0.6, 0.9, 0.99, 0.999, 1]) {
    const s = spacetimeSplit({ id: 'x', tau: 0, at: [0, 0, 0], through: [b * LIGHT, 0, 0] });
    console.log(`  ${pc(b)}   ${(s.throughTime / LIGHT * 100).toFixed(4).padStart(9)}% c   ${(s.throughSpace / LIGHT * 100).toFixed(4).padStart(9)}% c   ${(s.magnitude / LIGHT).toFixed(6)} c      ${(rate(b * LIGHT) * 365.25).toFixed(3).padStart(8)} days to you`);
  }
  console.log('');
  console.log('  Every row totals exactly c. A thing at rest is not still: it is going through time at light speed,');
  console.log('  and going fast spends some of that motion on space INSTEAD. At c there is none left for the clock.');
  console.log('');
  const [home, away] = elapse([{ id: 'home', tau: 0, at: [0, 0, 0], through: [0, 0, 0] }, { id: 'away', tau: 0, at: [0, 0, 0], through: [0.6 * LIGHT, 0, 0] }], 100);
  console.log(`  Over 100 s of the domain's clock: ${apart(home!, away!).says}`);
  console.log('');
  console.log('EVERYTHING AS A POWER OF TIME \u2014 four constants set to one, each of them a statement that two units');
  console.log('measure the same thing:');
  for (const c of CONVERSIONS) console.log(`  ${c.by.padEnd(5)} ${c.sets.padEnd(34)} ${c.src}`);
  console.log('');
  for (const u of ['s', 'm', 'kg', 'K', 'm/s', 'J', 'J s', 'N', 'W', 'Pa']) console.log(`  ${asTime(u).says}`);
  console.log('');
  console.log('  A SPEED HAS NO UNITS. There is no such thing as a speed \u2014 only a fraction of c, which is an angle');
  console.log('  in spacetime. Action has none either: it is a count of \u0127, which is why the one law of physics is');
  console.log('  about action being stationary \u2014 a pure number being extremal, with no unit to be extremal in.');
  console.log('');
  console.log('THE BOOK, BY THE POWER OF TIME IT GIVES');
  for (const g of bookInTime()) {
    const names = g.laws.slice(0, 4).map((l) => l.name).join(', ');
    console.log(`  time^${String(g.power).padEnd(3)} ${String(g.laws.length).padStart(3)} laws   ${names}${g.laws.length > 4 ? `, \u2026 (+${g.laws.length - 4})` : ''}`);
  }
  console.log('');
  console.log('THE WHOLE TREE \u2014 five levels, every one of them derived: the root, the power of time, the SI dimension that');
  console.log('power came from, the shape of the math, the law. Nothing here is a written-down category.');
  console.log('');
  for (const l of timeTreeLines()) console.log(`  ${l}`);
  console.log('');
  console.log('ONE SENSOR\u2019S PLACE ON IT');
  for (const id of ['stress.axial', 'newton.second', 'arrhenius', 'inertia.disc', 'carnot']) console.log(`  ${placeOf(lawById(id)).says}`);
  console.log('');
  const g = graphSummary();
  console.log('ACROSS THE TREE, NOT DOWN IT \u2014 who can feed whom, derived from the dimensions');
  console.log(`  ${g.derivedEdges} edges over ${g.laws} laws: law A gives something law B takes. None of them written by hand.`);
  console.log(`  Against that, ${g.writtenKinship} edges of KINSHIP are written by hand in book/principles.ts \u2014 "this law`);
  console.log(`  BECOMES that law" \u2014 and only ${g.kinshipAlsoFeeds} of them are also feeds. They are two different relations,`);
  console.log('  and one name used to do both jobs:');
  for (const k of kinshipFeeds().filter((x) => !x.alsoFeeds).slice(0, 3)) console.log(`    ${k.says}`);
  console.log('');
  for (const id of ['newton.second', 'carnot']) {
    const up = upstream(id), down = downstream(id);
    console.log(`  ${id}: ${up.length} laws can feed it, it can feed ${down.length}`);
    console.log(`    fed by   ${up.slice(0, 5).join(', ')}${up.length > 5 ? `, \u2026` : ''}`);
    console.log(`    feeds    ${down.slice(0, 5).join(', ')}${down.length > 5 ? `, \u2026` : ''}`);
  }
  console.log('');
  console.log('THE CALCULATOR \u2014 it does not just find a chain, it runs it');
  const chain = calculate('m/s', { z: measured('sprocket teeth', 38, '-', 'the sprocket'),
    pitch: measured('pitch', 0.0127, 'm', 'ISO 606'), rpm: measured('speed', 1500, 'rpm', 'a tacho') }, undefined, 3);
  console.log(`  asked for a m/s, given a sprocket: ${chain.says}`);
  if (chain.got) console.log(`    ${says(chain.got)}   (38 \u00D7 12.7 mm = 0.4826 m a turn, \u00D7 25 turns a second)`);
  const refuse = calculate('Pa', { T1: measured('temperature', 300, 'K', 'a probe'),
    T2: measured('temperature', 900, 'K', 'another probe'), n: measured('amount', 2, 'mol', 'a balance'),
    V: measured('volume', 0.01, 'm^3', 'a flask') });
  console.log(`  and where it would have to guess, it stops: ${refuse.refused}`);
  console.log('');
  const b = branches(), kinds = [...new Set(b.map((x) => x.kind))];
  console.log('THE BRANCHES THAT ARE NOT THERE');
  for (const k of kinds) console.log(`  ${String(b.filter((x) => x.kind === k).length).padStart(3)} \u00D7 ${k}`);
  for (const x of b.filter((y) => y.forced).slice(0, 2)) console.log(`    ${x.says}`);
  console.log('');
  const r = sense(lawById('newton.second'), { m: 2, a: 3 }, 41.5);
  console.log('A LAW DEMOTED TO A SENSOR');
  console.log(`  ${r.says}`);
  console.log(`  cites ${r.cites}`);
  console.log('  It has no address. There is nowhere for it to put anything, so it explains the state and cannot');
  console.log('  govern it \u2014 which is the whole of the reframe, and tests/nexus/time.test.ts asserts it directly:');
  console.log('  every instrument in the book is run over a state and the state is unchanged.');
  console.log('');
  console.log('SUBSTRATE: the one law');
  process.exit(0);
}

// `npm run substrate -- know <part> [quantity …]` — THE ONE HIERARCHY, ASKED.
//
// A part decomposes into sub-parts down to a material; a quantity decomposes into the quantities its law needs down
// to a measurement. The same shape, meeting at time. Nothing is computed until it is asked for here.
if (want[0] === 'know') {
  const { know, clashes, onTimesTree } = await import('../substrate/derive');
  const { breakdown } = await import('../substrate/record');
  const { INVENTORY } = await import('../parts/inventory');
  const thing = want[1] ?? 'gear-small';
  const asked = want.length > 2 ? want.slice(2) : ['density', 'volume', 'mass', 'height', 'breadth'];
  const i = INVENTORY.get(thing);
  if (!i) { console.log(`no part called ${thing}. Try: gear-small, gear-plastic, bearing-ring, bearing-625`); process.exit(1); }
  console.log(`${i.name}  (${thing})`);
  console.log(`  made of: ${i.of.map((c) => `${c.id}${c.n > 1 ? ` x${c.n}` : ''}`).join(', ') || 'nothing — it is a material'}`);
  console.log(`  stated size: ${i.size ? i.size.join(' x ') + ' mm' : 'none'}`);
  console.log('');
  for (const q of asked) {
    const f = know(thing, q);
    if (!f) { console.log(`  ${q.padEnd(10)} not reachable from the book and the inventory: it must be measured.`); continue; }
    console.log(`  ${q.padEnd(10)} ${f.says.replace(`${q} of ${thing} = `, '')}`);
    console.log(`  ${''.padEnd(10)} on time's tree: ${onTimesTree(f).join(' \u2192 ')}`);
    if (f.alsoBy.length) console.log(`  ${''.padEnd(10)} also by, agreeing: ${f.alsoBy.map((a) => a.how).join('; ')}`);
    for (const l of breakdown(f.d).slice(0, 6)) console.log(`  ${''.padEnd(12)}${l}`);
  }
  const c = clashes();
  console.log('');
  if (!c.length) console.log('NO CLASHES: every quantity reached more than one way came out the same.');
  else {
    console.log('CLASHES \u2014 a quantity reached two ways that disagree. Physics does not allow it, so the DATA is wrong:');
    for (const x of c) console.log(`  * ${x.says}`);
  }
  console.log('');
  console.log('SUBSTRATE: the one hierarchy, asked');
  process.exit(0);
}

// `npm run substrate -- unaccounted` — WHAT THIS WORLD DOES NOT ACCOUNT FOR.
//
// Every other verdict here says whether what was derived holds. This one says what was never derived at all, which
// is the question no gap can raise: an absent law raises nothing, runs clean and looks finished. It builds the
// plainest real world the engine has — a place, its matter, and a domain with measured gravity — and reports its
// holes, its dead ends, and the laws out of the book whose inputs are all present and which nothing applies.
if (want[0] === 'unaccounted' || want[0] === 'holes') {
  const { Runtime } = await import('../substrate/runtime');
  const { unaccounted, unaccountedLines, represents } = await import('../substrate/holes');
  const { GRAVITY, gravityAxis, placeAt } = await import('../substrate/place');
  const { leaf } = await import('../lang/term');
  const given = (v: number, u: string, w: string) => leaf(w, v, u, { class: 'configuration' as const, source: w });
  const rt = Runtime.open();
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: given(9.80665, 'm/s^2', 'standard gravity') });
  for (const j of [0, 1, 2]) rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: given(j === 1 ? -1 : 0, '1', 'gravity points down the second axis') });
  rt.admit({ kind: 'place', id: 'block',
    centre: [0, 0, 0].map((v) => given(v, 'm', 'at the origin')) as never,
    turn: [0, 0, 0, 1].map((v) => given(v, '1', 'not turned')) as never,
    half: [0.05, 0.05, 0.05].map((v) => given(v, 'm', 'as cut')) as never });
  rt.admit({ kind: 'leaf', at: placeAt.density('block'), leaf: given(7850, 'kg/m^3', 'mild steel (ASM: carbon steels 7.85)') });

  console.log('A 100 mm steel cube in a domain with measured gravity — nothing else said about it.');
  console.log('');
  console.log(`  mass    ${rt.binding(placeAt.mass('block'))?.value?.toFixed(3)} kg      (nobody gave it a mass: it came from the shape and the density)`);
  console.log(`  weight  ${rt.binding(placeAt.weight('block'))?.value?.toFixed(2)} N      (nobody enabled gravity: the kept law's ports bound here)`);
  console.log('');
  for (const line of unaccountedLines(unaccounted(rt))) console.log(line);
  console.log('Is each phenomenon represented at all?');
  for (const [u, what] of [['kg', 'mass'], ['N', 'force'], ['K', 'temperature'], ['C', 'charge'], ['rad/s', 'rotation']] as const)
    console.log(`  ${what.padEnd(12)} ${represents(rt, u) ? 'yes' : 'NO — no address in this world carries one, so no law about it can bind'}`);
  console.log('');
  console.log('SUBSTRATE: the unaccounted census');
  process.exit(0);
}
const run = (name: string) => !want.length || want.some((w) => name.includes(w));

// what a choice came to: how many candidates the catalogue offered, how many the constraints admitted, which was
// picked, and — the number worth having — whether the preference could break the tie at all
const sayChoice = (c: { candidates: unknown[]; manifold: unknown[]; pick: unknown; tie: unknown[] }) => {
  const pick = c.pick as { says?: string; id?: string } | null;
  return `${c.manifold.length} of ${c.candidates.length} admissible → ${pick ? (pick.says ?? pick.id ?? 'one picked') : c.tie.length ? `a tie of ${c.tie.length} the preference cannot break` : 'NONE admissible'}`;
};
// `Solution.bound` is a Record and the free list is `free`, not `unbound` (src/nexus/substrate/solve.ts:33). Written
// from memory it printed "0 bound, 0 left free" for every slice — a confident zero, the third shape this session's
// tools got wrong by guessing instead of reading the type. `satisfied` is the verdict that matters: every constraint
// holds, one fails, or one cannot be decided, and the third is not the first.
const saySolution = (s: Solution | undefined) => {
  if (!s) return 'no solution';
  const n = Object.keys(s.bound).length;
  const verdict = s.satisfied === true ? 'every constraint holds' : s.satisfied === false ? 'A CONSTRAINT FAILS' : 'a constraint CANNOT BE DECIDED';
  return `${n} symbol${n === 1 ? '' : 's'} bound, ${s.free.length} left free${s.free.length ? ` (${s.free.slice(0, 3).map((f) => f.sym).join(', ')})` : ''}; ${s.constraints.length} constraints: ${verdict}${s.contradictions.length ? `; ${s.contradictions.length} CONTRADICTION${s.contradictions.length === 1 ? '' : 'S'}` : ''}`;
};

let ran = 0, said: string[] = [];

if (run('beam')) {
  ran++;
  const s: Slice = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.3 }), materialLeaves('wood.douglas-fir'), lumberCatalogue());
  console.log('the beam on two supports — a load at rest on a span, its section left free');
  console.log(`  its system: ${saySolution(s.open)}`);
  console.log(`  its choice: ${sayChoice(s.choice as never)}`);
  const t = toppleStudy([s]);
  console.log(`  does it topple: ${t.observations.length} observation${t.observations.length === 1 ? '' : 's'}, ${t.candidates.length} candidates → ${t.chosen ? 'one relation chosen' : t.ambiguous.length ? `${t.ambiguous.length} left ambiguous` : 'nothing chosen'}${t.relation ? `: ${t.relation.name}` : ""}`);
  said.push(`beam ${(s.choice as { pick: unknown }).pick ? 'chose' : 'chose nothing'}`);
}

if (run('bracket')) {
  ran++;
  const b: BracketSlice = bracketOnPost(bracketIntent(), bracketMaterial(), bracketCatalogue());
  console.log('');
  console.log('the bracket on a post — an arm bolted to a side, carrying a load at a calculate');
  console.log(`  its system: ${saySolution(b.open)}`);
  console.log(`  its choice: ${sayChoice(b.choice as never)}`);
  console.log(`  its configuration: ${b.configuration ? 'derived' : 'NOT derived — nothing admissible to configure'}`);
  said.push(`bracket ${b.configuration ? 'configured' : 'unconfigured'}`);
}

if (run('swing')) {
  ran++;
  const w: SwingSlice = barOnHinge(swingIntent(), swingMaterial());
  console.log('');
  console.log('the bar on a free hinge — time as a coordinate, released from an angle');
  console.log(`  its system: ${saySolution(w.solution)}`);
  console.log(`  its configuration: ${w.configuration ? 'derived' : 'NOT derived'}`);
  console.log(`  its realization: ${w.realization ? 'measured against the rigid-body kernel' : 'none — a realization needs Jolt, which this door does not start'}`);
  said.push(`swing ${w.configuration ? 'configured' : 'unconfigured'}`);
}

if (!ran) {
  console.log(`npm run substrate -- [beam|bracket|swing]`);
  console.log(`no slice matches ${want.join(' ')}`);
  console.log('SUBSTRATE: nothing run');
  process.exit(2);
}
console.log('');
console.log(`SUBSTRATE: ${ran} slice${ran === 1 ? '' : 's'} run — ${said.join(', ')}`);
