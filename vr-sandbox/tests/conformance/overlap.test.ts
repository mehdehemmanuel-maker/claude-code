// Overlap: two solids cannot share space, and pushing them apart is not a source of energy. A part placed (or
// knocked) into another is moved out at position level; nothing may leave the overlap with speed it did not have.
// In zero gravity with nothing else acting, the scene's kinetic energy must stay what it was: zero.

import { describe, expect, it } from 'vitest';
import { at, rig, type Rig } from './helpers';
import type { StepResult } from '../../src/physics/protocol';

function kinetic(r: Rig, s: StepResult, slots: (string | null)[]) {
  let e = 0;
  slots.forEach((id, i) => {
    if (!id) return;
    const m = r.world.bodyMass(id);
    const I = r.world.bodyInertia(id);
    if (m === undefined || !I) return;
    const v = s.velocities;
    const lv = [v[i * 6]!, v[i * 6 + 1]!, v[i * 6 + 2]!], w = [v[i * 6 + 3]!, v[i * 6 + 4]!, v[i * 6 + 5]!];
    const Iw = [0, 1, 2].map((k) => I[k * 3]! * w[0]! + I[k * 3 + 1]! * w[1]! + I[k * 3 + 2]! * w[2]!);
    e += 0.5 * m * (lv[0]! ** 2 + lv[1]! ** 2 + lv[2]! ** 2) + 0.5 * (w[0]! * Iw[0]! + w[1]! * Iw[1]! + w[2]! * Iw[2]!);
  });
  return e;
}

/** Runs a zero-g scene for a second; returns the most kinetic energy it ever had. */
function peakEnergy(r: Rig) {
  let slots: (string | null)[] = [];
  let peak = 0;
  for (let t = 0; t < 90; t++) {
    const s = r.world.step();
    if (s.slots) slots = s.slots;
    peak = Math.max(peak, kinetic(r, s, slots));
  }
  return peak;
}

// Solver round-off only: 1 uJ is a 1 kg body at 1.4 mm/s.
const NOTHING = 1e-6;

describe('overlap adds no energy', () => {
  it('a breakable rod through a block', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    // the block is fixed, so how far the rod was moved out reads straight off its height
    r.part('block', at(0, 1, 0), { material: 'steel.a36', frozen: true, params: { x: 0.2, y: 0.2, z: 0.2 } });
    const rod = r.part('rod.round', at(0, 1.07, 0, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: 1, diameter: 0.02, fracture: 'auto' } });
    expect(peakEnergy(r)).toBeLessThan(NOTHING);
    // and it was moved out: the rod's axis now clears the block's face by its radius (less the contact slop)
    expect(Math.abs(r.pos(rod)[1] - 1)).toBeGreaterThan(0.1 + 0.01 - 0.003);
    r.done();
  });

  it('a breakable I-beam through a block', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('block', at(0, 1, 0), { material: 'steel.a36', params: { x: 0.2, y: 0.2, z: 0.2 } });
    r.part('beam.i', at(0.05, 1.05, 0), { material: 'steel.a36', params: { length: 2, fracture: 'auto' } });
    expect(peakEnergy(r)).toBeLessThan(NOTHING);
    r.done();
  });

  it('a light breakable rod inside a body a million times heavier', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('sphere', at(0, 2, 0), { material: 'rubber.natural', params: { diameter: 3 } });
    r.part('rod.round', at(0.9, 2, 0.3, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: 1.9, diameter: 0.0015, fracture: 'auto' } });
    expect(peakEnergy(r)).toBeLessThan(NOTHING);
    r.done();
  });

  // A13: a bonded wire whose segments are far longer than thick. With nothing but gravity acting on it (the slab
  // is fixed), no point of it can move faster than a fall from its highest point allows.
  const wire = { length: 1.89, diameter: 0.0014, fracture: 'auto' } as const;
  const fastest = (r: Rig) => {
    let slots: (string | null)[] = [];
    let top = -Infinity, vmax = 0;
    for (let t = 0; t < 180; t++) {
      const s = r.world.step();
      if (s.slots) slots = s.slots;
      slots.forEach((id, i) => {
        if (!id) return;
        if (t === 0) top = Math.max(top, s.transforms[i * 7 + 1]! + wire.length / 12);
        const v = Math.hypot(s.velocities[i * 6]!, s.velocities[i * 6 + 1]!, s.velocities[i * 6 + 2]!);
        vmax = Number.isFinite(v) ? Math.max(vmax, v) : Infinity;
      });
    }
    return { vmax, fall: Math.sqrt(2 * 9.81 * top) };
  };

  it('a very slender bonded wire dropped on the floor', async () => {
    const r = await rig({ gravity: [0, -9.81, 0] });
    r.part('rod.round', at(0, 0.3, 0, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: wire });
    const { vmax, fall } = fastest(r);
    expect(vmax).toBeLessThan(fall);
    r.done();
  });

  it('a very slender bonded wire placed through a slab', async () => {
    const r = await rig({ gravity: [0, -9.81, 0] });
    r.part('block', at(0, 0.3, 0), { material: 'wood.douglas-fir', frozen: true, params: { x: 17, y: 0.05, z: 2 } });
    r.part('rod.round', at(0, 0.3, 0.3, [0.3, 0.2, 0.5, 0.787]), { material: 'steel.1018-cd', params: wire });
    const { vmax, fall } = fastest(r);
    expect(vmax).toBeLessThan(fall);
    r.done();
  });

  it('two breakable plates crossing', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('plate', at(0, 1, 0), { material: 'aluminum.6061-t6', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
    r.part('plate', at(0.02, 1.001, 0, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]), { material: 'steel.a36', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
    expect(peakEnergy(r)).toBeLessThan(NOTHING);
    r.done();
  });
});

// F3: whatever produces it, a body's state that is not a number must not reach Jolt (whose step does not return
// given one) or spread to what it touches; it is put back where it last was, at rest, and reported.
describe('fault containment', () => {
  it('a non-number velocity is contained and reported', async () => {
    const r = await rig({ gravity: [0, -9.81, 0] });
    const a = r.part('block', at(0, 0.05, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const b = r.part('block', at(0, 0.151, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    r.run(0.5);
    const before = r.pos(b);
    r.world.apply({ op: 'setPose', id: b.id, pose: { p: before, q: [0, 0, 0, 1] }, linear: [NaN, 0, 0], angular: [0, 0, 0] });
    const events = [];
    for (let t = 0; t < 30; t++) events.push(...r.world.step().events);
    expect(events.some((e) => e.type === 'fault' && e.part === b.id)).toBe(true);
    for (const p of [a, b]) expect(r.pos(p).every(Number.isFinite)).toBe(true);
    // put back where it was and stopped: it is still resting on the block below
    expect(Math.hypot(r.pos(b)[0] - before[0], r.pos(b)[1] - before[1], r.pos(b)[2] - before[2])).toBeLessThan(0.002);
    r.done();
  });
});
