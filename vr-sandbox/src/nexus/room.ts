// The space where two solids cannot be written into one place (decision 0021): nothing checks for overlap, because no
// operation here can write one. A place is never an input: a Block is made only by the operations here, and every place
// is an output. (The nodes Make a solid, Stack, Around, Into a room, Onto a face, Ring of copies and Through a line in
// blocks.ts run these; `partOfBlock` draws a block as the app's parts.)
//
//   I(B): at every pose of B's joints, B's solids are pairwise interior-disjoint and each lies in its bound; B's rooms
//         are free of B's solids; every two pieces that touch have a face in B's record.
//
//   made     one solid at the origin, every size finite and above zero; its lines (axis, pattern) inside it.
//   stack    blocks end to end along an axis: the next starts past the last one's movers' sweeps (unless they move
//            with it) plus the fit's gap. Disjoint intervals at every pose.
//   around   a host made round a child: its cavity holds the child's swept bound plus the fit. host ∩ child = ∅.
//   through  a passer on a line its host offers: the union of all the passer's pieces (each swept over its motion
//            relative to the solid it crosses, grown by the fit) is taken out of every solid whose bound meets the
//            passer's bound. (A − P) ∩ P = ∅. A bought solid is never cut: the passer goes only through its openings.
//   into     a block into a room a host offers (a cup's cavity): its swept bound plus the fit within the room, or
//            "no room" with both numbers. A room is used once. onto is into the space beyond a face of a bound.
//   ring     n copies round an axis, each in its own wedge, or "no room" with both numbers.
//
// The comparisons the operations make (none decides whether two solids may share a point; construction does):
//   (1) each size's sign and finiteness, as it is written;
//   (2) one size against one room: a line's slot, a room's size, a ring's pitch;
//   (3) a bound against a bound: which solids a passer is taken out of (cutting one it misses changes nothing), which
//       rooms it closes, and whether a bought or moving solid is in its way (refused by name);
//   (4) face patches: where an operation lays two pieces against each other, their footprints on that plane or round
//       that line are sampled, to write the patch's size. Nothing is refused by it.
// Prototype limits: round solids and lines along y only; slides along +y and turns about y only; no turned blocks and
// no rooms on a moving host; a ring of turning copies is refused; face patches are sampled (a 64-cell grid, so a few per
// cent), and a face written before a later cut keeps its first area. Known ways past it, found by a red team on
// 2026-11-02 and not yet closed: a room on a moving host, a bought host on a joint, the 1e-12 m tolerance at very small
// sizes, rounding at 1e20 m, and data changed after it is checked (docs/REALITY.md).
import type { Cut, Part, Shape } from './kits';

export type P3 = readonly [number, number, number];
type V3 = [number, number, number];
export type Axis = 0 | 1 | 2;
export type Prim =
  | { readonly k: 'box'; readonly c: P3; readonly size: P3 }
  | { readonly k: 'cyl'; readonly c: P3; readonly r: number; readonly h: number; readonly ri?: number }
  | { readonly k: 'cup'; readonly c: P3; readonly r: number; readonly h: number; readonly wall: number; readonly ends: number; readonly open: boolean };
/** A solid: its base less the union of what was taken out of it. */
export interface Solid { readonly base: Prim; readonly minus: readonly Prim[] }
export interface Line { readonly port: string; readonly x: number; readonly z: number; readonly slot: number; readonly opening?: number }
export interface JointRef { readonly name: string; readonly slide?: number; readonly turn?: true }
export interface Piece { readonly name: string; readonly mat: string; readonly solid: Solid; readonly joint?: JointRef; readonly axis?: readonly [number, number]; readonly bought?: true; readonly lines: readonly Line[] }
export interface Face {
  readonly a: number; readonly b: number; readonly kind: 'contact' | 'gap'; readonly patch: 'area' | 'line'; readonly area: number; readonly length?: number;
  readonly at: P3; readonly normal: P3; readonly gap: number; readonly medium?: string; readonly gate?: string; readonly interference?: { readonly um: number; readonly pressure?: number; readonly src: string }; readonly by: string;
}
export interface RoomOf { readonly name: string; readonly c: P3; readonly r: number; readonly h: number; readonly open: boolean }

declare const ROOM: unique symbol;
/** A length of room (a joint's travel): finite, never below zero. */
export type Room = number & { readonly [ROOM]: true };
export const room = (m: number): Room => { if (!(Number.isFinite(m) && m >= 0)) throw new Error(`room is finite and never below zero (${m} m)`); return m as Room; };
const sizes = (name: string, xs: readonly number[]) => { for (const x of xs) if (!(Number.isFinite(x) && x > 0)) throw new Error(`${name}: every size is finite and above zero (${x})`); };

