// A soldering lesson done by hand, as it is done at a real bench: the Pico's two headers pushed into a breadboard, the
// Pico laid on them, the iron heated and its tip tinned, then each of its 40 joints heated with the tip and fed solder
// from the wire in the other hand, each judged as it is made (src/nexus/solder-joint.ts), and every step of the
// lessons it follows (src/nexus/lessons.ts: 'solder-joint' and 'solder-headers') done only when the hands have done it.
// Nothing here draws: the room (src/nexus/view/solder-bench.ts) says where the tip and the wire's end are, and what was
// let go where; this says what that did. A figure not from a source is an estimate and said so.
// Frame: millimetres on the bench, its origin the breadboard's middle on the bench's top, y up, x along the
// breadboard's columns, z across them (its row a toward +z).
// Owner of: a hands-on lesson's state, its steps and their checks, and what the hands' moves do to the joints.

import { BB, HANDS } from './kit-solder';
import { LEADED_TIP, LESSONS, PROTO_BUILD } from './lessons';
import { ledCurrent, lessonOf, PROTRUSION, type EdgeKind } from './edges';
import { PICO_PIN_NAMES } from './sbc';
import { ALLOYS, freshJoint, grade, idealVolume, PICO_PIN, step, timeToMelt, type Grade, type JointShape, type JointState } from './solder-joint';

export type V3 = [number, number, number];

// ---- the bench's layout -----------------------------------------------------------------------------------------------
/** Where things stand on the bench, mm: the breadboard (BB400, its top 8.5 up); the headers, long pins down, in its
 *  rows c and h (17.78 apart, as the Pico's rows are), columns 6–25, their strips 2.54 tall on its top; the Pico on
 *  them, its USB end toward column 1, its board 1.0 thick, so its pads' tops are 12.04 up and the headers' tails stand
 *  2.0 above them (a Würth header's 3.0 mm tail less the board). */
export const LAYOUT = {
  board: { top: BB.H }, headerRows: [8.89, -8.89] as const, strip: 2.54, picoBottom: BB.H + 2.54, picoTop: BB.H + 2.54 + PICO_PIN.board,
  /** where each thing waits before it is placed: the headers and the Pico on the bench beside the breadboard */
  tray: { 'header-a': [0, 0, 48] as V3, 'header-b': [0, 0, 58] as V3, pico: [0, 0, -52] as V3 },
};
/** A Pico's pin n (1–40) on the bench: pins 1–20 down the row toward +z from its USB end, 21–40 back up the other. */
export function pinAt(n: number): V3 { const k = n <= 20 ? n - 1 : 40 - n; return [-24.13 + k * 2.54, LAYOUT.picoTop, n <= 20 ? LAYOUT.headerRows[0] : LAYOUT.headerRows[1]]; }
/** Where the tip meets a joint to heat it: the pad and the pin together, a little up the pin. */
export const jointPoint = (n: number): V3 => { const p = pinAt(n); return [p[0], p[1] + 0.4, p[2]]; };

/** The second lesson's bench, mm: the Perma-Proto lying face up before you while its parts go in (clear of the iron's
 *  stand to its right), the helping hands behind it; each part's holes in the board's own frame (x along its columns, z across its rows, row a
 *  toward +z): the resistor's in row c, columns 5 and 9 (10.16 apart: four holes, the span a 1/4 W body's leads bend
 *  to); the LED's anode in column 9, row a (the resistor's strip), its cathode in the − rail beside it (5.08 out: its
 *  legs spread a little); a link from column 5, row a, to the + rail. So the + rail feeds the link, the link column
 *  5's strip, the resistor column 9's, and that the LED to the − rail. The + rail on that side is the outer one, so
 *  the link crosses the − rail's pads: it is hook-up wire, its insulation over them (bare wire there would join + to
 *  −). In the hands the board is upside down by its ends: a hole at (x, z) is at the hands' hold plus (x, 0.8, -z),
 *  its underside 0.8 above the hold's middle. */
