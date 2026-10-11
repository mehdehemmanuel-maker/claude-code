// Round 5: a family as a want-space. A vehicle is not an invention but a point of a space whose axes are what a person
// and a site vary (what the payload moves on or through, its source of power, the site's gravity, its mass and its
// speed, down to where a fluid's momentum is conducted). The language generates every point; what physics requires of
// any vehicle is read from each structure (tests/nexus/families.ts). Nothing here names a kind of vehicle: wheels,
// hulls, wings, balloons, rockets and sails are regions of the space, reached by the state of what is touched.

import { describe, expect, it } from 'vitest';
import { BOOK, lawById } from '../../src/nexus/book';
import { carrierById, coupling, family, reaction, UNIVERSAL } from '../../src/nexus/substrate/carrier';
import { ofLeaf } from '../../src/nexus/lang/evaluate';
import { apply, type Law } from '../../src/nexus/lang/law';
import { generate, type Structure } from '../../src/nexus/substrate/manifold';
import { vapourPressure } from '../../src/nexus/substrate/phase';
import { leaf } from '../../src/nexus/lang/term';
import { base, lattice, read, vehicle, type VehiclePoint } from './families';

const run = (l: Law, inputs: Record<string, number>) => apply(l, Object.fromEntries(l.inputs.map((p) => [p.sym, ofLeaf(leaf(p.name, inputs[p.sym]!, p.unit, { class: 'given', by: 'the test' }))])));
const law = (id: string) => reaction().find((l) => l.id === `reaction.${id}`)!;
const book = (id: string) => { const l = lawById(id); return { l, out: l.example!.output }; };

let cached: { p: VehiclePoint; s: Structure; r: ReturnType<typeof read> }[] | null = null;
const map = () => (cached ??= lattice().map((p) => { const i = vehicle(p); const s = generate(i); return { p, s, r: read(i, s, p) }; }));
const at = (q: Partial<VehiclePoint>) => generate(vehicle({ ...base, ...q }));
const el = (s: Structure, id: string) => s.elements.find((e) => e.id === id);
const val = (s: Structure, id: string, name: string) => { const e = el(s, id); const v = e?.values.find((x) => x.name.startsWith(name)); if (!v) throw new Error(`${id}: no value ${name} (has ${e?.values.map((x) => x.name).join('; ') ?? 'no element'})`); return v.value; };
const tag = (p: VehiclePoint) => `${p.medium}/${p.source}/${p.gravity}/${p.mass}/${p.speed}`;

describe('the reaction family: momentum crossing into matter, generated, against the book', () => {
  it('the speed gained by ejecting matter is the rocket equation, by the binder over the mass spent, on the book\'s own example', () => {
    const t = book('tsiolkovsky');
    const d = run(law('ejection'), t.l.example!.inputs);
    expect(Math.abs(d.value! - t.out)).toBeLessThanOrEqual(Math.max(d.uncertainty ?? 0, 1e-6 * t.out));
  });

  it('a fluid at rest pushes up by the weight it displaces: Archimedes on the book\'s example, gravity an input rather than a constant', () => {
    const b = book('buoyancy');
    expect(run(law('buoyancy'), { ...b.l.example!.inputs, g: 9.80665 }).value).toBeCloseTo(b.out, 9);
  });

  it('how fast a push travels through matter is one law: the bar\'s, with the matter\'s stiffness under compression', () => {
    const b = book('sound.speed');
    expect(run(law('sound'), { K: b.l.example!.inputs.E!, rho: b.l.example!.inputs.rho! }).value).toBeCloseTo(b.out, 6);
  });

  it('light carries its energy over c as momentum, and a slow sphere conducts momentum by 6π μ r', () => {
    expect(run(law('light'), { P: 299792458 }).value).toBeCloseTo(1, 12);
    expect(run(law('conducted'), { mu: 1e-3, r: 1e-5, v: 1e-4 }).value).toBeCloseTo(6 * Math.PI * 1e-12, 20);
  });
});

