// What may not run into, touch or come near what: the rules a made thing is held to, piece by piece, on the surfaces as
// drawn (triangle against triangle: the critic's meshClashes and leastDistance), not on boxes round them.
//
//   interference   no two pieces cross, unless they are one piece (a casting's walls, a pressing's patches), one is
//                  said to pass through the other (an axle through its hub), one is a fastener in what it fastens (its
//                  hole not cut in what it holds), or one sits in a bore cut for it (a piston in its cylinder)
//   clearance      a piece that moves or must breathe (a belt, a fan's blades, a chain) keeps the gap it says
//                  (Part.clear) from everything but what it runs on
//   heat           a hot piece (Part.hot, its surface's temperature) heats what is near it, the heat falling off with
//                  distance; no piece is where it is hotter than its material stands (MAX_SERVICE): rubber, nylon,
//                  polypropylene, foam, wiring kept back from an exhaust, a turbo, a catalytic converter
//
// Each finding names the two pieces, how deep or how close, and what would put it right.

import * as THREE from 'three';
import type { Part } from '../kits';
import { contacts, layout, type Node } from './space';
import { leastDistance, meshClashes, trisOf, type Tris, type TriMesh } from './critic';
import { leafGeometry } from '../view/kit3d';
import { graphOf, groupsOf, sliced, temperaturesOf } from '../graph';
import { matterOf } from '../matter';

export { MAX_SERVICE, HEAT_FALLOFF, AMBIENT } from './heat-limits';
import { MAX_SERVICE, HEAT_FALLOFF, AMBIENT } from './heat-limits';

export interface Finding { rule: 'interference' | 'clearance' | 'heat'; a: string; b: string; /** where each is in the tree checked ("/12/3": child 12, then its child 3), so a repair can find it */ pa?: string; pb?: string; says: string; depth?: number; gap?: number; need?: number; at?: [number, number, number]; /** the nearest point on a, where b's nearest is `at` (heat) */ from?: [number, number, number] }
interface Mesh3 extends TriMesh { p: Part; node: Node; tris?: Tris }
const T = (m: Mesh3): Tris => (m.tris ??= trisOf(m));

