// What Nexus generates, as one scene for a viewer to stand in (view/, docs/NEXUS-FROM-REALITY.md section 26). Nothing
// here is drawn or decided for the eye: every number is generated from nothing on the spot, by the same code the tests
// hold. The viewer only places what this returns in a room. Kept in a scene:
//
// - the ladder the scale tuner derives: its levels, every boundary between energies of one unit, and its reach;
// - descents: how far heat must follow a named matter down, and what it leaves whole;
// - the cold bodies electrons that cannot share a state hold up, with Chandrasekhar's mass and the largest cold body;
// - places in a room, before and after the rigid-body kernel evolves what cannot stay;
// - one intent the manifold drew for itself, generated: its regions, its elements and its gaps, as a graph.
//
//   npm run nexus:scene   writes view/public/world.json

import { branch, chandrasekharMass, coldBody } from './compact';
import { descend, heat, levelsAt } from './depth';
import { drawIntent, knownSpans } from './draw';
import { evolve } from './evolve';
import { generate } from './manifold';
import { GRAVITY, gravityAxis, placeAt } from './place';
import type { Jolt } from './realize';
import { MemorySink } from './journal';
import { Runtime } from './runtime';
import { ladderAt, reached0 } from './tuner';
import { leaf, type Leaf } from '../lang/term';

export interface World {
  made: string;
  ladder: { least: number; most: number; levels: { what: string; kind: string; size: number; binding: number }[]; boundaries: { kind: string; L: number; of: string }[] };
  descents: { matter: string; T: number; stop: string; at: string | null; gap: string | null; steps: { what: string; kind: string; verdict: string; share: number | null; lifetimeDecades: number | null }[] }[];
  bodies: { muE: number; of: string; branch: { M: number; R: number }[]; chandrasekhar: number; largest: { M: number; R: number } | null }[];
  places: { id: string; centre: number[]; turn: number[]; half: number[]; held: boolean; before: { centre: number[]; turn: number[] } | null }[];
  intent: { name: string; seed: number; says: string[]; nodes: { id: string; kind: string; label: string; p: [number, number, number] }[]; edges: [number, number][] };
}

const person = 'the scene';
const given = (name: string, v: number, unit: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds: 'placed in the room' });
const measured = (name: string, v: number, unit: string, source: string): Leaf => leaf(name, v, unit, { class: 'measured', source, window: 'one reading' });

/** A room: a floor the headset holds, two blocks and a board laid across them, the board's far support too far in. */
function room(): Runtime {
  const rt = Runtime.open(new MemorySink());
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: measured('gravity', 9.80665, 'm/s^2', 'standard gravity') });
  [0, -1, 0].forEach((x, j) => rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: measured(`direction of gravity ${'xyz'[j]}`, x, '1', "the headset's floor estimate") }));
  const box = (id: string, c: number[], h: number[], q = [0, 0, 0, 1]) => rt.admit({ kind: 'place', id, centre: c.map((x, j) => given(`centre ${'xyz'[j]}`, x, 'm')) as [Leaf, Leaf, Leaf], turn: q.map((x, j) => given(`turn ${'xyzw'[j]}`, x, '1')) as [Leaf, Leaf, Leaf, Leaf], half: h.map((x, i) => given(`half-extent ${i + 1}`, x, 'm')) as [Leaf, Leaf, Leaf] });
  box('the floor', [0, -0.05, 0], [5, 0.05, 5]);
  rt.admit({ kind: 'held', place: 'the floor', by: 'the headset: what it measured as the floor is the ground' });
  box('block A', [-0.4, 0.2, 0], [0.05, 0.2, 0.2]);
  box('block B', [0.4, 0.2, 0], [0.05, 0.2, 0.2]);
  box('a board', [0, 0.4 + 0.092, 0], [0.5, 0.092, 0.019]);
  // a second stack: a short block and a long board resting across it, overhanging far to one side
  box('block C', [1.4, 0.15, 0.6], [0.06, 0.15, 0.15]);
  box('a plank', [1.62, 0.3 + 0.012, 0.6], [0.4, 0.012, 0.1]);
  for (const p of ['block A', 'block B', 'a board', 'block C', 'a plank']) rt.admit({ kind: 'leaf', at: placeAt.density(p), leaf: measured('density of Douglas-fir', 530, 'kg/m^3', 'src/data/materials.ts (USDA Wood Handbook)') });
  return rt;
}

const read3 = (rt: Runtime, f: (j: number) => string, n: number) => Array.from({ length: n }, (_, j) => rt.binding(f(j))?.value ?? NaN);

/** Lay a graph out in a ball: a few hundred rounds of springs on the edges against repulsion between every pair, from a seeded start. */
function layout(n: number, edges: [number, number][], radius: number): [number, number, number][] {
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
  const p = Array.from({ length: n }, () => [rnd(), rnd(), rnd()] as [number, number, number]);
  for (let it = 0; it < 400; it++) {
    const f = p.map(() => [0, 0, 0]);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const d = [0, 1, 2].map((k) => p[i]![k]! - p[j]![k]!), r2 = d.reduce((a, x) => a + x * x, 1e-4);
      for (let k = 0; k < 3; k++) { f[i]![k]! += (0.01 * d[k]!) / r2; f[j]![k]! -= (0.01 * d[k]!) / r2; }
    }
    for (const [a, b] of edges) for (let k = 0; k < 3; k++) { const d = p[b]![k]! - p[a]![k]!; f[a]![k]! += 0.05 * d; f[b]![k]! -= 0.05 * d; }
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) p[i]![k]! += Math.max(-0.05, Math.min(0.05, f[i]![k]! - 0.01 * p[i]![k]!));
  }
  const far = Math.max(...p.map((q) => Math.hypot(...q)), 1e-9);
  return p.map((q) => q.map((x) => (x / far) * radius) as [number, number, number]);
}

