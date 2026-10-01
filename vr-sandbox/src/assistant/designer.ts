// Ego designs. You say what you want ("a table that holds 80 kg", "a crate", "a brick wall 2 m long") and she works it
// out the way an engineer would: stock from standard sizes, each member checked against the load it will carry
// (legs for crushing and buckling, tops and shelves for bending and sag), with a safety factor. What comes out is
// Forge (the build language), so it builds through the same commands as everything else and can be read or changed.

import { getMaterial, STANDARD_GRAVITY as g, type Material } from '../data/materials';
import { LUMBER } from '../parts/registry';

export type Design = 'table' | 'crate' | 'shelf' | 'wall' | 'tower' | 'bench';

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

export interface Plan {
  forge: string;
  /** What she decided, and why, in a few lines. */
  notes: string[];
  parts: number;
}

/** Safety factor on every check, as for furniture and light structures. */
const SAFETY = 3;
const SAG = 1 / 300;

const isWood = (m: Material) => m.category === 'wood' || m.category === 'engineered-wood';
const isMetal = (m: Material) => ['steel', 'stainless', 'aluminum', 'titanium', 'copper-alloy', 'cast-iron'].includes(m.category);
const f = (x: number) => String(+x.toFixed(4));
const mm = (x: number) => `${Math.round(x * 1000)} mm`;

/** Wood crushes along the grain at about half its bending strength (estimated); metals at yield. */
const crushing = (m: Material) => (isWood(m) ? 0.5 * m.ultimate : m.yield);

