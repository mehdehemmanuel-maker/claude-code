// What happens during a change: the rate across a barrier. A change that must pass over a barrier is attempted at the
// thermal rate kT / h, and an attempt succeeds with the Boltzmann factor of the barrier's Gibbs energy (Eyring, J. Chem.
// Phys. 3, 107, 1935). A liquid flows because its molecules change places over such a barrier, so its viscosity is the
// barrier's rate seen from the continuum (Eyring, J. Chem. Phys. 4, 283, 1936): η = (h N_A / V_m) exp(ΔG‡ / RT). The
// time of one change is then η V_m / (N_A k T): the viscosity times one molecule's volume over the thermal energy, with
// Planck's constant gone. A barrier fitted at two temperatures predicts the rest; where it does not, the residual says how
// the barrier itself changes.

import { CONST } from './book/constants';

const k = () => CONST.kB.value!, h = () => CONST.h.value!, R = () => CONST.R.value!;
const NA = () => R() / k();

/** How often a change is attempted at a temperature, per second: kT / h. */
export const attemptRate = (T: number) => (k() * T) / h();

/** The Gibbs energy of the barrier a liquid's flow shows, J/mol, from its viscosity and molar volume. */
export const barrierFromViscosity = (eta: number, Vm: number, T: number) => R() * T * Math.log((eta * Vm) / (h() * NA()));

/** The time one change over the barrier takes: the inverse of its rate, (h / kT) exp(ΔG‡ / RT). */
export const changeTime = (dG: number, T: number) => (h() / (k() * T)) * Math.exp(dG / (R() * T));

/** The barrier's enthalpy and entropy from viscosities at temperatures, by least squares in ln(η V_m / h N_A) against 1 / T. */
export function fitBarrier(points: { T: number; eta: number; Vm: number }[]): { dH: number; dS: number } {
  const xs = points.map((p) => 1 / p.T), ys = points.map((p) => Math.log((p.eta * p.Vm) / (h() * NA())));
  const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i]! - my), 0) / xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  return { dH: slope * R(), dS: -(my - slope * mx) * R() };
}

/** The viscosity a fitted barrier gives at a temperature and molar volume. */
export const viscosityFrom = (b: { dH: number; dS: number }, T: number, Vm: number) => ((h() * NA()) / Vm) * Math.exp(b.dH / (R() * T) - b.dS / R());
