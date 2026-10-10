// The renderer as projection: a scene is a pure function of bound records; every number names its record; a body
// is drawn if and only if a coordinate binds it; a change in a record changes the scene's identity.

import { describe, expect, it } from 'vitest';
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, partXXV } from '../../src/nexus/substrate/beam';
import { project } from '../../src/nexus/substrate/project';
import { leaf } from '../../src/nexus/substrate/term';

describe('projection', () => {
  const slice = () => beamOnTwoSupports(partXXV('the person'), materialLeaves('wood.douglas-fir'), lumberCatalogue());
  it('projects exactly the configuration\'s bodies, every number a record\'s value', () => {
    const s = slice();
    const c = s.configuration!;
    const scene = project(c.frame, [c.bodies.beam, ...c.bodies.supports, c.bodies.load]);
    expect(scene.bodies.map((b) => b.name)).toEqual(['the beam', 'the left support', 'the right support', 'the load']);
    const records = new Map(s.journal.records().map((d) => [d.hash, d]));
    for (const b of scene.bodies) for (const p of [b.extents.x, b.extents.y, b.extents.z, b.centre.x, b.centre.y, b.centre.z]) {
      const r = records.get(p.record) ?? [c.bodies.beam, ...c.bodies.supports, c.bodies.load].flatMap((x) => [x.extents.x, x.extents.y, x.extents.z, x.centre!.x, x.centre!.y, x.centre!.z]).find((d) => d.hash === p.record);
      expect(r, `${b.name}: ${p.record}`).toBeDefined();
      expect(r!.value).toBe(p.value);
    }
    expect(scene.bodies[0]!.extents.x.value).toBeCloseTo(1.206, 12);
  });

  it('a body without a coordinate is not drawn, and a change in a record changes the scene', () => {
    const s = slice();
    const c = s.configuration!;
    const unplaced = { ...c.bodies.load, centre: undefined };
    expect(() => project(c.frame, [unplaced])).toThrow(/not placed/);
    const a = project(c.frame, [c.bodies.beam]).hash;
    const other = beamOnTwoSupports({ ...partXXV('the person'), span: leaf('span between the supports', 1.3, 'm', { class: 'given', by: 'the person' }) }, materialLeaves('wood.douglas-fir'), lumberCatalogue());
    expect(project(other.configuration!.frame, [other.configuration!.bodies.beam]).hash).not.toBe(a);
  });
});
