// Package P9 (plan/AUDIT.md): exact solid features, each made by OpenCascade on a block's exact solid, valid, its volume
// against the hand formula where one exists. A 40 × 10 × 40 mm steel plate (10 thick along y) and an M8 rod 20 mm long
// (8 mm across, ISO 261's major diameter for M8), both made by the room, each about its own middle.
import { it, expect } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, specProblems, testBlock } from '../../src/nexus/blocks';
import { Block } from '../../src/nexus/room';
import { densityKg } from '../../src/nexus/mass';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Out = { solid: any; volume: number; kg?: number; valid: boolean; says: string; [k: string]: unknown };
const node = async (id: string, inputs: Record<string, unknown>, set: Record<string, unknown> = {}): Promise<Out> => {
  const d = LIBRARY.get(id); if (!d) throw new Error(`no ${id}`); const d0 = Object.fromEntries((d.settings ?? []).map((s) => [s.key, s.default]));
  return d.run!(inputs, { set: { ...d0, ...set } } as never) as Promise<Out>;
};
const near = (got: number, want: number, rel = 1e-6) => expect(Math.abs(got / want - 1), `${got} against ${want}`).toBeLessThan(rel);
const mm3 = 1e-9;

it('features', async () => {
  const { kernel } = await import('../../src/nexus/brep'), { isoRadius } = await import('../../src/nexus/features'); await kernel();
  const plate = Block.made('plate', 'steel-low', { box: [0.04, 0.01, 0.04] }), cube = Block.made('cube', 'steel-low', { box: [0.02, 0.02, 0.02] });
  const rod = Block.made('rod', 'steel-low', { cyl: [0.004, 0.02] }), V0 = 40 * 10 * 40, rho = densityKg('steel-low')!;
  const ok = (o: Out, what: string) => { expect(o.valid, `${what}: ${o.says}`).toBe(true); return o; };

  // fillet: each of the four 10 mm edges along y rounded to r loses (1 − π/4) r² L
  const f = ok(await node('solid.fillet', { block: plate }, { edges: 'along y', radius: 2 }), 'fillet');
  near(f.volume, (V0 - 4 * (1 - Math.PI / 4) * 2 ** 2 * 10) * mm3); near(f.kg!, f.volume * rho, 1e-12);
  // chamfer: each loses d² L / 2
  near(ok(await node('solid.chamfer', { block: plate }, { edges: 'along y', distance: 2 }), 'chamfer').volume, (V0 - 4 * (2 ** 2 * 10) / 2) * mm3);
  // the other selectors give valid solids: all, a face's edges, longer than a length, the rims round a line
  for (const edges of ['all', 'face +y', 'longer 20', 'shorter 20']) ok(await node('solid.fillet', { block: plate }, { edges, radius: 1 }), `fillet ${edges}`);
  ok(await node('solid.chamfer', { block: plate }, { edges: 'face +y', distance: 1 }), 'chamfer face +y');
  const holed = Block.made('holed', 'steel-low', { box: [0.04, 0.01, 0.04] }, { pattern: { name: 'hole', points: [[0, 0]], hole: 0.003 } }), port = holed.pieces[0]!.lines[0]!.port;
  const rim = ok(await node('solid.chamfer', { block: holed }, { edges: `line ${port}`, distance: 0.5 }), 'chamfer line'); expect(rim.says).toMatch(/2 edges/);
  // refused, with why: a fillet larger than the edges allow (the plate is 10 mm thick: its sides are 10 mm high)
  await expect(node('solid.fillet', { block: plate }, { edges: 'face +y', radius: 12 })).rejects.toThrow(/larger than these 4 edges allow/);

  // shell: outer less inner (open at +y, wall 2: the inside 36 × 8 × 36)
  const sh = ok(await node('solid.shell', { block: plate }, { wall: 2, open: '+y' }), 'shell'); near(sh.volume, (V0 - 36 * 8 * 36) * mm3);
  near(ok(await node('solid.shell', { block: plate }, { wall: 2, open: 'none' }), 'shell closed').volume, (V0 - 36 * 6 * 36) * mm3);
  // refused: a wall thicker than the plate, an offset in by more than half of it
  await expect(node('solid.shell', { block: plate }, { wall: 12, open: '+y' })).rejects.toThrow(/refused/);
  await expect(node('solid.offset', { block: plate }, { distance: -6 })).rejects.toThrow(/refused/);
  near(ok(await node('solid.offset', { block: plate }, { distance: -1 }), 'offset in').volume, 38 * 8 * 38 * mm3);
  // offset out by t: Steiner's formula for a box, abc + 2(ab + bc + ca) t + π(a + b + c) t² + (4/3) π t³
  const t = 1; near(ok(await node('solid.offset', { block: plate }, { distance: t }), 'offset').volume, (V0 + 2 * (400 + 400 + 1600) * t + Math.PI * 90 * t ** 2 + (4 / 3) * Math.PI * t ** 3) * mm3);

  // two overlapping boxes, each about its own middle: the plate and a 20 mm cube share 20 × 10 × 20
  const both = 20 * 10 * 20;
  near(ok(await node('solid.union', { a: plate, b: cube }), 'union').volume, (V0 + 8000 - both) * mm3);
  near(ok(await node('solid.intersect', { a: plate, b: cube }), 'intersect').volume, both * mm3);
  near(ok(await node('solid.cut', { a: plate, b: cube }), 'cut').volume, (V0 - both) * mm3);

  // mirror keeps volume (the plate with the edges of its +x face rounded, its image in yz: those edges now on −x)
  const fx = ok(await node('solid.fillet', { block: plate }, { edges: 'face +x', radius: 2 }), 'fillet +x'), m = ok(await node('solid.mirror', { block: fx.solid }, { plane: 'yz' }), 'mirror');
  near(m.volume, fx.volume, 1e-9);
  // pattern of n apart is n times one: in a row 50 mm apart, and four round an axis 60 mm off (each 28.3 mm to its corners)
  near(ok(await node('solid.pattern', { block: plate }, { kind: 'linear', n: 3, axis: 'x', step: 50 }), 'pattern linear').volume, 3 * V0 * mm3);
  near(ok(await node('solid.pattern', { block: plate }, { kind: 'circular', n: 4, axis: 'y', step: 60 }), 'pattern circular').volume, 4 * V0 * mm3);

  // an M8 thread (ISO 261 coarse, 1.25 mm; ISO 68-1 profile): its volume between its minor and its major cylinders
  const th = ok(await node('solid.thread', { block: rod }, { size: 'auto' }), 'thread'), L = 20, d = 8, P = 1.25, d1 = d - (5 / 4) * (Math.sqrt(3) / 2) * P;
  expect(th.size).toBe('M8'); expect(th.pitch).toBe(P);
  expect(th.volume).toBeGreaterThan((Math.PI * d1 ** 2 * L) / 4 * mm3); expect(th.volume).toBeLessThan((Math.PI * d ** 2 * L) / 4 * mm3);
  // (and, said not checked: against its profile's own mean section, the integral of π r(z)² over a pitch)
  const K = 20000, mean = Array.from({ length: K }, (_, k) => Math.PI * isoRadius(d, P, ((k + 0.5) * P) / K) ** 2).reduce((a, b) => a + b, 0) / K;
  console.log(`M8 thread: ${(th.volume / mm3).toFixed(3)} mm³ against the profile's ${(mean * L).toFixed(3)} mm³ (${((th.volume / mm3 / (mean * L) - 1) * 100).toFixed(4)} %)`);
  ok(await node('solid.thread', { block: rod }, { size: 'M8', length: 10 }), 'thread 10 mm');
  // the rod stood on the plate by the room (Onto a face): threaded all along, the plate kept, the two one solid
  const post = Block.onto(plate, '+y', rod), tp = ok(await node('solid.thread', { block: post }, {}), 'thread on a post'); near(tp.volume, V0 * mm3 + th.volume, 1e-6);
  await expect(node('solid.thread', { block: rod }, { size: 'M10' })).rejects.toThrow(/rod 10 mm across/);

  // slot: a through slot w × d along L takes w d L; groove: π (R² − (R − t)²) w
  near(ok(await node('solid.slot', { block: plate }, { face: '+y', along: 'x', width: 6, depth: 3 }), 'slot').volume, (V0 - 6 * 3 * 40) * mm3);
  near(ok(await node('solid.groove', { block: rod }, { width: 2, depth: 1 }), 'groove').volume, (Math.PI * 4 ** 2 * 20 - Math.PI * (4 ** 2 - 3 ** 2) * 2) * mm3);
  // rib: a 2 mm plate across the shelled plate's middle, between its walls: adds 2 × 36 × 8
  near(ok(await node('solid.rib', { block: sh.solid }, { across: 'x', thickness: 2 }), 'rib').volume, (V0 - 36 * 8 * 36 + 2 * 36 * 8) * mm3);

  // a 20 mm rod (20 across, 40 long): an M20 thread (2.5 mm) between its cylinders; its end rims chamfered and filleted,
  // each ring by Pappus (its section's area times the path of its centroid): a chamfer d × d, d²/2 at R − d/3; a fillet,
  // (1 − π/4) r² at R − r (10 − 3π) / (12 − 3π) (the centroid of the corner left outside a quarter circle)
  const rod20 = Block.made('rod20', 'steel-low', { cyl: [0.01, 0.04] }), R = 10, H20 = 40, V20 = Math.PI * R ** 2 * H20;
  const t20 = ok(await node('solid.thread', { block: rod20 }, {}), 'M20 thread'), d20 = 20 - (5 / 4) * (Math.sqrt(3) / 2) * 2.5; expect(t20.size).toBe('M20');
  expect(t20.volume).toBeGreaterThan((Math.PI * d20 ** 2 * H20) / 4 * mm3); expect(t20.volume).toBeLessThan(V20 * mm3);
  const c = 1; near(ok(await node('solid.chamfer', { block: rod20 }, { edges: 'all', distance: c }), 'rod chamfer').volume, (V20 - 2 * 2 * Math.PI * (R - c / 3) * (c ** 2 / 2)) * mm3);
  const rf = 1, xc = (rf * (10 - 3 * Math.PI)) / (12 - 3 * Math.PI); near(ok(await node('solid.fillet', { block: rod20 }, { edges: 'all', radius: rf }), 'rod fillet').volume, (V20 - 2 * 2 * Math.PI * (R - xc) * (1 - Math.PI / 4) * rf ** 2) * mm3);
  near(ok(await node('solid.groove', { block: rod20 }, { width: 3, depth: 2, from: 5 }), 'rod groove').volume, (V20 - Math.PI * (R ** 2 - (R - 2) ** 2) * 3) * mm3);
  near(ok(await node('solid.pattern', { block: rod20 }, { kind: 'circular', n: 6, axis: 'y', step: 30 }), 'rod pattern').volume, 6 * V20 * mm3);

  // each node's own tests field
  for (const id of ['solid.fillet', 'solid.chamfer', 'solid.shell', 'solid.offset', 'solid.union', 'solid.cut', 'solid.intersect', 'solid.mirror', 'solid.pattern', 'solid.thread', 'solid.slot', 'solid.groove', 'solid.rib']) {
    const def = LIBRARY.get(id)!; expect(def.tests?.length, id).toBeGreaterThan(0); expect(specProblems(def), id).toEqual([]);
    const r = await testBlock(def); expect(r.fails, id).toEqual([]); expect(r.ok, id).toBe(true);
  }
}, 30_000);
