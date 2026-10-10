// A state is not a threshold. Each phase of a species has a Gibbs energy at a temperature and a pressure, its
// enthalpy less its temperature times its entropy, and the species takes the phase whose Gibbs energy is least: its
// binding (the enthalpy) against the room its constituents have (the entropy) at that temperature. Where two phases'
// Gibbs energies are equal they coexist: the vapour pressure at a temperature, the boiling point at a pressure, are
// that curve, generated from the phases' standard enthalpy, entropy and heat capacity and from nothing else.
//
// What happens during the change is the crossing: below the curve one phase, above it the other, and the energy of
// the crossing (the enthalpy of vaporization at that temperature) is what the change takes in or gives out.

import { CONST } from '../book/constants';
import { MOLECULES, type Species } from '../../data/species';

export const T0 = 298.15, P0 = 1e5;
const R = () => CONST.R.value!;

/**
 * A phase's molar Gibbs energy at T and p, J/mol, on the elements' standard enthalpies: H(T) − T S(T), with the heat
 * capacity held at its value near 298 K (Kirchhoff), and a gas's entropy falling with its pressure as an ideal gas's.
 * A condensed phase's volume is small, so its pressure term is left out, and said here.
 */
export function gibbs(s: Species, T: number, p: number): number {
  if (s.H === undefined || s.S === undefined || s.cp === undefined) throw new Error(`${s.name} (${s.phase}): no standard enthalpy, entropy and heat capacity`);
  const H = s.H + s.cp * (T - T0);
  const S = s.S + s.cp * Math.log(T / T0) - (s.phase === 'gas' ? R() * Math.log(p / P0) : 0);
  return H - T * S;
}

export const phasesOf = (name: string) => MOLECULES.filter((s) => s.name === name && s.H !== undefined && s.S !== undefined && s.cp !== undefined);

/** The phase a species takes at T and p: the one of least Gibbs energy, among the phases it has data for. */
export function phaseAt(name: string, T: number, p: number): Species['phase'] | null {
  const ps = phasesOf(name);
  if (!ps.length) return null;
  return ps.reduce((a, b) => (gibbs(b, T, p) < gibbs(a, T, p) ? b : a)).phase!;
}

const pair = (name: string) => {
  const ps = phasesOf(name), g = ps.find((s) => s.phase === 'gas'), l = ps.find((s) => s.phase === 'liquid');
  if (!g || !l) throw new Error(`${name}: needs a gas and a liquid to have a vapour curve`);
  return { g, l };
};

/** The pressure at which a species' vapour coexists with its liquid at T: where their Gibbs energies meet. */
export function vapourPressure(name: string, T: number): number {
  const { g, l } = pair(name);
  return P0 * Math.exp(-(gibbs(g, T, P0) - gibbs(l, T, P0)) / (R() * T));
}

/** The temperature at which a species' liquid boils at a pressure: where the vapour pressure reaches it. */
export function boilingPoint(name: string, p: number): number {
  let lo = 150, hi = 900;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (vapourPressure(name, m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** The enthalpy the crossing takes in, J/mol: the gas's enthalpy less the liquid's at T. */
export function vaporizationEnthalpy(name: string, T: number): number {
  const { g, l } = pair(name);
  return g.H! + g.cp! * (T - T0) - (l.H! + l.cp! * (T - T0));
}
