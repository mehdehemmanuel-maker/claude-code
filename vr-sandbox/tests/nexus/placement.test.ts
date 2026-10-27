// The placement model and its fields (docs/PLACEMENT.md, step 1): needs read from what parts state; heat, motion and
// reach mapped cell by cell, with the rules' own heat model.
import { describe, expect, it } from 'vitest';
import type { Part } from '../../src/nexus/kits';
import { needsOf } from '../../src/nexus/placement/model';
import { cellAt, combineFields, fieldOf, shareWhere, showField, statsOf, type Field } from '../../src/nexus/placement/fields';
import { AMBIENT, HEAT_FALLOFF } from '../../src/nexus/make/rules';
import { makeMachine, MACHINES } from '../../src/nexus/machines';

const box = (name: string, size: [number, number, number], at: [number, number, number], more: Partial<Part> = {}): Part => ({ name, shape: { box: size }, at, mat: 'steel-low', ...more });
/** The value in the cell nearest a point. */
const at = (f: Field, p: [number, number, number]) => { const i = Math.floor((p[0] - f.min[0]) / f.step), j = Math.floor((p[1] - f.min[1]) / f.step), k = Math.floor((p[2] - f.min[2]) / f.step); return { v: f.values[i + f.dims[0] * (j + f.dims[1] * k)]!, c: cellAt(f, i, j, k) }; };

describe('needs, read from what parts state', () => {
  it('heat, motion, mount and passing through, each with where it comes from', () => {
    const t: Part = { name: 'bay', parts: [box('pipe', [0.2, 0.02, 0.02], [0, 0, 0], { mat: 'stainless-304', hot: 600 }), box('hose', [0.2, 0.02, 0.02], [0, 0.1, 0], { mat: 'epdm', fixed: 'clipped to its bracket', passes: ['grommet'] }), box('belt', [0.2, 0.01, 0.01], [0, -0.1, 0], { mat: 'epdm', clear: 0.004 })] };
    const ns = needsOf(t), of = (p: string, k: string) => ns.filter((n) => n.part === p && n.kind === k);
    expect(of('hose', 'keepout')[0]).toMatchObject({ to: 'heat', below: 150, confidence: 1 });
    // (EPDM's 150 °C from a 600 °C surface: 40 mm × ln(560 / 110))
    expect(of('hose', 'keepout')[0]!.min).toBeCloseTo(HEAT_FALLOFF * Math.log(560 / 110), 6);
    expect(of('belt', 'keepout').map((n) => n.to).sort()).toEqual(['heat', 'motion']);
    expect(of('hose', 'mount')[0]!.why).toBe('clipped to its bracket');
    expect(of('hose', 'connect')[0]!.to).toBe('grommet');
    expect(of('pipe', 'keepout')).toHaveLength(0);
  });
  it('the Corolla: who must reach what is found by what it is, marked inferred', () => {
    const ns = needsOf(makeMachine(MACHINES.find((m) => m.id === 'corolla')!)), reach = ns.filter((n) => n.kind === 'access');
    for (const re of [/battery/, /dipstick/, /oil filter/, /radiator cap/]) expect(reach.some((n) => re.test(n.part)), String(re)).toBe(true);
    expect(reach.every((n) => n.confidence < 1)).toBe(true);
    expect(ns.filter((n) => n.kind === 'face').map((n) => n.part).sort()).toEqual(['condenser', 'radiator']);
  }, 120000);
});

describe('fields', () => {
  it('heat: the rules\' fall-off from a hot surface, and nothing behind a plate', () => {
    const pipe = box('pipe', [0.3, 0.02, 0.02], [0, 0, 0], { mat: 'stainless-304', hot: 600 });
    const open = fieldOf({ name: 'open', parts: [pipe] }, 'heat', { around: /pipe/, grow: 0.12, step: 0.01 });
    // (a cell 55 mm above the pipe's top: 40 + 560 e^(-d / 40 mm), d from the cell's middle to the surface)
    const a = at(open, [0, 0.065, 0]); expect(a.v).toBeCloseTo(AMBIENT + 560 * Math.exp(-(a.c[1] - 0.01) / HEAT_FALLOFF), 0);
    const shielded = fieldOf({ name: 'shielded', parts: [pipe, box('shield', [0.3, 0.002, 0.2], [0, 0.03, 0])] }, 'heat', { around: /pipe/, grow: 0.12, step: 0.01 });
    expect(at(shielded, [0, 0.065, 0]).v).toBeCloseTo(AMBIENT, 6);
    expect(at(shielded, [0, -0.065, 0]).v).toBeGreaterThan(AMBIENT + 50);
    expect(statsOf(open).max).toBeLessThanOrEqual(600);
  });
  it('motion: a wheel swept through its steer and bump takes more room than at rest', () => {
    const wheel: Part = { name: 'wheel', at: [0, 0.3, 0], parts: [{ name: 'tyre', shape: { cyl: [0.3, 0.2] }, rot: [Math.PI / 2, 0, 0], mat: 'rubber' }] };
    const still = fieldOf({ name: 'still', parts: [wheel, box('mark', [0.01, 0.01, 0.01], [0, 0.3, 0])] }, 'motion', { around: /^mark$/, grow: 0.5, step: 0.02 });
    const moving = fieldOf({ name: 'moving', parts: [{ ...wheel, travel: { steer: 0.6, bump: 0.08 } }, box('mark', [0.01, 0.01, 0.01], [0, 0.3, 0])] }, 'motion', { around: /^mark$/, grow: 0.5, step: 0.02 });
    expect(shareWhere(moving, (v) => v < 0)).toBeGreaterThan(shareWhere(still, (v) => v < 0));
  });
  it('reach: a hand comes in from above, not from under something solid', () => {
    const t: Part = { name: 'bay', parts: [box('engine block', [0.2, 0.2, 0.2], [0, 0.1, 0]), box('cover', [0.4, 0.01, 0.4], [0, 0.45, 0.3])] };
    const f = fieldOf(t, 'reach', { around: /engine block/, grow: 0.25, step: 0.025 });
    expect(at(f, [0, 0.3, 0]).v).toBeGreaterThanOrEqual(0);
    expect(at(f, [0, 0.3, 0.3]).v).toBe(-1);
  });
  it('fields on one grid as one cost; a picture of the cells', () => {
    const t: Part = { name: 'bay', parts: [box('pipe', [0.2, 0.02, 0.02], [0, 0, 0], { mat: 'stainless-304', hot: 600 }), box('belt', [0.2, 0.01, 0.01], [0, -0.06, 0], { mat: 'epdm', clear: 0.004 })] };
    const o = { around: /pipe|belt/, grow: 0.08, step: 0.01 }, h = fieldOf(t, 'heat', o), m = fieldOf(t, 'motion', o), c = combineFields([h, m]);
    expect(shareWhere(c, (v) => v <= 1e-9)).toBeGreaterThan(0);
    expect(shareWhere(c, (v) => v <= 1e-9)).toBeLessThanOrEqual(shareWhere(h, (v) => v <= 100));
    expect(shareWhere(combineFields([m]), (v) => v <= 1e-9)).toBeCloseTo(shareWhere(m, (v) => v >= 0.01), 6);
    expect(() => combineFields([h, fieldOf(t, 'heat', { ...o, step: 0.02 })])).toThrow(/different grids/);
    expect(showField(h, { slice: { axis: 'y', at: 0.5 } }).parts!.length).toBeGreaterThan(0);
  });
});
