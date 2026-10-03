// Joining the way a maker would: the process that works for the two materials, sized to the stock, and parts that
// stay joined. Two faults this guards: a weld on wood (no fusion) broke the moment it was made, and a 40 mm screw
// through a 100 mm block never reached the second piece, so the joint fell apart under its own weight.

import { describe, expect, it } from 'vitest';
import { ConstructionRefused } from '../../src/ganglia/tree/gate';
import { at, rig } from './helpers';
import { axisAngle } from '../../src/doc/math';
import { getMaterial, MATERIALS, type Material } from '../../src/data/materials';
import { AUTO_JOIN, planJoin, type JoinGeometry } from '../../src/connectors/plan';
import { getConnectorKind } from '../../src/connectors/registry';
import { isStockScrew, SCREW_DIAMETERS, WOOD_SCREWS } from '../../src/engineering/fasteners';
import { numberOf, stringOf } from '../../src/schema/params';

const derived = (kind: string, params: Record<string, unknown>, a: Material, b: Material | null, g: JoinGeometry) =>
  getConnectorKind(kind).derive({ params: params as never, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: b ? g.thicknessB : g.thicknessA, distance: 0, cure: 1e12 });

const GEOMETRIES: Record<string, JoinGeometry> = {
  'two 100 mm blocks': { thicknessA: 0.1, thicknessB: 0.1, bondW: 0.1, bondL: 0.1 },
  '6 mm plates': { thicknessA: 0.006, thicknessB: 0.006, bondW: 0.1, bondL: 0.1 },
  '1 mm sheet tabs': { thicknessA: 0.001, thicknessB: 0.001, bondW: 0.03, bondL: 0.03 },
  'a 2x4 end on a post': { thicknessA: 0.1, thicknessB: 0.038, bondW: 0.089, bondL: 0.038 },
};

const fir = getMaterial('wood.douglas-fir');
const steel = getMaterial('steel.a36');
const cube = GEOMETRIES['two 100 mm blocks']!;

