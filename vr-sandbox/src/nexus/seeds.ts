// Seeds: things built out of nodes, each folded into one node and kept in the library for good, so the next thing is
// built from it. What is left is what places nothing by hand: a coil spring made from its wire and coils and put under
// its load. The seeds that placed things by number (a window, a door, the rooms, a house, a car, the roads, a city, a
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
  n(blockId: string, set: Record<string, unknown> = {}, label?: string): string { const id = `n${this.k++}`; placeBlock(this.b, blockId, 0, 0, set, id); if (label) this.b.nodes[id]!.label = label; return id; }
  /** One of the seed's inputs: its name, type, value when not given, and the choices it may be picked from. */
  input(name: string, type: Type, def: unknown, says: string, choices?: string[], unit = ''): string { return this.n('group.in', { name, type, unit, default: String(def), choices: (choices ?? []).join('|'), says }, `in: ${name}`); }
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

/** Every seed, in the order each needs the ones before it. */
let made = false;
export function makeSeeds(): void {
  if (made) return; made = true;
  springChecked();
}
makeSeeds();
