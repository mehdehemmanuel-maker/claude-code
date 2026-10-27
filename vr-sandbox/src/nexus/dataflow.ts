// A board of blocks, run: each node a block from the library (src/nexus/blocks.ts), each wire from an output port to an
// input port, values flowing along them. The board is the same document every board is (src/nexus/boards.ts): a node
// says its block and settings, a wire says its ports, and a group holds a board inside it.
//
// It is run so the least is done: every node has a key, a hash of its block, its settings and the keys of what feeds it,
// so a node is run again only when its key changes, and two nodes with one key (the same sub-pipeline twice, a library
// block placed a thousand times with the same inputs) are run once between them, whichever board they are on. An edit
// marks what it touches; only what is downstream of it is looked at again. A list wired into a single value runs the
// block once for each item. A group runs its own board with what comes in, and is opened only when it is run or looked
// into. What a node did, how long it took and how often it failed is kept, for the person and for the engine's own
// suggestions: what is dead, what is the same twice, what wiring repeats and could be one block.

import { ALIASES, aliasSet, block, clockOf, defaultsOf, dimOf, elemOf, fits, portsOf, register, type BlockDef, type Ctx, type Outputs, type PortDef, type Ports, type Type } from './blocks';
import { edgesOf, nodesOf, uid, type Board, type BoardEdge, type BoardNode, type LiveEdge } from './boards';
import { fromSI, sameDim, toSI } from '../ganglia/units';
import type { Part } from './kits';
import type { Assembly, Placed } from './assembly';
const P_ = (name: string, type: Type): PortDef => ({ name, type });

// ---- keys -----------------------------------------------------------------------------------------------------------
/** FNV-1a over a string, two lanes, as base 36: a key, not a secret. */
export function hash(s: string): string {
  let a = 0x811c9dc5, b = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193); b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 15); }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36);
}
/** JSON with its keys in order, so two equal settings write the same. */
export function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'undefined';
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  return `{${Object.keys(v as object).sort().filter((k) => (v as Record<string, unknown>)[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
}
const boardKeys = new WeakMap<Board, string>();
/** A board's shape and settings as one key (kept on it, so a library block's board is hashed once). */
export function boardKey(b: Board): string {
  let k = boardKeys.get(b); if (k) return k;
  const ns = nodesOf(b).map((n) => n.id).sort(), es = edgesOf(b).filter(isWire).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`).sort();
  k = hash(`${ns.map((id) => { const n = b.nodes[id]!; return `${id}=${n.block}:${stable(n.set ?? {})}:${n.inner ? boardKey(n.inner) : ''}`; }).join(';')}|${es.join(';')}`);
  boardKeys.set(b, k); return k;
}
export const isWire = (e: BoardEdge): boolean => !!e.out && !!e.in;
/** Each node's wires in and out. */
export function adjacency(b: Board): { into: Map<string, LiveEdge[]>; from: Map<string, LiveEdge[]> } {
  const into = new Map<string, LiveEdge[]>(), from = new Map<string, LiveEdge[]>();
  for (const e of edgesOf(b)) { if (!isWire(e)) continue; (into.get(e.to) ?? into.set(e.to, []).get(e.to)!).push(e); (from.get(e.from) ?? from.set(e.from, []).get(e.from)!).push(e); }
  return { into, from };
}

// ---- merged blocks ---------------------------------------------------------------------------------------------------
/** A board moved on from blocks that were merged into others (`ALIASES` in blocks.ts): each such node becomes the kept
 *  block with its settings carried over, and the wires into and out of it renamed to the kept block's ports. Groups'
 *  boards too. Returns how many nodes were moved. */
export function rewire(b: Board): number {
  let n = 0;
  for (const [id, x] of Object.entries(b.nodes)) {
    if (x.inner) n += rewire(x.inner);
    const a = x.block ? ALIASES[x.block] : undefined; if (!a || !x.block) continue;
    const fwd = Object.fromEntries(Object.entries(a.ports ?? {}).map(([neu, old]) => [old, neu]));
    for (const e of Object.values(b.edges)) { if (e.from === id && e.out && fwd[e.out]) e.out = fwd[e.out]; if (e.to === id && e.in && fwd[e.in]) e.in = fwd[e.in]; }
    x.set = aliasSet(x.block, x.set ?? {}); x.block = a.to; n++;
  }
  return n;
}

