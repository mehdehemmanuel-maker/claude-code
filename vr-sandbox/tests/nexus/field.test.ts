// Part XXIV 7 and 8: domains, fields, the observer; couplings. The ground under a point is a field query; the rigid
// domain is computed from the window and its bound is named; every coordinate is a coupling solution derived from
// the frame's origin; the ledger balances.

import { describe, expect, it } from 'vitest';
import { coordinate, ledger, restOn, standOn, topOf, type Prism } from '../../src/nexus/coupling';
import { ofLeaf } from '../../src/nexus/evaluate';
import { declareFrame, flatGround, gravity, observer, RIGID_BOUND, rigidDomain } from '../../src/nexus/field';
import { abs, div, ge, k, leaf, mul, neg, variable } from '../../src/nexus/term';
import { cites, leavesUnder, why } from '../../src/nexus/why';
import { coarse, coverage, domain, field, fieldOf, lattice, resolution, resolves, sample } from '../../src/nexus/domain';
import { PATCH_MOMENT } from '../../src/nexus/book';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));

describe('fields and the observer', () => {
  it('gravity is a sourced constant; the ground under a point is a field query from the frame', () => {
    const g = gravity();
    expect(g.status).toBe('fundamental');
    expect(why(g).origin?.source).toMatch(/ISO 80000-3/);
    const frame = declareFrame('test', 'x along, y up, z across');
    const ground = flatGround(frame, 'test', 'a level floor');
    const h = ground.height(given('x', 0.3, 'm'), given('z', 0, 'm'));
    expect(h.value).toBe(0);
    const classes = leavesUnder(h).map((l) => l.origin.class);
    expect(classes).toContain('configuration');
    expect(classes.every((c) => c === 'configuration' || c === 'fundamental')).toBe(true);
    expect(cites(h, ground.field.hash)).toBe(true);
  });

  it('the rigid domain is computed from the window: a timber beam is rigid at 90 Hz, a kilometre of it is not', () => {
    const obs = observer('test');
    const E = given('E', 13.4e9, 'Pa'), rho = given('rho', 530, 'kg/m^3');
    const beam = rigidDomain(E, rho, given('L', 1.2, 'm'), obs);
    expect(beam.crossing.value).toBeCloseTo(1.2 / Math.sqrt(13.4e9 / 530), 9);
    expect(beam.ratio.value!).toBeLessThan(0.1);
    expect(beam.rigid).toBe(true);
    const long = rigidDomain(E, rho, given('L', 1000, 'm'), obs);
    expect(long.rigid).toBe(false);
    expect(leavesUnder(long.holds).some((l) => l.hash === RIGID_BOUND.hash)).toBe(true);
    expect(why(long.holds).law).toBe(RIGID_BOUND.hash);
  });
});

describe('couplings', () => {
  const prism = (name: string, x: number, y: number, z: number): Prism => ({ name, extents: { x: given(`${name} x`, x, 'm'), y: given(`${name} y`, y, 'm'), z: given(`${name} z`, z, 'm') }, material: 'test', density: given('rho', 1, 'kg/m^3') });

  it('every coordinate is a coupling solution derived from the frame origin', () => {
    const frame = declareFrame('test', 'x along, y up, z across');
    const ground = flatGround(frame, 'test', 'a level floor');
    const base = prism('base', 0.1, 0.5, 0.1), top = prism('top', 1, 0.04, 0.1);
    const x = coordinate('x', frame, 'x', neg(div(variable('L', 'm'), k(2))), { L: given('span', 1.2, 'm') });
    const z = coordinate('z', frame, 'z', neg(variable('o', 'm')), {});
    standOn(base, ground.height(x, z), x, z);
    expect(base.centre!.y.value).toBeCloseTo(0.25, 12);
    const c = restOn(top, base, topOf(base), given('clearance', 0.0005, 'm'), x, z);
    expect(c.centreY.value).toBeCloseTo(0.5 + 0.0005 + 0.02, 12);
    expect(x.value).toBeCloseTo(-0.6, 12);
    for (const d of [base.centre!.y, top.centre!.y, x]) expect(leavesUnder(d).some((l) => l.name.startsWith('origin'))).toBe(true);
    expect(() => why(top.centre!.y)).not.toThrow();
  });

  it('the ledger balances the boundaries against the weight', () => {
    const R = given('R', 60, 'N');
    const ok = ledger('two supports', [R, R], given('W', 120, 'N'));
    expect(ok.balanced).toBe(true);
    expect(ok.residual.value).toBeCloseTo(0, 12);
    expect(ledger('short', [R], given('W', 120, 'N')).balanced).toBe(false);
  });
});

