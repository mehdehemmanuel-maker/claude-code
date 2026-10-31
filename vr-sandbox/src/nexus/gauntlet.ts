// The gauntlet: a node, or a thing in the inventory, is approved only when it has come through every gate that applies
// to it, in order from the cheapest: is it said what it is (documented), is it the only one that does what it does
// (unique), does it reach the rest of the library (versatile), is what it says sourced (sourced), do its own tests pass
// (tests), does it hold when its inputs are pushed far from their defaults (robust), is everything it is made of known
// all the way down to materials (known), does what it makes come apart to single parts with every recipe met
// (explodes), and does nothing it makes run into anything (clean). What fails is said gate by gate; what it was found
// to want that nothing knows goes to the unknown queue.
//
// The unknown queue is sorted by what its members have in common (what kind of thing each is and the word that names
// it), so a whole cluster is researched, or made by one maker, at once; and resolved in a loop to a fixed point: each
// round takes the most wanted clusters first and tries, in order, a family that makes that very size, a researched
// reference, the drawing that already draws it (its parts and their materials, read back into the inventory), and an
// analogy with a known sibling (said as inferred, never as known: it waits for a source); what each resolves is walked
// in turn for what it wants, round after round, until a round finds nothing new. A web resolver (Wikidata's "has
// part") is added where the page can reach the web; nothing here pretends to.
//
// The blocks are passed in (Lib), so this owner imports nothing of the library's (blocks.ts registers its nodes).

import { evidenceOf } from './evidence';
import type { BlockDef, Ports, PortDef } from './blocks';
import type { Part } from './kits';
import { INVENTORY, feed, findItem, itemOf, removeItem, resolve, type Item } from './inventory';
import type { WebParts } from './research';
import { judge } from './breakdown';
import { explodeAudit, keptItem } from './components';
import { rulesOf } from './make/rules';
import { DENSITY } from './mass';
import { isAssembly, isPart, type Assembly } from './assembly';

export interface Lib {
  blocks: Map<string, BlockDef>;
  test(b: BlockDef): Promise<{ ok: boolean; fails: string[]; ran: number }>;
  portsOf(b: BlockDef, set?: Record<string, unknown>): Ports;
  defaultsOf(b: BlockDef): Record<string, unknown>;
  fits(out: PortDef, inp: PortDef): { ok: boolean };
  same(a: BlockDef, b: BlockDef): boolean;
}
export type CandidateKind = 'block' | 'item';
export interface Candidate { id: string; kind: CandidateKind; name: string }
export interface GateResult { gate: GateId; pass: boolean | null; says: string; ms: number; unknowns?: Unknown[] }
export interface Verdict { cand: Candidate; results: GateResult[]; approved: boolean; at: number; failed: GateId[] }
export type Why = 'not in the table' | 'only its materials listed' | 'nothing in it listed' | 'several materials in one shaping' | 'drawn as one piece';
export interface Unknown { id: string; why: Why; wantedBy: string[]; words: string }

export const GATES = ['documented', 'unique', 'versatile', 'sourced', 'tests', 'robust', 'known', 'explodes', 'clean'] as const;
export type GateId = (typeof GATES)[number];
export const GATE_SAYS: Record<GateId, string> = {
  documented: 'said what it is: a name, what it does in a sentence or more, every port typed (a block); a name, a sentence, its place (an entry)',
  unique: 'the only one that does what it does: no other block with its ports gives its answers to its tests (one owner per concern)',
  versatile: 'reaches the library: what it gives, other blocks take, and what it takes, others give (or it is a source or a sink); an entry is used in something',
  sourced: 'where its numbers come from is said: a cited source, or "typical" or "an estimate" said of it',
  tests: 'its own tests, all passing (a block); an entry has none to run',
  robust: 'pushed far from its defaults (zero, negative, a thousandth and a thousand times; a tenth and ten times for what draws parts), it answers or refuses in words: it never crashes and never gives NaN without saying',
  known: 'everything it is made of known all the way down to materials: nothing not in the table, nothing listed only as its materials',
  explodes: 'what it makes comes apart to single parts: no assembly drawn as one piece, every recipe met, nothing only said, every piece weighed by its material',
  clean: 'nothing it makes runs into, rubs or overheats anything (the rules)',
};

// ==== events: what happened, for whatever listens ======================================================================
export type EventKind = 'approved' | 'rejected' | 'queued' | 'resolved' | 'deleted' | 'round' | 'proposed';
export interface GEvent { n: number; kind: EventKind; id: string; says: string; at: number }
const events: GEvent[] = [], listeners = new Set<(e: GEvent) => void>();
let evN = 0;
export const eventsSince = (n = 0, kind?: EventKind): GEvent[] => events.filter((e) => e.n > n && (!kind || e.kind === kind));
export const lastEvent = (): number => evN;
export function onEvent(cb: (e: GEvent) => void): () => void { listeners.add(cb); return () => listeners.delete(cb); }
function emit(kind: EventKind, id: string, says: string): void {
  const e = { n: ++evN, kind, id, says, at: Date.now() }; events.push(e); if (events.length > 2000) events.splice(0, events.length - 2000);
  for (const cb of listeners) { try { cb(e); } catch { /* a listener's fault is its own */ } }
}

// ==== the store: verdicts, the unknown queue, proposals ================================================================
const verdicts = new Map<string, Verdict>(), queue = new Map<string, Unknown>();
export interface Proposal { id: string; name: string; of: { id: string; n: number }[]; make: string; level: 'table' | 'drawn' | 'inferred' | 'web'; from: string; says: string }
const proposals = new Map<string, Proposal>();
export const verdictOf = (key: string): Verdict | undefined => verdicts.get(key);
export const allVerdicts = (): Verdict[] => [...verdicts.values()];
export const approved = (): Candidate[] => allVerdicts().filter((v) => v.approved).map((v) => v.cand);
export const unknownQueue = (): Unknown[] => [...queue.values()].sort((a, b) => b.wantedBy.length - a.wantedBy.length || a.id.localeCompare(b.id));
export const proposalsAll = (): Proposal[] => [...proposals.values()];
const keyOf = (c: Candidate) => `${c.kind}:${c.id}`;
/** The store as it can be kept and brought back (a page keeps it in its storage). */
export const snapshot = () => ({ verdicts: allVerdicts(), queue: unknownQueue(), proposals: proposalsAll() });
export function restore(s: ReturnType<typeof snapshot>): void { verdicts.clear(); queue.clear(); proposals.clear(); for (const v of s.verdicts ?? []) verdicts.set(keyOf(v.cand), v); for (const u of s.queue ?? []) queue.set(u.id, u); for (const p of s.proposals ?? []) proposals.set(p.id, p); }
export function clearAll(): void { verdicts.clear(); queue.clear(); proposals.clear(); }
function enqueue(u: Unknown): void {
  const had = queue.get(u.id);
  if (had) { for (const w of u.wantedBy) if (!had.wantedBy.includes(w)) had.wantedBy.push(w); return; }
  queue.set(u.id, { ...u, wantedBy: [...u.wantedBy] }); emit('queued', u.id, `${u.id}: ${u.why}${u.wantedBy.length ? `, wanted by ${u.wantedBy.slice(0, 3).join(', ')}` : ''}`);
}

