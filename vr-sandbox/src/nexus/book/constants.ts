// The constants the book uses, each a leaf with its fixing source, their values read from the one set
// (src/data/constants.ts). Exact constants of the 2019 SI are fundamental;
// measured constants carry CODATA 2018's uncertainty; fitted constants are empirical and name their fit.

import { CONSTANTS as K } from '../../data/constants';
import { leaf, type Leaf } from '../term';

const fundamental = (name: string, value: number, unit: string, source: string): Leaf => leaf(name, value, unit, { class: 'fundamental', source });
const measured = (name: string, value: number, unit: string, source: string, uncertainty?: number): Leaf => leaf(name, value, unit, { class: 'measured', source }, uncertainty);
const empirical = (name: string, value: number, unit: string, source: string): Leaf => leaf(name, value, unit, { class: 'empirical', source });

export const CONST = {
  g: fundamental('standard gravity', K.g.value, 'm/s^2', 'ISO 80000-3: standard acceleration of free fall, a defined conventional value'),
  c: fundamental('speed of light in vacuum', K.c.value, 'm/s', 'SI (2019): exact by definition'),
  h: fundamental('Planck constant', K.h.value, 'J s', 'SI (2019): exact by definition'),
  kB: fundamental('Boltzmann constant', K.kB.value, 'J/K', 'SI (2019): exact by definition'),
  R: fundamental('molar gas constant', K.R.value, 'J/mol K', 'SI (2019): k_B N_A, exact (8.314462618…)'),
  F: fundamental('Faraday constant', K.F.value, 'C/mol', 'SI (2019): e N_A, exact (96485.33212…)'),
  sigmaSB: fundamental('Stefan–Boltzmann constant', K.sigmaSB.value, 'W/m^2 K^4', 'CODATA 2018: 2π⁵k_B⁴/(15h³c²), exact from exact constants'),
  G: measured('Newtonian constant of gravitation', K.G.value, 'm^3/kg s^2', 'CODATA 2018: 6.67430(15)e-11', K.G.uncertainty),
  mu0: measured('vacuum magnetic permeability', K.mu0.value, 'N/A^2', 'CODATA 2018: 1.25663706212(19)e-6', K.mu0.uncertainty),
  eps0: measured('vacuum electric permittivity', K.eps0.value, 'F/m', 'CODATA 2018: 8.8541878128(13)e-12', K.eps0.uncertainty),
  kC: measured('Coulomb constant 1/(4π ε₀)', 8987551792.3, 'N m^2/C^2', 'CODATA 2018, from ε₀', 1.4),
  alphaCu: measured('temperature coefficient of resistance of annealed copper at 20 °C', 0.00393, '1/K', 'IEC 60028'),
  SeMax: empirical('endurance-limit ceiling of steels', 700e6, 'Pa', 'Shigley eq. 6-8: S_e′ = 0.5 S_ut up to S_ut = 1400 MPa, 700 MPa beyond'),
  V0: empirical('lead-acid open-circuit intercept', 0.85, 'V', 'the cell rule V ≈ 0.85 + SG (Linden & Reddy, Handbook of Batteries)'),
  kSG: empirical('lead-acid volts per unit of specific gravity', 1, 'V', 'the cell rule V ≈ 0.85 + SG'),
  Cnat: empirical('natural-convection coefficient, vertical plate in air', 1.42, 'W/m^1.75 K^1.25', 'Holman, Heat Transfer, table 7-2: h = 1.42 (ΔT/L)^¼, laminar'),
  mf0: empirical('mass-law reference surface density × frequency at 0 dB', 223.872113856834, 'kg/m^2 s', 'TL = 20 log₁₀(m f) − 47 dB: 10^(47/20)'),
  MCO2: measured('molar mass of CO₂', 44.009, 'g/mol', 'IUPAC atomic weights'),
  MCaO: measured('molar mass of CaO', 56.077, 'g/mol', 'IUPAC atomic weights'),
  REV: fundamental('one revolution', 1, 'rev', 'mathematics: 2π rad'),
  e: fundamental('elementary charge', K.e.value, 'C', 'SI (2019): exact by definition'),
  NA: fundamental('Avogadro constant', K.NA.value, 'mol^-1', 'SI (2019): exact by definition'),
  b: fundamental('Wien wavelength displacement law constant', K.b.value, 'm K', K.b.source),
  Ry: measured('Rydberg energy', K.Ry.value, 'eV', K.Ry.source, K.Ry.uncertainty),
  I0: fundamental('reference sound intensity', 1e-12, 'W/m^2', 'ISO 1683:2015: the reference value of sound intensity in air, a convention'),
  me: measured('mass of the electron', K.me.value, 'kg', 'CODATA 2018: 9.1093837015(28)e-31 kg', K.me.uncertainty),
  mu: measured('atomic mass constant: a twelfth of a carbon-12 atom, about one nucleon', K.mu.value, 'kg', 'CODATA 2018: 1.66053906660(50)e-27 kg', K.mu.uncertainty),
  Tcmb: measured('temperature of the cosmic microwave background: the coldest anything sees', 2.72548, 'K', 'Fixsen 2009, ApJ 707, 916 (COBE/FIRAS): 2.72548 ± 0.00057 K', 0.00057),
};

/** A bound of a law's domain: a rough physical limit, declared with its grounds. */
export const est = (name: string, value: number, unit: string, grounds: string): Leaf => leaf(name, value, unit, { class: 'estimated', grounds });
