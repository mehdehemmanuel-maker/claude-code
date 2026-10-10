// Where every part of a made thing is, in the world, and which parts touch. Each part's turn and place is composed down
// from its holders; its shape's box in its own frame (standing on its origin where it grows from its base) is placed as
// an oriented box: its middle, its three axes, its half sizes. Two parts touch when their oriented boxes come within a
// tolerance (the larger of 2 mm and 1 % of the smaller's least side) by the separating-axis test (the 15 axes of two
// boxes: Gottschalk, Lin and Manocha 1996), so a turned arm touches only what it really meets. A contact has the axis
// they meet across (the one they press least far into each other along), how far, and, in either part's own frame,
// the patch where they overlap: what a joint is laid out on.
//
// Candidate pairs are found first by sweeping the world-aligned bounds along x, so a thing of thousands of parts is not
// every pair. A holder with no shape of its own (a wheel's group) has the bounds of what it holds.

import * as THREE from 'three';
import type { Part, Shape } from '../parts/kits';
import { boundsOf, piecesOf, type LocalBox } from '../machines/form';

export interface OBB { c: THREE.Vector3; u: [THREE.Vector3, THREE.Vector3, THREE.Vector3]; h: [number, number, number] }
export interface Node { p: Part; parent: Node | null; kids: Node[]; m: THREE.Matrix4; box: THREE.Box3 | null; obb: OBB | null; /** where a shape is long and bent or swept (a tube, a loft), the boxes that cover it tightly; else its one box */ pieces: OBB[]; local: THREE.Box3 | null; sub: THREE.Box3 | null; depth: number; path: string }
export interface Contact { a: Node; b: Node; normal: THREE.Vector3; depth: number; mid: THREE.Vector3; /** the pieces of each that met */ pa: OBB; pb: OBB }

/** A shape's box in its part's own frame (cylinders and capsules along y, a torus round z, as they are drawn). */
export function shapeBox(s: Shape | undefined, base?: boolean): THREE.Box3 | null {
  if (!s) return null; let min: THREE.Vector3, max: THREE.Vector3;
  if ('box' in s) { const [w, h, d] = s.box; min = new THREE.Vector3(-w / 2, -h / 2, -d / 2); max = new THREE.Vector3(w / 2, h / 2, d / 2); }
  else if ('cyl' in s) { const R = Math.max(s.cyl[0], s.cyl[2] ?? s.cyl[0]), h = s.cyl[1]; min = new THREE.Vector3(-R, -h / 2, -R); max = new THREE.Vector3(R, h / 2, R); }
  else if ('sphere' in s) { min = new THREE.Vector3().setScalar(-s.sphere); max = new THREE.Vector3().setScalar(s.sphere); }
  else if ('cone' in s) { const [r, h] = s.cone; min = new THREE.Vector3(-r, -h / 2, -r); max = new THREE.Vector3(r, h / 2, r); }
  else if ('torus' in s) { const [R, r] = s.torus; min = new THREE.Vector3(-R - r, -R - r, -r); max = new THREE.Vector3(R + r, R + r, r); }
  else if ('capsule' in s) { const [r, h] = s.capsule; min = new THREE.Vector3(-r, -h / 2 - r, -r); max = new THREE.Vector3(r, h / 2 + r, r); }
  else if ('loft' in s || 'tube' in s || 'lathe' in s || 'surf' in s || 'prism' in s) { const b = boundsOf(piecesOf(s)); min = new THREE.Vector3(...b.min); max = new THREE.Vector3(...b.max); }
  else return null; // stars, fields and heaps are not solids to join
  const b = new THREE.Box3(min, max); if (base) b.translate(new THREE.Vector3(0, -min.y, 0)); return b;
}
/** A shape's covering boxes in the world (one, its own box, for the primitives). */
function piecesIn(s: Shape | undefined, lb: THREE.Box3, m: THREE.Matrix4, base?: boolean): OBB[] {
  if (!s || !('loft' in s || 'tube' in s || 'lathe' in s || 'surf' in s || 'prism' in s)) return [obbOf(lb, m)];
  const lift = base ? -boundsOf(piecesOf(s)).min[1] : 0, x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3(); m.extractBasis(x, y, z);
  return piecesOf(s).map((q: LocalBox) => {
    const u = (q.u ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]]).map((v) => new THREE.Vector3(...v).transformDirection(m)) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
    return { c: new THREE.Vector3(q.c[0], q.c[1] + lift, q.c[2]).applyMatrix4(m), u, h: [...q.h] as [number, number, number] };
  });
}
const obbOf = (local: THREE.Box3, m: THREE.Matrix4): OBB => {
  const c = local.getCenter(new THREE.Vector3()).applyMatrix4(m), s = local.getSize(new THREE.Vector3()).multiplyScalar(0.5), x = new THREE.Vector3(), y = new THREE.Vector3(), z = new THREE.Vector3();
  m.extractBasis(x, y, z); return { c, u: [x.normalize(), y.normalize(), z.normalize()], h: [s.x, s.y, s.z] };
};

