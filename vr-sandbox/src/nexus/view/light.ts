// How the forge room is lit, and the one light in it that casts a shadow.
//
// It is a small file because it is one concern and it was buried in the middle of the longest file in the tree, which
// is how it came to be half-built: the renderer's shadow map was switched on in one round and no light was ever told
// to cast into it, so every `castShadow` in every room did nothing at all and a blind judge said twice, of two
// different rooms, that everything in them "reads as hovering". A shadow needs three things that live in three
// places — the map on the renderer, `castShadow` on a light, `castShadow` on a mesh — and this file owns the second.
//
// The box a directional light shadows is 10 m wide at the origin by default. The forge's own table is at the origin,
// but the works stands 34 m away and the warehouse further still, so the box is widened to 28 m and moved over
// whatever is being looked at, once a frame. That is cheaper than a second light and it never runs out of room.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** The room's light: a soft environment, a sky, a key that casts and a cool fill. Its `keyFollow` takes where the eye
 *  is looking and moves the shadow box there, which the render loop calls each frame. */
export function lightRoom(scene: THREE.Scene, renderer: THREE.WebGLRenderer, params: URLSearchParams): { key: THREE.DirectionalLight; keyFollow: (at: THREE.Vector3) => void } {
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = Number(params.get('env') ?? 0.4);
  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0b1218, Number(params.get('sky') ?? 0.3)));
  const key = new THREE.DirectionalLight(0xffffff, Number(params.get('key') ?? 0.8));
  key.position.set(1.2, 3.5, 1.8); scene.add(key); scene.add(key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { near: 0.5, far: 80, left: -14, right: 14, top: 14, bottom: -14 });
  key.shadow.camera.updateProjectionMatrix();
  const fill = new THREE.DirectionalLight(0x80deea, 0.5); fill.position.set(-2, 1.5, -1); scene.add(fill);
  const off = new THREE.Vector3(6, 18, 9);
  return { key, keyFollow: (at) => { key.target.position.copy(at); key.position.copy(at).add(off); } };
}
