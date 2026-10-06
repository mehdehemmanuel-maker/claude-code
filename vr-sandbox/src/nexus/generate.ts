// Generation: what a pipeline makes in the room, in words a step can say, with no one in the middle: every step is
// worked out here, from laws and the kept data, offline. A shape is placed of a matter, at a place (coordinates; on,
// under, above, below, beside, left of, right of, in front of, behind or through a part of the build or another shape;
// from one by an offset), turned any angle about x, y and z, flipped or mirrored across any axis, repeated along a
// line, round an axis or scattered at random. Its sizes are expressions over values the pipeline sets, the parts it
// sits on and the matters it is made of, so nothing is sized by hand unless it is said: a plate put on a bearing covers
// it, a shaft put through a bearing takes its bore, and `size x so …` keeps the law and finds the least size for
// which it holds, again whenever what it depends on changes. Rules hold over everything made (no overlap, a
// clearance, any condition): a step that would break one is undone and says why. Random values come from a seed, so
// what was made at random can be made again. Energy is what a law says it is: m g h to lift it, m c ΔT to heat it,
// ½ I ω² to spin it, ½ m v² to move it, each matter's values from the kept data with their sources. Every length is in
// metres, every number in SI; a number may carry its unit (40 mm, 2 kN, 20 N·m, 45 deg).

import { MATERIALS, type Material } from '../data/materials';
import { FUSION, fusible } from '../engineering/fusion';
import { motorModel, windingR } from '../engineering/dcmotor';
import { flowHeat, GLUE_K, TOUCHING_R, type HeatLink, type HeatNode, type HeatRun } from './heatflow';
import { liquidOf, runMotor, type MotorRun } from '../engineering/motorrun';
import { GEARHEADS, MOTORS, type MotorData } from '../data/motors';
import type { Jolt } from './realize';
import { simulate, type SimJoint, type SimOut, type SimThing, type SimTrack } from './sim';
import { ADHESIVES, substrateFactor } from '../engineering/joining';
import { AMBIENT, thermalOf, type ThermalProps } from '../engineering/thermal';

// ---- numbers with their units, and the expressions they are said in ---------------------------------------------------
const UNITS: [string, number][] = ([
  ['kWh', 3.6e6], ['Wh', 3600], ['MJ', 1e6], ['kJ', 1e3], ['J', 1], ['GPa', 1e9], ['MPa', 1e6], ['kPa', 1e3], ['Pa', 1],
  ['kN·m', 1e3], ['kNm', 1e3], ['N·m', 1], ['N*m', 1], ['Nm', 1], ['kN', 1e3], ['N', 1], ['kW', 1e3], ['W', 1], ['kV', 1e3], ['V', 1], ['mA', 1e-3], ['A', 1], ['L/min', 1 / 60000], ['l/min', 1 / 60000],
  ['km/h', 1 / 3.6], ['m/s', 1], ['rpm', (2 * Math.PI) / 60], ['deg', Math.PI / 180], ['°C', 1], ['°', Math.PI / 180], ['º', Math.PI / 180], ['rad', 1], ['K', 1],
  ['km', 1e3], ['mm', 1e-3], ['cm', 1e-2], ['m²', 1], ['m³', 1], ['m', 1], ['kg', 1], ['g', 1e-3], ['min', 60], ['h', 3600], ['s', 1], ['%', 0.01],
] as [string, number][]).sort((a, b) => b[0].length - a[0].length);
const LENGTH = new Set(['km', 'mm', 'cm', 'm']);
type Tok = { t: 'num'; v: number; unit?: string } | { t: 'id'; v: string } | { t: 'op'; v: string };
const ALIAS_OP: Record<string, string> = { '≤': '<=', '≥': '>=', '≠': '!=', '==': '=', '**': '^', '×': '*', '·': '*', '−': '-' };
function lex(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    if (/^\s/.test(rest)) { i++; continue; }
    const num = /^(\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(rest);
    if (num) {
      i += num[0].length; let v = Number(num[0]); const after = src.slice(i), sp = /^\s*/.exec(after)![0].length;
      const u = UNITS.find(([w]) => after.startsWith(w, sp) && !/[\p{L}\d_]/u.test(after[sp + w.length] ?? ''));
      if (u) { v *= u[1]; i += sp + u[0].length; out.push({ t: 'num', v, unit: u[0] }); } else out.push({ t: 'num', v });
      continue;
    }
    const id = /^[\p{L}_][\p{L}\d_]*(?:\.[\p{L}_][\p{L}\d_]*)*/u.exec(rest);
    if (id) { out.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = /^(<=|>=|!=|==|\*\*|[≤≥≠×·−+\-*/^()<>=,?:²³%])/.exec(rest);
    if (op) { out.push({ t: 'op', v: ALIAS_OP[op[0]] ?? op[0] }); i += op[0].length; continue; }
    throw new Error(`I cannot read "${rest.slice(0, 12)}" in "${src}"`);
  }
  return out;
}
export type Val = number | boolean;
export interface Scope { get(name: string): number | undefined; names(): string[]; /** A thing's box, for gap, dist, overlap and inside. */ box?(name: string): Box3 | null }
/** A thing's place and extents along x, y and z (an axis-aligned box round it), and what is known of it. */
export interface Box3 { at: V3; w: number; h: number; d: number; mass: number; r?: number; bore?: number; axis?: Axis }
const SPATIAL = new Set(['gap', 'dist', 'distance', 'overlap', 'overlaps', 'inside', 'touches']);
/** Whether two boxes, each turned as it stands, go into each other: the separating-axis test, over the three faces of
 *  each and the nine pairs of their edges (Gottschalk, Lin & Manocha, OBBTree, SIGGRAPH 1996). A box touching another
 *  face to face does not go into it. A thing with no turning of its own (a part of the build) is its box as it stands. */
/** How far apart two things are, each as it is turned: the most any face or edge direction parts them (the
 *  separating-axis test); less than nothing where they go into each other. It is never more than the true distance. */
export function separation(A: Box3, B: Box3): number {
  const own = (X: Box3) => { const m = X as Partial<Made>; return { R: matOf(m.turn ?? [0, 0, 0]), e: m.local ? [m.local.w / 2, m.local.h / 2, m.local.d / 2] : [X.w / 2, X.h / 2, X.d / 2] }; };
  const a = own(A), b = own(B), col = (R: M3, j: number): V3 => [R[j]!, R[3 + j]!, R[6 + j]!];
  const ua = [0, 1, 2].map((j) => col(a.R, j)), ub = [0, 1, 2].map((j) => col(b.R, j)), T: V3 = [B.at[0] - A.at[0], B.at[1] - A.at[1], B.at[2] - A.at[2]];
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], cross = (u: V3, v: V3): V3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const axes: V3[] = [...ua, ...ub]; for (const u of ua) for (const v of ub) axes.push(cross(u, v));
  let most = -Infinity;
  for (const L of axes) {
    const n = Math.hypot(L[0], L[1], L[2]); if (n < 1e-9) continue;
    const rA = a.e.reduce((t, e, i) => t + e * Math.abs(dot(ua[i]!, L)), 0), rB = b.e.reduce((t, e, i) => t + e * Math.abs(dot(ub[i]!, L)), 0);
    most = Math.max(most, (Math.abs(dot(T, L)) - rA - rB) / n);
  }
  return most;
}
/** Whether a thing lies wholly in a tube's bore, where it touches nothing of the tube. */
function inBore(T: Box3, X: Box3): boolean {
  const t = T as Partial<Made>, x = X as Partial<Made>; if (t.kind !== 'tube' || !t.dims || !t.turn || !t.axis) return false;
  const ri = t.dims.D! / 2 - t.dims.wall!, R = matOf(t.turn), Rx = matOf(x.turn ?? [0, 0, 0]), e = x.local ? [x.local.w / 2, x.local.h / 2, x.local.d / 2] : [X.w / 2, X.h / 2, X.d / 2], ax = AX[t.axis];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const v = [sx * e[0]!, sy * e[1]!, sz * e[2]!], p = [0, 1, 2].map((i) => X.at[i]! + Rx[i * 3]! * v[0]! + Rx[i * 3 + 1]! * v[1]! + Rx[i * 3 + 2]! * v[2]! - T.at[i]!);
    const q = [0, 1, 2].map((j) => R[j]! * p[0]! + R[3 + j]! * p[1]! + R[6 + j]! * p[2]!);
    if (Math.hypot(...q.filter((_, i) => i !== ax)) > ri + 1e-9) return false;
  }
  return true;
}
// going into each other by more than things touch by: resting contacts (a physics engine's settle leaves them up to
// half a millimetre in) touch, they do not overlap
const boxesOver = (A: Box3, B: Box3) => separation(A, B) < -TOUCH && !inBore(A, B) && !inBore(B, A);
/** The law of what is not computed: a thing wholly inside a solid (a box, a cylinder, a ball; not a tube's bore, a
 *  ring's hole or a cone's slope, where it may be seen) can be seen by nothing and cannot be where the solid is; a thing
 *  smaller than a tenth of a millimetre every way is below what can be drawn or made. Neither is computed: not drawn,
 *  not let go, its mass not counted, judged by no rule, until it is moved out or made bigger. Why, or null. */
function unseenIn(A: Made, all: Made[]): string | null {
  if (Math.max(A.local.w, A.local.h, A.local.d) < 1e-4) return 'smaller than a tenth of a millimetre every way: below what can be drawn or made';
  const Ra = matOf(A.turn), e = [A.local.w / 2, A.local.h / 2, A.local.d / 2], corners: V3[] = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const v: V3 = [sx * e[0]!, sy * e[1]!, sz * e[2]!]; corners.push([A.at[0] + Ra[0] * v[0] + Ra[1] * v[1] + Ra[2] * v[2], A.at[1] + Ra[3] * v[0] + Ra[4] * v[1] + Ra[5] * v[2], A.at[2] + Ra[6] * v[0] + Ra[7] * v[1] + Ra[8] * v[2]]); }
  for (const B of all) {
    if (B === A || !B.matter || !(B.kind === 'box' || B.kind === 'cylinder' || B.kind === 'sphere') || B.volume <= A.volume) continue;
    const Rb = matOf(B.turn), h = [B.local.w / 2, B.local.h / 2, B.local.d / 2], ax = AX[B.axis];
    const inB = corners.every((p) => {
      const d: V3 = [p[0] - B.at[0], p[1] - B.at[1], p[2] - B.at[2]], q: V3 = [Rb[0] * d[0] + Rb[3] * d[1] + Rb[6] * d[2], Rb[1] * d[0] + Rb[4] * d[1] + Rb[7] * d[2], Rb[2] * d[0] + Rb[5] * d[1] + Rb[8] * d[2]];
      if (B.kind === 'box') return q.every((x, i) => Math.abs(x) <= h[i]! + 1e-9);
      if (B.kind === 'sphere') return Math.hypot(...q) <= B.dims.D! / 2 + 1e-9;
      const r = Math.hypot(...q.filter((_, i) => i !== ax)); return r <= B.dims.D! / 2 + 1e-9 && Math.abs(q[ax]!) <= B.dims.h! / 2 + 1e-9;
    });
    if (inB) return `wholly inside ${B.name}, a solid: nothing could see it, and it could not be where ${B.name} is`;
  }
  return null;
}
/** Points over a thing's surface, each with the area it stands for, in the room: a box's six faces, a cylinder's side
 *  and ends, a tube's outside, bore and ends, a ball all over, each on a grid fine enough to see a millimetre. Null for
 *  a shape whose surface is not sampled here (a cone, a ring). */
function surfaceOf(X: Made): { p: V3; a: number }[] | null {
  const R = matOf(X.turn), out: { p: V3; a: number }[] = [], cells = (len: number, most = 64) => Math.max(4, Math.min(most, Math.ceil(len / 1.5e-3)));
  const put = (l: V3, a: number) => { const w = apply3(R, l); out.push({ p: [X.at[0] + w[0], X.at[1] + w[1], X.at[2] + w[2]], a }); };
  if (X.kind === 'box') {
    const e = [X.local.w / 2, X.local.h / 2, X.local.d / 2];
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
      const j = (i + 1) % 3, k = (i + 2) % 3, nj = cells(2 * e[j]!), nk = cells(2 * e[k]!), a = ((2 * e[j]!) / nj) * ((2 * e[k]!) / nk);
      for (let u = 0; u < nj; u++) for (let v = 0; v < nk; v++) { const l: V3 = [0, 0, 0]; l[i] = s * e[i]!; l[j] = -e[j]! + ((u + 0.5) * 2 * e[j]!) / nj; l[k] = -e[k]! + ((v + 0.5) * 2 * e[k]!) / nk; put(l, a); }
    }
    return out;
  }
  const ax = AX[X.axis], o1 = (ax + 1) % 3, o2 = (ax + 2) % 3, at = (r: number, th: number, z: number): V3 => { const l: V3 = [0, 0, 0]; l[ax] = z; l[o1] = r * Math.cos(th); l[o2] = r * Math.sin(th); return l; };
  if (X.kind === 'sphere') {
    const r = X.dims.D! / 2, nl = 64, nm = 128;
    for (let i = 0; i < nl; i++) { const p0 = (i / nl) * Math.PI, p1 = ((i + 1) / nl) * Math.PI, a = (2 * Math.PI * r * r * (Math.cos(p0) - Math.cos(p1))) / nm; for (let k = 0; k < nm; k++) { const ph = (p0 + p1) / 2, th = ((k + 0.5) / nm) * 2 * Math.PI; put(at(r * Math.sin(ph), th, r * Math.cos(ph)), a); } }
    return out;
  }
  if (X.kind === 'cylinder' || X.kind === 'tube') {
    const ro = X.dims.D! / 2, ri = X.kind === 'tube' ? ro - X.dims.wall! : 0, h = X.dims.h!, nt = 128, nh = cells(h), nr = cells(ro - ri, 32);
    for (const r of X.kind === 'tube' ? [ro, ri] : [ro]) for (let k = 0; k < nt; k++) for (let i = 0; i < nh; i++) put(at(r, ((k + 0.5) / nt) * 2 * Math.PI, -h / 2 + ((i + 0.5) * h) / nh), (2 * Math.PI * r * h) / (nt * nh));
    for (const z of [-h / 2, h / 2]) for (let i = 0; i < nr; i++) { const r0 = ri + ((ro - ri) * i) / nr, r1 = ri + ((ro - ri) * (i + 1)) / nr, a = (Math.PI * (r1 * r1 - r0 * r0)) / nt; for (let k = 0; k < nt; k++) put(at((r0 + r1) / 2, ((k + 0.5) / nt) * 2 * Math.PI, z), a); }
    return out;
  }
  return null;
}
/** How far a point is from a thing's surface: more than nothing outside it, less inside it. A shape not sampled here
 *  is its box. */
function surfaceDistance(X: Made, p: V3): number {
  const R = matOf(X.turn), q = applyT(R, [p[0] - X.at[0], p[1] - X.at[1], p[2] - X.at[2]]);
  if (X.kind === 'sphere') return Math.hypot(...q) - X.dims.D! / 2;
  if (X.kind === 'cylinder' || X.kind === 'tube') {
    const ax = AX[X.axis], r = Math.hypot(...q.filter((_, i) => i !== ax)), ro = X.dims.D! / 2, ri = X.kind === 'tube' ? ro - X.dims.wall! : -Infinity;
    const dr = X.kind === 'tube' ? Math.max(ri - r, r - ro) : r - ro, dz = Math.abs(q[ax]!) - X.dims.h! / 2;
    return dr <= 0 && dz <= 0 ? Math.max(dr, dz) : Math.hypot(Math.max(dr, 0), Math.max(dz, 0));
  }
  const e = [X.local.w / 2, X.local.h / 2, X.local.d / 2], d = q.map((v, i) => Math.abs(v) - e[i]!);
  return d.every((v) => v <= 0) ? Math.max(...d) : Math.hypot(...d.map((v) => Math.max(v, 0)));
}
/** Where two things touch: the area of each one's surface within half a millimetre of the other's (or up to 2 mm
 *  into it, as a thing left resting sits), the less of the two; and the middle of it. Null where nothing touches. */
function touchPatch(A: Made, B: Made): { area: number; at: V3; sampled: boolean } | null {
  const side = (X: Made, Y: Made) => { const pts = surfaceOf(X); if (!pts) return null; let a = 0; const c: V3 = [0, 0, 0]; for (const s of pts) { const d = surfaceDistance(Y, s.p); if (d <= TOUCH && d >= -2e-3) { a += s.a; c[0] += s.p[0] * s.a; c[1] += s.p[1] * s.a; c[2] += s.p[2] * s.a; } } return { a, c: (a > 0 ? c.map((v) => v / a) : c) as V3 }; };
  const sa = side(A, B), sb = side(B, A), ss = [sa, sb].filter((x): x is { a: number; c: V3 } => !!x);
  if (!ss.length) return null;
  const best = ss.reduce((x, y) => (y.a < x.a ? y : x)); if (!(best.a > 0)) return null;
  return { area: best.a, at: (sa && sa.a > 0 ? sa : best).c, sampled: ss.length === 2 };
}
/** Things touch where nothing parts them by more than this: half a millimetre. */
export const TOUCH = 5e-4;
/** Between two things: how far apart their middles are, the gap between the boxes round them, whether they go into
 *  each other (each as it is turned), touch, or one is inside the other's box. */
export function spatial(f: string, A: Box3, B: Box3): number {
  const ha = [A.w / 2, A.h / 2, A.d / 2], hb = [B.w / 2, B.h / 2, B.d / 2], dc = [0, 1, 2].map((i) => Math.abs(A.at[i]! - B.at[i]!));
  if (f === 'dist' || f === 'distance') return Math.hypot(...dc);
  const sep = dc.map((d, i) => d - ha[i]! - hb[i]!), gap = Math.hypot(...sep.map((x) => Math.max(0, x))), over = sep.every((x) => x < -1e-9);
  if (f === 'gap') return gap;
  if (f === 'overlap' || f === 'overlaps') return over && boxesOver(A, B) ? 1 : 0;
  if (f === 'touches') return !over && gap <= 1e-6 ? 1 : 0;
  return dc.every((d, i) => d + ha[i]! <= hb[i]! + 1e-9) ? 1 : 0;
}
const FN: Record<string, (...a: number[]) => number> = { sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, ln: Math.log, exp: Math.exp, pow: Math.pow };
const WORD_OP: [string[], string][] = [[['at', 'most'], '<='], [['at', 'least'], '>='], [['less', 'than'], '<'], [['more', 'than'], '>'], [['fewer', 'than'], '<'], [['under'], '<'], [['below'], '<'], [['over'], '>'], [['above'], '>'], [['is', 'not'], '!='], [['is'], '=']];
class Parser {
  private i = 0;
  constructor(private readonly ts: Tok[], private readonly scope: Scope, private readonly src: string) {}
  private peek(o = 0) { return this.ts[this.i + o]; }
  private isOp(v: string) { const t = this.peek(); return t?.t === 'op' && t.v === v; }
  private isWord(v: string, o = 0) { const t = this.peek(o); return t?.t === 'id' && t.v.toLowerCase() === v; }
  private eat(v: string) { if (!this.isOp(v) && !this.isWord(v)) throw new Error(`I expected "${v}" in "${this.src}"`); this.i++; }
  all(): Val { const v = this.ternary(); if (this.i < this.ts.length) throw new Error(`I cannot read "${this.src}" past "${this.ts.slice(0, this.i).map((t) => t.v).join(' ')}"`); return v; }
  private ternary(): Val {
    if (this.isWord('if')) { this.i++; const c = this.or(); this.eat('then'); const a = this.ternary(); this.eat('else'); const b = this.ternary(); return truthy(c) ? a : b; }
    const c = this.or();
    if (this.isOp('?')) { this.i++; const a = this.ternary(); this.eat(':'); const b = this.ternary(); return truthy(c) ? a : b; }
    return c;
  }
  private or(): Val { let a = this.and(); while (this.isWord('or')) { this.i++; const b = this.and(); a = truthy(a) || truthy(b); } return a; }
  private and(): Val { let a = this.not(); while (this.isWord('and')) { this.i++; const b = this.not(); a = truthy(a) && truthy(b); } return a; }
  private not(): Val { if (this.isWord('not')) { this.i++; return !truthy(this.not()); } return this.cmp(); }
  private cmpOp(): string | null {
    const t = this.peek(); if (t?.t === 'op' && ['<', '>', '<=', '>=', '=', '!='].includes(t.v)) { this.i++; return t.v; }
    for (const [ws, op] of WORD_OP) if (ws.every((w, k) => this.isWord(w, k))) { this.i += ws.length; return op; }
    return null;
  }
  private cmp(): Val {
    const a = this.sum(), op = this.cmpOp(); if (!op) return a;
    const x = Number(a), y = Number(this.sum()), eq = Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
    return op === '<' ? x < y && !eq : op === '>' ? x > y && !eq : op === '<=' ? x < y || eq : op === '>=' ? x > y || eq : op === '=' ? eq : !eq;
  }
  private sum(): number { let a = this.prod(); for (;;) { if (this.isOp('+')) { this.i++; a += this.prod(); } else if (this.isOp('-')) { this.i++; a -= this.prod(); } else return a; } }
  // after a value, "x" can only mean times: B x D
  private prod(): number { let a = this.unary(); for (;;) { if (this.isOp('*') || this.isWord('x')) { this.i++; a *= this.unary(); } else if (this.isOp('/')) { this.i++; a /= this.unary(); } else return a; } }
  private unary(): number { if (this.isOp('-')) { this.i++; return -this.unary(); } if (this.isOp('+')) { this.i++; return this.unary(); } return this.pow(); }
  private pow(): number { const b = this.post(); if (this.isOp('^')) { this.i++; return b ** this.unary(); } return b; }
  private post(): number { let v = this.primary(); for (;;) { if (this.isOp('²')) { this.i++; v = v ** 2; } else if (this.isOp('³')) { this.i++; v = v ** 3; } else if (this.isOp('%')) { this.i++; v = v / 100; } else return v; } }
  private primary(): number {
    const t = this.peek(); if (!t) throw new Error(`"${this.src}" ends before it says what it is`);
    if (t.t === 'num') { this.i++; return t.v; }
    if (t.t === 'op' && t.v === '(') { this.i++; const v = Number(this.ternary()); this.eat(')'); return v; }
    if (t.t === 'id') {
      this.i++; const k0 = t.v.toLowerCase();
      if (SPATIAL.has(k0) && this.isOp('(')) {
        this.i++; const a = this.peek(); this.i++; this.eat(','); const b = this.peek(); this.i++; this.eat(')');
        if (a?.t !== 'id' || b?.t !== 'id') throw new Error(`${k0}( ) takes two things by name: ${k0}(cap, bearing)`);
        const A = this.scope.box?.(a.v), B = this.scope.box?.(b.v); if (!A || !B) throw new Error(`I know no thing named ${!A ? a.v : b.v}`);
        return spatial(k0, A, B);
      }
      const f = FN[k0];
      if (f && this.isOp('(')) { this.i++; const args: number[] = []; if (!this.isOp(')')) { args.push(Number(this.ternary())); while (this.isOp(',')) { this.i++; args.push(Number(this.ternary())); } } this.eat(')'); return f(...args); }
      const k = t.v.toLowerCase(); if (k === 'pi' || k === 'π') return Math.PI;
      const v = this.scope.get(t.v); if (v !== undefined) return v;
      // "BxD": B times D, where each is known and the whole is not
      if (/[x×]/.test(t.v)) { const ps = t.v.split(/[x×]/); if (ps.length > 1 && ps.every(Boolean)) { const vs = ps.map((q) => this.scope.get(q)); if (vs.every((q) => q !== undefined)) return vs.reduce((a, q) => a! * q!, 1)!; } }
      const known = this.scope.names(); throw new Error(`I do not know "${t.v}"${known.length ? `: I know ${known.slice(0, 14).join(', ')}${known.length > 14 ? ', …' : ''}` : ''}`);
    }
    throw new Error(`I cannot read "${t.v}" where a value should be, in "${this.src}"`);
  }
}
const truthy = (v: Val) => (typeof v === 'boolean' ? v : v !== 0);
/** What an expression comes to: a number in SI, or yes or no. */
export function calc(src: string, scope: Scope): Val { return new Parser(lex(src), scope, src).all(); }
export function num(src: string, scope: Scope): number { const v = calc(src, scope); if (typeof v === 'boolean') throw new Error(`"${src}" is a condition, not a number`); if (!Number.isFinite(v)) throw new Error(`"${src}" comes to ${v}`); return v; }
export function truth(src: string, scope: Scope): boolean { return truthy(calc(src, scope)); }
/** A scope of plain numbers (the facts a check reads). */
export const scopeOf = (facts: Record<string, number>): Scope => ({ get: (n) => facts[n], names: () => Object.keys(facts) });

