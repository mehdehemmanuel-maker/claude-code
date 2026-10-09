// A soldering lesson done by hand, as it is done at a real bench: the Pico's two headers pushed into a breadboard, the
// Pico laid on them, the iron heated and its tip tinned, then each of its 40 joints heated with the tip and fed solder
// from the wire in the other hand, each judged as it is made (src/nexus/solder-joint.ts), and every step of the
// lessons it follows (src/nexus/lessons.ts: 'solder-joint' and 'solder-headers') done only when the hands have done it.
// Nothing here draws: the room (src/nexus/view/solder-bench.ts) says where the tip and the wire's end are, and what was
// let go where; this says what that did. A figure not from a source is an estimate and said so.
// Frame: millimetres on the bench, its origin the breadboard's middle on the bench's top, y up, x along the
// breadboard's columns, z across them (its row a toward +z).
// Owner of: a hands-on lesson's state, its steps and their checks, and what the hands' moves do to the joints.

import { BB } from './kit-solder';
import { LESSONS } from './lessons';
import { PICO_PIN_NAMES } from './sbc';
import { ALLOYS, freshJoint, grade, idealVolume, PICO_PIN, step, timeToMelt, type Grade, type JointState } from './solder-joint';

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

// ---- how the hands work on it (estimates, each said) -------------------------------------------------------------------
export const HAND = {
  /** the tip touches a joint within this of its point, mm (a B2 cone's working face about 1 mm across, against a 1.7 mm
   *  pad and its pin: an estimate) */ touch: 1.2,
  /** the wire's end reaches a joint, or the tip, within this, mm (estimate) */ reach: 1.2,
  /** 0.5 mm wire melts as fast as a hand pushes it in: about 4 mm a second (estimate) */ feedMm: 4,
  /** the wire's diameter, mm (Adafruit's reel 1886, Atten's TS-635050: 0.5 mm, 63/37, its listing) */ wire: 0.5,
  /** what the tip carries away from a joint with too much on it, mm³/s, and holds before it must be wiped (estimates) */ wick: 0.6, holds: 0.5,
  /** how long a tip stays tinned hot with no fresh solder on it before it dulls, s (estimate: the guides' "re-tin
   *  often") */ tinLasts: 60,
  /** a joint so full it runs into its neighbour, its share of a good joint, or two neighbours' together (estimate:
   *  the gap between 1.7 mm pads at 2.54 is 0.84 mm) */ bridgeOne: 2.4, bridgeTwo: 3.6,
  /** the iron's set temperature, °C, and how fast it heats, its time constant, s (the joint lesson's 330 for leaded
   *  solder; PINE64 publishes no heat-up time, so an estimate: about 7 s to 300 °C) */ set: 330, tau: 3,
} as const;
const mm3PerMm = (Math.PI / 4) * HAND.wire * HAND.wire;
/** The lesson's solder: the reel the build pack buys, 63/37 since 2019 (Adafruit's listing), melting at 183 °C at once. */
export const ALLOY = ALLOYS.Sn63Pb37!;