export const PROTO = {
  at: [50, 0, 45] as V3, hands: [50, 0, -55] as V3,
  /** where each thing's leads go: the lesson's build's (src/nexus/lessons.ts), so the bench and the words agree */
  seats: Object.fromEntries(PROTO_BUILD.things.map((t) => [t.id, t.leads.map((l) => l.at)])) as Record<Part, [number, number][]>,
  /** each lead, mm out of the underside once it is in (estimates: a 1/4 W resistor's 28 mm leads less their bend down
   *  to the holes and the board, about 23; the LED's 27 and 25 mm legs less its rim 3 mm off the board, their spread and
   *  the board, 22 and 20; a link's stripped ends 4; the battery holder's crimped pins 6 long, less the board) */ out: { resistor: [23, 23], led: [22, 20], link: [4, 4], battery: [4.4, 4.4] } as Record<Part, number[]>,
  /** each lead bent out under the board so the part stays when it is turned over (the lesson's step), rad from upright,
   *  away from its part's middle (Adafruit's guide says to bend them out; the angle an estimate) */ splay: 0.52,
  /** the link: Adafruit's 22 AWG solid hook-up wire (its 1311), UL1007, 1.5 mm over its insulation (its listing), its
   *  copper 0.644 (22 AWG), stripped 6 mm at each end (estimate) */ wire: { od: 1.5, cu: 0.644, strip: 6 },
};
/** Which way a lead of the Perma-Proto stands out of its pad while the board is in the hands: bent out by PROTO.splay
 *  from upright, away from its part's middle along the line of its holes (the board's x, z turned over: z the other way). */
export function splayOf(k: 'resistor' | 'led' | 'link', x: number, z: number): V3 {
  const s = PROTO.seats[k], mx = (s[0]![0] + s[1]![0]) / 2, mz = (s[0]![1] + s[1]![1]) / 2, dx = x - mx, dz = z - mz, l = Math.hypot(dx, dz) || 1, a = PROTO.splay;
  return [(dx / l) * Math.sin(a), Math.cos(a), (-dz / l) * Math.sin(a)];
}
/** A point t mm along a joint's lead from its pad's face, on the bench. */
export const leadAt = (q: BenchJoint, t: number): V3 => [q.at[0] + q.dir[0] * t, q.at[1] - 0.4 + q.dir[1] * t, q.at[2] + q.dir[2] * t];
/** Where the hands hold the board's middle, on the bench. */
export const protoHold = (): V3 => [PROTO.hands[0], HANDS.hold.y, PROTO.hands[2] + 20];
/** A hole of the board (its own x, z) on the bench while the hands hold it upside down: its pad's face, upward. */
export const protoHole = (x: number, z: number): V3 => { const h = protoHold(); return [h[0] + x, h[1] + 0.8, h[2] - z]; };
/** The Perma-Proto's holes and the leads through them: 1.6 mm FR-4, 1.2 mm holes in 1.93 mm pads (its board file); a
 *  1/4 W resistor's leads and a link of 22 AWG tinned copper 0.6 mm round, a 5 mm LED's legs 0.5 mm square (typical). */
export const PROTO_LEAD: JointShape = { board: 1.6, hole: 1.2, pad: 1.9304, pin: 0.6, round: true, src: 'Adafruit Perma-Proto board file: 1.2 mm drill, 1.93 mm pads, 1.6 mm FR-4; a 0.6 mm lead (typical of 1/4 W resistors and 22 AWG)' };
export const PROTO_LEG: JointShape = { board: 1.6, hole: 1.2, pad: 1.9304, pin: 0.5, src: 'Adafruit Perma-Proto board file; a 5 mm LED\'s 0.5 mm square leg (typical)' };
/** The battery holder's leads end in crimped pins, 0.64 mm square (typical of the "premium" ends Adafruit's 3951 has
 *  had since 2022, its listing: for breadboards), in the Perma-Proto's holes. */
export const PROTO_PIN: JointShape = { board: 1.6, hole: 1.2, pad: 1.9304, pin: 0.64, src: 'Adafruit Perma-Proto board file; a 0.64 mm square crimped pin (typical)' };
/** The lesson's power: its build's (src/nexus/lessons.ts: Adafruit's 3951 holder, two fresh AAs, the 330 Ω, its red
 *  LED's drop), the current from it by the edges' own figure (src/nexus/edges.ts). */
export const POWER = PROTO_BUILD.power!;
export const PROTO_WIRE: JointShape = { board: 1.6, hole: 1.2, pad: 1.9304, pin: 0.644, round: true, src: 'Adafruit Perma-Proto board file; 22 AWG solid copper, 0.644 mm' };
/** A trimmed lead's good height over its pad, mm: the edges' (IPC-A-610's lead protrusion, class 2: its end in sight
 *  in the solder, at most 2.5 standing; below the fillet's top, about 0.6 here, the cutters bite the solder). */
export const TRIM = PROTRUSION;

