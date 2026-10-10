// The complex inventions as instruments. A house, a car and a 3D printer are stated as what people want of regions
// under an environment; the language attempts to manifold each; what stops it is classified by the distinction it
// lacks, and a distinction that stops all three is a candidate for the language itself, never a fix for one of them.

import { describe, expect, it } from 'vitest';
import { attempt, distinctions, showChain } from '../../src/nexus/attempt';
import { ASPECTS, car, house, printer } from './inventions';

const all = () => [house(), car(), printer()];

describe('attempt 0: the substrate as it is', () => {
  it('the closure over the book finds no chain for a held temperature: temperature is an input of 25 laws and the output of one, whose resistance nothing gives', () => {
    for (const i of all()) {
      const a = attempt(i);
      const temps = a.outcomes.filter((o) => o.want.quantity.unit === 'degC');
      expect(temps.length).toBeGreaterThan(0);
      for (const o of temps) {
        expect(o.verdict).toBe('laws produce it from what nothing gives');
        expect(o.consumers.length).toBe(25); // (24 until Wien's displacement law was added for the thermal cameras)
        expect(o.producers.map((l) => l.id)).toEqual(['thermal.network']);
      }
    }
  });

  it('accelerations have no producer; flows, rates and now light do, and light stops one step further on, at the boundary', () => {
    const none = all().flatMap((i) => attempt(i).outcomes.filter((o) => o.verdict === 'no law produces it').map((o) => `${i.name}: ${o.want.id}`));
    expect(none).toEqual(['a car: pick up', 'a car: stop', 'a car: smooth', 'a car: survive']);
    // (the house's light had no producer at all until Beer–Lambert was added for the x-ray instruments: a law that says
    //  what is left of a beam after it has gone through something. It produces light now — and the attempt stops one
    //  step later, for want of two regions that touch, which is the distinction this probe is about)
    const light = attempt(house()).outcomes.find((o) => o.want.id === 'light')!;
    expect(light.verdict).toBe('laws produce it only across regions that do not touch');
    expect(light.producers.map((l) => l.id)).toEqual(['attenuation.exponential']);
    // the house's fresh air and water and the printer's rate were unproduced before the universal laws: conservation,
    // Henry's law and the counting laws produce them now, though by several chains with nothing yet to choose between them
    const h = attempt(house());
    for (const id of ['fresh', 'not damp', 'water']) expect(h.outcomes.find((o) => o.want.id === id)!.verdict, id).toBe('several chains, nothing to choose by');
  });

  it('what closes, closes by dimension alone, and reads as nonsense: the language has nothing else to check a chain by', () => {
    const h = attempt(house());
    const getOut = h.outcomes.find((o) => o.want.id === 'get out')!;
    expect(getOut.grounded.map(showChain)).toContain('pendulum.period(L = height of the rooms [inside])');
    const voltage = h.outcomes.find((o) => o.want.id === 'voltage')!;
    expect(voltage.verdict).toBe('one chain');
    expect(showChain(voltage.grounded[0]!)).toBe('lead-acid.ocv(SG = people [the people])');
  });

  it('the same distinctions stop all three, the car needing one more, and nothing of the structure each needs is made', () => {
    const lacks = all().map((i) => distinctions(attempt(i)).map((d) => d.lacks));
    // (the house lacked a flow across a boundary until light had a producer; now only the car does, and the house and
    //  the printer are stopped by the same four)
    expect(lacks.map((l) => l.length)).toEqual([4, 5, 4]);
    expect(lacks[0]).toEqual(lacks[2]);
    for (const d of lacks[0]!) expect(lacks[1]).toContain(d);
    for (const i of all()) expect(attempt(i).structure.length).toBe(0);
    // the aspects the request names are evaluated against the structure made: none, for all three
    expect(ASPECTS.house.length + ASPECTS.car.length + ASPECTS.printer.length).toBe(29 + 19 + 16);
  });
});

import { carrierById, coupling, family, matter, UNIVERSAL } from '../../src/nexus/carrier';
import { generate, lacking, type Structure } from '../../src/nexus/manifold';
import { covered } from './inventions';
import type { Intent } from '../../src/nexus/want';

const round1 = () => { const intents = [house(), car(), printer()]; return { intents, structures: intents.map(generate) }; };
const el = (s: Structure, id: string) => s.elements.find((e) => e.id === id)!;
const value = (s: Structure, id: string, name: string) => el(s, id).values.find((v) => v.name.startsWith(name))!.value;

