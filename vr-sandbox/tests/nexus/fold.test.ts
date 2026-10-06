// Folding a made thing flat (src/nexus/fold.ts): by geometry alone, its base stays; each part held to it folds a
// quarter turn flat onto it about the edge where it meets it; where two would fold onto each other the later hangs from a
// block over the first or is set in sideways past it; the path each takes runs into nothing; what is bigger than what it
// would fold onto is lifted off; what turns already is not folded.

import { describe, expect, it } from 'vitest';
import { planFold, touching, type Box } from '../../src/nexus/fold';

const top: Box = { name: 't_top', at: [0.6, 0.729, 0], w: 1.2, h: 0.022, d: 0.7 };
const leg = (n: string, x: number, z: number, L = 0.718): Box => ({ name: n, at: [x, 0.718 - L / 2, z], w: 0.03, h: L, d: 0.03 });
const table = [top, leg('t_leg1', 0.015, -0.335), leg('t_leg2', 1.185, -0.335), leg('t_leg3', 1.185, 0.335), leg('t_leg4', 0.015, 0.335)];
const lo = (b: Box, i: number) => b.at[i]! - [b.w, b.h, b.d][i]! / 2, hi = (b: Box, i: number) => b.at[i]! + [b.w, b.h, b.d][i]! / 2;
const overlaps = (a: Box, b: Box) => [0, 1, 2].every((i) => Math.min(hi(a, i), hi(b, i)) - Math.max(lo(a, i), lo(b, i)) > 1e-6);

describe('folding a made thing flat', () => {
  it('parts touch face to face, not at an edge', () => {
    expect(touching(top, table[1]!)).toBe(true);
    expect(touching(table[1]!, table[4]!)).toBe(false);
    expect(touching({ name: 'a', at: [0, 0, 0], w: 1, h: 1, d: 1 }, { name: 'b', at: [1, 1, 0], w: 1, h: 1, d: 1 })).toBe(false);
  });
  it('a table: its legs fold up under its top, the later two hung from blocks over the first two; nothing meets on the way', () => {
    const p = planFold(table);
    expect(p.root).toBe('t_top'); expect(p.leaves).toHaveLength(4); expect(p.trouble).toEqual([]); expect(p.sweep).toEqual({ ok: true });
    expect(p.leaves.every((l) => l.side === -1 && l.along === 0)).toBe(true);
    expect(p.spacers).toHaveLength(2); expect(p.spacers.every((s) => Math.abs(s.box.h - 0.03) < 1e-9)).toBe(true);
    // folded: the top and two layers of legs, 82 mm; laid down upside down, nothing in anything
    expect(p.envelope[1]).toBeCloseTo(0.082, 6); expect(p.flip).toBe(true);
    for (const [i, a] of p.folded.entries()) for (const b of p.folded.slice(i + 1)) expect(overlaps(a, b), `${a.name} in ${b.name}`).toBe(false);
    // the legs that hang from a block are shortened by it, so it stands as made
    const short = p.open.filter((b) => /^t_leg/.test(b.name) && b.h < 0.718 - 1e-9);
    expect(short).toHaveLength(2); expect(short.every((b) => Math.abs(b.h - 0.688) < 1e-9 && Math.abs(lo(b, 1)) < 1e-9)).toBe(true);
  });
  it('set in sideways instead, the legs fold beside each other: thinner, its feet that much in', () => {
    const p = planFold(table, new Map(), { inset: true });
    expect(p.spacers).toHaveLength(0); expect(p.sweep).toEqual({ ok: true }); expect(p.envelope[1]).toBeCloseTo(0.052, 6);
    const moved = p.leaves.filter((l) => Math.abs(l.shift) > 1e-9);
    expect(moved).toHaveLength(2); expect(moved.every((l) => Math.abs(Math.abs(l.shift) - 0.03) < 1e-3)).toBe(true);
  });
  it('legs longer than the top: hung from a block, one would swing into the one standing across from it, so it is set in', () => {
    const stoolTop: Box = { name: 's_top', at: [0, 0.45, 0], w: 0.4, h: 0.02, d: 0.4 };
    const sleg = (n: string, x: number, z: number): Box => ({ name: n, at: [x, 0.22, z], w: 0.02, h: 0.44, d: 0.02 });
    const p = planFold([stoolTop, sleg('s_l1', -0.19, -0.19), sleg('s_l2', 0.19, -0.19), sleg('s_l3', 0.19, 0.19), sleg('s_l4', -0.19, 0.19)]);
    expect(p.sweep).toEqual({ ok: true }); expect(p.leaves).toHaveLength(4);
    expect(p.leaves.some((l) => Math.abs(l.shift) > 1e-9)).toBe(true);
  });
  it('a box: its walls fold down onto its floor in turn, the ends first, the sides over them on taller sills; its roof is lifted off', () => {
    const fl: Box = { name: 'b_floor', at: [0, 0.01, 0], w: 2, h: 0.02, d: 1.5 };
    const wl = (n: string, at: [number, number, number], w: number, d: number): Box => ({ name: n, at, w, h: 1.2, d });
    const p = planFold([fl, wl('b_wall1', [-0.99, 0.62, 0], 0.02, 1.5), wl('b_wall2', [0.99, 0.62, 0], 0.02, 1.5), wl('b_wall3', [0, 0.62, -0.74], 1.96, 0.02), wl('b_wall4', [0, 0.62, 0.74], 1.96, 0.02), { name: 'b_roof', at: [0, 1.23, 0], w: 2, h: 0.02, d: 1.5 }]);
    expect(p.root).toBe('b_floor'); expect(p.lifted).toEqual(['b_roof']); expect(p.sweep).toEqual({ ok: true }); expect(p.leaves).toHaveLength(4);
    expect(p.latched).toContainEqual(['b_wall1', 'b_wall3']);
    // folded: floor, its walls in layers (or set in beside each other) and the roof on top: at most floor, four walls and roof
    expect(p.envelope[1]).toBeLessThanOrEqual(0.12 + 1e-9); expect(p.envelope[1]).toBeGreaterThanOrEqual(0.06 - 1e-9); expect(p.flip).toBe(false);
  });
  it('what turns already is not folded, and says why', () => {
    const p = planFold(table, new Map([['t_leg2', 'it turns already']]));
    expect(p.leaves).toHaveLength(3); expect(p.trouble).toEqual(['t_leg2 is not folded: it turns already']);
  });
});
