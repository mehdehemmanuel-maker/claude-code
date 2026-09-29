// I7 (bounded resources): a physics world gives back all the memory it took. The app builds a new world for every
// template, load and reset, so a leak here grows until the headset's browser runs out of memory.

import { describe, expect, it } from 'vitest';
import { at, jolt, rig } from './helpers';

describe('resources', () => {
  it('creating and destroying worlds, with parts, magnets and joints in them, leaks no memory', async () => {
    const J = (await jolt()) as unknown as { JoltInterface: { prototype: { sGetTotalMemory(): number; sGetFreeMemory(): number } } };
    const used = () => J.JoltInterface.prototype.sGetTotalMemory() - J.JoltInterface.prototype.sGetFreeMemory();
    const once = async () => {
      const r = await rig();
      const a = r.part('block', at(0, 0.1, 0));
      const b = r.part('rod.round', at(0.3, 0.2, 0));
      r.part('magnet.disc', at(-0.3, 0.05, 0));
      r.part('plate', at(-0.3, 0.0, 0), { material: 'steel.1018-cd' });
      r.connect('glued', { part: a, frame: at(0, 0.05, 0) }, { part: b, frame: at(0, 0, 0) });
      r.connect('hinge', { part: b, frame: at(0.2, 0, 0) }, null);
      r.run(0.2);
      r.done();
    };
    await once(); // first use sizes pools and tables
    const base = used();
    for (let i = 0; i < 15; i++) await once();
    expect((used() - base) / 15).toBeLessThan(4096); // bytes per world
  });
});
