// The starter boards: real node flows across fields, each a pipeline to start from (the library's Boards). Pure: no page
// is needed to read them, so navigation (src/nexus/navigate.ts), the tests and the docs see every flow the page offers. The
// page lays each out (its own tidy) as it opens it.

import { emptyBoard, placeBlock, wire } from './dataflow';
import type { Board } from './boards';

export type Make = () => Board;
/** Every starter board, laid out by the tidy given (none: as placed). */
export function starterBoards(tidy: (b: Board) => Board = (b) => b): [string, Make][] {
  const boards = ([
  ['A battery built from its parts, node by node: plates with their lugs, separators, plates stacked, straps, cells in a case, its lid and posts', () => {
    // a BCI group 35 starting battery (230 × 175 × 225 mm, its case the standard's), made by the operations only (decision
    // 0021: no place written, none can overlap): each plate a section with its lug, drawn solid lead (its sizes typical:
    // 163.6 × 129.9 mm, the positive 1.8 mm thick (a 1.1 mm grid pasted 0.35 mm proud each side), the negative 1.5 mm),
    // the positive between two separator sheets (0.6 mm polyethylene, typical; Around makes a round housing, so the
    // envelope is drawn as its two faces), seven negatives and six positives in turn, a lead strap over each side's lugs
    // (a ring of two at the lugs' line), the cell into its compartment (a case of its own here, 1.2 mm walls, typical),
    // six side by side into the case's cavity, its lid on, two posts on the lid. Take it apart: case, cells, plates.
    // (Drawn solid, the plates weigh more than a real cell's porous paste; the electrolyte is not drawn)
    const b = emptyBoard('A battery built from its parts');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('pos', 'room.make', { name: 'positive plate', shape: 'section', mat: 'lead', a: 1.8, pts: '0,0; 163.6,0; 163.6,129.9; 157.6,129.9; 157.6,145.9; 145.6,145.9; 145.6,129.9; 0,129.9' }, 'Positive plate, its lug at one side (lead dioxide paste on a grid)');
    put('neg', 'room.make', { name: 'negative plate', shape: 'section', mat: 'lead', a: 1.5, pts: '0,0; 163.6,0; 163.6,129.9; 18,129.9; 18,145.9; 6,145.9; 6,129.9; 0,129.9' }, 'Negative plate, its lug at the other side (sponge lead)');
    for (const s of ['sepA', 'sepB']) put(s, 'room.make', { name: 'separator', shape: 'box', mat: 'pe', a: 165, b: 135, c: 0.6 }, 'A separator sheet (polyethylene)');
    put('sep', 'room.stack', { name: 'positive in its separator', axis: 'z', fit: 'touch', order: 'sepA, pos, sepB' }, 'The positive between its separator\'s faces'); for (const x of ['sepA', 'pos', 'sepB']) wire(b, x, 'block', 'sep', 'blocks');
    put('pair', 'room.stack', { name: 'plate pair', axis: 'z', fit: 'touch', order: 'sep, neg' }, 'A positive in its separator, then a negative'); wire(b, 'sep', 'block', 'pair', 'blocks'); wire(b, 'neg', 'block', 'pair', 'blocks');
    put('plates', 'room.stack', { name: 'plates', axis: 'z', fit: 'touch', order: 'neg, pair' }, 'Stack them: 13 plates, a negative at each end'); wire(b, 'neg', 'block', 'plates', 'blocks'); for (let k = 0; k < 6; k++) wire(b, 'pair', 'block', 'plates', 'blocks');
    put('strap', 'room.make', { name: 'strap', shape: 'box', mat: 'lead', a: 12, b: 8, c: 28.5 }, 'A strap (lead), the stack\'s length');
    put('straps', 'room.ring', { name: 'straps', n: 2, R: 69.8, fit: 'clear' }, 'One over each side\'s lugs'); wire(b, 'strap', 'block', 'straps', 'block');
    put('cell', 'room.stack', { name: 'cell (13 plates)', axis: 'y', fit: 'touch', order: 'plates, straps' }, 'The straps on their lugs: a 2 V cell'); wire(b, 'plates', 'block', 'cell', 'blocks'); wire(b, 'straps', 'block', 'cell', 'blocks');
    put('box1', 'room.make', { name: 'cell compartment', shape: 'case', mat: 'pp', a: 169.5, b: 160, c: 33, d: 1.2, e: 2.5 }, 'A compartment (polypropylene), its cavity a room');
    put('room1', 'room.into', { fit: 'clear' }, 'The cell into its compartment'); wire(b, 'box1', 'block', 'room1', 'host'); wire(b, 'cell', 'block', 'room1', 'child');
    put('cells', 'room.stack', { name: 'six cells', axis: 'z', fit: 'touch' }, 'Six side by side, their walls the partitions'); for (let k = 0; k < 6; k++) wire(b, 'room1', 'block', 'cells', 'blocks');
    put('case', 'room.make', { name: 'battery case', shape: 'case', mat: 'pp', a: 174.6, b: 195.4, c: 230.2, d: 2.5, e: 2.5 }, 'The case (polypropylene), 230 × 175 mm, its cavity a room');
    put('cased', 'room.into', { fit: 'touch' }, 'The cells into the case'); wire(b, 'case', 'block', 'cased', 'host'); wire(b, 'cells', 'block', 'cased', 'child');
    // (the lid's two post holes along one long edge, as a group 35's posts stand: their centres 28 mm in from that edge and
    // 25 mm in from each end, typical)
    put('lid', 'room.make', { name: 'lid', shape: 'box', mat: 'pp', a: 174.6, b: 12, c: 230.2, points: '-59.3,-90.1; -59.3,90.1', hole: 10.35 }, 'Its lid (polypropylene), a post hole at each end of one long edge');
    put('post', 'room.make', { name: 'terminal post', shape: 'cone', mat: 'lead', a: 10.35, b: 8.75, c: 32 }, 'A post, tapered (typical: 19.5 mm across where it leaves the lid, 17.5 at its top, 20 mm out), its foot down in the lid');
    put('post1', 'room.through', { line: 'lid/holes', which: 0, from: 'below', fit: 'tight' }, 'A post up through the lid\'s first hole'); wire(b, 'lid', 'block', 'post1', 'host'); wire(b, 'post', 'block', 'post1', 'passer');
    put('posts', 'room.through', { line: 'lid/holes', which: 1, from: 'below', fit: 'tight' }, 'And the other'); wire(b, 'post1', 'block', 'posts', 'host'); wire(b, 'post', 'block', 'posts', 'passer');
    put('all', 'room.stack', { name: '12 V battery, group 35 (built here)', axis: 'y', fit: 'touch', order: 'cased, posts' }, 'The case, its lid on with its posts'); for (const x of ['cased', 'posts']) wire(b, x, 'block', 'all', 'blocks');
    // (each step's part on the board itself, turning: the plate, the plate in its separator, the cell)
    for (const [k, from, label] of [['v1', 'pos', 'A positive plate'], ['v2', 'sep', 'In its separator'], ['v3', 'cell', 'A cell, its plates strapped']] as [string, string, string][]) { placeBlock(b, 'view.3d', 0, 0, { explode: 0 }, k); b.nodes[k]!.label = label; wire(b, from, 'thing', k, 'part'); }
    // (shown whole: what a person opening it should see is a battery. To look inside, put a Take apart node on what it makes)
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'all', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); wire(b, 'all', 'thing', 'measure', 'thing');
    placeBlock(b, 'audit.explode', 0, 0, {}, 'audit'); b.nodes.audit!.label = 'Does it come apart to the bottom?'; wire(b, 'all', 'thing', 'audit', 'thing');
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
    // (a knock sensor made by the operations: its piezo ring, the body moulded round it; sizes typical)
    placeBlock(b, 'room.make', 0, 0, { name: 'piezo ring', shape: 'tube', mat: 'pzt', a: 4.25, b: 10, c: 4 }, 'elem'); b.nodes.elem!.label = 'Its sensing element: a piezo ceramic ring';
    placeBlock(b, 'room.around', 0, 0, { name: 'knock sensor', mat: 'pbt', wall: 3, ends: 3, fit: 'touch', open: 'no' }, 'sens'); b.nodes.sens!.label = 'A knock sensor: its body moulded round the ring'; wire(b, 'elem', 'block', 'sens', 'child');
    placeBlock(b, 'research.loop', 0, 0, { rounds: 8 }, 'loop'); b.nodes.loop!.label = 'Research loop, to the bottom'; wire(b, 'sens', 'thing', 'loop', 'drawing');
    placeBlock(b, 'view.table', 0, 0, {}, 'rounds'); b.nodes.rounds!.label = 'Each round: found, resolved, left'; wire(b, 'loop', 'rounds', 'rounds', 'rows');
    placeBlock(b, 'task', 0, 0, { list: true }, 'tasks'); b.nodes.tasks!.label = 'Tasks left'; wire(b, 'g5', 'approved', 'tasks', 'done');
    placeBlock(b, 'view.table', 0, 0, {}, 'taskRows'); b.nodes.taskRows!.label = 'Tasks'; wire(b, 'tasks', 'tasks', 'taskRows', 'rows');
    placeBlock(b, 'read', 0, 0, { id: 'piece.winding', kind: 'block' }, 'read'); b.nodes.read!.label = 'Read a block';
    placeBlock(b, 'test.block', 0, 0, { id: 'piece.winding' }, 'tester'); b.nodes.tester!.label = 'Tester';
    placeBlock(b, 'search.library', 0, 0, { q: 'sensor' }, 'search'); b.nodes.search!.label = 'Search what is known';
    placeBlock(b, 'delete', 0, 0, { what: 'block', really: false }, 'del'); b.nodes.del!.label = 'Delete (only says, until told)'; wire(b, 'g2', 'rejected', 'del', 'ids');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'sens', 'thing', 'show', 'thing');
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
    // each metal's colour from its measured n + i k (docs/REALITY.md phase 3): Fresnel, the CIE 1931 eye, daylight, sRGB.
    // Fourteen balls made by the operations, two rows of seven a clear fit apart, each coloured where it is by its own
    // worked-out colour (a variant on the ball its name finds)
    const b = emptyBoard('Metals, coloured by their physics');
    const metals = ['silver', 'aluminium', 'platinum', 'palladium', 'nickel', 'cobalt', 'zinc', 'lead', 'titanium', 'chromium', 'iron', 'tungsten', 'copper', 'gold'];
    const id2 = (k: number) => String(k).padStart(2, '0');
    metals.forEach((m, k) => {
      placeBlock(b, 'optics.colour', 0, 0, { metal: m }, `c${k}`); b.nodes[`c${k}`]!.label = `${m[0]!.toUpperCase()}${m.slice(1)}: why it is its colour`;
      placeBlock(b, 'room.make', 0, 0, { name: m, shape: 'sphere', mat: 'steel-low', a: 30 }, `s${id2(k)}`);
    });
    for (const r of [0, 1]) { placeBlock(b, 'room.stack', 0, 0, { name: r ? 'front row' : 'back row', axis: 'x', fit: 'clear', level: 'on the ground' }, `row${r}`); for (let k = r * 7; k < r * 7 + 7; k++) wire(b, `s${id2(k)}`, 'block', `row${r}`, 'blocks'); }
    placeBlock(b, 'room.stack', 0, 0, { name: 'fourteen metals', axis: 'z', fit: 'clear', level: 'on the ground' }, 'all'); wire(b, 'row0', 'block', 'all', 'blocks'); wire(b, 'row1', 'block', 'all', 'blocks');
    let last: [string, string] = ['all', 'thing'];
    metals.forEach((m, k) => { placeBlock(b, 'variant', 0, 0, { path: `^${m}$`, finish: 'chrome' }, `v${k}`); b.nodes[`v${k}`]!.label = `The ${m} ball, its colour`; wire(b, last[0], last[1], `v${k}`, 'thing'); wire(b, `c${k}`, 'hex', `v${k}`, 'color'); last = [`v${k}`, 'variant']; });
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back row: silver to cobalt … front: the rest, gold last'; wire(b, last[0], last[1], 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Copper: why'; wire(b, 'c12', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Steel, finished five ways: turned, ground, polished, bead blasted and sand cast, each surface\'s roughness and gloss worked out from how it was made, its colour from iron\'s optics', () => {
    // how a surface looks is how it was made (docs/REALITY.md phase 3.3): the tool's marks set its roughness, its facets'
    // slopes how wide the highlight spreads; the metal's own optics its colour. Five bars made by the operations in a row
    // a clear fit apart, each given iron's colour and its own process's finish where it is
    const b = emptyBoard('Steel, finished five ways');
    placeBlock(b, 'optics.colour', 0, 0, { metal: 'iron' }, 'fe'); b.nodes.fe!.label = 'Iron: its colour';
    const ways = ['turned', 'ground', 'polished', 'bead blasted', 'sand cast'];
    placeBlock(b, 'room.stack', 0, 0, { name: 'five finishes', axis: 'x', fit: 'clear', level: 'on the ground' }, 'all');
    let last: [string, string] = ['all', 'thing'];
    ways.forEach((w, k) => {
      placeBlock(b, 'surface.finish', 0, 0, { process: w }, `f${k}`); b.nodes[`f${k}`]!.label = `${w[0]!.toUpperCase()}${w.slice(1)}: its surface`;
      placeBlock(b, 'room.make', 0, 0, { name: `${w} bar`, shape: 'rod', mat: 'steel-low', a: 20, b: 160 }, `s${k}`); wire(b, `s${k}`, 'block', 'all', 'blocks');
      placeBlock(b, 'variant', 0, 0, { path: `^${w} bar$` }, `v${k}`); b.nodes[`v${k}`]!.label = `The ${w} bar, its colour and finish`; wire(b, last[0], last[1], `v${k}`, 'thing'); wire(b, 'fe', 'hex', `v${k}`, 'color'); wire(b, `f${k}`, 'finish', `v${k}`, 'finish'); last = [`v${k}`, 'variant'];
    });
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Left to right: turned, ground, polished, bead blasted, sand cast'; wire(b, last[0], last[1], 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Turned: why it shines in a streak'; wire(b, 'f0', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Colours with no dye: titanium anodised from 10 to 100 volts, and steel tempered as its oxide thickens, each colour worked out from light crossing a film of oxide', () => {
    // a film on a metal (docs/REALITY.md phase 3.3): the colour is the film's thickness, by interference. Twenty coupons
    // made by the operations, two rows of ten a clear fit apart, each coloured where it is by its own film
    const b = emptyBoard('Colours with no dye');
    const rows: [string, Record<string, unknown>, string][] = [
      ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v): [string, Record<string, unknown>, string] => [`ti${v}`, { metal: 'titanium', film: 'TiO2 (amorphous)', by: 'anodised at a voltage', volts: v }, `Titanium, ${v} V`]),
      ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((d): [string, Record<string, unknown>, string] => [`fe${d}`, { metal: 'iron', film: 'Fe3O4 (magnetite)', by: 'given in nm', d }, `Steel, oxide ${d} nm`])];
    const id2 = (k: number) => String(k).padStart(2, '0');
    for (const r of [0, 1]) placeBlock(b, 'room.stack', 0, 0, { name: r ? 'steel coupons' : 'titanium coupons', axis: 'x', fit: 'clear', level: 'on the ground' }, `row${r}`);
    placeBlock(b, 'room.stack', 0, 0, { name: 'coupons', axis: 'z', fit: 'clear', level: 'on the ground' }, 'all'); wire(b, 'row0', 'block', 'all', 'blocks'); wire(b, 'row1', 'block', 'all', 'blocks');
    let last: [string, string] = ['all', 'thing'];
    rows.forEach(([id, set, label], k) => {
      placeBlock(b, 'optics.film', 0, 0, set, `c_${id}`); b.nodes[`c_${id}`]!.label = label;
      placeBlock(b, 'room.make', 0, 0, { name: label, shape: 'rod', mat: k < 10 ? 'titanium' : 'steel-low', a: 25, b: 6 }, `s${id2(k)}`); wire(b, `s${id2(k)}`, 'block', `row${k < 10 ? 0 : 1}`, 'blocks');
      placeBlock(b, 'variant', 0, 0, { path: `^${label}$`, finish: 'polished' }, `v_${id}`); wire(b, last[0], last[1], `v_${id}`, 'thing'); wire(b, `c_${id}`, 'hex', `v_${id}`, 'color'); last = [`v_${id}`, 'variant'];
    });
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: titanium, 10 to 100 V; front: steel, oxide 0 to 90 nm'; wire(b, last[0], last[1], 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'Titanium at 30 V: why it is blue'; wire(b, 'c_ti30', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['One shape, eight looks: bare steel, aluminium and copper coloured by their optics, titanium anodised, steel heat tinted, a solid paint under clear coat, a metallic paint, and the same paint worn', () => {
    // a part's look as layers (docs/REALITY.md phase 3.4): the substrate worked out, everything over it editable. Eight
    // balls made by the operations, two rows of four a clear fit apart, polished, each given its look where it is
    const b = emptyBoard('One shape, eight looks');
    const looks: [string, string, Record<string, unknown>, string][] = [
      ['steel', 'steel-low', { finish: 'polished' }, 'Steel, bare: iron\'s optics'], ['al', 'al-6061', {}, 'Aluminium, bare'], ['cu', 'copper', {}, 'Copper, bare'],
      ['ti', 'titanium', { treatment: 'anodised at a voltage', volts: 30 }, 'Titanium anodised at 30 V'], ['tint', 'steel-low', { treatment: 'an oxide film', film: 'Fe3O4 (magnetite)', d: 45 }, 'Steel heat tinted, 45 nm of oxide'],
      ['red', 'steel-low', { coat: 'solid paint', paint: '#b3122b' }, 'Solid red under clear coat'], ['blue', 'al-6061', { coat: 'metallic paint', paint: '#1d3f8f', flake: 0.5 }, 'Metallic blue, half flake'], ['worn', 'steel-low', { coat: 'solid paint', paint: '#b3122b', wear: 0.6 }, 'The red, worn']];
    for (const r of [0, 1]) placeBlock(b, 'room.stack', 0, 0, { name: r ? 'front row' : 'back row', axis: 'x', fit: 'clear', level: 'on the ground' }, `row${r}`);
    placeBlock(b, 'room.stack', 0, 0, { name: 'eight looks', axis: 'z', fit: 'clear', level: 'on the ground' }, 'all'); wire(b, 'row0', 'block', 'all', 'blocks'); wire(b, 'row1', 'block', 'all', 'blocks');
    placeBlock(b, 'variant', 0, 0, { color: '#888888', finish: 'polished' }, 'base'); b.nodes.base!.label = 'All polished'; wire(b, 'all', 'thing', 'base', 'thing');
    let last: [string, string] = ['base', 'variant'];
    looks.forEach(([id, mat, set, label], k) => {
      placeBlock(b, 'room.make', 0, 0, { name: label, shape: 'sphere', mat, a: 30 }, `s${k}`); wire(b, `s${k}`, 'block', `row${k < 4 ? 0 : 1}`, 'blocks');
      const { finish: _f, ...rest } = set; placeBlock(b, 'look', 0, 0, { ...rest, path: `^${label}$` }, `l_${id}`); b.nodes[`l_${id}`]!.label = label; wire(b, last[0], last[1], `l_${id}`, 'thing'); last = [`l_${id}`, 'looked'];
    });
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: steel, aluminium, copper, titanium anodised; front: heat tint, red, metallic blue, worn red'; wire(b, last[0], last[1], 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'why'); b.nodes.why!.label = 'The anodised one: why'; wire(b, 'l_ti', 'says', 'why', 'value');
    return tidy(b);
  }],
  ['Paint jobs and wear: a striped panel new and worn, a two-tone drum, bare steel rusting in its hollows, the wear drawn where the shape puts it', () => {
    // graphics and wear as layers of a look (docs/REALITY.md phase 3.4): a coat chips off where the surface is most
    // convex, bare iron rusts where it is hollow, both read from the shape itself. Six steel things made by the
    // operations (the tube laid on its side by a turn, the ring a circle turned about its axis), two rows of three a clear
    // fit apart, ground, each given its look where it is
    const b = emptyBoard('Paint jobs and wear');
    const stripe = { coat: 'solid paint', paint: '#b3122b', g1: 'stripe', g1axis: 'x', g1at: 0, g1width: 0.02, g1colour: '#f2f2f2', g2: 'stripe', g2axis: 'x', g2at: 0.025, g2width: 0.006, g2colour: '#f2f2f2' };
    // (the ring's section: a circle of 12 mm radius 35 mm out, the outline a lathe turns, 24 points)
    const torus = Array.from({ length: 24 }, (_, k) => `${(35 + 12 * Math.cos((k / 24) * 2 * Math.PI)).toFixed(3)},${(12 * Math.sin((k / 24) * 2 * Math.PI)).toFixed(3)}`).join('; ');
    const items: [string, Record<string, unknown>, Record<string, unknown>, string][] = [
      ['new', { shape: 'box', a: 120, b: 40, c: 80 }, stripe, 'Red, white stripes, new'],
      ['worn', { shape: 'box', a: 120, b: 40, c: 80 }, { ...stripe, wear: 0.7 }, 'The same, worn: chipped at its edges'],
      ['two', { shape: 'rod', a: 35, b: 90 }, { coat: 'solid paint', paint: '#1d3f8f', g1: 'two-tone above', g1axis: 'y', g1at: 0.005, g1colour: '#ece8dc' }, 'Two-tone drum'],
      ['twow', { shape: 'rod', a: 35, b: 90 }, { coat: 'solid paint', paint: '#1d3f8f', g1: 'two-tone above', g1axis: 'y', g1at: 0.005, g1colour: '#ece8dc', wear: 0.6 }, 'The drum, worn'],
      ['tube', { shape: 'tube', a: 24, b: 30, c: 110 }, { wear: 0.7 }, 'Bare steel tube, rusting'],
      ['ring', { shape: 'lathe', pts: torus }, { coat: 'metallic paint', paint: '#2f6b3a', flake: 0.5, wear: 0.5 }, 'Metallic green ring, worn']];
    for (const r of [0, 1]) placeBlock(b, 'room.stack', 0, 0, { name: r ? 'front row' : 'back row', axis: 'x', fit: 'clear', level: 'on the ground' }, `row${r}`);
    placeBlock(b, 'room.stack', 0, 0, { name: 'paint and wear', axis: 'z', fit: 'clear', level: 'on the ground' }, 'all'); wire(b, 'row0', 'block', 'all', 'blocks'); wire(b, 'row1', 'block', 'all', 'blocks');
    placeBlock(b, 'variant', 0, 0, { color: '#888888', finish: 'ground' }, 'base'); b.nodes.base!.label = 'All ground'; wire(b, 'all', 'thing', 'base', 'thing');
    let last: [string, string] = ['base', 'variant'];
    items.forEach(([id, shape, look, label], k) => {
      placeBlock(b, 'room.make', 0, 0, { name: label, mat: 'steel-low', ...shape }, id === 'tube' ? 'm4' : `s${k}`);
      if (id === 'tube') { placeBlock(b, 'room.turn', 0, 0, { axis: 'z', degrees: 90 }, `s${k}`); b.nodes[`s${k}`]!.label = 'Laid on its side'; wire(b, 'm4', 'block', `s${k}`, 'block'); }
      wire(b, `s${k}`, 'block', `row${k < 3 ? 0 : 1}`, 'blocks');
      placeBlock(b, 'look', 0, 0, { ...look, path: `^${label}$` }, `l_${id}`); b.nodes[`l_${id}`]!.label = label; wire(b, last[0], last[1], `l_${id}`, 'thing'); last = [`l_${id}`, 'looked'];
    });
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); b.nodes.show!.label = 'Back: panel new, worn, drum; front: drum worn, tube rusting, ring'; wire(b, last[0], last[1], 'show', 'thing');
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
  ['Controls you work while it runs: a stick drives the cart (the arrow keys, W A S D, a phone\'s drawn stick, a gamepad), the button on the crates adds a crate to the row each press (E, the drawn button, or press it on a crate in 3D); Walk (V) to stand in it at your own height', () => {
    // every piece made and put by the operations: the cart beside the row of crates in the yard, each crate with its
    // button on top (a piece named for the control, so pressing it in 3D presses the button); the stick carries the cart
    // from where the yard put it, and each press makes the row again one crate longer
    const b = emptyBoard('Controls');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    // (the cart as the physics cart is made: a deck (18 mm plywood, wood veneer at 680 kg/m³, typical) on four 125 mm wheels, each over an
    // end of its 10 mm axle (the wheel's bore; its running clearance not drawn), the axles laid across and a frame rod between them, end to end, the
    // deck stacked on them. Sizes typical of a flatbed yard cart, estimates)
    put('cdeck', 'room.make', { name: 'cart', shape: 'box', mat: 'wood-veneer', a: 800, b: 18, c: 1200 }, 'The cart\'s deck, 800 × 1200 mm, 18 mm plywood');
    put('cwheel', 'piece.wheel', { size: '125' }, 'A wheel, 125 mm (one made, used four times)');
    for (const [ax, name] of [['r', 'rear axle'], ['f', 'front axle']] as const) {
      put(`c${ax}a`, 'room.make', { name, shape: 'rod', mat: 'steel-low', a: 5, b: 800 }, `The ${name}, 10 mm, 800 mm long`);
      put(`c${ax}1`, 'room.over', { line: `${name}/axis`, where: 'lo', fit: 'touch' }, 'A wheel over one end'); wire(b, `c${ax}a`, 'block', `c${ax}1`, 'host'); wire(b, 'cwheel', 'block', `c${ax}1`, 'sleeve');
      put(`c${ax}2`, 'room.over', { line: `${name}/axis`, where: 'hi', fit: 'touch' }, 'And over the other'); wire(b, `c${ax}1`, 'block', `c${ax}2`, 'host'); wire(b, 'cwheel', 'block', `c${ax}2`, 'sleeve');
      put(`c${ax}t`, 'room.turn', { axis: 'z', degrees: 90 }, 'Laid across'); wire(b, `c${ax}2`, 'block', `c${ax}t`, 'block');
    }
    put('cframe', 'room.make', { name: 'frame', shape: 'rod', mat: 'steel-low', a: 10, b: 850 }, 'Frame rod between the axles, 20 mm');
    put('cframeT', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along'); wire(b, 'cframe', 'block', 'cframeT', 'block');
    put('cgear', 'room.stack', { name: 'running gear', axis: 'z', fit: 'clear', order: 'crt, cframeT, cft' }, 'Rear axle, frame, front axle, end to end'); for (const x of ['crt', 'cframeT', 'cft']) wire(b, x, 'block', 'cgear', 'blocks');
    put('cart', 'room.stack', { name: 'cart', axis: 'y', fit: 'touch', order: 'cgear, cdeck' }, 'The cart: its deck on its running gear'); wire(b, 'cgear', 'block', 'cart', 'blocks'); wire(b, 'cdeck', 'block', 'cart', 'blocks');
    // (a crate: a hollow polypropylene box, 4 mm walls (typical of a stacking crate), its lid on, its button on the lid)
    put('crateBox', 'piece.case', { name: 'crate', mat: 'pp', w: 500, h: 500, d: 500, wall: 4, floor: 4 }, 'A crate, hollow (polypropylene, 4 mm walls)');
    put('crateLid', 'mate.lid', { t: 4, mat: 'pp' }, 'Its lid on'); wire(b, 'crateBox', 'block', 'crateLid', 'box');
    put('cap', 'room.make', { name: 'button: Add a crate', shape: 'rod', mat: 'abs', a: 40, b: 20 }, 'Its button\'s cap');
    put('crate', 'room.onto', { face: '+y', fit: 'touch' }, 'The button on the crate\'s lid'); wire(b, 'crateLid', 'block', 'crate', 'host'); wire(b, 'cap', 'block', 'crate', 'child');
    put('add', 'control.button', { name: 'Add a crate', key: 'E', colour: 'green', face: 'top' }, 'Add a crate (button)'); wire(b, 'crate', 'block', 'add', 'block');
    put('yard', 'room.stack', { name: 'the yard', axis: 'z', fit: 'clear', level: 'on the ground', order: 'cart, add' }, 'The cart beside the row, on the ground'); wire(b, 'cart', 'block', 'yard', 'blocks'); wire(b, 'add', 'row', 'yard', 'blocks');
    put('drive', 'control.stick', { name: 'Drive', speed: 3, mode: 'steer', piece: 'cart, rear axle, front axle, frame, 125 mm wheel hub, 125 mm wheel tyre' }, 'Drive (stick)'); wire(b, 'yard', 'thing', 'drive', 'thing');
    put('show', 'space.show', {}); wire(b, 'drive', 'driven', 'show', 'thing');
    return tidy(b);
  }],
  ['Export: an M8 bolt as exact solids, written as STEP (named, coloured), STL, 3MF, glTF and its bill of materials, and the STEP read back by the kernel to prove it went out whole (wire any thing in: the engine is 1,512 solids and about a minute)', () => {
    const b = emptyBoard('Export');
    placeBlock(b, 'piece.bolt', 0, 0, { size: 'M8', length: 40 }, 'bolt'); b.nodes.bolt!.label = 'An M8 bolt (ISO 4014), made by the operations';
    placeBlock(b, 'export.files', 0, 0, {}, 'ex'); b.nodes.ex!.label = 'Its files'; wire(b, 'bolt', 'thing', 'ex', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'ls'); b.nodes.ls!.label = 'Each file'; wire(b, 'ex', 'list', 'ls', 'rows');
    placeBlock(b, 'view.show', 0, 0, {}, 'sy'); wire(b, 'ex', 'says', 'sy', 'value');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'bolt', 'thing', 'show', 'thing');
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
    // the laminate as a part: a 1 m bar of it beside one of steel (each made by the operations, 20 mm square), each
    // coloured and satin, each pushed 10 N sideways at its top, each seen bent on the board; in the space the two stand
    // side by side on the ground, laid by the room's stack (one thing shown, not two on one spot)
    let last: [string, string] = ['bars', 'thing'];
    placeBlock(b, 'room.stack', 0, 0, { name: 'two bars', axis: 'x', fit: 'clear', level: 'on the ground', order: 'lam, stl' }, 'bars'); b.nodes.bars!.label = 'The two bars side by side';
    for (const [id, mat, colour] of [['lam', 'cfrp-ud-60', '#2b2b2e'], ['stl', 'steel-low', '#7a8088']] as const) {
      placeBlock(b, 'room.make', 0, 0, { name: `${mat} bar`, shape: 'box', mat, a: 20, b: 1000, c: 20 }, id); wire(b, id, 'block', 'bars', 'blocks');
      placeBlock(b, 'variant', 0, 0, { color: colour, finish: 'satin' }, `${id}p`); wire(b, id, 'thing', `${id}p`, 'thing');
      placeBlock(b, 'bend', 0, 0, { load: 10, dir: '+x', slices: 16 }, `${id}b`); wire(b, `${id}p`, 'variant', `${id}b`, 'thing');
      placeBlock(b, 'view.show', 0, 0, {}, `${id}s`); wire(b, `${id}b`, 'says', `${id}s`, 'value');
      placeBlock(b, 'view.3d', 0, 0, {}, `${id}v`); wire(b, `${id}b`, 'seen', `${id}v`, 'part');
      placeBlock(b, 'variant', 0, 0, { path: `^${mat} bar$`, color: colour, finish: 'satin' }, `${id}c`); wire(b, last[0], last[1], `${id}c`, 'thing'); last = [`${id}c`, 'variant'];
    }
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, last[0], last[1], 'show', 'thing');
    b.nodes.lamb!.label = 'The laminate bar, 10 N sideways'; b.nodes.stlb!.label = 'The steel bar, 10 N sideways';
    b.nodes.lamv!.label = 'The laminate bar, seen bent'; b.nodes.stlv!.label = 'The steel bar, seen bent';
    return tidy(b);
  }],
  ['What it is made of, and what it carries: a copper and an aluminium rod side by side under a steel block, opened down to its elements, weighed and balanced, and as a path for heat, current and force', () => {
    // any thing opened as its materials (docs/REALITY.md, step 7): the same three pieces read as what they are made of,
    // their mass, centre and inertia, and as a path: the rods side by side (a + between them), then the block, along y.
    // Made by the operations: the two rods stood side by side, touching (no operation yet stands two things a set distance
    // apart: the old board's 18 mm between them is gone, so heat and force now also cross from rod to rod, and the contact
    // graph reads their side contact as their boxes' overlap, 12 × 200 mm, more than a line), the block stacked on them;
    // coloured and machined only where it is drawn
    const b = emptyBoard('What it is made of, and what it carries');
    placeBlock(b, 'room.make', 0, 0, { name: 'copper rod', shape: 'rod', mat: 'copper', a: 6, b: 200 }, 'cu'); b.nodes.cu!.label = 'Copper rod, 12 mm, 200 mm long';
    placeBlock(b, 'room.make', 0, 0, { name: 'aluminium rod', shape: 'rod', mat: 'al-6061', a: 6, b: 200 }, 'al'); b.nodes.al!.label = 'Aluminium rod (6061), 12 mm, 200 mm long';
    placeBlock(b, 'room.make', 0, 0, { name: 'steel block', shape: 'box', mat: 'steel-low', a: 60, b: 30, c: 30 }, 'st'); b.nodes.st!.label = 'Steel block on top';
    placeBlock(b, 'room.stack', 0, 0, { name: 'two rods', axis: 'x', fit: 'touch', level: 'on the ground', order: 'cu, al' }, 'rods'); b.nodes.rods!.label = 'The rods side by side, copper first'; wire(b, 'cu', 'block', 'rods', 'blocks'); wire(b, 'al', 'block', 'rods', 'blocks');
    placeBlock(b, 'room.stack', 0, 0, { name: 'two rods and a block', axis: 'y', fit: 'touch', order: 'rods, st' }, 'all'); b.nodes.all!.label = 'The block on the rods'; wire(b, 'rods', 'block', 'all', 'blocks'); wire(b, 'st', 'block', 'all', 'blocks');
    let last: [string, string] = ['all', 'thing'];
    for (const [k, n, colour] of [['vcu', 'copper rod', '#b87333'], ['val', 'aluminium rod', '#b0b8c0'], ['vst', 'steel block', '#6d7278']] as const) { placeBlock(b, 'variant', 0, 0, { path: `^${n}$`, color: colour, finish: 'machined' }, k); wire(b, last[0], last[1], k, 'thing'); last = [k, 'variant']; }
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, last[0], last[1], 'show', 'thing');
    placeBlock(b, 'made.of', 0, 0, {}, 'made'); wire(b, 'all', 'thing', 'made', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'mats'); b.nodes.mats!.label = 'By material'; wire(b, 'made', 'materials', 'mats', 'rows');
    placeBlock(b, 'view.table', 0, 0, {}, 'els'); b.nodes.els!.label = 'By element'; wire(b, 'made', 'elements', 'els', 'rows');
    placeBlock(b, 'mass.properties', 0, 0, {}, 'mp'); wire(b, 'all', 'thing', 'mp', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'mps'); b.nodes.mps!.label = 'Its mass, centre and inertia'; wire(b, 'mp', 'says', 'mps', 'value');
    placeBlock(b, 'graph', 0, 0, {}, 'touch'); wire(b, 'all', 'thing', 'touch', 'thing');
    placeBlock(b, 'flow', 0, 0, { what: 'heat', from: 'steel block', to: 'the lowest pieces', drive: 50 }, 'heat'); b.nodes.heat!.label = 'Heat from the block down the rods, 50 K across'; wire(b, 'all', 'thing', 'heat', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'temps'); b.nodes.temps!.label = 'Each piece\'s temperature'; wire(b, 'heat', 'pieces', 'temps', 'rows');
    placeBlock(b, 'bend', 0, 0, { load: 100, dir: '+x', at: 'steel block', held: 'the lowest pieces' }, 'bent'); b.nodes.bent!.label = 'Pushed sideways at the block, 100 N (the copper rod yields at about 176)'; wire(b, 'all', 'thing', 'bent', 'thing');
    placeBlock(b, 'bend', 0, 0, { load: 0, warmed: 50, held: 'the lowest pieces', at: 'steel block' }, 'warm'); b.nodes.warm!.label = 'Warmed 50 K: copper and aluminium grow apart under the block'; wire(b, 'all', 'thing', 'warm', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'warmsays'); b.nodes.warmsays!.label = 'What warming does'; wire(b, 'warm', 'says', 'warmsays', 'value');
    placeBlock(b, 'view.3d', 0, 0, {}, 'bentshow'); b.nodes.bentshow!.label = 'Seen bent: movements exaggerated, red moves most'; wire(b, 'bent', 'seen', 'bentshow', 'part');
    placeBlock(b, 'thermal', 0, 0, { hot: '', heated: 'steel block', power: 5 }, 'therm'); b.nodes.therm!.label = '5 W into the block, cooled by the air: how hot each piece gets'; wire(b, 'all', 'thing', 'therm', 'thing');
    placeBlock(b, 'view.table', 0, 0, {}, 'thermt'); b.nodes.thermt!.label = 'Each piece, steady'; wire(b, 'therm', 'pieces', 'thermt', 'rows');
    placeBlock(b, 'view.3d', 0, 0, {}, 'thermshow'); b.nodes.thermshow!.label = 'Seen: the block 5 W warm, the rods carrying it down'; wire(b, 'therm', 'seen', 'thermshow', 'part');
    placeBlock(b, 'view.3d', 0, 0, {}, 'hot'); b.nodes.hot!.label = 'Seen: hot red at the block, cold blue at the rods\' feet'; wire(b, 'heat', 'seen', 'hot', 'part');
    placeBlock(b, 'view.table', 0, 0, {}, 'contacts'); b.nodes.contacts!.label = 'What touches what, read from the geometry'; wire(b, 'touch', 'edges', 'contacts', 'rows');
    return b;
  }],
  ['Physics: a steel ball let go into a tower of wooden blocks', () => {
    // 24 oak blocks 100 mm a side, two by two and six high, every one stacked by the operations; a 120 mm steel ball beside
    // the tower on the ground (laid apart, 1 mm off it: the fit 'apart'), shoved at it for 0.1 s with 300 N. Let it go runs Jolt once on
    // the room's block (each piece a body, by its name; its mass from oak's density, friction and bounce from the
    // materials table); press ▶ under the 3D view to watch it hit
    const b = emptyBoard('A ball let go into a tower');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('block', 'room.make', { name: 'block', shape: 'box', mat: 'oak', a: 100, b: 100, c: 100 }, 'An oak block, 100 mm');
    put('pair', 'room.stack', { name: 'two', axis: 'z', fit: 'touch' }, 'Two side by side'); for (let k = 0; k < 2; k++) wire(b, 'block', 'block', 'pair', 'blocks');
    put('layer', 'room.stack', { name: 'layer', axis: 'x', fit: 'touch' }, 'A layer, two by two'); for (let k = 0; k < 2; k++) wire(b, 'pair', 'block', 'layer', 'blocks');
    put('tower', 'room.stack', { name: 'tower', axis: 'y', fit: 'touch' }, 'Tower, six layers high'); for (let k = 0; k < 6; k++) wire(b, 'layer', 'block', 'tower', 'blocks');
    put('ball', 'room.make', { name: 'ball', shape: 'sphere', mat: 'steel-low', a: 60 }, 'A steel ball, 120 mm');
    put('scene', 'room.stack', { name: 'scene', axis: 'x', fit: 'apart', level: 'on the ground', order: 'ball, tower' }, 'The ball beside the tower, both on the ground'); wire(b, 'ball', 'block', 'scene', 'blocks'); wire(b, 'tower', 'block', 'scene', 'blocks');
    put('shove', 'push', { name: 'ball', fx: 300, seconds: 0.1 }, 'Shove the ball');
    put('clock', 'time', {});
    put('go', 'letgo', { seconds: 8 }); wire(b, 'scene', 'block', 'go', 'block'); wire(b, 'shove', 'push', 'go', 'push'); wire(b, 'clock', 't', 'go', 't');
    put('show', 'space.show', {}); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Physics: a cart on two motor-driven wheels', () => {
    // an aluminium deck 1 × 0.5 m (a 10 mm plate, typical) on four rubber wheels 200 mm across, each slid over the end of its axle (two 20 mm steel
    // axles and a frame rod between them, laid end to end, the deck stacked on them): every piece placed by the operations.
    // Each wheel turns on its axle by a hinge on the wheel's own line; the axles and the frame are held to the deck (hinges
    // that may not turn). The rear two wheels are each turned by a maxon RE 40 (24 V) through its 12:1 gearhead, from their
    // datasheets: it pulls away and settles at the speed the motors' constants give. The motors are not current-limited:
    // they draw their stall current (80 A) to start, over the motor's 6 A continuous rating and the gearhead's 7.5 N·m (a
    // driver would limit it: not yet modelled)
    const b = emptyBoard('A cart on motor-driven wheels');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('deck', 'room.make', { name: 'chassis', shape: 'box', mat: 'al-6061', a: 1000, b: 10, c: 500 }, 'Deck, 1000 × 500 mm, a 10 mm aluminium plate (typical)');
    put('wheel', 'room.make', { name: 'wheel', shape: 'tube', mat: 'rubber', a: 10.5, b: 100, c: 50 }, 'Wheel, 200 mm across, its bore on the axle');
    for (const [ax, name] of [['r', 'rear axle'], ['f', 'front axle']] as const) {
      put(`${ax}a`, 'room.make', { name, shape: 'rod', mat: 'steel-low', a: 10, b: 700 }, `The ${name}, 20 mm, 700 mm long`);
      put(`${ax}1`, 'room.over', { line: `${name}/axis`, where: 'lo', fit: 'slide' }, 'A wheel over one end'); wire(b, `${ax}a`, 'block', `${ax}1`, 'host'); wire(b, 'wheel', 'block', `${ax}1`, 'sleeve');
      put(`${ax}2`, 'room.over', { line: `${name}/axis`, where: 'hi', fit: 'slide' }, 'And over the other'); wire(b, `${ax}1`, 'block', `${ax}2`, 'host'); wire(b, 'wheel', 'block', `${ax}2`, 'sleeve');
      put(`${ax}t`, 'room.turn', { axis: 'x', degrees: 90 }, 'Laid across'); wire(b, `${ax}2`, 'block', `${ax}t`, 'block');
    }
    // (780 mm: the axles 802 mm apart, centre to centre, the rod end to end with each; decision 0028: before, a stack left
    // the front axle 91 mm off a 690 mm rod's end, and the board was measured at that wheelbase)
    put('frame', 'room.make', { name: 'frame', shape: 'rod', mat: 'steel-low', a: 10, b: 780 }, 'Frame rod between the axles, 780 mm');
    put('frameT', 'room.turn', { axis: 'z', degrees: 90 }, 'Laid along'); wire(b, 'frame', 'block', 'frameT', 'block');
    put('gear', 'room.stack', { name: 'running gear', axis: 'x', fit: 'clear', order: 'rt, frameT, ft' }, 'Rear axle, frame, front axle, end to end');
    for (const x of ['rt', 'frameT', 'ft']) wire(b, x, 'block', 'gear', 'blocks');
    put('cart', 'room.stack', { name: 'cart', axis: 'y', fit: 'touch', order: 'gear, deck' }, 'The deck on them'); wire(b, 'gear', 'block', 'cart', 'blocks'); wire(b, 'deck', 'block', 'cart', 'blocks');
    put('clock', 'time', {});
    put('go', 'letgo', { seconds: 8 }); wire(b, 'clock', 't', 'go', 't'); wire(b, 'cart', 'block', 'go', 'block');
    // (each wheel on its own line: the first two on the rear axle, driven; each axle and the frame held to the deck)
    for (let k = 0; k < 4; k++) {
      put(`h${k}`, 'hinge', { line: 'wheel/axis', which: k, b: k < 2 ? 'rear axle' : 'front axle', ...(k < 2 ? { motor: 'motor.dc.coreless.d40-150w-24v', gear: 'gearhead.planetary.d42-12to1', reverse: 1 } : {}) }, k < 2 ? `Wheel ${k + 1}: motor and gearhead` : `Wheel ${k + 1}: free`);
      wire(b, 'cart', 'block', `h${k}`, 'block'); wire(b, `h${k}`, 'joint', 'go', 'joints');
    }
    for (const [id, name] of [['hr', 'rear axle'], ['hf', 'front axle'], ['hm', 'frame']] as const) { put(id, 'hinge', { line: `${name}/axis`, b: 'chassis', min: 0, max: 0 }, `The ${name} held to the deck`); wire(b, 'cart', 'block', id, 'block'); wire(b, id, 'joint', 'go', 'joints'); }
    put('show', 'space.show', {}); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],
  ['Physics: a pendulum on a hinge', () => {
    // an oak plank 1 m long with a pivot hole 25 mm from its top, raised 60° and stood beside a backboard on its foot (the
    // board taller than the plank's swing, so its low end clears the floor): all of it by the operations. It hangs on a
    // hinge on its own pivot hole's line; the board and its foot are held fixed. Let go from 60°, it swings, and the
    // hinge's angle is kept over time: its period beside 2π √(I / m g d), for a 60° swing (× 1.0732, K(sin 30°))
    const b = emptyBoard('A pendulum on a hinge');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('plank', 'room.make', { name: 'plank', shape: 'box', mat: 'oak', a: 50, b: 1000, c: 50, points: '0,475', face: '+z', hole: 6 }, 'Plank, 1 m, its pivot hole 25 mm from its top');
    put('raised', 'room.turn', { axis: 'z', degrees: 60 }, 'Raised 60°'); wire(b, 'plank', 'block', 'raised', 'block');
    put('board', 'room.make', { name: 'backboard', shape: 'box', mat: 'wood', a: 1000, b: 2000, c: 20 }, 'Backboard, 2 m tall');
    put('beside', 'room.stack', { name: 'pendulum', axis: 'z', fit: 'clear', order: 'board, raised' }, 'The plank beside the board, at its middle'); wire(b, 'board', 'block', 'beside', 'blocks'); wire(b, 'raised', 'block', 'beside', 'blocks');
    put('foot', 'room.make', { name: 'foot', shape: 'box', mat: 'wood', a: 1000, b: 20, c: 400 }, 'Its foot');
    put('stood', 'room.stack', { name: 'pendulum on its stand', axis: 'y', fit: 'touch', order: 'foot, beside' }, 'Stood on its foot'); wire(b, 'foot', 'block', 'stood', 'blocks'); wire(b, 'beside', 'block', 'stood', 'blocks');
    put('hinge', 'hinge', { line: 'plank/holes', b: 'backboard' }, 'Hinge on its pivot hole, held to the board'); wire(b, 'stood', 'block', 'hinge', 'block');
    put('clock', 'time', {});
    put('go', 'letgo', { seconds: 20, fixed: 'backboard, foot' }); wire(b, 'stood', 'block', 'go', 'block'); wire(b, 'hinge', 'joint', 'go', 'joints'); wire(b, 'clock', 't', 'go', 't');
    put('show', 'space.show', {}); wire(b, 'go', 'moved', 'show', 'thing');
    return b;
  }],

  ['Movement: a crank and a gear loose on a rod frozen in the air, meshing a second gear on a second rod: press Move, then drag the handle round', () => {
    // (the user, 2026-11-06: "freeze things in the air like a rod then add a loose gear to it and a crank and crank it")
    // all of it by the operations: an m2 40-tooth spur gear (ISO 53's rack), a crank arm stacked on its face with a wooden
    // handle at its end, a Ø10 steel rod through both with a clear fit (so they turn on it); an m2 30-tooth gear on a second
    // rod, meshed beside the first (their axes 70 mm apart and a slide fit's backlash). In Move the rods are frozen where
    // they stand, in the air, and what turns on them is loose: drag the handle and both gears turn, the second the other
    // way, 40:30 (sizes typical: a 20 mm face, a 100 mm arm)
    const b = emptyBoard('A crank turning two gears');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('gearA', 'piece.gear', { module: '2', teeth: 40, width: 20, bore: 8 }, 'An m2 spur gear, 40 teeth');
    put('arm', 'room.make', { name: 'crank arm', shape: 'box', mat: 'steel-low', a: 12, b: 100, c: 8 }, 'A crank arm, 100 mm');
    put('handle', 'room.make', { name: 'crank handle', shape: 'rod', mat: 'oak', a: 6, b: 40 }, 'Its handle (oak), Ø12 × 40');
    put('handleZ', 'room.turn', { axis: 'x', degrees: 90 }, 'Laid along the gear\'s axis'); wire(b, 'handle', 'block', 'handleZ', 'block');
    put('crank', 'room.onto', { face: '+z', fit: 'touch', end: 'hi' }, 'The handle on the arm, at its end'); wire(b, 'arm', 'block', 'crank', 'host'); wire(b, 'handleZ', 'block', 'crank', 'child');
    put('geared', 'room.stack', { name: 'gear and crank', axis: 'z', fit: 'touch', order: 'gearA, crank' }, 'The crank on the gear\'s face'); wire(b, 'gearA', 'block', 'geared', 'blocks'); wire(b, 'crank', 'block', 'geared', 'blocks');
    put('rodA', 'room.make', { name: 'rod A', shape: 'rod', mat: 'steel-low', a: 5, b: 120 }, 'A steel rod, Ø10 × 120');
    put('onA', 'room.through', { line: 'm2 z40 spur gear/axis', from: 'below', fit: 'clear' }, 'The rod through the gear and the crank, a clear fit: they turn on it'); wire(b, 'geared', 'block', 'onA', 'host'); wire(b, 'rodA', 'block', 'onA', 'passer');
    put('gearB', 'piece.gear', { module: '2', teeth: 30, width: 20, bore: 8 }, 'A second gear, 30 teeth');
    put('rodB', 'room.make', { name: 'rod B', shape: 'rod', mat: 'steel-low', a: 5, b: 120 }, 'A second rod');
    put('onB', 'room.through', { line: 'm2 z30 spur gear/axis', from: 'below', fit: 'clear' }, 'The second rod through it'); wire(b, 'gearB', 'block', 'onB', 'host'); wire(b, 'rodB', 'block', 'onB', 'passer');
    put('meshed', 'room.mesh', { line: 'm2 z40 spur gear/axis', gear: 'm2 z30 spur gear/axis', toward: '+x', fit: 'slide' }, 'Meshed beside the first'); wire(b, 'onA', 'block', 'meshed', 'host'); wire(b, 'onB', 'block', 'meshed', 'gear');
    put('show', 'space.show', {}, 'Press Move: the rods frozen in the air, the gears loose; drag the handle round'); wire(b, 'meshed', 'thing', 'show', 'thing');
    return b;
  }],
  ['Movement: a rack and pinion, an m1 30-tooth gear loose on a rod frozen in the air, a rack laid under it: press Move, then drag the gear round', () => {
    // (decision 0028, motion 2) all of it by the operations: an m1 spur gear of 30 teeth (ISO 53's rack, a 10 mm face), a
    // Ø10 steel rod through it with a clear fit (it turns on it), and an m1 rack 200 mm long (piece.rack: ISO 53's basic
    // rack) laid under it, its pitch line on the gear's pitch circle and a slide fit's backlash (Rack against a gear). In
    // Move the rod is frozen where it stands, the gear loose: turn it and the rack slides along under it, 15 mm a radian
    // (its pitch radius m z / 2) (sizes typical)
    const b = emptyBoard('A rack and pinion');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('pinion', 'piece.gear', { module: '1', teeth: 30, width: 10, bore: 10 }, 'An m1 spur gear, 30 teeth');
    put('rod', 'room.make', { name: 'pinion rod', shape: 'rod', mat: 'steel-low', a: 5, b: 80 }, 'A steel rod, Ø10 × 80');
    put('on', 'room.through', { line: 'm1 z30 spur gear/axis', from: 'below', fit: 'clear' }, 'The rod through the gear, a clear fit: it turns on it'); wire(b, 'pinion', 'block', 'on', 'host'); wire(b, 'rod', 'block', 'on', 'passer');
    put('rack', 'piece.rack', { size: 'm1', length: 200 }, 'An m1 rack, 200 mm');
    put('meshed', 'room.rack', { line: 'm1 z30 spur gear/axis', toward: '-y', fit: 'slide' }, 'The rack laid under the gear, meshing'); wire(b, 'on', 'block', 'meshed', 'host'); wire(b, 'rack', 'block', 'meshed', 'rack');
    put('show', 'space.show', {}, 'Press Move: the rod frozen, the gear loose; turn it and the rack slides'); wire(b, 'meshed', 'thing', 'show', 'thing');
    return b;
  }],
  ['Movement: a belt round two pulleys, a 20-tooth and a 40-tooth HTD 5M, each loose on a shaft frozen in the air: press Move, then drag a pulley round', () => {
    // (decision 0028, motion 2) all of it by the operations: an HTD 5M 20-tooth pulley with a Ø6 steel shaft through it and
    // a 40-tooth with a Ø16 shaft through it (each in its pilot bore, a clear fit) (they turn on them), the second put 120 mm from the first
    // (centre to centre, typical) and a belt 9 mm wide and 3.8 mm thick (Gates HTD 5M's, typical) laid round both (Belt
    // round two pulleys). In Move the shafts are frozen in the air, the pulleys loose: turn one and the other turns the
    // same way, at 20:40 of its speed
    const b = emptyBoard('A belt round two pulleys');
    const put = (id: string, block: string, set: Record<string, unknown>, label?: string) => { placeBlock(b, block, 0, 0, set, id); if (label) b.nodes[id]!.label = label; };
    put('small', 'piece.htdpulley', { size: '5M 20T', width: 9 }, 'An HTD 5M pulley, 20 teeth');
    put('shaftA', 'room.make', { name: 'shaft A', shape: 'rod', mat: 'steel-low', a: 3, b: 60 }, 'A shaft, Ø6 × 60, in its pilot bore');
    put('onA', 'room.through', { line: '5M 20T pulley teeth/axis', from: 'below', fit: 'clear' }, 'The shaft through the small pulley, a clear fit: it turns on it'); wire(b, 'small', 'block', 'onA', 'host'); wire(b, 'shaftA', 'block', 'onA', 'passer');
    put('big', 'piece.htdpulley', { size: '5M 40T', width: 9 }, 'An HTD 5M pulley, 40 teeth');
    put('shaftB', 'room.make', { name: 'shaft B', shape: 'rod', mat: 'steel-low', a: 8, b: 60 }, 'A shaft, Ø16 × 60, in its pilot bore');
    put('onB', 'room.through', { line: '5M 40T pulley teeth/axis', from: 'below', fit: 'clear' }, 'The shaft through the big pulley'); wire(b, 'big', 'block', 'onB', 'host'); wire(b, 'shaftB', 'block', 'onB', 'passer');
    put('belt', 'room.belt', { a: '5M 20T pulley teeth/axis', b: '5M 40T pulley teeth/axis', name: '5M belt', width: 9, thick: 3.8, C: 120, toward: '+x' }, 'The big one 120 mm off, a 5M belt laid round both'); wire(b, 'onA', 'block', 'belt', 'host'); wire(b, 'onB', 'block', 'belt', 'other');
    put('show', 'space.show', {}, 'Press Move: the shafts frozen, the pulleys loose; turn one and both turn, 20:40'); wire(b, 'belt', 'thing', 'show', 'thing');
    return b;
  }],
  ['Parts in 3D: a bolt sized from its load, drawn whole', () => {
    // the load picks the bolt: the shank area its shear needs, the next ISO 262 size up, and that bolt made by the
    // operations from its standard's row (ISO 4014's hex bolt: its head and shank), its size along a wire into the piece's family (piece.sized)
    const b = emptyBoard('A bolt from its load');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' }, 'F'); b.nodes.F!.label = 'Shear load';
    const Sy = placeBlock(b, 'in.number', 0, 0, { value: '640 MPa', unit: 'Pa' }, 'Sy'); b.nodes.Sy!.label = 'Yield, class 8.8 (ISO 898-1)';
    const n = placeBlock(b, 'in.number', 0, 0, { value: 2 }, 'n'); b.nodes.n!.label = 'Factor of safety wanted';
    const d = placeBlock(b, 'math.expr', 0, 0, { expr: 'sqrt(4 * F * n / (pi * 0.577 * Sy))', unit: 'm' }, 'd'); b.nodes.d!.label = 'Least diameter for that';
    wire(b, F, 'value', d, 'F'); wire(b, Sy, 'value', d, 'Sy'); wire(b, n, 'value', d, 'n');
    const pick = placeBlock(b, 'logic.next-size', 0, 0, {}, 'pick'); b.nodes.pick!.label = 'Next metric size (ISO 262)'; wire(b, d, 'result', pick, 'need');
    const w = placeBlock(b, 'text.format', 0, 0, { template: 'M{d}' }, 'words'); b.nodes.words!.label = 'Its size'; wire(b, pick, 'inUnit', w, 'd');
    const part = placeBlock(b, 'piece.sized', 0, 0, { family: 'piece.bolt', set: '{"length": 40, "head": "hex"}' }, 'part'); b.nodes.part!.label = 'The bolt (ISO 4014), 40 mm long, at that size'; wire(b, w, 'text', part, 'size');
    const v = placeBlock(b, 'view.3d', 0, 0, {}, 'v3'); b.nodes.v3!.label = 'The bolt, in 3D'; wire(b, part, 'thing', v, 'part');
    const ms = placeBlock(b, 'measure', 0, 0, {}, 'ms'); b.nodes.ms!.label = 'Weighed'; wire(b, part, 'thing', ms, 'thing');
    const m = placeBlock(b, 'view.show', 0, 0, { unit: 'g' }, 'm'); b.nodes.m!.label = 'Its mass'; wire(b, ms, 'mass', m, 'value');
    const br = placeBlock(b, 'piece.bearing', 0, 0, { size: '6205' }, 'br'); b.nodes.br!.label = 'A bearing beside it (6205)';
    const v2 = placeBlock(b, 'view.3d', 0, 0, { explode: 1 }, 'v4'); b.nodes.v4!.label = 'The bearing, taken apart'; wire(b, br, 'thing', v2, 'part');
    // (what the space draws: the bolt and the bearing side by side on the ground, laid by the room's stack)
    const both = placeBlock(b, 'room.stack', 0, 0, { name: 'a bolt and a bearing', axis: 'x', fit: 'clear', level: 'on the ground', order: 'part, br' }, 'both'); b.nodes.both!.label = 'The bolt and the bearing side by side';
    wire(b, part, 'block', both, 'blocks'); wire(b, br, 'block', both, 'blocks');
    const sh = placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, both, 'thing', sh, 'thing');
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
  ['Common pieces: bolts, screws, nuts, washers, a standoff, a plate with its holes, a pipe, its coupling and a tube', () => {
    // (the small things builds are made of, each by its standard (common.ts): every one made by the operations, none
    // placed by a number; laid in a row by Stack along x, each apart from the next by a clear fit)
    const b = emptyBoard('Common pieces: fasteners, plates and pipes'), row: string[] = [];
    const add = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; row.push(id); };
    add('hb', 'piece.bolt', { size: 'M8', length: 40, head: 'hex' }, 'Hex bolt M8 × 40 (ISO 4017)');
    add('ss', 'piece.bolt', { size: 'M5', length: 20, head: 'socket' }, 'Socket screw M5 × 20 (ISO 4762)');
    add('nt', 'piece.nut', { size: 'M8' }, 'Nut M8 (ISO 4032)');
    add('ws', 'piece.washer', { size: 'M8' }, 'Washer M8 (ISO 7089)');
    add('so', 'piece.standoff', { length: 10 }, 'Standoff M3 × 10');
    add('pl', 'piece.plate', { name: 'plate', mat: 'al-6061', w: 80, t: 5, d: 50, holes: '-25,0; 25,0', hole: 9 }, 'Plate, two M8 clearance holes (9 mm, ISO 273)');
    add('pp', 'piece.pipe', { size: 'copper 15×0.7', length: 100 }, 'Copper pipe 15 × 0.7 (EN 1057)');
    add('cp', 'piece.coupling', { size: 'copper 15×0.7' }, 'Its coupling');
    add('at', 'piece.pipe', { size: 'aluminium 20×2', length: 100 }, 'Aluminium tube 20 × 2');
    placeBlock(b, 'room.stack', 0, 0, { name: 'fasteners, plates and pipes', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Common pieces: copper wire bare and insulated, a winding on its bobbin, LEDs, a lamp, a pin header, a push button and a terminal block', () => {
    const b = emptyBoard('Common pieces: wires, windings, lights and inputs'), row: string[] = [];
    const add = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; row.push(id); };
    add('wr', 'piece.wire', { size: '1.5 mm²', length: 80, insulation: 'red', strip: 10 }, 'Wire 1.5 mm², red, stripped 10 mm');
    add('wb', 'piece.wire', { size: '0.5 mm²', length: 80, insulation: 'black', strip: 8 }, 'Wire 0.5 mm², black');
    add('cu', 'piece.wire', { size: '2.5 mm²', length: 80, insulation: 'none' }, 'Bare copper 2.5 mm²');
    add('wd', 'piece.winding', { core: 12, length: 20, wire: 0.5 }, 'Winding on a bobbin (0.5 mm enamelled copper)');
    add('l5', 'piece.led', { size: '5', colour: 'red', leads: 25 }, 'LED 5 mm, red');
    add('l3', 'piece.led', { size: '3', colour: 'green', leads: 25 }, 'LED 3 mm, green');
    add('bb', 'piece.bulb', {}, 'Lamp, E10');
    add('hd', 'piece.header', { pins: 6 }, 'Pin header 1 × 6');
    add('bt', 'piece.button', {}, 'Push button 6 × 6');
    add('tb', 'piece.terminal', { poles: 3 }, 'Terminal block, 3 poles');
    placeBlock(b, 'room.stack', 0, 0, { name: 'wires, windings, lights and inputs', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Matings: two plates bolted twice, a wire\'s stripped end in its terminal, a coupling on a pipe, an LED through a board', () => {
    // (each mating an operation on what the pieces offer: the bolt down a plate's hole with its head on top and its
    // washer and nut slid over its end; the wire's stripped end down the terminal's hole; the coupling over the pipe's
    // end; the LED's leads through the board's footprint, which cuts their holes. Nothing is placed by a number)
    const b = emptyBoard('Matings: bolted, wired, coupled, soldered');
    placeBlock(b, 'piece.plate', 0, 0, { name: 'bottom plate', mat: 'steel-low', w: 80, t: 5, d: 50, holes: '-25,0; 25,0', hole: 9 }, 'p1'); b.nodes.p1!.label = 'Bottom plate (steel)';
    placeBlock(b, 'piece.plate', 0, 0, { name: 'top plate', mat: 'al-6061', w: 80, t: 5, d: 50, holes: '-25,0; 25,0', hole: 9 }, 'p2'); b.nodes.p2!.label = 'Top plate (aluminium)';
    placeBlock(b, 'room.stack', 0, 0, { name: 'two plates', axis: 'y', fit: 'touch' }, 'plates'); wire(b, 'p1', 'block', 'plates', 'blocks'); wire(b, 'p2', 'block', 'plates', 'blocks');
    placeBlock(b, 'mate.bolted', 0, 0, { line: 'top plate/holes', which: 0, size: 'M8', head: 'hex' }, 'j1'); b.nodes.j1!.label = 'Bolted through the first hole'; wire(b, 'plates', 'block', 'j1', 'held');
    placeBlock(b, 'mate.bolted', 0, 0, { line: 'top plate/holes', which: 1, size: 'M8', head: 'socket' }, 'j2'); b.nodes.j2!.label = 'And the second, a socket screw'; wire(b, 'j1', 'block', 'j2', 'held');
    placeBlock(b, 'piece.terminal', 0, 0, { poles: 2 }, 'tb'); b.nodes.tb!.label = 'Terminal block, 2 poles';
    placeBlock(b, 'piece.wire', 0, 0, { size: '1.5 mm²', length: 60, insulation: 'red', strip: 10 }, 'wr'); b.nodes.wr!.label = 'Wire 1.5 mm², red';
    placeBlock(b, 'room.through', 0, 0, { line: '2-pole terminal block/holes', which: 0, from: 'below', fit: 'slide' }, 'wired'); b.nodes.wired!.label = 'Its stripped end in the terminal'; wire(b, 'tb', 'block', 'wired', 'host'); wire(b, 'wr', 'block', 'wired', 'passer');
    placeBlock(b, 'piece.pipe', 0, 0, { size: 'copper 15×0.7', length: 80 }, 'pp'); b.nodes.pp!.label = 'Copper pipe 15 mm';
    placeBlock(b, 'piece.coupling', 0, 0, { size: 'copper 15×0.7' }, 'cp'); b.nodes.cp!.label = 'Its coupling';
    placeBlock(b, 'room.over', 0, 0, { line: 'copper 15×0.7 pipe/axis', where: 'hi', fit: 'slide' }, 'coupled'); b.nodes.coupled!.label = 'The coupling over the pipe\'s end'; wire(b, 'pp', 'block', 'coupled', 'host'); wire(b, 'cp', 'block', 'coupled', 'sleeve');
    placeBlock(b, 'piece.plate', 0, 0, { name: 'board', mat: 'fr4', w: 30, t: 1.6, d: 20, holes: '0,0', hole: 0 }, 'pcb'); b.nodes.pcb!.label = 'A board (FR-4, 1.6 mm), an LED\'s footprint';
    placeBlock(b, 'piece.led', 0, 0, { size: '5', colour: 'red', leads: 4 }, 'led'); b.nodes.led!.label = 'LED 5 mm, its leads cut to 4 mm';
    placeBlock(b, 'room.through', 0, 0, { line: 'board/holes', which: 0, from: 'below', fit: 'slide' }, 'lit'); b.nodes.lit!.label = 'Its leads through the board'; wire(b, 'pcb', 'block', 'lit', 'host'); wire(b, 'led', 'block', 'lit', 'passer');
    placeBlock(b, 'room.stack', 0, 0, { name: 'four matings', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of ['j2', 'wired', 'coupled', 'lit']) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Common pieces: angles, a channel, an I-beam and a tee, a hollow box, a coil, a winding in three layers', () => {
    const b = emptyBoard('Common pieces: sections, a hollow box, coils'), row: string[] = [];
    const add = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; row.push(id); };
    add('a20', 'piece.section', { size: 'aluminium angle 20×20×2', length: 80 }, 'Aluminium angle 20 × 20 × 2');
    add('a40', 'piece.section', { size: 'aluminium angle 40×40×4', length: 80 }, 'Aluminium angle 40 × 40 × 4');
    add('ch', 'piece.section', { size: 'aluminium channel 25×25×2', length: 80 }, 'Aluminium channel 25 × 25 × 2');
    add('ipe', 'piece.section', { size: 'steel IPE 80 (EN 10365)', length: 80 }, 'Steel IPE 80');
    add('tee', 'piece.section', { size: 'aluminium tee 25×25×3', length: 80 }, 'Aluminium tee 25 × 25 × 3');
    add('box', 'piece.case', { name: 'project box', mat: 'abs', w: 100, h: 40, d: 60, wall: 2, floor: 2 }, 'Hollow box (ABS), its cavity a room');
    add('cl', 'piece.coil', { R: 7, wire: 0.5, turns: 20, layers: 1 }, 'A coil, 20 turns of 0.5 mm copper');
    add('w3', 'piece.winding', { core: 12, length: 20, wire: 0.5, layers: 3 }, 'A winding in three layers on its bobbin');
    placeBlock(b, 'room.stack', 0, 0, { name: 'sections, a hollow box, coils', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Built from pieces: a small DC motor, its rotor wound, its magnets round it, its can round all, its shaft through', () => {
    // (a motor of the common small size (a 20 mm can, typical), every piece made and put together by the operations:
    // the rotor's core with its coil slid over it in two layers, its commutator stacked under it, a ring of magnets slid
    // over the rotor with an air gap, the can made round all of it, the shaft passed along the can's axis (the can's
    // ends and the core bored for it as it passes), two terminal tabs against its foot. Nothing is placed by a number. All
    // of it is one library block, the Small DC motor (seeds.ts), placed with its settings: open it to see each piece)
    const b = emptyBoard('Built from pieces: a small DC motor');
    placeBlock(b, 'seed.motor-dc', 0, 0, { R: 10.5, L: 12, shaft: 30 }, 'motor'); b.nodes.motor!.label = 'The small DC motor: magnets 21 mm across, rotor 12 mm, shaft 30 mm (typical)';
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'motor', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'motor', 'says', 'said', 'value');
    return b;
  }],
  ['Built from pieces: a switch box, a board with its LED and push button, into a hollow box', () => {
    // (a board's two footprints take an LED and a push button through it; the board goes into a project box's cavity,
    // refused if it did not fit. Every piece common, every mating an operation)
    const b = emptyBoard('Built from pieces: a switch box');
    placeBlock(b, 'piece.case', 0, 0, { name: 'project box', mat: 'abs', w: 100, h: 40, d: 60, wall: 2, floor: 2 }, 'box'); b.nodes.box!.label = 'Project box (ABS)';
    placeBlock(b, 'piece.plate', 0, 0, { name: 'board', mat: 'fr4', w: 80, t: 1.6, d: 40, holes: '-20,0; 20,0', hole: 0 }, 'pcb'); b.nodes.pcb!.label = 'A board, two footprints';
    placeBlock(b, 'piece.led', 0, 0, { size: '5', colour: 'green', leads: 4 }, 'led'); b.nodes.led!.label = 'LED 5 mm, green';
    placeBlock(b, 'room.through', 0, 0, { line: 'board/holes', which: 0, from: 'below', fit: 'slide' }, 'lit'); b.nodes.lit!.label = 'The LED through the board'; wire(b, 'pcb', 'block', 'lit', 'host'); wire(b, 'led', 'block', 'lit', 'passer');
    placeBlock(b, 'piece.button', 0, 0, {}, 'btn'); b.nodes.btn!.label = 'Push button 6 × 6';
    placeBlock(b, 'room.through', 0, 0, { line: 'board/holes', which: 1, from: 'below', fit: 'slide' }, 'pressed'); b.nodes.pressed!.label = 'The button through the board'; wire(b, 'lit', 'block', 'pressed', 'host'); wire(b, 'btn', 'block', 'pressed', 'passer');
    placeBlock(b, 'room.into', 0, 0, { room: 'project box/cavity', fit: 'clear' }, 'boxed'); b.nodes.boxed!.label = 'The board into the box'; wire(b, 'box', 'block', 'boxed', 'host'); wire(b, 'pressed', 'block', 'boxed', 'child');
    // (shown beside the board before it went in: inside the box, below its walls, the board cannot be seen from the
    // view's angle; Cut opens the box)
    placeBlock(b, 'room.stack', 0, 0, { name: 'the board, and the board in its box', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); b.nodes.row!.label = 'The board beside its box'; wire(b, 'pressed', 'block', 'row', 'blocks'); wire(b, 'boxed', 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'boxed', 'says', 'said', 'value');
    return b;
  }],
  ['Pipes that turn: a copper run with bends and an elbow, a plate turned 30° about x, a pipe laid across with its coupling', () => {
    // (the run laid from its steps alone, each from where the last one ended: a straight, a bend of the pipe itself, a
    // straight into an elbow's socket, out of its other socket, a bend back; the plate and the pipe made upright and then
    // turned whole, so nothing in them moves against anything else; the coupling slid along the turned pipe's own line)
    const b = emptyBoard('Pipes that turn: bends, an elbow, turned parts');
    placeBlock(b, 'piece.run', 0, 0, { size: 'copper 15×0.7', path: '200; bend 90; 150; elbow 90 toward +z; 120; bend 45 toward -x; 100' }, 'run'); b.nodes.run!.label = 'A copper run: bends and an elbow';
    placeBlock(b, 'piece.plate', 0, 0, { name: 'plate', mat: 'al-6061', w: 120, t: 6, d: 80, holes: '-40,0; 40,0', hole: 9 }, 'pl'); b.nodes.pl!.label = 'An aluminium plate';
    placeBlock(b, 'room.turn', 0, 0, { axis: 'x', degrees: 30 }, 'tilt'); b.nodes.tilt!.label = 'Turned 30° about x'; wire(b, 'pl', 'block', 'tilt', 'block');
    placeBlock(b, 'piece.pipe', 0, 0, { size: 'copper 22×0.9', length: 200 }, 'pp'); b.nodes.pp!.label = 'Copper pipe 22 mm';
    placeBlock(b, 'room.turn', 0, 0, { axis: 'z', degrees: 90 }, 'across'); b.nodes.across!.label = 'Turned to lie across (90° about z)'; wire(b, 'pp', 'block', 'across', 'block');
    placeBlock(b, 'piece.coupling', 0, 0, { size: 'copper 22×0.9' }, 'cp'); b.nodes.cp!.label = 'Its coupling';
    placeBlock(b, 'room.over', 0, 0, { line: 'copper 22×0.9 pipe/axis', where: 'hi', fit: 'slide' }, 'coupled'); b.nodes.coupled!.label = 'The coupling along the turned pipe'; wire(b, 'across', 'block', 'coupled', 'host'); wire(b, 'cp', 'block', 'coupled', 'sleeve');
    placeBlock(b, 'piece.elbow', 0, 0, { size: 'copper 15×0.7', angle: '45' }, 'el'); b.nodes.el!.label = 'A 45° elbow on its own';
    placeBlock(b, 'room.stack', 0, 0, { name: 'pipes that turn', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of ['run', 'tilt', 'coupled', 'el']) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  // (the second set of common pieces (common.ts, decision 0021), each by its standard or datasheet, laid in a row by Stack
  // along x on the ground, a clear fit apart)
  ['Electronic pieces: a resistor, two capacitors, a transistor, cells, a toggle switch, a fuse, a JST connector and a potentiometer', () => {
    const b = emptyBoard('Electronic pieces'), row: string[] = [];
    const add = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; row.push(id); };
    add('rs', 'piece.resistor', { rating: '1/4 W', leads: 28 }, 'Resistor, 1/4 W');
    add('cc', 'piece.capacitor.ceramic', { pitch: '2.54', leads: 20 }, 'Ceramic capacitor, 2.54 mm');
    add('ec', 'piece.capacitor.electrolytic', { size: '8×11.5', leads: 20 }, 'Electrolytic capacitor, 8 × 11.5');
    add('tr', 'piece.transistor', { name: '2N3904' }, 'Transistor, TO-92');
    add('c1', 'piece.cell', { size: '18650' }, '18650 cell');
    add('c2', 'piece.cell', { size: 'AA (LR6)' }, 'AA cell (IEC 60086-2)');
    add('c3', 'piece.cell', { size: 'AAA (LR03)' }, 'AAA cell');
    add('sw', 'piece.toggle', {}, 'Toggle switch');
    add('fu', 'piece.fuse', { rating: '1 A' }, 'Glass fuse 5 × 20 (IEC 60127-2)');
    add('js', 'piece.jst', { pins: 3 }, 'JST XH, 3 pins');
    add('pt', 'piece.pot', {}, 'Potentiometer, 16 mm');
    placeBlock(b, 'room.stack', 0, 0, { name: 'electronics', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Mechanical pieces: bearings, a gear, a pulley, an L bracket, a dowel, a set screw, a spring, a hinge and an insert', () => {
    const b = emptyBoard('Mechanical pieces: bearings, gears, brackets'), row: string[] = [];
    const add = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; row.push(id); };
    add('b1', 'piece.bearing', { size: '608' }, 'Ball bearing 608 (ISO 15)');
    add('b2', 'piece.bearing', { size: '6004' }, 'Ball bearing 6004');
    add('gr', 'piece.gear', { module: '1', teeth: 20, width: 8, bore: 5 }, 'Spur gear, module 1, 20 teeth');
    add('pl', 'piece.pulley', { teeth: 20, bore: 5 }, 'GT2 pulley, 20 teeth');
    add('br', 'piece.bracket', { name: 'L bracket', a: 40, t: 4, L: 40, size: 'M5', holes: 2 }, 'L bracket 40 × 40 × 4');
    add('dw', 'piece.dowel', { d: '6', length: 20 }, 'Dowel pin 6 × 20 (ISO 8734)');
    add('ss', 'piece.setscrew', { size: 'M5', length: 8 }, 'Set screw M5 × 8 (ISO 4026)');
    add('sp', 'piece.spring', { d: 1, OD: 10, L0: 30, active: 8 }, 'Compression spring 1 × 10 × 30');
    add('hg', 'piece.hinge', { H: 50, knuckles: 3 }, 'Butt hinge 50 mm');
    add('in', 'piece.insert', { size: 'M3' }, 'Heat-set insert M3');
    placeBlock(b, 'room.stack', 0, 0, { name: 'bearings, gears, brackets', axis: 'x', fit: 'clear', level: 'on the ground' }, 'row'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['Small builds from pieces: two 18650 cells boxed under a lid, a 608 bearing on its shaft, an L bracket bolted down', () => {
    // (two cells side by side into a box's cavity (refused if they did not fit), its lid made for it onto its top; a
    // shaft along the bearing's inner ring; the bracket's foot bolted to a plate drilled under its holes. Nothing placed
    // by a number)
    const b = emptyBoard('Small builds from pieces: cells boxed, a bearing on its shaft, a bracket bolted down');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('c1', 'piece.cell', { size: '18650' }, '18650 cell'); put('c2', 'piece.cell', { size: '18650' }, 'And another');
    put('pair', 'room.stack', { name: 'two cells', axis: 'x', fit: 'clear' }, 'Side by side'); wire(b, 'c1', 'block', 'pair', 'blocks'); wire(b, 'c2', 'block', 'pair', 'blocks');
    // (the box, the cells into its cavity and its lid on: one library block, Into a box, its lid on (seeds.ts))
    put('lid', 'seed.boxed', { name: 'cell box', mat: 'abs', w: 45, h: 70, d: 25, wall: 2 }, 'Into a cell box (ABS), its lid on top'); wire(b, 'pair', 'block', 'lid', 'inside');
    put('brg', 'piece.bearing', { size: '608' }, 'Ball bearing 608');
    put('shaft', 'room.make', { name: 'shaft', shape: 'rod', mat: 'steel-alloy', a: 4, b: 30 }, 'Shaft, 8 mm');
    put('onshaft', 'room.through', { line: '608 inner ring/axis', which: 0, from: 'below', fit: 'tight' }, 'The shaft through its inner ring'); wire(b, 'brg', 'block', 'onshaft', 'host'); wire(b, 'shaft', 'block', 'onshaft', 'passer');
    put('br', 'piece.bracket', { name: 'L bracket', a: 40, t: 4, L: 40, size: 'M5', holes: 2 }, 'L bracket');
    put('down', 'mate.plate', { line: 'L bracket foot/holes', w: 80, t: 5, d: 60, mat: 'steel-low', size: 'M5', head: 'hex' }, 'Bolted down to a plate'); wire(b, 'br', 'block', 'down', 'held');
    put('row', 'room.stack', { name: 'three builds', axis: 'x', fit: 'clear', level: 'on the ground' }, 'Side by side'); for (const id of ['lid', 'onshaft', 'down']) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  // (things built from the common pieces now that parts turn and pipes bend (decision 0024): each made only by nodes,
  // nothing placed by a number. Sizes not from a product's datasheet are typical or estimates, and said so. A Stack takes
  // its blocks in the order of their nodes' ids, so what is stacked is given ids in the order it goes)
  ['A desk fan: the small DC motor in its housing, four pitched blades round its hub, on a post and a base, all common pieces', () => {
    // (the motor of the motor board in an ABS housing made round it, its shaft out of the housing's top; one blade made and
    // turned four ways: each about its own length by 25° (its pitch, an estimate: desk fans' run about 20° to 35°), two
    // laid against the hub along x and two, first turned a quarter about y, along z (a Ring of copies moves each copy
    // without turning it, so blades that must face out are laid by Stack); the shaft up into the hub; a round post against
    // the housing's side and a base on the post's end, each turned to lie along it; the whole turned a quarter about x so
    // the blades face forward and the post stands. Sizes typical of a small USB desk fan, estimates: the blades sweep
    // about 140 mm, the hub 40 mm across)
    const b = emptyBoard('A desk fan');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('motor', 'seed.motor-dc', { R: 10.5, L: 12 }, 'The small DC motor (its can, all inside it)');
    put('housing', 'room.around', { name: 'motor housing', mat: 'abs', wall: 2, ends: 5, fit: 'clear', open: 'no' }, 'Its housing (ABS), made round the motor'); wire(b, 'motor', 'can', 'housing', 'child');
    put('shaft', 'room.make', { name: 'shaft', shape: 'rod', mat: 'steel-alloy', a: 1, b: 44 }, 'Shaft, 2 mm, 44 mm long');
    put('shafted', 'room.through', { line: 'motor housing/axis', which: 0, from: 'below', fit: 'slide' }, 'The shaft along its axis, out of its top'); wire(b, 'housing', 'block', 'shafted', 'host'); wire(b, 'shaft', 'block', 'shafted', 'passer');
    put('x2', 'room.make', { name: 'fan hub', shape: 'rod', mat: 'abs', a: 20, b: 10 }, 'The hub (ABS), 40 mm across');
    put('blade', 'room.make', { name: 'fan blade', shape: 'box', mat: 'abs', a: 50, b: 1.5, c: 36 }, 'A blade (ABS), 50 × 36 × 1.5 mm');
    put('along', 'room.turn', { axis: 'y', degrees: 90 }, 'A quarter about y: lying along z'); wire(b, 'blade', 'block', 'along', 'block');
    for (const [id, from, axis, deg] of [['x1', 'blade', 'x', -25], ['x3', 'blade', 'x', 25], ['z1', 'along', 'z', -25], ['z3', 'along', 'z', 25]] as [string, string, string, number][]) {
      put(id, 'room.turn', { axis, degrees: deg }, `Pitched ${deg}° about ${axis}`); wire(b, from, 'block', id, 'block');
    }
    put('z2', 'room.stack', { name: 'fan rotor', axis: 'x', fit: 'touch' }, 'Two blades against the hub, along x'); for (const id of ['x1', 'x2', 'x3']) wire(b, id, 'block', 'z2', 'blocks');
    put('blades', 'room.stack', { name: 'fan rotor', axis: 'z', fit: 'touch' }, 'Two more against it, along z'); for (const id of ['z1', 'z2', 'z3']) wire(b, id, 'block', 'blades', 'blocks');
    put('head', 'room.through', { line: 'fan hub/axis', which: 0, from: 'above', fit: 'tight' }, 'The shaft up into the hub, a press fit'); wire(b, 'blades', 'block', 'head', 'host'); wire(b, 'shafted', 'block', 'head', 'passer');
    put('post', 'room.make', { name: 'fan post', shape: 'rod', mat: 'steel-low', a: 5, b: 75 }, 'Post, 10 mm steel');
    put('postT', 'room.turn', { axis: 'x', degrees: 90 }, 'Turned to lie along z'); wire(b, 'post', 'block', 'postT', 'block');
    put('posted', 'room.onto', { face: '+z', fit: 'touch' }, 'The post against the housing'); wire(b, 'head', 'block', 'posted', 'host'); wire(b, 'postT', 'block', 'posted', 'child');
    put('base', 'room.make', { name: 'fan base', shape: 'rod', mat: 'abs', a: 55, b: 10 }, 'Base (ABS), 110 mm across');
    put('baseT', 'room.turn', { axis: 'x', degrees: 90 }, 'Turned to face along z'); wire(b, 'base', 'block', 'baseT', 'block');
    put('stood', 'room.onto', { face: '+z', fit: 'touch' }, 'The base on the post\'s end'); wire(b, 'posted', 'block', 'stood', 'host'); wire(b, 'baseT', 'block', 'stood', 'child');
    put('fan', 'room.turn', { axis: 'x', degrees: 90 }, 'All of it turned to stand: the blades face forward'); wire(b, 'stood', 'block', 'fan', 'block');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'fan', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'What it weighs and spans'; wire(b, 'fan', 'thing', 'measure', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'fan', 'says', 'said', 'value');
    return b;
  }],
  ['A small robot base: a motor on each side driving its wheel, a battery pack, a caster at its front, all common pieces', () => {
    // (the motor of the motor board with its shaft, its tabs and a wheel (an ABS disc, a rubber tyre slid over it) pressed
    // over its shaft's end: made once, and turned a quarter about z each way, so the two shafts run across; the two back
    // to back; a 30 mm plate castor (piece.castor) in front of them, both on the ground; a 2 mm FR-4 board for a chassis
    // on the motors' cans and the castor's plate alike (the wheels 74 mm across so the cans' tops stand as high as the
    // castor's 49 mm (its box, typical): 49 less the can's 12 mm radius, twice); two 18650 cells into a box, its lid on,
    // laid flat on the board. Sizes typical of a small two-wheeled kit, estimates)
    const b = emptyBoard('A small robot base');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('mmotor', 'seed.motor-dc', { R: 10.5, L: 12, shaft: 36 }, 'The small DC motor, its shaft 36 mm, its tabs at its foot');
    put('mrim', 'room.make', { name: 'wheel', shape: 'tube', mat: 'abs', a: 1, b: 30, c: 10 }, 'Wheel (ABS), its bore the shaft\'s');
    put('mtyre', 'room.make', { name: 'tyre', shape: 'tube', mat: 'nr', a: 30, b: 37, c: 10 }, 'Tyre (rubber), 74 mm across');
    put('mwheel', 'room.over', { line: 'wheel/axis', where: 'mid', fit: 'touch' }, 'The tyre over the wheel'); wire(b, 'mrim', 'block', 'mwheel', 'host'); wire(b, 'mtyre', 'block', 'mwheel', 'sleeve');
    put('mdriven', 'room.over', { line: 'shaft/axis', where: 'hi', fit: 'tight' }, 'The wheel pressed over the shaft\'s end'); wire(b, 'mmotor', 'motor', 'mdriven', 'host'); wire(b, 'mwheel', 'block', 'mdriven', 'sleeve');
    put('lside', 'room.turn', { axis: 'z', degrees: 90 }, 'Turned 90° about z: on its side, its wheel to the left'); wire(b, 'mdriven', 'block', 'lside', 'block');
    put('rside', 'room.turn', { axis: 'z', degrees: -90 }, 'And −90°: its wheel to the right'); wire(b, 'mdriven', 'block', 'rside', 'block');
    put('drive', 'room.stack', { name: 'drive', axis: 'x', fit: 'clear' }, 'The two back to back'); wire(b, 'lside', 'block', 'drive', 'blocks'); wire(b, 'rside', 'block', 'drive', 'blocks');
    put('castor', 'piece.castor', { size: '30' }, 'A castor, 30 mm (its wheel, fork, swivel and plate)');
    put('under', 'room.stack', { name: 'running gear', axis: 'z', fit: 'clear', level: 'on the ground', order: 'castor, drive' }, 'The castor in front of the motors, both on the ground'); wire(b, 'castor', 'block', 'under', 'blocks'); wire(b, 'drive', 'block', 'under', 'blocks');
    put('plate', 'piece.plate', { name: 'chassis board', mat: 'fr4', w: 56, t: 2, d: 130, holes: '', hole: 0 }, 'A chassis board (FR-4, 2 mm)');
    put('legged', 'room.onto', { face: '+y', fit: 'touch' }, 'The board on the motors and the castor, between the wheels'); wire(b, 'under', 'block', 'legged', 'host'); wire(b, 'plate', 'block', 'legged', 'child');
    put('pack', 'seed.pack-two', { cell: '18650', w: 45, h: 70, d: 25, wall: 2 }, 'Two 18650 cells boxed, its lid on, laid flat');
    put('robot', 'room.onto', { face: '+y', fit: 'touch' }, 'The pack on the board'); wire(b, 'legged', 'block', 'robot', 'host'); wire(b, 'pack', 'flat', 'robot', 'child');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'robot', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'What it weighs and spans'; wire(b, 'robot', 'thing', 'measure', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'robot', 'says', 'said', 'value');
    return b;
  }],
  ['A pipe loop and its tank: copper runs with bends, elbows and couplings, laid by their steps, against a hollow box', () => {
    // (a tank (a hollow polyethylene box, its lid on); a feed run of 22 mm copper up from the floor, an elbow, a length, a
    // bend, to the tank's side, a coupling on its last length; a loop out of the tank's other side and back to it, an
    // elbow and a bend at its far end and a coupling on its upright, laid in its own frame and turned a quarter about z so
    // it lies out of the tank's side; all three in a row on the ground, each against the next. No coordinate anywhere: each
    // run from its steps alone. The pipes end against the tank's walls: a hole through a wall across y is not yet an
    // operation)
    const b = emptyBoard('A pipe loop and its tank');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('feed', 'piece.run', { size: 'copper 22×0.9', path: '150; elbow 90 toward +z; 100; bend 90 toward +x; 250', name: 'feed' }, 'The feed: up, an elbow, a bend, along to the tank');
    put('cp', 'piece.coupling', { size: 'copper 22×0.9' }, 'A coupling (one made, used twice)');
    put('row1', 'room.over', { line: 'copper 22×0.9 pipe 5/axis', where: 'mid', fit: 'slide' }, 'On the feed\'s last length'); wire(b, 'feed', 'block', 'row1', 'host'); wire(b, 'cp', 'block', 'row1', 'sleeve');
    put('tank', 'piece.case', { name: 'tank', mat: 'pe', w: 300, h: 300, d: 300, wall: 4, floor: 4 }, 'The tank (polyethylene), a hollow box');
    put('row2', 'mate.lid', { t: 4, mat: 'pe' }, 'Its lid on'); wire(b, 'tank', 'block', 'row2', 'box');
    put('loop', 'piece.run', { size: 'copper 22×0.9', path: '300; elbow 90 toward +x; 150; bend 90 toward +x; 237', name: 'loop' }, 'The loop: out, an elbow, down, a bend, back');
    put('looped', 'room.over', { line: 'copper 22×0.9 pipe 3/axis', where: 'mid', fit: 'slide' }, 'On the loop\'s upright'); wire(b, 'loop', 'block', 'looped', 'host'); wire(b, 'cp', 'block', 'looped', 'sleeve');
    put('row3', 'room.turn', { axis: 'z', degrees: -90 }, 'Turned to lie out of the tank\'s side'); wire(b, 'looped', 'block', 'row3', 'block');
    put('row', 'room.stack', { name: 'a pipe loop and its tank', axis: 'x', fit: 'touch', level: 'on the ground' }, 'Feed, tank, loop: each against the next'); for (const id of ['row1', 'row2', 'row3']) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'What it weighs and spans (empty)'; wire(b, 'row', 'thing', 'measure', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ['A quadcopter: the small motor with a two-blade prop, made once and ringed four times on a cross frame, a battery on top', () => {
    // (the motor of the motor board with a prop stacked on its can (one blade turned 12° each way, its pitch an estimate,
    // against a hub) and a shaft passed up through both; that unit ringed four times round the middle, each copy in its
    // own wedge; a cross frame: an aluminium bar along x and an arm against each side of it along z (one arm made, turned a
    // quarter about y each way), a flight board on its middle; the four units on the arms' ends; two AAA cells boxed, its
    // lid on, laid flat on the board. Sizes typical of a toy quadcopter, estimates; the motor is the 20 mm one of the
    // motor board, bigger and heavier than a toy's)
    const b = emptyBoard('A quadcopter');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('mcan', 'seed.motor-dc', { R: 10.5, L: 12 }, 'The small DC motor (its can, all inside it)');
    put('pblade', 'room.make', { name: 'prop blade', shape: 'box', mat: 'pc', a: 50, b: 1.2, c: 12 }, 'A prop blade (polycarbonate), 50 × 12 × 1.2 mm');
    put('p1', 'room.turn', { axis: 'x', degrees: -12 }, 'Pitched −12°'); wire(b, 'pblade', 'block', 'p1', 'block');
    put('p2', 'room.make', { name: 'prop hub', shape: 'rod', mat: 'pc', a: 4, b: 6 }, 'The prop\'s hub, 8 mm across');
    put('p3', 'room.turn', { axis: 'x', degrees: 12 }, 'Pitched 12°'); wire(b, 'pblade', 'block', 'p3', 'block');
    put('prop', 'room.stack', { name: 'prop', axis: 'x', fit: 'touch' }, 'A two-blade prop'); for (const id of ['p1', 'p2', 'p3']) wire(b, id, 'block', 'prop', 'blocks');
    put('unit0', 'room.stack', { name: 'motor with its prop', axis: 'y', fit: 'touch' }, 'The prop on the can'); wire(b, 'mcan', 'can', 'unit0', 'blocks'); wire(b, 'prop', 'block', 'unit0', 'blocks');
    put('mshaft', 'room.make', { name: 'shaft', shape: 'rod', mat: 'steel-alloy', a: 1, b: 27 }, 'Shaft, 2 mm');
    put('unit', 'room.through', { line: 'motor can/axis', which: 0, from: 'below', fit: 'slide' }, 'The shaft up through the motor and the hub'); wire(b, 'unit0', 'block', 'unit', 'host'); wire(b, 'mshaft', 'block', 'unit', 'passer');
    put('ring', 'room.ring', { name: 'four motors', n: 4, R: 80, fit: 'clear' }, 'Four of them round the middle'); wire(b, 'unit', 'block', 'ring', 'block');
    put('b2', 'room.make', { name: 'frame bar', shape: 'box', mat: 'al-6061', a: 186, b: 3, c: 8 }, 'The frame\'s bar (aluminium), 186 × 8 × 3 mm');
    put('arm', 'room.make', { name: 'frame arm', shape: 'box', mat: 'al-6061', a: 89, b: 3, c: 8 }, 'An arm (aluminium), 89 × 8 × 3 mm');
    put('b1', 'room.turn', { axis: 'y', degrees: 90 }, 'Turned to point along z'); wire(b, 'arm', 'block', 'b1', 'block');
    put('b3', 'room.turn', { axis: 'y', degrees: -90 }, 'And the other way'); wire(b, 'arm', 'block', 'b3', 'block');
    put('cross', 'room.stack', { name: 'frame', axis: 'z', fit: 'touch' }, 'An arm against each side of the bar'); for (const id of ['b1', 'b2', 'b3']) wire(b, id, 'block', 'cross', 'blocks');
    put('fc', 'piece.plate', { name: 'flight board', mat: 'fr4', w: 30, t: 1.6, d: 30, holes: '0,0', hole: 0 }, 'A flight board (FR-4), 30 × 30 mm');
    put('frame', 'room.onto', { face: '+y', fit: 'touch' }, 'On the frame\'s middle'); wire(b, 'cross', 'block', 'frame', 'host'); wire(b, 'fc', 'block', 'frame', 'child');
    put('quad0', 'room.stack', { name: 'quadcopter', axis: 'y', fit: 'touch' }, 'The four on the arms\' ends'); wire(b, 'frame', 'block', 'quad0', 'blocks'); wire(b, 'ring', 'block', 'quad0', 'blocks');
    put('pack', 'seed.pack-two', { cell: 'AAA (LR03)', w: 27, h: 47, d: 16, wall: 1.5 }, 'Two AAA cells boxed, its lid on, laid flat');
    put('quad', 'room.onto', { face: '+y', fit: 'touch' }, 'The pack on the flight board'); wire(b, 'quad0', 'block', 'quad', 'host'); wire(b, 'pack', 'flat', 'quad', 'child');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'quad', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'What it weighs and spans'; wire(b, 'quad', 'thing', 'measure', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'quad', 'says', 'said', 'value');
    return b;
  }],
  ['A drone with a robot arm attached: the X-frame quadcopter, the servo arm hanging under its payload mount plate', () => {
    // (decision 0027: two library assemblies joined by the operations. The quadcopter of the DJI F450's class (its
    // published wheelbase and props) and the four-joint servo arm with its gripper; the arm turned over (a half turn
    // about x) so it hangs, its base mount plate against the drone's payload mount plate from below. Not bolted: the
    // arm's M4 holes (64 mm square) and the mount plate's M3 (60 mm) are not one pattern yet)
    const b = emptyBoard('A drone with a robot arm attached');
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('drone', 'seed.quadcopter', { size: '450', stack: 8 }, 'The quadcopter, 450 class (X frame, four motors and props, a payload mount plate under it)');
    put('arm', 'seed.robot-arm', { joints: '4', link: 60, servo: 'SG90' }, 'The robot arm: four joints and a gripper');
    put('hung', 'room.turn', { axis: 'x', degrees: 180 }, 'Turned over, to hang'); wire(b, 'arm', 'block', 'hung', 'block');
    put('both', 'room.onto', { face: '-y', fit: 'touch' }, 'The arm under the drone\'s mount plate'); wire(b, 'drone', 'block', 'both', 'host'); wire(b, 'hung', 'block', 'both', 'child');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'both', 'thing', 'show', 'thing');
    placeBlock(b, 'measure', 0, 0, {}, 'measure'); b.nodes.measure!.label = 'What it weighs and spans'; wire(b, 'both', 'thing', 'measure', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'both', 'says', 'said', 'value');
    return b;
  }],
  ['Turned pieces: DIP ICs of 8 and 16 leads, a DC jack with its plug in, a copper tee, an L bracket bolted to a wall, a hinge opened square', () => {
    // (the third set of common pieces, each made upright and turned (decision 0024): a DIP's leads bent down outside its
    // body; the jack's bore laid along z and the plug passed along it over its pin; the tee's branch joined into its run's
    // side; the bracket's upright, its holes across it, bolted to a wall plate; the hinge's leaves with their screw holes,
    // one opened at a right angle. Laid in a row by Stack along x on the ground, a clear fit apart, the tallest first so it
    // stands behind the rest as the view looks)
    const b = emptyBoard('Turned pieces: DIPs, a DC jack and its plug, a tee, a bracket on a wall, a hinge'), row: string[] = [];
    const put = (id: string, block: string, set: Record<string, unknown>, label: string) => { placeBlock(b, block, 0, 0, set, id); b.nodes[id]!.label = label; };
    put('br', 'piece.bracket', { name: 'L bracket', a: 40, t: 4, L: 40, size: 'M5', holes: 2, upright: 2 }, 'L bracket, holes in its upright');
    put('wall', 'mate.plate', { line: 'L bracket upright/holes', w: 80, t: 5, d: 60, mat: 'steel-low', size: 'M5', head: 'hex' }, 'Bolted to a wall plate by its upright'); wire(b, 'br', 'block', 'wall', 'held'); row.push('wall');
    put('hg', 'piece.hinge', { H: 50, knuckles: 3, holes: 2, open: '90°' }, 'Butt hinge, opened square'); row.push('hg');
    put('tee', 'piece.tee', { size: 'copper 22×0.9', toward: '+x' }, 'Copper tee, 22 mm'); row.push('tee');
    put('jk', 'piece.jack', {}, 'DC barrel jack (PJ-002A)'); put('pl', 'piece.plug', {}, 'DC plug 5.5 × 2.1 (PP3-002A)');
    put('in', 'room.through', { line: 'DC jack housing front/bore', which: 0, from: 'below', fit: 'tight' }, 'The plug along its bore, over its pin'); wire(b, 'jk', 'block', 'in', 'host'); wire(b, 'pl', 'block', 'in', 'passer'); row.push('in');
    put('d16', 'piece.dip', { pins: '16' }, 'DIP-16'); row.push('d16');
    put('d8', 'piece.dip', { pins: '8', name: 'NE555' }, 'DIP-8 (an NE555)'); row.push('d8');
    put('row', 'room.stack', { name: 'turned pieces', axis: 'x', fit: 'clear', level: 'on the ground' }, 'Side by side'); for (const id of row) wire(b, id, 'block', 'row', 'blocks');
    placeBlock(b, 'space.show', 0, 0, {}, 'show'); wire(b, 'row', 'thing', 'show', 'thing');
    placeBlock(b, 'view.show', 0, 0, {}, 'said'); b.nodes.said!.label = 'What it is'; wire(b, 'row', 'says', 'said', 'value');
    return b;
  }],
  ] as [string, Make][]);
  return boards.map(([n, f]) => [n, () => tidy(f())] as [string, Make]);
}
