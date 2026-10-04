// Depth (src/nexus/depth.ts): how far down a phenomenon must be followed, decided by what is asked of it. What these
// tests hold is what the descent must reproduce from the ladder the tuner derives, never what one descent printed.

import { describe, expect, it } from 'vitest';
import { CONST } from '../../src/nexus/book/constants';
import { descend, explain, heat, levelsAt, motion, potential, powersFor } from '../../src/nexus/depth';
import { copyAt, ladder, universe } from '../../src/nexus/tuner';

const eV = 1.602176634e-19;

describe('the levels are what the ladder finds, as many as it finds', () => {
  it('the ladder closes by itself: it stops at the first level that settles nothing new, with no depth given', () => {
    const l = ladder(universe());
    expect(l.closed).toBe(true);
    expect(l.levels.at(-1)!.structures).toEqual([]);
  });

  it('from the weakest bound to the strongest: what settles, then each particle (its rest energy), then the floor', () => {
    const ls = levelsAt(300);
    expect(ls.map((l) => l.kind)).toEqual(['structure', 'particle', 'particle', 'floor']);
    expect(ls[0]!.binding / eV).toBeCloseTo(27.211386, 4);
    expect(ls[1]!.binding / eV / 510998.95).toBeCloseTo(1, 6);
    expect(ls[3]!.size / 1.616255e-35).toBeCloseTo(1, 4);
  });
});

describe('a process goes down as far as it changes things, and stops where it leaves a level whole', () => {
  it('heat at a room\'s temperature leaves what settles whole: sufficient at the first level', () => {
    const d = descend(heat(300), { L: 1 });
    expect(d.stop).toBe('sufficient');
    expect(d.at!.kind).toBe('structure');
  });

  it('heat whose share of broken units exceeds the tolerance takes the level apart and goes on down', () => {
    // the share e^(−E_b/kT) passes a part in a hundred where kT = E_b / ln 100
    const Tc = 27.211386 * eV / Math.log(100) / CONST.kB.value!;
    expect(descend(heat(Tc * 0.95)).at!.kind).toBe('structure');
    expect(descend(heat(Tc * 1.05)).at!.kind).toBe('particle');
    // the tolerance asked is the depth asked: a want held to a part in a million must go deeper at a lower heat
    expect(descend(heat(Tc * 0.95), { tolerance: 1e-6 }).at!.kind).toBe('particle');
  });

  it('time decides as much as energy: a process shorter than a level\'s lifetime has not yet taken its share apart', () => {
    const T = 1e5, full = descend(heat(T)), brief = descend(heat(T, 1e-19));
    expect(full.steps[0]!.verdict).toBe('changes');
    // a tenth of an attosecond is faster than the settled level's own clock: it resolves the inside instead of breaking it
    expect(brief.steps[0]!.verdict).toBe('resolved');
    expect(brief.steps[0]!.changed).toBeLessThan(0.01);
  });

  it('a lifetime under heat is Eyring\'s: attempted at kT/h, succeeding by e^(−E_b/kT)', () => {
    const s = descend(heat(1e4)).steps[0]!, kT = CONST.kB.value! * 1e4;
    expect(s.lifetimeDecades!).toBeCloseTo(Math.log10(CONST.h.value! / kT) + s.level.binding / kT / Math.LN10, 9);
  });

  it('a motion gives each level (γ − 1) m c² a unit: fast enough to take what settles apart, it leaves the electron whole', () => {
    const v = Math.sqrt(2 * 27.211386 * eV / levelsAt(null)[0]!.mass);
    expect(descend(motion(v * 0.9)).at!.kind).toBe('structure');
    expect(descend(motion(v * 1.1)).at!.what).toBe('the electron');
    expect(descend(motion(CONST.c.value!)).stop).toBe('refused');
  });

  it('a potential across a size gives a charge between the field across one unit and the whole drop: between, the matter decides', () => {
    expect(descend(potential(10, null, 1e-2)).stop).toBe('sufficient');
    const d = descend(potential(1000, null, 1e-2));
    expect(d.stop).toBe('gap');
    expect(d.gap!.kind).toBe('data');
    // a field that pulls one unit's own charges apart (e·V·a/L past the binding) takes it apart whatever the matter
    expect(descend(potential(1e3, null, 1e-9)).steps[0]!.verdict).toBe('changes');
  });

  it('past every level, the gap is in the laws; inside the smallest unit, it is in the primitives', () => {
    expect(descend(heat(1e33)).gap!.kind).toBe('law');
    expect(descend(heat(300), { L: 1e-20 }).gap!.kind).toBe('primitive');
    expect(descend(heat(300), { L: 1e-40 }).gap!.kind).toBe('law');
  });
});

