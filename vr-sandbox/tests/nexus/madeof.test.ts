// What anything is made of, and what follows from it (src/nexus/madeof.ts): checked against answers worked by hand.

import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { arrayLine, combine, massOfAll, place } from '../../src/nexus/assembly';
import { madeOf, massProperties } from '../../src/nexus/madeof';
import { DENSITY } from '../../src/nexus/mass';
import { elementsOf } from '../../src/nexus/elements';
import { runBlock, emptyBoard, placeBlock, wire, Engine } from '../../src/nexus/dataflow';
import type { Part } from '../../src/nexus/kits';

const steelBox: Part = { name: 'block', shape: { box: [0.1, 0.2, 0.3] }, mat: 'steel-low' };
const alRod: Part = { name: 'rod', shape: { cyl: [0.05, 0.4] }, mat: 'al-6061' };
const twoOf = () => combine([steelBox, alRod].map((p) => p), 'pair');
const pair = () => ({ name: 'pair', items: [place(steelBox, [0, 0, 0]), place(alRod, [1, 0, 0])] });

describe('what follows from the pieces', () => {
  it('mass, centre and inertia of a steel block and an aluminium rod a metre apart, as worked by hand', () => {
    const mb = 0.1 * 0.2 * 0.3 * DENSITY['steel-low']!, mr = Math.PI * 0.05 ** 2 * 0.4 * DENSITY['al-6061']!, M = mb + mr;
    const p = massProperties(pair());
    expect(p.mass).toBeCloseTo(M, 9); expect(p.mass).toBeCloseTo(massOfAll(pair()), 9);
    const cx = mr / M; expect(p.centre[0]).toBeCloseTo(cx, 12); expect(p.centre[1]).toBeCloseTo(0, 12);
    // about y through the centre: each piece's own, and each m d² (the block at −cx, the rod at 1 − cx)
    const Iy = (mb * (0.1 ** 2 + 0.3 ** 2)) / 12 + (mr * 0.05 ** 2) / 2 + mb * cx ** 2 + mr * (1 - cx) ** 2;
    expect(p.inertia[1]![1]).toBeCloseTo(Iy, 10);
    // about x: the rod's (3r² + h²)/12 along its length (it stands along y), the block's (h² + d²)/12; no offset along x
    const Ix = (mb * (0.2 ** 2 + 0.3 ** 2)) / 12 + (mr * (3 * 0.05 ** 2 + 0.4 ** 2)) / 12;
    expect(p.inertia[0]![0]).toBeCloseTo(Ix, 10);
    expect(p.exactShare).toBe(1);
    // the heat it takes: each piece's mass times its own grade's specific heat, all of it covered
    expect(p.heatCovered).toBeCloseTo(1, 12); expect(p.heatCapacity).toBeGreaterThan(M * 400);
  });
  it('a thing placed many times counts each place once, and a thing nested in it no more', () => {
    const row = arrayLine(pair(), 4, [0, 0, 2]), p = massProperties(row), one = massProperties(pair());
    expect(p.mass).toBeCloseTo(4 * one.mass, 9);
    expect(p.centre[2]).toBeCloseTo(3, 9);
    const m = madeOf(row); expect(m.mass).toBeCloseTo(p.mass, 9);
    expect(m.tree[1]).toMatchObject({ name: 'pair', count: 4 });
  });
});

describe('made of, all the way down', () => {
  it('by material, each said as it is known; by element; nothing unknown in a thing of specified grades', () => {
    const m = madeOf(pair());
    expect(m.materials.map((x) => x.mat)).toEqual(['steel-low', 'al-6061']);
    expect(m.materials[0]!.is).toMatch(/1018/);
    // iron from the steel (all but its carbon and manganese) and from the aluminium (6061 holds a little)
    const feAl = elementsOf('al-6061')['Fe']! / Object.values(elementsOf('al-6061')).reduce((a, x) => a + x, 0);
    const fe = m.elements.find((e) => e.element === 'Fe')!; expect(fe.mass).toBeCloseTo(m.materials[0]!.mass * (100 - 0.175 - 0.75) / 100 + m.materials[1]!.mass * feAl, 9);
    expect(m.elementsUnknown).toBe(0); expect(m.unknown).toEqual([]);
  });
  it('what is not known is said: a family only, a piece of no material, a stated mass', () => {
    const t: Part = { name: 'crate', parts: [{ name: 'boards', shape: { box: [1, 0.02, 1] }, mat: 'wood' }, { name: 'label', shape: { box: [0.1, 0.001, 0.1] } }, { name: 'contents', kg: 12 }] };
    const m = madeOf(t);
    expect(m.unknown.join(' | ')).toMatch(/no material/); expect(m.unknown.join(' | ')).toMatch(/only by their family \(wood\)/); expect(m.unknown.join(' | ')).toMatch(/stated, not worked out from a shape and a material \(contents\)/);
    expect(m.mass).toBeCloseTo(0.02 * DENSITY['wood']! + 12, 9);
    expect(massProperties(t).unplacedMass).toBe(12);
  });
});

