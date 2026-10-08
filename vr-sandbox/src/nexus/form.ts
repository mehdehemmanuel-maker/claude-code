// Three general shapes beyond the primitives, enough between them for most of what is made: a loft (a body through
// cross-sections along its length: a car's shell, a kart's nose, a fuselage, a hull, a tank, a bottle), a bent tube
// (a round tube along a path, each corner bent round a radius: a kart's chassis, a roll cage, a handlebar, an exhaust,
// a crane's lattice), and a turned profile (a profile spun round an axis: a rim, a tyre's section, a piston, a nozzle,
// a drill's chuck, a jet's nacelle). Nothing here is about any one thing.
//
// A loft's cross-section is a superellipse, |y/b|^n + |z/a|^n = 1 (Lamé's curve): n = 2 an ellipse, larger n squarer,
// each station its own half-width a, its own bottom and top (b their half-gap) and its own n. Its area is
// 4ab Γ(1 + 1/n)² / Γ(1 + 2/n); its volume the area summed along it (trapezium rule between stations).
// A tube's bends are arcs of the radius asked (a tube is bent round at least about twice its diameter, typical of
// rotary-draw benders), each cut back from its corner by R tan(θ/2); its length the straights and the arcs.
// A turned profile's volume and surface are Pappus's: each segment of the profile a frustum.

export type V3 = [number, number, number];
export interface Station { /** along the loft, m */ x: number; /** half its width (its lower half's, where its upper half is said apart) */ w: number; /** its bottom and top */ lo: number; hi: number; /** how square its section (2 an ellipse) */ n?: number; /** its upper half's half-width and squareness, where they differ (a car's glasshouse narrowing to its roof) */ wt?: number; nt?: number; /** where it is widest, between its bottom and top (its middle if not said: a car's flank is widest at its shoulder) */ mid?: number }
export interface Loft { st: Station[] }
export interface Tube { r: number; pts: V3[]; /** its wall, m (solid if not said) */ wall?: number; /** bend radius at its corners, m (2 diameters if not said) */ bend?: number }
/** a profile of [radius, height] points, spun about y */
export type Lathe = [number, number][];

