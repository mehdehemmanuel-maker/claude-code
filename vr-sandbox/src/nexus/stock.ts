// The built-parts library, and its law: every piece a build makes, at every depth (a car, its engine, the engine's head,
// the head's valve, the valve's spring), is either taken from this library or made and stored in it. Nothing is built
// that is not stored; nothing is stored twice; nothing is kept that no build makes any more (outdated, so deleted).
//
// A piece is stored by its design, not by where it is or what it is called: its shape, material, cuts, make and what it
// is (its own figures), and the pieces in it each by design and by where it sits in it. So a 10.9 M8 × 25 bolt is one
// entry whether it holds a con rod on a Corolla or a Monte Carlo; a piece's colour and its look are variants laid over
// a design (the seed system's overlays), and what it is next to (the links, joins and passes naming its neighbours) is
// where it is used, not what it is. A tube drawn by a path is the same design wherever its path starts.
//
// What builds: every node that makes a thing, run as it comes (and once for each choice of a node that offers every
// one: each real vehicle model). Written to src/data/stock.json by tests/nexus/docs.ts; held to by the one test
// (`stockProblems`): a piece built and not stored, or stored and no longer built, fails it.

import { LIBRARY, defaultsOf, portsOf, register, type BlockDef } from './blocks';
import { Engine, emptyBoard, placeBlock } from './dataflow';
import { designOf, isAssembly, isPart, type Assembly } from './assembly';
import type { Part } from './kits';
import STORED from '../data/stock.json';
import './seeds';

type Thing = Part | Assembly;
/** What is stored: the builds, and each piece by design: its key, its name, the build it was first made by and where in
 *  it (child indexes from the top, dot-separated), the pieces in it (key × how many), and every build that uses it. */
export interface Stocked { key: string; name: string; from: string; path: string; kids: [string, number][]; usedBy: string[] }
const raw = STORED as { sources: string[]; pieces: [string, string, number, string, string, string][] };
const unpack = (r: (typeof raw.pieces)[number]): Stocked => ({ key: r[0], name: r[1], from: raw.sources[r[2]] ?? '', path: r[3], kids: r[4] ? r[4].split(',').map((s) => { const [k, n] = s.split('*'); return [k!, Number(n ?? 1)]; }) : [], usedBy: r[5] ? r[5].split(',').map((i) => raw.sources[Number(i)] ?? '') : [] });
let kept: Map<string, Stocked> | null = null;
/** The library as stored, by key. */
export function stocked(): Map<string, Stocked> { return (kept ??= new Map(raw.pieces.map((r) => { const s = unpack(r); return [s.key, s]; }))); }

const kidsOf = (t: Thing): Thing[] => (isAssembly(t) ? t.items.map((it) => it.of) : t.parts ?? []);

/** One piece found in a build. */
export interface Found { key: string; name: string; thing: Thing; from: string; path: string; kids: Map<string, number>; usedBy: Set<string> }
/** Every piece in a thing, at every depth, by design, added to `into`: the first place each design is met is where it is
 *  stored from. */
export function piecesIn(top: Thing, from: string, into = new Map<string, Found>()): Map<string, Found> {
  const walk = (t: Thing, path: string) => {
    const key = designOf(t).key, was = into.get(key);
    if (was) { was.usedBy.add(from); return; }
    const kids = new Map<string, number>(), ks = kidsOf(t);
    for (const k of ks) { const kk = designOf(k).key; kids.set(kk, (kids.get(kk) ?? 0) + 1); }
    into.set(key, { key, name: t.name || 'unnamed', thing: t, from, path, kids, usedBy: new Set([from]) });
    ks.forEach((k, i) => walk(k, path ? `${path}.${i}` : String(i)));
  };
  walk(top, ''); return into;
}

