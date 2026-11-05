// Seeds: things built out of nodes, each folded into one node and kept in the library for good, so the next thing is
// built from it. What is left is what places nothing by hand: a coil spring made from its wire and coils and put under
// its load; a small DC motor put together by the operations, a few of its inner settings its own (decision 0026, step 3). The seeds that placed things by number (a window, a door, the rooms, a house, a car, the roads, a city, a
// model from a picture) were deleted with the old builds (decision 0021, the user: "get rid of the old builds"); what is
// built now is put together by the operations of room.ts. This file also loads the library's other modules.

import { register, type BlockDef, type Type } from './blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from './dataflow';
import type { Board } from './boards';
import { SPRING_WIRES } from '../engineering/springs';
import './genai';
import './compiler';
import './fea';
import './agent';
import './controls';

/** A board being built, a node at a time, and saved as a seed. */
class Seed {
  readonly b: Board; private k = 0;
  constructor(title: string) { this.b = emptyBoard(title); }
  /** A node of a block, with its settings; and a label to read it by. */
  n(blockId: string, set: Record<string, unknown> = {}, label?: string, id = `n${this.k++}`): string { placeBlock(this.b, blockId, 0, 0, set, id); if (label) this.b.nodes[id]!.label = label; return id; }
  /** One of the seed's inputs: its name, type, value when not given, and the choices it may be picked from; `into`, the
   *  inner settings it sets ("node.setting; node.setting"), where it sets settings rather than feeding a wire (NC5). */
  input(name: string, type: Type, def: unknown, says: string, choices?: string[], unit = '', into = ''): string { return this.n('group.in', { name, type, unit, default: String(def), choices: (choices ?? []).join('|'), says, ...(into ? { into } : {}) }, `in: ${name}`); }
  output(name: string, type: Type, from: string, port: string, unit = ''): void { const id = this.n('group.out', { name, type, unit }, `out: ${name}`); this.w(from, port, id, 'value'); }
  w(from: string, out: string, to: string, inp: string): void { wire(this.b, from, out, to, inp); }
  /** A formula over named wires: { name: [node, port] }. */
  f(expr: string, ins: Record<string, [string, string]>, label?: string): string { const id = this.n('math.expr', { expr }, label ?? expr); for (const [k, [from, port]] of Object.entries(ins)) this.w(from, port, id, k); return id; }
  /** Things as one, each where it is. */
  all(name: string, things: [string, string][]): string { const id = this.n('combine', { name }, name); for (const [n, p] of things) this.w(n, p, id, 'things'); return id; }
  /** Saved to the library under its id: laid out to be read, its inputs and outputs its own. */
  save(id: string, name: string, says: string, domains: string[], spec?: BlockDef['spec']): BlockDef {
    layOut(this.b);
    const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', ...(spec ? { spec } : {}) });
    register(d); return d;
  }
}
/** Columns by how far each node is from where its values start, so a seed opened reads left to right. */
function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}

// ---- a window, a door --------------------------------------------------------------------------------------------------
function springChecked(): void {
  // (a coil spring made from its wire and coils and put straight under its load: what it weighs, how stiff it is, and its
  // least factor of safety (wire stress, room left before its coils touch), one node to size or trade off springs by)
  const s = new Seed('Coil spring, made and loaded');
  const d = s.input('d', 'number', 0.003, 'wire diameter, m', undefined, 'm'), D = s.input('D', 'number', 0.024, 'mean coil diameter, m', undefined, 'm'), n = s.input('n', 'number', 5, 'active coils'), L = s.input('L', 'number', 0.04, 'length as fitted, m', undefined, 'm'), st = s.input('stroke', 'number', 0.008, 'compressed further by, m', undefined, 'm');
  const coil = s.n('make.coil', {}, 'the spring, made'); s.w(d, 'value', coil, 'd'); s.w(D, 'value', coil, 'D'); s.w(n, 'value', coil, 'n'); s.w(L, 'value', coil, 'L');
  const wire = s.input('wire', 'text', 'chrome-silicon-a401', 'its wire (ASTM grade, Shigley tables 10-4 to 10-6)', Object.keys(SPRING_WIRES));
  const load = s.n('load.spring', {}, 'under its load'); s.w(coil, 'spring', load, 'spring'); s.w(st, 'value', load, 'stroke'); s.w(wire, 'value', load, 'wire'); s.w(wire, 'value', coil, 'wire');
  s.output('spring', 'part', coil, 'spring'); s.output('mass', 'number', coil, 'mass', 'kg'); s.output('rate', 'number', coil, 'rate', 'N/m'); s.output('worst', 'number', load, 'worst'); s.output('checks', 'table', load, 'rows');
  s.save('seed.spring-checked', 'Coil spring, made and loaded', 'A helical compression spring made from its wire and coils (the coil maker) and put under its working stroke (Spring under load): its mass, its rate, and its least factor of safety, wire stress and coil bind among them. Folded so a fit, a trade-off or a sensitivity can move its wire and coils as one', ['mechanical'],
    { gloss: 'What does a coil spring of this wire and these coils weigh, how stiff is it, and does it hold its stroke?', discipline: 'mechanical.design', role: 'analysis', codes: [{ scheme: 'MSC2020', code: '74K10', label: 'Rods (beams, columns, shafts, arches, rings, etc.)' }],
      model: { equations: ['k = G d⁴ / (8 D³ n)', 'τ = K_B 8 F D / (π d³), K_B = (4C + 2) / (4C − 3), C = D / d'], class: 'analytical', time: 'steady', linear: false, method: 'the coil maker and Spring under load, folded', references: ['Shigley\'s Mechanical Engineering Design, 10th ed., ch. 10 (eqs. 10-5, 10-9)'] } });
}

