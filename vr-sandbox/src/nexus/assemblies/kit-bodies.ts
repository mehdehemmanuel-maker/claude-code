// Kit bodies (decision 0029, wave 14): engineered machine sub-assemblies at working scale, each designed from what is
// asked of it (a load, a reach, a span, a pressure), not drawn to a size: a pneumatic leg and the walker on it, a
// hydraulic insect leg and the radial walker on it (the rest of the wave's list is not made yet). Each recipe works
// its statics first (the forces and moments at the pose drawn), sizes what carries load by calculation (a plate link by
// bending at its pin hole, a pin by shear, a hollow section from the library's table by its section modulus, a truss
// member by its axial force), selects its actuators from the library's tables by the force they must give at the
// pressure asked, and then builds with the room's operations; what it worked out is its `report` output and its
// `figures` (the numbers, for a check by hand). A folded board's input can only be copied into an inner setting as it is
// (dataflow.ts, `into`), never worked on, so these are recipes run with the sizes worked out (as parts/ builds its
// families), not boards of fixed settings. Nothing is placed by number: every piece is made (`made`) or taken from the
// library and put by stack, onto, through, over, between and turn.
//
// Material strengths are the app's own (matter.ts: the handbook's yield). Factors of safety, dynamic factors and
// proportions are typical and said where used; nothing here is a rating. What a table does not carry is said so.
//
// The lap joint the linkages use: two plate links, each with a bronze bush of the joint's name pressed into its hole,
// laid side by side along z on the bushes' common line (stack, aligned on `<joint> bush/axis`) and a steel pin through
// both at a clear fit, kept by a collar on its far end.

import { LIBRARY, defaultsOf, register, type BlockDef, type PortDef } from '../blocks';
import { massOf } from '../mass';
import { matterOf } from '../matter';
import { ISO15552, ISO6020, ISO6432 } from '../parts/fluid';
import { ISO2341 } from '../parts/hardware';
import { between, boundOf, made, onto, over, partOfBlock, stack, through, turn, type Block, type Pattern } from '../room';
import { SPEC } from './board';

const mm = (x: number): number => x / 1000;
const X = 0, Y = 1, Z = 2, G = 9.80665, RAD = Math.PI / 180;
const clamp = (v: unknown, lo: number, hi: number, def: number): number => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : def; };
const r3 = (x: number): number => Number(x.toPrecision(3));
/** A library piece built as its node builds it (its settings as given), for a recipe to put where it goes. */
function piece(id: string, set: Record<string, unknown> = {}): Block {
  const d = LIBRARY.get(id); if (!d?.run) throw new Error(`no piece ${id} in the library`);
  return (d.run({}, { set: { ...defaultsOf(d), ...set }, time: 0 } as never) as { block: Block }).block;
}
const sizeOf = (b: Block, k: 0 | 1 | 2): number => b.hi[k] - b.lo[k];
const kgOf = (b: Block): number => massOf(partOfBlock(b));

// ---- what carries load, sized by calculation ----------------------------------------------------------------------------
/** A material's yield strength, Pa: the app's own (matter.ts, its handbook grade). */
export function yieldOf(mat: string): number { const p = matterOf(mat).props.find((q) => q.key === 'yield'); if (!p) throw new Error(`no yield strength for ${mat} in matter.ts`); return p.value; }
/** The factor of safety on yield the members here are sized to (typical of machine frames under a known static load with
 *  a dynamic factor already on it; not from a code). */
