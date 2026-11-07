// Exact solid features (plan/AUDIT.md, package P9: the directive's geometry list), each made by OpenCascade through
// replicad on a block's exact solid (brep.ts `solidsOf`: its pieces made, placed, their holes cut, and fused into one),
// never on the drawn mesh: a fillet and a chamfer on the edges a selector picks, a shell, an offset, the union, cut and
// intersection of two blocks, a mirror in a plane of the block's own frame, a pattern (linear or circular) as one solid,
// an external ISO 68-1 thread on a rod, a slot and a groove (a rectangle swept along a line or round an axis) and a rib.
// Each node says the solid's exact volume (the kernel's mass properties), its mass at the block's material, and whether
// the kernel's analyser (BRepCheck) calls it valid; what the kernel cannot make, or makes and calls not valid, is refused
// with why, never passed on. The kernel works here in millimetres (its tolerances are a millimetre model's: replicad's
// shell takes 1e-3, OpenCascade's confusion distance is 1e-7); every volume goes out in m³.
import { kernel, solidsOf, valid } from './brep';
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { Block, partOfBlock } from './room';
import type { Part } from './kits';
import { densityKg } from './mass';
import { ISO_METRIC } from './parts/bdw';

type Solid = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type V3 = [number, number, number];
type Replicad = Awaited<ReturnType<typeof kernel>>;

/** A rod's cylinder, mm: the middle of one end, its direction (unit) to the other end, its radius and length. */
interface Rod { a: V3; d: V3; r: number; h: number }
/** A line the block offers, mm: a point on it and its direction. */
interface LineMm { port: string; p: V3; d: V3 }
/** A feature's solid: the kernel's, in millimetres, the material it weighs as, and what of its block it still has. */
export interface Exact { readonly exact: true; readonly name: string; readonly solid: Solid; readonly mat: string; readonly rods: Rod[]; readonly lines: LineMm[] }
const isExact = (x: unknown): x is Exact => !!x && typeof x === 'object' && (x as Exact).exact === true;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: V3): V3 => mul(a, 1 / (Math.hypot(...a) || 1)), vec = (p: { x: number; y: number; z: number }): V3 => [p.x, p.y, p.z];
const AX: Record<string, V3> = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const free = (s: Solid) => { try { s?.delete?.(); } catch { /* (already the kernel's to free: a consuming call took it) */ } };
const mm = (x: number) => +(x).toPrecision(6);

/** The first material in a thing's tree. */
const matOf = (p: Part): string | undefined => p.mat ?? (p.parts ?? []).map(matOf).find(Boolean);
/** The exact solid of a block (each of its pieces made by solidsOf, placed, its holes cut, and all fused into one), of a
 *  thing, or a feature's solid as it is. Refused where a piece is not an exact solid: a feature on part of it is not it. */
export async function exactOf(x: unknown, what = 'block'): Promise<Exact> {
  if (isExact(x)) return x;
  const block = x instanceof Block ? x : undefined, part = block ? partOfBlock(block) : x && typeof x === 'object' && typeof (x as Part).name === 'string' ? (x as Part) : undefined;
  if (!part) throw new Error(`wire a ${what} in (a block, a thing, or a feature's solid)`);
  const s = await solidsOf(part, { keep: true });
  if (s.failed || !s.solids.length) { s.solids.forEach((q) => free(q.solid)); throw new Error(`${part.name}: ${s.failed} of its ${s.rows.length} pieces are not exact solids (${Object.keys(s.byWhy).join('; ') || 'none made'}): no feature on it`); }
  const each = s.solids.map((q) => q.solid.scale(1000, [0, 0, 0]));
  const solid = each.slice(1).reduce((a: Solid, b: Solid) => { const f = a.fuse(b); free(a); free(b); return f; }, each[0]);
  const rods: Rod[] = [], lines: LineMm[] = [];
  if (block) for (const p of block.pieces) {
    const B = p.solid.base, F = B.frame, d: V3 = F ? unit([F[1], F[4], F[7]]) : [0, 1, 0], c = mul([B.c[0], B.c[1], B.c[2]], 1000);
    if (B.k === 'cyl' && !B.ri && !p.solid.minus.length) rods.push({ a: add(c, mul(d, (-B.h * 1000) / 2)), d, r: B.r * 1000, h: B.h * 1000 });
    for (const l of p.lines) lines.push({ port: l.port, p: [l.x * 1000, (l.y ?? B.c[1]) * 1000, l.z * 1000], d: unit((l.dir ?? [0, 1, 0]) as V3) });
  } else if (part.shape && 'cyl' in part.shape && !part.rot && !(part.cuts ?? []).length) { const [r, h] = part.shape.cyl, c = mul((part.at ?? [0, 0, 0]) as V3, 1000); rods.push({ a: add(c, [0, (-h * 1000) / 2, 0]), d: [0, 1, 0], r: r * 1000, h: h * 1000 }); }
  return { exact: true, name: part.name, solid, mat: (block?.pieces[0]?.mat ?? matOf(part)) || 'steel-low', rods, lines };
}

