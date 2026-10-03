// Creatures with bodies. A creature here is not an animation: it is a machine of real parts, joined by real joints,
// moved by real servos that run on a real pack and do what a real controller board tells them down real leads, in the
// same physics as everything else, built through the same construction gate as everything else (one transaction: it
// is all made, or none of it is). What makes it a creature is its body plan (how many segments, how big, what of) and
// the program on its board: like the rhythm generators in an animal's spinal cord, each servo swings on the board's
// clock, a little behind the one before it, so a wave runs down the body.
//
// A swimmer is a chain of flat segments, each hinged to the next by a servo on a side-to-side axis, so its wave runs
// up and down, as a whale's or a dolphin's does. (A body flat from side to side, as most fish are, rolls onto its side
// in the water unless something keeps it upright: a swim bladder above its weight, fins that correct it. Without a
// keel a flat body floating level is the stable one.) The wave runs from head to tail, swinging the tail most; each
// segment, pushed back by the water hardest across its face (resistive force theory, the water drag in the physics
// world), pushes the water back and the body forward. Nothing tells it to go forward: if the water didn't push back
// more across a face than along it, it would only wriggle in place.

import type { DocStore } from '../doc/store';
import type { Quat, Vec3 } from '../doc/types';
import { add, axisAngle, qmul, rotate, sub } from '../doc/math';
import { getMaterial } from '../data/materials';
import { getServo, shaftOf, SHAFT_Q, type ServoData } from '../data/servos';
import { getBattery } from '../data/batteries';
import { packSize } from '../parts/registry';
import { construct, type Solid } from '../construct/build';

export interface BodyPlan {
  name: string;
  /** How many segments, each how long, how wide from side to side and how thick, m, and what of. */
  segments: number;
  length: number;
  span: number;
  thickness: number;
  material: string;
  /** The board's program: its rhythm, Hz, and how many waves fit along the body at once. */
  rhythm: number;
  waves: number;
  /** How far each joint swings, rad: from the neck to the tail. */
  swingHead: number;
  swingTail: number;
  /** Its servos (a datasheet id) and its pack (a cell and how many in series). */
  servo: string;
  cell: string;
  cells: number;
}

/**
 * Swimmers people ask for, as body plans. The body is closed-cell foam (100 kg/m³), as robotic fish are built; the
 * servos, the pack and the board hang under it as a keel, so its weight is below its buoyancy and it rights itself
 * (on top they rolled it over: a flat foam body's metacentre is millimetres above its centre), and it rides awash,
 * about half under. Polyethylene (950 kg/m³, 7% lighter than seawater) cannot carry the electronics at all. Real fish
 * beat their tails at a few hertz with about one wave along the body (Lighthill, Mathematics of Biofluiddynamics,
 * SIAM 1975; Videler, Fish Swimming, Chapman & Hall 1993).
 */
export const SWIMMERS: Record<string, BodyPlan> = {
  whale: { name: 'a swimmer shaped like a small whale', segments: 5, length: 0.1, span: 0.08, thickness: 0.02, material: 'foam.eva', rhythm: 1.5, waves: 1, swingHead: 0.12, swingTail: 0.6, servo: 'servo.standard-20kg', cell: 'battery.nimh.aa', cells: 4 },
  eel: { name: 'an eel-like swimmer', segments: 8, length: 0.08, span: 0.04, thickness: 0.02, material: 'foam.eva', rhythm: 1.2, waves: 1.5, swingHead: 0.25, swingTail: 0.45, servo: 'servo.micro-9g', cell: 'battery.nimh.aaa', cells: 3 },
};

/** The swimmer a request names, or null. */
export function swimmerFromWords(text: string): BodyPlan | null {
  const t = text.toLowerCase();
  if (/\b(eels?|snakes?|sea snakes?)\b/.test(t)) return SWIMMERS['eel']!;
  if (/\b(fish|fishes|shark|whales?|dolphins?|swimmer|tuna|salmon|koi|leviathans?)\b/.test(t)) return SWIMMERS['whale']!;
  return null;
}

