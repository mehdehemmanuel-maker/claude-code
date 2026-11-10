// The kit of machine sub-assemblies (decision 0029, wave 14: "a more full library too, take some weight off of having to
// invent every single piece"): the mid-level blocks machines are made of, each a seed sized by a few inputs over a wide
// range (a toy's to a works machine's): a tracked undercarriage, a dozer blade, a cab, a forklift mast, a turret, a wheeled
// chassis, a cube frame of extrusions, a booth, a belt conveyor, a chute, a bin, a claw, a cargo bed, a hovercraft hull.
// Each is two boards: its pieces (a board of room.make and the room's operations, every size a setting), and, round it,
// the block the library shows: its few inputs, a formula for each size worked out from them, wired into the pieces' board
// (an input bound to inner settings sets them as given, so a size in proportion is a formula outside). Nothing here places
// by number: stack, onto, over, ring and turn give every place. Every proportion is typical (recalled, no source at hand):
// none is a rated figure. Where a piece moves (a wheel on its axle, a carriage on its post, a platform on its pivot) it
// goes over its shaft at the clear or slide fit, drawn with no bore: over bores it and writes the joint (root 6).
// Loaded by one import in seeds.ts, after vehicles.ts.

import { Asm, FULL, layOut } from './board';

type V = number | string;
/** A seed of two boards: `raw`, its pieces; and the block saved, whose inputs feed a formula for each size. A setting
 *  written "=…" is a formula over the inputs' names (plain arithmetic), worked out here at the defaults too. */
class Kit {
  readonly raw: Asm; private readonly ins: [string, number, string][] = []; private readonly ex = new Map<string, string[]>();
  private choice?: { name: string; def: string; choices: string[]; says: string; builds: Record<string, string> };
  constructor(private readonly title: string, private readonly domains: string[]) { this.raw = new Asm(`${title}: its pieces`); }
  in(name: string, def: number, says: string): void { this.ins.push([name, def, says]); }
  val(e: string): number { return Math.round(Number(new Function(...this.ins.map((i) => i[0]), `return (${e});`)(...this.ins.map((i) => i[1]))) * 1000) / 1000; }
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
    for (const [e, targets] of this.ex) { const v = `v${j++}`; this.raw.input(v, 'number', this.val(e), `${e}, mm`, [], targets.join('; ')); fed.push([v, e]); }
    layOut(this.raw.b);
    top.b.nodes.kit = { label: `${name}: its pieces, each size worked out from the inputs`, inner: this.raw.b, set: {}, x: 0, y: 0 };
    for (const [v, e] of fed) { const m = top.n('math.expr', { expr: e }, e, `f_${v}`); for (const [nm] of this.ins) if (new RegExp(`\\b${nm}\\b`).test(e)) top.w(`in_${nm}`, 'value', m, nm); top.w(m, 'result', 'kit', v); }
    if (c) top.w(`in_${c.name}`, 'value', 'kit', c.name);
    top.outs('kit'); top.save(id, name, says, gloss);
  }
}
const CORNERS = ['lo,lo', 'hi,lo', 'lo,hi', 'hi,hi'];

