// What is made, let go (src/nexus/sim.ts, Jolt rigid bodies): a cube held up falls and lands on what is under it; a
// ball falls to the floor at the speed √(2 g h) gives; a tilted plate lands flat; a joined tower pushed over topples
// as one; where each comes to rest is where it is made from then on.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import { Workshop } from '../../src/nexus/generate';
import type { Jolt } from '../../src/nexus/realize';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const room = () => { const w = new Workshop({ parts: () => [{ name: 'table top', at: [0, 0.75, 0], w: 1.2, h: 0.04, d: 0.6, mass: 10 }] }, 3); w.usePhysics(J); w.run('material steel'); return w; };

describe('let go: real physics over what is made', () => {
  it('a cube held up lands on the build under it; a ball falls to the floor as fast as √(2 g h) says', () => {
    const w = room(); w.run('place cube named a at 0, 1.5 m, 0 size 100 mm'); w.run('place ball named b at 1.5 m, 1 m, 0 size 80 mm');
    const said = w.run('simulate 3 s');
    expect(said).toMatch(/a fell 680 mm/); expect(w.value('a.bottom')).toBeCloseTo(0.77, 2); expect(w.value('b.bottom')).toBeCloseTo(0, 2);
    const v = Math.sqrt(2 * 9.80665 * 0.96), top = Number(/b fell 960 mm, at most ([\d.]+) m\/s/.exec(said)![1]); expect(Math.abs(top - v) / v).toBeLessThan(0.03);
  });
  it('a plate put down tilted lands flat; a joined tower pushed hard topples as one', () => {
    const w = room(); w.run('place plate named p at -1.5 m, 0.3 m, 0 size 300 x 300 x 10 mm turned z 30');
    w.run('place cube named c1 at 2.5 m, 0.05 m, 0 size 100 mm'); w.run('place cube named c2 at 2.5 m, 0.15 m, 0 size 100 mm'); w.run('join c1 and c2 as tower');
    w.run('simulate 3 s'); expect(w.value('p.h')).toBeLessThan(0.02); expect(w.value('p.bottom')).toBeCloseTo(0, 3);
    expect(w.run('push tower with 200 N along x for 0.2 s')).toMatch(/tower moved \d+ mm, turning (8\d|9\d)/);
    // still one piece, lying down: as wide as it was tall
    expect(w.value('tower.w')).toBeCloseTo(0.2, 2); expect(w.value('tower.h')).toBeCloseTo(0.1, 2);
  });
  it('what happened is not undone by a rule: it stands, and what it breaks is said', () => {
    const w = room(); w.run('place cube named a at 3 m, 0.5 m, 0 size 100 mm'); w.run('place cube named b at 3 m, 0.2 m, 0 size 100 mm'); w.run('rule clearance 20 mm');
    expect(w.run('simulate 2 s')).toMatch(/What happened breaks a rule: a and b are 0 mm apart, less than 20 mm\. It is what happened, so it stands/);
    expect(w.value('a.bottom')).toBeCloseTo(0.1, 2);
  });
  it('dropped from a height, it falls that far; without the engine it says so', () => {
    const w = room(); w.run('place cube named a at 2 m, 0.05 m, 0 size 100 mm'); expect(w.run('drop a from 0.5 m')).toMatch(/a fell 500 mm, at most 3\.1\d m\/s/);
    const n = new Workshop({ parts: () => [] }); n.run('place cube named k at 0, 1 m, 0 size 10 mm'); expect(() => n.run('simulate 1 s')).toThrow(/physics engine is still loading/);
  });
});
