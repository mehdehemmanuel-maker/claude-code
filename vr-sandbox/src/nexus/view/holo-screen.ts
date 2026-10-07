// Screens of light an app is pulled out to: hold the trigger on an app on the phone and pull it off the phone, and the
// app opens on a screen of its own in the room, as large as a page, where you let go. It is the same app as on the
// phone, drawn again whenever the phone is, and pressed the same way: what you press on it is done there. Each is a
// window: carried by its bar, put away to the phone's Windows app, closed with ✕.
// It is drawn as a hologram: what is bright is solid, what is dark is seen through, with lines of light across it, a
// faint flicker, a glowing edge, and a beam up to it from a projector below.

import * as THREE from 'three';
import type { Phone, Surface } from './phone';

const W = 0.46, H = (W * 1143) / 540;
const VERT = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
uniform sampler2D map; uniform float time; uniform vec3 tint; uniform float born; varying vec2 vUv;
void main() {
  vec4 c = texture2D(map, vUv);
  float lum = max(max(c.r, c.g), c.b);
  float scan = 0.86 + 0.14 * sin(vUv.y * 820.0 - time * 5.0);
  float flick = 0.97 + 0.03 * sin(time * 37.0) * sin(time * 11.0);
  float ex = min(vUv.x, 1.0 - vUv.x) * ${W.toFixed(3)}, ey = min(vUv.y, 1.0 - vUv.y) * ${H.toFixed(3)}, e = min(ex, ey);
  float edge = 1.0 - smoothstep(0.0, 0.006, e);
  // it opens from a line across its middle, out to its height, in the first part of a second
  float open = smoothstep(0.0, 1.0, clamp((time - born) * 3.0, 0.0, 1.0));
  if (abs(vUv.y - 0.5) > open * 0.5) discard;
  vec3 col = c.rgb * tint * scan * flick + vec3(0.30, 0.85, 1.0) * edge;
  float a = clamp((0.22 + 1.25 * lum) * c.a, 0.0, 0.94) * scan + edge * 0.9;
  gl_FragColor = vec4(col, clamp(a, 0.0, 0.96));
  #include <colorspace_fragment>
}`;

interface Screen { id: string; app: string; s: Surface; root: THREE.Group; mesh: THREE.Mesh; mat: THREE.ShaderMaterial }

export class HoloScreens {
  private readonly list: Screen[] = [];
  private n = 0; private t = 0;
  constructor(private readonly phone: Phone, private readonly scene: THREE.Scene, private readonly host: { add(id: string, title: string, obj: THREE.Object3D): void; open(id: string): void; isOpen(id: string): boolean; remove?(id: string): void }) {}

  /** An app pulled out to a screen of its own, standing at a point and turned to face a point (your eyes). */
  spawn(app: string, at: THREE.Vector3, face: THREE.Vector3): string {
    const id = `holo:${app}:${++this.n}`, s = this.phone.surface(app);
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: s.tex }, time: { value: this.t }, born: { value: this.t }, tint: { value: new THREE.Color(0xbfefff) } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const root = new THREE.Group(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); mesh.renderOrder = 15; mesh.userData.holoScreen = id; root.add(mesh);
    // the projector below it, and its beam
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.018, 24), new THREE.MeshStandardMaterial({ color: 0x1a2630, metalness: 0.8, roughness: 0.3, emissive: 0x0a3d4a })); puck.position.y = -H / 2 - 0.16; root.add(puck);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.48, 0.03, 0.15, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = -H / 2 - 0.08; beam.scale.z = 0.08; root.add(beam);
    this.scene.add(root); this.place(root, at, face);
    this.list.push({ id, app, s, root, mesh, mat });
    this.host.add(id, `${this.phone.appName(app)} · screen`, root); this.host.open(id);
    return id;
  }
  /** Carried while it is being pulled out: where the ray now points, facing you. */
  move(id: string, at: THREE.Vector3, face: THREE.Vector3): void { const x = this.list.find((q) => q.id === id); if (x) this.place(x.root, at, face); }
  private place(root: THREE.Object3D, at: THREE.Vector3, face: THREE.Vector3): void { root.position.copy(at); root.lookAt(face.x, at.y, face.z); }
  /** How far along a ray the nearest screen is that it hits (Infinity where none). */
  distance(ray: THREE.Raycaster): number { const ms = this.list.filter((x) => x.root.visible).map((x) => x.mesh); return ray.intersectObjects(ms, false)[0]?.distance ?? Infinity; }
  /** A press where a ray hits a screen: done on that screen's app. */
  press(ray: THREE.Raycaster, renderer?: THREE.WebGLRenderer, scene?: THREE.Scene): boolean {
    const h = ray.intersectObjects(this.list.filter((x) => x.root.visible).map((x) => x.mesh), false)[0]; if (!h?.uv) return false;
    const x = this.list.find((q) => q.mesh === h.object); if (!x) return false;
    this.phone.pressAt(x.s, h.uv, renderer, scene); return true;
  }
  /** A screen's window closed: let go of. */
  closed(id: string): void { const i = this.list.findIndex((x) => x.id === id); if (i < 0) return; const [x] = this.list.splice(i, 1); this.phone.drop(x!.s); x!.root.parent?.remove(x!.root); x!.mat.dispose(); x!.mesh.geometry.dispose(); this.host.remove?.(id); }
  /** Each frame: the lines of light move, and a screen is seen only while its window is open. */
  update(dt: number): void { this.t += dt; for (const x of this.list) { x.mat.uniforms.time!.value = this.t; x.root.visible = this.host.isOpen(x.id); } }
  get count(): number { return this.list.length; }
  ids(): string[] { return this.list.map((x) => x.id); }
}