/** The thing laid out: every part with its turn and place in the world, its oriented box, its bounds, and the bounds of
 *  all it holds. */
export function layout(root: Part, at = new THREE.Matrix4()): Node[] {
  const out: Node[] = [];
  const walk = (p: Part, parent: Node | null, m0: THREE.Matrix4, depth: number, path: string): Node => {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...(p.at ?? [0, 0, 0])), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
    const m = m0.clone().multiply(local), lb = shapeBox(p.shape, p.base), box = lb ? lb.clone().applyMatrix4(m) : null;
    const n: Node = { p, parent, kids: [], m, box, obb: lb ? obbOf(lb, m) : null, pieces: lb ? piecesIn(p.shape, lb, m, p.base) : [], local: lb, sub: box?.clone() ?? null, depth, path }; out.push(n); parent?.kids.push(n);
    (p.parts ?? []).forEach((q, i) => { const k = walk(q, n, m, depth + 1, `${path}/${i}`); if (k.sub && !q.detail) n.sub = n.sub ? n.sub.union(k.sub) : k.sub.clone(); });
    return n;
  };
  walk(root, null, at, 0, '');
  return out;
}

export const least = (b: THREE.Box3) => { const s = b.getSize(new THREE.Vector3()); return Math.min(s.x, s.y, s.z); };
const leastH = (o: OBB) => 2 * Math.min(...o.h);
/** The separating-axis test of two oriented boxes: null if apart by more than tol, else the axis of least overlap and how
 *  far they press into each other along it (negative: a gap within tol). */
export function sat(A: OBB, B: OBB, tol: number): { normal: THREE.Vector3; depth: number } | null {
  const T = B.c.clone().sub(A.c), axes: THREE.Vector3[] = [...A.u, ...B.u];
  for (const a of A.u) for (const b of B.u) { const x = new THREE.Vector3().crossVectors(a, b); if (x.lengthSq() > 1e-10) axes.push(x.normalize()); }
  let best: { normal: THREE.Vector3; depth: number } | null = null;
  for (const L of axes) {
    const ra = A.h[0] * Math.abs(A.u[0].dot(L)) + A.h[1] * Math.abs(A.u[1].dot(L)) + A.h[2] * Math.abs(A.u[2].dot(L));
    const rb = B.h[0] * Math.abs(B.u[0].dot(L)) + B.h[1] * Math.abs(B.u[1].dot(L)) + B.h[2] * Math.abs(B.u[2].dot(L)), d = Math.abs(T.dot(L)), pen = ra + rb - d;
    if (pen < -tol) return null;
    if (!best || pen < best.depth) best = { normal: L.clone().multiplyScalar(T.dot(L) >= 0 ? 1 : -1), depth: pen };
  }
  return best;
}
/** Whether one oriented box lies wholly inside another (all its corners within it). */
export function within(inner: OBB, outer: OBB, tol = 1e-4): boolean {
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const p = inner.c.clone().addScaledVector(inner.u[0], sx * inner.h[0]).addScaledVector(inner.u[1], sy * inner.h[1]).addScaledVector(inner.u[2], sz * inner.h[2]).sub(outer.c);
    for (let k = 0; k < 3; k++) if (Math.abs(p.dot(outer.u[k]!)) > outer.h[k]! + tol) return false;
  }
  return true;
}

/** The parts that touch: swept along x by their bounds, then tested as oriented boxes. One wholly inside another that
 *  does not hold it (an engine inside a car's shell) is inside it, not joined to it. */
