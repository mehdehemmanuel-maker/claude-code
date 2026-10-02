// F-1.3, the centre-of-mass theorem (docs/LAW-TREE.md): a system with no external impulse along a direction keeps its
// momentum along it, so its centre of mass cannot start moving that way whatever happens inside it. Held here for the
// kinds of system the re-solve handles whole (mechanisms of servo-driven links, R-1, R-2), where the only way to break
// it is a realisation that moves bodies without the equal and opposite move of what they hang from (F-1.1.2).

import { describe, expect, it } from 'vitest';
import { rig, type Rig } from './helpers';
import { buildWalker, WALKERS, type Walker } from '../../src/world/creature';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import type { Vec3 } from '../../src/doc/types';

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
    for (let seed = 1; seed <= 4; seed++) {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      let s = seed * 7919;
      const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      const n = 3 + Math.floor(rnd() * 4);
      const ids: string[] = [];
      let prev: ReturnType<Rig['part']> | null = null;
      for (let k = 0; k < n; k++) {
        const L = 0.04 + 0.08 * rnd();
        const p = r.part('block', { p: [k * 0.1, 1, 0], q: [0, 0, 0, 1] }, { material: rnd() < 0.5 ? 'polymer.pla' : 'aluminum.6061-t6', params: { x: L, y: 0.006, z: 0.006 } });
        ids.push(p.id);
        if (prev) {
          r.connect('servo', { part: prev, frame: { p: [0.05, 0, 0], q: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] } }, { part: p, frame: { p: [-0.05, 0, 0], q: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] } },
            { maxTorque: 0.1 + rnd() * 0.3, speed: 6 + rnd() * 6, range: 0.3 + rnd() * 0.6, rhythm: 0.5 + rnd() * 2.5, phase: rnd() * 6.28, pin: 0.003 });
        }
        prev = p;
      }
      r.run(0.5);
      const c0 = com(r, ids);
      r.run(4);
      const c1 = com(r, ids);
      expect(Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]), `seed ${seed}`).toBeLessThan(1e-3);
      r.done();
    }
  }, 300000);
});
