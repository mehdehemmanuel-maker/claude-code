// Power as nodes (docs/LIFE.md, step 5; src/nexus/power/): any engine run from what it is, crank degree by crank degree;
// any powertrain on the road from its ratios, tyres, mass and drag; what it can do wired into what drives it.
import { describe, expect, it } from 'vitest';
import { AIR, FUEL, runEngine, torqueCurve, volEff, WIEBE, type EngineRun } from '../../src/nexus/power/cycle';
import { drive, pullAt, resistance, tyreRadius, POWERTRAINS, RHO } from '../../src/nexus/power/drive';
import { intakeValves } from '../../src/nexus/engines';

const m20a: EngineRun = { cyl: 4, bore: 0.0805, stroke: 0.0976, rod: 1.6 * 0.0976, cr: 13, fuel: 'petrol', valve: intakeValves({ cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al' }) };

describe('an engine run from its numbers', () => {
  it('the torque turned through its rods, degree by degree, is the work its pressure does on its pistons (∮ p dV), less its pumping', () => {
    const c = runEngine(m20a, { rpm: 3000 }), mean = c.trace.reduce((s, x) => s + x.torque, 0) / c.trace.length, Vd = Math.PI / 4 * m20a.bore ** 2 * m20a.stroke;
    // (the open strokes: drawn in at the manifold's pressure, pushed out at the air's: none at full load)
    expect(mean).toBeCloseTo((c.imep * Vd * m20a.cyl) / (4 * Math.PI), -0.5);
    expect(Math.abs(mean / ((c.imep * Vd * m20a.cyl) / (4 * Math.PI)) - 1)).toBeLessThan(0.01);
  });
  it('its efficiency stays under the ideal Otto cycle\'s at its compression, 1 − r^(1−γ); its flame half burned 8° after top centre, its peak just after', () => {
    const c = runEngine(m20a, { rpm: 3000 }), otto = 1 - 13 ** (1 - 1.3);
    expect(c.efficiency).toBeLessThan(otto); expect(c.efficiency).toBeGreaterThan(0.2);
    const half = WIEBE.start + WIEBE.span * (Math.log(2) / WIEBE.a) ** (1 / (WIEBE.m + 1)); expect(half).toBeCloseTo(8.5, 0);
    expect(c.peakAt).toBeGreaterThan(5); expect(c.peakAt).toBeLessThan(20);
  });
  it('it breathes as its valves let it: full below an inlet Mach index of 0.6, less past it; fuel by the stoichiometric mixture', () => {
    expect(volEff(m20a, 2000)).toBe(0.9); expect(volEff(m20a, 9000)).toBeLessThan(0.9);
    const c = runEngine(m20a, { rpm: 3000 }), air = (0.9 * AIR.p * Math.PI / 4 * m20a.bore ** 2 * m20a.stroke) / (AIR.R * AIR.T);
    expect(c.fuel).toBeCloseTo((air / FUEL.petrol.afr) * 4 * 3000 / 120, 9);
  });
  it('the M20A by its published numbers (80.5 × 97.6 mm, 13:1): its indicated pressure is within 5 % of the brake pressure Toyota\'s 205 N·m means; with Heywood\'s 1988 friction its brake torque is short of it, said', () => {
    const c = runEngine(m20a, { rpm: 4400 }), bmepToyota = (4 * Math.PI * 205) / (Math.PI / 4 * m20a.bore ** 2 * m20a.stroke * 4);
    expect(Math.abs(c.imep / bmepToyota - 1)).toBeLessThan(0.05); expect(c.torque).toBeLessThan(205);
    const curve = torqueCurve(m20a, 1000, 7000, 500); expect(curve.length).toBe(13); expect(Math.max(...curve.map((p) => p.power))).toBeLessThan(126e3);
  });
  it('part load: less air, less torque, more fuel a kWh (its pumping)', () => {
    const full = runEngine(m20a, { rpm: 2000 }), part = runEngine(m20a, { rpm: 2000, load: 0.4 });
    expect(part.torque).toBeLessThan(full.torque / 2); expect(part.bsfc).toBeGreaterThan(full.bsfc);
  });
});

describe('a powertrain on the road', () => {
  it('a tyre rolls on its rim\'s radius and its sidewall: 205/55R16, 203.2 + 112.75 mm', () => { expect(tyreRadius('205/55R16')).toBeCloseTo(0.31595, 5); expect(() => tyreRadius('round')).toThrow(/size code/); });
  it('its pull never more than its driven tyres grip; flat out where pull meets drag and rolling; quicker with less friction in its engine', () => {
    const curve = torqueCurve(m20a, 1000, 7000, 250).map((p) => ({ rpm: p.rpm, torque: p.torque })), pt = POWERTRAINS.corolla!, road = { mass: 1415, tyreR: tyreRadius('205/55R16'), CdA: pt.CdA };
    const tr = { curve, gearbox: pt.gearbox, final: pt.final, idle: pt.idle, redline: pt.redline };
    expect(pullAt(tr, road, 1).force).toBeLessThanOrEqual(0.6 * 0.9 * 1415 * 9.80665 + 1e-6);
    const d = drive(tr, road); expect(d.zeroTo100).toBeGreaterThan(5); expect(d.zeroTo100).toBeLessThan(15);
    expect(pullAt(tr, road, d.top).force).toBeCloseTo(resistance(road, d.top), -2);
    const quick = drive({ ...tr, curve: curve.map((p) => ({ ...p, torque: p.torque * 1.2 })) }, road); expect(quick.zeroTo100).toBeLessThan(d.zeroTo100);
    expect(0.5 * RHO * road.CdA * 30 * 30).toBeGreaterThan(200);
  });
});
