// The AI in the app: Claude working through the node system as a person would, never through the app's code. It finds
// what exists (the library, the example boards, the docs by the router in CLAUDE.md), reads a node before using it,
// places, wires and sets nodes on a board, runs it, reads what came out, fixes what failed, and says what it did step by
// step, every number with the node it came from. Its tools are the whole of what it can do, so what it makes is a board:
// opened, read, changed, folded and saved like any other. Under Node only (its key stays out of any page).
//
// The flow, step by step: the agent waits for a request; it writes a tool call (search, describe, place, …); this code
// waits for the call, does it on the board, and writes the result back as the call's answer; the agent reads it and
// writes the next call, until it runs the board, reads what it needs, and writes its answer. It can fail where a tool
// refuses (a block that does not exist, a port a block lacks: said back to it, so it can correct itself), where it runs
// out of steps or time (said, with the board as far as it got), or where the service refuses (said as it said it).
import type Anthropic from '@anthropic-ai/sdk';
import { LIBRARY, block, defaultsOf, portsOf, register, type BlockDef, type PortDef, type SettingDef, type Type } from './blocks';
import { aisleOf, splitAisle, tradeRank } from './parts/aisles';
import { Engine, collapse, emptyBoard, groupBlock, makeBlock, placeBlock, wire } from './dataflow';
// (navigation and the starter boards are loaded when the agent runs, not when the library does: imported at the top they
// change the order the library's modules start in, and a worker that loads the whole library then fails to start)
import type { Board } from './boards';
import { edgesOf, nodesOf } from './boards';
import { certificatesOf, check, diffOf, type Certificate, type Verdict } from './certify';
import { massOfAll, type Assembly } from './assembly';

/** The docs the agent may read, by topic: the router in CLAUDE.md, as files under docs/. */
const DOCS: Record<string, string> = { wanted: 'WANTED.md', owners: 'OWNERS.md', reality: 'REALITY.md', compiler: 'COMPILER.md', life: 'LIFE.md', nodes: 'NODES.md', atlas: 'ATLAS.md' };

/** A value said short: what an agent needs to read of it, never the whole of a thing. */
export function brief(v: unknown, room = 400): string {
  if (v === undefined || v === null) return String(v);
  if (typeof v === 'number') return Number.isFinite(v) ? String(+v.toPrecision(6)) : String(v);
  if (typeof v === 'string' || typeof v === 'boolean') return String(v).slice(0, room);
  if (v instanceof Uint8Array) return `${v.length} bytes`;
  if (Array.isArray(v)) return `[${v.length}] ${v.slice(0, 3).map((x) => brief(x, 120)).join('; ')}${v.length > 3 ? '; …' : ''}`.slice(0, room);
  const o = v as Record<string, unknown>;
  if (typeof o.name === 'string' && ('shape' in o || 'parts' in o)) { let n = 0; const walk = (p: Record<string, unknown>) => { n++; (p.parts as Record<string, unknown>[] | undefined)?.forEach(walk); }; walk(o); return `a thing "${o.name}" of ${n} parts`; }
  return `{${Object.keys(o).slice(0, 12).map((k) => `${k}: ${brief(o[k], 60)}`).join(', ')}}`.slice(0, room);
}

/** A block on one line: what a builder needs of it and nothing more (its ports, `?` where optional, and its settings). */
export function cardOf(d: BlockDef): string {
  const ps = portsOf(d, defaultsOf(d)), port = (p: PortDef) => `${p.name}:${p.type}${p.unit ? `(${p.unit})` : ''}${p.optional ? '?' : ''}${p.many ? '*' : ''}`;
  const sets = (d.settings ?? []).map((x) => `${x.key}=${brief(x.default, 30)}${x.choices ? ` [${x.choices.slice(0, 8).join('|')}${x.choices.length > 8 ? '|…' : ''}]` : ''}`), offers = offersOf(d);
  return `${d.id}: ${d.name} | in: ${ps.inputs.map(port).join(', ') || '-'} | out: ${ps.outputs.map(port).join(', ')} | set: ${sets.join('; ') || '-'}${offers.length ? ` | offers: ${offers.join(', ')}` : ''} | ${(d.says ?? '').slice(0, 160)}`;
}

const offersKept = new Map<string, string[]>();
/** The lines and rooms a piece offers, as its settings name them (`<name>/holes`, `<size> shank/axis`): the piece made
 *  once with its defaults and each offer's setting value written back as the setting's key, so the AI knows what to
 *  name in an operation's line or room before it builds (decision 0026). Only a piece (no inputs) is made; none else.
 *  At most four and a count of the rest; `all`, every one. */
export function offersOf(d: BlockDef, all = false): string[] {
  let out = offersKept.get(d.id);
  if (!out) { out = [];
    if (/^(piece|room)\./.test(d.id) && d.run && !portsOf(d, defaultsOf(d)).inputs.length) {
      try { const set = defaultsOf(d), r = d.run({}, { set }); const os = r instanceof Promise ? [] : ((r as Record<string, unknown>).offers as string[] | undefined) ?? [];
        // (each text or choice setting's value, longest first, written back as <key>: "M8 shank/axis" → "<size> shank/axis")
        const vals = (d.settings ?? []).filter((x) => (x.type === 'text' || x.type === 'choice') && typeof set[x.key] === 'string' && String(set[x.key]).length >= 2).map((x) => [String(set[x.key]), x.key] as const).sort((a, b) => b[0].length - a[0].length);
        out = [...new Set(os.map((o) => { let t = o; for (const [v, k] of vals) t = t.split(v).join(`<${k}>`); return t; }))];
      } catch { out = []; } }
    offersKept.set(d.id, out); }
  return all || out.length <= 4 ? out : [...out.slice(0, 4), `… ${out.length - 4} more`];
}

/** Plain words a request says where the library names the piece otherwise (decision 0026, step 4: the bootstrap built a
 *  timber frame from boxes, a shaft coupler from a pipe coupling, panels from room.make, a Pi as an Uno). */
const NAMED_AS: [RegExp, string[]][] = [
  [/\b(\d+x\d+|studs?|timber|lumber|joists?|rafters?|planks?|battens?)\b/, ['piece.lumber']],
  [/\b(plywood|mdf|osb|chipboard|hardboard|panels?)\b/, ['piece.sheet']],
  [/\bcouplers?\b/, ['piece.coupler']],
  [/\b(raspberry pi|arduino|esp32|esp8266|nodemcu|dev ?boards?|microcontroller)\b/, ['piece.devboard']],
  [/\b(wall ?plugs?|rawl ?plugs?)\b/, ['piece.wallplug']],
  [/\bcorner brackets?\b/, ['piece.cornerbracket']],
  [/\bangle brackets?\b/, ['piece.anglebracket']],
  [/\bpvc\b/, ['piece.pvcpipe', 'piece.pvcfitting']],
  [/\bnail(s|ed)?\b/, ['piece.nail']],
];
/** The pieces whose cards go in full with the guide (piecesCard): not said again. */
const inGuide = (id: string) => !id.startsWith('piece.') || CORE_PIECES.has(id);
/** The choice of a setting the request names (its words, or their start up to a number: "Raspberry Pi 4" is
 *  "Raspberry Pi 4 Model B", "2x4" is "2x4"), where one alone is named most fully; else none. */
export function askedChoice(request: string, choices: readonly unknown[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[×]/g, 'x'), rq = ` ${norm(request).replace(/[^a-z0-9.x]+/g, ' ')} `;
  let best: string[] = [], most = 0;
  for (const c of choices.map(String)) { const ts = norm(c).split(/[^a-z0-9.x]+/).filter(Boolean);
    for (let k = ts.length; k >= 1; k--) { const head = ts.slice(0, k);
      if ((k >= 2 || /\d/.test(head[0]!)) && rq.includes(` ${head.join(' ')} `)) {
        if (k > most) { most = k; best = [c]; } else if (k === most) best.push(c); break; } } }
  return best.length === 1 ? best[0] : undefined;
}
/** A piece's card for the request that names it: its inputs, its settings with their choices (the one asked marked, and
 *  never cut), what it offers (holes and rooms first) and the start of what it says. */
export function namedCard(d: BlockDef, request: string): string {
  const ps = portsOf(d, defaultsOf(d)), sets = (d.settings ?? []).map((x) => { const asked = x.choices ? askedChoice(request, x.choices) : undefined;
    const cs = x.choices ? [...new Set([...x.choices.slice(0, 8).map(String), ...(asked ? [asked] : [])])] : [];
    return `${x.key}=${brief(x.default, 30)}${x.choices ? ` [${cs.join('|')}${x.choices.length > cs.length ? '|…' : ''}]` : ''}${asked && asked !== String(x.default) ? ` (asked: ${asked})` : ''}`; });
  const os = offersOf(d, true), first = [...os.filter((o) => /\/(holes|cavity|pins|slot|bore|screw holes)$/.test(o)), ...os.filter((o) => !/\/(holes|cavity|pins|slot|bore|screw holes)$/.test(o))];
  const offers = first.length > 5 ? [...first.slice(0, 5), `… ${first.length - 5} more`] : first;
  return `${d.id}: ${d.name}${ps.inputs.length ? ` | in ${ps.inputs.map((p) => `${p.name}${p.optional ? '?' : ''}${p.many ? '*' : ''}`).join(', ')}` : ''}${sets.length ? ` | set ${sets.join('; ')}` : ''}${offers.length ? ` | offers ${offers.join(', ')}` : ''} | ${(d.says ?? '').slice(0, 110)}`;
}
/** The library pieces a request names that the cached cards give only by their short id (decision 0026, step 4): by the
 *  build-first search over each of its words (a piece whose name or id holds the word), and by the plain words the library
 *  names otherwise (NAMED_AS) first; each by its full card (namedCard). At most `most` of them and about `room`
 *  characters: they go after the cached prefix, sent every call. Empty where none is named. */
export async function namedCards(request: string, most = 8, room = 1500): Promise<string> {
  const { search, spelt } = await import('./navigate'), hits = new Map<string, number>();
  let rq = request.toLowerCase();
  const take = (id: string, w: number) => { const d = block(id); if (d && !inGuide(id) && buildsInSpace(d) && !OLD_BUILD.test(id)) hits.set(id, (hits.get(id) ?? 0) + w); };
  // (the plain words first, each then taken out of the request, so "wall plugs" is not also a wall and a DC plug)
  for (const [re, ids] of NAMED_AS) { const g = new RegExp(re.source, 'g'); if (g.test(rq)) { for (const id of ids) take(id, 100); rq = rq.replace(g, ' '); } }
  // (then each word by the search, a piece kept only where the word starts its short id or its name, or is its name's
  // last word ("DC gear motor"): "plate" is not a NEMA motor plate; a word a piece in the guide's cards is called by
  // (plate, pipe, bolt) is left to those cards; words of shape, place and doing name no piece)
  const core = new Set([...CORE_PIECES].map((id) => id.slice('piece.'.length)));
  const words = [...new Set(rq.split(/[^a-z0-9-]+/).filter((w) => w.length >= 3 && !/^(the|and|with|for|from|into|onto|its|their|them|each|other|one|two|three|four|hollow|round|square|small|front|side|top|bottom|base|board|screws?|screwed|set|pull|push)$/.test(w)).map((w) => spelt(w.replace(/(?<=[a-z]{3}[^s])s$/, ''))))].filter((w) => !core.has(w));
  for (const w of words) { let n = 0;
    for (const f of search(w, 30)) { const id = f.add?.block ?? f.id, d = block(id); if (n >= 3 || f.add?.set || !d || !id.startsWith('piece.')) continue;
      const nm = d.name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim().split(/\s+/);
      if (!id.slice('piece.'.length).startsWith(w) && !nm[0]!.startsWith(w) && nm[nm.length - 1] !== w) continue; take(id, id === `piece.${w}` ? 15 : 10); n++; } }
  const ids = [...hits].sort((a, b) => b[1] - a[1]).map(([id]) => id), lines: string[] = [], head = 'Cards of the pieces your request names (use these, not a box made to look like one; a size from its choices):';
  let n = head.length; for (const id of ids) { if (lines.length >= most) break; const l = namedCard(block(id)!, request); if (n + 1 + l.length > room) continue; lines.push(l); n += l.length + 1; }
  return lines.length ? `${head}\n${lines.join('\n')}` : '';
}

/** The old blocks that set a place by number and the old makers (CLAUDE.md: not to be built on): found last for a build. */
const OLD_BUILD = /^(shape\.|place$|place\.|array$|mirror$|make\.|card\.part$|part\.family$|mate$|onto$|turn$|move$|joint$|imprint$|auto\.loop$)/;
/** A block that builds in the space: an operation, a piece, a joint, a block you saved, or any block that gives a block. */
export const buildsInSpace = (d: BlockDef): boolean => /^(room|piece|mate)\./.test(d.id) || d.by === 'you' || portsOf(d, defaultsOf(d)).outputs.some((p) => p.type === 'block');
/** The smallest starter board that uses a block (the cheapest worked example to open), by a title's first words that
 *  `open` finds it by and no other board starts with; undefined where no board uses it. */
async function exampleOf(id: string): Promise<string | undefined> {
  const [{ usage }, { starterBoards }] = await Promise.all([import('./navigate'), import('./starters')]), { used, size } = usage();
  const best = [...(used.get(id) ?? [])].sort((a, b) => (size.get(a) ?? 0) - (size.get(b) ?? 0) || a.length - b.length)[0]; if (!best) return undefined;
  const all = starterBoards().map(([t]) => t.toLowerCase()), ws = best.split(' '), cut = (n: number) => ws.slice(0, n).join(' ').replace(/[:,;]$/, '');
  for (const t of [best.split(':')[0]!, cut(6), cut(10)]) if (t.length >= 8 && all.filter((x) => x.startsWith(t.toLowerCase())).length === 1) return t;
  return best.slice(0, 120);
}
/** What `find` answers, for a build (decision 0026): the blocks that build first, the ones you saved before the library's
 *  (operations, pieces, joints), each on one line with its inputs, its outputs where they are not the usual ones, its
 *  settings and defaults, what it offers (the lines and rooms the next operation names) and the smallest starter board
 *  that uses it, to open as a worked example; then boards, then everything else; the old place-by-number nodes and
 *  makers last. At most `most` lines, short (tokens matter). */
