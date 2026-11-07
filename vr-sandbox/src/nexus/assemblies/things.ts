// Things people ask for by name that the compound requests failed for want of (decision 0028): a boat, a wind turbine, a
// leg and the walking robots on four and six of them, a tripod, a camera, a winch, a centrifugal pump and a truck, each a
// board of piece.* nodes, other assemblies and the room's operations folded into one block of the settings that matter.
// Nothing here places by number: every piece is made by room.make or a piece.* node and put together by stack, onto,
// over, through, ring and turn. Where a piece should move (a rotor, a prop, a wheel, a drum, a servo's horn), it goes over
// its shaft (or its shaft through it) with a clear fit: the joint the movement work reads. A ring of three (blades, legs)
// has no middle a stack can centre on, so its first copy offers a line on the ring's own axis (a hole point that far in
// from its piece) and the stack is aligned on that line (room.stack's `align`). Sizes are labelled typical where no real
// product is named. Loaded by one import in seeds.ts, after robots.ts (the leg reuses the arm's servo joint).

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

const SERVOS = ['SG90', 'MG90S', 'MG996R', 'standard'];

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

/** A three-bladed rotor about y, centred on its own axis: each blade a root (upright, the hub's plates on it) and the
 *  blade turned about its length by its pitch, three of them a ring turned out, the hub's two plates on the roots, aligned
 *  on the ring's axis (the first root's hole point, that far in). Its hub plates bored for a shaft (over, by their bore). */
function rotor(s: Asm, q: string, o: { name: string; mat: string; rin: number; root: [number, number, number]; blade: [number, number, number]; pitch: number; hub: [number, number, number] }): string {
  const [Lr, Hr, Cr] = o.root, [Lb, tb, ch] = o.blade, R = o.rin + (Lr + Lb) / 2;
  s.n('room.make', { name: `${o.name} blade root`, shape: 'box', mat: o.mat, a: Lr, b: Hr, c: Cr }, `A blade's root`, `${q}root`);
  s.n('room.make', { name: `${o.name} blade`, shape: 'box', mat: o.mat, a: Lb, b: tb, c: ch }, `A blade, ${Lb} mm long, ${ch} mm chord`, `${q}blade`);
  s.op(`${q}pitched`, 'room.turn', { axis: 'x', degrees: o.pitch }, `Turned ${o.pitch}° about its length: its pitch`, { block: `${q}blade` });
  s.op(`${q}one`, 'room.stack', { name: `${o.name} blade`, axis: 'x', fit: 'touch', order: `${q}root, ${q}pitched` }, 'The blade on its root', { blocks: [`${q}root`, `${q}pitched`] });
  s.op(`${q}ring`, 'room.ring', { name: `${o.name} blades`, n: 3, R, fit: 'clear', out: 'yes' }, 'Three of them, turned to face out', { block: `${q}one` });
  for (const h of ['lo', 'hi']) s.n('room.make', { name: `${o.name} hub`, shape: 'tube', mat: o.mat === 'pc' ? 'pc' : 'al-6061', a: o.hub[0], b: o.hub[1], c: o.hub[2] }, `A hub plate (${h === 'lo' ? 'behind' : 'in front'})`, `${q}hub${h}`);
  return s.op(`${q}rotor`, 'room.stack', { name: `${o.name} rotor`, axis: 'y', fit: 'touch', align: `${o.name} blades/axis`, order: `${q}hublo, ${q}ring, ${q}hubhi` }, 'The hub\'s plates on the roots, on the ring\'s axis', { blocks: [`${q}hublo`, `${q}ring`, `${q}hubhi`] });
}

