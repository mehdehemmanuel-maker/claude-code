// Machine assemblies (decision 0027): the things people ask for by name (a linear axis, an XY gantry, a conveyor, a car's
// chassis, a crane, a table, a shelf, a lamp arm, a pump loop), each a board of piece.* nodes and room operations folded
// into one block of the settings that matter, so a request starts from the machine and not from a plate and a rod. Every
// place is given by the operations (no at, no rot); every size is a real part's row (its family's source) or labelled
// typical. Each says what it offers next: a mount's face and holes, a shaft line, a carriage's plate.

import { Fold } from './board';
import { wire } from '../dataflow';

// ---- a linear axis ------------------------------------------------------------------------------------------------------
function linearAxis(): void {
  // (a lead-screw linear axis as a 3D printer's Z axis is built: a NEMA 17 stepper (its frame by BOSL2's NEMA table, as
  // piece.stepper gives it), a rigid 5 × 8 coupler over its shaft, a T8 lead screw (lead 8) on the coupler, its brass nut
  // over the screw, and a carriage plate (aluminium, typical) over the screw above the nut on two Ø8 guide rods with an
  // LM8UU bushing each; the rods stand on a base plate the stepper hangs under)
  const s = new Fold('A linear axis');
  s.set('travel', 'number', 300, 'the screw\'s and the rods\' length, mm', 'ls.length; rod.length');
  s.set('stepper', 'text', '17', 'the stepper\'s NEMA frame (14 and 17 have a 5 mm shaft)', 'mot.size', ['14', '17']);
  s.n('piece.stepper', { size: '17', length: 40 }, 'NEMA 17 stepper, 40 mm body', 'mot');
  s.n('piece.coupler', { size: 'rigid 5×8' }, 'Rigid coupler, 5 to 8 mm', 'cp');
  s.op('drv0', 'room.over', { line: 'shaft/axis', where: 'hi', fit: 'touch' }, 'The coupler over the motor\'s shaft', { host: 'mot', sleeve: 'cp' });
  s.n('piece.plate', { name: 'carriage mount', mat: 'al-6061', w: 110, t: 8, d: 40, holes: '0,0; -40,0; 40,0', hole: 15 }, 'The carriage plate (aluminium, typical): its nut and two bushing holes', 'cpl');
  s.n('piece.leadnut', { size: 'T8' }, 'T8 brass lead nut', 'nut');
  s.op('c1', 'room.through', { line: 'carriage mount/holes', which: 0, from: 'below', fit: 'touch' }, 'Its nut in the middle hole', { host: 'cpl', passer: 'nut' });
  s.n('piece.lmuu', { size: 'LM8UU' }, 'LM8UU linear bushing', 'lm');
  s.op('c2', 'room.through', { line: 'carriage mount/holes', which: 1, from: 'below', fit: 'touch' }, 'A bushing in the left hole', { host: 'c1', passer: 'lm' });
  s.op('c3', 'room.through', { line: 'carriage mount/holes', which: 2, from: 'below', fit: 'touch' }, 'And the right', { host: 'c2', passer: 'lm' });
  s.n('piece.leadscrew', { size: 'T8 lead 8', length: 300 }, 'T8 lead screw, lead 8', 'ls');
  s.op('c4', 'room.through', { line: 'carriage mount/holes', which: 0, from: 'below', fit: 'slide' }, 'The screw up through its nut', { host: 'c3', passer: 'ls' });
  s.n('piece.shaft', { size: '8', length: 300 }, 'Ø8 guide rod (h6)', 'rod');
  s.op('c5', 'room.through', { line: 'carriage mount/holes', which: 1, from: 'below', fit: 'slide' }, 'A guide rod up the left bushing', { host: 'c4', passer: 'rod' });
  s.op('c6', 'room.through', { line: 'carriage mount/holes', which: 2, from: 'below', fit: 'slide' }, 'And the right', { host: 'c5', passer: 'rod' });
  s.n('piece.plate', { name: 'axis top mount', mat: 'al-6061', w: 110, t: 8, d: 40, holes: '-45,-12; 45,-12; -45,12; 45,12', hole: 5.5 }, 'The top plate (aluminium, typical) on the rods\' and the screw\'s ends, four M5 holes to mount it by', 'top');
  s.op('c7', 'room.onto', { face: '+y', fit: 'touch' }, 'On their tops', { host: 'c6', child: 'top' });
  s.op('ax', 'room.stack', { name: 'linear axis', axis: 'y', fit: 'touch', order: 'drv0,c7' }, 'The carriage at home on the motor\'s coupler', { blocks: ['drv0', 'c7'] });
  return void s.save('seed.linear-axis', 'Linear axis (lead screw)', 'A lead-screw linear axis standing up (a 3D printer\'s Z axis): a NEMA 17 (or 14) stepper, a rigid 5 × 8 coupler on its shaft, a T8 lead screw on the coupler, the carriage (an aluminium plate with the screw\'s brass nut and two LM8UU bushings in it) at home at the bottom, two Ø8 guide rods up the bushings and a top plate on their ends. Its settings: travel (the screw\'s and the rods\' length) and the stepper\'s frame, mm. It offers carriage mount/holes (the carriage\'s nut and bushing holes), axis top mount/holes (four M5 holes to bolt it up by), T8 lead 8 lead screw/axis and NEMA 17 body/holes', ['mechanical'], 'A linear axis: stepper, coupler, lead screw, carriage on two guide rods', 'ax');
}

