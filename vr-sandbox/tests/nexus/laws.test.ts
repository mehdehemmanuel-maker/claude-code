// Laws closed with equations (docs/NEXUS-FROM-REALITY.md, section 25): bound states as eigenvalues, electrons that
// cannot share a state, a melting rule the evidence chose, and the hottest a named matter bears. What these tests hold
// is what each equation must reproduce against measured values, every one cited.

import { describe, expect, it } from 'vitest';
import { CONST } from '../../src/nexus/book/constants';
import { CRYSTALS, MELTING } from '../../src/data/species';
import { boundState } from '../../src/nexus/substrate/eigen';
import { conductionDensity, degeneracyBulk, fermiEnergy, freeElectronBulk, thermalShare } from '../../src/nexus/substrate/fermi';
import { cohesionRule, lindemannRule, meltingPoint } from '../../src/nexus/substrate/melt';
import { descend, heat, hottestOf, sahaShare } from '../../src/nexus/substrate/depth';

const eV = 1.602176634e-19;
const crystal = (el: string) => CRYSTALS.find((c) => c.element === el)!;

describe('a bound state is an eigenvalue of the operator, not a crossing of two scales', () => {
  it('the Coulomb operator\'s spectrum in its own units is −1/(2n²), with the radii the exact states have', () => {
    expect(boundState(1, 0, 0)!.e).toBeCloseTo(-0.5, 8);
    expect(boundState(1, 0, 1)!.e).toBeCloseTo(-1 / 8, 8);
    expect(boundState(1, 2, 0)!.e).toBeCloseTo(-1 / 18, 8);
    // where the ground state is most likely found is the operator's length; its mean radius is (3n² − l(l+1))/2
    expect(boundState(1, 0, 0)!.peak).toBeCloseTo(1, 6);
    expect(boundState(1, 0, 0)!.mean).toBeCloseTo(1.5, 8);
    expect(boundState(1, 1, 0)!.mean).toBeCloseTo(5, 8);
  });

  it('an attraction no slower than the motion holds nothing: 1/x² and beyond give no bound state', () => {
    expect(boundState(2)).toBeNull();
    expect(boundState(2.5)).toBeNull();
    expect(boundState(0.5)!.e).toBeLessThan(0);
  });
});

describe('electrons that cannot share a state', () => {
  it('counting the states gives each metal\'s Fermi energy (Kittel, table 6.1: Na 3.24 eV, K 2.12 eV, Al 11.7 eV, Fe 11.1 eV)', () => {
    const EF = (el: string) => fermiEnergy(conductionDensity(crystal(el))!) / eV;
    expect(EF('Na')).toBeCloseTo(3.24, 1);
    expect(EF('K')).toBeCloseTo(2.12, 1);
    expect(EF('Al')).toBeCloseTo(11.7, 0);
    expect(EF('Fe')).toBeCloseTo(11.1, 0);
  });

  it('the stiffness of filling, (2/3) n E_F, is the alkali metals\' stiffness: potassium\'s to a few percent, sodium\'s to a third', () => {
    expect(freeElectronBulk(crystal('K'))!.value! / crystal('K').measured.bulk).toBeCloseTo(1, 1);
    expect(freeElectronBulk(crystal('Na'))!.value! / crystal('Na').measured.bulk).toBeLessThan(1.4);
    expect(degeneracyBulk(1e28)).toBeCloseTo((2 / 3) * 1e28 * fermiEnergy(1e28), 6);
  });

  it('the residual names what the free gas leaves out: s–p metals are softer than it (the ions pull the gas in), filled-d metals stiffer (the d shells bear)', () => {
    const ratio = (el: string) => freeElectronBulk(crystal(el))!.value! / crystal(el).measured.bulk;
    for (const el of ['Al', 'Pb']) expect(ratio(el)).toBeGreaterThan(2);
    for (const el of ['Cu', 'Ag', 'Au']) expect(ratio(el)).toBeLessThan(0.5);
  });

  it('heat moves only the share kT/E_F of a metal\'s electrons', () => {
    const n = conductionDensity(crystal('Cu'))!;
    expect(thermalShare(n, 300)).toBeCloseTo((CONST.kB.value! * 300) / fermiEnergy(n), 12);
    expect(thermalShare(n, 300)).toBeLessThan(0.01);
  });
});

describe('a melting rule the evidence chose', () => {
  it('of two candidate relations, the evidence keeps the one it spreads least about: cohesion\'s, not Lindemann\'s', () => {
    expect(cohesionRule().spread).toBeLessThan(lindemannRule().spread);
    expect(cohesionRule().ratio).toBeGreaterThan(0.025);
    expect(cohesionRule().ratio).toBeLessThan(0.035);
  });

  it('each kept metal\'s melting point, predicted with itself left out of the evidence, within a third of the measured (CRC)', () => {
    for (const c of CRYSTALS) {
      const ratio = meltingPoint(c).T / MELTING[c.element]!;
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.35);
    }
  });
});

describe('the hottest a named matter bears', () => {
  it('a crystal bears heat to its melting; a molecule to where its weakest bond parts in the gas', () => {
    expect(hottestOf('Fe')!.T).toBeCloseTo(meltingPoint(crystal('Fe')).T, 0);
    expect(hottestOf('Fe')!.level.what).toBe('the crystal of Fe');
    const w = hottestOf('water')!;
    expect(w.level.what).toBe('the molecule of water');
    expect(w.T).toBeGreaterThan(1500);
    expect(w.T).toBeLessThan(3500);
    // the triple bond outlasts the double, which outlasts the single
    expect(hottestOf('nitrogen')!.T).toBeGreaterThan(hottestOf('oxygen')!.T);
    expect(hottestOf('oxygen')!.T).toBeGreaterThan(hottestOf('ethane')!.T);
  });

  it('a gas keeps its vapour once boiled: the extrapolated liquid never returns at a higher heat', () => {
    expect(hottestOf('benzene')!.T).toBeLessThan(3000);
  });

  it('in a gas, Saha\'s balance parts what the Boltzmann factor alone keeps: water at one bar and 6000 K is mostly apart', () => {
    const s = descend(heat(6000), { of: { matter: 'water' } }).steps.find((x) => x.level.kind === 'molecule')!;
    expect(s.changed).toBeGreaterThan(0.5);
    expect(sahaShare(1e-27, 1e-18, 1e30, 300)).toBeLessThan(1e-50);
  });
});
