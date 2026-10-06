// Moving joints (src/nexus/sim.ts, Jolt hinge and slider constraints): made only where two things touch; let go, a
// flap hinged to a rail swings as a compound pendulum swings, a carriage on a slide runs as F = m a says and stops at
// its limit, and a wheel on a motor's hinge spins up as the motor's own torque line says it must.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import { Workshop } from '../../src/nexus/generate';
import type { Jolt } from '../../src/nexus/realize';
import { motorModel, windingR } from '../../src/engineering/dcmotor';
import { MOTORS } from '../../src/data/motors';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const room = () => { const w = new Workshop({ parts: () => [{ name: 'frame rail', at: [0, 0.1, 0], w: 0.5, h: 0.02, d: 0.02, mass: 0.4 }] }, 3); w.usePhysics(J); w.run('material steel'); return w; };
const sim = (w: Workshop) => (w as unknown as { lastSim: { joints: { name: string; t: number[]; v: number[]; end: number; min: number; max: number }[] } }).lastSim;
/** When a sampled series first crosses a level going the given way, by linear interpolation. */
const cross = (t: number[], v: number[], level: number, up: boolean, after = 0) => { for (let i = 1; i < v.length; i++) if (t[i]! > after && (up ? v[i - 1]! < level && v[i]! >= level : v[i - 1]! > level && v[i]! <= level)) return t[i - 1]! + ((level - v[i - 1]!) / (v[i]! - v[i - 1]!)) * (t[i]! - t[i - 1]!); return NaN; };

