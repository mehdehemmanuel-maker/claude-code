// Everyday, building and vehicle assemblies (decision 0028): the things a person asks for by name in a room, a garden
// or a yard (a chair, a desk, a bed, a door that swings, a window, a stud wall, a fence, a kart, a trailer, a wheelbarrow,
// a mast, a solar panel, a satellite dish), each a board of piece.* nodes and room operations folded into one library
// block of the settings that matter, so a request starts from the thing and not from a board and a rod. Every place is
// given by the operations (no at, no rot); every size is a real product's or standard's figure (its source beside it)
// or labelled typical. Each says what it offers next. Where a piece should move (a door's leaf, a wheel), it goes over its
// pin or axle with a clear fit: the joint motionOf reads. Loaded by one import in seeds.ts.

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

const SPEC = { discipline: 'mechanical.design.cad', role: 'geometry operation' as const, codes: [{ scheme: 'MSC2020' as const, code: '68U07', label: 'Computer science aspects of computer-aided design' }] };

/** A board being built a node at a time and saved as one block (as machines.ts builds its assemblies). */
class Fold {
  readonly b: Board; private k = 0;
  constructor(title: string) { this.b = emptyBoard(title); }
  n(blockId: string, set: Record<string, unknown>, label: string, id = `n${this.k++}`): string { placeBlock(this.b, blockId, 0, 0, set, id); this.b.nodes[id]!.label = label; return id; }
  /** A setting of the block: its name, type, default, what it is, and the inner settings it sets ("node.setting; ..."). */
  set(name: string, type: Type, def: unknown, says: string, into: string, choices?: string[]): void { this.n('group.in', { name, type, unit: '', default: String(def), choices: (choices ?? []).join('|'), says, into }, `in: ${name}`); }
  /** A setting that goes in along a wire (a folded block's own settings are its inputs). */
  feed(name: string, def: unknown, says: string, to: [string, string][]): void { const id = this.n('group.in', { name, type: 'number', unit: '', default: String(def), choices: '', says }, `in: ${name}`); for (const [n, i] of to) wire(this.b, id, 'value', n, i); }
  out(name: string, type: Type, from: string, port: string): void { const id = this.n('group.out', { name, type, unit: '' }, `out: ${name}`); wire(this.b, from, port, id, 'value'); }
  /** The node `id` of block `blk`, fed by blocks into input `inp` (a many input takes them in the order of the list). */
  op(id: string, blk: string, set: Record<string, unknown>, label: string, ins: Record<string, string | string[]>): string {
    // (a stack's order is by its sources' names: a block that goes in twice goes in the second time as the same block
    // passed on (turned by nothing), so each place in the order has a name of its own)
    if (blk === 'room.stack' && Array.isArray(ins.blocks)) { const seen = new Map<string, number>();
      ins = { ...ins, blocks: ins.blocks.map((f) => { const k = seen.get(f) ?? 0; seen.set(f, k + 1); return k ? this.op(`${id}_${f}${k}`, 'room.turn', { axis: 'y', degrees: 0 }, 'The same again', { block: f }) : f; }) };
      set = { ...set, order: (ins.blocks as string[]).join(',') }; }
    this.n(blk, set, label, id); for (const [inp, from] of Object.entries(ins)) for (const f of [from].flat()) wire(this.b, f, 'block', id, inp); return id; }
  /** A block turned about an axis (a quarter turn unless said). */
  turn(id: string, from: string, axis: 'x' | 'y' | 'z', label: string, degrees = 90): string { return this.op(id, 'room.turn', { axis, degrees }, label, { block: from }); }
  /** A board made a post or a stile: timber's length (z) stood up, its thickness across (x), its width deep (z). */
  stand(id: string, from: string, label: string): string { return this.turn(id, this.turn(`${id}_e`, from, 'z', `${label}: on its edge`), 'x', label); }
  /** A board laid across: timber's length along x, its thickness up, its width deep. */
  across(id: string, from: string, label: string): string { return this.turn(id, from, 'y', label); }
  save(id: string, name: string, says: string, domains: string[], gloss: string, last: string): BlockDef {
    this.out('block', 'block', last, 'block'); this.out('thing', 'assembly', last, 'thing'); this.out('pieces', 'integer', last, 'pieces'); this.out('offers', 'list<text>' as Type, last, 'offers'); this.out('says', 'text', last, 'says');
    layOut(this.b);
    const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, ...SPEC } }); register(d); return d;
  }
}
function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}
/** A road wheel: a rim (a tube round its bore) with its tyre over it, a tight fit; it goes over an axle by its bore. */
function roadWheel(s: Fold, k: string, name: string, bore: number, rim: number, tyre: number, width: number): string {
  s.n('room.make', { name: `${name} rim`, shape: 'tube', mat: 'al-6061', a: bore, b: rim, c: width }, `${name}: its rim`, `${k}_r`);
  s.n('room.make', { name: `${name} tyre`, shape: 'tube', mat: 'rubber', a: rim, b: tyre, c: width }, `${name}: its tyre`, `${k}_t`);
  return s.op(k, 'room.over', { line: `${name} rim/axis`, where: 'mid', fit: 'touch' }, `${name}: the tyre on its rim`, { host: `${k}_r`, sleeve: `${k}_t` });
}

// ---- a school chair (EN 1729-1) -----------------------------------------------------------------------------------------
function chair(): void {
  // (a four-legged school chair: its seat height a size mark of EN 1729-1 (size marks 1 to 6: 260, 310, 350, 380, 430 and
  // 460 mm, as BS EN 1729-1's table gives them on a stockist's sizing guide; 7: 510, recalled), less its 9 mm plywood seat;
  // legs and back posts of Ø21.3 steel tube (CHS 21.3 × 2.6, EN 10219), its seat 400 × 400 and back 400 × 200 typical)
  const s = new Fold('A chair');
  s.set('height', 'number', 451, 'the legs\' length, mm: the seat height less the 9 mm seat (EN 1729-1 size mark 6: 460; 5: 430; 4: 380)', 'leg.length');
  s.set('width', 'number', 400, 'the seat\'s and the back\'s width, mm', 'seat.w; rest.w');
  s.set('depth', 'number', 400, 'the seat\'s depth, mm', 'seat.l');
  s.set('spread', 'number', 250, 'the legs\' distance from the middle, mm (the half-diagonal of their square: about 0.6 of the seat\'s width)', 'legs.R');
  s.set('back', 'number', 300, 'the back posts\' length above the seat, mm', 'post.length');
  s.n('piece.hollowsection', { size: 'CHS 21.3x2.6', length: 451 }, 'A leg, Ø21.3 steel tube', 'leg');
  s.op('legs', 'room.ring', { name: 'chair legs', n: 4, R: 250, fit: 'clear' }, 'Four of them', { block: 'leg' });
  s.turn('sq', 'legs', 'y', 'Turned to the seat\'s corners', 45);
  s.n('piece.sheet', { size: 'plywood 9', w: 400, l: 400 }, 'The seat, plywood 9', 'seat');
  s.op('base', 'room.stack', { name: 'chair base', axis: 'y', fit: 'touch', order: 'sq,seat' }, 'The seat on its legs', { blocks: ['sq', 'seat'] });
  s.n('piece.hollowsection', { size: 'CHS 21.3x2.6', length: 300 }, 'A back post, Ø21.3 steel tube', 'post');
  s.op('posts', 'room.ring', { name: 'back posts', n: 2, R: 180, fit: 'clear' }, 'Two of them, side by side', { block: 'post' });
  s.n('piece.sheet', { size: 'plywood 9', w: 400, l: 200 }, 'The backrest, plywood 9', 'rest');
  s.turn('restup', 'rest', 'x', 'Stood up');
  s.op('back', 'room.stack', { name: 'chair back', axis: 'y', fit: 'touch', order: 'posts,restup' }, 'The backrest on its posts', { blocks: ['posts', 'restup'] });
  s.op('ch', 'room.onto', { face: '+y', fit: 'touch', end: 'hi' }, 'The back on the seat, flush with its back edge', { host: 'base', child: 'back' });
  s.save('seed.chair', 'Chair (school, EN 1729-1)', 'A four-legged school chair by EN 1729-1\'s size marks: four Ø21.3 steel tube legs (CHS 21.3 × 2.6) at the corners of a 9 mm plywood seat, two back posts standing on the seat\'s back edge and a plywood backrest on them. Its settings: height (the legs\': the seat height less 9 mm; size mark 6 seats at 460, 5 at 430, 4 at 380), width and depth (the seat\'s), spread (the legs\' distance from the middle) and back (the posts\' height above the seat), mm. Its fixings not made yet. It offers plywood 9 sheet\'s top (Onto a face, +y) for a cushion and CHS 21.3x2.6/axis (each leg) for a glide', ['everyday', 'structural'], 'A chair: four legs, a seat, a back on two posts', 'ch');
}