// ---- a small DC motor ---------------------------------------------------------------------------------------------------
function motorDC(): void {
  // (the small DC motor (a 20 mm can, its sizes typical), every piece made and put together by the operations: the rotor's
  // core with its coil slid over it in two layers, its commutator stacked under it, a ring of magnets slid over the rotor
  // with an air gap, the can made round all of it; then the shaft passed along the can's axis (the can's ends and the core
  // bored for it as it passes) and two terminal tabs against its foot. Its ids are the board's own (a Stack lists its wires
  // by their sources' ids: 'comm' before 'wound', the commutator under the core). Three of its settings are its own: the
  // magnets' outer radius (the can is made round them), the rotor's length (the can's follows) and the shaft's length.
  // It offers the can with all inside (a build that passes a shaft of its own through more than the can) and the motor
  // with its shaft and tabs, its lines 'motor can/axis' and 'shaft/axis')
  const s = new Seed('A small DC motor');
  s.input('R', 'number', 10.5, 'the magnet ring\'s outer radius, mm: the can (0.5 mm wall) is made round it', undefined, '', 'mag.b');
  s.input('L', 'number', 12, 'the rotor core\'s and the magnets\' length, mm: the can\'s follows', undefined, '', 'core.c; mag.c');
  s.input('shaft', 'number', 30, 'the shaft\'s length, mm', undefined, '', 'shaft.b');
  s.n('room.make', { name: 'rotor core', shape: 'tube', mat: 'steel-low', a: 1, b: 6.5, c: 12 }, 'Rotor core (laminated steel)', 'core');
  s.n('piece.coil', { R: 6.75, wire: 0.5, turns: 23, layers: 2 }, 'Its coil, 23 turns in two layers', 'coil');
  s.n('room.over', { line: 'rotor core/axis', where: 'mid', fit: 'touch' }, 'The coil wound over the core', 'wound'); s.w('core', 'block', 'wound', 'host'); s.w('coil', 'block', 'wound', 'sleeve');
  s.n('room.make', { name: 'commutator', shape: 'tube', mat: 'copper', a: 1, b: 2.5, c: 3 }, 'Commutator (copper)', 'comm');
  s.n('room.stack', { name: 'rotor', axis: 'y', fit: 'touch' }, 'The rotor: commutator under the wound core', 'rotor'); s.w('comm', 'block', 'rotor', 'blocks'); s.w('wound', 'block', 'rotor', 'blocks');
  s.n('room.make', { name: 'magnet ring', shape: 'tube', mat: 'ndfeb', a: 9, b: 10.5, c: 12 }, 'Magnet ring (NdFeB)', 'mag');
  s.n('room.over', { line: 'rotor core/axis', where: 'mid', fit: 'clear' }, 'Magnets round the rotor, an air gap', 'field'); s.w('rotor', 'block', 'field', 'host'); s.w('mag', 'block', 'field', 'sleeve');
  s.n('room.around', { name: 'motor can', mat: 'steel-low', wall: 0.5, ends: 1, fit: 'clear', open: 'no' }, 'The can, made round all of it', 'can'); s.w('field', 'block', 'can', 'child');
  s.n('room.make', { name: 'shaft', shape: 'rod', mat: 'steel-alloy', a: 1, b: 30 }, 'Shaft, 2 mm', 'shaft');
  s.n('room.through', { line: 'motor can/axis', which: 0, from: 'below', fit: 'slide' }, 'The shaft along its axis', 'shafted'); s.w('can', 'block', 'shafted', 'host'); s.w('shaft', 'block', 'shafted', 'passer');
  s.n('room.make', { name: 'terminal tab', shape: 'box', mat: 'brass', a: 2, b: 4, c: 0.4 }, 'Terminal tab (brass)', 'tab');
  s.n('room.ring', { name: 'terminals', n: 2, R: 5, fit: 'clear' }, 'Two of them', 'tabs'); s.w('tab', 'block', 'tabs', 'block');
  s.n('room.onto', { face: '-y', fit: 'touch' }, 'Against its foot', 'motor'); s.w('shafted', 'block', 'motor', 'host'); s.w('tabs', 'block', 'motor', 'child');
  s.output('can', 'block', 'can', 'block'); s.output('motor', 'block', 'motor', 'block'); s.output('thing', 'assembly', 'motor', 'thing'); s.output('says', 'text', 'motor', 'says');
  s.save('seed.motor-dc', 'Small DC motor', 'A small brushed DC motor put together by the operations (sizes typical of a 20 mm can): its wound rotor and commutator, a ring of magnets round them, the can made round all, the shaft along its axis and two terminal tabs at its foot. Its settings: the magnets\' outer radius R (the can is made round them), the rotor\'s length L (the can\'s follows) and the shaft\'s length, in mm. It gives the can with all inside (its line motor can/axis, for a shaft of the build\'s own) and the motor with its shaft and tabs (shaft/axis)', ['mechanical', 'electrical'],
    { gloss: 'A small DC motor, its can and its shaft, as one node of a few settings', discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] });
}

