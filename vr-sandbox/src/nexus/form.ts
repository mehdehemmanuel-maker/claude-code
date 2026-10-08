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

import { patchAt, type Patch } from './surface';

export type V3 = [number, number, number];
export interface Station { /** along the loft, m */ x: number; /** half its width (its lower half's, where its upper half is said apart) */ w: number; /** its bottom and top */ lo: number; hi: number; /** how square its section (2 an ellipse) */ n?: number; /** its upper half's half-width and squareness, where they differ (a car's glasshouse narrowing to its roof) */ wt?: number; nt?: number; /** where it is widest, between its bottom and top (its middle if not said: a car's flank is widest at its shoulder) */ mid?: number; /** its section's middle moved across, m (0 if not said): a spoke sweeping round as it goes out */ z?: number }
export interface Loft { st: Station[] }
export interface Tube { r: number; pts: V3[]; /** its wall, m (solid if not said) */ wall?: number; /** bend radius at its corners, m (2 diameters if not said) */ bend?: number }
/** a profile of [radius, height] points, spun about y */
export type Lathe = [number, number][];
/** a profile of [x, y] points in its own plane (closed, either way round), drawn along z from -L/2 to L/2: a bar's, an
 *  angle's, a channel's or an I-beam's section, as it is rolled or extruded to length */
export interface Prism { pts: [number, number][]; /** openings through it along its length (a box section's bore, an extrusion's centre hole) */ holes?: [number, number][][]; L: number }

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
  for (let i = 1; i < st.length; i++) { const a = st[i - 1]!, b = st[i]!; if (x <= b.x) { const f = (x - a.x) / Math.max(1e-9, b.x - a.x), m = (u: number, v: number) => u + (v - u) * f; return { x, w: m(a.w, b.w), lo: m(a.lo, b.lo), hi: m(a.hi, b.hi), n: m(a.n ?? 2, b.n ?? 2), wt: m(a.wt ?? a.w, b.wt ?? b.w), nt: m(a.nt ?? a.n ?? 2, b.nt ?? b.n ?? 2), mid: m(midOf(a), midOf(b)), z: m(a.z ?? 0, b.z ?? 0) }; } }
  return st[st.length - 1]!;
}
/** A loft's volume and its skin's area (the ends left open, as a shell's are). */
export function loftVolume(l: Loft): number { let v = 0; for (let i = 1; i < l.st.length; i++) { const a = l.st[i - 1]!, b = l.st[i]!; v += ((secArea(a) + secArea(b)) / 2) * Math.abs(b.x - a.x); } return v; }
export function loftArea(l: Loft): number { let A = 0; for (let i = 1; i < l.st.length; i++) { const a = l.st[i - 1]!, b = l.st[i]!; A += ((secPerim(a) + secPerim(b)) / 2) * Math.hypot(b.x - a.x, (b.hi + b.lo - a.hi - a.lo) / 2); } return A; }

/** A tube's path as straights and bends: each corner cut back by R tan(θ/2) and joined by an arc. */
export interface Leg { kind: 'line' | 'arc'; a: V3; b: V3; /** an arc's corner (the control point it bends round) */ c?: V3; len: number }
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k], len3 = (a: V3) => Math.hypot(a[0], a[1], a[2]), unit = (a: V3): V3 => mul(a, 1 / (len3(a) || 1));
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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
/** A profile's area (the shoelace sum), its perimeter, and so its prism's volume and skin. */
export const profileArea = (pts: [number, number][]): number => { let a = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i]!, [x1, y1] = pts[(i + 1) % pts.length]!; a += x0 * y1 - x1 * y0; } return Math.abs(a) / 2; };
const perimeterOf = (pts: [number, number][]): number => { let l = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i]!, [x1, y1] = pts[(i + 1) % pts.length]!; l += Math.hypot(x1 - x0, y1 - y0); } return l; };
const sectionArea = (p: Prism): number => profileArea(p.pts) - (p.holes ?? []).reduce((a, h) => a + profileArea(h), 0);
export const prismVolume = (p: Prism): number => sectionArea(p) * p.L;
export const prismArea = (p: Prism): number => (perimeterOf(p.pts) + (p.holes ?? []).reduce((a, h) => a + perimeterOf(h), 0)) * p.L + 2 * sectionArea(p);
export function latheVolume(p: Lathe): number { let v = 0; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1]!, [r1, y1] = p[i]!; v += (Math.PI * (y1 - y0) * (r0 * r0 + r0 * r1 + r1 * r1)) / 3; } return Math.abs(v); }
export function latheArea(p: Lathe): number { let A = 0; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1]!, [r1, y1] = p[i]!; A += Math.PI * (r0 + r1) * Math.hypot(r1 - r0, y1 - y0); } return A; }

