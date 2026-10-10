// A text channel: contributions in as lines of plain data, the state's changes and gaps out as lines. It is the
// first measurement-and-projection channel (docs/NEXUS-FROM-REALITY.md, section 8): every field is explicit, so
// nothing is guessed from words. Each line in is one of:
//
//   {"give":    {"at": "place/quantity", "name": "...", "value": 1, "unit": "m", "by": "...", "grounds": "..."}}
//   {"measure": {"at": "...", "name": "...", "value": 1, "unit": "m", "by": "an instrument", "window": "...", "uncertainty": 0.001}}
//   {"law":     {"id": "a kept law's id", "out": "place/quantity", "ports": {"sym": "place/quantity"}}}
//   {"want":    {"at": "...", "most" | "least": {"name": "...", "value": 1, "unit": "m"}, "by": "...", "says": "..."}}
//   {"place":   {"id": "...", "centre": [x, y, z], "turn": [x, y, z, w], "half": [a, b, c], "by": "...", "grounds": "..."}}  (metres)
//   {"gravity": {"value": 9.80665, "direction": [0, -1, 0], "by": "an instrument"}}
//   {"held":    {"place": "...", "by": "who says the ground holds it"}}
//   {"withdraw":{"id": "...", "why": "..."}}
//   {"evolve": true}   the places not at rest, and all they can strike, stepped in the rigid-body kernel until still
//   {"scale": {"at": 1e-10, "T": 300}}   the regime at a size (metres) and a temperature (kelvin), as the tuner derives it
//   {"depth": {"heat" | "volts" | "speed": 1e5, "at": 1e-3, "T": 300, "for": 1, "tolerance": 0.01, "of": "water", "n": 1e25, "p": 1e5}}
//            how far down a process must be followed: what it takes apart, what it leaves whole, how long each level
//            lasts under it ("of": a matter in the kept species, whose own levels come first)
//   {"explain": {"value": 7850, "unit": "kg/m^3", "name": "...", "T": 300, "of": "Fe"}}   the level whose scale explains a quantity
//   {"copy": {"at": 1, "by": 1e-20, "T": 300}}   what a copy of the world at another scale would need of the constants
//   {"why": "place/quantity"}        {"gaps": true} (or "all")        {"state": true}

import { lawByHash, lawById } from '../book';
import type { Derivation } from './evaluate';
import type { Contribution } from './journal';
import { bound, instance, type Change, type Gap, type Runtime } from './runtime';
import { leaf } from './term';
import { GRAVITY, gravityAxis } from './place';
import { explain } from './why';
import { copyAt, regimeAt, type Regime } from './tuner';
import { descend, explain as explainByDepth, heat, motion, potential, type Descent, type Explanation } from './depth';
import { dimOf, sameDim } from './dimension';

const fmt = (v: number | null) => (v === null ? '–' : Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(4) : String(Number(v.toPrecision(6))));