// ---- a desk (EN 527-1) -------------------------------------------------------------------------------------------------
function desk(): void {
  // (an office desk: its top 740 mm off the floor, EN 527-1's fixed height for seated work (740 ± 20; height-adjustable
  // desks 650 to 850), its top 1600 × 800 (the common office size, as tenders citing EN 527-1 ask for it), MDF 25; two
  // end frames of SHS 50 × 50 × 3 (EN 10219), each two legs and a rail, a back beam between them, a drawer under the top
  // (an open plywood case with its front and a pull handle; its runners not drawn))
  const s = new Fold('A desk');
  s.set('height', 'number', 715, 'the legs\' length, mm: the top\'s height less the 25 mm top (EN 527-1: 740 for seated work)', 'leg.length');
  s.set('width', 'number', 1600, 'the top\'s width, mm', 'top.w');
  s.set('depth', 'number', 800, 'the top\'s depth, mm', 'top.l');
  s.set('span', 'number', 1400, 'the back beam\'s length between the end frames, mm (the width less about 200)', 'beam.length');
  s.set('rails', 'number', 600, 'each end frame\'s rail between its legs, mm (the depth less about 200)', 'rail.length');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 715 }, 'A leg, SHS 50 × 50 × 3', 'leg');
  s.stand('legup', 'leg', 'Stood up');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 600 }, 'An end rail, SHS 50 × 50 × 3', 'rail');
  s.op('end', 'room.stack', { name: 'desk end frame', axis: 'z', fit: 'touch', end: 'hi', order: 'legup,rail,legup' }, 'An end frame: two legs and a rail, flush at the top', { blocks: ['legup', 'rail', 'legup'] });
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 1400 }, 'The back beam, SHS 50 × 50 × 3', 'beam');
  s.across('beamx', 'beam', 'Laid across');
  s.n('room.make', { name: 'drawer box', shape: 'case', mat: 'wood-veneer', a: 400, b: 50, c: 450, d: 12, e: 6 }, 'The pencil drawer, an open plywood box as tall as the beam', 'dbox');
  s.n('piece.sheet', { size: 'plywood 18', w: 440, l: 50 }, 'Its front, plywood 18', 'dfront');
  s.turn('dfrontup', 'dfront', 'x', 'Stood up');
  s.op('dr1', 'room.onto', { face: '+z', fit: 'touch' }, 'The front on the drawer', { host: 'dbox', child: 'dfrontup' });
  s.n('piece.handle', { size: '128', matter: 'stainless' }, 'A pull handle, 128 mm centres', 'dh');
  s.turn('dhz', 'dh', 'x', 'Its legs toward the front');
  s.op('dr', 'room.onto', { face: '+z', fit: 'touch' }, 'The handle on the front', { host: 'dr1', child: 'dhz' });
  s.op('bd', 'room.onto', { face: '-z', fit: 'touch' }, 'The drawer against the back beam\'s front, under where the top goes', { host: 'beamx', child: 'dr' });
  s.op('frame', 'room.stack', { name: 'desk frame', axis: 'x', fit: 'touch', end: 'hi', order: 'end,bd,end' }, 'The end frames either side of the back beam, flush at the top and the back', { blocks: ['end', 'bd', 'end'] });
  s.n('piece.sheet', { size: 'MDF 25', w: 1600, l: 800 }, 'The top, MDF 25', 'top');
  s.op('dk', 'room.stack', { name: 'desk', axis: 'y', fit: 'touch', order: 'frame,top' }, 'The top on the frame and the drawer', { blocks: ['frame', 'top'] });
  s.save('seed.desk', 'Desk (EN 527-1)', 'An office desk by EN 527-1 (its top 740 off the floor for seated work; 650 to 850 where it adjusts): a 1600 × 800 MDF 25 top on two end frames of SHS 50 × 50 × 3 (each two legs and a rail, flush at the top), a back beam between them and a pencil drawer under the top in front of the beam (an open plywood box 50 deep with an 18 mm front and a 128 mm pull handle; its runners not drawn). Its settings: height (the legs\': the top\'s height less 25), width and depth (the top\'s), span (the back beam\'s) and rails (each end frame\'s), mm. It offers its top (Onto a face, +y) for a screen or a lamp, pull handle 128 mm/screw holes, SHS 50x50x3/axis', ['everyday', 'structural'], 'A desk: a top on two end frames, a back beam, a drawer', 'dk');
}

