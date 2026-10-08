// A made thing on its own, to be looked at: under daylight on a plain floor, framed whole from three-quarters in front,
// with nothing written on the page. It is how a person first sees what was made, how a judge who is told nothing is
// shown it, and the bench an elite critic works at: everything it may ask to see, and to know, is here.
// Read from the address: ?kit=<id>&words=<what was said>&seed=<n>&perfect=0 (perfect=0 skips the make pipeline)
//   where from   &view=<front|side|rear|top|three|under> or &dir=x,y,z (looked along, from the thing toward the camera),
//                &aim=x,y,z (looked at), &zoom=<share of the framing distance> or &dist=<m>, &cam=x,y,z (stand there),
//                &fov=<deg>
//   what         &only=<regex> (only the parts so named), &hi=<regexA;regexB…> (those parts coloured red, blue, green,
//                yellow), &ghost=1 (everything else faint), &explode=<levels> (taken apart that deep), &cut=<x|y|z><op><m>
//                (a cutaway: &cut=z<0 keeps the near half, &cut=x>1.2 the nose, drawn both sides so its inside shows)
//   how lit      &room=1 (a room's light instead of the studio's), &zebra=1 (stripes reflected in its skin: they run on
//                smoothly only where its tangent and curvature do), &draft=1 (each panel by how it parts from its die:
//                green cleanly, yellow barely, red undercut), &holes=1 (every part flat and opaque on magenta, and where
//                the magenta shows through the thing from inside its outline, painted green: a gap seen through)
//   tried        &rules=<JSON> and &lines=<JSON> try body rules and lines (src/nexus/panels.ts) on what is made, so a
//                critic can show what it would change
// And on window.look: parts() (each part drawn: name, holders, material, finish, colour, what it says of itself, its
// bounds), facts() (what the thing says of itself and its measured size), pick(x, y) (the part under a pixel),
// clash(touch) (every place two parts' surfaces cross or touch: src/nexus/make/critic.ts), gap(a, b) (the least distance
// between parts so named).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { KITS, makeKit } from '../kits';
import '../creatures';
import { perfect } from '../make/pipeline';
import { meshClashes, type TriMesh } from '../make/critic';
import { tryBody } from '../panels';
import { kitView } from './kit3d';
import { draft } from '../surface';

