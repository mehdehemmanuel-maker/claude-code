// Folding a made thing flat, in general (src/nexus/foldtree.ts): by geometry alone, its widest part stays (or, fixed to a
// wall, the wall does); each part folds onto what holds it after what it holds has, a quarter turn where it stands off a
// face, a half turn where it lies in line; where it would land on what lies there it hangs from a block or is set in
// sideways; the path each takes meets nothing; which part goes next is searched and the least way kept.

import { describe, expect, it } from 'vitest';
import { planTree, touching, type Box } from '../../src/nexus/foldtree';

const top: Box = { name: 't_top', at: [0.6, 0.729, 0], w: 1.2, h: 0.022, d: 0.7 };
const leg = (n: string, x: number, z: number): Box => ({ name: n, at: [x, 0.359, z], w: 0.03, h: 0.718, d: 0.03 });
const table = [top, leg('t_leg1', 0.015, -0.335), leg('t_leg2', 1.185, -0.335), leg('t_leg3', 1.185, 0.335), leg('t_leg4', 0.015, 0.335)];
const E = (b: Box) => [b.w, b.h, b.d];
const lo = (b: Box, i: number) => b.at[i]! - E(b)[i]! / 2, hi = (b: Box, i: number) => b.at[i]! + E(b)[i]! / 2;
const overlaps = (a: Box, b: Box) => [0, 1, 2].every((i) => Math.min(hi(a, i), hi(b, i)) - Math.max(lo(a, i), lo(b, i)) > 1e-6);
const apart = (bs: Box[]) => { for (const [i, a] of bs.entries()) for (const b of bs.slice(i + 1)) expect(overlaps(a, b), `${a.name} in ${b.name}`).toBe(false); };

