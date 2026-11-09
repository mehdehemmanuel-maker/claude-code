// Acceptance tests 8 and 9 of the directive of 2026-11-07 (plan/AUDIT.md 5.7, package P7: recursion and persistence).
// 8, reuse: a block of yours that places another block of yours (a robot dog on a plate, its joints bound through to the
// dog's own input by `into`, root 5) is placed in another design; the four-legged build's pieces carry four distinct leg
// owners (Piece.owner). 9, persistence: that nest is saved (memory.ts, to the file NEXUS_MEMORY names), then read back by
// a FRESH vitest process (this file again, its child test only) that builds the same pieces, faces and joints; the saved
// record holds a version and its board's digest, and a changed board changes the digest.
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import '../../src/nexus/seeds';
import { LIBRARY, block, register } from '../../src/nexus/blocks';
import type { Board } from '../../src/nexus/boards';
import { Engine, bindSetting, emptyBoard, groupBlock, placeBlock, wire } from '../../src/nexus/dataflow';
import { boundOf, type Block } from '../../src/nexus/room';
import { motionOf } from '../../src/nexus/sim';
import { digestOf, keep, registerSaved, remember, savedParts } from '../../src/nexus/memory';

const CHILD = process.env.P7_PHASE === 'read';
const DIR = process.env.P7_DIR ?? mkdtempSync(join(tmpdir(), 'nexus-p7-'));
const MEM = join(DIR, 'memory.json'), SNAP = join(DIR, 'snap.json'), BACK = join(DIR, 'back.json');
process.env.NEXUS_MEMORY = MEM;
const INNER = 'p7.dog-on-plate';

const r6 = (x: number) => +x.toFixed(6);
/** What a build is, to compare across processes: every piece (name, material, box, owner), every face, every joint. */
function snap(b: Block) {
  const m = motionOf(b);
  return {
    pieces: b.pieces.map((p) => ({ name: p.name, mat: p.mat, bound: boundOf(p).map((v) => v.map(r6)), owner: p.owner ?? [] })),
    faces: b.faces.map((f) => ({ a: f.a, b: f.b, kind: f.kind, gap: r6(f.gap), fit: f.fit ?? null })),
    joints: m.joints.map((j) => ({ a: m.bodies[j.a]!.name, b: m.bodies[j.b]!.name, point: j.point.map(r6), dir: j.dir.map(r6), range: j.range ?? null })),
  };
}
async function built(id: string, set: Record<string, unknown>): Promise<Block> {
  const g = emptyBoard(id); placeBlock(g, id, 0, 0, set, 'it'); const e = new Engine(g, {}); await e.run();
  const s = e.state.get('it'); if (!s || s.status !== 'ok') throw new Error(`${id}: ${s?.status} ${s?.error ?? ''}`);
  return s.out!.block as Block;
}
/** The inner block of yours: the robot dog on a plywood slab, its joints an input bound into the dog's own input. */
function dogOnPlate(): void {
  if (block(INNER)) return;
  const g = emptyBoard('Dog on a plate');
  placeBlock(g, 'seed.robot-dog', 0, 0, {}, 'dog');
  bindSetting(g, 'joints', 'dog.joints');
  // (the slab's sizes typical of a 18 mm plywood offcut, a base for the dog to stand on)
  placeBlock(g, 'room.make', 0, 0, { name: 'base slab', shape: 'box', mat: 'plywood', a: 600, b: 18, c: 600 }, 'slab');
  placeBlock(g, 'room.onto', 0, 0, { face: '+y', fit: 'touch' }, 'on'); wire(g, 'slab', 'block', 'on', 'host'); wire(g, 'dog', 'block', 'on', 'child');
  placeBlock(g, 'group.out', 0, 0, { name: 'block', type: 'block' }, 'out'); wire(g, 'on', 'block', 'out', 'value');
  register(groupBlock(g, { id: INNER, name: 'Dog on a plate', says: 'the robot dog on a plywood slab', domains: ['mechanical'], by: 'you' }));
}
/** The outer board: the inner block placed, its joints wired from the outer block's own input. */
function deck(): Board {
  const h = emptyBoard('Dog deck');
  placeBlock(h, 'group.in', 0, 0, { name: 'joints', type: 'text', default: '3', choices: '2|3' }, 'in_joints');
  placeBlock(h, INNER, 0, 0, {}, 'p'); wire(h, 'in_joints', 'value', 'p', 'joints');
  placeBlock(h, 'group.out', 0, 0, { name: 'block', type: 'block' }, 'out'); wire(h, 'p', 'block', 'out', 'value');
  return h;
}
const legOwners = (b: Block, leg: string) => new Set(b.pieces.flatMap((p) => (p.owner ?? []).filter((o) => o.startsWith(`${leg} #`))));

