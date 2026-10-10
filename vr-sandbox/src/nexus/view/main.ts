// The Nexus room (docs/NEXUS-FROM-REALITY.md, section 26): a projection of what Nexus generated, for a headset or a
// screen. Nothing here is generated: the scene is read from world.json (src/nexus/substrate/scene.ts), and every shape stands for
// one number or one element in it. Laid out around where you stand, facing −z:
//
// - in front, on the floor, at their true size: the places in the room, after the kernel evolved them, with a ghost of
//   where each one that moved began;
// - to the left, the ladder as a column of sizes, from the length the constants set by themselves up to the ladder's
//   largest boundary, one decade to every 4 cm: each level as a lit disc, each boundary as a ring;
// - to the right, descents: for each matter and each heat, a stack of its levels from the outermost down, each lit by
//   what the heat does to it (whole, taken apart by the share it takes, resolved);
// - behind those, the cold bodies: radius against mass, for the ladder's own matter and for matter with two nucleons
//   to each electron, with Chandrasekhar's mass as a wall and the largest cold body marked;
// - overhead, one intent the manifold drew for itself, generated: its regions, elements and gaps as a graph.
//
// Query: ?view=front|ladder|descents|bodies|intent sets the screen camera; ?xr=quest3 runs an emulated Quest 3
// session (iwer) so the stereo frame a headset would show is what the page renders.

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import type { World } from '../substrate/scene';

const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);
scene.fog = new THREE.Fog(0x07090d, 6, 16);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 60);
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x20242c, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(2, 5, 3);
scene.add(sun);

// the floor: a dark plane with a metre grid, so sizes read at a glance
const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 0.95 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const grid = new THREE.GridHelper(18, 18, 0x2a3442, 0x161c25);
(grid.material as THREE.Material).transparent = true;
(grid.material as THREE.Material).opacity = 0.7;
scene.add(grid);

/** A label: text drawn on a canvas, on a sprite that always faces the eye, its height in metres. */
function label(text: string, height = 0.05, color = '#e6edf3', bg = 'rgba(8,11,16,0.72)'): THREE.Sprite {
  const pad = 14, font = 46;
  const c = document.createElement('canvas'), g = c.getContext('2d')!;
  g.font = `500 ${font}px system-ui, sans-serif`;
  const lines = text.split('\n'), w = Math.max(...lines.map((l) => g.measureText(l).width)) + pad * 2, h = lines.length * font * 1.25 + pad * 2;
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  g.font = `500 ${font}px system-ui, sans-serif`;
  g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, c.width, c.height, 18); g.fill();
  g.fillStyle = color; g.textBaseline = 'top';
  lines.forEach((l, i) => g.fillText(l, pad, pad + i * font * 1.25));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  const hh = height * 1.7 * lines.length;
  s.scale.set((hh * c.width) / c.height, hh, 1);
  s.renderOrder = 10;
  return s;
}
const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
/** A group set on an arc around where you stand, turned to face you: `deg` from straight ahead (left negative), `r` metres out. */
const onArc = (g: THREE.Object3D, deg: number, r: number, y = 0) => { const a = (deg * Math.PI) / 180; g.position.set(Math.sin(a) * r, y, -Math.cos(a) * r); g.lookAt(0, y, 0); return g; };
const fmt = (x: number) => (Math.abs(x) >= 1e-2 && Math.abs(x) < 1e4 ? Number(x.toPrecision(3)).toString() : x.toExponential(2).replace('e+', 'e'));
const eV = 1.602176634e-19;
const glow = (color: number, intensity = 0.8) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

const BOUNDARY: Record<string, number> = { settles: 0x4dd0e1, 'holds within': 0x66bb6a, 'holds beyond': 0xffee58, 'exceeds rest': 0xec407a, 'exceeds binding': 0xffa726 };
const KIND: Record<string, number> = { region: 0xe6edf3, reservoir: 0x5c9dff, path: 0x4dd0e1, store: 0xffca28, conversion: 0xff8a50, boundary: 0x81c784, modulation: 0xba68c8, bound: 0x90a4ae, contact: 0xa1887f, member: 0xd7ccc8 };