// ---- what builds -------------------------------------------------------------------------------------------------------
const thingType = (t: string) => /^(list<)?(part|assembly)>?$/.test(t);
/** Every node that makes a thing, with nothing wired into it: its id, and the choice it is run at where it offers every one. */
export function builders(): { block: BlockDef; set: Record<string, unknown>; id: string }[] {
  const out: { block: BlockDef; set: Record<string, unknown>; id: string }[] = [];
  for (const b of LIBRARY.values()) {
    if (b.id.startsWith('group.') || b.id === STOCK_NODE || b.alias) continue;
    const ps = portsOf(b, defaultsOf(b));
    if (!ps.outputs.some((o) => thingType(o.type)) || ps.inputs.some((i) => !i.optional && i.default === undefined && thingType(i.type))) continue;
    const every = b.every ? b.settings?.find((s) => s.key === b.every) : undefined;
    if (every?.choices?.length) for (const c of every.choices) out.push({ block: b, set: { [every.key]: c }, id: `${b.id}:${String(c)}` });
    else out.push({ block: b, set: {}, id: b.id });
  }
  return out;
}
const runs = new Map<string, Promise<Map<string, Thing>>>();
/** What one builder makes, by `id#port` (each thing it gives, each of a list by its index): run once and kept. */
export function buildOf(id: string): Promise<Map<string, Thing>> {
  let r = runs.get(id);
  if (!r) {
    r = (async () => {
      const [bid, choice] = id.split(':') as [string, string | undefined], b = LIBRARY.get(bid), out = new Map<string, Thing>();
      if (!b) return out;
      const set = choice !== undefined && b.every ? { [b.every]: b.settings?.find((s) => s.key === b.every)?.choices?.find((c) => String(c) === choice) ?? choice } : {};
      const brd = emptyBoard('stock'); placeBlock(brd, bid, 0, 0, set, 'n');
      const e = new Engine(brd); await e.run();
      for (const [port, v] of Object.entries(e.state.get('n')?.out ?? {})) {
        if (isPart(v) || isAssembly(v)) out.set(`${id}#${port}`, v);
        else if (Array.isArray(v)) v.forEach((x, i) => { if (isPart(x) || isAssembly(x)) out.set(`${id}#${port}.${i}`, x); });
      }
      return out;
    })();
    runs.set(id, r);
  }
  return r;
}
/** Every piece every builder makes, at every depth, by design. */
export async function builtPieces(): Promise<Map<string, Found>> {
  const all = new Map<string, Found>();
  for (const b of builders()) for (const [src, t] of await buildOf(b.id)) piecesIn(t, src, all);
  return all;
}

// ---- what is stored, and held to ---------------------------------------------------------------------------------------
/** Names that read apart: a name several designs share is given each one's size (its box, mm), and a number where those
 *  agree too. */
function namesOf(found: Found[], size: (t: Thing) => string): Map<string, string> {
  const by = new Map<string, Found[]>(); for (const f of found) (by.get(f.name) ?? by.set(f.name, []).get(f.name)!).push(f);
  const out = new Map<string, string>();
  for (const [n, fs] of by) {
    if (fs.length === 1) { out.set(fs[0]!.key, n); continue; }
    const seen = new Map<string, number>();
    for (const f of fs) { const s = `${n} (${size(f.thing)})`, k = (seen.get(s) ?? 0) + 1; seen.set(s, k); out.set(f.key, k > 1 ? `${n} (${size(f.thing)}, design ${k})` : s); }
  }
  return out;
}
/** The library written: what src/data/stock.json holds (tests/nexus/docs.ts writes it). */
export function stockJson(all: Map<string, Found>, size: (t: Thing) => string): string {
  const found = [...all.values()].sort((a, b) => a.from.localeCompare(b.from) || a.path.localeCompare(b.path, 'en', { numeric: true }));
  const sources = [...new Set(found.flatMap((f) => [f.from, ...f.usedBy]))].sort(), at = new Map(sources.map((s, i) => [s, i])), names = namesOf(found, size);
  const rows = found.map((f) => [f.key, names.get(f.key)!, at.get(f.from)!, f.path, [...f.kids].map(([k, n]) => (n > 1 ? `${k}*${n}` : k)).join(','), [...f.usedBy].map((s) => at.get(s)!).sort((a, b) => a - b).join(',')]);
  return `{"sources":${JSON.stringify(sources)},\n"pieces":[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]}\n`;
}
/** Where the law is broken: a piece built and not stored (made, never put in the library), a piece stored and no build
 *  makes it any more (outdated), a stored piece whose place in its build no longer holds it (stored wrongly). */