/** A joint: a slide along y over its room, or a turn about the y axis of the pieces made on it. Made only here. */
export class Joint implements JointRef {
  readonly #j = true;
  private constructor(readonly name: string, readonly slide?: number, readonly turn?: true) { Object.freeze(this); }
  static make(name: string, m: { slide: Room } | { turn: true }): Joint { if ('slide' in m) { room(m.slide); return new Joint(name, m.slide); } return new Joint(name, undefined, true); }
  static is(j: unknown): j is Joint { return typeof j === 'object' && j !== null && #j in j; }
}
export const joint = Joint.make;

/** Fits by name, never a signed number: the gap each leaves, m (typical values), and for a transition or interference
 *  fit the most interference, drawn at basic size and carried on the face as a pressure. */
export const FITS = {
  touch: { gap: 0 }, tight: { gap: 0 }, slide: { gap: 0.00025 }, clear: { gap: 0.001 },
  'H7/m6': { gap: 0, tightUm: 12, src: 'ISO 286-2 m6 over 3 to 6 mm +4/+12 µm on H7 0/+12 µm, as interfaces.ts holds them (DEVIATION, IT_TABLE)' },
} as const;
export type Fit = keyof typeof FITS;
const gapOf = (f: Fit): number => FITS[f].gap;
// (for a pressure from an interference: E and ν, typical values, labelled so)
const ELASTIC: Record<string, { E: number; nu: number }> = { 'steel-low': { E: 200e9, nu: 0.29 }, 'steel-alloy': { E: 205e9, nu: 0.29 }, copper: { E: 117e9, nu: 0.34 } };
const MEDIUM = 'air'; // the surroundings' medium where nothing else is said (the default record)

const add = (a: P3, b: P3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const primBox = (p: Prim): [V3, V3] => p.k === 'box' ? [[p.c[0] - p.size[0] / 2, p.c[1] - p.size[1] / 2, p.c[2] - p.size[2] / 2], [p.c[0] + p.size[0] / 2, p.c[1] + p.size[1] / 2, p.c[2] + p.size[2] / 2]]
  : [[p.c[0] - p.r, p.c[1] - p.h / 2, p.c[2] - p.r], [p.c[0] + p.r, p.c[1] + p.h / 2, p.c[2] + p.r]];
const shiftPrim = (p: Prim, d: P3): Prim => ({ ...p, c: add(p.c, d) }) as Prim;
const inPrim = (p: Prim, x: number, y: number, z: number): boolean => {
  const dx = x - p.c[0], dy = y - p.c[1], dz = z - p.c[2];
  if (p.k === 'box') return Math.abs(dx) < p.size[0] / 2 && Math.abs(dy) < p.size[1] / 2 && Math.abs(dz) < p.size[2] / 2;
  const rho = Math.hypot(dx, dz); if (!(rho < p.r && Math.abs(dy) < p.h / 2)) return false;
  if (p.k === 'cyl') return p.ri === undefined || rho > p.ri;
  return !(rho < p.r - p.wall && dy > -p.h / 2 + p.ends && (p.open || dy < p.h / 2 - p.ends));
};
const inSolid = (s: Solid, x: number, y: number, z: number) => inPrim(s.base, x, y, z) && !s.minus.some((m) => inPrim(m, x, y, z));
const lift = (p: Piece, t: number) => (p.joint?.slide ? t * p.joint.slide : 0);
const inPiece = (p: Piece, x: number, y: number, z: number, t = 0) => inSolid(p.solid, x, y - lift(p, t), z);
/** The farthest a prim reaches from a line along y at (x, z). */
const reach = (p: Prim, x: number, z: number): number => {
  const d = Math.hypot(p.c[0] - x, p.c[2] - z); if (p.k !== 'box') return d + p.r;
  return Math.max(...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => Math.hypot(p.c[0] + (sx * p.size[0]) / 2 - x, p.c[2] + (sz * p.size[2]) / 2 - z))));
};
/** All a piece takes over its joint's range: a slide extends it along +y; a turn about its own line is itself if it is
 *  round about it, else the cylinder its farthest point sweeps. A superset at every pose. */
const sweepOf = (p: Piece): Prim => {
  const b = p.solid.base, j = p.joint;
  if (j?.slide) return b.k === 'box' ? { k: 'box', c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], size: [b.size[0], b.size[1] + j.slide, b.size[2]] }
    : b.k === 'cyl' ? { ...b, c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], h: b.h + j.slide } : { k: 'cyl', c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], r: b.r, h: b.h + j.slide };
  if (j?.turn) { const [ax, az] = p.axis!; if (b.k !== 'box' && Math.hypot(b.c[0] - ax, b.c[2] - az) < 1e-12) return b; return { k: 'cyl', c: [ax, b.c[1], az], r: reach(b, ax, az), h: b.k === 'box' ? b.size[1] : b.h }; }
  return b;
};
export const boundOf = (p: Piece): [V3, V3] => primBox(sweepOf(p));
const meets = (a: [V3, V3], b: [V3, V3]) => [0, 1, 2].every((k) => a[0][k]! < b[1][k]! - 1e-12 && b[0][k]! < a[1][k]! - 1e-12);
const coMove = (p: Piece, q: Piece) => !!p.joint && p.joint === q.joint && (!p.joint.turn || (Math.abs(p.axis![0] - q.axis![0]) < 1e-12 && Math.abs(p.axis![1] - q.axis![1]) < 1e-12));
const freeze = <T>(o: T): T => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) freeze(v); } return o; };
const EPS = 1e-7, N = 64;