// ---- a bed frame ---------------------------------------------------------------------------------------------------------
function bedFrame(): void {
  // (a platform bed for a mattress of a sold size (UK single 900 × 1900, small double 1200 × 1900, double 1350 × 1900,
  // king 1500 × 2000; EU 900, 1400, 1600 × 2000; US twin 38 × 75 in, queen 60 × 80 in; as retailers sell them, typical):
  // two sides (a C24 47 × 150 rail on edge between two PAR 69 × 69 legs, flush at the top), a head and a foot rail
  // (C24 47 × 150 on edge) either end of a deck of two plywood 18 sheets, a headboard (plywood 18) at the head, and the
  // mattress (foam, 200 deep, typical) on the deck)
  const s = new Fold('A bed frame');
  s.set('width', 'number', 900, 'the mattress\'s and the head and foot rails\' width, mm (UK single 900, double 1350, king 1500)', 'foot.length; head.length; mat.a');
  s.set('headboard', 'number', 1038, 'the headboard\'s width, mm: the width and the two 69 mm legs', 'hb.w');
  s.set('deck', 'number', 450, 'each of the deck\'s two plywood sheets\' width, mm: half the width', 'dk.w');
  s.set('length', 'number', 1900, 'the mattress\'s, the deck\'s and the side rails\' length, mm (UK 1900; king, EU 2000)', 'dk.l; side.length; mat.c');
  s.set('legs', 'number', 300, 'the legs\' height, mm', 'leg.length');
  s.n('piece.lumber', { size: 'PAR 69x69', length: 300 }, 'A leg, PAR 69 × 69', 'leg');
  s.stand('legup', 'leg', 'Stood up');
  s.n('piece.lumber', { size: 'C24 47x150', length: 1900 }, 'A side rail, C24 47 × 150', 'side');
  s.turn('sideon', 'side', 'z', 'On its edge');
  s.op('sd', 'room.stack', { name: 'bed side', axis: 'z', fit: 'touch', end: 'hi', order: 'legup,sideon,legup' }, 'A side: its rail between two legs, flush at the top', { blocks: ['legup', 'sideon', 'legup'] });
  s.turn('sd2', 'sd', 'y', 'The other side, turned round', 180);
  s.n('piece.sheet', { size: 'plywood 18', w: 450, l: 1900 }, 'A deck sheet, plywood 18', 'dk');
  s.op('deck2', 'room.stack', { name: 'bed deck', axis: 'x', fit: 'touch', order: 'dk,dk' }, 'Two deck sheets side by side', { blocks: ['dk', 'dk'] });
  s.n('piece.lumber', { size: 'C24 47x150', length: 900 }, 'The foot rail, C24 47 × 150', 'foot');
  s.n('piece.lumber', { size: 'C24 47x150', length: 900 }, 'The head rail, C24 47 × 150', 'head');
  s.across('footx_', 'foot', 'The foot rail laid across');
  s.turn('footx', 'footx_', 'x', 'On its edge');
  s.across('headx_', 'head', 'The head rail laid across');
  s.turn('headx', 'headx_', 'x', 'On its edge');
  s.op('mid', 'room.stack', { name: 'bed deck and rails', axis: 'z', fit: 'touch', end: 'hi', order: 'footx,deck2,headx' }, 'The deck between the foot and the head rail, flush at the top', { blocks: ['footx', 'deck2', 'headx'] });
  s.op('bed', 'room.stack', { name: 'bed frame', axis: 'x', fit: 'touch', end: 'hi', order: 'sd,mid,sd2' }, 'A side either side, flush at the top and the head', { blocks: ['sd', 'mid', 'sd2'] });
  s.n('room.make', { name: 'mattress', shape: 'box', mat: 'foam', a: 900, b: 200, c: 1900 }, 'The mattress (foam, 200 deep, typical)', 'mat');
  s.op('bm', 'room.onto', { face: '+y', fit: 'touch' }, 'The mattress on the deck', { host: 'bed', child: 'mat' });
  s.n('piece.sheet', { size: 'plywood 18', w: 1038, l: 1000 }, 'The headboard, plywood 18', 'hb');
  s.turn('hbup', 'hb', 'x', 'Stood up');
  s.op('bh', 'room.onto', { face: '+z', fit: 'touch', end: 'lo' }, 'The headboard against the head end, from the floor', { host: 'bm', child: 'hbup' });
  s.save('seed.bed-frame', 'Bed frame', 'A platform bed frame for a mattress of a sold size (UK single 900 × 1900, double 1350 × 1900, king 1500 × 2000; EU 900, 1400 or 1600 × 2000; typical): two sides (a C24 47 × 150 rail on edge between two PAR 69 × 69 legs), a head and a foot rail either end of a deck of two plywood 18 sheets, a plywood headboard from the floor at the head and the mattress (foam, 200 deep) on the deck. Its settings: width (the mattress\'s and the end rails\'), deck (each deck sheet\'s: half the width), length (the mattress\'s, the deck\'s and the side rails\') and legs, mm. Its fixings not made yet. It offers the mattress\'s top (Onto a face, +y) for bedding and the headboard\'s face (+z)', ['everyday', 'structural'], 'A bed frame: legs, rails, a deck, a headboard and the mattress', 'bh');
}

// ---- a door that swings ------------------------------------------------------------------------------------------------
function door(): void {
  // (an internal door in its lining, its leaf a UK standard 1981 × 762 × 35 flush door (as UK makers sell them, typical):
  // its leaf (a wood slab, its core not drawn) and its lock stile (a flush door's lock block, 100 wide) side by side, a
  // pull handle on the stile's face and its latch bolt out of the stile's edge; a continuous hinge the leaf's height
  // (steel, typical: a Ø6 pin, a knuckle fixed on it and one over it with a clear fit, the joint; a 2.5 mm leaf on each);
  // the lining (PAR 21 × 144: two jambs and a head), the strike jamb clear of the latch. Two butt hinges are not made:
  // a stack lays a piece with nothing in its path past everything, so a second hinge on the leaf lands off the first's line)
  const s = new Fold('A door');
  s.set('width', 'number', 662, 'the leaf\'s width less its 100 mm lock stile, mm (662 for a 762 leaf, 738 for 838)', 'leaf.a');
  s.set('height', 'number', 1981, 'the leaf\'s, its lock stile\'s and its hinge pin\'s height, mm (UK 1981, EU 2040)', 'leaf.b; stile.b; pin.b');
  s.set('knuckles', 'number', 988, 'each hinge knuckle\'s and leaf\'s length, mm: half the height less 2.5', 'kf.c; km.c; lf.b; lm.b');
  s.set('jambs', 'number', 2000, 'the jambs\' length, mm (the leaf\'s height and about 20)', 'jamb.length');
  s.set('head', 'number', 830, 'the head\'s length, mm (the leaf\'s whole width and about 70)', 'hd.length');
  s.n('room.make', { name: 'door leaf', shape: 'box', mat: 'wood', a: 662, b: 1981, c: 35 }, 'The leaf, a 35 mm flush door', 'leaf');
  // (a continuous hinge the leaf's height: its pin, a knuckle fixed on its lower half, a knuckle over its upper half with a
  // clear fit, a 2.5 mm leaf each side)
  s.n('room.make', { name: 'hinge pin', shape: 'rod', mat: 'steel-low', a: 3, b: 1981 }, 'The hinge pin, Ø6', 'pin');
  s.n('room.make', { name: 'hinge knuckle fixed', shape: 'tube', mat: 'steel-low', a: 3, b: 6.5, c: 988 }, 'Its fixed knuckle', 'kf');
  s.op('h1', 'room.over', { line: 'hinge pin/axis', where: 'lo', fit: 'touch' }, 'The fixed knuckle on the pin\'s lower half', { host: 'pin', sleeve: 'kf' });
  s.n('room.make', { name: 'hinge knuckle', shape: 'tube', mat: 'steel-low', a: 4, b: 6.5, c: 988 }, 'Its knuckle that turns', 'km');
  s.op('h2', 'room.over', { line: 'hinge pin/axis', where: 'hi', fit: 'clear' }, 'The turning knuckle over the upper half, a clear fit: the joint', { host: 'h1', sleeve: 'km' });
  s.n('room.make', { name: 'hinge leaf fixed', shape: 'box', mat: 'steel-low', a: 2.5, b: 988, c: 35 }, 'The fixed leaf, 2.5 mm', 'lf');
  s.op('h3', 'room.onto', { face: '-x', fit: 'touch', end: 'lo' }, 'The fixed leaf on the fixed knuckle', { host: 'h2', child: 'lf' });
  s.n('room.make', { name: 'hinge leaf', shape: 'box', mat: 'steel-low', a: 2.5, b: 988, c: 35 }, 'The leaf that turns, 2.5 mm', 'lm');
  s.op('hinge', 'room.onto', { face: '+x', fit: 'touch', end: 'hi' }, 'The turning leaf on the turning knuckle', { host: 'h3', child: 'lm' });
  s.op('d2', 'room.onto', { face: '-x', fit: 'touch', end: 'hi' }, 'The hinge on the leaf\'s edge', { host: 'leaf', child: 'hinge' });
  s.n('room.make', { name: 'lock stile', shape: 'box', mat: 'wood', a: 100, b: 1981, c: 35 }, 'The lock stile, 100 wide', 'stile');
  s.n('piece.handle', { size: '160', matter: 'stainless' }, 'A pull handle, 160 mm centres', 'hdl');
  s.turn('hdlz', 'hdl', 'x', 'Its legs toward the face');
  s.turn('hdlv', 'hdlz', 'z', 'Its bar upright');
  s.n('room.make', { name: 'latch bolt', shape: 'box', mat: 'brass', a: 12, b: 20, c: 10 }, 'The latch bolt, brass', 'latch');
  s.op('st1', 'room.onto', { face: '+x', fit: 'touch' }, 'The latch bolt out of the stile\'s edge, halfway up', { host: 'stile', child: 'latch' });
  s.op('st2', 'room.onto', { face: '+z', fit: 'touch' }, 'The handle on the stile\'s face', { host: 'st1', child: 'hdlv' });
  s.op('dl', 'room.stack', { name: 'door', axis: 'x', fit: 'touch', end: 'lo', order: 'd2,st2' }, 'The leaf and its lock stile, flush at the floor and the back', { blocks: ['d2', 'st2'] });
  s.n('piece.lumber', { size: 'PAR 21x144', length: 2000 }, 'A jamb, PAR 21 × 144', 'jamb');
  s.stand('jup', 'jamb', 'Stood up');
  s.op('fj', 'room.onto', { face: '-x', fit: 'touch' }, 'The hinge jamb against the hinges\' fixed leaves', { host: 'dl', child: 'jup' });
  s.op('fs', 'room.onto', { face: '+x', fit: 'clear' }, 'The strike jamb, clear of the latch', { host: 'fj', child: 'jup' });
  s.n('piece.lumber', { size: 'PAR 21x144', length: 830 }, 'The head, PAR 21 × 144', 'hd');
  s.across('hdx', 'hd', 'Laid across');
  s.op('dr', 'room.onto', { face: '+y', fit: 'touch' }, 'The head on the jambs', { host: 'fs', child: 'hdx' });
  s.save('seed.door', 'Door (in its frame, on hinges)', 'An internal door in its lining that swings: a UK standard 1981 × 762 × 35 flush door (typical) as its leaf and its 100 mm lock stile side by side, a pull handle halfway up the stile\'s face and a brass latch bolt out of its edge, a continuous hinge the leaf\'s height (a Ø6 pin, a fixed knuckle on its lower half, a turning knuckle over its upper half with a clear fit: the joint the leaf swings on; a 2.5 mm leaf each side; two butt hinges on one line are not made yet), the hinge jamb against its fixed leaf, the strike jamb clear of the latch and the head across (PAR 21 × 144). Its settings: width (the leaf\'s less its lock stile), height (the leaf\'s and the pin\'s), knuckles (half the height less 2.5), jambs and head (their lengths), mm. Its screws, strike plate and stops not made yet. It offers hinge pin/axis (the leaf turns about it), latch bolt, PAR 21x144 timber/axis', ['everyday', 'structural', 'mechanical'], 'A door: a leaf on two hinges in its frame, a handle and a latch', 'dr');
}

