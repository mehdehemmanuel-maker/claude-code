// Expressions in words and units, as nodes take them (a formula node, a rule over rows, a condition in a flow): numbers
// that carry their unit (40 mm, 2 kN, 20 N·m, 45 deg), read to SI; arithmetic, comparison and choice; the names a scope
// gives; and, where a scope gives boxes, how far apart two things are (the separating-axis test) and whether they touch.
// With them the small geometry the physics shares: a turn as a matrix and back (matOf, eulerOf).
//
// (Until 2026-10-29 this file was also the word-driven workshop, `Workshop`, its own heat flow, joints and motors: nothing
// reached it. It was deleted in phase 2 of docs/REALITY.md, with `heatflow.ts`; heat in time is now the engine's, over the
// contact graph, in `graph.ts`.)

import type { Material } from '../data/materials';
import { erf } from './term';

// ---- numbers with their units, and the expressions they are said in ---------------------------------------------------
const UNITS: [string, number][] = ([
  ['kWh', 3.6e6], ['Wh', 3600], ['MJ', 1e6], ['kJ', 1e3], ['J', 1], ['GPa', 1e9], ['MPa', 1e6], ['kPa', 1e3], ['Pa', 1],
  ['kN·m', 1e3], ['kNm', 1e3], ['N·m', 1], ['N*m', 1], ['Nm', 1], ['kN', 1e3], ['N', 1], ['kW', 1e3], ['W', 1], ['kV', 1e3], ['V', 1], ['mA', 1e-3], ['A', 1], ['L/min', 1 / 60000], ['l/min', 1 / 60000],
  ['km/h', 1 / 3.6], ['m/s', 1], ['rpm', (2 * Math.PI) / 60], ['deg', Math.PI / 180], ['°C', 1], ['°', Math.PI / 180], ['º', Math.PI / 180], ['rad', 1], ['K', 1],
  ['km', 1e3], ['mm', 1e-3], ['cm', 1e-2], ['m²', 1], ['m³', 1], ['m', 1], ['kg', 1], ['g', 1e-3], ['min', 60], ['h', 3600], ['s', 1], ['%', 0.01],
] as [string, number][]).sort((a, b) => b[0].length - a[0].length);

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
type Val = number | boolean;
export interface Scope { get(name: string): number | undefined; names(): string[]; /** A thing's box, for gap, dist, overlap and inside. */ box?(name: string): Box3 | null }
/** A thing's place and extents along x, y and z (an axis-aligned box round it), and what is known of it. */
interface Box3 { at: V3; w: number; h: number; d: number; mass: number; r?: number; bore?: number; axis?: Axis }
const SPATIAL = new Set(['gap', 'dist', 'distance', 'overlap', 'overlaps', 'inside', 'touches']);
/** Whether two boxes, each turned as it stands, go into each other: the separating-axis test, over the three faces of
 *  each and the nine pairs of their edges (Gottschalk, Lin & Manocha, OBBTree, SIGGRAPH 1996). A box touching another
 *  face to face does not go into it. A thing with no turning of its own (a part of the build) is its box as it stands. */
/** How far apart two things are, each as it is turned: the most any face or edge direction parts them (the
 *  separating-axis test); less than nothing where they go into each other. It is never more than the true distance. */
function separation(A: Box3, B: Box3): number {
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

/** Things touch where nothing parts them by more than this: half a millimetre. */
const TOUCH = 5e-4;
/** Between two things: how far apart their middles are, the gap between the boxes round them, whether they go into
 *  each other (each as it is turned), touch, or one is inside the other's box. */
function spatial(f: string, A: Box3, B: Box3): number {
  const ha = [A.w / 2, A.h / 2, A.d / 2], hb = [B.w / 2, B.h / 2, B.d / 2], dc = [0, 1, 2].map((i) => Math.abs(A.at[i]! - B.at[i]!));
  if (f === 'dist' || f === 'distance') return Math.hypot(...dc);
  const sep = dc.map((d, i) => d - ha[i]! - hb[i]!), gap = Math.hypot(...sep.map((x) => Math.max(0, x))), over = sep.every((x) => x < -1e-9);
  if (f === 'gap') return gap;
  if (f === 'overlap' || f === 'overlaps') return over && boxesOver(A, B) ? 1 : 0;
  if (f === 'touches') return !over && gap <= 1e-6 ? 1 : 0;
  return dc.every((d, i) => d + ha[i]! <= hb[i]! + 1e-9) ? 1 : 0;
}
// (every function the laws' terms use (term.ts OPERATORS) is here, so any law can be written as a formula: the math
// nodes cover the book)
const FN: Record<string, (...a: number[]) => number> = { sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil, sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan, log: Math.log10, log10: Math.log10, log2: Math.log2, ln: Math.log, exp: Math.exp, erf, pow: Math.pow };
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

// ---- shapes ----------------------------------------------------------------------------------------------------------
type Kind = 'box' | 'cylinder' | 'tube' | 'sphere' | 'cone' | 'torus' | 'plane' | 'circle' | 'title';
export type Axis = 'x' | 'y' | 'z';
export type V3 = [number, number, number];

interface Made { /** a motor: its datasheet, and how fast it was left turning, rad/s */ motor?: string; spin?: number; /** broken under a load put on it */ broken?: boolean; /** its temperature, deg C, where heat has been put in it or has flowed */ temp?: number;
  /** Why it is not computed: wholly inside a solid, or too small to be. Not drawn, not let go, not weighed, not judged. */ unseen?: string; name: string; kind: Kind; word: string; matter: Material | null; axis: Axis; dims: Record<string, number>; at: V3; turn: V3; local: { w: number; h: number; d: number }; scale: V3; w: number; h: number; d: number; volume: number; area: number; mass: number; text?: string; group?: string }

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