// ---- how the hands work on it (estimates, each said) -------------------------------------------------------------------
export const HAND = {
  /** the tip touches a joint within this of its point, mm (a B2 cone's working face about 1 mm across, against a 1.7 mm
   *  pad and its pin: an estimate) */ touch: 1.2,
  /** the wire's end reaches a joint, or the tip, within this, mm (estimate) */ reach: 1.2,
  /** 0.5 mm wire melts as fast as a hand pushes it in: about 4 mm a second (estimate) */ feedMm: 4,
  /** the wire's diameter, mm (Adafruit's reel 1886, Atten's TS-635050: 0.5 mm, 63/37, its listing) */ wire: 0.5,
  /** the flush cutters' jaws, mm (Hakko's CHP-170: 8 long, its listing); a lead within this of a jaw's edge is between
   *  them (estimate: the open jaws' gap near the tip) */ jaw: 8, bite: 1.2,
  /** what the tip carries away from a joint with too much on it, mm³/s, and holds before it must be wiped (estimates) */ wick: 0.6, holds: 0.5,
  /** how long a tip stays tinned hot with no fresh solder on it before it dulls, s (estimate: the guides' "re-tin
   *  often") */ tinLasts: 60,
  /** a joint so full it runs into its neighbour, its share of a good joint, or two neighbours' together (estimate:
   *  the gap between 1.7 mm pads at 2.54 is 0.84 mm) */ bridgeOne: 2.4, bridgeTwo: 3.6,
  /** the iron's set temperature, °C, and how fast it heats, its time constant, s (the joint lesson's 330 for leaded
   *  solder; PINE64 publishes no heat-up time, so an estimate: about 7 s to 300 °C) */ set: LEADED_TIP, tau: 3,
} as const;
const mm3PerMm = (Math.PI / 4) * HAND.wire * HAND.wire;
/** The lesson's solder: the reel the build pack buys, 63/37 since 2019 (Adafruit's listing), melting at 183 °C at once. */
export const ALLOY = ALLOYS.Sn63Pb37!;

// ---- the lesson's state ------------------------------------------------------------------------------------------------
/** A joint of the lesson: its number and name, where the tip meets it (bench mm), its hole's shape, the lead standing
 *  out of it, mm along it (0 where there is nothing to trim: a header's tail), which way it stands out of its pad (a
 *  unit vector, the bench's frame while the board is in place), and the part it is a lead of. */
export interface BenchJoint { pin: number; name: string; j: JointState; at: V3; shape: JointShape; lead: number; dir: V3; part?: Part }
/** A part of the Perma-Proto lesson that goes into the board. */
export type Part = 'resistor' | 'led' | 'link' | 'battery';
export type Thing = 'header-a' | 'header-b' | 'pico' | 'iron' | 'solder' | 'proto' | 'resistor' | 'led' | 'link' | 'battery' | 'cutters';
export type PlanId = 'pico' | 'proto';
export interface Bench {
  t: number;
  /** which lesson's bench: the Pico's headers, or the Perma-Proto's LED */ plan: PlanId;
  /** what is in its place: each header in its row, the Pico on them (or the Perma-Proto's parts in their holes, the
   *  board in the hands); the row (z, mm) each header is in */ placed: Record<string, boolean>; seat: { 'header-a'?: number; 'header-b'?: number };
  iron: { T: number; set: number; inHand: boolean; tinned: number; load: number; wiped: number };
  /** the wire: how far it stands out past the fingers, mm, and how much has been used, mm³ */ wire: { out: number; used: number; inHand: boolean };
  joints: BenchJoint[];
  /** the step of the lesson now (STEPS) */ step: number;
  /** what has happened, newest last, for the readout */ log: string[];
  /** the pin the tip is on now, else the nearest it was on */ at: number | null;
  /** the battery holder's knife switch closed */ on: boolean;
}
export function newBench(plan: PlanId = 'pico'): Bench {
  const joints: BenchJoint[] = plan === 'pico' ? Array.from({ length: 40 }, (_, i) => ({ pin: i + 1, name: PICO_PIN_NAMES[i]!, j: freshJoint(), at: jointPoint(i + 1), shape: PICO_PIN, lead: 0, dir: [0, 1, 0] as V3 }))
    : (['resistor', 'led', 'link', 'battery'] as const).flatMap((k) => PROTO.seats[k].map(([x, z], i) => ({ k, i, x, z }))).map(({ k, i, x, z }, n): BenchJoint => { const h = protoHole(x, z), dir: V3 = k === 'battery' ? [0, 1, 0] : splayOf(k, x, z);
      const name = k === 'led' ? (i ? 'the LED\'s cathode' : 'the LED\'s anode') : k === 'link' ? `the link's ${i ? '+ rail' : 'column 5'} end` : k === 'battery' ? `the battery's ${i ? 'black (−)' : 'red (+)'} lead` : `the resistor's ${i ? 'column 9' : 'column 5'} lead`;
      return { pin: n + 1, name, j: freshJoint(), at: [h[0], h[1] + 0.4, h[2]], shape: k === 'led' ? PROTO_LEG : k === 'link' ? PROTO_WIRE : k === 'battery' ? PROTO_PIN : PROTO_LEAD, lead: PROTO.out[k][i]!, dir, part: k }; });
  return { t: 0, plan, placed: plan === 'pico' ? { 'header-a': false, 'header-b': false, pico: false } : { resistor: false, led: false, link: false, proto: false, battery: false }, seat: {}, iron: { T: 25, set: HAND.set, inHand: false, tinned: 0, load: 0, wiped: 0 },
    wire: { out: 30, used: 0, inHand: false }, joints, step: 0, log: [], at: null, on: false };
}

