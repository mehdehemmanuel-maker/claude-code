// What a thing gives off and what it lets you do (docs/LIFE.md, sections 4 and 5: nodes signature, afford). Read from
// what each part already is (its size, its mass, its material, its colour, whether it is hot, moves, is hinged), never
// tagged by hand, and judged against the body of who is looking: a child and an adult see different things in the same
// room. Every threshold says where it comes from; what is not modelled yet is said, not guessed.

import * as THREE from 'three';
import type { Part } from '../kits';
import { massOfAll } from '../assembly';
import { layout, type Node, type OBB } from '../make/space';

/** A body that looks and acts, its sizes from its stature by the segment proportions of Drillis and Contini (1966), its
 *  strength scaled from an adult's by its mass (an estimate). */
export interface Actor { name: string; height: number; mass: number }
export const ACTORS: Record<string, Actor> = {
  adult: { name: 'an adult', height: 1.75, mass: 75 },
  child: { name: 'a child of 8', height: 1.28, mass: 26 },
};
export const bodyOf = (a: Actor) => ({
  eye: 0.936 * a.height, shoulder: 0.818 * a.height, /** grip reach from the shoulder (arm to the grip's axis) */ reach: 0.39 * a.height,
  /** a seat's height it sits on (the back of its knee), and the step it takes in a stride */ knee: 0.285 * a.height, step: 0.11 * a.height,
  /** the hand: its length, and the bar it closes round (a power grip, 19 to 43 mm for a 190 mm hand: typical of grip studies) */ hand: 0.108 * a.height,
  gripLo: 0.019 * (0.108 * a.height) / 0.19, gripHi: 0.043 * (0.108 * a.height) / 0.19,
  /** the most it lifts often (NIOSH's 23 kg load constant for an adult), and pushes steadily (about 200 N, typical of
   *  Snook and Ciriello's tables), each scaled by its mass for a smaller body (an estimate) */ lift: 23 * a.mass / 75, push: 200 * a.mass / 75,
});

/** The least angle a human eye resolves at good contrast, rad (one arcminute: 20/20 acuity). */
export const ACUITY = (1 / 60) * (Math.PI / 180);
/** The background a sound is heard over, dB(A) (a quiet street, typical), and the level of the background a thing is
 *  seen against (a mid grey, 18 % reflectance). */
export const BACKGROUND_DB = 40, BACKGROUND_LUM = 0.18;
/** What makes sound by itself, its sound power level running, dB(A) (estimates, typical of each). */
const EMITS: [RegExp, number, string][] = [
  [/^engine-ice$/, 100, 'an engine running (about 100 dB(A) of sound power, typical)'],
  [/^starter-motor$/, 95, 'a starter cranking (about 95 dB(A), typical)'],
  [/^(cooling-fan|fan)$/, 70, 'a fan (about 70 dB(A), typical)'],
  [/^(alternator)$/, 75, 'an alternator whining (about 75 dB(A), typical)'],
];
/** What it smells of, by material (a range is not modelled yet: diffusion and wind come with step 2). */
const SMELLS: [RegExp, string][] = [[/^oil$/, 'oil'], [/^glycol-50$/, 'coolant'], [/^acid$/, 'battery acid'], [/^(leather)$/, 'leather'], [/^(rubber|epdm)$/, 'rubber']];
/** Skin's pain threshold for heat, °C (about 43 to 45 °C, typical), and the warmth felt on the skin nearby. */
export const TOO_HOT = 45, WARM = 5;

export type Afford = 'grasp' | 'pinch' | 'lift' | 'push' | 'open' | 'sit' | 'step on' | 'walk on' | 'drive';
export interface Tag {
  part: string; path: string; item?: string;
  /** its size (its box's three sides, m), mass (kg, the part and all it holds), the colour it reflects */ size: [number, number, number]; mass: number;
  /** how far each sense picks it up, m: seen at good light, heard if it makes sound, warmth felt */ seen: number; heard: number; warm: number;
  tags: string[]; affords: Afford[]; why: string[];
}

const lum = (color: number | undefined) => { const c = new THREE.Color(color ?? 0x888888); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };
const flat = (n: Node, axis = 1) => !!n.obb && Math.max(...n.obb.u.map((u, k) => Math.abs(u.getComponent(axis)) * (n.obb!.h[k]! < Math.max(...n.obb!.h) ? 1 : 0))) > Math.cos((10 * Math.PI) / 180);

