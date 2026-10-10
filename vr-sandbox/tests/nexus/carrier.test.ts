// The carrier and what it generates. A conserved quantity counted over regions has a content, a potential and a
// flux; one mechanism read for each carrier gives its laws, and one more couples two carriers. The book's
// hand-written laws are instances: each is reproduced on its own worked example by a generated law with the book's
// inputs mapped onto it. The mapping is the only knowledge in this file; the laws are generated.

import { describe, expect, it } from 'vitest';
import { BOOK, lawById } from '../../src/nexus/book';
import { carrierById, coupling, family, matter, roleOf, UNIVERSAL, type Carrier } from '../../src/nexus/substrate/carrier';
import { ofLeaf, type Derivation } from '../../src/nexus/substrate/evaluate';
import { apply, type Law } from '../../src/nexus/substrate/law';
import { leaf } from '../../src/nexus/substrate/term';

const rec = (name: string, v: number, unit: string): Derivation => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'the test' }));
const gen = (c: Carrier, what: string): Law => family(c).find((l) => l.id === `${c.id}.${what}`)!;
const run = (l: Law, inputs: Record<string, number>) => apply(l, Object.fromEntries(l.inputs.map((p) => [p.sym, rec(p.name, inputs[p.sym]!, p.unit)])));
/** The book law on its example, in SI. */
const book = (id: string) => { const l = lawById(id); return { l, ex: l.example!.inputs, out: run(l, l.example!.inputs).value! }; };

const charge = carrierById('charge'), energy = carrierById('energy'), momentum = carrierById('momentum'), angular = carrierById('angular momentum'), co2 = matter('amount of carbon dioxide');

describe('the carrier', () => {
  it('a flux is a content per second, and whether potential times flux is power is computed, not declared', () => {
    expect(UNIVERSAL.map((c) => [c.id, c.conjugate])).toEqual([['energy', false], ['charge', true], ['momentum', true], ['angular momentum', true], ['light', false]]);
    expect(matter('volume of water').conjugate).toBe(true);
    expect(matter('amount of carbon dioxide').conjugate).toBe(false);
    expect(() => matter('water')).toThrow(/volume of, an amount of or a mass of/);
  });

  it('a quantity\'s kind is its role in its carrier: the dimension alone could not tell them apart', () => {
    expect(roleOf(energy, 'degC')).toBe('potential');
    expect(roleOf(matter('volume of water'), 'Pa')).toBe('potential');
    expect(roleOf(momentum, 'Pa')).toBe('flux density');
    expect(roleOf(charge, 'W')).toBe('power');
    expect(roleOf(energy, 'W')).toBe('flux');
    expect(roleOf(momentum, 'm/s^2')).toBe('acceleration');
    expect(roleOf(co2, 'mol/m^3')).toBe('potential');
  });

  it('each carrier\'s path conductivity is the material constant physics names for it: one mechanism, five constants', () => {
    const units = (c: Carrier) => gen(c, 'path-conductance').inputs.find((p) => p.sym === 'sigma')!.unit;
    const same = (a: string, b: string) => expect(leaf('a', 1, a, { class: 'given', by: 't' }).dim).toEqual(leaf('b', 1, b, { class: 'given', by: 't' }).dim);
    same(units(energy), 'W/m K');                     // thermal conductivity
    same(units(charge), 'S/m');                       // electrical conductivity
    same(units(momentum), 'Pa s');                    // dynamic viscosity: viscous flow is momentum conduction
    same(units(co2), 'm^2/s');                        // diffusivity
    same(gen(momentum, 'storage').inputs[0]!.unit, 'kg'); // the capacitance of momentum is mass
    same(gen(angular, 'storage').inputs[0]!.unit, 'kg m^2'); // of angular momentum, the moment of inertia
  });
});

