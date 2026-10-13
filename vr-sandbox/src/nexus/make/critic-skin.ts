// The skin checks: how a freeform panel meets its neighbours, whether it parts from its die, and how tight it bends.
// Split out of `critic.ts` when that file crossed its own oversize ratchet (860 lines): these three checks share four
// caches and nothing else in the file touches them, which is the "one rule per file" the ratchet is asking for.
//
//   continuity   a skin meets its neighbour as its maker said: across a mirror in one tangent plane (within 1°), G1
//                with a neighbour (within 8 mm and 3°), a crease within 8 mm
//   draft        a pressed or moulded skin pulled from its die from the best direction there is (the die tipped as a
//                stamping engineer sets it), and said where it would still lock in
//   radius       its tightest radius said where it is under three times its sheet (tighter than an outer panel is
//                pressed without splitting, typical)

import * as THREE from 'three';
import { closestOn, draft, fairness, patchAt, type Patch, type V3 as SV3 } from '../parts/surface';
import { detailClassOf } from './detail';
import type { Node } from '../parts/space';

const formed = new WeakMap<Patch, { least: number; pull: SV3; rmin: number; rminAt: [number, number] }>(), grids = new WeakMap<Patch, { a: number; b: number; at: SV3 }[]>();
const met = new WeakMap<Patch, Map<string, { gap: number; angle: number }>>(), ids = new WeakMap<Patch, number>(); let nextId = 0;
const idOf = (pt: Patch) => { let i = ids.get(pt); if (i === undefined) { i = nextId++; ids.set(pt, i); } return i; };
const gridOf = (pt: Patch) => { let g = grids.get(pt); if (!g) { g = []; for (let i = 0; i <= 40; i++) for (let j = 0; j <= 16; j++) g.push({ a: i / 40, b: j / 16, at: patchAt(pt, i / 40, j / 16).at }); grids.set(pt, g); } return g; };
const deg = (r: number) => (r * 180) / Math.PI;
/** A skin's meetings with its neighbours checked against what its maker said of them: across a mirror, its normal with no
 *  part across the mirror (within 1°); in one tangent plane with a neighbour (G1: within 8 mm and 3°); a crease, within
 *  8 mm. A pressed or moulded skin is pulled from its die from the best direction there is (the die tipped as a stamping
 *  engineer sets it), and said where it would still lock in; and its tightest radius is said where it is under three
 *  times its sheet's thickness (tighter than an outer panel is pressed without splitting, typical). */
export function skinChecks(nodes: Node[], say: (check: string, part: string, says: string, fixed: boolean) => void, saw: (check: string, n: number) => void): void {
  const skins = nodes.filter((n) => n.p.shape && 'surf' in n.p.shape && !n.p.detail);
  let seams = 0, pressings = 0, bends = 0;
  for (const n of skins) {
    const pt = (n.p.shape as { surf: Patch }).surf;
    for (const m of n.p.meets ?? []) {
      seams++;
      const ts = Array.from({ length: 19 }, (_, k) => 0.05 + (0.9 * k) / 18), ab = (t: number): [number, number] => (m.edge === 'a0' ? [0, t] : m.edge === 'a1' ? [1, t] : m.edge === 'b0' ? [t, 0] : [t, 1]);
      if (m.kind === 'mirror') {
        let worst = 0; for (const t of ts) { const q = patchAt(pt, ...ab(t)); if (Math.abs(q.at[2]) < 2e-3) worst = Math.max(worst, deg(Math.asin(Math.min(1, Math.abs(q.n[2]))))); }
        if (worst > 1) say('continuity', n.p.name, `it meets its own mirror at ${worst.toFixed(1)}°, not in one tangent plane (${m.why})`, false);
        continue;
      }
      const other = skins.find((x) => x.p.name === m.part); if (!other) { say('continuity', n.p.name, `it is to meet the ${m.part}, which is not there`, false); continue; }
      // (each point of this edge taken into the neighbour's frame, the point of the neighbour nearest it found, and the
      // two normals compared there)
      const opt = (other.p.shape as { surf: Patch }).surf, into = new THREE.Matrix4().copy(other.m).invert().multiply(n.m), rot = new THREE.Matrix3().setFromMatrix4(into), og = gridOf(opt);
      // (what two skins' meeting is depends only on them, the edge, and where one stands from the other: kept, so a car
      // park of one model, or the critic's next round, does not work it out again)
      let seen = met.get(pt); if (!seen) { seen = new Map(); met.set(pt, seen); }
      const mk = `${idOf(opt)}|${m.edge}|${into.elements.map((v) => v.toFixed(4)).join(',')}`; let got = seen.get(mk);
      if (!got) {
        let g2 = 0, a2 = 0;
        for (const t of ts) {
          const q = patchAt(pt, ...ab(t)), P = new THREE.Vector3(...q.at).applyMatrix4(into), c = closestOn(opt, [P.x, P.y, P.z], og), on = patchAt(opt, c.a, c.b).n;
          g2 = Math.max(g2, c.d); a2 = Math.max(a2, deg(Math.acos(Math.min(1, Math.abs(new THREE.Vector3(...q.n).applyMatrix3(rot).normalize().dot(new THREE.Vector3(...on)))))));
        }
        got = { gap: g2, angle: a2 }; seen.set(mk, got);
      }
      const { gap, angle } = got;
      if (gap > 0.008) say('continuity', n.p.name, `it is to meet the ${m.part} (${m.why}), but stands ${(gap * 1000).toFixed(0)} mm from it`, false);
      else if (m.kind === 'G1' && angle > 3) say('continuity', n.p.name, `it meets the ${m.part} at ${angle.toFixed(1)}°, not in one tangent plane (${m.why})`, false);
    }
    const pressed = n.p.make === 'pressed' || (detailClassOf(n.p.mat) === 'polymer' && !!n.p.shell);
    if (!pressed) continue;
    pressings++; if (n.p.shell && n.p.make === 'pressed') bends++;
    let f = formed.get(pt); if (!f) { const d = draft(pt, undefined, 16, 10), fr = fairness(pt, 24, 12); f = { least: d.least, pull: d.pull, rmin: fr.rmin, rminAt: fr.rminAt }; formed.set(pt, f); }
    if (f.least < -0.5 * (Math.PI / 180)) say('draft', n.p.name, `it would lock in its die: an undercut of ${(-deg(f.least)).toFixed(1)}° however the press is set (its best, along ${f.pull.map((v) => v.toFixed(2)).join(', ')})`, false);
    if (n.p.shell && n.p.make === 'pressed' && f.rmin < 3 * n.p.shell) say('radius', n.p.name, `it bends to a ${(f.rmin * 1000).toFixed(1)} mm radius (at ${f.rminAt.map((v) => v.toFixed(2)).join(', ')} on it), tighter than ${(n.p.shell * 1000).toFixed(1)} mm sheet is pressed (about three times its thickness, typical)`, false);
  }
  saw('continuity', seams); saw('draft', pressings); saw('radius', bends);
}
