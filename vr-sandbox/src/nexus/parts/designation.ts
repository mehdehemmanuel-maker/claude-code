// THE SIZE A STANDARD DESIGNATION DENOTES. Not an estimate and not a lookup of someone's measurement: for a whole
// class of parts the published designation IS the size, by definition, so reading the name is reading the standard.
// "18650" does not describe a cell 18 mm across and 65 mm long — it MEANS one, under IEC 60086's rule that the first
// two digits are the diameter in millimetres and the rest the height in tenths. "M3 × 10" means ISO 4762's head over
// a 10 mm shank. A name that states "(8 × 22 × 7)" states ISO 15's three figures for a 608 bearing.
//
// This exists because Run 8p closed 677 of 688 missing sizes from `looks.ts` and left 11, and nine of those eleven
// are named by a standard. One rule covers them and every future part named the same way, which is the difference
// between a rule and eleven typed rows. Each route gives all three extents from the designation or returns nothing:
// a route that can only supply two (a NEMA frame fixes the face and says nothing about the body length) is refused
// rather than completed with a guess.
import { METRIC } from './threads';

export interface Denoted { mm: [number, number, number]; how: string }

/** Figures the name states outright: "ball bearing 608 (8 × 22 × 7)". The name is data, and those are the
 *  standard's own three numbers, so they are read rather than re-derived. Bore, outside, width: the box it fills is
 *  the outside across twice and the width deep. */
function stated(name: string): Denoted | null {
  const m = /\(\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*\)/.exec(name);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
  if (!(a > 0 && b > 0 && c > 0)) return null;
  // a ring stated bore × outside × width fills a box of its outside, twice, by its width
  const ring = b > a;
  return { mm: ring ? [b, b, c] : [a, b, c],
    how: `the three figures its own name states (${m[1]} × ${m[2]} × ${m[3]} mm)${ring ? ', read as a ring: its outside across twice, its width deep' : ''}` };
}

/** A CYLINDRICAL CELL CODE, under IEC 60086: the first two digits are the diameter in millimetres and the rest the
 *  height in tenths of a millimetre. 18650 → 18 mm by 65.0; CR2032 → 20 mm by 3.2; 21700 → 21 by 70.0. One rule for
 *  both lengths of code, because both follow it.
 *  Applied ONLY where the item's own path says it is a cell, so that an alloy number (6061) or a resistor code is
 *  never read as a diameter. That is the inventory's own classification, not a judgement made here. */
function cellCode(id: string, name: string, path: string): Denoted | null {
  if (!/cell|batter/i.test(path)) return null;
  // NOT \b at the front: a coin cell's code carries its chemistry as letters (CR2032, LIR2450), and R and 2 are both
  // word characters, so a word boundary there does not exist and \b silently refused every coin cell. Bounded by
  // "no digit either side" instead, which is what the code actually is.
  const m = /(?<![0-9])(\d{2})(\d{2,3})(?![0-9])/.exec(`${id} ${name}`);
  if (!m) return null;
  const across = Number(m[1]), tall = Number(m[2]) / 10;
  if (!(across >= 5 && across <= 50 && tall > 0.5 && tall <= 120)) return null;
  return { mm: [across, across, tall],
    how: `its IEC 60086 cell code ${m[1]}${m[2]}: the first two digits are the diameter in mm (${across}) and the rest the height in tenths (${tall} mm)` };
}

/** A METRIC SCREW, under ISO 4762 (socket head) or ISO 1580 (pan head): the designation M<d> × <L> fixes the thread
 *  and the shank, and the head follows from the thread through the standard's own table in `threads.ts`. The box it
 *  fills is the head across, twice, by the shank plus the head's height. */
function metricScrew(name: string): Denoted | null {
  const m = /\bM(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\b/.exec(name);
  if (!m) return null;
  const row = METRIC[`M${m[1]}`];
  if (!row) return null;
  const L = Number(m[2]);
  if (!(L > 0)) return null;
  return { mm: [row.dk, row.dk, L + row.k],
    how: `its designation M${m[1]} × ${m[2]}: ISO 4762 gives an M${m[1]} head ${row.dk} mm across and ${row.k} mm high, over a ${L} mm shank` };
}

/** The size the item's own designation denotes, or nothing. Tried most specific first. */
export function denotedSize(id: string, name: string, path = ''): Denoted | null {
  return stated(name) ?? cellCode(id, name, path) ?? metricScrew(name);
}
