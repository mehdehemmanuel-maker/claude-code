// Every kit through the whole make pipeline — conditions, the detail pass, the critic, in rounds — which is the second
// of the gate's two long sweeps. It is a file of its own for the same reason as tests/nexus/kits-every.test.ts: vitest
// runs test files in parallel and a file's own tests in order, so two forty-second sweeps in one file cost eighty
// seconds of the gate's wall clock and in two files cost forty.

import { describe, expect, test } from 'vitest';
import { KITS, makeKit } from '../../src/nexus/parts/kits';
import { perfect } from '../../src/nexus/make/pipeline';

describe('the pipeline over every kit', () => {
  test('every kit goes through it without a crash, and nothing grown is joined', () => {
    for (const k of KITS) {
      const m = perfect(makeKit(k, k.name, 7).part, k.name);
      expect(m.parts[1]).toBeGreaterThanOrEqual(m.parts[0]);
      if (k.id === 'tree' || k.id === 'forest' || k.id === 'plant') expect(m.details.joints).toBe(0);
    }
  }, 180_000); // (every kit through the whole pipeline: slow under load, not stuck)
});
