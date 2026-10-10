// The robot the user asked for: one that welds, solders, types on a computer, sees, hears, smells, feels, grabs,
// changes its own grip and uses any tool. Each thing it does is an edge between what the task needs (a mass carried at
// its wrist, a grip, a force pressed, how near it must come, what it must sense and how finely) and what its parts give,
// each part a real one with its maker's figures; a task its body cannot do is refused with why, and what would let it
// do it said. A robot for a set of tasks is designed by taking, for each need, the least part that meets it. Soldering
// is the lessons' own (src/nexus/teach/edges.ts): the robot does the same steps a person does, said as its hands doing them.
// Owner of: the robot's parts and senses as their makers give them, its tasks' needs, what it can do and why not.

import { MECA500 } from './meca';
import { lessonOf, type Build } from '../teach/edges';
import { PROTO_BUILD } from '../teach/lessons';

const G = 9.81;
/** An arm: what it carries at its flange (kg), how far it reaches (mm), how closely it returns to a taught point (±mm). */
export interface Arm { id: string; name: string; payload: number; reach: number; repeat: number; joints: number; src: string }
export const ARMS: Arm[] = [
  { id: 'meca500', name: MECA500.name, payload: MECA500.payload, reach: MECA500.reach, repeat: MECA500.repeatability, joints: 6, src: MECA500.src },
  { id: 'ur5e', name: 'Universal Robots\' UR5e', payload: 5, reach: 850, repeat: 0.03, joints: 6, src: 'Universal Robots\' e-Series brochure: 5 kg, 850 mm, ±0.03 mm with payload (ISO 9283), six rotating joints' },
];
/** How a thing is held: as a pen (thumb and two fingers, its point ahead), in the fist, between fingertips, pressed by a
 *  fingertip, or bolted to the wrist's flange. */
export type Grip = 'pen' | 'power' | 'pinch' | 'press' | 'flange';
/** A hand: the grips it can make, how wide it opens (mm), the force each finger presses with (N, least to most), what
 *  it carries, how closely it repeats. */
export interface Hand { id: string; name: string; mass: number; grips: Grip[]; open: number; force: [number, number]; payload: number; repeat: number; dof: number; src: string; /** what it feels of its own grip, without a sensor added */ feels?: string }
export const HANDS: Hand[] = [
  { id: '2f-85', name: 'Robotiq\'s 2F-85', mass: 1, grips: ['power', 'pinch'], open: 85, force: [20, 235], payload: 5, repeat: 0.05, dof: 1, src: 'Robotiq\'s adaptive grippers page: 85 mm stroke, 20–235 N grip, 5 kg payload, 1 kg, 0.05 mm repeatability', feels: 'its grip itself, by its own object detection, position and force (Robotiq\'s page)' },
  { id: 'rh56dfx', name: 'Inspire Robots\' RH56DFX', mass: 0.54, grips: ['pen', 'power', 'pinch', 'press'], open: 90, force: [0.5, 10], payload: 3, repeat: 0.2, dof: 6, src: 'Inspire Robots\' RH56DFX page: 6 degrees of freedom on 12 joints, 540 g, ±0.20 mm, each fingertip 10 N (the thumb 15), its force read to 0.5 N; 3 kg load (a reseller\'s figure); its opening about a hand\'s, 90 mm (an estimate)' },
];
/** A tool changer between the arm's flange and what it holds: so it puts down one hand or tool and takes up another. */
export const CHANGER = { id: 'qc-11', name: 'ATI\'s QC-11', payload: 16, mass: 0.245, repeat: 0.0102, air: 5.5, src: 'ATI\'s QC-11 page: 16 kg suggested payload, 0.245 kg coupled, 0.0102 mm repeatability, locked pneumatically at 5.5 bar' };
export type Sense = 'sight' | 'depth' | 'hearing' | 'smell' | 'touch';
/** A sense: a camera's pixels and view (degrees across), its nearest focus (mm); a microphone's signal over its own noise
 *  (dB, at 94 dB SPL) and its band (Hz); a gas sensor's finest (ppb); a force sensor's range and finest step (N). */
