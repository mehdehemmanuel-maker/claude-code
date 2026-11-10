// The kit of machine sub-assemblies (decision 0029, wave 14: "a more full library too, take some weight off of having to
// invent every single piece"; then, the user: "No no toys this is a superior cad ai"): the mid-level blocks machines are
// made of, at working scale. Four are engineered from what is asked of them (seed.tracked-base, seed.wheeled-chassis,
// seed.lift-mast, seed.claw): their inputs are requirements (a payload, a lift, a speed, a grade, a pressure), a sizing
// function works every load-carrying size out by hand formula (bending, torsion, shear, Euler's strut, ground pressure)
// against the app's own yield strengths, picks sections, cylinders and bushings from the library's own tables, and writes
// a report of the numbers; the sizing runs in a Code node of the seed's board, so it is there to read and its outputs are
// the seed's. The rest (a dozer blade, a cab, a turret, a cube frame, a booth, a conveyor, a chute, a bin, a cargo bed, a
// hovercraft hull) are sized by proportion from their main sizes only (typical, recalled: none is a rated figure): not
// yet to that standard. Each seed is two boards: its pieces (room.make, piece.* and the room's operations, every size a
// setting), and round it the block the library shows: its inputs, the sizing (or a formula for each size), wired into the
// pieces' board (an input bound to inner settings sets them as given, so a size worked out is worked out outside).
// Nothing here places by number: onto, over, ring and turn give every place. Where a piece moves it goes over its shaft
// at the clear or slide fit, drawn with no bore: over bores it and writes the joint (root 6).
// Loaded by one import in seeds.ts, after vehicles.ts.

import { Asm, FULL, layOut } from './board';
import { getMaterial } from '../../data/materials';
import { MATTER } from '../matter';
import { MOTORS } from '../../data/motors';
import { PART_FAMILIES } from '../parts/maker';
import '../parts';
import type { Type } from '../blocks';

// ---- the tables an engineered seed sizes from: the library's own rows, read here once and carried into its sizing code ----
const yieldOf = (mat: string): number => getMaterial(MATTER[mat]!.handbook!).yield;
const rowsOf = <R>(id: string): Record<string, R> => (PART_FAMILIES.get(id) as unknown as { rows: Record<string, R> }).rows;
/** What sizing reads: steel hollow sections (name, B, H, t in mm, the elastic section modulus about the axis across its
 *  depth H in mm³ and the mass a metre, both from the sharp-cornered rectangle: its corner radii left out, about 2 % high),
 *  lightest first; ISO 6020-2 cylinders (bore, rod, mm); plain bushings' bores (ISO 4379, mm); yield strengths (Pa, the
 *  app's handbook rows for steel-low, AISI 1018 cold drawn, and steel-alloy, AISI 4140 quenched and tempered); E (Pa). */
/** Each datasheet motor's label and rated power, W (src/data/motors.ts; a row with no rated power counts as none). */
const MOTOR_POWERS: [string, number][] = Object.values(MOTORS).map((m) => [m.label, (m as { published?: { rated?: { power?: number } } }).published?.rated?.power ?? 0]);
const T = {
  shs: Object.entries(rowsOf<{ kind: string; H: number; B: number; t: number }>('piece.hollowsection')).filter(([, q]) => q.kind === 'R')
    .map(([n, q]) => [n, q.B, q.H, q.t, (q.B * q.H ** 3 - (q.B - 2 * q.t) * (q.H - 2 * q.t) ** 3) / (6 * q.H), (q.B * q.H - (q.B - 2 * q.t) * (q.H - 2 * q.t)) * 1e-6 * 7850] as [string, number, number, number, number, number]).sort((a, b) => a[5] - b[5]),
  cyl: Object.entries(rowsOf<{ rod: number }>('piece.hydcylinder')).map(([b, q]) => [Number(b), q.rod] as [number, number]).sort((a, b) => a[0] - b[0]),
  bush: Object.keys(rowsOf<unknown>('piece.bushing')).map(Number).sort((a, b) => a - b),
  motorMaxW: Math.max(...MOTOR_POWERS.map((m) => m[1])), motorMax: MOTOR_POWERS.sort((a, b) => b[1] - a[1])[0]![0],
  Ylow: yieldOf('steel-low'), Yalloy: yieldOf('steel-alloy'), E: getMaterial(MATTER['steel-low']!.handbook!).E, g: 9.80665,
};
type Tables = typeof T;
type Sized = Record<string, number | string>;


type V = number | string;
/** A seed of two boards: `raw`, its pieces; and the block saved, whose inputs feed a formula for each size. A setting
 *  written "=…" is a formula over the inputs' names (plain arithmetic), worked out here at the defaults too. */
class Kit {
  readonly raw: Asm; private readonly ins: [string, number, string][] = []; private readonly ex = new Map<string, string[]>();
  private choice?: { name: string; def: string; choices: string[]; says: string; builds: Record<string, string> };
  constructor(private readonly title: string, private readonly domains: string[]) { this.raw = new Asm(`${title}: its pieces`); }
  in(name: string, def: number, says: string): void { this.ins.push([name, def, says]); }
  /** Sizing by calculation: a function of the inputs and the tables, self-contained (it is carried into a Code node as
   *  its text), giving every size, every part picked from the library's rows and the report. A setting written "=key"
   *  then takes that key of what it gives; `report` names the keys the seed gives as outputs of its own. */
  private fn?: (i: Record<string, number>, T: Tables) => Sized; private outsOf: string[] = []; S: Sized = {};
  sized(fn: (i: Record<string, number>, T: Tables) => Sized, outs: string[]): void { this.fn = fn; this.outsOf = outs; this.S = fn(Object.fromEntries(this.ins.map((i) => [i[0], i[1]])), T); }
  val(e: string): number | string { if (this.fn) { if (!(e in this.S)) throw new Error(`${this.title}: sizing gives no "${e}"`); return this.S[e]!; } return this.num(e); }
  private num(e: string): number { return Math.round(Number(new Function(...this.ins.map((i) => i[0]), `return (${e});`)(...this.ins.map((i) => i[1]))) * 1000) / 1000; }
  private bind(id: string, set: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(set)) { if (typeof v === 'string' && v.startsWith('=')) { const e = v.slice(1); (this.ex.get(e) ?? this.ex.set(e, []).get(e)!).push(`${id}.${k}`); out[k] = this.val(e); } else out[k] = v; }
    return out;
  }
  n(block: string, set: Record<string, unknown>, label: string, id: string): string { return this.raw.n(block, this.bind(id, set), label, id); }
  op(id: string, block: string, set: Record<string, unknown>, label: string, ins: Record<string, string | string[]>): string { return this.raw.op(id, block, this.bind(id, set), label, ins); }
  box(id: string, name: string, a: V, b: V, c: V, mat = 'steel-low', more: Record<string, unknown> = {}): string { return this.n('room.make', { name, shape: 'box', mat, a, b, c, ...more }, name, id); }
  rod(id: string, name: string, r: V, h: V, mat = 'steel-low'): string { return this.n('room.make', { name, shape: 'rod', mat, a: r, b: h }, name, id); }
  tube(id: string, name: string, bore: V, r: V, h: V, mat = 'steel-low'): string { return this.n('room.make', { name, shape: 'tube', mat, a: bore, b: r, c: h }, name, id); }
  turn(id: string, from: string, axis: string, degrees: V = 90): string { return this.op(id, 'room.turn', { axis, degrees }, `Turned about ${axis}`, { block: from }); }
  /** Blocks end to end along an axis, in the order written: each put onto the +face of what is there so far (a chain of
   *  onto, so a block that goes in twice goes where it is written). */
  stack(id: string, _name: string, axis: string, ids: string[], fit = 'touch', end = 'mid'): string {
    let last = ids[0]!; ids.slice(1).forEach((c, i) => { last = this.onto(i === ids.length - 2 ? id : `${id}_${i}`, last, c, `+${axis}`, end, fit); }); return last;
  }
  onto(id: string, host: string, child: string, face: string, end = 'mid', fit = 'touch'): string { return this.op(id, 'room.onto', { face, fit, end }, `Onto its ${face} face`, { host, child }); }
  over(id: string, host: string, sleeve: string, line: string, where = 'mid', fit = 'clear'): string { return this.op(id, 'room.over', { line, where, fit }, `Over ${line}, ${fit}`, { host, sleeve }); }
  /** A wheel over its own axle (clear: it turns), the axle laid across (along x). */
  wheel(id: string, name: string, r: V, w: V, axR: V, axL: V, mat = 'steel-low'): string {
    this.rod(`${id}_w`, name, r, w, mat); this.rod(`${id}_a`, `${name} axle`, axR, axL, 'steel-alloy');
    this.over(`${id}_o`, `${id}_a`, `${id}_w`, `${name} axle/axis`); return this.turn(id, `${id}_o`, 'z');
  }
  /** One of several builds by a choice. */
  pick(name: string, def: string, choices: string[], says: string, builds: Record<string, string>): void { this.choice = { name, def, choices, says, builds }; }
  save(id: string, name: string, says: string, gloss: string, last: string): void {
    const top = new Asm(this.title, FULL, this.domains), c = this.choice;
    for (const [n, d, s] of this.ins) top.input(n, 'number', d, s);
    if (c) { top.input(c.name, 'text', c.def, c.says, c.choices); this.raw.input(c.name, 'text', c.def, c.says, c.choices); this.raw.picked(`in_${c.name}`, name, c.builds); } else this.raw.outs(last);
    const fed: [string, string][] = []; let j = 0;
    for (const [e, targets] of this.ex) { const v = this.fn ? `s_${e}` : `v${j++}`, d = this.val(e); this.raw.input(v, typeof d === 'number' ? 'number' : 'text', d, this.fn ? `${e}, from the sizing` : `${e}, mm`, [], targets.join('; ')); fed.push([v, e]); }
    layOut(this.raw.b);
    top.b.nodes.kit = { label: `${name}: its pieces, each size worked out from the inputs`, inner: this.raw.b, set: {}, x: 0, y: 0 };
    if (this.fn) {
      const names = this.ins.map((i) => i[0]), keys = Object.keys(this.S);
      top.n('code', { lang: 'js', inputs: names.join(', '), outputs: keys.join(', '), code: `const T = ${JSON.stringify(T)};\nconst size = ${this.fn.toString()};\nreturn size({ ${names.join(', ')} }, T);` }, `${name}: sized by calculation from what is asked of it`, 'sizing');
      for (const nm of names) top.w(`in_${nm}`, 'value', 'sizing', nm);
      for (const [v, e] of fed) top.w('sizing', e, 'kit', v);
      for (const o of this.outsOf) top.output(o, (typeof this.S[o] === 'number' ? 'number' : 'text') as Type, 'sizing', o);
    } else for (const [v, e] of fed) { const m = top.n('math.expr', { expr: e }, e, `f_${v}`); for (const [nm] of this.ins) if (new RegExp(`\\b${nm}\\b`).test(e)) top.w(`in_${nm}`, 'value', m, nm); top.w(m, 'result', 'kit', v); }
    if (c) top.w(`in_${c.name}`, 'value', 'kit', c.name);
    top.outs('kit'); top.save(id, name, says, gloss);
  }
}
const CORNERS = ['lo,lo', 'hi,lo', 'lo,hi', 'hi,hi'];

