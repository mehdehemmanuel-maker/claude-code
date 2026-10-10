// The body Claude has in the room: a base on two driven wheels and a caster, a torso, two arms of two links each with a
// gripper, and a head that senses. On the head are a lidar that turns and casts rays at what is around it, marking
// where each one strikes, and a camera eye whose view cone points at what it is attending to. A ring of light on the
// chest lights while it speaks. It drives on the floor, turns before it moves, and reaches with two-link inverse
// kinematics (the law of cosines). It is a projection, like everything in the viewer: it does what the timeline asks.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { QServo } from '../substrate/motion';
import type { Expression } from '../world/emotions';

const metal = new THREE.MeshStandardMaterial({ color: 0x2b3340, metalness: 0.85, roughness: 0.32 });
const gun = new THREE.MeshStandardMaterial({ color: 0x161b22, metalness: 0.7, roughness: 0.45 });
const shell = new THREE.MeshStandardMaterial({ color: 0xe7ecf2, metalness: 0.15, roughness: 0.35 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.95 });
const amber = new THREE.MeshStandardMaterial({ color: 0xff9f1c, metalness: 0.3, roughness: 0.5 });
const glass = new THREE.MeshStandardMaterial({ color: 0x0a1a24, metalness: 0.9, roughness: 0.08 });
const glowOf = (c: number, i = 1.4) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.3 });
const cyan = glowOf(0x4dd0e1, 1.6);
/** A seam or a slot: a thin dark inset on a surface. */
const seam = (w: number, h: number, d = 0.004) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), gun);
/** A joint's actuator: a housing along x, its end caps, its bolt circle and a ring of light where it turns. */
function actuator(r: number, len: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28), metal); body.rotation.z = Math.PI / 2; g.add(body);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.9, len * 0.18, 28), shell); cap.rotation.z = Math.PI / 2; cap.position.x = s * len * 0.58; g.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, r * 0.07, 8, 32), cyan); ring.rotation.y = Math.PI / 2; ring.position.x = s * len * 0.5; g.add(ring);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, 0.004, 8), gun); b.rotation.z = Math.PI / 2; b.position.set(s * len * 0.68, Math.sin(a) * r * 0.55, Math.cos(a) * r * 0.55); g.add(b); }
  }
  return g;
}
/** A cable run along points, sheathed. */
const cable = (pts: THREE.Vector3[], r = 0.006, m: THREE.Material = amber) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, r, 8), m);

export interface Arm { root: THREE.Group; upper: THREE.Group; fore: THREE.Group; grip: THREE.Group; L1: number; L2: number }

export class Robot {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  readonly lidar = new THREE.Group();
  readonly arms: [Arm, Arm];
  private readonly wheels: THREE.Object3D[] = [];
  private readonly voice: THREE.Mesh;
  private readonly visor: THREE.Mesh;
  private readonly cone: THREE.Mesh;
  private readonly rays: THREE.LineSegments;
  private readonly hits: THREE.Points;
  private readonly raycaster = new THREE.Raycaster();
  private heading = 0;

