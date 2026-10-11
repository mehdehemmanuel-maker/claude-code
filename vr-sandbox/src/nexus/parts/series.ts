// The preferred numbers every electronic value comes in (IEC 60063), which is one standard and was written out eight
// times in this tree before this file existed: E12 in four places, E24 in three, E96 in two. They are not arbitrary
// lists. Each series divides a decade into n geometric steps, so the values are 10^(k/n) rounded to the significant
// figures the series carries — E96 is still generated that way here, and E6, E12 and E24 are written out because the
// standard's own rounding is not what the formula gives (E24's 2.7 and 3.0 are not 10^(7/24) = 2.68 and 10^(8/24) =
// 3.16, and a resistor is marked with what the standard says, not with what the exponent says).
//
// Which series a part comes in is the part's own business, not this file's: a 5 % resistor is E24 and a 1 % one E96
// (src/nexus/kinds/electrical.ts), a capacitor is E6 (src/nexus/parts/catalogue.ts). This file imports nothing, so
// anything in the tree can read it without a cycle.
//
// Owner of: the E series themselves, and nothing else.

/** E6, 20 % parts: a decade in six steps (IEC 60063). */
export const E6 = [1, 1.5, 2.2, 3.3, 4.7, 6.8];
/** E12, 10 % parts: a decade in twelve steps (IEC 60063). */
export const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
/** E24, 5 % parts: a decade in twenty-four steps (IEC 60063). */
export const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
/** E96, 1 % parts: a decade in ninety-six steps, to three figures — which is the standard's own rule, so these are
 *  generated rather than listed (IEC 60063). */
export const E96 = Array.from({ length: 96 }, (_, k) => +(10 ** (k / 96)).toPrecision(3));

/** The value of a series nearest x, in whatever decade x is in: what a resistor or capacitor would actually be bought
 *  as. Nearest in ratio, not in difference, because that is how a tolerance band works. */
export const preferred = (series: readonly number[], x: number): number => {
  if (!(x > 0)) return NaN;
  const dec = 10 ** Math.floor(Math.log10(x));
  return series.map((m) => m * dec).concat([10 * dec]).reduce((a, b) => (Math.abs(Math.log(b / x)) < Math.abs(Math.log(a / x)) ? b : a));
};
