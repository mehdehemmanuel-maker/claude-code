// The warehouse behind you: three rows of pallet racking, three shelves high, totes on them and the builds you stored,
// each as a model on its shelf with its name; a floor of markers the robots drive by, painted lanes, charging docks
// along the front, a pick station, and the way out to the table marked on the floor. The robots are mast robots of the
// kind that take totes off shelves: a base on two driven wheels and casters, a mast its carriage climbs, forks that
// reach into a shelf, a light strip that says what it is doing, and its name, battery and doing over it.
// What they do is the fleet's (src/nexus/fleet.ts); this draws it, as it is, every frame.

import * as THREE from 'three';
import { BAY_W, BAY_X, Fleet, LANES, LEVELS, RACK_D, RACK_Z, ROWS, SIDE_X, WZ, type Bot, type BotState } from '../fleet';
import { wheelSpeeds, pitchOf } from '../motion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const std = (color: number, metalness = 0.4, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const glow = (color: number, i = 1.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4 });
const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
/** A label that faces you, drawn on a canvas. */
function tag(lines: string[], colour = '#ffffff', w = 512, h = 128): { sprite: THREE.Sprite; draw(lines: string[], colour?: string): void } {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!, tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const draw = (ls: string[], col = colour) => {
    g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(4,10,16,0.78)'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 22); g.fill(); g.strokeStyle = col; g.lineWidth = 4; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; ls.forEach((l, i) => { g.font = `${i ? 500 : 700} ${i ? h * 0.2 : h * 0.3}px ${FONT}`; g.fillStyle = i ? '#cfe8ef' : col; g.fillText(l.slice(0, 34), w / 2, (h / (ls.length + 0.4)) * (i + 0.7)); });
    tex.needsUpdate = true;
  };
  draw(lines); return { sprite, draw };
}
/** A texture drawn once on a canvas. */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const LIGHT: Record<BotState, number> = { idle: 0x4dd0e1, turning: 0x69f0ae, driving: 0x69f0ae, waiting: 0xffb300, lifting: 0x448aff, reaching: 0x448aff, working: 0xb388ff, charging: 0x00e676, sleeping: 0x5e35b1 };

interface BotView { bot: Bot; root: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; carriage: THREE.Group; forks: THREE.Group; strip: THREE.Mesh; beacon: THREE.Mesh; label: ReturnType<typeof tag>; said: string; tote: THREE.Mesh; held: THREE.Object3D | null; pitch: number }

