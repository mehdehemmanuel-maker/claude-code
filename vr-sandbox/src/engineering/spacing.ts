// Can these fasteners actually be put in? Every fastener needs room: a distance from the edges of the joint face, and
// a distance from its neighbours, or the wood splits and the steel tears out. A joint that asks for more fasteners
// than its face has room for can't be built, however strong it would be on paper.
//
//  - Timber (dowel-type fasteners: screws, bolts, nails): edge distance 1.5 D and spacing 4 D, the minimums of the
//    NDS (AWC National Design Specification, 2018, 12.5.1) for fasteners loaded parallel to grain (estimated for
//    small screws, which the NDS covers with nail rules).
//  - Steel (bolts and rivets): edge distance 1.2 d0 and spacing 2.2 d0, d0 the clearance hole, the minimums of
//    EN 1993-1-8 Table 3.3.

import type { Material } from '../data/materials';
import { CLEARANCE_HOLE_MEDIUM, METRIC_COARSE } from './threads';
import { numberOf, stringOf, type Params } from '../schema/params';

const isWood = (m: Material | null) => !!m && (m.category === 'wood' || m.category === 'engineered-wood');

export interface Fit { fits: boolean; max: number; count: number; edge: number; spacing: number; rule: string }

/** The diameter of a joint's fasteners and how many, or null for a joint without (weld, glue, solder). */
export function fastenersOf(kind: string, p: Params): { d: number; hole: number; count: number } | null {
  if (kind === 'bolted') {
    const size = stringOf(p, 'size', 'M8');
    const d = METRIC_COARSE[size]?.d ?? 0.008;
    return { d, hole: CLEARANCE_HOLE_MEDIUM[size] ?? d * 1.1, count: numberOf(p, 'count', 1) };
  }
  if (kind === 'screwed' || kind === 'nailed' || kind === 'riveted') {
    const d = numberOf(p, 'diameter', 0.004);
    return { d, hole: kind === 'riveted' ? d * 1.05 : d, count: numberOf(p, 'count', 1) };
  }
  return null;
}

/** Whether a joint's fasteners fit its face (bondW x bondL) with the minimum edge distances and spacing. */
export function fastenerFit(kind: string, p: Params, a: Material, b: Material | null): Fit | null {
  const f = fastenersOf(kind, p);
  if (!f) return null;
  const wood = isWood(a) || isWood(b);
  const edge = wood ? 1.5 * f.d : 1.2 * f.hole, spacing = wood ? 4 * f.d : 2.2 * f.hole;
  const across = (w: number) => (w < 2 * edge ? 0 : Math.floor((w - 2 * edge) / spacing + 1e-9) + 1);
  const W = numberOf(p, 'bondW', 0.03), L = numberOf(p, 'bondL', 0.03);
  const max = across(W) * across(L);
  return { fits: f.count <= max, max, count: f.count, edge, spacing, rule: wood ? 'NDS 12.5.1: edge 1.5D, spacing 4D' : 'EN 1993-1-8 Table 3.3: edge 1.2 d0, spacing 2.2 d0' };
}