const gamma = (z: number): number => {
  // Lanczos (g = 7, n = 9), good to about 15 digits for z > 0.5
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1; let x = c[0]!; for (let i = 1; i < 9; i++) x += c[i]! / (z + i); const t = z + 7.5;
  return Math.sqrt(2 * Math.PI) * t ** (z + 0.5) * Math.exp(-t) * x;
};
/** The area of a superellipse of half-axes a, b and exponent n. */
export const superArea = (a: number, b: number, n = 2) => (4 * a * b * gamma(1 + 1 / n) ** 2) / gamma(1 + 2 / n);
/** A point on a superellipse at angle t (0 at +z, going over the top), its half-axes a (z) and b (y). */
export function superPoint(a: number, b: number, n: number, t: number): [y: number, z: number] {
  const c = Math.cos(t), s = Math.sin(t), e = 2 / n;
  return [b * Math.sign(s) * Math.abs(s) ** e, a * Math.sign(c) * Math.abs(c) ** e];
}
/** Its perimeter, by summing its outline (Ramanujan's form is for ellipses only). */
export function superPerimeter(a: number, b: number, n = 2, k = 64): number {
  let L = 0, [y0, z0] = superPoint(a, b, n, 0);
  for (let i = 1; i <= k; i++) { const [y, z] = superPoint(a, b, n, (i / k) * 2 * Math.PI); L += Math.hypot(y - y0, z - z0); y0 = y; z0 = z; }
  return L;
}
const midOf = (s: Station) => Math.min(s.hi, Math.max(s.lo, s.mid ?? (s.hi + s.lo) / 2));
const bLo = (s: Station) => Math.max(0, midOf(s) - s.lo), bHi = (s: Station) => Math.max(0, s.hi - midOf(s));
// a section's two halves, each half of its own superellipse: below its widest line and above it
const secArea = (s: Station) => (superArea(s.w, bLo(s), s.n) + superArea(s.wt ?? s.w, bHi(s), s.nt ?? s.n)) / 2;
const secPerim = (s: Station) => (superPerimeter(s.w, bLo(s), s.n ?? 2) + superPerimeter(s.wt ?? s.w, bHi(s), s.nt ?? s.n ?? 2)) / 2;
/** A point on a station's section at angle t (0 at +z, over the top first): each half by its own width, height and squareness. */
export function sectionPoint(s: Station, t: number): [y: number, z: number] {
  const up = Math.sin(t) >= 0, [y, z] = superPoint(Math.max(1e-4, up ? s.wt ?? s.w : s.w), Math.max(1e-4, up ? bHi(s) : bLo(s)), up ? s.nt ?? s.n ?? 2 : s.n ?? 2, t);
  return [midOf(s) + y, z];
}
/** The half-width of a station's surface at height y (null above or below it): where a seam or a lamp lies on it. */
export function surfaceZ(s: Station, y: number): number | null {
  const m = midOf(s), up = y >= m, b = up ? bHi(s) : bLo(s), w = up ? s.wt ?? s.w : s.w, n = up ? s.nt ?? s.n ?? 2 : s.n ?? 2, t = b > 0 ? Math.abs((y - m) / b) : 1;
  return t > 1 ? null : w * (1 - t ** n) ** (1 / n);
}
/** Whether (y, z) is inside a station's section, and by how far (m; negative outside). */
export function insideBy(s: Station, y: number, z: number): number {
  const m = midOf(s), up = y >= m, b = up ? bHi(s) : bLo(s), w = up ? s.wt ?? s.w : s.w, n = up ? s.nt ?? s.n ?? 2 : s.n ?? 2;
  const ok = (k: number) => b - k > 0 && w - k > 0 && Math.abs((y - m) / (b - k)) ** n + Math.abs(z / (w - k)) ** n <= 1;
  if (!ok(0)) return -1; let lo = 0, hi = Math.min(b, w); for (let i = 0; i < 30; i++) { const c = (lo + hi) / 2; if (ok(c)) lo = c; else hi = c; } return lo;
}
/** A loft's section where it is at x, eased between its stations (a straight blend). */
export function stationAt(l: Loft, x: number): Station | null {
  const st = [...l.st].sort((a, b) => a.x - b.x); if (!st.length || x < st[0]!.x || x > st[st.length - 1]!.x) return null;
  for (let i = 1; i < st.length; i++) { const a = st[i - 1]!, b = st[i]!; if (x <= b.x) { const f = (x - a.x) / Math.max(1e-9, b.x - a.x), m = (u: number, v: number) => u + (v - u) * f; return { x, w: m(a.w, b.w), lo: m(a.lo, b.lo), hi: m(a.hi, b.hi), n: m(a.n ?? 2, b.n ?? 2), wt: m(a.wt ?? a.w, b.wt ?? b.w), nt: m(a.nt ?? a.n ?? 2, b.nt ?? b.n ?? 2), mid: m(midOf(a), midOf(b)) }; } }
  return st[st.length - 1]!;
}
/** A loft's volume and its skin's area (the ends left open, as a shell's are). */
export function loftVolume(l: Loft): number { let v = 0; for (let i = 1; i < l.st.length; i++) { const a = l.st[i - 1]!, b = l.st[i]!; v += ((secArea(a) + secArea(b)) / 2) * Math.abs(b.x - a.x); } return v; }
export function loftArea(l: Loft): number { let A = 0; for (let i = 1; i < l.st.length; i++) { const a = l.st[i - 1]!, b = l.st[i]!; A += ((secPerim(a) + secPerim(b)) / 2) * Math.hypot(b.x - a.x, (b.hi + b.lo - a.hi - a.lo) / 2); } return A; }