describe('domains, fields and the resolution (x, y, z, t and scale)', () => {
  const frame = declareFrame('test', 'x along, y up, z across');
  const span = (lo: number, hi: number) => ({ x: { lo: given('left end', lo, 'm'), hi: given('right end', hi, 'm') } });

  it('a field is laws composed over coordinates; a sample cites the laws and is refused outside the domain, with the domain named', () => {
    const x = variable('x', 'm', 'coordinate x');
    const f = field('moment', 'N m', domain(frame, { x }, span(-1, 1)), { P: given('P', 1000, 'N'), L: given('L', 2, 'm'), w: given('w', 0.1, 'm') }, [{ law: PATCH_MOMENT, bind: { a: abs(x) } }], ([m]) => m!);
    const mid = sample(f, { x: given('x', 0, 'm') });
    expect(mid.value).toBeCloseTo(500 - 1000 * 0.1 / 8, 9);
    expect(mid.cites).toContain(PATCH_MOMENT.hash);
    expect(cites(mid, PATCH_MOMENT.hash)).toBe(true);
    const off = sample(f, { x: given('x', 1.5, 'm') });
    expect(off.status).toBe('outside-validity');
    expect(off.refusal?.domain).toMatch(/domain/);
    expect(sample(f, {}).status).toBe('unknown');
  });

  it('the window is the coarse-graining operator: a point sample is the field; a support averages it and widens the uncertainty by half its range', () => {
    const x = variable('x', 'm', 'coordinate x');
    const f = field('moment', 'N m', domain(frame, { x }, span(-1, 1)), { P: given('P', 1000, 'N'), L: given('L', 2, 'm'), w: given('w', 0.1, 'm') }, [{ law: PATCH_MOMENT, bind: { a: abs(x) } }], ([m]) => m!);
    const point = resolution('a seam', { t: given('quiet', 0.3, 's') }, { x: given('spacing', 0.2, 'm') });
    const at = given('x', 0.5, 'm');
    const p = coarse(f, point, { x: at });
    expect(p.value).toBeCloseTo(500 * 0.5, 9);
    expect(p.uncertainty ?? 0).toBe(0);
    const wide = resolution('a wide gauge', { x: given('gauge length', 0.2, 'm') });
    const c = coarse(f, wide, { x: at });
    // the field is linear here, so the mean is the centre value and the range across 0.2 m is P/2 × 0.2
    expect(c.value).toBeCloseTo(250, 9);
    expect(c.uncertainty).toBeCloseTo(50, 6);
    expect(c.because).toMatch(/half the field's range/);
    expect(Object.keys(c.inputs).length).toBe(3);
    expect(cites(c, PATCH_MOMENT.hash)).toBe(true);
    expect(() => why(c)).not.toThrow();
  });

  it('recomposition: the same field at two time scales differs only across its scale band, and the band is named', () => {
    const x = variable('x', 'm', 'coordinate x'), t = variable('t', 's', 'coordinate t');
    const T1 = given('first period', 0.02, 's');
    const over = domain(frame, { x, t }, span(-1, 1), [{ says: 'quasi-static: dt ≥ 10 T1', holds: ge(variable('dt', 's'), mul(k(10), variable('T1', 's'))), env: { T1 } }]);
    const f = field('moment', 'N m', over, { P: given('P', 1000, 'N'), L: given('L', 2, 'm'), w: given('w', 0.1, 'm') }, [{ law: PATCH_MOMENT, bind: { a: abs(x) } }], ([m]) => m!);
    const slow = coarse(f, resolution('slow', { t: given('quiet', 0.3, 's') }), { x: given('x', 0.5, 'm') });
    const fast = coarse(f, resolution('fast', { t: given('quiet', 0.001, 's') }), { x: given('x', 0.5, 'm') });
    expect(slow.value).toBeCloseTo(250, 9);
    expect(fast.status).toBe('outside-validity');
    expect(fast.refusal?.domain).toBe('quasi-static: dt ≥ 10 T1');
    expect(resolves(over, resolution('none', {}))[0]!.holds.value).toBe(0);
  });

  it('coverage: point samples observe a set of measure zero; the field between them is derived', () => {
    const x = variable('x', 'm', 'coordinate x');
    const d = domain(frame, { x }, span(-1, 1));
    const r = resolution('seams', { t: given('quiet', 0.3, 's') }, { x: given('spacing', 0.2, 'm') });
    const c = coverage(d, r, [{ x: given('x', -0.5, 'm') }, { x: given('x', 0.5, 'm') }], 'x');
    expect(c.value).toBe(0);
    const g = resolution('gauges', { x: given('gauge length', 0.2, 'm') });
    expect(coverage(d, g, [{ x: given('x', -0.5, 'm') }, { x: given('x', 0.5, 'm') }], 'x').value).toBeCloseTo(0.2, 12);
  });
});

describe('declared coordinates', () => {
  it('a domain declares its coordinates: a configuration space over design variables has no frame, and its extent must be in each coordinate\'s dimension', () => {
    const b = variable('b', 'm', 'breadth'), h = variable('h', 'm', 'depth');
    const space = domain(null, { b, h }, { b: { lo: given('least breadth', 0.019, 'm'), hi: given('most breadth', 0.3, 'm') } });
    expect(space.frame).toBeNull();
    expect(Object.keys(space.coords)).toEqual(['b', 'h']);
    expect(() => domain(null, { b }, { h: { lo: given('lo', 0, 'm'), hi: given('hi', 1, 'm') } })).toThrow(/bounded but not a coordinate/);
    expect(() => domain(null, { b }, { b: { lo: given('lo', 0, 's'), hi: given('hi', 1, 's') } })).toThrow(/not in its dimension/);
    expect(() => domain(null, { c: b })).toThrow(/the coordinate c is the variable b/);
    // the area over the design space is a field: nothing enumerates it, an address selects a state
    const area = fieldOf('section area', 'm^2', space, mul(b, h), {}, []);
    expect(sample(area, { b: given('b', 0.089, 'm'), h: given('h', 0.038, 'm') }).value).toBeCloseTo(0.003382, 9);
    expect(sample(area, { b: given('b', 0.5, 'm'), h: given('h', 0.038, 'm') }).status).toBe('outside-validity');
    expect(sample(area, { b: given('b', 0.089, 'm') }).status).toBe('unknown');
  });

  it('the lattice of a domain: every address a record from the extent and the spacing; an unbounded coordinate has no lattice', () => {
    const b = variable('b', 'm', 'breadth'), h = variable('h', 'm', 'depth');
    const space = domain(null, { b, h }, { b: { lo: given('lo', 0.02, 'm'), hi: given('hi', 0.1, 'm') }, h: { lo: given('lo', 0.02, 'm'), hi: given('hi', 0.06, 'm') } });
    const points = lattice(space, { b: given('spacing', 0.02, 'm'), h: given('spacing', 0.02, 'm') });
    expect(points.length).toBe(5 * 3);
    expect(points[points.length - 1]!['b']!.value).toBeCloseTo(0.1, 12);
    expect(points[points.length - 1]!['h']!.value).toBeCloseTo(0.06, 12);
    expect(points[0]!['b']!.inputs['lo']!.name).toBe('lo');
    expect(() => lattice(domain(null, { b }), { b: given('spacing', 0.02, 'm') })).toThrow(/unbounded/);
  });

  it('a field constant along a coordinate is coarse-grained there exactly, without samples along it', () => {
    const x = variable('x', 'm'), t = variable('t', 's');
    const f = fieldOf('a level', 'm', domain(null, { x, t }), mul(k(2), x), {}, []);
    const r = resolution('slow', { t: given('quiet', 10, 's'), x: given('gauge', 0.2, 'm') });
    const c = coarse(f, r, { x: given('x', 1, 'm') });
    expect(c.value).toBeCloseTo(2, 12);
  });
});
