// Motors and gearheads as their makers publish them. A motor here is a thing you can buy: its constants are the ones on
// its datasheet (or, where a seller gives only a rated point, derived from that point by the motor's own equations in
// engineering/dcmotor.ts, never typed in), its size and mass are the real ones, and how it heats and how hot its
// winding may run come from the same sheet. What a sheet doesn't give is said to be estimated, and how.

export interface MotorData {
  id: string;
  label: string;
  /** Nominal voltage, V. */
  V: number;
  /**
   * What the maker publishes, in their units: speeds rpm, currents A, torques N m, resistance ohm (at 25 C). Either the
   * constants (torque constant and terminal resistance), or a rated operating point the constants follow from.
   */
  published: {
    noLoadSpeed?: number;
    noLoadCurrent: number;
    stallCurrent?: number;
    stallTorque?: number;
    terminalR?: number;
    torqueConstant?: number;
    rated?: { speed: number; current: number; power: number };
  };
  /** Most current it carries continuously without overheating (the datasheet's nominal current), A. */
  maxContinuousCurrent: number;
  mass: number;
  /** The body: diameter and length, m; the output shaft's diameter. */
  diameter: number;
  length: number;
  shaft: number;
  /** Rotor inertia, kg m^2. */
  rotorInertia?: number;
  /**
   * How it heats: thermal resistance winding to housing and housing to air (K/W), time constants of the winding and the
   * whole motor (s), and the hottest its winding insulation stands (deg C). Null where the sheet gives none: then they
   * are worked out from the motor's size (engineering/dcmotor.ts, estimatedThermal).
   */
  thermal: { Rwh: number; Rha: number; tauW: number; tauM: number; maxWinding: number } | null;
  /** What it sells for, where and when that was seen (prices move). */
  price?: Price;
  /** The insulation's limit when the sheet gives no thermal data, deg C, and why. */
  insulation?: { maxWinding: number; note: string };
  source: string;
}

export interface Price {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  /** Year and month it was seen at. */
  seen: string;
  note: string;
}

export interface GearheadData {
  id: string;
  label: string;
  ratio: number;
  /** Maximum efficiency (the maker's figure; less at light load). */
  efficiency: number;
  /** Output torque it carries continuously, N m. */
  maxContinuousTorque: number;
  /** What its output bearing takes: radial (N, at `radialAt` m from the flange) and axial (N). */
  maxRadial: number;
  radialAt: number;
  maxAxial: number;
  mass: number;
  diameter: number;
  length: number;
  /** Output shaft diameter, m. */
  shaft: number;
  price?: Price;
  /** The motors it is made to mount on. */
  fits: string[];
  source: string;
}

export const MOTORS: Record<string, MotorData> = {
  'maxon.re40-148867': {
    id: 'maxon.re40-148867', label: 'maxon RE 40, 24 V, 150 W (148867)', V: 24,
    published: { noLoadSpeed: 7580, noLoadCurrent: 0.137, stallCurrent: 80.2, stallTorque: 2.42, terminalR: 0.299, torqueConstant: 0.0302 },
    maxContinuousCurrent: 6,
    mass: 0.48, diameter: 0.04, length: 0.071, shaft: 0.006,
    rotorInertia: 142e-7,
    thermal: { Rwh: 1.93, Rha: 4.65, tauW: 42.8, tauM: 809, maxWinding: 155 },
    price: { amount: 502.09, currency: 'EUR', seen: '2026-10', note: 'maxon online shop, 1 to 4 units, the RE 40 150 W graphite page (148866, the 12 V winding; the 24 V one not confirmed)' },
    source: 'maxon RE 40 Ø40 mm, graphite brushes, 150 W, order no. 148867 (24 V winding), current maxon online data: K_t 30.2 mN·m/A, 317 rpm/V, R 0.299 Ω, no-load 7580 rpm at 137 mA, stall 2420 mN·m, nominal 6 A, rotor 142 g·cm², R_th 1.93 + 4.65 K/W, τ 42.8 s winding and 809 s motor, 480 g. (148866 is the 12 V winding; older catalogue editions give R 0.317 Ω, τ_motor 1120 s.)',
  },
  'unite.my1016': {
    id: 'unite.my1016', label: 'Unite MY1016, 24 V, 250 W brushed', V: 24,
    // sellers' figures for this motor vary; this set is the one that is consistent with itself: 250 W out at 2750 rpm
    // drawing 13.7 A, 1.4 A with no load (listed 0.7 to 2.2 A). Its stall torque is also published (6.82 N m), and is
    // what the derived constants are checked against.
    published: { noLoadCurrent: 1.4, rated: { speed: 2750, current: 13.7, power: 250 }, stallTorque: 6.82 },
    maxContinuousCurrent: 13.7,
    mass: 2.12, diameter: 0.1, length: 0.085, shaft: 0.008,
    thermal: null,
    insulation: { maxWinding: 130, note: 'insulation class not published: class B (130 °C), usual for such motors, assumed' },
    source: 'Unite MY1016 24 V 250 W sellers\' data (rated 2750 rpm, 13.7 A, 250 W; no-load 0.7 to 2.2 A; stall 682 N·cm; 2.12 kg; case Ø100 × 85 mm). Shaft Ø8 mm estimated.',
  },
};

export const GEARHEADS: Record<string, GearheadData> = {
  'maxon.gp42c-203115': {
    id: 'maxon.gp42c-203115', label: 'maxon GP 42 C planetary gearhead, 12:1, 2 stages (203115)', ratio: 12, efficiency: 0.81,
    maxContinuousTorque: 7.5, maxRadial: 240, radialAt: 0.012, maxAxial: 150,
    mass: 0.36, diameter: 0.042, length: 0.0555, shaft: 0.012,
    fits: ['maxon.re40-148867'],
    price: { amount: 234.36, currency: 'EUR', seen: '2026-10', note: 'maxon online shop, GP 42 C 12:1 ceramic version, 1 to 4 units, before VAT and shipping' },
    source: 'maxon planetary gearhead GP 42 C Ø42 mm, 3 to 15 N·m, ceramic version, order no. 203115, current maxon data: 12:1, 2 stages, 81% max efficiency, 7.5 N·m continuous, ball-bearing output, 240 N radial 12 mm from the flange (older catalogue editions: 360 N), 150 N axial, 360 g, 55.5 mm long, Ø12 mm shaft',
  },
};

export const getMotor = (id: string) => MOTORS[id] ?? MOTORS['maxon.re40-148867']!;
export const getGearhead = (id: string) => (id === 'none' ? null : GEARHEADS[id] ?? null);
