// A solid's continuum quantities from its constituents (src/nexus/solid.ts): density from an atom's mass and the room
// the lattice gives it, stiffness against the binding over that room. Measured densities and bulk moduli are checked
// against, never fed; the residuals' structure names what the constituents' description lacks.

import { describe, expect, it } from 'vitest';
import { CRYSTALS } from '../../src/data/species';
import { MATERIALS } from '../../src/data/materials';
import { atomsPerCell, bulkFrom, densityOf, stiffnessRatio } from '../../src/nexus/solid';

const crystal = (el: string) => CRYSTALS.find((c) => c.element === el)!;
const off = (c: (typeof CRYSTALS)[number]) => densityOf(c) / c.measured.density - 1;

describe('density from the atoms and their arrangement', () => {
  it('a cell holds what its sites hold over the cells that share them: four in a face-centred cube, two in a body-centred one', () => {
    expect(atomsPerCell('fcc')).toBe(4);
    expect(atomsPerCell('bcc')).toBe(2);
  });

  it('every crystal whose lattice was measured at room temperature gives its measured density within one per cent', () => {
    for (const c of CRYSTALS.filter((x) => x.at > 250)) expect(Math.abs(off(c)), c.element).toBeLessThan(0.01);
  });

  it('the three whose lattice was measured cold come out too dense, each by more than one per cent: the residual names the temperature, through expansion', () => {
    const cold = CRYSTALS.filter((x) => x.at < 100);
    expect(cold.map((c) => c.element).sort()).toEqual(['K', 'Li', 'Na']);
    for (const c of cold) expect(off(c), c.element).toBeGreaterThan(0.01);
  });

  it('the kernel\'s steel, aluminium and copper are, in density, the crystals of iron, aluminium and copper, within one and a half per cent', () => {
    for (const [id, el] of [['steel.a36', 'Fe'], ['aluminum.6061-t6', 'Al'], ['copper.c110', 'Cu']] as const) {
      const m = MATERIALS.find((x) => x.id === id)!;
      expect(Math.abs(m.density / densityOf(crystal(el)) - 1), id).toBeLessThan(0.015);
    }
  });
});

describe('stiffness against the binding over the room', () => {
  it('the cohesive energy over the volume per atom is the scale of a metal\'s bulk modulus: every ratio within an order of magnitude of one', () => {
    for (const c of CRYSTALS) { expect(stiffnessRatio(c), c.element).toBeGreaterThan(0.1); expect(stiffnessRatio(c), c.element).toBeLessThan(10); }
  });

  it('the residual has structure: every metal bound by one s electron is softer for its binding than every other metal, so the electrons\' arrangement is the missing layer', () => {
    const s = CRYSTALS.filter((c) => c.valence === 'one s electron').map(stiffnessRatio);
    const others = CRYSTALS.filter((c) => c.valence !== 'one s electron').map(stiffnessRatio);
    expect(Math.max(...s)).toBeLessThan(Math.min(...others));
  });

  it('the bulk modulus the kernel\'s Young\'s modulus and Poisson\'s ratio imply, against the crystal\'s measured one: aluminium agrees within ten per cent; steel and copper fall short, so their stated pairs disagree with the metal\'s compressibility', () => {
    const implied = (id: string) => { const m = MATERIALS.find((x) => x.id === id)!; return bulkFrom(m.E, m.nu); };
    expect(Math.abs(implied('aluminum.6061-t6') / crystal('Al').measured.bulk - 1)).toBeLessThan(0.1);
    expect(implied('steel.a36') / crystal('Fe').measured.bulk).toBeLessThan(0.9);
    expect(implied('copper.c110') / crystal('Cu').measured.bulk).toBeLessThan(0.8);
  });
});
