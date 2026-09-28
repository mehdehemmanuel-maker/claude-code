// The three.js scene: workshop, parts, connector glyphs, previews and overlays. It only displays state;
// the document and the physics own it.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Material } from '../data/materials';
import { getMaterial } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { effectiveParams, getPartKind } from '../parts/registry';
import { composePose, length, sub } from '../doc/math';
import type { BuildDoc, Connection, Part, Pose } from '../doc/types';
import { numberOf } from '../schema/params';
import { POOL, workshopEnvironment } from '../physics/environment';
import type { LiveState } from '../app/live';
import { buildVisual, helixGeometry } from './geometry';
import { ghostBadMaterial, ghostMaterial, highlighted, renderMaterial, stressMaterial, tintMaterial } from './materials';

export interface Pick {
  type: 'part' | 'conn' | 'env';
  id: string | null;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
}

interface PartView {
  root: THREE.Object3D;
  key: string;
  meshes: THREE.Mesh[];
  base: THREE.Material[];
}

interface ConnView {
  root: THREE.Object3D;
  key: string;
  dynamic: 'none' | 'spring' | 'rope' | 'band';
  meshes: THREE.Mesh[];
  base: THREE.Material[];
  ropeSegments?: THREE.Mesh[];
}

const tmpPose: Pose = { p: [0, 0, 0], q: [0, 0, 0, 1] };
const Y = new THREE.Vector3(0, 1, 0);

export class SceneView {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Player rig: moving/scaling this moves the viewer (also the XR reference space parent). */
  readonly rig = new THREE.Group();
  private parts = new Map<string, PartView>();
  private conns = new Map<string, ConnView>();
  private envMeshes: THREE.Mesh[] = [];
  private pickables: THREE.Object3D[] = [];
  private pickDirty = true;
  private selected = new Set<string>();
  private selectedConn: string | null = null;
  private hovered: string | null = null;
  private stressOn = false;
  private ghost: THREE.Object3D | null = null;
  private ghostKey = '';
  private markers = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  readonly sun: THREE.DirectionalLight;

  constructor(renderer: THREE.WebGLRenderer) {
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.01, 400);
    this.rig.add(this.camera);
    this.scene.add(this.rig);
    this.scene.background = new THREE.Color(0x1d2126);
    this.scene.fog = new THREE.Fog(0x1d2126, 40, 120);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.add(new THREE.HemisphereLight(0xdfe8f2, 0x3a3228, 0.9));
    this.sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
    this.sun.position.set(6, 12, 5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 40;
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(this.markers);
    this.buildEnvironment();
  }

