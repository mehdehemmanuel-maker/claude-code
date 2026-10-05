// An assembly lifted out of the machine as a hologram, in the air in front of you, the way a system is opened up on a
// workbench of light: it rises whole, turning, then unravels, its subsystems flying apart to a ring around where it
// was, each named, each part of each spread from its subsystem's centre. Pick a subsystem and it unravels in turn, down
// to the parts, each with the values that decided it and the laws they came from. Or have it built: the parts fly in
// from above, step by step, in the order the build law gives (src/nexus/embody/tree.ts): nothing after what encloses
// it, fasteners last.

import * as THREE from 'three';
import type { Part } from '../embody/part';
import type { BuildStep, TreeNode } from '../embody/tree';
import { card, label } from './holo';
import { meshOfPart } from './parts';

const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const TINTS = [0x4dd0e1, 0x80deea, 0xffd740, 0xff8a65, 0xb388ff, 0x69f0ae, 0x64b5f6, 0xf06292, 0xaed581, 0xffb74d];

interface Piece { part: Part; obj: THREE.Object3D; base: THREE.Vector3; out: THREE.Vector3; child: number; delay: number; mats: THREE.Material[] }
export type Pick = { kind: 'child'; node: TreeNode } | { kind: 'part'; part: Part } | null;

export class Unravel {
  readonly group = new THREE.Group();
  private readonly pivot = new THREE.Group();
  private pieces: Piece[] = [];
  private labels: THREE.Object3D[] = [];
  private node: TreeNode | null = null;
  private children: TreeNode[] = [];
  private mode: 'whole' | 'apart' | 'build' = 'whole';
  private t0 = 0;
  private steps: BuildStep[] = [];
  private stepAt = 0;
  readonly info = card(0.62, 0.62);
  /** What it is showing, for a caption: its path and how many parts. */
  get showing(): TreeNode | null { return this.node; }
  get building(): BuildStep | null { return this.mode === 'build' ? this.steps[Math.min(this.steps.length - 1, Math.floor(this.stepAt))] ?? null : null; }

