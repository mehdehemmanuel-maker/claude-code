// MIG (GMAW) welding as a process: what the machine settings and the welder's hand do to the bead, and what the
// bead is worth once it has cooled. Every number is either a published value or a shop rule of thumb, and says
// which.
//
//  - Current from wire feed: Miller's rule of thumb, inches per minute of wire per amp by wire diameter.
//  - Arc voltage for short-circuit transfer: V = 14 + 0.05 I (common setting rule, estimated).
//  - Arc efficiency 0.8 for GMAW (EN 1011-1, thermal efficiency factor k).
//  - Heat input Q = eta V I / v; fusion band 0.1-0.3 kJ/mm per mm of plate (shop rule, estimated).
//  - Cooling: Rosenthal's moving line source, thick and thin plate, with the transition thickness of EN 1011-2.
//  - Strength at temperature: EN 1993-1-2 (carbon and stainless steel), EN 1999-1-2 (aluminium 6061-T6).
//  - Weld group: the elastic "weld as an area" method (AISC Manual Part 8 / Blodgett), each bead segment a thin
//    rectangle of its own throat and strength.

import type { WeldClass } from './joining';

export interface Wire {
  id: string;
  label: string;
  /** Wire diameter, m. */
  d: number;
  /** Which base metal it is for (see fillerMatches in the registry) and the filler it deposits. */
  filler: string;
  base: WeldClass;
  /** Inches per minute of wire per amp (Miller rule of thumb). */
  ipmPerAmp: number;
  source: string;
}

export const WIRES: Record<string, Wire> = {
  'ER70S-6-0.8': { id: 'ER70S-6-0.8', label: 'ER70S-6 0.8 mm (mild steel)', d: 0.0008, filler: 'E70', base: 'steel', ipmPerAmp: 2.0, source: 'Miller: .030 in wire ~2 in/min per amp' },
  'ER70S-6-0.9': { id: 'ER70S-6-0.9', label: 'ER70S-6 0.9 mm (mild steel)', d: 0.0009, filler: 'E70', base: 'steel', ipmPerAmp: 1.6, source: 'Miller: .035 in wire ~1.6 in/min per amp' },
  'ER308L-0.9': { id: 'ER308L-0.9', label: 'ER308L 0.9 mm (stainless)', d: 0.0009, filler: 'ER308L', base: 'stainless', ipmPerAmp: 1.6, source: 'as ER70S-6 0.9 mm (estimated)' },
  'ER4043-1.2': { id: 'ER4043-1.2', label: 'ER4043 1.2 mm (aluminium, spool gun)', d: 0.0012, filler: 'ER4043', base: 'aluminum', ipmPerAmp: 2.2, source: 'estimated from aluminium MIG charts' },
};

export interface Gas {
  id: string;
  label: string;
  /** Shielding quality for each base metal family (1 = right gas, lower = porosity). */
  shields: Partial<Record<WeldClass, number>>;
}

export const GASES: Record<string, Gas> = {
  C25: { id: 'C25', label: '75% Ar / 25% CO₂', shields: { steel: 1, stainless: 0.8 } },
  CO2: { id: 'CO2', label: '100% CO₂', shields: { steel: 0.95, stainless: 0.4 } },
  Ar: { id: 'Ar', label: '100% argon', shields: { aluminum: 1, steel: 0.7, stainless: 0.7 } },
  none: { id: 'none', label: 'No gas', shields: {} },
};

/** GMAW arc (thermal) efficiency, EN 1011-1. */
export const GMAW_EFFICIENCY = 0.8;
/** Fraction of the wire that ends up in the bead in short-circuit transfer (the rest is spatter), estimated. */
export const DEPOSITION_EFFICIENCY = 0.93;

const IPM_PER_M_PER_MIN = 39.37;

/** Welding current from wire feed speed (m/min), Miller's rule of thumb. */
export function migCurrent(wire: Wire, wfs: number) {
  return (wfs * IPM_PER_M_PER_MIN) / wire.ipmPerAmp;
}

/** Arc voltage that suits a current in short-circuit transfer (estimated setting rule). */
export function optimalVoltage(amps: number) {
  return 14 + 0.05 * amps;
}