// ---- what a node is -------------------------------------------------------------------------------------------------
/** The block a node is: a library block, or a group made of the board inside it. */
export function blockOf(n: BoardNode): BlockDef | null {
  if (n.inner) return groupBlock(n.inner);
  return n.block ? block(n.block) ?? null : null;
}
const groups = new WeakMap<Board, BlockDef>();
/** A board with group.in and group.out nodes, as a block: its inputs and outputs are theirs, by name. */
export function groupBlock(inner: Board, meta: Partial<BlockDef> = {}): BlockDef {
  rewire(inner);
  const kept = groups.get(inner); if (kept && !Object.keys(meta).length) return kept;
  const ports = (): Ports => {
    const ins: PortDef[] = [], outs: PortDef[] = [];
    for (const n of nodesOf(inner)) {
      const x = inner.nodes[n.id]!; if (x.block !== 'group.in' && x.block !== 'group.out') continue;
      const s = { ...defaultsOf(block(x.block)!), ...(x.set ?? {}) }, unit = String(s.unit ?? '');
      // a seed's input says what it is, what it is when not given, and what it may be picked from
      const type = String(s.type || 'any') as Type, dv = String(s.default ?? ''), choices = String(s.choices ?? '').split('|').map((c) => c.trim()).filter(Boolean);
      const def = dv === '' ? undefined : type === 'number' || type === 'integer' ? Number(dv) : type === 'boolean' ? dv === 'true' : dv;
      const p: PortDef = { name: String(s.name), type, ...(unit ? { unit } : {}), label: String(s.says || s.name), ...(def !== undefined ? { default: def, optional: true } : {}), ...(choices.length ? { choices } : {}) };
      if (x.block === 'group.in') ins.push(p); else if (x.block === 'group.out') outs.push(p);
    }
    return { inputs: ins, outputs: outs };
  };
  const b: BlockDef = { id: meta.id ?? `group.${boardKey(inner)}`, name: meta.name ?? inner.title ?? 'Group', kind: 'group', ability: 'transform', domains: meta.domains ?? ['software'], says: meta.says ?? inner.about ?? 'A pipeline folded into one block', version: 1, ports: ports(), graph: inner, pure: allPure(inner), ...(anyClock(inner) ? { clock: true } : {}), by: meta.by ?? 'you', ...meta };
  if (!Object.keys(meta).length) groups.set(inner, b);
  return b;
}
function anyClock(b: Board): boolean { return nodesOf(b).some((n) => { const x = b.nodes[n.id]!, d = blockOf(x); return !!d && clockOf(d, x.set ?? {}); }); }
function allPure(b: Board): boolean { return nodesOf(b).every((n) => { const x = b.nodes[n.id]!, d = blockOf(x); return !d || d.pure; }); }

export interface NodeState {
  status: 'ok' | 'failed' | 'waiting' | 'idle';
  out?: Outputs; error?: string;
  /** What it last took, ms, and whether that run was skipped because nothing it reads had changed. */
  ms: number; cached: boolean;
  /** How many times it ran in a list (a sweep), when it did. */
  mapped?: number;
  runs: number; fails: number; key?: string;
}
export interface Report { ran: number; cached: number; failed: number; waiting: number; ms: number; looked: number }

/** What a run may be given by the place it runs in: code run off the page, Claude, a stop. */
export interface Env { code?: Ctx['code']; ai?: Ctx['ai']; signal?: AbortSignal; /** the board's clock, s */ time?: number }
/** What every board in one place shares: outputs by key, so one key is run once wherever it is. */
export class Memo {
  private m = new Map<string, Outputs>();
  constructor(public limit = 200_000) {}
  get(k: string) { const v = this.m.get(k); if (v !== undefined) { this.m.delete(k); this.m.set(k, v); } return v; }
  set(k: string, v: Outputs) { this.m.set(k, v); if (this.m.size > this.limit) this.m.delete(this.m.keys().next().value!); }
  get size() { return this.m.size; }
  clear() { this.m.clear(); }
}
/** How often each block was used and run, and failed, and how long it took: what the library and the engine learn from. */
export const USAGE = new Map<string, { runs: number; fails: number; ms: number }>();

/**
 * A board, ready to run and to be edited. Its order and wiring are worked out once for each shape of the board, and kept
 * until a node or a wire is added or taken away; a change of settings only marks the node.
 */
export class Engine {
  state = new Map<string, NodeState>();
  private order: string[] = []; private into = new Map<string, LiveEdge[]>(); private from = new Map<string, LiveEdge[]>();
  private loop = new Set<string>(); private shaped = false;
  private maps = new Map<string, Set<string>>(); private units = new Map<string, Record<string, string>>(); private mapsStale = true; private mapsTouched = new Set<string>();
  private dirty = new Set<string>(); private all = true;
  private kids = new Map<string, Engine>();
  /** What comes into a group's board: by group.in name, its value and its key. */
  feeds: Record<string, { value: unknown; key: string }> = {};
  constructor(public board: Board, public env: Env = {}, public memo = new Memo()) { rewire(board); }

  /** The board changed shape: nodes or wires added or taken away. Everything is looked at on the next run. */
  reshape(b: Board = this.board): void { rewire(b); this.board = b; this.shaped = false; this.all = true; }
  /** The clock moved: every node that reads it (or holds one that does) is looked at on the next run, and what it feeds. */
  tick(time: number): number { this.env.time = time; let n = 0; for (const id of this.sequence) { const nd = this.board.nodes[id], b = nd && blockOf(nd); if (b && clockOf(b, nd.set ?? {})) { this.touch(id); n++; } } return n; }
  /** A node's settings changed: it, and what is downstream of it, are looked at on the next run. */
  touch(id: string): void { this.dirty.add(id); this.mapsTouched.add(id); }

  private shape(): void {
    if (this.shaped) return;
    const ns = nodesOf(this.board).map((n) => n.id).filter((id) => this.board.nodes[id]!.block || this.board.nodes[id]!.inner);
    const on = new Set(ns); this.into.clear(); this.from.clear();
    for (const id of ns) { this.into.set(id, []); this.from.set(id, []); }
    for (const e of edgesOf(this.board)) if (isWire(e) && on.has(e.from) && on.has(e.to)) { this.into.get(e.to)!.push(e); this.from.get(e.from)!.push(e); }
    // Kahn's order; what is left is in a loop
    const deg = new Map(ns.map((id) => [id, new Set(this.into.get(id)!.map((e) => e.from)).size])), q = ns.filter((id) => deg.get(id) === 0), out: string[] = [];
    for (let i = 0; i < q.length; i++) { const id = q[i]!; out.push(id); for (const t of new Set(this.from.get(id)!.map((e) => e.to))) { const d = deg.get(t)! - 1; deg.set(t, d); if (d === 0) q.push(t); } }
    this.loop = new Set(ns.filter((id) => !out.includes(id) && deg.get(id)! > 0));
    this.order = [...out, ...this.loop];
    for (const id of [...this.state.keys()]) if (!on.has(id)) { this.state.delete(id); this.kids.delete(id); }
    this.shaped = true; this.mapsStale = true;
  }
  /** The nodes in the order they run. */
  get sequence(): string[] { this.shape(); return this.order; }
  wiresInto(id: string): LiveEdge[] { this.shape(); return this.into.get(id) ?? []; }
  wiresFrom(id: string): LiveEdge[] { this.shape(); return this.from.get(id) ?? []; }

