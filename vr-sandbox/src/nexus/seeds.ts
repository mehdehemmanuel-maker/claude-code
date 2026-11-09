// Seeds: things built out of nodes, each folded into one node and kept in the library for good, so the next thing is
// built from it. What is left is what places nothing by hand: a coil spring made from its wire and coils and put under
// its load; a small DC motor put together by the operations, a few of its inner settings its own (decision 0026, step 3). The seeds that placed things by number (a window, a door, the rooms, a house, a car, the roads, a city, a
// model from a picture) were deleted with the old builds (decision 0021, the user: "get rid of the old builds"); what is
// built now is put together by the operations of room.ts. This file also loads the library's other modules.

import { Seed } from './assemblies/board';
import { SPRING_WIRES } from '../engineering/springs';
import './genai';
import './compiler';
import './fea';
import './agent';
import './controls';
import './assemblies/robots';
import './assemblies/machines';
import './assemblies/things';
import './assemblies/everyday';
import './assemblies/vehicles';
import './assemblies/robots2';

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
  // bored for it as it passes), an end bell against its foot and two terminal tabs against the bell. Its ids are the board's own (a Stack lists its wires
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
  s.n('room.make', { name: 'end bell', shape: 'rod', mat: 'nylon', a: 9, b: 3 }, 'End bell (nylon), 18 mm across, 3 mm (typical)', 'bell');
  s.n('room.onto', { face: '-y', fit: 'touch' }, 'The end bell against its foot', 'belled'); s.w('shafted', 'block', 'belled', 'host'); s.w('bell', 'block', 'belled', 'child');
  s.n('room.onto', { face: '-y', fit: 'touch' }, 'Against its end bell', 'motor'); s.w('belled', 'block', 'motor', 'host'); s.w('tabs', 'block', 'motor', 'child');
  s.output('can', 'block', 'can', 'block'); s.output('motor', 'block', 'motor', 'block'); s.output('thing', 'assembly', 'motor', 'thing'); s.output('says', 'text', 'motor', 'says');
  s.save('seed.motor-dc', 'Small DC motor', 'A small brushed DC motor put together by the operations (sizes typical of a 20 mm can): its wound rotor and commutator, a ring of magnets round them, the can made round all, the shaft along its axis, a nylon end bell at its foot and two terminal tabs out of the bell. Its settings: the magnets\' outer radius R (the can is made round them), the rotor\'s length L (the can\'s follows) and the shaft\'s length, in mm. It gives the can with all inside (its line motor can/axis, for a shaft of the build\'s own) and the motor with its shaft and tabs (shaft/axis)', ['mechanical', 'electrical'],
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

// ---- what the AI's builds repeat (decision 0026, step 4: the bootstrap) -------------------------------------------------
// (counted over the 80 plans of the forty build requests, before and after step 3, settings aside: joints chained on one
// line of holes (mate.bolted or mate.plate, held into held) in 13, two or four of them; a box with what goes into it and
// its lid in 8 and three starter boards; copies passed through a plate's holes (standoffs) in 3, of 6 chained throughs.
// Each folded into one block of the settings that matter, its inputs the blocks it works on)

/** Bolted at n holes of one line: n bolted joints in a chain, the first on the first hole. */
function boltedAt(n: 2 | 4): void {
  const s = new Seed(`Bolted at ${n} holes`), js = Array.from({ length: n }, (_, k) => `j${k}`), all = (key: string) => js.map((j) => `${j}.${key}`).join('; ');
  const held = s.input('held', 'block', '', 'what it holds (plates stacked, a part on a plate)');
  s.input('line', 'text', 'top plate/holes', 'the holes (a port, as "top plate/holes"): the first ' + n + ' of them', undefined, '', all('line'));
  s.input('size', 'text', 'M6', 'the bolts\' size', undefined, '', all('size'));
  s.input('head', 'text', 'hex', 'their heads', undefined, '', all('head'));
  js.forEach((j, k) => { s.n('mate.bolted', { line: 'top plate/holes', which: k, size: 'M6', head: 'hex' }, k ? `And hole ${k}` : 'Bolted through the first hole', j); s.w(k ? js[k - 1]! : held, k ? 'block' : 'value', j, 'held'); });
  const last = js[n - 1]!;
  s.output('block', 'block', last, 'block'); s.output('thing', 'assembly', last, 'thing'); s.output('says', 'text', last, 'says');
  s.save(n === 2 ? 'seed.bolted-two' : 'seed.bolted-four', `Bolted at ${n} holes`, `What it holds bolted through the first ${n} holes of one line (plates stacked: "top plate/holes"), a bolt down each from above, its head on top, a washer and nut below: ${n} bolted joints in a chain as one node. Its settings: the line, the bolts' size and their heads. It gives the block bolted, for the next operation`, ['mechanical', 'manufacturing'],
    { gloss: `Plates bolted at ${n} holes, as one node`, discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] });
}

