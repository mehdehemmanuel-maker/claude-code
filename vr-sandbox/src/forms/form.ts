// Ego's language of form. Flows, ways and blocks say what a thing does; a form says what shape it is. A form is a
// small tree, its genome: primitives (a sphere, a box, a cylinder, a torus, a cone), sections drawn in a plane (a
// circle, a rectangle, a ring, any polygon, a NACA aerofoil, a grown density field) extruded or revolved into solids,
// combined (union, intersection, subtraction, a smooth blend as living shapes have), hollowed to a wall, offset,
// filled with a lattice (gyroid, Schwarz P, diamond: the triply periodic minimal surfaces printers fill parts with),
// moved, turned, scaled, mirrored and repeated. Any tree is a shape, so a shape nobody has drawn is one line away.
//
// A form is evaluated as a signed distance field: negative inside, positive outside, its value about the distance to
// the surface. From it come its bounds, a mesh (mesh.ts), its exact-to-the-mesh volume, centre and inertia, and what
// can make it (make.ts). Everything is in metres. A form read from a file is untrusted: `parseForm` checks every node,
// number and depth before anything evaluates it.

export type V3 = [number, number, number];
export type Q4 = [number, number, number, number];

/** A shape in a plane (u, v): extruded it is (x, y) and grows along z; revolved it is (radius, height) about y. */
export type Section =
  | { s: 'circle'; r: number }
  | { s: 'rect'; w: number; h: number; r?: number }
  | { s: 'ring'; ro: number; ri: number }
  | { s: 'polygon'; pts: [number, number][] }
  /** NACA four-digit aerofoil: "2412" is 2% camber at 40% chord, 12% thick; its chord along u, from u = 0. */
  | { s: 'naca'; code: string; chord: number }
  /** A sampled field (a grown shape): nu × nv cells of size `cell`, values 0..255 (128 is the surface, above it inside), base64. */
  | { s: 'field'; nu: number; nv: number; cell: number; data: string };

export type Form =
  | { f: 'sphere'; r: number }
  | { f: 'box'; x: number; y: number; z: number; r?: number }
  | { f: 'cylinder'; r: number; h: number }
  | { f: 'torus'; R: number; r: number }
  | { f: 'capsule'; r: number; h: number }
  | { f: 'cone'; r: number; h: number }
  | { f: 'extrude'; sec: Section; h: number }
  | { f: 'revolve'; sec: Section }
  | { f: 'union'; of: Form[] }
  | { f: 'intersect'; of: Form[] }
  | { f: 'subtract'; from: Form; take: Form[] }
  | { f: 'blend'; of: Form[]; k: number }
  | { f: 'shell'; of: Form; t: number }
  | { f: 'offset'; of: Form; d: number }
  | { f: 'lattice'; of: Form; kind: 'gyroid' | 'schwarz-p' | 'diamond'; cell: number; t: number }
  | { f: 'move'; of: Form; p?: V3; q?: Q4 }
  | { f: 'scale'; of: Form; k: number }
  | { f: 'mirror'; of: Form; axis: 0 | 1 | 2 }
  | { f: 'array'; of: Form; n: number; step: V3 };

// ------------------------------------------------------------------------------------------------ 2D sections

const len2 = (u: number, v: number) => Math.hypot(u, v);

/** Exact signed distance to a closed polygon (winding number for the sign). */
function polygonSD(pts: [number, number][], u: number, v: number): number {
  let d = Infinity, s = 1;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j]!, [bx, by] = pts[i]!;
    const ex = bx - ax, ey = by - ay, wx = u - ax, wy = v - ay;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey || 1)));
    d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
    const c1 = v >= ay, c2 = v < by, c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * d;
}

const nacaCache = new Map<string, [number, number][]>();