/** Every drawn piece of a thing as its triangles in the thing's frame, with what the rules read from it. */
export function trianglesOf(root: Part): Mesh3[] {
  const out: Mesh3[] = [], v = new THREE.Vector3();
  for (const n of layout(root)) {
    // (fine geometry tested by the shape that encloses it: what clears that clears it)
    if (!n.p.shape) continue; const g = leafGeometry(n.p.envelope ? { ...n.p, shape: n.p.envelope, cuts: undefined } : n.p); if (!g) continue;
    const P = g.getAttribute('position'), pos = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(n.m); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    const idx = g.getIndex(); out.push({ name: n.p.name, path: n.path, pos, ...(idx ? { idx: idx.array } : {}), mat: n.p.mat, ...(n.p.passes ? { passes: n.p.passes } : {}), ...(n.p.joins ? { joins: n.p.joins } : {}), p: n.p, node: n });
  }
  return out;
}
// (a pin is a fastener only as a dowel, a split pin or a cotter: a wrist pin, a crank pin or a hinge pin is a part in its own right)
const fastenerRe = /\b(bolt|screw|stud|nut|rivet|washer|dowel|split pin|cotter pin|keeper|clip|circlip|spider|plug)\b/i;
// (the nearest holder it is one piece with, or the thing it is a fastener of: what it may meet)
const ownerOf = (n: Node): Node => { let x = n; while (x.parent && (x.p.one || !x.p.item)) x = x.parent; return x; };
// (the unit made whole that it is in, under the thing checked: a chain, a bearing, a bought part fitted as it comes; its
// own pieces are its maker's to fit, not the build's)
const unitOf = (n: Node): Node | null => { let u: Node | null = null; for (let x: Node | null = n; x && x.parent; x = x.parent) if (x.p.sealed) u = x; return u; };
const linked = (a: Mesh3, b: Mesh3) => { const A = ownerOf(a.node), B = ownerOf(b.node), ua = unitOf(a.node); if (ua && ua === unitOf(b.node)) return true; return A === B || a.node.path.startsWith(B.path + '/') || b.node.path.startsWith(A.path + '/'); };
const fastens = (a: Mesh3, b: Mesh3) => fastenerRe.test(a.name) || fastenerRe.test(b.name) || fastenerRe.test(ownerOf(a.node).p.name) || fastenerRe.test(ownerOf(b.node).p.name);
// (a guest in a hole cut in its host, on the hole's axis and no wider than it: a valve in its seat's bore, a piston in its
// cylinder, a bolt in its hole; it cannot run into the host, and is not tried)
const inCut = (host: Mesh3, guest: Mesh3): boolean => {
  if (!host.p.cuts?.length || !guest.node.obb) return false;
  const inv = host.node.m.clone().invert(), c = guest.node.obb.c.clone().applyMatrix4(inv);
  return host.p.cuts.some((k) => { const ax = new THREE.Vector3(...k.dir).normalize(), rel = c.clone().sub(new THREE.Vector3(...k.at)), along = rel.dot(ax), off = rel.clone().sub(ax.clone().multiplyScalar(along)).length();
    const half = guest.node.obb!.h, u = guest.node.obb!.u, wdir = ax.clone().transformDirection(host.node.m), widths = [0, 1, 2].filter((i) => Math.abs(u[i]!.dot(wdir)) < 0.7).map((i) => half[i]!);
    const rg = widths.length ? Math.max(...widths) : Math.min(...half); return off + rg <= k.r * 1.08 + 0.0005; });
};
// (what a piece or anything it is in says passes through it or is joined to it, against the names of the other piece and
// of what it is in: a sprocket says the chain's links pass it, whichever of its pieces meets whichever of theirs)
const upFrom = (n: Node): Part[] => { const o: Part[] = []; for (let x: Node | null = n; x; x = x.parent) o.push(x.p); return o; };
const names = (n: Node): Set<string> => new Set(upFrom(n).map((p) => p.name));
const tells = (a: Node, b: Node): boolean => { const nb = names(b); return upFrom(a).some((p) => p.passes?.some((x) => nb.has(x)) || p.joins?.some((x) => nb.has(x))); };
const said = (a: Mesh3, b: Mesh3) => inCut(a, b) || inCut(b, a) || tells(a.node, b.node) || tells(b.node, a.node);

/** What runs into what: pieces whose surfaces cross, that are not one piece, not fitted one through the other, not a
 *  fastener in what it fastens. */
/** The pairs whose oriented boxes press into each other and that the rules do not excuse: what is tried exactly. */
export function candidates(ms: Mesh3[]): [Mesh3, Mesh3][] {
  const byNode = new Map<Node, Mesh3>(); for (const m of ms) byNode.set(m.node, m);
  return contacts(ms.map((m) => m.node)).filter((c) => c.depth > 0.0005).map((c) => [byNode.get(c.a)!, byNode.get(c.b)!] as [Mesh3, Mesh3]).filter(([a, b]) => a && b && !linked(a, b) && !fastens(a, b) && !said(a, b));
}
const CAST_ROUND = /mould-compound|potting|encapsula/;
/** Whether a point is inside a closed surface: a ray from it, slightly skewed off the axes so it misses edges, crosses
 *  the surface an odd number of times (Möller–Trumbore for each crossing). An open surface has no inside. */