// ---- a wind turbine -----------------------------------------------------------------------------------------------------
function windTurbine(): void {
  // (a small horizontal-axis turbine, its sizes typical of the 1 kW class sold for homes: a steel base plate, a 114.3 mm
  // CHS mast (EN 10219 size, piece.hollowsection), a nacelle on a yaw ring the mast goes up through (a clear fit: it yaws),
  // a rotor shaft out of its front, and a three-bladed rotor over the shaft (a clear fit: it turns), Ø1.38 m, blades
  // pitched 12° (typical))
  const s = new Asm('A wind turbine');
  s.input('height', 'number', 6000, 'the mast\'s height, mm', [], 'mast.length');
  s.input('base', 'number', 400, 'the base plate\'s side, mm', [], 'base.w; base.d');
  rotor(s, 'r', { name: 'turbine', mat: 'fibreglass', rin: 90, root: [60, 30, 80], blade: [540, 8, 100], pitch: 12, hub: [11.5, 110, 15] });
  s.n('piece.shaft', { size: '20', length: 150 }, 'The rotor shaft, Ø20', 'shaft');
  s.op('spun', 'room.over', { line: 'Ø20 shaft/axis', where: 'hi', fit: 'clear' }, 'The rotor over its shaft: it turns', { host: 'shaft', sleeve: 'rrotor' });
  s.op('rx', 'room.turn', { axis: 'z', degrees: -90 }, 'Laid along x, the rotor in front', { block: 'spun' });
  s.n('room.make', { name: 'yaw ring', shape: 'tube', mat: 'steel-low', a: 58.2, b: 80, c: 40 }, 'The yaw ring, bored for the mast', 'yaw');
  // (decision 0029: a slewing bearing between the yaw ring and the nacelle (a ring, Ø160 × 20, typical, drawn as one piece):
  // the mast's top ends at the yaw ring's top, inside the bearing's bore, so the nacelle rests on the bearing and never on
  // the mast's tip, and the yaw is a joint by the fit alone)
  s.n('room.make', { name: 'slewing bearing', shape: 'tube', mat: 'steel-low', a: 58.2, b: 80, c: 20 }, 'The slewing bearing (typical), the mast\'s top inside its bore', 'slew');
  s.n('room.make', { name: 'nacelle', shape: 'box', mat: 'fibreglass', a: 700, b: 300, c: 300 }, 'The nacelle (glass fibre), 700 × 300 × 300 (typical)', 'nac');
  s.op('nu', 'room.stack', { name: 'wind turbine', axis: 'y', fit: 'touch', order: 'yaw, slew, nac' }, 'The nacelle on its slewing bearing on its yaw ring', { blocks: ['yaw', 'slew', 'nac'] });
  s.op('head', 'room.onto', { face: '+x', fit: 'touch' }, 'The rotor\'s shaft against the nacelle\'s front', { host: 'nu', child: 'rx' });
  s.n('piece.hollowsection', { size: 'CHS 114.3x3.6', length: 6000 }, 'The mast, CHS 114.3 × 3.6', 'mast');
  s.op('up', 'room.through', { line: 'yaw ring/axis', which: 0, from: 'above', fit: 'clear' }, 'The mast up through the yaw ring: it yaws', { host: 'head', passer: 'mast' });
  s.n('piece.plate', { name: 'turbine base', mat: 'steel-low', w: 400, t: 12, d: 400, holes: '-160,-160; 160,-160; -160,160; 160,160', hole: 9 }, 'The base plate, four M16 holes', 'base');
  s.op('wt', 'room.stack', { name: 'wind turbine', axis: 'y', fit: 'touch', align: 'CHS 114.3x3.6/axis', order: 'base, up' }, 'The mast on its base plate', { blocks: ['base', 'up'] });
  s.outs('wt');
  s.save('seed.wind-turbine', 'Wind turbine (three blades)', 'A small wind turbine (sizes typical of the 1 kW home class): a base plate (turbine base/holes, four M16), a CHS 114.3 mast up through a yaw ring (it yaws), a nacelle on the ring, a rotor shaft out of its front and a rotor over it (it turns): three glass-fibre blades pitched 12° on their roots, a ring turned out, between two hub plates, Ø1.38 m. Settings: height (the mast\'s) and base (the plate\'s side), mm',
    'A three-bladed wind turbine on a mast, as one node of a few settings', ['mechanical', 'electrical', 'structural']);
}

