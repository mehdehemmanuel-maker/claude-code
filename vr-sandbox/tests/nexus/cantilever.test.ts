// A cantilever from the laws (src/nexus/generate.ts): an arm held only at its joined end, F L³ / 8 E I.

import { describe, expect, it } from 'vitest';
import { Workshop } from '../../src/nexus/generate';

describe('the laws under it', () => {
  it('an arm held only at the end it is joined at is a cantilever fixed there: F L³ / 8 E I spread along it', () => {
    const w = new Workshop({ parts: () => [] }, 1);
    w.run('place block named a of steel.a36 at 0 m, 0.5 m, 0 m size 100 x 100 x 100 mm');
    w.run('place bar named b of steel.a36 at 0.55 m, 0.5 m, 0 m size 1000 x 20 x 20 mm');
    w.run('join a, b as g'); w.run('load b with 100 N spread');
    expect(w.value('b.deflection')).toBeCloseTo(100 / (8 * 200e9 * (0.02 ** 4 / 12)), 6);
    expect(w.value('b.factor')).toBeCloseTo(250 / 37.5, 1);
  });
  });

