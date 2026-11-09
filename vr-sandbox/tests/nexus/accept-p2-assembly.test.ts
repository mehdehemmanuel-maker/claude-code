// Acceptance test 2 (plan/AUDIT.md 5.2, package P2: true faces and bearings): a shaft, two UCP204 pillow blocks, a gear
// and a plate assembled by the room's operations only (no place written by hand); the shaft on one revolute; both blocks
// bolted; no face whose surfaces are farther apart than the gap its fit left.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { boundOf, over, partOfBlock, type Block } from '../../src/nexus/room';
import { edgeRadius } from '../../src/nexus/finish';
import { motionOf } from '../../src/nexus/sim';
import { trianglesOf } from '../../src/nexus/make/rules';
import { leastDistance } from '../../src/nexus/make/critic';
import { boltedJoint } from '../../src/nexus/common';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
type N = [string, string, Record<string, unknown>]; type W = [string, string, string, string];
async function board(nodes: N[], wires: W[]) {
  const b = emptyBoard('accept 2'); for (const [id, blk, set] of nodes) placeBlock(b, blk, 0, 0, set, id); for (const [a, pa, c, pc] of wires) wire(b, a, pa, c, pc);
  const e = new Engine(b, env, new Memo()); await e.run(); return e;
}
const piece = async (id: string, set: Record<string, unknown>) => (await LIBRARY.get(id)!.run!({}, { set: { ...defaultsOf(LIBRARY.get(id)!), ...set } } as never) as { block: Block }).block;
/** Every face of a block against the least distance between its two pieces' drawn meshes: the faces farther apart than
 *  the gap they carry. The drawing departs from the solid in two ways only, each allowed for by its own figure: a
 *  tessellated round face lies inside its circle, so coaxial round faces are never drawn farther apart than their radii;
 *  and every edge is drawn broken by its material's radius (finish.ts edgeRadius, its thinnest side's third at most), so a
 *  face beside an edge (a bolt's head on a cast foot) may be drawn that much apart. 1 µm is float slack only. */
function falseFaces(b: Block): string[] {
  const tris = trianglesOf(partOfBlock(b)), byName = new Map<string, (typeof tris)[number][]>();
  for (const t of tris) byName.set(t.name, [...(byName.get(t.name) ?? []), t]);
  const meshOf = (k: number) => { const name = b.pieces[k]!.name, same = b.pieces.filter((p, i) => p.name === name && i <= k).length; return byName.get(name)?.[same - 1]; };
  const out: string[] = [];
  for (const f of b.faces) { const A = meshOf(f.a), B = meshOf(f.b); if (!A || !B) continue; const d = leastDistance(A, B);
    const broken = Math.max(...[f.a, f.b].map((k) => { const [lo, hi] = boundOf(b.pieces[k]!); return edgeRadius(b.pieces[k]!.mat, Math.min(...[0, 1, 2].map((i) => hi[i]! - lo[i]!))); }));
    if (d && d.d > f.gap + broken + 1e-6) out.push(`${b.pieces[f.a]!.name} / ${b.pieces[f.b]!.name}: ${f.kind} by "${f.by}", gap ${(f.gap * 1e6).toFixed(1)} µm, drawn ${(d.d * 1e3).toFixed(3)} mm apart (edges broken ${(broken * 1e3).toFixed(2)} mm)`); }
  return out;
}