// ---- the lesson's state ------------------------------------------------------------------------------------------------
export interface BenchJoint { pin: number; name: string; j: JointState }
export type Thing = 'header-a' | 'header-b' | 'pico' | 'iron' | 'solder';
export interface Bench {
  t: number;
  /** what is in its place: each header in its row, the Pico on them; the row (z, mm) each header is in */ placed: { 'header-a': boolean; 'header-b': boolean; pico: boolean }; seat: { 'header-a'?: number; 'header-b'?: number };
  iron: { T: number; set: number; inHand: boolean; tinned: number; load: number; wiped: number };
  /** the wire: how far it stands out past the fingers, mm, and how much has been used, mm³ */ wire: { out: number; used: number; inHand: boolean };
  joints: BenchJoint[];
  /** the step of the lesson now (STEPS) */ step: number;
  /** what has happened, newest last, for the readout */ log: string[];
  /** the pin the tip is on now, else the nearest it was on */ at: number | null;
}
export function newBench(): Bench {
  return { t: 0, placed: { 'header-a': false, 'header-b': false, pico: false }, seat: {}, iron: { T: 25, set: HAND.set, inHand: false, tinned: 0, load: 0, wiped: 0 },
    wire: { out: 30, used: 0, inHand: false }, joints: Array.from({ length: 40 }, (_, i) => ({ pin: i + 1, name: PICO_PIN_NAMES[i]!, j: freshJoint() })), step: 0, log: [], at: null };
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

/** Neighbours along a row run into each other: so much solder on one, or on the two, that it bridges the gap. */
export function bridges(b: Bench): [number, number][] {
  const v = idealVolume(PICO_PIN), fill = (n: number) => b.joints[n - 1]!.j.solder / v, out: [number, number][] = [];
  for (const row of [[1, 20], [21, 40]] as const) for (let n = row[0]; n < row[1]; n++) { const a = fill(n), c = fill(n + 1); if (a > HAND.bridgeOne || c > HAND.bridgeOne || a + c > HAND.bridgeTwo) out.push([n, n + 1]); }
  return out;
}

// ---- what the hands do -------------------------------------------------------------------------------------------------
const dist = (p: V3, q: V3) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const say = (b: Bench, s: string) => { if (b.log.at(-1) !== s) b.log.push(s); if (b.log.length > 30) b.log.shift(); };

/** Something let go at `at`: put in its place if it is near enough (a header within 4 mm of a free row's seat, the
 *  Pico within 4 mm of lying on both headers), else back where it waits. What it did, said. */
export function letGo(b: Bench, what: Thing, at: V3 | null): string {
  if (what === 'iron') { b.iron.inHand = false; return 'the iron in its stand'; }
  if (what === 'solder') { b.wire.inHand = false; return 'the solder put down'; }
  if (what === 'pico') {
    if (!b.placed['header-a'] || !b.placed['header-b']) return 'the headers go in the breadboard first: the Pico lies on them';
    if (at && dist(at, [0, LAYOUT.picoTop, 0]) < 4) { b.placed.pico = true; return 'the Pico on its headers, every pin through its hole'; }
    return 'not over its headers: it goes back on the bench';
  }
  const free = LAYOUT.headerRows.filter((z) => !(['header-a', 'header-b'] as const).some((h) => h !== what && b.placed[h] && b.seat[h] === z));
  const z = at ? free.find((zz) => dist(at, [0, LAYOUT.board.top + LAYOUT.strip, zz]) < 4) : undefined;
  if (z !== undefined) { b.placed[what] = true; b.seat[what] = z; return `the header in row ${z > 0 ? 'c' : 'h'}, its long pins down in the breadboard`; }
  return 'not over a free row of the breadboard: it goes back on the bench';
}
/** Something taken up into a hand. */
export function takeUp(b: Bench, what: Thing): string {
  if (what === 'iron') { b.iron.inHand = true; return b.iron.T < 300 ? `the iron in your hand: ${Math.round(b.iron.T)} °C, heating to ${b.iron.set}` : `the iron in your hand at ${Math.round(b.iron.T)} °C`; }
  if (what === 'solder') { b.wire.inHand = true; return `the solder in your other hand, ${Math.round(b.wire.out)} mm of wire out`; }
  if (what === 'pico' && b.placed.pico) { if (b.joints.some((q) => q.j.solder > 0)) return 'it is soldered to its headers now: they come out of the breadboard with it'; b.placed.pico = false; return 'the Pico lifted off'; }
  if ((what === 'header-a' || what === 'header-b') && b.placed[what]) { if (b.placed.pico) return 'the Pico is on it: lift the Pico first'; b.placed[what] = false; delete b.seat[what]; return 'the header pulled out'; }
  return `the ${what === 'pico' ? 'Pico' : 'header'} in your hand`;
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
  const tipOn = tip && ir.inHand && b.placed.pico ? nearest(b, tip, HAND.touch) : null;
  if (tipOn) b.at = tipOn;
  const wireOn = wireEnd && b.wire.inHand && b.wire.out > 0 ? (b.placed.pico ? nearest(b, wireEnd, HAND.reach) : null) : null;
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
    const over = q.j.T >= a.liquidus && q.j.solder > 1.05 * idealVolume(PICO_PIN);
    let carried = 0; if (touching && ir.load > 0.05 && !feed && !over) { carried = Math.min(ir.load, 1.0 * dt); ir.load -= carried; }
    q.j = step(q.j, { touching, tip: ir.T, tinned: ir.tinned > 0, feed: feed + carried }, dt, a);
    if (feed > 0) { b.wire.out = Math.max(0, b.wire.out - HAND.feedMm * dt); b.wire.used += feed; say(b, `pin ${q.pin} (${q.name}): the solder ${why}`); }
    // (a clean tip on a molten joint with more than it should hold takes some off, until the tip is loaded)
    if (touching && over && ir.load < HAND.holds && !feed) { const off = Math.min(HAND.wick * dt, q.j.solder - idealVolume(PICO_PIN), HAND.holds - ir.load); q.j.solder -= off; ir.load += off; if (off > 0) say(b, `pin ${q.pin}: the tip draws some solder off`); }
  }
  // (the wire on the hot tip with no joint under it tins the tip; what more melts beads on it)
  if (wireOnTip && !tipOn && ir.T >= a.liquidus) { const add = melt; b.wire.out = Math.max(0, b.wire.out - HAND.feedMm * dt); b.wire.used += add; ir.tinned = HAND.tinLasts; ir.load = Math.min(HAND.holds, ir.load + add * 0.3); say(b, 'the tip tinned: bright with fresh solder'); }
  if (wireOnTip && ir.T < a.liquidus && ir.inHand) say(b, `the tip is not hot enough to melt the solder yet: wait for it to reach ${ir.set} °C`);
  while (b.step < STEPS.length && STEPS[b.step]!.done(b)) { b.step++; say(b, b.step < STEPS.length ? `done. Next: ${STEPS[b.step]!.do}` : 'the lesson is done: all 40 joints good'); }
}
/** The pin whose joint is nearest a point, within r mm, else null. */
function nearest(b: Bench, p: V3, r: number): number | null {
  let best: number | null = null, bd = r;
  for (const q of b.joints) { const d = dist(p, jointPoint(q.pin)); if (d < bd) { bd = d; best = q.pin; } }
  return best;
}