const q = new URLSearchParams(location.search), kit = KITS.find((k) => k.id === (q.get('kit') ?? 'car')) ?? KITS[0]!, words = q.get('words') ?? kit.name, seed = Number(q.get('seed') ?? 7);
const num3 = (s: string | null) => (s ? (s.split(',').map(Number) as [number, number, number]) : null);
// (a trial of rules or lines, before anything is made)
if (q.get('rules') || q.get('lines')) tryBody({ rules: q.get('rules') ? JSON.parse(q.get('rules')!) : undefined, lines: q.get('lines') ? JSON.parse(q.get('lines')!) : undefined });
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3; renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
const holes = q.get('holes') === '1';
const scene = new THREE.Scene(); scene.background = new THREE.Color(holes ? 0xff00ff : 0xc9ccd0);
// a car studio: a dark room with softboxes (a long one overhead, strips either side, one in front and behind), so a
// painted skin shows its shape in the reflections of the lights, as a product photograph does
const studio = (): THREE.Scene => {
  const st = new THREE.Scene(), room = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 40), new THREE.MeshBasicMaterial({ color: 0x3a3d42, side: THREE.BackSide })); room.position.y = 6; st.add(room);
  const box = (w: number, h: number, at: [number, number, number], rot: [number, number, number], k: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide })); m.position.set(...at); m.rotation.set(...rot); st.add(m); };
  box(14, 4, [0, 13.5, 0], [Math.PI / 2, 0, 0], 4); for (const z of [-1, 1]) box(16, 1.2, [0, 4, z * 12], [0, 0, 0], 3); for (const x of [-1, 1]) box(1.5, 6, [x * 14, 4, 0], [0, Math.PI / 2, 0], 2.2); box(30, 0.4, [0, 0.4, -15], [0, 0, 0], 1.5);
  return st;
};
scene.environment = q.get('room') === '1' ? new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture : new THREE.PMREMGenerator(renderer).fromScene(studio(), 0.02).texture;
// (biased, or every curved skin shadows itself in fine rings: shadow acne)
const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(6, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, new THREE.HemisphereLight(0xdfe8f2, 0x6a645c, 0.3));
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xb8bbbf, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const made = makeKit(kit, words, seed), part = q.get('perfect') === '0' ? made.part : perfect(made.part, words).part, view = kitView(part, { maxLights: 0 });
scene.add(view.group);
if (q.get('explode')) view.explode(Number(q.get('explode')));
view.group.updateMatrixWorld(true);
const meshes: THREE.Mesh[] = []; view.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.decor) meshes.push(o as THREE.Mesh); });
const pathOf = (o: THREE.Object3D) => { const n: string[] = []; for (let a: THREE.Object3D | null = o; a && a !== view.group; a = a.parent) n.unshift(a.name || '?'); return n.join('/'); };
// one panel on its own: everything not so named hidden
const only = q.get('only'); if (only) { const re = new RegExp(only, 'i'); const keep = new Set<THREE.Object3D>(); view.group.traverse((o) => { if (re.test(o.name)) { o.traverse((c) => keep.add(c)); for (let a = o.parent; a; a = a.parent) keep.add(a); } }); for (const m of meshes) if (!keep.has(m)) m.visible = false; }
// the reflection of parallel bars of light in the skin: a stripe for each, by the reflected view ray's height
const zebraMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { k: { value: 9 } }, vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }', fragmentShader: 'uniform float k; varying vec3 vN; varying vec3 vP; void main(){ vec3 n = normalize(vN); vec3 v = normalize(vP - cameraPosition); if (dot(n, v) > 0.0) n = -n; vec3 r = reflect(v, n); float s = step(0.5, fract(r.y * k)); gl_FragColor = vec4(vec3(0.06 + 0.9 * s), 1.0); }' });
const draftMat = (pull: THREE.Vector3) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { d: { value: pull } }, vertexShader: 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); }', fragmentShader: 'uniform vec3 d; varying vec3 vN; void main(){ float g = dot(normalize(vN), d); vec3 c = g < 0.0 ? vec3(0.85,0.12,0.1) : g < 0.0175 ? vec3(0.95,0.8,0.1) : vec3(0.2,0.7,0.25); gl_FragColor = vec4(c * (0.55 + 0.45 * abs(g)), 1.0); }' });
if (q.get('zebra') === '1' || q.get('draft') === '1') {
  for (const m of meshes) {
    const p = m.userData?.part as { shape?: { surf?: Parameters<typeof draft>[0] } } | undefined;
    if (q.get('zebra') === '1') { m.material = zebraMat; continue; }
    // each panel in its own press: the pull its draft is best for, turned into the world
    const surf = p?.shape?.surf; if (surf) { const d = draft(surf).pull; m.material = draftMat(new THREE.Vector3(...d).transformDirection(m.matrixWorld)); }
  }
}
// what is asked to be seen: some parts coloured, the rest faint
const HI = [0xff3b30, 0x2f7bff, 0x22c55e, 0xffcc00], his = (q.get('hi') ?? '').split(';').filter(Boolean).map((s) => new RegExp(s, 'i'));
if (his.length || q.get('ghost') === '1') {
  const faint = new THREE.MeshStandardMaterial({ color: 0xb0b4ba, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  for (const m of meshes) {
    const k = his.findIndex((re) => re.test(m.name) || re.test(pathOf(m)));
    if (k >= 0) m.material = new THREE.MeshStandardMaterial({ color: HI[k % HI.length], roughness: 0.5, side: THREE.DoubleSide, emissive: HI[k % HI.length], emissiveIntensity: 0.25 });
    else if (q.get('ghost') === '1') { m.material = faint; m.castShadow = false; }
  }
}
// a gap seen through: every part flat, opaque and both sided, in a colour of its own, on magenta
if (holes) { floor.visible = false; for (const m of meshes) { let h = 0; for (const ch of m.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; m.material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((h % 360) / 360, 0.35, 0.35 + ((h >> 9) % 30) / 100), side: THREE.DoubleSide }); } }
// a cutaway
const cut = (q.get('cut') ?? '').match(/^([xyz])([<>])(-?[\d.]+)$/);
if (cut) {
  const ax = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }[cut[1] as 'x' | 'y' | 'z'], v = Number(cut[3]), keepBelow = cut[2] === '<';
  renderer.clippingPlanes = [new THREE.Plane(keepBelow ? ax.clone().negate() : ax.clone(), keepBelow ? v : -v)];
  for (const m of meshes) { const mm = m.material as THREE.Material; if (!Array.isArray(mm)) { m.material = mm.clone(); (m.material as THREE.Material).side = THREE.DoubleSide; } }
}
const box = new THREE.Box3(); for (const m of meshes) if (m.visible) box.expandByObject(m); if (box.isEmpty()) box.setFromObject(view.group); const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), r = size.length() / 2;
const s = sun.shadow.camera as THREE.OrthographicCamera; s.left = s.bottom = -r * 1.5; s.right = s.top = r * 1.5; s.far = 60; s.updateProjectionMatrix(); sun.target.position.copy(c); scene.add(sun.target);
// a closer look: &aim=x,y,z looks at that point instead of the middle (with &zoom under 1, or &dist, to come close)
const aim = num3(q.get('aim')); if (aim) c.set(...aim);
const camera = new THREE.PerspectiveCamera(Number(q.get('fov') ?? 35), innerWidth / innerHeight, 0.005, 500), dirs: Record<string, THREE.Vector3> = { three: new THREE.Vector3(1, 0.42, 0.9), front: new THREE.Vector3(1, 0.15, 0), side: new THREE.Vector3(0, 0.12, 1), rear: new THREE.Vector3(-1, 0.4, -0.8), top: new THREE.Vector3(0.01, 1, 0.01), under: new THREE.Vector3(0.2, -1, 0.3) };
const dq = num3(q.get('dir')), d = (dq ? new THREE.Vector3(...dq) : (dirs[q.get('view') ?? 'three'] ?? dirs.three!).clone()).normalize(), dist = q.get('dist') ? Number(q.get('dist')) : (r / Math.sin((camera.fov * Math.PI) / 360)) * Number(q.get('zoom') ?? 1.05);
const cam = num3(q.get('cam')); if (cam) camera.position.set(...cam); else camera.position.copy(c).addScaledVector(d, dist);
// (from under the floor, the floor is not there: what is underneath is what is looked at)
if (camera.position.y < 0.02) floor.visible = false;
camera.lookAt(c); renderer.render(scene, camera);

