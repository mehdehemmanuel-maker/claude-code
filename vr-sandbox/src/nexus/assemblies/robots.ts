// Robot and aircraft assemblies (decision 0027): a quadcopter, a robot arm, a gripper, a pan-tilt head and a wheeled base,
// each a board of piece.* nodes and the room's operations folded into one library block of the settings that matter,
// so a request for "a drone with a robot arm attached" starts from real assemblies instead of one plan of loose solids.
// Nothing here places by number: every piece is made by room.make or a piece.* node and put together by stack, onto,
// over, through, ring and turn. Where a piece should move (a servo's horn, a prop, a wheel), it goes over its shaft or
// spline with a clear fit: the joint the movement work reads. A setting that changes what is built (a frame's class, an
// arm's joints, two or four wheels driven) builds each choice and picks one; the rest are bound to inner settings
// (group.in `into`). Sizes are a real product's published figures where one is named (its source beside it), else
// labelled typical. Loaded by one import in seeds.ts; it needs only blocks.ts's pieces and operations, and its own blocks
// in the order below (the gripper before the arm).

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

const SERVOS = ['SG90', 'MG90S', 'MG996R', 'standard'];

/** A board being built a node at a time, saved as a library block (as seeds.ts's seeds are). */
class Asm {
  readonly b: Board; private k = 0;
  constructor(title: string) { this.b = emptyBoard(title); }
  n(blockId: string, set: Record<string, unknown>, label: string, id = `n${this.k++}`): string { placeBlock(this.b, blockId, 0, 0, set, id); this.b.nodes[id]!.label = label; return id; }
  /** An input: bound to inner settings (`into`, "node.setting; …") or, with none, a value wired on. */
  input(name: string, type: Type, def: unknown, says: string, choices: string[] = [], into = ''): string { return this.n('group.in', { name, type, unit: '', default: String(def), choices: choices.join('|'), says, ...(into ? { into } : {}) }, `in: ${name}`, `in_${name}`); }
  output(name: string, type: Type, from: string, port: string): void { const id = this.n('group.out', { name, type, unit: '' }, `out: ${name}`, `out_${name}`); this.w(from, port, id, 'value'); }
  w(from: string, out: string, to: string, inp: string): void { wire(this.b, from, out, to, inp); }
  /** An operation on blocks wired in: [node, port] each into its input. */
  op(id: string, blockId: string, set: Record<string, unknown>, label: string, ins: Record<string, string | string[]>): string {
    this.n(blockId, set, label, id);
    for (const [inp, from] of Object.entries(ins)) for (const f of Array.isArray(from) ? from : [from]) { const [nd, port] = f.includes('.') ? f.split('.') as [string, string] : [f, 'block']; this.w(nd, port, id, inp); }
    return id;
  }
  /** The block, the drawn thing and what it says, from a node giving all three. */
  outs(from: string): void { this.output('block', 'block', from, 'block'); this.output('thing', 'assembly', from, 'thing'); this.output('says', 'text', from, 'says'); }
  /** One of several builds by a choice wired from an input: its block, its thing and what it says, each picked. */
  picked(choice: string, label: string, builds: Record<string, string>): void {
    const options = Object.keys(builds).join('|');
    for (const [port, type] of [['block', 'block'], ['thing', 'assembly'], ['says', 'text']] as const) {
      const id = this.op(`pick_${port}`, 'pick', { options }, port === 'block' ? label : `${label}: its ${port}`, Object.fromEntries(Object.entries(builds).map(([k, n]) => [k, `${n}.${port}`])));
      this.w(choice, 'value', id, 'which'); this.output(port, type, id, 'chosen');
    }
  }
  save(id: string, name: string, says: string, gloss: string, domains = ['mechanical', 'electrical']): BlockDef {
    layOut(this.b); const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] } }); register(d); return d;
  }
}
function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}
/** A servo's horn: a round disc horn over its spline, a clear fit (the joint), 20 mm across, 3 mm thick (typical of the
 *  disc horns sold with micro servos); its bore wide enough for a standard servo's 25-tooth spline and the fit's gap. */
const HORN = { name: 'servo horn', shape: 'tube', mat: 'pom', a: 5.2, b: 10, c: 3 };

