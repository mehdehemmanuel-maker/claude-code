// Heat between things that touch, and to the air (src/nexus/substrate/heatflow.ts): two steel blocks share heat at the rate the
// conductance between their middles gives; fused they share it faster than touching, glued slower; a heater comes to
// the temperature where the air takes what it puts in; and what goes in, out and is held balances.

import { describe, expect, it } from 'vitest';
import { Workshop } from '../../src/nexus/ask/generate';
import { heatLoss } from '../../src/engineering/thermal';
import { flowHeat, TOUCHING_R } from '../../src/nexus/substrate/heatflow';

const room = () => { const w = new Workshop({ parts: () => [] }, 3); w.run('material steel'); return w; };
const pair = (how?: string) => { const w = room(); w.run('place cube named hot at 0, 0.5 m, 0 size 100 mm'); w.run('place cube named cold at 0.1 m, 0.5 m, 0 size 100 mm'); if (how) w.run(`${how} hot and cold as pair`); w.run('heat hot to 200 °C'); return w; };

describe('heat between what touches', () => {
  it('two steel blocks touching share heat as G = 1 / (L/kA + R″/A + L/kA) says, and the energy balances', () => {
    const w = pair(), said = w.run('let heat flow for 10 min');
    const k = 51.9, A = 0.01, G = 1 / (0.05 / (k * A) + TOUCHING_R / A + 0.05 / (k * A)), C = 7.85 * 486;
    // with no air, their difference decays as e^(-2 G t / C) exactly; the stepper alone does that
    const alone = flowHeat([{ name: 'hot', C, T0: 200, P: 0, area: 0, L: 0.1, emissivity: 0.8 }, { name: 'cold', C, T0: 20, P: 0, area: 0, L: 0.1, emissivity: 0.8 }], [{ a: 0, b: 1, G }], 600);
    const want = 180 * Math.exp((-2 * G * 600) / C); expect(Math.abs(alone.end[0]! - alone.end[1]! - want) / want).toBeLessThan(0.005);
    // in air the hotter loses more to it (about 120 W against 26 W, by hand), so the difference closes faster still
    const diff = w.value('hot.temperature') - w.value('cold.temperature');
    expect(diff).toBeLessThan(want); expect(diff).toBeGreaterThan(want * 0.8);
    expect(said).toMatch(/hot 200 → [\d.]+ °C; cold 20 → [\d.]+ °C/);
    expect(said).toMatch(/in less out less held: (-?\d(\.\d+)?e-\d+ J|0 J)\)/);
    expect(w.run('chart heat')).toMatch(/Charted the temperatures of the 2/);
  });
  it('fused they share heat faster than touching; glued, slower: the face between them is all that differs', () => {
    const d = (how?: string) => { const w = pair(how); w.run('let heat flow for 5 min'); return w.value('hot.temperature') - w.value('cold.temperature'); };
    const touching = d(), fused = d('fuse'), glued = d('glue');
    expect(fused).toBeLessThan(touching); expect(glued).toBeGreaterThan(touching);
  });
  it('a heater in a block in the air comes to where the air takes all it puts in', () => {
    const w = room(); w.run('material aluminium'); w.run('place cube named blk at 0, 0.5 m, 0 size 100 mm'); w.run('heat blk with 10 W'); w.run('let heat flow for 8 h');
    let lo = 20, hi = 400; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (heatLoss(mid, 0.06, 0.1, 0.1) > 10) hi = mid; else lo = mid; }
    expect(w.value('blk.temperature')).toBeCloseTo(lo, 0);
    expect(w.holds('blk.temperature over 100 °C')).toBe(lo > 100);
  });
  it('past where it melts, it says so; a motor run leaves its body at its housing\'s temperature', () => {
    const w = room(); w.run('material aluminium'); w.run('place cube named blk at 0, 0.5 m, 0 size 50 mm'); w.run('heat blk to 700 °C');
    expect(w.run('let heat flow for 10 s')).toMatch(/blk reached 700 °C, past its melting point of 582 °C/);
    const m = room(); m.run('place motor named mo at 0, 0.5 m, 0'); m.run('run mo at 24 V for 120 s against 0.3 N·m');
    expect(m.value('mo.temperature')).toBeCloseTo(m.value('mo.case'), 3);
  });
  it('a thing in no contact cools only to the air; one temperature for a thick block of wood is said to be too few', () => {
    const w = room(); w.run('place cube named a at 0, 0.5 m, 0 size 100 mm'); w.run('place cube named b at 1 m, 0.5 m, 0 size 100 mm'); w.run('heat a to 100 °C');
    w.run('let heat flow for 60 s'); expect(w.value('b.temperature')).toBe(20); expect(w.value('a.temperature')).toBeLessThan(100);
    const wood = room(); wood.run('material oak'); wood.run('place cube named log at 0, 0.5 m, 0 size 400 mm'); wood.run('heat log to 80 °C');
    expect(wood.run('let heat flow for 60 s')).toMatch(/One temperature is too few for log \(Bi [\d.]+\)/);
  });
  it('the stepper alone: one node cooling to the air balances to rounding at any step', () => {
    const r = flowHeat([{ name: 'x', C: 1000, T0: 300, P: 0, area: 0.06, L: 0.1, emissivity: 0.8 }], [], 3600);
    expect(Math.abs(r.energy.in - r.energy.air - r.energy.stored)).toBeLessThan(1e-6); expect(r.end[0]!).toBeLessThan(300); expect(r.end[0]!).toBeGreaterThan(20);
  });
});