// ---- matters, from the kept data -------------------------------------------------------------------------------------
const MATTER_WORDS: [RegExp, string][] = [
  [/^(steel|mild steel|structural steel|a36)$/, 'steel.a36'], [/^(1018|cold drawn steel)$/, 'steel.1018-cd'], [/^(4140|alloy steel)$/, 'steel.4140-ann'],
  [/^(bearing steel|chrome steel|52100)$/, 'steel.52100'], [/^(spring steel|music wire)$/, 'steel.music-wire'], [/^(stainless|stainless steel|304)$/, 'stainless.304'], [/^316$/, 'stainless.316'],
  [/^(cast iron|grey iron|gray iron|iron)$/, 'cast-iron.gray-30'], [/^(aluminium|aluminum|alu|6061)$/, 'aluminum.6061-t6'], [/^7075$/, 'aluminum.7075-t6'], [/^5052$/, 'aluminum.5052-h32'], [/^2024$/, 'aluminum.2024-t3'],
  [/^copper$/, 'copper.c110'], [/^brass$/, 'brass.c360'], [/^(titanium|ti)$/, 'titanium.ti6al4v'], [/^(wood|plywood|birch)$/, 'wood.birch-plywood'], [/^mdf$/, 'wood.mdf'],
  [/^(nylon|printed nylon|pa)$/, 'polymer.nylon-microcarbon'], [/^(acrylic|pmma|perspex|plexiglass)$/, 'polymer.pmma'], [/^rubber$/, 'rubber.natural'], [/^glass$/, 'glass.soda-lime'],
  [/^concrete$/, 'concrete.c30'], [/^brick$/, 'ceramic.clay-brick'], [/^(carbon|carbon fibre|carbon fiber|cfrp)$/, 'composite.cfrp'], [/^(fibreglass|fiberglass|gfrp)$/, 'composite.gfrp'],
  [/^(foam|eva)$/, 'foam.eva'], [/^cork$/, 'cork.agglomerated'], [/^leather$/, 'leather.veg-tan'], [/^canvas$/, 'textile.canvas'], [/^phenolic$/, 'polymer.phenolic'],
];
/** A matter by its word, its id or its name. */
export function matterOf(word: string): Material {
  const w = word.trim().toLowerCase().replace(/^(an?|the)\s+/, '');
  const id = MATTER_WORDS.find(([re]) => re.test(w))?.[1];
  const m = MATERIALS.find((x) => x.id === (id ?? w)) ?? MATERIALS.find((x) => x.name.toLowerCase().includes(w) || x.id.includes(w));
  if (!m) throw new Error(`I know no matter "${word}". I know steel, stainless, cast iron, aluminium (6061, 7075, 5052, 2024), copper, brass, titanium, wood, MDF, nylon, acrylic, rubber, glass, concrete, brick, carbon fibre, fibreglass, foam, cork, leather, canvas.`);
  return m;
}
const matterValue = (m: Material, prop: string): number | undefined => {
  if (prop === 'density' || prop === 'rho' || prop === 'ρ') return m.density;
  if (prop === 'yield') return m.yield; if (prop === 'ultimate') return m.ultimate; if (prop === 'E' || prop === 'modulus') return m.E;
  if (prop === 'c' || prop === 'cp' || prop === 'heat') { try { return thermalOf(m).c; } catch { return undefined; } }
  if (prop === 'k' || prop === 'conductivity') { try { return thermalOf(m).k; } catch { return undefined; } }
  return undefined;
};

// ---- shapes ----------------------------------------------------------------------------------------------------------
export type Kind = 'box' | 'cylinder' | 'tube' | 'sphere' | 'cone' | 'torus' | 'plane' | 'circle' | 'title';
export type Axis = 'x' | 'y' | 'z';
export type V3 = [number, number, number];
const KINDS: Record<string, Kind> = {
  box: 'box', block: 'box', cube: 'box', plate: 'box', tile: 'box', slab: 'box', bar: 'box', beam: 'box', wall: 'box', shelf: 'box', base: 'box', brick: 'box',
  motor: 'cylinder', gearhead: 'cylinder', gearbox: 'cylinder', cylinder: 'cylinder', rod: 'cylinder', shaft: 'cylinder', pin: 'cylinder', peg: 'cylinder', axle: 'cylinder', post: 'cylinder', column: 'cylinder', disc: 'cylinder', disk: 'cylinder', puck: 'cylinder', wheel: 'cylinder',
  tube: 'tube', pipe: 'tube', sleeve: 'tube', bush: 'tube', bushing: 'tube', spacer: 'tube', collar: 'tube',
  sphere: 'sphere', ball: 'sphere', cone: 'cone', torus: 'torus', ring: 'torus', donut: 'torus', 'o-ring': 'torus',
  plane: 'plane', sheet: 'plane', surface: 'plane', panel: 'plane', floor: 'plane', circle: 'circle', title: 'title', label: 'title', sign: 'title', text: 'title',
};
/** The sizes each shape is said by, in the order a size is given ("40 x 40 x 3 mm"). */
export const DIMS: Record<Kind, string[]> = { box: ['w', 'd', 'h'], cylinder: ['D', 'h'], tube: ['D', 'h', 'wall'], sphere: ['D'], cone: ['D', 'h'], torus: ['D', 'dt'], plane: ['w', 'd'], circle: ['D'], title: ['w'] };
const THIN = /^(plate|tile|slab|sheet|panel|shelf|base|wall)$/, LONG = /^(rod|shaft|pin|peg|axle|post|column)$/, FLAT = /^(disc|disk|puck|wheel)$/;
export interface PartRef { name: string; at: V3; w: number; h: number; d: number; mass: number; r?: number; bore?: number; axis?: Axis }
export interface World { parts(): PartRef[]; facts?(): Record<string, number> }
type Side = 'on' | 'under' | 'above' | 'below' | 'beside' | 'left' | 'right' | 'front' | 'behind' | 'in';
type Place =
  | { how: 'at'; x: string; y: string; z: string }
  | { how: Side; of: string; by: string; dx?: string; dz?: string }
  | { how: 'off'; of: string; dx: string; dy: string; dz: string }
  | { how: 'round'; of: string; about: string; i: number; n: number }
  | { how: 'free' };
/** A size kept as the law it was sized by: solved again whenever it is read, so it follows what it depends on. */
interface Law { cond: string; lo: string | null; hi: string | null; half: boolean }
interface Flip { axis: Axis; through: string | null }
interface Spec { /** a gearhead: its datasheet */ gearhead?: string; /** broken under a load put on it */ broken?: boolean; /** who made it: a pipeline's board, or you */ by?: string; /** a motor: its datasheet */ motor?: string; /** a mass its maker gives, kg */ massGiven?: number; name: string; kind: Kind; word: string; dims: Record<string, string>; laws: Record<string, Law>; axis: Axis | null; matter: string | null; place: Place; turn: [string, string, string]; flips: Flip[]; text?: string; copyOf?: string; /** Stretched unevenly where its own sizes cannot say it: factors along its own x, y, z. */ scale: V3 }
/** Shapes joined into one piece: named, moved, turned, flipped and stretched as one; its mass and volume the union's. */
/** How two members of a piece hold together: fused into one solid, glued, or bolted; a group's members are not held. */
interface Bond { a: string; b: string; how: 'fused' | 'glued' | 'bolted'; with?: string; why: string }
interface Group { name: string; members: string[]; move: V3; turn: V3; flips: Flip[]; stretch: V3; bonds?: Bond[]; /** moved as one, not connected */ loose?: boolean }
type JoinHow = 'any' | 'fuse' | 'glue' | 'bolt' | 'group';
/** A joint: what turns or slides (a), on what holds it (b: a thing made here, or a part of the build), about or along an
 *  axis through where they touched. Its point and axis are kept in a's own frame, so they go where a goes. */
interface Joint { kind: 'hinge' | 'slide'; a: string; b: string; fixed: boolean; pivot: V3; axis: V3; limits?: [number, number]; friction?: number; drive?: { motor: string; V: number; gear?: string; /** rad/s it is held at, by a speed controller */ hold?: number } }
/** A rule over everything made: a condition, or that nothing overlaps, or a clearance between things. */
/** A rule, and who said it: a pipeline's "no overlap" or clearance holds over what that pipeline makes; a condition, over what it names. */
type Rule = ({ text: string; kind: 'cond' } | { text: string; kind: 'apart'; withBuild: boolean } | { text: string; kind: 'clear'; d: string }) & { by: string };
/** A shape as it stands: its sizes, where its middle is, how it is turned (radians about x, y, z), its extents along
 *  x, y and z as turned, its extents as made, and what follows from them. */
/** A chart: panels of one quantity each, its series over time. */
export interface Chart { title: string; note: string; /** what time is counted in on its axis: s unless said */ tUnit?: string; panels: { label: string; unit: string; series: { name: string; t: number[]; v: number[] }[] }[] }
export interface Made { /** a motor: its datasheet, and how fast it was left turning, rad/s */ motor?: string; spin?: number; /** broken under a load put on it */ broken?: boolean; /** its temperature, deg C, where heat has been put in it or has flowed */ temp?: number;
  /** Why it is not computed: wholly inside a solid, or too small to be. Not drawn, not let go, not weighed, not judged. */ unseen?: string; name: string; kind: Kind; word: string; matter: Material | null; axis: Axis; dims: Record<string, number>; at: V3; turn: V3; local: { w: number; h: number; d: number }; scale: V3; w: number; h: number; d: number; volume: number; area: number; mass: number; text?: string; group?: string }
/** A joined piece as it stands: its members, the box round them, and the union's volume and mass (exact, or sampled). */
export interface Joined { name: string; members: string[]; at: V3; w: number; h: number; d: number; volume: number; mass: number; exact: boolean; within: number; axis?: Axis }
const mm = (v: number) => (Math.abs(v) < 1e-9 ? '0 mm' : Math.abs(v) >= 1 ? `${+v.toPrecision(4)} m` : `${+(v * 1e3).toPrecision(3)} mm`);
const kg = (v: number) => (v >= 1 ? `${+v.toPrecision(4)} kg` : `${+(v * 1e3).toPrecision(3)} g`);
const joules = (v: number) => `${+v.toPrecision(4)} J${v >= 360 ? ` (${+(v / 3600).toPrecision(3)} Wh)` : ''}`;
const fmt = (v: number) => (Number.isInteger(v) && Math.abs(v) < 1e6 ? String(v) : v !== 0 && Math.abs(v) < 1e-3 ? v.toExponential(3).replace(/\.?0+e/, 'e') : String(+v.toPrecision(4)));
const deg = (r: number) => `${+((r * 180) / Math.PI).toFixed(1)}°`;
const extents = (axis: Axis, across: number, along: number): { w: number; h: number; d: number } => (axis === 'x' ? { w: along, h: across, d: across } : axis === 'z' ? { w: across, h: across, d: along } : { w: across, h: along, d: across });
const AX: Record<Axis, number> = { x: 0, y: 1, z: 2 };