// ---- the steps, each done only when done ---------------------------------------------------------------------------------
const H = LESSONS['solder-headers']!.steps, J = LESSONS['solder-joint']!.steps;
const soldered = (b: Bench, n: number) => grade(b.joints[n - 1]!.j).grade !== 'not soldered';
export interface Step { do: string; check?: string; done: (b: Bench) => boolean; src: string }
export const STEPS: Step[] = [
  { do: H[0]!.do, done: (b) => b.placed['header-a'] && b.placed['header-b'], src: 'solder-headers 1' },
  { do: H[1]!.do, check: H[0]!.check, done: (b) => b.placed.pico, src: 'solder-headers 2 (its check, the first step\'s)' },
  { do: J[0]!.do, check: J[0]!.check, done: (b) => b.iron.T >= 300 && b.iron.tinned > 0, src: 'solder-joint 1' },
  { do: `${H[2]!.do} (pins 1 and 20, 21 and 40). ${J[1]!.do} ${J[2]!.do}`, check: H[2]!.check, done: (b) => [1, 20, 21, 40].every((n) => soldered(b, n)), src: 'solder-headers 3, solder-joint 2–4' },
  { do: H[3]!.do, check: H[3]!.check, done: (b) => b.joints.every((q) => grade(q.j).grade === 'good') && bridges(b).length === 0, src: 'solder-headers 4' },
  { do: 'Put the iron back in its stand.', check: 'the iron in its stand, the joints cooled', done: (b) => !b.iron.inHand && b.joints.every((q) => q.j.T < ALLOY.solidus), src: 'the safety rule: the iron in its stand every time it leaves your hand' },
];

const good = (q: BenchJoint) => grade(q.j, q.shape).grade === 'good';
/** When a step said from an edge is done on the bench, by the edge's kind: the thing in; the board in the hands; the tip
 *  hot and tinned; every joint of its things good; and trimmed to height; the circuit lit; the iron in its stand. */
const DONE: Record<EdgeKind, (things: string[]) => (b: Bench) => boolean> = {
  insert: (t) => (b) => b.placed[t[0] as Thing] === true && !(t[0] === 'battery' && b.on),
  hold: () => (b) => b.placed.proto === true,
  tin: () => (b) => b.iron.T >= 300 && b.iron.tinned > 0,
  solder: (t) => (b) => b.joints.filter((q) => t.includes(q.part ?? '')).every(good),
  trim: (t) => (b) => b.joints.filter((q) => t.includes(q.part ?? '')).every((q) => good(q) && q.lead <= TRIM.max),
  power: () => (b) => b.on && lit(b).mA > 0.5,
  rest: () => (b) => !b.iron.inHand && b.joints.every((q) => q.j.T < ALLOY.solidus),
};
/** The Perma-Proto lesson's steps, each done only when done: its build's edges said (src/nexus/edges.ts), the same
 *  words the written lesson has: its parts in, the board in the hands, the battery holder's pins in, the tip tinned,
 *  its eight joints good, its eight leads trimmed to height, its switch closed and the LED lit, the iron put away. */
export const PROTO_STEPS: Step[] = lessonOf(PROTO_BUILD).steps.map((q) => ({ do: q.do, ...(q.check ? { check: q.check } : {}), done: DONE[q.kind](q.things), src: `${q.kind} ${q.things.join(', ')}: ${q.src}` }));
/** A bench's steps: its lesson's. */
export const stepsOf = (b: Bench): Step[] => (b.plan === 'proto' ? PROTO_STEPS : STEPS);

/** Neighbours along a row run into each other: so much solder on one, or on the two, that it bridges the gap. */
export function bridges(b: Bench): [number, number][] {
  if (b.plan !== 'pico') return [];
  const v = idealVolume(PICO_PIN), fill = (n: number) => b.joints[n - 1]!.j.solder / v, out: [number, number][] = [];
  for (const row of [[1, 20], [21, 40]] as const) for (let n = row[0]; n < row[1]; n++) { const a = fill(n), c = fill(n + 1); if (a > HAND.bridgeOne || c > HAND.bridgeOne || a + c > HAND.bridgeTwo) out.push([n, n + 1]); }
  return out;
}

