// Part XX, environment: the same intent on a flat field, a sloped field and a field with a hole produces
// configurations differing only in the coupling solutions. The ground is a field over x and z; the supports are
// posts cut to their own ground; everything that does not rest on the ground field is identical by hash.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, partXXV, type Slice } from '../../src/nexus/substrate/beam';
import { ofLeaf } from '../../src/nexus/lang/evaluate';
import { flatGround, groundField, type Ground, type Frame } from '../../src/nexus/substrate/field';
import { add, and, ge, le, leaf, mul, sub } from '../../src/nexus/lang/term';
import { cites, leavesUnder } from '../../src/nexus/substrate/why';

const by = 'the person';
const given = (name: string, v: number, unit: string) => leaf(name, v, unit, { class: 'given', by });

const grounds: Record<string, (frame: Frame, who: string) => Ground> = {
  flat: (frame, who) => flatGround(frame, who, 'a level floor'),
  slope: (frame, who) => groundField(frame, who, 'a slope rising along x', (x, _z, y0) => add(y0, mul(given('grade of the slope', 0.1, '1'), x))),
  hole: (frame, who) => groundField(frame, who, 'a hole under the right support', (x, _z, y0) => sub(y0, mul(given('depth of the hole', 0.15, 'm'), and(ge(x, given('hole from', 0.5, 'm')), le(x, given('hole to', 0.7, 'm')))))),
};

const runs = new Map<string, Slice>();
async function run(name: string): Promise<Slice> {
  if (!runs.has(name)) runs.set(name, beamOnTwoSupports(partXXV(by), materialLeaves('wood.douglas-fir'), lumberCatalogue(), await jolt(), grounds[name]!));
  return runs.get(name)!;
}

describe('the same intent on three fields', () => {
  it('the design does not rest on the ground: the pick and every bound value are identical by hash', async () => {
    const [flat, slope, hole] = await Promise.all([run('flat'), run('slope'), run('hole')]);
    for (const s of [flat, slope, hole]) expect(s.choice.pick!.option.label).toBe('2x4 flat');
    const hashes = (s: Slice) => Object.fromEntries(Object.entries(s.choice.pick!.solution.bound).map(([k, d]) => [k, d.hash]));
    expect(hashes(slope)).toEqual(hashes(flat));
    expect(hashes(hole)).toEqual(hashes(flat));
  }, 120000);

  it('the posts are cut to their own ground: the coupling solutions differ, the beam and the load do not', async () => {
    const [flat, slope, hole] = await Promise.all([run('flat'), run('slope'), run('hole')]);
    const left = (s: Slice) => s.configuration!.bodies.supports[0], right = (s: Slice) => s.configuration!.bodies.supports[1];
    expect(left(flat).extents.y.value).toBeCloseTo(0.5, 12);
    expect(left(slope).extents.y.value).toBeCloseTo(0.5 + 0.06, 12);
    expect(right(slope).extents.y.value).toBeCloseTo(0.5 - 0.06, 12);
    expect(left(hole).extents.y.value).toBeCloseTo(0.5, 12);
    expect(right(hole).extents.y.value).toBeCloseTo(0.65, 12);
    expect(right(hole).centre!.y.value).toBeCloseTo(-0.15 + 0.65 / 2, 12);
    // the beam and the load sit where the intent put them on every field; their heights are coupling solutions
    // through the posts, so by hash they rest on the field even where the value is the same
    for (const s of [slope, hole]) {
      expect(s.configuration!.bodies.beam.centre!.y.value).toBeCloseTo(flat.configuration!.bodies.beam.centre!.y.value!, 12);
      expect(s.configuration!.bodies.load.centre!.y.value).toBeCloseTo(flat.configuration!.bodies.load.centre!.y.value!, 12);
      expect(s.configuration!.bodies.beam.centre!.y.hash).not.toBe(flat.configuration!.bodies.beam.centre!.y.hash);
      for (const d of [s.configuration!.bodies.beam.centre!.y, s.configuration!.bodies.load.centre!.y, left(s).extents.y, right(s).extents.y]) expect(cites(d, s.configuration!.ground.field.hash)).toBe(true);
      expect(cites(s.configuration!.bodies.beam.extents.y, s.configuration!.ground.field.hash)).toBe(false);
    }
  }, 120000);

  it('what differs between the fields is exactly what rests on the ground field, or what the kernel measured', async () => {
    const [flat, slope] = await Promise.all([run('flat'), run('slope')]);
    const flatHashes = new Set(flat.journal.records().map((d) => d.hash));
    const differing = slope.journal.records().filter((d) => !flatHashes.has(d.hash));
    expect(differing.length).toBeGreaterThan(0);
    for (const d of differing) {
      const onGround = cites(d, slope.configuration!.ground.field.hash);
      const measured = leavesUnder(d).some((l) => l.origin.class === 'measured' && l.origin.source?.includes('rigid-body kernel'));
      expect(onGround || measured, `${d.name} differs but rests on neither the ground nor a measurement`).toBe(true);
    }
  }, 120000);

  it('all three stand in the kernel, in place, with the moments within the contract', async () => {
    for (const name of ['flat', 'slope', 'hole']) {
      const s = await run(name);
      expect(s.realization!.inPlace.value, name).toBe(1);
      for (const c of s.comparisons.filter((c) => c.name.startsWith('moment'))) expect(c.verdict.kind, `${name} ${c.name}`).toBe('within');
    }
  }, 120000);

  it('the ground is a field: a query off the hole and in it differ, each citing the field', async () => {
    const hole = await run('hole');
    const g = hole.configuration!.ground;
    const at = (x: number) => g.height(ofLeaf(given('x', x, 'm')), ofLeaf(given('z', 0, 'm')));
    expect(at(0.4).value).toBe(0);
    expect(at(0.6).value).toBeCloseTo(-0.15, 12);
    expect(cites(at(0.6), g.field.hash)).toBe(true);
  }, 120000);
});