// ---- turning: Euler angles about x, then y, then z, as three.js composes them ('XYZ') ------------------------------------
export type M3 = [number, number, number, number, number, number, number, number, number];
export function matOf([x, y, z]: V3): M3 {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c];
}
export function eulerOf(m: M3): V3 {
  const y = Math.asin(Math.max(-1, Math.min(1, m[2])));
  return Math.abs(m[2]) < 0.9999999 ? [Math.atan2(-m[5], m[8]), y, Math.atan2(-m[1], m[0])] : [Math.atan2(m[7], m[4]), y, 0];
}
const mul3 = (a: M3, b: M3): M3 => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!)) as M3;
const apply3 = (m: M3, v: V3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const applyT = (m: M3, v: V3): V3 => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
const square = (t: V3) => t.every((a) => Math.abs(a / (Math.PI / 2) - Math.round(a / (Math.PI / 2))) < 1e-9);
/** Mirrored across the plane square to an axis, a turning is that turning seen in a mirror: M R M. */
function mirrorTurn(t: V3, axis: Axis): V3 { const m = matOf(t), s = [1, 1, 1]; s[AX[axis]] = -1; return eulerOf(m.map((v, k) => v * s[Math.floor(k / 3)]! * s[k % 3]!) as M3); }
/** The box round a turned shape: each extent along x, y and z of its own box once turned. */
function turnedBox(local: { w: number; h: number; d: number }, t: V3): { w: number; h: number; d: number } {
  if (!t[0] && !t[1] && !t[2]) return local;
  const m = matOf(t), e = [local.w, local.h, local.d];
  const along = (i: number) => Math.abs(m[i * 3]!) * e[0]! + Math.abs(m[i * 3 + 1]!) * e[1]! + Math.abs(m[i * 3 + 2]!) * e[2]!;
  return { w: along(0), h: along(1), d: along(2) };
}

// ---- random, from a seed, so what was made at random can be made again ---------------------------------------------------
function draw(state: { s: number }): number { let t = (state.s = (state.s + 0x6d2b79f5) | 0); t = Math.imul(t ^ (t >>> 15), 1 | t); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
/** The arguments of a call, split at its own commas. */
function argsAt(s: string, open: number): { args: string[]; end: number } {
  const args: string[] = []; let depth = 0, start = open + 1;
  for (let i = open; i < s.length; i++) {
    const c = s[i]; if (c === '(') depth++; else if (c === ')') { depth--; if (depth === 0) { args.push(s.slice(start, i).trim()); return { args: args.filter((a, k) => a || k > 0), end: i + 1 }; } } else if (c === ',' && depth === 1) { args.push(s.slice(start, i).trim()); start = i + 1; }
  }
  throw new Error(`a ( in "${s}" is never closed`);
}

/** Standing actions: several steps as one, called by name on anything, every size in them worked out from what they
 *  are given, with the conditions that change them. Written in the steps' own words, so "show action mount" shows
 *  exactly how a mount is worked out. Laws: a plate across its bolts as a beam loaded at its middle, σ = 3 F L / (2 b h²),
 *  at half its yield; a leg as an Euler column, P ≤ π² E I / (3 L²) with I = π D⁴ / 64 (a factor of 3), and in
 *  compression at half its yield. The edge a mount reaches past what it holds, 15 % of its size and at least 10 mm, and
 *  a cover's clearance, 5 % of its size and at least 5 mm, are rules of thumb, said as such; so is a mount's matter: one that
 *  yields under 100 MPa (wood, concrete, plastics) does not hold a bolt's preload, so the mount is aluminium, and steel
 *  past 20 kg. */
export const STANDING: string[] = [
  `action mount {X} [on {Y}]: default {X}_load = 0 N; set {X}_edge = max(10 mm, 0.15 * max({X}.w, {X}.d));
   place plate named {X}_mount under {X} size {X}.w + 2 * {X}_edge x {X}.d + 2 * {X}_edge x 3 mm;
   if {X}_mount.yield < 100 MPa then material aluminium for {X}_mount;
   if {X}.mass > 20 kg then material steel for {X}_mount;
   size {X}_mount.h so 3 * ({X}.mass * g + {X}_load) * {X}_mount.w / (2 * {X}_mount.d * {X}_mount.h^2) <= {X}_mount.yield / 2 between 2 mm and 60 mm;
   if {X}.made = 1 then bolt {X} and {X}_mount as {X}_mounted;
   if {X}.made = 1 then move {X}_mounted on {Y} else move {X}_mount on {Y};
   if {X}.made = 1 and {Y}.made = 1 then bolt {X}_mounted and {Y}`,
  `action support {X}: default {X}_floor = 0 m; set {X}_rise = {X}.bottom - {X}_floor;
   require {X}_rise > 1 mm: {X} stands on the floor already, so there is nothing under it to support;
   set {X}_n = if {X}.w > 1.2 m or {X}.d > 1.2 m then 6 else 4; set {X}_P = {X}.mass * g / {X}_n;
   size {X}_legD so {X}_P <= pi^2 * E * pi * {X}_legD^4 / 64 / (3 * {X}_rise^2) and 4 * {X}_P / (pi * {X}_legD^2) <= yield / 2 between 5 mm and 300 mm;
   place rod named {X}_leg1 at {X}.left + {X}_legD / 2, {X}_floor + {X}_rise / 2, {X}.back + {X}_legD / 2 size {X}_legD x {X}_rise;
   place rod named {X}_leg2 at {X}.right - {X}_legD / 2, {X}_floor + {X}_rise / 2, {X}.back + {X}_legD / 2 size {X}_legD x {X}_rise;
   place rod named {X}_leg3 at {X}.left + {X}_legD / 2, {X}_floor + {X}_rise / 2, {X}.front - {X}_legD / 2 size {X}_legD x {X}_rise;
   place rod named {X}_leg4 at {X}.right - {X}_legD / 2, {X}_floor + {X}_rise / 2, {X}.front - {X}_legD / 2 size {X}_legD x {X}_rise;
   if {X}_n = 6 then place rod named {X}_leg5 at {X}.x, {X}_floor + {X}_rise / 2, {X}.back + {X}_legD / 2 size {X}_legD x {X}_rise;
   if {X}_n = 6 then place rod named {X}_leg6 at {X}.x, {X}_floor + {X}_rise / 2, {X}.front - {X}_legD / 2 size {X}_legD x {X}_rise;
   if {X}.made = 1 then join {X} and {X}_leg1, {X}_leg2, {X}_leg3, {X}_leg4 as {X}_stand;
   if {X}.made = 1 and {X}_n = 6 then join {X}_stand and {X}_leg5, {X}_leg6`,
  `action cover {X}: set {X}_gap = max(5 mm, 0.05 * max({X}.w, {X}.h, {X}.d)); default {X}_wall = 2 mm;
   place plate named {X}_lid at {X}.x, {X}.top + {X}_gap + {X}_wall / 2, {X}.z size {X}.w + 2 * ({X}_gap + {X}_wall) x {X}.d + 2 * ({X}_gap + {X}_wall) x {X}_wall;
   place plate named {X}_left at {X}.left - {X}_gap - {X}_wall / 2, {X}.bottom + ({X}.h + {X}_gap) / 2, {X}.z size {X}_wall x {X}.d + 2 * {X}_gap x {X}.h + {X}_gap;
   place plate named {X}_right at {X}.right + {X}_gap + {X}_wall / 2, {X}.bottom + ({X}.h + {X}_gap) / 2, {X}.z size {X}_wall x {X}.d + 2 * {X}_gap x {X}.h + {X}_gap;
   place plate named {X}_back at {X}.x, {X}.bottom + ({X}.h + {X}_gap) / 2, {X}.back - {X}_gap - {X}_wall / 2 size {X}.w + 2 * ({X}_gap + {X}_wall) x {X}_wall x {X}.h + {X}_gap;
   place plate named {X}_front at {X}.x, {X}.bottom + ({X}.h + {X}_gap) / 2, {X}.front + {X}_gap + {X}_wall / 2 size {X}.w + 2 * ({X}_gap + {X}_wall) x {X}_wall x {X}.h + {X}_gap;
   join {X}_lid, {X}_left, {X}_right, {X}_back, {X}_front as {X}_cover`,
  `action stack {X} on {Y}: move {X} on {Y}; if {X}.made = 1 and {Y}.made = 1 then join {X} and {Y}`,
];
/** The motor a placing asks for: by its power ("150 W"), its kind ("coreless", "brushed"), or else the first kept. */
function motorFor(said: string): MotorData {
  const all = Object.values(MOTORS), w = /(\d+(?:\.\d+)?)\s*W\b/.exec(said), power = (d: MotorData) => Number(/(\d+)\s*W/.exec(d.label)?.[1] ?? d.published.rated?.power ?? 0);
  // named by its catalogue id, in brackets: that one
  const byId = all.find((d) => said.includes(`(${d.id})`)); if (byId) return byId;
  if (w) return all.reduce((a, b) => (Math.abs(power(b) - Number(w[1])) < Math.abs(power(a) - Number(w[1])) ? b : a));
  return all.find((d) => /coreless/i.test(said) && /coreless/i.test(d.label)) ?? all.find((d) => /brushed/i.test(said) && /^Brushed/i.test(d.label)) ?? all[0]!;
}
interface Standing { name: string; header: { word: string; param: boolean; optional: boolean }[]; body: string[]; text: string; builtIn: boolean }
const CALL_VERBS = /^(hinge|slide|unhinge|unslide|heat|warm|cool|run|simulate|drop|push|let|load|chart|repeat|for|while|parts|bom|calc|calculate|compute|set|let|material|matter|use|place|put|add|surface|size|resize|energy|move|rotate|turn|flip|mirror|remove|delete|clear|pattern|copy|scatter|rule|rules|seed|report|expand|stretch|grow|shrink|squash|join|connect|attach|combine|unite|merge|fuse|weld|glue|bond|bolt|screw|rivet|group|split|if|action|actions|show|default|require)$/i;

export class Workshop {
  private vars = new Map<string, string>(); private unitOf = new Map<string, string>(); private laws = new Map<string, Law>();
  private specs = new Map<string, Spec>(); private count = new Map<string, number>(); private rulesKept: Rule[] = []; private groups = new Map<string, Group>();
  private rand: { s: number };
  matter: Material = matterOf('aluminium'); private matterSaid = 'aluminium'; private by = '';
  private actions = new Map<string, Standing>(); private depth = 0;
  /** Each motor's last run, and how fast it was left turning. */
  private runsKept = new Map<string, MotorRun>(); private spins = new Map<string, number>();
  /** The physics engine, once it is loaded; and the last motion it worked out, for the room to show. */
  private J: Jolt | null = null; private track: SimTrack | null = null; private lastSim: SimOut | null = null; private chartKept: Chart | null = null;
  /** Hinges and slides; each thing's temperature where it is not the room's, and the heat put into it; the last flow of heat. */
  private jointsKept: Joint[] = []; private temps = new Map<string, number>(); private heaters = new Map<string, number>(); private heatKept: { names: string[]; run: HeatRun; seconds: number } | null = null;
  /** The last chart asked for, taken once: the room draws it. */
  takeChart(): Chart | null { const c = this.chartKept; this.chartKept = null; return c; }
  usePhysics(J: Jolt): void { this.J = J; }
  get hasPhysics(): boolean { return !!this.J; }
  /** The last motion worked out, taken once: the room shows it as it happened. */
  takeTrack(): SimTrack | null { const t = this.track; this.track = null; return t; }
  constructor(private readonly world: World, seed = 1) { this.rand = { s: seed | 0 }; for (const a of STANDING) this.define(a, true); }
  // -- reading values: the pipeline's own, its shapes', the build's parts', the matters', the room's --------------------
  /** What a step reads. Within a piece, a member is placed and sized by the others as they stand before the piece
   *  moves them (the piece's move, turn and stretch come after), so a member never reads itself through the piece. */
  private scope(over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>, within?: Group): Scope {
    const self = this, read = (n: string) => (within?.members.includes(n) ? self.madeOf(n, over, busy, memo, true) : self.boxOf(n, over, busy, memo));
    const sc: Scope = {
      get(name) {
        if (over.has(name)) return over.get(name);
        if (name === 'g') return 9.80665;
        const law = self.laws.get(name);
        if (law) { if (busy.has(`var:${name}`)) throw new Error(`${name} is sized from itself`); busy.add(`var:${name}`); try { return self.least(name, law, sc); } finally { busy.delete(`var:${name}`); } }
        const e = self.vars.get(name);
        if (e !== undefined) { if (busy.has(`var:${name}`)) throw new Error(`${name} is sized from itself`); busy.add(`var:${name}`); try { return num(e, sc); } finally { busy.delete(`var:${name}`); } }
        if (/^(density|rho|ρ|yield|ultimate|E|modulus|c|cp|k)$/.test(name)) return matterValue(self.matter, name);
        // everything made, together: how many, its mass and volume
        if (name === 'made' || name === 'made.count') return self.specs.size;
        if (name === 'made.mass' || name === 'made.volume') { let t = 0; const seen = self.all().made; for (const m of seen) if (!m.unseen) t += name === 'made.mass' ? m.mass : m.volume; return t; }
        const dot = name.indexOf('.');
        if (dot > 0) {
          const head = name.slice(0, dot), prop = name.slice(dot + 1);
          // made here (1), or a part of the build, or nothing (0)
          if (prop === 'made') return self.specs.has(head) || self.groups.has(head) ? 1 : 0;
          if (prop === 'unseen' && self.specs.has(head)) return self.all().made.find((m) => m.name === head)?.unseen ? 1 : 0;
          const b = read(head); if (b) return propOf(b, prop);
          try { const m = matterOf(head); const v = matterValue(m, prop); if (v !== undefined) return v; } catch { /* not a matter */ }
        }
        return self.world.facts?.()[name];
      },
      names: () => [...self.vars.keys(), ...self.laws.keys(), ...[...self.specs.keys()].map((s) => `${s}.mass`), 'density', 'yield', 'E', 'c', ...Object.keys(self.world.facts?.() ?? {})],
      box: (name) => read(name),
    };
    return sc;
    function propOf(b: Box3 | Made | Joined, prop: string): number | undefined {
      const p = b as Box3 & Partial<Made>, x = b.at, D = p.dims?.D ?? (p.r !== undefined ? 2 * p.r : undefined);
      const v: Record<string, number | undefined> = {
        x: x[0], y: x[1], z: x[2], w: b.w, h: b.h, d: b.d, top: x[1] + b.h / 2, bottom: x[1] - b.h / 2, right: x[0] + b.w / 2, left: x[0] - b.w / 2, front: x[2] + b.d / 2, back: x[2] - b.d / 2,
        mass: b.mass, D, r: D !== undefined ? D / 2 : undefined, bore: p.bore, volume: p.volume, area: p.area, t: p.dims?.h ?? b.h, wall: p.dims?.wall, dt: p.dims?.dt,
        // along its axis: a shaft's length, a bearing's width
        length: p.dims?.h ?? (p.axis === 'x' ? b.w : p.axis === 'z' ? b.d : b.h),
        rx: p.turn?.[0], ry: p.turn?.[1], rz: p.turn?.[2],
        // its own extents, as made, before it is turned: what a thing put on it is sized by
        lw: p.local?.w ?? b.w, lh: p.local?.h ?? b.h, ld: p.local?.d ?? b.d,
        // its temperature, deg C: the room's until heat is put in it or flows
        temperature: p.temp ?? (p.matter ? AMBIENT : undefined),
      };
      if (prop in v && v[prop] !== undefined) return v[prop];
      if (p.matter) return matterValue(p.matter, prop);
      return undefined;
    }
  }
  /** A thing by the word for it: a shape made here by its name, else a part of the build (the first whose name has the word; "bearing 2", the second). */
  private boxOf(word: string, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>): Box3 | Made | Joined | null {
    if (this.groups.has(word)) return this.joinedOf(word, over, busy, memo);
    if (this.specs.has(word)) return this.madeOf(word, over, busy, memo);
    return this.partOf(word);
  }
  private partOf(word: string): PartRef | null {
    const m = /^(.*?)(?:[ _#-]?(\d+))?$/.exec(word.replace(/_/g, ' '))!, w = m[1]!.trim().toLowerCase(), k = Number(m[2] ?? 1);
    if (!w) return null;
    const all = this.world.parts().filter((p) => p.name.toLowerCase().includes(w));
    return all[k - 1] ?? all[0] ?? null;
  }
  private madeOf(name: string, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>, raw = false): Made {
    const key = raw ? `raw:${name}` : name, hit = over.size ? undefined : memo.get(key); if (hit) return hit;
    const grp = raw ? undefined : this.groupOf(name);
    if (grp && !identity(grp)) { const m = this.moved(this.madeOf(name, over, busy, memo, true), grp, over, busy, memo); if (!over.size) memo.set(key, m); return m; }
    const s = this.specs.get(name); if (!s) throw new Error(`Nothing named ${name} is made here`);
    if (busy.has(`shape:${name}`)) throw new Error(`${name} is placed or sized from itself`);
    busy.add(`shape:${name}`);
    try {
      const within = raw ? this.groupOf(name) : undefined, sc = this.scope(over, busy, memo, within), dims: Record<string, number> = {};
      for (const k of DIMS[s.kind]) { const o = over.get(`${name}.${k}`), law = s.laws[k]; dims[k] = o ?? (law ? this.least(`${name}.${k}`, law, sc) : num(s.dims[k]!, sc)); if (!(dims[k]! > 0)) throw new Error(`${name}'s ${k} comes to ${mm(dims[k]!)}: a size must be more than nothing`); }
      const target = 'of' in s.place ? (within?.members.includes(s.place.of) ? this.madeOf(s.place.of, over, busy, memo, true) : this.boxOf(s.place.of, over, busy, memo)) : null;
      if ('of' in s.place && !target) throw new Error(this.noPart(s.place.of));
      const axis: Axis = s.axis ?? (s.kind === 'cylinder' || s.kind === 'tube' || s.kind === 'cone' ? (s.place.how === 'in' && target?.axis ? target.axis : 'y') : 'y');
      const g = geometry(s.kind, dims, axis), mt = s.kind === 'plane' || s.kind === 'circle' || s.kind === 'title' ? null : (s.matter ? matterOf(s.matter) : this.matter);
      let turn: V3 = [num(s.turn[0], sc), num(s.turn[1], sc), num(s.turn[2], sc)];
      // stretched unevenly where its own sizes cannot say it: its volume is the stretch's product; its area, known only when even
      const k = s.scale ?? [1, 1, 1], even = Math.abs(k[0] - k[1]) < 1e-12 && Math.abs(k[1] - k[2]) < 1e-12;
      if (k[0] !== 1 || k[1] !== 1 || k[2] !== 1) { g.w *= k[0]; g.h *= k[1]; g.d *= k[2]; g.volume *= k[0] * k[1] * k[2]; g.area = even ? g.area * k[0] * k[0] : NaN; }
      const local = { w: g.w, h: g.h, d: g.d }, box = turnedBox(local, turn);
      let at = this.placeOf(s, box, target, sc, over, busy, memo, local);
      // flipped: its place mirrored across the plane square to the axis through what it is flipped through, and its turning with it
      for (const f of s.flips) {
        const c = f.through ? this.boxOf(f.through, over, busy, memo) : null; if (f.through && !c) throw new Error(this.noPart(f.through));
        const i = AX[f.axis], o = c ? c.at[i]! : 0; at = [...at] as V3; at[i] = 2 * o - at[i]!; turn = mirrorTurn(turn, f.axis);
      }
      const made: Made = { name, kind: s.kind, word: s.word, matter: mt, axis, dims, at, turn, local, scale: [...k] as V3, ...g, ...box, mass: s.massGiven ?? (mt ? mt.density * g.volume : 0), ...(s.broken ? { broken: true } : {}), ...(s.motor ? { motor: s.motor, spin: this.spins.get(name) ?? 0 } : {}), ...(s.text ? { text: s.text } : {}), ...(this.groupOf(name) ? { group: this.groupOf(name)!.name } : {}), ...(this.temps.has(name) ? { temp: this.temps.get(name)! } : {}) };
      if (!over.size) memo.set(key, made);
      return made;
    } finally { busy.delete(`shape:${name}`); }
  }
  private placeOf(s: Spec, g: { w: number; h: number; d: number }, t: Box3 | Made | null, sc: Scope, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>, local = g): V3 {
    const p = s.place;
    if (p.how === 'at') return [num(p.x, sc), num(p.y, sc), num(p.z, sc)];
    if (p.how === 'free') return this.freeSpot(s.name, g, local, over, busy, memo);
    const T = t!, c = T.at;
    if (p.how === 'off') return [c[0] + num(p.dx, sc), c[1] + num(p.dy, sc), c[2] + num(p.dz, sc)];
    if (p.how === 'round') {
      const o = this.boxOf(p.about, over, busy, memo); if (!o) throw new Error(this.noPart(p.about));
      const a = (2 * Math.PI * p.i) / p.n, ax = o.axis ?? 'y', v: V3 = [c[0] - o.at[0], c[1] - o.at[1], c[2] - o.at[2]], [i, j] = ax === 'x' ? [1, 2] : ax === 'z' ? [0, 1] : [0, 2];
      const out: V3 = [...o.at] as V3; out[i] += v[i]! * Math.cos(a) - v[j]! * Math.sin(a); out[j] += v[i]! * Math.sin(a) + v[j]! * Math.cos(a); out[3 - i - j] = c[3 - i - j]!; return out;
    }
    // a gap said is the gap, nothing included ("right of m by 0": touching it); unsaid, beside is 10 mm off, above 50 mm
    const said = !!p.by, by = said ? num(p.by!, sc) : 0, dx = p.dx ? num(p.dx, sc) : 0, dz = p.dz ? num(p.dz, sc) : 0, gap = said ? by : 0.01, up = said ? by : 0.05;
    switch (p.how) {
      case 'on': return [c[0] + dx, c[1] + T.h / 2 + by + g.h / 2, c[2] + dz];
      case 'above': return [c[0] + dx, c[1] + T.h / 2 + up + g.h / 2, c[2] + dz];
      case 'under': return [c[0] + dx, c[1] - T.h / 2 - by - g.h / 2, c[2] + dz];
      case 'below': return [c[0] + dx, c[1] - T.h / 2 - up - g.h / 2, c[2] + dz];
      case 'beside': case 'right': return [c[0] + T.w / 2 + gap + g.w / 2, c[1], c[2]];
      case 'left': return [c[0] - T.w / 2 - gap - g.w / 2, c[1], c[2]];
      case 'front': return [c[0], c[1], c[2] + T.d / 2 + gap + g.d / 2];
      case 'behind': return [c[0], c[1], c[2] - T.d / 2 - gap - g.d / 2];
      default: return [c[0], c[1], c[2]];
    }
  }
  // -- joined pieces ------------------------------------------------------------------------------------------------------
  /** A piece let go: each member stays where the piece had it, turned and stretched as it was, and stands on its own. */
  private settle(g: Group, members = g.members): void {
    const ms = members.filter((x) => this.specs.has(x)).map((x) => this.madeOf(x, new Map(), new Set(), new Map()));
    for (const m of ms) { const s = this.specs.get(m.name)!; s.place = { how: 'at', x: `${m.at[0]}`, y: `${m.at[1]}`, z: `${m.at[2]}` }; s.turn = [`${m.turn[0]}`, `${m.turn[1]}`, `${m.turn[2]}`]; s.flips = []; s.scale = [...m.scale] as V3; }
    this.groups.delete(g.name);
  }
  /** A piece's moves, turns, flips and stretches written into its members, each where the piece had it, so the piece
   *  itself is moved by nothing. */
  private bakeIn(g: Group): void {
    const ms = g.members.filter((x) => this.specs.has(x)).map((x) => this.madeOf(x, new Map(), new Set(), new Map()));
    for (const m of ms) { const s = this.specs.get(m.name)!; s.place = { how: 'at', x: `${m.at[0]}`, y: `${m.at[1]}`, z: `${m.at[2]}` }; s.turn = [`${m.turn[0]}`, `${m.turn[1]}`, `${m.turn[2]}`]; s.flips = []; s.scale = [...m.scale] as V3; }
    g.move = [0, 0, 0]; g.turn = [0, 0, 0]; g.flips = []; g.stretch = [1, 1, 1];
  }
  /** A member taken out of its piece (before it goes): a piece left with one stands it where the piece had it. */
  private leave(name: string): void { const g = this.groupOf(name); if (!g) return; const rest = g.members.filter((x) => x !== name); if (rest.length < 2) this.settle(g, rest); else g.members = rest; }
  private groupOf(name: string): Group | undefined { for (const g of this.groups.values()) if (g.members.includes(name)) return g; return undefined; }
  /** Where a joined piece's middle is before its own moves: the middle of the box round its members as each is placed. */
  private pivot(g: Group, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>): V3 { return boxRound(g.members.map((n) => this.madeOf(n, over, busy, memo, true))).at; }
  /** A member as its piece moves it: stretched along x, y, z about the piece's middle, turned about it, flipped, moved. */
  private moved(m: Made, g: Group, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>): Made {
    const P = this.pivot(g, over, busy, memo), k = g.stretch;
    let at: V3 = [P[0] + k[0] * (m.at[0] - P[0]), P[1] + k[1] * (m.at[1] - P[1]), P[2] + k[2] * (m.at[2] - P[2])], turn = m.turn, out: Made = { ...m };
    if (k[0] !== 1 || k[1] !== 1 || k[2] !== 1) {
      if (!square(m.turn)) throw new Error(`${g.name} is stretched along x, y, z, but ${m.name} in it is turned off square: turn it square, or stretch it on its own`);
      // square to the axes, the stretch falls on its own axes (swapped as its quarter turns swap them)
      const R = matOf(m.turn), own: V3 = [0, 1, 2].map((j) => k[[0, 1, 2].find((i) => Math.abs(R[i * 3 + j]!) > 0.5)!]!) as V3;
      const sc: V3 = [m.scale[0] * own[0], m.scale[1] * own[1], m.scale[2] * own[2]], even = Math.abs(sc[0] - sc[1]) < 1e-12 && Math.abs(sc[1] - sc[2]) < 1e-12, f = own[0] * own[1] * own[2];
      const local = { w: m.local.w * own[0], h: m.local.h * own[1], d: m.local.d * own[2] };
      out = { ...out, scale: sc, local, ...turnedBox(local, m.turn), volume: m.volume * f, mass: m.mass * f, area: m.kind === 'box' ? 2 * (local.w * local.d + local.w * local.h + local.d * local.h) : even ? m.area * own[0] * own[0] : NaN };
    }
    if (g.turn.some((a) => a)) { const R = matOf(g.turn); const v = apply3(R, [at[0] - P[0], at[1] - P[1], at[2] - P[2]]); at = [P[0] + v[0], P[1] + v[1], P[2] + v[2]]; turn = eulerOf(mul3(R, matOf(turn))); }
    for (const f of g.flips) { const c = f.through ? this.boxOf(f.through, over, busy, memo) : null, i = AX[f.axis], o = c ? c.at[i]! : P[i]!; at = [...at] as V3; at[i] = 2 * o - at[i]!; turn = mirrorTurn(turn, f.axis); }
    at = [at[0] + g.move[0], at[1] + g.move[1], at[2] + g.move[2]];
    return { ...out, at, turn, ...turnedBox(out.local, turn), group: g.name };
  }
  private joinedOf(name: string, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>): Joined {
    const g = this.groups.get(name)!, ms = g.members.map((n) => this.madeOf(n, over, busy, memo)), b = boxRound(ms), u = unionOf(ms);
    return { name, members: [...g.members], at: b.at, w: b.w, h: b.h, d: b.d, ...u };
  }
  /** Every joined piece as it stands. */
  joined(): Joined[] { const memo = new Map<string, Made>(), out: Joined[] = []; for (const n of this.groups.keys()) { try { out.push(this.joinedOf(n, new Map(), new Set(), memo)); } catch { /* its members say why */ } } return out; }
  private join(names: string[], as?: string, how: JoinHow = 'any'): string {
    if (names.length < 2 && !as) throw new Error(`${how === 'group' ? 'Group' : 'Join'} two or more: "${how === 'group' ? 'group' : 'join'} wall1 and wall2 as walls".`);
    for (const n of names) if (!this.specs.has(n) && !this.groups.has(n)) this.specOf(n);
    // a piece already joined takes the rest into it; two pieces become one
    const into = (as ? this.groups.get(as) : undefined) ?? names.map((n) => this.groups.get(n) ?? this.groupOf(n)).find((x): x is Group => !!x);
    const id = into?.name ?? as ?? names.join('_');
    if (!into && (this.specs.has(id))) throw new Error(`Something named ${id} is made here already: join them as another name.`);
    const g: Group = into ?? { name: id, members: [], move: [0, 0, 0], turn: [0, 0, 0], flips: [], stretch: [1, 1, 1] };
    // a piece moved, turned or stretched stands where it is before it takes anything in: what joins it is not moved by
    // what was done to it before
    if (!identity(g) && names.some((n) => !g.members.includes(n) && n !== g.name)) this.bakeIn(g);
    for (const n of names) {
      const other = this.groups.get(n) ?? this.groupOf(n); if (other && other !== g && !identity(other)) this.bakeIn(other);
      const ms = other && other !== g ? (this.groups.delete(other.name), other.members) : [n];
      for (const x of ms) if (this.specs.has(x) && !g.members.includes(x)) g.members.push(x);
    }
    if (as && g.name !== as) { this.groups.delete(g.name); g.name = as; }
    if (how === 'group') g.loose = true;
    this.groups.set(g.name, g);
    const j = this.joinedOf(g.name, new Map(), new Set(), new Map());
    if (g.loose) return `Grouped ${g.members.join(' + ')} as ${g.name}: they move, turn and stretch as one, but nothing holds them together (join them where they touch to connect them).`;
    const held = this.bondsOf(g, how);
    return `Joined ${g.members.join(' + ')} as ${g.name}, one piece: ${held}. ${mm(j.w)} × ${mm(j.h)} × ${mm(j.d)}, ${kg(j.mass)}${j.exact ? '' : ` (the union's volume sampled at 40 000 points, within ${+(j.within * 100).toPrecision(2)} %)`}; where they meet is counted once.`;
  }
  /** What holds a piece together: each pair of its members that touch, held by the one way that can hold them. Things
   *  that do not touch are not connected: a piece whose members do not all reach each other through touching is not
   *  one piece, and is not made. Fused only where the fusion law says the two fuse; else glued where an adhesive
   *  holds both; else bolted where both are firm enough to hold a bolt. */
  private bondsOf(g: Group, how: JoinHow): string {
    const ms = g.members.map((n) => this.madeOf(n, new Map(), new Set(), new Map())), n = ms.length, kept = new Map((g.bonds ?? []).map((x) => [`${x.a}|${x.b}`, x]));
    for (const m of ms) if (!m.matter) throw new Error(`${m.name} is a surface, with no matter to join: group it instead ("group ${g.members.join(' and ')} as ${g.name}")`);
    const up = Array.from({ length: n }, (_, i) => i), root = (i: number): number => (up[i] === i ? i : (up[i] = root(up[i]!))), bonds: Bond[] = [];
    let nearest = { gap: Infinity, a: '', b: '' };
    for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) {
      const A = ms[i]!, B = ms[k]!, gap = separation(A, B);
      if (gap > TOUCH) { if (root(i) !== root(k) && gap < nearest.gap) nearest = { gap, a: A.name, b: B.name }; continue; }
      up[root(i)] = root(k);
      bonds.push(kept.get(`${A.name}|${B.name}`) ?? kept.get(`${B.name}|${A.name}`) ?? this.bondFor(A, B, how));
    }
    if (new Set(ms.map((_, i) => root(i))).size > 1) {
      const lone = ms.filter((_, i) => root(i) !== root(0)).map((m) => m.name);
      throw new Error(`${lone.join(', ')} ${lone.length > 1 ? 'do' : 'does'} not touch the rest of ${g.name}: things are connected only where they touch${Number.isFinite(nearest.gap) ? ` (the nearest, ${nearest.a} and ${nearest.b}, are ${mm(nearest.gap)} apart)` : ''}. Move them together, or "group" them to move as one without connecting them.`);
    }
    g.bonds = bonds;
    const by = new Map<string, Bond[]>(); for (const x of bonds) { const k = x.how === 'glued' ? `glued with ${x.with}` : x.how; by.set(k, [...(by.get(k) ?? []), x]); }
    return [...by].map(([k, xs]) => `${k} ${xs.map((x) => `${x.a}–${x.b}`).join(', ')} (${xs[0]!.why})`).join('; ');
  }
  private bondFor(A: Made, B: Made, how: JoinHow): Bond {
    const a = A.matter!, b = B.matter!, fu = fusible(a, b);
    if (how === 'fuse' || (how === 'any' && fu.fuses)) { if (!fu.fuses) throw new Error(`${A.name} and ${B.name} cannot be fused: ${fu.why}. Glue or bolt them instead.`); return { a: A.name, b: B.name, how: 'fused', why: fu.checks.find((c) => c.law === 'they mix')?.says ?? 'they fuse' }; }
    const glue = Object.values(ADHESIVES).filter((x) => substrateFactor(x, a.category) === 1 && substrateFactor(x, b.category) === 1).sort((x, y) => y.lapShear - x.lapShear)[0];
    const fusedNot = how === 'any' ? `they do not fuse: ${fu.why}` : '';
    if (how === 'glue' || (how === 'any' && glue)) { if (!glue) throw new Error(`No adhesive kept here holds both ${a.name} and ${b.name}: bolt them instead.`); return { a: A.name, b: B.name, how: 'glued', with: glue.label, why: `${fusedNot}${fusedNot ? '; ' : ''}${glue.label} holds both, ${+(glue.lapShear / 1e6).toPrecision(3)} MPa in lap shear (${glue.source})` }; }
    const soft = [a, b].find((m) => m.yield < 5e6);
    if (soft) throw new Error(`${A.name} and ${B.name} cannot be held: ${how === 'any' ? `${fusedNot}; no adhesive kept here holds both; and ` : ''}${soft.name} is too soft to hold a bolt (it yields at ${+(soft.yield / 1e6).toPrecision(2)} MPa)`);
    return { a: A.name, b: B.name, how: 'bolted', why: how === 'bolt' ? 'as asked: both are firm enough to hold a bolt, and it comes apart again' : `${fusedNot}${fusedNot ? '; ' : ''}no adhesive kept here holds both, and both are firm enough to hold a bolt` };
  }
  private joinWords(how: JoinHow, t: string): string {
    const m = /^(.+?)(?:\s+(?:as|into|named|called)\s+([\p{L}_][\p{L}\d_]*))?$/u.exec(t.trim())!;
    return this.join(m[1]!.split(/\s*,\s*|\s+and\s+|\s+to\s+|\s+with\s+/).map((x) => x.trim()).filter(Boolean), m[2], how);
  }

  /** Where a thing said nowhere goes: on the floor beside the build, along x past whatever was made before it, so it
   *  never goes into what stands. What is placed on it, by it or sized from it is not in its way. */
  private freeSpot(name: string, g: { w: number; h: number; d: number }, local: { w: number; h: number; d: number }, over: Map<string, number>, busy: Set<string>, memo: Map<string, Made>): V3 {
    const b = this.bounds(), names = [...this.specs.keys()], i0 = names.indexOf(name), boxes: Made[] = [];
    for (const n of names.slice(0, i0 < 0 ? names.length : i0)) { if (this.leansOn(n, name)) continue; try { boxes.push(this.madeOf(n, over, busy, memo)); } catch { /* what cannot be made takes no room */ } }
    // its start past the build by its own reach, which no turning changes: turned, it stays where it was
    const x0 = b.right + 0.1 + Math.hypot(local.w, local.h, local.d) / 2, y = b.bottom + g.h / 2;
    // clear whichever way it is turned about y later: the round it sweeps, as a box
    const sweep = Math.hypot(local.w, local.d);
    for (let i = 0; i < 400; i++) { const at: V3 = [x0 + i * 0.05, y, 0]; if (!boxes.some((o) => spatial('overlap', { at, w: sweep, h: g.h, d: sweep, mass: 0 }, o))) return at; }
    return [x0 + 400 * 0.05, y, 0];
  }
  /** Whether a thing is placed by another, or by something placed by it. */
  private leansOn(n: string, by: string, seen = new Set<string>()): boolean {
    const s = this.specs.get(n); if (!s || seen.has(n)) return false; seen.add(n); if (s.copyOf === by) return true;
    const p = s.place, of = 'of' in p ? p.of : null, about = p.how === 'round' ? p.about : null;
    return [of, about].some((x) => !!x && (x === by || this.leansOn(x, by, seen)));
  }
  private bounds() { const ps = this.world.parts(); if (!ps.length) return { right: 0, bottom: 0 }; return { right: Math.max(...ps.map((p) => p.at[0] + p.w / 2)), bottom: Math.min(...ps.map((p) => p.at[1] - p.h / 2)) }; }
  private noPart(word: string): string {
    const names = [...new Set(this.world.parts().map((p) => p.name.split(/[ ,(]/)[0]!.toLowerCase()))].slice(0, 16);
    return `There is no "${word.replace(/_/g, ' ')}" here to place it by: nothing made here has that name, and no part of the build has it in its name.${names.length ? ` The build's parts are named ${names.join(', ')}, ….` : ' Nothing is built yet.'}${this.specs.size ? ` Made here: ${[...this.specs.keys()].join(', ')}.` : ''}`;
  }
  // -- what stands --------------------------------------------------------------------------------------------------------
  /** Every shape as it stands now, and every one that cannot be made as things are, with why. */
  all(): { made: Made[]; failed: { name: string; why: string }[] } {
    const memo = new Map<string, Made>(), made: Made[] = [], failed: { name: string; why: string }[] = [];
    for (const n of this.specs.keys()) { try { made.push(this.madeOf(n, new Map(), new Set(), memo)); } catch (e) { failed.push({ name: n, why: (e as Error).message }); } }
    // what nothing could see, and nothing could be: not computed
    for (const A of made) { const why = unseenIn(A, made); if (why) A.unseen = why; }
    return { made, failed };
  }
  /** The numbers a check reads: every value set, and every shape's sizes, place, volume and mass. */
  facts(): Record<string, number> {
    const out: Record<string, number> = {}, sc = this.scope(new Map(), new Set(), new Map());
    for (const k of [...this.vars.keys(), ...this.laws.keys()]) { try { out[k] = num(k, sc); } catch { /* reported where it is used */ } }
    const { made } = this.all(); let total = 0;
    for (const m of made) { if (!m.unseen) total += m.mass; for (const [k, v] of Object.entries({ ...m.dims, w: m.w, h: m.h, d: m.d, x: m.at[0], y: m.at[1], z: m.at[2], top: m.at[1] + m.h / 2, volume: m.volume, area: m.area, mass: m.mass })) out[`${m.name}.${k}`] = v; }
    for (const j of this.joined()) for (const [k, v] of Object.entries({ w: j.w, h: j.h, d: j.d, x: j.at[0], y: j.at[1], z: j.at[2], top: j.at[1] + j.h / 2, volume: j.volume, mass: j.mass })) out[`${j.name}.${k}`] = v;
    out.made = made.length; out['made.mass'] = total;
    return out;
  }
  value(expr: string): number { return num(expr, this.scope(new Map(), new Set(), new Map())); }
  /** Whether a condition holds now, over everything set and made. */
  holds(cond: string): boolean { return truth(cond, this.scope(new Map(), new Set(), new Map())); }
  /** The scope a check reads, over everything set and made, and the room's facts. */
  reader(): Scope { return this.scope(new Map(), new Set(), new Map()); }
  // -- rules, and a step undone that would break one ---------------------------------------------------------------------
  private related(a: Spec, b: Spec): boolean { const of = (s: Spec) => ('of' in s.place ? s.place.of : null), ga = this.groupOf(a.name); return of(a) === b.name || of(b) === a.name || (!!ga && !ga.loose && ga === this.groupOf(b.name)) || this.jointsKept.some((j) => (j.a === a.name && j.b === b.name) || (j.a === b.name && j.b === a.name)); }
  /** What breaks a rule as things stand: each broken rule, with why. */
  broken(): string[] {
    const out: string[] = [], { made } = this.all(), sc = this.reader();
    for (const r of this.rulesKept) {
      if (r.kind === 'cond') { try { if (!truth(r.text, sc)) out.push(`${r.text} does not hold`); } catch (e) { out.push(`${r.text}: ${(e as Error).message}`); } continue; }
      const d = r.kind === 'clear' ? num(r.d, sc) : 0, mine = (n: string) => (this.specs.get(n)?.by ?? '') === r.by;
      for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) {
        const A = made[i]!, B = made[j]!; if (A.unseen || B.unseen || (!mine(A.name) && !mine(B.name)) || this.related(this.specs.get(A.name)!, this.specs.get(B.name)!)) continue;
        if (r.kind === 'apart' && spatial('overlap', A, B)) out.push(`${A.name} and ${B.name} overlap`);
        if (r.kind === 'clear' && spatial('gap', A, B) < d - 1e-9) out.push(`${A.name} and ${B.name} are ${mm(spatial('gap', A, B))} apart, less than ${mm(d)}`);
      }
      if (r.kind === 'apart' && r.withBuild) for (const A of made) { const s = this.specs.get(A.name)!; if (!mine(A.name)) continue; for (const p of this.world.parts()) if (!('of' in s.place && this.partOf(s.place.of) === p) && spatial('overlap', A, p)) { out.push(`${A.name} goes into the build's ${p.name}`); break; } }
    }
    return out;
  }
  private snapshot() { return { groups: new Map([...this.groups].map(([k, v]) => [k, structuredClone(v)])), vars: new Map(this.vars), unitOf: new Map(this.unitOf), laws: new Map(this.laws), specs: new Map([...this.specs].map(([k, v]) => [k, structuredClone(v)])), count: new Map(this.count), rules: [...this.rulesKept], matter: this.matter, said: this.matterSaid, rand: this.rand.s, actions: new Map(this.actions), runs: new Map(this.runsKept), spins: new Map(this.spins), joints: structuredClone(this.jointsKept), temps: new Map(this.temps), heaters: new Map(this.heaters) }; }
  private restore(z: ReturnType<Workshop['snapshot']>) { this.groups = z.groups; this.vars = z.vars; this.unitOf = z.unitOf; this.laws = z.laws; this.specs = z.specs; this.count = z.count; this.rulesKept = z.rules; this.matter = z.matter; this.matterSaid = z.said; this.rand.s = z.rand; this.actions = z.actions; this.runsKept = z.runs; this.spins = z.spins; this.jointsKept = z.joints; this.temps = z.temps; this.heaters = z.heaters; }
  // -- what a step says --------------------------------------------------------------------------------------------------
  /** Whether a step's words are generation's to do. */
  static handles(line: string): boolean { const t = line.trim(); return /=\s*\??$/.test(t) || /^(calc|calculate|compute|what is|work out|set|let|material|matter|use|place|put|add|surface|size|resize|energy|move|rotate|turn|flip|mirror|remove|delete|clear|pattern|copy|scatter|rule|rules|seed|report|expand|stretch|grow|shrink|squash|join|connect|attach|combine|unite|merge|fuse|weld|glue|bond|bolt|screw|rivet|group|split|action|actions|default|require|mount|support|cover|stack|run|simulate|drop|push|chart|hinge|unhinge|unslide|heat|warm|cool)\b/i.test(t) || /^slide\s+[\p{L}_][\p{L}\d_]*\s+(?:on|onto|along|in)\s/iu.test(t) || /^load\s+[\p{L}_][\p{L}\d_]*\s+with\s/iu.test(t) || /^let (it |them )?go\b/i.test(t) || /^repeat\s+.+?\s+times?\s*:/i.test(t) || /^for\s+each\b/i.test(t) || /^while\s+.+:/i.test(t) || /^(parts list|parts|list (the )?parts|bill of materials|bom|cut list)$/i.test(t) || /^show\s+action\b/i.test(t) || /^if\s.+\sthen\s/i.test(t) || /^[\p{L}_][\p{L}\d_.]*\s*=[^=]/u.test(t); }
  /** Whether a step's words are this workshop's: generation's, or a standing action it knows. */
  does(line: string): boolean { return Workshop.handles(line) || this.actions.has(line.trim().split(/\s+/)[0]!.toLowerCase()); }
  /** The standing actions it knows: each one's name, how it is called, and whether it is its own or yours. */
  standing(): { name: string; call: string; steps: number; builtIn: boolean; text: string }[] { return [...this.actions.values()].map((a) => ({ name: a.name, call: this.callForm(a), steps: a.body.length, builtIn: a.builtIn, text: a.text })); }
  private callForm(a: Standing): string { return `${a.name} ${a.header.map((h) => `${h.optional ? '[' : ''}${h.param ? `{${h.word}}` : h.word}${h.optional ? ']' : ''}`).join(' ').replace(/\] \[/g, ' ')}`; }
  /** "action name {A} [on {B}]: step; step; …": its steps kept as one action, called by its name. */
  private define(src: string, builtIn = false): string {
    const m = /^action\s+([\p{L}_][\p{L}\d_]*)\s*([^:]*?)\s*:\s*([\s\S]+)$/u.exec(src.trim());
    if (!m) throw new Error('Say an action as "action riser {X} [on {Y}]: place plate named {X}_riser under {X}; join {X} and {X}_riser".');
    const name = m[1]!.toLowerCase(); if (CALL_VERBS.test(name)) throw new Error(`"${name}" is a call already: give the action another name.`);
    const header: Standing['header'] = []; let optional = false;
    for (const tok of m[2]!.match(/\[|\]|\{[\p{L}_][\p{L}\d_]*\}|[^\s[\]]+/gu) ?? []) { if (tok === '[') optional = true; else if (tok === ']') optional = false; else header.push({ word: tok.replace(/[{}]/g, ''), param: tok.startsWith('{'), optional }); }
    const body = m[3]!.split(/\s*;\s*|\n+/).map((x) => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
    for (const b of body) for (const p of b.match(/\{[^}]+\}/g) ?? []) if (!header.some((h) => h.param && h.word === p.slice(1, -1))) throw new Error(`${p} in "${b}" is not one of ${name}'s: ${header.filter((h) => h.param).map((h) => `{${h.word}}`).join(', ') || 'it takes none'}.`);
    const a: Standing = { name, header, body, text: src.trim().replace(/\s+/g, ' '), builtIn }; this.actions.set(name, a);
    return `Action ${name}: ${body.length} step${body.length === 1 ? '' : 's'} as one, called as "${this.callForm(a)}". Every size in it is worked out again from what it is given, each time it is called.`;
  }
  /** A standing action called: its words bound to what it was given, each of its steps done in turn; a step that
   *  names something not given is left out; one that cannot be done undoes the whole action, saying where it stopped. */
  private callAction(t: string): string | null {
    const words = t.trim().split(/\s+/), a = this.actions.get(words[0]!.toLowerCase()); if (!a) return null;
    const bind = new Map<string, string>(); let i = 1;
    for (let k = 0; k < a.header.length; k++) {
      const h = a.header[k]!, w = words[i], lastParam = !a.header.slice(k + 1).some((x) => x.param);
      if (!h.param) { if (w?.toLowerCase() === h.word.toLowerCase()) { i++; continue; } if (h.optional) { while (k + 1 < a.header.length && a.header[k + 1]!.optional) k++; continue; } throw new Error(`${a.name} is called as "${this.callForm(a)}": "${h.word}" is missing.`); }
      if (w === undefined) { if (h.optional) continue; throw new Error(`${a.name} is called as "${this.callForm(a)}": say what {${h.word}} is.`); }
      // the last thing it is given may be a part's name of several words
      bind.set(h.word, lastParam ? words.slice(i).join('_') : w); i = lastParam ? words.length : i + 1;
    }
    if (i < words.length) throw new Error(`${a.name} is called as "${this.callForm(a)}": "${words.slice(i).join(' ')}" is more than it takes.`);
    if (++this.depth > 8) { this.depth = 0; throw new Error(`${a.name} calls actions more than 8 deep: one calls itself.`); }
    const done: string[] = [];
    try {
      for (const line of a.body) {
        if ((line.match(/\{[^}]+\}/g) ?? []).some((p) => !bind.has(p.slice(1, -1)))) continue;
        const step = line.replace(/\{([^}]+)\}/g, (_, p: string) => bind.get(p)!);
        try { done.push(this.step(this.bake(step))); } catch (e) { throw new Error(`${a.name} stopped at step ${done.length + 1} ("${step.slice(0, 90)}"): ${(e as Error).message}`); }
      }
    } finally { this.depth--; }
    const short = (x: string) => { const c = x.replace(/ Now: .*$/, '').split(/(?<=[.;])\s/)[0]!; return c.length > 110 ? `${c.slice(0, 108)}…` : c; };
    return `${a.name} ${[...bind.values()].join(', ')}: ${done.length} step${done.length === 1 ? '' : 's'}. ${done.map((x, k) => `${k + 1}. ${short(x)}`).join(' ')}`;
  }
  /** A step done: what it made or changed, in words; or why it could not be, with nothing changed. */
  run(line: string, by = ''): string {
    const before = this.snapshot(), was = new Set(this.broken()); this.by = by;
    try {
      const said = this.step(this.bake(line.trim().replace(/[.;]+$/, '')));
      // what this step breaks: a rule broken already, by what stood before it, does not stop it
      const bad = this.broken().filter((x) => !was.has(x));
      // what happened when things were let go is not a choice to undo: it stands, and what it breaks is said
      if (bad.length && /^(simulate|drop|push|let (it |them )?go)\b/i.test(line.trim())) return `${said} What happened breaks ${bad.length > 1 ? 'rules' : 'a rule'}: ${bad.slice(0, 4).join('; ')}. It is what happened, so it stands: change what is made, not what happened.`;
      if (bad.length) throw new Error(`That would break the rule${bad.length > 1 ? 's' : ''}: ${bad.slice(0, 4).join('; ')}. Undone.`);
      return said;
    } catch (e) { this.restore(before); throw e; }
  }
  /** Random values drawn now, from the seed, and written into the step: random(a, b), randint(a, b), chance(p), pick(a, b, …), "one of a, b, c". */
  private bake(t: string): string {
    let s = t;
    for (;;) {
      const m = /\b(random|rand|randint|chance|pick)\s*\(/i.exec(s); if (!m) break;
      const { args, end } = argsAt(s, m.index + m[0].length - 1), f = m[1]!.toLowerCase(), u = draw(this.rand);
      const sc = this.reader(); let out: string;
      if (f === 'pick') { if (!args.length) throw new Error('pick( ) needs things to pick from'); out = args[Math.floor(u * args.length)]!; }
      else if (f === 'chance') out = u < num(args[0] ?? '0.5', sc) ? '1' : '0';
      else {
        const a = num(args[0] ?? '0', sc), b = num(args[1] ?? '1', sc), v = f === 'randint' ? Math.floor(a + u * (Math.floor(b) - a + 1)) : a + u * (b - a);
        // drawn between two lengths, it is a length: written in their unit, so it reads as it was said
        const us = [...new Set(args.flatMap((x) => lex(x).filter((k) => k.t === 'num' && k.unit).map((k) => (k as { unit?: string }).unit!)))], k = us.length === 1 ? UNITS.find(([w]) => w === us[0])?.[1] : undefined;
        out = k && f !== 'randint' ? `${+(v / k).toPrecision(6)} ${us[0]}` : String(v);
      }
      s = s.slice(0, m.index) + out + s.slice(end);
    }
    const one = /\bone of\s+(.+?)(?=\s+\b(?:named|called|of|from|on|onto|under|above|below|beside|left of|right of|in front of|behind|in|through|at|size|along|by|turned|rotated)\b|$)/i.exec(s);
    if (one) { const xs = one[1]!.split(/\s*,\s*|\s+or\s+/).filter(Boolean); s = s.slice(0, one.index) + xs[Math.floor(draw(this.rand) * xs.length)]! + s.slice(one.index + one[0].length); }
    return s;
  }
  private step(t: string): string {
    let m: RegExpExecArray | null;
    if ((m = /^if\s+(.+?)\s+then\s+(.+?)(?:\s+else\s+(.+))?$/i.exec(t))) { const yes = this.holds(m[1]!), branch = yes ? m[2] : m[3]; return branch ? `${m[1]}: ${yes ? 'yes' : 'no'}, so ${this.step(branch)}` : `${m[1]}: no, so nothing.`; }
    if ((m = /^(?:calc|calculate|compute|what is|work out)\s+(.+?)\s*=?\s*$/i.exec(t)) || (m = /^(.+?)\s*=\s*\??$/.exec(t))) return this.calcStep(m[1]!);
    if ((m = /^run\s+([\p{L}_][\p{L}\d_]*)\b\s*(.*)$/iu.exec(t))) return this.runStep(m[1]!, m[2]!);
    // let go: real rigid-body physics over what is made
    if ((m = /^(?:simulate|let go|let it go|let them go)(?:\s+(?:for\s+)?(.+))?$/i.exec(t))) return this.letGo(m[1] ? num(m[1], this.reader()) : 3);
    if ((m = /^drop\s+([\p{L}_][\p{L}\d_]*)(?:\s+from\s+(.+?))?(?:\s+for\s+(.+))?$/iu.exec(t))) {
      // raised by so much first (a piece, all of it), then let go
      const n = m[1]!, h = m[2] ? num(m[2], this.reader()) : 0;
      const piece = this.groups.has(n) ? n : this.groupOf(n) && !this.groupOf(n)!.loose ? this.groupOf(n)!.name : null;
      if (h) { if (piece) this.groupMove(piece, `by 0, ${h}, 0`); else { const at = this.madeOf(n, new Map(), new Set(), new Map()).at, sp = this.specOf(n); this.leave(n); sp.place = { how: 'at', x: `${at[0]}`, y: `${at[1] + h}`, z: `${at[2]}` }; } }
      return this.letGo(m[3] ? num(m[3], this.reader()) : 3);
    }
    if ((m = /^push\s+([\p{L}_][\p{L}\d_]*)\s+with\s+(.+?)(?:\s+along\s+(-?)([xyz]))?(?:\s+for\s+(.+?))?(?:\s+at\s+(?:its\s+|the\s+)?(top|middle|centre|center)|\s+at\s+(-?[\d.]+)\s*m\s+up)?$/iu.exec(t))) {
      const F = num(m[2]!, this.reader()), i = AX[(m[4] ?? 'x') as Axis], f: V3 = [0, 0, 0]; f[i] = m[3] ? -F : F;
      // at its top: the middle of its top face, as it stands, where a push tips it if anything does; or so high up, over
      // its middle (a wind's push, where the push on all its faces is centred)
      const box = () => { const b = this.boxOf(m![1]!, new Map(), new Set(), new Map()); if (!b) throw new Error(`Nothing named ${m![1]} is made here.`); return b; };
      const top = m[6] && /top/i.test(m[6]) ? (() => { const b = box(); return [b.at[0], b.at[1] + b.h / 2, b.at[2]] as V3; })() : m[7] !== undefined ? (() => { const b = box(); return [b.at[0], Number(m![7]), b.at[2]] as V3; })() : undefined;
      return this.letGo(3, { name: m[1]!, force: f, seconds: m[5] ? num(m[5], this.reader()) : 0.2, ...(top ? { at: top } : {}) });
    }
    // loops: the same steps again, over things, or while a condition holds
    if ((m = /^repeat\s+(.+?)\s+times?\s*:\s*([\s\S]+)$/i.exec(t))) { const n = Math.round(num(m[1]!, this.reader())); if (!(n >= 1 && n <= 200)) throw new Error('Repeat 1 to 200 times.'); return this.loop(`Repeated ${n} times`, Array.from({ length: n }, (_, k) => ({ i: String(k + 1) })), m[2]!); }
    if ((m = /^for\s+each\s+([\p{L}_][\p{L}\d_]*)(?:\s+in\s+(.+?))?\s*:\s*([\s\S]+)$/iu.exec(t))) {
      const p = m[1]!, names = m[2] ? m[2].split(/\s*,\s*|\s+and\s+/).map((x) => x.trim()).filter(Boolean) : [...this.specs.keys()].filter((k) => k === p || k.startsWith(`${p}_`) || new RegExp(`^${p}\\d+$`).test(k));
      if (!names.length) throw new Error(`Nothing made here is named ${p}, or ${p}_2, ${p}_3, ….`);
      return this.loop(`For each of ${names.length} (${names.slice(0, 6).join(', ')}${names.length > 6 ? ', …' : ''})`, names.map((n, k) => ({ it: n, i: String(k + 1) })), m[3]!);
    }
    if ((m = /^while\s+(.+?)\s*:\s*([\s\S]+?)(?:\s*,?\s*at most\s+(\d+)\s+times?)?$/i.exec(t))) {
      const cap = Math.min(200, Number(m[3] ?? 50)), cond = m[1]!; let k = 0; const outs: string[] = [];
      while (this.holds(cond)) { if (k >= cap) return `While ${cond}: done ${k} times, at most ${cap}, and it still holds. ${outs.at(-1) ?? ''}`; k++; for (const st of m[2]!.split(/\s*;\s*/).filter(Boolean)) outs.push(this.step(this.bake(st.replace(/\{i\}/g, String(k))))); }
      return `While ${cond}: done ${k} time${k === 1 ? '' : 's'}, until it no longer held.${outs.length ? ` Last: ${outs.at(-1)!.split(/(?<=[.;])\s/)[0]}` : ''}`;
    }
    if (/^(?:parts list|parts|list (?:the )?parts|bill of materials|bom|cut list)$/i.test(t)) return this.partsList();
    if ((m = /^load\s+([\p{L}_][\p{L}\d_]*)\s+with\s+(.+?)(?:\s+at\s+(?:the\s+|its\s+)?(middle|centre|center|end)|\s+(spread)(?:\s+(?:evenly|over it))?)?(?:\s+over\s+([\d.]+)\s*mm)?$/iu.exec(t))) return this.loadStep(m[1]!, num(m[2]!, this.reader()), (m[3] ?? m[4] ?? 'middle').toLowerCase(), m[5] ? Number(m[5]) / 1000 : undefined);
    if ((m = /^chart\s+(.+)$/i.exec(t))) return this.chartStep(m[1]!.trim());
    // moving joints, where things touch: a hinge turns about an axis, a slide runs along one
    if ((m = /^(hinge|slide)\s+([\p{L}_][\p{L}\d_]*)\s+(?:to|on|onto|in)\s+(.+)$/iu.exec(t))) return this.jointStep(m[1]!.toLowerCase() as Joint['kind'], m[2]!, m[3]!);
    if ((m = /^(?:unhinge|unslide)\s+([\p{L}_][\p{L}\d_]*)$/iu.exec(t))) { const n = m[1]!, was = this.jointsKept.length; this.jointsKept = this.jointsKept.filter((j) => j.a !== n && j.b !== n); if (was === this.jointsKept.length) throw new Error(`${n} is on no hinge or slide.`); return `${n} is on no hinge or slide now: what was hinged or slid there stands free.`; }
    // heat: put in a thing, and let flow between what touches and out to the air
    if ((m = /^(?:let\s+)?heat\s+flow(?:\s+for\s+(.+))?$/i.exec(t)) || (m = /^let\s+(?:it|them|things|everything)\s+cool(?:\s+(?:down\s+)?for\s+(.+))?$/i.exec(t))) return this.heatFlow(m[1] ? num(m[1], this.reader()) : 60);
    if ((m = /^(?:heat|warm|cool)\s+([\p{L}_][\p{L}\d_]*)\s+to\s+(.+)$/iu.exec(t))) return this.setTemp(m[1]!, m[2]!);
    if ((m = /^heat\s+([\p{L}_][\p{L}\d_]*)\s+with\s+(.+)$/iu.exec(t))) return this.setHeater(m[1]!, m[2]!);
    if (/^action\s/i.test(t)) return this.define(t);
    if (/^actions$/i.test(t)) return `Standing actions: ${this.standing().map((a) => `${a.call} (${a.steps} steps${a.builtIn ? '' : ', yours'})`).join('; ')}. "show action <name>" says how one is worked out.`;
    if ((m = /^show\s+action\s+([\p{L}_][\p{L}\d_]*)$/iu.exec(t))) { const a = this.actions.get(m[1]!.toLowerCase()); if (!a) throw new Error(`No action named ${m[1]}: ${[...this.actions.keys()].join(', ')}.`); return `${this.callForm(a)}: ${a.body.map((b, k) => `${k + 1}. ${b}`).join(' ')}`; }
    if ((m = /^default\s+([\p{L}_][\p{L}\d_.]*)\s*=\s*(.+)$/iu.exec(t))) return this.vars.has(m[1]!) || this.laws.has(m[1]!) ? `${m[1]} is kept as ${this.show(m[1]!, this.value(m[1]!))}.` : this.assign(m[1]!, m[2]!);
    if ((m = /^require\s+(.+?)\s*:\s*(.+)$/i.exec(t))) { if (!this.holds(m[1]!)) throw new Error(m[2]!); return `${m[1]}: it holds.`; }
    if ((m = /^seed\s+(-?\d+)$/i.exec(t))) { this.rand.s = Number(m[1]) | 0; return `Seed ${m[1]}: what is drawn at random from here is drawn the same each time.`; }
    // "to" and "be" only as words of their own: "size motor_mount.h so …" is not "size mo to r_mount.h"
    if ((m = /^(?:set|let)\s+([\p{L}_][\p{L}\d_.]*)(?:\s*=\s*|\s+(?:to|be)\s+)(.+)$/iu.exec(t)) || (m = /^(?:size|resize)\s+([\p{L}_][\p{L}\d_.]*)(?:\s*=\s*|\s+to\s+)(.+)$/iu.exec(t)) || (m = /^([\p{L}_][\p{L}\d_.]*)\s*=\s*([^=].*)$/u.exec(t))) return this.assign(m[1]!, m[2]!);
    if ((m = /^(?:material|matter|use)\s+(.+?)\s+for\s+(.+)$/i.exec(t))) return this.matterFor(m[1]!.trim(), m[2]!.split(/\s*,\s*|\s+and\s+/).map((x) => x.trim()).filter(Boolean));
    if ((m = /^(?:material|matter|use)\s+(.+)$/i.exec(t))) { this.matter = matterOf(m[1]!); this.matterSaid = m[1]!.trim(); const n = this.specs.size; return `Matter: ${this.matter.name}, ${fmt(this.matter.density)} kg/m³, yielding at ${fmt(this.matter.yield / 1e6)} MPa (${this.matter.source}), for what is made from here${n ? `; what is made already keeps its own (say "material ${this.matterSaid} for <name>" to change one)` : ''}.`; }
    if ((m = /^size\s+([\p{L}_][\p{L}\d_.]*)\s+(?:so that|so|until|such that|for)\s+(.+?)(?:\s+between\s+(.+?)\s+and\s+(.+))?$/iu.exec(t))) return this.solve(m[1]!, m[2]!, m[3], m[4]);
    if ((m = /^(place|put|add|surface)\s+(.+)$/i.exec(t))) return this.place(m[1]!.toLowerCase(), m[2]!);
    // connected only where they touch, and held by what can hold them: fused, glued, bolted; or grouped, not held
    if ((m = /^(join|connect|attach|combine|unite|merge|fuse|weld|glue|bond|bolt|screw|rivet|group)\s+(.+)$/iu.exec(t))) {
      const v = m[1]!.toLowerCase(); let rest = m[2]!, how: JoinHow = /^(combine|unite|merge|fuse|weld)$/.test(v) ? 'fuse' : /^(glue|bond)$/.test(v) ? 'glue' : /^(bolt|screw|rivet)$/.test(v) ? 'bolt' : v === 'group' ? 'group' : 'any';
      const w = /\s+(?:with|by)\s+(fus\w*|weld\w*|glue|epoxy|adhesive|bolts?|screws?|rivets?)\b/i.exec(rest);
      if (w) { rest = rest.replace(w[0], ''); how = /^(fus|weld)/i.test(w[1]!) ? 'fuse' : /^(glue|epoxy|adhesive)/i.test(w[1]!) ? 'glue' : 'bolt'; }
      return this.joinWords(how, rest);
    }
    if ((m = /^split\s+([\p{L}_][\p{L}\d_]*)$/iu.exec(t))) { const g = this.groups.get(m[1]!); if (!g) throw new Error(`${m[1]} is not a joined piece`); this.settle(g); return `Split ${g.name}: ${g.members.join(', ')} stand apart again, each as its piece left it.`; }
    if ((m = /^(expand|stretch|grow|shrink|squash)\s+([\p{L}_][\p{L}\d_]*)\s*(.*)$/iu.exec(t))) return this.stretch(m[1]!.toLowerCase(), m[2]!, m[3]!);
    if ((m = /^(?:rotate|turn)\s+([\p{L}_][\p{L}\d_]*)\s+(.+)$/iu.exec(t)) && this.groups.has(m[1]!)) return this.groupTurn(m[1]!, m[2]!);
    if ((m = /^(?:rotate|turn)\s+([\p{L}_][\p{L}\d_]*)\s+(.+)$/iu.exec(t))) return this.rotate(m[1]!, m[2]!);
    if ((m = /^flip\s+([\p{L}_][\p{L}\d_]*)\s+(?:across\s+|on\s+|in\s+|about\s+|along\s+)?([xyz])\b(?:\s+through\s+(.+))?$/iu.exec(t)) && this.groups.has(m[1]!)) { const th = m[3]?.trim().replace(/\s+/g, '_') ?? null; this.groups.get(m[1]!)!.flips.push({ axis: m[2]!.toLowerCase() as Axis, through: th }); return `Flipped ${m[1]} across ${m[2]}: ${this.describeJoined(m[1]!)}.`; }
    if ((m = /^flip\s+([\p{L}_][\p{L}\d_]*)\s+(?:across\s+|on\s+|in\s+|about\s+|along\s+)?([xyz])\b(?:\s+through\s+(.+))?$/iu.exec(t))) return this.flip(m[1]!, m[2]!.toLowerCase() as Axis, m[3]);
    if ((m = /^mirror\s+([\p{L}_][\p{L}\d_]*)\s+(?:across\s+|on\s+|in\s+|about\s+|along\s+)?([xyz])\b(?:\s+through\s+(.+?))?(?:\s+(?:named|called)\s+([\p{L}_][\p{L}\d_]*))?$/iu.exec(t))) return this.mirror(m[1]!, m[2]!.toLowerCase() as Axis, m[3], m[4]);
    if ((m = /^energy\s+(?:to\s+)?(lift|raise|heat|warm|spin|turn|move|push)\s+([\p{L}_][\p{L}\d_]*)\s+(?:by\s+|to\s+|at\s+|up\s+)?(.+)$/iu.exec(t))) return this.energy(m[1]!.toLowerCase(), m[2]!, m[3]!);
    if ((m = /^move\s+([\p{L}_][\p{L}\d_]*)\s+(.+)$/iu.exec(t)) && this.groups.has(m[1]!)) return this.groupMove(m[1]!, m[2]!);
    if ((m = /^move\s+([\p{L}_][\p{L}\d_]*)\s+(.+)$/iu.exec(t))) { const s = this.specOf(m[1]!), place = this.placeWords(` ${m[2]!}`); if (!place) throw new Error(`Move ${m[1]} where? Say "to 0, 0.5 m, 0", "on bearing", "left of cap by 10 mm", "from cap by 0, 20 mm, 0".`); s.place = place; return `Moved ${this.check(s.name)}.`; }
    if ((m = /^(?:remove|delete)\s+([\p{L}_][\p{L}\d_-]*)$/iu.exec(t))) {
      const g = this.groups.get(m[1]!); if (g) { for (const x of g.members) { this.specs.delete(x); this.forget(x); } this.groups.delete(g.name); return `Removed ${g.name}: ${g.members.join(', ')}.`; }
      this.specOf(m[1]!); this.leave(m[1]!); this.specs.delete(m[1]!); this.forget(m[1]!); return `Removed ${m[1]}.`;
    }
    if (/^clear(\s+all)?$/i.test(t)) { const n = this.specs.size; this.specs.clear(); this.groups.clear(); this.jointsKept = []; this.temps.clear(); this.heaters.clear(); return `Cleared ${n} shape${n === 1 ? '' : 's'}.`; }
    if ((m = /^(?:pattern|copy)\s+([\p{L}_][\p{L}\d_]*)\s+(\d+)\s*(?:times\s*)?(?:along\s+([xyz])\s+(?:every\s+)?(.+)|round\s+([\p{L}_][\p{L}\d_ ]*))$/iu.exec(t))) return this.pattern(m[1]!, Number(m[2]), m[3] as Axis | undefined, m[4], m[5]);
    if ((m = /^scatter\s+([\p{L}_][\p{L}\d_]*)\s+(\d+)\s*(?:times\s*)?(?:on|over|onto|across)\s+([\p{L}_][\p{L}\d_ ]*?)(\s+turned randomly)?$/iu.exec(t))) return this.scatter(m[1]!, Number(m[2]), m[3]!.trim(), !!m[4]);
    if ((m = /^rules?\s+(.+)$/i.exec(t))) return this.rule(m[1]!);
    if (/^rules$/i.test(t)) return this.rulesKept.length ? `Rules: ${this.rulesKept.map((r) => r.text).join('; ')}.` : 'No rules.';
    if (/^report$/i.test(t)) return this.report();
    const called = this.callAction(t); if (called !== null) return called;
    throw new Error(`I cannot do "${t.slice(0, 60)}". Generation can: set <name> = <value>; material <matter>; place <shape> [named <n>] [of <matter>] [on|under|above|below|beside|left of|right of|in front of|behind|through <thing> | at x, y, z | from <thing> by dx, dy, dz] [size a x b x c] [turned x a y b z c]; surface plane|circle …; size <name> so <condition>; rotate <shape> <angle> about x|y|z, or randomly; flip <shape> x|y|z [through <thing>]; mirror <shape> x|y|z; pattern <shape> <n> along x <pitch> | round <thing>; scatter <shape> <n> on <thing>; rule <condition> | no overlap | clearance <d>; if <condition> then <step> [else <step>]; energy lift|heat|spin|move <shape> <amount>; move, remove, clear, seed <n>, report. Random: random(a, b), randint(a, b), chance(p), pick(a, b), one of a, b.`);
  }
  /** A motor run: at so many volts, for so long, against a load, cooled by a liquid or not. What it comes to is kept
   *  as values a condition, a rule or a pipeline's trigger reads: m.rpm, m.current, m.torque, m.temp (its winding),
   *  m.case (its housing), m.power (drawn), m.output (at its shaft), m.efficiency, m.energy, m.heat, m.ran, m.overheated,
   *  and, cooled, m.coolant_out, m.coolant_heat and m.pump. */
  private runStep(name: string, said: string): string {
    const s = this.specOf(name); if (!s.motor) throw new Error(`${name} is not a motor: place one with "place motor named ${name}".`);
    const d = MOTORS[s.motor]!, sc = this.reader();
    const part = (re: RegExp) => re.exec(` ${said} `)?.[1]?.trim();
    const STOP = '(?=\\s+(?:at|for|against|with|cooled|from|gap)\\b|\\s*$)';
    const V = part(new RegExp(`\\sat\\s+(.+?V)${STOP}`, 'i')), secs = part(new RegExp(`\\sfor\\s+(.+?)${STOP}`, 'i')), load = part(new RegExp(`\\s(?:against|with a load of)\\s+(.+?)${STOP}`, 'i'));
    const cool = /\scooled\s+by\s+(.+?)\s+at\s+(.+?(?:L\/min|l\/min|m³\/s))(?:\s+from\s+(.+?°C|.+?K))?(?=\s+(?:for|against|gap)\b|\s*$)/i.exec(` ${said} `), gap = part(new RegExp(`\\sgap\\s+(.+?)${STOP}`, 'i'));
    const run = runMotor(d, {
      V: V ? num(V, sc) : d.V, seconds: secs ? num(secs, sc) : 10, load: load ? num(load, sc) : 0,
      ...(cool ? { coolant: { liquid: liquidOf(cool[1]!), flow: num(cool[2]!, sc), tIn: cool[3] ? num(cool[3].replace(/°C$/, ''), sc) : 20, ...(gap ? { gap: num(gap, sc) } : {}) } } : {}),
    });
    this.runsKept.set(name, run); this.spins.set(name, (run.end.rpm * 2 * Math.PI) / 60);
    // its body is as warm as its housing came to: heat flows from it to what it touches
    this.temps.set(name, run.end.housing);
    const keep = (k: string, v: number, u?: string) => { this.vars.set(`${name}.${k}`, u ? `${v} ${u}` : String(v)); if (u) this.unitOf.set(`${name}.${k}`, u); else this.unitOf.delete(`${name}.${k}`); };
    const e = run.end;
    keep('rpm', +e.rpm.toPrecision(6), 'rpm'); keep('current', e.current, 'A'); keep('torque', e.torque, 'N·m'); keep('temp', +e.winding.toPrecision(5), '°C'); keep('case', +e.housing.toPrecision(5), '°C');
    keep('power', e.powerIn, 'W'); keep('output', e.powerOut, 'W'); keep('efficiency', e.efficiency); keep('energy', run.energy.in, 'J'); keep('heat', run.energy.copper, 'J'); keep('ran', run.seconds, 's'); keep('overheated', run.overheated ?? 0, 's');
    if (run.jacket) { keep('coolant_out', +run.jacket.out.toPrecision(6), '°C'); keep('coolant_heat', run.jacket.carried, 'W'); keep('pump', run.jacket.pump, 'W'); }
    const r = (v: number, p = 3) => +v.toPrecision(p), j = run.jacket;
    return `Ran ${name} (${d.label}) at ${r(run.V)} V for ${r(run.seconds)} s against ${r(run.load)} N·m: ${run.stalled ? `it stalls, drawing ${r(e.current)} A, all of it heat` : `it came to ${r(e.rpm, 4)} rpm (63 % of it in ${r(run.rise * 1e3)} ms), drawing ${r(e.current)} A: ${r(e.powerIn)} W in, ${r(e.powerOut)} W out, ${r(e.efficiency * 100)} %`}. Its winding is at ${r(e.winding)} °C and its housing ${r(e.housing)} °C${run.overheated !== null ? `; its winding passed its ${run.maxWinding} °C limit at ${r(run.overheated)} s, and a real one would burn there` : `, within its ${run.maxWinding} °C limit`}${run.thermalEstimated ? ' (its heat paths estimated from its size: its maker gives none)' : ''}. Energy: ${joules(run.energy.in)} from the source, ${joules(run.energy.out)} at the shaft, ${joules(run.energy.copper)} as heat in the copper, ${joules(run.energy.friction)} to friction, ${joules(run.energy.spin)} left in its spin.${j ? ` Cooled by ${j.liquid} at ${r(j.flow * 60000)} L/min from ${r(j.tIn)} °C: it flows ${j.regime} (Re ${r(j.Re)}), the jacket passes ${r(j.G)} W per K and carries ${r(j.carried)} W off, the ${j.liquid} leaving at ${r(j.out, 4)} °C; pumping it takes ${r(j.pump)} W.` : ''}`;
  }
  /** Everything made, let go: each lone thing, and each joined piece as one, under gravity, landing on the floor, the
   *  build (fixed where it stands) and each other; where each comes to rest is where it is made from then on. */
  private letGo(seconds: number, push?: { name: string; force: V3; seconds: number; at?: V3 }): string {
    if (!this.J) throw new Error('The physics engine is still loading: say it again in a moment.');
    if (!(seconds > 0) || seconds > 60) throw new Error('Let it go for between a moment and 60 s.');
    const { made } = this.all(), things: SimThing[] = [], done = new Set<string>(), skipped: string[] = [];
    const part = (m: Made) => ({ name: m.name, kind: m.kind, axis: m.axis, dims: m.dims, local: m.local, at: m.at, turn: m.turn });
    for (const g of this.groups.values()) {
      if (g.loose) continue; const ms = made.filter((m) => g.members.includes(m.name)); if (!ms.length || ms.some((m) => !m.matter)) continue;
      things.push({ name: g.name, parts: ms.map(part), mass: ms.reduce((t, m) => t + m.mass, 0), friction: Math.min(...ms.map((m) => m.matter!.friction)), restitution: Math.max(...ms.map((m) => m.matter!.restitution)) });
      for (const m of ms) done.add(m.name);
    }
    for (const m of made) { if (done.has(m.name)) continue; if (m.unseen) { skipped.push(`${m.name} (${m.unseen.split(':')[0]})`); continue; } if (!m.matter) { skipped.push(m.name); continue; } things.push({ name: m.name, parts: [part(m)], mass: m.mass, friction: m.matter.friction, restitution: m.matter.restitution }); }
    if (!things.length) throw new Error('Nothing made here has mass to let go.');
    // what goes into the floor before it is let go: the engine pushes it out, and that push is said (past 2 mm: a thing
    // the engine left resting sits up to a millimetre in)
    const sunk = made.filter((m) => !m.unseen && m.matter && m.at[1] - m.h / 2 < -2e-3).map((m) => `${m.name} (${mm(-(m.at[1] - m.h / 2))})`);
    const parts = this.world.parts(), fixed = parts.map((p) => ({ at: p.at, w: p.w, h: p.h, d: p.d }));
    // the joints, where what they hold still touches: each through its point, about its axis, as its thing now stands
    const joints: SimJoint[] = [], unheld: string[] = [];
    for (const j of this.jointsKept) {
      const A = made.find((m) => m.name === j.a), B: Box3 | undefined = j.fixed ? parts.find((p) => p.name === j.b) : made.find((m) => m.name === j.b);
      if (!A || !B || A.unseen || (B as Made).unseen || !A.matter) { unheld.push(`${j.a}'s ${j.kind} (${!A || !B ? 'one of the two is gone' : 'one of the two is not computed'})`); continue; }
      const gap = separation(A, B); if (gap > 1e-3) { unheld.push(`${j.a}'s ${j.kind} on ${j.b} (they are ${mm(gap)} apart now: it connects only what touches)`); continue; }
      const ga = this.groupOf(j.a); if (!j.fixed && ga && !ga.loose && ga === this.groupOf(j.b)) { unheld.push(`${j.a}'s ${j.kind} on ${j.b} (they are one piece now)`); continue; }
      const R = matOf(A.turn), off = apply3(R, j.pivot), at: V3 = [A.at[0] + off[0], A.at[1] + off[1], A.at[2] + off[2]];
      let drive: SimJoint['drive'];
      if (j.drive) { const sp = this.specs.get(j.drive.motor), gh = j.drive.gear ? GEARHEADS[j.drive.gear] : undefined; if (sp?.motor) { const md = motorModel(MOTORS[sp.motor]!); drive = { name: j.drive.motor, V: j.drive.V, Kt: md.Kt, R: windingR(md, this.temps.get(j.drive.motor) ?? AMBIENT), Tf: md.Tf, ...(gh ? { gear: { ratio: gh.ratio, efficiency: gh.efficiency } } : {}), ...(j.drive.hold !== undefined ? { hold: { w: j.drive.hold, Imax: MOTORS[sp.motor]!.maxContinuousCurrent * 2 } } : {}) }; } }
      joints.push({ kind: j.kind, name: j.a, a: j.a, b: j.fixed ? { fixed: parts.indexOf(B as PartRef) } : j.b, at, axis: apply3(R, j.axis), ...(j.limits ? { limits: j.limits } : {}), ...(j.friction ? { friction: j.friction } : {}), ...(drive ? { drive } : {}) });
    }
    const out: SimOut = simulate(this.J, things, fixed, { seconds, floor: 0, ...(push ? { push } : {}), joints });
    // where they ended is where they are: a piece's moves written into its members first
    for (const g of this.groups.values()) if (!identity(g)) this.bakeIn(g);
    for (const p of out.parts) { const sp = this.specs.get(p.name); if (!sp) continue; sp.place = { how: 'at', x: `${p.at[0]}`, y: `${p.at[1]}`, z: `${p.at[2]}` }; sp.turn = [`${p.turn[0]}`, `${p.turn[1]}`, `${p.turn[2]}`]; sp.flips = []; }
    this.track = out.track; this.lastSim = out;
    // what the joints did, kept as values; a motor that drove one, what it drew, and the heat it made in it
    const keep = (k: string, v: number, u?: string) => { this.vars.set(k, u ? `${v} ${u}` : String(v)); if (u) this.unitOf.set(k, u); else this.unitOf.delete(k); };
    const jsays: string[] = [];
    for (const j of out.joints) {
      // and the furthest each way it went over the run, as its most and its least
      if (j.kind === 'hinge') { keep(`${j.name}.most`, +((j.max * 180) / Math.PI).toPrecision(6), '°'); keep(`${j.name}.least`, +((j.min * 180) / Math.PI).toPrecision(6), '°'); } else { keep(`${j.name}.most`, +(j.max * 1e3).toPrecision(6), 'mm'); keep(`${j.name}.least`, +(j.min * 1e3).toPrecision(6), 'mm'); }
      if (j.kind === 'hinge') { keep(`${j.name}.angle`, +((j.end * 180) / Math.PI).toPrecision(6), '°'); jsays.push(`${j.name} turned on its hinge to ${deg(j.end)} (between ${deg(j.min)} and ${deg(j.max)})`); }
      else { keep(`${j.name}.travel`, +(j.end * 1e3).toPrecision(6), 'mm'); jsays.push(`${j.name} slid to ${mm(j.end)} from where it was (between ${mm(j.min)} and ${mm(j.max)})`); }
      const d = j.drive, jd = joints.find((x) => x.name === j.name)?.drive;
      if (d && jd) {
        keep(`${jd.name}.rpm`, +d.rpm.toPrecision(6), 'rpm'); keep(`${jd.name}.current`, d.current, 'A'); keep(`${jd.name}.energy`, d.energyIn, 'J'); keep(`${jd.name}.heat`, d.copper, 'J');
        this.spins.set(jd.name, (d.rpm * 2 * Math.PI) / 60);
        // the heat it made, in its own body as one temperature
        const mt = this.all().made.find((x) => x.name === jd.name); if (mt?.matter) { try { const c = thermalOf(mt.matter).c; this.temps.set(jd.name, (this.temps.get(jd.name) ?? AMBIENT) + (d.copper + d.friction) / (mt.mass * c)); } catch { /* no figures: it stays as it was */ } }
        const r3 = (v: number) => +v.toPrecision(3);
        jsays.push(`${jd.name} drove it at ${r3(jd.V)} V, by its torque at the speed it turned, to ${r3(d.rpm)} rpm, drawing ${r3(d.current)} A at the end and ${r3(d.maxCurrent)} A at most: ${joules(d.energyIn)} from the source, ${joules(d.out)} into what it turns, ${joules(d.copper)} as heat in its copper, ${joules(d.friction)} to its friction${d.gears > 1e-9 ? ` and ${joules(d.gears)} in its gears` : ''} (its own rotor's inertia left out)`);
      }
    }
    const r = (v: number) => mm(v), still = out.ends.filter((e) => e.moved < 0.001 && e.turned < 0.01), moved = out.ends.filter((e) => !still.includes(e)).sort((x, y) => y.moved - x.moved);
    const says = moved.slice(0, 8).map((e) => `${e.name} ${e.dropped > 0.002 ? `fell ${r(e.dropped)}` : `moved ${r(e.moved)}`}${e.turned > 0.05 ? `, turning ${deg(e.turned)}` : ''}, at most ${+e.speed.toPrecision(3)} m/s, ${e.resting ? 'and came to rest' : 'still moving'}`);
    return `${push ? `Pushed ${push.name} with ${+Math.hypot(...push.force).toPrecision(3)} N for ${push.seconds} s, and let` : 'Let'} ${things.length} thing${things.length === 1 ? '' : 's'} go for ${+out.seconds.toPrecision(3)} s${out.restedAt !== null ? `, all at rest by ${+out.restedAt.toPrecision(3)} s` : ''} (Jolt rigid bodies, the build fixed where it stands, the floor at 0): ${says.length ? says.join('; ') : 'nothing moved: all of it stands'}${moved.length > 8 ? `; and ${moved.length - 8} more` : ''}${still.length && moved.length ? `; ${still.length} stood still` : ''}.${out.hulls.length ? ` ${[...new Set(out.hulls)].join(', ')} ${out.hulls.length === 1 ? 'is' : 'are'} let go as the hull round ${out.hulls.length === 1 ? 'it' : 'them'}.` : ''}${skipped.length ? ` Not let go: ${skipped.join(', ')} (surfaces have no mass; what is unseen is not computed).` : ''}${jsays.length ? ` Joints: ${jsays.join('; ')}.` : ''}${unheld.length ? ` Not held: ${unheld.join('; ')}.` : ''}${sunk.length ? ` Into the floor when let go, and pushed out of it by the engine: ${sunk.join(', ')}; what it did after is real, where it started was not.` : ''}`;
  }
  /** A thing gone: its joints, its temperature and its heat go with it. */
  private forget(name: string): void { this.jointsKept = this.jointsKept.filter((j) => j.a !== name && j.b !== name); this.temps.delete(name); this.heaters.delete(name); }
  /** "hinge a to b [about x] [at x, y, z] [from -90° to 90°] [friction 0.05 N·m] [driven by m at 12 V]", "slide a on b
   *  [along x] [between -50 mm and 50 mm] [friction 2 N]": a joint where a and b touch, and only there. Its axis, unsaid,
   *  is a round one's own (a wheel's, a shaft's), else the long way of where they touch (a hinge) or the long way of b
   *  (a slide: what it runs on); its point is the middle of where they touch. */
  private jointStep(kind: Joint['kind'], a: string, rest: string): string {
    let r = ` ${rest} `;
    const take = (re: RegExp) => { const x = re.exec(r); if (x) r = r.replace(x[0], ' '); return x; };
    const STOP = '(?=\\s+(?:about|along|on|at|from|between|friction|driven)\\b|\\s*$)';
    const drv = take(new RegExp(`\\sdriven\\s+by\\s+([\\p{L}_][\\p{L}\\d_]*)(?:\\s+at\\s+(.+?V))?(?:\\s+through\\s+([\\p{L}_][\\p{L}\\d_]*|\\d+(?:\\.\\d+)?\\s*:\\s*1))?(?:\\s+held\\s+at\\s+(.+?rpm))?${STOP}`, 'iu'));
    const ax = take(/\s(?:about|along|on)\s+(-?)([xyz])\b/i);
    const lim = take(new RegExp(kind === 'hinge' ? `\\sfrom\\s+(.+?)\\s+to\\s+(.+?)${STOP}` : `\\sbetween\\s+(.+?)\\s+and\\s+(.+?)${STOP}`, 'i'));
    const fr = take(new RegExp(`\\s(?:with\\s+)?friction\\s+(?:of\\s+)?(.+?)${STOP}`, 'i'));
    const at = take(new RegExp(`\\sat\\s+(.+?)${STOP}`, 'i'));
    const bWord = r.trim().replace(/\s+/g, '_'), sc = this.reader();
    if (!bWord) throw new Error(`${kind === 'hinge' ? 'Hinge' : 'Slide'} ${a} ${kind === 'hinge' ? 'to' : 'on'} what? "${kind === 'hinge' ? `hinge ${a} to frame` : `slide ${a} on rail along x`}".`);
    if (this.groups.has(a)) throw new Error(`${a} is a joined piece: ${kind} one of its members (${this.groups.get(a)!.members.join(', ')}), and the piece turns with it.`);
    if (this.groups.has(bWord)) throw new Error(`${bWord} is a joined piece: ${kind} ${a} to the member of it that ${a} touches (${this.groups.get(bWord)!.members.join(', ')}).`);
    this.specOf(a);
    const { made } = this.all(), A = made.find((x) => x.name === a)!;
    if (A.unseen) throw new Error(`${a} is not computed (${A.unseen}): nothing can turn or slide it.`);
    const fixed = !this.specs.has(bWord), B: Box3 & Partial<Made> = fixed ? this.partOf(bWord) ?? (() => { throw new Error(this.noPart(bWord)); })() : made.find((x) => x.name === bWord)!;
    const bName = fixed ? (B as PartRef).name : bWord;
    if (bName === a) throw new Error(`${a} cannot turn on itself.`);
    const ga = this.groupOf(a); if (!fixed && ga && !ga.loose && ga === this.groupOf(bWord)) throw new Error(`${a} and ${bWord} are one piece (${ga.name}), held together: a ${kind} between them would hold nothing. Split ${ga.name} first, or join them only where they do not move.`);
    const gap = separation(A, B);
    if (gap > TOUCH) throw new Error(`${a} and ${bName} do not touch (${mm(gap)} apart): a ${kind} connects only what touches. Move them together first.`);
    // the two it joins do not collide: neither may already be in the other, nor in the rest of the other's piece
    const gb = fixed ? undefined : this.groupOf(bWord), others = fixed ? [B] : gb && !gb.loose ? gb.members.map((n) => made.find((x) => x.name === n)!).filter(Boolean) : [B];
    for (const O of others) if (boxesOver(A, O)) throw new Error(`${a} goes into ${O === B ? bName : `${(O as Made).name} (in ${gb!.name}, with ${bName})`} by ${mm(-separation(A, O))}: a ${kind} lets the two it holds pass through each other, so ${a} would turn inside it. Move ${a} clear first.`);
    // where they touch: the box where each one's box meets the other's
    const ea = [A.w, A.h, A.d], eb = [B.w, B.h, B.d], lo = [0, 1, 2].map((i) => Math.max(A.at[i]! - ea[i]! / 2, B.at[i]! - eb[i]! / 2)), hi = [0, 1, 2].map((i) => Math.min(A.at[i]! + ea[i]! / 2, B.at[i]! + eb[i]! / 2));
    const o = [0, 1, 2].map((i) => hi[i]! - lo[i]!), across = [0, 1, 2].reduce((b, i) => (o[i]! < o[b]! ? i : b), 0);
    const p: V3 = at ? (() => { const xs = at[1]!.split(/\s*,\s*/); if (xs.length !== 3) throw new Error(`Say where as "at x, y, z".`); return xs.map((x) => num(x, sc)) as V3; })() : [0, 1, 2].map((i) => (lo[i]! + hi[i]!) / 2) as V3;
    const roundOf = (X: Box3 & Partial<Made>) => ((X.kind === 'cylinder' || X.kind === 'tube' || X.kind === 'torus' || X.kind === 'cone') && X.axis ? X.axis : X.r !== undefined && X.axis ? X.axis : null);
    let k: number, why: string;
    if (ax) { k = AX[ax[2]!.toLowerCase() as Axis]; why = 'as said'; }
    else if (kind === 'hinge' && (roundOf(A) || roundOf(B))) { const w = roundOf(A) ? A : B; k = AX[roundOf(w)!]; why = `${w === A ? a : bName}'s own axis`; }
    else if (kind === 'hinge') { k = [0, 1, 2].filter((i) => i !== across).reduce((b, i) => (o[i]! > o[b]! ? i : b), across === 0 ? 1 : 0); why = 'the long way of where they touch'; }
    else { k = [0, 1, 2].reduce((b, i) => (eb[i]! > eb[b]! ? i : b), 0); why = `the long way of ${bName}`; }
    const u: V3 = [0, 0, 0]; u[k] = ax?.[1] === '-' ? -1 : 1;
    let limits: [number, number] | undefined;
    if (lim) {
      const read = (x: string) => (kind === 'hinge' && !lex(x).some((q) => q.t === 'num' && q.unit) ? (num(x, sc) * Math.PI) / 180 : num(x, sc));
      limits = [read(lim[1]!), read(lim[2]!)];
      if (!(limits[0] < limits[1])) throw new Error(`Its limits go from the less to the more: ${lim[1]} is not less than ${lim[2]}.`);
      if (kind === 'hinge' && (limits[0] < -Math.PI - 1e-9 || limits[1] > Math.PI + 1e-9)) throw new Error('A hinge turns between -180° and 180° at most.');
    }
    const friction = fr ? num(fr[1]!, sc) : undefined;
    let drive: Joint['drive'];
    if (drv) {
      if (kind !== 'hinge') throw new Error('A motor turns a hinge: a slide is pushed ("push carriage with 5 N along x").');
      const ms = this.specOf(drv[1]!); if (!ms.motor) throw new Error(`${drv[1]} is not a motor: place one with "place motor named ${drv[1]}".`);
      const gm = this.groupOf(drv[1]!), gb = fixed ? undefined : this.groupOf(bWord);
      if (drv[1] !== bName && !(gm && !gm.loose && gm === gb)) throw new Error(`${drv[1]} turns ${a} against what holds ${a}: it must be ${bName}, or joined to it ("join ${drv[1]} and ${bName}"), for its torque to push back on something.`);
      // through a gearhead: one placed here (its own sheet), or by its ratio, one kept that fits this motor
      let gear: string | undefined;
      if (drv[3]) {
        const gs = this.specs.get(drv[3]), r = /^(\d+(?:\.\d+)?)\s*:\s*1$/.exec(drv[3].trim());
        gear = gs?.gearhead ?? Object.values(GEARHEADS).find((g) => (r ? Math.abs(g.ratio - Number(r[1])) < 1e-9 : false) && g.fits.includes(ms.motor!))?.id;
        if (!gear) throw new Error(`${drv[3]} is no gearhead kept here for ${drv[1]}: ${Object.values(GEARHEADS).filter((g) => g.fits.includes(ms.motor!)).map((g) => `${g.ratio}:1`).join(', ') || 'none fits it'}.`);
        if (gs && !(drv[3] === bName || (this.groupOf(drv[3]) && this.groupOf(drv[3]) === (fixed ? undefined : this.groupOf(bWord))))) throw new Error(`${drv[3]} must hold ${a}, or be joined to what does.`);
      }
      const hold = drv[4] ? (num(drv[4].replace(/rpm$/i, ''), sc) * 2 * Math.PI) / 60 : undefined;
      drive = { motor: drv[1]!, V: drv[2] ? num(drv[2], sc) : MOTORS[ms.motor]!.V, ...(gear ? { gear } : {}), ...(hold !== undefined ? { hold } : {}) };
    }
    // kept in a's own frame, so they go where it goes
    const R = matOf(A.turn), pivot = applyT(R, [p[0] - A.at[0], p[1] - A.at[1], p[2] - A.at[2]]), axis = applyT(R, u);
    this.jointsKept = this.jointsKept.filter((j) => !(j.a === a && j.b === bName));
    this.jointsKept.push({ kind, a, b: bName, fixed, pivot, axis, ...(limits ? { limits } : {}), ...(friction ? { friction } : {}), ...(drive ? { drive } : {}) });
    const where = `(${p.map((v) => +(v * 1e3).toPrecision(4)).join(', ')}) mm`, lims = limits ? (kind === 'hinge' ? `, from ${deg(limits[0])} to ${deg(limits[1])}` : `, from ${mm(limits[0])} to ${mm(limits[1])} of where it is`) : '';
    return `${kind === 'hinge' ? 'Hinged' : 'Slid'} ${a} ${kind === 'hinge' ? 'to' : 'on'} ${bName}${fixed ? ' (the build: fixed)' : ''} ${kind === 'hinge' ? 'about' : 'along'} ${ax?.[1] ?? ''}${'xyz'[k]} (${why}), through ${where} where they touch${lims}. Let go, it ${kind === 'hinge' ? 'turns' : 'slides'} there and nowhere else, and the two do not collide with each other${friction ? `; held back by ${+friction.toPrecision(3)} ${kind === 'hinge' ? 'N·m' : 'N'} of friction` : `, with no friction (say "friction ${kind === 'hinge' ? '0.05 N·m' : '2 N'}" for some)`}${drive ? `; ${drive.motor} turns it ${drive.hold !== undefined ? `held at ${+((drive.hold * 60) / (2 * Math.PI)).toPrecision(4)} rpm by a speed controller (up to ${+drive.V.toPrecision(3)} V, twice its continuous current at most)` : `at ${+drive.V.toPrecision(3)} V`}${drive.gear ? ` through ${GEARHEADS[drive.gear]!.label}` : ''}, by its sheet's torque at the speed it turns` : ''}.`;
  }
  /** Where two touching things pass heat: the area of what touches, sampled on their surfaces (any turning, any of a
   *  box, a cylinder, a tube with its bore, a ball), and how far each one's middle is from the middle of it. A round
   *  side or a ball touching passes heat only through what lies within half a millimetre of touching (estimated: the
   *  air in the thin gap round it carries some more). */
  private contactOf(A: Made, B: Made): { area: number; LA: number; LB: number; assumed?: string } | null {
    const t = touchPatch(A, B); if (!t) return null;
    const round = (X: Made) => X.kind === 'sphere' || X.kind === 'cylinder' || X.kind === 'tube' || X.kind === 'cone' || X.kind === 'torus';
    const dist = (X: Made) => Math.max(Math.hypot(X.at[0] - t.at[0], X.at[1] - t.at[1], X.at[2] - t.at[2]), 1e-4);
    const assumed = !t.sampled ? 'a cone or a ring touches as the box round it does (estimated)' : (round(A) || round(B)) && t.area < 0.5 * Math.min(A.area, B.area) ? 'where a round side or a ball touches, the heat goes through what lies within half a millimetre of touching (estimated: the air in the thin gap round it carries some more)' : undefined;
    return { area: t.area, LA: dist(A), LB: dist(B), ...(assumed ? { assumed } : {}) };
  }
  /** What the face between two things resists heat by, m² K/W: nothing where they are fused (one body); a glue line
   *  over its thickness; pressed or bolted, an interface in air. */
  private interfaceR(a: string, b: string): { R: number; how: string } {
    const g = this.groupOf(a);
    if (g && !g.loose && g === this.groupOf(b)) {
      const bd = g.bonds?.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
      if (bd?.how === 'fused') return { R: 0, how: 'fused' };
      if (bd?.how === 'glued') { const ad = Object.values(ADHESIVES).find((x) => x.label === bd.with), t = ad?.bondline ?? 2e-4; return { R: t / GLUE_K, how: `glued (${mm(t)} of ${bd.with})` }; }
    }
    return { R: TOUCHING_R, how: 'touching' };
  }
  /** A temperature, said in °C (or K): what it reads in °C. */
  private tempOf(expr: string): number {
    const e = expr.trim(), v = /\dK$|\sK$/.test(e) ? num(e, this.reader()) - 273.15 : num(e, this.reader());
    if (!(v > -273.15)) throw new Error(`${expr} is below absolute zero.`);
    return v;
  }
  /** "heat cap to 150 °C": its temperature now. A piece: every member. */
  private setTemp(name: string, expr: string): string {
    const T = this.tempOf(expr), names = this.groups.get(name)?.members ?? [this.specOf(name).name];
    const was = names.map((n) => this.temps.get(n) ?? AMBIENT); for (const n of names) this.temps.set(n, T);
    return `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} at ${+T.toPrecision(4)} °C now (${names.length > 1 ? 'they were' : 'it was'} ${[...new Set(was.map((x) => +x.toPrecision(4)))].join(', ')} °C). Let heat flow ("let heat flow for 60 s") and it spreads to what touches it and goes to the air.`;
  }
  /** "heat cap with 5 W": heat put into it while heat flows, as a heater, or as what it does that makes heat. */
  private setHeater(name: string, expr: string): string {
    const P = num(expr, this.reader()); this.specOf(name);
    if (P === 0) { this.heaters.delete(name); return `${name}: no heat put into it now.`; }
    this.heaters.set(name, P);
    return `${name}: ${+P.toPrecision(4)} W put into it while heat flows${P < 0 ? ' (taken out: a cooler)' : ''}.`;
  }
  /** Heat let flow for so long: between everything made that touches, and out of each to the room's air. */
  private heatFlow(seconds: number): string {
    if (!(seconds > 0) || seconds > 30 * 86400) throw new Error('Let heat flow for a moment, up to 30 days.');
    const { made } = this.all(), keep: Made[] = [], props: ThermalProps[] = [], left: string[] = [];
    for (const m of made) { if (m.unseen || !m.matter) continue; try { props.push(thermalOf(m.matter)); keep.push(m); } catch { left.push(m.name); } }
    if (!keep.length) throw new Error('Nothing made here has matter to hold heat.');
    const links: HeatLink[] = [], touching = keep.map(() => 0), notes = new Set<string>(), hows = new Map<string, number>(), floor: string[] = [];
    for (let i = 0; i < keep.length; i++) for (let j = i + 1; j < keep.length; j++) {
      const A = keep[i]!, B = keep[j]!; if (separation(A, B) > TOUCH) continue;
      const c = this.contactOf(A, B); if (!c) continue;
      const f = this.interfaceR(A.name, B.name), G = 1 / (c.LA / (props[i]!.k * c.area) + f.R / c.area + c.LB / (props[j]!.k * c.area));
      links.push({ a: i, b: j, G }); touching[i] += c.area; touching[j] += c.area; if (c.assumed) notes.add(c.assumed); hows.set(f.how.replace(/ \(.*/, ''), (hows.get(f.how.replace(/ \(.*/, '')) ?? 0) + 1);
    }
    // what rests on the floor: the part of its surface within touching of it, which the air does not reach
    keep.forEach((m, i) => { if (m.at[1] - m.h / 2 > 1e-3) return; const pts = surfaceOf(m), a = pts ? pts.filter((q) => q.p[1] <= TOUCH && q.p[1] >= -2e-3).reduce((t, q) => t + q.a, 0) : m.w * m.d; if (a > 0) { touching[i] += a; floor.push(m.name); } });
    const nodes: HeatNode[] = keep.map((m, i) => {
      const whole = Number.isFinite(m.area) ? m.area : 2 * (m.w * m.h + m.w * m.d + m.h * m.d);
      return { name: m.name, C: m.mass * props[i]!.c, T0: this.temps.get(m.name) ?? AMBIENT, P: this.heaters.get(m.name) ?? 0, area: Math.max(0, whole - touching[i]!), L: Math.max(m.h, 0.01), emissivity: props[i]!.emissivity };
    });
    const run = flowHeat(nodes, links, seconds);
    keep.forEach((m, i) => this.temps.set(m.name, run.end[i]!));
    this.heatKept = { names: keep.map((m) => m.name), run, seconds };
    // what passed where it melts or breaks down; and where one temperature is too few for it
    const hot: string[] = [], thick: string[] = [];
    keep.forEach((m, i) => {
      const top = Math.max(...run.T[i]!), fu = FUSION[m.matter!.id];
      if (fu?.lost !== null && fu?.lost !== undefined && top >= fu.lost) hot.push(`${m.name} reached ${+top.toPrecision(4)} °C, past ${fu.lost} °C where ${fu.lostWhat.replace(/^it /, 'it ')}`);
      else if (fu?.melts !== null && fu?.melts !== undefined && top >= fu.melts) hot.push(`${m.name} reached ${+top.toPrecision(4)} °C, past its melting point of ${fu.melts} °C`);
      const n = nodes[i]!, h = n.area > 0 ? run.gAir[i]! / n.area : 0, Bi = (h * (m.volume / Math.max(n.area + touching[i]!, 1e-12))) / props[i]!.k;
      if (Bi > 0.1 && Math.max(...run.T[i]!) - Math.min(...run.T[i]!) > 0.1) thick.push(`${m.name} (Bi ${+Bi.toPrecision(2)})`);
    });
    const moved = keep.map((m, i) => ({ m, d: run.end[i]! - nodes[i]!.T0, i })).filter((x) => Math.abs(x.d) > 0.005).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const r = (v: number) => +v.toPrecision(4), e = run.energy, J = (v: number) => (Math.abs(v) < 1e-6 ? '0 J' : joules(Math.abs(v)).replace(/^/, v < 0 ? '-' : ''));
    const says = moved.slice(0, 8).map((x) => `${x.m.name} ${r(nodes[x.i]!.T0)} → ${r(run.end[x.i]!)} °C`);
    const T = (v: number) => (seconds >= 3600 ? `${r(v / 3600)} h` : seconds >= 120 ? `${r(v / 60)} min` : `${r(v)} s`);
    return `Heat flowed for ${T(seconds)} among ${keep.length} thing${keep.length === 1 ? '' : 's'} through ${links.length} contact${links.length === 1 ? '' : 's'}${hows.size ? ` (${[...hows].map(([k, v]) => `${v} ${k}`).join(', ')})` : ''}, and out to air at ${AMBIENT} °C: ${says.length ? says.join('; ') : 'nothing changed temperature: everything is at the room\'s'}${moved.length > 8 ? `; and ${moved.length - 8} more` : ''}. Energy: ${J(e.in)} put in, ${J(e.air)} to the air, ${e.stored >= 0 ? `${J(e.stored)} more` : `${J(-e.stored)} less`} held in them at the end (in less out less held: ${J(e.in - e.air - e.stored)}).${hot.length ? ` ${hot.join('; ')}.` : ''} Each is one temperature through it; contacts pass heat by L / k A to the face from each middle, and across it ${TOUCHING_R * 1e4}×10⁻⁴ m² K/W where they only touch (Incropera Table 3.1, aluminium in air: an estimate for other pairs), nothing where fused, a glue line by its thickness.${thick.length ? ` One temperature is too few for ${thick.join(', ')}: its inside and outside differ (Biot over 0.1).` : ''}${floor.length ? ` The floor is not in it: what rests on it (${floor.slice(0, 4).join(', ')}${floor.length > 4 ? ', …' : ''}) loses nothing through it.` : ''}${notes.size ? ` ${[...notes].join('; ')}.` : ''}${left.length ? ` Not in it, with no thermal figures kept: ${left.join(', ')}.` : ''}`;
  }
  /** The same steps again: once for each binding, {i} its count and {it} the thing it is over. */
  private loop(head: string, binds: Record<string, string>[], body: string): string {
    const steps = body.split(/\s*;\s*/).map((x) => x.trim()).filter(Boolean), outs: string[] = [];
    for (const b of binds) for (const st of steps) { const line = st.replace(/\{(\w+)\}/g, (all, k: string) => b[k] ?? all); try { outs.push(this.step(this.bake(line))); } catch (e) { throw new Error(`${head}: stopped at ${Object.values(b).join(', ')} ("${line.slice(0, 80)}"): ${(e as Error).message}`); } }
    return `${head}: ${outs.length} step${outs.length === 1 ? '' : 's'} done. Last: ${(outs.at(-1) ?? '').replace(/ Now: .*$/, '').split(/(?<=[.;])\s/)[0]}`;
  }
  /** Everything made, as it would be bought and cut: each thing's shape, size, matter and mass; each piece and what
   *  holds it; each motor's sheet; totals by matter. */
  private partsList(): string {
    const { made } = this.all(), seen = made.filter((m) => !m.unseen), rows: string[] = [], byMatter = new Map<string, { n: number; mass: number; vol: number }>();
    const stock = (m: Made) => {
      const d = m.dims, r = (v: number) => +(v * 1e3).toPrecision(3);
      if (m.motor) { const sh = MOTORS[m.motor]!; return `${sh.label}${sh.price ? `, seen at ${sh.price.amount} ${sh.price.currency} (${sh.price.seen})` : ''}`; }
      if (m.kind === 'box') { const [a, b, c] = [d.w!, d.d!, d.h!].sort((x, y) => x - y); return a <= 0.4 * b ? `${r(b)} × ${r(c)} mm cut from ${r(a)} mm sheet` : `${r(a)} × ${r(b)} × ${r(c)} mm block`; }
      if (m.kind === 'cylinder') return d.h! > d.D! ? `Ø${r(d.D!)} mm bar, ${r(d.h!)} mm long` : `Ø${r(d.D!)} mm disc, ${r(d.h!)} mm thick`;
      if (m.kind === 'tube') return `Ø${r(d.D!)} × ${r(d.wall!)} mm tube, ${r(d.h!)} mm long`;
      if (m.kind === 'sphere') return `Ø${r(d.D!)} mm ball`;
      return `${m.word} ${DIMS[m.kind].map((k) => `${r(d[k]!)}`).join(' × ')} mm`;
    };
    for (const m of seen) { if (!m.matter) continue; rows.push(`${m.name}: ${stock(m)}, ${m.matter.name}, ${kg(m.mass)}${m.broken ? ' (broken)' : ''}`); const t = byMatter.get(m.matter.name) ?? { n: 0, mass: 0, vol: 0 }; t.n++; t.mass += m.mass; t.vol += m.volume; byMatter.set(m.matter.name, t); }
    if (!rows.length) return 'Nothing made here has matter to list.';
    const held = (g: Group) => { const n: Record<string, number> = {}; for (const x of g.bonds ?? []) n[x.how] = (n[x.how] ?? 0) + 1; return Object.entries(n).map(([k, v]) => `${v} ${k}`).join(', ') || 'held'; };
    const pieces = [...this.groups.values()].map((g) => (g.loose ? `${g.name} (grouped, not held): ${g.members.join(', ')}` : `${g.name}: ${g.members.join(' + ')}, ${held(g)}`));
    const axisWord = (v: V3) => 'xyz'[[0, 1, 2].reduce((b, i) => (Math.abs(v[i]!) > Math.abs(v[b]!) ? i : b), 0)];
    for (const j of this.jointsKept) pieces.push(`${j.a} ${j.kind === 'hinge' ? 'hinged to' : 'slides on'} ${j.b} (its own ${axisWord(j.axis)})${j.drive ? `, driven by ${j.drive.motor}` : ''}: a ${j.kind === 'hinge' ? 'hinge or bearing' : 'slide or rail'} there`);
    const total = [...byMatter.values()].reduce((a, x) => a + x.mass, 0);
    this.vars.set('parts.count', String(rows.length)); this.vars.set('parts.mass', String(total)); this.unitOf.set('parts.mass', 'kg');
    const hidden = made.filter((m) => m.unseen).map((m) => m.name);
    return `Parts list, ${rows.length} part${rows.length === 1 ? '' : 's'}, ${kg(total)}: ${rows.join(' · ')}.${pieces.length ? ` Pieces: ${pieces.join(' · ')}.` : ''} By matter: ${[...byMatter].map(([k, x]) => `${k} ${x.n} part${x.n === 1 ? '' : 's'}, ${kg(x.mass)}, ${+(x.vol * 1e6).toPrecision(3)} cm³`).join('; ')}.${hidden.length ? ` Not listed, not computed: ${hidden.join(', ')}.` : ''} No prices are kept for matters; a motor's is the one seen for it.`;
  }
  /** A load put on a thing: what it rests on found from what touches its bottom, and the beam law that fits. Between
   *  two supports, simply supported (M = F a b / L, deflection F a² b² / (3 E I L)); past its last support, a
   *  cantilever (M = F a, deflection F a³ / (3 E I)); over a support, bearing on it (σ = F / A). Bending stress
   *  σ = M c / I of its section across the span: a rectangle b h³ / 12, a round π D⁴ / 64, a tube π (D⁴ - d⁴) / 64.
   *  Below its yield it holds, by a factor; past it, it bends for good; past its ultimate, it breaks. Its own weight
   *  is not added: add it to the load ("with 500 N + cap.mass * g"). Its section is read from its box along x or z. */
  /** A load on a part: at its middle or its end, or spread evenly along it; borne across its whole width, or across so
   *  much of it ("over 150 mm") where it bears on a patch narrower than the part. */
  private loadStep(name: string, F: number, where: string, onWidth?: number): string {
    const s = this.specOf(name), X = this.all().made.find((m) => m.name === name)!; if (!X.matter) throw new Error(`${name} is a surface: it has nothing to bear a load with.`);
    // what holds it up may be joined to it: a table's legs hold its top though they are one piece with it
    const others: Box3[] = [...this.all().made.filter((m) => m.name !== name && !m.unseen), ...this.world.parts()];
    const mt = X.matter, E = mt.E, d = X.dims, round = X.kind === 'cylinder' || X.kind === 'tube';
    // read along each way it lies, the load where it is said along that way: the way that bears it worst governs (a
    // shelf held along its ends bends across its width, whichever of its sides is the longer)
    const across0 = (along: number) => (along === 0 ? 2 : 0);
    const reading = (along: number) => {
      const across = across0(along), ext = [X.w, X.h, X.d], bottom = X.at[1] - X.h / 2;
      const lo = X.at[along]! - ext[along]! / 2, hi = X.at[along]! + ext[along]! / 2, p = where === 'end' ? hi : X.at[along]!;
      const patches: { lo: number; hi: number; c0: number; c1: number; area: number; by: string }[] = [];
      if (bottom <= 1e-3) patches.push({ lo, hi, c0: X.at[across]! - ext[across]! / 2, c1: X.at[across]! + ext[across]! / 2, area: X.w * X.d, by: 'the floor' });
      for (const o of others) {
        if (Math.abs(o.at[1] + o.h / 2 - bottom) > 1e-3) continue;
        const a0 = Math.max(lo, o.at[along]! - [o.w, o.h, o.d][along]! / 2), a1 = Math.min(hi, o.at[along]! + [o.w, o.h, o.d][along]! / 2);
        const c0 = Math.max(X.at[across]! - ext[across]! / 2, o.at[across]! - [o.w, o.h, o.d][across]! / 2), c1 = Math.min(X.at[across]! + ext[across]! / 2, o.at[across]! + [o.w, o.h, o.d][across]! / 2);
        if (a1 > a0 && c1 > c0) patches.push({ lo: a0, hi: a1, c0, c1, area: (a1 - a0) * (c1 - c0), by: (o as PartRef).name ?? 'a part' });
      }
      // nothing under it, but held at an end it is joined at (a bracket's arm latched to its hinge block): a cantilever
      // fixed there, its joint taking its moment
      const g = !patches.length ? [...this.groups.values()].find((x) => !x.loose && x.members.includes(name)) : undefined;
      const fixedAt = g ? others.flatMap((o) => {
        const on = (o as PartRef).name; if (!on || !g.members.includes(on)) return [];
        const oe = [o.w, o.h, o.d], yOv = Math.min(X.at[1] + X.h / 2, o.at[1] + o.h / 2) - Math.max(bottom, o.at[1] - o.h / 2), cOv = Math.min(X.at[across]! + ext[across]! / 2, o.at[across]! + oe[across]! / 2) - Math.max(X.at[across]! - ext[across]! / 2, o.at[across]! - oe[across]! / 2);
        if (yOv <= 1e-6 || cOv <= 1e-6) return [];
        const oLo = o.at[along]! - oe[along]! / 2, oHi = o.at[along]! + oe[along]! / 2;
        return Math.abs(oHi - lo) < 1e-3 ? [{ at: lo, far: hi, by: on }] : Math.abs(oLo - hi) < 1e-3 ? [{ at: hi, far: lo, by: on }] : [];
      })[0] : undefined;
      if (!patches.length && !fixedAt) return null;
      let law: string, M = 0, defl = 0, sigma: number;
      // it bears straight down on what is under the load itself; what holds it along one edge (a wall under a roof's side)
      // is under it along this way but not under the load, and holds it only across the other way
      const mid = X.at[across]!, over = patches.find((q) => p >= q.lo - 1e-9 && p <= q.hi + 1e-9 && mid >= q.c0 - 1e-9 && mid <= q.c1 + 1e-9);
      // its section across the span: depth up and down, width across
      const depth = X.h, width = onWidth !== undefined ? Math.min(onWidth, ext[across]!) : ext[across]!;
      const I = round && X.axis === (along === 0 ? 'x' : 'z') ? (X.kind === 'tube' ? (Math.PI * (d.D! ** 4 - (d.D! - 2 * d.wall!) ** 4)) / 64 : (Math.PI * d.D! ** 4) / 64) : (width * depth ** 3) / 12, c = depth / 2;
      if (fixedAt) {
        const L = Math.abs(fixedAt.far - fixedAt.at), a = where === 'end' ? L : Math.abs(X.at[along]! - fixedAt.at);
        if (where === 'spread') { M = (F * L) / 2; defl = (F * L ** 3) / (8 * E * I); law = `spread along a cantilever ${mm(L)} out from ${fixedAt.by}, fixed to it at its end: M = F L / 2`; }
        else { M = F * a; defl = (F * a ** 3) / (3 * E * I); law = `a cantilever ${mm(a)} out from ${fixedAt.by}, fixed to it at its end: M = F a`; }
        return { law, M, defl, sigma: (M * c) / I };
      }
      if (over) { sigma = F / over.area; law = `it bears on ${over.by}: σ = F / A over ${+(over.area * 1e4).toPrecision(3)} cm²`; }
      else {
        const left = patches.filter((q) => q.hi < p).sort((a, b) => b.hi - a.hi)[0], right = patches.filter((q) => q.lo > p).sort((a, b) => a.lo - b.lo)[0];
        // under the load along this way but to either side of it the other way (a stool's two front legs, the load at the
        // front edge between them): it spans between those two, the other way
        const straddle = patches.filter((q) => p >= q.lo - 1e-9 && p <= q.hi + 1e-9), sl = straddle.filter((q) => q.c1 < mid).sort((a, b) => b.c1 - a.c1)[0], sr = straddle.filter((q) => q.c0 > mid).sort((a, b) => a.c0 - b.c0)[0];
        const spread = where === 'spread';
        if (!(left && right) && sl && sr) {
          const a = mid - sl.c1, b = sr.c0 - mid, L = a + b, Ia = round ? I : (ext[along]! * depth ** 3) / 12;
          if (spread) { M = (F * L) / 8; defl = (5 * F * L ** 3) / (384 * E * Ia); law = `spread evenly across ${mm(L)} the other way, between ${sl.by} and ${sr.by}: M = F L / 8`; }
          else { M = (F * a * b) / L; defl = (F * a * a * b * b) / (3 * E * Ia * L); law = `simply supported across ${mm(L)} the other way, between ${sl.by} and ${sr.by}: M = F a b / L`; }
          return { law, M, defl, sigma: (M * c) / Ia };
        }
        if (!left && !right) return null;
        if (left && right && spread) { const L = right.lo - left.hi; M = (F * L) / 8; defl = (5 * F * L ** 3) / (384 * E * I); law = `spread evenly across ${mm(L)} between ${left.by} and ${right.by}: M = F L / 8`; }
        else if (left && right) { const a = p - left.hi, b = right.lo - p, L = a + b; M = (F * a * b) / L; defl = (F * a * a * b * b) / (3 * E * I * L); law = `simply supported across ${mm(L)} between ${left.by} and ${right.by}: M = F a b / L`; }
        else if (spread) { const q = (left ?? right)!, arm = left ? hi - q.hi : q.lo - lo; M = (F * arm) / 2; defl = (F * arm ** 3) / (8 * E * I); law = `spread along a cantilever ${mm(arm)} out past ${q.by}: M = F a / 2`; }
        else { const q = (left ?? right)!, arm = left ? p - q.hi : q.lo - p; M = F * arm; defl = (F * arm ** 3) / (3 * E * I); law = `a cantilever ${mm(arm)} out past ${q.by}: M = F a`; }
        sigma = (M * c) / I;
      }
      return { law, M, defl, sigma };
    };
    const r0 = reading(X.w >= X.d ? 0 : 2), r1 = reading(X.w >= X.d ? 2 : 0), r = [r0, r1].filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => b.sigma - a.sigma)[0];
    if (!r) throw new Error(`Nothing holds ${name} up: nothing touches its bottom. Let it go to see where it falls.`);
    const { law, M, defl, sigma } = r;
    const factor = mt.yield / sigma, breaks = sigma >= mt.ultimate, yields = !breaks && sigma >= mt.yield;
    const keep = (k: string, v: number, u?: string) => { this.vars.set(`${name}.${k}`, u ? `${v} ${u}` : String(v)); if (u) this.unitOf.set(`${name}.${k}`, u); else this.unitOf.delete(`${name}.${k}`); };
    keep('stress', sigma / 1e6, 'MPa'); keep('factor', +factor.toPrecision(4)); keep('deflection', defl * 1e3, 'mm'); keep('broken', breaks ? 1 : 0);
    s.broken = breaks || undefined;
    const MPa = (v: number) => `${+(v / 1e6).toPrecision(3)} MPa`;
    return `${+F.toPrecision(4)} N on ${name}${where === 'end' ? ' at its end' : where === 'spread' ? ' spread along it' : ''}${onWidth !== undefined ? ` over ${mm(onWidth)} of its width` : ''}: ${law}${M ? `, ${+M.toPrecision(3)} N·m, σ = M c / I = ${MPa(sigma)}` : `, ${MPa(sigma)}`}${defl ? `, bending ${mm(defl)} under it` : ''}. ${breaks ? `It breaks: past the ${MPa(mt.ultimate)} ${mt.name} takes before it breaks.` : yields ? `It yields: past its ${MPa(mt.yield)} yield it bends for good (it holds ${MPa(mt.ultimate)} before it breaks).` : `It holds, ${+factor.toPrecision(3)} times over its yield of ${MPa(mt.yield)}.`} Its own weight is not added to the load.`;
  }
  /** A chart of what was worked out over time: a motor's run, or the last fall. */
  private chartStep(what: string): string {
    const name = what.replace(/^(the|its)\s+/i, '').trim(), run = this.runsKept.get(name);
    if (run) {
      const rpm = run.rpm.some((v) => v > 0);
      this.chartKept = { title: `${name}: ${run.label}`, note: `${run.V} V for ${run.seconds} s against ${run.load} N·m${run.jacket ? `, cooled by ${run.jacket.liquid}` : ''}${run.overheated !== null ? `; its winding passed ${run.maxWinding} °C at ${+run.overheated.toPrecision(3)} s` : ''}`, panels: [
        ...(rpm ? [{ label: 'Speed (rpm)', unit: 'rpm', series: [{ name: 'speed', t: run.t, v: run.rpm }] }] : []),
        { label: 'Current (A)', unit: 'A', series: [{ name: 'current', t: run.t, v: run.current }] },
        { label: 'Temperature (°C)', unit: '°C', series: [{ name: 'winding', t: run.t, v: run.winding }, { name: 'housing', t: run.t, v: run.housing }] },
      ] };
      return `Charted ${name}'s run: ${rpm ? 'speed, ' : ''}current and temperature over its ${run.seconds} s, each on its own scale.`;
    }
    if (/^(heat|heats|temperature|temperatures|warmth|cooling)$/i.test(name) || (this.heatKept?.names.includes(name) && !this.lastSim?.joints.some((j) => j.name === name))) {
      const h = this.heatKept; if (!h) throw new Error('No heat has flowed yet: "heat cap to 150 °C" and "let heat flow for 60 s" first.');
      // those whose temperature moved: more than a tenth of a degree, and a fiftieth of the most any moved
      const all = h.names.map((n, i) => ({ n, i, d: Math.max(...h.run.T[i]!) - Math.min(...h.run.T[i]!) })), most = Math.max(...all.map((x) => x.d));
      const ix = (h.names.includes(name) ? all.filter((x) => x.n === name) : all.filter((x) => x.d > Math.max(0.1, most / 50))).sort((a, b) => b.d - a.d).slice(0, 8);
      if (!ix.length) throw new Error('No temperature moved as heat flowed: heat something first ("heat cap to 150 °C").');
      const hours = h.seconds >= 3600, mins = !hours && h.seconds >= 120, k = hours ? 3600 : mins ? 60 : 1, unit = hours ? 'h' : mins ? 'min' : 's';
      this.chartKept = { title: ix.length === 1 ? `${ix[0]!.n}: its temperature` : 'Temperatures as heat flowed', note: `${+(h.seconds / k).toPrecision(3)} ${unit}, each one temperature through it, cooled by still air at ${AMBIENT} °C`, tUnit: unit, panels: [{ label: 'Temperature (°C)', unit: '°C', series: ix.map((x) => ({ name: x.n, t: h.run.t.map((t) => t / k), v: h.run.T[x.i]! })) }] };
      return `Charted ${ix.length === 1 ? `${ix[0]!.n}'s temperature` : `the temperatures of the ${ix.length} that changed most`} over ${+(h.seconds / k).toPrecision(3)} ${unit}.`;
    }
    if (/^(joints?|hinges?|slides?|swing|angles?)$/i.test(name) || this.lastSim?.joints.some((j) => j.name === name)) {
      const sim = this.lastSim; if (!sim?.joints.length) throw new Error('No joint has moved yet: hinge or slide something, then "simulate 2 s".');
      const js = sim.joints.filter((j) => (sim.joints.some((x) => x.name === name) ? j.name === name : true)), hs = js.filter((j) => j.kind === 'hinge'), ss = js.filter((j) => j.kind === 'slide');
      this.chartKept = { title: js.length === 1 ? `${js[0]!.name}: how it ${js[0]!.kind === 'hinge' ? 'turned' : 'slid'}` : 'How the joints moved', note: `${+sim.seconds.toPrecision(3)} s let go, Jolt hinge and slider constraints`, panels: [
        ...(hs.length ? [{ label: 'Angle (°)', unit: '°', series: hs.slice(0, 8).map((j) => ({ name: j.name, t: j.t, v: j.v.map((v) => (v * 180) / Math.PI) })) }] : []),
        ...(ss.length ? [{ label: 'Travel (mm)', unit: 'mm', series: ss.slice(0, 8).map((j) => ({ name: j.name, t: j.t, v: j.v.map((v) => v * 1e3) })) }] : []),
      ] };
      return `Charted how ${js.length === 1 ? js[0]!.name : `the ${js.length} joints`} moved over ${+sim.seconds.toPrecision(3)} s.`;
    }
    if (/^(fall|falls|the fall|motion|heights|drop|let go)$/i.test(name) || this.lastSim?.track.names.includes(name)) {
      const sim = this.lastSim; if (!sim) throw new Error('Nothing has been let go yet: "simulate 3 s" first.');
      const tr = sim.track, ys = tr.names.map((n, i) => ({ n, v: tr.frames.map((f) => f.poses[i]!.at[1]) }));
      const pick = this.lastSim!.track.names.includes(name) ? ys.filter((y) => y.n === name) : ys.sort((a, b) => (b.v[0]! - b.v.at(-1)!) - (a.v[0]! - a.v.at(-1)!)).slice(0, 8);
      this.chartKept = { title: pick.length === 1 ? `${pick[0]!.n}: its height as it fell` : 'Heights as they fell', note: `${tr.frames.length} moments over ${+sim.seconds.toPrecision(3)} s, Jolt rigid bodies${ys.length > pick.length ? `; the ${pick.length} that fell furthest of ${ys.length}` : ''}`, panels: [{ label: 'Height (m)', unit: 'm', series: pick.map((y) => ({ name: y.n, t: tr.frames.map((f) => f.t), v: y.v })) }] };
      return `Charted ${pick.length === 1 ? `${pick[0]!.n}'s height` : `the heights of the ${pick.length} that fell furthest`} over ${+sim.seconds.toPrecision(3)} s.`;
    }
    throw new Error(`Nothing to chart as "${what}": a motor that has run ("chart m"), the last fall ("chart fall"), the joints ("chart joints") or the heat ("chart heat").`);
  }
  /** Each motor's last run, for a chart. */
  runs(): Map<string, MotorRun> { return this.runsKept; }
  /** Things made already, made of another matter: a joined piece, every member of it. */
  private matterFor(word: string, names: string[]): string {
    const mt = matterOf(word), done: string[] = [];
    for (const n of names) { const g = this.groups.get(n); for (const x of g ? g.members : [n]) { this.specOf(x).matter = word; done.push(x); } }
    return `${done.join(', ')} now of ${mt.name}, ${fmt(mt.density)} kg/m³ (${mt.source}).${this.follows()}`;
  }
  /** A calculation, worked out and said; "name = …" keeps it as a value, an equation says whether it holds. The answer is kept as `ans`. */
  private calcStep(expr: string): string {
    const named = /^([\p{L}_][\p{L}\d_]*)\s*=\s*([^=].*)$/u.exec(expr);
    if (named && !this.specs.has(named[1]!) && !named[2]!.includes('=')) return this.assign(named[1]!, named[2]!);
    const v = calc(expr, this.reader());
    if (typeof v === 'boolean') {
      // one side = the other: each side worked out, and whether they are the same
      const sides = expr.split(/(?<![<>=!])=(?!=)/);
      if (sides.length === 2) { const [a, b] = sides.map((x) => calc(x, this.reader())); if (typeof a === 'number' && typeof b === 'number') { this.vars.set('ans', String(b)); this.unitOf.delete('ans'); return `${sides[0]!.trim()} = ${+a.toPrecision(6)} and ${sides[1]!.trim()} = ${+b.toPrecision(6)}: ${v ? 'yes, it holds' : 'no, they are not the same'}; the last kept as ans.`; } }
      return `${expr}: ${v ? 'yes, it holds' : 'no, it does not hold'}.`;
    }
    this.vars.set('ans', String(v)); this.unitOf.delete('ans');
    const toks = lex(expr).filter((x) => x.t === 'num') as { unit?: string }[], angle = (u?: string) => !!u && /^([°º]|deg|rad)$/.test(u);
    const angled = toks.some((x) => angle(x.unit)), mixed = angled && toks.some((x) => !x.unit);
    return `${expr} = ${+v.toPrecision(6)}${mixed ? ' (each angle counted in radians, as SI counts it, and added to the plain numbers)' : angled ? ` (as an angle, ${+((v * 180) / Math.PI).toPrecision(6)}°)` : ''}${/\d\s*[a-zA-Z°º%]/.test(expr) ? ' in SI' : ''}; kept as ans.`;
  }
  private specOf(name: string): Spec { const s = this.specs.get(name); if (!s) throw new Error(`Nothing named ${name} is made here${this.specs.size ? `: made here are ${[...this.specs.keys()].join(', ')}` : ''}.`); return s; }
  /** A value set, or a shape's size set ("cap.h = 3 mm"): kept as said, so what it is made from changes it. */
  private assign(name: string, expr: string): string {
    const dot = name.indexOf('.');
    if (dot > 0) {
      const s = this.specOf(name.slice(0, dot)), k = name.slice(dot + 1), key = this.dimKey(s, k);
      s.dims[key] = k === 'r' ? `2 * (${expr})` : expr; delete s.laws[key];
      return `${s.name}'s ${key} = ${mm(this.value(`${s.name}.${key === 'h' ? 't' : key}`))}. ${this.check(s.name)}.`;
    }
    // set from itself ("n = n + 1"): worked out now, from what it is now, and kept as that number
    const self = lex(expr).some((x) => x.t === 'id' && x.v === name), was = this.unitOf.get(name);
    if (self) { const now = num(expr, this.reader()); this.vars.set(name, String(now)); this.laws.delete(name); if (!was) this.unitOf.delete(name); const k = was ? UNITS.find(([w]) => w === was)?.[1] ?? 1 : 1; if (was) this.vars.set(name, `${now / k} ${was}`); return `${name} = ${this.show(name, now)}.`; }
    this.vars.set(name, expr); this.laws.delete(name);
    const v = this.value(name), u = this.unitFor(expr); if (u) this.unitOf.set(name, u); else this.unitOf.delete(name);
    return `${name} = ${this.show(name, v)}.${this.follows()}`;
  }
  /** The unit a value is shown in: the one its result's numbers share (a condition's branches, not its test), or a
   *  length where it is a sum of lengths (a thing's sides and places, values kept as lengths). */
  private unitFor(expr: string): string | undefined {
    const res = /^\s*if\s.+?\sthen\s(.+)$/is.exec(expr)?.[1] ?? expr;
    const us = [...new Set(lex(res).filter((x) => x.t === 'num' && x.unit).map((x) => (x as { unit?: string }).unit!))];
    if (us.length === 1) return us[0];
    if (us.length) return undefined;
    // a sum or difference of lengths is a length
    const LEN = /^(x|y|z|w|h|d|lw|lh|ld|top|bottom|left|right|front|back|D|r|t|length|wall|dt|bore)$/;
    const terms = res.split(/(?<![eE*/^(])[+-]/).map((x) => x.trim()).filter(Boolean);
    return terms.length && terms.every((x) => { const dot = x.lastIndexOf('.'); return /^[\p{L}_][\p{L}\d_.]*$/u.test(x) && ((dot > 0 && LEN.test(x.slice(dot + 1))) || LENGTH.has(this.unitOf.get(x) ?? '')); }) ? 'mm' : undefined;
  }
  private dimKey(s: Spec, k: string): string { const key = k === 't' || k === 'length' ? 'h' : k === 'r' ? 'D' : k; if (!(key in s.dims)) throw new Error(`${s.name} is sized by ${DIMS[s.kind].join(', ')}, not ${k}`); return key; }
  private show(name: string, v: number): string { const u = this.unitOf.get(name); if (!u) return fmt(v); const k = UNITS.find(([w]) => w === u)![1]; return LENGTH.has(u) ? mm(v) : `${fmt(v / k)} ${u}`; }
  private check(name: string): string { const m = this.all().made.find((x) => x.name === name) ?? this.madeOf(name, new Map(), new Set(), new Map()); return `${name}: ${this.describe(m)}${m.unseen ? ` (not computed: ${m.unseen}; it is not drawn, let go or weighed until it is moved out or made bigger)` : ''}`; }
  private describe(m: Made): string {
    const size = DIMS[m.kind].map((k) => mm(m.dims[k]!)).join(' × '), turned = m.turn.some((a) => Math.abs(a) > 1e-9) ? `, turned ${m.turn.map(deg).join(' ')} about x y z` : '';
    return `${m.word} ${size}${m.matter ? ` of ${m.matter.name}, ${kg(m.mass)}` : m.kind === 'title' ? '' : `, ${+(m.area * 1e4).toPrecision(3)} cm²`}, its middle at (${m.at.map((v) => +(v * 1e3).toFixed(1)).join(', ')}) mm${turned}${m.text ? `, reading "${m.text}"` : ''}`;
  }
  /** What a change has moved: every shape as it now stands, in a word each. */
  private follows(): string { const { made, failed } = this.all(); if (!made.length && !failed.length) return ''; return ` Now: ${made.slice(0, 8).map((m) => `${m.name} ${DIMS[m.kind].map((k) => mm(m.dims[k]!)).join(' × ')}${m.matter ? `, ${kg(m.mass)}` : ''}`).join('; ')}${made.length > 8 ? `; and ${made.length - 8} more` : ''}${failed.length ? `; ${failed.map((f) => `${f.name} cannot be made: ${f.why}`).join('; ')}` : ''}.`; }
  /** "place plate named cap of steel on bearing size 40 x 40 x 3 mm turned x 30", in any order after the shape's word. */
  private place(verb: string, rest: string): string {
    let s = rest.trim(); const text = /["“]([^"”]*)["”]/.exec(s)?.[1]; s = s.replace(/["“][^"”]*["”]/, ' ').replace(/\s+/g, ' ').trim();
    const KEYS = '(?:named|called|of|from|made of|on|onto|under|above|below|beside|next to|left of|right of|in front of|behind|in|inside|through|at|size|sized|along|by|turned|rotated|joined)';
    const grab = (re: string) => new RegExp(`(?:^|\\s)${re}\\s+(.+?)(?=\\s+${KEYS}\\b|$)`, 'i').exec(` ${s}`)?.[1]?.trim();
    const word = /^(?:an?\s+|the\s+)?([\p{L}-]+)/u.exec(s)?.[1]?.toLowerCase() ?? '';
    const kind = verb === 'surface' && !KINDS[word] ? 'plane' : KINDS[word];
    if (!kind) throw new Error(`I do not know the shape "${word}". I can place a box, block, cube, plate, tile, brick or bar; a cylinder, rod, shaft, pin, peg, axle, post or disc; a tube, pipe or sleeve; a sphere or ball; a cone; a torus or ring; the surfaces plane, sheet, panel and circle; and a title.`);
    const name = grab('(?:named|called)')?.split(' ')[0] ?? this.nameFor(word);
    // a pipeline run again makes it again: placed under a name made already, it is made anew
    // and what stood on it, by it or was copied from it goes with it, to be made again by the steps that made it
    const again = this.specs.has(name), gone = again ? [...this.specs.keys()].filter((k) => k !== name && this.leansOn(k, name)) : [];
    if (again) for (const k of [name, ...gone]) { this.leave(k); this.specs.delete(k); }
    const matterWord = /\b(?:made of|of)\s+(.+?)(?=\s+(?:named|called|on|onto|under|above|below|beside|next to|left of|right of|in front of|behind|in|inside|through|at|size|sized|along|by|turned|rotated|joined)\b|$)/i.exec(s)?.[1]?.trim();
    if (matterWord) matterOf(matterWord);
    const along = /\balong\s+([xyz])\b/i.exec(s)?.[1]?.toLowerCase() as Axis | undefined;
    const place = this.placeWords(` ${s}`) ?? { how: 'free' as const };
    const target = 'of' in place ? this.boxOf(place.of, new Map(), new Set(), new Map()) : null;
    if ('of' in place && !target) throw new Error(this.noPart(place.of));
    const turnWords = grab('(?:turned|rotated)'), tt = target as Partial<Made> | null;
    const follows = !turnWords && place.how === 'on' && tt?.turn && Math.abs(tt.turn[0]!) < 1e-9 && Math.abs(tt.turn[2]!) < 1e-9 && Math.abs(tt.turn[1]!) > 1e-9 && (kind === 'box' || kind === 'plane');
    const spec: Spec = { name, kind, word, dims: {}, laws: {}, axis: along ?? null, by: this.by, matter: matterWord ?? this.matterSaid, place, turn: turnWords ? this.angles(turnWords, ['0', '0', '0']) : follows ? ['0', `${place.of}.ry`, '0'] : ['0', '0', '0'], flips: [], scale: [1, 1, 1], ...(text ? { text } : {}) };
    const given = grab('(?:size|sized)');
    spec.dims = given ? this.sizes(kind, given) : this.fitted(kind, word, place, target);
    // a motor is one that can be bought: its body, its mass and its constants are its datasheet's
    if (word === 'motor') { const d = motorFor(s); spec.motor = d.id; spec.massGiven = d.mass; if (!given) spec.dims = { D: `${d.diameter} m`, h: `${d.length} m` }; if (!along) spec.axis = 'x'; if (!matterWord) spec.matter = 'steel'; }
    // a gearhead is one that can be bought too: its body and mass its sheet's (by its ratio, "12:1", or the first kept)
    if (word === 'gearhead' || word === 'gearbox') { const r = /(\d+(?:\.\d+)?)\s*:\s*1/.exec(s), g = Object.values(GEARHEADS).find((x) => !r || Math.abs(x.ratio - Number(r[1])) < 1e-9) ?? Object.values(GEARHEADS)[0]!; spec.gearhead = g.id; spec.massGiven = g.mass; if (!given) spec.dims = { D: `${g.diameter} m`, h: `${g.length} m` }; if (!along) spec.axis = 'x'; if (!matterWord) spec.matter = 'steel'; }
    this.specs.set(name, spec);
    // said nowhere: a spot found now, clear of what stands, and kept, so what is made after it never moves it
    if (place.how === 'free') { try { const at = this.madeOf(name, new Map(), new Set(), new Map()).at; spec.place = { how: 'at', x: `${at[0]}`, y: `${at[1]}`, z: `${at[2]}` }; } catch { /* check says why */ } }
    const to = /\bjoined\s+(?:to|with)\s+([\p{L}_][\p{L}\d_]*)/iu.exec(s)?.[1];
    if (to) { this.check(name); return `Placed ${this.check(name)}. ${this.join([to, name])}`; }
    if (spec.motor) return `${again ? 'Made anew' : 'Placed'} ${this.check(name)}: ${MOTORS[spec.motor]!.label}, its body, mass and constants from its maker's sheet. Run it: "run ${name} at ${MOTORS[spec.motor]!.V} V for 10 s against 0.1 N·m".`;
    return `${again ? 'Made anew' : 'Placed'} ${this.check(name)}${gone.length ? ` (what stood on the one before, ${gone.slice(0, 6).join(', ')}${gone.length > 6 ? ', …' : ''}, went with it)` : ''}${given ? '' : `, sized ${'of' in place ? `to ${place.of.replace(/_/g, ' ')}` : 'as a start'} (say "size ${name}.${DIMS[kind].at(-1)} so …" to size it by a law)`}.`;
  }
  private nameFor(word: string): string { const base = word.replace(/-/g, ''); let n = this.count.get(base) ?? 0, name: string; do { n++; name = `${base}${n}`; } while (this.specs.has(name)); this.count.set(base, n); return name; }
  private placeWords(s: string): Place | null {
    const STOP = '(?=\\s+(?:named|called|of|made of|size|sized|along|by|turned|rotated|joined)\\b|$)';
    const xyz = /\s(?:at|to)\s+(-?[^,]+?),\s*(-?[^,]+?),\s*(-?[^,]+?)(?=\s+(?:named|called|of|made of|size|sized|along|turned|rotated)\b|$)/i.exec(s);
    if (xyz) return { how: 'at', x: xyz[1]!.trim(), y: xyz[2]!.trim(), z: xyz[3]!.trim() };
    const from = new RegExp(`\\sfrom\\s+(?:the\\s+)?([\\p{L}_][\\p{L}\\d_ ]*?)\\s+by\\s+(-?[^,]+?),\\s*(-?[^,]+?),\\s*(-?[^,]+?)${STOP.replace('|by', '')}`, 'iu').exec(s);
    if (from) return { how: 'off', of: from[1]!.trim().replace(/\s+/g, '_'), dx: from[2]!.trim(), dy: from[3]!.trim(), dz: from[4]!.trim() };
    const by = /\sby\s+(.+?)(?=\s+(?:named|called|of|made of|size|sized|along|turned|rotated)\b|$)/i.exec(s)?.[1]?.trim() ?? '';
    const rel = new RegExp(`\\s(on|onto|under|above|below|beside|next to|left of|right of|in front of|behind|in|inside|through|at)\\s+(?:the\\s+)?(.+?)${STOP}`, 'i').exec(s);
    if (!rel) return null;
    const how = ({ onto: 'on', 'next to': 'beside', 'left of': 'left', 'right of': 'right', 'in front of': 'front', inside: 'in', through: 'in', at: 'in' } as Record<string, Side>)[rel[1]!.toLowerCase()] ?? (rel[1]!.toLowerCase() as Side);
    return { how, of: rel[2]!.trim().replace(/\s+/g, '_'), by };
  }
  /** Angles as said: "x 30 y 45", "90 about z", "45 deg around x"; a bare number is in degrees. */
  private angles(said: string, was: [string, string, string], add = false): [string, string, string] {
    const out: [string, string, string] = [...was], asDeg = (e: string) => (/^-?[\d.]+$/.test(e.trim()) ? `${e.trim()} deg` : e.trim());
    let any = false;
    for (const m of said.matchAll(/\b([xyz])\s*(?:=|by|to)?\s*(-?[^\sxyz][^,]*?)(?=\s+[xyz]\b|,|$)/gi)) { const i = AX[m[1]!.toLowerCase() as Axis]; out[i] = add ? `(${out[i]}) + (${asDeg(m[2]!)})` : asDeg(m[2]!); any = true; }
    const about = /^(-?.+?)\s+(?:about|around|on)\s+(?:the\s+)?([xyz])(?:\s+axis)?$/i.exec(said.trim());
    if (about) { const i = AX[about[2]!.toLowerCase() as Axis]; out[i] = add ? `(${was[i]}) + (${asDeg(about[1]!)})` : asDeg(about[1]!); any = true; }
    if (!any) throw new Error(`Turned how? Say "x 30 y 45 z 0", or "90 about z" (degrees, unless said in rad).`);
    return out;
  }
  /** Turn it: by an angle about an axis, to angles about x, y and z, or at random about all three. */
  private rotate(name: string, said: string): string {
    const s = this.specOf(name), t = said.trim();
    if (/^randomly$/i.test(t)) s.turn = [0, 1, 2].map(() => `${+(draw(this.rand) * 360).toFixed(3)} deg`) as [string, string, string];
    else if (/^to\s+/i.test(t)) s.turn = this.angles(t.replace(/^to\s+/i, ''), ['0', '0', '0']);
    else if (/^([xyz])\s+randomly$/i.test(t)) { const i = AX[t[0]!.toLowerCase() as Axis]; s.turn[i] = `${+(draw(this.rand) * 360).toFixed(3)} deg`; }
    else s.turn = this.angles(t, s.turn, true);
    return `Turned ${this.check(name)}.`;
  }
  private flip(name: string, axis: Axis, through?: string): string {
    const s = this.specOf(name), th = through?.trim().replace(/\s+/g, '_') ?? null;
    if (th && !this.boxOf(th, new Map(), new Set(), new Map())) throw new Error(this.noPart(th));
    s.flips.push({ axis, through: th }); return `Flipped across ${axis}${th ? ` through ${through}` : ' through the origin'}: ${this.check(name)}.`;
  }
  /** A copy on the other side of a mirror: its sizes follow the first's, its place and turning mirrored. */
  private mirror(name: string, axis: Axis, through?: string, as?: string): string {
    const s = this.specOf(name), id = as ?? `${name}_mirror`;
    const th = through?.trim().replace(/\s+/g, '_') ?? null; if (th && !this.boxOf(th, new Map(), new Set(), new Map())) throw new Error(this.noPart(th));
    this.specs.set(id, { ...structuredClone(s), name: id, dims: Object.fromEntries(Object.keys(s.dims).map((k) => [k, `${name}.${k === 'h' ? 't' : k}`])), laws: {}, flips: [...s.flips, { axis, through: th }], copyOf: name, scale: [...s.scale] as V3 });
    return `Mirrored ${name} across ${axis}: ${this.check(id)}.`;
  }
  /** Sizes as said: "40 x 40 x 3 mm" gives the unit at the end to every bare number before it. */
  private sizes(kind: Kind, said: string): Record<string, string> {
    const parts = said.split(/\s+[x×]\s+|(?<=\d)\s*[x×]\s*(?=[\d.])/).map((p) => p.trim()).filter(Boolean), names = DIMS[kind];
    const tail = /(mm|cm|m)\s*$/.exec(parts.at(-1) ?? '')?.[1];
    const fixed = parts.map((p) => (tail && /^-?[\d.]+$/.test(p) ? `${p} ${tail}` : p));
    if (kind === 'box' && fixed.length === 1) return { w: fixed[0]!, d: fixed[0]!, h: fixed[0]! };
    if (fixed.length !== names.length) throw new Error(`A ${kind} is sized by ${names.join(' × ')}${kind === 'box' ? ' (one size for a cube)' : ''}: "${said}" gives ${fixed.length}.`);
    return Object.fromEntries(names.map((k, i) => [k, fixed[i]!]));
  }
  /** Sizes from what it is placed by, when none are said: a plate covers what it sits on, a shaft takes the bore it goes through. */
  private fitted(kind: Kind, word: string, place: Place, t: Box3 | Made | null): Record<string, string> {
    const T = 'of' in place ? place.of : null;
    if (!T || !t || place.how === 'off' || place.how === 'round') {
      const base: Record<Kind, Record<string, string>> = { box: THIN.test(word) ? { w: '100 mm', d: '100 mm', h: '5 mm' } : { w: '50 mm', d: '50 mm', h: '50 mm' }, cylinder: LONG.test(word) ? { D: '10 mm', h: '100 mm' } : FLAT.test(word) ? { D: '60 mm', h: '8 mm' } : { D: '40 mm', h: '60 mm' }, tube: { D: '30 mm', h: '60 mm', wall: '3 mm' }, sphere: { D: '40 mm' }, cone: { D: '40 mm', h: '50 mm' }, torus: { D: '50 mm', dt: '6 mm' }, plane: { w: '200 mm', d: '200 mm' }, circle: { D: '100 mm' }, title: { w: '120 mm' } };
      return base[kind];
    }
    // by its own extents, not the box round it as it is turned: a cap on a turned plate is the plate's size, not wider
    const small = `min(${T}.lw, ${T}.ld)`, through = place.how === 'in';
    switch (kind) {
      case 'box': return THIN.test(word) ? { w: `${T}.lw`, d: `${T}.ld`, h: `max(1 mm, 0.1 * ${small})` } : { w: `${T}.lw`, d: `${T}.ld`, h: small };
      case 'cylinder': return through && 'bore' in t && t.bore ? { D: `${T}.bore`, h: `max(3 * ${T}.bore, 4 * ${T}.length)` } : LONG.test(word) ? { D: `0.25 * ${small}`, h: `2 * ${small}` } : { D: small, h: `0.25 * ${small}` };
      case 'tube': return through && 'bore' in t && t.bore ? { D: `${T}.bore`, h: `2 * ${T}.length`, wall: `0.15 * ${T}.bore` } : { D: small, h: `0.5 * ${small}`, wall: `0.1 * ${small}` };
      case 'sphere': return { D: `min(${small}, ${T}.lh)` };
      case 'cone': return { D: small, h: small };
      case 'torus': return { D: small, dt: `0.12 * ${small}` };
      case 'plane': return { w: `${T}.lw`, d: `${T}.ld` };
      case 'circle': return { D: small };
      case 'title': return { w: `max(40 mm, ${T}.lw)` };
    }
  }
  /** Size it by a law: the least size, from 0.1 mm to 10 m (or between two said), for which the condition holds. The law is
   *  kept, not the number: it is solved again whenever the size is read, so a load set again sizes it again. */
  private solve(name: string, cond: string, lo?: string, hi?: string): string {
    const dot = name.indexOf('.'), s = dot > 0 ? this.specOf(name.slice(0, dot)) : null, k0 = dot > 0 ? name.slice(dot + 1) : null;
    const law: Law = { cond, lo: lo ?? null, hi: hi ?? null, half: k0 === 'r' };
    if (s && k0) { const key = this.dimKey(s, k0); s.laws[key] = law; const v = this.value(`${s.name}.${key === 'h' ? 't' : key}`); return `Sized ${s.name}'s ${key} to ${mm(v)}, the least for which ${cond}; it is sized again whenever what it depends on changes. ${this.check(s.name)}.`; }
    this.laws.set(name, law); this.unitOf.set(name, 'm');
    return `Sized ${name} to ${mm(this.value(name))}, the least for which ${cond}; it is sized again whenever what it depends on changes.${this.follows()}`;
  }
  /** The least value of a size kept by its law, as things are now. */
  private least(name: string, r: Law, sc: Scope): number {
    const a = r.lo ? num(r.lo, sc) : 1e-4, b = r.hi ? num(r.hi, sc) : 10;
    const holds = (v: number) => truth(r.cond, this.scope(new Map([[name, r.half ? 2 * v : v]]), new Set(), new Map()));
    const N = 80, xs = Array.from({ length: N + 1 }, (_, i) => a * (b / a) ** (i / N)), i = xs.findIndex(holds);
    if (i < 0) throw new Error(`No size of ${name} from ${mm(a)} to ${mm(b)} makes "${r.cond}" hold.`);
    let v = xs[i]!;
    if (i > 0) { let lo = xs[i - 1]!, hi = v; for (let k = 0; k < 50 && hi - lo > 1e-9 * hi; k++) { const mid = (lo + hi) / 2; if (holds(mid)) hi = mid; else lo = mid; } v = hi; }
    return r.half ? 2 * v : v;
  }
  private energy(how: string, name: string, amount: string): string {
    const m = this.madeOf(name, new Map(), new Set(), new Map()), x = this.value(/^-?[\d.]+$/.test(amount.trim()) && (how === 'spin' || how === 'turn') ? `${amount} rpm` : amount);
    if (!m.matter) throw new Error(`${name} is a surface: it has no mass to lift, heat, spin or move`);
    let e: number, law: string;
    if (how === 'lift' || how === 'raise') { e = m.mass * 9.80665 * x; law = 'E = m g h'; }
    else if (how === 'heat' || how === 'warm') { const t = thermalOf(m.matter); e = m.mass * t.c * x; law = `Q = m c ΔT, c = ${t.c} J/kg K (${t.source})`; }
    else if (how === 'spin' || how === 'turn') { const I = inertia(m); e = 0.5 * I * x * x; law = `E = ½ I ω², I = ${fmt(I)} kg m² about its axis`; }
    else { e = 0.5 * m.mass * x * x; law = 'E = ½ m v²'; }
    this.vars.set('energy', `${e} J`); this.unitOf.set('energy', 'J'); this.vars.set(`${name}_energy`, `${e} J`); this.unitOf.set(`${name}_energy`, 'J');
    return `To ${how} ${name} (${kg(m.mass)} of ${m.matter.name}) ${how === 'lift' || how === 'raise' ? `by ${mm(x)}` : how === 'heat' || how === 'warm' ? `by ${fmt(x)} K` : how === 'spin' || how === 'turn' ? `to ${fmt((x * 60) / (2 * Math.PI))} rpm` : `to ${fmt(x)} m/s`} takes ${joules(e)}: ${law}.`;
  }
  /** Copies whose sizes follow the first's: along a line at a pitch, or round an axis. */
  private pattern(name: string, n: number, axis: Axis | undefined, pitch: string | undefined, about: string | undefined): string {
    const s = this.specOf(name); if (n < 2 || n > 64) throw new Error('A pattern has 2 to 64 of it.');
    const ab = about?.trim().replace(/\s+/g, '_'); if (ab && !this.boxOf(ab, new Map(), new Set(), new Map())) throw new Error(this.noPart(ab));
    const made: string[] = [];
    for (let i = 1; i < n; i++) {
      const id = `${name}_${i + 1}`; this.specs.delete(id);
      const place: Place = ab ? { how: 'round', of: name, about: ab, i, n } : { how: 'off', of: name, dx: axis === 'x' ? `${i} * (${pitch})` : '0', dy: axis === 'y' ? `${i} * (${pitch})` : '0', dz: axis === 'z' ? `${i} * (${pitch})` : '0' };
      this.specs.set(id, { ...structuredClone(s), name: id, dims: this.follow(name, s), laws: {}, place, flips: [], copyOf: name }); made.push(id);
    }
    return `${n} of ${name} ${ab ? `round ${about}` : `along ${axis} every ${pitch}`}: ${made.join(', ')} follow ${name}'s sizes.`;
  }
  private follow(name: string, s: Spec): Record<string, string> { return Object.fromEntries(Object.keys(s.dims).map((k) => [k, `${name}.${k === 'h' ? 't' : k}`])); }
  /** Copies at random over the top of a thing, none overlapping another or anything made, every rule kept. */
  private scatter(name: string, n: number, on: string, turned: boolean): string {
    const s = this.specOf(name), T = on.replace(/\s+/g, '_'), t = this.boxOf(T, new Map(), new Set(), new Map());
    if (!t) throw new Error(this.noPart(T)); if (n < 1 || n > 200) throw new Error('Scatter 1 to 200 of it.');
    const ids = [name, ...Array.from({ length: n - 1 }, (_, i) => `${name}_${i + 2}`)]; let placed = 0;
    // scattered again: the copies of the last scatter go first
    for (const [k, v] of [...this.specs]) if (v.copyOf === name && /_\d+$/.test(k)) this.specs.delete(k);
    for (const id of ids) {
      if (id !== name) { this.specs.delete(id); this.specs.set(id, { ...structuredClone(s), name: id, dims: this.follow(name, s), laws: {}, flips: [], copyOf: name }); }
      const sp = this.specs.get(id)!, was = { place: sp.place, turn: [...sp.turn] as [string, string, string] }; let ok = false;
      // over its top in its own frame where it is turned about y alone, so nothing falls off the corners of the box round it
      const tm = t as Partial<Made>, yaw = tm.turn && Math.abs(tm.turn[0]!) < 1e-9 && Math.abs(tm.turn[2]!) < 1e-9 ? tm.turn[1]! : 0, own = yaw ? tm.local! : { w: t.w, d: t.d };
      for (let k = 0; k < 120 && !ok; k++) {
        const me = this.madeOf(id, new Map(), new Set(), new Map()), reach = Math.hypot(me.w, me.d) / 2, rx = Math.max(0, own.w / 2 - (yaw ? reach : me.w / 2)), rz = Math.max(0, own.d / 2 - (yaw ? reach : me.d / 2));
        const lx = (draw(this.rand) * 2 - 1) * rx, lz = (draw(this.rand) * 2 - 1) * rz, c = Math.cos(yaw), sn = Math.sin(yaw);
        sp.place = { how: 'on', of: T, by: '0', dx: `${lx * c + lz * sn} m`, dz: `${-lx * sn + lz * c} m` };
        if (turned) sp.turn = ['0', `${+(draw(this.rand) * 360).toFixed(3)} deg`, '0'];
        const mine = this.madeOf(id, new Map(), new Set(), new Map()), others = this.all().made.filter((o) => o.name !== id && o.name !== T);
        ok = !others.some((o) => spatial('overlap', mine, o)) && !this.broken().length;
      }
      if (!ok) { if (id !== name) this.specs.delete(id); else { sp.place = was.place; sp.turn = was.turn; } break; }
      placed++;
    }
    return `Scattered ${placed} of ${name} over ${on}${placed < n ? `: only ${placed} of ${n} fit without overlapping or breaking a rule` : ''}${turned ? ', each turned at random about y' : ''}.`;
  }
  private rule(said: string): string {
    const t = said.trim(); let r: Rule;
    if (/^no\s+overlaps?(\s+with\s+(the\s+)?build)?$/i.test(t) || /^(nothing|none)\s+overlaps?$/i.test(t)) r = { text: t, kind: 'apart', withBuild: /build/i.test(t), by: this.by };
    else if (/^clearance\s+(.+)$/i.test(t)) r = { text: t, kind: 'clear', d: /^clearance\s+(.+)$/i.exec(t)![1]!, by: this.by };
    else { this.holds(t); r = { text: t, kind: 'cond', by: this.by }; }
    if (!this.rulesKept.some((x) => x.text === r.text && x.by === r.by)) this.rulesKept.push(r);
    return `Rule: ${t}. Every step from here keeps it, or is undone.`;
  }
  private report(): string {
    const { made, failed } = this.all();
    if (!made.length && !failed.length) return 'Nothing made yet.';
    const pieces = this.joined();
    return [...made.map((m) => `${m.name}: ${this.describe(m)}${m.unseen ? ` (not computed: ${m.unseen})` : ''}`), ...pieces.map((j) => `${j.name}: ${this.describeJoined(j.name)}`), ...failed.map((f) => `${f.name}: cannot be made as things are: ${f.why}`), `${made.length} made${pieces.length ? `, in ${pieces.length} joined piece${pieces.length > 1 ? 's' : ''} and ${made.filter((m) => !m.group).length} apart` : ''}${made.some((m) => m.unseen) ? `, ${made.filter((m) => m.unseen).length} not computed` : ''}, ${kg(pieces.reduce((t, j) => t + j.mass, 0) + made.filter((m) => !m.group && !m.unseen).reduce((t, m) => t + m.mass, 0))} in all.`].join(' · ');
  }
  private describeJoined(name: string): string { const j = this.joinedOf(name, new Map(), new Set(), new Map()); return `${j.members.join(' + ')} as one piece, ${mm(j.w)} × ${mm(j.h)} × ${mm(j.d)}, ${kg(j.mass)}${j.exact ? '' : ` (sampled, within ${+(j.within * 100).toPrecision(2)} %)`}, its middle at (${j.at.map((v) => +(v * 1e3).toFixed(1)).join(', ')}) mm`; }
  /** A joined piece moved as one: to a place, by an offset, or by a thing as a shape is placed by it. */
  private groupMove(name: string, said: string): string {
    const g = this.groups.get(name)!, j = this.joinedOf(name, new Map(), new Set(), new Map()), sc = this.reader();
    const by = /^by\s+(-?[^,]+?),\s*(-?[^,]+?),\s*(-?[^,]+?)$/i.exec(said.trim()), to = /^to\s+(-?[^,]+?),\s*(-?[^,]+?),\s*(-?[^,]+?)$/i.exec(said.trim());
    let d: V3;
    if (by) d = [num(by[1]!, sc), num(by[2]!, sc), num(by[3]!, sc)];
    else if (to) d = [num(to[1]!, sc) - j.at[0], num(to[2]!, sc) - j.at[1], num(to[3]!, sc) - j.at[2]];
    else {
      const p = this.placeWords(` ${said}`); if (!p || !('of' in p)) throw new Error(`Move ${name} where? Say "to 0, 0.5 m, 0", "by 0, 10 mm, 0", or "on bearing".`);
      const T = this.boxOf(p.of, new Map(), new Set(), new Map()); if (!T) throw new Error(this.noPart(p.of));
      const fake: Spec = { name: '', kind: 'box', word: '', dims: {}, laws: {}, axis: null, matter: null, place: p, turn: ['0', '0', '0'], flips: [], scale: [1, 1, 1] };
      const want = this.placeOf(fake, { w: j.w, h: j.h, d: j.d }, T, sc, new Map(), new Set(), new Map()); d = [want[0] - j.at[0], want[1] - j.at[1], want[2] - j.at[2]];
    }
    g.move = [g.move[0] + d[0], g.move[1] + d[1], g.move[2] + d[2]];
    return `Moved ${name}: ${this.describeJoined(name)}.`;
  }
  private groupTurn(name: string, said: string): string {
    const g = this.groups.get(name)!, t = said.trim(), sc = this.reader();
    const add = /^randomly$/i.test(t) ? [0, 1, 2].map(() => draw(this.rand) * 2 * Math.PI) as V3 : this.angles(t, ['0', '0', '0']).map((e) => num(e, sc)) as V3;
    g.turn = eulerOf(mul3(matOf(add), matOf(g.turn)));
    return `Turned ${name} as one: ${this.describeJoined(name)}.`;
  }
  /** Expanded or shrunk along x, y or z (or every way): by a factor, a percentage, a length, or to a length. Where its own
   *  sizes can say it (a box's width, a shaft's length, a ball's diameter) the size changes and stays exact; where they
   *  cannot (a round stretched across one way), it is stretched, and what then cannot be known exactly is said. */
  private stretch(verb: string, name: string, rest: string): string {
    const r = rest.trim().replace(/^(?:along|in|on|across)\s+/i, ''), am = /^(?:(x|y|z|all|every\s*way|everywhere|evenly)\s*)?(?:(by|to)\s+)?(.+)$/i.exec(r);
    if (!am || !am[3]) throw new Error(`${verb} ${name} how? Say "${verb} ${name} x by 20 mm", "${verb} ${name} y by 50%", "${verb} ${name} by 2", or "stretch ${name} z to 300 mm".`);
    const axes: Axis[] = !am[1] || /all|every|even/i.test(am[1]) ? ['x', 'y', 'z'] : [am[1].toLowerCase() as Axis], to = am[2]?.toLowerCase() === 'to', said = am[3].trim(), sc = this.reader();
    const isLen = /\d\s*(mm|cm|m)\b/.test(said) || (to && !/%/.test(said)), shrink = verb === 'shrink' || verb === 'squash', v = num(said, sc);
    // a factor along each axis, from what it says and the extent it has there now
    const factorFor = (extent: number): number => { const f = to ? v / extent : isLen ? (extent + (shrink ? -v : v)) / extent : /%/.test(said) ? (shrink ? 1 - v : 1 + v) : shrink ? 1 / v : v; if (!(f > 0)) throw new Error(`${verb === 'shrink' ? 'Shrunk' : 'Stretched'} so, ${name} would be nothing along ${axes.join(', ')}`); return f; };
    const g = this.groups.get(name);
    if (g) { const j = this.joinedOf(name, new Map(), new Set(), new Map()), ext: V3 = [j.w, j.h, j.d]; for (const a of axes) g.stretch[AX[a]] *= factorFor(ext[AX[a]]!); this.joinedOf(name, new Map(), new Set(), new Map()); return `${verb === 'shrink' || verb === 'squash' ? 'Shrunk' : 'Stretched'} ${name} along ${axes.join(', ')} about its middle: ${this.describeJoined(name)}.`; }
    const s = this.specOf(name), m = this.madeOf(name, new Map(), new Set(), new Map()), ext: V3 = [m.local.w, m.local.h, m.local.d];
    if (!square(m.turn) && axes.length < 3) throw new Error(`${name} is turned off square: stretch it along its own x, y or z by turning it back first, or every way at once`);
    const f: V3 = [1, 1, 1]; for (const a of axes) { const R = matOf(m.turn), own = [0, 1, 2].find((j) => Math.abs(R[AX[a] * 3 + j]!) > 0.5)!; f[own] = factorFor(ext[own]!); }
    // what its own sizes can carry, they carry: each size along an axis, as an expression of what it was
    const along = (k: string): number[] => { const ax = AX[m.axis]; if (s.kind === 'box' || s.kind === 'plane') return k === 'w' ? [0] : k === 'h' ? [1] : [2]; if (s.kind === 'title') return [0]; if (k === 'h') return [ax]; return [0, 1, 2].filter((i) => (k === 'D' || k === 'dt' || k === 'wall' ? i !== ax || s.kind === 'sphere' : true)); };
    const left: V3 = [...f] as V3;
    for (const k of DIMS[s.kind]) {
      const ix = s.kind === 'torus' && k === 'dt' ? [AX[m.axis]] : along(k), fs = ix.map((i) => f[i]!), all = fs.every((x) => Math.abs(x - fs[0]!) < 1e-12);
      if (!all || fs[0] === 1) continue;
      if (s.laws[k]) throw new Error(`${name}'s ${k} is sized by a law (${s.laws[k]!.cond}): change the law, or set it, rather than stretch it`);
      s.dims[k] = `(${s.dims[k]}) * ${+fs[0]!.toPrecision(8)}`; for (const i of ix) left[i] = 1;
      if (s.kind === 'torus' && k === 'D') for (const i of ix) left[i] = 1;
    }
    if (s.kind === 'torus' && left.some((x) => x !== 1)) { /* a torus stretched across its axis unevenly stays a stretch */ }
    s.scale = [s.scale[0] * left[0], s.scale[1] * left[1], s.scale[2] * left[2]];
    const after = this.madeOf(name, new Map(), new Set(), new Map());
    return `${shrink ? 'Shrunk' : 'Stretched'} ${name} along ${axes.join(', ')}: ${this.describe(after)}${Number.isNaN(after.area) ? '; stretched unevenly, its area is not known exactly (its volume is)' : ''}.`;
  }
}

/** The box round several things. */
function boxRound(bs: { at: V3; w: number; h: number; d: number }[]): { at: V3; w: number; h: number; d: number } {
  const lo = [0, 1, 2].map((i) => Math.min(...bs.map((b) => b.at[i]! - [b.w, b.h, b.d][i]! / 2))), hi = [0, 1, 2].map((i) => Math.max(...bs.map((b) => b.at[i]! + [b.w, b.h, b.d][i]! / 2)));
  return { at: [0, 1, 2].map((i) => (lo[i]! + hi[i]!) / 2) as V3, w: hi[0]! - lo[0]!, h: hi[1]! - lo[1]!, d: hi[2]! - lo[2]! };
}
/** Whether a point is inside a shape: turned back into the shape's own frame, unstretched, then its own test. */
function contains(m: Made, p: V3): boolean {
  const l = applyT(matOf(m.turn), [p[0] - m.at[0], p[1] - m.at[1], p[2] - m.at[2]]), q: V3 = [l[0] / m.scale[0], l[1] / m.scale[1], l[2] / m.scale[2]], s = m.dims;
  if (m.kind === 'box') return Math.abs(q[0]) <= s.w! / 2 && Math.abs(q[1]) <= s.h! / 2 && Math.abs(q[2]) <= s.d! / 2;
  if (m.kind === 'sphere') return Math.hypot(...q) <= s.D! / 2;
  const a = AX[m.axis], along = q[a]!, rad = Math.hypot(...q.filter((_, i) => i !== a));
  if (m.kind === 'cylinder') return Math.abs(along) <= s.h! / 2 && rad <= s.D! / 2;
  if (m.kind === 'tube') return Math.abs(along) <= s.h! / 2 && rad <= s.D! / 2 && rad >= s.D! / 2 - s.wall!;
  if (m.kind === 'cone') return Math.abs(along) <= s.h! / 2 && rad <= (s.D! / 2) * (1 - (along + s.h! / 2) / s.h!);
  if (m.kind === 'torus') { const t = s.dt! / 2, R = s.D! / 2 - t; return (rad - R) ** 2 + along ** 2 <= t * t; }
  return false;
}
/** The volume and mass of several shapes as one: where they meet counted once (the first's matter there). Exact for boxes
 *  square to the axes, by cutting space at their faces; otherwise sampled at 40 000 points, and how near it is said. */
function unionOf(ms: Made[]): { volume: number; mass: number; exact: boolean; within: number } {
  const solid = ms.filter((m) => m.matter && m.volume > 0); if (!solid.length) return { volume: 0, mass: 0, exact: true, within: 0 };
  const ext = (m: Made, i: number) => [m.w, m.h, m.d][i]! / 2;
  if (solid.every((m) => m.kind === 'box' && square(m.turn))) {
    const cuts = [0, 1, 2].map((i) => [...new Set(solid.flatMap((m) => [m.at[i]! - ext(m, i), m.at[i]! + ext(m, i)]))].sort((a, b) => a - b));
    let volume = 0, mass = 0;
    for (let x = 0; x + 1 < cuts[0]!.length; x++) for (let y = 0; y + 1 < cuts[1]!.length; y++) for (let z = 0; z + 1 < cuts[2]!.length; z++) {
      const c = [cuts[0]![x]!, cuts[1]![y]!, cuts[2]![z]!], e = [cuts[0]![x + 1]!, cuts[1]![y + 1]!, cuts[2]![z + 1]!], mid = [0, 1, 2].map((i) => (c[i]! + e[i]!) / 2);
      const who = solid.find((m) => [0, 1, 2].every((i) => Math.abs(mid[i]! - m.at[i]!) < ext(m, i)));
      if (who) { const v = (e[0]! - c[0]!) * (e[1]! - c[1]!) * (e[2]! - c[2]!); volume += v; mass += v * who.matter!.density; }
    }
    return { volume, mass, exact: true, within: 0 };
  }
  const b = boxRound(solid), lo: V3 = [b.at[0] - b.w / 2, b.at[1] - b.h / 2, b.at[2] - b.d / 2], V = b.w * b.h * b.d, N = 40000, st = { s: 12345 };
  let hits = 0, dens = 0;
  for (let k = 0; k < N; k++) { const p: V3 = [lo[0] + draw(st) * b.w, lo[1] + draw(st) * b.h, lo[2] + draw(st) * b.d], who = solid.find((m) => contains(m, p)); if (who) { hits++; dens += who.matter!.density; } }
  const f = hits / N; return { volume: V * f, mass: (V * dens) / N, exact: false, within: f > 0 ? Math.sqrt((f * (1 - f)) / N) / f : 1 };
}
const identity = (g: Group) => !g.move.some((x) => x) && !g.turn.some((x) => x) && !g.flips.length && g.stretch.every((x) => x === 1);

/** A shape's extents, volume and area from its sizes (the primitive forms' laws in src/nexus/embody/geometry.ts). */
function geometry(kind: Kind, s: Record<string, number>, axis: Axis): { w: number; h: number; d: number; volume: number; area: number } {
  const P = Math.PI;
  switch (kind) {
    case 'box': return { w: s.w!, h: s.h!, d: s.d!, volume: s.w! * s.d! * s.h!, area: 2 * (s.w! * s.d! + s.w! * s.h! + s.d! * s.h!) };
    case 'cylinder': { const r = s.D! / 2; return { ...extents(axis, s.D!, s.h!), volume: P * r * r * s.h!, area: 2 * P * r * (r + s.h!) }; }
    case 'tube': { const ro = s.D! / 2, ri = ro - s.wall!; if (ri <= 0) throw new Error(`a tube's wall (${mm(s.wall!)}) must be less than half its diameter (${mm(s.D!)})`); return { ...extents(axis, s.D!, s.h!), volume: P * (ro * ro - ri * ri) * s.h!, area: 2 * P * (ro + ri) * s.h! + 2 * P * (ro * ro - ri * ri) }; }
    case 'sphere': { const r = s.D! / 2; return { w: s.D!, h: s.D!, d: s.D!, volume: (4 / 3) * P * r ** 3, area: 4 * P * r * r }; }
    case 'cone': { const r = s.D! / 2; return { ...extents(axis, s.D!, s.h!), volume: (P * r * r * s.h!) / 3, area: P * r * (r + Math.hypot(r, s.h!)) }; }
    case 'torus': { const r = s.dt! / 2, R = (s.D! - s.dt!) / 2; if (R <= 0) throw new Error(`a torus's tube (${mm(s.dt!)}) must be thinner than it is across (${mm(s.D!)})`); return { w: s.D!, h: s.dt!, d: s.D!, volume: 2 * P * P * R * r * r, area: 4 * P * P * R * r }; }
    case 'plane': return { w: s.w!, h: 1e-6, d: s.d!, volume: 0, area: s.w! * s.d! };
    case 'circle': return { w: s.D!, h: 1e-6, d: s.D!, volume: 0, area: P * (s.D! / 2) ** 2 };
    case 'title': return { w: s.w!, h: s.w! / 4, d: 0.002, volume: 0, area: (s.w! * s.w!) / 4 };
  }
}
/** Its moment of inertia about its own axis (about the vertical for a box). */
function inertia(m: Made): number {
  const M = m.mass, r = (m.dims.D ?? 0) / 2;
  if (m.kind === 'cylinder') return 0.5 * M * r * r;
  if (m.kind === 'tube') { const ri = r - m.dims.wall!; return 0.5 * M * (r * r + ri * ri); }
  if (m.kind === 'sphere') return 0.4 * M * r * r;
  if (m.kind === 'cone') return 0.3 * M * r * r;
  if (m.kind === 'torus') { const t = m.dims.dt! / 2, R = r - t; return M * (R * R + 0.75 * t * t); }
  return (M * (m.local.w * m.local.w + m.local.d * m.local.d)) / 12;
}