export async function findLines(q: string, most = 10): Promise<string> {
  const { search, spelt, findParts } = await import('./navigate'), words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !/^(the|and|with|for|from|into|onto|make|build|some|that|this)$/.test(w)).map(spelt);
  // (the blocks you saved, by their own words: registered after the library's search index was made, so looked at here)
  const saved = [...LIBRARY.values()].filter((d) => d.by === 'you' && words.some((w) => `${d.id} ${d.name} ${d.says ?? ''}`.toLowerCase().includes(w)));
  const found = search(q, 200), seen = new Set(saved.map((d) => d.id)), builders: BlockDef[] = [...saved], boards: string[] = [], rest: string[] = [], old: string[] = [];
  // (then the parts catalogue (navigate.ts findParts): the families the words name whole, at most three, each at the size
  // the words name where they name one ("M8 nut": the nut, its size M8; "608 bearing"; "Raspberry Pi 4"))
  const asked = new Map<string, string>(), catalogued: BlockDef[] = [];
  for (const h of findParts(q, 12)) { if (!h.full || catalogued.length >= 3) continue; const d = block(h.id); if (!d || seen.has(h.id) || !buildsInSpace(d) || OLD_BUILD.test(h.id)) continue; seen.add(h.id); catalogued.push(d); if (h.size) asked.set(h.id, h.size); }
  builders.push(...catalogued); const ahead = saved.length + catalogued.length;
  // (a trade's or an aisle's word ("Garden", "Hinges"): its families, by id, one line, so the cards need not list them)
  const { aisleOf: aisleOfD } = await import('./parts/aisles'), byAisle = new Map<string, string[]>();
  for (const d of LIBRARY.values()) { if (!d.id.startsWith('piece.')) continue; const a = (aisleOfD(d) ?? '').toLowerCase(); if (a && words.some((w) => new RegExp(`\\b${w}`).test(a))) byAisle.set(aisleOfD(d)!, [...(byAisle.get(aisleOfD(d)!) ?? []), d.id]); }
  const aisleLines = [...byAisle].slice(0, 6).map(([a, ids]) => `${a}: ${ids.slice(0, 24).join(' ')}${ids.length > 24 ? ` … ${ids.length - 24} more` : ''}`);
  for (const f of found) {
    if (f.board) { if (boards.length < 2) boards.push(`board "${f.board.slice(0, 80)}"`); continue; }
    const id = f.add?.block ?? f.id, d = block(id);
    if (d && !f.add?.set && buildsInSpace(d) && !OLD_BUILD.test(id)) { if (!seen.has(id)) { seen.add(id); builders.push(d); } continue; }
    const line = `${id}${f.add?.set ? ` ${JSON.stringify(f.add.set)}` : ''} | ${f.name} | ${f.says.slice(0, 70)}`;
    (OLD_BUILD.test(id) ? old : rest).push(OLD_BUILD.test(id) ? `${line} (old: sets places by number; not for a new build)` : line);
  }
  // (the library's own builders: those whose words start a word of theirs first, the most of the words first, then as the
  // search ranked them: "lamp" is a bulb before a hose clamp)
  const said = (d: BlockDef) => words.filter((w) => new RegExp(`\\b${w}`).test(`${d.id} ${d.name} ${d.says ?? ''}`.toLowerCase())).length;
  // (and where some say a word of the request, those that say none are left out: "lamp" is not a hose clamp at all)
  const ranked = builders.slice(ahead).map((d, k) => [d, said(d), k] as const).sort((a, b) => b[1] - a[1] || a[2] - b[2]), any = ranked.some(([, n]) => n > 0);
  builders.splice(ahead, Infinity, ...ranked.filter(([, n]) => !any || n > 0).map(([d]) => d));
  const lineOf = async (d: BlockDef) => { const ps = portsOf(d, defaultsOf(d)), outs = ps.outputs.map((p) => p.name).join(','), offers = offersOf(d), eg = await exampleOf(d.id);
    const sets = (d.settings ?? []).slice(0, 6).map((x) => (x.key === 'size' && asked.has(d.id) ? `size=${asked.get(d.id)} (asked)` : `${x.key}=${brief(x.default, 24)}`)).join(' ');
    return `${d.id}: ${d.name.slice(0, 40)}${d.by === 'you' ? ' (yours)' : ''} | in ${ps.inputs.map((p) => `${p.name}${p.many ? '*' : ''}`).join(',') || '-'}${outs === ROOM_GIVES ? '' : ` | out ${outs}`}${sets ? ` | set ${sets}` : ''}${offers.length ? ` | offers ${offers.join(', ')}` : ''}${eg ? ` | e.g. board "${eg}"` : ''}`; };
  const top = await Promise.all(builders.slice(0, Math.max(1, most - 4)).map(lineOf));
  const lines = [...top, ...boards, ...rest, ...old].slice(0, most);
  return lines.length || aisleLines.length ? `${top.length ? `(what builds first; each gives ${ROOM_GIVES} unless out says; card one for its choices)\n` : ''}${[...lines, ...aisleLines].join('\n')}` : 'nothing matches';
}

/** The agent's tools, each answering in as few words as will do (docs/FOR-AI.md says how they are used). */
const plan = { nodes: { type: 'object', description: '{name:{"b":blockId,"s":{settings}}}' }, wires: { type: 'array', items: { type: 'string' }, description: '"a.out>b.in"' } };
export const TOOLS: Anthropic.Tool[] = [
  { name: 'find', description: 'Blocks and starter boards matching words, one a line.', input_schema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
  { name: 'card', description: 'One block on one line: in, out, set.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'build', description: 'A new board from a plan, placed, wired and run; a line a node back.', input_schema: { type: 'object', properties: plan, required: ['nodes'] } },
  { name: 'open', description: 'A starter board by its title (or the first words of it) as the board, run; a line a node back.', input_schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } },
  { name: 'change', description: 'Changes made on a copy of the board, run; the copy is taken only when every check that held still holds (else kept as a shadow, read can read it); lines back, what fails first.', input_schema: { type: 'object', properties: { add: plan.nodes, set: { type: 'object', description: '{name:{key:value}}' }, remove: { type: 'array', items: { type: 'string' } }, wires: plan.wires, unwire: { type: 'array', items: { type: 'string' }, description: '"b.in": what feeds it, cut' } } } },
  { name: 'read', description: 'One output of a node, in full (shadow: from the last change not taken).', input_schema: { type: 'object', properties: { node: { type: 'string' }, out: { type: 'string' }, shadow: { type: 'boolean' } }, required: ['node', 'out'] } },
  { name: 'fold', description: 'Nodes of the board folded into one new library block, saved: wires crossing in become its inputs, out its outputs (name them in outs). Omit nodes: all but the in.* nodes, which become its inputs. Its card back.', input_schema: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'string' }, description: 'omit for all' }, outs: { type: 'array', items: { type: 'string' }, description: '"node.output": its outputs' }, name: { type: 'string' }, says: { type: 'string' } }, required: ['name', 'says'] } },
  { name: 'docs', description: `Lines of a document holding the words. Topics: ${Object.keys(DOCS).join(', ')}.`, input_schema: { type: 'object', properties: { topic: { type: 'string' }, find: { type: 'string' } }, required: ['topic', 'find'] } },
];

/** The agent's standing instructions: docs/FOR-AI.md itself, so what it is told and what a person reads are one text; then
 *  the cards of the blocks most builds are made of (piecesCard), so a build needs no find and no card for them. One text,
 *  the same every call: cached, read again at a tenth of the price. */
let guide: string | undefined;
/** The fixed prefix sent as one system block with its own cache breakpoint (decision 0026): the guide, the cards and the
 *  worked plans (and the tools before them, which render first), read back at a tenth of the price by every call that
 *  follows within five minutes, whatever its request. Top-level caching alone puts its one breakpoint at the end of the
 *  request, after the request's own words: a new request then reads none of the guide back and writes all of it again
 *  (prompt caching, automatic vs explicit breakpoints). Whatever changes from call to call goes after it. */
export const cachedSystem = (text: string): Anthropic.TextBlockParam[] => [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
/** The guide's own text given by a page that bundles it (decision 0027: the app on claude.ai builds Assist's call itself,
 *  with no Node to read the file). */
let guideMd: string | undefined;
export const setGuideMd = (md: string): void => { guideMd = md; guide = undefined; };
export const guideOf = async (): Promise<string> => { if (guide) return guide; const md = guideMd ?? (await import(/* @vite-ignore */ 'node:fs')).readFileSync(new URL('../../docs/FOR-AI.md', import.meta.url), 'utf8'); return (guide = `${md}\n\n${piecesCard()}\n\n${workedPlans()}`); };

/** Worked plans, each one that runs with nothing failing (the test runs every one): the hand plan of tests/evals/phone.cjs,
 *  and the starter boards built from pieces (two cells boxed, then a lid added by a change; a bolt and its nut through a
 *  plate, as the by-hand steps join them). Sent after the cards, cached with them (decision 0026: a worked example to start
 *  from does most of the work). Each `after` names the plan it changes. */
export const WORKED: { says: string; after?: string; plan: AgentPlan['input'] & { tool: AgentPlan['tool'] } }[] = [
  { says: 'two plates stacked, bolted at both holes, weighed and shown', plan: { tool: 'build', nodes: { bot: { b: 'piece.plate', s: { name: 'bottom plate', t: 3 } }, top: { b: 'piece.plate', s: { name: 'top plate', t: 3 } }, st: { b: 'room.stack', s: { axis: 'y', order: 'bot,top' } }, j0: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 0, size: 'M8' } }, j1: { b: 'mate.bolted', s: { line: 'top plate/holes', which: 1, size: 'M8' } }, m: { b: 'measure' }, show: { b: 'space.show' } }, wires: ['bot.block>st.blocks', 'top.block>st.blocks', 'st.block>j0.held', 'j0.block>j1.held', 'j1.thing>m.thing', 'j1.thing>show.thing'] } },
  { says: 'a bolt down a plate\'s first hole, its nut over the shank\'s top', plan: { tool: 'build', nodes: { pl: { b: 'piece.plate' }, bolt: { b: 'piece.bolt', s: { size: 'M8', length: 20 } }, thru: { b: 'room.through', s: { line: 'plate/holes' } }, nut: { b: 'piece.nut', s: { size: 'M8' } }, on: { b: 'room.over', s: { line: 'M8 shank/axis', where: 'hi', fit: 'touch' } }, show: { b: 'space.show' } }, wires: ['pl.block>thru.host', 'bolt.block>thru.passer', 'thru.block>on.host', 'nut.block>on.sleeve', 'on.thing>show.thing'] } },
  { says: 'two 18650 cells side by side into a box\'s cavity', plan: { tool: 'build', nodes: { c1: { b: 'piece.cell', s: { size: '18650' } }, c2: { b: 'piece.cell', s: { size: '18650' } }, pair: { b: 'room.stack', s: { axis: 'x', fit: 'clear', order: 'c1,c2' } }, box: { b: 'piece.case', s: { name: 'cell box', w: 45, h: 70, d: 25 } }, boxed: { b: 'room.into', s: { room: 'cell box/cavity' } }, show: { b: 'space.show' } }, wires: ['c1.block>pair.blocks', 'c2.block>pair.blocks', 'box.block>boxed.host', 'pair.block>boxed.child', 'boxed.thing>show.thing'] } },
  { says: 'then its lid, by a change: the one wire into show cut first, as an input that takes one wire is never replaced', after: 'two 18650 cells side by side into a box\'s cavity', plan: { tool: 'change', add: { lid: { b: 'mate.lid' } }, unwire: ['show.thing'], wires: ['boxed.block>lid.box', 'lid.thing>show.thing'] } },
];
/** The worked plans as the guide says them: a line of what each makes, then the plan as Assist writes it. */
export const workedPlans = (): string => `## Worked plans (each runs with nothing failing; start from the nearest)\n${WORKED.map((w) => `${w.after ? 'On the board the plan above built: ' : ''}${JSON.stringify({ ...w.plan, says: w.says })}`).join('\n')}`;
/** The model the AI in the app runs on unless more is asked: the cheapest (its node's setting lists the others). */
export const AGENT_MODEL = 'claude-haiku-5-5';

export interface AgentStep { tool: string; input: unknown; result: string; ms: number; /** the tool threw: its result is the error */ failed?: true;
  /** the result's refusals and failed nodes, each line whole: kept apart from the result, which is cut to 300 characters
   *  (a failure past the cut was lost before: the evaluator, 2026-11-01) */ alerts?: string[] }
/** A tool call as the run keeps it: its result cut short for the record, its refusals and failures kept whole. */
export function stepOf(tool: string, input: unknown, out: string, ms: number, failed = false): AgentStep {
  const alerts = out.split('\n').filter((l) => l.startsWith('! ') || /^\S+ (failed|error|waiting): /.test(l)).map((l) => l.slice(0, 300));
  return { tool, input, result: out.slice(0, 300), ms, ...(failed ? { failed: true as const } : {}), ...(alerts.length ? { alerts } : {}) };
}
/** A block the agent folded and saved: enough to register it again anywhere (a page keeps it with the blocks you saved). */
export interface AgentBlock { id: string; name: string; says: string; domains: string[]; graph: Board }
/** The parts remembered (decision 0028): what the AI and the person built, kept as blocks and recalled by their words. */
export { forget, recall, registerSaved, remember, savedParts, setRemote, syncRemote, used, usesOf, type SavedPart } from './memory';
import { recall, registerSaved, remember, savedParts, used, type SavedPart } from './memory';
/**
 * A near miss the run caught (spec 00, S10; no blame, each with its kind and the response it calls for): an `error` is a
 * slip the engine refused and said back (a wire into an input that is not there, a setting a block does not have), a tool
 * that failed, or a node that failed when the board ran; `at-risk` is an answer that states numbers with no board behind
 * them (the evaluation set found 13 of 30 answered so before the guide forbade it); `reckless` is an answer given past a
 * refusal that still stands (the last step that changed the board was refused in part) without a word of it. Shown on the
 * page with the answer and printed by the evaluation runners.
 */
export interface NearMiss { step: number; tool: string; what: string; kind: 'error' | 'at-risk' | 'reckless'; response: string }
export interface AgentRun { board: Board; steps: AgentStep[]; answer: string; model: string; tokens: { in: number; out: number; cached: number; written: number }; made: AgentBlock[]; checked?: string; stopped?: string; nearMisses: NearMiss[];
  /** Propose, then certify (spec 10, T18; C29): what the run changed, from the boards themselves, and a certificate for each
   *  law node it changed (its value where it ran) and each wire it made (their units' dimensions), for the kernel to check;
   *  the page checks them again itself before it takes the board, and takes none a certificate refuses as wrong. */
  diff: ReturnType<typeof diffOf>; certificates: { what: string; certificate: Certificate }[] }
/** Each certificate checked by the kernel here, wherever this runs (the page checks again what the relay sent: a verdict
 *  is never taken on its word); the board is taken only when none is refused as wrong (C29: the checker is the gate). */
export function gateOf(certs: readonly { what: string; certificate: unknown }[] = []): { take: boolean; verdicts: (Verdict & { what: string })[] } {
  const verdicts = certs.map((c) => ({ what: c.what, ...check(c.certificate) }));
  return { take: !verdicts.some((v) => v.refused === 'wrong'), verdicts };
}
/** What the page shows of it: the change, then how many certificates the kernel checked, and each one it did not. */
export function certifiedView(diff: AgentRun['diff'] | undefined, g: ReturnType<typeof gateOf>, esc: (s: string) => string): string {
  const d = diff ? `${diff.added.length} node(s) added, ${diff.removed.length} taken away, ${diff.changed.length} set otherwise, ${diff.wired.length} wire(s) made, ${diff.cut.length} cut` : 'no diff came back';
  const ok = g.verdicts.filter((v) => v.ok).length, not = g.verdicts.filter((v) => !v.ok);
  return `<details${g.take ? '' : ' open'}><summary>${g.take ? '' : '<b>Not taken: </b>'}Certified by the kernel: ${ok} of ${g.verdicts.length} (${esc(d)})</summary>${not.map((v) => `${esc(v.what)}: <b>${esc(v.refused ?? '')}</b> ${esc(v.why)}`).join('<br>') || 'every one checked'}</details>`;
}

/** The diff and the certificates of a run's board, against the board it started from. */
export async function certifiedOf(before: Board, after: Board): Promise<Pick<AgentRun, 'diff' | 'certificates'>> {
  const diff = diffOf(before, after), touched = new Set([...diff.added, ...diff.changed, ...diff.wired.flatMap((w) => [w.split('>')[0]!.split('.')[0]!, w.split('>')[1]!.split('.')[0]!])]);
  const e = new Engine(after); await e.run();
  return { diff, certificates: certificatesOf(after, e, touched) };
}
/** What each near miss the run catches is, and the response its kind calls for (plan/NEAR-MISS.md: an error's, the fix
 *  and the check that caught it; an at-risk act's, the process that forbids it; a reckless act's, to stop and tell the
 *  user), one table so the test holds every one to its kind's rule. */
