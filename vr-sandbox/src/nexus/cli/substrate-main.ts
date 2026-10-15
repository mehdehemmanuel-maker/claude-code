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

// `npm run substrate -- observe [law …]` — THE UNIVERSAL LAW OBSERVATION TABLE.
//
// Every law, and the physical thing in the environment you can watch it on. Derived, never asserted: a law is
// connected to a thing when the thing HAS the quantities the law reads, which `know` answers. So it upgrades itself
// — a part added to the inventory or a law added to the book changes the table with nothing rewritten.
if (want[0] === 'observe') {
  const { observationTable, tableLines, showsIt, pointable } = await import('../substrate/witness');
  const things = pointable(Number(process.env.WITNESSES ?? 12));
  if (want.length > 1) {
    for (const id of want.slice(1)) {
      console.log(id);
      const lines = showsIt(id, things);
      if (!lines.length) console.log('  nothing in the environment answers even one of its ports.');
      for (const l of lines) console.log(`  \u25C6 ${l}`);
      console.log('');
    }
    console.log('SUBSTRATE: the observation table');
    process.exit(0);
  }
  for (const l of tableLines(observationTable(undefined, things), 12)) console.log(l);
  console.log('');
  console.log('A LAW WITH NO WITNESS IS THE HONEST FINDING: it is in the book and nothing here shows it. Add the thing');
  console.log('that does \u2014 a thermometer, a cell, a spring \u2014 and it enters the table by itself.');
  console.log('');
  console.log('SUBSTRATE: the observation table');
  process.exit(0);
}