const IDENTITY: Quat = [0, 0, 0, 1];
const yaw = (a: number): Quat => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
/** Half turns about each axis. */
const FLIP_X: Quat = axisAngle([1, 0, 0], Math.PI);
const FLIP_Y: Quat = axisAngle([0, 1, 0], Math.PI);
const FLIP_Z: Quat = axisAngle([0, 0, 1], Math.PI);
/** A servo horn's thickness between the shaft face and what it carries, m (estimate: the common nylon horn). */
const HORN = 0.003;
/** The glue line or strap between a servo case and what it is mounted on, m (estimate). */
const STRAP = 0.001;
const mm = (m: number) => `${Math.round(m * 1000)} mm`;

/**
 * A servo loop driven at a rhythm answers late and a little short, by the second-order response at r = 2 pi f / w_n
 * on the inertia it turns (servoLoop: stiffness stall torque over band, critically damped): a lag of atan2(2 r, 1 - r²)
 * and a gain of 1 / sqrt((1 - r²)² + (2 r)²). A board's program sends each servo its command that much early and that
 * much larger (within the travel), so the body moves with the phasing the design is for, as a rhythm generator grown
 * onto a body is. Without it joints on different inertias lag by different amounts and a gait's timing drifts.
 */
function response(sv: ServoData, inertia: number, rhythm: number) {
  const wn = Math.sqrt(sv.stallTorque / sv.band / inertia), r = (2 * Math.PI * rhythm) / wn;
  return { lag: Math.atan2(2 * r, 1 - r * r), gain: 1 / Math.hypot(1 - r * r, 2 * r) };
}

export interface Swimmer {
  parts: string[];
  joints: string[];
  head: string;
  servos: string[];
  board: string;
  pack: string;
}

/**
 * Build a swimmer into a document: its head at `at`, facing `heading` (rad about up, 0 facing +x). Its segments are
 * flat foam plates with a servo in each gap between two of them, in the body's own plane: the case is screwed by its
 * end to the plate ahead, lying along the body with its shaft on its side face pointing sideways near the plate
 * behind, which reaches the horn by a short bracket screwed to its front. So each joint turns about a side-to-side
 * axis through the body's middle, as a whale's spine does. The pack and the board hang under the first plates, and
 * steel rails under both edges ballast it to ride nine tenths under, its weight below its buoyancy. Every servo is
 * wired to the pack and led from the board.
 */
