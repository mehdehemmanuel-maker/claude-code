// F-1.3, the centre-of-mass theorem (docs/LAW-TREE.md): a system with no external impulse along a direction keeps its
// momentum along it, so its centre of mass cannot start moving that way whatever happens inside it. Held here for the
// kinds of system the re-solve handles whole (mechanisms of servo-driven links, R-1, R-2), where the only way to break
// it is a realisation that moves bodies without the equal and opposite move of what they hang from (F-1.1.2).

import { describe, expect, it } from 'vitest';
import { machine, rig, type Rig } from './helpers';
import { getServo } from '../../src/data/servos';
import type { Servo } from '../../src/construct/build';
import { buildWalker, WALKERS, type Walker } from '../../src/world/creature';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import type { Quat, Vec3 } from '../../src/doc/types';

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

/** The centre of mass of these parts (every part's pose origin is its centre of mass: symmetric stock). */
function com(r: Rig, ids: string[]): Vec3 {
  let M = 0;
  const c: Vec3 = [0, 0, 0];
  for (const id of ids) {
    const m = r.world.bodyMass(id) ?? 0, p = r.world.livePose(id)!.p;
    M += m;
    for (let k = 0; k < 3; k++) c[k]! += m * p[k]!;
  }
  return [c[0] / M, c[1] / M, c[2] / M];
}

async function dog(gravity: Vec3, floor: string | null): Promise<{ r: Rig; w: Walker }> {
  const r = await rig({ gravity }, false);
  if (floor) {
    const mats = { ...materials, 'test.frictionless': { ...getMaterial('polymer.ptfe'), id: 'test.frictionless', name: 'a frictionless floor', friction: 0 } };
    r.world.apply({ op: 'environment', boxes: [{ half: [50, 0.5, 50], pose: { p: [0, -0.5, 0], q: [0, 0, 0, 1] }, material: floor }], materials: mats });
  }
  const store = new DocStore(newDoc('com'));
  const w = buildWalker(store, WALKERS['dog']!, [0, floor ? 0 : 1, 0], 0);
  for (const id of w.parts) r.world.apply({ op: 'upsertPart', part: store.doc.parts[id]!, material: getMaterial(store.doc.parts[id]!.material), keepLivePose: false });
  for (const id of w.joints) r.world.apply({ op: 'upsertConnection', conn: store.doc.connections[id]!, materials });
  return { r, w };
}

describe('F-1.3: the centre of mass of a system with no external impulse stays where it is', () => {
  it('a walker in zero gravity with nothing to push on, legs going: its centre of mass does not move', async () => {
    const { r, w } = await dog([0, 0, 0], null);
    const c0 = com(r, w.parts);
    r.run(5);
    const c1 = com(r, w.parts);
    const moved = Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
    expect(moved).toBeLessThan(1e-3);
    r.done();
  }, 120000);

  it('a walker on a frictionless floor: the floor gives no sideways impulse, so its centre of mass goes nowhere sideways', async () => {
    const { r, w } = await dog([0, -9.81, 0], 'test.frictionless');
    r.run(1);
    const c0 = com(r, w.parts);
    r.run(9);
    const c1 = com(r, w.parts);
    expect(Math.hypot(c1[0] - c0[0], c1[2] - c0[2])).toBeLessThan(5e-3);
    r.done();
  }, 120000);

  it('random chains of light links on driven hinges in zero gravity: no chain moves its centre of mass', async () => {
    const I: Quat = [0, 0, 0, 1];
    for (let seed = 1; seed <= 4; seed++) {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      let s = seed * 7919;
      const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      const n = 3 + Math.floor(rnd() * 4);
      const sv = getServo('servo.micro-9g'), [l, w, h] = sv.dims;
      // link 0 carries the pack on its top and the board under it; each link but the last carries, screwed to its top
      // near its far end, the servo whose horn swings the next link (which steps sideways by a horn's thickness)
      const { parts } = machine(r, (b) => {
        const board = b.place('controller', [0.045, 1 - 0.006 - 0.003, 0], I, { rhythm: 0.5 + rnd() * 2.5 }, 'board');
        const pack = b.place('battery', [0.025, 1 + 0.006 + 0.00525, 0], I, { model: 'battery.nimh.aaa', series: 4, parallel: 1, charge: 1 }, 'pack');
        let at: Vec3 = [0, 1, 0], prev: Servo | null = null;
        for (let k = 0; k < n; k++) {
          const L = k === 0 ? 0.09 : 0.04 + 0.08 * rnd();
          const link = b.place('block', [at[0] + L / 2, at[1], at[2]], I, { x: L, y: 0.012, z: 0.03 }, `link${k}`, { material: rnd() < 0.5 ? 'polymer.pla' : 'aluminum.6061-t6' });
          if (k === 0) {
            link.fasten({ thin: 0.012, at: [0.025 - L / 2, 0.006, 0] }, pack, { thin: 0.0105, at: [0, -0.00525, 0] }, [0.0445, 0.042], 'screwed');
            link.fasten({ thin: 0.012, at: [0.045 - L / 2, -0.006, 0] }, board, { thin: 0.006, at: [0, 0.003, 0] }, [0.04, 0.025], 'screwed');
            pack.wire(board);
          }
          if (prev) prev.horn(link);
          if (k + 1 < n) {
            const caseAt: Vec3 = [at[0] + L - l / 2 - 0.002, at[1] + 0.006 + w / 2, at[2]];
            const servo = b.place('servo', caseAt, I, { model: sv.id }, `servo${k}`);
            link.fasten({ thin: 0.012, at: [caseAt[0] - (at[0] + L / 2), 0.006, 0] }, servo, { thin: w, at: [0, -w / 2, 0] }, [l, h], 'screwed');
            pack.wire(servo);
            board.lead_(servo, { swing: 0.3 + rnd() * 0.6, phase: rnd() * 6.28 - 3.14, wave: 'sine' });
            const shaft = servo.worldOf(servo.shaft).p;
            at = [shaft[0], shaft[1], shaft[2] + sv.horn + 0.015];
            prev = servo;
          }
        }
      });
      r.run(0.5);
      const c0 = com(r, parts);
      r.run(4);
      const c1 = com(r, parts);
      expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]), `seed ${seed}`).toBeLessThan(1e-3);
      r.done();
    }
  }, 300000);
});