export const NEAR_MISS_RESPONSE = {
  'tool failed': { kind: 'error', response: 'the tool\'s own check failed it, and its error went back to the model as its result; corrected in a later step, or said in the answer' },
  refused: { kind: 'error', response: 'refused by the engine\'s check and said back to the model; corrected in a later step, or said in the answer' },
  'node failed': { kind: 'error', response: 'the node fails when the board runs, and the failure went back to the model with the run; corrected in a later step, or said in the answer' },
  'no board': { kind: 'at-risk', response: 'the guide\'s rule forbids it (docs/FOR-AI.md); the evaluation set counts it wrong' },
  'past a refusal': { kind: 'reckless', response: 'stop, and tell the user: shown beside the answer on the page, and printed by the evaluation runners' },
} as const satisfies Record<string, { kind: NearMiss['kind']; response: string }>;
const caught = (what: keyof typeof NEAR_MISS_RESPONSE) => NEAR_MISS_RESPONSE[what];
/** The near misses of a run, from its steps (each refusal the engine said back) and its answer. */
export function nearMissesOf(steps: AgentStep[], answer: string, board: Board): NearMiss[] {
  const out: NearMiss[] = [];
  steps.forEach((s, k) => {
    if (s.failed) { out.push({ step: k + 1, tool: s.tool, what: `the tool failed: ${s.result.slice(0, 160)}`, ...caught('tool failed') }); return; }
    for (const l of s.alerts ?? s.result.split('\n')) {
      if (l.startsWith('! ')) out.push({ step: k + 1, tool: s.tool, what: l.slice(2), ...caught('refused') });
      else { const f = /^(\S+) (failed|error|waiting): (.*)$/.exec(l); if (f) out.push({ step: k + 1, tool: s.tool, what: `node ${f[1]} ${f[2] === 'waiting' ? 'left waiting' : 'failed'}: ${f[3]!.slice(0, 160)}`, ...caught('node failed') }); }
    } });
  if (/\d/.test(answer) && !nodesOf(board).length) out.push({ step: steps.length, tool: 'answer', what: 'numbers given with no board behind them', ...caught('no board') });
  const lastChange = steps.map((s, k) => [s, k] as const).filter(([s]) => ['build', 'change', 'open'].includes(s.tool) && !s.failed).pop();
  const standing = lastChange ? (lastChange[0].alerts ?? lastChange[0].result.split('\n')).filter((l) => l.startsWith('! ')) : [];
  if (standing.length && !/refus|could ?n[o']t|cannot|can't|unable|failed|did ?n[o']t|does ?n[o']t|is ?n[o']t|not (yet|wired|joined|connected|done|built|possible|there)|no input|no setting|missing/i.test(answer))
    out.push({ step: steps.length, tool: 'answer', what: `answered past ${standing.length} refusal(s) still standing, without a word of it (first: ${standing[0]!.slice(2, 120)})`, ...caught('past a refusal') });
  return out;
}

/** One near miss as the evaluation runners print it: its kind first, then where and what, then the response. */
export const nearMissLine = (m: NearMiss): string => `${m.kind}: step ${m.step} (${m.tool}): ${m.what} | ${m.response}`;
/** The near misses as the page shows them beside the answer (open when one is reckless): each with its step, its kind,
 *  what happened and the response it calls for. `esc` makes text safe for the page. */
export function nearMissesView(misses: readonly NearMiss[] | undefined, esc: (s: string) => string): string {
  if (!misses?.length) return '';
  const count = (['error', 'at-risk', 'reckless'] as const).map((k) => `${misses.filter((m) => m.kind === k).length} ${k}`).join(', ');
  return `<details${misses.some((m) => m.kind === 'reckless') ? ' open' : ''}><summary>Near misses caught: ${misses.length} (${count})</summary>${misses.map((m) => `step ${m.step}, ${esc(m.tool)}: <b>${esc(m.kind)}</b> ${esc(m.what)} (${esc(m.response)})`).join('<br>')}</details>`;
}

/** A second model's reading of the answer against the steps it came from: each number traced to a tool's result, each
 *  claim to what was asked and done. It sees only the request, the steps (short) and the answer: a few thousand tokens. */
async function checkOf(client: InstanceType<typeof import('@anthropic-ai/sdk').default>, request: string, steps: AgentStep[], answer: string, model: string, used: (u: { input_tokens: number; output_tokens: number }) => void): Promise<string> {
  const said = steps.map((s, k) => `${k + 1}. ${s.tool} ${brief(s.input, 200)}\n=> ${s.result.slice(0, 300)}`).join('\n');
  const r = await client.messages.create({ model, max_tokens: 1500, output_config: { effort: 'low' }, system: 'You check another model\'s work. Given a request, the tool steps it took (each result is what the tool really returned) and its answer: list each number or claim in the answer that no step supports, and each part of the request not done. Then a last line: PASS if none, else FAULTS: and how many. Be short; quote, do not explain at length.', messages: [{ role: 'user', content: `Request: ${request}\n\nSteps:\n${said}\n\nAnswer:\n${answer}` }] }, { signal: AbortSignal.timeout(60_000) });
  used(r.usage); return r.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

/** The agent given a request: its board, its steps, its answer. At most `steps` tool calls and `seconds` of time. */
export async function agentBuild(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; steps?: number; seconds?: number; board?: Board; blocks?: AgentBlock[]; check?: string | false; signal?: AbortSignal;
  /** each step as it is taken, with the board as it stands after it (the relay streams these to the page) */ onStep?: (s: AgentStep, board: Board) => void;
  /** what the model says between its tool calls, as it says it */ onSay?: (text: string) => void } = {}): Promise<AgentRun> {
  if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the agent runs under Node with it set (the environment\'s secrets); a page holds no keys');
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), system = cachedSystem(await guideOf());
  const model = o.model ?? AGENT_MODEL, steps: AgentStep[] = [], t0 = Date.now(), until = t0 + 1000 * (o.seconds ?? 180);
  const start: Board = o.board ? structuredClone(o.board) : emptyBoard(request.slice(0, 60));
  let tokIn = 0, tokOut = 0, cached = 0, written = 0, stopped: string | undefined;
  // (the board open, a line a node, before the request: "make it longer" can be a change, not a search and a new build)
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: [boardBrief(o.board), request].filter(Boolean).join('\n\n') }];
  const t = await toolsFor(o.board ?? emptyBoard(request.slice(0, 60)), o.blocks);
  for (let turn = 0; ; turn++) {
    if (steps.length >= (o.steps ?? 30)) { stopped = `stopped at ${steps.length} steps`; break; }
    if (Date.now() > until) { stopped = `stopped at ${Math.round((Date.now() - t0) / 1000)} s`; break; }
    // (the guide and the tools are the same every call: cached, read again at a tenth of the price)
    const r = await client.messages.create({ model, max_tokens: 8000, cache_control: { type: 'ephemeral' }, system, tools: TOOLS, output_config: { effort: o.effort ?? 'low' }, messages }, { signal: o.signal ?? AbortSignal.timeout(Math.max(5000, until - Date.now())) });
    tokIn += r.usage.input_tokens; tokOut += r.usage.output_tokens; cached += r.usage.cache_read_input_tokens ?? 0; written += r.usage.cache_creation_input_tokens ?? 0; messages.push({ role: 'assistant', content: r.content });
    const turn = turnOf(r);
    if (turn.ends) { const answer = turn.answer;
      const checked = o.check === false ? undefined : await checkOf(client, request, steps, answer, o.check ?? 'claude-sonnet-5-5', (u) => { tokIn += u.input_tokens; tokOut += u.output_tokens; }).catch((e) => `not checked: ${(e as Error).message}`);
      return runOf({ start, board: t.board(), steps, answer, model: r.model, tokens: { in: tokIn, out: tokOut, cached, written }, made: t.made, ...(checked ? { checked } : {}) }); }
    const said = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim(); if (said) o.onSay?.(said);
    const n0 = steps.length; messages.push({ role: 'user', content: await callTools(turn.uses, t.doTool, steps) });
    for (const s of steps.slice(n0)) o.onStep?.(s, t.board());
  }
  return runOf({ start, board: t.board(), steps, answer: '', model, tokens: { in: tokIn, out: tokOut, cached, written }, made: t.made, ...(stopped ? { stopped } : {}) });
}

/** The tools the AI works through (find, card, build, open, change, fold, read, docs), on a board of their own: the same
 *  code whether the model calls them or a test does with real inputs (no stand-in model: constitution C8). */
export async function toolsFor(board0: Board, blocks?: AgentBlock[]): Promise<{ doTool: (name: string, a: Record<string, unknown>) => Promise<string>; board: () => Board; made: AgentBlock[] }> {
  let board: Board = board0, engine: Engine | undefined;
  const { starterBoards } = await import('./starters'), made: AgentBlock[] = [];
  // (blocks a person saved, sent with the request: the agent can place them like any other)
  for (const x of blocks ?? []) if (!block(x.id)) register(groupBlock(x.graph, { id: x.id, name: x.name, says: x.says, domains: x.domains, by: 'you' }));
  /** What fails on a run board, assertions first (spec 01, I14): an assertion that does not hold, then any other check a node
   *  says it broke (a joint that does not hold, a paste refused, a balance not kept: its `violation`). */
  const failsOf = (e: Engine, b: Board): string[] => { const rows: [number, string][] = [];
    for (const n of nodesOf(b)) { const st = e.state.get(n.id), o = (st?.out ?? {}) as Record<string, unknown>; if (st?.status !== 'ok' || typeof o.violation !== 'string' || !o.violation) continue;
      rows.push([b.nodes[n.id]!.block === 'assert' ? 0 : 1, `${n.id}: ${o.violation.slice(0, 200)}`]); }
    return rows.sort((x, y) => x[0] - y[0]).map(([, t]) => t); };
  /** The nodes whose checks hold on a run board: ran, and say nothing broken. */
  const heldOf = (e: Engine, b: Board): Set<string> => new Set(nodesOf(b).filter((n) => { const st = e.state.get(n.id), v = (st?.out as Record<string, unknown> | undefined)?.violation; return st?.status === 'ok' && !(typeof v === 'string' && v); }).map((n) => n.id));
  let shadow: { board: Board; engine: Engine } | undefined;
  /** The board run, and a line a node: what fails first (FAILS: each failing assertion, then each other check broken), then
   *  each node's status and a short reading of its outputs (those asked first; failures always). */
  const runLines = async (only?: Set<string>): Promise<string[]> => {
    engine = new Engine(board); await engine.run();
    const ids = nodesOf(board).map((n) => n.id), out: string[] = failsOf(engine, board).map((f) => `FAILS ${f}`);
    for (const id of ids) { const st = engine.state.get(id), bad = st?.status !== 'ok'; if (only && !only.has(id) && !bad) continue;
      if (bad) { out.push(`${id} ${st?.status ?? '?'}: ${(st?.error ?? '').slice(0, 320)}${hintOf(id, st?.error ?? '')}`); continue; }
      out.push(`${id} ok ${spaceLine(st!.out ?? {}) ?? Object.entries(st!.out ?? {}).filter(([k]) => k !== 'says').slice(0, 6).map(([k, v]) => `${k}=${brief(v, 50)}`).join(' ')}`); }
    return out.length > 40 ? [...out.slice(0, 40), `… and ${out.length - 40} more lines`] : out;
  };
  /** What a refusal leaves unsaid, said after it (decision 0026: a refusal says the fix): what to do where a piece made
   *  turned is put over or through, and the offers of what is wired in where a line or room named is not there. */
  const hintOf = (id: string, err: string): string => {
    const h = REFUSAL_HINTS.find(([re]) => re.test(err)); if (h) return ` (${h[1]})`;
    if (!/offers no (hole|holes|line|room)/.test(err) || /it offers/.test(err)) return '';
    const offers = [...new Set(edgesOf(board).filter((e) => e.to === id).flatMap((e) => (engine?.state.get(e.from)?.out?.offers as string[] | undefined) ?? []))];
    return offers.length ? ` (what is wired in offers: ${offers.join('; ').slice(0, 200)})` : '';
  };
  /** Settings a plan named otherwise than its block, read as the block names them: said back as notes, never refused. */
  let notes: string[] = [];
  /** What a plan's `s` may give a block: its settings, and the value of any input left unwired (as the page sets it). */
  const keysOf = (d: BlockDef) => new Set([...(d.settings ?? []).map((x) => x.key), ...portsOf(d, defaultsOf(d)).inputs.map((p) => p.name)]);
  /** A name or label given to a node whose block takes none: the node is labelled with it (a piece of a table is named by its
   *  size; the AI names pieces apart to tell them apart on the board). */
  const unnamed = (k: string) => /^(name|label|title)$/i.test(k);
  /** Nodes placed on the board from a plan's names, each block's settings checked against it: what was wrong, said. */
  const place = (given: unknown, bad: string[]): string[] => {
    // (nodes sent as text are read as JSON; anything but an object of named nodes is refused in one line, not one a character)
    let nodes = given; if (typeof nodes === 'string') { try { nodes = JSON.parse(nodes); } catch { /* said below */ } }
    if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) { if (given !== undefined) bad.push('nodes: write them as an object, {"name": {"b": "block id", "s": {…}}}'); return []; }
    for (const [nm, n] of Object.entries(nodes as Record<string, { b?: string; s?: Record<string, unknown> }>)) { const d = block(String(n.b)); if (!d) { bad.push(`${nm}: no block "${n.b}"`); continue; }
      // (a name already on the board is refused, never silently replaced (decision 0026): the node there is kept)
      const was = board.nodes[nm]; if (was && !was.deleted) { bad.push(`${nm}: a node of that name is on the board already (${was.block ?? 'a group'}): add it by another name, or set or remove that one`); continue; }
      const keys = keysOf(d), set: Record<string, unknown> = {}, wrong: string[] = [];
      let label = nm;
      for (const [k, v] of Object.entries(n.s ?? {})) { const r = readSetting(d, keys, k, v); if (!r.key) { if (unnamed(k)) { label = String(v); notes.push(`${nm}: ${d.id} takes no ${k}: its pieces keep the names its size gives; the node is labelled "${label}"`); continue; } wrong.push(k); continue; } set[r.key] = r.value; if (r.note) notes.push(`${nm}: ${r.note}`); }
      if (wrong.length) bad.push(`${nm}: ${d.id} has no setting or input ${wrong.join(', ')} (it has ${[...keys].join(', ') || 'none'})`);
      placeBlock(board, d.id, 0, 0, { ...defaultsOf(d), ...set }, nm); board.nodes[nm]!.label = label; }
    return Object.keys(nodes).filter((nm) => board.nodes[nm]);
  };
  const wireAll = (ws: string[], bad: string[]) => { for (const w of ws) { const m = /^(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)$/.exec(String(w).trim()); if (!m) { bad.push(`wire "${w}": write it a.out>b.in`); continue; }
    let out = m[2]!, why = wireRefused(board, m[1]!, out, m[3]!, m[4]!);
    // (a block wired where a thing goes, or a thing where a block goes, from a node that gives the other: wired as it
    // plainly means, and said (decision 0026, step 4: the plan asked again only to swap the output, then failed on the
    // unwire of a wire never made))
    const swap = why && new RegExp(`^${m[3]}\\.${m[4]} takes a (block|thing): wire ${m[1]}\\.(\\w+), not `).exec(why);
    if (swap) { const was = out; out = swap[2]!; why = wireRefused(board, m[1]!, out, m[3]!, m[4]!); if (why === undefined || why === '') notes.push(`${m[1]}.${was}>${m[3]}.${m[4]} wired as ${m[1]}.${out}>${m[3]}.${m[4]} (${m[3]}.${m[4]} takes a ${swap[1]})`); }
    if (why === '') continue; if (why) { bad.push(`wire ${m[1]}.${m[2]}>${m[3]}.${m[4]}: ${why}`); continue; }
    try { wire(board, m[1]!, out, m[3]!, m[4]!); } catch (e) { bad.push(`wire ${w}: ${(e as Error).message}`); } } };
  const doTool = async (name: string, a: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'find': return findLines(String(a.q ?? ''), 10);
      case 'card': { const d = block(String(a.id)); if (!d) throw new Error(`no block "${a.id}"`); return cardOf(d); }
      case 'build': { const bad: string[] = []; notes = []; board = emptyBoard(board.title); place(a.nodes ?? {}, bad); wireAll((a.wires ?? []) as string[], bad); return [...bad.map((x) => `! ${x}`), ...notes.map((x) => `note ${x}`), ...(await runLines())].join('\n'); }
      case 'open': { const t = String(a.title ?? '').toLowerCase(), hit = starterBoards().find(([title]) => title.toLowerCase().startsWith(t)) ?? starterBoards().find(([title]) => title.toLowerCase().includes(t));
        if (!hit) throw new Error(`no starter board "${a.title}": find it first`); board = hit[1](); return [`opened "${hit[0].slice(0, 80)}"`, ...(await runLines())].join('\n'); }
      case 'change': { const bad: string[] = [], touched = new Set<string>(); notes = [];
        // (made on a copy: the board open is replaced only when every check that held on it still holds (design §2.8))
        if (!engine) { engine = new Engine(board); await engine.run(); }
        const accepted = board, before = engine, held = heldOf(before, accepted); board = JSON.parse(JSON.stringify(board)) as Board;
        for (const id of (a.remove ?? []) as string[]) { if (!board.nodes[id]) { bad.push(`no node ${id}`); continue; } board.nodes[id] = { ...board.nodes[id]!, deleted: true }; for (const e of edgesOf(board)) if (e.from === id || e.to === id) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; }
        for (const w of (a.unwire ?? []) as string[]) { const [to, inp] = String(w).split('.'); const hit = edgesOf(board).filter((e) => e.to === to && e.in === inp);
          // (an input that is there and fed by nothing: nothing to cut, said; a node or an input that is not there: refused)
          if (!hit.length) { const real = !!board.nodes[to!] && !board.nodes[to!]!.deleted && new Engine(board).ports(to!).inputs.some((x) => x.name === inp); if (real) notes.push(`nothing fed ${w}: nothing to cut`); else bad.push(`nothing feeds ${w}`); } for (const e of hit) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; touched.add(to!); }
        for (const [id, kv] of Object.entries((a.set ?? {}) as Record<string, Record<string, unknown>>)) { const n = board.nodes[id], d = n?.block ? block(n.block) : undefined; if (!n || !d) { bad.push(`no node ${id}`); continue; }
          const keys = keysOf(d); for (const [k, v] of Object.entries(kv)) { const r = readSetting(d, keys, k, v); if (!r.key) { if (unnamed(k)) { n.label = String(v); notes.push(`${id}: ${d.id} takes no ${k}: the node is labelled "${n.label}"`); continue; } bad.push(`${id}: no setting or input ${k} (it has ${[...keys].join(', ')})`); continue; } if (r.note) notes.push(`${id}: ${r.note}`); n.set = { ...(n.set ?? {}), [r.key]: r.value }; } touched.add(id); }
        for (const k of place(a.add, bad)) touched.add(k);
        const ws = (a.wires ?? []) as string[]; wireAll(ws, bad); ws.forEach((w) => touched.add(String(w).split('>')[1]?.trim().split('.')[0] ?? ''));
        // (what the changes reach downstream is said too: a setting moved shows where it went)
        for (const e of edgesOf(board)) if (touched.has(e.from)) touched.add(e.to);
        const lines = [...bad.map((x) => `! ${x}`), ...notes.map((x) => `note ${x}`), ...(await runLines(touched))], now = heldOf(engine!, board), broke = [...held].filter((id) => board.nodes[id] && !board.nodes[id]!.deleted && !now.has(id));
        if (broke.length) { shadow = { board, engine: engine! }; board = accepted; engine = before;
          return [`NOT TAKEN: it breaks what held (${broke.join(', ')}); the board is as it was. The change is kept as a shadow (read it with shadow: true); change again to mend it.`, ...lines].join('\n'); }
        shadow = undefined; return lines.join('\n'); }
      case 'fold': {
        // (by default every node but the inputs (in.number, in.text, …): those stay outside, so what they feed becomes the new block's inputs)
        const ids = ((a.nodes as string[] | undefined) ?? nodesOf(board).filter((n) => !board.nodes[n.id]!.block?.startsWith('in.')).map((n) => n.id)).filter((id) => board.nodes[id] && !board.nodes[id]!.deleted);
        // (each output asked for is given a reader outside, so the wire to it crosses the fold and becomes the block's output)
        for (const o2 of (a.outs ?? []) as string[]) { const [n, port] = String(o2).split('.'); if (!board.nodes[n!]) throw new Error(`no node ${n}`); const sh = `${n}_${port}`; placeBlock(board, 'view.show', 0, 0, {}, sh); board.nodes[sh]!.label = `${port}`; wire(board, n!, port!, sh, 'value'); }
        const f = collapse(board, ids, String(a.name)), r = makeBlock(f.board, f.id, { name: String(a.name), says: String(a.says ?? ''), by: 'you' });
        board = r.board; const d = r.block; made.push({ id: d.id, name: d.name, says: d.says ?? '', domains: d.domains ?? ['software'], graph: d.graph! });
        return `${r.duplicateOf ? `does what ${r.duplicateOf} does already: that one placed. ` : 'saved. '}${cardOf(d)}`; }
      case 'read': { const from = a.shadow ? shadow?.engine : engine; if (a.shadow && !from) throw new Error('no change is waiting as a shadow'); const st = from?.state.get(String(a.node)); if (!st) throw new Error('build first'); if (!st.out || !(String(a.out) in st.out)) throw new Error(`${a.node} has no output ${a.out}`); const v = st.out[String(a.out)];
        return (Array.isArray(v) ? v.slice(0, 60).map((x) => brief(x, 240)).join('\n') + (v.length > 60 ? `\n… ${v.length - 60} more rows` : '') : brief(v, 2000)).slice(0, 6000); }
      case 'docs': { const f = DOCS[String(a.topic)]; if (!f) throw new Error(`no topic "${a.topic}"`); const { readFileSync } = await import(/* @vite-ignore */ 'node:fs');
        const lines = readFileSync(new URL(`../../docs/${f}`, import.meta.url), 'utf8').split('\n'), w = String(a.find ?? '').toLowerCase(), hits = lines.map((l, k) => (l.toLowerCase().includes(w) ? k : -1)).filter((k) => k >= 0).slice(0, 4);
        return hits.length ? hits.map((k) => lines.slice(Math.max(0, k - 1), k + 3).join('\n')).join('\n…\n').slice(0, 2500) : `nothing in ${f} holds "${a.find}"`; }
    }
    throw new Error(`no tool ${name}`);
  };
  return { doTool, board: () => board, made };
}

