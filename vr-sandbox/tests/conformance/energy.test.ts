// The energy ledger: the world's books close. What falls trades height for speed and nothing else; what slides to a
// stop turns its motion into heat at the contact, most of it in the surface that soaks heat away faster; what is
// pushed by a hand was given that energy by the hand. Whatever nothing explains is the integrator's, and it is small.

import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { getMaterial } from '../../src/data/materials';
import { heatShare } from '../../src/engineering/thermal';
import { heatMade, imbalance, stored, workDone } from '../../src/physics/energy';

const g = 9.81;

describe('the energy ledger', () => {
  it('a falling block trades height for speed, joule for joule', async () => {
    const r = await rig({}, false);
    // 10 cm steel cube: 7.85 kg, dropped from 5 m with no floor below
    const b = r.part('block', at(0, 5, 0), { material: 'steel.a36' });
    r.run(0.05);
    const e0 = r.world.energies();
    const start = stored(e0);
    r.run(0.5);
    const e = r.world.energies();
    const fell = 5 - r.pos(b)[1];
    expect(fell).toBeGreaterThan(1);
    // potential lost is kinetic gained, but for the integrator's own loss: semi-implicit Euler drops m g^2 dt^2 / 2
    // a tick in free fall (0.047 J here), which the books show as the integrator's, not as heat
    const lost = start - stored(e);
    const ticks = 45;
    expect(lost).toBeCloseTo(ticks * 0.5 * 7.85 * g * g * (1 / 90) ** 2, 1);
    expect(lost / (7.85 * g * fell)).toBeLessThan(0.02);
    expect(e.numerical.lost - e0.numerical.lost).toBeCloseTo(lost, 6);
    expect(e.numerical.gained - e0.numerical.gained).toBeLessThan(1e-9); // and it made nothing from nothing
    expect(heatMade(e)).toBeLessThan(1e-6);
    r.done();
  });

  it('a block that slides to a stop turns its motion to friction heat, mostly in the steel', async () => {
    const r = await rig();
    const b = r.part('block', at(0, 0.0505, 0), { material: 'steel.a36' });
    r.run(0.3);
    const before = r.world.energies();
    const heat0 = heatMade(before);
    const start = stored(before);
    // sent across the concrete at 3 m/s
    r.world.apply({ op: 'setPose', id: b.id, pose: { p: r.pos(b), q: [0, 0, 0, 1] }, linear: [3, 0, 0], angular: [0, 0, 0] });
    const ke = 0.5 * 7.85 * 9;
    let partHeat = 0;
    for (let i = 0; i < 270; i++) {
      const out = r.world.step();
      partHeat += out.heat?.[b.id] ?? 0;
    }
    const e = r.world.energies();
    const made = heatMade(e) - heat0;
    expect(r.world.linearVelocity(b.id)![0]).toBeLessThan(0.01);
    // all its kinetic energy went to heat, near enough (the books close to within a few percent)
    expect(made / ke).toBeGreaterThan(0.95);
    expect(made / ke).toBeLessThan(1.05);
    expect(e.heat.friction - before.heat.friction).toBeGreaterThan(0.95 * made);
    // the steel takes its share by Blok's partition against concrete (about 75%)
    const share = heatShare(getMaterial('steel.a36'), getMaterial('concrete.c30'));
    expect(partHeat / made).toBeCloseTo(share, 1);
    expect(Math.abs(stored(e) - (start + ke))).toBeGreaterThan(0); // it did lose what it had
    r.done();
  });

  it('the books close: held + heat + the integrator = start + work, over a bouncing, sliding scene', async () => {
    const r = await rig();
    r.part('block', at(0, 1.5, 0), { material: 'steel.a36' });
    r.part('sphere', at(0.4, 2, 0), { material: 'rubber.natural' });
    r.part('block', at(-0.4, 0.8, 0, [0.2, 0.1, 0, 0.97]), { material: 'wood.douglas-fir' });
    const start = stored(r.world.energies());
    r.run(3);
    const e = r.world.energies();
    expect(heatMade(e)).toBeGreaterThan(1); // the drops lost energy on landing
    expect(e.heat.impact).toBeGreaterThan(0);
    expect(workDone(e)).toBe(0);
    expect(Math.abs(imbalance(start, e))).toBeLessThan(1e-6 * Math.max(1, start));
    // the integrator's share is a small part of what moved
    expect(e.numerical.lost + e.numerical.gained).toBeLessThan(0.1 * heatMade(e) + 0.5);
    expect(e.numerical.gainedHeld).toBe(0); // nothing was held
    r.done();
  });
});