/** Wire feed speed (m/min) and voltage a welder would start from for a plate thickness: ~1 A per 0.001 in. */
export function suggestedSettings(wire: Wire, thickness: number) {
  const amps = Math.min(250, Math.max(40, thickness / 0.0000254));
  const wfs = (amps * wire.ipmPerAmp) / IPM_PER_M_PER_MIN;
  // travel speed for a fillet leg equal to the plate thickness
  const leg = Math.max(0.002, thickness);
  const area = (leg * leg) / 2;
  const travel = ((wfs / 60) * wireArea(wire) * DEPOSITION_EFFICIENCY) / area;
  return { amps, wfs, volts: optimalVoltage(amps), travel };
}

export function wireArea(wire: Wire) {
  return (Math.PI / 4) * wire.d * wire.d;
}

/** Bead cross-section (m^2) and the equal-leg fillet it makes (m), from wire feed (m/min) and travel speed (m/s). */
export function beadSize(wire: Wire, wfs: number, travel: number) {
  const area = ((wfs / 60) * wireArea(wire) * DEPOSITION_EFFICIENCY) / Math.max(travel, 1e-4);
  return { area, leg: Math.sqrt(2 * area) };
}

/** Arc heat input per metre of weld, J/m: Q = eta V I / v. */
export function arcHeatInput(volts: number, amps: number, travel: number) {
  return (GMAW_EFFICIENCY * volts * amps) / Math.max(travel, 1e-4);
}

export interface FusionInput {
  /** Heat input, J/m. */
  Q: number;
  /** Thinner of the two parts at the joint, m. */
  thickness: number;
  volts: number;
  amps: number;
  /** Contact tip to work distance (torch nozzle to the pool), m. */
  ctwd: number;
  /** Shielding quality of the gas for this metal (1 = right gas). */
  shielding: number;
}

export interface Fusion {
  /** Fraction of the bead's throat that is sound, fused weld metal (0.05 .. 1). */
  q: number;
  coldLap: boolean;
  burnThrough: boolean;
  porosity: boolean;
  /** Arc out: too far from the work to strike. */
  noArc: boolean;
  why: string[];
}

/** How sound the deposited bead is: heat input for the thickness, arc voltage, torch distance, shielding gas. */
export function fusion(f: FusionInput): Fusion {
  const why: string[] = [];
  const tmm = Math.max(0.3, f.thickness * 1000);
  const QJmm = f.Q / 1000;
  // heat input band for the plate thickness (estimated shop rule: 0.1-0.3 kJ/mm per mm)
  const lo = 100 * tmm, hi = 300 * tmm;
  let qHeat = 1;
  let coldLap = false, burnThrough = false;
  if (QJmm < lo) {
    qHeat = Math.max(0.05, QJmm / lo);
    coldLap = qHeat < 0.7;
    why.push(`cold: ${(QJmm / 1000).toFixed(2)} kJ/mm for ${tmm.toFixed(1)} mm plate (aim ${(lo / 1000).toFixed(2)}-${(hi / 1000).toFixed(2)})`);
  } else if (QJmm > 2.5 * hi && tmm < 3) {
    qHeat = 0.3;
    burnThrough = true;
    why.push(`burn-through: ${(QJmm / 1000).toFixed(2)} kJ/mm is far too hot for ${tmm.toFixed(1)} mm sheet`);
  }
  // arc voltage against the current: too low stubs, too high spatters and wanders
  const dV = f.volts - optimalVoltage(f.amps);
  const qVolt = Math.abs(dV) <= 1.5 ? 1 : Math.max(0.5, 1 - (Math.abs(dV) - 1.5) / 7);
  if (qVolt < 1) why.push(dV < 0 ? `voltage ${Math.abs(dV).toFixed(1)} V low: wire stubbing` : `voltage ${dV.toFixed(1)} V high: long, spattery arc`);
  // torch distance: 8-18 mm is right; past 30 mm the arc will not hold
  const c = f.ctwd * 1000;
  const noArc = c > 30 || c < 1;
  const qDist = c < 8 ? Math.max(0.5, c / 8) : c <= 18 ? 1 : Math.max(0, 1 - (c - 18) / 12);
  if (qDist < 1 && !noArc) why.push(c < 8 ? 'torch too close' : `torch ${c.toFixed(0)} mm from the work: gas coverage lost`);
  const porosity = f.shielding < 0.9 || (c > 20 && c <= 30);
  const qGas = f.shielding <= 0 ? 0.2 : f.shielding;
  if (f.shielding < 0.9) why.push(f.shielding <= 0 ? 'no shielding gas: porous, brittle bead' : 'wrong shielding gas: porosity');
  const q = noArc ? 0 : Math.max(0.05, Math.min(1, qHeat * qVolt * qDist * qGas));
  return { q, coldLap, burnThrough, porosity, noArc, why };
}

