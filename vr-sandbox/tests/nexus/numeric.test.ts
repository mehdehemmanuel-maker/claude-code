// The numeric layer (src/nexus/numeric.ts): each method against a closed form, each fixed-step method's order of
// convergence measured, and each telling the truth when it does not converge.

import { describe, expect, it } from 'vitest';
import { DERIVATIVE_METHODS, INTEGRAL_METHODS, ODE_METHODS, ROOT_METHODS, derivative, integrate, ode, root, simpsonRule, solveLinear, step } from '../../src/nexus/numeric';

describe('roots', () => {
  it('every method finds √2, and says it converged', () => {
    for (const method of ROOT_METHODS) {
      const r = root((x) => x * x - 2, { method, bracket: [0, 2], tol: 1e-14 });
      expect(r.converged, method).toBe(true);
      expect(r.value!, method).toBeCloseTo(Math.SQRT2, 12);
      expect(r.error, method).toBeLessThan(1e-10);
    }
  });
  it('Brent takes far fewer evaluations than bisection', () => {
    const f = (x: number) => Math.cos(x) - x;
    const b = root(f, { method: 'bisection', bracket: [0, 1], tol: 1e-14 }), br = root(f, { method: 'brent', bracket: [0, 1], tol: 1e-14 });
    expect(br.value!).toBeCloseTo(0.7390851332151607, 13);
    expect(br.evaluations).toBeLessThan(b.evaluations / 3);
  });
  it('refuses a bracket without a change of sign, and says when it ran out of steps', () => {
    const r = root((x) => x * x + 1, { method: 'brent', bracket: [-1, 1] });
    expect(r.value).toBeNull(); expect(r.converged).toBe(false); expect(r.warning).toMatch(/does not change sign/);
    const s = root((x) => x - 1 / 3, { method: 'bisection', bracket: [0, 1], tol: 1e-15, most: 5 });
    expect(s.converged).toBe(false); expect(s.warning).toMatch(/ran out of steps/); expect(s.error).toBeCloseTo(1 / 64, 12);
  });
  it('Newton without a bracket, from a guess; its slope of nothing said, not divided by', () => {
    expect(root((x) => Math.exp(x) - 3, { method: 'newton', guess: 0 }).value!).toBeCloseTo(Math.log(3), 12);
    expect(root((x) => x * x - 4, { method: 'newton', guess: 0 }).warning).toMatch(/slope/);
  });
});

describe('integrals', () => {
  it('every method integrates sin over [0, π] to 2 and eˣ over [0, 1] to e − 1', () => {
    for (const method of INTEGRAL_METHODS) {
      expect(integrate(Math.sin, 0, Math.PI, { method, panels: 200 }).value!, method).toBeCloseTo(2, 9);
      const r = integrate(Math.exp, 0, 1, { method, panels: 200 });
      expect(r.value!, method).toBeCloseTo(Math.E - 1, 9); expect(r.converged, method).toBe(true);
    }
  });
  it('Simpson\'s rule is fourth order: halving the panels cuts its error sixteenfold', () => {
    const e = (n: number) => Math.abs(simpsonRule(Math.exp, 0, 1, n)! - (Math.E - 1));
    expect(Math.log2(e(8) / e(16))).toBeCloseTo(4, 1);
  });
  it('the adaptive rule spends its evaluations where the function bends, and its error estimate bounds the truth', () => {
    const f = (x: number) => Math.sqrt(x), r = integrate(f, 0, 1, { method: 'adaptive-simpson', tol: 1e-10 });
    expect(Math.abs(r.value! - 2 / 3)).toBeLessThan(1e-9);
    expect(Math.abs(r.value! - 2 / 3)).toBeLessThanOrEqual(r.error * 10 + 1e-12);
  });
  it('a function not finite somewhere is said, never summed', () => {
    const r = integrate((x) => 1 / x, -1, 1, { method: 'gauss-legendre' });
    expect(r.converged).toBe(false);
  });
});

describe('derivatives', () => {
  it('both methods give the slope of sin at 1 as cos 1; Richardson far closer', () => {
    for (const method of DERIVATIVE_METHODS) expect(derivative(Math.sin, 1, { method }).value!, method).toBeCloseTo(Math.cos(1), 9);
    const r = derivative(Math.sin, 1, { method: 'richardson' });
    expect(Math.abs(r.value! - Math.cos(1))).toBeLessThan(1e-12); expect(r.error).toBeLessThan(1e-10);
  });
});

describe('paths through time', () => {
  const decay = (k: number) => (_t: number, y: readonly number[]) => [-k * y[0]!];
  it('every method follows y′ = −y to e⁻¹ at t = 1', () => {
    for (const method of ODE_METHODS) {
      const p = ode(decay(1), [1], 0, 1, { method, step: method === 'rk45' ? 0.1 : 1e-4 });
      expect(p.final[0]!, method).toBeCloseTo(Math.exp(-1), method === 'rk4' || method === 'rk45' ? 8 : 3);
    }
  });
  it('the orders are measured: Euler first, RK4 fourth', () => {
    const errAt = (method: 'euler' | 'rk4', h: number) => Math.abs(ode(decay(1), [1], 0, 1, { method, step: h, check: false }).final[0]! - Math.exp(-1));
    expect(Math.log2(errAt('euler', 0.01) / errAt('euler', 0.005))).toBeCloseTo(1, 1);
    expect(Math.log2(errAt('rk4', 0.02) / errAt('rk4', 0.01))).toBeCloseTo(4, 1);
  });
  it('a harmonic oscillator by RK45 keeps its energy, and its period is 2π', () => {
    const p = ode((_t, y) => [y[1]!, -y[0]!], [1, 0], 0, 2 * Math.PI, { method: 'rk45', tol: 1e-10 });
    expect(p.converged).toBe(true); expect(p.final[0]!).toBeCloseTo(1, 7); expect(p.final[1]!).toBeCloseTo(0, 7);
  });
  it('a stiff system: explicit Euler with a long step runs away and says so; backward Euler stays bounded', () => {
    const f = decay(1000);
    const ex = ode(f, [1], 0, 1, { method: 'euler', step: 0.01 });
    expect(ex.converged).toBe(false); expect(ex.warning).toMatch(/runs away|error/);
    const im = ode(f, [1], 0, 1, { method: 'backward-euler', step: 0.01 });
    expect(Math.abs(im.final[0]!)).toBeLessThan(1e-6);
  });
  it('one step of a fixed method, and a linear system', () => {
    expect(step('euler', decay(1), 0, [1], 0.1)[0]).toBeCloseTo(0.9, 14);
    expect(solveLinear([[2, 1], [1, 3]], [3, 5])!.map((v) => +v.toFixed(12))).toEqual([0.8, 1.4]);
    expect(solveLinear([[1, 2], [2, 4]], [1, 2])).toBeNull();
  });
});