// ---- a window -----------------------------------------------------------------------------------------------------------
function windowFrame(): void {
  // (a timber casement window, its sizes typical: a 4 mm glass pane between a sash's two rails and two stiles (PAR 44 × 44),
  // the sash between the frame's two jambs, its head on top and its sill under (PAR 44 × 69))
  const s = new Fold('A window');
  s.set('width', 'number', 900, 'the pane\'s and the sash rails\' width, mm', 'glass.a; rail.length');
  s.set('height', 'number', 1000, 'the pane\'s height, mm', 'glass.b');
  s.set('tall', 'number', 1088, 'the sash stiles\' and the jambs\' length, mm: the pane\'s height and its two 44 mm rails', 'stile.length; jamb.length');
  s.set('wide', 'number', 1076, 'the head\'s and the sill\'s length, mm: the width and the four 44 mm stiles and jambs', 'head.length; sill.length');
  s.n('room.make', { name: 'glass pane', shape: 'box', mat: 'glass', a: 900, b: 1000, c: 4 }, 'The pane, 4 mm glass', 'glass');
  s.n('piece.lumber', { size: 'PAR 44x44', length: 900 }, 'A sash rail, PAR 44 × 44', 'rail');
  s.across('railx', 'rail', 'Laid across');
  s.op('col', 'room.stack', { name: 'sash glazing', axis: 'y', fit: 'touch', order: 'railx,glass,railx' }, 'The pane between its bottom and top rails', { blocks: ['railx', 'glass', 'railx'] });
  s.n('piece.lumber', { size: 'PAR 44x44', length: 1088 }, 'A sash stile, PAR 44 × 44', 'stile');
  s.stand('stileup', 'stile', 'Stood up');
  s.op('sash', 'room.stack', { name: 'sash', axis: 'x', fit: 'touch', order: 'stileup,col,stileup' }, 'The sash: a stile either side', { blocks: ['stileup', 'col', 'stileup'] });
  s.n('piece.lumber', { size: 'PAR 44x69', length: 1088 }, 'A jamb, PAR 44 × 69', 'jamb');
  s.stand('jambup', 'jamb', 'Stood up');
  s.op('fr', 'room.stack', { name: 'window frame', axis: 'x', fit: 'touch', order: 'jambup,sash,jambup' }, 'The sash between the jambs', { blocks: ['jambup', 'sash', 'jambup'] });
  s.n('piece.lumber', { size: 'PAR 44x69', length: 1076 }, 'The head, PAR 44 × 69', 'head');
  s.across('headx', 'head', 'Laid across');
  s.n('piece.lumber', { size: 'PAR 44x69', length: 1076 }, 'The sill, PAR 44 × 69', 'sill');
  s.across('sillx', 'sill', 'Laid across');
  s.op('win', 'room.stack', { name: 'window', axis: 'y', fit: 'touch', order: 'sillx,fr,headx' }, 'The sill under, the head on top', { blocks: ['sillx', 'fr', 'headx'] });
  s.save('seed.window', 'Window (frame, sash, glazing)', 'A timber casement window (sizes typical): a 4 mm glass pane between a sash\'s two rails and two stiles (PAR 44 × 44), the sash between the frame\'s two jambs, the head on top and the sill under (PAR 44 × 69). Its settings: width (the pane\'s and the rails\'), height (the pane\'s), tall (the stiles\' and the jambs\': the height and 88) and wide (the head\'s and the sill\'s: the width and 176), mm. Its hinges, stay and putty or beads not made yet (the sash is held, not hung). It offers PAR 44x69 timber/axis and the frame\'s outside faces for a wall\'s opening', ['everyday', 'structural'], 'A window: frame, sash and glass', 'win');
}

// ---- a timber stud wall -------------------------------------------------------------------------------------------------
function studWall(): void {
  // (a timber stud wall as UK practice frames it: CLS 38 × 89 studs at 400 mm centres (noggins of the same between them
  // halfway up set the spacing), a sole plate and a head plate, sheathed on one face in OSB/3 11 (two sheets); four
  // studs, three bays)
  const s = new Fold('A stud wall');
  s.set('height', 'number', 2324, 'the studs\' length, mm: the wall\'s height less its two 38 mm plates (2324 for 2400)', 'stud.length');
  s.set('centres', 'number', 362, 'each noggin\'s length, mm: the studs\' centres less a stud (362 for 400 centres, 562 for 600)', 'nog.length');
  s.set('length', 'number', 1238, 'the plates\' length, mm: three bays and a stud (3 × centres + 38)', 'plate.length');
  s.set('sheet', 'number', 619, 'each OSB sheet\'s width, mm: half the plates\' length', 'osb.w');
  s.set('tall', 'number', 2400, 'the OSB sheets\' length, mm: the studs and the two plates', 'osb.l');
  s.n('piece.lumber', { size: 'CLS 38x89', length: 2324 }, 'A stud, CLS 38 × 89', 'stud');
  s.stand('studup', 'stud', 'Stood up');
  s.n('piece.lumber', { size: 'CLS 38x89', length: 362 }, 'A noggin, CLS 38 × 89', 'nog');
  s.across('nogx', 'nog', 'Laid across');
  s.op('row', 'room.stack', { name: 'studs', axis: 'x', fit: 'touch', order: 'studup,nogx,studup,nogx,studup,nogx,studup' }, 'Four studs, a noggin between each two', { blocks: ['studup', 'nogx', 'studup', 'nogx', 'studup', 'nogx', 'studup'] });
  s.n('piece.lumber', { size: 'CLS 38x89', length: 1238 }, 'A plate, CLS 38 × 89', 'plate');
  s.across('platex', 'plate', 'Laid across');
  s.op('fr', 'room.stack', { name: 'stud frame', axis: 'y', fit: 'touch', order: 'platex,row,platex' }, 'The sole plate under, the head plate on top', { blocks: ['platex', 'row', 'platex'] });
  s.n('piece.sheet', { size: 'OSB 11', w: 619, l: 2400 }, 'A sheathing sheet, OSB/3 11', 'osb');
  s.op('osb2', 'room.stack', { name: 'sheathing', axis: 'x', fit: 'touch', order: 'osb,osb' }, 'Two sheets side by side', { blocks: ['osb', 'osb'] });
  s.turn('osbup', 'osb2', 'x', 'Stood up');
  s.op('wall', 'room.onto', { face: '+z', fit: 'touch' }, 'The sheathing on the frame\'s face', { host: 'fr', child: 'osbup' });
  s.save('seed.stud-wall', 'Stud wall (timber frame)', 'A timber stud wall as UK practice frames it: four CLS 38 × 89 studs at 400 mm centres (a noggin halfway up between each two sets the spacing), a sole plate and a head plate, sheathed on one face (+z) with two OSB/3 11 sheets. Its settings: height (the studs\': the wall less its two plates), centres (each noggin\'s: the centres less 38), length (the plates\': 3 × centres + 38), sheet (each OSB sheet\'s width: half the length) and tall (the sheets\' length), mm. Its nails not made yet. It offers its faces (Onto a face: +z the sheathing, -z the studs for lining) and its top plate (+y) for a roof or a floor above', ['structural', 'everyday'], 'A stud wall: studs, noggins, plates and sheathing', 'wall');
}