  /** A node's ports as they are on this board: a block run over a list gives lists. */
  ports(id: string): Ports {
    const n = this.board.nodes[id]; const b = n && blockOf(n); if (!b) return { inputs: [], outputs: [] };
    const p0 = portsOf(b, { ...defaultsOf(b), ...(n.set ?? {}) }), maps = this.mapsOver(id), u = this.units.get(id) ?? {};
    const p = Object.keys(u).length ? { inputs: p0.inputs, outputs: p0.outputs.map((o) => (u[o.name] ? { ...o, unit: u[o.name] } : o)) } : p0;
    if (!maps.size) return p;
    return { inputs: p.inputs, outputs: p.outputs.map((o) => ({ ...o, type: elemOf(o.type) ? o.type : (`list<${o.type}>` as Type) })) };
  }
  /** The inputs of a node that a list is wired into where it takes one value: it runs once for each item. */
  mapsOver(id: string): Set<string> {
    this.shape();
    if (this.mapsStale) { this.mapsStale = false; this.mapsTouched.clear(); this.maps.clear(); for (const x of this.order) { this.maps.set(x, this.mapsOf(x)); this.units.set(x, this.unitsOf(x)); } }
    else if (this.mapsTouched.size) { const d = this.downstream(this.mapsTouched); this.mapsTouched.clear(); for (const x of this.order) if (d.has(x)) { this.maps.set(x, this.mapsOf(x)); this.units.set(x, this.unitsOf(x)); } }
    return this.maps.get(id) ?? new Set();
  }
  /** The units its outputs take from what is wired in, where they say they do. */
  private unitsOf(id: string): Record<string, string> {
    const n = this.board.nodes[id], b = n && blockOf(n), out: Record<string, string> = {}; if (!b) return out;
    for (const o of portsOf(b, { ...defaultsOf(b), ...(n.set ?? {}) }).outputs) {
      if (o.unit || !o.unitFrom) continue;
      const w = (this.into.get(id) ?? []).find((e) => e.in === o.unitFrom); if (!w) continue;
      const src = this.board.nodes[w.from], sb = src && blockOf(src), u = this.units.get(w.from)?.[w.out!] ?? (sb ? portsOf(sb, { ...defaultsOf(sb), ...(src.set ?? {}) }).outputs.find((p) => p.name === w.out)?.unit : undefined);
      if (u) out[o.name] = u;
    }
    return out;
  }
  /** Worked out in order, so what feeds a node is known before it. */
  private mapsOf(id: string): Set<string> {
    const out = new Set<string>();
    const n = this.board.nodes[id], b = n && blockOf(n); if (!b || this.loop.has(id)) return out;
    const ins = portsOf(b, { ...defaultsOf(b), ...(n.set ?? {}) }).inputs;
    for (const e of this.wiresInto(id)) {
      const src = this.board.nodes[e.from], sb = src && blockOf(src), ip = ins.find((p) => p.name === e.in); if (!sb || !ip || ip.many) continue;
      let op = portsOf(sb, { ...defaultsOf(sb), ...(src.set ?? {}) }).outputs.find((p) => p.name === e.out);
      if (op && (this.maps.get(e.from)?.size ?? 0) && !elemOf(op.type)) op = { ...op, type: `list<${op.type}>` as Type };
      if (op && elemOf(op.type) && !elemOf(ip.type) && ip.type !== 'any' && ip.type !== 'table') out.add(ip.name);
    }
    return out;
  }

  /** Whether a wire may go from one node's output to another's input, and why not. */
  canWire(from: string, out: string, to: string, inp: string): { ok: true; map: boolean; convert?: string } | { ok: false; why: string } {
    if (from === to) return { ok: false, why: 'a block cannot feed itself' };
    const op = this.ports(from).outputs.find((p) => p.name === out), b = this.board.nodes[to] && blockOf(this.board.nodes[to]!);
    const ip = b && portsOf(b, { ...defaultsOf(b), ...(this.board.nodes[to]!.set ?? {}) }).inputs.find((p) => p.name === inp);
    if (!op || !ip) return { ok: false, why: 'no such port' };
    if (this.downstream([to]).has(from)) return { ok: false, why: 'that would make a loop: it already depends on this' };
    return fits(op, ip);
  }
  /** A node and everything it feeds, all the way down. */
  downstream(ids: Iterable<string>): Set<string> {
    this.shape(); const out = new Set<string>(), st = [...ids];
    while (st.length) { const id = st.pop()!; if (out.has(id)) continue; out.add(id); for (const e of this.from.get(id) ?? []) st.push(e.to); }
    return out;
  }