/** Words a plan names a setting by that a block names otherwise (decision 0026: a reasonable plan is read, not refused). */
const SETTING_ALSO: Record<string, string[]> = { material: ['mat', 'matter'], mat: ['matter', 'material'], matter: ['mat', 'material'], color: ['colour'], colour: ['color'], len: ['length'], count: ['n'], copies: ['n'], thread: ['size'], radius: ['R'] };
/** A face a plan names in words, read as one of the six faces. */
const FACE_WORDS: Record<string, string> = { top: '+y', up: '+y', above: '+y', bottom: '-y', down: '-y', below: '-y', right: '+x', left: '-x', front: '+z', back: '-z' };
/** A setting a plan names, read as its block names it: the key itself; the same key in another case or with spaces; a
 *  word the block says otherwise (`material` for `mat`); the one setting whose label holds the word whole (`thickness` for
 *  a plate's `t`). A choice given in another case, or a face in words (`top` for +y), read as the choice. No key where
 *  none is meant: the plan is told the keys there are. Each reading said back (a `note` line), never silent. */
export function readSetting(d: BlockDef, keys: Set<string>, k: string, v: unknown): { key?: string; value: unknown; note?: string } {
  const flat = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
  let key = keys.has(k) ? k : [...keys].find((x) => flat(x) === flat(k)) ?? (SETTING_ALSO[flat(k)] ?? []).find((x) => keys.has(x));
  if (!key && /^[a-z]{3,}$/.test(flat(k))) { const hits = (d.settings ?? []).filter((x) => x.label && new RegExp(`\\b${flat(k)}\\b`, 'i').test(x.label)); if (hits.length === 1) key = hits[0]!.key; }
  if (!key) return { value: v };
  const cs = (d.settings ?? []).find((s) => s.key === key)?.choices?.map(String), said = key !== k ? [`${k} read as ${key}`] : []; let value = v;
  if (cs && typeof v === 'string' && !cs.includes(v)) { const w = v.toLowerCase().trim(), c = cs.find((x) => x.toLowerCase() === w) ?? (cs.includes('+y') ? FACE_WORDS[w] : undefined); if (c) { value = c; said.push(`"${v}" read as ${c}`); } }
  return { key, value, ...(said.length ? { note: said.join('; ') } : {}) };
}
/** What to do where an operation refuses: a piece made turned (a valve laid along its flow) as its sleeve or passer, a sleeve slid where the line is not clear. */
const REFUSAL_HINTS: [RegExp, string][] = [
  [/is turned: a sleeve goes over/, 'a piece made turned slides over nothing: make it the host (wire its block into host) and pass the straight part through its line, or take a part made upright'],
  [/is turned or bent: a passer goes along/, 'what is turned or bent passes no further: pass the straight piece first, into what is turned as its host'],
  [/^no room over .* would meet /, 'that end of the line is in or against it: a longer piece the line is on, or `where`/`along` at a stretch clear of it'],
];

/** What a piece's or an operation's run is said as to the AI (decision 0026): its pieces, its mass and every line and
 *  room it offers (what the next operation names), any refusal, never the block's insides; undefined for any other node. */
export function spaceLine(o: Record<string, unknown>): string | undefined {
  if (!o.block || typeof o.block !== 'object' || !Array.isArray(o.offers) || typeof o.pieces !== 'number') return undefined;
  let kg: number | undefined; try { kg = o.thing ? massOfAll(o.thing as Assembly) : undefined; } catch { kg = undefined; }
  return `pieces=${o.pieces}${kg !== undefined && Number.isFinite(kg) ? ` mass=${+(kg).toPrecision(4)} kg` : ''} offers=[${(o.offers as string[]).join('; ')}]${o.refused ? ` refused=${brief(o.refused, 200)}` : ''}${typeof o.rate === 'number' ? ` rate=${brief(o.rate)}` : ''}${typeof o.note === 'string' && o.note ? ` note=${brief(o.note, 200)}` : ''}`;
}

/** Why the AI's wire may not be made, as the fix to make (decision 0026: its plans checked as they are made, by the same
 *  check the dashboard's hand wiring uses, `Engine.canWire` and `fits`): no such node; an output that is not there, with
 *  the ones that are; an input that is not there, with the ones that are; a thing where a block goes (or a block where a
 *  thing goes), with the output to wire instead; any other type or unit that does not fit, or a loop; a second wire into
 *  an input that takes one (never silently replaced: unwire it first). `''` for the very wire already there (nothing to
 *  do), undefined where it may be made. */
export function wireRefused(board: Board, from: string, out: string, to: string, inp: string): string | undefined {
  const fn = board.nodes[from], tn = board.nodes[to];
  if (!fn || fn.deleted) return `no node ${from} on the board`; if (!tn || tn.deleted) return `no node ${to} on the board`;
  const e = new Engine(board), outs = e.ports(from).outputs, ins = e.ports(to).inputs, op = outs.find((p) => p.name === out), ip = ins.find((p) => p.name === inp);
  const fb = fn.block ?? 'a group', tb = tn.block ?? 'a group';
  if (!op && outs.length) return `${from} (${fb}) has no output ${out}: it gives ${outs.map((p) => p.name).join(', ')}`;
  // (the sinks that take what they are given by any name, and a folded board with no inputs of its own, as wire() allows)
  const open = ['group.out', 'view.show', 'view.table', 'view.chart', 'view.gauge', 'space.show'].includes(tb) || (!!tn.inner && !ins.length);
  if (!ip) return open ? undefined : `${to} (${tb}) has no input ${inp}: it takes ${ins.map((p) => `${p.name}${p.many ? ' (many)' : ''}`).join(', ') || 'nothing'}`;
  if (!op) return undefined;
  const there = edgesOf(board).filter((x) => x.to === to && x.in === inp);
  if (there.some((x) => x.from === from && x.out === out)) return '';
  if (!ip.many && there.length) return `${to}.${inp} takes one wire and has one (${there[0]!.from}.${there[0]!.out}): unwire "${to}.${inp}" first to change it`;
  const r = e.canWire(from, out, to, inp); if (r.ok) return undefined;
  const gives = (t: string) => outs.find((p) => p.type === t)?.name;
  if (ip.type === 'block' && op.type !== 'block') return `${to}.${inp} takes a block: ${gives('block') ? `wire ${from}.${gives('block')}, not ${from}.${out}` : `${from} (${fb}) gives none (a piece or an operation does: its block)`}`;
  if (op.type === 'block' && ip.type === 'assembly') return `${to}.${inp} takes a thing: ${gives('assembly') ? `wire ${from}.${gives('assembly')}, not ${from}.${out}` : `${from} gives none`}`;
  return r.why;
}

/** One turn's tool calls, each run, kept by stepOf (its refusals and failures whole) and answered to the model; a tool that
 *  throws is kept as failed. agentBuild's every turn goes through it. */
export async function callTools(uses: readonly { id: string; name: string; input: unknown }[], doTool: (name: string, a: Record<string, unknown>) => Promise<string>, steps: AgentStep[]): Promise<Anthropic.ToolResultBlockParam[]> {
  const results: Anthropic.ToolResultBlockParam[] = [];
  for (const b of uses) { const s0 = Date.now(); let out: string, err = false; try { out = await doTool(b.name, (b.input ?? {}) as Record<string, unknown>); } catch (e) { out = (e as Error).message; err = true; }
    steps.push(stepOf(b.name, b.input, out, Date.now() - s0, err)); results.push({ type: 'tool_result', tool_use_id: b.id, content: out, ...(err ? { is_error: true } : {}) }); }
  return results;
}

/** What a model's reply is: its answer (every text block, in order) when it ends, or the tools it calls; a refusal is an
 *  error. agentBuild reads every reply through it (plain data in, no model needed to test it). */
export function turnOf(r: { stop_reason: string | null; stop_details?: { explanation?: string | null } | null; content: readonly { type: string; text?: string; id?: string; name?: string; input?: unknown }[] }): { ends: true; answer: string } | { ends: false; uses: { id: string; name: string; input: unknown }[] } {
  if (r.stop_reason === 'refusal') throw new Error(`declined: ${r.stop_details?.explanation ?? ''}`);
  if (r.stop_reason !== 'tool_use') return { ends: true, answer: r.content.map((b) => (b.type === 'text' ? b.text ?? '' : '')).join('') };
  return { ends: false, uses: r.content.filter((b) => b.type === 'tool_use').map((b) => ({ id: String(b.id), name: String(b.name), input: b.input })) };
}

/** What the relay sends the page of a run: all of it (its near misses, diff and certificates with the rest). */
export const relayBody = (r: AgentRun): string => JSON.stringify(r);

/** A run's record, the one way agentBuild ends (answered or stopped): what it did, and what is worked out from that: its
 *  near misses from its steps and answer, its diff and certificates from the boards. (The wiring is guarded by testing
 *  this, and by the gate reading that agentBuild ends only through it and keeps each step by `stepOf`.) */
export async function runOf(r: Omit<AgentRun, 'nearMisses' | 'diff' | 'certificates'> & { start: Board }): Promise<AgentRun> {
  const { start, ...rest } = r;
  return { ...rest, nearMisses: nearMissesOf(r.steps, r.answer, r.board), ...(await certifiedOf(start, r.board)) };
}

// ---- the three ways to build (decision 0025): by hand, Assist (one call, a plan), Auto (agentBuild) -------------------
// Each makes the same thing: a plan in the build or change tool's own form, run by toolsFor's own tools, so what a person
// taps, what one cheap call writes and what the agent does are one path. The plan is the board's nodes and wires; no
// place is in it: the operations give every place.

/** What every piece and operation gives (said once in the cards, not on every line). */
const ROOM_GIVES = 'block,thing,pieces,faces,offers,says';
/** The cards of the blocks most builds are made of, a line each: the pieces, the operations, the bolted joint, and the
 *  show, measure and assert nodes; their inputs (`?` optional), and settings with defaults and choices. Read from the
 *  library, so a piece added there is here at once. */