/** One line in: a contribution, or a question of the state. */
export function read(line: string): { contribution: Contribution } | { contributions: Contribution[] } | { evolve: true } | { tune: Tune } | { ask: 'why'; at: string } | { ask: 'gaps'; all: boolean } | { ask: 'state' } {
  const m = JSON.parse(line) as Record<string, any>;
  if (m['give']) { const g = m['give']; return { contribution: { kind: 'leaf', at: g.at, leaf: leaf(g.name, g.value, g.unit, { class: 'given', by: g.by ?? 'the person', grounds: g.grounds ?? 'given on the text channel' }) } }; }
  if (m['measure']) { const g = m['measure']; return { contribution: { kind: 'leaf', at: g.at, leaf: leaf(g.name, g.value, g.unit, { class: 'measured', source: g.by, window: g.window ?? 'one reading' }, g.uncertainty) } }; }
  if (m['law']) { const g = m['law']; return { contribution: instance(lawById(g.id), g.out, g.ports) }; }
  if (m['want']) {
    const g = m['want'], side = g.most ? 'at most' : 'at least', b = g.most ?? g.least;
    return { contribution: bound(g.at, side, leaf(b.name, b.value, b.unit, { class: 'given', by: g.by ?? 'the person', grounds: g.says ?? 'wanted on the text channel' }), g.by ?? 'the person', g.says ?? `${g.at} ${side} ${b.value} ${b.unit}`) };
  }
  if (m['place']) {
    const g = m['place'], o = { class: 'given' as const, by: g.by ?? 'the person', grounds: g.grounds ?? 'placed on the text channel' };
    return { contribution: { kind: 'place', id: g.id, centre: g.centre.map((x: number, j: number) => leaf(`centre ${'xyz'[j]}`, x, 'm', o)), turn: g.turn.map((x: number, j: number) => leaf(`turn ${'xyzw'[j]}`, x, '1', o)), half: g.half.map((x: number, i: number) => leaf(`half-extent along axis ${i + 1}`, x, 'm', o)) } };
  }
  if (m['gravity']) {
    const g = m['gravity'], o = { class: 'measured' as const, source: g.by ?? 'standard gravity', window: g.window ?? 'as read' };
    return { contributions: [{ kind: 'leaf', at: GRAVITY, leaf: leaf('gravity', g.value, 'm/s^2', o) }, ...g.direction.map((x: number, j: number) => ({ kind: 'leaf' as const, at: gravityAxis(j), leaf: leaf(`direction of gravity ${'xyz'[j]}`, x, '1', o) }))] };
  }
  if (m['held']) return { contribution: { kind: 'held', place: m['held'].place, by: m['held'].by ?? 'the person' } };
  if (m['withdraw']) return { contribution: { kind: 'withdraw', id: m['withdraw'].id, why: m['withdraw'].why } };
  if (m['evolve']) return { evolve: true };
  if (m['scale']) return { tune: { scale: { L: m['scale'].at, T: m['scale'].T ?? null } } };
  if (m['depth']) return { tune: { depth: m['depth'] } };
  if (m['explain']) return { tune: { explain: m['explain'] } };
  if (m['copy']) return { tune: { copy: m['copy'] } };
  if (m['why']) return { ask: 'why', at: m['why'] };
  if (m['gaps']) return { ask: 'gaps', all: m['gaps'] === 'all' };
  if (m['state']) return { ask: 'state' };
  throw new Error(`not a line the channel reads: ${line}`);
}

/**
 * What a gap waits on, each address told apart by whether anything in the state could bind it. Where a relation
 * waits on one nothing holds or derives, it needs a reading or a given value. A contributed constraint that waits on
 * one may name nothing at all, so what its place does hold in the unit it is read in is shown beside it. A
 * generated constraint's addresses are the generator's own, and wait on the structure it generates.
 */
function waits(rt: Runtime | undefined, id: string, at: string[], named: boolean): string {
  return at.map((a) => {
    if (!rt || rt.derives(a) || (named && rt.generated(id))) return a;
    const unit = rt.unitRead(id, a), place = a.split('/')[0]!;
    const near = !named || !unit ? [] : rt.addresses().filter((x) => x !== a && x.split('/')[0] === place && sameDim(dimOf(rt.binding(x)!.unit), dimOf(unit)));
    return `${a} (nothing holds or derives it${near.length ? `; ${place} holds in ${unit}: ${near.join(', ')}` : ': it needs a reading or a given value'})`;
  }).join(', ');
}

