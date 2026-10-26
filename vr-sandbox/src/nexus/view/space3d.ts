// What the nodes make, drawn in the space (src/nexus/view/space.ts): every thing wired into a "Show in space" node,
// placed as its assembly says (src/nexus/assembly.ts), drawn as one instanced mesh for each distinct piece and change, so
// a swarm of a hundred drones is a few draws, not thousands. A city of millions of pieces cannot all be drawn at once and
// need not be: what is too small on the screen to show its pieces is drawn as the box round it, and a thing too small to
// see is not drawn; come closer and it opens into its pieces. The level is worked out again when the view moves.

import * as THREE from 'three';
import { boundsOfAll, isAssembly, leavesOf, matrixOf, effective, type Assembly, type Override } from '../assembly';
import type { Part } from '../kits';
import { leafGeometry, leafMaterial } from './kit3d';

/** A thing to show, and which node shows it (so pressing it in the space chooses that node). */
export interface Shown { key: string; thing: Part | Assembly }
export interface ViewStats { instances: number; draws: number; boxes: number; hidden: number; ms: number }

const PIECE_PX = 2.5, OPEN_PX = 10, BUDGET = 250_000;
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const boxMats = new Map<number, THREE.MeshStandardMaterial>();
const boxMat = (c: number) => boxMats.get(c) ?? boxMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.1 })).get(c)!;
/** A thing's colour, seen from far off: its first piece's. */
const colourKept = new WeakMap<object, number>();
function colourOf(t: Part | Assembly): number {
  const was = colourKept.get(t); if (was !== undefined) return was;
  let c = 0x8a929c;
  if (isAssembly(t)) { for (const it of t.items) { c = it.over?.color ?? colourOf(it.of); break; } }
  else { const l = leavesOf(t)[0]; if (l) c = l.part.color ?? c; }
  colourKept.set(t, c); return c;
}

interface Batch { geo: THREE.BufferGeometry; mat: THREE.Material; m: number[]; owners: string[] }

export class SpaceView {
  readonly group = new THREE.Group();
  stats: ViewStats = { instances: 0, draws: 0, boxes: 0, hidden: 0, ms: 0 };
  private shown: Shown[] = []; private dirty = true; private lastCam = ''; private lastBuild = 0;
  private meshes = new Map<string, THREE.InstancedMesh>(); private owners = new Map<THREE.InstancedMesh, string[]>();
  private readonly sphere = new THREE.Sphere(); private readonly box = new THREE.Box3();

  /** The things to draw now. */
  show(things: Shown[]): void { this.shown = things; this.dirty = true; }
  /** The box round everything shown, in the space's frame. */
  bounds(): THREE.Box3 { const b = new THREE.Box3(); for (const s of this.shown) { const c = boundsOfAll(s.thing); if (!c.isEmpty()) b.union(c); } return b; }

  /** Drawn again where what is shown changed, or the view moved enough to change what opens (at most every 120 ms). */
  update(camera: THREE.PerspectiveCamera, heightPx: number, now: number): void {
    this.group.updateMatrixWorld();
    const e = camera.matrixWorld.elements, sig = `${e.map((x) => x.toFixed(3)).join(',')}|${this.group.matrixWorld.elements.map((x) => x.toPrecision(5)).join(',')}`;
    if (!this.dirty && (sig === this.lastCam || now - this.lastBuild < 120)) return;
    this.lastCam = sig; this.dirty = false; this.lastBuild = now; this.build(camera, heightPx);
  }

  private build(camera: THREE.PerspectiveCamera, heightPx: number): void {
    const t0 = performance.now(), batches = new Map<string, Batch>(), eye = camera.getWorldPosition(new THREE.Vector3());
    const px = (heightPx / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), world = this.group.matrixWorld;
    let count = 0, boxes = 0, hidden = 0;
    const add = (key: string, geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4, owner: string) => {
      let b = batches.get(key); if (!b) { b = { geo, mat, m: [], owners: [] }; batches.set(key, b); }
      for (const x of m.elements) b.m.push(x); b.owners.push(owner); count++;
    };
    /** How big a box looks from here, in pixels across. */
    const seen = (box: THREE.Box3, m: THREE.Matrix4): number => {
      this.box.copy(box).applyMatrix4(m).applyMatrix4(world); this.box.getBoundingSphere(this.sphere);
      const d = Math.max(1e-9, this.sphere.center.distanceTo(eye) - this.sphere.radius);
      return d <= 0 ? Infinity : (2 * this.sphere.radius * px) / d;
    };
    const asBox = (t: Part | Assembly, m: THREE.Matrix4, over: Override, owner: string) => {
      const b = boundsOfAll(t); if (b.isEmpty()) return;
      const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).max(new THREE.Vector3(1e-9, 1e-9, 1e-9));
      const col = over.color ?? colourOf(t);
      add(`box|${col}`, unitBox, boxMat(col), m.clone().multiply(new THREE.Matrix4().compose(c, new THREE.Quaternion(), s)), owner); boxes++;
    };
    const visit = (t: Part | Assembly, m: THREE.Matrix4, overs: Override[], owner: string): void => {
      const b = boundsOfAll(t), size = b.isEmpty() ? 0 : seen(b, m);
      if (size < 0.5) { hidden++; return; }
      const eff = effective(overs, t.name);
      if (count >= BUDGET || (isAssembly(t) ? size < OPEN_PX : size < PIECE_PX * 2)) { if (!eff.hide) asBox(t, m, eff, owner); return; }
      if (isAssembly(t)) { for (const it of t.items) visit(it.of, m.clone().multiply(matrixOf(it)), it.over ? [...overs, it.over] : overs, owner); return; }
      for (const l of leavesOf(t)) {
        const o = effective(overs, l.part.name); if (o.hide) continue;
        const geo = leafGeometry(l.part); if (!geo) continue;
        const mat = leafMaterial(l.part, o);
        add(`${geo.uuid}|${mat.uuid}`, geo, mat, m.clone().multiply(l.m), owner);
      }
    };
    for (const s of this.shown) visit(s.thing, new THREE.Matrix4(), [], s.key);
    // the meshes: kept and grown when they must be, so moving the view does not make them again
    const used = new Set<string>();
    for (const [key, b] of batches) {
      used.add(key); const n = b.owners.length; let mesh = this.meshes.get(key);
      if (!mesh || mesh.instanceMatrix.count < n) {
        if (mesh) { this.group.remove(mesh); mesh.dispose(); }
        mesh = new THREE.InstancedMesh(b.geo, b.mat, Math.max(16, 2 ** Math.ceil(Math.log2(n))));
        mesh.frustumCulled = false; this.meshes.set(key, mesh); this.group.add(mesh);
      }
      (mesh.instanceMatrix.array as Float32Array).set(b.m); mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.visible = true; mesh.boundingSphere = null; mesh.boundingBox = null;
      this.owners.set(mesh, b.owners);
    }
    for (const [key, mesh] of this.meshes) if (!used.has(key)) { mesh.count = 0; mesh.visible = false; }
    this.stats = { instances: count, draws: batches.size, boxes, hidden, ms: performance.now() - t0 };
  }

  /** The node whose thing a ray meets first, and where. */
  pick(ray: THREE.Raycaster): { key: string; point: THREE.Vector3; distance: number } | null {
    const vis = [...this.meshes.values()].filter((m) => m.visible && m.count > 0);
    const h = ray.intersectObjects(vis, false)[0]; if (!h || h.instanceId === undefined) return null;
    const key = this.owners.get(h.object as THREE.InstancedMesh)?.[h.instanceId]; return key ? { key, point: h.point, distance: h.distance } : null;
  }
}
