// Fasteners as they are sold. A joint is only buildable if its hardware exists: a 4 x 74 mm screw doesn't, a 4 x 70
// does. The join planner picks from these lists, and a fix steps from one stocked size to the next.

const mm = 1e-3;

/**
 * Wood screws (the metric chipboard / construction screw lines sold in Europe and widely elsewhere): the lengths
 * commonly stocked in each diameter, mm. Conservative: each size here is a standard catalogue item.
 */
export const WOOD_SCREWS: Record<string, number[]> = {
  '3.5': [12, 16, 20, 25, 30, 35, 40, 45, 50],
  '4': [16, 20, 25, 30, 35, 40, 45, 50, 60, 70],
  '4.5': [20, 25, 30, 35, 40, 45, 50, 60, 70, 80],
  '5': [25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 120],
  '6': [30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200],
};
export const SCREW_DIAMETERS = Object.keys(WOOD_SCREWS).map(Number).sort((a, b) => a - b);

/** US common wire nails by pennyweight (ASTM F1667; the sizes NDS tabulates): length and shank diameter, mm. */
export const COMMON_NAILS: { name: string; length: number; diameter: number }[] = [
  { name: '6d', length: 50.8, diameter: 2.87 },
  { name: '8d', length: 63.5, diameter: 3.33 },
  { name: '10d', length: 76.2, diameter: 3.76 },
  { name: '12d', length: 82.6, diameter: 3.76 },
  { name: '16d', length: 88.9, diameter: 4.11 },
  { name: '20d', length: 101.6, diameter: 4.88 },
  { name: '30d', length: 114.3, diameter: 5.26 },
  { name: '40d', length: 127.0, diameter: 5.72 },
  { name: '60d', length: 152.4, diameter: 6.68 },
];

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;

/** Whether this screw is a stocked size. */
export function isStockScrew(d: number, L: number) {
  const ls = WOOD_SCREWS[String(Math.round(d * 1e4) / 10)];
  return !!ls && ls.some((x) => near(x, L / mm));
}

/** The stocked nail of this size, if it is one. */
export function stockNail(d: number, L: number) {
  return COMMON_NAILS.find((n) => near(n.diameter, d / mm) && near(n.length, L / mm)) ?? null;
}

/**
 * A screw for a joint: through `side` (m) into a holding part `hold` deep, its threads `want` (m) into it, at least
 * `least`, never out the far side. The stocked length closest to that, in diameter `d` (m) or, if none fits, the next
 * smaller. null if no stocked screw reaches into the holding part at all.
 */
export function chooseScrew(d: number, side: number, hold: number, want: number, least: number): { diameter: number; length: number } | null {
  const i0 = SCREW_DIAMETERS.findIndex((x) => x >= d / mm - 1e-6);
  const order = [...SCREW_DIAMETERS.slice(0, (i0 < 0 ? SCREW_DIAMETERS.length - 1 : i0) + 1)].reverse();
  for (const D of order) {
    const ok = WOOD_SCREWS[String(D)]!.map((L) => L * mm).filter((L) => L - side >= least && L - side <= hold);
    if (ok.length) {
      const L = ok.reduce((b, x) => (Math.abs(x - side - want) < Math.abs(b - side - want) ? x : b));
      return { diameter: D * mm, length: L };
    }
  }
  // nothing gives full bite: the longest that stays inside, if any reaches past the side member
  for (const D of order) {
    const ok = WOOD_SCREWS[String(D)]!.map((L) => L * mm).filter((L) => L > side && L - side <= hold);
    if (ok.length) return { diameter: D * mm, length: ok[ok.length - 1]! };
  }
  return null;
}

/** A nail for a joint, the same way: the common nail whose point lands closest to `want` into the holding part. */
export function chooseNail(side: number, hold: number, want: number, least: number): { diameter: number; length: number; name: string } | null {
  const fits = COMMON_NAILS.filter((n) => n.length * mm - side >= least && n.length * mm - side <= hold);
  const pool = fits.length ? fits : COMMON_NAILS.filter((n) => n.length * mm > side && n.length * mm - side <= hold);
  if (!pool.length) return null;
  const n = pool.reduce((b, x) => (Math.abs(x.length * mm - side - want) < Math.abs(b.length * mm - side - want) ? x : b));
  return { diameter: n.diameter * mm, length: n.length * mm, name: n.name };
}

/** The next stocked screw up in diameter, at the stocked length nearest this one. */
export function biggerScrew(d: number, L: number): { diameter: number; length: number } | null {
  const D = SCREW_DIAMETERS.find((x) => x > d / mm + 1e-6);
  if (D === undefined) return null;
  const ls = WOOD_SCREWS[String(D)]!;
  const len = ls.reduce((b, x) => (Math.abs(x - L / mm) < Math.abs(b - L / mm) ? x : b));
  return { diameter: D * mm, length: len * mm };
}

/** The next heavier common nail. */
export function biggerNail(d: number, L: number): { diameter: number; length: number } | null {
  const i = COMMON_NAILS.findIndex((n) => n.diameter > d / mm + 1e-6 && n.length >= L / mm - 1e-6);
  return i >= 0 ? { diameter: COMMON_NAILS[i]!.diameter * mm, length: COMMON_NAILS[i]!.length * mm } : null;
}

/** How a screw or nail is called at the counter: "4 × 70 mm wood screw", "16d common nail (88.9 × 4.11 mm)". */
export function fastenerName(kind: 'screwed' | 'nailed', d: number, L: number, wood = true): string {
  if (kind === 'nailed') {
    const n = stockNail(d, L);
    return n ? `${n.name} common nail (${n.length} × ${n.diameter} mm)` : `nail Ø${(d / mm).toFixed(2)} × ${(L / mm).toFixed(0)} mm (not a stock size)`;
  }
  const name = `${+(d / mm).toFixed(1)} × ${Math.round(L / mm)} mm ${wood ? 'wood' : 'self-tapping'} screw`;
  return isStockScrew(d, L) ? name : `${name} (not a stock size)`;
}
