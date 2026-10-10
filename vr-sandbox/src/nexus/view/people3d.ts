// People in the room, drawn on their physics: each body's own skin (its layout's surface, src/nexus/world/anatomy.ts), hair,
// brows and eyes, skinned to its sixteen segments (src/nexus/world/person.ts) so the skin goes where the segments go. A skin
// point is carried by the two segments nearest it, weighted by how near (more by the nearer), so a knee bends as a knee
// rather than as two sticks. Which segments carry a point is asked of the skin's own shape: the capsule of skin the point
// is on (a forearm's, the side of the chest's) stands for the point, so the side of the chest stays with the chest when
// the arm next to it is lifted, rather than going with the arm. And each arm is its own surface, as it is at rest
// pressed to the side: meshed with the trunk, the skin between them would be one sheet, pulled into a web as it lifts.

import * as THREE from 'three';
import { primDist, surfaceNets, type Body, type Prim, type V3 } from '../world/anatomy';
import type { Person } from '../world/person';
import { centreOf, type Segment } from '../life/segments';
import { hairColor, irisColor, skinColor } from './organic';

const segDist = (p: V3, a: V3, b: V3): number => {
  const ab: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap: V3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], L2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
  const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / L2));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
};
/** How far a point is outside a segment's own solid (its capsule, or its box, upright at rest), 0 inside it. */
const outside = (q: V3, x: { s: Segment; c: V3 }): number => {
  if (x.s.shape.kind === 'capsule') return Math.max(0, segDist(q, x.s.a, x.s.b) - x.s.shape.r);
  const h = x.s.shape.half, d = [Math.abs(q[0] - x.c[0]) - h[0], Math.abs(q[1] - x.c[1]) - h[1], Math.abs(q[2] - x.c[2]) - h[2]];
  return Math.hypot(Math.max(0, d[0]!), Math.max(0, d[1]!), Math.max(0, d[2]!));
};
const geo = (m: { pos: Float32Array; nrm: Float32Array; idx: Uint32Array }) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3)); g.setIndex(new THREE.BufferAttribute(m.idx, 1)); return g; };
const mat = (c: number, rough = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0 });

export interface PersonView { group: THREE.Group; update(): void; dispose(): void; /** held at its rest layout, to look at the skin itself (on), or back on its physics (off) */ rest(on: boolean): void }

