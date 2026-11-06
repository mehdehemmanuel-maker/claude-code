// The parts browser (decision 0026, the user 2026-11-06: "really populate the library ... and organize it better for
// navigation"): every piece in the library by its trade (chips), then its category, then its family with every size its
// table has, and a search box that finds a part by what it is or its size ("M8 nut", "608 bearing", "2x4", "Raspberry
// Pi 4") through the catalogue (navigate.ts partsCatalogue, findParts). A size tapped is handed to the page that opened
// it, which adds the piece as its by-hand step does: the phone page (vibe.ts) into its by-hand form and onto what is
// there by the operation chosen (agent.ts joinPlan), the dashboard (dashboard.ts) placed on the board and shown. The tree
// is worked out apart from the page (partsTree), so a test holds it; nothing here runs until a page mounts it.

// Decision 0028 (the user, 2026-11-06: "make it so it can orchestrate and save for later use each part"): the parts
// remembered (memory.ts) are an aisle of their own, Yours / Remembered, each with what it was made for, how often it was
// used and what was checked when it was kept, placed like any part and deleted by a press (from this browser's store,
// the library and, on claude.ai, the page's shared store). Here too what the pages share of it: where each page starts
// (startRemembered: every part a block, the shared store brought in), a build's orchestration as a tree (orchestration,
// orchestrationHtml: read from the steps composeBuild streams, with its run's tree laid over where it gives one), and the
// board open kept as one part, named by the person (keepBuild, askName).

import { findParts, partsCatalogue, type PartEntry, type PartHit } from '../navigate';
import { LIBRARY, block, defaultsOf, portsOf } from '../blocks';
import { Engine, collapse, placeBlock, wire } from '../dataflow';
import { nodesOf, type Board } from '../boards';
import * as memory from '../memory';
import { recall, registerSaved, remember, savedParts, setRemote, syncRemote, type SavedPart } from '../memory';
import { groupsOf, type ComposeStep } from '../agent';
import { inViewer, partsStore, whyNot, type PartsStore } from './viewer';

/** A remembered part as the browser lists it: what it was made for, its uses, what was checked when it was kept. */
export interface Kept { from: string; uses: number; checked: SavedPart['checked']; by: SavedPart['by']; made: string; says: string }
/** A family row: its sizes, or (on Yours / Remembered) the part remembered. */
export interface FamilyRow { id: string; name: string; sizes: string[]; envelope: boolean; kept?: Kept }
/** What the browser shows: the trades (the one open marked), the open trade's categories with their families and sizes,
 *  and, where something is searched, what it finds. The aisle of parts remembered (`yours`) comes before the trades, kept
 *  apart from them and from the catalogue's totals (it is this browser's, not the library's). */
export interface PartsTree {
  trades: { name: string; families: number; sizes: number }[];
  yours: { name: string; parts: number };
  trade: string;
  categories: { name: string; families: FamilyRow[] }[];
  hits: PartHit[];
  total: { families: number; sizes: number };
}
/** The aisle of the parts remembered (decision 0028). */
export const YOURS = 'Yours / Remembered';
const envelopeOf = (e: PartEntry) => /an envelope/i.test(e.says);
const keptOf = (p: SavedPart): FamilyRow => ({ id: p.id, name: p.name, sizes: [], envelope: false, kept: { from: p.from, uses: p.uses, checked: p.checked, by: p.by, made: p.made, says: p.says } });
/** The browser's tree for a trade (the first where none or an unknown one is named; Yours / Remembered its own) and a
 *  search (none where blank; the parts remembered that match after the catalogue's). */