// ---- what the critic may ask ----
const hex = (m: THREE.Mesh) => { const col = (m.material as THREE.MeshStandardMaterial).color; return col ? `#${col.getHexString()}` : undefined; };
const worldTris = (m: THREE.Mesh): TriMesh => { const g = m.geometry, P = g.getAttribute('position'), out = new Float32Array(P.count * 3), v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; } return { name: m.name, path: pathOf(m.parent ?? m), pos: out, idx: g.getIndex()?.array, mat: (m.userData.part as { mat?: string } | undefined)?.mat, holder: (m.parent?.parent?.userData.part as { mat?: string } | undefined)?.mat, weld: (m.userData.part as { finish?: string } | undefined)?.finish === 'weld', passes: (m.userData.part as { passes?: string[] } | undefined)?.passes }; };
const r3 = (v: THREE.Vector3) => v.toArray().map((x) => +x.toFixed(4));
const look = {
  parts: () => meshes.filter((m) => m.visible).map((m) => { const p = (m.userData.part ?? {}) as { mat?: string; finish?: string; says?: string; shell?: number }, b = new THREE.Box3().setFromObject(m); return { name: m.name, path: pathOf(m), mat: p.mat, finish: p.finish, color: hex(m), says: p.says, shell: p.shell, min: r3(b.min), max: r3(b.max), tris: (m.geometry.getIndex()?.count ?? m.geometry.getAttribute('position').count) / 3 }; }),
  facts: () => ({ name: part.name, says: (part as { says?: string }).says, size: r3(size), parts: meshes.length, made: (made as { says?: string }).says }),
  pick: (x: number, y: number) => { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); const hit = ray.intersectObjects(meshes.filter((m) => m.visible), false)[0]; if (!hit) return null; const p = (hit.object.userData.part ?? {}) as { says?: string; mat?: string }; return { name: hit.object.name, path: pathOf(hit.object), at: r3(hit.point), distance: +hit.distance.toFixed(3), mat: p.mat, says: p.says }; },
  clash: (touch = 0.001) => meshClashes(meshes.filter((m) => m.visible).map(worldTris), { touch }),
  gap: (a: string, b: string) => {
    // (the least distance between the parts so named: every corner of each against every triangle of the other near it)
    const ra = new RegExp(a, 'i'), rb = new RegExp(b, 'i'), A = meshes.filter((m) => m.visible && ra.test(m.name)).map(worldTris), B = meshes.filter((m) => m.visible && rb.test(m.name)).map(worldTris);
    if (!A.length || !B.length) return null;
    const res = meshClashes([...A.map((x) => ({ ...x, name: 'A:' + x.name })), ...B.map((x) => ({ ...x, name: 'B:' + x.name }))], { touch: 0.25, skip: (x, y) => x.name.slice(0, 2) === y.name.slice(0, 2) });
    let best: { d: number; at: number[]; a: string; b: string } | null = null;
    const vs = (t: TriMesh) => { const o: THREE.Vector3[] = []; for (let i = 0; i < t.pos.length; i += 3) o.push(new THREE.Vector3(t.pos[i], t.pos[i + 1], t.pos[i + 2])); return o; };
    // (a crossing is a distance of 0; else the least corner-to-corner distance, a close upper bound at these meshes' fineness)
    if (res.some((x) => x.kind === 'through')) { const x = res.find((y) => y.kind === 'through')!; return { d: 0, at: x.at, a: x.a.slice(2), b: x.b.slice(2), crossing: true }; }
    for (const ta of A) { const va = vs(ta); for (const tb of B) { const vb = vs(tb); for (const p of va) for (const w of vb) { const dd = p.distanceTo(w); if (!best || dd < best.d) best = { d: dd, at: r3(p.clone().add(w).multiplyScalar(0.5)), a: ta.name, b: tb.name }; } } }
    return best ? { ...best, d: +best.d.toFixed(4) } : null;
  },
};
(window as unknown as { look: typeof look }).look = look;
// gaps seen through: magenta from inside the thing's outline that cannot be reached from the picture's edge across
// magenta (the edge's magenta is round it, not through it)
let holeStats: unknown = undefined;
if (holes) {
  const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const bg = (i: number) => px[i * 4]! > 200 && px[i * 4 + 1]! < 60 && px[i * 4 + 2]! > 200, seen = new Uint8Array(W * H), stack: number[] = [];
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) stack.push(y * W + x); for (let y = 0; y < H; y++) for (const x of [0, W - 1]) stack.push(y * W + x);
  while (stack.length) { const i = stack.pop()!; if (seen[i] || !bg(i)) continue; seen[i] = 1; const x = i % W, y = (i - x) / W; if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W); }
  const ov = document.createElement('canvas'); ov.width = W; ov.height = H; Object.assign(ov.style, { position: 'absolute', left: '0', top: '0', width: `${innerWidth}px`, height: `${innerHeight}px`, pointerEvents: 'none' }); document.body.appendChild(ov);
  const ctx = ov.getContext('2d')!, img = ctx.createImageData(W, H), clusters: { x: number; y: number; w: number; h: number; n: number }[] = [], lab = new Int32Array(W * H).fill(-1);
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || !bg(i) || lab[i]! >= 0) continue;
    // (each gap a cluster of its own, flooded out from where it is first met)
    const k = clusters.length, st = [i]; let x0 = W, y0 = H, x1 = 0, y1 = 0, cnt = 0;
    while (st.length) { const j = st.pop()!; if (lab[j]! >= 0 || seen[j] || !bg(j)) continue; lab[j] = k; cnt++; const x = j % W, y = (j - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (x > 0) st.push(j - 1); if (x < W - 1) st.push(j + 1); if (y > 0) st.push(j - W); if (y < H - 1) st.push(j + W); }
    n += cnt; const pr = renderer.getPixelRatio(); clusters.push({ x: Math.round(x0 / pr), y: Math.round((H - 1 - y1) / pr), w: Math.round((x1 - x0 + 1) / pr), h: Math.round((y1 - y0 + 1) / pr), n: cnt });
  }
  for (let i = 0; i < W * H; i++) if (lab[i]! >= 0) { const x = i % W, y = (i - x) / W, o = ((H - 1 - y) * W + x) * 4; img.data[o] = 0; img.data[o + 1] = 255; img.data[o + 2] = 60; img.data[o + 3] = 255; }
  ctx.putImageData(img, 0, 0); holeStats = { pixels: n, clusters: clusters.sort((a2, b2) => b2.n - a2.n).slice(0, 40) };
}
(window as unknown as { lookReady: unknown }).lookReady = { parts: view.group.children.length, meshes: meshes.length, size: size.toArray().map((x) => +x.toFixed(2)), camera: r3(camera.position), aim: r3(c), ...(holeStats ? { holes: holeStats } : {}) };
