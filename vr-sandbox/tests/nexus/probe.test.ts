// The complex inventions as instruments. A house, a car and a 3D printer are stated as what people want of regions
// under an environment; the language attempts to manifold each; what stops it is classified by the distinction it
// lacks, and a distinction that stops all three is a candidate for the language itself, never a fix for one of them.

import { describe, expect, it } from 'vitest';
import { attempt, distinctions, showChain } from '../../src/nexus/attempt';
import { ASPECTS, car, house, printer } from './inventions';

const all = () => [house(), car(), printer()];

describe('attempt 0: the substrate as it is', () => {
  it('the closure over the book finds no chain for a held temperature: temperature is an input of 17 laws and the output of one, whose resistance nothing gives', () => {
    for (const i of all()) {
      const a = attempt(i);
      const temps = a.outcomes.filter((o) => o.want.quantity.unit === 'degC');
      expect(temps.length).toBeGreaterThan(0);
      for (const o of temps) {
        expect(o.verdict).toBe('laws produce it from what nothing gives');
        expect(o.consumers.length).toBe(17);
        expect(o.producers.map((l) => l.id)).toEqual(['thermal.network']);
      }
    }
  });

  it('flows, rates and accelerations have no producer at all', () => {
    const none = all().flatMap((i) => attempt(i).outcomes.filter((o) => o.verdict === 'no law produces it').map((o) => `${i.name}: ${o.want.id}`));
    expect(none).toEqual(['a house: fresh', 'a house: not damp', 'a house: light', 'a house: water', 'a car: pick up', 'a car: stop', 'a car: smooth', 'a car: survive', 'a 3D printer: rate']);
  });

  it('what closes, closes by dimension alone, and reads as nonsense: the language has nothing else to check a chain by', () => {
    const h = attempt(house());
    const getOut = h.outcomes.find((o) => o.want.id === 'get out')!;
    expect(getOut.grounded.map(showChain)).toContain('pendulum.period(L = height of the rooms [inside])');
    const voltage = h.outcomes.find((o) => o.want.id === 'voltage')!;
    expect(voltage.verdict).toBe('one chain');
    expect(showChain(voltage.grounded[0]!)).toBe('lead-acid.ocv(SG = people [the people])');
  });

  it('the same five distinctions stop all three, and nothing of the structure each needs is made', () => {
    const lacks = all().map((i) => distinctions(attempt(i)).map((d) => d.lacks));
    for (const l of lacks) expect(l.length).toBe(5);
    expect(lacks[0]).toEqual(lacks[1]);
    expect(lacks[1]).toEqual(lacks[2]);
    for (const i of all()) expect(attempt(i).structure.length).toBe(0);
    // the aspects the request names are evaluated against the structure made: none, for all three
    expect(ASPECTS.house.length + ASPECTS.car.length + ASPECTS.printer.length).toBe(29 + 19 + 16);
  });
});
