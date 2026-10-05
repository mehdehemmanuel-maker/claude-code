// Bodies held up by electrons that cannot share a state (src/nexus/compact.ts): hydrostatic balance with Chandrasekhar's
// pressure of filling. What these tests hold is what the integration must reproduce, every check cited.

import { describe, expect, it } from 'vitest';
import { bodyAt, branch, chandrasekharMass, coldBody, laneEmden } from '../../src/nexus/compact';
import { levelsAt } from '../../src/nexus/depth';

const Msun = 1.98847e30, Rsun = 6.957e8; // IAU 2015 nominal solar values

describe('a body in balance against its own weight', () => {
  it('the Lane–Emden polytropes: ξ₁ and ω for n = 3/2 and n = 3 (Chandrasekhar 1939: 3.65375, 2.71406; 6.89685, 2.01824)', () => {
    expect(laneEmden(1.5).xi1).toBeCloseTo(3.65375, 4);
    expect(laneEmden(1.5).omega).toBeCloseTo(2.71406, 4);
    expect(laneEmden(3).xi1).toBeCloseTo(6.89685, 4);
    expect(laneEmden(3).omega).toBeCloseTo(2.01824, 4);
  });

  it('filling holds no more than Chandrasekhar\'s mass: 5.83/μ_e² of the Sun\'s, 1.456 for matter with two nucleons to each electron', () => {
    expect(chandrasekharMass(2) / Msun).toBeCloseTo(1.456, 2);
    expect(chandrasekharMass(1) / chandrasekharMass(2)).toBeCloseTo(4, 9);
    // the full balance with fast electrons tends to it from below
    expect(bodyAt(1000, 2).M / chandrasekharMass(2)).toBeCloseTo(1, 2);
    expect(bodyAt(1000, 2).M).toBeLessThan(chandrasekharMass(2));
  });

  it('heavier bodies are smaller: slow electrons give R ∝ M^(−1/3)', () => {
    const a = bodyAt(0.01, 2), b = bodyAt(0.02, 2);
    expect(Math.log(b.R / a.R) / Math.log(b.M / a.M)).toBeCloseTo(-1 / 3, 1);
  });

  it('at Sirius B\'s mass the balance gives about its radius (Bond et al., ApJ 840, 70, 2017: 1.018 solar masses, 0.0081 solar radii)', () => {
    let lo = 1, hi = 5;
    for (let i = 0; i < 40; i++) { const m = Math.sqrt(lo * hi); if (bodyAt(m, 2).M < 1.018 * Msun) lo = m; else hi = m; }
    expect(bodyAt(Math.sqrt(lo * hi), 2).R / (0.0081 * Rsun)).toBeCloseTo(1, 0);
  });

  it('a cold body of the settled matter is no larger than about Jupiter (IAU: 7.1492e7 m): past that, only heat holds a body up', () => {
    const settled = levelsAt(null)[0]!, rho = settled.mass / settled.size ** 3;
    const b = coldBody(1e6, 1, rho);
    expect(b.branch).toBe('matter');
    expect(b.largest / 7.1492e7).toBeGreaterThan(0.5);
    expect(b.largest / 7.1492e7).toBeLessThan(2);
    expect(coldBody(b.largest * 1.5, 1, rho).branch).toBe('none');
    // below it a size has two cold bodies: the lighter its matter bears, and a heavier one filling holds
    const below = coldBody(b.largest * 0.9, 1, rho);
    expect(below.branch).toBe('matter');
    expect(below.M!).toBeLessThan(b.largestMass);
    expect(branch(1).some((x) => x.M > b.largestMass && Math.abs(Math.log(x.R / (b.largest * 0.9))) < 0.2)).toBe(true);
  });
});