describe('folding a made thing flat, in general', () => {
  it('parts touch face to face, not at an edge', () => {
    expect(touching(top, table[1]!)).toBe(true);
    expect(touching(table[1]!, table[4]!)).toBe(false);
    expect(touching({ name: 'a', at: [0, 0, 0], w: 1, h: 1, d: 1 }, { name: 'b', at: [1, 1, 0], w: 1, h: 1, d: 1 })).toBe(false);
  });
  it('a table: its legs fold up under its top, two of them from blocks over the other two; nothing meets on the way', () => {
    const p = planTree(table);
    expect(p.root).toBe('t_top'); expect(p.folds).toHaveLength(4); expect(p.trouble).toEqual([]); expect(p.sweep).toEqual({ ok: true });
    expect(p.folds.every((f) => f.kind === 'quarter' && f.holder === 't_top')).toBe(true);
    expect(p.spacers).toHaveLength(2); expect(p.spacers.every((s) => Math.abs(s.box.h - 0.03) < 1e-9)).toBe(true);
    // folded: the top and two layers of legs, 82 mm, laid down with the legs up; nothing in anything
    expect(p.envelope[1]).toBeCloseTo(0.082, 6); apart(p.folded);
    // a leg that hangs from a block is shortened by it at its top, so its foot is where it was
    const short = p.open.filter((b) => /^t_leg/.test(b.name) && b.h < 0.718 - 1e-9);
    expect(short).toHaveLength(2); expect(short.every((b) => Math.abs(b.h - 0.688) < 1e-9 && Math.abs(lo(b, 1)) < 1e-9)).toBe(true);
  });
  it('set in sideways instead, the legs fold beside each other: thinner, two feet that much in', () => {
    const p = planTree(table, new Map(), { inset: true });
    expect(p.spacers).toHaveLength(0); expect(p.sweep).toEqual({ ok: true }); expect(p.envelope[1]).toBeCloseTo(0.052, 6);
    const moved = p.folds.filter((f) => Math.abs(f.shift) > 1e-9);
    expect(moved).toHaveLength(2); expect(moved.every((f) => Math.abs(Math.abs(f.shift) - 0.03) < 1e-3)).toBe(true); apart(p.folded);
  });
  it('legs longer than the top: one hung from a block would swing into the one across from it, so some are set in', () => {
    const st: Box = { name: 's_top', at: [0, 0.45, 0], w: 0.4, h: 0.02, d: 0.4 }, sl = (n: string, x: number, z: number): Box => ({ name: n, at: [x, 0.22, z], w: 0.02, h: 0.44, d: 0.02 });
    const p = planTree([st, sl('s_l1', -0.19, -0.19), sl('s_l2', 0.19, -0.19), sl('s_l3', 0.19, 0.19), sl('s_l4', -0.19, 0.19)]);
    expect(p.sweep).toEqual({ ok: true }); expect(p.folds).toHaveLength(4); expect(p.folds.some((f) => Math.abs(f.shift) > 1e-9)).toBe(true); apart(p.folded);
  });
  it('a box: its walls fold down onto its floor in turn, latched where they meet; its roof, held only by them, is lifted off', () => {
    const fl: Box = { name: 'b_floor', at: [0, 0.01, 0], w: 2, h: 0.02, d: 1.5 };
    const wl = (n: string, at: [number, number, number], w: number, d: number): Box => ({ name: n, at, w, h: 1.2, d });
    const p = planTree([fl, wl('b_wall1', [-0.99, 0.62, 0], 0.02, 1.5), wl('b_wall2', [0.99, 0.62, 0], 0.02, 1.5), wl('b_wall3', [0, 0.62, -0.74], 1.96, 0.02), wl('b_wall4', [0, 0.62, 0.74], 1.96, 0.02), { name: 'b_roof', at: [0, 1.23, 0], w: 2, h: 0.02, d: 1.5 }]);
    expect(p.root).toBe('b_floor'); expect(p.lifted).toEqual(['b_roof']); expect(p.sweep).toEqual({ ok: true }); expect(p.folds).toHaveLength(4);
    expect(p.latched).toContainEqual(['b_wall1', 'b_wall3']);
    // folded: floor, its walls in layers and the roof on top, at most floor, four walls and roof
    expect(p.envelope[1]).toBeLessThanOrEqual(0.12 + 1e-9); expect(p.envelope[1]).toBeGreaterThanOrEqual(0.06 - 1e-9); apart(p.folded);
  });
  it('a deck of five pieces end to end folds in a zig-zag of half turns onto its middle one', () => {
    const pc = (n: string, x: number): Box => ({ name: n, at: [x, 0.3, 0], w: 0.6, h: 0.04, d: 0.6 });
    const p = planTree([pc('d_1', 0.3), pc('d_2', 0.9), pc('d_3', 1.5), pc('d_4', 2.1), pc('d_5', 2.7)]);
    expect(p.root).toBe('d_3'); expect(p.folds).toHaveLength(4); expect(p.folds.every((f) => f.kind === 'half')).toBe(true);
    expect(p.envelope.map((x) => +x.toFixed(6))).toEqual([0.6, 0.2, 0.6]); apart(p.folded);
    // the outer pieces fold over and the inner ones the other way, so it lies in a zig-zag
    const t = (h: string) => Math.sign(p.folds.find((f) => f.head === h)!.turns);
    expect(t('d_1')).toBe(-t('d_2')); expect(t('d_5')).toBe(-t('d_4'));
  });
  it('a screen of four upright panels folds flat, each half turn about the edge it meets the next at', () => {
    const pn = (n: string, x: number): Box => ({ name: n, at: [x, 0.9, 0], w: 0.5, h: 1.8, d: 0.02 });
    const p = planTree([pn('p_1', 0.25), pn('p_2', 0.75), pn('p_3', 1.25), pn('p_4', 1.75)]);
    expect(p.folds).toHaveLength(3); expect(p.folds.every((f) => f.kind === 'half' && f.axis === 1)).toBe(true);
    expect(Math.min(...p.envelope)).toBeCloseTo(0.08, 6); apart(p.folded);
  });
  it('shelves off a back fold flat onto it, and it is laid down on its back', () => {
    const back: Box = { name: 'k_back', at: [0.4, 0.9, 0.01], w: 0.8, h: 1.8, d: 0.02 };
    const shelf = (n: string, y: number): Box => ({ name: n, at: [0.4, y, 0.17], w: 0.8, h: 0.02, d: 0.3 });
    const p = planTree([back, shelf('k_s1', 0.3), shelf('k_s2', 0.8), shelf('k_s3', 1.3)]);
    expect(p.root).toBe('k_back'); expect(p.folds).toHaveLength(3); expect(p.envelope.map((x) => +x.toFixed(6))).toEqual([0.8, 0.04, 1.8]); apart(p.folded);
  });
  it('a fold lies flat: its thinnest way onto the face it folds onto, never on its edge', () => {
    const side: Box = { name: 'c_side', at: [0.011, 0.9, 0], w: 0.022, h: 1.8, d: 0.54 };
    const sh = (n: string, y: number): Box => ({ name: n, at: [0.4, y, 0], w: 0.756, h: 0.022, d: 0.54 });
    const p = planTree([side, sh('c_s1', 0.3), sh('c_s2', 1.3)]);
    expect(p.folds).toHaveLength(2);
    for (const f of p.folds) { const b = p.folded.find((x) => x.name === f.head)!; expect(Math.min(b.w, b.h, b.d)).toBeCloseTo(0.022, 6); expect(b.h).toBeCloseTo(0.022, 6); }
  });
  it('a square batten under a shelf lies flat on it and goes with it; a batten on the side under the hinge is folded over, from a block', () => {
    const side: Box = { name: 'c_side', at: [0.011, 0.9, 0], w: 0.022, h: 1.8, d: 0.54 };
    const shelf: Box = { name: 'c_shelf', at: [0.4, 0.991, 0], w: 0.756, h: 0.022, d: 0.54 };
    const under: Box = { name: 'c_bat', at: [0.768, 0.97, 0], w: 0.02, h: 0.02, d: 0.54 }, onSide: Box = { name: 'c_cleat', at: [0.032, 0.97, 0], w: 0.02, h: 0.02, d: 0.54 };
    const p = planTree([side, shelf, under, onSide]);
    expect(p.rigid).toContainEqual(['c_bat', 'c_shelf']); expect(p.rigid).toContainEqual(['c_cleat', 'c_side']); expect(p.lifted).toEqual([]);
    const f = p.folds.find((x) => x.head === 'c_shelf')!; expect(f.names).toContain('c_bat'); expect(f.spacer).toBeCloseTo(0.02, 6); apart(p.folded);
  });
  it('fixed to a wall, it folds against the wall where it hangs: measured without the wall', () => {
    const wall: Box = { name: 'w_wall', at: [0, 0.8, -0.1], w: 1.6, h: 1.6, d: 0.2 };
    const board: Box = { name: 'w_board', at: [0, 1.0, 0.3], w: 1.0, h: 0.02, d: 0.6 };
    const p = planTree([wall, board], new Map(), { ground: ['w_wall'] });
    expect(p.root).toBe('w_wall'); expect(p.folds).toHaveLength(1); expect(p.lifted).toEqual([]);
    // it stays where it hangs: the wall is not moved, and the board lies flat on its face
    expect(p.folded.find((b) => b.name === 'w_wall')!.at).toEqual(wall.at);
    const b = p.folded.find((x) => x.name === 'w_board')!; expect(b.d).toBeCloseTo(0.02, 6); expect(lo(b, 2)).toBeCloseTo(0, 6);
    expect(Math.min(...p.envelope)).toBeCloseTo(0.02, 6);
  });
  it('what turns already is not folded, and says why: then nothing is', () => {
    const p = planTree(table.slice(0, 3), new Map([['t_leg2', 'it turns already']]));
    expect(p.folds).toHaveLength(0); expect(p.trouble).toEqual(['t_leg2 is not folded: it turns already']);
  });
});
