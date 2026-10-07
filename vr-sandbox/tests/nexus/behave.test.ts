// What parts do, by their laws, against the standards' and textbooks' own numbers.

import { describe, expect, it } from 'vitest';
import { behave, e12Up, given, type Behaviour } from '../../src/nexus/behave';
import { resolve } from '../../src/nexus/inventory';
import { FAMILIES, callFamily } from '../../src/nexus/families';

const b = (w: string, at = ''): Behaviour => { const i = resolve(w); if (!i || typeof i === 'string') throw new Error(String(i)); const r = behave(i, at, FAMILIES, callFamily); if (typeof r === 'string') throw new Error(r); return r; };
describe('what a part does', () => {
  it('bolts: the stress area and proof load of ISO 898-1 (M8 12.9: 36.6 mm², 35.5 kN; M20 8.8: 245 mm², 147 kN)', () => {
    expect(b('screw M8x30').values.stress_area_mm2).toBeCloseTo(36.6, 1); expect(b('screw M8x30').values.proof_kN).toBeCloseTo(35.5, 1);
    expect(b('bolt M20x80').values.proof_kN).toBeCloseTo(147, 0); expect(b('bolt M8x30', 'load 10kN').lines.join(' ')).toMatch(/factor of 2\.\d+ to spare/);
  });
  it('springs, gears, belts and lead screws by their laws', () => {
    const s = b('spring d1 D10 L30 n8', 'at 5mm'); expect(s.values.rate_N_mm).toBeCloseTo(1.24, 2); expect(s.values.force_N).toBeCloseTo(6.2, 1);
    expect(b('spring d1 D10 L30 n8', '100N').values.deflection_mm).toBeCloseTo(20, 1);
    const g = b('gear m1 z20', 'with z40 at 1500rpm 200W'); expect(g.values).toMatchObject({ ratio: 2 }); expect(g.values.torque_Nm).toBeCloseTo(1.273, 2);
    expect(b('pulley 20t 5mm').values.steps_per_mm).toBe(80);
    expect(b('leadscrew T8 p2 s4 300').lines.join(' ')).toMatch(/back-drive/); expect(b('leadscrew T8 p2 s1 400').lines.join(' ')).toMatch(/holds a load/);
  });
  it('electrics: a wire\'s resistance as the AWG tables give it (22 AWG: 52.96 mΩ/m), Ohm\'s law, an LED\'s resistor', () => {
    expect(b('wire 22AWG 1m').values.ohm_per_m * 1000).toBeCloseTo(52.96, 1);
    expect(b('resistor 220R', 'at 12V').lines[0]).toMatch(/past its 0\.25 W/);
    expect(b('led red 5mm', 'at 5V').values.resistor_ohm).toBe(150); expect(e12Up(450)).toBe(470);
    expect(b('dcmotor 540 12V', 'kv 1500 0.5ohm').values.rpm0).toBe(18000);
    expect(b('capacitor 1000uF 16V', 'with 10k').values.tau_s).toBeCloseTo(10, 6);
  });
  it('structures, magnets, heat and fluid', () => {
    expect(b('rod 8mm 300 steel', 'load 100N').values.deflection_mm).toBeCloseTo(1.399, 2);
    expect(b('ibeam IPE160 3m', 'load 20kN').values.deflection_mm).toBeCloseTo(3.85, 1);
    expect(b('magnet 10x3 N52').values.field_mT).toBeCloseTo(372, -1);
    expect(b('thermistor 100k B3950', 'at 25C').values.ohm).toBeCloseTo(100000, -1);
    expect(b('pipe 1/2in 1m', '10bar').values.hoop_MPa).toBeCloseTo(3.84, 1);
  });
  it('numbers read from words, in SI', () => {
    expect(given('at 5mm 2A 12V load 2kN span 3m 1000rpm with z40 10k 3000mAh 10bar kv 1500')).toMatchObject({ length: 0.005, current: 2, voltage: 12, force: 2000, span: 3, rpm: 1000, teeth: 40, resistance: 10000, capacity: 3, pressure: 1e6, kv: 1500 });
  });
});