// ---- a gripper --------------------------------------------------------------------------------------------------------
function gripper(): void {
  // (a two-finger servo jaw, typical of the SG90 gripper kits: a mount plate (its holes the gripper's own, for an arm's
  // tool flange), the jaw servo standing on it, its horn over its spline (the joint), a palm on the horn, two fingers
  // standing on the palm as a ring of two, the jaw open between them. The linkage from the horn to the fingers is not
  // drawn (a finger sliding is not an operation yet): the fingers stand at the opening set)
  const s = new Asm('A gripper');
  s.input('servo', 'text', 'SG90', 'the jaw servo, by its model', SERVOS, 'servo.size');
  s.input('R', 'number', 14, 'each finger\'s middle from the jaw\'s, mm: the opening between them is twice it less a finger\'s 5 mm', [], 'fingers.R');
  s.input('finger', 'number', 30, 'the fingers\' length, mm', [], 'finger.b');
  s.n('piece.plate', { name: 'gripper mount', mat: 'al-6061', w: 40, t: 3, d: 30, holes: '-15,-10; 15,-10; -15,10; 15,10', hole: 3.2 }, 'Its mount plate (aluminium), four M3 holes', 'mount');
  s.n('piece.servo', { size: 'SG90' }, 'The jaw servo', 'servo');
  s.op('stood', 'room.stack', { name: 'gripper', axis: 'y', fit: 'touch', order: 'mount, servo' }, 'The servo on its mount plate', { blocks: ['mount', 'servo'] });
  s.n('room.make', HORN, 'Its horn (POM), 20 mm across', 'horn');
  s.op('horned', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'The horn over its spline, a clear fit: the jaw\'s joint', { host: 'stood', sleeve: 'horn' });
  s.n('room.make', { name: 'gripper palm', shape: 'box', mat: 'al-6061', a: 50, b: 3, c: 20 }, 'The palm (aluminium), 50 × 20 × 3 mm', 'palm');
  s.op('palmed', 'room.onto', { face: '+y', fit: 'touch' }, 'The palm on the horn', { host: 'horned', child: 'palm' });
  s.n('room.make', { name: 'gripper finger', shape: 'box', mat: 'pla', a: 5, b: 30, c: 16 }, 'A finger (printed PLA), 5 × 16 mm, 30 long (typical)', 'finger');
  s.op('fingers', 'room.ring', { name: 'gripper fingers', n: 2, R: 14, fit: 'clear' }, 'Two of them, facing across the jaw', { block: 'finger' });
  s.op('jaw', 'room.onto', { face: '+y', fit: 'touch' }, 'The fingers on the palm', { host: 'palmed', child: 'fingers' });
  s.outs('jaw');
  s.save('seed.gripper', 'Gripper (two-finger servo jaw)', 'A two-finger gripper: a mount plate (gripper mount/holes, four M3, for an arm\'s tool flange), the jaw servo on it, its horn over its spline (the jaw\'s joint), a palm on the horn and two fingers standing on it. Settings: the servo, each finger\'s distance from the middle R (the opening is 2R less 5 mm) and the fingers\' length, mm',
    'A two-finger servo gripper, as one node of a few settings');
}