// ---- a fence -------------------------------------------------------------------------------------------------------------
function fence(): void {
  // (a close-board fence bay, its sizes typical of a UK 6 ft bay: twelve PAR 21 × 144 boards edge to edge, a C24 47 × 100
  // rail on edge behind them at the bottom and the top, between two C24 100 × 100 posts (their part in the ground not
  // drawn), all standing on the ground)
  const s = new Fold('A fence');
  s.set('height', 'number', 1800, 'the boards\' length, mm', 'board.length');
  s.set('posts', 'number', 1900, 'the posts\' height above the ground, mm', 'post.length');
  s.set('rails', 'number', 1728, 'the rails\' length, mm: the twelve boards\' width (12 × 144)', 'rail.length');
  s.n('piece.lumber', { size: 'PAR 21x144', length: 1800 }, 'A board, PAR 21 × 144', 'board');
  s.turn('bup', 'board', 'x', 'Stood up');
  const bs = Array.from({ length: 12 }, () => 'bup');
  s.op('boards', 'room.stack', { name: 'fence boards', axis: 'x', fit: 'touch', order: bs.join(',') }, 'Twelve boards edge to edge', { blocks: bs });
  s.n('piece.lumber', { size: 'C24 47x100', length: 1728 }, 'A rail, C24 47 × 100', 'rail');
  s.across('railx_', 'rail', 'Laid across');
  s.turn('railx', 'railx_', 'x', 'On its edge');
  s.op('r1', 'room.onto', { face: '-z', fit: 'touch', end: 'lo' }, 'The bottom rail behind the boards', { host: 'boards', child: 'railx' });
  s.op('r2', 'room.onto', { face: '-z', fit: 'touch', end: 'hi' }, 'The top rail behind them', { host: 'r1', child: 'railx' });
  s.n('piece.lumber', { size: 'C24 100x100', length: 1900 }, 'A post, C24 100 × 100', 'post');
  s.turn('postup', 'post', 'x', 'Stood up');
  s.op('fc', 'room.stack', { name: 'fence', axis: 'x', fit: 'touch', level: 'on the ground', order: 'postup,r2,postup' }, 'A post either end, on the ground', { blocks: ['postup', 'r2', 'postup'] });
  s.save('seed.fence', 'Fence (posts, rails, boards)', 'A close-board fence bay (sizes typical of a UK 6 ft bay): twelve PAR 21 × 144 boards edge to edge, a C24 47 × 100 rail on edge behind them at the bottom and at the top, and a C24 100 × 100 post at each end, all on the ground (the posts\' part in the ground not drawn). Its settings: height (the boards\'), posts (their height above the ground) and rails (their length: 12 × 144), mm. Its nails not made yet. It offers C24 100x100 timber/axis (each post) and the posts\' outer faces (±x) for the next bay', ['structural', 'everyday'], 'A fence: two posts, two rails, close boards', 'fc');
}

// ---- a go-kart ----------------------------------------------------------------------------------------------------------
function kart(): void {
  // (a rental-style go-kart: two side rails (steel, a 32 mm kart tube drawn as a 34 mm square bar, approximated) with an
  // aluminium floor tray between them, each rail bored across for a stub axle at each end, 1040 apart (the CIK-FIA's
  // wheelbase for a 30 mm frame is 1010 to 1070, recalled: typical); each wheel on its own Ø25 stub axle out through its
  // rail (the live rear axle drawn as two stubs, approximated), over its outer end with a clear fit (it turns): 11 × 7.10-5
  // tyres behind, 10 × 4.50-5 in front (CIK slick sizes) on 5 in rims; a nose plate in front with the steering column
  // (CHS 21.3) up through it, clear (it steers), and its wheel (Ø300, typical) on top; the seat (a fibreglass shell,
  // typical) and the engine beside it (a Honda GX200's envelope, 313 × 376 × 335 mm as Honda's spec sheet gives it,
  // recalled) on the rails)
  const s = new Fold('A go-kart');
  s.set('frame', 'number', 1120, 'the side rails\' and the tray\'s length, mm (their stub axles are 1040 apart: 1070 at least)', 'rl.c; rr.c; pan.l');
  s.set('width', 'number', 500, 'the tray\'s width between the rails, mm', 'pan.w');
  for (const [k, side] of [['rl', 'left'], ['rr', 'right']] as const)
    s.n('room.make', { name: `${side} rail`, shape: 'box', mat: 'steel-alloy', a: 34, b: 34, c: 1120, points: '0,-520; 0,520', hole: 12.5, face: '+x' }, `The ${side} side rail, its two stub axle holes`, k);
  s.n('piece.sheet', { size: 'aluminium 2', w: 500, l: 1120 }, 'The floor tray, aluminium 2', 'pan');
  s.op('body', 'room.stack', { name: 'kart frame', axis: 'x', fit: 'touch', order: 'rl,pan,rr' }, 'The tray between the rails', { blocks: ['rl', 'pan', 'rr'] });
  roadWheel(s, 'rw', 'rear wheel', 13.5, 63.5, 139.7, 180);
  roadWheel(s, 'fw', 'front wheel', 13.5, 63.5, 127, 114);
  s.n('piece.plate', { name: 'nose plate', mat: 'al-6061', w: 567, t: 3, d: 200, holes: '0,0', hole: 24 }, 'The nose plate, aluminium 3, its column\'s hole', 'nz');
  s.op('ch', 'room.onto', { face: '-z', fit: 'touch' }, 'The nose plate in front of the frame', { host: 'body', child: 'nz' });
  let h = 'ch';
  for (const [k, side, end, which, wh, len] of [['lf', 'left', 'front', 0, 'fw', 150], ['lr', 'left', 'rear', 1, 'rw', 220], ['rf', 'right', 'front', 0, 'fw', 150], ['rx', 'right', 'rear', 1, 'rw', 220]] as const) {
    const stub = `${side} ${end} stub axle`, out = side === 'left' ? 'lo' : 'hi';
    s.n('room.make', { name: stub, shape: 'rod', mat: 'steel-alloy', a: 12.5, b: len }, `The ${side} ${end} stub axle, Ø25`, `${k}s`);
    s.op(`${k}t`, 'room.through', { line: `${side} rail/holes`, which, from: side === 'left' ? 'below' : 'above', fit: 'touch' }, `Out through the ${side} rail`, { host: h, passer: `${k}s` });
    h = s.op(`${k}w`, 'room.over', { line: `${stub}/axis`, where: out, fit: 'clear' }, `The ${side} ${end} wheel on its outer end, clear: it turns`, { host: `${k}t`, sleeve: wh });
  }
  s.n('piece.hollowsection', { size: 'CHS 21.3x2.6', length: 450 }, 'The steering column, CHS 21.3', 'col');
  s.n('room.make', { name: 'steering wheel', shape: 'tube', mat: 'abs', a: 10.65, b: 150, c: 25 }, 'The steering wheel, Ø300', 'sw');
  s.op('k0', 'room.through', { line: 'nose plate/holes', which: 0, from: 'below', fit: 'clear' }, 'The column up through the nose plate, clear: it steers', { host: h, passer: 'col' });
  s.op('k1', 'room.over', { line: 'CHS 21.3x2.6/axis', where: 'hi', fit: 'touch' }, 'The steering wheel on the column\'s top', { host: 'k0', sleeve: 'sw' });
  s.n('room.make', { name: 'kart seat', shape: 'case', mat: 'fibreglass', a: 380, b: 300, c: 350, d: 5, e: 5 }, 'The seat, a fibreglass shell', 'seat');
  s.n('room.make', { name: 'engine (GX200 envelope)', shape: 'box', mat: 'al-a380', a: 376, b: 335, c: 313 }, 'The engine, a Honda GX200\'s envelope', 'eng');
  s.op('se', 'room.stack', { name: 'seat and engine', axis: 'x', fit: 'clear', end: 'lo', order: 'seat,eng' }, 'The engine beside the seat', { blocks: ['seat', 'eng'] });
  s.op('kt', 'room.onto', { face: '+y', fit: 'touch' }, 'The seat and the engine on the rails', { host: 'k1', child: 'se' });
  s.save('seed.kart', 'Go-kart', 'A rental-style go-kart: two steel side rails (a 32 mm kart tube drawn as a 34 mm bar) with an aluminium floor tray between them, each wheel on its own Ø25 stub axle out through its rail 1040 apart (CIK-FIA\'s wheelbase for a 30 mm frame is 1010 to 1070; the live rear axle drawn as two stubs) and over its outer end with a clear fit (it turns): 11 × 7.10-5 tyres behind and 10 × 4.50-5 in front (CIK slick sizes) on 5 in rims; a nose plate in front with the steering column (CHS 21.3) up through it, clear (it steers), and a Ø300 wheel on top; the seat (a fibreglass shell) and the engine beside it (a Honda GX200\'s envelope, 313 × 376 × 335) on the rails. Its settings: frame (the rails\' length; the stubs 1040 apart in them) and width (the tray\'s), mm. Its chain, brake, pedals and tie rods not made yet. It offers each stub axle\'s axis (left front stub axle/axis and the others: the wheels turn on them), CHS 21.3x2.6/axis (the column), the seat\'s cavity', ['vehicles', 'mechanical'], 'A go-kart: frame, four wheels on axles, seat, steering, engine', 'kt');
}

