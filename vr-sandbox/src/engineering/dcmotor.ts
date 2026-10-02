// A brushed permanent-magnet DC motor, by its own equations. Its torque is K_t I and its back-EMF K_e w (the same
// constant, in SI units); the current is what the applied voltage, less that back-EMF, drives through its winding; at
// no load it is the current that overcomes its brushes' and bearings' friction. The winding's copper grows more
// resistive as it heats (0.393 %/K), heats by I^2 R, and passes that heat to the housing, and the housing to the air,
// through the thermal resistances on its datasheet. Past its insulation's limit the winding fails open and the motor
// never runs again. A gearhead multiplies torque by its ratio, less its own losses, and divides speed by it.

import type { GearheadData, MotorData } from '../data/motors';
import { AMBIENT, heatLoss } from './thermal';

/** Resistance coefficient of annealed copper near room temperature, per K (IEC 60028). */
export const COPPER_ALPHA = 0.00393;

const fromRpm = (n: number) => (n * 2 * Math.PI) / 60;

export interface MotorThermal {
  /** Winding to housing, housing to air, K/W. */
  Rwh: number;
  Rha: number;
  /** Heat capacities of the winding and of the housing, J/K. */
  Cw: number;
  Ch: number;
  maxWinding: number;
  /** Worked out from the motor's size, not given by its maker. */
  estimated: boolean;
}

export interface MotorModel {
  label: string;
  V: number;
  /** Torque constant N m/A (= back-EMF constant V s/rad), winding resistance at 25 C ohm. */
  Kt: number;
  R25: number;
  /** No-load current A, and the friction torque it stands for, N m. */
  I0: number;
  Tf: number;
  /** At its nominal voltage: no-load speed rad/s, stall current A, stall torque N m. */
  noLoadSpeed: number;
  stallCurrent: number;
  stallTorque: number;
  maxContinuousCurrent: number;
  rotorInertia: number;
  thermal: MotorThermal;
}

/**
 * The motor's constants from what its maker publishes: directly, when the sheet gives them; else from its rated point,
 * where it delivers P at speed w drawing I: K_t (I - I0) w = P, and V = I R + K_t w.
 */
export function motorModel(d: MotorData): MotorModel {
  const p = d.published;
  let Kt: number, R: number;
  if (p.torqueConstant && p.terminalR) {
    Kt = p.torqueConstant;
    R = p.terminalR;
  } else if (p.rated) {
    const w = fromRpm(p.rated.speed);
    Kt = p.rated.power / w / (p.rated.current - p.noLoadCurrent);
    R = (d.V - Kt * w) / p.rated.current;
  } else {
    throw new Error(`${d.label}: its sheet gives neither its constants nor a rated point`);
  }
  const I0 = p.noLoadCurrent;
  const stallCurrent = d.V / R;
  return {
    label: d.label, V: d.V, Kt, R25: R, I0, Tf: Kt * I0,
    noLoadSpeed: (d.V - I0 * R) / Kt,
    stallCurrent, stallTorque: Kt * (stallCurrent - I0),
    maxContinuousCurrent: d.maxContinuousCurrent,
    rotorInertia: d.rotorInertia ?? 0.5 * (0.35 * d.mass) * (0.35 * d.diameter) ** 2,
    thermal: d.thermal
      ? { Rwh: d.thermal.Rwh, Rha: d.thermal.Rha, Cw: d.thermal.tauW / d.thermal.Rwh, Ch: d.thermal.tauM / d.thermal.Rha, maxWinding: d.thermal.maxWinding, estimated: false }
      : estimatedThermal(d),
  };
}

/**
 * A motor's heat paths when its maker gives none, from its size: the housing loses heat to still air by natural
 * convection and radiation (thermal.ts, painted steel, emissivity 0.9) at a 60 K rise; the winding sits behind about
 * 0.42 of that resistance (the proportion maxon publishes for the RE 40); its copper is taken as 15% of the motor's
 * mass and the rest as steel. All of it is an estimate, and says so.
 */
export function estimatedThermal(d: MotorData): MotorThermal {
  const r = d.diameter / 2;
  const area = 2 * Math.PI * r * d.length + 2 * Math.PI * r * r;
  const rise = 60;
  const Rha = rise / heatLoss(AMBIENT + rise, area, d.diameter, 0.9);
  return { Rwh: 0.42 * Rha, Rha, Cw: 0.15 * d.mass * 385, Ch: 0.85 * d.mass * 460, maxWinding: d.insulation?.maxWinding ?? 130, estimated: true };
}

/** Winding resistance at winding temperature t (deg C). */
export const windingR = (m: MotorModel, t: number) => m.R25 * (1 + COPPER_ALPHA * (t - 25));

/** Torque at the motor's shaft carrying current I while turning at w: K_t I, less friction against the motion. */
export function shaftTorque(m: MotorModel, I: number, w: number): number {
  const against = w !== 0 ? Math.sign(w) : Math.sign(I);
  return m.Kt * I - m.Tf * against;
}

/** Torque at a gearhead's output for torque T at the motor turning at w (motor side): its losses go against the power. */
export function throughGear(T: number, w: number, g: GearheadData | null): number {
  if (!g) return T;
  const driving = T * w >= 0;
  return T * g.ratio * (driving ? g.efficiency : 1 / g.efficiency);
}

export interface MotorHeat {
  /** Winding and housing temperatures, deg C. */
  winding: number;
  housing: number;
}

/**
 * One step of the motor's two-node heating (implicit, stable for any dt): copper loss `Pw` into the winding, `Ph`
 * (friction, gear losses) into the housing, the housing cooling to `ambient`.
 */
export function heatStep(th: MotorThermal, s: MotorHeat, Pw: number, Ph: number, dt: number, ambient = AMBIENT): MotorHeat {
  // [Cw/dt + 1/Rwh, -1/Rwh; -1/Rwh, Ch/dt + 1/Rwh + 1/Rha] [Tw; Th] = [Cw/dt Tw0 + Pw; Ch/dt Th0 + Ph + Ta/Rha]
  const a = th.Cw / dt + 1 / th.Rwh, b = -1 / th.Rwh, c = th.Ch / dt + 1 / th.Rwh + 1 / th.Rha;
  const r1 = (th.Cw / dt) * s.winding + Pw, r2 = (th.Ch / dt) * s.housing + Ph + ambient / th.Rha;
  const det = a * c - b * b;
  return { winding: (r1 * c - b * r2) / det, housing: (a * r2 - b * r1) / det };
}