/** The thinnest standard sheet that carries `w` N spread over a span `L` (m) of width `b` without breaking or sagging. */
function sheetFor(m: Material, L: number, b: number, w: number, options: number[]) {
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
function legFor(m: Material, L: number, P: number) {
  const K = 2; // a leg fixed at the top and free to sway there buckles as a cantilever
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

function sheets(m: Material) {
  return m.category === 'engineered-wood' ? PLY_SHEETS : isWood(m) ? WOOD_SHEETS : isMetal(m) ? METAL_SHEETS : STONE_SHEETS;
}

/** A design for what was asked, placed with its footprint centred on (ox, oz) on the floor. */
export function design(spec: DesignSpec, ox: number, oz: number, tag = 'd'): Plan {
  switch (spec.what) {
    case 'table': case 'bench': return table(spec, ox, oz, tag);
    case 'crate': return crate(spec, ox, oz, tag);
    case 'shelf': return shelf(spec, ox, oz, tag);
    case 'wall': return wall(spec, ox, oz, tag);
    case 'tower': return tower(spec, ox, oz, tag);
  }
}

function table(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const bench = spec.what === 'bench';
  const W = spec.width ?? (bench ? 1.2 : 1.2), D = spec.depth ?? (bench ? 0.35 : 0.7), H = spec.height ?? (bench ? 0.45 : 0.75);
  const load = spec.load ?? (bench ? 150 : 50);
  const topM = getMaterial(spec.material ?? 'wood.douglas-fir');
  const legM = isWood(topM) || isMetal(topM) ? topM : getMaterial('steel.a36');
  const top = sheetFor(topM, W, D, load * g, sheets(topM));
  const topMass = topM.density * W * D * top.t;
  const legL = H - top.t;
  const leg = legFor(legM, legL, ((load + topMass) * g) / 4);
  const inset = leg.wide / 2 + 0.01;
  const lines = [
    `place plate length=${f(W)} width=${f(D)} thickness=${f(top.t)} mat ${topM.id} at ${f(ox)} ${f(H - top.t / 2 + 0.0005)} ${f(oz)} as ${tag}top`,
  ];
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  corners.forEach(([sx, sz], i) => {
    const x = ox + sx * (W / 2 - inset), z = oz + sz * (D / 2 - inset);
    lines.push(`place ${leg.kind} ${leg.params} length=${f(legL)} mat ${legM.id} at ${f(x)} ${f(legL / 2)} ${f(z)} rot z 90 as ${tag}leg${i}`);
    lines.push(`join ${tag}leg${i} ${tag}top`);
  });
  // aprons: a rail between each pair of legs, on edge, tight under the top, joined to both legs and to the top.
  // Stood up, a leg's section lies along x (its thickness) and z (its width).
  const apron = spec.aprons ? apronFor(legM, leg) : null;
  if (apron) {
    const lx = leg.side / 2, lz = leg.wide / 2;
    const yc = legL - apron.h / 2 - 0.0005;
    const spanX = 2 * (W / 2 - inset - lx) - 0.001, spanZ = 2 * (D / 2 - inset - lz) - 0.001;
    const rails: [string, number, number, number, string, number, number][] = [
      // name, length, x, z, rotation, legs it runs between
      ['apronF', spanX, ox, oz - (D / 2 - inset), 'rot x 90', 0, 1],
      ['apronB', spanX, ox, oz + (D / 2 - inset), 'rot x 90', 3, 2],
      ['apronL', spanZ, ox - (W / 2 - inset), oz, 'rot x 90 rot y 90', 0, 3],
      ['apronR', spanZ, ox + (W / 2 - inset), oz, 'rot x 90 rot y 90', 1, 2],
    ];
    for (const [name, L, x, z, rot, a, b] of rails) {
      lines.push(`place ${apron.kind} ${apron.params} length=${f(L)} mat ${legM.id} at ${f(x)} ${f(yc)} ${f(z)} ${rot} as ${tag}${name}`);
      lines.push(`join ${tag}${name} ${tag}leg${a}`, `join ${tag}${name} ${tag}leg${b}`, `join ${tag}${name} ${tag}top`);
    }
  }
  return {
    forge: lines.join('\n'),
    notes: [
      `${bench ? 'Bench' : 'Table'} ${mm(W)} × ${mm(D)}, ${mm(H)} high, for ${load} kg.`,
      `Top: ${mm(top.t)} ${topM.name}${Number.isFinite(top.stress) ? `, stress ${(top.stress / 1e6).toFixed(1)} MPa at full load (${SAFETY}× under its strength), sag ${(top.sag * 1000).toFixed(1)} mm` : ' (the thickest standard sheet: it will be highly stressed)'}.`,
      `Legs: ${leg.label} in ${legM.name}, sized so none crushes or buckles at ${SAFETY}× its share of the load.`,
      ...(apron ? [`Aprons: ${apron.label} rails between the legs under the top, so it doesn't rack when pushed sideways.`] : []),
      'Joints: Best join, sized to the stock.',
    ],
    parts: apron ? 9 : 5,
  };
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

function crate(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const W = spec.width ?? 0.5, D = spec.depth ?? 0.4, H = spec.height ?? 0.35;
  const m = getMaterial(spec.material ?? 'wood.birch-plywood');
  const t = isWood(m) ? 0.012 : isMetal(m) ? 0.002 : 0.02;
  const wallH = H - t;
  const lines = [
    `place plate length=${f(W)} width=${f(D)} thickness=${f(t)} mat ${m.id} at ${f(ox)} ${f(t / 2)} ${f(oz)} as ${tag}bottom`,
    // front and back: full width, standing on the bottom
    `place plate length=${f(W)} width=${f(wallH)} thickness=${f(t)} mat ${m.id} at ${f(ox)} ${f(t + wallH / 2 + 0.0005)} ${f(oz - D / 2 + t / 2)} rot x 90 as ${tag}front`,
    `place plate length=${f(W)} width=${f(wallH)} thickness=${f(t)} mat ${m.id} at ${f(ox)} ${f(t + wallH / 2 + 0.0005)} ${f(oz + D / 2 - t / 2)} rot x 90 as ${tag}back`,
    // the sides fit between them
    `place plate length=${f(wallH)} width=${f(D - 2 * t)} thickness=${f(t)} mat ${m.id} at ${f(ox - W / 2 + t / 2)} ${f(t + wallH / 2 + 0.0005)} ${f(oz)} rot z 90 as ${tag}left`,
    `place plate length=${f(wallH)} width=${f(D - 2 * t)} thickness=${f(t)} mat ${m.id} at ${f(ox + W / 2 - t / 2)} ${f(t + wallH / 2 + 0.0005)} ${f(oz)} rot z 90 as ${tag}right`,
  ];
  for (const w of ['front', 'back', 'left', 'right']) lines.push(`join ${tag}${w} ${tag}bottom`);
  for (const s of ['left', 'right']) for (const e of ['front', 'back']) lines.push(`join ${tag}${s} ${tag}${e}`);
  return { forge: lines.join('\n'), notes: [`Crate ${mm(W)} × ${mm(D)} × ${mm(H)} in ${mm(t)} ${m.name}: a bottom, four walls, every edge joined.`], parts: 5 };
}

function shelf(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const W = spec.width ?? 0.8, D = spec.depth ?? 0.3, H = spec.height ?? 1.2;
  const n = Math.max(2, Math.min(8, spec.count ?? 4));
  const load = spec.load ?? 20;
  const m = getMaterial(spec.material ?? 'wood.birch-plywood');
  const side = isWood(m) ? 0.018 : isMetal(m) ? 0.003 : 0.02;
  const span = W - 2 * side;
  const board = sheetFor(m, span, D, load * g, sheets(m));
  const lines = [
    `place plate length=${f(H)} width=${f(D)} thickness=${f(side)} mat ${m.id} at ${f(ox - W / 2 + side / 2)} ${f(H / 2)} ${f(oz)} rot z 90 as ${tag}sideL`,
    `place plate length=${f(H)} width=${f(D)} thickness=${f(side)} mat ${m.id} at ${f(ox + W / 2 - side / 2)} ${f(H / 2)} ${f(oz)} rot z 90 as ${tag}sideR`,
  ];
  for (let k = 0; k < n; k++) {
    const y = board.t / 2 + (k * (H - board.t)) / (n - 1);
    lines.push(`place plate length=${f(span)} width=${f(D)} thickness=${f(board.t)} mat ${m.id} at ${f(ox)} ${f(y)} ${f(oz)} as ${tag}shelf${k}`);
    lines.push(`join ${tag}shelf${k} ${tag}sideL`, `join ${tag}shelf${k} ${tag}sideR`);
  }
  return { forge: lines.join('\n'), notes: [`Shelf unit ${mm(W)} wide, ${mm(H)} high, ${n} shelves of ${mm(board.t)} ${m.name}, each for ${load} kg (${SAFETY}× margin, sag under ${mm(span * SAG)}).`], parts: n + 2 };
}

function wall(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const m = getMaterial(spec.material ?? 'ceramic.clay-brick');
  const [bx, by, bz] = [0.215, 0.065, 0.1025];
  const L = spec.width ?? 1.0, H = spec.height ?? 0.5;
  const cols = Math.max(1, Math.round(L / bx)), rows = Math.max(1, Math.min(20, Math.round(H / by)));
  const lines: string[] = [];
  const at = (r: number, c: number) => `${tag}r${r}c${c}`;
  const count = (r: number) => (r % 2 ? cols - 1 : cols);
  for (let r = 0; r < rows; r++) {
    // running bond: every other course set over by half a brick
    const off = r % 2 ? bx / 2 : 0;
    for (let c = 0; c < count(r); c++) {
      const x = ox - (cols * bx) / 2 + bx / 2 + off + c * bx;
      lines.push(`place block x=${f(bx)} y=${f(by)} z=${f(bz)} mat ${m.id} at ${f(x)} ${f(by / 2 + r * by + r * 0.0005)} ${f(oz)} as ${at(r, c)}`);
      if (r === 0) continue;
      // bedded on the one or two bricks under it
      const below = r % 2 ? [c, c + 1] : [c - 1, c];
      for (const b of below) if (b >= 0 && b < count(r - 1)) lines.push(`join ${at(r, c)} ${at(r - 1, b)}`);
    }
  }
  const n = lines.filter((l) => l.startsWith('place')).length;
  return { forge: lines.join('\n'), notes: [`Wall ${cols} bricks long and ${rows} courses high (${n} bricks) in running bond, each bedded in mortar on the course below.`], parts: n };
}

function tower(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const n = Math.max(2, Math.min(30, spec.count ?? 6));
  const m = getMaterial(spec.material ?? 'wood.douglas-fir');
  const s = 0.1;
  const lines: string[] = [];
  for (let k = 0; k < n; k++) {
    lines.push(`place block x=${s} y=${s} z=${s} mat ${m.id} at ${f(ox)} ${f(s / 2 + k * (s + 0.0005))} ${f(oz)} as ${tag}b${k}`);
    if (k) lines.push(`join ${tag}b${k} ${tag}b${k - 1}`);
  }
  return { forge: lines.join('\n'), notes: [`A tower of ${n} ${m.name} blocks, each joined to the one below.`], parts: n };
}