describe('the language now: carriers, balances and shapes generate structure', () => {
  it('a structure is a pure function of its intent: generated twice it is the same, and nothing a round made is kept', () => {
    const a = generate(house());
    a.elements.splice(0, 5);
    a.gaps.length = 0;
    expect(JSON.stringify(generate(house()))).toBe(JSON.stringify(generate(house())));
    expect(generate(house()).elements.length).toBeGreaterThan(a.elements.length);
  });

  it('no element names a part: the generator writes carriers, regions and roles, and recognizing a wall or a wheel is the evaluator\'s', () => {
    const words = /\b(walls?|roofs?|floors?|windows?|doors?|pipes?|wires?|wiring|motors?|engines?|batter(y|ies)|wheels?|tyres?|tires?|brakes?|suspension|nozzles?|extruders?|heaters?|lamps?|fans?|pumps?|thermostats?|radiators?|gutters?|foundations?|steer\w*)\b/i;
    const { intents, structures } = round1();
    structures.forEach((s, k) => {
      const names = (intents[k] as Intent).regions.flatMap((r) => [r.id, ...Object.values(r.quantities).map((l) => l.name), ...Object.values(r.produces ?? {}).map((l) => l.name)]);
      const strip = (t: string) => names.reduce((x, n) => x.split(n).join(''), t);
      for (const e of s.elements) { expect(strip(e.says)).not.toMatch(words); expect(strip(e.why.rule)).not.toMatch(words); }
    });
  });

  it('every element has a lineage that reaches a want, and every law it rests on is generated by a carrier or a coupling', () => {
    const generated = new Set<string>();
    // every carrier the structures use, universal or a matter the intents name
    const carriers = [...UNIVERSAL, ...[...new Set(round1().structures.flatMap((s) => s.elements.map((e) => e.carrier)))].filter((id) => !UNIVERSAL.some((u) => u.id === id)).map(matter)];
    for (const c of carriers) for (const l of family(c)) generated.add(l.id);
    for (const a of carriers) for (const b of carriers) if (a.conjugate && b.conjugate) for (const l of coupling(a, b)) generated.add(l.id);
    for (const s of round1().structures) for (const e of s.elements) {
      let at: typeof e | undefined = e, hops = 0;
      while (at && !at.why.want && hops++ < 20) at = s.elements.find((x) => x.id === at!.why.parent);
      expect(at?.why.want, `${s.intent}: ${e.id}`).toBeTruthy();
      for (const id of [...e.why.laws, ...e.also.flatMap((l) => l.laws)]) expect(generated.has(id), `${e.id}: ${id}`).toBe(true);
    }
    expect(carrierById('energy').id).toBe('energy');
  });

  it('what the balances give: nothing told the generator about ventilation, wiring, a crash or a tolerance', () => {
    const [h, c, p] = round1().structures as [Structure, Structure, Structure];
    // four people's breath at 1000 ppm against outside air: 38.6 L/s of exchange (ASHRAE 62.2's rule for this house gives about 36 L/s)
    expect(value(h, 'boundary:amount of carbon dioxide:inside|outside air', 'least conductance')).toBeCloseTo(0.0386, 4);
    // 10 kW at 120 V within a 6 V drop: at least 13.9 S of path, shedding 500 W at that limit, opened above it
    expect(value(h, 'path:charge:the grid->inside', 'least conductance')).toBeCloseTo(13.89, 2);
    expect(value(h, 'path:charge:the grid->inside', 'heat it makes')).toBeCloseTo(500, 6);
    expect(h.elements.some((e) => e.id === 'protection:path:charge:the grid->inside')).toBe(true);
    // heat: outside air at its coldest and the ground are below the band, so the supply is a conversion; the ground, always below it, takes heat out without power
    expect(el(h, 'conversion:energy:inside:supply').why.rule).toMatch(/no reservoir drives/);
    expect(h.elements.some((e) => e.id === 'path:energy:inside->the ground')).toBe(true);
    // the car: the contact carries 6.87 m/s² at the site's friction, so stopping at 8 m/s² is refused; a 50 km/h crash under 40 g needs a 0.24 m stroke
    expect(value(c, 'contact:the people|the road', 'most acceleration')).toBeCloseTo(0.7 * 9.80665, 9);
    expect(c.gaps.some((g) => g.want === 'stop' && /does not|at most 6.86/.test(g.lacks))).toBe(true);
    expect(value(c, 'stroke:momentum:the people', 'least stroke')).toBeCloseTo(13.89 ** 2 / 800, 9);
    // the printer: a point that moves over the shape, observed finer than half the tolerance, held to the table stiff enough
    expect(value(p, 'observer:position:deposit:the part', 'resolution needed')).toBeCloseTo(5e-5, 12);
    expect(el(p, 'conversion:volume of PLA:the part:supply').says).toMatch(/raises volume of PLA from a spool of filament/);
  });

  it('what the shapes give: a square plan chosen in the space, loads on the faces they cross, spans, a passage, a curve\'s speed, a part\'s three axes', () => {
    const [h, c, p] = round1().structures as [Structure, Structure, Structure];
    // the plan with the least boundary for 120 m² is square: the space derives it under the declared preference
    expect(value(h, 'boundary:energy:inside|outside air:up', 'area')).toBeCloseTo(120, 6);
    expect(value(h, 'boundary:energy:inside|outside air:side', 'area')).toBeCloseTo(4 * Math.sqrt(120) * 2.5, 1);
    // snow on the up face, wind on the largest side, carried by members spanning each face to the ground
    expect(value(h, 'load:the sky->inside', 'force')).toBeCloseTo(168000, 6);
    expect(value(h, 'load:outside air->inside', 'force')).toBeCloseTo(1000 * Math.sqrt(120) * 2.5, 0);
    expect(value(h, 'members:inside:up', 'span')).toBeCloseTo(Math.sqrt(120), 1);
    expect(value(h, 'members:inside:side', 'span')).toBe(2.5);
    expect(value(h, 'bound:momentum:inside|the ground', 'least meeting area')).toBeCloseTo((168000 + 300 * 9.80665) / 72000, 4);
    // the people leave across the sides in seconds, through a passage they open and close
    expect(value(h, 'passage:the people|inside', 'time to leave')).toBeCloseTo(Math.hypot(Math.sqrt(120), Math.sqrt(120)) / 2 / 1.2, 3);
    // the car: momentum across the travel on the tightest curve allows √(μ g r); what it must hold faces the travel
    expect(value(c, 'contact:the people|the road', 'most speed on the tightest curve')).toBeCloseTo(Math.sqrt(0.7 * 9.80665 * 50), 9);
    expect(value(c, 'drag:moving:the people|outside air', 'area facing the travel')).toBeCloseTo(1.4, 12);
    expect(c.elements.find((e) => e.id === 'filter:momentum:the people')!.says).toMatch(/\(height of the road's bumps\)/);
    // the printer: a point moved over a 0.2 m extent moves along three axes; the largest part within a day asks 33 times the stated rate
    expect(['x', 'y', 'z'].map((a) => value(p, `conversion:charge->momentum:deposit:the part:${a}`, 'travel'))).toEqual([0.2, 0.2, 0.2]);
    expect(value(p, 'use:volume of PLA:the part', 'least flux to fill it in time')).toBeCloseTo(0.008 / 86400, 15);
    expect(value(p, 'use:volume of PLA:the part', 'least flux to fill it in time') / value(p, 'use:volume of PLA:the part', 'least flux')).toBeGreaterThan(33);
  });

  it('what the matter gives: a threshold makes a held region, a limit makes a protection, a bound makes a guard, a shrink makes a calibration', () => {
    const [h, , p] = round1().structures as [Structure, Structure, Structure];
    // PLA flows only above 190 °C: the place it must flow is a region held between that and what it bears, supplied, observed, cut above 220 °C
    const flow = 'flows:volume of PLA:the part';
    expect(el(p, flow).values.slice(0, 2).map((v) => v.value)).toEqual([190 + 273.15, 220 + 273.15]);
    // and the stream must stay in it its own time: the length that takes (tests/nexus/high-bar.test.ts)
    expect(value(p, flow, 'least length a round stream is held in it')).toBeGreaterThan(0);
    expect(el(p, `conversion:energy:${flow}:supply`).why.rule).toMatch(/no reservoir drives/);
    expect(value(p, `observer:energy:${flow}`, 'resolution needed')).toBeCloseTo(15, 9);
    expect(p.elements.some((e) => e.id === `protection:${flow}`)).toBe(true);
    // the person may touch nothing above 60 °C: the hot region keeps its outer face below it where it meets the room
    expect(el(p, `guard:${flow}`).regions).toEqual([flow, 'room air']);
    // PLA sets at its glass transition and shrinks to the room's temperature: 0.27 %, 0.54 mm over 0.2 m, 5.4 times the tolerance
    expect(value(p, 'compensation:the part', 'shrink')).toBeCloseTo(6.8e-5 * 40, 12);
    expect(value(p, 'compensation:the part', 'change over the largest extent')).toBeCloseTo(6.8e-5 * 40 * 0.2, 12);
    expect(value(p, 'calibration:the part', 'change over the tolerance')).toBeCloseTo(6.8e-5 * 40 * 0.2 / 1e-4, 9);
    // the charge path is made of the available matter that conducts charge best, which fixes its least section over length
    const path = 'path:charge:the grid->inside';
    expect(el(h, path).values.find((v) => v.name.startsWith('made of'))!.name).toMatch(/^made of Copper C110/);
    expect(value(h, path, 'least section over length')).toBeCloseTo(value(h, path, 'least conductance') / value(h, path, 'made of'), 15);
  });

  it('what a flow of matter carries: one air flow for the species and the heat, raised or pushed by the wind; rain carried across; a liquid driven by its height; the heat PLA takes in', () => {
    const [h, , p] = round1().structures as [Structure, Structure, Structure];
    const ex = 'exchange:inside|outside air';
    expect(value(h, ex, 'least flow')).toBeCloseTo(0.0386, 4);
    expect(value(h, ex, 'heat it carries out')).toBeCloseTo(1.2 * 1005 * value(h, ex, 'least flow') * 40, 6);
    expect(value(h, 'conversion:energy:inside:supply', 'least it supplies for the exchanged air')).toBeCloseTo(value(h, ex, 'heat it carries out'), 9);
    expect(['recovery:inside|outside air', 'conversion:volume of air:inside|outside air', `wind:${ex}`].every((id) => h.elements.some((e) => e.id === id))).toBe(true);
    expect(h.gaps.some((g) => /advection/.test(g.lacks))).toBe(false);
    // rain falls through air the wind pushes across: the sides are closed too, and the faces intercept the rain on the plan and the sides
    expect(h.elements.some((e) => e.id === 'boundary:volume of water:inside|outside air:closed:side')).toBe(true);
    expect(value(h, 'boundary:volume of water:inside|outside air:closed', 'what the up and side faces intercept')).toBeCloseTo(2.08e-5 * (120 + 4 * Math.sqrt(120) * 2.5), 9);
    // a liquid's potential is its pressure and its height: from the roof and from the floor to the sewer 1.5 m below
    expect(value(h, 'path:volume of water:outside air->the sewer', 'what drives it')).toBeCloseTo(1000 * 9.80665 * (2.5 + 1.5), 6);
    expect(value(h, 'path:volume of water:inside->the sewer', 'what drives it')).toBeCloseTo(1000 * 9.80665 * 1.5, 6);
    // the PLA that flows in at the room's temperature takes density times specific heat times flow times 170 K
    expect(value(p, 'conversion:energy:flows:volume of PLA:the part:supply', 'least power to bring')).toBeCloseTo(1240 * 1800 * (0.008 / 86400) * 170, 6);
  });

  it('coverage against the aspects the request names: none in round 0, 44 of 64 in round 1, 50 in round 2, 53 in round 3, 56 now, and what is not covered is named', () => {
    const [h, c, p] = round1().structures as [Structure, Structure, Structure];
    expect([covered('house', h).length, covered('car', c).length, covered('printer', p).length]).toEqual([26, 15, 15]);
    const missing = (k: 'house' | 'car' | 'printer', s: Structure) => ASPECTS[k].filter((a) => !covered(k, s).includes(a));
    expect(missing('house', h)).toEqual(['maintenance/access', 'material compatibility', 'manufacturing/construction constraints']);
    expect(missing('car', c)).toEqual(['transmission', 'mechanical interfaces', 'manufacturing', 'maintenance']);
    expect(missing('printer', p)).toEqual(['manufacturing constraints']);
  });

  it('the failures rank the next upgrade: what blocks all three inventions now is data, not the language', () => {
    const { intents, structures } = round1();
    const ranked = lacking(intents, structures);
    // what the kept data does not state, and, since the depth of each potential is followed (src/nexus/depth.ts), how
    // far a charge moves freely in their matter: each holds a potential past what binds the settled level, and whether
    // that takes it apart lies between the field across one unit and the whole drop
    expect(ranked.filter((l) => l.inventions.length === 3).map((l) => l.distinction)).toEqual(['knowledge: the kept data does not state it', 'depth (data): how far a charge moves freely before it strikes something']);
    expect(ranked.find((l) => l.distinction.startsWith('direction'))).toBeUndefined();
    expect(ranked.find((l) => l.distinction.startsWith('advection'))).toBeUndefined();
    expect(ranked.find((l) => l.distinction.startsWith('gravity'))).toBeUndefined();
  });
});