describe('the book\'s laws are instances of the family', () => {
  const cases: [string, () => { generated: number; book: number }][] = [
    ['ohm', () => { const b = book('ohm'); return { book: b.ex['I']!, generated: run(gen(charge, 'conductance'), { G: 1 / b.ex['R']!, de: b.out }).value! }; }],
    ['wire.resistance', () => { const b = book('wire.resistance'); return { book: b.out, generated: 1 / run(gen(charge, 'path-conductance'), { sigma: 1 / b.ex['rho']!, A: b.ex['A']!, L: b.ex['L']! }).value! }; }],
    ['wire.drop', () => { const b = book('wire.drop'); const G = run(gen(charge, 'path-conductance'), { sigma: 1, A: 1 / b.ex['Rm']!, L: 2 * b.ex['L']! }).value!; return { book: b.out, generated: b.ex['I']! / G }; }],
    ['conduction', () => { const b = book('conduction'); const G = run(gen(energy, 'path-conductance'), { sigma: b.ex['k']!, A: b.ex['A']!, L: b.ex['L']! }).value!; return { book: b.out, generated: run(gen(energy, 'conductance'), { G, de: b.ex['dT']! }).value! }; }],
    ['thermal.resistance.conduction', () => { const b = book('thermal.resistance.conduction'); return { book: b.out, generated: 1 / run(gen(energy, 'path-conductance'), { sigma: b.ex['k']!, A: b.ex['A']!, L: b.ex['L']! }).value! }; }],
    ['convection', () => { const b = book('convection'); return { book: b.out, generated: run(gen(energy, 'conductance'), { G: b.ex['h']! * b.ex['A']!, de: b.ex['dT']! }).value! }; }],
    ['heat.capacity', () => { const b = book('heat.capacity'); return { book: b.out, generated: run(gen(energy, 'storage'), { C: b.ex['m']! * b.ex['c']!, e: b.ex['dT']! }).value! }; }],
    ['lumped.time-constant', () => { const b = book('lumped.time-constant'); return { book: b.out, generated: run(gen(energy, 'time-constant'), { C: b.ex['m']! * b.ex['c']!, G: b.ex['h']! * b.ex['A']! }).value! }; }],
    ['rc.time-constant', () => { const b = book('rc.time-constant'); return { book: b.out, generated: run(gen(charge, 'time-constant'), { C: b.ex['C']!, G: 1 / b.ex['R']! }).value! }; }],
    ['power.electric', () => { const b = book('power.electric'); return { book: b.out, generated: run(gen(charge, 'power'), { e: b.ex['V']!, J: b.ex['I']! }).value! }; }],
    ['power.linear', () => { const b = book('power.linear'); return { book: b.out, generated: run(gen(momentum, 'power'), { e: b.ex['v']!, J: b.ex['F']! }).value! }; }],
    ['power.rotary', () => { const b = book('power.rotary'); return { book: b.out, generated: run(gen(angular, 'power'), { e: b.ex['w']!, J: b.ex['T']! }).value! }; }],
    ['joule', () => { const b = book('joule'); return { book: b.out, generated: run(gen(charge, 'dissipation'), { J: b.ex['I']!, G: 1 / b.ex['R']! }).value! }; }],
    ['capacitor.energy', () => { const b = book('capacitor.energy'); return { book: b.out, generated: run(gen(charge, 'stored-energy'), { C: b.ex['C']!, Q: b.ex['C']! * b.ex['V']! }).value! }; }],
    ['energy.kinetic', () => { const b = book('energy.kinetic'); return { book: b.out, generated: run(gen(momentum, 'stored-energy'), { C: b.ex['m']!, Q: b.ex['m']! * b.ex['v']! }).value! }; }],
    ['energy.rotational', () => { const b = book('energy.rotational'); return { book: b.out, generated: run(gen(angular, 'stored-energy'), { C: b.ex['I']!, Q: b.ex['I']! * b.ex['w']! }).value! }; }],
    ['inductor.energy', () => { const b = book('inductor.energy'); return { book: b.out, generated: run(gen(charge, 'flux-stored-energy'), { Lf: b.ex['L']!, J: b.ex['I']! }).value! }; }],
    ['spring.energy', () => { const b = book('spring.energy'); const F = b.ex['k']! * b.ex['x']!; return { book: b.out, generated: run(gen(momentum, 'flux-stored-energy'), { Lf: 1 / b.ex['k']!, J: F }).value! }; }],
    ['fick.diffusion', () => { const b = book('fick.diffusion'); const G = run(gen(co2, 'path-conductance'), { sigma: b.ex['D']!, A: 1, L: b.ex['L']! }).value!; return { book: b.out, generated: run(gen(co2, 'conductance'), { G, de: b.ex['dC']! }).value! }; }],
    ['motor.torque', () => { const b = book('motor.torque'); return { book: b.out, generated: run(coupling(charge, angular)[0]!, { eta: 1, n: b.ex['Kt']!, Ja: b.ex['I']! }).value! }; }],
    ['motor.back-emf', () => { const b = book('motor.back-emf'); return { book: b.out, generated: run(coupling(charge, angular)[1]!, { n: b.ex['Ke']!, eb: b.ex['w']! }).value! }; }],
    ['gear.output.torque', () => { const b = book('gear.output.torque'); return { book: b.out, generated: run(coupling(angular, angular)[0]!, { eta: b.ex['eta']!, n: b.ex['i']!, Ja: b.ex['T']! }).value! }; }],
  ];
  for (const [id, f] of cases) it(`${id}`, () => { const { generated, book: b } = f(); expect(Math.abs(generated - b)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(b))); });

  it('twenty-two written laws are instances of one family and one coupling; the wire drop\'s factor of two is charge conservation (the current returns), not a constant', () => {
    expect(cases.length).toBe(22);
    for (const [id] of cases) expect(BOOK.some((l) => l.id === id)).toBe(true);
  });
});