export function contacts(nodes: Node[], keep: (n: Node) => boolean = () => true): Contact[] {
  const solid = nodes.filter((n) => n.obb && keep(n)).sort((a, b) => a.box!.min.x - b.box!.min.x), out: Contact[] = [];
  for (let i = 0; i < solid.length; i++) {
    const a = solid[i]!, A = a.box!;
    for (let j = i + 1; j < solid.length; j++) {
      const b = solid[j]!, B = b.box!, tol = Math.max(0.002, 0.01 * Math.min(leastH(a.obb!), leastH(b.obb!)));
      if (B.min.x > A.max.x + tol) break;
      if (B.min.y > A.max.y + tol || B.max.y < A.min.y - tol || B.min.z > A.max.z + tol || B.max.z < A.min.z - tol) continue;
      // (between their covering pieces: a part inside a kart's frame touches the tubes it meets, not the frame's bounds)
      let s: { normal: THREE.Vector3; depth: number } | null = null, pa = a.obb!, pb = b.obb!;
      for (const x of a.pieces) for (const y of b.pieces) { const t = sat(x, y, tol); if (t && (!s || t.depth > s.depth)) { s = t; pa = x; pb = y; } }
      if (!s) continue;
      if (b.parent !== a && a.parent !== b && a.pieces.length === 1 && b.pieces.length === 1 && ((within(a.obb!, b.obb!) && !seated(b, a)) || (within(b.obb!, a.obb!) && !seated(a, b)))) continue;
      out.push({ a, b, normal: s.normal, depth: s.depth, mid: pa.c.clone().add(pb.c).multiplyScalar(0.5), pa, pb });
    }
  }
  return out;
}
// a ring (a tyre: a torus or a turned section) holds what sits in its bore on its own axis (a rim), though its box holds
// all of it: what is inside a ring's box is in its bore, not inside it
const radial = (n: Node): [inner: number, outer: number, axis: THREE.Vector3] | null => {
  const s = n.p.shape; if (!s || !n.obb) return null;
  if ('torus' in s) return [s.torus[0] - s.torus[1], s.torus[0] + s.torus[1], n.obb.u[2]];
  if ('lathe' in s) { const r = s.lathe.map(([x]) => x); return [Math.min(...r), Math.max(...r), n.obb.u[1]]; }
  if ('cyl' in s) return [0, Math.max(s.cyl[0], s.cyl[2] ?? 0), n.obb.u[1]];
  return null;
};
function seated(ring: Node, inner: Node): boolean {
  if (!ring.p.shape || !('torus' in ring.p.shape || 'lathe' in ring.p.shape)) return false;
  const a = radial(ring), b = radial(inner); if (!a || !b || Math.abs(a[2].dot(b[2])) < 0.95) return false;
  return b[1] >= a[0] - 0.01 && b[1] <= a[1];
}
/** Where another part overlaps a part, in that part's own frame: the other's corners brought into its frame, their
 *  bounds clipped to its own box (exact for parts square to each other, a fair patch for turned ones). */
export function patchIn(host: Node, other: Node, piece?: OBB): THREE.Box3 | null {
  if (!host.local || !other.obb) return null; const inv = host.m.clone().invert(), o = piece ?? other.obb, b = new THREE.Box3();
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) b.expandByPoint(o.c.clone().addScaledVector(o.u[0], sx * o.h[0]).addScaledVector(o.u[1], sy * o.h[1]).addScaledVector(o.u[2], sz * o.h[2]).applyMatrix4(inv));
  const tol = 0.003, grown = host.local.clone().expandByScalar(tol); return grown.intersectsBox(b) ? grown.intersect(b) : null;
}
/** The thing a part belongs to: the nearest that a kit made (in a street, a car or a house), else the whole. */
export const thingOf = (n: Node): Node => { let x = n; while (x.parent && !x.p.kit) x = x.parent; return x; };
const GROWN = new Set(['leaf', 'foliage', 'tissue', 'bark', 'petal']), NATURAL = new Set([...GROWN, 'wood', 'oak', 'soil', 'water', 'granite', 'bone', 'fruit']);
/** What grew (a tree, a plant, a creature), whose parts are grown together, not joined or propped: a part is in such a
 *  thing when something holding it (or it) has grown matter in it (leaves, tissue, or wood that grows from its base: a
 *  bare winter branch) and nothing made (no steel, glass, concrete …). */
export function grownOf(nodes: Node[]): (n: Node) => boolean {
  const grew = new Map<Node, boolean>(), made = new Map<Node, boolean>();
  for (const n of [...nodes].sort((a, b) => b.depth - a.depth)) {
    let g = !!n.p.mat && (GROWN.has(n.p.mat) || (!!n.p.base && (n.p.mat === 'wood' || n.p.mat === 'oak'))), m = !!n.p.mat && !NATURAL.has(n.p.mat) && !n.p.detail;
    for (const k of n.kids) { g ||= grew.get(k)!; m ||= made.get(k)!; }
    grew.set(n, g); made.set(n, m);
  }
  return (n) => { for (let x: Node | null = n; x; x = x.parent) if (grew.get(x) && !made.get(x)) return true; return false; };
}
/** A world point or direction brought into a part's own frame (to place what is added to it). */
export const toLocal = (n: Node, world: THREE.Vector3) => world.clone().applyMatrix4(n.m.clone().invert());
export const dirToLocal = (n: Node, world: THREE.Vector3) => world.clone().transformDirection(n.m.clone().invert());