/** A tube's path as straights and bends: each corner cut back by R tan(θ/2) and joined by an arc. */
export interface Leg { kind: 'line' | 'arc'; a: V3; b: V3; /** an arc's corner (the control point it bends round) */ c?: V3; len: number }
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k], len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]), unit = (a: V3): V3 => mul(a, 1 / (len3(a) || 1));
export function tubeLegs(t: Tube): Leg[] {
  const R = t.bend ?? 4 * t.r, p = t.pts, out: Leg[] = []; if (p.length < 2) return out;
  let from = p[0]!;
  for (let i = 1; i < p.length - 1; i++) {
    const c = p[i]!, u = unit(sub(p[i - 1]!, c)), v = unit(sub(p[i + 1]!, c)), cos = Math.max(-1, Math.min(1, u[0] * v[0] + u[1] * v[1] + u[2] * v[2])), turn = Math.PI - Math.acos(cos);
    if (turn < 1e-3) continue; // straight through
    // cut back no further than half of either leg
    const cut = Math.min(R * Math.tan(turn / 2), len3(sub(p[i - 1]!, c)) / 2, len3(sub(p[i + 1]!, c)) / 2), r = cut / Math.tan(turn / 2);
    const a = add(c, mul(u, cut)), b = add(c, mul(v, cut));
    out.push({ kind: 'line', a: from, b: a, len: len3(sub(a, from)) }, { kind: 'arc', a, b, c, len: r * turn });
    from = b;
  }
  out.push({ kind: 'line', a: from, b: p[p.length - 1]!, len: len3(sub(p[p.length - 1]!, from)) });
  return out.filter((l) => l.len > 1e-6);
}
export const tubeLength = (t: Tube) => tubeLegs(t).reduce((s, l) => s + l.len, 0);
export const tubeVolume = (t: Tube) => tubeLength(t) * Math.PI * (t.r ** 2 - (t.wall ? Math.max(0, t.r - t.wall) ** 2 : 0));

/** A turned profile's volume and surface (Pappus): each segment a frustum. */
export function latheVolume(p: Lathe): number { let v = 0; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1]!, [r1, y1] = p[i]!; v += (Math.PI * (y1 - y0) * (r0 * r0 + r0 * r1 + r1 * r1)) / 3; } return Math.abs(v); }
export function latheArea(p: Lathe): number { let A = 0; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1]!, [r1, y1] = p[i]!; A += Math.PI * (r0 + r1) * Math.hypot(r1 - r0, y1 - y0); } return A; }

/** A box in a shape's own frame: its middle, its axes (the frame's if not given) and its half sizes. */
export interface LocalBox { c: V3; u?: [V3, V3, V3]; h: V3 }
const perp = (d: V3): [V3, V3] => { const t: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a = unit([d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]]); return [a, [d[1] * a[2] - d[2] * a[1], d[2] * a[0] - d[0] * a[2], d[0] * a[1] - d[1] * a[0]]]; };
const span = (min: V3, max: V3): LocalBox => ({ c: mul(add(min, max), 0.5), h: mul(sub(max, min), 0.5) });
/** Boxes that together cover a shape tightly, in its own frame: a loft's between each pair of stations, a tube's along
 *  each straight (turned with it) and round each bend, a turned profile's as one. What touches what is found between
 *  these, so a parts inside a kart's frame touch only the tubes they meet, not the frame's bounds. */
export function piecesOf(s: { loft: Loft } | { tube: Tube } | { lathe: Lathe }): LocalBox[] {
  if ('loft' in s) return s.loft.st.slice(1).map((b, i) => { const a = s.loft.st[i]!, w = Math.max(a.w, b.w, a.wt ?? 0, b.wt ?? 0); return span([Math.min(a.x, b.x), Math.min(a.lo, b.lo), -w], [Math.max(a.x, b.x), Math.max(a.hi, b.hi), w]); });
  if ('tube' in s) return tubeLegs(s.tube).map((l): LocalBox => {
    const r = s.tube.r;
    if (l.kind === 'line') { const d = unit(sub(l.b, l.a)), [e1, e2] = perp(d); return { c: mul(add(l.a, l.b), 0.5), u: [d, e1, e2], h: [l.len / 2 + r * 0.02, r, r] }; }
    const pts = [l.a, l.b, l.c!]; return span([0, 1, 2].map((k) => Math.min(...pts.map((q) => q[k]!)) - r) as V3, [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k]!)) + r) as V3);
  });
  const rM = Math.max(...s.lathe.map(([r]) => r)), ys = s.lathe.map(([, y]) => y);
  return [span([-rM, Math.min(...ys), -rM], [rM, Math.max(...ys), rM])];
}
/** The bounds of a shape's pieces, in its own frame. */
export function boundsOf(ps: LocalBox[]): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of ps) { const u = p.u ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; for (let k = 0; k < 3; k++) { const e = Math.abs(u[0][k]!) * p.h[0] + Math.abs(u[1][k]!) * p.h[1] + Math.abs(u[2][k]!) * p.h[2]; min[k] = Math.min(min[k]!, p.c[k]! - e); max[k] = Math.max(max[k]!, p.c[k]! + e); } }
  return { min, max };
}
