// The scale tuner (src/nexus/substrate/tuner.ts): regimes derived from the constants and from what the derivation finds at
// smaller sizes. Nothing in the tuner names an atom, a planet or a star; the measured values here are the evidence its
// derivations are checked against, never inputs. Factors of order one that the dimensions cannot see are not claimed.

import { describe, expect, it } from 'vitest';
import { CONST } from '../../src/nexus/book/constants';
import { ofLeaf } from '../../src/nexus/lang/evaluate';
import { leaf } from '../../src/nexus/lang/term';
import { axes, ladder, reach, regimeAt, universe, type Q } from '../../src/nexus/substrate/tuner';

const eV = 1.602176634e-19;
const temp = (T: number) => ofLeaf(leaf('temperature', T, 'K', { class: 'given', by: 'the test', grounds: 'a temperature to derive at' }));
const kB: Q = { key: 'kB', d: ofLeaf(CONST.kB), role: 'thermal', of: 'the Boltzmann constant' };

describe('how many scale axes the constants leave', () => {
  it('with the quantum of action, light\'s speed and Boltzmann\'s constant, mass, length, time and temperature are one axis', () => {
    const [, , hbar, c] = universe();
    expect(axes([hbar!, c!, kB]).free).toBe(1);
  });

  it('with gravitation too, no direction is free: the units the constants set are Planck\'s (CODATA 2018)', () => {
    const [G, , hbar, c] = universe();
    const { free, units } = axes([hbar!, c!, G!, kB]);
    expect(free).toBe(0);
    const by = Object.fromEntries(units.map((u) => [u.of, u.value]));
    expect(by.length! / 1.616255e-35).toBeCloseTo(1, 4);
    expect(by.time! / 5.391247e-44).toBeCloseTo(1, 4);
    expect(by.mass! / 2.176434e-8).toBeCloseTo(1, 4);
    expect(by.temperature! / 1.416784e32).toBeCloseTo(1, 4);
  });
});

describe('the energies a size has, and where they meet', () => {
  const lvl0 = ladder(universe(temp(300)), 0).levels[0]!;
  const crossing = (below: string, above: string) => lvl0.crossings.find((c) => c.below.text === below && c.above.text === above)!;

  it('the electric coupling against light\'s action is a ratio no scale alters: the fine-structure constant', () => {
    expect(lvl0.invariants.find((x) => x.a.text === 'q2' && x.b.text === 'hbar c')!.ratio.value! / 7.2973525693e-3).toBeCloseTo(1, 7);
  });

  it('the size where the electric attraction and the electron\'s confinement meet is where things settle: the Bohr radius, at the Hartree energy', () => {
    const s = crossing('hbar^2 me^-1', 'q2');
    expect(s.boundary).toBe('settles');
    expect(s.L.value! / 5.29177210903e-11).toBeCloseTo(1, 6);
    expect(s.E.value! / eV / 27.211386245988).toBeCloseTo(1, 6);
  });

  it('below the electron\'s Compton length, confining it costs more than its rest energy; below the classical radius, so does its field', () => {
    expect(crossing('hbar^2 me^-1', 'c^2 me').boundary).toBe('exceeds rest');
    expect(crossing('hbar^2 me^-1', 'c^2 me').L.value! / 3.8615926796e-13).toBeCloseTo(1, 7);
    expect(crossing('q2', 'c^2 me').L.value! / 2.8179403262e-15).toBeCloseTo(1, 7);
  });

  it('heat at 300 K separates charges beyond the vacuum Bjerrum length: the attraction holds only within it', () => {
    const b = crossing('q2', 'kT');
    expect(b.boundary).toBe('holds within');
    expect(b.L.value!).toBeCloseTo(CONST.kC.value! * (CONST.F.value! * CONST.kB.value! / CONST.R.value!) ** 2 / (CONST.kB.value! * 300), 15);
  });

  it('only one structure settles from the constants: the electron and the positive charge; two particles bound by gravity are taken apart by any heat the universe allows', () => {
    const [s, ...more] = ladder(universe(), 0).levels[0]!.structures;
    expect(more).toEqual([]);
    // its ground state, from the eigenvalue problem with the reduced mass: the Bohr radius times (1 + m_e/m), and
    // hydrogen's ionization energy (NIST: 13.598434 eV for the proton; the ladder's positive charge has the atomic mass
    // constant's mass, which moves the fifth figure)
    expect(s!.size.value! / (5.29177210903e-11 * (1 + CONST.me.value! / CONST.mu.value!))).toBeCloseTo(1, 6);
    expect(s!.binding.value! / eV / 13.598434).toBeCloseTo(1, 4);
  });
});

