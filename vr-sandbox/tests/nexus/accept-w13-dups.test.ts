// Wave 13, job 'dups' (plan/AUDIT.md section 3; CRITIQUE-2 finding 11): the board builder the assemblies and seeds.ts
// fold their boards with is written once (src/nexus/assemblies/board.ts), where layOut was copied seven times and Asm,
// Fold and SERVOS four, two and two; and the second part world (part.family, shape.extrude, shape.lathe, hole) is gone
// where the room's makers do what it did.
// The guard on the first: every seed.* builds the same pieces after the move as before it. BASE is measured, not
// written: each seed placed at its defaults on an empty board and run, its block's piece count and the box round its
// pieces' boxes (boundOf, metres, nine figures), at commit 4fe0284 (wave 11 integrated), before the move. The seeds that
// give no block at their defaults (four wait for blocks wired in; three give a motor, a pack or a spring) are held to
// their ports' names instead.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, portsOf } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { boundOf, type Block } from '../../src/nexus/room';
import { starterBoards } from '../../src/nexus/starters';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
type Row = [string, number, [number, number, number], [number, number, number]];
/** Measured at 4fe0284: [seed, pieces, the box's low corner, its high corner]. */
const BASE: Row[] = [
  ['seed.balancing-robot', 44, [0, -0.0255, -0.045], [0.204473175, 0.0255, 0.045]],
  ['seed.bed-frame', 12, [-2.77555756e-17, 0, -2.77555756e-17], [1.038, 1, 2.056]],
  ['seed.bicycle', 20, [-0.29, -0.4528, 0], [0.29, 0.4528, 1.9566725]],
  ['seed.boat', 19, [-0.61, -0.565, 0], [0.61, 0.565, 4.117]],
  ['seed.bus', 12, [-1.25, 0, -5.5], [1.25, 4.04, 5.5]],
  ['seed.camera', 5, [-0.061, -0.0575, 0], [0.061, 0.0575, 0.132]],
  ['seed.car-chassis', 51, [-0.2, 0.0475, -0.12], [0.2, 0.1125, 0.12]],
  ['seed.catapult', 7, [-0.15, 0, -0.1], [0.15, 0.28, 0.1]],
  ['seed.ceiling-fan', 11, [-0.775, 0, -0.775], [0.775, 0.369391438, 0.775]],
  ['seed.chair', 8, [-0.4, 0, -0.4], [0, 0.96, 0]],
  ['seed.conveyor', 52, [0, 0, 0], [0.32, 0.05, 0.8]],
  ['seed.crane', 11, [-0.5, 0, -0.15], [0.5, 0.96, 0.15]],
  ['seed.delta-robot', 5, [-0.15, 0, -0.15], [0.15, 0.31, 0.15]],
  ['seed.desk', 11, [-0.8, 0, -0.4], [0.8, 0.74, 0.4]],
  ['seed.door', 12, [-0.41701, 0, -0.072], [0.41701, 2.021, 0.072]],
  ['seed.drill-press', 6, [-0.175, 0, -0.275], [0.175, 0.95, 0.275]],
  ['seed.excavator', 17, [-0.95, -1.6, 1.11022302e-16], [0.95, 1.6, 7.38]],
  ['seed.fence', 16, [0, 0, -0.05], [1.928, 1.9, 0.05]],
  ['seed.floor-lamp', 7, [-0.15, 0, -0.15], [0.15, 1.643, 0.15]],
  ['seed.forklift', 18, [-1.3, -1.25, 0], [1.3, 1.25, 3.56]],
  ['seed.gear-train-toy', 4, [-0.041993112, -0.041993112, -0.01], [0.105400011, 0.041993112, 0.11]],
  ['seed.gimbal-drone', 71, [-0.1885, 8.67361738e-19, -0.139], [0.1885, 0.2615, 0.139]],
  ['seed.gripper', 12, [-0.025, 0, -0.015], [0.025, 0.065, 0.015]],
  // (the helicopter and the rocket measured again after wave 13's groups job rebuilt them on purpose: the rotor hubs bored
  // at the clear fit to reach the blade roots, the tail boom laid aft; the fins stacked flush on a Ø29 tube; same pieces)
  ['seed.helicopter', 17, [-4.08005, -0.97, 0], [4.08005, 0.97, 5.6]],
  ['seed.hexapod', 140, [-0.19, 0, -0.19], [0.19, 0.1753, 0.19]],
  ['seed.hull', 3, [-1.22, 0, -3.685], [0, 0.383, 0]],
  ['seed.humanoid-torso', 109, [1.73472348e-18, -0.29, -0.09], [0.8869, 0.29, 0.09]],
  ['seed.kart', 20, [-0.47, 0, -0.73485], [0.47, 0.5882, 0.73485]],
  ['seed.lamp-arm', 13, [-0.075, 0, -0.075], [0.075, 0.682, 0.075]],
  ['seed.lathe', 7, [-0.5, 0, -0.15], [0.5, 0.42, 0.15]],
  ['seed.lawnmower', 16, [-0.32, -0.62, 0], [0.32, 0.62, 0.512]],
  ['seed.leg', 23, [-0.02, 4.33680869e-18, -0.015], [0.02, 0.1323, 0.015]],
  ['seed.line-follower', 27, [-0.08301625, -0.0375, 0], [0.08301625, 0.0375, 0.1605]],
  ['seed.linear-axis', 14, [-0.055, 0, -0.02115], [0.055, 0.375, 0.02115]],
  ['seed.mast', 11, [-0.15, 0, -0.15], [0.15, 6.07, 0.15]],
  ['seed.microscope', 6, [0, -0.1375, -0.08], [0.235, 0.1375, 0.08]],
  ['seed.model-rocket', 5, [-0.0281160254, 0, -0.0476983845], [0.0545, 0.37, 0.0476983845]],
  ['seed.monitor', 4, [-0.27, 0, -0.09], [0.27, 0.535, 0.09]],
  ['seed.motorcycle', 15, [-0.38, -0.647, 0], [0.38, 0.647, 2.16229506]],
  ['seed.pan-tilt', 21, [-0.025, 0, -0.02], [0.025, 0.0665, 0.02]],
  ['seed.pi-case', 67, [-0.05, 0, -0.035], [0.05, 0.026, 0.035]],
  ['seed.printer-3d', 38, [-0.25, 0, -0.25], [0.25, 0.418, 0.25]],
  ['seed.pump', 11, [-0.0530239301, 0, -0.0530239301], [0.15302393, 0.277, 0.0530239301]],
  ['seed.pump-loop', 10, [0, 0, -0.1], [0.716483, 0.2, 0.1]],
  ['seed.quadcopter', 50, [-0.1885, 0, -0.139], [0.1885, 0.0675, 0.139]],
  ['seed.quadruped', 94, [-0.12, 0, -0.12], [0.12, 0.1753, 0.12]],
  ['seed.robot-arm', 53, [-0.04, 0, -0.04], [0.04, 0.29345, 0.04]],
  ['seed.robot-dog', 97, [-0.24, -0.1753, 0], [0, 0, 0.41]],
  ['seed.rover', 94, [-0.4935, 0, -0.8065], [0.4935, 0.6718, 0.8065]],
  ['seed.satellite-dish', 5, [-0.3, 0, -0.3], [0.3, 0.9113, 0.3]],
  ['seed.scara', 5, [-0.154, -1.73472348e-18, -0.1], [0.154, 0.162, 0.1]],
  ['seed.scooter', 17, [-0.21, 0, 0], [0.21, 1, 0.70003]],
  ['seed.shelf', 7, [0, -0.327, -0.15], [0.836, 0.327, 0.15]],
  ['seed.solar-panel', 66, [0, -0.0175, -0.8065], [0.987, 0.0175, 0.8065]],
  ['seed.stud-wall', 11, [-0.619, -1.2, 0], [0.619, 1.2, 0.1]],
  ['seed.table', 5, [-0.45, 0, -0.45], [0.45, 0.738, 0.45]],
  ['seed.telescope', 8, [-0.426912659, 0, -0.492956277], [0.426912659, 1.335, 0.492956277]],
  ['seed.toy-car', 4, [-0.06, 3.46944695e-18, -0.0275], [0.06, 0.105, 0.0275]],
  ['seed.tractor', 14, [-0.95, -1.28, 0], [0.95, 1.28, 3.225]],
  ['seed.trailer', 14, [-0.65, 0, -0.875], [0.65, 0.573, 0.875]],
  ['seed.train', 27, [-2.5, 0, 1.11022302e-16], [2.5, 3.15, 18.8]],
  ['seed.tripod', 5, [-0.291825318, 0, -0.492956277], [0.562, 1.22, 0.492956277]],
  ['seed.truck', 17, [-3.4, 0, -1.15], [3.4, 2.866, 1.15]],
  ['seed.turntable', 6, [-0.1, 0, -0.1], [0.1, 0.101, 0.1]],
  ['seed.van', 12, [-1, 0, -2.5], [1, 2.58, 2.5]],
  ['seed.wheelbarrow', 12, [-0.255, 0, -0.8075], [0.255, 0.46, 0.8075]],
  ['seed.wheeled-base', 21, [-0.08301625, 0, -0.075], [0.08301625, 0.075, 0.075]],
  ['seed.winch', 11, [-0.16, 0, -0.07], [0.16, 0.126, 0.07]],
  ['seed.wind-turbine', 14, [-0.35, 0, -0.622427042], [0.5, 6.69103763, 0.622427042]],
  ['seed.window', 9, [-0.538, 0, -0.0345], [0.538, 1.176, 0.0345]],
  ['seed.xy-gantry', 33, [-0.1875, 0, -0.22], [0.1875, 0.0906, 0.22]],
];
/** Measured at 4fe0284: the seeds that give no block at their defaults, by their ports. */
const NO_BLOCK: [string, string[], string[]][] = [
  ['seed.bolted-four', ['held','line','size','head'], ['block','thing','says']],
  ['seed.bolted-two', ['held','line','size','head'], ['block','thing','says']],
  ['seed.boxed', ['inside','name','mat','w','h','d','wall','fit'], ['block','open','thing','says']],
  ['seed.motor-dc', ['R','L','shaft'], ['can','motor','thing','says']],
  ['seed.pack-two', ['cell','w','h','d','wall'], ['pack','flat','thing']],
  ['seed.spring-checked', ['d','D','n','L','stroke','wire'], ['spring','mass','rate','worst','checks']],
  ['seed.standoffs', ['board','w','d','t','mat','holes','length'], ['block','plate','thing','says']],
];
const SRC = join(__dirname, '../../src/nexus');