// ---- a robot arm ------------------------------------------------------------------------------------------------------
function robotArm(): void {
  // (a hobby servo arm, typical of the 4 to 6 servo desktop kits: a base mount plate (aluminium, four M4 holes on a 64 mm
  // square), the base servo standing on it, its horn over its spline (joint 1, about the upright) and a turntable on the
  // horn; then a pitch joint made once and used again: a servo stood on its end (turned a quarter about z, its spline
  // out of its side), its horn over the spline (the joint) and an aluminium link plate against the horn, rising from the
  // servo's foot past its top, the next servo standing on the link's top; a wrist roll (a servo standing, its horn up)
  // for the fifth; a tool flange on the last horn or link and the gripper on it. Its three arms (3, 4 and 5 joints) are
  // each built and one picked by `joints`. Drawn standing straight up (every joint at its zero))
  const s = new Asm('A robot arm');
  const joints = s.input('joints', 'text', '4', 'how many joints: 3 (base, shoulder, elbow), 4 (and a wrist pitch) or 5 (and a wrist roll)', ['3', '4', '5']);
  s.input('link', 'number', 60, 'each link plate\'s length, mm', [], 'link.b');
  s.input('servo', 'text', 'SG90', 'the servos, by their model', SERVOS, 'yaw.size; pitch.size; roll.size');
  s.n('piece.plate', { name: 'arm base mount', mat: 'al-6061', w: 80, t: 4, d: 80, holes: '-32,-32; 32,-32; -32,32; 32,32', hole: 4.5 }, 'Its base mount plate (aluminium), four M4 holes', 'base');
  s.n('piece.servo', { size: 'SG90' }, 'The base servo, standing', 'yaw');
  s.op('yawon', 'room.stack', { name: 'robot arm', axis: 'y', fit: 'touch', order: 'base, yaw' }, 'On its base plate', { blocks: ['base', 'yaw'] });
  s.n('room.make', HORN, 'A servo horn (POM), 20 mm across (one made, used on each)', 'horn');
  s.op('yawh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over its spline: joint 1, about the upright', { host: 'yawon', sleeve: 'horn' });
  s.n('room.make', { name: 'arm turntable', shape: 'rod', mat: 'al-6061', a: 22, b: 3 }, 'The turntable (aluminium), 44 mm across', 'table');
  s.op('lower', 'room.onto', { face: '+y', fit: 'touch' }, 'The turntable on the horn', { host: 'yawh', child: 'table' });
  // (the pitch joint, made once)
  s.n('piece.servo', { size: 'SG90' }, 'A joint servo', 'pitch');
  s.op('stoodp', 'room.turn', { axis: 'z', degrees: -90 }, 'Stood on its end, its spline out of its side', { block: 'pitch' });
  s.op('pitchh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over the spline: a pitch joint', { host: 'stoodp', sleeve: 'horn' });
  s.n('room.make', { name: 'arm link', shape: 'box', mat: 'al-6061', a: 6, b: 60, c: 24 }, 'A link (aluminium bar), 24 × 6 mm (typical)', 'link');
  s.op('module', 'room.onto', { face: '+x', fit: 'touch', end: 'lo' }, 'The link against the horn, rising from the servo\'s foot', { host: 'pitchh', child: 'link' });
  // (the chains: shoulder and elbow; a wrist pitch; a wrist roll)
  s.op('c3', 'room.stack', { name: 'robot arm', axis: 'y', fit: 'touch' }, 'Shoulder and elbow on the turntable', { blocks: ['lower', 'module', 'module'] });
  s.op('c4', 'room.stack', { name: 'robot arm', axis: 'y', fit: 'touch' }, 'And a wrist pitch', { blocks: ['c3', 'module'] });
  s.n('piece.servo', { size: 'SG90' }, 'The wrist roll servo, standing', 'roll');
  s.op('rollh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over its spline: the wrist roll', { host: 'roll', sleeve: 'horn' });
  s.n('room.make', { name: 'wrist plate', shape: 'box', mat: 'al-5052', a: 44, b: 2, c: 30 }, 'The wrist plate (aluminium, 2 mm) the roll servo stands on, across the last link\'s top', 'wplate');
  s.op('c5', 'room.stack', { name: 'robot arm', axis: 'y', fit: 'touch', order: 'c4, wplate, rollh' }, 'And a wrist roll on its plate', { blocks: ['c4', 'wplate', 'rollh'] });
  // (the tool flange and the gripper on it, one block on each arm)
  s.n('room.make', { name: 'arm tool flange', shape: 'rod', mat: 'al-6061', a: 15, b: 3, holes: 4, pcd: 10, hole: 1.6 }, 'The tool flange (aluminium), 30 mm across, four M3 holes', 'flange');
  s.n('seed.gripper', { servo: 'SG90', R: 14, finger: 30 }, 'The gripper', 'grip');
  s.op('tool', 'room.stack', { name: 'arm tool', axis: 'y', fit: 'touch', order: 'flange, grip' }, 'The gripper on the flange', { blocks: ['flange', 'grip'] });
  for (const k of ['3', '4', '5']) s.op(`a${k}`, 'room.onto', { face: '+y', fit: 'touch' }, `The ${k}-joint arm, its tool on`, { host: `c${k}`, child: 'tool' });
  s.picked(joints, 'The arm of so many joints', { '3': 'a3', '4': 'a4', '5': 'a5' });
  s.save('seed.robot-arm', 'Robot arm (hobby servos)', 'A servo robot arm drawn standing straight up: a base mount plate (arm base mount/holes, four M4 on 64 mm), the base servo and its turntable (joint 1, about the upright), then pitch joints (a servo stood on its end, its horn over its spline, an aluminium link plate on the horn up to the next servo), a wrist roll for the fifth, a tool flange (arm tool flange/holes) and the gripper on it. Settings: joints (3, 4 or 5), the link plates\' length, mm, and the servos\' model',
    'A robot arm of hobby servos, as one node of a few settings');
}