// ---- a tracked undercarriage --------------------------------------------------------------------------------------------
/** The undercarriage sized from its payload (kg), travel speed (m/s), the grade it climbs (%), its length and width (mm).
 *  Gross weight: the payload and 0.6 of it for the undercarriage and what it carries (an estimate). Track width: the
 *  narrowest stock width that keeps the ground pressure (gross weight over two tracks' contact, 0.78 of the length) at
 *  or under 50 kPa (soft ground, typical). Cross members: two, each half the payload with a dynamic factor of 1.5 at the
 *  middle of the span between the tracks' centres, simply supported: the lightest hollow section whose bending stress
 *  stays under yield over 2. Sprocket shafts: the tractive effort (the grade and 0.08 rolling resistance, typical of
 *  tracks on soil), half a side, at the sprocket's radius, in torsion at 0.577 of yield over 3. Drive power: effort times
 *  speed over 0.85 (drive efficiency, typical). */
function trackSizing(i: Record<string, number>, T: Tables): Sized {
  const r1 = (v: number) => Math.round(v * 10) / 10, gross = i.payload! * 1.6, W = gross * T.g, L = i.length!, contact = (0.78 * L) / 1000;
  const widths = [150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800], track = widths.find((w) => W / (2 * (w / 1000) * contact) <= 50e3) ?? 800, ground = W / (2 * (track / 1000) * contact);
  const span = (i.width! - track) / 1000, Mx = ((i.payload! * T.g * 1.5) / 2) * (span / 4), Zreq = ((Mx * 2) / T.Ylow) * 1e9, sec = T.shs.find((q) => q[1] === q[2] && q[4] >= Zreq) ?? T.shs[T.shs.length - 1]!, crossStress = Mx / (sec[4] * 1e-9);
  const th = Math.atan(i.grade! / 100), TE = W * (Math.sin(th) + 0.08 * Math.cos(th)), R = (0.11 * L) / 1000, torque = (TE / 2) * R;
  const dMin = Math.cbrt((16 * torque * 3) / (Math.PI * 0.577 * T.Yalloy)) * 1000, shaft = Math.ceil(dMin / 5) * 5, shear = (16 * torque) / (Math.PI * (shaft / 1000) ** 3);
  const power = (TE * i.speed!) / 0.85, rpm = (i.speed! / (2 * Math.PI * R)) * 60, plateT = 20, crossL = i.width! - 2 * track - 2 * plateT;
  const steel = r1(2 * (crossL / 1000) * sec[5] + 7850 * (2 * plateT * 0.12 * L * 0.98 * L + crossL * 12 * 0.6 * L + 2 * track * 0.048 * L * 0.76 * L) * 1e-9);
  return { track, R: 0.11 * L, wheelW: track * 0.8, rw: 0.07 * L, rwAx: Math.max(10, 0.015 * L), axR: shaft / 2, runT: 0.015 * L, C: 0.78 * L, beamH: 0.048 * L, beamL: 0.76 * L, plateT, plateH: 0.12 * L, plateL: 0.98 * L, section: sec[0], crossL, deckL: 0.6 * L, deckT: 12, deckPcd: Math.min(0.12 * L, crossL / 2 - 30),
    groundkPa: r1(ground / 1000), crossStressMPa: r1(crossStress / 1e6), crossSafety: r1(T.Ylow / crossStress), effortkN: r1(TE / 1000), shaftTorqueNm: r1(torque), shaftMm: shaft, shaftShearMPa: r1(shear / 1e6), shaftSafety: r1((0.577 * T.Yalloy) / shear), powerkW: r1(power / 1000), sprocketRpm: r1(rpm), steelKg: steel,
    report: `Payload ${i.payload} kg; gross taken as ${r1(gross)} kg (0.6 of the payload for the undercarriage and what stands on it: an estimate). Tracks ${track} mm wide: ${r1(ground / 1000)} kPa on the ground over ${r1(contact * 1000)} mm of contact each (50 kPa asked)${ground > 50e3 ? ' (OVER: no stock width keeps it)' : ''}. Cross members: two ${sec[0]} (yield ${T.Ylow / 1e6} MPa) over a ${r1(span * 1000)} mm span, ${r1(Mx)} N m each with a dynamic factor of 1.5: ${r1(crossStress / 1e6)} MPa, safety ${r1(T.Ylow / crossStress)} on yield (2 asked): the governing member${sec[4] < Zreq ? ' (NO section in the table passes: the largest taken)' : ''}. Tractive effort up a ${i.grade} % grade with 0.08 rolling resistance: ${r1(TE / 1000)} kN; each sprocket shaft ${r1(torque)} N m at the Ø${r1(0.22 * L)} mm sprocket: Ø${shaft} mm (AISI 4140 QT) at ${r1(shear / 1e6)} MPa shear, safety ${r1((0.577 * T.Yalloy) / shear)} (3 asked; ${r1(dMin)} mm needed, the next 5 mm taken). Drive: ${r1(power / 1000)} kW at ${i.speed} m/s (efficiency 0.85), ${r1(power / 2000)} kW a side at ${r1(rpm)} rev/min on the sprocket; the largest motor in the library's table gives ${T.motorMaxW} W (${T.motorMax}): ${power / 2 > T.motorMaxW ? 'rating not in the table, so no motor and reduction is drawn (a hydraulic motor or an engine of that power is not in the library)' : 'it would do, with a reduction'}. Steel in cross members, side frames, deck and track frames: about ${steel} kg. Joints taken as welded; not drawn: the drive, the track's wrap round the end wheels and its links, the idler's tensioner, the wheels' bearings` };
}
function trackedBase(): void {
  const k = new Kit('A tracked undercarriage', ['mechanical', 'vehicles', 'robotics']);
  k.in('payload', 2000, 'the payload it carries, kg'); k.in('speed', 1, 'its travel speed, m/s'); k.in('grade', 30, 'the grade it climbs, %'); k.in('length', 2400, 'its length over the tracks, mm'); k.in('width', 1800, 'its width over both tracks, mm');
  k.sized(trackSizing, ['report', 'track', 'section', 'groundkPa', 'crossStressMPa', 'crossSafety', 'effortkN', 'shaftTorqueNm', 'shaftMm', 'shaftShearMPa', 'shaftSafety', 'powerkW', 'sprocketRpm', 'steelKg']);
  k.wheel('spr', 'sprocket', '=R', '=wheelW', '=axR', '=track');
  k.wheel('idl', 'idler', '=R', '=wheelW', '=axR', '=track');
  k.wheel('rw', 'road wheel', '=rw', '=wheelW', '=rwAx', '=track');
  k.stack('row', 'road wheels', 'z', ['rw', 'rw', 'rw', 'rw', 'rw'], 'clear');
  k.box('beam', 'track frame', '=track', '=beamH', '=beamL');
  k.onto('core', 'row', 'beam', '+y', 'mid', 'clear');
  k.box('run', 'track run', '=track', '=runT', '=C', 'rubber');
  k.onto('m1', 'core', 'run', '-y', 'mid', 'clear');
  k.onto('mid', 'm1', 'run', '+y');
  k.stack('unit', 'track', 'z', ['spr', 'mid', 'idl'], 'clear');
  k.box('plate', 'side frame', '=plateT', '=plateH', '=plateL');
  k.n('piece.hollowsection', { size: '=section', length: '=crossL' }, 'A cross member, picked by bending', 'xm0'); k.turn('xm', 'xm0', 'y');
  k.box('deck0', 'undercarriage deck', '=crossL', '=deckT', '=deckL', 'steel-low', { holes: 8, pcd: '=deckPcd', hole: 9 });
  k.onto('d1', 'deck0', 'xm', '-y', 'mid,lo'); k.onto('deck', 'd1', 'xm', '-y', 'mid,hi');
  k.stack('base', 'tracked undercarriage', 'x', ['unit', 'plate', 'deck', 'plate', 'unit']);
  k.save('seed.tracked-base', 'Tracked undercarriage (crawler tracks)', 'A tracked undercarriage for a bulldozer, an excavator or a tracked carrier, engineered from its payload (kg), travel speed (m/s), the grade it climbs (%), its length and width (mm); default 2 t at 1 m/s up a 30 % grade. Sized by calculation (its report output says each number): the track width from the ground pressure (50 kPa asked), two cross members between the tracks picked from the library\'s steel hollow sections by bending, the sprocket shafts by torsion from the tractive effort, the drive power and sprocket speed worked out (the library\'s motor table is checked against it and said). Two crawler tracks, each a sprocket and an idler turning on their shafts with five road wheels between (they turn), a top and a bottom track run, a track frame over the road wheels; a side frame inside each track holding every shaft, and the cross members under a deck with eight holes in a circle to bolt a body, a cab or a turret on. It offers undercarriage deck/holes, and each sprocket axle/axis and idler axle/axis. Not drawn: the drive (motor and reduction), the track\'s links and its wrap round the end wheels, bearings, bolts (joints taken as welded)',
    'Two crawler tracks on sprockets, idlers and road wheels, cross members and a deck between, sized for the payload: what a dozer, an excavator or a tracked carrier stands on', 'base');
}