  private buildEnvironment() {
    for (const box of workshopEnvironment()) {
      const m = getMaterial(box.material);
      const isFloor = box.half[0] > 20;
      const geo = new THREE.BoxGeometry(box.half[0] * 2, box.half[1] * 2, box.half[2] * 2);
      let mat: THREE.Material = renderMaterial(m);
      if (isFloor) {
        const tex = floorTexture();
        tex.repeat.set(box.half[0], box.half[2]);
        mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 });
      }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...box.pose.p);
      mesh.quaternion.set(...box.pose.q);
      mesh.receiveShadow = true;
      mesh.castShadow = !isFloor;
      mesh.userData.pick = { type: 'env', id: null };
      this.scene.add(mesh);
      this.envMeshes.push(mesh);
    }
    // water surface
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(POOL.w, POOL.d),
      new THREE.MeshStandardMaterial({ color: 0x2a6f9e, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.1, depthWrite: false }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(POOL.x, POOL.water, POOL.z);
    water.renderOrder = 2;
    this.scene.add(water);
    // back walls give a sense of place
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b4148, roughness: 0.95 });
    for (const [x, z, w, rot] of [[0, -14, 40, 0], [-20, 0, 28, Math.PI / 2]] as const) {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(w, 8), wallMat);
      wall.position.set(x, 4, z);
      wall.rotation.y = rot;
      wall.receiveShadow = true;
      this.scene.add(wall);
    }
  }

  resize(w: number, h: number) {
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------------------------------
  // document -> meshes

  syncParts(doc: BuildDoc, ids: Iterable<string> | 'all') {
    const list = ids === 'all' ? [...new Set([...this.parts.keys(), ...Object.keys(doc.parts)])] : [...ids];
    for (const id of list) {
      const part = doc.parts[id];
      const cur = this.parts.get(id);
      if (!part) {
        if (cur) { this.scene.remove(cur.root); this.parts.delete(id); this.pickDirty = true; }
        continue;
      }
      const mat = doc.materials[part.material] ?? getMaterial(part.material);
      const key = `${part.kind}|${part.material}|${JSON.stringify(part.params)}`;
      if (cur && cur.key === key) continue;
      if (cur) this.scene.remove(cur.root);
      const view = this.buildPart(part, mat, key);
      if (cur) view.root.position.copy(cur.root.position), view.root.quaternion.copy(cur.root.quaternion);
      else { view.root.position.set(...part.pose.p); view.root.quaternion.set(...part.pose.q); }
      this.scene.add(view.root);
      this.parts.set(id, view);
      this.pickDirty = true;
    }
    this.refreshHighlights();
  }

  private buildPart(part: Part, mat: Material, key: string): PartView {
    const kind = getPartKind(part.kind);
    const visual = kind.visual(effectiveParams(kind, part.params, mat));
    const root = new THREE.Group();
    const obj = buildVisual(visual, renderMaterial(mat), tintMaterial);
    root.add(obj);
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        m.userData.pick = { type: 'part', id: part.id };
        meshes.push(m);
      }
    });
    return { root, key, meshes, base: meshes.map((m) => m.material as THREE.Material) };
  }

  syncConnections(doc: BuildDoc, ids: Iterable<string> | 'all') {
    const list = ids === 'all' ? [...new Set([...this.conns.keys(), ...Object.keys(doc.connections)])] : [...ids];
    for (const id of list) {
      const c = doc.connections[id];
      const cur = this.conns.get(id);
      if (!c || c.state.status === 'broken') {
        if (cur) { this.scene.remove(cur.root); this.conns.delete(id); this.pickDirty = true; }
        continue;
      }
      const key = `${c.kind}|${JSON.stringify(c.params)}|${c.state.status}`;
      if (cur && cur.key === key) continue;
      if (cur) this.scene.remove(cur.root);
      const v = this.buildGlyph(c, key);
      this.scene.add(v.root);
      this.conns.set(id, v);
      this.pickDirty = true;
    }
    this.refreshHighlights();
  }

  private buildGlyph(c: Connection, key: string): ConnView {
    const kind = getConnectorKind(c.kind);
    const root = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos?: [number, number, number], rotX?: number) => {
      const m = new THREE.Mesh(geo, mat);
      if (pos) m.position.set(...pos);
      if (rotX) m.rotation.x = rotX;
      m.castShadow = true;
      m.userData.pick = { type: 'conn', id: c.id };
      root.add(m);
      return m;
    };
    const steel = tintMaterial(0xb8bec4);
    const dark = tintMaterial(0x33383d);
    const p = c.params;
    let dynamic: ConnView['dynamic'] = 'none';
    let ropeSegments: THREE.Mesh[] | undefined;
    switch (c.kind) {
      case 'bolted': {
        const d = sizeD(String(p['size'] ?? 'M8'));
        const n = Math.max(1, numberOf(p, 'count', 1));
        const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
        for (let i = 0; i < n; i++) {
          const [x, z] = spread(i, n, w, l);
          add(new THREE.CylinderGeometry(d * 0.85, d * 0.85, d * 0.65, 6), steel, [x, -d * 0.33, z]);
          add(new THREE.CylinderGeometry(d * 1.05, d * 1.05, d * 0.18, 16), steel, [x, -d * 0.05, z]);
        }
        break;
      }
      case 'screwed':
      case 'nailed':
      case 'riveted': {
        const d = numberOf(p, 'diameter', 0.004);
        const n = Math.max(1, Math.min(24, numberOf(p, 'count', 1)));
        const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
        for (let i = 0; i < n; i++) {
          const [x, z] = spread(i, n, w, l);
          add(new THREE.SphereGeometry(d * 1.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c.kind === 'riveted' ? tintMaterial(0xc6c9cc) : steel, [x, -d * 0.2, z], Math.PI);
        }
        break;
      }
      case 'weld': {
        const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03), leg = numberOf(p, 'leg', 0.005);
        const bead = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.5, 6, 24), tintMaterial(0x5b5046));
        bead.rotation.x = Math.PI / 2;
        bead.scale.set(w + leg, l + leg, leg * 2);
        bead.userData.pick = { type: 'conn', id: c.id };
        root.add(bead);
        break;
      }
      case 'glued':
      case 'soldered': {
        const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
        add(new THREE.BoxGeometry(w, 0.0015, l), new THREE.MeshStandardMaterial({ color: c.kind === 'glued' ? 0xe8c04a : 0xc7ccd1, transparent: true, opacity: 0.6, roughness: 0.2 }));
        break;
      }
      case 'fixed':
        add(new THREE.BoxGeometry(0.012, 0.012, 0.012), tintMaterial(0xd23fd6));
        break;
      case 'hinge':
      case 'bearing':
      case 'servo':
      case 'eddy-brake':
      case 'motor': {
        const d = numberOf(p, 'pin', numberOf(p, 'bore', 0.01));
        add(new THREE.CylinderGeometry(d / 2, d / 2, Math.max(0.03, d * 5), 16), steel);
        if (c.kind === 'motor') add(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 20), tintMaterial(0x2b5d8a), [0, -0.05, 0]);
        if (c.kind === 'servo') add(new THREE.BoxGeometry(0.04, 0.04, 0.02), tintMaterial(0x1c1f22), [0, -0.035, 0]);
        if (c.kind === 'eddy-brake') {
          const r = numberOf(p, 'radius', 0.05);
          for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.012, 0.02), tintMaterial(0xc23b22), [r, s * 0.01, 0]);
        }
        if (c.kind === 'bearing') add(new THREE.TorusGeometry(d * 0.9, d * 0.35, 8, 20), dark, [0, 0, 0], Math.PI / 2);
        break;
      }
      case 'slider':
        add(new THREE.BoxGeometry(0.012, Math.max(0.1, numberOf(p, 'max', 0.2) - numberOf(p, 'min', -0.2)), 0.012), steel, [0, (numberOf(p, 'max', 0.2) + numberOf(p, 'min', -0.2)) / 2, 0]);
        break;
      case 'ball':
        add(new THREE.SphereGeometry(numberOf(p, 'stud', 0.012) * 0.8, 16, 12), steel);
        break;
      case 'spring': {
        dynamic = 'spring';
        const D = numberOf(p, 'D', 0.02), d = numberOf(p, 'd', 0.002), Na = numberOf(p, 'Na', 10);
        add(helixGeometry(Math.round(Na + 2), D / 2, Math.max(d, 0.0008)), tintMaterial(0x9ea6ad));
        break;
      }
      case 'rope': {
        dynamic = 'rope';
        const d = Math.max(0.005, numberOf(p, 'diameter', 0.006)); // thin wire stays visible
        const mat = tintMaterial(String(p['grade']).includes('steel') ? 0x8f969c : String(p['grade']).includes('chain') ? 0x6d7277 : 0xd9c08a);
        ropeSegments = [];
        for (let i = 0; i < 8; i++) {
          const m = add(new THREE.CylinderGeometry(d / 2, d / 2, 1, 6), mat);
          ropeSegments.push(m);
        }
        break;
      }
      case 'band': {
        dynamic = 'band';
        add(new THREE.BoxGeometry(numberOf(p, 'width', 0.02), 1, numberOf(p, 'thickness', 0.0015) * 2), tintMaterial(0xd35b2a), [0, 0.5, 0]);
        break;
      }
      default:
        add(new THREE.SphereGeometry(0.01), tintMaterial(0xffffff));
    }
    void kind;
    const meshes: THREE.Mesh[] = [];
    root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
    return { root, key, dynamic, meshes, base: meshes.map((m) => m.material as THREE.Material), ropeSegments };
  }

  // ---------------------------------------------------------------------------------------------
  // per frame

  update(doc: BuildDoc, live: LiveState, overrides: Map<string, Pose>) {
    for (const [id, v] of this.parts) {
      const o = overrides.get(id);
      const pose = o ?? live.pose(id, tmpPose);
      if (pose) {
        v.root.position.set(pose.p[0], pose.p[1], pose.p[2]);
        v.root.quaternion.set(pose.q[0], pose.q[1], pose.q[2], pose.q[3]);
      }
    }
    for (const [id, v] of this.conns) {
      const c = doc.connections[id];
      if (!c) continue;
      const pa = this.partPose(c.a.part, live, overrides) ?? doc.parts[c.a.part]?.pose;
      if (!pa) continue;
      const wa = composePose(pa, c.a.frame);
      if (v.dynamic === 'none') {
        v.root.position.set(...wa.p);
        v.root.quaternion.set(...wa.q);
        continue;
      }
      const pb = c.b ? this.partPose(c.b.part, live, overrides) ?? doc.parts[c.b.part]?.pose : null;
      const wb = c.b && pb ? composePose(pb, c.b.frame) : wa;
      const a = new THREE.Vector3(...wa.p);
      const b = new THREE.Vector3(...wb.p);
      const dir = b.clone().sub(a);
      const L = dir.length();
      if (v.dynamic === 'rope' && v.ropeSegments) {
        const rest = numberOf(c.params, 'length', 0) || live.loads.get(id)?.extent || L;
        const slack = Math.max(0, (rest > 0 ? rest : L) - L);
        const sag = Math.min(0.5, Math.sqrt(Math.max(0, slack * L)) * 0.6);
        const n = v.ropeSegments.length;
        const at = (t: number) => a.clone().lerp(b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0));
        for (let i = 0; i < n; i++) {
          const p0 = at(i / n), p1 = at((i + 1) / n);
          const seg = v.ropeSegments[i]!;
          const d = p1.clone().sub(p0);
          seg.position.copy(p0).add(p1).multiplyScalar(0.5);
          seg.scale.set(1, Math.max(d.length(), 1e-4), 1);
          seg.quaternion.setFromUnitVectors(Y, d.normalize());
        }
        v.root.position.set(0, 0, 0);
        v.root.quaternion.identity();
        continue;
      }
      v.root.position.copy(a);
      if (L > 1e-6) v.root.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
      v.root.scale.set(1, Math.max(L, 1e-4), 1);
    }
  }

  private partPose(id: string, live: LiveState, overrides: Map<string, Pose>): Pose | null {
    return overrides.get(id) ?? live.pose(id);
  }

  // ---------------------------------------------------------------------------------------------
  // highlighting

  setSelection(parts: Iterable<string>, conn: string | null) {
    this.selected = new Set(parts);
    this.selectedConn = conn;
    this.refreshHighlights();
  }

  setHover(id: string | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.refreshHighlights();
  }

  setStressOverlay(on: boolean) {
    this.stressOn = on;
    this.refreshHighlights();
  }

  get stressOverlay() {
    return this.stressOn;
  }

  /** Recolour for the stress overlay (call at a few Hz). */
  applyStress(doc: BuildDoc, live: LiveState) {
    if (!this.stressOn) return;
    const partU = new Map<string, number>();
    for (const [id, v] of this.conns) {
      const u = live.loads.get(id)?.u ?? 0;
      const m = stressMaterial(u);
      for (const mesh of v.meshes) mesh.material = m;
      const c = doc.connections[id];
      if (c) {
        partU.set(c.a.part, Math.max(partU.get(c.a.part) ?? 0, u));
        if (c.b) partU.set(c.b.part, Math.max(partU.get(c.b.part) ?? 0, u));
      }
    }
    for (const [id, v] of this.parts) {
      const m = stressMaterial(partU.get(id) ?? 0);
      for (const mesh of v.meshes) mesh.material = m;
    }
  }

  private refreshHighlights() {
    for (const [id, v] of this.parts) {
      v.meshes.forEach((m, i) => {
        const base = v.base[i]!;
        m.material = this.selected.has(id) ? highlighted(base, 'select') : this.hovered === id ? highlighted(base, 'hover') : base;
      });
    }
    for (const [id, v] of this.conns) {
      v.meshes.forEach((m, i) => {
        const base = v.base[i]!;
        m.material = this.selectedConn === id ? highlighted(base, 'select') : this.hovered === id ? highlighted(base, 'hover') : base;
      });
    }
  }

  // ---------------------------------------------------------------------------------------------
  // ghost preview and markers

  showGhost(key: string, make: (() => THREE.Object3D) | null, pose: Pose | null, ok = true) {
    if (!make || !pose) {
      if (this.ghost) this.ghost.visible = false;
      return;
    }
    if (!this.ghost || this.ghostKey !== key) {
      if (this.ghost) this.scene.remove(this.ghost);
      this.ghost = make();
      this.ghost.traverse((o) => { if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).material = ghostMaterial; (o as THREE.Mesh).castShadow = false; } });
      this.ghostKey = key;
      this.scene.add(this.ghost);
    }
    this.ghost.visible = true;
    this.ghost.position.set(...pose.p);
    this.ghost.quaternion.set(...pose.q);
    this.ghost.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = ok ? ghostMaterial : ghostBadMaterial; });
  }

  /** Small markers (connect-tool first point, measurement ends). */
  setMarkers(points: THREE.Vector3[], color = 0x66b3ff) {
    while (this.markers.children.length > points.length) this.markers.remove(this.markers.children[this.markers.children.length - 1]!);
    while (this.markers.children.length < points.length) {
      this.markers.add(new THREE.Mesh(new THREE.SphereGeometry(0.008, 12, 8), new THREE.MeshBasicMaterial({ color, depthTest: false })));
    }
    points.forEach((p, i) => {
      const m = this.markers.children[i] as THREE.Mesh;
      m.position.copy(p);
      (m.material as THREE.MeshBasicMaterial).color.setHex(color);
      m.renderOrder = 10;
    });
  }

  // ---------------------------------------------------------------------------------------------
  // picking

  pick(origin: THREE.Vector3, direction: THREE.Vector3, far = 60): Pick | null {
    if (this.pickDirty) {
      this.pickables = [...this.envMeshes];
      for (const v of this.parts.values()) this.pickables.push(...v.meshes);
      for (const v of this.conns.values()) this.pickables.push(...v.meshes);
      this.pickDirty = false;
    }
    this.raycaster.set(origin, direction);
    this.raycaster.far = far;
    const hits = this.raycaster.intersectObjects(this.pickables, false);
    for (const h of hits) {
      const info = h.object.userData.pick as { type: Pick['type']; id: string | null } | undefined;
      if (!info) continue;
      const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      return { type: info.type, id: info.id, point: h.point.clone(), normal: n, distance: h.distance };
    }
    return null;
  }

  partObject(id: string) {
    return this.parts.get(id)?.root ?? null;
  }
}

