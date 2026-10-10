// Every call in the catalogue, run for real (src/nexus/substrate/calltest.ts): each in a room of its own, offline. A call that
// would act on the build standing in the forge, or ask Claude, is not run, and says so; every other call works.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import { ALL_CALLS, callsFor } from '../../src/nexus/substrate/calls';
import { setTestPhysics, testCall, testCalls, type CallTest } from '../../src/nexus/substrate/calltest';
import type { Jolt } from '../../src/nexus/substrate/realize';

describe('every call, run for real', () => {
  let all: CallTest[] = [];
  beforeAll(async () => { setTestPhysics((await initJolt()) as unknown as Jolt); all = testCalls(); });
  it('runs each call, and every one that can run here works', () => {
    expect(all).toHaveLength(ALL_CALLS.length);
    const broken = all.filter((t) => t.ok === false).map((t) => `${t.group}: ${t.text} → ${t.said}`);
    expect(broken).toEqual([]);
  });
  it('says which it did not run, and why', () => {
    const not = all.filter((t) => t.ok === null);
    expect(not.every((t) => t.group === 'room' || t.group === 'ask')).toBe(true);
    expect(not.find((t) => t.text === 'operate')!.said).toMatch(/not run here, so as not to change it/);
  });
  it('what a call did is what it says it does', () => {
    expect(testCall('size', ALL_CALLS.filter((c) => c.group === 'size').findIndex((c) => c.text.startsWith('size axle.D'))).said).toMatch(/Sized axle's D to 10\.3 mm/);
    expect(testCall('join', 1).said).toMatch(/fused a–b, b–c \(both are aluminium at base\)/);
    expect(testCall('values', 6).said).toMatch(/^w = \d+(\.\d+)? mm\./);
  });
  it('offline, words said are matched to calls in the order said: matching, not understanding', () => {
    const f = callsFor('a plate on the bearing, size it by its load, then let it go');
    expect(f.map((x) => x.call?.text)).toEqual(['place plate named cap on bearing', 'size cap.h so 3 * load * cap.w / (2 * cap.d * cap.h^2) <= cap.yield / 2', 'simulate 3 s']);
    expect(callsFor('put a motor on the frame and run it cooled by water').map((x) => x.call?.group)).toEqual(['motors', 'motors']);
  });
});
