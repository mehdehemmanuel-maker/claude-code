// MIG welding as a process: hand-worked values from the published formulas and rules the model states.

import { describe, expect, it } from 'vitest';
import {
  WIRES, arcHeatInput, beadSize, fusion, migCurrent, optimalVoltage, strengthAt, suggestedSettings, t85, weldGroup, weldTemperature,
} from '../../src/engineering/welding';

const within = (actual: number, expected: number, rel: number) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(rel);

const w09 = WIRES['ER70S-6-0.9']!;

describe('MIG settings', () => {
  it('current follows the wire feed (Miller: 0.035 in wire ~1.6 in/min per amp)', () => {
    within(migCurrent(w09, 6), (6 * 39.37) / 1.6, 1e-9); // 147.6 A
    expect(optimalVoltage(150)).toBeCloseTo(21.5, 9);
  });

  it('bead size is the deposited wire volume per metre of travel', () => {
    // 0.9 mm wire at 6 m/min, 93% deposited, 6 mm/s travel: 9.86 mm^2, a 4.44 mm fillet leg
    const b = beadSize(w09, 6, 0.006);
    within(b.area, ((6 / 60) * (Math.PI / 4) * 0.0009 ** 2 * 0.93) / 0.006, 1e-9);
    within(b.leg, 4.441e-3, 1e-3);
    // twice as fast, half the metal: the leg shrinks by root 2
    within(beadSize(w09, 6, 0.012).leg, b.leg / Math.SQRT2, 1e-9);
  });

  it('heat input is eta V I / v', () => {
    within(arcHeatInput(20, 150, 0.006), (0.8 * 20 * 150) / 0.006, 1e-12); // 0.4 kJ/mm
  });

  it('suggested settings: about 1 A per 0.001 in of steel, and a fillet the size of the plate', () => {
    const s = suggestedSettings(w09, 0.003);
    within(s.amps, 0.003 / 0.0000254, 1e-9); // 118 A
    within(beadSize(w09, s.wfs, s.travel).leg, 0.003, 1e-6);
  });
});

describe('fusion', () => {
  const base = { Q: 400e3, thickness: 0.003, volts: 20, amps: 150, ctwd: 0.012, shielding: 1 };
  it('the right heat for the plate, voltage, torch distance and gas make a sound bead', () => {
    const f = fusion(base);
    expect(f.q).toBe(1);
    expect(f.coldLap || f.burnThrough || f.porosity || f.noArc).toBe(false);
  });
  it('too fast is too cold: lack of fusion', () => {
    const f = fusion({ ...base, Q: 120e3 }); // 0.12 kJ/mm on 3 mm plate, the band starts at 0.3
    expect(f.q).toBeCloseTo(0.4, 9);
    expect(f.coldLap).toBe(true);
  });
  it('far too hot on thin sheet burns through', () => {
    const f = fusion({ ...base, thickness: 0.001, Q: 800e3 });
    expect(f.burnThrough).toBe(true);
    expect(f.q).toBeCloseTo(0.3, 9);
  });
  it('too far from the work the arc will not strike; no gas gives a porous bead', () => {
    expect(fusion({ ...base, ctwd: 0.035 }).noArc).toBe(true);
    expect(fusion({ ...base, ctwd: 0.035 }).q).toBe(0);
    const g = fusion({ ...base, shielding: 0 });
    expect(g.porosity).toBe(true);
    expect(g.q).toBeLessThanOrEqual(0.2);
  });
  it('voltage well off the current stubs or spatters', () => {
    expect(fusion({ ...base, volts: 15 }).q).toBeLessThan(1);
    expect(fusion({ ...base, volts: 28 }).q).toBeLessThan(1);
  });
});