/** Every identified part of a thing, with what it gives off and what it lets an actor do. */
export function tagsOf(root: Part, actor: Actor = ACTORS.adult!): { tags: Tag[]; counts: Record<string, number>; findings: string[]; sources: string[] } {
  const ns = layout(root), body = bodyOf(actor), ground = Math.min(...ns.map((n) => n.sub?.min.y ?? Infinity).filter(Number.isFinite)), out: Tag[] = [], findings: string[] = [];
  const unitOf = (n: Node): Node => { let u = n; for (let x: Node | null = n; x && x.parent; x = x.parent) if (x.p.item) u = x; return u; };
  // (free: nothing it is in is an identified part, and it is not fixed or joined to anything: a thing on its own, not a
  // piece of an assembly; nothing bolted into a car is lifted)
  // (and in a machine, everything it carries is fixed in it: a machine is what has something that moves on it, a wheel)
  const machine = ns.some((x) => x.p.travel), free0 = (n: Node) => { if (machine || n.p.fixed || n.p.joins?.length) return false; for (let x = n.parent; x; x = x.parent) if (x.p.item) return false; return true; };
  // (a tree whose parts carry names but no inventory ids (what the seeds build): the things are what a set of fittings holds,
  // free to move; a door, a window, a wall, a floor, a roof are built in; the pieces of each thing are tried for what a
  // hand or a body can do with them, not lifted on their own. Read from names, so marked inferred)
  const named = !ns.some((x) => x.p.item), FITTED = /fittings$/i, BUILT = /^(floor|wall( with (door|window))?|roof|ceiling|door|window)$/i;
  const thingOf = (n: Node): Node | null => { for (let x: Node | null = n; x; x = x.parent) if (x.parent && (FITTED.test(x.parent.p.name) || BUILT.test(x.p.name))) return x; return null; };
  const isUnit = (n: Node) => (named ? !!n.parent && (FITTED.test(n.parent.p.name) || (BUILT.test(n.p.name) && (!BUILT.test(n.parent.p.name) || /^(door|window)$/i.test(n.p.name)))) || (!!n.p.shape && !!thingOf(n)) : !!n.p.item);
  const free = (n: Node) => (named ? !!n.parent && FITTED.test(n.parent.p.name) : free0(n));
  if (named) findings.push('no part here carries an inventory id: things are read from their names (what a set of fittings holds is free; walls, floors, doors and windows are built in), inferred');
  // (room over a level top to sit or stand: no drawn piece (its tight covering boxes, not the box round a surface or a
  // group) within so far above its middle)
  const roomAbove = (n: Node, h: number) => { const c = n.sub!.getCenter(new THREE.Vector3()), r = new THREE.Box3(new THREE.Vector3(c.x - 0.1, n.sub!.max.y + 0.01, c.z - 0.1), new THREE.Vector3(c.x + 0.1, n.sub!.max.y + h, c.z + 0.1)); const hit = (b: OBB) => { const e = [0, 1, 2].map((k) => Math.abs(b.u[0].getComponent(k)) * b.h[0] + Math.abs(b.u[1].getComponent(k)) * b.h[1] + Math.abs(b.u[2].getComponent(k)) * b.h[2]); return b.c.x - e[0]! < r.max.x && b.c.x + e[0]! > r.min.x && b.c.y - e[1]! < r.max.y && b.c.y + e[1]! > r.min.y && b.c.z - e[2]! < r.max.z && b.c.z + e[2]! > r.min.z; };
    return !ns.some((x) => x.box && x.p.shape && x !== n && !x.path.startsWith(n.path + '/') && !n.path.startsWith(x.path + '/') && x.box.intersectsBox(r) && x.pieces.some(hit)); };
  const smelt = new Set<string>(); const FLUID = /^(water|glycol-50|oil|acid|air)$/;
  // (a thing that opens: something hinged in it, and something in it to take hold of)
  const hinged = (n: Node) => ns.some((x) => (x === n || x.path.startsWith(n.path + '/')) && (x.p.joint === 'hinge' || /hinge/i.test(`${x.p.name} ${x.p.item ?? ''}`)));
  for (const n of ns) {
    if (!isUnit(n) || !n.sub) continue;
    const s = n.sub.getSize(new THREE.Vector3()), dims = [s.x, s.y, s.z].sort((a, b) => a - b) as [number, number, number], mass = massOfAll(n.p), tags: string[] = [], aff: Afford[] = [], why: string[] = [];
    // (seen: where its size subtends the eye's acuity, less the lower its contrast with a mid-grey background)
    const C = Math.abs(lum(n.p.color) - BACKGROUND_LUM) / BACKGROUND_LUM, seen = Math.sqrt(dims[1] * dims[2]) / ACUITY * Math.min(1, Math.sqrt(Math.max(0.02, C) / 0.3));
    // (heard: what makes sound by itself, where its level falls to the background: Lp = Lw − 20 log r − 11)
    const em = EMITS.find(([re]) => re.test(n.p.item ?? '')), heard = em ? 10 ** ((em[1] - 11 - BACKGROUND_DB) / 20) : 0; if (em) why.push(`heard: ${em[2]}`);
    // (warmth: the rules' fall-off from a hot surface, felt where it is 5 °C over the air)
    const hot = n.p.hot ?? 0, warm = hot > 40 + WARM ? 0.04 * Math.log((hot - 40) / WARM) : 0;
    if (hot > TOO_HOT) tags.push('hot'); if (mass > body.lift) tags.push('heavy'); if (/^(glass|ceramic)$/.test(n.p.mat ?? '')) tags.push('fragile');
    if (n.p.travel || n.p.clear) tags.push('moves'); if (/^battery-sli$/.test(n.p.item ?? '')) tags.push('live (12 V)');
    const sm = SMELLS.find(([re]) => re.test(n.p.mat ?? '')); const sk = sm ? `${unitOf(n).path}|${sm[1]}` : ''; if (sm && !smelt.has(sk)) { tags.push(`smells of ${sm[1]}`); smelt.add(sk); }
    // (a bar the hand closes round: two sides within its grip, the third at least its palm; a small thing pinched)
    if (n.p.shape && dims[0] >= body.gripLo * 0.5 && dims[1] <= body.gripHi && dims[2] >= body.hand * 0.45) { aff.push('grasp'); why.push(`grasp: a bar ${Math.round(dims[1] * 1000)} mm across, in a ${Math.round(body.gripLo * 1000)} to ${Math.round(body.gripHi * 1000)} mm grip`); }
    else if (free(n) && dims[2] <= body.hand * 0.6 && mass <= 2) aff.push('pinch');
    if (free(n) && mass <= body.lift && dims[2] <= 1.2 * actor.height / 1.75) { aff.push('lift'); why.push(`lift: ${mass.toFixed(1)} kg, within ${Math.round(body.lift)} kg`); }
    if (free(n) && mass * 9.81 * 0.5 <= body.push && !aff.includes('lift')) { aff.push('push'); why.push(`push: ${Math.round(mass * 9.81 * 0.5)} N to slide it (friction 0.5, typical), within ${Math.round(body.push)} N`); }
    // (a seat: a level top at the back of its knee, a hand-span or more each way; a step: a level top no higher than a stride's rise)
    const top = n.sub.max.y - ground, seatable = !!n.p.shape && !FLUID.test(n.p.mat ?? '') && hot <= TOO_HOT;
    // (what is made to be sat on but has not the room over it a sitting body needs is said, with the room it has)
    if (seatable && flat(n) && /cushion/i.test(n.p.name) && !/cover|spring/i.test(n.p.name) && top >= body.knee * 0.8 && top <= body.knee * 1.25 && !roomAbove(n, 0.5 * actor.height)) {
      let room = 0.5 * actor.height; for (let h = 0.05; h < 0.5 * actor.height; h += 0.01) if (!roomAbove(n, h)) { room = h - 0.01; break; }
      findings.push(`the ${n.p.name} (${n.path}) is a seat ${Math.round(top * 1000)} mm up with ${Math.round(room * 1000)} mm over it, where ${actor.name} sitting needs about ${Math.round(0.5 * actor.height * 1000)} mm (half their height)`); }
    if (seatable && flat(n) && roomAbove(n, 0.5 * actor.height) && dims[1] >= 0.3 * actor.height / 1.75 && top >= body.knee * 0.8 && top <= body.knee * 1.25) { aff.push('sit'); why.push(`sit: a level top ${Math.round(top * 1000)} mm up, at the back of the knee (${Math.round(body.knee * 1000)} mm)`); }
    else if (seatable && flat(n) && roomAbove(n, actor.height) && dims[1] >= 0.25 && top <= body.step * 1.0 && dims[0] >= 0.02) {
      // (a level top a body fits on: walked on if it is wide and low (a floor), stepped on if not)
      if (dims[1] >= 1 && top <= 0.05) { aff.push('walk on'); why.push(`walk on: level, ${dims[1].toFixed(1)} by ${dims[2].toFixed(1)} m`); } else { aff.push('step on'); why.push(`step on: ${Math.round(top * 1000)} mm up, within a ${Math.round(body.step * 1000)} mm rise`); } }
    out.push({ part: n.p.name, path: n.path, item: n.p.item, size: [s.x, s.y, s.z], mass, seen, heard, warm, tags, affords: aff, why });
  }
  // (what opens: a unit with a hinge and something in it to grasp; what is plainly a door or a lid but has no hinge is said)
  const byPath = new Map(out.map((t) => [t.path, t]));
  for (const n of ns) {
    // (a door, a hood, a lid, a gate, a hatch: what its name says it is, not a piece of one (a door's latch, a hood's hinge))
    if (!/(^|\s)(doors?|hood|lid|deck lid|gate|hatch|cabinet|drawer)(\s*\(.*\))?$/i.test(n.p.name) || /^wall/i.test(n.p.name) || !n.kids.length) continue;
    const handle = out.find((t) => t.path.startsWith(n.path + '/') && t.affords.includes('grasp') && /handle|latch|knob|pull|release/i.test(t.part)), h = hinged(n), t = byPath.get(n.path) ?? byPath.get(unitOf(n).path);
    if (h && handle && t && !t.affords.includes('open')) { t.affords.push('open'); t.why.push(`open: hinged, its ${handle.part} to take hold of`); }
    else if (!h) findings.push(`the ${n.p.name} (${n.path}) has nothing hinged: it cannot open`);
  }
  // (what drives: a seat facing a steering wheel within its reach)
  const wheel = ns.find((n) => /^steering wheel$/i.test(n.p.name)), seat = ns.find((n) => /seat/i.test(n.p.name) && n.sub && wheel?.sub && n.sub.getCenter(new THREE.Vector3()).distanceTo(wheel.sub.getCenter(new THREE.Vector3())) < body.reach + 0.45);
  // (the drive is tagged on what is driven by: the steering wheel, the seat facing it named as why)
  if (wheel && seat) { const top = ns.find((n) => n.depth === 0)!, t = byPath.get(wheel.path); const why = `drive: the ${top.p.name}, its ${seat.p.name} facing its steering wheel within reach`;
    if (t) { t.affords.push('drive'); t.why.push(why); } else out.push({ part: wheel.p.name, path: wheel.path, item: wheel.p.item, size: wheel.sub!.getSize(new THREE.Vector3()).toArray() as [number, number, number], mass: massOfAll(wheel.p), seen: 0, heard: 0, warm: 0, tags: [], affords: ['drive'], why: [why] }); }
  const counts: Record<string, number> = {}; for (const t of out) for (const a of [...t.affords, ...t.tags]) counts[a] = (counts[a] ?? 0) + 1;
  return { tags: out, counts, findings, sources: ['segment proportions: Drillis and Contini (1966)', 'grip 19 to 43 mm, typical of grip studies', 'lift 23 kg: NIOSH lifting equation load constant', 'push 200 N: typical of Snook and Ciriello', 'acuity 1 arcminute (20/20)', 'sound: Lp = Lw − 20 log r − 11, over 40 dB(A) (typical)', 'too hot: 45 °C, the skin\'s pain threshold (typical)'] };
}

