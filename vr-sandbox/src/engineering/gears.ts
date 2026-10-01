// Spur gears, as a machine designer sizes them. Two gears mesh only when their teeth are the same size (module) and
// shape (pressure angle) and their axles sit exactly one pitch radius apart each. Then they turn at the inverse
// ratio of their teeth, opposite ways, and pass torque up by the same ratio, less what sliding friction at the teeth
// turns into heat. A tooth breaks when the force it carries bends it past what its material holds (Lewis).

import type { Material } from '../data/materials';

/** ISO 54 first-choice modules, m (0.5 mm to 10 mm). */
export const MODULES = [0.0005, 0.0008, 0.001, 0.00125, 0.0015, 0.002, 0.0025, 0.003, 0.004, 0.005, 0.006, 0.008, 0.01];

/** Standard pressure angle, ISO 53. */
export const PRESSURE_ANGLE = (20 * Math.PI) / 180;

/** Fewest teeth a 20 deg full-depth gear can have without its generating cutter undercutting the roots. */
export const MIN_TEETH = 17;

export interface GearGeometry {
  /** Module, m: pitch diameter per tooth. */
  module: number;
  teeth: number;
  /** Face width, m. */
  width: number;
}

/** ISO 53 basic rack: addendum 1 m, dedendum 1.25 m. */
export function gearDims(g: GearGeometry) {
  const d = g.module * g.teeth;
  return { pitch: d, outside: d + 2 * g.module, root: d - 2.5 * g.module, base: d * Math.cos(PRESSURE_ANGLE) };
}

/** Where two gears must sit to mesh: their centre distance, m. Null if their teeth can't mesh at all. */
export function centreDistance(a: GearGeometry, b: GearGeometry): number | null {
  if (Math.abs(a.module - b.module) > 1e-9) return null;
  return (a.module * (a.teeth + b.teeth)) / 2;
}

/**
 * Whether two gears on parallel axles `dist` apart mesh: same module, the right centre distance within the working
 * backlash (a small fraction of a module), and faces that overlap along the axles.
 */
export function meshes(a: GearGeometry, b: GearGeometry, dist: number, faceOverlap: number): boolean {
  const c = centreDistance(a, b);
  if (c === null) return false;
  return Math.abs(dist - c) <= 0.25 * a.module && faceOverlap >= 0.5 * Math.min(a.width, b.width);
}

/** Speed ratio driven / driver: the driven gear turns z_driver / z_driven as fast, the other way. */
export const speedRatio = (driver: GearGeometry, driven: GearGeometry) => -driver.teeth / driven.teeth;

/**
 * Lewis form factor Y for 20 deg full-depth teeth (Shigley's Mechanical Engineering Design, table 14-2), interpolated
 * in the number of teeth.
 */
const LEWIS: [number, number][] = [
  [12, 0.245], [13, 0.261], [14, 0.277], [15, 0.29], [16, 0.296], [17, 0.303], [18, 0.309], [19, 0.314], [20, 0.322],
  [21, 0.328], [22, 0.331], [24, 0.337], [26, 0.346], [28, 0.353], [30, 0.359], [34, 0.371], [38, 0.384], [43, 0.397],
  [50, 0.409], [60, 0.422], [75, 0.435], [100, 0.447], [150, 0.46], [300, 0.472], [400, 0.48],
];

export function lewisY(teeth: number): number {
  if (teeth <= LEWIS[0]![0]) return LEWIS[0]![1];
  for (let i = 1; i < LEWIS.length; i++) {
    const [z1, y1] = LEWIS[i - 1]!, [z2, y2] = LEWIS[i]!;
    if (teeth <= z2) return y1 + ((y2 - y1) * (teeth - z1)) / (z2 - z1);
  }
  return 0.485; // a rack
}

/** Barth's dynamic factor for cut or milled teeth: faster pitch lines hit harder. V in m/s. */
export const velocityFactor = (V: number) => (6.1 + Math.abs(V)) / 6.1;

/** The bending stress at a tooth root carrying tangential force Ft (N) at pitch-line speed V (m/s), Pa (Lewis). */
export function toothStress(g: GearGeometry, Ft: number, V = 0): number {
  return (velocityFactor(V) * Math.abs(Ft)) / (g.width * g.module * lewisY(g.teeth));
}

/**
 * The most torque a gear's teeth pass before one breaks, N m: the Lewis stress at the root reaching what the material
 * holds (yield for a ductile tooth, which bends over and strips; its strength for a brittle one, which snaps).
 */
export function toothTorque(g: GearGeometry, m: Material, V = 0): number {
  const S = m.ductile ? m.yield : m.ultimate;
  const Ft = (S * g.width * g.module * lewisY(g.teeth)) / velocityFactor(V);
  return (Ft * (g.module * g.teeth)) / 2;
}

/**
 * Efficiency of one external spur mesh: the teeth slide on each other either side of the pitch point, losing about
 * pi mu (1/z1 + 1/z2) of the power (the standard approximation for full-depth teeth, e.g. Niemann and Winter,
 * Maschinenelemente II): 98-99% with oil (mu about 0.05), less dry. What is lost becomes heat at the teeth.
 */
export function meshEfficiency(a: GearGeometry, b: GearGeometry, mu: number): number {
  return Math.max(0, 1 - Math.PI * mu * (1 / a.teeth + 1 / b.teeth));
}