/** NACA four-digit aerofoil outline (closed trailing edge), cosine-spaced, chord along u from 0. */
export function nacaPoints(code: string, chord: number, n = 40): [number, number][] {
  const key = `${code}:${chord}:${n}`;
  const hit = nacaCache.get(key);
  if (hit) return hit;
  const m = Number(code[0]) / 100, p = Number(code[1]) / 10, t = Number(code.slice(2)) / 100;
  const upper: [number, number][] = [], lower: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos((Math.PI * i) / n)) / 2;
    // thickness (closed trailing edge: -0.1036 in place of -0.1015) and camber line
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
    let yc = 0, dy = 0;
    if (m > 0 && p > 0) {
      if (x < p) { yc = (m / (p * p)) * (2 * p * x - x * x); dy = ((2 * m) / (p * p)) * (p - x); }
      else { yc = (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * x - x * x); dy = ((2 * m) / ((1 - p) ** 2)) * (p - x); }
    }
    const th = Math.atan(dy);
    upper.push([(x - yt * Math.sin(th)) * chord, (yc + yt * Math.cos(th)) * chord]);
    lower.push([(x + yt * Math.sin(th)) * chord, (yc - yt * Math.cos(th)) * chord]);
  }
  const pts = [...upper, ...lower.reverse().slice(1, -1)];
  nacaCache.set(key, pts);
  return pts;
}

const fieldCache = new Map<string, Uint8Array>();
function fieldBytes(data: string): Uint8Array {
  const hit = fieldCache.get(data);
  if (hit) return hit;
  const bin = typeof atob === 'function' ? atob(data) : Buffer.from(data, 'base64').toString('binary');
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (fieldCache.size > 64) fieldCache.clear();
  fieldCache.set(data, out);
  return out;
}

/** A sampled field's value as a signed distance, bilinear between cell centres (about a cell from the surface). */
function fieldSD(s: Extract<Section, { s: 'field' }>, u: number, v: number): number {
  const b = fieldBytes(s.data);
  const fu = u / s.cell - 0.5, fv = v / s.cell - 0.5;
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= s.nu || j >= s.nv ? 0 : b[j * s.nu + i]!);
  const i0 = Math.floor(fu), j0 = Math.floor(fv), a = fu - i0, c = fv - j0;
  const val = (1 - a) * (1 - c) * at(i0, j0) + a * (1 - c) * at(i0 + 1, j0) + (1 - a) * c * at(i0, j0 + 1) + a * c * at(i0 + 1, j0 + 1);
  // 128 is the surface; a value can swing at most 255 in a cell, so this never overstates the distance
  const inside = ((128 - val) / 255) * s.cell;
  // outside its box, the distance to the box at least
  const ou = Math.max(-u, u - s.nu * s.cell, 0), ov = Math.max(-v, v - s.nv * s.cell, 0);
  return ou > 0 || ov > 0 ? Math.max(inside, len2(ou, ov)) : inside;
}

export function sectionSD(s: Section, u: number, v: number): number {
  switch (s.s) {
    case 'circle': return len2(u, v) - s.r;
    case 'rect': {
      const r = Math.min(s.r ?? 0, s.w / 2, s.h / 2);
      const qx = Math.abs(u) - s.w / 2 + r, qy = Math.abs(v) - s.h / 2 + r;
      return len2(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    }
    case 'ring': return Math.abs(len2(u, v) - (s.ro + s.ri) / 2) - (s.ro - s.ri) / 2;
    case 'polygon': return polygonSD(s.pts, u, v);
    case 'naca': return polygonSD(nacaPoints(s.code, s.chord), u, v);
    case 'field': return fieldSD(s, u, v);
  }
}

export function sectionBounds(s: Section): [number, number, number, number] {
  switch (s.s) {
    case 'circle': return [-s.r, -s.r, s.r, s.r];
    case 'rect': return [-s.w / 2, -s.h / 2, s.w / 2, s.h / 2];
    case 'ring': return [-s.ro, -s.ro, s.ro, s.ro];
    case 'polygon': case 'naca': {
      const pts = s.s === 'polygon' ? s.pts : nacaPoints(s.code, s.chord);
      return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
    }
    case 'field': return [0, 0, s.nu * s.cell, s.nv * s.cell];
  }
}

/** A section's area, exactly where it can be (circle, rectangle, ring, polygon), else by sampling. */
export function sectionArea(s: Section): number {
  switch (s.s) {
    case 'circle': return Math.PI * s.r * s.r;
    case 'rect': { const r = Math.min(s.r ?? 0, s.w / 2, s.h / 2); return s.w * s.h - (4 - Math.PI) * r * r; }
    case 'ring': return Math.PI * (s.ro * s.ro - s.ri * s.ri);
    case 'polygon': case 'naca': {
      const pts = s.s === 'polygon' ? s.pts : nacaPoints(s.code, s.chord);
      let a = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += pts[j]![0] * pts[i]![1] - pts[i]![0] * pts[j]![1];
      return Math.abs(a) / 2;
    }
    case 'field': {
      const b = fieldBytes(s.data);
      let n = 0;
      for (const x of b) if (x > 128) n++;
      return n * s.cell * s.cell;
    }
  }
}

// ------------------------------------------------------------------------------------------------ 3D

const rot = (q: Q4, v: V3): V3 => {
  const [x, y, z, w] = q, [vx, vy, vz] = v;
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
};
const conj = (q: Q4): Q4 => [-q[0], -q[1], -q[2], q[3]];

/** Smooth minimum (polynomial): blends two shapes over a width k, as tissue flows into tissue. */
const smin = (a: number, b: number, k: number) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - (h * h * k) / 4;
};

