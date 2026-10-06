// Motors run in time from their makers' sheets (src/engineering/motorrun.ts), and the workshop's motor and run calls.
// No load, the maxon RE 40 comes to its published no-load speed and current; its speed rises with its mechanical
// time constant J R / K²; what it draws is what it gives out, heats and spins; past its rating its winding passes its
// limit, and water through a jacket round it, laminar at this flow, keeps it inside.

import { describe, expect, it } from 'vitest';
import { MOTORS } from '../../src/data/motors';
import { LIQUIDS, jacketOf, runMotor } from '../../src/engineering/motorrun';
import { Workshop } from '../../src/nexus/generate';

const re40 = MOTORS['motor.dc.coreless.d40-150w-24v']!;
const near = (a: number, b: number, rel = 1e-3) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(rel);

describe('a motor run in time', () => {
  it('no load: its sheet\'s no-load speed and current, reached in its mechanical time constant', () => {
    const r = runMotor(re40, { V: 24, load: 0, seconds: 1 });
    near(r.end.rpm, 7580, 2e-3); near(r.end.current, 0.137, 1e-3);
    const tau = (142e-7 * 0.299) / (0.0302 * 0.0302); expect(r.rise).toBeGreaterThan(0.8 * tau); expect(r.rise).toBeLessThan(1.2 * tau);
  });
  it('what it draws is what it gives out, heats, loses to friction and keeps in its spin', () => {
    const r = runMotor(re40, { V: 24, load: 0.1, seconds: 30 }), e = r.energy;
    near(e.in, e.out + e.copper + e.friction + e.spin, 1e-3); near(r.end.current, (0.1 + 0.0302 * 0.137) / 0.0302, 1e-6);
  });
  it('past its rating its winding passes its limit; water through a jacket keeps it inside', () => {
    const hot = runMotor(re40, { V: 24, load: 0.3, seconds: 600 });
    expect(hot.overheated).not.toBeNull(); expect(hot.end.winding).toBeGreaterThan(155);
    const cool = runMotor(re40, { V: 24, load: 0.3, seconds: 600, coolant: { liquid: LIQUIDS.water!, flow: 2 / 60000, tIn: 20 } });
    expect(cool.overheated).toBeNull(); expect(cool.jacket!.regime).toBe('laminar');
    // the heat the water carries is what leaves it warmer: q = m c_p ΔT
    near(cool.jacket!.carried, 997 * (2 / 60000) * 4179 * (cool.jacket!.out - 20), 1e-9);
  });
  it('the jacket: Reynolds number from the gap, laminar Nusselt 4.86 below 2300, Gnielinski above 3000', () => {
    const lam = jacketOf(0.04, 0.071, { liquid: LIQUIDS.water!, flow: 2 / 60000, tIn: 20 });
    const v = (2 / 60000) / (Math.PI * 0.042 * 0.002); near(lam.Re, (997 * v * 0.004) / 855e-6, 1e-9); expect(lam.Nu).toBe(4.86);
    const turb = jacketOf(0.04, 0.071, { liquid: LIQUIDS.water!, flow: 20 / 60000, tIn: 20 }); expect(turb.regime).toBe('turbulent'); expect(turb.Nu).toBeGreaterThan(30);
  });
});

describe('motors in the workshop', () => {
  it('a motor placed is its datasheet; run, what it came to is read by conditions', () => {
    const w = new Workshop({ parts: () => [] }); expect(w.run('place motor named m at 0, 0.5 m, 0')).toMatch(/Coreless brushed DC motor, Ø40 mm, 150 W/);
    near(w.value('m.mass'), 0.48, 1e-9); near(w.value('m.D'), 0.04, 1e-9);
    expect(w.run('run m at 24 V for 10 s against 0.1 N·m')).toMatch(/it came to 72\d\d rpm .* within its 155 °C limit/);
    expect(w.holds('m.rpm over 7000 rpm and m.temp under 30')).toBe(true);
    expect(w.run('run m at 24 V for 10 min against 0.3 N·m')).toMatch(/its winding passed its 155 °C limit at 3\d\d s, and a real one would burn there/);
    expect(w.run('if m.temp > 120 then run m at 24 V for 10 min against 0.3 N·m cooled by water at 2 L/min')).toMatch(/Cooled by water at 2 L\/min from 20 °C: it flows laminar/);
    expect(w.holds('m.temp under 155')).toBe(true);
    expect(() => w.run('place cube named k size 10 mm') && w.run('run k')).toThrow(/k is not a motor/);
  });
});