// ---- a pan-tilt head --------------------------------------------------------------------------------------------------
function panTilt(): void {
  // (two servos: the pan servo standing on a mount plate, its horn over its spline (pan, about the upright), a bracket on
  // the horn, the tilt servo stood on its end on the bracket, its horn over its spline (tilt, about a level line), a camera
  // plate against the horn and a camera module on it: the Raspberry Pi Camera Module 2's board, 25 × 23.86 × 9 mm
  // overall (raspberrypi.com, its mechanical drawing), drawn as its board and its lens)
  const s = new Asm('A pan-tilt head');
  s.input('servo', 'text', 'SG90', 'the two servos, by their model', SERVOS, 'pan.size; tilt.size');
  s.n('piece.plate', { name: 'pan-tilt mount', mat: 'al-6061', w: 50, t: 3, d: 40, holes: '-20,-15; 20,-15; -20,15; 20,15', hole: 3.2 }, 'Its mount plate (aluminium), four M3 holes', 'base');
  s.n('piece.servo', { size: 'SG90' }, 'The pan servo, standing', 'pan');
  s.op('panon', 'room.stack', { name: 'pan-tilt head', axis: 'y', fit: 'touch', order: 'base, pan' }, 'On its mount plate', { blocks: ['base', 'pan'] });
  s.n('room.make', HORN, 'A servo horn (POM), 20 mm across', 'horn');
  s.op('panh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over its spline: pan', { host: 'panon', sleeve: 'horn' });
  s.n('room.make', { name: 'tilt bracket', shape: 'box', mat: 'al-5052', a: 40, b: 2, c: 26 }, 'The tilt bracket (aluminium, 2 mm)', 'bracket');
  s.op('bracketed', 'room.onto', { face: '+y', fit: 'touch' }, 'The bracket on the pan horn', { host: 'panh', child: 'bracket' });
  s.n('piece.servo', { size: 'SG90' }, 'The tilt servo', 'tilt');
  s.op('tiltup', 'room.turn', { axis: 'z', degrees: -90 }, 'Stood on its end, its spline out of its side', { block: 'tilt' });
  s.op('tilth', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over its spline: tilt', { host: 'tiltup', sleeve: 'horn' });
  s.n('room.make', { name: 'camera plate', shape: 'box', mat: 'al-5052', a: 2, b: 30, c: 30, face: '+x', points: '-10.5,-6.25; 10.5,-6.25; -10.5,6.25; 10.5,6.25', hole: 1.1 }, 'The camera plate (aluminium), M2 holes on the camera\'s 21 × 12.5 mm', 'cplate');
  s.op('plated', 'room.onto', { face: '+x', fit: 'touch' }, 'The camera plate against the tilt horn', { host: 'tilth', child: 'cplate' });
  s.n('room.make', { name: 'camera board', shape: 'box', mat: 'fr4', a: 1, b: 23.86, c: 25 }, 'The camera\'s board (FR-4), 25 × 23.86 mm', 'cam');
  s.n('room.make', { name: 'camera lens', shape: 'rod', mat: 'abs', a: 4, b: 8 }, 'Its lens housing, 8 mm across, 8 deep (to 9 overall)', 'lens');
  s.op('lensx', 'room.turn', { axis: 'z', degrees: -90 }, 'Looking out along x', { block: 'lens' });
  s.op('camera', 'room.stack', { name: 'camera module', axis: 'x', fit: 'touch', order: 'cam, lensx' }, 'The camera: its board, its lens', { blocks: ['cam', 'lensx'] });
  s.op('head', 'room.onto', { face: '+x', fit: 'touch' }, 'The camera on its plate', { host: 'plated', child: 'camera' });
  s.op('all', 'room.onto', { face: '+y', fit: 'touch' }, 'The tilt on the bracket', { host: 'bracketed', child: 'head' });
  s.outs('all');
  s.save('seed.pan-tilt', 'Pan-tilt head', 'A pan-tilt head of two hobby servos: a mount plate (pan-tilt mount/holes, four M3), the pan servo and its horn (pan, about the upright), a bracket, the tilt servo on its end and its horn (tilt), a camera plate (camera plate/holes, M2 on 21 × 12.5 mm) and a Raspberry Pi Camera Module 2 on it. Setting: the servos\' model',
    'A two-servo pan-tilt head with a camera, as one node');
}

// ---- a wheeled base -----------------------------------------------------------------------------------------------------
function wheeledBase(): void {
  // (gear motors laid across, a wheel over each output shaft (a clear fit: the wheel's joint), two back to back for an axle;
  // two-wheel drive: one axle and a castor in front; four-wheel: two axles; a deck on the motors between the wheels and a
  // mount plate on the deck. Gear motors and wheels by their families (typical sizes); the deck acrylic, 3 mm)
  const s = new Asm('A wheeled base');
  const drive = s.input('drive', 'text', '2WD', 'two wheels driven and a castor, or four driven', ['2WD', '4WD']);
  s.input('motor', 'text', 'JGA25', 'the gear motors, by their frame', ['N20', 'JGA25', '37GB'], 'motor.size');
  s.input('wheel', 'text', '75', 'the wheels, by their diameter, mm', ['40', '50', '60', '65', '75', '80', '100', '125'], 'wheel.size');
  s.input('deck', 'number', 100, 'the deck\'s width across, mm (less than the gap between the wheels)', [], 'deck.w');
  s.input('spacer', 'number', 1, 'the castor\'s spacer, mm: its 49 mm up to the motors\' tops (1 for 75 mm wheels on JGA25s)', [], 'spacer.b');
  s.n('piece.gearmotor', { size: 'JGA25' }, 'A gear motor', 'motor');
  s.n('piece.wheel', { size: '75' }, 'A wheel', 'wheel');
  s.op('lm', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across, its shaft to the left', { block: 'motor' });
  s.op('rm', 'room.turn', { axis: 'z', degrees: -90 }, 'And to the right', { block: 'motor' });
  s.op('lw', 'room.over', { line: 'shaft/axis', where: 'hi', fit: 'clear' }, 'Its wheel over the shaft', { host: 'lm', sleeve: 'wheel' });
  s.op('rw', 'room.over', { line: 'shaft/axis', where: 'hi', fit: 'clear' }, 'Its wheel over the shaft', { host: 'rm', sleeve: 'wheel' });
  s.op('axle', 'room.stack', { name: 'axle', axis: 'x', fit: 'clear', order: 'lw, rw' }, 'Two back to back', { blocks: ['lw', 'rw'] });
  s.n('piece.castor', { size: '30' }, 'A castor, 30 mm (its plate as high as a 75 mm wheel\'s axle and a 25 mm motor\'s top)', 'castor');
  s.n('room.make', { name: 'castor spacer', shape: 'box', mat: 'pmma', a: 47, b: 1, c: 47 }, 'A spacer on the castor\'s plate, up to the motors\' tops', 'spacer');
  s.op('castored', 'room.onto', { face: '+y', fit: 'touch' }, 'The spacer on the castor', { host: 'castor', child: 'spacer' });
  s.op('g2', 'room.stack', { name: 'running gear', axis: 'z', fit: 'clear', level: 'on the ground', order: 'castored, axle' }, 'The castor in front of the axle', { blocks: ['castored', 'axle'] });
  s.op('g4', 'room.stack', { name: 'running gear', axis: 'z', fit: 'clear', level: 'on the ground' }, 'Two axles', { blocks: ['axle', 'axle'] });
  s.op('pick', 'pick', { options: '2WD|4WD' }, 'Two driven or four', { '2WD': 'g2', '4WD': 'g4' });
  s.w(drive, 'value', 'pick', 'which');
  s.n('piece.plate', { name: 'rover deck', mat: 'pmma', w: 100, t: 3, d: 150, holes: '', hole: 0 }, 'The deck (acrylic, 3 mm)', 'deck');
  s.op('decked', 'room.onto', { face: '+y', fit: 'touch' }, 'The deck on the motors', { host: 'pick.chosen', child: 'deck' });
  s.n('piece.plate', { name: 'rover mount', mat: 'al-6061', w: 80, t: 3, d: 60, holes: '-30,-20; 30,-20; -30,20; 30,20', hole: 3.2 }, 'Its mount plate (aluminium), four M3 holes', 'mount');
  s.op('base', 'room.onto', { face: '+y', fit: 'touch' }, 'The mount plate on the deck', { host: 'decked', child: 'mount' });
  s.outs('base');
  s.save('seed.wheeled-base', 'Wheeled robot base', 'A wheeled robot base: gear motors laid across, a wheel over each shaft (its joint), two back to back on an axle; 2WD with a castor in front, or 4WD on two axles; a deck on the motors and a mount plate on it (rover mount/holes, four M3). Settings: drive (2WD, 4WD), the gear motors\' frame, the wheels\' diameter and the deck\'s width, mm',
    'A two- or four-wheel robot base, as one node of a few settings');
}

// ---- a quadcopter -----------------------------------------------------------------------------------------------------
/** A frame class: its motor-to-motor diagonal, its motors' stator, its props, its plates and arms, its battery. */
type Frame = { R: number; stator: [number, number]; prop: number; hub: number; plate: [string, number]; arm: [string, number, number]; bar: number; pack: [number, number, number]; tall: number };
const FRAMES: Record<string, Frame> = {
  // (a 250 class racer, typical: 250 mm motor to motor, 2204 to 2306 motors (a 22 mm stator 4 mm tall here), 5 inch props
  // (127 mm), a 60 mm glass-fibre hub (carbon is not in the materials yet), arms 12 × 4 mm, a 4S 1300 mAh pack 72 × 35 × 35)
  '250': { R: 125, stator: [11, 4], prop: 127, hub: 60, plate: ['fibreglass', 3], arm: ['fibreglass', 12, 4], bar: 81, pack: [72, 35, 35], tall: 25 },
  // (the DJI F450: diagonal wheelbase 450 mm, motors of a 22 × 12 mm stator, props 10 × 4.5 in (254 mm), its centre
  // boards PCB and its arms a strong polyamide (taken as PA66-GF30, an estimate) (DJI's F450 page and user manual); its hub
  // 140 mm across and arms 25 × 6 mm typical; a 3S 2200 mAh pack 105 × 33 × 24 (typical))
  '450': { R: 225, stator: [11, 12], prop: 254, hub: 140, plate: ['fr4', 2], arm: ['pa66-gf30', 25, 6], bar: 141, pack: [105, 33, 24], tall: 30 },
};
function quadcopter(): void {
  // (built for each class and one picked by `size`. The hub: a bottom plate with eight M3 holes, four standoffs down the
  // 30.5 mm square most flight boards are drilled to (typical), the flight board on them, four taller standoffs down the
  // outer holes and a top plate on those; the battery and its strap on the top plate, turned 45° so the front lies between
  // two arms (flown as an X). Each arm: a bar and a motor pad, the motor on the pad at its end (an outrunner: its base,
  // its stator, the bell made round the stator, a shaft along its axis, each shaft named for its arm); the arms against
  // the hub's four sides, all on the ground; a prop over each shaft, a clear fit (the joint), last, so nothing is laid
  // against a prop's sweep; the mount plate for a payload under it all)
  const s = new Asm('A quadcopter');
  const size = s.input('size', 'text', '250', 'the frame\'s class, by its motor-to-motor diagonal, mm', Object.keys(FRAMES));
  s.input('stack', 'number', 8, 'the flight board\'s standoffs, mm', [], Object.keys(FRAMES).map((k) => `fso${k}.length`).join('; '));
  for (const [k, f] of Object.entries(FRAMES)) {
    const q = (id: string) => `${id}${k}`, H = f.hub / 2 - 6, P = 15.25;
    s.n('piece.plate', { name: 'quadcopter bottom plate', mat: f.plate[0], w: f.hub, t: f.plate[1], d: f.hub, holes: `${-P},${-P}; ${P},${-P}; ${-P},${P}; ${P},${P}; ${-H},${-H}; ${H},${-H}; ${-H},${H}; ${H},${H}`, hole: 3.2 }, `${k}: the bottom plate, eight M3 holes`, q('bot'));
    s.n('piece.standoff', { length: 8 }, `${k}: a flight board standoff`, q('fso'));
    s.n('piece.standoff', { length: f.tall }, `${k}: a frame standoff, ${f.tall} mm`, q('tso'));
    let host = q('bot');
    for (let i = 0; i < 4; i++) host = s.op(q(`f${i}_`), 'room.through', { line: 'quadcopter bottom plate/holes', which: i }, `${k}: a standoff down hole ${i}`, { host, passer: q('fso') });
    s.n('piece.plate', { name: 'flight controller', mat: 'fr4', w: 36, t: 1.6, d: 36, holes: `${-P},${-P}; ${P},${-P}; ${-P},${P}; ${P},${P}`, hole: 3.2 }, `${k}: the flight board (FR-4), 36 mm, its holes on 30.5`, q('fc'));
    host = s.op(q('fcon'), 'room.onto', { face: '+y', fit: 'touch' }, `${k}: the flight board on its standoffs`, { host, child: q('fc') });
    for (let i = 4; i < 8; i++) host = s.op(q(`t${i}_`), 'room.through', { line: 'quadcopter bottom plate/holes', which: i }, `${k}: a frame standoff down hole ${i}`, { host, passer: q('tso') });
    s.n('piece.plate', { name: 'quadcopter top plate', mat: f.plate[0], w: f.hub, t: f.plate[1], d: f.hub, holes: '', hole: 0 }, `${k}: the top plate`, q('top'));
    host = s.op(q('topon'), 'room.onto', { face: '+y', fit: 'touch' }, `${k}: the top plate on the frame standoffs`, { host, child: q('top') });
    s.n('room.make', { name: 'lipo battery', shape: 'box', mat: 'pvc', a: f.pack[0], b: f.pack[2], c: f.pack[1] }, `${k}: the LiPo pack, ${f.pack.join(' × ')} mm (typical)`, q('bat'));
    s.n('room.make', { name: 'battery strap', shape: 'box', mat: 'nylon', a: 20, b: 1.5, c: f.pack[1] + 2 }, `${k}: its strap (20 mm), across its top`, q('strap'));
    s.op(q('pack'), 'room.onto', { face: '+y', fit: 'touch' }, `${k}: strapped`, { host: q('bat'), child: q('strap') });
    s.op(q('packx'), 'room.turn', { axis: 'y', degrees: 45 }, `${k}: turned 45°, its front between two arms`, { block: q('pack') });
    const hub = host;
    // (the motor, made once: base, stator, bell)
    s.n('room.make', { name: 'motor base', shape: 'rod', mat: 'al-6061', a: 14, b: 3 }, `${k}: the motor's base, 28 mm`, q('mb'));
    s.n('room.make', { name: 'motor stator', shape: 'tube', mat: 'steel-electrical', a: 2.5, b: f.stator[0], c: f.stator[1] }, `${k}: its stator, ${f.stator[0] * 2} × ${f.stator[1]} mm`, q('ms'));
    s.op(q('bell'), 'room.around', { name: 'motor bell', mat: 'al-6061', wall: 1.5, ends: 1.5, fit: 'clear', open: 'no' }, `${k}: the bell made round the stator`, { child: q('ms') });
    s.op(q('motor'), 'room.stack', { name: 'motor', axis: 'y', fit: 'touch', order: q('mb') + ', ' + q('bell') }, `${k}: the bell on its base`, { blocks: [q('mb'), q('bell')] });
    s.n('room.make', { name: 'motor pad', shape: 'box', mat: f.arm[0], a: 28, b: f.arm[2], c: 28 }, `${k}: a motor pad, 28 mm`, q('pad'));
    s.n('room.make', { name: 'quadcopter arm', shape: 'box', mat: f.arm[0], a: f.bar, b: f.arm[2], c: f.arm[1] }, `${k}: an arm along x, ${f.bar} mm`, q('ax'));
    s.n('room.make', { name: 'quadcopter arm', shape: 'box', mat: f.arm[0], a: f.arm[1], b: f.arm[2], c: f.bar }, `${k}: an arm along z`, q('az'));
    // (the four arms: each its bar, its pad at the outer end, the motor on the pad and a shaft of its own name)
    const arms: [string, string, 'x' | 'z', 'lo' | 'hi'][] = [['W', 'ax', 'x', 'lo'], ['E', 'ax', 'x', 'hi'], ['S', 'az', 'z', 'lo'], ['N', 'az', 'z', 'hi']];
    arms.forEach(([a, bar, axis, end], i) => {
      const order = end === 'lo' ? `${q('pad')}, ${q(bar)}` : `${q(bar)}, ${q('pad')}`;
      s.op(q(`arm${a}`), 'room.stack', { name: 'quadcopter arm', axis, fit: 'touch', order }, `${k}: arm ${a}, its pad at its end`, { blocks: [q(bar), q('pad')] });
      s.op(q(`on${a}`), 'room.onto', { face: '+y', fit: 'touch', end }, `${k}: the motor on its pad`, { host: q(`arm${a}`), child: q('motor') });
      s.n('room.make', { name: `motor ${i + 1} shaft`, shape: 'rod', mat: 'steel-alloy', a: 2.5, b: f.stator[1] + 22 }, `${k}: motor ${i + 1}'s shaft, 5 mm`, q(`sh${a}`));
      s.op(q(`m${a}`), 'room.through', { line: 'motor bell/axis', which: 0, from: 'below', fit: 'slide' }, `${k}: the shaft along the motor's axis`, { host: q(`on${a}`), passer: q(`sh${a}`) });
    });
    s.op(q('row'), 'room.stack', { name: 'quadcopter', axis: 'x', fit: 'touch', level: 'on the ground', order: `${q('mW')}, ${hub}, ${q('mE')}` }, `${k}: arms W and E against the hub`, { blocks: [q('mW'), hub, q('mE')] });
    s.op(q('cross'), 'room.stack', { name: 'quadcopter', axis: 'z', fit: 'touch', level: 'on the ground', order: `${q('mS')}, ${q('row')}, ${q('mN')}` }, `${k}: arms S and N`, { blocks: [q('mS'), q('row'), q('mN')] });
    // (the prop, made once: a hub and two blades, flat (a sleeve goes over its line as it was made: the pitch not drawn))
    s.n('room.make', { name: 'prop hub', shape: 'tube', mat: 'pc', a: 3.6, b: 7, c: 7 }, `${k}: the prop's hub`, q('ph'));
    for (const b of ['pa', 'pb']) s.n('room.make', { name: 'prop blade', shape: 'box', mat: 'pc', a: f.prop / 2 - 7, b: 1.5, c: f.prop > 200 ? 22 : 14 }, `${k}: a blade, the prop ${f.prop} mm across`, q(b));
    s.op(q('prop'), 'room.stack', { name: 'prop', axis: 'x', fit: 'touch', order: `${q('pa')}, ${q('ph')}, ${q('pb')}` }, `${k}: a two-blade prop`, { blocks: [q('pa'), q('ph'), q('pb')] });
    host = s.op(q('packed'), 'room.onto', { face: '+y', fit: 'touch' }, `${k}: the battery on the top plate`, { host: q('cross'), child: q('packx') });
    for (let i = 1; i <= 4; i++) host = s.op(q(`p${i}_`), 'room.over', { line: `motor ${i} shaft/axis`, where: 'hi', fit: 'clear' }, `${k}: a prop over motor ${i}'s shaft (its joint)`, { host, sleeve: q('prop') });
    s.n('piece.plate', { name: 'quadcopter mount', mat: 'al-6061', w: 80, t: 3, d: 80, holes: '-30,-30; 30,-30; -30,30; 30,30', hole: 3.2 }, `${k}: the payload mount plate (aluminium), four M3 holes`, q('mount'));
    s.op(q('quad'), 'room.onto', { face: '-y', fit: 'touch' }, `${k}: the mount plate under it`, { host, child: q('mount') });
  }
  s.picked(size, 'The quadcopter of that class', Object.fromEntries(Object.keys(FRAMES).map((k) => [k, `quad${k}`])));
  s.save('seed.quadcopter', 'Quadcopter (X frame)', 'A quadcopter on an X frame: a hub of two plates on standoffs, the flight board on its own standoffs inside (30.5 mm holes), the battery strapped on top, four arms with an outrunner motor on each (its stator, bell and shaft) and a prop over each shaft (its joint), and a payload mount plate underneath (quadcopter mount/holes, four M3 on 60 mm). Settings: size, 250 (typical of 250-class racers, 5 inch props) or 450 (the DJI F450\'s published figures, 10 inch props), and the flight board\'s standoffs, mm',
    'A quadcopter of a frame class, as one node of a few settings');
}

gripper();
robotArm();
panTilt();
wheeledBase();
quadcopter();