/**
 * The triply periodic minimal surfaces, with the most their value can change per unit length (g), so that the value
 * over g is never more than the distance to the surface: a sheet of nominal wall t is at least t thick.
 */
function tpms(kind: 'gyroid' | 'schwarz-p' | 'diamond', x: number, y: number, z: number): { v: number; g: number } {
  switch (kind) {
    case 'gyroid': return { v: Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x), g: 2 };
    case 'schwarz-p': return { v: Math.cos(x) + Math.cos(y) + Math.cos(z), g: Math.sqrt(3) };
    case 'diamond': return {
      v: Math.sin(x) * Math.sin(y) * Math.sin(z) + Math.sin(x) * Math.cos(y) * Math.cos(z) + Math.cos(x) * Math.sin(y) * Math.cos(z) + Math.cos(x) * Math.cos(y) * Math.sin(z),
      g: 2,
    };
  }
}

/** The form's signed distance at a point: negative inside. */
export function sd(f: Form, p: V3): number {
  const [x, y, z] = p;
  switch (f.f) {
    case 'sphere': return Math.hypot(x, y, z) - f.r;
    case 'box': {
      const r = Math.min(f.r ?? 0, f.x / 2, f.y / 2, f.z / 2);
      const qx = Math.abs(x) - f.x / 2 + r, qy = Math.abs(y) - f.y / 2 + r, qz = Math.abs(z) - f.z / 2 + r;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    }
    case 'cylinder': {
      const dr = Math.hypot(x, z) - f.r, dy = Math.abs(y) - f.h / 2;
      return Math.min(Math.max(dr, dy), 0) + len2(Math.max(dr, 0), Math.max(dy, 0));
    }
    case 'torus': return len2(Math.hypot(x, z) - f.R, y) - f.r;
    case 'capsule': { const t = Math.max(-f.h / 2, Math.min(f.h / 2, y)); return Math.hypot(x, y - t, z) - f.r; }
    case 'cone': return polygonSD([[0, -f.h / 2], [f.r, -f.h / 2], [0, f.h / 2], [-f.r, -f.h / 2]], Math.hypot(x, z), y);
    case 'extrude': {
      const d = sectionSD(f.sec, x, y), w = Math.abs(z) - f.h / 2;
      return Math.min(Math.max(d, w), 0) + len2(Math.max(d, 0), Math.max(w, 0));
    }
    case 'revolve': return sectionSD(f.sec, Math.hypot(x, z), y);
    case 'union': return Math.min(...f.of.map((g) => sd(g, p)));
    case 'intersect': return Math.max(...f.of.map((g) => sd(g, p)));
    case 'subtract': return Math.max(sd(f.from, p), ...f.take.map((g) => -sd(g, p)));
    case 'blend': return f.of.map((g) => sd(g, p)).reduce((a, b) => smin(a, b, f.k));
    case 'shell': { const d = sd(f.of, p); return Math.max(d, -d - f.t); }
    case 'offset': return sd(f.of, p) - f.d;
    case 'lattice': {
      const k = (2 * Math.PI) / f.cell, l = tpms(f.kind, x * k, y * k, z * k);
      const sheet = (Math.abs(l.v) / (l.g * k)) - f.t / 2;
      return Math.max(sd(f.of, p), sheet);
    }
    case 'move': {
      const t = f.p ?? [0, 0, 0];
      const local: V3 = [x - t[0], y - t[1], z - t[2]];
      return sd(f.of, f.q ? rot(conj(f.q), local) : local);
    }
    case 'scale': return sd(f.of, [x / f.k, y / f.k, z / f.k]) * f.k;
    case 'mirror': { const m: V3 = [x, y, z]; m[f.axis] = Math.abs(m[f.axis]); return sd(f.of, m); }
    case 'array': {
      let d = Infinity;
      for (let i = 0; i < f.n; i++) d = Math.min(d, sd(f.of, [x - f.step[0] * i, y - f.step[1] * i, z - f.step[2] * i]));
      return d;
    }
  }
}