export function partsTree(o: { trade?: string; q?: string } = {}): PartsTree {
  const cat = partsCatalogue(), mine = savedParts().filter((p) => block(p.id)), yours = o.trade === YOURS;
  const open = yours ? undefined : cat.find((t) => t.name === o.trade) ?? cat[0];
  const newest = [...mine].sort((a, b) => b.made.localeCompare(a.made) || b.uses - a.uses);
  const found = o.q?.trim() ? recall(o.q, 8).filter((p) => block(p.id)).map((p): PartHit => ({ id: p.id, name: p.name, aisle: YOURS, says: p.says, score: 0, full: false })) : [];
  return { trades: cat.map((t) => ({ name: t.name, families: t.families, sizes: t.sizes })), yours: { name: YOURS, parts: mine.length }, trade: yours ? YOURS : open?.name ?? '',
    categories: yours ? [{ name: mine.length ? 'Remembered, newest first' : 'Remembered', families: newest.map(keptOf) }]
      : (open?.categories ?? []).map((c) => ({ name: c.name, families: c.families.map((f) => ({ id: f.id, name: f.name, sizes: f.sizes, envelope: envelopeOf(f) })) })),
    hits: o.q?.trim() ? [...findParts(o.q, 24), ...found] : [],
    total: { families: cat.reduce((n, t) => n + t.families, 0), sizes: cat.reduce((n, t) => n + t.sizes, 0) } };
}

// ---- the parts remembered: where a page starts, a part deleted, the board kept as one ----------------------------------
let shared: PartsStore | null = null;
/** Where a page starts: every remembered part put in the library as a block; on claude.ai the page's shared store (the db
 *  capability's collection 'parts') set as memory's remote and synced, parts there and not here brought in, parts here
 *  and not there sent. Says how many are kept here, how many came in and went out, or why the shared store was not
 *  reached. */
export async function startRemembered(): Promise<{ kept: number; came: number; sent: number; shared: boolean; why?: string }> {
  const kept = registerSaved();
  if (!inViewer) return { kept, came: 0, sent: 0, shared: false };
  try { shared = await partsStore(); if (!shared) return { kept, came: 0, sent: 0, shared: false, why: 'this page has no shared store' };
    setRemote(shared); const r = await syncRemote(); return { kept: kept + r.in, came: r.in, sent: r.out, shared: true }; }
  catch (e) { return { kept, came: 0, sent: 0, shared: false, why: whyNot(e) }; }
}
/** The browser store the saved blocks and the parts remembered are kept in (memory.ts reads the same). */
const KEY = 'nexus.nodeblocks.v1';
/** A part deleted: from the store here (memory's own forget where it has one), from the library, and from the page's
 *  shared store where there is one (else, on claude.ai, it would come back at the next start). */
export async function forgetPart(id: string): Promise<{ gone: boolean; shared: boolean; why?: string }> {
  const had = savedParts().some((p) => p.id === id), own = (memory as unknown as { forget?: (id: string) => unknown }).forget;
  if (typeof own === 'function') own(id);
  else { let s: Storage | null = null; try { s = typeof localStorage === 'undefined' ? null : localStorage; } catch { s = null; }
    if (s) { try { s.setItem(KEY, JSON.stringify((JSON.parse(s.getItem(KEY) ?? '[]') as { id: string }[]).filter((p) => p.id !== id))); } catch { /* left as it was */ } }
    // (under Node memory keeps its parts in the very list it hands out: the part taken out of that list)
    else { const all = savedParts(), k = all.findIndex((p) => p.id === id); if (k >= 0) all.splice(k, 1); } }
  if (had || block(id)?.by === 'you') LIBRARY.delete(id);
  let out: { gone: boolean; shared: boolean; why?: string } = { gone: had && !savedParts().some((p) => p.id === id) && !block(id), shared: false };
  if (shared) { try { await shared.drop(id); out = { ...out, shared: true }; } catch (e) { out = { ...out, why: `still in the page's shared store (${whyNot(e)}): it comes back when the page starts` }; } }
  return out;
}
/** The nodes that only show, weigh or check: taken off a board before it is folded (as composeBuild folds a part). */
const SINKS = new Set(['space.show', 'measure', 'assert', 'view.show', 'view.table', 'view.chart', 'view.gauge']);
type RoomOut = Parameters<typeof groupsOf>[0];
const isRoom = (v: unknown): v is RoomOut => !!v && typeof v === 'object' && Array.isArray((v as RoomOut).pieces) && Array.isArray((v as RoomOut).faces);
/** The board open kept as one part (decision 0028, "Keep this build"): run as it is (its nodes not ok counted), its show
 *  and check nodes taken off, folded whole to one node whose outputs are its biggest block (as `block`, so the by-hand
 *  operations join it) and its thing, and remembered under the person's name with what it was made for. A board that
 *  makes no block is refused. `again` where the same board was kept before (its uses counted, not kept twice). */
