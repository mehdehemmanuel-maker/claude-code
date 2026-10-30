// The starter boards: real node flows across fields, each a pipeline to start from (the library's Boards). Pure: no page
// is needed to read them, so navigation (src/nexus/navigate.ts), the tests and the docs see every flow the page offers. The
// page lays each out (its own tidy) as it opens it.

import { collapse, emptyBoard, placeBlock, wire } from './dataflow';
import type { Board } from './boards';

export type Make = () => Board;
/** Every starter board, laid out by the tidy given (none: as placed). */
export function starterBoards(tidy: (b: Board) => Board = (b) => b): [string, Make][] {
  /** A board of seeds, each placed where it is to be seen, all shown and measured: choose one and click through its choices. */
  function seedBoard(title: string, items: [string, string, Record<string, unknown>, Record<string, number>, string][]): Board {
    const b = emptyBoard(title), all = placeBlock(b, 'combine', 0, 0, { name: title }, 'all');
    items.forEach(([blockId, label, set, at, out], i) => {
      const id = placeBlock(b, blockId, 0, 0, set, `s${i}`); b.nodes[id]!.label = label;
      const p = placeBlock(b, 'place', 0, 0, at, `p${i}`); wire(b, id, out, p, 'thing'); wire(b, p, 'placed', all, 'things');
    });
    wire(b, all, 'assembly', placeBlock(b, 'space.show', 0, 0, {}, 'show'), 'thing'); wire(b, all, 'assembly', placeBlock(b, 'measure', 0, 0, {}, 'measure'), 'thing');
    // and whether any of them run into one another
    wire(b, all, 'assembly', placeBlock(b, 'clash', 0, 0, { depth: 1 }, 'clash'), 'thing');
    return b;
  }
  const boards = ([
  ['A house from seeds: pick its plan, its rooms change', () => seedBoard('A house from seeds', [
    ['seed.house', 'House (choose it: its plan, its roof on or off, its colours)', { plan: '2 bed', show: 'roof off' }, {}, 'house'],
    ['seed.car', 'Car in the drive', { paint: '#1565c0' }, { x: 9.5, z: 2, ry: Math.PI / 2 }, 'car'],
    ['seed.room', 'One room on its own (choose it: its type)', { type: 'bathroom' }, { x: -10 }, 'room'],
  ])],
  ['Power as nodes: an engine run from its numbers, the powertrain it drives, a car round a block as fast as that lets it', () => {
    // nothing told how fast it goes: Run an engine works each cylinder crank degree by crank degree from its bore, stroke,
    // compression and the valves its head is built with (here the Corolla's published 2.0); its full-load curve feeds
    // Drive (its CVT, final drive, tyres, mass and drag), which gives the most it can speed up at each speed; Follow a
    // path drives cars round a block no faster than that lets them, stopping at red. Friction is Heywood's 1988
    // correlation, scaled here to 0.6 (an estimate for a modern engine: the gap to Toyota's figures is said, not hidden)
    const b = emptyBoard('Power as nodes');
    placeBlock(b, 'in.number', 0, 0, { value: 0.6 }, 'fr'); b.nodes.fr!.label = 'Friction over Heywood 1988 (an estimate)';
    placeBlock(b, 'engine.run', 0, 0, { model: 'corolla' }, 'engine'); b.nodes.engine!.label = 'Run an engine (its published bore, stroke and compression)'; wire(b, 'fr', 'value', 'engine', 'friction');
    placeBlock(b, 'list.column', 0, 0, { column: 'rpm' }, 'rpm'); wire(b, 'engine', 'curve', 'rpm', 'rows');
    placeBlock(b, 'list.column', 0, 0, { column: 'torque' }, 'nm'); wire(b, 'engine', 'curve', 'nm', 'rows');
    placeBlock(b, 'view.chart', 0, 0, {}, 'tq'); b.nodes.tq!.label = 'Its torque by speed, N·m'; wire(b, 'nm', 'values', 'tq', 'y'); wire(b, 'rpm', 'values', 'tq', 'x');
    placeBlock(b, 'list.column', 0, 0, { column: 'bar' }, 'bar'); wire(b, 'engine', 'cycle', 'bar', 'rows');
    placeBlock(b, 'view.chart', 0, 0, {}, 'pc'); b.nodes.pc!.label = 'A cylinder\'s pressure through two turns, bar'; wire(b, 'bar', 'values', 'pc', 'y');
    placeBlock(b, 'drive', 0, 0, { model: 'corolla' }, 'drive'); b.nodes.drive!.label = 'Drive (its CVT, tyres, mass and drag)'; wire(b, 'engine', 'curve', 'drive', 'curve');
    placeBlock(b, 'list.column', 0, 0, { column: 'accel' }, 'acc'); wire(b, 'drive', 'capability', 'acc', 'rows');
    placeBlock(b, 'view.chart', 0, 0, {}, 'ac'); b.nodes.ac!.label = 'The most it can speed up, m/s² by m/s'; wire(b, 'acc', 'values', 'ac', 'y');
    placeBlock(b, 'view.show', 0, 0, {}, 'es'); b.nodes.es!.label = 'The engine, said'; wire(b, 'engine', 'says', 'es', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'ds'); b.nodes.ds!.label = 'The car, said'; wire(b, 'drive', 'says', 'ds', 'value');
    placeBlock(b, 'seed.roads', 0, 0, { nx: 2, nz: 2, block: 60, lights: 'cycle' }, 'roads'); b.nodes.roads!.label = 'Road system (its lights on the clock)';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'path.loop', 0, 0, { w: 120, d: 120, inset: 1.8, every: 60, before: 5 }, 'ring'); b.nodes.ring!.label = 'Lane round its edge';
    placeBlock(b, 'follow', 0, 0, { n: 3, speed: 14, gap: 12, accel: 6, phases: 'green 30, yellow 4, red 34' }, 'go'); b.nodes.go!.label = 'Cars round it at 50 km/h, as their powertrain lets them'; wire(b, 'ring', 'path', 'go', 'path'); wire(b, 'ring', 'stops', 'go', 'stops'); wire(b, 'clock', 't', 'go', 't'); wire(b, 'drive', 'capability', 'go', 'capability');
    placeBlock(b, 'spawn', 0, 0, { seed: 'seed.car' }, 'cars'); b.nodes.cars!.label = 'A Car at each'; wire(b, 'go', 'rows', 'cars', 'rows');
    placeBlock(b, 'combine', 0, 0, { name: 'streets and cars' }, 'all'); wire(b, 'roads', 'roads', 'all', 'things'); wire(b, 'cars', 'things', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Traffic on the clock: cars round a block, stopping at red', () => {
    // two blocks each way of 60 m (typical of a suburb), its lights on a fixed-time cycle; eight cars at 11 m/s (40 km/h)
    // round its edge, each 8 m behind the one ahead: press ▶ under the 3D view and watch them queue at red
    const b = emptyBoard('Traffic on the clock');
    placeBlock(b, 'seed.roads', 0, 0, { nx: 2, nz: 2, block: 60, lights: 'cycle' }, 'roads'); b.nodes.roads!.label = 'Road system (its lights on the clock)';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'path.loop', 0, 0, { w: 120, d: 120, inset: 1.8, every: 60, before: 5 }, 'ring'); b.nodes.ring!.label = 'Lane round its edge';
    placeBlock(b, 'follow', 0, 0, { n: 8, speed: 11, gap: 8, phases: 'green 30, yellow 4, red 34' }, 'drive'); b.nodes.drive!.label = 'Cars follow the lane';
    wire(b, 'ring', 'path', 'drive', 'path'); wire(b, 'ring', 'stops', 'drive', 'stops'); wire(b, 'clock', 't', 'drive', 't');
    placeBlock(b, 'rows.set', 0, 0, { column: 'paint', turns: true, value: '#1565c0|#eceff1|#c62828|#212121|#f9a825|#2e7d32' }, 'paint'); b.nodes.paint!.label = 'Each its paint'; wire(b, 'drive', 'rows', 'paint', 'rows');
    placeBlock(b, 'spawn', 0, 0, { seed: 'seed.car' }, 'cars'); b.nodes.cars!.label = 'A Car at each'; wire(b, 'paint', 'rows', 'cars', 'rows');
    placeBlock(b, 'combine', 0, 0, { name: 'streets and traffic' }, 'all'); wire(b, 'roads', 'roads', 'all', 'things'); wire(b, 'cars', 'things', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['A world without end: neighbourhoods for ever, each its own', () => {
    // three neighbourhoods, each from its own seed, laid for ever along x and z (130 m a cell: two blocks of 60 m and a
    // street), each cell one of them by its hash: drawn only out to the haze, so walking or flying never reaches an edge
    const b = emptyBoard('A world without end');
    for (const k of [1, 2, 3]) { placeBlock(b, 'seed.neighbourhood', 0, 0, { nx: 2, nz: 2, seed: k, traffic: 4 }, `h${k}`); b.nodes[`h${k}`]!.label = `Neighbourhood, seed ${k}`; }
    placeBlock(b, 'forever', 0, 0, { sx: 130, sz: 130, seed: 7 }, 'world'); b.nodes.world!.label = 'For ever along x and z';
    for (const k of [1, 2, 3]) wire(b, `h${k}`, 'neighbourhood', 'world', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'world', 'world', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'Measure (one cell)'; wire(b, 'world', 'world', 'measure', 'thing');
    return b;
  }],
  ['A battery built from its parts, node by node: grid, paste, separator, plates, cell, case', () => {
    // a BCI group 35 starting battery (230 × 175 × 225 mm, its case the standard's), made the way one is made, every
    // step a node that makes other things too: a grid cast (as a fan guard is), pasted (as anything is coated), the
    // positive wrapped in a separator (as a bag wraps), plates stacked alternately (as fins and laminations are), a strap
    // cast over their lugs (as a busbar joins terminals), the cells into a moulded case of partitions (as a toolbox's),
    // joined in series zig-zag, posts on its free ends, its lid. Take it apart: case, cells, plates, each plate's grid and
    // paste
    const b = emptyBoard('A battery built from its parts');
    const pw = 0.1636, ph = 0.1299;
    placeBlock(b, 'make.grid', 0, 0, { lug: 'right', w: pw, h: ph, t: 0.0011, bars: 7, wires: 9, rim: 0.003 }, 'gp'); b.nodes.gp!.label = 'Cast grid (positive, lug right)';
    placeBlock(b, 'make.grid', 0, 0, { lug: 'left', w: pw, h: ph, t: 0.0011, bars: 7, wires: 9, rim: 0.003 }, 'gn'); b.nodes.gn!.label = 'Cast grid (negative, lug left)';
    placeBlock(b, 'make.coat', 0, 0, { name: 'positive plate', item: 'plate-positive', layer: 'positive paste', layerItem: 'paste-positive', mat: 'lead', color: '#4a2c1c', t: 0.00035, fill: 0.2 }, 'cp'); b.nodes.cp!.label = 'Paste it: lead dioxide'; wire(b, 'gp', 'grid', 'cp', 'part');
    placeBlock(b, 'make.coat', 0, 0, { name: 'negative plate', item: 'plate-negative', layer: 'negative paste', layerItem: 'paste-negative', mat: 'lead', color: '#6a6d72', t: 0.0002, fill: 0.2 }, 'cn'); b.nodes.cn!.label = 'Paste it: sponge lead'; wire(b, 'gn', 'grid', 'cn', 'part');
    placeBlock(b, 'make.wrap', 0, 0, { name: 'separator envelope', item: 'plate-separator', mat: 'pe', t: 0.0006, fill: 0.4 }, 'wp'); b.nodes.wp!.label = 'Wrap the positive in a separator'; wire(b, 'cp', 'coated', 'wp', 'part');
    placeBlock(b, 'make.stack', 0, 0, { n: 13, pitch: 0.00264, y: ph / 2 }, 'st'); b.nodes.st!.label = 'Stack them: 13 plates'; wire(b, 'cn', 'coated', 'st', 'things'); wire(b, 'wp', 'wrapped', 'st', 'things');
    placeBlock(b, 'make.strap', 0, 0, { path: '^lug$', name: 'strap', item: 'la-strap', result: 'cell (13 plates)' }, 'cell'); b.nodes.cell!.label = 'Strap their lugs: a 2 V cell'; wire(b, 'st', 'stack', 'cell', 'thing');
    placeBlock(b, 'make.enclosure', 0, 0, { L: 0.2302, W: 0.1746, H: 0.1954, wall: 0.0025, cells: 6, rib: 0.012, lid: 0.012 }, 'case'); b.nodes.case!.label = 'Case: six cells, moulded';
    placeBlock(b, 'make.into', 0, 0, { alternate: true }, 'into'); b.nodes.into!.label = 'Cells into the case, alternate turned'; wire(b, 'cell', 'joined', 'into', 'thing'); wire(b, 'case', 'case', 'into', 'into');
    placeBlock(b, 'make.strap', 0, 0, { path: '^strap \\d+$', series: true, name: 'intercell connector', item: 'la-intercell', result: 'six cells in series' }, 'ser'); b.nodes.ser!.label = 'Join them in series'; wire(b, 'into', 'filled', 'ser', 'thing');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'post', mat: 'lead', color: '#9a9da2', finish: 'satin', r: 0.0093, h: 0.034 }, 'pc'); b.nodes.pc!.label = 'Post (SAE, about 18 mm)';
    placeBlock(b, 'tag', 0, 0, { name: 'terminal post', item: 'battery-post' }, 'pt'); wire(b, 'pc', 'part', 'pt', 'part');
    placeBlock(b, 'place', 0, 0, { y: 0.017 }, 'posts'); b.nodes.posts!.label = 'Posts on its free ends'; wire(b, 'pt', 'tagged', 'posts', 'thing'); wire(b, 'ser', 'ends', 'posts', 'points');
    placeBlock(b, 'place', 0, 0, { y: 0.1954 + 0.006 }, 'lidAt'); b.nodes.lidAt!.label = 'Lid on top'; wire(b, 'case', 'lid', 'lidAt', 'thing');
    placeBlock(b, 'make.fill', 0, 0, { name: 'electrolyte', mat: 'acid', h: ph + 0.012, share: 0.55 }, 'acid'); b.nodes.acid!.label = 'Fill each cell: acid'; wire(b, 'case', 'case', 'acid', 'into'); wire(b, 'case', 'cellL', 'acid', 'L'); wire(b, 'case', 'cellW', 'acid', 'W');
    placeBlock(b, 'combine', 0, 0, { name: '12 V battery, group 35 (built here)' }, 'all'); wire(b, 'case', 'case', 'all', 'things'); wire(b, 'ser', 'joined', 'all', 'things'); wire(b, 'acid', 'filled', 'all', 'things'); wire(b, 'posts', 'placed', 'all', 'things'); wire(b, 'lidAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0.5, levels: 64 }, 'apart'); b.nodes.apart!.label = 'Take it apart (to the bottom)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    // (each step's part on the board itself, turning: the grid, the pasted plate, the wrapped plate, the cell)
    for (const [k, from, out, label, ex] of [['v1', 'gp', 'grid', 'The cast grid', 0], ['v2', 'cp', 'coated', 'The pasted plate', 1], ['v3', 'wp', 'wrapped', 'In its separator', 1], ['v4', 'cell', 'joined', 'A cell, its plates strapped', 0]] as [string, string, string, string, number][]) { placeBlock(b, 'view.3d', 0, 0, { explode: ex }, k); b.nodes[k]!.label = label; wire(b, from, out, k, 'part'); }
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'all', 'assembly', 'audit', 'thing');
    return b;
  }],
  ['An engine from its first parts: piston, rod, crank, block, head, then the whole', () => {
    // Toyota's 2.0 L four (M20A-FKS: 80.5 mm bore, 97.6 mm stroke, Toyota), built the way an engine is built, and every
    // part on the board is a part of it: one bore and one stroke size every node; the head's pieces (valves, the spring off
    // the coil maker, retainer, tappet, plug, coil) are wired into the head; the piston, rod, crank, block and head are
    // wired into the engine. Change any of them (the spring's wire, the bore) and it flows up into the engine, its mass
    // and its checks: does it come apart to the bottom, and does nothing run into anything
    const b = emptyBoard('An engine from its first parts');
    const e = { layout: 'inline', fuel: 'petrol', block: 'al', cooling: 'liquid', cams: 'dohc', valves: '4', turbo: 'no', starter: 'electric', fit: 'm20a-fks' };
    placeBlock(b, 'in.number', 0, 0, { value: 0.0805, unit: 'm' }, 'bore'); b.nodes.bore!.label = 'Bore (Toyota: 80.5 mm)';
    placeBlock(b, 'in.number', 0, 0, { value: 0.0976, unit: 'm' }, 'stroke'); b.nodes.stroke!.label = 'Stroke (Toyota: 97.6 mm)';
    const sized = (id: string) => { wire(b, 'bore', 'value', id, 'bore'); wire(b, 'stroke', 'value', id, 'stroke'); };
    for (const [k, id, label] of [['pis', 'engine.piston', 'Piston, rings, pin, clips'], ['rod', 'engine.rod', 'Rod, cap, shells, bolts'], ['crk', 'engine.crank', 'Crankshaft, forged in one'], ['blk', 'engine.block', 'Block, liners, caps, shells'], ['hd', 'engine.head', 'Head, from its pieces'], ['eng', 'engine.whole', 'The engine, from its parts']] as [string, string, string][]) { placeBlock(b, id, 0, 0, e, k); b.nodes[k]!.label = label; sized(k); }
    // (the head's pieces, each a node: made to size, or the spring off the coil maker: the wire, coil and preload the head's
    // own spring is sized to, to hold its valves on their cams at speed (src/nexus/engines.ts springOf))
    for (const [k, which, port, label] of [['vin', 'intake valve', 'intakeValve', 'Intake valve'], ['vex', 'exhaust valve', 'exhaustValve', 'Exhaust valve (stainless)'], ['ret', 'valve spring retainer', 'valveSpringRetainer', 'Spring retainer'], ['tap', 'bucket tappet', 'bucketTappet', 'Bucket tappet'], ['plg', 'spark plug', 'sparkPlug', 'Spark plug'], ['ign', 'ignition coil', 'ignitionCoil', 'Ignition coil']] as [string, string, string, string][]) { placeBlock(b, 'engine.piece', 0, 0, { ...e, which }, k); b.nodes[k]!.label = label; sized(k); wire(b, k, 'piece', 'hd', port); }
    placeBlock(b, 'make.coil', 0, 0, { name: 'valve spring', item: 'valve-spring', d: 0.0029, D: 0.0185, L: 0.037, L0: 0.0452, n: 5 }, 'spr'); b.nodes.spr!.label = 'Coil: the valve spring'; wire(b, 'spr', 'spring', 'hd', 'valveSpring');
    for (const [from, out, port] of [['pis', 'piston', 'piston'], ['rod', 'rod', 'rod'], ['crk', 'crank', 'crank'], ['blk', 'block', 'block'], ['hd', 'head', 'head']] as [string, string, string][]) wire(b, from, out, 'eng', port);
    for (const [k, from, out, label, ex] of [['v1', 'pis', 'piston', 'The piston', 1], ['v2', 'rod', 'rod', 'The rod', 1], ['v3', 'crk', 'crank', 'The crank', 0], ['v4', 'hd', 'head', 'The head, apart', 1], ['v5', 'spr', 'spring', 'The valve spring', 0], ['v6', 'vex', 'piece', 'An exhaust valve', 0]] as [string, string, string, string, number][]) { placeBlock(b, 'view.3d', 0, 0, { explode: ex }, k); b.nodes[k]!.label = label; wire(b, from, out, k, 'part'); }
    placeBlock(b, 'explode', 0, 0, { amount: 0.35, levels: 64 }, 'apart'); b.nodes.apart!.label = 'Take it apart (to the bottom)'; wire(b, 'eng', 'engine', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'eng', 'engine', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'eng', 'engine', 'audit', 'thing');
    placeBlock(b, 'check.rules', 0, 0, {}, 'rules'); b.nodes.rules!.label = 'Does nothing run into anything?'; wire(b, 'eng', 'engine', 'rules', 'thing');
    // (and under load: at the 6,600 rpm Toyota gives its peak power at, and swept from 1,000 to 7,000 rpm for where it gives)
    placeBlock(b, 'load.engine', 0, 0, { ...e }, 'load'); b.nodes.load!.label = 'Under load at 6,600 rpm'; b.nodes.load!.set = { ...(b.nodes.load!.set ?? {}), rpm: 6600 }; sized('load'); wire(b, 'spr', 'spring', 'load', 'spring');
    placeBlock(b, 'view.table', 0, 0, {}, 'loadRows'); b.nodes.loadRows!.label = 'Each part: its stress, its limit, its margin'; wire(b, 'load', 'rows', 'loadRows', 'rows');
    placeBlock(b, 'sweep.range', 0, 0, { block: 'load.engine', vary: 'rpm', from: 1000, to: 7000, steps: 13, watch: 'worst', worstIs: 'lowest', blockSet: JSON.stringify(e) }, 'sweep'); b.nodes.sweep!.label = 'Stress test: 1,000 to 7,000 rpm'; sized('sweep'); wire(b, 'spr', 'spring', 'sweep', 'spring');
    placeBlock(b, 'view.chart', 0, 0, {}, 'sweepChart'); b.nodes.sweepChart!.label = 'Least margin by speed'; wire(b, 'sweep', 'ys', 'sweepChart', 'y'); wire(b, 'sweep', 'xs', 'sweepChart', 'x');
    return b;
  }],
  ['Research to what is missing: Toyota\'s engine held against its sources', () => {
    // research as a pipeline: what the M20A-FKS is made of, read off its sources and kept (src/data/references.ts), and
    // notes of your own compiled with it (every part named with its source, or refused); the engine drawn from its parts
    // held against the whole of it (what is drawn, short, missing, or drawn the way the sources say it is not); how finely
    // it is drawn (how much is still plain boxes, and the biggest); the reference entered in the inventory and opened all
    // the way down, its parts and theirs, and what of them waits to be researched; and every check on the engine at once
    const b = emptyBoard('Research to what is missing');
    const e = { layout: 'inline', fuel: 'petrol', block: 'al', cooling: 'liquid', cams: 'dohc', valves: '4', turbo: 'no', starter: 'electric', fit: 'm20a-fks' };
    placeBlock(b, 'note', 0, 0, { text: 'Research → compile → its parts and theirs → what is missing → what to reshape. Add a line to the notes (a part, its pattern over drawn names, its source) and the gap and the inventory follow it.' }, 'about');
    placeBlock(b, 'research.notes', 0, 0, { from: 'm20a-fks' }, 'ref'); b.nodes.ref!.label = 'Researched: the M20A-FKS, part by part, each sourced';
    placeBlock(b, 'research.notes', 0, 0, { id: 'd4s-injector', name: 'a D-4S direct injector, inside', notes: '@TOY | https://global.toyota/en/mobility/tnga/powertrain2018/engine/index.html | Toyota: TNGA powertrain 2018 (a multi-hole direct injector)\ndi-in | a direct injector, inside | | 1 | | | typical | its nozzle and its solenoid\ndi-nozzle | multi-hole nozzle | di-in | 4 | multi-hole nozzle | TOY | confirmed | one on each direct injector' }, 'notes'); b.nodes.notes!.label = 'Notes of your own (sourced, or refused)';
    placeBlock(b, 'research.merge', 0, 0, { id: 'm20a-compiled', name: 'the M20A-FKS, compiled' }, 'merge'); b.nodes.merge!.label = 'Compile the research'; wire(b, 'ref', 'reference', 'merge', 'references'); wire(b, 'notes', 'reference', 'merge', 'references');
    placeBlock(b, 'in.number', 0, 0, { value: 0.0805, unit: 'm' }, 'bore'); b.nodes.bore!.label = 'Bore (Toyota: 80.5 mm)';
    placeBlock(b, 'in.number', 0, 0, { value: 0.0976, unit: 'm' }, 'stroke'); b.nodes.stroke!.label = 'Stroke (Toyota: 97.6 mm)';
    placeBlock(b, 'engine.whole', 0, 0, { ...e }, 'eng'); b.nodes.eng!.label = 'The engine, from its parts (its maker\'s choices: M20A-FKS)'; wire(b, 'bore', 'value', 'eng', 'bore'); wire(b, 'stroke', 'value', 'eng', 'stroke');
    placeBlock(b, 'research.gap', 0, 0, {}, 'gap'); b.nodes.gap!.label = 'What is missing?'; wire(b, 'eng', 'engine', 'gap', 'thing'); wire(b, 'merge', 'reference', 'gap', 'reference');
    placeBlock(b, 'view.table', 0, 0, {}, 'gapRows'); b.nodes.gapRows!.label = 'Each part the sources name: drawn, short, missing, wrong'; wire(b, 'gap', 'rows', 'gapRows', 'rows');
    placeBlock(b, 'view.gauge', 0, 0, { min: 0, max: 1 }, 'cover'); b.nodes.cover!.label = 'Share drawn as the sources say'; wire(b, 'gap', 'coverage', 'cover', 'value');
    placeBlock(b, 'check.fidelity', 0, 0, {}, 'fid'); b.nodes.fid!.label = 'How finely is it drawn?'; wire(b, 'eng', 'engine', 'fid', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'boxes'); b.nodes.boxes!.label = 'Its biggest plain boxes: reshape these first'; wire(b, 'fid', 'biggest', 'boxes', 'rows');
    placeBlock(b, 'research.toInventory', 0, 0, {}, 'inv'); b.nodes.inv!.label = 'Into the inventory'; wire(b, 'merge', 'reference', 'inv', 'reference');
    placeBlock(b, 'research.parts', 0, 0, { depth: 6 }, 'tree'); b.nodes.tree!.label = 'Its parts, and theirs, and what waits'; wire(b, 'inv', 'item', 'tree', 'item');
    placeBlock(b, 'view.table', 0, 0, {}, 'treeRows'); b.nodes.treeRows!.label = 'Sub-components and theirs'; wire(b, 'tree', 'rows', 'treeRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'waits'); b.nodes.waits!.label = 'Waiting to be researched'; wire(b, 'tree', 'waiting', 'waits', 'rows');
    placeBlock(b, 'check.rules', 0, 0, {}, 'rules'); b.nodes.rules!.label = 'Does nothing run into anything?'; wire(b, 'eng', 'engine', 'rules', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'eng', 'engine', 'audit', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'eng', 'engine', 'show', 'thing');
    return b;
  }],
  ['The gauntlet as nodes: makers through gate after gate, the unknown sorted and researched to the bottom', () => {
    // every maker of the library put through the gauntlet gate by gate (what passes one goes on to the next, what fails
    // is shown with why); what they want that nothing knows queued, sorted by what it shares, and researched round after
    // round to the bottom from what a maker draws; a listener hearing each approval; the tasks left; a block read, a
    // block tested, a search; and a deletion that only says what it would do. The gauntlet's own page shows all of this
    // as lanes (Gauntlet ↗ above)
    const b = emptyBoard('The gauntlet as nodes');
    placeBlock(b, 'gauntlet.candidates', 0, 0, { from: 'library', kind: 'generator', most: 16 }, 'cands'); b.nodes.cands!.label = 'Candidates: the makers';
    const gates = ['documented', 'unique', 'tests', 'robust', 'known', 'explodes'];
    gates.forEach((g, k) => { placeBlock(b, 'gauntlet.run', 0, 0, { gates: g }, `g${k}`); b.nodes[`g${k}`]!.label = `Gate: ${g}`; wire(b, k ? `g${k - 1}` : 'cands', k ? 'approved' : 'candidates', `g${k}`, 'candidates'); });
    gates.forEach((g, k) => { placeBlock(b, 'view.table', 0, 0, {}, `t${k}`); b.nodes[`t${k}`]!.label = `${g}: who and why`; wire(b, `g${k}`, 'rows', `t${k}`, 'rows'); });
    placeBlock(b, 'gauntlet.approved', 0, 0, {}, 'ok'); b.nodes.ok!.label = 'Approved so far'; wire(b, `g${gates.length - 1}`, 'approved', 'ok', 'after');
    placeBlock(b, 'on.event', 0, 0, { kind: 'approved' }, 'heard'); b.nodes.heard!.label = 'When something is approved'; wire(b, `g${gates.length - 1}`, 'approved', 'heard', 'after');
    placeBlock(b, 'unknown.queue', 0, 0, {}, 'queue'); b.nodes.queue!.label = 'Unknown library queue, sorted by what they share'; wire(b, `g${gates.length - 1}`, 'approved', 'queue', 'after');
    placeBlock(b, 'make.sensor', 0, 0, { body: 'puck', element: 'piezo', name: 'knock sensor', item: 'knock-sensor-puck' }, 'sens'); b.nodes.sens!.label = 'A sensor, from the one sensor node';
    placeBlock(b, 'research.loop', 0, 0, { rounds: 8 }, 'loop'); b.nodes.loop!.label = 'Research loop, to the bottom'; wire(b, 'sens', 'sensor', 'loop', 'drawing');
    placeBlock(b, 'view.table', 0, 0, {}, 'rounds'); b.nodes.rounds!.label = 'Each round: found, resolved, left'; wire(b, 'loop', 'rounds', 'rounds', 'rows');
    placeBlock(b, 'task', 0, 0, { list: true }, 'tasks'); b.nodes.tasks!.label = 'Tasks left'; wire(b, 'g5', 'approved', 'tasks', 'done');
    placeBlock(b, 'view.table', 0, 0, {}, 'taskRows'); b.nodes.taskRows!.label = 'Tasks'; wire(b, 'tasks', 'tasks', 'taskRows', 'rows');
    placeBlock(b, 'read', 0, 0, { id: 'make.wound', kind: 'block' }, 'read'); b.nodes.read!.label = 'Read a block';
    placeBlock(b, 'test.block', 0, 0, { id: 'make.wound' }, 'tester'); b.nodes.tester!.label = 'Tester';
    placeBlock(b, 'search.library', 0, 0, { q: 'sensor' }, 'search'); b.nodes.search!.label = 'Search what is known';
    placeBlock(b, 'delete', 0, 0, { what: 'block', really: false }, 'del'); b.nodes.del!.label = 'Delete (only says, until told)'; wire(b, 'g2', 'rejected', 'del', 'ids');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'sens', 'sensor', 'show', 'thing');
    return b;
  }],
  ['The 6502 from its transistors: a real program run switch by switch, checked against its fast model', () => {
    // the MOS 6502 as the Visual 6502 team traced it from the die (fetched from its source: its data is CC BY-NC-SA):
    // each transistor a switch, each gate read from its pull-down network and characterised at switch level; a program
    // assembled and run on the transistors half a clock at a time, and beside them on the fast model (the instruction set
    // as its manual gives it), compared instruction by instruction; the rate measured. What the sieve leaves in memory
    // is drawn: a byte a tile, the primes lit
    const b = emptyBoard('The 6502 from its transistors');
    placeBlock(b, 'netlist', 0, 0, { chip: '6502' }, 'chip'); b.nodes.chip!.label = 'The MOS 6502, its transistors';
    placeBlock(b, 'view.table', 0, 0, {}, 'cells'); b.nodes.cells!.label = 'Its gates, read from the netlist'; wire(b, 'chip', 'cells', 'cells', 'rows');
    placeBlock(b, 'cell.characterise', 0, 0, { rank: 3 }, 'nor'); b.nodes.nor!.label = 'Its commonest NOR, at switch level'; wire(b, 'chip', 'netlist', 'nor', 'netlist');
    placeBlock(b, 'view.table', 0, 0, {}, 'truth'); b.nodes.truth!.label = 'Its truth table'; wire(b, 'nor', 'table', 'truth', 'rows');
    placeBlock(b, 'logic.run', 0, 0, { program: 'primes', most: 20000, page: '10' }, 'run'); b.nodes.run!.label = 'The primes below 200, on its transistors'; wire(b, 'chip', 'netlist', 'run', 'netlist');
    placeBlock(b, 'view.table', 0, 0, {}, 'regs'); b.nodes.regs!.label = 'Its registers at the end'; wire(b, 'run', 'registers', 'regs', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'diff'); b.nodes.diff!.label = 'Where the fast model differs from the transistors'; wire(b, 'run', 'differences', 'diff', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it did, and how fast'; wire(b, 'run', 'says', 'said', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'run', 'memory', 'show', 'thing');
    return b;
  }],
  ['Proximity and mates: each thing carries the room and the mates it needs, as numbers; nothing told what a door or a sofa is', () => {
    // no rule for doors: each node puts the room its thing needs on the thing itself, worked out from its own figures (a
    // door its leaf's sweep from its hinge, the leaf's width its radius; a toilet and a basin the floor a code asks in
    // front of them; a kitchen run its work aisle), and one proximity node keeps every zone clear: what stands in one is
    // moved along its wall with what touches it, or to another wall, where it stands in no zone and its own hold nothing.
    // Here a living room whose door is behind the television, before and after; the zones drawn
    const b = emptyBoard('Proximity');
    placeBlock(b, 'seed.room', 0, 0, { type: 'living', front: 'wall', back: 'door' }, 'room'); b.nodes.room!.label = 'A living room, its door in its back wall';
    placeBlock(b, 'proximity', 0, 0, { move: 'only said' }, 'said'); b.nodes.said!.label = 'What stands in a zone (said)'; wire(b, 'room', 'room', 'said', 'thing');
    placeBlock(b, 'proximity', 0, 0, { move: 'moved' }, 'moved'); b.nodes.moved!.label = 'Every zone clear, every mate held (moved)'; wire(b, 'room', 'room', 'moved', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'rows'); b.nodes.rows!.label = 'What broke which zone or mate, and what was done'; wire(b, 'moved', 'found', 'rows', 'rows');
    placeBlock(b, 'mates', 0, 0, { state: '*' }, 'measured'); b.nodes.measured!.label = 'Its mates, measured after'; wire(b, 'moved', 'thing', 'measured', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'mrows'); b.nodes.mrows!.label = 'Each mate: its measure, its value, its range'; wire(b, 'measured', 'mates', 'mrows', 'rows');
    placeBlock(b, 'pick', 0, 0, { options: 'before|after', which: 'after' }, 'pick'); b.nodes.pick!.label = 'Before or after'; wire(b, 'said', 'thing', 'pick', 'before'); wire(b, 'moved', 'thing', 'pick', 'after');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'pick', 'chosen', 'show', 'thing');
    return b;
  }],
  ['A body from its measured segments, its math on every part', () => {
    // a human body as numbers: laid out from its height (Drillis and Contini), each of its sixteen segments the share of
    // its mass de Leva measured, the long limbs tapered so each centre of mass is where he measured it; each part carries
    // its mass, length, centre and moments of inertia, set beside the measured ones; its joints with their AAOS ranges
    const b = emptyBoard('A body from its measured segments');
    placeBlock(b, 'body', 0, 0, { height: 1.75, mass: 75, sex: 'male', pose: 'standing' }, 'man'); b.nodes.man!.label = 'A man, 1.75 m, 75 kg, standing';
    placeBlock(b, 'body', 0, 0, { height: 1.63, mass: 60, sex: 'female', pose: 'walking' }, 'woman'); b.nodes.woman!.label = 'A woman, 1.63 m, 60 kg, walking';
    placeBlock(b, 'body', 0, 0, { height: 1.75, mass: 75, sex: 'male', pose: 'reaching' }, 'reach'); b.nodes.reach!.label = 'Reaching';
    placeBlock(b, 'view.table', 0, 0, {}, 'segs'); b.nodes.segs!.label = 'Each segment: mass, length, centre, inertia (worked out, and measured)'; wire(b, 'man', 'segments', 'segs', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'joints'); b.nodes.joints!.label = 'Each joint: its range, its torque'; wire(b, 'man', 'joints', 'joints', 'rows');
    placeBlock(b, 'place', 0, 0, { x: 0.8 }, 'w2'); wire(b, 'woman', 'body', 'w2', 'thing');
    placeBlock(b, 'place', 0, 0, { x: -0.8 }, 'r2'); wire(b, 'reach', 'body', 'r2', 'thing');
    placeBlock(b, 'combine', 0, 0, {}, 'all'); wire(b, 'man', 'body', 'all', 'things'); wire(b, 'w2', 'placed', 'all', 'things'); wire(b, 'r2', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Metals, coloured by their physics: fourteen polished metals, each its colour worked out from how it reflects every wavelength of daylight, none chosen', () => {
    // each metal's colour from its measured n + i k (docs/REALITY.md phase 3): Fresnel, the CIE 1931 eye, daylight, sRGB
    const b = emptyBoard('Metals, coloured by their physics');
    const metals = ['silver', 'aluminium', 'platinum', 'palladium', 'nickel', 'cobalt', 'zinc', 'lead', 'titanium', 'chromium', 'iron', 'tungsten', 'copper', 'gold'];
    metals.forEach((m, k) => {
      placeBlock(b, 'optics.colour', 0, 0, { metal: m }, `c${k}`); b.nodes[`c${k}`]!.label = `${m[0]!.toUpperCase()}${m.slice(1)}: why it is its colour`;
      placeBlock(b, 'shape.sphere', 0, 0, { name: m, mat: 'steel-low', finish: 'chrome', r: 0.03 }, `s${k}`); wire(b, `c${k}`, 'hex', `s${k}`, 'color');
      placeBlock(b, 'place', 0, 0, { x: (k % 7) * 0.075 - 0.225, y: 0.03, z: Math.floor(k / 7) * 0.08 }, `p${k}`); wire(b, `s${k}`, 'part', `p${k}`, 'thing');
    });
    placeBlock(b, 'combine', 0, 0, { name: 'fourteen metals' }, 'all'); metals.forEach((_, k) => wire(b, `p${k}`, 'placed', 'all', 'things'));
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back row: silver to cobalt … front: the rest, gold last'; wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Copper: why'; wire(b, 'c12', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Steel, finished five ways: turned, ground, polished, bead blasted and sand cast, each surface\'s roughness and gloss worked out from how it was made, its colour from iron\'s optics', () => {
    // how a surface looks is how it was made (docs/REALITY.md phase 3.3): the tool's marks set its roughness, its facets'
    // slopes how wide the highlight spreads; the metal's own optics its colour
    const b = emptyBoard('Steel, finished five ways');
    placeBlock(b, 'optics.colour', 0, 0, { metal: 'iron' }, 'fe'); b.nodes.fe!.label = 'Iron: its colour';
    const ways = ['turned', 'ground', 'polished', 'bead blasted', 'sand cast'];
    ways.forEach((w, k) => {
      placeBlock(b, 'surface.finish', 0, 0, { process: w }, `f${k}`); b.nodes[`f${k}`]!.label = `${w[0]!.toUpperCase()}${w.slice(1)}: its surface`;
      placeBlock(b, 'shape.cyl', 0, 0, { name: `${w} bar`, mat: 'steel-low', r: 0.02, h: 0.16 }, `s${k}`); wire(b, 'fe', 'hex', `s${k}`, 'color'); wire(b, `f${k}`, 'finish', `s${k}`, 'finish');
      placeBlock(b, 'place', 0, 0, { x: k * 0.07 - 0.14, y: 0.08 }, `p${k}`); wire(b, `s${k}`, 'part', `p${k}`, 'thing');
    });
    placeBlock(b, 'combine', 0, 0, { name: 'five finishes' }, 'all'); ways.forEach((_, k) => wire(b, `p${k}`, 'placed', 'all', 'things'));
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Left to right: turned, ground, polished, bead blasted, sand cast'; wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Turned: why it shines in a streak'; wire(b, 'f0', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Colours with no dye: titanium anodised from 10 to 100 volts, and steel tempered as its oxide thickens, each colour worked out from light crossing a film of oxide', () => {
    // a film on a metal (docs/REALITY.md phase 3.3): the colour is the film's thickness, by interference
    const b = emptyBoard('Colours with no dye');
    const rows: [string, Record<string, unknown>, string][] = [
      ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v): [string, Record<string, unknown>, string] => [`ti${v}`, { metal: 'titanium', film: 'TiO2 (amorphous)', by: 'anodised at a voltage', volts: v }, `Titanium, ${v} V`]),
      ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((d): [string, Record<string, unknown>, string] => [`fe${d}`, { metal: 'iron', film: 'Fe3O4 (magnetite)', by: 'given in nm', d }, `Steel, oxide ${d} nm`])];
    rows.forEach(([id, set, label], k) => {
      placeBlock(b, 'optics.film', 0, 0, set, `c_${id}`); b.nodes[`c_${id}`]!.label = label;
      placeBlock(b, 'shape.cyl', 0, 0, { name: label, mat: k < 10 ? 'titanium' : 'steel-low', finish: 'polished', r: 0.025, h: 0.006 }, `s_${id}`); wire(b, `c_${id}`, 'hex', `s_${id}`, 'color');
      placeBlock(b, 'place', 0, 0, { x: (k % 10) * 0.06 - 0.27, y: 0.003, z: k < 10 ? -0.04 : 0.04 }, `p_${id}`); wire(b, `s_${id}`, 'part', `p_${id}`, 'thing');
    });
    placeBlock(b, 'combine', 0, 0, { name: 'coupons' }, 'all'); rows.forEach(([id]) => wire(b, `p_${id}`, 'placed', 'all', 'things'));
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: titanium, 10 to 100 V; front: steel, oxide 0 to 90 nm'; wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Titanium at 30 V: why it is blue'; wire(b, 'c_ti30', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['One shape, eight looks: bare steel, aluminium and copper coloured by their optics, titanium anodised, steel heat tinted, a solid paint under clear coat, a metallic paint, and the same paint worn', () => {
    // a part's look as layers (docs/REALITY.md phase 3.4): the substrate worked out, everything over it editable
    const b = emptyBoard('One shape, eight looks');
    const looks: [string, string, Record<string, unknown>, string][] = [
      ['steel', 'steel-low', { finish: 'polished' }, 'Steel, bare: iron\'s optics'], ['al', 'al-6061', {}, 'Aluminium, bare'], ['cu', 'copper', {}, 'Copper, bare'],
      ['ti', 'titanium', { treatment: 'anodised at a voltage', volts: 30 }, 'Titanium anodised at 30 V'], ['tint', 'steel-low', { treatment: 'an oxide film', film: 'Fe3O4 (magnetite)', d: 45 }, 'Steel heat tinted, 45 nm of oxide'],
      ['red', 'steel-low', { coat: 'solid paint', paint: '#b3122b' }, 'Solid red under clear coat'], ['blue', 'al-6061', { coat: 'metallic paint', paint: '#1d3f8f', flake: 0.5 }, 'Metallic blue, half flake'], ['worn', 'steel-low', { coat: 'solid paint', paint: '#b3122b', wear: 0.6 }, 'The red, worn']];
    looks.forEach(([id, mat, set, label], k) => {
      placeBlock(b, 'shape.sphere', 0, 0, { name: label, mat, color: '#888888', finish: (set.finish as string) ?? 'polished', r: 0.03 }, `s_${id}`);
      const { finish: _f, ...rest } = set; placeBlock(b, 'look', 0, 0, rest, `l_${id}`); b.nodes[`l_${id}`]!.label = label; wire(b, `s_${id}`, 'part', `l_${id}`, 'thing');
      placeBlock(b, 'place', 0, 0, { x: (k % 4) * 0.08 - 0.12, y: 0.03, z: Math.floor(k / 4) * 0.09 - 0.045 }, `p_${id}`); wire(b, `l_${id}`, 'looked', `p_${id}`, 'thing');
    });
    placeBlock(b, 'combine', 0, 0, { name: 'eight looks' }, 'all'); looks.forEach(([id]) => wire(b, `p_${id}`, 'placed', 'all', 'things'));
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: steel, aluminium, copper, titanium anodised; front: heat tint, red, metallic blue, worn red'; wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'The anodised one: why'; wire(b, 'l_ti', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Paint jobs and wear: a striped panel new and worn, a two-tone drum, bare steel rusting in its hollows, the wear drawn where the shape puts it', () => {
    // graphics and wear as layers of a look (docs/REALITY.md phase 3.4): a coat chips off where the surface is most
    // convex, bare iron rusts where it is hollow, both read from the shape itself
    const b = emptyBoard('Paint jobs and wear');
    const stripe = { coat: 'solid paint', paint: '#b3122b', g1: 'stripe', g1axis: 'x', g1at: 0, g1width: 0.02, g1colour: '#f2f2f2', g2: 'stripe', g2axis: 'x', g2at: 0.025, g2width: 0.006, g2colour: '#f2f2f2' };
    const items: [string, string, Record<string, unknown>, Record<string, unknown>, string][] = [
      ['new', 'shape.box', { w: 0.12, h: 0.04, d: 0.08 }, stripe, 'Red, white stripes, new'],
      ['worn', 'shape.box', { w: 0.12, h: 0.04, d: 0.08 }, { ...stripe, wear: 0.7 }, 'The same, worn: chipped at its edges'],
      ['two', 'shape.cyl', { r: 0.035, h: 0.09 }, { coat: 'solid paint', paint: '#1d3f8f', g1: 'two-tone above', g1axis: 'y', g1at: 0.005, g1colour: '#ece8dc' }, 'Two-tone drum'],
      ['twow', 'shape.cyl', { r: 0.035, h: 0.09 }, { coat: 'solid paint', paint: '#1d3f8f', g1: 'two-tone above', g1axis: 'y', g1at: 0.005, g1colour: '#ece8dc', wear: 0.6 }, 'The drum, worn'],
      ['tube', 'shape.tube', { r: 0.03, wall: 0.006, h: 0.11 }, { wear: 0.7 }, 'Bare steel tube, rusting'],
      ['ring', 'shape.torus', { R: 0.035, r: 0.012 }, { coat: 'metallic paint', paint: '#2f6b3a', flake: 0.5, wear: 0.5 }, 'Metallic green ring, worn']];
    items.forEach(([id, shape, size, look, label], k) => {
      placeBlock(b, shape, 0, 0, { name: label, mat: 'steel-low', color: '#888888', finish: 'ground', ...size }, `s_${id}`);
      placeBlock(b, 'look', 0, 0, look, `l_${id}`); b.nodes[`l_${id}`]!.label = label; wire(b, `s_${id}`, 'part', `l_${id}`, 'thing');
      placeBlock(b, 'place', 0, 0, { x: (k % 3) * 0.16 - 0.16, y: 0.05, z: Math.floor(k / 3) * 0.14 - 0.07, ...(shape === 'shape.tube' ? { rz: Math.PI / 2 } : {}) }, `p_${id}`); wire(b, `l_${id}`, 'looked', `p_${id}`, 'thing');
    });
    placeBlock(b, 'combine', 0, 0, { name: 'paint and wear' }, 'all'); items.forEach(([id]) => wire(b, `p_${id}`, 'placed', 'all', 'things'));
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: panel new, worn, drum; front: drum worn, tube rusting, ring'; wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'The worn panel: why there'; wire(b, 'l_worn', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Picture to model: the Monte Carlo fitted to the AI-made picture of how its owner wants it, by the one folded node (open it for its steps): its outline, then its features one group at a time; then seen from the picture\'s own camera and judged four ways apart, side by side with the picture, and what to ask for next', () => {
    // (docs/RECONSTRUCT.md: image → features → outline → camera → model → fit → render → compare → ask, folded into one node
    // by the recipe Pipelines tried found best)
    const b = emptyBoard('Picture to model');
    placeBlock(b, 'in.text', 0, 0, { value: 'mc-side' }, 'pic'); b.nodes.pic!.label = 'The picture: how the owner wants their Monte Carlo (AI-made)';
    placeBlock(b, 'seed.image-to-model', 0, 0, {}, 'i2m'); b.nodes.i2m!.label = 'Picture to model'; wire(b, 'pic', 'value', 'i2m', 'picture');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'The model, fitted'; wire(b, 'i2m', 'vehicle', 'show', 'thing');
    for (const [k, l] of [['objectives', 'How right, four ways: silhouette, features, surface, dimensions'], ['orientation', 'Facing the way the picture does?'], ['features', 'Each feature against the model\'s own part'], ['regions', 'Where its edges disagree most'], ['dimensions', 'Its dimensions: the picture\'s, the model\'s, the published'], ['groups', 'Each feature group, before and after'], ['figures', 'Each body figure, and what it rests on'], ['feature figures', 'Each feature figure, and what it rests on'], ['ask', 'What to ask for next']] as const) { placeBlock(b, 'view.show', 0, 0, {}, `v${k}`); b.nodes[`v${k}`]!.label = l; wire(b, 'i2m', k, `v${k}`, 'value'); }
    return tidy(b);
  }],
  ['Fit to a target: one node that sizes anything to what is asked of it: a bar\'s area for a stress, an engine\'s bore for the speed its valves float at; any block, or any pipeline folded into one, its inputs moved within ranges until its outputs meet their goals', () => {
    const b = emptyBoard('Fit to a target');
    placeBlock(b, 'in.number', 0, 0, { value: 5000 }, 'F'); b.nodes.F!.label = 'The load, N';
    placeBlock(b, 'fit.target', 0, 0, { block: 'law.stress.axial', vary: 'A 0.0005..0.01', goals: 'sigma = 2e6', most: 80 }, 'bar'); b.nodes.bar!.label = 'A bar\'s area so it carries the load at 2 MPa'; wire(b, 'F', 'value', 'bar', 'F');
    placeBlock(b, 'fit.target', 0, 0, { block: 'load.engine', vary: 'bore 0.06..0.1', goals: 'floatRpm = 7000', most: 60 }, 'eng'); b.nodes.eng!.label = 'An engine\'s bore so its valves float at 7,000 rpm';
    for (const [k, l] of [['bar', 'The bar'], ['eng', 'The engine']] as const) { placeBlock(b, 'view.show', 0, 0, {}, `${k}Says`); b.nodes[`${k}Says`]!.label = l; wire(b, k, 'says', `${k}Says`, 'value'); placeBlock(b, 'view.show', 0, 0, {}, `${k}Fig`); b.nodes[`${k}Fig`]!.label = `${l}: each value, its ±, fixed or not`; wire(b, k, 'figures', `${k}Fig`, 'value'); }
    return tidy(b);
  }],
  ['Onto a surface: any outline laid onto any thing and following its curve: a vent onto the Monte Carlo\'s hood in tiles, a badge onto its door, each saying how close it keeps to the surface', () => {
    const b = emptyBoard('Onto a surface');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'monte carlo custom' }, 'car'); b.nodes.car!.label = 'The car';
    placeBlock(b, 'onto.surface', 0, 0, { outline: '-0.25,-0.12 0.25,-0.12 0.3,0.12 -0.3,0.12', at: '1.55 2.5 0.3', toward: '0 -1 0', up: '1 0 0', t: 0.006, tile: 0.06, name: 'hood vent', color: '#b3121f', mat: 'abs' }, 'vent'); b.nodes.vent!.label = 'A vent onto its hood, from above, in tiles'; wire(b, 'car', 'vehicle', 'vent', 'thing');
    placeBlock(b, 'onto.surface', 0, 0, { outline: '-0.12,-0.03 0.12,-0.03 0.12,0.03 -0.12,0.03', at: '0.3 0.75 -2', toward: '0 0 1', up: '0 1 0', t: 0.003, name: 'door badge', color: '#d8dce0', mat: 'al-6061' }, 'badge'); b.nodes.badge!.label = 'A badge onto its left door'; wire(b, 'vent', 'with', 'badge', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'badge', 'with', 'show', 'thing');
    for (const k of ['vent', 'badge']) { placeBlock(b, 'view.show', 0, 0, {}, `${k}Says`); wire(b, k, 'says', `${k}Says`, 'value'); }
    return tidy(b);
  }],
  ['Pipelines tried: every recipe for fitting a model to a picture run on the Monte Carlo\'s, each judged alike (overlap, error both ways, time), the best kept for Picture to model', () => {
    const b = emptyBoard('Pipelines tried');
    placeBlock(b, 'photo.load', 0, 0, { id: 'mc-side' }, 'ph'); b.nodes.ph!.label = 'The picture';
    placeBlock(b, 'photo.features', 0, 0, { r: 5 }, 'ft'); wire(b, 'ph', 'image', 'ft', 'image'); wire(b, 'ph', 'marks', 'ft', 'marks');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'monte carlo custom' }, 'car');
    placeBlock(b, 'camera.solve', 0, 0, {}, 'cam'); wire(b, 'ft', 'features', 'cam', 'features'); wire(b, 'car', 'machine', 'cam', 'machine'); wire(b, 'ph', 'w', 'cam', 'w'); wire(b, 'ph', 'h', 'cam', 'h');
    placeBlock(b, 'recon.search', 0, 0, {}, 'try'); b.nodes.try!.label = 'Every recipe, judged alike'; wire(b, 'ph', 'image', 'try', 'image'); wire(b, 'ft', 'features', 'try', 'features'); wire(b, 'car', 'machine', 'try', 'machine'); wire(b, 'cam', 'camera', 'try', 'camera');
    placeBlock(b, 'view.show', 0, 0, {}, 'res'); b.nodes.res!.label = 'Results'; wire(b, 'try', 'results', 'res', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'best'); b.nodes.best!.label = 'Best'; wire(b, 'try', 'best', 'best', 'value');
    return tidy(b);
  }],
  ['Chevrolet Monte Carlo SS (2004), built from its first parts: its 3.8 L V6 and four-speed automatic drawn piece by piece, checked that nothing runs into anything and that it comes apart to the bottom', () => {
    // a real car by its published figures (machines.ts, each sourced or said to be an estimate), built from its parts
    const b = emptyBoard('Chevrolet Monte Carlo SS (2004)');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'monte carlo' }, 'car'); b.nodes.car!.label = 'Monte Carlo SS (2004): its published figures';
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'The car'; wire(b, 'car', 'vehicle', 'show', 'thing');
    placeBlock(b, 'check.rules', 0, 0, {}, 'rules'); b.nodes.rules!.label = 'Nothing runs into anything, nothing too hot?'; wire(b, 'car', 'vehicle', 'rules', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'rulesSay'); wire(b, 'rules', 'says', 'rulesSay', 'value');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'apart'); b.nodes.apart!.label = 'Comes apart to the bottom?'; wire(b, 'car', 'vehicle', 'apart', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'apartSay'); wire(b, 'apart', 'says', 'apartSay', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'mass'); b.nodes.mass!.label = 'Mass drawn (kg)'; wire(b, 'car', 'mass', 'mass', 'value');
    return tidy(b);
  }],
  ['Materials from their phases: carbon fibre and epoxy, thermal paste and a metal foam worked out from what goes into them, and a laminate bar beside a steel one', () => {
    // a material is what goes into it and how it is arranged (docs/REALITY.md phase 2.4): each worked out, not looked up
    const b = emptyBoard('Materials from their phases');
    placeBlock(b, 'mixture', 0, 0, { phases: 'carbon-fibre-t300 0.6, epoxy 0.4', arrangement: 'aligned fibres' }, 'cfrp'); b.nodes.cfrp!.label = 'Carbon fibre and epoxy, 60 % fibre, unidirectional';
    placeBlock(b, 'view.table', 0, 0, {}, 'cfrpt'); b.nodes.cfrpt!.label = 'Its properties, each with its bounds and method'; wire(b, 'cfrp', 'properties', 'cfrpt', 'rows');
    placeBlock(b, 'mixture', 0, 0, { phases: 'silicone 0.4, alumina 0.6', arrangement: 'particles', matrix: 'silicone' }, 'paste'); b.nodes.paste!.label = 'Thermal paste: alumina in silicone, 60 %';
    placeBlock(b, 'view.table', 0, 0, {}, 'pastet'); wire(b, 'paste', 'properties', 'pastet', 'rows');
    placeBlock(b, 'mixture', 0, 0, { phases: 'al-6061 1', arrangement: 'open foam', porosity: 0.9 }, 'foam'); b.nodes.foam!.label = 'Aluminium foam, 10 % dense';
    placeBlock(b, 'view.table', 0, 0, {}, 'foamt'); wire(b, 'foam', 'properties', 'foamt', 'rows');
    // the laminate as a part: a 1 m bar of it beside one of steel, each pushed 10 N sideways at its top
    for (const [id, mat, colour, x] of [['lam', 'cfrp-ud-60', '#2b2b2e', -0.05], ['stl', 'steel-low', '#7a8088', 0.05]] as const) {
      placeBlock(b, 'shape.box', 0, 0, { name: `${mat} bar`, mat, color: colour, finish: 'satin', w: 0.02, h: 1, d: 0.02 }, id);
      placeBlock(b, 'place', 0, 0, { x, y: 0.5 }, `${id}p`); wire(b, id, 'part', `${id}p`, 'thing');
      placeBlock(b, 'bend', 0, 0, { load: 10, dir: '+x', slices: 16 }, `${id}b`); wire(b, `${id}p`, 'placed', `${id}b`, 'thing');
      placeBlock(b, 'view.show', 0, 0, {}, `${id}s`); wire(b, `${id}b`, 'says', `${id}s`, 'value');
      placeBlock(b, 'space.show', 0, 0, {}, `${id}v`); wire(b, `${id}b`, 'seen', `${id}v`, 'thing');
    }
    b.nodes.lamb!.label = 'The laminate bar, 10 N sideways'; b.nodes.stlb!.label = 'The steel bar, 10 N sideways';
    return tidy(b);
  }],
  ['What it is made of, and what it carries: a copper and an aluminium rod side by side under a steel block, opened down to its elements, weighed and balanced, and as a path for heat, current and force', () => {
    // any thing opened as its materials (docs/REALITY.md, step 7): the same three pieces read as what they are made of,
    // their mass, centre and inertia, and as a path: the rods side by side (a + between them), then the block, along y
    const b = emptyBoard('What it is made of, and what it carries');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'copper rod', mat: 'copper', color: '#b87333', finish: 'machined', r: 0.006, h: 0.2 }, 'cu'); b.nodes.cu!.label = 'Copper rod, 12 mm, 200 mm long';
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'aluminium rod', mat: 'al-6061', color: '#b0b8c0', finish: 'machined', r: 0.006, h: 0.2 }, 'al'); b.nodes.al!.label = 'Aluminium rod (6061), 12 mm, 200 mm long';
    placeBlock(b, 'shape.box', 0, 0, { name: 'steel block', mat: 'steel-low', color: '#6d7278', finish: 'machined', w: 0.06, h: 0.03, d: 0.03 }, 'st'); b.nodes.st!.label = 'Steel block on top';
    placeBlock(b, 'place', 0, 0, { x: -0.015, y: 0.1 }, 'pcu'); wire(b, 'cu', 'part', 'pcu', 'thing');
    placeBlock(b, 'place', 0, 0, { x: 0.015, y: 0.1 }, 'pal'); wire(b, 'al', 'part', 'pal', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 0.215 }, 'pst'); wire(b, 'st', 'part', 'pst', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'two rods and a block' }, 'all'); for (const x of ['pcu', 'pal', 'pst']) wire(b, x, 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'made.of', 0, 0, {}, 'made'); wire(b, 'all', 'assembly', 'made', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'mats'); b.nodes.mats!.label = 'By material'; wire(b, 'made', 'materials', 'mats', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'els'); b.nodes.els!.label = 'By element'; wire(b, 'made', 'elements', 'els', 'rows');
    placeBlock(b, 'mass.properties', 0, 0, {}, 'mp'); wire(b, 'all', 'assembly', 'mp', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'mps'); b.nodes.mps!.label = 'Its mass, centre and inertia'; wire(b, 'mp', 'says', 'mps', 'value');
    placeBlock(b, 'graph', 0, 0, {}, 'touch'); wire(b, 'all', 'assembly', 'touch', 'thing');
    placeBlock(b, 'flow', 0, 0, { what: 'heat', from: 'steel block', to: 'the lowest pieces', drive: 50 }, 'heat'); b.nodes.heat!.label = 'Heat from the block down the rods, 50 K across'; wire(b, 'all', 'assembly', 'heat', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'temps'); b.nodes.temps!.label = 'Each piece\'s temperature'; wire(b, 'heat', 'pieces', 'temps', 'rows');
    placeBlock(b, 'bend', 0, 0, { load: 100, dir: '+x', at: 'steel block', held: 'the lowest pieces' }, 'bent'); b.nodes.bent!.label = 'Pushed sideways at the block, 100 N (the copper rod yields at 184)'; wire(b, 'all', 'assembly', 'bent', 'thing');
    placeBlock(b, 'bend', 0, 0, { load: 0, warmed: 50, held: 'the lowest pieces', at: 'steel block' }, 'warm'); b.nodes.warm!.label = 'Warmed 50 K: copper and aluminium grow apart under the block'; wire(b, 'all', 'assembly', 'warm', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'warmsays'); b.nodes.warmsays!.label = 'What warming does'; wire(b, 'warm', 'says', 'warmsays', 'value');
    placeBlock(b, 'place', 0, 0, { x: -0.15 }, 'aside2'); wire(b, 'bent', 'seen', 'aside2', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'bentshow'); b.nodes.bentshow!.label = 'Seen bent: movements exaggerated, red moves most'; wire(b, 'aside2', 'placed', 'bentshow', 'thing');
    placeBlock(b, 'thermal', 0, 0, { hot: '', heated: 'steel block', power: 5 }, 'therm'); b.nodes.therm!.label = '5 W into the block, cooled by the air: how hot each piece gets'; wire(b, 'all', 'assembly', 'therm', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'thermt'); b.nodes.thermt!.label = 'Each piece, steady'; wire(b, 'therm', 'pieces', 'thermt', 'rows');
    placeBlock(b, 'place', 0, 0, { x: 0.3 }, 'aside3'); wire(b, 'therm', 'seen', 'aside3', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'thermshow'); b.nodes.thermshow!.label = 'Seen: the block 5 W warm, the rods carrying it down'; wire(b, 'aside3', 'placed', 'thermshow', 'thing');
    placeBlock(b, 'place', 0, 0, { x: 0.15 }, 'aside'); b.nodes.aside!.label = 'Beside it'; wire(b, 'heat', 'seen', 'aside', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'hot'); b.nodes.hot!.label = 'Seen: hot red at the block, cold blue at the rods\' feet'; wire(b, 'aside', 'placed', 'hot', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'contacts'); b.nodes.contacts!.label = 'What touches what, read from the geometry'; wire(b, 'touch', 'edges', 'contacts', 'rows');
    return b;
  }],
  ['Two agents: one goes to sit, opening the way; one keeps within a lead\'s length of it', () => {
    // goals on any thing (docs/LIFE.md step 6): the adult is told only "go to what lets you sit, anywhere in the house";
    // the sofa is behind a shut door, so it opens the doors it sees on its way, nearest first, until it has a way, then
    // stands within reach of the sofa. The child is wired to follow it and told only to stay 0.5 to 1.5 m from it (a
    // lead's length): it goes after it no faster than its own pace, and says how much of the time it kept within
    const b = emptyBoard('Two agents');
    placeBlock(b, 'seed.house', 0, 0, { show: 'roof off' }, 'house'); b.nodes.house!.label = 'A house, its roof off to see in';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'goal', 0, 0, { verb: 'go to', open: 'sofa', affords: 'sit', knows: 'all that is here (a place it knows)' }, 'sit'); b.nodes.sit!.label = 'Go to the sofa, anywhere in the house';
    placeBlock(b, 'agent', 0, 0, { who: 'adult' }, 'adult'); b.nodes.adult!.label = 'An adult';
    wire(b, 'house', 'house', 'adult', 'thing'); wire(b, 'sit', 'goal', 'adult', 'goal'); wire(b, 'clock', 't', 'adult', 't');
    placeBlock(b, 'in.number', 0, 0, { value: 1.5 }, 'lead'); b.nodes.lead!.label = 'A lead\'s length, m (typical)';
    placeBlock(b, 'goal', 0, 0, { verb: 'go to', open: '', least: 0.5 }, 'near'); b.nodes.near!.label = 'Stay within the lead of it';
    wire(b, 'lead', 'value', 'near', 'most');
    placeBlock(b, 'agent', 0, 0, { who: 'child' }, 'child'); b.nodes.child!.label = 'A child, following';
    wire(b, 'house', 'house', 'child', 'thing'); wire(b, 'near', 'goal', 'child', 'goal'); wire(b, 'adult', 'plan', 'child', 'follows'); wire(b, 'clock', 't', 'child', 't');
    placeBlock(b, 'view.table', 0, 0, {}, 'steps'); b.nodes.steps!.label = 'The adult\'s plan, step by step'; wire(b, 'adult', 'steps', 'steps', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'kept'); b.nodes.kept!.label = 'How the child kept up'; wire(b, 'child', 'says', 'kept', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'found'); b.nodes.found!.label = 'What they found'; wire(b, 'child', 'findings', 'found', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'child', 'view', 'show', 'thing');
    return b;
  }],
  ['An agent opens a door: it sees it, walks to it, takes hold, pulls; the door swings in the physics', () => {
    // nothing placed by hand: the person stands where people pass (the middle of the hall), sees by its rays the doors it
    // can open, reads each door (its hinge line through its hinges' knuckles, which side it swings to, the handle on its
    // side), finds where to stand beside the handle (clear of the door's sweep, in reach, where the handle stays in reach
    // longest), walks there by the router's clear way, reaches (Fitts' law), grasps, pulls the bedroom door toward it, or
    // pushes the front door out, with the 22.2 N a door may ask (ADA), and lets go; the door swings on its hinges in Jolt and
    // stops on its stop. The clock plays it
    const b = emptyBoard('An agent opens a door');
    placeBlock(b, 'seed.house', 0, 0, { show: 'roof off' }, 'house'); b.nodes.house!.label = 'A house, its roof off to see in';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'goal', 0, 0, { open: '^door$', which: 'nearest' }, 'near'); b.nodes.near!.label = 'Open the nearest door it sees';
    placeBlock(b, 'goal', 0, 0, { open: '^door$', which: 'farthest' }, 'far'); b.nodes.far!.label = 'Open the farthest door it sees';
    placeBlock(b, 'pick', 0, 0, { options: 'the nearest (a bedroom\'s, pulled)|the farthest (the front door, pushed)', which: 'the nearest (a bedroom\'s, pulled)' }, 'pick'); b.nodes.pick!.label = 'Which goal';
    wire(b, 'near', 'goal', 'pick', 'the nearest (a bedroom\'s, pulled)'); wire(b, 'far', 'goal', 'pick', 'the farthest (the front door, pushed)');
    placeBlock(b, 'agent', 0, 0, { who: 'adult' }, 'agent'); b.nodes.agent!.label = 'An adult';
    wire(b, 'house', 'house', 'agent', 'thing'); wire(b, 'pick', 'chosen', 'agent', 'goal'); wire(b, 'clock', 't', 'agent', 't');
    placeBlock(b, 'view.table', 0, 0, {}, 'steps'); b.nodes.steps!.label = 'Its plan, step by step'; wire(b, 'agent', 'steps', 'steps', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'doing'); b.nodes.doing!.label = 'What it is doing now'; wire(b, 'agent', 'doing', 'doing', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'angle'); b.nodes.angle!.label = 'The door open by, °'; wire(b, 'agent', 'angle', 'angle', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'agent', 'view', 'show', 'thing');
    return b;
  }],
  ['Who notices what: a car running, a person behind it, one at its door, a CO alarm; in the open or shut in a garage', () => {
    // senses as physics, nothing typed: the people stand by what is named (behind the muffler, at the driver's door), facing
    // it; each sees by rays out from its eyes packed as its acuity is, hears the engine over a quiet street, smells the
    // exhaust's hydrocarbons; carbon monoxide has no smell, so it harms unnoticed, and the alarm sounds at 70 ppm. Gases as
    // substances: given off by the engine's breathing at idle (at most what a catalyst car may give), spread in still air,
    // or shut in a 60 m³ garage changed twice in four hours. Lines show what each attends to: sight white, hearing violet,
    // warmth orange, smell yellow, harm red
    const b = emptyBoard('Who notices what');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'gas', 0, 0, { running: 'running', air: 'still' }, 'gas'); b.nodes.gas!.label = 'What it gives off, running, in still air'; wire(b, 'car', 'vehicle', 'gas', 'thing');
    placeBlock(b, 'gas', 0, 0, { running: 'running', air: 'shut in a room', volume: 60, changes: 0.5 }, 'garage'); b.nodes.garage!.label = 'The same, shut in a 60 m³ garage'; wire(b, 'car', 'vehicle', 'garage', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'gasRows'); b.nodes.gasRows!.label = 'Each gas: smelled, harmful, flammable to'; wire(b, 'gas', 'releases', 'gasRows', 'rows');
    placeBlock(b, 'sense', 0, 0, { air: 'still' }, 'open'); b.nodes.open!.label = 'Who notices what, in the open'; wire(b, 'car', 'vehicle', 'open', 'thing');
    placeBlock(b, 'sense', 0, 0, { air: 'shut in a room', minutes: 30 }, 'shut'); b.nodes.shut!.label = 'Who notices what, 30 min shut in'; wire(b, 'car', 'vehicle', 'shut', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'openRows'); b.nodes.openRows!.label = 'Attended, in the open'; wire(b, 'open', 'noticed', 'openRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'shutRows'); b.nodes.shutRows!.label = 'Attended, shut in'; wire(b, 'shut', 'noticed', 'shutRows', 'rows');
    placeBlock(b, 'pick', 0, 0, { options: 'in the open|shut in the garage', which: 'in the open' }, 'pick'); b.nodes.pick!.label = 'Which to see'; wire(b, 'open', 'view', 'pick', 'in the open'); wire(b, 'shut', 'view', 'pick', 'shut in the garage');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The car and who notices what'; wire(b, 'car', 'vehicle', 'scene', 'things'); wire(b, 'pick', 'chosen', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['What things give off and let you do: a house and a car, tagged from what they are', () => {
    // nothing tagged by hand: every part's signature (how far it is seen, heard, felt; hot, heavy, fragile, live, what it
    // smells of) and what it affords a body (grasp, lift, push, open, sit, walk on, drive) read from its size, mass,
    // joints and material against that body; an adult's or a child's. Each affordance outlined in its colour (open
    // blue, grasp green, lift teal, sit orange, step yellow, walk grey, drive violet, hot red); what is made for
    // something it cannot do is said (a cabinet with nothing hinged, a seat with no headroom)
    const b = emptyBoard('What things give off and let you do');
    placeBlock(b, 'seed.house', 0, 0, {}, 'house'); b.nodes.house!.label = 'A house (its plan picked)';
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'pick', 0, 0, { options: 'the house|the car', which: 'the house' }, 'pick'); b.nodes.pick!.label = 'Which to tag'; wire(b, 'house', 'house', 'pick', 'the house'); wire(b, 'car', 'vehicle', 'pick', 'the car');
    placeBlock(b, 'afford', 0, 0, { who: 'adult' }, 'aff'); b.nodes.aff!.label = 'What it lets an adult do'; wire(b, 'pick', 'chosen', 'aff', 'thing');
    placeBlock(b, 'afford', 0, 0, { who: 'child' }, 'affChild'); b.nodes.affChild!.label = 'What it lets a child of 8 do'; wire(b, 'pick', 'chosen', 'affChild', 'thing');
    placeBlock(b, 'signature', 0, 0, {}, 'sig'); b.nodes.sig!.label = 'What it gives off'; wire(b, 'pick', 'chosen', 'sig', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'affRows'); b.nodes.affRows!.label = 'Each part, what it affords, why'; wire(b, 'aff', 'affords', 'affRows', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'sigRows'); b.nodes.sigRows!.label = 'Seen, heard, felt'; wire(b, 'sig', 'signatures', 'sigRows', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'found'); b.nodes.found!.label = 'What it is made for but cannot do'; wire(b, 'aff', 'findings', 'found', 'value');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The thing and its tags'; wire(b, 'pick', 'chosen', 'scene', 'things'); wire(b, 'aff', 'view', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Lines: one section, any material, any route (a battery cable, a road)', () => {
    // cables, hoses, wires, pipes, traces and roads as one thing: a section (layers from the inside out, its core solid or
    // hollow, each layer's material changeable) swept along a way that is found, not drawn. Here the Corolla's battery
    // placed by the solver, then its cable run from the positive post (leaving it sideways, as a terminal does) to the
    // starter along surfaces (hug), sized for the starter's draw over
    // the length it came to; and a road laid over hills, never steeper than 8 %, round what it cannot climb. Pick which
    // the 3D view shows
    const b = emptyBoard('Lines: one section, any route');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'place.solve', 0, 0, { check: 'no' }, 'solve'); b.nodes.solve!.label = 'The battery placed first (out of the exhaust\'s heat)'; wire(b, 'car', 'vehicle', 'solve', 'thing');
    placeBlock(b, 'line', 0, 0, { section: 'cable-2' }, 'cable'); b.nodes.cable!.label = 'Battery cable: copper in XLPE (change its core, its jacket)';
    placeBlock(b, 'route', 0, 0, { from: '^battery and its tray$', fromPort: 'positive', to: '^starter motor$', toPort: 'battery terminal', logic: 'hug', leave: 'square to it (a terminal on a post)' }, 'run'); b.nodes.run!.label = 'Route it: along surfaces, clear of heat'; wire(b, 'solve', 'thing', 'run', 'thing'); wire(b, 'cable', 'section', 'run', 'section');
    placeBlock(b, 'in.number', 0, 0, { value: 200, unit: 'A' }, 'amps'); b.nodes.amps!.label = 'The starter\'s draw, A (typical of a 2 L petrol engine)';
    placeBlock(b, 'size.line', 0, 0, { chassis: 'yes' }, 'size'); b.nodes.size!.label = 'Is it thick enough?'; wire(b, 'amps', 'value', 'size', 'amps'); wire(b, 'run', 'length', 'size', 'length');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine'; wire(b, 'solve', 'thing', 'eng', 'thing');
    placeBlock(b, 'piece', 0, 0, { name: '^battery and its tray$', where: 'where it sits' }, 'bat'); b.nodes.bat!.label = 'The battery'; wire(b, 'solve', 'thing', 'bat', 'thing');
    placeBlock(b, 'combine', 0, 0, {}, 'bay'); b.nodes.bay!.label = 'Engine, battery, cable'; wire(b, 'eng', 'piece', 'bay', 'things'); wire(b, 'bat', 'piece', 'bay', 'things'); wire(b, 'run', 'line', 'bay', 'things');
    placeBlock(b, 'terrain', 0, 0, {}, 'land'); b.nodes.land!.label = 'Hills'; for (const [k, v] of [['w', 200], ['d', 200], ['relief', 6]] as [string, number][]) { placeBlock(b, 'in.number', 0, 0, { value: v }, `land${k}`); wire(b, `land${k}`, 'value', 'land', k); }
    placeBlock(b, 'line', 0, 0, { section: 'road-2' }, 'roadSec'); b.nodes.roadSec!.label = 'A road: asphalt on a base course';
    placeBlock(b, 'route', 0, 0, { from: '-90 -90', fromPort: '', to: '90 90', toPort: '', logic: 'grade' }, 'road'); b.nodes.road!.label = 'Lay it: never steeper than 8 %'; wire(b, 'land', 'ground', 'road', 'thing'); wire(b, 'roadSec', 'section', 'road', 'section');
    placeBlock(b, 'pick', 0, 0, { options: 'the battery cable|the road', which: 'the battery cable' }, 'pick'); b.nodes.pick!.label = 'Which to see';
    wire(b, 'bay', 'assembly', 'pick', 'the battery cable'); wire(b, 'road', 'with', 'pick', 'the road');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'pick', 'chosen', 'show', 'thing');
    return b;
  }],
  ['The autopilot on the Corolla: checked, repaired, checked again, what is left named', () => {
    // the Corolla as it was made, checked by the rules; what is wrong grouped into problems and each tried with the
    // repairs, least costly first (nudge it clear, route a line again, move it by the solver, a heat shield between), a
    // repair kept only if its problem is gone and the parts it changed have less wrong than before; then the whole checked
    // again. Nothing typed by hand. What no repair clears is a named task with why. The 3D view: the engine, the battery
    // where it was moved, and the upper hose routed again, clear of the exhaust's heat
    const b = emptyBoard('The autopilot on the Corolla');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'repair.library', 0, 0, {}, 'lib'); b.nodes.lib!.label = 'The repairs it may make';
    placeBlock(b, 'view.table', 0, 0, {}, 'libRows'); wire(b, 'lib', 'repairs', 'libRows', 'rows');
    placeBlock(b, 'auto.loop', 0, 0, {}, 'auto'); b.nodes.auto!.label = 'Autopilot'; wire(b, 'car', 'vehicle', 'auto', 'thing'); wire(b, 'lib', 'library', 'auto', 'library');
    placeBlock(b, 'view.table', 0, 0, {}, 'tried'); b.nodes.tried!.label = 'Every repair tried'; wire(b, 'auto', 'attempts', 'tried', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'left'); b.nodes.left!.label = 'What is left, and why'; wire(b, 'auto', 'tasks', 'left', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); wire(b, 'auto', 'says', 'said', 'value');
    for (const [k, name, label] of [['eng', '^petrol engine', 'The engine'], ['bat', '^battery and its tray$', 'The battery, moved'], ['hose', '^upper hose$', 'The upper hose']] as [string, string, string][]) {
      placeBlock(b, 'piece', 0, 0, { name, where: 'where it sits' }, k); b.nodes[k]!.label = label; wire(b, 'auto', 'thing', k, 'thing');
    }
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'What the autopilot changed'; for (const k of ['eng', 'bat', 'hose']) wire(b, k, 'piece', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['A battery placed by the solver: where it goes, why, and what it gives up', () => {
    // the Corolla's battery placed from what it needs, not typed: taken out, the bay mapped without it (heat, motion,
    // reach), every place it fits standing on something and under the hood tried at each quarter turn; held to what it
    // must have (no cell over the 80 °C its separators stand, none in what moves), the cheapest of the rest chosen (cool,
    // a hand reaching its top, near its starter, little moved). Beside it: why, the next best and what each gives up, the
    // rule findings before and after, and the battery its engine's duty calls for. The 3D view: the engine, the battery
    // where the solver put it, and the heat round it
    const b = emptyBoard('A battery placed by the solver');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'place.solve', 0, 0, {}, 'solve'); b.nodes.solve!.label = 'Place the battery'; wire(b, 'car', 'vehicle', 'solve', 'thing');
    placeBlock(b, 'explain', 0, 0, {}, 'why'); b.nodes.why!.label = 'Why there'; wire(b, 'solve', 'placed', 'why', 'value');
    placeBlock(b, 'view.show', 0, 0, {}, 'whyShow'); wire(b, 'why', 'lines', 'whyShow', 'value');
    placeBlock(b, 'view.table', 0, 0, {}, 'others'); b.nodes.others!.label = 'The next best places'; wire(b, 'solve', 'others', 'others', 'rows');
    placeBlock(b, 'size.select', 0, 0, {}, 'size'); b.nodes.size!.label = 'The battery its engine calls for'; wire(b, 'car', 'vehicle', 'size', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'groups'); b.nodes.groups!.label = 'Every group, weighed'; wire(b, 'size', 'options', 'groups', 'rows');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine'; wire(b, 'solve', 'thing', 'eng', 'thing');
    placeBlock(b, 'piece', 0, 0, { name: '^battery and its tray$', where: 'where it sits' }, 'bat'); b.nodes.bat!.label = 'The battery, where it was put'; wire(b, 'solve', 'thing', 'bat', 'thing');
    placeBlock(b, 'field', 0, 0, { kind: 'heat', grow: 0.25 }, 'heat'); b.nodes.heat!.label = 'Map: heat, the battery moved'; wire(b, 'solve', 'thing', 'heat', 'thing');
    placeBlock(b, 'field.show', 0, 0, { slice: 'y', at: 0.55 }, 'heatShow'); b.nodes.heatShow!.label = 'Heat: a level slice'; wire(b, 'heat', 'field', 'heatShow', 'field');
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'Engine, battery and heat'; wire(b, 'eng', 'piece', 'scene', 'things'); wire(b, 'bat', 'piece', 'scene', 'things'); wire(b, 'heatShow', 'view', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Fields over the engine bay: what each part needs, and maps of heat, motion and reach', () => {
    // the Corolla's engine bay as maps, not as positions: what every part needs, read from what its parts state (nothing
    // typed); then the space round the engine cell by cell: how hot (the rules' own fall-off from each hot surface, a
    // solid between blocking it), how much room from what moves (wheels through their steer and bump, the belt, the engine
    // rocking on its mounts), and where a hand reaches leaning over the open bay; and the three as one cost. Pick which
    // the 3D view shows; each cell coloured blue (good) to red (bad)
    const b = emptyBoard('Fields over the engine bay');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'need', 0, 0, {}, 'needs'); b.nodes.needs!.label = 'What every part needs'; wire(b, 'car', 'vehicle', 'needs', 'thing');
    placeBlock(b, 'need', 0, 0, { kind: 'access' }, 'reachNeeds'); b.nodes.reachNeeds!.label = 'Who must reach what, how often'; wire(b, 'car', 'vehicle', 'reachNeeds', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'reachRows'); b.nodes.reachRows!.label = 'Reached, a year'; wire(b, 'reachNeeds', 'needs', 'reachRows', 'rows');
    placeBlock(b, 'piece', 0, 0, { name: '^petrol engine', where: 'where it sits' }, 'eng'); b.nodes.eng!.label = 'The engine, to see the maps round'; wire(b, 'car', 'vehicle', 'eng', 'thing');
    for (const [k, kind, show] of [['h', 'heat', { slice: 'y', at: 0.45 }], ['m', 'motion', { slice: 'y', at: 0.45 }], ['r', 'reach', { slice: 'y', at: 0.7 }]] as [string, string, Record<string, unknown>][]) {
      placeBlock(b, 'field', 0, 0, { kind }, `f${k}`); b.nodes[`f${k}`]!.label = `Map: ${kind}`; wire(b, 'car', 'vehicle', `f${k}`, 'thing');
      placeBlock(b, 'field.show', 0, 0, show, `s${k}`); b.nodes[`s${k}`]!.label = `Show ${kind}: a level slice`; wire(b, `f${k}`, 'field', `s${k}`, 'field');
    }
    placeBlock(b, 'field.combine', 0, 0, { weights: '1 1 1' }, 'fc'); b.nodes.fc!.label = 'Heat, motion and reach as one cost'; for (const k of ['h', 'm', 'r']) wire(b, `f${k}`, 'field', 'fc', 'fields');
    placeBlock(b, 'field.show', 0, 0, { slice: 'y', at: 0.7 }, 'sc'); b.nodes.sc!.label = 'The three as one cost: a level slice'; wire(b, 'fc', 'field', 'sc', 'field');
    placeBlock(b, 'pick', 0, 0, { options: 'heat|motion|reach|all three', which: 'heat' }, 'pick'); b.nodes.pick!.label = 'Which map to see';
    for (const [k, o] of [['h', 'heat'], ['m', 'motion'], ['r', 'reach'], ['c', 'all three']] as [string, string][]) wire(b, `s${k}`, 'view', 'pick', o);
    placeBlock(b, 'combine', 0, 0, {}, 'scene'); b.nodes.scene!.label = 'The engine and the map'; wire(b, 'eng', 'piece', 'scene', 'things'); wire(b, 'pick', 'chosen', 'scene', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'scene', 'assembly', 'show', 'thing');
    return b;
  }],
  ['A car down to its bolts: tyres made in depth, a shared battery, taken apart', () => {
    // a Toyota Corolla by Toyota's figures, built part by part down to its wheel nuts; its four tyres swapped for one tyre
    // made in depth (layers, beads, belts, a tread of pitches), the same one on every wheel; a group 35 battery (typical
    // of Toyotas) over its gearbox on the left, where Toyota puts it; then taken apart three levels down: turn "how far
    // apart" to 0 to put it back together
    const b = emptyBoard('A car down to its bolts');
    placeBlock(b, 'vehicle.model', 0, 0, { model: 'corolla' }, 'car'); b.nodes.car!.label = 'Corolla (Toyota\'s figures)';
    placeBlock(b, 'tyre', 0, 0, { pattern: 'all-season', code: '205/55R16' }, 'tyre'); b.nodes.tyre!.label = 'Tyre 205/55R16, made in depth';
    placeBlock(b, 'fit', 0, 0, {}, 'fit'); b.nodes.fit!.label = 'Fit it on every wheel'; wire(b, 'car', 'vehicle', 'fit', 'thing'); wire(b, 'tyre', 'tyre', 'fit', 'with');
    placeBlock(b, 'battery.starter', 0, 0, { group: '35' }, 'bat'); b.nodes.bat!.label = 'Battery, BCI group 35';
    placeBlock(b, 'place', 0, 0, { x: 1.56, y: 0.645, z: -0.275 }, 'batAt'); b.nodes.batAt!.label = 'Over the gearbox, left'; wire(b, 'bat', 'battery', 'batAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'Corolla, to its bolts' }, 'all'); wire(b, 'fit', 'fitted', 'all', 'things'); wire(b, 'batAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0.5, levels: 3 }, 'apart'); wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'car', 'vehicle', 'audit', 'thing');
    return b;
  }],
  ['A truck from the ground up: axles, then tyres, then batteries', () => {
    // a 6x4 highway tractor built from its axles up (where each is, its track, its tyres, steer or drive, twin tyres, how
    // it hangs: the Cascadia's figures), its kind giving its cab, tanks, stacks and fifth wheel; a rib tyre fitted to its
    // steer axle and a drive tyre to its eight drive wheels; three group 31 batteries in a row on its left rail behind
    // its tank. Add an axle (wire another Axle in) and it is an 8x4; take one away and it is a 4x2
    const b = emptyBoard('A truck from the ground up');
    placeBlock(b, 'vehicle.axle', 0, 0, { steer: true, susp: 'leaf', x: 2.268, track: 2.05, tyre: '315/80R22.5', brakeD: 0.43 }, 'a1'); b.nodes.a1!.label = 'Steer axle';
    placeBlock(b, 'vehicle.axle', 0, 0, { drive: true, dual: true, susp: 'air', x: -1.51, track: 1.85, tyre: '11R22.5', brakeD: 0.43 }, 'a2'); b.nodes.a2!.label = 'Drive axle, front';
    placeBlock(b, 'vehicle.axle', 0, 0, { drive: true, dual: true, susp: 'air', x: -2.805, track: 1.85, tyre: '11R22.5', brakeD: 0.43 }, 'a3'); b.nodes.a3!.label = 'Drive axle, rear';
    placeBlock(b, 'vehicle', 0, 0, { kind: 'truck', power: 'diesel', extras: 'cab, tanks, stacks, fifth wheel', L: 7.166, W: 2.5, H: 3.03, kW: 375, cc: 14800, color: '#c62828' }, 'truck'); b.nodes.truck!.label = 'Truck from its axles';
    for (const a of ['a1', 'a2', 'a3']) wire(b, a, 'axle', 'truck', 'axles');
    placeBlock(b, 'tyre', 0, 0, { pattern: 'rib', code: '315/80R22.5' }, 'ts'); b.nodes.ts!.label = 'Steer tyre (rib)';
    placeBlock(b, 'tyre', 0, 0, { pattern: 'drive', code: '11R22.5' }, 'td'); b.nodes.td!.label = 'Drive tyre (lug)';
    placeBlock(b, 'fit', 0, 0, { path: '^((outer|inner) )?tyre 315' }, 'f1'); b.nodes.f1!.label = 'Fit on the steer axle'; wire(b, 'truck', 'vehicle', 'f1', 'thing'); wire(b, 'ts', 'tyre', 'f1', 'with');
    placeBlock(b, 'fit', 0, 0, { path: '^((outer|inner) )?tyre 11R' }, 'f2'); b.nodes.f2!.label = 'Fit on the drive axles'; wire(b, 'f1', 'fitted', 'f2', 'thing'); wire(b, 'td', 'tyre', 'f2', 'with');
    placeBlock(b, 'battery.starter', 0, 0, { group: '31' }, 'bat'); b.nodes.bat!.label = 'Battery, BCI group 31';
    placeBlock(b, 'place', 0, 0, { ry: Math.PI / 2 }, 'batTurn'); b.nodes.batTurn!.label = 'Turned across'; wire(b, 'bat', 'battery', 'batTurn', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'line', n: 3, dx: 0.185 }, 'bats'); b.nodes.bats!.label = 'Three in a row'; wire(b, 'batTurn', 'placed', 'bats', 'thing');
    placeBlock(b, 'place', 0, 0, { x: -0.83, y: 0.62, z: -0.66 }, 'batAt'); b.nodes.batAt!.label = 'On the left rail, behind the tank'; wire(b, 'bats', 'row', 'batAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'truck' }, 'all'); wire(b, 'f2', 'fitted', 'all', 'things'); wire(b, 'batAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0, levels: 3 }, 'apart'); b.nodes.apart!.label = 'Take apart (turn it up)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'truck', 'vehicle', 'audit', 'thing');
    return b;
  }],
  ['An electric car\'s pack: 3,360 cells, one stored', () => {
    // a sedan with electric drive; the box that stood for its pack swapped for a pack of 21700 cells: 96 in series of 35,
    // six modules of 16 groups, 60 kWh (what the room under its floor takes laid this way); the same pack again beside it, so
    // it can be seen (stored once, placed twice), and the cell itself
    const b = emptyBoard('An electric car\'s pack');
    placeBlock(b, 'vehicle', 0, 0, { kind: 'car', body: 'sedan', power: 'electric', color: '#eceff1' }, 'car'); b.nodes.car!.label = 'Sedan, electric';
    placeBlock(b, 'battery.pack', 0, 0, { format: '21700', s: 96, p: 35, rows: 5, modules: '16, 16, 16, 16, 16, 16' }, 'pack'); b.nodes.pack!.label = 'Pack of 21700s, 96s35p';
    placeBlock(b, 'fit', 0, 0, { path: '^battery pack' }, 'fit'); b.nodes.fit!.label = 'Fit it under the floor'; wire(b, 'car', 'vehicle', 'fit', 'thing'); wire(b, 'pack', 'pack', 'fit', 'with');
    placeBlock(b, 'battery.cell', 0, 0, { format: '21700' }, 'cell'); b.nodes.cell!.label = 'One cell (21700)';
    placeBlock(b, 'place', 0, 0, { x: -1.5, y: 0.035, z: 2.0 }, 'cellAt'); b.nodes.cellAt!.label = 'Beside it'; wire(b, 'cell', 'cell', 'cellAt', 'thing');
    placeBlock(b, 'place', 0, 0, { x: 0, y: 0.04, z: 2.6 }, 'packAt'); b.nodes.packAt!.label = 'The same pack, beside it to be seen'; wire(b, 'pack', 'pack', 'packAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'electric car' }, 'all'); wire(b, 'fit', 'fitted', 'all', 'things'); wire(b, 'cellAt', 'placed', 'all', 'things'); wire(b, 'packAt', 'placed', 'all', 'things');
    placeBlock(b, 'explode', 0, 0, { amount: 0, levels: 2 }, 'apart'); b.nodes.apart!.label = 'Take apart (turn it up)'; wire(b, 'all', 'assembly', 'apart', 'thing');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'apart', 'apart', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['A computer down to the transistor: FinFET, cell, die, package, board, PC', () => {
    // two FinFETs at Intel 14 nm's published pitches (an n-type, a p-type); made into a 6T SRAM bit and a NAND2 gate; those
    // placed by the billion into a 4-core die (each core's logic and graphics an estimate); the die flipped into an
    // LGA1151 package, socketed in an ATX board, in a tower PC. The same die beside the PC, face up, at its true size:
    // zoom the 3D view (or the space's S) down into it, through its caches and rows of gates, to a single transistor
    const b = emptyBoard('A computer down to the transistor');
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'n', fins: 1 }, 'tn'); b.nodes.tn!.label = 'nFET, 1 fin';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'p', fins: 1 }, 'tp'); b.nodes.tp!.label = 'pFET, 1 fin';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'n', fins: 2 }, 'tn2'); b.nodes.tn2!.label = 'nFET, 2 fins';
    placeBlock(b, 'chip.transistor', 0, 0, { proc: 'intel-14nm', type: 'p', fins: 2 }, 'tp2'); b.nodes.tp2!.label = 'pFET, 2 fins';
    placeBlock(b, 'chip.cell', 0, 0, { proc: 'intel-14nm', kind: 'SRAM bit (6T)' }, 'bit'); b.nodes.bit!.label = 'SRAM bit (6 transistors)'; wire(b, 'tn', 'transistor', 'bit', 'n'); wire(b, 'tp', 'transistor', 'bit', 'p');
    placeBlock(b, 'chip.cell', 0, 0, { proc: 'intel-14nm', kind: 'NAND2 gate' }, 'gate'); b.nodes.gate!.label = 'NAND2 gate (4 transistors)'; wire(b, 'tn2', 'transistor', 'gate', 'n'); wire(b, 'tp2', 'transistor', 'gate', 'p');
    placeBlock(b, 'chip.die', 0, 0, { proc: 'intel-14nm', cores: 4, coreMm2: 7, l2KB: 256, l3MB: 8, uncoreMm2: 50 }, 'die'); b.nodes.die!.label = 'Die, 4 cores'; wire(b, 'bit', 'cell', 'die', 'sram'); wire(b, 'gate', 'cell', 'die', 'nand');
    placeBlock(b, 'chip.package', 0, 0, { socket: 'LGA1151' }, 'pkg'); wire(b, 'die', 'die', 'pkg', 'die');
    placeBlock(b, 'pc.board', 0, 0, { form: 'ATX' }, 'board'); wire(b, 'pkg', 'package', 'board', 'package');
    placeBlock(b, 'pc.desktop', 0, 0, {}, 'pc'); wire(b, 'board', 'board', 'pc', 'board');
    placeBlock(b, 'place', 0, 0, { x: 0.45, y: 0.001 }, 'dieAt'); b.nodes.dieAt!.label = 'The die beside it, face up'; wire(b, 'die', 'die', 'dieAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'a computer, to its transistors' }, 'all'); wire(b, 'pc', 'pc', 'all', 'things'); wire(b, 'dieAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['Physics: a steel ball let go into a tower of wooden blocks', () => {
    // 24 oak blocks 100 mm a side, two by two and six high; a 120 mm steel ball shoved at the tower for 0.1 s with 300 N.
    // Let it go runs Jolt once (each block a body, its mass from oak's density, friction and bounce from the materials
    // table); press ▶ under the 3D view to watch it fall
    const b = emptyBoard('A ball let go into a tower');
    placeBlock(b, 'shape.box', 0, 0, { name: 'block', mat: 'oak', color: '#c8a26b', finish: 'grain', w: 0.1, h: 0.1, d: 0.1 }, 'block');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 2, nz: 2, ny: 6, sx: 0.1, sy: 0.1, sz: 0.1 }, 'tower'); b.nodes.tower!.label = 'Tower, 2 × 2 × 6'; wire(b, 'block', 'part', 'tower', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 0.05 }, 'towerAt'); wire(b, 'tower', 'grid', 'towerAt', 'thing');
    placeBlock(b, 'shape.sphere', 0, 0, { name: 'ball', mat: 'steel-low', color: '#b0bec5', finish: 'chrome', r: 0.06 }, 'ball');
    placeBlock(b, 'place', 0, 0, { x: -0.8, y: 0.06 }, 'ballAt'); wire(b, 'ball', 'part', 'ballAt', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'scene' }, 'all'); wire(b, 'towerAt', 'placed', 'all', 'things'); wire(b, 'ballAt', 'placed', 'all', 'things');
    placeBlock(b, 'push', 0, 0, { name: 'ball', fx: 300, seconds: 0.1 }, 'shove'); b.nodes.shove!.label = 'Shove the ball';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 8 }, 'go'); wire(b, 'all', 'assembly', 'go', 'things'); wire(b, 'shove', 'push', 'go', 'push'); wire(b, 'clock', 't', 'go', 't');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Physics: a cart on two motor-driven wheels', () => {
    // an aluminium deck 1 × 0.5 m on four rubber wheels 200 mm across, each on a hinge; the back two each turned by a maxon
    // RE 40 (24 V) through its 12:1 gearhead, from their datasheets: it pulls away and settles at the speed the motors'
    // constants give (about 6.5 m/s). The motors are not current-limited: they draw their stall current (80 A) to start,
    // over the motor's 6 A continuous rating and the gearhead's 7.5 N·m (a driver would limit it: not yet modelled)
    const b = emptyBoard('A cart on motor-driven wheels');
    placeBlock(b, 'shape.box', 0, 0, { name: 'chassis', mat: 'al-6061', color: '#90a4ae', finish: 'brushed', w: 1, h: 0.06, d: 0.5 }, 'deck'); b.nodes.deck!.label = 'Deck';
    placeBlock(b, 'place', 0, 0, { y: 0.16 }, 'deckAt'); wire(b, 'deck', 'part', 'deckAt', 'thing');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'wheel', mat: 'rubber', color: '#212121', finish: 'tread', r: 0.1, h: 0.05 }, 'wheel'); b.nodes.wheel!.label = 'Wheel';
    placeBlock(b, 'combine', 0, 0, { name: 'cart' }, 'all'); wire(b, 'deckAt', 'placed', 'all', 'things');
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 8 }, 'go'); wire(b, 'clock', 't', 'go', 't');
    const W: [number, number][] = [[-0.4, 0.3], [-0.4, -0.3], [0.4, 0.3], [0.4, -0.3]], names = ['wheel', 'wheel 2', 'wheel 3', 'wheel 4'];
    W.forEach(([x, z], k) => {
      placeBlock(b, 'place', 0, 0, { x, y: 0.1, z, rx: Math.PI / 2 }, `w${k}`); b.nodes[`w${k}`]!.label = `${names[k]}, on its axle`; wire(b, 'wheel', 'part', `w${k}`, 'thing'); wire(b, `w${k}`, 'placed', 'all', 'things');
      placeBlock(b, 'hinge', 0, 0, { a: names[k], b: 'chassis', axis: 'z', x, y: 0.1, z, ...(k < 2 ? { motor: 'motor.dc.coreless.d40-150w-24v', gear: 'gearhead.planetary.d42-12to1', reverse: 1 } : {}) }, `h${k}`);
      b.nodes[`h${k}`]!.label = k < 2 ? `${names[k]}: motor and gearhead` : `${names[k]}: free`; wire(b, `h${k}`, 'joint', 'go', 'joints');
    });
    wire(b, 'all', 'assembly', 'go', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Motion: a door swinging, and what it hits', () => {
    // a door mated into its wall, turned on its hinge edge (0 to 90° and back, at most 90°/s, 180°/s², about how a door is
    // swung by hand: an estimate); its swing swept, and checked against a bed put too close
    const b = emptyBoard('A door swinging, and what it hits');
    placeBlock(b, 'wall', 0, 0, { opening: 'door', name: 'wall', mat: 'brick', color: '#eceff1', finish: 'paint', L: 4, h: 2.4 }, 'wall');
    placeBlock(b, 'seed.door', 0, 0, {}, 'door');
    placeBlock(b, 'mate', 0, 0, { frame: 'fit', onto: 'opening', how: 'into' }, 'mate'); wire(b, 'door', 'door', 'mate', 'thing'); wire(b, 'wall', 'wall', 'mate', 'on');
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'turn', 0, 0, { axis: 'y', keys: '0 s 0°, 2 s 90°, 5 s 90°, 7 s 0°', x: -0.43, y: 0, z: 0, speed: 90, accel: 180 }, 'swing'); b.nodes.swing!.label = 'Turn it on its hinge';
    wire(b, 'mate', 'placed', 'swing', 'thing'); wire(b, 'clock', 't', 'swing', 't');
    placeBlock(b, 'seed.bed', 0, 0, { size: 'queen' }, 'bed');
    placeBlock(b, 'place', 0, 0, { x: 0.3, z: -1.2, ry: Math.PI / 2 }, 'bedAt'); b.nodes.bedAt!.label = 'Bed, too close'; wire(b, 'bed', 'bed', 'bedAt', 'thing');
    placeBlock(b, 'sweep', 0, 0, { axis: 'y', x: -0.43, from: 0, to: 90, n: 12 }, 'sweep'); b.nodes.sweep!.label = 'The room its swing needs'; wire(b, 'mate', 'placed', 'sweep', 'thing');
    placeBlock(b, 'clash', 0, 0, { depth: 1 }, 'clash'); b.nodes.clash!.label = 'Does the swing hit the bed?'; wire(b, 'sweep', 'swept', 'clash', 'thing'); wire(b, 'bedAt', 'placed', 'clash', 'with');
    placeBlock(b, 'combine', 0, 0, { name: 'room corner' }, 'all'); wire(b, 'wall', 'wall', 'all', 'things'); wire(b, 'swing', 'turned', 'all', 'things'); wire(b, 'bedAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return b;
  }],
  ['Physics: a pendulum on a hinge', () => {
    // an oak plank 1 m long hung from a hinge 2 m up, let go from 60°: it swings, and the hinge's angle is kept over time
    const b = emptyBoard('A pendulum on a hinge');
    placeBlock(b, 'shape.box', 0, 0, { name: 'plank', mat: 'oak', color: '#a1887f', w: 0.05, h: 1, d: 0.05 }, 'plank');
    placeBlock(b, 'place', 0, 0, { x: 0.433, y: 1.75, rz: Math.PI / 3 }, 'plankAt'); b.nodes.plankAt!.label = 'Plank, raised 60°'; wire(b, 'plank', 'part', 'plankAt', 'thing');
    placeBlock(b, 'hinge', 0, 0, { a: 'plank', axis: 'z', x: 0, y: 2, z: 0 }, 'hinge'); b.nodes.hinge!.label = 'Hinge, 2 m up';
    placeBlock(b, 'time', 0, 0, {}, 'clock');
    placeBlock(b, 'letgo', 0, 0, { seconds: 20 }, 'go'); wire(b, 'plankAt', 'placed', 'go', 'things'); wire(b, 'hinge', 'joint', 'go', 'joints'); wire(b, 'clock', 't', 'go', 't');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Mating: a door set in its wall by their frames', () => {
    // the wall's opening is a frame; the door's middle is a frame; Mate puts the one on the other, facing as it faces.
    // Change the wall's length or the opening's offset and the door follows
    const b = emptyBoard('Mating by frames');
    placeBlock(b, 'wall', 0, 0, { opening: 'door', name: 'wall', mat: 'brick', color: '#eceff1', finish: 'paint', L: 4, h: 2.4, off: 0.8 }, 'wall'); b.nodes.wall!.label = 'Wall with a door opening';
    placeBlock(b, 'seed.door', 0, 0, { colour: '#8d6e63' }, 'door'); b.nodes.door!.label = 'Door (its frame: "fit")';
    placeBlock(b, 'mate', 0, 0, { frame: 'fit', onto: 'opening', how: 'into' }, 'mate'); b.nodes.mate!.label = 'Mate: fit into opening';
    wire(b, 'door', 'door', 'mate', 'thing'); wire(b, 'wall', 'wall', 'mate', 'on');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'mate', 'both', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'mate', 'both', 'measure', 'thing');
    return b;
  }],
  ['Clear away: a field of grass, cleared where a road goes', () => {
    // a flat field 20 m square covered a foot at a time with grass; the patches the road comes within 0.2 m of taken away
    // whole (depth 0: each patch stays one shared thing; deeper, it would cut patches blade by blade)
    const b = emptyBoard('Clearing by where things are');
    placeBlock(b, 'terrain', 0, 0, { w: 20, d: 20, relief: 0, cells: 8, color: '#4e7d32' }, 'field'); b.nodes.field!.label = 'Field';
    placeBlock(b, 'seed.grass', 0, 0, { blades: 16, soil: 'none' }, 'patch'); b.nodes.patch!.label = 'A foot of grass';
    placeBlock(b, 'scatter', 0, 0, { mode: 'grid', step: 0.3048, w: 20, d: 20, turn: true }, 'lawn'); b.nodes.lawn!.label = 'Patches all over it';
    wire(b, 'patch', 'patch', 'lawn', 'thing'); wire(b, 'field', 'ground', 'lawn', 'on');
    placeBlock(b, 'seed.road', 0, 0, { L: 20 }, 'road'); b.nodes.road!.label = 'Road across it';
    placeBlock(b, 'place', 0, 0, { y: 0.1 }, 'roadAt'); wire(b, 'road', 'road', 'roadAt', 'thing');
    placeBlock(b, 'clear', 0, 0, { keep: false, depth: 0, gap: 0.2 }, 'clear'); b.nodes.clear!.label = 'Clear the grass the road is on';
    wire(b, 'lawn', 'scattered', 'clear', 'thing'); wire(b, 'roadAt', 'placed', 'clear', 'near');
    placeBlock(b, 'combine', 0, 0, { name: 'field with a road' }, 'all'); wire(b, 'field', 'ground', 'all', 'things'); wire(b, 'clear', 'cleared', 'all', 'things'); wire(b, 'roadAt', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    return b;
  }],
  ['Seeds, one of each: window, door, toilet, sink, bed, car, stop light', () => seedBoard('Seeds, one of each', [
    ['seed.window', 'Window', {}, { x: -6, y: 1.5 }, 'window'],
    ['seed.door', 'Door', {}, { x: -4.5, y: 1.05 }, 'door'],
    ['seed.toilet', 'Toilet', {}, { x: -3 }, 'toilet'],
    ['seed.sink', 'Sink (choose it: its kind)', { kind: 'vanity' }, { x: -2 }, 'sink'],
    ['seed.bed', 'Bed (choose it: its size)', {}, { x: 0 }, 'bed'],
    ['seed.car', 'Car (choose it: its paint)', {}, { x: 4.5, z: 1 }, 'car'],
    ['seed.stoplight', 'Stop light (choose it: which is lit)', { state: 'green' }, { x: 8.5 }, 'light'],
    ['seed.grass', 'A foot of grass', {}, { x: 10 }, 'patch'],
  ])],
  ['Ground: a foot of grass, then a whole terrain of it', () => seedBoard('Ground from a foot of grass', [
    ['seed.terrain', 'Terrain (choose it: its seed, its size, grassed or bare)', { size: 24 }, {}, 'terrain'],
  ])],
  ['Streets: a road and a stop light, then a road system', () => seedBoard('Streets from a road and a stop light', [
    ['seed.roads', 'Road system (choose it: blocks each way, which light is lit)', {}, {}, 'roads'],
  ])],
  ['A neighbourhood, then a city, from seeds', () => seedBoard('A city from seeds', [
    ['seed.city', 'City (choose it: neighbourhoods each way, its seed)', { n: 3 }, {}, 'city'],
  ])],
  ['A city from a few nodes: motor, drone, swarm, buildings', () => {
    // a racing quad's parts at typical sizes: a 2207 brushless motor's bell about 28 mm across and 18 mm tall, a 5 inch
    // (127 mm) prop, a frame of about 220 mm between opposite motors; buildings 20 m square, streets 10 m (typical)
    const b = emptyBoard('A city from a few nodes');
    placeBlock(b, 'shape.cyl', 0, 0, { name: 'motor bell', mat: 'al-6061', color: '#c9ced6', finish: 'brushed', r: 0.014, h: 0.018 }, 'bell');
    placeBlock(b, 'shape.box', 0, 0, { name: 'prop', mat: 'pp', color: '#ff5252', w: 0.127, h: 0.002, d: 0.012 }, 'prop');
    placeBlock(b, 'place', 0, 0, { y: 0.011 }, 'propUp'); wire(b, 'prop', 'part', 'propUp', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'motor' }, 'motor'); wire(b, 'bell', 'part', 'motor', 'things'); wire(b, 'propUp', 'placed', 'motor', 'things');
    placeBlock(b, 'shape.box', 0, 0, { name: 'frame', mat: 'fibreglass', color: '#263238', w: 0.16, h: 0.004, d: 0.16 }, 'frame');
    placeBlock(b, 'array', 0, 0, { pattern: 'ring', n: 4, r: 0.11 }, 'arms'); wire(b, 'motor', 'assembly', 'arms', 'thing');
    placeBlock(b, 'place', 0, 0, { y: 0.011 }, 'armsUp'); wire(b, 'arms', 'ring', 'armsUp', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'drone' }, 'drone'); wire(b, 'frame', 'part', 'drone', 'things'); wire(b, 'armsUp', 'placed', 'drone', 'things');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 10, nz: 10, sx: 1, sz: 1 }, 'swarm'); b.nodes.swarm!.label = 'Swarm'; wire(b, 'drone', 'assembly', 'swarm', 'thing');
    // (flown clear of the tallest tower: 30 m, varied by up to 60 %, so 48 m; at 45 m the clash check below found the swarm in a tower)
    placeBlock(b, 'place', 0, 0, { y: 55 }, 'swarmUp'); wire(b, 'swarm', 'grid', 'swarmUp', 'thing');
    placeBlock(b, 'shape.box', 0, 0, { name: 'tower', mat: 'concrete', color: '#90a4ae', finish: 'concrete', w: 20, h: 30, d: 20 }, 'tower'); b.nodes.tower!.label = 'Tower';
    placeBlock(b, 'place', 0, 0, { y: 15 }, 'towerUp'); wire(b, 'tower', 'part', 'towerUp', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 4, nz: 4, sx: 30, sz: 30, vary: 0.6, seed: 7 }, 'block'); b.nodes.block!.label = 'City block'; wire(b, 'towerUp', 'placed', 'block', 'thing');
    placeBlock(b, 'array', 0, 0, { pattern: 'grid', nx: 5, nz: 5, sx: 140, sz: 140 }, 'city'); b.nodes.city!.label = 'City'; wire(b, 'block', 'grid', 'city', 'thing');
    placeBlock(b, 'combine', 0, 0, { name: 'city and swarm' }, 'all'); wire(b, 'city', 'grid', 'all', 'things'); wire(b, 'swarmUp', 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'clash', 0, 0, { depth: 1 }, 'clash'); wire(b, 'all', 'assembly', 'clash', 'thing');
    // the motor and the drone folded into nodes of their own: open them to change them, save them to use anywhere
    let r = collapse(b, ['bell', 'prop', 'propUp', 'motor'], 'Motor', 'gMotor'); tidy(r.board.nodes.gMotor!.inner!);
    r = collapse(r.board, ['gMotor', 'frame', 'arms', 'armsUp', 'drone'], 'Drone', 'gDrone'); tidy(r.board.nodes.gDrone!.inner!);
    return r.board;
  }],

  ['Parts in 3D: a bolt sized from its load, drawn whole', () => {
    // the load picks the bolt: the shank area its shear needs, the next ISO 262 size up, and that bolt drawn from its
    // standard (ISO 4014's hex bolt) with its head, shank and thread
    const b = emptyBoard('A bolt from its load');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' }, 'F'); b.nodes.F!.label = 'Shear load';
    const Sy = placeBlock(b, 'in.number', 0, 0, { value: '640 MPa', unit: 'Pa' }, 'Sy'); b.nodes.Sy!.label = 'Yield, class 8.8 (ISO 898-1)';
    const n = placeBlock(b, 'in.number', 0, 0, { value: 2 }, 'n'); b.nodes.n!.label = 'Factor of safety wanted';
    const d = placeBlock(b, 'math.expr', 0, 0, { expr: 'sqrt(4 * F * n / (pi * 0.577 * Sy))', unit: 'm' }, 'd'); b.nodes.d!.label = 'Least diameter for that';
    wire(b, F, 'value', d, 'F'); wire(b, Sy, 'value', d, 'Sy'); wire(b, n, 'value', d, 'n');
    const pick = placeBlock(b, 'logic.next-size', 0, 0, {}, 'pick'); b.nodes.pick!.label = 'Next metric size (ISO 262)'; wire(b, d, 'result', pick, 'need');
    const L = placeBlock(b, 'in.number', 0, 0, { value: 40 }, 'L'); b.nodes.L!.label = 'Length, mm';
    const w = placeBlock(b, 'text.format', 0, 0, { template: 'bolt M{d}x{L}' }, 'words'); b.nodes.words!.label = 'Its name'; wire(b, pick, 'inUnit', w, 'd'); wire(b, L, 'value', w, 'L');
    const part = placeBlock(b, 'card.part', 0, 0, {}, 'part'); b.nodes.part!.label = 'The bolt'; wire(b, w, 'text', part, 'what');
    const v = placeBlock(b, 'view.3d', 0, 0, {}, 'v3'); b.nodes.v3!.label = 'The bolt, in 3D'; wire(b, part, 'part', v, 'part');
    const m = placeBlock(b, 'view.show', 0, 0, { unit: 'g' }, 'm'); b.nodes.m!.label = 'Its mass'; wire(b, part, 'mass', m, 'value');
    const br = placeBlock(b, 'card.part', 0, 0, { what: 'bearing 6205' }, 'br'); b.nodes.br!.label = 'A bearing beside it';
    const v2 = placeBlock(b, 'view.3d', 0, 0, { explode: 1 }, 'v4'); b.nodes.v4!.label = 'The bearing, taken apart'; wire(b, br, 'part', v2, 'part');
    return b;
  }],
  ['Cantilever: how far it bends, for every length', () => {
    const b = emptyBoard('Cantilever sweep');
    const P = placeBlock(b, 'in.number', 0, 0, { value: '500 N', unit: 'N' }, 'P'); b.nodes.P!.label = 'End load';
    const L = placeBlock(b, 'in.range', 0, 130, { from: 0.5, to: 2, count: 31, unit: 'm' }, 'L'); b.nodes.L!.label = 'Lengths';
    const m = placeBlock(b, 'card.material', 0, 300, { id: 'steel.a36' }, 'mat');
    const I = placeBlock(b, 'math.expr', 0, 520, { expr: 'w * h^3 / 12', unit: 'm^4', w: 0.03, h: 0.06 }, 'I'); b.nodes.I!.label = 'Section I (30 × 60 mm)';
    const d = placeBlock(b, 'law.beam.cantilever.point', 330, 120, {}, 'd');
    wire(b, P, 'value', d, 'P'); wire(b, L, 'value', d, 'L'); wire(b, m, 'E', d, 'E'); wire(b, I, 'result', d, 'I');
    const ch = placeBlock(b, 'view.chart', 660, 0, {}, 'chart'); b.nodes.chart!.label = 'Tip deflection against length'; wire(b, d, 'd', ch, 'y'); wire(b, L, 'value', ch, 'x');
    const st = placeBlock(b, 'math.stats', 660, 220, {}, 'stats'); wire(b, d, 'd', st, 'values');
    const lim = placeBlock(b, 'in.number', 660, 420, { value: '15 mm', unit: 'm' }, 'lim'); b.nodes.lim!.label = 'Most it may bend';
    const ck = placeBlock(b, 'check.limit', 960, 260, { what: 'deflection' }, 'ck'); wire(b, st, 'max', ck, 'value'); wire(b, lim, 'value', ck, 'limit');
    const g = placeBlock(b, 'view.gauge', 1260, 260, { min: 0, max: 3 }, 'g'); b.nodes.g!.label = 'Stiffness: limit ÷ worst bend'; wire(b, ck, 'factor', g, 'value');
    // and its strength: the moment at the root, over the section modulus, against the steel's yield
    const M = placeBlock(b, 'math.multiply', 330, 300, {}, 'M'); b.nodes.M!.label = 'Moment at the root (P L)'; wire(b, P, 'value', M, 'a'); wire(b, L, 'value', M, 'b');
    const S = placeBlock(b, 'math.expr', 330, 420, { expr: 'w * h^2 / 6', unit: 'm^3', w: 0.03, h: 0.06 }, 'S'); b.nodes.S!.label = 'Section modulus (30 × 60 mm)';
    const sb = placeBlock(b, 'law.stress.bending', 600, 300, {}, 'sb'); wire(b, M, 'result', sb, 'M'); wire(b, S, 'result', sb, 'S');
    const sm = placeBlock(b, 'math.stats', 900, 300, {}, 'sm'); b.nodes.sm!.label = 'Bending stress over the lengths'; wire(b, sb, 'sigma', sm, 'values');
    const ck2 = placeBlock(b, 'check.limit', 1200, 300, { what: 'bending stress' }, 'ck2'); wire(b, sm, 'max', ck2, 'value'); wire(b, m, 'yield', ck2, 'limit');
    const g2 = placeBlock(b, 'view.gauge', 1500, 300, { min: 0, max: 3 }, 'g2'); b.nodes.g2!.label = 'Strength: yield ÷ worst stress'; wire(b, ck2, 'factor', g2, 'value');
    const nt = placeBlock(b, 'note', 330, 470, { text: 'Change the load, the section or the material: only what it reaches runs again. The law runs once for each of the 31 lengths.' }, 'note');
    void nt; return b;
  }],
  ['Bolt: shear, tightening torque and margin', () => {
    // an M8 property class 8.8 bolt: its figures from ISO 898-1:2013 (tables 3 and 7) and ISO 898-1's stress area
    const b = emptyBoard('Bolted joint, M8 class 8.8');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' }, 'F'); b.nodes.F!.label = 'Shear load';
    const dd = placeBlock(b, 'in.number', 0, 0, { value: '8 mm', unit: 'm' }, 'dd'); b.nodes.dd!.label = 'Bolt diameter';
    const As = placeBlock(b, 'in.number', 0, 0, { value: '36.6 mm^2', unit: 'm^2' }, 'As'); b.nodes.As!.label = 'Stress area, M8 (ISO 898-1)';
    const Sy = placeBlock(b, 'in.number', 0, 0, { value: '640 MPa', unit: 'Pa' }, 'Sy'); b.nodes.Sy!.label = 'Yield, class 8.8 (ISO 898-1)';
    const Sp = placeBlock(b, 'in.number', 0, 0, { value: '580 MPa', unit: 'Pa' }, 'Sp'); b.nodes.Sp!.label = 'Proof stress, class 8.8 (ISO 898-1)';
    const tau = placeBlock(b, 'math.expr', 0, 0, { expr: 'F / (pi * d^2 / 4)', unit: 'Pa' }, 'tau'); b.nodes.tau!.label = 'Shear stress on the shank';
    wire(b, F, 'value', tau, 'F'); wire(b, dd, 'value', tau, 'd');
    const allow = placeBlock(b, 'math.expr', 0, 0, { expr: '0.577 * Sy', unit: 'Pa' }, 'allow'); b.nodes.allow!.label = 'Allowed shear (von Mises)'; wire(b, Sy, 'value', allow, 'Sy');
    const ck = placeBlock(b, 'check.limit', 0, 0, { what: 'bolt shear' }, 'ck'); wire(b, tau, 'result', ck, 'value'); wire(b, allow, 'result', ck, 'limit');
    const pre = placeBlock(b, 'math.expr', 0, 0, { expr: '0.75 * Sp * As', unit: 'N' }, 'pre'); b.nodes.pre!.label = 'Preload, 75 % of proof load (Shigley 8-31)'; wire(b, Sp, 'value', pre, 'Sp'); wire(b, As, 'value', pre, 'As');
    const T = placeBlock(b, 'law.bolt.torque.nut-factor', 0, 0, { K: 0.2 }, 'T'); wire(b, dd, 'value', T, 'd'); wire(b, pre, 'result', T, 'F');
    const s1 = placeBlock(b, 'view.show', 0, 0, { unit: 'N m' }, 's1'); b.nodes.s1!.label = 'Tighten to'; wire(b, T, 'T', s1, 'value');
    const s2 = placeBlock(b, 'view.gauge', 0, 0, { min: 0, max: 4 }, 's2'); b.nodes.s2!.label = 'Factor of safety in shear'; wire(b, ck, 'factor', s2, 'value');
    placeBlock(b, 'note', 0, 0, { text: 'K = 0.2 is the nut factor for dry, as-received steel threads (Shigley table 8-15). Try 0.15 for lubricated threads, or a 12 kN load.' }, 'note');
    return b;
  }],
  ['Business: cash flow, loan and what it is worth', () => {
    const b = emptyBoard('Cash flow');
    const t = placeBlock(b, 'in.table', 0, 0, { value: 'month, in, out\n1, 12000, 9000\n2, 13500, 9400\n3, 11000, 9800\n4, 15000, 10200\n5, 16200, 10900\n6, 14800, 11000' }, 'tab'); b.nodes.tab!.label = 'Monthly money';
    const ci = placeBlock(b, 'list.column', 300, 0, { column: 'in' }, 'ci'), co = placeBlock(b, 'list.column', 300, 140, { column: 'out' }, 'co');
    wire(b, t, 'rows', ci, 'rows'); wire(b, t, 'rows', co, 'rows');
    const net = placeBlock(b, 'math.subtract', 580, 60, {}, 'net'); b.nodes.net!.label = 'Net each month'; wire(b, ci, 'values', net, 'a'); wire(b, co, 'values', net, 'b');
    const loan = placeBlock(b, 'fin.loan', 0, 320, { principal: 40000, rate: 0.07, years: 5, perYear: 12 }, 'loan'); b.nodes.loan!.label = 'Van loan, 60 payments';
    const left = placeBlock(b, 'math.subtract', 580, 360, {}, 'left'); b.nodes.left!.label = 'Net after the loan payment'; wire(b, net, 'result', left, 'a'); wire(b, loan, 'payment', left, 'b');
    const run = placeBlock(b, 'list.running', 860, 0, { start: 5000 }, 'bal'); b.nodes.bal!.label = 'Bank balance, with the loan'; wire(b, left, 'result', run, 'values');
    const ch = placeBlock(b, 'view.chart', 1160, 0, {}, 'chart'); b.nodes.chart!.label = 'Balance by month'; wire(b, run, 'totals', ch, 'y');
    const npv = placeBlock(b, 'fin.npv', 860, 260, { rate: 0.01 }, 'npv'); b.nodes.npv!.label = 'Worth today, at 1 % a month'; wire(b, left, 'result', npv, 'flows');
    const sv = placeBlock(b, 'view.show', 1160, 300, {}, 'sv'); b.nodes.sv!.label = 'These 6 months, after the loan, worth today'; wire(b, npv, 'npv', sv, 'value');
    const t2 = placeBlock(b, 'list.zip', 860, 470, { names: 'net, after' }, 'zip'); wire(b, net, 'result', t2, 'net'); wire(b, left, 'result', t2, 'after');
    const tv = placeBlock(b, 'view.table', 1160, 470, {}, 'tv'); b.nodes.tv!.label = 'Each month, before and after the loan'; wire(b, t2, 'rows', tv, 'rows');
    return b;
  }],
  ['Electrical: a resistor heating, swept over current', () => {
    const b = emptyBoard('Resistor');
    const I = placeBlock(b, 'in.range', 0, 0, { from: 0, to: 3, count: 31, unit: 'A' }, 'I'); b.nodes.I!.label = 'Current';
    const R = placeBlock(b, 'in.number', 0, 160, { value: 4.7, unit: 'ohm' }, 'R'); b.nodes.R!.label = 'Resistance';
    const V = placeBlock(b, 'law.ohm', 300, 0, {}, 'V'), P = placeBlock(b, 'law.joule', 300, 200, {}, 'P');
    wire(b, I, 'value', V, 'I'); wire(b, R, 'value', V, 'R'); wire(b, I, 'value', P, 'I'); wire(b, R, 'value', P, 'R');
    const c1 = placeBlock(b, 'view.chart', 620, 0, {}, 'c1'); b.nodes.c1!.label = 'Voltage'; wire(b, V, 'V', c1, 'y'); wire(b, I, 'value', c1, 'x');
    const c2 = placeBlock(b, 'view.chart', 620, 200, {}, 'c2'); b.nodes.c2!.label = 'Heat'; wire(b, P, 'P', c2, 'y'); wire(b, I, 'value', c2, 'x');
    const st = placeBlock(b, 'math.stats', 620, 400, {}, 'st'); wire(b, P, 'P', st, 'values');
    const rating = placeBlock(b, 'in.number', 620, 600, { value: '5 W', unit: 'W' }, 'rt'); b.nodes.rt!.label = 'Its rating';
    const ck = placeBlock(b, 'check.limit', 940, 450, { what: 'power' }, 'ck'); wire(b, st, 'max', ck, 'value'); wire(b, rating, 'value', ck, 'limit');
    const code = placeBlock(b, 'code', 940, 120, { lang: 'js', inputs: 'P, I', outputs: 'firstOver', code: 'const k = P.findIndex(p => p > 5);\nreturn { firstOver: k < 0 ? "never over 5 W" : `over 5 W from ${I[k].toFixed(1)} A` };' }, 'code'); b.nodes.code!.label = 'Where it overheats (code)';
    wire(b, P, 'P', code, 'P'); wire(b, I, 'value', code, 'I');
    const sv = placeBlock(b, 'view.show', 1240, 120, {}, 'sv'); wire(b, code, 'firstOver', sv, 'value');
    return b;
  }],
  ] as [string, Make][]);
  return boards.map(([n, f]) => [n, () => tidy(f())] as [string, Make]);
}