describe('a quantity is explained at the level whose scale it has, or the gap is located', () => {
  it('the powers of size, mass and binding with a dimension are unique: a density is m/L³, a stiffness E/L³, a temperature E/k', () => {
    expect(powersFor('kg/m^3')).toMatchObject({ size: -3, mass: 1, binding: 0, charge: 0, boltzmann: 0 });
    expect(powersFor('Pa')).toMatchObject({ size: -3, mass: 0, binding: 1 });
    expect(powersFor('K')).toMatchObject({ size: 0, mass: 0, binding: 1, boltzmann: -1 });
    expect(powersFor('S/m')).toMatchObject({ size: -2, mass: -0.5, binding: -0.5, charge: 2 });
  });

  it('the density of a dense solid is explained at what settles; a density twenty times lower is not, and the gap says where', () => {
    // CODATA's Bohr radius and the atomic mass unit: what settles sets m/a³ ≈ 1.1e4 kg/m³
    const lv = levelsAt(null)[0]!;
    expect(lv.mass / lv.size ** 3).toBeCloseTo(1.66e-27 * (1 + 1 / 1822.888) / 5.29177e-11 ** 3, -2);
    expect(explain({ name: 'a dense solid', value: lv.mass / lv.size ** 3 / 3, unit: 'kg/m^3' }).stop).toBe('explained');
    const g = explain({ name: 'a porous solid', value: lv.mass / lv.size ** 3 / 20, unit: 'kg/m^3' });
    expect(g.stop).toBe('gap');
    expect(g.gap!.kind).toBe('relationship');
    expect(g.gap!.says).toMatch(/1\.3 decades below/);
  });

  it('a quantity of charges is set by the lightest charged constituent: the scale for conduction uses the electron\'s mass', () => {
    const lv = levelsAt(null)[0]!, e = CONST.F.value! / (CONST.R.value! / CONST.kB.value!);
    const scale = e ** 2 / (lv.size ** 2 * Math.sqrt(CONST.me.value! * lv.binding));
    expect(explain({ name: 'a conductivity', value: scale, unit: 'S/m' }).tried[0]!.predicted / scale).toBeCloseTo(1, 9);
  });

  it('at a heat where nothing settles, a datum of matter that holds together is not one of this regime', () => {
    expect(explain({ name: 'a density', value: 1000, unit: 'kg/m^3' }, 1e6).gap!.kind).toBe('data');
  });
});

describe('as above, so below: what a copy at another scale needs', () => {
  it('a copy at any scale needs gravitation × by², every mass ÷ by and the heat ÷ by, with the electric coupling as it is', () => {
    const c = copyAt(1, 1e-20, 300);
    expect(c.possible).toBe(true);
    expect(Object.fromEntries(c.needs.map((n) => [n.key, n.exponent]))).toEqual({ G: 2, q2: 0, me: -1, mu: -1, kT: -1 });
    expect(c.clocks).toBe(1e-20);
  });

  it('with the constants as measured, the world at another size is not a copy: it lies past the boundaries between', () => {
    expect(copyAt(1, 1e-20, 300).passed.map((x) => x.boundary)).toContain('settles');
    expect(copyAt(1, 1.0001, 300).passed).toEqual([]);
  });
});

describe('a named matter goes down through its own levels first, by the laws that read the kept species', () => {
  it('water at a bar: whole as a liquid at 300 K; at 400 K its vapour has the lesser Gibbs energy, so it is followed to its molecule', () => {
    expect(descend(heat(300), { of: { matter: 'water' } }).at!.what).toBe('the liquid of water');
    const d = descend(heat(400), { of: { matter: 'water' } });
    expect(d.steps[0]!.verdict).toBe('changes');
    expect(d.at!.what).toBe('the molecule of water');
  });

  it('a crystal sets the scale of its own density and stiffness: iron\'s, from its lattice and its cohesion alone', () => {
    // the measured density (CRC) and bulk modulus (Kittel) are checks here, never inputs
    expect(explain({ name: 'density of iron', value: 7874, unit: 'kg/m^3' }, null, { matter: 'Fe' }).level!.what).toBe('the crystal of Fe');
    expect(explain({ name: 'bulk modulus of iron', value: 1.683e11, unit: 'Pa' }, null, { matter: 'Fe' }).stop).toBe('explained');
  });

  it('a yield strength two decades below the crystal\'s binding pressure is located above the crystal, not explained by it', () => {
    const e = explain({ name: 'yield strength of a mild steel', value: 2.5e8, unit: 'Pa' }, null, { matter: 'Fe' });
    expect(e.stop).toBe('gap');
    expect(e.gap!.says).toMatch(/below the scale the crystal of Fe sets/);
  });

  it('a pair among units at a known density comes apart by Saha\'s balance: the thinner the matter, the more of it at one heat', () => {
    const share = (n: number) => descend(heat(12000), { of: { n } }).steps[0]!.changed;
    expect(share(1e14)).toBeGreaterThan(share(1e20));
    expect(share(1e20)).toBeGreaterThan(descend(heat(12000)).steps[0]!.changed);
  });
});
