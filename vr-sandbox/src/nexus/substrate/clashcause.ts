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
export type ClashCause = 'unit' | 'shape' | 'unexplained';
export interface ClashGroup { cause: ClashCause; count: number; ratios: number[]; worst: Clash | null; says: string }

/** The power of a thousand a ratio sits on, or null when it is not on one. */
function thousandFold(ratio: number): number | null {
  if (!(ratio > 1) || !Number.isFinite(ratio)) return null;
  const k = Math.log(ratio) / Math.log(1000);
  const n = Math.round(k);
  return n >= 1 && Math.abs(k - n) < 0.02 ? n : null;
}

export function clashCauses(cs: Clash[] = clashes()): ClashGroup[] {
  const by = new Map<ClashCause, { ratios: number[]; worst: Clash | null }>();
  for (const c of cs) {
    const vs = c.routes.map((r) => Math.abs(r.value)).filter((v) => v > 0);
    if (vs.length < 2) continue;
    const ratio = Math.max(...vs) / Math.min(...vs);
    const cause: ClashCause = thousandFold(ratio) !== null ? 'unit' : ratio <= 6.5 ? 'shape' : 'unexplained';
    const g = by.get(cause) ?? { ratios: [], worst: null };
    g.ratios.push(ratio);
    if (!g.worst || ratio > Math.max(...g.worst.routes.map((r) => Math.abs(r.value))) / Math.min(...g.worst.routes.map((r) => Math.abs(r.value)))) g.worst = c;
    by.set(cause, g);
  }
  const order: ClashCause[] = ['unit', 'shape', 'unexplained'];
  return order.filter((k) => by.has(k)).map((cause) => {
    const g = by.get(cause)!;
    const says = cause === 'unit'
      ? `${g.ratios.length} clashes where the two routes differ by a power of a thousand — a unit written wrong, not a disagreement about the world. Fix the unit and all of them go at once.`
      : cause === 'shape'
      ? `${g.ratios.length} clashes between 1× and 6.5× — a bounding box against the solid in it (a sphere fills 0.52 of its box, a cone a third). The fix is to state the shape, not to change a figure.`
      : `${g.ratios.length} clashes on no recognised pattern. THIS is the list to read: each is a fault nothing here explains.`;
    return { cause, count: g.ratios.length, ratios: g.ratios, worst: g.worst, says };
  });
}