function inside(p: [number, number, number], t: Tris): boolean {
  if (!t.closed || p[0] < t.lo[0] || p[1] < t.lo[1] || p[2] < t.lo[2] || p[0] > t.hi[0] || p[1] > t.hi[1] || p[2] > t.hi[2]) return false;
  const d = [0.99984, 0.01313, 0.01211], v = t.v; let n = 0;
  for (let k = 0; k < t.n; k++) { const o = k * 9, e1 = [v[o + 3]! - v[o]!, v[o + 4]! - v[o + 1]!, v[o + 5]! - v[o + 2]!], e2 = [v[o + 6]! - v[o]!, v[o + 7]! - v[o + 1]!, v[o + 8]! - v[o + 2]!];
    const h = [d[1]! * e2[2]! - d[2]! * e2[1]!, d[2]! * e2[0]! - d[0]! * e2[2]!, d[0]! * e2[1]! - d[1]! * e2[0]!], det = e1[0]! * h[0]! + e1[1]! * h[1]! + e1[2]! * h[2]!; if (Math.abs(det) < 1e-18) continue;
    const s0 = [p[0] - v[o]!, p[1] - v[o + 1]!, p[2] - v[o + 2]!], u = (s0[0]! * h[0]! + s0[1]! * h[1]! + s0[2]! * h[2]!) / det; if (u < 0 || u > 1) continue;
    const q = [s0[1]! * e1[2]! - s0[2]! * e1[1]!, s0[2]! * e1[0]! - s0[0]! * e1[2]!, s0[0]! * e1[1]! - s0[1]! * e1[0]!], w = (d[0]! * q[0]! + d[1]! * q[1]! + d[2]! * q[2]!) / det; if (w < 0 || u + w > 1) continue;
    if ((e2[0]! * q[0]! + e2[1]! * q[1]! + e2[2]! * q[2]!) / det > 0) n++; }
  return n % 2 === 1;
}
/** Whether a lies within b: three of its points, spread through its triangles, each inside b's closed surface. */
function within(a: Mesh3, b: Mesh3): boolean {
  // (inside a hollow part, a shell, is in its hollow: only crossing its wall is a fault, and the triangles see that)
  const ta = T(a), tb = T(b); if (!tb.closed || !ta.n || b.p.shell) return false;
  return [0, Math.floor(ta.n / 3), Math.floor((2 * ta.n) / 3)].every((k) => { const o = k * 9, v = ta.v; return inside([(v[o]! + v[o + 3]! + v[o + 6]!) / 3, (v[o + 1]! + v[o + 4]! + v[o + 7]!) / 3, (v[o + 2]! + v[o + 5]! + v[o + 8]!) / 3], tb); });
}
export function interference(ms: Mesh3[], o: { touch?: number; pair?: (a: Mesh3, b: Mesh3) => boolean } = {}): Finding[] {
  const out: Finding[] = [], seen = new Set<string>(), tol = o.touch ?? 0.0002;
  // (first the pieces' oriented boxes, fast: only pairs whose boxes press into each other by more than half a millimetre,
  // and that the rules do not excuse, are tried on their triangles)
  const cands = candidates(ms).filter(([a, b]) => !o.pair || o.pair(a, b));
  for (const [a, b] of cands) {
    const key = [ownerOf(a.node).path, ownerOf(b.node).path].sort().join('|'); if (seen.has(key)) continue;
    const c = meshClashes([a, b], { touch: tol, edge: 'scaled', fused: () => false }).find((x) => x.kind === 'through');
    // (no surface crossing, and yet one inside the other: a triangle test cannot see that, so its points are tried)
    // (save inside what is cast round it: a moulding or a potting compound holds its wires and its die by being poured on them)
    const inner = c ? null : within(a, b) ? [a, b] : within(b, a) ? [b, a] : null; if (!c && (!inner || CAST_ROUND.test(inner[1]!.p.item ?? ''))) continue;
    seen.add(key);
    out.push({ rule: 'interference', a: ownerOf(a.node).p.name, b: ownerOf(b.node).p.name, pa: ownerOf(a.node).path, pb: ownerOf(b.node).path, says: inner ? `the ${inner[0]!.name} is inside the ${inner[1]!.name}` : `the ${a.name} runs into the ${b.name}`, ...(c?.at ? { at: c.at as [number, number, number] } : {}) });
  }
  return out;
}
/** Every pair the rules try for interference, and what the triangle test says of each: for setting beside another
 *  engine's verdict (brep.ts, exact booleans), each piece by its place in the tree. */