describe.skipIf(CHILD)('P7, recursion and persistence', () => {
  it('acceptance 8: a block of yours placing another, its input reaching inside, four distinct leg owners', async () => {
    dogOnPlate();
    const leg = LIBRARY.get('seed.leg')!.name, three = await built(INNER, { joints: '3' }), two = await built(INNER, { joints: '2' });
    // (into reaches the dog's own input: the third joint on each leg adds its servo and link)
    const dog3 = await built('seed.robot-dog', { joints: '3' });
    expect(three.pieces.length).toBe(dog3.pieces.length + 1);
    expect(two.pieces.length).toBeLessThan(three.pieces.length);
    // (each piece says the blocks it came through: the dog's legs are four, each its own)
    expect([...legOwners(three, leg)].sort()).toEqual([1, 2, 3, 4].map((k) => `${leg} #${k}`));
    const legPieces = three.pieces.filter((p) => p.owner?.some((o) => o.startsWith(`${leg} #`)));
    expect(legPieces.length % 4).toBe(0);
    expect(legPieces.every((p) => p.owner![0] === 'Dog on a plate' && p.owner!.includes(LIBRARY.get('seed.robot-dog')!.name))).toBe(true);
    expect(three.pieces.find((p) => p.name === 'base slab')!.owner).toEqual(['Dog on a plate']);
    // (the nest placed in another design: on a bench top by the room's stack)
    const d = emptyBoard('dog on a bench');
    placeBlock(d, 'room.make', 0, 0, { name: 'bench top', shape: 'box', mat: 'al-6061', a: 800, b: 20, c: 800 }, 'top');
    placeBlock(d, INNER, 0, 0, { joints: '2' }, 'dog');
    placeBlock(d, 'room.stack', 0, 0, { name: 'bench', axis: 'y', fit: 'touch', order: 'top, dog' }, 'st'); wire(d, 'top', 'block', 'st', 'blocks'); wire(d, 'dog', 'block', 'st', 'blocks');
    const e = new Engine(d, {}); await e.run(); const st = e.state.get('st')!;
    expect(st.status, st.error).toBe('ok');
    const bench = st.out!.block as Block;
    expect(bench.pieces.length).toBe(two.pieces.length + 1);
    expect(legOwners(bench, leg).size).toBe(4);
    expect(motionOf(bench).joints.length).toBe(motionOf(two).joints.length);
  }, 30_000);

  it('acceptance 9: a nest saved, reloaded in a fresh process, the same pieces, faces and joints; version and digest', async () => {
    dogOnPlate();
    const g = deck(), part = remember({ name: 'p7 dog deck', says: 'a nest of two blocks of yours', graph: g, from: 'acceptance 9', checked: { pieces: 0, groups: 1, failing: 0 }, by: 'you' });
    const stored = (JSON.parse(readFileSync(MEM, 'utf8')) as { id: string; version?: number; digest?: string; carry?: { id: string; digest: string }[] }[]).find((p) => p.id === part.id)!;
    expect(stored.version).toBe(1);
    expect(stored.digest).toBe(digestOf(g));
    expect(stored.carry?.map((c) => c.id)).toEqual([INNER]);
    // (a changed board, another digest: one more node on the outer board, wired to what the nest gives)
    const g2 = structuredClone(g); placeBlock(g2, 'view.show', 0, 0, {}, 'look'); wire(g2, 'p', 'block', 'look', 'value');
    expect(digestOf(g2)).not.toBe(digestOf(g));
    // (kept again under its id: the same board keeps its version, a changed one is the next)
    const same = keep({ id: part.id, name: part.name, says: part.says, domains: part.domains, graph: g });
    expect([same.version, same.digest]).toEqual([1, digestOf(g)]);
    const twin = keep({ id: 'my.p7-twin', name: 'p7 twin', says: 'kept twice', domains: ['mechanical'], graph: g });
    const twin2 = keep({ id: twin.id, name: twin.name, says: twin.says, domains: twin.domains, graph: g2 });
    expect([twin.version, twin2.version, twin2.digest]).toEqual([1, 2, digestOf(g2)]);
    // (what this process builds, written for the fresh one to compare with)
    const here = { 3: snap(await built(part.id, { joints: '3' })), 2: snap(await built(part.id, {joints: '2'})) };
    writeFileSync(SNAP, JSON.stringify({ id: part.id, digest: stored.digest, here }));
    const r = spawnSync('npx', ['vitest', 'run', 'tests/nexus/accept-p7-persistence.test.ts', '-t', 'p7 child'], { cwd: join(__dirname, '../..'), env: { ...process.env, P7_PHASE: 'read', P7_DIR: DIR, NEXUS_MEMORY: MEM }, encoding: 'utf8', timeout: 25_000 });
    expect(r.status, `${r.stdout?.slice(-1500)}\n${r.stderr?.slice(-800)}`).toBe(0);
    expect(existsSync(BACK)).toBe(true);
    const back = JSON.parse(readFileSync(BACK, 'utf8')) as { before: boolean; inner: boolean; digest: string; carried: string[]; same: Record<string, Record<string, boolean>>; counts: Record<string, number[]> };
    expect(back.before).toBe(false);
    expect(back.inner).toBe(true);
    expect(back.digest).toBe(stored.digest);
    expect(back.carried).toEqual([INNER]);
    expect(back.same).toEqual({ 3: { pieces: true, faces: true, joints: true }, 2: { pieces: true, faces: true, joints: true } });
    expect(back.counts['3']![0]).toBeGreaterThan(back.counts['2']![0]!);
    expect(back.counts['3']![2]).toBeGreaterThan(0);
  }, 30_000);
});

