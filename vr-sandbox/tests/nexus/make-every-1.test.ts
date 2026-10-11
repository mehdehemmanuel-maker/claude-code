// Every kit through the whole make pipeline — conditions, the detail pass, the critic, in rounds — shard 1 of 3.
// Which kits this shard takes, and why the sweep is dealt over files at all, is in tests/nexus/sweep.ts.

import { describe, expect, test } from 'vitest';
import { makeKit } from '../../src/nexus/parts/kits';
import { perfect } from '../../src/nexus/make/pipeline';
import { shard, timed } from './sweep';

describe('the pipeline over every kit (1 of 3)', () => {
  test('every kit of this shard goes through it without a crash, and nothing grown is joined', () => {
    for (const k of shard(0, 3)) timed(k.id, () => {
      const m = perfect(makeKit(k, k.name, 7).part, k.name);
      expect(m.parts[1]).toBeGreaterThanOrEqual(m.parts[0]);
      if (k.id === 'tree' || k.id === 'forest' || k.id === 'plant') expect(m.details.joints).toBe(0);
    });
  }, 180_000); // (the car park alone is 17 s of it: slow under load, not stuck)
});
