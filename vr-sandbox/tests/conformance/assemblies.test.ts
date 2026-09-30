// Bonded assemblies (breakable stock) as the rigid bodies they are: a torque-free spin keeps its energy, and a part
// dropped on the floor comes to rest there.

import { describe, expect, it } from 'vitest';
import { at, rig, type Rig } from './helpers';
import type { StepResult } from '../../src/physics/protocol';

/** Kinetic energy and the fastest surface speed (speed + spin x radius of gyration about the spin axis) over bodies. */
function motion(r: Rig, s: StepResult, slots: (string | null)[]) {
  let E = 0, rim = 0;
  slots.forEach((id, i) => {
    if (!id || !r.world.isBody(id)) return;
    const m = r.world.bodyMass(id), I = r.world.bodyInertia(id);
    if (m === undefined || !I) return;
    const v = s.velocities;
    const lv = [v[i * 6]!, v[i * 6 + 1]!, v[i * 6 + 2]!], w = [v[i * 6 + 3]!, v[i * 6 + 4]!, v[i * 6 + 5]!];
    const Iw = [0, 1, 2].map((k) => I[k * 3]! * w[0]! + I[k * 3 + 1]! * w[1]! + I[k * 3 + 2]! * w[2]!);
    const wIw = w[0]! * Iw[0]! + w[1]! * Iw[1]! + w[2]! * Iw[2]!;
    const speed = Math.hypot(...lv), spin = Math.hypot(...w);
    E += 0.5 * m * speed * speed + 0.5 * wIw;
    rim = Math.max(rim, speed + (spin > 0 ? spin * Math.sqrt(wIw / (m * spin * spin)) : 0));
  });
  return { E, rim };
}

describe('bonded assemblies', () => {
  it('a fast torque-free spin of an uneven bonded part never gains energy', async () => {
    // A thin steel angle (an uneven section) spun at 30 rad/s near its unstable intermediate axis, in zero g: with
    // nothing acting on it, its energy may not grow. Stepped explicitly, the gyroscopic term grew it without bound.
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const angle = r.part('angle', at(0, 1, 0), { material: 'steel.a36', params: { length: 1, leg: 0.04, t: 0.004, fracture: 'auto' } });
    r.world.apply({ op: 'setPose', id: angle.id, pose: at(0, 1, 0), linear: [0, 0, 0], angular: [1, 30, 2] });
    let slots: (string | null)[] = [];
    let E0 = NaN, Emax = 0;
    for (let t = 0; t < 180; t++) {
      const s = r.world.step();
      if (s.slots) slots = s.slots;
      const { E } = motion(r, s, slots);
      if (Number.isNaN(E0)) E0 = E;
      Emax = Math.max(Emax, E);
    }
    expect(E0).toBeGreaterThan(0);
    expect(Emax).toBeLessThanOrEqual(E0 * (1 + 1e-9));
    r.done();
  });

  it('a thin bonded angle dropped on the floor comes to rest', async () => {
    // Found by the stress web (chaos seed 3): alone on the floor it rocked at the tick rate for ever and slowly
    // gained energy, because the assembly solve re-solved contacts Jolt had overshot. At rest means no point of it
    // moving faster than 1 cm/s (the watchdog's "restless").
    const r = await rig({ gravity: [0, -9.81, 0] });
    r.part('angle', at(-0.426, 0.908, 1.056, [-0.012, 0.474, 0.715, 0.513]), { material: 'steel.52100', params: { fracture: 'auto', length: 1, leg: 0.01737, t: 0.000862 } });
    let slots: (string | null)[] = [];
    let late = 0;
    for (let t = 0; t < 360; t++) {
      const s = r.world.step();
      if (s.slots) slots = s.slots;
      if (t >= 270) late = Math.max(late, motion(r, s, slots).rim);
    }
    expect(late).toBeLessThan(0.01);
    r.done();
  });
});
