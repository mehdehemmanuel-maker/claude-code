// Ego designs. You say what you want ("a table that holds 80 kg", "a crate", "a brick wall 2 m long") and she works it
// out the way an engineer would: stock from standard sizes, each member checked against the load it will carry
// (legs for crushing and buckling, tops and shelves for bending and sag), with a safety factor. What comes out is
// Forge (the build language), so it builds through the same commands as everything else and can be read or changed.

import { getMaterial, STANDARD_GRAVITY as g, type Material } from '../data/materials';
import { LUMBER } from '../parts/registry';
import { structure } from './grammar';
import { defaultOf, type Env } from '../construct/laws';
import { Builder, FLOOR, toForge, rolesOf, type Role, type Structured } from '../construct/assembly';

/** What she designs: the five originals, and the structures the grammar composes from function and constraints (grammar.ts). */
export type Design = 'table' | 'crate' | 'shelf' | 'wall' | 'tower' | 'bench' | 'bridge' | 'frame' | 'stand' | 'ramp' | 'ladder' | 'chair';

export interface DesignSpec {
  what: Design;
  /** Overall sizes, m (what isn't given takes a sensible default for the thing). */
  width?: number;
  depth?: number;
  height?: number;
  /** What it must carry, kg (on the top, or on each shelf). */
  load?: number;
  /** A material id for the main parts. */
  material?: string;
  count?: number;
  /** A table's aprons: rails between the legs under the top, which stop it racking when pushed sideways. */
  aprons?: boolean;
}

/**
 * The sizes and load a design takes when they are not said, m and kg: derived from the person it is for by the
 * construction law scale.person (construct/laws.ts), and from what it carries, so a revision can scale a size that was
 * never said and no generator holds a number of its own. What is not a person's measure is an estimate, and says so.
 */
const person = { kinds: ['artefact'], roles: [], flows: [], materials: [], forPerson: true };
const P = (key: string) => defaultOf(person, key)!;
/** Estimates of what things carry, kg: things on a table, books on a shelf (labelled estimates). */
const ESTIMATE = { onATable: 50, perShelf: 20, onAStand: 30, onAFrame: 50 };
export const DEFAULTS: Record<Design, { width: number; depth: number; height: number; load: number }> = {
  table: { width: 2 * P('place at a table'), depth: P('work surface depth'), height: P('work surface height'), load: ESTIMATE.onATable },
  bench: { width: 2 * P('place at a table'), depth: P('seat depth'), height: P('seat height'), load: 2 * P('person') },
  crate: { width: 0.5, depth: 0.4, height: 0.35, load: 0 },
  shelf: { width: 0.8, depth: 0.3, height: P('reach height'), load: ESTIMATE.perShelf },
  wall: { width: 1, depth: 0.1025, height: 0.5, load: 0 },
  tower: { width: 0.1, depth: 0.1, height: 0.6, load: 0 },
  bridge: { width: 2, depth: P('passage width'), height: 0.5, load: P('person') },
  frame: { width: 1, depth: 0.6, height: 0.8, load: ESTIMATE.onAFrame },
  stand: { width: 0.5, depth: 0.5, height: P('standing surface height'), load: ESTIMATE.onAStand },
  ramp: { width: 2, depth: P('passage width') + 0.2, height: 0.4, load: P('person') },
  ladder: { width: P('seat width'), depth: P('seat width'), height: 1.8, load: P('person') },
  chair: { width: P('seat width'), depth: P('seat depth'), height: P('seat height'), load: P('person') },
};
/** A design's size along one axis: as said, or its default. */
export const sizeOf = (spec: DesignSpec, dim: 'width' | 'depth' | 'height'): number => spec[dim] ?? DEFAULTS[spec.what][dim];

export interface Plan {
  forge: string;
  /** The laws of the book its checks instantiate (a derivation record: what the design rests on, by id). */
  laws: string[];
  /** What she decided, and why, in a few lines. */
  notes: string[];
  parts: number;
  /** Every member's role, by its part name: what the stand loads and pushes by (construct/laws.ts mechanical.load-case). */
  roles: Record<string, Role>;
}

/** Safety factor on every check, as for furniture and light structures. */
export const SAFETY = 3;
export const SAG = 1 / 300;

export const isWood = (m: Material) => m.category === 'wood' || m.category === 'engineered-wood';
export const isMetal = (m: Material) => ['steel', 'stainless', 'aluminum', 'titanium', 'copper-alloy', 'cast-iron'].includes(m.category);
export const f = (x: number) => String(+x.toFixed(4));
export const mm = (x: number) => `${Math.round(x * 1000)} mm`;