// ---- a trailer ----------------------------------------------------------------------------------------------------------
function trailer(): void {
  // (a small box trailer, its sizes typical of a 4 × 3 ft (1200 × 900) garden trailer: a plywood 18 bed with plywood 12
  // sides on a frame of SHS 50 × 50 × 3 (a side rail at each edge, a spine down the middle that runs on as the drawbar, a
  // cross member each side at the tail); a hitch coupling for a 50 mm tow ball (ISO 1103) on the spine's front; a Ø40 axle
  // under the frame with 4.80/4.00-8 wheels (Ø406 on 8 in rims) over its ends, clear: they turn)
  const s = new Fold('A trailer');
  s.set('length', 'number', 1200, 'the bed\'s, the sides\' and the side rails\' length, mm', 'bed.l; side.l; rl.length');
  s.set('width', 'number', 900, 'the bed\'s width, mm', 'bed.w');
  s.set('cross', 'number', 387, 'each cross member\'s length, mm: (the width and the two 12 mm sides, less the three 50 mm members) / 2', 'xm.length');
  s.set('drawbar', 'number', 1600, 'the spine\'s length, mm: the bed\'s and the drawbar\'s reach in front of it', 'sp.length');
  s.set('track', 'number', 1300, 'the axle\'s length, mm (the wheels outside the bed)', 'ax.b');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 1200 }, 'A side rail, SHS 50 × 50 × 3', 'rl');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 387 }, 'A cross member, SHS 50 × 50 × 3', 'xm');
  s.across('xmx', 'xm', 'Laid across');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 1600 }, 'The spine and drawbar, SHS 50 × 50 × 3', 'sp');
  s.n('room.make', { name: 'hitch coupling', shape: 'box', mat: 'cast-iron', a: 70, b: 50, c: 150 }, 'The hitch coupling, for a 50 mm ball', 'hc');
  s.op('spc', 'room.onto', { face: '-z', fit: 'touch' }, 'The coupling on the drawbar\'s front', { host: 'sp', child: 'hc' });
  s.op('frame', 'room.stack', { name: 'trailer frame', axis: 'x', fit: 'touch', end: 'hi', order: 'rl,xmx,spc,xmx,rl' }, 'The rails, cross members and spine, flush at the tail', { blocks: ['rl', 'xmx', 'spc', 'xmx', 'rl'] });
  s.n('piece.sheet', { size: 'plywood 18', w: 900, l: 1200 }, 'The bed, plywood 18', 'bed');
  s.n('piece.sheet', { size: 'plywood 12', w: 300, l: 1200 }, 'A side, plywood 12', 'side');
  s.turn('sideup', 'side', 'z', 'Stood on its edge');
  s.op('box', 'room.stack', { name: 'trailer box', axis: 'x', fit: 'touch', end: 'lo', order: 'sideup,bed,sideup' }, 'A side either side of the bed', { blocks: ['sideup', 'bed', 'sideup'] });
  s.op('tb', 'room.onto', { face: '+y', fit: 'touch', end: 'hi' }, 'The box on the frame, flush at the tail', { host: 'frame', child: 'box' });
  s.n('room.make', { name: 'trailer axle', shape: 'rod', mat: 'steel-alloy', a: 20, b: 1300 }, 'The axle, Ø40', 'ax');
  roadWheel(s, 'wh', 'trailer wheel', 21, 101.6, 203, 122);
  s.op('ax1', 'room.over', { line: 'trailer axle/axis', where: 'lo', fit: 'clear' }, 'A wheel on one end, clear: it turns', { host: 'ax', sleeve: 'wh' });
  s.op('ax2', 'room.over', { line: 'trailer axle/axis', where: 'hi', fit: 'clear' }, 'And the other', { host: 'ax1', sleeve: 'wh' });
  s.turn('axx', 'ax2', 'z', 'Laid across');
  s.op('tr', 'room.stack', { name: 'trailer', axis: 'y', fit: 'touch', order: 'axx,tb' }, 'The frame on the axle', { blocks: ['axx', 'tb'] });
  s.save('seed.trailer', 'Trailer', 'A small box trailer (sizes typical of a 4 × 3 ft garden trailer): a plywood 18 bed with plywood 12 sides on a frame of SHS 50 × 50 × 3 (a side rail at each edge, a spine down the middle running on in front as the drawbar, a cross member each side at the tail), a hitch coupling for a 50 mm tow ball (ISO 1103) on the drawbar\'s front, and a Ø40 axle under the frame with 4.80/4.00-8 wheels (Ø406 on 8 in rims) over its ends, clear: they turn. Its settings: length and width (the bed\'s), cross (each cross member\'s), drawbar (the spine\'s length) and track (the axle\'s), mm. Its lights, mudguards, springs and tailboard not made yet. It offers trailer axle/axis (the wheels turn on it), its bed (Onto a face, +y) for a load', ['vehicles', 'mechanical'], 'A trailer: frame, axle, two wheels, a bed, a hitch', 'tr');
}