// ---- a dozer blade -------------------------------------------------------------------------------------------------------
function dozerBlade(): void {
  const k = new Kit('A dozer blade', ['mechanical', 'vehicles']);
  k.in('width', 3000, 'the blade\'s width, mm'); k.in('height', 1000, 'its height, mm'); k.in('arm', 1500, 'the push arms\' length, mm');
  k.box('board', 'mouldboard', '=width', '=height*0.5', '=height*0.04');
  k.box('lip0', 'blade lip', '=width', '=height*0.3', '=height*0.04'); k.turn('lip', 'lip0', 'x', 35);
  k.box('edge0', 'cutting edge', '=width', '=height*0.3', '=height*0.05', 'steel-alloy'); k.turn('edge', 'edge0', 'x', -35);
  k.stack('blade', 'dozer blade', 'y', ['edge', 'board', 'lip'], 'touch', 'lo');
  k.box('wing', 'blade end plate', '=height*0.04', '=height*0.9', '=height*0.3');
  k.stack('winged', 'dozer blade', 'x', ['wing', 'blade', 'wing'], 'touch', 'lo');
  k.box('arm', 'push arm', '=height*0.14', '=height*0.14', '=arm');
  k.onto('a1', 'winged', 'arm', '-z', 'lo,lo'); k.onto('a2', 'a1', 'arm', '-z', 'hi,lo');
  k.rod('pin0', 'blade hinge pin', '=height*0.05', '=width'); k.turn('pin', 'pin0', 'z');
  k.onto('done', 'a2', 'pin', '-z', 'mid,lo');
  k.save('seed.dozer-blade', 'Dozer blade (bulldozer blade on push arms)', 'A bulldozer\'s blade sized by its width, height and push arm length (mm; proportions typical, recalled): a wide blade curved forward in three strips (a cutting edge, the mouldboard, a lip), an end plate each side, two push arms back from its lower corners to a hinge pin across their ends. It offers blade hinge pin/axis, the line it lifts about: put the pin against a chassis\' or a tracked undercarriage\'s front. Drawn fixed (its lift cylinders not drawn)',
    'A wide curved blade on two push arms with a hinge line: the front of a bulldozer, a snow plough', 'done');
}

// ---- a cab ---------------------------------------------------------------------------------------------------------------
function cab(): void {
  const k = new Kit('An operator cab', ['mechanical', 'vehicles']);
  k.in('width', 1200, 'the cab\'s width, mm'); k.in('depth', 1400, 'its depth, mm'); k.in('height', 1600, 'its height, mm');
  k.n('room.make', { name: 'cab body', shape: 'case', mat: 'steel-low', a: '=width', b: '=height*0.4', c: '=depth', d: '=width*0.03', e: '=width*0.03' }, 'cab body', 'tub');
  k.box('post', 'cab pillar', '=width*0.06', '=height*0.54', '=width*0.06');
  let last = 'tub'; CORNERS.forEach((e, i) => { last = k.onto(`p${i}`, last, 'post', '+y', e); });
  k.box('roof', 'cab roof', '=width*1.08', '=height*0.06', '=depth*1.08');
  k.onto('roofed', last, 'roof', '+y');
  k.box('seat', 'cab seat', '=width*0.4', '=height*0.25', '=width*0.4', 'pu');
  k.save('seed.cab', 'Cab (operator cab, equipment housing)', 'An operator\'s cab or an equipment housing sized by its width, depth and height (mm; proportions typical, recalled): a body to waist height (a case open above, walls and floor in one), four pillars at its corners, a roof over them with a small overhang; the four sides between the pillars are its window openings (no glass drawn). Stack it on a chassis, a tracked undercarriage\'s deck or a truck frame; its roof\'s top is flat for a lamp or a sensor',
    'A body, four pillars and a roof with window openings: where the driver of a digger, a forklift, a crane sits', 'roofed');
}

// ---- a forklift mast -------------------------------------------------------------------------------------------------------
/** The mast sized from its rated load (kg), its lift (mm), the load's centre ahead of the fork face (mm) and the system
 *  pressure (bar). Forks: each a cantilever carrying half the load at the load centre, its thickness from bending at a
 *  factor of 3 on yield (the factor ISO 2330 asks of fork arms, recalled). Uprights: the load's moment about them (the load
 *  centre and 200 mm of carriage and fork heel, typical) shared by two, the lightest hollow section whose bending stress
 *  stays under yield over 2. Cylinder: the carriage hangs on chains reeved 2:1 over sheaves on the rod, so the rod pushes
 *  twice the load and 15 % for carriage, forks and friction (typical) over half the lift: the smallest ISO 6020-2 bore that
 *  gives it at the pressure and whose rod, as a pinned strut as long as its stroke, stays under Euler's load over 2.5. The
 *  sheave shaft: the rod's force in double shear at 0.577 of yield over 3, the next bushing bore up. */
