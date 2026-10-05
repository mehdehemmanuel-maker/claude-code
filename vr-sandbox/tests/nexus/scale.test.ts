// Scale as a relation between distance, how fast something crosses it and the system's own time, probed with water
// (tests/nexus/water.ts). The mechanisms, the lengths where they cross, the ratios no change of scale alters, the
// regime numbers, the levels and what an observer cannot see are all generated from the measured quantities. Every
// expectation below is a closed form computed from the same inputs, independently of the generator, and the
// literature values are only a sanity check on the inputs.

import { describe, expect, it } from 'vitest';
import { crossings, generate, levels, molecularSize, observe, spectrum, timeOf, type Mechanism, type Observer } from '../../src/nexus/scale';
import { water } from './water';

const qs = water(1);
const { mechanisms, lengths } = generate(qs);
const molecule = molecularSize(lengths, qs)!.value;
const R = qs['R']!.d.value!;
const { crossings: cs, invariants } = crossings(mechanisms, molecule, R);
const v = (k: string) => qs[k]!.d.value!;
const rho = v('rho'), mu = v('mu'), sigma = v('sigma'), a = v('a'), D = v('D'), g = v('g'), Om = v('Omega'), c = v('c'), speed = v('v');
const nu = mu / rho, alpha = v('kc') / v('rhocp'), K = v('K'), kT = v('kT'), m = v('m');
const by = (...names: string[]) => (x: Mechanism) => x.factors.length === names.length && names.every((n) => x.factors.some((f) => f.name === n));
const mech = (...names: string[]) => { const x = mechanisms.find(by(...names)); if (!x) throw new Error(`no mechanism of ${names.join(', ')}`); return x; };
const crossing = (p: string[], q: string[]) => cs.find((x) => (by(...p)(x.a) && by(...q)(x.b)) || (by(...q)(x.a) && by(...p)(x.b)));
const invariant = (p: string[], q: string[]) => { const x = invariants.find((y) => (by(...p)(y.a) && by(...q)(y.b)) || (by(...q)(y.a) && by(...p)(y.b))); if (!x) throw new Error('no invariant'); return by(...p)(x.a) ? x.ratio : 1 / x.ratio; };
const rel = (x: number, y: number) => Math.abs(x - y) / Math.abs(y);

describe('the mechanisms of a matter come from its quantities by their dimensions alone', () => {
  it('twenty mechanisms, each with a meaning nothing named, and none made of two mechanisms', () => {
    const sets = mechanisms.map((x) => x.factors.map((f) => f.name).sort().join('+')).sort();
    expect(sets).toEqual(['D', 'Omega', 'a', 'c', 'cn', 'fOH', 'g', 'hb', 'kT+m', 'kT+mu', 'kT+rho', 'K+m', 'K+mu', 'kc+rhocp', 'm+mu', 'm+sigma', 'mu+rho', 'mu+sigma', 'rho+sigma', 'v'].sort());
    // momentum and heat spread as L² over their diffusivities; capillarity as L^(3/2); a body of size L wanders by its thermal energy as L³
    expect(mech('mu', 'rho').exponent).toBe(2);
    expect(timeOf(mech('mu', 'rho'), 1e-3)).toBeCloseTo(1e-6 / nu, 9);
    expect(timeOf(mech('kc', 'rhocp'), 1e-3)).toBeCloseTo(1e-6 / alpha, 9);
    expect(mech('rho', 'sigma').exponent).toBe(1.5);
    expect(timeOf(mech('rho', 'sigma'), 1e-3)).toBeCloseTo(Math.sqrt(rho * 1e-9 / sigma), 12);
    expect(mech('kT', 'mu').exponent).toBe(3);
    expect(timeOf(mech('kT', 'mu'), 1e-6)).toBeCloseTo(mu * 1e-18 / kT, 6);
    // a stiffness over a viscosity is a rate: how fast the liquid forgets a strain (a fraction of a picosecond)
    expect(mech('K', 'mu').exponent).toBe(0);
    expect(timeOf(mech('K', 'mu'), 1)).toBeCloseTo(mu / K, 20);
    // one molecule's mechanisms live at the molecule's size: its thermal speed across it, its velocity forgotten in the viscosity
    expect(mech('kT', 'm').molecular).toBe(true);
    expect(timeOf(mech('kT', 'm'), 1, molecule)).toBeCloseTo(molecule / Math.sqrt(kT / m), 18);
    expect(timeOf(mech('m', 'mu'), 1, molecule)).toBeCloseTo(m / (mu * molecule), 18);
  });

  it('the molecule\'s size is a length the matter makes: its mass over its density, a third of a nanometre', () => {
    expect(molecule).toBeCloseTo(Math.cbrt(m / rho), 18);
    expect(molecule).toBeGreaterThan(3.0e-10);
    expect(molecule).toBeLessThan(3.2e-10);
  });
});