describe('wave 13, duplicates retired', () => {
  it('every seed is one of those measured: none lost, none new unmeasured', () => {
    expect([...LIBRARY.keys()].filter((k) => k.startsWith('seed.')).sort()).toEqual([...BASE.map((r) => r[0]), ...NO_BLOCK.map((r) => r[0])].sort());
  });
  // (one it() a seed: the slowest measured 0.84 s)
  for (const [id, n, lo, hi] of BASE) it(`${id} builds the same pieces as before the board builder moved`, async () => {
    const b = emptyBoard(id); placeBlock(b, id, 0, 0, {}, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
    const s = e.state.get('x')!; expect(s.status, `${id}: ${s.error ?? ''}`).toBe('ok');
    const blk = s.out!.block as Block; expect(blk.pieces.length, `${id}: pieces`).toBe(n);
    const l = [Infinity, Infinity, Infinity], h = [-Infinity, -Infinity, -Infinity];
    for (const p of blk.pieces) { const [a, c] = boundOf(p); for (let i = 0; i < 3; i++) { l[i] = Math.min(l[i]!, a[i]!); h[i] = Math.max(h[i]!, c[i]!); } }
    // (nine figures were kept: 1e-9 m is the rounding of the measure, not a tolerance on the build)
    for (let i = 0; i < 3; i++) { expect(Math.abs(l[i]! - lo[i]!), `${id}: low ${'xyz'[i]}`).toBeLessThan(1e-9 + 1e-8 * Math.abs(lo[i]!)); expect(Math.abs(h[i]! - hi[i]!), `${id}: high ${'xyz'[i]}`).toBeLessThan(1e-9 + 1e-8 * Math.abs(hi[i]!)); }
  }, 30_000);
  it('the seeds that give no block keep their ports', () => {
    for (const [id, ins, outs] of NO_BLOCK) { const p = portsOf(LIBRARY.get(id)!); expect([p.inputs.map((x) => x.name), p.outputs.map((x) => x.name)], id).toEqual([ins, outs]); }
  });
  it('the board builder is written once: layOut, Asm, Fold, Seed and SERVOS only in assemblies/board.ts', () => {
    const files = [...readdirSync(join(SRC, 'assemblies')).map((f) => `assemblies/${f}`), 'seeds.ts'].filter((f) => f.endsWith('.ts') && f !== 'assemblies/board.ts');
    for (const f of files) { const t = readFileSync(join(SRC, f), 'utf8');
      expect(t.match(/^(function layOut|class (Asm|Fold|Seed)\b|const SERVOS\b)/gm) ?? [], `${f}: a copy of the board builder`).toEqual([]); }
    expect(existsSync(join(SRC, 'assemblies/board.ts'))).toBe(true);
  });
  // (the second part world: shape.extrude, shape.lathe and hole gone from the library, the turned pieces of "Cut by the
  // standards" made by room.make (a lathe), its cuts read as before: every node ok, each check holding, none refused.
  // part.family and components.ts's DESIGNED stay: imprint, cut.standard and the drag to imprint take only the old part
  // record, and "Paste a bolt onto anything" pastes part.family's screw)
  it('shape.extrude, shape.lathe and hole are gone; no starter board uses them; the turned pieces of "Cut by the standards" made by the room', async () => {
    expect(['shape.extrude', 'shape.lathe', 'hole'].filter((id) => LIBRARY.has(id)), 'retired from the library').toEqual([]);
    const boards = starterBoards(), on = boards.flatMap(([t, make]) => Object.values(make().nodes).filter((n) => ['shape.extrude', 'shape.lathe', 'hole'].includes(n.block ?? '')).map((n) => `${t.slice(0, 30)}: ${n.block}`));
    expect(on, 'no starter board places a retired block').toEqual([]);
    const [, make] = boards.find(([t]) => /^Cut by the standards/.test(t))!, b = make(), e = new Engine(b, env, new Memo()); await e.run();
    expect(Object.keys(b.nodes).filter((id) => e.state.get(id)!.status !== 'ok'), 'every node runs').toEqual([]);
    expect([b.nodes.journal!.block, b.nodes.hub!.block], 'the stepped shaft and the hub turned by room.make').toEqual(['room.make', 'room.make']);
    for (const id of ['journal cut', 'hub cut']) { const o = e.state.get(id)!.out as { violation: string; checks: { ok: boolean }[] };
      expect([o.violation, o.checks.length > 0, o.checks.every((c) => c.ok)], `${id}: cut, every check holding`).toEqual(['', true, true]); }
  }, 30_000);
});