function build(w: World): void {
  const title = label(`Nexus, generated from nothing · ${w.made.slice(0, 16).replace('T', ' ')} UTC`, 0.06, '#ffffff');
  scene.add(at(title, 0, 3.05, -3.2));

  // ---- the places, at their true size, in front -------------------------------------------------------------------
  const room = new THREE.Group();
  room.position.set(-0.2, 0, -1.05);
  scene.add(room);
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.75 });
  for (const p of w.places.filter((x) => !x.held)) {
    const geo = new THREE.BoxGeometry(p.half[0]! * 2, p.half[1]! * 2, p.half[2]! * 2);
    const m = new THREE.Mesh(geo, wood);
    m.position.fromArray(p.centre); m.quaternion.fromArray(p.turn);
    room.add(m);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4a3420 }));
    edges.position.copy(m.position); edges.quaternion.copy(m.quaternion);
    room.add(edges);
    if (p.before) {
      const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x80deea, transparent: true, opacity: 0.85 }));
      ghost.position.fromArray(p.before.centre); ghost.quaternion.fromArray(p.before.turn);
      room.add(ghost);
      room.add(at(label(`${p.id}: began here, the kernel moved it`, 0.035, '#80deea'), p.before.centre[0]!, p.before.centre[1]! + 0.12, p.before.centre[2]!));
    }
    room.add(at(label(p.id, 0.03), p.centre[0]!, p.centre[1]! + p.half[1]! + 0.05, p.centre[2]!));
  }
  room.add(at(label('places, evolved by the rigid-body kernel, at true size', 0.03, '#c8a06a'), 0.5, 0.72, 0.3));

  // ---- the ladder: one decade to every 4 cm -------------------------------------------------------------------------
  const L0 = Math.log10(w.ladder.least), L1 = Math.log10(w.ladder.most), perDecade = 2.5 / (L1 - L0);
  const yOf = (L: number) => 0.15 + (Math.log10(L) - L0) * perDecade;
  const tower = new THREE.Group();
  scene.add(onArc(tower, -55, 2.2));
  const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, yOf(w.ladder.most) - 0.15, 16), glow(0x30363d, 0.2));
  axis.position.y = (yOf(w.ladder.most) + 0.15) / 2;
  tower.add(axis);
  for (let d = Math.ceil(L0 / 5) * 5; d <= L1; d += 5) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.003, 0.003), glow(0x6e7681, 0.3));
    tower.add(at(tick, 0, yOf(10 ** d), 0));
    tower.add(at(label(`10^${d} m`, 0.016, '#8b949e', 'rgba(0,0,0,0)'), -0.12, yOf(10 ** d), 0));
  }
  // you, for scale
  tower.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.02), glow(0xffffff, 1)), 0, yOf(1.7), 0));
  tower.add(at(label('you, 1.7 m', 0.018, '#ffffff'), 0.18, yOf(1.7), 0));
  for (const b of w.ladder.boundaries) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.004, 8, 40), glow(BOUNDARY[b.kind] ?? 0x888888, 1));
    ring.rotation.x = Math.PI / 2;
    tower.add(at(ring, 0, yOf(b.L), 0));
  }
  // the boundaries' labels, alternating sides so they do not overlap
  const shown = new Set<string>();
  w.ladder.boundaries.forEach((b, i) => {
    const k = `${b.kind}@${Math.round(Math.log10(b.L))}`;
    if (shown.has(k)) return; shown.add(k);
    tower.add(at(label(`${b.kind} ${fmt(b.L)} m`, 0.014, '#' + (BOUNDARY[b.kind] ?? 0x888888).toString(16).padStart(6, '0')), i % 2 ? 0.3 : -0.3, yOf(b.L), 0.02));
  });
  for (const lv of w.ladder.levels) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 40), glow(lv.kind === 'floor' ? 0x8b949e : lv.kind === 'particle' ? 0xb388ff : 0x4dd0e1, 1.2));
    tower.add(at(disc, 0, yOf(lv.size), 0));
    tower.add(at(label(`${lv.what}\n${fmt(lv.size)} m · bound by ${fmt(lv.binding / eV)} eV`, 0.016), lv.kind === 'particle' ? -0.5 : 0.5, yOf(lv.size) + 0.03, 0));
  }
  tower.add(at(label('the ladder the scale tuner derives\nfrom the constants alone', 0.025, '#4dd0e1'), 0, yOf(w.ladder.most) + 0.16, 0));

  // ---- descents: a stack of levels for each matter and heat -------------------------------------------------------
  const desc = new THREE.Group();
  scene.add(onArc(desc, 52, 2.4));
  const colOf = (s: World['descents'][number]['steps'][number]) => {
    if (s.verdict === 'whole') return new THREE.Color(0x26a69a);
    if (s.verdict === 'resolved') return new THREE.Color(0x9575cd);
    const share = s.share ?? 0.5;
    return new THREE.Color(0xffb74d).lerp(new THREE.Color(0xe53935), Math.min(1, share));
  };
  w.descents.forEach((d, i) => {
    const x = (i - (w.descents.length - 1) / 2) * 0.2;
    d.steps.forEach((s, j) => {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.12), new THREE.MeshStandardMaterial({ color: colOf(s), emissive: colOf(s), emissiveIntensity: 0.35, roughness: 0.5, transparent: s.verdict !== 'whole', opacity: s.verdict === 'whole' ? 1 : 0.55 + 0.45 * (1 - (s.share ?? 0.5)) }));
      desc.add(at(plate, x, 1.55 - j * 0.13, 0));
      desc.add(at(label(`${s.what.replace('what settles at 5.29e-11 m', 'the atom').replace('the nucleon that carries the positive charge', 'the nucleon')}\n${s.verdict === 'whole' ? 'whole' : s.verdict === 'resolved' ? 'resolved' : `apart ${s.share === null ? '?' : (s.share * 100).toPrecision(2) + '%'}`}`, 0.0125), x, 1.55 - j * 0.13, 0.07));
    });
    desc.add(at(label(`${d.matter}\n${fmt(d.T)} K`, 0.02, '#ffffff'), x, 1.72, 0));
  });
  desc.add(at(label('how deep heat must follow each matter\n(teal: whole · orange to red: apart by the share it takes)', 0.025, '#ffb74d'), 0, 2.0, 0));

  // ---- cold bodies: radius against mass -------------------------------------------------------------------------
  const plot = new THREE.Group();
  scene.add(onArc(plot, 14, 3.2, 1.45));
  const M0 = 26, M1 = 31.5, R0 = 4.5, R1 = 8.5, W = 2.2, H = 1.4;
  const px = (M: number) => ((Math.log10(M) - M0) / (M1 - M0) - 0.5) * W, py = (R: number) => ((Math.log10(R) - R0) / (R1 - R0) - 0.5) * H;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.2, H + 0.25), new THREE.MeshStandardMaterial({ color: 0x0f141b, roughness: 1, transparent: true, opacity: 0.9 }));
  plot.add(at(board, 0, 0, -0.01));
  for (let e = Math.ceil(M0); e <= M1; e++) plot.add(at(label(`10^${e} kg`, 0.02, '#8b949e', 'rgba(0,0,0,0)'), px(10 ** e), -H / 2 - 0.06, 0));
  for (let e = Math.ceil(R0); e <= R1; e++) plot.add(at(label(`10^${e} m`, 0.02, '#8b949e', 'rgba(0,0,0,0)'), -W / 2 - 0.12, py(10 ** e), 0));
  const colors = [0x4dd0e1, 0xffca28];
  w.bodies.forEach((b, i) => {
    const pts = b.branch.filter((x) => Math.log10(x.M) > M0 && Math.log10(x.M) < M1 && Math.log10(x.R) > R0 && Math.log10(x.R) < R1).map((x) => new THREE.Vector3(px(x.M), py(x.R), 0));
    plot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.008, 8), glow(colors[i]!, 1)));
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.006, H, 0.006), glow(colors[i]!, 0.6));
    plot.add(at(wall, px(b.chandrasekhar), 0, 0));
    plot.add(at(label(`Chandrasekhar\n${fmt(b.chandrasekhar / 1.98847e30)} solar masses`, 0.018, '#' + colors[i]!.toString(16)), px(b.chandrasekhar) - 0.16, H / 2 - 0.12 - i * 0.16, 0.01));
    if (b.largest) {
      plot.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.03), glow(colors[i]!, 1.4)), px(b.largest.M), py(b.largest.R), 0.01));
      plot.add(at(label(`largest cold body ${fmt(b.largest.R)} m`, 0.018, '#' + colors[i]!.toString(16)), px(b.largest.M) - 0.1, py(b.largest.R) + 0.07, 0.02));
    }
    plot.add(at(label(b.of, 0.018, '#' + colors[i]!.toString(16)), -W / 2 + 0.55, H / 2 - 0.1 - i * 0.07, 0.01));
  });
  // where Jupiter is, as the evidence the derivation is checked against
  plot.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.022), glow(0xff7043, 1)), px(1.898e27), py(7.1492e7), 0.01));
  plot.add(at(label('Jupiter (IAU), for comparison', 0.018, '#ff7043'), px(1.898e27) + 0.25, py(7.1492e7) - 0.06, 0.02));
  plot.add(at(label('cold bodies held up by electrons that cannot share a state\nradius against mass, from hydrostatic balance', 0.025, '#e6edf3'), 0, H / 2 + 0.16, 0));

  // ---- one drawn intent, overhead --------------------------------------------------------------------------------
  const g = new THREE.Group();
  scene.add(onArc(g, -18, 2.9, 1.75));
  const pos = w.intent.nodes.map((n) => new THREE.Vector3(...n.p));
  const lines: number[] = [];
  for (const [a, b] of w.intent.edges) lines.push(...pos[a]!.toArray(), ...pos[b]!.toArray());
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3d4a5c, transparent: true, opacity: 0.8 })));
  w.intent.nodes.forEach((n, i) => {
    const gap = n.kind.startsWith('gap'), color = gap ? 0xef5350 : KIND[n.kind] ?? 0xb0bec5;
    const mesh = new THREE.Mesh(gap ? new THREE.OctahedronGeometry(0.028) : n.kind === 'region' || n.kind === 'reservoir' ? new THREE.SphereGeometry(0.05, 20, 16) : new THREE.SphereGeometry(0.026, 16, 12), glow(color, gap ? 1.3 : 0.9));
    g.add(at(mesh, ...(pos[i]!.toArray() as [number, number, number])));
    if (n.kind === 'region' || n.kind === 'reservoir' || i % 3 === 0) g.add(at(label(n.label, 0.011, gap ? '#ef9a9a' : '#e6edf3'), pos[i]!.x, pos[i]!.y + 0.06, pos[i]!.z));
  });
  g.add(at(label(`${w.intent.name}, drawn by the manifold and generated\n${w.intent.says.slice(0, 2).join('\n')}`, 0.02, '#ffffff'), 0, 0.92, 0));
}