describe('what settles below is the environment above', () => {
  const lvl1 = ladder(universe(temp(300)), 1).levels[1]!;
  const at = (boundary: string) => lvl1.crossings.filter((c) => c.boundary === boundary && c.above.of === 'unit in a body');

  it('with the settled structure\'s density, a unit\'s gravity in a body exceeds the unit\'s binding at the size of the largest planets, within the factor dimensions cannot see', () => {
    const crush = at('exceeds binding')[0]!;
    expect(crush.L.value! / 7.1492e7).toBeGreaterThan(0.5); // Jupiter's equatorial radius (IAU)
    expect(crush.L.value! / 7.1492e7).toBeLessThan(2);
  });

  it('a body of that matter holds itself against heat at 300 K from about the size of the Moon, within the same factor', () => {
    const held = at('holds beyond').find((c) => c.below.factors[0]!.q.role === 'thermal')!;
    expect(held.L.value! / 1.7374e6).toBeGreaterThan(0.5); // the Moon's mean radius
    expect(held.L.value! / 1.7374e6).toBeLessThan(2);
  });

  it('above some size a body of that density is within its own gravitational radius; the exact radius for a uniform sphere differs by the factor √(3/8π) the dimensions cannot see', () => {
    const r = regimeAt(1e12, 300);
    expect(r.state.collapses).toBe(true);
    expect(regimeAt(1e10, 300).state.collapses).toBe(false);
  });
});

describe('the regime at a size and a temperature', () => {
  it('temperature sets the clocks of thermal mechanisms only: ħ/kT as T⁻¹, a thermal crossing as T^-½, every other clock not at all', () => {
    const r = regimeAt(1e-6, 300);
    for (const t of r.times) {
      const thermal = /kT/.test(t.of);
      if (thermal) expect([-1, -0.5]).toContainEqual(expect.closeTo(t.tempExponent, 9));
      else expect(t.tempExponent).toBeCloseTo(0, 9);
    }
  });

  it('above the temperature the settled structure\'s binding sets, nothing settles: the regime changes, not the clocks', () => {
    // the settled ground state's binding, hydrogen's ionization energy (NIST), sets the temperature
    const Tb = 13.598434 * eV / CONST.kB.value!;
    expect(regimeAt(1e-9, Tb * 0.9).structures.length).toBe(1);
    expect(regimeAt(1e-9, Tb * 1.1).structures.length).toBe(0);
  });

  it('the free-fall time of a body emerges from a unit\'s gravity moving its own mass, and is the same at every size', () => {
    const ff = (L: number) => regimeAt(L, 300).times.find((t) => /^L √\(m00 \/ \(G m00 rho00\)\)$/.test(t.of))!.t;
    expect(ff(1e7)).toBeCloseTo(ff(1e8), 6);
    const rho = 1.66053906660e-27 * (1 + CONST.me.value! / 1.66053906660e-27) / (5.29177210903e-11 * (1 + CONST.me.value! / 1.66053906660e-27)) ** 3;
    expect(ff(1e7) * Math.sqrt(CONST.G.value! * rho)).toBeCloseTo(1, 5);
  });

  it('what a size asks of an observer: light that resolves an atom\'s size ionizes it; light that resolves a tenth of a micrometre does not', () => {
    expect(regimeAt(1e-10, 300).observer.disturbs).toBe(true);
    expect(regimeAt(1e-7, 300).observer.disturbs).toBe(false);
  });

  it('the state each size needs: relativistic below the Compton length, bound and quantum at the settled size, classical at a micrometre, crushed past the planets', () => {
    expect(regimeAt(1e-15, 300).state.relativistic).toBe(true);
    expect(regimeAt(1e-10, 300).state).toMatchObject({ bound: true, quantum: true, relativistic: false });
    expect(regimeAt(1e-6, 300).state).toMatchObject({ bound: false, quantum: false });
    expect(regimeAt(1e9, 300).state).toMatchObject({ crushed: true, selfHeld: true, collapses: false });
  });

  it('the derivation reaches down to the length the constants set by themselves and no further: below it, no kept law holds', () => {
    const { least, most } = reach();
    expect(least / 1.616255e-35).toBeCloseTo(1, 4);
    expect(regimeAt(least / 10, 300).state.lawless).toBe(true);
    expect(regimeAt(least * 10, 300).state.lawless).toBe(false);
    // the largest boundary found is no smaller than where a body of the matter found collapses
    expect(most).toBeGreaterThanOrEqual(3e11);
  });
});