describe('what scale does not change, and where it changes the description', () => {
  it('ratios of mechanisms that grow alike are scale-free: momentum over heat, momentum over matter, heat over matter, light in vacuum over light in water, and with a motion its Mach and capillary numbers', () => {
    expect(invariant(['kc', 'rhocp'], ['mu', 'rho'])).toBeCloseTo(nu / alpha, 9);
    expect(rel(nu / alpha, 6.13)).toBeLessThan(0.02); // the Prandtl number of water at 25 °C is about 6.1
    expect(invariant(['D'], ['mu', 'rho'])).toBeCloseTo(nu / D, 6);
    expect(invariant(['D'], ['kc', 'rhocp'])).toBeCloseTo(alpha / D, 6);
    expect(invariant(['cn'], ['c'])).toBeCloseTo(v('cn') === 0 ? 0 : c / v('cn'), 9);
    expect(invariant(['a'], ['v'])).toBeCloseTo(speed / a, 12);
    expect(invariant(['mu', 'sigma'], ['v'])).toBeCloseTo(mu * speed / sigma, 12);
  });

  it('lengths where two mechanisms cross: the capillary length, the visco-capillary length and the size where sound and momentum spread alike, each found by every pair that should', () => {
    expect(crossing(['g'], ['rho', 'sigma'])!.length).toBeCloseTo(Math.sqrt(sigma / (rho * g)), 12);
    expect(rel(Math.sqrt(sigma / (rho * g)), 2.71e-3)).toBeLessThan(0.01);
    for (const [p, q] of [[['mu', 'rho'], ['rho', 'sigma']], [['mu', 'rho'], ['mu', 'sigma']], [['rho', 'sigma'], ['mu', 'sigma']]] as const) expect(crossing([...p], [...q])!.length).toBeCloseTo(mu * mu / (rho * sigma), 18);
    for (const [p, q] of [[['a'], ['mu', 'rho']], [['a'], ['K', 'mu']], [['mu', 'rho'], ['K', 'mu']]] as const) expect(crossing([...p], [...q])!.length).toBeCloseTo(nu / a, 20);
    // that last size is within a factor of two of the molecule: there the averaged quantities that made it stop holding
    expect(nu / a / molecule).toBeGreaterThan(1);
    expect(nu / a / molecule).toBeLessThan(2);
    expect(crossing(['g'], ['mu', 'rho'])!.length).toBeCloseTo(Math.cbrt(nu * nu / g), 15);
    expect(crossing(['Omega'], ['mu', 'rho'])!.length).toBeCloseTo(Math.sqrt(nu / Om), 12);
    expect(crossing(['a'], ['g'])!.length).toBeCloseTo(a * a / g, 3);
  });

  it('with a motion, the lengths it crosses are the regime numbers\' own: Reynolds, Péclet, Weber, Froude and Rossby are the size over each', () => {
    expect(crossing(['v'], ['mu', 'rho'])!.length).toBeCloseTo(nu / speed, 18);
    expect(crossing(['v'], ['kc', 'rhocp'])!.length).toBeCloseTo(alpha / speed, 18);
    expect(crossing(['v'], ['rho', 'sigma'])!.length).toBeCloseTo(sigma / (rho * speed ** 2), 15);
    expect(crossing(['v'], ['g'])!.length).toBeCloseTo(speed ** 2 / g, 12);
    expect(crossing(['v'], ['Omega'])!.length).toBeCloseTo(speed / Om, 6);
    // and the regime numbers are ratios of the times at one size
    const L = 0.01, t = (x: Mechanism) => timeOf(x, L, molecule), tv = t(mech('v'));
    expect(t(mech('mu', 'rho')) / tv).toBeCloseTo(speed * L / nu, 6);
    expect(t(mech('kc', 'rhocp')) / tv).toBeCloseTo(speed * L / alpha, 6);
    expect((t(mech('rho', 'sigma')) / tv) ** 2).toBeCloseTo(rho * speed ** 2 * L / sigma, 9);
    expect((tv / t(mech('g'))) ** 2).toBeCloseTo(g * L / speed ** 2, 9);
    expect(t(mech('a')) / tv).toBeCloseTo(speed / a, 12);
  });

  it('a crossing below the molecule or beyond the planet is marked: the quantities that made it do not hold there', () => {
    const sk = crossing(['K', 'mu'], ['mu', 'sigma'])!;
    expect(sk.length).toBeCloseTo(sigma / K, 20);
    expect(sk.beneath).toBe(true);
    expect(crossing(['g'], ['Omega'])!.beyond).toBe(true);
    expect(crossing(['g'], ['rho', 'sigma'])!.inside).toBe(true);
  });
});