export type Box3 = [V3, V3];

/** A box the form is sure to lie in. */
export function bounds(f: Form): Box3 {
  switch (f.f) {
    case 'sphere': return [[-f.r, -f.r, -f.r], [f.r, f.r, f.r]];
    case 'box': return [[-f.x / 2, -f.y / 2, -f.z / 2], [f.x / 2, f.y / 2, f.z / 2]];
    case 'cylinder': return [[-f.r, -f.h / 2, -f.r], [f.r, f.h / 2, f.r]];
    case 'torus': return [[-f.R - f.r, -f.r, -f.R - f.r], [f.R + f.r, f.r, f.R + f.r]];
    case 'capsule': return [[-f.r, -f.h / 2 - f.r, -f.r], [f.r, f.h / 2 + f.r, f.r]];
    case 'cone': return [[-f.r, -f.h / 2, -f.r], [f.r, f.h / 2, f.r]];
    case 'extrude': { const [a, b, c, d] = sectionBounds(f.sec); return [[a, b, -f.h / 2], [c, d, f.h / 2]]; }
    case 'revolve': { const [, b, c, d] = sectionBounds(f.sec); return [[-c, b, -c], [c, d, c]]; }
    case 'union': case 'blend': {
      const bs = f.of.map(bounds), pad = f.f === 'blend' ? f.k / 4 : 0;
      return [[0, 1, 2].map((i) => Math.min(...bs.map((b) => b[0][i]!)) - pad) as V3, [0, 1, 2].map((i) => Math.max(...bs.map((b) => b[1][i]!)) + pad) as V3];
    }
    case 'intersect': {
      const bs = f.of.map(bounds);
      return [[0, 1, 2].map((i) => Math.max(...bs.map((b) => b[0][i]!))) as V3, [0, 1, 2].map((i) => Math.min(...bs.map((b) => b[1][i]!))) as V3];
    }
    case 'subtract': case 'shell': case 'lattice': return bounds(f.f === 'subtract' ? f.from : f.of);
    case 'offset': { const [a, b] = bounds(f.of); return [a.map((x) => x - Math.max(0, f.d)) as V3, b.map((x) => x + Math.max(0, f.d)) as V3]; }
    case 'move': {
      const [a, b] = bounds(f.of), t = f.p ?? [0, 0, 0];
      const corners: V3[] = [];
      for (const cx of [a[0], b[0]]) for (const cy of [a[1], b[1]]) for (const cz of [a[2], b[2]]) corners.push(f.q ? rot(f.q, [cx, cy, cz]) : [cx, cy, cz]);
      return [[0, 1, 2].map((i) => Math.min(...corners.map((c) => c[i]!)) + t[i]!) as V3, [0, 1, 2].map((i) => Math.max(...corners.map((c) => c[i]!)) + t[i]!) as V3];
    }
    case 'scale': { const [a, b] = bounds(f.of); return [a.map((x) => x * f.k) as V3, b.map((x) => x * f.k) as V3]; }
    case 'mirror': {
      const [a, b] = bounds(f.of), lo = [...a] as V3, hi = [...b] as V3;
      const m = Math.max(Math.abs(a[f.axis]), Math.abs(b[f.axis]));
      lo[f.axis] = -m; hi[f.axis] = m;
      return [lo, hi];
    }
    case 'array': {
      const [a, b] = bounds(f.of), e: V3 = [f.step[0] * (f.n - 1), f.step[1] * (f.n - 1), f.step[2] * (f.n - 1)];
      return [[0, 1, 2].map((i) => a[i]! + Math.min(0, e[i]!)) as V3, [0, 1, 2].map((i) => b[i]! + Math.max(0, e[i]!)) as V3];
    }
  }
}