  /** Runs what has to be run: everything the first time or after a change of shape, else what was touched and what is
   *  downstream of it. Each node is run only if its key changed. */
  async run(): Promise<Report> {
    const t0 = now(); this.shape();
    const look = this.all ? null : this.downstream(this.dirty);
    this.all = false; this.dirty.clear();
    const r: Report = { ran: 0, cached: 0, failed: 0, waiting: 0, ms: 0, looked: 0 };
    for (const id of this.order) {
      if (look && !look.has(id)) continue;
      if (this.env.signal?.aborted) break;
      r.looked++; await this.step(id, r);
    }
    r.ms = now() - t0; return r;
  }
  /** Runs everything again, whatever was kept (a fresh run: what a cached run must equal). */
  async fresh(): Promise<Report> { this.state.clear(); this.kids.clear(); this.memo.clear(); this.all = true; return this.run(); }

  private async step(id: string, r: Report): Promise<void> {
    const n = this.board.nodes[id]!, b = blockOf(n), was = this.state.get(id) ?? { status: 'idle', ms: 0, cached: false, runs: 0, fails: 0 } as NodeState;
    const put = (s: Partial<NodeState>) => this.state.set(id, { ...was, ...s } as NodeState);
    if (!b) { put({ status: 'failed', error: `no block "${n.block}" in the library`, out: undefined, key: undefined }); r.failed++; return; }
    if (this.loop.has(id)) { put({ status: 'failed', error: 'in a loop: it feeds what feeds it', out: undefined, key: undefined }); r.failed++; return; }
    const set = { ...defaultsOf(b), ...(n.set ?? {}) }, ports = portsOf(b, set), wires = this.into.get(id) ?? [];
    // what comes in, and the key it all makes
    const inputs: Record<string, unknown> = {}, keys: string[] = [], missing: string[] = [];
    for (const p of ports.inputs) {
      const ws = wires.filter((e) => e.in === p.name);
      if (ws.length) {
        const vals: unknown[] = [];
        for (const w of ws.sort((a, c) => (a.from < c.from ? -1 : a.from > c.from ? 1 : 0))) {
          const s = this.state.get(w.from);
          if (!s || s.status !== 'ok' || !s.out || !(w.out! in s.out)) { missing.push(`${p.label ?? p.name} (from ${this.board.nodes[w.from]?.label || w.from}, ${s?.status === 'failed' ? 'which failed' : 'which has nothing yet'})`); continue; }
          vals.push(convert(s.out[w.out!], this.ports(w.from).outputs.find((o) => o.name === w.out)?.unit, p.unit)); keys.push(`${p.name}<${s.key}.${w.out}`);
        }
        inputs[p.name] = p.many ? vals : vals[0];
      } else if (n.set && p.name in n.set && n.set[p.name] !== '' && n.set[p.name] !== null) { inputs[p.name] = n.set[p.name]; keys.push(`${p.name}=${stable(n.set[p.name])}`); }
      else if (p.default !== undefined) { inputs[p.name] = p.default; keys.push(`${p.name}=${stable(p.default)}`); }
      else if (!p.optional) missing.push(p.label ?? p.name);
    }
    if (b.id === 'group.in') { const f = this.feeds[String(set.name)]; if (f) { set.value = f.value; keys.push(`feed=${f.key}`); } else if (!('value' in (n.set ?? {}))) missing.push(`what comes into the group as ${String(set.name)}`); }
    if (missing.length) { put({ status: 'waiting', error: `waiting on ${missing.join(', ')}`, out: undefined, key: undefined }); r.waiting++; return; }
    if (clockOf(b, set)) keys.push(`t=${this.env.time ?? 0}`);
    const key = hash(`${b.id}@${b.version}:${b.graph ? boardKey(b.graph) : ''}|${stable(set)}|${keys.join('|')}${b.pure ? '' : `#${id}`}`);
    if (was.status === 'ok' && was.key === key) { put({ cached: true }); r.cached++; return; }
    const kept = b.pure ? this.memo.get(key) : undefined;
    if (kept) { put({ status: 'ok', out: kept, key, cached: true, error: undefined }); r.cached++; return; }
    const t = now(), use = USAGE.get(b.id) ?? { runs: 0, fails: 0, ms: 0 };
    try {
      const maps = this.mapsOver(id); let out: Outputs, mapped: number | undefined;
      if (maps.size) {
        const len = Math.max(...[...maps].map((k) => (Array.isArray(inputs[k]) ? (inputs[k] as unknown[]).length : 1)));
        if (len > 1_000_000) throw new Error(`a list of ${len} items is more than one run takes (1,000,000)`);
        const rows: Outputs[] = [];
        for (let k = 0; k < len; k++) { const one = { ...inputs }; for (const m of maps) one[m] = Array.isArray(inputs[m]) ? (inputs[m] as unknown[])[k] : inputs[m]; rows.push(await this.call(id, b, one, set)); }
        out = Object.fromEntries(ports.outputs.map((p) => [p.name, rows.map((x) => x[p.name])])); mapped = len;
      } else out = await this.call(id, b, inputs, set);
      const ms = now() - t; use.runs++; use.ms += ms; USAGE.set(b.id, use);
      if (b.pure) this.memo.set(key, out);
      put({ status: 'ok', out, key, ms, cached: false, error: undefined, mapped, runs: was.runs + 1 }); r.ran++;
    } catch (e) {
      use.fails++; USAGE.set(b.id, use);
      put({ status: 'failed', error: (e as Error).message, out: undefined, key, ms: now() - t, cached: false, runs: was.runs + 1, fails: was.fails + 1 }); r.failed++;
    }
  }
  private async call(id: string, b: BlockDef, inputs: Record<string, unknown>, set: Record<string, unknown>): Promise<Outputs> {
    if (b.run) { const o = b.run(inputs, { set, code: this.env.code, ai: this.env.ai, signal: this.env.signal, time: this.env.time ?? 0 }); return o instanceof Promise ? await o : o; }
    if (!b.graph) throw new Error(`${b.name} has nothing to run`);
    // a group, or a block made of a pipeline: its own board, with what came in
    let k = this.kids.get(id); if (!k || k.board !== b.graph) { k = new Engine(b.graph, this.env, this.memo); this.kids.set(id, k); }
    k.feeds = Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, { value, key: hash(stable(value)) }]));
    k.reshape(); await k.run();
    const out: Outputs = {};
    for (const n of nodesOf(b.graph)) {
      const x: BoardNode = b.graph.nodes[n.id]!; if (x.block !== 'group.out') continue;
      const s = k.state.get(n.id), name = String(x.set?.name ?? 'y');
      if (!s || s.status !== 'ok') { const bad = [...k.state.entries()].find(([, v]) => v.status === 'failed'); throw new Error(`inside, ${bad ? `${b.graph.nodes[bad[0]]?.label || bad[0]}: ${bad[1].error}` : `${name} has nothing`}`); }
      out[name] = s.out!.value;
    }
    return out;
  }
  /** The engine running a group's board, once it has run. */
  inside(id: string): Engine | undefined { return this.kids.get(id); }
}
/** A value in one unit said in another of its kind (degrees Celsius to kelvin, amp hours to coulombs): what a wire
 *  between two units does. Lists are converted item by item; anything else passes as it is. */
