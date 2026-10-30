// Seeds: things built out of nodes, each folded into one node and kept in the library for good, so the next thing is
// built from it (docs/NODE-ENGINE.md; the Seed Node System). A window and a door; a toilet, a sink and a bed; the
// fittings that make a room what it is (a bathroom's, a kitchen's, a bedroom's, a living room's), plugged into a room by
// its type; a house laid out from a plan you pick, its rooms spawned from it; a car; a foot of grass, and the ground it
// covers; a road and a stop light, and the streets they make; a neighbourhood of houses and cars, and a city of
// neighbourhoods. Every one is an ordinary board of nodes: open it and its nodes are there to change, save it again as
// your own.
//
// Sizes are typical of each thing (said where each is built), not one maker's: a seed's inputs change them. A hollow thing
// drawn as a solid shape (a car's body, a fridge, a cabinet) is given the share of it that is solid (`fill`), set so its
// mass comes near a typical one: those shares are estimates.
// Their materials are said exactly (src/nexus/matter.ts): the oak is northern red oak; a door's leaf and the cabinets are
// MDF, the door's lining Douglas-fir; the sidewalk a 25 MPa concrete mix. These are the seeds' choices, each changed on a
// node like any setting; a material known only by its family ("wood") is said to be unspecified where it is used.

import { register, type BlockDef, type Type } from './blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from './dataflow';
import type { Board } from './boards';
import { PHOTOS } from './photo-marks';
import './reconstruct';

