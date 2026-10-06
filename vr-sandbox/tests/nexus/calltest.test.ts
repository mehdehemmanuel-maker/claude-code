// Every call in the catalogue, run for real (src/nexus/calltest.ts): each in a room of its own, offline. A call that
// would act on the build standing in the forge, or ask Claude, is not run, and says so; every other call works.

import { describe, expect, it } from 'vitest';
import { ALL_CALLS } from '../../src/nexus/calls';
import { testCall, testCalls } from '../../src/nexus/calltest';

describe('every call, run for real', () => {
  const all = testCalls();
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
});
