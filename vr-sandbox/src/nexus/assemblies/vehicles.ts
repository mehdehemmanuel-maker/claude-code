// Vehicles and machines people ask for by name (decision 0029, the rough round): a bicycle, a helicopter, an excavator, a
// forklift, a train, a 3D printer, a drill press, a ceiling fan, a lathe, a lawnmower, a scooter, a motorcycle, a tractor,
// a bus, a van and a robot dog, each a board of piece.* nodes, other assemblies and the room's operations folded into one
// block of the one or two settings that matter. Nothing here places by number: every piece is made by room.make or a
// piece.* node and put together by stack, onto, over, through, ring and turn. Where a piece should move (a wheel, a rotor,
// a boom on its pin, a body on its slewing post, a chuck's spindle), it goes over its shaft (or the shaft through it) with a
// clear fit: the joint the movement work reads (root 6: a wheel, a table's collar is drawn with no bore and over bores it
// to the clear fit at its shaft's size; before, each was bored by hand 1.1 mm over its shaft's radius). Built ROUGH (the user, 2026-11-06: "do the whole app roughly"): sizes
// typical (recalled, no source hunting), wheels drawn as turned discs (spokes not drawn), bodies as boxes, a frame as a
// rectangle of tubes, no chain, no cables. The Asm class is things.ts's, copied (one owner a file; not imported).
// Loaded by one import in seeds.ts, after everyday.ts (the robot dog reuses seed.quadruped).

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

/** A board being built a node at a time, saved as a library block (as things.ts's assemblies are). */
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
  save(id: string, name: string, says: string, gloss: string, domains = ['mechanical', 'vehicles']): BlockDef {
    layOut(this.b); const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] } }); register(d); return d;
  }
}
function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}

// ---- helpers used by several ------------------------------------------------------------------------------------------
/** A road wheel: a rim (a disc drawn with no bore: the axle it goes over bores it to its fit, root 6) and its tyre over
 *  it; offers `<name> rim/axis`. */
function roadWheel(s: Asm, k: string, name: string, rim: number, tyre: number, width: number): string {
  s.n('room.make', { name: `${name} rim`, shape: 'rod', mat: 'steel-low', a: rim, b: width }, `${name}: its rim`, `${k}_r`);
  s.n('room.make', { name: `${name} tyre`, shape: 'tube', mat: 'rubber', a: rim, b: tyre, c: width }, `${name}: its tyre`, `${k}_t`);
  return s.op(k, 'room.over', { line: `${name} rim/axis`, where: 'mid', fit: 'touch' }, `${name}: the tyre on its rim`, { host: `${k}_r`, sleeve: `${k}_t` });
}
/** An axle with a wheel over each end (clear: they turn), laid across (along x): offers `<axle>/axis`. */
function axleWithWheels(s: Asm, k: string, axle: string, r: number, length: number, wheel: string): string {
  s.n('room.make', { name: axle, shape: 'rod', mat: 'steel-alloy', a: r, b: length }, `${axle}, Ø${2 * r}`, `${k}_a`);
  s.op(`${k}_1`, 'room.over', { line: `${axle}/axis`, where: 'lo', fit: 'clear' }, 'A wheel on one end, clear: it turns', { host: `${k}_a`, sleeve: wheel });
  s.op(`${k}_2`, 'room.over', { line: `${axle}/axis`, where: 'hi', fit: 'clear' }, 'And the other', { host: `${k}_1`, sleeve: wheel });
  return s.op(k, 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: `${k}_2` });
}
/** A rotor of n blades about y, centred on its own axis (things.ts's rotor, with n): its hub a tube bored for a shaft (by
 *  hand, the old 1 mm clear gap over its shaft's radius: over refuses to bore a hub drawn with no bore when its sleeve
 *  holds turned pieces, the pitched blades; root 6's fault). */
function rotor(s: Asm, q: string, o: { name: string; mat: string; n: number; rin: number; blade: [number, number, number]; pitch: number; hub: [number, number, number] }): string {
  const [Lb, tb, ch] = o.blade, Lr = Math.round(Lb / 8), R = o.rin + (Lr + Lb) / 2;
  s.n('room.make', { name: `${o.name} blade root`, shape: 'box', mat: o.mat, a: Lr, b: ch / 3, c: ch }, 'A blade\'s root (upright, the hub on it)', `${q}root`);
  s.n('room.make', { name: `${o.name} blade`, shape: 'box', mat: o.mat, a: Lb, b: tb, c: ch }, `A blade, ${Lb} mm long, ${ch} mm chord`, `${q}blade`);
  s.op(`${q}pitched`, 'room.turn', { axis: 'x', degrees: o.pitch }, `Turned ${o.pitch}° about its length: its pitch`, { block: `${q}blade` });
  s.op(`${q}one`, 'room.stack', { name: `${o.name} blade`, axis: 'x', fit: 'touch', order: `${q}root, ${q}pitched` }, 'The blade on its root', { blocks: [`${q}root`, `${q}pitched`] });
  s.op(`${q}ring`, 'room.ring', { name: `${o.name} blades`, n: o.n, R, fit: 'clear', out: 'yes' }, `${o.n} of them, turned to face out`, { block: `${q}one` });
  s.n('room.make', { name: `${o.name} hub`, shape: 'tube', mat: 'al-6061', a: o.hub[0], b: o.hub[1], c: o.hub[2] }, 'The hub, bored for its shaft', `${q}hub`);
  return s.op(`${q}rotor`, 'room.stack', { name: `${o.name} rotor`, axis: 'y', fit: 'touch', align: `${o.name} blades/axis`, order: `${q}ring, ${q}hub` }, 'The hub on the blades\' roots, on the ring\'s axis', { blocks: [`${q}ring`, `${q}hub`] });
}
/** A disc wheel turned in one piece (hub, web, rim: its spokes not drawn, rough; drawn with no bore: the axle it goes
 *  over bores it to its fit, root 6) and its tyre; offers `<name>/axis`. */
function discWheel(s: Asm, k: string, name: string, hubR: number, hubW: number, rimR: number, rimW: number, tyreR: number, tyreW: number): string {
  const pts = `0,${-hubW / 2}; ${hubR},${-hubW / 2}; ${hubR},-2; ${rimR - 6},-2; ${rimR - 6},${-rimW / 2}; ${rimR},${-rimW / 2}; ${rimR},${rimW / 2}; ${rimR - 6},${rimW / 2}; ${rimR - 6},2; ${hubR},2; ${hubR},${hubW / 2}; 0,${hubW / 2}`;
  s.n('room.make', { name, shape: 'lathe', mat: 'al-6061', pts }, `${name}: hub, web and rim turned in one (spokes not drawn)`, `${k}_w`);
  s.n('room.make', { name: `${name} tyre`, shape: 'tube', mat: 'rubber', a: rimR, b: tyreR, c: tyreW }, `${name}: its tyre`, `${k}_t`);
  return s.op(k, 'room.over', { line: `${name}/axis`, where: 'mid', fit: 'touch' }, `${name}: the tyre on its rim`, { host: `${k}_w`, sleeve: `${k}_t` });
}
/** A wheel over an axle (clear: it turns), the pair turned so the axle lies along x. */
function wheelOnAxle(s: Asm, k: string, wheel: string, axle: string, r: number, length: number): string {
  s.n('room.make', { name: axle, shape: 'rod', mat: 'steel-alloy', a: r, b: length }, `${axle}, Ø${2 * r}`, `${k}_a`);
  s.op(`${k}_o`, 'room.over', { line: `${axle}/axis`, where: 'mid', fit: 'clear' }, 'The wheel over its axle, clear: it turns', { host: `${k}_a`, sleeve: wheel });
  return s.op(k, 'room.turn', { axis: 'z', degrees: 90 }, 'Its axle laid across', { block: `${k}_o` });
}
/** A frame as a rectangle of tubes (a diamond's slopes not drawn, rough): seat tube, top tube, head tube, tops flush; a
 *  down tube under them. Offers seat tube/axis and head tube/axis (lines along y a stack aligns on). */