function mastSizing(i: Record<string, number>, T: Tables): Sized {
  const F = i.load! * T.g, c = i.centre! / 1000, up5 = (v: number) => Math.ceil(v / 5) * 5, r1 = (v: number) => Math.round(v * 10) / 10;
  const forkW = i.load! <= 1000 ? 80 : i.load! <= 2500 ? 100 : i.load! <= 5000 ? 150 : 200, Mf = (F / 2) * c;
  const forkT = up5(Math.sqrt((6 * Mf * 3) / ((forkW / 1000) * T.Yalloy)) * 1000), forkStress = (6 * Mf) / ((forkW / 1000) * (forkT / 1000) ** 2), forkL = 2 * i.centre! + 150;
  const Mm = F * (c + 0.2), Zreq = (((Mm / 2) * 2) / T.Ylow) * 1e9, sec = T.shs.find((q) => q[4] >= Zreq) ?? T.shs[T.shs.length - 1]!;
  const mastStress = Mm / 2 / (sec[4] * 1e-9), Fc = 2 * F * 1.15, p = i.pressure! * 1e5, stroke = i.lift! / 2;
  const euler = (rod: number) => (Math.PI ** 2 * T.E * ((Math.PI * (rod / 1000) ** 4) / 64)) / (stroke / 1000) ** 2;
  const cyl = T.cyl.find(([bore, rod]) => (p * Math.PI * (bore / 1000) ** 2) / 4 >= Fc && euler(rod) >= 2.5 * Fc), cy = cyl ?? T.cyl[T.cyl.length - 1]!;
  const cylForce = (p * Math.PI * (cy[0] / 1000) ** 2) / 4, pinMin = Math.sqrt((2 * Fc * 3) / (Math.PI * 0.577 * T.Yalloy)) * 1000, pin = T.bush.find((d) => d >= pinMin) ?? T.bush[T.bush.length - 1]!;
  const width = i.load! <= 2500 ? 1000 : 1200, upL = i.lift! + 700, mass = r1(((2 * upL + 2 * width) / 1000) * sec[5] + 2 * 7850 * (forkW / 1000) * (forkT / 1000) * ((forkL + 600) / 1000));
  return { section: sec[0], sectionAxis: `${sec[0]}/axis`, upL, width, forkW, forkT, forkL, bore: String(cy[0]), stroke, pin, pinS: String(pin), shaftR: pin / 2, sheaveR: Math.max(60, 4 * pin), sheaveW: Math.max(30, 1.5 * pin), shaftL: Math.max(240, 8 * pin), backT: Math.max(20, forkT / 2), shoeR: Math.ceil(Math.hypot(sec[1], sec[2]) / 2 + 30),
    forkStressMPa: r1(forkStress / 1e6), forkSafety: r1(T.Yalloy / forkStress), mastStressMPa: r1(mastStress / 1e6), mastSafety: r1(T.Ylow / mastStress), cylNeedkN: r1(Fc / 1000), cylGiveskN: r1(cylForce / 1000), rodEulerkN: r1(euler(cy[1]) / 1000), steelKg: mass,
    report: `Rated ${i.load} kg at a ${i.centre} mm load centre, lifted ${i.lift} mm. Forks: two arms ${forkW} x ${forkT} mm (AISI 4140 QT, yield ${T.Yalloy / 1e6} MPa), each ${r1(Mf)} N m at its heel: ${r1(forkStress / 1e6)} MPa, safety ${r1(T.Yalloy / forkStress)} on yield (3 asked). Uprights: two ${sec[0]} (yield ${T.Ylow / 1e6} MPa), ${r1(Mm / 2)} N m each: ${r1(mastStress / 1e6)} MPa, safety ${r1(T.Ylow / mastStress)} (2 asked): the governing member${sec[4] < Zreq ? ' (NO section in the table passes: the largest taken)' : ''}. Cylinder: chains reeved 2:1, so the rod pushes ${r1(Fc / 1000)} kN over a ${stroke} mm stroke; ISO 6020-2 bore ${cy[0]} mm, rod ${cy[1]} mm gives ${r1(cylForce / 1000)} kN at ${i.pressure} bar, its rod's Euler load ${r1(euler(cy[1]) / 1000)} kN (2.5 times the push asked)${cyl ? '' : ' (NO cylinder in the table passes: the largest taken)'}. Sheave shaft Ø${pin} mm in bushings (double shear, ${r1(pinMin)} mm needed at a factor of 3). Steel in uprights, ties and forks: about ${mass} kg. Not drawn: the lift chains (the chain table gives no breaking load: rating not in the table), the carriage's rollers, the tilt cylinders, bolts and the shaft's retaining clips` };
}
function liftMast(): void {
  const k = new Kit('A forklift mast', ['mechanical', 'vehicles', 'robotics']);
  k.in('load', 1500, 'the rated load, kg'); k.in('lift', 3000, 'the lift height, mm'); k.in('centre', 500, 'the load centre ahead of the fork face, mm'); k.in('pressure', 160, 'the hydraulic pressure, bar');
  k.sized(mastSizing, ['report', 'section', 'bore', 'forkT', 'forkStressMPa', 'forkSafety', 'mastStressMPa', 'mastSafety', 'cylNeedkN', 'cylGiveskN', 'rodEulerkN', 'steelKg']);
  k.n('piece.hollowsection', { size: '=section', length: '=width' }, 'A cross tie, the uprights\' section', 'tie0'); k.turn('tie', 'tie0', 'y');
  k.n('piece.hydcylinder', { size: '=bore', stroke: '=stroke' }, 'The lift cylinder, ISO 6020-2, picked by force and its rod\'s buckling', 'cyl');
  k.rod('shaft', 'sheave shaft', '=shaftR', '=shaftL', 'steel-alloy');
  k.n('piece.bushing', { size: '=pinS', length: '=sheaveW' }, 'A sheave\'s bushing', 'bush');
  k.rod('sheave', 'chain sheave', '=sheaveR', '=sheaveW', 'steel-low');
  k.over('s1', 'shaft', 'bush', 'sheave shaft/axis', 'lo', 'touch'); k.over('s2', 's1', 'sheave', 'sheave shaft/axis', 'lo', 'clear');
  k.over('s3', 's2', 'bush', 'sheave shaft/axis', 'hi', 'touch'); k.over('s4', 's3', 'sheave', 'sheave shaft/axis', 'hi', 'clear');
  k.turn('head', 's4', 'z');
  k.onto('cylh', 'cyl', 'head', '+y');
  k.onto('m0', 'tie', 'cylh', '+y');
  k.n('piece.hollowsection', { size: '=section', length: '=upL' }, 'An upright, picked by bending', 'up0');
  k.rod('shoe', 'carriage shoe', '=shoeR', 400, 'steel-low');
  k.over('up1', 'up0', 'shoe', '=sectionAxis', 'lo', 'slide'); k.turn('up', 'up1', 'x', -90);
  k.onto('m1', 'm0', 'up', '+y', 'lo,mid'); k.onto('m2', 'm1', 'up', '+y', 'hi,mid'); k.onto('c0', 'm2', 'tie', '+y');
  k.box('back', 'fork carriage', '=width', 500, '=backT');
  k.onto('c1', 'c0', 'back', '+z', 'mid,lo');
  k.box('shank', 'fork shank', '=forkW', 600, '=forkT', 'steel-alloy'); k.box('blade', 'fork blade', '=forkW', '=forkT', '=forkL', 'steel-alloy');
  k.onto('fork', 'shank', 'blade', '+z', 'mid,lo');
  k.onto('c2', 'c1', 'fork', '+z', 'lo,lo'); k.onto('mast', 'c2', 'fork', '+z', 'hi,lo');
  k.save('seed.lift-mast', 'Lift mast (forklift mast and forks)', 'A forklift\'s mast engineered from its rated load (kg), lift height (mm), load centre (mm) and hydraulic pressure (bar); default 1500 kg at 500 mm lifted 3 m at 160 bar. Sized by calculation (its report output says each number): two fork arms by bending at a factor of 3 on yield; two uprights, the lightest steel hollow section of the library whose bending stress under the load\'s moment stays under half of yield; an ISO 6020-2 hydraulic cylinder between them picked by bore from the force (chains reeved 2:1: twice the load and 15 %) and by its rod\'s buckling, its rod sliding by half the lift; two chain sheaves in bushings on a shaft on the rod\'s end (they turn), sized by shear; a fork carriage on a shoe sliding on an upright (a slide fit: it moves). It offers the cylinder\'s ports and rod axis and the uprights\' axes; stack its bottom tie on a chassis\' front. Not drawn: the lift chains (the chain table carries no breaking load), the carriage\'s rollers, tilt cylinders, bolts',
    'Two uprights, a hydraulic cylinder, a carriage sliding on them and two forks, each sized for the rated load: what lifts a pallet', 'mast');
}

