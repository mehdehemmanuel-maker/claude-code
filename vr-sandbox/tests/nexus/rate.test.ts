// Rates across barriers (src/nexus/rate.ts): the molecular time of a liquid's change from its viscosity, and the barrier
// over temperature, against measured water (src/data/species.ts). The scale generator of round 6 made the same time
// from the same quantities without Eyring's theory: the two are checked against each other and against the
// spectroscopic relaxation time.

import { describe, expect, it } from 'vitest';
import { WATER_DEBYE_TIME, WATER_MOLAR_MASS, WATER_VISCOSITY } from '../../src/data/species';
import { CONST } from '../../src/nexus/book/constants';
import { attemptRate, barrierFromViscosity, changeTime, fitBarrier, viscosityFrom } from '../../src/nexus/rate';
import { generate, molecularSize, timeOf } from '../../src/nexus/scale';
import { water } from './water';

const at25 = WATER_VISCOSITY.find((p) => p.T === 298.15)!;
const Vm = (rho: number) => WATER_MOLAR_MASS / rho;

describe('the rate of a change across a barrier', () => {
  it('a change is attempted at the thermal rate kT / h: six trillion times a second at 25 °C', () => {
    expect(attemptRate(298.15)).toBeCloseTo((CONST.kB.value! * 298.15) / CONST.h.value!, 0);
    expect(attemptRate(298.15)).toBeGreaterThan(6e12);
    expect(attemptRate(298.15)).toBeLessThan(6.5e12);
  });

  it('water\'s viscosity gives the time of one molecular change: η times a molecule\'s volume over kT, Planck\'s constant gone, the same time the scale generator made at the molecule\'s size, within a factor of two of the measured dielectric relaxation', () => {
    const dG = barrierFromViscosity(at25.eta, Vm(at25.rho), 298.15);
    const tau = changeTime(dG, 298.15);
    const N_A = CONST.R.value! / CONST.kB.value!;
    expect(tau).toBeCloseTo((at25.eta * Vm(at25.rho)) / (N_A * CONST.kB.value! * 298.15), 20);
    const qs = water();
    const { mechanisms, lengths } = generate(qs);
    const brownian = mechanisms.find((m) => m.factors.length === 2 && m.factors.some((f) => f.name === 'kT') && m.factors.some((f) => f.name === 'mu'))!;
    expect(timeOf(brownian, molecularSize(lengths, qs)!.value) / tau).toBeCloseTo(1, 3);
    expect(tau / WATER_DEBYE_TIME).toBeGreaterThan(0.5);
    expect(tau / WATER_DEBYE_TIME).toBeLessThan(2);
  });

  it('a barrier fitted at 25 and 50 °C underestimates the viscosity at both 0 and 100 °C: the barrier itself falls as water warms, which the local activation enthalpy shows falling across the whole series', () => {
    const pts = WATER_VISCOSITY.map((p) => ({ T: p.T, eta: p.eta, Vm: Vm(p.rho) }));
    const b = fitBarrier(pts.filter((p) => p.T === 298.15 || p.T === 323.15));
    for (const T of [273.15, 373.15]) { const p = pts.find((x) => x.T === T)!; expect(viscosityFrom(b, T, p.Vm), String(T)).toBeLessThan(p.eta); }
    const local = pts.slice(1).map((p, i) => fitBarrier([pts[i]!, p]).dH);
    for (let i = 1; i < local.length; i++) expect(local[i]!).toBeLessThan(local[i - 1]!);
    expect(local[0]! / local.at(-1)!).toBeGreaterThan(1.5);
  });
});
