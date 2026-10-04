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

/** Points through B's box, a few centimetres apart, in the world: where B is, whatever way it is turned. */
function sampled(B: ReturnType<typeof boxOf>): Vec3[] {
  const n = B.half.map((h) => Math.max(1, Math.min(64, Math.ceil((2 * h) / 0.01))));
  const at = (k: number, i: number) => B.centre[k]! + (n[k]! === 1 ? 0 : B.half[k]! * ((2 * i) / (n[k]! - 1) - 1));
  const out: Vec3[] = [];
  for (let i = 0; i < n[0]!; i++) for (let j = 0; j < n[1]!; j++) for (let l = 0; l < n[2]!; l++) out.push(transformPoint(B.pose, [at(0, i), at(1, j), at(2, l)]));
  return out;
}

/**
 * Where A and B touch: of A's six faces, the one B sits against. That is the face with the smallest gap to B, among
 * those B overlaps across (a table top covers its leg's top end, not its side). The contact point is the middle of
 * where B actually lies against that face: the centroid of B's own points in the slab at the face and within A's
 * edges, so a diagonal brace across a post, or two stiles crossing at a ladder's top, meet where they really cross,
 * not at the middle of their bounding boxes. An error, saying how far apart they are, if nothing is within the slop.
 */
export function contactBetween(w: Workshop, a: string, b: string, label: (id: string) => string = (id) => w.doc.parts[id]?.name ?? id): { point: Vec3; normal: Vec3 } {
  const A = boxOf(w, a), B = boxOf(w, b);
  const local = B.corners.map((c) => inverseTransformPoint(A.pose, c));
  const lo = [0, 1, 2].map((k) => Math.min(...local.map((c) => c[k]!)));
  const hi = [0, 1, 2].map((k) => Math.max(...local.map((c) => c[k]!)));
  const inside = sampled(B).map((c) => inverseTransformPoint(A.pose, c));
  const margin = TOUCH + 2 * Math.min(...B.half);
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
      // the middle of where B really is against this face, when its points say
      const kept = inside.filter((c) => Math.abs(c[k]! - face) <= margin && [0, 1, 2].every((j) => j === k || (c[j]! >= A.centre[j]! - A.half[j]! - TOUCH && c[j]! <= A.centre[j]! + A.half[j]! + TOUCH)));
      if (kept.length) for (const j of [0, 1, 2]) if (j !== k) mid[j] = Math.min(A.centre[j]! + A.half[j]!, Math.max(A.centre[j]! - A.half[j]!, kept.reduce((s, c) => s + c[j]!, 0) / kept.length));
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
