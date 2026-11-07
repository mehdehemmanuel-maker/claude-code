// Robots, electronics, tools and toys as assemblies (decision 0029, rough; sizes typical where no product is named):
// a turntable, a humanoid torso, a delta robot, a SCARA arm, a telescope, a microscope, a drone with a gimbal, a rover, a
// balancing robot, a line follower and the rest, built as things.ts builds: piece.* nodes, other assemblies by seed.* id and
// the room's operations. Where a part should move (a platter, a link, a wheel), it goes over its shaft with a clear fit.
// Loaded by one import in seeds.ts.

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';


/** A board being built a node at a time, saved as a library block (as robots.ts's assemblies are). */
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
  outs(from: string): void { this.output('block', 'block', from, 'block'); this.output('thing', 'assembly', from, 'thing'); this.output('pieces', 'integer', from, 'pieces'); this.output('offers', 'list<text>' as Type, from, 'offers'); this.output('says', 'text', from, 'says'); }
  /** One of several builds by a choice wired from an input: its block, its thing and what it says, each picked. */
  picked(choice: string, label: string, builds: Record<string, string>): void {
    const options = Object.keys(builds).join('|');
    for (const [port, type] of [['block', 'block'], ['thing', 'assembly'], ['pieces', 'integer'], ['offers', 'list<text>'], ['says', 'text']] as const) {
      const id = this.op(`pick_${port}`, 'pick', { options }, port === 'block' ? label : `${label}: its ${port}`, Object.fromEntries(Object.entries(builds).map(([k, n]) => [k, `${n}.${port}`])));
      this.w(choice, 'value', id, 'which'); this.output(port, type as Type, id, 'chosen');
    }
  }
  save(id: string, name: string, says: string, gloss: string, domains = ['mechanical']): BlockDef {
    layOut(this.b); const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] } }); register(d); return d;
  }
}
function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}


