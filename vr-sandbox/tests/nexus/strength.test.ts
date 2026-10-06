// Loops, the parts list, loads and charts (src/nexus/generate.ts). A plate across two blocks is simply supported:
// M = F a b / L, σ = M c / I, deflection F L³ / 48 E I at its middle; its end past a post is a cantilever, M = F a,
// deflection F a³ / 3 E I; a block on the floor bears its load, σ = F / A. Each worked by hand here.

import { describe, expect, it } from 'vitest';
import { Workshop } from '../../src/nexus/generate';

const near = (a: number, b: number, rel = 1e-6) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(rel);
const shop = () => { const w = new Workshop({ parts: () => [] }); w.run('material steel'); return w; };

describe('loops', () => {
  it('repeat counts with {i}; for each goes over each of a kind with {it}; while stops when it no longer holds, or at its cap', () => {
    const w = shop(); w.run('repeat 4 times: place cube named k{i} at {i} * 150 mm, 0.3 m, 1 m size 50 mm');
    expect(w.all().made.map((m) => m.name)).toEqual(['k1', 'k2', 'k3', 'k4']); near(w.value('k3.x'), 0.45);
    expect(w.run('for each k: rotate {it} y 30')).toMatch(/^For each of 4 \(k1, k2, k3, k4\): 4 steps done/); near(w.value('k2.ry'), Math.PI / 6);
    w.run('set n = 0'); expect(w.run('while n < 5: set n = n + 1')).toMatch(/done 5 times, until it no longer held/); expect(w.value('n')).toBe(5);
    expect(w.run('while n < 100: set n = n + 1, at most 7 times')).toMatch(/done 7 times, at most 7, and it still holds/); expect(w.value('n')).toBe(12);
    // a value set from itself is worked out now, and keeps its unit
    w.run('set d = 10 mm'); expect(w.run('set d = d * 2')).toBe('d = 20 mm.');
    expect(() => w.run('repeat 3 times: place cube named q at 0, 1 m, 0 size 10 mm; rotate nothing 10 about y')).toThrow(/Repeated 3 times: stopped at 1/);
    expect(w.all().made.some((m) => m.name === 'q')).toBe(false);
  });
});

describe('loads on what is made', () => {
  const rig = () => { const w = shop(); w.run('place cube named left at 0, 0.05 m, 0 size 100 mm'); w.run('place cube named right at 1 m, 0.05 m, 0 size 100 mm'); w.run('place plate named span at 0.5 m, 0.105 m, 0 size 1100 x 100 x 10 mm'); return w; };
  it('across two blocks: simply supported between their inner edges', () => {
    const w = rig(), I = (0.1 * 0.01 ** 3) / 12, L = 0.9;
    expect(w.run('load span with 100 N')).toMatch(/simply supported across 900 mm between left and right: M = F a b \/ L, 22\.5 N·m/);
    near(w.value('span.stress'), (100 * L / 4 * 0.005) / I); near(w.value('span.deflection'), (100 * L ** 3) / (48 * 200e9 * I));
    expect(w.value('span.factor')).toBeCloseTo(250e6 / ((100 * L / 4 * 0.005) / I), 2);
    expect(w.run('load span with 2000 N')).toMatch(/It yields: past its 250 MPa yield it bends for good/);
    expect(w.run('load span with 4000 N')).toMatch(/It breaks/); expect(w.value('span.broken')).toBe(1); expect(w.all().made.find((m) => m.name === 'span')!.broken).toBe(true);
  });
  it('past its last support a cantilever; on the floor bearing; with nothing under it, it says so', () => {
    const w = rig(); w.run('place plate named arm at 2 m, 0.105 m, 0 size 600 x 50 x 10 mm'); w.run('place cube named post at 1.75 m, 0.05 m, 0 size 100 mm');
    const I = (0.05 * 0.01 ** 3) / 12; expect(w.run('load arm with 50 N at the end')).toMatch(/a cantilever 500 mm out past post/);
    near(w.value('arm.deflection'), (50 * 0.5 ** 3) / (3 * 200e9 * I));
    expect(w.run('load left with 5000 N')).toMatch(/it bears on the floor: σ = F \/ A over 100 cm², 0\.5 MPa/);
    w.run('place cube named high at 3 m, 1 m, 0 size 100 mm'); expect(() => w.run('load high with 10 N')).toThrow(/Nothing holds high up/);
    // a value named load is still a value: "load over 100 N" is a check, not a load
    w.run('set load = 200 N'); expect(w.holds('load over 100 N')).toBe(true);
  });
});

describe('the parts list and charts', () => {
  it('each part as bought and cut, each piece and what holds it, totals by matter', () => {
    const w = shop(); w.run('place plate named deck at 0, 0.5 m, 0 size 600 x 400 x 12 mm'); w.run('place rod named leg at 0, 0.247 m, 0 size 30 x 494 mm');
    w.run('join deck and leg as table'); const said = w.run('parts list');
    expect(said).toMatch(/deck: 400 × 600 mm cut from 12 mm sheet, Structural steel ASTM A36/); expect(said).toMatch(/leg: Ø30 mm bar, 494 mm long/);
    expect(said).toMatch(/table: deck \+ leg, 1 fused/); near(w.value('parts.mass'), 7850 * (0.6 * 0.4 * 0.012 + Math.PI * 0.015 ** 2 * 0.494), 1e-9);
  });
  it('a chart of a motor run: one quantity to a panel', () => {
    const w = shop(); w.run('place motor named m at 0, 1 m, 0'); w.run('run m at 24 V for 5 s against 0.1 N·m'); w.run('chart m');
    const c = w.takeChart()!; expect(c.panels.map((p) => p.label)).toEqual(['Speed (rpm)', 'Current (A)', 'Temperature (°C)']);
    expect(c.panels[2]!.series.map((s) => s.name)).toEqual(['winding', 'housing']); expect(w.takeChart()).toBeNull();
    expect(() => w.run('chart nothing')).toThrow(/Nothing to chart as "nothing"/);
  });
});