export const SF = 2;
/** The factor a moving machine's static load is multiplied by (typical, for walking and rolling loads at low speed). */
export const DYNAMIC = 1.5;
/** Plate thicknesses commonly stocked, mm (typical of hot-rolled plate to EN 10029; the standard lists no preferred series). */
const PLATES = [4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
/** A pin for a force in single shear: its diameter the smallest ISO 2341 clevis pin diameter (the library's table) whose
 *  shear stress F / (π d² / 4) stays under 0.577 σy / SF (von Mises; 4140 steel), or past the table's 20 mm the next
 *  5 mm, said so. */
export function pinFor(F: number): { d: number; tau: number; allow: number; table: boolean } {
  const allow = (0.577 * yieldOf('steel-alloy')) / SF, need = Math.sqrt((4 * F) / (Math.PI * allow)) * 1000;
  const std = Object.keys(ISO2341).map(Number).sort((a, b) => a - b).find((d) => d >= need), d = std ?? Math.ceil(need / 5) * 5;
  return { d, tau: F / ((Math.PI * mm(d) ** 2) / 4), allow, table: std !== undefined };
}
/** A plate link (a flat bar bent in its own plane) for a moment M over a length L with a pin hole of diameter dh through
 *  it: its thickness the first stocked plate at least L / 60 (typical, against buckling sideways), its width the first
 *  5 mm step at which the net section at the hole, Z = t (w³ − dh³) / (6 w), keeps M / Z under σy / SF and the hole
 *  keeps a hole's width of plate either side (w ≥ 3 dh, typical of a lug). */
export function plateLinkFor(M: number, L: number, dh: number, mat = 'steel-low'): { w: number; t: number; sigma: number; allow: number; sf: number } {
  const allow = yieldOf(mat) / SF, t = mm(PLATES.find((p) => p >= (L * 1000) / 60) ?? PLATES[PLATES.length - 1]!);
  let w = Math.ceil((3 * dh * 1000) / 5) * 5; const sig = (wm: number) => M / ((t * (mm(wm) ** 3 - dh ** 3)) / (6 * mm(wm)));
  while (sig(w) > allow) w += 5;
  return { w: mm(w), t, sigma: sig(w), allow, sf: yieldOf(mat) / sig(w) };
}
interface Hollow { size: string; H: number; B: number; t: number; Z: number; A: number }
let hollows: Hollow[] | undefined;
/** The library's square and rectangular hollow sections (piece.hollowsection's sizes), each with its elastic section
 *  modulus about its strong axis and its area worked from its sizes (sharp corners: a little over EN 10219-2's). */
function hollowTable(): Hollow[] {
  if (hollows) return hollows;
  const sizes = (LIBRARY.get('piece.hollowsection')?.settings?.find((s) => s.key === 'size')?.choices ?? []).map(String);
  hollows = sizes.flatMap((size) => { const m = /^[SR]HS ([\d.]+)x([\d.]+)x([\d.]+)$/.exec(size); if (!m) return []; const H = mm(Number(m[1])), B = mm(Number(m[2])), t = mm(Number(m[3]));
    return [{ size, H, B, t, Z: (B * H ** 3 - (B - 2 * t) * (H - 2 * t) ** 3) / (6 * H), A: B * H - (B - 2 * t) * (H - 2 * t) }]; }).sort((a, b) => a.A - b.A);
  return hollows;
}
/** The lightest hollow section of the library's table that carries a moment M (M / Z under σy / SF) and an axial force N
 *  (N / A under σy / SF; in compression over a length Lc also under Euler's π² E I / Lc² / SF, I = Z H / 2), at least
 *  `least` deep. Past the table: its heaviest, its stress said as it is. */
export function hollowFor(M: number, N = 0, Lc = 0, least = 0): Hollow & { sigma: number; allow: number; sf: number } {
  const allow = yieldOf('steel-low') / SF, E = matterOf('steel-low').props.find((q) => q.key === 'E')?.value ?? 200e9, t = hollowTable();
  const ok = (h: Hollow) => h.H >= least && M / h.Z + Math.abs(N) / h.A <= allow && (!(N < 0 && Lc > 0) || -N <= (Math.PI ** 2 * E * ((Math.min(h.H, h.B) / h.H) ** 2 * h.Z * h.H) / 2) / Lc ** 2 / SF);
  const h = t.find(ok) ?? t[t.length - 1]!, sigma = M / h.Z + Math.abs(N) / h.A;
  return { ...h, sigma, allow, sf: yieldOf('steel-low') / sigma };
}
interface Cyl { id: string; std: string; bore: number; rod: number; port: string; /** its body at no stroke, the rod out when in, its caps' square (or its barrel's outside), mm */ base: number; wh: number; E: number; round: boolean }
const AIR: Cyl[] = [...Object.entries(ISO6432).map(([b, q]) => ({ id: 'piece.cylinder6432', std: 'ISO 6432', bore: Number(b), rod: q.rod, port: q.port, base: q.L0, wh: q.wh, E: q.od, round: true })),
  ...Object.entries(ISO15552).map(([b, q]) => ({ id: 'piece.cylinder15552', std: 'ISO 15552', bore: Number(b), rod: q.rod, port: q.port, base: q.L8, wh: q.wh, E: q.E, round: false }))];
const OIL: Cyl[] = Object.entries(ISO6020).map(([b, q]) => ({ id: 'piece.hydcylinder', std: 'ISO 6020-2', bore: Number(b), rod: q.rod, port: q.port, base: q.body, wh: q.wh, E: q.E, round: false }));
const AIR_STROKES = [25, 40, 50, 80, 100, 125, 160, 200, 250, 320, 400, 500];
/** What a cylinder gives at a pressure on its rod side (the lesser of its two: it then holds pushing or pulling), N. */
export const cylForce = (bore: number, rod: number, pa: number): number => (pa * Math.PI * (mm(bore) ** 2 - mm(rod) ** 2)) / 4;
/** A cylinder of a table's row laid between two pins: drawn here to the row's sizes (its bore's caps and barrel, its rod
 *  at a slide fit up its barrel, drawn in, a clevis block at either end for the pins), because the library's own
 *  cylinder piece carries a joint and Between two points and Turn refuse a block on a joint (a fault listed for room.ts):
 *  upright, its rod up; `len` from pin to pin. */
function drawCylinder(c: Cyl, stroke: number): { b: Block; len: number; wide: number } {
  const n = `${c.std} Ø${c.bore} cylinder`, E = mm(c.E), body = mm(c.base + stroke), capL = Math.min(E * 0.4, body * 0.2), hc = mm(c.rod) * 2.4, cap = (nm: string) => made(`${n} ${nm}`, 'al-6061', c.round ? { cyl: [E / 2, capL] } : { box: [E, capL, E] });
  let b = stack(n, Y, [{ b: made(`${n} rear clevis`, 'steel-low', { box: [hc, hc, hc * 0.8] }) }, { b: cap('rear cap') }, { b: made(`${n} barrel`, 'al-6061', { tube: [mm(c.bore) / 2, c.round ? E / 2 : Math.max(E * 0.46, mm(c.bore) * 0.56), body - 2 * capL] }) }, { b: cap('front cap') }]);
  const hp = Math.min(mm(c.bore) * 0.3, (body - 2 * capL) * 0.3), moving = stack(`${n} piston and rod`, Y, [{ b: made(`${n} piston`, 'al-6061', { cyl: [mm(c.bore) * 0.49, hp] }) }, { b: made(`${n} rod`, 'steel-stainless', { cyl: [mm(c.rod) / 2, body - capL + mm(c.wh) - hp] }) }]);
  b = through(b, moving, { port: `${n} barrel/axis`, from: 'lo' }, 'slide');
  b = stack(n, Y, [{ b }, { b: made(`${n} rod clevis`, 'steel-low', { box: [hc, hc, hc * 0.8] }) }]);
  return { b, len: sizeOf(b, Y) - hc, wide: E };
}
/** The cylinder for a force at a pressure, near a length wanted (drawn in, pin to pin): the smallest bore of the table
 *  (air: ISO 6432, ISO 15552; oil: ISO 6020-2) whose rod side gives the force, at the stroke that brings its length
 *  nearest (air: the standard strokes; oil: any, to 10 mm). Past the table's largest bore: that bore, its shortfall said. */
function cylinderFor(F: number, pa: number, want: number, oil: boolean): { b: Block; c: Cyl; stroke: number; len: number; wide: number; gives: number; says: string } {
  const tab = oil ? OIL : AIR, c = tab.find((q) => cylForce(q.bore, q.rod, pa) >= F) ?? tab[tab.length - 1]!;
  const fixed = mm(c.base + c.wh + c.rod * 2.4), strokes = oil ? Array.from({ length: 196 }, (_, k) => 50 + k * 10) : AIR_STROKES;
  const stroke = [...strokes].sort((u, v) => Math.abs(fixed + mm(u) - want) - Math.abs(fixed + mm(v) - want))[0]!;
  return { ...drawCylinder(c, stroke), c, stroke, gives: cylForce(c.bore, c.rod, pa), says: `${c.std} Ø${c.bore}, rod Ø${c.rod}, stroke ${stroke} mm` };
}

// ---- plate links, lap joints --------------------------------------------------------------------------------------------
type Hole = [string, number, number];
/** A plate link along y (w wide, L long, t thick along z) with a hole through its thickness for each joint named: [joint,
 *  its place along the link from its middle, across it], each with a bronze bush of the joint's name pressed in (drawn
 *  solid: its pin bores it): `<joint> bush/axis`, the line its lap joint is laid on. */
function link(name: string, mat: string, w: number, L: number, t: number, holes: Hole[], rb: number): Block {
  const patterns: Pattern[] = holes.map(([j, y, x]) => ({ name: j, points: [[x, y]], face: '+z', hole: rb }));
  let b = made(name, mat, { box: [w, L, t] }, { patterns });
  for (const [j] of holes) b = through(b, made(`${j} bush`, 'bronze', { cyl: [rb, t] }), { port: `${name}/${j}`, from: 'lo' }, 'tight');
  return b;
}
/** A bar between two joints L apart (its ends half its width past them), lo and hi named where there is one. */
const bar = (name: string, mat: string, w: number, L: number, t: number, rb: number, lo?: string, hi?: string, more: Hole[] = []): Block =>
  link(name, mat, w, L + w, t, [...(lo ? [[lo, -L / 2, 0] as Hole] : []), ...(hi ? [[hi, L / 2, 0] as Hole] : []), ...more], rb);
/** A link (made along +y) turned in its plane to head at so many degrees from +x (90: as made). */
const heading = (b: Block, deg: number): Block => (Math.abs(deg - 90) < 1e-9 ? b : turn(b, Z, deg - 90));
/** A block laid beside another along z on the line of a joint both have a bush of: over it, or under it. */
const beside = (s: Block, b: Block, j: string, under = false, name = s.name): Block => (under ? stack(name, Z, [{ b }, { b: s, fit: 'clear' }], `${j} bush/axis`) : stack(name, Z, [{ b: s }, { b, fit: 'clear' }], `${j} bush/axis`));
/** The pin of a joint: a steel pin of radius r through every bush of that joint at a clear fit (what is on it turns),
 *  standing `out` past the last of them (`down`: past the first, the other way), a retaining collar on its far end. */
function pinned(s: Block, j: string, r: number, out = 0, down = false): Block {
  const bs = s.pieces.filter((p) => p.name === `${j} bush`).map(boundOf); if (!bs.length) throw new Error(`${s.name} has no ${j} bush`);
  const len = Math.max(...bs.map((q) => q[1][2])) - Math.min(...bs.map((q) => q[0][2])), h = Math.max(r * 0.8, mm(3));
  // (the far bush taken where the pin goes down: the points counted lowest piece first, so the last of them)
  const p = through(s, made(`${j} pin`, 'steel-alloy', { cyl: [r, len + out + h] }), { port: `${j} bush/axis`, from: down ? 'hi' : 'lo', ...(down ? { i: bs.length - 1 } : {}) }, 'clear');
  return over(p, `${j} pin/axis`, made(`${j} collar`, 'steel-low', { cyl: [r * 1.7, h] }), down ? 'lo' : 'hi', 'touch');
}
const lap = (a: Block, b: Block, j: string, r: number, under = false, name = a.name, down = false): Block => pinned(beside(a, b, j, under, name), j, r, 0, down);
/** The perpendicular distance from a joint to the line of a cylinder between two points: its lever arm, m. */
const arm = (J: [number, number], P: [number, number], Q: [number, number]): number => Math.abs((P[0] - J[0]) * (Q[1] - J[1]) - (P[1] - J[1]) * (Q[0] - J[0])) / Math.hypot(Q[0] - P[0], Q[1] - P[1]);

// ---- a two-link leg on two cylinders: its statics and sizes -------------------------------------------------------------
/** A leg's pose: its root lug's heading from the first pivot (a0) and distance (bk), the first link's heading (a1) and
 *  length, the second's (a2) and length, the second cylinder's lug on the first link m before the second pivot, degrees
 *  from +x and m. */
export interface Pose { a0: number; a1: number; a2: number; L1: number; L2: number; bk: number; m: number }
export interface LegDesign extends Pose { F: number; Mk: number; Mh: number; d: number; e: number; armH: number; armK: number; needH: number; needK: number;
  hip: ReturnType<typeof cylinderFor>; knee: ReturnType<typeof cylinderFor>; link: ReturnType<typeof plateLinkFor>; pin: ReturnType<typeof pinFor>; lug: ReturnType<typeof pinFor>; R: number }
/** The statics and sizes of a two-link leg standing on its foot under a force F up at the second link's end (the ground's
 *  push, the dynamic factor already on it): it bends the second pivot (the knee) by Mk = F |x_knee − x_foot| and the first
 *  (the hip) by Mh = F |x_foot|; each is held by a cylinder between two lugs, its force the moment over its lever arm;
 *  the cylinder the smallest bore that gives it at the pressure; the links one plate section for the larger moment; the
 *  pivots' pin for F and the larger cylinder force together (an upper bound on a pivot's reaction), the lugs' pin for
 *  the cylinder's force. The lugs' places along the links follow from the cylinders' own lengths: |Q − P|² = d² + bk² −
 *  2 d bk cos(a1 − a0) for the first, |B − A|² = m² + e² + 2 m e cos(a2 − a1) for the second, each solved for d or e. */
export function legDesign(p: Pose, F: number, pa: number, oil = false): LegDesign {
  const { L1, L2, bk, m } = p, u0: [number, number] = [Math.cos(p.a0 * RAD), Math.sin(p.a0 * RAD)], u1: [number, number] = [Math.cos(p.a1 * RAD), Math.sin(p.a1 * RAD)], u2: [number, number] = [Math.cos(p.a2 * RAD), Math.sin(p.a2 * RAD)];
  const K: [number, number] = [L1 * u1[0], L1 * u1[1]], An: [number, number] = [K[0] + L2 * u2[0], K[1] + L2 * u2[1]], Mk = F * Math.abs(K[0] - An[0]), Mh = F * Math.abs(An[0]);
  const cg = Math.cos((p.a1 - p.a0) * RAD), cphi = Math.cos((p.a2 - p.a1) * RAD), root = (v: number) => Math.sqrt(Math.max(v, 0));
  const span = (d: number, e: number) => ({ h: Math.hypot(d * u1[0] - bk * u0[0], d * u1[1] - bk * u0[1]), k: root(m * m + e * e + 2 * m * e * cphi) });
  const place = (Sh: number, Sk: number) => { const d = Math.min(L1 * 0.48, Math.max(L1 * 0.2, bk * cg + root(bk * bk * cg * cg - bk * bk + Sh * Sh))), e = Math.min(L2 * 0.7, Math.max(L2 * 0.15, -m * cphi + root(m * m * cphi * cphi - m * m + Sk * Sk)));
    return { d, e, armH: arm([0, 0], [bk * u0[0], bk * u0[1]], [d * u1[0], d * u1[1]]), armK: arm(K, [(L1 - m) * u1[0], (L1 - m) * u1[1]], [K[0] + e * u2[0], K[1] + e * u2[1]]) }; };
  const want = span(L1 * 0.35, L2 * 0.4);
  let g = place(want.h, want.k), hip = cylinderFor(Mh / g.armH, pa, want.h, oil), knee = cylinderFor(Mk / g.armK, pa, want.k, oil);
  // (each cylinder chosen for a twentieth more than is needed, so the last move of its lug does not leave it short)
  for (let k = 0; k < 8; k++) { g = place(hip.len, knee.len); hip = cylinderFor((1.05 * Mh) / g.armH, pa, want.h, oil); knee = cylinderFor((1.05 * Mk) / g.armK, pa, want.k, oil); }
  g = place(hip.len, knee.len);
  const needH = Mh / g.armH, needK = Mk / g.armK, R = F + Math.max(needH, needK), pin = pinFor(R), lug = pinFor(Math.max(needH, needK));
  return { ...p, F, Mk, Mh, ...g, needH, needK, hip, knee, link: plateLinkFor(Math.max(Mk, Mh), Math.max(L1, L2), mm(pin.d) * 1.6), pin, lug, R };
}
const legSays = (q: LegDesign, bar_: number, medium: string): string => `foot load ${r3(q.F)} N (static × ${DYNAMIC}); links ${r3(q.L1 * 1000)} and ${r3(q.L2 * 1000)} mm; second pivot's moment ${r3(q.Mk)} N·m on a ${r3(q.armK * 1000)} mm lever arm: ${r3(q.needK)} N needed, ${q.knee.says} gives ${r3(q.knee.gives)} N at ${bar_} bar (${medium}, rod side)${q.knee.gives < q.needK ? ': SHORT, no larger bore in the table' : ''}; first pivot's moment ${r3(q.Mh)} N·m on ${r3(q.armH * 1000)} mm: ${r3(q.needH)} N needed, ${q.hip.says} gives ${r3(q.hip.gives)} N${q.hip.gives < q.needH ? ': SHORT, no larger bore in the table' : ''}; links ${r3(q.link.w * 1000)} × ${r3(q.link.t * 1000)} mm plate (1018 steel), ${r3(q.link.sigma / 1e6)} MPa at the pin hole against ${r3(q.link.allow / 1e6)} allowed (yield / ${SF}), factor ${r3(q.link.sf)} on yield; pivot pins Ø${q.pin.d}${q.pin.table ? ' (an ISO 2341 diameter)' : ' (past ISO 2341\'s table)'}, ${r3(q.pin.tau / 1e6)} MPa in single shear against ${r3(q.pin.allow / 1e6)} (4140 steel), for ${r3(q.R)} N (an upper bound); lug pins Ø${q.lug.d}`;
/** What the links are drawn with: the width (the design's, and room for the lugs' bushes), thickness, pin and bush radii. */
const drawn = (q: LegDesign) => { const r = mm(q.pin.d) / 2; return { w: Math.max(q.link.w, mm(q.lug.d) * 5, mm(q.pin.d) * 5), t: q.link.t, r, rb: r * 1.6, rl: mm(q.lug.d) / 2, out: Math.max(q.hip.wide, q.knee.wide) + 4 * q.link.t }; };
/** The two cylinders laid on a leg whose lugs have their bushes: each lug's pin standing out to one side, each cylinder
 *  between its two pins beside the links (its clevis blocks on the pins). */
function cylindersOn(leg: Block, q: LegDesign, lugs: [string, string, string, string], down = false): Block {
  const v = drawn(q);
  for (const j of lugs) leg = pinned(leg, j, v.rl, v.out, down);
  leg = between(leg, { port: `${lugs[0]} pin/axis` }, { port: `${lugs[1]} pin/axis` }, q.hip.b, 'clear');
  return between(leg, { port: `${lugs[2]} pin/axis` }, { port: `${lugs[3]} pin/axis` }, q.knee.b, 'clear');
}

// ---- a pneumatic leg and the walker on it -------------------------------------------------------------------------------
/** The pneumatic leg's pose for a hip so high: the thigh forward and down at 55°, the shank back and down at 65°, both
 *  links one length, the hip cylinder's lug on a bracket behind the hip. */
export const pneumaticPose = (height: number): Pose => { const L = height / (Math.sin(55 * RAD) + Math.sin(65 * RAD)); return { a0: 180, a1: -55, a2: -115, L1: L, L2: L, bk: L * 0.45, m: L * 0.4 }; };
/** The leg built: a hip bracket (its top face against a frame), the thigh, the shank, a rubber foot pad on the ankle pin;
 *  every pivot a pin through bronze bushes with a collar; the cylinders beside the links (`mirror`: on the other side). */
function legPneumatic(q: LegDesign, mirror = false, name = 'pneumatic leg'): Block {
  const { L1, L2, bk, d, m, e } = q, { w, t, r, rb } = drawn(q);
  let leg = heading(link('hip bracket', 'steel-low', w, bk + w, t, [['hip cylinder mount', -bk / 2, 0], ['hip', bk / 2, 0]], rb), 0);
  leg = lap(leg, heading(bar('thigh', 'steel-low', w, L1, t, rb, 'hip', 'knee', [['thigh lug', -L1 / 2 + d, 0], ['knee cylinder mount', L1 / 2 - m, 0]]), q.a1), 'hip', r, mirror, name, mirror);
  leg = lap(leg, heading(bar('shank', 'steel-low', w, L2, t, rb, 'knee', 'ankle', [['shank lug', -L2 / 2 + e, 0]]), q.a2), 'knee', r, !mirror, name, mirror);
  leg = lap(leg, heading(link('foot pad', 'rubber', w * 0.8, w * 3, t, [['ankle', 0, -w * 0.05]], rb), 0), 'ankle', r, mirror, name, mirror);
  return cylindersOn(leg, q, ['hip cylinder mount', 'thigh lug', 'knee cylinder mount', 'shank lug'], mirror);
}
export interface WalkerDesign { n: number; W: number; perLeg: number; self: number; leg: LegDesign; rail: ReturnType<typeof hollowFor>; Mrail: number; Lf: number; tankV: number; tankR: number; tankT: number; hoop: number }
/** A frame on 4 or 6 pneumatic legs, designed for a payload: two hollow-section rails along it with a deck between them,
 *  the legs under the rails (the far side's mirrored), an air receiver and a bank of 5/2 valves (two a leg) on the deck.
 *  The worst leg carries half the weight (three feet on the ground at a time, the weight near the line between two of
 *  them): payload and the machine's own mass as first drawn. Each rail a beam on the end legs carrying half the payload
 *  spread along it: M = (W / 2) Lf / 8, times the dynamic factor. The receiver holds five full strokes of every cylinder
 *  for a fall of 2 bar (typical), its wall by the hoop stress p r / t at a factor of 4 on yield (typical; not a pressure
 *  vessel code's design), 3 mm at least. */
function walkerPneumatic(n: number, payload: number, height: number, bar_: number): { b: Block; q: WalkerDesign } {
  const make = (kg: number, self: number) => {
    const leg = legDesign(pneumaticPose(height), (kg / 2) * G * DYNAMIC, bar_ * 1e5), near = legPneumatic(leg), far = legPneumatic(leg, true), lx = sizeOf(near, X), Lf = lx * (n / 2) * 1.1;
    const Mrail = ((payload * G * DYNAMIC) / 2) * Lf / 8, rail = hollowFor(Mrail, 0, 0, drawn(leg).t * 1.5), Wd = Math.max(height * 0.6, sizeOf(near, Z) * 2.6);
    const beam = () => turn(piece('piece.hollowsection', { size: rail.size, length: Math.round(Lf * 1000) }), Y, 90);
    let w = stack('pneumatic walker', Z, [{ b: beam() }, { b: made('deck', 'al-5052', { box: [Lf, mm(5), Wd - 2 * rail.B] }) }, { b: beam() }], undefined, false, ['mid', 'hi']);
    for (const x of (n === 6 ? ['lo', 'mid', 'hi'] : ['lo', 'hi']) as ('lo' | 'mid' | 'hi')[]) { w = onto(w, '-y', near, 'touch', undefined, [x, 'lo']); w = onto(w, '-y', far, 'touch', undefined, [x, 'hi']); }
    const swept = n * ((Math.PI * mm(leg.hip.c.bore) ** 2) / 4 * mm(leg.hip.stroke) + (Math.PI * mm(leg.knee.c.bore) ** 2) / 4 * mm(leg.knee.stroke)), tankV = (5 * swept * (bar_ + 1)) / 2;
    const tankR = Math.cbrt(tankV / (4 * Math.PI)), tankT = Math.max(mm(3), (bar_ * 1e5 * tankR * 4) / yieldOf('steel-low')), hoop = (bar_ * 1e5 * tankR) / tankT;
    const end = () => made('air receiver end', 'steel-low', { cyl: [tankR, tankT] });
    w = onto(w, '+y', turn(stack('air receiver', Y, [{ b: end() }, { b: made('air receiver', 'steel-low', { tube: [tankR - tankT, tankR, 4 * tankR] }) }, { b: end() }]), Z, 90), 'touch', undefined, ['lo', 'mid']);
    const valve = () => { try { return piece('piece.valve52', { size: leg.knee.c.port }); } catch { return piece('piece.valve52'); } };
    const valves = stack('valve bank', Z, Array.from({ length: 2 * n }, () => ({ b: valve() })));
    w = onto(w, '+y', stack('valve manifold', Y, [{ b: made('manifold bar', 'al-6061', { box: [sizeOf(valves, X), mm(25), sizeOf(valves, Z)] }) }, { b: valves }]), 'touch', undefined, ['hi', 'mid']);
    return { b: w, q: { n, W: kg * G, perLeg: (kg / 2) * G * DYNAMIC, self, leg, rail, Mrail, Lf, tankV, tankR, tankT, hoop } };
  };
  const first = make(payload, 0), self = kgOf(first.b);
  return make(payload + self, self);
}

// ---- a hydraulic insect leg and the radial walker on it ------------------------------------------------------------------
/** The insect leg's pose for a reach (hip pivot to foot, level): the coxa out 0.15 of a unit, the femur up and out at 40°
 *  (0.45), the tibia down and out at 75° (0.75), the femur cylinder's lug on a horn of the coxa plate above and behind
 *  the femur's pivot. */
export const insectPose = (reach: number): Pose & { c: number } => { const U = reach / (0.15 + 0.45 * Math.cos(40 * RAD) + 0.75 * Math.cos(75 * RAD)); return { a0: 115, a1: 40, a2: -75, L1: U * 0.45, L2: U * 0.75, bk: U * 0.2, m: U * 0.2, c: U * 0.15 }; };
export interface InsectDesign extends LegDesign { c: number; reach: number; Myaw: number; yaw: number; yawSigma: number }
/** The insect leg's design: the two-link leg's (femur and tibia, each on its cylinder) and the hip's upright yaw pin, a
 *  cantilever carrying the foot load at the reach: M = F reach, its diameter the first 5 mm step at which 32 M / (π d³)
 *  stays under σy / SF (4140 steel). */
export function insectDesign(reach: number, loadKg: number, bar_: number): InsectDesign {
  const p = insectPose(reach), F = loadKg * G * DYNAMIC, q = legDesign(p, F, bar_ * 1e5, true), Myaw = F * reach, allow = yieldOf('steel-alloy') / SF;
  const yaw = Math.ceil((Math.cbrt((32 * Myaw) / (Math.PI * allow)) * 1000) / 5) * 5;
  return { ...q, c: p.c, reach, Myaw, yaw, yawSigma: (32 * Myaw) / (Math.PI * mm(yaw) ** 3) };
}
/** The leg built (x out, y up): a mount plate at −x (its back Onto a body's side), a lug with the upright yaw pin and its
 *  sleeve (the hip's yaw: the sleeve turns on the pin), the coxa plate against the sleeve with its horn up, the femur and
 *  the tibia on their pins, a rubber foot on a pin at the tibia's end, and the two cylinders. */
function legInsect(q: InsectDesign): Block {
  const { w, t, r, rb } = drawn(q), ry = mm(q.yaw) / 2, rs = ry * 1.8, wc = q.bk * Math.sin(q.a0 * RAD) + 2 * w, hs = Math.max(wc, ry * 5), Lc = q.c + w * 1.5;
  let hip = stack('hip', Y, [{ b: made('hip lug', 'steel-low', { box: [rs * 3, t, rs * 2.4] }) }, { b: made('hip yaw pin', 'steel-alloy', { cyl: [ry, hs * 1.15] }) }], undefined, false, ['hi', 'mid']);
  hip = over(hip, 'hip yaw pin/axis', made('hip yaw sleeve', 'steel-low', { cyl: [rs, hs] }), 'mid', 'clear');
  hip = onto(hip, '-x', made('hip mount', 'steel-low', { box: [t, hs * 1.15 + t, rs * 5] }, { pattern: { name: 'holes', points: [[-hs * 0.4, -rs * 1.9], [hs * 0.4, -rs * 1.9], [-hs * 0.4, rs * 1.9], [hs * 0.4, rs * 1.9]], face: '-x', hole: Math.max(t * 0.3, mm(4)) } }));
  const jx = wc / 2 - w / 2, jy = Lc / 2 - w / 2;
  const coxa = heading(link('coxa', 'steel-low', wc, Lc, t, [['femur joint', jy, jx], ['femur cylinder mount', jy + q.bk * Math.cos(q.a0 * RAD), jx - q.bk * Math.sin(q.a0 * RAD)]], rb), 0);
  let leg = onto(hip, '+x', coxa, 'touch');
  leg = lap(leg, heading(bar('femur', 'steel-low', w, q.L1, t, rb, 'femur joint', 'tibia joint', [['femur lug', -q.L1 / 2 + q.d, 0], ['tibia cylinder mount', q.L1 / 2 - q.m, 0]]), q.a1), 'femur joint', r, false, 'insect leg');
  leg = lap(leg, heading(bar('tibia', 'steel-low', w, q.L2, t, rb, 'tibia joint', 'foot', [['tibia lug', -q.L2 / 2 + q.e, 0]]), q.a2), 'tibia joint', r, true, 'insect leg');
  leg = lap(leg, heading(link('foot pad', 'rubber', w * 0.8, w * 3, t, [['foot', 0, -w * 0.05]], rb), 0), 'foot', r, false, 'insect leg');
  return cylindersOn(leg, q, ['femur cylinder mount', 'femur lug', 'tibia cylinder mount', 'tibia lug']);
}
const insectSays = (q: InsectDesign, bar_: number): string => `reach ${r3(q.reach * 1000)} mm; ${legSays(q, bar_, 'oil')}; hip yaw pin Ø${q.yaw}, ${r3(q.yawSigma / 1e6)} MPa in bending for ${r3(q.Myaw)} N·m (the foot load at the reach) against ${r3(yieldOf('steel-alloy') / SF / 1e6)} allowed; the yaw's drive is not sized (its torque is the gait's, not the load's) and not drawn`;
/** A domed hull on n insect legs round it, designed for a payload: a steel skirt the hip mounts stand against, a dome
 *  over it as high as the legs, a belly pan under; the legs put on in opposite pairs (onto +x and −x), the hull turned a
 *  step between pairs. The worst leg carries the weight over the feet on the ground less one (half the legs stand at a
 *  time, alternating): W / 2 with 4 or 6 legs, W / 3 with 8; W the payload and the machine's own mass as first drawn. */
function walkerRadial(n: number, payload: number, reach: number, body: number, bar_: number): { b: Block; q: InsectDesign; W: number; self: number; share: number } {
  const share = Math.max(2, n / 2 - 1);
  const make = (kg: number) => {
    const q = insectDesign(reach, kg / share, bar_), leg = legInsect(q), R = body / 2, hm = boundOf(leg.pieces.find((p) => p.name === 'hip mount')!), hp = hm[1][1] - hm[0][1], D = leg.hi[1] - hm[1][1];
    // (the dome a turned shell, 6 mm of glass fibre (typical): a quarter ellipse out and the same back inside it)
    const sh = mm(6), arc = (a: number, b: number) => Array.from({ length: 9 }, (_, k) => [a * Math.cos((k * Math.PI) / 16), b * Math.sin((k * Math.PI) / 16)] as [number, number]);
    const dome: [number, number][] = [...arc(R, D), ...arc(R - sh, D - sh).reverse()];
    let w = stack('radial walker', Y, [{ b: made('belly pan', 'al-5052', { cyl: [R, mm(4)] }) }, { b: made('hull skirt', 'steel-low', { tube: [R - mm(8), R, hp] }) }, { b: made('hull dome', 'fibreglass', { lathe: { pts: dome } }) }]);
    const far = turn(leg, Y, 180);
    for (let k = 0; k < n / 2; k++) { w = onto(w, '+x', leg, 'touch', undefined, ['hi', 'mid']); w = onto(w, '-x', far, 'touch', undefined, ['hi', 'mid']); if (k < n / 2 - 1) w = turn(w, Y, 360 / n); }
    return { b: w, q };
  };
  const first = make(payload), self = kgOf(first.b);
  return { ...make(payload + self), W: (payload + self) * G, self, share };
}

// ---- the seeds ----------------------------------------------------------------------------------------------------------
const OUT: PortDef[] = [{ name: 'block', type: 'block', label: 'the block, for the next operation' }, { name: 'thing', type: 'assembly' as PortDef['type'], label: 'the block, drawn' }, { name: 'pieces', type: 'integer' }, { name: 'faces', type: 'integer', label: 'faces where pieces meet' }, { name: 'offers', type: 'list<text>' as PortDef['type'], label: 'lines and rooms it offers' },
  { name: 'report', type: 'text', label: 'what it was designed for and what governs: loads, stresses, factors, actuators, mass' }, { name: 'figures', type: 'any' as PortDef['type'], label: 'the report\'s numbers (SI), for a check by hand' }, { name: 'says', type: 'text' }];
const num = (name: string, def: number, label: string): PortDef => ({ name, type: 'number', default: def, label });
const pick = (name: string, def: string, choices: string[], label: string): PortDef => ({ name, type: 'text', default: def, choices, label });
interface Built { b: Block; report: string; figures: Record<string, unknown> }
/** A kit seed: its inputs (what is asked of it), the recipe that designs and builds it from them, and what it says. */
function seed(id: string, name: string, says: string, gloss: string, domains: string[], inputs: PortDef[], build: (i: Record<string, unknown>) => Built | Promise<Built>): BlockDef {
  const d: BlockDef = { version: 1, pure: true, id, name, kind: 'generator', ability: 'generate', domains, says, by: 'built in', spec: { gloss, ...SPEC }, ports: { inputs, outputs: OUT },
    run: async (i) => { const { b, report, figures } = await build(i), kg = kgOf(b), rep = `${report}; mass as drawn ${r3(kg)} kg`;
      return { block: b, thing: partOfBlock(b), pieces: b.pieces.length, faces: b.faces.length, offers: [...new Set([...b.pieces.flatMap((p) => p.lines.map((l) => l.port)), ...b.rooms.map((r) => r.name)])].sort(), report: rep, figures: { ...figures, mass: kg },
        says: `${b.name}: ${b.pieces.length} pieces, ${[0, 1, 2].map((k) => Math.round(sizeOf(b, k as 0) * 1000)).join(' × ')} mm; ${rep}` }; } };
  register(d); return d;
}

let done = false;
export function makeKitBodies(): void {
  if (done) return; done = true;
  const P = (i: Record<string, unknown>) => clamp(i.pressure, 2, 10, 6);
  seed('seed.leg-pneumatic', 'Pneumatic walking leg (two links, two air cylinders)', 'A walking machine\'s leg designed for a load on its foot: a hip bracket (its top face Onto a frame\'s underside), a thigh and a shank of steel plate, a rubber foot pad; an air cylinder from the bracket to the thigh (the hip\'s) and one from the thigh to the shank (the knee\'s), each with a clevis block at either end on pins through lugs, at a lever arm worked from the pose. Designed, not drawn to a size: the foot load (kg, times 1.5 dynamic, typical) gives the knee and hip moments, each cylinder is the smallest ISO 6432 or ISO 15552 bore of the library\'s tables that holds its moment at the supply pressure (drawn to its row), the links are sized in bending at the pin hole and the pins in shear with a factor of 2 on yield (typical); the report says every number and where a table falls short. Inputs: load (kg on the foot), height (hip above ground, mm), pressure (bar). It moves: four pivots and two cylinders\' rods. For a pneumatic walking machine, a legged platform, a walker',
    'A two-link leg on two air cylinders, sized from its foot load and supply pressure', ['mechanical', 'pipelines'],
    [num('load', 100, 'load on the foot, kg (static; a dynamic factor of 1.5 is put on it)'), num('height', 800, 'hip above the ground, mm (400 to 1500)'), num('pressure', 6, 'supply pressure, bar (gauge)')],
    (i) => { const q = legDesign(pneumaticPose(mm(clamp(i.height, 400, 1500, 800))), clamp(i.load, 1, 5000, 100) * G * DYNAMIC, P(i) * 1e5); return { b: legPneumatic(q), report: legSays(q, P(i), 'air'), figures: q as unknown as Record<string, unknown> }; });
  seed('seed.walker-pneumatic', 'Pneumatic walking machine (4 or 6 legs)', 'A pneumatic walking machine designed for a payload: a frame of two steel hollow-section rails (the library\'s EN 10219 sizes, the lightest that carries the payload in bending) with a deck between them, 4 or 6 pneumatic legs (seed.leg-pneumatic, each sized for half the machine\'s weight: three feet stand at a time) under the rails, an air receiver sized for five full strokes of every cylinder and a bank of 5/2 solenoid valves (the library\'s, by the cylinders\' port, two a leg) on the deck. The report gives the payload, the machine\'s own mass, each leg\'s load, the cylinders chosen against the force needed, the rail and its stress, the receiver\'s volume and wall. Hoses are not laid (said in the report). Inputs: legs (4 or 6), payload (kg), height (hip above ground, mm), pressure (bar). It offers the deck (Onto a face +y) for the load',
    'A walking machine on four or six pneumatic legs with its receiver and valves, sized from its payload', ['mechanical', 'pipelines', 'vehicles'],
    [pick('legs', '4', ['4', '6'], 'how many legs: 4 or 6'), num('payload', 200, 'payload on the deck, kg'), num('height', 800, 'hips above the ground, mm (400 to 1500)'), num('pressure', 6, 'supply pressure, bar (gauge)')],
    (i) => { const n = Number(i.legs) === 6 ? 6 : 4, r = walkerPneumatic(n, clamp(i.payload, 1, 5000, 200), mm(clamp(i.height, 400, 1500, 800)), P(i)), q = r.q;
      return { b: r.b, figures: q as unknown as Record<string, unknown>, report: `payload ${r3((q.W / G) - q.self)} kg, own mass as first drawn ${r3(q.self)} kg, weight ${r3(q.W)} N; worst leg half of it: ${legSays(q.leg, P(i), 'air')}; rails ${q.rail.size} (EN 10219), ${r3(q.Lf * 1000)} mm, ${r3(q.Mrail)} N·m each (half the payload spread along it, × ${DYNAMIC}): ${r3(q.rail.sigma / 1e6)} MPa against ${r3(q.rail.allow / 1e6)} allowed, factor ${r3(q.rail.sf)} on yield; receiver ${r3(q.tankV * 1000)} L (five strokes of all ${2 * n} cylinders for a 2 bar fall, typical), Ø${r3(q.tankR * 2000)} mm, wall ${r3(q.tankT * 1000)} mm: hoop stress ${r3(q.hoop / 1e6)} MPa (not a pressure vessel code's design); ${2 * n} valves, 5/2, port ${q.leg.knee.c.port}; hoses not laid` }; });
  const HB = (i: Record<string, unknown>) => clamp(i.pressure, 20, 160, 160);
  seed('seed.leg-insect', 'Insect leg, hydraulic (coxa, femur, tibia)', 'A three-segment insect or spider leg for a walking machine, splayed out and down, designed for a load on its foot at a reach: a hip mount plate (hip mount/holes, its back Onto a body\'s side), a hip yaw on an upright pin (its sleeve turns), the coxa plate out with its horn, the femur up and out to a raised knee, the tibia down to a rubber foot; a hydraulic cylinder from the coxa\'s horn to the femur and one from the femur to the tibia, each with a clevis block at either end on pins through lugs. Designed: the foot load (kg, times 1.5 dynamic, typical) at the reach gives the two pivots\' moments; each cylinder is the smallest ISO 6020-2 bore of the library\'s table that holds its moment at the pressure (drawn to its row); links sized in bending, pins in shear, the yaw pin in bending, factor 2 on yield (typical). The yaw\'s drive is not sized and not drawn (said in the report). Inputs: load (kg on the foot), reach (hip to foot, level, mm), pressure (bar; ISO 6020-2 is a 160 bar series). Three joints and two cylinders\' rods move. For a giant spider, a hexapod, a crab, a walking excavator\'s legs',
    'A three-jointed hydraulic insect leg sized from its foot load and reach', ['mechanical', 'pipelines'],
    [num('load', 250, 'load on the foot, kg (static; a dynamic factor of 1.5 is put on it)'), num('reach', 1500, 'reach from hip to foot, level, mm (500 to 4000)'), num('pressure', 160, 'working pressure, bar (20 to 160)')],
    (i) => { const q = insectDesign(mm(clamp(i.reach, 500, 4000, 1500)), clamp(i.load, 1, 20000, 250), HB(i)); return { b: legInsect(q), report: insectSays(q, HB(i)), figures: q as unknown as Record<string, unknown> }; });
  seed('seed.walker-radial', 'Radial walker, hydraulic (spider, hexapod: 4, 6 or 8 legs)', 'A walking machine with n hydraulic insect legs (seed.leg-insect) round a domed hull: 4, 6 (a hexapod) or 8 (a giant robotic spider), designed for a payload: every leg sized for the weight over the feet on the ground less one (half the legs stand at a time), the weight the payload and the machine\'s own mass as first drawn; the hull a steel skirt the hip mounts stand against, a dome over it as high as the knees and a belly pan (covers, not sized). The report gives the weight, each leg\'s load, the cylinders chosen against the force needed, the links\' and pins\' stresses. Inputs: legs (4, 6 or 8), payload (kg), reach (each leg\'s, hip to foot, mm), body (the hull\'s diameter, mm), pressure (bar). It offers the dome\'s top (Onto a face +y) for a cab, a turret or an arm',
    'A domed body on four, six or eight hydraulic insect legs, sized from its payload', ['mechanical', 'pipelines', 'vehicles'],
    [pick('legs', '8', ['4', '6', '8'], 'how many legs: 4, 6 or 8 (a spider)'), num('payload', 500, 'payload, kg'), num('reach', 1500, 'each leg\'s reach, hip to foot, mm (500 to 4000)'), num('body', 1400, 'the hull\'s diameter, mm'), num('pressure', 160, 'working pressure, bar (20 to 160)')],
    (i) => { const n = [4, 6, 8].includes(Number(i.legs)) ? Number(i.legs) : 8, reach = clamp(i.reach, 500, 4000, 1500), r = walkerRadial(n, clamp(i.payload, 1, 50000, 500), mm(reach), mm(clamp(i.body, reach * 0.4, reach * 3, 1400)), HB(i));
      return { b: r.b, figures: { ...r.q, W: r.W, self: r.self, share: r.share, n } as unknown as Record<string, unknown>, report: `payload ${r3(r.W / G - r.self)} kg, own mass as first drawn ${r3(r.self)} kg, weight ${r3(r.W)} N on ${n} legs; worst leg a ${r3(r.share)}th of it; ${insectSays(r.q, HB(i))}; hull not sized (a cover)` }; });
}
makeKitBodies();