export interface Sensor { id: string; name: string; sense: Sense; fig: Record<string, number>; mass: number; can: string; src: string }
export const SENSORS: Sensor[] = [
  { id: 'cam3', name: 'Raspberry Pi\'s Camera Module 3', sense: 'sight', fig: { w: 4608, h: 2592, hfov: 66, near: 100 }, mass: 0.004, can: 'colour stills and video, focusing itself from 10 cm', src: 'Raspberry Pi\'s product brief: Sony IMX708, 11.9 MP, 4608 × 2592, 66° across, focus 10 cm to infinity; 4 g (Tom\'s Hardware)' },
  { id: 'd435', name: 'Intel\'s RealSense D435', sense: 'depth', fig: { w: 1280, h: 720, hfov: 85.2, near: 300, far: 3000 }, mass: 0.072, can: 'how far each point is, by stereo', src: 'Intel\'s D435 specifications: 0.3–3 m, 1280 × 720 depth, 85.2° × 58°; 90 × 25 × 25 mm (its mass, 72 g, an estimate)' },
  { id: 'inmp441', name: 'TDK InvenSense\'s INMP441', sense: 'hearing', fig: { snr: 61, lo: 60, hi: 15000 }, mass: 0.001, can: 'sound, as 24-bit I²S', src: 'its datasheet: 61 dBA SNR, −26 dBFS sensitivity, 60 Hz–15 kHz' },
  { id: 'bme688', name: 'Bosch\'s BME688', sense: 'smell', fig: { ppb: 1 }, mass: 0.001, can: 'volatile organic and sulphur compounds, carbon monoxide and hydrogen in parts per billion; smells told apart only as it is trained (Bosch\'s BME AI-Studio)', src: 'Bosch Sensortec\'s BME688 datasheet: VOCs, VSCs, CO and H₂ at ppb, with pressure, humidity and temperature; 3 × 3 × 0.93 mm' },
  { id: 'nano17', name: 'ATI\'s Nano17', sense: 'touch', fig: { range: 12, res: 1 / 320 }, mass: 0.00907, can: 'force and torque at the wrist, six ways', src: 'ATI\'s Nano17 (SI-12-0.12): 12 N across (17 N along), 1/320 N resolution, 9.07 g, 7200 Hz' },
];
/** A thing the robot uses: its mass (kg), how it is held, its handle's width (mm). */
export interface Tool { id: string; name: string; mass: number; grip: Grip; width: number; src: string }
export const TOOLS: Tool[] = [
  { id: 'iron', name: 'the Pinecil', mass: 0.028, grip: 'pen', width: 13, src: 'PINE64\'s Pinecil V2: 28 g (its listing; its grip\'s width an estimate)' },
  { id: 'solder', name: 'the solder wire', mass: 0.005, grip: 'pinch', width: 0.5, src: 'Adafruit\'s 1886 reel: 0.5 mm 63/37 (a few grams in hand)' },
  { id: 'cutters', name: 'the flush cutters', mass: 0.062, grip: 'power', width: 20, src: 'Hakko\'s CHP-170: 62 g (bulletin PB489; its grips\' width an estimate)' },
  { id: 'mig', name: 'a robot MIG torch', mass: 1.2, grip: 'flange', width: 0, src: 'Abicor Binzel\'s ROBO catalogue: the air-cooled ABIROB A, about 1200 g with its neck' },
  { id: 'keyboard', name: 'a keyboard', mass: 0, grip: 'press', width: 0, src: 'Cherry\'s MX Red: 45 cN to actuate, 2 mm before it does, 4 mm in all' },
];
/** A task: the tools it uses, how many hands, the senses it needs, how near it must come (±mm), the force it presses
 *  with (N), the least thing it must see (mm) and from how far (mm). */