// ---- cooling ------------------------------------------------------------------------------------

interface Thermal {
  /** Thermal conductivity, W/(m K), and volumetric heat capacity rho c, J/(m^3 K). */
  k: number;
  rhoC: number;
  /** Solidus, deg C: the bead starts here. */
  solidus: number;
}

const THERMAL: Record<WeldClass, Thermal> = {
  steel: { k: 45, rhoC: 7850 * 460, solidus: 1480 },
  stainless: { k: 16, rhoC: 7900 * 500, solidus: 1400 },
  aluminum: { k: 167, rhoC: 2700 * 900, solidus: 582 },
  copper: { k: 390, rhoC: 8940 * 385, solidus: 1065 },
  titanium: { k: 7, rhoC: 4430 * 526, solidus: 1600 },
  none: { k: 1, rhoC: 1e6, solidus: 100 },
};

/** EN 1011-2 shape factors for a single-run fillet weld on a T-joint (Table D.1): 3-D flow F3, 2-D flow F2. */
const F3 = 0.67, F2 = 0.56;

/**
 * Weld-metal temperature (deg C) a time t (s) after the arc passed. The curve shapes are Rosenthal's moving line
 * source: T - T0 ~ Q / t on thick plate (3-D heat flow), ~ (Q / d) / sqrt(t) on thin plate (2-D). Their constants are
 * EN 1011-2's (Annex D) cooling-time formulas for steel:
 *   thick:  t8/5 = (6700 - 5 T0) Q (1/(500-T0) - 1/(800-T0)) F3                   Q in kJ/mm
 *   thin:   t8/5 = (4300 - 4.3 T0) 1e5 (Q/d)^2 ((1/(500-T0))^2 - (1/(800-T0))^2) F2  d in mm
 * with the plate thick or thin by the transition thickness where the two agree. Other metals scale by their
 * conductivity (3-D) and conductivity x heat capacity (2-D) relative to steel (estimated). Capped at the solidus.
 * Q is the heat input into the work (arc efficiency already applied), J/m.
 */
export function weldTemperature(cls: WeldClass, Q: number, thickness: number, t: number, T0 = 20) {
  const th = THERMAL[cls] ?? THERMAL.steel;
  const st = THERMAL.steel;
  const q = Q / 1e6; // kJ/mm
  const d = Math.max(thickness * 1000, 0.3); // mm
  const c3 = (6700 - 5 * T0) * F3 * (st.k / th.k);
  const c2 = (4300 - 4.3 * T0) * 1e5 * F2 * ((st.k * st.rhoC) / (th.k * th.rhoC));
  const dt2 = (c2 / c3) * q * (1 / (500 - T0) + 1 / (800 - T0));
  const tt = Math.max(t, 1e-3);
  const rise = d * d >= dt2 ? (c3 * q) / tt : Math.sqrt((c2 * (q / d) ** 2) / tt);
  return Math.min(th.solidus, T0 + rise);
}

/** Cooling time from 800 to 500 deg C, s (the figure EN 1011-2 uses for steel welds). */
export function t85(cls: WeldClass, Q: number, thickness: number) {
  const find = (T: number) => {
    let lo = 1e-3, hi = 1e5;
    for (let i = 0; i < 80; i++) {
      const mid = Math.sqrt(lo * hi);
      if (weldTemperature(cls, Q, thickness, mid) > T) lo = mid; else hi = mid;
    }
    return Math.sqrt(lo * hi);
  };
  return find(500) - find(800);
}

