// A made thing on its own, to be looked at: under daylight on a plain floor, framed whole from three-quarters in front,
// with nothing written on the page. It is how a person first sees what was made, and how a judge who is told nothing
// is shown it. Read from the address: ?kit=<id>&words=<what was said>&seed=<n>&view=<front|side|rear|top|three>&perfect=0
// (perfect=0 skips the make pipeline, to see what the kit alone makes).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { KITS, makeKit } from '../kits';
import '../creatures';
import { perfect } from '../make/pipeline';
import { kitView } from './kit3d';

const q = new URLSearchParams(location.search), kit = KITS.find((k) => k.id === (q.get('kit') ?? 'car')) ?? KITS[0]!, words = q.get('words') ?? kit.name, seed = Number(q.get('seed') ?? 7);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xc9ccd0);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun, new THREE.HemisphereLight(0xdfe8f2, 0x6a645c, 0.6));
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xb8bbbf, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const made = makeKit(kit, words, seed), part = q.get('perfect') === '0' ? made.part : perfect(made.part, words).part, view = kitView(part, { maxLights: 0 });
scene.add(view.group);
const box = new THREE.Box3().setFromObject(view.group), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), r = size.length() / 2;
const s = sun.shadow.camera as THREE.OrthographicCamera; s.left = s.bottom = -r * 1.5; s.right = s.top = r * 1.5; s.far = 60; s.updateProjectionMatrix(); sun.target.position.copy(c); scene.add(sun.target);
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.01, 500), dirs: Record<string, THREE.Vector3> = { three: new THREE.Vector3(1, 0.42, 0.9), front: new THREE.Vector3(1, 0.15, 0), side: new THREE.Vector3(0, 0.12, 1), rear: new THREE.Vector3(-1, 0.4, -0.8), top: new THREE.Vector3(0.01, 1, 0.01) };
const d = (dirs[q.get('view') ?? 'three'] ?? dirs.three!).clone().normalize(), dist = r / Math.sin((camera.fov * Math.PI) / 360) * Number(q.get('zoom') ?? 1.05);
camera.position.copy(c).addScaledVector(d, dist); camera.lookAt(c); renderer.render(scene, camera);
(window as unknown as { lookReady: unknown }).lookReady = { parts: view.group.children.length, size: size.toArray().map((x) => +x.toFixed(2)) };