export interface Task { id: string; name: string; tools: string[]; hands: number; senses: Sense[]; precision?: number; force?: number; see?: [number, number]; depth?: [number, number]; grab?: { kg: number; mm: number }; why: string }
export const TASKS: Task[] = [
  { id: 'solder', name: 'solder a through-hole joint', tools: ['iron', 'solder'], hands: 2, senses: ['sight', 'touch'], precision: 0.3, force: 1, see: [0.6, 200], why: 'the tip\'s 1 mm face on a 1.93 mm pad and its 0.6 mm lead together (the lessons\' Perma-Proto), pressed lightly (about 1 N: an estimate), the wire fed from the other hand' },
  { id: 'trim', name: 'trim a lead', tools: ['cutters'], hands: 1, senses: ['sight'], precision: 0.5, see: [0.6, 200], why: 'the cutters\' jaws across a 0.6 mm lead 0.6 to 2.5 mm above its joint (IPC-A-610\'s protrusion)' },
  { id: 'weld', name: 'MIG weld a seam', tools: ['mig'], hands: 1, senses: ['sight'], precision: 0.5, see: [1, 300], why: 'the torch\'s wire along the seam within about half its 1.0–1.2 mm (an estimate), seen through a welding filter (shade 10 or darker for MIG, typical)' },
  { id: 'type', name: 'type on a computer', tools: ['keyboard'], hands: 1, senses: ['sight', 'touch'], precision: 2, force: 0.68, see: [2, 500], why: 'each key pressed past its 45 cN (half again for margin) inside its cap, on 19.05 mm centres (typical); the screen\'s words read from half a metre' },
  { id: 'hear', name: 'hear speech', tools: [], hands: 0, senses: ['hearing'], why: 'a voice at about 60 dB SPL a metre off (typical) above the microphone\'s own noise' },
  { id: 'smell', name: 'smell', tools: [], hands: 0, senses: ['smell'], why: 'flux fumes, smoke, food, gas: what is in the air in parts per billion' },
  { id: 'see', name: 'see where things are', tools: [], hands: 0, senses: ['sight', 'depth'], see: [1, 500], depth: [10, 1000], why: 'a millimetre at half a metre, and how far each thing is, to a centimetre at a metre' },
  { id: 'grab', name: 'grab a bottle', tools: [], hands: 1, senses: ['sight', 'touch'], grab: { kg: 0.5, mm: 65 }, see: [5, 800], why: 'a full half-litre bottle, about 0.5 kg and 65 mm across (typical), held by friction' },
  { id: 'regrip', name: 'change its own grip', tools: [], hands: 1, senses: ['touch'], why: 'a thing turned in the hand (a dexterous hand), passed between two hands, or a hand swapped for another (a tool changer)' },
];
/** A robot: its arms, each with its hand and whether a tool changer is on its wrist, and its senses. */
export interface Robot { name: string; arms: { arm: Arm; hand: Hand; changer: boolean }[]; senses: Sensor[] }
/** How many pixels a camera puts across a thing s mm wide d mm away. */
export const pixelsAcross = (c: Sensor, s: number, d: number): number => (s / (2 * d * Math.tan(((c.fig.hfov ?? 60) * Math.PI) / 360))) * (c.fig.w ?? 0);
/** Friction's share: a grip holds what its fingers' press times the friction between them carries (0.5 for rubber
 *  fingertips on plastic or metal, an estimate), twice over for a margin. */
const MU = 0.5;
const has = (r: Robot, s: Sense) => r.senses.find((x) => x.sense === s);
export interface Can { ok: boolean; refused: string[]; warn: string[]; uses: string[]; steps: string[] }
/** Whether a robot can do a task, and why not: its arms enough for its hands; each tool held as it is held, by a hand
 *  that makes that grip (or bolted on through a changer), within what the arm carries; its fingers' force enough to
 *  hold it, and to press what it presses; arm and hand returning within the task's nearness; every sense it needs,
 *  each fine enough. */
