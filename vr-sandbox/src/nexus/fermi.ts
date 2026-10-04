// Electrons that cannot share a state (docs/NEXUS-FROM-REALITY.md, section 25). No two electrons take one state, so N
// of them in a volume V fill the states of lowest energy, two to each (the two ways an electron's spin can point).
// A state's wave fits the volume, so states sit on a lattice of wavevectors one (2π)³/V apart, and the filled ones
// make a sphere: N = 2 · (4π/3) k_F³ · V/(2π)³, so k_F = (3π² n)^(1/3) with n = N/V. That is the counting; everything
// else follows from it with the kinetic energy ħ²k²/2m:
//
//   E_F = ħ² k_F² / 2m                                the energy of the last electron in
//   U/N = (3/5) E_F                                   the mean over the sphere (∫k⁴ / ∫k² to k_F)
//   P   = −∂U/∂V = (2/3) U/V = (2/5) n E_F            the pressure of filling, at no temperature at all
//   B   = −V ∂P/∂V = (5/3) P = (2/3) n E_F            its stiffness against squeezing
//
// This is the degeneracy the scale tuner could not form (confinement among neighbours goes as n^(2/3), a power its
// integer forms cannot reach): here it is counted, not formed. Heat at T moves only the electrons within about kT of the
// last one in, a share kT/E_F of them, which is why a metal's electrons barely hold heat.
//
// A metal's conduction electrons are the electrons each atom gives to the crystal (Kittel's free-electron table); their
// density is that count times the atoms a cell holds, over the cell. Where the free gas's stiffness and the measured one
// differ, the residual is what the free gas leaves out, and its pattern across metals names it.

import { CONST } from './book/constants';
import type { Crystal } from '../data/species';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { atomsPerCell } from './solid';
import { div, k, leaf, mul, pow, variable } from './term';

const hbar = () => CONST.h.value! / (2 * Math.PI);

/** The wavevector of the last state filled, from the count of states: k_F = (3π² n)^(1/3). */
export const fermiWavevector = (n: number) => (3 * Math.PI ** 2 * n) ** (1 / 3);
/** The energy of the last electron in: E_F = ħ² k_F² / 2m. */
export const fermiEnergy = (n: number, m = CONST.me.value!) => (hbar() ** 2 * fermiWavevector(n) ** 2) / (2 * m);
/** The pressure of filling: P = (2/5) n E_F. */
export const degeneracyPressure = (n: number, m = CONST.me.value!) => 0.4 * n * fermiEnergy(n, m);
/** The stiffness of filling: B = (2/3) n E_F. */
export const degeneracyBulk = (n: number, m = CONST.me.value!) => (2 / 3) * n * fermiEnergy(n, m);
/** The share of the electrons heat at T can move: those within kT of the last one in. */
export const thermalShare = (n: number, T: number, m = CONST.me.value!) => Math.min(1, (CONST.kB.value! * T) / fermiEnergy(n, m));

/** A metal's conduction electrons per volume: the electrons each atom gives, times the atoms a cell holds, over the cell. Null where no count is stated. */
export const conductionDensity = (c: Crystal) => (c.free === undefined ? null : (c.free * atomsPerCell(c.lattice)) / c.a ** 3);

/** The free gas's stiffness for a metal, as a record: from its lattice and its conduction electrons only. */
export function freeElectronBulk(c: Crystal): Derivation | null {
  if (c.free === undefined) return null;
  const src = 'src/data/species.ts CRYSTALS: Kittel tables 1.4 and 6.1';
  const a = ofLeaf(leaf(`lattice constant of ${c.element}`, c.a, 'm', { class: 'measured', source: src }));
  const z = ofLeaf(leaf(`conduction electrons per atom of ${c.element}`, c.free, '1', { class: 'measured', source: src }));
  const hb = ofLeaf(leaf('ħ', hbar(), 'J s', { class: 'given', by: 'the constants', grounds: 'h / 2π, SI exact' }));
  const me = ofLeaf(CONST.me);
  const A = variable('a', 'm', 'lattice constant'), Z = variable('z', '1', 'electrons per atom'), H = variable('hbar', 'J s', 'ħ'), M = variable('me', 'kg', 'electron mass');
  const n = evaluate(`conduction electron density of ${c.element}`, div(mul(Z, k(atomsPerCell(c.lattice), `atoms a ${c.lattice} cell holds`)), pow(A, 3)), { a, z }, { unit: '1/m^3', law: 'the electrons each atom gives, times the atoms a cell holds, over the cell' });
  const N = variable('n', '1/m^3', 'electron density');
  const EF = evaluate(`Fermi energy of ${c.element}`, div(mul(pow(H, 2), pow(mul(k(3 * Math.PI ** 2, '3π²'), N), 2 / 3)), mul(k(2, '2'), M)), { hbar: hb, me, n }, { unit: 'J', law: 'E_F = ħ²(3π²n)^(2/3)/2m: two electrons to each state, the states counted in a sphere of wavevectors' });
  const E = variable('EF', 'J', 'Fermi energy');
  return evaluate(`stiffness of ${c.element}'s free electron gas`, mul(k(2 / 3, '2/3'), mul(N, E)), { n, EF }, { unit: 'Pa', law: 'B = (2/3) n E_F: the stiffness of filling, −V ∂P/∂V with P = (2/5) n E_F' });
}