// ---- what the hands do -------------------------------------------------------------------------------------------------
const dist = (p: V3, q: V3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const say = (b: Bench, s: string) => { if (b.log.at(-1) !== s) b.log.push(s); if (b.log.length > 30) b.log.shift(); };

/** How a thing was held as it was let go, where that matters: the LED turned the wrong way (its anode toward the − rail)
 *  or not upright, its legs not down; the Perma-Proto not turned over. Unsaid, it was held right (words say so). */
export interface Held { reversed?: boolean; upright?: boolean; over?: boolean }
/** Something let go at `at`: put in its place if it is near enough (a header within 4 mm of a free row's seat, the
 *  Pico within 4 mm of lying on both headers), else back where it waits. What it did, said. */
export function letGo(b: Bench, what: Thing, at: V3 | null, o: Held = {}): string {
  if (what === 'iron') { b.iron.inHand = false; return 'the iron in its stand'; }
  if (what === 'solder') { b.wire.inHand = false; return 'the solder put down'; }
  if (what === 'cutters') return 'the cutters put down';
  if (b.plan === 'proto') return letGoProto(b, what, at, o);
  if (what === 'pico') {
    if (!b.placed['header-a'] || !b.placed['header-b']) return 'the headers go in the breadboard first: the Pico lies on them';
    if (at && dist(at, [0, LAYOUT.picoTop, 0]) < 4) { b.placed.pico = true; return 'the Pico on its headers, every pin through its hole'; }
    return 'not over its headers: it goes back on the bench';
  }
  if (what !== 'header-a' && what !== 'header-b') return 'that goes back where it was';
  const free = LAYOUT.headerRows.filter((z) => !(['header-a', 'header-b'] as const).some((h) => h !== what && b.placed[h] && b.seat[h] === z));
  const z = at ? free.find((zz) => dist(at, [0, LAYOUT.board.top + LAYOUT.strip, zz]) < 4) : undefined;
  if (z !== undefined) { b.placed[what] = true; b.seat[what] = z; return `the header in row ${z > 0 ? 'c' : 'h'}, its long pins down in the breadboard`; }
  return 'not over a free row of the breadboard: it goes back on the bench';
}
/** Something taken up into a hand. */
export function takeUp(b: Bench, what: Thing): string {
  if (what === 'cutters') return 'the flush cutters in your hand, their flat side toward the work';
  if (b.plan === 'proto' && what !== 'iron' && what !== 'solder') {
    if (what === 'proto' && b.placed.proto) { b.placed.proto = false; return b.joints.some((q) => q.j.solder > 0) ? 'the board out of the hands, its parts soldered in' : 'the board out of the hands'; }
    if (what === 'battery' && b.placed.battery) { if (b.joints.some((q) => q.part === 'battery' && q.j.solder > 0)) return 'its leads are soldered in: it stays; close its switch to light the LED'; b.placed.battery = false; b.on = false; return 'the holder\'s pins pulled out'; }
    if (what !== 'proto' && b.placed[what]) { if (b.placed.proto) return 'it is in the board, the board in the hands: take the board out first'; if (b.joints.some((q) => q.part === what && q.j.solder > 0)) return `the ${what === 'led' ? 'LED' : what} is soldered in: it stays`; b.placed[what] = false; return `the ${what === 'led' ? 'LED' : what} pulled out`; }
    return `the ${what === 'proto' ? 'Perma-Proto' : what === 'led' ? 'LED' : what === 'battery' ? 'battery holder' : what} in your hand`;
  }
  if (what === 'iron') { b.iron.inHand = true; return b.iron.T < 300 ? `the iron in your hand: ${Math.round(b.iron.T)} °C, heating to ${b.iron.set}` : `the iron in your hand at ${Math.round(b.iron.T)} °C`; }
  if (what === 'solder') { b.wire.inHand = true; return `the solder in your other hand, ${Math.round(b.wire.out)} mm of wire out`; }
  if (what === 'pico' && b.placed.pico) { if (b.joints.some((q) => q.j.solder > 0)) return 'it is soldered to its headers now: they come out of the breadboard with it'; b.placed.pico = false; return 'the Pico lifted off'; }
  if ((what === 'header-a' || what === 'header-b') && b.placed[what]) { if (b.placed.pico) return 'the Pico is on it: lift the Pico first'; b.placed[what] = false; delete b.seat[what]; return 'the header pulled out'; }
  return `the ${what === 'pico' ? 'Pico' : 'header'} in your hand`;
}
/** A thing of the Perma-Proto lesson let go at `at` (bench mm): a part over its holes in the board lying on the bench
 *  goes in, its leads bent out under it to hold (the LED only the right way round: its long lead to the resistor's
 *  strip); the board over the hands' hold, its parts in, is clipped there upside down; else back where it waits. */
function letGoProto(b: Bench, what: Thing, at: V3 | null, o: Held): string {
  if (what === 'proto') {
    if (at && dist(at, protoHold()) < 25) {
      const missing = (['resistor', 'led', 'link'] as const).filter((k) => !b.placed[k]);
      if (missing.length) return `put its parts in first (${missing.join(', ')}): turned over in the hands they would fall out`;
      if (o.over === false) return 'turn the board over first: its underside up, where the leads come through, so the iron can reach them';
      b.placed.proto = true; return 'the board clipped in the hands by its ends, its underside up, its leads standing';
    }
    return 'not at the hands: it goes back on the bench';
  }
  if (what === 'battery') {
    if (!b.placed.proto) return 'its leads go in once the board is in the hands, its other parts soldered: it goes back on the bench';
    if (!at || dist(at, protoHold()) > 90) return 'not by the board: it goes back on the bench';
    b.placed.battery = true; b.on = false; return 'the holder\'s red lead\'s pin up through the + rail at column 1, its black through the − rail at column 3, from the top; their ends stand out of the underside';
  }
  if (what !== 'resistor' && what !== 'led' && what !== 'link') return 'that goes back where it was';
  if (b.placed.proto) return 'the board is in the hands, upside down: put the parts in while it lies on the bench';
  const seat = PROTO.seats[what], mid: V3 = [PROTO.at[0] + (seat[0]![0] + seat[1]![0]) / 2, 1.6, PROTO.at[2] + (seat[0]![1] + seat[1]![1]) / 2];
  if (!at || Math.hypot(at[0] - mid[0], at[2] - mid[2]) > 6 || at[1] > 30) return `not over its holes: it goes back on the bench`;
  if (what === 'led' && o.upright === false) return 'hold the LED upright over its holes, its legs down, to push them in';
  if (what === 'led' && o.reversed) return 'turned the wrong way: the LED\'s long lead, its anode, goes in column 9 row a by the resistor; its short lead, by the flat on its rim, in the − rail';
  b.placed[what] = true; return what === 'resistor' ? 'the resistor in row c, columns 5 and 9, its leads bent out under the board' : what === 'led' ? 'the LED in: its anode in column 9, row a, its cathode in the − rail' : 'the link in, from column 5 to the + rail, its insulation over the − rail';
}
/** The cutters closed, their jaws' tip at `at` (bench mm), their edge running back from it along `along` (a unit
 *  vector; none: the jaws a point, as words say it): the lead nearest the edge, within HAND.bite of it, cut where the
 *  edge crosses it; what was cut off falls. Judged as IPC-A-610's lead protrusion, along the lead from its pad: its end
 *  in sight in the solder and at most 2.5 mm standing; lower than the fillet's top the jaws bite the joint. */
export function cut(b: Bench, at: V3, along?: V3): string {
  if (b.plan !== 'proto' || !b.placed.proto) return 'nothing to cut there';
  let best: { q: BenchJoint; s: number } | null = null, bd: number = HAND.bite;
  for (const q of b.joints) { if (q.lead <= 0) continue; const c = closest(leadAt(q, 0), q.dir, q.lead, at, along ?? [1, 0, 0], along ? HAND.jaw : 0);
    if (c.d < bd && c.s < q.lead - 0.1) { bd = c.d; best = { q, s: c.s }; } }
  if (!best) return 'the jaws closed on nothing: put them round a lead, just above its joint';
  const { q } = best, h = best.s; q.lead = h;
  const said = q.j.solder <= 0 ? `${q.name} trimmed before it was soldered: it may not hold the part now; solder first, then trim` : h < TRIM.min ? `${q.name}: the jaws bit into the fillet: heat it again to mend it` : h > TRIM.max ? `${q.name} trimmed, but ${h.toFixed(1)} mm still stands: cut closer` : `${q.name} trimmed, ${h.toFixed(1)} mm standing: as it should be`;
  if (h < TRIM.min && q.j.solder > 0) q.j = { ...q.j, cold: q.j.cold + 0.05 };
  say(b, said); return said;
}
/** The nearest two segments come, p + s·d (s to ls) and q + u·e (u to lu), d and e unit: where on the first, and how
 *  near. */
function closest(p: V3, d: V3, ls: number, q: V3, e: V3, lu: number): { s: number; d: number } {
  const r: V3 = [p[0] - q[0], p[1] - q[1], p[2] - q[2]], dot = (a: V3, c: V3) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], k = dot(d, e), dr = dot(d, r), er = dot(e, r);
  const clamp = (x: number, hi: number) => Math.min(hi, Math.max(0, x));
  let s = 1 - k * k > 1e-9 ? clamp((k * er - dr) / (1 - k * k), ls) : clamp(-dr, ls); const u = clamp(er + s * k, lu); s = clamp(u * k - dr, ls);
  return { s, d: Math.hypot(r[0] + s * d[0] - u * e[0], r[1] + s * d[1] - u * e[1], r[2] + s * d[2] - u * e[2]) };
}
/** The battery holder's knife switch thrown: closed (on) or open. What it did, said. */
export function throwSwitch(b: Bench, on: boolean): string {
  if (b.plan !== 'proto') return 'there is no switch on this bench';
  b.on = on; if (!on) { say(b, 'the switch open: the LED dark'); return 'the switch open: the LED dark'; }
  const l = lit(b), s = l.mA > 0.5 ? `the switch closed: the LED lights, ${l.mA.toFixed(1)} mA through it (${l.v.toFixed(2)} V from the cells, less its ${l.vf.toFixed(2)} V, over the ${POWER.ohms} Ω)` : `the switch closed, but the LED stays dark: ${l.why}`;
  say(b, s); return s;
}
/** What the circuit does: the cells in series through the switch, the + rail, the link, column 5, the resistor, column
 *  9, the LED and the − rail back, every joint on the way conducting (a joint not soldered, or cold, may not: taken as
 *  open). The current where the LED's drop and the resistor's share the cells' voltage, mA. */
