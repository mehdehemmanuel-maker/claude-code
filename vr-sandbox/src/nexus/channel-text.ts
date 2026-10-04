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
//   {"why": "place/quantity"}        {"gaps": true} (or "all")        {"state": true}

import { lawByHash, lawById } from './book';
import type { Derivation } from './evaluate';
import type { Contribution } from './journal';
import { bound, instance, type Change, type Gap, type Runtime } from './runtime';
import { leaf } from './term';
import { GRAVITY, gravityAxis } from './place';
import { explain } from './why';
import { dimOf, sameDim } from './dimension';

const fmt = (v: number | null) => (v === null ? '–' : Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(4) : String(Number(v.toPrecision(6))));

/** One line in: a contribution, or a question of the state. */
export function read(line: string): { contribution: Contribution } | { contributions: Contribution[] } | { evolve: true } | { ask: 'why'; at: string } | { ask: 'gaps'; all: boolean } | { ask: 'state' } {
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
