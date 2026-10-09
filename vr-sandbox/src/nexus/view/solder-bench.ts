// The soldering bench in the room: the lesson of src/nexus/solder-lesson.ts done by your own hands. Every thing on it is
// drawn by the library as it is made (the Pico, its two headers, the BB400 breadboard, PINE64's Pinecil, the Atten
// stand and Hakko's brass cleaner, the solder wire); the right hand takes the iron and holds it as a pen, the left the
// solder; either takes a header or the Pico and lets it go over its place. Each joint's solder is drawn as it is (a
// cone, a ball, dull where it is cold), rosin smoke rises where solder melts, and a card behind the bench says the step,
// the iron and the joint under the tip. On a screen, the same moves are said in words (`act`), which tests use too.
// Its second lesson's bench (plan 'proto'): Adafruit's Perma-Proto, a 330 Ω resistor, a red 5 mm LED and a link of
// hook-up wire put in its holes by hand, the board clipped upside down in the MZ101's hands, each lead soldered and then
// trimmed with Hakko's flush cutters held in the right hand, their jaws closed by its trigger.
// Owner of: the bench's things in the room, how hands take and let them go, and how the lesson is drawn.

import * as THREE from 'three';
import { kitView, type KitView } from './kit3d';
import { compPart, componentOf } from '../components';
import { pinHeader, usbCPlug } from '../boardparts';
import { resolve } from '../inventory';
import type { Part } from '../kits';
import { aaCell, CHP170_OPEN, H3951, HANDS, ironInStand, S11 } from '../kit-solder';
import { grade, idealVolume, type JointShape } from '../solder-joint';
import { ALLOY, cut, HAND, LAYOUT, leadAt, letGo, lit, newBench, payOut, pinAt, PROTO, protoHold, readout, seatsOf, takeUp, throwSwitch, tick, wipe, type Bench, type BenchJoint, type PlanId, type Thing, type V3 } from '../solder-lesson';
import { LED_KINDS, PROTO_BUILD } from '../lessons';
import type { Build, Thing as BuildThing, XZ } from '../edges';

const MM = 0.001, PI = Math.PI;
/** A thing the library draws, by the words it is called by. */
function drawn(words: string): Part {
  const it = resolve(words); if (!it || typeof it === 'string') throw new Error(`the bench needs "${words}": ${it ?? 'not in the library'}`);
  const c = componentOf(it.id); if (!c) throw new Error(`the bench needs "${words}" drawn`); return c.part;
}
/** Where things wait on the bench, mm (the user stands toward +z): the headers to the left, the Pico to the right, the
 *  stand beyond it pointing away (its rear ring, where the handle lies, toward you), the cleaner behind it, the solder's
 *  reel behind the breadboard. */
const PLACES = { stand: [150, 0, 70] as V3, cleaner: [215, 0, -40] as V3, reel: [-95, 0, -60] as V3, cutters: [-230, 5.8, 100] as V3, flux: [-175, 8, 5] as V3 };
/** The second lesson's: the stand further right and nearer you, so the iron lying in it points past the helping hands'
 *  right clip, not at it (their bar's end at x 125); the cleaner beyond it, out of the iron's way. */
const PLACES_PROTO = { ...PLACES, stand: [185, 0, 95] as V3, cleaner: [270, 0, -30] as V3 };
/** Whether a mesh is only drawn for looks (a contact shadow), not a thing's surface. */
const decor = (o: THREE.Object3D): boolean => { for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.decor) return true; return false; };
/** The stand turned a quarter so its front (where the tip lies) points away from you (−z). */
const STAND_YAW = PI / 2;
/** Where a part of a Perma-Proto build waits, to the board's left (bench mm): three to a column, the first column's
 *  in the order the build lists them (for the LED lesson: the resistor, the LED, the link), each lying as it would on a
 *  bench (an LED on its side, a link on its side); and where it sits in the board (its own mm, its top at y 0): an axial
 *  part flat over its holes, along them; a radial one standing with its rim 3 mm up, its first lead (an LED's anode) to
 *  its own hole; a link lying across its holes. */
type Spot = { at: V3; rot: V3 };
function spotsOf(build: Build): Record<string, { wait: Spot; seat: Spot; half: number }> {
  const out: Record<string, { wait: Spot; seat: Spot; half: number }> = {}, FORM = { axial: { x: -35, y: 0, roll: 0 }, radial: { x: -40, y: 2.95, roll: PI / 2 }, link: { x: -30, y: 0.75, roll: PI / 2 }, flying: { x: -75, y: 0, roll: 0 } };
  build.things.filter((t) => !t.hangs).forEach((t, i) => {
    const [a, c] = t.leads.map((l) => l.at) as [XZ, XZ], mx = (a[0] + c[0]) / 2, mz = (a[1] + c[1]) / 2, dx = c[0] - a[0], dz = c[1] - a[1], f = FORM[t.form];
    const yaw = t.form === 'link' ? Math.atan2(dx, dz) : t.form === 'radial' ? Math.atan2(-(a[1] - mz), a[0] - mx) : Math.atan2(-dz, dx);
    out[t.id] = { wait: { at: [f.x - 38 * Math.floor(i / 3), f.y, 22 + 26 * (i % 3)], rot: [0, 0, f.roll] }, seat: { at: [mx, t.form === 'radial' ? 3 : 0, mz], rot: [0, yaw, 0] }, half: Math.hypot(dx, dz) / 2 };
  });
  return out;
}
/** The battery holder: waiting to the parts' left, its leads laid out toward the board; once its pins are in, set on
 *  the helping hands' base under the board (its floor on the base's top, 12 up), its leads up to the rails. Its leads'
 *  roots in its own frame (src/nexus/kit-solder.ts's holder3951): the red from the switch's clip, the black from a
 *  spring. */
const BATTERY = { wait: [-75, 0, 0] as V3, seated: [PROTO.hands[0] - 20, HANDS.base[1], PROTO.hands[2] + 10] as V3, red: [H3951.L / 2 - 1.5, H3951.H - 3, H3951.W / 2 - 5] as V3, black: [H3951.L / 2 - 1.5, H3951.H - 3, -7.6] as V3 };
/** The cutters' jaws' tip and their rivet, in their own frame (m): Hakko's 138 mm over all, the rivet 15 mm behind the
 *  tip (src/nexus/kit-solder.ts); how far each half stands open about it, its spring holding them so till a hand
 *  closes them (rad: the jaws about 5 mm apart at the tip, the grips about 20° apart: an estimate). */
const JAWS = { tip: 0.138, rivet: 0.123, open: CHP170_OPEN };
/** A tube along points given in mm. */
const tubeMm = (pts: [number, number, number][], r: number, sides = 6): THREE.TubeGeometry => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x * MM, y * MM, z * MM)), false, 'centripetal'), 32, r * MM, sides, false);

