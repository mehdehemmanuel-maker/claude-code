// Overlap: two solids cannot share space. A part placed where another is never enters the world (K-5), so there is
// no overlap for the solver to push out of and no energy to be made doing it. What does stand apart, with nothing but
// gravity acting on it, moves no faster than a fall allows.

import { describe, expect, it } from 'vitest';
import { at, rig, type Rig } from './helpers';
import { ConstructionRefused } from '../../src/ganglia/tree/gate';
import { axisAngle } from '../../src/doc/math';

/** Places the parts in a zero-g scene; a refusal to construct is returned, not thrown, and the scene released. */
async function placing(parts: (r: Rig) => void): Promise<ConstructionRefused | null> {
  const r = await rig({ gravity: [0, 0, 0] }, false);
  try { parts(r); return null; } catch (e) { if (e instanceof ConstructionRefused) return e; throw e; } finally { r.done(); }
}

// Two solids cannot share space: an overlap is not a state the world moves out of, it is a construction that never
// happens (K-5). Each of these was once placed and relied on the solver to push the parts apart without adding
// energy; now none of them exists to be pushed.
describe('two solids cannot share space: a part placed where another is never enters the world', () => {
  it('a breakable rod through a block', async () => {
    const no = await placing((r) => {
      r.part('block', at(0, 1, 0), { material: 'steel.a36', frozen: true, params: { x: 0.2, y: 0.2, z: 0.2 } });
      r.part('rod.round', at(0, 1.07, 0, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: 1, diameter: 0.02, fracture: 'auto' } });
    });
    expect(no?.refusal.law).toBe('K-5');
    expect(no?.refusal.reason).toMatch(/would be where Block is, by 4[0-9]\.\d mm/);
  });

  it('a breakable I-beam through a block', async () => {
    const no = await placing((r) => {
      r.part('block', at(0, 1, 0), { material: 'steel.a36', params: { x: 0.2, y: 0.2, z: 0.2 } });
      r.part('beam.i', at(0.05, 1.05, 0), { material: 'steel.a36', params: { length: 2, fracture: 'auto' } });
    });
    expect(no?.refusal.law).toBe('K-5');
    expect(no?.refusal.name).toBe('I-beam');
  });

  it('a light breakable rod inside a body a million times heavier', async () => {
    const no = await placing((r) => {
      r.part('sphere', at(0, 2, 0), { material: 'rubber.natural', params: { diameter: 3 } });
      r.part('rod.round', at(0.9, 2, 0.3, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: 1.9, diameter: 0.0015, fracture: 'auto' } });
    });
    expect(no?.refusal.law).toBe('K-5');
    expect(no?.refusal.name).toBe('Round rod');
  });

  it('a very slender bonded wire placed through a slab', async () => {
    const no = await placing((r) => {
      r.part('block', at(0, 0.3, 0), { material: 'wood.douglas-fir', frozen: true, params: { x: 17, y: 0.05, z: 2 } });
      r.part('rod.round', at(0, 0.3, 0.3, [0.3, 0.2, 0.5, 0.787]), { material: 'steel.1018-cd', params: { length: 1.89, diameter: 0.0014, fracture: 'auto' } });
    });
    expect(no?.refusal.law).toBe('K-5');
  });

  it('two breakable plates crossing', async () => {
    const no = await placing((r) => {
      r.part('plate', at(0, 1, 0), { material: 'aluminum.6061-t6', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
      r.part('plate', at(0.02, 1.001, 0, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]), { material: 'steel.a36', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
    });
    expect(no?.refusal.law).toBe('K-5');
  });

  it('a cylinder lying on a tilted face is apart by its clearance, not refused for its bounding box', async () => {
    const no = await placing((r) => {
      const th = (12 * Math.PI) / 180;
      r.part('plate', at(0, 1, 0, axisAngle([0, 0, 1], -th)), { frozen: true, material: 'rubber.natural', params: { length: 6, width: 1, thickness: 0.05 } });
      const nrm = [Math.sin(th), Math.cos(th)];
      r.part('rod.round', at(nrm[0]! * 0.076, 1 + nrm[1]! * 0.076, 0, axisAngle([1, 0, 0], Math.PI / 2)), { material: 'rubber.natural', params: { diameter: 0.1, length: 0.2 } });
    });
    expect(no).toBeNull();
  });
});

describe('what stands apart adds no energy', () => {
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
