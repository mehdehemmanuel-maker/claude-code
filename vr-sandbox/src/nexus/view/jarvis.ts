// The workshop (docs/NEXUS-FROM-REALITY.md, section 27): Nexus generating, live, in front of you, and Claude in the
// room with you. Ask for something (a drawn intent, or one a person has asked for) and the generator runs here, in
// the page, from nothing: its structure is given a body in space (src/nexus/substrate/realize-space.ts) on the holo-table, one
// element at a time, in the order it was generated. Claude, on wheels, drives to each, reaches out and places it, and
// says what it is; its lidar senses what is there. A card says what each element is, the values it derived and why it
// exists, back to what you said. Gaps appear where generation stopped, in red, with what they lack.
//
// Desktop: the buttons, or N (draw anything), 1 (printer), 2 (house), 3 (car), V (voice). Headset: the trigger draws
// something new, or, pointed at an element, shows why it is there; the grip goes through what people have asked for.
// Query: ?ask=draw|printer|house|car&seed=N&t=seconds (freeze the timeline)&view=front|table|robot&xr=quest3&pace=s.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { car, house, printer } from '../ask/asked';
import { drawIntent } from '../substrate/draw';
import { generate } from '../substrate/manifold';
import { realize, whyOf, type Space, type Thing } from '../substrate/realize-space';

import { card, label } from './holo';
import { Robot } from './robot';

const params = new URLSearchParams(location.search);
const frozen = params.has('t') ? Number(params.get('t')) : null;
let pace = Number(params.get('pace') ?? 1.6);

// ---- the room -------------------------------------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03070c);
scene.fog = new THREE.Fog(0x03070c, 5, 14);
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.01, 50);
scene.add(new THREE.HemisphereLight(0x9fd8ff, 0x0a0f16, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(1.5, 4, 2); scene.add(key);
const tableLight = new THREE.PointLight(0x4dd0e1, 2.5, 3); tableLight.position.set(0, 1.4, -1.15); scene.add(tableLight);

const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 72), new THREE.MeshStandardMaterial({ color: 0x070c12, roughness: 0.6, metalness: 0.3 }));
floor.rotation.x = -Math.PI / 2; scene.add(floor);
const grid = new THREE.GridHelper(20, 40, 0x0f3a48, 0x0a1a24); scene.add(grid);

// the holo-table: a dark disc with a lit rim and rings, the generated thing standing on it
const C = new THREE.Vector3(0, 0.8, -1.15), R = 0.85;
const table = new THREE.Group(); table.position.copy(C); scene.add(table);
table.add(new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.95, 0.06, 72), new THREE.MeshStandardMaterial({ color: 0x0b141c, metalness: 0.7, roughness: 0.3 })).translateY(-0.03));
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, C.y - 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x0b141c, metalness: 0.7, roughness: 0.4 }));
pedestal.position.set(C.x, (C.y - 0.06) / 2, C.z); scene.add(pedestal);
const rings: THREE.Mesh[] = [];
for (const [r, o] of [[R, 0.9], [R * 0.66, 0.35], [R * 0.33, 0.25]] as const) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.004, 8, 120), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: o }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; table.add(ring); rings.push(ring);
}
const beamCone = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.98, R, 0.9, 72, 1, true), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.035, side: THREE.DoubleSide, depthWrite: false }));
beamCone.position.y = 0.45; table.add(beamCone);
const model = new THREE.Group(); table.add(model);

// Claude, on wheels
const robot = new Robot(); scene.add(robot.root); for (const s of robot.senses) scene.add(s);
const nameplate = label('CLAUDE', 0.035, '#4dd0e1', 'rgba(0,0,0,0)'); nameplate.position.set(0, 1.42, 0); robot.root.add(nameplate);
const beam = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.9 })); beam.frustumCulled = false; scene.add(beam);

// the cards
const title = label('NEXUS · live generation', 0.05, '#ffffff', 'rgba(0,0,0,0)'); title.position.set(0, 2.35, -1.6); scene.add(title);
const asked = card(0.9, 1.1); asked.mesh.position.set(-1.35, 1.45, -0.85); asked.mesh.lookAt(0, 1.45, 0.3); scene.add(asked.mesh);
const status = card(0.9, 1.1); status.mesh.position.set(1.35, 1.45, -0.85); status.mesh.lookAt(0, 1.45, 0.3); scene.add(status.mesh);
const now = card(1.15, 0.62); now.mesh.position.set(0, 1.92, -1.25); now.mesh.lookAt(0, 1.7, 0.4); scene.add(now.mesh);
const subtitle = card(1.3, 0.15, 1400); subtitle.mesh.position.set(0, 1.02, -0.32); subtitle.mesh.lookAt(0, 1.6, 0.5); scene.add(subtitle.mesh);