export function buildSwimmer(store: DocStore, plan: BodyPlan, at: Vec3, heading = 0, tag = 'fish'): Swimmer {
  const sv = getServo(plan.servo), [l, w, h] = sv.dims;
  const { length: L, span, thickness: t } = plan;
  const s = 0.008, CLEAR = 0.001, GAP = l + 2 * CLEAR + s;
  const bar = 'polymer.pla';
  const packSpec = { model: plan.cell, series: plan.cells, parallel: 1, charge: 1 };
  // ballast: steel rails along both edges under each segment, sized so the body rides nine tenths under (the water
  // it displaces at that depth, less what the foam, the servos, the brackets, the pack and the board weigh)
  const bracket = 1250 * s * t * (sv.shaftFromEnd + CLEAR + s / 2 + span);
  const carried = 0.9 * plan.segments * L * span * t * 1025 + (plan.segments - 1) * l * w * h * 1025;
  const weighs = plan.segments * L * span * t * getMaterial(plan.material).density + (plan.segments - 1) * (sv.mass + bracket) + getBattery(plan.cell).mass * plan.cells + 0.008;
  // the rails go under every plate but the two carrying the pack and the board
  const railed = Math.max(0, plan.segments - 2);
  const RAIL = 0.005, railZ = railed ? Math.min(0.2 * span, Math.max(0, carried - weighs) / (2 * railed * L * RAIL * 7850)) : 0;
  return construct(store, `Build ${plan.name}`, at, yaw(heading), tag, (b) => {
    const plates: Solid[] = [], servos: string[] = [];
    const x = (k: number) => -(k + 0.5) * L - k * GAP;
    for (let k = 0; k < plan.segments; k++) {
      const plate = b.place('plate', [x(k), 0, 0], IDENTITY, { length: L, width: span, thickness: t }, k === 0 ? 'head' : k === plan.segments - 1 ? 'tail' : `body${k}`, { material: plan.material });
      plates.push(plate);
      if (railZ < 0.005 || k < 2) continue;
      for (const side of [-1, 1]) {
        const rail = b.place('block', [x(k), -t / 2 - RAIL / 2, side * (span / 2 - railZ / 2)], IDENTITY, { x: L, y: RAIL, z: railZ }, `rail${k}${side < 0 ? 'l' : 'r'}`, { material: 'steel.a36' });
        plate.fasten({ thin: t, at: [0, -t / 2, side * (span / 2 - railZ / 2)] }, rail, { thin: RAIL, at: [0, RAIL / 2, 0] }, [L, railZ]);
      }
    }
    // the pack under the head plate, the board under the one behind it, each screwed up into the foam
    const packParams = packSpec;
    const ps = packSize(packParams);
    const packAt: Vec3 = [x(0), -t / 2 - ps[1] / 2, 0];
    const pack = b.place('battery', packAt, IDENTITY, packParams, 'pack');
    plates[0]!.fasten({ thin: t, at: [0, -t / 2, 0] }, pack, { thin: ps[1], at: [0, ps[1] / 2, 0] }, [ps[0], ps[2]]);
    const kb = Math.min(1, plan.segments - 1);
    const boardAt: Vec3 = [x(kb), -t / 2 - 0.003, 0];
    const board = b.place('controller', boardAt, IDENTITY, { rhythm: plan.rhythm }, 'board');
    plates[kb]!.fasten({ thin: t, at: [0, -t / 2, 0] }, board, { thin: 0.006, at: [0, 0.003, 0] }, [0.04, 0.025]);
    pack.wire(board);
    const lag = (2 * Math.PI * plan.waves) / Math.max(1, plan.segments - 1);
    for (let k = 0; k + 1 < plan.segments; k++) {
      // the servo in the gap behind plate k, turned half round: its end against the plate's rear face, its shaft
      // near the plate behind, its shaft face to −z
      const e = x(k) - L / 2;
      const q = FLIP_Y;
      const caseAt: Vec3 = [e - CLEAR - l / 2, 0, 0];
      const servo = b.place('servo', caseAt, q, { model: sv.id }, `servo${k}`);
      servos.push(servo.id);
      plates[k]!.fasten({ thin: t, at: [-L / 2, 0, 0] }, servo, { thin: l, at: [-l / 2, 0, 0] }, [w, h]);
      const shaft = add(caseAt, rotate(q, servo.shaft.p));
      // the bracket: a strip glued across the whole front face of plate k+1 (an 8 mm patch of glue on foam tore off
      // under the servo), and an arm from the strip's side forward along the shaft face to the horn
      const front = x(k + 1) + L / 2;
      const strip = b.place('block', [front + s / 2, 0, 0], IDENTITY, { x: s, y: t, z: span }, `strip${k}`, { material: bar });
      plates[k + 1]!.fasten({ thin: t, at: [L / 2, 0, 0] }, strip, { thin: s, at: [-s / 2, 0, 0] }, [t, span]);
      const barL = shaft[0] - (front + s) + s / 2;
      const barAt: Vec3 = [front + s + 0.0001 + barL / 2, 0, shaft[2] - sv.horn - s / 2];
      // (the arm is the plate's full thickness tall: an 8 mm bar glued by its end snapped at the glue line)
      const arm = b.place('block', barAt, IDENTITY, { x: barL, y: t, z: s }, `bracket${k}`, { material: bar });
      strip.fasten({ thin: s, at: [s / 2, 0, barAt[2]] }, arm, { thin: barL, at: [-barL / 2, 0, 0] }, [s, t]);
      // the horn: on the shaft, and on the bracket where the shaft is
      servo.horn(arm);
      pack.wire(servo);
      // the program for this joint: a swing growing toward the tail, lagging down the body (the loop's lag in water
      // is the water's, not the inertia's, and is not corrected for). The hinge axis is −z here (the case is turned
      // round), so the sign is kept for the wave's direction.
      const frac = plan.segments > 2 ? k / (plan.segments - 2) : 1;
      const swing = plan.swingHead + (plan.swingTail - plan.swingHead) * frac;
      board.lead_(servo, { swing: -Math.min(sv.travel, swing), phase: -lag * k, wave: 'sine' });
    }
    return { parts: b.parts, joints: b.joints, head: plates[0]!.id, servos, board: board.id, pack: pack.id };
  });
}

// ---------------------------------------------------------------------------------------------------------------
// Walkers. A walker is a deck on four legs, each a thigh and a shank of printed plastic on two servos (a hip under the
// deck's edge that swings the leg, a knee strapped to the thigh that folds it), with a rubber foot; a pack and a
// controller board ride on the deck, every servo wired to the pack and led from the board. The board's program
// swings each hip in its gait's phase and folds each knee a quarter cycle ahead, most at mid-swing and straight at
// mid-stance, so the foot is lifted as it comes forward and planted as it goes back. Nothing tells it to go forward:
// a foot planted and pushed back, held by friction, pushes the body on; without friction, or with the knees still, it
// paddles in place.

