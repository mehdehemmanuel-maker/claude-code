// Parts as they are made, drawn: a block as a box, a round bar or tube as a turned profile, a socket head cap screw as
// its shank and its head (ISO 4762: head diameter 1.5 d, height d), a nut as a hexagon, a run of wire or belt as a tube
// along its points. Each part gets its own material so a check can light the one it found a flaw in.

import * as THREE from 'three';
import type { Part } from '../embody/part';

const metallic = (m: string) => /steel|alumin|brass|bronze|copper|stainless|NdFeB|iron|nickel/i.test(m);
const clear = (m: string) => /polycarbonate/i.test(m);

/** The material a part is drawn in: its colour, metal or not, the guard clear. */
export function materialOf(p: Part): THREE.MeshStandardMaterial {
  const colour = p.colour ?? (metallic(p.material) ? 0xb0bec5 : 0x607d8b);
  const m = new THREE.MeshStandardMaterial({ color: colour, metalness: metallic(p.material) ? 0.75 : 0.1, roughness: metallic(p.material) ? 0.35 : 0.7 });
  if (clear(p.material)) { m.transparent = true; m.opacity = 0.1; m.depthWrite = false; m.color.set(0x80deea); }
  return m;
}

const toAxis = (g: THREE.BufferGeometry, axis: 'x' | 'y' | 'z') => { if (axis === 'x') g.rotateZ(-Math.PI / 2); else if (axis === 'z') g.rotateX(Math.PI / 2); return g; };
const AXIS = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/** A turned profile along y: a tube from its bore to its radius, or a bar. */
function turned(r: number, length: number, bore?: number): THREE.BufferGeometry {
  if (!bore || bore <= 0) return new THREE.CylinderGeometry(r, r, length, 28);
  const b = bore / 2, h = length / 2;
  return new THREE.LatheGeometry([new THREE.Vector2(b, -h), new THREE.Vector2(r, -h), new THREE.Vector2(r, h), new THREE.Vector2(b, h), new THREE.Vector2(b, -h)], 28);
}

/** The object a part is drawn as, placed where it is, its material on `.userData.material`. */
export function meshOfPart(p: Part): THREE.Object3D {
  const mat = materialOf(p);
  const s = p.shape;
  let obj: THREE.Object3D;
  if (s.kind === 'block') obj = new THREE.Mesh(new THREE.BoxGeometry(...s.size), mat);
  else if (s.kind === 'round') obj = new THREE.Mesh(toAxis(turned(s.r, s.length, s.bore), s.axis), mat);
  else if (s.kind === 'screw') {
    const d = Number(s.size.replace('M', '').replace('_', '.')) * 1e-3;
    const shank = new THREE.CylinderGeometry(d / 2, d / 2, s.length, 12);
    const head = new THREE.CylinderGeometry(0.75 * d, 0.75 * d, d, 16); head.translate(0, s.head * (s.length / 2 + d / 2), 0);
    const g = new THREE.Group();
    g.add(new THREE.Mesh(toAxis(shank, s.axis), mat), new THREE.Mesh(toAxis(head, s.axis), mat));
    obj = g;
  } else if (s.kind === 'nut') {
    const d = Number(s.size.replace('M', '').replace('_', '.')) * 1e-3;
    obj = new THREE.Mesh(toAxis(new THREE.CylinderGeometry(0.9 * d, 0.9 * d, 0.8 * d, 6), s.axis), mat);
  } else {
    const pts = s.points.map((q) => new THREE.Vector3(...q));
    const curve = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.2) : new THREE.LineCurve3(pts[0]!, pts[1] ?? pts[0]!.clone().add(new THREE.Vector3(0, 1e-3, 0)));
    obj = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(8, pts.length * 12), Math.max(s.r, 4e-4), 6, false), mat);
    obj.userData = { material: mat, part: p };
    return obj;
  }
  obj.position.set(...p.at);
  if (p.turn) obj.rotateOnAxis(AXIS[p.turn.axis], p.turn.angle);
  obj.userData = { material: mat, part: p };
  return obj;
}