/** The pieces whose cards go in full with the guide: what most builds use. */
const CORE_PIECES = new Set(['piece.bolt', 'piece.nut', 'piece.washer', 'piece.plate', 'piece.case', 'piece.pipe', 'piece.run', 'piece.section', 'piece.bearing', 'piece.cell', 'piece.led', 'piece.wire', 'piece.header', 'piece.standoff']);
export function piecesCard(): string {
  const ids = [...LIBRARY.keys()].filter((id) => /^(piece|room|mate)\./.test(id) || ['space.show', 'measure', 'assert'].includes(id)).sort();
  // (a list of choices said by more than one card is said once, named, and each card names it: the pipe sizes, the
  // metric sizes and the fits were most of the cards' length)
  const listOf = (x: SettingDef) => `${x.choices!.slice(0, 8).join('|')}${x.choices!.length > 8 ? '|…' : ''}`, seen = new Map<string, number>();
  // (counted over the cards sent in full only: a list only the other pieces' cards hold is never said here, decision 0027)
  const inFull = (id: string) => !id.startsWith('piece.') || CORE_PIECES.has(id);
  for (const id of ids.filter(inFull)) for (const x of block(id)!.settings ?? []) if (x.choices) seen.set(listOf(x), (seen.get(listOf(x)) ?? 0) + 1);
  const named = new Map([...seen].filter(([l, n]) => n > 1 && l.length > 20).map(([l], k) => [l, `L${k + 1}`] as const));
  const line = (d: BlockDef) => { const ps = portsOf(d, defaultsOf(d)), outs = ps.outputs.map((p) => p.name).join(','), offers = offersOf(d);
    const sets = (d.settings ?? []).map((x) => `${x.key}=${brief(x.default, 24)}${x.choices ? ` [${named.get(listOf(x)) ?? listOf(x)}]` : ''}`);
    return `${d.id}${ps.inputs.length ? `(${ps.inputs.map((p) => `${p.name}${p.optional ? '?' : ''}${p.many ? '*' : ''}`).join(', ')})` : ''}${outs === ROOM_GIVES ? '' : ` → ${outs}`}${sets.length ? ` | ${sets.join('; ')}` : ''}${offers.length ? ` | offers ${offers.join(', ')}` : ''}`; };
  // (the operations, the joints and the pieces most builds use, in full; every other piece by its aisle (parts/aisles.ts),
  // a line a trade: each aisle its count, and its pieces' short ids while the cards stay within CARDS_ROOM, in the
  // catalogue's order; past that an aisle is its count alone, and past even that a trade is: `find` brings any piece by
  // what it is or its size and the named cards send it, so the prefix stays short however many pieces there are
  // (decision 0026, the user 2026-11-06: a thousand more parts))
  const full = (id: string) => !id.startsWith('piece.') || CORE_PIECES.has(id), aisles = new Map<string, string[]>();
  for (const id of ids.filter((x) => !full(x))) { const a = aisleOf(block(id)) ?? 'Other / Not yet in an aisle'; aisles.set(a, [...(aisles.get(a) ?? []), id.slice('piece.'.length)]); }
  const trades = new Map<string, [string, string[]][]>();
  for (const [a, xs] of [...aisles].sort(([a], [b]) => a.localeCompare(b))) { const [t, c] = splitAisle(a); trades.set(t, [...(trades.get(t) ?? []), [c, xs]]); }
  const order = [...trades].sort(([a], [b]) => tradeRank(a) - tradeRank(b) || a.localeCompare(b));
  const head = `## The cards you need most (as \`card\` gives them; each piece and operation gives ${ROOM_GIVES} unless an arrow says; block into the next operation, thing only to show, measure, assert; * takes many wires; offers: its lines and rooms, <key> a setting's value)\n${[...named].map(([l, n]) => `${n}=[${l}]`).join(' ')}\n${ids.filter(full).map((id) => line(block(id)!)).join('\n')}\n## The other pieces, by trade (\`find\` any by what it is, its size, its aisle or its trade: "M8 nut", "608 bearing", "2x4", "Garden"; then \`card\` one for its settings and offers)\n`;
  // (decision 0029, after the panel's critique: the cached head names each trade once (its families, its aisles); the
  // aisles and the ids are found by `find` (a trade's or an aisle's word lists its families), never listed here, so the
  // head stays short however many parts there are)
  return head + order.map(([t, cs]) => `${t}: ${cs.reduce((n, [, xs]) => n + xs.length, 0)} in ${cs.length} aisle${cs.length === 1 ? '' : 's'}`).join('\n');
}

/** The board as the model is told it, short: a line a node (its name, its block, the settings that are not the block's
 *  own, each value cut to 60 characters), then every wire: never cut (decision 0026: the quadcopter's and the robot
 *  base's wires were lost at the old 1,600-character cut, and a change to them was planned blind); only past `room`
 *  (a board of hundreds of nodes) are the settings dropped, the names, blocks and wires kept. Empty for an empty board. */
export function boardBrief(b: Board | undefined, room = 12_000): string {
  const ns = b ? nodesOf(b) : []; if (!b || !ns.length) return '';
  const lineOf = (id: string, withSet: boolean) => { const x = b.nodes[id]!, d = x.block ? block(x.block) : undefined, def = d ? defaultsOf(d) : {};
    const set = withSet ? Object.entries(x.set ?? {}).filter(([k, v]) => JSON.stringify(def[k]) !== JSON.stringify(v)).map(([k, v]) => [k, typeof v === 'string' && v.length > 60 ? `${v.slice(0, 60)}…` : v]) : [];
    return `${id}: ${x.block ?? 'a group'}${set.length ? ` ${JSON.stringify(Object.fromEntries(set))}` : ''}`; };
  const ws = edgesOf(b).filter((e) => e.out && e.in).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`);
  const of = (withSet: boolean) => `The board open (${ns.length} nodes; change it by these names):\n${ns.map((n) => lineOf(n.id, withSet)).join('\n')}${ws.length ? `\nwires: ${ws.join(' ')}` : ''}`;
  const t = of(true); return t.length > room ? of(false) : t;
}

/** A plan: the build or change tool's own input, and a line of what it makes. */
export type PlanNodes = Record<string, { b: string; s?: Record<string, unknown> }>;
export interface AgentPlan { tool: 'build' | 'change'; input: { nodes?: PlanNodes; add?: PlanNodes; set?: Record<string, Record<string, unknown>>; remove?: string[]; wires?: string[]; unwire?: string[] }; says: string }
/** What a plan's run gave: the board after it, the tool's lines, and the lines that failed (refused, failing, not taken). */
export interface PlanRan { board: Board; out: string; failing: string[] }
/** Assist's one call: its plan (or why there is none), what the model wrote, and what it cost. */
export interface PlanRun { plan?: AgentPlan; error?: string; text: string; model: string; tokens: AgentRun['tokens']; ms: number }

/** The plan in a model's reply: its first JSON object (fenced or not), held to the build or change tool's form; anything
 *  else said back as an error, never guessed at. */
/** The first JSON object in a model's reply (fenced or not), from its first brace to the one that closes it, minding
 *  braces in strings; none, one not closed, or one that is not JSON, said as `no <what> in the reply: …`. */
export function firstJson(text: string, what = 'plan'): Record<string, unknown> {
  const s = text.replace(/```(?:json)?/g, ''), i = s.indexOf('{'); if (i < 0) throw new Error(`no ${what} in the reply: it holds no JSON object`);
  let depth = 0, inStr = false, esc = false, j = -1;
  for (let k = i; k < s.length; k++) { const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) { j = k; break; } }
  if (j < 0) throw new Error(`no ${what} in the reply: its JSON object is not closed (the reply was cut short?)`);
  try { return JSON.parse(s.slice(i, j + 1)) as Record<string, unknown>; } catch (e) { throw new Error(`no ${what} in the reply: ${(e as Error).message}`); }
}
export function planOf(text: string): AgentPlan {
  const o = firstJson(text);
  const tool = o.tool === 'build' || o.tool === 'change' ? o.tool : o.nodes ? 'build' : 'change';
  const named = (v: unknown, what: string): PlanNodes | undefined => { if (v === undefined) return undefined;
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${what}: write them as an object, {"name": {"b": "block id", "s": {…}}}`);
    for (const [nm, n] of Object.entries(v as Record<string, unknown>)) { if (!/^\w+$/.test(nm)) throw new Error(`${what}: the name "${nm}" (letters, digits and _ only: a wire reads it)`); if (!n || typeof (n as { b?: unknown }).b !== 'string') throw new Error(`${what}.${nm}: no block id (b)`); }
    return v as PlanNodes; };
  const strings = (v: unknown, what: string): string[] | undefined => { if (v === undefined) return undefined; if (!Array.isArray(v) || !v.every((x) => typeof x === 'string')) throw new Error(`${what}: a list of strings`); return v as string[]; };
  const input: AgentPlan['input'] = {};
  if (tool === 'build') { input.nodes = named(o.nodes, 'nodes'); if (!input.nodes || !Object.keys(input.nodes).length) throw new Error('a build with no nodes'); }
  else { input.add = named(o.add, 'add'); if (o.set !== undefined) { if (!o.set || typeof o.set !== 'object' || Array.isArray(o.set)) throw new Error('set: {"name": {"key": value}}'); input.set = o.set as AgentPlan['input']['set']; }
    input.remove = strings(o.remove, 'remove'); input.unwire = strings(o.unwire, 'unwire'); }
  input.wires = strings(o.wires, 'wires');
  for (const k of Object.keys(input) as (keyof AgentPlan['input'])[]) if (input[k] === undefined) delete input[k];
  if (tool === 'change' && !Object.keys(input).length) throw new Error('a change that changes nothing');
  return { tool, input, says: typeof o.says === 'string' ? o.says.slice(0, 300) : '' };
}

/** The lines of a tool's result that say something failed: a refusal (`! `), a check that fails (`FAILS`), a change not
 *  taken, a node that failed or is left waiting (it has nothing yet: decision 0026, so Assist never says nothing failed
 *  while one waits). What Assist asks again with, and only that. */
export const failingOf = (out: string): string[] => out.split('\n').filter((l) => /^(! |FAILS |NOT TAKEN)/.test(l) || /^\S+ (failed|error|waiting): /.test(l)).map((l) => l.slice(0, 300));

/** A plan run on a board by toolsFor's own tools (the page runs it so, by hand or from Assist, and a test the same way). */
export async function runPlan(plan: AgentPlan, board: Board, blocks?: AgentBlock[]): Promise<PlanRan> {
  const t = await toolsFor(structuredClone(board), blocks), out = await t.doTool(plan.tool, plan.input as Record<string, unknown>);
  return { board: t.board(), out, failing: failingOf(out) };
}

/** One step by hand: a piece (its block and settings) joined to what is there by an operation the room offers, as a plan.
 *  On an empty board the piece alone is built; else the piece and the operation are added, the host's block and the
 *  piece's wired into the operation (into `blocks` in that order for a stack, else the host into `host` and the piece into
 *  the operation's other input: child, passer or sleeve). Names are the block's last word and a number not yet used. */
export function joinPlan(board: Board, piece: { b: string; s?: Record<string, unknown> }, join?: { op: string; s?: Record<string, unknown>; host: string }): AgentPlan {
  const taken = new Set(Object.keys(board.nodes)), name = (id: string) => { const w = id.split('.').pop()!.replace(/\W/g, ''); let k = 1; while (taken.has(`${w}${k}`)) k++; taken.add(`${w}${k}`); return `${w}${k}`; };
  const p = name(piece.b), node = { b: piece.b, ...(piece.s && Object.keys(piece.s).length ? { s: piece.s } : {}) }, what = (block(piece.b)?.name ?? piece.b).toLowerCase();
  if (!nodesOf(board).length || !join) return nodesOf(board).length ? { tool: 'change', input: { add: { [p]: node } }, says: `${what} added on its own` } : { tool: 'build', input: { nodes: { [p]: node } }, says: what };
  const d = block(join.op); if (!d) throw new Error(`no operation "${join.op}"`);
  const ins = portsOf(d, { ...defaultsOf(d), ...join.s }).inputs.map((x) => x.name), op = name(join.op);
  const wires = ins.includes('host') ? [`${join.host}.block>${op}.host`, `${p}.block>${op}.${ins.find((x) => x !== 'host')}`] : [`${join.host}.block>${op}.${ins[0]}`, `${p}.block>${op}.${ins[0]}`];
  // (a stack is told its order, the host first, so it does not hang on the names' order as text: decision 0026)
  const os = { ...(join.s ?? {}), ...(!ins.includes('host') && (d.settings ?? []).some((x) => x.key === 'order') && !join.s?.order ? { order: `${join.host},${p}` } : {}) };
  return { tool: 'change', input: { add: { [p]: node, [op]: { b: join.op, ...(Object.keys(os).length ? { s: os } : {}) } }, wires }, says: `${what}, ${d.name.toLowerCase()} of ${join.host}` };
}

/** How Assist's one call is told to answer (after the guide and the cards, so it is cached with them). */
const PLAN_RULE = `## Here: one plan, no tools
In this call you have no tools and one reply. Reply with one JSON object and nothing else:
\`{"tool": "build", "nodes": {…}, "wires": […], "says": "…"}\` for a new board (the board is empty, or what is asked is new), or
\`{"tool": "change", "add": {…}, "set": {…}, "remove": […], "wires": […], "says": "…"}\` to edit the board listed, by its names.
Nodes and wires exactly as the build tool takes them; blocks and settings from the cards above (another block only if you
are sure of its id and inputs). \`says\`: one sentence of what it makes. Give no numbers of your own: the board, run, gives
them. Asked again with what failed: a change that mends only those lines.`;

/** The cards of the blocks the person saved, a line each (the tool loop registers them and `find` reaches them; Assist has
 *  one call, so they are sent with it): after the cached prefix, as they differ from person to person. */
export function savedCards(blocks?: AgentBlock[]): string {
  for (const x of blocks ?? []) if (!block(x.id)) { try { register(groupBlock(x.graph, { id: x.id, name: x.name, says: x.says, domains: x.domains, by: 'you' })); } catch { /* one that no longer opens is left out */ } }
  const ds = (blocks ?? []).map((x) => block(x.id)).filter((d): d is BlockDef => !!d);
  return ds.length ? `Blocks you saved (place them by their id like any other):\n${ds.map(cardOf).join('\n')}` : '';
}

/** What Assist's one call is sent: the blocks the person saved, the cards of the pieces the request names (namedCards),
 *  the board's short listing, then the request, or, asked again, only what failed; where a change was not taken (it broke
 *  a node that ran), that the board above is as it was and a change must keep every node that runs running. */
export function planAsk(request: string, board?: Board, failing?: string[], blocks?: AgentBlock[], named?: string): string {
  const kept = failing?.some((l) => l.startsWith('NOT TAKEN')) ? '\nThe board above is as it was: a change is taken only if every node that runs on it still runs, so keep them (a setting only to a value its card lists).' : '';
  return [savedCards(blocks), named, boardBrief(board), failing?.length ? `Asked: ${request.slice(0, 400)}\nWhen the plan ran, these failed (mend only them, with a change):\n${failing.slice(0, 12).join('\n')}${kept}` : request].filter(Boolean).join('\n\n');
}

/** Assist's one request as sent (decision 0026): the guide, the cards, the worked plans and the plan rule as one system
 *  block cached by its own breakpoint (the same text every call: read back at a tenth); after it, the saved blocks' cards,
 *  the cards of the pieces the request names (namedCards), the board and the request (no top-level caching: it would
 *  write this one-off tail to the cache every call, never read). */
export async function planRequest(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; board?: Board; failing?: string[]; blocks?: AgentBlock[] } = {}) {
  return { model: o.model ?? AGENT_MODEL, max_tokens: 4000, system: cachedSystem(`${await guideOf()}\n\n${PLAN_RULE}`), output_config: { effort: o.effort ?? 'low' }, messages: [{ role: 'user', content: planAsk(request, o.board, o.failing, o.blocks, await namedCards(request)) }] } satisfies Anthropic.MessageCreateParamsNonStreaming;
}

/** Assist (decision 0025): one call, no tool loop, no second model: the request answered by a plan in the build or change
 *  tool's own form, for the page to show, let a person change, and run itself (runPlan). Under Node, as agentBuild. */
export async function agentPlan(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; board?: Board; failing?: string[]; blocks?: AgentBlock[]; signal?: AbortSignal } = {}): Promise<PlanRun> {
  if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the agent runs under Node with it set (the environment\'s secrets); a page holds no keys');
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), t0 = Date.now();
  const r = await client.messages.create(await planRequest(request, o), { signal: o.signal ?? AbortSignal.timeout(60_000) });
  const turn = turnOf(r), text = turn.ends ? turn.answer : '';
  const tokens = { in: r.usage.input_tokens, out: r.usage.output_tokens, cached: r.usage.cache_read_input_tokens ?? 0, written: r.usage.cache_creation_input_tokens ?? 0 };
  try { return { plan: planOf(text), text: text.slice(0, 4000), model: r.model, tokens, ms: Date.now() - t0 }; }
  catch (e) { return { error: (e as Error).message, text: text.slice(0, 4000), model: r.model, tokens, ms: Date.now() - t0 }; }
}