/** Wood crushes along the grain at about half its bending strength (estimated); metals at yield. */
const crushing = (m: Material) => (isWood(m) ? 0.5 * m.ultimate : m.yield);

/** The thinnest standard sheet that carries `w` N spread over a span `L` (m) of width `b` without breaking or sagging. */
export function sheetFor(m: Material, L: number, b: number, w: number, options: number[]) {
  for (const t of options) {
    const self = m.density * g * L * b * t;
    const M = ((w + self) * L) / 8;
    const S = (b * t * t) / 6, I = (b * t ** 3) / 12;
    const stress = M / S, sag = (5 * (w + self) * L ** 3) / (384 * m.E * I);
    if (stress * SAFETY <= m.ultimate && sag <= L * SAG) return { t, stress, sag };
  }
  const t = options[options.length - 1]!;
  return { t, stress: NaN, sag: NaN };
}

/** Legs: the smallest standard section that neither crushes nor buckles under P (N) over length L, free to sway at the top. */
export function legFor(m: Material, L: number, P: number, K = 2) {
  // K: the buckling length factor (construct/laws.ts mechanical.end-fixity): 2 free to sway at the top, 1 braced
  if (isWood(m)) {
    for (const size of ['2x2', '2x4', '4x4']) {
      const [a, b] = LUMBER[size]!;
      const A = a * b, I = (Math.max(a, b) * Math.min(a, b) ** 3) / 12;
      const Pcr = (Math.PI ** 2 * m.E * I) / (K * L) ** 2;
      if (P * SAFETY <= A * crushing(m) && P * SAFETY <= Pcr) return { kind: 'lumber', params: `size=${size}`, side: Math.min(a, b), wide: Math.max(a, b), label: `${size} lumber` };
    }
    return { kind: 'lumber', params: 'size=4x4', side: LUMBER['4x4']![0], wide: LUMBER['4x4']![1], label: '4x4 lumber (at its limit)' };
  }
  for (const side of [0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08]) {
    const wall = Math.max(0.0015, side / 16);
    const A = side ** 2 - (side - 2 * wall) ** 2, I = (side ** 4 - (side - 2 * wall) ** 4) / 12;
    const Pcr = (Math.PI ** 2 * m.E * I) / (K * L) ** 2;
    if (P * SAFETY <= A * crushing(m) && P * SAFETY <= Pcr) return { kind: 'tube.square', params: `side=${f(side)} wall=${f(wall)}`, side, wide: side, label: `${mm(side)} square tube, ${f(wall * 1000)} mm wall` };
  }
  return { kind: 'tube.square', params: 'side=0.08 wall=0.005', side: 0.08, wide: 0.08, label: '80 mm square tube (at its limit)' };
}

/** Solid wood tops and shelves as they can be made: glued from 1x or 2x boards and flattened (assistant/buildsheet.ts). */
const WOOD_SHEETS = [0.018, 0.035, 0.054, 0.072];
const METAL_SHEETS = [0.002, 0.003, 0.005, 0.008, 0.01, 0.015];
const STONE_SHEETS = [0.02, 0.03, 0.04, 0.05];

/** Plywood and MDF as sold. */
const PLY_SHEETS = [0.012, 0.018, 0.025];

export function sheets(m: Material) {
  return m.category === 'engineered-wood' ? PLY_SHEETS : isWood(m) ? WOOD_SHEETS : isMetal(m) ? METAL_SHEETS : STONE_SHEETS;
}

/** A design for what was asked, placed with its footprint centred on (ox, oz) on the ground there (env.groundAt; the floor when unsaid). */
export function design(spec: DesignSpec, ox: number, oz: number, tag = 'd', env: Env = {}): Plan {
  const { assembly, laws, notes } = structured(spec, ox, oz, tag);
  return { forge: toForge(assembly, env), laws, notes, parts: assembly.members.length, roles: rolesOf(assembly) };
}

/** Every design as an assembly: members with roles, placed by relation (construct/assembly.ts). */
export function structured(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  switch (spec.what) {
    case 'table': case 'bench': return table(spec, ox, oz, tag);
    case 'crate': return crate(spec, ox, oz, tag);
    case 'shelf': return shelf(spec, ox, oz, tag);
    case 'wall': return wall(spec, ox, oz, tag);
    case 'tower': return tower(spec, ox, oz, tag);
    default: return structure(spec, ox, oz, tag);
  }
}