// ---- faces: where an operation lays two pieces against each other, the patch its footprints share there --------------
const other = (axis: Axis): [Axis, Axis] => (axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]);
const pt = (axis: Axis, c: number, u: number, v: number): V3 => { const [i, j] = other(axis), o: V3 = [0, 0, 0]; o[axis] = c; o[i] = u; o[j] = v; return o; };
/** The patch on the plane axis = c where p lies just below it and q just above (p at pose tp of its slide). */
function planePatch(p: Piece, q: Piece, axis: Axis, c: number, gap: number, tp = 0): { area: number; length: number; at: V3 } {
  const [i, j] = other(axis), A = boundOf(p), B = boundOf(q), lo = [Math.max(A[0][i]!, B[0][i]!), Math.max(A[0][j]!, B[0][j]!)], hi = [Math.min(A[1][i]!, B[1][i]!), Math.min(A[1][j]!, B[1][j]!)];
  if (!(lo[0]! < hi[0]! && lo[1]! < hi[1]!)) {
    // (a round piece's side against a plane across x or z touches it along a line: the extents meet in one coordinate)
    return linePatch(p, q, axis, c, gap, tp);
  }
  let n = 0, su = 0, sv = 0; const du = (hi[0]! - lo[0]!) / N, dv = (hi[1]! - lo[1]!) / N;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = lo[0]! + (a + 0.5) * du, v = lo[1]! + (b + 0.5) * dv;
    if (inPiece(p, ...pt(axis, c - EPS, u, v), tp) && inPiece(q, ...pt(axis, c + gap + EPS, u, v))) { n++; su += u; sv += v; } }
  if (n) return { area: n * du * dv, length: 0, at: pt(axis, c + gap / 2, su / n, sv / n) };
  return linePatch(p, q, axis, c, gap, tp);
}
function linePatch(p: Piece, q: Piece, axis: Axis, c: number, gap: number, tp: number): { area: number; length: number; at: V3 } {
  const none = { area: 0, length: 0, at: [0, 0, 0] as V3 }; if (axis === 1) return none;
  const w = axis === 0 ? 2 : 0, y0 = Math.max(boundOf(p)[0][1], boundOf(q)[0][1]), y1 = Math.min(boundOf(p)[1][1], boundOf(q)[1][1]); if (!(y0 < y1)) return none;
  // (the round one's extreme line on the plane, tried against the other just across it)
  for (const [r, s, across] of [[p, q, c + gap + EPS], [q, p, c - EPS]] as const) {
    const b = r.solid.base; if (b.k === 'box') continue;
    const ext = r === p ? b.c[axis] + b.r : b.c[axis] - b.r; if (Math.abs(ext - (r === p ? c : c + gap)) > 1e-9) continue;
    let n = 0; for (let a = 0; a < N; a++) { const o: V3 = [0, y0 + ((a + 0.5) * (y1 - y0)) / N, 0]; o[w] = b.c[w]; o[axis] = across; if (inPiece(s, o[0], o[1], o[2], s === p ? tp : 0)) n++; }
    if (n) { const at: V3 = [0, (y0 + y1) / 2, 0]; at[w] = b.c[w]; at[axis] = c + gap / 2; return { area: 0, length: (n * (y1 - y0)) / N, at }; }
  }
  return none;
}
const unit = (axis: Axis): V3 => { const n: V3 = [0, 0, 0]; n[axis] = 1; return n; };
/** Faces between the pieces just below and just above a plane an operation laid them across. */
function planeFaces(ps: Piece[], low: number[], high: number[], axis: Axis, by: string, fit?: Fit): Face[] {
  const out: Face[] = [], g = fit ? gapOf(fit) : 0;
  for (const a of low) for (const b of high) {
    const p = ps[a]!, q = ps[b]!, top = primBox(p.solid.base)[1][axis], bot = primBox(q.solid.base)[0][axis], d = bot - top;
    const write = (r: { area: number; length: number; at: V3 }, kind: 'contact' | 'gap', gap: number, gate?: string) => { if (r.area > 0 || r.length > 0) out.push({ a, b, kind, patch: r.area > 0 ? 'area' : 'line', area: r.area, ...(r.area > 0 ? {} : { length: r.length }), at: r.at, normal: unit(axis), gap, ...(kind === 'gap' || gate ? { medium: MEDIUM } : {}), ...(gate ? { gate } : {}), by }); };
    if (Math.abs(d) < 1e-9) { write(planePatch(p, q, axis, top, 0), 'contact', 0); continue; }
    if (g > 0 && Math.abs(d - g) < 1e-9) { write(planePatch(p, q, axis, top, g), 'gap', g); continue; }
    // (a slide that closes the gap at the end of its travel: a gated face)
    if (axis === 1 && p.joint?.slide && !coMove(p, q) && Math.abs(d - p.joint.slide) < 1e-9) write(planePatch(p, q, axis, top + p.joint.slide, 0, 1), 'contact', p.joint.slide, p.joint.name);
  }
  return out;
}
/** A piece's side against the round surface at radius R about a line along y (a hole's wall, a cavity's wall). */
function roundFace(p: Piece, x: number, z: number, R: number, y0: number, y1: number, inward: boolean): { area: number; length: number; at: V3 } {
  const b = p.solid.base, lo = Math.max(y0, primBox(b)[0][1]), hi = Math.min(y1, primBox(b)[1][1]); if (!(lo < hi)) return { area: 0, length: 0, at: [0, 0, 0] };
  if (b.k !== 'box') { const d = Math.hypot(b.c[0] - x, b.c[2] - z);
    if (d < 1e-12 && Math.abs(b.r - R) < 1e-9) return { area: 2 * Math.PI * R * (hi - lo), length: 0, at: [x, (lo + hi) / 2, z] };
    if (d > 1e-12 && Math.abs(d + b.r - R) < 1e-9) { const ux = (b.c[0] - x) / d, uz = (b.c[2] - z) / d; return { area: 0, length: hi - lo, at: [x + ux * R, (lo + hi) / 2, z + uz * R] }; } }
  // (sampled round the line, in y between the solid's own breaks (its ends, its cuts), so a thin end is not missed)
  const ys = ySamples(p, lo, hi); let n = 0; const A = 96;
  for (let a = 0; a < A; a++) for (const y of ys) { const th = (2 * Math.PI * (a + 0.5)) / A, rr = inward ? R - EPS : R + EPS; if (inPiece(p, x + rr * Math.cos(th), y[0], z + rr * Math.sin(th))) n += y[1]; }
  return n ? { area: (n / A) * 2 * Math.PI * R, length: 0, at: [x, (lo + hi) / 2, z] } : { area: 0, length: 0, at: [0, 0, 0] };
}
// (sample heights between a solid's breaks, each with the length it stands for)
function ySamples(p: Piece, lo: number, hi: number): [number, number][] {
  const cuts = new Set([lo, hi]); for (const m of [p.solid.base, ...p.solid.minus]) { const b = primBox(m); cuts.add(b[0][1]); cuts.add(b[1][1]); if (m.k === 'cup') { cuts.add(b[0][1] + m.ends); cuts.add(b[1][1] - m.ends); } }
  const ks = [...cuts].filter((y) => y >= lo && y <= hi).sort((a, b) => a - b), out: [number, number][] = [];
  for (let i = 0; i + 1 < ks.length; i++) { const a = ks[i]!, b = ks[i + 1]!; if (!(b > a)) continue; for (let k = 0; k < 6; k++) out.push([a + ((k + 0.5) * (b - a)) / 6, (b - a) / 6]); }
  return out;
}
const pressureOf = (fit: Fit, d: number, D: number, shaft: string, hub: string) => {
  const f = FITS[fit] as { tightUm?: number; src?: string }; if (!f.tightUm) return undefined;
  const s = ELASTIC[shaft], h = ELASTIC[hub], delta = f.tightUm * 1e-6;
  // (Lamé, a solid shaft in a hub of outside D: p = δ / (d [ (1/Eh)((D² + d²)/(D² − d²) + νh) + (1 − νs)/Es ]); Shigley 3-56)
  const p = s && h && D > d ? delta / (d * ((1 / h.E) * ((D * D + d * d) / (D * D - d * d) + h.nu) + (1 - s.nu) / s.E)) : undefined;
  return { um: f.tightUm, ...(p ? { pressure: p } : {}), src: f.src! };
};