const HORN = { name: 'servo horn', shape: 'tube', mat: 'pom', a: 5.2, b: 10, c: 3 };
const D = ['mechanical', 'electrical'];
function turntable(): void {
  // (a motorised turntable, sizes typical: a 160 × 160 × 6 base plate, an N20 gear motor under it, a Ø10 post up from the plate and a Ø200 platter over the post, a clear fit: it turns)
  const s = new Asm('A turntable');
  s.input('platter', 'number', 100, 'the platter\'s radius, mm', [], 'platter.b');
  s.n('piece.gearmotor', {}, 'The gear motor, N20', 'gm');
  s.n('piece.plate', { name: 'turntable base', mat: 'al-6061', w: 160, t: 6, d: 160, holes: '-60,-60; 60,-60; -60,60; 60,60', hole: 4.5 }, 'The base plate, four holes', 'base');
  s.n('piece.shaft', { size: '10', length: 60 }, 'The post, Ø10', 'post');
  s.op('under', 'room.stack', { name: 'turntable', axis: 'y', fit: 'touch', order: 'gm, base, post' }, 'Motor, plate, post', { blocks: ['gm', 'base', 'post'] });
  s.n('room.make', { name: 'platter', shape: 'tube', mat: 'al-6061', a: 6.2, b: 100, c: 8 }, 'The platter, bored for the post', 'platter');
  s.op('all', 'room.over', { line: 'Ø10 shaft/axis', where: 'hi', fit: 'clear' }, 'The platter over its post: it turns', { host: 'under', sleeve: 'platter' });
  s.outs('all');
  s.save('seed.turntable', 'Turntable', 'A motorised turntable (sizes typical): a base plate (turntable base/holes) with an N20 gear motor under it, a Ø10 post and a platter over the post (a clear fit: it turns). Setting: platter (its radius), mm', 'A turntable: platter on a post over a gear motor, as one node', D);
}
function humanoid(): void {
  // (a humanoid torso, sizes typical of a 1:3 hobby build: a 300 × 400 × 180 ABS torso, a Ø140 head on a neck, a robot arm (seed.robot-arm) at each shoulder)
  const s = new Asm('A humanoid torso');
  s.n('room.make', { name: 'torso', shape: 'box', mat: 'abs', a: 300, b: 400, c: 180 }, 'The torso (ABS), 300 × 400 × 180', 'torso');
  s.n('room.make', { name: 'neck', shape: 'rod', mat: 'abs', a: 25, b: 40 }, 'The neck', 'neck');
  s.n('room.make', { name: 'head', shape: 'rod', mat: 'abs', a: 70, b: 140 }, 'The head, Ø140', 'head');
  s.op('top', 'room.stack', { name: 'humanoid', axis: 'y', fit: 'touch', order: 'torso, neck, head' }, 'Torso, neck, head', { blocks: ['torso', 'neck', 'head'] });
  s.n('seed.robot-arm', {}, 'An arm', 'arm');
  s.op('armr', 'room.turn', { axis: 'z', degrees: 90 }, 'Its arm out to the right', { block: 'arm' });
  s.op('arml', 'room.turn', { axis: 'z', degrees: -90 }, 'Its arm out to the left', { block: 'arm' });
  s.op('r', 'room.onto', { face: '+x', fit: 'touch' }, 'The right arm at the shoulder', { host: 'top', child: 'armr' });
  s.op('all', 'room.onto', { face: '-x', fit: 'touch' }, 'The left arm at the shoulder', { host: 'r', child: 'arml' });
  s.outs('all');
  s.save('seed.humanoid-torso', 'Humanoid torso', 'A humanoid torso (sizes typical): an ABS torso 300 × 400 × 180, a neck and a Ø140 head, and a robot arm (seed.robot-arm) at each shoulder', 'A humanoid torso with a head and two arms, as one node', D);
}
function delta(): void {
  // (a delta robot, sizes typical of a small pick-and-place: a Ø300 top plate, three arms in a ring, a Ø100 effector plate)
  const s = new Asm('A delta robot');
  s.input('reach', 'number', 300, 'the arms\' length, mm', [], 'arm.b');
  s.n('room.make', { name: 'delta top plate', shape: 'rod', mat: 'al-6061', a: 150, b: 10 }, 'The top plate, Ø300', 'top');
  s.n('room.make', { name: 'delta arm', shape: 'box', mat: 'al-6061', a: 14, b: 300, c: 14 }, 'An arm (a pair of rods drawn as one bar)', 'arm');
  s.op('arms', 'room.ring', { name: 'delta arms', n: 3, R: 90, fit: 'clear', out: 'yes' }, 'Three arms, turned out', { block: 'arm' });
  s.n('room.make', { name: 'effector', shape: 'rod', mat: 'al-6061', a: 50, b: 8 }, 'The effector plate, Ø100', 'eff');
  s.op('lo', 'room.stack', { name: 'delta robot', axis: 'y', fit: 'touch', align: 'delta arms/axis', order: 'top, arms, eff' }, 'Plate, arms, effector, on the ring\'s axis', { blocks: ['top', 'arms', 'eff'] });
  s.outs('lo');
  s.save('seed.delta-robot', 'Delta robot', 'A delta robot (sizes typical): a Ø300 top plate, three arms in a ring and a Ø100 effector plate under them. Setting: reach (the arms\' length), mm', 'A delta robot: top plate, three arms and an effector, as one node', D);
}
function scara(): void {
  // (a SCARA arm, sizes typical: a base plate, a Ø16 column, link 1 (200) over it, link 2 (150) on link 1)
  const s = new Asm('A SCARA arm');
  s.n('piece.plate', { name: 'scara base', mat: 'al-6061', w: 200, t: 12, d: 200, holes: '-80,-80; 80,-80; -80,80; 80,80', hole: 9 }, 'The base plate', 'base');
  s.n('piece.shaft', { size: '16', length: 120 }, 'The column, Ø16', 'col');
  s.op('b0', 'room.stack', { name: 'scara', axis: 'y', fit: 'touch', order: 'base, col' }, 'Column on the base', { blocks: ['base', 'col'] });
  s.n('room.make', { name: 'scara hub', shape: 'tube', mat: 'al-6061', a: 9.6, b: 30, c: 50 }, 'Link 1\'s hub, bored for the column', 'hub');
  s.op('j0', 'room.over', { line: 'Ø16 shaft/axis', where: 'hi', fit: 'clear' }, 'The hub over the column: the shoulder turns', { host: 'b0', sleeve: 'hub' });
  s.n('room.make', { name: 'scara link 1', shape: 'box', mat: 'al-6061', a: 200, b: 30, c: 50 }, 'Link 1, 200 long', 'l1');
  s.op('j1', 'room.onto', { face: '+x', fit: 'touch' }, 'Link 1 on its hub', { host: 'j0', child: 'l1' });
  s.n('room.make', { name: 'scara link 2', shape: 'box', mat: 'al-6061', a: 150, b: 30, c: 40 }, 'Link 2, 150 long', 'l2');
  s.op('all', 'room.onto', { face: '+y', fit: 'touch' }, 'Link 2 on link 1 (the elbow)', { host: 'j1', child: 'l2' });
  s.outs('all');
  s.save('seed.scara', 'SCARA arm', 'A SCARA arm (sizes typical): a base plate (scara base/holes), a Ø16 column, link 1 (200 mm) over the column (a clear fit: it turns) and link 2 (150 mm) on it', 'A SCARA arm: column, two links, as one node', D);
}
function telescope(): void {
  // (a small refractor, sizes typical: a 600 mm tube of 60 mm aluminium, an eyepiece barrel, a mount saddle on a tripod (seed.tripod))
  const s = new Asm('A telescope');
  s.n('seed.tripod', { legs: '1200' }, 'The tripod', 'tri');
  s.n('room.make', { name: 'saddle', shape: 'box', mat: 'al-6061', a: 120, b: 30, c: 60 }, 'The mount saddle', 'sad');
  s.n('piece.altube', { size: '25x2', length: 600 }, 'The tube, 600 long (typical)', 'tube');
  s.n('room.make', { name: 'eyepiece', shape: 'rod', mat: 'steel-low', a: 16, b: 80 }, 'The eyepiece barrel, Ø32', 'eye');
  s.op('tub', 'room.turn', { axis: 'z', degrees: 90 }, 'The tube laid across', { block: 'tube' });
  s.op('base', 'room.stack', { name: 'telescope mount', axis: 'y', fit: 'touch', order: 'tri, sad' }, 'Saddle on the tripod', { blocks: ['tri', 'sad'] });
  s.op('tt', 'room.onto', { face: '+y', fit: 'touch' }, 'The tube on the saddle', { host: 'base', child: 'tub' });
  s.op('all', 'room.onto', { face: '+y', fit: 'touch' }, 'The eyepiece on the tube', { host: 'tt', child: 'eye' });
  s.outs('all');
  s.save('seed.telescope', 'Telescope', 'A small refractor telescope (sizes typical): a 600 mm aluminium tube on a saddle on a tripod (seed.tripod), an eyepiece barrel on it', 'A telescope on a tripod, as one node', D);
}
function microscope(): void {
  // (a compound microscope, sizes typical: a 200 × 160 base, a Ø30 column, a stage plate, a head of objective, body tube and eyepiece)
  const s = new Asm('A microscope');
  s.n('room.make', { name: 'microscope base', shape: 'box', mat: 'iron-cast', a: 200, b: 25, c: 160 }, 'The base (cast iron)', 'base');
  s.n('room.make', { name: 'microscope column', shape: 'rod', mat: 'al-6061', a: 15, b: 250 }, 'The column, Ø30', 'col');
  s.n('room.make', { name: 'microscope stage', shape: 'box', mat: 'steel-low', a: 100, b: 6, c: 100 }, 'The stage plate', 'stage');
  s.op('st', 'room.onto', { face: '+z', fit: 'touch' }, 'The stage on the column', { host: 'col', child: 'stage' });
  s.n('room.make', { name: 'objective', shape: 'rod', mat: 'steel-low', a: 10, b: 40 }, 'The objective, Ø20', 'obj');
  s.n('room.make', { name: 'body tube', shape: 'rod', mat: 'al-6061', a: 25, b: 150 }, 'The body tube, Ø50', 'body');
  s.n('room.make', { name: 'eyepiece', shape: 'rod', mat: 'steel-low', a: 12, b: 50 }, 'The eyepiece, Ø24', 'eye');
  s.op('head', 'room.stack', { name: 'microscope head', axis: 'y', fit: 'touch', order: 'obj, body, eye' }, 'Objective, tube, eyepiece', { blocks: ['obj', 'body', 'eye'] });
  s.op('stand', 'room.stack', { name: 'microscope', axis: 'y', fit: 'touch', order: 'base, st' }, 'The column on the base', { blocks: ['base', 'st'] });
  s.op('all', 'room.onto', { face: '+x', fit: 'touch' }, 'The head on the column', { host: 'stand', child: 'head' });
  s.outs('all');
  s.save('seed.microscope', 'Microscope', 'A compound microscope (sizes typical): a cast-iron base, a Ø30 column, a stage plate, and a head (objective, body tube, eyepiece)', 'A microscope: base, column, stage, tube, as one node', D);
}
function gimbalDrone(): void {
  // (a drone with a two-axis camera gimbal under it: the quadcopter (seed.quadcopter), a yaw servo whose horn is over its spline, a yoke, a pitch servo and the camera (seed.camera); SG90 servos, typical)
  const s = new Asm('A drone with a gimbal');
  s.n('seed.quadcopter', {}, 'The quadcopter', 'quad');
  s.n('piece.servo', { size: 'SG90' }, 'The yaw servo', 'sa');
  s.n('room.make', HORN, 'A servo horn (POM)', 'horn');
  s.op('sah', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over the spline: yaw', { host: 'sa', sleeve: 'horn' });
  s.n('room.make', { name: 'gimbal yoke', shape: 'box', mat: 'al-6061', a: 40, b: 4, c: 40 }, 'The yoke', 'yoke');
  s.n('piece.servo', { size: 'SG90' }, 'The pitch servo', 'sb');
  s.n('seed.camera', {}, 'The camera', 'cam');
  s.op('camx', 'room.turn', { axis: 'x', degrees: 90 }, 'Looking down', { block: 'cam' });
  s.op('all', 'room.stack', { name: 'drone with gimbal', axis: 'y', fit: 'touch', order: 'camx, sb, yoke, sah, quad' }, 'Camera, pitch servo, yoke, yaw servo, under the drone', { blocks: ['camx', 'sb', 'yoke', 'sah', 'quad'] });
  s.outs('all');
  s.save('seed.gimbal-drone', 'Drone with a camera gimbal', 'A drone with a camera gimbal (sizes typical): the quadcopter (seed.quadcopter) with a yaw servo under it, a yoke, a pitch servo and the camera (seed.camera) at the bottom', 'A quadcopter with a two-axis camera gimbal, as one node', D);
}
function rover(): void {
  // (a small rover, sizes typical: the wheeled base (seed.wheeled-base), a solar panel (seed.solar-panel) on its deck, an aluminium mast, a camera (seed.camera) on the mast and an antenna rod beside it)
  const s = new Asm('A rover');
  s.n('seed.wheeled-base', {}, 'The wheeled base', 'base');
  s.n('seed.solar-panel', {}, 'The solar panel', 'sol');
  s.n('piece.altube', { size: '25x2', length: 300 }, 'The mast, 25 × 2 aluminium', 'mast');
  s.n('seed.camera', {}, 'The camera', 'cam');
  s.n('room.make', { name: 'rover antenna', shape: 'rod', mat: 'steel-low', a: 2, b: 200 }, 'The antenna, Ø4 × 200', 'ant');
  s.op('all', 'room.stack', { name: 'rover', axis: 'y', fit: 'touch', order: 'base, sol, mast, cam, ant' }, 'Base, panel, mast, camera, antenna', { blocks: ['base', 'sol', 'mast', 'cam', 'ant'] });
  s.outs('all');
  s.save('seed.rover', 'Rover', 'A small rover (sizes typical): the wheeled base (seed.wheeled-base) with a solar panel (seed.solar-panel) on its deck, a 300 mm aluminium mast, the camera (seed.camera) on the mast and an antenna rod', 'A rover: wheeled base, solar panel, mast, camera, antenna, as one node', D);
}
function balancing(): void {
  // (a two-wheeled self-balancing robot, sizes typical of a hobby build: two N20 gear motors each with a 65 mm wheel over its shaft (a clear fit: it turns), a chassis plate between them, a LiPo and a controller board above)
  const s = new Asm('A balancing robot');
  s.n('piece.gearmotor', {}, 'A gear motor, N20', 'gm');
  s.n('piece.wheel', {}, 'A wheel, 65 mm', 'wh');
  s.op('left', 'room.over', { line: 'N20 gear motor shaft/axis', where: 'hi', fit: 'clear' }, 'Its wheel over the shaft: it turns', { host: 'gm', sleeve: 'wh' });
  s.op('right', 'room.turn', { axis: 'y', degrees: 180 }, 'The other side, turned round', { block: 'left' });
  s.n('room.make', { name: 'balancer chassis', shape: 'box', mat: 'abs', a: 60, b: 4, c: 90 }, 'The chassis plate (ABS)', 'ch');
  s.n('piece.lipo', {}, 'The battery', 'bat');
  s.n('piece.devboard', {}, 'The controller board', 'ctl');
  s.op('body', 'room.stack', { name: 'balancer body', axis: 'y', fit: 'touch', order: 'ch, bat, ctl' }, 'Chassis, battery, board', { blocks: ['ch', 'bat', 'ctl'] });
  s.op('l', 'room.onto', { face: '-x', fit: 'touch' }, 'The left motor and wheel on the chassis', { host: 'body', child: 'left' });
  s.op('all', 'room.onto', { face: '+x', fit: 'touch' }, 'The right motor and wheel', { host: 'l', child: 'right' });
  s.outs('all');
  s.save('seed.balancing-robot', 'Balancing robot', 'A two-wheeled self-balancing robot (sizes typical): two N20 gear motors each with a 65 mm wheel over its shaft (a clear fit: they turn), a chassis plate, a LiPo and a controller board above', 'A two-wheeled balancing robot, as one node', D);
}
function lineFollower(): void {
  // (a line-following robot: the wheeled base (seed.wheeled-base) with a sensor bar (a PCB 80 × 1.6 × 15, typical) at its front)
  const s = new Asm('A line follower');
  s.n('seed.wheeled-base', {}, 'The wheeled base', 'base');
  s.n('room.make', { name: 'sensor bar', shape: 'box', mat: 'fr4', a: 80, b: 15, c: 1.6 }, 'The sensor bar (a PCB)', 'bar');
  s.n('piece.ledth', {}, 'A sensing LED', 'led');
  s.op('sens', 'room.onto', { face: '+z', fit: 'touch' }, 'An LED on the bar', { host: 'bar', child: 'led' });
  s.op('all', 'room.onto', { face: '+z', fit: 'touch' }, 'The bar at the base\'s front', { host: 'base', child: 'sens' });
  s.outs('all');
  s.save('seed.line-follower', 'Line-following robot', 'A line-following robot: the wheeled base (seed.wheeled-base) with a sensor bar (an 80 mm PCB, typical) and a sensing LED at its front', 'A line follower: base and sensor bar, as one node', D);
}
function piCase(): void {
  // (a Raspberry Pi 4 Model B in a case, sizes typical: a 100 × 24 × 70 box shell with a 2 mm wall, the board into its cavity, a lid on top)
  const s = new Asm('A Pi case');
  s.n('room.make', { name: 'pi case', shape: 'case', mat: 'abs', a: 100, b: 24, c: 70, d: 2, e: 2 }, 'The case (ABS), open at the top', 'case');
  s.n('piece.devboard', { size: 'Raspberry Pi 4 Model B' }, 'The Raspberry Pi 4 Model B', 'pi');
  s.op('boxed', 'room.into', { room: 'pi case/cavity', fit: 'clear' }, 'The board into the case', { host: 'case', child: 'pi' });
  s.n('room.make', { name: 'pi case lid', shape: 'box', mat: 'abs', a: 100, b: 2, c: 70 }, 'The lid', 'lid');
  s.op('all', 'room.stack', { name: 'Pi in its case', axis: 'y', fit: 'touch', order: 'boxed, lid' }, 'The lid on the case', { blocks: ['boxed', 'lid'] });
  s.outs('all');
  s.save('seed.pi-case', 'Raspberry Pi in a case', 'A Raspberry Pi 4 Model B (85 × 56 mm, its published size) in an ABS case (100 × 70 × 24, typical, 2 mm wall) with a lid on top', 'A Raspberry Pi in its case, as one node', D);
}
function monitor(): void {
  // (a 24 in desktop monitor, sizes typical: a 540 × 320 × 8 panel, a Ø30 neck and a 220 × 180 base)
  const s = new Asm('A monitor');
  s.n('room.make', { name: 'monitor base', shape: 'box', mat: 'abs', a: 220, b: 15, c: 180 }, 'The base', 'base');
  s.n('room.make', { name: 'monitor neck', shape: 'box', mat: 'abs', a: 40, b: 200, c: 25 }, 'The neck', 'neck');
  s.n('room.make', { name: 'monitor panel', shape: 'box', mat: 'abs', a: 540, b: 320, c: 8 }, 'The panel (24 in, typical)', 'panel');
  s.n('room.make', { name: 'monitor glass', shape: 'box', mat: 'glass', a: 520, b: 300, c: 1 }, 'The screen glass', 'glass');
  s.op('front', 'room.onto', { face: '+z', fit: 'touch' }, 'The glass on the panel\'s front', { host: 'panel', child: 'glass' });
  s.op('all', 'room.stack', { name: 'monitor', axis: 'y', fit: 'touch', order: 'base, neck, front' }, 'Base, neck, panel', { blocks: ['base', 'neck', 'front'] });
  s.outs('all');
  s.save('seed.monitor', 'Monitor', 'A desktop monitor (24 in class, sizes typical): a base, a neck, a 540 × 320 panel with its glass', 'A desktop monitor, as one node', D);
}
function floorLamp(): void {
  // (a floor lamp, sizes typical: a Ø300 weighted base, a 25 × 2 aluminium pole 1500 high, a lamp holder with a bulb and a shade)
  const s = new Asm('A floor lamp');
  s.input('height', 'number', 1500, 'the pole\'s height, mm', [], 'pole.length');
  s.n('room.make', { name: 'lamp base', shape: 'rod', mat: 'steel-low', a: 150, b: 15 }, 'The base, Ø300', 'base');
  s.n('piece.altube', { size: '25x2', length: 1500 }, 'The pole, 25 × 2 aluminium', 'pole');
  s.n('piece.lampholder', {}, 'The lamp holder', 'holder');
  s.n('piece.lampbulb', {}, 'The bulb', 'bulb');
  s.n('piece.lampshade', {}, 'The shade', 'shade');
  s.op('all', 'room.stack', { name: 'floor lamp', axis: 'y', fit: 'touch', order: 'base, pole, holder, bulb, shade' }, 'Base, pole, holder, bulb, shade', { blocks: ['base', 'pole', 'holder', 'bulb', 'shade'] });
  s.outs('all');
  s.save('seed.floor-lamp', 'Floor lamp', 'A floor lamp (sizes typical): a Ø300 steel base, a 25 × 2 aluminium pole, a lamp holder, a bulb and a shade. Setting: height (the pole\'s), mm', 'A floor lamp, as one node', ['mechanical', 'electrical', 'everyday']);
}
function toyCar(): void {
  // (a toy car, sizes typical of 1:32: a 120 × 25 × 55 body, two Ø6 axles through it, a toy wheel over each end (a clear fit: they turn))
  const s = new Asm('A toy car');
  s.n('room.make', { name: 'toy car body', shape: 'box', mat: 'abs', a: 120, b: 25, c: 55 }, 'The body (ABS)', 'body');
  s.n('room.make', { name: 'toy wheel', shape: 'rod', mat: 'rubber', a: 14, b: 8 }, 'A wheel, Ø28', 'wheel');
  s.n('room.make', { name: 'toy axle', shape: 'rod', mat: 'steel-low', a: 3, b: 80 }, 'An axle, Ø6', 'axle');
  s.op('a1', 'room.over', { line: 'toy axle/axis', where: 'lo', fit: 'clear' }, 'A wheel on one end: it turns', { host: 'axle', sleeve: 'wheel' });
  s.op('a2', 'room.over', { line: 'toy axle/axis', where: 'hi', fit: 'clear' }, 'And the other', { host: 'a1', sleeve: 'wheel' });
  s.op('all', 'room.stack', { name: 'toy car', axis: 'y', fit: 'touch', order: 'a2, body' }, 'The body on the axle', { blocks: ['a2', 'body'] });
  s.outs('all');
  s.save('seed.toy-car', 'Toy car', 'A toy car (sizes typical of 1:32): an ABS body 120 × 25 × 55 on an axle with a Ø28 wheel over each end (a clear fit: they turn)', 'A toy car: body, axle, two wheels, as one node', ['mechanical', 'everyday']);
}
function modelRocket(): void {
  // (a model rocket, sizes typical of an Estes-class kit: a Ø25 × 300 body tube, a nose cone, three fins in a ring and an engine mount tube at the tail)
  const s = new Asm('A model rocket');
  s.n('room.make', { name: 'rocket body', shape: 'tube', mat: 'cardboard', a: 11.5, b: 12.5, c: 300 }, 'The body tube, Ø25 × 300', 'body');
  s.n('piece.nosecone', {}, 'The nose cone', 'nose');
  s.n('room.make', { name: 'rocket fin', shape: 'box', mat: 'wood', a: 40, b: 60, c: 2 }, 'A fin (balsa class), 40 × 60 × 2', 'fin');
  s.op('fins', 'room.ring', { name: 'rocket fins', n: 3, R: 26, fit: 'clear', out: 'yes' }, 'Three fins, turned out', { block: 'fin' });
  s.op('all', 'room.stack', { name: 'model rocket', axis: 'y', fit: 'touch', order: 'fins, body, nose' }, 'Fins, body, nose', { blocks: ['fins', 'body', 'nose'] });
  s.outs('all');
  s.save('seed.model-rocket', 'Model rocket', 'A model rocket (sizes typical of a hobby kit): a Ø25 × 300 cardboard body tube, a nose cone and three fins in a ring at the tail', 'A model rocket: tube, nose, three fins, as one node', ['mechanical', 'aerospace', 'everyday']);
}
function catapult(): void {
  // (a tabletop catapult, sizes typical: a 300 × 200 × 20 wooden base, two 150 mm uprights, a Ø10 pivot rod through them, an arm tube over the pivot (a clear fit: it swings) and a cup)
  const s = new Asm('A catapult');
  s.n('room.make', { name: 'catapult base', shape: 'box', mat: 'wood', a: 300, b: 20, c: 200 }, 'The base', 'base');
  s.n('room.make', { name: 'catapult upright', shape: 'box', mat: 'wood', a: 20, b: 150, c: 20 }, 'An upright', 'up');
  s.n('piece.shaft', { size: '10', length: 160 }, 'The pivot, Ø10', 'pivot');
  s.n('room.make', { name: 'catapult arm', shape: 'tube', mat: 'wood', a: 6.2, b: 12, c: 250 }, 'The arm, bored for the pivot', 'arm');
  s.op('armed', 'room.over', { line: 'Ø10 shaft/axis', where: 'mid', fit: 'clear' }, 'The arm over the pivot: it swings', { host: 'pivot', sleeve: 'arm' });
  s.n('piece.drawncup', {}, 'The cup', 'cup');
  s.op('loaded', 'room.onto', { face: '+y', fit: 'touch' }, 'The cup on the arm', { host: 'armed', child: 'cup' });
  s.op('frame', 'room.stack', { name: 'catapult', axis: 'x', fit: 'clear', order: 'up, loaded, up' }, 'The pivot between the uprights', { blocks: ['up', 'loaded', 'up'] });
  s.op('all', 'room.onto', { face: '+y', fit: 'touch' }, 'On the base', { host: 'base', child: 'frame' });
  s.outs('all');
  s.save('seed.catapult', 'Catapult', 'A tabletop catapult (sizes typical): a wooden base, two uprights, a Ø10 pivot between them, an arm over the pivot (a clear fit: it swings) and a cup on the arm', 'A catapult: base, uprights, pivot, arm, cup, as one node', ['mechanical', 'everyday']);
}
function gearTrain(): void {
  // (a two-gear toy: a module 2 gear of 40 teeth on a rod with a crank handle, meshed with one of 30 teeth on a second rod, both a clear fit (they turn); sizes as starters.ts's gear and crank)
  const s = new Asm('A gear train toy');
  s.n('piece.gear', { module: '2', teeth: 40, width: 20, bore: 8 }, 'The first gear, 40 teeth', 'gA');
  s.n('room.make', { name: 'rod A', shape: 'rod', mat: 'steel-low', a: 5, b: 120 }, 'A rod, Ø10 × 120', 'rA');
  s.op('onA', 'room.through', { line: 'm2 z40 spur gear/axis', from: 'below', fit: 'clear' }, 'The rod through the gear: it turns', { host: 'gA', passer: 'rA' });
  s.n('piece.gear', { module: '2', teeth: 30, width: 20, bore: 8 }, 'The second gear, 30 teeth', 'gB');
  s.n('room.make', { name: 'rod B', shape: 'rod', mat: 'steel-low', a: 5, b: 120 }, 'A second rod', 'rB');
  s.op('onB', 'room.through', { line: 'm2 z30 spur gear/axis', from: 'below', fit: 'clear' }, 'The second rod through the second gear', { host: 'gB', passer: 'rB' });
  s.op('all', 'room.mesh', { line: 'm2 z40 spur gear/axis', gear: 'm2 z30 spur gear/axis', toward: '+x', fit: 'slide' }, 'Meshed beside the first', { host: 'onA', gear: 'onB' });
  s.outs('all');
  s.save('seed.gear-train-toy', 'Gear train toy', 'A gear train toy: a module 2 gear of 40 teeth on a rod meshed with one of 30 teeth on a second rod, both a clear fit (they turn); the gear ratio is 40:30', 'Two meshed gears on rods, as one node', ['mechanical', 'everyday']);
}
// SEEDS
let made = false;
export function makeRobots2(): void {
  if (made) return; made = true;
  rover(); balancing(); lineFollower(); piCase(); monitor(); floorLamp(); toyCar(); modelRocket(); catapult(); gearTrain();
  turntable(); humanoid(); delta(); scara(); telescope(); microscope(); gimbalDrone();
}
makeRobots2();
