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
//
// ROUTE MAP: its sections, in order (search a section's title to jump to it; read only that section):
//   · keys
//   · merged blocks
//   · what a node is
//   · editing a board of blocks
//   · trees: fold, open, cut back
//   · smarter: what is dead, what is twice, what repeats
//   · the spawner: one seed run for each row, each with its own sizes, choices and place
//   · variants of anything, none twice
//   · fit to a target (search 'fit.target'), with rangesOf and runnerOf above it
//   · what matters: which of anything's inputs move which of its outputs, and how much
//   · trade-offs: the best of anything when its goals pull against each other
//   nodes elsewhere register themselves from their owners (see the owners table in CLAUDE.md); search a node by its id

import { EVIDENCE, evidenceOf, nonphysical, rankOf, weakestOf, type EvidenceKind, type NodeEvidence } from './evidence';
import { ALIASES, aliasSet, block, clockOf, rng, defaultsOf, dimOf, elemOf, fits, portsOf, register, type BlockDef, type Ctx, type Outputs, type PortDef, type Ports, type Type } from './blocks';
import { edgesOf, nodesOf, uid, type Board, type BoardEdge, type BoardNode, type LiveEdge } from './boards';
import { fromSI, sameDim, toSI } from '../ganglia/units';
import type { Part } from './kits';
import { boundsOfAll, designOf, fromLibrary, hash, isAssembly, isPart, massOfAll, place, type Assembly, type Placed } from './assembly';
import { fitByAsync, fitByBatchAsync, minimizeAsync } from './numeric';
import { atDetailAsync } from './lod';
import { runMany, type Carry, type Job } from './pool';
const P_ = (name: string, type: Type): PortDef => ({ name, type }), PL = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });

// ---- keys -----------------------------------------------------------------------------------------------------------
// (a key's hash: assembly.ts, where the design of every piece is keyed)
export { hash };
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
  /** The weakest evidence what it gives rests on (its own, or what is wired into it), and the nodes that set it there. */
  evidence?: { kind: EvidenceKind; from: string[] };
  /** What it gives that cannot be physical (a negative mass, an efficiency over one), said, never corrected. */
  warnings?: string[];
  /** The standard uncertainty on each number it gives, in that port's unit: its own spread and what came in on its
   *  wires carried through it to first order (each source moved by its ± and the node run again; inputs from different
   *  sources taken as independent, one source feeding two inputs moved together). */
  uncertainty?: Record<string, number>;
  /** Why an uncertainty that came in could not be carried through it, when it could not. */
  uncertaintyLost?: string;
  /** The nodes that extrapolated outside where their law holds, which what it gives rests on. */
  extrapolated?: string[];
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
/** The memo every engine shares unless it is given its own: a node's outputs kept by its content key (its block and
 *  version, its settings, the keys of what came in), so a node run anywhere in the app, on any board, inside any folded
 *  one or fit, is not run again for the same. */
export const SHARED = new Memo(20_000);
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
  constructor(public board: Board, public env: Env = {}, public memo: Memo = SHARED) { rewire(board); }

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
      const unitAt = (input: string) => {
        const w = (this.into.get(id) ?? []).find((e) => e.in === input); if (!w) return undefined;
        const src = this.board.nodes[w.from], sb = src && blockOf(src);
        return this.units.get(w.from)?.[w.out!] ?? (sb ? portsOf(sb, { ...defaultsOf(sb), ...(src.set ?? {}) }).outputs.find((p) => p.name === w.out)?.unit : undefined);
      };
      // a product or a quotient of two inputs takes their units multiplied or divided ("a*b", "a/b")
      const op = /^(\w+)\s*([*/])\s*(\w+)$/.exec(o.unitFrom);
      const u = op ? unitCombined(unitAt(op[1]!), unitAt(op[3]!), op[2] as '*' | '/') : unitAt(o.unitFrom);
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
    const put = (s: Partial<NodeState>) => { const next = { ...was, ...s } as NodeState; if (next.status !== 'ok') { delete next.uncertainty; delete next.uncertaintyLost; delete next.extrapolated; delete next.warnings; } if (b && next.status === 'ok' && next.out) { try { Object.assign(next, this.judge(id, b, next.out, next.uncertainty)); } catch { /* judging what it gives never fails it */ } } this.state.set(id, next); };
    if (!b) { put({ status: 'failed', error: `no block "${n.block}" in the library`, out: undefined, key: undefined }); r.failed++; return; }
    if (this.loop.has(id)) { put({ status: 'failed', error: 'in a loop: it feeds what feeds it', out: undefined, key: undefined }); r.failed++; return; }
    const set = { ...defaultsOf(b), ...(n.set ?? {}) }, ports = portsOf(b, set), wires = this.into.get(id) ?? [];
    // what comes in, and the key it all makes
    const inputs: Record<string, unknown> = {}, keys: string[] = [], missing: string[] = [];
    // what came in uncertain: by the source that is uncertain, each input it feeds and its ± in that input's unit
    const spreadIn = new Map<string, { input: string; at?: number; du: number }[]>();
    for (const p of ports.inputs) {
      const ws = wires.filter((e) => e.in === p.name);
      if (ws.length) {
        const vals: unknown[] = [];
        for (const w of ws.sort((a, c) => (a.from < c.from ? -1 : a.from > c.from ? 1 : 0))) {
          const s = this.state.get(w.from);
          if (!s || s.status !== 'ok' || !s.out || !(w.out! in s.out)) { missing.push(`${p.label ?? p.name} (from ${this.board.nodes[w.from]?.label || w.from}, ${s?.status === 'failed' ? 'which failed' : 'which has nothing yet'})`); continue; }
          const fromUnit = this.ports(w.from).outputs.find((o) => o.name === w.out)?.unit, v = convert(s.out[w.out!], fromUnit, p.unit), u = s.uncertainty?.[w.out!];
          vals.push(v); keys.push(`${p.name}<${s.key}.${w.out}${u ? `±${u}` : ''}`);
          if (u && typeof s.out[w.out!] === 'number' && typeof v === 'number') { const src = `${w.from}.${w.out}`, du = Math.abs((convert((s.out[w.out!] as number) + u, fromUnit, p.unit) as number) - v); spreadIn.set(src, [...(spreadIn.get(src) ?? []), { input: p.name, ...(p.many ? { at: vals.length - 1 } : {}), du }]); }
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
    if (kept) { put({ status: 'ok', out: kept, key, cached: true, error: undefined, ...(await this.spreadOf(id, b, inputs, set, kept, spreadIn, ports)) }); r.cached++; return; }
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
      // (the library law: what it makes takes each piece inside a part designed whole from the library's, src/nexus/assembly.ts)
      for (const o of ports.outputs) if (/part|assembly/.test(o.type) && out[o.name] !== undefined) fromLibrary(out[o.name]);
      const spread = mapped === undefined ? await this.spreadOf(id, b, inputs, set, out, spreadIn, ports) : spreadIn.size ? { uncertainty: undefined, uncertaintyLost: 'run once for each item of a list: the uncertainty is not carried through a sweep' } : { uncertainty: undefined, uncertaintyLost: undefined };
      const ms = now() - t; use.runs++; use.ms += ms; USAGE.set(b.id, use);
      if (b.pure) this.memo.set(key, out);
      put({ status: 'ok', out, key, ms, cached: false, error: undefined, mapped, runs: was.runs + 1, ...spread }); r.ran++;
    } catch (e) {
      use.fails++; USAGE.set(b.id, use);
      put({ status: 'failed', error: (e as Error).message, out: undefined, key, ms: now() - t, cached: false, runs: was.runs + 1, fails: was.fails + 1 }); r.failed++;
    }
  }
  /** What a node's result rests on: the weakest of its own evidence and what is wired into it, and the nodes that set
   *  it; and what in it cannot be physical. */
  private judge(id: string, b: BlockDef, out: Outputs, u?: Record<string, number>): Pick<NodeState, 'evidence' | 'warnings' | 'extrapolated'> {
    const own0 = evidenceKept.get(b) ?? evidenceKept.set(b, evidenceOf(b)).get(b)!;
    // (a node may say from what it just worked out that it rests on weaker figures than it is by kind: a flow through
    // materials known only by their family)
    const said = typeof out._evidence === 'string' && (EVIDENCE as readonly string[]).includes(out._evidence) ? (out._evidence as EvidenceKind) : null;
    const own = said ? { ...own0, kind: weakestOf(own0.kind, said) } : own0;
    const ins = this.wiresInto(id).map((w) => ({ from: w.from, e: this.state.get(w.from)?.evidence })).filter((x): x is { from: string; e: { kind: EvidenceKind; from: string[] } } => !!x.e);
    const kind = weakestOf(own.kind, ...ins.map((x) => x.e.kind));
    const from = rankOf(own.kind) >= rankOf(kind) ? [id] : [...new Set(ins.filter((x) => x.e.kind === kind).flatMap((x) => x.e.from))];
    const warnings: string[] = [];
    for (const p of this.ports(id).outputs) { const w = nonphysical(p, out[p.name]); if (w) warnings.push(w); }
    // a law asked to go past where it holds says so in its status: what it gives, and all that rests on it, is marked
    const self = typeof out.status === 'string' && /extrapolated/.test(out.status);
    // what is conserved, as the node accounts it (`_balance`: one or several): judged against its own uncertainty, not a
    // fixed line: an imbalance is said only when it is more than twice its standard uncertainty (95 % covered, the
    // uncertainty the node gives, or that the engine carried onto the port it names) and more than its tolerance
    const bals = (Array.isArray(out._balance) ? out._balance : out._balance ? [out._balance] : []) as { what: string; unit?: string; in?: number; out?: number; kept?: number; d?: number; scale?: number; u?: number; tol?: number; port?: string }[];
    for (const x of bals) {
      const d = x.d ?? (x.in ?? 0) - (x.out ?? 0) - (x.kept ?? 0), scale = x.scale ?? Math.max(Math.abs(x.in ?? 0), Math.abs(x.out ?? 0) + Math.abs(x.kept ?? 0)), uu = Math.hypot(x.u ?? 0, x.port ? u?.[x.port] ?? 0 : 0), tol = (x.tol ?? 1e-9) * scale;
      if (Math.abs(d) > Math.max(2 * uu, tol)) warnings.push(`${x.what} is not conserved: ${+d.toPrecision(4)}${x.unit ? ` ${x.unit}` : ''} unaccounted for${scale ? ` (${+((100 * Math.abs(d)) / scale).toPrecision(3)} % of it)` : ''}${uu ? `, more than twice its uncertainty (± ${+uu.toPrecision(3)})` : ''}: something crossing the boundary not counted, or a model that loses it`);
    }
    if (typeof out.violation === 'string' && out.violation && !bals.length) warnings.push(out.violation);
    if (self) warnings.push(`extrapolated outside where it holds: ${typeof out.caution === 'string' ? out.caution : 'not a prediction it makes'}`);
    const past = [...new Set([...(self ? [id] : []), ...this.wiresInto(id).flatMap((w) => this.state.get(w.from)?.extrapolated ?? [])])];
    return { evidence: { kind, from }, warnings: warnings.length ? warnings : undefined, extrapolated: past.length ? past : undefined };
  }
  /** The uncertainty on what a node gives: its own spread, and each uncertain source moved by its ± (every input it
   *  feeds together) and the node run again, the half-difference its sensitivity times its ±, summed in quadrature. A
   *  first-order estimate (GUM), sources taken as independent; carried only through a node that does the same for the
   *  same inputs and nothing else (pure), else said as not carried. */
  private async spreadOf(id: string, b: BlockDef, inputs: Record<string, unknown>, set: Record<string, unknown>, out: Outputs, spreadIn: Map<string, { input: string; at?: number; du: number }[]>, ports: Ports): Promise<Pick<NodeState, 'uncertainty' | 'uncertaintyLost'>> {
    const u2: Record<string, number> = {};
    let own: Record<string, number> = {}; try { own = b.spread?.(set, out) ?? {}; } catch { /* a ± that cannot be read is no spread; the node says so when it runs */ }
    for (const [k, v] of Object.entries(own)) if (v > 0 && typeof out[k] === 'number') u2[k] = v * v;
    let lost: string | undefined;
    if (spreadIn.size) {
      if (!b.pure || !b.run) lost = `${b.pure ? 'it runs a board of its own' : 'it does not give the same for the same inputs'}: the uncertainty that came in is not carried through it`;
      else {
        const nums = ports.outputs.filter((p) => typeof out[p.name] === 'number');
        try {
          for (const [, fed] of spreadIn) {
            const moved = (sign: number) => { const x = { ...inputs }; for (const f of fed) { if (f.at === undefined) x[f.input] = (x[f.input] as number) + sign * f.du; else { const l = [...(x[f.input] as number[])]; l[f.at] = l[f.at]! + sign * f.du; x[f.input] = l; } } return this.call(id, b, x, set); };
            const hi = await moved(1), lo = await moved(-1);
            for (const p of nums) { const a = hi[p.name], z = lo[p.name]; if (typeof a === 'number' && typeof z === 'number' && Number.isFinite(a) && Number.isFinite(z)) u2[p.name] = (u2[p.name] ?? 0) + ((a - z) / 2) ** 2; }
          }
        } catch (e) { lost = `moved by its ±, it does not run (${(e as Error).message}): the uncertainty that came in is not carried through it`; }
      }
    }
    const uncertainty = Object.fromEntries(Object.entries(u2).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.sqrt(v)]));
    return { uncertainty: Object.keys(uncertainty).length ? uncertainty : undefined, uncertaintyLost: lost };
  }
  private async call(id: string, b: BlockDef, inputs: Record<string, unknown>, set: Record<string, unknown>): Promise<Outputs> {
    if (b.run) { const o = b.run(inputs, { set, code: this.env.code, ai: this.env.ai, signal: this.env.signal, time: this.env.time ?? 0 }); return o instanceof Promise ? await o : o; }
    if (!b.graph) throw new Error(`${b.name} has nothing to run`);
    // a group, or a block made of a pipeline: its own board, with what came in
    let k = this.kids.get(id); if (!k || k.board !== b.graph) { k = new Engine(b.graph, this.env, this.memo); this.kids.set(id, k); }
    return runInside(k, b.graph, inputs);
  }
  /** The engine running a group's board, once it has run. */
  inside(id: string): Engine | undefined { return this.kids.get(id); }
}
/** A value in one unit said in another of its kind (degrees Celsius to kelvin, amp hours to coulombs): what a wire
 *  between two units does. Lists are converted item by item; anything else passes as it is. */