// ---- a turret ------------------------------------------------------------------------------------------------------------
function turret(): void {
  const k = new Kit('A turret', ['mechanical', 'robotics', 'vehicles']);
  k.in('diameter', 600, 'the turret ring\'s diameter, mm'); k.in('barrel', 800, 'the barrel\'s (nozzle\'s, sensor boom\'s) length, mm');
  k.tube('ring', 'turret ring', '=diameter*0.38', '=diameter*0.5', '=diameter*0.08');
  k.rod('seat', 'turret base', '=diameter*0.5', '=diameter*0.04');
  k.rod('post', 'slewing pivot', '=diameter*0.06', '=diameter*0.2', 'steel-alloy');
  k.stack('b0', 'turret base', 'y', ['seat', 'ring']); k.onto('b1', 'seat', 'post', '+y');
  k.rod('plat', 'turret platform', '=diameter*0.46', '=diameter*0.06', 'al-6061');
  k.over('b2', 'b1', 'plat', 'slewing pivot/axis', 'hi');
  k.box('cheek', 'trunnion cheek', '=diameter*0.05', '=diameter*0.32', '=diameter*0.22', 'al-6061');
  k.rod('trun', 'tilt trunnion', '=diameter*0.04', '=diameter*0.4', 'steel-alloy');
  k.rod('cradle', 'barrel cradle', '=diameter*0.11', '=diameter*0.26', 'al-6061');
  k.box('barrel', 'barrel', '=diameter*0.12', '=diameter*0.12', '=barrel', 'steel-alloy');
  k.over('gun', 'trun', 'cradle', 'tilt trunnion/axis');
  k.onto('tr1', 'gun', 'barrel', '+z');
  k.turn('tr2', 'tr1', 'z');
  k.stack('yoke', 'turret yoke', 'x', ['cheek', 'tr2', 'cheek']);
  k.onto('done', 'b2', 'yoke', '+y');
  k.save('seed.turret', 'Turret (slewing ring, platform, tilting barrel mount)', 'A rotating turret sized by its ring\'s diameter and its barrel\'s length (mm; proportions typical, recalled): a base with a turret ring, a slewing pivot up its middle, a platform that turns on the pivot (clear: it slews), two trunnion cheeks on the platform and a tilt trunnion between them carrying a cradle and a barrel (a square boom: mount a gun barrel, a water nozzle, a camera or a sensor along it) that tilts on the trunnion (clear: it elevates). It offers slewing pivot/axis and tilt trunnion/axis. Stack its base on a chassis, a go-kart, a tank\'s deck',
    'A platform slewing on a ring with a barrel or sensor mount tilting on trunnions: pan and tilt', 'done');
}

// ---- a wheeled chassis ----------------------------------------------------------------------------------------------------
/** The chassis sized from its payload (kg), wheelbase, track and wheel diameter (mm), speed (m/s) and grade (%). Gross
 *  weight: the payload and half of it for the chassis (an estimate). Frame rails: two, the payload spread along the
 *  wheelbase with a dynamic factor of 2, simply supported at the axles (M = w L² / 8): the lightest hollow section whose
 *  bending stress stays under yield over 2. Axles: a wheel's share of the gross weight (a quarter, dynamic factor 2) at
 *  its overhang from the rail (a quarter of the track), a solid round shaft in bending at yield over 2, to the next 5 mm.
 *  Drive: the grade and 0.015 rolling resistance (tyres on a road, typical); power at 0.9 efficiency (typical). */
function chassisSizing(i: Record<string, number>, T: Tables): Sized {
  const r1 = (v: number) => Math.round(v * 10) / 10, gross = i.payload! * 1.5, Lw = i.wheelbase! / 1000;
  const Mr = (i.payload! * T.g * Lw) / 8, Zreq = ((Mr * 2) / T.Ylow) * 1e9, sec = T.shs.find((q) => q[4] >= Zreq) ?? T.shs[T.shs.length - 1]!, railStress = Mr / (sec[4] * 1e-9);
  const Rw = ((gross * T.g) / 4) * 2, arm = i.track! / 4000, Ma = Rw * arm, axle = Math.ceil((Math.cbrt((32 * Ma * 2) / (Math.PI * T.Yalloy)) * 1000) / 5) * 5, axleStress = (32 * Ma) / (Math.PI * (axle / 1000) ** 3);
  const th = Math.atan(i.grade! / 100), TE = gross * T.g * (Math.sin(th) + 0.015 * Math.cos(th)), torque = (TE * i.wheel!) / 2000, power = (TE * i.speed!) / 0.9, rpm = (i.speed! / (Math.PI * (i.wheel! / 1000))) * 60;
  const xmL = i.track! * 0.5, endL = xmL + 2 * sec[1], rail4 = i.wheelbase! + i.wheel! * 0.5, rail6 = i.wheelbase! + i.wheel! * 1.72;
  const steel = r1(((2 * rail4 + xmL + 2 * endL) / 1000) * sec[5] + 2 * 7850 * Math.PI * (axle / 2000) ** 2 * ((i.track! + i.wheel! * 0.3) / 1000));
  return { section: sec[0], rail4, rail6, xmL, endL, axR: axle / 2, axL: i.track! + i.wheel! * 0.3, wheelR: i.wheel! / 2, wheelW: i.wheel! * 0.28, psR: Math.max(15, i.wheel! * 0.05), ps4: i.wheelbase! - axle, ps6: i.wheel! * 1.1,
    railStressMPa: r1(railStress / 1e6), railSafety: r1(T.Ylow / railStress), axleMm: axle, axleStressMPa: r1(axleStress / 1e6), axleSafety: r1(T.Yalloy / axleStress), effortkN: r1(TE / 1000), wheelTorqueNm: r1(torque), powerkW: r1(power / 1000), wheelRpm: r1(rpm), steelKg: steel,
    report: `Payload ${i.payload} kg; gross taken as ${r1(gross)} kg (half the payload for the chassis: an estimate). Frame rails: two ${sec[0]} (yield ${T.Ylow / 1e6} MPa) over the ${i.wheelbase} mm wheelbase, ${r1(Mr)} N m each with a dynamic factor of 2: ${r1(railStress / 1e6)} MPa, safety ${r1(T.Ylow / railStress)} on yield (2 asked)${sec[4] < Zreq ? ' (NO section in the table passes: the largest taken)' : ''}. Axles: Ø${axle} mm solid (AISI 4140 QT, yield ${T.Yalloy / 1e6} MPa), a wheel's ${r1(Rw / 1000)} kN (dynamic factor 2) at ${r1(arm * 1000)} mm from the rail: ${r1(Ma)} N m, ${r1(axleStress / 1e6)} MPa, safety ${r1(T.Yalloy / axleStress)} (2 asked): the governing member. Tractive effort up a ${i.grade} % grade with 0.015 rolling resistance: ${r1(TE / 1000)} kN, ${r1(torque)} N m at the Ø${i.wheel} mm wheels turning ${r1(rpm)} rev/min at ${i.speed} m/s; ${r1(power / 1000)} kW at 0.9 efficiency; the largest motor in the library's table gives ${T.motorMaxW} W (${T.motorMax}): ${power > T.motorMaxW ? 'rating not in the table, so no motor and reduction is drawn' : 'it would do, with a reduction'}. Steel in rails, cross members and two axles: about ${steel} kg (sized by the four-wheel case). Joints taken as welded; not drawn: the drive, steering knuckles, springs, wheel bearings and rims (the tyre table carries no load index: rating not in the table)` };
}
function wheeledChassis(): void {
  const k = new Kit('A wheeled chassis', ['mechanical', 'vehicles', 'robotics']);
  k.in('payload', 1000, 'the payload it carries, kg'); k.in('wheelbase', 2400, 'front axle to rear axle, mm'); k.in('track', 1400, 'the wheels\' track (left to right), mm'); k.in('wheel', 650, 'the wheels\' diameter, mm'); k.in('speed', 5, 'its speed, m/s'); k.in('grade', 15, 'the grade it climbs, %');
  k.sized(chassisSizing, ['report', 'section', 'railStressMPa', 'railSafety', 'axleMm', 'axleStressMPa', 'axleSafety', 'effortkN', 'wheelTorqueNm', 'powerkW', 'wheelRpm', 'steelKg']);
  k.rod('rim', 'wheel', '=wheelR', '=wheelW', 'rubber');
  k.rod('ax0', 'axle', '=axR', '=axL', 'steel-alloy');
  k.over('ax1', 'ax0', 'rim', 'axle/axis', 'lo'); k.over('ax2', 'ax1', 'rim', 'axle/axis', 'hi'); k.turn('ax', 'ax2', 'z');
  k.rod('ps0', 'propeller shaft', '=psR', '=ps4'); k.turn('ps', 'ps0', 'x');
  k.rod('ps20', 'tandem shaft', '=psR', '=ps6'); k.turn('ps2', 'ps20', 'x');
  k.stack('run4', 'running gear', 'z', ['ax', 'ps', 'ax']);
  k.stack('run6', 'running gear', 'z', ['ax', 'ps2', 'ax', 'ps', 'ax']);
  k.n('piece.hollowsection', { size: '=section', length: '=xmL' }, 'A cross member', 'xm0'); k.turn('xm', 'xm0', 'y');
  k.n('piece.hollowsection', { size: '=section', length: '=endL' }, 'An end cross member', 'end0'); k.turn('end', 'end0', 'y');
  for (const n of ['4', '6']) {
    k.n('piece.hollowsection', { size: '=section', length: `=rail${n}` }, 'A frame rail, picked by bending', `rail${n}`);
    k.stack(`lad${n}a`, 'ladder frame', 'x', [`rail${n}`, 'xm', `rail${n}`]);
    k.stack(`lad${n}`, 'ladder frame', 'z', ['end', `lad${n}a`, 'end']);
    k.onto(`ch${n}`, `run${n}`, `lad${n}`, '+y');
  }
  k.pick('wheels', '4', ['4', '6'], 'four wheels (two axles) or six (a second rear axle)', { 4: 'ch4', 6: 'ch6' });
  k.save('seed.wheeled-chassis', 'Wheeled chassis (rolling chassis, 4 or 6 wheels)', 'A rolling chassis engineered from its payload (kg), wheelbase, track and wheel diameter (mm), speed (m/s) and the grade it climbs (%), with four wheels or six; default 1 t on a 2.4 m wheelbase at 5 m/s. Sized by calculation (its report output says each number): two frame rails picked from the library\'s steel hollow sections by bending under the payload, solid axles by bending under a wheel\'s load, the tractive effort, wheel torque and drive power worked out (the library\'s motor table is checked against it and said). A ladder frame (the rails, a cross member between and one at each end) on two or three axles, a wheel on each axle end (clear: they turn; each drawn as one rubber disc), a propeller shaft between the axles. The frame\'s top is flat: stack a body, a cargo bed, a cab, a turret or a lift mast on it. It offers axle/axis for each axle. Not drawn: the drive (motor and reduction), steering knuckles, springs, bearings, bolts (joints taken as welded)',
    'A ladder frame on axles and wheels, its rails and axles sized for the payload: the rolling base of a truck, a cart, a rover', 'ch4');
}