export class Warehouse {
  readonly group = new THREE.Group();
  private readonly views: BotView[] = [];
  private readonly totes: THREE.InstancedMesh;
  private readonly docks = new Map<string, THREE.Mesh>();
  /** The model of each stored build, and its label. */
  private readonly minis = new Map<string, { obj: THREE.Object3D; label: ReturnType<typeof tag> }>();
  private t = 0; private totesKey = '';
  constructor(readonly fleet: Fleet) {
    const g = this.group, f = fleet.floor;
    // the floor: sealed concrete, the lanes painted, a code at every marker
    const x0 = -SIDE_X - 0.7, x1 = SIDE_X + 0.7, z0 = WZ - 0.1, z1 = RACK_Z[ROWS - 1]! + RACK_D + 0.7;
    const slab = box(x1 - x0, 0.02, z1 - z0, std(0x2e3338, 0.1, 0.85)); slab.position.set(0, 0.0, (z0 + z1) / 2); g.add(slab);
    const paint = std(0xffd600, 0.0, 0.7);
    for (const z of LANES) for (const s of [-1, 1]) { const l = box(2 * SIDE_X + 0.4, 0.004, 0.04, paint); l.position.set(0, 0.012, z + s * 0.36); g.add(l); }
    for (const x of [-SIDE_X, SIDE_X]) for (const s of [-1, 1]) { const l = box(0.04, 0.004, LANES[ROWS - 1]! - LANES[0]! + 0.72, paint); l.position.set(x + s * 0.36, 0.012, (LANES[0]! + LANES[ROWS - 1]!) / 2); g.add(l); }
    const code = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d')!; q.fillStyle = '#f5f5f5'; q.fillRect(0, 0, 64, 64); q.fillStyle = '#111'; q.fillRect(4, 4, 56, 56); q.fillStyle = '#f5f5f5'; for (let i = 0; i < 25; i++) if ((i * 7 + 3) % 3) q.fillRect(10 + (i % 5) * 9, 10 + Math.floor(i / 5) * 9, 8, 8); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 0.12).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: code, roughness: 0.6 }), f.spots.size);
    let k = 0; const m4 = new THREE.Matrix4(); for (const s of f.spots.values()) marks.setMatrixAt(k++, m4.makeTranslation(s.x, 0.013, s.z)); g.add(marks);
    // the way out to the table, dotted on the floor
    const way = ['door', 'out', 'aisle', 'table'].map((id) => f.spots.get(id)!), dot = new THREE.MeshBasicMaterial({ color: 0xffd600 });
    for (let i = 1; i < way.length; i++) { const a = way[i - 1]!, b = way[i]!, n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 0.3)); for (let j = 0; j <= n; j++) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.025, 12).rotateX(-Math.PI / 2), dot); d.position.set(a.x + ((b.x - a.x) * j) / n, 0.012, a.z + ((b.z - a.z) * j) / n); g.add(d); } }
    // the racking: blue uprights, orange beams, mesh decks, three levels, four bays a row
    const up = std(0x1565c0, 0.6, 0.4), beam = std(0xff6f00, 0.5, 0.45), deck = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.7, roughness: 0.5, transparent: true, opacity: 0.85 });
    for (let r = 0; r < ROWS; r++) {
      const zf = RACK_Z[r]!, zb = zf + RACK_D, xs = [0, 1, 2, 3, 4].map((i) => -2 * BAY_W + i * BAY_W);
      for (const x of xs) for (const z of [zf, zb]) { const u = box(0.07, 2.0, 0.07, up); u.position.set(x, 1.0, z); g.add(u); }
      for (const y of LEVELS) for (const z of [zf, zb]) { const bm = box(4 * BAY_W, 0.09, 0.05, beam); bm.position.set(0, y - 0.045, z); g.add(bm); }
      for (const y of LEVELS) { const dk = box(4 * BAY_W - 0.02, 0.012, RACK_D, deck); dk.position.set(0, y, zf + RACK_D / 2); g.add(dk); }
      const sign = tag([`ROW ${'ABC'[r]}`], '#ffab40', 256, 64); sign.sprite.scale.set(0.5, 0.125, 1); sign.sprite.position.set(-2 * BAY_W - 0.35, 2.15, zf); g.add(sign.sprite);
    }
    // totes, one instance a shelf place, shown where a shelf holds one
    this.totes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.22, 0.32), std(0x1e88e5, 0.1, 0.6), f.slots.length); g.add(this.totes);
    // walls on three sides, ribbed; a portal over the open front with the sign; lights in the roof
    const ribs = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const q = c.getContext('2d')!; for (let i = 0; i < 16; i++) { q.fillStyle = i % 2 ? '#26323c' : '#1c252d'; q.fillRect(i * 16, 0, 16, 64); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const wall = new THREE.MeshStandardMaterial({ map: ribs, metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 3), wall); back.position.set(0, 1.5, z1); g.add(back);
    for (const x of [x0, x1]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 3), wall); s.rotation.y = Math.PI / 2; s.position.set(x, 1.5, (z0 + z1) / 2); g.add(s); }
    const frame = std(0x37474f, 0.7, 0.35);
    for (const x of [-0.9, 0.9]) { const p = box(0.12, 2.9, 0.12, frame); p.position.set(x, 1.45, WZ - 0.05); g.add(p); }
    const lintel = box(1.92, 0.12, 0.12, frame); lintel.position.set(0, 2.9, WZ - 0.05); g.add(lintel);
    const sign = tag(['WAREHOUSE', 'your builds, kept · robots at work'], '#ffd600', 768, 160); sign.sprite.scale.set(1.6, 0.33, 1); sign.sprite.position.set(0, 3.25, WZ - 0.1); g.add(sign.sprite);
    for (const x of [-2, 0, 2]) { const bar = box(0.12, 0.04, z1 - z0 - 0.6, glow(0xe0f7fa, 1.1)); bar.position.set(x, 2.98, (z0 + z1) / 2); g.add(bar); }
    const lamp = new THREE.PointLight(0xe0f7fa, 1.4, 9); lamp.position.set(0, 2.7, (z0 + z1) / 2); g.add(lamp);
    // charging docks: a plate on the floor and a post with a light; the pick station: a bench with a screen
    for (const id of f.docks) {
      const s = f.spots.get(id)!, plate = box(0.5, 0.015, 0.5, std(0x263238, 0.6, 0.4)); plate.position.set(s.x, 0.01, s.z); g.add(plate);
      const post = box(0.16, 0.5, 0.08, std(0x37474f, 0.6, 0.4)); post.position.set(s.x, 0.25, s.z - 0.3); g.add(post);
      const led = box(0.1, 0.04, 0.02, glow(0x00e676, 0.3)); led.position.set(s.x, 0.45, s.z - 0.255); g.add(led); this.docks.set(id, led);
      const t2 = tag(['⚡ DOCK'], '#00e676', 256, 64); t2.sprite.scale.set(0.36, 0.09, 1); t2.sprite.position.set(s.x, 0.62, s.z - 0.3); g.add(t2.sprite);
    }
    const st = f.spots.get(f.station)!, bench = box(0.8, 0.05, 0.4, std(0x546e7a, 0.5, 0.5)); bench.position.set(st.x, 0.55, st.z - 0.35); g.add(bench);
    for (const sx of [-0.36, 0.36]) { const leg = box(0.04, 0.55, 0.36, std(0x37474f)); leg.position.set(st.x + sx, 0.275, st.z - 0.35); g.add(leg); }
    const t3 = tag(['PICK STATION'], '#b388ff', 256, 64); t3.sprite.scale.set(0.5, 0.125, 1); t3.sprite.position.set(st.x, 0.95, st.z - 0.35); g.add(t3.sprite);
    for (const b of fleet.bots) this.views.push(this.botView(b));
  }

  /** A mast robot's body, in its colour: a rounded chassis with vents, name plates and hazard-striped bumpers; a safety
   *  laser scanner and a depth camera at its front; an emergency stop on its back; two drive wheels with their bolts
   *  and four swivel casters; a mast with its drive belt, cable chain, a screen and a beacon; a carriage with striped
   *  fork tips and its own camera. */
  private botView(b: Bot): BotView {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body); this.group.add(root);
    const shell = std(0x2b3036, 0.5, 0.45), accent = std(b.colour, 0.3, 0.45), black = std(0x0d0d0d, 0.2, 0.8), steel = std(0x90a4ae, 0.75, 0.35);
    const col = `#${b.colour.toString(16).padStart(6, '0')}`;
    const base = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.24, 0.66, 3, 0.035), shell); base.position.y = 0.17; body.add(base);
    const band = box(0.565, 0.045, 0.665, accent); band.position.y = 0.225; body.add(band);
    const deck = box(0.5, 0.012, 0.6, std(0x37474f, 0.6, 0.5)); deck.position.y = 0.296; body.add(deck);
    for (let k = 0; k < 7; k++) for (const sx of [-1, 1]) { const v = box(0.004, 0.06, 0.03, black); v.position.set(sx * 0.281, 0.15, -0.18 + k * 0.06); body.add(v); }
    // name plates on its sides, hazard stripes on its bumpers
    const plate = canvasTex(256, 64, (g) => { g.fillStyle = '#101418'; g.fillRect(0, 0, 256, 64); g.fillStyle = col; g.fillRect(0, 0, 10, 64); g.font = `800 34px ${FONT}`; g.fillStyle = '#ffffff'; g.fillText(b.name.toUpperCase().slice(0, 10), 22, 44); g.font = `600 16px ${FONT}`; g.fillStyle = '#90a4ae'; g.fillText(b.id.toUpperCase(), 200, 44); });
    for (const sx of [-1, 1]) { const np = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 })); np.position.set(sx * 0.282, 0.205, 0.12); np.rotation.y = sx * Math.PI / 2; body.add(np); }
    const stripes = canvasTex(256, 32, (g) => { g.fillStyle = '#ffd600'; g.fillRect(0, 0, 256, 32); g.fillStyle = '#111'; for (let x = -32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, 32); g.fill(); } });
    for (const sz of [-1, 1]) { const bp = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.05, 0.035), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })); bp.position.set(0, 0.085, sz * 0.345); body.add(bp); }
    const strip = box(0.46, 0.018, 0.01, glow(b.colour, 1.6)); strip.position.set(0, 0.262, -0.333); body.add(strip);
    // the safety scanner low at its front corner, a depth camera over it, the stop button on its back
    const scan = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.07, 24), black); scan.position.set(0.2, 0.12, -0.3); body.add(scan);
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.022, 24, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x8b0000, emissive: 0x550000, transparent: true, opacity: 0.85 })); win.position.copy(scan.position); body.add(win);
    const cam = box(0.11, 0.03, 0.025, black); cam.position.set(0, 0.255, -0.338); body.add(cam);
    for (const sx of [-0.03, 0.03]) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.007, 14), new THREE.MeshStandardMaterial({ color: 0x1a237e, metalness: 0.9, roughness: 0.1 })); l.position.set(sx, 0.255, -0.351); l.rotation.y = Math.PI; body.add(l); }
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20), std(0xffd600, 0.2, 0.5)); ring.position.set(-0.18, 0.308, 0.28); body.add(ring);
    const estop = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xd50000, 0.2, 0.4)); estop.position.set(-0.18, 0.314, 0.28); body.add(estop);
    // wheels with their bolts; casters on swivels at the corners
    const wheels: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sx * 0.29, 0.085, 0); body.add(w); wheels.push(w);
      w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 28).rotateZ(Math.PI / 2), std(0x111111, 0.1, 0.9)));
      w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.054, 20).rotateZ(Math.PI / 2), accent));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.058, 8).rotateZ(Math.PI / 2), steel); bolt.position.set(0, Math.sin(a) * 0.028, Math.cos(a) * 0.028); w.add(bolt); }
    }
    for (const [x, z] of [[-0.22, -0.26], [0.22, -0.26], [-0.22, 0.26], [0.22, 0.26]] as const) { const fork = box(0.02, 0.04, 0.03, steel); fork.position.set(x, 0.045, z); body.add(fork); const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.018, 14).rotateZ(Math.PI / 2), black); cw.position.set(x, 0.025, z + 0.01); body.add(cw); }
    // the mast: uprights, a back plate, its belt, its cable chain, a screen, a beacon on top
    for (const sx of [-1, 1]) { const u = box(0.05, 1.75, 0.06, steel); u.position.set(sx * 0.22, 1.16, 0.22); body.add(u); }
    const backPlate = box(0.39, 1.6, 0.012, std(0x263238, 0.5, 0.5)); backPlate.position.set(0, 1.12, 0.25); body.add(backPlate);
    const belt = box(0.03, 1.66, 0.008, black); belt.position.set(0.12, 1.14, 0.243); body.add(belt);
    for (let k = 0; k < 26; k++) { const link = box(0.04, 0.03, 0.02, std(0x424242, 0.4, 0.6)); link.position.set(-0.13, 0.4 + k * 0.058, 0.262); body.add(link); }
    const top = box(0.5, 0.05, 0.08, shell); top.position.set(0, 2.05, 0.22); body.add(top);
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.06, 16), glow(b.colour, 2)); beacon.position.set(0, 2.11, 0.22); body.add(beacon);
    const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.05, 20), std(0x111111, 0.6, 0.3)); lidar.position.set(0, 0.33, -0.24); body.add(lidar);
    // the carriage climbs the mast; its forks reach forward into a shelf
    const carriage = new THREE.Group(); carriage.position.set(0, 0.1, 0.17); body.add(carriage);
    carriage.add(new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.12, 0.05, 2, 0.01), accent));
    for (const sx of [-0.18, -0.06, 0.06, 0.18]) { const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8).rotateX(Math.PI / 2), steel); bolt.position.set(sx, 0.03, -0.027); carriage.add(bolt); }
    const ccam = box(0.04, 0.025, 0.02, black); ccam.position.set(0, 0.075, -0.03); carriage.add(ccam);
    const forks = new THREE.Group(); carriage.add(forks);
    const tray = box(0.44, 0.02, 0.46, std(0x78909c, 0.7, 0.35)); tray.position.set(0, -0.05, -0.25); forks.add(tray);
    for (const sx of [-0.2, 0.2]) { const tip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.022, 0.08), new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.6 })); tip.position.set(sx, -0.05, -0.47); forks.add(tip); }
    const tote = box(0.42, 0.22, 0.32, std(0x1e88e5, 0.1, 0.6)); tote.position.set(0, 0.07, -0.25); tote.visible = false; forks.add(tote);
    const label = tag([b.name, ''], col, 512, 160); label.sprite.scale.set(0.62, 0.195, 1); label.sprite.position.set(0, 2.42, 0.1); root.add(label.sprite);
    return { bot: b, root, body, wheels, carriage, forks, strip, beacon, label, said: '', tote, held: null, pitch: 0 };
  }

  /** A stored build's model, set on its shelf: its parts scaled to fit a shelf place, with its name over it. */
  setMini(id: string, obj: THREE.Object3D, title: string): void {
    this.dropMini(id);
    const fit = new THREE.Box3().setFromObject(obj), size = fit.getSize(new THREE.Vector3()), k = Math.min(0.9 / Math.max(1e-3, size.x), 0.4 / Math.max(1e-3, size.y), 0.36 / Math.max(1e-3, size.z), 1);
    const holder = new THREE.Group(), centre = fit.getCenter(new THREE.Vector3());
    obj.position.sub(centre).multiplyScalar(1); obj.position.y += size.y / 2; holder.add(obj); holder.scale.setScalar(k);
    const wrap = new THREE.Group(); wrap.add(holder);
    const plinth = box(0.5 / 1, 0.025, 0.36, glow(0x0b3d4a, 0.6)); plinth.position.y = -0.0125; wrap.add(plinth);
    const label = tag([title, ''], '#80deea', 512, 128); label.sprite.scale.set(0.5, 0.125, 1); label.sprite.position.y = 0.52; wrap.add(label.sprite);
    this.minis.set(id, { obj: wrap, label }); this.group.add(wrap);
  }
  dropMini(id: string): void { const m = this.minis.get(id); if (!m) return; m.obj.parent?.remove(m.obj); this.minis.delete(id); }

  /** Everything as the fleet now has it: the robots where they are, their carriages, forks, lights and labels; the
   *  totes and builds on the shelves and on the forks. */
  update(dt: number): void {
    this.t += dt;
    const f = this.fleet.floor, m4 = new THREE.Matrix4(), hide = new THREE.Matrix4().makeScale(0, 0, 0);
    // the totes sent to the GPU only when one is shelved or taken
    const tk = f.slots.map((s) => (s.holds?.startsWith('tote') ? 1 : 0)).join('');
    if (tk !== this.totesKey) { this.totesKey = tk; f.slots.forEach((s, i) => this.totes.setMatrixAt(i, s.holds?.startsWith('tote') ? m4.makeTranslation(s.x, s.y + 0.12, s.z) : hide)); this.totes.instanceMatrix.needsUpdate = true; }
    // builds on shelves; a build on a robot's forks rides there
    for (const [id, m] of this.minis) { const s = f.slots.find((x) => x.holds === id); m.obj.visible = !!s; if (s && m.obj.parent !== this.group) this.group.add(m.obj); if (s) m.obj.position.set(s.x, s.y + 0.02, s.z); }
    for (const v of this.views) {
      const b = v.bot; v.root.position.set(b.x, 0, b.z); v.root.rotation.y = b.h;
      v.carriage.position.y = b.lift; v.forks.position.z = -b.reach;
      // its wheels turn as a differential drive's do; it pitches as it speeds up and brakes
      const [wl, wr] = wheelSpeeds(b.v, b.spin, 0.58, 0.085); v.wheels[0]!.rotation.x -= wl * dt; v.wheels[1]!.rotation.x -= wr * dt;
      v.pitch += (pitchOf(b.a, 0.25) - v.pitch) * Math.min(1, dt * 10); v.body.rotation.x = -v.pitch;
      // what it carries
      const build = b.carrying?.startsWith('build-') ? this.minis.get(b.carrying) : null;
      v.tote.visible = !!b.carrying && !build;
      if (build) { if (build.obj.parent !== v.forks) v.forks.add(build.obj); build.obj.visible = true; build.obj.position.set(0, -0.03, -0.25); }
      else if (v.held && v.held.parent === v.forks) v.forks.remove(v.held);
      v.held = build?.obj ?? null;
      // its light: what it is doing; low, red; asleep, breathing slowly; charging, pulsing
      const low = b.battery < 20 && b.state !== 'charging', col = low ? 0xff1744 : LIGHT[b.state];
      const pulse = b.state === 'sleeping' ? 0.25 + 0.2 * Math.sin(this.t * 1.2) : b.state === 'charging' ? 0.8 + 0.6 * Math.sin(this.t * 4) : b.state === 'waiting' ? (Math.sin(this.t * 10) > 0 ? 1.8 : 0.3) : 1.6;
      for (const o of [v.strip, v.beacon]) { const mt = o.material as THREE.MeshStandardMaterial; mt.color.setHex(col); mt.emissive.setHex(col); mt.emissiveIntensity = pulse; }
      const said = `${Math.round(b.battery)}% · ${b.doing}`;
      if (said !== v.said && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) { v.said = said; v.label.draw([b.asleep ? `${b.name} 💤` : b.name, said], `#${b.colour.toString(16).padStart(6, '0')}`); }
    }
    for (const [id, led] of this.docks) { const on = this.fleet.bots.some((b) => b.spot === id && b.state === 'charging'); (led.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1 + Math.sin(this.t * 4) : 0.3; }
  }
  /** Where you stand to look in, and the point you look at. */
  static readonly VIEW = { stand: new THREE.Vector3(0, 0, WZ - 0.9), look: new THREE.Vector3(0, 1.0, WZ + 2.6) };
  /** The middle of a bay row, for the robots' names to say where they are. */
  static spotWords(id: string): string { const m = /^L(\d):(-?[\d.]+)$/.exec(id); if (!m) return id; const r = Number(m[1]), x = Number(m[2]), bay = BAY_X.indexOf(x); return bay >= 0 ? `row ${'ABC'[r]}, bay ${bay + 1}` : `lane ${r + 1}`; }
}