export const showGap = (g: Gap, rt?: Runtime): string => {
  switch (g.kind) {
    case 'unbound': return `gap  ${g.at}: waits on ${waits(rt, g.relation, g.waitingOn, false)}`;
    case 'refused': return `gap  ${g.at}: refused, outside "${g.domain}"`;
    case 'invalid': return `gap  ${g.at}: cannot be evaluated: ${g.reason}`;
    case 'contradiction': return `gap  ${g.at}: ${g.between.join(' and ')} disagree`;
    case 'anomaly': return `gap  ${g.at}: measured ${fmt(g.measured.value)} where ${g.relation.slice(0, 8)} derives ${fmt(g.derived.value)} (error ${fmt(g.error)}, tolerance ${fmt(g.tolerance)})`;
    case 'unmet': return `gap  ${g.at.join(', ')}: unmet, "${g.says}" (${g.by})`;
    case 'undecided': return `gap  "${g.says}" (${g.by}): waits on ${waits(rt, g.constraint, g.waitingOn, true)}`;
    case 'cycle': return `gap  ${g.at}: a relation that closes a loop, held out: it needs solving, not propagation`;
  }
};

/** How a value came to be: a leaf's own class, or the law that derived it and the weakest class it rests on. */
const how = (d: Derivation) => (d.term.kind === 'leaf' ? d.status : `derived by ${d.law ? lawByHash(d.law)?.id ?? d.law : 'a definition'}, resting on ${d.status}`);

/**
 * Gaps in the order they matter: a constraint unmet or undecided first; then what disagrees with the evidence; then
 * each lack that bears on a constraint, with what it bears on. The lacks nothing waits on are counted by place, and
 * listed only when asked for all.
 */
export function showGaps(rt: Runtime, gaps: Gap[], all = false): string[] {
  const rank = (g: Gap) => (g.kind === 'unmet' ? 0 : g.kind === 'undecided' ? 1 : g.kind === 'anomaly' || g.kind === 'contradiction' ? 2 : 3);
  const out: string[] = [], idle = new Map<string, number>();
  for (const g of [...gaps].sort((a, b) => rank(a) - rank(b))) {
    const bears = rank(g) < 2 ? [] : rt.bearing(g);
    if (rank(g) < 3 || bears.length || all) out.push(showGap(g, rt) + (bears.length ? `  → bears on ${bears.map((b) => `"${b.says}"`).join(', ')}` : ''));
    else { const place = 'at' in g ? String(g.at).split('/')[0]! : ''; idle.set(place, (idle.get(place) ?? 0) + 1); }
  }
  if (idle.size) out.push(`     ${[...idle.values()].reduce((a, b) => a + b, 0)} more bear on no constraint (${[...idle].map(([p, n]) => `${p}: ${n}`).join('; ')}); {"gaps": "all"} lists them`);
  return out;
}

/** What a change projects: each address that changed with its value and how it came to be; then its gaps. */
export function project(rt: Runtime, c: Change): string[] {
  const out = c.changed.map((a) => { const d = rt.binding(a); return d ? `set  ${a} = ${fmt(d.value)} ${d.unit} [${how(d)}]` : `gone ${a}`; });
  out.push(`(${c.evaluated} evaluated)`);
  out.push(...showGaps(rt, c.gaps));
  return out;
}

export function answer(rt: Runtime, q: { ask: 'why'; at: string } | { ask: 'gaps'; all: boolean } | { ask: 'state' }): string[] {
  if (q.ask === 'why') { const n = rt.why(q.at); return n ? explain(n).split('\n').map((l) => l.replace(/law ([0-9a-f]{16})/g, (m, h: string) => { const law = lawByHash(h); return law ? `${law.id}: ${law.formula} (${law.source.cite})` : m; })) : [`nothing binds ${q.at}`]; }
  if (q.ask === 'gaps') { const gs = rt.gaps(); return gs.length ? showGaps(rt, gs, q.all) : ['no gaps']; }
  return rt.addresses().sort().map((a) => { const d = rt.binding(a)!; return `${a} = ${fmt(d.value)} ${d.unit} [${how(d)}]`; });
}