export function interferencePairs(ms: Mesh3[], touch = 0.0002): { a: string; b: string; pa: string; pb: string; owners: [string, string]; through: boolean }[] {
  return candidates(ms).map(([a, b]) => ({ a: a.name, b: b.name, pa: a.node.path, pb: b.node.path, owners: [ownerOf(a.node).p.name, ownerOf(b.node).p.name] as [string, string], through: meshClashes([a, b], { touch, edge: 'scaled', fused: () => false }).some((x) => x.kind === 'through') }));
}
/** The gaps kept: a piece that says its clearance (Part.clear) closer than that to anything it does not run on. */
export function clearances(ms: Mesh3[], pair: (a: Mesh3, b: Mesh3) => boolean = () => true): Finding[] {
  const out: Finding[] = [];
  for (const a of ms) {
    const need = a.p.clear ?? (a.node.parent?.p.clear); if (!need) continue;
    for (const b of ms) {
      if (b === a || !pair(a, b) || linked(a, b) || said(a, b) || (a.p.runsOn ?? a.node.parent?.p.runsOn ?? []).some((r) => b.name.includes(r) || ownerOf(b.node).p.name.includes(r))) continue;
      const d = leastDistance(T(a), T(b), need); if (d && d.d < need) out.push({ rule: 'clearance', a: ownerOf(a.node).p.name, b: ownerOf(b.node).p.name, pa: ownerOf(a.node).path, pb: ownerOf(b.node).path, gap: d.d, need, says: `the ${a.name} is ${(d.d * 1000).toFixed(1)} mm from the ${b.name}: it needs ${(need * 1000).toFixed(0)} mm` });
    }
  }
  return out;
}
/** What is too near something hot for its material: at the least distance between them, the hot piece's heat (its
 *  excess over the air falling off by HEAT_FALLOFF) against what the other's material stands. Says how far back it
 *  needs to be. */
// (what heat harms: polymers, rubbers, foams, fabrics and the metals that melt or soften low (lead, solder, zinc alloy);
// a steel, iron or aluminium part near a manifold is cooled by what it is bolted to and is the engine's own business)
/** What heat harms: the polymers, rubbers, foams, fabrics and low-melting metals (each with its limit in MAX_SERVICE). */
export const HARMED = /^(rubber|nr|nbr|epdm|neoprene|silicone|fkm|pu|foam|pet|cotton|paper|pp|pe|xlpe|abs|pvc|pc|pmma|nylon|pbt|pom|ptfe|epoxy|phenolic|fibreglass|lead|solder|zamak)$/;
/** Whether a straight line between two points passes through a solid piece other than the two (a shield between them:
 *  the head between an exhaust port and a valve's seal, a heat shield's sheet, a cover over a gasket). Any opaque piece
 *  stops what radiates; the piece that stops it is held to its own limit in its turn. Glass lets it through. */
