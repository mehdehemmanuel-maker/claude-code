// The user's real room from the headset's scene understanding (WebXR plane-detection and mesh-detection; on
// Quest these come from Space Setup). Turns what the frame reports into world-space surfaces for physics and
// rendering, only when the scan (or the room's placement in the world) actually changes.

import * as THREE from 'three';
import type { RoomSurface } from '../physics/protocol';

interface PlaneLike {
  planeSpace: XRSpace;
  polygon: ReadonlyArray<DOMPointReadOnly>;
  lastChangedTime: number;
  semanticLabel?: string;
}

interface MeshLike {
  meshSpace: XRSpace;
  vertices: Float32Array;
  indices: Uint32Array;
  lastChangedTime: number;
  semanticLabel?: string;
}

interface SceneFrame {
  detectedPlanes?: Set<PlaneLike>;
  detectedMeshes?: Set<MeshLike>;
  getPose(space: XRSpace, base: XRSpace): XRPose | undefined | null;
}

const mat = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();

export class RoomScanner {
  private ids = new WeakMap<object, string>();
  private content = new WeakMap<object, { t: number; sig: string }>();
  private next = 1;
  private lastCheck = -Infinity;
  private signature = '';
  /** Whether the session reports scene data at all (plane or mesh detection granted). */
  available = false;
  surfaces: RoomSurface[] = [];

  private idOf(o: object, prefix: string) {
    let id = this.ids.get(o);
    if (!id) {
      id = `${prefix}${this.next++}`;
      this.ids.set(o, id);
    }
    return id;
  }

  /** A cheap fingerprint of a surface's shape, recomputed only when the runtime says it changed. */
  private contentSig(o: PlaneLike | MeshLike, values: ArrayLike<number>, n: number) {
    const c = this.content.get(o);
    if (c && c.t === o.lastChangedTime) return c.sig;
    let sum = 0;
    for (let i = 0; i < values.length; i++) sum += values[i]! * ((i % 7) + 1);
    const sig = `${n}:${sum.toFixed(3)}`;
    this.content.set(o, { t: o.lastChangedTime, sig });
    return sig;
  }

  /**
   * New world-space surfaces when the scan or its placement changed (checked twice a second), else null.
   * `toWorld` maps the XR reference space into the world (the player rig); moving it re-places the room.
   */
  update(frame: XRFrame, ref: XRReferenceSpace, toWorld: THREE.Matrix4, now: number): RoomSurface[] | null {
    const f = frame as unknown as SceneFrame;
    const planes = f.detectedPlanes;
    const meshes = f.detectedMeshes;
    this.available = !!planes || !!meshes;
    if (!this.available || now - this.lastCheck < 500) return null;
    this.lastCheck = now;
    const place = (space: XRSpace) => {
      const pose = f.getPose(space, ref);
      if (!pose) return null;
      mat.fromArray(pose.transform.matrix).premultiply(toWorld).decompose(pos, quat, scl);
      return { p: [pos.x, pos.y, pos.z] as [number, number, number], q: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number] };
    };
    const found: { o: PlaneLike | MeshLike; kind: 'plane' | 'mesh'; id: string; pose: RoomSurface['pose'] }[] = [];
    const sig: string[] = [];
    for (const p of planes ?? []) {
      const pose = place(p.planeSpace);
      if (!pose || p.polygon.length < 3) continue;
      const id = this.idOf(p, 'plane');
      const flat: number[] = [];
      for (const pt of p.polygon) flat.push(pt.x, pt.z);
      found.push({ o: p, kind: 'plane', id, pose });
      sig.push(`${id}|${p.semanticLabel ?? ''}|${poseSig(pose)}|${this.contentSig(p, flat, flat.length)}`);
    }
    for (const m of meshes ?? []) {
      const pose = place(m.meshSpace);
      if (!pose || m.indices.length < 3) continue;
      const id = this.idOf(m, 'mesh');
      found.push({ o: m, kind: 'mesh', id, pose });
      sig.push(`${id}|${m.semanticLabel ?? ''}|${poseSig(pose)}|${this.contentSig(m, m.vertices, m.indices.length)}`);
    }
    const signature = sig.join(';');
    if (signature === this.signature) return null;
    this.signature = signature;
    this.surfaces = found.map(({ o, kind, id, pose }) => {
      const label = o.semanticLabel ?? '';
      if (kind === 'plane') {
        const polygon: number[] = [];
        for (const pt of (o as PlaneLike).polygon) polygon.push(pt.x, pt.z);
        return { id, kind, label, pose, polygon };
      }
      const m = o as MeshLike;
      return { id, kind, label, pose, vertices: Array.from(m.vertices), indices: Array.from(m.indices) };
    });
    return this.surfaces;
  }

  reset() {
    this.lastCheck = -Infinity;
    this.signature = '';
    this.surfaces = [];
  }
}

/** Pose rounded to what matters for a room (5 mm, ~0.1 degree), so tracking jitter does not rebuild colliders. */
function poseSig(pose: RoomSurface['pose']) {
  return `${pose.p.map((v) => Math.round(v / 0.005)).join(',')}/${pose.q.map((v) => Math.round(v / 0.001)).join(',')}`;
}

/** Surfaces a person would walk into or put things on (for the walk-mode "real furniture" view). */
export const isFurniture = (label: string) => !['floor', 'ceiling', 'wall', 'global mesh', 'window', 'door'].includes(label);
export const isWallLike = (label: string) => ['wall', 'window', 'door'].includes(label);