// ---- a cube frame of extrusions, and what is built on it --------------------------------------------------------------------
/** A rectangular frame of square extrusions: a bottom and a top rectangle, four posts, a corner bracket plate at each of
 *  the eight corners. X, Y, Z and S are formulas (the outside sizes and the section). */
function cubeFrame(k: Kit, q: string, X: string, Y: string, Z: string, S: string): string {
  k.box(`${q}xb`, 'frame beam', `=${X}`, `=${S}`, `=${S}`, 'al-6061'); k.box(`${q}zb`, 'frame side beam', `=${S}`, `=${S}`, `=${Z}-2*(${S})`, 'al-6061');
  k.box(`${q}post`, 'frame post', `=${S}`, `=${Y}-2.6*(${S})`, `=${S}`, 'al-6061'); k.box(`${q}gus`, 'corner bracket', `=2*(${S})`, `=0.15*(${S})`, `=2*(${S})`, 'steel-low');
  k.onto(`${q}r1`, `${q}xb`, `${q}zb`, '+z', 'lo'); k.onto(`${q}r2`, `${q}r1`, `${q}zb`, '+z', 'hi'); k.onto(`${q}r3`, `${q}r2`, `${q}xb`, '+z');
  let last = `${q}r3`;
  ['gus', 'post', 'gus'].forEach((part, j) => CORNERS.forEach((e, i) => { last = k.onto(`${q}c${j}_${i}`, last, `${q}${part}`, '+y', e); }));
  return k.onto(`${q}frame`, last, `${q}r3`, '+y');
}
function cubeFrameSeed(): void {
  const k = new Kit('A cube frame of extrusions', ['mechanical', 'manufacturing', 'robotics']);
  k.in('x', 1000, 'its width outside, mm'); k.in('y', 1000, 'its height outside, mm'); k.in('z', 1000, 'its depth outside, mm'); k.in('section', 40, 'the square extrusion\'s side, mm (20, 30, 40, 45, 80 are common)');
  const f = cubeFrame(k, 'f', 'x', 'y', 'z', 'section');
  k.save('seed.cube-frame', 'Cube frame (gantry frame of extrusions)', 'A rectangular frame of square aluminium extrusions sized by x, y, z outside and the extrusion\'s section (mm): the twelve edges of a box (a bottom and a top rectangle of four beams each, four posts between) with a corner bracket plate at each of the eight corners. The skeleton of a 3D printer, a CNC router, a machine guard, an enclosure, a test rig: stack a bed inside on its bottom beams, rails on its top beams, panels against its sides. The extrusion drawn as a plain square bar (its T-slots not drawn)',
    'Twelve extrusions and eight corner brackets as a box frame: the skeleton of a printer, a CNC, an enclosure', f);
}
function booth(): void {
  const k = new Kit('A booth', ['mechanical', 'structural', 'everyday']);
  k.in('w', 2000, 'its width, mm'); k.in('d', 1500, 'its depth, mm'); k.in('h', 2200, 'its height, mm');
  const f = cubeFrame(k, 'f', 'w', 'h', 'd', 'h*0.025');
  k.box('backp', 'back panel', '=w', '=h', '=h*0.008', 'pc'); k.box('sidep', 'side panel', '=h*0.008', '=h', '=d', 'pc'); k.box('roofp', 'roof panel', '=w+h*0.016', '=h*0.008', '=d+h*0.008', 'pc');
  k.onto('b1', f, 'backp', '-z'); k.onto('b2', 'b1', 'sidep', '-x', 'mid,hi'); k.onto('b3', 'b2', 'sidep', '+x', 'mid,hi'); k.onto('b4', 'b3', 'roofp', '+y');
  k.save('seed.booth', 'Booth (enclosure, open front)', 'An enclosure or booth sized by its width w, depth d and height h (mm; proportions typical): a frame of square extrusions with corner brackets, a wall panel on its back and on each side and a roof panel on top (polycarbonate sheet), the front open. A photo booth, a spray booth, a machine enclosure, a kiosk, a stall. Put a machine inside on its bottom beams',
    'A frame with panels on three sides and a roof, the front open: an enclosure, a kiosk, a spray booth', 'b4');
}

