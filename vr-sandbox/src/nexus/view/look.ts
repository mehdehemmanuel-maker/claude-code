// A made thing on its own, to be looked at: under daylight on a plain floor, framed whole from three-quarters in front,
// with nothing written on the page. It is how a person first sees what was made, how a judge who is told nothing is
// shown it, and the bench an elite critic works at: everything it may ask to see, and to know, is here.
// Read from the address: ?kit=<id>&words=<what was said>&seed=<n>&perfect=0 (perfect=0 skips the make pipeline)
//   where from   &view=<front|side|rear|top|three|under> or &dir=x,y,z (looked along, from the thing toward the camera),
//                &aim=x,y,z (looked at), &zoom=<share of the framing distance> or &dist=<m>, &cam=x,y,z (stand there),
//                &fov=<deg>
//   what         &only=<regex> (only the parts so named), &hi=<regexA;regexB…> (those parts coloured red, blue, green,
//                yellow), &ghost=1 (everything else faint), &explode=<levels> (taken apart that deep), &cut=<x|y|z><op><m>
//                (a cutaway: &cut=z<0 keeps the near half, &cut=x>1.2 the nose, drawn both sides so its inside shows,
//                a solid's section flat and hatched)
//   how lit      &room=1 (a room's light instead of the studio's), &zebra=1 (stripes reflected in its skin: they run on
//                smoothly only where its tangent and curvature do), &draft=1 (each panel by how it parts from its die:
//                green cleanly, yellow barely, red undercut), &holes=1 (every part flat and opaque on magenta, and where
//                the magenta shows through the thing from inside its outline, painted green: a gap seen through)
//                &hide=<regex> (those parts not drawn: the rest of only=), &lamp=x,y,z;… (a lamp hung there, as one in a
//                cabin to see its inside by), &interior=1 (lamps in its middle, a cabin's dome light)
//   posed        &pose=steer:<rad>,bump:<m> (each wheel that steers turned so far, each that rises risen so far, with what
//                is carried with it: its knuckle, its strut's tube and spring), so what clears it can be looked at and
//                clashed where it moves to
//   tried        &rules=<JSON> and &lines=<JSON> try body rules and lines (src/nexus/panels.ts) on what is made, so a
//                critic can show what it would change
// And on window.look: parts() (each part drawn: name, holders, material, finish, colour, what it says of itself, its
// bounds), facts() (what the thing says of itself and its measured size), pick(x, y) (the part under a pixel),
// clash(touch) (every place two parts' surfaces cross or touch: src/nexus/make/critic.ts), gap(a, b) (the least distance
// between parts so named), section(axis, at) (every part cut by a plane: its outline there, as segments), mass() (its
// mass part by part, its centre of mass, and what each axle carries), lint() (what no part should be: no thicker than a
// sheet of paper when it is not a skin, hidden whole inside another, a weld on a casting, a bolt thicker than what it
// holds).

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { KITS, makeKit, massOf, type Part } from '../kits';
import '../creatures';
import { perfect } from '../make/pipeline';
import { frame, held, leastDistance, LEAST_METHOD, meshClashes, type TriMesh } from '../make/critic';
import { tryBody } from '../panels';
import { kitView } from './kit3d';
import { draft } from '../surface';

