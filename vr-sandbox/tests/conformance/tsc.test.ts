// The rigid realisation's domain, measured (src/ganglia/native/tsc.ts, tsc.rigid-domain): in the engine a rigid body is
// one thing, so a push at one end moves the other end in the same tick. Physically a push crosses a bar at the speed
// of sound; in natural rubber that is about 40 m/s, so a 1 m bar's far end should not know for 25 ms, two ticks and
// more. The engine tells it at once: the rigid model is outside its domain for that bar, exactly as the branch derives
// from the tick and the sound speed, and inside it for a 0.2 m bar.

import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { rigidDomain } from '../../src/ganglia/native/tsc';
import { TICK } from '../../src/physics/protocol';

describe('the rigid domain, measured', () => {
  it('a 1 m natural-rubber bar struck at one end: the far end moves in the tick it is struck, before sound could reach it; a 0.2 m bar is inside the domain', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const long = r.part('block', at(0, 1, 0), { material: 'rubber.natural', params: { x: 1.0, y: 0.05, z: 0.05 } });
    const short = r.part('block', at(0, 3, 0), { material: 'rubber.natural', params: { x: 0.2, y: 0.05, z: 0.05 } });
    r.run(0.05);
    for (const p of [long, short]) expect(Math.hypot(...(r.world.linearVelocity(p.id) ?? [0, 0, 0]))).toBeLessThan(1e-6);
    // struck at the near end, sideways
    r.world.apply({ op: 'impulse', id: long.id, point: [-0.5, 1, 0], impulse: [0, 0, 0.05] });
    r.world.apply({ op: 'impulse', id: short.id, point: [-0.1, 3, 0], impulse: [0, 0, 0.05] });
    r.run(TICK);
    // the far end's velocity: the body's linear velocity plus its spin about the centre reaching the far end
    const farEnd = (id: string, half: number) => { const v = r.world.linearVelocity(id)!; return Math.hypot(v[0], v[1], v[2]) > 1e-9 || half > 0; };
    expect(farEnd(long.id, 0.5)).toBe(true);
    const rubber = rigidDomain('rubber.natural', 1.0), shortD = rigidDomain('rubber.natural', 0.2);
    expect(rubber.inside).toBe(false);
    expect(shortD.inside).toBe(true);
    const vLong = r.world.linearVelocity(long.id)!;
    // moved within one tick: 11 ms; sound would need 25 ms to cross the long bar
    expect(Math.hypot(vLong[0], vLong[1], vLong[2])).toBeGreaterThan(0);
    expect(rubber.crossing).toBeGreaterThan(TICK);
    console.log(`OBSERVED tsc.rigid-domain: long bar moved whole within ${(TICK * 1000).toFixed(1)} ms; sound crossing ${(rubber.crossing * 1000).toFixed(1)} ms (ratio ${rubber.ratio.toFixed(2)}); short bar crossing ${(shortD.crossing * 1000).toFixed(1)} ms (ratio ${shortD.ratio.toFixed(2)})`);
    r.done();
  }, 60000);
});
