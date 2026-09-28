// Strength of the bonds between segments of breakable stock, from the cross-section and the material.
//
// Ductile metals: elastic-perfectly-plastic. A section yields when the bending interaction
// sqrt((M1/Mp1)^2 + (M2/Mp2)^2) + (N/Np)^2 reaches 1 (Mp = Z * yield, Np = A * yield), then turns
// into a plastic hinge that keeps carrying Mp while it rotates, and tears once the hinge rotation
// passes what the material's ductility allows. Tension, shear and torsion rupture at the ultimate.
// Brittle materials and wood: linear-elastic to fracture, N/(A ft) + M1/Me1 + M2/Me2 >= 1 with
// Me = S * ultimate (wood: modulus of rupture, which is what "ultimate" holds for wood).

import type { Material } from '../data/materials';
import type { BondSection } from '../parts/registry';

export interface BondCapacity {
  ductile: boolean;
  /** Tension rupture (N). */
  tension: number;
  /** Compression crushing (N). */
  compression: number;
  /** Transverse shear (N). */
  shear: number;
  /** Torsion (N m). */
  torsion: number;
  /** Fully plastic moments about the two bending axes (N m), ductile only. */
  Mp: [number, number];
  /** Axial yield (N), ductile only. */
  Np: number;
  /** Elastic fracture moments (N m), brittle and wood. */
  Me: [number, number];
  /** Tensile strength used in the brittle interaction (Pa). */
  ft: number;
  /** Plastic hinge rotation at which a ductile bond tears (rad). */
  thetaF: number;
  source: string;
}

export const isWoodMaterial = (m: Material) => m.category === 'wood' || m.category === 'engineered-wood';

/**
 * Plastic hinge rotation capacity. Surface strain in a hinge about one section depth long is about theta / 2,
 * and true fracture strain is several times the tensile elongation, so 6 * elongation (clamped) is used:
 * mild steel (~20%) bends ~70 degrees, 6061-T6 (~12%) ~40 degrees, annealed copper well past 90 (estimated).
 */
export function hingeRotationCapacity(elongation: number) {
  return Math.min(2.6, Math.max(0.1, 6 * elongation));
}

export function bondCapacity(sec: BondSection, m: Material): BondCapacity {
  const wood = isWoodMaterial(m);
  if (m.ductile && !wood) {
    const sy = m.yield, su = m.ultimate;
    return {
      ductile: true,
      tension: sec.A * su,
      compression: sec.A * su,
      shear: 0.6 * su * sec.A,
      torsion: (0.6 * su * sec.J) / Math.max(sec.r, 1e-6),
      Mp: [sec.Z[0] * sy, sec.Z[1] * sy],
      Np: sec.A * sy,
      Me: [Infinity, Infinity],
      ft: su,
      thetaF: hingeRotationCapacity(m.elongation),
      source: 'Plastic section (Mp = Z Fy, Np = A Fy); rupture at the ultimate; shear 0.6 Fu',
    };
  }
  if (wood) {
    // USDA Wood Handbook ch. 5: compression parallel ~0.55 MOR, shear parallel ~0.1 MOR (clear wood).
    const MOR = m.ultimate;
    const tau = 0.1 * MOR;
    return {
      ductile: false,
      tension: sec.A * MOR,
      compression: 0.55 * MOR * sec.A,
      shear: (tau * sec.A) / 1.5,
      torsion: (tau * sec.J) / Math.max(sec.r, 1e-6),
      Mp: [Infinity, Infinity],
      Np: Infinity,
      Me: [sec.S[0] * MOR, sec.S[1] * MOR],
      ft: MOR,
      thetaF: 0,
      source: 'Wood: MOR x S in bending; compression 0.55 MOR, shear 0.1 MOR (USDA Wood Handbook ch. 5, clear wood)',
    };
  }
  // Brittle solids (glass, ceramics, cast iron, stone, brittle polymers): strong in compression.
  const su = m.ultimate;
  return {
    ductile: false,
    tension: sec.A * su,
    compression: 8 * su * sec.A,
    shear: (su * sec.A) / 1.5,
    torsion: (su * sec.J) / Math.max(sec.r, 1e-6),
    Mp: [Infinity, Infinity],
    Np: Infinity,
    Me: [sec.S[0] * su, sec.S[1] * su],
    ft: su,
    thetaF: 0,
    source: 'Brittle: fracture at the tensile strength (N/A + M/S >= Fu); compression 8 Fu (estimated)',
  };
}

export interface BondLoads {
  /** Axial force, tension positive (N). */
  N: number;
  /** Shear force magnitude (N). */
  V: number;
  /** Torsion magnitude (N m). */
  T: number;
  /** Bending moments about the two bending axes (N m, magnitudes). */
  M1: number;
  M2: number;
}

export interface BondCheck {
  /** Utilisation of the governing mode (1 = the bond yields or breaks). */
  u: number;
  mode: 'tension' | 'compression' | 'shear' | 'torsion' | 'bending' | '';
  /** What happens at u >= 1: a ductile bond in bending yields into a hinge, anything else fractures. */
  outcome: 'yield' | 'fracture';
  load: number;
  capacity: number;
}

/** Check an intact bond. */
export function checkBond(cap: BondCapacity, l: BondLoads): BondCheck {
  let best: BondCheck = { u: 0, mode: '', outcome: 'fracture', load: 0, capacity: 0 };
  const consider = (u: number, mode: BondCheck['mode'], outcome: BondCheck['outcome'], load: number, capacity: number) => {
    if (u > best.u) best = { u, mode, outcome, load, capacity };
  };
  consider(Math.max(0, l.N) / cap.tension, 'tension', 'fracture', Math.max(0, l.N), cap.tension);
  consider(Math.max(0, -l.N) / cap.compression, 'compression', 'fracture', Math.max(0, -l.N), cap.compression);
  consider(l.V / cap.shear, 'shear', 'fracture', l.V, cap.shear);
  consider(l.T / cap.torsion, 'torsion', 'fracture', l.T, cap.torsion);
  const M = Math.hypot(l.M1, l.M2);
  if (cap.ductile) {
    const m = Math.hypot(l.M1 / cap.Mp[0], l.M2 / cap.Mp[1]);
    const n = l.N / cap.Np;
    const u = m + n * n;
    // report the equivalent moment against the equivalent plastic capacity
    consider(u, 'bending', 'yield', M, M / Math.max(u, 1e-12));
  } else {
    const u = Math.max(0, l.N) / cap.tension + l.M1 / cap.Me[0] + l.M2 / cap.Me[1];
    consider(u, 'bending', 'fracture', M, M / Math.max(u, 1e-12));
  }
  return best;
}
