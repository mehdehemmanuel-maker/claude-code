// The one hierarchy: a part, its quantities, the laws that give them, and time at the root.
//
// A part decomposes into sub-parts down to a material; a quantity decomposes into the quantities its law needs down
// to a measurement. They are the same shape and they meet at time. `know` is the one resolver over that tree, and
// nothing in it computes until it is asked for.
//
// These tests check three things that are easy to claim and easy to get wrong: that the numbers are RIGHT (checked
// by hand, not against the code's own output), that a quantity reached two ways which disagree is REFUSED rather
// than silently resolved, and that an unreachable quantity says so instead of inventing an answer.
import { describe, expect, it } from 'vitest';
import { clashes, know, onTimesTree } from '../../src/nexus/substrate/derive';
import { breakdown } from '../../src/nexus/substrate/record';
import { inTime } from '../../src/nexus/substrate/time';
import { dimOf } from '../../src/nexus/lang/dimension';
import { INVENTORY } from '../../src/nexus/parts/inventory';

describe('asking the hierarchy', () => {
  it('a part of one material has that material’s density, with no masses needed anywhere', () => {
    // The fault this fixes, by cause: `densityShares` weighted a part's constituents BY MASS IN GRAMS, and a
    // material has no grams — so the weights came out NaN and a brass gear reported no density at all while brass
    // sat in the table at 8500 kg/m^3. One constituent needs no weighting: its density IS the thing's density.
    expect(INVENTORY.get('gear-small')!.of.map((c) => c.id)).toEqual(['brass']);
    const d = know('gear-small', 'density');
    expect(d, 'a brass gear has a density').toBeTruthy();
    expect(d!.value).toBeCloseTo(8500, 0);
    expect(d!.how).toContain('mixing law');
  });

  it('mass is DERIVED through a law from density and size, and the number is right by hand', () => {
    // 10 x 10 x 3 mm = 3.0e-7 m^3; brass at 8500 kg/m^3; so 2.55 g. Nothing states this mass: it is computed.
    expect(INVENTORY.get('gear-small')!.size).toEqual([10, 10, 3]);
    const m = know('gear-small', 'mass');
    expect(m, 'mass is reachable without being stated').toBeTruthy();
    expect(m!.unit).toBe('kg');
    expect(m!.value).toBeCloseTo(0.00255, 6);
    expect(m!.how, 'it came out of a law, not out of the inventory').toMatch(/mass\./);
    // and the tree under it reaches the material fact it rests on
    expect(breakdown(m!.d).join('\n')).toMatch(/brass|8500/);
  });

  it('each extent binds to its OWN axis', () => {
    // `extent y` and `extent z` both used to fall through to the first extent, so a 10x10x3 gear was costed as
    // 10x10x10 and its mass came out 8.5 g instead of 2.55 g — wrong by 3.3x, and it looked like a working answer.
    const h = know('gear-small', 'height'), w = know('gear-small', 'breadth'), x = know('gear-small', 'extent x');
    expect(h!.value).toBeCloseTo(0.003, 9);
    expect(w!.value).toBeCloseTo(0.010, 9);
    expect(x!.value).toBeCloseTo(0.010, 9);
  });

  it('every answer sits somewhere on time’s tree, and the power is the reduction of its own unit', () => {
    for (const [thing, q] of [['gear-small', 'density'], ['gear-small', 'mass'], ['gear-small', 'volume']] as const) {
      const f = know(thing, q)!;
      expect(f.power).toBe(inTime(dimOf(f.unit)));
      const path = onTimesTree(f);
      expect(path[0]).toBe('time');
      expect(path[1]).toBe(`time^${f.power}`);
      expect(path[path.length - 1]).toBe(q);
    }
    // density is kg/m^3 = -1 -(-3) ... in time: -kg + m + s - A - K = -1 + -3 = -4
    expect(know('gear-small', 'density')!.power).toBe(-4);
    expect(know('gear-small', 'volume')!.power).toBe(3);
  });

  it('nothing is computed until it is asked for, and asking twice costs nothing', () => {
    const a = know('gear-plastic', 'density'), b = know('gear-plastic', 'density');
    expect(a).toBe(b);                                     // the same object: memoised, not recomputed
    expect(a!.value).toBeCloseTo(1410, 0);                 // pom
  });

  it('an unreachable quantity says so rather than inventing one', () => {
    // bearing-625 is five sub-parts of four different materials with no masses given, so its density genuinely
    // cannot be mixed: guessing the shares would be guessing the answer.
    expect(know('bearing-625', 'density'), 'four materials, no shares: unknown is the honest answer').toBeNull();
    expect(know('gear-small', 'entropy of the universe')).toBeNull();
  });

  it('a quantity that would need itself is refused, not recursed into', () => {
    // mass needs density needs mass, by one route or another. The guard must make that terminate.
    expect(() => know('gear-small', 'mass')).not.toThrow();
    expect(() => know('bearing-625', 'mass')).not.toThrow();
  });
});

describe('a quantity reached two ways must agree', () => {
  it('reports both routes and both numbers where they do not, instead of taking the first', () => {
    know('gear-small', 'volume'); know('gear-small', 'height'); know('gear-small', 'mass');
    const found = clashes();
    expect(found.length, 'the sample data really does over-determine some quantities').toBeGreaterThan(0);
    for (const c of found) {
      expect(c.routes.length, 'a clash names at least two routes').toBeGreaterThan(1);
      expect(c.spread, 'and they really do differ').toBeGreaterThan(0.02);
      expect(c.says).toContain('Physics does not allow that');
      for (const r of c.routes) expect(c.says).toContain(r.how);
    }
  });

  it('the box volume is marked an upper bound, which is why it clashes with a fitted volume', () => {
    const v = know('gear-small', 'volume')!;
    expect(v.how, 'a bounding box is not a volume and the route says so').toMatch(/UPPER BOUND/);
    const c = clashes().find((x) => x.thing === 'gear-small' && x.quantity === 'volume');
    expect(c, 'so it disagrees with the ellipsoid fit, and that is reported').toBeTruthy();
    expect(c!.routes.some((r) => /ellipsoid/.test(r.how))).toBe(true);
  });
});
