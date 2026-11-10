// Wave 14, kit bodies (decision 0029): the engineered sub-assemblies of src/nexus/assemblies/kit-bodies.ts. Each builds at
// its defaults and at a lighter and a heavier asking, is one group of pieces (the union of faces, as
// accept-w13-groups.test.ts counts), grows with what is asked, moves by the joints counted here, is found by plain words,
// and reports numbers that a hand formula gives again.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { searchByFunction } from '../../src/nexus/aitools';
import type { Block } from '../../src/nexus/room';
import { motionOf } from '../../src/nexus/sim';
import { DYNAMIC, SF, cylForce, legDesign, pneumaticPose, yieldOf, type LegDesign } from '../../src/nexus/assemblies/kit-bodies';

const groups = (b: Block) => { const up = b.pieces.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i]!))); for (const f of b.faces) up[top(f.a)] = top(f.b); return new Set(b.pieces.map((_, i) => top(i))).size; };
async function built(id: string, set: Record<string, unknown>): Promise<{ block: Block; report: string; figures: Record<string, unknown> }> {
  const d = LIBRARY.get(id)!, ports = d.ports as { inputs: { name: string; default?: unknown }[] };
  return (await d.run!({ ...Object.fromEntries(ports.inputs.map((p) => [p.name, p.default])), ...set }, { set: {}, time: 0 } as never)) as never;
}
const size = (b: Block) => Math.hypot(b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]);
// [seed, a lighter asking, a heavier one, joints at its defaults, the words it is found by]
const SEEDS: [string, Record<string, unknown>, Record<string, unknown>, number, string][] = [
  ['seed.leg-pneumatic', { load: 30, height: 500 }, { load: 250, height: 1400 }, 12, 'pneumatic walking leg'],
  ['seed.leg-insect', { load: 50, reach: 600 }, { load: 1500, reach: 3000 }, 13, 'spider legs'],
  ['seed.walker-pneumatic', { payload: 50, height: 500 }, { legs: '6', payload: 500, height: 1200 }, 48, 'pneumatic walking machine'],
  ['seed.walker-radial', { legs: '4', payload: 100, reach: 800, body: 700 }, { legs: '6', payload: 2000, reach: 3000, body: 2500 }, 104, 'giant robotic spider'],
];

describe('wave 14, kit bodies', () => {
  for (const [id, small, large, joints, words] of SEEDS) it(`${id}: builds small, default and large as one group, grows, moves, is found`, async () => {
    const [s, d, l] = [await built(id, small), await built(id, {}), await built(id, large)];
    for (const r of [s, d, l]) { expect(groups(r.block), `${id}: one group of pieces`).toBe(1); expect(r.report, 'a report with its mass').toMatch(/mass as drawn [\d.e+]+ kg/); }
    expect(size(s.block) < size(d.block) || id === 'seed.walker-radial', 'the lighter asking is smaller').toBe(true);
    expect(size(l.block), 'the heavier asking is larger').toBeGreaterThan(size(s.block));
    expect(motionOf(d.block).joints.length, `${id}: its joints at its defaults`).toBe(joints);
    expect(searchByFunction(words, 12).map((f) => f.id), `found by "${words}"`).toContain(id);
  }, 30_000);
  it('the pneumatic leg\'s numbers, by hand', () => {
    const height = 0.8, load = 100, bar = 6, q: LegDesign = legDesign(pneumaticPose(height), load * 9.80665 * DYNAMIC, bar * 1e5);
    // (the links from the height: L (sin 55° + sin 65°) = height; the foot load the static one times the dynamic factor)
    const L = height / (Math.sin((55 * Math.PI) / 180) + Math.sin((65 * Math.PI) / 180)), F = load * 9.80665 * 1.5;
    expect(q.L1).toBeCloseTo(L, 9); expect(q.F).toBeCloseTo(F, 6);
    // (the knee's moment: F times the knee's distance ahead of the ankle, L cos 65°; the hip's: F times the ankle's ahead of the hip, L (cos 55° − cos 65°))
    expect(q.Mk).toBeCloseTo(F * L * Math.cos((65 * Math.PI) / 180), 6);
    expect(q.Mh).toBeCloseTo(F * L * (Math.cos((55 * Math.PI) / 180) - Math.cos((65 * Math.PI) / 180)), 6);
    // (each cylinder: the moment over its lever arm, and what its bore gives on the rod side at the pressure, p π (D² − d²) / 4)
    expect(q.needK).toBeCloseTo(q.Mk / q.armK, 6); expect(q.needH).toBeCloseTo(q.Mh / q.armH, 6);
    for (const [c, need] of [[q.knee, q.needK], [q.hip, q.needH]] as const) { expect(c.gives).toBeCloseTo((bar * 1e5 * Math.PI * ((c.c.bore / 1000) ** 2 - (c.c.rod / 1000) ** 2)) / 4, 6); expect(c.gives).toBe(cylForce(c.c.bore, c.c.rod, bar * 1e5)); expect(c.gives, 'the cylinder chosen holds its moment').toBeGreaterThanOrEqual(need); }
    // (the lugs' places give spans the cylinders' own lengths: the law of cosines at each pivot)
    expect(Math.sqrt(q.d ** 2 + q.bk ** 2 - 2 * q.d * q.bk * Math.cos((235 * Math.PI) / 180))).toBeCloseTo(q.hip.len, 6);
    expect(Math.sqrt(q.m ** 2 + q.e ** 2 + 2 * q.m * q.e * Math.cos((60 * Math.PI) / 180))).toBeCloseTo(q.knee.len, 6);
    // (the link: M / Z at the pin hole, Z = t (w³ − dh³) / (6 w), under yield / SF; the pin: F / (π d² / 4) under 0.577 yield / SF)
    const dh = (q.pin.d / 1000) * 1.6, Zn = (q.link.t * (q.link.w ** 3 - dh ** 3)) / (6 * q.link.w);
    expect(q.link.sigma).toBeCloseTo(Math.max(q.Mk, q.Mh) / Zn, 3); expect(q.link.sigma).toBeLessThanOrEqual(yieldOf('steel-low') / SF);
    expect(q.pin.tau).toBeCloseTo(q.R / ((Math.PI * (q.pin.d / 1000) ** 2) / 4), 3); expect(q.pin.tau).toBeLessThanOrEqual((0.577 * yieldOf('steel-alloy')) / SF);
  }, 30_000);
});
