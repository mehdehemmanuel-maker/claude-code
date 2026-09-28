import initJolt from 'jolt-physics/wasm-compat';
import { PhysicsWorld, TICK } from '../../src/physics/world';
import { makeConnection, makePart, newDoc } from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import type { Connection, Part, Pose, SimSettings } from '../../src/doc/types';
import type { Params } from '../../src/schema/params';

let joltPromise: ReturnType<typeof initJolt> | null = null;
export const jolt = () => (joltPromise ??= initJolt());

export interface Rig {
  world: PhysicsWorld;
  part(kind: string, pose: Pose, opts?: { material?: string; params?: Params; frozen?: boolean }): Part;
  connect(kind: string, a: { part: Part; frame: Pose }, b: { part: Part; frame: Pose } | null, params?: Params): Connection;
  run(seconds: number, each?: (t: number) => void): void;
  pos(p: Part): [number, number, number];
  done(): void;
}

export async function rig(sim: Partial<SimSettings> = {}, floor = true): Promise<Rig> {
  const J = await jolt();
  const doc = newDoc('conformance', '2026-01-01T00:00:00Z');
  const settings = { ...doc.sim, airDrag: false, ...sim };
  const world = new PhysicsWorld(J, settings);
  const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
  if (floor) world.apply({ op: 'environment', boxes: [{ half: [50, 0.5, 50], pose: { p: [0, -0.5, 0], q: [0, 0, 0, 1] }, material: 'concrete.c30' }], materials });
  const ids = seededIds(123);
  return {
    world,
    part(kind, pose, opts = {}) {
      const p = makePart({ kind, pose, material: opts.material, params: opts.params, frozen: opts.frozen }, ids);
      world.apply({ op: 'upsertPart', part: p, material: getMaterial(p.material), keepLivePose: false });
      return p;
    },
    connect(kind, a, b, params) {
      const c = makeConnection({ kind, a: { part: a.part.id, frame: a.frame }, b: b ? { part: b.part.id, frame: b.frame } : null, params }, ids);
      world.apply({ op: 'upsertConnection', conn: c, materials });
      return c;
    },
    run(seconds, each) {
      const n = Math.round(seconds / TICK);
      for (let i = 0; i < n; i++) {
        world.step();
        each?.((i + 1) * TICK);
      }
    },
    pos(p) {
      return world.livePose(p.id)!.p;
    },
    done() {
      world.destroy();
    },
  };
}

export const at = (x: number, y: number, z: number, q: [number, number, number, number] = [0, 0, 0, 1]): Pose => ({ p: [x, y, z], q });

export const within = (actual: number, expected: number, rel: number) => {
  const err = Math.abs(actual - expected) / Math.abs(expected);
  if (!(err <= rel)) throw new Error(`expected ${actual} to be within ${(rel * 100).toFixed(2)}% of ${expected} (was ${(err * 100).toFixed(2)}%)`);
};