// ---- an XY gantry ------------------------------------------------------------------------------------------------------
function xyGantry(): void {
  // (two linear axes crossed on a frame of 2020 T-slot extrusion (Misumi HFS5 as piece.extrusion gives it): the Y axis laid
  // along z between two frame rails, the X axis laid along x across the top of all three, a cross rail under each end)
  const s = new Fold('An XY gantry');
  // (the two axes' travel goes in along a wire: a folded block's settings are its inputs, not settings to bind)
  s.n('group.in', { name: 'x', type: 'number', unit: '', default: '300', choices: '', says: 'the X axis\'s travel, mm' }, 'in: x', 'inx');
  s.n('group.in', { name: 'y', type: 'number', unit: '', default: '300', choices: '', says: 'the Y axis\'s travel, mm' }, 'in: y', 'iny');
  s.set('frame', 'number', 400, 'the frame rails\' length, mm', 'rl1.length; rl2.length');
  s.set('cross', 'number', 300, 'the cross rails\' length, mm', 'xr.length');
  s.n('seed.linear-axis', { travel: 300, stepper: '17' }, 'The Y axis', 'ay'); wire(s.b, 'iny', 'value', 'ay', 'travel');
  s.op('ayz', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along z', { block: 'ay' });
  s.n('piece.extrusion', { size: '2020 T-slot', length: 400 }, 'A frame rail, 2020 T-slot', 'rl1');
  s.n('piece.extrusion', { size: '2020 T-slot', length: 400 }, 'The other frame rail', 'rl2');
  s.op('row', 'room.stack', { name: 'frame and Y axis', axis: 'x', fit: 'clear', level: 'on the ground', order: 'rl1,ayz,rl2' }, 'Y axis between two frame rails', { blocks: ['rl1', 'ayz', 'rl2'] });
  s.n('piece.extrusion', { size: '2020 T-slot', length: 300 }, 'A cross rail, 2020 T-slot', 'xr');
  s.op('xrx1', 'room.turn', { axis: 'y', degrees: 90 }, 'Laid along x', { block: 'xr' });
  s.op('xrx2', 'room.turn', { axis: 'y', degrees: 90 }, 'And the other', { block: 'xr' });
  s.op('fr', 'room.stack', { name: 'gantry frame', axis: 'z', fit: 'touch', level: 'on the ground', order: 'xrx1,row,xrx2' }, 'A cross rail at each end', { blocks: ['xrx1', 'row', 'xrx2'] });
  s.n('seed.linear-axis', { travel: 300, stepper: '17' }, 'The X axis', 'ax'); wire(s.b, 'inx', 'value', 'ax', 'travel');
  s.op('axz', 'room.turn', { axis: 'z', degrees: -90 }, 'Laid along x', { block: 'ax' });
  s.op('axx', 'room.turn', { axis: 'x', degrees: 90 }, 'Rolled to lay its rods side by side', { block: 'axz' });
  s.n('piece.plate', { name: 'cross slide plate', mat: 'al-6061', w: 300, t: 6, d: 400, holes: '-140,-190; 140,-190; -140,190; 140,190', hole: 5.5 }, 'The cross-slide plate (aluminium, typical) over the Y axis', 'bp');
  s.op('fb', 'room.onto', { face: '+y', fit: 'touch' }, 'Over the frame', { host: 'fr', child: 'bp' });
  s.op('g', 'room.onto', { face: '+y', fit: 'touch' }, 'The X axis across the top', { host: 'fb', child: 'axx' });
  s.save('seed.xy-gantry', 'XY gantry', 'An XY gantry (a cross-slide stage): two lead-screw linear axes (seed.linear-axis) crossed, the Y axis laid between two 2020 T-slot frame rails with a cross rail at each end, an aluminium cross-slide plate over them and the X axis laid across its top. Its settings: x and y (each axis\'s travel), frame and cross (the rails\' lengths), mm. It offers cross slide plate/holes (four M5 corner holes), carriage mount/holes and axis top mount/holes (each axis\'s), 2020 T-slot extrusion/slots', ['mechanical'], 'An XY gantry: two linear axes crossed on an extrusion frame', 'g');
}

// ---- a belt conveyor --------------------------------------------------------------------------------------------------
function conveyor(): void {
  // (a slider-bed belt conveyor, its sizes typical of a small bench conveyor: two Ø50 aluminium rollers, each on a Ø12
  // shaft with a 6201 bearing (ISO 15, bore 12) over each end; a steel slider bed between them; the belt (rubber, 2 mm,
  // typical) drawn as its two runs over and under the rollers and bed, its ends round the rollers not drawn (approximated);
  // two flat steel side frames against the bearings; a 37GB gear motor against the drive roller's end)
  const s = new Fold('A belt conveyor');
  s.set('length', 'number', 600, 'the slider bed\'s, the belt\'s and the return pan\'s length, mm', 'bed.c; bt.c; bb.c');
  s.set('width', 'number', 200, 'the rollers\', the bed\'s and the belt\'s width, mm', 'rol.c; bed.a; bt.a');
  s.set('shaft', 'number', 230, 'the roller shafts\' length and the return pan\'s width, mm: the width and its two bearings (10 mm each) or more', 'sh.length; bb.a');
  s.n('room.make', { name: 'drive roller', shape: 'tube', mat: 'al-6061', a: 6, b: 25, c: 200 }, 'A roller, Ø50 aluminium tube (typical)', 'rol');
  s.n('piece.shaft', { size: '12', length: 230 }, 'Its Ø12 shaft', 'sh');
  s.op('r1', 'room.over', { line: 'Ø12 shaft/axis', where: 'mid', fit: 'touch' }, 'The roller on its shaft', { host: 'sh', sleeve: 'rol' });
  s.n('piece.bearing', { size: '6201' }, 'A 6201 bearing', 'brg');
  s.op('r2', 'room.over', { line: 'Ø12 shaft/axis', where: 'lo', fit: 'touch' }, 'A bearing over one end', { host: 'r1', sleeve: 'brg' });
  s.op('r3', 'room.over', { line: 'Ø12 shaft/axis', where: 'hi', fit: 'touch' }, 'And the other', { host: 'r2', sleeve: 'brg' });
  s.op('ru1', 'room.turn', { axis: 'z', degrees: 90 }, 'The drive roller laid across', { block: 'r3' });
  s.op('ru2', 'room.turn', { axis: 'z', degrees: 90 }, 'The tail roller laid across', { block: 'r3' });
  s.n('room.make', { name: 'slider bed', shape: 'box', mat: 'steel-low', a: 200, b: 3, c: 600 }, 'The slider bed (steel, 3 mm)', 'bed');
  s.op('row', 'room.stack', { name: 'rollers and bed', axis: 'z', fit: 'touch', order: 'ru1,bed,ru2' }, 'A roller each end of the bed', { blocks: ['ru1', 'bed', 'ru2'] });
  s.n('room.make', { name: 'belt top run', shape: 'box', mat: 'rubber', a: 200, b: 2, c: 600 }, 'The belt\'s top run (rubber, 2 mm)', 'bt');
  s.n('room.make', { name: 'return pan', shape: 'box', mat: 'steel-low', a: 230, b: 1.5, c: 600 }, 'The return pan under them (steel sheet, 1.5 mm, as wide as the shafts: it spans the side frames)', 'bb');
  s.op('belt', 'room.stack', { name: 'belt and rollers', axis: 'y', fit: 'touch', order: 'bb,row,bt' }, 'The belt over them, the return pan under', { blocks: ['bb', 'row', 'bt'] });
  s.n('piece.bar', { size: 'flat 40x5', length: 800, metal: 'steel' }, 'A side frame, flat steel 40 × 5', 'sf');
  s.op('sfu1', 'room.turn', { axis: 'z', degrees: 90 }, 'On its edge', { block: 'sf' });
  s.op('sfu2', 'room.turn', { axis: 'z', degrees: 90 }, 'The other, on its edge', { block: 'sf' });
  s.op('fr', 'room.stack', { name: 'belt conveyor', axis: 'x', fit: 'touch', level: 'on the ground', order: 'sfu1,belt,sfu2' }, 'Side frames against the bearings and the pan', { blocks: ['sfu1', 'belt', 'sfu2'] });
  s.n('piece.gearmotor', { size: '37GB' }, 'A 37GB gear motor', 'gm');
  s.op('gmx', 'room.turn', { axis: 'z', degrees: 90 }, 'Its shaft across', { block: 'gm' });
  s.op('cv', 'room.onto', { face: '-x', fit: 'touch', end: 'lo' }, 'Against the side frame at the drive end', { host: 'fr', child: 'gmx' });
  s.save('seed.conveyor', 'Belt conveyor', 'A slider-bed belt conveyor (sizes typical of a bench conveyor): two Ø50 aluminium rollers, each on a Ø12 shaft with a 6201 bearing over each end, a steel slider bed between them, the rubber belt\'s top run over them (its ends round the rollers and its return run not drawn), a steel return pan under them, a flat steel side frame against each row of bearings, a 37GB gear motor against the side frame at the drive end. Its settings: length (the bed\'s and the belt\'s), width (the rollers\', bed\'s and belt\'s) and shaft (the roller shafts\' length), mm. It offers drive roller/axis, Ø12 shaft/axis, 37GB gear motor shaft/axis', ['mechanical'], 'A belt conveyor: frame, two rollers on bearings, belt, gear motor', 'cv');
}

// ---- a car chassis ----------------------------------------------------------------------------------------------------
function carChassis(): void {
  // (a small ladder-frame chassis, sizes typical of a hobby car: two aluminium side rails (40 × 20) and a cross member
  // between them, a stub axle (Ø6 steel, the 65 mm wheel's bore) out through each of the rails' four axle holes, a wheel
  // over each stub's outer end and a 626 bearing (ISO 15, bore 6) over it between the wheel and the rail. Built on its
  // side (every axle along y, so each joint is round its own line), then turned to stand on its wheels)
  const s = new Fold('A car chassis');
  s.set('wheelbase', 'number', 150, 'each axle\'s distance from the middle, mm (half the wheelbase)', 'rl.pcd; rr.pcd');
  s.set('length', 'number', 400, 'the side rails\' length, mm', 'rl.a; rr.a');
  s.set('frame', 'number', 120, 'the frame\'s width between its rails, mm', 'xm.b');
  s.set('stub', 'number', 60, 'each stub axle\'s length, mm (the rail\'s 20, a bearing\'s 6 and the wheel\'s width at least)', 'a0.b; a1.b; a2.b; a3.b');
  s.set('wheel', 'text', '65', 'the wheels\' size, mm (60, 65 and 75 take a 6 mm axle)', 'wh.size', ['60', '65', '75']);
  s.n('room.make', { name: 'left rail', shape: 'box', mat: 'al-6061', a: 400, b: 20, c: 40, holes: 2, pcd: 150, hole: 3 }, 'The left side rail, 40 × 20 aluminium, its two axle holes', 'rl');
  s.n('room.make', { name: 'right rail', shape: 'box', mat: 'al-6061', a: 400, b: 20, c: 40, holes: 2, pcd: 150, hole: 3 }, 'The right side rail', 'rr');
  s.n('room.make', { name: 'cross member', shape: 'box', mat: 'al-6061', a: 60, b: 120, c: 40 }, 'The cross member', 'xm');
  s.op('lad', 'room.stack', { name: 'ladder frame', axis: 'y', fit: 'touch', order: 'rl,xm,rr' }, 'The rails either side of the cross member', { blocks: ['rl', 'xm', 'rr'] });
  s.n('piece.wheel', { size: '65' }, 'A wheel', 'wh');
  s.n('piece.bearing', { size: '626' }, 'A 626 bearing', 'brg');
  let h = 'lad';
  for (const [k, rail, which, from, end, label] of [[0, 'left rail', 0, 'above', 'lo', 'front left'], [1, 'left rail', 1, 'above', 'lo', 'rear left'], [2, 'right rail', 0, 'below', 'hi', 'front right'], [3, 'right rail', 1, 'below', 'hi', 'rear right']] as const) {
    s.n('room.make', { name: `stub axle ${label}`, shape: 'rod', mat: 'steel-alloy', a: 3, b: 60 }, `The ${label} stub axle, Ø6 steel`, `a${k}`);
    s.op(`s${k}`, 'room.through', { line: `${rail}/holes`, which, from, fit: 'touch' }, `Out through the ${rail}'s hole`, { host: h, passer: `a${k}` });
    s.op(`w${k}`, 'room.over', { line: `stub axle ${label}/axis`, where: end, fit: 'touch' }, `The ${label} wheel on its end`, { host: `s${k}`, sleeve: 'wh' });
    s.op(`b${k}`, 'room.over', { line: `stub axle ${label}/axis`, where: 'mid', fit: 'touch' }, 'Its bearing between wheel and rail', { host: `w${k}`, sleeve: 'brg' }); h = `b${k}`;
  }
  s.op('car', 'room.turn', { axis: 'x', degrees: 90 }, 'Stood on its wheels', { block: h });
  s.save('seed.car-chassis', 'Car chassis', 'A small ladder-frame car chassis (sizes typical of a hobby car): two aluminium side rails and a cross member, a Ø6 stub axle out through each of the rails\' four axle holes, a 626 bearing and a wheel over each stub, standing on its four wheels. Its settings: wheelbase (each axle\'s distance from the middle, half the wheelbase), length (the rails\'), frame (its width between the rails), stub (each stub axle\'s length), mm, and the wheel\'s size (60, 65, 75). It offers left rail/holes and right rail/holes, stub axle front left/axis (and the other three) for a motor or a steering link, and the frame\'s top for a body or a battery (Onto a face)', ['mechanical', 'vehicles'], 'A car chassis: ladder frame, four stub axles on bearings, four wheels', 'car');
}

// ---- a tower crane ----------------------------------------------------------------------------------------------------
function crane(): void {
  // (a model tower crane, its sizes typical: a steel base plate, a square hollow-section mast, a jib across its top with a
  // concrete counterweight on its short end, a hook block hung on a wire rope down a hole near the jib's long end, and a
  // winch (a drum over a 37GB gear motor's shaft) at the mast's foot)
  const s = new Fold('A tower crane');
  s.set('height', 'number', 800, 'the mast\'s height, mm', 'mast.length');
  s.set('jib', 'number', 1000, 'the jib\'s length, mm (the hook\'s hole is 400 mm out from its middle)', 'jib.a');
  s.set('rope', 'number', 400, 'the hook\'s rope, mm', 'rope.b');
  s.n('piece.plate', { name: 'crane base', mat: 'steel-low', w: 300, t: 10, d: 300, holes: '-120,-120; 120,-120; -120,120; 120,120', hole: 13 }, 'The base plate, four M12 holes', 'base');
  s.n('piece.hollowsection', { size: 'SHS 50x50x3', length: 800 }, 'The mast, SHS 50 × 50 × 3', 'mast');
  s.op('mup', 'room.turn', { axis: 'x', degrees: 90 }, 'Stood up', { block: 'mast' });
  s.op('tw', 'room.stack', { name: 'tower', axis: 'y', fit: 'touch', order: 'base,mup' }, 'The mast on its base', { blocks: ['base', 'mup'] });
  s.n('room.make', { name: 'jib', shape: 'box', mat: 'steel-low', a: 1000, b: 50, c: 50, points: '400,0', hole: 2 }, 'The jib, a 50 × 50 steel beam, a hole for the rope', 'jib');
  s.n('room.make', { name: 'counterweight', shape: 'box', mat: 'concrete', a: 150, b: 100, c: 100 }, 'The counterweight (concrete)', 'cw');
  s.op('jw', 'room.onto', { face: '+y', fit: 'touch', end: 'lo' }, 'On the jib\'s short end', { host: 'jib', child: 'cw' });
  s.n('piece.gearmotor', { size: '37GB' }, 'The winch motor, 37GB', 'gm');
  s.n('room.make', { name: 'winch drum', shape: 'tube', mat: 'steel-low', a: 3, b: 20, c: 40 }, 'The winch drum', 'drum');
  s.op('wn', 'room.over', { line: 'shaft/axis', where: 'mid', fit: 'touch' }, 'The drum over its shaft', { host: 'gm', sleeve: 'drum' });
  s.n('piece.plate', { name: 'winch plate', mat: 'steel-low', w: 100, t: 10, d: 100, holes: '-35,-35; 35,-35; -35,35; 35,35', hole: 9 }, 'The winch\'s plate', 'wp');
  s.op('wnx', 'room.stack', { name: 'winch', axis: 'y', fit: 'touch', order: 'wp,wn' }, 'The winch stood on its plate (a capstan)', { blocks: ['wp', 'wn'] });
  s.op('tww', 'room.onto', { face: '+x', fit: 'touch', end: 'lo' }, 'The winch at the mast\'s foot, its plate against the base', { host: 'tw', child: 'wnx' });
  s.op('tj', 'room.stack', { name: 'tower crane', axis: 'y', fit: 'touch', order: 'tww,jw' }, 'The jib across the mast\'s top', { blocks: ['tww', 'jw'] });
  s.n('room.make', { name: 'hook block', shape: 'box', mat: 'steel-low', a: 30, b: 60, c: 30 }, 'The hook block', 'hb');
  s.n('room.make', { name: 'wire rope', shape: 'rod', mat: 'steel-alloy', a: 2, b: 400 }, 'Its wire rope, Ø4', 'rope');
  s.op('hk', 'room.stack', { name: 'hook', axis: 'y', fit: 'touch', order: 'hb,rope' }, 'The hook block on its rope', { blocks: ['hb', 'rope'] });
  s.op('cr', 'room.through', { line: 'jib/holes', which: 0, from: 'above', fit: 'touch' }, 'Hung down the jib\'s hole', { host: 'tj', passer: 'hk' });
  s.save('seed.crane', 'Tower crane', 'A model tower crane (sizes typical): a steel base plate with four M12 holes, an SHS 50 × 50 mast, a capstan winch (a drum over a 37GB gear motor on its own plate) against the base, a 50 × 50 steel jib across the mast\'s top with a concrete counterweight on its short end, a hook block on a Ø4 wire rope down a hole 400 mm out along the jib. Its settings: height (the mast\'s), jib (its length) and rope (the hook\'s drop), mm. It offers crane base/holes (to bolt it down), jib/holes, wire rope/axis, winch drum/axis', ['mechanical', 'structural'], 'A tower crane: mast, jib, winch, hook block', 'cr');
}

// ---- a table and a shelf ----------------------------------------------------------------------------------------------
function table(): void {
  // (a table: four round oak legs (Ø50, typical) in a square under a plywood top; its legs ringed round the middle and
  // the ring turned 45° so they stand at the top's corners)
  const s = new Fold('A table');
  s.set('width', 'number', 900, 'the top\'s width, mm', 'top.w');
  s.set('length', 'number', 900, 'the top\'s length, mm', 'top.l');
  s.set('height', 'number', 720, 'the legs\' height, mm', 'leg.b');
  s.set('spread', 'number', 560, 'the legs\' distance from the middle, mm (about 0.7 of the width, less the inset)', 'legs.R');
  s.n('room.make', { name: 'table leg', shape: 'rod', mat: 'oak', a: 25, b: 720 }, 'A leg, Ø50 oak', 'leg');
  s.op('legs', 'room.ring', { name: 'legs', n: 4, R: 560, fit: 'clear' }, 'Four of them', { block: 'leg' });
  s.op('sq', 'room.turn', { axis: 'y', degrees: 45 }, 'Turned to the corners', { block: 'legs' });
  s.n('piece.sheet', { size: 'plywood 18', w: 900, l: 900 }, 'The top, plywood 18', 'top');
  s.op('tb', 'room.stack', { name: 'table', axis: 'y', fit: 'touch', order: 'sq,top' }, 'The top on its legs', { blocks: ['sq', 'top'] });
  s.save('seed.table', 'Table', 'A table (sizes typical): four Ø50 oak legs in a square under an 18 mm plywood top. Its settings: width and length (the top\'s), height (the legs\'), spread (the legs\' distance from the middle, about 0.7 of the width less the inset), mm. Its fixings (screws or brackets) not made yet. It offers its top (Onto a face, +y) for what stands on it and table leg/axis', ['everyday', 'structural'], 'A table: four legs and a top', 'tb');
}
function shelf(): void {
  // (a bookcase, its sizes typical: three 18 mm plywood shelves, a 6 mm hardboard back strip between each two (flush at the
  // back), and an 18 mm plywood side against each end)
  const s = new Fold('A shelf');
  s.set('width', 'number', 800, 'the shelves\' and the back strips\' width, mm', 'sh1.a; sh2.a; sh3.a; bk1.a; bk2.a');
  s.set('depth', 'number', 300, 'the shelves\' and the sides\' depth, mm', 'sh1.c; sh2.c; sh3.c; sd1.c; sd2.c');
  s.set('gap', 'number', 300, 'the height between shelves, mm', 'bk1.b; bk2.b');
  s.set('height', 'number', 654, 'the sides\' height, mm (three shelves and two gaps: 3 × 18 + 2 × gap)', 'sd1.b; sd2.b');
  for (const k of [1, 2, 3]) s.n('room.make', { name: 'shelf', shape: 'box', mat: 'wood', a: 800, b: 18, c: 300 }, `Shelf ${k}, 18 mm plywood`, `sh${k}`);
  for (const k of [1, 2]) s.n('room.make', { name: 'back strip', shape: 'box', mat: 'wood', a: 800, b: 300, c: 6 }, `Back strip ${k}, 6 mm hardboard`, `bk${k}`);
  s.op('col', 'room.stack', { name: 'shelves', axis: 'y', fit: 'touch', end: 'lo', order: 'sh1,bk1,sh2,bk2,sh3' }, 'Three shelves, a back strip between each two', { blocks: ['sh1', 'bk1', 'sh2', 'bk2', 'sh3'] });
  for (const k of [1, 2]) s.n('room.make', { name: 'side panel', shape: 'box', mat: 'wood', a: 18, b: 654, c: 300 }, `Side ${k}, 18 mm plywood`, `sd${k}`);
  s.op('st', 'room.stack', { name: 'shelf', axis: 'x', fit: 'touch', order: 'sd1,col,sd2' }, 'A side against each end', { blocks: ['sd1', 'col', 'sd2'] });
  s.save('seed.shelf', 'Shelf', 'A bookcase shelf (sizes typical): three 18 mm plywood shelves, a 6 mm hardboard back strip between each two (flush at the back) and an 18 mm plywood side against each end. Its settings: width, depth, gap (between shelves) and height (the sides\': 3 × 18 + 2 × gap), mm. Its fixings not made yet. It offers its top (Onto a face, +y) and its sides', ['everyday', 'structural'], 'A shelf: sides, shelves, back', 'st');
}

// ---- a desk lamp arm --------------------------------------------------------------------------------------------------
function lampArm(): void {
  // (a desk lamp, its sizes typical: a weighted steel base, a lower arm, a pivot (a pin with a knuckle over it, a clear
  // fit: the joint), an upper arm tilted, a second pivot and a shade (an aluminium cup) with a 5 mm white LED in it)
  const s = new Fold('A desk lamp');
  s.set('lower', 'number', 300, 'the lower arm\'s length, mm', 'a1.b');
  s.set('upper', 'number', 280, 'the upper arm\'s length, mm', 'a2.b');
  s.n('room.make', { name: 'lamp base', shape: 'rod', mat: 'steel-low', a: 75, b: 20 }, 'The base, Ø150 steel', 'base');
  s.n('room.make', { name: 'lower arm', shape: 'rod', mat: 'al-6061', a: 6, b: 300 }, 'The lower arm, Ø12', 'a1');
  s.n('room.make', { name: 'pivot pin', shape: 'rod', mat: 'steel-alloy', a: 3, b: 30 }, 'A pivot pin, Ø6', 'pin');
  // (wave 11 integration: the knuckle drawn with no bore, so over bores it to the Ø6 pin at the clear fit's gap and writes
  // its face; before, a Ø8 bore stood 1 mm off the pin, no face was written and each pin fell away from the lamp)
  s.n('room.make', { name: 'knuckle', shape: 'rod', mat: 'al-6061', a: 8, b: 16 }, 'Its knuckle', 'kn');
  s.op('pv', 'room.over', { line: 'pivot pin/axis', where: 'mid', fit: 'clear' }, 'The knuckle over the pin: the joint', { host: 'pin', sleeve: 'kn' });
  s.op('pvx1', 'room.turn', { axis: 'x', degrees: 90 }, 'Its pin across', { block: 'pv' });
  s.op('pvx2', 'room.turn', { axis: 'x', degrees: 90 }, 'The second pivot, its pin across', { block: 'pv' });
  s.n('room.make', { name: 'upper arm', shape: 'rod', mat: 'al-6061', a: 6, b: 280 }, 'The upper arm, Ø12', 'a2');
  s.n('room.make', { name: 'lamp shade', shape: 'cup', mat: 'al-6061', a: 40, b: 50, c: 1.5, d: 2 }, 'The shade, an aluminium cup', 'shade');
  s.n('piece.led', { size: '5', colour: 'white', leads: 10 }, 'A 5 mm white LED', 'led');
  s.op('head', 'room.into', { fit: 'clear' }, 'The LED in the shade', { host: 'shade', child: 'led' });
  s.op('lamp', 'room.stack', { name: 'desk lamp', axis: 'y', fit: 'touch', order: 'base,a1,pvx1,a2,pvx2,head' }, 'Base, arm, pivot, arm, pivot, head', { blocks: ['base', 'a1', 'pvx1', 'a2', 'pvx2', 'head'] });
  s.save('seed.lamp-arm', 'Desk lamp arm', 'A desk lamp on its arm (sizes typical): a Ø150 steel base, a Ø12 aluminium lower arm, a pivot (a Ø6 pin with a knuckle over it, a clear fit: the joint), the upper arm, a second pivot and an aluminium shade with a 5 mm white LED in it, all upright (its arms not tilted yet). Its settings: lower and upper (the arms\' lengths), mm. It offers pivot pin/axis and knuckle/axis (the joints), lamp shade/axis, the LED\'s lead/axis', ['everyday', 'mechanical', 'electrical'], 'A desk lamp: base, two arms on pivots, a shade with an LED', 'lamp');
}

// ---- a pump loop ------------------------------------------------------------------------------------------------------
function pumpLoop(): void {
  // (a small pump loop on the ground, its sizes typical: a 10 L polyethylene tank (piece.tank, its ports in its +x wall),
  // a pump against its side (a 385 DC can motor stood on an ABS pump head, an envelope: its impeller and seals not drawn),
  // a G1/2 brass ball valve, and a copper 15 mm pipe run out of the valve; each against the next, in a row)
  const s = new Fold('A pump loop');
  s.set('tank', 'text', '10 L', 'the tank, by its capacity', 'tk.size', ['10 L', '25 L', '50 L']);
  s.set('pipe', 'number', 300, 'the pipe run\'s length, mm', 'pp.length');
  s.set('valve', 'text', 'G1/2', 'the valve\'s size (ISO 228)', 'vl.size', ['G1/4', 'G3/8', 'G1/2', 'G3/4']);
  s.n('piece.tank', { size: '10 L', port: 22 }, 'The tank, 10 L', 'tk');
  s.n('room.make', { name: 'pump head', shape: 'box', mat: 'abs', a: 60, b: 50, c: 50 }, 'The pump head (ABS, typical)', 'ph');
  s.n('piece.dcmotor', { size: '385' }, 'Its 385 DC motor', 'pm');
  s.op('pump', 'room.stack', { name: 'pump', axis: 'y', fit: 'touch', order: 'ph,pm' }, 'The motor stood on the pump head', { blocks: ['ph', 'pm'] });
  s.n('piece.ballvalve', { size: 'G1/2', matter: 'brass' }, 'A ball valve, G1/2 brass', 'vl');
  s.n('piece.pipe', { size: 'copper 15×0.7', length: 300 }, 'A copper pipe, 15 mm', 'pp');
  s.op('ppx', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid along the flow', { block: 'pp' });
  s.op('row', 'room.stack', { name: 'pump loop', axis: 'x', fit: 'touch', level: 'on the ground', order: 'tk,pump,vl,ppx' }, 'Tank, pump, valve, pipe: each against the next', { blocks: ['tk', 'pump', 'vl', 'ppx'] });
  s.save('seed.pump-loop', 'Pump loop', 'A small pump loop on the ground (sizes typical): a polyethylene tank (10 to 50 L, its two ports in its +x wall), a pump against its side (a 385 DC motor stood on an ABS pump head: an envelope, its impeller not drawn), a brass ball valve and a 15 mm copper pipe out of it, each against the next (the pipes end against what they meet: no thread or socket made between them yet). Its settings: the tank, the pipe\'s length (mm) and the valve\'s size. It offers the tank\'s cavity and ports, the valve\'s stem and lever, copper 15×0.7 pipe/axis for a coupling or a run to follow', ['mechanical', 'pipelines'], 'A pump loop: tank, pump, valve, pipe', 'row');
}

let made = false;
export function makeMachines(): void {
  if (made) return; made = true;
  linearAxis(); xyGantry(); conveyor(); carChassis(); crane(); table(); shelf(); lampArm(); pumpLoop();
}
makeMachines();
