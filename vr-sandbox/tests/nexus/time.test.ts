// Time in living things: each cell's lifespan, each part's power at rest, and what a body does in a day, against what
// is measured (Elia 1992's organ rates, Sender & Milo 2021's cell turnover, ATP turned over at about a body's mass).

import { describe, expect, it } from 'vitest';
import { INVENTORY } from '../../src/nexus/parts/inventory';
import { LIFESPAN, aged, atpPerDay, clockOf, turnover, wattsOf } from '../../src/nexus/life/time';

describe('time in a body', () => {
  it('burns what a resting man burns, the brain and liver each about a fifth', () => {
    const w = wattsOf('human'), kcal = (w * 86400) / 4184;
    expect(kcal).toBeGreaterThan(1550); expect(kcal).toBeLessThan(1900); // Mifflin–St Jeor for 73 kg, 176 cm, 30: about 1,690
    expect(wattsOf('brain') / w).toBeGreaterThan(0.17); expect(wattsOf('brain') / w).toBeLessThan(0.23);
    expect(wattsOf('liver') / w).toBeGreaterThan(0.17); expect(wattsOf('liver') / w).toBeLessThan(0.24);
    // and so it makes and spends about its own weight of ATP a day
    expect(atpPerDay(w) / 73000).toBeGreaterThan(0.85); expect(atpPerDay(w) / 73000).toBeLessThan(1.2);
  });
  it('turns its cells over as they are counted to: hundreds of billions a day, millions of red cells a second', () => {
    const d = turnover('human', 1);
    // Sender & Milo 2021: about 330 billion cells and 80 g a day (here the gut's lining is a larger share, so more)
    expect(d.cells).toBeGreaterThan(2e11); expect(d.cells).toBeLessThan(6e11);
    expect(d.grams).toBeGreaterThan(50); expect(d.grams).toBeLessThan(200);
    const rbc = d.kinds.find((k) => k.id === 'red-blood-cell')!; expect(rbc.perSecond).toBeGreaterThan(2e6); expect(rbc.perSecond).toBeLessThan(3e6);
    expect(d.kinds[0]!.id).toBe('red-blood-cell');
  });
  it('gives every cell kind it times a source or says it is an estimate, and reads as a clock', () => {
    for (const [id, l] of Object.entries(LIFESPAN)) { expect(INVENTORY.has(id), id).toBe(true); expect(l.says.length, id).toBeGreaterThan(5); expect(l.days, id).toBeGreaterThan(0); }
    expect(LIFESPAN['pyramidal-neuron']!.days).toBe(Infinity);
    expect(clockOf('red-blood-cell')).toMatch(/120 days.*million replaced a second/);
    expect(clockOf('brain')).toMatch(/1\d\.\d W at rest/);
  });
  it('ages: shorter, less muscle and bone, a smaller brain, each change said as an estimate', () => {
    const y = aged(30), o = aged(80);
    expect(y.height).toBe(0); expect(y.muscle).toBe(1);
    expect(o.height).toBeLessThan(-0.03); expect(o.muscle).toBeLessThan(0.8); expect(o.bone).toBeLessThan(0.9); expect(o.brain).toBeLessThan(0.95);
    expect(o.says.every((s) => /estimate/.test(s))).toBe(true);
  });
});
