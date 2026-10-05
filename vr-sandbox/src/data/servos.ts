// Hobby servos as their class datasheets publish them, brand-free: a case with a motor, a gear train and a
// proportional controller inside, an output shaft on one broad face. What a maker publishes is the stall torque and
// the unloaded speed at a rated voltage, the stall and idle currents, the case and its mass; what no maker publishes
// (the rotor's inertia at the horn, the loop's damping, the shaft's offset to the millimetre) is an estimate, and says so.

export interface ServoData {
  id: string;
  label: string;
  /** Rated supply, V: the figures below are at this voltage. Torque and speed scale with the voltage applied. */
  V: number;
  /** Stall torque at V, N m; unloaded speed at V, rad/s. */
  stallTorque: number;
  noLoadSpeed: number;
  /** Current at stall and running unloaded, A, at V. */
  stallCurrent: number;
  idleCurrent: number;
  /** The proportional loop reaches full voltage this far off its target, rad (Wada et al., IEEE CCA 2009: a few degrees). */
  band: number;
  /** Travel each way from centre, rad. */
  travel: number;
  /** The motor's rotor as the horn feels it (J N²), kg m²: an estimate from the unloaded speed and typical gearing. */
  rotor: number;
  mass: number;
  /** The case, m: its length (the shaft sits on this axis), its width, and its height along the shaft's axis. */
  dims: [number, number, number];
  /** The output shaft's centre from one end of the case along its length, m; the horn's thickness off the shaft face, m. */
  shaftFromEnd: number;
  horn: number;
  shaftDiameter: number;
  source: string;
}

export const SERVOS: Record<string, ServoData> = {
  'servo.micro-9g': {
    id: 'servo.micro-9g', label: 'Micro servo, 9 g class (1.8 kgf cm at 4.8 V)',
    V: 4.8, stallTorque: 0.176, noLoadSpeed: 10.5, stallCurrent: 0.65, idleCurrent: 0.01,
    band: 0.1, travel: Math.PI / 2,
    // 2e-3 s² per N m of stall: a 20 ms spin-up through 150:1 to 180:1 gears (docs/FRONTIER.md A-deer-trot)
    rotor: 2e-3 * 0.176,
    mass: 0.009, dims: [0.023, 0.0122, 0.029], shaftFromEnd: 0.0065, horn: 0.003, shaftDiameter: 0.005,
    source: 'the common 9 g micro servo class datasheet: 1.8 kgf cm and 0.1 s/60° at 4.8 V, about 650 mA stall, 23 × 12.2 × 29 mm with tabs, 9 g; the rotor inertia, loop damping and shaft offset are estimates',
  },
  'servo.standard-20kg': {
    id: 'servo.standard-20kg', label: 'Standard servo, 20 kg class (20 kgf cm at 6 V, metal gears)',
    V: 6.0, stallTorque: 1.96, noLoadSpeed: 6.5, stallCurrent: 2.5, idleCurrent: 0.01,
    band: 0.1, travel: Math.PI / 2,
    rotor: 2e-3 * 1.96,
    mass: 0.06, dims: [0.04, 0.02, 0.0405], shaftFromEnd: 0.01, horn: 0.004, shaftDiameter: 0.006,
    source: 'the common 20 kg standard servo class datasheet: 20 kgf cm and 0.16 s/60° at 6 V, about 2.5 A stall, 40 × 20 × 40.5 mm, 60 g; rotor inertia, loop damping and shaft offset are estimates',
  },
  'servo.large-60kg': {
    id: 'servo.large-60kg', label: 'Large servo, 60 kg class (60 kgf cm at 7.4 V, steel gears)',
    V: 7.4, stallTorque: 5.9, noLoadSpeed: 7.0, stallCurrent: 4.5, idleCurrent: 0.012,
    band: 0.1, travel: Math.PI / 2,
    rotor: 2e-3 * 5.9,
    mass: 0.16, dims: [0.065, 0.03, 0.048], shaftFromEnd: 0.016, horn: 0.005, shaftDiameter: 0.008,
    source: 'the common 60 kg large servo class datasheet: 60 kgf cm and 0.15 s/60° at 7.4 V, about 4.5 A stall, 65 × 30 × 48 mm, 160 g; rotor inertia, loop damping and shaft offset are estimates',
  },
  'servo.giant-150kg': {
    id: 'servo.giant-150kg', label: 'Giant servo, 150 kg class (150 kgf cm at 8.4 V, steel gears)',
    V: 8.4, stallTorque: 14.7, noLoadSpeed: 8.7, stallCurrent: 8, idleCurrent: 0.02,
    band: 0.1, travel: Math.PI / 2,
    rotor: 2e-3 * 14.7,
    mass: 0.2, dims: [0.066, 0.03, 0.055], shaftFromEnd: 0.016, horn: 0.006, shaftDiameter: 0.008,
    source: 'the 150 kg high-voltage servo class sold for 1/5-scale vehicles and large steering: 150 kgf cm and 0.12 s/60° at 8.4 V, 66 × 30 × 55 mm, about 200 g; stall current (8 A), rotor inertia, loop damping and shaft offset are estimates',
  },
};

/** A servo's datasheet by id. An id no maker publishes is not a servo: nothing stands in for it. */
export function getServo(id: string): ServoData {
  const sv = SERVOS[id];
  if (!sv) throw new Error(`No servo is published as "${id}"`);
  return sv;
}

/** The quarter turn about x that carries a frame's y (a hinge's axis) onto z, the shaft's axis. */
export const SHAFT_Q: [number, number, number, number] = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];

/**
 * A servo's output shaft in its own coordinates: on its +z face (the face its height is measured along), centred
 * across its width, `shaftFromEnd` from its +x end. A servo horn joint is made here and nowhere else.
 */
export function shaftOf(sv: ServoData): { p: [number, number, number]; q: [number, number, number, number] } {
  const [l, , h] = sv.dims;
  return { p: [l / 2 - sv.shaftFromEnd, 0, h / 2], q: SHAFT_Q };
}

/**
 * A small controller board (a microcontroller with a regulator and servo headers), as such boards are: an estimate
 * of its draw and its size; what it does is its program, kept on the part (a rhythm) and sent down signal leads.
 */
export const CONTROLLER_BOARD = { dims: [0.04, 0.006, 0.025] as [number, number, number], mass: 0.008, idleCurrent: 0.03, minVolts: 3.3 };

/**
 * A radio receiver board (what your sticks reach a machine through), as such boards are: an estimate of its draw and
 * its size. Each of its channels goes down a signal lead to one servo.
 */
export const RECEIVER_BOARD = { dims: [0.03, 0.005, 0.02] as [number, number, number], mass: 0.004, idleCurrent: 0.02, minVolts: 3.3 };