function sizeD(size: string) {
  const m = /M(\d+)/.exec(size);
  return m ? Number(m[1]) / 1000 : 0.008;
}

function spread(i: number, n: number, w: number, l: number): [number, number] {
  if (n === 1) return [0, 0];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cx = i % cols, cz = Math.floor(i / cols);
  return [((cx + 0.5) / cols - 0.5) * w * 0.8, ((cz + 0.5) / rows - 0.5) * l * 0.8];
}

let floorTex: THREE.CanvasTexture | null = null;
function floorTexture() {
  if (floorTex) return floorTex;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#6f7275';
  g.fillRect(0, 0, 256, 256);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 3000; i++) {
    const v = 95 + Math.floor(rnd() * 40);
    g.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    g.globalAlpha = 0.25;
    g.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  g.globalAlpha = 1;
  g.strokeStyle = 'rgba(40,44,48,0.55)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(40,44,48,0.18)';
  g.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    g.beginPath(); g.moveTo(i * 25.6, 0); g.lineTo(i * 25.6, 256); g.stroke();
    g.beginPath(); g.moveTo(0, i * 25.6); g.lineTo(256, i * 25.6); g.stroke();
  }
  floorTex = new THREE.CanvasTexture(c);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.anisotropy = 8;
  return floorTex;
}

export { length, sub };