// ---- what is generated ---------------------------------------------------------------------------------------------
const CARRIER: Record<string, number> = { energy: 0xff8a50, charge: 0xffd740, momentum: 0x40c4ff, 'angular momentum': 0x7c4dff, information: 0xea80fc, light: 0xffffff };
const colorOf = (t: Thing) => (t.gap ? 0xff3d3d : t.kind === 'region' ? (t.shape === 'reservoir' ? 0x5c9dff : 0xd0f4ff) : CARRIER[t.carrier ?? ''] ?? (t.carrier?.startsWith('volume of') || t.carrier?.startsWith('mass of') ? 0x69f0ae : t.carrier?.startsWith('amount of') ? 0x64ffda : 0xb0bec5));
interface Built { thing: Thing; obj: THREE.Object3D; label: THREE.Sprite | null }
let space: Space | null = null, built: Built[] = [], askedName = '', generatedMs = 0, startedAt = 0;

function meshOf(t: Thing): THREE.Object3D {
  const c = colorOf(t);
  const holo = (o = 0.55) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, transparent: true, opacity: o, roughness: 0.4, metalness: 0.2, depthWrite: o > 0.6 });
  const [w, h, d] = t.size;
  const g = new THREE.Group();
  const edges = (geo: THREE.BufferGeometry) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
  switch (t.shape) {
    case 'medium': { const m = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 64), new THREE.MeshBasicMaterial({ color: 0x4dd0e1, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.003; g.add(m); break; }
    case 'volume': case 'reservoir': { const geo = t.shape === 'reservoir' ? new THREE.CylinderGeometry(w / 2, w / 2, h, 32) : new THREE.BoxGeometry(w, h, d); g.add(new THREE.Mesh(geo, holo(t.shape === 'reservoir' ? 0.35 : 0.16)), edges(geo)); break; }
    case 'rail': { const geo = new THREE.BoxGeometry(w, h, d); g.add(new THREE.Mesh(geo, holo(0.85)), edges(geo)); const carriage = new THREE.Mesh(new THREE.BoxGeometry(Math.max(h, d, w * 0) * 2.2 || 0.02, Math.max(h, d) * 2.2, Math.max(w, d) > 0 ? Math.min(w, h, d) * 2.2 : 0.02), holo(0.95)); carriage.name = 'carriage'; g.add(carriage); break; }
    case 'device': { const geo = new THREE.IcosahedronGeometry(w / 2, 0); g.add(new THREE.Mesh(geo, holo(0.85)), edges(geo)); break; }
    case 'tube': { const pts = (t.points ?? []).map((p) => new THREE.Vector3(...p)); if (pts.length >= 2) { const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, Math.max(0.003, w), 8), holo(0.85))); } g.position.set(0, 0, 0); return g; }
    case 'plate': { const geo = new THREE.BoxGeometry(w, h, Math.max(0.002, d)); g.add(new THREE.Mesh(geo, holo(0.3)), edges(geo)); break; }
    case 'fins': for (let k = -2; k <= 2; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, Math.max(0.001, d * 0.08)), holo(0.8)); f.position.z = (k * d) / 5; g.add(f); } break;
    case 'shell': g.add(new THREE.Mesh(new THREE.SphereGeometry(w / 2, 28, 18), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.08, wireframe: true }))); break;
    case 'sensor': { const eye = new THREE.Mesh(new THREE.SphereGeometry(w / 2, 16, 12), holo(0.95)); g.add(eye); const ring = new THREE.Mesh(new THREE.TorusGeometry(w * 0.8, w * 0.08, 6, 24), holo(0.9)); g.add(ring); break; }
    case 'valve': g.add(new THREE.Mesh(new THREE.TorusGeometry(w / 2, Math.max(0.002, w * 0.12), 8, 28), holo(0.95))); break;
    case 'vessel': { const geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 24); g.add(new THREE.Mesh(geo, holo(0.6)), edges(geo)); break; }
    case 'pad': g.add(new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 24), holo(0.8))); break;
    case 'marker': { const m = new THREE.Mesh(new THREE.OctahedronGeometry(w / 2), new THREE.MeshStandardMaterial({ color: 0xff3d3d, emissive: 0xff1744, emissiveIntensity: 1.2 })); g.add(m); break; }
  }
  g.position.set(...t.at);
  return g;
}