/** What goes into a hollow box, and its lid on. */
function boxed(): void {
  const s = new Seed('Into a box, its lid on');
  const inside = s.input('inside', 'block', '', 'what goes into the box (cells stacked, a board, a switch)');
  s.input('name', 'text', 'box', 'the box\'s name (its cavity is "<name>/cavity")', undefined, '', 'box.name');
  s.input('mat', 'text', 'abs', 'box and lid, their material', undefined, '', 'box.mat; lid.mat');
  s.input('w', 'number', 100, 'the box\'s width, mm', undefined, '', 'box.w'); s.input('h', 'number', 40, 'its height, mm', undefined, '', 'box.h'); s.input('d', 'number', 60, 'its depth, mm', undefined, '', 'box.d');
  s.input('wall', 'number', 2, 'its walls, floor and lid, mm', undefined, '', 'box.wall; box.floor; lid.t');
  s.input('fit', 'text', 'clear', 'what goes in, its fit', undefined, '', 'boxed.fit');
  s.n('piece.case', { name: 'box', mat: 'abs', w: 100, h: 40, d: 60, wall: 2, floor: 2 }, 'The box', 'box');
  s.n('room.into', { fit: 'clear' }, 'What goes in, into its cavity', 'boxed'); s.w('box', 'block', 'boxed', 'host'); s.w(inside, 'value', 'boxed', 'child');
  s.n('mate.lid', { t: 2, mat: 'abs' }, 'Its lid on', 'lid'); s.w('boxed', 'block', 'lid', 'box');
  s.output('block', 'block', 'lid', 'block'); s.output('open', 'block', 'boxed', 'block'); s.output('thing', 'assembly', 'lid', 'thing'); s.output('says', 'text', 'lid', 'says');
  s.save('seed.boxed', 'Into a box, its lid on', 'What goes in (cells side by side, a board, a switch and a fuse stacked) into a hollow box\'s cavity, and a lid made for it on top: a box, Into a room and Close with a lid as one node. Its settings: the box\'s name, material, width, height, depth and walls (walls, floor and lid), in mm, and the fit; refused with both sizes if what goes in does not fit. It gives the box closed, and the box open (filled, its lid not on)', ['mechanical', 'electrical', 'everyday'],
    { gloss: 'A box filled and closed, as one node', discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] });
}

/** A board on four standoffs on a plate: one standoff made, passed down the plate's four holes, the board on top. */
function onStandoffs(): void {
  const s = new Seed('On four standoffs on a plate');
  const board = s.input('board', 'block', '', 'what stands on the standoffs (a dev board, a PCB)');
  s.input('w', 'number', 80, 'the plate\'s width, mm', undefined, '', 'plate.w'); s.input('d', 'number', 60, 'its depth, mm', undefined, '', 'plate.d'); s.input('t', 'number', 3, 'its thickness, mm', undefined, '', 'plate.t');
  s.input('mat', 'text', 'acrylic', 'its material', undefined, '', 'plate.mat');
  s.input('holes', 'text', '-25,-15; 25,-15; -25,15; 25,15', 'its four holes\' centres, mm from its middle across and deep ("x,z; ...")', undefined, '', 'plate.holes');
  s.input('length', 'number', 10, 'the standoffs\' length, mm', undefined, '', 'so.length');
  s.n('piece.plate', { name: 'standoff plate', mat: 'acrylic', w: 80, t: 3, d: 60, holes: '-25,-15; 25,-15; -25,15; 25,15', hole: 3.2 }, 'The plate, four M3 clearance holes', 'plate');
  s.n('piece.standoff', { length: 10 }, 'A standoff (one made, used four times)', 'so');
  ['t0', 't1', 't2', 't3'].forEach((t, k) => { s.n('room.through', { line: 'standoff plate/holes', which: k }, `A standoff down hole ${k}`, t); s.w(k ? `t${k - 1}` : 'plate', 'block', t, 'host'); s.w('so', 'block', t, 'passer'); });
  s.n('room.onto', { face: '+y', fit: 'touch' }, 'The board on top', 'seat'); s.w('t3', 'block', 'seat', 'host'); s.w(board, 'value', 'seat', 'child');
  s.output('block', 'block', 'seat', 'block'); s.output('plate', 'block', 't3', 'block'); s.output('thing', 'assembly', 'seat', 'thing'); s.output('says', 'text', 'seat', 'says');
  s.save('seed.standoffs', 'On four standoffs on a plate', 'A board held off a plate on four M3 standoffs: the plate ("standoff plate") with four clearance holes, a standoff down each, the board on top. Its settings: the plate\'s width, depth, thickness and material, its four holes\' centres, and the standoffs\' length, in mm. It gives the board on its standoffs, and the plate with its standoffs alone (plate)', ['electrical', 'mechanical'],
    { gloss: 'A board on four standoffs on a plate, as one node', discipline: 'mechanical.design.cad', role: 'geometry operation', codes: [{ scheme: 'MSC2020', code: '68U07', label: 'Computer science aspects of computer-aided design' }] });
}

/** Every seed, in the order each needs the ones before it. */
let made = false;
export function makeSeeds(): void {
  if (made) return; made = true;
  springChecked();
  motorDC();
  packOfTwo();
  boltedAt(2); boltedAt(4);
  boxed();
  onStandoffs();
}
makeSeeds();
