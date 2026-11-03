// The starter boards: real node flows across fields, each a pipeline to start from (the library's Boards). Pure: no page
// is needed to read them, so navigation (src/nexus/navigate.ts), the tests and the docs see every flow the page offers. The
// page lays each out (its own tidy) as it opens it.

import { emptyBoard, placeBlock, wire } from './dataflow';
import type { Board } from './boards';

export type Make = () => Board;
/** Every starter board, laid out by the tidy given (none: as placed). */
export function starterBoards(tidy: (b: Board) => Board = (b) => b): [string, Make][] {
  const boards = ([
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
    // (each step's part on the board itself, turning: the grid, the pasted plate, the wrapped plate, the cell)
    for (const [k, from, out, label, ex] of [['v1', 'gp', 'grid', 'The cast grid', 0], ['v2', 'cp', 'coated', 'The pasted plate', 1], ['v3', 'wp', 'wrapped', 'In its separator', 1], ['v4', 'cell', 'joined', 'A cell, its plates strapped', 0]] as [string, string, string, string, number][]) { placeBlock(b, 'view.3d', 0, 0, { explode: ex }, k); b.nodes[k]!.label = label; wire(b, from, out, k, 'part'); }
    // (shown whole: what a person opening it should see is a battery; shown exploded 64 levels deep it read as a jumble of
    // plates, 2026-11-02. To look inside, put a Take apart node on what it makes)
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'assembly', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'all', 'assembly', 'audit', 'thing');
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
  ['Fit to a target: one node that sizes anything to what is asked of it: a bar\'s area for a stress; any block, or any pipeline folded into one, its inputs moved within ranges until its outputs meet their goals', () => {
    const b = emptyBoard('Fit to a target');
    placeBlock(b, 'in.number', 0, 0, { value: 5000 }, 'F'); b.nodes.F!.label = 'The load, N';
    placeBlock(b, 'fit.target', 0, 0, { block: 'law.stress.axial', vary: 'A 0.0005..0.01', goals: 'sigma = 2e6', most: 80 }, 'bar'); b.nodes.bar!.label = 'A bar\'s area so it carries the load at 2 MPa'; wire(b, 'F', 'value', 'bar', 'F');
    for (const [k, l] of [['bar', 'The bar']] as const) { placeBlock(b, 'view.show', 0, 0, {}, `${k}Says`); b.nodes[`${k}Says`]!.label = l; wire(b, k, 'says', `${k}Says`, 'value'); placeBlock(b, 'view.show', 0, 0, {}, `${k}Fig`); b.nodes[`${k}Fig`]!.label = `${l}: each value, its ±, fixed or not`; wire(b, k, 'figures', `${k}Fig`, 'value'); }
    return tidy(b);
  }],
  ['Choosing and fitting: a 40 kN/m coil spring as light as can be, 1.3 times as strong as it must be, from five ASTM wires and three to eight coils, its wire\'s size fitted in each: every way of choosing ranked, what each reached, and which cannot do it', () => {
    const b = emptyBoard('Choosing and fitting');
    placeBlock(b, 'fit.target', 0, 0, { block: 'seed.spring-checked', vary: 'wire music-wire-a228|oil-tempered-a229|hard-drawn-a227|chrome-silicon-a401|stainless-302-a313\nd 0.002..0.005\nn 3..8 int', goals: 'rate = 40000\nworst > 1.3\nmass min', most: 60 }, 'fit'); b.nodes.fit!.label = 'Which wire, how many coils, what size';
    placeBlock(b, 'view.table', 0, 0, {}, 'ch'); b.nodes.ch!.label = 'Every way of choosing, best first'; wire(b, 'fit', 'choices', 'ch', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'sy'); wire(b, 'fit', 'says', 'sy', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'fit', 'thing', 'show', 'thing');
    return tidy(b);
  }],
  ['Controls you work while it runs: a stick drives the cart (the arrow keys, W A S D, a phone\'s drawn stick, a gamepad), the green button on the crate adds a crate to the row each press (E, the drawn button, or press it on the crate in 3D), the slider raises the tower; Walk (V) to stand in it at your own height', () => {
    const b = emptyBoard('Controls');
    placeBlock(b, 'shape.box', 0, 0, { name: 'cart', w: 0.8, h: 0.4, d: 1.2, color: '#ef6c00', mat: 'abs' }, 'cart'); b.nodes.cart!.label = 'The cart';
    placeBlock(b, 'control.stick', 0, 0, { name: 'Drive', speed: 3, mode: 'steer' }, 'drive'); b.nodes.drive!.label = 'Drive (stick)';
    placeBlock(b, 'place', 0, 0, { y: 0.2 }, 'pc'); b.nodes.pc!.label = 'Where it has driven'; wire(b, 'cart', 'part', 'pc', 'thing'); wire(b, 'drive', 'px', 'pc', 'x'); wire(b, 'drive', 'pz', 'pc', 'z'); wire(b, 'drive', 'turn', 'pc', 'ry');
    placeBlock(b, 'shape.box', 0, 0, { name: 'crate', w: 0.5, h: 0.5, d: 0.5, color: '#8d6e63', mat: 'abs' }, 'crate'); b.nodes.crate!.label = 'A crate';
    placeBlock(b, 'control.button', 0, 0, { name: 'Add a crate', key: 'E', colour: 'green', face: 'top' }, 'add'); b.nodes.add!.label = 'Button on the crate'; wire(b, 'crate', 'part', 'add', 'thing');
    placeBlock(b, 'place', 0, 0, { x: -2.5, y: 0.25 }, 'pb'); b.nodes.pb!.label = 'The crate with its button'; wire(b, 'add', 'thing', 'pb', 'thing');
    placeBlock(b, 'math.expr', 0, 0, { expr: 'p + 1' }, 'n1'); b.nodes.n1!.label = 'One more than the presses'; wire(b, 'add', 'presses', 'n1', 'p');
    placeBlock(b, 'array', 0, 0, { pattern: 'line', dx: 0.6 }, 'row'); b.nodes.row!.label = 'The row of crates'; wire(b, 'crate', 'part', 'row', 'thing'); wire(b, 'n1', 'result', 'row', 'n');
    placeBlock(b, 'place', 0, 0, { x: -2.5, y: 0.25, z: -2 }, 'pr'); wire(b, 'row', 'row', 'pr', 'thing');
    placeBlock(b, 'control.slider', 0, 0, { name: 'Tower height', min: 0.5, max: 6, value: 2, unit: 'm' }, 'hgt'); b.nodes.hgt!.label = 'Tower height (slider)';
    placeBlock(b, 'shape.box', 0, 0, { name: 'tower', w: 0.6, d: 0.6, color: '#5c6bc0', mat: 'abs' }, 'tower'); wire(b, 'hgt', 'value', 'tower', 'h');
    placeBlock(b, 'math.expr', 0, 0, { expr: 'h / 2' }, 'ty'); b.nodes.ty!.label = 'Standing on the ground'; wire(b, 'hgt', 'value', 'ty', 'h');
    placeBlock(b, 'place', 0, 0, { x: 2.5, z: -2 }, 'pt'); wire(b, 'tower', 'part', 'pt', 'thing'); wire(b, 'ty', 'result', 'pt', 'y');
    placeBlock(b, 'combine', 0, 0, { name: 'the yard' }, 'all'); for (const x of ['pc', 'pb', 'pr', 'pt']) wire(b, x, 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    return tidy(b);
  }],
  ['Export: an M8 bolt as exact solids, written as STEP (named, coloured), STL, 3MF, glTF and its bill of materials, and the STEP read back by the kernel to prove it went out whole (wire any thing in: the engine is 1,512 solids and about a minute)', () => {
    const b = emptyBoard('Export');
    placeBlock(b, 'part.family', 0, 0, { family: 'bolt' }, 'bolt'); b.nodes.bolt!.label = 'An M8 bolt';
    placeBlock(b, 'export.files', 0, 0, {}, 'ex'); b.nodes.ex!.label = 'Its files'; wire(b, 'bolt', 'part', 'ex', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'ls'); b.nodes.ls!.label = 'Each file'; wire(b, 'ex', 'list', 'ls', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'sy'); wire(b, 'ex', 'says', 'sy', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'bolt', 'part', 'show', 'thing');
    return tidy(b);
  }],
  ['Prompt trial: four ways of asking an image model for one thing, each drawn three times, every picture judged blind on the same criteria (and whether it invents something that would work): the wordings ranked with their 95 % intervals, which beats which for certain, the best pictures. Needs a Gemini key with image quota', () => {
    const b = emptyBoard('Prompt trial');
    placeBlock(b, 'prompt.trial', 0, 0, {}, 'pt'); b.nodes.pt!.label = 'Words against words';
    placeBlock(b, 'view.show', 0, 0, {}, 'sy'); wire(b, 'pt', 'says', 'sy', 'value'); placeBlock(b, 'view.table', 0, 0, {}, 'rk'); b.nodes.rk!.label = 'Each wording, ranked'; wire(b, 'pt', 'ranked', 'rk', 'rows');
    return tidy(b);
  }],
  ['Trade-offs: a coil spring as light as can be and as stiff as can be, its factor of safety kept over 1.2: every design tried across its wire, coil and turns, the best kept (none beaten on both), charted, the one giving up least marked, and each made, side by side', () => {
    const b = emptyBoard('Trade-offs');
    placeBlock(b, 'trade.offs', 0, 0, { block: 'seed.spring-checked', vary: 'd 0.002..0.005\nD 0.015..0.035\nn 3..10', goals: 'mass min\nrate max\nworst > 1.2' }, 'tr'); b.nodes.tr!.label = 'Light against stiff, kept safe';
    placeBlock(b, 'view.chart', 0, 0, {}, 'ch'); b.nodes.ch!.label = 'Its front: rate (N/m) against mass (kg)'; wire(b, 'tr', 'xs', 'ch', 'x'); wire(b, 'tr', 'ys', 'ch', 'y');
    placeBlock(b, 'view.table', 0, 0, {}, 'ft'); b.nodes.ft!.label = 'The front, the knee ◆'; wire(b, 'tr', 'front', 'ft', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'sy'); wire(b, 'tr', 'says', 'sy', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'tr', 'laid', 'show', 'thing');
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
  ['Paste a bolt onto anything: one cap screw stood on a plate, a round boss and a steel angle, its hole cut by its standards', () => {
    // (spec 01, I13; R7 to R9): the screw's own thread read off it; on each part, the ray from a point meets its surface, the
    // screw stood square to it there, its negative made for that part's material and depth (ISO 273's clearance hole,
    // DIN 974-1's counterbore), checked before anything is cut, cut, the part given the hole as an interface, and the screw
    // seated in it by its joints (its axis in the hole, its head on the counterbore's floor: the turn about its axis left
    // free). The steel angle's 5 mm leg is too thin for the counterbore: refused by its rule, nothing cut. Move a point,
    // change the screw's thread: each paste is made again
    const b = emptyBoard('Paste a bolt onto anything');
    placeBlock(b, 'part.family', 0, 0, { family: 'screw', thread: 'M8', length: 30 }, 'screw'); b.nodes.screw!.label = 'The cap screw (ISO 4762, M8 × 30): what is pasted';
    placeBlock(b, 'shape.box', 0, 200, { name: 'plate', mat: 'steel-low', w: 0.1, h: 0.01, d: 0.1 }, 'plate'); b.nodes.plate!.label = 'A steel plate, 100 × 10 × 100 mm';
    placeBlock(b, 'shape.cyl', 0, 400, { name: 'round boss', mat: 'al-6061', r: 0.03, h: 0.04 }, 'boss'); b.nodes.boss!.label = 'A round aluminium boss, 60 mm across: pasted on its round side';
    placeBlock(b, 'part.family', 0, 600, { family: 'angle', size: '50x5', L: 150 }, 'angle'); b.nodes.angle!.label = 'A steel angle, 50 × 5 (EN 10056-1)';
    placeBlock(b, 'imprint', 320, 200, { x: 0.02, y: 1, z: 0 }, 'on plate'); b.nodes['on plate']!.label = 'Pasted on the plate, from above';
    placeBlock(b, 'imprint', 320, 400, { x: 1, y: 0, z: 0, toward: '-x' }, 'on boss'); b.nodes['on boss']!.label = 'Pasted on the boss\'s round side';
    placeBlock(b, 'imprint', 320, 600, { x: 0, y: 0, z: 1, toward: '-z' }, 'on angle'); b.nodes['on angle']!.label = 'Pasted on the angle\'s leg (5 mm: too thin, refused)';
    for (const [n, h] of [['on plate', 'plate'], ['on boss', 'boss'], ['on angle', 'angle']] as const) { wire(b, 'screw', 'part', n, 'it'); wire(b, h, 'part', n, 'part'); }
    placeBlock(b, 'place', 640, 200, {}, 'p1'); wire(b, 'on plate', 'pasted', 'p1', 'thing');
    placeBlock(b, 'place', 640, 400, { x: 0.15 }, 'p2'); wire(b, 'on boss', 'pasted', 'p2', 'thing');
    placeBlock(b, 'place', 640, 600, { x: 0.3, rx: -Math.PI / 2 }, 'p3'); b.nodes.p3!.label = 'Laid flat, the face it was pasted on up'; wire(b, 'on angle', 'pasted', 'p3', 'thing');
    placeBlock(b, 'combine', 900, 400, { name: 'pasted' }, 'all'); for (const p of ['p1', 'p2', 'p3']) wire(b, p, 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 1160, 400, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    // (the plate gained its hole as an interface: read back and held)
    placeBlock(b, 'interfaces', 640, 0, {}, 'its interfaces'); wire(b, 'on plate', 'part', 'its interfaces', 'thing');
    placeBlock(b, 'assert', 900, 0, { what: 'the plate\'s interfaces', how: 'at least', target: 1 }, 'gained'); b.nodes.gained!.label = 'The plate gained its hole as an interface'; wire(b, 'its interfaces', 'count', 'gained', 'value');
    placeBlock(b, 'view.show', 900, 160, {}, 'said'); b.nodes.said!.label = 'On the plate, said'; wire(b, 'on plate', 'says', 'said', 'value');
    return b;
  }],
  ['Cut by the standards: a bearing\'s housing and its shaft, a dowel\'s hole, a key\'s keyways, a pipe port and a panel\'s cut-out', () => {
    // (spec 01, I17): five kinds of seat, hole and cut-out, each a row of data the one general path reads (interfaces.ts),
    // asked of real parts at a point and cut: a 6205's housing bore and shoulder in a 20 mm plate (H7) and its journal on a
    // stepped shaft (k5, its shoulder checked); an 8 × 7 key's keyways in a 30 mm shaft (N9, its round-ended slot) and through
    // its hub (JS9, started where the bore falls away under it); a 6 mm dowel's hole (H7); a G 1/2 port in 6061 (drilled,
    // chamfered, its face for the seal); a 22 mm push button's cut-out with its key recess. Each says its checks and the
    // limits its surfaces are held to; change a size and it is cut again, or refused by its rule
    const b = emptyBoard('Cut by the standards');
    const steel = { mat: 'steel-low', color: '#c8ccd2' }, cuts: [string, string, Record<string, unknown>, string, Record<string, unknown>, string][] = [
      ['housing', 'shape.box', { name: 'bearing housing', ...steel, w: 0.12, h: 0.02, d: 0.12 }, 'A steel plate, 120 × 20 mm: the bearing\'s housing', { row: 'bearing seat', side: 'housing', x: 0, y: 1, z: 0 }, 'The 6205\'s housing: its bore and shoulder'],
      ['journal', 'shape.lathe', { name: 'stepped shaft', ...steel, profile: '0, 0; 12.5, 0; 12.5, 15; 16, 15; 16, 60; 0, 60' }, 'A stepped shaft, 25 then 32 mm', { row: 'bearing seat', side: 'shaft', toward: 'y', x: 0.001, y: -0.5, z: 0.0007 }, 'The 6205\'s journal, on the shaft\'s end'],
      ['keyed shaft', 'shape.cyl', { name: 'keyed shaft', ...steel, r: 0.015, h: 0.08 }, 'A 30 mm shaft, 80 long', { row: 'parallel key', side: 'shaft', toward: '-x', x: 1, y: 0, z: 0 }, 'The key\'s keyway in the shaft'],
      ['hub', 'shape.lathe', { name: 'hub', ...steel, profile: '15, -20; 25, -20; 25, 20; 15, 20; 15, -20' }, 'A hub, 30 mm bore, 40 long', { row: 'parallel key', side: 'hub', toward: 'x', x: 0, y: 0.0005, z: 0 }, 'The key\'s keyway through the hub'],
      ['dowel plate', 'shape.box', { name: 'located plate', ...steel, w: 0.04, h: 0.01, d: 0.04 }, 'A 10 mm plate to be located', { row: 'dowel hole', x: 0, y: 1, z: 0 }, 'A 6 mm dowel\'s hole'],
      ['block', 'shape.box', { name: 'manifold block', mat: 'al-6061', color: '#d8dce0', w: 0.04, h: 0.03, d: 0.04 }, 'A 6061 block, 30 mm thick', { row: 'pipe port', x: 0, y: 1, z: 0 }, 'A G 1/2 port'],
      ['panel', 'shape.box', { name: 'panel', ...steel, w: 0.1, h: 0.002, d: 0.06 }, 'A 2 mm steel panel', { row: 'panel cut-out', x: 0, y: 1, z: 0 }, 'A 22 mm push button\'s cut-out'],
    ];
    cuts.forEach(([id, kind, set, label, ask, cutLabel], k) => {
      placeBlock(b, kind, 0, k * 170, set, id); b.nodes[id]!.label = label;
      const { x, y, z, ...cs } = ask; placeBlock(b, 'cut.standard', 300, k * 170, { ...cs, x, y, z }, `${id} cut`); b.nodes[`${id} cut`]!.label = cutLabel; wire(b, id, 'part', `${id} cut`, 'part');
      // (each laid so its cut faces up: the keyed shaft on its side, its keyway on top; the stepped shaft on its side, its
      // journal toward the front)
      const lay: Record<string, Record<string, number>> = { journal: { rz: -Math.PI / 2, y: 0.016 }, 'keyed shaft': { rz: Math.PI / 2, y: 0.015 } };
      placeBlock(b, 'place', 620, k * 170, { x: (k % 4) * 0.16, z: Math.floor(k / 4) * 0.16, ...(lay[id] ?? {}) }, `${id} placed`); wire(b, `${id} cut`, 'part', `${id} placed`, 'thing');
    });
    placeBlock(b, 'combine', 900, 500, { name: 'cut by the standards' }, 'all'); for (const [id] of cuts) wire(b, `${id} placed`, 'placed', 'all', 'things');
    placeBlock(b, 'space.show', 1160, 500, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.table', 900, 0, {}, 'limits'); b.nodes.limits!.label = 'The housing\'s limits'; wire(b, 'housing cut', 'limits', 'limits', 'rows');
    placeBlock(b, 'view.show', 900, 200, {}, 'said'); b.nodes.said!.label = 'The hub\'s keyway, said'; wire(b, 'hub cut', 'says', 'said', 'value');
    return b;
  }],
  ['The cover follows the bore: widen the bore and the bolt circle, both parts\' holes, the bolts and the cover\'s place follow', () => {
    // (spec 01, I11 and I13; R11, R14, R15; evaluation case 9): the bore sets the least bolt circle round it (EN 1993-1-8's
    // end distance, 1.2 d0, d0 ISO 273's medium hole); one circle both the flange's and the cover's holes read; the bolts
    // the catalogue sells for the two plates (ISO 4017, washers, nut), drawn through both; the cover put on the flange by its holes (a face and
    // a joint for each hole, solved together: 0 freedom left). Change the bore from 40 to 50 mm: everything that reads it
    // runs again in the engine's order, each saying what it made; the plates themselves are not made again
    const b = emptyBoard('The cover follows the bore');
    placeBlock(b, 'in.number', 0, 0, { value: 0.04, unit: 'm' }, 'bore'); b.nodes.bore!.label = 'The bore (change it: 40 → 50 mm)';
    placeBlock(b, 'relation.boltcircle', 260, 0, { thread: 'M8' }, 'circle radius'); placeBlock(b, 'pattern.circle', 520, 0, { thread: 'M8', count: 6 }, 'bolt circle');
    placeBlock(b, 'in.number', 0, 200, { value: 0.08, unit: 'm' }, 'plate radius'); placeBlock(b, 'in.number', 0, 320, { value: 0.01, unit: 'm' }, 'flange thickness'); placeBlock(b, 'in.number', 0, 440, { value: 0.006, unit: 'm' }, 'cover thickness');
    placeBlock(b, 'shape.cyl', 260, 240, { name: 'flange', mat: 'steel-low' }, 'flange'); placeBlock(b, 'shape.cyl', 260, 440, { name: 'cover', mat: 'steel-low' }, 'cover');
    placeBlock(b, 'imprint.pattern', 520, 240, {}, 'flange holes'); placeBlock(b, 'imprint.pattern', 520, 440, {}, 'cover holes'); placeBlock(b, 'fasten.pattern', 780, 0, {}, 'bolts');
    for (const [f, o, t, i] of [['bore', 'value', 'circle radius', 'bore'], ['circle radius', 'r', 'bolt circle', 'r'], ['plate radius', 'value', 'flange', 'r'], ['flange thickness', 'value', 'flange', 'h'], ['plate radius', 'value', 'cover', 'r'], ['cover thickness', 'value', 'cover', 'h'],
      ['flange', 'part', 'flange holes', 'part'], ['bolt circle', 'pattern', 'flange holes', 'pattern'], ['cover', 'part', 'cover holes', 'part'], ['bolt circle', 'pattern', 'cover holes', 'pattern'], ['bolt circle', 'pattern', 'bolts', 'pattern'], ['flange thickness', 'value', 'bolts', 't1'], ['cover thickness', 'value', 'bolts', 't2'], ['flange holes', 'part', 'bolts', 'on']] as const) wire(b, f, o, t, i);
    placeBlock(b, 'joint', 780, 340, {}, 'cover on flange'); b.nodes['cover on flange']!.label = 'The cover on the flange, by its holes'; wire(b, 'flange holes', 'part', 'cover on flange', 'a'); wire(b, 'cover holes', 'part', 'cover on flange', 'b');
    placeBlock(b, 'combine', 1040, 340, { name: 'flange, cover and bolts' }, 'all'); wire(b, 'cover on flange', 'together', 'all', 'things'); wire(b, 'bolts', 'bolts', 'all', 'things');
    placeBlock(b, 'space.show', 1300, 340, {}, 'show'); wire(b, 'all', 'assembly', 'show', 'thing');
    placeBlock(b, 'view.show', 1040, 0, {}, 'bolts said'); b.nodes['bolts said']!.label = 'The bolts, and why those'; wire(b, 'bolts', 'says', 'bolts said', 'value');
    placeBlock(b, 'view.show', 1040, 160, {}, 'joint said'); b.nodes['joint said']!.label = 'The cover\'s joints, solved together'; wire(b, 'cover on flange', 'says', 'joint said', 'value');
    return b;
  }],
  ['Nothing can overlap: a starter motor put together by operations, its solenoid refused inside it', () => {
    // (the user, 2026-11-02: "No nothing should be checked for overlap it shouldn't be possible"; decision 0021) No node
    // here takes an x, a y or a z: the armature goes into its can's room, the solenoid against the motor's side, the
    // pair onto a bracket, a bolt along the bracket's hole. Asked to put the solenoid into the motor too, the room is
    // already used: refused, and said. Sizes are a typical small starter's (estimates).
    const b = emptyBoard('Nothing can overlap: a starter motor');
    const make = (id: string, label: string, set: Record<string, unknown>) => { placeBlock(b, 'room.make', 0, 0, set, id); b.nodes[id]!.label = label; };
    make('can', 'Motor can: a cup, its cavity a room', { name: 'motor can', shape: 'cup', mat: 'steel-low', a: 26, b: 72, c: 2, d: 3 });
    make('arm', 'Armature', { name: 'armature', shape: 'rod', mat: 'copper', a: 21, b: 58 });
    placeBlock(b, 'room.into', 0, 0, { fit: 'clear' }, 'motor'); b.nodes.motor!.label = 'The armature into its can'; wire(b, 'can', 'block', 'motor', 'host'); wire(b, 'arm', 'block', 'motor', 'child');
    make('sol', 'Solenoid', { name: 'solenoid', shape: 'rod', mat: 'steel-alloy', a: 16, b: 70 });
    placeBlock(b, 'room.into', 0, 0, { fit: 'clear', refused: 'say' }, 'inside'); b.nodes.inside!.label = 'Try: the solenoid inside the motor'; wire(b, 'motor', 'block', 'inside', 'host'); wire(b, 'sol', 'block', 'inside', 'child');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Refused, and why'; wire(b, 'inside', 'refused', 'why', 'value');
    placeBlock(b, 'room.onto', 0, 0, { face: '+x', fit: 'clear' }, 'pair'); b.nodes.pair!.label = 'The solenoid against the motor\'s side'; wire(b, 'motor', 'block', 'pair', 'host'); wire(b, 'sol', 'block', 'pair', 'child');
    make('bracket', 'Bracket, two bolt holes', { name: 'bracket', shape: 'box', mat: 'al-6061', a: 160, b: 8, c: 70, holes: 2, pcd: 66, hole: 5 });
    placeBlock(b, 'room.onto', 0, 0, { face: '-y', fit: 'touch' }, 'mounted'); b.nodes.mounted!.label = 'The pair on its bracket'; wire(b, 'pair', 'block', 'mounted', 'host'); wire(b, 'bracket', 'block', 'mounted', 'child');
    make('bolt', 'Bolt', { name: 'bolt', shape: 'rod', mat: 'steel-alloy', a: 4, b: 22 });
    placeBlock(b, 'room.through', 0, 0, { line: 'bracket/holes', which: 0, from: 'below', fit: 'clear' }, 'bolted'); b.nodes.bolted!.label = 'A bolt along the bracket\'s hole'; wire(b, 'mounted', 'block', 'bolted', 'host'); wire(b, 'bolt', 'block', 'bolted', 'passer');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'bolted', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'bolted', 'says', 'said', 'value');
    return b;
  }],
  ] as [string, Make][]);
  return boards.map(([n, f]) => [n, () => tidy(f())] as [string, Make]);
}