function table(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const bench = spec.what === 'bench';
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height');
  const load = spec.load ?? DEFAULTS[spec.what].load;
  const topM = getMaterial(spec.material ?? 'wood.douglas-fir');
  const legM = isWood(topM) || isMetal(topM) ? topM : getMaterial('steel.a36');
  const top = sheetFor(topM, W, D, load * g, sheets(topM));
  const topMass = topM.density * W * D * top.t;
  const legL = H - top.t;
  const leg = legFor(legM, legL, ((load + topMass) * g) / 4);
  const inset = leg.wide / 2 + 0.01;
  const a = new Builder(tag);
  // four legs stand at the corners, each on its own ground; the top rests on them; aprons span between each pair under it
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const legs = corners.map(([sx, sz], i) => a.post(`leg${i}`, leg, legM, ox + sx * (W / 2 - inset), oz + sz * (D / 2 - inset), legL));
  const t = a.on('top', 'plate', `length=${f(W)} width=${f(D)} thickness=${f(top.t)}`, topM, legs, 'carries');
  a.join(t, ...legs);
  const apron = spec.aprons ? apronFor(legM, leg) : null;
  if (apron) {
    for (const [name, i, j] of [['apronF', 0, 1], ['apronB', 3, 2], ['apronL', 0, 3], ['apronR', 1, 2]] as const) {
      a.join(a.rail(name, apron, legM, legs[i]!, legs[j]!, { under: t }), legs[i]!, legs[j]!, t);
    }
  }
  return a.done(['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'], [
    `${bench ? 'Bench' : 'Table'} ${mm(W)} × ${mm(D)}, ${mm(H)} high, for ${load} kg.`,
    `Top: ${mm(top.t)} ${topM.name}${Number.isFinite(top.stress) ? `, stress ${(top.stress / 1e6).toFixed(1)} MPa at full load (${SAFETY}× under its strength), sag ${(top.sag * 1000).toFixed(1)} mm` : ' (the thickest standard sheet: it will be highly stressed)'}.`,
    `Legs: ${leg.label} in ${legM.name}, sized so none crushes or buckles at ${SAFETY}× its share of the load.`,
    ...(apron ? [`Aprons: ${apron.label} rails between the legs under the top, so it doesn't rack when pushed sideways.`] : []),
    'Joints: Best join, sized to the stock.',
  ]);
}

/** Apron rails: wood tables take 1x4 on edge (2x4 for heavy legs), metal ones a flat bar of tube on edge. */
function apronFor(m: Material, leg: ReturnType<typeof legFor>) {
  if (leg.kind === 'lumber') {
    const size = leg.wide >= 0.089 ? '2x4' : '1x4';
    const [, w] = LUMBER[size]!;
    return { kind: 'lumber', params: `size=${size}`, h: w, label: `${size} lumber` };
  }
  const side = Math.min(leg.side, 0.04), wall = Math.max(0.0015, side / 16);
  return { kind: 'tube.square', params: `side=${f(side)} wall=${f(wall)}`, h: side, label: `${mm(side)} square tube` };
}

function crate(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height');
  const m = getMaterial(spec.material ?? 'wood.birch-plywood');
  const t = isWood(m) ? 0.012 : isMetal(m) ? 0.002 : 0.02;
  const wallH = H - t;
  const a = new Builder(tag);
  // a bottom on the floor; the front and back stand on it at its edges; the sides stand on it between them
  const bottom = a.on('bottom', 'plate', `length=${f(W)} width=${f(D)} thickness=${f(t)}`, m, [FLOOR], 'encloses', { offset: [ox, oz] });
  const front = a.on('front', 'plate', `length=${f(W)} width=${f(wallH)} thickness=${f(t)}`, m, [bottom], 'encloses', { offset: [0, -(D / 2 - t / 2)], rot: 'rot x 90' });
  const back = a.on('back', 'plate', `length=${f(W)} width=${f(wallH)} thickness=${f(t)}`, m, [bottom], 'encloses', { offset: [0, D / 2 - t / 2], rot: 'rot x 90' });
  const left = a.on('left', 'plate', `length=${f(wallH)} width=${f(D - 2 * t)} thickness=${f(t)}`, m, [bottom], 'encloses', { offset: [-(W / 2 - t / 2), 0], rot: 'rot z 90' });
  const right = a.on('right', 'plate', `length=${f(wallH)} width=${f(D - 2 * t)} thickness=${f(t)}`, m, [bottom], 'encloses', { offset: [W / 2 - t / 2, 0], rot: 'rot z 90' });
  for (const w of [front, back, left, right]) a.join(w, bottom);
  for (const side of [left, right]) a.join(side, front, back);
  return a.done(['stress.bending', 'beam.simply-supported.udl'], [`Crate ${mm(W)} × ${mm(D)} × ${mm(H)} in ${mm(t)} ${m.name}: a bottom, four walls, every edge joined.`]);
}