// ---- a wheelbarrow ------------------------------------------------------------------------------------------------------
function wheelbarrow(): void {
  // (a builder's wheelbarrow, its sizes typical: two SHS 30 × 30 × 3 handles with a cross brace between them, a fork plate
  // on each handle's front end, a Ø16 axle through the two plates' holes and a 3.50-8 wheel (Ø390 on an 8 in rim) over its
  // middle (clear: it turns), a 1.2 mm steel tray (about 90 L) on the handles and two legs with their brace under the
  // handles' rear)
  const s = new Fold('A wheelbarrow');
  s.set('handles', 'number', 1400, 'the handles\' length, mm', 'hd.length; hd2.length');
  s.set('width', 'number', 450, 'the braces\' length between the handles (and the legs), mm', 'br.length');
  s.set('axle', 'number', 486, 'the axle\'s length and the tray\'s width, mm: from one fork plate\'s outside to the other\'s (the braces, a handle and a plate: 450 + 30 + 6)', 'ax.b; tray.a');
  s.set('legs', 'number', 180, 'the legs\' length, mm', 'leg.length');
  for (const [k, side] of [['hd', 'left'], ['hd2', 'right']] as const) {
    s.n('piece.hollowsection', { size: 'SHS 30x30x3', length: 1400 }, `The ${side} handle, SHS 30 × 30 × 3`, k);
    s.n('room.make', { name: `${side} fork`, shape: 'box', mat: 'steel-low', a: 6, b: 30, c: 40, points: '0,0', face: '+x', hole: 9 }, `The ${side} fork plate, 6 mm steel, its axle hole`, `${k}f`);
    s.op(`${k}a`, 'room.stack', { name: `${side} handle`, axis: 'z', fit: 'touch', order: `${k}f,${k}` }, 'The fork plate on the handle\'s front end', { blocks: [`${k}f`, k] });
  }
  s.n('piece.hollowsection', { size: 'SHS 30x30x3', length: 450 }, 'A brace, SHS 30 × 30 × 3', 'br');
  s.across('brx', 'br', 'Laid across');
  s.op('fr', 'room.stack', { name: 'barrow frame', axis: 'x', fit: 'touch', order: 'hda,brx,hd2a' }, 'The brace between the handles', { blocks: ['hda', 'brx', 'hd2a'] });
  s.n('room.make', { name: 'barrow axle', shape: 'rod', mat: 'steel-low', a: 8, b: 486 }, 'The axle, Ø16', 'ax');
  s.n('piece.hollowsection', { size: 'SHS 30x30x3', length: 180 }, 'A leg, SHS 30 × 30 × 3', 'leg');
  s.stand('legup', 'leg', 'Stood up');
  s.op('lp', 'room.stack', { name: 'barrow legs', axis: 'x', fit: 'touch', end: 'hi', order: 'legup,brx,legup' }, 'Two legs and their brace, flush at the top', { blocks: ['legup', 'brx', 'legup'] });
  s.op('fl', 'room.onto', { face: '-y', fit: 'touch', end: 'hi' }, 'The legs under the handles\' rear', { host: 'fr', child: 'lp' });
  s.op('fa', 'room.through', { line: 'left fork/holes', which: 0, from: 'above', fit: 'touch' }, 'The axle through the fork plates', { host: 'fl', passer: 'ax' });
  roadWheel(s, 'wh', 'barrow wheel', 9, 101.6, 195, 89);
  s.op('fw', 'room.over', { line: 'barrow axle/axis', where: 'mid', fit: 'clear' }, 'The wheel over the axle\'s middle, clear: it turns', { host: 'fa', sleeve: 'wh' });
  s.n('room.make', { name: 'barrow tray', shape: 'case', mat: 'steel-low', a: 486, b: 250, c: 700, d: 1.2, e: 1.2 }, 'The tray, 1.2 mm steel', 'tray');
  s.op('wb', 'room.onto', { face: '+y', fit: 'touch' }, 'The tray on the handles', { host: 'fw', child: 'tray' });
  s.save('seed.wheelbarrow', 'Wheelbarrow', 'A builder\'s wheelbarrow (sizes typical): two SHS 30 × 30 × 3 handles with a cross brace, a fork plate on each handle\'s front end, a Ø16 axle through the plates and a 3.50-8 wheel (Ø390 on an 8 in rim) over its middle (clear: it turns), a 1.2 mm steel tray of about 90 L on the handles, and two legs with their brace under the handles\' rear. Its settings: handles (their length), width (the braces\'), axle (its length and the tray\'s width: the width and 36) and legs, mm. Its tray stays and bolts not made yet. It offers barrow axle/axis (the wheel turns on it), the tray\'s cavity for a load', ['everyday', 'vehicles', 'mechanical'], 'A wheelbarrow: handles, a wheel on its axle, a tray, two legs', 'wb');
}

// ---- a tube mast --------------------------------------------------------------------------------------------------------
function mast(): void {
  // (a sectioned tube mast, as aerial and weather-station masts are put up: a 300 × 300 × 10 steel base plate with four M12
  // holes, three sections of CHS 48.3 × 3.2 (the scaffold and aerial-pole tube) each with a joining sleeve over its top, a
  // top plate and three guy lugs on it (10 mm steel, a Ø14 hole each for a shackle, typical). The guy wires and their ground anchors are not
  // drawn: a straight line at a slant is not made by the operations yet)
  const s = new Fold('A mast');
  s.set('section', 'number', 2000, 'each section\'s length, mm', 'tube.length');
  s.set('base', 'number', 300, 'the base plate\'s side, mm', 'bp.w; bp.d');
  s.n('piece.plate', { name: 'mast base', mat: 'steel-low', w: 300, t: 10, d: 300, holes: '-120,-120; 120,-120; -120,120; 120,120', hole: 13 }, 'The base plate, four M12 holes', 'bp');
  s.n('piece.hollowsection', { size: 'CHS 48.3x3.2', length: 2000 }, 'A section, CHS 48.3 × 3.2', 'tube');
  s.n('room.make', { name: 'mast sleeve', shape: 'tube', mat: 'steel-low', a: 24.15, b: 30, c: 150 }, 'A joining sleeve', 'sl');
  s.op('sec', 'room.over', { line: 'CHS 48.3x3.2/axis', where: 'hi', fit: 'touch' }, 'The sleeve over the section\'s top', { host: 'tube', sleeve: 'sl' });
  s.n('room.make', { name: 'mast top', shape: 'box', mat: 'steel-low', a: 200, b: 10, c: 200 }, 'The top plate', 'tp');
  s.n('room.make', { name: 'guy lug', shape: 'box', mat: 'steel-low', a: 40, b: 50, c: 10, points: '0,10', face: '+z', hole: 7 }, 'A guy lug, a Ø14 hole for a shackle\'s pin', 'eye');
  s.op('eyes', 'room.ring', { name: 'guy lugs', n: 3, R: 70, fit: 'clear', out: 'yes' }, 'Three of them, a third of a turn apart, facing out', { block: 'eye' });
  s.op('top', 'room.stack', { name: 'mast head', axis: 'y', fit: 'touch', order: 'tp,eyes' }, 'The eye bolts on the top plate', { blocks: ['tp', 'eyes'] });
  s.op('ms', 'room.stack', { name: 'mast', axis: 'y', fit: 'touch', order: 'bp,sec,sec,sec,top' }, 'Base, three sections, the head', { blocks: ['bp', 'sec', 'sec', 'sec', 'top'] });
  s.save('seed.mast', 'Mast (tube, for guys)', 'A sectioned tube mast (as aerial and weather-station masts are put up): a 300 × 300 × 10 steel base plate with four M12 holes, three sections of CHS 48.3 × 3.2 each with a joining sleeve over its top, and a top plate with three guy lugs (a Ø14 hole each for a guy\'s shackle). The guy wires and their ground anchors are not drawn (a straight line at a slant is not made by the operations yet). Its settings: section (each section\'s length) and base (the base plate\'s side), mm. It offers mast base/holes (to bolt it down), guy lug/holes (a guy\'s shackle), the top plate (Onto a face, +y) for an aerial', ['structural', 'everyday'], 'A mast: base plate, three tube sections, a head with guy eyes', 'ms');
}