// ---- composing a thing of several things (decision 0027) -------------------------------------------------------------
// The user asked for "a drone with a robot arm attached" and got a plate with a rod: one call wrote a whole machine in one
// plan. Here a compound request is built as a circuit of small calls, each with one task, each failure-aware:
//   1. split (one call, quick): the request's parts, each with what it starts from (a library assembly, a starter board,
//      or an aisle of pieces), and the joins between them in plain words. Waits for nothing; fails where no JSON comes back
//      (said, nothing built).
//   2. each part (no call where it starts from an assembly or a starter board; else one Assist call with the part alone as
//      the request, run by the tools, asked again once with only its failing lines): a part that still fails is said.
//   3. each part's board folded to one node (collapse), its block and thing its outputs: one node a part.
//   4. join (one call, default): given each part's block (its pieces, its size and what it offers), a change of operations
//      and joints that makes them one thing; run; asked again once with only what failed.
//   5. check (no call): every part's pieces in the final block, one group by the faces the operations wrote, nothing
//      failing; what is not met is said in the answer.
// The caller gives `ask` (the Node SDK in the relay, sdkAsk; the viewer's account on claude.ai, askClaude), so one pipeline
// runs in both. A prompt's head before PROMPT_CUT is the same every call (the guide and its cards): cached where it can be.

/** One call to a model: the whole prompt in, its text out. `tier` how hard the task is (quick for a split or a part). */
export type Ask = (prompt: string, tier: 'quick' | 'default' | 'complex') => Promise<string>;
/** Where a prompt's fixed head ends and its one-off tail begins. */
export const PROMPT_CUT = '\n\n---\n\n';
/** A part of a compound request: as the split said it, then what was made of it. */
export interface ComposePart { name: string; is: string; from: string; set?: Record<string, unknown>;
  /** the split said it is several things itself: split again (decision 0028) */ split?: boolean;
  /** how it was made: placed from the library, a part remembered placed again, a starter board opened, a plan by one
   *  call, split into parts of its own (each made so, joined, folded), or not made */ by?: 'assembly' | 'remembered' | 'starter' | 'plan' | 'split' | 'none';
  /** its node on the final board, its pieces' names (each once a piece), and what still failed when it was made */ node?: string; names: string[]; failing: string[];
  /** the part not made that the final check built this one in place of (decision 0028) */ instead?: string;
  /** the id it is kept under (remembered, decision 0028; or the remembered part it was placed from), and its own parts */ saved?: string; children?: ComposePart[] }
export interface ComposeJoin { part: string; how: string; to: string }
/** One step of the pipeline, a line for the chat. */
export interface ComposeStep { stage: 'split' | 'part' | 'fold' | 'join' | 'gate' | 'remember' | 'check'; line: string; ok: boolean }
/** The run's steps as a tree (decision 0028), for the pages to show: each part, how it was made, the id it is kept
 *  under, its pieces, what still fails, its own parts. */
export interface ComposeNode { name: string; is: string; by: NonNullable<ComposePart['by']>; from: string; saved?: string; pieces: number; failing: string[]; children: ComposeNode[] }
export interface ComposeRun { board: Board; parts: ComposePart[]; joins: ComposeJoin[]; steps: ComposeStep[]; unmet: string[]; answer: string; asks: number; plans: AgentPlan[];
  /** each part as a tree; the ids kept for later in this run; the remembered parts placed again; what the final check found missing */
  tree: ComposeNode[]; remembered: string[]; recalled: string[]; missing: string[] }

/** A request that names two or more things (a drone and an arm, a crane and a truck): Assist hands it to composeBuild.
 *  Words of machines, each counted once; a singular arm only ("the arms of a cross frame" is one thing). A guess from the
 *  words, said as one: the split call says what the parts are. */
const MACHINES: RegExp[] = [/\b(drone|quadcopter|quad ?copter|multirotor)\b/, /\b(robot(ic)? arm|arm)\b(?!s)/, /\bgripper\b/, /\b(robot|rover)\b/, /\b(car|truck|lorry|trailer|cart|wagon|tractor|forklift|excavator)\b/, /\bcrane\b/, /\bcamera\b/, /\bpan[- ]tilt\b/, /\bconveyor\b/, /\b(lamp|light)\b/, /\b(3d )?printer\b/, /\b(axis|axes|gantry)\b/, /\b(boat|ship|plane|aircraft|glider)\b/, /\bturret\b/, /\b(bike|bicycle|scooter)\b/, /\b(table|desk|chair|shelf)\b/, /\b(pump|tank)\b/, /\b(winch|hoist)\b/, /\b(legs?|walker)\b/];
export const isCompound = (request: string): boolean => MACHINES.filter((re) => re.test(request.toLowerCase())).length >= 2;

/** The short list the split chooses from: the assemblies (seed.*, and the blocks the person saved that are not parts kept
 *  in memory: those are recalled by the request's words, after the cached head) by id and a few words, the starter boards
 *  by the words before their colon, and the aisles of pieces by trade. */
async function composeMenu(blocks?: AgentBlock[]): Promise<string> {
  savedCards(blocks);
  const { starterBoards } = await import('./starters'), kept = new Set(savedParts().map((p) => p.id));
  const asm = [...LIBRARY.values()].filter((d) => d.id.startsWith('seed.') && d.id !== 'seed.spring-checked' || d.by === 'you' && !kept.has(d.id)).map((d) => `${d.id}: ${d.name}: ${(d.says ?? '').slice(0, 90)}`);
  const starts = starterBoards().map(([t]) => t.split(':')[0]!.trim()).filter((t) => t.length >= 6);
  const trades = new Map<string, number>(); for (const id of LIBRARY.keys()) if (id.startsWith('piece.')) { const t = block(id)!.domains?.[0] ?? 'other'; trades.set(t, (trades.get(t) ?? 0) + 1); }
  return `Assemblies (from: the id):\n${asm.join('\n')}\nStarter boards (from: the title as written):\n${starts.join('; ')}\nAisles of pieces (from: "aisle <trade>"): ${[...trades].map(([t, n]) => `${t} (${n})`).join(', ')}`;
}
const SPLIT_RULE = `## Here: the parts of what is asked (one task: name the parts, build nothing)
Reply with one JSON object and nothing else:
{"parts": [{"name": "drone", "is": "a quadcopter: four motors on a cross frame", "from": "<an assembly's id, a remembered part's id, a starter board's title, or aisle <trade>>"}, …], "joins": [{"part": "arm", "how": "under", "to": "drone"}]}
A part is a thing a person names (a drone, an arm, a camera, a truck, a lamp's base): one to five of them, never a bolt or
a plate alone. name: one short word (letters, digits, _), each its own. is: what it is, in a few words, enough to build it
from. from: a part remembered (listed with the request, built before and checked) or the assembly or starter board that is
that thing (as written in the lists), else the aisle its pieces come from. "split": true on a part that is itself several
things with nothing to start from (it is split again). set: an assembly's settings only where asked. joins: each part but
one goes onto, under, beside, through, into, around or bolted to another part.`;
/** A part remembered, a line for the split: its id, name, what it says and offers, what it was made for, its uses. */
const rememberedLine = (p: SavedPart): string => `${p.id}: ${p.name}: ${p.says.slice(0, 90)}${p.offers?.length ? `; offers [${p.offers.slice(0, 6).join('; ')}]` : ''} (made for "${p.from.slice(0, 60)}"; ${p.checked.pieces} pieces; used ${p.uses} time${p.uses === 1 ? '' : 's'})`;
/** The split call's prompt: the menu, then the rule (the cached head), then the parts remembered for these words (they
 *  differ request by request), then the request. */
export async function splitAsk(request: string, blocks?: AgentBlock[], recalled: readonly SavedPart[] = []): Promise<string> {
  const mem = recalled.length ? `Parts remembered (built before, each checked to run with nothing failing and be one thing; from: the id, placed as one node like an assembly):\n${recalled.map(rememberedLine).join('\n')}\n\n` : '';
  return `${await composeMenu(blocks)}\n\n${SPLIT_RULE}${PROMPT_CUT}${mem}Request: ${request.slice(0, 600)}`;
}
/** The split as a model answers it, held to its form: parts with names a wire can read, each once; joins between them. */
export function splitOf(text: string): { parts: ComposePart[]; joins: ComposeJoin[] } {
  const o = firstJson(text, 'split'), ps = o.parts;
  if (!Array.isArray(ps) || !ps.length) throw new Error('no parts in the split: "parts" is a list of {name, is, from}');
  const seen = new Set<string>(), parts: ComposePart[] = ps.slice(0, 6).map((p, k) => { const x = (p ?? {}) as Record<string, unknown>;
    let name = String(x.name ?? `part${k + 1}`).toLowerCase().replace(/\W+/g, '_').replace(/^_+|_+$/g, '') || `part${k + 1}`; if (/^\d/.test(name)) name = `p${name}`;
    while (seen.has(name)) name = `${name}${k + 1}`; seen.add(name);
    const from = String(x.from ?? '').slice(0, 120);
    return { name, is: String(x.is ?? x.what ?? name).slice(0, 300), from, ...(x.split === true || /^split$/i.test(from.trim()) ? { split: true } : {}), ...(x.set && typeof x.set === 'object' && !Array.isArray(x.set) ? { set: x.set as Record<string, unknown> } : {}), names: [], failing: [] }; });
  const named = (s: unknown) => { const t = String(s ?? '').toLowerCase().replace(/\W+/g, '_'); return parts.find((p) => p.name === t)?.name; };
  const joins = (Array.isArray(o.joins) ? o.joins : []).map((j) => { const x = (j ?? {}) as Record<string, unknown>; return { part: named(x.part ?? x.a), how: String(x.how ?? 'onto').slice(0, 40), to: named(x.to ?? x.b) }; })
    .filter((j): j is ComposeJoin => !!j.part && !!j.to && j.part !== j.to);
  return { parts, joins };
}

/** The nodes that only show, weigh or check: taken off a part's board before it is folded (the final board shows the whole). */
const SINKS = new Set(['space.show', 'measure', 'assert', 'view.show', 'view.table', 'view.chart', 'view.gauge']);
type RoomOut = { name?: string; pieces: readonly { name: string }[]; faces: readonly { a: number; b: number }[]; lo?: readonly number[]; hi?: readonly number[]; rooms?: readonly { name: string }[] };
const isRoom = (v: unknown): v is RoomOut => !!v && typeof v === 'object' && Array.isArray((v as RoomOut).pieces) && Array.isArray((v as RoomOut).faces);
/** The groups a block's pieces fall in, joined by the faces the operations wrote: each group its pieces' indices, the
 *  biggest first (one group: one thing). */
export function groupsIn(b: RoomOut): number[][] { const up = b.pieces.map((_, i) => i), find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i]!)));
  for (const f of b.faces) up[find(f.a)] = find(f.b); const m = new Map<number, number[]>(); for (let i = 0; i < b.pieces.length; i++) { const r = find(i); m.set(r, [...(m.get(r) ?? []), i]); }
  return [...m.values()].sort((x, y) => y.length - x.length); }
/** How many groups a block's pieces fall in, joined by the faces the operations wrote (one: one thing). */
export function groupsOf(b: RoomOut): number { return groupsIn(b).length; }
/** What a block offers by name: its pieces' lines and its rooms. */
const offersIn = (b: RoomOut): string[] => [...new Set([...b.pieces.flatMap((p) => ((p as { lines?: { port: string }[] }).lines ?? []).map((l) => l.port)), ...(b.rooms ?? []).map((r) => r.name)])];
/** A block said for the join call: its pieces, its size in mm (x by y by z) and what it offers. */
const roomLine = (b: RoomOut): string => { const size = b.lo && b.hi ? ` ${[0, 1, 2].map((k) => Math.round((b.hi![k]! - b.lo![k]!) * 1000)).join(' x ')} mm (x by y by z)` : '', os = offersIn(b);
  return `${b.pieces.length} pieces${size}, offers [${os.slice(0, 14).join('; ')}${os.length > 14 ? `; … ${os.length - 14} more` : ''}]`; };
/** The biggest block a run board makes, on any output (a piece's or an operation's `block`, an assembly's `motor`): its
 *  node, its output and the block: what a part, or the whole, is. */
function biggest(b: Board, e: Engine): [string, string, RoomOut] | undefined {
  let best: [string, string, RoomOut] | undefined;
  for (const n of nodesOf(b)) { const st = e.state.get(n.id); if (st?.status !== 'ok') continue;
    for (const [port, v] of Object.entries(st.out ?? {})) if (isRoom(v) && (!best || v.pieces.length > best[2].pieces.length)) best = [n.id, port, v]; }
  return best;
}
/** A part's board folded to one node of the name given (dataflow's collapse): its show and check nodes taken off, its
 *  biggest block and its thing the group's outputs. A board of one node (a library assembly placed) is that node, unless
 *  `always` (a part to be remembered: its inner board is what is kept). Undefined where it makes no block. */
async function foldPart(src: Board, name: string, always = false): Promise<{ node: Board['nodes'][string]; block: RoomOut; folded: boolean } | undefined> {
  const b = structuredClone(src);
  for (const n of nodesOf(b)) if (SINKS.has(b.nodes[n.id]!.block ?? '')) { b.nodes[n.id] = { ...b.nodes[n.id]!, deleted: true }; for (const x of edgesOf(b)) if (x.from === n.id || x.to === n.id) b.edges[x.id] = { ...b.edges[x.id]!, deleted: true }; }
  const e = new Engine(b); await e.run(); const top = biggest(b, e); if (!top) return undefined;
  const ids = nodesOf(b).map((n) => n.id); if (ids.length === 1 && !always) return { node: { ...b.nodes[ids[0]!]!, label: name }, block: top[2], folded: false };
  for (const out of [top[1], 'thing']) { if (!(out in (e.state.get(top[0])?.out ?? {}))) continue; const r = `${name}__${out}`; placeBlock(b, 'view.show', 0, 0, {}, r); wire(b, top[0], out, r, 'value'); }
  const f = collapse(b, ids, name, name), node = f.board.nodes[name]!;
  return { node: { ...node, label: name }, block: top[2], folded: true };
}
/** The pieces' names of a block, each as often as it is a piece. */
const namesOf = (b: RoomOut): string[] => b.pieces.map((p) => p.name);
/** Names counted, for a line: "prop blade ×8, motor bell ×4". */
const counted = (names: readonly string[], most = 10): string => { const m = new Map<string, number>(); for (const n of names) m.set(n, (m.get(n) ?? 0) + 1); const xs = [...m].sort((a, b) => b[1] - a[1]);
  return `${xs.slice(0, most).map(([n, k]) => (k > 1 ? `${n} ×${k}` : n)).join(', ')}${xs.length > most ? `, … ${xs.length - most} more kinds` : ''}`; };
/** What a board made, said where it made no block: each node, its block, and what it gave or why it did not run. */
async function madeOf(b: Board): Promise<string> {
  const e = new Engine(structuredClone(b)); await e.run(); const ns = nodesOf(b);
  return ns.length ? ns.slice(0, 8).map((n) => { const st = e.state.get(n.id); return `${n.id} (${b.nodes[n.id]!.block ?? 'a group'}: ${st?.status === 'ok' ? `gave ${Object.keys(st.out ?? {}).slice(0, 4).join(', ') || 'nothing'}` : `${st?.status ?? 'not run'}${st?.error ? ` ${st.error.slice(0, 80)}` : ''}`})`; }).join(', ') + (ns.length > 8 ? `, … ${ns.length - 8} more` : '') : 'no nodes';
}
/** At most n of these at once (the calls a run makes side by side). */
function limiter(n: number): <T>(f: () => Promise<T>) => Promise<T> {
  let on = 0; const wait: (() => void)[] = [];
  return async (f) => { while (on >= n) await new Promise<void>((r) => wait.push(r)); on++; try { return await f(); } finally { on--; wait.shift()?.(); } };
}
/** Each of xs through f, at most n at once, the results in xs's order. */
async function eachAtMost<T, R>(xs: readonly T[], n: number, f: (x: T, k: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, xs.length) }, async () => { while (next < xs.length) { const k = next++; out[k] = await f(xs[k]!, k); } }));
  return out;
}
/** How deep a part is split again (parts of parts of parts: two levels below the request's own). */
const DEEPEST = 2;
/** The final check's rule (one task: what is missing, build nothing). */
const GATE_RULE = `## Here: what is missing (one task: check, build nothing)
A person asked for a thing; it was built from the parts listed with their pieces. Reply with one JSON object and nothing else:
{"missing": [{"name": "propeller", "is": "a two-blade propeller", "joins": "onto motor", "from": "<an assembly's or a remembered part's id, only if one is it>"}]}
Missing: a thing the person named, or plainly needs to be what they asked (a boat's hull, a turbine's blades), that no part
built is. An empty list when nothing is missing. Never a bolt, a plate or a wire alone; never a part already built again.`;