// ==== candidates ========================================================================================================
/** What can be put through: the library's blocks (all, or of a kind or domain, or made by you), or the inventory's
 *  entries (under a path, or yours, or by id). */
export function candidatesOf(lib: Lib, o: { from: 'library' | 'inventory'; kind?: string; domain?: string; by?: string; path?: string; ids?: string[]; most?: number }): Candidate[] {
  const most = o.most ?? Infinity;
  if (o.from === 'library') return [...lib.blocks.values()].filter((b) => !b.id.startsWith('group.') && (!o.ids || o.ids.includes(b.id)) && (!o.kind || b.kind === o.kind) && (!o.domain || b.domains.includes(o.domain)) && (!o.by || b.by === o.by)).slice(0, most).map((b) => ({ id: b.id, kind: 'block' as const, name: b.name }));
  return [...INVENTORY.values()].filter((i) => (!o.ids || o.ids.includes(i.id)) && (!o.path || i.path.join('/').toLowerCase().startsWith(o.path.toLowerCase())) && (!o.by || (o.by === 'you' ? !!i.yours : true)) && (!o.kind || i.kind === o.kind)).slice(0, most).map((i) => ({ id: i.id, kind: 'item' as const, name: i.name }));
}

// ==== what a block makes, with its defaults ============================================================================
const asParts = (v: unknown): Part[] => { const out: Part[] = [], seen = new Set<object>(); const walk = (t: Part | Assembly) => { if (seen.has(t)) return; seen.add(t); if (isPart(t)) out.push(t); else for (const it of t.items) walk(it.of); }; if (isPart(v) || isAssembly(v)) walk(v as Part | Assembly); return out; };
/** The inputs a block is tried with: its first test's, else each input's default. */
function inputsOf(lib: Lib, b: BlockDef): Record<string, unknown> {
  const t = b.tests?.[0]; if (t) return { ...t.inputs };
  return Object.fromEntries(lib.portsOf(b, lib.defaultsOf(b)).inputs.filter((p) => p.default !== undefined).map((p) => [p.name, p.default]));
}
const madeCache = new WeakMap<BlockDef, { parts: Part[]; of: string[]; error?: string }>();
/** What a block makes with its defaults (its first test's settings over them); for a block with a setting whose every
 *  choice is a different thing (`every`: a real model), each choice's, each said by its choice. */
async function madeBy(lib: Lib, b: BlockDef): Promise<{ parts: Part[]; of: string[]; error?: string }> {
  const had = madeCache.get(b); if (had) return had;
  const outs = lib.portsOf(b, lib.defaultsOf(b)).outputs.filter((p) => p.type === 'part' || p.type === 'assembly');
  let r: { parts: Part[]; of: string[]; error?: string } = { parts: [], of: [] };
  if (outs.length && b.run && b.pure) {
    const set0 = { ...lib.defaultsOf(b), ...(b.tests?.[0]?.set ?? {}) }, ch = b.every ? b.settings?.find((x) => x.key === b.every)?.choices : undefined;
    for (const v of ch?.length ? ch : [undefined]) {
      try { const set = v === undefined ? set0 : { ...set0, [b.every!]: v }, o = await b.run(inputsOf(lib, b), { set }); for (const p of outs.flatMap((q) => asParts(o[q.name]))) { r.parts.push(p); r.of.push(v === undefined ? '' : String(v)); } }
      catch (e) { r.error = `${v === undefined ? '' : `${v}: `}${(e as Error).message}`; }
    }
  }
  madeCache.set(b, r); return r;
}

// ==== known all the way down ===========================================================================================
/** What an entry (and all in it) wants that nothing knows: not in the table (and no family makes that very size),
 *  or listed only as its materials, or with nothing in it listed. Each said with what wants it. */
export function unknownsUnder(ids: string[], wantedBy = '', lookup: (id: string) => Item | undefined = (id) => itemOf(id) ?? keptItem(id)): Unknown[] {
  const out = new Map<string, Unknown>(), seen = new Set<string>();
  const add = (id: string, why: Why, by: string) => { const u = out.get(id); if (u) { if (by && !u.wantedBy.includes(by)) u.wantedBy.push(by); } else out.set(id, { id, why, wantedBy: by ? [by] : [], words: wordsOf(id) }); };
  const walk = (id: string, by: string, depth: number) => {
    if (depth > 24) return;
    // (an entry with nothing in it listed that has a proposal is gone down through what the proposal says is in it)
    let it = lookup(id) ?? proposalItem(id); if (it && !it.of.length && proposals.has(id)) it = { ...it, ...proposalItem(id)!, path: it.path };
    // (a part's tag may be the words its family makes it from ("tube 30x3", "bearing 6206"): the size it makes is it)
    if (!it) for (const w of [id, id.replace(/-/g, ' ')]) { const r = resolve(w); if (r && typeof r === 'object' && (r.id === id || r.sized)) { it = r; break; } }
    if (!it) { add(id, 'not in the table', by); return; }
    if (seen.has(id)) return; seen.add(id);
    const why = judge(it, (x) => lookup(x) ?? proposalItem(x) ?? it!.inner?.find((y) => y.id === x));
    if (why) add(id, why, by);
    if (it.kind === 'material' || it.kind === 'element') return;
    for (const c of it.of) walk(c.id, id, depth + 1);
  };
  for (const id of ids) walk(id, wantedBy, 0);
  return [...out.values()];
}
const proposalItem = (id: string): Item | undefined => { const p = proposals.get(id); return p ? { id: p.id, name: p.name, path: ['Proposed'], kind: p.make === 'assemble' ? 'assembly' : 'part', make: p.make as Item['make'], of: p.of, says: p.says } : undefined; };

