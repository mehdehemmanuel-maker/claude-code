// Embodiment (docs/NEXUS-FROM-REALITY.md, section 28): what the generator made, built as hardware that exists. It
// reads only the generator's elements and the intent's regions: the conversions that drive along axes and their
// travels, the region where matter flows and what holding it there takes, the observers and the resolution each needs,
// the guard and what a person may touch, the supply the site gives. From them:
//
//   stacking     the slowest axis carries the heaviest load, the fastest the least: the axis that steps between
//                layers carries what is deposited on, the others carry each other and the head (taxonomy: placement)
//   head         the hot end designed from the flow region (src/nexus/embody/heater.ts)
//   axes         each designed for what it carries (src/nexus/embody/axis.ts), the carried mass found by designing
//                from the head outward, since each axis's mass is the next one's payload
//   support      what is deposited on, a plate that bends within its share under the largest part's weight, held
//                from one side or, where that bends too far, from both
//   frame        slotted profiles closing round everything it carries, corner brackets, feet
//   intent       the front faces the person; the supply enters on the side the site's supply is on; the matter is
//                fed from the side its store is; the guard encloses everything hotter than a person may touch
//   electrical   every load's cable and circuit (src/nexus/embody/electrical.ts)
//
// Then the whole is checked against its principles, the flaws' remedies applied, and it is embodied again: each round
// kept, so how it came to be is part of what it is.

import { MATERIALS } from '../../data/materials';
import type { Structure } from '../manifold';
import type { Intent } from '../want';
import { toSI } from '../../ganglia/units';
import { axisFor, type LinearAxis } from './axis';
import { designElectrical, type Electrical, type Load } from './electrical';
import { hotEndFor, STREAM_PITCH, type HotEnd } from './heater';
import { boxOf, extentOf, part, placeParts, type Flaw, type Part, type V3, type Value } from './part';
import { PROFILE_2020, stockScrew } from './stock';
import { floatingClusters } from './tree';

const mm = 1e-3, g0 = 9.80665;
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;

/** One design step inside a round: a sub-loop's own round (the head, an axis, a motor) or the whole checked. */
export interface Step { stage: 'head' | 'motor' | 'axis' | 'wiring' | 'whole' | 'frame' | 'choose'; where: string; round: number; says: string; flaws: Flaw[]; remedy: string | null }
export interface Round { n: number; flaws: Flaw[]; remedies: string[]; parts: number; mass: number; choices: Choices; snapshot: Part[]; trace: Step[] }
/** How a drive's motor turns what it moves: a wheel through a ratio, a rotor's thrust, a propeller's push. */
export type DriveMap =
  | { kind: 'wheel'; r: number; G: number; share: number }
  | { kind: 'rotor'; n: number; Th: number; Qh: number; wh: number }
  | { kind: 'propeller'; share: number; D: number; rho: number; J: number };
/** What a motor is, thermally and electrically, as designed: its rated point, its losses there, how fast it warms. */
export interface MotorPlant { T: number; w: number; Kt: number; Pcu: number; Pfe: number; mass: number; Tw: number; ambient: number; limit: number }
/**
 * A machine as something to operate (src/nexus/embody/operate.ts): what it moves and against what, each drive and the
 * motor in it, what stores and carries its power, or the room it keeps and the heat it has. Data, from the designers.
 */
export interface Plant {
  move?: { mass: number; vTop: number; accel: number; decel: number; grade: number; range: number; resist: [number, number][]; hover?: { thrust: number } };
  drives: { node: string; map: DriveMap; motor: MotorPlant; circuit: string | null }[];
  store?: { node: string; E: number; V: number; Imax: number };
  conductors: { node: string; awg: number; n: number; ins: string; I: number }[];
  hold?: { node: string; heat: number; UA: number; C: number; Tlo: number; Tcold: number; gains: number };
}
/** A decision the embodiment made: what it asked, what it read, the law that decided, what it tried, and what came of it. */
export interface Gate { id: string; question: string; inputs: { name: string; value: number; unit: string }[]; law: string; tried: string[]; outcome: string; held: boolean }
export interface Machine {
  name: string; parts: Part[]; values: Value[]; flaws: Flaw[]; rounds: Round[]; trace: Step[];
  /** The decisions that shaped it, each by a law (the general embodiment's; the printer's are its remedies). */
  gates?: Gate[];
  /** It as something to operate, where its designers say how. */
  plant?: Plant;
  axes: LinearAxis[]; hotEnd: HotEnd | null; electrical: Electrical | null;
  size: V3; bom: { name: string; qty: number; material: string; category: string; mass: number }[];
  config: { name: string; value: number; unit: string; law: string }[];
  order: string[];
}

export interface Choices { bedSupport: 1 | 2; bedT: number; streams: number; /** Room added inside the frame, in x, y and z, where a moving part swept through a fixed one. */ room: V3; /** Remedies found not to relieve the flaw they were applied for: no longer applied. */ exhausted: string[] }

/** The share of a line's time spent at full speed, the rest changing speed at its ends: a choice, a tenth of the day. */
export const AT_SPEED = { value: 0.9, confidence: 'choice' as const, source: 'a tenth of the time the part takes spent changing speed at the ends of its lines' };
/** The checks of an axis or the supply that grow with the deposition speed: what more streams at a lower speed relieve. */
const SPEED_BOUND = ['stiff', 'winding-class', 'magnet-grade', 'current-density', 'turns', 'slots', 'headroom', 'outlet', 'ampacity', 'termination', 'bend'];

/** The value of an element by a name pattern, in SI. */
const val = (s: Structure, id: (e: string) => boolean, name: RegExp) => { const e = s.elements.find((x) => id(x.id)); const v = e?.values.find((x) => name.test(x.name)); return v ? toSI(v.value, v.unit) : null; };
const q = (intent: Intent, region: string, name: RegExp) => { const r = intent.regions.find((x) => x.id === region); const l = r && Object.values(r.quantities).find((x) => name.test(x.name)); return l && l.value !== null ? toSI(l.value, l.unit) : null; };

export function embody(intent: Intent, s: Structure, maxRounds = 16, from: Partial<Choices> = {}): Machine | null {
  const axesEls = s.elements.filter((e) => e.kind === 'conversion' && /:(x|y|z)$/.test(e.id));
  const flow = s.elements.find((e) => e.kind === 'region' && e.id.startsWith('flows:'));
  if (!axesEls.length) return null;
  let ch: Choices = { bedSupport: 1, bedT: 6 * mm, streams: 1, room: [0, 0, 0], exhausted: [], ...from };
  let lastSplit: { n: number; worst: number } | null = null;
  const rounds: Round[] = [];
  for (let n = 1; n <= maxRounds; n++) {
    const ch0 = ch, m = once(intent, s, axesEls.map((e) => e.id), flow?.id ?? null, ch);
    const remedies: string[] = [];
    for (const f of m.flaws) {
      if (f.remedy === 'support it from both sides' && ch.bedSupport === 1) { ch = { ...ch, bedSupport: 2 }; remedies.push(f.remedy); }
      else if (f.remedy === 'a thicker plate' && !remedies.includes(f.remedy)) { ch = { ...ch, bedT: ch.bedT + 2 * mm }; remedies.push(f.remedy); }
    }
    // a sweep through something fixed, or no place clear: the frame made larger along it, by as much and 2 mm more
    const room = [...ch.room] as V3;
    for (const f of m.flaws) { const r = f.remedy?.match(/^make room in (x|z)$/); if (r) { const k = r[1] === 'x' ? 0 : 2; room[k] = Math.max(room[k]!, ch.room[k]! + f.value + 2 * mm); } }
    if (room.some((r, k) => r !== ch.room[k])) { remedies.push(`make room: ${room.map((r) => (r * 1e3).toFixed(0)).join(' / ')} mm`); ch = { ...ch, room }; }
    // what grows with the speed is relieved by laying the same flow as more streams, slower: a ∝ v², so a stretch or a
    // sag under m a falls as 1/n²; the power m a v as 1/n³; anything else, one stream more
    const slow = m.flaws.filter((f) => f.remedy === 'split the stream' && f.where !== 'hot end');
    if (slow.length) {
      const n0 = m.hotEnd?.streams ?? ch.streams, worst = Math.max(...slow.map((f) => f.value / f.limit));
      // a remedy that did not relieve what it was applied for is no remedy: each stream also adds the mass that loads
      // the axes, so where the worst of them is no better after a split, the split is undone and the flaw left located
      if (lastSplit && worst >= lastSplit.worst * 0.999) {
        ch = { ...ch, streams: lastSplit.n, exhausted: [...ch.exhausted, 'split the stream'] };
        remedies.push(`split the stream relieved nothing (${lastSplit.worst.toFixed(2)} → ${worst.toFixed(2)} of its limit): undone, ${n0} → ${lastSplit.n}`);
        lastSplit = null;
      } else {
        const n = Math.max(n0 + 1, ...slow.map((f) => Math.ceil(n0 * (f.value / f.limit) ** (f.check === 'stiff' ? 1 / 2 : ['headroom', 'outlet'].includes(f.check) ? 1 / 3 : 0))));
        lastSplit = { n: n0, worst };
        ch = { ...ch, streams: n };
        remedies.push(`split the stream: ${n0} → ${n}`);
      }
    }
    rounds.push({ n, flaws: m.flaws, remedies, parts: m.parts.length, mass: m.parts.reduce((a, p) => a + p.mass, 0), choices: ch0, snapshot: m.parts, trace: m.trace });
    if (!remedies.length) return { ...m, rounds };
  }
  return { ...once(intent, s, axesEls.map((e) => e.id), flow?.id ?? null, ch), rounds };
}