// ---- cameras, VR, emulation ---------------------------------------------------------------------------------------------
const arcPoint = (deg: number, r: number, y: number): [number, number, number] => [Math.sin((deg * Math.PI) / 180) * r, y, -Math.cos((deg * Math.PI) / 180) * r];
const VIEWS: Record<string, { from: [number, number, number]; to: [number, number, number] }> = {
  front: { from: [0, 1.7, 1.6], to: [0, 1.35, -2.4] },
  ladder: { from: arcPoint(-55, 0.9, 1.45), to: arcPoint(-55, 2.2, 1.3) },
  descents: { from: arcPoint(52, 1.1, 1.55), to: arcPoint(52, 2.4, 1.45) },
  bodies: { from: arcPoint(14, 1.2, 1.55), to: arcPoint(14, 3.2, 1.45) },
  intent: { from: arcPoint(-18, 1.5, 1.85), to: arcPoint(-18, 2.9, 1.75) },
  room: { from: [0.45, 1.05, 0.1], to: [0.1, 0.35, -1.05] },
};
const v = VIEWS[params.get('view') ?? 'front'] ?? VIEWS.front!;
camera.position.set(...v.from);
camera.lookAt(new THREE.Vector3(...v.to));

window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

async function start() {
  const w = (await (await fetch('./world.json')).json()) as World;
  build(w);
  const xr = params.get('xr');
  if (xr === 'quest3') {
    // an emulated headset: the session's stereo views are what the page draws, as a Quest 3 would show them
    const { XRDevice, metaQuest3 } = await import('iwer');
    const device = new XRDevice(metaQuest3);
    device.installRuntime({ forceInstall: true });
    device.stereoEnabled = true;
    device.position.set(v.from[0], v.from[1], v.from[2]);
    const dir = new THREE.Vector3(...v.to).sub(new THREE.Vector3(...v.from)).normalize();
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0)));
    device.quaternion.set(q.x, q.y, q.z, q.w);
    const session = await (navigator as Navigator & { xr: XRSystem }).xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor'] });
    renderer.xr.setReferenceSpaceType('local-floor');
    await renderer.xr.setSession(session as unknown as XRSession);
  } else {
    document.body.appendChild(VRButton.createButton(renderer));
  }
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
  (window as unknown as { ready: boolean }).ready = true;
}
void start();
