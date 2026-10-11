// The binder: the one way a term says "over". An integral of a body along a bound coordinate between two ends, the
// rule's resolution a leaf in the term. Tested on what the language already had: the pendulum's period factor is
// generated from energy conservation instead of written as a series, and the series' domain is a measured
// truncation error; the prism's mass, inertia and section moments are one mechanism, integrals of the shape.

import { describe, expect, it } from 'vitest';
import { AMPLITUDE_FACTOR, PERIOD_FACTOR, PRISM_INERTIA, PRISM_MASS, RECT_AREA, RECT_I } from '../../src/nexus/book';
import { evaluate, ofLeaf } from '../../src/nexus/lang/evaluate';
import { apply } from '../../src/nexus/lang/law';
import { add, boundSyms, cells, div, integral, k, leaf, leavesOf, mul, neg, pow, show, sin, sqrt, substitute, varsOf, variable, PI, zero } from '../../src/nexus/lang/term';
import { closure, leavesUnder } from '../../src/nexus/substrate/why';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'the test' }));
const res = (n: number) => cells(n, 'the test');

describe('the binder as a term', () => {
  it('has the body\'s dimension times the coordinate\'s; its ends must have the coordinate\'s; the bound coordinate is not free', () => {
    const x = variable('x', 'm'), q = variable('q', 'N/m');
    const t = integral(x, zero('m'), variable('L', 'm'), mul(q, x), res(4));
    expect(t.dim).toEqual(mul(q, pow(x, 2)).dim);
    expect(varsOf(t).map((v) => v.sym).sort()).toEqual(['L', 'q']);
    expect(boundSyms(t)).toEqual(['x']);
    expect(() => integral(x, zero('s'), variable('L', 'm'), q, res(4))).toThrow(/an end is/);
    expect(() => integral(x, zero('m'), x, q, res(4))).toThrow(/mentions the bound coordinate/);
    expect(() => integral(x, zero('m'), variable('L', 'm'), q, cells(1, 'one'))).toThrow(/at least two panels/);
    expect(() => mul(t, x)).toThrow(/bound in one argument and free in another/);
    expect(show(t)).toBe('∫[0, L] q · x dx');
  });

  it('identity is by content: renaming the bound coordinate changes nothing, the resolution leaf is in the identity and the closure', () => {
    const x = variable('x', 'm'), y = variable('y', 'm'), q = variable('q', 'N/m');
    const a = integral(x, zero('m'), variable('L', 'm'), mul(q, x), res(4));
    const b = integral(y, zero('m'), variable('L', 'm'), mul(q, y), res(4));
    const c = integral(x, zero('m'), variable('L', 'm'), mul(q, x), res(8));
    expect(a.hash).toBe(b.hash);
    expect(a.hash).not.toBe(c.hash);
    expect(leavesOf(a).map((l) => l.name)).toContain('4 Simpson panels');
    const d = evaluate('∫ q x', a, { q: given('q', 10, 'N/m'), L: given('L', 2, 'm') }, { law: 'the test', unit: 'N m' });
    expect(leavesUnder(d).map((l) => l.name)).toContain('4 Simpson panels');
    expect(closure(d).has(res(4).hash)).toBe(true);
    expect(d.inputs['x']).toBeUndefined();
  });

  it('substitution respects the binder: free ends and body are replaced, the bound coordinate is not, capture is refused', () => {
    const x = variable('x', 'm'), q = variable('q', 'N/m'), L = variable('L', 'm');
    const t = integral(x, zero('m'), L, mul(q, x), res(4));
    const s = substitute(t, { L: mul(k(2), variable('a', 'm')), x: variable('z', 'm') });
    expect(varsOf(s).map((v) => v.sym).sort()).toEqual(['a', 'q']);
    expect(() => substitute(t, { q: mul(variable('w', 'N/m^2'), x) })).toThrow(/captured/);
  });
});