function ask(which: string, seed?: number): void {
  const pick = which === 'printer' ? printer() : which === 'house' ? house() : which === 'car' ? car() : drawIntent(seed ?? Math.floor(Math.random() * 1e6), 3).intent;
  askedName = which === 'draw' ? `something the manifold drew for itself (${pick.name})` : pick.name;
  // the generator, run here and now, from nothing
  const t0 = performance.now();
  const s = generate(pick);
  space = realize(pick, s, R * 0.82);
  generatedMs = performance.now() - t0;

  for (const b of built) model.remove(b.obj);
  built = space.things.map((thing) => {
    const obj = meshOf(thing); obj.visible = false; model.add(obj);
    let l: THREE.Sprite | null = null;
    if (thing.kind === 'region' && thing.shape !== 'medium') { l = label(thing.id, 0.018); l.position.set(thing.at[0], thing.at[1] + thing.size[1] / 2 + 0.04, thing.at[2]); l.visible = false; model.add(l); }
    if (thing.gap) { l = label('!', 0.03, '#ffffff', 'rgba(200,0,0,0.85)'); l.position.set(thing.at[0], thing.at[1] + 0.04, thing.at[2]); l.visible = false; model.add(l); }
    return { thing, obj, label: l };
  });
  // a frozen time is measured from the start, so a moment can be shown exactly; a live one from when it was asked
  startedAt = frozen !== null ? 0 : clock();
  asked.draw(`YOU ASKED FOR · ${askedName}`, [
    ...pick.wants.slice(0, 9).map((w) => ({ text: `• ${w.says}` })),
    { text: `${pick.regions.length} regions: ${pick.regions.map((r) => r.id).join(', ')}`, color: '#7fb3c8', size: 0.7 },
  ]);
  lastSpoken = -1;
}

// ---- the timeline: everything a pure function of the time, so a frozen time shows one moment exactly ----------------
const realStart = performance.now();
const clock = () => (frozen ?? (performance.now() - realStart) / 1000);
const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
const angleOf = (t: Thing) => { const a = Math.atan2(t.at[0], -t.at[2]); return Math.max(-1.9, Math.min(1.9, Number.isFinite(a) ? a : 0)); };
const standAt = (phi: number) => new THREE.Vector3(C.x + Math.sin(phi) * 1.2, 0, C.z - Math.cos(phi) * 1.2);
let lastSpoken = -1, voice = false;
const world = new THREE.Vector3();

