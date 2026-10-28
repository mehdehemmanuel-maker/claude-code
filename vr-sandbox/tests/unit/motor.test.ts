// The motor and battery models tuned against what their makers publish: each derived figure must land on the
// datasheet's own, to the datasheet's precision.

import { describe, expect, it } from 'vitest';
import { GEARHEADS } from '../../src/data/motors';
import { throughGear } from '../../src/engineering/dcmotor';


describe('DC motors, as their datasheets give them', () => {
  
  
  
  it('a gearhead multiplies torque by its ratio less its losses, and its losses always go against the power', () => {
    const g = GEARHEADS['gearhead.planetary.d42-12to1']!;
    expect(throughGear(0.1, 100, g)).toBeCloseTo(0.1 * 12 * 0.81, 12);
    // driven backwards through it (the output turning the motor), the motor sees less than ratio x torque
    expect(Math.abs(throughGear(-0.1, 100, g))).toBeGreaterThan(0.1 * 12);
  });
});