/** What the form is made of, as operations: which tells what can make it (make.ts). */
export function traits(f: Form): Set<string> {
  const out = new Set<string>();
  const walk = (g: Form, depth: number) => {
    out.add(g.f);
    if (g.f === 'extrude' || g.f === 'revolve') out.add(`sec:${g.sec.s}`);
    if (g.f === 'move' && g.q) out.add('rotated');
    for (const c of children(g)) walk(c, depth + 1);
  };
  walk(f, 0);
  return out;
}

export function children(g: Form): Form[] {
  switch (g.f) {
    case 'union': case 'intersect': case 'blend': return g.of;
    case 'subtract': return [g.from, ...g.take];
    case 'shell': case 'offset': case 'lattice': case 'move': case 'scale': case 'mirror': case 'array': return [g.of];
    default: return [];
  }
}

/** Every number in the form that is a wall or a strut (a shell's wall, a lattice's sheet), for the thinnest a process can make. */
export function walls(f: Form): number[] {
  const out: number[] = [];
  const walk = (g: Form, k: number) => {
    if (g.f === 'shell') out.push(g.t * k);
    if (g.f === 'lattice') out.push(g.t * k);
    if ((g.f === 'extrude' || g.f === 'revolve') && g.sec.s === 'ring') out.push((g.sec.ro - g.sec.ri) * k);
    for (const c of children(g)) walk(c, g.f === 'scale' ? k * g.k : k);
  };
  walk(f, 1);
  return out;
}

// ------------------------------------------------------------------------------------------------ untrusted input

export class FormError extends Error {}

const MAX_NODES = 256, MAX_DEPTH = 24, MAX_SIZE = 20, MIN_SIZE = 1e-5;