// ---- a boat -------------------------------------------------------------------------------------------------------------
function boat(): void {
  // (a small flat-bottomed aluminium boat, its sizes typical of a 12 ft jon boat: 3.66 m long, 1.22 m beam, 380 mm sides,
  // the hull a U section along its length, a plywood transom at the stern and a bow plate; an electric outboard on the
  // transom, typical of a 30 lb thrust trolling motor: its head, a 25 × 2 aluminium shaft tube 760 mm (30 in) long, a
  // clamp on the tube against the transom, the lower unit (a pod the prop shaft turns in, a clear fit), a three-bladed
  // prop on the shaft aft, and a rudder fin under the pod (an outboard steers by turning the whole motor))
  const s = new Asm('A small boat');
  s.input('length', 'number', 3660, 'the hull\'s length, mm', [], 'hull.a');
  s.input('transom', 'number', 25, 'the transom\'s thickness, mm (marine plywood)', [], 'tr.c');
  s.n('room.make', { name: 'hull', shape: 'section', mat: 'al-5052', a: 3660, pts: '-610,0; 610,0; 610,380; 607,380; 607,3; -607,3; -607,380; -610,380' }, 'The hull: a U section, 1220 wide, 380 deep, 3 mm aluminium', 'hull');
  s.n('room.make', { name: 'transom', shape: 'box', mat: 'wood', a: 1220, b: 380, c: 25 }, 'The transom (plywood)', 'tr');
  s.n('room.make', { name: 'bow plate', shape: 'box', mat: 'al-5052', a: 1220, b: 380, c: 3 }, 'The bow plate', 'bow');
  s.op('boat', 'room.stack', { name: 'boat', axis: 'z', fit: 'touch', order: 'tr, hull, bow' }, 'Transom, hull, bow', { blocks: ['tr', 'hull', 'bow'] });
  // (the lower unit, built standing and laid aft)
  s.n('piece.shaft', { size: '10', length: 300 }, 'The prop shaft, Ø10', 'ps');
  s.n('room.make', { name: 'motor pod', shape: 'tube', mat: 'al-6061', a: 6, b: 45, c: 160 }, 'The motor pod, Ø90', 'pod');
  s.op('podded', 'room.over', { line: 'Ø10 shaft/axis', where: 'mid', fit: 'clear' }, 'The shaft turns in the pod', { host: 'ps', sleeve: 'pod' });
  s.n('room.make', { name: 'motor strut', shape: 'box', mat: 'al-6061', a: 30, b: 60, c: 40 }, 'The strut up from the pod to the shaft tube', 'strut');
  s.op('struck', 'room.onto', { face: '+z', fit: 'touch' }, 'On the pod\'s side (its top, once laid aft)', { host: 'podded', child: 'strut' });
  s.n('room.make', { name: 'rudder', shape: 'box', mat: 'al-6061', a: 6, b: 140, c: 120 }, 'The rudder fin', 'rud');
  s.op('finned', 'room.onto', { face: '-z', fit: 'touch' }, 'Under the pod (once laid aft)', { host: 'struck', child: 'rud' });
  rotor(s, 'p', { name: 'prop', mat: 'pc', rin: 14, root: [10, 17, 20], blade: [80, 3, 40], pitch: 20, hub: [5, 20, 6] });
  s.op('propped', 'room.over', { line: 'Ø10 shaft/axis', where: 'hi', fit: 'touch' }, 'The prop on the shaft\'s end', { host: 'finned', sleeve: 'protor' });
  s.op('lower', 'room.turn', { axis: 'x', degrees: -90 }, 'Laid aft', { block: 'propped' });
  s.n('piece.altube', { size: '25x2', length: 760 }, 'The shaft tube, 25 × 2 aluminium, 760 long', 'tube');
  s.n('room.make', { name: 'clamp collar', shape: 'tube', mat: 'al-6061', a: 12.5, b: 22, c: 100 }, 'The clamp\'s collar round the tube', 'col');
  s.n('room.make', { name: 'transom clamp', shape: 'box', mat: 'al-6061', a: 80, b: 100, c: 260 }, 'The clamp bracket', 'brk');
  s.op('collared', 'room.over', { line: '25x2 aluminium tube/axis', where: 'mid', fit: 'touch' }, 'The clamp\'s collar on the tube', { host: 'tube', sleeve: 'col' });
  s.op('clamped', 'room.onto', { face: '+z', fit: 'touch' }, 'The clamp bracket against the collar, toward the boat', { host: 'collared', child: 'brk' });
  s.n('room.make', { name: 'motor head', shape: 'box', mat: 'abs', a: 150, b: 120, c: 260 }, 'The motor head (ABS)', 'mh');
  s.op('motor', 'room.stack', { name: 'outboard', axis: 'y', fit: 'touch', align: '25x2 aluminium tube/axis', order: 'lower, clamped, mh' }, 'Lower unit, tube, head, on the tube\'s axis', { blocks: ['lower', 'clamped', 'mh'] });
  s.op('all', 'room.onto', { face: '-z', fit: 'touch' }, 'The outboard on the transom', { host: 'boat', child: 'motor' });
  s.outs('all');
  s.save('seed.boat', 'Small boat with an outboard', 'A small flat-bottomed aluminium boat (sizes typical of a 12 ft jon boat: 3.66 m, 1.22 m beam, 380 mm sides): a U-section hull, a plywood transom at the stern, a bow plate; an electric outboard clamped on the transom: its head, a 760 mm shaft tube, the pod the prop shaft turns in (its joint), a three-bladed prop aft, a rudder fin under the pod. Settings: length (the hull\'s) and transom (its thickness), mm. It offers hull (Onto a face +y for a seat or a deck), Ø10 shaft/axis (the prop shaft)',
    'A small boat with a motor and a propeller at its stern, as one node', ['mechanical', 'vehicles']);
}

// ---- a camera -----------------------------------------------------------------------------------------------------------
function camera(): void {
  // (a camera, its sizes typical of an entry DSLR (about 122 × 93 × 70 mm) and its kit zoom (about Ø67 × 62 mm): the
  // body with a 1/4-20 tripod socket in its base (ISO 1222, a blind hole 9 deep, offered as a line), a viewfinder hump on
  // top, the lens on its front: a mount ring, the barrel and its front glass)
  const s = new Asm('A camera');
  s.input('lens', 'number', 55, 'the lens barrel\'s length, mm', [], 'barrel.b');
  s.input('body', 'number', 122, 'the body\'s width, mm', [], 'body.a');
  s.n('room.make', { name: 'camera body', shape: 'box', mat: 'pc', a: 122, b: 93, c: 70, face: '-y', points: '0,0', hole: 3.2, depth: 9 }, 'The body (polycarbonate), its tripod socket under it', 'body');
  s.n('room.make', { name: 'viewfinder', shape: 'box', mat: 'pc', a: 50, b: 22, c: 50 }, 'The viewfinder hump', 'vf');
  s.op('topped', 'room.onto', { face: '+y', fit: 'touch' }, 'On the body\'s top', { host: 'body', child: 'vf' });
  s.n('room.make', { name: 'lens mount', shape: 'tube', mat: 'steel-stainless', a: 22, b: 27, c: 5 }, 'The lens mount ring', 'mount');
  s.n('room.make', { name: 'lens barrel', shape: 'rod', mat: 'pc', a: 33.5, b: 55 }, 'The lens barrel, Ø67', 'barrel');
  s.n('room.make', { name: 'lens glass', shape: 'rod', mat: 'glass', a: 28, b: 2 }, 'Its front glass', 'glass');
  s.op('lens0', 'room.stack', { name: 'camera lens', axis: 'y', fit: 'touch', order: 'mount, barrel, glass' }, 'Mount, barrel, glass', { blocks: ['mount', 'barrel', 'glass'] });
  s.op('lensz', 'room.turn', { axis: 'x', degrees: 90 }, 'Looking forward', { block: 'lens0' });
  s.op('cam', 'room.onto', { face: '+z', fit: 'touch' }, 'The lens on the body\'s front', { host: 'topped', child: 'lensz' });
  s.outs('cam');
  s.save('seed.camera', 'Camera (body and lens)', 'A camera (sizes typical of an entry DSLR and its kit zoom): the body with a 1/4-20 tripod socket in its base (camera body/holes, a line pointing down, for a tripod\'s screw), a viewfinder hump on top, the lens on its front (a mount ring, the barrel, its glass). Settings: lens (the barrel\'s length) and body (its width), mm',
    'A camera with a lens and a tripod socket, as one node', ['mechanical', 'electrical']);
}

