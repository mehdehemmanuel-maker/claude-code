// Pooled particle effects: sparks (by real spark-test signature), dust, splash droplets and break debris.
// One instanced draw per effect family; no allocation per particle.

import * as THREE from 'three';
import type { Material, SparkClass } from '../data/materials';
import type { Vec3 } from '../doc/types';

interface P {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number;
  size: number;
  drag: number;
  gravity: number;
  burst: boolean;
  color: THREE.Color;
}

class Pool {
  readonly mesh: THREE.InstancedMesh;
  private ps: P[];
  private next = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private v = new THREE.Vector3();

  constructor(count: number, material: THREE.Material, geometry: THREE.BufferGeometry) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ps = Array.from({ length: count }, () => ({
      alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 0.01, drag: 0, gravity: 9.81, burst: false, color: new THREE.Color(),
    }));
    for (let i = 0; i < count; i++) {
      this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
      this.mesh.setColorAt(i, new THREE.Color(0));
    }
  }

  spawn(init: Partial<P> & { x: number; y: number; z: number }) {
    const p = this.ps[this.next]!;
    this.next = (this.next + 1) % this.ps.length;
    p.alive = true;
    p.x = init.x; p.y = init.y; p.z = init.z;
    p.vx = init.vx ?? 0; p.vy = init.vy ?? 0; p.vz = init.vz ?? 0;
    p.life = 0;
    p.max = init.max ?? 0.5;
    p.size = init.size ?? 0.006;
    p.drag = init.drag ?? 0.5;
    p.gravity = init.gravity ?? 9.81;
    p.burst = init.burst ?? false;
    p.color.copy(init.color ?? new THREE.Color(1, 1, 1));
  }

  update(dt: number, onBurst?: (p: P) => void) {
    let any = false;
    for (let i = 0; i < this.ps.length; i++) {
      const p = this.ps[i]!;
      if (!p.alive) continue;
      any = true;
      p.life += dt;
      if (p.life >= p.max) {
        p.alive = false;
        this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vz *= k; p.vy = p.vy * k - p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.002) { p.y = 0.002; p.vy = -p.vy * 0.3; p.vx *= 0.6; p.vz *= 0.6; }
      if (p.burst && p.life > p.max * 0.55) { p.burst = false; onBurst?.(p); }
      const fade = 1 - p.life / p.max;
      // stretch sparks along velocity (motion streaks)
      this.v.set(p.vx, p.vy, p.vz);
      const speed = this.v.length();
      if (speed > 0.5) this.q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), this.v.normalize());
      else this.q.identity();
      this.s.set(p.size * fade, p.size * fade * Math.max(1, speed * 0.015 / p.size), p.size * fade);
      this.m.compose(new THREE.Vector3(p.x, p.y, p.z), this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, p.color);
    }
    if (any) {
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }
}

const SPARK: Record<SparkClass, { color: number; life: number; speed: number; burst: boolean } | null> = {
  'low-carbon': { color: 0xffb347, life: 0.55, speed: 4.5, burst: false },
  'high-carbon': { color: 0xffe28a, life: 0.45, speed: 5, burst: true },
  stainless: { color: 0xff8a3d, life: 0.28, speed: 3.5, burst: false },
  'cast-iron': { color: 0xff6b35, life: 0.25, speed: 2.5, burst: false },
  titanium: { color: 0xffffff, life: 0.8, speed: 6, burst: false },
  none: null,
};

export class Particles {
  readonly group = new THREE.Group();
  private sparks: Pool;
  private dust: Pool;
  private tmpColor = new THREE.Color();
  enabled = true;

  constructor() {
    const box = new THREE.BoxGeometry(1, 1, 1);
    this.sparks = new Pool(400, new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }), box);
    this.dust = new Pool(300, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.8 }), box);
    this.group.add(this.sparks.mesh, this.dust.mesh);
  }

  update(dt: number) {
    this.sparks.update(dt, (p) => {
      // high-carbon steel sparks fork into bursts part-way along their path
      for (let i = 0; i < 4; i++) {
        this.sparks.spawn({ x: p.x, y: p.y, z: p.z, vx: p.vx * 0.3 + rand(1.5), vy: p.vy * 0.3 + rand(1.5), vz: p.vz * 0.3 + rand(1.5), max: 0.15, size: 0.003, color: p.color, drag: 2 });
      }
    });
    this.dust.update(dt);
  }

  /** Metal-on-metal impact or grinding: spark colour and structure depend on the alloy. */
  sparksFor(m: Material, at: Vec3, normal: Vec3, intensity: number) {
    const s = SPARK[m.sparks];
    if (!s || !this.enabled) return;
    const n = Math.min(40, Math.round(4 + intensity * 12));
    const c = this.tmpColor.setHex(s.color);
    for (let i = 0; i < n; i++) {
      const sp = s.speed * (0.4 + Math.random() * 0.8) * Math.min(2, 0.5 + intensity);
      this.sparks.spawn({
        x: at[0], y: at[1], z: at[2],
        vx: (normal[0] + rand(1)) * sp, vy: (normal[1] + rand(1) + 0.3) * sp, vz: (normal[2] + rand(1)) * sp,
        max: s.life * (0.5 + Math.random() * 0.8), size: 0.004, color: c, drag: 1.2, burst: s.burst && Math.random() < 0.35,
      });
    }
  }

  dustFor(m: Material, at: Vec3, intensity: number) {
    if (!this.enabled) return;
    const n = Math.min(24, Math.round(3 + intensity * 6));
    const c = this.tmpColor.setHex(m.color).lerp(new THREE.Color(0xcfc6b8), 0.5);
    for (let i = 0; i < n; i++) {
      this.dust.spawn({ x: at[0], y: at[1] + 0.005, z: at[2], vx: rand(0.6), vy: Math.random() * 0.5, vz: rand(0.6), max: 0.6 + Math.random() * 0.6, size: 0.006 + Math.random() * 0.01, color: c, drag: 3.5, gravity: 1.2 });
    }
  }

  splash(at: Vec3, speed: number, size: number) {
    if (!this.enabled) return;
    const n = Math.min(60, Math.round(10 + speed * size * 30));
    const c = this.tmpColor.setHex(0xcfe9ff);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = size * (0.3 + Math.random() * 0.6);
      this.dust.spawn({ x: at[0] + Math.cos(a) * r, y: at[1], z: at[2] + Math.sin(a) * r, vx: Math.cos(a) * speed * 0.3, vy: speed * (0.4 + Math.random() * 0.6), vz: Math.sin(a) * speed * 0.3, max: 0.8, size: 0.008, color: c, drag: 0.4 });
    }
  }

  debris(m: Material, at: Vec3, count: number) {
    if (!this.enabled) return;
    const c = this.tmpColor.setHex(m.color);
    for (let i = 0; i < count; i++) {
      this.dust.spawn({ x: at[0], y: at[1], z: at[2], vx: rand(2), vy: Math.random() * 2.5, vz: rand(2), max: 1.6, size: 0.004 + Math.random() * 0.012, color: c, drag: 0.3 });
    }
  }
}

const rand = (s: number) => (Math.random() * 2 - 1) * s;
