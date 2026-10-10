import { describe, expect, it } from 'vitest';
import { BSC_A2, C5425, C5425_RADIUS, MINISUB, POWERPAC, RESEARCH_PLUS, SAFE_IMAGER, T100, cabinetAir, cycleTime, gelRun, meltingPoint, pipetteError, rcf, rpmFor, spin, type CycleProgram } from '../../src/nexus/machines/lab';
import { componentOf } from '../../src/nexus/parts/components';
import { resolve } from '../../src/nexus/parts/inventory';
import { massOf } from '../../src/nexus/parts/mass';

describe('the bench instruments by their makers\' figures', () => {
  it('times a cycling program by the cycler\'s own ramp rate, and refuses a step it cannot reach', () => {
    // (a plain 30-cycle program: 95 °C to denature, 60 °C to anneal, 68 °C to extend a kilobase)
    const p: CycleProgram = { start: [{ name: 'first', c: 95, s: 30 }], cycle: [{ name: 'denature', c: 95, s: 30 }, { name: 'anneal', c: 60, s: 30 }, { name: 'extend', c: 68, s: 60 }], n: 30, end: [{ name: 'last', c: 68, s: 300 }], hold: 4 };
    const r = cycleTime(p);
    // (its holds are 30 + 30 × 120 + 300 = 3,930 s; its ramps add what the block takes to move between them)
    expect(r.holds).toBe(3930); expect(r.ramps).toBeGreaterThan(500); expect(r.s).toBe(r.ramps + r.holds);
    expect(r.refused).toEqual([]);
    expect(cycleTime({ ...p, hold: -10 }).refused[0]).toMatch(/outside the Bio-Rad T100/);
  });
  it('finds the 5425\'s own radius from its own two figures, and the speed a wanted force needs', () => {
    // (the radius that gives its 21,300 × g at its 15,060 rpm, and so its force back again)
    expect(C5425_RADIUS).toBeCloseTo(84, 0);
    expect(rcf(C5425.rpm, C5425_RADIUS)).toBeCloseTo(C5425.g, 0);
    expect(rpmFor(C5425.g, C5425_RADIUS)).toBeCloseTo(C5425.rpm, 0);
    const slow = spin(5000); expect(slow.rpm).toBeGreaterThan(6000); expect(slow.rpm).toBeLessThan(8500); expect(slow.refused).toEqual([]);
    expect(spin(50000).refused.length).toBe(2);
  });
  it('gives a gel\'s field from the volts over its tank, and refuses what its supply cannot', () => {
    const r = gelRun(100); expect(r.vPerCm).toBeCloseTo(100 / 23, 2); expect(r.mA).toBeCloseTo(66.7, 1); expect(r.refused).toEqual([]);
    expect(gelRun(400).refused[0]).toMatch(/outside the Bio-Rad PowerPac Basic/);
    // (a buffer of a tenth the resistance draws ten times the current: past its 400 mA and its 75 W)
    expect(gelRun(300, 150).refused.length).toBe(2);
  });
  it('gives a short strand\'s melting point, by Wallace under 14 bases and by the G + C rule above', () => {
    expect(meltingPoint('ACGTACGTACGT')).toBe(2 * 6 + 4 * 6);
    expect(meltingPoint('ACGTACGTACGTACGTACGT')).toBeCloseTo(64.9 + (41 * (10 - 16.4)) / 20, 6);
    expect(Number.isNaN(meltingPoint(''))).toBe(true);
  });
  it('reads a pipette\'s allowed error off its maker\'s table, and says when a volume is off it', () => {
    expect(pipetteError(1000).systematic).toBeCloseTo(6, 6); expect(pipetteError(1000).random).toBeCloseTo(2, 6);
    expect(pipetteError(100).systematic).toBeCloseTo(3, 6);
    // (between its rows, straight-line: at 300 µl, between its 3 % and its 1 %)
    const mid = pipetteError(300); expect(mid.systematic / 300 * 100).toBeGreaterThan(1); expect(mid.systematic / 300 * 100).toBeLessThan(3);
    expect(pipetteError(50).outside).toBe(true);
  });
  it('gives the air a cabinet moves at the velocities its standard asks for', () => {
    const a = cabinetAir();
    expect(a.inflow).toBeCloseTo((BSC_A2.inner[0] / 1000) * (BSC_A2.sash / 1000) * BSC_A2.inflow * 3600, 3);
    expect(a.exhaust).toBeCloseTo(a.inflow * (1 - BSC_A2.recirculated), 6);
    expect(a.downflow).toBeGreaterThan(a.inflow);
  });
  for (const [w, kg] of [['thermalcycler T100', T100.kg], ['centrifuge 5425', C5425.kg], ['geltank Mini-Sub-GT', MINISUB.kg], ['gelsupply PowerPac-Basic', POWERPAC.kg], ['transilluminator Safe-Imager-2', SAFE_IMAGER.kg], ['pipette Research-plus-1000', RESEARCH_PLUS.kg], ['biosafetycabinet Logic-plus-4ft', BSC_A2.kg]] as [string, number][]) {
    it(`draws ${w} with every part its inventory lists, weighing what its maker says`, () => {
      const it0 = resolve(w); if (!it0 || typeof it0 === 'string') throw new Error(`${w}: ${String(it0)}`);
      const c = componentOf(it0.id); expect(c, w).toBeTruthy(); expect(c!.faults, w).toEqual([]);
      expect(Math.abs(massOf(c!.part) - kg) / kg, w).toBeLessThan(0.2);
    });
  }
});