export async function keepBuild(src: Board, name: string, from = ''): Promise<{ part: SavedPart; again: boolean }> {
  const nm = name.trim() || src.title || 'my build', run = new Engine(structuredClone(src)); await run.run();
  const failing = nodesOf(run.board).filter((n) => run.state.get(n.id)?.status !== 'ok').length;
  const b = structuredClone(src);
  for (const n of nodesOf(b)) if (SINKS.has(b.nodes[n.id]!.block ?? '')) b.nodes[n.id] = { ...b.nodes[n.id]!, deleted: true };
  for (const [id, e] of Object.entries(b.edges)) if (b.nodes[e.from]?.deleted || b.nodes[e.to]?.deleted) b.edges[id] = { ...e, deleted: true };
  const e = new Engine(b); await e.run();
  let top: [string, string, RoomOut] | undefined;
  for (const n of nodesOf(b)) { const st = e.state.get(n.id); if (st?.status !== 'ok') continue; for (const [port, v] of Object.entries(st.out ?? {})) if (isRoom(v) && (!top || v.pieces.length > top[2].pieces.length)) top = [n.id, port, v]; }
  if (!top) throw new Error('nothing on this board makes a thing to keep: build something first');
  const ids = nodesOf(b).map((n) => n.id), outs = [top[1], ...('thing' in (e.state.get(top[0])?.out ?? {}) && top[1] !== 'thing' ? ['thing'] : [])];
  for (const out of outs) { const r = `kept__${out}`; placeBlock(b, 'view.show', 0, 0, {}, r); wire(b, top[0], out, r, 'value'); }
  const graph = collapse(b, ids, nm, 'kept').board.nodes.kept!.inner!;
  // (the block named block, whatever port it came from (an assembly's `motor`), so a by-hand step joins it)
  if (top[1] !== 'block') { const o = graph.nodes[`kept_out_${top[1]}`]; if (o) o.set = { ...(o.set ?? {}), name: 'block' }; }
  graph.title = nm;
  const before = savedParts().length, words = `${nm} ${from}`.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2).slice(0, 12);
  const part = remember({ name: nm, says: `${nm}: kept from the board "${src.title ?? ''}" (${top[2].pieces.length} pieces${failing ? `, ${failing} node(s) not ok when kept` : ''})`, graph, from: from || src.title || nm,
    checked: { pieces: top[2].pieces.length, groups: groupsOf(top[2]), failing }, tags: [...new Set(words)], by: 'you' });
  return { part, again: savedParts().length === before };
}
/** A name asked for in a small sheet of the page's own (a page on claude.ai may not open the browser's prompt): the name,
 *  or null where the person cancels. */
export function askName(o: { title: string; value: string; ok?: string }): Promise<string | null> {
  addStyle(); return new Promise((done) => {
    const ov = document.createElement('div'); ov.className = 'pb-ask';
    ov.innerHTML = `<div class="pb-askc"><b>${esc(o.title)}</b><input type="text" value="${esc(o.value)}" enterkeyhint="done"><div><button class="no">Cancel</button><button class="yes">${esc(o.ok ?? 'Keep')}</button></div></div>`;
    document.body.appendChild(ov); const inp = ov.querySelector('input')!; inp.focus(); inp.select();
    const end = (v: string | null) => { ov.remove(); done(v); };
    ov.querySelector<HTMLButtonElement>('.yes')!.onclick = () => end(inp.value.trim() || o.value);
    ov.querySelector<HTMLButtonElement>('.no')!.onclick = () => end(null);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') end(inp.value.trim() || o.value); if (e.key === 'Escape') end(null); });
  });
}

// ---- a build's orchestration as a tree --------------------------------------------------------------------------------
/** A part as the tree shows it: how it was made (an assembly, a starter board, remembered, one plan, split into parts of
 *  its own, or not made; blank while it waits), whether it came out (null while it waits), its last line, what it was
 *  kept as, and its own parts. */
