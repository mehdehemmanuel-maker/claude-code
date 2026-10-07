// The frame profiler: each part timed, kept as a running mean and its worst lately, the slowest first.

import { describe, expect, it } from 'vitest';
import { BUDGET_MS, Profile } from '../../src/nexus/profile';

describe('the frame profiler', () => {
  it('times each part, slowest first, each with its share; what a part throws is thrown after it is counted', () => {
    let t = 0; const p = new Profile(() => t);
    for (let i = 0; i < 30; i++) { p.time('render', () => { t += 4; }); p.time('robot', () => { t += 1; }); p.frame(5); }
    const r = p.report();
    expect(r.map((x) => x.name)).toEqual(['render', 'robot']);
    expect(r[0]!.mean).toBeCloseTo(4); expect(r[0]!.share).toBeCloseTo(0.8); expect(r[1]!.n).toBe(30);
    expect(p.line(2)).toMatch(/^render 4\.00 ms \(\d+ %\), robot 1\.00 ms \(\d+ %\); frame 5\.0 ms of the 11\.1/);
    expect(() => p.time('boom', () => { t += 2; throw new Error('it broke'); })).toThrow('it broke');
    expect(p.report().find((x) => x.name === 'boom')!.mean).toBe(2);
    expect(BUDGET_MS).toBeCloseTo(11.11, 2);
  });
  it('the mean follows a change within a few dozen frames; the worst holds a spike, then lets it go', () => {
    let t = 0; const p = new Profile(() => t);
    for (let i = 0; i < 40; i++) p.time('x', () => { t += 1; });
    p.time('x', () => { t += 30; });
    expect(p.report()[0]!.worst).toBe(30);
    for (let i = 0; i < 100; i++) p.time('x', () => { t += 3; });
    const x = p.report()[0]!;
    expect(x.mean).toBeGreaterThan(2.9); expect(x.mean).toBeLessThan(3.1);
    expect(x.worst).toBeLessThan(30); expect(x.worst).toBeGreaterThan(3);
  });
});
