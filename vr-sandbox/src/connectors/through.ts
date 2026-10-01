// How a fastener goes through a joint. A screw is driven through one part (the side member) into the other (the
// holding member), and which is which is not a choice of labels: it is driven through the part that is thin along
// its path. A table leg screwed to its top is joined at the leg's end, so the screw goes down through the 18 mm top
// into the leg's end grain, not sideways through 38 mm of leg. What matters is each part's extent along the joint's
// normal at the joint (its thickness there), and whether that runs along a long part's length (into its end grain,
// which holds a screw about three quarters as well, and a nail six tenths: Wood Handbook ch. 8).

import type { Material } from '../data/materials';
import type { BuildDoc, Connection, Part, Pose, Vec3 } from '../doc/types';
import { effectiveParams, getPartKind } from '../parts/registry';
import { closestOnShape, shapeBounds } from '../parts/shapes';
import { numberOf } from '../schema/params';
import type { JoinGeometry } from './plan';

/**
 * A joint is made where the parts are: a weld bead, a screw, a hinge pin, a bearing all sit in or on both parts. So a
 * joint's anchor must be on or inside each part it joins, give or take this much (the slop of placing it by hand).
 * Springs, ropes and bands are different: they are parts of their own that span the gap.
 */
export const REACH = 0.006;

/** Whether a kind of joint spans a gap by being a part itself (a spring, a rope, a band). */
export const spans = (model: string) => model === 'spring' || model === 'rope' || model === 'band';

/**
 * How far a point (in the part's own coordinates) is from the part: 0 on or inside it. A hollow section (a tube, an
 * angle) counts by its outline: a joint across a tube's end is made on its ring of wall (welded or glued round), so
 * its middle is on the part.
 */
export function gapTo(part: Part, m: Material, at: Vec3): number {
  const k = getPartKind(part.kind);
  const shape = k.collision(effectiveParams(k, part.params, m));
  if (shape.type !== 'compound') return closestOnShape(shape, at).d;
  const { min, max } = shapeBounds(shape);
  const c: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return closestOnShape({ type: 'box', half: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2] }, [at[0] - c[0], at[1] - c[1], at[2] - c[2]]).d;
}

/**
 * Why a joint can't exist as placed, or null if it can: its anchor must touch both parts (a joint across a gap would
 * have nothing physical holding the parts together: an axle no one made, a pin through air).
 */
export function unreachable(model: string, label: string, a: Part, mA: Material, frameA: Pose, b: Part | null, mB: Material | null, frameB: Pose | null): string | null {
  if (spans(model)) return null;
  const gA = gapTo(a, mA, frameA.p);
  const gB = b && mB && frameB ? gapTo(b, mB, frameB.p) : 0;
  const worst = gA > gB ? { g: gA, p: a } : { g: gB, p: b! };
  if (worst.g <= REACH) return null;
  return `The ${label.toLowerCase()} is ${Math.round(worst.g * 1000)} mm from ${worst.p.name}: nothing physical joins them there. Make it where they touch, or put a real part (an axle, a bracket, a pin) between them.`;
}

export interface Through {
  /** Each part's extent along the joint's normal at the joint, m. */
  a: number;
  b: number;
  /** Whether that runs along the part's length: the fastener goes into its end grain. */
  endA: boolean;
  endB: boolean;
}

/** A part's thickness at a point on it (in its own coordinates): its extent along the surface normal there, and whether that is along its length. */
export function thicknessAt(part: Part, m: Material, at: Vec3): { t: number; end: boolean } {
  const k = getPartKind(part.kind);
  const shape = k.collision(effectiveParams(k, part.params, m));
  const n = closestOnShape(shape, at).n;
  const { min, max } = shapeBounds(shape);
  const size: Vec3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const t = Math.abs(n[0]) * size[0] + Math.abs(n[1]) * size[1] + Math.abs(n[2]) * size[2];
  // the length axis: the longest, when the part is long (more than twice its next size)
  const order = [0, 1, 2].sort((i, j) => size[j]! - size[i]!);
  const long = size[order[0]!]! > 2 * size[order[1]!]! ? order[0]! : -1;
  return { t, end: long >= 0 && Math.abs(n[long]!) > 0.9 };
}

/** Both parts' thickness through a joint whose endpoints are at these frames (each in its own part's coordinates). */
export function throughOf(a: Part, mA: Material, frameA: Pose, b: Part | null, mB: Material | null, frameB: Pose | null): Through {
  const A = thicknessAt(a, mA, frameA.p);
  const B = b && mB && frameB ? thicknessAt(b, mB, frameB.p) : A;
  return { a: A.t, b: B.t, endA: A.end, endB: B.end };
}

/** The part's thinnest section: what every joint but a fastener's path is sized by. */
export function sectionThickness(p: Part, m: Material) {
  const k = getPartKind(p.kind);
  return k.dims(effectiveParams(k, p.params, m)).b;
}

/** A joint's geometry, as the world rates it: both sections, the bonded face, and the fastener's path. */
export function connectionGeometry(doc: BuildDoc, c: Connection, materialOf: (p: Part) => Material): JoinGeometry {
  const pa = doc.parts[c.a.part]!, pb = c.b ? doc.parts[c.b.part] ?? null : null;
  const mA = materialOf(pa), mB = pb ? materialOf(pb) : null;
  return {
    thicknessA: sectionThickness(pa, mA), thicknessB: pb ? sectionThickness(pb, mB!) : sectionThickness(pa, mA),
    bondW: numberOf(c.params, 'bondW', 0.03), bondL: numberOf(c.params, 'bondL', 0.03),
    through: throughOf(pa, mA, c.a.frame, pb, mB, c.b?.frame ?? null),
  };
}

/**
 * Which way a screw or nail goes: through whichever part is thinner along its path, into the other. `flip` when that
 * is B (so B is the side member and A holds the point). Anchored to the world, it goes through A into the ground.
 */
export function driven(t: Through | undefined, anchored: boolean, thicknessA: number, thicknessB: number) {
  if (!t) return { flip: false, side: thicknessA, hold: anchored ? Infinity : thicknessB, endGrain: false };
  const flip = !anchored && t.b < t.a;
  return {
    flip,
    side: flip ? t.b : t.a,
    hold: anchored ? Infinity : flip ? t.a : t.b,
    endGrain: anchored ? false : flip ? t.endA : t.endB,
  };
}
