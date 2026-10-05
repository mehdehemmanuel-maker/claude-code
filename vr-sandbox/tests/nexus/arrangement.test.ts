// How an arrangement carries a load (src/nexus/network.ts, src/nexus/frame.ts). Whether bars carry a load by stretching
// is counted by linear algebra; how stiffness grows with the solid is measured on frames of members that bend. Nothing
// here is a material or a structure: lattices, wood and a house's walls are tests of one counting, at micrometres and
// at metres. Wood's measured stiffness is evidence the counting is checked against, never fitted to.

import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../src/data/materials';
import { ALONG_FROM_BENDING, CELL_WALL_DENSITY, CELL_WALL_MODULUS_ALONG, ELASTIC_RATIOS } from '../../src/data/wood';
import { asNetwork, effectiveModulus, hexagonal, solidFraction, square, triangular, type Lattice } from '../../src/nexus/frame';
import { generate } from '../../src/nexus/manifold';
import { carries, count, loadOn } from '../../src/nexus/network';
import { house } from './inventions';

const lattices: Lattice[] = [triangular(6, 6), square(6, 6), square(6, 6, 1, 1), hexagonal(5, 5)];
const stretching = (lat: Lattice) => { const { net, top } = asNetwork(lat); return carries(net, loadOn(net, (i, d) => (top.includes(i) && d === 1 ? 1 : 0))); };
const slope = (lat: Lattice, t1: number, t2: number) => Math.log(effectiveModulus(lat, t2) / effectiveModulus(lat, t1)) / Math.log(solidFraction(lat, t2) / solidFraction(lat, t1));
/** The least-squares slope and intercept of ln y on ln x. */
const fit = (pts: [number, number][]) => {
  const xs = pts.map(([x]) => Math.log(x)), ys = pts.map(([, y]) => Math.log(y)), mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const n = xs.reduce((s, x, i) => s + (x - mx) * (ys[i]! - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { n, c: Math.exp(my - n * mx) };
};

describe('whether an arrangement carries a load by stretching is counted, not named', () => {
  it('triangles leave no mechanism; squares have mechanisms but carry a load along their bars; squares turned 45° and hexagons cannot carry it by stretching', () => {
    const [tri, sq, sq45, hex] = lattices.map((l) => ({ c: count(asNetwork(l).net), s: stretching(l) }));
    expect(tri!.c.mechanisms).toBe(0);
    expect(tri!.s).toBe(true);
    expect(sq!.c.mechanisms).toBeGreaterThan(0);
    expect(sq!.s).toBe(true);
    expect(sq45!.s).toBe(false);
    expect(hex!.s).toBe(false);
  });

  it('the stiffness grows with the solid as the count says: in proportion where the bars carry the load, as its cube where the members must bend', () => {
    for (const lat of lattices) expect(slope(lat, 0.01, 0.02)).toBeCloseTo(stretching(lat) ? 1 : 3, 1);
  });

  it('thick walls move a bending arrangement toward stretching: the hexagons\' exponent falls as the solid fills', () => {
    const hex = lattices[3]!;
    const local = [[0.01, 0.02], [0.05, 0.1], [0.1, 0.2], [0.2, 0.3]].map(([a, b]) => slope(hex, a!, b!));
    for (let i = 1; i < local.length; i++) expect(local[i]!).toBeLessThan(local[i - 1]!);
    expect(local[3]!).toBeLessThan(2.8);
  });

  it('a stiffness of the arrangement exists only many cells across: two cells across differ by a quarter from three, six from eight by under one percent', () => {
    const E = (n: number) => effectiveModulus(hexagonal(n, n), 0.05) / solidFraction(hexagonal(n, n), 0.05) ** 3;
    expect(Math.abs(E(3) / E(2) - 1)).toBeGreaterThan(0.25);
    expect(Math.abs(E(8) / E(6) - 1)).toBeLessThan(0.01);
  });
});

describe('wood, as a test of the counting: one solid, two arrangements at once', () => {
  const kept = MATERIALS.filter((m) => m.category === 'wood');
  const phi = (m: (typeof kept)[number]) => (m.specificGravity! * 1000) / CELL_WALL_DENSITY.value;
  const EL = (m: (typeof kept)[number]) => m.E * ALONG_FROM_BENDING.value;
  const listed = kept.filter((m) => ELASTIC_RATIOS[m.id]);

  it('along the grain the walls run with the load, so the bars carry it: across the seven kept woods the stiffness goes as the solid\'s share to a power near one, and the wall\'s stiffness it implies is near the wall\'s own, measured apart', () => {
    expect(kept.length).toBe(7);
    const f = fit(kept.map((m) => [phi(m), EL(m)]));
    expect(f.n).toBeGreaterThan(0.8);
    expect(f.n).toBeLessThan(1.1);
    expect(Math.abs(fit(kept.map((m) => [phi(m), EL(m) / phi(m)])).c / CELL_WALL_MODULUS_ALONG.value - 1)).toBeLessThan(0.15);
  });

  it('across the grain the walls must bend: the measured exponents lie well above one and below what uniform hexagons give at the same densities, so a second level of arrangement is missing', () => {
    const nT = fit(listed.map((m) => [phi(m), EL(m) * ELASTIC_RATIOS[m.id]!.ET])).n;
    const nR = fit(listed.map((m) => [phi(m), EL(m) * ELASTIC_RATIOS[m.id]!.ER])).n;
    const lo = Math.min(...listed.map(phi)), hi = Math.max(...listed.map(phi));
    // the hexagons' exponent over the same range of the solid's share, from walls thin enough to thick enough
    const hex = hexagonal(5, 5), tOf = (p: number) => p * 0.01 / solidFraction(hex, 0.01);
    const nHex = slope(hex, tOf(lo), tOf(hi));
    for (const n of [nT, nR]) { expect(n).toBeGreaterThan(1.5); expect(n).toBeLessThan(nHex - 0.5); }
  });

  it('so no one ratio of across to along holds for wood: the measured ratio spans more than five times, and grows with the solid\'s share as the two exponents part', () => {
    const r = listed.map((m) => ELASTIC_RATIOS[m.id]!.ET);
    expect(Math.max(...r) / Math.min(...r)).toBeGreaterThan(5);
    const nL = fit(listed.map((m) => [phi(m), EL(m)])).n, nT = fit(listed.map((m) => [phi(m), EL(m) * ELASTIC_RATIOS[m.id]!.ET])).n;
    expect(fit(listed.map((m) => [phi(m), ELASTIC_RATIOS[m.id]!.ET])).n).toBeCloseTo(nT - nL, 6);
    expect(nT - nL).toBeGreaterThan(0.8);
  });
});

describe('the house\'s walls, as a test of the same counting at metres', () => {
  const s = generate(house());
  const br = s.elements.find((e) => e.id === 'bracing:inside:side')!;
  const val = (name: string) => br.values.find((v) => v.name.startsWith(name))!.value;

  it('the generated sides are a mechanism under the wind\'s force across: two sways, one for each tier the blocking makes; two bars across leave none', () => {
    expect(val('mechanisms of each side the force meets')).toBe(2);
    expect(val('least bars across it that leave none')).toBe(2);
    expect(val('largest force in a bar, braced')).toBeGreaterThan(val('force across each side carries'));
  });

  it('bending cannot stand in for the bars: were every joint to hold its turning, the top would drift more than a tenth of its height', () => {
    const height = s.elements.find((e) => e.id === 'members:inside:side')!.values.find((v) => v.name === 'span')!.value;
    expect(val('drift of its top')).toBeGreaterThan(height / 10);
  });
});