export interface OrchPart { name: string; how: string; ok: boolean | null; line: string; kept?: string; children: OrchPart[] }
/** The tree: the split, the parts, then what came after them (the join, the check, any line of no part). */
export interface Orch { split?: ComposeStep; parts: OrchPart[]; after: ComposeStep[] }
const HOW: [RegExp, string][] = [[/\b(remembered|recalled|from memory|used again)\b/i, 'remembered'], [/\bsplit into\b|\bparts of its own\b|\bsub-?parts?\b/i, 'split'], [/\b(the|an) assembly\b/i, 'assembly'],
  [/\bstarter board\b/i, 'starter'], [/\bplan\b/i, 'plan'], [/\bnot made\b|\bmade no block\b/i, 'none']];
const KEPT = /\b(?:kept|remembered|saved) as (my\.[\w.-]*\w)/i;
/** How a line says a part was made (its "kept as my.x" left out), or blank. */
export const howOf = (line: string): string => { const l = line.replace(KEPT, ''); return HOW.find(([re]) => re.test(l))?.[1] ?? ''; };
/** The names a split line lists ("2 parts: drone (…; from …), arm (…)"), in order. */
const namesIn = (line: string): string[] => { const m = /\d+ parts?: (.*)$/s.exec(line); return m ? [...m[1]!.matchAll(/(?:^|\), |; )(\w+) \(/g)].map((x) => x[1]!) : []; };
/** A tree given by a run (or its parts), read whatever its fields are called: name or part; by or how; ok, else from what
 *  still failed; kept, keptAs or saved; children, parts or sub. */
function fromTree(t: unknown, depth = 0): OrchPart[] {
  const o = t as Record<string, unknown> | null, list = Array.isArray(t) ? t : o && typeof o === 'object' ? o.children ?? o.parts ?? o.sub : undefined;
  if (!Array.isArray(list) || depth > 6) return [];
  return list.flatMap((x): OrchPart[] => { if (!x || typeof x !== 'object') return []; const p = x as Record<string, unknown>, name = String(p.name ?? p.part ?? '');
    if (!name) return []; const by = String(p.by ?? p.how ?? ''), k = p.kept ?? p.keptAs ?? p.saved, failing = Array.isArray(p.failing) ? p.failing.length : 0;
    const kept = typeof k === 'string' && k ? k : k && typeof k === 'object' && 'id' in k ? String((k as { id: unknown }).id) : '';
    return [{ name, how: HOW.some(([, h]) => h === by) ? by : howOf(by) || by, ok: typeof p.ok === 'boolean' ? p.ok : by === 'none' || failing ? false : by ? true : null,
      line: String(p.line ?? '').slice(0, 200), ...(kept ? { kept } : {}), children: fromTree(p, depth + 1) }]; });
}
/** The tree from the steps as they come (each part's lines under it, by the name its line starts with; a part's own parts
 *  by "part/sub", "part > sub" or "part.sub"; a later split under the part it splits), with a run's own tree (or its
 *  parts) laid over it where the run is given and has one. */
export function orchestration(steps: readonly ComposeStep[], run?: unknown): Orch {
  const o: Orch = { parts: [], after: [] }, all = new Map<string, OrchPart>();
  const get = (path: string[]): OrchPart => { let list = o.parts, at: OrchPart | undefined;
    for (const [i, nm] of path.entries()) { const key = path.slice(0, i + 1).join('/'); at = all.get(key); if (!at) { at = { name: nm, how: '', ok: null, line: '', children: [] }; all.set(key, at); list.push(at); } list = at.children; }
    return at!; };
  for (const s of steps) {
    const m = /^\s*(\w+(?:\s*[/>.]\s*\w+)*)\s*:\s*(.*)$/s.exec(s.line), path = m ? m[1]!.split(/\s*[/>.]\s*/) : [];
    const known = !!path.length && (all.has(path[0]!) || (!['split', 'join', 'check'].includes(s.stage) && path.length === 1 && !/^\d/.test(path[0]!)));
    if (s.stage === 'split' && !o.split && !known) { o.split = s; for (const nm of namesIn(s.line)) get([nm]); continue; }
    if (!known || s.stage === 'join' || s.stage === 'check') { o.after.push(s); continue; }
    const p = get(path), rest = m![2]!, kept = KEPT.exec(rest)?.[1];
    if (kept) p.kept = kept;
    if (s.stage === 'split') { p.how = 'split'; p.ok = s.ok; for (const nm of namesIn(rest)) get([...path, nm]); continue; }
    if (s.stage === 'fold') { if (p.ok === null) p.ok = s.ok; if (!p.line) p.line = rest; continue; }
    const how = howOf(rest); if (how) p.how = how;
    // (a line that only says what it was kept as leaves the part's line as it was)
    if (!kept || how) { p.ok = s.ok; p.line = rest; }
  }
  // (a run's own tree, else its parts, over what the steps said: how, whether it came out and what it was kept as)
  const r = run as { tree?: unknown; parts?: unknown } | undefined, tree = fromTree(r?.tree), given = tree.length ? tree : fromTree(r?.parts);
  const lay = (into: OrchPart[], from: OrchPart[]) => { for (const g of from) { const at = into.find((x) => x.name === g.name);
    if (!at) { into.push(g); continue; } if (g.how) at.how = g.how; if (g.ok !== null) at.ok = g.ok; if (g.kept) at.kept = g.kept; if (!at.line) at.line = g.line; lay(at.children, g.children); } };
  lay(o.parts, given);
  return o;
}
const HOW_SAID: Record<string, string> = { assembly: 'assembly', starter: 'starter board', remembered: 'remembered', plan: 'one plan', split: 'split into parts', none: 'not made' };
const mark = (ok: boolean | null) => (ok === null ? '<span class="m w">…</span>' : ok ? '<span class="m ok">✓</span>' : '<span class="m bad">✕</span>');
/** The tree as html, for a chat bubble or the dashboard's Ask Claude: the split, each part (✓ or ✕, how it was made, its
 *  last line, what it was kept as) with its own parts under it, then the join and the check. */