describe('the causal bound and the levels', () => {
  it('light crosses an ocean far faster than its waves change, but a drop cannot be one molecular state: for the O–H vibration ε reaches one at the band\'s own wavelength', () => {
    const eps = (x: Mechanism, L: number) => (L / c) / timeOf(x, L, molecule);
    expect(eps(mech('g'), 1e7)).toBeLessThan(1e-4);
    expect(eps(mech('hb'), 0.01)).toBeGreaterThan(10);
    const w = crossing(['c'], ['fOH'])!;
    expect(w.length).toBeCloseTo(1 / 3.4e5, 15);
    expect(eps(mech('fOH'), w.length)).toBeCloseTo(1, 9);
  });

  it('a level appears where the spectrum of times has a gap: at a nanometre the molecules and the flow share one band; at a micrometre and above they are apart', () => {
    const gap = 100; // a declared judgment: two decades
    const together = (L: number) => levels(mechanisms, L, molecule, gap).some((band) => band.some((x) => x.m === mech('hb')) && band.some((x) => x.m === mech('a')));
    expect(together(1e-9)).toBe(true);
    expect(together(1e-6)).toBe(false);
    expect(together(1e-3)).toBe(false);
    // the times are equal at sound speed times the bond's life, and two decades apart a hundred times further
    expect(crossing(['a'], ['hb'])!.length).toBeCloseTo(a * 1e-12, 18);
    expect(together(0.9 * gap * a * 1e-12)).toBe(true);
    expect(together(1.1 * gap * a * 1e-12)).toBe(false);
  });
});

describe('what an observer cannot see', () => {
  // three observers, by their support, window, watch and how fast what they learn from travels
  const kernel: Observer = { name: 'the rigid-body kernel', support: 1e-3, window: 1 / 90, duration: 4, speed: c };
  const pulse: Observer = { name: 'an ultrafast infrared pulse', support: 1e-6, window: 50e-15, duration: 10e-12, speed: c };
  it('the kernel watching a centimetre of water averages sound away (it sees an incompressible liquid), never sees momentum spread (an inviscid one) and never sees the earth turn (an inertial frame): three laws that are the window', () => {
    const seen = (o: Observer, L: number, x: Mechanism) => observe(mechanisms, L, molecule, o).sights.find((s) => s.m === x)!.seen;
    expect(seen(kernel, 0.01, mech('a'))).toBe('averaged');
    expect(seen(kernel, 0.01, mech('mu', 'rho'))).toBe('fixed');
    expect(seen(kernel, 0.01, mech('Omega'))).toBe('fixed');
    expect(seen(kernel, 0.01, mech('g'))).toBe('resolved');
    expect(seen(kernel, 0.01, mech('rho', 'sigma'))).toBe('resolved');
    // the same liquid to a pulse: the bonds and the liquid's forgetting resolved, every flow fixed
    expect(seen(pulse, 1e-6, mech('hb'))).toBe('resolved');
    expect(seen(pulse, 1e-6, mech('K', 'mu'))).toBe('resolved');
    expect(seen(pulse, 1e-6, mech('fOH'))).toBe('averaged');
    expect(seen(pulse, 1e-6, mech('mu', 'rho'))).toBe('fixed');
  });

  it('what changes before light crosses the region cannot be seen as one state across it', () => {
    const across = observe(mechanisms, 0.01, molecule, kernel).sights.filter((s) => s.across).map((s) => s.m);
    expect(across).toContain(mech('hb'));
    expect(across).not.toContain(mech('a'));
  });
});