/** What a solid is: its volume (m³, by the kernel), its mass at its material, whether the kernel calls it valid. */
async function measured(e: Exact, says: string) {
  const r = await kernel(), v = r.measureVolume(e.solid) / 1e9, rho = densityKg(e.mat), ok = valid(e.solid), kg = rho !== undefined ? v * rho : undefined;
  return { solid: e, volume: v, kg, valid: ok, says: `${says}: ${mm(v * 1e9)} mm³${kg !== undefined ? `, ${mm(kg * 1000)} g as ${e.mat}` : `; ${e.mat} has no density here, so no mass`}; ${ok ? 'valid' : 'NOT valid'} by the kernel's check` };
}
const made = (e: Exact, solid: Solid, more: Partial<Exact> = {}): Exact => ({ ...e, solid, ...more });
const bounds = (s: Solid): [V3, V3] => (s.boundingBox as { bounds: [V3, V3] }).bounds;

// ---- edges and faces by a selector --------------------------------------------------------------------------------------
/** A named face of a solid's bound ("+x" … "−z"): its axis and the plane's value there. */
function faceOf(s: Solid, name: string): { k: number; at: number } {
  const m = /^([+-])\s*([xyz])$/.exec(name.trim().replace('−', '-')); if (!m) throw new Error(`a face is named +x, -x, +y, -y, +z or -z (not "${name}")`);
  const [lo, hi] = bounds(s), k = 'xyz'.indexOf(m[2]!); return { k, at: m[1] === '+' ? hi[k]! : lo[k]! };
}
const TOL = 1e-3; // mm: a point this near a plane is on it (the bound the kernel gives is its solid's within its tolerances)
/** The edges a selector picks: "all"; "face +y" (each edge in that face of its bound); "line <port>" (the round edges
 *  about a line its block offers: a hole's rims); "longer 20" or "shorter 20" (mm); "along y" (straight edges along an
 *  axis). Returned as a test on an edge. */
function edgeTest(e: Exact, sel: string): (edge: Solid) => boolean {
  const t = sel.trim().toLowerCase(), [w, arg = ''] = [t.split(/\s+/)[0]!, t.split(/\s+/).slice(1).join(' ')];
  const pts = (x: Solid): V3[] => [0, 0.25, 0.5, 0.75, 1].map((u) => vec(x.pointAt(u)));
  if (w === 'all' || t === '') return () => true;
  if (w === 'face') { const f = faceOf(e.solid, arg); return (x) => pts(x).every((p) => Math.abs(p[f.k]! - f.at) < TOL); }
  if (w === 'longer' || w === 'shorter') { const L = Number(arg); if (!(L > 0)) throw new Error(`"${w}" takes a length in mm (${sel})`); return (x) => (w === 'longer' ? x.length > L : x.length < L); }
  if (w === 'along') { const d = AX[arg]; if (!d) throw new Error(`"along" takes x, y or z (${sel})`); return (x) => { const [a, b] = [vec(x.startPoint), vec(x.endPoint)], u = sub(b, a), L = Math.hypot(...u); return L > TOL && Math.abs(Math.abs(dot(u, d)) - L) < TOL * L && pts(x).every((p) => Math.hypot(...cross(sub(p, a), unit(u))) < TOL); }; }
  if (w === 'line') { const l = e.lines.find((q) => q.port.toLowerCase() === arg); if (!l) throw new Error(`no line "${arg}" on ${e.name} (its lines: ${e.lines.map((q) => q.port).join(', ') || 'none'})`);
    return (x) => { const ps = pts(x), rad = ps.map((p) => Math.hypot(...cross(sub(p, l.p), l.d))), ax = ps.map((p) => dot(sub(p, l.p), l.d)); return rad[0]! > TOL && rad.every((q) => Math.abs(q - rad[0]!) < TOL) && ax.every((q) => Math.abs(q - ax[0]!) < TOL); }; }
  throw new Error(`edges by "all", "face +y", "line <port>", "longer <mm>", "shorter <mm>" or "along x|y|z" (not "${sel}")`);
}
function picked(r: Replicad, e: Exact, sel: string): { test: (x: Solid) => boolean; n: number; shortest: number } {
  const test = edgeTest(e, sel), es = new r.EdgeFinder().when(({ element }) => test(element)).find(e.solid) as Solid[];
  if (!es.length) throw new Error(`refused: no edge of ${e.name} is "${sel}"`);
  return { test, n: es.length, shortest: Math.min(...es.map((x) => x.length as number)) };
}

// ---- the features ------------------------------------------------------------------------------------------------------
/** A fillet or a chamfer on the edges a selector picks: refused where the kernel cannot blend them, makes them not valid,
 *  or takes nothing away (a radius larger than the edges and the faces beside them allow). */
