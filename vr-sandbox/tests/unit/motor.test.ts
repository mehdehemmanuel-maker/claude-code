// The motor and battery models tuned against what their makers publish: each derived figure must land on the
// datasheet's own, to the datasheet's precision.

import { describe, expect, it } from 'vitest';
import { getMotor, GEARHEADS } from '../../src/data/motors';
import { getBattery } from '../../src/data/batteries';
import { heatStep, motorModel, shaftTorque, throughGear, windingR } from '../../src/engineering/dcmotor';
import { blockCapacity, cellOCV, drain, endPerCell, flat, packOCV, packR, type Pack } from '../../src/engineering/battery';

const rpm = (w: number) => (w * 60) / (2 * Math.PI);
const near = (x: number, y: number, rel: number) => expect(Math.abs(x - y) / Math.abs(y)).toBeLessThan(rel);

describe('DC motors, as their datasheets give them', () => {
  it('maxon RE 40 (148867): its constants reproduce its own no-load speed and stall current', () => {
    const m = motorModel(getMotor('motor.dc.coreless.d40-150w-24v'));
    near(rpm(m.noLoadSpeed), 7580, 0.005);
    near(m.stallCurrent, 80.2, 0.005);
    near(m.stallTorque, 2.42, 0.005);
    // its speed constant is the inverse of its torque constant: 317 rpm/V on the sheet
    near(rpm(1 / m.Kt), 317, 0.005);
    expect(m.thermal.estimated).toBe(false);
    // the whole motor's heat capacity, from its own time constant, is what 480 g of copper (385 J/kg K), steel (460)
    // and magnet holds, a little less for its plastic and air
    expect(m.thermal.Ch / 0.48).toBeGreaterThan(300);
    expect(m.thermal.Ch / 0.48).toBeLessThan(470);
  });

  it('Unite MY1016: constants derived from its rated point predict its separately published stall torque', () => {
    const m = motorModel(getMotor('motor.dc.brushed.d100-250w-24v'));
    near(m.stallTorque, 6.82, 0.1);
    // and its rated point again: 13.7 A at 2750 rpm gives 250 W out
    const w = (2750 * 2 * Math.PI) / 60;
    near(shaftTorque(m, 13.7, w) * w, 250, 0.001);
    expect(m.thermal.estimated).toBe(true);
  });

  it('copper heats: its resistance rises 0.393 %/K, and a steady loss settles at P (Rwh + Rha) above the air', () => {
    const m = motorModel(getMotor('motor.dc.coreless.d40-150w-24v'));
    near(windingR(m, 125) / windingR(m, 25), 1.393, 1e-9);
    let s = { winding: 20, housing: 20 };
    for (let t = 0; t < 20000; t++) s = heatStep(m.thermal, s, 10, 0, 1, 20);
    near(s.winding - 20, 10 * (1.93 + 4.65), 0.001);
    near(s.housing - 20, 10 * 4.65, 0.001);
    // the winding reaches 63% of its own rise over the housing in about its time constant (42.8 s)
    s = { winding: 20, housing: 20 };
    for (let t = 0; t < 428; t++) s = heatStep(m.thermal, s, 10, 0, 0.1, 20);
    expect(s.winding - s.housing).toBeGreaterThan(0.55 * 10 * 1.93);
  });

  it('a gearhead multiplies torque by its ratio less its losses, and its losses always go against the power', () => {
    const g = GEARHEADS['gearhead.planetary.d42-12to1']!;
    expect(throughGear(0.1, 100, g)).toBeCloseTo(0.1 * 12 * 0.81, 12);
    // driven backwards through it (the output turning the motor), the motor sees less than ratio x torque
    expect(Math.abs(throughGear(-0.1, 100, g))).toBeGreaterThan(0.1 * 12);
  });
});

describe('batteries, as their makers rate them', () => {
  const np7 = getBattery('battery.sla.12v-7ah');
  it('gives the capacity its maker tables at each rate, and lasts that long', () => {
    for (const c of np7.capacity) {
      near(blockCapacity(np7, c.Ah / c.hours), c.Ah, 1e-9);
      expect(endPerCell(np7, c.Ah / c.hours)).toBeCloseTo(c.endPerCell, 9);
      // drawn at that current from charged, it goes flat in that many hours
      const pack: Pack = { data: np7, series: 1, parallel: 1 };
      let soc = 1, t = 0;
      const I = c.Ah / c.hours;
      while (soc > 0 && t < 30 * 3600) { soc = drain(pack, soc, I, 60); t += 60; }
      near(t / 3600, c.hours, 0.02);
    }
  });

  it('two in series are 24 V nominal, sag by twice the resistance, and are flat at the end voltage', () => {
    const pack: Pack = { data: np7, series: 2, parallel: 1 };
    near(packOCV(pack, 1), 2 * 6 * 2.15, 1e-9);
    near(packOCV(pack, 0), 2 * 6 * 1.95, 1e-9);
    expect(packR(pack)).toBeCloseTo(0.046, 9);
    expect(cellOCV(0.5)).toBeCloseTo(2.05, 9);
    expect(flat(pack, 1, 10)).toBe(false);
    expect(flat(pack, 0.02, 200)).toBe(true);
  });
});