// (the fresh process: run only by acceptance 9, with P7_PHASE=read; it reads the store the parent wrote, nothing else)
describe.runIf(CHILD)('p7 child', () => {
  it('p7 child: the store read back in a fresh process', async () => {
    const { id, here } = JSON.parse(readFileSync(SNAP, 'utf8')) as { id: string; here: Record<string, ReturnType<typeof snap>> };
    const before = !!block(id) || !!block(INNER);
    registerSaved();
    const rec = savedParts().find((p) => p.id === id)!, same: Record<string, Record<string, boolean>> = {}, counts: Record<string, number[]> = {};
    for (const j of ['3', '2']) {
      const s = snap(await built(id, { joints: j }));
      same[j] = { pieces: JSON.stringify(s.pieces) === JSON.stringify(here[j]!.pieces), faces: JSON.stringify(s.faces) === JSON.stringify(here[j]!.faces), joints: JSON.stringify(s.joints) === JSON.stringify(here[j]!.joints) };
      counts[j] = [s.pieces.length, s.faces.length, s.joints.length];
    }
    writeFileSync(BACK, JSON.stringify({ before, inner: !!block(INNER), digest: digestOf(rec.graph), carried: (rec.carry ?? []).map((c) => c.id), same, counts }));
  }, 25_000);
});