describe('hinges: where they touch, and they swing as a pendulum does', () => {
  it('a flap hinged to the rail falls from level and swings to the other side, its period that of a compound pendulum at 90°', () => {
    const w = room(); w.run('place plate named flap at 0, 0.1 m, 50 mm size 200 x 80 x 10 mm');
    expect(w.run('hinge flap to rail')).toMatch(/about x \(the long way of where they touch\), through \(0, 100, 10\) mm/);
    w.run('simulate 2 s');
    const j = sim(w).joints[0]!, deg = j.v.map((x) => (x * 180) / Math.PI);
    // from level, through hanging (90°) to level the other side (180°), and back: with no friction, all the way
    expect(Math.max(...deg)).toBeGreaterThan(175); expect(Math.max(...deg)).toBeLessThan(181);
    // T = 2π √(I / m g d) × 2K(sin 45°)/π, I about the hinge = m (L² + t²) / 12 + m d², d = L / 2
    const L = 0.08, t = 0.01, d = L / 2, I = (L * L + t * t) / 12 + d * d, T = 2 * Math.PI * Math.sqrt(I / (9.80665 * d)) * 1.18034;
    const down = cross(j.t, deg, 90, true), back = cross(j.t, deg, 90, false, down);
    expect(Math.abs(2 * (back - down) - T) / T).toBeLessThan(0.03);
    expect(w.value('flap.angle')).toBeCloseTo(j.end, 4);
  });
  it('a hinge with limits turns no further; with friction it swings less; not touching, it is not made', () => {
    const lim = room(); lim.run('place plate named flap at 0, 0.1 m, 50 mm size 200 x 80 x 10 mm'); lim.run('hinge flap to rail from 0° to 60°'); lim.run('simulate 1 s');
    expect((sim(lim).joints[0]!.max * 180) / Math.PI).toBeLessThan(61);
    const fr = room(); fr.run('place plate named flap at 0, 0.1 m, 50 mm size 200 x 80 x 10 mm'); fr.run('hinge flap to rail friction 0.3 N·m'); fr.run('simulate 2 s');
    expect((sim(fr).joints[0]!.max * 180) / Math.PI).toBeLessThan(170);
    const far = room(); far.run('place plate named flap at 0, 0.1 m, 60 mm size 200 x 80 x 10 mm');
    expect(() => far.run('hinge flap to rail')).toThrow(/do not touch \(10 mm apart\): a hinge connects only what touches/);
  });
  it('a wheel that goes into the base of the piece it would turn on is refused: a hinge lets the two pass through each other', () => {
    const w = room(); w.run('place plate named base at 2 m, 0.05 m, 0 size 400 x 400 x 100 mm'); w.run('place motor named m on base'); w.run('join m and base as stand');
    w.run('place disc named wheel right of m by 0 size 100 x 10 mm along x');
    expect(() => w.run('hinge wheel to m driven by m')).toThrow(/wheel goes into base \(in stand, with m\) by 30 mm: a hinge lets the two it holds pass through each other/);
  });
  it('moved away from what it was hinged to, the hinge holds nothing, and says so', () => {
    const w = room(); w.run('place plate named flap at 0, 0.1 m, 50 mm size 200 x 80 x 10 mm'); w.run('hinge flap to rail'); w.run('move flap to 0, 0.5 m, 50 mm');
    expect(w.run('simulate 0.5 s')).toMatch(/Not held: flap's hinge on frame rail \(they are [\d.]+ mm apart now: it connects only what touches\)/);
    expect(w.run('parts list')).toMatch(/flap hinged to frame rail \(its own x\)/);
  });
});

describe('a slide runs as F = m a says, and stops at its limit', () => {
  it('a carriage pushed along the rail goes as far as the push takes it, and no further than its limit', () => {
    const w = room(); w.run('place cube named carriage on rail size 40 x 20 x 20 mm');
    expect(w.run('slide carriage on rail along x between -300 mm and 300 mm')).toMatch(/along x \(as said\), through \(0, 110, 0\) mm/);
    const y0 = w.value('carriage.y'); w.run('push carriage with 0.2 N along x for 0.2 s');
    const j = sim(w).joints[0]!, m = 0.04 * 0.02 * 0.02 * 7850, a = 0.2 / m, at1 = 0.5 * a * 0.04 + a * 0.2 * 0.8;
    const i = j.t.findIndex((x) => x >= 1 - 1e-9); expect(Math.abs(j.v[i]! - at1) / at1).toBeLessThan(0.03);
    expect(w.value('carriage.travel')).toBeCloseTo(0.3, 3); expect(w.value('carriage.y')).toBeCloseTo(y0, 3);
  });
});

describe('a motor turns a hinge by its own torque line', () => {
  it('a wheel on the motor spins up as ω = ω_ss (1 − e^(−t/τ)), τ = J R / K_t², and its energy balances', () => {
    // the motor on a riser, so its wheel clears the base
    const w = room(); w.run('place plate named base at 2 m, 0.05 m, 0 size 400 x 400 x 100 mm'); w.run('place cube named riser on base size 60 x 60 x 40 mm'); w.run('place motor named m on riser'); w.run('join m, riser and base as stand');
    w.run('place disc named wheel right of m by 0 size 100 x 10 mm along x'); w.run('place motor named m2 at 3 m, 0.5 m, 0');
    expect(() => w.run('hinge wheel to m driven by m2 at 12 V')).toThrow(/m2 turns wheel against what holds wheel: it must be m, or joined to it/);
    expect(w.run('hinge wheel to m driven by m at 12 V')).toMatch(/about x \(wheel's own axis\).*m turns it at 12 V/);
    const said = w.run('simulate 1.5 s'), j = sim(w).joints[0]!;
    const md = motorModel(MOTORS['motor.dc.coreless.d40-150w-24v']!), R = windingR(md, 20), Jw = (0.1 * 0.1 * 0.01 * Math.PI) / 4 * 7850 * 0.1 ** 2 / 8;
    const tau = (Jw * R) / md.Kt ** 2, wss = (12 - (R * md.Tf) / md.Kt) / md.Kt, angle = (t: number) => wss * (t - tau * (1 - Math.exp(-t / tau)));
    for (const k of [15, 30, 44]) expect(Math.abs(j.v[k]! - angle(j.t[k]!)) / angle(j.t[k]!)).toBeLessThan(0.02);
    // read back, a speed is in rad/s, whatever unit it was kept in
    expect(Math.abs(w.value('m.rpm') - wss * (1 - Math.exp(-1.5 / tau))) / wss).toBeLessThan(0.01);
    // energy: from the source = into the wheel + heat in the copper + friction
    const E = (re: RegExp) => Number(re.exec(said)![1]);
    const inJ = E(/([\d.]+) J(?: \([\d.]+ Wh\))? from the source/), out = E(/([\d.]+) J into what it turns/), cu = E(/([\d.]+) J as heat in its copper/), fr = E(/([\d.]+) J to its friction/);
    expect(Math.abs(inJ - out - cu - fr) / inJ).toBeLessThan(0.005);
    expect(0.5 * Jw * (w.value('m.rpm')) ** 2).toBeGreaterThan(out * 0.97);
    expect(w.value('m.temperature')).toBeGreaterThan(20);
  });
});
