// Bolted joint mechanics per VDI 2230 Part 1 (2015): tightening torque <-> preload,
// assembly stress, and the capacities used by the joint failure evaluator.

import {
  CLEARANCE_HOLE_MEDIUM,
  HEX_BEARING_DIAMETER,
  type MetricThread,
  minorDiameter,
  pitchDiameter,
  propertyClassFor,
  stressDiameter,
  tensileStressArea,
  threadFor,
} from './threads';

export interface TighteningInput {
  thread: MetricThread;
  /** Thread friction coefficient mu_G. */
  muThread: number;
  /** Head / nut bearing-face friction coefficient mu_K. */
  muHead: number;
  /** Effective friction diameter of the bearing face D_Km = (d_w + d_h) / 2, m. */
  Dkm: number;
}

/** Torque needed to overcome thread friction and pitch: M_G = F (0.16 P + 0.58 d2 mu_G). */
export function threadTorque(F: number, i: TighteningInput) {
  return F * (0.16 * i.thread.P + 0.58 * pitchDiameter(i.thread) * i.muThread);
}

/** Total tightening torque M_A = F (0.16 P + 0.58 d2 mu_G + D_Km/2 mu_K)  (VDI 2230 eq. R13/1). */
export function tighteningTorque(F: number, i: TighteningInput) {
  return threadTorque(F, i) + F * (i.Dkm / 2) * i.muHead;
}

/** Inverse of tighteningTorque: the preload a given wrench torque produces. */
export function preloadFromTorque(MA: number, i: TighteningInput) {
  const perNewton = 0.16 * i.thread.P + 0.58 * pitchDiameter(i.thread) * i.muThread + (i.Dkm / 2) * i.muHead;
  return MA / perNewton;
}

/**
 * Equivalent (von Mises) stress in the bolt during tightening:
 * sigma_red = sqrt(sigma_M^2 + 3 tau^2), sigma_M = F / A0, tau = M_G / W_p.
 * W_p is the fully plastic torsional section modulus pi d0^3 / 12, which is what VDI 2230's closed-form
 * permissible preload (eq. R7/2, the factor 3/2 below) is derived from; it makes the two functions consistent.
 */
export function assemblyStress(F: number, i: TighteningInput) {
  const d0 = stressDiameter(i.thread);
  const A0 = tensileStressArea(i.thread);
  const Wp = (Math.PI * d0 ** 3) / 12;
  const sigma = F / A0;
  const tau = threadTorque(F, i) / Wp;
  return Math.sqrt(sigma * sigma + 3 * tau * tau);
}

/**
 * Permissible assembly preload at yield utilisation nu (VDI 2230 eq. R7/2):
 * F_Mzul = nu Rp A0 / sqrt(1 + 3 [ (3/2) (d2/d0) (P/(pi d2) + 1.155 mu_G) ]^2 )
 */
export function permissiblePreload(Rp: number, nu: number, t: MetricThread, muThread: number) {
  const d2 = pitchDiameter(t);
  const d0 = stressDiameter(t);
  const A0 = tensileStressArea(t);
  const k = 1.5 * (d2 / d0) * (t.P / (Math.PI * d2) + 1.155 * muThread);
  return (nu * Rp * A0) / Math.sqrt(1 + 3 * k * k);
}

/** Surface conditions and their typical friction coefficients (VDI 2230 Table A5 ranges, midpoints). */
export const BOLT_FRICTION: Record<string, { muThread: number; muHead: number; label: string }> = {
  'black-oxide-oiled': { muThread: 0.14, muHead: 0.14, label: 'Black oxide, lightly oiled' },
  'zinc-plated': { muThread: 0.12, muHead: 0.12, label: 'Zinc plated, dry' },
  'lubricated': { muThread: 0.1, muHead: 0.1, label: 'MoS2 / grease' },
  'stainless-dry': { muThread: 0.3, muHead: 0.25, label: 'Stainless, dry (galling risk)' },
};

export interface BoltedJointSpec {
  size: string; // e.g. 'M8'
  propertyClass: string; // e.g. '8.8'
  torque: number; // N m applied per bolt
  surface: keyof typeof BOLT_FRICTION | string;
  count: number;
  /** Friction coefficient of the clamped faying surfaces (slip), from the part materials. */
  muFaying: number;
  /** Number of shear planes / faying interfaces. */
  interfaces: number;
  /** Thickness of the thinnest clamped plate, m (bearing check). */
  plateThickness: number;
  /** Ultimate strength of the weakest clamped plate material, Pa. */
  plateUltimate: number;
  /** Lever arm for joint bending (half the contact footprint), m. */
  bendingArm: number;
  /** Effective radius for torsional slip about the bolt group, m. */
  torsionArm: number;
}

export interface BoltedJointResult {
  preload: number;
  assemblyStress: number;
  yieldUtilisation: number;
  /** True if the applied torque already exceeds the bolt's yield during tightening. */
  overTorqued: boolean;
  slipShear: number;
  boltShear: number;
  bearing: number;
  tension: number;
  bending: number;
  torsionSlip: number;
  Dkm: number;
  clearance: number;
}

export function boltedJoint(s: BoltedJointSpec): BoltedJointResult {
  const t = threadFor(s.size);
  const pc = propertyClassFor(s.propertyClass, t.d);
  const fr = BOLT_FRICTION[s.surface] ?? BOLT_FRICTION['zinc-plated']!;
  const dw = HEX_BEARING_DIAMETER[s.size] ?? t.d * 1.45;
  const dh = CLEARANCE_HOLE_MEDIUM[s.size] ?? t.d * 1.1;
  const input: TighteningInput = { thread: t, muThread: fr.muThread, muHead: fr.muHead, Dkm: (dw + dh) / 2 };
  const preload = preloadFromTorque(Math.max(0, s.torque), input);
  const sigmaRed = assemblyStress(preload, input);
  const As = tensileStressArea(t);
  const n = Math.max(1, Math.round(s.count));
  // Shear through the threaded section is the conservative case (threads in the shear plane).
  const boltShear = n * s.interfaces * 0.6 * pc.Rm * (Math.PI / 4) * minorDiameter(t) ** 2;
  const slipShear = n * s.interfaces * s.muFaying * preload;
  const bearing = n * 2.5 * t.d * s.plateThickness * s.plateUltimate;
  const tension = n * As * pc.Rm;
  return {
    preload,
    assemblyStress: sigmaRed,
    yieldUtilisation: sigmaRed / pc.Rp,
    overTorqued: sigmaRed > pc.Rp * 1.0,
    slipShear,
    boltShear,
    bearing,
    tension,
    // Prying about the footprint edge: the bolt group's tensile capacity acting at the arm.
    bending: tension * Math.max(s.bendingArm, t.d),
    // Friction on the faying surface resists twisting about the bolt group.
    torsionSlip: n * s.muFaying * preload * Math.max(s.torsionArm, input.Dkm / 2),
    Dkm: input.Dkm,
    clearance: (dh - t.d) / 2,
  };
}