/** A person drawn: its skin skinned to its segments, its hair, brows and eyes carried by its head. */
export function personView(p: Person, body: Body, o: { cell?: number } = {}): PersonView {
  const hs = body.H / 1.76, P = body.params, group = new THREE.Group(); group.name = `person ${p.name}`;
  const segs = p.rig.segments, rest = segs.map((s) => ({ s, c: centreOf(s), r: s.shape.kind === 'capsule' ? s.shape.r : Math.min(s.shape.half[0], s.shape.half[2]) }));
  // the skin: the trunk and limbs at a centimetre, each point weighted to its two nearest segments; the head and face
  // finer (as the close-up view meshes them), carried whole by the head
  const hc = body.joints.headC!, nearHead = (q: { a: V3; b: V3 }) => Math.hypot(q.a[0] - hc[0], q.a[1] - hc[1], q.a[2] - hc[2]) < 0.16 * hs && Math.hypot(q.b[0] - hc[0], q.b[1] - hc[1], q.b[2] - hc[2]) < 0.18 * hs;
  const below = body.skin.filter((q) => !nearHead(q)), bones = rest.map((x) => { const b = new THREE.Bone(); b.position.set(...x.c); return b; });
  for (const b of bones) group.add(b);
  group.updateMatrixWorld(true); const skeleton = new THREE.Skeleton(bones);
  const segOf = (q: V3) => { let best = 0, bd = Infinity; rest.forEach((x, k) => { const d = outside(q, x) - 0.2 * x.r; if (d < bd) { bd = d; best = k; } }); return segs[best]!.id; };
  // an arm's own surface: the skin whose middle is nearest an arm's segment and out beyond the chest's side (the
  // deltoid over the shoulder stays with the trunk, so the shoulder is one smooth surface)
  const chest = rest.find((x) => x.s.id === 'thorax')!, chestHalf = chest.s.shape.kind === 'box' ? chest.s.shape.half[0] : 0.15 * hs;
  const armOf = (q: Prim) => { const m: V3 = [(q.a[0] + q.b[0]) / 2, (q.a[1] + q.b[1]) / 2, (q.a[2] + q.b[2]) / 2], side = /^(upperArm|forearm|hand)([LR])$/.exec(segOf(m))?.[2] ?? ''; return side && Math.abs(m[0]) > chestHalf + 0.02 * hs ? side : ''; };
  const parts = [below.filter((q) => armOf(q) === ''), below.filter((q) => armOf(q) === 'L'), below.filter((q) => armOf(q) === 'R')];
  for (const prims of parts) {
    if (!prims.length) continue;
    const m = surfaceNets(prims, (o.cell ?? 0.011) * hs), n = m.pos.length / 3, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    // the point on the axis of the capsule of skin nearest a point: inside the limb or trunk the point belongs to
    const core = (q: V3): V3 => {
      let best: Prim = prims[0]!, bd = Infinity; for (const pr of prims) { if (pr.cut) continue; const d = primDist(q, pr); if (d < bd) { bd = d; best = pr; } }
      const ba: V3 = [best.b[0] - best.a[0], best.b[1] - best.a[1], best.b[2] - best.a[2]], L2 = ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2;
      const h = L2 > 0 ? Math.max(0, Math.min(1, ((q[0] - best.a[0]) * ba[0] + (q[1] - best.a[1]) * ba[1] + (q[2] - best.a[2]) * ba[2]) / L2)) : 0;
      return [best.a[0] + ba[0] * h, best.a[1] + ba[1] * h, best.a[2] + ba[2] * h];
    };
    for (let i = 0; i < n; i++) {
      const q = core([m.pos[i * 3]!, m.pos[i * 3 + 1]!, m.pos[i * 3 + 2]!]);
      let b1 = 0, d1 = Infinity, b2 = 0, d2 = Infinity;
      // the segments whose solid the point is in (or nearest): inside two at once, as at a joint, it goes with both
      rest.forEach((x, k) => { const d = 0.004 * hs + outside(q, x); if (d < d1) { b2 = b1; d2 = d1; b1 = k; d1 = d; } else if (d < d2) { b2 = k; d2 = d; } });
      const w1 = 1 / d1 ** 3, w2 = d2 < 4 * d1 ? 1 / d2 ** 3 : 0, sum = w1 + w2;
      si[i * 4] = b1; si[i * 4 + 1] = b2; sw[i * 4] = w1 / sum; sw[i * 4 + 1] = w2 / sum;
    }
    const g = geo(m); g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const skin = new THREE.SkinnedMesh(g, mat(skinColor(P.skinDark), 0.55)); skin.frustumCulled = false; skin.castShadow = true;
    group.add(skin); skin.bind(skeleton, new THREE.Matrix4());
  }
  // hair, brows and eyes go with the head: drawn in the body's frame, carried as the head segment is
  const headK = segs.findIndex((s) => s.id === 'head'), head = new THREE.Group(), inner = new THREE.Group(); inner.position.set(...rest[headK]!.c.map((v) => -v) as V3); head.add(inner); group.add(head);
  { const f = surfaceNets([...body.skin.filter(nearHead), ...body.face], 0.0045 * hs); inner.add(new THREE.Mesh(geo(f), mat(skinColor(P.skinDark), 0.55))); }
  if (body.hair.length) { const h = surfaceNets(body.hair, 0.006 * hs); if (h.idx.length) inner.add(new THREE.Mesh(geo(h), mat(hairColor(P.hairDark, P.hairRed), 0.9))); }
  for (const b of body.brows) inner.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(b.map((v) => new THREE.Vector3(...v))), 10, 0.0026 * hs, 4, false), mat(hairColor(P.hairDark, P.hairRed), 0.9)));
  for (const og of body.organs) if (og.id === 'eye') {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.0115 * hs, 12, 8), mat(0xf6f4ee, 0.15)); e.position.set(og.a[0], og.a[1], og.a[2] - 0.004); inner.add(e);
    const ir = new THREE.Mesh(new THREE.CircleGeometry(0.0055 * hs, 14), mat(irisColor(P.eyeDark), 0.3)); ir.position.set(og.a[0], og.a[1], og.a[2] - 0.004 + 0.0116 * hs); inner.add(ir);
  }
  const qr = new THREE.Quaternion(), qn = new THREE.Quaternion();
  let atRest = false;
  const update = () => {
    if (atRest) { rest.forEach((x, k) => { bones[k]!.position.set(...x.c); bones[k]!.quaternion.identity(); if (k === headK) { head.position.set(...x.c); head.quaternion.identity(); } }); return; }
    const ps = p.poses();
    ps.forEach((x, k) => {
      // a segment's point at rest x goes to its place now and its turn now over its turn at rest: P + (R r⁻¹)(x − c)
      qr.set(...x.rest.r).invert(); qn.set(...x.q).multiply(qr);
      bones[k]!.position.set(...x.at); bones[k]!.quaternion.copy(qn);
      if (k === headK) { head.position.set(...x.at); head.quaternion.copy(qn); }
    });
  };
  update();
  return { group, update, rest: (on) => { atRest = on; update(); }, dispose: () => group.traverse((x) => { if ((x as THREE.Mesh).geometry) (x as THREE.Mesh).geometry.dispose(); }) };
}
