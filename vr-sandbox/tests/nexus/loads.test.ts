import { describe, expect, it } from 'vitest';
import { engineLoads, springCase, springIn, strengthOf } from '../../src/nexus/loads';
import { engineDims, headPiece, springOf, type EngineSpec } from '../../src/nexus/engines';
import { coil } from '../../src/nexus/makers';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import '../../src/nexus/blocks';

const corolla: EngineSpec = { cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al', cams: 'dohc', valves: 4 };
const gx270: EngineSpec = { cyl: 1, bore: 0.077, stroke: 0.058, fuel: 'petrol', block: 'al', cooling: 'air', cams: 'ohv', valves: 2, starter: 'recoil' };

describe('parts under the loads they work under', () => {
  it('reads a spring as its maker made it, and holds it to Shigley: rate, preload, stress, coil bind', () => {
    const sp = coil({ name: 'spring', d: 0.003, D: 0.024, L: 0.04, L0: 0.048, n: 5 });
    expect(springIn(sp)).toEqual({ d: 0.003, D: 0.024, n: 5, L: 0.04, L0: 0.048 });
    const r = springCase(sp, { stroke: 0.008 });
    // (k = G d⁴ / 8 D³ n, chrome-silicon's G 77.2 GPa (Shigley table 10-5): 77.2e9 × 8.1e-11 / 5.53e-4 = 11.31 N/mm; 8 mm
    // preload, 90 N; and 8 mm more, 181 N)
    expect(r.says).toMatch(/rate 11\.31 N\/mm; 90 N as fitted/); expect(r.says).toMatch(/181 N at 8\.00 mm more/);
    expect(r.rows.find((x) => /solid/.test(x.what))!.ok).toBe(true);
    // (compressed past its solid length it binds, and says so)
    expect(springCase(sp, { stroke: 0.024 }).rows.find((x) => /solid/.test(x.what))!.ok).toBe(false);
  });
  it('knows a forged rod\'s steel from the handbook, and says when it knows none', () => {
    expect(strengthOf('steel-alloy')!.yield).toBe(655e6); expect(strengthOf('pbt')).toBeNull();
  });
  it('sizes a head\'s valve spring by its engine\'s speed, and its preload holds its valve shut', () => {
    const d = engineDims(gx270), s = springOf(d); expect(s.ok).toBe(true); expect(s.L0).toBeGreaterThan(s.L); expect(s.holds).toBeGreaterThan(1.2 * d.redline);
    expect(springIn(headPiece(gx270, 'valve spring'))!.L0).toBeCloseTo(s.L0, 9);
  });
  it('finds a small engine sound at its governed speed, and its valves floating far above it', () => {
    const r = engineLoads(gx270, { rpm: 3600, pmax: 6e6 }); expect(r.rows.every((x) => x.ok), r.says).toBe(true); expect(r.floatRpm).toBeGreaterThan(3600 * 1.2);
  });
  it('finds a soft spring lets the valves float, and says at what speed', () => {
    const soft = coil({ name: 'valve spring', d: 0.0022, D: 0.0185, L: 0.037, L0: 0.039, n: 5 }), r = engineLoads(corolla, { rpm: 6600, pmax: 8e6, spring: soft });
    const row = r.rows.find((x) => /on its cam/.test(x.what))!; expect(row.ok).toBe(false); expect(r.floatRpm).toBeLessThan(6600); expect(row.says).toMatch(/float above \d+ rpm/);
  });
  it('sweeps an engine over its speed and finds where it gives: no worse at higher speed', async () => {
    const b = emptyBoard('sweep'); placeBlock(b, 'sweep.range', 0, 0, { block: 'load.engine', vary: 'rpm', from: 1000, to: 7000, steps: 7, watch: 'worst', blockSet: JSON.stringify({ valves: '2', cams: 'ohv', cooling: 'air', starter: 'recoil' }) }, 's');
    b.nodes.s!.set = { ...b.nodes.s!.set, cylinders: 1, bore: 0.077, stroke: 0.058 };
    const e = new Engine(b); await e.run(); const st = e.state.get('s')!; expect(st.status, st.error).toBe('ok');
    const ys = st.out!.ys as number[]; expect(ys.length).toBe(7); expect(st.out!.at).toBe(7000); expect(ys[6]!).toBeLessThan(ys[0]!);
  });
});