/** A box in a shape's own frame: its middle, its axes (the frame's if not given) and its half sizes. */
export interface LocalBox { c: V3; u?: [V3, V3, V3]; h: V3 }
const perp = (d: V3): [V3, V3] => { const t: V3 = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], a = unit([d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]]); return [a, [d[1] * a[2] - d[2] * a[1], d[2] * a[0] - d[0] * a[2], d[0] * a[1] - d[1] * a[0]]]; };
const span = (min: V3, max: V3): LocalBox => ({ c: mul(add(min, max), 0.5), h: mul(sub(max, min), 0.5) });
/** Boxes that together cover a shape tightly, in its own frame: a loft's between each pair of stations, a tube's along
 *  each straight (turned with it) and round each bend, a turned profile's as one. What touches what is found between
 *  these, so a parts inside a kart's frame touch only the tubes they meet, not the frame's bounds. */
export function piecesOf(s: { loft: Loft } | { tube: Tube } | { lathe: Lathe } | { surf: Patch } | { prism: Prism }): LocalBox[] {
  if ('surf' in s) return surfPieces(s.surf);
  if ('prism' in s) return prismPieces(s.prism);
  if ('loft' in s) return s.loft.st.slice(1).map((b, i) => { const a = s.loft.st[i]!, w = Math.max(a.w, b.w, a.wt ?? 0, b.wt ?? 0), z0 = Math.min(a.z ?? 0, b.z ?? 0), z1 = Math.max(a.z ?? 0, b.z ?? 0); return span([Math.min(a.x, b.x), Math.min(a.lo, b.lo), z0 - w], [Math.max(a.x, b.x), Math.max(a.hi, b.hi), z1 + w]); });
  if ('tube' in s) return tubeLegs(s.tube).map((l): LocalBox => {
    const r = s.tube.r;
    if (l.kind === 'line') { const d = unit(sub(l.b, l.a)), [e1, e2] = perp(d); return { c: mul(add(l.a, l.b), 0.5), u: [d, e1, e2], h: [l.len / 2 + r * 0.02, r, r] }; }
    const pts = [l.a, l.b, l.c!]; return span([0, 1, 2].map((k) => Math.min(...pts.map((q) => q[k]!)) - r) as V3, [0, 1, 2].map((k) => Math.max(...pts.map((q) => q[k]!)) + r) as V3);
  });
  const rM = Math.max(...s.lathe.map(([r]) => r)), ys = s.lathe.map(([, y]) => y);
  return [span([-rM, Math.min(...ys), -rM], [rM, Math.max(...ys), rM])];
}
/** A prism's covering boxes: a section of square corners only (an angle, a channel, an I-beam, a box section) is cut
 *  into the bands between its corners' heights, each band into the runs inside it, and bands alike merged; so a box lies
 *  on each flange and each web, and nothing is taken to be in the hollow of an angle or a channel. Any other section is
 *  covered by its own box. (Its openings cut the bands too, so a box section is four walls.) */
const prismKept = new WeakMap<Prism, LocalBox[]>();
function prismPieces(pr: Prism): LocalBox[] {
  const kept = prismKept.get(pr); if (kept) return kept;
  const loops = [pr.pts, ...(pr.holes ?? [])], P = pr.pts, h = pr.L / 2, xs = P.map(([x]) => x), ysAll = loops.flat().map(([, y]) => y);
  const edges = loops.flatMap((L) => L.map((q, i) => [q, L[(i + 1) % L.length]!] as const));
  const square = edges.every(([[x0, y0], [x1, y1]]) => Math.abs(x1 - x0) < 1e-9 || Math.abs(y1 - y0) < 1e-9);
  let out: LocalBox[];
  if (!square) out = [span([Math.min(...xs), Math.min(...ysAll), -h], [Math.max(...xs), Math.max(...ysAll), h])];
  else {
    const ys = [...new Set(ysAll.map((y) => +y.toFixed(9)))].sort((a, b) => a - b), bands: { y0: number; y1: number; runs: [number, number][] }[] = [];
    for (let k = 1; k < ys.length; k++) {
      const ym = (ys[k - 1]! + ys[k]!) / 2, cut: number[] = [];
      for (const [[x0, y0], [x1, y1]] of edges) if (Math.abs(x1 - x0) < 1e-9 && (y0 - ym) * (y1 - ym) < 0) cut.push(x0);
      cut.sort((a, b) => a - b); const runs: [number, number][] = []; for (let i = 0; i + 1 < cut.length; i += 2) runs.push([cut[i]!, cut[i + 1]!]);
      const last = bands[bands.length - 1];
      if (last && last.runs.length === runs.length && last.runs.every(([a, b], i) => Math.abs(a - runs[i]![0]) < 1e-9 && Math.abs(b - runs[i]![1]) < 1e-9)) last.y1 = ys[k]!;
      else bands.push({ y0: ys[k - 1]!, y1: ys[k]!, runs });
    }
    out = bands.flatMap((b) => b.runs.map(([a, c]) => span([a, b.y0, -h], [c, b.y1, h])));
  }
  prismKept.set(pr, out); return out;
}
/** A freeform skin's covering boxes: one to each cell of a grid over it, turned to lie along the skin there (thin across
 *  it), and its mirror's; a cell where the skin curves too much for one thin box (a nose's corner) split again until each
 *  is (at most 20 mm thick, four splits deep). A wheel under a fender's arch is then near only the boxes at the arch's
 *  edge, not inside one. */