// ==== the gates =========================================================================================================
const isNum = (p: PortDef) => p.type === 'number' || p.type === 'integer';
// (a number with its unit: a one-letter unit only after a space ("21700s" is a cell's format, not seconds))
const FIGURES = /\b\d+(\.\d+)?(\s?(%|mm|cm|km|kg|kN|Pa|kPa|MPa|GPa|°C|kV|mA|kW|Wh|kWh|Ah|rpm|Hz|ms)|\s(m|g|N|K|V|A|W|s|h|L))\b/g;
/** What a block says, its examples in quotes left out (a formula's "x + 5 mm" is how to write one, not a figure of its own). */
const ownWords = (t: string) => t.replace(/"[^"]*"|“[^”]*”/g, ' ');
const CITES = /\b(typical|an estimate|estimated|ISO|DIN|ASME|SAE|IEC|ANSI|ASTM|JIS|EN \d|Shigley|CRC|handbook|maker|datasheet|IUPAC|NIST|standards?|teardowns? report|as [a-z ]{0,30} reports?)\b|\([A-Z][^)]{2,}\)/;
/** Whether a value carries a NaN anywhere in it (a number, or a part's numbers). */
function hasNaN(v: unknown, depth = 0): boolean {
  if (typeof v === 'number') return Number.isNaN(v);
  if (!v || typeof v !== 'object' || depth > 6) return false;
  if (Array.isArray(v)) return v.some((x) => hasNaN(x, depth + 1));
  return Object.values(v as Record<string, unknown>).some((x) => hasNaN(x, depth + 1));
}
const CRASH = /(TypeError|RangeError|ReferenceError)|is not a function|of undefined|of null|undefined is not|cannot read/i;

