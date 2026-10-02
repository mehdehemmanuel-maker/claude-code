// The electrical side of a powered machine: a battery pack and the motors wired to it, solved together each step. A
// motor's controller applies a share u of the pack's terminal voltage (PWM); the motor's current is that voltage, less
// its back-EMF, through its winding and its wire; the controller limits it, and (a plain brushed controller) won't let
// the motor push current back into the pack. The pack's terminal voltage is its open-circuit voltage less its internal
// resistance times all it is giving, so motors sharing a pack load each other. A flat pack gives nothing.

import { drain, flat, packOCV, packR, type Pack } from '../engineering/battery';
import type { MotorModel } from '../engineering/dcmotor';

export interface Load {
  model: MotorModel;
  /** Duty the controller applies, -1..1 (sign: which way it drives the motor). */
  u: number;
  /** Motor shaft speed, rad/s, positive the way positive u drives it. */
  w: number;
  /** Winding (at its temperature) plus wire resistance, ohm. */
  R: number;
  /** The controller's current limit, A. */
  limit: number;
  /** A burnt winding carries nothing. */
  dead: boolean;
}

export interface PackSolve {
  /** Terminal voltage, V; current the pack gives, A; each load's motor current, A. */
  V: number;
  I: number;
  currents: number[];
  flat: boolean;
}

/** One load's current at terminal voltage V. */
function loadCurrent(l: Load, V: number): number {
  if (l.dead || l.u === 0) return 0;
  let i = (l.u * V - l.model.Kt * l.w) / l.R;
  // a plain brushed controller doesn't regenerate: driven faster than it drives, the motor just freewheels
  if (Math.sign(i) !== Math.sign(l.u)) i = 0;
  return Math.max(-l.limit, Math.min(l.limit, i));
}

/** The pack and its loads at state of charge `soc`, solved for the terminal voltage (a fixed point, fast to converge). */
export function solvePack(pack: Pack, soc: number, loads: Load[]): PackSolve {
  const ocv = packOCV(pack, soc), Rp = packR(pack);
  if (soc <= 0) return { V: 0, I: 0, currents: loads.map(() => 0), flat: true };
  let V = ocv, currents = loads.map(() => 0), I = 0;
  for (let it = 0; it < 12; it++) {
    currents = loads.map((l) => loadCurrent(l, V));
    // a PWM controller draws its duty's share of the motor's current from the pack
    I = loads.reduce((s, l, k) => s + Math.abs(l.u) * Math.abs(currents[k]!), 0);
    const next = ocv - Rp * I;
    if (Math.abs(next - V) < 1e-7) { V = next; break; }
    V = next;
  }
  if (flat(pack, soc, I)) return { V: Math.max(0, ocv - Rp * I), I: 0, currents: loads.map(() => 0), flat: true };
  return { V, I, currents, flat: false };
}

/** The pack's state after giving I for dt. */
export const drawn = (pack: Pack, soc: number, I: number, dt: number) => drain(pack, soc, I, dt);
