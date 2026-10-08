// A made thing on its own, to be looked at: under daylight on a plain floor, framed whole from three-quarters in front,
// with nothing written on the page (&aim=x,y,z and &zoom=0.3 to look closely at one place). It is how a person first sees what was made, and how a judge who is told nothing
// is shown it. Read from the address: ?kit=<id>&words=<what was said>&seed=<n>&view=<front|side|rear|top|three>&perfect=0
// (perfect=0 skips the make pipeline, to see what the kit alone makes). Two of a surface modeller's views: &zebra=1 lights
// it with stripes reflected in its skin (each stripe the reflection of a bar of light: they run on smoothly only where the
// skin's tangent and curvature do, and kink or break at a fault), &draft=1 colours each panel by how it parts from its
// die (green parts cleanly, yellow barely, red is undercut). &only=<words> shows only the parts so named (a fender, its
// hood), to look at one panel on its own.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { KITS, makeKit } from '../kits';
import '../creatures';
import { perfect } from '../make/pipeline';
import { kitView } from './kit3d';
import { draft } from '../surface';

const q = new URLSearchParams(location.search), kit = KITS.find((k) => k.id === (q.get('kit') ?? 'car')) ?? KITS[0]!, words = q.get('words') ?? kit.name, seed = Number(q.get('seed') ?? 7);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xc9ccd0);
// a car studio: a dark room with softboxes (a long one overhead, strips either side, one in front and behind), so a
// painted skin shows its shape in the reflections of the lights, as a product photograph does
const studio = (): THREE.Scene => {
  const st = new THREE.Scene(), room = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), new THREE.MeshBasicMaterial({ color: 0x3a3d42, side: THREE.BackSide })); room.position.y = 6; st.add(room);
  const box = (w: number, h: number, at: [number, number, number], rot: [number, number, number], k: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide })); m.position.set(...at); m.rotation.set(...rot); st.add(m); };
  box(14, 4, [0, 13.5, 0], [Math.PI / 2, 0, 0], 4); for (const z of [-1, 1]) box(16, 1.2, [0, 4, z * 12], [0, 0, 0], 3); for (const x of [-1, 1]) box(1.5, 6, [x * 14, 4, 0], [0, Math.PI / 2, 0], 2.2); box(30, 0.4, [0, 0.4, -15], [0, 0, 0], 1.5);
  return st;
};
scene.environment = q.get('room') === '1' ? new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture : new THREE.PMREMGenerator(renderer).fromScene(studio(), 0.02).texture;
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(6, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; // (biased, or every curved skin shadows itself in fine rings: shadow acne) scene.add(sun, new THREE.HemisphereLight(0xdfe8f2, 0x6a645c, 0.3));
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xb8bbbf, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const made = makeKit(kit, words, seed), part = q.get('perfect') === '0' ? made.part : perfect(made.part, words).part, view = kitView(part, { maxLights: 0 });
scene.add(view.group);
// one panel on its own: everything not so named hidden
const only = q.get('only'); if (only) { const re = new RegExp(only, 'i'); view.group.updateMatrixWorld(true); const keep = new Set<THREE.Object3D>(); view.group.traverse((o) => { if (re.test(o.name)) { o.traverse((c) => keep.add(c)); for (let a = o.parent; a; a = a.parent) keep.add(a); } }); view.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && !keep.has(o)) o.visible = false; }); }
// the reflection of parallel bars of light in the skin: a stripe for each, by the reflected view ray's height
const zebraMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { k: { value: 9 } }, vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: 'uniform float k; varying vec3 vN; varying vec3 vP; void main(){ vec3 n = normalize(vN); vec3 v = normalize(vP - cameraPosition); if (dot(n, v) > 0.0) n = -n; vec3 r = reflect(v, n); float s = step(0.5, fract(r.y * k)); gl_FragColor = vec4(vec3(0.06 + 0.9 * s), 1.0); }' });
const draftMat = (pull: THREE.Vector3) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { d: { value: pull } }, vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 d; varying vec3 vN; void main(){ float g = dot(normalize(vN), d); vec3 c = g < 0.0 ? vec3(0.85,0.12,0.1) : g < 0.0175 ? vec3(0.95,0.8,0.1) : vec3(0.2,0.7,0.25); gl_FragColor = vec4(c * (0.55 + 0.45 * abs(g)), 1.0); }' });
if (q.get('zebra') === '1' || q.get('draft') === '1') {
  view.group.updateMatrixWorld(true);
  view.group.traverse((o) => {
    const m = o as THREE.Mesh, p = m.userData?.part as { shape?: { surf?: Parameters<typeof draft>[0] } } | undefined; if (!m.isMesh) return;
    if (q.get('zebra') === '1') { m.material = zebraMat; return; }
    // each panel in its own press: the pull its draft is best for, turned into the world
    const surf = p?.shape?.surf; if (surf) { const d = draft(surf).pull; m.material = draftMat(new THREE.Vector3(...d).transformDirection(m.matrixWorld)); }
  });
}
view.group.updateMatrixWorld(true); const box = new THREE.Box3(); view.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible) box.expandByObject(o); }); if (box.isEmpty()) box.setFromObject(view.group); const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), r = size.length() / 2;
const s = sun.shadow.camera as THREE.OrthographicCamera; s.left = s.bottom = -r * 1.5; s.right = s.top = r * 1.5; s.far = 60; s.updateProjectionMatrix(); sun.target.position.copy(c); scene.add(sun.target);
// a closer look: &aim=x,y,z looks at that point instead of the middle (with &zoom under 1 to come close)
const aim = q.get('aim'); if (aim) c.set(...(aim.split(',').map(Number) as [number, number, number]));
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 500), dirs: Record<string, THREE.Vector3> = { three: new THREE.Vector3(1, 0.42, 0.9), front: new THREE.Vector3(1, 0.15, 0), side: new THREE.Vector3(0, 0.12, 1), rear: new THREE.Vector3(-1, 0.4, -0.8), top: new THREE.Vector3(0.01, 1, 0.01) };
const d = (dirs[q.get('view') ?? 'three'] ?? dirs.three!).clone().normalize(), dist = r / Math.sin((camera.fov * Math.PI) / 360) * Number(q.get('zoom') ?? 1.05);
camera.position.copy(c).addScaledVector(d, dist); camera.lookAt(c); renderer.render(scene, camera);
(window as unknown as { lookReady: unknown }).lookReady = { parts: view.group.children.length, size: size.toArray().map((x) => +x.toFixed(2)) };