// ---- a belt conveyor, a chute, a bin -----------------------------------------------------------------------------------------
function conveyor(): void {
  const k = new Kit('A belt conveyor', ['mechanical', 'manufacturing', 'robotics']);
  k.in('length', 3000, 'the conveyor\'s length, mm'); k.in('width', 600, 'the belt\'s width, mm'); k.in('height', 900, 'the belt\'s height off the floor, mm');
  k.wheel('drv', 'drive roller', '=width*0.12', '=width', '=width*0.03', '=width*1.1');
  k.wheel('tail', 'tail roller', '=width*0.12', '=width', '=width*0.03', '=width*1.1');
  k.box('bed', 'slider bed', '=width*1.1', '=width*0.22', '=length-width*0.56');
  k.box('belt', 'belt run', '=width', '=width*0.01', '=length-width*0.56', 'rubber');
  k.onto('m1', 'bed', 'belt', '-y'); k.onto('mid', 'm1', 'belt', '+y');
  k.stack('line', 'belt conveyor', 'z', ['drv', 'mid', 'tail'], 'clear');
  k.box('rail', 'side rail', '=width*0.04', '=width*0.4', '=length');
  k.stack('railed', 'belt conveyor', 'x', ['rail', 'line', 'rail']);
  k.box('leg', 'conveyor leg', '=width*0.08', '=height-width*0.3', '=width*0.08');
  let last = 'railed'; CORNERS.forEach((e, i) => { last = k.onto(`l${i}`, last, 'leg', '-y', e); });
  k.save('seed.conveyor', 'Belt conveyor (on legs)', 'A belt conveyor sized by its length, belt width and height (mm; proportions typical, recalled): a drive roller and a tail roller on their axles (clear: they turn), a slider bed between with the belt\'s top run on it and its return run under (the wrap round the rollers not drawn), a side rail each side holding the rollers\' axles, four legs. Things ride its top run; put a chute or a bin at its tail, a sorting flap over it. It offers drive roller axle/axis (a motor\'s or a belt drive\'s line) and tail roller axle/axis',
    'A belt on a drive and a tail roller between side rails, on legs: it carries parts along a line', last);
}
function chute(): void {
  const k = new Kit('A chute', ['mechanical', 'manufacturing']);
  k.in('length', 1200, 'the chute\'s length down its slope, mm'); k.in('width', 500, 'its width inside, mm'); k.in('slope', 30, 'its slope, degrees');
  k.box('floor', 'chute floor', '=width', '=width*0.02', '=length'); k.box('wall', 'chute side', '=width*0.02', '=width*0.3', '=length');
  k.stack('tr', 'chute', 'x', ['wall', 'floor', 'wall'], 'touch', 'lo');
  k.turn('sl', 'tr', 'x', '=slope');
  k.box('stand', 'chute stand', '=width*1.04', '=length*0.55', '=width*0.06');
  k.onto('done', 'sl', 'stand', '-y', 'mid,lo');
  k.box('foot', 'chute foot', '=width*1.04', '=width*0.06', '=width*0.3');
  k.onto('footed', 'done', 'foot', '-y', 'mid,lo');
  k.save('seed.chute', 'Chute (slide, sloped trough)', 'A chute sized by its length, width and slope (mm and degrees; proportions typical): a sloped trough (a floor and two sides) held up at its high end by a stand on a foot. Parts slide down it from a conveyor\'s tail into a bin; a sorting line\'s branch',
    'A sloped trough on a stand: parts slide down it into a bin', 'footed');
}
function bin(): void {
  const k = new Kit('A bin', ['mechanical', 'manufacturing', 'everyday']);
  k.in('w', 600, 'its width, mm'); k.in('d', 400, 'its depth, mm'); k.in('h', 300, 'its height, mm');
  k.n('room.make', { name: 'bin', shape: 'case', mat: 'pp', a: '=w', b: '=h', c: '=d', d: '=w*0.02', e: '=w*0.02' }, 'bin', 'tub');
  k.box('foot', 'bin foot', '=w*0.1', '=h*0.1', '=w*0.1', 'pp');
  let last = 'tub'; CORNERS.forEach((e, i) => { last = k.onto(`f${i}`, last, 'foot', '-y', e); });
  k.save('seed.bin', 'Bin (tote, collection box)', 'An open bin or tote sized by its width w, depth d and height h (mm): a box open above (walls and floor in one, polypropylene) on four feet. It collects what a chute or a conveyor drops; a sorting machine has one for each kind. It offers bin/cavity (a room to put things into)',
    'An open box on feet: what sorted parts fall into', last);
}

// ---- a claw ---------------------------------------------------------------------------------------------------------------
/** The grab sized from the load it lifts (kg), a finger's reach (mm), how many fingers and the pressure (bar). Each
 *  finger: its share of the load at 0.6 of the reach from its pivot, a solid bar twice as deep as wide in bending at
 *  yield over 3 (a lifting attachment: a factor of 3, typical). Pivot pins: twice the finger's share (the link's pull
 *  with it, an estimate) in double shear at 0.577 of yield over 3, the next bushing bore up. Cylinder: the fingers'
 *  moments held through links 0.15 of the reach from the pivots, so n M / a: the smallest ISO 6020-2 bore that gives it. */
function clawSizing(i: Record<string, number>, T: Tables): Sized {
  const r1 = (v: number) => Math.round(v * 10) / 10, n = Math.round(i.fingers!), Wg = i.load! * T.g, per = Wg / n, M = per * ((0.6 * i.reach!) / 1000);
  const h = Math.ceil((Math.cbrt((12 * M * 3) / T.Ylow) * 1000) / 5) * 5, b = h / 2, stress = (6 * M) / ((b / 1000) * (h / 1000) ** 2);
  const V = 2 * per, pinMin = Math.sqrt((2 * V * 3) / (Math.PI * 0.577 * T.Yalloy)) * 1000, pin = T.bush.find((d) => d >= Math.max(h / 3, pinMin)) ?? T.bush[T.bush.length - 1]!, pinShear = V / (2 * Math.PI * (pin / 2000) ** 2);
  const Fc = (n * M) / ((0.15 * i.reach!) / 1000), p = i.pressure! * 1e5, cyl = T.cyl.find(([bore]) => (p * Math.PI * (bore / 1000) ** 2) / 4 >= Fc), cy = cyl ?? T.cyl[T.cyl.length - 1]!, gives = (p * Math.PI * (cy[0] / 1000) ** 2) / 4;
  const knR = pin / 2 + 4 + Math.max(10, h / 3), knL = b + 10, lugT = Math.max(10, b / 2), pivotR = Math.max(0.35 * i.reach!, 2.4 * knR + 40), armL = 0.6 * i.reach!;
  const steel = r1(n * 7850 * (b / 1000) * (h / 1000) * ((2 * armL) / 1000));
  return { n, h, b, armL, pin, pinS: String(pin), pinR: pin / 2, pinL: knL + 2 * lugT + 10, knR, knL, lugT, lugA: 2 * knR, lugC: 2 * knR + 30, ringR: pivotR + armL / 2, hubR: pivotR + knR + 30, hubT: Math.max(15, h / 2), bore: String(cy[0]), stroke: Math.max(25, Math.round(0.3 * i.reach!)),
    fingerStressMPa: r1(stress / 1e6), fingerSafety: r1(T.Ylow / stress), pinShearMPa: r1(pinShear / 1e6), pinSafety: r1((0.577 * T.Yalloy) / pinShear), cylNeedkN: r1(Fc / 1000), cylGiveskN: r1(gives / 1000), steelKg: steel,
    report: `Lifts ${i.load} kg with ${n} fingers of ${i.reach} mm reach. Fingers: ${b} x ${h} mm bar (AISI 1018, yield ${T.Ylow / 1e6} MPa), ${r1(per)} N each at ${r1(armL)} mm: ${r1(M)} N m at the pivot, ${r1(stress / 1e6)} MPa, safety ${r1(T.Ylow / stress)} on yield (3 asked): the governing member. Pivot pins Ø${pin} mm (AISI 4140 QT) in bushings, ${r1(V)} N in double shear: ${r1(pinShear / 1e6)} MPa, safety ${r1((0.577 * T.Yalloy) / pinShear)} (3 asked; ${r1(pinMin)} mm needed by shear, a third of the finger's depth taken as the least, typical). Cylinder: ${r1(Fc / 1000)} kN to hold the fingers shut through links ${r1(0.15 * i.reach!)} mm from the pivots; ISO 6020-2 bore ${cy[0]} mm gives ${r1(gives / 1000)} kN at ${i.pressure} bar${cyl ? '' : ' (NO cylinder in the table gives it: the largest taken)'}. Steel in the fingers: about ${steel} kg. Not drawn: the links from the cylinder's rod to the fingers, the pins' retaining clips, the hanging bail, bolts (the lugs taken as welded to the hub)` };
}
function claw(): void {
  const k = new Kit('A claw', ['mechanical', 'robotics']);
  k.in('load', 500, 'the load it lifts, kg'); k.in('reach', 600, 'a finger\'s reach from its pivot, mm'); k.in('fingers', 4, 'how many fingers, 2 to 5'); k.in('pressure', 160, 'the hydraulic pressure, bar');
  k.sized(clawSizing, ['report', 'bore', 'pin', 'fingerStressMPa', 'fingerSafety', 'pinShearMPa', 'pinSafety', 'cylNeedkN', 'cylGiveskN', 'steelKg']);
  k.rod('pin', 'finger pivot pin', '=pinR', '=pinL', 'steel-alloy');
  k.n('piece.bushing', { size: '=pinS', length: '=knL' }, 'The pivot\'s bushing', 'bush');
  k.over('f00', 'pin', 'bush', 'finger pivot pin/axis', 'mid', 'touch');
  k.rod('boss', 'finger knuckle', '=knR', '=knL', 'steel-low');
  k.over('f0', 'f00', 'boss', 'finger pivot pin/axis');
  k.box('bar', 'finger', '=armL', '=b', '=h', 'steel-low');
  k.onto('f1', 'f0', 'bar', '+x');
  k.box('lug', 'pivot lug', '=lugA', '=lugT', '=lugC', 'steel-low');
  k.onto('f2', 'f1', 'lug', '+y', 'lo,mid'); k.onto('f2b', 'f2', 'lug', '-y', 'lo,mid');
  k.box('tip', 'finger tine', '=h', '=b', '=armL', 'steel-low');
  k.onto('f3', 'f2b', 'tip', '+z', 'hi,mid');
  k.box('base', 'pivot bracket base', '=lugA', '=pinL', '=lugT', 'steel-low');
  k.onto('f4', 'f3', 'base', '-z', 'lo,mid');
  k.turn('unit', 'f4', 'x');
  k.op('ringed', 'room.ring', { name: 'claw fingers', n: '=n', R: '=ringR', fit: 'clear', out: 'yes' }, 'The fingers round the hub, each facing out', { block: 'unit' });
  k.rod('hub', 'claw hub', '=hubR', '=hubT');
  k.n('piece.hydcylinder', { size: '=bore', stroke: '=stroke' }, 'The closing cylinder, ISO 6020-2, picked by force', 'cyl');
  k.stack('done', 'claw', 'y', ['ringed', 'hub', 'cyl']);
  k.save('seed.claw', 'Claw (industrial grab, grapple)', 'An industrial grab or claw engineered from the load it lifts (kg), a finger\'s reach (mm), 2, 4 or 5 fingers (with three, the stack leaves two fingers unjoined to the hub: a fault) and the hydraulic pressure (bar); default 500 kg, four fingers of 600 mm reach at 160 bar. Sized by calculation (its report output says each number): each finger a steel bar by bending under its share of the load at a factor of 3, its pivot pin by double shear running in a bushing from the library, an ISO 6020-2 hydraulic cylinder picked by bore from the force that holds the fingers shut. Each finger a knuckle on its pivot pin (clear: it swings) with an arm out and a tine down, the pins held in brackets (two lugs on a base) under a round hub, the cylinder standing on the hub\'s middle (its rod slides). It offers finger pivot pin/axis for each finger and the cylinder\'s ports and rod axis. Not drawn: the links from the cylinder to the fingers, retaining clips, the hanging bail, bolts',
    'Fingers on pivot pins round a hub under a hydraulic cylinder, each sized for the load: a grab that closes on a load', 'done');
}

