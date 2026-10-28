// The physical constants, once (docs/REALITY.md, step 2): every module that needs one reads it from here, and the book
// makes its constant leaves (src/nexus/book/constants.ts) from these. The defining constants of the 2019 SI are exact;
// the rest are CODATA 2018 recommended values with their standard uncertainty. No imports: anything may read this.
//
// Sources: BIPM, The International System of Units (SI Brochure), 9th ed., 2019, Table 1 (the defining constants);
// Tiesinga, Mohr, Newell & Taylor, CODATA recommended values of the fundamental physical constants: 2018, Rev. Mod.
// Phys. 93, 025010 (2021); ISO 80000-3:2019 (standard acceleration of free fall).

export interface Constant {
  value: number;
  /** SI unit, as the units parser reads it. */
  unit: string;
  name: string;
  /** Exact by definition (the 2019 SI, or a conventional value fixed by a standard), or measured with an uncertainty. */
  exact: boolean;
  /** Standard uncertainty, in the unit. */
  uncertainty?: number;
  source: string;
}

const exact = (value: number, unit: string, name: string, source: string): Constant => ({ value, unit, name, exact: true, source });
const measured = (value: number, uncertainty: number, unit: string, name: string, source: string): Constant => ({ value, unit, name, exact: false, uncertainty, source });

/** The constants, by their usual symbol. */
export const CONSTANTS = {
  c: exact(299792458, 'm/s', 'speed of light in vacuum', 'SI (2019): exact by definition'),
  h: exact(6.62607015e-34, 'J s', 'Planck constant', 'SI (2019): exact by definition'),
  e: exact(1.602176634e-19, 'C', 'elementary charge', 'SI (2019): exact by definition'),
  kB: exact(1.380649e-23, 'J/K', 'Boltzmann constant', 'SI (2019): exact by definition'),
  NA: exact(6.02214076e23, 'mol^-1', 'Avogadro constant', 'SI (2019): exact by definition'),
  R: exact(8.314462618, 'J/mol K', 'molar gas constant', 'SI (2019): k_B N_A, exact (8.314462618…)'),
  F: exact(96485.33212, 'C/mol', 'Faraday constant', 'SI (2019): e N_A, exact (96485.33212…)'),
  sigmaSB: exact(5.670374419e-8, 'W/m^2 K^4', 'Stefan–Boltzmann constant', 'CODATA 2018: 2π⁵k_B⁴/(15h³c²), exact from exact constants (5.670374419…)'),
  g: exact(9.80665, 'm/s^2', 'standard acceleration of free fall', 'ISO 80000-3: a defined conventional value'),
  G: measured(6.6743e-11, 1.5e-15, 'm^3/kg s^2', 'Newtonian constant of gravitation', 'CODATA 2018: 6.67430(15)e-11'),
  mu0: measured(1.25663706212e-6, 1.9e-16, 'N/A^2', 'vacuum magnetic permeability', 'CODATA 2018: 1.25663706212(19)e-6'),
  eps0: measured(8.8541878128e-12, 1.3e-21, 'F/m', 'vacuum electric permittivity', 'CODATA 2018: 8.8541878128(13)e-12'),
  me: measured(9.1093837015e-31, 2.8e-40, 'kg', 'electron mass', 'CODATA 2018: 9.1093837015(28)e-31'),
  mu: measured(1.6605390666e-27, 5.0e-37, 'kg', 'atomic mass constant', 'CODATA 2018: 1.66053906660(50)e-27'),
} as const satisfies Record<string, Constant>;

/** Standard gravity, m/s²: read so often that it has its own name. */
export const STANDARD_GRAVITY = CONSTANTS.g.value;
/** Stefan–Boltzmann constant, W/(m² K⁴). */
export const SIGMA_SB = CONSTANTS.sigmaSB.value;
/** Faraday constant, C/mol. */
export const FARADAY = CONSTANTS.F.value;