/** Two units multiplied or divided, as a unit string the units parser reads ("N" × "m" is "N m"; "N" ÷ "mm mm" is
 *  "N/mm^2"); like factors gather into powers and cancel across the line. Undefined when neither has a unit. */
export function unitCombined(a: string | undefined, b: string | undefined, op: '*' | '/'): string | undefined {
  if (!a && !b) return undefined;
  const split = (u = '') => { const [n = '', ...d] = u.replace(/·/g, ' ').split('/'); const toks = (s: string) => s.trim().split(/\s+/).filter((t) => t && t !== '1'); return { n: toks(n), d: toks(d.join(' ')) }; };
  const x = split(a), y = split(b), exp = new Map<string, number>();
  const put = (toks: string[], sign: number) => { for (const t of toks) { const [base = t, p = '1'] = t.split('^'); exp.set(base, (exp.get(base) ?? 0) + sign * Number(p)); } };
  put(x.n, 1); put(x.d, -1); put(y.n, op === '*' ? 1 : -1); put(y.d, op === '*' ? -1 : 1);
  const at = (base: string, p: number) => (p === 1 ? base : `${base}^${+p.toFixed(6)}`), live = [...exp].filter(([, p]) => Math.abs(p) > 1e-12);
  const n = live.filter(([, p]) => p > 0), d = live.filter(([, p]) => p < 0);
  if (!live.length) return '1';
  if (!n.length) return d.map(([base, p]) => at(base, p)).join(' ');
  return n.map(([base, p]) => at(base, p)).join(' ') + (d.length ? `/${d.map(([base, p]) => at(base, -p)).join(' ')}` : '');
}
const evidenceKept = new WeakMap<BlockDef, NodeEvidence>();
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
  const d = blockOf(b.nodes[to]!), port = d ? portsOf(d, { ...defaultsOf(d), ...(b.nodes[to]!.set ?? {}) }).inputs.find((p) => p.name === inp) : undefined, many = port?.many ?? false;
  // (a wire into an input the block does not have would carry nothing and say nothing: a setting with no input of its name
  // is not wired over, so it is refused here, where it is made)
  if (d && !port && !d.graph && !['group.out', 'view.show', 'view.table', 'view.chart', 'view.gauge', 'space.show'].includes(d.id)) throw new Error(`${d.name} has no input "${inp}"`);
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
const SEEDS = SHARED;
/** A group's board run by its engine with what came in: what its outputs give. */
async function runInside(k: Engine, g: Board, inputs: Record<string, unknown>): Promise<Outputs> {
  k.feeds = Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, { value, key: hash(stable(value)) }]));
  k.reshape(); await k.run();
  const out: Outputs = {};
  for (const n of nodesOf(g)) {
    const x: BoardNode = g.nodes[n.id]!; if (x.block !== 'group.out') continue;
    const s = k.state.get(n.id), name = String(x.set?.name ?? 'y');
    if (!s || s.status !== 'ok') { const bad = [...k.state.entries()].find(([, v]) => v.status === 'failed'); throw new Error(`inside, ${bad ? `${g.nodes[bad[0]]?.label || bad[0]}: ${bad[1].error}` : `${name} has nothing`}`); }
    out[name] = s.out!.value;
  }
  return out;
}
/** A block run again and again (a fit's trials): one that runs, called; one made of a board, through one engine kept for
 *  all of them, so what the trials' values do not reach inside it is worked out once. */
export function runnerOf(d: BlockDef): (inputs: Record<string, unknown>, set: Record<string, unknown>) => Promise<Outputs> {
  if (d.run) return async (inputs, set) => { const o = d.run!(inputs, { set, time: 0 } as Ctx); return o instanceof Promise ? await o : o; };
  if (!d.graph) throw new Error(`${d.name} has nothing to run`);
  // (an input not given takes its default, as it would placed on a board: a window's frame colour when only its size moves)
  const k = new Engine(d.graph, {}), dflt = Object.fromEntries(portsOf(d, defaultsOf(d)).inputs.filter((q) => q.default !== undefined).map((q) => [q.name, q.default]));
  return (inputs) => runInside(k, d.graph!, { ...dflt, ...Object.fromEntries(Object.entries(inputs).filter(([, v]) => v !== undefined)) });
}
/** A library block run on its own with these inputs: its outputs (a seed's whole board, run where it is needed). */
export async function runBlock(id: string, inputs: Record<string, unknown>, env: Env = {}): Promise<Outputs> {
  const b = emptyBoard(), d = block(id); if (!d) throw new Error(`no block "${id}" in the library`);
  placeBlock(b, id, 0, 0, inputs, 'it');
  const e = new Engine(b, env, SEEDS); await e.run();
  const s = e.state.get('it'); if (!s || s.status !== 'ok') throw new Error(`${d.name}: ${s?.error ?? 'did not run'}`);
  return s.out!;
}
/** What is moved, each line "name lo..hi" (a value in a range), "name lo..hi int" (whole numbers) or "name a|b|c" (one of
 *  a list): a block's inputs or settings, checked against it. */
