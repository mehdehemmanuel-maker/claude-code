// Operating what was built (src/nexus/embody/operate.ts): run through the duty its wants ask, each failure found where
// it happens with what asked it and what it hangs from; and practice, the design learning from what was observed.

import { describe, expect, it } from 'vitest';
import { car, house } from '../../src/nexus/asked';
import { generate } from '../../src/nexus/manifold';
import { embodyAny } from '../../src/nexus/embody/any';
import { learnFrom, operate, practice } from '../../src/nexus/embody/operate';

describe('operating what was built', () => {
  it('practises a car: operating finds what the design missed, it learns from what it observed, and the rebuilt car holds its duty', () => {
    const i = car(), r = practice(i, generate(i));
    expect(r.history[0]!.events.length).toBeGreaterThan(0);
    expect(r.history.at(-1)!.events).toEqual([]);
    expect(r.learned.why!.length).toBeGreaterThan(0);
    // the rebuilt pack stores what the trip used
    expect(r.operation!.observed.storeEnergy!).toBeLessThanOrEqual(r.machine.plant!.store!.E);
    // each failure says what asked it: the store's current is asked by the circuits it feeds
    const over = r.history[0]!.events.find((e) => e.check === 'current' || e.check === 'energy')!;
    expect(over.node).toBe('battery/cells');
    expect(over.demand.some((n) => /^wiring\//.test(n))).toBe(true);
  });

  it('keeps a house through cold days; with half its heating taken away it finds the cold, and learns the heating the coldest hour needs', () => {
    const i = house(), m = embodyAny(i, generate(i))!, op = operate(m)!;
    expect(op.events).toEqual([]);
    expect(op.observed.tooCold!).toBeGreaterThanOrEqual(m.plant!.hold!.Tlo - 0.5);
    const weak = { ...m, plant: { ...m.plant!, hold: { ...m.plant!.hold!, heat: m.plant!.hold!.heat / 2.5 } } }, cold = operate(weak)!;
    const e = cold.events.find((x) => x.check === 'cold')!;
    expect(e.node).toBe('heating/panels');
    const learned = learnFrom(cold, weak, {})!;
    expect(learned.heat! * weak.plant!.hold!.heat).toBeGreaterThanOrEqual(cold.observed.heatNeeded!);
  });
});
