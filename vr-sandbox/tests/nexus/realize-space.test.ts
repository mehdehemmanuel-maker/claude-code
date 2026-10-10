// A generated structure given a body in space (src/nexus/substrate/realize-space.ts): whatever was asked, every region and every
// element the generator made becomes a thing with a place, in the order it was made, and every gap is placed where it
// stopped. What these tests hold is that rule, never one layout.

import { describe, expect, it } from 'vitest';
import { car, house, printer } from '../../src/nexus/ask/asked';
import { drawIntent } from '../../src/nexus/substrate/draw';
import { generate } from '../../src/nexus/substrate/manifold';
import { realize, whyOf } from '../../src/nexus/substrate/realize-space';

describe('anything generated has a body in space', () => {
  for (const [name, intent] of [['a 3D printer', printer()], ['a house', house()], ['a car', car()], ['a drawn intent', drawIntent(5007, 3).intent]] as const) {
    it(`${name}: every region, element and gap becomes a placed thing, in the order it was generated`, () => {
      const s = generate(intent), sp = realize(intent, s);
      expect(sp.things.length).toBe(intent.regions.length + s.elements.length + s.gaps.length);
      expect(sp.things.map((t) => t.order)).toEqual(sp.things.map((_, i) => i));
      for (const t of sp.things) { expect(t.at.every(Number.isFinite)).toBe(true); expect(t.size.every((x) => Number.isFinite(x) && x >= 0)).toBe(true); }
      // it fits where it is shown
      for (const t of sp.things.filter((x) => x.shape !== 'medium')) expect(Math.hypot(t.at[0], t.at[2])).toBeLessThanOrEqual(sp.radius * 1.0001);
    });
  }

  it('a conversion that drives along an axis is a rail along that axis, as long as the travel it derived (at the model\'s scale)', () => {
    const sp = realize(printer(), generate(printer()));
    for (const ax of ['x', 'y', 'z'] as const) {
      const rail = sp.things.find((t) => t.shape === 'rail' && t.axis === ax)!;
      const along = rail.size[{ x: 0, y: 1, z: 2 }[ax]]!, travel = rail.values.find((v) => v.name === 'travel')!.value;
      expect(along).toBeGreaterThan(travel * sp.scale);
      expect(Math.max(...rail.size)).toBe(along);
    }
  });

  it('why a thing is there is walked up through what required it, to what the person said', () => {
    const sp = realize(printer(), generate(printer()));
    const why = whyOf(sp, 'observer:position:deposit:the part:x');
    expect(why.at(-1)).toBe('because you said: “the part has the shape I drew, within a tenth of a millimetre”');
  });

  it('the same intent gives the same body', () => {
    expect(JSON.stringify(realize(printer(), generate(printer())))).toBe(JSON.stringify(realize(printer(), generate(printer()))));
  });
});
