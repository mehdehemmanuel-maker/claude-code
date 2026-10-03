import initJolt from 'jolt-physics/wasm-compat';
import { PhysicsWorld, TICK } from '../../src/physics/world';
import { makeConnection, makePart, newDoc } from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import type { Connection, Part, Pose, SimSettings } from '../../src/doc/types';
import type { Params } from '../../src/schema/params';
import { DocStore } from '../../src/doc/store';
import { ConstructionRefused } from '../../src/ganglia/tree/gate';
import { construct, type Build } from '../../src/construct/build';
import type { Quat, Vec3 } from '../../src/doc/types';

let joltPromise: ReturnType<typeof initJolt> | null = null;
export const jolt = () => (joltPromise ??= initJolt());

export interface Rig {
  world: PhysicsWorld;
  part(kind: string, pose: Pose, opts?: { material?: string; params?: Params; frozen?: boolean }): Part;
  connect(kind: string, a: { part: Part; frame: Pose }, b: { part: Part; frame: Pose } | null, params?: Params): Connection;
  /**
   * Parts and joints as one construction, judged whole when it closes (a clamp and the body it grips share space only
   * by the clamp's bore, which is known once the joint is): what the world's intake refuses is thrown here.
   */
  construct(parts: { kind: string; pose: Pose; material?: string; params?: Params; frozen?: boolean }[], conns: { kind: string; a: { part: number; frame: Pose }; b: { part: number; frame: Pose } | null; params?: Params }[]): { parts: Part[]; conns: Connection[] };
  run(seconds: number, each?: (t: number) => void): void;
  /** Change simulation settings mid-run (e.g. gravity as a constant body force). */
  setSim(patch: Partial<SimSettings>): void;
  pos(p: Part): [number, number, number];
  done(): void;
}

export async function rig(sim: Partial<SimSettings> = {}, floor = true): Promise<Rig> {
  const J = await jolt();
  const doc = newDoc('conformance', '2026-01-01T00:00:00Z');
  let settings = { ...doc.sim, airDrag: false, ...sim };
  const world = new PhysicsWorld(J, settings);
  const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
  if (floor) world.apply({ op: 'environment', boxes: [{ half: [50, 0.5, 50], pose: { p: [0, -0.5, 0], q: [0, 0, 0, 1] }, material: 'concrete.c30' }], materials });
  const ids = seededIds(123);
  return {
    world,
    // raw data into the world: what the world's own intake refuses is thrown here, as it would be anywhere
    part(kind, pose, opts = {}) {
      const p = makePart({ kind, pose, material: opts.material, params: opts.params, frozen: opts.frozen }, ids);
      const r = world.apply({ op: 'upsertPart', part: p, material: getMaterial(p.material), keepLivePose: false });
      if (r) throw new ConstructionRefused(r);
      return p;
    },
    connect(kind, a, b, params) {
      const c = makeConnection({ kind, a: { part: a.part.id, frame: a.frame }, b: b ? { part: b.part.id, frame: b.frame } : null, params }, ids);
      const r = world.apply({ op: 'upsertConnection', conn: c, materials });
      if (r) throw new ConstructionRefused(r);
      return c;
    },
    construct(partSpecs, connSpecs) {
      const parts = partSpecs.map((o) => makePart({ kind: o.kind, pose: o.pose, material: o.material, params: o.params, frozen: o.frozen }, ids));
      const conns = connSpecs.map((c) => makeConnection({ kind: c.kind, a: { part: parts[c.a.part]!.id, frame: c.a.frame }, b: c.b ? { part: parts[c.b.part]!.id, frame: c.b.frame } : null, params: c.params }, ids));
      const r = world.apply({ op: 'construct', parts: parts.map((p) => ({ part: p, material: getMaterial(p.material) })), conns: conns.map((conn) => ({ conn, materials })) });
      if (r) throw new ConstructionRefused(r);
      return { parts, conns };
    },
    run(seconds, each) {
      const n = Math.round(seconds / TICK);
      for (let i = 0; i < n; i++) {
        world.step();
        each?.((i + 1) * TICK);
      }
    },
    setSim(patch) {
      settings = { ...settings, ...patch };
      world.apply({ op: 'sim', sim: settings });
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

/**
 * A machine said in the constructor's language (src/construct/build.ts), built into a document through its gate and
 * then put into the rig's world through the world's intake: the only way a powered thing gets into a test.
 */
export function machine<T>(r: Rig, fn: (b: Build) => T, at: Vec3 = [0, 0, 0], q: Quat = [0, 0, 0, 1], tag = 'm'): { out: T; store: DocStore; parts: string[]; joints: string[] } {
  const store = new DocStore(newDoc('machine'));
  let parts: string[] = [], joints: string[] = [];
  const out = construct(store, 'machine', at, q, tag, (b) => { const o = fn(b); parts = b.parts; joints = b.joints; return o; });
  const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
  const res = r.world.apply({ op: 'construct', parts: parts.map((id) => ({ part: store.doc.parts[id]!, material: getMaterial(store.doc.parts[id]!.material) })), conns: joints.map((id) => ({ conn: store.doc.connections[id]!, materials })) });
  if (res) throw new ConstructionRefused(res);
  return { out, store, parts, joints };
}