// ---- a pack of two cells -----------------------------------------------------------------------------------------------
function packOfTwo(): void {
  // (two cells side by side into a hollow box, its lid on, and the pack laid flat: the battery of the robot base and of the
  // quadcopter. Its settings: the cell (by its size), the box's width, height and depth, and its walls (the box's walls,
  // its floor and its lid one thickness), in mm. The box is refused if the cells do not fit its cavity)
  const s = new Seed('A pack of two cells');
  s.input('cell', 'text', '18650', 'the cell, by its size', undefined, '', 'cell.size');
  s.input('w', 'number', 45, 'the box\'s width, mm', undefined, '', 'box.w'); s.input('h', 'number', 70, 'the box\'s height, mm', undefined, '', 'box.h'); s.input('d', 'number', 25, 'the box\'s depth, mm', undefined, '', 'box.d');
  s.input('wall', 'number', 2, 'its walls, floor and lid, mm', undefined, '', 'box.wall; box.floor; pack.t');
  s.n('piece.cell', { size: '18650' }, 'A cell (one made, used twice)', 'cell');
  s.n('room.stack', { name: 'two cells', axis: 'x', fit: 'clear' }, 'Two side by side', 'cells'); s.w('cell', 'block', 'cells', 'blocks'); s.w('cell', 'block', 'cells', 'blocks');
  s.n('piece.case', { name: 'battery box', mat: 'abs', w: 45, h: 70, d: 25, wall: 2, floor: 2 }, 'Battery box (ABS)', 'box');
  s.n('room.into', { room: 'battery box/cavity', fit: 'clear' }, 'The cells into the box', 'boxed'); s.w('box', 'block', 'boxed', 'host'); s.w('cells', 'block', 'boxed', 'child');
  s.n('mate.lid', { t: 2, mat: 'abs' }, 'Its lid on', 'pack'); s.w('boxed', 'block', 'pack', 'box');
  s.n('room.turn', { axis: 'x', degrees: 90 }, 'Laid flat', 'flat'); s.w('pack', 'block', 'flat', 'block');
  s.output('pack', 'block', 'pack', 'block'); s.output('flat', 'block', 'flat', 'block'); s.output('thing', 'assembly', 'flat', 'thing');
  s.save('seed.pack-two', 'Pack of two cells', 'Two cells side by side in a hollow ABS box, its lid on: the pack upright, and laid flat. Its settings: the cell by its size, the box\'s width, height and depth and its walls (walls, floor and lid), in mm; refused if the cells do not fit its cavity', ['electrical', 'mechanical'],
    { gloss: 'Two cells boxed with a lid, as one node of a few settings', discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] });
}

/** Every seed, in the order each needs the ones before it. */
let made = false;
export function makeSeeds(): void {
  if (made) return; made = true;
  springChecked();
  motorDC();
  packOfTwo();
}
makeSeeds();