describe('the binder evaluated', () => {
  it('∫₀¹ x² dx is exactly a third (Simpson is exact to cubics) with no discretization error; ∫₀^π sin x dx is 2 within the error measured by halving', () => {
    const x = variable('x', '1');
    const cube = evaluate('∫ x²', integral(x, zero('1'), k(1), pow(x, 2), res(4)), {}, { law: 'the test', unit: '1' });
    expect(cube.value).toBeCloseTo(1 / 3, 14);
    expect(cube.uncertainty ?? 0).toBeLessThan(1e-15);
    const s = evaluate('∫ sin', integral(x, zero('1'), PI(), sin(x), res(8)), {}, { law: 'the test', unit: '1' });
    expect(Math.abs(s.value! - 2)).toBeLessThan(1e-4);
    expect(s.uncertainty).toBeGreaterThan(0);
    expect(Math.abs(s.value! - 2)).toBeLessThan(s.uncertainty!);
  });

  it('an integrand that is unknown leaves the integral unknown; one that is not finite on the interval is outside validity', () => {
    const x = variable('x', '1');
    const u = evaluate('∫ a x', integral(x, zero('1'), k(1), mul(variable('a', '1'), x), res(4)), { a: ofLeaf(leaf('a', null, '1', { class: 'unknown' })) }, { law: 'the test', unit: '1' });
    expect(u.status).toBe('unknown');
    const inf = evaluate('∫ 1/x', integral(x, zero('1'), k(1), div(k(1), x), res(4)), {}, { law: 'the test', unit: '1' });
    expect(inf.status).toBe('outside-validity');
  });
});

describe('laws generated, not written', () => {
  it('the pendulum\'s period factor is the elliptic integral: the series agrees within its claimed truncation up to 45°, is refused beyond it, and the integral goes on to the inverted position', () => {
    const at = (deg: number) => apply(PERIOD_FACTOR, { theta0: given('θ₀', deg, 'deg') });
    const series = (deg: number) => apply(AMPLITUDE_FACTOR, { theta0: given('θ₀', deg, 'deg') });
    expect(at(0).value).toBeCloseTo(1, 12);
    expect(at(90).value).toBeCloseTo(1.18034, 5);
    expect(Math.abs(at(30).value! - series(30).value!)).toBeLessThan(1e-5);
    expect(Math.abs(at(45).value! - series(45).value!)).toBeLessThan(1e-4);
    expect(series(60).status).toBe('outside-validity');
    expect(at(60).value).toBeCloseTo(1.07318, 4);
    // the series' next term at 60° would be 2e-4: the integral says what the series would have been wrong by
    expect(Math.abs(at(60).value! - (1 + (Math.PI / 3) ** 2 / 16 + (11 * (Math.PI / 3) ** 4) / 3072))).toBeGreaterThan(1e-4);
    expect(at(170).value).toBeGreaterThan(2);
    expect(at(170).uncertainty).toBeGreaterThan(0);
    expect(at(180).status).toBe('outside-validity');
    expect(at(30).uncertainty ?? 0).toBeLessThan(1e-9);
  });

  it('the prism\'s mass, section area, second moment and inertia are one mechanism: integrals of the shape', () => {
    const x = variable('x', 'm'), y = variable('y', 'm'), z = variable('z', 'm');
    const a = variable('a', 'm'), b = variable('b', 'm'), c = variable('c', 'm'), rho = variable('rho', 'kg/m^3');
    const half = (v: typeof a) => div(v, k(2));
    const over = (v: typeof x, ext: typeof a, body: Parameters<typeof integral>[3]) => integral(v, neg(half(ext)), half(ext), body, res(2));
    const env = { a: given('a', 1, 'm'), b: given('b', 0.089, 'm'), c: given('c', 0.038, 'm'), rho: given('rho', 500, 'kg/m^3') };
    const mass = evaluate('∫∫∫ ρ dV', over(x, a, over(y, b, over(z, c, rho))), env, { law: 'the shape', unit: 'kg' });
    expect(mass.value).toBeCloseTo(apply(PRISM_MASS, { rho: env.rho, x: env.a, y: env.b, z: env.c }).value!, 12);
    const area = evaluate('∫∫ dA', over(y, b, over(z, c, k(1, '1'))), env, { law: 'the shape', unit: 'm^2' });
    expect(area.value).toBeCloseTo(apply(RECT_AREA, { b: env.b, h: env.c }).value!, 15);
    const second = evaluate('∫∫ z² dA', over(y, b, over(z, c, pow(z, 2))), env, { law: 'the shape', unit: 'm^4' });
    expect(second.value).toBeCloseTo(apply(RECT_I, { b: env.b, h: env.c }).value!, 15);
    const inertia = evaluate('∫∫∫ ρ (x² + y²) dV', over(x, a, over(y, b, over(z, c, mul(rho, add(pow(x, 2), pow(y, 2)))))), env, { law: 'the shape', unit: 'kg m^2' });
    const m = apply(PRISM_MASS, { rho: env.rho, x: env.a, y: env.b, z: env.c });
    expect(inertia.value).toBeCloseTo(apply(PRISM_INERTIA, { m, a: env.a, b: env.b }).value!, 12);
    for (const d of [mass, area, second, inertia]) expect(d.uncertainty ?? 0).toBeLessThan(1e-12);
    expect(sqrt(k(4)).dim).toEqual(k(1).dim);
  });
});