export function stockProblems(all: Map<string, Found>, lib = stocked()): { unstored: Found[]; outdated: Stocked[]; misplaced: Stocked[] } {
  const unstored = [...all.values()].filter((f) => !lib.has(f.key)), outdated = [...lib.values()].filter((s) => !all.has(s.key));
  const misplaced: Stocked[] = [];
  for (const s of lib.values()) { const f = all.get(s.key); if (f && (f.from !== s.from || f.path !== s.path)) misplaced.push(s); }
  return { unstored, outdated, misplaced };
}
/** A stored piece, made again: its build run (once) and the piece taken from where it was stored from. */
export async function takeOut(s: Stocked): Promise<Thing | undefined> {
  const [bid] = s.from.split('#') as [string];
  let t: Thing | undefined = (await buildOf(bid)).get(s.from);
  for (const i of s.path ? s.path.split('.').map(Number) : []) t = t && kidsOf(t)[i];
  return t;
}

// ---- the node --------------------------------------------------------------------------------------------------------
const STOCK_NODE = 'stock.part';
/** A stored piece by its key or its name (the whole name, else the first that starts with it). */
export function stockFind(q: string): Stocked | undefined {
  const lib = stocked(), w = q.trim().toLowerCase(); if (lib.has(q.trim())) return lib.get(q.trim());
  const all = [...lib.values()]; return all.find((s) => s.name.toLowerCase() === w) ?? all.find((s) => s.name.toLowerCase().startsWith(w));
}
const sample = () => [...stocked().values()].find((s) => s.from === 'seed.window#window' && !s.path);
register({
  id: 'stock.part', name: 'Stored part (the built-parts library)', version: 1, by: 'built in', pure: true, kind: 'generator', ability: 'generate', domains: ['mechanical', 'manufacturing', 'vehicles', 'everyday'],
  spec: { gloss: 'Any piece any build has made, taken from the library', discipline: 'mechanical.design', role: 'data source', codes: [{ scheme: 'ICS', code: '01.110', label: 'Technical product documentation' }, { scheme: 'ICS', code: '35.240.50', label: 'IT applications in industry' }] },
  says: 'A piece from the built-parts library, where every piece every build makes is stored once by its design, at every depth (a car, its engine, the head, the valve, its spring): taken out as it was made, with what it is made of (each a stored piece too) and every build that uses it. Put it on a board to build with it, as the builds do',
  settings: [{ key: 'id', label: 'Piece (its key or its name)', type: 'text', default: sample()?.key ?? '' }],
  ports: { inputs: [], outputs: [{ name: 'thing', type: 'assembly' }, { name: 'name', type: 'text' }, { name: 'pieces', type: 'table', label: 'what it is made of, each a stored piece' }, { name: 'usedBy', type: 'list<text>', label: 'the builds that use it' }] },
  run: async (_i, c) => {
    const s = stockFind(String(c.set.id ?? '')); if (!s) throw new Error(`nothing in the built-parts library is "${String(c.set.id)}"`);
    const t = await takeOut(s); if (!t) throw new Error(`"${s.name}" is stored from ${s.from} at ${s.path || 'its top'}, and is not there now: the library is out of date (UPDATE_DOCS=1)`);
    const lib = stocked();
    return { thing: t, name: s.name, pieces: s.kids.map(([k, n]) => ({ key: k, name: lib.get(k)?.name ?? k, n })), usedBy: s.usedBy };
  },
  tests: sample() ? [{ set: { id: sample()!.key }, inputs: {}, outputs: { name: sample()!.name } }] : [],
} as BlockDef);