  constructor(scene: THREE.Scene, at: THREE.Vector3, private readonly size = 0.62) {
    this.group.position.copy(at); this.group.add(this.pivot); this.group.visible = false; scene.add(this.group);
    this.info.mesh.position.set(size * 0.95, 0, 0); this.group.add(this.info.mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(size * 0.55, size * 0.565, 96), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -size * 0.42; this.group.add(ring);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(size * 0.55, 96), new THREE.MeshBasicMaterial({ color: 0x0a3a44, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    disk.rotation.x = -Math.PI / 2; disk.position.y = -size * 0.425; this.group.add(disk);
  }

  /** Lift a node of the tree out as a hologram, whole. */
  show(node: TreeNode, parts: Map<string, Part>, now: number): void {
    this.clear();
    this.node = node;
    this.children = node.children.length ? node.children : node.parts.map((id) => ({ id: `${node.id}/${id}`, name: parts.get(id)?.name ?? id, parts: [id], children: [] }));
    const ps = node.parts.map((id) => parts.get(id)).filter((p): p is Part => !!p);
    const box = new THREE.Box3();
    for (const p of ps) { const o = meshOfPart(p); o.updateMatrixWorld(true); box.expandByObject(o); }
    const centre = box.getCenter(new THREE.Vector3()), extent = Math.max(1e-3, ...box.getSize(new THREE.Vector3()).toArray());
    this.pivot.scale.setScalar((this.size * 0.62) / extent);
    this.pivot.position.copy(centre).multiplyScalar(-this.pivot.scale.x);
    const childOf = new Map<string, number>(); this.children.forEach((c, i) => { for (const id of c.parts) childOf.set(id, i); });
    const n = this.children.length, R = extent * 0.75;
    // where each subsystem goes when it is taken apart: a ring round the centre, in the plane facing you
    const centres = this.children.map((c) => { const b = new THREE.Box3(); for (const id of c.parts) { const p = parts.get(id); if (p) { const o = meshOfPart(p); o.updateMatrixWorld(true); b.expandByObject(o); } } return b.isEmpty() ? centre.clone() : b.getCenter(new THREE.Vector3()); });
    for (const p of ps) {
      const obj = meshOfPart(p), i = childOf.get(p.id) ?? 0, tint = TINTS[i % TINTS.length]!;
      const mats: THREE.Material[] = [];
      obj.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const m = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        o.material = m; mats.push(m);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
        o.add(e); mats.push(e.material as THREE.Material);
      });
      const base = obj.position.clone();
      const th = n > 1 ? (i / n) * Math.PI * 2 + Math.PI / 2 : 0, dir = new THREE.Vector3(Math.cos(th), Math.sin(th) * 0.75, 0);
      const out = base.clone().add(dir.multiplyScalar(n > 1 ? R : 0)).add(base.clone().sub(centres[i]!).multiplyScalar(n > 1 ? 0.55 : 1.4));
      this.pieces.push({ part: p, obj, base, out, child: i, delay: (n > 1 ? i * 0.09 : 0) + Math.random() * 0.25, mats });
      this.pivot.add(obj);
    }
    // the names, where each subsystem lands
    this.children.forEach((c, i) => {
      const th = n > 1 ? (i / n) * Math.PI * 2 + Math.PI / 2 : 0;
      const l = label(`${c.name}${c.parts.length > 1 ? ` · ${c.parts.length}` : ''}`, 0.022, '#e6fbff', 'rgba(4,30,40,0.75)');
      l.position.set(Math.cos(th) * this.size * 0.5, Math.sin(th) * this.size * 0.38 + 0.04, 0.02);
      l.visible = false; l.userData.child = i; this.group.add(l); this.labels.push(l);
    });
    this.mode = 'whole'; this.t0 = now; this.group.visible = true;
    this.drawInfo();
  }
  /** Take it apart in the air. */
  apart(now: number): void { if (!this.node) return; this.mode = 'apart'; this.t0 = now; this.drawInfo(); }
  /** Put it back together. */
  whole(now: number): void { if (!this.node) return; this.mode = 'whole'; this.t0 = now; this.drawInfo(); }
  /** Build it, step by step, from nothing. */
  build(steps: BuildStep[], now: number): void { if (!this.node) return; this.steps = steps; this.mode = 'build'; this.t0 = now; this.stepAt = 0; this.drawInfo(); }
  clear(): void {
    for (const p of this.pieces) this.pivot.remove(p.obj);
    for (const l of this.labels) this.group.remove(l);
    this.pieces = []; this.labels = []; this.node = null; this.children = []; this.steps = []; this.group.visible = false;
  }

  update(now: number, eye: THREE.Vector3, stepSeconds = 2.4): void {
    if (!this.node) return;
    // it faces you, turning slowly when whole
    const yaw = Math.atan2(eye.x - this.group.position.x, eye.z - this.group.position.z);
    this.group.rotation.y = yaw;
    this.pivot.rotation.y = this.mode === 'whole' ? (now - this.t0) * 0.35 : this.pivot.rotation.y * 0.9;
    const k = (now - this.t0);
    if (this.mode === 'build') {
      const was = Math.floor(this.stepAt);
      this.stepAt = Math.min(this.steps.length, k / stepSeconds);
      if (Math.floor(this.stepAt) !== was) this.drawInfo();
      const stepOf = new Map<string, number>(); this.steps.forEach((s, i) => { for (const id of s.parts) stepOf.set(id, i); });
      for (const p of this.pieces) {
        const si = stepOf.get(p.part.id) ?? this.steps.length, u = ease((k - si * stepSeconds - (p.delay % 0.3)) / 0.9);
        p.obj.visible = u > 0;
        p.obj.position.copy(p.base).addScaledVector(new THREE.Vector3(0, 1, 0.4), (1 - u) * 0.6 / this.pivot.scale.x * this.size);
        for (const m of p.mats) (m as THREE.MeshBasicMaterial).opacity = (m instanceof THREE.LineBasicMaterial ? 0.9 : 0.3) * (si === Math.floor(this.stepAt) ? 1.4 : 0.8);
      }
      for (const l of this.labels) l.visible = false;
      return;
    }
    const u0 = this.mode === 'apart' ? k : 1.6 - k;
    for (const p of this.pieces) {
      const u = ease((u0 - p.delay) / 1.2);
      p.obj.visible = true;
      // apart along a curve that swings toward you, back the same way
      p.obj.position.lerpVectors(p.base, p.out, u).add(new THREE.Vector3(0, 0, Math.sin(Math.PI * u) * 0.25 * this.size / this.pivot.scale.x));
      for (const m of p.mats) (m as THREE.MeshBasicMaterial).opacity = m instanceof THREE.LineBasicMaterial ? 0.85 : 0.22;
    }
    for (const l of this.labels) l.visible = this.mode === 'apart' && k > 1.0;
  }

  /** What a ray from your hand or the screen points at: a subsystem's name or one of its parts. */
  pick(ray: THREE.Raycaster): Pick {
    if (!this.node) return null;
    const hitL = ray.intersectObjects(this.labels, false)[0];
    if (hitL) return { kind: 'child', node: this.children[hitL.object.userData.child as number]! };
    const hits = ray.intersectObjects(this.pieces.map((p) => p.obj), true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object; while (o && !o.userData.part) o = o.parent;
      const piece = this.pieces.find((p) => p.obj === o);
      if (!piece || !piece.obj.visible) continue;
      const c = this.children[piece.child]!;
      return this.mode === 'apart' && c.parts.length > 1 ? { kind: 'child', node: c } : { kind: 'part', part: piece.part };
    }
    return null;
  }

  /** Light one part and say what it is, beside the hologram. */
  showPart(p: Part): void {
    for (const piece of this.pieces) for (const m of piece.mats) (m as THREE.MeshBasicMaterial).opacity = piece.part.id === p.id ? (m instanceof THREE.LineBasicMaterial ? 1 : 0.6) : (m instanceof THREE.LineBasicMaterial ? 0.35 : 0.08);
    this.info.draw(p.name, [{ text: `${p.material}${p.mass > 0 ? ` · ${(p.mass * 1e3).toPrecision(3)} g` : ''}`, color: '#a5f3ff', size: 0.95 }, ...p.values.slice(0, 7).map((v) => ({ text: `${v.name} = ${Number(v.value.toPrecision(3))} ${v.unit} · ${v.law}`, color: '#ffe082', size: 0.78 })), ...(p.values.length ? [] : [{ text: 'a stocked part: chosen by its size and rating, its law the one that chose it', color: '#7fb3c8', size: 0.8 }])], '#ffd740');
  }

  private drawInfo(): void {
    if (!this.node) return;
    if (this.mode === 'build') {
      const s = this.building, n = Math.min(this.steps.length, Math.floor(this.stepAt) + 1);
      this.info.draw(`BUILD · ${this.node.name} · step ${n} of ${this.steps.length}`, [
        ...(s ? [{ text: s.title, size: 1.05, color: '#ffffff' }, { text: s.says, size: 0.85, color: '#ffe082' }] : []),
        { text: 'inside out: nothing goes in after what encloses it; fasteners last, after what they join', size: 0.72, color: '#7fb3c8' },
        ...this.steps.slice(Math.max(0, n - 4), n - 1).map((x) => ({ text: `✓ ${x.n}. ${x.title}`, size: 0.72, color: '#69f0ae' })),
      ], '#ffb74d');
      return;
    }
    this.info.draw(`${this.node.name.toUpperCase()} · ${this.node.parts.length} parts`, [
      { text: this.mode === 'apart' ? 'apart: point at a subsystem to open it, at a part to read it' : 'whole: take it apart, or build it', size: 0.85, color: '#a5f3ff' },
      ...this.children.slice(0, 10).map((c, i) => ({ text: `● ${c.name}${c.parts.length > 1 ? ` (${c.parts.length})` : ''}`, size: 0.85, color: `#${(TINTS[i % TINTS.length]!).toString(16).padStart(6, '0')}` })),
    ], '#4dd0e1');
  }
}
