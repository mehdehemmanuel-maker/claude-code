// Acceptance tests 2 and 7 (plan/AUDIT.md 5.2, 5.3 and 4F; packages P2 and P3 together). 2: a shaft, two UCP204 pillow
// blocks, a gear and a plate assembled by the room's operations only, both blocks bolted, no face wider than its fit's
// gap, and the shaft on one revolute (it turns, never slides: the inserts' set screws hold it along its line). 7: a
// 5-joint servo arm built by operations (its gripper's jaw a sixth joint), its freedom printed, every joint within its travel after a held pose; a
// bolted joint read fixed. motionOf reads Face.joint before it infers.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { Engine, Memo, emptyBoard, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { boundOf, partOfBlock, type Block } from '../../src/nexus/room';
import { edgeRadius } from '../../src/nexus/finish';
import { LiveMotion, motionOf } from '../../src/nexus/sim';
import { trianglesOf } from '../../src/nexus/make/rules';
import { leastDistance } from '../../src/nexus/make/critic';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
type N = [string, string, Record<string, unknown>]; type W = [string, string, string, string];
async function board(nodes: N[], wires: W[]) {
  const b = emptyBoard('accept 2 and 7'); for (const [id, blk, set] of nodes) placeBlock(b, blk, 0, 0, set, id); for (const [a, pa, c, pc] of wires) wire(b, a, pa, c, pc);
  const e = new Engine(b, env, new Memo()); await e.run();
  expect([...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.status} ${s.error ?? ''}`)).toEqual([]);
  return e;
}
/** Every face against the least distance between its two pieces' drawn meshes (as tests/nexus/accept-p2-assembly.test.ts
 *  reads it: a tessellated round face lies inside its circle, and each edge is drawn broken by its material's radius,
 *  finish.ts edgeRadius; 1 µm float slack): the faces farther apart than the gap they carry. */
function falseFaces(b: Block): string[] {
  const tris = trianglesOf(partOfBlock(b)), byName = new Map<string, (typeof tris)[number][]>();
  for (const t of tris) byName.set(t.name, [...(byName.get(t.name) ?? []), t]);
  const meshOf = (k: number) => { const name = b.pieces[k]!.name, same = b.pieces.filter((p, i) => p.name === name && i <= k).length; return byName.get(name)?.[same - 1]; };
  const out: string[] = [];
  for (const f of b.faces) { const A = meshOf(f.a), B = meshOf(f.b); if (!A || !B) continue; const d = leastDistance(A, B);
    const broken = Math.max(...[f.a, f.b].map((k) => { const [lo, hi] = boundOf(b.pieces[k]!); return edgeRadius(b.pieces[k]!.mat, Math.min(...[0, 1, 2].map((i) => hi[i]! - lo[i]!))); }));
    if (d && d.d > f.gap + broken + 1e-6) out.push(`${b.pieces[f.a]!.name} / ${b.pieces[f.b]!.name}: ${f.kind} by "${f.by}", gap ${(f.gap * 1e6).toFixed(1)} µm, drawn ${(d.d * 1e3).toFixed(3)} mm apart`); }
  return out;
}
// (P2's board: two UCP204 blocks onto the plate at its ends, the shaft through both inserts on the slide fit, the gear over
// it on the tight fit, each block bolted at both feet, one bolt to a hole)
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

describe('acceptance 2 and 7: joints read from the faces (P2, P3)', () => {
  it('acceptance 2', async () => {
    const b = (await board(NODES, WIRES)).state.get('bB1')!.out!.block as Block;
    const m = motionOf(b), shaftK = b.pieces.findIndex((p) => p.name === 'Ø20 shaft'), body = m.bodies.findIndex((x) => x.pieces.includes(shaftK));
    const mine = m.joints.filter((j) => j.a === body || j.b === body);
    console.log(`  motionOf: ${m.says}\n  freedom: ${m.freedomSays}\n  limits: ${m.limitsSays}`);
    // (the shaft's body on one joint, a revolute about its own line (no slide), to the body of both housings and the plate)
    expect(mine.map((j) => [j.turns, j.slide ?? false])).toEqual([[true, false]]);
    const other = m.bodies[mine[0]!.a === body ? mine[0]!.b : mine[0]!.a]!;
    expect(other.pieces.filter((i) => /UCP204 housing/.test(b.pieces[i]!.name)).length).toBe(2);
    expect(other.pieces.some((i) => b.pieces[i]!.name === 'mounting plate')).toBe(true);
    expect(m.bodies[body]!.pieces.some((i) => /spur gear/.test(b.pieces[i]!.name))).toBe(true);
    expect(m.freedom).toBe(1);
    // (the faces the shaft bears on: the two inserts, the slide fit's gap, each written turning; none on a housing)
    const onShaft = b.faces.filter((f) => f.a === shaftK || f.b === shaftK).map((f) => ({ f, other: b.pieces[f.a === shaftK ? f.b : f.a]!.name }));
    expect(onShaft.filter((x) => /insert/.test(x.other)).map((x) => [x.f.kind, x.f.fit, x.f.joint])).toEqual([['gap', 'slide', 'turns'], ['gap', 'slide', 'turns']]);
    expect(onShaft.filter((x) => /housing/.test(x.other))).toEqual([]);
    // (both blocks bolted: a shank in each foot's hole, each hole one bolt; every face a bolted joint made written fixed)
    const feet = b.pieces.map((p, i) => ({ p, i })).filter(({ p }) => /UCP204 foot/.test(p.name));
    const shanks = feet.map(({ i }) => b.faces.filter((f) => (f.a === i || f.b === i) && /M10 shank/.test(b.pieces[f.a === i ? f.b : f.a]!.name) && / in the hole of | through /.test(f.by)).map((f) => b.pieces[f.a === i ? f.b : f.a]!.name));
    expect(shanks.map((s) => new Set(s).size)).toEqual([1, 1, 1, 1]);
    expect(new Set(shanks.flat()).size).toBe(4);
    expect([...new Set(b.faces.filter((f) => /M10 /.test(b.pieces[f.a]!.name + ' ' + b.pieces[f.b]!.name)).map((f) => f.joint))]).toEqual(['fixed']);
    // (no face farther apart than its gap)
    const f = falseFaces(b); console.log(`  ${b.faces.length} faces; farther apart than their gap: ${f.length}${f.length ? `\n   ${f.join('\n   ')}` : ''}`);
    expect(f).toEqual([]);
  }, 30_000);

  it('acceptance 7', async () => {
    // (the arm of five joints, as the library's seed.robot-arm builds it from its operations)
    const arm = (await board([['arm', 'seed.robot-arm', { joints: '5' }]], [])).state.get('arm')!.out!.block as Block, m = motionOf(arm);
    console.log(`  the arm: ${arm.pieces.length} pieces; ${m.says}\n  freedom: ${m.freedomSays}\n  limits: ${m.limitsSays}`);
    // (five joints of the arm and the gripper's jaw, a sixth: the arm's freedom 5, the whole's 6, each a servo's turn)
    const jaw = (j: (typeof m.joints)[number]) => m.bodies[j.a]!.pieces.some((i) => /gripper finger|gripper palm/.test(arm.pieces[i]!.name));
    expect(m.joints.filter((j) => !jaw(j)).length, m.says).toBe(5);
    expect(m.joints.filter(jaw).length, m.says).toBe(1);
    expect(m.freedom).toBe(6);
    expect(m.joints.every((j) => j.turns && !j.slide && j.motor?.kind === 'servo'), m.says).toBe(true);
    // (each joint's travel from its servo's row: SG90, 0 to 180°, drawn at its middle)
    expect(m.joints.map((j) => j.limits && [+j.limits.lo.toFixed(6), +j.limits.hi.toFixed(6)])).toEqual(Array(6).fill([-+(Math.PI / 2).toFixed(6), +(Math.PI / 2).toFixed(6)]));
    expect(m.joints.every((j) => /SG90 row/.test(j.limits!.src))).toBe(true);
    // (a held pose: one second under gravity, the servos holding; every joint within its travel)
    const J = (await (await import('jolt-physics/wasm-compat')).default()) as never, live = new LiveMotion(J, arm); live.step(1);
    const at = m.joints.map((j) => ({ who: m.bodies[j.a]!.name, a: live.angle(j.a), lo: j.limits!.lo, hi: j.limits!.hi }));
    console.log(`  after 1 s held: ${at.map((x) => `${x.who} ${x.a.toFixed(3)} rad`).join('; ')}`);
    live.destroy();
    for (const x of at) { expect(x.a, `${x.who} within its travel`).toBeGreaterThanOrEqual(x.lo - 1e-3); expect(x.a, `${x.who} within its travel`).toBeLessThanOrEqual(x.hi + 1e-3); }
    // (a bolted joint read fixed: on acceptance 2's board each bolt's pieces are in the body of the plate and the feet it
    // clamps, and no joint is read through a bolt's face)
    const b = (await board(NODES, WIRES)).state.get('bB1')!.out!.block as Block, mb = motionOf(b), plate = mb.bodies.findIndex((x) => x.pieces.some((i) => b.pieces[i]!.name === 'mounting plate'));
    const bolts = b.pieces.map((p, i) => ({ p, i })).filter(({ p }) => /^M10 /.test(p.name));
    expect(bolts.length).toBeGreaterThan(0);
    expect(bolts.filter(({ i }) => !mb.bodies[plate]!.pieces.includes(i)).map(({ p }) => p.name)).toEqual([]);
    expect(mb.joints.filter((j) => j.by.some((x) => /M10 /.test(x)))).toEqual([]);
  }, 30_000);
});