export function orchestrationHtml(o: Orch, max = 140): string {
  addStyle();
  const part = (p: OrchPart): string => `<li>${mark(p.ok)} <b>${esc(p.name)}</b>${p.how ? ` <i class="ot-by ot-${esc(p.how)}">${esc(HOW_SAID[p.how] ?? p.how)}</i>` : ''}${p.kept ? ` <em class="ot-kept">kept as ${esc(p.kept)}</em>` : ''}${p.line ? `<div class="ot-l">${esc(p.line.slice(0, max))}</div>` : ''}${p.children.length ? `<ul>${p.children.map(part).join('')}</ul>` : ''}</li>`;
  const row = (s: ComposeStep) => `<div class="ot-r">${mark(s.ok)} <b>${esc(s.stage)}</b> <span class="ot-l">${esc(s.line.slice(0, max))}</span></div>`;
  return `<div class="ot">${o.split ? `<div class="ot-r">${mark(o.split.ok)} <b>split</b> <span class="ot-l">${esc(o.parts.length ? `into ${o.parts.length} part${o.parts.length === 1 ? '' : 's'}` : o.split.line.slice(0, max))}</span></div>` : ''}${o.parts.length ? `<ul>${o.parts.map(part).join('')}</ul>` : ''}${o.after.map(row).join('')}</div>`;
}

/** A piece put on a board as the dashboard adds one: its node at its size, and shown (a "Show in space" node fed by it),
 *  so it is seen at once; the node's id back. */
export function addPiece(b: Board, id: string, set: Record<string, unknown>): string {
  const d = block(id); if (!d) throw new Error(`no block ${id}`);
  const n = Object.keys(b.nodes).length, node = placeBlock(b, id, 40 + (n % 6) * 30, 40 + n * 24, { ...defaultsOf(d), ...set });
  // (a part remembered gives its thing as a folded board's output: shown by it, else by the first output it gives)
  const outs = portsOf(d, { ...defaultsOf(d), ...set }).outputs.map((p) => p.name), out = outs.includes('thing') || !outs.length ? 'thing' : outs[0]!;
  wire(b, node, out, placeBlock(b, 'space.show', 380 + (n % 6) * 30, 40 + n * 24, {}), 'thing');
  return node;
}

