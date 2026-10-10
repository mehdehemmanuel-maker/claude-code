// What matter is made of, and how it can change. A species is counted by the identities a transformation conserves;
// which identities are conserved depends on how much energy the transformation has, against how strongly each identity
// is bound. Chemistry has electronvolts, so it keeps each element's atoms and the charge. A nucleus is bound by
// millions of electronvolts, and below that only charge, baryon number and lepton number are kept. A transformation is
// then a balance, so the balanced transformations of a set of species are the integer null space of the matrix of what
// they count: the same algebra that finds a set of quantities' dimensionless groups.
//
// When a transformation asked for has no balance, the identities that block it are named, and so is what a missing
// species would have to carry to balance it. The energy a transformation releases comes from the masses (E = mc²) or,
// in chemistry, from the bonds broken and made.

import { CONST } from '../book/constants';
import { integerNullSpace, integerNullVectors } from './dimension';
import { BONDS, ELEMENTS, type Species } from '../../data/species';

/** The identities a level of energy keeps. */
export const CHEMICAL = (species: Species[]) => [...new Set(species.flatMap((s) => Object.keys(s.counts)).filter((k) => k !== 'baryon' && k !== 'lepton'))];
export const NUCLEAR = ['charge', 'baryon', 'lepton'];

/** A species counted at the nuclear level: its nuclei open into protons and neutrons, its charge set by the electrons it holds. */
export function nucleons(s: Species): Record<string, number> {
  if (s.counts['baryon'] !== undefined) return { charge: s.counts['charge'] ?? 0, baryon: s.counts['baryon']!, lepton: s.counts['lepton'] ?? 0 };
  let protons = 0, baryons = 0;
  for (const [el, n] of Object.entries(s.counts)) { if (el === 'charge') continue; const e = ELEMENTS[el]; if (!e) throw new Error(`${s.name}: no nucleus for ${el}`); protons += n * e.Z; baryons += n * e.A; }
  const charge = s.counts['charge'] ?? 0, electrons = protons - charge;
  return { charge, baryon: baryons, lepton: electrons };
}

const countAt = (s: Species, id: string, level: 'chemical' | 'nuclear') => (level === 'nuclear' ? nucleons(s)[id] ?? 0 : s.counts[id] ?? 0);

/** Every balanced transformation among species: integer stoichiometries that change none of the identities kept. */
export function transformations(species: Species[], kept: string[], level: 'chemical' | 'nuclear'): number[][] {
  return integerNullSpace(kept.map((id) => species.map((s) => countAt(s, id, level))), species.length);
}

export interface Balance {
  /** The stoichiometry, reactants negative, or null when none involves every species. */
  coefficients: number[] | null;
  /** The identities whose conservation blocks it, each one alone. */
  blocks: string[];
  /** What a missing product would have to carry to balance it, by identity: the change the others leave. */
  missing: Record<string, number> | null;
}

/**
 * Whether reactants can become products keeping the identities kept. A balance uses every species, the reactants
 * consumed and the products made. Where none exists, each kept identity is dropped in turn: one whose dropping lets a
 * balance appear blocks the transformation, and the change it leaves is what a missing product must carry.
 */
export function balance(reactants: Species[], products: Species[], kept: string[], level: 'chemical' | 'nuclear'): Balance {
  const all = [...reactants, ...products];
  const find = (ids: string[]) => {
    // the smallest balance that consumes every reactant and makes every product
    const rows = ids.map((id) => all.map((sp) => countAt(sp, id, level)));
    for (const v of integerNullVectors(rows, all.length, all.length > 4 ? 12 : 6)) for (const k of [v, v.map((x) => -x || 0)]) {
      if (reactants.every((_, i) => k[i]! < 0) && products.every((_, i) => k[reactants.length + i]! > 0)) return k;
    }
    return null;
  };
  const k = find(kept);
  if (k) return { coefficients: k, blocks: [], missing: null };
  // the smallest sets of kept identities whose dropping lets a balance appear: one alone, else two together
  const singles = kept.filter((id) => find(kept.filter((x) => x !== id)));
  const blocks = singles.length ? singles : kept.flatMap((a, i) => kept.slice(i + 1).filter((b) => find(kept.filter((x) => x !== a && x !== b))).map((b) => `${a} and ${b}`));
  // where one identity alone blocks, the balance without it, taken with one of the first reactant, leaves what a missing product must carry
  let missing: Record<string, number> | null = null;
  if (singles.length === 1) {
    const kk = find(kept.filter((x) => x !== singles[0]))!;
    const scale = -kk[0]!;
    const left = Object.fromEntries(kept.map((q) => [q, -all.reduce((acc, sp, i) => acc + kk[i]! * countAt(sp, q, level), 0) / scale]));
    if (Object.values(left).every((x) => Number.isInteger(x))) missing = Object.fromEntries(Object.entries(left).map(([q, x]) => [q, x === 0 ? 0 : x]));
  }
  return { coefficients: null, blocks, missing };
}

/** The energy a transformation releases from its masses, J: what is consumed less what is made, times c². */
export const released = (all: Species[], coefficients: number[]) => -all.reduce((s, sp, i) => s + coefficients[i]! * sp.mass!, 0) * CONST.c.value! ** 2;

/**
 * A molecule's enthalpy of formation in the gas, from the level below: its free atoms' enthalpies less its bonds'.
 * The bonds are means over many molecules, so the residual against a molecule's measured enthalpy is what its own
 * binding has that the mean bonds do not.
 */
export function fromBonds(s: Species): number {
  let atoms = 0;
  for (const [el, n] of Object.entries(s.counts)) { const h = ELEMENTS[el]?.atomH; if (h === undefined) throw new Error(`${s.name}: no free-atom enthalpy for ${el}`); atoms += n * h; }
  let bonds = 0;
  for (const [b, n] of Object.entries(s.bonds ?? {})) { const d = BONDS[b]; if (d === undefined) throw new Error(`${s.name}: no bond enthalpy for ${b}`); bonds += n * d; }
  return atoms - bonds;
}

/** A transformation's enthalpy, J per mole of the stoichiometry: what is made less what is consumed. */
export const enthalpyOf = (all: Species[], coefficients: number[]) => all.reduce((s, sp, i) => s + coefficients[i]! * sp.H!, 0);

/**
 * Saha: the fraction of hydrogen ionized at a temperature and a number density of hydrogen nuclei. Ionization keeps
 * charge, baryon and lepton number; whether it happens is the binding (13.6 eV) against the thermal energy, with the
 * room the free electron has (its thermal wavelength cubed against the volume per nucleus) on the side of ionizing.
 * Saha, Phil. Mag. 40, 472 (1920); for hydrogen the statistical weights cancel.
 */
export function ionizedFraction(T: number, n: number, chi = 13.598434 * 1.602176634e-19): number {
  const me = 9.1093837015e-31, k = CONST.kB.value!, h = CONST.h.value!;
  const rhs = (1 / n) * ((2 * Math.PI * me * k * T) / (h * h)) ** 1.5 * Math.exp(-chi / (k * T));
  // x² / (1 − x) = rhs
  return (-rhs + Math.sqrt(rhs * rhs + 4 * rhs)) / 2;
}

/** The temperature at which hydrogen at a density is half ionized. */
export function halfIonized(n: number): number {
  let lo = 1e3, hi = 1e6;
  for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (ionizedFraction(m, n) < 0.5) lo = m; else hi = m; }
  return Math.sqrt(lo * hi);
}