function shielded(p: THREE.Vector3, q: THREE.Vector3, ms: Mesh3[], skip: Mesh3[]): boolean {
  const dir = q.clone().sub(p), len = dir.length(); if (len < 1e-4) return false; dir.normalize();
  const ray = new THREE.Ray(p, dir), box = new THREE.Box3().setFromPoints([p, q]).expandByScalar(1e-4), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3();
  for (const m of ms) {
    if (skip.includes(m) || /glass/.test(m.mat ?? '')) continue;
    const t = T(m); if (t.lo[0] > box.max.x || t.hi[0] < box.min.x || t.lo[1] > box.max.y || t.hi[1] < box.min.y || t.lo[2] > box.max.z || t.hi[2] < box.min.z) continue;
    for (let i = 0; i < t.n; i++) { const v = t.v, o = i * 9; a.set(v[o]!, v[o + 1]!, v[o + 2]!); b.set(v[o + 3]!, v[o + 4]!, v[o + 5]!); c.set(v[o + 6]!, v[o + 7]!, v[o + 8]!); if (ray.intersectTriangle(a, b, c, false, hit) && hit.distanceTo(p) < len - 1e-4 && hit.distanceTo(p) > 1e-4) return true; }
  }
  return false;
}
export function heat(ms: Mesh3[], pair: (a: Mesh3, b: Mesh3) => boolean = () => true): Finding[] {
  const out: Finding[] = [], hot = ms.filter((m) => (m.p.hot ?? m.node.parent?.p.hot ?? 0) > AMBIENT);
  for (const h of hot) {
    const Th = (h.p.hot ?? h.node.parent?.p.hot)!;
    for (const b of ms) {
      if (b === h || linked(h, b) || !HARMED.test(b.mat ?? '') || !pair(h, b)) continue; const lim = MAX_SERVICE[b.mat ?? ''] ?? Infinity; if (lim >= Th) continue;
      const need = HEAT_FALLOFF * Math.log((Th - AMBIENT) / Math.max(1, lim - AMBIENT)), d = leastDistance(T(h), T(b), need);
      if (!d || d.d >= need) continue;
      // (in the open between them, the heat reaches it; behind a metal wall (the head, a heat shield), it does not)
      if (shielded(new THREE.Vector3(...d.p), new THREE.Vector3(...d.q), ms, [h, b])) continue;
      out.push({ rule: 'heat', a: ownerOf(h.node).p.name, b: ownerOf(b.node).p.name, pa: ownerOf(h.node).path, pb: ownerOf(b.node).path, gap: d.d, need, at: d.q as [number, number, number], from: d.p as [number, number, number], says: `the ${b.name} (${b.mat}, good to about ${lim} °C) is ${(d.d * 1000).toFixed(0)} mm from the ${h.name} at about ${Th} °C, in the open: about ${Math.round(AMBIENT + (Th - AMBIENT) * Math.exp(-d.d / HEAT_FALLOFF))} °C there; it needs ${(need * 1000).toFixed(0)} mm, or a heat shield between` });
    }
  }
  return out;
}
/** What heat conducted harms (step H of docs/REALITY.md, section 6): the heat gate above judges what a hot piece's heat
 *  reaches across the air; a piece touching it, or touching what touches it, is reached through them. Each piece's steady
 *  temperature from the thing's contact graph (`temperaturesOf`: hot pieces held, heat conducted by Fourier's law through
 *  each contact, every piece losing to the air from its surface); a piece hotter than its material stands is said, with
 *  the hot piece its heat comes from. */