// ---- a solar panel ------------------------------------------------------------------------------------------------------
function solarPanel(): void {
  // (a 60-cell crystalline module, its sizes typical of the 60-cell modules sold: 1650 × 992 mm, its frame 35 deep; sixty
  // 156.75 mm (M2) cells, 0.2 mm thick, in six strings of ten with a 1 mm gap; a 3.2 mm glass front and a backsheet; the
  // laminate in an aluminium frame (6063, its rails drawn as solid bars, approximated). Its ribbons and junction box not
  // drawn)
  const s = new Fold('A solar panel');
  s.set('cell', 'number', 156.75, 'each cell\'s side, mm (M2 156.75; G1 158.75)', 'cell.a; cell.c');
  s.set('glass', 'number', 951, 'the glass\'s and the backsheet\'s width, mm (six cells and their gaps)', 'gl.a; bk.a');
  s.set('long', 'number', 1577, 'the glass\'s and the backsheet\'s length, mm (ten cells and their gaps)', 'gl.c; bk.c');
  s.n('room.make', { name: 'solar cell', shape: 'box', mat: 'silicon', a: 156.75, b: 0.2, c: 156.75 }, 'A cell, M2 156.75', 'cell');
  const ten = Array.from({ length: 10 }, () => 'cell'), six = Array.from({ length: 6 }, () => 'str');
  s.op('str', 'room.stack', { name: 'cell string', axis: 'z', fit: 'clear', order: ten.join(',') }, 'A string of ten', { blocks: ten });
  s.op('cells', 'room.stack', { name: 'cells', axis: 'x', fit: 'clear', order: six.join(',') }, 'Six strings', { blocks: six });
  s.n('room.make', { name: 'module glass', shape: 'box', mat: 'glass', a: 951, b: 3.2, c: 1577 }, 'The glass, 3.2 mm', 'gl');
  s.n('room.make', { name: 'backsheet', shape: 'box', mat: 'pet', a: 951, b: 0.4, c: 1577 }, 'The backsheet (PET, 0.4 mm)', 'bk');
  s.op('lam', 'room.stack', { name: 'laminate', axis: 'y', fit: 'touch', order: 'bk,cells,gl' }, 'The cells between the backsheet and the glass', { blocks: ['bk', 'cells', 'gl'] });
  s.n('room.make', { name: 'frame end', shape: 'box', mat: 'al-6063', a: 951, b: 35, c: 18 }, 'A frame end, aluminium', 'fe');
  s.op('lz', 'room.stack', { name: 'framed laminate', axis: 'z', fit: 'touch', order: 'fe,lam,fe' }, 'A frame end at each end', { blocks: ['fe', 'lam', 'fe'] });
  s.n('room.make', { name: 'frame side', shape: 'box', mat: 'al-6063', a: 18, b: 35, c: 1613 }, 'A frame side, aluminium', 'fs');
  s.op('pv', 'room.stack', { name: 'solar panel', axis: 'x', fit: 'touch', order: 'fs,lz,fs' }, 'A frame side each side', { blocks: ['fs', 'lz', 'fs'] });
  s.save('seed.solar-panel', 'Solar panel (60-cell module)', 'A 60-cell crystalline module (sizes typical of the 60-cell modules sold: about 1650 × 990 × 35): sixty 156.75 mm cells, 0.2 mm thick, in six strings of ten, between a PET backsheet and 3.2 mm glass, in an aluminium frame (its rails drawn as solid bars). Its ribbons, junction box and cables not drawn. Its settings: cell (each cell\'s side), glass and long (the glass\'s and the backsheet\'s width and length, mm). It offers its glass face (Onto a face, +y) and its frame\'s back (-y) for rails and clamps', ['electrical', 'structural', 'everyday'], 'A solar panel: sixty cells under glass in a frame', 'pv');
}

// ---- a satellite dish ---------------------------------------------------------------------------------------------------
function satelliteDish(): void {
  // (a prime-focus dish, its sizes typical: a 600 mm paraboloid of 1.5 mm aluminium (f/D 0.4, so 240 focus, 94 deep),
  // turned with its mounting boss under and its feed hub in the middle; a feed rod up the axis to the LNB at the focus; on
  // a Ø48.3 pole (CHS 48.3 × 3.2) standing on a wall plate)
  const s = new Fold('A satellite dish');
  s.set('pole', 'number', 600, 'the pole\'s length, mm', 'pole.length');
  s.set('feed', 'number', 120, 'the feed rod\'s length, mm (the LNB at about the focus, 240 above the dish\'s vertex)', 'rod.b');
  const par = [0, 50, 100, 150, 200, 250, 300].map((r) => [r, Math.round((r * r) / 960 * 10) / 10] as const); // y = r²/4f, f 240
  const outer = par.filter(([r]) => r >= 50).map(([r, y]) => `${r},${y}`), inner = par.filter(([r]) => r >= 50).reverse().map(([r, y]) => `${r},${(y + 1.5).toFixed(1)}`);
  const rim = (par[6]![1] + 1.5).toFixed(1), pts = ['0,-10', '40,-10', ...outer, ...inner, '20,4', `20,${rim}`, `0,${rim}`].join('; ');
  s.n('room.make', { name: 'dish reflector', shape: 'lathe', mat: 'al-5052', pts }, 'The reflector, Ø600', 'dish');
  s.n('room.make', { name: 'feed rod', shape: 'rod', mat: 'al-6061', a: 6, b: 120 }, 'The feed rod, Ø12', 'rod');
  s.n('room.make', { name: 'LNB', shape: 'box', mat: 'abs', a: 60, b: 80, c: 60 }, 'The LNB (typical envelope)', 'lnb');
  s.n('piece.hollowsection', { size: 'CHS 48.3x3.2', length: 600 }, 'The pole, CHS 48.3 × 3.2', 'pole');
  s.n('piece.plate', { name: 'wall plate', mat: 'steel-low', w: 150, t: 6, d: 150, holes: '-55,-55; 55,-55; -55,55; 55,55', hole: 9 }, 'The wall plate, four M8 holes', 'wp');
  s.op('sd', 'room.stack', { name: 'satellite dish', axis: 'y', fit: 'touch', order: 'wp,pole,dish,rod,lnb' }, 'Plate, pole, dish, feed rod, LNB', { blocks: ['wp', 'pole', 'dish', 'rod', 'lnb'] });
  s.save('seed.satellite-dish', 'Satellite dish', 'A prime-focus satellite dish (sizes typical): a Ø600 paraboloid reflector of 1.5 mm aluminium (f/D 0.4: its focus 240 above its vertex, 94 deep), its mounting boss under and feed hub in its middle, a feed rod up its axis to the LNB at about the focus, on a Ø48.3 pole (CHS 48.3 × 3.2) standing on a wall plate with four M8 holes; pointing straight up (its tilt and its clamp not made yet: a tilted piece laid on another makes no face). Its settings: pole and feed (their lengths), mm. It offers wall plate/holes (to bolt it up), CHS 48.3x3.2/axis (the pole), the LNB\'s top', ['electrical', 'everyday'], 'A satellite dish: reflector, feed and LNB on a pole', 'sd');
}

let made = false;
export function makeEveryday(): void {
  if (made) return; made = true;
  chair(); desk(); bedFrame(); door(); windowFrame(); studWall(); fence(); kart(); trailer(); wheelbarrow(); mast(); solarPanel(); satelliteDish();
}
makeEveryday();