export async function blend(x: unknown, how: 'fillet' | 'chamfer', sel: string, size: number) {
  const r = await kernel(), e = await exactOf(x); if (!(size > 0)) throw new Error(`a ${how} of a size above zero (${size} mm)`);
  const p = picked(r, e, sel), v0 = r.measureVolume(e.solid), [lo, hi] = bounds(e.solid), thin = Math.min(...[0, 1, 2].map((k) => hi[k]! - lo[k]!));
  const no = `refused: a ${how} of ${size} mm is larger than these ${p.n} edges allow (the shortest is ${mm(p.shortest)} mm; ${e.name} is ${mm(thin)} mm at its thinnest)`;
  let out: Solid; const c = e.solid.clone();
  try { out = c[how](size, (f: Solid) => f.when(({ element }: { element: Solid }) => p.test(element))); } catch { throw new Error(`${no}: the kernel could not blend them`); } finally { free(c); }
  if (!valid(out) || !(r.measureVolume(out) < v0)) { free(out); throw new Error(`${no}: what the kernel made is not valid`); }
  return measured(made(e, out), `${e.name}, ${p.n} edges (${sel}) ${how === 'fillet' ? 'filleted' : 'chamfered'} ${size} mm`);
}
/** A shell: the solid hollowed to a wall of so many mm, the faces a selector names left open ("face +y"; "none": closed). */
export async function shellOf(x: unknown, wall: number, open: string) {
  const r = await kernel(), e = await exactOf(x); if (!(wall > 0)) throw new Error(`a wall above zero (${wall} mm)`);
  const shut = /^\s*(none|)\s*$/i.test(open), f = shut ? undefined : faceOf(e.solid, open.replace(/^\s*face\s+/i, '')), c = e.solid.clone(); let out: Solid;
  const onFace = (fc: Solid) => { const [lo, hi] = bounds(fc); return !!f && Math.abs(lo[f.k]! - f.at) < TOL && Math.abs(hi[f.k]! - f.at) < TOL; };
  try {
    if (shut) { // (closed: its inside offset in by the wall and taken out)
      const oc = r.getOC(), b = new oc.BRepOffsetAPI_MakeOffsetShape(); b.PerformByJoin(c.wrapped, -wall, 1e-6, oc.BRepOffset_Mode.BRepOffset_Skin, false, false, oc.GeomAbs_JoinType.GeomAbs_Arc, false);
      const inner = r.cast(r.downcast(b.Shape())); b.delete(); out = c.cut(inner); free(inner);
    } else out = c.shell(wall, (fd: Solid) => fd.when(({ element }: { element: Solid }) => onFace(element)));
  } catch (err) { throw new Error(`refused: the kernel could not shell ${e.name} to a ${wall} mm wall (${err instanceof Error ? err.message : 'it threw'})`); } finally { free(c); }
  // (a shell takes something away and leaves something: a wall as thick as the solid, or thicker, leaves nothing inside)
  const v0 = r.measureVolume(e.solid), v1 = valid(out) ? r.measureVolume(out) : NaN;
  if (!(v1 > 0 && v1 < v0)) { free(out); throw new Error(`refused: a ${wall} mm shell of ${e.name} is not a solid the kernel calls valid with a hollow inside (${e.name} is ${mm(Math.min(...[0, 1, 2].map((k) => bounds(e.solid)[1][k]! - bounds(e.solid)[0][k]!)))} mm at its thinnest)`); }
  return measured(made(e, out, { rods: [], lines: [] }), `${e.name} shelled to a ${wall} mm wall, ${shut ? 'closed' : `open at ${open}`}`);
}
/** Every face moved out (in, below zero) by a distance, its edges and corners rounded (OpenCascade's arc join). */
export async function offsetOf(x: unknown, dist: number) {
  const r = await kernel(), e = await exactOf(x); if (!dist) throw new Error('an offset of a distance other than zero');
  const oc = r.getOC(), b = new oc.BRepOffsetAPI_MakeOffsetShape(); let out: Solid;
  try { b.PerformByJoin(e.solid.wrapped, dist, 1e-6, oc.BRepOffset_Mode.BRepOffset_Skin, false, false, oc.GeomAbs_JoinType.GeomAbs_Arc, false); out = r.cast(r.downcast(b.Shape())); }
  catch (err) { throw new Error(`refused: the kernel could not offset ${e.name} by ${dist} mm (${err instanceof Error ? err.message : 'it threw'})`); } finally { b.delete(); }
  // (an offset in takes something away and leaves something; out, it adds)
  const v0 = r.measureVolume(e.solid), v1 = valid(out) ? r.measureVolume(out) : NaN;
  if (!(v1 > 0 && (dist > 0 ? v1 > v0 : v1 < v0))) { free(out); throw new Error(`refused: ${e.name} offset by ${dist} mm is not a solid the kernel calls valid${dist < 0 ? ' (in by more than half its thickness leaves nothing)' : ''}`); }
  return measured(made(e, out, { rods: [], lines: [] }), `${e.name} offset ${dist > 0 ? 'out' : 'in'} by ${Math.abs(dist)} mm (edges and corners rounded)`);
}
/** Two blocks, as each is placed, joined, the second taken from the first, or what both hold. Weighs as the first. */
export async function boolean(a: unknown, b: unknown, op: 'fuse' | 'cut' | 'intersect') {
  const r = await kernel(), A = await exactOf(a, 'first block'), B = await exactOf(b, 'second block'), ca = A.solid.clone(), cb = B.solid.clone(); let out: Solid;
  try { out = ca[op](cb); } catch (err) { throw new Error(`refused: the kernel could not ${op} ${B.name} with ${A.name} (${err instanceof Error ? err.message : 'it threw'})`); } finally { free(ca); free(cb); }
  if (!(r.measureVolume(out) > 0)) { free(out); throw new Error(`refused: ${A.name} and ${B.name} ${op === 'intersect' ? 'share nothing' : 'leave nothing'}`); }
  return measured(made(A, out, { name: `${A.name} ${op === 'fuse' ? '∪' : op === 'cut' ? '−' : '∩'} ${B.name}`, rods: [], lines: [] }), `${A.name} ${op === 'fuse' ? 'joined with' : op === 'cut' ? 'less' : 'within'} ${B.name}`);
}
/** Mirrored in a plane through the middle of its bound (a block's own frame: the room makes each about its middle): its
 *  image alone, or the image joined to it. */