type Moved = { name: string; lo: number; hi: number; isSet: boolean; int?: boolean; opts?: string[] };
function rangesOf(t: BlockDef, set0: Record<string, unknown>, text: string): Moved[] {
  const ports = portsOf(t, set0).inputs, ins = new Set(ports.map((q) => q.name)), keysOf = new Set((t.settings ?? []).map((q) => q.key));
  // (the choices an input or a setting is picked from, where it says them: a choice not among them is refused, not tried)
  const listOf = (name: string): string[] | undefined => { const q = ports.find((x) => x.name === name), st = (t.settings ?? []).find((x) => x.key === name), g = t.graph ? Object.values(t.graph.nodes).find((n) => n.block === 'group.in' && n.set?.name === name) : undefined;
    const c = q?.choices ?? st?.choices ?? (g?.set?.choices ? String(g.set.choices).split('|').filter(Boolean) : undefined); return c?.length ? c.map(String) : undefined; };
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = /^(\S+)\s+(.+)$/.exec(l); if (!m) throw new Error(`"${l}": a line is a name and its range or its choices, as "bore 0.06..0.1", "n 3..10 int" or "wire a|b"`);
    if (!ins.has(m[1]!) && !keysOf.has(m[1]!)) throw new Error(`the ${t.name} has no input or setting "${m[1]}"`);
    const r = /^(-?[\d.eE+-]+)\s*\.\.\s*(-?[\d.eE+-]+)(\s+int)?$/.exec(m[2]!.trim()), isSet = !ins.has(m[1]!);
    if (r) return { name: m[1]!, lo: Number(r[1]), hi: Number(r[2]), isSet, ...(r[3] ? { int: true } : {}) };
    const opts = m[2]!.split('|').map((x) => x.trim()).filter(Boolean); if (opts.length < 2) throw new Error(`"${l}": choices are two or more, a | between`);
    const known = listOf(m[1]!), bad = known ? opts.filter((o) => !known.includes(o)) : []; if (bad.length) throw new Error(`the ${t.name}'s ${m[1]} is not ${bad.join(' or ')}: it is one of ${known!.join(', ')}`);
    return { name: m[1]!, lo: 0, hi: opts.length - 1, isSet, opts }; });
}
/** What a worker must be handed to run a block: nothing for one built in (each worker has the library), its board for a
 *  pipeline folded by you. */