const q = new URLSearchParams(location.search), kit = KITS.find((k) => k.id === (q.get('kit') ?? 'car')) ?? KITS[0]!, words = q.get('words') ?? kit.name, seed = Number(q.get('seed') ?? 7);
const num3 = (s: string | null) => (s ? (s.split(',').map(Number) as [number, number, number]) : null);
// (a trial of rules or lines, before anything is made)
if (q.get('rules') || q.get('lines')) tryBody({ rules: q.get('rules') ? JSON.parse(q.get('rules')!) : undefined, lines: q.get('lines') ? JSON.parse(q.get('lines')!) : undefined });
// (a logarithmic depth buffer, and the near plane set by how far the camera stands: so two faces a millimetre apart are
// told apart close up, not drawn through each other as they are with a fixed 5 mm near plane and 500 m far one)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;  renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(renderer.domElement);
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
// (a part alone is lit as on a light table, by a bright room, so its metal reads as metal; a vehicle in the studio, so
// its skin shows its shape in the softboxes' reflections; &room=1 or &room=0 says which)
const lightRoom = q.get('room') === '1' || (q.get('room') !== '0' && kit.id === 'part');
// (exposed as a photographer exposes for a grey card, so its floor, 0xb8bbbf, reads its own grey (at 1.3, nearly three
// times too bright: a mask read mint and metal white); the studio as it was judged; &exposure= to try another)
// (the light room on Khronos' PBR Neutral curve, which keeps a base colour its own hue and saturation as a product
// photograph does, where ACES washed a saturated green toward mint: at 0.6 its floor reads its own grey, 0xb8bbbf as
// #bbbec3, and a Raspberry Pi 5's mask its photo's, #1ac189 against #0fbb8e–#27b683, with its photo's camera laid over
// it (photo.py camera); &tone=aces for the old curve)
const neutral = lightRoom && q.get('tone') !== 'aces'; if (neutral) renderer.toneMapping = THREE.NeutralToneMapping;
// (the light room a light tent unless &tent=0: Raspberry Pi 5's photo and a render from its camera agree under it, its
// shells #9b968a against the photo's #988f84, its mask #1ab883 against #0fbb8e–#27b683, its floor its own grey; in the
// grey room its shells read #746f66, too dark, having no white to mirror)
const tentOn = lightRoom && q.get('tent') !== '0';
renderer.toneMappingExposure = Number(q.get('exposure') ?? (neutral ? (tentOn ? 0.62 : 0.6) : lightRoom ? 0.44 : 1.3));
// (a light tent, as a maker's product photograph is taken in: white all round, a broad softbox overhead and one in front,
// so metal mirrors white as a photographed pin or shell does; &wall=, &soft=, &front= its brightnesses)
const tent = (): THREE.Scene => {
  const st = new THREE.Scene(), room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(Number(q.get('wall') ?? 0.9)), side: THREE.BackSide })); room.position.y = 5; st.add(room);
  const panel = (w: number, h: number, at: [number, number, number], rot: [number, number, number], k: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(k), side: THREE.DoubleSide })); m.position.set(...at); m.rotation.set(...rot); st.add(m); };
  panel(10, 10, [0, 10.9, 0], [Math.PI / 2, 0, 0], Number(q.get('soft') ?? 3)); panel(10, 5, [0, 4, 9.9], [0, 0, 0], Number(q.get('front') ?? 2));
  // (the sweep the thing stands on, lit by the softbox above: brighter than the walls, as what a pin's side mirrors)
  panel(20, 20, [0, -0.95, 0], [-Math.PI / 2, 0, 0], Number(q.get('sweep') ?? 1.8));
  return st;
};
scene.environment = lightRoom ? new THREE.PMREMGenerator(renderer).fromScene(tentOn ? tent() : new RoomEnvironment(), 0.04).texture : new THREE.PMREMGenerator(renderer).fromScene(studio(), 0.02).texture;
// (biased, or every curved skin shadows itself in fine rings: shadow acne)
// (&env=, &sun=: the room's reflections' and the sun's strength, to try the light against a photograph's)
if (q.get('env')) scene.environmentIntensity = Number(q.get('env'));
const sun = new THREE.DirectionalLight(0xffffff, Number(q.get('sun') ?? (tentOn ? 0.6 : 1.5))); sun.position.set(6, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
scene.add(sun, new THREE.HemisphereLight(0xdfe8f2, 0x6a645c, 0.3));
const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: 0xb8bbbf, roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const made = makeKit(kit, words, seed), part = q.get('perfect') === '0' ? made.part : perfect(made.part, words).part, view = kitView(part, { maxLights: 0 });
scene.add(view.group);
// (exploded, the whole set back on the floor: what moved down is lifted with the rest, not sunk under it)
if (q.get('explode')) { view.explode(Number(q.get('explode'))); const b0 = new THREE.Box3().setFromObject(view.group); if (!b0.isEmpty() && b0.min.y < 0) view.group.position.y -= b0.min.y; }
// a pose: each wheel that steers turned, each that rises risen, and what is carried with it moved with it
const pose = Object.fromEntries((q.get('pose') ?? '').split(',').filter(Boolean).map((kv) => kv.split(':')).map(([k, v]) => [k!, Number(v)])) as { steer?: number; bump?: number };
if (pose.steer || pose.bump) {
  view.group.updateMatrixWorld(true);
  const objs: THREE.Object3D[] = []; view.group.traverse((o) => { if (o.userData.part) objs.push(o); });
  for (const w of objs) {
    const tr = (w.userData.part as Part).travel; if (!tr) continue;
    const a = Math.max(-(tr.steer ?? 0), Math.min(tr.steer ?? 0, pose.steer ?? 0)), up = Math.max(-(tr.bump ?? 0), Math.min(tr.bump ?? 0, pose.bump ?? 0)), c0 = w.getWorldPosition(new THREE.Vector3());
    const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), name = (w.userData.part as Part).name;
    for (const o of objs.filter((x) => x === w || (x.userData.part as Part).movesWith === name)) {
      const pw = o.getWorldPosition(new THREE.Vector3()).sub(c0).applyQuaternion(turn).add(c0).add(new THREE.Vector3(0, up, 0)), qw = o.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
      const par = o.parent!; par.updateMatrixWorld(true); const inv = par.matrixWorld.clone().invert(); o.position.copy(pw.applyMatrix4(inv)); o.quaternion.copy(par.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(qw));
    }
  }
}
view.group.updateMatrixWorld(true);
// lamps hung where asked, or in its middle (a cabin's dome light), to see an inside by
const lampsAt: [number, number, number][] = (q.get('lamp') ?? '').split(';').filter(Boolean).map((t) => t.split(',').map(Number) as [number, number, number]);
if (q.get('interior') === '1') { const bb = new THREE.Box3().setFromObject(view.group), cc = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); for (const f of [-0.2, 0.15]) lampsAt.push([cc.x + f * sz.x, bb.min.y + sz.y * 0.62, cc.z]); }
for (const at of lampsAt) { const l = new THREE.PointLight(0xfff4e6, 3, 4, 1.4); l.position.set(...at); scene.add(l); }
const meshes: THREE.Mesh[] = []; view.group.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.decor) meshes.push(o as THREE.Mesh); });
const pathOf = (o: THREE.Object3D) => { const n: string[] = []; for (let a: THREE.Object3D | null = o; a && a !== view.group; a = a.parent) n.unshift(a.name || '?'); return n.join('/'); };
// one panel on its own: everything not so named hidden
const hide = q.get('hide'); if (hide) { const re = new RegExp(hide, 'i'); for (const m of meshes) if (re.test(m.name) || re.test(pathOf(m))) m.visible = false; }
const only = q.get('only'); if (only) { const re = new RegExp(only, 'i'); const keep = new Set<THREE.Object3D>(); view.group.traverse((o) => { if (re.test(o.name)) { o.traverse((c) => keep.add(c)); for (let a = o.parent; a; a = a.parent) keep.add(a); } }); for (const m of meshes) if (!keep.has(m)) m.visible = false; }
// (the renderer keeps a logarithmic depth, so a shader of its own must write that depth too, or everything drawn with
// the built-in materials, the ground among them, hides it: zebra was once only a shadow for that)
const LOGV = '#include <common>\n#include <logdepthbuf_pars_vertex>\n', LOGV1 = '\n#include <logdepthbuf_vertex>\n', LOGF = '#include <logdepthbuf_pars_fragment>\n', LOGF1 = '\n#include <logdepthbuf_fragment>\n';
// the reflection of parallel bars of light in the skin: a stripe for each, by the reflected view ray's height
const zebraMat = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { k: { value: 9 } }, vertexShader: LOGV + 'varying vec3 vN; varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; ' + LOGV1 + ' }', fragmentShader: LOGF + 'uniform float k; varying vec3 vN; varying vec3 vP; void main(){ ' + LOGF1 + ' vec3 n = normalize(vN); vec3 v = normalize(vP - cameraPosition); if (dot(n, v) > 0.0) n = -n; vec3 r = reflect(v, n); float s = step(0.5, fract(r.y * k)); gl_FragColor = vec4(vec3(0.06 + 0.9 * s), 1.0); }' });
const draftMat = (pull: THREE.Vector3) => new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { d: { value: pull } }, vertexShader: LOGV + 'varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position,1.0); ' + LOGV1 + ' }', fragmentShader: LOGF + 'uniform vec3 d; varying vec3 vN; void main(){ ' + LOGF1 + ' float g = dot(normalize(vN), d); vec3 c = g < 0.0 ? vec3(0.85,0.12,0.1) : g < 0.0175 ? vec3(0.95,0.8,0.1) : vec3(0.2,0.7,0.25); gl_FragColor = vec4(c * (0.55 + 0.45 * abs(g)), 1.0); }' });
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
// (the floor stays, flat grey: the ground seen under the car or through a wheel is the ground, not a gap; a gap is the
// sky seen through it)
if (holes) { (floor as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0x777777 }) as unknown as THREE.MeshStandardMaterial; for (const m of meshes) { let h = 0; for (const ch of m.name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; m.material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((h % 360) / 360, 0.35, 0.35 + ((h >> 9) % 30) / 100), side: THREE.DoubleSide }); } }
// a cutaway
const cut = (q.get('cut') ?? '').match(/^([xyz])([<>])(-?[\d.]+)$/);
if (cut) {
  const ax = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) }[cut[1] as 'x' | 'y' | 'z'], v = Number(cut[3]), keepBelow = cut[2] === '<';
  renderer.clippingPlanes = [new THREE.Plane(keepBelow ? ax.clone().negate() : ax.clone(), keepBelow ? v : -v)];
  // (a solid cut open shows its section as a draughtsman draws one: flat in its own colour, hatched at 45°, so material
  // reads as material and a hollow as a hollow; a shell, a panel, shows its inside face as it is; a section a hair nearer
  // than a face it rests flush on, so the two do not flicker)
  const hatch = (mat: THREE.Material) => { mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (!gl_FrontFacing) { float h = mod(gl_FragCoord.x + gl_FragCoord.y, 7.0); gl_FragColor = vec4(diffuseColor.rgb * (h < 1.6 ? 0.32 : 0.82), 1.0); gl_FragDepth = gl_FragCoord.z - 0.00002; } else { gl_FragDepth = gl_FragCoord.z; }'); }; mat.customProgramCacheKey = () => 'hatched'; };
  for (const m of meshes) { const mm = m.material as THREE.Material; if (!Array.isArray(mm)) { m.material = mm.clone(); (m.material as THREE.Material).side = THREE.DoubleSide; const pt = m.userData.part as Part | undefined; if (pt?.shape && !pt.shell && !('surf' in pt.shape) && !('loft' in pt.shape)) hatch(m.material as THREE.Material); } }
}
const box = new THREE.Box3(); for (const m of meshes) if (m.visible) box.expandByObject(m); if (box.isEmpty()) box.setFromObject(view.group); const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), r = size.length() / 2;
const s = sun.shadow.camera as THREE.OrthographicCamera; s.left = s.bottom = -r * 1.5; s.right = s.top = r * 1.5; s.far = 60; s.updateProjectionMatrix(); sun.target.position.copy(c); scene.add(sun.target);
// a closer look: &aim=x,y,z looks at that point instead of the middle (with &zoom under 1, or &dist, to come close)
const aim = num3(q.get('aim')); if (aim) c.set(...aim);
// (&ortho=1: a lens 0.8° wide from far off, so it draws as a draughtsman's elevation does, to within half a percent, for laying
// a photograph over; &mask=1: every part flat black on white, its silhouette)
const camera = new THREE.PerspectiveCamera(Number(q.get('fov') ?? (q.get('ortho') === '1' ? 0.8 : 35)), innerWidth / innerHeight, 0.005, 500), dirs: Record<string, THREE.Vector3> = { three: new THREE.Vector3(1, 0.42, 0.9), front: new THREE.Vector3(1, 0.15, 0), side: new THREE.Vector3(0, 0.12, 1), rear: new THREE.Vector3(-1, 0.4, -0.8), top: new THREE.Vector3(0.01, 1, 0.01), under: new THREE.Vector3(0.2, -1, 0.3) };
const dq = num3(q.get('dir')), d = (dq ? new THREE.Vector3(...dq) : (dirs[q.get('view') ?? 'three'] ?? dirs.three!).clone()).normalize(), dist = q.get('dist') ? Number(q.get('dist')) : (r / Math.sin((camera.fov * Math.PI) / 360)) * Number(q.get('zoom') ?? 1.05);
const cam = num3(q.get('cam')); if (cam) camera.position.set(...cam); else camera.position.copy(c).addScaledVector(d, dist);
// (&up=x,y,z: the camera's up, where a photograph laid over it was taken with its camera tilted)
const upq = num3(q.get('up')); if (upq) camera.up.set(...upq).normalize();
// (from under the floor, the floor is not there: what is underneath is what is looked at)
if (camera.position.y < 0.02) floor.visible = false;
// (and lit from the side looked at, as a board is turned over to photograph its underside: else its face is in its own
// shadow, darker than its colour)
if (camera.position.y < c.y) sun.position.y = -Math.abs(sun.position.y);
{ const away = camera.position.distanceTo(c); camera.near = Math.max(0.001, Math.min(0.02, away * 0.01)); camera.far = away + r * 6 + 20; camera.updateProjectionMatrix(); }
if (q.get('mask') === '1') { const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }); for (const m of meshes) m.material = black; scene.background = new THREE.Color(0xffffff); scene.environment = null; floor.visible = false; renderer.shadowMap.enabled = false; renderer.toneMapping = THREE.NoToneMapping; }
camera.lookAt(c); renderer.render(scene, camera);
// (a texture made from data, a board's copper, arrives after the first frame: drawn again when it has)
THREE.DefaultLoadingManager.onLoad = () => renderer.render(scene, camera);