export function convert(v: unknown, from?: string, to?: string): unknown {
  if (!from || !to || from === to) return v;
  const a = dimOf(from), b = dimOf(to); if (!a || !b || !sameDim(a, b)) return v;
  const one = (x: unknown) => (typeof x === 'number' ? fromSI(toSI(x, from), to) : x);
  return Array.isArray(v) ? v.map(one) : one(v);
}
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---- editing a board of blocks --------------------------------------------------------------------------------------
/** A node of a block, at a place, with its settings. */
export function placeBlock(b: Board, blockId: string, x = 0, y = 0, set: Record<string, unknown> = {}, id = uid('n')): string {
  const d = block(blockId); if (!d) throw new Error(`no block ${blockId}`);
  b.nodes[id] = { label: d.name, block: blockId, set: { ...defaultsOf(d), ...set }, x, y }; return id;
}
/** A wire from one node's output to another's input. An input that takes one wire loses the one it had. */
export function wire(b: Board, from: string, out: string, to: string, inp: string, id = uid('w')): string {
  const d = blockOf(b.nodes[to]!), many = d ? portsOf(d, { ...defaultsOf(d), ...(b.nodes[to]!.set ?? {}) }).inputs.find((p) => p.name === inp)?.many : false;
  if (!many) for (const e of edgesOf(b)) if (isWire(e) && e.to === to && e.in === inp) b.edges[e.id] = { ...b.edges[e.id]!, deleted: true };
  b.edges[id] = { from, to, rel: 'feeds', out, in: inp }; return id;
}
export const emptyBoard = (title = 'Pipeline'): Board => ({ title, kind: 'pipeline', nodes: {}, edges: {}, createdAt: Date.now(), updatedAt: Date.now() });

// ---- trees: fold, open, cut back ------------------------------------------------------------------------------------
/**
 * Folds nodes into one group node holding them: wires crossing into the selection become the group's inputs, wires
 * leaving it its outputs, each named by the port it was. What the board computes is the same before and after.
 */
