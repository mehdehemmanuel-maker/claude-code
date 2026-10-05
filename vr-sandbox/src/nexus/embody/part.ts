// A part as it is made: a primitive shape of a matter, at a place, with every value that decided it and the law it
// came from; an assembly is parts designed together in their own frame and then placed. Shapes are the few a shop
// makes from stock or can describe exactly: a block, a round bar or a tube, a screw, a nut, a washer, a run of wire.
// Every length is in metres.

export type V3 = [number, number, number];
export type Axis = 'x' | 'y' | 'z';

export type Shape =
  | { kind: 'block'; size: V3 }
  | { kind: 'round'; r: number; length: number; axis: Axis; bore?: number }
  | { kind: 'screw'; size: string; length: number; axis: Axis; head: 1 | -1 }
  | { kind: 'nut'; size: string; axis: Axis }
  | { kind: 'wire'; points: V3[]; r: number };

/** A value with the law it came from: what decided it, and how. */
export interface Value { name: string; value: number; unit: string; law: string }

export interface Part {
  id: string;
  name: string;
  /** Its place in the taxonomy, domain / category / subcategory. */
  category: string;
  material: string;
  shape: Shape;
  at: V3;
  mass: number;
  colour?: number;
  values: Value[];
  /** The subsystem of its assembly it was designed as part of: a motor's rotor, an axis's drive, a head's melt zone. */
  system?: string;
  /** What it moves with: an axis it rides on. */
  rides?: string;
  /** The assembly it was designed in, where its id does not say it (any machine's: a wheel, a wall, the roof). */
  unit?: string;
  /** A turn about one of its own frame's axes, radians (a magnet on a rotor, a tooth on a stator). */
  turn?: { axis: Axis; angle: number };
  /** A fastener: the parts it passes into, where its shank lies by design. */
  into?: string[];
}

export interface Assembly { id: string; name: string; category: string; from: string | null; parts: Part[]; values: Value[] }

/** A flaw a check found: what law was broken, by how much, and what remedy the rules hold for it. */
export interface Flaw { check: string; where: string; says: string; law: string; value: number; limit: number; remedy: string | null; /** The parts it lies in, where a check can name them. */ parts?: string[] }

const vol = (s: Shape): number => {
  switch (s.kind) {
    case 'block': return s.size[0] * s.size[1] * s.size[2];
    case 'round': return Math.PI * (s.r ** 2 - (s.bore ?? 0) ** 2 / 4) * s.length;
    case 'wire': { let L = 0; for (let i = 1; i < s.points.length; i++) L += Math.hypot(...([0, 1, 2].map((k) => s.points[i]![k]! - s.points[i - 1]![k]!) as V3)); return Math.PI * s.r ** 2 * L; }
    default: return 0;
  }
};
/** A part of a matter's density, its mass from its shape. */
export function part(p: Omit<Part, 'mass'> & { mass?: number }, density: number): Part {
  return { ...p, mass: p.mass ?? vol(p.shape) * density };
}

type M3 = [V3, V3, V3];
/** Where each of an assembly's own axes goes when its +z is turned to point along a world axis. */
const BASE: Record<`${'' | '-'}${Axis}`, M3> = {
  z: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], '-z': [[-1, 0, 0], [0, 1, 0], [0, 0, -1]],
  x: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], '-x': [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  y: [[1, 0, 0], [0, 0, 1], [0, -1, 0]], '-y': [[1, 0, 0], [0, 0, -1], [0, 1, 0]],
};
const apply = (m: M3, v: V3): V3 => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]) as V3;
const mul = (a: M3, b: M3): M3 => a.map((r) => [0, 1, 2].map((j) => r[0] * b[0]![j]! + r[1] * b[1]![j]! + r[2] * b[2]![j]!)) as M3;
/** A quarter turn `q` times about a world axis, right-handed. */
function roll(axis: Axis, q: number): M3 {
  const t = (((q % 4) + 4) % 4) * (Math.PI / 2), c = Math.round(Math.cos(t)), s = Math.round(Math.sin(t));
  if (axis === 'x') return [[1, 0, 0], [0, c, -s], [0, s, c]];
  if (axis === 'y') return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
  return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}
