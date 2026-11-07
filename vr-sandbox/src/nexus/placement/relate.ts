// Mating as a number. Every mate says what it measures between two things and the range it holds in: a bolt in its hole
// (src/nexus/mate.ts: faces meeting, a pattern landing within 0.2 mm), a zone kept clear (proximity.ts: nothing in it),
// and here the rest: how far apart two things are, the gap between their surfaces, how far off one's front the other
// stands, how much of the other one sees past what is between, how much higher it is. Each may hold only while a state
// does (a sofa faces its television while someone watches). Measured from where things are, never stated; a mate out of
// its range says by how much, so a solver can move what carries it until it holds.

import * as THREE from 'three';
import type { Mate, Part } from '../kits';
import { layout, type Node } from '../make/space';

export const MEASURES: Record<Mate['measure'], { unit: string; says: string }> = {
  distance: { unit: 'm', says: 'between their middles, in plan' },
  gap: { unit: 'm', says: 'between their surfaces (their boxes), 0 where they touch' },
  facing: { unit: '°', says: 'how far off its front the other\'s middle is, in plan' },
  sees: { unit: '', says: 'the share of the other an eye at its height sees, past everything between (9 sight lines)' },
  height: { unit: 'm', says: 'how much higher the other\'s middle is than its own' },
};

/** Is a mate (or a zone) in force in a state? A state is a list of what is going on ('watching, cooking'), or '*' for
 *  everything at once (the default: every mate a thing could ever need is kept). */
export const inForce = (when: string | undefined, state = '*') => !when || state.trim() === '*' || state.split(',').map((x) => x.trim().toLowerCase()).includes(when.trim().toLowerCase());

const FACE: Record<string, THREE.Vector3> = { '+z': new THREE.Vector3(0, 0, 1), '-z': new THREE.Vector3(0, 0, -1), '+x': new THREE.Vector3(1, 0, 0), '-x': new THREE.Vector3(-1, 0, 0) };
/** What it is measured against: the nearest thing named like `to`, not itself or what it holds. */
export function targetOf(ns: Node[], owner: Node, k: Mate): Node | null {
  let re: RegExp; try { re = new RegExp(k.to, 'i'); } catch { return null; }
  const c = owner.sub?.getCenter(new THREE.Vector3()); if (!c) return null; let best: Node | null = null, bd = Infinity;
  for (const n of ns) { if (!n.sub || n.sub.isEmpty() || !re.test(n.p.name) || n === owner || n.path.startsWith(owner.path + '/') || owner.path.startsWith(n.path + '/')) continue; const d = n.sub.getCenter(new THREE.Vector3()).distanceTo(c); if (d < bd) { bd = d; best = n; } }
  return best;
}
const boxGap = (a: THREE.Box3, b: THREE.Box3) => { const dx = Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x), dy = Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y), dz = Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z); return Math.hypot(dx, dy, dz); };
const rayHits = (o: THREE.Vector3, p: THREE.Vector3, bs: THREE.Box3[]) => { const r = new THREE.Ray(o, p.clone().sub(o).normalize()), L = o.distanceTo(p), at = new THREE.Vector3(); return bs.some((b) => r.intersectBox(b, at) !== null && at.distanceTo(o) < L - 1e-3 && !b.containsPoint(o)); };

/** The measure itself: a (its box and the matrix of its frame) against b (its box), past what is between. */
export function measure(k: Mate, a: { box: THREE.Box3; m: THREE.Matrix4 }, b: THREE.Box3, between: THREE.Box3[] = []): number {
  const ca = a.box.getCenter(new THREE.Vector3()), cb = b.getCenter(new THREE.Vector3());
  switch (k.measure) {
    case 'distance': return Math.hypot(cb.x - ca.x, cb.z - ca.z);
    case 'gap': return boxGap(a.box, b);
    case 'height': return cb.y - ca.y;
    case 'facing': { const f = (FACE[k.face ?? '+z'] ?? FACE['+z']!).clone().transformDirection(a.m).setY(0).normalize(), to = cb.clone().sub(ca).setY(0); if (to.lengthSq() < 1e-12) return 0; return (f.angleTo(to.normalize()) * 180) / Math.PI; }
    case 'sees': { const eye = new THREE.Vector3(ca.x, a.box.min.y + (k.eye ?? 1.1), ca.z), s = b.getSize(new THREE.Vector3()); let seen = 0;
      for (const fx of [-0.3, 0, 0.3]) for (const fy of [-0.3, 0, 0.3]) { const p = cb.clone().add(new THREE.Vector3(fx * s.x, fy * s.y, fx * s.z)); if (!rayHits(eye, p, between)) seen++; } return seen / 9; }
  }
}
/** How far out of its range, in its own unit (0: it holds; within a millimetre, a tenth of a degree, a thousandth of a
 *  share, as measuring goes, it holds). */
export const outBy = (k: Mate, v: number) => { const d = k.min !== undefined && v < k.min ? k.min - v : k.max !== undefined && v > k.max ? v - k.max : 0; return d <= (k.measure === 'facing' ? 0.1 : 1e-3) ? 0 : d; };

export interface MateRow { mate: string; of: string; of_path: string; to: string; measure: string; value: number; min: number | ''; max: number | ''; unit: string; holds: boolean; in_force: boolean; why: string }
/** Every mate on everything in a thing, measured where it stands. */
export function matesOf(root: Part, state = '*', ns: Node[] = layout(root)): MateRow[] {
  const rows: MateRow[] = [], boxes = ns.filter((n) => n.p.shape && n.sub).map((n) => ({ n, b: n.sub! }));
  for (const n of ns) for (const k of n.p.mates ?? []) {
    const t = targetOf(ns, n, k), force = inForce(k.when, state);
    if (!t || !n.sub) { rows.push({ mate: k.name, of: n.p.name, of_path: n.path, to: `nothing named like ${k.to}`, measure: k.measure, value: NaN, min: k.min ?? '', max: k.max ?? '', unit: MEASURES[k.measure].unit, holds: !force, in_force: force, why: k.why }); continue; }
    const between = boxes.filter((x) => !x.n.path.startsWith(n.path) && !x.n.path.startsWith(t.path) && !n.path.startsWith(x.n.path + '/') && !t.path.startsWith(x.n.path + '/')).map((x) => x.b);
    const v = measure(k, { box: n.sub, m: n.m }, t.sub!, between);
    rows.push({ mate: k.name, of: n.p.name, of_path: n.path, to: t.p.name, measure: k.measure, value: Math.round(v * 1000) / 1000, min: k.min ?? '', max: k.max ?? '', unit: MEASURES[k.measure].unit, holds: !force || outBy(k, v) === 0, in_force: force, why: k.why });
  }
  return rows;
}
