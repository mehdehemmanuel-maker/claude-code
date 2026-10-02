// Main-thread view of breakable parts: which parts are segmented, where each segment is, and where a joint
// endpoint sits when its part is bent or broken. Physics reports one pose per segment ("part#k") plus the part's
// own frame (carried by segment 0); these helpers turn that into what rendering, tools and joints need.

import { getPartKind, segmentBodyId, segmentLayout, segmentOffset, segmentOfFrame, type SegmentLayout } from '../parts/registry';
import { composePose, relativePose } from '../doc/math';
import type { Endpoint, Part, Pose } from '../doc/types';

const layouts = new WeakMap<object, SegmentLayout | null>();

/** Segment layout of a part (null for a single rigid body), cached per params object. */
export function partLayout(part: Part): SegmentLayout | null {
  let l = layouts.get(part.params);
  if (l === undefined) {
    l = segmentLayout(getPartKind(part.kind), part.params);
    layouts.set(part.params, l);
  }
  return l;
}

export type PoseSource = (id: string) => Pose | null;

/** Pose of segment k: the live segment body, else the part frame with the straight offset. */
export function segmentPose(part: Part, layout: SegmentLayout, k: number, pose: PoseSource): Pose | null {
  const live = pose(segmentBodyId(part.id, k));
  if (live) return live;
  const stored = part.damage.segments?.[k];
  if (stored) return stored;
  const base = pose(part.id) ?? part.pose;
  return composePose(base, segmentOffset(layout, k));
}

/** World pose of a joint endpoint, riding on the segment it is attached to. */
export function endpointWorld(part: Part | undefined, ep: Endpoint, pose: PoseSource): Pose | null {
  if (!part) return null;
  const layout = partLayout(part);
  if (!layout) {
    const p = pose(part.id) ?? part.pose;
    return composePose(p, ep.frame);
  }
  const s = segmentOfFrame(layout, ep.frame);
  const sp = segmentPose(part, layout, s.seg, pose);
  return sp ? composePose(sp, s.frame) : null;
}

/**
 * A world frame expressed in a part's (straight, undamaged) coordinates. With a segment given, the frame is taken
 * relative to that segment, so joints made on a bent or broken part attach to the piece that was clicked.
 */
export function frameOnPart(part: Part, world: Pose, seg: number | null, pose: PoseSource): Pose {
  const layout = partLayout(part);
  if (!layout || seg === null) return relativePose(pose(part.id) ?? part.pose, world);
  const sp = segmentPose(part, layout, seg, pose) ?? part.pose;
  return composePose(segmentOffset(layout, seg), relativePose(sp, world));
}

/** Whether a segmented part is visibly deformed: any neighbouring segments rotated or displaced from straight. */
export function isBent(part: Part, layout: SegmentLayout, pose: PoseSource, angleTol = 0.01, distTol = 0.001): boolean {
  let prev: Pose | null = null;
  for (let k = 0; k < layout.count; k++) {
    const p = segmentPose(part, layout, k, pose);
    if (!p) return false;
    if (prev && !part.damage.broken.includes(k - 1)) {
      const rel = relativePose(prev, p);
      const w = Math.abs(rel.q[3]);
      const d = Math.hypot(rel.p[0] - layout.axis[0] * layout.segLen, rel.p[1] - layout.axis[1] * layout.segLen, rel.p[2] - layout.axis[2] * layout.segLen);
      if (2 * Math.acos(Math.min(1, w)) > angleTol || d > distTol) return true;
    }
    prev = p;
  }
  return false;
}
