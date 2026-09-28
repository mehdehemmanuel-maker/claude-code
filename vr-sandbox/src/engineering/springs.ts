// Helical spring design per Shigley's Mechanical Engineering Design (10th ed.), chapter 10.
// Lengths in metres, forces in newtons, stresses in pascals.

export interface SpringWire {
  id: string;
  label: string;
  /** Shigley Table 10-4: S_ut = A / d^m with d in mm, S_ut in MPa. */
  A: number;
  m: number;
  /** Shear modulus, Pa (Table 10-5). */
  G: number;
  /** Young's modulus, Pa (Table 10-5). */
  E: number;
  density: number;
  /** Static allowable torsional stress as a fraction of S_ut (Table 10-6, set not removed). */
  allowableFraction: number;
  source: string;
}

export const SPRING_WIRES: Record<string, SpringWire> = {
  'music-wire-a228': {
    id: 'music-wire-a228', label: 'Music wire (ASTM A228)', A: 2211, m: 0.145, G: 81.7e9, E: 203.4e9,
    density: 7850, allowableFraction: 0.45, source: 'Shigley 10th ed. Tables 10-4, 10-5, 10-6',
  },
  'oil-tempered-a229': {
    id: 'oil-tempered-a229', label: 'Oil-tempered wire (ASTM A229)', A: 1855, m: 0.187, G: 77.2e9, E: 196.5e9,
    density: 7850, allowableFraction: 0.5, source: 'Shigley 10th ed. Tables 10-4, 10-5, 10-6',
  },
  'hard-drawn-a227': {
    id: 'hard-drawn-a227', label: 'Hard-drawn wire (ASTM A227)', A: 1783, m: 0.19, G: 80.0e9, E: 196.5e9,
    density: 7850, allowableFraction: 0.45, source: 'Shigley 10th ed. Tables 10-4, 10-5, 10-6',
  },
  'chrome-silicon-a401': {
    id: 'chrome-silicon-a401', label: 'Chrome-silicon (ASTM A401)', A: 1974, m: 0.108, G: 77.2e9, E: 203.4e9,
    density: 7850, allowableFraction: 0.5, source: 'Shigley 10th ed. Tables 10-4, 10-5, 10-6',
  },
  'stainless-302-a313': {
    id: 'stainless-302-a313', label: 'Stainless 302 (ASTM A313)', A: 1867, m: 0.146, G: 69.0e9, E: 193e9,
    density: 7920, allowableFraction: 0.35, source: 'Shigley 10th ed. Tables 10-4, 10-5, 10-6',
  },
};

export interface CoilSpring {
  /** Wire diameter d, m. */
  d: number;
  /** Mean coil diameter D, m. */
  D: number;
  /** Active coils N_a. */
  Na: number;
  /** Free length L0, m. */
  L0: number;
  wire: SpringWire;
}

/** Spring rate k = d^4 G / (8 D^3 N_a)  (Shigley eq. 10-9). */
export const springRate = (s: CoilSpring) => (s.d ** 4 * s.wire.G) / (8 * s.D ** 3 * s.Na);

/** Spring index C = D / d. */
export const springIndex = (s: CoilSpring) => s.D / s.d;

/** Bergstrasser curvature factor K_B = (4C + 2) / (4C - 3)  (Shigley eq. 10-5). */
export function bergstrasser(C: number) {
  return (4 * C + 2) / (4 * C - 3);
}

/** Wahl factor K_W = (4C - 1)/(4C - 4) + 0.615/C. */
export function wahl(C: number) {
  return (4 * C - 1) / (4 * C - 4) + 0.615 / C;
}

/** Corrected shear stress for axial load F: tau = K_B 8 F D / (pi d^3). */
export function shearStress(s: CoilSpring, F: number) {
  return (bergstrasser(springIndex(s)) * 8 * F * s.D) / (Math.PI * s.d ** 3);
}

/** Minimum tensile strength of the wire S_ut = A / d^m (d in mm), Pa. */
export function wireUltimate(s: CoilSpring) {
  return (s.wire.A / (s.d * 1000) ** s.wire.m) * 1e6;
}

/** Static allowable torsional stress S_sy, Pa. */
export const allowableShear = (s: CoilSpring) => s.wire.allowableFraction * wireUltimate(s);

/** Solid length for squared-and-ground ends: L_s = d (N_a + 2). */
export const solidLength = (s: CoilSpring) => s.d * (s.Na + 2);

/** Force at which the spring takes a permanent set. */
export const yieldForce = (s: CoilSpring) => (allowableShear(s) * Math.PI * s.d ** 3) / (bergstrasser(springIndex(s)) * 8 * s.D);

/**
 * Fundamental surge (standing-wave) frequency, spring between flat parallel plates:
 * f = (2 d / (pi D^2 N_a)) sqrt(G / (32 rho))  (Shigley eq. 10-25, SI form).
 * This is the frequency you actually hear when a coil spring "boings".
 */
export function surgeFrequency(s: CoilSpring) {
  return ((2 * s.d) / (Math.PI * s.D ** 2 * s.Na)) * Math.sqrt(s.wire.G / (32 * s.wire.density));
}

/** Mass of the wire (active + 2 dead coils). */
export function springMass(s: CoilSpring) {
  const wireLength = Math.PI * s.D * (s.Na + 2);
  return s.wire.density * (Math.PI / 4) * s.d ** 2 * wireLength;
}

/** Stored elastic energy at deflection x: U = 1/2 k x^2. */
export const storedEnergy = (k: number, x: number) => 0.5 * k * x * x;

/** Helical torsion spring rate per radian, Shigley eq. 10-51: k' = d^4 E / (10.8 D N) per turn. */
export function torsionSpringRate(d: number, D: number, N: number, E: number) {
  return (d ** 4 * E) / (10.8 * D * N) / (2 * Math.PI);
}
