// An ask in plain words (src/nexus/ask/words.ts): what the person says is kept as given, what they leave out is an
// estimate on stated grounds, and the ask built from it is one the generator and the embodiment make hardware of.

import { describe, expect, it } from 'vitest';
import { generate } from '../../src/nexus/substrate/manifold';
import { embodyAny } from '../../src/nexus/embody/any';
import { readAsk, type AskReading, foldDemand } from '../../src/nexus/ask/words';
import { intentFromSpec } from '../../src/nexus/ask/spec';

const read = (s: string) => { const r = readAsk(s); if ('problems' in r) throw new Error(r.problems.join('; ')); return r as AskReading; };
const q = (r: AskReading, region: string, sym: string) => r.intent.regions.find((x) => x.id === region)!.quantities[sym]!;

describe('an ask in plain words', () => {
  it('reads a car for people: the people, the range, the top speed and 0 to 100 as given, and the car is built', () => {
    const r = read('Build me an electric car for 2 people that goes 300 km at 130 km/h, 0 to 100 km/h in 8 s');
    expect(r.shape).toBe('carried');
    expect(q(r, 'the people', 'n').value).toBe(2);
    const w = (id: string) => r.intent.wants.find((x) => x.id === id)!;
    expect(w('go far').lo!.value).toBeCloseTo(300000, 6);
    expect(w('fast').hi!.value).toBeCloseTo(130 / 3.6, 6);
    expect(w('pick up').lo!.value).toBeCloseTo(100 / 3.6 / 8, 6);
    expect(w('fast').hi!.origin.class).toBe('given');
    const m = embodyAny(r.intent, generate(r.intent))!;
    expect(m.flaws.filter((f) => f.check === 'gap' || f.check === 'held')).toEqual([]);
  });

  it('reads a place to live: people, floor area and the coldest night as given, the rest estimated and said so', () => {
    const r = read('a small cabin of 40 m² for 2 people where winter gets to -25 °C');
    expect(r.shape).toBe('place');
    expect(q(r, 'inside', 'Afloor').value).toBe(40);
    expect(q(r, 'outside air', 'Tlo').value).toBeCloseTo(248.15, 6);
    expect(q(r, 'the people', 'm').origin.class).toBe('estimated');
    const m = embodyAny(r.intent, generate(r.intent))!;
    expect(m.flaws.filter((f) => f.check === 'gap' || f.check === 'held')).toEqual([]);
    expect(m.parts.length).toBeGreaterThan(100);
  });

  it('reads a flyer: what it carries, how far and how fast', () => {
    const r = read('a drone that carries a 1.5 kg parcel 8 km at 12 m/s');
    expect(r.intent.regions.find((x) => x.id === 'the payload')!.quantities['m']!.value).toBe(1.5);
    expect(r.heard.some((h) => /through the air/.test(h))).toBe(true);
    const m = embodyAny(r.intent, generate(r.intent))!;
    expect(m.parts.filter((p) => p.id.endsWith('/rotor'))).toHaveLength(4);
  });

  it('reads parts made to any shape: the largest part and its tolerance', () => {
    const r = read('a 3D printer for parts up to 250 mm at 0.1 mm');
    expect(r.shape).toBe('parts');
    expect(r.heard.join(' ')).toMatch(/250 mm/);
  });

  it('writes what it read as a spec that builds back to the same ask, and says when it cannot read one', () => {
    const r = read('a cart that carries 150 kg at 8 km/h');
    const back = intentFromSpec(JSON.parse(JSON.stringify(r.spec)));
    expect(back.problems).toEqual([]);
    expect(generate(back.intent!).elements.map((e) => e.id).sort()).toEqual(generate(r.intent).elements.map((e) => e.id).sort());
    expect('problems' in readAsk('blue')).toBe(true);
  });
});

describe('a demand folded into the ask', () => {
  it('puts a number in the place of the ask\'s number of its kind', () => {
    expect(foldDemand('a cart that carries 150 kg at 8 km/h', 'no, it has to carry 300 kg')).toEqual({ words: 'a cart that carries 300 kg at 8 km/h', changed: ['mass 150 kg → 300 kg'] });
  });
  it('adds a number of a kind the ask did not say', () => {
    const f = foldDemand('a cart that carries 150 kg at 8 km/h', 'it should go 20 km on a charge');
    expect(f.words).toBe('a cart that carries 150 kg at 8 km/h, 20 km');
    expect(f.changed[0]).toMatch(/^range 20 km/);
  });
  it('moves the ask\'s own number by half again for a comparative', () => {
    expect(foldDemand('a cart that carries 150 kg at 8 km/h', 'make it faster').words).toBe('a cart that carries 150 kg at 12 km/h');
  });
  it('changes nothing for what it cannot read, and says so by an empty list', () => {
    expect(foldDemand('a cart that carries 150 kg at 8 km/h', 'mud from the wheels will hit the battery')).toEqual({ words: 'a cart that carries 150 kg at 8 km/h', changed: [] });
  });
});