export async function mirrorOf(x: unknown, plane: string, keep: string) {
  const e = await exactOf(x), P = plane.trim().toUpperCase(); if (!['YZ', 'XZ', 'XY'].includes(P)) throw new Error(`a plane yz, xz or xy (not "${plane}")`);
  const [lo, hi] = bounds(e.solid), mid = mul(add(lo, hi), 0.5), image = e.solid.clone().mirror(P, mid);
  const both = keep === 'both', out = both ? image.fuse(e.solid) : image; if (both) free(image);
  return measured(made(e, out, { rods: [], lines: [] }), `${e.name} mirrored in its ${P.toLowerCase()} plane${both ? ', joined to itself' : ''}`);
}
/** n copies as one solid: along an axis so far apart, or round an axis parallel to one of x, y, z, so far from its
 *  middle (the axis that far along the next axis round: x for y and z, z for x). */
export async function patternOf(x: unknown, kind: string, n: number, axis: string, step: number) {
  const e = await exactOf(x), d = AX[axis]; if (!d) throw new Error(`an axis x, y or z (not "${axis}")`);
  // (200: a cap on the kernel's work in one node, not a rule of geometry)
  if (!(Number.isInteger(n) && n >= 1 && n <= 200)) throw new Error(`a pattern of 1 to 200 copies (${n})`); if (!(step > 0)) throw new Error(`a step or radius above zero (${step} mm)`);
  const [lo, hi] = bounds(e.solid), mid = mul(add(lo, hi), 0.5), side = axis === 'x' ? AX.z! : AX.x!, centre = sub(mid, mul(side, step));
  const copies = Array.from({ length: n }, (_, k) => (kind === 'circular' ? e.solid.clone().rotate((360 * k) / n, centre, d) : e.solid.clone().translate(mul(d, k * step))));
  const out = copies.slice(1).reduce((a: Solid, b: Solid) => { const f = a.fuse(b); free(a); free(b); return f; }, copies[0]);
  return measured(made(e, out, { rods: [], lines: [] }), `${n} of ${e.name} ${kind === 'circular' ? `round an axis along ${axis} ${step} mm from its middle` : `along ${axis}, ${step} mm apart`}, one solid`);
}

/** ISO 68-1's basic profile of an external thread at axial place z (0 ≤ z < P): its radius, mm. A crest flat P/8 wide at
 *  the major diameter d, flanks at 30° to the radial (5H/8 deep, H = (√3/2) P), a root flat P/4 wide at d − 5H/4. */
export const isoRadius = (d: number, P: number, z: number): number => {
  const H = (Math.sqrt(3) / 2) * P, R = d / 2, r1 = R - (5 * H) / 8, f = (5 * P) / 16, u = ((z % P) + P) % P;
  if (u <= P / 8) return R; if (u <= P / 8 + f) return R - ((u - P / 8) / f) * (R - r1); if (u <= P / 8 + f + P / 4) return r1; return r1 + ((u - P / 8 - f - P / 4) / f) * (R - r1);
};
/** An external single-start thread on a rod's cylinder, its profile ISO 68-1's at its M size's coarse pitch (ISO 261, the
 *  size table in parts/bdw.ts): the section of the threaded length drawn exactly (r at each angle the profile's at that
 *  fraction of a pitch: crest and root true arcs, flanks splines through the profile) and swept up the rod's axis turning
 *  once a pitch (a right-handed helix). The rod at the size's major diameter; any other refused. */