/** A compound request built from its parts by small calls, each one task (decisions 0027, 0028): the parts remembered
 *  recalled first; split (a part of several things split again, two levels at most); each part placed from the library
 *  (an assembly or a part remembered), a starter board, or one plan (never skipped: asked again once where no plan could
 *  be read), parts side by side three at once, each folded to one node and, built by a plan or a split and checked (nothing
 *  failing, one group), remembered; joined, and what is left loose named and joined again (twice at most); a final check
 *  call for what is missing, each built and joined the same way (two rounds at most); checked; the whole remembered when
 *  it passes. `ask` makes each call; `onStep` hears each step's line and the board as it stands. A new board: what was
 *  open before is the caller's to keep (the page's Undo). `remember: false` keeps nothing (a test that must leave the
 *  library as it was). */
export async function composeBuild(request: string, o: { ask: Ask; board?: Board; blocks?: AgentBlock[]; onStep?: (s: ComposeStep, board: Board) => void; remember?: boolean }): Promise<ComposeRun> {
  const { starterBoards } = await import('./starters'), steps: ComposeStep[] = [], plans: AgentPlan[] = [], unmet: string[] = [], remembered: string[] = [], recalled: string[] = [], missing: string[] = [];
  let board: Board = emptyBoard(request.slice(0, 80)), asks = 0;
  const keep = o.remember !== false, three = limiter(3);
  const say = (stage: ComposeStep['stage'], line: string, ok = true) => { const s = { stage, line, ok }; steps.push(s); o.onStep?.(s, board); };
  const call = async (prompt: string, tier: Parameters<Ask>[1]) => { asks++; return three(() => o.ask(prompt, tier)); };
  const guideHead = `${await guideOf()}\n\n${PLAN_RULE}`, asPrompt = (r: Awaited<ReturnType<typeof planRequest>>) => `${guideHead}${PROMPT_CUT}${String((r.messages[0] as { content: unknown }).content)}`;
  const treeOf = (p: ComposePart): ComposeNode => ({ name: p.name, is: p.is, by: p.by ?? 'none', from: p.from, ...(p.saved ? { saved: p.saved } : {}), pieces: p.names.length, failing: p.failing, children: (p.children ?? []).map(treeOf) });
  let parts: ComposePart[] = [], joins: ComposeJoin[] = [];
  registerSaved(); // (parts kept in a store apart from this run, as blocks: placed like an assembly)
  const done = (answer: string): ComposeRun => ({ board, parts, joins, steps, unmet, answer, asks, plans, tree: parts.map(treeOf), remembered, recalled, missing });

  /** A part kept for later (built by a plan or a split, nothing failing, one group): its folded board, what it is, the
   *  request, its check and the split's words as tags. */
  const keepPart = (p: ComposePart, f: { node: Board['nodes'][string]; block: RoomOut }, tags: string[]) => {
    if (!keep || p.failing.length || !f.node.inner || groupsOf(f.block) !== 1) return;
    try { const s = remember({ name: p.name, says: p.is, graph: f.node.inner, from: request, checked: { pieces: f.block.pieces.length, groups: 1, failing: 0 }, tags: [...new Set([p.name, ...tags].filter(Boolean))], offers: offersIn(f.block).slice(0, 20) });
      p.saved = s.id; if (!remembered.includes(s.id)) remembered.push(s.id); say('remember', `${p.name}: kept for later as ${s.id}${s.uses ? ` (the same board as one kept before: used ${s.uses} time${s.uses === 1 ? '' : 's'})` : ''}`); }
    catch (x) { say('remember', `${p.name}: could not be kept (${(x as Error).message.slice(0, 120)})`, false); }
  };

  /** Parts on a board joined into one thing: one join call (asked again once with only what failed), then what is left
   *  loose (a part not in the whole, pieces of the whole that touch nothing of it, by its faces) named and joined by one
   *  more call, twice at most. The board after, and the lines that still fail. */
  const joinUp = async (b: Board, items: readonly ComposePart[], js: readonly ComposeJoin[], what: string, whole?: string): Promise<{ board: Board; failing: string[] }> => {
    let e = new Engine(b); await e.run();
    const offerOf = (x: Engine, p: ComposePart) => { const st = x.state.get(p.node!), out = (st?.out ?? {}) as Record<string, unknown>; return `${p.node} (${p.is.slice(0, 80)}): ${Object.entries(out).filter(([, v]) => isRoom(v)).map(([port, v]) => `${p.node}.${port}: ${roomLine(v as RoomOut)}`).join(' | ') || `not run: ${st?.error ?? st?.status}`}`; };
    const RULE = `Reply with one JSON object and nothing else, a change: {"tool": "change", "add": {…}, "wires": […], "says": "…"}. Add only operations and joints (room.onto with face -y for under, +y for on top, ±x or ±z for beside; room.stack; room.through; room.over; room.into; mate.bolted; mate.plate; room.turn) that put every part's block into one block, each operation's block into the next, and a space.show of the last one's thing. Never a new piece in place of a part.`;
    const joinTask = `## Here: join the parts into one thing (one task)
Asked: ${what.slice(0, 400)}
Each part is one node on the board, by its name; what it gives (wire its block into an operation; name a line or room it offers):
${items.map((p) => offerOf(e, p)).join('\n')}${whole ? `\n(${whole} is the whole built so far: join the others to it.)` : ''}
Joins asked: ${js.map((j) => `${j.part} ${j.how} ${j.to}`).join(', ') || 'as the request says'}.
${RULE}`;
    let failing: string[] = [];
    try { const plan = planOf(await call(`${guideHead}${PROMPT_CUT}${boardBrief(b)}\n\n${joinTask}`, 'default')); plans.push(plan);
      let ran = await runPlan(plan, b, o.blocks); b = ran.board;
      say('join', `${plan.says || 'joined'}: ${Object.keys(plan.input.add ?? {}).length} node(s)${ran.failing.length ? `; ${ran.failing.length} line(s) failed: ${ran.failing[0]!.slice(0, 120)}` : ', nothing failed'}`, !ran.failing.length);
      if (ran.failing.length) {
        try { const mend = planOf(await call(`${guideHead}${PROMPT_CUT}${planAsk(what, ran.board, ran.failing)}\n\n${joinTask}`, 'default')); plans.push(mend);
          const again = await runPlan(mend, ran.board, o.blocks); if (again.failing.length <= ran.failing.length) { ran = again; b = ran.board; }
          say('join', `asked again with only what failed: ${ran.failing.length ? `${ran.failing.length} line(s) still fail: ${ran.failing[0]!.slice(0, 120)}` : 'nothing fails now'}`, !ran.failing.length); }
        catch (x) { say('join', `asked again: ${(x as Error).message}`, false); } }
      failing = ran.failing;
    } catch (x) { say('join', `Could not join them: ${(x as Error).message}`, false); failing = [`could not join: ${(x as Error).message}`]; }
    // (what is left loose, named; one more join call with only those, twice at most, taken where it leaves less loose)
    const looseOf = (x: Engine, bb: Board) => { const top = biggest(bb, x); if (!top) return { top, lines: [] as string[] };
      const left = new Map<string, number>(); for (const nm of namesOf(top[2])) left.set(nm, (left.get(nm) ?? 0) + 1);
      const out = items.filter((p) => p.names.length && p.names.filter((nm) => { const n = left.get(nm) ?? 0; if (n > 0) { left.set(nm, n - 1); return false; } return true; }).length > p.names.length / 2);
      const gs = groupsIn(top[2]).slice(1);
      return { top, lines: [...out.map((p) => `${p.node}: not in the whole (${offerOf(x, p).slice(p.node!.length + 2)})`), ...gs.slice(0, 4).map((g) => `in ${top[0]}.${top[1]}, ${g.length} piece${g.length === 1 ? '' : 's'} touching nothing of the rest: ${counted(g.map((i) => top[2].pieces[i]!.name), 4)}`)] }; };
    for (let t = 0; t < 2; t++) {
      e = new Engine(b); await e.run(); const { top, lines } = looseOf(e, b); if (!top || !lines.length) break;
      say('join', `not joined to the rest: ${lines.map((l) => l.split(':')[0]).join(', ')}; asked once more with only those`, false);
      const task = `## Here: join the parts into one thing (one task: what is left loose)
Asked: ${what.slice(0, 400)}
The board runs, but these are not joined to the rest (by the faces the operations wrote, they touch nothing of the whole):
${lines.join('\n')}
The whole so far: ${top[0]}.${top[1]}: ${roomLine(top[2])}.
${RULE.replace('put every part\'s block into one block', 'join each of these to the whole (an operation taking the whole\'s block and the loose one\'s, either the host: the one the other stands on, hangs from or goes into)')}`;
      try { const plan = planOf(await call(`${guideHead}${PROMPT_CUT}${boardBrief(b)}\n\n${task}`, 'default')); plans.push(plan);
        const ran = await runPlan(plan, b, o.blocks), x = new Engine(ran.board); await x.run(); const after = looseOf(x, ran.board);
        if (ran.failing.length <= failing.length && after.lines.length < lines.length) { b = ran.board; failing = ran.failing; say('join', `${plan.says || 'joined'}: ${after.lines.length ? `${after.lines.length} still loose` : 'nothing loose now'}`, !after.lines.length); }
        else say('join', `the change for what is loose not taken: ${ran.failing.length > failing.length ? `${ran.failing.length} line(s) failed: ${ran.failing[0]!.slice(0, 120)}` : 'it left as much loose'}`, false); }
      catch (x) { say('join', `asked for what is loose: ${(x as Error).message}`, false); break; }
    }
    return { board: b, failing };
  };

  /** A part by one plan (asked again once where no plan could be read; once more with only what failed or was left loose). */
  const planPart = async (p: ComposePart, of: string) => {
    const ask1 = `${p.name}: ${p.is} (one part of "${of.slice(0, 160)}")`;
    let plan: AgentPlan | undefined, err = '';
    for (let t = 0; t < 2 && !plan; t++) { try { plan = planOf(await call(asPrompt(await planRequest(t ? `${ask1}\nYour reply before could not be read (${err.slice(0, 160)}): reply with one build plan, {"tool": "build", "nodes": {…}, "wires": […], "says": "…"}, at least one node, built from the pieces and the operations.` : ask1, { blocks: o.blocks })), 'quick')); } catch (e) { err = (e as Error).message; } }
    if (!plan) { p.by = 'none'; p.failing = [err]; say('part', `${p.name}: no plan could be read in two replies (${err.slice(0, 120)})`, false); return undefined; }
    plans.push(plan);
    // (what the plan's block leaves loose: its groups but the biggest, named, a failing line to mend)
    const looseIn = async (b: Board): Promise<string[]> => { const e = new Engine(structuredClone(b)); await e.run(); const top = biggest(b, e); if (!top) return []; const gs = groupsIn(top[2]); if (gs.length < 2) return [];
      return [`! not one thing: ${top[0]}.${top[1]} falls in ${gs.length} groups; not joined to the rest (they touch nothing of it): ${gs.slice(1, 5).map((g) => counted(g.map((i) => top[2].pieces[i]!.name), 4)).join(' | ')} (put each onto, into, over or through a piece of the rest)`]; };
    let ran = await runPlan(plan, emptyBoard(p.name), o.blocks), bad = [...ran.failing, ...await looseIn(ran.board)];
    if (bad.length) { say('part', `${p.name}: ${bad.length} line(s) failed or loose; asked again with only those`, false);
      try { const mend = planOf(await call(asPrompt(await planRequest(ask1, { board: ran.board, failing: bad, blocks: o.blocks })), 'quick')); plans.push(mend); const again = await runPlan(mend, ran.board, o.blocks), bad2 = [...again.failing, ...await looseIn(again.board)]; if (bad2.length <= bad.length) { ran = again; bad = bad2; } }
      catch (e) { bad = [...bad, `asked again: ${(e as Error).message}`]; } }
    p.by = 'plan'; p.failing = bad;
    const folded = await foldPart(ran.board, p.name, true);
    if (!folded) { p.by = 'none'; const what = await madeOf(ran.board); p.failing = [...bad, `its plan made no block: it made ${what}`]; say('part', `${p.name}: its plan made no block: it made ${what}${bad.length ? ` (${bad[0]!.slice(0, 120)})` : ''}`, false); return undefined; }
    p.names = namesOf(folded.block);
    say('part', `${p.name}: built by one plan, ${folded.block.pieces.length} pieces${bad.length ? `; still failing: ${bad[0]!.slice(0, 120)}` : ''}`, !bad.length); say('fold', `${p.name}: its board folded to one node`);
    keepPart(p, folded, [p.from.replace(/^aisle\s+/i, ''), 'plan']); return folded;
  };

  /** One part made (its own board) and folded to one node; undefined where nothing could be made (said, with why). */
  const makePart = async (p: ComposePart, depth: number, of: string): Promise<{ node: Board['nodes'][string]; block: RoomOut } | undefined> => {
    const f = p.from.trim(), nothing = !f || /^aisle\b/i.test(f) || /^(none|nothing|pieces?|plan|split|new|-+)$/i.test(f);
    const id = nothing ? '' : f.replace(/^["'`]|["'`:]$/g, ''), d = id ? block(id) : undefined, low = id.toLowerCase();
    const start = !d && low.length >= 5 ? starterBoards().find(([t]) => t.toLowerCase().startsWith(low)) ?? starterBoards().find(([t]) => t.toLowerCase().split(':')[0]!.includes(low)) : undefined;
    const placed = async (made: Board, line: string) => {
      const folded = await foldPart(made, p.name); if (!folded) { p.by = 'none'; p.failing = [`its board made no block: it made ${await madeOf(made)}`]; say('part', `${p.name}: ${p.failing[0]}`, false); return undefined; }
      p.names = namesOf(folded.block); say('part', `${p.name}: ${line}, ${folded.block.pieces.length} pieces`); say('fold', folded.folded ? `${p.name}: its board folded to one node` : `${p.name}: one node already`); return folded; };
    if (d && buildsInSpace(d) && !OLD_BUILD.test(d.id)) {
      // (a library assembly, a part remembered, or a piece: one node, its settings as the split gave them where it has them)
      const b = emptyBoard(p.name), keys = new Set([...(d.settings ?? []).map((x) => x.key), ...portsOf(d, defaultsOf(d)).inputs.map((x) => x.name)]), set: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(p.set ?? {})) { const r = readSetting(d, keys, key, v); if (r.key) set[r.key] = r.value; }
      placeBlock(b, d.id, 0, 0, { ...defaultsOf(d), ...set }, p.name);
      const mine = savedParts().find((x) => x.id === d.id); p.by = mine ? 'remembered' : 'assembly'; used(d.id);
      if (mine) { p.saved = d.id; if (!recalled.includes(d.id)) recalled.push(d.id); }
      return placed(b, mine ? `the part remembered ${d.id} (made for "${mine.from.slice(0, 60)}", used ${mine.uses + 1} time${mine.uses ? 's' : ''})` : `the assembly ${d.id}`);
    }
    if (start) { p.by = 'starter'; return placed(start[1](), `the starter board "${start[0].split(':')[0]}"`); }
    if (depth < DEEPEST && (p.split || isCompound(p.is))) { const m = await splitPart(p, depth, of); if (m) return m; }
    return planPart(p, of);
  };

  /** A part that is several things: split again, its parts made side by side, joined, folded to one node; undefined where
   *  the split gives nothing (the part is then built by one plan). */
  const splitPart = async (p: ComposePart, depth: number, of: string) => {
    let sub: ReturnType<typeof splitOf>;
    try { sub = splitOf(await call(await splitAsk(`${p.is} (the part "${p.name}" of "${of.slice(0, 160)}")`, o.blocks, recall(p.is, 6)), 'quick')); }
    catch (e) { say('split', `${p.name}: could not split it again (${(e as Error).message.slice(0, 120)}); built by one plan`, false); return undefined; }
    say('split', `${p.name} split again: ${sub.parts.map((c) => `${c.name} (from ${c.from || 'pieces'})`).join(', ')}${sub.joins.length ? `; ${sub.joins.map((j) => `${j.part} ${j.how} ${j.to}`).join(', ')}` : ''}`);
    p.children = sub.parts;
    const got = await eachAtMost(sub.parts, 3, (c) => makePart(c, depth + 1, p.is));
    let b = emptyBoard(p.name); sub.parts.forEach((c, k) => { if (got[k]) { b.nodes[c.name] = { ...got[k]!.node, label: c.name, x: k * 420, y: 0 }; c.node = c.name; } });
    const inside = sub.parts.filter((c) => c.node); if (!inside.length) { say('part', `${p.name}: none of its parts was made; built by one plan`, false); return undefined; }
    let failing: string[] = [];
    if (inside.length > 1) ({ board: b, failing } = await joinUp(b, inside, sub.joins, `${p.name}: ${p.is}`));
    const folded = await foldPart(b, p.name, true); if (!folded) { say('part', `${p.name}: its parts joined made no block; built by one plan`, false); return undefined; }
    p.by = 'split'; p.names = namesOf(folded.block); p.failing = [...sub.parts.flatMap((c) => (c.node ? c.failing : [`${c.name} not made: ${c.failing[0] ?? 'nothing to start from'}`])), ...failing];
    say('part', `${p.name}: split into ${inside.length} part${inside.length === 1 ? '' : 's'}, joined, ${folded.block.pieces.length} pieces${p.failing.length ? `; still failing: ${p.failing[0]!.slice(0, 120)}` : ''}`, !p.failing.length); say('fold', `${p.name}: its parts folded to one node`);
    keepPart(p, folded, [...sub.parts.map((c) => c.name), 'split']); return folded;
  };

  // (1. what was built before, recalled by the request's words; then the split)
  const mem = recall(request);
  try { ({ parts, joins } = splitOf(await call(await splitAsk(request, o.blocks, mem), 'quick'))); }
  catch (e) { say('split', `Could not split it into parts: ${(e as Error).message}`, false); unmet.push('no parts: the split failed'); return done(`Nothing built: the split failed (${(e as Error).message}).`); }
  say('split', `${parts.length} part${parts.length === 1 ? '' : 's'}: ${parts.map((p) => `${p.name} (${p.is.slice(0, 50)}; from ${p.from || 'pieces'})`).join(', ')}${joins.length ? `; ${joins.map((j) => `${j.part} ${j.how} ${j.to}`).join(', ')}` : ''}${mem.length ? `; ${mem.length} part${mem.length === 1 ? '' : 's'} remembered offered` : ''}`);
  // (2 and 3. each part made and folded to one node, three side by side)
  const place = (p: ComposePart, f: { node: Board['nodes'][string] } | undefined, k: number, y = 0) => { if (!f) return; let nm = p.name; while (board.nodes[nm]) nm = `${nm}_${k + 2}`; board.nodes[nm] = { ...f.node, label: nm, x: k * 420, y }; p.node = nm; };
  (await eachAtMost(parts, 3, (p) => makePart(p, 0, request))).forEach((f, k) => place(parts[k]!, f, k));
  const made = () => parts.filter((p) => p.node);
  if (!made().length) { unmet.push('no part was made'); return done(`Nothing built: no part was made (${parts.map((p) => `${p.name}: ${p.failing[0] ?? 'not made'}`).join('; ').slice(0, 300)}).`); }
  // (4. join: each part's block said as runPlan's engine gives it, then one change that joins them; what is loose, again)
  if (made().length > 1) board = (await joinUp(board, made(), joins, request)).board;
  // (5. the final check: one quick call names what is missing; each built and joined the same way, two rounds at most)
  const ids = [...LIBRARY.keys()].filter((id) => id.startsWith('seed.') && id !== 'seed.spring-checked');
  for (let round = 0; round < 2; round++) {
    let e = new Engine(board); await e.run(); const top = biggest(board, e);
    const built = made().map((p) => `${p.node} (${p.is.slice(0, 70)}): ${p.names.length} pieces: ${counted(p.names)}`).join('\n');
    let want: (ComposePart & { joins: string })[] = [];
    try { const o2 = firstJson(await call(`${GATE_RULE}\nAssemblies (from): ${ids.join(', ')}${PROMPT_CUT}${mem.length ? `Parts remembered (from): ${mem.map((x) => `${x.id} (${x.name})`).join(', ')}\n` : ''}Asked: ${request.slice(0, 600)}\nBuilt:\n${built}${top ? `\nThe whole: ${top[2].pieces.length} pieces` : ''}`, 'quick'), 'check');
      const have = new Set([...parts.map((p) => p.name), ...Object.keys(board.nodes)]);
      want = (Array.isArray(o2.missing) ? o2.missing : []).slice(0, 3).map((m, k) => { const x = (m ?? {}) as Record<string, unknown>; let name = String(x.name ?? `missing${k + 1}`).toLowerCase().replace(/\W+/g, '_').replace(/^_+|_+$/g, '') || `missing${k + 1}`; if (/^\d/.test(name)) name = `p${name}`; const asked = name, instead = parts.find((q) => q.name === asked && !q.node)?.name; while (have.has(name)) name = `${name}2`; have.add(name);
        return { name, is: String(x.is ?? name).slice(0, 300), from: String(x.from ?? '').slice(0, 120), names: [], failing: [], joins: String(x.joins ?? 'onto the whole').slice(0, 60), ...(instead ? { instead } : {}) }; }); }
    catch (x) { say('gate', `the final check could not be read: ${(x as Error).message.slice(0, 160)}`, false); break; }
    if (!want.length) { say('gate', `nothing missing${round ? ' now' : ''}: ${made().map((p) => p.name).join(', ')}`); break; }
    missing.push(...want.map((p) => p.name)); say('gate', `missing: ${want.map((p) => `${p.name} (${p.is.slice(0, 60)})`).join(', ')}; built and joined`, false);
    const fs = await eachAtMost(want, 3, (p) => makePart(p, 0, request)); want.forEach((p, k) => place(p, fs[k], k, 400 * (round + 1))); parts.push(...want);
    const fresh = want.filter((p) => p.node); if (!fresh.length) continue;
    e = new Engine(board); await e.run(); const now = biggest(board, e);
    const host: ComposePart | undefined = now ? { name: now[0], node: now[0], is: 'the whole built so far', from: '', names: namesOf(now[2]), failing: [] } : undefined;
    board = (await joinUp(board, [...(host ? [host] : []), ...fresh], fresh.map((p) => ({ part: p.name, how: p.joins, to: host?.name ?? 'the whole' })), request, host?.name)).board;
  }
  // (a show of the whole, where the plan put none)
  let e = new Engine(board); await e.run();
  const top = biggest(board, e);
  if (top && !nodesOf(board).some((n) => board.nodes[n.id]!.block === 'space.show') && 'thing' in (e.state.get(top[0])?.out ?? {})) { const sh = board.nodes.show ? 'show_whole' : 'show'; placeBlock(board, 'space.show', 0, 0, {}, sh); wire(board, top[0], 'thing', sh, 'thing'); e = new Engine(board); await e.run(); }
  // (6. check: nothing failing, every part's pieces in the whole, one group)
  const bad = nodesOf(board).filter((n) => e.state.get(n.id)?.status !== 'ok');
  if (bad.length) unmet.push(`${bad.length} node(s) not ok: ${bad.slice(0, 3).map((n) => `${n.id} ${e.state.get(n.id)?.status ?? '?'} ${(e.state.get(n.id)?.error ?? '').slice(0, 100)}`).join('; ')}`);
  const whole = biggest(board, e)?.[2];
  for (const p of parts) {
    if (!p.node && parts.some((q) => q.node && q.instead === p.name)) continue;
    if (!p.node) { unmet.push(`${p.name} not made: ${(p.failing[0] ?? 'nothing to start from').slice(0, 140)}`); continue; }
    if (p.failing.length) unmet.push(`${p.name} still fails: ${p.failing[0]!.slice(0, 140)}`);
    const left = new Map<string, number>(); for (const nm of whole ? namesOf(whole) : []) left.set(nm, (left.get(nm) ?? 0) + 1);
    const miss = p.names.filter((nm) => { const n = left.get(nm) ?? 0; if (n > 0) { left.set(nm, n - 1); return false; } return true; }).length;
    if (miss) unmet.push(`${p.name} is not in the build: ${miss} of its ${p.names.length} pieces missing from the whole`);
  }
  const g = whole ? groupsOf(whole) : 0;
  if (!whole) unmet.push('no block made'); else if (g !== 1) unmet.push(`the build falls in ${g} groups, not one thing`);
  // (the whole kept for later when it passes and is more than one library block placed)
  const before = savedParts().find((x) => x.tags.includes('whole') && x.from === request);
  if (keep && !unmet.length && whole && before) { used(before.id); say('remember', `the whole as kept before for this request, ${before.id}: used ${before.uses + 1} time${before.uses ? 's' : ''}`); }
  else if (keep && !unmet.length && whole && (made().length > 1 || made().some((p) => p.by === 'plan' || p.by === 'split'))) {
    const f = await foldPart(board, 'whole', true);
    if (f?.node.inner) try { const s = remember({ name: request.slice(0, 60), says: `${request.slice(0, 200)}: ${made().map((p) => p.name).join(', ')}`, graph: f.node.inner, from: request, checked: { pieces: whole.pieces.length, groups: 1, failing: 0 }, tags: ['whole', ...made().map((p) => p.name)], offers: offersIn(whole).slice(0, 20) });
      if (!remembered.includes(s.id)) remembered.push(s.id); say('remember', `the whole kept for later as ${s.id}`); } catch (x) { say('remember', `the whole could not be kept (${(x as Error).message.slice(0, 120)})`, false); }
  }
  say('check', unmet.length ? `Not met: ${unmet.join('; ')}` : `Checked: ${made().length} part${made().length === 1 ? '' : 's'} in one thing of ${whole!.pieces.length} pieces, nothing failing`, !unmet.length);
  const how = (p: ComposePart) => (p.by === 'assembly' ? 'a library assembly' : p.by === 'remembered' ? `remembered, ${p.saved}` : p.by === 'starter' ? 'a starter board' : p.by === 'split' ? `split into ${p.children?.filter((c) => c.node).length ?? 0} parts` : 'one plan');
  board.title = request.replace(/^./, (c) => c.toUpperCase()).slice(0, 80);
  return done(`${unmet.length ? 'Built in part' : 'Built'}: ${request.slice(0, 120)}, from ${made().map((p) => `${p.name} (${how(p)}, ${p.names.length} pieces)`).join(', ')}${whole ? `; the whole ${whole.pieces.length} pieces${g === 1 ? ', one thing' : ''}` : ''}.${remembered.length ? ` Kept for later: ${remembered.join(', ')}.` : ''}${unmet.length ? `\nNot met: ${unmet.join('; ')}` : ''}`);
}

/** An Ask by the Node SDK (the relay): the prompt's head before PROMPT_CUT one cached system block, its tail the message;
 *  each call's tokens added to `tokens`. Under Node, where ANTHROPIC_API_KEY is. */
export function sdkAsk(o: { model?: string; signal?: AbortSignal; tokens?: AgentRun['tokens'] } = {}): Ask {
  return async (prompt, tier) => {
    if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the relay runs under Node with it set (the environment\'s secrets); a page holds no keys');
    const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), k = prompt.indexOf(PROMPT_CUT);
    const head = k >= 0 ? prompt.slice(0, k) : '', tail = k >= 0 ? prompt.slice(k + PROMPT_CUT.length) : prompt;
    const r = await client.messages.create({ model: o.model ?? AGENT_MODEL, max_tokens: 6000, ...(head ? { system: cachedSystem(head) } : {}), output_config: { effort: tier === 'quick' ? 'low' : 'medium' }, messages: [{ role: 'user', content: tail }] }, { signal: o.signal ?? AbortSignal.timeout(90_000) });
    if (o.tokens) { o.tokens.in += r.usage.input_tokens; o.tokens.out += r.usage.output_tokens; o.tokens.cached += r.usage.cache_read_input_tokens ?? 0; o.tokens.written += r.usage.cache_creation_input_tokens ?? 0; }
    const turn = turnOf(r); return turn.ends ? turn.answer : '';
  };
}