async function gate(lib: Lib, g: GateId, c: Candidate): Promise<Omit<GateResult, 'ms' | 'gate'>> {
  const b = c.kind === 'block' ? lib.blocks.get(c.id) : undefined, it = c.kind === 'item' ? itemOf(c.id) ?? undefined : undefined;
  if (c.kind === 'block' && !b) return { pass: false, says: `no block ${c.id} in the library` };
  if (c.kind === 'item' && !it) return { pass: false, says: `no entry ${c.id} in the inventory` };
  switch (g) {
    case 'documented': {
      if (b) { const ps = lib.portsOf(b, lib.defaultsOf(b)), words = b.says.split(/\s+/).filter(Boolean).length, untyped = [...ps.inputs, ...ps.outputs].filter((p) => !p.type);
        return words >= 6 && !untyped.length && b.name ? { pass: true, says: `${words} words; ${ps.inputs.length} inputs, ${ps.outputs.length} outputs, every one typed` } : { pass: false, says: `${words < 6 ? `says ${words} words of what it does` : ''}${untyped.length ? ` ${untyped.length} ports untyped` : ''}`.trim() }; }
      return it!.says && it!.path.length ? { pass: true, says: `${it!.name}: ${it!.path.join(' / ')}` } : { pass: false, says: 'nothing said of what it is, or no place for it' };
    }
    case 'unique': {
      if (b) { if (b.sink && !lib.portsOf(b, lib.defaultsOf(b)).outputs.length) return { pass: null, says: 'a sink: what it shows or does is its point, not an answer to compare' };
        const twin = [...lib.blocks.values()].find((x) => x.id !== b.id && lib.same(x, b)); return twin ? { pass: false, says: `does what ${twin.name} (${twin.id}) does: one owner per concern` } : { pass: true, says: 'no other block gives its answers with its ports' }; }
      const twin = [...INVENTORY.values()].find((x) => x.id !== it!.id && x.kind === it!.kind && x.name.toLowerCase() === it!.name.toLowerCase() && JSON.stringify(x.of) === JSON.stringify(it!.of));
      return twin ? { pass: false, says: `the same as ${twin.id}` } : { pass: true, says: 'no other entry of its name and contents' };
    }
    case 'versatile': {
      if (b) { const ps = lib.portsOf(b, lib.defaultsOf(b)), others = [...lib.blocks.values()].filter((x) => x.id !== b.id && !x.id.startsWith('group.'));
        const takers = ps.outputs.length ? others.filter((x) => lib.portsOf(x, lib.defaultsOf(x)).inputs.some((i) => ps.outputs.some((o) => o.type === 'any' || i.type === 'any' || lib.fits(o, i).ok))).length : 0;
        const givers = ps.inputs.length ? others.filter((x) => lib.portsOf(x, lib.defaultsOf(x)).outputs.some((o) => ps.inputs.some((i) => o.type === 'any' || i.type === 'any' || lib.fits(o, i).ok))).length : 0;
        const okOut = !ps.outputs.length || b.sink || takers >= 2, okIn = !ps.inputs.length || givers >= 2;
        return { pass: okOut && okIn, says: `${takers} blocks take what it gives, ${givers} give what it takes; in ${b.domains.length} field${b.domains.length === 1 ? '' : 's'}${!okOut ? ': almost nothing takes what it gives' : !okIn ? ': almost nothing gives what it takes' : ''}` }; }
      const users = [...INVENTORY.values()].filter((x) => x.of.some((ch) => ch.id === it!.id)).length;
      return users || it!.kind === 'product' ? { pass: true, says: it!.kind === 'product' ? 'a product: used as itself' : `in ${users} other entries` } : { pass: false, says: 'nothing is made with it' };
    }
    case 'sourced': {
      if (b) {
        // (a node that says its figures are a standard's, a maker's or measured names where from)
        const ev = evidenceOf(b).kind;
        if ((ev === 'specified' || ev === 'measured') && !b.sources?.length) return { pass: false, says: `its evidence is ${ev}, and it cites nothing` };
        // (a law's figures are its own and are always sourced; any other block is held to it where it states figures (a
        // number with its unit) in what it says: a sum or a box of the sizes it is given has none of its own)
        const figures = ownWords(b.says).match(FIGURES) ?? [];
        if (b.kind !== 'law' && !figures.length) return { pass: null, says: 'states no figures of its own: what it gives is worked from what it is given' };
        return b.sources?.length || CITES.test(b.says) || (b.valid && CITES.test(b.valid)) ? { pass: true, says: b.sources?.length ? `${b.sources.length} source${b.sources.length > 1 ? 's' : ''}: ${b.sources[0]!.cite.slice(0, 80)}` : `its figures (${figures.slice(0, 3).join(', ')}) said as typical, an estimate, or by whom` } : { pass: false, says: `states ${figures.slice(0, 3).join(', ')} and says nowhere where ${figures.length > 1 ? 'they come' : 'it comes'} from` }; }
      if (it!.kind === 'material' || it!.kind === 'element') return { pass: null, says: 'a material: its make-up is the table\'s own' };
      return it!.says ? { pass: true, says: it!.says.slice(0, 100) } : { pass: false, says: 'nothing said of where it comes from' };
    }
    case 'tests': {
      if (!b) return { pass: null, says: 'an entry: no tests of its own' };
      const t = await lib.test(b); return t.ok ? { pass: true, says: `${t.ran} test${t.ran > 1 ? 's' : ''} pass` } : { pass: false, says: t.ran ? t.fails.slice(0, 2).join('; ') : 'no tests: a draft until it has some' };
    }
    case 'robust': {
      if (!b) return { pass: null, says: 'an entry: nothing to push' };
      if (!b.run || !b.pure) return { pass: null, says: b.run ? 'it changes the world when it runs: not pushed here' : 'a pipeline: its blocks are pushed each on its own' };
      const set = { ...lib.defaultsOf(b), ...(b.tests?.[0]?.set ?? {}) }, base = inputsOf(lib, b), nums = lib.portsOf(b, set).inputs.filter(isNum).slice(0, 4);
      let runs = 0, refused = 0; const crashes: string[] = [], t0 = Date.now();
      const tryIt = async (inp: Record<string, unknown>, label: string) => { runs++; try { const o = await b.run!(inp, { set }); if (hasNaN(o)) crashes.push(`${label}: NaN given without a word`); } catch (e) { const m = String((e as Error)?.message ?? e); if (CRASH.test(m) || e instanceof TypeError || e instanceof RangeError || e instanceof ReferenceError || m.length < 6) crashes.push(`${label}: crashed (${m.slice(0, 60)})`); else refused++; } };
      await tryIt(base, 'its defaults');
      // (a block that makes parts is pushed to a tenth and ten times: a thousand times its size would be drawn, not refused,
      // where it holds; the others to a thousandth and a thousand times)
      const makes = lib.portsOf(b, set).outputs.some((p) => p.type === 'part' || p.type === 'assembly'), f = makes ? 10 : 1000, fw = makes ? 'ten times' : 'a thousand times', fs = makes ? 'a tenth' : 'a thousandth';
      for (const p of nums) { const d0 = Number(base[p.name] ?? p.default ?? 1) || 1; for (const [k, v] of [['0', 0], [fs, d0 / f], [fw, d0 * f], ['negative', -Math.abs(d0)]] as [string, number][]) { if (Date.now() - t0 > 4000) break; await tryIt({ ...base, [p.name]: v }, `${p.name} ${k}`); } }
      return crashes.length ? { pass: false, says: `${crashes.length} of ${runs}: ${crashes.slice(0, 2).join('; ')}` } : { pass: true, says: `${runs} pushes: ${runs - refused} answered, ${refused} refused in words, none crashed` };
    }
    case 'known': {
      let ids: string[] = [], by = c.id;
      if (it) ids = [it.id];
      else { const m = await madeBy(lib, b!); if (!m.parts.length) return { pass: null, says: m.error ? `makes nothing with its defaults (${m.error.slice(0, 60)})` : 'makes no parts' };
        const found = new Set<string>(); const walk = (p: Part) => { if (p.item) found.add(p.item); for (const q of p.parts ?? []) walk(q); }; m.parts.forEach(walk); ids = [...found]; by = `${b!.name} (what it makes)`; }
      const us = unknownsUnder(ids, by);
      return us.length ? { pass: false, says: `${us.length} not known all the way down: ${us.slice(0, 4).map((u) => `${u.id} (${u.why})`).join(', ')}`, unknowns: us } : { pass: true, says: `${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}, every one known to its materials` };
    }
    case 'explodes': {
      if (!b) return { pass: null, says: 'an entry: its recipe is held by Known' };
      if (lib.portsOf(b, lib.defaultsOf(b)).inputs.some((p) => (p.type === 'part' || p.type === 'assembly') && !p.optional)) return { pass: null, says: 'it changes what it is given: what it is given comes through its own gauntlet' };
      const m = await madeBy(lib, b); if (!m.parts.length) return { pass: null, says: 'makes no parts' };
      const aud = m.parts.map((p) => explodeAudit(p)), lumps = aud.flatMap((a) => a.faked), missing = aud.flatMap((a) => a.missing), unbuilt = Math.max(0, ...aud.map((a) => a.unbuilt)), saidOf = aud.map((a, i) => a.unbuilt > 1e-9 ? `${m.of[i] || 'it'} ${(a.unbuilt * 100).toFixed(1)} %` : '').filter(Boolean);
      // (a piece drawn in a material nothing knows the density of weighs nothing, without a word: it is not built)
      const unweighed = new Set<string>(); const weigh = (p: Part) => { if (p.shape && p.kg === undefined && (!p.mat || !DENSITY[p.mat])) unweighed.add(`${p.name} (${p.mat ?? 'no material'})`); for (const q of p.parts ?? []) weigh(q); }; m.parts.forEach(weigh);
      if (unweighed.size) return { pass: false, says: `${unweighed.size} kinds of piece weigh nothing: no density for ${[...unweighed].slice(0, 4).join(', ')}` };
      const us: Unknown[] = lumps.map((f) => ({ id: f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-'), why: 'drawn as one piece' as Why, wantedBy: [b.name], words: f.name }));
      return !lumps.length && !missing.length && unbuilt < 1e-9 ? { pass: true, says: `${aud.reduce((x, a) => x + a.pieces, 0)} pieces, every one a single part; every recipe met` } : { pass: false, says: [lumps.length ? `${lumps.length} drawn as one piece though made of parts (${[...new Set(lumps.map((f) => f.is))].slice(0, 3).join(', ')})` : '', missing.length ? `${missing.length} recipes not met (${missing.slice(0, 2).join('; ')})` : '', unbuilt > 0 ? (m.of.some(Boolean) ? `mass only said: ${saidOf.join(', ')}` : `${(unbuilt * 100).toFixed(1)} % of its mass only said`) : ''].filter(Boolean).join('; '), unknowns: us };
    }
    case 'clean': {
      if (!b) return { pass: null, says: 'an entry: nothing drawn to check' };
      const m = await madeBy(lib, b); if (!m.parts.length) return { pass: null, says: 'makes no parts' };
      const rs = m.parts.map((p) => rulesOf(p)), f = rs.flatMap((r) => r.findings);
      // (a block that makes many real models: each model's count said, the worst first)
      const per = m.of.some(Boolean) ? rs.map((r, i) => [m.of[i]!, r.findings.length] as const).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([v, n]) => `${v} ${n}`) : [];
      return f.length ? { pass: false, says: `${f.length} finding${f.length > 1 ? 's' : ''}${per.length ? ` (${per.join(', ')} of ${rs.length})` : ''}: ${f.slice(0, 2).map((x) => x.says).join('; ')}` } : { pass: true, says: `${rs.reduce((a, r) => a + r.pieces, 0)} pieces: nothing runs into, rubs or overheats anything` };
    }
  }
}
/** A candidate through the gates, in order; at the first that fails, the rest still run unless `stop` (so everything
 *  wrong with it is said at once). Approved when none fails. Its verdict kept; what it wants goes to the queue. */
export async function runGauntlet(lib: Lib, cands: Candidate[], o: { gates?: GateId[]; stop?: boolean; onVerdict?: (v: Verdict) => void; onGate?: (c: Candidate, r: GateResult) => void; tick?: () => Promise<void>; halt?: { stop: boolean } } = {}): Promise<Verdict[]> {
  const out: Verdict[] = [], gs = o.gates ?? [...GATES];
  for (const c of cands) {
    if (o.halt?.stop) break;
    const results: GateResult[] = [];
    for (const g of gs) {
      const t0 = Date.now(); let r: Omit<GateResult, 'ms' | 'gate'>;
      try { r = await gate(lib, g, c); } catch (e) { r = { pass: false, says: `the gate itself stopped: ${(e as Error).message}` }; }
      results.push({ gate: g, ...r, ms: Date.now() - t0 }); o.onGate?.(c, results[results.length - 1]!); if (o.tick) await o.tick();
      for (const u of r.unknowns ?? []) enqueue(u);
      if (o.stop && r.pass === false) break;
    }
    const failed = results.filter((r) => r.pass === false).map((r) => r.gate), v: Verdict = { cand: c, results, approved: !failed.length, at: Date.now(), failed };
    verdicts.set(keyOf(c), v); out.push(v); o.onVerdict?.(v);
    emit(v.approved ? 'approved' : 'rejected', c.id, v.approved ? `${c.name}: through all ${results.filter((r) => r.pass).length} gates that apply` : `${c.name}: failed ${failed.join(', ')}`);
  }
  return out;
}

/** What the blocks among the candidates draw with their defaults: the drawings the research loop reads back. */
export async function drawingsOf(lib: Lib, ids: string[]): Promise<Part[]> { const out: Part[] = []; for (const id of ids) { const b = lib.blocks.get(id); if (b) out.push(...(await madeBy(lib, b)).parts); } return out; }

// ==== the sorter: what the unknowns have in common ======================================================================
/** The words an id or a name says, its sizes taken out ("screw-m3x10" → "screw"; "m20a-fks.knock" → "knock"). */
export function wordsOf(id: string): string { return (itemOf(id)?.name ?? id.replace(/^[a-z0-9-]+\./, '')).toLowerCase().replace(/[-_.(),/]+/g, ' ').replace(/\b(m\d+(x[\d.]+)?|\d+([.x]\d+)*\s*(mm|cm|m|in|v|w|a|ah)?|[0-9]+)\b/g, ' ').replace(/\s+/g, ' ').trim(); }
/** The kind of thing words name, by how such things are made: one maker makes all of a kind. */
export const CLASSES: { cls: string; re: RegExp; maker: string; says: string }[] = [
  { cls: 'fastener', re: /\b(bolt|screw|nut|stud|washer|rivet|dowel|pin|clip)s?\b/, maker: 'make.fastener', says: 'headed, threaded or pressed: one fastener node of any size' },
  { cls: 'winding', re: /\b(coil|winding|solenoid|stator|armature|choke|inductor|transformer)s?\b/, maker: 'make.wound', says: 'wire wound on a former, round a band, or round a pole' },
  { cls: 'spring', re: /\bsprings?\b/, maker: 'make.coil', says: 'wire coiled round a mandrel' },
  { cls: 'gear', re: /\b(gear|sprocket|pinion|rotor teeth|ring gear)s?\b/, maker: 'make.gear', says: 'teeth cut round a bore' },
  { cls: 'sensor', re: /\b(sensor|switch|probe|transducer|sender)s?\b/, maker: 'make.sensor', says: 'a case, an element that senses, a plug: one sensor node of any kind' },
  { cls: 'seal', re: /\b(seal|gasket|o ring|o-ring|grommet|boot)s?\b/, maker: 'shape.lathe', says: 'a ring of elastomer or a cut sheet' },
  { cls: 'bearing', re: /\b(bearing|bush|bushing)s?\b/, maker: 'part.family', says: 'a standard size from its family' },
  { cls: 'tube', re: /\b(hose|pipe|tube|line|duct|rail|runner)s?\b/, maker: 'shape.tube', says: 'a tube along a path, bent at its corners' },
  { cls: 'wiring', re: /\b(wire|lead|cable|harness|connector|plug|terminal|loom)s?\b/, maker: 'shape.tube', says: 'leads along paths and moulded plugs' },
  { cls: 'housing', re: /\b(housing|case|cover|casing|body|shell|can|enclosure|pan|box)s?\b/, maker: 'make.enclosure', says: 'a shell round what it holds' },
  { cls: 'sheet', re: /\b(plate|bracket|shield|panel|sheet|flange|strap)s?\b/, maker: 'shape.extrude', says: 'cut and bent from sheet, or a section extruded' },
  { cls: 'turned', re: /\b(shaft|pulley|hub|ring|collar|spacer|piston|valve|disc|disk|wheel)s?\b/, maker: 'shape.lathe', says: 'turned about its axis' },
  { cls: 'fluid', re: /\b(pump|injector|nozzle|regulator|filter|cooler|radiator)s?\b/, maker: 'combine', says: 'a housing round a moving or flowing part' },
];
export const classOf = (words: string): (typeof CLASSES)[number] | undefined => CLASSES.find((c) => c.re.test(words));
export interface Cluster { key: string; cls: string; head: string; members: Unknown[]; demand: number; maker: string; says: string }
/** The unknowns sorted into clusters by what they have in common: the kind of thing each is (how it is made, so one
 *  maker node makes them all) and the word that names it (the same thing in other sizes and places). The most wanted
 *  first: a cluster's demand is how many things want any of it. */
export function sortUnknowns(us: Unknown[]): Cluster[] {
  const by = new Map<string, Cluster>();
  for (const u of us) {
    const words = u.words || wordsOf(u.id), c = classOf(words), head = words.split(' ').filter((w) => w.length > 2 && !/^(the|its|and|of|for|with)$/.test(w)).pop() ?? words, key = c ? c.cls : `other:${head}`;
    const cl = by.get(key) ?? by.set(key, { key, cls: c?.cls ?? 'other', head: c ? c.cls : head, members: [], demand: 0, maker: c?.maker ?? '', says: c?.says ?? 'nothing in common with any kind yet: researched one by one' }).get(key)!;
    cl.members.push(u); cl.demand += Math.max(1, u.wantedBy.length);
  }
  return [...by.values()].sort((a, b) => b.demand - a.demand || b.members.length - a.members.length);
}

// ==== resolvers =========================================================================================================
const PROCESS_OF = (p: Part): string => {
  const s = p.shape as Record<string, unknown> | undefined, m = p.mat ?? '', poly = /^(pbt|nylon|pp|pe|abs|pvc|pc|pom|ptfe|epdm|nbr|rubber|silicone|fkm|pu)$/.test(m);
  if (p.item === 'winding' || m === 'magnet-wire') return 'wind';
  if (poly) return 'mould'; if (p.finish === 'cast' || /cast/.test(m)) return 'cast';
  if (s && 'tube' in s) return 'bend'; if (s && 'prism' in s) return 'extrude'; if (s && ('lathe' in s || 'cyl' in s)) return 'machine'; if (s && 'box' in s && Math.min(...(s.box as number[])) < 0.003) return 'stamp';
  return 'machine';
};
/** What a drawn thing says it is made of, read back as inventory entries: each tagged piece holding the tagged pieces
 *  in it (or, a leaf, its material), its process judged from its shape and material (an estimate). Only what the
 *  inventory does not have is proposed. The drawing is its source: its maker's file says where its sizes come from. */
export function proposeFromDrawing(root: Part, from: string): Proposal[] {
  const out = new Map<string, Proposal>();
  const visit = (p: Part): { id: string } | null => {
    const kids = (p.parts ?? []).map(visit).filter((x): x is { id: string } => !!x);
    if (!p.item) return null;
    if (itemOf(p.item) || keptItem(p.item) || out.has(p.item)) return { id: p.item };
    const counts = new Map<string, number>(); for (const k of kids) counts.set(k.id, (counts.get(k.id) ?? 0) + 1);
    // (a leaf, or a piece whose pieces carry no tags: its material(s))
    if (!counts.size) { const mats = new Set<string>(); const m = (q: Part) => { if (q.shape && q.mat && itemOf(q.mat)) mats.add(q.mat); for (const r of q.parts ?? []) m(r); }; m(p); for (const x of mats) counts.set(x, 1); }
    out.set(p.item, { id: p.item, name: p.name, of: [...counts].map(([id, n]) => ({ id, n })), make: kids.length ? 'assemble' : PROCESS_OF(p), level: 'drawn', from, says: `as drawn${p.says ? `: ${p.says.slice(0, 120)}` : ''} (its process judged from its shape and material, an estimate)` });
    return { id: p.item };
  };
  visit(root); return [...out.values()];
}
/** An unknown filled in from its nearest known sibling: the entry whose words share the most with it and whose own
 *  contents are known. Said as inferred, never as known: it waits for a source (a task says so). */
export function proposeByAnalogy(u: Unknown): Proposal | null {
  const STOP = /^(the|and|its|for|with|from|after|before|into|one|two|each|of|or|to|on|in|a|an)$/, uw = u.words || wordsOf(u.id), ws = new Set(uw.split(' ').filter((w) => w.length > 2 && !STOP.test(w))), c = classOf(uw);
  // (where the unknown is in a catalogue (what wants it is filed somewhere), its sibling is from the same top of it: an
  // engine's sensor is not inferred from a body's tendon)
  const tops = new Set(u.wantedBy.map((w) => itemOf(w)?.path[0]).filter(Boolean)); const own = itemOf(u.id)?.path[0]; if (own && own !== 'Researched' && own !== 'Proposed') tops.add(own);
  let best: Item | null = null, score = 0;
  for (const it of INVENTORY.values()) {
    if (it.kind === 'material' || it.kind === 'element' || !it.of.length || it.id === u.id || it.path[0] === 'Researched' || it.path[0] === 'Proposed') continue;
    if (/^(Life|Food|Body)$/.test(it.path[0] ?? '') && !tops.has(it.path[0])) continue;
    const iw = wordsOf(it.id).split(' '), shared = iw.filter((w) => ws.has(w)).length, same = c && c.re.test(wordsOf(it.id));
    // (the same kind of thing (a sensor for a sensor), and a word in common beyond the kind's own)
    if (c && !same) continue;
    const sc = shared + (same ? 0.5 : 0);
    if (sc > score && shared > 1) { score = sc; best = it; }
  }
  // (two words in common at least (a rocker arm and a rocker arm of another engine; an exhaust heat shield and a truck's):
  // one word alone (a kettle's "electric", a ball valve's "valve") is a guess, and a guess is left unknown, to be researched)
  if (!best || score < 2) return null;
  return { id: u.id, name: (u.words || u.id).replace(/-/g, ' '), of: best.of.map((x) => ({ ...x })), make: best.make, level: 'inferred', from: best.id, says: `inferred from ${best.name} (${best.id}), which it shares its words${c ? ` and its kind (${c.cls})` : ''} with: to be confirmed by a source` };
}
/** An unknown of a kind one maker makes, filled in as that maker would make it for what it is: a sensor by what it senses
 *  (a temperature, pressure or oxygen sensor a threaded probe; a knock sensor a puck; a position or manifold pressure
 *  sensor a block on a lug), its element the one that senses that. Said as inferred: how such a thing is made, not yet
 *  this one's source. */
export function proposeByMaker(u: Unknown): Proposal | null {
  const w = u.words || wordsOf(u.id), c = classOf(w); if (c?.cls !== 'sensor') return null;
  const body = /knock/.test(w) ? 'puck' : /position|manifold|map\b|hall|speed|throttle/.test(w) ? 'block' : 'threaded';
  const element = /knock/.test(w) ? 'piezo' : /oxygen|o2|air.fuel|lambda/.test(w) ? 'zirconia' : /temperature|thermo/.test(w) ? 'thermistor' : /pressure|map\b|manifold/.test(w) ? 'strain' : 'hall';
  const base = itemOf(`sensor-${body}`); if (!base) return null;
  return { id: u.id, name: w, of: [...base.of.map((x) => ({ ...x })), { id: `${element}-element`, n: 1 }], make: 'assemble', level: 'inferred', from: `make.sensor (${body}, ${element})`, says: `as the sensor node makes a ${w}: a ${body === 'threaded' ? 'threaded probe' : body} with a ${element} element (how such a sensor is made: to be confirmed by a source)` };
}
export interface Resolvers { drawing?: Part[]; web?: (u: Unknown) => Promise<Proposal | null> }
/** A proposal kept, unless one is already, or the entry already lists what is in it. Whether it was kept. */
function propose(p: Proposal): boolean { if (proposals.has(p.id) || itemOf(p.id)?.of.length) return false; proposals.set(p.id, p); emit('proposed', p.id, `${p.id}: ${p.level}, from ${p.from}`); return true; }

// ==== the loop, to a fixed point ========================================================================================
const shelf = (i: Item) => i.path.slice(0, 2).join('/');
export interface Round { round: number; unknowns: number; clusters: number; resolved: { family: number; table: number; reference: number; drawn: number; inferred: number; web: number }; left: number }
/** From the roots down, round after round: find what is unknown under them (with what is proposed so far), sort it,
 *  and resolve the most wanted clusters first by each resolver in turn; what is resolved is walked next round for
 *  what it wants in its turn. Stops at a fixed point (a round resolves nothing new), when nothing is left, or after
 *  so many rounds. Proposals are kept apart from the inventory: the drawn ones and the web's (sourced) can be fed in
 *  (approveProposals); the inferred wait for a source. */
export async function researchLoop(roots: string[], r: Resolvers = {}, o: { rounds?: number; by?: string; keep?: boolean } = {}): Promise<{ rounds: Round[]; left: Unknown[]; clusters: Cluster[]; fixed: boolean }> {
  const rounds: Round[] = [], most = o.rounds ?? 12, drawn = new Map<string, Proposal>();
  for (const p of r.drawing ?? []) for (const x of proposeFromDrawing(p, o.by ?? 'the drawing')) drawn.set(x.id, x);
  const drawnByName = new Map<string, Proposal>(); for (const x of drawn.values()) if (x.name) drawnByName.set(wordsOf(x.name), x);
  // (a name drawn as it is (a knock sensor), or as the end of a longer one (a cylinder block casting drawn as a block casting))
  const byName = (w: string): Proposal | undefined => drawnByName.get(w) ?? [...drawnByName.entries()].filter(([n]) => n.includes(' ') && (w.endsWith(` ${n}`) || n.endsWith(` ${w}`) && w.includes(' '))).sort((a, b) => b[0].length - a[0].length)[0]?.[1];
  let left: Unknown[] = [], fixed = false;
  for (let k = 1; k <= most; k++) {
    left = unknownsUnder(roots, o.by ?? '');
    const clusters = sortUnknowns(left), res = { family: 0, table: 0, reference: 0, drawn: 0, inferred: 0, web: 0 };
    // (the entries of the table each unknown is named as; where one name is two entries (an engine's piston, a hydraulic
    // cylinder's), the one from the shelf the others' single matches come from)
    const tableByWords = new Map<string, Item[]>(), want = new Set(left.map((u) => wordsOf(u.id)));
    for (const i of INVENTORY.values()) { if (!i.of.length || i.kind === 'material' || i.path[0] === 'Researched' || i.path[0] === 'Proposed') continue; const w = wordsOf(i.id); if (want.has(w) && !left.some((u) => u.id === i.id)) (tableByWords.get(w) ?? tableByWords.set(w, []).get(w)!).push(i); }
    const shelves = new Map<string, number>(); for (const xs of tableByWords.values()) if (xs.length === 1) shelves.set(shelf(xs[0]!), (shelves.get(shelf(xs[0]!)) ?? 0) + 1);
    for (const cl of clusters) for (const u of cl.members) {
      if (proposals.has(u.id) && u.why === 'not in the table') continue;
      // (a family that makes that very size, for what is not in the table at all)
      if (u.why === 'not in the table') { const f = resolve(u.id.replace(/-/g, ' ')); if (f && typeof f === 'object' && f.sized) { res.family++; emit('resolved', u.id, `${u.id}: made by its family (${f.id})`); continue; } }
      // (the same thing in the table under another id, its contents listed: named as it is, or as its words are)
      { const w = wordsOf(u.id), sames = tableByWords.get(w) ?? [], same = sames.length > 1 ? [...sames].sort((a, b) => (shelves.get(shelf(b)) ?? 0) - (shelves.get(shelf(a)) ?? 0))[0] : sames[0];
        if (same && propose({ id: u.id, name: same.name, of: same.of.map((c) => ({ ...c })), make: same.make, level: 'table', from: same.id, says: `the same as ${same.name} (${same.id}) in the table` })) { res.table++; continue; } }
      // (a researched reference, entered in the inventory under Researched)
      const ref = [...INVENTORY.values()].find((i) => i.path[0] === 'Researched' && i.id.endsWith(`.${u.id}`) && i.of.length); if (ref && u.why === 'not in the table' && propose({ id: u.id, name: ref.name, of: ref.of, make: ref.make, level: 'drawn', from: ref.id, says: ref.says })) { res.reference++; continue; }
      // (the drawing that draws it: by its tag, else by its name (a researched entry named as the drawn piece is))
      const d = drawn.get(u.id) ?? byName(wordsOf(u.id)); if (d && propose({ ...d, id: u.id, says: `${d.says} (as ${d.id} is drawn)` })) { res.drawn++; continue; }
      // (the web, where the page can reach it)
      if (r.web && !proposals.has(u.id)) { try { const w = await r.web(u); if (w && propose(w)) { res.web++; continue; } } catch { /* its fault said by the node that asked */ } }
      // (a known sibling: inferred)
      if (!proposals.has(u.id) && (u.why === 'not in the table' || u.why === 'nothing in it listed')) { const a = proposeByMaker(u) ?? proposeByAnalogy(u); if (a && propose(a)) res.inferred++; }
    }
    const got = res.family + res.table + res.reference + res.drawn + res.inferred + res.web, after = unknownsUnder(roots, o.by ?? '');
    rounds.push({ round: k, unknowns: left.length, clusters: clusters.length, resolved: res, left: after.length });
    emit('round', roots.join(','), `round ${k}: ${left.length} unknown in ${clusters.length} clusters; ${got} resolved; ${after.length} left`);
    if (o.keep !== false) for (const u of after) enqueue(u);
    left = after;
    if (!got || !after.length) { fixed = !got; break; }
  }
  if (o.keep !== false) for (const u of left) enqueue(u);
  return { rounds, left, clusters: sortUnknowns(left), fixed };
}
/** The proposals with a source (drawn, or from the web, or from a reference) fed into the inventory, children first so
 *  each finds what it holds; the inferred stay proposed until a source confirms them. */
export function approveProposals(level: ('table' | 'drawn' | 'web')[] = ['table', 'drawn', 'web'], only?: string[]): { added: number; refused: string[] } {
  const ps = proposalsAll().filter((p) => level.includes(p.level as 'drawn') && (!only || only.includes(p.id)) && !itemOf(p.id)?.of.length), lines: string[] = [];
  if (!ps.length) return { added: 0, refused: [] };
  const done = new Set<string>(), visit = (p: Proposal) => { if (done.has(p.id)) return; done.add(p.id); for (const c of p.of) { const q = proposals.get(c.id); if (q && level.includes(q.level as 'drawn')) visit(q); } lines.push([p.id, p.name, `Proposed/${p.level}`, p.of.length && p.make === 'assemble' ? 'assembly' : 'part', p.make, p.of.map((c) => (c.n > 1 ? `${c.id}*${c.n}` : c.id)).join(' '), `${p.says} [from ${p.from}]`.replace(/[|;\n]/g, ',')].join(' | ')); };
  for (const p of ps) visit(p);
  const f = feed(lines.join('\n')); for (const it of f.added) { proposals.delete(it.id); queue.delete(it.id); emit('resolved', it.id, `${it.id} entered in the inventory`); }
  return { added: f.added.length, refused: f.refused };
}

// ==== tasks: what is left to do, each done when what it waits on holds ===================================================
export interface Task { id: string; title: string; kind: 'research' | 'confirm' | 'fix'; done: boolean; says: string }
export function tasksNow(): Task[] {
  const out: Task[] = [];
  for (const cl of sortUnknowns(unknownQueue().filter((u) => !itemOf(u.id) && !proposals.has(u.id)))) out.push({ id: `research:${cl.key}`, title: `Research ${cl.members.length > 1 ? `${cl.members.length} ${cl.head}s` : cl.members[0]!.id}`, kind: 'research', done: false, says: `${cl.says}${cl.maker ? `; made by ${cl.maker}` : ''}; wanted ${cl.demand} times` });
  for (const p of proposalsAll().filter((x) => x.level === 'inferred')) out.push({ id: `confirm:${p.id}`, title: `Confirm ${p.name}`, kind: 'confirm', done: !!itemOf(p.id)?.of.length, says: p.says });
  for (const v of allVerdicts().filter((x) => !x.approved)) out.push({ id: `fix:${v.cand.id}`, title: `Fix ${v.cand.name}`, kind: 'fix', done: false, says: v.results.filter((r) => r.pass === false).map((r) => `${r.gate}: ${r.says}`).join('; ') });
  return out;
}

// ==== deletion, guarded ==================================================================================================
/** Takes out what failed or is a duplicate, never what is built in or seeded: a block you made (or Claude made) from
 *  the library, an entry you fed from the inventory, a proposal, a queued unknown. Dry run unless `really`. */
export function deleteThing(lib: Lib, what: { kind: 'block' | 'item' | 'proposal' | 'unknown'; id: string }, really = false): { ok: boolean; says: string } {
  if (what.kind === 'block') { const b = lib.blocks.get(what.id); if (!b) return { ok: false, says: `no block ${what.id}` }; if (b.by === 'built in' || b.by === 'engine') return { ok: false, says: `${b.name} is built in: it stays (fix it, do not delete it)` }; if (!really) return { ok: true, says: `would take out ${b.name}` }; lib.blocks.delete(what.id); verdicts.delete(`block:${what.id}`); emit('deleted', what.id, `block ${b.name} taken out`); return { ok: true, says: `${b.name} taken out` }; }
  if (what.kind === 'item') { const it = itemOf(what.id); if (!it) return { ok: false, says: `no entry ${what.id}` }; if (!it.yours) return { ok: false, says: `${it.name} is seeded: it stays` }; if (!really) return { ok: true, says: `would take out ${it.name}` }; const r = removeItem(what.id); if (r.ok) { verdicts.delete(`item:${what.id}`); emit('deleted', what.id, r.says); } return r; }
  if (what.kind === 'proposal') { if (!proposals.has(what.id)) return { ok: false, says: `no proposal ${what.id}` }; if (really) { proposals.delete(what.id); emit('deleted', what.id, `proposal ${what.id} dropped`); } return { ok: true, says: `${really ? '' : 'would drop '}proposal ${what.id}` }; }
  if (!queue.has(what.id)) return { ok: false, says: `${what.id} is not queued` }; if (really) { queue.delete(what.id); emit('deleted', what.id, `${what.id} taken off the queue`); } return { ok: true, says: `${really ? '' : 'would take '}${what.id} off the queue` };
}

// ==== the web as a resolver ==============================================================================================
/** Wikidata as a resolver for the loop: an unknown's parts (and materials) as its entity lists them, each a new unknown
 *  in its turn (so the loop goes down them), its entity's address its source. Only where the page can reach the web. */
export function webResolver(ask: (query: string) => Promise<WebParts>): (u: Unknown) => Promise<Proposal | null> {
  return async (u) => {
    const w = await ask(u.words || wordsOf(u.id)); if (!w.parts.length && !w.materials.length) return null;
    const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const mats = w.materials.map((m) => { const it = findItem(m.label); return it && (it.kind === 'material' || it.kind === 'element') ? it.id : slug(m.label); });
    return { id: u.id, name: w.label, of: [...w.parts.map((p) => ({ id: slug(p.label), n: 1 })), ...mats.map((id) => ({ id, n: 1 }))], make: w.parts.length ? 'assemble' : 'machine', level: 'web', from: w.url, says: `${w.description || w.label}: its parts and materials as Wikidata lists them (${w.url})` };
  };
}