export async function threadOf(x: unknown, size: string, length: number) {
  const r = await kernel(), e = await exactOf(x, 'rod'), rod = e.rods[0]; if (!rod) throw new Error(`refused: ${e.name} has no plain rod to thread (a solid cylinder of one piece)`);
  const D = 2 * rod.r, key = size === 'auto' || !size ? Object.keys(ISO_METRIC).find((k) => Math.abs(Number(k.slice(1)) - D) < 1e-6) : size.toUpperCase();
  const row = key ? ISO_METRIC[key] : undefined; if (!row || !key) throw new Error(`refused: no M size ${size === 'auto' ? `is ${mm(D)} mm across` : `"${size}"`} in the ISO 261 table (${Object.keys(ISO_METRIC).join(', ')})`);
  const d = Number(key.slice(1)), P = row.p; if (Math.abs(d - D) > 1e-6) throw new Error(`refused: an ${key} thread goes on a rod ${d} mm across (its major diameter); ${e.name} is ${mm(D)} mm`);
  const L = length > 0 ? length : rod.h; if (L > rod.h + 1e-9) throw new Error(`refused: a thread ${L} mm long on a rod ${mm(rod.h)} mm long`);
  // (the section in the plane across the rod at its end: u, w across it, u × w its axis)
  const n = rod.d, u = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0])), w = cross(n, u), at = (th: number, rr: number): V3 => add(rod.a, add(mul(u, rr * Math.cos(th)), mul(w, rr * Math.sin(th))));
  const H = (Math.sqrt(3) / 2) * P, f = (5 * P) / 16, R0 = d / 2, r1 = R0 - (5 * H) / 8, br = [0, P / 8, P / 8 + f, P / 8 + f + P / 4, P].map((z) => (2 * Math.PI * z) / P);
  // (crest and root at one radius each: true arcs; each flank's radius linear in its angle (isoRadius), a spline through 13
  // of its points within 1e-5 mm of them: the M8's volume came within 0.004 % of its profile's own mean section times its
  // length, measured by tests/nexus/accept-p9-features.test.ts)
  const edges = [0, 1, 2, 3].map((k) => { const t0 = br[k]!, t1 = br[k + 1]!;
    if (k === 0 || k === 2) { const rr = k === 0 ? R0 : r1; return r.makeThreePointArc(at(t0, rr), at((t0 + t1) / 2, rr), at(t1, rr)); }
    const ps = Array.from({ length: 13 }, (_, i) => at(t0 + ((t1 - t0) * i) / 12, k === 1 ? R0 - (i / 12) * (R0 - r1) : r1 + (i / 12) * (R0 - r1)));
    return r.makeBSplineApproximation(ps, { tolerance: 1e-5, degMax: 3 }); });
  const wire = r.assembleWire(edges); let out: Solid, band: Solid | undefined, rest: Solid | undefined;
  try {
    const helical = r.twistExtrude(wire, (360 * L) / P, rod.a, mul(n, L));
    // (the threaded length cut out of the rod by a band TOL wider than it, a margin past its surface that reaches no other
    // piece the room put beside it, and the thread put in; a rod threaded all along, with nothing else, is its thread)
    band = r.makeCylinder(rod.r + TOL, L, rod.a, n); const c = e.solid.clone(); rest = c.cut(band); free(c);
    if (!(r.measureVolume(rest) > 1e-9 * r.measureVolume(e.solid))) out = helical; else { out = rest.fuse(helical); free(helical); }
  } catch (err) { throw new Error(`refused: the kernel could not sweep an ${key} thread on ${e.name} (${err instanceof Error ? err.message : 'it threw'})`); } finally { free(band); free(rest); }
  if (!valid(out)) { free(out); throw new Error(`refused: the ${key} thread swept on ${e.name} is not valid by the kernel's check`); }
  return { ...(await measured(made(e, out, { rods: [], lines: [] }), `${e.name} threaded ${key} × ${P} (ISO 261 coarse; ISO 68-1 profile) along ${mm(L)} mm`)), size: key, pitch: P, minor: d - (5 * H) / 4 };
}
/** A slot: a rectangle so wide swept so deep into a face, along an axis in it, through (length 0) or so long about the
 *  face's middle. A rectangle swept along a straight line is a box: the box is cut out. */
export async function slotOf(x: unknown, face: string, along: string, width: number, depth: number, length: number) {
  // (the tool runs 1 mm out past the face and the ends of a through slot: a margin so its faces are not the solid's, not
  // a size; what it takes is the solid's own)
  const e = await exactOf(x), f = faceOf(e.solid, face), k = 'xyz'.indexOf(along); if (k < 0 || k === f.k) throw new Error(`a slot along x, y or z in its face (not "${along}" in ${face})`);
  if (!(width > 0 && depth > 0)) throw new Error(`a slot so wide and so deep, both above zero (${width}, ${depth} mm)`);
  const r = await kernel(), [lo, hi] = bounds(e.solid), mid = mul(add(lo, hi), 0.5), j = 3 - f.k - k, out0: V3 = [0, 0, 0], sz: V3 = [0, 0, 0], inward = f.at === hi[f.k] ? -1 : 1;
  const span = hi[k]! - lo[k]!, L = length > 0 ? length : span + 2; sz[k] = L; sz[j] = width; sz[f.k] = depth + 1; out0[k] = mid[k]! - L / 2; out0[j] = mid[j]! - width / 2; out0[f.k] = inward < 0 ? f.at - depth : f.at - 1;
  const tool = r.makeBox(out0, add(out0, sz)), c = e.solid.clone(), out = c.cut(tool); free(c); free(tool);
  return measured(made(e, out), `${e.name}, a slot ${width} mm wide and ${depth} mm deep in its ${face} face along ${along}${length > 0 ? `, ${length} mm long` : ', through'}`);
}
/** A groove: a rectangle so wide and so deep turned round a rod's axis, so far along it from its first end (0: its middle). */
export async function grooveOf(x: unknown, width: number, depth: number, from: number) {
  const r = await kernel(), e = await exactOf(x, 'rod'), rod = e.rods[0]; if (!rod) throw new Error(`refused: ${e.name} has no plain rod to groove (a solid cylinder of one piece)`);
  if (!(width > 0 && depth > 0 && depth < rod.r)) throw new Error(`refused: a groove so wide, and deep less than the rod's radius ${mm(rod.r)} mm (${width}, ${depth} mm)`);
  const s = from > 0 ? from : (rod.h - width) / 2; if (s + width > rod.h + 1e-9) throw new Error(`refused: a groove ${width} mm wide ${s} mm from the end of a rod ${mm(rod.h)} mm long`);
  // (the ring a rectangle (r − depth to r, s to s + width) turned round the axis sweeps: the rod's cylinder less its core)
  // (the ring's outside TOL past the rod's surface: a margin that reaches no other piece the room put beside it, not a size)
  const a = add(rod.a, mul(rod.d, s)), outer = r.makeCylinder(rod.r + TOL, width, a, rod.d), core = r.makeCylinder(rod.r - depth, width, a, rod.d), ring = outer.cut(core); free(outer); free(core);
  const c = e.solid.clone(), out = c.cut(ring); free(c); free(ring);
  return measured(made(e, out), `${e.name}, a groove ${width} mm wide and ${depth} mm deep round its axis ${mm(s)} mm from its end`);
}
/** A rib: a plate so thick across the middle of the solid's bound, square to an axis, from its bottom (−y) up so high
 *  (0: its whole height), joining whatever faces it meets either side (a shelled box's walls); what of it falls inside
 *  the solid adds nothing. */