// ---- a tripod -----------------------------------------------------------------------------------------------------------
function tripod(): void {
  // (a photo tripod, its sizes typical: three aluminium legs, each a strip 25 × 25 sloping 22° out from the head down to
  // the floor, a ring of three turned out; the head (an aluminium disc) on their tops, aligned on the ring's axis; the
  // 1/4-20 camera screw up through its middle. Its legs' lengths chosen by `legs`)
  const s = new Asm('A tripod');
  const legs = s.input('legs', 'text', '1200', 'the legs\' height, mm', ['900', '1200', '1500']);
  s.input('screw', 'number', 20, 'the camera screw\'s length, mm (12 of it in the head)', [], 'screw.b');
  s.n('room.make', { name: 'tripod head', shape: 'rod', mat: 'al-6061', a: 55, b: 12, points: '0,0', hole: 3.4 }, 'The head, Ø110, its screw hole', 'head');
  s.n('room.make', { name: 'mount screw', shape: 'rod', mat: 'steel-alloy', a: 3.175, b: 20 }, 'The 1/4-20 camera screw (Ø6.35)', 'screw');
  const builds: Record<string, string> = {};
  for (const H of ['900', '1200', '1500']) {
    const h = Number(H), D = Math.round(h * Math.tan((22 * Math.PI) / 180)), w = 25, R = 52 + (D + w) / 2;
    s.n('room.make', { name: 'tripod leg', shape: 'section', mat: 'al-6061', a: 25, pts: `${D},0; ${D + w},0; ${w},${h}; 0,${h}` }, `A leg, ${H} high, sloping out 22°`, `leg${H}`);
    s.op(`ring${H}`, 'room.ring', { name: 'tripod legs', n: 3, R, fit: 'clear', out: 'yes' }, 'Three legs, turned out', { block: `leg${H}` });
    s.op(`top${H}`, 'room.stack', { name: 'tripod', axis: 'y', fit: 'touch', align: 'tripod legs/axis', order: `ring${H}, head` }, 'The head on their tops, on the ring\'s axis', { blocks: [`ring${H}`, 'head'] });
    builds[H] = s.op(`t${H}`, 'room.through', { line: 'tripod head/holes', which: 0, from: 'below', fit: 'touch' }, 'The screw up through the head', { host: `top${H}`, passer: 'screw' });
  }
  s.picked(legs, 'The tripod of that height', builds);
  s.save('seed.tripod', 'Tripod', 'A photo tripod (sizes typical): three aluminium legs sloping 22° out to the floor, a ring of three turned out, the head on their tops and a 1/4-20 camera screw up through it (mount screw/axis, for a camera\'s socket). Settings: legs (their height, 900, 1200 or 1500 mm) and screw (its length, mm)',
    'A three-legged tripod with a camera screw, as one node', ['mechanical', 'everyday']);
}

