// Magnets with adjustable power. A permanent magnet's strength is its grade and size; an electromagnet's is its coil
// current: it holds its rating on thick steel at full power, the hold goes as the square of the power (B ~ N I), and
// switched off its core is plain steel.

import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import { CORE_SATURATION, electromagnetBr, pullOnSteel } from '../../src/engineering/magnets';
import { getPartKind } from '../../src/parts/registry';
import type { Part } from '../../src/doc/types';

const pole = { shape: 'cylinder' as const, radius: 0.025, w: 0, h: 0, length: 0.03 };

describe('electromagnet sizing', () => {
  it('holds exactly its rating on thick steel at full power', () => {
    for (const rating of [50, 500, 1000]) expect(pullOnSteel(pole, electromagnetBr(pole, rating)) / rating).toBeCloseTo(1, 6);
  });

  it('cannot be rated past what its saturated core can hold: a 50 mm pole tops out near 1.3 kN', () => {
    expect(electromagnetBr(pole, 1500)).toBe(CORE_SATURATION);
    const most = pullOnSteel(pole, CORE_SATURATION);
    expect(most).toBeGreaterThan(1200);
    expect(most).toBeLessThan(1500);
  });

  it('a part page power of zero leaves plain steel', () => {
    const k = getPartKind('magnet.electro');
    expect(k.magnet!({ diameter: 0.05, thickness: 0.03, rating: 500, power: 0, switch: 'always' }).Br).toBe(0);
  });

  it('stronger grades pull harder, in the order the tablet steps them', () => {
    const disc = { shape: 'cylinder' as const, radius: 0.01, w: 0, h: 0, length: 0.01 };
    const grades = MATERIALS.filter((m) => m.category === 'magnet').sort((a, b) => a.remanence! - b.remanence!);
    const pulls = grades.map((m) => pullOnSteel(disc, m.remanence!));
    for (let i = 1; i < pulls.length; i++) expect(pulls[i]!).toBeGreaterThan(pulls[i - 1]!);
  });
});

describe('electromagnet in the world', () => {
  const down: [number, number, number, number] = [1, 0, 0, 0]; // pole (+Y) facing down
  const plateT = 0.02; // 100 x 100 x 20 mm steel: 1.57 kg, 15.4 N
  const run = async (power: number, sw: 'always' | 'aux', aux = 1, after?: (r: Awaited<ReturnType<typeof rig>>, e: Part) => void) => {
    const r = await rig({}, false);
    r.world.apply({ op: 'controls', channels: { aux } });
    const e = r.part('magnet.electro', at(0, 1, 0, down), { frozen: true, params: { diameter: 0.05, thickness: 0.03, rating: 500, power, switch: sw } });
    const plate = r.part('plate', at(0, 1 - 0.015 - plateT / 2, 0), { material: 'steel.1018-cd', params: { length: 0.1, width: 0.1, thickness: plateT } });
    r.run(0.5);
    const y0 = r.pos(plate)[1];
    after?.(r, e);
    r.run(1);
    const dropped = y0 - r.pos(plate)[1] > 0.01;
    const fell = 1 - 0.015 - plateT / 2 - r.pos(plate)[1] > 0.01;
    r.done();
    return { fell, dropped };
  };

  it('on, it holds a steel plate under it; the tablet switch off drops it', async () => {
    expect((await run(1, 'always')).fell).toBe(false);
    expect((await run(1, 'aux', 1)).fell).toBe(false);
    expect((await run(1, 'aux', 0)).fell).toBe(true);
    const switchedOff = await run(1, 'aux', 1, (r) => r.world.apply({ op: 'controls', channels: { aux: 0 } }));
    expect(switchedOff.dropped).toBe(true);
  });

  it('the hold goes as the square of the power: 15.4 N hangs at 20 % (20 N), falls at 15 % (11 N)', async () => {
    expect((await run(0.2, 'always')).fell).toBe(false);
    expect((await run(0.15, 'always')).fell).toBe(true);
  });

  it('power turned down on the part page lets go of what it held', async () => {
    const res = await run(1, 'always', 1, (r, e) => {
      const part = { ...e, params: { ...e.params, power: 0.1 } };
      r.world.apply({ op: 'upsertPart', part, material: getMaterial(part.material), keepLivePose: true });
    });
    expect(res.dropped).toBe(true);
  });
});