export function canDo(r: Robot, t: Task): Can {
  const refused: string[] = [], warn: string[] = [], uses: string[] = [];
  if (r.arms.length < t.hands) refused.push(`${t.name} takes ${t.hands} hands; ${r.name} has ${r.arms.length}`);
  t.tools.forEach((id, i) => {
    const tool = TOOLS.find((x) => x.id === id)!, side = r.arms[Math.min(i, r.arms.length - 1)]; if (!side) return;
    const { arm, hand, changer } = side, onWrist = hand.mass + (changer ? CHANGER.mass : 0);
    if (tool.grip === 'flange') {
      if (!changer) { refused.push(`${tool.name} bolts to the wrist: ${r.name} needs a tool changer to put its hand down and take it up`); return; }
      const load = CHANGER.mass + tool.mass; if (load > arm.payload) refused.push(`${tool.name} and the changer are ${load.toFixed(2)} kg: ${arm.name} carries ${arm.payload} kg`);
      else uses.push(`${arm.name} takes up ${tool.name} through ${CHANGER.name} (${(CHANGER.mass + tool.mass).toFixed(2)} kg of its ${arm.payload})`); return;
    }
    if (!hand.grips.includes(tool.grip)) { refused.push(`${hand.name} cannot hold ${tool.name} in a ${tool.grip} grip${changer ? '' : ': a hand that can, or a changer to swap to one'}`); return; }
    if (onWrist + tool.mass > arm.payload) refused.push(`${hand.name} with ${tool.name} is ${(onWrist + tool.mass).toFixed(2)} kg: ${arm.name} carries ${arm.payload} kg`);
    if (tool.width > hand.open) refused.push(`${tool.name} is ${tool.width} mm across: ${hand.name} opens ${hand.open} mm`);
    const hold = (2 * tool.mass * G) / (2 * MU); if (tool.mass && hold > hand.force[1]) refused.push(`holding ${tool.name} takes ${hold.toFixed(1)} N a finger: ${hand.name} gives ${hand.force[1]} N`);
    uses.push(tool.grip === 'press' ? `${hand.name} on ${arm.name} presses ${tool.name}'s keys with its fingertips` : `${hand.name} on ${arm.name} holds ${tool.name} in a ${tool.grip} grip`);
  });
  if (t.grab) { const side = r.arms[0]; if (side) { const { arm, hand } = side, need = (2 * t.grab.kg * G) / (2 * MU), load = hand.mass + (side.changer ? CHANGER.mass : 0) + t.grab.kg;
    if (t.grab.mm > hand.open) refused.push(`it is ${t.grab.mm} mm across: ${hand.name} opens ${hand.open} mm`);
    if (need > hand.force[1] * (hand.dof >= 6 ? 2 : 1)) refused.push(`holding ${t.grab.kg} kg takes ${need.toFixed(1)} N of grip: ${hand.name} gives ${hand.force[1]} N a finger`);
    if (load > arm.payload) refused.push(`${hand.name} with it is ${load.toFixed(2)} kg: ${arm.name} carries ${arm.payload} kg`);
    if (!refused.length) uses.push(`${hand.name} closes on it with ${need.toFixed(1)} N (friction 0.5, twice over), ${load.toFixed(2)} kg of ${arm.name}'s ${arm.payload}`); } }
  const arm0 = r.arms[0];
  if (t.precision !== undefined && arm0) { const flange = t.tools.some((id) => TOOLS.find((x) => x.id === id)?.grip === 'flange'), rep = arm0.arm.repeat + (flange ? CHANGER.repeat : arm0.hand.repeat); if (rep > t.precision) refused.push(`${t.name} wants ±${t.precision} mm: ${arm0.arm.name} and ${arm0.hand.name} return within ±${rep.toFixed(2)}`); else uses.push(`${arm0.arm.name} and ${arm0.hand.name} return within ±${rep.toFixed(2)} mm of ±${t.precision} (repeatability; finding the place is the camera's)`); }
  if (t.force !== undefined && arm0) { const f = t.tools.includes('keyboard') ? arm0.hand.force[1] : Infinity; if (t.tools.includes('keyboard') && !arm0.hand.grips.includes('press')) refused.push(`${arm0.hand.name} has no finger to press a key with`); else if (f < t.force) refused.push(`${t.name} presses ${t.force} N: ${arm0.hand.name}'s fingers give ${f} N`); }
  for (const s of t.senses) {
    const own = s === 'touch' && t.force === undefined ? r.arms.find((a) => a.hand.feels)?.hand : undefined; if (own && !has(r, s)) { uses.push(`${own.name} feels ${own.feels}`); continue; }
    const c = has(r, s); if (!c) { refused.push(`${t.name} needs ${s}: ${r.name} has no sensor for it (${SENSORS.filter((x) => x.sense === s).map((x) => x.name).join(' or ')})`); continue; }
    const look = s === 'sight' ? t.see : s === 'depth' ? t.depth ?? t.see : undefined;
    if (look) { const px = pixelsAcross(c, look[0], look[1]); if (px < 3) refused.push(`${c.name} puts ${px.toFixed(1)} pixels across ${look[0]} mm at ${look[1]} mm: it needs 3 to find its edges`); else uses.push(`${c.name} ${s === 'depth' ? 'tells how far' : 'sees'} ${look[0]} mm at ${look[1]} mm across ${px.toFixed(0)} pixels`); if (s === 'depth' && look[1] < (c.fig.near ?? 0)) warn.push(`${c.name} sees depth from ${c.fig.near} mm, not nearer`); }
    if (s === 'touch' && t.force !== undefined && c.fig.res! > t.force / 20) refused.push(`${c.name} reads force to ${c.fig.res} N: too coarse for ${t.force} N`);
    if (s === 'touch' && !uses.some((u) => u.includes(c.name))) uses.push(`${c.name} feels ${t.force !== undefined ? `the ${t.force} N press to ${(c.fig.res! * 1000).toFixed(1)} mN` : `what it holds, to ${(c.fig.res! * 1000).toFixed(1)} mN`}`);
    if (s === 'hearing') { const floor = 94 - c.fig.snr!; if (floor > 50) refused.push(`${c.name}'s own noise is ${floor} dB SPL: a voice at 60 dB is lost in it`); else uses.push(`${c.name} hears a voice at 60 dB SPL, ${60 - floor} dB above its own noise (${floor} dB)`); }
    if (s === 'smell') { uses.push(`${c.name} smells ${c.can}`); }
  }
  if (t.id === 'regrip') { const a = r.arms; if (a.length < 2 && !a.some((x) => x.changer) && !a.some((x) => x.hand.dof >= 6)) refused.push(`${r.name} cannot change its grip: it needs a second hand, a dexterous one, or a changer`); else uses.push(a.some((x) => x.hand.dof >= 6) ? `${a.find((x) => x.hand.dof >= 6)!.hand.name} turns what it holds in its fingers` : a.length >= 2 ? 'it passes a thing from one hand to the other' : `${CHANGER.name} swaps its hand for another`); }
  const ok = !refused.length;
  return { ok, refused, warn, uses, steps: ok ? stepsFor(r, t) : [] };
}
/** A task said as the robot does it: soldering is the LED lesson's own steps (its build's edges), each done by its
 *  hands; the others what they use, in order. */