/** Gaits as each leg's place in the cycle (fractions of a stride): Hildebrand, Symmetrical gaits of horses, Science 150 (1965). */
export const GAITS: Record<string, { name: string; LF: number; RF: number; LH: number; RH: number }> = {
  trot: { name: 'a trot (diagonal legs together)', LF: 0, RH: 0, RF: 0.5, LH: 0.5 },
  walk: { name: 'a walk (one foot at a time, hind then fore on each side)', LH: 0, LF: 0.25, RH: 0.5, RF: 0.75 },
  pace: { name: 'a pace (legs on each side together)', LF: 0, LH: 0, RF: 0.5, RH: 0.5 },
  bound: { name: 'a bound (fore legs, then hind)', LF: 0, RF: 0, LH: 0.5, RH: 0.5 },
};

export interface WalkerPlan {
  name: string;
  /** Its deck: a plate, m, and what of. */
  body: { length: number; width: number; thickness: number; material: string };
  /** Each leg: thigh and shank lengths, the square bar they are of, and what of; its foot. */
  thigh: number;
  shank: number;
  bar: number;
  legMaterial: string;
  foot: { diameter: number; material: string };
  /** Its servos (a datasheet id) and its pack (a cell and how many in series). */
  servo: string;
  cell: string;
  cells: number;
  /** The board's program: its rhythm, Hz; how far each hip swings and each knee folds, rad; its gait. */
  rhythm: number;
  swing: number;
  lift: number;
  gait: keyof typeof GAITS;
}

/** What a walker is, from its plan: its bill of materials, not a word for what it resembles. */
export function describeWalker(plan: WalkerPlan): string {
  const sv = getServo(plan.servo), cell = getBattery(plan.cell);
  const legs = plan.thigh + plan.shank > 0.12 ? 'long-legged' : 'small';
  const [svKind, svClass] = sv.label.split(' (')[0]!.toLowerCase().split(', ');
  return `a ${legs} four-legged robot walker of a ${mm(plan.body.length)} × ${mm(plan.body.width)} ${getMaterial(plan.body.material).name.toLowerCase()} deck, eight ${svKind}s (${svClass}), a controller board and a ${plan.cells}-cell ${cell.label.split(',')[0]!.toLowerCase()} pack, ${getMaterial(plan.legMaterial).name.toLowerCase()} bar legs on ${getMaterial(plan.foot.material).name.toLowerCase().split(' /')[0]} feet`;
}

/** Walkers people ask for: small robot animals of plywood, printed plastic and hobby servos, as people build. */
export const WALKERS: Record<string, WalkerPlan> = {
  dog: {
    // a stance as wide as its legs are long: narrower, a shove sideways rolls it over (one in five at 0.06 N s); a
    // 48 g pack of AAA cells: with 120 g of AA cells its 9 g servos could not hold a trot and it fell on its back
    name: '', body: { length: 0.2, width: 0.16, thickness: 0.01, material: 'wood.birch-plywood' },
    thigh: 0.05, shank: 0.05, bar: 0.008, legMaterial: 'polymer.pla', foot: { diameter: 0.012, material: 'rubber.natural' },
    servo: 'servo.micro-9g', cell: 'battery.nimh.aaa', cells: 4, rhythm: 2.5, swing: 0.45, lift: 0.6, gait: 'walk',
  },
  deer: {
    // long legs carry its body higher over the same feet: it needs a wider stance not to roll over in a trot
    name: '', body: { length: 0.22, width: 0.16, thickness: 0.01, material: 'wood.birch-plywood' },
    thigh: 0.07, shank: 0.07, bar: 0.008, legMaterial: 'polymer.pla', foot: { diameter: 0.012, material: 'rubber.natural' },
    servo: 'servo.micro-9g', cell: 'battery.nimh.aaa', cells: 4, rhythm: 1.6, swing: 0.4, lift: 0.55, gait: 'trot',
  },
};
for (const plan of Object.values(WALKERS)) plan.name = describeWalker(plan);

