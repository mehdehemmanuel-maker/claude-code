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
import { fusible } from '../engineering/fusion';
import { ADHESIVES, substrateFactor } from '../engineering/joining';
import { thermalOf } from '../engineering/thermal';

// ---- numbers with their units, and the expressions they are said in ---------------------------------------------------
const UNITS: [string, number][] = ([
  ['kWh', 3.6e6], ['Wh', 3600], ['MJ', 1e6], ['kJ', 1e3], ['J', 1], ['GPa', 1e9], ['MPa', 1e6], ['kPa', 1e3], ['Pa', 1],
  ['kN·m', 1e3], ['kNm', 1e3], ['N·m', 1], ['N*m', 1], ['Nm', 1], ['kN', 1e3], ['N', 1], ['kW', 1e3], ['W', 1],
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
const boxesOver = (A: Box3, B: Box3) => separation(A, B) < -1e-9;
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
  cylinder: 'cylinder', rod: 'cylinder', shaft: 'cylinder', pin: 'cylinder', peg: 'cylinder', axle: 'cylinder', post: 'cylinder', column: 'cylinder', disc: 'cylinder', disk: 'cylinder', puck: 'cylinder', wheel: 'cylinder',
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
interface Spec { /** who made it: a pipeline's board, or you */ by?: string; name: string; kind: Kind; word: string; dims: Record<string, string>; laws: Record<string, Law>; axis: Axis | null; matter: string | null; place: Place; turn: [string, string, string]; flips: Flip[]; text?: string; copyOf?: string; /** Stretched unevenly where its own sizes cannot say it: factors along its own x, y, z. */ scale: V3 }
/** Shapes joined into one piece: named, moved, turned, flipped and stretched as one; its mass and volume the union's. */
/** How two members of a piece hold together: fused into one solid, glued, or bolted; a group's members are not held. */
interface Bond { a: string; b: string; how: 'fused' | 'glued' | 'bolted'; with?: string; why: string }
interface Group { name: string; members: string[]; move: V3; turn: V3; flips: Flip[]; stretch: V3; bonds?: Bond[]; /** moved as one, not connected */ loose?: boolean }
type JoinHow = 'any' | 'fuse' | 'glue' | 'bolt' | 'group';
/** A rule over everything made: a condition, or that nothing overlaps, or a clearance between things. */
/** A rule, and who said it: a pipeline's "no overlap" or clearance holds over what that pipeline makes; a condition, over what it names. */
type Rule = ({ text: string; kind: 'cond' } | { text: string; kind: 'apart'; withBuild: boolean } | { text: string; kind: 'clear'; d: string }) & { by: string };
/** A shape as it stands: its sizes, where its middle is, how it is turned (radians about x, y, z), its extents along
 *  x, y and z as turned, its extents as made, and what follows from them. */
export interface Made { name: string; kind: Kind; word: string; matter: Material | null; axis: Axis; dims: Record<string, number>; at: V3; turn: V3; local: { w: number; h: number; d: number }; scale: V3; w: number; h: number; d: number; volume: number; area: number; mass: number; text?: string; group?: string }
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
type M3 = [number, number, number, number, number, number, number, number, number];
function matOf([x, y, z]: V3): M3 {
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [c * e, -c * f, d, a * f + b * e * d, a * e - b * f * d, -b * c, b * f - a * e * d, b * e + a * f * d, a * c];
}
function eulerOf(m: M3): V3 {
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
interface Standing { name: string; header: { word: string; param: boolean; optional: boolean }[]; body: string[]; text: string; builtIn: boolean }
const CALL_VERBS = /^(calc|calculate|compute|set|let|material|matter|use|place|put|add|surface|size|resize|energy|move|rotate|turn|flip|mirror|remove|delete|clear|pattern|copy|scatter|rule|rules|seed|report|expand|stretch|grow|shrink|squash|join|connect|attach|combine|unite|merge|fuse|weld|glue|bond|bolt|screw|rivet|group|split|if|action|actions|show|default|require)$/i;

export class Workshop {
  private vars = new Map<string, string>(); private unitOf = new Map<string, string>(); private laws = new Map<string, Law>();
  private specs = new Map<string, Spec>(); private count = new Map<string, number>(); private rulesKept: Rule[] = []; private groups = new Map<string, Group>();
  private rand: { s: number };
  matter: Material = matterOf('aluminium'); private matterSaid = 'aluminium'; private by = '';
  private actions = new Map<string, Standing>(); private depth = 0;
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
        if (name === 'made.mass' || name === 'made.volume') { let t = 0; for (const n of self.specs.keys()) { const m = self.madeOf(n, over, busy, memo); t += name === 'made.mass' ? m.mass : m.volume; } return t; }
        const dot = name.indexOf('.');
        if (dot > 0) {
          const head = name.slice(0, dot), prop = name.slice(dot + 1);
          // made here (1), or a part of the build, or nothing (0)
          if (prop === 'made') return self.specs.has(head) || self.groups.has(head) ? 1 : 0;
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
      const made: Made = { name, kind: s.kind, word: s.word, matter: mt, axis, dims, at, turn, local, scale: [...k] as V3, ...g, ...box, mass: mt ? mt.density * g.volume : 0, ...(s.text ? { text: s.text } : {}), ...(this.groupOf(name) ? { group: this.groupOf(name)!.name } : {}) };
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
    const by = p.by ? num(p.by, sc) : 0, dx = p.dx ? num(p.dx, sc) : 0, dz = p.dz ? num(p.dz, sc) : 0, gap = by || 0.01;
    switch (p.how) {
      case 'on': return [c[0] + dx, c[1] + T.h / 2 + by + g.h / 2, c[2] + dz];
      case 'above': return [c[0] + dx, c[1] + T.h / 2 + (by || 0.05) + g.h / 2, c[2] + dz];
      case 'under': return [c[0] + dx, c[1] - T.h / 2 - by - g.h / 2, c[2] + dz];
      case 'below': return [c[0] + dx, c[1] - T.h / 2 - (by || 0.05) - g.h / 2, c[2] + dz];
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
    return { made, failed };
  }
  /** The numbers a check reads: every value set, and every shape's sizes, place, volume and mass. */
  facts(): Record<string, number> {
    const out: Record<string, number> = {}, sc = this.scope(new Map(), new Set(), new Map());
    for (const k of [...this.vars.keys(), ...this.laws.keys()]) { try { out[k] = num(k, sc); } catch { /* reported where it is used */ } }
    const { made } = this.all(); let total = 0;
    for (const m of made) { total += m.mass; for (const [k, v] of Object.entries({ ...m.dims, w: m.w, h: m.h, d: m.d, x: m.at[0], y: m.at[1], z: m.at[2], top: m.at[1] + m.h / 2, volume: m.volume, area: m.area, mass: m.mass })) out[`${m.name}.${k}`] = v; }
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
  private related(a: Spec, b: Spec): boolean { const of = (s: Spec) => ('of' in s.place ? s.place.of : null), ga = this.groupOf(a.name); return of(a) === b.name || of(b) === a.name || (!!ga && !ga.loose && ga === this.groupOf(b.name)); }
  /** What breaks a rule as things stand: each broken rule, with why. */
  broken(): string[] {
    const out: string[] = [], { made } = this.all(), sc = this.reader();
    for (const r of this.rulesKept) {
      if (r.kind === 'cond') { try { if (!truth(r.text, sc)) out.push(`${r.text} does not hold`); } catch (e) { out.push(`${r.text}: ${(e as Error).message}`); } continue; }
      const d = r.kind === 'clear' ? num(r.d, sc) : 0, mine = (n: string) => (this.specs.get(n)?.by ?? '') === r.by;
      for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) {
        const A = made[i]!, B = made[j]!; if ((!mine(A.name) && !mine(B.name)) || this.related(this.specs.get(A.name)!, this.specs.get(B.name)!)) continue;
        if (r.kind === 'apart' && spatial('overlap', A, B)) out.push(`${A.name} and ${B.name} overlap`);
        if (r.kind === 'clear' && spatial('gap', A, B) < d - 1e-9) out.push(`${A.name} and ${B.name} are ${mm(spatial('gap', A, B))} apart, less than ${mm(d)}`);
      }
      if (r.kind === 'apart' && r.withBuild) for (const A of made) { const s = this.specs.get(A.name)!; if (!mine(A.name)) continue; for (const p of this.world.parts()) if (!('of' in s.place && this.partOf(s.place.of) === p) && spatial('overlap', A, p)) { out.push(`${A.name} goes into the build's ${p.name}`); break; } }
    }
    return out;
  }
  private snapshot() { return { groups: new Map([...this.groups].map(([k, v]) => [k, structuredClone(v)])), vars: new Map(this.vars), unitOf: new Map(this.unitOf), laws: new Map(this.laws), specs: new Map([...this.specs].map(([k, v]) => [k, structuredClone(v)])), count: new Map(this.count), rules: [...this.rulesKept], matter: this.matter, said: this.matterSaid, rand: this.rand.s, actions: new Map(this.actions) }; }
  private restore(z: ReturnType<Workshop['snapshot']>) { this.groups = z.groups; this.vars = z.vars; this.unitOf = z.unitOf; this.laws = z.laws; this.specs = z.specs; this.count = z.count; this.rulesKept = z.rules; this.matter = z.matter; this.matterSaid = z.said; this.rand.s = z.rand; this.actions = z.actions; }
  // -- what a step says --------------------------------------------------------------------------------------------------
  /** Whether a step's words are generation's to do. */
  static handles(line: string): boolean { const t = line.trim(); return /=\s*\??$/.test(t) || /^(calc|calculate|compute|what is|work out|set|let|material|matter|use|place|put|add|surface|size|resize|energy|move|rotate|turn|flip|mirror|remove|delete|clear|pattern|copy|scatter|rule|rules|seed|report|expand|stretch|grow|shrink|squash|join|connect|attach|combine|unite|merge|fuse|weld|glue|bond|bolt|screw|rivet|group|split|action|actions|default|require|mount|support|cover|stack)\b/i.test(t) || /^show\s+action\b/i.test(t) || /^if\s.+\sthen\s/i.test(t) || /^[\p{L}_][\p{L}\d_.]*\s*=[^=]/u.test(t); }
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
      const g = this.groups.get(m[1]!); if (g) { for (const x of g.members) this.specs.delete(x); this.groups.delete(g.name); return `Removed ${g.name}: ${g.members.join(', ')}.`; }
      this.specOf(m[1]!); this.leave(m[1]!); this.specs.delete(m[1]!); return `Removed ${m[1]}.`;
    }
    if (/^clear(\s+all)?$/i.test(t)) { const n = this.specs.size; this.specs.clear(); this.groups.clear(); return `Cleared ${n} shape${n === 1 ? '' : 's'}.`; }
    if ((m = /^(?:pattern|copy)\s+([\p{L}_][\p{L}\d_]*)\s+(\d+)\s*(?:times\s*)?(?:along\s+([xyz])\s+(?:every\s+)?(.+)|round\s+([\p{L}_][\p{L}\d_ ]*))$/iu.exec(t))) return this.pattern(m[1]!, Number(m[2]), m[3] as Axis | undefined, m[4], m[5]);
    if ((m = /^scatter\s+([\p{L}_][\p{L}\d_]*)\s+(\d+)\s*(?:times\s*)?(?:on|over|onto|across)\s+([\p{L}_][\p{L}\d_ ]*?)(\s+turned randomly)?$/iu.exec(t))) return this.scatter(m[1]!, Number(m[2]), m[3]!.trim(), !!m[4]);
    if ((m = /^rules?\s+(.+)$/i.exec(t))) return this.rule(m[1]!);
    if (/^rules$/i.test(t)) return this.rulesKept.length ? `Rules: ${this.rulesKept.map((r) => r.text).join('; ')}.` : 'No rules.';
    if (/^report$/i.test(t)) return this.report();
    const called = this.callAction(t); if (called !== null) return called;
    throw new Error(`I cannot do "${t.slice(0, 60)}". Generation can: set <name> = <value>; material <matter>; place <shape> [named <n>] [of <matter>] [on|under|above|below|beside|left of|right of|in front of|behind|through <thing> | at x, y, z | from <thing> by dx, dy, dz] [size a x b x c] [turned x a y b z c]; surface plane|circle …; size <name> so <condition>; rotate <shape> <angle> about x|y|z, or randomly; flip <shape> x|y|z [through <thing>]; mirror <shape> x|y|z; pattern <shape> <n> along x <pitch> | round <thing>; scatter <shape> <n> on <thing>; rule <condition> | no overlap | clearance <d>; if <condition> then <step> [else <step>]; energy lift|heat|spin|move <shape> <amount>; move, remove, clear, seed <n>, report. Random: random(a, b), randint(a, b), chance(p), pick(a, b), one of a, b.`);
  }
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
  private check(name: string): string { const m = this.madeOf(name, new Map(), new Set(), new Map()); return `${name}: ${this.describe(m)}`; }
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
    this.specs.set(name, spec);
    // said nowhere: a spot found now, clear of what stands, and kept, so what is made after it never moves it
    if (place.how === 'free') { try { const at = this.madeOf(name, new Map(), new Set(), new Map()).at; spec.place = { how: 'at', x: `${at[0]}`, y: `${at[1]}`, z: `${at[2]}` }; } catch { /* check says why */ } }
    const to = /\bjoined\s+(?:to|with)\s+([\p{L}_][\p{L}\d_]*)/iu.exec(s)?.[1];
    if (to) { this.check(name); return `Placed ${this.check(name)}. ${this.join([to, name])}`; }
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
    return [...made.map((m) => `${m.name}: ${this.describe(m)}`), ...pieces.map((j) => `${j.name}: ${this.describeJoined(j.name)}`), ...failed.map((f) => `${f.name}: cannot be made as things are: ${f.why}`), `${made.length} made${pieces.length ? `, in ${pieces.length} joined piece${pieces.length > 1 ? 's' : ''} and ${made.filter((m) => !m.group).length} apart` : ''}, ${kg(pieces.reduce((t, j) => t + j.mass, 0) + made.filter((m) => !m.group).reduce((t, m) => t + m.mass, 0))} in all.`].join(' · ');
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
