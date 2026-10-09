// The soldering bench in the room: the lesson of src/nexus/solder-lesson.ts done by your own hands. Every thing on it is
// drawn by the library as it is made (the Pico, its two headers, the BB400 breadboard, PINE64's Pinecil, the Atten
// stand and Hakko's brass cleaner, the solder wire); the right hand takes the iron and holds it as a pen, the left the
// solder; either takes a header or the Pico and lets it go over its place. Each joint's solder is drawn as it is (a
// cone, a ball, dull where it is cold), rosin smoke rises where solder melts, and a card behind the bench says the step,
// the iron and the joint under the tip. On a screen, the same moves are said in words (`act`), which tests use too.
// Owner of: the bench's things in the room, how hands take and let them go, and how the lesson is drawn.

import * as THREE from 'three';
import { kitView, type KitView } from './kit3d';
import { compPart, componentOf } from '../components';
import { pinHeader, usbCPlug } from '../boardparts';
import { resolve } from '../inventory';
import type { Part } from '../kits';
import { ironInStand } from '../kit-solder';
import { grade, idealVolume, PICO_PIN } from '../solder-joint';
import { ALLOY, HAND, jointPoint, LAYOUT, letGo, newBench, payOut, pinAt, readout, takeUp, tick, wipe, type Bench, type Thing, type V3 } from '../solder-lesson';

const MM = 0.001, PI = Math.PI;
/** A thing the library draws, by the words it is called by. */
function drawn(words: string): Part {
  const it = resolve(words); if (!it || typeof it === 'string') throw new Error(`the bench needs "${words}": ${it ?? 'not in the library'}`);
  const c = componentOf(it.id); if (!c) throw new Error(`the bench needs "${words}" drawn`); return c.part;
}
/** Where things wait on the bench, mm (the user stands toward +z): the headers to the left, the Pico to the right, the
 *  stand beyond it pointing away (its rear ring, where the handle lies, toward you), the cleaner behind it, the solder's
 *  reel behind the breadboard. */
const PLACES = { stand: [150, 0, 70] as V3, cleaner: [215, 0, -40] as V3, reel: [-95, 0, -60] as V3 };
/** The stand turned a quarter so its front (where the tip lies) points away from you (−z). */
const STAND_YAW = PI / 2;

export class SolderBench {
  readonly group = new THREE.Group();
  bench: Bench = newBench();
  private views: KitView[] = [];
  private obj = {} as Record<Thing, THREE.Object3D>;
  private home = {} as Record<Thing, { at: THREE.Vector3; rot: THREE.Euler }>;
  private held: Record<'right' | 'left', Thing | null> = { right: null, left: null };
  private fillets: { cone: THREE.Mesh; ball: THREE.Mesh }[] = [];
  private wire: THREE.Mesh; private wireDir = new THREE.Vector3(0.3, -0.45, -0.84).normalize();
  private tipMeshes: THREE.Mesh[] = [];
  private card: THREE.Mesh; private cardCtx: CanvasRenderingContext2D | null; private cardTex: THREE.CanvasTexture; private cardText = ''; private cardAt = 0;
  private puffs: { s: THREE.Sprite; t: number }[] = [];
  private legs: THREE.Mesh[] = [];
  private cable: THREE.Mesh; private cableFrom = new THREE.Vector3(1e9, 0, 0); private tail: THREE.Mesh;
  /** for words and tests: where the tip and the wire's end are, bench mm, when no hand holds them */
  private script: { tip: V3 | null; wire: V3 | null } = { tip: null, wire: null };