export function collapse(b: Board, ids: string[], title = 'Group', gid = uid('g')): { board: Board; id: string; folded: string[] } {
  const sel = new Set(ids.filter((id) => b.nodes[id] && !b.nodes[id]!.deleted));
  if (!sel.size) throw new Error('nothing chosen to fold');
  // what lies between two chosen nodes (fed by one, feeding another) is folded with them, or the group would feed
  // what feeds it
  const { into, from } = adjacency(b), reach = (start: Iterable<string>, m: Map<string, LiveEdge[]>, end: 'to' | 'from') => { const out = new Set<string>(), st = [...start]; while (st.length) { const x = st.pop()!; for (const e of m.get(x) ?? []) { const y = e[end]; if (!out.has(y)) { out.add(y); st.push(y); } } } return out; };
  const below = reach(sel, from, 'to'), above = reach(sel, into, 'from');
  for (const id of below) if (above.has(id)) sel.add(id);
  const inner: Board = { title, kind: 'pipeline', nodes: {}, edges: {} }, outer: Board = { ...b, nodes: { ...b.nodes }, edges: { ...b.edges } };
  for (const id of sel) { inner.nodes[id] = structuredClone(b.nodes[id]!); delete outer.nodes[id]; }
  const portName = (taken: Set<string>, base: string) => { let n = base, k = 2; while (taken.has(n)) n = `${base}${k++}`; taken.add(n); return n; };
  const inNames = new Set<string>(), outNames = new Set<string>(), inBy = new Map<string, string>(), outBy = new Map<string, string>();
  const portOf = (node: BoardNode, name: string, side: 'inputs' | 'outputs') => { const d = blockOf(node); return d ? portsOf(d, { ...defaultsOf(d), ...(node.set ?? {}) })[side].find((p) => p.name === name) : undefined; };
  const xs = [...sel].map((id) => b.nodes[id]!), cx = avg(xs.map((n) => n.x ?? 0)), cy = avg(xs.map((n) => n.y ?? 0));
  let k = 0;
  for (const e of edgesOf(b)) {
    const fi = sel.has(e.from), ti = sel.has(e.to);
    if (fi && ti) { inner.edges[e.id] = { ...b.edges[e.id]! }; delete outer.edges[e.id]; continue; }
    if (!isWire(e) || (!fi && !ti)) { if (fi || ti) delete outer.edges[e.id]; continue; }
    delete outer.edges[e.id];
    if (ti) {
      // into the selection: one group input for each source port outside
      const src = `${e.from}.${e.out}`;
      let name = inBy.get(src);
      if (!name) {
        // typed as what feeds it from outside where that says more (a formula's input has no unit; the length fed to it has)
        const p = portOf(b.nodes[e.to]!, e.in!, 'inputs'), q = new Engine(b).ports(e.from).outputs.find((x) => x.name === e.out);
        name = portName(inNames, e.in!); inBy.set(src, name);
        const nid = `${gid}_in_${name}`, many = !!p?.many, type = q && q.type !== 'any' && !many ? q.type : p?.type ?? 'any';
        inner.nodes[nid] = { label: `in ${name}`, block: 'group.in', set: { name, type, unit: p?.unit || (q?.unit ?? '') }, x: cx - 260, y: cy + 90 * k++ };
        outer.edges[uid('w')] = { from: e.from, to: gid, rel: 'feeds', out: e.out, in: name };
      }
      inner.edges[uid('w')] = { from: `${gid}_in_${name}`, to: e.to, rel: 'feeds', out: 'value', in: e.in };
    } else {
      // out of the selection: one group output for each source port inside
      const src = `${e.from}.${e.out}`;
      let name = outBy.get(src);
      if (!name) {
        const p = new Engine(b).ports(e.from).outputs.find((x) => x.name === e.out) ?? portOf(b.nodes[e.from]!, e.out!, 'outputs'); name = portName(outNames, e.out!); outBy.set(src, name);
        const nid = `${gid}_out_${name}`;
        inner.nodes[nid] = { label: `out ${name}`, block: 'group.out', set: { name, type: p?.type ?? 'any', unit: p?.unit ?? '' }, x: cx + 260, y: cy + 90 * k++ };
        inner.edges[uid('w')] = { from: e.from, to: nid, rel: 'feeds', out: e.out, in: 'value' };
      }
      outer.edges[uid('w')] = { from: gid, to: e.to, rel: 'feeds', out: name, in: e.in };
    }
  }
  outer.nodes[gid] = { label: title, inner, x: cx, y: cy };
  return { board: outer, id: gid, folded: [...sel] };
}
const avg = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

/** Opens a group back into the board it sits on: its nodes as they were, its wires joined through. */
export function expand(b: Board, gid: string): Board {
  const g = b.nodes[gid]; if (!g?.inner) throw new Error('not a group');
  const inner = g.inner, out: Board = { ...b, nodes: { ...b.nodes }, edges: { ...b.edges } };
  delete out.nodes[gid];
  const rename = new Map<string, string>();
  for (const n of nodesOf(inner)) { const x = inner.nodes[n.id]!; if (x.block === 'group.in' || x.block === 'group.out') continue; const nid = out.nodes[n.id] ? uid('n') : n.id; rename.set(n.id, nid); out.nodes[nid] = structuredClone(x); }
  const ins = new Map<string, LiveEdge[]>(), outs = new Map<string, { from: string; out: string }>();
  for (const e of edgesOf(inner)) {
    const f = inner.nodes[e.from]!, t = inner.nodes[e.to]!;
    if (f.block === 'group.in') { const name = String(f.set?.name); (ins.get(name) ?? ins.set(name, []).get(name)!).push(e); continue; }
    if (t.block === 'group.out') { outs.set(String(t.set?.name), { from: rename.get(e.from)!, out: e.out! }); continue; }
    out.edges[out.edges[e.id] ? uid('w') : e.id] = { ...inner.edges[e.id]!, from: rename.get(e.from)!, to: rename.get(e.to)! };
  }
  for (const e of edgesOf(b)) {
    if (e.to === gid && isWire(e)) { delete out.edges[e.id]; for (const w of ins.get(e.in!) ?? []) out.edges[uid('w')] = { from: e.from, to: rename.get(w.to)!, rel: 'feeds', out: e.out, in: w.in }; }
    else if (e.from === gid && isWire(e)) { delete out.edges[e.id]; const s = outs.get(e.out!); if (s) out.edges[uid('w')] = { from: s.from, to: e.to, rel: 'feeds', out: s.out, in: e.in }; }
    else if (e.from === gid || e.to === gid) delete out.edges[e.id];
  }
  return out;
}

/**
 * Cuts a branch: the node and what hangs from it alone (what is fed only by what is cut). A node fed from elsewhere too
 * is unlinked and kept, and said with what keeps it. Nothing is lost that something else still needs.
 */
export function cutBranch(b: Board, root: string): { board: Board; removed: string[]; kept: { id: string; by: string[] }[] } {
  const live = new Set(nodesOf(b).map((n) => n.id)); if (!live.has(root)) throw new Error('no such node');
  const { into, from } = adjacency(b), gone = new Set([root]), st = [root];
  while (st.length) {
    const id = st.pop()!;
    for (const e of from.get(id) ?? []) if (!gone.has(e.to) && (into.get(e.to) ?? []).every((w) => gone.has(w.from))) { gone.add(e.to); st.push(e.to); }
  }
  const kept: { id: string; by: string[] }[] = [];
  for (const id of live) {
    if (gone.has(id)) continue;
    const ins = into.get(id) ?? [];
    if (ins.some((e) => gone.has(e.from))) kept.push({ id, by: [...new Set(ins.filter((e) => !gone.has(e.from)).map((e) => e.from))] });
  }
  const out: Board = { ...b, nodes: { ...b.nodes }, edges: { ...b.edges } };
  for (const id of gone) out.nodes[id] = { ...out.nodes[id]!, deleted: true };
  for (const e of edgesOf(b)) if (gone.has(e.from) || gone.has(e.to)) out.edges[e.id] = { ...out.edges[e.id]!, deleted: true };
  return { board: out, removed: [...gone], kept };
}