// ---- a tracked undercarriage --------------------------------------------------------------------------------------------
function trackedBase(): void {
  // (proportions typical of a small dozer's or a tracked robot's undercarriage, recalled: sprocket and idler Ø0.22 of the
  // length, five road wheels Ø0.14 of it between them, pads 0.015 of it thick)
  const k = new Kit('A tracked undercarriage', ['mechanical', 'vehicles', 'robotics']);
  k.in('length', 2400, 'the undercarriage\'s length over its tracks, mm'); k.in('width', 1800, 'its width over both tracks, mm'); k.in('track', 400, 'each track\'s width, mm');
  k.wheel('spr', 'sprocket', '=length*0.11', '=track*0.8', '=length*0.02', '=track');
  k.wheel('idl', 'idler', '=length*0.11', '=track*0.8', '=length*0.02', '=track');
  k.wheel('rw', 'road wheel', '=length*0.07', '=track*0.8', '=length*0.015', '=track');
  k.stack('row', 'road wheels', 'z', ['rw', 'rw', 'rw', 'rw', 'rw'], 'clear');
  k.box('beam', 'track frame', '=track', '=length*0.048', '=length*0.76');
  k.onto('core', 'row', 'beam', '+y', 'mid', 'clear');
  k.box('run', 'track run', '=track', '=length*0.015', '=length*0.78', 'rubber');
  k.onto('m1', 'core', 'run', '-y', 'mid', 'clear');
  k.onto('mid', 'm1', 'run', '+y');
  k.stack('unit', 'track', 'z', ['spr', 'mid', 'idl'], 'clear');
  k.box('plate', 'side frame', '=length*0.02', '=length*0.12', '=length*0.98');
  k.box('deck', 'undercarriage deck', '=width-2*track-length*0.04', '=length*0.06', '=length*0.6', 'steel-low', { holes: 8, pcd: '=length*0.12', hole: '=length*0.008' });
  k.stack('base', 'tracked undercarriage', 'x', ['unit', 'plate', 'deck', 'plate', 'unit']);
  k.save('seed.tracked-base', 'Tracked undercarriage (crawler tracks)', 'A tracked undercarriage for a bulldozer, an excavator, a tank or a tracked robot, sized by its length, width and track width (mm, a toy\'s 150 to a machine\'s 6000; proportions typical, recalled): two crawler tracks, each a sprocket and an idler (they turn on their axles) with five road wheels between (they turn), a top and a bottom track run round them (the wrap round the end wheels not drawn), a track frame over the road wheels; a side frame inside each track holding every axle, and a deck between the two with eight holes in a circle to bolt a body, a cab or a turret on. It offers undercarriage deck/holes (lines up through the deck), and each sprocket axle/axis and idler axle/axis',
    'Two crawler tracks on sprockets, idlers and road wheels, a deck between: what a dozer, an excavator or a tracked robot stands on', 'base');
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
function liftMast(): void {
  const k = new Kit('A forklift mast', ['mechanical', 'vehicles', 'robotics']);
  k.in('lift', 2000, 'the mast\'s height (the lift), mm'); k.in('fork', 1000, 'the forks\' length, mm'); k.in('width', 900, 'the mast\'s width, mm');
  k.box('tie', 'mast cross tie', '=width', '=width*0.08', '=width*0.06');
  k.rod('cyl', 'lift cylinder', '=width*0.035', '=lift*0.96', 'steel-alloy');
  k.onto('m0', 'tie', 'cyl', '+y');
  k.box('up', 'mast upright', '=width*0.09', '=lift', '=width*0.06');
  k.onto('m1', 'm0', 'up', '+y', 'lo,mid'); k.onto('m2', 'm1', 'up', '+y', 'hi,mid'); k.onto('m3', 'm2', 'tie', '+y');
  k.rod('bush', 'carriage slider', '=width*0.06', '=lift*0.16', 'bronze');
  k.over('c0', 'm3', 'bush', 'lift cylinder/axis', 'lo', 'slide');
  k.box('back', 'fork carriage', '=width*0.95', '=lift*0.2', '=width*0.03');
  k.onto('c1', 'c0', 'back', '+z', 'mid,lo');
  k.box('fork', 'fork', '=width*0.11', '=width*0.045', '=fork', 'steel-alloy');
  k.onto('c2', 'c1', 'fork', '+z', 'lo,lo'); k.onto('mast', 'c2', 'fork', '+z', 'hi,lo');
  k.save('seed.lift-mast', 'Lift mast (forklift mast and forks)', 'A forklift\'s mast sized by its lift height, fork length and width (mm, a toy\'s 100 to a truck\'s 6000; proportions typical, recalled): two uprights between a bottom and a top cross tie, a lift cylinder up the middle, and a fork carriage that slides up and down it (a slide fit: it moves) carrying two forks forward. It offers lift cylinder/axis (the line the carriage slides on); stack its bottom tie on a chassis\' front, or put its back against a body. Its chains and tilt cylinders not drawn',
    'Two uprights, a carriage sliding on them and two forks: what lifts a pallet', 'mast');
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
function wheeledChassis(): void {
  const k = new Kit('A wheeled chassis', ['mechanical', 'vehicles', 'robotics']);
  k.in('wheelbase', 1600, 'front axle to rear axle, mm'); k.in('track', 1200, 'the wheels\' track (left to right), mm'); k.in('wheel', 500, 'the wheels\' diameter, mm');
  k.rod('rim', 'wheel', '=wheel*0.5', '=wheel*0.28', 'rubber');
  k.rod('ax0', 'axle', '=wheel*0.06', '=track+wheel*0.3', 'steel-alloy');
  k.over('ax1', 'ax0', 'rim', 'axle/axis', 'lo'); 
  k.over('ax2', 'ax1', 'rim', 'axle/axis', 'hi'); k.turn('ax', 'ax2', 'z');
  k.rod('ps0', 'propeller shaft', '=wheel*0.05', '=wheelbase-wheel*0.12'); k.turn('ps', 'ps0', 'x');
  k.rod('ps20', 'tandem shaft', '=wheel*0.05', '=wheel*1.1'); k.turn('ps2', 'ps20', 'x');
  k.stack('run4', 'running gear', 'z', ['ax', 'ps', 'ax']);
  k.stack('run6', 'running gear', 'z', ['ax', 'ps2', 'ax', 'ps', 'ax']);
  for (const [n, len] of [['4', 'wheelbase+wheel*0.5'], ['6', 'wheelbase+wheel*1.72']] as const) {
    k.box(`rail${n}`, 'frame rail', '=wheel*0.12', '=wheel*0.2', `=${len}`);
    k.box(`xm${n}`, 'cross member', '=track*0.5', '=wheel*0.2', '=wheel*0.12');
    k.stack(`lad${n}a`, 'ladder frame', 'x', [`rail${n}`, `xm${n}`, `rail${n}`]);
    k.box(`end${n}`, 'end cross member', '=track*0.5+wheel*0.24', '=wheel*0.2', '=wheel*0.12');
    k.stack(`lad${n}`, 'ladder frame', 'z', [`end${n}`, `lad${n}a`, `end${n}`]);
    k.onto(`ch${n}`, `run${n}`, `lad${n}`, '+y');
  }
  k.pick('wheels', '4', ['4', '6'], 'four wheels (two axles) or six (a second rear axle)', { 4: 'ch4', 6: 'ch6' });
  k.save('seed.wheeled-chassis', 'Wheeled chassis (rolling chassis, 4 or 6 wheels)', 'A rolling chassis sized by its wheelbase, track and wheel diameter (mm, a toy car\'s 30 mm wheels to a truck\'s 1200; proportions typical, recalled), with four wheels or six: a ladder frame (two frame rails, a cross member between and one at each end) on two or three axles, a wheel on each axle end (clear: they turn; each drawn as one rubber disc, its rim not drawn), a propeller shaft between the axles. The frame\'s top is flat: stack a body, a cargo bed, a cab, a turret or a robot arm on it. It offers axle/axis for each axle. Its steering knuckles, springs and engine not drawn (the front wheels do not steer)',
    'A ladder frame on axles and wheels: the rolling base of a car, a kart, a truck, a rover', 'ch4');
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
  k.save('seed.cube-frame', 'Cube frame (gantry frame of extrusions)', 'A rectangular frame of square aluminium extrusions sized by x, y, z outside and the extrusion\'s section (mm, a desk printer\'s 200 to a room\'s 5000): the twelve edges of a box (a bottom and a top rectangle of four beams each, four posts between) with a corner bracket plate at each of the eight corners. The skeleton of a 3D printer, a CNC router, a machine guard, an enclosure, a test rig: stack a bed inside on its bottom beams, rails on its top beams, panels against its sides. The extrusion drawn as a plain square bar (its T-slots not drawn)',
    'Twelve extrusions and eight corner brackets as a box frame: the skeleton of a printer, a CNC, an enclosure', f);
}
function booth(): void {
  const k = new Kit('A booth', ['mechanical', 'structural', 'everyday']);
  k.in('w', 2000, 'its width, mm'); k.in('d', 1500, 'its depth, mm'); k.in('h', 2200, 'its height, mm');
  const f = cubeFrame(k, 'f', 'w', 'h', 'd', 'h*0.025');
  k.box('backp', 'back panel', '=w', '=h', '=h*0.008', 'pc'); k.box('sidep', 'side panel', '=h*0.008', '=h', '=d', 'pc'); k.box('roofp', 'roof panel', '=w+h*0.016', '=h*0.008', '=d+h*0.008', 'pc');
  k.onto('b1', f, 'backp', '-z'); k.onto('b2', 'b1', 'sidep', '-x', 'mid,hi'); k.onto('b3', 'b2', 'sidep', '+x', 'mid,hi'); k.onto('b4', 'b3', 'roofp', '+y');
  k.save('seed.booth', 'Booth (enclosure, open front)', 'An enclosure or booth sized by its width w, depth d and height h (mm, a desktop fume box\'s 300 to a spray booth\'s 5000; proportions typical): a frame of square extrusions with corner brackets, a wall panel on its back and on each side and a roof panel on top (polycarbonate sheet), the front open. A photo booth, a spray booth, a machine enclosure, a kiosk, a stall. Put a machine inside on its bottom beams',
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
  k.save('seed.conveyor', 'Belt conveyor (on legs)', 'A belt conveyor sized by its length, belt width and height (mm, a toy\'s 200 to a line\'s 10000; proportions typical, recalled): a drive roller and a tail roller on their axles (clear: they turn), a slider bed between with the belt\'s top run on it and its return run under (the wrap round the rollers not drawn), a side rail each side holding the rollers\' axles, four legs. Things ride its top run; put a chute or a bin at its tail, a sorting flap over it. It offers drive roller axle/axis (a motor\'s or a belt drive\'s line) and tail roller axle/axis',
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
function claw(): void {
  const k = new Kit('A claw', ['mechanical', 'robotics']);
  k.in('reach', 600, 'a finger\'s reach from its pivot, mm'); k.in('fingers', 4, 'how many fingers, 2 to 5');
  k.rod('pin', 'finger pivot', '=reach*0.025', '=reach*0.2', 'steel-alloy');
  k.rod('boss', 'finger knuckle', '=reach*0.06', '=reach*0.1', 'steel-low');
  k.box('bar', 'finger', '=reach*0.6', '=reach*0.08', '=reach*0.08', 'steel-low');
  k.box('tip', 'finger tine', '=reach*0.08', '=reach*0.08', '=reach*0.6', 'steel-alloy');
  k.over('f0', 'pin', 'boss', 'finger pivot/axis');
  k.onto('f1', 'f0', 'bar', '+x');
  k.box('lug', 'pivot lug', '=reach*0.16', '=reach*0.03', '=reach*0.15', 'steel-low');
  k.onto('f2', 'f1', 'lug', '+y', 'lo,mid');
  k.onto('f3', 'f2', 'tip', '+z', 'hi,lo');
  k.turn('unit', 'f3', 'x');
  k.op('ringed', 'room.ring', { name: 'claw fingers', n: '=fingers', R: '=reach*0.75', fit: 'clear', out: 'yes' }, 'The fingers round the hub, each facing out', { block: 'unit' });
  k.rod('hub', 'claw hub', '=reach*0.5', '=reach*0.08');
  k.rod('cylb', 'claw cylinder', '=reach*0.12', '=reach*0.7', 'steel-alloy');
  k.rod('eye', 'lifting eye', '=reach*0.06', '=reach*0.12', 'steel-alloy');
  k.stack('done', 'claw', 'y', ['ringed', 'hub', 'cylb', 'eye']);
  k.save('seed.claw', 'Claw (industrial grab, grapple)', 'An industrial grab or claw sized by a finger\'s reach (mm, a toy\'s 50 to a scrap grapple\'s 2000; proportions typical, recalled) with 2 to 5 fingers: each finger a knuckle on its pivot pin (clear: it swings) with an arm out and a tine down, the pivots held by lugs under a round hub, a hydraulic cylinder up the hub\'s middle and a lifting eye on top. Hang it from a crane\'s hook, a gantry\'s carriage or an arm\'s wrist by its lifting eye (lifting eye/axis); it offers finger pivot/axis for each finger. Its links from the cylinder to the fingers not drawn',
    'Fingers on pivots round a hub under a cylinder: a grab that closes on a load', 'done');
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
  k.save('seed.hover-skirt-hull', 'Hovercraft hull (deck, skirt, lift fan, thrust fan)', 'A hovercraft\'s hull sized by its length and width (mm, a model\'s 300 to a four-seater\'s 6000; proportions typical, recalled): a deck on a rubber skirt round its whole edge (the air cushion\'s plenum open under it), a lift fan in its duct over a hole through the deck\'s middle (the fan turns on its shaft, clear), a ducted thrust fan standing at the stern (it turns) with two rudders behind it on a bar, a seat at the bow. It offers lift fan shaft/axis and thrust fan shaft/axis (a motor\'s line). The rudders drawn fixed; its engine not drawn',
    'A deck on a skirt with a lift fan through it and a ducted thrust fan with rudders at the stern', 'h5');
}

trackedBase(); dozerBlade(); cab(); liftMast(); turret(); wheeledChassis(); cubeFrameSeed(); booth(); conveyor(); chute(); bin(); claw(); cargoBed(); hoverHull();
