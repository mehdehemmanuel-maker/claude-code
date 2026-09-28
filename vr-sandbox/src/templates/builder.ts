// Small helper for authoring builds in code (templates, tests). Produces ordinary documents.

import { getMaterial } from '../data/materials';
import { makeConnection, makePart, newDoc } from '../doc/commands';
import { seededIds, type IdSource } from '../doc/ids';
import { axisAngle, composePose, fromTo, normalize, qmul, relativePose, rotate, sub } from '../doc/math';
import type { BuildDoc, Connection, Part, Pose, Quat, Vec3 } from '../doc/types';
import { poolFluid } from '../physics/environment';
import type { Params } from '../schema/params';

export class BuildBuilder {
  readonly doc: BuildDoc;
  readonly ids: IdSource;

  constructor(name: string, seed: number) {
    this.doc = newDoc(name, '2026-09-28T00:00:00.000Z');
    this.doc.sim.fluids = [poolFluid()];
    this.ids = seededIds(seed);
  }

  part(kind: string, pose: Pose, opts: { material?: string; params?: Params; frozen?: boolean; name?: string } = {}): Part {
    const p = makePart({ kind, pose, ...opts }, this.ids);
    this.doc.parts[p.id] = p;
    this.doc.materials[p.material] ??= getMaterial(p.material);
    return p;
  }

  /** Connect two parts at one world pose (frame +Y = joint axis / A-to-B normal). b = null anchors to the world. */
  joint(kind: string, a: Part, b: Part | null, world: Pose, params?: Params): Connection {
    const c = makeConnection({
      kind,
      a: { part: a.id, frame: relativePose(a.pose, world) },
      b: b ? { part: b.id, frame: relativePose(b.pose, world) } : null,
      params,
    }, this.ids);
    this.doc.connections[c.id] = c;
    return c;
  }

  /** Two-point element (spring, rope, band) between world points pa on a and pb on b. */
  link(kind: string, a: Part, pa: Vec3, b: Part | null, pb: Vec3, params?: Params): Connection {
    const dir = normalize(sub(pb, pa));
    const q = fromTo([0, 1, 0], dir);
    const c = makeConnection({
      kind,
      a: { part: a.id, frame: relativePose(a.pose, { p: pa, q }) },
      b: b ? { part: b.id, frame: relativePose(b.pose, { p: pb, q }) } : null,
      params,
    }, this.ids);
    this.doc.connections[c.id] = c;
    return c;
  }
}

export const P = (x: number, y: number, z: number, q: Quat = [0, 0, 0, 1]): Pose => ({ p: [x, y, z], q });

/** Frame whose +Y points along `dir`. */
export const along = (p: Vec3, dir: Vec3): Pose => ({ p, q: fromTo([0, 1, 0], normalize(dir)) });

/** Rotate a pose about a pivot point. */
export function rotateAbout(pose: Pose, pivot: Vec3, axis: Vec3, angle: number): Pose {
  const q = axisAngle(axis, angle);
  const rel = sub(pose.p, pivot);
  const r = rotate(q, rel);
  return { p: [pivot[0] + r[0], pivot[1] + r[1], pivot[2] + r[2]], q: qmul(q, pose.q) };
}

export { composePose, axisAngle };