const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
register({ version: 1, by: 'built in', pure: false, id: 'agent.build', name: 'Claude builds a board', kind: 'ai', ability: 'ask', domains: ['intelligence', 'pipelines', 'software', 'everyday'],
  spec: { gloss: 'What board does Claude build, run and check for this request, through the node system alone?', discipline: 'intelligence.agents.tools', role: 'data source', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010178.10010219', label: 'Computing methodologies: distributed artificial intelligence (agents)' }] },
  says: 'A request in words handed to Claude, which works only through the node system\'s own eight tools (docs/FOR-AI.md, its whole instruction, and the cards of the pieces and operations after it): find blocks, read a block\'s card, build a whole board from a short plan and run it, open a starter board, change the board in place and run it, read an output, fold nodes into a saved block, read the docs by topic; it fixes what failed and builds again. Its board, every step it took (the tool, what it asked, what came back), and its answer, each number with the node it came from. Claude Haiku 5.5 at low effort unless more is asked; at most so many steps and seconds. Under Node, where ANTHROPIC_API_KEY is',
  settings: [{ key: 'request', label: 'What to build', type: 'code', default: 'A coil spring with a rate of about 40000 N/m: build it and give its mass' }, { key: 'model', label: 'Model (the cheapest unless the task needs more)', type: 'choice', default: 'claude-haiku-5-5', choices: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] }, { key: 'effort', label: 'Effort', type: 'choice', default: 'low', choices: ['low', 'medium', 'high'] }, { key: 'steps', label: 'At most, steps', type: 'number', default: 30 }, { key: 'seconds', label: 'At most, seconds', type: 'number', default: 180 }],
  ports: { inputs: [P('request', 'text', { optional: true })], outputs: [P('board', 'record', { label: 'the board it built' }), P('steps', 'table', { label: 'each step: tool, what it asked, what came back' }), P('answer', 'text'), P('near misses', 'table', { label: 'each near miss its run caught: its kind, the tool, what, the response' }), P('says', 'text')] },
  run: async (i, c) => { const t0 = Date.now(), r = await agentBuild(String(i.request ?? c.set.request), { model: String(c.set.model), effort: c.set.effort as 'low', steps: Number(c.set.steps), seconds: Number(c.set.seconds), signal: c.signal });
    return nodeOutputsOf(r, (Date.now() - t0) / 1000); } } as BlockDef);

/** What the node 'Claude builds a board' gives from a run: its board, each step, its answer, the near misses its run
 *  caught (each with its kind; dropped here before: the evaluator, 2026-11-01) and a line of what it cost. */
export function nodeOutputsOf(r: AgentRun, seconds: number): Record<string, unknown> {
  return { board: r.board, steps: r.steps.map((s, k) => ({ step: k + 1, tool: s.tool, asked: brief(s.input, 160), got: s.result.slice(0, 200), ms: s.ms })), answer: r.answer || r.stopped || '',
    'near misses': r.nearMisses.map((m) => ({ kind: m.kind, tool: m.tool, what: m.what, response: m.response })),
    says: `${r.model}: ${Object.keys(r.board.nodes).length} nodes, ${r.steps.length} steps, ${seconds.toFixed(1)} s, ${r.tokens.in + r.tokens.written} tokens in (${r.tokens.cached} more read from cache at a tenth) and ${r.tokens.out} out${r.nearMisses.length ? `; ${r.nearMisses.length} near miss${r.nearMisses.length > 1 ? 'es' : ''} (${[...new Set(r.nearMisses.map((m) => m.kind))].join(', ')})` : ''}${r.stopped ? `; ${r.stopped}` : ''}` };
}
