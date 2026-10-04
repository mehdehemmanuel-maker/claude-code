// The body Claude has in the room: a base on two driven wheels and a caster, a torso, two arms of two links each with a
// gripper, and a head that senses. On the head are a lidar that turns and casts rays at what is around it, marking
// where each one strikes, and a camera eye whose view cone points at what it is attending to. A ring of light on the
// chest lights while it speaks. It drives on the floor, turns before it moves, and reaches with two-link inverse
// kinematics (the law of cosines). It is a projection, like everything in the viewer: it does what the timeline asks.

import * as THREE from 'three';

const metal = new THREE.MeshStandardMaterial({ color: 0x2b3340, metalness: 0.8, roughness: 0.35 });
const shell = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 0.2, roughness: 0.4 });
const glowOf = (c: number, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 });

export interface Arm { root: THREE.Group; upper: THREE.Group; fore: THREE.Group; grip: THREE.Group; L1: number; L2: number }

export class Robot {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  readonly lidar = new THREE.Group();
  readonly arms: [Arm, Arm];
  private readonly wheels: THREE.Mesh[] = [];
  private readonly voice: THREE.Mesh;
  private readonly visor: THREE.Mesh;
  private readonly cone: THREE.Mesh;
  private readonly rays: THREE.LineSegments;
  private readonly hits: THREE.Points;
  private readonly raycaster = new THREE.Raycaster();
  private heading = 0;

