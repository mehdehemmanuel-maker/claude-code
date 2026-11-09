// The board builder the assemblies and seeds.ts fold their boards with (AUDIT section 3; CRITIQUE-2 finding 11): a board
// made a node at a time, laid out to be read and saved as one library block. Written once here, where layOut was copied
// into seven files, Asm into four, Fold into two and SERVOS into two. Three builders for three ways of writing a board:
// Asm (robots, things, vehicles: inputs by name, outputs from one node, a build picked by a choice), Fold (everyday,
// machines: settings into inner settings, outputs from the last node, timber turned) and Seed (seeds.ts: inputs fed along
// wires, formulas, things as one). Each is what its copies were; none places by number.

import { register, type BlockDef, type Type } from '../blocks';
import { Engine, emptyBoard, groupBlock, placeBlock, wire } from '../dataflow';
import type { Board } from '../boards';

/** The servos an assembly's joint may be driven by, by their model (piece.servo's sizes). */
export const SERVOS = ['SG90', 'MG90S', 'MG996R', 'standard'];

/** How an assembly is classed: a geometry operation of computer-aided design. */
export const SPEC = { discipline: 'mechanical.design.cad', role: 'geometry operation' as const, codes: [{ scheme: 'MSC2020' as const, code: '68U07', label: 'Computer science aspects of computer-aided design' }] };

/** A board's nodes laid out to be read: each a column right of what feeds it, a row below the last in its column. */
export function layOut(b: Board): void {
  const e = new Engine(b), col = new Map<string, number>(), rows = new Map<number, number>();
  for (const id of e.sequence) col.set(id, Math.max(0, ...e.wiresInto(id).map((w) => (col.get(w.from) ?? 0) + 1)));
  for (const id of e.sequence) { const c = col.get(id)!, r = rows.get(c) ?? 0; rows.set(c, r + 1); b.nodes[id]!.x = c * 330; b.nodes[id]!.y = r * 200; }
}

/** The outputs an assembly gives: its block, the drawn thing, its piece count, what it offers, what it says. */
export const FULL: readonly (readonly [string, Type])[] = [['block', 'block'], ['thing', 'assembly'], ['pieces', 'integer'], ['offers', 'list<text>' as Type], ['says', 'text']];
/** The outputs robots.ts's assemblies give: the block, the drawn thing and what it says. */
export const SHORT: readonly (readonly [string, Type])[] = [['block', 'block'], ['thing', 'assembly'], ['says', 'text']];

/** A board being built a node at a time, saved as a library block (as seeds.ts's seeds are). `ports`, the outputs `outs`
 *  and `picked` give; `domains`, those `save` gives the block when it is given none. */
export class Asm {
  readonly b: Board; private k = 0;
  constructor(title: string, private readonly ports: readonly (readonly [string, Type])[] = FULL, private readonly domains: string[] = ['mechanical']) { this.b = emptyBoard(title); }
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
  /** The assembly's outputs, each from a node giving them all. */
  outs(from: string): void { for (const [port, type] of this.ports) this.output(port, type, from, port); }
  /** One of several builds by a choice wired from an input: each of the assembly's outputs picked. */
  picked(choice: string, label: string, builds: Record<string, string>): void {
    const options = Object.keys(builds).join('|');
    for (const [port, type] of this.ports) {
      const id = this.op(`pick_${port}`, 'pick', { options }, port === 'block' ? label : `${label}: its ${port}`, Object.fromEntries(Object.entries(builds).map(([k, n]) => [k, `${n}.${port}`])));
      this.w(choice, 'value', id, 'which'); this.output(port, type, id, 'chosen');
    }
  }
  save(id: string, name: string, says: string, gloss: string, domains: string[] = this.domains): BlockDef {
    layOut(this.b); const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, ...SPEC } }); register(d); return d;
  }
}

/** A board being built a node at a time and saved as one block, its outputs from the last node. */
export class Fold {
  readonly b: Board; private k = 0;
  constructor(title: string) { this.b = emptyBoard(title); }
  n(blockId: string, set: Record<string, unknown>, label: string, id = `n${this.k++}`): string { placeBlock(this.b, blockId, 0, 0, set, id); this.b.nodes[id]!.label = label; return id; }
  /** A setting of the block: its name, type, default, what it is, and the inner settings it sets ("node.setting; ..."). */
  set(name: string, type: Type, def: unknown, says: string, into: string, choices?: string[]): void { this.n('group.in', { name, type, unit: '', default: String(def), choices: (choices ?? []).join('|'), says, into }, `in: ${name}`); }
  /** A setting that goes in along a wire (a folded block's own settings are its inputs). */
  feed(name: string, def: unknown, says: string, to: [string, string][]): void { const id = this.n('group.in', { name, type: 'number', unit: '', default: String(def), choices: '', says }, `in: ${name}`); for (const [n, i] of to) wire(this.b, id, 'value', n, i); }
  out(name: string, type: Type, from: string, port: string): void { const id = this.n('group.out', { name, type, unit: '' }, `out: ${name}`); wire(this.b, from, port, id, 'value'); }
  /** Wires into a node: [from, its output, the input]. */
  w(to: string, ...ws: [string, string, string][]): string { for (const [f, o, i] of ws) wire(this.b, f, o, to, i); return to; }
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
    for (const [port, type] of FULL) this.out(port, type, last, port);
    layOut(this.b);
    const d = groupBlock(this.b, { id, name, says, domains, by: 'built in', spec: { gloss, ...SPEC } }); register(d); return d;
  }
}

/** A seed's board: its inputs fed along wires (or set into inner settings), formulas over named wires, things as one. */
export class Seed {
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
