// What may not come near what: the rule a made thing is held to, piece by piece, on its surfaces as drawn.
//
//   heat           a hot piece (Part.hot, its surface's temperature) heats what is near it, the heat falling off with
//                  distance; no piece is where it is hotter than its material stands (MAX_SERVICE): rubber, nylon,
//                  polypropylene, foam, wiring kept back from an exhaust, a turbo, a catalytic converter
//
// Nothing here checks for overlap (decision 0021, the user, 2026-11-02: "No nothing should be checked for overlap it
// shouldn't be possible"): the interference and clearance rules, the check through a motion and their excuses are gone.
// Each finding names the two pieces, how close, and what would put it right.

import * as THREE from 'three';
import type { Part } from '../kits';
import { layout, type Node } from './space';
import { leastDistance, trisOf, type Tris, type TriMesh } from './critic';
import { leafGeometry } from '../view/kit3d';
import { graphOf, groupsOf, sliced, temperaturesOf } from '../graph';
import { matterOf } from '../matter';

export { MAX_SERVICE, HEAT_FALLOFF, AMBIENT } from './heat-limits';
import { MAX_SERVICE, HEAT_FALLOFF, AMBIENT } from './heat-limits';

export interface Finding { rule: 'heat'; a: string; b: string; /** where each is in the tree checked ("/12/3": child 12, then its child 3), so a repair can find it */ pa?: string; pb?: string; says: string; depth?: number; gap?: number; need?: number; at?: [number, number, number]; /** the nearest point on a, where b's nearest is `at` (heat) */ from?: [number, number, number] }
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
// (the nearest holder it is one piece with, or the thing it is a fastener of: what it may meet)
const ownerOf = (n: Node): Node => { let x = n; while (x.parent && (x.p.one || !x.p.item)) x = x.parent; return x; };
// (the unit made whole that it is in, under the thing checked: a chain, a bearing, a bought part fitted as it comes; its
// own pieces are its maker's to fit, not the build's)
const unitOf = (n: Node): Node | null => { let u: Node | null = null; for (let x: Node | null = n; x && x.parent; x = x.parent) if (x.p.sealed) u = x; return u; };
const linked = (a: Mesh3, b: Mesh3) => { const A = ownerOf(a.node), B = ownerOf(b.node), ua = unitOf(a.node); if (ua && ua === unitOf(b.node)) return true; return A === B || a.node.path.startsWith(B.path + '/') || b.node.path.startsWith(A.path + '/'); };
// (a piece and everything it is in, by name: what `only` is matched against)
const upFrom = (n: Node): Part[] => { const o: Part[] = []; for (let x: Node | null = n; x; x = x.parent) o.push(x.p); return o; };
const names = (n: Node): Set<string> => new Set(upFrom(n).map((p) => p.name));
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
/** The heat rule on a thing's surfaces as drawn, across the air and conducted… or only between what is named like `only`
 *  (a piece of it, or anything it is in), or what is under these places in the tree ("/12/3"), and everything. */
export function rulesOf(root: Part, o: { only?: RegExp; within?: string[] } = {}): { findings: Finding[]; pieces: number } {
  const all = trianglesOf(root), w = o.within, on = o.only ? (m: Mesh3) => [...names(m.node)].some((n) => o.only!.test(n)) : w ? (m: Mesh3) => w.some((x) => m.node.path === x || m.node.path.startsWith(x + '/')) : null;
  if (on) return { findings: heat(all, (a, b) => on(a) || on(b)), pieces: all.filter(on).length };
  const near = heat(all);
  return { findings: [...near, ...conducted(root, near)], pieces: all.length };
}
