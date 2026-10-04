// The constants the book uses, each a leaf with its fixing source. Exact constants of the 2019 SI are fundamental;
// measured constants carry CODATA 2018's uncertainty; fitted constants are empirical and name their fit.

import { leaf, type Leaf } from '../term';

const fundamental = (name: string, value: number, unit: string, source: string): Leaf => leaf(name, value, unit, { class: 'fundamental', source });
const measured = (name: string, value: number, unit: string, source: string, uncertainty?: number): Leaf => leaf(name, value, unit, { class: 'measured', source }, uncertainty);
const empirical = (name: string, value: number, unit: string, source: string): Leaf => leaf(name, value, unit, { class: 'empirical', source });

export const CONST = {
  g: fundamental('standard gravity', 9.80665, 'm/s^2', 'ISO 80000-3: standard acceleration of free fall, a defined conventional value'),
  c: fundamental('speed of light in vacuum', 299792458, 'm/s', 'SI (2019): exact by definition'),
  h: fundamental('Planck constant', 6.62607015e-34, 'J s', 'SI (2019): exact by definition'),
  kB: fundamental('Boltzmann constant', 1.380649e-23, 'J/K', 'SI (2019): exact by definition'),
  R: fundamental('molar gas constant', 8.314462618, 'J/mol K', 'SI (2019): k_B N_A, exact (8.314462618…)'),
  F: fundamental('Faraday constant', 96485.33212, 'C/mol', 'SI (2019): e N_A, exact (96485.33212…)'),
  sigmaSB: fundamental('Stefan–Boltzmann constant', 5.670374419e-8, 'W/m^2 K^4', 'CODATA 2018: 2π⁵k_B⁴/(15h³c²), exact from exact constants'),
  G: measured('Newtonian constant of gravitation', 6.6743e-11, 'm^3/kg s^2', 'CODATA 2018: 6.67430(15)e-11', 1.5e-15),
  mu0: measured('vacuum magnetic permeability', 1.25663706212e-6, 'N/A^2', 'CODATA 2018: 1.25663706212(19)e-6', 1.9e-16),
  eps0: measured('vacuum electric permittivity', 8.8541878128e-12, 'F/m', 'CODATA 2018: 8.8541878128(13)e-12', 1.3e-21),
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
  Tcmb: measured('temperature of the cosmic microwave background: the coldest anything sees', 2.72548, 'K', 'Fixsen 2009, ApJ 707, 916 (COBE/FIRAS): 2.72548 ± 0.00057 K', 0.00057),
};

/** A bound of a law's domain: a rough physical limit, declared with its grounds. */
export const est = (name: string, value: number, unit: string, grounds: string): Leaf => leaf(name, value, unit, { class: 'estimated', grounds });