/** A form from text or data, checked node by node: kinds, numbers within range, depth and size limited. */
export function parseForm(input: unknown): Form {
  const data = typeof input === 'string' ? (() => { try { return JSON.parse(input) as unknown; } catch { throw new FormError('not a form: not JSON'); } })() : input;
  let nodes = 0;
  const num = (v: unknown, what: string, lo = MIN_SIZE, hi = MAX_SIZE) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < lo || v > hi) throw new FormError(`${what} must be a number from ${lo} to ${hi}`);
    return v;
  };
  const vec = (v: unknown, what: string): V3 => {
    if (!Array.isArray(v) || v.length !== 3) throw new FormError(`${what} must be three numbers`);
    return v.map((x, i) => num(x, `${what}[${i}]`, -MAX_SIZE, MAX_SIZE)) as V3;
  };
  const sec = (s: unknown): Section => {
    if (!s || typeof s !== 'object') throw new FormError('a section must be an object');
    const o = s as Record<string, unknown>;
    switch (o['s']) {
      case 'circle': return { s: 'circle', r: num(o['r'], 'r') };
      case 'rect': return { s: 'rect', w: num(o['w'], 'w'), h: num(o['h'], 'h'), ...(o['r'] !== undefined ? { r: num(o['r'], 'r', 0) } : {}) };
      case 'ring': { const ro = num(o['ro'], 'ro'), ri = num(o['ri'], 'ri'); if (ri >= ro) throw new FormError('a ring\'s inner radius must be less than its outer'); return { s: 'ring', ro, ri }; }
      case 'polygon': {
        const pts = o['pts'];
        if (!Array.isArray(pts) || pts.length < 3 || pts.length > 512) throw new FormError('a polygon needs 3 to 512 points');
        return { s: 'polygon', pts: pts.map((p, i) => { if (!Array.isArray(p) || p.length !== 2) throw new FormError(`point ${i} must be two numbers`); return [num(p[0], 'u', -MAX_SIZE, MAX_SIZE), num(p[1], 'v', -MAX_SIZE, MAX_SIZE)] as [number, number]; }) };
      }
      case 'naca': {
        const code = o['code'];
        if (typeof code !== 'string' || !/^\d{4}$/.test(code) || Number(code.slice(2)) < 1) throw new FormError('a NACA code is four digits, thickness at least 01');
        return { s: 'naca', code, chord: num(o['chord'], 'chord') };
      }
      case 'field': {
        const nu = num(o['nu'], 'nu', 1, 512), nv = num(o['nv'], 'nv', 1, 512), data = o['data'];
        if (!Number.isInteger(nu) || !Number.isInteger(nv)) throw new FormError('a field\'s size is whole cells');
        if (typeof data !== 'string' || data.length > 60_000 || !/^[A-Za-z0-9+/=]*$/.test(data)) throw new FormError('a field\'s data is base64');
        if (fieldBytes(data).length !== nu * nv) throw new FormError('a field\'s data must be nu × nv bytes');
        return { s: 'field', nu, nv, cell: num(o['cell'], 'cell'), data };
      }
      default: throw new FormError(`no section ${String(o['s'])}`);
    }
  };
  const form = (g: unknown, depth: number): Form => {
    if (++nodes > MAX_NODES) throw new FormError(`more than ${MAX_NODES} nodes`);
    if (depth > MAX_DEPTH) throw new FormError(`deeper than ${MAX_DEPTH}`);
    if (!g || typeof g !== 'object' || Array.isArray(g)) throw new FormError('a form must be an object');
    const o = g as Record<string, unknown>;
    const list = (v: unknown, what: string) => { if (!Array.isArray(v) || !v.length || v.length > 64) throw new FormError(`${what} must list 1 to 64 forms`); return v.map((x) => form(x, depth + 1)); };
    switch (o['f']) {
      case 'sphere': return { f: 'sphere', r: num(o['r'], 'r') };
      case 'box': return { f: 'box', x: num(o['x'], 'x'), y: num(o['y'], 'y'), z: num(o['z'], 'z'), ...(o['r'] !== undefined ? { r: num(o['r'], 'r', 0) } : {}) };
      case 'cylinder': return { f: 'cylinder', r: num(o['r'], 'r'), h: num(o['h'], 'h') };
      case 'torus': return { f: 'torus', R: num(o['R'], 'R'), r: num(o['r'], 'r') };
      case 'capsule': return { f: 'capsule', r: num(o['r'], 'r'), h: num(o['h'], 'h', 0) };
      case 'cone': return { f: 'cone', r: num(o['r'], 'r'), h: num(o['h'], 'h') };
      case 'extrude': return { f: 'extrude', sec: sec(o['sec']), h: num(o['h'], 'h') };
      case 'revolve': return { f: 'revolve', sec: sec(o['sec']) };
      case 'union': return { f: 'union', of: list(o['of'], 'of') };
      case 'intersect': return { f: 'intersect', of: list(o['of'], 'of') };
      case 'subtract': return { f: 'subtract', from: form(o['from'], depth + 1), take: list(o['take'], 'take') };
      case 'blend': return { f: 'blend', of: list(o['of'], 'of'), k: num(o['k'], 'k') };
      case 'shell': return { f: 'shell', of: form(o['of'], depth + 1), t: num(o['t'], 't') };
      case 'offset': return { f: 'offset', of: form(o['of'], depth + 1), d: num(o['d'], 'd', -MAX_SIZE, MAX_SIZE) };
      case 'lattice': {
        const kind = o['kind'];
        if (kind !== 'gyroid' && kind !== 'schwarz-p' && kind !== 'diamond') throw new FormError('a lattice is gyroid, schwarz-p or diamond');
        return { f: 'lattice', of: form(o['of'], depth + 1), kind, cell: num(o['cell'], 'cell'), t: num(o['t'], 't') };
      }
      case 'move': {
        const q = o['q'];
        let qq: Q4 | undefined;
        if (q !== undefined) {
          if (!Array.isArray(q) || q.length !== 4) throw new FormError('q must be four numbers');
          qq = q.map((x, i) => num(x, `q[${i}]`, -1.000001, 1.000001)) as Q4;
          const n = Math.hypot(...qq);
          if (Math.abs(n - 1) > 1e-3) throw new FormError('q must be a unit quaternion');
          qq = qq.map((x) => x / n) as Q4;
        }
        return { f: 'move', of: form(o['of'], depth + 1), ...(o['p'] !== undefined ? { p: vec(o['p'], 'p') } : {}), ...(qq ? { q: qq } : {}) };
      }
      case 'scale': return { f: 'scale', of: form(o['of'], depth + 1), k: num(o['k'], 'k', 1e-3, 1e3) };
      case 'mirror': { const a = o['axis']; if (a !== 0 && a !== 1 && a !== 2) throw new FormError('axis is 0, 1 or 2'); return { f: 'mirror', of: form(o['of'], depth + 1), axis: a }; }
      case 'array': {
        const n = num(o['n'], 'n', 1, 64);
        if (!Number.isInteger(n)) throw new FormError('n is a whole number');
        return { f: 'array', of: form(o['of'], depth + 1), n, step: vec(o['step'], 'step') };
      }
      default: throw new FormError(`no form ${String(o['f'])}`);
    }
  };
  const out = form(data, 0);
  const [lo, hi] = bounds(out);
  for (let i = 0; i < 3; i++) if (!(hi[i]! > lo[i]!) || hi[i]! - lo[i]! > 2 * MAX_SIZE) throw new FormError('it has no size, or is too big');
  return out;
}

