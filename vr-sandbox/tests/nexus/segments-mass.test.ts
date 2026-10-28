// A body's segments (src/nexus/life/segments.ts): de Leva's shares of its mass, its centre of mass where his tables put it.

import { describe, expect, it } from 'vitest';
import { centreOfMass, rigOf } from '../../src/nexus/life/segments';
import { layOut } from '../../src/nexus/anatomy';

 
describe('a body as the segments physics moves', () => {
  it('carries de Leva\'s shares of its mass, its centre of mass about 55 % of its height up', () => {
    for (const sex of [0, 1]) {
      const b = layOut({ sex, mass: sex ? 60 : 73, height: sex ? 1.63 : 1.76 }), rig = rigOf(b);
      expect(Math.abs(rig.mass - b.params.mass) / b.params.mass, `sex ${sex}`).toBeLessThan(0.001); // de Leva's women's shares add to 0.9999 as published
      const h = centreOfMass(rig)[1] / b.H; expect(h).toBeGreaterThan(0.52); expect(h).toBeLessThan(0.58);
      expect(rig.joints.length).toBe(15); expect(rig.segments.length).toBe(16);
    }
    // a woman's muscle (0.7 of a man's, ICRP 89) makes her joints' torques that much of his
    expect(rigOf(layOut({ sex: 1, muscle: 0.7 })).strength).toBeCloseTo(0.7, 6);
  });
  });

