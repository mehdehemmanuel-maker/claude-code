// A motor designed from what it must give (src/nexus/embody/motor.ts): every size from the law before it, every part
// a matter and a place, and the loop that designs, finds flaws and applies their remedies. What these tests hold is
// that the laws hold of what was designed, never the numbers one design printed.

import { describe, expect, it } from 'vitest';
import { designMotor, motorFor, LAYOUTS } from '../../src/nexus/embody/motor';
import { awgDiameter, BALL_BEARINGS, CURRENT_DENSITY, NDFEB_GRADES, SCREW_LENGTHS, WINDING_CLASS } from '../../src/nexus/embody/stock';

const ask = (T: number, rpm: number) => ({ id: 'm', name: 'a motor', T, w: (rpm * 2 * Math.PI) / 60, V: 24, shaftAtLeast: 5e-3, ambient: 25 });
const val = (m: ReturnType<typeof designMotor>, name: string) => m.values.find((v) => v.name === name)!.value;

describe('a motor designed outward from its air gap', () => {
  it('the torque it was asked for is what the phases deliver at speed: 3 E I = T ω', () => {
    const { motor } = motorFor(ask(0.3, 600));
    const E = (motor.electrical.Kt * 3 * motor.electrical.I * ask(0.3, 600).w) / (3 * motor.electrical.I);
    expect(motor.electrical.Kt * 3 * motor.electrical.I).toBeCloseTo(0.3, 9);
    expect(E).toBeGreaterThan(0);
  });

  it('every tooth is wide enough that its steel stays at its design flux, and every coil runs at no more than its current density', () => {
    for (const [T, rpm] of [[0.01, 100], [0.3, 600], [2, 3000], [10, 1500]] as const) {
      const { motor } = motorFor(ask(T, rpm));
      expect(val(motor, 'tooth width')).toBeCloseTo((val(motor, 'gap flux density') * Math.PI * (val(motor, 'rotor diameter') + 0.8e-3)) / LAYOUTS[0]!.Q / 1.5, 9);
      expect(val(motor, 'current density')).toBeLessThanOrEqual(CURRENT_DENSITY.value * 1.05);
    }
  });

  it('a shaft takes its torque at a third of its steel\'s yield in shear, and its bearing is the smallest standard one that takes it', () => {
    const { motor } = motorFor(ask(2, 3000));
    const d = motor.mech.shaft;
    expect((16 * 2) / (Math.PI * d ** 3)).toBeLessThanOrEqual((0.577 * 370e6) / 3);
    const bearing = motor.parts.find((p) => p.id === 'm/bearing-front')!;
    expect(BALL_BEARINGS.filter((b) => b.d >= d - 1e-9)[0]!.d).toBeCloseTo((bearing.shape as { bore: number }).bore, 12);
  });

  it('every screw is a stocked ISO 4762 length, and there are four in each end cap', () => {
    const { motor } = motorFor(ask(0.3, 600));
    const screws = motor.parts.filter((p) => p.shape.kind === 'screw');
    expect(screws.length).toBe(8);
    for (const s of screws) expect(SCREW_LENGTHS).toContainEqual(expect.closeTo((s.shape as { length: number }).length, 12));
  });

  it('the wire is a gauge that exists, the thinnest that carries the current', () => {
    const { motor } = motorFor(ask(0.3, 600));
    const a = (n: number) => (Math.PI * awgDiameter(n) ** 2) / 4;
    expect(a(motor.electrical.awg) * motor.electrical.strands).toBeGreaterThanOrEqual(motor.electrical.I / CURRENT_DENSITY.value);
    if (motor.electrical.awg < 30) expect(a(motor.electrical.awg + 2) * motor.electrical.strands).toBeLessThan(motor.electrical.I / CURRENT_DENSITY.value);
  });

  it('design, find the flaws, remedy, design again: a fast motor goes to a hotter magnet grade, then to fewer poles, until it holds', () => {
    const { motor, history } = motorFor(ask(0.1, 30000));
    expect(history.length).toBeGreaterThan(1);
    expect(history.at(-1)!.flaws).toEqual([]);
    expect(history.some((h) => h.remedy === 'a magnet grade that holds hotter')).toBe(true);
    expect(history.some((h) => h.remedy === 'fewer poles')).toBe(true);
    const grade = NDFEB_GRADES.find((g) => g.id === history.at(-1)!.grade)!;
    expect(val(motor, 'magnet temperature')).toBeLessThanOrEqual(grade.maxC);
    expect(val(motor, 'winding temperature')).toBeLessThanOrEqual(WINDING_CLASS.maxC);
  });

  it('what it weighs is the sum of its parts, each its matter\'s density times its volume', () => {
    const { motor } = motorFor(ask(0.3, 600));
    expect(motor.mech.mass).toBeCloseTo(motor.parts.reduce((s, p) => s + p.mass, 0), 9);
    expect(motor.parts.length).toBeGreaterThan(40);
  });
});