// ---- what the critic may ask ----
const hex = (m: THREE.Mesh) => { const col = (m.material as THREE.MeshStandardMaterial).color; return col ? `#${col.getHexString()}` : undefined; };
const worldTris = (m: THREE.Mesh): TriMesh => { const g = m.geometry, P = g.getAttribute('position'), out = new Float32Array(P.count * 3), v = new THREE.Vector3(); for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z; } return { name: m.name, path: pathOf(m.parent ?? m), pos: out, idx: g.getIndex()?.array, mat: (m.userData.part as { mat?: string } | undefined)?.mat, holder: (m.parent?.parent?.userData.part as { mat?: string } | undefined)?.mat, weld: (m.userData.part as { finish?: string } | undefined)?.finish === 'weld', passes: (m.userData.part as { passes?: string[] } | undefined)?.passes, joined: (m.userData.part as { fixed?: string; detail?: string } | undefined)?.fixed ?? (m.parent?.userData.part as { fixed?: string } | undefined)?.fixed ?? ((m.userData.part as { detail?: string } | undefined)?.detail ? `laid on it by its ${(m.userData.part as { detail?: string }).detail} rule` : undefined), joins: (m.userData.part as { joins?: string[] } | undefined)?.joins ?? (m.parent?.userData.part as { joins?: string[] } | undefined)?.joins, ...weldsOf(m), link: linkOfObj(m), joint: (m.userData.part as Part | undefined)?.joint, shell: (m.userData.part as Part | undefined)?.shell, drives: !!(m.userData.part as Part | undefined)?.iface?.some((i) => i.role === 'provides' && (i.kind === 'shaft' || i.kind === 'mount')), id: (m.parent ?? m).uuid, kg: m.userData.part ? massOf({ ...(m.userData.part as Part), parts: [] }) : 0 }; };
// (a weld bead is one with the part it is laid on and what that part's joints join it to: nothing else it touches)
function weldsOf(m: THREE.Mesh): { welds?: string[] } { const p = m.userData.part as Part | undefined; if (p?.finish !== 'weld') return {}; const host = m.parent?.parent?.userData.part as Part | undefined; return host ? { welds: [host.name, ...(host.joins ?? [])] } : {}; }
// (the rigid link a mesh is one of: its part's, else its nearest holder's that says one; '' the thing's own frame)
function linkOfObj(m: THREE.Object3D): string { for (let o: THREE.Object3D | null = m; o && o !== view.group; o = o.parent) { const l = (o.userData.part as Part | undefined)?.link; if (l !== undefined) return l; } return ''; }
const r3 = (v: THREE.Vector3) => v.toArray().map((x) => +x.toFixed(4));
// (each a point of the parts as drawn: the wheels' middles from their tyres; its nose, tail and roof from its skins; its A
// pillar's foot and its roof's front from its windscreen's side edge; its roof's back and its C pillar's foot (where its deck
// begins) from its back glass's)
function landmarksOf(side: number): Record<string, number[]> {
  const out: Record<string, number[]> = {}, vs = (re: RegExp, surfOnly = false) => { const o: THREE.Vector3[] = []; for (const m of meshes) { if (!m.visible || !re.test(m.name)) continue; const p = m.userData.part as Part | undefined; if (surfOnly && !(p?.shape && 'surf' in p.shape)) continue; const P = m.geometry.getAttribute('position'); for (let i = 0; i < P.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); if (v.z * side >= -0.001) o.push(v); } } return o; };
  // (each wheel's middle on its tyre's outer face, and that face's top, bottom, front and back: a wheel's size is published,
  // so these are what a camera is matched by. A tyre is a road wheel's: standing on the ground, not its valve nor a spare)
  const tb = meshes.filter((m) => m.visible && /^tyre/.test(m.name) && !/valve/.test(m.name)).map((m) => new THREE.Box3().setFromObject(m)).filter((b) => (b.min.z + b.max.z) * side > 0 && b.min.y < 0.03 && b.max.y - b.min.y > 0.2).sort((a, b) => b.max.x + b.min.x - a.max.x - a.min.x);
  for (const [nm, b] of [['front', tb[0]], ['rear', tb[tb.length - 1]]] as const) { if (!b || tb.length < 2) continue; const cx = (b.min.x + b.max.x) / 2, cy = (b.min.y + b.max.y) / 2, R = (b.max.y - b.min.y) / 2, zo = side > 0 ? b.max.z : b.min.z;
    out[`${nm} wheel centre`] = [cx, cy, zo].map((v) => +v.toFixed(4)); out[`${nm} wheel top`] = [cx, cy + R, zo].map((v) => +v.toFixed(4)); out[`${nm} wheel bottom`] = [cx, cy - R, zo].map((v) => +v.toFixed(4)); out[`${nm} wheel front`] = [cx + R, cy, zo].map((v) => +v.toFixed(4)); out[`${nm} wheel back`] = [cx - R, cy, zo].map((v) => +v.toFixed(4)); }
  const skin = vs(/.*/, true); if (skin.length) { const by = (f: (v: THREE.Vector3) => number) => skin.reduce((b, v) => (f(v) > f(b) ? v : b)); out.nose = r3(by((v) => v.x)); out.tail = r3(by((v) => -v.x)); out['roof peak'] = r3(by((v) => v.y)); }
  const edge = (re: RegExp) => { const g = vs(re); if (!g.length) return null; const zmax = Math.max(...g.map((v) => Math.abs(v.z))), e = g.filter((v) => Math.abs(v.z) > zmax * 0.85); return { lo: e.reduce((b, v) => (v.y < b.y ? v : b)), hi: e.reduce((b, v) => (v.y > b.y ? v : b)) }; };
  const ws = edge(/^windscreen$/), bg = edge(/^back glass$/);
  if (ws) { out['A pillar foot'] = r3(ws.lo); out['roof front'] = r3(ws.hi); }
  if (bg) { out['roof back'] = r3(bg.hi); out['C pillar foot'] = r3(bg.lo); }
  return out;
}
const look = {
  parts: () => meshes.filter((m) => m.visible).map((m) => { const p = (m.userData.part ?? {}) as { mat?: string; finish?: string; says?: string; shell?: number }, b = new THREE.Box3().setFromObject(m); return { name: m.name, path: pathOf(m), mat: p.mat, finish: p.finish, color: hex(m), says: p.says, shell: p.shell, link: linkOfObj(m) || undefined, joint: (p as Part).joint, min: r3(b.min), max: r3(b.max), tris: (m.geometry.getIndex()?.count ?? m.geometry.getAttribute('position').count) / 3 }; }),
  facts: () => ({ name: part.name, says: (part as { says?: string }).says, size: r3(size), parts: meshes.length, made: (made as { says?: string }).says }),
  pick: (x: number, y: number) => { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera); const hit = ray.intersectObjects(meshes.filter((m) => m.visible), false)[0]; if (!hit) return null; const p = (hit.object.userData.part ?? {}) as { says?: string; mat?: string }; return { name: hit.object.name, path: pathOf(hit.object), at: r3(hit.point), distance: +hit.distance.toFixed(3), mat: p.mat, says: p.says }; },
  clash: (touch = 0.001) => meshClashes(meshes.filter((m) => m.visible).map(worldTris), { touch }),
  // where points of the thing fall in the picture (CSS pixels), and where a pixel falls on a plane z = const (the side
  // the camera looks at), for laying a photograph over it (the bench's ref:)
  project: (pts: [number, number, number][]) => pts.map((p) => { const v = new THREE.Vector3(...p).project(camera); return [+(((v.x + 1) / 2) * innerWidth).toFixed(2), +(((1 - v.y) / 2) * innerHeight).toFixed(2)]; }),
  unproject: (px: number, py: number, z: number) => { const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1), camera); const t = (z - ray.ray.origin.z) / ray.ray.direction.z; return r3(ray.ray.origin.clone().addScaledVector(ray.ray.direction, t)); },
  // its landmarks on one side (+1 its right, as it faces forward, or -1 its left), from its parts as drawn
  landmarks: (side = 1) => landmarksOf(side),
  // what holds what: groups held by nothing, joints across which something rigid is laid, links that rub (critic.ts)
  held: () => { const ts = meshes.filter((m) => m.visible).map(worldTris); return held(ts, meshClashes(ts, { touch: 0.001 })); },
  // what a frame is built of: its body-in-white by structure alone, where loads come into it, each link's joints (critic.ts)
  frame: () => { const ts = meshes.filter((m) => m.visible).map(worldTris); return frame(ts, meshClashes(ts, { touch: 0.001 })); },
  gap: (a: string, b: string) => {
    // (the least distance between the parts so named, measured as the clash finder measures, so the two agree; the pairs
    // nearest by their boxes first, and given up on, said, after 20 s)
    const ra = new RegExp(a, 'i'), rb = new RegExp(b, 'i'), A = meshes.filter((m) => m.visible && ra.test(m.name)).map(worldTris), B = meshes.filter((m) => m.visible && rb.test(m.name)).map(worldTris);
    if (!A.length || !B.length) return null;
    const t0 = performance.now(), box = (t: TriMesh) => { const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (let i = 0; i < t.pos.length; i += 3) for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c]!, t.pos[i + c]!); hi[c] = Math.max(hi[c]!, t.pos[i + c]!); } return { lo, hi }; };
    const bx = new Map([...A, ...B].map((t) => [t, box(t)])), bg = (x: TriMesh, y: TriMesh) => { const p = bx.get(x)!, q = bx.get(y)!; return Math.hypot(...[0, 1, 2].map((c) => Math.max(0, q.lo[c]! - p.hi[c]!, p.lo[c]! - q.hi[c]!))); };
    const pairs = A.flatMap((x) => B.filter((y) => y !== x).map((y) => [bg(x, y), x, y] as const)).sort((p, q) => p[0] - q[0]);
    let best: { d: number; at: number[]; a: string; b: string } | null = null, partial = false;
    for (const [g, x, y] of pairs) { if (best && g >= best.d) break; if (performance.now() - t0 > 20000) { partial = true; break; } const r = leastDistance(x, y, best?.d ?? Infinity); if (r && (!best || r.d < best.d)) best = { d: r.d, at: r.at.map((v) => +v.toFixed(4)), a: x.name, b: y.name }; if (best?.d === 0) break; }
    return best ? { ...best, d: +best.d.toFixed(4), ...(best.d === 0 ? { crossing: true } : {}), ...(partial ? { partial: true } : {}), method: LEAST_METHOD, ms: Math.round(performance.now() - t0) } : null;
  },
};
// (each part cut by a plane: where each of its triangles crosses it, a segment, in the plane's two other axes, mm)
const AX = { x: 0, y: 1, z: 2 } as const;
const section = (axis: 'x' | 'y' | 'z', at: number) => {
  // (seen as a draughtsman draws it: across a car's section, z across and y up; along it, x across and y up; from above, x
  // across and z up)
  const k = AX[axis], [u, v] = ({ x: [2, 1], y: [0, 2], z: [0, 1] } as const)[axis], out: { name: string; path: string; color?: string; segs: number[][] }[] = [];
  for (const m of meshes) {
    if (!m.visible) continue; const bb = new THREE.Box3().setFromObject(m); if (bb.min.getComponent(k) > at || bb.max.getComponent(k) < at) continue;
    const t = worldTris(m), P = t.pos, I = t.idx, n = I ? I.length / 3 : P.length / 9, segs: number[][] = [];
    const vtx = (i: number) => [P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!];
    for (let f = 0; f < n; f++) {
      const ids = I ? [I[f * 3]!, I[f * 3 + 1]!, I[f * 3 + 2]!] : [f * 3, f * 3 + 1, f * 3 + 2], vs = ids.map(vtx), d = vs.map((p) => p[k]! - at), hit: number[][] = [];
      for (let e = 0; e < 3; e++) { const a = vs[e]!, b = vs[(e + 1) % 3]!, da = d[e]!, db = d[(e + 1) % 3]!; if ((da < 0) !== (db < 0)) { const s2 = da / (da - db); hit.push([a[u]! + (b[u]! - a[u]!) * s2, a[v]! + (b[v]! - a[v]!) * s2]); } }
      if (hit.length === 2) segs.push([...hit[0]!, ...hit[1]!].map((x) => +(x * 1000).toFixed(1)));
    }
    if (segs.length) out.push({ name: m.name, path: pathOf(m), color: hex(m), segs });
  }
  return { axis, at, plane: [['x', 'y', 'z'][u], ['x', 'y', 'z'][v]], parts: out };
};
// (its mass part by part, where each part's own mass sits, the centre of all of it, and the share each axle carries)
const massReport = () => {
  const rows: { name: string; path: string; kg: number; at: number[] }[] = [];
  view.group.traverse((o) => {
    const p = o.userData.part as Part | undefined; if (!p || (o as THREE.Mesh).isMesh) return; const own = massOf(p) - (p.parts ?? []).reduce((a, x) => a + massOf(x), 0); if (own <= 1e-6) return;
    const bb = new THREE.Box3(); for (const ch of o.children) if ((ch as THREE.Mesh).isMesh) bb.expandByObject(ch); const at = bb.isEmpty() ? o.getWorldPosition(new THREE.Vector3()) : bb.getCenter(new THREE.Vector3());
    rows.push({ name: p.name, path: pathOf(o), kg: +own.toFixed(3), at: r3(at) });
  });
  const M = rows.reduce((a, r) => a + r.kg, 0), cg = [0, 1, 2].map((i) => rows.reduce((a, r) => a + r.kg * r.at[i]!, 0) / (M || 1));
  const wheels: number[] = []; view.group.traverse((o) => { const p = o.userData.part as Part | undefined; if ((o as THREE.Mesh).isMesh) return; if (p?.travel !== undefined || (p && /wheel$/.test(p.name) && !/steering/.test(p.name))) wheels.push(+o.getWorldPosition(new THREE.Vector3()).x.toFixed(3)); });
  const xs = [...new Set(wheels)].sort((a, b) => b - a), f = xs[0], rr = xs[xs.length - 1], front = f !== undefined && rr !== undefined && f !== rr ? (cg[0]! - rr) / (f - rr) : undefined;
  return { kg: +M.toFixed(1), published: (part as { published?: number }).published, cog: cg.map((x) => +x.toFixed(3)), axles: xs, frontShare: front !== undefined ? +front.toFixed(3) : undefined, parts: rows.sort((a, b) => b.kg - a.kg) };
};
// (what no part should be, found by looking at every part as drawn)
const lint = () => {
  const out: { rule: string; part: string; path: string; says: string }[] = [], vis = meshes.filter((m) => m.visible), boxes = new Map(vis.map((m) => [m, new THREE.Box3().setFromObject(m)]));
  const castLike = /a380|cast|zamak/;
  for (const m of vis) {
    const p = m.userData.part as Part, bb = boxes.get(m)!, sz = bb.getSize(new THREE.Vector3()), least = Math.min(sz.x, sz.y, sz.z), isSkin = !!p.shape && 'surf' in p.shape;
    if (!isSkin && least < 0.0003 && Math.max(sz.x, sz.y, sz.z) > 0.002) out.push({ rule: 'paper thin', part: m.name, path: pathOf(m), says: `${(least * 1000).toFixed(2)} mm at its thinnest, and not a skin` });
    // (what it is laid on: up past any fastener it sits under, a bolt's head on its washer)
    let ho: THREE.Object3D | null | undefined = m.parent?.parent; while (ho && /washer|nut|hex head|screw/i.test((ho.userData.part as Part | undefined)?.name ?? '')) ho = ho.parent;
    const host = ho?.userData.part as Part | undefined;
    if (p.finish === 'weld' && host?.mat && castLike.test(host.mat)) out.push({ rule: 'weld on a casting', part: m.name, path: pathOf(m), says: `a weld bead on the ${host.name}, which is cast (${host.mat})` });
    const mm = /\bM(\d+)\b/.exec(m.name); if (mm && host && /hex head|bolt|screw/i.test(m.name)) { const hb = host ? [...boxes.entries()].find(([x]) => x.parent?.userData.part === host)?.[1] : undefined; if (hb) { const hs = hb.getSize(new THREE.Vector3()), ht = Math.min(hs.x, hs.y, hs.z); if (Number(mm[1]) / 1000 > Math.max(0.006, ht * 0.5)) out.push({ rule: 'bolt too big', part: m.name, path: pathOf(m), says: `M${mm[1]} on the ${host.name}, whose least size is ${(ht * 1000).toFixed(0)} mm` }); } }
    // (hidden whole inside another part that is not what holds it nor held by it, nor one it passes through)
    for (const o of vis) {
      if (o === m) continue; const ob = boxes.get(o)!; if (!ob.containsBox(bb)) continue; const op = o.userData.part as Part;
      if (pathOf(m).startsWith(pathOf(o.parent!)) || pathOf(o).startsWith(pathOf(m.parent!)) || op.passes?.includes(m.name) || p.passes?.includes(o.name) || (op.shape && 'surf' in op.shape)) continue;
      // (inside by six rays, each way along each axis, every one crossing its surface an odd number of times: an open
      // shape, as a tyre's turned section open at its bead, is not something to be inside)
      const ray = new THREE.Raycaster(), ctr = bb.getCenter(new THREE.Vector3()), odd = [[1, 0.013, 0.007], [-1, 0.011, 0.005], [0.009, 1, 0.012], [0.007, -1, 0.01], [0.012, 0.008, 1], [0.01, 0.006, -1]].every((d) => { ray.set(ctr, new THREE.Vector3(...(d as [number, number, number])).normalize()); return ray.intersectObject(o, false).length % 2 === 1; });
      if (odd) { out.push({ rule: 'hidden inside', part: m.name, path: pathOf(m), says: `wholly inside the ${o.name} (${pathOf(o)})` }); break; }
    }
  }
  return out;
};
Object.assign(look, { section, mass: massReport, lint });
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
// zebra checks itself: its stripes are its two greys and nothing else is, so a picture with too few of either has none
// (the sheet's zebra was once the car's shadow alone, and nothing said so)
let zebraStats: unknown = undefined;
if (q.get('zebra') === '1') {
  const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let dark = 0, light = 0; for (let i = 0; i < W * H; i++) { const r = px[i * 4]!, g = px[i * 4 + 1]!, b = px[i * 4 + 2]!; if (Math.abs(r - g) > 3 || Math.abs(g - b) > 3) continue; if (r <= 20) dark++; else if (r >= 240) light++; }
  const n = W * H; zebraStats = { dark: +(dark / n).toFixed(4), light: +(light / n).toFixed(4), stripes: dark / n > 0.002 && light / n > 0.002 };
}
// (lift: how far the thing was stood up so its lowest point sits on the floor, its own frame's height in the room: a board's
// top is there, for laying a photograph's camera over it, photo.py camera --top)
(window as unknown as { lookReady: unknown }).lookReady = { parts: view.group.children.length, meshes: meshes.length, size: size.toArray().map((x) => +x.toFixed(2)), camera: r3(camera.position), aim: r3(c), lift: +((part.parts?.[0]?.at?.[1] ?? 0) * 1000).toFixed(3), ...(holeStats ? { holes: holeStats } : {}), ...(zebraStats ? { zebra: zebraStats } : {}) };