// ---- a leg, and robots walking on four and six of them ---------------------------------------------------------------
const HORN = { name: 'servo horn', shape: 'tube', mat: 'pom', a: 5.2, b: 10, c: 3 };
function leg(): void {
  // (a servo leg, as the robot arm's joints are made: a hip mount plate, then pitch joints (a servo stood on its end, its
  // horn over its spline (the joint), an aluminium link on the horn up to the next), and a foot pad with a rubber foot at
  // the end; with three joints a hip yaw servo first, standing on the plate, its horn and a coxa disc on it. Built
  // standing up and turned over to hang from its hip: the foot down)
  const s = new Asm('A leg');
  const joints = s.input('joints', 'text', '2', 'how many joints: 2 (hip and knee) or 3 (a hip yaw too)', ['2', '3']);
  s.input('servo', 'text', 'SG90', 'the servos, by their model', SERVOS, 'yaw.size; pitch.size');
  s.input('link', 'number', 50, 'each link\'s length, mm', [], 'link.b');
  s.n('piece.plate', { name: 'hip mount', mat: 'al-6061', w: 40, t: 3, d: 30, holes: '-15,-10; 15,-10; -15,10; 15,10', hole: 3.2 }, 'The hip mount plate, four M3 holes', 'hip');
  s.n('piece.servo', { size: 'SG90' }, 'The hip yaw servo', 'yaw');
  s.op('yawon', 'room.stack', { name: 'leg', axis: 'y', fit: 'touch', order: 'hip, yaw' }, 'On the hip plate', { blocks: ['hip', 'yaw'] });
  s.n('room.make', HORN, 'A servo horn (POM)', 'horn');
  s.op('yawh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over its spline: the hip yaw', { host: 'yawon', sleeve: 'horn' });
  s.n('room.make', { name: 'coxa', shape: 'rod', mat: 'al-6061', a: 22, b: 3 }, 'The coxa disc', 'coxa');
  s.op('lower', 'room.onto', { face: '+y', fit: 'touch' }, 'On the horn', { host: 'yawh', child: 'coxa' });
  s.n('piece.servo', { size: 'SG90' }, 'A joint servo', 'pitch');
  s.op('stood', 'room.turn', { axis: 'z', degrees: -90 }, 'Stood on its end, its spline out of its side', { block: 'pitch' });
  s.op('pitchh', 'room.over', { line: 'spline/axis', where: 'hi', fit: 'clear' }, 'Its horn over the spline: a pitch joint', { host: 'stood', sleeve: 'horn' });
  // (decision 0029: as the robot arm's module: the link centred on the servo's upper tab hole, its foot 0.15 mm above the
  // servo's (typical of a bracket's clearance), a top plate back over the servo for the next one to stand on; before, the
  // link met what was below and the joint read as locked)
  s.n('room.make', { name: 'leg link', shape: 'box', mat: 'al-6061', a: 6, b: 50, c: 24 }, 'A link (aluminium bar), 24 × 6 mm', 'link');
  s.op('linked', 'room.stack', { name: 'leg joint', axis: 'x', fit: 'touch', align: 'SG90 tabs/holes', order: 'pitchh, link' }, 'The link on the horn, centred on the upper tab hole, rising past the servo\'s top', { blocks: ['pitchh', 'link'] });
  s.n('room.make', { name: 'link top plate', shape: 'box', mat: 'al-6061', a: 32, b: 3, c: 24 }, 'The link\'s top plate, back over the servo: the next servo stands on it', 'ltop');
  s.op('module', 'room.onto', { face: '+y', fit: 'touch', end: 'hi' }, 'The top plate on the link, flush with its outer face', { host: 'linked', child: 'ltop' });
  s.op('c2', 'room.stack', { name: 'leg', axis: 'y', fit: 'touch' }, 'Hip and knee on the hip plate', { blocks: ['hip', 'module', 'module'] });
  s.op('c3', 'room.stack', { name: 'leg', axis: 'y', fit: 'touch' }, 'Hip yaw, hip and knee', { blocks: ['lower', 'module', 'module'] });
  s.n('room.make', { name: 'foot pad', shape: 'box', mat: 'al-6061', a: 30, b: 3, c: 30 }, 'The foot pad', 'pad');
  s.n('piece.foot', {}, 'A rubber foot', 'rub');
  s.op('foot', 'room.stack', { name: 'foot', axis: 'y', fit: 'touch', order: 'pad, rub' }, 'The rubber foot on its pad', { blocks: ['pad', 'rub'] });
  for (const k of ['2', '3']) { s.op(`f${k}`, 'room.onto', { face: '+y', fit: 'touch' }, 'The foot at the end', { host: `c${k}`, child: 'foot' });
    s.op(`d${k}`, 'room.turn', { axis: 'x', degrees: 180 }, 'Turned over: hanging from its hip, the foot down', { block: `f${k}` }); }
  s.picked(joints, 'The leg of so many joints', { '2': 'd2', '3': 'd3' });
  s.save('seed.leg', 'Robot leg (servo joints)', 'A servo robot leg hanging from its hip: a hip mount plate on top (hip mount/holes, four M3), two pitch joints (hip and knee: a servo stood on its end, its horn over its spline, an aluminium link on the horn) or three (a hip yaw servo first), and a foot pad with a rubber foot at the bottom. Settings: joints (2 or 3), the servos\' model and each link\'s length, mm',
    'A robot leg of two or three servo joints and a foot, as one node', ['mechanical', 'electrical']);
}
function walker(id: string, title: string, n: number, says: string): void {
  // (a body on n legs: the leg (seed.leg) made once and a ring of n copies, four turned to stand at the body's corners or
  // six turned to face out; the body on their hip plates and a mount plate on it)
  const s = new Asm(title);
  s.n('group.in', { name: 'joints', type: 'text', unit: '', default: '2', choices: '2|3', says: 'each leg\'s joints: 2 or 3' }, 'in: joints', 'in_joints');
  s.input('spread', 'number', n === 4 ? 110 : 150, 'the legs\' distance from the body\'s middle, mm', [], 'legs.R');
  s.n('seed.leg', { joints: '2' }, 'A leg', 'leg'); s.w('in_joints', 'value', 'leg', 'joints');
  s.op('legs', 'room.ring', { name: 'legs', n, R: n === 4 ? 110 : 150, fit: 'clear', out: n === 4 ? 'no' : 'yes' }, `${n} of them`, { block: 'leg' });
  if (n === 4) s.op('set', 'room.turn', { axis: 'y', degrees: 45 }, 'Turned to the body\'s corners', { block: 'legs' });
  if (n === 4) s.n('room.make', { name: 'robot body', shape: 'box', mat: 'abs', a: 240, b: 40, c: 240 }, 'The body (ABS), 240 × 240 × 40', 'body');
  else s.n('room.make', { name: 'robot body', shape: 'rod', mat: 'abs', a: 190, b: 40 }, 'The body (ABS), Ø380, 40 deep', 'body');
  s.op('bod', 'room.stack', { name: title.replace(/^An? /, '').toLowerCase(), axis: 'y', fit: 'touch', order: `${n === 4 ? 'set' : 'legs'}, body` }, 'The body on the hips', { blocks: [n === 4 ? 'set' : 'legs', 'body'] });
  s.n('piece.plate', { name: 'body mount', mat: 'al-6061', w: 80, t: 3, d: 60, holes: '-30,-20; 30,-20; -30,20; 30,20', hole: 3.2 }, 'Its mount plate, four M3 holes', 'mount');
  s.op('all', 'room.onto', { face: '+y', fit: 'touch' }, 'The mount plate on the body', { host: 'bod', child: 'mount' });
  s.outs('all');
  s.save(id, title.replace(/^An? /, '').replace(/^./, (c) => c.toUpperCase()), says, `${title}, as one node`, ['mechanical', 'electrical']);
}