  constructor() {
    const r = this.root;
    // base: a drum on two wheels and a caster, with a light at its rim
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.12, 40), metal);
    base.position.y = 0.11; r.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.008, 8, 60), glowOf(0x4dd0e1, 1.8));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.09; r.add(rim);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
      w.rotation.z = Math.PI / 2; w.position.set(s * 0.24, 0.08, 0); r.add(w); this.wheels.push(w);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.045, 16), glowOf(0x4dd0e1, 0.8));
      hub.rotation.z = Math.PI / 2; hub.position.copy(w.position); r.add(hub);
    }
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), metal);
    caster.position.set(0, 0.035, 0.16); r.add(caster);
    // torso: a column and a chest
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.55, 24), metal);
    column.position.y = 0.45; r.add(column);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.2), shell);
    chest.position.y = 0.86; r.add(chest);
    this.voice = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 10, 40), glowOf(0x4dd0e1, 0.4));
    this.voice.position.set(0, 0.88, -0.102); r.add(this.voice);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), glowOf(0xffffff, 1.2));
    core.position.set(0, 0.88, -0.101); core.rotation.y = Math.PI; r.add(core);
    // arms: shoulder, upper link, elbow, forearm, gripper
    const arm = (side: number): Arm => {
      const root = new THREE.Group(); root.position.set(side * 0.21, 0.96, -0.02); r.add(root);
      root.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), metal));
      const upper = new THREE.Group(); root.add(upper);
      const L1 = 0.3, L2 = 0.28;
      const u = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, L1, 16), shell); u.rotation.x = Math.PI / 2; u.position.z = L1 / 2; upper.add(u);
      const fore = new THREE.Group(); fore.position.z = L1; upper.add(fore);
      fore.add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 12), metal));
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.03, L2, 16), shell); f.rotation.x = Math.PI / 2; f.position.z = L2 / 2; fore.add(f);
      const grip = new THREE.Group(); grip.position.z = L2; fore.add(grip);
      for (const g of [-1, 1]) { const finger = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.06), metal); finger.position.set(g * 0.02, 0, 0.03); grip.add(finger); }
      grip.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), glowOf(0x4dd0e1, 2)));
      return { root, upper, fore, grip, L1, L2 };
    };
    this.arms = [arm(-1), arm(1)];
    // head: on a neck, a visor of light, a camera eye with its view cone, a lidar that turns
    this.head.position.y = 1.12; r.add(this.head);
    this.head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), metal).translateY(-0.06));
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.17), shell);
    skull.position.y = 0.03; this.head.add(skull);
    this.visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.01), glowOf(0x4dd0e1, 2.2));
    this.visor.position.set(0, 0.04, -0.088); this.head.add(this.visor);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 16), glowOf(0xff5252, 1.5));
    lens.rotation.x = Math.PI / 2; lens.position.set(0.07, -0.01, -0.09); this.head.add(lens);
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    this.cone.rotation.x = Math.PI / 2; this.cone.position.set(0.07, -0.01, -0.39); this.head.add(this.cone);
    this.lidar.position.y = 0.13; this.head.add(this.lidar);
    this.lidar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.04, 24), metal));
    this.lidar.add(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.012), glowOf(0xff1744, 2)).translateZ(-0.048));
    // what the lidar senses: rays and where they strike
    this.rays = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.35 }));
    this.hits = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xff8a80, size: 0.012 }));
    this.rays.frustumCulled = false; this.hits.frustumCulled = false;
  }

  /** The sensing it draws in the world (not on its body): add once to the scene. */
  get senses(): THREE.Object3D[] { return [this.rays, this.hits]; }

  /** Stand at (x, z) facing the heading (radians, 0 = −z); wheels turn by how far it rolled. */
  pose(x: number, z: number, heading: number): void {
    const dx = x - this.root.position.x, dz = z - this.root.position.z, rolled = Math.hypot(dx, dz) + Math.abs(heading - this.heading) * 0.24;
    this.root.position.set(x, 0, z);
    this.root.rotation.y = heading;
    this.heading = heading;
    for (const w of this.wheels) w.rotation.x += rolled / 0.08;
  }

  /** Point an arm's gripper at a point in the world, bending at the elbow so it reaches no further than it is long. */
  reach(i: 0 | 1, target: THREE.Vector3 | null): void {
    const a = this.arms[i];
    if (!target) { a.upper.rotation.set(1.25, 0, 0); a.fore.rotation.set(-0.9, 0, 0); a.root.rotation.set(0, 0, 0); return; }
    a.root.rotation.set(0, 0, 0);
    a.root.updateWorldMatrix(true, false);
    const local = a.root.worldToLocal(target.clone());
    const d = Math.min(a.L1 + a.L2 - 1e-3, Math.max(0.05, local.length()));
    // aim the upper link at the target, then bend: the law of cosines gives both angles
    a.upper.lookAt(target);
    const alpha = Math.acos((a.L1 ** 2 + d ** 2 - a.L2 ** 2) / (2 * a.L1 * d));
    const beta = Math.PI - Math.acos((a.L1 ** 2 + a.L2 ** 2 - d ** 2) / (2 * a.L1 * a.L2));
    a.upper.rotateX(-alpha);
    a.fore.rotation.set(beta, 0, 0);
  }

  /** Look at a point: the head turns to it, and the view cone with it. */
  look(target: THREE.Vector3 | null): void {
    if (!target) { this.head.rotation.set(0, 0, 0); return; }
    this.head.lookAt(target); this.head.rotateY(Math.PI);
  }

  /** Its voice: the chest ring lights with how loud it speaks, 0 to 1. */
  speaking(level: number): void {
    (this.voice.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + 2.6 * level;
    this.voice.scale.setScalar(1 + 0.25 * level);
    (this.visor.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6 + 1.2 * level;
  }

  /** Turn the lidar and cast its rays at what is in `world`, marking where each strikes. */
  sense(time: number, world: THREE.Object3D[], eye: THREE.Camera): void {
    this.raycaster.camera = eye;
    this.lidar.rotation.y = time * 6;
    const origin = new THREE.Vector3(); this.lidar.getWorldPosition(origin);
    const lines: number[] = [], pts: number[] = [];
    const n = 40;
    for (let k = 0; k < n; k++) {
      const a = time * 6 + (k / n) * Math.PI * 2, tilt = -0.32 - 0.25 * Math.sin(k * 1.7 + time);
      const dir = new THREE.Vector3(Math.sin(a) * Math.cos(tilt), Math.sin(tilt), Math.cos(a) * Math.cos(tilt)).normalize();
      this.raycaster.set(origin, dir); this.raycaster.far = 3;
      const hit = this.raycaster.intersectObjects(world, true).find((h) => (h.object as THREE.Mesh).isMesh);
      const end = hit ? hit.point : origin.clone().addScaledVector(dir, origin.y / Math.max(0.05, -dir.y));
      lines.push(origin.x, origin.y, origin.z, end.x, end.y, end.z);
      pts.push(end.x, end.y, end.z);
    }
    this.rays.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.hits.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  }
}