/** The form as its genome: compact text, the same for the same form. */
export const genome = (f: Form) => JSON.stringify(f);

/** A short hash of a genome (FNV-1a). */
export function formKey(f: Form | string): string {
  const s = typeof f === 'string' ? f : genome(f);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** A form said in words. */
export function describe(f: Form): string {
  const mm = (x: number) => `${Number((x * 1000).toPrecision(3))} mm`;
  const sec = (s: Section): string => {
    switch (s.s) {
      case 'circle': return `a Ø${mm(2 * s.r)} circle`;
      case 'rect': return `a ${mm(s.w)} × ${mm(s.h)} rectangle${s.r ? ` with ${mm(s.r)} corners` : ''}`;
      case 'ring': return `a ring Ø${mm(2 * s.ro)} outside, Ø${mm(2 * s.ri)} inside`;
      case 'polygon': return `a ${s.pts.length}-sided outline`;
      case 'naca': return `a NACA ${s.code} aerofoil of ${mm(s.chord)} chord`;
      case 'field': return `a grown outline (${s.nu} × ${s.nv} cells of ${mm(s.cell)})`;
    }
  };
  switch (f.f) {
    case 'sphere': return `a Ø${mm(2 * f.r)} sphere`;
    case 'box': return `a ${mm(f.x)} × ${mm(f.y)} × ${mm(f.z)} block${f.r ? ` rounded ${mm(f.r)}` : ''}`;
    case 'cylinder': return `a Ø${mm(2 * f.r)} × ${mm(f.h)} cylinder`;
    case 'torus': return `a ring of Ø${mm(2 * f.R)} with a Ø${mm(2 * f.r)} section`;
    case 'capsule': return `a Ø${mm(2 * f.r)} capsule ${mm(f.h)} between its ends`;
    case 'cone': return `a Ø${mm(2 * f.r)} × ${mm(f.h)} cone`;
    case 'extrude': return `${sec(f.sec)} extruded ${mm(f.h)}`;
    case 'revolve': return `${sec(f.sec)} turned about its axis`;
    case 'union': return f.of.map(describe).join(' joined to ');
    case 'intersect': return `where ${f.of.map(describe).join(' and ')} overlap`;
    case 'subtract': {
      const [lo, hi] = bounds(f.from), size = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
      const hole = (g: Form): string => {
        const c = g.f === 'move' ? g.of : g;
        return c.f === 'cylinder' && c.h > size ? `a Ø${mm(2 * c.r)} hole through it` : describe(g);
      };
      const said = f.take.map(hole);
      return `${describe(f.from)} with ${said.join(' and ')}${said.every((x) => / hole through it$/.test(x)) ? '' : ' cut away'}`;
    }
    case 'blend': return `${f.of.map(describe).join(' and ')}, blended over ${mm(f.k)}`;
    case 'shell': return `${describe(f.of)}, hollow with ${mm(f.t)} walls`;
    case 'offset': return `${describe(f.of)}, grown ${mm(f.d)}`;
    case 'lattice': return `${describe(f.of)}, filled with a ${f.kind} lattice of ${mm(f.cell)} cells and ${mm(f.t)} walls`;
    case 'move': return describe(f.of);
    case 'scale': return `${describe(f.of)} at ${f.k}×`;
    case 'mirror': return `${describe(f.of)}, mirrored`;
    case 'array': return `${f.n} of ${describe(f.of)} in a row`;
  }
}