export async function ribOf(x: unknown, across: string, thick: number, height: number) {
  const r = await kernel(), e = await exactOf(x), k = 'xyz'.indexOf(across); if (k < 0 || k === 1) throw new Error(`a rib square to x or z (not "${across}")`);
  if (!(thick > 0)) throw new Error(`a rib so thick, above zero (${thick} mm)`);
  const [lo, hi] = bounds(e.solid), mid = mul(add(lo, hi), 0.5), a: V3 = [lo[0], lo[1], lo[2]], b: V3 = [hi[0], height > 0 ? lo[1] + height : hi[1], hi[2]]; a[k] = mid[k]! - thick / 2; b[k] = mid[k]! + thick / 2;
  const plate = r.makeBox(a, b), c = e.solid.clone(), out = c.fuse(plate); free(c); free(plate);
  return measured(made(e, out), `${e.name}, a rib ${thick} mm thick square to ${across}${height > 0 ? `, ${height} mm high` : ''}`);
}

// ---- as nodes ------------------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
const OUT = [P('solid', 'any', { label: 'the exact solid (mm, the kernel\'s): wire it into another feature' }), P('volume', 'number', { unit: 'm^3' }), P('kg', 'number', { unit: 'kg', label: 'its mass at the block\'s material' }), P('valid', 'boolean', { label: 'valid by the kernel\'s check' }), P('says', 'text')];
const IN = [P('block', 'any', { label: 'a block, a thing, or a feature\'s solid' })];
const REF = ['OpenCascade Technology 7.x, Modeling Algorithms user guide (Open Cascade SAS): fillets and chamfers, offsets and thick solids, Boolean operations', 'replicad and replicad-opencascadejs 1.1.0 (S. Genoud), LGPL-2.1'];
const CODES = [{ scheme: 'ACM CCS 2012', code: '10010147.10010371.10010396', label: 'Computing methodologies: shape modeling' }];
// (the nodes' own tests: a 40 × 10 × 40 mm steel plate and an M8 rod 20 mm long, as things; their volumes by hand)
const PLATE = { name: 'plate', shape: { box: [0.04, 0.01, 0.04] }, mat: 'steel-low' }, ROD = { name: 'rod', shape: { cyl: [0.004, 0.02] }, mat: 'steel-low' };
// (each node's tests are given it once all of them are registered: registering compares a new node with each one of the
// same ports by running that one's tests, and these all share their ports; a run here is the kernel's, loaded as the
// library loads, in a page too, for an answer the comparison drops (an answer that comes later is never the same))
const LATER: [BlockDef, BlockDef['tests']][] = [];
const node = (id: string, name: string, gloss: string, says: string, method: string, equations: string[], extra: Partial<BlockDef>, run: (i: Record<string, unknown>, s: Record<string, unknown>) => Promise<Record<string, unknown>>) => {
  const { tests, ...rest } = extra, def = { version: 1, by: 'built in', pure: true, id, name, kind: 'generator', ability: 'transform', domains: ['mechanical', 'manufacturing'], ports: { inputs: IN, outputs: OUT },
    spec: { gloss, discipline: 'mechanical.design', role: 'geometry operation', codes: CODES, model: { equations, class: 'analytical', time: 'steady', linear: false, method, references: REF } }, says,
    ...rest, run: (i, c) => run(i, c.set) } as BlockDef;
  register(def); LATER.push([def, tests]); };
const num = (s: Record<string, unknown>, k: string, d: number) => (s[k] === undefined || s[k] === '' ? d : Number(s[k]));
const SEL = 'Edges: all, face +y, line <port>, longer <mm>, shorter <mm>, along x|y|z';
node('solid.fillet', 'Fillet (exact)', 'Which edges are rounded, how much is taken off, and is it still a valid solid?', 'Edges of a block\'s exact solid rounded by OpenCascade to a radius (the edges a selector picks: all, those of a face of its bound, the rims round a line it offers, those longer or shorter than a length, those along an axis); a radius larger than the edges allow is refused with why. Its volume and mass by the kernel', 'BRepFilletAPI_MakeFillet on the selected edges (replicad fillet)', ['a box edge of length L rounded to r loses (1 − π/4) r² L'],
  { settings: [{ key: 'edges', label: SEL, type: 'text', default: 'along y' }, { key: 'radius', label: 'Radius, mm', type: 'number', default: 2, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { edges: 'along y', radius: 2 }, outputs: { valid: true, volume: (16000 - 4 * (1 - Math.PI / 4) * 4 * 10) / 1e9 }, rel: 1e-6 }] },
  (i, s) => blend(i.block, 'fillet', String(s.edges ?? 'all'), num(s, 'radius', 2)));