export class Block {
  readonly #own = true;
  private constructor(readonly name: string, readonly lo: P3, readonly hi: P3, readonly pieces: readonly Piece[], readonly faces: readonly Face[], readonly rooms: readonly RoomOf[]) {}
  static #is(b: unknown): asserts b is Block { if (!(b !== null && typeof b === 'object' && #own in b)) throw new Error('not made by the constructor: refused'); }
  static #seal(name: string, pieces: Piece[], faces: Face[], rooms: RoomOf[] = []): Block {
    const turns = new Map<JointRef, readonly [number, number]>();
    for (const p of pieces) if (p.joint?.turn) { const a = turns.get(p.joint); if (a && (Math.abs(a[0] - p.axis![0]) > 1e-12 || Math.abs(a[1] - p.axis![1]) > 1e-12)) throw new Error(`${name}: the joint ${p.joint.name} would turn about two lines`); turns.set(p.joint, p.axis!); }
    const bs = pieces.map(boundOf), lo = [0, 1, 2].map((k) => Math.min(...bs.map((b) => b[0][k]!))) as V3, hi = [0, 1, 2].map((k) => Math.max(...bs.map((b) => b[1][k]!))) as V3;
    const out = new Block(name, freeze(lo), freeze(hi), freeze(pieces), freeze(faces), freeze(rooms)); Object.freeze(out); return out;
  }
  static #shift(b: Block, d: P3): { pieces: Piece[]; faces: Face[]; rooms: RoomOf[] } {
    return { pieces: b.pieces.map((p) => ({ ...p, solid: { base: shiftPrim(p.solid.base, d), minus: p.solid.minus.map((m) => shiftPrim(m, d)) }, lines: p.lines.map((l) => ({ ...l, x: l.x + d[0], z: l.z + d[2] })), ...(p.axis ? { axis: [p.axis[0] + d[0], p.axis[1] + d[2]] as const } : {}) })),
      faces: b.faces.map((f) => ({ ...f, at: add(f.at, d) })), rooms: b.rooms.map((r) => ({ ...r, c: add(r.c, d) })) };
  }

  /** One solid at the origin: a box, a rod, a tube or a cup (open at +y, its cavity offered as a room). Its lines: a round
   *  piece's axis, and a pattern's (a circle about its axis, or points), each with the slot it offers: as far as its edge,
   *  its bore and half its neighbour. Holes of a bought piece's pattern are its openings. */
  static made(name: string, mat: string, s: { box: [number, number, number] } | { cyl: [number, number] } | { tube: [number, number, number] } | { cup: [number, number, number, number] },
    o: { joint?: Joint; bought?: boolean; pattern?: { name: string; circle?: { n: number; r: number; phase?: number }; points?: [number, number][]; hole?: number } } = {}): Block {
    const xs = 'box' in s ? s.box : 'cyl' in s ? s.cyl : 'tube' in s ? s.tube : s.cup; sizes(name, xs);
    if ('tube' in s && !(s.tube[0] < s.tube[1])) throw new Error(`${name}: a bore within its outside (${s.tube[0]} ≥ ${s.tube[1]})`);
    if ('cup' in s && !(s.cup[2] < s.cup[0] && s.cup[3] < s.cup[1])) throw new Error(`${name}: a wall within its radius and an end within its height`);
    if (o.joint !== undefined && !Joint.is(o.joint)) throw new Error(`${name}: a joint made by joint()`);
    const base: Prim = 'box' in s ? { k: 'box', c: [0, 0, 0], size: s.box } : 'cyl' in s ? { k: 'cyl', c: [0, 0, 0], r: s.cyl[0], h: s.cyl[1] } : 'tube' in s ? { k: 'cyl', c: [0, 0, 0], ri: s.tube[0], r: s.tube[1], h: s.tube[2] }
      : { k: 'cup', c: [0, 0, 0], r: s.cup[0], h: s.cup[1], wall: s.cup[2], ends: s.cup[3], open: true };
    const lines: Line[] = [], minus: Prim[] = [];
    if (base.k !== 'box') lines.push({ port: `${name}/axis`, x: 0, z: 0, slot: base.r });
    const pat = o.pattern; if (pat) {
      const pts: [number, number][] = pat.circle ? Array.from({ length: pat.circle.n }, (_, i) => { const a = (pat.circle!.phase ?? 0) + (2 * Math.PI * i) / pat.circle!.n; return [pat.circle!.r * Math.cos(a), pat.circle!.r * Math.sin(a)]; }) : (pat.points ?? []);
      if (pat.circle) sizes(`${name}/${pat.name}`, [pat.circle.n, pat.circle.r]); for (const q of pts) if (!q.every(Number.isFinite)) throw new Error(`${name}/${pat.name}: a point is finite`);
      pts.forEach((q, i) => {
        const edge = base.k === 'box' ? Math.min(base.size[0] / 2 - Math.abs(q[0]), base.size[2] / 2 - Math.abs(q[1])) : base.r - Math.hypot(q[0], q[1]) - (base.k === 'cup' ? 0 : 0);
        const bore = base.k === 'cyl' && base.ri !== undefined ? Math.hypot(q[0], q[1]) - base.ri : Infinity;
        const near = Math.min(Infinity, ...pts.filter((_, k) => k !== i).map((w) => Math.hypot(w[0] - q[0], w[1] - q[1]) / 2)), slot = Math.min(edge, bore, near);
        if (!(slot > 0)) throw new Error(`${name}/${pat.name} ${i}: the pattern lies outside the piece (its slot ${(slot * 1000).toFixed(2)} mm)`);
        if (pat.hole !== undefined) { sizes(`${name}/${pat.name} hole`, [pat.hole]); if (!(pat.hole < slot)) throw new Error(`${name}/${pat.name}: a hole of ${pat.hole * 1000} mm needs a slot of more; it has ${(slot * 1000).toFixed(2)} mm`);
          minus.push({ k: 'cyl', c: [q[0], 0, q[1]], r: pat.hole, h: (base.k === 'box' ? base.size[1] : base.h) + 2e-9 }); }
        lines.push({ port: `${name}/${pat.name}`, x: q[0], z: q[1], slot, ...(pat.hole !== undefined ? { opening: pat.hole } : {}) });
      });
    }
    const piece: Piece = { name, mat, solid: { base, minus }, lines, ...(o.joint ? { joint: o.joint, ...(o.joint.turn ? { axis: [0, 0] as const } : {}) } : {}), ...(o.bought ? { bought: true as const } : {}) };
    const rooms: RoomOf[] = base.k === 'cup' ? [{ name: `${name}/cavity`, c: [0, (base.ends) / 2, 0], r: base.r - base.wall, h: base.h - base.ends, open: true }] : [];
    return Block.#seal(name, [piece], [], rooms);
  }

  /** Blocks end to end along an axis, centred across it (or on a port's line): each next one past the last one's movers'
   *  sweeps (save what moves with it) and the fit's gap. Faces where they meet; a slide that closes a gap, a gated face. */
  static stack(name: string, axis: Axis, items: { b: Block; fit?: Fit }[], align?: string): Block {
    const pieces: Piece[] = [], faces: Face[] = [], rooms: RoomOf[] = []; let prev: number[] = [];
    for (const [i, it] of items.entries()) {
      Block.#is(it.b); if (it.fit !== undefined && !(it.fit in FITS)) throw new Error(`${name}: a fit by name (${String(it.fit)})`);
      const line = align ? it.b.pieces.flatMap((p) => p.lines.filter((l) => l.port === align)) : [], mid = it.b.lo.map((v, k) => (v + it.b.hi[k]!) / 2);
      const across = line.length ? [line[0]!.x, mid[1]!, line[0]!.z] : mid, d0 = [0, 1, 2].map((k) => (k === axis ? 0 : -across[k]!)) as V3;
      let s = Block.#shift(it.b, d0);
      if (i > 0) {
        const A = prev.map((k) => pieces[k]!), B = s.pieces, top = Math.max(...A.map((p) => (B.some((q) => !coMove(p, q)) ? boundOf(p) : primBox(p.solid.base))[1][axis]));
        const bot = Math.min(...B.map((q) => (A.some((p) => !coMove(p, q)) ? boundOf(q) : primBox(q.solid.base))[0][axis])), d: V3 = [0, 0, 0]; d[axis] = top + gapOf(it.fit ?? 'touch') - bot;
        s = Block.#shift(Block.#seal(it.b.name, s.pieces, s.faces, s.rooms), d);
      } else { const d: V3 = [0, 0, 0]; d[axis] = -it.b.lo[axis]!; s = Block.#shift(Block.#seal(it.b.name, s.pieces, s.faces, s.rooms), d); }
      const base = pieces.length; pieces.push(...s.pieces); faces.push(...s.faces.map((f) => ({ ...f, a: f.a + base, b: f.b + base })));
      // (a room open upward in one block of a stack along y is closed by what comes after it)
      rooms.push(...s.rooms.map((r) => (axis === 1 && i < items.length - 1 ? { ...r, open: false } : r)));
      const here = s.pieces.map((_, j) => base + j);
      if (i > 0) faces.push(...planeFaces(pieces, prev, here, axis, `${name}: stacked`, it.fit ?? 'touch'));
      prev = [...prev, ...here];
    }
    return Block.#seal(name, pieces, faces, rooms);
  }

  /** A host made round a child: its cavity the child's swept bound, enclosed by a cylinder about y, and the fit's gap;
   *  its wall and ends its own; open at +y if asked (its top then level with the child's). Faces round the cavity. */
  static around(name: string, mat: string, child: Block, wall: number, ends: number, fit: Fit = 'clear', open = false): Block {
    Block.#is(child); sizes(name, [wall, ends]); if (!(fit in FITS)) throw new Error(`${name}: a fit by name`);
    const g = gapOf(fit), cx = (child.lo[0] + child.hi[0]) / 2, cz = (child.lo[2] + child.hi[2]) / 2, rc = Math.max(...child.pieces.map((p) => reach(sweepOf(p), cx, cz))) + g;
    const y0 = child.lo[1] - g - ends, y1 = open ? child.hi[1] : child.hi[1] + g + ends, h = y1 - y0;
    const host: Piece = { name, mat, solid: { base: { k: 'cup', c: [cx, (y0 + y1) / 2, cz], r: rc + wall, h, wall, ends, open }, minus: [] }, lines: [{ port: `${name}/axis`, x: cx, z: cz, slot: rc + wall }] };
    const pieces = [host, ...child.pieces], faces: Face[] = child.faces.map((f) => ({ ...f, a: f.a + 1, b: f.b + 1 })), kind = g > 0 ? 'gap' : 'contact';
    child.pieces.forEach((p, i) => {
      const w = roundFace(p, cx, cz, rc - g, child.lo[1], child.hi[1], true);
      if (w.area > 0 || w.length > 0) faces.push({ a: 0, b: i + 1, kind, patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by: `${name}: round its cavity` });
    });
    // (its floor, and its lid where it is closed: as a plane each, the host on one side)
    const floor = Block.#plane(pieces, 0, child.pieces.map((_, i) => i + 1), 1, y0 + ends, g, `${name}: its floor`, true);
    const lid = open ? [] : Block.#plane(pieces, 0, child.pieces.map((_, i) => i + 1), 1, y1 - ends, g, `${name}: its lid`, false);
    return Block.#seal(name, pieces, [...faces, ...floor, ...lid], child.rooms.map((r) => ({ ...r, open: false })));
  }
  // (a host's own face on the plane y = c, against pieces beyond it (above it when up), across a gap g; a slide reaching
  // it at the end of its travel, a gated face)
  static #plane(ps: Piece[], h: number, kids: number[], axis: Axis, c: number, g: number, by: string, up: boolean): Face[] {
    const out: Face[] = [];
    for (const k of kids) { const p = ps[k]!, B = primBox(p.solid.base), near = up ? B[0][1] - c : c - B[1][1];
      const sample = (t: number, gap: number) => { const bb = boundOf(p); let n = 0, su = 0, sv = 0; const du = (bb[1][0] - bb[0][0]) / N, dv = (bb[1][2] - bb[0][2]) / N;
        for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = bb[0][0] + (a + 0.5) * du, v = bb[0][2] + (b + 0.5) * dv, y = up ? c + gap + EPS : c - gap - EPS;
          if (inPiece(p, u, y, v, t) && inSolid(ps[h]!.solid, u, up ? c - EPS : c + EPS, v)) { n++; su += u; sv += v; } }
        return n ? { area: n * du * dv, at: [su / n, c + (up ? gap / 2 : -gap / 2), sv / n] as V3 } : null; };
      if (Math.abs(near - g) < 1e-9) { const r = sample(0, g); if (r) out.push({ a: h, b: k, kind: g > 0 ? 'gap' : 'contact', patch: 'area', area: r.area, at: r.at, normal: [0, up ? 1 : -1, 0], gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by }); }
      else if (!up && p.joint?.slide && Math.abs(near - p.joint.slide - g) < 1e-9) { const r = sample(1, g); if (r) out.push({ a: h, b: k, kind: 'contact', patch: 'area', area: r.area, at: r.at, normal: [0, -1, 0], gap: p.joint.slide, medium: MEDIUM, gate: p.joint.name, by }); }
    }
    return out;
  }

  /** A passer on a line one piece of the block offers (its axis, or one of its pattern), laid from that piece's lo or hi
   *  face into it, along y. Every solid whose bound meets the passer's bound has the passer's union taken out of it:
   *  each passer piece swept over its motion relative to that solid and grown by the fit's gap. A bought solid is not
   *  cut: the passer goes through it only on one of its openings, no wider than the opening. A motion between the passer
   *  and a solid it crosses may only slide along the line or turn about it (the cut round about it); any other is refused. */
  static through(b: Block, passer: Block, on: { port: string; i?: number; from: 'lo' | 'hi' }, fit: Fit = 'tight'): Block {
    Block.#is(b); Block.#is(passer); if (!(fit in FITS)) throw new Error(`through: a fit by name`);
    const offers = b.pieces.flatMap((p, k) => p.lines.filter((l) => l.port === on.port).map((l) => ({ p, k, l })));
    if (new Set(offers.map((o) => o.k)).size > 1) throw new Error(`through: ${new Set(offers.map((o) => o.k)).size} pieces offer ${on.port}: name them apart`);
    const o = offers[on.i ?? 0]; if (!o) throw new Error(`through: ${b.name} offers no line ${on.port}${on.i !== undefined ? ` ${on.i}` : ''}`);
    const g = gapOf(fit), hb = primBox(o.p.solid.base), y0 = on.from === 'lo' ? hb[0][1] : hb[1][1];
    const pc = [(passer.lo[0] + passer.hi[0]) / 2, (passer.lo[2] + passer.hi[2]) / 2], P = Block.#shift(passer, [o.l.x - pc[0]!, on.from === 'lo' ? y0 - passer.lo[1] : y0 - passer.hi[1], o.l.z - pc[1]!]);
    const rho = Math.max(...P.pieces.map((q) => reach(sweepOf(q), o.l.x, o.l.z)));
    if (rho + g > o.l.slot + 1e-12) throw new Error(`no room on ${on.port}: the ${passer.name} needs ${((rho + g) * 1000).toFixed(2)} mm from the line; the line offers ${(o.l.slot * 1000).toFixed(2)} mm`);
    const pb = P.pieces.map(boundOf), all: [V3, V3] = [[0, 1, 2].map((k) => Math.min(...pb.map((x) => x[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...pb.map((x) => x[1][k]!))) as V3];
    const grow = (m: Prim): Prim => (m.k === 'box' ? { ...m, size: [m.size[0] + 2 * g, m.size[1], m.size[2] + 2 * g] } : { k: 'cyl', c: m.c, r: m.r + g, h: m.h });
    const onLine = (ax: readonly [number, number]) => Math.hypot(ax[0] - o.l.x, ax[1] - o.l.z) < 1e-12;
    const cutFor = (q: Piece, s: Piece): Prim => {
      if (coMove(q, s) || (!q.joint && !s.joint)) return q.solid.base;
      if (q.joint && s.joint) throw new Error(`through: the ${q.name} and the ${s.name} move on two joints (${q.joint.name}, ${s.joint.name}): refused`);
      const m = (q.joint ?? s.joint)!, mover = q.joint ? q : s;
      if (m.turn) { if (!onLine(mover.axis!)) throw new Error(`through: the ${mover.name} turns about another line than ${on.port}: refused`); const B = q.solid.base; return B.k !== 'box' && Math.hypot(B.c[0] - o.l.x, B.c[2] - o.l.z) < 1e-12 ? B : { k: 'cyl', c: [o.l.x, B.c[1], o.l.z], r: reach(B, o.l.x, o.l.z), h: B.k === 'box' ? B.size[1] : B.h }; }
      // (a slide along the line: the passer's room swept along it, up when the passer slides, down when the host does)
      return q.joint ? sweepOf(q) : (() => { const sw = sweepOf({ ...q, joint: m }), dy = -m.slide!; return shiftPrim(sw, [0, dy, 0]); })();
    };
    const pieces = b.pieces.map((s): Piece => {
      if (!meets(boundOf(s), all)) return s;
      const hit = P.pieces.filter((q, k) => meets(boundOf(s), pb[k]!)); if (!hit.length) return s;
      if (s.bought) { const op = s.lines.find((l) => l.opening !== undefined && Math.hypot(l.x - o.l.x, l.z - o.l.z) < 1e-12);
        const need = Math.max(...hit.map((q) => reach(sweepOf(q), o.l.x, o.l.z))) + g;
        if (!op) throw new Error(`through: the ${s.name} is bought and lies in the way off its openings: refused (never cut)`);
        if (need > op.opening! + 1e-12) throw new Error(`no room in the ${s.name}'s opening: the ${passer.name} needs ${(need * 1000).toFixed(2)} mm; it opens ${(op.opening! * 1000).toFixed(2)} mm`);
        return s; }
      return { ...s, solid: { base: s.solid.base, minus: [...s.solid.minus, ...hit.map((q) => grow(cutFor(q, s)))] } };
    });
    const n = pieces.length, out = [...pieces, ...P.pieces], faces: Face[] = [...b.faces, ...P.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))], kind = g > 0 ? 'gap' : 'contact';
    P.pieces.forEach((q, k) => {
      const qb = primBox(q.solid.base), Q = n + k;
      pieces.forEach((s, j) => {
        if (!meets(boundOf(s), [[qb[0][0] - g - 1e-9, qb[0][1], qb[0][2] - g - 1e-9], [qb[1][0] + g + 1e-9, qb[1][1], qb[1][2] + g + 1e-9]])) return;
        // (its side against the hole's wall, where the solid it crosses has material round it)
        const B = q.solid.base, w = B.k !== 'box' ? roundFace(s, B.c[0], B.c[2], B.r + g, qb[0][1], qb[1][1], false) : boxSide(s, q, g);
        // (or, through a bore it already has, across the gap the bore leaves)
        const SB = s.solid.base, bore = SB.k === 'cyl' && SB.ri !== undefined && B.k !== 'box' && Math.hypot(SB.c[0] - B.c[0], SB.c[2] - B.c[2]) < 1e-12 && SB.ri > B.r + g ? SB.ri - B.r : 0;
        // (only where nothing else stands in that bore between them)
        const between = bore > 0 && pieces.some((t, m) => m !== j && meets(boundOf(t), primBox({ k: 'cyl', c: B.c, r: (SB as { ri: number }).ri, h: (B as { h: number }).h })));
        if (bore && !between && !(w.area > 0 || w.length > 0)) { const sb = primBox(s.solid.base), lo = Math.max(sb[0][1], qb[0][1]), hi = Math.min(sb[1][1], qb[1][1]);
          if (hi > lo) faces.push({ a: j, b: Q, kind: 'gap', patch: 'area', area: 2 * Math.PI * (B as { r: number }).r * (hi - lo), at: [B.c[0], (lo + hi) / 2, B.c[2]], normal: [1, 0, 0], gap: bore, medium: MEDIUM, by: `${q.name} in the bore of ${s.name}` }); }
        if (w.area > 0 || w.length > 0) { const it = pressureOf(fit, 2 * (B.k !== 'box' ? B.r : Math.min(B.size[0], B.size[2]) / 2), 2 * outsideNear(s.solid.base, B.c[0], B.c[2]), q.mat, s.mat);
          faces.push({ a: j, b: Q, kind, patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), ...(it ? { interference: it } : {}), by: `${q.name} through ${s.name}` }); }
      });
      // (its ends against what lies beyond them: a head under its plies, a stud's end where a contact closes on it)
      const nearXZ = (j: number) => { const B = boundOf(pieces[j]!); return B[0][0] < qb[1][0] && qb[0][0] < B[1][0] && B[0][2] < qb[1][2] && qb[0][2] < B[1][2]; }, cand = pieces.map((_, j) => j).filter(nearXZ);
      faces.push(...Block.#ends(out, cand, Q, qb[0][1], `${q.name} on what is below it`), ...Block.#ends(out, cand, Q, qb[1][1], `${q.name} under what is above it`, true));
    });
    // (a room the passer crosses is no longer free)
    return Block.#seal(b.name, out, faces, b.rooms.filter((r) => !meets(primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h }), all)));
  }
  // (a passer's end on the plane y = c against pieces beyond it: those whose material lies just across, at rest, or at
  // the end of a slide that closes on it)
  static #ends(ps: Piece[], others: number[], q: number, c: number, by: string, up = false): Face[] {
    const out: Face[] = [], Q = ps[q]!, qb = primBox(Q.solid.base);
    for (const j of others) { const s = ps[j]!;
      for (const t of s.joint?.slide && !coMove(s, Q) && !up ? [0, 1] : [0]) {
        let n = 0, su = 0, sv = 0; const du = (qb[1][0] - qb[0][0]) / N, dv = (qb[1][2] - qb[0][2]) / N;
        for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = qb[0][0] + (a + 0.5) * du, v = qb[0][2] + (b + 0.5) * dv;
          if (inPiece(Q, u, up ? c - EPS : c + EPS, v) && inPiece(s, u, up ? c + EPS : c - EPS, v, t)) { n++; su += u; sv += v; } }
        if (n) { out.push({ a: j, b: q, kind: 'contact', patch: 'area', area: n * du * dv, at: [su / n, c, sv / n], normal: [0, up ? -1 : 1, 0], gap: t ? s.joint!.slide! : 0, ...(t ? { medium: MEDIUM, gate: s.joint!.name } : {}), by }); break; }
      }
    }
    return out;
  }

  /** A block into a room a piece of the host offers (a cup's cavity): the block's swept bound and the fit's gap within
   *  it, standing on its floor on its axis; else "no room" with both numbers. The room is then used. */
  static into(host: Block, port: string, child: Block, fit: Fit = 'clear'): Block {
    Block.#is(host); Block.#is(child); if (!(fit in FITS)) throw new Error(`into: a fit by name`);
    const r = host.rooms.find((x) => x.name === port); if (!r) throw new Error(`into: ${host.name} offers no room ${port} (it has ${host.rooms.map((x) => x.name).join(', ') || 'none'})`);
    const g = gapOf(fit), cx = (child.lo[0] + child.hi[0]) / 2, cz = (child.lo[2] + child.hi[2]) / 2, rho = Math.max(...child.pieces.map((p) => reach(sweepOf(p), cx, cz))), tall = child.hi[1] - child.lo[1];
    if (rho + g > r.r + 1e-12) throw new Error(`no room in ${port}: the ${child.name} needs ${((rho + g) * 2000).toFixed(2)} mm across; it gives ${(r.r * 2000).toFixed(2)} mm`);
    if (!r.open && tall + g > r.h + 1e-12) throw new Error(`no room in ${port}: the ${child.name} needs ${((tall + g) * 1000).toFixed(2)} mm of height; it gives ${(r.h * 1000).toFixed(2)} mm`);
    const floor = r.c[1] - r.h / 2, C = Block.#shift(child, [r.c[0] - cx, floor + g - child.lo[1], r.c[2] - cz]), n = host.pieces.length;
    const pieces = [...host.pieces, ...C.pieces], faces: Face[] = [...host.faces, ...C.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))];
    const holder = host.pieces.findIndex((p) => `${p.name}/cavity` === port);
    C.pieces.forEach((p, i) => { const w = roundFace(p, r.c[0], r.c[2], r.r - g, floor, floor + r.h, true);
      if (w.area > 0 || w.length > 0) faces.push({ a: holder, b: n + i, kind: g > 0 ? 'gap' : 'contact', patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by: `${child.name} into ${port}` }); });
    faces.push(...Block.#plane(pieces, holder, C.pieces.map((_, i) => n + i), 1, floor, g, `${child.name} on ${port}'s floor`, true));
    return Block.#seal(host.name, pieces, faces, host.rooms.filter((x) => x !== r).concat(C.rooms.map((x) => ({ ...x, open: x.open && r.open }))));
  }
  /** onto: into the space beyond a face of a block's bound, on a line it offers there (or its middle). */
  static onto(host: Block, face: '+x' | '-x' | '+y' | '-y' | '+z' | '-z', child: Block, fit: Fit = 'touch', at?: string): Block {
    const axis = ('xyz'.indexOf(face[1]!)) as Axis; return face[0] === '+' ? Block.stack(host.name, axis, [{ b: host }, { b: child, fit }], at) : Block.stack(host.name, axis, [{ b: child }, { b: host, fit }], at);
  }
  /** n copies round the y axis at radius R, each in its own wedge: refused, with both numbers, where a copy and its gap
   *  need more than the pitch gives. Its copies stand apart: the fit leaves a gap. */
  static ring(name: string, b: Block, n: number, R: number, fit: Fit = 'clear'): Block {
    Block.#is(b); sizes(name, [n, R]); if (!Number.isInteger(n) || n < 2) throw new Error(`${name}: a ring of two or more`); const g = gapOf(fit); if (!(g > 0)) throw new Error(`${name}: a ring's copies stand apart: a fit with a gap`);
    const cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2, rho = Math.max(...b.pieces.map((p) => reach(sweepOf(p), cx, cz))), half = R * Math.sin(Math.PI / n);
    if (rho + g / 2 > half + 1e-12) throw new Error(`no room in ${name}: each copy needs ${((2 * rho + g) * 1000).toFixed(2)} mm with its gap; the pitch gives ${(2 * half * 1000).toFixed(2)} mm`);
    const pieces: Piece[] = [], faces: Face[] = [];
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, s = Block.#shift(b, [R * Math.cos(a) - cx, 0, R * Math.sin(a) - cz]), k = pieces.length; pieces.push(...s.pieces.map((p) => (p.joint ? { ...p, joint: p.joint } : p))); faces.push(...s.faces.map((f) => ({ ...f, a: f.a + k, b: f.b + k }))); }
    return Block.#seal(name, pieces, faces);
  }
}
// (the least distance from a line along y to a prim's outside)
const outsideNear = (b: Prim, x: number, z: number): number => b.k === 'box' ? Math.min(b.size[0] / 2 - Math.abs(x - b.c[0]), b.size[2] / 2 - Math.abs(z - b.c[2])) : b.r - Math.hypot(x - b.c[0], z - b.c[2]);
// (a box passer's four sides against the solid it crosses, offset by the gap)
function boxSide(s: Piece, q: Piece, g: number): { area: number; length: number; at: V3 } {
  const B = q.solid.base as Extract<Prim, { k: 'box' }>, sb = primBox(s.solid.base), qb = primBox(B), y0 = Math.max(sb[0][1], qb[0][1]), y1 = Math.min(sb[1][1], qb[1][1]); if (!(y0 < y1)) return { area: 0, length: 0, at: [0, 0, 0] };
  let n = 0, tot = 0; const M = 24;
  for (const [ax, sg] of [[0, -1], [0, 1], [2, -1], [2, 1]] as const) { const w = ax === 0 ? 2 : 0, L = B.size[w];
    for (let a = 0; a < M; a++) for (let k = 0; k < M; k++) { const o: V3 = [0, y0 + ((k + 0.5) * (y1 - y0)) / M, 0]; o[ax] = B.c[ax] + sg * (B.size[ax] / 2 + g + EPS); o[w] = B.c[w] - L / 2 + ((a + 0.5) * L) / M; tot++; if (inPiece(s, ...o)) n++; } }
  return n ? { area: (n / tot) * 2 * (B.size[0] + B.size[2]) * (y1 - y0), length: 0, at: [B.c[0], (y0 + y1) / 2, B.c[2]] } : { area: 0, length: 0, at: [0, 0, 0] };
}
export const made = Block.made, stack = Block.stack, around = Block.around, through = Block.through, into = Block.into, onto = Block.onto, ring = Block.ring;

