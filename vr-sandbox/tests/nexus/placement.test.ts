// The placement model and its fields (docs/PLACEMENT.md, step 1): needs read from what parts state; heat, motion and
// reach mapped cell by cell, with the rules' own heat model. Placing a part from them, and picking one by its duty (step 2). The autopilot (step 3).
import { describe, expect, it } from 'vitest';
import type { Part } from '../../src/nexus/kits';
import { needsOf } from '../../src/nexus/placement/model';
import { cellAt, combineFields, fieldOf, shareWhere, showField, statsOf, type Field } from '../../src/nexus/placement/fields';
import { AMBIENT, HEAT_FALLOFF, rulesOf } from '../../src/nexus/make/rules';
import { explainPlaced, placeOne } from '../../src/nexus/placement/solve';
import { selectBattery } from '../../src/nexus/placement/size';
import { REPAIRS, autoLoop } from '../../src/nexus/placement/repair';
import { makeMachine, MACHINES } from '../../src/nexus/machines';

const box = (name: string, size: [number, number, number], at: [number, number, number], more: Partial<Part> = {}): Part => ({ name, shape: { box: size }, at, mat: 'steel-low', ...more });
/** A small bay: floor and hood, an engine, an exhaust at 600 °C, a battery (polypropylene, good to 100 °C) 25 mm from it
 *  and standing on the floor, its starter across the bay. Identified parts (with an item), as the rules check them. */
const bay = (holder: Partial<Part> = {}): Part => { const b = (n: string, s: [number, number, number], at: [number, number, number], m: Partial<Part> = {}) => box(n, s, at, { item: n, ...m });
  return { name: 'bay', parts: [b('floor', [1, 0.01, 0.6], [0, -0.005, 0]), b('hood', [1, 0.005, 0.6], [0, 0.4, 0]), b('petrol engine (1987 cc, 126 kW)', [0.3, 0.2, 0.3], [0, 0.1, 0]), b('exhaust', [0.05, 0.05, 0.5], [-0.2, 0.025, 0], { mat: 'stainless-304', hot: 600 }),
    { name: 'holder', ...holder, parts: [{ name: 'battery', item: 'battery', at: [-0.31, 0, 0], parts: [box('case', [0.12, 0.12, 0.12], [0, 0.06, 0], { mat: 'pp' })] }] }, b('starter', [0.08, 0.08, 0.08], [0.3, 0.04, 0.2])] }; };
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

describe('placing a part from what it needs', () => {
  const o = { near: /^starter$/, around: /^petrol engine/, grow: 0.2, step: 0.05 };
  it('a battery by an exhaust is moved where it is cool, can be reached, near its starter; the rules agree', () => {
    const t = bay(), { placed, tree } = placeOne(t, /^battery$/, o);
    expect(rulesOf(t, { only: /^battery$/ }).findings.map((f) => f.rule)).toEqual(['heat']);
    expect(rulesOf(tree, { only: /^battery$/ }).findings).toHaveLength(0);
    // (where it was holds nothing back: it fits, standing on the floor, but is over its 100 °C)
    expect(placed.was?.holds).toBe(false); expect(placed.was!.heat).toBeGreaterThan(100);
    expect(placed.chosen.heat).toBeLessThanOrEqual(placed.limit); expect(placed.limit).toBe(100);
    expect(placed.chosen.reach).toBe(1); expect(placed.chosen.near).toBeLessThan(placed.was!.near);
    expect(placed.others.length).toBeGreaterThan(0); for (const x of placed.others) expect(x.cost).toBeGreaterThanOrEqual(placed.chosen.cost);
    expect(placed.rejected.solid + placed.rejected.support + placed.rejected.roof + placed.rejected.outside + placed.fits).toBe(placed.tried);
    const said = explainPlaced(placed); expect(said[0]).toMatch(/^battery goes to/); expect(said.some((l) => /does not hold \(\d+ °C where it would be, over its 100 °C\)/.test(l))).toBe(true);
  });
  it('a part inside a moved holder is refused, not put in the wrong place', () => {
    expect(() => placeOne(bay({ at: [0.1, 0, 0] }), /^battery$/, o)).toThrow(/moved or turned/);
  });
  it('a battery picked by its engine\'s duty, beside the one it has', () => {
    const s = selectBattery(makeMachine(MACHINES.find((m) => m.id === 'corolla')!));
    // (1987 cc is 121.3 cubic inches: 122 CCA at 1 per cubic inch)
    expect(s.need).toBe(122); expect(s.has?.group).toBe('35'); expect(s.chosen.meets).toBe(true);
    expect(s.options.filter((x) => x.meets && x.kg < s.chosen.kg)).toHaveLength(0);
    const truck = selectBattery({ name: 'truck', parts: [{ name: 'diesel engine (14800 cc, 330 kW)' }] }, 3);
    expect(truck.need).toBe(Math.ceil(Math.ceil(2 * 14800 / 16.387064) / 3));
  }, 120000);
  it('the Corolla\'s battery: off the wheelhouse it ran into, somewhere cool and reachable, and the rules come back clean', () => {
    const { placed, tree } = placeOne(makeMachine(MACHINES.find((m) => m.id === 'corolla')!), /^battery and its tray$/, { near: /^starter motor$/ });
    expect(placed.was).toBeNull(); expect(placed.wasNot).toMatch(/wheelhouse/);
    expect(placed.chosen.heat).toBeLessThanOrEqual(80); expect(placed.chosen.reach).toBeGreaterThan(0.5);
    expect(rulesOf(tree, { only: /^battery and its tray$/ }).findings).toHaveLength(0);
  }, 300000);
});