node('solid.chamfer', 'Chamfer (exact)', 'Which edges are bevelled, how much is taken off, and is it still a valid solid?', 'Edges of a block\'s exact solid bevelled by OpenCascade at equal distances (the edges a selector picks, as for a fillet); a distance larger than the edges allow is refused with why', 'BRepFilletAPI_MakeChamfer on the selected edges (replicad chamfer)', ['a box edge of length L chamfered d × d loses d² L / 2'],
  { settings: [{ key: 'edges', label: SEL, type: 'text', default: 'along y' }, { key: 'distance', label: 'Distance, mm', type: 'number', default: 2, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { edges: 'along y', distance: 2 }, outputs: { valid: true, volume: (16000 - 4 * 2 * 10) / 1e9 }, rel: 1e-6 }] },
  (i, s) => blend(i.block, 'chamfer', String(s.edges ?? 'all'), num(s, 'distance', 2)));
node('solid.shell', 'Shell (exact)', 'What is left when it is hollowed to a wall, open at a face?', 'A block\'s exact solid hollowed by OpenCascade to a wall of so many mm, a face of its bound left open (or none: closed inside)', 'BRepOffsetAPI_MakeThickSolid by join, the open faces removed (replicad shell); closed: its inside offset in and cut out', ['V = V_outer − V_inner'],
  { settings: [{ key: 'wall', label: 'Wall, mm', type: 'number', default: 2, unit: 'mm' }, { key: 'open', label: 'Open face (+y, −x, …; none)', type: 'text', default: '+y' }], tests: [{ inputs: { block: PLATE }, set: { wall: 2, open: '+y' }, outputs: { valid: true, volume: (16000 - 36 * 8 * 36) / 1e9 }, rel: 1e-6 }] },
  (i, s) => shellOf(i.block, num(s, 'wall', 2), String(s.open ?? '+y')));
node('solid.offset', 'Offset (exact)', 'What is it grown (or shrunk) by a distance all round?', 'A block\'s exact solid with every face moved out by a distance (in, below zero), its edges and corners rounded', 'BRepOffsetAPI_MakeOffsetShape by join, arc joins', ['a box a × b × c grown by t: abc + 2(ab + bc + ca) t + π(a + b + c) t² + (4/3) π t³ (Steiner)'],
  { settings: [{ key: 'distance', label: 'Distance, mm (below zero: in)', type: 'number', default: 1, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { distance: 1 }, outputs: { valid: true, volume: (16000 + 2 * (400 + 400 + 1600) + Math.PI * 90 + (4 / 3) * Math.PI) / 1e9 }, rel: 1e-6 }] },
  (i, s) => offsetOf(i.block, num(s, 'distance', 1)));
const two = { inputs: [P('a', 'any', { label: 'the first block (or thing, or solid): it weighs as this' }), P('b', 'any', { label: 'the second' })], outputs: OUT };
const BOX2 = { name: 'cube', shape: { box: [0.02, 0.02, 0.02] }, mat: 'steel-low' };
// (the three Booleans, each called with its id written out, so the docs' dater finds each one's definition)
const booleanNode = (id: string, op: 'fuse' | 'cut' | 'intersect', name: string, verb: string, eq: string, v: number) =>
  node(id, name, `What are two blocks ${verb}, as each is placed?`, `Two blocks' exact solids, as each is placed, ${verb} by OpenCascade's Boolean operations; it weighs as the first block's material`, 'BRepAlgoAPI (replicad fuse, cut, intersect)', [eq],
    { ports: two, tests: [{ inputs: { a: PLATE, b: BOX2 }, outputs: { valid: true, volume: v / 1e9 }, rel: 1e-6 }] }, (i) => boolean(i.a, i.b, op));
booleanNode('solid.union', 'fuse', 'Union (exact)', 'joined', 'V = V_a + V_b − V_a∩b', 20000);
booleanNode('solid.cut', 'cut', 'Cut (exact)', 'the second taken from the first', 'V = V_a − V_a∩b', 12000);
booleanNode('solid.intersect', 'intersect', 'Intersect (exact)', 'what both hold', 'V = V_a∩b', 4000);
node('solid.mirror', 'Mirror (exact)', 'What is its image in a plane of its own frame?', 'A block\'s exact solid mirrored in a plane (yz, xz or xy) through its bound\'s middle, the frame the room makes it about; its image alone, or joined to it', 'gp_Trsf mirror (replicad mirror)', ['V_image = V'],
  { settings: [{ key: 'plane', label: 'Plane (yz, xz, xy)', type: 'choice', choices: ['yz', 'xz', 'xy'], default: 'yz' }, { key: 'keep', label: 'Keep', type: 'choice', choices: ['image', 'both'], default: 'image' }], tests: [{ inputs: { block: PLATE }, set: { plane: 'yz' }, outputs: { valid: true, volume: 16000 / 1e9 }, rel: 1e-6 }] },
  (i, s) => mirrorOf(i.block, String(s.plane ?? 'yz'), String(s.keep ?? 'image')));