// ---- smarter: what is dead, what is twice, what repeats -------------------------------------------------------------
/** Nodes whose work reaches nothing: no viewer, check, action or group output is fed by them, all the way down. */
export function deadNodes(b: Board): string[] {
  const live = nodesOf(b).map((n) => n.id).filter((id) => b.nodes[id]!.block || b.nodes[id]!.inner), { into } = adjacency(b);
  const needed = new Set<string>(), st = live.filter((id) => { const d = blockOf(b.nodes[id]!); return !!d && (d.sink || d.kind === 'action' || d.kind === 'note'); });
  while (st.length) { const id = st.pop()!; if (needed.has(id)) continue; needed.add(id); for (const e of into.get(id) ?? []) st.push(e.from); }
  return live.filter((id) => !needed.has(id));
}
/** Each node's key without running it: its block, settings and what feeds it, all the way up. Two nodes with one key
 *  work out the same thing. */
export function shapeKeys(b: Board): Map<string, string> {
  const e = new Engine(b), out = new Map<string, string>();
  for (const id of e.sequence) {
    const n = b.nodes[id]!, d = blockOf(n);
    if (!d || !d.pure) { out.set(id, hash(`${id}!`)); continue; }
    const ins = e.wiresInto(id).map((w) => `${w.in}<${out.get(w.from)}.${w.out}`).sort();
    out.set(id, hash(`${d.id}@${d.version}:${d.graph ? boardKey(d.graph) : ''}|${stable({ ...defaultsOf(d), ...(n.set ?? {}) })}|${ins.join('|')}`));
  }
  return out;
}
/** Nodes that work out the same thing as another, by group: the first of each is kept by `mergeTwins`. */
export function twins(b: Board): string[][] {
  const by = new Map<string, string[]>();
  for (const [id, k] of shapeKeys(b)) { const d = blockOf(b.nodes[id]!); if (d?.sink) continue; (by.get(k) ?? by.set(k, []).get(k)!).push(id); }
  return [...by.values()].filter((g) => g.length > 1).map((g) => g.sort());
}
/** Every node that is another's twin made one: what each fed is fed by the first instead, and the rest are cut. */
export function mergeTwins(b: Board): { board: Board; merged: number } {
  const out: Board = { ...b, nodes: { ...b.nodes }, edges: { ...b.edges } }, to = new Map<string, string>();
  for (const g of twins(b)) for (const dup of g.slice(1)) to.set(dup, g[0]!);
  for (const e of edgesOf(b)) {
    if (to.has(e.to)) out.edges[e.id] = { ...out.edges[e.id]!, deleted: true };
    else if (to.has(e.from) && isWire(e)) out.edges[e.id] = { ...out.edges[e.id]!, from: to.get(e.from)! };
  }
  for (const dup of to.keys()) out.nodes[dup] = { ...out.nodes[dup]!, deleted: true };
  const merged = to.size;
  // two wires now the same (both twins fed one many-input) stay two: a sum of a and a is 2a, as it was
  return { board: out, merged };
}
export interface Pattern { blocks: string[]; wires: string; count: number; at: string[][] }
/** Wiring that repeats: the same block feeding the same block by the same ports, in so many places, over the boards
 *  given; each is a block waiting to be made. Chains of two and three. */
export function patterns(boards: Board[], least = 3): Pattern[] {
  const found = new Map<string, Pattern>();
  const add = (sig: string, blocks: string[], wires: string, at: string[]) => { const p = found.get(sig) ?? { blocks, wires, count: 0, at: [] }; p.count++; p.at.push(at); found.set(sig, p); };
  for (const b of boards) {
    const ws = edgesOf(b).filter(isWire), { from } = adjacency(b), bid = (id: string) => b.nodes[id]?.block ?? (b.nodes[id]?.inner ? 'group' : '?');
    for (const e of ws) {
      if (/^(in\.|group\.|view\.|note)/.test(bid(e.from)) || /^(group\.|note)/.test(bid(e.to))) continue;
      add(`${bid(e.from)}.${e.out}>${bid(e.to)}.${e.in}`, [bid(e.from), bid(e.to)], `${e.out} → ${e.in}`, [e.from, e.to]);
      for (const f of from.get(e.to) ?? []) if (!/^(group\.|view\.|note)/.test(bid(f.to))) add(`${bid(e.from)}.${e.out}>${bid(e.to)}.${e.in}|${f.out}>${bid(f.to)}.${f.in}`, [bid(e.from), bid(e.to), bid(f.to)], `${e.out} → ${e.in}, ${f.out} → ${f.in}`, [e.from, e.to, f.to]);
    }
  }
  return [...found.values()].filter((p) => p.count >= least).sort((a, c) => c.blocks.length * c.count - a.blocks.length * a.count);
}
export interface Suggestion { kind: 'dead' | 'twins' | 'pattern' | 'waiting'; says: string; nodes: string[]; /** For a pattern: how many nodes make one of it (the first that many are one place it is). */ size?: number }
/** What the engine would change, said plainly, each with the nodes it means. Nothing is changed by saying it. */
export function suggest(b: Board, e?: Engine): Suggestion[] {
  const out: Suggestion[] = [];
  const dead = deadNodes(b); if (dead.length) out.push({ kind: 'dead', says: `${dead.length} node${dead.length > 1 ? 's' : ''} feed${dead.length > 1 ? '' : 's'} nothing shown or checked: cut, or wire into a viewer`, nodes: dead });
  for (const g of twins(b)) out.push({ kind: 'twins', says: `${g.length} nodes work out the same (${b.nodes[g[0]!]?.label}): merge into one`, nodes: g });
  for (const p of patterns([b], 3).slice(0, 3)) out.push({ kind: 'pattern', says: `${p.blocks.map((x) => block(x)?.name ?? x).join(' → ')} is wired ${p.count} times: make it one block`, nodes: p.at.flat(), size: p.blocks.length });
  if (e) { const w = [...e.state.entries()].filter(([, s]) => s.status === 'waiting').map(([id]) => id); if (w.length) out.push({ kind: 'waiting', says: `${w.length} waiting on inputs not given`, nodes: w }); }
  return out;
}