function tick(): void {
  const t = clock();
  if (!space) return;
  const local = t - startedAt - 1.5, n = built.length;
  const k = Math.max(-1, Math.min(n - 1, Math.floor(local / pace))), u = local / pace - Math.floor(local / pace);
  // what has been generated so far is shown; the one being placed grows into place
  built.forEach((b, i) => {
    const on = i < k || (i === k && u >= 0.55);
    b.obj.visible = on;
    if (b.label) b.label.visible = on;
    const grow = i === k ? ease((u - 0.55) / 0.2) : 1;
    if (b.thing.shape !== 'tube' && b.thing.shape !== 'medium') b.obj.scale.setScalar(Math.max(0.001, grow));
    // a rail's carriage moves along it, as the axis it is would
    const car_ = b.obj.getObjectByName('carriage');
    if (car_ && b.thing.axis) { const L = b.thing.size[b.thing.axis === 'x' ? 0 : b.thing.axis === 'y' ? 1 : 2] * 0.42; (car_.position as THREE.Vector3)[b.thing.axis] = Math.sin(t * 1.3 + i) * L; }
  });
  // Claude drives to stand by what it is generating, reaches, and places it
  const cur = k >= 0 ? built[k]!.thing : null, prev = k > 0 ? built[k - 1]!.thing : null;
  const phi0 = prev ? angleOf(prev) : 0, phi1 = cur ? angleOf(cur) : 0;
  const phi = k < 0 ? 0.6 * Math.sin(t * 0.3) : phi0 + (phi1 - phi0) * ease(u / 0.35);
  const at = standAt(phi), face = Math.atan2(-(C.x - at.x), -(C.z - at.z));
  robot.pose(at.x, at.z, face);
  const target = cur ? model.localToWorld(new THREE.Vector3(...cur.at)) : null;
  const reaching = cur && u > 0.3 && u < 0.85;
  robot.root.updateWorldMatrix(true, true);
  const side: 0 | 1 = target && robot.root.worldToLocal(target.clone()).x > 0 ? 1 : 0;
  robot.reach(side, reaching ? target : null); robot.reach(side === 0 ? 1 : 0, null);
  robot.look(target ?? C);
  if (reaching && target) {
    robot.arms[side].grip.getWorldPosition(world);
    beam.geometry.setAttribute('position', new THREE.Float32BufferAttribute([world.x, world.y, world.z, target.x, target.y, target.z], 3));
    beam.visible = true;
  } else beam.visible = false;
  const talking = cur && u > 0.4 ? Math.abs(Math.sin(t * 13)) * Math.abs(Math.sin(t * 5.3)) : 0;
  robot.speaking(talking);
  // it senses the geometry that is there, not the words beside it
  robot.sense(t, [...built.filter((b) => b.obj.visible).map((b) => b.obj), table], camera);
  for (const [i, r] of rings.entries()) r.rotation.z = t * (0.1 + i * 0.07) * (i % 2 ? -1 : 1);

  // the cards
  if (cur && k !== lastSpoken && u >= 0.4) {
    lastSpoken = k;
    const why = whyOf(space, cur.id);
    now.draw(cur.gap ? `GAP · ${cur.gap.kind}` : `${cur.kind.toUpperCase()} · ${cur.carrier ?? ''}`, [
      { text: cur.says, size: 1.0 },
      ...cur.values.slice(0, 4).map((v) => ({ text: `${v.name} = ${fmt(v.value)} ${v.unit}`, color: '#ffe082' })),
      ...why.slice(1, 4).map((w) => ({ text: `← ${w}`, color: '#7fb3c8', size: 0.72 })),
    ], cur.gap ? '#ff5252' : '#4dd0e1');
    subtitle.draw('', [{ text: `Claude: ${line(cur)}`, size: 1.25 }], cur.gap ? '#ff5252' : '#4dd0e1');
    if (voice && 'speechSynthesis' in window) { speechSynthesis.cancel(); const s = new SpeechSynthesisUtterance(line(cur)); s.rate = 1.08; speechSynthesis.speak(s); }
  }
  if (k < 0 && lastSpoken !== -2) { lastSpoken = -2; subtitle.draw('', [{ text: `Claude: generating ${askedName}, from nothing, right here. ${space.things.length} things in ${generatedMs.toFixed(0)} ms. Let me build it in front of you.`, size: 1.25 }]); now.draw('READY', [{ text: `Generated in this page in ${generatedMs.toFixed(0)} ms. Building it now, in the order it was generated.` }]); }
  const shown = Math.max(0, Math.min(n, k + (u >= 0.55 ? 1 : 0)));
  const gaps = space.things.filter((x) => x.gap), gapsShown = built.slice(0, shown).filter((b) => b.thing.gap);
  status.draw(`GENERATED LIVE · ${shown} of ${n}`, [
    { text: `${space.things.filter((x) => x.kind !== 'region' && !x.gap).length} elements, ${gaps.length} gaps, generated here in ${generatedMs.toFixed(0)} ms`, color: '#a5f3ff' },
    { text: `model at ${fmt(space.scale)} of true size`, color: '#7fb3c8', size: 0.7 },
    ...gapsShown.slice(-5).map((b) => ({ text: `✗ ${b.thing.says}`, color: '#ff8a80', size: 0.72 })),
  ], '#69f0ae');
}

const fmt = (x: number) => (Math.abs(x) >= 1e-2 && Math.abs(x) < 1e5 ? Number(x.toPrecision(3)).toString() : x.toExponential(2).replace('e+', 'e'));
function line(t: Thing): string {
  if (t.gap) return `Here I am stuck: ${t.gap.lacks}`;
  if (t.kind === 'region') return t.shape === 'reservoir' ? `${t.id}: part of the world it sits in.` : t.shape === 'medium' ? `Everything here sits in ${t.id}.` : `${t.id}: a region you told me about.`;
  const v = t.values[0];
  return `${t.says}${v ? `, ${v.name} ${fmt(v.value)} ${v.unit}` : ''}.`;
}