const STYLE = `
.pb-ov{position:fixed;inset:0;z-index:60;display:none;flex-direction:column;background:#0b0f17;color:#e6edf3;font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;padding:calc(env(safe-area-inset-top) + 10px) 0 calc(env(safe-area-inset-bottom) + 6px)}
.pb-ov.on{display:flex}
.pb-hd{display:flex;align-items:center;gap:8px;padding:0 14px 8px}
.pb-hd b{font-size:17px}.pb-hd .n{color:#8b98a9;font-size:12px;flex:1}
.pb-hd button,.pb-keep{background:#1b2433;border:1px solid #2b3648;color:#e6edf3;border-radius:10px;padding:6px 10px;font:inherit}
.pb-q{margin:0 14px 8px;padding:10px 12px;border-radius:12px;border:1px solid #2b3648;background:#121926;color:#e6edf3;font:inherit;font-size:16px}
.pb-tr{display:flex;gap:6px;overflow-x:auto;padding:0 14px 8px;flex:none;scrollbar-width:none}
.pb-tr::-webkit-scrollbar{display:none}
.pb-tr button{flex:none;background:#151d2b;border:1px solid #2b3648;color:#c9d4e2;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px}
.pb-tr button.on{background:#5ad1ff22;border-color:#5ad1ff;color:#fff}
.pb-tr button i{font-style:normal;color:#8b98a9;margin-left:4px;font-size:11px}
.pb-ls{flex:1;overflow-y:auto;padding:0 14px 14px}
.pb-ls h4{margin:12px 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#8b98a9}
.pb-f{background:#121926;border:1px solid #1f2838;border-radius:12px;padding:8px 10px;margin:0 0 6px}
.pb-f .t{display:flex;gap:6px;align-items:baseline}.pb-f .t span{flex:1;font-weight:600}.pb-f .t em{font-style:normal;font-size:11px;color:#8b98a9}
.pb-sz{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}
.pb-sz button{background:#1b2433;border:1px solid #2b3648;color:#e6edf3;border-radius:8px;padding:5px 8px;font:inherit;font-size:12.5px}
.pb-sz button.more{color:#5ad1ff}
.pb-sz button:active{background:#5ad1ff33}
.pb-none{color:#8b98a9;padding:10px 0}
.pb-tr button.mine{border-color:#b98cff88}.pb-tr button.mine.on{background:#b98cff26;border-color:#b98cff}
.pb-f.kept .t span{color:#e6d9ff}.pb-f .for{font-size:12px;color:#c9d4e2;margin-top:3px}.pb-f .chk{font-size:11.5px;color:#8b98a9;margin-top:2px}.pb-f .chk.bad{color:#ff8a8a}
.pb-sz button.del{margin-left:auto;color:#ff8a8a;border-color:#ff8a8a55;background:none}
.pb-ask{position:fixed;inset:0;z-index:70;display:grid;place-items:center;background:#0008;padding:16px}
.pb-askc{width:min(420px,100%);background:#121926;border:1px solid #2b3648;border-radius:16px;padding:14px;color:#e6edf3;font:14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;display:flex;flex-direction:column;gap:10px}
.pb-askc input{padding:10px 12px;border-radius:10px;border:1px solid #2b3648;background:#0b0f17;color:#e6edf3;font:inherit;font-size:16px}
.pb-askc div{display:flex;gap:8px;justify-content:flex-end}.pb-askc button{background:#1b2433;border:1px solid #2b3648;color:#e6edf3;border-radius:10px;padding:7px 14px;font:inherit}.pb-askc .yes{border-color:#5ad1ff;background:#5ad1ff22}
.ot{font-size:12.5px;line-height:1.4;margin-top:4px}.ot ul{list-style:none;margin:2px 0;padding-left:14px;border-left:1px solid #ffffff22}.ot>ul{padding-left:8px}
.ot li{margin:3px 0}.ot .m{display:inline-block;width:1.1em;font-weight:700}.ot .m.ok{color:#69f0ae}.ot .m.bad{color:#ff6b6b}.ot .m.w{color:#ffc14d}
.ot .ot-l{color:#93a1b5}.ot div.ot-l{padding-left:1.1em;font-size:11.5px}.ot .ot-r{margin:3px 0}
.ot .ot-by{font-style:normal;font-size:11px;padding:0 6px;border-radius:999px;border:1px solid #ffffff2a;color:#c9d4e2}.ot .ot-assembly{border-color:#5ad1ff77}.ot .ot-remembered{border-color:#b98cff;color:#e6d9ff}.ot .ot-plan{border-color:#ffc14d77}.ot .ot-split{border-color:#69f0ae77}.ot .ot-none{border-color:#ff6b6b77}
.ot .ot-kept{font-style:normal;font-size:11px;color:#e6d9ff;background:#b98cff26;border-radius:6px;padding:0 5px}
.keepb{margin-top:6px;font-size:12.5px;padding:5px 10px;border-radius:10px;border:1px solid #b98cff88;background:#b98cff1a;color:inherit;cursor:pointer}
`;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** The browser's styles (and the tree's, and the name sheet's), put on the page once. */
function addStyle(): void { if (typeof document === 'undefined' || document.getElementById('pb-style')) return; const st = document.createElement('style'); st.id = 'pb-style'; st.textContent = STYLE; document.head.appendChild(st); }
/** The sizes a family row shows before "more" opens the rest. */
const FIRST_SIZES = 18;