function stepsFor(r: Robot, t: Task, build: Build = PROTO_BUILD): string[] {
  if (t.id === 'solder') { const [right, left] = [r.arms[0]!, r.arms[1] ?? r.arms[0]!];
    return [`${right.hand.name} on the right takes the iron from its stand in a pen grip; ${left.hand.name} on the left takes the solder's end between its fingertips.`, ...lessonOf(build).steps.map((s) => `${s.do}${s.check ? ` (its camera checks: ${s.check})` : ''}`)]; }
  return canDoUses(r, t);
}
const canDoUses = (r: Robot, t: Task): string[] => [`To ${t.name}: ${t.why}.`];
/** A robot designed for a set of tasks: as many arms as the most hands any task takes; each the least arm that carries
 *  its hand, a changer if a tool bolts on, and the heaviest tool, within the tasks' nearness; a dexterous hand where a
 *  pen grip or a fingertip's press is needed, else the gripper; a sensor for every sense asked for. What no part here
 *  meets is said. */
export function robotFor(ids: string[]): { robot: Robot; can: Record<string, Can>; parts: string[] } {
  const tasks = ids.map((id) => TASKS.find((t) => t.id === id)).filter((t): t is Task => !!t), tools = tasks.flatMap((t) => t.tools.map((id) => TOOLS.find((x) => x.id === id)!));
  const n = Math.max(1, ...tasks.map((t) => t.hands)), changer = tools.some((x) => x.grip === 'flange'), fine = Math.min(Infinity, ...tasks.map((t) => t.precision ?? Infinity));
  const hand = tools.some((x) => x.grip === 'pen' || x.grip === 'press') || tasks.some((t) => t.id === 'regrip') ? HANDS.find((h) => h.dof >= 6)! : HANDS[0]!;
  const load = hand.mass + (changer ? CHANGER.mass : 0) + Math.max(0, ...tools.map((x) => x.mass));
  const arm = [...ARMS].sort((a, b) => a.payload - b.payload).find((a) => a.payload >= load && a.repeat + hand.repeat <= fine) ?? [...ARMS].sort((a, b) => b.payload - a.payload)[0]!;
  // (touch from a sensor only where the hand does not feel its own grip: a Nano17 on a gripper is overloaded, by its 20 N
  // least grip at a pad or by the gripper's own weight turned at the wrist)
  const senses = [...new Set(tasks.flatMap((t) => t.senses))].filter((s) => s !== 'touch' || !hand.feels).map((s) => SENSORS.find((x) => x.sense === s)!).filter(Boolean);
  const robot: Robot = { name: 'the robot', arms: Array.from({ length: n }, () => ({ arm, hand, changer })), senses };
  const parts = [`${n === 1 ? 'one' : n === 2 ? 'two' : n} ${arm.name} arm${n > 1 ? 's' : ''}`, `${hand.name} on each`, ...(changer ? [`${CHANGER.name} on each wrist (air at ${CHANGER.air} bar)`] : []), ...senses.map((s) => s.name)];
  return { robot, can: Object.fromEntries(tasks.map((t) => [t.id, canDo(robot, t)])), parts };
}
/** "Design a robot that can weld, solder and type", "can the robot weld": the robot those tasks make, and what it can
 *  and cannot do, said; null when the words are not about it. */