export function conducted(root: Part, already: Finding[] = []): Finding[] {
  // (each piece cut into slices along its longest side, so a long plate is hot by the exhaust and cool at its far end,
  // not one temperature over it all: step G)
  const g = sliced(graphOf(root), 8), hotOf = (n: Node) => n.p.hot ?? n.parent?.p.hot;
  const hot = new Map<number, number>(); g.pieces.forEach((p, i) => { const t = hotOf(p.node); if (t !== undefined && t > AMBIENT) hot.set(i, t); });
  if (!hot.size) return [];
  const { T } = temperaturesOf(g, hot, AMBIENT), groups = groupsOf(g), groupOf = new Map<number, number[]>(); for (const gr of groups) for (const i of gr) groupOf.set(i, gr);
  // (a piece whose conductivity is not known carries nothing in the network, so it would read the air's temperature:
  // never safe on that account; it is judged at the face it touches, as hot as the hottest thing it touches, and said)
  const face = new Map<number, number>(); for (const e of g.edges) { face.set(e.a, Math.max(face.get(e.a) ?? -Infinity, T[e.b]!)); face.set(e.b, Math.max(face.get(e.b) ?? -Infinity, T[e.a]!)); }
  const unknownK = (m: string | null) => !m || !(matterOf(m).props.find((x) => x.key === 'k')?.value! > 0);
  const said = new Set(already.filter((f) => f.rule === 'heat').map((f) => f.pb)), out: Finding[] = [];
  g.pieces.forEach((p, i) => {
    const mat = p.mat ?? ''; if (hot.has(i) || !HARMED.test(mat)) return; const lim = MAX_SERVICE[mat] ?? Infinity, atFace = unknownK(p.mat) && face.has(i), Ti = atFace ? Math.max(T[i]!, face.get(i)!) : T[i]!; if (!(Ti > lim)) return;
    const owner = ownerOf(p.node); if (said.has(owner.path)) return;
    const src = (groupOf.get(i) ?? []).filter((j) => hot.has(j)).sort((x, y) => hot.get(y)! - hot.get(x)!)[0]; if (src === undefined) return;
    // (named by what owns it, unless that is the whole thing checked: then by the piece itself)
    const sp = g.pieces[src]!.node, so0 = ownerOf(sp), so = so0.parent ? so0 : sp; said.add(owner.path);
    out.push({ rule: 'heat', a: so.p.name, b: owner.p.name, pa: so.path, pb: owner.path, at: p.node.box!.getCenter(new THREE.Vector3()).toArray() as [number, number, number],
      says: `the ${p.name} (${mat}) reaches ${Ti.toFixed(0)} °C${atFace ? ' at the face it touches (its own conductivity not known)' : ''} through what it touches from the ${so.p.name} at ${hot.get(src)!.toFixed(0)} °C, over the ${lim} °C ${mat} stands: conducted, not across the air` });
  });
  return out;
}
/** All three, on a thing's surfaces as drawn. */
/** …or only between what is named like `only` (a piece of it, or anything it is in) and everything: what moves, at one
 *  place in its motion. */
export function rulesOf(root: Part, o: { touch?: number; only?: RegExp; /** or only what is under these places in the tree ("/12/3") */ within?: string[]; /** only what moves is tried (a pose in a motion): heat and clearance as at rest */ motion?: boolean } = {}): { findings: Finding[]; pieces: number } {
  const all = trianglesOf(root), w = o.within, on = o.only ? (m: Mesh3) => [...names(m.node)].some((n) => o.only!.test(n)) : w ? (m: Mesh3) => w.some((x) => m.node.path === x || m.node.path.startsWith(x + '/')) : null, ms = all;
  if (on) { const pair = (a: Mesh3, b: Mesh3) => on(a) || on(b), res = [...interference(ms, { ...o, pair }), ...(o.motion ? [] : [...clearances(ms, pair), ...heat(ms, pair)])]; return { findings: res, pieces: all.filter(on).length }; }
  const near = heat(ms);
  return { findings: [...interference(ms, o), ...clearances(ms), ...near, ...conducted(root, near)], pieces: ms.length };
}

/** The rules through a motion: the thing made at each of `steps` places through it (a crank turned through a revolution,
 *  a door through its swing), only what moves tried against everything at each; each finding with where it happened. */
export function rulesThrough(make: (t: number) => Part, steps: number, only: RegExp, o: { touch?: number } = {}): { findings: (Finding & { t: number })[]; tried: number } {
  const out: (Finding & { t: number })[] = [], seen = new Set<string>();
  for (let k = 0; k < steps; k++) { const t = k / steps; for (const f of rulesOf(make(t), { ...o, only, motion: true }).findings) { const key = `${f.a}|${f.b}|${f.says}`; if (seen.has(key)) continue; seen.add(key); out.push({ ...f, t }); } }
  return { findings: out, tried: steps };
}