function carryOf(t: BlockDef): { carry?: Carry } { return t.graph && t.by !== 'built in' ? { carry: { id: t.id, name: t.name, graph: t.graph, says: t.says, domains: t.domains } } : {}; }
/** A moved value at u, 0..1 across what it is moved over: a number in its range, a whole number, or one of its choices. */
function valueAt(v: Moved, u: number): number | string { if (v.opts) return v.opts[Math.min(v.opts.length - 1, Math.floor(u * v.opts.length))]!; const x = v.lo + (v.hi - v.lo) * u; return v.int ? Math.round(x) : x; }
/** The k-th point of Halton's sequence in base b: points that fill a range evenly, each new one in the biggest gap left. */
function halton(k: number, b: number): number { let f = 1, r = 0; for (let i = k; i > 0; i = Math.floor(i / b)) { f /= b; r += f * (i % b); } return r; }
register({ version: 1, by: 'built in', pure: true, id: 'fit.target', name: 'Fit to a target', kind: 'solver', ability: 'optimise', domains: ['mechanical', 'structural', 'electrical', 'vehicles', 'finance', 'everyday', 'pipelines'],
    spec: { gloss: 'What values of its inputs make any block meet its targets?', discipline: 'pipeline.search', role: 'numerical solver', codes: [{ scheme: 'MSC2020', code: '90C56', label: 'Derivative-free methods and methods using generalized derivatives' }, { scheme: 'MSC2020', code: '65K10', label: 'Numerical optimization and variational techniques' }],
      model: { equations: ['minimise Σ over its goals: ((y − t) / s)² for y = t; max(0, (t − y) / s)² for y > t, max(0, (y − t) / s)² for y < t (each × 10: a limit outweighs a wish); ± y / s₀ for least and most', 's = |t| (1 where t = 0), s₀ = |y| where it started'], class: 'analytical', time: 'steady', linear: false, method: 'each way of making its choices (a list, whole numbers) tried in turn, and within each, each value scanned over its range (7 points at once, the best kept), then Nelder–Mead within the ranges, or for three values or more (or asked) CMA-ES, its every batch run side by side (pool.ts); each value\'s ± from the cost\'s curvature (numeric.ts fitBy); with a wish (min, max) among the goals, values asked for and limits weighted 10⁵ over it', references: ['Nelder & Mead, Comput. J. 7, 308 (1965)', 'Hansen, The CMA Evolution Strategy: A Tutorial, arXiv:1604.00772 (2016)', 'Nocedal & Wright, Numerical Optimization, 2nd ed., ch. 9 (derivative-free) and 17 (penalty methods)'] } },
    says: 'Any block in the library, a law, a maker, a check, or a whole pipeline folded into one (Picture to model, a seed), run again and again with some of its inputs or settings moved within ranges, until its outputs meet the goals asked of them: one equal to a value, one kept under or over a limit, one as low or as high as it goes, several at once. The best values, each with its ± (how far it can move before the goals slip) and whether the goals fix it at all; what each output reached against its goal; and every trial. One node to size anything to what is asked of it',
    settings: [{ key: 'block', label: 'Block (its id)', type: 'text', default: 'load.engine' }, { key: 'vary', label: 'Moved, each a line: name from..to; chosen: name a|b|c, or name from..to int', type: 'code', default: 'bore 0.06..0.1' },
      { key: 'goals', label: 'Goals, each a line: output = v, output > v, output < v, output min, output max', type: 'code', default: 'floatRpm = 7000' },
      { key: 'most', label: 'At most, trials (each way of choosing)', type: 'number', default: 120 }, { key: 'combos', label: 'At most, ways of choosing', type: 'number', default: 60 }, { key: 'method', label: 'Search', type: 'choice', default: 'auto', choices: ['auto', 'one at a time (Nelder–Mead)', 'in batches (CMA-ES)'] }, { key: 'batch', label: 'Batch (CMA-ES): points at once', type: 'number', default: 8 }, { key: 'detail', label: 'Detail during its trials (1 as designed; less, faster and coarser: lod.ts)', type: 'number', default: 1 }, { key: 'blockSet', label: 'Its other settings (JSON)', type: 'code', default: '{}' }],
    ports: (st) => { const t = block(String(st.block ?? 'load.engine')), set = (() => { try { return JSON.parse(String(st.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })(), moved = new Set(String(st.vary ?? '').split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
      const ins = t ? portsOf(t, { ...defaultsOf(t), ...set }).inputs.filter((q) => !moved.has(q.name)).map((q) => ({ ...q, optional: true })) : [];
      return { inputs: ins, outputs: [PL('best', 'record', { label: 'the values found' }), PL('figures', 'table', { label: 'each value, its ± and whether it is fixed' }), PL('goals', 'table', { label: 'each goal and what it reached' }), PL('met', 'boolean', { label: 'every limit and value met' }), PL('choices', 'table', { label: 'each way of choosing, best first: what it reached' }), PL('trials', 'table'), PL('outputs', 'record', { label: 'the block\'s outputs at the best' }), PL('thing', 'assembly', { label: 'what it makes at the best' }), PL('says', 'text')] }; },
    run: async (i, c) => {
      const t = block(String(c.set.block)); if (!t || (!t.run && !t.graph)) throw new Error(`no block "${c.set.block}" that runs`);
      let set0: Record<string, unknown>; try { set0 = { ...defaultsOf(t), ...(JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>) }; } catch { throw new Error('its settings are not JSON'); }
      const all = rangesOf(t, set0, String(c.set.vary ?? '')), vary = all.filter((v) => !v.opts && !v.int).map((v) => ({ ...v, x0: (v.lo + v.hi) / 2, step: Math.abs(v.hi - v.lo) / 10 })), picks = all.filter((v) => v.opts || v.int);
      const goals = String(c.set.goals ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = /^(\S+)\s*(=|<|>|min|max)\s*(-?[\d.eE+-]+)?$/.exec(l); if (!m || ((m[2] === '=' || m[2] === '<' || m[2] === '>') && m[3] === undefined)) throw new Error(`"${l}": a goal is an output and what it should be, as "worst > 2" or "mass min"`); return { name: m[1]!, op: m[2]! as '=' | '<' | '>' | 'min' | 'max', t: Number(m[3] ?? 0) }; });
      if (!all.length || !goals.length) throw new Error('give it something to move and a goal');
      // (every way of making the choices (a list, or whole numbers), each with the values that move fitted inside it)
      const combos: (string | number)[][] = picks.reduce<(string | number)[][]>((acc, v) => acc.flatMap((a) => (v.opts ?? Array.from({ length: Math.round(v.hi) - Math.round(v.lo) + 1 }, (_, k) => Math.round(v.lo) + k)).map((o) => [...a, o])), [[]]);
      const most = Math.max(1, Math.round(Number(c.set.combos ?? 60))); if (combos.length > most) throw new Error(`${combos.length} ways of making its choices: more than ${most} (raise "at most, ways" or choose among fewer)`);
      // (each trial the block run with the values tried, a whole pipeline folded into one as well as a block that runs: its
      // outputs kept by the values, so no trial is run twice, and inside it what the values do not reach worked out once for
      // every trial (one memo for them all))
      const runT = runnerOf(t), memo = new Map<string, Record<string, unknown>>(), trials: Record<string, unknown>[] = [];
      const run = async (x: number[], pick: (string | number)[]) => { const k = [...pick, ...x.map((v) => v.toPrecision(10))].join(','); let r = memo.get(k);
        if (!r) { const inp: Record<string, unknown> = { ...i }, set = { ...set0 }; vary.forEach((v, j) => { if (v.isSet) set[v.name] = x[j]; else inp[v.name] = x[j]; }); picks.forEach((v, j) => { if (v.isSet) set[v.name] = pick[j]; else inp[v.name] = pick[j]; }); r = await runT(inp, set) as Record<string, unknown>; memo.set(k, r); }
        // (a goal may be one of the values moved itself: as high a speed as it holds)
        const all: Record<string, unknown> = { ...Object.fromEntries(vary.map((v, j) => [v.name, x[j]])), ...Object.fromEntries(picks.map((v, j) => [v.name, pick[j]])), ...r };
        for (const g of goals) if (!(g.name in all)) throw new Error(`the ${t.name} gives no "${g.name}"`); return all; };
      const first = await run(vary.map((v) => v.x0), combos[0]!), s0 = goals.map((g) => Math.abs(Number(first[g.name])) || 1);
      // (with a wish among them (as light as can be), a value asked for and a limit come first: weighted 10⁵ over it, so the
      // wish is traded for a few parts in a thousand of them at most, never for the goal itself)
      const hard = goals.some((g) => g.op === 'min' || g.op === 'max') ? 1e5 : 1;
      const miss = (g: (typeof goals)[number], y: number, j: number): number => { const s = Math.abs(g.t) || 1; return g.op === '=' ? hard * ((y - g.t) / s) ** 2 : g.op === '>' ? 10 * hard * Math.max(0, (g.t - y) / s) ** 2 : g.op === '<' ? 10 * hard * Math.max(0, (y - g.t) / s) ** 2 : (g.op === 'min' ? 1 : -1) * (y / s0[j]!); };
      const metOf = (r: Record<string, unknown>) => goals.map((g) => { const y = Number(r[g.name]), met = g.op === '=' ? Math.abs(y - g.t) <= 0.01 * (Math.abs(g.t) || 1) : g.op === '>' ? y >= g.t : g.op === '<' ? y <= g.t : true; return { goal: `${g.name} ${g.op}${g.op === 'min' || g.op === 'max' ? '' : ` ${g.t}`}`, reached: +y.toPrecision(5), met }; });
      const went = { wide: false, workers: 0, method: 'Nelder–Mead' };
      const fitOne = async (pick: (string | number)[]) => {
        const cost = async (x: number[]) => { const r = await run(x, pick); let sum = 0; goals.forEach((g, j) => { const y = Number(r[g.name]); sum += Number.isFinite(y) ? miss(g, y, j) : 1e6; });
          trials.push({ ...Object.fromEntries(picks.map((v, j) => [v.name, pick[j]])), ...Object.fromEntries(vary.map((v, j) => [v.name, +x[j]!.toPrecision(5)])), ...Object.fromEntries(goals.map((g) => [g.name, Number(r[g.name])])), cost: +sum.toPrecision(5) }); return sum; };
        if (!vary.length) { const cc = await cost([]); return { f: { x: [], before: cc, after: cc, pm: [], fixed: [], evaluations: 1 }, cost: cc }; }
        // (many points worked out at once: those not yet run handed to the pool together, side by side where that pays)
        const costs = async (xs: number[][]): Promise<number[]> => { const todo = new Map<string, number[]>(); for (const x of xs) { const k = [...pick, ...x.map((v) => v.toPrecision(10))].join(','); if (!memo.has(k)) todo.set(k, x); }
          if (todo.size > 1) { const keys = [...todo.keys()], jobs: Job[] = [...todo.values()].map((x) => { const inp: Record<string, unknown> = { ...i }, set = { ...set0 }; vary.forEach((v, j) => { if (v.isSet) set[v.name] = x[j]; else inp[v.name] = x[j]; }); picks.forEach((v, j) => { if (v.isSet) set[v.name] = pick[j]; else inp[v.name] = pick[j]; }); return { block: t.id, inputs: inp, set }; });
            const b = await runMany(jobs, (j) => runT(j.inputs, j.set), carryOf(t)); if (b.wide) { went.wide = true; went.workers = b.workers; } b.results.forEach((o, n) => { if (!(o instanceof Error)) memo.set(keys[n]!, o as Record<string, unknown>); }); }
          const out: number[] = []; for (const x of xs) out.push(await cost(x)); return out; };
        // (each value scanned over its range first, the best of seven kept, the seven at once: a fit starts in the deepest
        // valley it can see, not the nearest; a lesson from fitting a camera)
        const x = vary.map((v) => v.x0);
        await atDetailAsync(Number(c.set.detail ?? 1), async () => { for (let j = 0; j < vary.length; j++) { const ys = Array.from({ length: 7 }, (_, k) => { const y = x.slice(); y[j] = vary[j]!.lo + ((vary[j]!.hi - vary[j]!.lo) * k) / 6; return y; }), cc = await costs(ys); x[j] = ys[cc.indexOf(Math.min(...cc))]![j]!; } });
        // (its ± how far each can move before a goal slips by 1 % of itself: a miss of 1 % costs 0.0001)
        // (in batches (CMA-ES, every batch side by side) or one point at a time (Nelder–Mead): asked, or by itself, batches for
        // three values or more, where one at a time is slower to find its way and more often stuck in a near valley)
        const batched = c.set.method === 'in batches (CMA-ES)' || (c.set.method !== 'one at a time (Nelder–Mead)' && vary.length >= 3);
        if (batched) went.method = 'CMA-ES';
        const f = batched ? await atDetailAsync(Number(c.set.detail ?? 1), () => fitByBatchAsync(costs, vary.map((v) => ({ ...v, lo: Math.min(v.lo, v.hi), hi: Math.max(v.lo, v.hi) })), { x0: x, most: Number(c.set.most ?? 120), ftol: 1e-8, rise: 1e-4 * hard, batch: Math.max(4, Number(c.set.batch ?? 8)) }))
          : await atDetailAsync(Number(c.set.detail ?? 1), () => fitByAsync(cost, vary.map((v) => ({ ...v, lo: Math.min(v.lo, v.hi), hi: Math.max(v.lo, v.hi) })), { x0: x, most: Number(c.set.most ?? 120), ftol: 1e-8, rise: 1e-4 * hard }));
        return { f, cost: f.after };
      };
      type Tried = { pick: (string | number)[]; f: { x: number[]; pm: number[]; fixed: boolean[] }; cost: number; r: Record<string, unknown>; rows: ReturnType<typeof metOf> };
      const tried: Tried[] = []; let wide = '';
      if (combos.length > 1) {
        // (several ways of choosing: each its own fit (this node again, its choices made), run at once, side by side where
        // that pays (pool.ts); with nothing left to fit, the block itself run with each)
        const extra = (() => { try { return JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })(), self = block('fit.target')!;
        const jobs: Job[] = combos.map((pick) => { const inp: Record<string, unknown> = { ...i }, bs: Record<string, unknown> = { ...extra }; picks.forEach((v, j) => { if (v.isSet) bs[v.name] = pick[j]; else inp[v.name] = pick[j]; });
          return vary.length ? { block: 'fit.target', inputs: inp, set: { ...c.set, vary: vary.map((v) => `${v.name} ${v.lo}..${v.hi}`).join('\n'), blockSet: JSON.stringify(bs) } } : { block: t.id, inputs: inp, set: { ...set0, ...bs } }; });
        const batch = await runMany(jobs, (j) => (vary.length ? Promise.resolve(self.run!(j.inputs, { set: j.set, time: 0 } as Ctx)) : runT(j.inputs, j.set)), carryOf(t));
        if (batch.wide) wide = ` (side by side on ${batch.workers} workers, ${(batch.ms / 1000).toFixed(1)} s)`;
        batch.results.forEach((o, n) => { if (o instanceof Error) throw new Error(`choosing ${picks.map((v, j) => `${v.name} ${combos[n]![j]}`).join(', ')}: ${o.message}`);
          const sub = o as Record<string, unknown>, r = (vary.length ? sub.outputs : sub) as Record<string, unknown>, fig = (sub.figures ?? []) as { pm: number | string; fixed: boolean }[], rows = metOf(r);
          if (vary.length) for (const q of (sub.trials ?? []) as Record<string, unknown>[]) trials.push({ ...Object.fromEntries(picks.map((v, j) => [v.name, combos[n]![j]])), ...q });
          tried.push({ pick: combos[n]!, f: { x: vary.map((v) => Number((sub.best as Record<string, unknown> | undefined)?.[v.name])), pm: fig.map((q) => (typeof q.pm === 'number' ? q.pm : Infinity)), fixed: fig.map((q) => q.fixed) }, cost: goals.reduce((sum, g, j) => { const y = Number(r[g.name]); return sum + (Number.isFinite(y) ? miss(g, y, j) : 1e6); }, 0), r, rows }); });
      } else {
        const o = await fitOne(combos[0]!); tried.push({ pick: combos[0]!, f: o.f, cost: o.cost, r: {}, rows: [] });
        // (the answer run again as designed, whatever detail its trials were run at: what it reaches is what is said)
        memo.clear(); for (const q of tried) { q.r = await run(q.f.x, q.pick); q.rows = metOf(q.r); }
      }
      // (the best the one meeting every goal at the least cost, else the least cost)
      const ranked = [...tried].sort((a, b) => Number(b.rows.every((q) => q.met)) - Number(a.rows.every((q) => q.met)) || a.cost - b.cost), top = ranked[0]!, f = top.f, r = top.r, rows = top.rows, met = rows.every((q) => q.met);
      // (each way of choosing: what was chosen, whether it does what is asked, what it reached (its wishes first, what differs
      // most between them), then the values fitted inside it)
      const order = [...goals.keys()].sort((a, b) => Number(goals[b]!.op === 'min' || goals[b]!.op === 'max') - Number(goals[a]!.op === 'min' || goals[a]!.op === 'max'));
      const choices = picks.length ? ranked.map((q) => ({ ...Object.fromEntries(picks.map((v, j) => [v.name, q.pick[j]])), met: q.rows.every((g) => g.met) ? 'yes' : 'no', ...Object.fromEntries(order.map((k) => [q.rows[k]!.goal, q.rows[k]!.reached])), ...Object.fromEntries(vary.map((v, j) => [v.name, +q.f.x[j]!.toPrecision(4)])), cost: +q.cost.toPrecision(4) })) : [];
      const made = Object.values(r).find((v) => isPart(v) || isAssembly(v)) as Part | Assembly | undefined;
      return { best: { ...Object.fromEntries(picks.map((v, j) => [v.name, top.pick[j]])), ...Object.fromEntries(vary.map((v, j) => [v.name, f.x[j]!])) }, figures: vary.map((v, j) => ({ value: v.name, found: +f.x[j]!.toPrecision(5), pm: Number.isFinite(f.pm[j]!) ? +f.pm[j]!.toPrecision(3) : 'unbounded', fixed: f.fixed[j]!, range: `${v.lo}..${v.hi}` })), goals: rows, met, choices, trials, outputs: r, ...(made ? { thing: isAssembly(made) ? made : { name: made.name, items: [place(made, [0, 0, 0])] } } : {}),
        says: `${t.name}: ${[...picks.map((v, j) => `${v.name} ${top.pick[j]}`), ...vary.map((v, j) => `${v.name} ${+f.x[j]!.toPrecision(4)}`)].join(', ')}${picks.length ? ` (best of ${combos.length} ways of choosing${wide}${ranked[1] ? `; next ${picks.map((v, j) => `${v.name} ${ranked[1]!.pick[j]}`).join(', ')}${ranked[1]!.rows.every((g) => g.met) ? '' : ', missing a goal'}` : ''})` : ''} after ${trials.length} runs (${went.method}${went.wide ? `, its ${went.method === 'CMA-ES' ? 'batches' : 'first scan'} side by side on ${went.workers} workers` : ''}); ${met ? 'every goal met' : `not met: ${rows.filter((q) => !q.met).map((q) => `${q.goal} (reached ${q.reached})`).join(', ')}`}${f.fixed.some((fx) => !fx) ? `; not fixed by these goals: ${vary.filter((_, j) => !f.fixed[j]).map((v) => v.name).join(', ')}` : ''}` };
    },
    // (a bar's area found so its stress is 2 MPa under 5 kN: 0.0025 m²)
    tests: [{ set: { block: 'law.stress.axial', vary: 'A 0.0005..0.01', goals: 'sigma = 2e6', most: 80 }, inputs: { F: 5000 }, outputs: { met: true, best: { A: 0.0025 } }, rel: 0.01 },
      // (a 40 kN/m spring as light as can be, safe 1.3 times over: music wire's stiffness and strength let it do it in three coils)
      // (the same bar's area found in batches (CMA-ES))
      { set: { block: 'law.stress.axial', vary: 'A 0.0005..0.01', goals: 'sigma = 2e6', most: 120, method: 'in batches (CMA-ES)' }, inputs: { F: 5000 }, outputs: { met: true, best: { A: 0.0025 } }, rel: 0.01 },
      { set: { block: 'seed.spring-checked', vary: 'wire music-wire-a228|hard-drawn-a227|stainless-302-a313\nd 0.002..0.005\nn 3..5 int', goals: 'rate = 40000\nworst > 1.3\nmass min', most: 60 }, inputs: {}, outputs: { met: true, best: { wire: 'music-wire-a228', n: 3 } } }] } as BlockDef);

// ---- variants of anything, none twice ------------------------------------------------------------------------------------
/** One seed for each variant and each draw, its parts mixed (an integer hash, Wellons' lowbias32) so neighbouring
 *  variants' streams are unrelated: Park–Miller's first draws follow neighbouring seeds almost in step. */
function mixSeed(seed: number, k: number, d: number): number {
  let x = (Math.imul(Math.round(seed), 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca77) ^ Math.imul(d + 1, 0xc2b2ae3d)) >>> 0;
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d) >>> 0; x ^= x >>> 15; x = Math.imul(x, 0x846ca68b) >>> 0; x ^= x >>> 16; return (x >>> 0) + 1;
}
/** A drawn variant's identity: what it made, each thing by its design (the built-parts library's key) and its colours, each
 *  number to seven figures, each word as it is; and its design alone, its looks left out. */
function identityOf(out: Outputs): { all: string; design: string } {
  const looks = (t: unknown, acc: number[]): number[] => { if (isAssembly(t)) t.items.forEach((it) => looks(it.of, acc)); else if (isPart(t)) { if (t.color !== undefined) acc.push(t.color); t.parts?.forEach((q) => looks(q, acc)); } return acc; };
  const des: Record<string, unknown> = {}, all: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(out)) {
    if (isPart(v) || isAssembly(v)) { const d = designOf(v).key; des[k] = d; all[k] = [d, looks(v, [])]; }
    else if (Array.isArray(v) && v.some((x) => isPart(x) || isAssembly(x))) { const ds = v.map((x) => (isPart(x) || isAssembly(x) ? designOf(x).key : x)); des[k] = ds; all[k] = [ds, v.map((x) => looks(x, []))]; }
    else if (typeof v === 'number') all[k] = Number.isFinite(v) ? Number(v.toPrecision(7)) : String(v);
    else if (typeof v !== 'function' && typeof v !== 'object') all[k] = v;
  }
  return { all: hash(stable(all)), design: hash(stable(des)) };
}
register({ version: 1, by: 'built in', pure: true, id: 'variants', name: 'Variants of anything (none twice)', kind: 'generator', ability: 'generate', domains: ['everyday', 'structural', 'vehicles', 'mechanical', 'manufacturing', 'pipelines'],
  spec: { gloss: 'Many different versions of anything, each from its seed, none the same as another', discipline: 'pipeline.search', role: 'data source', codes: [{ scheme: 'MSC2020', code: '65C10', label: 'Random number generation in numerical analysis' }, { scheme: 'MSC2020', code: '68P05', label: 'Data structures' }],
    model: { equations: ['each variant k: each moved value drawn from its range or its list by the seeded stream of seed + k (Park–Miller)', 'two variants the same when what they made hashes the same: things by their design and colours, numbers to seven figures'], class: 'analytical', time: 'steady', linear: false, references: ['Park & Miller, Random number generators: good ones are hard to find, CACM 31, 1192 (1988)'] } },
  says: 'Any block, or any pipeline folded into one, made again and again with some of its inputs or settings drawn from ranges or lists by seed: a window\'s width and frame, a house\'s plan and paint, a car\'s colour and wheels. What each made is compared by what it is (its design, the built-parts library\'s key, and its colours, not its seed), and one the same as one before is drawn again, so no two are alike, and says how many really differ: in design, and in look. The same seed, the same set',
  settings: [{ key: 'block', label: 'Block (its id)', type: 'text', default: 'seed.window' }, { key: 'vary', label: 'Drawn, each a line: name lo..hi, name lo..hi int, or name a|b|c', type: 'code', default: 'w 0.6..1.8\nh 0.8..1.6\nframe #f4f4f2|#2b2b2b|#7a4a2a' },
    { key: 'count', label: 'How many', type: 'number', default: 12 }, { key: 'seed', label: 'Seed', type: 'number', default: 1 }, { key: 'tries', label: 'Draws allowed for each, to find one not made before', type: 'number', default: 20 }, { key: 'blockSet', label: 'Its other settings (JSON)', type: 'code', default: '{}' }],
  ports: (st) => { const t = block(String(st.block ?? 'seed.window')), set = (() => { try { return JSON.parse(String(st.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })(), moved = new Set(String(st.vary ?? '').split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
    const ins = t ? portsOf(t, { ...defaultsOf(t), ...set }).inputs.filter((q) => !moved.has(q.name)).map((q) => ({ ...q, optional: true })) : [];
    return { inputs: ins, outputs: [PL('rows', 'table', { label: 'each variant: what was drawn, and what it made' }), PL('things', 'list<assembly>', { label: 'what each made (its first thing)' }), PL('laid', 'assembly', { label: 'them all in a row, a little apart' }), PL('distinct', 'integer', { label: 'different in what they are' }), PL('designs', 'integer', { label: 'different in design (their looks left out)' }), PL('repeats', 'integer', { label: 'the same as one before after every draw' }), PL('says', 'text')] }; },
  run: async (i, c) => {
    const t = block(String(c.set.block)); if (!t || (!t.run && !t.graph)) throw new Error(`no block "${c.set.block}" that runs`);
    let set0: Record<string, unknown>; try { set0 = { ...defaultsOf(t), ...(JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>) }; } catch { throw new Error('its settings are not JSON'); }
    const ins = new Set(portsOf(t, set0).inputs.map((q) => q.name)), keysOf = new Set((t.settings ?? []).map((q) => q.key));
    const vary = String(c.set.vary ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = /^(\S+)\s+(.+)$/.exec(l); if (!m) throw new Error(`"${l}": a line is a name and what it is drawn from`);
      const name = m[1]!, what = m[2]!.trim(), r = /^(-?[\d.eE+-]+)\s*\.\.\s*(-?[\d.eE+-]+)(\s+int)?$/.exec(what); if (!ins.has(name) && !keysOf.has(name)) throw new Error(`the ${t.name} has no input or setting "${name}"`);
      return { name, isSet: !ins.has(name), lo: r ? Number(r[1]) : 0, hi: r ? Number(r[2]) : 0, int: !!r?.[3], opts: r ? null : what.split('|').map((x) => x.trim()).filter(Boolean) }; });
    if (!vary.length) throw new Error('give it something to draw');
    const runT = runnerOf(t), n = Math.max(1, Math.min(500, Math.round(Number(c.set.count ?? 12)))), seed = Number(c.set.seed ?? 1), tries = Math.max(1, Math.round(Number(c.set.tries ?? 20)));
    const seen = new Set<string>(), designs = new Set<string>(), rows: Record<string, unknown>[] = [], things: (Part | Assembly)[] = []; let repeats = 0, draws = 0;
    const drawn = (k: number, d: number) => { const r = rng(mixSeed(seed, k, d)), vals = Object.fromEntries(vary.map((v) => { const x = v.opts ? v.opts[Math.floor(r() * v.opts.length)] : v.lo + (v.hi - v.lo) * r(); return [v.name, v.int && typeof x === 'number' ? Math.round(x) : typeof x === 'number' ? Number(x.toPrecision(4)) : x]; }));
      const inp: Record<string, unknown> = { ...i }, set = { ...set0 }; for (const v of vary) { if (v.isSet) set[v.name] = vals[v.name]; else inp[v.name] = vals[v.name]; } return { vals, job: { block: t.id, inputs: inp, set } as Job }; };
    // (each variant's first draw made at once, side by side where that pays (pool.ts); a draw the same as one before drawn
    // again after, one at a time)
    const firsts = Array.from({ length: n }, (_, k) => drawn(k, 0)), batch = await runMany(firsts.map((f) => f.job), (j) => runT(j.inputs, j.set), carryOf(t));
    for (let k = 0; k < n; k++) {
      let got: { vals: Record<string, unknown>; out: Outputs; id: { all: string; design: string } } | null = null;
      for (let d = 0; d < tries; d++) {
        const { vals, job } = d === 0 ? firsts[k]! : drawn(k, d), was = d === 0 ? batch.results[k]! : undefined; if (was instanceof Error) throw was;
        const out = was ?? await runT(job.inputs, job.set); draws++; const id = identityOf(out); got = { vals, out, id }; if (!seen.has(id.all)) break;
      }
      const { vals, out, id } = got!; if (seen.has(id.all)) repeats++; seen.add(id.all); designs.add(id.design);
      const th = Object.values(out).find((v) => isPart(v) || isAssembly(v)) as Part | Assembly | undefined; if (th) things.push(th);
      rows.push({ variant: k + 1, ...vals, ...Object.fromEntries(Object.entries(out).filter(([, v]) => typeof v === 'number').map(([key, v]) => [key, +(v as number).toPrecision(5)])), is: id.all.slice(0, 8) });
    }
    // (in a row along x, each a tenth of its width apart, standing on y = 0: what a person looks along to see them differ)
    let x = 0; const items: Placed[] = things.map((th) => { const b = boundsOfAll(th), w = b.isEmpty() ? 1 : b.max.x - b.min.x, at: [number, number, number] = [x - (b.isEmpty() ? 0 : b.min.x), b.isEmpty() ? 0 : -b.min.y, 0]; x += w * 1.1; return place(th, at); });
    const laid: Assembly = { name: `${t.name}: ${n} variants`, items: items.map((it) => ({ ...it, at: [it.at[0] - x / 2, it.at[1], it.at[2]] as [number, number, number] })) };
    return { rows, things, laid, distinct: seen.size, designs: designs.size, repeats,
      says: `${n} variants of the ${t.name} from seed ${seed} (${draws} drawn${batch.wide ? `, the first of each side by side on ${batch.workers} workers` : ''}): ${seen.size} different in what they are, ${designs.size} in design${repeats ? `; ${repeats} could not be made different in ${tries} draws (what is drawn from is too small)` : ''}` };
  },
  // (five bars, each its own load: five stresses, none twice)
  tests: [{ set: { block: 'law.stress.axial', vary: 'F 1000..5000', count: 5, seed: 1 }, inputs: { A: 0.001 }, outputs: { distinct: 5, repeats: 0 } }] } as BlockDef);

// ---- what matters: which of anything's inputs move which of its outputs, and how much ------------------------------------
register({ version: 1, by: 'built in', pure: true, id: 'what.matters', name: 'Sensitivity (elementary effects)', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural', 'electrical', 'vehicles', 'finance', 'everyday', 'pipelines'],
  spec: { gloss: 'Which of its inputs move any block\'s outputs, by how much, and which act together or bend?', discipline: 'pipeline.sensitivity', role: 'numerical solver', codes: [{ scheme: 'MSC2020', code: '62K15', label: 'Factorial statistical designs' }, { scheme: 'MSC2020', code: '65C05', label: 'Monte Carlo methods' }],
    model: { equations: ['each value x_j scaled to u_j in 0..1 over its range; a path of k + 1 runs from a drawn start on a 4-level grid, each step moving one value by Δ = 2/3', 'its effect there EE_j = (y(u + Δ e_j) − y(u)) / Δ: y\'s change for the whole range of x_j', 'μ*_j = mean |EE_j| (how much it moves y), σ_j = their spread (it bends y or acts with another), over r paths'], class: 'analytical', time: 'steady', linear: false,
      method: 'Morris\'s elementary effects with Campolongo\'s μ*: r (k + 1) runs, each run once whatever asks it again', references: ['Morris, Factorial sampling plans for preliminary computational experiments, Technometrics 33, 161 (1991)', 'Campolongo, Cariboni & Saltelli, An effective screening design for sensitivity analysis of large models, Environ. Model. Softw. 22, 1509 (2007)', 'Saltelli et al., Global Sensitivity Analysis: The Primer, Wiley (2008), ch. 3'] } },
  says: 'Any block in the library, or a whole pipeline folded into one, run along paths that move its inputs or settings one at a time across their ranges: for each output, each value ranked by how much it moves it over its whole range, whether it does so straight or bent (or only together with another), and what does nothing at all. What to fit, what to fix, what to leave alone, before spending a run on it',
  settings: [{ key: 'block', label: 'Block (its id)', type: 'text', default: 'load.engine' }, { key: 'vary', label: 'Moved, each a line: name from..to; chosen: name a|b|c, or name from..to int', type: 'code', default: 'bore 0.07..0.09\nstroke 0.07..0.1\nrpm 3000..7000' },
    { key: 'watch', label: 'Outputs watched (by name, a space between; a thing by its mass, width, height, depth as thing.mass; blank: every number it gives and every thing measured)', type: 'text', default: 'floatRpm worst' }, { key: 'paths', label: 'Paths (r)', type: 'number', default: 10 }, { key: 'seed', label: 'Seed', type: 'number', default: 1 }, { key: 'blockSet', label: 'Its other settings (JSON)', type: 'code', default: '{}' }],
  ports: (st) => { const t = block(String(st.block ?? 'load.engine')), set = (() => { try { return JSON.parse(String(st.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })(), moved = new Set(String(st.vary ?? '').split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
    const ins = t ? portsOf(t, { ...defaultsOf(t), ...set }).inputs.filter((q) => !moved.has(q.name)).map((q) => ({ ...q, optional: true })) : [];
    return { inputs: ins, outputs: [PL('effects', 'table', { label: 'each value on each output: μ*, μ, σ' }), PL('ranked', 'record', { label: 'for each output, the values from most to least' }), PL('nothing', 'list<text>', { label: 'values that move no output watched' }), PL('runs', 'integer'), PL('says', 'text')] }; },
  run: async (i, c) => {
    const t = block(String(c.set.block)); if (!t || (!t.run && !t.graph)) throw new Error(`no block "${c.set.block}" that runs`);
    let set0: Record<string, unknown>; try { set0 = { ...defaultsOf(t), ...(JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>) }; } catch { throw new Error('its settings are not JSON'); }
    const vary = rangesOf(t, set0, String(c.set.vary ?? ''));
    if (!vary.length) throw new Error('give it something to move');
    const runT = runnerOf(t), kept = new Map<string, Outputs>(), k = vary.length, r = Math.max(2, Math.min(100, Math.round(Number(c.set.paths ?? 10)))), levels = 4, D = levels / (2 * (levels - 1));
    // (a thing it makes measured as a person would: its mass, and its width, height and depth, watched like any number)
    const measured = (o: Outputs): Outputs => { const m: Outputs = { ...o }; for (const [n, v] of Object.entries(o)) if (isPart(v) || isAssembly(v)) { const bx = boundsOfAll(v); m[`${n}.mass`] = massOfAll(v); if (!bx.isEmpty()) { m[`${n}.width`] = bx.max.x - bx.min.x; m[`${n}.height`] = bx.max.y - bx.min.y; m[`${n}.depth`] = bx.max.z - bx.min.z; } } return m; };
    const jobOf = (u: number[]): Job => { const inp: Record<string, unknown> = { ...i }, set = { ...set0 }; vary.forEach((v, j) => { const x = valueAt(v, u[j]!); if (v.isSet) set[v.name] = x; else inp[v.name] = x; }); return { block: t.id, inputs: inp, set }; };
    const keyOf = (u: number[]) => u.map((v) => v.toFixed(6)).join(',');
    const at = async (u: number[]): Promise<Outputs> => { const key = keyOf(u); let o = kept.get(key); if (!o) { const j = jobOf(u); o = measured(await runT(j.inputs, j.set)); kept.set(key, o); } return o; };
    let watch = String(c.set.watch ?? '').split(/[\s,]+/).filter(Boolean);
    const ee = new Map<string, number[]>(), push = (j: number, w: string, e: number) => { const key = `${j}|${w}`; (ee.get(key) ?? ee.set(key, []).get(key)!).push(e); };
    // (every path laid out before any of it runs, a start on the grid's lower levels so a step up stays inside, each value
    // stepped once in a drawn order, up or down; so all its points run at once, side by side where that pays (pool.ts))
    const paths = Array.from({ length: r }, (_, p) => { const g = rng(mixSeed(Number(c.set.seed ?? 1), p, 0)), u = vary.map(() => Math.floor(g() * (levels / 2)) / (levels - 1)), order = vary.map((_, j) => j), sign = vary.map(() => (g() < 0.5 ? 1 : -1));
      for (let j = k - 1; j > 0; j--) { const q = Math.floor(g() * (j + 1)); [order[j], order[q]] = [order[q]!, order[j]!]; }
      for (let j = 0; j < k; j++) if (sign[j]! < 0) u[j] = u[j]! + D;
      const pts = [u.slice()], w = u.slice(); for (const j of order) { w[j] = w[j]! + sign[j]! * D; pts.push(w.slice()); } return { u, order, sign, pts }; });
    const todo = [...new Map(paths.flatMap((q) => q.pts).map((u) => [keyOf(u), u])).values()], batch = await runMany(todo.map(jobOf), (j) => runT(j.inputs, j.set), carryOf(t));
    batch.results.forEach((o, n) => { if (o instanceof Error) throw new Error(`${t.name}: ${o.message}`); kept.set(keyOf(todo[n]!), measured(o)); });
    for (const { u, order, sign } of paths) {
      let y0 = await at(u);
      if (!watch.length) watch = Object.entries(y0).filter(([, v]) => typeof v === 'number').map(([n]) => n);
      if (!watch.length) throw new Error(`the ${t.name} gives no number and no thing to measure`);
      for (const w of watch) if (!(w in y0)) throw new Error(`the ${t.name} gives no "${w}"`);
      for (const j of order) { const u1 = u.slice(); u1[j] = u[j]! + sign[j]! * D; const y1 = await at(u1);
        for (const w of watch) { const a = Number(y0[w]), b = Number(y1[w]); if (Number.isFinite(a) && Number.isFinite(b)) push(j, w, (sign[j]! * (b - a)) / D); }
        u[j] = u1[j]!; y0 = y1; }
    }
    const effects: Record<string, unknown>[] = [], ranked: Record<string, string[]> = {}, moves = new Set<number>();
    for (const w of watch) {
      const rows = vary.map((v, j) => { const e = ee.get(`${j}|${w}`) ?? [], n = e.length || 1, mu = e.reduce((s, x) => s + x, 0) / n, star = e.reduce((s, x) => s + Math.abs(x), 0) / n, sd = Math.sqrt(e.reduce((s, x) => s + (x - mu) ** 2, 0) / Math.max(1, n - 1)); return { j, v, mu, star, sd, n: e.length }; });
      const top = Math.max(...rows.map((q) => q.star)) || 0;
      rows.sort((a, b) => b.star - a.star); ranked[w] = rows.map((q) => q.v.name);
      for (const q of rows) { const share = top ? q.star / top : 0; if (share > 1e-6) moves.add(q.j);
        const z = (x: number) => (share <= 1e-6 ? 0 : +x.toPrecision(4)); // (what is a millionth of the most is rounding, not an effect)
        effects.push({ output: w, value: q.v.name, 'μ*': z(q.star), 'μ': z(q.mu), 'σ': z(q.sd), 'of the most': +share.toFixed(3),
          how: share <= 1e-6 ? 'does nothing' : q.sd <= 0.1 * q.star ? (q.mu >= 0 ? 'straight, up' : 'straight, down') : Math.abs(q.mu) >= 0.9 * q.star ? `bends or acts with another, always ${q.mu >= 0 ? 'up' : 'down'}` : 'bends or acts with another, both ways', effects: q.n }); }
    }
    const nothing = vary.filter((_, j) => !moves.has(j)).map((v) => v.name);
    return { effects, ranked, nothing, runs: kept.size,
      says: `${t.name} in ${kept.size} runs over ${r} paths${batch.wide ? ` (side by side on ${batch.workers} workers, ${(batch.ms / 1000).toFixed(1)} s)` : ''}: ${watch.map((w) => [w, effects.filter((e) => e.output === w && e.how !== 'does nothing').map((e) => e.value as string)] as const).filter(([, m]) => m.length).map(([w, m]) => `${w} moved most by ${m[0]}${m.length > 1 ? `, then ${m.slice(1).join(', ')}` : ''}`).join('; ') || 'nothing watched moved'}${nothing.length ? `; ${nothing.join(', ')} move${nothing.length > 1 ? '' : 's'} nothing watched` : ''}` };
  },
  // (a bar's stress σ = F / A: its load moves it more than its area over these ranges, and both move it)
  tests: [{ set: { block: 'law.stress.axial', vary: 'F 1000..5000\nA 0.001..0.002', watch: 'sigma', paths: 6 }, inputs: {}, outputs: { nothing: [], ranked: { sigma: ['F', 'A'] } } }] } as BlockDef);

// ---- trade-offs: the best of anything when its goals pull against each other ------------------------------------------------
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
register({ version: 1, by: 'built in', pure: true, id: 'trade.offs', name: 'Pareto front (trade-offs)', kind: 'solver', ability: 'optimise', domains: ['mechanical', 'structural', 'electrical', 'vehicles', 'finance', 'everyday', 'pipelines'],
  spec: { gloss: 'When its goals pull against each other (light against strong, cheap against fast), which designs are best, and what does each give up?', discipline: 'pipeline.search', role: 'numerical solver', codes: [{ scheme: 'MSC2020', code: '90C29', label: 'Multi-objective and goal programming' }, { scheme: 'MSC2020', code: '90C56', label: 'Derivative-free methods and methods using generalized derivatives' }],
    model: { equations: ['a design is on the front when no other meeting every limit is as good on every goal and better on one (Pareto)', 'each value spread over its range by Halton\'s sequence; then for each weight w, minimise max_k w_k (f_k − f_k*) / (f_k⁺ − f_k*) + 0.01 Σ_k (f_k − f_k*) / (f_k⁺ − f_k*) + 100 Σ (limit missed / limit)² (augmented Chebyshev: it reaches the front where it bends inward too)', 'its knee: the design on the front nearest the ideal (each goal at its best), each goal scaled by its spread'], class: 'analytical', time: 'steady', linear: false,
      method: 'Halton sampling, then Nelder–Mead on each weight\'s Chebyshev distance, from the best sampled for it, within the ranges; every design tried kept, the front taken from all of them', references: ['Miettinen, Nonlinear Multiobjective Optimization, Kluwer (1999), ch. 3.4 (achievement functions)', 'Steuer & Choo, An interactive weighted Tchebycheff procedure, Math. Program. 26, 326 (1983)', 'Halton, Numer. Math. 2, 84 (1960)', 'Das & Dennis, A closer look at drawbacks of minimizing weighted sums of objectives, Struct. Optim. 14, 63 (1997)'] } },
  says: 'Any block, or any pipeline folded into one, with goals that pull against each other (as light as can be and as stiff as can be; as cheap and as fast), and limits it must keep (a factor of safety over 1.5): many designs tried across its ranges, and the best kept, those that no other beats on every goal at once. Each with what it gives on every goal, the one in the middle that gives up least (its knee), and what each made laid out side by side. The choice between them is yours: this shows what each costs',
  settings: [{ key: 'block', label: 'Block (its id)', type: 'text', default: 'seed.spring-checked' }, { key: 'vary', label: 'Moved, each a line: name from..to; chosen: name a|b|c, or name from..to int', type: 'code', default: 'd 0.002..0.005\nD 0.015..0.035\nn 3..10' },
    { key: 'goals', label: 'Goals, each a line: output min, output max; limits: output < v, output > v', type: 'code', default: 'mass min\nrate max\nworst > 1.2' },
    { key: 'samples', label: 'Designs spread first', type: 'number', default: 40 }, { key: 'weights', label: 'Then refined toward, weights', type: 'number', default: 6 }, { key: 'most', label: 'Trials each', type: 'number', default: 30 }, { key: 'blockSet', label: 'Its other settings (JSON)', type: 'code', default: '{}' }],
  ports: (st) => { const t = block(String(st.block ?? 'seed.spring-checked')), set = (() => { try { return JSON.parse(String(st.blockSet ?? '{}')) as Record<string, unknown>; } catch { return {}; } })(), moved = new Set(String(st.vary ?? '').split('\n').map((l) => l.trim().split(/\s+/)[0]).filter(Boolean));
    const ins = t ? portsOf(t, { ...defaultsOf(t), ...set }).inputs.filter((q) => !moved.has(q.name)).map((q) => ({ ...q, optional: true })) : [];
    return { inputs: ins, outputs: [PL('front', 'table', { label: 'the best: none beaten on every goal' }), PL('knee', 'record', { label: 'the one that gives up least' }), PL('xs', 'list<number>', { label: 'the front, its first goal' }), PL('ys', 'list<number>', { label: 'the front, its second goal' }), PL('laid', 'assembly', { label: 'what each on the front made, side by side in a square' }), PL('tried', 'table', { label: 'every design tried' }), PL('says', 'text')] }; },
  run: async (i, c) => {
    const t = block(String(c.set.block)); if (!t || (!t.run && !t.graph)) throw new Error(`no block "${c.set.block}" that runs`);
    let set0: Record<string, unknown>; try { set0 = { ...defaultsOf(t), ...(JSON.parse(String(c.set.blockSet ?? '{}')) as Record<string, unknown>) }; } catch { throw new Error('its settings are not JSON'); }
    const vary = rangesOf(t, set0, String(c.set.vary ?? '')), lines = String(c.set.goals ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = /^(\S+)\s*(min|max|<|>)\s*(-?[\d.eE+-]+)?$/.exec(l); if (!m || ((m[2] === '<' || m[2] === '>') && m[3] === undefined)) throw new Error(`"${l}": a goal is "output min" or "output max", a limit "output < v" or "output > v"`); return { name: m[1]!, op: m[2]!, v: Number(m[3] ?? 0) }; });
    const goals = lines.filter((g) => g.op === 'min' || g.op === 'max'), limits = lines.filter((g) => g.op === '<' || g.op === '>');
    if (!vary.length) throw new Error('give it something to move'); if (goals.length < 2) throw new Error('a trade-off needs two goals or more (one goal: Fit to a target)');
    const runT = runnerOf(t), kept = new Map<string, { u: number[]; out: Outputs; f: number[]; miss: number }>();
    // (each design kept by its values: f its goals, each to be made as small as it goes (a max turned round), miss how far it
    // is outside its limits, 0 inside them)
    const clamp = (u0: number[]) => u0.map((x) => Math.min(1, Math.max(0, x))), keyOf = (u: number[]) => u.map((x) => x.toFixed(6)).join(',');
    const jobOf = (u: number[]): Job => { const inp: Record<string, unknown> = { ...i }, set = { ...set0 }; vary.forEach((v, j) => { const x = valueAt(v, u[j]!); if (v.isSet) set[v.name] = x; else inp[v.name] = x; }); return { block: t.id, inputs: inp, set }; };
    const at = async (u0: number[], given?: Outputs | Error) => { const u = clamp(u0), key = keyOf(u); let d = kept.get(key);
      if (!d) { let out: Outputs; if (given) out = given instanceof Error ? {} : given; else { const j = jobOf(u); try { out = await runT(j.inputs, j.set); } catch { out = {}; } }
        // (a goal may be one of the values moved itself: as little area as can be)
        out = { ...Object.fromEntries(vary.map((v, j) => [v.name, valueAt(v, u[j]!)])), ...out };
        const f = goals.map((g) => { const y = Number(out[g.name]); return Number.isFinite(y) ? (g.op === 'min' ? y : -y) : Infinity; });
        const miss = limits.reduce((s, g) => { const y = Number(out[g.name]), sc = Math.abs(g.v) || 1; return s + (!Number.isFinite(y) ? 1e3 : g.op === '>' ? Math.max(0, (g.v - y) / sc) ** 2 : Math.max(0, (y - g.v) / sc) ** 2); }, 0);
        d = { u, out, f, miss }; kept.set(key, d); } return d; };
    const nS = Math.max(4, Math.min(400, Math.round(Number(c.set.samples ?? 40)))), off = 1 + (Math.abs(Math.round(Number(c.set.seed ?? 0))) % 997);
    // (the spread laid out first and run at once, side by side where that pays (pool.ts))
    const spread = Array.from({ length: nS }, (_, k) => clamp(vary.map((_, j) => halton(k + off, PRIMES[j % PRIMES.length]!)))), batch = await runMany(spread.map(jobOf), (j) => runT(j.inputs, j.set), carryOf(t));
    for (let k = 0; k < nS; k++) await at(spread[k]!, batch.results[k]);
    if (![...kept.values()].some((d) => d.f.every(Number.isFinite))) throw new Error(`the ${t.name} gave no ${goals.map((g) => g.name).join(' or ')} anywhere in these ranges`);
    // (each goal scaled from its best to its worst among designs that keep the limits; the refinement weights spread evenly)
    const scale = () => { const ok = [...kept.values()].filter((d) => d.miss === 0 && d.f.every(Number.isFinite)), all = ok.length ? ok : [...kept.values()].filter((d) => d.f.every(Number.isFinite));
      return goals.map((_, q) => { const ys = all.map((d) => d.f[q]!); const lo = Math.min(...ys), hi = Math.max(...ys); return { lo, span: hi - lo || Math.abs(lo) || 1 }; }); };
    const nW = Math.max(0, Math.min(40, Math.round(Number(c.set.weights ?? 6)))), most = Math.max(5, Math.round(Number(c.set.most ?? 30))), g0 = rng(mixSeed(off, 0, 0));
    for (let w = 0; w < nW; w++) {
      const wt = goals.length === 2 ? [(w + 0.5) / nW, 1 - (w + 0.5) / nW] : (() => { const r = goals.map(() => -Math.log(g0() || 1e-9)), s = r.reduce((a, b) => a + b, 0); return r.map((x) => x / s); })();
      const sc = scale(), cheb = (d: { f: number[]; miss: number }) => { const z = d.f.map((y, q) => (y - sc[q]!.lo) / sc[q]!.span); return Math.max(...z.map((x, q) => wt[q]! * x)) + 0.01 * z.reduce((a, b) => a + b, 0) + 100 * d.miss; };
      const start = [...kept.values()].filter((d) => d.f.every(Number.isFinite)).sort((a, b) => cheb(a) - cheb(b))[0]!;
      await minimizeAsync(async (u) => { const d = await at(u); return d.f.every(Number.isFinite) ? cheb(d) : 1e9; }, start.u, { step: vary.map(() => 0.08), most, lo: vary.map(() => 0), hi: vary.map(() => 1), ftol: 1e-6 });
    }
    // (the front: every design that keeps its limits and that no other beats on every goal at once)
    const ok = [...kept.values()].filter((d) => d.miss === 0 && d.f.every(Number.isFinite));
    const front = ok.filter((a) => !ok.some((b) => b !== a && b.f.every((y, q) => y <= a.f[q]!) && b.f.some((y, q) => y < a.f[q]!))).sort((a, b) => a.f[0]! - b.f[0]!);
    const sc = scale(), knee = front.length ? front.map((d) => ({ d, r: Math.hypot(...d.f.map((y, q) => (y - sc[q]!.lo) / sc[q]!.span)) })).sort((a, b) => a.r - b.r)[0]!.d : undefined;
    const valsOf = (d: { u: number[] }) => Object.fromEntries(vary.map((v, j) => { const x = valueAt(v, d.u[j]!); return [v.name, typeof x === 'number' ? +x.toPrecision(4) : x]; }));
    const rowOf = (d: { u: number[]; out: Outputs }) => ({ ...valsOf(d), ...Object.fromEntries([...goals, ...limits].map((g) => [g.name, +Number(d.out[g.name]).toPrecision(4)])) });
    const things = front.map((d) => Object.values(d.out).find((v) => isPart(v) || isAssembly(v)) as Part | Assembly | undefined).filter((x): x is Part | Assembly => !!x);
    // (in a square, the front's order along each row then back row by row, each cell as wide as the widest and a quarter
    // more: seen together close up, not strung out where the far ones are drawn as boxes)
    const boxes = things.map((th) => boundsOfAll(th)), cell = 1.25 * Math.max(1e-3, ...boxes.map((b) => (b.isEmpty() ? 0 : Math.max(b.max.x - b.min.x, b.max.z - b.min.z)))), cols = Math.ceil(Math.sqrt(things.length)), x = cols * cell - cell;
    const items: Placed[] = things.map((th, k) => { const b = boxes[k]!, cx = b.isEmpty() ? 0 : (b.min.x + b.max.x) / 2, cz = b.isEmpty() ? 0 : (b.min.z + b.max.z) / 2; return place(th, [(k % cols) * cell - cx, b.isEmpty() ? 0 : -b.min.y, Math.floor(k / cols) * cell - cz]); });
    const sign = (q: number) => (goals[q]!.op === 'min' ? 1 : -1);
    return { front: front.map((d) => ({ ...rowOf(d), knee: d === knee ? '◆' : '' })), knee: knee ? rowOf(knee) : {}, xs: front.map((d) => sign(0) * d.f[0]!), ys: front.map((d) => sign(1) * d.f[1]!),
      laid: { name: `${t.name}: its front`, items: items.map((it) => ({ ...it, at: [it.at[0] - x / 2, it.at[1], it.at[2] - (Math.ceil(things.length / cols) - 1) * cell / 2] as [number, number, number] })) } as Assembly,
      tried: [...kept.values()].map((d) => ({ ...rowOf(d), keeps: d.miss === 0 ? 'yes' : 'no' })),
      says: `${t.name}: ${kept.size} designs tried${batch.wide ? ` (the first ${nS} side by side on ${batch.workers} workers)` : ''}, ${ok.length} keep ${limits.length ? limits.map((g) => `${g.name} ${g.op} ${g.v}`).join(', ') : 'every limit'}, ${front.length} on the front (${goals.map((g) => `${g.name} ${g.op}`).join(' against ')})${knee ? `; giving up least: ${Object.entries(rowOf(knee)).map(([k, v]) => `${k} ${v}`).join(', ')}` : ''}${limits.length && !ok.length ? '; none keeps the limits in these ranges' : ''}` };
  },
  // (a bar: as little area as can be, as low a stress as can be; every area trades one for the other, so the front runs
  // along the whole range, and a limit on stress cuts off its thin end)
  tests: [{ set: { block: 'law.stress.axial', vary: 'A 0.001..0.01', goals: 'A min\nsigma min\nsigma < 4e6', samples: 12, weights: 2, most: 10 }, inputs: { F: 10000 }, outputs: { knee: {} }, rel: 1 }] } as BlockDef);

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
