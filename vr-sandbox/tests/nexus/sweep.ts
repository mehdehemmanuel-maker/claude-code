// The two long sweeps' shards. Every kit made at three seeds (tests/nexus/kits-every-*.test.ts) and every kit through
// the make pipeline (tests/nexus/make-every-*.test.ts) are the gate's two longest runs, and each was one `it`, which
// no worker can split: vitest runs files in parallel and a file's own tests in order. So each sweep is dealt over
// several files of its own, which overlap instead of queueing. One kit cannot be split, so the heaviest kit sets a
// shard's time: the heavy ones (measured, not guessed, with PERF_SWEEP) are dealt into different shards first and the
// rest round-robin after them.

import { appendFileSync } from 'node:fs';
import { KITS, type Kit } from '../../src/nexus/parts/kits';

/** The kits that cost seconds rather than milliseconds, longest first. This is a measurement, not a guess:
 *  `PERF_SWEEP=<file> npx vitest run tests/nexus/kits-every-*` writes what each kit cost, and of the thirty, three are
 *  the sweep — made at three seeds, the car park 21.7 s, the street 6.0, the car 2.9, and all twenty-seven others
 *  0.19 s together; through the make pipeline, 16.7, 7.3, 2.9 and 2.0. So the shards are these three dealt apart. */
export const HEAVY = ['car park', 'street', 'car'];

/** Shard `index` of `of`: the heavy kits dealt one per shard, then the rest. */
export function shard(index: number, of: number): Kit[] {
  const heavy = KITS.filter((k) => HEAVY.includes(k.id)), rest = KITS.filter((k) => !HEAVY.includes(k.id)), mine: Kit[] = [];
  heavy.forEach((k, n) => { if (n % of === index) mine.push(k); });
  rest.forEach((k, n) => { if (n % of === index) mine.push(k); });
  return mine;
}

/** What one kit cost, when asked for: `PERF_SWEEP` is the file the times are written to. */
export function timed<T>(id: string, f: () => T): T {
  const out = process.env.PERF_SWEEP; if (!out) return f();
  const t0 = Date.now(), v = f(); appendFileSync(out, `${Date.now() - t0} ${id}\n`); return v;
}
