// Holding a temperature across scale (src/nexus/substrate/hold.ts): the least conductance a body has to a still medium grows with
// its size, while what it makes grows with its mass, so a least size holds a body's temperature by its own heat. The
// production law is Kleiber's, measured on whole animals (src/data/life.ts); the media's conductivities are measured;
// the observed smallest mammals are estimates the derivation is compared with, never fed.

import { describe, expect, it } from 'vitest';
import { BODY_TEMPERATURE, KLEIBER, MEDIA_CONDUCTIVITY, SMALLEST_MAMMAL, TISSUE } from '../../src/data/life';
import { heldBy, leastMassToHold, ownTime, sphereMass } from '../../src/nexus/substrate/hold';

const dT = BODY_TEMPERATURE - 288.15;
const air = MEDIA_CONDUCTIVITY.air.k, water = MEDIA_CONDUCTIVITY.water.k;

describe('the least body that holds its temperature by its own heat', () => {
  it('by conduction alone at Kleiber\'s rate, holding 37 °C in 15 °C takes about 8 g in still air and about 15 kg in still water', () => {
    const inAir = leastMassToHold(dT, TISSUE.density, air, KLEIBER), inWater = leastMassToHold(dT, TISSUE.density, water, KLEIBER);
    expect(inAir).toBeGreaterThan(0.007);
    expect(inAir).toBeLessThan(0.009);
    expect(inWater).toBeGreaterThan(13);
    expect(inWater).toBeLessThan(16);
    // at that size the difference held is the one asked: the closed form solves the balance
    const r = Math.cbrt(inAir / ((4 / 3) * Math.PI * TISSUE.density));
    expect(heldBy(r, TISSUE.density, air, KLEIBER)).toBeCloseTo(dT, 9);
  });

  it('water raises the least size by the ratio of the media\'s conductivities to the power 3 / (3b − 1): 2.4 for Kleiber\'s three quarters', () => {
    const ratio = leastMassToHold(dT, TISSUE.density, water, KLEIBER) / leastMassToHold(dT, TISSUE.density, air, KLEIBER);
    expect(ratio).toBeCloseTo((water / air) ** (3 / (3 * KLEIBER.b - 1)), 6);
  });

  it('against the smallest mammals: the sea\'s smallest over the land\'s is within an order of magnitude of that ratio; and the smallest on land is below even the conduction-only size, so it must make heat faster than Kleiber\'s line', () => {
    const predicted = leastMassToHold(dT, TISSUE.density, water, KLEIBER) / leastMassToHold(dT, TISSUE.density, air, KLEIBER);
    const observed = SMALLEST_MAMMAL.sea.M / SMALLEST_MAMMAL.land.M;
    expect(observed / predicted).toBeGreaterThan(0.1);
    expect(observed / predicted).toBeLessThan(10);
    expect(SMALLEST_MAMMAL.land.M).toBeLessThan(leastMassToHold(dT, TISSUE.density, air, KLEIBER));
  });
});

describe('a body\'s own time', () => {
  it('a cell ten micrometres across forgets any difference with the water around it in a fraction of a millisecond: on any longer window it is at its surroundings\' temperature', () => {
    expect(ownTime(10e-6, 1000, 4180, water)).toBeLessThan(1e-3);
  });

  it('a body\'s own time grows as its size squared: a body ten times larger forgets a hundred times more slowly', () => {
    expect(ownTime(0.1, 1000, 3500, air) / ownTime(0.01, 1000, 3500, air)).toBeCloseTo(100, 9);
    expect(sphereMass(0.1, 1000) / sphereMass(0.01, 1000)).toBeCloseTo(1000, 9);
  });
});
