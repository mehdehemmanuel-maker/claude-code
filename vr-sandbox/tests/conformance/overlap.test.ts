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

  it('two breakable plates crossing', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('plate', at(0, 1, 0), { material: 'aluminum.6061-t6', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
    r.part('plate', at(0.02, 1.001, 0, [Math.SQRT1_2, 0, 0, Math.SQRT1_2]), { material: 'steel.a36', params: { length: 0.3, width: 0.2, thickness: 0.006, fracture: 'auto' } });
    expect(peakEnergy(r)).toBeLessThan(NOTHING);
    r.done();
  });
});