// strength retention factors at temperature: [deg C, factor]
const K_STEEL: [number, number][] = [[20, 1], [400, 1], [500, 0.78], [600, 0.47], [700, 0.23], [800, 0.11], [900, 0.06], [1000, 0.04], [1100, 0.02], [1200, 0]];
const K_STAINLESS: [number, number][] = [[20, 1], [100, 0.82], [200, 0.68], [300, 0.64], [400, 0.6], [500, 0.54], [600, 0.49], [700, 0.4], [800, 0.27], [900, 0.14], [1000, 0.06], [1100, 0.03], [1200, 0]];
const K_ALUMINIUM: [number, number][] = [[20, 1], [100, 0.95], [150, 0.91], [200, 0.79], [250, 0.55], [300, 0.31], [350, 0.1], [550, 0]];

/**
 * Fraction of its room-temperature strength a weld keeps at temperature T: EN 1993-1-2 Table 3.1 (carbon steel,
 * k_y), Annex C (stainless 1.4301, k_0.2p), EN 1999-1-2 Table 1 (6061-T6). Copper and titanium follow steel's
 * curve (estimated).
 */
export function strengthAt(cls: WeldClass, T: number) {
  const table = cls === 'stainless' ? K_STAINLESS : cls === 'aluminum' ? K_ALUMINIUM : K_STEEL;
  if (T <= table[0]![0]) return 1;
  for (let i = 1; i < table.length; i++) {
    const [t1, k1] = table[i]!;
    const [t0, k0] = table[i - 1]!;
    if (T <= t1) return k0 + ((k1 - k0) * (T - t0)) / (t1 - t0);
  }
  return 0;
}

// ---- weld group ---------------------------------------------------------------------------------

/** One bead segment in the joint plane (x, z), the joint normal being y. */
export interface GroupBead {
  /** Segment ends in the joint plane, m. */
  a: [number, number];
  b: [number, number];
  /** Throat, m (0.707 x leg for an equal-leg fillet). */
  throat: number;
  /** Stress the throat can carry, Pa: 0.6 min(F_EXX, F_u,HAZ) x fusion x strength at temperature. */
  f: number;
}

/** Loads on the weld in the joint frame: y is the joint normal, x and z lie in the joint plane. */
export interface GroupLoads {
  /** Along y, tension positive (compression bears on the parts, not the weld). */
  axial: number;
  /** Shear force in the plane, N. */
  vx: number;
  vz: number;
  /** Bending moments about x and z, N m. */
  mx: number;
  mz: number;
  /** Torsion about y, N m. */
  torsion: number;
}

export interface WeldGroup {
  /** Throat area, m^2. */
  area: number;
  /** Second moments about the centroid in the joint plane (integral of z^2, x^2, x z; m^4) and polar. */
  Ixx: number;
  Izz: number;
  Ixz: number;
  J: number;
  /** Centroid of the throat area in the joint plane, m. */
  centroid: [number, number];
  /** Pure-load capacities (N, N m): what the weakest critical point allows under each load alone, bending about
   *  the group's weakest direction. */
  capacities: { tension: number; shear: number; bending: number; torsion: number };
  /** Utilisation under combined loads at the most stressed point: resultant stress / that bead's strength. */
  check(l: GroupLoads): { u: number; mode: string };
}

/**
 * Elastic "weld as an area" analysis (AISC Manual Part 8, Blodgett). Each segment is a thin rectangle, length x
 * throat, and the group is its union. At any point p = (x, z) of the group, relative to its centroid:
 *   normal stress  sigma = N/A + a x + b z   with the unsymmetric flexure formula
 *                  a = (Mz Ixx + Mx Ixz) / D,  b = -(Mx Izz + Mz Ixz) / D,  D = Ixx Izz - Ixz^2
 *   shear stress   tau = V/A + T (z, -x) / J
 * and a bead fails where sqrt(sigma^2 + |tau|^2) reaches its strength f (the fillet resultant check, without the
 * directional increase). Stresses are linear along a straight segment, so its ends are its extremes. Loads whose
 * sign relative to each other is not known (axial with bending, direct shear with torsion) are added in magnitude:
 * exact for one load at a time, conservative together.
 */