function shelf(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height');
  const n = Math.max(2, Math.min(8, spec.count ?? 4));
  const load = spec.load ?? DEFAULTS.shelf.load;
  const m = getMaterial(spec.material ?? 'wood.birch-plywood');
  const side = isWood(m) ? 0.018 : isMetal(m) ? 0.003 : 0.02;
  const span = W - 2 * side;
  const board = sheetFor(m, span, D, load * g, sheets(m));
  const a = new Builder(tag);
  // two sides stand on edge; the shelves span between them, the lowest on the ground, the highest flush with their tops
  const sides = ([['sideL', -1], ['sideR', 1]] as const).map(([name, sx]) => a.post(name, { kind: 'plate', params: `width=${f(D)} thickness=${f(side)}` }, m, ox + sx * (W / 2 - side / 2), oz, H));
  for (let k = 0; k < n; k++) {
    const at = k === n - 1 ? { flush: sides[0]! } : { height: board.t / 2 + (k * (H - board.t)) / (n - 1) };
    a.join(a.between(`shelf${k}`, 'plate', `width=${f(D)} thickness=${f(board.t)}`, m, sides[0]!, sides[1]!, at, 'carries'), ...sides);
  }
  return a.done(['stress.bending', 'beam.simply-supported.udl'], [`Shelf unit ${mm(W)} wide, ${mm(H)} high, ${n} shelves of ${mm(board.t)} ${m.name}, each for ${load} kg (${SAFETY}× margin, sag under ${mm(span * SAG)}).`]);
}

function wall(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const m = getMaterial(spec.material ?? 'ceramic.clay-brick');
  // a standard brick (BS EN 771-1 / BS 3921 work size): 215 × 102.5 × 65 mm
  const [bx, by, bz] = [0.215, 0.065, 0.1025];
  const L = sizeOf(spec, 'width'), H = sizeOf(spec, 'height');
  const cols = Math.max(1, Math.round(L / bx)), rows = Math.max(1, Math.min(20, Math.round(H / by)));
  const a = new Builder(tag);
  const at = (r: number, c: number) => `${tag}r${r}c${c}`;
  const count = (r: number) => (r % 2 ? cols - 1 : cols);
  const xOf = (r: number, c: number) => ox - (cols * bx) / 2 + bx / 2 + (r % 2 ? bx / 2 : 0) + c * bx;
  const brick = `x=${f(bx)} y=${f(by)} z=${f(bz)}`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < count(r); c++) {
    if (r === 0) { a.on(`r0c${c}`, 'block', brick, m, [FLOOR], 'stacks', { offset: [xOf(0, c), oz] }); continue; }
    // running bond: every other course set over by half a brick, each brick bedded on the one or two under it
    const below = (r % 2 ? [c, c + 1] : [c - 1, c]).filter((b) => b >= 0 && b < count(r - 1));
    const under = below.map((b) => at(r - 1, b));
    const mean = below.reduce((sum, b) => sum + xOf(r - 1, b), 0) / below.length;
    a.join(a.on(`r${r}c${c}`, 'block', brick, m, under, 'stacks', { offset: [xOf(r, c) - mean, 0] }), ...under);
  }
  const n = a.members.length;
  return a.done([], [`Wall ${cols} bricks long and ${rows} courses high (${n} bricks) in running bond, each bedded in mortar on the course below.`]);
}

function tower(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const n = Math.max(2, Math.min(30, spec.count ?? 6));
  const m = getMaterial(spec.material ?? 'wood.douglas-fir');
  const s = 0.1;
  const a = new Builder(tag);
  let below = a.on('b0', 'block', `x=${s} y=${s} z=${s}`, m, [FLOOR], 'stacks', { offset: [ox, oz] });
  for (let k = 1; k < n; k++) { const b = a.on(`b${k}`, 'block', `x=${s} y=${s} z=${s}`, m, [below], 'stacks'); a.join(b, below); below = b; }
  return a.done([], [`A tower of ${n} ${m.name} blocks, each joined to the one below.`]);
}