/** The walker a request names, or null. */
export function walkerFromWords(text: string): WalkerPlan | null {
  const t = text.toLowerCase();
  if (/\b(deer|fawns?|stags?|does|elk|antelopes?|gazelles?|horses?|ponies|pony|goats?|giraffes?)\b/.test(t)) return WALKERS['deer']!;
  if (/\b(dogs?|pupp(y|ies)|cats?|kittens?|foxe?s?|wolf|wolves|robot dog|quadrupeds?|walkers?|pets?|animals?|creatures?)\b/.test(t)) return WALKERS['dog']!;
  return null;
}

export interface Walker {
  parts: string[];
  joints: string[];
  /** Its deck, and the hip horns on each side (what steering shortens). */
  body: string;
  left: string[];
  right: string[];
  /** Every servo horn, hips and knees. */
  servos: string[];
  board: string;
  pack: string;
}

/**
 * Build a walker into a document, its feet on the ground at `at` (the ground's height there), facing `heading` (rad
 * about up, 0 facing +x). Facing +x, its left is −z. Each hip servo lies under the deck's edge, its shaft face flush
 * with the edge and pointing outward; the thigh hangs from its horn. Each knee servo is strapped to the thigh's outer
 * face, lying along it, shaft face outward near the thigh's lower end; the shank hangs from that horn. So every joint
 * is on the servo that drives it, the leg steps outward at each stage as a real stacked leg does, and the rubber foot
 * sits on the shank's end. The pack and the board are screwed to the deck's top; nine wires and eight leads run from them.
 */