/** A board being built, a node at a time, and saved as a seed. */
class Seed {
  readonly b: Board; private k = 0;
  constructor(title: string) { this.b = emptyBoard(title); }
  /** A node of a block, with its settings; and a label to read it by. */
  n(blockId: string, set: Record<string, unknown> = {}, label?: string): string { const id = `n${this.k++}`; placeBlock(this.b, blockId, 0, 0, set, id); if (label) this.b.nodes[id]!.label = label; return id; }
  /** One of the seed's inputs: its name, type, value when not given, and the choices it may be picked from. */
  input(name: string, type: Type, def: unknown, says: string, choices?: string[], unit = ''): string { return this.n('group.in', { name, type, unit, default: String(def), choices: (choices ?? []).join('|'), says }, `in: ${name}`); }
  output(name: string, type: Type, from: string, port: string, unit = ''): void { const id = this.n('group.out', { name, type, unit }, `out: ${name}`); this.w(from, port, id, 'value'); }
  w(from: string, out: string, to: string, inp: string): void { wire(this.b, from, out, to, inp); }
  /** A formula over named wires: { name: [node, port] }. */
  f(expr: string, ins: Record<string, [string, string]>, label?: string): string { const id = this.n('math.expr', { expr }, label ?? expr); for (const [k, [from, port]] of Object.entries(ins)) this.w(from, port, id, k); return id; }
  /** A thing placed: at fixed numbers, or wired ones ([node, port]). */
  at(thing: [string, string], where: Partial<Record<'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz' | 's', number | [string, string]>>, label?: string): string {
    const fixed: Record<string, number> = {}; for (const [k, v] of Object.entries(where)) if (typeof v === 'number') fixed[k] = v;
    const id = this.n('place', fixed, label); this.w(thing[0], thing[1], id, 'thing');
    for (const [k, v] of Object.entries(where)) if (Array.isArray(v)) this.w(v[0], v[1], id, k);
    return id;
  }
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
const C = (s: Seed, v: number | string, label?: string): [string, string] => (typeof v === 'number' ? [s.n('in.number', { value: v }, label ?? String(v)), 'value'] : [s.n('in.text', { value: v }, label ?? v), 'value']);

// ---- a window, a door --------------------------------------------------------------------------------------------------
function window_(): void {
  // a frame 60 mm across its face and 100 mm deep round a single glazed pane (typical of a timber or uPVC casement)
  const s = new Seed('Window');
  const w = s.input('w', 'number', 1.2, 'width, m', undefined, 'm'), h = s.input('h', 'number', 1.2, 'height, m', undefined, 'm'), col = s.input('frame', 'text', '#f4f4f2', 'frame colour');
  const bar = s.n('shape.box', { name: 'window frame head', mat: 'pvc', fill: 0.3, h: 0.06, d: 0.1 }, 'head and sill'); s.w(w, 'value', bar, 'w'); s.w(col, 'value', bar, 'color');
  const stile = s.n('shape.box', { name: 'window frame jamb', mat: 'pvc', fill: 0.3, w: 0.06, d: 0.1 }, 'jambs'); s.w(h, 'value', stile, 'h'); s.w(col, 'value', stile, 'color');
  const yTop = s.f('h / 2 - 0.03', { h: [h, 'value'] }), xSide = s.f('w / 2 - 0.03', { w: [w, 'value'] });
  const top = s.at([bar, 'part'], { y: [yTop, 'result'] }, 'head'), bot = s.at([bar, 'part'], { y: [s.f('0 - y', { y: [yTop, 'result'] }), 'result'] }, 'sill');
  const left = s.at([stile, 'part'], { x: [s.f('0 - x', { x: [xSide, 'result'] }), 'result'] }, 'left jamb'), right = s.at([stile, 'part'], { x: [xSide, 'result'] }, 'right jamb');
  const pane = s.n('shape.box', { name: 'window glass', mat: 'glass', color: '#9cc3d5', d: 0.006 }, 'glass'); s.w(s.f('w - 0.12', { w: [w, 'value'] }), 'result', pane, 'w'); s.w(s.f('h - 0.12', { h: [h, 'value'] }), 'result', pane, 'h');
  const win = s.all('window', [[top, 'placed'], [bot, 'placed'], [left, 'placed'], [right, 'placed'], [pane, 'part']]);
  const winF = s.n('frame', { name: 'fit', facing: '+z' }, 'its frame: its middle, facing out'); s.w(win, 'assembly', winF, 'thing');
  s.output('window', 'assembly', winF, 'thing');
  s.save('seed.window', 'Window', 'A window: its frame round one pane of glass, centred on its own middle, facing z. Width, height and frame colour are yours (a 60 mm frame 100 mm deep, typical)', ['structural', 'everyday']);
}
function door(): void {
  // an interior door leaf 40 mm thick (typical), a lever handle 1 m up on both faces, a 20 mm lining round it
  const s = new Seed('Door');
  const w = s.input('w', 'number', 0.9, 'width, m', undefined, 'm'), h = s.input('h', 'number', 2.1, 'height, m', undefined, 'm'), col = s.input('colour', 'text', '#a1887f', 'door colour');
  const leaf = s.n('shape.box', { name: 'door leaf', mat: 'mdf', fill: 0.35, d: 0.04, finish: 'paint' }, 'leaf'); s.w(s.f('w - 0.04', { w: [w, 'value'] }), 'result', leaf, 'w'); s.w(s.f('h - 0.02', { h: [h, 'value'] }), 'result', leaf, 'h'); s.w(col, 'value', leaf, 'color');
  const lever = s.n('shape.box', { name: 'door handle', mat: 'stainless-304', color: '#c0c4c8', finish: 'brushed', w: 0.13, h: 0.02, d: 0.02 }, 'lever');
  const hx = s.f('w / 2 - 0.12', { w: [w, 'value'] }), hy = s.f('1 - h / 2', { h: [h, 'value'] });
  const front = s.at([lever, 'part'], { x: [hx, 'result'], y: [hy, 'result'], z: 0.035 }, 'handle, front'), back = s.at([lever, 'part'], { x: [hx, 'result'], y: [hy, 'result'], z: -0.035 }, 'handle, back');
  const jamb = s.n('shape.box', { name: 'door lining', mat: 'douglas-fir', color: '#efebe9', w: 0.02, d: 0.12 }, 'lining'); s.w(h, 'value', jamb, 'h');
  const jx = s.f('w / 2 - 0.01', { w: [w, 'value'] });
  const jl = s.at([jamb, 'part'], { x: [s.f('0 - x', { x: [jx, 'result'] }), 'result'] }, 'lining left'), jr = s.at([jamb, 'part'], { x: [jx, 'result'] }, 'lining right');
  // (hung on two butt hinges at the side away from its handle, their knuckles at its edge: 89 mm leaves, a 13 mm knuckle;
  // the top one 180 mm down, the bottom one 280 mm up, typical of interior doors)
  const hinge = s.n('shape.cyl', { name: 'door hinge', mat: 'steel-low', color: '#9a9ea4', finish: 'plate', r: 0.0065, h: 0.089 }, 'hinge knuckle');
  const kx = s.f('0 - (w / 2 - 0.02)', { w: [w, 'value'] });
  const ht = s.at([hinge, 'part'], { x: [kx, 'result'], y: [s.f('h / 2 - 0.18', { h: [h, 'value'] }), 'result'], z: 0.02 }, 'hinge, top'), hb = s.at([hinge, 'part'], { x: [kx, 'result'], y: [s.f('0.28 - h / 2', { h: [h, 'value'] }), 'result'], z: 0.02 }, 'hinge, bottom');
  const d = s.all('door', [[leaf, 'part'], [front, 'placed'], [back, 'placed'], [jl, 'placed'], [jr, 'placed'], [ht, 'placed'], [hb, 'placed']]);
  // (the room it needs, on it: its leaf's sweep out of the face its knuckles are on, from its hinged edge, the leaf's width
  // its radius; and the floor to come up to it and push on its other face, a passage 760 mm deep (an estimate: a body's
  // depth and a step))
  const sweep = s.n('zone', { name: 'swing', kind: 'swing', face: '+z', hinge: 'left', why: 'the quarter disc its leaf sweeps from its hinge, its radius the leaf\'s width' }, 'the room its leaf sweeps'); s.w(d, 'assembly', sweep, 'thing'); s.w(s.f('w - 0.04', { w: [w, 'value'] }), 'result', sweep, 'r');
  const reach = s.n('zone', { name: 'approach', kind: 'front', face: '-z', why: 'a passage its width wide, 760 mm deep, to come up to it and push (an estimate: a body\'s depth and a step)' }, 'the floor to come up to it'); s.w(sweep, 'thing', reach, 'thing'); s.w(s.f('0.76', {}), 'result', reach, 'depth');
  const dF = s.n('frame', { name: 'fit', facing: '+z' }, 'its frame: its middle, facing out'); s.w(reach, 'thing', dF, 'thing');
  s.output('door', 'assembly', dF, 'thing');
  s.save('seed.door', 'Door', 'A door: its leaf hung on two hinges, a lever handle on each face 1 m up, its lining; centred on its own middle. Width, height and colour are yours (an interior door 40 mm thick, typical)', ['structural', 'everyday']);
}

// ---- fittings: a toilet, a sink, a bed -----------------------------------------------------------------------------
function toilet(): void {
  // a close-coupled toilet, typical: its seat 400 mm up, the pan about 360 wide and 480 long, its cistern 500 wide,
  // 380 high and 200 deep behind it, about 700 mm from the wall to its front. Vitreous china, as tile is (about 2,000 kg/m³)
  const s = new Seed('Toilet');
  const col = s.input('colour', 'text', '#fafafa', 'colour');
  const pan = s.n('shape.lathe', { name: 'toilet pan', mat: 'tile', fill: 0.25, profile: '0, 0; 120, 0; 110, 60; 95, 200; 170, 330; 180, 380; 150, 385; 0, 385' }, 'pan (turned)'); s.w(col, 'value', pan, 'color');
  const oval = s.n('variant', { kz: 1.35 }, 'pan stretched front to back'); s.w(pan, 'part', oval, 'thing');
  const panAt = s.at([oval, 'variant'], { z: 0.42 }, 'pan out from the wall');
  const seat = s.n('shape.torus', { name: 'toilet seat', mat: 'pp', R: 0.15, r: 0.022 }, 'seat'); s.w(col, 'value', seat, 'color');
  const seatOval = s.n('variant', { kx: 1, ky: 1.35 }, 'seat stretched'); s.w(seat, 'part', seatOval, 'thing');
  const seatAt = s.at([seatOval, 'variant'], { y: 0.4, z: 0.42, rx: Math.PI / 2 }, 'seat on the pan');
  const tank = s.n('shape.box', { name: 'toilet cistern', mat: 'tile', fill: 0.2, w: 0.5, h: 0.38, d: 0.2 }, 'cistern'); s.w(col, 'value', tank, 'color');
  const tankAt = s.at([tank, 'part'], { y: 0.6, z: 0.11 }, 'cistern against the wall');
  const flush = s.n('shape.cyl', { name: 'flush button', mat: 'stainless-304', color: '#c0c4c8', finish: 'chrome', r: 0.025, h: 0.01 }, 'flush button');
  const flushAt = s.at([flush, 'part'], { y: 0.795, z: 0.11 }, 'button on top');
  const t = s.all('toilet', [[panAt, 'placed'], [seatAt, 'placed'], [tankAt, 'placed'], [flushAt, 'placed']]);
  const tz = s.n('zone', { name: 'clear floor', kind: 'front', face: '+z', why: '21 in (533 mm) clear in front of a water closet, and 15 in (381 mm) from its centre line to anything beside it (IRC R307.1)' }, 'its clear floor'); s.w(t, 'assembly', tz, 'thing'); s.w(s.f('0.533', {}), 'result', tz, 'depth'); s.w(s.f('2 * 0.381', {}), 'result', tz, 'width');
  s.output('toilet', 'assembly', tz, 'thing');
  s.save('seed.toilet', 'Toilet', 'A close-coupled toilet with its back to the wall at z = 0, facing +z, standing on the floor: pan, seat 400 mm up, cistern and flush (typical sizes)', ['structural', 'everyday']);
}
function sink(): void {
  // three kinds, each typical: a pedestal basin (550 wide, its rim 850 up), a vanity (600 wide cabinet, 850 up), a kitchen
  // sink set in an 600 deep base cabinet with its worktop 900 up
  const s = new Seed('Sink');
  const kind = s.input('kind', 'text', 'pedestal', 'kind of sink', ['pedestal', 'vanity', 'kitchen']), col = s.input('colour', 'text', '#fafafa', 'basin colour');
  const tap = s.n('shape.tube', { name: 'tap', mat: 'stainless-304', color: '#d0d4d8', finish: 'chrome', r: 0.012, wall: 0.002, h: 0.22 }, 'tap');
  const spout = s.n('shape.box', { name: 'tap spout', mat: 'stainless-304', color: '#d0d4d8', finish: 'chrome', w: 0.025, h: 0.025, d: 0.14 }, 'spout');
  const basin = s.n('shape.lathe', { name: 'basin', mat: 'tile', fill: 0.35, profile: '0, 0; 160, 0; 230, 120; 280, 160; 270, 170; 0, 170' }, 'basin (turned)'); s.w(col, 'value', basin, 'color');
  const column = s.n('shape.cyl', { name: 'pedestal', mat: 'tile', fill: 0.3, r: 0.09, h: 0.68, r2: 0.07 }, 'pedestal'); s.w(col, 'value', column, 'color');
  const ped = s.all('pedestal sink', [[s.at([column, 'part'], { y: 0.34, z: 0.25 }), 'placed'], [s.at([basin, 'part'], { y: 0.68, z: 0.25 }), 'placed'], [s.at([tap, 'part'], { y: 0.94, z: 0.05 }), 'placed'], [s.at([spout, 'part'], { y: 1.04, z: 0.11 }), 'placed']]);
  const cab = s.n('shape.box', { name: 'vanity cabinet', mat: 'mdf', fill: 0.1, color: '#6d4c41', finish: 'paint', w: 0.6, h: 0.8, d: 0.46 }, 'vanity cabinet');
  const top = s.n('shape.box', { name: 'vanity top', mat: 'tile', w: 0.62, h: 0.05, d: 0.48 }, 'vanity top'); s.w(col, 'value', top, 'color');
  const van = s.all('vanity', [[s.at([cab, 'part'], { y: 0.4, z: 0.23 }), 'placed'], [s.at([top, 'part'], { y: 0.825, z: 0.24 }), 'placed'], [s.at([tap, 'part'], { y: 0.96, z: 0.06 }), 'placed'], [s.at([spout, 'part'], { y: 1.06, z: 0.12 }), 'placed']]);
  const base = s.n('shape.box', { name: 'base cabinet', mat: 'mdf', fill: 0.1, color: '#eceff1', finish: 'paint', w: 0.8, h: 0.86, d: 0.6 }, 'base cabinet');
  const worktop = s.n('shape.box', { name: 'worktop', mat: 'granite', color: '#455a64', finish: 'stone', w: 0.8, h: 0.04, d: 0.62 }, 'worktop');
  const bowl = s.n('shape.box', { name: 'sink bowl', mat: 'stainless-304', color: '#b0b6bc', finish: 'brushed', w: 0.5, h: 0.02, d: 0.4 }, 'bowl');
  const kit = s.all('kitchen sink', [[s.at([base, 'part'], { y: 0.43, z: 0.3 }), 'placed'], [s.at([worktop, 'part'], { y: 0.88, z: 0.31 }), 'placed'], [s.at([bowl, 'part'], { y: 0.895, z: 0.33 }), 'placed'], [s.at([tap, 'part'], { y: 1.01, z: 0.07 }), 'placed'], [s.at([spout, 'part'], { y: 1.11, z: 0.13 }), 'placed']]);
  // (a basin keeps the floor in front of it a code asks for; a kitchen sink is in its run, which keeps its aisle)
  const basinZone = (a: string, label: string) => { const z = s.n('zone', { name: 'clear floor', kind: 'front', face: '+z', why: '21 in (533 mm) clear in front of a lavatory (IRC R307.1)' }, label); s.w(a, 'assembly', z, 'thing'); s.w(s.f('0.533', {}), 'result', z, 'depth'); return z; };
  const pedZ = basinZone(ped, 'its clear floor'), vanZ = basinZone(van, 'its clear floor ');
  const pick = s.n('pick', { options: 'pedestal|vanity|kitchen' }, 'which kind'); s.w(kind, 'value', pick, 'which'); s.w(pedZ, 'thing', pick, 'pedestal'); s.w(vanZ, 'thing', pick, 'vanity'); s.w(kit, 'assembly', pick, 'kitchen');
  s.output('sink', 'assembly', pick, 'chosen');
  s.save('seed.sink', 'Sink', 'A sink with its back to the wall at z = 0, facing +z: a pedestal basin, a vanity, or a kitchen sink in its base cabinet, by its kind (typical sizes)', ['structural', 'everyday']);
}
function bed(): void {
  // mattress widths and lengths (US): twin 0.99 × 1.91 m, full 1.37 × 1.91, queen 1.52 × 2.03, king 1.93 × 2.03
  const s = new Seed('Bed');
  const size = s.input('size', 'text', 'queen', 'size', ['twin', 'full', 'queen', 'king']), cover = s.input('cover', 'text', '#5c6bc0', 'cover colour');
  const pw = s.n('pick', { options: 'twin|full|queen|king' }, 'its width'); s.w(size, 'value', pw, 'which');
  for (const [k, v] of [['twin', 0.99], ['full', 1.37], ['queen', 1.52], ['king', 1.93]] as const) s.w(C(s, v, `${k} ${v} m`)[0], 'value', pw, k);
  const pl = s.n('pick', { options: 'twin|full|queen|king' }, 'its length'); s.w(size, 'value', pl, 'which');
  for (const [k, v] of [['twin', 1.91], ['full', 1.91], ['queen', 2.03], ['king', 2.03]] as const) s.w(C(s, v, `${k} ${v} m`)[0], 'value', pl, k);
  const frame = s.n('shape.box', { name: 'bed frame', mat: 'red-oak', fill: 0.08, color: '#8d6e63', h: 0.3 }, 'frame'); s.w(s.f('w + 0.06', { w: [pw, 'chosen'] }), 'result', frame, 'w'); s.w(s.f('l + 0.06', { l: [pl, 'chosen'] }), 'result', frame, 'd');
  const matt = s.n('shape.box', { name: 'mattress', mat: 'foam', h: 0.25 }, 'mattress'); s.w(pw, 'chosen', matt, 'w'); s.w(pl, 'chosen', matt, 'd'); s.w(cover, 'value', matt, 'color');
  const head = s.n('shape.box', { name: 'headboard', mat: 'red-oak', fill: 0.4, color: '#6d4c41', h: 1.0, d: 0.06 }, 'headboard'); s.w(s.f('w + 0.06', { w: [pw, 'chosen'] }), 'result', head, 'w');
  const pillow = s.n('shape.box', { name: 'pillow', mat: 'foam', color: '#fafafa', w: 0.6, h: 0.12, d: 0.4 }, 'pillow');
  const pz = s.f('0.3', {}, 'pillow 0.3 m from the head'), px = s.f('w / 4', { w: [pw, 'chosen'] });
  const b = s.all('bed', [
    [s.at([frame, 'part'], { y: 0.15, z: [s.f('l / 2 + 0.06', { l: [pl, 'chosen'] }), 'result'] }), 'placed'],
    [s.at([matt, 'part'], { y: 0.425, z: [s.f('l / 2 + 0.06', { l: [pl, 'chosen'] }), 'result'] }), 'placed'],
    [s.at([head, 'part'], { y: 0.5, z: 0.03 }), 'placed'],
    [s.at([pillow, 'part'], { x: [px, 'result'], y: 0.6, z: [pz, 'result'] }), 'placed'],
    [s.at([pillow, 'part'], { x: [s.f('0 - x', { x: [px, 'result'] }), 'result'], y: 0.6, z: [pz, 'result'] }), 'placed'],
  ]);
  s.output('bed', 'assembly', b, 'assembly');
  s.save('seed.bed', 'Bed', 'A bed with its head to the wall at z = 0, its foot toward +z: frame, mattress, headboard and two pillows; twin, full, queen or king (US mattress sizes)', ['everyday']);
}

// ---- what makes a room what it is: its fittings, plugged into a room by its type -----------------------------------
/** A fittings seed: what stands in a room of w by d (its middle at the origin, its back wall at z = −d/2). */
function fittings(kind: string, says: string, build: (s: Seed, w: string, d: string) => [string, string][]): void {
  const s = new Seed(`${kind} fittings`), w = s.input('w', 'number', 4, 'room width, m', undefined, 'm'), d = s.input('d', 'number', 4, 'room depth, m', undefined, 'm');
  const things = build(s, w, d);
  s.output('fittings', 'assembly', s.all(`${kind} fittings`, things), 'assembly');
  s.save(`seed.fittings.${kind}`, `${kind[0]!.toUpperCase()}${kind.slice(1)} fittings`, says, ['structural', 'everyday']);
}
/** z of the back wall's inside face, and x of the left wall's, in a room of w by d with 150 mm walls. */
const back = (s: Seed, d: string) => s.f('0.075 - d / 2', { d: [d, 'value'] }, 'back wall inside');
const leftX = (s: Seed, w: string, k: number) => s.f(`${k} - w / 2`, { w: [w, 'value'] }, `${k} m from the left wall`);
function fittingsAll(): void {
  fittings('bathroom', 'What makes a room a bathroom: a toilet and a basin against the back wall, a bath along the left (a 1.7 × 0.75 m bath, typical)', (s, w, d) => {
    const bz = back(s, d);
    const t = s.n('seed.toilet', {}, 'toilet'), k = s.n('seed.sink', { kind: 'pedestal' }, 'basin');
    const bath = s.n('shape.box', { name: 'bath', mat: 'pmma', fill: 0.04, color: '#fafafa', w: 0.75, h: 0.55, d: 1.7 }, 'bath');
    return [
      [s.at([t, 'toilet'], { x: [s.f('w / 2 - 0.6', { w: [w, 'value'] }), 'result'], z: [bz, 'result'] }), 'placed'],
      [s.at([k, 'sink'], { x: [s.f('0.1', {}), 'result'], z: [bz, 'result'] }), 'placed'],
      [s.at([bath, 'part'], { x: [leftX(s, w, 0.45), 'result'], y: 0.275, z: [s.f('b + 0.85', { b: [bz, 'result'] }), 'result'] }), 'placed'],
    ];
  });
  fittings('kitchen', 'What makes a room a kitchen: a run of base cabinets and a worktop along the back wall, the sink in it, a stove and a fridge (cabinets 600 deep, 900 high; a 760 mm range; a 750 × 1750 mm fridge: typical)', (s, w, d) => {
    const bz = back(s, d);
    const run = s.n('shape.box', { name: 'base cabinets', mat: 'mdf', fill: 0.1, color: '#eceff1', finish: 'paint', h: 0.86, d: 0.6 }, 'cabinet run'); s.w(s.f('w - 1.69', { w: [w, 'value'] }), 'result', run, 'w');
    const top = s.n('shape.box', { name: 'worktop', mat: 'granite', color: '#455a64', finish: 'stone', h: 0.04, d: 0.62 }, 'worktop'); s.w(s.f('w - 1.69', { w: [w, 'value'] }), 'result', top, 'w');
    const sinkK = s.n('seed.sink', { kind: 'kitchen' }, 'sink');
    const stove = s.n('shape.box', { name: 'stove', mat: 'stainless-304', fill: 0.02, color: '#cfd8dc', finish: 'brushed', w: 0.76, h: 0.9, d: 0.62 }, 'stove');
    const fridge = s.n('shape.box', { name: 'fridge', mat: 'steel-low', fill: 0.012, color: '#eceff1', finish: 'paint', w: 0.75, h: 1.75, d: 0.7 }, 'fridge');
    // (along the back wall between its side walls' faces, 75 mm in: the run from the left, then the stove, then the fridge,
    // 10 mm apart)
    // (the run keeps its work aisle in front of it: 42 in, 1067 mm, for one cook, the NKBA's kitchen planning guidelines)
    const runZ = s.n('zone', { name: 'work aisle', kind: 'front', face: '+z', why: 'a 42 in (1067 mm) work aisle for one cook (NKBA Kitchen Planning Guidelines)' }, 'its work aisle'); s.w(run, 'part', runZ, 'thing'); s.w(s.f('1.067', {}), 'result', runZ, 'depth');
    const runX = s.f('0 - 0.765', {}, 'run middle'), z0 = s.f('b + 0.3', { b: [bz, 'result'] }, 'its middle');
    return [
      [s.at([runZ, 'thing'], { x: [runX, 'result'], y: 0.43, z: [z0, 'result'] }), 'placed'],
      [s.at([top, 'part'], { x: [runX, 'result'], y: 0.88, z: [s.f('b + 0.31', { b: [bz, 'result'] }), 'result'] }), 'placed'],
      [s.at([sinkK, 'sink'], { x: [runX, 'result'], z: [bz, 'result'] }), 'placed'],
      [s.at([stove, 'part'], { x: [s.f('w / 2 - 1.225', { w: [w, 'value'] }), 'result'], y: 0.45, z: [s.f('b + 0.31', { b: [bz, 'result'] }), 'result'] }), 'placed'],
      [s.at([fridge, 'part'], { x: [s.f('w / 2 - 0.46', { w: [w, 'value'] }), 'result'], y: 0.875, z: [s.f('b + 0.35', { b: [bz, 'result'] }), 'result'] }), 'placed'],
    ];
  });
  fittings('bedroom', 'What makes a room a bedroom: a queen bed against the back wall, a bedside table each side, a wardrobe in the corner (600 deep, typical)', (s, w, d) => {
    const bz = back(s, d), b = s.n('seed.bed', { size: 'queen' }, 'bed');
    const stand = s.n('shape.box', { name: 'bedside table', mat: 'red-oak', fill: 0.15, color: '#8d6e63', w: 0.45, h: 0.55, d: 0.4 }, 'bedside table');
    const robe = s.n('shape.box', { name: 'wardrobe', mat: 'red-oak', fill: 0.07, color: '#a1887f', finish: 'paint', w: 1.0, h: 2.0, d: 0.6 }, 'wardrobe');
    return [
      [s.at([b, 'bed'], { z: [bz, 'result'] }), 'placed'],
      [s.at([stand, 'part'], { x: -1.05, y: 0.275, z: [s.f('b + 0.2', { b: [bz, 'result'] }), 'result'] }), 'placed'],
      [s.at([stand, 'part'], { x: 1.05, y: 0.275, z: [s.f('b + 0.2', { b: [bz, 'result'] }), 'result'] }), 'placed'],
      [s.at([robe, 'part'], { x: [s.f('w / 2 - 0.6', { w: [w, 'value'] }), 'result'], y: 1.0, z: [s.f('d / 2 - 0.4', { d: [d, 'value'] }), 'result'] }), 'placed'],
    ];
  });
  fittings('living', 'What makes a room a living room: a sofa facing a television on its stand, a low table between (a 2.1 m three-seat sofa, typical)', (s, w, d) => {
    const bz = back(s, d);
    const seat0 = s.n('shape.box', { name: 'sofa seat', mat: 'foam', color: '#78909c', w: 2.1, h: 0.45, d: 0.9 }, 'sofa seat');
    // (the sofa mates with the television while someone watches, each by a number: it faces it within 30° (an estimate),
    // sits between the THX distance (a 40° view: 1.37 times the screen's width) and SMPTE's (30°: 1.87 times), and sees
    // most of the screen from a seated eye 1.1 m up (typical) past what is between)
    const tvW = 1.44, rel = (k: string, set: Record<string, unknown>, mn?: string, mx?: string) => { const r = s.n('relate', { to: 'television', when: 'watching', face: '-z', ...set }, k); if (mn) s.w(s.f(mn, {}), 'result', r, 'min'); if (mx) s.w(s.f(mx, {}), 'result', r, 'max'); return r; };
    const r1 = rel('it faces the television', { name: 'faces the screen', measure: 'facing', why: 'within 30° of straight on (an estimate)' }, undefined, '30');
    const r2 = rel('it sits at a viewing distance', { name: 'viewing distance', measure: 'distance', why: `between THX's 40° view (1.37 × the ${tvW} m screen) and SMPTE EG-18's 30° (1.87 ×)` }, `1.37 * ${tvW}`, `1.87 * ${tvW}`);
    const r3 = rel('it sees the screen', { name: 'sees the screen', measure: 'sees', eye: 1.1, why: 'most of the screen seen from a seated eye 1.1 m up (typical)' }, '0.75');
    s.w(seat0, 'part', r1, 'thing'); s.w(r1, 'thing', r2, 'thing'); s.w(r2, 'thing', r3, 'thing'); const seat = r3;
    const sback = s.n('shape.box', { name: 'sofa back', mat: 'foam', color: '#607d8b', w: 2.1, h: 0.45, d: 0.2 }, 'sofa back');
    const table0 = s.n('shape.box', { name: 'coffee table', mat: 'red-oak', fill: 0.15, color: '#8d6e63', w: 1.1, h: 0.42, d: 0.6 }, 'low table');
    // (the table mates with the sofa: within reach of it, 350 to 500 mm off its seat (typical of interior guidance))
    const table = s.n('relate', { name: 'within reach of the sofa', to: 'sofa seat', measure: 'gap', why: '350 to 500 mm off the seat (typical of interior guidance)' }, 'it stands within reach of the sofa'); s.w(table0, 'part', table, 'thing'); s.w(s.f('0.35', {}), 'result', table, 'min'); s.w(s.f('0.5', {}), 'result', table, 'max');
    const tvStand = s.n('shape.box', { name: 'tv stand', mat: 'red-oak', fill: 0.15, color: '#5d4037', w: 1.6, h: 0.5, d: 0.4 }, 'tv stand');
    const tv = s.n('shape.box', { name: 'television', mat: 'glass', fill: 0.15, color: '#111417', w: 1.44, h: 0.83, d: 0.05 }, 'television (65 in)');
    const front = s.f('d / 2 - 0.6', { d: [d, 'value'] }, 'sofa toward the front');
    return [
      [s.at([seat, 'thing'], { y: 0.225, z: [front, 'result'] }), 'placed'],
      [s.at([sback, 'part'], { y: 0.675, z: [s.f('f + 0.35', { f: [front, 'result'] }), 'result'] }), 'placed'],
      [s.at([table, 'thing'], { y: 0.21, z: [s.f('f - 1.2', { f: [front, 'result'] }), 'result'] }), 'placed'],
      [s.at([tvStand, 'part'], { y: 0.25, z: [s.f('b + 0.2', { b: [bz, 'result'] }), 'result'] }), 'placed'],
      [s.at([tv, 'part'], { y: 0.95, z: [s.f('b + 0.2', { b: [bz, 'result'] }), 'result'] }), 'placed'],
    ];
  });
}

// ---- a wall with what is in it: a door, a window, or nothing --------------------------------------------------------
function wallSeed(): void {
  // walls 150 mm thick (typical of a house); a 900 × 2100 mm door, a 1.2 × 1.2 m window with its sill 0.9 m up (typical)
  const s = new Seed('Wall');
  const kind = s.input('kind', 'text', 'wall', 'what is in it', ['wall', 'door', 'window', 'none']);
  const L = s.input('L', 'number', 4, 'length, m', undefined, 'm'), h = s.input('h', 'number', 2.4, 'height, m', undefined, 'm'), col = s.input('colour', 'text', '#eceff1', 'wall colour');
  const mk = (opening: 'none' | 'door' | 'window', ow: number, oh: number, label: string) => { const id = s.n('wall', { opening, mat: 'brick', finish: 'paint', name: 'wall', ow, oh }, label); s.w(L, 'value', id, 'L'); s.w(h, 'value', id, 'h'); s.w(col, 'value', id, 'color'); return id; };
  const plain = mk('none', 0.9, 2.1, 'plain wall'), withDoor = mk('door', 0.9, 2.1, 'wall with a door opening'), withWin = mk('window', 1.2, 1.2, 'wall with a window opening');
  const dr = s.n('seed.door', {}, 'a door'), win = s.n('seed.window', {}, 'a window');
  const md = s.n('mate', { frame: 'fit', onto: 'opening', how: 'into' }, 'the door mated into its opening'); s.w(dr, 'door', md, 'thing'); s.w(withDoor, 'wall', md, 'on');
  const mw = s.n('mate', { frame: 'fit', onto: 'opening', how: 'into' }, 'the window mated into its opening'); s.w(win, 'window', mw, 'thing'); s.w(withWin, 'wall', mw, 'on');
  const pick = s.n('pick', { options: 'wall|door|window|none', empty: true }, 'what is in it'); s.w(kind, 'value', pick, 'which');
  s.w(plain, 'wall', pick, 'wall'); s.w(md, 'both', pick, 'door'); s.w(mw, 'both', pick, 'window');
  s.output('wall', 'assembly', pick, 'chosen');
  s.save('seed.wall', 'Wall', 'A wall along x standing on the ground, its face to +z: plain, with a door or a window mated into its opening by their frames, or none at all (an open side, where a hall meets a room)', ['structural', 'everyday']);
}

// ---- a room, plugged with its fittings by its type ----------------------------------------------------------------
function room(): void {
  // 2.4 m to the ceiling (typical of a house)
  const s = new Seed('Room');
  const type = s.input('type', 'text', 'bedroom', 'what kind of room', ['bedroom', 'bathroom', 'kitchen', 'living', 'hall']);
  const w = s.input('w', 'number', 4, 'width, m', undefined, 'm'), d = s.input('d', 'number', 4, 'depth, m', undefined, 'm'), h = s.input('h', 'number', 2.4, 'ceiling height, m', undefined, 'm');
  const wallCol = s.input('wall', 'text', '#eceff1', 'wall colour');
  const KINDS = ['wall', 'door', 'window', 'none'];
  const side = { front: s.input('front', 'text', 'door', 'its front wall (+z)', KINDS), back: s.input('back', 'text', 'window', 'its back wall', KINDS), left: s.input('left', 'text', 'wall', 'its left wall (−x)', KINDS), right: s.input('right', 'text', 'wall', 'its right wall', KINDS) };
  // its floor by its type: timber in a bedroom, a living room and a hall, light tile in a bathroom, darker tile in a kitchen
  const fc = s.n('pick', { options: 'bedroom|bathroom|kitchen|living|hall' }, 'floor colour, by its type'); s.w(type, 'value', fc, 'which');
  const fm = s.n('pick', { options: 'bedroom|bathroom|kitchen|living|hall' }, 'floor material, by its type'); s.w(type, 'value', fm, 'which');
  for (const [k, c, m] of [['bedroom', '#a1887f', 'oak'], ['bathroom', '#e0e4e8', 'tile'], ['kitchen', '#78868f', 'tile'], ['living', '#8d6e63', 'oak'], ['hall', '#9c7b62', 'oak']] as const) { s.w(C(s, c, `${k} floor`)[0], 'value', fc, k); s.w(C(s, m, `${k}: ${m}`)[0], 'value', fm, k); }
  const floor = s.n('shape.box', { name: 'floor', mat: 'red-oak', finish: 'grain', h: 0.05 }, 'floor'); s.w(w, 'value', floor, 'w'); s.w(d, 'value', floor, 'd'); s.w(fc, 'chosen', floor, 'color'); s.w(fm, 'chosen', floor, 'mat');
  const fl = s.at([floor, 'part'], { y: -0.025 }, 'floor at its level');
  // its four walls, each a Wall seed with what that side has in it; the back and left turned to face in
  const wallOf = (k: keyof typeof side, len: string) => { const id = s.n('seed.wall', {}, `${k} wall`); s.w(side[k], 'value', id, 'kind'); s.w(len, 'value', id, 'L'); s.w(h, 'value', id, 'h'); s.w(wallCol, 'value', id, 'colour'); return id; };
  const zF = s.f('d / 2', { d: [d, 'value'] }), zB = s.f('0 - d / 2', { d: [d, 'value'] }), xR = s.f('w / 2', { w: [w, 'value'] }), xL = s.f('0 - w / 2', { w: [w, 'value'] });
  const fw = s.at([wallOf('front', w), 'wall'], { z: [zF, 'result'] }, 'front wall'), bw = s.at([wallOf('back', w), 'wall'], { z: [zB, 'result'], ry: Math.PI }, 'back wall');
  const lw = s.at([wallOf('left', d), 'wall'], { x: [xL, 'result'], ry: -Math.PI / 2 }, 'left wall'), rw = s.at([wallOf('right', d), 'wall'], { x: [xR, 'result'], ry: Math.PI / 2 }, 'right wall');
  const pick = s.n('pick', { options: 'bedroom|bathroom|kitchen|living|hall', empty: true }, 'its fittings, by its type (a hall has none)'); s.w(type, 'value', pick, 'which');
  for (const k of ['bedroom', 'bathroom', 'kitchen', 'living']) { const f = s.n(`seed.fittings.${k}`, {}, `${k} fittings`); s.w(w, 'value', f, 'w'); s.w(d, 'value', f, 'd'); s.w(f, 'fittings', pick, k); }
  const r = s.all('room', [[fl, 'placed'], [fw, 'placed'], [bw, 'placed'], [lw, 'placed'], [rw, 'placed'], [pick, 'chosen']]);
  s.output('room', 'assembly', r, 'assembly');
  s.save('seed.room', 'Room', 'A room: floor, four Walls (each plain, with a door, with a window, or open), and the fittings its type plugs in (a bedroom\'s bed, a bathroom\'s toilet, a kitchen\'s sink…). Its middle at the origin, no ceiling so you can see in', ['structural', 'everyday']);
}

// ---- a house: its rooms spawned from its plan, its roof over them --------------------------------------------------
function house(): void {
  const s = new Seed('House');
  const plan = s.input('plan', 'text', '2 bed', 'its layout', ['studio', '1 bed', '2 bed', '3 bed']);
  const wallCol = s.input('wall', 'text', '#eceff1', 'wall colour'), roofCol = s.input('roof', 'text', '#6d4c41', 'roof colour');
  const lid = s.input('show', 'text', 'roof on', 'its roof on, or off to see the rooms', ['roof on', 'roof off']);
  // a hall 1.1 m wide between its rows of rooms (typical: 0.9 to 1.2 m); each wall's door, window or nothing from what it
  // touches: a room's door opens onto the hall, its windows look outside, a wall two rooms share is built once, the hall
  // is open to its rooms and has a door at each end
  const p = s.n('plan.rooms', { hall: 1.1 }, 'its floor plan, a hall between its rows'); s.w(plan, 'value', p, 'plan');
  const touch = s.n('rows.touch', {}, 'what each wall touches'); s.w(p, 'rows', touch, 'rows');
  const rules = s.n('rows.recode', { rules: 'hall/outside: door\nhall/*: none\n*/outside: window\n*/hall*: door\n*/* (shared): none\n*: wall' }, 'doors to the hall, windows outside'); s.w(touch, 'rows', rules, 'rows');
  const painted = s.n('rows.set', { column: 'wall' }, 'every room its wall colour'); s.w(rules, 'rows', painted, 'rows'); s.w(wallCol, 'value', painted, 'value');
  const rooms = s.n('spawn', { seed: 'seed.room' }, 'its rooms'); s.w(painted, 'rows', rooms, 'rows');
  // (and the room every thing in it needs kept clear (each carries its own zones: a door's sweep, a toilet's clear floor,
  // a kitchen's aisle): what stands in one is moved along its wall, or to another, unless it is meant to be there)
  const clear = s.n('proximity', {}, 'every zone kept clear'); s.w(rooms, 'things', clear, 'thing');
  // a gable roof: a triangle 1 m across and 0.4 m high, stretched over the floor with 300 mm eaves all round, a pitch of about 22° (typical)
  const roof = s.n('shape.extrude', { name: 'roof', mat: 'tile', finish: 'texture', profile: '-500, 0; 500, 0; 0, 400', L: 1 }, 'roof (gable)'); s.w(roofCol, 'value', roof, 'color');
  const stretch = s.n('variant', {}, 'roof over the whole floor'); s.w(roof, 'part', stretch, 'thing');
  s.w(s.f('W + 0.6', { W: [p, 'W'] }), 'result', stretch, 'kx'); s.w(s.f('(W + 0.6) * 0.5', { W: [p, 'W'] }), 'result', stretch, 'ky'); s.w(s.f('D + 0.6', { D: [p, 'D'] }), 'result', stretch, 'kz');
  const roofAt = s.at([stretch, 'variant'], { y: 2.45 }, 'roof on the walls');
  const roofed = s.all('house', [[clear, 'thing'], [roofAt, 'placed']]);
  const all = s.n('pick', { options: 'roof on|roof off' }, 'roof on or off'); s.w(lid, 'value', all, 'which'); s.w(roofed, 'assembly', all, 'roof on'); s.w(clear, 'thing', all, 'roof off');
  s.output('house', 'assembly', all, 'chosen'); s.output('W', 'number', p, 'W', 'm'); s.output('D', 'number', p, 'D', 'm');
  s.save('seed.house', 'House', 'A house: its rooms laid out from the plan you pick (studio, 1, 2 or 3 bed) either side of a hall, each spawned as a Room with its fittings, its doors onto the hall and its windows outside decided by what each wall touches, under a gable roof (or with it off, to see in). Pick another plan and the rooms are laid out again', ['structural', 'everyday']);
}

// ---- a car ---------------------------------------------------------------------------------------------------------
function car(): void {
  // a mid-size sedan, typical: 4.7 m long, 1.8 wide, 1.45 high, a 2.75 m wheelbase, tyres 0.66 m across (215/55 R17)
  const s = new Seed('Car');
  const paint = s.input('paint', 'text', '#c62828', 'paint', ['#c62828', '#1565c0', '#eceff1', '#212121', '#9e9e9e', '#2e7d32', '#f9a825']);
  const body = s.n('shape.box', { name: 'car body', mat: 'steel-low', fill: 0.03, finish: 'paint', w: 4.7, h: 0.62, d: 1.8 }, 'body'); s.w(paint, 'value', body, 'color');
  const cabin = s.n('shape.extrude', { name: 'car cabin', mat: 'steel-low', fill: 0.01, finish: 'paint', profile: '-1500, 0; 1400, 0; 650, 500; -800, 520', L: 1.62 }, 'cabin (side profile)'); s.w(paint, 'value', cabin, 'color');
  const glass = s.n('shape.extrude', { name: 'car windows', mat: 'glass', fill: 0.008, color: '#1c2b33', profile: '-1380, 60; 1260, 60; 600, 450; -740, 470', L: 1.64 }, 'windows');
  const tyre = s.n('shape.cyl', { name: 'tyre', mat: 'rubber', fill: 0.13, color: '#1b1b1b', finish: 'tread', r: 0.33, h: 0.215 }, 'tyre');
  const rim = s.n('shape.cyl', { name: 'wheel rim', mat: 'al-6061', fill: 0.12, color: '#b0bec5', finish: 'brushed', r: 0.22, h: 0.22 }, 'rim');
  const wheel = s.all('wheel', [[tyre, 'part'], [rim, 'part']]);
  const side = s.n('axis', { to: 'z' }, 'wheel on its axle'); s.w(wheel, 'assembly', side, 'thing');
  const wheels = ([[1.375, 0.8], [1.375, -0.8], [-1.375, 0.8], [-1.375, -0.8]] as const).map(([x, z], i) => [s.at([side, 'turned'], { x, y: 0.33, z }, `wheel ${i + 1}`), 'placed'] as [string, string]);
  const lamp = s.n('shape.box', { name: 'headlamp', mat: 'pc', color: '#fffde7', glow: true, w: 0.05, h: 0.12, d: 0.35 }, 'headlamp');
  const tail = s.n('shape.box', { name: 'tail lamp', mat: 'pc', color: '#d50000', glow: true, w: 0.05, h: 0.1, d: 0.4 }, 'tail lamp');
  const bumper = s.n('shape.box', { name: 'bumper', mat: 'pp', fill: 0.1, color: '#263238', w: 0.12, h: 0.2, d: 1.82 }, 'bumper');
  const c = s.all('car', [
    [s.at([body, 'part'], { y: 0.55 }), 'placed'], [s.at([cabin, 'part'], { y: 0.86 }), 'placed'], [s.at([glass, 'part'], { y: 0.86 }), 'placed'], ...wheels,
    [s.at([lamp, 'part'], { x: 2.35, y: 0.7, z: 0.6 }), 'placed'], [s.at([lamp, 'part'], { x: 2.35, y: 0.7, z: -0.6 }), 'placed'],
    [s.at([tail, 'part'], { x: -2.35, y: 0.72, z: 0.6 }), 'placed'], [s.at([tail, 'part'], { x: -2.35, y: 0.72, z: -0.6 }), 'placed'],
    [s.at([bumper, 'part'], { x: 2.38, y: 0.4 }), 'placed'], [s.at([bumper, 'part'], { x: -2.38, y: 0.4 }), 'placed'],
  ]);
  s.output('car', 'assembly', c, 'assembly');
  s.save('seed.car', 'Car', 'A mid-size sedan, its middle on the ground at the origin, facing +x: body, cabin, windows, four wheels (tyre and rim), lamps and bumpers; its paint yours (4.7 × 1.8 × 1.45 m, typical)', ['vehicles', 'everyday']);
}

// ---- grass and ground ----------------------------------------------------------------------------------------------
function grass(): void {
  // a foot square (0.3048 m) of lawn: blades about 2 mm wide and 50 to 100 mm long on a skim of soil (typical of a mown lawn;
  // a real lawn has thousands of blades a square foot: these are drawn few, each standing for many)
  const s = new Seed('Grass patch');
  const blades = s.input('blades', 'number', 40, 'blades drawn'), seed = s.input('seed', 'number', 1, 'seed'), col = s.input('colour', 'text', '#5a9e3a', 'grass colour');
  const under = s.input('soil', 'text', 'soil', 'on its own soil, or on ground already there', ['soil', 'none']);
  const soil = s.n('shape.box', { name: 'soil', mat: 'soil', color: '#5d4037', w: 0.3048, h: 0.02, d: 0.3048 }, 'soil');
  const blade = s.n('shape.cone', { name: 'grass blade', mat: 'leaf', r: 0.002, h: 0.08 }, 'a blade'); s.w(col, 'value', blade, 'color');
  const up = s.at([blade, 'part'], { y: 0.04 }, 'blade standing on the soil');
  const sc = s.n('scatter', { mode: 'random', w: 0.3, d: 0.3, smin: 0.6, smax: 1.3 }, 'blades scattered'); s.w(up, 'placed', sc, 'thing'); s.w(blades, 'value', sc, 'n'); s.w(seed, 'value', sc, 'seed');
  const withSoil = s.all('grass patch', [[sc, 'scattered'], [s.at([soil, 'part'], { y: -0.01 }), 'placed']]);
  const pk = s.n('pick', { options: 'soil|none' }, 'with its soil or without'); s.w(under, 'value', pk, 'which'); s.w(withSoil, 'assembly', pk, 'soil'); s.w(sc, 'scattered', pk, 'none');
  s.output('patch', 'assembly', pk, 'chosen');
  s.save('seed.grass', 'Grass patch', 'A foot square (0.3048 m) of lawn: blades scattered on soil from a seed (each drawn blade standing for many)', ['energy', 'everyday']);
}
function terrain(): void {
  const s = new Seed('Terrain');
  const size = s.input('size', 'number', 30, 'width and depth, m', undefined, 'm'), relief = s.input('relief', 'number', 1.5, 'its highest over its lowest, m', undefined, 'm'), seed = s.input('seed', 'number', 3, 'seed');
  const cover = s.input('grass', 'text', 'grass', 'covered with', ['grass', 'bare']);
  const g = s.n('terrain', { color: '#4e7d32', cells: 48 }, 'the ground'); s.w(size, 'value', g, 'w'); s.w(size, 'value', g, 'd'); s.w(relief, 'value', g, 'relief'); s.w(seed, 'value', g, 'seed');
  const patch = s.n('seed.grass', { blades: 24, soil: 'none' }, 'a patch of grass (the ground is its soil)'); s.w(seed, 'value', patch, 'seed');
  const lawn = s.n('scatter', { mode: 'grid', step: 0.3048, turn: true }, 'patches over all of it'); s.w(patch, 'patch', lawn, 'thing'); s.w(size, 'value', lawn, 'w'); s.w(size, 'value', lawn, 'd'); s.w(g, 'ground', lawn, 'on');
  const grassy = s.all('grassed ground', [[g, 'ground'], [lawn, 'scattered']]);
  const pick = s.n('pick', { options: 'grass|bare' }, 'grassed or bare'); s.w(cover, 'value', pick, 'which'); s.w(grassy, 'assembly', pick, 'grass'); s.w(g, 'ground', pick, 'bare');
  s.output('terrain', 'assembly', pick, 'chosen');
  s.save('seed.terrain', 'Terrain of grass patches', 'Ground of hills from a seed, covered a foot square at a time with Grass patches standing on it (or bare)', ['energy', 'structural', 'everyday']);
}

// ---- roads and the lights at their crossings -----------------------------------------------------------------------
function road(): void {
  // two 3.6 m lanes (about 12 ft, typical of a US street), 150 mm kerbs, 1.5 m sidewalks; centre dashes 3 m long every
  // 12 m (10 ft dashes, 30 ft gaps: MUTCD)
  const s = new Seed('Road');
  const L = s.input('L', 'number', 60, 'length, m', undefined, 'm');
  const asphalt = s.n('shape.box', { name: 'asphalt', mat: 'asphalt', color: '#37474f', h: 0.1, d: 7.2 }, 'asphalt, two lanes'); s.w(L, 'value', asphalt, 'w');
  const walk = s.n('shape.box', { name: 'sidewalk', mat: 'concrete-c25', color: '#b0bec5', finish: 'concrete', h: 0.15, d: 1.5 }, 'sidewalk'); s.w(L, 'value', walk, 'w');
  const dash = s.n('shape.box', { name: 'centre line', mat: 'pvc', color: '#fdd835', w: 3, h: 0.005, d: 0.12 }, 'a dash');
  const n = s.f('floor(L / 12)', { L: [L, 'value'] }, 'how many dashes');
  const dashes = s.n('array', { pattern: 'line', dx: 12 }, 'dashes along it'); s.w(dash, 'part', dashes, 'thing'); s.w(n, 'result', dashes, 'n');
  const start = s.f('6 - L / 2', { L: [L, 'value'] }, 'first dash');
  const r = s.all('road', [
    [s.at([asphalt, 'part'], { y: -0.05 }), 'placed'],
    [s.at([dashes, 'row'], { x: [start, 'result'], y: 0.003 }), 'placed'],
    [s.at([walk, 'part'], { y: 0.075, z: 4.35 }), 'placed'], [s.at([walk, 'part'], { y: 0.075, z: -4.35 }), 'placed'],
  ]);
  s.output('road', 'assembly', r, 'assembly');
  s.save('seed.road', 'Road', 'A street along x: two lanes of asphalt, centre dashes, sidewalks each side; its length yours (3.6 m lanes, MUTCD dashes, typical)', ['structural', 'vehicles']);
}
function stoplight(): void {
  // a pole-mounted signal: 300 mm lenses (MUTCD 4D.07) in a head about 1.05 m tall, its middle 3.6 m up (typical)
  const s = new Seed('Stop light');
  const state = s.input('state', 'text', 'red', 'which is lit', ['red', 'yellow', 'green']);
  const pole = s.n('shape.cyl', { name: 'signal pole', mat: 'steel-low', fill: 0.15, color: '#37474f', finish: 'paint', r: 0.08, h: 3.1 }, 'pole');
  const head = s.n('shape.box', { name: 'signal head', mat: 'al-6061', fill: 0.08, color: '#263238', finish: 'paint', w: 0.36, h: 1.05, d: 0.3 }, 'head');
  const lens = (colour: string, lit: boolean) => { const id = s.n('shape.cyl', { name: `${lit ? 'lit ' : ''}lens`, mat: 'pc', color: colour, glow: lit, r: 0.15, h: 0.04 }, `${lit ? 'lit' : 'dark'} lens`); return s.n('axis', { to: 'z' }, 'lens facing out'), id; };
  const face = (id: string) => { const t = s.n('axis', { to: 'z' }, 'facing the road'); s.w(id, 'part', t, 'thing'); return t; };
  const lit = { red: face(lens('#ff1744', true)), yellow: face(lens('#ffd600', true)), green: face(lens('#00e676', true)) };
  const dark = { red: face(lens('#3e1414', false)), yellow: face(lens('#3e3414', false)), green: face(lens('#143e1e', false)) };
  const ys = { red: 3.93, yellow: 3.6, green: 3.27 } as const;
  const showing = (on: 'red' | 'yellow' | 'green') => s.all(`${on} lit`, (['red', 'yellow', 'green'] as const).map((k) => [s.at([(k === on ? lit : dark)[k], 'turned'], { y: ys[k], z: 0.17 }), 'placed'] as [string, string]));
  const pick = s.n('pick', { options: 'red|yellow|green' }, 'which is lit'); s.w(state, 'value', pick, 'which');
  for (const k of ['red', 'yellow', 'green'] as const) s.w(showing(k), 'assembly', pick, k);
  const sl = s.all('stop light', [[s.at([pole, 'part'], { y: 1.55 }), 'placed'], [s.at([head, 'part'], { y: 3.6 }), 'placed'], [pick, 'chosen']]);
  s.output('light', 'assembly', sl, 'assembly');
  s.save('seed.stoplight', 'Stop light', 'A signal on its pole, its lenses facing +z: red, yellow or green lit (300 mm lenses, typical)', ['structural', 'vehicles']);
}
function crossing(): void {
  const s = new Seed('Crossing');
  const ns = s.input('state', 'text', 'green', 'the light along x', ['red', 'yellow', 'green']);
  const other = s.input('cross', 'text', 'red', 'the light for the cross street', ['red', 'yellow', 'green']);
  const slab = s.n('shape.box', { name: 'crossing', mat: 'asphalt', color: '#37474f', w: 7.2, h: 0.1, d: 7.2 }, 'asphalt');
  const a = s.n('seed.stoplight', {}, 'light for traffic along x'); s.w(ns, 'value', a, 'state');
  const b = s.n('seed.stoplight', {}, 'light for the cross street'); s.w(other, 'value', b, 'state');
  const c = s.all('crossing', [
    [s.at([slab, 'part'], { y: -0.05 }), 'placed'],
    [s.at([a, 'light'], { x: -4.6, z: 4.6, ry: Math.PI / 2 }), 'placed'], [s.at([a, 'light'], { x: 4.6, z: -4.6, ry: -Math.PI / 2 }), 'placed'],
    [s.at([b, 'light'], { x: 4.6, z: 4.6 }), 'placed'], [s.at([b, 'light'], { x: -4.6, z: -4.6, ry: Math.PI }), 'placed'],
  ]);
  s.output('crossing', 'assembly', c, 'assembly');
  s.save('seed.crossing', 'Crossing', 'Where two streets cross: its asphalt and a stop light at each corner, one way\'s lights and the cross street\'s each as set (a signal cycle sets them both)', ['structural', 'vehicles']);
}
function roads(): void {
  const s = new Seed('Road system');
  const nx = s.input('nx', 'number', 3, 'blocks along x'), nz = s.input('nz', 'number', 3, 'blocks along z'), B = s.input('block', 'number', 60, 'block, crossing to crossing, m', undefined, 'm');
  // its lights: run by a fixed-time cycle on the clock (green 30 s, yellow 4 s, red 34 s along x, typical of a city
  // crossing: the yellow 3 to 6 s by the street's speed, ITE), or held at one you pick
  const lights = s.input('lights', 'text', 'cycle', 'its lights: on their cycle, or held', ['cycle', 'red', 'yellow', 'green']);
  const clock = s.n('time', {}, 'the clock'), cyc = s.n('cycle', { phases: 'green 30, yellow 4, red 34' }, 'signal cycle'); s.w(clock, 't', cyc, 't');
  const state = s.n('pick', { options: 'cycle|red|yellow|green' }, 'lights along x'), cross = s.n('pick', { options: 'cycle|red|yellow|green' }, 'lights across');
  s.w(lights, 'value', state, 'which'); s.w(lights, 'value', cross, 'which'); s.w(cyc, 'state', state, 'cycle'); s.w(cyc, 'cross', cross, 'cycle');
  for (const [k, other] of [['red', 'green'], ['yellow', 'red'], ['green', 'red']] as const) { s.w(C(s, k, `held ${k}`)[0], 'value', state, k); s.w(C(s, other, `then across: ${other}`)[0], 'value', cross, k); }
  const road = s.n('seed.road', {}, 'a road between crossings'); s.w(s.f('B - 7.2', { B: [B, 'value'] }), 'result', road, 'L');
  const along = s.n('array', { pattern: 'grid' }, 'roads along x'); s.w(road, 'road', along, 'thing'); s.w(nx, 'value', along, 'nx'); s.w(s.f('n + 1', { n: [nz, 'value'] }), 'result', along, 'nz'); s.w(B, 'value', along, 'sx'); s.w(B, 'value', along, 'sz');
  const turned = s.at([road, 'road'], { ry: Math.PI / 2 }, 'a road along z');
  const across = s.n('array', { pattern: 'grid' }, 'roads along z'); s.w(turned, 'placed', across, 'thing'); s.w(s.f('n + 1', { n: [nx, 'value'] }), 'result', across, 'nx'); s.w(nz, 'value', across, 'nz'); s.w(B, 'value', across, 'sx'); s.w(B, 'value', across, 'sz');
  const crossing = s.n('seed.crossing', {}, 'a crossing'); s.w(state, 'chosen', crossing, 'state'); s.w(cross, 'chosen', crossing, 'cross');
  const crossings = s.n('array', { pattern: 'grid' }, 'crossings'); s.w(crossing, 'crossing', crossings, 'thing'); s.w(s.f('n + 1', { n: [nx, 'value'] }), 'result', crossings, 'nx'); s.w(s.f('n + 1', { n: [nz, 'value'] }), 'result', crossings, 'nz'); s.w(B, 'value', crossings, 'sx'); s.w(B, 'value', crossings, 'sz');
  s.output('roads', 'assembly', s.all('road system', [[along, 'grid'], [across, 'grid'], [crossings, 'grid']]), 'assembly');
  s.save('seed.roads', 'Road system', 'Streets on a grid of blocks, nx by nz, with a crossing and its stop lights wherever two meet, the lights on their cycle as the clock runs (or held)', ['structural', 'vehicles']);
}

// ---- a neighbourhood, a city ---------------------------------------------------------------------------------------
function neighbourhood(): void {
  // blocks 60 m crossing to crossing, four house lots in each (lots about 20 m apart, typical of a suburb)
  const s = new Seed('Neighbourhood');
  const nx = s.input('nx', 'number', 2, 'blocks along x'), nz = s.input('nz', 'number', 2, 'blocks along z'), seed = s.input('seed', 'number', 1, 'seed');
  const streets = s.n('seed.roads', { block: 60 }, 'its streets'); s.w(nx, 'value', streets, 'nx'); s.w(nz, 'value', streets, 'nz');
  const lots = s.n('rows.grid', { sx: 30, sz: 30, columns: 'plan: studio|1 bed|2 bed|3 bed\nwall: #eceff1|#fff3e0|#e3f2fd|#f1f8e9|#fce4ec\nroof: #6d4c41|#455a64|#8d6e63|#37474f' }, 'a lot for each house, its plan and colours picked');
  s.w(s.f('n * 2', { n: [nx, 'value'] }), 'result', lots, 'nx'); s.w(s.f('n * 2', { n: [nz, 'value'] }), 'result', lots, 'nz'); s.w(seed, 'value', lots, 'seed');
  const houses = s.n('spawn', { seed: 'seed.house', out: 'house' }, 'its houses'); s.w(lots, 'rows', houses, 'rows');
  const drives = s.n('rows.grid', { sx: 30, sz: 30, columns: 'paint: #c62828|#1565c0|#eceff1|#212121|#9e9e9e|#2e7d32' }, 'a car for each house, its paint picked');
  s.w(s.f('n * 2', { n: [nx, 'value'] }), 'result', drives, 'nx'); s.w(s.f('n * 2', { n: [nz, 'value'] }), 'result', drives, 'nz'); s.w(s.f('s + 7', { s: [seed, 'value'] }), 'result', drives, 'seed');
  const parked = s.n('rows.shift', { dx: 7.6, dz: 2.5, dry: Math.PI / 2 }, 'each in its drive, facing the street'); s.w(drives, 'rows', parked, 'rows');
  const cars = s.n('spawn', { seed: 'seed.car' }, 'its cars'); s.w(parked, 'rows', cars, 'rows');
  // traffic: cars round the street on its edge, in the lane by the blocks, keeping 8 m front to front and stopping at
  // each crossing's line while their way is not green; 11 m/s (40 km/h, typical of a residential street)
  const traffic = s.input('traffic', 'number', 6, 'cars driving round it');
  const clock = s.n('time', {}, 'the clock');
  const ring = s.n('path.loop', { every: 60, before: 5 }, 'the lane round its edge'); s.w(s.f('n * 60', { n: [nx, 'value'] }), 'result', ring, 'w'); s.w(s.f('n * 60', { n: [nz, 'value'] }), 'result', ring, 'd');
  const drive = s.n('follow', { phases: 'green 30, yellow 4, red 34' }, 'the cars on it, at the clock\'s time'); s.w(ring, 'path', drive, 'path'); s.w(ring, 'stops', drive, 'stops'); s.w(traffic, 'value', drive, 'n'); s.w(clock, 't', drive, 't');
  const painted = s.n('rows.set', { column: 'paint', turns: true }, 'each its paint'); s.w(drive, 'rows', painted, 'rows'); s.w(C(s, '#1565c0|#eceff1|#c62828|#212121|#f9a825|#9e9e9e', 'paints')[0], 'value', painted, 'value');
  const moving = s.n('spawn', { seed: 'seed.car' }, 'the moving cars'); s.w(painted, 'rows', moving, 'rows');
  const lawn = s.n('shape.box', { name: 'lawns', mat: 'soil', color: '#558b2f', h: 0.04 }, 'lawn under it all');
  const size = s.f('n * 60 + 10', { n: [nx, 'value'] }), sizeZ = s.f('n * 60 + 10', { n: [nz, 'value'] }); s.w(size, 'result', lawn, 'w'); s.w(sizeZ, 'result', lawn, 'd');
  s.output('neighbourhood', 'assembly', s.all('neighbourhood', [[streets, 'roads'], [houses, 'things'], [cars, 'things'], [moving, 'things'], [s.at([lawn, 'part'], { y: -0.13 }), 'placed']]), 'assembly');
  s.save('seed.neighbourhood', 'Neighbourhood', 'Streets of blocks with four houses to a block, each house\'s plan and colours and the car in its drive picked from the seed (change the seed for another street), and cars driving round it, stopping at its lights, as the clock runs', ['structural', 'everyday']);
}
function city(): void {
  const s = new Seed('City');
  const n = s.input('n', 'number', 3, 'neighbourhoods each way'), seed = s.input('seed', 'number', 1, 'seed');
  const quarters = s.n('rows.grid', { sx: 130, sz: 130, columns: 'seed: 1..1000' }, 'a neighbourhood for each quarter, each its own seed');
  s.w(n, 'value', quarters, 'nx'); s.w(n, 'value', quarters, 'nz'); s.w(seed, 'value', quarters, 'seed');
  const hoods = s.n('spawn', { seed: 'seed.neighbourhood' }, 'its neighbourhoods'); s.w(quarters, 'rows', hoods, 'rows');
  s.output('city', 'assembly', hoods, 'things');
  s.save('seed.city', 'City', 'A city of neighbourhoods, n by n, each its own streets, houses and cars from its own seed', ['structural', 'everyday']);
}

// ---- a picture to a model ----------------------------------------------------------------------------------------------
function imageToModel(): void {
  // (docs/RECONSTRUCT.md: the pipeline that matched best, folded: the picture and its marks, its marks on its edges, its
  // outline dense, the model its picture is of, the camera from its wheels, the model fitted by the recipe kept
  // (BEST_RECIPE, chosen by Pipelines tried), seen again and compared, and what to ask for next)
  const s = new Seed('Picture to model');
  const id = s.input('picture', 'text', '', 'the picture (its id in view/public/photos, with its marks in photo-marks.ts)', PHOTOS.map((p) => p.id));
  const ph = s.n('photo.load', {}, 'the picture and its marks'); s.w(id, 'value', ph, 'id');
  const ft = s.n('photo.features', { r: 5 }, 'its marks on its edges'); s.w(ph, 'image', ft, 'image'); s.w(ph, 'marks', ft, 'marks');
  const ol = s.n('photo.outline', { step: 3, r: 6 }, 'its outline, dense'); s.w(ph, 'image', ol, 'image'); s.w(ft, 'features', ol, 'features');
  const car = s.n('vehicle.model', {}, 'the model it is of'); s.w(ph, 'object', car, 'model');
  const cam = s.n('camera.solve', {}, 'the camera, from its wheels'); s.w(ft, 'features', cam, 'features'); s.w(car, 'machine', cam, 'machine'); s.w(ph, 'w', cam, 'w'); s.w(ph, 'h', cam, 'h');
  const fit = s.n('fit.lines', {}, 'fitted to it'); s.w(car, 'machine', fit, 'machine'); s.w(cam, 'camera', fit, 'camera'); s.w(ol, 'features', fit, 'features'); s.w(cam, 'cameras', fit, 'cameras'); s.w(ph, 'concept', fit, 'concept');
  const ff = s.n('fit.features', {}, 'its features fitted: windows, door, flares, wing, skirts; its intake taken off the picture'); s.w(fit, 'machine', ff, 'machine'); s.w(fit, 'camera', ff, 'camera'); s.w(ph, 'traces', ff, 'traces'); s.w(ol, 'features', ff, 'features'); s.w(ph, 'concept', ff, 'concept');
  const whole = s.n('make.whole', {}, 'made whole: its details, mirrors and plates, and its critic'); s.w(ff, 'vehicle', whole, 'thing');
  const view = s.n('render.view', {}, 'seen from the picture\'s own camera'); s.w(whole, 'whole', view, 'thing'); s.w(ff, 'camera', view, 'camera');
  const pub = s.n('vehicle.model', {}, 'the car as published'); s.w(ph, 'base', pub, 'model');
  const acc = s.n('check.accuracy', {}, 'how right, four ways'); s.w(view, 'view', acc, 'view'); s.w(ph, 'image', acc, 'image'); s.w(ol, 'features', acc, 'features'); s.w(ph, 'traces', acc, 'traces'); s.w(ff, 'machine', acc, 'machine'); s.w(pub, 'machine', acc, 'published'); s.w(ph, 'concept', acc, 'concept');
  const sbs = s.n('view.compare', {}, 'side by side'); s.w(ph, 'image', sbs, 'image'); s.w(view, 'view', sbs, 'view'); s.w(ph, 'traces', sbs, 'traces');
  const ask = s.n('ask.next', {}, 'what to ask for next'); s.w(ff, 'figures', ask, 'figures'); s.w(cam, 'ambiguity', ask, 'ambiguity'); s.w(ph, 'concept', ask, 'concept');
  s.output('vehicle', 'part', whole, 'whole'); s.output('critic', 'table', whole, 'findings'); s.output('camera', 'record', ff, 'camera'); s.output('machine', 'any', ff, 'machine'); s.output('objectives', 'table', acc, 'objectives'); s.output('features', 'table', acc, 'features'); s.output('regions', 'table', acc, 'regions'); s.output('dimensions', 'table', acc, 'dimensions'); s.output('orientation', 'text', acc, 'orientation'); s.output('figures', 'table', fit, 'figures'); s.output('feature figures', 'table', ff, 'figures'); s.output('groups', 'table', ff, 'groups'); s.output('picture', 'record', sbs, 'picture'); s.output('png', 'any', sbs, 'png'); s.output('recipe', 'text', fit, 'recipe'); s.output('ask', 'text', ask, 'ask');
  s.save('seed.image-to-model', 'Picture to model', 'A picture of a thing (a photograph, or a made picture of how it is wanted) to its model: its marks laid on the picture\'s edges, its outline made dense, the model its picture is of, the camera solved from its wheels, the model\'s body lines, overhangs, stance and the camera fitted so its silhouette meets the outline both ways, by the recipe Pipelines tried found best; then its features fitted one group at a time (its windows and door, flares, wing, skirts and lips) and its intake taken off the picture onto its surface; then seen from the picture\'s own camera, the right way round, and judged four ways apart (silhouette, features, surface, dimensions), with the picture and the model side by side and what to ask for next. Nothing made until a picture is given', ['vehicles', 'manufacturing', 'science'],
    { gloss: 'What model makes this picture?', discipline: 'mechanical.design', role: 'numerical solver', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010178.10010224', label: 'Computing methodologies: computer vision' }, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }],
      model: { equations: ['minimise ½ (mean d(outline, model edge) + mean d(model edge, outline)) over its lines, overhangs, stance, details and camera, the model rendered from the camera each trial'], class: 'analytical', time: 'steady', linear: false, method: 'the recipe kept (BEST_RECIPE in reconstruct.ts): the camera\'s distance scanned, then Nelder–Mead in stages, coarse to fine', references: ['Nelder & Mead, Comput. J. 7, 308 (1965)', 'Hartley & Zisserman, Multiple View Geometry, 2nd ed. (analysis by synthesis)', 'Kass, Witkin & Terzopoulos, IJCV 1, 321 (1988) (active contours)'] } });
}

function springChecked(): void {
  // (a coil spring made from its wire and coils and put straight under its load: what it weighs, how stiff it is, and its
  // least factor of safety (wire stress, room left before its coils touch), one node to size or trade off springs by)
  const s = new Seed('Coil spring, made and loaded');
  const d = s.input('d', 'number', 0.003, 'wire diameter, m', undefined, 'm'), D = s.input('D', 'number', 0.024, 'mean coil diameter, m', undefined, 'm'), n = s.input('n', 'number', 5, 'active coils'), L = s.input('L', 'number', 0.04, 'length as fitted, m', undefined, 'm'), st = s.input('stroke', 'number', 0.008, 'compressed further by, m', undefined, 'm');
  const coil = s.n('make.coil', {}, 'the spring, made'); s.w(d, 'value', coil, 'd'); s.w(D, 'value', coil, 'D'); s.w(n, 'value', coil, 'n'); s.w(L, 'value', coil, 'L');
  const load = s.n('load.spring', {}, 'under its load'); s.w(coil, 'spring', load, 'spring'); s.w(st, 'value', load, 'stroke');
  s.output('spring', 'part', coil, 'spring'); s.output('mass', 'number', coil, 'mass', 'kg'); s.output('rate', 'number', coil, 'rate', 'N/m'); s.output('worst', 'number', load, 'worst'); s.output('checks', 'table', load, 'rows');
  s.save('seed.spring-checked', 'Coil spring, made and loaded', 'A helical compression spring made from its wire and coils (the coil maker) and put under its working stroke (Spring under load): its mass, its rate, and its least factor of safety, wire stress and coil bind among them. Folded so a fit, a trade-off or a sensitivity can move its wire and coils as one', ['mechanical'],
    { gloss: 'What does a coil spring of this wire and these coils weigh, how stiff is it, and does it hold its stroke?', discipline: 'mechanical.design', role: 'analysis', codes: [{ scheme: 'MSC2020', code: '74K10', label: 'Rods (beams, columns, shafts, arches, rings, etc.)' }],
      model: { equations: ['k = G d⁴ / (8 D³ n)', 'τ = K_B 8 F D / (π d³), K_B = (4C + 2) / (4C − 3), C = D / d'], class: 'analytical', time: 'steady', linear: false, method: 'the coil maker and Spring under load, folded', references: ['Shigley\'s Mechanical Engineering Design, 10th ed., ch. 10 (eqs. 10-5, 10-9)'] } });
}

/** Every seed, in the order each needs the ones before it. */
let made = false;
export function makeSeeds(): void {
  if (made) return; made = true;
  window_(); door(); wallSeed(); toilet(); sink(); bed(); fittingsAll(); room(); house(); car(); grass(); terrain(); road(); stoplight(); crossing(); roads(); neighbourhood(); city(); imageToModel(); springChecked();
}
makeSeeds();