// ---- a cargo bed -----------------------------------------------------------------------------------------------------------
function cargoBed(): void {
  const k = new Kit('A cargo bed', ['mechanical', 'vehicles']);
  k.in('length', 2000, 'the bed\'s length, mm'); k.in('width', 1200, 'its width, mm'); k.in('side', 200, 'its sides\' height, mm');
  k.n('room.make', { name: 'cargo bed', shape: 'case', mat: 'steel-low', a: '=width', b: '=side', c: '=length', d: '=width*0.02', e: '=width*0.025' }, 'cargo bed', 'tray');
  k.box('bearer', 'bed bearer', '=width*0.07', '=width*0.07', '=length*0.9');
  k.onto('b1', 'tray', 'bearer', '-y', 'lo,mid'); k.onto('b2', 'b1', 'bearer', '-y', 'hi,mid');
  k.tube('ringl', 'tie-down ring', '=width*0.02', '=width*0.035', '=width*0.012', 'steel-alloy');
  let last = 'b2'; CORNERS.forEach((e, i) => { last = k.onto(`t${i}`, last, 'ringl', '+y', e); });
  k.save('seed.cargo-bed', 'Cargo bed (flat bed, tray with low sides)', 'A flat cargo bed or tray sized by its length, width and side height (mm; proportions typical): a floor with low sides all round (one pressed tray), two bearers under it to sit on a chassis\' frame rails, a tie-down ring at each top corner. The back of a pickup, a trailer, a cart, a rover. Stack it on a wheeled chassis; it offers cargo bed/cavity (a room to load things into) and tie-down ring/axis for each ring',
    'A tray with low sides, bearers under and tie-down rings: what a truck or a cart carries its load in', last);
}

// ---- a hovercraft hull ------------------------------------------------------------------------------------------------------
function hoverHull(): void {
  const k = new Kit('A hovercraft hull', ['mechanical', 'vehicles']);
  k.in('length', 4000, 'the hull\'s length, mm'); k.in('width', 2000, 'its width, mm');
  /** A ducted fan standing on its shaft: a fan disc on the shaft (clear: it turns), the duct round it, a spider across. */
  const fan = (q: string, name: string, r: string, h: string): string => {
    k.rod(`${q}s`, `${name} shaft`, `=(${r})*0.08`, `=${h}`, 'steel-alloy'); k.rod(`${q}f`, `${name}`, `=(${r})*0.92`, `=(${h})*0.2`, 'pc');
    k.over(`${q}1`, `${q}s`, `${q}f`, `${name} shaft/axis`, 'lo');
    k.tube(`${q}d`, `${name} duct`, `=${r}`, `=(${r})*1.08`, `=${h}`, 'fibreglass');
    k.over(`${q}2`, `${q}1`, `${q}d`, `${name} shaft/axis`, 'mid');
    k.box(`${q}b`, `${name} spider`, `=(${r})*2.16`, `=(${r})*0.1`, `=(${r})*0.16`, 'al-6061');
    return k.onto(`${q}u`, `${q}2`, `${q}b`, '+y');
  };
  k.n('room.make', { name: 'skirt', shape: 'case', mat: 'rubber', a: '=width', b: '=length*0.07', c: '=length', d: '=width*0.03', e: '=width*0.01' }, 'skirt', 'sk0');
  k.turn('skirt', 'sk0', 'x', 180);
  k.box('deck', 'deck', '=width*0.96', '=length*0.03', '=length*0.97', 'fibreglass', { points: '0,0', hole: '=width*0.2' });
  k.onto('h1', 'skirt', 'deck', '+y');
  k.onto('h2', 'h1', fan('lf', 'lift fan', 'width*0.2', 'length*0.06'), '+y');
  k.turn('tf', fan('tf_', 'thrust fan', 'width*0.3', 'length*0.1'), 'x');
  k.onto('h3', 'h2', 'tf', '+y', 'mid,lo');
  k.box('rud', 'rudder', '=width*0.015', '=width*0.56', '=length*0.07', 'fibreglass'); k.box('rbar', 'rudder bar', '=width*0.24', '=width*0.03', '=width*0.03', 'al-6061');
  k.stack('ruds', 'rudders', 'x', ['rud', 'rbar', 'rud']);
  k.onto('h4', 'h3', 'ruds', '-z', 'mid,hi');
  k.box('seat', 'seat', '=width*0.3', '=width*0.2', '=width*0.3', 'pu');
  k.onto('h5', 'h4', 'seat', '+y', 'mid,hi');
  k.save('seed.hover-skirt-hull', 'Hovercraft hull (deck, skirt, lift fan, thrust fan)', 'A hovercraft\'s hull sized by its length and width (mm; proportions typical, recalled): a deck on a rubber skirt round its whole edge (the air cushion\'s plenum open under it), a lift fan in its duct over a hole through the deck\'s middle (the fan turns on its shaft, clear), a ducted thrust fan standing at the stern (it turns) with two rudders behind it on a bar, a seat at the bow. It offers lift fan shaft/axis and thrust fan shaft/axis (a motor\'s line). The rudders drawn fixed; its engine not drawn',
    'A deck on a skirt with a lift fan through it and a ducted thrust fan with rudders at the stern', 'h5');
}

trackedBase(); dozerBlade(); cab(); liftMast(); turret(); wheeledChassis(); cubeFrameSeed(); booth(); conveyor(); chute(); bin(); claw(); cargoBed(); hoverHull();