describe('the autopilot: check, repair, check again', () => {
  it('a battery by an exhaust: the loop moves it, the guard keeps it, the whole is checked clean', () => {
    const r = autoLoop(bay(), { step: 0.05 });
    expect(r.before).toBe(1); expect(r.after).toBe(0); expect(r.tasks).toHaveLength(0);
    expect(r.attempts.filter((a) => a.kept).map((a) => a.repair)).toEqual(['move']);
  });
  // (a hose 25 mm from a 600 °C pipe: across it, a shield covers every point too hot; along it, for 400 mm, no plate of
  // 250 mm can, and the loop says so rather than pass on the one line the rules try)
  const pipeAnd = (hose: Part): Part => ({ name: 'bay', parts: [box('pipe', [0.4, 0.03, 0.03], [0, 0.2, 0], { item: 'pipe', mat: 'stainless-304', hot: 600 }), hose] });
  const shieldOnly = REPAIRS.filter((r) => r.id === 'shield');
  it('a shield where it covers all that is too hot', () => {
    const r = autoLoop(pipeAnd(box('hose', [0.03, 0.03, 0.3], [0, 0.26, 0], { item: 'hose', mat: 'epdm' })), { repairs: shieldOnly });
    expect(r.before).toBe(1); expect(r.after).toBe(0); expect(r.kept[0]).toMatch(/shield between the pipe and the hose/);
  });
  it('no shield where a plate cannot cover it: a named task, with why', () => {
    const r = autoLoop(pipeAnd(box('hose', [0.4, 0.03, 0.03], [0, 0.245, 0], { item: 'hose', mat: 'epdm' })), { repairs: shieldOnly });
    expect(r.after).toBe(1); expect(r.tasks).toHaveLength(1); expect(r.tasks[0]!.cause).toMatch(/points of the hose at up to \d+ °C .* in the open/);
  });
  it('the Corolla: the battery moved, the hood frame nudged, the upper hose routed again: nothing left', () => {
    const r = autoLoop(makeMachine(MACHINES.find((m) => m.id === 'corolla')!));
    expect(r.before).toBeGreaterThan(200); expect(r.after).toBe(0); expect(r.tasks).toHaveLength(0);
    expect(r.kept.some((k) => /upper hose routed again/.test(k))).toBe(true);
    expect(r.kept.some((k) => /battery and its tray moved/.test(k))).toBe(true);
    expect(r.kept.some((k) => /hood inner frame moved/.test(k))).toBe(true);
    for (const t of r.tasks) expect(t.cause.length).toBeGreaterThan(0);
  }, 600000);
});