// ---- a block as the app draws it --------------------------------------------------------------------------------
const LOOK: Record<string, number> = { 'steel-low': 0x8a8c90, 'steel-alloy': 0x6e7175, copper: 0xb87333, 'al-6061': 0xc4c8cc, 'al-a380': 0xb8bcc0, abs: 0x2e3033, 'stainless-304': 0xb8bcc2 };
/** A cup's wall, floor and (when closed) lid as a profile turned about y, [radius, height] about its middle. */
const cupProfile = (b: Extract<Prim, { k: 'cup' }>): [number, number][] => {
  const h = b.h / 2, ri = b.r - b.wall;
  return b.open ? [[0, -h], [b.r, -h], [b.r, h], [ri, h], [ri, -h + b.ends], [0, -h + b.ends]] : [[0, -h], [b.r, -h], [b.r, h], [0, h], [0, h - b.ends], [ri, h - b.ends], [ri, -h + b.ends], [0, -h + b.ends]];
};
/** A block as the app's parts: each piece where the operations put it, what was taken out of it drawn as its cuts, its
 *  faces counted in what it says. Never edited back: a block is changed only by the operations. */
export function partOfBlock(b: Block): Part {
  const parts = b.pieces.map((p): Part => {
    const B = p.solid.base, cuts: Cut[] = [];
    if (B.k === 'cyl' && B.ri !== undefined) cuts.push({ r: B.ri, depth: B.h, at: [0, B.h / 2, 0], dir: [0, -1, 0] });
    for (const m of p.solid.minus) {
      const h = m.k === 'box' ? m.size[1] : m.h, at: V3 = [m.c[0] - B.c[0], m.c[1] - B.c[1] + h / 2, m.c[2] - B.c[2]];
      if (m.k === 'box') { const [w, , d] = m.size; cuts.push({ r: Math.hypot(w, d) / 2, depth: h, at, dir: [0, -1, 0], u: [1, 0, 0], sect: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] }); }
      else cuts.push({ r: m.r, depth: h, at, dir: [0, -1, 0] });
    }
    const shape: Shape = B.k === 'box' ? { box: [B.size[0], B.size[1], B.size[2]] } : B.k === 'cyl' ? { cyl: [B.r, B.h] } : { lathe: cupProfile(B) };
    return { name: p.name, item: p.name, shape, at: [B.c[0], B.c[1], B.c[2]], mat: p.mat, ...(LOOK[p.mat] !== undefined ? { color: LOOK[p.mat] } : {}), ...(cuts.length ? { cuts } : {}) };
  });
  return { name: b.name, parts, says: `${b.pieces.length} pieces, each placed by the operations; ${b.faces.length} faces where they meet` };
}
