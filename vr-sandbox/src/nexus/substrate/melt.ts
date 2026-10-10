// The hottest a crystal bears (docs/NEXUS-FROM-REALITY.md, section 25). A crystal melts when heat has loosened its
// arrangement enough that it no longer keeps its shape. No kept law derives the melting point from first principles;
// two candidate relations are read against the kept evidence, and the evidence chooses.
//
// - Lindemann's: it melts when an atom's thermal motion reaches a fixed share of the spacing. With the stiffness B and
//   the room an atom has, Ω, that is k T_m = c² B Ω. Across the kept metals, c² spreads by a factor of four.
// - Cohesion's: what melting takes is a fixed share of what holds an atom in. Melting takes about k per atom of entropy
//   (Richards' rule), and its heat is a fixed fraction of the cohesion, so k T_m = r E_coh. Across the kept metals, r
//   spreads by a factor of 1.5.
//
// The second is kept, and its ratio is abduced from the measured melting points as their geometric mean. Its spread is
// its uncertainty, and every metal is predicted with itself left out of the evidence. Neither relation is a
// derivation: a melting point from the free energy of the solid and the liquid would be, and that is the located lack.

import { CONST } from '../book/constants';
import { CRYSTALS, MELTING, type Crystal } from '../../data/species';
import { atomicVolume } from './solid';

/** A ratio abduced from evidence: its geometric mean, the factor its evidence spreads by about it, and what it was read from. */
export interface Abduced { ratio: number; spread: number; evidence: string[] }

const k = () => CONST.kB.value!;

/** r = k T_m / E_coh over the kept crystals with a measured melting point, leaving `out` out. */
export function cohesionRule(out?: string): Abduced {
  const xs = CRYSTALS.filter((c) => MELTING[c.element] !== undefined && c.element !== out).map((c) => ({ el: c.element, r: (k() * MELTING[c.element]!) / c.cohesive }));
  return abduced(xs);
}

/** c² = k T_m / (B Ω) over the same evidence: Lindemann's ratio with the measured stiffness, kept for comparison. */
export function lindemannRule(out?: string): Abduced {
  const xs = CRYSTALS.filter((c) => MELTING[c.element] !== undefined && c.element !== out).map((c) => ({ el: c.element, r: (k() * MELTING[c.element]!) / (c.measured.bulk * atomicVolume(c)) }));
  return abduced(xs);
}

function abduced(xs: { el: string; r: number }[]): Abduced {
  const logs = xs.map((x) => Math.log(x.r)), mean = logs.reduce((a, b) => a + b, 0) / logs.length;
  return { ratio: Math.exp(mean), spread: Math.exp(Math.max(...logs.map((l) => Math.abs(l - mean)))), evidence: xs.map((x) => x.el) };
}

/** Where a crystal melts by the cohesion rule, with the range its evidence spreads over; the crystal itself left out of the evidence. */
export function meltingPoint(c: Crystal): { T: number; lo: number; hi: number; rule: Abduced } {
  const rule = cohesionRule(c.element), T = (rule.ratio * c.cohesive) / k();
  return { T, lo: T / rule.spread, hi: T * rule.spread, rule };
}
