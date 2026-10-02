// Ego finds a law herself, from her own world: no formula given, only what was measured and its units. The form comes
// from dimensions, the constant and powers from the measurements, and the result is checked against what her ganglia
// were told.

import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { discover } from '../../src/ganglia';
import { use } from '../../src/ganglia/laws';

describe('finding the math in her own world', () => {
  it('pendulums of three lengths, two gravities and two bobs: she finds T = 2π √(L/g), and that the bob\'s mass doesn\'t matter', async () => {
    const samples: Record<string, number>[] = [];
    for (const g of [9.80665, 4.9]) for (const L of [0.5, 1, 2]) for (const d of [0.04, 0.08]) {
      const r = await rig({ gravity: [0, -g, 0] }, false);
      const th = (4 * Math.PI) / 180;
      const pivot = r.part('block', at(0, 3, 0), { frozen: true, params: { x: 0.02, y: 0.02, z: 0.02 } });
      const bob = r.part('sphere', at(L * Math.sin(th), 3 - L * Math.cos(th), 0), { params: { diameter: d } });
      r.connect('rope', { part: pivot, frame: at(0, 0, 0) }, { part: bob, frame: at(0, 0, 0) }, { grade: 'steel-wire-6x19', diameter: 0.003 });
      const crossings: number[] = [];
      let prev = 1;
      r.run(Math.max(6, 4 * 2 * Math.PI * Math.sqrt(L / g)), (t) => {
        const x = r.pos(bob)[0];
        if (prev > 0 && x <= 0) crossings.push(t);
        prev = x;
      });
      samples.push({ T: (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1), L, g, m: r.world.bodyMass(bob.id)! });
      r.done();
    }
    const found = discover(samples, [{ sym: 'T', unit: 's' }, { sym: 'L', unit: 'm' }, { sym: 'g', unit: 'm/s^2' }, { sym: 'm', unit: 'kg' }], 'T');
    expect(found.dropped).toEqual(['m']);
    expect(found.law).toEqual({ L: 0.5, g: -0.5 });
    expect(found.spread).toBeLessThan(0.01);
    // against what she was told: 2π, and the ganglia's pendulum law
    expect(found.C / (2 * Math.PI)).toBeCloseTo(1, 2);
    expect(found.C * Math.sqrt(1 / 9.80665)).toBeCloseTo(use('pendulum.period', { L: 1 }).value, 2);
  }, 120000);
});