export class SolderBench {
  readonly group = new THREE.Group();
  bench: Bench;
  private views: KitView[] = [];
  private obj = {} as Partial<Record<Thing, THREE.Object3D>>;
  private home = {} as Partial<Record<Thing, { at: THREE.Vector3; rot: THREE.Euler }>>;
  private held: Record<'right' | 'left', Thing | null> = { right: null, left: null };
  /** each joint's pad face (its +y out of the pad), its solder as a cone or a ball, and the lead standing out of it */
  private fillets: { at: THREE.Group; cone: THREE.Mesh; ball: THREE.Mesh; stub: THREE.Mesh | null; rosin: THREE.Mesh }[] = [];
  /** a seated part's leads as they are bent into its holes, and the straight ones it came with */
  private looks: Record<string, { straight: THREE.Object3D[]; bent: THREE.Object3D[] }> = {};
  /** the Perma-Proto build's things, their holes, and where each waits and sits */
  private build: Build | null = null; private seats: Record<string, XZ[]> = {}; private spots: Record<string, { wait: Spot; seat: Spot; half: number }> = {};
  /** the battery holder's parts that change: its leads as laid out, its knife switch's blade and knob (and where they
   *  stand open), its leads as run up to the board, the LED's lens to light */
  /** each LED's light once lit: its lens, a halo round it and the little light it throws on the board, in its colour */
  private lamps: { id: string; lens: THREE.MeshStandardMaterial[]; sprite: THREE.Sprite; light: THREE.PointLight; hex: number }[] = [];
  private power: { laid: THREE.Object3D[]; blade: THREE.Object3D[]; home: Map<THREE.Object3D, THREE.Quaternion>; hinge: THREE.Vector3; run: THREE.Object3D[] } | null = null;
  /** cut-off leads falling to the bench and lying there */
  private pieces: { m: THREE.Mesh; v: number; down: boolean; len: number }[] = [];
  /** the cutters' two halves, swung about their rivet, and how long they stay shut after a cut */
  private jaws: { halves: [THREE.Object3D, THREE.Object3D]; leaves: THREE.Object3D[]; home: Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion }>; shut: number } | null = null;
  private wire: THREE.Mesh; private wireDir = new THREE.Vector3(0.3, -0.45, -0.84).normalize();
  private tipMeshes: THREE.Mesh[] = [];
  private card: THREE.Mesh; private cardCtx: CanvasRenderingContext2D | null; private cardTex: THREE.CanvasTexture; private cardText = ''; private cardAt = 0;
  private puffs: { s: THREE.Sprite; t: number }[] = [];
  private legs: THREE.Mesh[] = [];
  private cable: THREE.Mesh; private cableFrom = new THREE.Vector3(1e9, 0, 0); private tail: THREE.Mesh;
  /** for words and tests: where the tip and the wire's end are, bench mm, when no hand holds them */
  private script: { tip: V3 | null; wire: V3 | null; cutters: boolean } = { tip: null, wire: null, cutters: false };

  private places: typeof PLACES;
  /** where the iron lies in its stand, found once by letting it down onto the rings (restIron) */
  private ironRest: { at: THREE.Vector3; q: THREE.Quaternion } | null = null;

  constructor(readonly plan: PlanId = 'pico', build: Build = PROTO_BUILD) {
    this.bench = newBench(plan, build); this.places = plan === 'proto' ? PLACES_PROTO : PLACES;
    if (plan === 'proto') { this.build = build; this.seats = seatsOf(build); this.spots = spotsOf(build); }
    // (the bench: a plywood top 25 mm thick on four legs, as a workbench is (its height set where it is placed); the
    // lesson's things on it)
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 0.75 }), top = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.025, 0.38), wood);
    top.position.set(0.03, -0.0125, -0.05); top.receiveShadow = true; top.castShadow = true; this.group.add(top);
    for (const [x, z] of [[-0.27, -0.21], [0.33, -0.21], [-0.27, 0.11], [0.33, 0.11]] as const) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), wood); leg.position.set(x, -0.525, z); leg.name = 'bench leg'; this.legs.push(leg); this.group.add(leg); }
    const add = (part: Part, at: V3, rot: [number, number, number] = [0, 0, 0]): THREE.Object3D => { const v = kitView(part, { maxLights: 0 }); this.views.push(v); v.group.position.set(at[0] * MM, at[1] * MM, at[2] * MM); v.group.rotation.set(...rot); this.group.add(v.group); return v.group; };
    if (plan === 'pico') {
      add(drawn('breadboard 400pts'), [0, 0, 0]);
      // (the headers lying on their sides till they are put in; the Pico flat on the bench)
      const header = compPart(pinHeader(1, 20, 'gold').comp, '20-pin header');
      this.obj['header-a'] = add(header, [-90, 1.27, 20], [PI / 2, 0, 0]); this.obj['header-b'] = add(header, [-90, 1.27, 32], [PI / 2, 0, 0]);
      this.obj.pico = add(drawn('pico pico1'), [85, 1.0, 35]);
    } else {
      // (the Perma-Proto face up before you, the helping hands behind it, its parts to its left, each drawn by the
      // library as its build names it)
      this.obj.proto = add(drawn('permaproto half'), [PROTO.at[0], PROTO.at[1] + 1.6, PROTO.at[2]]);
      add(drawn('helpinghands mz101'), PROTO.hands);
      for (const t of build.things) {
        if (t.hangs) { this.obj[t.id] = this.holder(add, t); this.obj[t.id]!.position.set(...BATTERY.wait.map((v) => v * MM) as V3); this.group.add(this.obj[t.id]!); continue; }
        const w = this.spots[t.id]!.wait;
        if (t.form === 'link') { const o = this.link(t); o.position.set(...w.at.map((v) => v * MM) as V3); o.rotation.set(...w.rot); this.group.add(o); this.obj[t.id] = o; continue; }
        this.obj[t.id] = add(drawn(t.draw ?? (t.form === 'axial' ? 'resistor 330' : 'led red 5mm')), w.at, w.rot);
        this.bendLeads(t);
      }
      // (each LED's lens to light, and its halo: a soft disc of its colour facing you about its dome, drawn over what is
      // behind it; and its light on the board)
      for (const l of build.power?.lamps ?? []) {
        const o = this.obj[l.id]; if (!o) continue; const lens: THREE.MeshStandardMaterial[] = [], colour = /led (\w+)/.exec(build.things.find((t) => t.id === l.id)?.draw ?? '')?.[1] ?? 'red', hex = LED_KINDS[colour]?.hex ?? 0xd8262e;
        o.traverse((m) => { const x = m as THREE.Mesh; if (x.isMesh && (x.userData.part as Part | undefined)?.mat === 'epoxy-clear') { x.material = (x.material as THREE.MeshStandardMaterial).clone(); lens.push(x.material as THREE.MeshStandardMaterial); } });
        const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!, gr = x.createRadialGradient(32, 32, 2, 32, 32, 32), k = new THREE.Color(hex), rgb = (a: number, f: number) => `rgba(${Math.round(255 * Math.min(1, k.r * f + 0.25))},${Math.round(255 * Math.min(1, k.g * f + 0.12))},${Math.round(255 * Math.min(1, k.b * f + 0.08))},${a})`;
        gr.addColorStop(0, rgb(1, 1.2)); gr.addColorStop(0.35, rgb(0.55, 1)); gr.addColorStop(1, rgb(0, 1)); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sprite.scale.setScalar(16 * MM); sprite.position.set(0, 6 * MM, 0); sprite.visible = false; o.add(sprite);
        const light = new THREE.PointLight(hex, 0, 0.12, 2); light.position.set(0, 6 * MM, 0); o.add(light); this.lamps.push({ id: l.id, lens, sprite, light, hex });
      }
    }
    add(drawn('ironstand s-11'), this.places.stand, [0, STAND_YAW, 0]); add(drawn('tipcleaner 599b'), this.places.cleaner);
    this.obj.iron = add(drawn('solderiron pinecil-v2'), [0, 0, 0]); this.placeIronInStand();
    // (the solder: its reel behind the breadboard, the wire out of the fingers when it is in a hand)
    this.obj.solder = add(drawn('solderreel ts-635050'), this.places.reel);
    // (its free end off the top of the winding (14.9 mm round its middle 19 up: the reel's own figures), down onto the
    // bench, while no hand holds it; and the cutters the joint lesson trims with, lying beside the headers)
    // (centripetal, so the curve does not swing below its points and the wire dip under the bench where it lands)
    const [rx, , rz] = this.places.reel, tail = [[rx, 33.9, rz], [rx + 10, 33.4, rz + 1], [rx + 19, 22, rz + 4], [rx + 23, 7, rz + 6], [rx + 27, 0.6, rz + 8], [rx + 31, 0.27, rz + 10], [rx + 38, 0.27, rz + 12]].map(([x, y, z]) => new THREE.Vector3(x! * MM, y! * MM, z! * MM));
    this.tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail, false, 'centripetal'), 48, HAND.wire / 2 * MM, 6, false), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 })); this.group.add(this.tail);
    // (the cutters on the bench to the headers' left, their jaws' tips toward them and clear of the breadboard (its end
    // at x -42): 138 mm long, turned 0.35 rad, their tips at about x -100, z 53)
    const cutters = drawn('flushcutter chp-170'); this.obj.cutters = add(cutters, this.places.cutters, [0, 0.35, 0]);
    // (the flux pen the pack buys lying capped beside them, on its side: seldom needed for through-hole work (Adafruit))
    add(drawn('fluxpen cq4lf'), this.places.flux, [0, 0.25, PI / 2]);
    { const hs: THREE.Object3D[] = [], ls: THREE.Object3D[] = [], spring = cutters.parts?.find((p) => /spring/.test(p.name));
      this.obj.cutters.traverse((o) => { if (o.userData.part === cutters.parts?.[0] || o.userData.part === cutters.parts?.[1]) hs.push(o); if (spring && spring.parts?.includes(o.userData.part)) ls.push(o); });
      if (hs.length === 2) { const home = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion }>(); for (const o of [...hs, ...ls]) home.set(o, { p: o.position.clone(), q: o.quaternion.clone() }); this.jaws = { halves: [hs[0]!, hs[1]!], leaves: ls, home, shut: 0 }; this.swing(JAWS.open); } }
    this.wire = new THREE.Mesh(new THREE.CylinderGeometry(HAND.wire / 2 * MM, HAND.wire / 2 * MM, 1, 8).translate(0, -0.5, 0).rotateX(PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }));
    this.wire.visible = false; this.group.add(this.wire);
    for (const k of Object.keys(this.obj) as Thing[]) this.home[k] = { at: this.obj[k]!.position.clone(), rot: this.obj[k]!.rotation.clone() };
    // (its power: a USB-C cable's plug in the iron's socket at its back (6 mm in, its overmould against the handle), its
    // cord, 4 mm across (typical of a 3 A cable), over the bench and off its right edge to the charger the pack buys)
    const plug = kitView(compPart(usbCPlug().comp, 'USB-C cable'), { maxLights: 0 }); this.views.push(plug);
    plug.group.position.set(6.0 * MM, -3.6 * MM, 0); plug.group.rotation.set(0, PI, 0); this.obj.iron!.add(plug.group);
    this.cable = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6 })); this.cable.castShadow = true; this.group.add(this.cable);
    this.obj.iron!.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /point|iron plating/i.test(m.name)) { m.material = (m.material as THREE.MeshStandardMaterial).clone(); this.tipMeshes.push(m); } });
    // (each joint's solder: a concave cone round its pin, or a ball where there is far too much; on the Perma-Proto each
    // in the board's own frame, on its underside, with the lead standing out of it)
    this.joints();
    // (the card behind the bench)
    const c = typeof document === 'undefined' ? null : document.createElement('canvas'); if (c) { c.width = 1024; c.height = 600; }
    this.cardCtx = c?.getContext('2d') ?? null; this.cardTex = new THREE.CanvasTexture(c ?? undefined as unknown as HTMLCanvasElement); this.cardTex.colorSpace = THREE.SRGBColorSpace;
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ map: this.cardTex, transparent: true })); this.card.position.set(0, plan === 'proto' ? 0.27 : 0.16, -0.2); this.card.rotation.x = plan === 'proto' ? -0.4 : -0.25; this.group.add(this.card);
  }

  /** The bench stood in the room: its top at `at` (its middle), turned so you stand at its +z side, its legs down to
   *  the floor. */
  place(at: THREE.Vector3, yaw: number, floorY = 0): void {
    this.group.position.copy(at); this.group.rotation.set(0, yaw, 0); const h = Math.max(0.1, at.y - 0.025 - floorY);
    for (const l of this.legs) { l.scale.y = h; l.position.y = -0.025 - h / 2; }
  }
  /** What a hand holds of the bench's things. */
  holding(hand: 'right' | 'left'): Thing | null { return this.held[hand]; }
  // ---- the iron ------------------------------------------------------------------------------------------------------
  /** The Pinecil lying in the S-11's two rings, its handle in the rear one and its nose in the front, its tip out over
   *  the sponge (the stand's own frame, turned and placed as the stand is). */
  private placeIronInStand(): void {
    const o = this.obj.iron!; if (o.parent !== this.group) this.group.attach(o);
    if (!this.ironRest) this.ironRest = this.restIron();
    o.position.copy(this.ironRest.at); o.quaternion.copy(this.ironRest.q);
  }
  /** The iron as it lies in the S-11 by its own weight: laid first along the line ironInStand gives, then pitched and
   *  let down until its underside, its own shape where it passes each ring, meets the bottom of that ring's inside. */
  private restIron(): { at: THREE.Vector3; q: THREE.Quaternion } {
    const o = this.obj.iron!, r = ironInStand(), turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), STAND_YAW), base = new THREE.Vector3(...this.places.stand).multiplyScalar(MM);
    o.position.copy(new THREE.Vector3(...r.at).multiplyScalar(MM).applyQuaternion(turn).add(base)); o.quaternion.copy(turn).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(r.dir[1], r.dir[0])));
    const rings = [S11.rear, S11.front].map((g) => ({ x: g.x, bottom: S11.feet + g.top - S11.t - g.id, r: g.id / 2 })), inv = turn.clone().invert(), v = new THREE.Vector3(), axis = new THREE.Vector3(0, 0, 1).applyQuaternion(turn);
    for (let k = 0; k < 4; k++) {
      this.group.updateMatrixWorld(true); const low = [Infinity, Infinity];
      o.traverse((m) => { const mesh = m as THREE.Mesh, pos = mesh.isMesh && !decor(mesh) ? mesh.geometry.attributes.position : undefined; if (!pos) return;
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); this.group.worldToLocal(v); v.sub(base).applyQuaternion(inv).divideScalar(MM);
          rings.forEach((g, j) => { if (Math.abs(v.x - g.x) < 5 && Math.abs(v.z) < g.r) low[j] = Math.min(low[j]!, v.y); }); } });
      if (!Number.isFinite(low[0]) || !Number.isFinite(low[1])) break;
      // (pitched about the stand's across-axis through the rear contact, then let down onto the rear ring)
      const d0 = rings[0]!.bottom - low[0]!, d1 = rings[1]!.bottom - low[1]!, q = new THREE.Quaternion().setFromAxisAngle(axis, Math.atan2(d1 - d0, rings[1]!.x - rings[0]!.x));
      const pivot = new THREE.Vector3(rings[0]!.x, low[0]!, 0).multiplyScalar(MM).applyQuaternion(turn).add(base);
      o.position.sub(pivot).applyQuaternion(q).add(pivot); o.quaternion.premultiply(q); o.position.y += d0 * MM;
    }
    return { at: o.position.clone(), q: o.quaternion.clone() };
  }
  /** The tip's point, where it is now, in the bench's mm. */
  private tipNow(): V3 { const w = this.obj.iron!.localToWorld(new THREE.Vector3(0.155, 0, 0)); const l = this.group.worldToLocal(w); return [l.x / MM, l.y / MM, l.z / MM]; }
  /** The wire's end, in the bench's mm. */
  private wireNow(): V3 { this.wire.updateMatrixWorld(); const w = this.wire.localToWorld(new THREE.Vector3(0, 0, -1)); const l = this.group.worldToLocal(w); return [l.x / MM, l.y / MM, l.z / MM]; }

  // ---- hands ---------------------------------------------------------------------------------------------------------
  /** A grip closed at `grip` (its controller's grip space; `ray` its pointing space): the nearest thing within 9 cm
   *  taken into that hand, held as it is held (the iron as a pen, its tip 7 cm ahead of the fist and 30° below where the
   *  hand points; the solder's wire out of the fingers, forward and down toward the work; a header or the Pico as it
   *  was). What it did, said; null where nothing is near. */
  grab(hand: 'right' | 'left', grip: THREE.Object3D, ray: THREE.Object3D = grip): string | null {
    const at = grip.getWorldPosition(new THREE.Vector3()), parts: Thing[] = this.plan === 'pico' ? ['header-a', 'header-b', 'pico'] : ['proto', ...(this.build?.things.map((t) => t.id) ?? [])];
    const can: Thing[] = hand === 'right' ? ['iron', ...(this.plan === 'proto' ? ['cutters' as const] : []), ...parts] : ['solder', ...parts];
    let best: Thing | null = null, bd = 0.09;
    for (const k of can) { if (this.held.left === k || this.held.right === k || !this.obj[k]) continue; const d = this.grabPoint(k).distanceTo(at); if (d < bd) { bd = d; best = k; } }
    if (!best) return null;
    // (the holder, its leads soldered in, is not taken up: a grip on it throws its knife switch)
    if (this.thing(best)?.hangs && this.bench.placed[best] && this.bench.joints.some((q) => q.part === best && q.j.solder > 0)) { const s = throwSwitch(this.bench, !this.bench.on); this.swingSwitch(); return s; }
    const said = takeUp(this.bench, best); if (/first|soldered to|soldered in: it stays/.test(said)) return said;
    this.held[hand] = best; const o = this.obj[best]!;
    // (held as a hand holds it, set in the frame of where the hand points (a controller's grip frame lies along its
    // handle, pitched from that) and turned into the grip's)
    const rel = grip.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(ray.getWorldQuaternion(new THREE.Quaternion()));
    if (best === 'iron' || best === 'cutters') {
      // (the cutters flatter than the iron, 15° down, their jaws' plane level so a lead standing up passes between them,
      // the fist round their grips 50 mm from their back)
      const pitch = best === 'iron' ? 0.52 : 0.26;
      grip.add(o); const d = new THREE.Vector3(0, -Math.sin(pitch), -Math.cos(pitch)), up = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize();
      const pen = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, up, d.clone().cross(up)));
      o.quaternion.copy(rel).multiply(pen); o.position.copy(d.applyQuaternion(rel)).multiplyScalar(best === 'iron' ? -0.085 : -0.05);
    } else if (best === 'solder') {
      grip.add(this.wire); const d = this.wireDir.clone().applyQuaternion(rel);
      this.wire.position.copy(new THREE.Vector3(0, -0.005, -0.03).applyQuaternion(rel)); this.wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d); this.wire.visible = true;
    }
    else { grip.attach(o); if (this.seated(best)) this.look(best, false); }
    return said;
  }
  /** Where a thing is taken hold of, in the room: the iron by its grip (70 mm from its back), the reel by its middle,
   *  the rest where they are. */
  private grabPoint(k: Thing): THREE.Vector3 { const o = this.obj[k]!; o.updateMatrixWorld(); return k === 'iron' ? o.localToWorld(new THREE.Vector3(0.07, 0, 0)) : k === 'solder' ? o.localToWorld(new THREE.Vector3(0, 0.019, 0)) : k === 'cutters' ? o.localToWorld(new THREE.Vector3(0.06, 0, 0)) : o.getWorldPosition(new THREE.Vector3()); }
  /** For tests: where the tip's point, the wire's end, the cutters' jaws' tip, or a thing's hold is in the room (m). */
  point(what: 'tip' | 'wire' | 'jaws' | Thing): [number, number, number] { const w = what === 'tip' ? this.group.localToWorld(new THREE.Vector3(...this.tipNow()).multiplyScalar(MM)) : what === 'wire' ? this.group.localToWorld(new THREE.Vector3(...this.wireNow()).multiplyScalar(MM)) : what === 'jaws' ? this.group.localToWorld(new THREE.Vector3(...this.jawsNow().tip).multiplyScalar(MM)) : this.grabPoint(what); return [w.x, w.y, w.z]; }
  /** That hand's grip opened: what it held let go where it is (put in its place if it is over it, else back where it
   *  waits; the iron always back in its stand). */
  release(hand: 'right' | 'left'): string | null {
    const k = this.held[hand]; if (!k) return null; this.held[hand] = null;
    if (k === 'solder') { this.group.attach(this.wire); this.wire.visible = false; return letGo(this.bench, 'solder', null); }
    if (k === 'iron') { this.placeIronInStand(); return letGo(this.bench, 'iron', null); }
    if (k === 'cutters') { this.settle('cutters'); return letGo(this.bench, 'cutters', null); }
    const o = this.obj[k]!; this.group.attach(o); const p = o.position, up = new THREE.Vector3(0, 1, 0).applyQuaternion(o.quaternion).y;
    // (how it was held: the LED upright and which way round, the board turned over (its own up pointing down))
    const how = this.thing(k)?.form === 'radial' ? { reversed: this.reversed(k), upright: up > 0.7 } : k === 'proto' && !this.bench.placed.proto ? { over: up < -0.5 } : {};
    const said = letGo(this.bench, k, [p.x / MM, p.y / MM, p.z / MM], how);
    this.settle(k); return said;
  }
  /** A thing put where the lesson has it (a header in its row, the Pico on them; a part in its holes, the Perma-Proto
   *  in the hands upside down), else where it waits. */
  private settle(k: Thing): void {
    const o = this.obj[k], b = this.bench; if (!o || k === 'iron' || k === 'solder') return;
    const home = () => { if (o.parent !== this.group) this.group.add(o); o.position.copy(this.home[k]!.at); o.rotation.copy(this.home[k]!.rot); };
    if (k === 'pico' && b.placed.pico) { o.position.set(0, LAYOUT.picoTop * MM, 0); o.rotation.set(0, 0, 0); return; }
    if ((k === 'header-a' || k === 'header-b') && b.placed[k]) { o.position.set(0, (LAYOUT.board.top + LAYOUT.strip) * MM, b.seat[k as 'header-a' | 'header-b']! * MM); o.rotation.set(PI, 0, 0); return; }
    // (the board in the hands: turned over about its length, its middle on the hold, so its underside is 0.8 above it)
    if (k === 'proto' && b.placed.proto) { if (o.parent !== this.group) this.group.add(o); const h = protoHold(); o.position.set(h[0] * MM, (h[1] - 0.8) * MM, h[2] * MM); o.rotation.set(PI, 0, 0); return; }
    if (this.seated(k) && b.placed[k]) { const st = this.spots[k]!.seat; this.obj.proto!.add(o); o.position.set(...st.at.map((v) => v * MM) as V3); o.rotation.set(...st.rot); this.look(k, true); return; }
    if (this.seated(k)) this.look(k, false);
    if (k === 'cutters') this.swing(JAWS.open);
    if (this.thing(k)?.hangs) { this.runLeads(k, b.placed[k] === true); if (b.placed[k]) { if (o.parent !== this.group) this.group.add(o); o.position.set(...BATTERY.seated.map((v) => v * MM) as V3); o.rotation.set(0, 0, 0); return; } }
    home();
  }
  /** A thing of the build by its id. */
  private thing(id: string): BuildThing | undefined { return this.build?.things.find((t) => t.id === id); }
  /** Whether a thing goes into the board's holes as the board lies on the bench (not on its own leads). */
  private seated(id: string): boolean { const t = this.thing(id); return !!t && !t.hangs; }
  /** Is a radial part (an LED) held the wrong way round over its holes: its long lead (its anode) nearer its other
   *  lead's hole than its own? (its legs' ends taken where they are, the board lying face up) */
  private reversed(id: string): boolean {
    const o = this.obj[id]!; o.updateMatrixWorld();
    const leg = (x: number) => this.group.worldToLocal(o.localToWorld(new THREE.Vector3(x * MM, -12 * MM, 0))).divideScalar(MM), an = leg(1.27), ca = leg(-1.27);
    const hole = (i: number) => { const [x, z] = this.seats[id]![i]!; return new THREE.Vector2(PROTO.at[0] + x, PROTO.at[2] + z); }, A = hole(0), C = hole(1), flat = (v: THREE.Vector3) => new THREE.Vector2(v.x, v.z);
    return flat(an).distanceTo(C) + flat(ca).distanceTo(A) < flat(an).distanceTo(A) + flat(ca).distanceTo(C);
  }
  /** The left trigger: more wire pulled off the reel. */
  feedMore(): void { payOut(this.bench, 10); }
  /** The trigger of the hand holding the cutters: their jaws closed where they are, a lead between them cut. */
  snip(): string {
    const j = this.jawsNow(); if (this.jaws) this.jaws.shut = 0.25;
    return this.cutAndDrop(() => cut(this.bench, j.tip, j.along));
  }
  /** The cutters' jaws' tip and the way their edge runs back from it, the bench's mm. */
  private jawsNow(): { tip: V3; along: V3 } {
    const o = this.obj.cutters!; o.updateMatrixWorld(); const at = (x: number) => this.group.worldToLocal(o.localToWorld(new THREE.Vector3(x, 0, 0))).divideScalar(MM);
    const t = at(JAWS.tip), e = at(JAWS.tip - 0.008).sub(t).normalize(); return { tip: [t.x, t.y, t.z], along: [e.x, e.y, e.z] };
  }
  /** A cut made: each lead it shortened, its cut-off end dropped from where it was. */
  private cutAndDrop(make: () => string): string {
    const was = this.bench.joints.map((q) => q.lead), said = make();
    this.bench.joints.forEach((q, i) => { const len = was[i]! - q.lead; if (len > 0.05) this.drop(i, q, len); });
    return said;
  }
  private drop(i: number, q: BenchJoint, len: number): void {
    const f = this.fillets[i]!, r = q.shape.pin / 2, d = new THREE.Vector3(...q.dir); f.at.updateMatrixWorld();
    const mid = this.group.worldToLocal(f.at.localToWorld(d.clone().multiplyScalar((q.lead + len / 2) * MM)));
    const dir = this.group.worldToLocal(f.at.localToWorld(d.clone())).sub(this.group.worldToLocal(f.at.localToWorld(new THREE.Vector3()))).normalize();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * MM, r * MM, len * MM, q.shape.round ? 8 : 4), f.stub?.material ?? new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }));
    m.position.copy(mid); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); m.castShadow = true; this.group.add(m); this.pieces.push({ m, v: 0, down: false, len });
  }
  /** The cutters' halves swung open by a (rad) each about their rivet (as drawn they stand open by JAWS.open). */
  private swing(a: number): void {
    if (!this.jaws) return; const j = this.jaws, piv = new THREE.Vector3(JAWS.rivet, 0, 0), Y = new THREE.Vector3(0, 1, 0);
    // (each half, and its own leaf of the spring (the first leaf the first half's), turned about the rivet)
    const turn = (o: THREE.Object3D, th: number) => { const h = j.home.get(o)!, q = new THREE.Quaternion().setFromAxisAngle(Y, th); o.position.copy(h.p).sub(piv).applyQuaternion(q).add(piv); o.quaternion.copy(q).multiply(h.q); };
    const d = a - JAWS.open; j.halves.forEach((h, i) => turn(h, i === 0 ? -d : d)); j.leaves.forEach((l, i) => turn(l, i === 0 ? -d : d));
  }

  // ---- words, for a screen and for tests -----------------------------------------------------------------------------
  /** A move said in words: "place the headers", "place the pico" (or, on the Perma-Proto's bench, "place the
   *  resistor", "place the led" (or "…backwards"), "place the link", "board in the hands", "take the cutters", "cut lead
   *  N at H", "cutters down"), "take the iron", "take the solder", "tin the tip", "wipe", "heat pin N", "feed pin N",
   *  "lift", "more solder", "iron down". Moves the things as the hands would. */
  act(words: string): string {
    const t = words.trim().toLowerCase(), b = this.bench, n = Number(/\b(?:pin|joint|lead) (\d+)/.exec(t)?.[1] ?? NaN), q = n >= 1 && n <= b.joints.length ? b.joints[n - 1]! : null;
    if (this.plan === 'pico') {
      if (/place (the )?headers?/.test(t)) { for (const [h, z] of [['header-a', 8.89], ['header-b', -8.89]] as const) { if (!b.placed[h]) { letGo(b, h, [0, LAYOUT.board.top + LAYOUT.strip, z]); this.settle(h); } } return 'both headers in rows c and h, their long pins down'; }
      if (/place (the )?pico/.test(t)) { const s = letGo(b, 'pico', [0, LAYOUT.picoTop, 0]); this.settle('pico'); return s; }
    } else {
      const things = this.build?.things ?? [], hangs = things.find((x) => x.hangs);
      if (/^place (all|every|the parts|everything)/.test(t)) { const said = things.filter((x) => !x.hangs).sort((x, y) => (x.height ?? 0) - (y.height ?? 0)).map((x) => this.putIn(x.id, false)); return said.join('; '); }
      if (hangs && /(place|put) (the )?(battery|holder)|battery (in|leads in)|holder in/.test(t)) { const s = letGo(b, hangs.id, protoHold()); this.settle(hangs.id); return s; }
      const part = /^(place|put)\b/.test(t) ? this.named(t) : null;
      if (part) return this.putIn(part, /backwards?|reversed|wrong way|other way/.test(t));
      if (/close (the )?(knife )?switch|switch (it )?on|turn (it )?on/.test(t)) { const s = throwSwitch(b, true); this.swingSwitch(); return s; }
      if (/open (the )?(knife )?switch|switch (it )?off|turn (it )?off/.test(t)) { const s = throwSwitch(b, false); this.swingSwitch(); return s; }
      if (/(board|perma-?proto) (in|into) (the )?hands|clip (the )?board|mount (the )?board|put (the )?board in/.test(t)) { const s = letGo(b, 'proto', protoHold()); this.settle('proto'); return s; }
      if (/take (the )?board out|board out|unclip/.test(t)) { const s = takeUp(b, 'proto'); this.settle('proto'); return s; }
      if (/take (the )?(flush )?cutters/.test(t)) { this.script.cutters = true; this.poseCuttersAt(leadAt(b.joints[0]!, 12), b.joints[0]!); return takeUp(b, 'cutters'); }
      if (/(cutters|cutter) (down|back)|put (the )?cutters (down|back)/.test(t)) { this.script.cutters = false; this.settle('cutters'); return letGo(b, 'cutters', null); }
      if (/^(cut|trim|snip)\b/.test(t)) {
        if (!this.script.cutters && this.held.right !== 'cutters') return 'take the cutters first';
        if (!q) return `say which lead: cut lead 1 to ${b.joints.length}, and how high: at 1.5`;
        const h = Number(/\bat ([\d.]+)/.exec(t)?.[1] ?? 1.5), p = leadAt(q, h); this.poseCuttersAt(p, q); if (this.jaws) this.jaws.shut = 0.25;
        return this.cutAndDrop(() => cut(b, p));
      }
    }
    if (/take (the )?iron/.test(t)) return takeUp(b, 'iron');
    if (/take (the )?solder/.test(t)) { this.wire.visible = false; return takeUp(b, 'solder'); }
    if (/^tin/.test(t)) { this.script.tip = [60, 40, 40]; this.script.wire = [60, 40.5, 40]; return 'the wire on the tip'; }
    if (/^wipe/.test(t)) { wipe(b); return 'the tip wiped on the brass'; }
    if (/^heat/.test(t) && q) { this.script.tip = q.at; this.script.wire = null; return `the tip on ${this.plan === 'pico' ? `pin ${n}'s pad and pin` : `${q.name}: its pad and lead`}`; }
    if (/^feed/.test(t) && q) { this.script.tip = q.at; this.script.wire = q.at; return `solder fed to ${this.plan === 'pico' ? `pin ${n}` : q.name}`; }
    if (/^(lift|away)/.test(t)) { const was = this.script.tip; this.script.tip = null; this.script.wire = null; if (was && b.iron.inHand) this.poseIronAt([was[0], was[1] + 40, was[2] + 20]); return 'the iron lifted away'; }
    if (/more solder|pull more/.test(t)) { payOut(b, 10); return `${Math.round(b.wire.out)} mm of wire out`; }
    if (/iron (down|back)|in (its|the) stand/.test(t)) { this.script.tip = null; this.script.wire = null; this.placeIronInStand(); return letGo(b, 'iron', null); }
    return this.plan === 'pico' ? 'Say: place the headers, place the pico, take the iron, take the solder, tin the tip, wipe, heat pin N, feed pin N, lift, more solder, iron down.'
      : `Say: ${(this.build?.things ?? []).filter((x) => !x.hangs).map((x) => `place ${x.name.toLowerCase()}`).join(', ')} (or place all), board in the hands, take the iron, take the solder, tin the tip, wipe, heat joint N, feed joint N, lift, take the cutters, cut lead N at 1.5, cutters down, place the battery, close the switch, iron down.`;
  }
  /** The thing of the build words name: the one whose own name they say (the longest that fits: "the red LED's
   *  resistor" before "the red LED"), else the first not yet in of the kind they say (a resistor, an LED, a link). */
  private named(t: string): string | null {
    const things = (this.build?.things ?? []).filter((x) => !x.hangs), say = (x: BuildThing) => x.name.toLowerCase().replace(/^the /, '');
    const by = things.filter((x) => t.includes(say(x))).sort((x, y) => say(y).length - say(x).length)[0]; if (by) return by.id;
    const form = /resistor/.test(t) ? 'axial' : /\bled\b/.test(t) ? 'radial' : /link|wire|jumper/.test(t) ? 'link' : null;
    return (things.find((x) => x.form === form && !this.bench.placed[x.id]) ?? things.find((x) => x.form === form))?.id ?? null;
  }
  /** A part put over its holes as a hand would, and let go there. */
  private putIn(id: string, reversed: boolean): string {
    const q = this.seats[id]!, s = letGo(this.bench, id, [PROTO.at[0] + (q[0]![0] + q[1]![0]) / 2, 5, PROTO.at[2] + (q[0]![1] + q[1]![1]) / 2], { reversed: this.thing(id)?.form === 'radial' && reversed });
    this.settle(id); return s;
  }
  /** On a screen: the cutters held to a lead as a hand would, level, their edge across it 3 mm back from their tip. */
  private poseCuttersAt(p: V3, q: BenchJoint): void {
    const o = this.obj.cutters!; if (o.parent !== this.group) this.group.attach(o);
    let x = new THREE.Vector3(q.dir[2], 0, -q.dir[0]); if (x.lengthSq() < 1e-6) x.set(0, 0, -1); x.normalize(); if (x.z > 0) x.negate();
    const up = new THREE.Vector3(0, 1, 0), z = x.clone().cross(up);
    o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, up, z)); o.position.set(p[0] * MM, p[1] * MM, p[2] * MM).addScaledVector(x, 0.003 - JAWS.tip);
    this.swing(JAWS.open);
  }

  // ---- each frame ----------------------------------------------------------------------------------------------------
  update(dt: number): void {
    const b = this.bench, ironHand = this.held.right === 'iron' || this.held.left === 'iron', wireHand = this.held.left === 'solder' || this.held.right === 'solder';
    let tip: V3 | null = ironHand ? this.tipNow() : this.script.tip, wire: V3 | null = wireHand ? this.wireNow() : this.script.wire;
    if (!ironHand && this.script.tip && b.iron.inHand) this.poseIronAt(this.script.tip);
    if (!b.iron.inHand) tip = null; if (!b.wire.inHand) wire = null;
    // (the tip drawn through the brass wipes it)
    if (tip && Math.hypot(tip[0] - this.places.cleaner[0], tip[1] - 35, tip[2] - this.places.cleaner[2]) < 26) wipe(b);
    const used = b.wire.used; tick(b, dt, tip, wire);
    if (b.wire.used > used && (tip || wire)) this.puff(wire ?? tip!);
    if (wireHand) this.wire.scale.set(1, 1, Math.max(0.001, b.wire.out * MM));
    // (said, not done by hand: the wire drawn from where a left hand would hold it to where its end is)
    else if (this.script.wire && b.wire.inHand) { const e = new THREE.Vector3(...this.script.wire).multiplyScalar(MM), d = new THREE.Vector3(0.6, -0.5, -0.62).normalize(); if (this.wire.parent !== this.group) this.group.add(this.wire);
      this.wire.visible = true; this.wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d); this.wire.scale.set(1, 1, Math.max(0.001, b.wire.out * MM)); this.wire.position.copy(e).addScaledVector(d, -b.wire.out * MM); }
    else if (!wireHand) this.wire.visible = false;
    this.tail.visible = !this.wire.visible;
    // (each joint as its solder is, and the lead standing out of it as long as it is now)
    b.joints.forEach((q, i) => { const f = this.fillets[i]!, fill = q.j.solder / idealVolume(q.shape), g = grade(q.j, q.shape).grade, m = f.cone.material as THREE.MeshStandardMaterial;
      const any = q.j.solder + q.j.cold + q.j.dropped > 0.01; f.cone.visible = any && fill <= 1.6 && q.j.dropped < 0.2; f.ball.visible = any && !f.cone.visible;
      if (f.cone.visible) f.cone.scale.set(1, Math.min(1, Math.max(0.15, (fill - 0.35) / 0.65)), 1);
      if (f.ball.visible) { const r = Math.cbrt((3 * (q.j.solder + q.j.cold + q.j.dropped)) / (4 * PI)) * MM; f.ball.scale.setScalar(r); f.ball.position.y = r * 0.7; }
      f.rosin.visible = q.j.solder > 0.01;
      if (f.stub) { f.stub.visible = !!q.part && b.placed[q.part] === true && q.lead > 0.05; f.stub.scale.set(1, Math.max(1e-4, q.lead * MM), 1); }
      const molten = q.j.T >= ALLOY.liquidus, cold = g === 'cold', burnt = g === 'overheated';
      // (63/37 set bright but satin, not a mirror, and warmer than chrome: tin's own grey with the flux's film on it;
      // molten, a mirror; cold, grey and grainy)
      m.color.setHex(burnt ? 0x8a8072 : cold ? 0x9a9da1 : molten ? 0xe8ecf0 : 0xc6c3bb); m.roughness = cold ? 0.75 : burnt ? 0.6 : molten ? 0.08 : 0.42; });
    // (a cut-off lead falls (9.81 m/s²) and lies where it lands: on the hands' base, or the bench)
    for (const p of this.pieces) { if (p.down) continue; p.v += 9.81 * dt; p.m.position.y -= p.v * dt; const x = p.m.position.x / MM - PROTO.hands[0], z = p.m.position.z / MM - PROTO.hands[2];
      const floor = (Math.abs(x) < HANDS.base[0] / 2 && Math.abs(z) < HANDS.base[2] / 2 ? HANDS.base[1] : 0) * MM, r = (p.m.geometry as THREE.CylinderGeometry).parameters.radiusTop;
      if (p.m.position.y - r <= floor + (p.len / 2) * MM * Math.abs(new THREE.Vector3(0, 1, 0).applyQuaternion(p.m.quaternion).y)) { p.down = true; p.m.position.y = floor + r; p.m.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (x * 7.3) % PI).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), PI / 2)); } }
    // (the LED glows by the current the circuit gives it: 250 mcd at 20 mA (Adafruit's 299), its light in proportion)
    if (this.lamps.length) { const c = lit(b).lamps;
      for (const l of this.lamps) { const mA = c.find((x) => x.id === l.id)?.mA ?? 0, k = Math.min(3, mA / 20 * 6), on = mA > 0.5;
        for (const m of l.lens) { m.emissive.setHex(l.hex); m.emissiveIntensity = on ? 0.4 + k : 0; }
        l.sprite.visible = on; l.light.intensity = on ? 0.004 * mA : 0; (l.sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.35 + mA / 20); } }
    // (the cutters' spring holds their jaws open in a hand; the trigger shuts them a moment)
    if (this.jaws) { this.jaws.shut = Math.max(0, this.jaws.shut - dt); this.swing(this.jaws.shut > 0 ? 0 : JAWS.open); }
    // (the tip bright where it is tinned, dark where it has oxidised)
    for (const m of this.tipMeshes) { const mat = m.material as THREE.MeshStandardMaterial; mat.color.setHex(b.iron.tinned > 0 ? 0xd9dcde : 0x4a4038); mat.roughness = b.iron.tinned > 0 ? 0.15 : 0.7; }
    for (const p of this.puffs) { p.t += dt; p.s.position.y += 0.03 * dt; p.s.scale.multiplyScalar(1 + 0.6 * dt); (p.s.material as THREE.SpriteMaterial).opacity = Math.max(0, 0.35 * (1 - p.t / 1.6)); p.s.visible = p.t < 1.6; }
    this.drawCable();
    this.cardAt -= dt; if (this.cardAt <= 0) { this.cardAt = 0.25; this.drawCard(); }
  }
  /** On a screen: the iron held to a point as a hand would, its tip on it from 35° above. */
  private poseIronAt(p: V3): void {
    // (held from your right and toward you, as a right hand holds it: its tip down onto the point at 35° from the bench,
    // its face up)
    const o = this.obj.iron!; if (o.parent !== this.group) this.group.attach(o);
    const d = new THREE.Vector3(-0.62, -Math.sin(0.61), -0.45).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q); if (up.y < 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), PI));
    o.quaternion.copy(q); o.position.set(p[0] * MM, p[1] * MM, p[2] * MM).addScaledVector(d, -0.155);
  }
  /** The cord from the plug's back, out along the iron, down onto the bench and off its right edge (redrawn when the iron
   *  has moved a millimetre). */
  private drawCable(): void {
    const iron = this.obj.iron!; iron.updateMatrixWorld(); const from = this.group.worldToLocal(iron.localToWorld(new THREE.Vector3(-20.65 * MM, -3.6 * MM, 0)));
    if (from.distanceTo(this.cableFrom) < 0.001) return; this.cableFrom.copy(from);
    const out = this.group.worldToLocal(iron.localToWorld(new THREE.Vector3(-60 * MM, -3.6 * MM, 0))), edge = new THREE.Vector3(0.36, 0.002, 0.06), over = new THREE.Vector3(0.378, -0.02, 0.065);
    // (over the bench's edge, down to the floor and along it toward the wall socket the charger is in)
    this.group.updateMatrixWorld(true); const floor = this.group.worldToLocal(this.group.localToWorld(new THREE.Vector3(0.39, 0, 0.08)).setY(0.004)).y;
    const fall = new THREE.Vector3(0.392, floor + 0.08, 0.075), lie = new THREE.Vector3(0.43, floor + 0.002, 0.09), away = new THREE.Vector3(0.9, floor + 0.002, 0.35);
    const mid = out.clone().lerp(edge, 0.5).setY(Math.max(0.002, Math.min(out.y, edge.y) - 0.01));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, out, mid, edge, over, fall, lie, away], false, 'centripetal'), 96, 2 * MM, 8, false);
    this.cable.geometry.dispose(); this.cable.geometry = g;
  }
  private puff(at: V3): void {
    if (typeof document === 'undefined') return; let p = this.puffs.find((x) => x.t >= 1.6);
    if (!p) { if (this.puffs.length > 24) return; p = { s: new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.35, depthWrite: false })), t: 0 }; this.group.add(p.s); this.puffs.push(p); }
    p.t = 0; p.s.visible = true; p.s.scale.setScalar(0.004); p.s.position.set(at[0] * MM, (at[1] + 2) * MM, at[2] * MM);
  }
  private drawCard(): void {
    const src = this.build?.power?.source, l = this.bench.plan === 'proto' && src && this.bench.placed[src] ? lit(this.bench) : null;
    const power = !l ? [] : l.mA <= 0.5 ? [`${l.lamps.length > 1 || (this.build?.power?.lamps.length ?? 1) > 1 ? 'LEDs' : 'LED'}: dark (${l.why})`] : l.lamps.length > 1 ? [`LEDs lit: ${l.lamps.map((c) => `${c.name.replace(/^the /, '')} ${c.mA.toFixed(1)} mA`).join(', ')}`] : [`LED: lit, ${l.mA.toFixed(1)} mA`];
    const r = readout(this.bench), lines = [`Step ${r.step} of ${r.of}: ${r.do}`, ...(r.check ? [`Done when: ${r.check}`] : []), ...power, `Iron: ${r.iron}`, `Wire: ${Math.round(this.bench.wire.out)} mm out`, ...(r.joint ? [r.joint] : []), `${r.good} of ${this.bench.joints.length} good`, ...r.bridges, ...r.last.map((s) => `· ${s}`)], text = lines.join('\n');
    if (text === this.cardText || !this.cardCtx) return; this.cardText = text; const x = this.cardCtx, W = 1024, Hh = 600;
    x.clearRect(0, 0, W, Hh); x.fillStyle = 'rgba(16,20,24,0.88)'; x.beginPath(); x.roundRect(0, 0, W, Hh, 24); x.fill();
    x.fillStyle = '#e8edf2'; x.font = '28px system-ui, sans-serif'; let y = 46;
    for (const l of lines) { for (const w of wrap(x, l, W - 56)) { x.fillText(w, 28, y); y += 36; if (y > Hh - 16) break; } if (y > Hh - 16) break; }
    this.cardTex.needsUpdate = true;
  }
  /** For tests: joint n's point, where the tip meets it, or (given t) the point t mm along its lead, in the room (m). */
  jointAt(n: number, t?: number): [number, number, number] | null { const q = this.bench.joints[n - 1]; return q ? this.world(t === undefined ? q.at : leadAt(q, t)) : null; }
  /** A point on the bench (its mm) where it is in the room (m). */
  world(p: V3): [number, number, number] { this.group.updateMatrixWorld(); const w = this.group.localToWorld(new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)); return [w.x, w.y, w.z]; }
  /** For tests: the bench run on by `s` seconds of its own time, a sixtieth at a time, whatever the frame rate. */
  advance(s: number): void { for (let t = 0; t < s - 1e-9; t += 1 / 60) this.update(1 / 60); }
  /** For tests: the lesson as it stands. */
  now() { const r = readout(this.bench); return { on: this.bench.on, mA: this.bench.plan === 'proto' ? +lit(this.bench).mA.toFixed(2) : 0, lamps: this.bench.plan === 'proto' ? lit(this.bench).lamps.map((c) => ({ id: c.id, mA: +c.mA.toFixed(2) })) : [], plan: this.plan, step: r.step, of: r.of, do: r.do, iron: Math.round(this.bench.iron.T), tinned: this.bench.iron.tinned > 0, good: r.good, graded: r.graded, joint: r.joint, placed: { ...this.bench.placed }, held: { ...this.held }, wire: +this.bench.wire.out.toFixed(1), leads: this.bench.joints.map((q) => +q.lead.toFixed(2)), cut: this.pieces.length }; }
  reset(): void {
    this.bench = newBench(this.plan, this.build ?? PROTO_BUILD); this.script = { tip: null, wire: null, cutters: false }; this.held = { right: null, left: null };
    for (const p of this.pieces) { p.m.geometry.dispose(); p.m.removeFromParent(); } this.pieces = [];
    for (const k of ['proto', 'header-a', 'header-b', 'pico', ...(this.build?.things.map((t) => t.id) ?? []), 'cutters']) this.settle(k); this.placeIronInStand(); this.swingSwitch();
  }
  // ---- the joints and the second lesson's parts ----------------------------------------------------------------------
  /** Each joint's solder (a concave cone round its lead, from its pad's edge, or a ball where there is far too much) on
   *  its pad's face: on the Pico's pads on the bench, or on the Perma-Proto's underside in its own frame (its +y out of
   *  the pad), with the lead standing out of it. */
  private joints(): void {
    const cones = new Map<string, THREE.LatheGeometry>(), ballGeo = new THREE.SphereGeometry(1, 16, 10);
    const coneOf = (sh: JointShape): THREE.LatheGeometry => { const k = `${sh.pad}/${sh.pin}`; let g = cones.get(k); if (g) return g;
      const R = sh.pad / 2, rp = sh.pin / 2, prof: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2((rp + (R - rp) * (1 - t) ** 2) * MM, t * R * 0.9 * MM)); }
      prof.push(new THREE.Vector2(rp * MM, 0)); g = new THREE.LatheGeometry(prof, 24); cones.set(k, g); return g; };
    this.bench.joints.forEach((q, i) => {
      const at = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.25 });
      if (this.plan === 'pico') { const p = pinAt(i + 1); at.position.set(p[0] * MM, p[1] * MM, p[2] * MM); this.group.add(at); }
      else { const k = this.bench.joints.slice(0, i).filter((r) => r.part === q.part).length, [x, z] = this.seats[q.part!]![k]!; at.position.set(x * MM, -1.6 * MM, z * MM); at.rotation.set(PI, 0, 0); this.obj.proto!.add(at); }
      const cone = new THREE.Mesh(coneOf(q.shape), m), ball = new THREE.Mesh(ballGeo, m); cone.visible = false; ball.visible = false; at.add(cone, ball);
      // (what the wire's rosin core leaves: a thin glassy film flowed out past the pad, its edge uneven as it ran, a
      // third to three quarters of a millimetre (2 % rosin in the reel's wire; its spread an estimate), each joint's own)
      const ring = new THREE.Shape(), R0 = q.shape.pad / 2; let sd = (i + 1) * 7919; const rn = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
      const reach = Array.from({ length: 9 }, () => 0.3 + 0.45 * rn());
      for (let k = 0; k <= 48; k++) { const a = (k / 48) * 2 * PI, u = (a / (2 * PI)) * 9, k0 = Math.floor(u) % 9, f = u - Math.floor(u), r = (R0 + reach[k0]! + (reach[(k0 + 1) % 9]! - reach[k0]!) * (1 - Math.cos(f * PI)) / 2) * MM;
        if (k === 0) ring.moveTo(r, 0); else ring.lineTo(r * Math.cos(a), r * Math.sin(a)); }
      const hole = new THREE.Path(); hole.absarc(0, 0, R0 * MM, 0, 2 * PI, true); ring.holes.push(hole);
      const rosin = new THREE.Mesh(new THREE.ShapeGeometry(ring, 2).rotateX(-PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8691f, transparent: true, opacity: 0.26, roughness: 0.15, depthWrite: false }));
      rosin.position.y = 0.02 * MM; rosin.visible = false; at.add(rosin);
      let stub: THREE.Mesh | null = null;
      if (q.part) { const sq = !q.shape.round, r = (sq ? q.shape.pin / Math.SQRT2 : q.shape.pin / 2) * MM, lead = this.looks[q.part]?.bent[0] as THREE.Mesh | undefined;
        stub = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, sq ? 4 : 8).translate(0, 0.5, 0), lead?.material ?? new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }));
        if (sq) stub.geometry.rotateY(PI / 4); stub.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...q.dir)); stub.castShadow = true; stub.visible = false; at.add(stub); }
      this.fillets.push({ at, cone, ball, stub, rosin });
    });
  }
  /** The link: Adafruit's 22 AWG solid hook-up wire (its 1311: 1.5 mm over its red PVC, UL1007), stripped at each end
   *  and bent to a staple across three holes (7.62 mm), lying on the board, its copper (tinned, typical of UL1007 wire)
   *  down through its holes; its ends 4 mm on below the board until it is in (then its joints' leads). Its own frame:
   *  its holes along z, the board's top at y 0. */
  private link(t: BuildThing): THREE.Group {
    const g = new THREE.Group(), w = PROTO.wire, half = this.spots[t.id]!.half, ins = half - 0.5, rc = w.cu / 2;
    const pvc = new THREE.MeshStandardMaterial({ color: 0xc62828, roughness: 0.45 }), cu = new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 });
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(w.od / 2 * MM, w.od / 2 * MM, 2 * ins * MM, 16).rotateX(PI / 2).translate(0, w.od / 2 * MM, 0), pvc); jacket.castShadow = true; jacket.name = 'hook-up wire insulation'; g.add(jacket);
    const bent: THREE.Object3D[] = [], straight: THREE.Object3D[] = [];
    for (const sg of [-1, 1]) {
      const leg = new THREE.Mesh(tubeMm([[0, w.od / 2, sg * (ins - 0.3)], [0, w.od / 2, sg * (ins + 0.1)], [0, w.od / 2 - 0.2, sg * (half - 0.15)], [0, 0.1, sg * half], [0, -1.6, sg * half]], rc, 8), cu); leg.castShadow = true; leg.name = 'hook-up wire copper'; g.add(leg);
      const end = new THREE.Mesh(new THREE.CylinderGeometry(rc * MM, rc * MM, 4 * MM, 8).translate(0, (-1.6 - 2) * MM, sg * half * MM), cu); end.name = 'hook-up wire end'; g.add(end); straight.push(end); bent.push(leg);
    }
    this.looks[t.id] = { straight, bent: [bent[0]!] }; return g;
  }
  /** An axial part's or an LED's leads as they are bent into their holes (drawn ready, shown once it is in): a
   *  resistor's bent down a lead's width past its caps to its holes (10.16 apart for four holes), an LED's spread from
   *  2.54 to its holes under its rim, each on to the board's underside; the leads each part came with, straight, hidden
   *  then. */
  private bendLeads(t: BuildThing): void {
    const o = this.obj[t.id]!, straight: THREE.Object3D[] = [], half = this.spots[t.id]!.half, axial = t.form === 'axial';
    o.traverse((m) => { const x = m as THREE.Mesh; if (!x.isMesh || !/ lead$/.test(x.name)) return; x.geometry.computeBoundingBox(); const sz = x.geometry.boundingBox!.getSize(new THREE.Vector3()); if (Math.max(sz.x, sz.y, sz.z) > 0.01) straight.push(x); });
    const mat = (straight[0] as THREE.Mesh | undefined)?.material ?? new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }), bent: THREE.Object3D[] = [];
    for (const sg of [-1, 1]) {
      const pts: [number, number, number][] = axial ? [[sg * 2.9, 1.25, 0], [sg * 3.9, 1.25, 0], [sg * (half - 0.48), 1.1, 0], [sg * (half - 0.13), 0.7, 0], [sg * half, 0.2, 0], [sg * half, -1.6, 0]]
        : [[sg * 1.27, 3.6, 0], [sg * 1.27, -0.6, 0], [sg * (1.27 + (half - 1.27) * 0.26), -1.3, 0], [sg * (1.27 + (half - 1.27) * 0.73), -2.0, 0], [sg * half, -2.6, 0], [sg * half, -4.6, 0]];
      const m = new THREE.Mesh(tubeMm(pts, axial ? 0.3 : 0.5 / Math.SQRT2, axial ? 8 : 4), mat); m.castShadow = true; m.visible = false; m.name = `${t.name} lead, bent`; o.add(m); bent.push(m);
    }
    this.looks[t.id] = { straight, bent };
  }
  /** The battery holder as the bench has it: Adafruit's 3951 as the library draws it, two AA cells in its wells in
   *  series (cell A's + toward the switch end, cell B's the other way). */
  private holder(add: (part: Part, at: V3, rot?: [number, number, number]) => THREE.Object3D, t: BuildThing): THREE.Group {
    const g = new THREE.Group(), part = drawn(t.draw ?? 'switchholder 3951'), v = add(part, [0, 0, 0]); g.add(v);
    const cell = compPart(aaCell(), 'AA alkaline cell'), y = 1.2 + 7.1;
    for (const [x, z, th] of [[-25.15, 7.6, -PI / 2], [25.15, -7.6, PI / 2]] as const) g.add(add(cell, [x, y, z], [0, 0, th]));
    // (its leads as made, laid out; its switch's blade and knob, standing open, turned about its hinge to close)
    const laid: THREE.Object3D[] = [], blade: THREE.Object3D[] = [], sw = part.parts?.find((p) => p.name.endsWith('3951 knife switch'));
    v.traverse((o) => { const pp = o.userData.part as Part | undefined; if (!pp) return; if (/lead$/.test(pp.name) && o.type === 'Group') laid.push(o); if (sw && o.type === 'Group' && (pp === sw.parts?.[4] || pp === sw.parts?.[5])) blade.push(o); });
    const home = new Map<THREE.Object3D, THREE.Quaternion>(); for (const o of blade) home.set(o, o.quaternion.clone());
    this.power = { laid, blade, home, hinge: new THREE.Vector3(H3951.sx, H3951.H + 3, -(H3951.W / 2 - 3)).multiplyScalar(MM), run: [] };
    return g;
  }
  /** The knife switch as the lesson has it: its blade standing up (open) or turned down into its clip (closed). */
  private swingSwitch(): void {
    const p = this.power; if (!p) return; const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.bench.on ? PI / 2 : 0);
    for (const o of p.blade) { const h = p.home.get(o)!; if (!o.userData.homeAt) o.userData.homeAt = o.position.clone(); const at = (o.userData.homeAt as THREE.Vector3).clone().sub(p.hinge).applyQuaternion(q).add(p.hinge); o.position.copy(at); o.quaternion.copy(q).multiply(h); }
  }
  /** The holder's leads: laid out as made while it waits; run up to the board once its pins are in, each out of the
   *  holder's end wall to its crimped end: a tinned barrel 5 mm long on the board's top over its hole, its pin through
   *  (the barrel's size typical of crimp pins for 22 AWG). */
  private runLeads(id: string, inBoard: boolean): void {
    const p = this.power, board = this.obj.proto; if (!p || !board) return;
    for (const o of p.run) { (o as THREE.Mesh).geometry?.dispose(); o.removeFromParent(); } p.run = [];
    for (const o of p.laid) o.visible = !inBoard; if (!inBoard) return;
    this.group.updateMatrixWorld(true); const pins = this.seats[id]!, colours = [0xc62828, 0x1e1e1e];
    [BATTERY.red, BATTERY.black].forEach((root, i) => {
      const [hx, hz] = pins[i]!, housing = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * MM, 0.9 * MM, 5 * MM, 12).translate(0, 2.5 * MM, 0), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.35 }));
      housing.position.set(hx * MM, 0, hz * MM); board.add(housing); p.run.push(housing);
      const end = this.group.worldToLocal(board.localToWorld(new THREE.Vector3(hx * MM, 5 * MM, hz * MM))), out = this.group.worldToLocal(board.localToWorld(new THREE.Vector3(hx * MM, 22 * MM, hz * MM)));
      const r0 = new THREE.Vector3(...BATTERY.seated).add(new THREE.Vector3(...root)).multiplyScalar(MM), r1 = r0.clone().add(new THREE.Vector3(0.015, 0.004, 0)), mid = out.clone().lerp(r1, 0.5).add(new THREE.Vector3(0, -0.012, 0));
      const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([end, out, mid, r1, r0], false, 'centripetal'), 48, 0.75 * MM, 8, false), new THREE.MeshStandardMaterial({ color: colours[i], roughness: 0.45 }));
      wire.castShadow = true; this.group.add(wire); p.run.push(wire);
    });
  }
  /** A part drawn as it is in its holes (its leads bent) or out of them (straight, as it came). */
  private look(k: string, seated: boolean): void { const l = this.looks[k]; if (!l) return; for (const m of l.straight) m.visible = !seated; for (const m of l.bent) m.visible = seated; if (this.thing(k)?.form === 'link') for (const m of l.bent) m.visible = true; }
  dispose(): void { for (const v of this.views) v.dispose(); this.group.removeFromParent(); }
}
function wrap(x: CanvasRenderingContext2D, s: string, w: number): string[] {
  const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (x.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