const surfKept = new WeakMap<Patch, LocalBox[]>();
function surfPieces(pt: Patch, k = 3): LocalBox[] {
  const kept = surfKept.get(pt); if (kept) return kept;
  const out: LocalBox[] = []; surfKept.set(pt, out);
  // as many to start with as its size needs: about one to every 40 cm along it and 25 cm across (2 to 12, 1 to 4)
  const run = (f: (t: number) => [number, number]) => { let d = 0, q = patchAt(pt, ...f(0)).at; for (let i = 1; i <= 6; i++) { const r = patchAt(pt, ...f(i / 6)).at; d += Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]); q = r; } return d; };
  const na = Math.max(2, Math.min(12, Math.round(run((a) => [a, 0.5]) / 0.4))), nb = Math.max(1, Math.min(4, Math.round(run((b) => [0.5, b]) / 0.25)));
  const cell = (a0: number, a1: number, b0: number, b1: number, depth: number) => {
    const mid = patchAt(pt, (a0 + a1) / 2, (b0 + b1) / 2), e3 = unit(mid.n), t = unit(mid.du), e1 = unit(sub(t, mul(e3, dot(t, e3)))), e2: V3 = [e3[1] * e1[2] - e3[2] * e1[1], e3[2] * e1[0] - e3[0] * e1[2], e3[0] * e1[1] - e3[1] * e1[0]];
    const ps: V3[] = []; for (let i = 0; i <= k; i++) for (let j = 0; j <= k; j++) ps.push(patchAt(pt, a0 + ((a1 - a0) * i) / k, b0 + ((b1 - b0) * j) / k).at);
    const c = mul(ps.reduce((acc, q) => add(acc, q), [0, 0, 0] as V3), 1 / ps.length), ax = [e1, e2, e3] as [V3, V3, V3], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const q of ps) for (let d = 0; d < 3; d++) { const x = dot(sub(q, c), ax[d]!); lo[d] = Math.min(lo[d]!, x); hi[d] = Math.max(hi[d]!, x); }
    if (hi[2]! - lo[2]! > 0.02 && depth < 4) {
      // split across whichever way it is longer on the skin
      const la = len3(sub(patchAt(pt, a1, (b0 + b1) / 2).at, patchAt(pt, a0, (b0 + b1) / 2).at)), lb = len3(sub(patchAt(pt, (a0 + a1) / 2, b1).at, patchAt(pt, (a0 + a1) / 2, b0).at));
      if (la >= lb) { cell(a0, (a0 + a1) / 2, b0, b1, depth + 1); cell((a0 + a1) / 2, a1, b0, b1, depth + 1); } else { cell(a0, a1, b0, (b0 + b1) / 2, depth + 1); cell(a0, a1, (b0 + b1) / 2, b1, depth + 1); }
      return;
    }
    const cc = add(c, add(add(mul(e1, (lo[0]! + hi[0]!) / 2), mul(e2, (lo[1]! + hi[1]!) / 2)), mul(e3, (lo[2]! + hi[2]!) / 2))), h: V3 = [(hi[0]! - lo[0]!) / 2 + 0.001, (hi[1]! - lo[1]!) / 2 + 0.001, (hi[2]! - lo[2]!) / 2 + 0.001];
    out.push({ c: cc, u: ax, h });
    if (pt.s.mirror) out.push({ c: [cc[0], cc[1], -cc[2]], u: ax.map((e) => [e[0], e[1], -e[2]] as V3) as [V3, V3, V3], h });
  };
  for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) cell(i / na, (i + 1) / na, j / nb, (j + 1) / nb, 0);
  return out;
}
/** The bounds of a shape's pieces, in its own frame. */
export function boundsOf(ps: LocalBox[]): { min: V3; max: V3 } {
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const p of ps) { const u = p.u ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; for (let k = 0; k < 3; k++) { const e = Math.abs(u[0][k]!) * p.h[0] + Math.abs(u[1][k]!) * p.h[1] + Math.abs(u[2][k]!) * p.h[2]; min[k] = Math.min(min[k]!, p.c[k]! - e); max[k] = Math.max(max[k]!, p.c[k]! + e); } }
  return { min, max };
}
