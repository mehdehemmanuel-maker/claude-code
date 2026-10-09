import { describe, expect, it } from 'vitest';
import { breakdown, sayBreakdown } from '../../src/nexus/breakdown';
import { INVENTORY, resolve } from '../../src/nexus/inventory';

describe('the breakdown queue', () => {
  it('takes every item stored off the queue, finds each thing in it in the table, and says what waits and why', () => {
    const first = breakdown();
    expect(first.taken).toBe(INVENTORY.size);
    expect(first.waiting.filter((w) => w.why === 'not in the table')).toEqual([]);
    // (a stepper stored now is queued: it, its bearing and its tie screws made to its sizes, broken down to their steel)
    const st = resolve('stepper nema17 40'); expect(typeof st).toBe('object');
    const next = breakdown(); expect(next.taken).toBeGreaterThanOrEqual(1);
    expect(next.waiting.filter((w) => w.in === 'stepper-nema17-40')).toEqual([]);
    expect(INVENTORY.has('bearing-625zz') && INVENTORY.has('screw-m3x32')).toBe(true);
    // (a thing assembled and listed only as its materials waits to have its parts broken out of it)
    expect(first.waiting.some((w) => w.why === 'only its materials listed')).toBe(true);
    expect(breakdown().taken).toBe(0); // nothing new stored, nothing to take
    expect(sayBreakdown(first)).toMatch(/^# Breakdown queue/);
  });
});