  constructor() {
    // (the bench: a plywood top 25 mm thick on four legs, as a workbench is (its height set where it is placed); the
    // lesson's things on it)
    const wood = new THREE.MeshStandardMaterial({ color: 0x9a7a55, roughness: 0.75 }), top = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.025, 0.38), wood);
    top.position.set(0.03, -0.0125, -0.05); top.receiveShadow = true; top.castShadow = true; this.group.add(top);
    for (const [x, z] of [[-0.27, -0.21], [0.33, -0.21], [-0.27, 0.11], [0.33, 0.11]] as const) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1, 0.04), wood); leg.position.set(x, -0.525, z); leg.name = 'bench leg'; this.legs.push(leg); this.group.add(leg); }
    const add = (part: Part, at: V3, rot: [number, number, number] = [0, 0, 0]): THREE.Object3D => { const v = kitView(part, { maxLights: 0 }); this.views.push(v); v.group.position.set(at[0] * MM, at[1] * MM, at[2] * MM); v.group.rotation.set(...rot); this.group.add(v.group); return v.group; };
    add(drawn('breadboard 400pts'), [0, 0, 0]);
    // (the headers lying on their sides till they are put in; the Pico flat on the bench)
    const header = compPart(pinHeader(1, 20, 'gold').comp, '20-pin header');
    this.obj['header-a'] = add(header, [-90, 1.27, 20], [PI / 2, 0, 0]); this.obj['header-b'] = add(header, [-90, 1.27, 32], [PI / 2, 0, 0]);
    this.obj.pico = add(drawn('pico pico1'), [85, 1.0, 35]);
    add(drawn('ironstand s-11'), PLACES.stand, [0, STAND_YAW, 0]); add(drawn('tipcleaner 599b'), PLACES.cleaner);
    this.obj.iron = add(drawn('solderiron pinecil-v2'), [0, 0, 0]); this.placeIronInStand();
    // (the solder: its reel behind the breadboard, the wire out of the fingers when it is in a hand)
    this.obj.solder = add(drawn('solderreel ts-635050'), PLACES.reel);
    // (its free end off the top of the winding (14.9 mm round its middle 19 up: the reel's own figures), down onto the
    // bench, while no hand holds it; and the cutters the joint lesson trims with, lying beside the headers)
    const [rx, , rz] = PLACES.reel, tail = [[rx, 33.9, rz], [rx + 10, 33.4, rz + 1], [rx + 19, 22, rz + 4], [rx + 25, 0.4, rz + 8], [rx + 33, 0.3, rz + 11]].map(([x, y, z]) => new THREE.Vector3(x! * MM, y! * MM, z! * MM));
    this.tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 24, HAND.wire / 2 * MM, 6, false), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 })); this.group.add(this.tail);
    add(drawn('flushcutter chp-170'), [-150, 5.8, 70], [0, 0.35, 0]);
    this.wire = new THREE.Mesh(new THREE.CylinderGeometry(HAND.wire / 2 * MM, HAND.wire / 2 * MM, 1, 8).translate(0, -0.5, 0).rotateX(PI / 2), new THREE.MeshStandardMaterial({ color: 0xc9cdd1, metalness: 1, roughness: 0.3 }));
    this.wire.visible = false; this.group.add(this.wire);
    for (const k of Object.keys(this.obj) as Thing[]) this.home[k] = { at: this.obj[k].position.clone(), rot: this.obj[k].rotation.clone() };
    // (its power: a USB-C cable's plug in the iron's socket at its back (6 mm in, its overmould against the handle), its
    // cord, 4 mm across (typical of a 3 A cable), over the bench and off its right edge to the charger the pack buys)
    const plug = kitView(compPart(usbCPlug().comp, 'USB-C cable'), { maxLights: 0 }); this.views.push(plug);
    plug.group.position.set(6.0 * MM, -3.6 * MM, 0); plug.group.rotation.set(0, PI, 0); this.obj.iron.add(plug.group);
    this.cable = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x1c1c1e, roughness: 0.6 })); this.cable.castShadow = true; this.group.add(this.cable);
    this.obj.iron.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && /point|iron plating/i.test(m.name)) { m.material = (m.material as THREE.MeshStandardMaterial).clone(); this.tipMeshes.push(m); } });
    // (each joint's solder: a concave cone round its pin, or a ball where there is far too much)
    const R = PICO_PIN.pad / 2, rp = PICO_PIN.pin / 2, prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2((rp + (R - rp) * (1 - t) ** 2) * MM, t * R * 0.9 * MM)); }
    prof.push(new THREE.Vector2(rp * MM, 0));
    const coneGeo = new THREE.LatheGeometry(prof, 24), ballGeo = new THREE.SphereGeometry(1, 16, 10);
    for (let n = 1; n <= 40; n++) { const p = pinAt(n), m = new THREE.MeshStandardMaterial({ color: 0xc8ccd0, metalness: 1, roughness: 0.25 });
      const cone = new THREE.Mesh(coneGeo, m), ball = new THREE.Mesh(ballGeo, m); for (const x of [cone, ball]) { x.position.set(p[0] * MM, p[1] * MM, p[2] * MM); x.visible = false; this.group.add(x); }
      this.fillets.push({ cone, ball }); }
    // (the card behind the bench)
    const c = typeof document === 'undefined' ? null : document.createElement('canvas'); if (c) { c.width = 1024; c.height = 600; }
    this.cardCtx = c?.getContext('2d') ?? null; this.cardTex = new THREE.CanvasTexture(c ?? undefined as unknown as HTMLCanvasElement); this.cardTex.colorSpace = THREE.SRGBColorSpace;
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), new THREE.MeshBasicMaterial({ map: this.cardTex, transparent: true })); this.card.position.set(0, 0.16, -0.2); this.card.rotation.x = -0.25; this.group.add(this.card);
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
    const o = this.obj.iron; if (o.parent !== this.group) this.group.attach(o);
    const r = ironInStand(), turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), STAND_YAW);
    const at = new THREE.Vector3(...r.at).multiplyScalar(MM).applyQuaternion(turn).add(new THREE.Vector3(...PLACES.stand).multiplyScalar(MM));
    o.position.copy(at); o.quaternion.copy(turn).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(r.dir[1], r.dir[0])));
  }
  /** The tip's point, where it is now, in the bench's mm. */
  private tipNow(): V3 { const w = this.obj.iron.localToWorld(new THREE.Vector3(0.155, 0, 0)); const l = this.group.worldToLocal(w); return [l.x / MM, l.y / MM, l.z / MM]; }
  /** The wire's end, in the bench's mm. */
  private wireNow(): V3 { this.wire.updateMatrixWorld(); const w = this.wire.localToWorld(new THREE.Vector3(0, 0, -1)); const l = this.group.worldToLocal(w); return [l.x / MM, l.y / MM, l.z / MM]; }

  // ---- hands ---------------------------------------------------------------------------------------------------------
  /** A grip closed at `grip` (its controller's grip space; `ray` its pointing space): the nearest thing within 9 cm
   *  taken into that hand, held as it is held (the iron as a pen, its tip 7 cm ahead of the fist and 30° below where the
   *  hand points; the solder's wire out of the fingers, forward and down toward the work; a header or the Pico as it
   *  was). What it did, said; null where nothing is near. */
  grab(hand: 'right' | 'left', grip: THREE.Object3D, ray: THREE.Object3D = grip): string | null {
    const at = grip.getWorldPosition(new THREE.Vector3()), can: Thing[] = hand === 'right' ? ['iron', 'header-a', 'header-b', 'pico'] : ['solder', 'header-a', 'header-b', 'pico'];
    let best: Thing | null = null, bd = 0.09;
    for (const k of can) { if (this.held.left === k || this.held.right === k) continue; const d = this.grabPoint(k).distanceTo(at); if (d < bd) { bd = d; best = k; } }
    if (!best) return null;
    const said = takeUp(this.bench, best); if (/first|soldered to/.test(said)) return said;
    this.held[hand] = best; const o = this.obj[best];
    // (held as a hand holds it, set in the frame of where the hand points (a controller's grip frame lies along its
    // handle, pitched from that) and turned into the grip's)
    const rel = grip.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(ray.getWorldQuaternion(new THREE.Quaternion()));
    if (best === 'iron') {
      grip.add(o); const d = new THREE.Vector3(0, -Math.sin(0.52), -Math.cos(0.52)), up = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize();
      const pen = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(d, up, d.clone().cross(up)));
      o.quaternion.copy(rel).multiply(pen); o.position.copy(d.applyQuaternion(rel)).multiplyScalar(-0.085);
    } else if (best === 'solder') {
      grip.add(this.wire); const d = this.wireDir.clone().applyQuaternion(rel);
      this.wire.position.copy(new THREE.Vector3(0, -0.005, -0.03).applyQuaternion(rel)); this.wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d); this.wire.visible = true;
    }
    else grip.attach(o);
    return said;
  }
  /** Where a thing is taken hold of, in the room: the iron by its grip (70 mm from its back), the reel by its middle,
   *  the rest where they are. */
  private grabPoint(k: Thing): THREE.Vector3 { const o = this.obj[k]; o.updateMatrixWorld(); return k === 'iron' ? o.localToWorld(new THREE.Vector3(0.07, 0, 0)) : k === 'solder' ? o.localToWorld(new THREE.Vector3(0, 0.019, 0)) : o.getWorldPosition(new THREE.Vector3()); }
  /** For tests: where the tip's point, the wire's end, or a thing's hold is in the room (m). */
  point(what: 'tip' | 'wire' | Thing): [number, number, number] { const w = what === 'tip' ? this.group.localToWorld(new THREE.Vector3(...this.tipNow()).multiplyScalar(MM)) : what === 'wire' ? this.group.localToWorld(new THREE.Vector3(...this.wireNow()).multiplyScalar(MM)) : this.grabPoint(what); return [w.x, w.y, w.z]; }
  /** That hand's grip opened: what it held let go where it is (put in its place if it is over it, else back where it
   *  waits; the iron always back in its stand). */
  release(hand: 'right' | 'left'): string | null {
    const k = this.held[hand]; if (!k) return null; this.held[hand] = null;
    if (k === 'solder') { this.group.attach(this.wire); this.wire.visible = false; return letGo(this.bench, 'solder', null); }
    if (k === 'iron') { this.placeIronInStand(); return letGo(this.bench, 'iron', null); }
    const o = this.obj[k]; this.group.attach(o); const p = o.position; const said = letGo(this.bench, k, [p.x / MM, p.y / MM, p.z / MM]);
    this.settle(k); return said;
  }
  /** A thing put where the lesson has it: a header in its row, the Pico on them, else where it waits. */
  private settle(k: 'header-a' | 'header-b' | 'pico'): void {
    const o = this.obj[k], b = this.bench;
    if (k === 'pico' && b.placed.pico) { o.position.set(0, LAYOUT.picoTop * MM, 0); o.rotation.set(0, 0, 0); return; }
    if (k !== 'pico' && b.placed[k]) { o.position.set(0, (LAYOUT.board.top + LAYOUT.strip) * MM, b.seat[k]! * MM); o.rotation.set(PI, 0, 0); return; }
    o.position.copy(this.home[k].at); o.rotation.copy(this.home[k].rot);
  }
  /** The left trigger: more wire pulled off the reel. */
  feedMore(): void { payOut(this.bench, 10); }

  // ---- words, for a screen and for tests -----------------------------------------------------------------------------
  /** A move said in words: "place the headers", "place the pico", "take the iron", "take the solder", "tin the tip",
   *  "wipe", "heat pin 5", "feed pin 5", "lift", "more solder", "iron down". Moves the things as the hands would. */
  act(words: string): string {
    const t = words.trim().toLowerCase(), b = this.bench, n = Number(/\bpin (\d+)/.exec(t)?.[1] ?? NaN);
    if (/place (the )?headers?/.test(t)) { for (const [h, z] of [['header-a', 8.89], ['header-b', -8.89]] as const) { if (!b.placed[h]) { letGo(b, h, [0, LAYOUT.board.top + LAYOUT.strip, z]); this.settle(h); } } return 'both headers in rows c and h, their long pins down'; }
    if (/place (the )?pico/.test(t)) { const s = letGo(b, 'pico', [0, LAYOUT.picoTop, 0]); this.settle('pico'); return s; }
    if (/take (the )?iron/.test(t)) return takeUp(b, 'iron');
    if (/take (the )?solder/.test(t)) { this.wire.visible = false; return takeUp(b, 'solder'); }
    if (/^tin/.test(t)) { this.script.tip = [60, 40, 40]; this.script.wire = [60, 40.5, 40]; return 'the wire on the tip'; }
    if (/^wipe/.test(t)) { wipe(b); return 'the tip wiped on the brass'; }
    if (/^heat/.test(t) && n >= 1 && n <= 40) { this.script.tip = jointPoint(n); this.script.wire = null; return `the tip on pin ${n}'s pad and pin`; }
    if (/^feed/.test(t) && n >= 1 && n <= 40) { this.script.tip = jointPoint(n); this.script.wire = jointPoint(n); return `solder fed to pin ${n}`; }
    if (/^(lift|away)/.test(t)) { const was = this.script.tip; this.script.tip = null; this.script.wire = null; if (was && b.iron.inHand) this.poseIronAt([was[0], was[1] + 40, was[2] + 20]); return 'the iron lifted away'; }
    if (/more solder|pull more/.test(t)) { payOut(b, 10); return `${Math.round(b.wire.out)} mm of wire out`; }
    if (/iron (down|back)|in (its|the) stand/.test(t)) { this.script = { tip: null, wire: null }; this.placeIronInStand(); return letGo(b, 'iron', null); }
    return 'Say: place the headers, place the pico, take the iron, take the solder, tin the tip, wipe, heat pin N, feed pin N, lift, more solder, iron down.';
  }

  // ---- each frame ----------------------------------------------------------------------------------------------------
  update(dt: number): void {
    const b = this.bench, ironHand = this.held.right === 'iron' || this.held.left === 'iron', wireHand = this.held.left === 'solder' || this.held.right === 'solder';
    let tip: V3 | null = ironHand ? this.tipNow() : this.script.tip, wire: V3 | null = wireHand ? this.wireNow() : this.script.wire;
    if (!ironHand && this.script.tip && b.iron.inHand) this.poseIronAt(this.script.tip);
    if (!b.iron.inHand) tip = null; if (!b.wire.inHand) wire = null;
    // (the tip drawn through the brass wipes it)
    if (tip && Math.hypot(tip[0] - PLACES.cleaner[0], tip[1] - 35, tip[2] - PLACES.cleaner[2]) < 26) wipe(b);
    const used = b.wire.used; tick(b, dt, tip, wire);
    if (b.wire.used > used && (tip || wire)) this.puff(wire ?? tip!);
    if (wireHand) this.wire.scale.set(1, 1, Math.max(0.001, b.wire.out * MM));
    // (said, not done by hand: the wire drawn from where a left hand would hold it to where its end is)
    else if (this.script.wire && b.wire.inHand) { const e = new THREE.Vector3(...this.script.wire).multiplyScalar(MM), d = new THREE.Vector3(0.6, -0.5, -0.62).normalize(); if (this.wire.parent !== this.group) this.group.add(this.wire);
      this.wire.visible = true; this.wire.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), d); this.wire.scale.set(1, 1, Math.max(0.001, b.wire.out * MM)); this.wire.position.copy(e).addScaledVector(d, -b.wire.out * MM); }
    else if (!wireHand) this.wire.visible = false;
    this.tail.visible = !this.wire.visible;
    // (each joint as its solder is)
    const v = idealVolume(PICO_PIN);
    b.joints.forEach((q, i) => { const f = this.fillets[i]!, fill = q.j.solder / v, g = grade(q.j).grade, m = f.cone.material as THREE.MeshStandardMaterial;
      const any = q.j.solder + q.j.cold + q.j.dropped > 0.01; f.cone.visible = any && fill <= 1.6 && q.j.dropped < 0.2; f.ball.visible = any && !f.cone.visible;
      if (f.cone.visible) f.cone.scale.set(1, Math.min(1, Math.max(0.15, (fill - 0.35) / 0.65)), 1);
      if (f.ball.visible) { const r = Math.cbrt((3 * (q.j.solder + q.j.cold + q.j.dropped)) / (4 * PI)) * MM; f.ball.scale.setScalar(r); f.ball.position.y = (LAYOUT.picoTop + r / MM * 0.7) * MM; }
      const molten = q.j.T >= ALLOY.liquidus, cold = g === 'cold', burnt = g === 'overheated';
      m.color.setHex(burnt ? 0x8a8072 : cold ? 0x9a9da1 : molten ? 0xe8ecf0 : 0xc8ccd0); m.roughness = cold ? 0.75 : burnt ? 0.6 : molten ? 0.08 : 0.22; });
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
    const o = this.obj.iron; if (o.parent !== this.group) this.group.attach(o);
    const d = new THREE.Vector3(-0.62, -Math.sin(0.61), -0.45).normalize(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q); if (up.y < 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), PI));
    o.quaternion.copy(q); o.position.set(p[0] * MM, p[1] * MM, p[2] * MM).addScaledVector(d, -0.155);
  }
  /** The cord from the plug's back, out along the iron, down onto the bench and off its right edge (redrawn when the iron
   *  has moved a millimetre). */
  private drawCable(): void {
    this.obj.iron.updateMatrixWorld(); const from = this.group.worldToLocal(this.obj.iron.localToWorld(new THREE.Vector3(-20.65 * MM, -3.6 * MM, 0)));
    if (from.distanceTo(this.cableFrom) < 0.001) return; this.cableFrom.copy(from);
    const out = this.group.worldToLocal(this.obj.iron.localToWorld(new THREE.Vector3(-60 * MM, -3.6 * MM, 0))), edge = new THREE.Vector3(0.36, 0.002, 0.06), down = new THREE.Vector3(0.375, -0.3, 0.07);
    const mid = out.clone().lerp(edge, 0.5).setY(Math.max(0.002, Math.min(out.y, edge.y) - 0.01));
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([from, out, mid, edge, down]), 48, 2 * MM, 8, false);
    this.cable.geometry.dispose(); this.cable.geometry = g;
  }
  private puff(at: V3): void {
    if (typeof document === 'undefined') return; let p = this.puffs.find((x) => x.t >= 1.6);
    if (!p) { if (this.puffs.length > 24) return; p = { s: new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.35, depthWrite: false })), t: 0 }; this.group.add(p.s); this.puffs.push(p); }
    p.t = 0; p.s.visible = true; p.s.scale.setScalar(0.004); p.s.position.set(at[0] * MM, (at[1] + 2) * MM, at[2] * MM);
  }
  private drawCard(): void {
    const r = readout(this.bench), lines = [`Step ${r.step} of ${r.of}: ${r.do}`, ...(r.check ? [`Done when: ${r.check}`] : []), `Iron: ${r.iron}`, `Wire: ${Math.round(this.bench.wire.out)} mm out`, ...(r.joint ? [r.joint] : []), `${r.good} of 40 good`, ...r.bridges, ...r.last.map((s) => `· ${s}`)], text = lines.join('\n');
    if (text === this.cardText || !this.cardCtx) return; this.cardText = text; const x = this.cardCtx, W = 1024, Hh = 600;
    x.clearRect(0, 0, W, Hh); x.fillStyle = 'rgba(16,20,24,0.88)'; x.beginPath(); x.roundRect(0, 0, W, Hh, 24); x.fill();
    x.fillStyle = '#e8edf2'; x.font = '28px system-ui, sans-serif'; let y = 46;
    for (const l of lines) { for (const w of wrap(x, l, W - 56)) { x.fillText(w, 28, y); y += 36; if (y > Hh - 16) break; } if (y > Hh - 16) break; }
    this.cardTex.needsUpdate = true;
  }
  /** A point on the bench (its mm) where it is in the room (m). */
  world(p: V3): [number, number, number] { this.group.updateMatrixWorld(); const w = this.group.localToWorld(new THREE.Vector3(p[0] * MM, p[1] * MM, p[2] * MM)); return [w.x, w.y, w.z]; }
  /** For tests: the bench run on by `s` seconds of its own time, a sixtieth at a time, whatever the frame rate. */
  advance(s: number): void { for (let t = 0; t < s - 1e-9; t += 1 / 60) this.update(1 / 60); }
  /** For tests: the lesson as it stands. */
  now() { const r = readout(this.bench); return { step: r.step, of: r.of, do: r.do, iron: Math.round(this.bench.iron.T), tinned: this.bench.iron.tinned > 0, good: r.good, graded: r.graded, joint: r.joint, placed: { ...this.bench.placed }, held: { ...this.held }, wire: +this.bench.wire.out.toFixed(1) }; }
  reset(): void { this.bench = newBench(); this.script = { tip: null, wire: null }; for (const k of ['header-a', 'header-b', 'pico'] as const) this.settle(k); this.placeIronInStand(); }
  dispose(): void { for (const v of this.views) v.dispose(); this.group.removeFromParent(); }
}
function wrap(x: CanvasRenderingContext2D, s: string, w: number): string[] {
  const out: string[] = []; let line = '';
  for (const word of s.split(' ')) { const t = line ? `${line} ${word}` : word; if (x.measureText(t).width > w && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line); return out;
}