// ---- what it says -----------------------------------------------------------------------------------------------------
export interface Readout { step: number; of: number; do: string; check?: string; iron: string; joint: string | null; good: number; graded: Record<Grade, number>; bridges: string[]; last: string[] }
export function readout(b: Bench): Readout {
  const s = STEPS[Math.min(b.step, STEPS.length - 1)]!, ir = b.iron, graded = { good: 0, 'too little': 0, 'too much': 0, cold: 0, overheated: 0, 'not soldered': 0 } as Record<Grade, number>;
  for (const q of b.joints) graded[grade(q.j).grade]++;
  const q = b.at ? b.joints[b.at - 1]! : null, g = q ? grade(q.j) : null;
  return { step: Math.min(b.step + 1, STEPS.length), of: STEPS.length, do: b.step >= STEPS.length ? 'Done: every joint good, the iron in its stand.' : s.do, check: s.check,
    iron: `${Math.round(ir.T)} °C${ir.T < 300 ? ` (heating to ${ir.set})` : ''}, ${ir.tinned > 0 ? 'tinned' : 'dull: tin it'}${ir.load > 0.1 ? ', solder on the tip: wipe it' : ''}, ${ir.inHand ? 'in your hand' : 'in its stand'}`,
    joint: q && g ? `pin ${q.pin} (${q.name}): ${Math.round(q.j.T)} °C, ${g.grade}${g.grade === 'not soldered' ? '' : ` (${Math.round(g.fill * 100)} %)`}: ${g.says}` : null,
    good: graded.good, graded, bridges: bridges(b).map(([m, n]) => `pins ${m} and ${n} bridged: draw the excess off with a clean tip`), last: b.log.slice(-4) };
}
/** The wait the lesson tells you of before feeding: how long a tinned tip at its set temperature takes to bring a joint to
 *  the solder's liquidus, s. */
export const waitBeforeFeed = (b: Bench): number => timeToMelt(b.iron.T, b.iron.tinned > 0, ALLOY);