function once(intent: Intent, s: Structure, axisIds: string[], flowId: string | null, ch: Choices): Omit<Machine, 'rounds'> {
  const vals: Value[] = [], flaws: Flaw[] = [], P: Part[] = [], order: string[] = [], trace: Step[] = [];
  const v = (name: string, value: number, unit: string, law: string) => { vals.push({ name, value, unit, law }); return value; };
  const add = (p: Part, group: string) => { P.push(p); if (!order.includes(group)) order.push(group); };
  const al = mat('aluminum.6061-t6');
  // what the intent and the generator say
  const tol = val(s, (id) => id.startsWith('deposit:'), /most position error/) ?? 1e-4;
  const size = q(intent, intent.regions.find((r) => !r.environment)?.id ?? '', /largest part|size/) ?? 0.2;
  const rho = intent.regions.flatMap((r) => Object.values(r.quantities)).find((l) => /density of/.test(l.name))?.value ?? 1240;
  const Vgrid = intent.regions.flatMap((r) => Object.values(r.quantities)).find((l) => /voltage at the wall/.test(l.name))?.value ?? 230;
  const outletW = intent.regions.flatMap((r) => Object.values(r.quantities)).find((l) => /most power the outlet/.test(l.name))?.value ?? 2300;
  // a leaf holds its value in SI: a temperature in kelvin, which the parts' rules read in degrees Celsius
  const celsius = (name: RegExp, dflt: number) => { const l = intent.regions.flatMap((r) => Object.values(r.quantities)).find((x) => name.test(x.name)); return l?.value != null ? l.value - 273.15 : dflt; };
  const ambient = celsius(/room temperature/, 20);
  const filament = intent.regions.flatMap((r) => Object.values(r.quantities)).find((l) => /diameter of the filament/.test(l.name))?.value ?? 1.75e-3;
  const Vbus = 24;
  const travel = (ax: string) => val(s, (id) => id.endsWith(`:${ax}`) && axisIds.includes(id), /travel/) ?? size;
  const resolution = (ax: string) => val(s, (id) => id === `observer:position:deposit:the part:${ax}` || (id.startsWith('observer:position') && id.endsWith(`:${ax}`)), /resolution/) ?? tol / 2;
  const width = v('stream width', 2 * tol, 'm', 'a stream rounds a corner by half its width: at most twice the tolerance');
  const layer = v('layer height', 2 * tol, 'm', 'a sloped face steps by half a layer: at most twice the tolerance');
  const Q = Math.max(val(s, (id) => id.startsWith('use:'), /least flux to fill it in time/) ?? 0, val(s, (id) => id.startsWith('use:'), /least flux/) ?? 0);
  // streams side by side span no more than the part is wide
  const maxStreams = Math.max(1, Math.floor(size / STREAM_PITCH));
  const splitting = (n: number) => n < maxStreams && !ch.exhausted.includes('split the stream');
  const located = (f: Flaw, n: number): Flaw => ({ ...f, remedy: null, says: `${f.says}; more streams ${n >= maxStreams ? `cannot be laid: ${n} already span the part` : 'no longer relieve it: each adds the mass that loads it'} (a gap: an interior laid wider than the surface the tolerance bounds)` });
  // the head first: everything else carries it
  let hotEnd: HotEnd | null = null;
  if (flowId) {
    const melt = val(s, (id) => id === flowId, /least length/) ?? 0.02, Tlo = val(s, (id) => id === flowId, /lowest temperature/) ?? 463, Thi = val(s, (id) => id === flowId, /highest temperature/) ?? 493;
    const power = val(s, (id) => id.startsWith('conversion:energy:') && id.includes(flowId), /least power/) ?? 30;
    const Tg = celsius(/glass transition/, 60);
    const he = hotEndFor({ id: 'hot end', power, Tlo, Thi, melt, stream: filament, width, V: Vbus, ambient, Tg, fan: true, streams: ch.streams, maxStreams });
    hotEnd = he.hotEnd;
    he.history.forEach((h, i) => trace.push({ stage: 'head', where: 'hot end', round: i + 1, says: `${h.streams} stream${h.streams > 1 ? 's' : ''}, ${h.cartridges} cartridge${h.cartridges > 1 ? 's' : ''}`, flaws: h.flaws, remedy: h.flaws.find((f) => f.remedy)?.remedy ?? null }));
    for (const f of hotEnd.flaws) flaws.push(f);
  }
  const streams = hotEnd?.streams ?? ch.streams, eta = AT_SPEED.value;
  // a line of length ℓ laid at v, speeding up and slowing at a, takes ℓ/v + v/a: the flow the generator asked holds
  // only if the speed makes up for the time spent changing it, and the acceleration keeps that time to its share
  const vxy = v('deposition speed', Q > 0 ? Q / (streams * width * layer * eta) : 0.05, 'm/s', `v = Q / (n w h η): the flow the generator asked (${(Q * 1e9).toFixed(1)} mm³/s) laid as ${streams} stream${streams > 1 ? 's' : ''} ${(width * 1e3).toFixed(2)} × ${(layer * 1e3).toFixed(2)} mm, ${eta * 100}% of the time at speed (${AT_SPEED.source})`);
  const axy = v('acceleration', vxy ** 2 / (size * (1 / eta - 1)), 'm/s^2', `a = v² / (ℓ (1/η − 1)): a line as long as the part (${(size * 1e3).toFixed(0)} mm) spends ${((1 - eta) * 100).toFixed(0)}% of its time changing speed (t = ℓ/v + v/a)`);
  // the support: a plate the largest part rests on
  const bed = size + 20 * mm, partMass = v('largest part', size ** 3 * rho, 'kg', `its volume solid at ${rho} kg/m³: what the support must hold`);
  const I = (bed * ch.bedT ** 3) / 12, F = partMass * g0;
  const sag = ch.bedSupport === 1 ? (F * bed ** 3) / (8 * al.E * I) : (5 * F * bed ** 3) / (384 * al.E * I);
  v('support sag', sag, 'm', ch.bedSupport === 1 ? 'held along one edge: δ = q L⁴/(8 E I), the part\'s weight spread over it' : 'held along two edges: δ = 5 q L⁴/(384 E I)');
  const budget = tol / 4;
  if (sag > budget) flaws.push({ check: 'stiff', where: 'support', says: `the support sags ${(sag * 1e6).toFixed(0)} µm under the largest part, past ${(budget * 1e6).toFixed(0)} µm`, law: ch.bedSupport === 1 ? 'δ = q L⁴/(8EI)' : 'δ = 5qL⁴/(384EI)', value: sag, limit: budget, remedy: ch.bedSupport === 1 ? 'support it from both sides' : 'a thicker plate', parts: ['support', 'surface'] });
  const bedMass = bed * bed * ch.bedT * al.density;
  // the axes, from the head outward: x carries the head, y carries x, z carries the support and the part
  const common = { V: Vbus, ambient, counts: 4096, tolerance: tol };
  const headMass = (hotEnd?.mass ?? 0.1) + 0.06;
  // each axis designed by its own loop, and inside it its motor by the motor's: every round of both kept
  const traced = (r: ReturnType<typeof axisFor>): LinearAxis => {
    const a = r.axis;
    a.motorHistory.forEach((m, i) => trace.push({ stage: 'motor', where: `${a.id}/motor`, round: i + 1, says: `stack ${m.aspect.toFixed(2)} of its bore, ${m.grade}, ${m.paths} path${m.paths > 1 ? 's' : ''}, layout ${m.layout + 1}`, flaws: m.flaws, remedy: m.remedy }));
    r.history.forEach((h, i) => trace.push({ stage: 'axis', where: a.id, round: i + 1, says: `${a.drive === 'belt' ? `GT2 ${((h.ask.beltWidth ?? 6e-3) * 1e3).toFixed(0)} mm` : 'lead screw'}, rod size ${(h.ask.rod ?? 0) + 1}, carrying ${h.ask.payload.toFixed(2)} kg at ${(h.ask.v * 1e3).toFixed(0)} mm/s, ${h.ask.a.toFixed(1)} m/s²`, flaws: h.flaws, remedy: h.flaws.find((f) => f.remedy && ['a thicker rod', 'a wider belt'].includes(f.remedy))?.remedy ?? null }));
    return a;
  };
  const x = traced(axisFor({ ...common, id: 'x', name: 'x axis', travel: travel('x'), payload: headMass, a: axy, v: vxy, resolution: resolution('x'), vertical: false }));
  const y = traced(axisFor({ ...common, id: 'y', name: 'y axis', travel: travel('z'), payload: x.moving + x.fixed, a: axy, v: vxy, resolution: resolution('z'), vertical: false }));
  const zs: LinearAxis[] = [];
  for (let k = 0; k < ch.bedSupport; k++) zs.push(traced(axisFor({ ...common, id: ch.bedSupport > 1 ? `z${k + 1}` : 'z', name: ch.bedSupport > 1 ? `z axis ${k + 1}` : 'z axis', travel: travel('y'), payload: (bedMass + partMass) / ch.bedSupport, a: 0.5, v: (2 * layer) / 0.5, resolution: resolution('y'), vertical: true }, 1)));
  for (const a of [x, y, ...zs]) for (const f of a.flaws) flaws.push(a.drive === 'belt' && SPEED_BOUND.includes(f.check) ? (splitting(streams) ? { ...f, remedy: 'split the stream' } : located(f, streams)) : f);

  // ---- where everything goes (the person in front, +z) -----------------------------------------------------------
  // Each thing rests on what holds it, from the ground up: the frame's bottom rails, a base plate inside them, the z
  // axes standing on it, the support on their carriages at the top of their travel (where a print begins), the
  // nozzle a layer above it, the head hanging from x's carriage, x from a bridge under y's carriage, y from members
  // across the frame at its end blocks. Each axis is turned so its carriage faces what it carries and its end blocks
  // face what holds it; where a mount lands and no member is, a member is added, and every member is joined where it
  // meets another. The frame closes round what it holds, and round where its moving parts go.
  const prof = PROFILE_2020, s2 = prof.side / 2, plateT = 3 * mm, plateTop = prof.side + plateT, zGap = 3 * mm;
  const zTurn = (k: number) => (ch.bedSupport === 1 ? 2 : k ? 1 : -1);
  const zEnd = zs[0]!.endHeight;
  const xLocal = placeParts(x.parts, 'x', [0, 0, 0], 2), yLocal = placeParts(y.parts, 'z', [0, 0, 0], 2);
  const xE = extentOf(xLocal), yE = extentOf(yLocal), zE = extentOf(placeParts(zs[0]!.parts, 'y', [0, 0, 0], zTurn(0)));
  const headE = hotEnd ? extentOf(hotEnd.parts) : null;
  const half = (e: { lo: V3; hi: V3 }, k: number) => Math.max(-e.lo[k]!, e.hi[k]!);
  const inX = ch.room[0] + 5 * mm + Math.max(half(xE, 0), headE ? travel('x') / 2 + half(headE, 0) : 0, ch.bedSupport === 2 ? bed / 2 + zGap + zEnd : bed / 2 + 10 * mm);
  const inZ = ch.room[2] + 5 * mm + Math.max(half(yE, 2), travel('z') / 2 + half(xE, 2), headE ? travel('z') / 2 + half(headE, 2) : 0, ch.bedSupport === 1 ? bed / 2 + zGap + zEnd : bed / 2 + 10 * mm);
  const W = 2 * (inX + prof.side), D = 2 * (inZ + prof.side);
  // up from the plate
  const zCentre = plateTop - zE.lo[1], zCarriage = zCentre + travel('y') / 2;
  const supportY = zCarriage, zTop = supportY + ch.bedT / 2;
  const nozzleY = v('nozzle height', zTop + 0.0008 + layer, 'm', 'a layer above the build surface with the support at the top of its travel, where a print begins');
  const headH = hotEnd?.height ?? 0.08;
  // the head hangs from a plate across x's carriage standoffs, its top against the plate
  const headPlateT = 4 * mm;
  const xAxisY = nozzleY + headH + headPlateT + x.carrierTop;
  // the bridge that hangs x from y's carriage: two arms out from the carriage, each carrying the moving mass at its end
  // and half the axis, bending within the tolerance's share: δ = F a³/(3 E I), I = b h³/12
  const reach = x.length / 2, Fb = (x.moving + x.fixed / 2) * g0, bW = x.width;
  const bH = v('bridge depth', Math.max(6 * mm, Math.ceil(((12 * Fb * reach ** 3) / (3 * al.E * bW * budget)) ** (1 / 3) * 1e3) * mm), 'm', `δ = F a³/(3 E I) within ${(budget * 1e6).toFixed(0)} µm: ${(Fb).toFixed(1)} N at the end of a ${(reach * 1e3).toFixed(0)} mm arm, a ${(bW * 1e3).toFixed(0)} mm wide aluminium bar`);
  const bridgeY = xAxisY + x.endHeight / 2 + bH / 2;
  const yAxisY = bridgeY + bH / 2 + y.carrierTop, memberY = yAxisY + y.endHeight / 2 + s2;
  const H = Math.max(memberY + s2, yAxisY + yE.hi[1]) + 5 * mm;
  v('frame', W, 'm', `slotted 20 × 20 profile closing round the x axis and the head's sweep (${(2 * inX * 1e3).toFixed(0)} mm inside), the y axis and the sweep of x across it (${(2 * inZ * 1e3).toFixed(0)} mm), ${(H * 1e3).toFixed(0)} mm high from the plate up`);
  if (ch.room.some((r) => r > 0)) v('room made', Math.max(...ch.room), 'm', `inside made larger where a moving part swept through what is fixed: ${ch.room.map((r) => (r * 1e3).toFixed(0)).join(' / ')} mm in x / y / z`);
  for (const p of placeParts(y.parts, 'z', [0, yAxisY, 0], 2)) add(p, 'y axis');
  add(part({ id: 'x/bridge', name: `bridge bar ${(bW * 1e3).toFixed(0)} × ${(bH * 1e3).toFixed(0)} × ${(x.length * 1e3).toFixed(0)} mm, aluminium, under y's carriage`, category: 'structure/frame', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [x.length, bH, bW] }, at: [0, bridgeY, 0], colour: 0x90a4ae, values: vals.filter((x2) => x2.name === 'bridge depth'), rides: 'y' }, al.density), 'x axis');
  for (const p of placeParts(x.parts, 'x', [0, xAxisY, 0], 2)) add({ ...p, rides: p.rides ?? 'y', ...(p.id.includes('/mount-') ? { into: ['x/bridge'] } : {}) }, 'x axis');
  // the head hangs from x's carriage, its top against the carriage's face
  if (hotEnd) for (const p of hotEnd.parts) add({ ...p, at: [p.at[0], p.at[1] + nozzleY, p.at[2]], rides: 'x' }, 'hot end');
  if (hotEnd) {
    const hx = Math.max(x.carriage.length, extentOf(hotEnd.parts).hi[0] - extentOf(hotEnd.parts).lo[0]), hz = x.carriage.width;
    add(part({ id: 'hot end/mount-plate', name: `head plate ${(hx * 1e3).toFixed(0)} × ${(hz * 1e3).toFixed(0)} × ${headPlateT * 1e3} mm, aluminium, across x's carriage standoffs`, category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [hx, headPlateT, hz] }, at: [0, nozzleY + headH + headPlateT / 2, 0], colour: 0x90a4ae, values: [], rides: 'x', system: 'mount' }, al.density), 'hot end');
    // through the plate and each standoff into the carriage's tapped holes
    const sl = stockScrew(headPlateT + 4 * mm + 6 * mm)!;
    for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1]) add(part({ id: `hot end/mount-screw-${sx2}${sz2}`, name: `M4×${(sl * 1e3).toFixed(0)} socket head cap screw (ISO 4762), head plate through a standoff into the carriage`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M4', length: sl, axis: 'y', head: -1 }, at: [sx2 * (x.carriage.length / 2 - 7 * mm), nozzleY + headH + sl / 2, sz2 * (x.carriage.width / 2 - 7 * mm)], colour: 0x2b2b2b, values: [], rides: 'x', system: 'mount', into: ['hot end/mount-plate', `x/standoff-${sz2}${sx2}`, `x/standoff-${sx2}${sz2}`, 'x/carriage'] }, 7850), 'hot end');
  }
  // the z axes stand on the plate against the frame, their carriages facing the support, arms reaching under it
  const zAt = (k: number): V3 => (ch.bedSupport === 1 ? [0, zCentre, -inZ + zEnd / 2] : [(k ? 1 : -1) * (inX - zEnd / 2), zCentre, 0]);
  zs.forEach((z, k) => {
    const at = zAt(k);
    for (const p of placeParts(z.parts, 'y', at, zTurn(k))) add(p, z.name);
    // an arm from the carriage's face to under the support's edge
    const inward = ch.bedSupport === 1 ? 2 : 0, sgn = ch.bedSupport === 1 ? 1 : k ? -1 : 1;
    // a plate across the carriage's standoffs, and from it the arm under the support's edge
    const pT = 4 * mm, pf = at[inward]! + sgn * z.carrierTop;
    const psize: V3 = inward === 0 ? [pT, z.carriage.length, z.carriage.width] : [z.carriage.width, z.carriage.length, pT], pc: V3 = inward === 0 ? [pf + sgn * pT / 2, zCarriage, 0] : [0, zCarriage, pf + sgn * pT / 2];
    add(part({ id: `support/arm-${k + 1}-plate`, name: `arm plate ${(z.carriage.length * 1e3).toFixed(0)} × ${(z.carriage.width * 1e3).toFixed(0)} × 4 mm, across ${z.name}'s carriage standoffs`, category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: psize }, at: pc, colour: 0x90a4ae, values: [], rides: 'z' }, al.density), 'support');
    const face = pf + sgn * pT, edge = sgn * -bed / 2, span = Math.abs(edge - face) + 20 * mm, c = (face + edge + sgn * 20 * mm) / 2;
    const size: V3 = inward === 0 ? [span, 8 * mm, 40 * mm] : [40 * mm, 8 * mm, span], ac: V3 = inward === 0 ? [c, supportY - ch.bedT / 2 - 4 * mm, 0] : [0, supportY - ch.bedT / 2 - 4 * mm, c];
    add(part({ id: `support/arm-${k + 1}`, name: `support arm ${(span * 1e3).toFixed(0)} × 40 × 8 mm, from ${z.name}'s carriage`, category: 'structure/frame', material: 'aluminum.6061-t6', shape: { kind: 'block', size }, at: ac, colour: 0x90a4ae, values: [], rides: 'z' }, al.density), 'support');
  });
  add(part({ id: 'support', name: `support plate ${(bed * 1e3).toFixed(0)} × ${(bed * 1e3).toFixed(0)} × ${(ch.bedT * 1e3).toFixed(0)} mm, cast aluminium tooling plate`, category: 'structure/frame', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [bed, ch.bedT, bed] }, at: [0, supportY, 0], colour: 0x9e9e9e, values: vals.filter((x2) => x2.name === 'support sag' || x2.name === 'largest part'), rides: 'z' }, al.density), 'support');
  add(part({ id: 'support/surface', name: `build surface ${(bed * 1e3).toFixed(0)} mm square, PEI sheet`, category: 'structure/frame', material: 'PEI', shape: { kind: 'block', size: [bed - 0.004, 0.0008, bed - 0.004] }, at: [0, zTop + 0.0004, 0], colour: 0xc8a046, values: [], rides: 'z' }, 1270), 'support');

  // the frame: posts and rails top and bottom, members where mounts land, a plate inside the bottom rails, feet
  const lenOf = (s3: V3, axis: 'x' | 'y' | 'z') => s3[axis === 'x' ? 0 : axis === 'y' ? 1 : 2];
  const members: { id: string; at: V3; axis: 'x' | 'y' | 'z'; size: V3 }[] = [];
  const member = (id: string, a: V3, size2: V3, axis: 'x' | 'y' | 'z') => { members.push({ id, at: a, axis, size: size2 }); add({ ...part({ id, name: `2020 profile × ${(lenOf(size2, axis) * 1e3).toFixed(0)} mm`, category: 'structure/frame/profile', material: 'aluminum.6061-t6', shape: { kind: 'block', size: size2 }, at: a, colour: 0x8a949e, values: [] }, 0), mass: prof.massPerM * lenOf(size2, axis) }, 'frame'); };
  const sideRail = (id: string, sx: number, y0: number) => member(id, [sx * (W / 2 - s2), y0, 0], [prof.side, prof.side, D - 2 * prof.side], 'z');
  const backRail = (id: string, sz: number, y0: number) => member(id, [0, y0, sz * (D / 2 - s2)], [W - 2 * prof.side, prof.side, prof.side], 'x');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) member(`post ${sx > 0 ? 'right' : 'left'} ${sz > 0 ? 'front' : 'back'}`, [sx * (W / 2 - s2), H / 2, sz * (D / 2 - s2)], [prof.side, H, prof.side], 'y');
  for (const [lvl, y0] of [['bottom', s2], ['top', H - s2]] as const) {
    for (const sz of [-1, 1]) backRail(`rail x ${lvl} ${sz > 0 ? 'front' : 'back'}`, sz, y0);
    for (const sx of [-1, 1]) sideRail(`rail z ${lvl} ${sx > 0 ? 'right' : 'left'}`, sx, y0);
  }
  const at = (y0: number, side: 'left' | 'right' | 'back') => members.some((m) => Math.abs(m.at[1] - y0) < prof.side && (side === 'back' ? m.axis === 'x' && m.at[2] < 0 : m.axis === 'z' && Math.sign(m.at[0]) === (side === 'right' ? 1 : -1)));
  // y hangs from two members across the frame at its end blocks; they meet the sides at their height
  const yEnds = [-1, 1].map((e) => (e * (y.length - 14 * mm)) / 2);
  for (const sx of [-1, 1]) if (!at(memberY, sx > 0 ? 'right' : 'left')) sideRail(`member y side ${sx > 0 ? 'right' : 'left'}`, sx, memberY);
  yEnds.forEach((z0, i) => member(`member y ${i ? 'front' : 'back'}`, [0, memberY, z0], [W - 2 * prof.side, prof.side, prof.side], 'x'));
  // each z axis mounts by its two end blocks to the side it stands against
  zs.forEach((z, k) => {
    const side = ch.bedSupport === 1 ? 'back' : k ? 'right' : 'left';
    for (const e of [-1, 1]) {
      const y0 = zCentre + (e * (z.length - 14 * mm)) / 2;
      if (at(y0, side)) continue;
      if (side === 'back') backRail(`member ${z.id} ${e > 0 ? 'top' : 'bottom'}`, -1, y0); else sideRail(`member ${z.id} ${e > 0 ? 'top' : 'bottom'}`, side === 'right' ? 1 : -1, y0);
    }
  });
  // the mounts thread into the members they land on
  for (const p of P) if (/\/mount-/.test(p.id) && !p.into) { const b = boxOf(p); const near = members.filter((m) => { const B = boxOf({ ...p, shape: { kind: 'block', size: m.size }, at: m.at }); return [0, 1, 2].every((k) => Math.abs(b.c[k]! - B.c[k]!) <= b.h[k]! + B.h[k]! + 1 * mm); }); p.into = near.map((m) => m.id); }
  // joints: an L bracket on the inside faces at each corner of the outer frame, its two legs screwed into a T-nut in
  // each profile; every other member's end tapped and screwed through what it meets
  let joints = 0;
  const screw5 = stockScrew(8 * mm)!;
  // at each corner three members meet: two brackets there would meet in the inside corner, so the rail across the front
  // and back is bracketed and the side rail end-tapped through the post
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const [lvl, y0] of [['b', s2], ['t', H - s2]] as const) for (const along of ['x'] as const) {
    joints++;
    const id = `corner ${sx > 0 ? 'R' : 'L'}${sz > 0 ? 'F' : 'B'}${lvl}${along}`, up = lvl === 'b' ? 1 : -1;
    const fx = sx * (W / 2 - prof.side), fz = sz * (D / 2 - prof.side), t = 4 * mm;
    const post = `post ${sx > 0 ? 'right' : 'left'} ${sz > 0 ? 'front' : 'back'}`, rail = along === 'x' ? `rail x ${lvl === 'b' ? 'bottom' : 'top'} ${sz > 0 ? 'front' : 'back'}` : `rail z ${lvl === 'b' ? 'bottom' : 'top'} ${sx > 0 ? 'right' : 'left'}`;
    // the bracket lies on the rail's inside face; one leg along the rail, one up (or down) the post
    const legs: { leg: string; c: V3; size: V3; into: string }[] = along === 'x'
      ? [{ leg: 'rail', c: [fx - sx * 10 * mm, y0, fz - sz * t / 2], size: [20 * mm, prof.side, t], into: rail }, { leg: 'post', c: [sx * (W / 2 - s2), y0 + up * prof.side, fz - sz * t / 2], size: [prof.side, prof.side, t], into: post }]
      : [{ leg: 'rail', c: [fx - sx * t / 2, y0, fz - sz * 10 * mm], size: [t, prof.side, 20 * mm], into: rail }, { leg: 'post', c: [fx - sx * t / 2, y0 + up * prof.side, sz * (D / 2 - s2)], size: [t, prof.side, prof.side], into: post }];
    for (const l of legs) {
      add(part({ id: `${id}/leg-${l.leg}`, name: 'corner bracket 20 × 20 mm, cast aluminium, one leg', category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: l.size }, at: l.c, colour: 0xb0bec5, values: [] }, al.density), 'frame');
      const ax = along === 'x' ? 'z' : 'x', inward = along === 'x' ? -sz : -sx;
      const sc: V3 = [...l.c]; sc[ax === 'z' ? 2 : 0] = sc[ax === 'z' ? 2 : 0]! + inward * (t / 2 - screw5 / 2) - inward * t / 2;
      add(part({ id: `${id}/screw-${l.leg}`, name: `M5×${(screw5 * 1e3).toFixed(0)} socket head cap screw (ISO 4762) and T-nut`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M5', length: screw5, axis: ax, head: inward as 1 | -1 }, at: sc, colour: 0x2b2b2b, values: [], into: [l.into, `${id}/leg-${l.leg}`] }, 7850), 'frame');
    }
  }
  for (const m of members.filter((m2) => m2.id.startsWith('member') || m2.id.startsWith('rail z'))) for (const e of [-1, 1]) {
    joints++;
    const k = m.axis === 'x' ? 0 : 2, end = [...m.at] as V3; end[k] = end[k]! + (e * lenOf(m.size, m.axis)) / 2;
    const met = members.filter((o2) => o2.id !== m.id && (() => { const B = boxOf({ id: o2.id, name: '', category: '', material: '', mass: 0, values: [], shape: { kind: 'block', size: o2.size }, at: o2.at }); return [0, 1, 2].every((j) => Math.abs(end[j]! - B.c[j]!) <= B.h[j]! + 1 * mm); })()).map((o2) => o2.id);
    const len = stockScrew(prof.side + 10 * mm)!, c = [...end] as V3; c[k] = c[k]! + e * (prof.side - len / 2);
    add(part({ id: `${m.id}/end-screw-${e > 0 ? 'b' : 'a'}`, name: `M5×${(len * 1e3).toFixed(0)} socket head cap screw (ISO 4762), through ${met[0] ?? 'the frame'} into the tapped end`, category: 'structure/joints/bolted', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M5', length: len, axis: m.axis === 'x' ? 'x' : 'z', head: e as 1 | -1 }, at: c, colour: 0x2b2b2b, values: [], into: [m.id, ...met] }, 7850), 'frame');
  }
  v('frame joints', joints, '1', 'an L bracket on the inside face where each front and back rail meets a post, a screw into a T-nut in each leg; each side rail, and every member added where a mount lands, end-tapped and screwed through what it meets');
  add(part({ id: 'base plate', name: `base plate ${((W - 2 * prof.side) * 1e3).toFixed(0)} × ${((D - 2 * prof.side) * 1e3).toFixed(0)} × ${plateT * 1e3} mm, aluminium, inside the bottom rails`, category: 'structure/frame', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [W - 2 * prof.side, plateT, D - 2 * prof.side] }, at: [0, prof.side + plateT / 2, 0], colour: 0x78909c, values: [] }, al.density), 'frame');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(part({ id: `foot ${sx}${sz}`, name: 'rubber foot Ø30 × 15 mm on an M5 stud', category: 'structure/frame', material: 'NBR rubber', shape: { kind: 'round', r: 0.015, length: 0.015, axis: 'y' }, at: [sx * (W / 2 - s2), -0.0075, sz * (D / 2 - s2)], colour: 0x111111, values: [] }, 1300), 'frame');

  // ---- where moving parts go: each sweeps its travel, and nothing fixed may stand in it ------------------------------
  // x's carriage sweeps x's travel and, riding y, y's; what rides y sweeps y's; the support goes down its whole travel
  const boxLH = (p: Part) => { const b = boxOf(p); return { lo: b.c.map((c, k) => c - b.h[k]!) as V3, hi: b.c.map((c, k) => c + b.h[k]!) as V3 }; };
  const sweepOf = (p: Part) => {
    const { lo, hi } = boxLH(p), r = p.rides;
    if (r === 'x' || r === 'y') { lo[2] -= travel('z') / 2; hi[2] += travel('z') / 2; }
    if (r === 'x') { lo[0] -= travel('x') / 2; hi[0] += travel('x') / 2; }
    if (r && /^z/.test(r)) lo[1] -= travel('y');
    return { lo, hi };
  };
  /** The nearest place on the base plate to where it is wanted that is clear of every part and every sweep. */
  const freeAt = (size: V3, want: V3): V3 | null => {
    const boxes = P.filter((p) => p.shape.kind !== 'wire').map((p) => (p.rides ? sweepOf(p) : boxLH(p)));
    const cands: V3[] = [];
    for (let xx = -inX + size[0] / 2; xx <= inX - size[0] / 2 + 1e-9; xx += 10 * mm) for (let zz = -inZ + size[2] / 2; zz <= inZ - size[2] / 2 + 1e-9; zz += 10 * mm) cands.push([xx, plateTop + size[1] / 2 + 0.5 * mm, zz]);
    cands.sort((c1, c2) => Math.hypot(c1[0] - want[0], c1[2] - want[2]) - Math.hypot(c2[0] - want[0], c2[2] - want[2]));
    return cands.find((c) => boxes.every((B) => [0, 1, 2].some((k) => c[k]! + size[k]! / 2 <= B.lo[k]! + 0.5 * mm || c[k]! - size[k]! / 2 >= B.hi[k]! - 0.5 * mm))) ?? null;
  };

  // ---- where the intent puts things: the supply's side, the store's side, the guard ------------------------------------
  const side = (region: string): 'left' | 'right' | 'back' => {
    const r = intent.regions.find((x2) => x2.id === region);
    // the site's regions are placed by what they touch; with nothing to go on, the back
    if (!r) return 'back';
    const i = intent.regions.indexOf(r);
    return (['left', 'back', 'right'] as const)[i % 3]!;
  };
  const grid = intent.regions.find((r) => r.environment && Object.values(r.quantities).some((l) => /voltage at the wall/.test(l.name)));
  const spool = intent.regions.find((r) => Object.values(r.quantities).some((l) => /diameter of the filament/.test(l.name)));
  const face = (f: 'left' | 'right' | 'back', y0: number): V3 => (f === 'left' ? [-W / 2 - 0.01, y0, -D / 4] : f === 'right' ? [W / 2 + 0.01, y0, -D / 4] : [W / 4, y0, -D / 2 - 0.01]);
  // the inlet goes through the panel on its side, where nothing of the frame stands behind it
  const inletSide = grid ? side(grid.id) : 'back', INLET: V3 = [0.028, 0.048, 0.032];
  const inletAt = ((): V3 => {
    const want = face(inletSide, 0.07), boxes = P.filter((p) => p.shape.kind !== 'wire').map((p) => (p.rides ? sweepOf(p) : boxLH(p)));
    const size: V3 = inletSide === 'back' ? [INLET[2], INLET[1], INLET[0]] : INLET, k = inletSide === 'back' ? 2 : 0;
    const cands: V3[] = [];
    for (let yy = plateTop + size[1] / 2; yy <= H - prof.side - size[1] / 2; yy += 5 * mm) for (let u = -(k ? inX : inZ) + 20 * mm; u <= (k ? inX : inZ) - 20 * mm; u += 5 * mm) { const c = [...want] as V3; c[1] = yy; c[k ? 0 : 2] = u; c[k] = want[k]! - Math.sign(want[k]!) * (size[k]! / 2 - 6 * mm); cands.push(c); }
    cands.sort((c1, c2) => Math.hypot(c1[1] - want[1], c1[k ? 0 : 2]! - want[k ? 0 : 2]!) - Math.hypot(c2[1] - want[1], c2[k ? 0 : 2]! - want[k ? 0 : 2]!));
    return cands.find((c) => boxes.every((B) => [0, 1, 2].some((j) => c[j]! + size[j]! / 2 <= B.lo[j]! + 0.5 * mm || c[j]! - size[j]! / 2 >= B.hi[j]! - 0.5 * mm))) ?? want;
  })();
  v('supply side', ['left', 'right', 'back'].indexOf(grid ? side(grid.id) : 'back'), '1', `the mains inlet faces ${grid?.id ?? 'the site'}: power enters on the side its source is (taxonomy: placement / face)`);
  add(part({ id: 'inlet', name: 'IEC 60320 C14 inlet with fuse holder and switch', category: 'interconnect/protection', material: 'PC/ABS', shape: { kind: 'block', size: inletSide === 'back' ? [INLET[2], INLET[1], INLET[0]] : INLET }, at: inletAt, colour: 0x111111, values: [] }, 0), 'electronics');
  // the supply nearest the inlet, the controller at the back, each wherever on the plate is clear of everything and
  // of every sweep; where nothing is, the frame is made deeper
  const PSU: V3 = [0.215, 0.03, 0.115], CTL: V3 = [0.1, 0.015, 0.08];
  const placeOn = (id: string, size: V3, want: V3): V3 => {
    const c = freeAt(size, want);
    if (c) return c;
    flaws.push({ check: 'room', where: id, says: `no place on the base plate is clear for the ${id} (${size.map((x2) => (x2 * 1e3).toFixed(0)).join(' × ')} mm)`, law: 'every part in a place of its own, clear of every sweep', value: size[2] + 10 * mm, limit: 0, remedy: 'make room in z' });
    return [want[0], plateTop + size[1] / 2, want[2]];
  };
  const psuAt = placeOn('supply', PSU, [inletAt[0], 0, -inZ]);
  const ctlAt = placeOn('controller', CTL, [-inletAt[0], 0, -inZ]);
  v('electronics', 2, '1', `the supply at ${psuAt.map((x2) => (x2 * 1e3).toFixed(0)).join(', ')} mm and the controller at ${ctlAt.map((x2) => (x2 * 1e3).toFixed(0)).join(', ')} mm: the nearest places on the plate to where they are wanted, clear of every part and every sweep`);
  if (spool) {
    // the store hangs where a member is to hold it: on the side its region is, from the side member nearest the height
    // a person reaches, high enough that the spool clears the ground; an axle from a bracket on the member's outer face,
    // the spool turning on two bearings in its hub
    const sideOf = side(spool.id) === 'back' ? 'right' : side(spool.id), sx = sideOf === 'left' ? -1 : 1, R = 0.1, len = 0.065;
    const on = members.filter((m2) => m2.axis === 'z' && Math.sign(m2.at[0]) === sx && m2.at[1] >= R + 0.02).sort((a2, b2) => Math.abs(a2.at[1] - H * 0.6) - Math.abs(b2.at[1] - H * 0.6))[0];
    const my = on?.at[1] ?? H * 0.6, z0 = -D / 4, x0 = sx * (W / 2);
    add(part({ id: 'spool/bracket', name: 'spool bracket 40 × 40 × 4 mm, aluminium, on the side member', category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [4 * mm, 0.04, 0.04] }, at: [x0 + sx * 2 * mm, my, z0], colour: 0x90a4ae, values: [], ...(on ? { into: [on.id] } : {}) }, al.density), 'spool');
    for (const dz of [-12 * mm, 12 * mm]) add(part({ id: `spool/bracket-screw-${dz > 0 ? 'b' : 'a'}`, name: 'M5×10 socket head cap screw (ISO 4762) and T-nut, spool bracket', category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M5', length: 10 * mm, axis: 'x', head: sx as 1 | -1 }, at: [x0 - sx * 1 * mm, my, z0 + dz], colour: 0x2b2b2b, values: [], into: ['spool/bracket', ...(on ? [on.id] : [])] }, 7850), 'spool');
    const axleL = len + 30 * mm;
    add(part({ id: 'spool/axle', name: `spool axle Ø8 × ${(axleL * 1e3).toFixed(0)} mm, steel, threaded into the bracket`, category: 'motion/guides/shafts', material: 'steel.1018-cd', shape: { kind: 'round', r: 4 * mm, length: axleL, axis: 'x' }, at: [x0 + sx * (4 * mm + axleL / 2), my, z0], colour: 0xd5dbe1, values: [], into: ['spool/bracket'] }, 7850), 'spool');
    const sxc = x0 + sx * (4 * mm + 10 * mm + len / 2);
    for (const e of [-1, 1]) add(part({ id: `spool/bearing-${e > 0 ? 'b' : 'a'}`, name: '608 bearing (8×22×7 mm) in the spool\'s hub', category: 'motion/guides/bearings', material: 'steel.52100', shape: { kind: 'round', r: 11 * mm, length: 7 * mm, axis: 'x', bore: 8 * mm }, at: [sxc + e * (len / 2 - 3.5 * mm), my, z0], colour: 0xdfe4ea, values: [] }, 7800), 'spool');
    const at: V3 = [sxc, my, z0];
    add(part({ id: 'spool', name: `spool of ${spool.id.replace('a spool of ', '')}, Ø200 × 65 mm`, category: 'motion/transmission', material: 'PLA on an ABS reel', shape: { kind: 'round', r: R, length: len, axis: 'x' }, at, colour: 0xf2f2f2, values: [{ name: 'held from', value: my, unit: 'm', law: `the side member nearest a person's reach (${on?.id ?? 'none'}), the spool clear of the ground` }] }, 0), 'spool');
    add(part({ id: 'guide', name: `PTFE guide tube 4 × ${(filament * 1e3 + 0.25).toFixed(2)} mm, spool to head`, category: 'motion/transmission', material: 'PTFE', shape: { kind: 'wire', points: [[at[0], at[1], at[2]], [at[0] * 0.5, H - 0.02, 0], [0, nozzleY + headH, 0]], r: 0.002 }, at, colour: 0xffffff, values: [] }, 2200), 'spool');
  }
  // the guard: panels enclosing everything hotter than the person may touch
  const guardEl = s.elements.find((e) => e.id.startsWith('guard:'));
  if (guardEl) {
    const panel = (id: string, a: V3, size2: V3, name: string) => add(part({ id, name, category: 'safety/guards', material: 'polycarbonate 4 mm', shape: { kind: 'block', size: size2 }, at: a, colour: 0x80deea, values: [{ name: 'safe to touch', value: guardEl.values[0]?.value ?? 333, unit: 'K', law: 'everything hotter than a person may touch lies inside it' }] }, 1200), 'enclosure');
    panel('panel left', [-W / 2 - 0.003, H / 2, 0], [0.004, H, D], 'side panel, polycarbonate 4 mm');
    panel('panel right', [W / 2 + 0.003, H / 2, 0], [0.004, H, D], 'side panel, polycarbonate 4 mm');
    panel('panel back', [0, H / 2, -D / 2 - 0.003], [W, H, 0.004], 'back panel, polycarbonate 4 mm');
    panel('panel top', [0, H + 0.003, 0], [W, 0.004, D], 'top panel, polycarbonate 4 mm');
    panel('door', [0, H / 2, D / 2 + 0.003], [W, H, 0.004], 'front door, polycarbonate 4 mm, hinged left, faces the person');
  }
  add(part({ id: 'switch', name: 'front panel: start/stop button and status display, faces the person', category: 'control/controller', material: 'ABS', shape: { kind: 'block', size: [0.06, 0.04, 0.01] }, at: [W / 2 - 0.06, 0.06, D / 2 + 0.008], colour: 0x263238, values: [] }, 0), 'electronics');

  // ---- electrical: every load, its cable, the supply ----------------------------------------------------------------
  const centre = (prefix: string): V3 => { const ps = P.filter((p) => p.id.startsWith(prefix)); if (!ps.length) return [0, 0, 0]; const c = [0, 0, 0] as V3; for (const p of ps) for (let i = 0; i < 3; i++) c[i]! += p.at[i]! / ps.length; return c; };
  const loads: Load[] = [];
  const motorLoad = (a: LinearAxis, rides: string[]) => {
    const m = a.motor, Pm = m.ask.T * m.ask.w + m.electrical.Pcu + m.electrical.Pfe;
    loads.push({ id: `${a.id} motor`, name: `${a.name} motor`, kind: 'motor', V: Vbus, I: m.electrical.I, P: Pm, conductors: [{ role: 'phase U', fn: 'phase 1' }, { role: 'phase V', fn: 'phase 2' }, { role: 'phase W', fn: 'phase 3' }], at: centre(`${a.id}/motor/housing`), rides, hotAtEnd: m.values.find((x2) => x2.name === 'winding temperature')!.value });
    loads.push({ id: `${a.id} encoder`, name: `${a.name} encoder`, kind: 'sensor', V: 5, I: 0.02, P: 0.1, conductors: [{ role: '5 V', fn: 'sensor supply' }, { role: '0 V', fn: 'sensor return' }, { role: 'A', fn: 'signal' }, { role: 'B', fn: 'signal' }], at: centre(`${a.id}/motor/encoder-board`), rides, hotAtEnd: ambient + 10 });
  };
  motorLoad(x, ['y']); motorLoad(y, []); for (const z of zs) motorLoad(z, []);
  if (hotEnd) {
    loads.push({ id: 'heater', name: 'heater', kind: 'heater', V: Vbus, I: hotEnd.electrical.I, P: hotEnd.electrical.P, conductors: [{ role: '+24 V', fn: 'dc positive' }, { role: 'switched return', fn: 'dc negative' }], at: centre('hot end/cartridge'), rides: ['x', 'y'], hotAtEnd: (hotEnd.ask.Thi - 273.15) });
    loads.push({ id: 'thermistor', name: 'thermistor', kind: 'sensor', V: 3.3, I: 0.005, P: 0.01, conductors: [{ role: 'sense', fn: 'signal' }, { role: '0 V', fn: 'sensor return' }], at: centre('hot end/thermistor'), rides: ['x', 'y'], hotAtEnd: hotEnd.ask.Thi - 273.15 });
    loads.push({ id: 'fan', name: 'heatsink fan', kind: 'fan', V: Vbus, I: 0.05, P: 1.2, conductors: [{ role: '+24 V', fn: 'dc positive' }, { role: '0 V', fn: 'dc negative' }], at: centre('hot end/fan'), rides: ['x', 'y'], hotAtEnd: ambient + 20 });
  }
  // a carrier lies beside its axis on the side away from the drive that sits nearest it
  const carrierSide = (motor: string, k: number) => Math.sign(centre(motor)[k]!) || 1;
  const electrical = designElectrical({ loads, controllerAt: ctlAt, psuAt, inletAt, via: [0, H - 0.03, -D / 2 + 0.03], Vbus, Vmains: Vgrid, outletW, ambient, axes: [{ id: 'x', travel: travel('x'), at: [0, xAxisY, -carrierSide('y/motor/housing', 2) * x.width / 2], dir: [1, 0, 0], across: [0, 0, -carrierSide('y/motor/housing', 2)] }, { id: 'y', travel: travel('z'), at: [-carrierSide('x/motor/housing', 0) * y.width / 2, yAxisY, 0], dir: [0, 0, 1], across: [-carrierSide('x/motor/housing', 0), 0, 0] }], benchAt: [W / 2 + 0.1, -0.015 + 0.0045, D / 4], thermistor: hotEnd ? { R25: 100e3, B: 3950, Tlo: hotEnd.ask.Tlo, Thi: hotEnd.ask.Thi, resolution: val(s, (id) => id.startsWith('observer:energy'), /resolution/) ?? 15 } : null });
  trace.push({ stage: 'wiring', where: 'wiring', round: 1, says: `${electrical.cables.length} cables, ${electrical.psu.id}, ${electrical.flaws.length ? `${electrical.flaws.length} flaw${electrical.flaws.length > 1 ? 's' : ''}` : 'every conductor within its insulation and drop'}`, flaws: electrical.flaws, remedy: null });
  // x's carrier rides with x on y's carriage
  for (const p of electrical.parts) add(p.id === 'carrier:x' ? { ...p, rides: 'y' } : p, 'wiring');
  for (const f of electrical.flaws) flaws.push(!f.remedy && SPEED_BOUND.includes(f.check) && /^(x|y) (motor|encoder)$|^supply$|^(x|y)$/.test(f.where) ? (splitting(streams) ? { ...f, remedy: 'split the stream' } : located(f, streams)) : f);
  add(part({ id: 'psu', name: `${electrical.psu.id} power supply, 24 V, ${electrical.psu.W} W, 215 × 115 × 30 mm`, category: 'circuits/power', material: 'steel case', shape: { kind: 'block', size: [0.215, 0.03, 0.115] }, at: psuAt, colour: 0xb0bec5, values: electrical.values.filter((x2) => x2.name === 'supply rating' || x2.name === 'mains current' || x2.name === 'mains fuse'), mass: 0.75 }, 0), 'electronics');
  add(part({ id: 'controller', name: `controller board: ${2 + zs.length} three-phase drivers (≥ ${(Math.max(...[x, y, ...zs].map((a) => a.motor.electrical.I)) * 1.25).toFixed(1)} A), one heater channel, ${2 + zs.length} encoder inputs, a thermistor input`, category: 'control/controller', material: 'FR4', shape: { kind: 'block', size: [0.1, 0.015, 0.08] }, at: ctlAt, colour: 0x1b5e20, values: [], mass: 0.08 }, 0), 'electronics');
  for (const p of electrical.breadboard) add(p, 'breadboard');

  // ---- what is checked of the whole ------------------------------------------------------------------------------
  // no two parts of different assemblies in one place
  const groupOf = (p: Part) => p.id.split('/')[0]!;
  const solid = P.filter((p) => p.shape.kind !== 'wire' && !p.id.startsWith('panel') && p.id !== 'door' && !p.id.startsWith('bb:'));
  // no two solids in one place: each pair of assemblies that overlap is one flaw, located in the parts that overlap
  let clashes = 0;
  const pairs = new Map<string, { a: Part; b: Part; depth: number; parts: Set<string> }>();
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
    const a = solid[i]!, b = solid[j]!;
    if (groupOf(a) === groupOf(b) || a.into?.includes(b.id) || b.into?.includes(a.id)) continue;
    const A = boxOf(a), B = boxOf(b);
    const depth = Math.min(...[0, 1, 2].map((k) => A.h[k]! + B.h[k]! - Math.abs(A.c[k]! - B.c[k]!)));
    if (depth <= 1 * mm) continue;
    clashes++;
    const ga = groupOf(a).replace(/[-\d. ]+$/, ''), gb = groupOf(b).replace(/[-\d. ]+$/, ''), key = [ga, gb].sort().join(' × ');
    const e = pairs.get(key) ?? { a, b, depth: 0, parts: new Set<string>() };
    e.parts.add(a.id); e.parts.add(b.id); if (depth > e.depth) { e.depth = depth; e.a = a; e.b = b; }
    pairs.set(key, e);
  }
  v('interferences', clashes, '1', 'pairs of parts from different assemblies whose boxes overlap by more than a millimetre');
  for (const [key, e] of pairs) flaws.push({ check: 'interference', where: key, says: `${e.a.name} and ${e.b.name} fill the same place, ${(e.depth * 1e3).toFixed(1)} mm deep (${e.parts.size} parts)`, law: 'no two solids in one place', value: e.depth, limit: 1 * mm, remedy: null, parts: [...e.parts] });
  // nothing fixed in a moving part's sweep: where it is, the frame is made larger along the sweep by as much
  const swept = new Map<string, { m: Part; f: Part; depth: number; k: number; parts: Set<string> }>();
  const fixed = solid.filter((p) => !p.rides);
  for (const m of solid.filter((p) => p.rides)) {
    const S = sweepOf(m), box0 = boxLH(m);
    for (const f of fixed) {
      if (groupOf(m) === groupOf(f) || m.into?.includes(f.id) || f.into?.includes(m.id)) continue;
      const F = boxLH(f);
      const over = [0, 1, 2].map((k) => Math.min(S.hi[k]!, F.hi[k]!) - Math.max(S.lo[k]!, F.lo[k]!));
      if (over.some((o2) => o2 <= 1 * mm)) continue;
      // already a clash where it stands, not only as it moves
      if ([0, 1, 2].every((k) => Math.min(box0.hi[k]!, F.hi[k]!) - Math.max(box0.lo[k]!, F.lo[k]!) > 1 * mm)) continue;
      // the frame is made larger toward the wall the fixed part stands against: that is what moves it out of the way
      const fc = boxOf(f).c, k = m.rides && /^z/.test(m.rides) ? 1 : inX - Math.abs(fc[0]!) < inZ - Math.abs(fc[2]!) ? 0 : 2;
      const key = `${groupOf(m).replace(/[-\d. ]+$/, '')} through ${groupOf(f).replace(/[-\d. ]+$/, '')}`;
      const e = swept.get(key) ?? { m, f, depth: 0, k, parts: new Set<string>() };
      e.parts.add(m.id); e.parts.add(f.id); if (over[k]! > e.depth) { e.depth = over[k]!; e.m = m; e.f = f; e.k = k; }
      swept.set(key, e);
    }
  }
  for (const [key, e] of swept) flaws.push({ check: 'sweep', where: key, says: `${e.m.name} sweeps through ${e.f.name} as it travels, ${(e.depth * 1e3).toFixed(1)} mm`, law: 'nothing fixed in what a moving part sweeps', value: e.depth, limit: 1 * mm, remedy: e.k === 1 ? null : `make room in ${e.k === 0 ? 'x' : 'z'}`, parts: [...e.parts] });
  const placed = flaws.filter((f) => f.check === 'interference' || f.check === 'sweep' || f.check === 'room');
  trace.push({ stage: 'whole', where: 'placement', round: 1, says: placed.length ? `${clashes} overlaps and ${swept.size} sweeps through fixed parts` : 'every part in its own place, and nothing fixed where a moving part goes', flaws: placed, remedy: placed.find((f) => f.remedy)?.remedy ?? null });
  // everything held: a load path from the ground to every part, through what it touches or is fastened into
  const loose = floatingClusters(P);
  for (const c of loose) flaws.push({ check: 'held', where: groupOf(c[0]!), says: `${c.length} part${c.length > 1 ? 's' : ''} held by nothing: ${[...new Set(c.map((p) => p.name))].slice(0, 3).join('; ')}`, law: 'every part has a load path to the ground', value: c.length, limit: 0, remedy: null, parts: c.map((p) => p.id) });
  v('load path', P.filter((p) => p.shape.kind !== 'wire').length - loose.reduce((a, c) => a + c.length, 0), '1', 'parts with a path to the ground through what they touch or are fastened into');
  // the hottest thing a person could touch
  if (hotEnd && !guardEl) flaws.push({ check: 'reach', where: 'hot end', says: 'the hot end is within reach with no guard', law: 'the want on what a person may touch', value: hotEnd.ask.Thi, limit: 333, remedy: null });

  // ---- the configuration the controller is given ---------------------------------------------------------------
  const config = [x, y, ...zs].map((a) => ({ name: `${a.name}: counts per mm`, value: a.ask.counts / (a.drive === 'belt' ? (2 * Math.PI * (20 * 2e-3) / (2 * Math.PI)) * 1e3 : a.values.find((x2) => x2.name === 'lead screw')!.value * 1e3), unit: '1/mm', law: a.drive === 'belt' ? 'encoder counts over the 40 mm a 20-tooth GT2 pulley moves a turn' : 'encoder counts over the lead' }));
  if (electrical.divider) config.push({ name: 'thermistor: fixed resistor', value: electrical.divider.Rfixed, unit: 'Ω', law: 'the divider resistor (E24)' }, { name: 'thermistor: R25, B', value: electrical.divider.R25, unit: 'Ω', law: 'B = 3950' });
  config.push({ name: 'speed', value: vxy * 1e3, unit: 'mm/s', law: 'the deposition speed' }, { name: 'acceleration', value: axy * 1e3, unit: 'mm/s²', law: 'the acceleration' }, { name: 'layer height', value: layer * 1e3, unit: 'mm', law: 'twice the tolerance at most' });

  // ---- the bill of materials ---------------------------------------------------------------------------------------
  const bomMap = new Map<string, { name: string; qty: number; material: string; category: string; mass: number }>();
  for (const p of P) { const k = p.name; const e = bomMap.get(k) ?? { name: p.name, qty: 0, material: p.material, category: p.category, mass: 0 }; e.qty++; e.mass += p.mass; bomMap.set(k, e); }
  const bom = [...bomMap.values()].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  return { name: intent.name, parts: P, values: vals, flaws, axes: [x, y, ...zs], hotEnd, electrical, size: [W, H, D], bom, config, order, trace };
}