export function lit(b: Bench): { mA: number; v: number; vf: number; why: string } {
  const p = POWER, v = p.cell * p.cells, none = (why: string) => ({ mA: 0, v, vf: 0, why });
  if (b.plan !== 'proto') return none('no circuit on this bench');
  for (const k of ['resistor', 'led', 'link', 'battery'] as const) if (!b.placed[k]) return none(`the ${k === 'led' ? 'LED' : k} is not in`);
  if (!b.on) return none('the switch is open');
  const open = b.joints.find((q) => { const g = grade(q.j, q.shape).grade; return g === 'not soldered' || g === 'cold'; });
  if (open) return none(`${open.name} is ${grade(open.j, open.shape).grade}: no current through it`);
  return { ...ledCurrent(p), why: '' };
}
/** More wire pulled off the reel, mm (the fingers let out so much more). */
export function payOut(b: Bench, mm = 10): void { b.wire.out = Math.min(60, b.wire.out + mm); }
/** The tip drawn through the brass wool: its old solder off, its tinning kept (Hakko's 599B, brass softer than the
 *  tip's plating: its maker). */
export function wipe(b: Bench): void { if (b.iron.load > 0 || b.iron.wiped <= 0) say(b, 'the tip wiped on the brass: clean and shiny'); b.iron.load = 0; b.iron.wiped = 1; }

