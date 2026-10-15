// Assorted mechanical relations: bearings, motors, drag, rubber, eddy brakes, gears, belts, cables.

import { lewisY } from './gears';

/** Rolling bearing friction torque, SKF simplified model: M = 0.5 mu P d. */
export const bearingFrictionTorque = (mu: number, load: number, boreDiameter: number) => 0.5 * mu * load * boreDiameter;

export const BEARING_FRICTION: Record<string, { mu: number; label: string; source: string }> = {
  'deep-groove-ball': { mu: 0.0015, label: 'Deep groove ball bearing', source: 'SKF rolling bearings catalogue, simplified friction model' },
  'angular-contact': { mu: 0.002, label: 'Angular contact ball bearing', source: 'SKF rolling bearings catalogue' },
  'cylindrical-roller': { mu: 0.0011, label: 'Cylindrical roller bearing', source: 'SKF rolling bearings catalogue' },
  'bronze-bushing': { mu: 0.08, label: 'Oil-impregnated bronze bushing', source: 'typical sintered bronze bushing (estimated)' },
  'ptfe-bushing': { mu: 0.08, label: 'PTFE-lined bushing', source: 'typical dry PTFE composite bushing (estimated)' },
  'plain-steel': { mu: 0.35, label: 'Plain steel pin, dry', source: 'dry steel-on-steel sliding (estimated)' },
};

export interface DcMotor {
  /** Supply voltage, V. */
  V: number;
  /** Speed constant, rpm per volt. */
  Kv: number;
  /** Winding resistance, ohm. */
  R: number;
  /** Gear reduction ratio (>= 1) and efficiency. */
  ratio: number;
  efficiency: number;
}

/** Linear torque-speed line of a brushed DC motor at the output shaft: returns torque (N m) at speed w (rad/s). */
export function dcMotorTorque(m: DcMotor, w: number) {
  const kvRad = (m.Kv * 2 * Math.PI) / 60; // rad/s per volt
  const Kt = 1 / kvRad; // N m per amp
  const w0 = (kvRad * m.V) / m.ratio;
  const stall = ((Kt * m.V) / m.R) * m.ratio * m.efficiency;
  if (w0 <= 0) return 0;
  return stall * (1 - Math.min(Math.max(w / w0, -1), 2));
}

export function dcMotorSpecs(m: DcMotor) {
  const kvRad = (m.Kv * 2 * Math.PI) / 60;
  const Kt = 1 / kvRad;
  return {
    noLoadSpeed: (kvRad * m.V) / m.ratio,
    stallTorque: ((Kt * m.V) / m.R) * m.ratio * m.efficiency,
    stallCurrent: m.V / m.R,
  };
}

/** Aerodynamic / hydrodynamic drag magnitude F = 0.5 rho Cd A v^2. */
export const dragForce = (rho: number, Cd: number, A: number, v: number) => 0.5 * rho * Cd * A * v * v;


/**
 * Tension-only neo-Hookean band: nominal stress P = G (lambda - lambda^-2); F = P A0 for lambda >= 1.
 */
export function neoHookeanBandForce(G: number, A0: number, stretch: number) {
  if (stretch <= 1) return 0;
  return G * A0 * (stretch - 1 / (stretch * stretch));
}

/**
 * Eddy-current brake damping coefficient for a thin conductive disc passing through a magnet gap:
 * torque = c w with c ~ k sigma t B^2 A R^2 (low-speed limit; k accounts for return-path/edge losses).
 */
export function eddyDamping(sigma: number, thickness: number, B: number, poleArea: number, radius: number, k = 0.5) {
  return k * sigma * thickness * B * B * poleArea * radius * radius;
}

/** Skin depth in the conductor at frequency f: delta = 1 / sqrt(pi f mu0 sigma). */
export function skinDepth(f: number, sigma: number, mu0 = 4e-7 * Math.PI) {
  return 1 / Math.sqrt(Math.PI * Math.max(f, 1e-6) * mu0 * sigma);
}

/** Lewis form factor Y for 20° full-depth teeth (Shigley Table 14-2).
 *
 *  ONE TABLE, NOT TWO. This file held its own copy of the 26-row table beside the one in engineering/gears.ts —
 *  the same figures from the same table in the same book, in two places, where an edit to one would silently
 *  disagree with the other. `parts/drive.ts` judges a gear tooth through gears.ts, so that is the owner, and this
 *  keeps the name this file has always exported. (A third copy, in ganglia/laws.ts, went with that file in the
 *  same round.) */
export const lewisFormFactor = (teeth: number): number => lewisY(teeth);

/** Lewis bending stress sigma = W_t / (b m Y) (metric form). */
export const lewisStress = (Wt: number, faceWidth: number, module: number, Y: number) => Wt / (faceWidth * module * Y);

/** Max tangential tooth load before the root yields. */
export const gearToothCapacity = (yieldStress: number, faceWidth: number, module: number, teeth: number) =>
  yieldStress * faceWidth * module * lewisFormFactor(teeth);

/** Capstan (Euler-Eytelwein): T_load / T_hold = e^(mu theta). */
export const capstanRatio = (mu: number, wrapAngle: number) => Math.exp(mu * wrapAngle);

/** Fibre and wire ropes: minimum breaking strength model F = k d^2 (d in metres). k from grade tables (estimated). */
/**
 * Ropes, cables, chain. MBS model F = k d^2 (d in metres); `density` is the effective density over the
 * nominal circle pi d^2 / 4 (mass per metre / area), so rope weight comes out right.
 */
export const ROPE_GRADES: Record<string, { label: string; k: number; E: number; density: number; source: string }> = {
  'steel-wire-6x19': { label: 'Steel wire rope 6x19 IWRC', k: 5.8e8, E: 100e9, density: 5100, source: 'EN 12385-4 grade 1770 (MBS ~ 0.58 d^2 kN, d in mm)' },
  'nylon-3-strand': { label: 'Nylon 3-strand', k: 1.7e8, E: 2.5e9, density: 900, source: 'Cordage Institute typical MBS (estimated)' },
  'polyester-braid': { label: 'Polyester double braid', k: 2.2e8, E: 5e9, density: 1100, source: 'Cordage Institute typical MBS (estimated)' },
  'dyneema-12-strand': { label: 'UHMWPE (Dyneema) 12-strand', k: 8e8, E: 60e9, density: 600, source: 'manufacturer typical MBS (estimated)' },
  'paracord-550': { label: 'Paracord 550', k: 1.5e8, E: 1.5e9, density: 600, source: 'MIL-C-5040 type III: 550 lbf (2.45 kN) at ~4 mm' },
  'grade-80-chain': { label: 'Grade 80 alloy chain', k: 1.23e9, E: 200e9, density: 28000, source: 'EN 818-2 grade 8: MBS = 4 x WLL (10 mm: 3.15 t WLL)' },
};

export const ropeBreakingLoad = (grade: keyof typeof ROPE_GRADES | string, d: number) => (ROPE_GRADES[grade]?.k ?? 1.5e8) * d * d;