describe('cooling (EN 1011-2)', () => {
  it('thick plate: T - T0 = (6700 - 5 T0) Q F3 / t, and t8/5 matches the standard', () => {
    // 30 mm steel, 1 kJ/mm (thicker than the 14.7 mm transition), fillet F3 = 0.67
    within(weldTemperature('steel', 1e6, 0.03, 10) - 20, (6600 * 0.67) / 10, 1e-9); // 462 deg C at 10 s
    within(t85('steel', 1e6, 0.03), 6600 * 1 * (1 / 480 - 1 / 780) * 0.67, 1e-4); // 3.54 s
  });
  it('thin plate: the 2-D formula', () => {
    // 3 mm steel, 0.4 kJ/mm (transition 9.3 mm): t8/5 = 4214e5 (Q/d)^2 (1/480^2 - 1/780^2) F2
    within(t85('steel', 0.4e6, 0.003), 4214e5 * (0.4 / 3) ** 2 * (1 / 480 ** 2 - 1 / 780 ** 2) * 0.56, 1e-4); // 11.3 s
    within(weldTemperature('steel', 0.4e6, 0.003, 10) - 20, Math.sqrt((4214e5 * (0.4 / 3) ** 2 * 0.56) / 10), 1e-9); // 648 deg C
  });
  it('starts at the solidus and cools', () => {
    expect(weldTemperature('steel', 0.4e6, 0.003, 0.001)).toBe(1480);
    expect(weldTemperature('steel', 0.4e6, 0.003, 600)).toBeLessThan(120);
    // aluminium conducts heat away faster: it is below 200 deg C sooner (t8/5 is a steel measure; Al melts at 582)
    const timeTo = (cls: 'steel' | 'aluminum', T: number) => {
      let lo = 1e-3, hi = 1e5;
      for (let i = 0; i < 80; i++) { const m = Math.sqrt(lo * hi); if (weldTemperature(cls, 0.4e6, 0.003, m) > T) lo = m; else hi = m; }
      return lo;
    };
    expect(timeTo('aluminum', 200)).toBeLessThan(timeTo('steel', 200) / 2);
  });
});

describe('strength at temperature (EN 1993-1-2, EN 1999-1-2)', () => {
  it('interpolates the published reduction factors', () => {
    expect(strengthAt('steel', 20)).toBe(1);
    expect(strengthAt('steel', 400)).toBe(1);
    within(strengthAt('steel', 550), (0.78 + 0.47) / 2, 1e-12);
    within(strengthAt('stainless', 650), (0.49 + 0.4) / 2, 1e-12);
    within(strengthAt('aluminum', 225), (0.79 + 0.55) / 2, 1e-12);
    expect(strengthAt('steel', 1300)).toBe(0);
  });
});

describe('weld group (weld as an area)', () => {
  const f = 1e8;
  it('a single straight fillet: area L t, and next to nothing against bending about its own line', () => {
    const t = 0.003, L = 0.1;
    const g = weldGroup([{ a: [-L / 2, 0], b: [L / 2, 0], throat: t, f }]);
    within(g.area, L * t, 1e-12);
    within(g.Izz, (t * L ** 3) / 12, 1e-9);
    within(g.Ixx, (L * t ** 3) / 12, 1e-9);
    within(g.capacities.tension, f * L * t, 1e-9);
    within(g.capacities.shear, f * L * t, 1e-9);
    // about the line, the throat itself is the lever: M = f t^2 L / 6 at the throat edge
    within(g.capacities.bending, (f * L * t * t) / 6, 0.02);
  });
  it('a square all round matches Blodgett: S_w = b d + d^2 / 3 per unit throat', () => {
    const b = 0.1, t = 0.002;
    const sq = (x0: number, z0: number, x1: number, z1: number) => ({ a: [x0, z0] as [number, number], b: [x1, z1] as [number, number], throat: t, f });
    const h = b / 2;
    const g = weldGroup([sq(-h, -h, h, -h), sq(h, -h, h, h), sq(h, h, -h, h), sq(-h, h, -h, -h)]);
    // bending about x: stress M z / Ixx at z = h (throat edge adds t/2)
    const Sw = (b * b + (b * b) / 3) * t;
    within(g.Ixx, Sw * h, 0.03);
    const mOnly = g.check({ axial: 0, vx: 0, vz: 0, mx: 1000, mz: 0, torsion: 0 });
    within(mOnly.u, (1000 / (g.Ixx / (h + t / 2))) / f, 1e-9);
    expect(mOnly.mode).toBe('bending');
    // polar moment of the outline J = (b + d)^3 / 6 per unit throat
    within(g.J, ((2 * b) ** 3 / 6) * t, 0.03);
  });
  it('the weakest bead governs: a cold lap at the extreme fibre halves the bending capacity', () => {
    const t = 0.003;
    const good = weldGroup([{ a: [-0.05, 0.05], b: [0.05, 0.05], throat: t, f }, { a: [-0.05, -0.05], b: [0.05, -0.05], throat: t, f }]);
    const lap = weldGroup([{ a: [-0.05, 0.05], b: [0.05, 0.05], throat: t, f: f / 2 }, { a: [-0.05, -0.05], b: [0.05, -0.05], throat: t, f }]);
    within(lap.capacities.bending, good.capacities.bending / 2, 1e-6);
  });
});