// `npm run substrate -- engine` — THE ENGINE'S OWN PARTS, RUN.
//
// Eleven files of `substrate/` were reachable from no door at all: the engine advertised as whole with pieces still
// in the box. `clock.ts` and `hold.ts` were joined into the one law instead (each thing at its own time, whether
// that time comes from its speed or from what it is made of). These four are reached here, and each one RUNS and
// prints a number you can check by hand rather than merely being imported.
if (want[0] === 'engine') {
  const { attemptRate, changeTime, barrierFromViscosity } = await import('../substrate/rate');
  const { halfIonized, ionizedFraction } = await import('../substrate/compose');
  const { causal, generate, timeOf } = await import('../substrate/scale');
  const { ownTimeOfSphere, advanceByOwnClocks, asTime } = await import('../substrate/time');
  const { says } = await import('../substrate/record');

  console.log('EACH THING AT ITS OWN TIME \u2014 substrate/clock.ts and substrate/hold.ts, joined into the one law');
  const regions = [{ name: 'a thin fin', C: 2, T0: 400 }, { name: 'the block', C: 900, T0: 300 }, { name: 'the room', C: 1e9, T0: 293 }];
  for (const l of advanceByOwnClocks(regions, [{ a: 0, b: 1, G: 4 }, { a: 1, b: 2, G: 0.8 }], 0.4, 60).says) console.log(`  ${l}`);
  console.log(`  a 1 mm steel ball in still air: ${says(ownTimeOfSphere(0.001, 7850, 490, 0.026))}`);
  console.log('');

  console.log('WHAT HAPPENS DURING A CHANGE \u2014 substrate/rate.ts (Eyring, J. Chem. Phys. 3:107, 1935)');
  console.log(`  the thermal attempt rate at 300 K is kT/h = ${attemptRate(300).toPrecision(5)} per second \u2014 ${asTime('1/s').says}`);
  console.log(`  a 50 kJ/mol barrier at 300 K is crossed in ${changeTime(50000, 300).toPrecision(4)} s; at 400 K, ${changeTime(50000, 400).toPrecision(4)} s`);
  console.log(`  water's viscosity at 300 K implies a barrier of ${(barrierFromViscosity(8.9e-4, 1.8e-5, 300) / 1000).toPrecision(3)} kJ/mol`);
  console.log('');

  console.log('WHAT MATTER IS MADE OF, AND WHEN IT COMES APART \u2014 substrate/compose.ts (Saha)');
  console.log(`  hydrogen at 1e20 per m\u00B3 is half ionized at ${halfIonized(1e20).toPrecision(5)} K`);
  for (const T of [5000, 9000, 15000]) console.log(`    at ${T} K it is ${(ionizedFraction(T, 1e20) * 100).toFixed(1)}% ionized`);
  console.log('');

  console.log('WHAT CAN BE RESOLVED OF A SYSTEM \u2014 substrate/scale.ts');
  const g = generate({ c: causal() });
  console.log(`  from the constants alone: ${g.mechanisms.length} mechanism(s), ${g.lengths.length} length(s)`);
  for (const m of g.mechanisms.slice(0, 3)) console.log(`    ${m.text}: crossing 1 m takes ${timeOf(m, 1).toPrecision(4)} s`);
  console.log('');

  console.log('CHOOSING THE REPRESENTATION TO GENERATE IN \u2014 substrate/tune.ts');
  // The tuner searches an axis for the coarsest value that still keeps its contract. Here the axis is a time step
  // and the "manifold" is the error of an explicit Euler step on dy/dt = -y over one second, whose exact answer is
  // e^-1: a real judgement with a real contract, so the search has something to find rather than a stub to agree with.
  const { tune } = await import('../substrate/tune');
  const { setting } = await import('../substrate/record');
  const steps = [0.5, 0.25, 0.125, 0.0625, 0.03125].map((v) => setting(`a step of ${v} s`, v, 's', 'the tuner'));
  const t = tune({ sym: 'dt', values: steps },
    (v) => { const dt = v.value!; let y = 1; for (let i = 0; i < Math.round(1 / dt); i++) y += -y * dt; return { dt, y }; },
    (m) => ({ refusedBy: [], kept: Math.abs(m.y - Math.exp(-1)) < 0.02, quantities: {} }));
  for (const st of t.path) console.log(`  a step of ${st.value.value!.toPrecision(4)} s \u2192 ${st.kept ? 'within 2% of e\u207B\u00B9' : 'too coarse'}`);
  console.log(`  the tuner's choice: ${t.chosen ? `${t.chosen.value.value!.toPrecision(4)} s \u2014 the coarsest step that still holds` : 'none of them held'}`);
  console.log('');

  console.log('STILL REACHED BY NO DOOR, and what each needs \u2014 named so it is not claimed as done:');
  console.log('  attempt.ts      an Intent from ask/want, so the first manifolding of a want can be attempted');
  console.log('  explore.ts      a Space factory, preference laws and an observer: the edge-of-the-language experiment');
  console.log('  project.ts      a frame and its Prisms from substrate/coupling.ts, to project a scene for the renderer');
  console.log('  study-joint.ts  a booted Jolt and a list of JointCases (mass, reach, bolt, count)');
  console.log('  study-swing.ts  a booted Jolt and a list of SwingCases (release, friction)');
  console.log('  The last two boot the physics kernel; the first three need the generative loop. Both are real work,');
  console.log('  not a missing import, and neither is pretended here.');
  console.log('');
  console.log('SUBSTRATE: the engine\u2019s own parts');
  process.exit(0);
}

// `npm run substrate -- know <part> [quantity …]` — THE ONE HIERARCHY, ASKED.
//
// A part decomposes into sub-parts down to a material; a quantity decomposes into the quantities its law needs down
// to a measurement. The same shape, meeting at time. Nothing is computed until it is asked for here.
if (want[0] === 'know') {
  const { know, clashes, onTimesTree, packet } = await import('../substrate/derive');
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
  const pk = packet(thing);
  if (pk) {
    console.log('');
    console.log('ITS PACKET \u2014 everything attached, nothing computed until asked');
    for (const l of pk.says) console.log(`  ${l}`);
    console.log(`  made with: ${pk.given.map((g) => `${g.quantity} = ${g.value.toPrecision(4)} ${g.unit}`).join(' \u00B7 ')}`);
    for (const q of asked) pk.at(q);
    console.log('  what it is, on the one tree:');
    for (const b of pk.byTime()) console.log(`    time^${String(b.power).padEnd(4)} ${b.facts.map((f) => `${f.quantity} = ${f.value.toPrecision(4)} ${f.unit}`).join(' \u00B7 ')}`);
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