  constructor() {
    const r = this.root;
    // base: a rounded skirt on two driven wheels and a caster, a rubber bumper, vents, a sensor window, a light at its foot
    const skirt = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.03], [0.235, 0.03], [0.245, 0.05], [0.245, 0.12], [0.232, 0.16], [0.2, 0.172], [0.0, 0.172]].map(([x, y]) => new THREE.Vector2(x, y)), 48), shell);
    r.add(skirt);
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.012, 48), gun); deck.position.y = 0.176; r.add(deck);
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.247, 0.012, 10, 64), rubber); bumper.rotation.x = Math.PI / 2; bumper.position.y = 0.07; r.add(bumper);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.236, 0.006, 8, 64), glowOf(0x4dd0e1, 1.8)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.035; r.add(rim);
    for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2 + 0.2; if (Math.abs(Math.sin(a)) > 0.93) continue; const v = seam(0.008, 0.045, 0.012); v.position.set(Math.sin(a) * 0.243, 0.115, Math.cos(a) * 0.243); v.rotation.y = a; r.add(v); }
    const window2 = new THREE.Mesh(new THREE.CylinderGeometry(0.247, 0.247, 0.026, 32, 1, true, Math.PI - 0.5, 1.0), glass); window2.position.y = 0.105; r.add(window2);
    for (let k = 0; k < 5; k++) { const a = Math.PI - 0.32 + k * 0.16, d = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), glowOf(k === 2 ? 0xff5252 : 0x4dd0e1, 2)); d.position.set(Math.sin(a) * 0.25, 0.105, Math.cos(a) * 0.25); r.add(d); }
    for (const s of [-1, 1]) {
      // a wheel: a tyre with its tread, a five-spoked hub, and the drive motor's cap
      const w = new THREE.Group(); w.position.set(s * 0.255, 0.085, 0); r.add(w); this.wheels.push(w);
      const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.02, 12, 40), rubber); tyre.rotation.y = Math.PI / 2; w.add(tyre);
      for (let k = 0; k < 20; k++) { const a = (k / 20) * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.008), rubber); t.position.set(0, Math.sin(a) * 0.086, Math.cos(a) * 0.086); t.rotation.x = -a; w.add(t); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.026, 32), metal); hub.rotation.z = Math.PI / 2; w.add(hub);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.07), shell); sp.position.x = s * 0.008; sp.rotation.x = a; w.add(sp); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.032, 20), glowOf(0x4dd0e1, 0.9)); cap.rotation.z = Math.PI / 2; w.add(cap);
    }
    const fork = new THREE.Group(); fork.position.set(0, 0.03, 0.17); r.add(fork);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.02), metal); leg.position.set(s * 0.016, 0.0, 0); fork.add(leg); }
    const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 20), rubber); cw.rotation.z = Math.PI / 2; cw.position.y = -0.004; fork.add(cw);
    // spine: stacked rings round a column, a sheathed conduit up its back
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.56, 28), gun); column.position.y = 0.45; r.add(column);
    for (let k = 0; k < 6; k++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.072 - k * 0.002, 0.075 - k * 0.002, 0.03, 28), k % 2 ? metal : shell); ring.position.y = 0.23 + k * 0.085; r.add(ring); }
    r.add(cable([new THREE.Vector3(0, 0.18, 0.09), new THREE.Vector3(0, 0.35, 0.1), new THREE.Vector3(0, 0.55, 0.085), new THREE.Vector3(0, 0.74, 0.11)], 0.012));
    // chest: a rounded shell with its seams, the ring of light it speaks with, and a power pack with fins on its back
    const chest = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.3, 0.21, 4, 0.045), shell); chest.position.y = 0.87; r.add(chest);
    for (const [w2, h2, x, y] of [[0.3, 0.004, 0, 0.96], [0.004, 0.12, -0.11, 0.8], [0.004, 0.12, 0.11, 0.8]] as const) { const sm = seam(w2, h2); sm.position.set(x, y, -0.106); r.add(sm); }
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 40), gun); bezel.rotation.x = Math.PI / 2; bezel.position.set(0, 0.87, -0.106); r.add(bezel);
    this.voice = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.01, 10, 48), glowOf(0x4dd0e1, 0.4));
    this.voice.position.set(0, 0.87, -0.114); r.add(this.voice);
    const core = new THREE.Mesh(new THREE.CircleGeometry(0.032, 32), glowOf(0xffffff, 1.2)); core.position.set(0, 0.87, -0.1135); core.rotation.y = Math.PI; r.add(core);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, d = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.003), cyan); d.position.set(Math.cos(a) * 0.068, 0.87 + Math.sin(a) * 0.068, -0.115); d.rotation.z = a; r.add(d); }
    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.22, 0.07, 3, 0.02), gun); pack.position.set(0, 0.86, 0.135); r.add(pack);
    for (let k = 0; k < 9; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.18, 0.02), metal); fin.position.set(-0.096 + k * 0.024, 0.86, 0.178); r.add(fin); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.008, 0.004), glowOf(0x69f0ae, 1.6)); bar.position.set(0, 0.985, 0.172); r.add(bar);
    // arms: a shoulder actuator, an upper link, an elbow actuator, a forearm with its cable, a wrist, a two-fingered hand
    const arm = (side: number): Arm => {
      const root = new THREE.Group(); root.position.set(side * 0.215, 0.96, -0.02); r.add(root);
      const sh = actuator(0.052, 0.07); root.add(sh);
      const upper = new THREE.Group(); root.add(upper);
      const L1 = 0.3, L2 = 0.28;
      const u = new THREE.Mesh(new RoundedBoxGeometry(0.058, 0.064, L1 - 0.07, 3, 0.02), shell); u.position.z = L1 / 2; upper.add(u);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.012, L1 - 0.12), gun); strip.position.z = L1 / 2; upper.add(strip);
      upper.add(cable([new THREE.Vector3(side * 0.034, 0.02, 0.04), new THREE.Vector3(side * 0.04, 0.025, L1 / 2), new THREE.Vector3(side * 0.034, 0.02, L1 - 0.04)], 0.005));
      const fore = new THREE.Group(); fore.position.z = L1; upper.add(fore);
      fore.add(actuator(0.04, 0.062));
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, L2 - 0.06, 20), shell); f.rotation.x = Math.PI / 2; f.position.z = L2 / 2; fore.add(f);
      fore.add(cable([new THREE.Vector3(0, -0.03, 0.03), new THREE.Vector3(0, -0.032, L2 / 2), new THREE.Vector3(0, -0.026, L2 - 0.04)], 0.004));
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.022, 24), metal); wrist.rotation.x = Math.PI / 2; wrist.position.z = L2 - 0.02; fore.add(wrist);
      const wring = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.003, 6, 24), cyan); wring.position.z = L2 - 0.01; fore.add(wring);
      const grip = new THREE.Group(); grip.position.z = L2; fore.add(grip);
      const palm = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.028, 0.03, 2, 0.008), gun); palm.position.z = 0.012; grip.add(palm);
      for (const g of [-1, 1]) {
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.018, 0.034), metal); p1.position.set(g * 0.018, 0, 0.042); grip.add(p1);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.016, 0.026), metal); p2.position.set(g * 0.014, 0, 0.07); p2.rotation.y = -g * 0.25; grip.add(p2);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.022), rubber); pad.position.set(g * 0.0085, 0, 0.072); pad.rotation.y = -g * 0.25; grip.add(pad);
      }
      grip.add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), glowOf(0x4dd0e1, 2)).translateZ(0.03));
      return { root, upper, fore, grip, L1, L2 };
    };
    this.arms = [arm(-1), arm(1)];
    // head: on a neck with its tendons, a rounded skull, a visor of light round its face, a camera eye in a barrel,
    // sensor pods at its sides, an antenna, and a lidar that turns on its crown
    this.head.position.y = 1.12; r.add(this.head);
    this.head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.09, 16), metal).translateY(-0.065));
    for (const s of [-1, 1]) this.head.add(cable([new THREE.Vector3(s * 0.04, -0.11, 0.02), new THREE.Vector3(s * 0.045, -0.07, 0.03), new THREE.Vector3(s * 0.04, -0.035, 0.02)], 0.005, gun));
    const skull = new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.16, 0.185, 4, 0.05), shell); skull.position.y = 0.03; this.head.add(skull);
    const face = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.075, 0.02, 3, 0.012), glass); face.position.set(0, 0.035, -0.088); this.head.add(face);
    this.visor = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.012, 0.004), glowOf(0x4dd0e1, 2.2));
    this.visor.position.set(0, 0.045, -0.1); this.head.add(this.visor);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.026, 24), gun); barrel.rotation.x = Math.PI / 2; barrel.position.set(0.07, 0.012, -0.1); this.head.add(barrel);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.006, 24), glowOf(0xff5252, 1.5)); lens.rotation.x = Math.PI / 2; lens.position.set(0.07, 0.012, -0.114); this.head.add(lens);
    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.0025, 6, 24), metal); lensRing.position.set(0.07, 0.012, -0.114); this.head.add(lensRing);
    for (const s of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 24), metal); pod.rotation.z = Math.PI / 2; pod.position.set(s * 0.135, 0.03, 0); this.head.add(pod);
      const pr = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.003, 6, 24), cyan); pr.rotation.y = Math.PI / 2; pr.position.set(s * 0.152, 0.03, 0); this.head.add(pr);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.09, 8), metal); mast.position.set(-0.08, 0.16, 0.04); this.head.add(mast);
    this.head.add(new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 8), glowOf(0xff9f1c, 2.4)).translateX(-0.08).translateY(0.208).translateZ(0.04));
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5252, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    this.cone.rotation.x = Math.PI / 2; this.cone.position.set(0.07, 0.012, -0.41); this.head.add(this.cone);
    this.lidar.position.y = 0.135; this.head.add(this.lidar);
    this.lidar.add(new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.05, 0.022, 32), gun));
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.028, 32), metal); dome.position.y = 0.024; this.lidar.add(dome);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.01, 0.006), glowOf(0xff1744, 2.2)); slit.position.set(0, 0.024, -0.041); this.lidar.add(slit);
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

  /** Look at a point: the head turns toward it as a servo turns, no faster than it may and easing in and out (it is
   *  stepped by `move`), tilted as it feels. */
  private headServo = new QServo(3.2, 9); private headWant = new THREE.Quaternion(); private tilt = { down: 0, side: 0 };
  look(target: THREE.Vector3 | null): void {
    const q = this.head.quaternion.clone();
    if (!target) this.head.rotation.set(0, 0, 0); else { this.head.lookAt(target); this.head.rotateY(Math.PI); }
    this.head.rotateX(this.tilt.down); this.head.rotateZ(this.tilt.side);
    this.headWant.copy(this.head.quaternion); this.head.quaternion.copy(q);
  }
  /** dt s of its joints: the head turned toward where it wants to look by its servo's profile. */
  move(dt: number): void {
    const left = this.head.quaternion.angleTo(this.headWant); if (left < 1e-4) return;
    const step = this.headServo.step(left, dt); this.head.quaternion.rotateTowards(this.headWant, step);
  }
  /** How it shows what it feels: its visor and chest light the colour of its feeling, its chest light beating at its
   *  pace, its head tilted and its body slumped or straight, a blink now and then. */
  private beat = 0; private blinkAt = 3;
  feel(x: Expression, t: number, dt: number): void {
    const visor = this.visor.material as THREE.MeshStandardMaterial, voice = this.voice.material as THREE.MeshStandardMaterial;
    const c = new THREE.Color(x.colour); visor.color.lerp(c, Math.min(1, dt * 2)); visor.emissive.lerp(c, Math.min(1, dt * 2)); voice.color.lerp(c, Math.min(1, dt * 2)); voice.emissive.lerp(c, Math.min(1, dt * 2));
    this.beat += dt * (x.bpm / 60); const pulse = Math.pow(Math.max(0, Math.sin(this.beat * Math.PI * 2)), 6);
    voice.emissiveIntensity = Math.max(voice.emissiveIntensity * 0.9, 0.35 + 0.9 * pulse);
    this.tilt.down += (x.tiltDown - this.tilt.down) * Math.min(1, dt * 1.5); this.tilt.side += (x.tiltSide - this.tilt.side) * Math.min(1, dt * 1.5);
    this.root.children[0] && (this.slumpTo(x.slump, dt));
    // a blink: the visor dims for a tenth of a second every few seconds
    if (t > this.blinkAt) { visor.emissiveIntensity = 0.2; if (t > this.blinkAt + 0.12) this.blinkAt = t + 2.5 + ((Math.sin(t * 7.3) + 1) * 2); } else visor.emissiveIntensity = Math.max(visor.emissiveIntensity, 1.6);
  }
  private slumped = 0;
  private slumpTo(to: number, dt: number): void { this.slumped += (to - this.slumped) * Math.min(1, dt * 1.2); this.head.position.y = 1.12 - this.slumped * 0.4; for (const a of this.arms) a.root.position.y = 0.96 - this.slumped * 0.25; }

  /** Its voice: the chest ring lights with how loud it speaks, 0 to 1. */
  private seen = 1;
  /** Seen through, to what it is standing in front of, while it is between you and the work. */
  fade(to: number): void {
    if (Math.abs(to - this.seen) < 0.005) return;
    const was = this.seen < 1; this.seen = to;
    this.root.traverse((o) => {
      if (o === this.cone || o === this.rays || o === this.hits) return;
      const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (!m || Array.isArray(m)) return;
      m.opacity = to; m.transparent = to < 1; m.depthWrite = to >= 1; if (was !== to < 1) m.needsUpdate = true;
    });
  }
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
