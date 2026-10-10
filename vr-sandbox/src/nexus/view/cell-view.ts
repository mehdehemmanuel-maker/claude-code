// The workshop corner, drawn as the cell has it (src/nexus/machines/cell.ts): the printer laying down its beads at their real
// size, its tool head where the G-code has it, its screen; the computer the bench arm presses Print on, showing the
// G-code and the layer; the investing table and its flask; the kiln, its door and the glow inside it; the crucible
// furnace, its lid, its flame and the metal's glow; the pour, a stream of light the colour of its heat; the quench
// bucket; the shelf of what was made; the rack of parts; the plate where the bench arm puts things together; and the
// two arms, each solved to where its tool is (yaw at the base, then the law of cosines for shoulder and elbow).

import * as THREE from 'three';
import { COMPONENTS, Cell, RAIL_X, RAIL_Z, RECIPES, STATIONS, BENCH_ARM, Printer, METALS, stateOf, type Arm, type MadePart, type Section } from '../machines/cell';
import { glow } from '../../engineering/thermal';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const FONT = 'system-ui, -apple-system, Segoe UI, sans-serif';
const std = (color: number, metalness = 0.4, roughness = 0.55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const box = (w: number, h: number, d: number, m: THREE.Material) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r: number, h: number, m: THREE.Material, n = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m);
/** A screen: a canvas on a plane, drawn by a function when asked. */
function screen(w: number, h: number, px = 512): { mesh: THREE.Mesh; g: CanvasRenderingContext2D; done(): void; W: number; H: number } {
  const c = document.createElement('canvas'); c.width = px; c.height = Math.round((px * h) / w); const g = c.getContext('2d')!, tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  return { mesh, g, done: () => { tex.needsUpdate = true; }, W: c.width, H: c.height };
}
function tag(text: string, colour = '#ffd600', w = 0.5): THREE.Sprite {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(4,10,16,0.8)'; g.beginPath(); g.roundRect(4, 4, 504, 88, 20); g.fill(); g.strokeStyle = colour; g.lineWidth = 4; g.stroke();
  g.font = `700 40px ${FONT}`; g.fillStyle = colour; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(w, w * 0.1875, 1); return s;
}
/** A part's sections made solid (mm to m), standing on its base. */
export function partMesh(sections: Section[], mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const s of sections) {
    const sh = new THREE.Shape(s.outline.map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000)));
    for (const h of s.holes ?? []) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x / 1000, y / 1000))));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: (s.z1 - s.z0) / 1000, bevelEnabled: false, curveSegments: 6 }); geo.rotateX(-Math.PI / 2); geo.translate(0, s.z0 / 1000, 0);
    g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}
const PLA = std(0xff7043, 0.05, 0.6), ALU = std(0xcfd8dc, 0.9, 0.3), STEEL = std(0x78909c, 0.8, 0.35), DARK = std(0x263238, 0.5, 0.5), FRAME = std(0x37474f, 0.7, 0.4);

interface ArmView { arm: Arm; base: THREE.Group; yaw: THREE.Group; upper: THREE.Group; fore: THREE.Group; wrist: THREE.Group; fingers: THREE.Mesh[]; L1: number; L2: number; held: THREE.Object3D | null; heldKey: string; carriage?: THREE.Mesh }