/** A regime as lines: what the state at that size must say, what dominates, its clocks, what changes near it, what observing it costs. */
export function showRegime(r: Regime): string[] {
  const eV = 1.602176634e-19, f = (x: number) => Number(x.toPrecision(3)).toExponential(2);
  const s = r.state, yes = (b: boolean | null, t: string, n: string) => (b === null ? `${t}: undecided` : b ? t : n);
  const acting = r.energies.filter((e) => e.f.kind !== 'rest').slice(0, 4);
  const thermal = r.times.filter((t) => t.tempExponent !== 0);
  return [
    `regime at ${f(r.L)} m${r.T === null ? '' : `, ${r.T} K`}${s.lawless ? ': below the length the constants set by themselves; no kept law holds there, and what follows is only what the laws would say if they did' : ''}`,
    `  state: ${[yes(s.bound, 'bound', 'free'), yes(s.quantum, 'quantum', 'classical'), s.relativistic ? 'particles are made and unmade' : 'particles are kept', yes(s.selfHeld, 'a body holds itself together', 'no body holds itself'), yes(s.crushed, 'gravity crushes its matter', 'its matter bears its gravity'), yes(s.collapses, 'it collapses within its own gravity', 'it stands outside its gravitational radius')].join('; ')}`,
    `  acting: ${acting.map((e) => `${e.f.text} = ${f(e.E / eV)} eV`).join(', ')}`,
    `  negligible: ${r.negligible.length} energies more than a hundredfold below the largest`,
    `  clocks: fastest ${r.times[0]!.of} = ${f(r.times[0]!.t)} s; slowest ${r.times.at(-1)!.of} = ${f(r.times.at(-1)!.t)} s; light crosses it in ${f(r.L / 299792458)} s`,
    `  with temperature: ${thermal.length ? thermal.slice(0, 3).map((t) => `${t.of} as T^${t.tempExponent.toFixed(2)}`).join(', ') : 'no clock moves'}; every other clock does not move`,
    `  near: ${r.near.length ? r.near.map((c) => `${c.boundary} at ${f(c.L.value!)} m`).join(', ') : 'no boundary within a decade'}`,
    `  structures: ${r.structures.length ? r.structures.map((x) => `settled at ${f(x.size.value!)} m, bound by ${f(x.binding.value! / eV)} eV`).join('; ') : 'none: nothing holds together at this temperature'}`,
    `  to resolve it: light of ${f(r.observer.byLight / eV)} eV or electrons of ${f(r.observer.byElectron / eV)} eV, ${r.observer.weakestBinding === null ? 'with no structure there to break' : `which ${r.observer.disturbs ? 'break' : 'leave whole'} the most fragile structure (${f(r.observer.weakestBinding / eV)} eV)`}`,
  ];
}

/** What the tuner is asked on the channel: a regime, a descent, an explanation by depth, a copy at another scale. */
export type Tune =
  | { scale: { L: number; T: number | null } }
  | { depth: { heat?: number; volts?: number; speed?: number; at?: number; T?: number; for?: number; tolerance?: number; of?: string; n?: number; p?: number } }
  | { explain: { value: number; unit: string; name?: string; T?: number; of?: string } }
  | { copy: { at?: number; by: number; T?: number } };

