import { describe, expect, it } from 'vitest';
import { centreDistance, gearDims, lewisY, meshEfficiency, meshes, speedRatio, toothStress, toothTorque } from '../../src/engineering/gears';
import { getMaterial } from '../../src/data/materials';

const pinion = { module: 0.002, teeth: 20, width: 0.02 };
const wheel = { module: 0.002, teeth: 60, width: 0.02 };

describe('spur gears', () => {
  it('have their ISO 53 proportions and mesh only at their centre distance, with the same module', () => {
    expect(gearDims(pinion).pitch).toBeCloseTo(0.04, 12);
    expect(gearDims(pinion).outside).toBeCloseTo(0.044, 12);
    expect(centreDistance(pinion, wheel)).toBeCloseTo(0.08, 12);
    expect(meshes(pinion, wheel, 0.08, 0.02)).toBe(true);
    expect(meshes(pinion, wheel, 0.083, 0.02)).toBe(false);
    expect(meshes(pinion, { ...wheel, module: 0.0025 }, 0.08, 0.02)).toBe(false);
    expect(speedRatio(pinion, wheel)).toBeCloseTo(-1 / 3, 12);
  });

  it('size their teeth by Lewis: stress, and the torque that breaks one', () => {
    expect(lewisY(20)).toBeCloseTo(0.322, 12);
    expect(lewisY(23)).toBeCloseTo(0.334, 3);
    // Shigley example 14-1 style: 2 mm module, 20 mm face, 20 teeth, 1 kN at the pitch line, at rest
    expect(toothStress(pinion, 1000) / 1e6).toBeCloseTo(1000 / (0.02 * 0.002 * 0.322) / 1e6, 9);
    const steel = getMaterial('steel.1018-cd'), pom = getMaterial('polymer.pom');
    // cold-drawn steel yields at about five times acetal
    expect(toothTorque(pinion, steel) / toothTorque(pinion, pom)).toBeGreaterThan(4);
    // faster pitch lines carry less (Barth)
    expect(toothTorque(pinion, steel, 10)).toBeLessThan(toothTorque(pinion, steel, 0));
  });

  it('lose a percent or two to friction with oil, more dry', () => {
    expect(meshEfficiency(pinion, wheel, 0.05)).toBeGreaterThan(0.98);
    expect(meshEfficiency(pinion, wheel, 0.05)).toBeLessThan(0.995);
    expect(meshEfficiency(pinion, wheel, 0.3)).toBeLessThan(meshEfficiency(pinion, wheel, 0.05));
  });
});