export class CellView {
  readonly group = new THREE.Group();
  private readonly beads: THREE.InstancedMesh; private drawnBeads = 0;
  private readonly head: THREE.Group; private readonly gantry: THREE.Group; private readonly laying: THREE.Mesh;
  private readonly prScreen: ReturnType<typeof screen>; private readonly pc: ReturnType<typeof screen>; private readonly kilnScreen: ReturnType<typeof screen>;
  private readonly kilnDoor: THREE.Group; private readonly kilnGlow: THREE.Mesh;
  private readonly lid: THREE.Mesh; private readonly flame: THREE.Mesh; private readonly crucible: THREE.Group; private readonly melt: THREE.Mesh; private readonly stream: THREE.Mesh;
  private readonly flask: THREE.Group; private readonly plaster: THREE.Mesh; private readonly patternIn: THREE.Mesh; private readonly metalIn: THREE.Mesh;
  private readonly arms: ArmView[] = [];
  private readonly shelfG = new THREE.Group(); private readonly plateG = new THREE.Group(); private shelfKey = ''; private plateKey = '';
  private readonly origin: THREE.Vector3; private t = 0; private slow = 0;
  /** the parts the arms may hold, by name, as meshes to copy */ private readonly looks = new Map<string, () => THREE.Object3D>();
  constructor(readonly cell: Cell) {
    const g = this.group;
    // the floor of the corner, its sign
    const pad = box(3.4, 0.01, 5.6, std(0x1d2329, 0.2, 0.8)); pad.position.set(-4.3, 0.005, -1.75); g.add(pad);
    const sign = tag('WORKSHOP · print · cast · build', '#ff7043', 1.2); sign.position.set(-4.3, 2.4, -1.75); g.add(sign);
    // ---- the printer on its stand: a gantry that climbs (z), a head that runs x and y over a still bed ----
    const P = STATIONS.printer, stand = box(0.6, 0.75, 0.55, DARK); stand.position.set(P.x, 0.375, P.z); g.add(stand);
    const frameH = 0.5, base = 0.78; this.origin = new THREE.Vector3(P.x + 0.11, base + 0.03, P.z + 0.11);
    for (const [dx, dz] of [[-0.21, -0.21], [-0.21, 0.21], [0.21, -0.21], [0.21, 0.21]] as const) { const p2 = box(0.025, frameH, 0.025, FRAME); p2.position.set(P.x + dx, base + frameH / 2, P.z + dz); g.add(p2); }
    const top = box(0.45, 0.025, 0.45, FRAME); top.position.set(P.x, base + frameH, P.z); g.add(top);
    const bed = box(0.235, 0.01, 0.235, std(0x1a1a1a, 0.3, 0.6)); bed.position.set(P.x, base + 0.025, P.z); g.add(bed);
    this.gantry = new THREE.Group(); g.add(this.gantry);
    const rail = box(0.04, 0.02, 0.44, FRAME); this.gantry.add(rail);
    this.head = new THREE.Group(); this.gantry.add(this.head);
    this.head.add(box(0.05, 0.05, 0.045, std(0x212121, 0.4, 0.5)).translateY(0.035));
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 12), std(0xffb300, 0.9, 0.3)); nozzle.rotation.x = Math.PI; nozzle.position.y = 0.006; this.head.add(nozzle);
    this.beads = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), PLA, 60000); this.beads.count = 0; this.beads.frustumCulled = false; g.add(this.beads);
    this.laying = box(1, 1, 1, PLA); this.laying.visible = false; g.add(this.laying);
    this.prScreen = screen(0.1, 0.06, 256); this.prScreen.mesh.position.set(P.x + 0.29, 0.6, P.z); this.prScreen.mesh.rotation.y = Math.PI / 2; g.add(this.prScreen.mesh);
    const lbl = tag('3D printer · G-code', '#ff7043', 0.42); lbl.position.set(P.x, base + frameH + 0.15, P.z); g.add(lbl);
    // ---- the computer on its desk, its screen turned to you ----
    const C = STATIONS.computer, desk = box(0.8, 0.04, 0.5, std(0x455a64, 0.3, 0.6)); desk.position.set(C.x, 0.74, C.z); g.add(desk);
    for (const dx of [-0.37, 0.37]) { const leg = box(0.04, 0.72, 0.46, DARK); leg.position.set(C.x + dx, 0.36, C.z); g.add(leg); }
    this.pc = screen(0.5, 0.31, 768); this.pc.mesh.position.set(C.x, 1.0, C.z - 0.1); this.pc.mesh.lookAt(-1.5, 1.0, -1.0); g.add(this.pc.mesh);
    const bezel = box(0.52, 0.33, 0.02, std(0x111111, 0.3, 0.5)); bezel.position.copy(this.pc.mesh.position); bezel.quaternion.copy(this.pc.mesh.quaternion); bezel.translateZ(-0.012); g.add(bezel);
    // ---- the investing table and the flask ----
    const I = STATIONS.invest, it = box(0.5, 0.82, 0.5, DARK); it.position.set(I.x, 0.41, I.z); g.add(it);
    this.flask = new THREE.Group(); g.add(this.flask);
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 24, 1, true), std(0x9e9e9e, 0.85, 0.35)); fl.material.side = THREE.DoubleSide; fl.position.y = 0.065; this.flask.add(fl);
    this.plaster = cyl(0.048, 0.12, std(0xf5f5f5, 0, 0.9)); this.plaster.position.y = 0.06; this.flask.add(this.plaster);
    this.patternIn = cyl(0.02, 0.06, PLA); this.patternIn.position.y = 0.09; this.flask.add(this.patternIn);
    this.metalIn = cyl(0.012, 0.004, std(0xffffff, 0.2, 0.4)); this.metalIn.position.y = 0.122; this.flask.add(this.metalIn);
    g.add(tag('invest · flask', '#ffd600', 0.3).translateX(I.x).translateY(1.2).translateZ(I.z));
    // ---- the kiln: a box on a stand, a door that swings, the glow inside, its controller ----
    const K = STATIONS.kiln, ks = box(0.5, 0.55, 0.5, DARK); ks.position.set(K.x, 0.275, K.z); g.add(ks);
    const body = box(0.5, 0.5, 0.5, std(0x8d6e63, 0.3, 0.7)); body.position.set(K.x, 0.8, K.z); g.add(body);
    this.kilnGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: 0x220000, toneMapped: false })); this.kilnGlow.position.set(K.x + 0.252, 0.8, K.z); this.kilnGlow.rotation.y = Math.PI / 2; g.add(this.kilnGlow);
    this.kilnDoor = new THREE.Group(); this.kilnDoor.position.set(K.x + 0.255, 0.8, K.z + 0.2); g.add(this.kilnDoor);
    const door = box(0.03, 0.42, 0.4, std(0x6d4c41, 0.3, 0.7)); door.position.set(0, 0, -0.2); this.kilnDoor.add(door);
    this.kilnScreen = screen(0.16, 0.06, 256); this.kilnScreen.mesh.position.set(K.x + 0.255, 1.12, K.z); this.kilnScreen.mesh.rotation.y = Math.PI / 2; g.add(this.kilnScreen.mesh);
    g.add(tag('kiln · burnout', '#ff8a65', 0.32).translateX(K.x).translateY(1.32).translateZ(K.z));
    // ---- the crucible furnace on the floor: lid, burner and flame, the crucible and its metal ----
    const F = STATIONS.furnace, shell = cyl(0.22, 0.5, std(0x546e7a, 0.6, 0.45), 32); shell.position.set(F.x, 0.25, F.z); g.add(shell);
    const mouth = cyl(0.12, 0.01, new THREE.MeshBasicMaterial({ color: 0x110000 }), 32); mouth.position.set(F.x, 0.505, F.z); g.add(mouth);
    this.lid = cyl(0.22, 0.05, std(0x455a64, 0.6, 0.45), 32); this.lid.position.set(F.x, 0.53, F.z); g.add(this.lid);
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 12), STEEL); burner.rotation.z = Math.PI / 2; burner.position.set(F.x + 0.33, 0.18, F.z); g.add(burner);
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); this.flame.rotation.z = Math.PI / 2; this.flame.position.set(F.x + 0.14, 0.18, F.z); g.add(this.flame);
    this.crucible = new THREE.Group(); g.add(this.crucible);
    const cr = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.13, 24, 1, true), std(0x3e2723, 0.2, 0.9)); cr.material.side = THREE.DoubleSide; cr.position.y = 0.065; this.crucible.add(cr);
    this.melt = cyl(0.055, 0.01, new THREE.MeshStandardMaterial({ color: 0x9e9e9e, emissive: 0x000000, metalness: 0.6, roughness: 0.4 })); this.melt.position.y = 0.08; this.crucible.add(this.melt);
    g.add(tag('crucible furnace · propane', '#ffab40', 0.4).translateX(F.x).translateY(0.9).translateZ(F.z));
    // ---- the pour tray, the stream, the quench bucket ----
    const Q = STATIONS.pour, tray = box(0.4, 0.05, 0.3, std(0xbcaaa4, 0, 0.95)); tray.position.set(Q.x, 0.62, Q.z); g.add(tray);
    const trayLeg = box(0.36, 0.6, 0.26, DARK); trayLeg.position.set(Q.x, 0.3, Q.z); g.add(trayLeg);
    this.stream = cyl(0.004, 1, new THREE.MeshBasicMaterial({ color: 0xff8f00, toneMapped: false }), 8); this.stream.visible = false; g.add(this.stream);
    const B = STATIONS.quench, buck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.4, 24, 1, true), std(0x607d8b, 0.7, 0.4)); buck.material.side = THREE.DoubleSide; buck.position.set(B.x, 0.2, B.z); g.add(buck);
    const water = cyl(0.15, 0.01, new THREE.MeshStandardMaterial({ color: 0x29b6f6, transparent: true, opacity: 0.6, roughness: 0.1 })); water.position.set(B.x, 0.34, B.z); g.add(water);
    // ---- the shelf of what was made, the rack of parts, the plate ----
    const S = STATIONS.shelf, sh = box(0.6, 0.04, 0.35, std(0x5d4037, 0.1, 0.8)); sh.position.set(S.x, 0.86, S.z); g.add(sh);
    const shLeg = box(0.56, 0.84, 0.3, DARK); shLeg.position.set(S.x, 0.42, S.z); g.add(shLeg);
    this.shelfG.position.set(S.x - 0.22, 0.88, S.z); g.add(this.shelfG); g.add(tag('made here', '#69f0ae', 0.3).translateX(S.x).translateY(1.25).translateZ(S.z));
    const R = STATIONS.rack, rk = new THREE.Group(); rk.position.set(R.x, 0, R.z); g.add(rk);
    for (const y of [0.3, 0.75, 1.2, 1.65]) { const s2 = box(0.9, 0.03, 0.35, std(0x8d6e63, 0.1, 0.8)); s2.position.y = y; rk.add(s2); }
    for (const dx of [-0.44, 0.44]) for (const dz of [-0.16, 0.16]) { const u = box(0.03, 1.7, 0.03, FRAME); u.position.set(dx, 0.85, dz); rk.add(u); }
    COMPONENTS.forEach((c, i) => { const m = this.componentMesh(c.id); const row = Math.floor(i / 5), col = i % 5; m.position.set(-0.36 + col * 0.18, [0.3, 0.75, 1.2, 1.65][Math.min(3, row)]! + 0.016, 0); rk.add(m); });
    rk.add(tag('parts rack', '#80deea', 0.3).translateY(1.95));
    const PL = STATIONS.plate, bench = box(1.3, 0.05, 0.6, std(0x546e7a, 0.4, 0.5)); bench.position.set((PL.x + BENCH_ARM.x) / 2, 0.84, PL.z); g.add(bench);
    const benchLeg = box(1.2, 0.82, 0.5, DARK); benchLeg.position.set((PL.x + BENCH_ARM.x) / 2, 0.41, PL.z); g.add(benchLeg);
    const plate = box(0.36, 0.012, 0.3, std(0x90a4ae, 0.85, 0.3)); plate.position.set(PL.x, 0.872, PL.z); g.add(plate);
    this.plateG.position.set(PL.x - 0.14, 0.878, PL.z - 0.1); g.add(this.plateG); g.add(tag('assembly plate', '#b388ff', 0.34).translateX(PL.x).translateY(1.3).translateZ(PL.z));
    // ---- the rail and the two arms ----
    for (const dx of [-0.12, 0.12]) { const r2 = box(0.04, 0.03, RAIL_Z[1] - RAIL_Z[0] + 0.7, STEEL); r2.position.set(RAIL_X + dx, 0.015, (RAIL_Z[0] + RAIL_Z[1]) / 2); g.add(r2); }
    const carriage = box(0.36, 0.08, 0.4, std(0xff6f00, 0.5, 0.4)); g.add(carriage);
    this.arms.push(this.armView(cell.arms.rail, 0.55, 0.5, 0.08, carriage));
    this.arms.push(this.armView(cell.arms.bench, 0.42, 0.38, 0.87));
    // what the arms can hold
    for (const r of RECIPES) for (const p of r.printed) { this.looks.set(p.name, () => partMesh(p.sections, p.cast ? ALU : PLA)); this.looks.set(`${p.name} pattern`, () => partMesh(p.sections, PLA)); }
    for (const c of COMPONENTS) this.looks.set(c.id, () => this.componentMesh(c.id));
  }
  private componentMesh(id: string): THREE.Object3D { const c = COMPONENTS.find((x) => x.id === id)!; const [w, d, h] = c.size.map((v) => Math.max(0.004, v / 1000)) as [number, number, number]; const m = c.kind === 'optics' || c.kind === 'power' ? cyl(w / 2, h, std(c.colour, 0.3, 0.4)) : box(w, h, d, std(c.colour, 0.3, 0.5)); m.position.y = h / 2; const g = new THREE.Group(); g.add(m); return g; }
  private armView(arm: Arm, L1: number, L2: number, y0: number, carriage?: THREE.Mesh): ArmView {
    const base = new THREE.Group(); this.group.add(base);
    const col = arm.id === 'rail' ? 0xff6f00 : 0x7c4dff, shell = std(col, 0.35, 0.4), white = std(0xeceff1, 0.15, 0.4), ringM = new THREE.MeshStandardMaterial({ color: 0x4dd0e1, emissive: 0x4dd0e1, emissiveIntensity: 1.2 });
    // the base flange and its bolt circle
    base.add(cyl(0.12, 0.03, DARK, 32).translateY(y0 + 0.015)); base.add(cyl(0.1, 0.06, white, 32).translateY(y0 + 0.06));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, b2 = cyl(0.007, 0.012, STEEL, 8); b2.position.set(Math.cos(a) * 0.105, y0 + 0.034, Math.sin(a) * 0.105); base.add(b2); }
    const yaw = new THREE.Group(); yaw.position.y = y0 + 0.08; base.add(yaw);
    yaw.add(cyl(0.075, 0.26, white, 32).translateY(0.13)); yaw.add(new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.005, 8, 40).rotateX(Math.PI / 2), ringM).translateY(0.02));
    const shoulder = new THREE.Group(); shoulder.position.y = 0.32; yaw.add(shoulder);
    /** a joint's housing: a drum across the arm, its caps, a ring of light where it turns */
    const joint = (r: number, w: number) => { const g2 = new THREE.Group(); g2.add(cyl(r, w, white, 32).rotateZ(Math.PI / 2)); for (const sx of [-1, 1]) { const cap = cyl(r * 0.75, 0.012, shell, 32).rotateZ(Math.PI / 2); cap.position.x = sx * (w / 2 + 0.006); g2.add(cap); const rg = new THREE.Mesh(new THREE.TorusGeometry(r * 0.9, 0.004, 6, 32).rotateY(Math.PI / 2), ringM); rg.position.x = sx * (w / 2 + 0.002); g2.add(rg); } return g2; };
    const link = (w: number, L: number) => { const g2 = new THREE.Group(); const m = new THREE.Mesh(new RoundedBoxGeometry(w, w, L, 3, w * 0.3), shell); m.position.z = L / 2; g2.add(m); const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(w * 0.6, w * 0.3, 0.03), new THREE.Vector3(w * 0.7, w * 0.4, L / 2), new THREE.Vector3(w * 0.6, w * 0.3, L - 0.03)]), 16, 0.006, 6), std(0x212121, 0.2, 0.8)); g2.add(cable); return g2; };
    const upper = new THREE.Group(); shoulder.add(upper);
    upper.add(link(0.07, L1)); upper.add(joint(0.06, 0.12));
    const fore = new THREE.Group(); fore.position.z = L1; upper.add(fore);
    fore.add(link(0.055, L2)); fore.add(joint(0.05, 0.1));
    const wrist = new THREE.Group(); wrist.position.z = L2; fore.add(wrist);
    wrist.add(joint(0.03, 0.07)); wrist.add(cyl(0.032, 0.03, DARK).translateY(-0.03));
    const wcam = box(0.025, 0.02, 0.02, std(0x111111, 0.4, 0.4)); wcam.position.set(0.035, -0.035, 0); wrist.add(wcam);
    const fingers: THREE.Mesh[] = []; for (const s of [-1, 1]) { const f = box(0.012, 0.06, 0.02, STEEL); f.position.set(s * 0.025, -0.075, 0); const pad = box(0.004, 0.035, 0.018, std(0x263238, 0.1, 0.9)); pad.position.x = -s * 0.007; pad.position.y = -0.01; f.add(pad); wrist.add(f); fingers.push(f); }
    const v: ArmView = { arm, base, yaw, upper, fore, wrist, fingers, L1, L2, held: null, heldKey: '', ...(carriage ? { carriage } : {}) };
    if (arm.id === 'bench') base.position.set(BENCH_ARM.x, 0, BENCH_ARM.z);
    return v;
  }
  /** An arm solved to where its tool is: its base turned to it, shoulder and elbow by the law of cosines, its wrist kept
   *  pointing down so what it holds hangs level. */
  private solve(v: ArmView): void {
    const a = v.arm; if (a.id === 'rail') { v.base.position.set(RAIL_X, 0, a.railZ); v.carriage!.position.set(RAIL_X, 0.07, a.railZ); }
    v.base.updateMatrixWorld(true);
    const sh = new THREE.Vector3(); (v.upper.parent as THREE.Object3D).getWorldPosition(sh);
    const wristAt = new THREE.Vector3(a.tool[0], a.tool[1] + 0.09, a.tool[2]), d = wristAt.clone().sub(sh);
    v.yaw.rotation.y = Math.atan2(d.x, d.z);
    const horiz = Math.hypot(d.x, d.z), r = Math.min(v.L1 + v.L2 - 1e-3, Math.max(0.08, Math.hypot(horiz, d.y)));
    const elev = Math.atan2(d.y, horiz), alpha = Math.acos((v.L1 ** 2 + r * r - v.L2 ** 2) / (2 * v.L1 * r)), beta = Math.acos((v.L1 ** 2 + v.L2 ** 2 - r * r) / (2 * v.L1 * v.L2));
    v.upper.rotation.x = -(elev + alpha); v.fore.rotation.x = Math.PI - beta; v.wrist.rotation.x = -(v.upper.rotation.x + v.fore.rotation.x);
    // fingers: closed on what it holds, open otherwise; a press is a tap down
    const open = a.holding ? 0.018 : 0.03; v.fingers.forEach((f, i) => { f.position.x = (i ? 1 : -1) * open; });
    const key = a.holding ?? '';
    if (key !== v.heldKey) { if (v.held) v.wrist.remove(v.held); v.held = null; v.heldKey = key; const mk = key ? this.looks.get(key) : undefined; if (mk) { v.held = mk(); v.held.position.y = -0.12; v.wrist.add(v.held); } }
  }
  private bead(m: THREE.Matrix4, b: { x0: number; y0: number; x1: number; y1: number; z: number; w: number; h: number }): THREE.Matrix4 {
    const o = this.origin, ax = o.x + (110 - b.y0) / 1000 - 0.11, az = o.z - (b.x0 - 110) / 1000 - 0.11, bx = o.x + (110 - b.y1) / 1000 - 0.11, bz = o.z - (b.x1 - 110) / 1000 - 0.11;
    const len = Math.max(1e-4, Math.hypot(bx - ax, bz - az)), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(bx - ax, bz - az));
    return m.compose(new THREE.Vector3((ax + bx) / 2, o.y + (b.z - b.h / 2) / 1000, (az + bz) / 2), q, new THREE.Vector3(b.w / 1000, b.h / 1000, len + b.w / 1000));
  }
  /** Everything as the cell has it now. */
  update(dt: number): void {
    this.t += dt; const c = this.cell, pr = c.printer, m4 = new THREE.Matrix4();
    // the printer: beads laid since the last frame, the head and the gantry where the G-code has them
    if (pr.beads.length < this.drawnBeads) { this.drawnBeads = 0; this.beads.count = 0; }
    const from = this.drawnBeads;
    for (; this.drawnBeads < pr.beads.length && this.drawnBeads < this.beads.instanceMatrix.count; this.drawnBeads++) this.beads.setMatrixAt(this.drawnBeads, this.bead(m4, pr.beads[this.drawnBeads]!));
    // only the beads laid since the last frame go to the GPU: the whole buffer is 60 000 matrices, 3.8 MB
    if (this.drawnBeads !== from || this.beads.count !== this.drawnBeads) { const im = this.beads.instanceMatrix; im.clearUpdateRanges(); im.addUpdateRange(from * 16, (this.drawnBeads - from) * 16); im.needsUpdate = true; this.beads.count = this.drawnBeads; }
    const n = pr.nozzle(), o = this.origin; this.gantry.position.set(o.x - 0.11 + (110 - n[1]) / 1000, o.y + n[2] / 1000 + 0.004, this.origin.z - 0.11); this.head.position.set(0, 0, -(n[0] - 110) / 1000);
    const lay = pr.laying(); this.laying.visible = !!lay; if (lay) { this.bead(m4, lay); m4.decompose(this.laying.position, this.laying.quaternion, this.laying.scale); }
    // the slower things, five times a second: screens, shelf, plate
    this.slow -= dt; if (this.slow <= 0) { this.slow = 0.2; this.screens(); this.items(); }
    // the kiln: its door, and the glow of its chamber at its temperature (the Draper point, 525 °C, before it shows)
    this.kilnDoor.rotation.y += ((c.kiln.open ? -1.6 : 0) - this.kilnDoor.rotation.y) * Math.min(1, dt * 3);
    const kg = glow(c.kiln.t); (this.kilnGlow.material as THREE.MeshBasicMaterial).color.setHex(kg.intensity > 0 ? kg.color : 0x1a0a05).multiplyScalar(kg.intensity > 0 ? Math.min(1, 0.3 + kg.intensity) : 1);
    // the furnace: lid, flame by the burner, the crucible in it (or in the arm), the metal's colour by its heat
    this.lid.position.x += ((STATIONS.furnace.x + (c.furnace.lid ? 0 : 0.36)) - this.lid.position.x) * Math.min(1, dt * 3);
    this.flame.visible = c.furnace.burner > 0; this.flame.scale.setScalar(0.5 + c.furnace.burner * (0.8 + 0.2 * Math.sin(this.t * 31)));
    const rail = c.arms.rail, inArm = rail.holding === 'crucible';
    this.crucible.visible = !inArm; this.crucible.position.set(STATIONS.furnace.x, 0.38, STATIONS.furnace.z);
    const m = c.furnace.metal(), mt = this.melt.material as THREE.MeshStandardMaterial;
    this.melt.visible = !!m; if (m) { const gl = glow(m.T); mt.emissive.setHex(gl.color); mt.emissiveIntensity = gl.intensity > 0 ? 0.5 + gl.intensity : 0; mt.color.setHex(m.liquid > 0 ? 0xbdbdbd : 0x8d8d8d); }
    // the flask: on its table, in the kiln, on the pour tray, or in the arm; what is in it
    const f = c.flask, at = f.at === 'kiln' ? STATIONS.kiln : f.at === 'pour' ? STATIONS.pour : STATIONS.invest, armFlask = rail.holding === 'flask';
    this.flask.visible = !armFlask && !(f.at === 'kiln' && !c.kiln.open && f.state !== 'empty'); this.flask.position.set(at.x, f.at === 'pour' ? 0.645 : f.at === 'kiln' ? 0.56 : 0.82, at.z);
    this.plaster.visible = ['invested', 'set', 'burnt out', 'filled', 'frozen'].includes(f.state); this.patternIn.visible = ['pattern', 'invested', 'set'].includes(f.state);
    this.metalIn.visible = !!f.metal; if (f.metal) { const s2 = stateOf(f.metal), gl = glow(s2.T), mm = this.metalIn.material as THREE.MeshStandardMaterial; mm.emissive.setHex(gl.color); mm.emissiveIntensity = gl.intensity > 0 ? 0.6 + gl.intensity : 0; }
    // the pour: a stream from the crucible's lip, the colour of the metal's heat
    this.stream.visible = rail.pouring > 0 && inArm;
    if (this.stream.visible) { const P = STATIONS.pour, h = Math.max(0.05, rail.tool[1] - 0.12 - (0.645 + 0.13)); this.stream.scale.set(1, h, 1); this.stream.position.set(P.x, 0.645 + 0.13 + h / 2, P.z); const gl = glow(METALS[0]!.pour[0]); (this.stream.material as THREE.MeshBasicMaterial).color.setHex(gl.color); }
    for (const v of this.arms) this.solve(v);
    // what the arm holds is drawn at its fingers; the flask and crucible go with it
    const railView = this.arms[0]!;
    if (armFlask || inArm) { const w = new THREE.Vector3(); railView.wrist.getWorldPosition(w); const obj = armFlask ? this.flask : this.crucible; obj.visible = true; obj.position.set(w.x, w.y - 0.2, w.z); }
  }
  private screensKey = '';
  private screens(): void {
    const c = this.cell, pr = c.printer, m = c.furnace.metal();
    // drawn again (and sent to the GPU again) only when what they say changes
    const key = [pr.hot.t.toFixed(0), pr.hot.target, pr.bed.t.toFixed(0), pr.bed.target, pr.busy, pr.done, pr.total, pr.message, pr.waiting, pr.fan, pr.beads.length, (pr.energy / 3.6e6).toFixed(3), pr.grams().toFixed(1), c.kiln.says(), Math.round(c.furnace.t), Math.round(c.furnace.burner * 100), m ? `${Math.round(m.T)}/${Math.round(m.liquid * 100)}` : '', c.arms.rail.doing, c.arms.bench.doing, c.arms.bench.pressing > 0, c.speed, c.jobs.slice(-4).map((j) => `${j.name}:${j.stage}:${j.done}:${j.failed ?? ''}`).join(',')].join('|');
    if (key === this.screensKey) return; this.screensKey = key;
    { const s = this.prScreen, g = s.g; g.fillStyle = '#0b1a24'; g.fillRect(0, 0, s.W, s.H); g.fillStyle = '#80deea'; g.font = `600 20px ${FONT}`;
      g.fillText(`🔥 ${pr.hot.t.toFixed(0)}/${pr.hot.target.toFixed(0)} °C`, 10, 30); g.fillText(`▭ ${pr.bed.t.toFixed(0)}/${pr.bed.target.toFixed(0)} °C`, 10, 60);
      g.fillStyle = '#ffd600'; g.fillText(pr.busy ? `${Math.round((100 * pr.done) / Math.max(1, pr.total))}%` : pr.message || 'ready', 10, 92); g.fillText(pr.waiting ? `waiting: ${pr.waiting}` : '', 10, 122); s.done(); }
    { const s = this.pc, g = s.g, W = s.W, H = s.H; g.fillStyle = '#0d1117'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ff7043'; g.font = `700 30px ${FONT}`; g.fillText('Slicer · printer · cell', 20, 42);
      g.font = `500 20px monospace`; g.fillStyle = '#c9d1d9';
      const lines = [`printer  ${pr.busy ? 'printing' : 'idle'}  line ${pr.done}/${pr.total}  ${pr.grams().toFixed(1)} g PLA  ${(pr.energy / 3.6e6).toFixed(3)} kWh`, `hot end  ${pr.hot.t.toFixed(0)} → ${pr.hot.target} °C   bed ${pr.bed.t.toFixed(0)} → ${pr.bed.target} °C   fan ${Math.round(pr.fan * 100)}%`, `kiln     ${c.kiln.says()}`, `furnace  ${Math.round(c.furnace.t)} °C${c.furnace.metal() ? `  metal ${Math.round(c.furnace.metal()!.T)} °C, ${Math.round(c.furnace.metal()!.liquid * 100)}% molten` : ''}  burner ${Math.round(c.furnace.burner * 100)}%`, `arms     ${c.arms.rail.name}: ${c.arms.rail.doing}`, `         ${c.arms.bench.name}: ${c.arms.bench.doing}`, `speed    ×${c.speed} real time`];
      lines.forEach((l, i) => g.fillText(l, 20, 84 + i * 30));
      // the jobs, newest first, with where each is
      g.fillStyle = '#69f0ae'; g.font = `600 20px ${FONT}`; c.jobs.slice(-4).reverse().forEach((j, i) => g.fillText(`${j.done ? (j.failed ? '✗' : '✓') : '▶'} ${j.name}: ${j.stage}`.slice(0, 70), 20, 310 + i * 28));
      // the layer, from above
      const bx = W - 200, by = 60, sz = 170; g.strokeStyle = '#30363d'; g.strokeRect(bx, by, sz, sz); g.strokeStyle = '#ff7043'; g.lineWidth = 1.2; g.beginPath();
      const top = pr.beads.length ? pr.beads[pr.beads.length - 1]!.z : 0; for (const b of pr.beads.slice(-600)) if (Math.abs(b.z - top) < 1e-6) { g.moveTo(bx + (b.x0 / 220) * sz, by + sz - (b.y0 / 220) * sz); g.lineTo(bx + (b.x1 / 220) * sz, by + sz - (b.y1 / 220) * sz); } g.stroke();
      g.fillStyle = '#8b949e'; g.font = `500 16px ${FONT}`; g.fillText(`layer at ${top.toFixed(2)} mm`, bx, by + sz + 22);
      if (c.arms.bench.pressing > 0) { g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(0, 0, W, H); }
      s.done(); }
    { const s = this.kilnScreen, g = s.g; g.fillStyle = '#100'; g.fillRect(0, 0, s.W, s.H); g.fillStyle = '#ff5252'; g.font = `700 34px monospace`; g.fillText(`${Math.round(c.kiln.t)}°C`, 12, 44); g.font = `500 16px ${FONT}`; g.fillStyle = '#ffab91'; g.fillText(c.kiln.running ? `seg ${c.kiln.seg + 1}/${c.kiln.program.length}` : 'idle', 150, 40); s.done(); }
  }
  private items(): void {
    const c = this.cell, sk = c.shelf.join('|'), pk = c.plate.join('|');
    if (sk !== this.shelfKey) { this.shelfKey = sk; this.shelfG.clear(); c.shelf.slice(-6).forEach((name, i) => { const mk = this.looks.get(name); if (mk) { const o = mk(); o.position.set((i % 3) * 0.14, 0, Math.floor(i / 3) * 0.12 - 0.06); this.shelfG.add(o); } }); }
    if (pk !== this.plateKey) { this.plateKey = pk; this.plateG.clear(); c.plate.slice(-12).forEach((name, i) => { const mk = this.looks.get(name); if (mk) { const o = mk(); o.position.set((i % 4) * 0.085, 0, Math.floor(i / 4) * 0.09); this.plateG.add(o); } }); }
  }
  /** Where you stand to watch it, and the point you look at. */
  static readonly VIEW = { stand: new THREE.Vector3(-2.3, 0, -1.6), look: new THREE.Vector3(-4.3, 0.9, -1.8) };
  /** A part of a recipe, by its name, to print or cast on its own. */
  static partOf(name: string): MadePart | null { for (const r of RECIPES) for (const p of r.printed) if (p.name.toLowerCase() === name.toLowerCase() || p.id === name.toLowerCase()) return p; return null; }
  static readonly BED = Printer.BED;
}