/** One moment of dt s: where the tip and the wire's end are (bench mm, null when not in a hand). The iron heats; each
 *  joint the tip touches takes its heat; wire touching what is hot enough melts into it (or onto the tip); a clean tip
 *  touching a molten joint with too much on it draws some off; the step moves on when it is done. */
export function tick(b: Bench, dt: number, tip: V3 | null, wireEnd: V3 | null): void {
  b.t += dt; const a = ALLOY, ir = b.iron;
  ir.T = ir.set - (ir.set - ir.T) * Math.exp(-dt / HAND.tau);
  if (ir.tinned > 0 && ir.T > 200) { ir.tinned = Math.max(0, ir.tinned - dt); if (ir.tinned === 0) say(b, 'the tip has dulled: melt a little fresh solder onto it'); }
  const ready = b.plan === 'proto' ? b.placed.proto === true : b.placed.pico === true, tipOn = tip && ir.inHand && ready ? nearest(b, tip, HAND.touch) : null;
  if (tipOn) b.at = tipOn;
  const wireOn = wireEnd && b.wire.inHand && b.wire.out > 0 ? (ready ? nearest(b, wireEnd, HAND.reach) : null) : null;
  const wireOnTip = !!(wireEnd && tip && b.wire.inHand && ir.inHand && b.wire.out > 0 && dist(wireEnd, tip) < HAND.reach + 0.6);
  const melt = HAND.feedMm * dt * mm3PerMm;
  for (const q of b.joints) {
    const touching = tipOn === q.pin; let feed = 0, why = '';
    // (the wire on the joint melts once the joint is past the solder's solidus; on the tip once the tip is past its liquidus)
    if (wireOn === q.pin && q.j.T < a.solidus && !(touching && wireOnTip)) say(b, `pin ${q.pin}: the solder does not melt on a cold joint: heat its pad and pin with the tip first`);
    if (wireOn === q.pin && q.j.T >= a.solidus) { feed = melt; why = q.j.T >= a.liquidus ? 'flows onto the pad and the pin' : 'goes soft on it but does not flow: the joint is not hot enough yet'; }
    else if (touching && wireOnTip && ir.T >= a.liquidus) { feed = melt; why = q.j.T >= a.liquidus ? 'melts on the tip and runs into the joint' : 'melts on the tip and balls on the cold joint: feed the joint, not the iron'; }
    // (solder carried on the tip goes onto what it touches: into it if it is hot, as a cold ball if not)
    // (a tip on a molten joint already over-full draws from it rather than giving)
    const over = q.j.T >= a.liquidus && q.j.solder > 1.05 * idealVolume(q.shape);
    let carried = 0; if (touching && ir.load > 0.05 && !feed && !over) { carried = Math.min(ir.load, 1.0 * dt); ir.load -= carried; }
    q.j = step(q.j, { touching, tip: ir.T, tinned: ir.tinned > 0, feed: feed + carried }, dt, a);
    if (feed > 0) { b.wire.out = Math.max(0, b.wire.out - HAND.feedMm * dt); b.wire.used += feed; say(b, `pin ${q.pin} (${q.name}): the solder ${why}`); }
    // (a clean tip on a molten joint with more than it should hold takes some off, until the tip is loaded)
    if (touching && over && ir.load < HAND.holds && !feed) { const off = Math.min(HAND.wick * dt, q.j.solder - idealVolume(q.shape), HAND.holds - ir.load); q.j.solder -= off; ir.load += off; if (off > 0) say(b, `pin ${q.pin}: the tip draws some solder off`); }
  }
  // (the wire on the hot tip with no joint under it tins the tip; what more melts beads on it)
  if (wireOnTip && !tipOn && ir.T >= a.liquidus) { const add = melt; b.wire.out = Math.max(0, b.wire.out - HAND.feedMm * dt); b.wire.used += add; ir.tinned = HAND.tinLasts; ir.load = Math.min(HAND.holds, ir.load + add * 0.3); say(b, 'the tip tinned: bright with fresh solder'); }
  if (wireOnTip && ir.T < a.liquidus && ir.inHand) say(b, `the tip is not hot enough to melt the solder yet: wait for it to reach ${ir.set} °C`);
  const steps = stepsOf(b);
  while (b.step < steps.length && steps[b.step]!.done(b)) { b.step++; say(b, b.step < steps.length ? `done. Next: ${steps[b.step]!.do}` : b.plan === 'proto' ? `the lesson is done: all ${b.joints.length} joints good, their leads trimmed, the LED lit` : `the lesson is done: all ${b.joints.length} joints good`); }
}
/** The pin whose joint is nearest a point, within r mm, else null. */
function nearest(b: Bench, p: V3, r: number): number | null {
  let best: number | null = null, bd = r;
  for (const q of b.joints) { const d = dist(p, q.at); if (d < bd) { bd = d; best = q.pin; } }
  return best;
}

