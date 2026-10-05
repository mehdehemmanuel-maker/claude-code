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
  /** What it moves with: an axis it rides on. */
  rides?: string;
  /** A turn about one of its own frame's axes, radians (a magnet on a rotor, a tooth on a stator). */
  turn?: { axis: Axis; angle: number };
}

export interface Assembly { id: string; name: string; category: string; from: string | null; parts: Part[]; values: Value[] }

/** A flaw a check found: what law was broken, by how much, and what remedy the rules hold for it. */
export interface Flaw { check: string; where: string; says: string; law: string; value: number; limit: number; remedy: string | null }

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

/** Turn an assembly's frame so its +z points along `to` (one of ±x, ±y, ±z) and move it by `by`. */
export function placeParts(parts: Part[], to: `${'' | '-'}${Axis}`, by: V3): Part[] {
  const map = (v: V3): V3 => {
    const [x, y, z] = v;
    switch (to) {
      case 'z': return [x, y, z]; case '-z': return [-x, y, -z];
      case 'x': return [z, y, -x]; case '-x': return [-z, y, x];
      case 'y': return [x, z, -y]; case '-y': return [x, -z, y];
    }
  };
  const axisMap = (a: Axis): Axis => { const v: V3 = a === 'x' ? [1, 0, 0] : a === 'y' ? [0, 1, 0] : [0, 0, 1]; const w = map(v).map(Math.abs); return w[0]! > 0.5 ? 'x' : w[1]! > 0.5 ? 'y' : 'z'; };
  return parts.map((p) => {
    const at = map(p.at).map((x, i) => x + by[i]!) as V3;
    let shape: Shape = p.shape;
    if (shape.kind === 'block') { const s = map(shape.size).map(Math.abs) as V3; shape = { ...shape, size: s }; }
    else if (shape.kind === 'round' || shape.kind === 'screw' || shape.kind === 'nut') {
      const flips = shape.kind === 'screw' ? (() => { const v: V3 = shape.axis === 'x' ? [1, 0, 0] : shape.axis === 'y' ? [0, 1, 0] : [0, 0, 1]; const m = map(v); return (m[0]! + m[1]! + m[2]!) < 0 ? -1 : 1; })() : 1;
      shape = shape.kind === 'screw' ? { ...shape, axis: axisMap(shape.axis), head: (shape.head * flips) as 1 | -1 } : { ...shape, axis: axisMap(shape.axis) };
    } else if (shape.kind === 'wire') shape = { ...shape, points: shape.points.map((q) => map(q).map((x, i) => x + by[i]!) as V3) };
    const turn = p.turn ? (() => { const v: V3 = p.turn.axis === 'x' ? [1, 0, 0] : p.turn.axis === 'y' ? [0, 1, 0] : [0, 0, 1]; const m = map(v); const sign = m[0]! + m[1]! + m[2]! < 0 ? -1 : 1; return { axis: axisMap(p.turn.axis), angle: p.turn.angle * sign }; })() : undefined;
    return { ...p, at, shape, ...(turn ? { turn } : {}) };
  });
}

/** The box a part fills, for interference: its centre and half-sizes. */
export function boxOf(p: Part): { c: V3; h: V3 } {
  const s = p.shape;
  if (s.kind === 'block') return { c: p.at, h: [s.size[0] / 2, s.size[1] / 2, s.size[2] / 2] };
  if (s.kind === 'round') { const h: V3 = [s.r, s.r, s.r]; h[s.axis === 'x' ? 0 : s.axis === 'y' ? 1 : 2] = s.length / 2; return { c: p.at, h }; }
  if (s.kind === 'screw') { const r = Number(s.size.replace('M', '').replace('_', '.')) / 2000; const h: V3 = [r, r, r]; h[s.axis === 'x' ? 0 : s.axis === 'y' ? 1 : 2] = s.length / 2; return { c: p.at, h }; }
  return { c: p.at, h: [0, 0, 0] };
}