/** A device as built: its printed parts and the parts off the rack, where they go on it (mm to m). The rover on its
 *  chassis with two wheels, its sensor ahead and its board on top; the pan-tilt camera on its servos; the rest set
 *  together on their printed parts. */
export function deviceMesh(r: { id: string; printed: MadePart[]; parts: { id: string; n: number }[] }): { obj: THREE.Group; wheels: THREE.Object3D[]; pan?: THREE.Object3D; tilt?: THREE.Object3D; stage?: THREE.Object3D } {
  const obj = new THREE.Group(), wheels: THREE.Object3D[] = [];
  const comp = (id: string) => { const c = COMPONENTS.find((x) => x.id === id)!, [w, d, h] = c.size.map((v) => Math.max(0.003, v / 1000)) as [number, number, number]; const m = new THREE.Mesh(c.kind === 'optics' || c.kind === 'power' ? new THREE.CylinderGeometry(w / 2, w / 2, h, 16) : new THREE.BoxGeometry(w, h, d), std(c.colour, 0.3, 0.5)); m.position.y = h / 2; const g = new THREE.Group(); g.add(m); return g; };
  if (r.id === 'rover') {
    const ch = partMesh(r.printed[0]!.sections, PLA); ch.rotation.y = Math.PI / 2; obj.add(ch);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.008, 20).rotateZ(Math.PI / 2), std(0x111111, 0.1, 0.9)); w.position.set(s * 0.04, 0.017, 0.01); obj.add(w); wheels.push(w); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.009, 10).rotateZ(Math.PI / 2), std(0xffd600)); w.add(hub); }
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), STEEL); caster.position.set(0, 0.006, -0.04); obj.add(caster);
    const esp = comp('esp32'); esp.position.set(0, 0.024, 0.005); obj.add(esp);
    const tof = comp('vl53l1x'); tof.rotation.x = Math.PI / 2; tof.position.set(0, 0.02, -0.052); obj.add(tof);
    const imu = comp('mpu6050'); imu.position.set(0.012, 0.03, 0.03); obj.add(imu);
    const drv = comp('drv8833'); drv.position.set(-0.015, 0.03, 0.03); obj.add(drv);
    for (const s of [-1, 1]) { const cellm = comp('18650'); cellm.rotation.x = Math.PI / 2; cellm.position.set(s * 0.012, 0.012, 0.03); obj.add(cellm); }
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.003, 12), new THREE.MeshBasicMaterial({ color: 0xff1744 })); eye.position.set(0, 0.02, -0.0535); eye.rotation.y = Math.PI; obj.add(eye);
    obj.position.y = 0; return { obj, wheels };
  }
  if (r.id === 'pan-tilt') {
    const base = partMesh(r.printed[0]!.sections, PLA); obj.add(base);
    const pan = new THREE.Group(); pan.position.y = 0.008; obj.add(pan); const s1 = comp('mg996r'); pan.add(s1);
    const yoke = partMesh(r.printed[1]!.sections, PLA); yoke.position.y = 0.043; pan.add(yoke);
    const tilt = new THREE.Group(); tilt.position.y = 0.075; pan.add(tilt); const s2 = comp('mg996r'); s2.rotation.z = Math.PI / 2; s2.position.x = -0.03; tilt.add(s2);
    const cam = comp('pi-cam3'); cam.rotation.x = Math.PI / 2; cam.position.set(0, 0.005, -0.02); tilt.add(cam);
    const esp = comp('esp32'); esp.position.set(0.05, 0, 0.03); obj.add(esp);
    return { obj, wheels, pan, tilt };
  }
  // the rest: printed parts stacked in their order, each part off the rack set on them in a ring
  let y = 0; for (const p of r.printed) { const m = partMesh(p.sections, p.cast ? ALU : PLA); m.position.y = y; obj.add(m); y += Math.max(...p.sections.map((s) => s.z1)) / 1000 * (r.id === 'microscope' ? 0 : 1); }
  const stage = r.id === 'microscope' ? new THREE.Group() : undefined;
  if (stage) { stage.position.set(0, 0.06, -0.03); obj.add(stage); stage.add(partMesh(r.printed[1]!.sections, PLA)); }
  const all = r.parts.flatMap(({ id, n }) => Array.from({ length: n }, () => id));
  all.forEach((id, i) => { const m = comp(id), a = (i / all.length) * Math.PI * 2; m.position.set(Math.cos(a) * 0.05, y + 0.002, Math.sin(a) * 0.05); if (r.id === 'microscope' && /pi-cam3|lens|led-ring/.test(id)) m.position.set(0, 0.14 - i * 0.012, -0.03); obj.add(m); });
  return { obj, wheels, ...(stage ? { stage } : {}) };
}