/** The tags drawn: each part that affords something outlined in that affordance's colour, a hot one in red. */
export const AFFORD_COLOR: Record<string, number> = { open: 0x3a7bff, grasp: 0x2ecc71, pinch: 0x9be7a8, lift: 0x00c8c8, push: 0x8a8a8a, sit: 0xff8c1a, 'step on': 0xf1c40f, 'walk on': 0x5d6d7e, drive: 0xb04aff, hot: 0xff2a2a };
export function showTags(root: Part, t: Tag[], o: { only?: string[] } = {}): Part {
  const ns = new Map(layout(root).map((n) => [n.path, n])), parts: Part[] = [];
  for (const x of t) {
    const key = [...x.affords, ...(x.tags.includes('hot') ? ['hot'] : [])].find((a) => (!o.only || o.only.includes(a)) && a !== 'pinch' && a !== 'push'); if (!key) continue;
    const n = ns.get(x.path); if (!n?.sub) continue; const c = n.sub.getCenter(new THREE.Vector3()), s = n.sub.getSize(new THREE.Vector3()).addScalar(0.01);
    parts.push({ name: `tag: ${key} (${x.part})`, shape: { box: [s.x, s.y, s.z] }, at: c.toArray() as [number, number, number], color: AFFORD_COLOR[key] ?? 0xffffff, mat: 'glass', finish: 'matte' });
  }
  return { name: 'tags', at: [0, 0, 0], parts, says: `${parts.length} parts outlined by what they afford: open blue, grasp green, lift teal, sit orange, step yellow, drive violet, hot red; a picture, not a thing` };
}