describe('the scale coordinate, tested rather than declared', () => {
  // a sweep over seventeen decades, every mechanism that grows with size
  const Ls = Array.from({ length: 69 }, (_, i) => 10 ** (-10 + i * 0.25));
  const growing = mechanisms.filter((x) => !x.molecular && x.exponent !== 0);
  const fit = (xs: number[], ys: number[]) => {
    const n = xs.length, mx = xs.reduce((p, q) => p + q) / n, my = ys.reduce((p, q) => p + q) / n;
    const sxx = xs.reduce((p, x) => p + (x - mx) ** 2, 0), sxy = xs.reduce((p, x, i) => p + (x - mx) * (ys[i]! - my), 0);
    const slope = sxy / sxx, icpt = my - slope * mx;
    return { slope, rms: Math.sqrt(ys.reduce((p, y, i) => p + (y - (icpt + slope * xs[i]!)) ** 2, 0) / n) };
  };
  const charts = { 'ln λ': (L: number, ref: number) => Math.log(L / ref), 's = λ / (1 + λ)': (L: number, ref: number) => (L / ref) / (1 + L / ref) };
  it('in ln λ every mechanism is a straight line whose slope is its exponent, whatever the reference and the range; in s none is straight, and the slope fitted there is not the mechanism\'s but the chart\'s', () => {
    const ranges = [Ls, Ls.filter((L) => L >= 1e-6 && L <= 1e2)];
    for (const x of growing) {
      const slopes = { 'ln λ': [] as number[], 's = λ / (1 + λ)': [] as number[] };
      for (const range of ranges) for (const ref of [1, 1e-3, 1e-6]) {
        const lt = range.map((L) => Math.log(timeOf(x, L)));
        const u = fit(range.map((L) => charts['ln λ'](L, ref)), lt);
        expect(u.rms).toBeLessThan(1e-9);
        slopes['ln λ'].push(u.slope);
        const sv = fit(range.map((L) => charts['s = λ / (1 + λ)'](L, ref)), lt);
        expect(sv.rms).toBeGreaterThan(0.1);
        slopes['s = λ / (1 + λ)'].push(sv.slope);
      }
      for (const sl of slopes['ln λ']) expect(sl).toBeCloseTo(x.exponent, 9);
      const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
      expect(spread(slopes['s = λ / (1 + λ)'])).toBeGreaterThan(0.1);
    }
  });

  it('the finite chart carries the same information: s is the logistic of ln λ, so ln λ = logit(s) exactly, and an infinite scale fits in (0, 1)', () => {
    for (const L of Ls) { const s = charts['s = λ / (1 + λ)'](L, 1); expect(Math.log(s / (1 - s))).toBeCloseTo(Math.log(L), 6); expect(s > 0 && s < 1).toBe(true); }
  });

  it('in ln λ the distance between two crossings does not depend on the reference; in s it does', () => {
    const l1 = crossing(['g'], ['rho', 'sigma'])!.length, l2 = crossing(['mu', 'rho'], ['rho', 'sigma'])!.length;
    const gapIn = (chart: (L: number, ref: number) => number, ref: number) => chart(l1, ref) - chart(l2, ref);
    expect(gapIn(charts['ln λ'], 1)).toBeCloseTo(gapIn(charts['ln λ'], 1e-6), 12);
    expect(Math.abs(gapIn(charts['s = λ / (1 + λ)'], 1) - gapIn(charts['s = λ / (1 + λ)'], 1e-6))).toBeGreaterThan(0.1);
  });

  it('two mechanisms swap order across their crossing, and light in vacuum is the fastest crossing at every size until free fall overtakes it at c² / g', () => {
    for (const x of cs.filter((y) => y.inside && !y.a.molecular && !y.b.molecular)) {
      const before = timeOf(x.a, x.length / 10) < timeOf(x.b, x.length / 10), after = timeOf(x.a, x.length * 10) < timeOf(x.b, x.length * 10);
      expect(before, `${x.a.text} and ${x.b.text}`).not.toBe(after);
    }
    for (const L of Ls) expect(spectrum(growing, L, molecule)[0]!.m).toBe(mech('c'));
    const fall = crossing(['c'], ['g'])!;
    expect(fall.length).toBeCloseTo(c * c / g, -10);
    expect(fall.beyond).toBe(true);
  });
});