// (the frame first: two UCP204 blocks onto the plate at its two ends, then the shaft through both inserts on the slide
// fit, the gear over it between them on the tight fit, then each block bolted at both feet, one bolt to each hole)
const NODES: N[] = [
  ['plate', 'piece.plate', { name: 'mounting plate', mat: 'steel-low', w: 200, t: 10, d: 300, holes: '', hole: 0 }],
  ['pb1', 'piece.pillowblock', { size: 'UCP204' }], ['pb2', 'piece.pillowblock', { size: 'UCP204' }],
  ['on1', 'room.onto', { face: '+y', fit: 'touch', end: 'mid,lo' }], ['on2', 'room.onto', { face: '+y', fit: 'touch', end: 'mid,hi' }],
  ['sh', 'piece.shaft', { size: '20', length: 300 }], ['gear', 'piece.gear', { module: '2', teeth: 30, width: 20, bore: 20 }],
  ['g', 'room.over', { line: 'Ø20 shaft/axis', where: 'mid', fit: 'tight' }],
  ['th', 'room.through', { line: 'UCP204 insert/axis', which: 0, from: 'below', fit: 'slide' }],
  ['bA0', 'mate.bolted', { line: 'UCP204 foot A/holes', which: 0, size: 'M10', head: 'hex' }], ['bA1', 'mate.bolted', { line: 'UCP204 foot A/holes', which: 1, size: 'M10', head: 'hex' }],
  ['bB0', 'mate.bolted', { line: 'UCP204 foot B/holes', which: 0, size: 'M10', head: 'hex' }], ['bB1', 'mate.bolted', { line: 'UCP204 foot B/holes', which: 1, size: 'M10', head: 'hex' }],
];
const WIRES: W[] = [['plate', 'block', 'on1', 'host'], ['pb1', 'block', 'on1', 'child'], ['on1', 'block', 'on2', 'host'], ['pb2', 'block', 'on2', 'child'],
  ['on2', 'block', 'th', 'host'], ['sh', 'block', 'th', 'passer'], ['th', 'block', 'g', 'host'], ['gear', 'block', 'g', 'sleeve'],
  ['g', 'block', 'bA0', 'held'], ['bA0', 'block', 'bA1', 'held'], ['bA1', 'block', 'bB0', 'held'], ['bB0', 'block', 'bB1', 'held']];

