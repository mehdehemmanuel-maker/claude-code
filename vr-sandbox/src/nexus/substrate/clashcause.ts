// Why a clash is a clash. `derive.ts` reports WHICH quantities disagree; this says WHAT KIND of fault each one is,
// so four thousand of them are fixed by cause rather than one row at a time. It is a separate file because it is a
// separate verb: finding a disagreement is over-determination, and classifying one is arithmetic over the ratio.
import { clashes, type Clash } from './derive';

/** WHY A CLASH IS A CLASH, grouped by its arithmetic so the fix is systematic rather than one row at a time.
 *  Run 8p's size merge took the inventory from 1,261 things with a geometry to 1,938, and over-determination then
 *  had 3,982 disagreements to report against the 2,952 that were already there unseen. Four thousand faults are not
 *  fixed by hand, and they do not need to be: the RATIO between two routes says what kind of fault it is.
 *  A `unit` fault: the two routes differ by a power of a thousand, give or take a few percent. Nothing about shape
 *  produces 1000.00; that is a metre written for a millimetre, or a micrometre for a nanometre. The flagellar motor
 *  is the clearest — its stated 11 MDa mass is right, its stated 45 µm size is its real 45 nm times a thousand,
 *  and the two routes differ by 10^9 because volume carries the cube.
 *  A `shape` fault: the routes differ by a factor between one and about six. That is a bounding box against the
 *  solid inside it (a sphere fills π/6 = 0.52 of its box, a cone a third, a thin ring far less), so the fix is to
 *  state the shape rather than to change a number.
 *  Anything else is `unexplained` and is the list a round should actually read. */
export type ClashCause = 'unit' | 'fill' | 'shape wrong' | 'shape' | 'unexplained';
export interface ClashGroup { cause: ClashCause; count: number; ratios: number[]; worst: Clash | null; says: string }

/** The power of a thousand a ratio sits on, or null when it is not on one. */
function thousandFold(ratio: number): number | null {
  if (!(ratio > 1) || !Number.isFinite(ratio)) return null;
  const k = Math.log(ratio) / Math.log(1000);
  const n = Math.round(k);
  return n >= 1 && Math.abs(k - n) < 0.02 ? n : null;
}

/** Does a route here assume the box is SOLID? `extent.from-mass` gives the height a mass would reach if the box were
 *  full of material, and `mass.prism` the mass a full box would have. Both are the solid reading. */
const assumesSolid = (how: string): boolean => /from-mass|\.prism|prism\b/.test(how);
/** Does a route here STATE the outside? A stated size, a typical drawn one, or one a designation denotes. */
const statesOutside = (how: string): boolean => /stated size|typical size|IEC 60086|designation|can size|part number|name states/.test(how);

/** THE FILL FRACTION, WHICH IS WHAT 77% OF THE "UNEXPLAINED" CLASHES WERE. A thing filling φ of its box satisfies
 *  m = ρ φ A H, so the height a mass implies on a SOLID assumption is φ times the real outside height, and the mass a
 *  full box would have is 1/φ times the real mass. Either way the two routes differ by exactly 1/φ — so the ratio is
 *  not an error, it is a MEASUREMENT of how full the thing is.
 *  Run 8r read the 561 unexplained clashes and found 431 of them were a height, a stated size against
 *  `extent.from-mass`, with sheets, rods, tubes, rings and loops all over the list — things that are mostly air. The
 *  old `shape` band stopped at 6.5× and a ring fills far less than a sixth of its box, so they fell through.
 *  The verdict is then a comparison rather than a band: the clash carries its shape's DECLARED φ, so
 *    • the implied fill agrees with the declared one  → `fill`, and the two routes agree once the shape is counted
 *    • it does not                                     → `shape wrong`, and the shape or the mass is a real fault
 *  "Agrees" is within a factor of two, which is the span between the three shapes `boxShape` tells apart (a block 1,
 *  a cylinder π/4 = 0.785, an ellipsoid π/6 = 0.524): any tighter and the three would not be distinguishable, any
 *  looser and a cylinder would pass as a block. It is set by what the shapes are, not by what makes the count small. */
function fillCause(c: Clash, ratio: number): ClashCause | null {
  if (c.fills === undefined || !(c.fills > 0)) return null;
  const hows = c.routes.map((r) => r.how);
  if (!hows.some(assumesSolid) || !hows.some(statesOutside)) return null;
  const implied = 1 / ratio;                       // the solid route is the smaller one, so this is the fill
  const off = Math.max(implied / c.fills, c.fills / implied);
  return off <= 2 ? 'fill' : 'shape wrong';
}

export function clashCauses(cs: Clash[] = clashes()): ClashGroup[] {
  const by = new Map<ClashCause, { ratios: number[]; worst: Clash | null }>();
  for (const c of cs) {
    const vs = c.routes.map((r) => Math.abs(r.value)).filter((v) => v > 0);
    if (vs.length < 2) continue;
    const ratio = Math.max(...vs) / Math.min(...vs);
    const cause: ClashCause = thousandFold(ratio) !== null ? 'unit' : fillCause(c, ratio) ?? (ratio <= 6.5 ? 'shape' : 'unexplained');
    const g = by.get(cause) ?? { ratios: [], worst: null };
    g.ratios.push(ratio);
    if (!g.worst || ratio > Math.max(...g.worst.routes.map((r) => Math.abs(r.value))) / Math.min(...g.worst.routes.map((r) => Math.abs(r.value)))) g.worst = c;
    by.set(cause, g);
  }
  const order: ClashCause[] = ['unit', 'fill', 'shape wrong', 'shape', 'unexplained'];
  return order.filter((k) => by.has(k)).map((cause) => {
    const g = by.get(cause)!;
    const says = cause === 'fill'
      ? `${g.ratios.length} clashes where one route assumes the box is SOLID and the other states the outside. They differ by 1/φ, so the ratio is the fill fraction — and it agrees with the shape the thing declares. Not faults: the arithmetic is right and the thing is simply not solid.`
      : cause === 'shape wrong'
      ? `${g.ratios.length} clashes where that same ratio does NOT match the declared shape's fill, so the shape or the mass is wrong. THESE ARE REAL.`
      : cause === 'unit'
      ? `${g.ratios.length} clashes where the two routes differ by a power of a thousand — a unit written wrong, not a disagreement about the world. Fix the unit and all of them go at once.`
      : cause === 'shape'
      ? `${g.ratios.length} clashes between 1× and 6.5× — a bounding box against the solid in it (a sphere fills 0.52 of its box, a cone a third). The fix is to state the shape, not to change a figure.`
      : `${g.ratios.length} clashes on no recognised pattern. THIS is the list to read: each is a fault nothing here explains.`;
    return { cause, count: g.ratios.length, ratios: g.ratios, worst: g.worst, says };
  });
}
