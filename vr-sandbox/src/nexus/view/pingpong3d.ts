// Table tennis drawn (src/nexus/pingpong.ts is it as numbers), in the game's own frame: x along the table (your end −x,
// the robot's +x), y up, z across. The table as the Laws have it, 2.74 by 1.525 m with its top 76 cm up, dark blue with a
// white line 2 cm wide round it and a 3 mm one down its middle; the net 15.25 cm high on its posts; the ball 40 mm across;
// your bat (a blade about 150 mm across, red rubber on one face and black on the other); the robot, an arm on a column at
// the far end with its own bat; and the score. Edges as things are made (src/nexus/finish.ts).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { edgeRadius } from '../finish';
import { TT, type Rally, type V3 } from '../pingpong';
import { filletCyl } from './kit3d';

const std = (c: number, rough = 0.6, metal = 0, more: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, ...more });
const rbox = (w: number, h: number, d: number, mat: string, make?: 'pressed') => { const f = edgeRadius(mat, Math.min(w, h, d), make); return f > 1e-4 ? new RoundedBoxGeometry(w, h, d, 2, f) : new THREE.BoxGeometry(w, h, d); };

/** A bat: its blade's face square to its local x, its handle down its local −y; its face's middle at the origin. */
export function bat(front = 0xd8202a): THREE.Group {
  const g = new THREE.Group(), blade = new THREE.Mesh(filletCyl(0.075, 0.006, 0.075, 0.002, 28), std(0xc8a070, 0.7)); blade.rotation.z = Math.PI / 2; g.add(blade);
  for (const [s, c] of [[1, front], [-1, 0x141414]] as const) { const rub = new THREE.Mesh(new THREE.CylinderGeometry(0.074, 0.074, 0.002, 28), std(c, 0.85)); rub.rotation.z = Math.PI / 2; rub.position.x = s * 0.004; g.add(rub); }
  const handle = new THREE.Mesh(rbox(0.024, 0.1, 0.03, 'wood'), std(0x8a5a32, 0.7)); handle.position.y = -0.12; g.add(handle);
  return g;
}

export interface PingView { group: THREE.Group; ball: THREE.Mesh; robotBat: THREE.Group; update(R: Rally): void; dispose(): void }
export function pingView(): PingView {
  const group = new THREE.Group(); group.name = 'table tennis';
  const { L, W, top } = TT, add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; group.add(o); return o; };
  add(rbox(L, 0.025, W, 'wood'), std(0x1d3f7a, 0.55), 0, top - 0.0125, 0);
  const white = std(0xf2f2f2, 0.5);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(L, 0.001, 0.02), white, 0, top + 0.0005, s * (W / 2 - 0.01)); add(new THREE.BoxGeometry(0.02, 0.001, W), white, s * (L / 2 - 0.01), top + 0.0005, 0); }
  add(new THREE.BoxGeometry(L, 0.001, 0.003), white, 0, top + 0.0005, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(filletCyl(0.025, top - 0.03, 0.025, 0.004, 10), std(0x2a2a2e, 0.4, 0.6), sx * (L / 2 - 0.3), (top - 0.03) / 2, sz * (W / 2 - 0.15));
  // the net: mesh between posts 15.25 cm out past each side, a white tape along its top
  const nw = W + 2 * TT.netOver, net = add(new THREE.PlaneGeometry(nw, TT.net), std(0x10141c, 0.9, 0, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }), 0, top + TT.net / 2, 0); net.rotation.y = Math.PI / 2;
  add(new THREE.BoxGeometry(0.004, 0.015, nw), white, 0, top + TT.net - 0.0075, 0);
  for (const s of [-1, 1]) add(filletCyl(0.008, TT.net + 0.02, 0.008, 0.002, 8), std(0x2a2a2e, 0.4, 0.6), 0, top + (TT.net + 0.02) / 2, s * nw / 2);
  const ball = add(new THREE.SphereGeometry(TT.r, 18, 12), std(0xfff8ec, 0.4), 0, 0, 0); ball.castShadow = true;
  // the robot: a column at the far end, a two-link arm from its shoulder to its bat
  const steel = std(0x9aa0a6, 0.35, 0.8), orange = std(0xe86a1a, 0.5, 0.2), shoulder = new THREE.Vector3(L / 2 + 0.75, 1.15, 0);
  add(filletCyl(0.18, 0.06, 0.2, 0.01, 24), steel, shoulder.x, 0.03, 0); add(filletCyl(0.07, 1.1, 0.07, 0.01, 16), orange, shoulder.x, 0.58, 0); add(new THREE.SphereGeometry(0.09, 16, 12), steel, shoulder.x, shoulder.y, 0);
  const upper = add(new THREE.CapsuleGeometry(0.045, 0.5, 4, 10), orange, 0, 0, 0), fore = add(new THREE.CapsuleGeometry(0.04, 0.45, 4, 10), orange, 0, 0, 0), elbowBall = add(new THREE.SphereGeometry(0.06, 12, 8), steel, 0, 0, 0);
  const robotBat = bat(0x1f6fd1); group.add(robotBat);
  const link = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => { m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); };
  // the score, on a board behind the robot
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const ctx = cv.getContext('2d')!, tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: tex })); board.position.set(L / 2 + 2.6, 2.1, 0); board.rotation.y = -Math.PI / 2; group.add(board);
  let shown = '';
  const update = (R: Rally) => {
    ball.position.set(...R.ball.p); ball.visible = R.live || R.server === 'you';
    // the arm: shoulder to elbow to the bat, the elbow out to the side and up (two links of 0.6 and 0.55 m)
    const hand = new THREE.Vector3(...R.robot.at), d = hand.clone().sub(shoulder), l = Math.min(d.length(), 1.14), a = 0.6, b = 0.55;
    const cosA = Math.min(1, Math.max(-1, (a * a + l * l - b * b) / (2 * a * l))), dir = d.clone().normalize(), up = new THREE.Vector3(0, 1, 0).sub(dir.clone().multiplyScalar(dir.y)).normalize();
    const elbow = shoulder.clone().addScaledVector(dir, a * cosA).addScaledVector(up, a * Math.sqrt(1 - cosA * cosA));
    link(upper, shoulder, elbow); link(fore, elbow, hand); elbowBall.position.copy(elbow);
    robotBat.position.copy(hand); robotBat.rotation.set(0, Math.PI, 0.2);
    const line = `${R.score.you}–${R.score.robot}|${R.games.you}–${R.games.robot}|${R.server}`;
    if (line !== shown) {
      shown = line; ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, 512, 256); ctx.textAlign = 'center';
      ctx.fillStyle = '#9ad8ff'; ctx.font = 'bold 34px sans-serif'; ctx.fillText('YOU', 128, 52); ctx.fillStyle = '#ffb070'; ctx.fillText('ROBOT', 384, 52);
      ctx.fillStyle = '#f2f2f2'; ctx.font = 'bold 120px sans-serif'; ctx.fillText(String(R.score.you), 128, 180); ctx.fillText(String(R.score.robot), 384, 180);
      ctx.font = '26px sans-serif'; ctx.fillText(`games ${R.games.you}–${R.games.robot} · ${R.server === 'you' ? 'your' : "robot's"} serve`, 256, 236); tex.needsUpdate = true;
    }
  };
  return { group, ball, robotBat, update, dispose: () => group.traverse((x) => { const m = x as THREE.Mesh; m.geometry?.dispose(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((y) => y.dispose()); else mat?.dispose(); }) };
}
export type { V3 };