describe('acceptance 2: true faces and bearings (P2)', () => {
  it('acceptance 2', async () => {
    const e = await board(NODES, WIRES);
    const bad = [...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.status} ${s.error ?? ''}`);
    expect(bad).toEqual([]);
    const b = e.state.get('bB1')!.out!.block as Block;
    // (the shaft's body: on exactly one joint, a revolute about its own line, to the body holding both housings and the plate)
    const m = motionOf(b), shaftK = b.pieces.findIndex((p) => p.name === 'Ø20 shaft'), body = m.bodies.findIndex((x) => x.pieces.includes(shaftK));
    const mine = m.joints.filter((j) => j.a === body || j.b === body);
    console.log(`  motionOf: ${m.says}\n  the shaft's joints: ${mine.map((j) => `${m.bodies[j.a]!.name} / ${m.bodies[j.b]!.name} turns ${j.turns} slide ${j.slide ?? false} by ${j.by.join('; ')}`).join(' | ')}`);
    expect(mine.length).toBe(1);
    const j = mine[0]!, other = m.bodies[j.a === body ? j.b : j.a]!;
    expect(j.turns).toBe(true);
    expect(other.pieces.filter((i) => /UCP204 housing/.test(b.pieces[i]!.name)).length).toBe(2);
    expect(other.pieces.some((i) => b.pieces[i]!.name === 'mounting plate')).toBe(true);
    expect(m.bodies[body]!.pieces.some((i) => /spur gear/.test(b.pieces[i]!.name))).toBe(true);
    // (the faces the shaft bears on: the two inserts, the slide fit's gap, each written as turning; none on a housing)
    const onShaft = b.faces.filter((f) => f.a === shaftK || f.b === shaftK).map((f) => ({ f, other: b.pieces[f.a === shaftK ? f.b : f.a]!.name }));
    expect(onShaft.filter((x) => /insert/.test(x.other)).map((x) => [x.f.kind, x.f.fit, x.f.joint])).toEqual([['gap', 'slide', 'turns'], ['gap', 'slide', 'turns']]);
    expect(onShaft.filter((x) => /housing/.test(x.other))).toEqual([]);
    // (both blocks bolted: a bolt's shank in each of the four feet's holes, each hole one bolt)
    const feet = b.pieces.map((p, i) => ({ p, i })).filter(({ p }) => /UCP204 foot/.test(p.name));
    expect(feet.length).toBe(4);
    const shanks = feet.map(({ i }) => b.faces.filter((f) => (f.a === i || f.b === i) && /M10 shank/.test(b.pieces[f.a === i ? f.b : f.a]!.name) && / in the hole of | through /.test(f.by)).map((f) => b.pieces[f.a === i ? f.b : f.a]!.name));
    console.log(`  shanks in the feet: ${shanks.map((s) => s.join(',')).join(' | ')}`);
    expect(shanks.map((s) => new Set(s).size)).toEqual([1, 1, 1, 1]);
    expect(new Set(shanks.flat()).size).toBe(4);
    // (and every face a bolted joint made is written fixed: the shank in its holes, the head and nut on what they clamp)
    const boltFaces = b.faces.filter((f) => /M10 /.test(b.pieces[f.a]!.name + ' ' + b.pieces[f.b]!.name));
    expect(boltFaces.length).toBeGreaterThan(0);
    expect([...new Set(boltFaces.map((f) => f.joint))]).toEqual(['fixed']);
    // (no face farther apart than its gap)
    const f = falseFaces(b); console.log(`  ${b.faces.length} faces; farther apart than their gap: ${f.length}${f.length ? `\n   ${f.join('\n   ')}` : ''}`);
    expect(f).toEqual([]);
  }, 30_000);

  // (a revolute only, as acceptance 2 asks: P3 landed, motionOf reading the faces' joint ('turns': the inserts' set screws,
  // not drawn, hold the shaft along its line, said on the insert's axis as a travel limit of none))
  it('acceptance 2: the shaft only turns (P3, motionOf reading Face.joint)', async () => {
    const b = (await board(NODES, WIRES)).state.get('bB1')!.out!.block as Block, m = motionOf(b), k = b.pieces.findIndex((p) => p.name === 'Ø20 shaft'), body = m.bodies.findIndex((x) => x.pieces.includes(k));
    const mine = m.joints.filter((j) => j.a === body || j.b === body);
    expect(mine.map((j) => [j.turns, j.slide ?? false])).toEqual([[true, false]]);
  }, 30_000);

  it('a 6004 and a UCP204 over a shaft: a face only on what the shaft bears on', async () => {
    const sh = await piece('piece.shaft', { size: '20', length: 100 });
    const brg = over(sh, 'Ø20 shaft/axis', await piece('piece.bearing', { size: '6004' }), 'mid', 'touch');
    const names = (b: Block) => b.faces.filter((f) => /shaft/.test(b.pieces[f.a]!.name + b.pieces[f.b]!.name)).map((f) => b.pieces[/shaft/.test(b.pieces[f.a]!.name) ? f.b : f.a]!.name);
    expect(names(brg)).toEqual(['6004 inner ring']);
    expect(falseFaces(brg)).toEqual([]);
    const pb = over(sh, 'Ø20 shaft/axis', await piece('piece.pillowblock', { size: 'UCP204' }), 'mid', 'slide');
    expect(names(pb)).toEqual(['UCP204 insert']);
    expect(falseFaces(pb)).toEqual([]);
  }, 30_000);

  it('a bolted joint: which counts every hole of the name; a hole bolted once refuses a second bolt', async () => {
    const plate = await piece('piece.plate', { name: 'base', w: 200, t: 10, d: 300, holes: '', hole: 0 });
    const pb = await piece('piece.pillowblock', { size: 'UCP204' });
    const two = (await board([['p', 'piece.plate', { name: 'base', w: 200, t: 10, d: 300, holes: '', hole: 0 }], ['a', 'piece.pillowblock', { size: 'UCP204' }], ['b', 'piece.pillowblock', { size: 'UCP204' }],
      ['o1', 'room.onto', { face: '+y', fit: 'touch', end: 'mid,lo' }], ['o2', 'room.onto', { face: '+y', fit: 'touch', end: 'mid,hi' }]],
    [['p', 'block', 'o1', 'host'], ['a', 'block', 'o1', 'child'], ['o1', 'block', 'o2', 'host'], ['b', 'block', 'o2', 'child']])).state.get('o2')!.out!.block as Block;
    void plate; void pb;
    const one = boltedJoint(two, 'UCP204 foot A/holes', 'M10', 0), both = boltedJoint(one, 'UCP204 foot A/holes', 'M10', 1);
    const at = (b: Block, name: string) => b.pieces.filter((p) => p.name.startsWith(name)).map((p) => { const B = p.solid.base; return `${(B.c[0] * 1000).toFixed(1)},${(B.c[2] * 1000).toFixed(1)}`; });
    expect(new Set(at(both, 'M10 shank')).size).toBe(2);
    expect(() => boltedJoint(one, 'UCP204 foot A/holes', 'M10', 0)).toThrow(/already holds the M10 shank/);
    expect(() => boltedJoint(two, 'UCP204 foot A/holes', 'M10', 2)).toThrow(/2 holes/);
  }, 30_000);
});
