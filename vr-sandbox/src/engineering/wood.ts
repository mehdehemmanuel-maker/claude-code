// Timber fastener capacities.
// Withdrawal: ultimate-load equations from the USDA FPL Wood Handbook (FPL-GTR-282, 2021), ch. 8
// (metric forms; p in N, D and L in mm, G = specific gravity, oven-dry weight / volume at 12% MC).
//   nails:       p = 54.12 G^(5/2) D L      (inch-pound: 7,850 G^(5/2) D L)
//   wood screws: p = 108.25 G^2 D L         (inch-pound: 15,700 G^2 D L)
//   lag screws:  p = 125.4 G^(3/2) D^(3/4) L (inch-pound: 8,100 G^(3/2) D^(3/4) L)
// Lateral: yield-limit (European yield model) modes I and IV as in NDS 2018 section 12.3,
// using nominal 5%-offset yield (no reduction term), scaled to an estimated ultimate.

export type WoodFastener = 'nail' | 'wood-screw' | 'lag-screw';

/** Withdrawal ultimate load from side grain, N. D, L in metres. */
export function withdrawalUltimate(kind: WoodFastener, G: number, D: number, L: number) {
  const Dmm = D * 1000;
  const Lmm = L * 1000;
  switch (kind) {
    case 'nail':
      return 54.12 * G ** 2.5 * Dmm * Lmm;
    case 'wood-screw':
      return 108.25 * G ** 2 * Dmm * Lmm;
    case 'lag-screw':
      return 125.4 * G ** 1.5 * Dmm ** 0.75 * Lmm;
  }
}

/** End-grain withdrawal is markedly weaker (Wood Handbook ch. 8 discussion; estimated factors). */
export const END_GRAIN_FACTOR: Record<WoodFastener, number> = { nail: 0.6, 'wood-screw': 0.75, 'lag-screw': 0.75 };

/**
 * Dowel bearing strength F_e, Pa (NDS 2018 Table 12.3.3):
 *  D < 6.35 mm: F_e = 16,600 G^1.84 psi  (= 114.45 MPa G^1.84)
 *  D >= 6.35 mm parallel to grain: F_e = 11,200 G psi (= 77.22 MPa G)
 */
export function dowelBearingStrength(G: number, D: number) {
  if (D < 0.00635) return 114.45e6 * G ** 1.84;
  return 77.22e6 * G;
}

/** Fastener bending yield strength F_yb typical for small screws and nails (NDS Table 12A footnotes), Pa. */
export const FASTENER_BENDING_YIELD = 620e6;

/** Ratio used to turn the nominal yield-limit value into an estimated ultimate lateral capacity. */
export const LATERAL_ULTIMATE_FACTOR = 1.6;

/**
 * Single-shear lateral capacity of a dowel-type fastener joining two wood members, N.
 * lm = main member (point side) penetration, ls = side member thickness, metres.
 */
export function lateralUltimate(G: number, D: number, lm: number, ls: number) {
  const Fe = dowelBearingStrength(G, D);
  const Fyb = FASTENER_BENDING_YIELD;
  const modeIm = D * lm * Fe;
  const modeIs = D * ls * Fe;
  // Mode IV with Re = 1 (same species both members): Z = D^2 sqrt(2 Fem Fyb / (3 (1 + Re))).
  const modeIV = D * D * Math.sqrt((2 * Fe * Fyb) / (3 * 2));
  return LATERAL_ULTIMATE_FACTOR * Math.min(modeIm, modeIs, modeIV);
}