// ---- controls --------------------------------------------------------------------------------------------------------
const cycle = ['printer', 'house', 'car', 'draw'];
let which = params.get('ask') ?? 'printer';
const controls = document.createElement('div');
controls.style.cssText = 'position:fixed;right:16px;top:12px;display:flex;gap:8px;flex-wrap:wrap;z-index:5';
for (const [l, w] of [['Draw anything', 'draw'], ['3D printer', 'printer'], ['House', 'house'], ['Car', 'car']] as const) {
  const b = document.createElement('button'); b.textContent = l;
  b.style.cssText = 'background:#06202b;color:#bff4ff;border:1px solid #2bb8d0;border-radius:6px;padding:8px 12px;font:600 13px system-ui;cursor:pointer';
  b.onclick = () => { which = w; ask(w); }; controls.appendChild(b);
}
const vb = document.createElement('button'); vb.textContent = 'Voice off';
vb.style.cssText = 'background:#06202b;color:#bff4ff;border:1px solid #2bb8d0;border-radius:6px;padding:8px 12px;font:600 13px system-ui;cursor:pointer';
vb.onclick = () => { voice = !voice; vb.textContent = voice ? 'Voice on' : 'Voice off'; pace = voice ? 3.4 : 1.6; };
controls.appendChild(vb);
document.body.appendChild(controls);
window.addEventListener('keydown', (e) => { if (e.key === 'n') ask('draw'); if (e.key === '1') ask('printer'); if (e.key === '2') ask('house'); if (e.key === '3') ask('car'); if (e.key === 'v') vb.click(); });

// the headset: the trigger draws something new, or shows why what it points at is there; the grip goes through the asked
const ray = new THREE.Raycaster();
const factory = new XRControllerModelFactory();
for (const i of [0, 1]) {
  const ctl = renderer.xr.getController(i);
  const pointer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x4dd0e1 }));
  pointer.scale.z = 2.5; ctl.add(pointer); scene.add(ctl);
  const grip = renderer.xr.getControllerGrip(i); grip.add(factory.createControllerModel(grip)); scene.add(grip);
  ctl.addEventListener('selectstart', () => {
    ray.setFromXRController(ctl as unknown as THREE.XRTargetRaySpace);
    const hit = ray.intersectObjects(built.filter((b) => b.obj.visible).map((b) => b.obj), true)[0];
    const b = hit && built.find((x) => { let o: THREE.Object3D | null = hit.object; while (o) { if (o === x.obj) return true; o = o.parent; } return false; });
    if (b && space) now.draw(`WHY · ${b.thing.id}`, whyOf(space, b.thing.id).map((w, j) => ({ text: j ? `← ${w}` : w, color: j ? '#7fb3c8' : '#ffffff' })));
    else ask('draw');
  });
  ctl.addEventListener('squeezestart', () => { which = cycle[(cycle.indexOf(which) + 1) % cycle.length]!; ask(which); });
}

// ---- views, start --------------------------------------------------------------------------------------------------
const VIEWS: Record<string, [number, number, number, number, number, number]> = {
  front: [0, 1.6, 0.9, 0, 1.15, -1.3],
  table: [0.35, 1.45, -0.05, 0, 0.9, -1.15],
  robot: [1.3, 1.5, 0.2, 0.2, 1.0, -1.6],
  wide: [0, 2.2, 2.2, 0, 1.0, -1.2],
};
const v = VIEWS[params.get('view') ?? 'front'] ?? VIEWS.front!;
camera.position.set(v[0], v[1], v[2]); camera.lookAt(v[3], v[4], v[5]);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

async function start() {
  ask(which, params.has('seed') ? Number(params.get('seed')) : undefined);
  if (params.get('xr') === 'quest3') {
    const { XRDevice, metaQuest3 } = await import('iwer');
    const device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    device.stereoEnabled = true;
    device.position.set(v[0], v[1], v[2]);
    const dir = new THREE.Vector3(v[3] - v[0], v[4] - v[1], v[5] - v[2]).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0)));
    device.quaternion.set(q.x, q.y, q.z, q.w);
    const session = await (navigator as Navigator & { xr: XRSystem }).xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session as unknown as XRSession);
  } else document.body.appendChild(VRButton.createButton(renderer));
  renderer.setAnimationLoop(() => { tick(); renderer.render(scene, camera); });
  (window as unknown as { ready: boolean }).ready = true;
}
void start();