function tubeFrame(s: Asm, k: string, seat: number, top: number, head: number, headR: number, tubeR: number): string {
  s.n('room.make', { name: 'seat tube', shape: 'rod', mat: 'steel-alloy', a: tubeR, b: seat }, 'The seat tube', `${k}st`);
  s.n('room.make', { name: 'top tube', shape: 'rod', mat: 'steel-alloy', a: tubeR, b: top }, 'The top tube', `${k}tt0`);
  s.op(`${k}tt`, 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along the frame', { block: `${k}tt0` });
  s.n('room.make', { name: 'head tube', shape: 'rod', mat: 'steel-alloy', a: headR, b: head }, 'The head tube (drawn the frame\'s height: rough)', `${k}ht`);
  s.op(`${k}f0`, 'room.stack', { name: 'frame', axis: 'z', fit: 'touch', end: 'hi', order: `${k}st, ${k}tt, ${k}ht` }, 'Seat tube, top tube, head tube, their tops flush', { blocks: [`${k}st`, `${k}tt`, `${k}ht`] });
  s.n('room.make', { name: 'down tube', shape: 'rod', mat: 'steel-alloy', a: tubeR, b: top + 2 * Math.max(headR, tubeR) + 2 * tubeR }, 'The down tube (drawn level under the frame: rough)', `${k}dt0`);
  s.op(`${k}dt`, 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along', { block: `${k}dt0` });
  return s.op(`${k}f`, 'room.onto', { face: '-y', fit: 'touch' }, 'The down tube under the seat and head tubes', { host: `${k}f0`, child: `${k}dt` });
}

// ---- a bicycle ------------------------------------------------------------------------------------------------------------
function bicycle(): void {
  // (a 700c bicycle, sizes typical (recalled): wheels Ø668 over a 622 rim (a disc wheel turned in one: its spokes not
  // drawn), a rectangle frame of Ø28.6 tubes (its diamond's slopes not drawn), a seat post and saddle on the seat tube, a
  // stem and 580 mm bar on the head tube, a crank spindle in a bottom bracket shell under the seat tube with a 42T chainring
  // and one crank bar with a pedal; a 18T sprocket on the rear axle; its chain, brakes and fork not drawn)
  const s = new Asm('A bicycle');
  s.input('seat', 'number', 480, 'the seat tube\'s length, mm', [], 'fst.b');
  s.input('top', 'number', 560, 'the top tube\'s length, mm', [], 'ftt0.b');
  discWheel(s, 'wh', 'bicycle wheel', 16, 90, 311, 22, 334, 32);
  wheelOnAxle(s, 'fw', 'wh', 'front axle', 5, 130);
  s.n('room.make', { name: 'rear axle', shape: 'rod', mat: 'steel-alloy', a: 5, b: 150 }, 'The rear axle, Ø10', 'ra');
  s.op('rw0', 'room.over', { line: 'rear axle/axis', where: 'mid', fit: 'clear' }, 'The rear wheel over its axle, clear: it turns', { host: 'ra', sleeve: 'wh' });
  s.n('room.make', { name: 'rear sprocket', shape: 'tube', mat: 'steel-alloy', a: 5, b: 37, c: 4 }, 'The rear sprocket, 18T (a disc, its teeth not drawn: rough)', 'sp');
  s.op('rw1', 'room.over', { line: 'rear axle/axis', where: 'hi', fit: 'touch' }, 'The sprocket beside the wheel', { host: 'rw0', sleeve: 'sp' });
  s.op('rw', 'room.turn', { axis: 'z', degrees: 90 }, 'Its axle laid across', { block: 'rw1' });
  tubeFrame(s, 'f', 480, 560, 480, 16, 14.3);
  // (the crank: a spindle, the chainring at one end and a crank bar across it with a pedal, the shell round its middle)
  s.n('piece.shaft', { size: '12', length: 150 }, 'The crank spindle, Ø12 (rough)', 'spin');
  s.n('room.make', { name: 'chainring', shape: 'tube', mat: 'al-6061', a: 6, b: 86, c: 4 }, 'The chainring, 42T (a disc, its teeth not drawn: rough)', 'cr');
  s.op('c1', 'room.over', { line: 'Ø12 shaft/axis', where: 'hi', fit: 'touch' }, 'The chainring at the spindle\'s end', { host: 'spin', sleeve: 'cr' });
  s.n('room.make', { name: 'crank bar', shape: 'box', mat: 'al-6061', a: 20, b: 10, c: 220 }, 'The crank, one bar across the spindle\'s end (rough)', 'arm');
  s.n('room.make', { name: 'pedal', shape: 'rod', mat: 'pp', a: 12, b: 90 }, 'A pedal', 'ped');
  s.op('c2', 'room.onto', { face: '+z', fit: 'touch', end: 'hi' }, 'The pedal off the crank\'s end', { host: 'arm', child: 'ped' });
  s.op('c3', 'room.onto', { face: '+y', fit: 'touch' }, 'The crank on the chainring', { host: 'c1', child: 'c2' });
  s.n('room.make', { name: 'bottom bracket shell', shape: 'rod', mat: 'steel-alloy', a: 21, b: 68 }, 'The bottom bracket shell (its spindle bores it to the clear fit)', 'bb');
  s.op('c4', 'room.over', { line: 'Ø12 shaft/axis', where: 'mid', fit: 'clear' }, 'The shell round the spindle: it turns', { host: 'c3', sleeve: 'bb' });
  s.op('crank', 'room.turn', { axis: 'z', degrees: 90 }, 'The spindle laid across', { block: 'c4' });
  s.op('fr1', 'room.stack', { name: 'bicycle frame', axis: 'y', fit: 'touch', align: 'seat tube/axis', order: 'crank, ff' }, 'The frame on its bottom bracket, under the seat tube', { blocks: ['crank', 'ff'] });
  s.n('room.make', { name: 'seat post', shape: 'rod', mat: 'al-6061', a: 13.6, b: 250 }, 'The seat post', 'post');
  s.n('room.make', { name: 'saddle', shape: 'box', mat: 'pu', a: 140, b: 40, c: 270 }, 'The saddle', 'sad');
  s.op('seat', 'room.stack', { name: 'seat', axis: 'y', fit: 'touch', order: 'post, sad' }, 'The saddle on its post', { blocks: ['post', 'sad'] });
  s.op('fr2', 'room.stack', { name: 'bicycle frame', axis: 'y', fit: 'touch', align: 'seat tube/axis', order: 'fr1, seat' }, 'The seat on the seat tube', { blocks: ['fr1', 'seat'] });
  s.n('room.make', { name: 'stem', shape: 'rod', mat: 'al-6061', a: 12.5, b: 120 }, 'The stem', 'stem');
  s.n('room.make', { name: 'handlebar', shape: 'rod', mat: 'al-6061', a: 11, b: 580 }, 'The handlebar, 580 across', 'bar0');
  s.op('bar', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: 'bar0' });
  s.op('bars', 'room.stack', { name: 'handlebars', axis: 'y', fit: 'touch', order: 'stem, bar' }, 'The bar on its stem', { blocks: ['stem', 'bar'] });
  s.op('fr3', 'room.stack', { name: 'bicycle frame', axis: 'y', fit: 'touch', align: 'head tube/axis', order: 'fr2, bars' }, 'The handlebars on the head tube', { blocks: ['fr2', 'bars'] });
  s.op('bike', 'room.stack', { name: 'bicycle', axis: 'z', fit: 'clear', order: 'rw, fr3, fw' }, 'Rear wheel, frame, front wheel', { blocks: ['rw', 'fr3', 'fw'] });
  s.outs('bike');
  s.save('seed.bicycle', 'Bicycle', 'A 700c bicycle (sizes typical, rough): two Ø668 disc wheels (spokes not drawn) over Ø10 axles (they turn), a rear 18T sprocket (both discs, teeth not drawn), a rectangle frame of Ø28.6 tubes (seat tube, top tube, head tube, down tube: the diamond\'s slopes not drawn), the crank spindle in its bottom bracket shell under the seat tube (it turns) with a 42T chainring, a crank bar and a pedal, a seat post and saddle on the seat tube, a stem and 580 mm bar on the head tube. Its chain, fork and brakes not drawn. Settings: seat (the seat tube\'s length) and top (the top tube\'s), mm. It offers seat tube/axis and head tube/axis (lines along y to stack on), front axle/axis and rear axle/axis',
    'A bicycle: two wheels, a frame of tubes, crank, chainring, saddle, handlebar, as one node');
}

// ---- a helicopter ----------------------------------------------------------------------------------------------------------
function helicopter(): void {
  // (a light two-seat helicopter, sizes typical of the R22 class (recalled): a cabin 1.3 m wide, 1.4 m tall, 2.6 m long,
  // a Ø60 mast with a two-bladed main rotor over it (Ø7.6 m, blades 3.6 m, clear: it turns), a Ø160 tail boom 3 m long out
  // of its back with a two-bladed tail rotor on a stub shaft off its end (it turns), two Ø40 skids on a cross tube)
  const s = new Asm('A helicopter');
  s.input('boom', 'number', 3000, 'the tail boom\'s length, mm', [], 'boom0.c');
  s.input('blade', 'number', 3600, 'a main rotor blade\'s length, mm', [], 'mblade.a');
  s.n('room.make', { name: 'skid', shape: 'tube', mat: 'al-6061', a: 17, b: 20, c: 2200 }, 'A skid, Ø40 tube', 'skid0');
  s.op('skid', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along', { block: 'skid0' });
  s.n('room.make', { name: 'skid cross tube', shape: 'box', mat: 'al-6061', a: 1160, b: 40, c: 60 }, 'A cross tube between the skids', 'xt');
  s.op('gear', 'room.stack', { name: 'landing gear', axis: 'x', fit: 'touch', order: 'skid, xt, skid' }, 'A skid either side of the cross tube', { blocks: ['skid', 'xt', 'skid'] });
  s.n('room.make', { name: 'helicopter cabin', shape: 'box', mat: 'fibreglass', a: 1300, b: 1400, c: 2600 }, 'The cabin (a box, rough)', 'cab');
  s.op('body', 'room.onto', { face: '+y', fit: 'touch' }, 'The cabin on its landing gear', { host: 'gear', child: 'cab' });
  s.n('room.make', { name: 'mast', shape: 'rod', mat: 'steel-alloy', a: 30, b: 500 }, 'The main rotor mast, Ø60', 'mast');
  s.op('masted', 'room.onto', { face: '+y', fit: 'touch' }, 'The mast up out of the cabin\'s roof', { host: 'body', child: 'mast' });
  rotor(s, 'm', { name: 'main', mat: 'al-6061', n: 2, rin: 200, blade: [3600, 30, 180], pitch: 6, hub: [31, 120, 100] });
  s.op('spun', 'room.over', { line: 'mast/axis', where: 'hi', fit: 'clear' }, 'The main rotor over the mast: it turns', { host: 'masted', sleeve: 'mrotor' });
  s.n('room.make', { name: 'tail boom', shape: 'box', mat: 'al-6061', a: 160, b: 160, c: 3000 }, 'The tail boom (a box section: rough)', 'boom0');
  s.op('boom', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid aft', { block: 'boom0' });
  s.n('room.make', { name: 'tail rotor shaft', shape: 'rod', mat: 'steel-alloy', a: 12, b: 220 }, 'The tail rotor\'s stub shaft, Ø24', 'ts0');
  rotor(s, 't', { name: 'tail', mat: 'al-6061', n: 2, rin: 60, blade: [500, 12, 90], pitch: 10, hub: [13, 40, 50] });
  s.op('ts1', 'room.over', { line: 'tail rotor shaft/axis', where: 'hi', fit: 'clear' }, 'The tail rotor over its shaft: it turns', { host: 'ts0', sleeve: 'trotor' });
  s.op('ts', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: 'ts1' });
  s.op('tailed', 'room.onto', { face: '+x', fit: 'touch', end: 'hi' }, 'The stub shaft and its rotor off the boom\'s end', { host: 'boom', child: 'ts' });
  s.op('heli', 'room.onto', { face: '+z', fit: 'touch' }, 'The boom out of the cabin\'s back', { host: 'spun', child: 'tailed' });
  s.outs('heli');
  s.save('seed.helicopter', 'Helicopter', 'A light helicopter (sizes typical of the two-seat class, rough): two Ø40 skids on a cross tube, a cabin (a box), a Ø60 mast with a two-bladed main rotor over it (it turns), a box tail boom out of the back with a two-bladed tail rotor on a stub shaft off its end (it turns). Settings: boom (its length) and blade (a main blade\'s length), mm. It offers mast/axis and tail rotor shaft/axis',
    'A helicopter: cabin, main rotor on a mast, tail boom, tail rotor, skids, as one node', ['mechanical', 'vehicles', 'aerospace']);
}

// ---- an excavator ----------------------------------------------------------------------------------------------------------
function excavator(): void {
  // (a mini excavator, sizes typical of the 3 t class (recalled): two tracks drawn as boxes 400 wide, 2400 long, an
  // undercarriage across them, a slewing post with the body's ring over it (clear: it slews), a cab on the body, and an arm
  // of boom, stick and bucket, each on a Ø50 pin with a clear fit (each swings), the arm laid out level off the body's front)
  const s = new Asm('An excavator');
  s.input('boom', 'number', 2400, 'the boom\'s length, mm', [], 'boom.a');
  s.input('stick', 'number', 1600, 'the stick\'s length, mm', [], 'stick.a');
  s.n('room.make', { name: 'track', shape: 'box', mat: 'rubber', a: 400, b: 500, c: 2400 }, 'A track (a box, rough)', 'track');
  s.n('room.make', { name: 'undercarriage', shape: 'box', mat: 'steel-low', a: 1100, b: 250, c: 1200 }, 'The undercarriage between them', 'uc');
  s.op('u1', 'room.stack', { name: 'undercarriage', axis: 'x', fit: 'touch', order: 'track, uc, track' }, 'A track either side of the undercarriage', { blocks: ['track', 'uc', 'track'] });
  s.n('room.make', { name: 'slewing post', shape: 'rod', mat: 'steel-alloy', a: 200, b: 300 }, 'The slewing post, Ø400', 'post');
  s.op('u2', 'room.onto', { face: '+y', fit: 'touch' }, 'The post up from the undercarriage', { host: 'u1', child: 'post' });
  s.n('room.make', { name: 'slewing ring', shape: 'rod', mat: 'steel-low', a: 300, b: 120 }, 'The slewing ring (the post bores it to the clear fit)', 'ring');
  s.op('u3', 'room.over', { line: 'slewing post/axis', where: 'hi', fit: 'clear' }, 'The ring over the post, clear: the body slews', { host: 'u2', sleeve: 'ring' });
  s.n('room.make', { name: 'excavator body', shape: 'box', mat: 'steel-low', a: 1500, b: 900, c: 2200 }, 'The body (engine house), a box', 'body');
  s.op('u4', 'room.onto', { face: '+y', fit: 'touch' }, 'The body on the ring', { host: 'u3', child: 'body' });
  s.n('room.make', { name: 'excavator cab', shape: 'case', mat: 'steel-low', a: 900, b: 1500, c: 1100, d: 3, e: 3 }, 'The cab, a shell', 'cab');
  s.op('u5', 'room.onto', { face: '+y', fit: 'touch', end: 'lo' }, 'The cab on the body, at one corner', { host: 'u4', child: 'cab' });
  // (the arm, pinned joint by joint: a pin stands up, a knuckle over it, the next member off the knuckle's side)
  s.n('room.make', { name: 'boom foot', shape: 'box', mat: 'steel-low', a: 300, b: 40, c: 300 }, 'The boom\'s foot plate (the pin stands on it)', 'foot');
  s.n('room.make', { name: 'boom pin', shape: 'rod', mat: 'steel-alloy', a: 25, b: 500 }, 'The boom\'s pin, Ø50', 'p1');
  s.op('a0', 'room.onto', { face: '+y', fit: 'touch' }, 'The pin up from its foot', { host: 'foot', child: 'p1' });
  s.n('room.make', { name: 'boom knuckle', shape: 'rod', mat: 'steel-low', a: 60, b: 300 }, 'The boom\'s knuckle', 'k1');
  s.op('a1', 'room.over', { line: 'boom pin/axis', where: 'hi', fit: 'clear' }, 'The knuckle over its pin, clear: it swings', { host: 'a0', sleeve: 'k1' });
  s.n('room.make', { name: 'boom', shape: 'box', mat: 'steel-low', a: 2400, b: 300, c: 300 }, 'The boom, a box section', 'boom');
  s.op('a2', 'room.onto', { face: '+x', fit: 'touch' }, 'The boom off its knuckle', { host: 'a1', child: 'boom' });
  s.n('room.make', { name: 'stick pin', shape: 'rod', mat: 'steel-alloy', a: 25, b: 500 }, 'The stick\'s pin', 'p2');
  s.op('a3', 'room.onto', { face: '+x', fit: 'touch' }, 'The stick\'s pin at the boom\'s end', { host: 'a2', child: 'p2' });
  s.n('room.make', { name: 'stick knuckle', shape: 'rod', mat: 'steel-low', a: 60, b: 200 }, 'The stick\'s knuckle', 'k2');
  s.op('a4', 'room.over', { line: 'stick pin/axis', where: 'lo', fit: 'clear' }, 'Its knuckle over the pin, clear: it swings', { host: 'a3', sleeve: 'k2' });
  s.n('room.make', { name: 'stick', shape: 'box', mat: 'steel-low', a: 1600, b: 250, c: 250 }, 'The stick', 'stick');
  s.op('a5', 'room.onto', { face: '+x', fit: 'touch' }, 'The stick off its knuckle', { host: 'a4', child: 'stick' });
  s.n('room.make', { name: 'bucket pin', shape: 'rod', mat: 'steel-alloy', a: 25, b: 500 }, 'The bucket\'s pin', 'p3');
  s.op('a6', 'room.onto', { face: '+x', fit: 'touch' }, 'The bucket\'s pin at the stick\'s end', { host: 'a5', child: 'p3' });
  s.n('room.make', { name: 'bucket knuckle', shape: 'rod', mat: 'steel-low', a: 60, b: 200 }, 'The bucket\'s knuckle', 'k3');
  s.op('a7', 'room.over', { line: 'bucket pin/axis', where: 'lo', fit: 'clear' }, 'Its knuckle over the pin, clear: it swings', { host: 'a6', sleeve: 'k3' });
  s.n('room.make', { name: 'bucket', shape: 'case', mat: 'steel-low', a: 700, b: 500, c: 600, d: 8, e: 8 }, 'The bucket, an open box', 'bkt');
  s.op('a8', 'room.onto', { face: '+x', fit: 'touch' }, 'The bucket off its knuckle', { host: 'a7', child: 'bkt' });
  s.op('arm', 'room.turn', { axis: 'y', degrees: 90 }, 'The arm turned to reach forward', { block: 'a8' });
  s.op('exc', 'room.onto', { face: '-z', fit: 'touch' }, 'The arm off the body\'s front', { host: 'u5', child: 'arm' });
  s.outs('exc');
  s.save('seed.excavator', 'Excavator', 'A mini excavator (sizes typical of the 3 t class, rough): two tracks (boxes), an undercarriage, a slewing post with the body\'s ring over it (clear: it slews), a box body with a cab shell on it, and an arm off the front laid level: boom, stick and bucket, each on a Ø50 pin with a clear fit (each swings). Settings: boom and stick (their lengths), mm. It offers slewing post/axis and the three pins\' axes',
    'An excavator: tracks, slewing body, cab, boom, stick, bucket, as one node');
}

// ---- a forklift ------------------------------------------------------------------------------------------------------------
function forklift(): void {
  // (a counterbalance forklift, sizes typical of the 2.5 t class (recalled): a body 1100 wide, 2300 long between four
  // Ø500 wheels on two axles (they turn), a mast of two uprights 2500 tall, a carriage plate across them and two forks)
  const s = new Asm('A forklift');
  s.input('lift', 'number', 2500, 'the mast\'s height, mm', [], 'up.b');
  s.input('fork', 'number', 1100, 'the forks\' blade length, mm', [], 'fk.a');
  roadWheel(s, 'wh', 'forklift wheel', 150, 250, 180);
  axleWithWheels(s, 'ax1', 'forklift front axle', 25, 1500, 'wh');
  axleWithWheels(s, 'ax2', 'forklift rear axle', 25, 1500, 'wh');
  s.n('room.make', { name: 'forklift chassis', shape: 'box', mat: 'steel-low', a: 300, b: 200, c: 1100 }, 'A spine between the axles', 'sp');
  s.op('ch', 'room.stack', { name: 'forklift chassis', axis: 'z', fit: 'touch', order: 'ax2, sp, ax1' }, 'Rear axle, spine, front axle', { blocks: ['ax2', 'sp', 'ax1'] });
  s.n('room.make', { name: 'forklift body', shape: 'box', mat: 'steel-low', a: 1000, b: 1200, c: 2300 }, 'The body (a box, rough)', 'body');
  s.op('bd', 'room.onto', { face: '+y', fit: 'touch' }, 'The body on its axles', { host: 'ch', child: 'body' });
  s.n('room.make', { name: 'mast upright', shape: 'box', mat: 'steel-low', a: 80, b: 2500, c: 120 }, 'A mast upright (a channel, drawn solid)', 'up');
  s.op('ups', 'room.ring', { name: 'mast uprights', n: 2, R: 450, fit: 'clear', out: 'no' }, 'Two uprights, 900 apart', { block: 'up' });
  s.n('room.make', { name: 'fork carriage', shape: 'box', mat: 'steel-low', a: 1000, b: 600, c: 40 }, 'The carriage plate', 'car');
  s.op('m1', 'room.onto', { face: '-z', fit: 'touch' }, 'The carriage across the uprights\' fronts', { host: 'ups', child: 'car' });
  s.n('room.make', { name: 'fork', shape: 'section', mat: 'steel-alloy', a: 100, pts: '0,0; 1100,0; 1100,45; 45,45; 45,500; 0,500' }, 'A fork (an L section)', 'fk');
  s.op('fkz', 'room.turn', { axis: 'y', degrees: 90 }, 'Its blade pointing forward', { block: 'fk' });
  s.n('room.make', { name: 'fork bar', shape: 'box', mat: 'steel-low', a: 400, b: 45, c: 100 }, 'A bar between the forks\' heels (rough)', 'fb');
  s.op('fks', 'room.stack', { name: 'forks', axis: 'x', fit: 'touch', end: 'lo', order: 'fkz, fb, fkz' }, 'Two forks either side of the bar', { blocks: ['fkz', 'fb', 'fkz'] });
  s.op('m2', 'room.onto', { face: '-z', fit: 'touch' }, 'The forks on the carriage', { host: 'm1', child: 'fks' });
  s.op('fl', 'room.onto', { face: '-z', fit: 'touch' }, 'The mast in front of the body', { host: 'bd', child: 'm2' });
  s.outs('fl');
  s.save('seed.forklift', 'Forklift', 'A counterbalance forklift (sizes typical of the 2.5 t class, rough): four Ø500 wheels over two axles (they turn) with a spine between, a box body on the axles, and a mast in front: two uprights, a carriage plate across their fronts and two L-section forks on it. Settings: lift (the mast\'s height) and fork (the blades\' length), mm. It offers the axles\' axes',
    'A forklift: body on four wheels, mast, carriage, two forks, as one node');
}

// ---- a train ---------------------------------------------------------------------------------------------------------------
function train(): void {
  // (a small diesel shunter and two open wagons, sizes typical of narrow-gauge industrial stock (recalled): Ø700 steel
  // wheels over Ø100 axles (they turn), two axles a chassis, the engine's hood and cab on its chassis, each wagon a tray,
  // coupled by Ø40 bars between the ends)
  const s = new Asm('A train');
  s.input('wagon', 'number', 5000, 'a wagon\'s length, mm', [], 'wb.a; wsp.c');
  s.input('engine', 'number', 6000, 'the engine\'s length, mm', [], 'eh.c; esp.c');
  s.n('room.make', { name: 'train wheel', shape: 'rod', mat: 'steel-low', a: 350, b: 120 }, 'A wheel, Ø700 steel (drawn with no bore: its axle bores it to the clear fit)', 'tw');
  for (const [k, sp, L] of [['e', 'esp', 6000], ['w', 'wsp', 5000]] as const) {
    axleWithWheels(s, `${k}a1`, `${k === 'e' ? 'engine' : 'wagon'} front axle`, 50, 1800, 'tw');
    axleWithWheels(s, `${k}a2`, `${k === 'e' ? 'engine' : 'wagon'} rear axle`, 50, 1800, 'tw');
    s.n('room.make', { name: `${k === 'e' ? 'engine' : 'wagon'} chassis`, shape: 'box', mat: 'steel-low', a: 1200, b: 200, c: L - 1500 }, 'The chassis between the axles', sp);
    s.op(`${k}ch`, 'room.stack', { name: 'chassis', axis: 'z', fit: 'touch', order: `${k}a2, ${sp}, ${k}a1` }, 'Two axles and the chassis', { blocks: [`${k}a2`, sp, `${k}a1`] });
  }
  s.n('room.make', { name: 'engine hood', shape: 'box', mat: 'steel-low', a: 1200, b: 1500, c: 6000 }, 'The engine\'s hood (a box)', 'eh');
  s.op('e1', 'room.onto', { face: '+y', fit: 'touch' }, 'The hood on the chassis', { host: 'ech', child: 'eh' });
  s.n('room.make', { name: 'engine cab', shape: 'case', mat: 'steel-low', a: 1200, b: 1200, c: 1500, d: 3, e: 3 }, 'The cab, a shell', 'ec');
  s.op('eng', 'room.onto', { face: '+y', fit: 'touch', end: 'lo' }, 'The cab on the hood\'s end', { host: 'e1', child: 'ec' });
  s.n('room.make', { name: 'wagon body', shape: 'box', mat: 'steel-low', a: 1200, b: 800, c: 5000 }, 'A wagon\'s body (a box: its tray not hollowed, rough)', 'wb');
  s.op('wag', 'room.onto', { face: '+y', fit: 'touch' }, 'The tray on the chassis', { host: 'wch', child: 'wb' });
  s.n('room.make', { name: 'coupler', shape: 'box', mat: 'steel-low', a: 200, b: 400, c: 500 }, 'A coupler (a block between the cars, on the ground: rough)', 'cp');
  s.op('train', 'room.stack', { name: 'train', axis: 'z', fit: 'touch', level: 'on the ground', order: 'wag, cp, wag, cp, eng' }, 'Two wagons and the engine, coupled, each on the ground', { blocks: ['wag', 'cp', 'wag', 'cp', 'eng'] });
  s.outs('train');
  s.save('seed.train', 'Train (engine and two wagons)', 'A small train (sizes typical of narrow-gauge industrial stock, rough): a diesel engine (a hood and a cab shell on a chassis) and two wagons (a box body on a chassis), each chassis on two axles with Ø700 steel wheels over their ends (they turn), coupled by blocks between them. Settings: wagon and engine (their lengths), mm. It offers each axle\'s axis',
    'A train: an engine and two wagons on wheels, coupled, as one node');
}

// ---- a 3D printer ---------------------------------------------------------------------------------------------------------
function printer3d(): void {
  // (a bed-slinger 3D printer, sizes typical (recalled): the Y axis (seed.linear-axis) laid along z between two 2020 rails
  // on the ground, a 220 × 220 bed plate on its carriage... drawn here as: the X axis laid across the top of the Y axis, the
  // bed plate on top, the hotend envelope on the bed (rough: its true carriage not drawn); a frame side of three 2020
  // extrusions (a Π) either side, the whole on a plywood base)
  const s = new Asm('A 3D printer');
  const tv = s.input('travel', 'number', 220, 'the X and Y axes\' travel, mm');
  s.input('height', 'number', 400, 'the frame uprights\' height, mm', [], 'up.length');
  s.n('seed.linear-axis', { travel: 220, stepper: '17' }, 'The Y axis', 'ay'); s.w(tv, 'value', 'ay', 'travel');
  s.op('ayz', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along z', { block: 'ay' });
  s.n('seed.linear-axis', { travel: 220, stepper: '17' }, 'The X axis', 'ax'); s.w(tv, 'value', 'ax', 'travel');
  s.op('axz', 'room.turn', { axis: 'z', degrees: -90 }, 'Laid along x', { block: 'ax' });
  s.op('axx', 'room.turn', { axis: 'x', degrees: 90 }, 'Rolled, its rods side by side', { block: 'axz' });
  s.n('piece.plate', { name: 'cross slide plate', mat: 'al-6061', w: 120, t: 6, d: 240, holes: '-50,-100; 50,-100; -50,100; 50,100', hole: 5.5 }, 'A cross-slide plate over the Y axis', 'csp');
  s.op('xy0', 'room.onto', { face: '+y', fit: 'touch' }, 'Over the Y axis', { host: 'ayz', child: 'csp' });
  s.op('xy', 'room.onto', { face: '+y', fit: 'touch' }, 'The X axis across the plate', { host: 'xy0', child: 'axx' });
  s.n('piece.sheet', { size: 'aluminium 2', w: 220, l: 220 }, 'The bed plate, aluminium 2, 220 × 220', 'bed');
  s.op('bd', 'room.onto', { face: '+y', fit: 'touch' }, 'The bed plate on top', { host: 'xy', child: 'bed' });
  s.n('room.make', { name: 'hotend', shape: 'box', mat: 'al-6061', a: 40, b: 60, c: 30 }, 'The hotend, an envelope', 'he');
  s.op('core', 'room.onto', { face: '+y', fit: 'touch' }, 'The hotend over the bed', { host: 'bd', child: 'he' });
  s.n('piece.extrusion', { size: '2020 T-slot', length: 400 }, 'A frame upright, 2020 T-slot', 'up');
  s.op('upy', 'room.turn', { axis: 'x', degrees: -90 }, 'Stood up', { block: 'up' });
  s.n('piece.extrusion', { size: '2020 T-slot', length: 400 }, 'A top rail, 2020 T-slot', 'tr');
  s.op('side', 'room.stack', { name: 'frame side', axis: 'z', fit: 'touch', end: 'hi', order: 'upy, tr, upy' }, 'Two uprights and a top rail: a Π', { blocks: ['upy', 'tr', 'upy'] });
  s.op('row', 'room.stack', { name: '3D printer', axis: 'x', fit: 'clear', level: 'on the ground', order: 'side, core, side' }, 'The axes between the frame sides, all on the ground', { blocks: ['side', 'core', 'side'] });
  s.n('piece.sheet', { size: 'plywood 18', w: 500, l: 500 }, 'The base, plywood 18', 'base');
  s.op('pr', 'room.onto', { face: '-y', fit: 'touch' }, 'All on the base', { host: 'row', child: 'base' });
  s.outs('pr');
  s.save('seed.printer-3d', '3D printer', 'A 3D printer (sizes typical, rough): the Y axis (seed.linear-axis) laid along z, the X axis laid across its top, a 220 × 220 aluminium bed plate on it and a hotend envelope over the bed; a frame side of three 2020 T-slot extrusions (two uprights and a top rail) either side, all on a plywood base. Settings: travel (the axes\') and height (the uprights\'), mm. It offers the axes\' lead screws\' axes and NEMA 17 body/holes',
    'A 3D printer: a frame of extrusions, X and Y axes, a bed plate, a hotend, as one node', ['mechanical', 'manufacturing']);
}

// ---- a drill press ---------------------------------------------------------------------------------------------------------
function drillPress(): void {
  // (a bench drill press, sizes typical (recalled): a Ø70 column up through the head's hole (the head on its top), a
  // Ø20 spindle hanging under the head's front with a chuck on its end, a round table turned in one with its collar over
  // the column (clear: it moves), a base plate under all)
  const s = new Asm('A drill press');
  s.input('column', 'number', 900, 'the column\'s length, mm', [], 'col.b');
  s.input('spindle', 'number', 300, 'the spindle\'s length, mm', [], 'spd.b');
  s.n('room.make', { name: 'drill head', shape: 'box', mat: 'iron-cast', a: 250, b: 250, c: 400, face: '+y', points: '0,150', hole: 36 }, 'The head, its column hole near its back', 'head');
  s.n('room.make', { name: 'drill column', shape: 'rod', mat: 'steel-low', a: 35, b: 900 }, 'The column, Ø70', 'col');
  s.op('h1', 'room.through', { line: 'drill head/holes', which: 0, from: 'above', fit: 'touch' }, 'The column down through the head: the head at its top', { host: 'head', passer: 'col' });
  s.n('room.make', { name: 'drill spindle', shape: 'rod', mat: 'steel-alloy', a: 10, b: 300 }, 'The spindle, Ø20', 'spd');
  s.op('h2', 'room.onto', { face: '-y', fit: 'touch' }, 'The spindle hanging under the head', { host: 'h1', child: 'spd' });
  s.n('room.make', { name: 'drill chuck', shape: 'tube', mat: 'steel-alloy', a: 10, b: 25, c: 60 }, 'The chuck', 'chk');
  s.op('h3', 'room.over', { line: 'drill spindle/axis', where: 'lo', fit: 'touch' }, 'The chuck on the spindle\'s end', { host: 'h2', sleeve: 'chk' });
  s.n('room.make', { name: 'drill table', shape: 'lathe', mat: 'iron-cast', pts: '0,0; 55,0; 55,70; 150,70; 150,95; 55,95; 55,110; 0,110' }, 'The table and its collar, turned in one (no bore drawn: the column bores it to the clear fit)', 'tab');
  s.op('h4', 'room.over', { line: 'drill column/axis', where: 'lo', along: 300, fit: 'clear' }, 'The table\'s collar over the column, clear: it moves', { host: 'h3', sleeve: 'tab' });
  s.n('room.make', { name: 'drill base', shape: 'box', mat: 'iron-cast', a: 350, b: 50, c: 550 }, 'The base plate', 'base');
  s.op('dp', 'room.onto', { face: '-y', fit: 'touch' }, 'All on the base', { host: 'h4', child: 'base' });
  s.outs('dp');
  s.save('seed.drill-press', 'Drill press', 'A bench drill press (sizes typical, rough): a Ø70 column up through the head\'s hole, the head on its top with a Ø20 spindle hanging under its front and a chuck on the spindle\'s end, a round cast table with its collar over the column (clear: it moves), a base plate under all. Settings: column (its length) and spindle (its length), mm. It offers drill column/axis and drill spindle/axis',
    'A drill press: base, column, head with a spindle and chuck, table, as one node', ['mechanical', 'manufacturing']);
}

// ---- a ceiling fan ---------------------------------------------------------------------------------------------------------
function ceilingFan(): void {
  // (a 52 in ceiling fan, sizes typical (recalled): four blades 560 long, 110 wide, pitched 12°, a ring turned out under a
  // Ø180 motor can (its axis offered), the downrod up through the can (clear: the fan turns on it) and a canopy on top)
  const s = new Asm('A ceiling fan');
  s.input('blade', 'number', 560, 'a blade\'s length, mm', [], 'blade.a');
  s.input('downrod', 'number', 300, 'the downrod\'s length, mm', [], 'rod.b');
  s.n('room.make', { name: 'fan blade', shape: 'box', mat: 'wood', a: 560, b: 4, c: 110 }, 'A blade', 'blade');
  s.op('pitched', 'room.turn', { axis: 'x', degrees: 12 }, 'Pitched 12°', { block: 'blade' });
  s.n('room.make', { name: 'fan blade root', shape: 'box', mat: 'steel-low', a: 70, b: 12, c: 110 }, 'A blade\'s root bracket (flat, the motor on it)', 'root');
  s.op('one', 'room.stack', { name: 'fan blade', axis: 'x', fit: 'touch', order: 'root, pitched' }, 'The blade on its root', { blocks: ['root', 'pitched'] });
  s.op('blades', 'room.ring', { name: 'fan blades', n: 4, R: 460, fit: 'clear', out: 'yes' }, 'Four blades, turned out', { block: 'one' });
  s.n('room.make', { name: 'fan motor', shape: 'rod', mat: 'steel-low', a: 200, b: 70 }, 'The motor can, Ø400 (rough): the downrod through it bores it to the clear fit', 'mot');
  s.op('f1', 'room.stack', { name: 'ceiling fan', axis: 'y', fit: 'touch', align: 'fan blades/axis', order: 'blades, mot' }, 'The motor on the blades\' roots, on their axis', { blocks: ['blades', 'mot'] });
  s.n('room.make', { name: 'downrod', shape: 'rod', mat: 'steel-low', a: 10, b: 300 }, 'The downrod, Ø20', 'rod');
  s.op('f2', 'room.through', { line: 'fan motor/axis', which: 0, from: 'below', fit: 'clear' }, 'The downrod up through the motor, clear: the fan turns on it', { host: 'f1', passer: 'rod' });
  s.n('room.make', { name: 'fan canopy', shape: 'cone', mat: 'steel-low', a: 70, b: 25, c: 50 }, 'The canopy', 'can');
  s.op('fan', 'room.onto', { face: '+y', fit: 'touch' }, 'The canopy on the downrod\'s top', { host: 'f2', child: 'can' });
  s.outs('fan');
  s.save('seed.ceiling-fan', 'Ceiling fan', 'A ceiling fan (sizes typical of a 52 in fan, rough): four wooden blades pitched 12°, a ring turned out, the motor can on their roots on the ring\'s axis, a Ø20 downrod up through the can (clear: the fan turns on it) and a canopy on its top. Settings: blade (its length) and downrod (its length), mm. It offers downrod/axis and fan motor/axis',
    'A ceiling fan: four blades, a motor, a downrod, a canopy, as one node', ['mechanical', 'electrical', 'everyday']);
}

// ---- a lathe ---------------------------------------------------------------------------------------------------------------
function lathe(): void {
  // (a bench lathe, sizes typical of a 7 × 14 (recalled): a bed, a headstock with the spindle through its hole (clear: it
  // turns) and a chuck on the spindle's end, a carriage, and a tailstock with its quill out toward the chuck)
  const s = new Asm('A lathe');
  s.input('bed', 'number', 1000, 'the bed\'s length, mm', [], 'bed.a');
  s.input('chuck', 'number', 50, 'the chuck\'s radius, mm', [], 'chk.b');
  s.n('room.make', { name: 'headstock', shape: 'box', mat: 'iron-cast', a: 250, b: 300, c: 250, face: '+x', points: '80,0', hole: 20 }, 'The headstock, its spindle hole', 'hs');
  s.n('room.make', { name: 'lathe spindle', shape: 'rod', mat: 'steel-alloy', a: 19.5, b: 400 }, 'The spindle, Ø39', 'spd');
  s.op('l1', 'room.through', { line: 'headstock/holes', which: 0, from: 'below', fit: 'clear' }, 'The spindle through the headstock, clear: it turns', { host: 'hs', passer: 'spd' });
  s.n('room.make', { name: 'lathe chuck', shape: 'tube', mat: 'steel-alloy', a: 19.5, b: 50, c: 60 }, 'The chuck', 'chk');
  s.op('hsu', 'room.over', { line: 'lathe spindle/axis', where: 'hi', fit: 'touch' }, 'The chuck on the spindle\'s nose', { host: 'l1', sleeve: 'chk' });
  s.n('room.make', { name: 'carriage', shape: 'box', mat: 'iron-cast', a: 200, b: 150, c: 250 }, 'The carriage', 'car');
  s.n('room.make', { name: 'tailstock', shape: 'box', mat: 'iron-cast', a: 180, b: 220, c: 200, face: '+x', points: '60,0', hole: 15 }, 'The tailstock, its quill hole', 'ts');
  s.n('room.make', { name: 'tailstock quill', shape: 'rod', mat: 'steel-alloy', a: 14.5, b: 260 }, 'The quill, Ø29', 'quill');
  s.op('tsu', 'room.through', { line: 'tailstock/holes', which: 0, from: 'above', fit: 'slide' }, 'The quill through the tailstock, out toward the chuck', { host: 'ts', passer: 'quill' });
  s.op('row', 'room.stack', { name: 'lathe', axis: 'x', fit: 'clear', end: 'lo', order: 'hsu, car, tsu' }, 'Headstock, carriage, tailstock along the bed', { blocks: ['hsu', 'car', 'tsu'] });
  s.n('room.make', { name: 'lathe bed', shape: 'box', mat: 'iron-cast', a: 1000, b: 120, c: 300 }, 'The bed', 'bed');
  s.op('la', 'room.onto', { face: '-y', fit: 'touch' }, 'All on the bed', { host: 'row', child: 'bed' });
  s.outs('la');
  s.save('seed.lathe', 'Lathe (bench)', 'A bench lathe (sizes typical of a 7 × 14, rough): a cast bed, a headstock with the spindle through its hole (clear: it turns) and a chuck on the spindle\'s nose, a carriage, and a tailstock with its quill out toward the chuck. Settings: bed (its length) and chuck (its radius), mm. It offers lathe spindle/axis and tailstock quill/axis',
    'A lathe: bed, headstock, chuck, carriage, tailstock, as one node', ['mechanical', 'manufacturing']);
}

// ---- a lawnmower -----------------------------------------------------------------------------------------------------------
function lawnmower(): void {
  // (a push petrol mower, sizes typical of a 46 cm cut (recalled): a deck (a cup turned over, open below) on two axles with
  // Ø200 wheels over their ends (they turn), an engine envelope on the deck and a two-tube handle tilted up and back)
  const s = new Asm('A lawnmower');
  s.input('deck', 'number', 230, 'the deck\'s radius, mm', [], 'deck.a');
  s.input('handle', 'number', 1200, 'the handle tubes\' length, mm', [], 'ht.length');
  roadWheel(s, 'wh', 'mower wheel', 60, 100, 45);
  axleWithWheels(s, 'ax1', 'mower front axle', 6, 640, 'wh');
  axleWithWheels(s, 'ax2', 'mower rear axle', 6, 640, 'wh');
  s.n('room.make', { name: 'mower frame', shape: 'box', mat: 'steel-low', a: 60, b: 30, c: 300 }, 'A spine between the axles', 'sp');
  s.op('ch', 'room.stack', { name: 'mower chassis', axis: 'z', fit: 'touch', order: 'ax2, sp, ax1' }, 'Rear axle, spine, front axle', { blocks: ['ax2', 'sp', 'ax1'] });
  s.n('room.make', { name: 'mower deck', shape: 'rod', mat: 'steel-low', a: 230, b: 6 }, 'The deck (a disc: its skirt not drawn, rough)', 'deck');
  s.op('m1', 'room.onto', { face: '+y', fit: 'touch' }, 'The deck on its axles', { host: 'ch', child: 'deck' });
  s.n('room.make', { name: 'mower engine', shape: 'box', mat: 'al-a380', a: 300, b: 300, c: 300 }, 'The engine, an envelope', 'eng');
  s.op('m2', 'room.onto', { face: '+y', fit: 'touch' }, 'The engine on the deck', { host: 'm1', child: 'eng' });
  s.n('piece.altube', { size: '25x2', length: 1200 }, 'A handle tube, 25 × 2 aluminium', 'ht');
  s.op('hts', 'room.ring', { name: 'handle tubes', n: 2, R: 200, fit: 'clear', out: 'no' }, 'Two of them, 400 apart', { block: 'ht' });
  s.n('room.make', { name: 'handle bracket', shape: 'box', mat: 'steel-low', a: 440, b: 40, c: 40 }, 'The handle\'s bracket', 'hb');
  s.op('htt', 'room.stack', { name: 'handle', axis: 'y', fit: 'touch', order: 'hb, hts' }, 'The tubes up from the bracket (drawn upright: rough)', { blocks: ['hb', 'hts'] });
  s.op('mw', 'room.onto', { face: '+z', fit: 'touch' }, 'The handle off the back', { host: 'm2', child: 'htt' });
  s.outs('mw');
  s.save('seed.lawnmower', 'Lawnmower', 'A push lawnmower (sizes typical of a 46 cm cut, rough): a deck (a steel disc, rough) on two axles with four Ø200 wheels over their ends (they turn), an engine envelope on the deck and a handle of two 25 × 2 aluminium tubes on a bracket off the back (drawn upright). Settings: deck (its radius) and handle (the tubes\' length), mm. It offers the axles\' axes',
    'A lawnmower: deck, four wheels, engine, handle, as one node', ['mechanical', 'everyday', 'vehicles']);
}

// ---- a scooter -------------------------------------------------------------------------------------------------------------
function scooter(): void {
  // (a kick scooter, sizes typical (recalled): Ø100 wheels each in a fork (a shell open below, its axle through its legs,
  // the wheel over the axle, clear: it turns), a deck between the forks with a brace under it (all on the ground), a 25 × 2
  // column up from the front fork's crown and a bar across its top; its folding hinge and brake not drawn)
  const s = new Asm('A scooter');
  s.input('deck', 'number', 480, 'the deck\'s length, mm', [], 'deck.c; brace.c');
  s.input('column', 'number', 800, 'the steering column\'s length, mm', [], 'col.length');
  roadWheel(s, 'wh', 'scooter wheel', 36, 50, 24);
  s.n('room.make', { name: 'left fork leg', shape: 'box', mat: 'al-6061', a: 6, b: 120, c: 110, face: '+x', points: '-40,0', hole: 4.1 }, 'A fork leg, its axle hole near its foot', 'fl');
  s.n('room.make', { name: 'right fork leg', shape: 'box', mat: 'al-6061', a: 6, b: 120, c: 110, face: '+x', points: '-40,0', hole: 4.1 }, 'The other leg', 'fr');
  s.n('room.make', { name: 'fork crown', shape: 'box', mat: 'al-6061', a: 38, b: 8, c: 110 }, 'The crown between their tops', 'fcr');
  s.op('fk', 'room.stack', { name: 'scooter fork', axis: 'x', fit: 'touch', end: 'hi', order: 'fl, fcr, fr' }, 'A leg either side of the crown, flush at the top', { blocks: ['fl', 'fcr', 'fr'] });
  s.n('piece.shaft', { size: '8', length: 50 }, 'An axle, Ø8', 'axle');
  s.op('fa', 'room.through', { line: 'left fork leg/holes', which: 0, from: 'below', fit: 'touch' }, 'The axle through both legs', { host: 'fk', passer: 'axle' });
  s.op('fw', 'room.over', { line: 'Ø8 shaft/axis', where: 'mid', fit: 'clear' }, 'The wheel between the legs, clear: it turns', { host: 'fa', sleeve: 'wh' });
  s.n('piece.altube', { size: '25x2', length: 800 }, 'The steering column, 25 × 2', 'col');
  s.op('fc', 'room.onto', { face: '+y', fit: 'touch' }, 'The column up from the crown', { host: 'fw', child: 'col' });
  s.n('piece.altube', { size: '20x1.5', length: 420 }, 'The handlebar, 20 × 1.5', 'bar0');
  s.op('bar', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: 'bar0' });
  s.n('room.make', { name: 'scooter stem', shape: 'box', mat: 'al-6061', a: 40, b: 30, c: 40 }, 'A stem block on the column', 'stm');
  s.op('fs', 'room.onto', { face: '+y', fit: 'touch' }, 'The stem on the column\'s top', { host: 'fc', child: 'stm' });
  s.op('front', 'room.onto', { face: '+y', fit: 'touch' }, 'The bar across the stem', { host: 'fs', child: 'bar' });
  s.n('room.make', { name: 'scooter deck', shape: 'box', mat: 'al-6061', a: 110, b: 15, c: 480 }, 'The deck', 'deck');
  s.n('room.make', { name: 'deck brace', shape: 'box', mat: 'al-6061', a: 40, b: 50, c: 480 }, 'A brace under it, down to the ground (rough)', 'brace');
  s.op('dk', 'room.stack', { name: 'deck', axis: 'y', fit: 'touch', order: 'brace, deck' }, 'The deck on its brace', { blocks: ['brace', 'deck'] });
  s.op('sc', 'room.stack', { name: 'scooter', axis: 'z', fit: 'clear', level: 'on the ground', order: 'fw, dk, front' }, 'Rear wheel, deck, front, each on the ground', { blocks: ['fw', 'dk', 'front'] });
  s.outs('sc');
  s.save('seed.scooter', 'Scooter (kick)', 'A kick scooter (sizes typical, rough): two Ø100 wheels, each in a fork (two aluminium legs under a crown, a Ø8 axle through the legs, the wheel over it: it turns), a deck between the forks on a brace, a 25 × 2 aluminium column up from the front fork and a bar across its top. Its folding hinge and brake not drawn. Settings: deck (its length) and column (its length), mm. It offers Ø8 shaft/axis (the axles) and 25x2 aluminium tube/axis',
    'A scooter: deck, two wheels in forks, column, handlebar, as one node', ['mechanical', 'everyday', 'vehicles']);
}

// ---- a motorcycle ----------------------------------------------------------------------------------------------------------
function motorcycle(): void {
  // (a naked motorcycle, sizes typical of a 650 twin (recalled): Ø600 disc wheels over Ø20 axles (they turn), a rectangle
  // frame of Ø32 tubes (rough), the engine envelope under it, a tank and a seat on it, a stem and bar on the head tube)
  const s = new Asm('A motorcycle');
  s.input('seat', 'number', 450, 'the seat tube\'s length, mm', [], 'fst.b');
  s.input('top', 'number', 700, 'the top tube\'s length, mm', [], 'ftt0.b');
  discWheel(s, 'wh', 'motorcycle wheel', 40, 150, 216, 80, 300, 120);
  wheelOnAxle(s, 'fw', 'wh', 'front axle', 10, 220);
  wheelOnAxle(s, 'rw', 'wh', 'rear axle', 10, 220);
  tubeFrame(s, 'f', 450, 700, 450, 22, 16);
  s.n('room.make', { name: 'motorcycle engine', shape: 'box', mat: 'al-a380', a: 420, b: 420, c: 520 }, 'The engine, an envelope', 'eng');
  s.op('fr1', 'room.stack', { name: 'motorcycle frame', axis: 'y', fit: 'touch', align: 'seat tube/axis', order: 'eng, ff' }, 'The frame on its engine', { blocks: ['eng', 'ff'] });
  s.n('room.make', { name: 'fuel tank', shape: 'box', mat: 'steel-low', a: 320, b: 220, c: 420 }, 'The tank', 'tank');
  s.op('fr2', 'room.stack', { name: 'motorcycle frame', axis: 'y', fit: 'touch', align: 'head tube/axis', order: 'fr1, tank' }, 'The tank on the frame, behind the head tube', { blocks: ['fr1', 'tank'] });
  s.n('room.make', { name: 'motorcycle seat', shape: 'box', mat: 'pu', a: 280, b: 70, c: 420 }, 'The seat', 'seat');
  s.op('fr3', 'room.stack', { name: 'motorcycle frame', axis: 'y', fit: 'touch', align: 'seat tube/axis', order: 'fr2, seat' }, 'The seat on the frame over the seat tube', { blocks: ['fr2', 'seat'] });
  s.n('room.make', { name: 'stem', shape: 'rod', mat: 'al-6061', a: 16, b: 150 }, 'The stem', 'stem');
  s.n('room.make', { name: 'handlebar', shape: 'rod', mat: 'steel-low', a: 11, b: 760 }, 'The bar, 760 across', 'bar0');
  s.op('bar', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across', { block: 'bar0' });
  s.op('bars', 'room.stack', { name: 'handlebars', axis: 'y', fit: 'touch', order: 'stem, bar' }, 'The bar on its stem', { blocks: ['stem', 'bar'] });
  s.op('fr4', 'room.stack', { name: 'motorcycle frame', axis: 'y', fit: 'touch', align: 'head tube/axis', order: 'fr3, bars' }, 'The bars on the head tube', { blocks: ['fr3', 'bars'] });
  s.op('mc', 'room.stack', { name: 'motorcycle', axis: 'z', fit: 'clear', order: 'rw, fr4, fw' }, 'Rear wheel, frame, front wheel', { blocks: ['rw', 'fr4', 'fw'] });
  s.outs('mc');
  s.save('seed.motorcycle', 'Motorcycle', 'A naked motorcycle (sizes typical of a 650 twin, rough): two Ø600 disc wheels over Ø20 axles (they turn), a rectangle frame of Ø32 tubes, the engine envelope under it, a tank and a seat on it, a stem and 760 mm bar on the head tube. Its fork, swingarm and chain not drawn. Settings: seat (the seat tube\'s length) and top (the top tube\'s), mm. It offers seat tube/axis and head tube/axis, front axle/axis and rear axle/axis',
    'A motorcycle: frame, two wheels, engine, tank, seat, handlebar, as one node');
}

// ---- a tractor -------------------------------------------------------------------------------------------------------------
function tractor(): void {
  // (a compact tractor, sizes typical of the 25 hp class (recalled): Ø1400 rear and Ø800 front wheels over their axles
  // (they turn), a spine between, the body on the rear axle, a cab shell on its back, a loader bucket off its front)
  const s = new Asm('A tractor');
  s.input('wheelbase', 'number', 1700, 'the wheelbase, mm (the spine between the axles is 1100 shorter)', [], 'sp.c');
  s.input('body', 'number', 2400, 'the body\'s length, mm', [], 'body.c');
  roadWheel(s, 'rwh', 'tractor rear wheel', 400, 700, 300);
  roadWheel(s, 'fwh', 'tractor front wheel', 200, 400, 150);
  axleWithWheels(s, 'ra', 'tractor rear axle', 30, 1900, 'rwh');
  axleWithWheels(s, 'fa', 'tractor front axle', 20, 1500, 'fwh');
  s.n('room.make', { name: 'tractor spine', shape: 'box', mat: 'steel-low', a: 300, b: 760, c: 600 }, 'A spine between the axles, down to the ground (rough)', 'sp');
  s.op('ch', 'room.stack', { name: 'tractor chassis', axis: 'z', fit: 'touch', level: 'on the ground', order: 'ra, sp, fa' }, 'Rear axle, spine, front axle, each on the ground', { blocks: ['ra', 'sp', 'fa'] });
  s.n('room.make', { name: 'tractor body', shape: 'box', mat: 'steel-low', a: 900, b: 800, c: 2400 }, 'The body (a box, rough)', 'body');
  s.op('t1', 'room.onto', { face: '+y', fit: 'touch' }, 'The body on its axles', { host: 'ch', child: 'body' });
  s.n('room.make', { name: 'tractor cab', shape: 'case', mat: 'steel-low', a: 900, b: 1000, c: 1000, d: 3, e: 3 }, 'The cab, a shell', 'cab');
  s.op('t2', 'room.onto', { face: '+y', fit: 'touch', end: 'lo' }, 'The cab on the body\'s back', { host: 't1', child: 'cab' });
  s.n('room.make', { name: 'loader bucket', shape: 'case', mat: 'steel-low', a: 1200, b: 500, c: 600, d: 6, e: 6 }, 'The loader bucket, an open box', 'bkt');
  s.op('tr', 'room.onto', { face: '-z', fit: 'touch' }, 'The bucket off the front', { host: 't2', child: 'bkt' });
  s.outs('tr');
  s.save('seed.tractor', 'Tractor', 'A compact tractor (sizes typical of the 25 hp class, rough): two Ø1400 rear and two Ø800 front wheels over their axles (they turn), a spine between the axles, a box body on them, a cab shell on its back and a loader bucket off its front (its arms not drawn). Settings: wheelbase and body (its length), mm. It offers the axles\' axes',
    'A tractor: body, two big and two small wheels, cab, bucket, as one node');
}

// ---- a bus and a van: a box body set on its wheels --------------------------------------------------------------------------
function boxVehicle(id: string, title: string, o: { body: [number, number, number]; wheel: [number, number, number]; axle: [number, number]; base: number; says: string; gloss: string }): void {
  // (a body (a box) on two axles with a wheel over each end (clear: they turn): the body set on the wheels' tops, its
  // wheel arches not drawn, rough)
  const s = new Asm(title);
  s.input('length', 'number', o.body[2], 'the body\'s length, mm', [], 'body.c');
  s.input('wheelbase', 'number', o.base, 'the spine\'s length between the axles, mm', [], 'sp.c');
  roadWheel(s, 'wh', `${title.replace(/^An? /, '')} wheel`, o.wheel[0], o.wheel[1], o.wheel[2]);
  axleWithWheels(s, 'ax1', 'front axle', o.axle[0], o.axle[1], 'wh');
  axleWithWheels(s, 'ax2', 'rear axle', o.axle[0], o.axle[1], 'wh');
  s.n('room.make', { name: 'chassis spine', shape: 'box', mat: 'steel-low', a: 300, b: 150, c: o.base }, 'A spine between the axles', 'sp');
  s.op('ch', 'room.stack', { name: 'chassis', axis: 'z', fit: 'touch', order: 'ax2, sp, ax1' }, 'Rear axle, spine, front axle', { blocks: ['ax2', 'sp', 'ax1'] });
  s.n('room.make', { name: `${title.replace(/^An? /, '')} body`, shape: 'case', mat: 'steel-low', a: o.body[0], b: o.body[1], c: o.body[2], d: 2, e: 2 }, 'The body, a shell (open at the top: its roof not drawn)', 'body');
  s.op('v', 'room.onto', { face: '+y', fit: 'touch' }, 'The body on its wheels', { host: 'ch', child: 'body' });
  s.outs('v');
  s.save(id, title.replace(/^An? /, '').replace(/^./, (c) => c.toUpperCase()), o.says, o.gloss);
}

// ---- a robot dog -----------------------------------------------------------------------------------------------------------
function robotDog(): void {
  // (seed.quadruped with a head: a neck plate across the body's front at its top, a head block in front of it, a camera on
  // the head's face)
  const s = new Asm('A robot dog');
  s.n('group.in', { name: 'joints', type: 'text', unit: '', default: '2', choices: '2|3', says: 'each leg\'s joints: 2 or 3' }, 'in: joints', 'in_joints');
  s.input('head', 'number', 100, 'the head\'s length, mm', [], 'head.c');
  s.n('seed.quadruped', { joints: '2' }, 'The quadruped', 'quad'); s.w('in_joints', 'value', 'quad', 'joints');
  s.n('room.make', { name: 'neck plate', shape: 'box', mat: 'abs', a: 240, b: 10, c: 60 }, 'A neck plate the body\'s width', 'neck');
  s.n('room.make', { name: 'dog head', shape: 'box', mat: 'abs', a: 80, b: 80, c: 100 }, 'The head', 'head');
  s.op('hd', 'room.stack', { name: 'head', axis: 'z', fit: 'touch', order: 'neck, head' }, 'The head off the neck plate', { blocks: ['neck', 'head'] });
  s.n('room.make', { name: 'camera module', shape: 'box', mat: 'pc', a: 30, b: 30, c: 10 }, 'A camera module', 'cam');
  s.op('hc', 'room.onto', { face: '+z', fit: 'touch' }, 'The camera on the head\'s face', { host: 'hd', child: 'cam' });
  s.op('dog', 'room.onto', { face: '+z', fit: 'touch', end: 'hi' }, 'The head off the body\'s front, at its top', { host: 'quad', child: 'hc' });
  s.outs('dog');
  s.save('seed.robot-dog', 'Robot dog', 'A robot dog: the quadruped (seed.quadruped: four servo legs under an ABS body) with a head: a neck plate across the body\'s front at its top, a head block in front of it and a camera module on its face. Settings: joints (each leg\'s, 2 or 3) and head (its length), mm. It offers what the quadruped offers (body mount/holes, legs/axis)',
    'A robot dog: a quadruped with a head and a camera, as one node', ['mechanical', 'electrical']);
}

let made = false;
export function makeVehicles(): void {
  if (made) return; made = true;
  bicycle(); helicopter(); excavator(); forklift(); train(); printer3d(); drillPress(); ceilingFan(); lathe(); lawnmower(); scooter(); motorcycle(); tractor();
  boxVehicle('seed.bus', 'A bus', { body: [2500, 3000, 11000], wheel: [250, 520, 280], axle: [40, 2400], base: 5000, says: 'A city bus (sizes typical of a 12 m single-decker, rough): a body shell 2.5 m wide, 3 m tall, 11 m long (its roof, doors and windows not drawn) set on four Ø1040 wheels over two axles (they turn) with a spine between. Settings: length (the body\'s) and wheelbase (the spine\'s), mm. It offers front axle/axis and rear axle/axis', gloss: 'A bus: a long body on four wheels, as one node' });
  boxVehicle('seed.van', 'A van', { body: [2000, 1900, 5000], wheel: [200, 340, 200], axle: [25, 1900], base: 3000, says: 'A panel van (sizes typical of a mid-size van, rough): a body shell 2 m wide, 1.9 m tall, 5 m long (its roof and doors not drawn) set on four Ø680 wheels over two axles (they turn) with a spine between. Settings: length (the body\'s) and wheelbase (the spine\'s), mm. It offers front axle/axis and rear axle/axis', gloss: 'A van: a box body on four wheels, as one node' });
  robotDog();
}
makeVehicles();