// ---- a winch ------------------------------------------------------------------------------------------------------------
function winch(): void {
  // (a small electric winch, its sizes typical: a flanged steel drum (a turned profile, Ø90 flanges, a Ø60 barrel 88
  // long) over a Ø12 shaft (a clear fit: it turns), laid across between two steel side plates, a 37GB gear motor against
  // one plate on the drum's axis, a base plate under them (four M8 holes) and the rope up off the drum's top)
  const s = new Asm('A winch');
  s.input('turns', 'number', 12, 'the rope\'s turns on the drum (Ø6, 6.5 mm a turn: 13 at most)', [], 'rope.c');
  s.input('shaft', 'number', 160, 'the drum shaft\'s length, mm (the drum\'s 100 and the plates\' bearings)', [], 'sh.length');
  s.n('piece.shaft', { size: '12', length: 160 }, 'The drum shaft, Ø12', 'sh');
  s.n('room.make', { name: 'winch drum', shape: 'tube', mat: 'steel-low', a: 7.2, b: 30, c: 88 }, 'The drum\'s barrel, Ø60, 88 long', 'drum');
  s.op('dr0', 'room.over', { line: 'Ø12 shaft/axis', where: 'mid', fit: 'clear' }, 'The drum over its shaft: it turns', { host: 'sh', sleeve: 'drum' });
  s.n('room.make', { name: 'winch rope', shape: 'coil', mat: 'nylon', a: 33, b: 6, c: 12, d: 6.5, e: 1 }, 'The rope (Ø6) wound on the barrel, twelve turns', 'rope');
  s.op('wound', 'room.over', { line: 'winch drum/axis', where: 'mid', fit: 'touch' }, 'Wound on the barrel', { host: 'dr0', sleeve: 'rope' });
  s.n('room.make', { name: 'drum flange', shape: 'tube', mat: 'steel-low', a: 7.2, b: 45, c: 5 }, 'A drum flange, Ø90', 'fl');
  s.op('dr1', 'room.over', { line: 'Ø12 shaft/axis', where: 'mid', fit: 'clear' }, 'A flange slid on against the barrel', { host: 'wound', sleeve: 'fl' });
  s.op('dr', 'room.over', { line: 'Ø12 shaft/axis', where: 'mid', fit: 'clear' }, 'And the other', { host: 'dr1', sleeve: 'fl' });
  s.op('drx', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: 'dr' });
  s.n('room.make', { name: 'winch side plate', shape: 'box', mat: 'steel-low', a: 8, b: 120, c: 120 }, 'A side plate, 8 mm steel', 'sp');
  s.op('fr', 'room.stack', { name: 'winch', axis: 'x', fit: 'touch', order: 'sp, drx, sp' }, 'The drum\'s shaft between the two plates', { blocks: ['sp', 'drx', 'sp'] });
  s.n('piece.gearmotor', { size: '37GB' }, 'The gear motor, 37GB', 'gm');
  s.op('gmx', 'room.turn', { axis: 'z', degrees: 90 }, 'Its shaft toward the drum', { block: 'gm' });
  s.op('dv', 'room.onto', { face: '+x', fit: 'touch' }, 'Against the side plate, on the drum\'s axis', { host: 'fr', child: 'gmx' });
  s.n('piece.plate', { name: 'winch base', mat: 'steel-low', w: 320, t: 6, d: 140, holes: '-140,-55; 140,-55; -140,55; 140,55', hole: 4.5 }, 'The base plate, four M8 holes', 'base');
  s.op('based', 'room.onto', { face: '-y', fit: 'touch' }, 'On the base plate', { host: 'dv', child: 'base' });
  s.outs('based');
  s.save('seed.winch', 'Winch', 'A small electric winch (sizes typical): a flanged steel drum over a Ø12 shaft (it turns), laid across between two steel side plates, a 37GB gear motor against one plate on the drum\'s axis, a base plate under them (winch base/holes, four M8) and the rope up off the drum. Settings: rope (its length) and shaft (the drum shaft\'s), mm',
    'A winch: a drum on a frame, a gear motor, rope, as one node', ['mechanical', 'electrical']);
}

