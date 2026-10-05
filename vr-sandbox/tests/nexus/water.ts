// Water as a probe of scale. Not an object: the measured quantities of one matter in one state (liquid, 25 °C, one
// atmosphere), the site it sits on (the earth's gravity and rotation), the universe's bound on how fast information
// travels, and optionally a motion. Every value is sourced or labelled an estimate. The scale generator
// (src/nexus/scale.ts) makes the mechanisms from these alone; nothing here names a regime, a number or a level.

import { CONST } from '../../src/nexus/book/constants';
import { evaluate, ofLeaf, type Derivation } from '../../src/nexus/evaluate';
import { causal, type Quantity } from '../../src/nexus/scale';
import { div, k, leaf, mul, pow, variable } from '../../src/nexus/term';

const measured = (name: string, v: number, unit: string, source: string): Derivation => ofLeaf(leaf(name, v, unit, { class: 'measured', source }));
const estimated = (name: string, v: number, unit: string, grounds: string): Derivation => ofLeaf(leaf(name, v, unit, { class: 'estimated', grounds }));
const fundamental = (name: string, v: number, unit: string, source: string): Derivation => ofLeaf(leaf(name, v, unit, { class: 'fundamental', source }));

/** Liquid water at 25 °C and 0.1 MPa. */
export function water(motion?: number): Record<string, Quantity> {
  const rho = measured('density of water', 997.05, 'kg/m^3', 'CRC Handbook of Chemistry and Physics: 997.05 kg/m³ at 25 °C');
  const mu = measured('viscosity of water', 0.890e-3, 'Pa s', 'CRC Handbook: 0.890 mPa s at 25 °C');
  const kc = measured('thermal conductivity of water', 0.6065, 'W/m K', 'IAPWS 2011 release on the thermal conductivity of ordinary water: 0.6065 W/m K at 25 °C, 0.1 MPa');
  const cp = measured('specific heat of water', 4181.3, 'J/kg K', 'IAPWS-95: 4.1813 kJ/kg K at 25 °C, 0.1 MPa');
  const sigma = measured('surface tension of water', 0.07197, 'N/m', 'IAPWS 2014 release on the surface tension of ordinary water: 71.97 mN/m at 25 °C');
  const a = measured('speed of sound in water', 1496.7, 'm/s', 'Del Grosso and Mader, J. Acoust. Soc. Am. 52, 1442 (1972): 1496.7 m/s at 25 °C');
  const D = measured('self-diffusion of water', 2.299e-9, 'm^2/s', 'Mills, J. Phys. Chem. 77, 685 (1973): 2.299 × 10⁻⁹ m²/s at 25 °C');
  const n = measured('refractive index of water', 1.3325, '1', 'CRC Handbook: 1.3325 at 589 nm, 25 °C');
  const T = measured('temperature of the water', 298.15, 'K', 'the state probed: 25 °C');
  const hb = estimated('lifetime of a hydrogen bond in water', 1e-12, 's', 'ultrafast infrared spectroscopy: the hydrogen-bond network rearranges in about a picosecond (Fecko et al., Science 301, 1698, 2003)');
  const nuOH = measured('wavenumber of the O–H stretch in liquid water', 3.4e5, '1/m', 'the infrared absorption of liquid water peaks near 3400 cm⁻¹ (the O–H stretch)');
  const amu = fundamental('atomic mass constant', 1.66053906660e-27, 'kg', 'CODATA 2018');
  const v = (sym: string, d: Derivation) => variable(sym, d.unit, d.name);
  // what the matter's quantities make together, each a record: the capacity for heat per volume, the stiffness under compression, one molecule's mass, the thermal energy, the speed of light in it, the vibration's rate
  const rhocp = evaluate('heat capacity of water per volume', mul(v('rho', rho), v('cp', cp)), { rho, cp }, { unit: 'J/m^3 K', law: 'a carrier\'s capacity per volume: density times capacity per mass' });
  const K = evaluate('stiffness of water under quick compression', mul(v('rho', rho), pow(v('a', a), 2)), { rho, a }, { unit: 'Pa', law: 'reaction.sound, inverted: K = ρ a²' });
  const m = evaluate('mass of one water molecule', mul(k(18.015, 'the molar mass of water, 18.015 g/mol, in atomic mass units (IUPAC)'), v('u', amu)), { u: amu }, { unit: 'kg', law: 'a molecule\'s mass: its molar mass in atomic mass units' });
  const kB = ofLeaf(CONST.kB);
  const kT = evaluate('thermal energy at the water\'s temperature', mul(v('kB', kB), v('T', T)), { kB, T }, { unit: 'J', law: 'Boltzmann: the energy per degree of freedom' });
  const c = ofLeaf(CONST.c);
  const cn = evaluate('speed of light in water', div(v('c', c), v('n', n)), { c, n }, { unit: 'm/s', law: 'light in a medium: c over the refractive index' });
  const fOH = evaluate('rate of the O–H stretch', mul(v('c', c), v('nu', nuOH)), { c, nu: nuOH }, { unit: 'Hz', law: 'a band\'s frequency: c times its wavenumber' });
  const qs: Record<string, Quantity> = {
    rho: { d: rho, of: 'the matter' }, mu: { d: mu, of: 'the matter' }, kc: { d: kc, of: 'the matter' }, rhocp: { d: rhocp, of: 'the matter' },
    sigma: { d: sigma, of: 'the matter' }, a: { d: a, of: 'the matter' }, K: { d: K, of: 'the matter' }, D: { d: D, of: 'the matter' },
    kT: { d: kT, of: 'the matter' }, m: { d: m, of: 'the matter', molecular: true }, cn: { d: cn, of: 'the matter' }, hb: { d: hb, of: 'the matter', molecular: true }, fOH: { d: fOH, of: 'the matter', molecular: true },
    g: { d: ofLeaf(CONST.g), of: 'the site' },
    Omega: { d: measured('rotation of the earth', 7.2921150e-5, 'rad/s', 'IERS Conventions (2010): 7.292115 × 10⁻⁵ rad/s'), of: 'the site' },
    R: { d: measured('radius of the earth', 6.371e6, 'm', 'IUGG mean radius, 6371 km'), of: 'the site' },
    c: causal(),
  };
  if (motion !== undefined) qs['v'] = { d: ofLeaf(leaf('speed of the motion', motion, 'm/s', { class: 'given', by: 'the probe', grounds: 'a motion through the water, to see the regimes it makes' })), of: 'the motion' };
  return qs;
}