export function buildWalker(store: DocStore, plan: WalkerPlan, at: Vec3, heading = 0, tag = 'dog'): Walker {
  const sv = getServo(plan.servo), [l, w, h] = sv.dims;
  const { length: L, width: W, thickness: t } = plan.body;
  const s = plan.bar, r = plan.foot.diameter / 2;
  const y0 = 2 * r + plan.shank + plan.thigh + w / 2 + STRAP + t / 2 + 0.002;
  const gait = GAITS[plan.gait]!;
  const density = (m: string) => getMaterial(m).density;
  const mThigh = density(plan.legMaterial) * s * plan.thigh * s, mShank = density(plan.legMaterial) * s * plan.shank * s;
  const mFoot = density(plan.foot.material) * (4 / 3) * Math.PI * r ** 3;
  const iHip = sv.rotor + mThigh * (plan.thigh / 2) ** 2 + sv.mass * plan.thigh ** 2 + mShank * (plan.thigh + plan.shank / 2) ** 2 + mFoot * (plan.thigh + plan.shank) ** 2;
  const iKnee = sv.rotor + mShank * (plan.shank / 2) ** 2 + mFoot * plan.shank ** 2;
  return construct(store, `Build ${plan.name}`, at, yaw(heading), tag, (b) => {
    const body = b.place('plate', [0, y0, 0], IDENTITY, { length: L, width: W, thickness: t }, 'body', { material: plan.body.material });
    const left: string[] = [], right: string[] = [], servos: string[] = [];
    // the pack and the board hang under the deck between the hips, where their weight keeps it low: a walker that
    // carried them on top rolled over when shoved (its centre of mass 3 cm higher)
    const packParams = { model: plan.cell, series: plan.cells, parallel: 1, charge: 1 };
    const ps = packSize(packParams);
    const packAt: Vec3 = [-0.004 - ps[0] / 2, y0 - t / 2 - ps[1] / 2, 0];
    const pack = b.place('battery', packAt, IDENTITY, packParams, 'pack');
    body.fasten({ thin: t, at: [packAt[0], -t / 2, 0] }, pack, { thin: ps[1], at: [0, ps[1] / 2, 0] }, [ps[0], ps[2]], 'screwed');
    const boardAt: Vec3 = [0.004 + 0.02, y0 - t / 2 - 0.003, 0];
    const board = b.place('controller', boardAt, IDENTITY, { rhythm: plan.rhythm }, 'board');
    body.fasten({ thin: t, at: [boardAt[0], -t / 2, 0] }, board, { thin: 0.006, at: [0, 0.003, 0] }, [0.04, 0.025], 'screwed');
    pack.wire(board);
    const legs: ['LF' | 'RF' | 'LH' | 'RH', number, number][] = [['LF', 1, -1], ['RF', 1, 1], ['LH', -1, -1], ['RH', -1, 1]];
    const conj = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]];
    for (const [leg, fx, side] of legs) {
      const hx = fx * L * 0.4, name = leg.toLowerCase();
      // the hip case: shaft face outward (±z), shaft toward the leg's own end of the deck, width (its 12 mm) vertical
      const qHip: Quat = side > 0 ? (fx > 0 ? IDENTITY : FLIP_Z) : (fx > 0 ? FLIP_X : FLIP_Y);
      const hipShaft: Vec3 = [hx, y0 - t / 2 - STRAP - w / 2, side * W / 2];
      const hipAt = sub(hipShaft, rotate(qHip, shaftOf(sv).p));
      const hip = b.place('servo', hipAt, qHip, { model: sv.id }, `${name}-hip-servo`);
      body.fasten({ thin: t, at: [hipAt[0], -t / 2, hipAt[2]] }, hip, { thin: w, at: rotate(conj(qHip), [0, w / 2, 0]) }, [l, h], 'screwed');
      // the thigh hangs from the hip horn, a horn's thickness off the shaft face
      const thighZ = side * (W / 2 + HORN + s / 2);
      const thighAt: Vec3 = [hx, hipShaft[1] - plan.thigh / 2, thighZ];
      const thigh = b.place('block', thighAt, IDENTITY, { x: s, y: plan.thigh, z: s }, `${name}-thigh`, { material: plan.legMaterial });
      const hipHorn = hip.horn(thigh, { p: sub(hipShaft, thighAt), q: qmul(qHip, SHAFT_Q) });
      // the knee case lies along the thigh's outer face, shaft face outward, shaft at the thigh's lower end
      const qKnee: Quat = side > 0 ? axisAngle([0, 0, 1], -Math.PI / 2) : qmul(FLIP_Y, axisAngle([0, 0, 1], -Math.PI / 2));
      const kneeShaft: Vec3 = [hx, hipShaft[1] - plan.thigh, thighZ + side * (s / 2 + STRAP + h)];
      const kneeAt = sub(kneeShaft, rotate(qKnee, shaftOf(sv).p));
      const knee = b.place('servo', kneeAt, qKnee, { model: sv.id }, `${name}-knee-servo`);
      thigh.fasten({ thin: s, at: [0, kneeAt[1] - thighAt[1], side * s / 2] }, knee, { thin: w, at: rotate(conj(qKnee), [0, 0, -side * h / 2]) }, [w, l], 'screwed');
      const shankZ = kneeShaft[2] + side * (HORN + s / 2);
      const shankAt: Vec3 = [hx, kneeShaft[1] - plan.shank / 2, shankZ];
      const shank = b.place('block', shankAt, IDENTITY, { x: s, y: plan.shank, z: s }, `${name}-shank`, { material: plan.legMaterial });
      const kneeHorn = knee.horn(shank, { p: sub(kneeShaft, shankAt), q: qmul(qKnee, SHAFT_Q) });
      const foot = b.place('sphere', [hx, kneeShaft[1] - plan.shank - r, shankZ], IDENTITY, { diameter: plan.foot.diameter }, `${name}-foot`, { material: plan.foot.material });
      shank.fasten({ thin: s, at: [0, -plan.shank / 2, 0] }, foot, { thin: plan.foot.diameter, at: [0, r, 0] }, [s, s]);
      // power to both servos, and the program to both: the hip swings the leg in its gait's phase; the knee folds it,
      // by up to `lift`, only while it comes forward (a quarter cycle ahead, so most at mid-swing), and is straight
      // the whole time it bears weight. Each hinge's axis is ±z by side, so the swing's sign follows the side.
      pack.wire(hip);
      pack.wire(knee);
      const phase = 2 * Math.PI * gait[leg];
      const rh = response(sv, iHip, plan.rhythm), rk = response(sv, iKnee, plan.rhythm);
      board.lead_(hip, { swing: side * Math.min(sv.travel, plan.swing / rh.gain), phase: phase + rh.lag, wave: 'sine' });
      board.lead_(knee, { swing: side * Math.min(sv.travel, plan.lift / rk.gain), phase: phase + Math.PI / 2 + rk.lag, wave: 'lift' });
      servos.push(hipHorn, kneeHorn);
      (side < 0 ? left : right).push(hipHorn);
    }
    return { parts: b.parts, joints: b.joints, body: body.id, left, right, servos, board: board.id, pack: pack.id };
  });
}
