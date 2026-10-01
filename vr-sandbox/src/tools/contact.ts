// Where two parts touch. A joint is made there (connectors/through.ts holds every joint to it), so when you ask to join
// two parts, by hand or in Forge, this finds the face of A that B sits against and the middle of where they overlap.

import { inverseTransformPoint, normalize, rotate, transformPoint } from '../doc/math';
import type { Vec3 } from '../doc/types';
import { effectiveParams, getPartKind } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import type { Workshop } from '../app/workshop';

/** How close counts as touching, m (two parts set against each other by hand). */
export const TOUCH = 0.005;

/** A part's local box and its corners in the world, where it is now. */
export function boxOf(w: Workshop, id: string) {
  const part = w.doc.parts[id]!;
  const pose = w.livePose(id) ?? part.pose;
  const kind = getPartKind(part.kind);
  const bounds = shapeBounds(kind.collision(effectiveParams(kind, part.params, w.materialOf(part))));
  const centre: Vec3 = [0, 1, 2].map((k) => (bounds.min[k]! + bounds.max[k]!) / 2) as Vec3;
  const half: Vec3 = [0, 1, 2].map((k) => (bounds.max[k]! - bounds.min[k]!) / 2) as Vec3;
  const corners: Vec3[] = [];
  for (const x of [bounds.min[0], bounds.max[0]]) for (const y of [bounds.min[1], bounds.max[1]]) for (const z of [bounds.min[2], bounds.max[2]]) corners.push(transformPoint(pose, [x, y, z]));
  return { pose, centre, half, corners };
}

/**
 * Where A and B touch: of A's six faces, the one B sits against. That is the face with the smallest gap to B, among
 * those B overlaps across (a table top covers its leg's top end, not its side). The contact point is the middle of
 * that overlap. An error, saying how far apart they are, if nothing is within the contact slop.
 */
export function contactBetween(w: Workshop, a: string, b: string, label: (id: string) => string = (id) => w.doc.parts[id]?.name ?? id): { point: Vec3; normal: Vec3 } {
  const A = boxOf(w, a), B = boxOf(w, b);
  const local = B.corners.map((c) => inverseTransformPoint(A.pose, c));
  const lo = [0, 1, 2].map((k) => Math.min(...local.map((c) => c[k]!)));
  const hi = [0, 1, 2].map((k) => Math.max(...local.map((c) => c[k]!)));
  let best: { gap: number; point: Vec3; normal: Vec3 } | null = null;
  for (const k of [0, 1, 2]) {
    for (const sgn of [1, -1]) {
      const face = A.centre[k]! + sgn * A.half[k]!;
      const gap = sgn > 0 ? lo[k]! - face : face - hi[k]!;
      if (gap < -0.01 || gap > TOUCH) continue; // not against this face (or through it)
      const mid: Vec3 = [0, 0, 0];
      let overlaps = true;
      for (const j of [0, 1, 2]) {
        if (j === k) { mid[j] = face; continue; }
        const l = Math.max(lo[j]!, A.centre[j]! - A.half[j]!), h = Math.min(hi[j]!, A.centre[j]! + A.half[j]!);
        if (h - l <= 1e-4) { overlaps = false; break; }
        mid[j] = (l + h) / 2;
      }
      if (!overlaps || (best && Math.abs(gap) >= Math.abs(best.gap))) continue;
      const n: Vec3 = [0, 0, 0];
      n[k] = sgn;
      best = { gap, point: transformPoint(A.pose, mid), normal: normalize(rotate(A.pose.q, n)) };
    }
  }
  if (!best) {
    const d = Math.max(0, ...[0, 1, 2].map((k) => Math.max(lo[k]! - (A.centre[k]! + A.half[k]!), A.centre[k]! - A.half[k]! - hi[k]!)));
    throw new Error(`${label(a)} and ${label(b)} aren't touching (${Math.round(d * 1000)} mm apart): a joint needs them in contact`);
  }
  return { point: best.point, normal: best.normal };
}