export function weldGroup(beads: GroupBead[]): WeldGroup {
  let area = 0, cx = 0, cz = 0;
  const segs = beads.map((b) => {
    const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1];
    const len = Math.hypot(dx, dz);
    const L = Math.max(len, b.throat); // a tack is at least as long as it is wide
    const u: [number, number] = len > 0 ? [dx / len, dz / len] : [1, 0];
    const mid: [number, number] = [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2];
    const A = L * b.throat;
    area += A;
    cx += A * mid[0];
    cz += A * mid[1];
    return { b, L, u, mid, A };
  });
  const zeroCap = { tension: 0, shear: 0, bending: 0, torsion: 0 };
  if (area <= 0) return { area: 0, Ixx: 0, Izz: 0, Ixz: 0, J: 0, centroid: [0, 0], capacities: zeroCap, check: () => ({ u: 99, mode: 'shear' }) };
  cx /= area; cz /= area;
  let Ixx = 0, Izz = 0, Ixz = 0;
  for (const s of segs) {
    const [ux, uz] = s.u, vx = -uz, vz = ux;
    const mx = s.mid[0] - cx, mz = s.mid[1] - cz;
    const long = (s.b.throat * s.L ** 3) / 12, thin = (s.L * s.b.throat ** 3) / 12;
    Ixx += s.A * mz * mz + long * uz * uz + thin * vz * vz;
    Izz += s.A * mx * mx + long * ux * ux + thin * vx * vx;
    Ixz += s.A * mx * mz + long * ux * uz + thin * vx * vz;
  }
  const D = Math.max(Ixx * Izz - Ixz * Ixz, 1e-30);
  const J = Math.max(Ixx + Izz, 1e-30);
  // check points: each segment's ends (plus its throat edges), relative to the centroid
  const points = segs.flatMap((s) => {
    const half = s.L / 2, [ux, uz] = s.u, e = s.b.throat / 2;
    const out: { x: number; z: number; f: number }[] = [];
    for (const sgn of [-1, 1]) for (const w of [-e, e]) {
      out.push({ x: s.mid[0] - cx + sgn * half * ux - w * uz, z: s.mid[1] - cz + sgn * half * uz + w * ux, f: Math.max(s.b.f, 1) });
    }
    return out;
  });
  const check = (l: GroupLoads) => {
    const a = (l.mz * Ixx + l.mx * Ixz) / D, b = -(l.mx * Izz + l.mz * Ixz) / D;
    const sN = Math.max(0, l.axial) / area, tV = Math.hypot(l.vx, l.vz) / area;
    let u = 0, mode = 'shear';
    for (const p of points) {
      const sM = Math.abs(a * p.x + b * p.z);
      const tT = (Math.abs(l.torsion) * Math.hypot(p.x, p.z)) / J;
      const ui = Math.hypot(sN + sM, tV + tT) / p.f;
      if (ui > u) {
        u = ui;
        const parts: [string, number][] = [['tension', sN], ['bending', sM], ['shear', tV], ['torsion', tT]];
        mode = parts.reduce((m, q) => (q[1] > m[1] ? q : m))[0];
      }
    }
    return { u, mode };
  };
  // pure capacities: the load at which u reaches 1 on its own (bending about the weakest in-plane direction)
  const cap = (l: (x: number) => GroupLoads) => 1 / Math.max(check(l(1)).u, 1e-30);
  let bending = Infinity;
  for (let i = 0; i < 36; i++) {
    const th = (i * Math.PI) / 36;
    bending = Math.min(bending, cap((m) => ({ axial: 0, vx: 0, vz: 0, mx: m * Math.cos(th), mz: m * Math.sin(th), torsion: 0 })));
  }
  const capacities = {
    tension: cap((n) => ({ axial: n, vx: 0, vz: 0, mx: 0, mz: 0, torsion: 0 })),
    shear: cap((v) => ({ axial: 0, vx: v, vz: 0, mx: 0, mz: 0, torsion: 0 })),
    bending,
    torsion: cap((t) => ({ axial: 0, vx: 0, vz: 0, mx: 0, mz: 0, torsion: t })),
  };
  return { area, Ixx, Izz, Ixz, J, centroid: [cx, cz], capacities, check };
}