// ---- a centrifugal pump -------------------------------------------------------------------------------------------------
function pump(): void {
  // (a small close-coupled centrifugal pump, its sizes typical of a 0.37 kW garden pump: a motor (an envelope, Ø110 ×
  // 150), the volute made round the impeller (six vanes on a back disc, a ring turned out), the inlet on the volute's eye
  // (a DN25 PVC stub, axial) and the outlet off its side (a DN20 stub, radial: the volute's spiral is not drawn))
  const s = new Asm('A centrifugal pump');
  s.input('inlet', 'number', 100, 'the inlet stub\'s length, mm', [], 'in.length');
  s.input('outlet', 'number', 100, 'the outlet stub\'s length, mm', [], 'out.length');
  s.n('room.make', { name: 'pump motor', shape: 'rod', mat: 'steel-low', a: 45, b: 150 }, 'The motor (an envelope), Ø90 × 150', 'mot');
  s.n('room.make', { name: 'impeller disc', shape: 'tube', mat: 'pp', a: 4, b: 45, c: 3 }, 'The impeller\'s back disc', 'disc');
  s.n('room.make', { name: 'impeller vane', shape: 'box', mat: 'pp', a: 30, b: 12, c: 3 }, 'A vane', 'vane');
  s.op('vanes', 'room.ring', { name: 'impeller vanes', n: 6, R: 32, fit: 'clear', out: 'yes' }, 'Six vanes, turned out', { block: 'vane' });
  s.op('imp', 'room.stack', { name: 'impeller', axis: 'y', fit: 'touch', order: 'disc, vanes' }, 'The vanes on the disc', { blocks: ['disc', 'vanes'] });
  s.op('vol', 'room.around', { name: 'pump volute', mat: 'iron-cast', wall: 6, ends: 6, fit: 'touch', open: 'no' }, 'The volute made round the impeller', { child: 'imp' });
  s.n('piece.pvcpipe', { size: 'DN20', length: 100 }, 'The outlet, a DN20 stub', 'out');
  s.op('outx', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid out sideways', { block: 'out' });
  s.op('outl', 'room.onto', { face: '+x', fit: 'touch' }, 'The outlet off the volute\'s side', { host: 'vol', child: 'outx' });
  s.op('head', 'room.stack', { name: 'pump', axis: 'y', fit: 'touch', align: 'pump volute/axis', order: 'mot, outl' }, 'The volute on the motor, on its axis', { blocks: ['mot', 'outl'] });
  s.n('piece.pvcpipe', { size: 'DN25', length: 100 }, 'The inlet, a DN25 stub', 'in');
  s.op('all', 'room.stack', { name: 'pump', axis: 'y', fit: 'touch', align: 'pump volute/axis', order: 'head, in' }, 'The inlet on the volute\'s eye, on its axis', { blocks: ['head', 'in'] });
  s.outs('all');
  s.save('seed.pump', 'Centrifugal pump', 'A small close-coupled centrifugal pump (sizes typical of a 0.37 kW garden pump): a motor (an envelope), the volute made round the impeller (six vanes on a back disc), an axial DN25 inlet on the eye and a DN20 outlet off the side. Settings: inlet and outlet (the stubs\' lengths), mm. It offers the stubs\' axes for a hose or a pipe run',
    'A centrifugal pump: volute, impeller, inlet, outlet, motor, as one node', ['mechanical', 'pipelines']);
}

// ---- a truck ------------------------------------------------------------------------------------------------------------
function truck(): void {
  // (a light truck, its sizes typical of a 7.5 t class: a ladder chassis of two steel rails 300 × 80 and a cross member
  // (860 between the rails), a stub axle Ø44 out through each rail's axle holes (front, rear, and with six wheels a second
  // rear), a wheel over each (a steel disc Ø444, a 17.5 in rim, and its tyre, Ø766, 215 wide: a 215/75 R17.5), a clear
  // fit (it turns); built on its side and stood up; the cab (a 3 mm shell, its roof not drawn: a plate on a thin wall's edge gets no face yet) and the bed (a tray open at the top)
  // on its wheels' tops. The rails are drawn solid (a C channel's web and flanges not drawn): their mass is overstated)
  const s = new Asm('A truck');
  const axles = s.input('wheels', 'text', '4', 'four wheels (two axles) or six (a second rear axle)', ['4', '6']);
  s.input('bed', 'number', 4200, 'the bed\'s length, mm', [], 'bed4.a; bed6.a');
  s.n('room.make', { name: 'truck rim', shape: 'tube', mat: 'steel-low', a: 23, b: 222, c: 180 }, 'A wheel disc (steel), Ø444', 'rim');
  s.n('room.make', { name: 'truck tyre', shape: 'tube', mat: 'rubber', a: 222, b: 383, c: 215 }, 'Its tyre, 215/75 R17.5', 'tyre');
  s.op('wheel', 'room.over', { line: 'truck rim/axis', where: 'mid', fit: 'touch' }, 'The tyre on its rim', { host: 'rim', sleeve: 'tyre' });
  const builds: Record<string, string> = {};
  for (const W of ['4', '6']) {
    const xs = W === '4' ? [1800, -1600] : [1800, -1600, -2950], pts = xs.map((x) => `${x},125`).join('; ');
    s.n('room.make', { name: 'left rail', shape: 'box', mat: 'steel-low', a: 6800, b: 80, c: 300, points: pts, hole: 23 }, `${W}: the left rail, its axle holes`, `rl${W}`);
    s.n('room.make', { name: 'right rail', shape: 'box', mat: 'steel-low', a: 6800, b: 80, c: 300, points: pts, hole: 23 }, `${W}: the right rail`, `rr${W}`);
    s.n('room.make', { name: 'cross member', shape: 'box', mat: 'steel-low', a: 300, b: 860, c: 300 }, `${W}: a cross member`, `xm${W}`);
    let h = s.op(`lad${W}`, 'room.stack', { name: 'ladder chassis', axis: 'y', fit: 'touch', order: `rl${W}, xm${W}, rr${W}` }, `${W}: the rails either side of the cross member`, { blocks: [`rl${W}`, `xm${W}`, `rr${W}`] });
    xs.forEach((_, i) => {
      for (const [side, rail, from, end] of [['left', 'left rail', 'above', 'lo'], ['right', 'right rail', 'below', 'hi']] as const) {
        const k = `${W}${side[0]}${i}`, nm = `stub axle ${side} ${i + 1}`;
        s.n('room.make', { name: nm, shape: 'rod', mat: 'steel-alloy', a: 22, b: 330 }, `${W}: the ${side} stub axle ${i + 1}, Ø44`, `a${k}`);
        h = s.op(`s${k}`, 'room.through', { line: `${rail}/holes`, which: i, from, fit: 'touch' }, `${W}: out through the ${rail}`, { host: h, passer: `a${k}` });
        h = s.op(`w${k}`, 'room.over', { line: `${nm}/axis`, where: end, fit: 'clear' }, `${W}: a wheel on its end (it turns)`, { host: h, sleeve: 'wheel' });
      }
    });
    s.op(`up${W}`, 'room.turn', { axis: 'x', degrees: 90 }, `${W}: stood on its wheels`, { block: h });
    s.n('room.make', { name: 'truck bed', shape: 'case', mat: 'al-6061', a: 4200, b: 500, c: 2300, d: 4, e: 6 }, `${W}: the bed, a tray`, `bed${W}`);
    s.n('room.make', { name: 'truck cab', shape: 'case', mat: 'steel-low', a: 1800, b: 2100, c: 2300, d: 3, e: 3 }, `${W}: the cab's shell (steel, 3 mm: a hollow, not a block; its roof not drawn yet)`, `cab${W}`);
    s.op(`body${W}`, 'room.stack', { name: 'truck body', axis: 'x', fit: 'clear', end: 'lo', order: `bed${W}, cab${W}` }, `${W}: the bed behind the cab`, { blocks: [`bed${W}`, `cab${W}`] });
    builds[W] = s.op(`tr${W}`, 'room.onto', { face: '+y', fit: 'touch' }, `${W}: the cab and bed on its wheels`, { host: `up${W}`, child: `body${W}` });
  }
  s.picked(axles, 'The truck of so many wheels', builds);
  s.save('seed.truck', 'Truck', 'A light truck (sizes typical of the 7.5 t class): a ladder chassis (two steel rails and a cross member), a stub axle out through each rail\'s axle holes and a wheel over each (a 17.5 in steel disc and a 215/75 R17.5 tyre; they turn), the cab in front and the bed behind it (truck bed/cavity: a tray open at the top, for a load, a winch or a crane). Settings: wheels (4 or 6) and bed (its length), mm',
    'A truck: cab, ladder chassis, bed and four or six wheels, as one node', ['mechanical', 'vehicles']);
}

let made = false;
export function makeThings(): void {
  if (made) return; made = true;
  windTurbine(); boat(); camera(); tripod(); leg();
  walker('seed.quadruped', 'A quadruped', 4, 'A walking robot on four legs: the leg (seed.leg) four times at the body\'s corners, the body (ABS, 240 × 240) on their hip plates and a mount plate on top (body mount/holes, four M3). Settings: joints (each leg\'s, 2 or 3) and spread (the legs\' distance from the middle), mm');
  walker('seed.hexapod', 'A hexapod', 6, 'A walking robot on six legs: the leg (seed.leg) six times round a round body (ABS, Ø380), each turned to face out, and a mount plate on top (body mount/holes, four M3). Settings: joints (each leg\'s, 2 or 3) and spread (the legs\' distance from the middle), mm');
  winch(); pump(); truck();
}
makeThings();