/**
 * The browser mounted on a page, closed until opened: by `trigger` (its own press then opens the browser; what it did
 * before is kept as a button in the browser, named `keepAs`), or by a button put at the end of `into`. A size (or a
 * family that has none) tapped is handed to `add` with the piece's node and its settings, and the browser closes.
 */
export function mountParts(o: { trigger?: HTMLElement; keepAs?: string; into?: HTMLElement; label?: string; add: (id: string, set: Record<string, unknown>) => unknown; said?: (text: string, bad: boolean) => void }): { open: (trade?: string) => void; close: () => void; tree: () => PartsTree } {
  addStyle();
  const ov = document.createElement('div'); ov.className = 'pb-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Parts');
  const kept = o.trigger?.onclick ?? null;
  ov.innerHTML = `<div class="pb-hd"><b>Parts</b><span class="n"></span>${kept && o.keepAs ? `<button class="pb-keep">${esc(o.keepAs)}</button>` : ''}<button class="pb-x" aria-label="Close">✕</button></div><input class="pb-q" type="search" placeholder="Find a part: M8 nut, 608 bearing, 2x4, Raspberry Pi 4" enterkeyhint="search"><div class="pb-tr"></div><div class="pb-ls"></div>`;
  document.body.appendChild(ov);
  const q = ov.querySelector<HTMLInputElement>('.pb-q')!, tr = ov.querySelector<HTMLElement>('.pb-tr')!, ls = ov.querySelector<HTMLElement>('.pb-ls')!;
  let trade = '', opened = new Set<string>(), tree = partsTree();
  const sizeBtn = (id: string, size: string | undefined, label: string) => `<button data-id="${esc(id)}"${size !== undefined ? ` data-size="${esc(size)}"` : ''}>${esc(label)}</button>`;
  // (a part remembered: what it was made for, how often used, what was checked when kept; placed by "＋ Add", deleted by ✕)
  const keptRow = (f: FamilyRow, k: Kept) => { const c = k.checked, bad = c.failing > 0 || c.groups > 1;
    return `<div class="pb-f kept"><div class="t"><span>${esc(f.name)}</span><em>${esc(f.id)} · ${k.by === 'ai' ? 'by the AI' : 'by you'}</em></div>${k.from ? `<div class="for">made for: ${esc(k.from.slice(0, 140))}</div>` : ''}<div class="chk${bad ? ' bad' : ''}">used ${k.uses} time${k.uses === 1 ? '' : 's'} · checked when kept: ${c.pieces} pieces, ${c.groups} group${c.groups === 1 ? '' : 's'}, ${c.failing} failing${k.made ? ` · ${esc(k.made.slice(0, 10))}` : ''}</div><div class="pb-sz">${sizeBtn(f.id, undefined, '＋ Add')}<button class="del" data-forget="${esc(f.id)}" title="Delete this part: from this browser, the library and the page's shared store">✕ Delete</button></div></div>`; };
  const famRow = (f: FamilyRow) => { if (f.kept) return keptRow(f, f.kept); const all = opened.has(f.id), shown = all ? f.sizes : f.sizes.slice(0, FIRST_SIZES);
    return `<div class="pb-f"><div class="t"><span>${esc(f.name)}</span><em>${f.sizes.length ? `${f.sizes.length} size${f.sizes.length === 1 ? '' : 's'}` : 'any size'}${f.envelope ? ' · outline' : ''}</em></div><div class="pb-sz">${f.sizes.length ? shown.map((s) => sizeBtn(f.id, s, s)).join('') : sizeBtn(f.id, undefined, '＋ Add')}${!all && f.sizes.length > FIRST_SIZES ? `<button class="more" data-more="${esc(f.id)}">+${f.sizes.length - FIRST_SIZES} more</button>` : ''}</div></div>`; };
  const draw = () => {
    tree = partsTree({ trade, q: q.value }); trade = tree.trade;
    ov.querySelector('.pb-hd .n')!.textContent = `${tree.total.families} families · ${tree.total.sizes} sizes`;
    tr.innerHTML = `<button data-trade="${esc(YOURS)}" class="mine${trade === YOURS && !q.value.trim() ? ' on' : ''}">${esc(YOURS)}<i>${tree.yours.parts}</i></button>` + tree.trades.map((t) => `<button data-trade="${esc(t.name)}" class="${t.name === trade && !q.value.trim() ? 'on' : ''}">${esc(t.name)}<i>${t.families}</i></button>`).join('');
    if (trade === YOURS && !q.value.trim() && !tree.yours.parts) { ls.innerHTML = '<h4>Remembered · 0</h4><div class="pb-none">Nothing remembered yet. Every part the AI builds and checks is kept here, and "Keep this build" keeps the board open as one part, named by you.</div>'; return; }
    if (q.value.trim()) {
      ls.innerHTML = tree.hits.length ? `<h4>Found</h4>${tree.hits.map((h) => `<div class="pb-f"><div class="t"><span>${esc(h.name)}${h.size ? ` ${esc(h.size)}` : ''}</span><em>${esc(h.aisle)}</em></div><div class="pb-sz">${h.size ? sizeBtn(h.id, h.size, `＋ ${h.size}`) : (() => { const f = tree.categories.flatMap((c) => c.families).find((x) => x.id === h.id); const sizes = f?.sizes ?? (block(h.id)?.settings ?? []).find((s) => s.key === 'size')?.choices?.map(String) ?? []; return sizes.length ? sizes.slice(0, FIRST_SIZES).map((s) => sizeBtn(h.id, s, s)).join('') : sizeBtn(h.id, undefined, '＋ Add'); })()}</div></div>`).join('')}` : '<div class="pb-none">Nothing found: try what it is (nut, bearing, valve) or its size (M8, 608, DN20).</div>';
    } else ls.innerHTML = tree.categories.map((c) => `<h4>${esc(c.name)} · ${c.families.length}</h4>${c.families.map(famRow).join('')}`).join('');
  };
  const open = (to?: string) => { if (typeof to === 'string') { trade = to; q.value = ''; } ov.classList.add('on'); draw(); }, close = () => ov.classList.remove('on');
  ov.addEventListener('click', (e) => { const t = (e.target as HTMLElement).closest('button'); if (!t) return;
    if (t.classList.contains('pb-x')) { close(); return; }
    if (t.dataset.forget) { const id = t.dataset.forget, name = savedParts().find((p) => p.id === id)?.name ?? id; t.disabled = true;
      void forgetPart(id).then((r) => { draw(); o.said?.(r.gone ? `Deleted ${name} (${id}): from this browser and the library${r.shared ? ', and from the page\'s shared store' : ''}.${r.why ? ` It is ${r.why}.` : ''}` : `${name} was not deleted: it is not a part remembered here.`, !r.gone || !!r.why); });
      return; }
    if (t.classList.contains('pb-keep')) { close(); kept?.call(o.trigger!, e as PointerEvent); return; }
    if (t.dataset.trade) { trade = t.dataset.trade; q.value = ''; draw(); ls.scrollTop = 0; return; }
    if (t.dataset.more) { opened.add(t.dataset.more); draw(); return; }
    if (t.dataset.id) { close(); void o.add(t.dataset.id, t.dataset.size !== undefined ? { size: t.dataset.size } : {}); } });
  q.addEventListener('input', draw);
  ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  if (o.trigger) { o.trigger.onclick = () => open(); o.trigger.title = `Parts: every piece by trade, category and size${o.keepAs ? ` (${o.keepAs} is in it)` : ''}`; }
  if (o.into) { const b = document.createElement('button'); b.textContent = o.label ?? '＋ Parts'; b.title = 'Every piece in the library, by trade, category and size; tap a size to add it'; b.onclick = () => open(); o.into.appendChild(b); }
  opened = new Set(); return { open, close, tree: () => tree };
}