node('solid.pattern', 'Pattern (exact)', 'What are n copies of it, in a row or round an axis, as one solid?', 'n copies of a block\'s exact solid as one solid: along an axis so far apart (linear), or turned round an axis parallel to x, y or z so far from its middle (circular); copies that meet are fused', 'translations or rotations, fused by BRepAlgoAPI_Fuse', ['n copies apart: V = n V₁'],
  { settings: [{ key: 'kind', label: 'Kind', type: 'choice', choices: ['linear', 'circular'], default: 'linear' }, { key: 'n', label: 'Copies', type: 'number', default: 3 }, { key: 'axis', label: 'Axis (x, y, z)', type: 'choice', choices: ['x', 'y', 'z'], default: 'x' }, { key: 'step', label: 'Apart (linear) or radius (circular), mm', type: 'number', default: 50, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { kind: 'linear', n: 3, axis: 'x', step: 50 }, outputs: { valid: true, volume: 48000 / 1e9 }, rel: 1e-6 }] },
  (i, s) => patternOf(i.block, String(s.kind ?? 'linear'), num(s, 'n', 3), String(s.axis ?? 'x'), num(s, 'step', 50)));
node('solid.thread', 'Thread (exact, ISO 68-1)', 'What is a rod with an external metric thread on it, and its volume?', 'An external single-start metric thread on a rod\'s cylinder: the ISO 68-1 basic profile at its M size\'s coarse pitch (ISO 261, the parts table), swept up the axis once a pitch; the rod must be at the size\'s major diameter (auto: the size it is). Its volume lies between its minor and major cylinders', 'the section across the rod drawn from the profile (crest and root arcs, flank splines) and twist-swept along the axis (BRepOffsetAPI_MakePipeShell with a helical auxiliary spine, replicad twistExtrude)', ['H = (√3/2) P', 'd₁ = d − 5H/4 (the basic minor diameter)', 'π d₁² L / 4 < V < π d² L / 4'],
  { settings: [{ key: 'size', label: 'M size (auto: the rod\'s)', type: 'text', default: 'auto' }, { key: 'length', label: 'Threaded length, mm (0: all of it)', type: 'number', default: 0, unit: 'mm' }], tests: [{ inputs: { block: ROD }, set: { size: 'auto' }, outputs: { valid: true, size: 'M8', pitch: 1.25 } }] },
  (i, s) => threadOf(i.block, String(s.size ?? 'auto'), num(s, 'length', 0)));
node('solid.slot', 'Slot (exact)', 'What is left when a slot is cut into a face?', 'A slot cut into a face of a block\'s exact solid: a rectangle so wide swept so deep along an axis in that face, through or so long about its middle', 'a box (the rectangle swept along a straight line) cut by BRepAlgoAPI_Cut', ['a through slot w × d along L takes w d L'],
  { settings: [{ key: 'face', label: 'Face (+y, −x, …)', type: 'text', default: '+y' }, { key: 'along', label: 'Along (x, y, z)', type: 'choice', choices: ['x', 'y', 'z'], default: 'x' }, { key: 'width', label: 'Width, mm', type: 'number', default: 6, unit: 'mm' }, { key: 'depth', label: 'Depth, mm', type: 'number', default: 3, unit: 'mm' }, { key: 'length', label: 'Length, mm (0: through)', type: 'number', default: 0, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { face: '+y', along: 'x', width: 6, depth: 3 }, outputs: { valid: true, volume: (16000 - 6 * 3 * 40) / 1e9 }, rel: 1e-6 }] },
  (i, s) => slotOf(i.block, String(s.face ?? '+y'), String(s.along ?? 'x'), num(s, 'width', 6), num(s, 'depth', 3), num(s, 'length', 0)));
node('solid.groove', 'Groove (exact)', 'What is left when a groove is turned round a rod?', 'A groove round a rod\'s axis: a rectangle so wide and so deep turned round it, so far from its first end (0: its middle)', 'the ring the rectangle sweeps round the axis, cut by BRepAlgoAPI_Cut', ['a groove w wide, t deep on radius R takes π (R² − (R − t)²) w'],
  { settings: [{ key: 'width', label: 'Width, mm', type: 'number', default: 2, unit: 'mm' }, { key: 'depth', label: 'Depth, mm', type: 'number', default: 1, unit: 'mm' }, { key: 'from', label: 'From its first end, mm (0: the middle)', type: 'number', default: 0, unit: 'mm' }], tests: [{ inputs: { block: ROD }, set: { width: 2, depth: 1 }, outputs: { valid: true, volume: (Math.PI * 16 * 20 - Math.PI * (16 - 9) * 2) / 1e9 }, rel: 1e-6 }] },
  (i, s) => grooveOf(i.block, num(s, 'width', 2), num(s, 'depth', 1), num(s, 'from', 0)));
node('solid.rib', 'Rib (exact)', 'What is it with a plate across it between its faces?', 'A rib: a plate so thick across the middle of a block\'s exact solid, square to x or z, from its bottom up so high, fused with the faces it meets either side (a shelled box\'s walls)', 'a box fused by BRepAlgoAPI_Fuse', ['V = V₀ + the plate\'s volume outside the solid'],
  { settings: [{ key: 'across', label: 'Square to (x, z)', type: 'choice', choices: ['x', 'z'], default: 'x' }, { key: 'thickness', label: 'Thickness, mm', type: 'number', default: 2, unit: 'mm' }, { key: 'height', label: 'Height, mm (0: all of it)', type: 'number', default: 0, unit: 'mm' }], tests: [{ inputs: { block: PLATE }, set: { across: 'x', thickness: 2 }, outputs: { valid: true, volume: 16000 / 1e9 }, rel: 1e-6 }] },
  (i, s) => ribOf(i.block, String(s.across ?? 'x'), num(s, 'thickness', 2), num(s, 'height', 0)));
for (const [def, tests] of LATER) if (tests) def.tests = tests;