const unit = (a: Axis): V3 => (a === 'x' ? [1, 0, 0] : a === 'y' ? [0, 1, 0] : [0, 0, 1]);

/**
 * Turn an assembly's frame so its +z points along `to` (one of ±x, ±y, ±z), then roll it `q` quarter turns about that
 * world axis (so its own +y, where a carriage faces and opposite where it mounts, can face any side), and move it by `by`.
 */
export function placeParts(parts: Part[], to: `${'' | '-'}${Axis}`, by: V3, q = 0): Part[] {
  const m = mul(roll(to.replace('-', '') as Axis, q), BASE[to]);
  const axisOf = (a: Axis): { axis: Axis; sign: 1 | -1 } => { const w = apply(m, unit(a)); const i = w.findIndex((x) => Math.abs(x) > 0.5); return { axis: (['x', 'y', 'z'] as const)[i]!, sign: w[i]! < 0 ? -1 : 1 }; };
  return parts.map((p) => {
    const at = apply(m, p.at).map((x, i) => x + by[i]!) as V3;
    let shape: Shape = p.shape;
    if (shape.kind === 'block') shape = { ...shape, size: apply(m, shape.size).map(Math.abs) as V3 };
    else if (shape.kind === 'round' || shape.kind === 'nut') shape = { ...shape, axis: axisOf(shape.axis).axis };
    else if (shape.kind === 'screw') { const a = axisOf(shape.axis); shape = { ...shape, axis: a.axis, head: (shape.head * a.sign) as 1 | -1 }; }
    else if (shape.kind === 'wire') shape = { ...shape, points: shape.points.map((v) => apply(m, v).map((x, i) => x + by[i]!) as V3) };
    const turn = p.turn ? (() => { const a = axisOf(p.turn.axis); return { axis: a.axis, angle: p.turn.angle * a.sign }; })() : undefined;
    return { ...p, at, shape, ...(turn ? { turn } : {}) };
  });
}

/** The box a set of parts fills: its low and high corners. */
export function extentOf(parts: Part[]): { lo: V3; hi: V3 } {
  const lo: V3 = [Infinity, Infinity, Infinity], hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    if (p.shape.kind === 'wire') { for (const q of p.shape.points) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, q[k]!); hi[k] = Math.max(hi[k]!, q[k]!); } continue; }
    const b = boxOf(p);
    for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, b.c[k]! - b.h[k]!); hi[k] = Math.max(hi[k]!, b.c[k]! + b.h[k]!); }
  }
  return { lo, hi };
}

/** The box a part fills, for interference: its centre and half-sizes. */
export function boxOf(p: Part): { c: V3; h: V3 } {
  const s = p.shape;
  if (s.kind === 'block') return { c: p.at, h: [s.size[0] / 2, s.size[1] / 2, s.size[2] / 2] };
  if (s.kind === 'round') { const h: V3 = [s.r, s.r, s.r]; h[s.axis === 'x' ? 0 : s.axis === 'y' ? 1 : 2] = s.length / 2; return { c: p.at, h }; }
  if (s.kind === 'screw') {
    // the shank and its head (ISO 4762: 1.5 d across, d high), the head at the end `head` names
    const d = Number(s.size.replace('M', '').replace('_', '.')) * 1e-3, k = s.axis === 'x' ? 0 : s.axis === 'y' ? 1 : 2;
    const h: V3 = [0.75 * d, 0.75 * d, 0.75 * d]; h[k] = (s.length + d) / 2;
    const c = [...p.at] as V3; c[k] = c[k]! + (s.head * d) / 2;
    return { c, h };
  }
  return { c: p.at, h: [0, 0, 0] };
}