export async function buildWorld(J: Jolt): Promise<World> {
  // the ladder at a room's temperature
  const T = 300, lad = ladderAt(T), r = reached0();
  const levels = levelsAt(T).map((lv) => ({ what: lv.what, kind: lv.kind, size: lv.size, binding: lv.binding }));
  const seen = new Set<string>();
  const boundaries = lad.levels.flatMap((l) => l.crossings).filter((c) => c.boundary !== 'crosses').filter((c) => { const k = `${c.boundary}@${c.L.value!.toPrecision(3)}`; if (seen.has(k)) return false; seen.add(k); return true; }).map((c) => ({ kind: c.boundary, L: c.L.value!, of: `${c.above.text} | ${c.below.text}` })).sort((a, b) => a.L - b.L);

  // descents through named matters at rising heat
  const descents: World['descents'] = [];
  for (const [matter, Ts] of [['water', [300, 400, 3000, 6000]], ['Fe', [300, 2000, 30000]], ['hydrogen', [1000, 5000, 20000]]] as const) for (const Tx of Ts) {
    const d = descend(heat(Tx), { of: { matter } });
    descents.push({ matter, T: Tx, stop: d.stop, at: d.at?.what ?? null, gap: d.gap?.says ?? null, steps: d.steps.map((s) => ({ what: s.level.what, kind: s.level.kind, verdict: s.verdict, share: Number.isNaN(s.changed) ? null : s.changed, lifetimeDecades: s.lifetimeDecades })) });
  }

  // cold bodies: the ladder's own matter (one nucleon to each electron) and matter with two to each
  const settled = levelsAt(null)[0]!, rho = settled.mass / settled.size ** 3;
  const bodies: World['bodies'] = [1, 2].map((muE) => {
    const cb = coldBody(1, muE, rho);
    return { muE, of: muE === 1 ? 'the settled matter: one nucleon to each electron' : 'two nucleons to each electron', branch: branch(muE).map((b) => ({ M: b.M, R: b.R })), chandrasekhar: chandrasekharMass(muE), largest: Number.isFinite(cb.largest) ? { M: cb.largestMass, R: cb.largest } : null };
  });

  // places, before and after the kernel evolves what cannot stay
  const rt = room();
  const ids = rt.placeIds();
  const before = Object.fromEntries(ids.map((id) => [id, { centre: read3(rt, (j) => placeAt.centre(id, j), 3), turn: read3(rt, (j) => placeAt.turn(id, j), 4) }]));
  const e = evolve(J, rt);
  for (const c of e.contributions) rt.admit(c);
  const movedIds = new Set(e.moved.map((m) => m.place));
  const places = ids.map((id) => ({ id, centre: read3(rt, (j) => placeAt.centre(id, j), 3), turn: read3(rt, (j) => placeAt.turn(id, j), 4), half: read3(rt, (j) => placeAt.half(id, j), 3), held: rt.isHeld(id), before: movedIds.has(id) ? before[id]! : null }));

  // one drawn intent, the richest of a few, generated from nothing
  const spans = knownSpans();
  const drawn = Array.from({ length: 24 }, (_, i) => drawIntent(5001 + i, 3, spans)).map((d) => ({ d, s: generate(d.intent) })).sort((a, b) => b.s.elements.length + b.s.gaps.length - (a.s.elements.length + a.s.gaps.length))[0]!;
  const nodes: World['intent']['nodes'] = [], at = new Map<string, number>();
  const node = (id: string, kind: string, label: string) => { if (!at.has(id)) { at.set(id, nodes.length); nodes.push({ id, kind, label, p: [0, 0, 0] }); } return at.get(id)!; };
  for (const reg of drawn.d.intent.regions) node(reg.id, reg.environment ? 'reservoir' : 'region', `${reg.id}${reg.constituent ? ` (${reg.constituent})` : ''}`);
  const edges: [number, number][] = [];
  for (const el of drawn.s.elements) {
    const i = node(el.id, el.kind, el.says.length > 70 ? `${el.says.slice(0, 68)}…` : el.says);
    for (const rid of el.regions) { const j = at.get(rid); if (j !== undefined) edges.push([i, j]); }
    if (el.why.parent && at.has(el.why.parent)) edges.push([i, at.get(el.why.parent)!]);
  }
  drawn.s.gaps.forEach((g, gi) => {
    const i = node(`gap ${gi}`, `gap:${g.kind ?? 'open'}`, g.lacks.length > 70 ? `${g.lacks.slice(0, 68)}…` : g.lacks);
    const j = (g.element ? at.get(g.element) : undefined) ?? at.get(drawn.d.intent.wants.find((w) => w.id === g.want)?.region ?? '');
    if (j !== undefined) edges.push([i, j]);
  });
  layout(nodes.length, edges, 0.7).forEach((p, i) => { nodes[i]!.p = p; });

  return {
    made: new Date().toISOString(),
    ladder: { least: r.least, most: r.most, levels, boundaries },
    descents, bodies, places,
    intent: { name: drawn.d.intent.name, seed: drawn.d.seed, says: drawn.d.intent.wants.map((w) => w.says), nodes, edges },
  };
}