/** The tuner's answer to a line, as lines. */
export function tune(t: Tune): string[] {
  if ('scale' in t) return showRegime(regimeAt(t.scale.L, t.scale.T));
  if ('depth' in t) {
    const q = t.depth, time = q.for ?? null, at = q.at ?? null;
    const p = q.heat !== undefined ? heat(q.heat, time) : q.volts !== undefined ? potential(q.volts, time, at) : q.speed !== undefined ? motion(q.speed, time) : null;
    if (!p) return ['a descent needs a process: "heat" (kelvin), "volts" or "speed" (metres a second)'];
    const of = { ...(q.of ? { matter: q.of } : {}), ...(q.n !== undefined ? { n: q.n } : {}), ...(q.p !== undefined ? { p: q.p } : {}) };
    return showDescent(descend(p, { L: at, T: q.T ?? null, of, ...(q.tolerance !== undefined ? { tolerance: q.tolerance } : {}) }));
  }
  if ('explain' in t) return showExplanation(explainByDepth({ name: t.explain.name ?? `${t.explain.value} ${t.explain.unit}`, value: t.explain.value, unit: t.explain.unit }, t.explain.T ?? null, t.explain.of ? { matter: t.explain.of } : {}));
  const c = copyAt(t.copy.at ?? 1, t.copy.by, t.copy.T);
  const f = (x: number) => Number(x.toPrecision(3)).toExponential(2);
  return [
    `a copy of the world at ${f(t.copy.by)} times the size${c.possible ? '' : ': no assignment of the constants makes one'}`,
    ...(c.possible ? [`  it needs: ${c.needs.map((n) => (n.exponent === 0 ? `${n.key} as it is` : `${n.key} × ${f(n.factor)} (by^${n.exponent})`)).join(', ')}; ħ and light's speed held, as what length is measured in`,
      `  its clocks run at ${f(c.clocks)} times ours: everything in it lasts that much of what it lasts here`] : []),
    `  with the constants as measured, the world at that size is not a copy: it lies past ${c.passed.length} boundar${c.passed.length === 1 ? 'y' : 'ies'}${c.passed.length ? `: ${c.passed.slice(0, 8).map((x) => `${x.boundary} at ${f(x.L.value!)} m`).join(', ')}${c.passed.length > 8 ? ', …' : ''}` : ''}`,
  ];
}

/** A descent as lines: each level the process meets, what it does to it, and where it stops. */
export function showDescent(d: Descent): string[] {
  const eV = 1.602176634e-19, f = (x: number) => Number(x.toPrecision(3)).toExponential(2);
  const out = [`${d.says}, followed down (tolerance ${d.tolerance}):`];
  for (const s of d.steps) {
    const life = s.lifetimeDecades === null ? '' : s.changed >= 0.999 ? `; heat takes one unit apart every 10^${s.lifetimeDecades.toFixed(1)} s` : `; heat takes one unit apart every 10^${s.lifetimeDecades.toFixed(1)} s and it re-forms, so a share ${s.changed.toPrecision(2)} is apart at once`;
    out.push(`  ${s.level.what}: bound by ${f(s.level.binding / eV)} eV, its own clock ${f(s.level.clock)} s; given ${f(s.E / eV)} eV a unit${life}: ${s.verdict === 'whole' ? 'left whole' : s.verdict === 'resolved' ? 'resolved inside: faster than its clock' : Number.isNaN(s.changed) ? 'undecided' : `taken apart (${s.changed >= 0.999 ? 'all' : `a share ${s.changed.toPrecision(2)}`})`}`);
  }
  out.push(d.stop === 'sufficient' ? `  sufficient: ${d.at!.what} stays whole, so it enters as a unit, and nothing below it changes the outcome by more than the tolerance` : d.stop === 'refused' ? '  refused: no unit moves at or past light\'s speed' : `  gap (${d.gap!.kind}): ${d.gap!.says}`);
  if (d.up.length) out.push(`  above: ${d.up.map((c) => `${c.boundary} at ${f(c.L.value!)} m`).join(', ')}`);
  return out;
}

/** An explanation by depth as lines: the scale each level sets for the quantity, and where it stops. */
export function showExplanation(e: Explanation): string[] {
  const f = (x: number) => Number(x.toPrecision(3)).toExponential(2);
  const pw = Object.entries(e.powers).filter(([, x]) => x !== 0).map(([k, x]) => `${k}^${x}`).join(' ');
  return [
    `${e.ask.name} = ${e.ask.value} ${e.ask.unit}: the scale a level sets for it is ${pw}`,
    ...e.tried.map((t) => `  ${t.level.what}: ${f(t.predicted)}, the datum ${Math.abs(t.decades).toFixed(2)} decades ${t.decades < 0 ? 'below' : 'above'}`),
    e.stop === 'explained' ? `  explained at ${e.level!.what}, to the factor the dimensions cannot see` : `  gap (${e.gap!.kind}): ${e.gap!.says}`,
  ];
}