/** A group made a library block of its own, by name: placed anywhere after like any other, its board stored once. */
export function makeBlock(b: Board, gid: string, meta: { id?: string; name: string; says?: string; domains?: string[]; by?: BlockDef['by'] }): { board: Board; block: BlockDef; duplicateOf?: string } {
  const g = b.nodes[gid]; if (!g?.inner) throw new Error('not a group');
  const id = meta.id ?? `my.${meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${boardKey(g.inner).slice(0, 6)}`;
  const d = groupBlock(g.inner, { id, name: meta.name, says: meta.says ?? `Made from a pipeline of ${nodesOf(g.inner).length} blocks`, domains: meta.domains ?? ['software'], by: meta.by ?? 'you' });
  const r = register(d), out: Board = { ...b, nodes: { ...b.nodes } };
  out.nodes[gid] = { label: meta.name, block: r.id, set: {}, x: g.x, y: g.y };
  return { board: out, block: block(r.id) ?? d, ...(r.duplicateOf ? { duplicateOf: r.duplicateOf } : {}) };
}

// ---- the spawner: one seed run for each row, each with its own sizes, choices and place ----------------------------------
/** What every seed run by a spawner has worked out, shared: rows asking the same give the very same thing. */
const SEEDS = new Memo(50_000);
/** A library block run on its own with these inputs: its outputs (a seed's whole board, run where it is needed). */
export async function runBlock(id: string, inputs: Record<string, unknown>, env: Env = {}): Promise<Outputs> {
  const b = emptyBoard(), d = block(id); if (!d) throw new Error(`no block "${id}" in the library`);
  placeBlock(b, id, 0, 0, inputs, 'it');
  const e = new Engine(b, env, SEEDS); await e.run();
  const s = e.state.get('it'); if (!s || s.status !== 'ok') throw new Error(`${d.name}: ${s?.error ?? 'did not run'}`);
  return s.out!;
}
const PLACE_COLS = new Set(['x', 'y', 'z', 'rx', 'ry', 'rz', 's']);
register({ id: 'spawn', name: 'Spawn', kind: 'generator', ability: 'generate', domains: ['everyday', 'structural', 'operations'], version: 1, by: 'built in', pure: true,
  // it moves with the clock when what it spawns does (a street of moving cars), and not otherwise
  clock: (set) => { const d = block(String(set.seed ?? '')); return !!d && clockOf(d); },
  says: 'A seed placed once for each row of a table: each row\'s x, y, z, ry (turn about y, radians) and s place it, and every other column sets the seed\'s input of that name (a house\'s plan, a car\'s paint). Rows that ask the same are worked out once and share it',
  settings: [{ key: 'seed', label: 'Seed (a library block\'s id)', type: 'text', default: 'seed.window' }, { key: 'out', label: 'Its output to place (blank: its first)', type: 'text', default: '' }],
  ports: { inputs: [P_('rows', 'table')], outputs: [P_('things', 'assembly'), P_('count', 'integer'), P_('distinct', 'integer')] },
  run: async (i, c) => {
    const id = String(c.set.seed), d = block(id); if (!d) throw new Error(`no block "${id}" in the library`);
    const ins = new Set(portsOf(d, defaultsOf(d)).inputs.map((p) => p.name)), outName = String(c.set.out || '') || portsOf(d, defaultsOf(d)).outputs.find((p) => p.type === 'assembly' || p.type === 'part')?.name;
    if (!outName) throw new Error(`${d.name} gives nothing to place`);
    const rows = (Array.isArray(i.rows) ? i.rows : []) as Record<string, unknown>[], items: Placed[] = [], made = new Map<string, Part | Assembly>();
    for (const row of rows) {
      const params: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) { if (PLACE_COLS.has(k)) continue; if (!ins.has(k)) throw new Error(`${d.name} has no input "${k}": it takes ${[...ins].join(', ') || 'nothing'}`); params[k] = v; }
      const key = stable(params); let thing = made.get(key);
      if (!thing) { const out = await runBlock(id, params, { time: c.time ?? 0 }); thing = out[outName] as Part | Assembly; if (!thing || typeof thing !== 'object') throw new Error(`${d.name} gave no ${outName}`); made.set(key, thing); }
      const n = (k: string, dflt = 0) => (typeof row[k] === 'number' ? (row[k] as number) : dflt);
      items.push({ of: thing, at: [n('x'), n('y'), n('z')], rot: [n('rx'), n('ry'), n('rz')], s: n('s', 1) });
    }
    return { things: { name: `${rows.length} × ${d.name}`, items } as Assembly, count: rows.length, distinct: made.size };
  } });