describe('the vehicle family: every point generated, read by what physics requires', () => {
  it('every point of the space is lawful: nothing generated rolls on a fluid, rests its weight on one, or pushes against nothing', () => {
    expect(map().length).toBe(147);
    for (const x of map()) expect(x.r.impossible, tag(x.p)).toEqual([]);
  });

  it('where physics refuses, the language refuses and says why: wind is air that moves, and there is none in a vacuum or under water', () => {
    const fails = (k: 'supported' | 'propelled' | 'powered') => map().filter((x) => !x.r[k]).map((x) => tag(x.p)).sort();
    const windWithout = (media: string[], gravities?: string[]) => map().filter((x) => x.p.source === 'wind' && media.includes(x.p.medium) && (!gravities || gravities.includes(x.p.gravity))).map((x) => tag(x.p)).sort();
    expect(fails('powered')).toEqual(windWithout(['vacuum', 'under water']));
    expect(fails('propelled')).toEqual(windWithout(['vacuum']));
    expect(fails('supported')).toEqual(windWithout(['vacuum'], ['earth', 'moon']));
    for (const x of map().filter((x) => !x.r.powered)) expect(x.s.gaps.some((g) => g.lacks === 'nothing offers the power to move'), tag(x.p)).toBe(true);
  });

  it('how it is pushed is the state of what it touches: a contact on what holds its shape, the fluid\'s matter in what flows, and in a vacuum only what it ejects or emits', () => {
    for (const { p, s } of map()) {
      const ids = s.elements.map((e) => e.id);
      const contact = ids.some((id) => id.startsWith('contact:'));
      const throughFluid = ids.some((id) => /^thrust:the payload\|the (water|air)$/.test(id));
      const ejected = ids.includes('thrust:the payload|ejected');
      if (['road', 'rails', 'ice'].includes(p.medium)) { expect(contact, tag(p)).toBe(true); expect(ids.some((id) => /^thrust:the payload\|the (ground|ice)$/.test(id)), tag(p)).toBe(false); }
      else expect(contact, tag(p)).toBe(false);
      expect(throughFluid, tag(p)).toBe(['water', 'under water', 'air'].includes(p.medium));
      expect(ejected, tag(p)).toBe(p.medium === 'vacuum' && p.source === 'fuel at the start');
    }
    // ice is water below what it holds its shape below: the same matter, a contact; above it, a fluid pushed
    expect(el(at({ medium: 'ice' }), 'contact:the payload|the ice')).toBeTruthy();
    expect(el(at({ medium: 'water' }), 'thrust:the payload|the water')).toBeTruthy();
  });

  it('what holds it up is the state of what it touches: contact on a solid, the displaced weight in a fluid (and a stream turned down while moving), ejection or light in a vacuum, nothing where gravity is none', () => {
    const water = at({ medium: 'water' });
    expect(val(water, 'buoyancy:the payload|the water', 'least volume displaced')).toBeCloseTo(0.4, 12);
    expect(val(water, 'buoyancy:the payload|the water', 'its mean density as it is')).toBeCloseTo(400 / (1.4 * 1.0 * 1.8), 9);
    expect(val(at({ medium: 'air' }), 'buoyancy:the payload|the air', 'least volume displaced')).toBeCloseTo(400 / 1.2, 9);
    expect(el(water, 'lift:the payload|the water')!.oneOf).toBe('support of the payload');
    expect(el(at({ medium: 'road', gravity: 'none' }), 'free:the payload')).toBeTruthy();
    // in a vacuum, staying up by ejection is paid over the whole trip: gravity times its duration, against the speed of what leaves
    const ve = Math.sqrt(2 * 4.6e7), t = 400000 / 30;
    expect(val(at({ medium: 'vacuum', source: 'fuel at the start', gravity: 'moon' }), 'hover:the payload|ejected', 'mass it must start with over the mass it ends with, to stay up')).toBeCloseTo(Math.exp(1.62 * t / ve), 9);
    expect(val(at({ medium: 'vacuum', source: 'fuel at the start' }), 'hover:the payload|ejected', 'mass it must start with over the mass it ends with, to stay up')).toBeCloseTo(Math.exp(9.80665 * t / ve), -2);
    expect(val(at({ medium: 'vacuum', source: 'charge at the start', gravity: 'moon' }), 'hover:the payload|light', 'least power of light emitted')).toBeCloseTo(400 * 1.62 * 299792458, -3);
  });

  it('power is a difference of potential: the air and the water at their own pressure offer none, and the stopping a contact allows is friction times the site\'s gravity', () => {
    for (const { p, s } of map()) expect(s.elements.some((e) => e.id.startsWith('store:volume of')), tag(p)).toBe(false);
    const refused = (q: Partial<VehiclePoint>) => at(q).gaps.some((g) => /^the want asks 2 m\/s² and the contact carries at most/.test(g.lacks));
    expect(refused({ medium: 'road' })).toBe(false);
    expect([refused({ medium: 'rails' }), refused({ medium: 'ice' }), refused({ medium: 'road', gravity: 'moon' }), refused({ medium: 'road', gravity: 'none' })]).toEqual([true, true, true, true]);
    // with no weight to press it, a contact pushes only where something else presses it
    expect(el(at({ medium: 'rails', gravity: 'none' }), 'grip:the payload|the ground')).toBeTruthy();
  });

  it('the regime decides which law holds: a picogram under water is in conducted momentum, where nothing is held up by a stream and only a stroke that is not its own reverse moves it', () => {
    const s = at({ medium: 'under water', mass: 1e-12, speed: 1e-4, range: 0.36 });
    const k = Math.cbrt(1e-12 / 400), r = 1.0 * k / 2;
    expect(val(s, 'drag:moving:the payload|the water', 'momentum it carries over momentum it conducts')).toBeCloseTo(1000 * 1e-4 * 1.8 * k / 1.1e-3, 9);
    expect(val(s, 'drag:moving:the payload|the water', 'the resistance is conducted momentum')).toBeCloseTo(6 * Math.PI * 1.1e-3 * r * 1e-4, 18);
    expect(el(s, 'thrust:the payload|the water')!.says).toMatch(/must not be its own reverse/);
    expect(el(s, 'lift:the payload|the water')).toBeUndefined();
    expect(val(s, 'hover:the payload|the water', 'speed it sinks at')).toBeCloseTo(1e-12 * 9.80665 / (6 * Math.PI * 1.1e-3 * r), 12);
    // the same payload at 400 kg and 30 m/s carries its momentum, and the drag coefficient is what the language cannot yet generate
    expect(val(at({ medium: 'under water' }), 'drag:moving:the payload|the water', 'the resistance is carried momentum')).toBe(2);
  });

  it('a speed against how fast the matter can answer: near the speed of a push through air its density changes; on water, past the speed of a wave its own length, it climbs that wave', () => {
    expect(val(at({ medium: 'air', speed: 250 }), 'drag:moving:the payload|the air', 'the speed over that (the Mach number): its density changes')).toBeCloseTo(250 / Math.sqrt(1.42e5 / 1.2), 9);
    const cw = Math.sqrt(9.80665 * 1.8 / (2 * Math.PI));
    expect(val(at({ medium: 'water' }), 'drag:moving:the payload|the water', 'the speed over that: past one it climbs')).toBeCloseTo(30 / cw, 9);
    expect(val(at({ medium: 'water', speed: 1 }), 'drag:moving:the payload|the water', 'the speed over that: below one it parts')).toBeCloseTo(1 / cw, 9);
  });

  it('a liquid boils where the flow around the moving region drops its pressure below the vapour pressure its own phases give: under water, never at 1 m/s, by its shape at 30 m/s, around any shape at 250 m/s', () => {
    const pv = vapourPressure('water', 288.15);
    expect(Math.abs(pv - 1705.6) / 1705.6).toBeLessThan(0.002); // IAPWS-95: 1.7056 kPa at 15 °C
    const sigma = (v: number) => val(at({ medium: 'under water', speed: v }), 'drag:moving:the payload|the water', 'the pressure above boiling over half the density times the speed squared');
    for (const v of [1, 30, 250]) expect(sigma(v)).toBeCloseTo((101325 - pv) / (0.5 * 1000 * v * v), 9);
    const says = (v: number) => el(at({ medium: 'under water', speed: v }), 'drag:moving:the payload|the water')!.values.find((x) => x.name.startsWith('the pressure above boiling'))!.name;
    expect(says(1)).toMatch(/nowhere around it can boil/);
    expect(says(30)).toMatch(/its shape's/);
    expect(says(250)).toMatch(/boils around any shape/);
    // air is a gas whose phases the language holds no data for: nothing is said of its boiling
    expect(el(at({ medium: 'air', speed: 250 }), 'drag:moving:the payload|the air')!.values.some((x) => /boil/.test(x.name))).toBe(false);
  });

  it('light carries momentum, and heat in a vacuum leaves only as light: a sail, an emitter, a radiating surface', () => {
    const s = at({ medium: 'vacuum', source: 'sunlight', gravity: 'none' });
    expect(val(s, 'thrust:the payload|the sky', 'push per area of a face that stops the flux')).toBeCloseTo(1000 / 299792458, 15);
    expect(val(s, 'thrust:the payload|light', 'push for each watt of light emitted')).toBeCloseTo(1 / 299792458, 18);
    const rad = s.elements.filter((e) => e.id.startsWith('radiate:'));
    expect(rad.length).toBeGreaterThan(0);
    for (const e of rad) expect(e.why.laws).toEqual(['radiation']);
  });

  it('every law a family structure cites is generated (a carrier\'s family, a coupling, the reaction family) or sourced in the book, and the book laws cited are named', () => {
    const generated = new Set<string>(reaction().map((l) => l.id));
    const carriers = [...new Set([...UNIVERSAL.map((c) => c.id), ...map().flatMap((x) => x.s.elements.map((e) => e.carrier))])].map(carrierById);
    for (const c of carriers) for (const l of family(c)) generated.add(l.id);
    for (const a of carriers) for (const b of carriers) if (a.conjugate && b.conjugate) for (const l of coupling(a, b)) generated.add(l.id);
    const fromBook = new Set<string>();
    for (const { p, s } of map()) for (const e of s.elements) for (const id of [...e.why.laws, ...e.also.flatMap((x) => x.laws)]) {
      if (generated.has(id)) continue;
      expect(BOOK.some((l) => l.id === id), `${tag(p)} ${e.id}: ${id}`).toBe(true);
      fromBook.add(id);
    }
    expect([...fromBook].sort()).toEqual(['radiation', 'reynolds']);
  });
});
