// What makes the forge alive: rules that start on what happens, the weather it reads, a robot that feels, moves as a
// machine moves and practises; and nodes that may be duplicated.

import { describe, expect, it } from 'vitest';
import { Servo } from '../../src/nexus/motion';



describe('moving as a machine moves', () => {
  it('a servo speeds up no faster than it may, runs no faster than its top speed, and stops on its target', () => {
    const s = new Servo(0, 2, 4); let vmax = 0, last = 0, amax = 0;
    for (let i = 0; i < 400; i++) { s.step(1, 0.01); vmax = Math.max(vmax, Math.abs(s.vel)); if (s.pos !== 1) amax = Math.max(amax, Math.abs(s.vel - last) / 0.01); last = s.vel; }
    expect(s.pos).toBe(1); expect(s.vel).toBe(0); expect(vmax).toBeLessThanOrEqual(2 + 1e-9); expect(amax).toBeLessThanOrEqual(4 + 1e-6);
    // the time a trapezoid takes over 1 m at 2 m/s and 4 m/s² (a triangle, as it never reaches 2 m/s): 2 √(d / a) = 1 s
    const t = new Servo(0, 2, 4); let k = 0; while (t.pos !== 1 && k < 1000) { t.step(1, 0.001); k++; } expect(k * 0.001).toBeCloseTo(1, 1);
  });
    });