export function robotWords(text: string): string | null {
  const ids = robotTasks(text); if (!ids) return null;
  const d = robotFor(ids), lines = Object.entries(d.can).map(([id, c]) => `${TASKS.find((x) => x.id === id)!.name}: ${c.ok ? `yes (${c.uses.join('; ')})` : `no (${c.refused.join('; ')})`}${c.warn.length ? `; mind: ${c.warn.join('; ')}` : ''}`);
  return `A robot for that: ${d.parts.join(', ')}. ${lines.join('. ')}.`;
}
/** The tasks words ask a robot for ("a robot that can weld, solder and type": weld, solder, type), or null when the
 *  words are not about one. */
export function robotTasks(text: string): string[] | null {
  const t = text.toLowerCase(); if (!/\brobot\b/.test(t) || !/\b(design|make|build|can|could|able)\b/.test(t)) return null;
  const WORD: [RegExp, string][] = [[/\bgrab|pick (things )?up|\bhold\b/, 'grab'], [/\bsolder/, 'solder'], [/\btrim|\bcut leads?/, 'trim'], [/\bweld/, 'weld'], [/\btype|keyboard|computer/, 'type'], [/\bhear|listen/, 'hear'], [/\bsmell|sniff/, 'smell'], [/\bsee|vision|camera|sight/, 'see'], [/\b(regrip|change (its|his|her) (own )?grip|any tool|tools?)\b/, 'regrip']];
  const ids = WORD.filter(([re]) => re.test(t)).map(([, id]) => id); return ids.length ? ids : null;
}