describe('a material changed on a board, and everything that rests on it follows', () => {
  it('the block made aluminium: its mass, its make-up and its heat capacity re-run', async () => {
    const b = emptyBoard('t'), box = placeBlock(b, 'shape.box', 0, 0, { mat: 'steel-low', w: 0.1, h: 0.2, d: 0.3 }), mo = placeBlock(b, 'made.of', 0, 0, {}), mp = placeBlock(b, 'mass.properties', 0, 0, {});
    wire(b, box, 'part', mo, 'thing'); wire(b, box, 'part', mp, 'thing');
    const e = new Engine(b); await e.run();
    const steel = e.state.get(mp)!.out!.mass as number;
    b.nodes[box]!.set = { ...b.nodes[box]!.set, mat: 'al-6061' }; e.touch?.(box); await e.run();
    const al = e.state.get(mp)!.out!.mass as number;
    expect(al / steel).toBeCloseTo(DENSITY['al-6061']! / DENSITY['steel-low']!, 9);
    expect((e.state.get(mo)!.out!.materials as { material: string }[])[0]!.material).toBe('al-6061');
    void twoOf; void runBlock;
  });
});

import { alongPath } from '../../src/nexus/madeof';
import { matterOf } from '../../src/nexus/matter';

describe('along a path through it, in series', () => {
  // a 10 mm copper rod 100 mm long standing on a 10 mm aluminium rod 200 mm long, then a 20 × 20 mm steel block 50 mm tall
  const cu: Part = { name: 'cu', shape: { cyl: [0.005, 0.1] }, mat: 'copper' }, al: Part = { name: 'al', shape: { cyl: [0.005, 0.2] }, mat: 'al-6061' }, st: Part = { name: 'st', shape: { box: [0.02, 0.05, 0.02] }, mat: 'steel-low' };
  const stack = () => ({ name: 'stack', items: [place(al, [0, 0.1, 0]), place(cu, [0, 0.25, 0]), place(st, [0, 0.325, 0])] });
  const prop = (m: string, k: string) => matterOf(m).props.find((p) => p.key === k)!.value;
  it('resistance to heat and to current, stiffness and growth, as worked by hand from each material\'s own figures', () => {
    const r = alongPath(stack(), ['al', 'cu', 'st'], 'y', 50), A = Math.PI * 0.005 ** 2, As = 0.02 * 0.02;
    expect(r.thermal).toBeCloseTo(0.2 / (prop('al-6061', 'k') * A) + 0.1 / (prop('copper', 'k') * A) + 0.05 / (prop('steel-low', 'k') * As), 9);
    expect(r.electrical).toBeCloseTo(0.2 / (prop('al-6061', 'conductivity') * A) + 0.1 / (prop('copper', 'conductivity') * A) + 0.05 / (prop('steel-low', 'conductivity') * As), 15);
    expect(1 / r.stiffness!).toBeCloseTo(0.2 / (prop('al-6061', 'E') * A) + 0.1 / (prop('copper', 'E') * A) + 0.05 / (prop('steel-low', 'E') * As), 15);
    expect(r.growth).toBeCloseTo(50 * (prop('al-6061', 'alpha') * 0.2 + prop('copper', 'alpha') * 0.1 + prop('steel-low', 'alpha') * 0.05), 12);
    // each section exact: rods along the path, a block square to it
    expect(r.pieces.every((p) => p.areaExact)).toBe(true);
    // aluminium and copper grow apart: |Δα| ΔT, and held together the stiffer one's E times that
    const m = r.mismatch.find((x) => x.a === 'al' && x.b === 'cu')!;
    expect(m.strain).toBeCloseTo(Math.abs(prop('al-6061', 'alpha') - prop('copper', 'alpha')) * 50, 12);
    expect(m.stress).toBeCloseTo(Math.max(prop('al-6061', 'E'), prop('copper', 'E')) * m.strain, 3);
  });
  it('a rod lying across the path is a mean section, said; a piece not there or a property not known is said, never guessed', () => {
    const lying = { name: 'l', items: [place(cu, [0, 0, 0], [0, 0, Math.PI / 2])] };
    expect(alongPath(lying, ['cu'], 'y').pieces[0]!.areaExact).toBe(false);
    expect(alongPath(stack(), ['al', 'nope'], 'y').missing).toEqual(['nope']);
    const mystery: Part = { name: 'm', shape: { box: [0.01, 0.01, 0.01] } };
    const r = alongPath({ name: 's', items: [place(mystery, [0, 0, 0]), place(cu, [0, 0.1, 0])] }, ['m', 'cu'], 'y');
    expect(r.thermal).toBeNull(); expect(r.lacking.join(' ')).toMatch(/m \(no material\)/);
  });
  it('side by side: conductances and stiffnesses add, they grow by their stiffness-weighted mean, the first to yield sets its strength', () => {
    // a steel rod and an aluminium rod, both 200 mm, side by side and joined at both ends; then the copper rod on top
    const fe: Part = { name: 'fe', shape: { cyl: [0.005, 0.2] }, mat: 'steel-low' };
    const t = { name: 'pair', items: [place(al, [0, 0.1, 0]), place(fe, [0.02, 0.1, 0]), place(cu, [0, 0.25, 0])] };
    const r = alongPath(t, [['al', 'fe'], 'cu'], 'y', 40), A = Math.PI * 0.005 ** 2;
    const Rt = (m: string, L: number) => L / (prop(m, 'k') * A), ka = (prop('al-6061', 'E') * A) / 0.2, kf = (prop('steel-low', 'E') * A) / 0.2, kc = (prop('copper', 'E') * A) / 0.1;
    expect(r.stages).toEqual([['al', 'fe'], ['cu']]);
    expect(r.thermal).toBeCloseTo(1 / (1 / Rt('al-6061', 0.2) + 1 / Rt('steel-low', 0.2)) + Rt('copper', 0.1), 9);
    expect(r.stiffness).toBeCloseTo(1 / (1 / (ka + kf) + 1 / kc), 0);
    // Turner: bonded, they grow by (k₁ α₁ + k₂ α₂) L ΔT / (k₁ + k₂)
    expect(r.growth).toBeCloseTo(((ka * prop('al-6061', 'alpha') + kf * prop('steel-low', 'alpha')) * 0.2 * 40) / (ka + kf) + prop('copper', 'alpha') * 0.1 * 40, 12);
    // the pair stretches as one: the first to reach its own yield strain σy / E sets the force, ΣEA times that strain
    const ey = (m: string) => prop(m, 'yield') / prop(m, 'E'), pairF = Math.min(ey('al-6061'), ey('steel-low')) * (prop('al-6061', 'E') + prop('steel-low', 'E')) * A, cuF = prop('copper', 'yield') * A;
    expect(r.strength!.force).toBeCloseTo(Math.min(pairF, cuF), 3);
    // the two side by side grow apart from each other too
    expect(r.mismatch.some((m) => m.a === 'al' && m.b === 'fe')).toBe(true);
  });
  it('as a node: a material changed on the board changes what the path carries', async () => {
    const out = await runBlock('path.properties', { thing: stack(), path: 'al, cu, st', axis: 'y', dT: 0 });
    expect(out.thermal).toBeGreaterThan(0); expect(String(out.says)).toMatch(/left out: the resistance where pieces touch/);
    const swapped = { name: 'stack', items: [place({ ...al, mat: 'copper' }, [0, 0.1, 0]), place(cu, [0, 0.25, 0]), place(st, [0, 0.325, 0])] };
    expect((await runBlock('path.properties', { thing: swapped, path: 'al, cu, st', axis: 'y' })).thermal as number).toBeLessThan(out.thermal as number);
  });
});
