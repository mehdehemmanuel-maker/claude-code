// Creatures moving as their size lets them: a walker at the Froude number its gait keeps (a dog trots at Fr about 0.6, a
// T. rex walks at 0.25 on 3.1 m hips), a whale's flukes at a Strouhal number of 0.3, a flier's flapping by Pennycuick's
// formula (a pigeon's comes out near the 5–9 beats a second pigeons fly at), and a dragon's wings as big as lifting its
// weight and a rider at 15 m/s asks.

import { describe, expect, it } from 'vitest';
import { flapRate, froudeSpeed, wingArea } from '../../src/nexus/creatures';
import { kitById, kitFor, makeKit, massOf } from '../../src/nexus/kits';

describe('creatures as their size lets them move', () => {
  it('walks, trots, swims and flies at the rates their bodies give', () => {
    expect(froudeSpeed(0.25, 3.1)).toBeCloseTo(Math.sqrt(0.25 * 9.80665 * 3.1), 9); expect(froudeSpeed(0.6, 0.3)).toBeGreaterThan(1.1); expect(froudeSpeed(0.6, 0.3)).toBeLessThan(1.6);
    const pigeon = flapRate(0.4, 0.67, 0.067); expect(pigeon).toBeGreaterThan(5); expect(pigeon).toBeLessThan(9); // a pigeon flaps about 5–7 times a second
    const S = wingArea(580, 15); expect(S).toBeGreaterThan(20); expect(S).toBeLessThan(32); const f = flapRate(580, Math.sqrt(6 * S), S); expect(f).toBeGreaterThan(0.6); expect(f).toBeLessThan(1.5);
    const whale = kitById('humpback')!.moves!({ age: 'adult' }); expect(whale.freq).toBeCloseTo((0.3 * 2) / (0.2 * 15), 6);
  });
  it('makes each creature from its words, at its real size, and knows how it moves', () => {
    for (const [w, id] of [['a golden retriever puppy that follows me everywhere', 'dog'], ['a bunch of penguins', 'penguin'], ['whales swimming past', 'humpback'], ['a t-rex', 't rex'], ['a dragon I can ride', 'dragon']] as const) expect(kitFor(w)?.id, w).toBe(id);
    const pup = makeKit(kitById('dog')!, 'a golden retriever puppy', 1).part; expect(pup.says).toMatch(/35 cm|3[0-9] cm/); expect(massOf(pup)).toBeGreaterThan(3); expect(massOf(pup)).toBeLessThan(30);
    const rex = makeKit(kitById('t rex')!, 'an adult t rex', 1).part; expect(rex.says).toMatch(/hips 3.1 m/);
    const d = makeKit(kitById('dragon')!, 'a 500 kg dragon with a saddle', 1).part; expect(d.says).toMatch(/580|500 kg and a rider/); expect(d.says).toMatch(/m²/);
  });
});