describe('Best join', () => {
  it('holds every pair of materials, and every material to the floor, at every size', () => {
    const bad: string[] = [];
    for (const [name, g] of Object.entries(GEOMETRIES)) {
      for (const a of MATERIALS) {
        for (const b of [...MATERIALS, null]) {
          const plan = planJoin(AUTO_JOIN, a, b, g);
          const d = derived(plan.kind, plan.params, a, b, g);
          const c = d.capacities;
          if (d.instantFailure || !(c.tension > 0 && c.shear > 0 && c.bending > 0 && c.torsion > 0)) bad.push(`${name}: ${a.id} + ${b?.id ?? 'floor'} -> ${plan.kind}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('picks the trade\'s process for the pair', () => {
    const kind = (a: string, b: string, g = cube) => planJoin(AUTO_JOIN, getMaterial(a), getMaterial(b), g);
    expect(kind('wood.douglas-fir', 'wood.douglas-fir').kind).toBe('screwed');
    expect(kind('steel.a36', 'steel.a36').params['filler']).toBe('E70');
    expect(kind('aluminum.6061-t6', 'aluminum.6061-t6').params['filler']).toBe('ER4043');
    expect(kind('stainless.304', 'steel.a36').params['filler']).toBe('ER309L');
    expect(kind('aluminum.6061-t6', 'steel.a36', GEOMETRIES['1 mm sheet tabs']).kind).toBe('riveted');
    expect(kind('aluminum.6061-t6', 'steel.a36').kind).not.toBe('weld');
    expect(kind('polymer.hdpe', 'wood.douglas-fir').kind).toBe('bolted'); // nothing sticks to polyethylene
    expect(kind('leather.veg-tan', 'wood.douglas-fir').params['adhesive']).toBe('pu-construction');
    expect(kind('stone.slate', 'wood.douglas-fir').params['adhesive']).toBe('epoxy-structural');
  });

  it('sizes a screw from the sizes sold: well into the second piece (6 diameters, when a stocked length gives that), never through it', () => {
    for (const g of Object.values(GEOMETRIES)) {
      const plan = planJoin('screwed', fir, fir, g);
      if (plan.kind !== 'screwed') continue;
      const d = numberOf(plan.params, 'diameter'), L = numberOf(plan.params, 'length');
      expect(isStockScrew(d, L), `${d} x ${L}`).toBe(true);
      const pen = L - g.thicknessA;
      expect(pen).toBeGreaterThan(0);
      expect(pen).toBeLessThan(g.thicknessB);
      // full bite whenever some stocked screw of a size up to this one gives it without coming through
      const least = Math.min(6 * d, 0.9 * g.thicknessB);
      const could = SCREW_DIAMETERS.filter((D) => D <= d * 1000 + 1e-6).some((D) => WOOD_SCREWS[String(D)]!.some((x) => x / 1000 - g.thicknessA >= least && x / 1000 - g.thicknessA <= 0.95 * g.thicknessB));
      if (could) expect(pen).toBeGreaterThanOrEqual(least - 1e-9);
    }
  });

  it('a weld asked of wood is made the way wood is joined, and says why', () => {
    const plan = planJoin('weld', fir, fir, cube);
    expect(plan.kind).toBe('screwed');
    expect(plan.substituted).toBe("Wood can't be welded.");
    const mixed = planJoin('weld', getMaterial('aluminum.6061-t6'), steel, cube);
    expect(mixed.kind).not.toBe('weld');
    expect(mixed.substituted).toBe("Aluminium can't be welded to steel.");
  });

  it('keeps a process that can hold, with the filler that matches the metal', () => {
    const plan = planJoin('weld', getMaterial('aluminum.6061-t6'), getMaterial('aluminum.5052-h32'), GEOMETRIES['6 mm plates']);
    expect(plan.kind).toBe('weld');
    expect(plan.substituted).toBeUndefined();
    expect(stringOf(plan.params, 'filler')).toMatch(/^ER(4043|5356)$/);
    expect(derived('weld', plan.params, getMaterial('aluminum.6061-t6'), getMaterial('aluminum.5052-h32'), GEOMETRIES['6 mm plates']).warnings).toEqual([]);
  });
});

describe('joined parts stay joined', () => {
  // a 600 mm arm cantilevered off the side of a fixed 100 mm post: the joint carries the arm's weight as shear and
  // its moment as bending, the way a shelf bracket or a table rail does
  const toX = axisAngle([0, 0, 1], -Math.PI / 2); // joint y (the face normal) along +x
  const cantilever = async (arm: { kind: string; material: string; params: Record<string, number | string> }, post: string, join: (g: JoinGeometry) => { kind: string; params: Record<string, unknown> }, g: JoinGeometry) => {
    const r = await rig({}, false);
    const p = r.part('block', at(0, 1, 0), { frozen: true, material: post, params: { x: 0.1, y: 0.1, z: 0.1 } });
    const b = r.part(arm.kind, at(0.35, 1, 0), { material: arm.material, params: { ...arm.params, length: 0.6 } });
    const j = join(g);
    let c;
    try { c = r.connect(j.kind, { part: p, frame: at(0.05, 0, 0, toX) }, { part: b, frame: at(-0.3, 0, 0, toX) }, j.params as never); } catch (e) { r.done(); throw e; }
    r.run(3);
    const status = r.world.connectionStatus(c.id);
    const droop = 1 - r.pos(b)[1];
    r.done();
    return { status, droop };
  };
  const beam = { kind: 'lumber', material: 'wood.douglas-fir', params: { size: '2x4' } };
  const beamOnPost = GEOMETRIES['a 2x4 end on a post']!;

  it('a 2x4 arm screwed to a post by Best join holds, without sagging', async () => {
    const res = await cantilever(beam, 'wood.douglas-fir', (g) => planJoin(AUTO_JOIN, fir, fir, g), beamOnPost);
    expect(res.status).toBe('intact');
    expect(Math.abs(res.droop)).toBeLessThan(0.003);
  });

  it('the same arm "welded" is screwed instead, and holds', async () => {
    const res = await cantilever(beam, 'wood.douglas-fir', (g) => planJoin('weld', fir, fir, g), beamOnPost);
    expect(res.status).toBe('intact');
  });

  it('a 40 mm screw through a 100 mm post never reaches the arm: that joint is not made (K-9)', async () => {
    let no: ConstructionRefused | null = null;
    try { await cantilever(beam, 'wood.douglas-fir', () => ({ kind: 'screwed', params: { bondW: 0.089, bondL: 0.038 } }), beamOnPost); } catch (e) { if (e instanceof ConstructionRefused) no = e; else throw e; }
    expect(no?.refusal.law).toBe('K-9');
    expect(no?.refusal.reason).toMatch(/A 40 mm screw can't reach through 100 mm/);
  });

  it('a steel plate welded to a steel post holds', async () => {
    const plate = { kind: 'plate', material: 'steel.a36', params: { width: 0.1, thickness: 0.006 } };
    const g = { thicknessA: 0.1, thicknessB: 0.006, bondW: 0.1, bondL: 0.006 };
    const res = await cantilever(plate, 'steel.a36', (gg) => planJoin('weld', steel, steel, gg), g);
    expect(res.status).toBe('intact');
    expect(Math.abs(res.droop)).toBeLessThan(0.003);
  });
});