// ---- what it says -----------------------------------------------------------------------------------------------------
export interface Readout { step: number; of: number; do: string; check?: string; iron: string; joint: string | null; good: number; graded: Record<Grade, number>; bridges: string[]; last: string[] }
export function readout(b: Bench): Readout {
  const steps = stepsOf(b), s = steps[Math.min(b.step, steps.length - 1)]!, ir = b.iron, graded = { good: 0, 'too little': 0, 'too much': 0, cold: 0, overheated: 0, 'not soldered': 0 } as Record<Grade, number>;
  for (const q of b.joints) graded[grade(q.j, q.shape).grade]++;
  const q = b.at ? b.joints[b.at - 1]! : null, g = q ? grade(q.j, q.shape) : null;
  return { step: Math.min(b.step + 1, steps.length), of: steps.length, do: b.step >= steps.length ? 'Done: every joint good, the iron in its stand.' : s.do, check: s.check,
    iron: `${Math.round(ir.T)} °C${ir.T < 300 ? ` (heating to ${ir.set})` : ''}, ${ir.tinned > 0 ? 'tinned' : 'dull: tin it'}${ir.load > 0.1 ? ', solder on the tip: wipe it' : ''}, ${ir.inHand ? 'in your hand' : 'in its stand'}`,
    joint: q && g ? `${b.plan === 'proto' ? q.name : `pin ${q.pin} (${q.name})`}: ${g.grade}, now ${Math.round(q.j.T)} °C: ${g.says}` : null,
    good: graded.good, graded, bridges: bridges(b).map(([m, n]) => `pins ${m} and ${n} bridged: draw the excess off with a clean tip`), last: b.log.slice(-4) };
}
/** The wait the lesson tells you of before feeding: how long a tinned tip at its set temperature takes to bring a joint to
 *  the solder's liquidus, s. */
export const waitBeforeFeed = (b: Bench): number => timeToMelt(b.iron.T, b.iron.tinned > 0, ALLOY);
