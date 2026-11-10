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
import { LIBRARY, block, defaultsOf, paramsOf, portsOf, register, type BlockDef, type PortDef, type SettingDef, type Type } from './blocks';
import { aisleOf, splitAisle, tradeRank } from './parts/aisles';
import { Engine, collapse, emptyBoard, groupBlock, makeBlock, placeBlock, wire } from './dataflow';
// (navigation and the starter boards are loaded when the agent runs, not when the library does: imported at the top they
// change the order the library's modules start in, and a worker that loads the whole library then fails to start)
import type { Board } from './boards';
import { edgesOf, nodesOf } from './boards';
import { certificatesOf, check, diffOf, type Certificate, type Verdict } from './certify';
import { massOfAll, type Assembly } from './assembly';
import { alternatives, badConnections, compatible, interference, missingInterfaces, revisions, piecesOfParts, roleOf, searchByFunction, variantsOf as variantsById, working, type Found, type Working } from './aitools';
import type { Block } from './room';
import { turnOf as roomTurnOf } from './room';
import { FORMATS, FormatError, SPLIT_STAGE_RULE, applyGraph, graphOf, newReplies, replyOf, sizeFits, sizeKeys, sizeLine, type Format, type Graph, type Replies } from './stages';
import { REQUIRE_RULE, engineeringOf, marginLine, needsLine, needsOf, qty, requirementLine, requirementLines, requirementsOf, settingsForNeeds, type Engineering, type Needs, type Requirement } from './lookat';
import { FEATURE_RULE, LOOK_RULE, SEE_RULE, featureLine, longestOf, lookedOf, metres, recognitionLines, recognitionOf, sameFeature, sizeOff, type Feature, type Looked, type Recognition } from './lookat';

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

/** Where a block with more than one block output keeps its lines (decision 0029, root 7: "the motor can has no bore" named
 *  the wrong output): read from the words of its text, each output's own clause and the `<name>/axis` or `/line` it names
 *  ("the motor with its shaft and tabs (shaft/axis)": the shaft line is on `motor`). One short clause; empty where
 *  the block has one block output or its text names no line. */
export function carriesOf(d: BlockDef, outs: readonly PortDef[]): string {
  const bo = outs.filter((p) => p.type === 'block').map((p) => p.name), says = d.says ?? ''; if (bo.length < 2) return '';
  const got = new Map<string, string[]>();
  for (const m of says.matchAll(/\(([^()]*)\)/g)) { const lines = m[1]!.match(/[\w ]{2,24}\/(?:axis|line|axes)/gi); if (!lines) continue;
    // (a parenthesis belongs to the output named nearest before it)
    const before = says.slice(0, m.index), owner = bo.map((n) => [n, before.search(new RegExp(`\\b${n}\\b(?![\\s\\S]*\\b(?:${bo.join('|')})\\b)`, 'i'))] as const).filter(([, k]) => k >= 0).sort((x, y) => y[1] - x[1])[0]?.[0];
    if (owner) got.set(owner, [...new Set([...(got.get(owner) ?? []), ...lines.map((x) => x.replace(/^\s*its line\s+/i, '').trim())])]); }
  return got.size ? ` | lines: ${[...got].map(([n, ls]) => `${n} carries ${ls.join(', ')}`).join('; ')}` : '';
}
/** A block on one line: what a builder needs of it and nothing more (its ports, `?` where optional, and its settings). */
export function cardOf(d: BlockDef): string {
  const ps = portsOf(d, defaultsOf(d)), port = (p: PortDef) => `${p.name}:${p.type}${p.unit ? `(${p.unit})` : ''}${p.optional ? '?' : ''}${p.many ? '*' : ''}`;
  const sets = (d.settings ?? []).map((x) => `${x.key}=${brief(x.default, 30)}${x.choices ? ` [${x.choices.slice(0, 8).join('|')}${x.choices.length > 8 ? '|…' : ''}]` : ''}`), offers = offersOf(d);
  return `${d.id}: ${d.name} | in: ${ps.inputs.map(port).join(', ') || '-'} | out: ${ps.outputs.map(port).join(', ')}${carriesOf(d, ps.outputs)} | set: ${sets.join('; ') || '-'}${offers.length ? ` | offers: ${offers.join(', ')}` : ''} | ${(d.says ?? '').slice(0, 160)}`;
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
  // (and the aisles and the family names the words say, as `find` reads them: "garden" brings the first of the Garden aisle's
  // families, "hinge" those of Hinges; below the words the pieces' own names matched, at most two to a word)
  const aisleIds = new Map<string, string[]>();
  for (const d of LIBRARY.values()) { if (!d.id.startsWith('piece.')) continue; const a = (aisleOf(d) ?? '').toLowerCase(); if (a) aisleIds.set(a, [...(aisleIds.get(a) ?? []), d.id]); }
  for (const w of words) { let n = 0; for (const [a, xs] of aisleIds) { if (n >= 2) break; if (!new RegExp(`\\b${w}`).test(a)) continue; for (const id of xs) { if (n >= 2) break; if (!hits.has(id)) { take(id, 5); n++; } } } }
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
    return `${d.id}: ${d.name.slice(0, 40)}${d.by === 'you' ? ' (yours)' : ''} | in ${ps.inputs.map((p) => `${p.name}${p.many ? '*' : ''}`).join(',') || '-'}${outs === ROOM_GIVES ? '' : ` | out ${outs}${carriesOf(d, ps.outputs)}`}${sets ? ` | set ${sets}` : ''}${offers.length ? ` | offers ${offers.join(', ')}` : ''}${eg ? ` | e.g. board "${eg}"` : ''}`; };
  const top = await Promise.all(builders.slice(0, Math.max(1, most - 4)).map(lineOf));
  const lines = [...top, ...boards, ...rest, ...old].slice(0, most);
  return lines.length || aisleLines.length ? `${top.length ? `(what builds first; each gives ${ROOM_GIVES} unless out says; card one for its choices)\n` : ''}${[...lines, ...aisleLines].join('\n')}` : 'nothing matches';
}

/** The agent's tools, each answering in as few words as will do (docs/FOR-AI.md says how they are used). */
const plan = { nodes: { type: 'object', description: '{name:{"b":blockId,"s":{settings}}}' }, wires: { type: 'array', items: { type: 'string' }, description: '"a.out>b.in"' } };
/** A part found by what it does, as a line for the agent: its id, name, score and why. */
const foundLine = (f: Found): string => `${f.id} | ${f.name} | ${f.score}: ${f.why.join(', ')}`;
export const TOOLS: Anthropic.Tool[] = [
  { name: 'find', description: 'Blocks and starter boards matching words, one a line.', input_schema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
  { name: 'card', description: 'One block on one line: in, out, set.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'build', description: 'A new board from a plan, placed, wired and run; a line a node back.', input_schema: { type: 'object', properties: plan, required: ['nodes'] } },
  { name: 'open', description: 'A starter board by its title (or the first words of it) as the board, run; a line a node back.', input_schema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] } },
  { name: 'change', description: 'Changes made on a copy of the board, run; the copy is taken only when every check that held still holds (else kept as a shadow, read can read it); lines back, what fails first.', input_schema: { type: 'object', properties: { add: plan.nodes, set: { type: 'object', description: '{name:{key:value}}' }, remove: { type: 'array', items: { type: 'string' } }, wires: plan.wires, unwire: { type: 'array', items: { type: 'string' }, description: '"b.in": what feeds it, cut' } } } },
  { name: 'read', description: 'One output of a node, in full (shadow: from the last change not taken).', input_schema: { type: 'object', properties: { node: { type: 'string' }, out: { type: 'string' }, shadow: { type: 'boolean' } }, required: ['node', 'out'] } },
  { name: 'fold', description: 'Nodes of the board folded into one new library block, saved: wires crossing in become its inputs, out its outputs (name them in outs). Omit nodes: all but the in.* nodes, which become its inputs. Its card back.', input_schema: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'string' }, description: 'omit for all' }, outs: { type: 'array', items: { type: 'string' }, description: '"node.output": its outputs' }, name: { type: 'string' }, says: { type: 'string' } }, required: ['name', 'says'] } },
  { name: 'docs', description: `Lines of a document holding the words. Topics: ${Object.keys(DOCS).join(', ')}.`, input_schema: { type: 'object', properties: { topic: { type: 'string' }, find: { type: 'string' } }, required: ['topic', 'find'] } },
  // (the AI's tools over the component contract, aitools.ts (acceptance 10): what a block offers, needs and clashes with)
  { name: 'search', description: 'Parts by what they do ("pumps water", "drives a shaft"), best first, a line each with why.', input_schema: { type: 'object', properties: { q: { type: 'string' } }, required: ['q'] } },
  { name: 'compatible', description: 'Whether two nodes\' blocks can be joined: each pair of their interfaces that mates, with why.', input_schema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'] } },
  { name: 'missing', description: 'What a node\'s block leaves unjoined that it needs to work: a power, fluid or data line, a motor\'s power line, a pump\'s inlet.', input_schema: { type: 'object', properties: { node: { type: 'string' } }, required: ['node'] } },
  { name: 'bad', description: 'Pieces of a node\'s block joined where what they offer does not mate.', input_schema: { type: 'object', properties: { node: { type: 'string' } }, required: ['node'] } },
  { name: 'clash', description: 'Pieces of a node\'s block that pass into each other (the clash finder), and fits pressed by design.', input_schema: { type: 'object', properties: { node: { type: 'string' } }, required: ['node'] } },
  { name: 'alternatives', description: 'Blocks on the same aisle that could stand in for one, and its variants (each setting\'s choices).', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'revisions', description: 'A part remembered: its version, its board\'s digest, its uses.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
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
  /** A node that only shows is never "held" (decision 0029, root 7): rewiring Show onto a new operation is always allowed
   *  (the loose-join calls were refused for it). A measure or an assertion that held still is: what the checker keeps. */
  const LOOKERS = new Set(['space.show']);
  const isLooker = (b: Board, id: string) => LOOKERS.has(b.nodes[id]?.block ?? '');
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
  /** A node's room block on the board as last run (its block output, else the first block it gives). */
  const blockOf = (id: string): Block => { if (!engine) throw new Error('build first'); const st = engine.state.get(id); if (!st) throw new Error(`no node ${id}`); const out = (st.out ?? {}) as Record<string, unknown>;
    const v = isRoom(out.block) ? out.block : Object.values(out).find(isRoom); if (!v) throw new Error(`${id} gives no block`); return v as unknown as Block; };
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
        const accepted = board, before = engine, held = new Set([...heldOf(before, accepted)].filter((id) => !isLooker(accepted, id))); board = JSON.parse(JSON.stringify(board)) as Board;
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
        // (made on a copy: a fold with no outputs is refused and the board kept as it was (AUDIT §2 "7 AI": one was saved anyway))
        const g = structuredClone(board) as Board;
        for (const o2 of (a.outs ?? []) as string[]) { const [n, port] = String(o2).split('.'); if (!g.nodes[n!]) throw new Error(`no node ${n}`); const sh = `${n}_${port}`; placeBlock(g, 'view.show', 0, 0, {}, sh); g.nodes[sh]!.label = `${port}`; wire(g, n!, port!, sh, 'value'); }
        const f = collapse(g, ids, String(a.name)), inner = f.board.nodes[f.id]?.inner;
        if (!inner || !nodesOf(inner).some((n) => inner.nodes[n.id]!.block === 'group.out')) throw new Error('a fold with no outputs is refused: nothing it holds is wired out of it, so as a block it would give nothing; name its outputs in outs ("node.output"), or fold fewer nodes');
        const r = makeBlock(f.board, f.id, { name: String(a.name), says: String(a.says ?? ''), by: 'you' });
        board = r.board; const d = r.block; made.push({ id: d.id, name: d.name, says: d.says ?? '', domains: d.domains ?? ['software'], graph: d.graph! });
        return `${r.duplicateOf ? `does what ${r.duplicateOf} does already: that one placed. ` : 'saved. '}${cardOf(d)}`; }
      case 'read': { const from = a.shadow ? shadow?.engine : engine; if (a.shadow && !from) throw new Error('no change is waiting as a shadow'); const st = from?.state.get(String(a.node)); if (!st) throw new Error('build first'); if (!st.out || !(String(a.out) in st.out)) throw new Error(`${a.node} has no output ${a.out}`); const v = st.out[String(a.out)];
        return (Array.isArray(v) ? v.slice(0, 60).map((x) => brief(x, 240)).join('\n') + (v.length > 60 ? `\n… ${v.length - 60} more rows` : '') : brief(v, 2000)).slice(0, 6000); }
      case 'search': { const fs = searchByFunction(String(a.q ?? ''), 10); return fs.length ? fs.map(foundLine).join('\n') : `nothing builds that does "${a.q}"`; }
      case 'compatible': return compatible(blockOf(String(a.a)), blockOf(String(a.b))).says;
      case 'missing': { const m = missingInterfaces(blockOf(String(a.node))); return m.length ? m.map((x) => x.says).join('\n') : 'nothing it needs is left unjoined'; }
      case 'bad': { const m = badConnections(blockOf(String(a.node))); return m.length ? m.map((x) => x.says).join('\n') : 'no joined pieces whose interfaces do not mate'; }
      case 'clash': { const r = await interference(blockOf(String(a.node))); return [...(r.list.length ? r.list.map((x) => x.says) : ['no piece passes into another']), ...r.pressed].join('\n'); }
      case 'alternatives': { const xs = alternatives(String(a.id)), vs = variantsById(String(a.id));
        return [`alternatives: ${xs.map((x) => `${x.id} (${x.name})`).join('; ') || 'none on its aisle'}`, `variants: ${vs.map((v) => `${v.key} ${v.choices.length} choices (now ${brief(v.at, 30)})`).join('; ') || 'none'}`].join('\n'); }
      case 'revisions': { const r = revisions(String(a.id)); if (!r) throw new Error(`no part remembered as "${a.id}"`); return r.says; }
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
  const body = s.slice(i, j + 1);
  try { return JSON.parse(body) as Record<string, unknown>; } catch (e) {
    // (a row reply with slips a reader can mend without guessing: a bare word where a string belongs (box, abs), an empty
    // place between two commas (taken as 0), a comma before a closing bracket)
    try { const mended = splitOutside(body).map((seg) => (seg.q ? seg.t : seg.t.replace(/'([^'\n]*)'/g, '"$1"').replace(/([\[,]\s*)([A-Za-z#][\w#.-]*)(?=\s*[,\]])/g, (m, pre: string, w: string) => (/^(true|false|null)$/.test(w) ? m : `${pre}"${w}"`)).replace(/,(\s*),/g, ',0$1,').replace(/,(\s*)\]/g, '$1]'))).join('');
      return JSON.parse(mended) as Record<string, unknown>; }
    catch { throw new Error(`no ${what} in the reply: ${(e as Error).message}`); } }
}
/** A text cut into its quoted strings and what lies between them. */
function splitOutside(t: string): { t: string; q: boolean }[] {
  const out: { t: string; q: boolean }[] = []; let cur = '', q = false, es = false;
  for (const c of t) { if (q) { cur += c; if (es) es = false; else if (c === '\\') es = true; else if (c === '"') { out.push({ t: cur, q: true }); cur = ''; q = false; } }
    else if (c === '"') { if (cur) out.push({ t: cur, q: false }); cur = '"'; q = true; } else cur += c; }
  if (cur) out.push({ t: cur, q }); return out;
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

/** One call to a model: the whole prompt in, its text out. `tier` how hard the task is (quick for a split or a part).
 *  `images`: pictures (PNG bytes) the model is shown with the prompt (the look at what was built); an ask that cannot
 *  show them answers from the words alone. */
export type Ask = (prompt: string, tier: 'quick' | 'default' | 'complex', images?: readonly Uint8Array[], format?: Format) => Promise<string | Record<string, unknown>>;
/** Where a prompt's fixed head ends and its one-off tail begins. */
export const PROMPT_CUT = '\n\n---\n\n';
/** A part of a compound request: as the split said it, then what was made of it. */
export interface ComposePart { name: string; is: string; from: string; set?: Record<string, unknown>;
  /** the features of the request's recognition list this part makes visible (lookat.ts), as the split said */ shows?: string[];
  /** the requirement that falls on this part (lookat.ts Needs, SI), as the split said */ needs?: Needs;
  /** the part's own size, x by y by z in metres, as the split said: a library block chosen for it is sized to it, and not taken where it stays more than 2 times off */ envelope?: number[];
  /** the split said it is several things itself: split again (decision 0028) */ split?: boolean;
  /** how it was made: placed from the library, a part remembered placed again, a starter board opened, a plan by one
   *  call, split into parts of its own (each made so, joined, folded), or not made */ by?: 'assembly' | 'remembered' | 'starter' | 'plan' | 'split' | 'none';
  /** its node on the final board, its pieces' names (each once a piece), and what still failed when it was made */ node?: string; names: string[]; failing: string[];
  /** the part not made that the final check built this one in place of (decision 0028) */ instead?: string;
  /** the id it is kept under (remembered, decision 0028; or the remembered part it was placed from), and its own parts */ saved?: string; children?: ComposePart[] }
export interface ComposeJoin { part: string; how: string; to: string }
/** One step of the pipeline, a line for the chat. */
/** The decomposer: one system into what it is made of, one level down (called again on each subsystem, to the parts). */
const DECOMPOSE_RULE = `## Here: DECOMPOSER (one task: what ONE thing is made of, one level down)
You are given one thing: a whole machine, or one of its subsystems. List what it is directly made of, one level down only, as a real one is built: 3 to 12 rows. Never skip a level and never summarise: a complex thing has many subsystems, and each is decomposed by a later call.
Reply with one JSON object and nothing else, compact: {"rows":[[name, count, kind, "what it is, in a few words"],...]}
- kind "system": only where it has six or more distinct visible parts of its own and must be decomposed further (a track unit, a cab, a robot station). A simple thing made of a few pieces is a "part".
- kind "part": one made or bought piece that is not usefully split (a plate, a wheel, a motor, a pane, a bolt set).
- kind "link": one straight piece that runs from one part to ANOTHER and is pinned to both, so its place follows theirs: only a slender actuator or rod (a hydraulic cylinder, a gas spring, a strut, a tie rod, a push rod, a drive shaft). Never a member that carries other parts (a boom, an arm, a frame, a leg, an axle), and never a hose, a belt or a cable: those are parts.
- count: how many of it its parent has (2 tracks, 6 legs). Names short and plain, unique among the rows.`;
/** Tool lines kept for the session (toolLine in composeBuild). */
const TOOL_LINES = new Map<string, string>(), TOOL_SIZES = new Map<string, number[] | undefined>();
/** The sizer: each subsystem's zone on the machine; and the placer: one subsystem's parts as solids. */
const SIZER_RULE = `## Here: SIZER (one task: where each subsystem is on the machine, and how big)
Given a machine and its subsystems, give each subsystem its zone: the box it occupies on the real machine at the size asked. Subsystems that run through others (hydraulics, wiring, electronics) get the zone where their visible parts are.
Reply with one JSON object and nothing else, compact: {"whole":[x,y,z],"body":"#rrggbb","rows":[[name, size x, size y, size z, at x, at y, at z],...],"pivots":[[name, x, y, z, A, B],...]}
Whole numbers, mm. x is forward, y is up, z is to the right; the ground is y = 0; the machine is centred on x = 0, z = 0. "at" is the middle of the zone in x and z and its FOOT in y. "whole" is the machine's overall size; "body" its main painted colour on the real thing. One row for every top-level subsystem, its name exactly as given.
- pivots: every point where two of the things listed are joined to each other and one hangs from or turns on the other (a boom's foot pin on the frame, the pin between boom and arm, the arm's tip pin in the bucket, a wheel's axle end, a slewing centre): its name, the point (y is its true height), and the two things it joins, named exactly as listed. These points are the machine's skeleton: every member is later drawn from one to the next, so a chain's points follow one another at the real distances, in a working pose.`;
const JOINER_RULE = `## Here: JOINER (one task: the links, each pinned between the two solids it joins)
The machine's solids are placed and numbered below. The links are the straight parts still missing: each runs from one solid to another and is pinned to both (a boom cylinder from the frame up to the boom's underside). Give each link its two end points, on the real mounting spots of the two solids it joins.
Reply with one JSON object and nothing else, compact: {"rows":[[name, shape, thick, x1, y1, z1, a, x2, y2, z2, b, mat, color],...]}
- One row for every link, named exactly as given; the same link listed twice under two subsystems is ONE row; a link listed x2 is two rows (add "left", "right"), mirrored or spaced as on the real machine.
- a and b: the numbers of the two solids it is pinned to. End 1 is a point ON solid a, end 2 a point ON solid b: whole numbers, mm, on the machine's axes (x forward, y up, z right); here y is the point's true height. A solid's line gives its size x y z, then its place: the middle of its box in x and z and its FOOT in y; then its turns if it has any.
- shape: where the menu has a real library part of the link's kind, the shape MUST be that part's id (every hydraulic cylinder is the menu's hydraulic cylinder, never a drawn rod); only otherwise "rod", "tube" or "box" (a drawn bar, thick mm across): the app makes it the length between the two points and lays it on their line. thick: its real thickness, mm.
- mat one of steel-low, al-6061, rubber, abs; color "#rrggbb" (hydraulic cylinders dark with a bright rod; bare links grey).`;
const PLACER_RULE = `## Here: PLACER (one task: one subsystem's parts as solids, in place)
You model ONE branch of a machine (a subsystem, or one part of a subsystem): every part listed for it becomes one or more plain solids, placed and sized as on the real machine, in the machine's own coordinates. Your zone is where it sits; the real outline matters more than filling the zone: sloped and round where the real thing is, never one lump.
Reply with one JSON object and nothing else, compact: {"rows":[[name, shape, axis, size x, size y, size z, at x, at y, at z, mat, color, turn x, turn y, turn z],...]}
- Leave the three turns off a row where they are all 0 (most rows). Names two or three words.
- One row or more for every part; "x2" means two solids, mirrored or spaced as on the real thing. Name each solid by its part's name (add "left", "right", "1", "2" where there are several). 3 to 30 rows.
- Whole numbers, mm. x is forward, y is up, z is to the right; the ground is y = 0. "at" is the middle of the solid's box in x and z, and its FOOT in y, on the MACHINE's axes (not your zone's).
- shape: "box", "rod" (a cylinder along "axis": across the machine "z", upright "y", along it "x"), "tube" (hollow rod: pipe, duct, tyre, ring), "sphere", "dome" (half sphere, flat down), "cone" (along "axis"), "wedge" (a ramp: full height at its back, nothing at its front).
- The size is given before any turn; turns are degrees (usually 0). Slope and splay with turns and wedges (a raised boom, a leaned windscreen); long curved things are several turned segments.
- Where a real library part is offered for a part of yours, PLACE IT instead of drawing: a row ["use", id, name, size x, size y, size z, at x, at y, at z, turn x, turn y, turn z]: the box it must fill, its place and its turns exactly as you would give them for a solid drawn there (a cylinder lying along a boom: long in x, turned as the boom is). The app sizes the real part to that box and lays it along it. It brings its own real pieces, bolts and all. Where none fits in kind, draw.
- A long member that runs from one point to another (a boom, an arm, a leg, a strut, an axle, a rail) is never a turned box. It is a row of the same eleven places with shape "beam" (square or flat) or "bar" (round): [name, "beam", depth, x1, y1, z1, x2, y2, z2, mat, color, width]: where a box has its axis the beam has its depth (mm); where a box has its size the beam has its FIRST END; where a box has its place the beam has its SECOND END (for both ends y is the true height); its width across comes last. Where your branch has a pivot (given below), the member's end is EXACTLY that pivot's point, and what hangs from a pivot is placed on it: this is what makes the machine one piece. A bent member is two beams sharing a point.
- Small hidden parts (bolts, seals, wiring inside) are left out; visible ones are placed on the surfaces they sit on. Solids touch their neighbours; nothing floats.
- mat one of steel-low, al-6061, rubber, abs, glass, wood-pine; color "#rrggbb": painted body panels in the main body colour given, tyres and tracks near black, glass pale blue, hydraulic rods bright grey, bare metal grey, lights their colour.`;
/** The layout call: the whole as plain solids at places. */
const LAYOUT_RULE = `## Here: lay the whole out as plain solids (one task: reply with one JSON object and nothing else)
You are laying out a machine as a designer's first block model: 15 to 150 plain solids that together read, in silhouette and proportion, as exactly what is asked. Every feature a person must see gets its own solid or solids (each wheel, each leg segment, each track, the blade, the cab, the boom: separate solids, never one lump).
Reply compactly, one row a solid, no spaces or line breaks: {"solids":[["front left wheel","rod","z",sx,sy,sz,ax,ay,az,"rubber","#202020"],...]}
- A row is [name, shape, axis, size x, size y, size z, at x, at y, at z, mat, color, turn x, turn y, turn z]; whole numbers; the three turns (degrees, usually 0) may be left off.
- Units mm. x is forward, y is up, z is to the right. The ground is y = 0; the machine stands on it and is centred on x = 0, z = 0.
- The size is the solid's box: x long, y high, z wide. "at" is the middle of that box in x and z, and its FOOT (lowest point) in y.
- shape: "box", "rod" (a cylinder along "axis": a wheel or roller across the machine has axis "z", a post has "y", a barrel or boom along it has "x"), "tube" (a hollow rod: a pipe, a duct, a tyre, a ring), "sphere", "dome" (a half sphere, flat side down), "cone" (along "axis"), "wedge" (a ramp: full height at its back, nothing at its front: a sloped bonnet, a blade, a nose, a roof slope).
- The size is given BEFORE any turn. Turn a solid to slope or splay it (a raised boom turn z 30, a leg splayed out, a windscreen leaned back); a wedge faces forward and is turned about y to face elsewhere. Use turns and wedges wherever the real thing is not square: a model of only upright boxes is wrong.
- Break long curved things into several turned segments (a neck, a tail, an arm, a curved blade).
- Solids touch their neighbours (a wheel's inner face at the body's side, a cab's foot on the deck's top); they do not sink into each other and nothing floats.
- Hold the overall size to the size asked. Real proportions: look at how the real machine is built and place every solid where it is on the real thing; left and right sides mirror in z.
- "mat" one of: steel-low, al-6061, rubber, abs, glass, wood-pine. "color" the real thing's colour as #rrggbb (machine bodies painted, tyres and tracks near black, glass pale blue, bare metal grey).`;
export interface ComposeStep { stage: 'features' | 'split' | 'part' | 'fold' | 'join' | 'gate' | 'look' | 'remember' | 'check'; line: string; ok: boolean }
/** The run's steps as a tree (decision 0028), for the pages to show: each part, how it was made, the id it is kept
 *  under, its pieces, what still fails, its own parts. */
export interface ComposeNode { name: string; is: string; by: NonNullable<ComposePart['by']>; from: string; saved?: string; pieces: number; failing: string[]; children: ComposeNode[] }
export interface ComposeRun { board: Board; parts: ComposePart[]; joins: ComposeJoin[]; steps: ComposeStep[]; unmet: string[]; answer: string; asks: number; plans: AgentPlan[];
  /** each part as a tree; the ids kept for later in this run; the remembered parts placed again; what the final check found missing */
  tree: ComposeNode[]; remembered: string[]; recalled: string[]; missing: string[];
  /** the functional gate's last word (aitools.ts working: each driver joined to what it drives and to a supply) */ works?: Working;
  /** the recognition list (lookat.ts): each feature, the part that shows it, what the eye last said of it; the whole's
   *  longest side asked and built, in metres; how many times the result was looked at */ features?: Feature[]; size?: { asked?: number; built?: number }; looks?: number;
  /** the design's requirements (each from the request or assumed), the engineering check's last word (each margin, what
   *  failed, what no row carried), and the whole's mass from its geometry, kg */ requirements?: Requirement[]; engineering?: Engineering; mass?: number;
  /** with formats on (stages.ts): the calls by format, the wall's rejects by kind, prose where a format was asked, retries; and whether the time budget was spent */ replies?: Replies; spent?: boolean }

/** A request that names two or more things (a drone and an arm, a crane and a truck): Assist hands it to composeBuild.
 *  Words of machines, each counted once; a singular arm only ("the arms of a cross frame" is one thing). A guess from the
 *  words, said as one: the split call says what the parts are. */
const MACHINES: RegExp[] = [/\b(drone|quadcopter|quad ?copter|multirotor)\b/, /\b(robot(ic)? arm|arm)\b(?!s)/, /\bgripper\b/, /\b(robot|rover)\b/, /\b(car|truck|lorry|trailer|cart|wagon|tractor|forklift|excavator)\b/, /\bcrane\b/, /\bcamera\b/, /\bpan[- ]tilt\b/, /\bconveyor\b/, /\b(lamp|light)\b/, /\b(3d )?printer\b/, /\b(axis|axes|gantry)\b/, /\b(boat|ship|plane|aircraft|glider)\b/, /\bturret\b/, /\b(bike|bicycle|scooter)\b/, /\b(table|desk|chair|shelf)\b/, /\b(pump|tank)\b/, /\b(winch|hoist)\b/, /\b(legs?|walker)\b/];
export const isCompound = (request: string): boolean => MACHINES.filter((re) => re.test(request.toLowerCase())).length >= 2;

/** The short list the split chooses from: the assemblies (seed.*, and the blocks the person saved that are not parts kept
 *  in memory: those are recalled by the request's words, after the cached head) by id and a few words, the starter boards
 *  by the words before their colon, and the aisles of pieces by trade. */
const SIZES = new Map<string, number[] | undefined>();
/** A block's bound, x by y by z in metres, as it is made at its defaults (or with `set` over them): run alone, measured;
 *  undefined where it makes no block. At its defaults, measured once. */
export async function sizeOfBlock(id: string, set?: Record<string, unknown>): Promise<number[] | undefined> {
  if (!set && SIZES.has(id)) return SIZES.get(id); const d = block(id); if (!d) return undefined; let size: number[] | undefined;
  try { const b = emptyBoard(id); placeBlock(b, id, 0, 0, { ...defaultsOf(d), ...(set ?? {}) }, 'n'); const e = new Engine(b); await e.run(); const t = biggest(b, e)?.[2];
    if (t?.lo && t.hi) size = [0, 1, 2].map((k) => (t.hi![k] ?? 0) - (t.lo![k] ?? 0)); } catch { size = undefined; }
  if (!set) SIZES.set(id, size); return size;
}
export async function composeMenu(blocks?: AgentBlock[], request = ''): Promise<string> {
  savedCards(blocks);
  const { starterBoards } = await import('./starters'), kept = new Set(savedParts().map((p) => p.id)), ROOM = 3000;
  const asm = [...LIBRARY.values()].filter((d) => d.id.startsWith('seed.') && d.id !== 'seed.spring-checked' || d.by === 'you' && !kept.has(d.id));
  // (grouped by domain, a short line each: id, name, eight words of what it is, its settings' names; the groups whose
  // words the request says are given in full, every other assembly by its id alone (decision 0029, root 7))
  const groups = new Map<string, BlockDef[]>(); for (const d of asm) { const g = d.by === 'you' ? 'yours' : d.domains?.[0] ?? 'other'; groups.set(g, [...(groups.get(g) ?? []), d]); }
  const rq = request.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3).map((w) => w.replace(/(?<=[a-z]{3}[^s])s$/, ''));
  const words = (d: BlockDef) => `${d.id.slice(5)} ${d.name}`.toLowerCase(), hit = (d: BlockDef) => rq.some((w) => new RegExp(`\\b${w}`).test(words(d)));
  // (scale on the menu: each assembly shown in full with its bound at its defaults and what changes it, so none is chosen blind to its size)
  const sizes = new Map<string, number[] | undefined>(); for (const d of asm) if (hit(d) || rq.some((w) => (d.by === 'you' ? 'yours' : d.domains?.[0] ?? 'other').includes(w))) sizes.set(d.id, await sizeOfBlock(d.id));
  const line = (d: BlockDef) => `${d.id}: ${d.name}: ${(d.says ?? '').replace(/\s+/g, ' ').split(' ').slice(0, 8).join(' ')}${(d.settings ?? []).length ? ` (${(d.settings ?? []).slice(0, 6).map((x) => x.key).join(' ')})` : ''}${sizeLine(sizes.get(d.id), sizeKeys(d))}`;
  const ids = `Every assembly (from: the id): ${asm.map((d) => d.id).join(' ')}`;
  const starts = starterBoards().map(([t]) => t.split(':')[0]!.trim()).filter((t) => t.length >= 6);
  const trades = new Map<string, number>(); for (const id of LIBRARY.keys()) if (id.startsWith('piece.')) { const t = block(id)!.domains?.[0] ?? 'other'; trades.set(t, (trades.get(t) ?? 0) + 1); }
  const tail = `\nAisles of pieces (from: "aisle <trade>"): ${[...trades].map(([t, n]) => `${t} (${n})`).join(', ')}`;
  let room = ROOM - ids.length - tail.length - 150; const shown: string[] = [];
  for (const [g, ds] of groups) { const whole = rq.some((w) => g.includes(w)), hits = whole ? ds : ds.filter(hit); if (!hits.length) continue;
    const text = `${g}:\n${hits.map(line).join('\n')}`; if (text.length + 1 > room) continue; shown.push(text); room -= text.length + 1; }
  // (the starter boards by the words before their colon: as many as the room leaves)
  const st: string[] = []; for (const t of starts) { if (t.length + 2 > room) break; st.push(t); room -= t.length + 2; }
  return `Assemblies by domain (those your words match, a line each):\n${shown.join('\n') || '(none matches; choose from the ids)'}\n${ids}\nStarter boards (from: the title as written):\n${st.join('; ')}${tail}`;
}
const SPLIT_RULE = `## Here: the parts of what is asked (one task: name the parts, build nothing)
Reply with one JSON object and nothing else:
{"parts": [{"name": "drone", "is": "a quadcopter: four motors on a cross frame", "from": "<an assembly's id, a remembered part's id, a starter board's title, or aisle <trade>>"}, …], "joins": [{"part": "arm", "how": "under", "to": "drone"}]}
A part is a thing a person names (a drone, an arm, a camera, a truck, a lamp's base): one to five of them, never a bolt or
a plate alone. name: one short word (letters, digits, _), each its own. is: what it is, in a few words, enough to build it
from. from: a part remembered (listed with the request, built before and checked) or the assembly or starter board that is
that thing (as written in the lists), else the aisle its pieces come from. "split": true on a part that is itself several
things with nothing to start from (it is split again). set: an assembly's settings only where asked. joins: each part but
one goes onto, under, beside, through, into, around or bolted to another part.
Where a recognition list comes with the request (what a person must see): "shows": ["<feature name>", …] on each part,
the features that part makes visible; every feature is shown by a part. The nearest assembly is never the whole thing
when it shows only some of the list: it is one part, and each feature it does not show is a part of its own (a walker is
a dinosaur's legs and body; its neck with the head and its tail are parts from pieces, joined in front and behind).
Where a size comes with the list, set each assembly's size settings (set, by its settings' names) so the whole comes to it.
Where requirements come with the request: "needs": {"force_N": 14700, "payload_kg": 500, "span_m": 2, "speed_m_s": 0.5, "torque_Nm": 40, "power_W": 7350}
on each part the requirement falls on, only the ones that do (the mast or the arm lifts the payload: its force; each of n
legs carries payload/n × 9.81 × 1.5; a span carries the rolling load over its length; a driver gives force × speed as
power, and force × its arm or wheel radius as torque). A part is chosen to meet its needs: an industrial drive, a
hydraulic cylinder, a geared motor; never a hobby servo or a small stepper where the need exceeds it.`;
/** A part remembered, a line for the split: its id, name, what it says and offers, what it was made for, its uses. */
const rememberedLine = (p: SavedPart): string => `${p.id}: ${p.name}: ${p.says.slice(0, 90)}${p.offers?.length ? `; offers [${p.offers.slice(0, 6).join('; ')}]` : ''} (made for "${p.from.slice(0, 60)}"; ${p.checked.pieces} pieces; used ${p.uses} time${p.uses === 1 ? '' : 's'})`;
/** The split call's prompt: the menu, then the rule (the cached head), then the parts remembered for these words (they
 *  differ request by request), then the request. */
export async function splitAsk(request: string, blocks?: AgentBlock[], recalled: readonly SavedPart[] = [], found: readonly Found[] = [], see = ''): Promise<string> {
  const fl: string[] = []; for (const f of found) { const d = block(f.id); fl.push(`${foundLine(f)}${d ? sizeLine(await sizeOfBlock(f.id), sizeKeys(d)) : ''}`); }
  const by = found.length ? `Found by what they do (search, aitools.ts; from: the id):\n${fl.join('\n')}\n\n` : '';
  const mem = recalled.length ? `Parts remembered (built before, each checked to run with nothing failing and be one thing; from: the id, placed as one node like an assembly):\n${recalled.map(rememberedLine).join('\n')}\n\n` : '';
  // (the parts found by function go with the menu, which is the request's own already (composeMenu reads it))
  return `${await composeMenu(blocks, request)}\n\n${by}${SPLIT_RULE}${PROMPT_CUT}${mem}${see ? `${see}\n\n` : ''}Request: ${request.slice(0, 600)}`;
}
/** The split as a model answers it, held to its form: parts with names a wire can read, each once; joins between them. */
export function splitOf(text: string): { parts: ComposePart[]; joins: ComposeJoin[] } {
  const o = firstJson(text, 'split'), ps = o.parts;
  if (!Array.isArray(ps) || !ps.length) throw new Error('no parts in the split: "parts" is a list of {name, is, from}');
  const seen = new Set<string>(), parts: ComposePart[] = ps.slice(0, 6).map((p, k) => { const x = (p ?? {}) as Record<string, unknown>;
    let name = String(x.name ?? `part${k + 1}`).toLowerCase().replace(/\W+/g, '_').replace(/^_+|_+$/g, '') || `part${k + 1}`; if (/^\d/.test(name)) name = `p${name}`;
    while (seen.has(name)) name = `${name}${k + 1}`; seen.add(name);
    const from = String(x.from ?? '').slice(0, 120);
    return { name, is: String(x.is ?? x.what ?? name).slice(0, 300), from, ...(x.split === true || /^split$/i.test(from.trim()) ? { split: true } : {}), ...(x.set && typeof x.set === 'object' && !Array.isArray(x.set) ? { set: x.set as Record<string, unknown> } : {}), ...(Array.isArray(x.shows) && x.shows.length ? { shows: x.shows.slice(0, 8).map((f) => String(f).slice(0, 40)) } : {}), ...(needsOf(x.needs) ? { needs: needsOf(x.needs)! } : {}), ...(Array.isArray(x.envelope_m) && x.envelope_m.length && x.envelope_m.every((v) => typeof v === 'number' && v > 0) ? { envelope: (x.envelope_m as number[]).slice(0, 3) } : {}), names: [], failing: [] }; });
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

/** The functional gate's mend rule (one task: make what is built work, nothing else). */
const WORK_RULE = `## Here: make it work (one task)
The build runs, but a part does not act on what it should (below). Reply with one JSON object and nothing else, a change:
{"tool": "change", "remove": [...], "add": {...}, "wires": [...], "says": "..."}. Join each driver's shaft to what it drives
(room.over the driven part on the shaft's line, room.through, or a coupling between them) and its power line to a supply;
keep every part, replace only the joins, and end with a space.show of the last block's thing.`;

/** The engineering check's mend rule (one task: make what is built strong enough, nothing else). */
const ENG_RULE = `## Here: make it strong enough (one task)
The build runs, but the engineering check fails (below: what a component gives against what its requirement needs). Reply
with one JSON object and nothing else, a change: {"tool": "change", "set": {...}, "remove": [...], "add": {...}, "wires": [...], "says": "..."}.
Set the failing part to a larger size of its settings' choices (a larger bore, a bigger frame, a higher rating), or replace
the component by a larger one of its kind joined the same way, or add a gear stage between; keep every other part and
every join, and end with a space.show of the last block's thing.`;

/** A compound request built from its parts by small calls, each one task (decisions 0027, 0028): the parts remembered
 *  recalled first; split (a part of several things split again, two levels at most); each part placed from the library
 *  (an assembly or a part remembered), a starter board, or one plan (never skipped: asked again once where no plan could
 *  be read), parts side by side three at once, each folded to one node and, built by a plan or a split and checked (nothing
 *  failing, one group), remembered; joined, and what is left loose named and joined again (twice at most); a final check
 *  call for what is missing, each built and joined the same way (two rounds at most); checked; the whole remembered when
 *  it passes. `ask` makes each call; `onStep` hears each step's line and the board as it stands. A new board: what was
 *  open before is the caller's to keep (the page's Undo). `remember: false` keeps nothing (a test that must leave the
 *  library as it was). */
export async function composeBuild(request: string, o: { ask: Ask; board?: Board; blocks?: AgentBlock[]; onStep?: (s: ComposeStep, board: Board) => void; remember?: boolean;
  /** the eye (decision 0029, wave 14): a picture of the board as the 3D view shows it (PNG bytes), or undefined where none
   *  can be taken; given, the model is shown it with the recognition list after the build and its checks */ look?: (board: Board) => Promise<{ png: Uint8Array } | undefined>;
  /** the recognition list written before the split (one call more); on where `look` is given, unless said */ features?: boolean;
  /** a layout skeleton first (one call more): the whole as plain solids at places, shown at once, and kept as the build where the parts' build leaves something unmet */ skeleton?: boolean;
  /** every call answers in one closed format (stages.ts FORMATS), forced where the model is called and read from the tool's input, never text; a graph reply is checked by the wall (applyGraph) before it is a plan, returned once with what is wrong; the app turns it on, a test with a scripted text ask leaves it off */ formats?: boolean;
  /** the wall-clock budget, ms (default 240 000): when it is spent the run asks nothing more, returns what it has and says in unmet what was not reached */ budgetMs?: number }): Promise<ComposeRun> {
  const { starterBoards } = await import('./starters'), steps: ComposeStep[] = [], plans: AgentPlan[] = [], unmet: string[] = [], remembered: string[] = [], recalled: string[] = [], missing: string[] = [];
  let board: Board = emptyBoard(request.slice(0, 80)), asks = 0;
  const keep = o.remember !== false, three = limiter(3);
  const say = (stage: ComposeStep['stage'], line: string, ok = true) => { const s = { stage, line, ok }; steps.push(s); o.onStep?.(s, board); };
  const t00 = Date.now(), budget = o.budgetMs ?? 240_000, notReached: string[] = [], replies = newReplies(), labelOf = (prompt: string) => /## Here: ([^\n(]+)/.exec(prompt.slice(Math.max(0, prompt.indexOf(PROMPT_CUT) - 2500)))?.[1]?.trim() ?? /## Here: ([^\n(]+)/.exec(prompt)?.[1]?.trim() ?? 'a call';
  /** One ask within the budget: none is begun once it is spent, and one in flight is left when it runs out (said, never waited for). */
  const within = async <T>(what: string, f: () => Promise<T>): Promise<T> => { const left = budget - (Date.now() - t00);
    if (left <= 0) { if (!notReached.includes(what)) notReached.push(what); throw new Error(`the time budget (${Math.round(budget / 1000)} s) is spent: ${what} not reached`); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([f(), new Promise<never>((_, no) => { timer = setTimeout(() => { if (!notReached.includes(what)) notReached.push(what); no(new Error(`the time budget (${Math.round(budget / 1000)} s) ran out during ${what}`)); }, left); })]); } finally { if (timer) clearTimeout(timer); } };
  const text = (r: string | Record<string, unknown>) => (typeof r === 'string' ? r : JSON.stringify(r));
  const askF = async (format: Format, prompt: string, tier: Parameters<Ask>[1], images?: readonly Uint8Array[]) => { asks++; return replyOf(format, await within(labelOf(prompt), () => three(() => o.ask(prompt, tier, images?.length ? images : undefined, format))), replies); };
  /** A call of the compose path. With formats on, its one format is forced by what the call is (the recognition list:
   *  features; the split: split; the look: inspect; the final check for what is missing makes no call: the features no
   *  part shows are what is missing), and the format's object is handed on in the form this path already reads. */
  const call = async (prompt: string, tier: Parameters<Ask>[1], images?: readonly Uint8Array[]): Promise<string> => {
    if (!o.formats) { asks++; return text(await within(labelOf(prompt), () => three(() => (images?.length ? o.ask(prompt, tier, images) : o.ask(prompt, tier))))); }
    const rec = (x: unknown) => (x ?? {}) as Record<string, unknown>, list = (x: unknown) => (Array.isArray(x) ? x.map(rec) : []);
    if (prompt.includes('## Here: what a person must see')) { const f = await askF(FORMATS.features(), prompt, tier);
      return JSON.stringify({ features: list(f.features).map((x) => ({ name: x.name, is: x.size, where: x.where })), size: { longest_m: f.envelope_m }, requirements: list(f.requirements).map((x) => ({ ...x, name: x.what })) }); }
    if (prompt.includes('## Here: the parts of what is asked')) { const ids = [...new Set([...prompt.matchAll(/^([a-z]+\.[\w.-]+): /gm)].map((m) => m[1]!).filter((id) => block(id)))].slice(0, 60);
      const s = await askF(FORMATS.split(ids), `${prompt}\n${SPLIT_STAGE_RULE.split('\n').slice(2).join('\n')}`, tier);
      return JSON.stringify({ ...s, parts: list(s.parts).map((x) => ({ ...x, from: x.from === 'scratch' ? 'aisle' : x.from })) }); }
    if (prompt.includes('## Here: look at what was built')) { const l = await askF(FORMATS.inspect(), prompt, tier, images);
      return JSON.stringify({ features: list(l.features).map((x) => ({ name: x.name, seen: x.verdict, note: '' })), proportions: `confidence ${Number(l.confidence)}` }); }
    if (prompt.includes('## Here: what is missing')) return '{"missing": []}';
    throw new FormatError('graph', 'a plan call with formats on goes through planCall'); };
  /** A plan or mend call. With formats on: the graph format (the blocks it may place an enum), its reply checked by the
   *  wall against the board it is for (the parts' own nodes are never its to remove), returned once with what is wrong
   *  in the format's own terms; then handed on as the plan this path runs. */
  const planCall = async (prompt: string, tier: Parameters<Ask>[1], b: Board, images?: readonly Uint8Array[]): Promise<string> => {
    if (!o.formats) return call(prompt, tier, images);
    const offered = graphBlocks(b, prompt), fmt = FORMATS.graph(offered), own = new Set(nodesOf(b).map((n) => n.id).filter((id) => !parts.some((p) => p.node === id))); let again = '', last: string[] = [];
    for (let t = 0; t < 2; t++) { const g = graphOf(await askF(fmt, `${prompt}\nReply in the graph format: nodes [{id, block, set: [{key, value}]}], edges [[from id, its output, to id, its input]], remove [ids]; the board above is changed by it (an empty board: built by it).${again}`, tier, images));
      const a = applyGraph(g, b, { offered: new Set(offered), own }, wireRefused); if (!a.rejects.length) return JSON.stringify(planFromGraph(g, b));
      for (const k of a.kinds) replies.rejects[k] = (replies.rejects[k] ?? 0) + 1; if (!t) replies.retried++; last = a.rejects;
      again = `\nREJECTED: ${JSON.stringify(g).slice(0, 2000)}\n${a.rejects.slice(0, 10).join('\n')}\nThe whole graph again, corrected.`; }
    throw new Error(`the graph was rejected twice by the wall: ${last.slice(0, 3).join(' | ')}`); };
  const guideHead = `${await guideOf()}\n\n${PLAN_RULE}`, asPrompt = (r: Awaited<ReturnType<typeof planRequest>>) => `${guideHead}${PROMPT_CUT}${String((r.messages[0] as { content: unknown }).content)}`;
  const treeOf = (p: ComposePart): ComposeNode => ({ name: p.name, is: p.is, by: p.by ?? 'none', from: p.from, ...(p.saved ? { saved: p.saved } : {}), pieces: p.names.length, failing: p.failing, children: (p.children ?? []).map(treeOf) });
  let parts: ComposePart[] = [], joins: ComposeJoin[] = [];
  registerSaved(); // (parts kept in a store apart from this run, as blocks: placed like an assembly)
  let works: Working | undefined, recog: Recognition | undefined, looks = 0, builtSize: number | undefined, anchor = '', reqs: Requirement[] = [], eng: Engineering | undefined, mass: number | undefined;
  let skeleton: Board | undefined;
  const done = (answer0: string): ComposeRun => { let answer = answer0;
    if (skeleton && (unmet.length || !nodesOf(board).length)) { board = skeleton; answer = `Shown as a layout (its parts' build was not finished: ${unmet.length ? unmet[0]!.slice(0, 140) : 'nothing was built'}). ${answer0}`; }
    return done1(answer); };
  const done1 = (answer: string): ComposeRun => ({ ...(o.formats ? { replies } : {}), ...(notReached.length ? { spent: true } : {}), board, parts, joins, steps, unmet, answer, asks, plans, tree: parts.map(treeOf), remembered, recalled, missing, ...(works ? { works } : {}),
    ...(reqs.length ? { requirements: reqs } : {}), ...(eng ? { engineering: eng } : {}), ...(mass !== undefined ? { mass } : {}),
    ...(recog ? { features: recog.features, size: { ...(recog.longest ? { asked: recog.longest } : {}), ...(builtSize ? { built: builtSize } : {}) } } : {}), ...(o.look ? { looks } : {}) });
  /** Each feature held to the part that shows it (a part made before one not made); the features no part shows. */
  const cover = (): Feature[] => { if (!recog) return []; for (const f of recog.features) { const ps = parts.filter((p) => p.shows?.some((s) => sameFeature(s, f.name))), p = ps.find((q) => q.node) ?? ps[0]; if (p) f.part = p.name; else delete f.part; } return recog.features.filter((f) => !f.part); };
  /** What a part must show and the whole's size, said for its plan or its own split. */
  const seeFor = (p: ComposePart): string => { if (!recog) return ''; const fs = recog.features.filter((f) => p.shows?.some((s) => sameFeature(s, f.name)));
    const src = reqs.find((r) => r.name === 'power'), need = p.needs ? `\nIt must give: ${needsLine(p.needs)}${src ? ` (power: ${src.value})` : ''}. Choose components whose rows give that (an industrial drive, a cylinder, a geared motor of the size it takes); never a hobby servo or a small motor where the need exceeds it.` : '';
    const env = p.envelope?.length ? `\nIts envelope: ${p.envelope.map((v) => metres(v)).join(' x ')} (x by y by z): build it at that size.` : '';
    return `${fs.length ? `\nA person must see in it: ${fs.map(featureLine).join('; ')}.` : ''}${need}${env}${anchor ? `\n${anchor}` : recog.longest ? `\nThe whole thing is about ${metres(recog.longest)} on its longest side: size this part beside that.` : ''}`; };

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
    try { const plan = planOf(await planCall(`${guideHead}${PROMPT_CUT}${boardBrief(b)}\n\n${joinTask}`, 'default', b)); plans.push(plan);
      let ran = await runPlan(plan, b, o.blocks); b = ran.board;
      say('join', `${plan.says || 'joined'}: ${Object.keys(plan.input.add ?? {}).length} node(s)${ran.failing.length ? `; ${ran.failing.length} line(s) failed: ${ran.failing[0]!.slice(0, 120)}` : ', nothing failed'}`, !ran.failing.length);
      if (ran.failing.length) {
        try { const mend = planOf(await planCall(`${guideHead}${PROMPT_CUT}${planAsk(what, ran.board, ran.failing)}\n\n${joinTask}`, 'default', ran.board)); plans.push(mend);
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
      try { const plan = planOf(await planCall(`${guideHead}${PROMPT_CUT}${boardBrief(b)}\n\n${task}`, 'default', b)); plans.push(plan);
        const ran = await runPlan(plan, b, o.blocks), x = new Engine(ran.board); await x.run(); const after = looseOf(x, ran.board);
        if (ran.failing.length <= failing.length && after.lines.length < lines.length) { b = ran.board; failing = ran.failing; say('join', `${plan.says || 'joined'}: ${after.lines.length ? `${after.lines.length} still loose` : 'nothing loose now'}`, !after.lines.length); }
        else say('join', `the change for what is loose not taken: ${ran.failing.length > failing.length ? `${ran.failing.length} line(s) failed: ${ran.failing[0]!.slice(0, 120)}` : 'it left as much loose'}`, false); }
      catch (x) { say('join', `asked for what is loose: ${(x as Error).message}`, false); break; }
    }
    return { board: b, failing };
  };

  /** A part by one plan (asked again once where no plan could be read; once more with only what failed or was left loose). */
  const planPart = async (p: ComposePart, of: string) => {
    const ask1 = `${p.name}: ${p.is} (one part of "${of.slice(0, 160)}")${seeFor(p)}`;
    let plan: AgentPlan | undefined, err = '';
    for (let t = 0; t < 2 && !plan; t++) { try { plan = planOf(await planCall(asPrompt(await planRequest(t ? `${ask1}\nYour reply before could not be read (${err.slice(0, 160)}): reply with one build plan, {"tool": "build", "nodes": {…}, "wires": […], "says": "…"}, at least one node, built from the pieces and the operations.` : ask1, { blocks: o.blocks })), 'quick', emptyBoard(p.name))); } catch (e) { err = (e as Error).message; } }
    if (!plan) { p.by = 'none'; p.failing = [err]; say('part', `${p.name}: no plan could be read in two replies (${err.slice(0, 120)})`, false); return undefined; }
    plans.push(plan);
    // (what the plan's block leaves loose: its groups but the biggest, named, a failing line to mend)
    const looseIn = async (b: Board): Promise<string[]> => { const e = new Engine(structuredClone(b)); await e.run(); const top = biggest(b, e); if (!top) return []; const gs = groupsIn(top[2]); if (gs.length < 2) return [];
      return [`! not one thing: ${top[0]}.${top[1]} falls in ${gs.length} groups; not joined to the rest (they touch nothing of it): ${gs.slice(1, 5).map((g) => counted(g.map((i) => top[2].pieces[i]!.name), 4)).join(' | ')} (put each onto, into, over or through a piece of the rest)`]; };
    let ran = await runPlan(plan, emptyBoard(p.name), o.blocks), bad = [...ran.failing, ...await looseIn(ran.board)];
    if (bad.length) { say('part', `${p.name}: ${bad.length} line(s) failed or loose; asked again with only those`, false);
      try { const mend = planOf(await planCall(asPrompt(await planRequest(ask1, { board: ran.board, failing: bad, blocks: o.blocks })), 'quick', ran.board)); plans.push(mend); const again = await runPlan(mend, ran.board, o.blocks), bad2 = [...again.failing, ...await looseIn(again.board)]; if (bad2.length <= bad.length) { ran = again; bad = bad2; } }
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
      // (the requirement that falls on the part into the settings that take one, read by their keys and units, whatever the block)
      if (p.needs) { const sn = settingsForNeeds(d.settings ?? [], p.needs); Object.assign(set, sn.set); if (sn.lines.length) say('part', `${p.name}: its requirement into ${d.id}: ${sn.lines.join('; ')}`, !sn.lines.some((x) => x.includes('not set'))); }
      for (const [key, v] of Object.entries(p.set ?? {})) { const r = readSetting(d, keys, key, v); if (r.key) set[r.key] = r.value; }
      // (scale: a block chosen for a part with an envelope gets its size settings from it; still more than 2 times off, it is not taken)
      if (p.envelope?.length && !savedParts().some((x) => x.id === d.id)) { const s0 = await sizeOfBlock(d.id, Object.keys(set).length ? set : undefined), f0 = sizeFits(s0, p.envelope), ks = sizeKeys(d).filter((x) => !(x.key in set));
        if (s0 && (f0.k > 1.25 || f0.k < 0.8) && ks.length) { const scaled = Object.fromEntries(ks.map((x) => [x.key, +(x.value * f0.k).toPrecision(4)])), s1 = await sizeOfBlock(d.id, { ...set, ...scaled });
          if (s1 && Math.abs(Math.log(sizeFits(s1, p.envelope).k)) < Math.abs(Math.log(f0.k))) { Object.assign(set, scaled); say('part', `${p.name}: ${d.id} sized to its envelope (${p.envelope.map((v) => metres(v)).join(' x ')}): ${ks.map((x) => `${x.key} ${scaled[x.key]}`).join(', ')}; now ${s1.map((v) => metres(v)).join(' x ')}`); } }
        const s2 = await sizeOfBlock(d.id, Object.keys(set).length ? set : undefined), f2 = sizeFits(s2, p.envelope);
        if (s2 && !f2.ok && d.id.startsWith('seed.')) { say('part', `${p.name}: ${d.id} is ${metres(Math.max(...s2))} on its longest side, the part asked ${metres(Math.max(...p.envelope))} (more than 2 times off after its size settings): not taken; built from pieces at the size asked`, false);
          p.is = `${p.is} (${metres(Math.max(...p.envelope))} long; as ${d.id.replace(/^(seed|piece)\./, '').replace(/-/g, ' ')} in form only)`.slice(0, 300); p.from = 'aisle'; return planPart(p, of); } }
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
    try { sub = splitOf(await call(await splitAsk(`${p.is} (the part "${p.name}" of "${of.slice(0, 160)}")`, o.blocks, recall(p.is, 6), [], seeFor(p).trim()), 'quick')); }
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
  const mem = recall(request), found = searchByFunction(request, 8);
  // (0. the recognition list: what a person must see to say "that is one", and the whole's size from the request's words;
  // written before anything is chosen, so the split covers it and the checks hold the build to it)
  if ((o.features ?? !!o.look) && !o.skeleton) {
    try { const fo = firstJson(await call(`${FEATURE_RULE}\n${REQUIRE_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}`, 'quick'), 'features'); recog = recognitionOf(fo); reqs = requirementsOf(fo);
      // (the envelope is the size asked where the list gave no size of its own)
      const env = reqs.find((r) => r.name === 'envelope'); if (!recog.longest && env && typeof env.value === 'number' && env.value > 0) recog.longest = env.value * (env.unit === 'mm' ? 0.001 : 1);
      say('features', `a person must see: ${recog.features.map(featureLine).join('; ')}${recog.longest ? `; the whole about ${metres(recog.longest)} on its longest side${recog.why ? ` (${recog.why})` : ''}` : ''}`); }
    catch (e) { say('features', `no recognition list could be read: ${(e as Error).message.slice(0, 160)}`, false); }
    if (recog) say('features', reqs.length ? `requirements: ${reqs.map(requirementLine).join('; ')}` : 'no requirements were written: nothing to size the parts to', !!reqs.length);
  }
  // (0b. the layout skeleton: the whole as plain solids at places, one call, built by the room's own layout node and shown
  // at once; the room settles it. Kept as the build where the parts' build below leaves something unmet)
  if (o.skeleton) {
    // (the decomposition: the whole into subsystems, each subsystem handed to the decomposer again, level by level, until
    // only parts are left (four levels and about 160 items at most); one call a thing, a level's calls at once)
    type Tree = { name: string; n: number; kind: 'part' | 'system' | 'link'; is: string; kids: Tree[] };
    // (calls side by side, sixteen at a time at most: more than that and the service turns them away)
    const pooled = async <A, B>(xs: A[], f: (x: A) => Promise<B>): Promise<B[]> => { const out = new Array<B>(xs.length); let k = 0; await Promise.all(Array.from({ length: Math.min(16, xs.length) }, async () => { for (;;) { const i = k++; if (i >= xs.length) return; out[i] = await f(xs[i]!); } })); return out; };
    const split1 = async (path: string[], is: string): Promise<Tree[]> => { const r = firstJson(await call(`${DECOMPOSE_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}\nDecompose: ${path.length ? `${path.join(' > ')} (${is})` : 'the whole thing asked for'}`, 'quick'), 'decomposer') as { rows?: unknown };
      return (Array.isArray(r.rows) ? r.rows : []).filter(Array.isArray).slice(0, 12).map((x) => ({ name: String(x[0]), n: Math.max(1, Math.round(Number(x[1]) || 1)), kind: x[2] === 'system' ? 'system' as const : x[2] === 'link' ? 'link' as const : 'part' as const, is: String(x[3] ?? ''), kids: [] })); };
    // (the tools a placer may use instead of drawing: library blocks found by its branch's words, each a line of its id,
    // what it is, its settings with their defaults or choices, and its size as built at its defaults; built once, kept)
    const toolLine = async (id: string): Promise<string> => { if (TOOL_LINES.has(id)) return TOOL_LINES.get(id)!; let line = '';
      try { const d = LIBRARY.get(id); if (d && portsOf(d).outputs.some((q) => q.name === 'block')) { const tb = emptyBoard('tool'); placeBlock(tb, id, 0, 0, {}, 't'); const te = new Engine(tb); await te.run(); const blk = te.state.get('t')?.out?.block as { lo: number[]; hi: number[]; pieces: unknown[] } | undefined;
        if (blk) { const sets = paramsOf(d).slice(0, 8).map((q) => `${q.key}=${q.choices?.length ? `${String(q.default)} (${q.choices.slice(0, 8).join('|')})` : String(q.default)}${q.unit ? ` ${q.unit}` : ''}`).join('; ');
          line = `${id} | ${d.name} | ${String(d.says ?? '').slice(0, 110)} | ${blk.pieces.length} real pieces | adjustable: ${sets ? 'yes' : 'no'}`; } } }
      catch { /* a block that does not build at its defaults is not offered */ }
      TOOL_LINES.set(id, line); return line; };
    // (a tool's size as built with some settings, mm, kept; and the fit: the settings that bring it nearest a box asked for,
    // found by trying its choices and scaling its numbers, with the quarter turns that lay its long side along the box's)
    const sizeOf = async (id: string, set: Record<string, unknown>): Promise<number[] | undefined> => { const key = `${id} ${JSON.stringify(set)}`; if (TOOL_SIZES.has(key)) return TOOL_SIZES.get(key);
      let dims: number[] | undefined; try { const tb = emptyBoard('tool'); placeBlock(tb, id, 0, 0, set, 't'); const te = new Engine(tb); await te.run(); const blk = te.state.get('t')?.out?.block as { lo: number[]; hi: number[] } | undefined; if (blk) dims = [0, 1, 2].map((k) => (blk.hi[k]! - blk.lo[k]!) * 1000); } catch { /* not buildable so */ }
      TOOL_SIZES.set(key, dims); return dims; };
    const SWAPS: number[][] = [[], [0], [1], [2], [0, 1], [0, 2], [1, 0], [1, 2], [2, 0], [2, 1]];
    const turnedDims = (dm: number[], seq: number[]) => { const v = [...dm]; for (const k of seq) { const [a, b] = k === 0 ? [1, 2] : k === 1 ? [0, 2] : [0, 1]; [v[a], v[b]] = [v[b]!, v[a]!]; } return v; };
    const fitTool = async (id: string, target: number[], long?: number): Promise<{ set: Record<string, unknown>; pre: number[]; err: number; dims: number[] } | undefined> => {
      const d = LIBRARY.get(id); if (!d || target.some((x) => !(x > 0))) return undefined;
      const ts = [...target].sort((a, b) => a - b), err = (dm: number[]) => { const a = [...dm].sort((x, y) => x - y); return a.reduce((t, v, i) => t + Math.abs(Math.log(Math.max(v, 1e-3) / ts[i]!)), 0); };
      let set: Record<string, unknown> = {}, t0 = Date.now(), best = await sizeOf(id, set); if (!best) return undefined; let bestErr = err(best); const slow = Date.now() - t0 > 120;
      const tryIt = async (st: Record<string, unknown>) => { const dm = await sizeOf(id, st); if (dm && err(dm) < bestErr - 1e-9) { bestErr = err(dm); best = dm; set = st; } };
      const ps = paramsOf(d).filter((q) => q.from === 'setting' && !/^(name|mat|material|color|colour|finish)$/.test(q.key));
      for (let pass = 0; pass < (slow ? 1 : 2); pass++) for (const q of ps) {
        if (q.choices?.length && !slow) { const cs = q.choices, step = Math.max(1, Math.ceil(cs.length / 24)); for (let i = 0; i < cs.length; i += step) await tryIt({ ...set, [q.key]: cs[i] }); }
        else if (typeof q.default === 'number' && q.default > 0) { const cur = Number(set[q.key] ?? q.default), bs = [...best!].sort((a, b) => a - b);
          for (const k of [2, 1, 0]) { const v = cur * ts[k]! / Math.max(bs[k]!, 1e-3); if (Number.isFinite(v) && v > 0) await tryIt({ ...set, [q.key]: Number(v.toPrecision(3)) }); } } }
      // (a part that must span a gap: the setting its length follows (a cylinder's stroke) is solved for that length)
      if (long) for (const q of ps) { if (q.choices?.length || !(typeof q.default === 'number' && q.default > 0)) continue;
        for (let it = 0; it < 5; it++) { const cur = Number(set[q.key] ?? q.default), L0 = Math.max(...best!); if (Math.abs(L0 / long - 1) < 0.01) break;
          const d1 = await sizeOf(id, { ...set, [q.key]: Number((cur * 1.5).toPrecision(4)) }); if (!d1) break; const slope = (Math.max(...d1) - L0) / (cur * 0.5); if (!(Math.abs(slope) > 1e-6)) break;
          const v = Number((cur + (long - L0) / slope).toPrecision(4)); if (!(v > 0)) break; const d2 = await sizeOf(id, { ...set, [q.key]: v }); if (!d2 || Math.abs(Math.max(...d2) - long) >= Math.abs(L0 - long)) break; best = d2; set = { ...set, [q.key]: v }; bestErr = err(d2); } }
      let pre: number[] = [], po = Infinity; for (const seq of SWAPS) { const v = turnedDims(best!, seq), e2 = v.reduce((t, x, i) => t + Math.abs(Math.log(Math.max(x, 1e-3) / target[i]!)), 0); if (e2 < po - 1e-9) { po = e2; pre = seq; } }
      return { set, pre, err: bestErr, dims: best! }; };
    const toolsFor = async (words: string): Promise<string> => { const ls: string[] = []; for (const f of searchByFunction(words, 6)) { const l = await toolLine(f.id); if (l) ls.push(l); } return ls.join('\n'); };
    let tree: Tree[] = [], treeText = '', sizing: Promise<unknown> | undefined;
    try { tree = await split1([], '');
      const size1 = () => call(`${SIZER_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}\nIts subsystems (and under each, what it is made of):\n${tree.map((n) => `${n.name}${n.n > 1 ? ` x${n.n}` : ''} (${n.is})${n.kids.map((k) => `\n  ${k.name}${k.n > 1 ? ` x${k.n}` : ''}`).join('')}`).join('\n').slice(0, 5000)}`, 'quick').then((t) => firstJson(t, 'sizer'), (e: unknown) => e);
      let level = tree.map((n) => ({ n, path: [n.name] })), total = tree.length, depth = 1;
      for (; depth < 3 && total < 200; depth++) { const sys = level.filter((x) => x.n.kind === 'system').slice(0, 24); if (!sys.length) break;
        const next = await pooled(sys, async (x) => { try { x.n.kids = await split1(x.path, x.n.is); } catch { x.n.kids = []; } return x.n.kids.map((k) => ({ n: k, path: [...x.path, k.name] })); });
        level = next.flat(); total += level.length; sizing ??= size1(); }
      sizing ??= size1();
      const lines = (ns: Tree[], d: number): string[] => ns.flatMap((n) => [`${'  '.repeat(d)}${n.name}${n.n > 1 ? ` x${n.n}` : ''}${n.kids.length ? ':' : ''} (${n.is})`, ...lines(n.kids, d + 1)]);
      treeText = lines(tree, 0).join('\n'); const count = (ns: Tree[]): number => ns.reduce((a, n) => a + (n.kids.length ? count(n.kids) : 1), 0);
      say('features', `decomposed: ${tree.length} subsystems, ${count(tree)} parts, ${depth} level${depth === 1 ? '' : 's'} deep: ${tree.map((n) => n.name).join(', ')}`); }
    catch (e) { say('features', `not decomposed: ${(e as Error).message.slice(0, 140)}`, false); }
    try {
      type Row = (string | number)[]; let solids: Record<string, unknown>[] = [];
      const lines1 = (ns: Tree[], d: number): string[] => ns.flatMap((n) => [`${'  '.repeat(d)}${n.name}${n.n > 1 ? ` x${n.n}` : ''}${n.kids.length ? ':' : ''} (${n.is})`, ...lines1(n.kids, d + 1)]);
      // (the SIZER gives each subsystem its zone on the machine and the machine its livery; then a PLACER per subsystem, all
      // at once, places every part of its own branch: each solid named by its path, so the whole comes apart by subsystem)
      if (tree.length) { try {
        const sz0 = await sizing; if (sz0 instanceof Error) throw sz0; const sz = sz0 as { rows?: unknown; body?: unknown; whole?: unknown };
        const zones = new Map((Array.isArray(sz.rows) ? sz.rows as Row[] : []).filter(Array.isArray).map((r) => [String(r[0]), r] as const)), livery = `Main body colour ${String(sz.body ?? '#c8a200')}; the whole machine is ${JSON.stringify(sz.whole ?? [])} mm (x long, y high, z wide).`;
        const zoneText = [...zones.values()].map((r) => `${r[0]}: zone ${r[1]} x ${r[2]} x ${r[3]} mm at ${r[4]}, ${r[5]}, ${r[6]}`).join('\n');
        const pivots = (Array.isArray((sz as { pivots?: unknown }).pivots) ? (sz as { pivots: Row[] }).pivots : []).filter((r) => Array.isArray(r) && [1, 2, 3].every((k) => Number.isFinite(Number(r[k])))).slice(0, 40);
        const pivotText = pivots.length ? `\nThe pivots (where things are joined; a point is x, y, z with y its true height):\n${pivots.map((r) => `${r[0]}: ${Math.round(Number(r[1]))}, ${Math.round(Number(r[2]))}, ${Math.round(Number(r[3]))} joins ${r[4]} and ${r[5]}`).join('\n')}\n` : '';
        say('features', `sizer: ${zones.size} subsystem zones, ${pivots.length} pivots`);
        // (links are left to the JOINER, which sees where everything else ended up; a system of nothing but links goes with them)
        const strip = (ns: Tree[]): Tree[] => ns.flatMap((n) => { if (n.kind === 'link') return []; const kids = strip(n.kids); return n.kids.length && !kids.length ? [] : [{ ...n, kids }]; }), bare = strip(tree);
        const links: { name: string; n: number; is: string }[] = []; const walk = (ns: Tree[], path: string[]) => { for (const n of ns) { if (n.kind === 'link') links.push({ name: [...path, n.name].join(' > '), n: n.n, is: n.is }); else walk(n.kids, [...path, n.name]); } }; walk(tree, []);
        const units = bare.flatMap((n) => { const subs = n.kids.filter((k) => k.kids.length), loose = n.kids.filter((k) => !k.kids.length);
          return subs.length ? [...subs.map((k) => ({ path: [n.name, k.name], is: k.is, parts: k.kids })), ...(loose.length ? [{ path: [n.name], is: n.is, parts: loose }] : [])] : [{ path: [n.name], is: n.is, parts: n.kids.length ? n.kids : [n] }]; }).slice(0, 48);
        const placed = await pooled(units, async (u) => { const nm = u.path.join(' > '); try {
          const menu = await toolsFor(`${u.path.join(' ')} ${u.is} ${u.parts.map((q) => q.name).join(' ')}`);
          const r = firstJson(await call(`${PLACER_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}\n${livery}\nEvery subsystem's zone:\n${zoneText}\n${pivotText}\nYour branch: ${nm} (${u.is}), inside the zone of ${u.path[0]}. Its parts:\n${lines1(u.parts, 0).join('\n').slice(0, 2000)}${menu ? `\n\nReal library parts you may place instead of drawing (a "use" row):\n${menu}` : ''}`, 'quick'), `placer (${nm})`) as { rows?: unknown };
          return (Array.isArray(r.rows) ? r.rows as Row[] : []).filter(Array.isArray).slice(0, 40).map((x): Record<string, unknown> => (x[1] === 'beam' || x[1] === 'bar'
            ? (() => { const p1 = [Number(x[3]), Number(x[4]), Number(x[5])], p2 = [Number(x[6]), Number(x[7]), Number(x[8])], len = Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!, p2[2]! - p1[2]!), dp = Math.abs(Number(x[2])) || len / 10, wd = Math.abs(Number(x[11])) || dp;
                return [...p1, ...p2].every(Number.isFinite) && len > 5 ? { name: `${nm} > ${String(x[0])}`, span: [p1, p2], thick: [dp, wd], shape: x[1] === 'bar' ? 'rod' : 'box', size: [dp, len, wd], at: [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2, (p1[2]! + p2[2]!) / 2], mat: x[9], color: x[10], rot: [0, 0, 0] } : { name: `${nm} > ${String(x[0])}`, shape: 'box', size: [1, 1, 1], at: [0, 0, 0], skip: true }; })()
            : x[0] === 'use'
            ? { use: String(x[1]), name: `${nm} > ${String(x[2])}`, size: [x[3], x[4], x[5]], at: [x[6], x[7], x[8]], rot: [x[9] ?? 0, x[10] ?? 0, x[11] ?? 0] }
            : { name: `${nm} > ${String(x[0])}`, shape: x[1], axis: x[2], size: [x[3], x[4], x[5]], at: [x[6], x[7], x[8]], mat: x[9], color: x[10], rot: [x[11] ?? 0, x[12] ?? 0, x[13] ?? 0] }));
        } catch (e) { say('features', `placer (${nm}): ${(e as Error).message.slice(0, 100)}`, false); return []; } });
        // (a row whose size or place is not three numbers is left out, and said: one bad row must not lose the whole machine)
        { const all = placed.flat().filter((x) => !x.skip), fin = (v: unknown) => Array.isArray(v) && [0, 1, 2].every((k) => v[k] !== null && v[k] !== '' && Number.isFinite(Number(v[k])));
          solids = all.filter((x) => fin(x.size) && fin(x.at) && (x.size as unknown[]).every((v) => Math.abs(Number(v)) >= 1)).slice(0, 500); if (solids.length < all.length) say('features', `${all.length - solids.length} row${all.length - solids.length === 1 ? '' : 's'} left out: no size or place given`, false); } say('features', `placers: ${solids.length} solids from ${placed.filter((x) => x.length).length} of ${units.length} branches`);
        if (links.length && solids.length) { try {
          const N3 = (v: unknown) => [0, 1, 2].map((k) => Number((v as unknown[])?.[k]) || 0), vol = (x: Record<string, unknown>) => N3(x.size).reduce((a, v) => a * Math.abs(v), 1);
          const anchors = [...solids].sort((p, q) => vol(q) - vol(p)).slice(0, 140);
          const menu = await toolsFor(links.map((l) => `${l.name.split(' > ').pop()} ${l.is}`).join(' ').slice(0, 400));
          const r = firstJson(await call(`${JOINER_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}\n${livery}\nThe solids placed:\n${anchors.map((x, k) => { const sz = N3(x.size), at = N3(x.at), rt = N3(x.rot); if (Array.isArray(x.span)) { const [a, c] = x.span as number[][]; return `${k} ${String(x.name)} | a member ${sz[0]} deep, ${sz[2]} wide, from ${a!.join(' ')} to ${c!.join(' ')} (true heights)`; } return `${k} ${String(x.name)} | ${sz.join(' ')} | ${at.join(' ')}${rt.some((v) => v) ? ` | turned ${rt.join(' ')}` : ''}`; }).join('\n')}\n${pivotText}\nThe links to place:\n${links.slice(0, 40).map((l) => `${l.name}${l.n > 1 ? ` x${l.n}` : ''} (${l.is})`).join('\n')}${menu ? `\n\nReal library parts (shape = the id):\n${menu}` : ''}`, 'quick'), 'joiner') as { rows?: unknown };
          // (each end is brought onto the solid it names: the nearest point of that solid's box, turned as the solid is)
          const mv = (M: readonly number[], v: number[]) => [0, 1, 2].map((i) => M[i * 3]! * v[0]! + M[i * 3 + 1]! * v[1]! + M[i * 3 + 2]! * v[2]!), mtv = (M: readonly number[], v: number[]) => [0, 1, 2].map((i) => M[i]! * v[0]! + M[3 + i]! * v[1]! + M[6 + i]! * v[2]!);
          const onto = (p: number[], k: unknown): number[] => { const x = anchors[Number(k)]; if (!x || typeof x.use === 'string' || !Number.isInteger(Number(k))) return p;
            if (Array.isArray(x.span)) { const [a, c] = x.span as number[][], dd = c!.map((v, i) => v - a![i]!), t = Math.max(0, Math.min(1, p.reduce((q, v, i) => q + (v - a![i]!) * dd[i]!, 0) / dd.reduce((q, v) => q + v * v, 0))), q = a!.map((v, i) => v + t * dd[i]!), off = p.map((v, i) => v - q[i]!), on = Math.hypot(off[0]!, off[1]!, off[2]!), lim = Math.abs(N3(x.size)[0]!) / 2, f = on > lim && on > 0 ? lim / on : 1; return q.map((v, i) => Math.round(v + off[i]! * f)); }
            const sz = N3(x.size).map(Math.abs), at = N3(x.at), Rs = N3(x.rot).map((d, ax) => roomTurnOf(ax as 0 | 1 | 2, d));
            const fwd = (v: number[]) => Rs.reduce((a, M) => mv(M, a), v), inv = (v: number[]) => [...Rs].reverse().reduce((a, M) => mtv(M, a), v);
            const ys = [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((l) => fwd([i * sz[0]! / 2, j * sz[1]! / 2, l * sz[2]! / 2])[1]!))), h = Math.max(...ys) - Math.min(...ys), c = [at[0]!, at[1]! + h / 2, at[2]!];
            const loc = inv(p.map((v, i) => v - c[i]!)).map((v, i) => Math.max(-sz[i]! / 2, Math.min(sz[i]! / 2, v))); return fwd(loc).map((v, i) => Math.round(v + c[i]!)); };
          let nl = 0; for (const x of (Array.isArray(r.rows) ? r.rows as Row[] : []).filter(Array.isArray).slice(0, 60)) { const g1 = [Number(x[3]), Number(x[4]), Number(x[5])], g2 = [Number(x[7]), Number(x[8]), Number(x[9])], gl = Math.hypot(g2[0]! - g1[0]!, g2[1]! - g1[1]!, g2[2]! - g1[2]!);
            // (an end is brought onto its solid only if that is a short move: a long one means the wrong solid was named)
            const near = (g: number[], k: unknown) => { const q = onto(g, k); return Math.hypot(q[0]! - g[0]!, q[1]! - g[1]!, q[2]! - g[2]!) <= Math.max(250, gl * 0.3) ? q : g; }, p1 = near(g1, x[6]), p2 = near(g2, x[10]);
            const len = Math.hypot(p2[0]! - p1[0]!, p2[1]! - p1[1]!, p2[2]! - p1[2]!), thick = Math.abs(Number(x[2])) || len / 12; if (![...p1, ...p2].every(Number.isFinite) || !(len > 5)) continue; nl++;
            const shape = String(x[1]), mid = [(p1[0]! + p2[0]!) / 2, (p1[1]! + p2[1]!) / 2, (p1[2]! + p2[2]!) / 2];
            solids.push(LIBRARY.has(shape) ? { use: shape, name: String(x[0]), span: [p1, p2], thick, size: [thick, len, thick], at: mid, rot: [0, 0, 0] } : { name: String(x[0]), span: [p1, p2], thick, shape, size: [thick, len, thick], at: mid, mat: x[11], color: x[12], rot: [0, 0, 0] }); }
          say('features', `joiner: ${nl} link${nl === 1 ? '' : 's'} pinned between the solids they join`);
        } catch (e) { say('features', `joiner: ${(e as Error).message.slice(0, 120)}`, false); } }
      } catch (e) { say('features', `sizer: ${(e as Error).message.slice(0, 120)}; one layout call instead`, false); } }
      // (no tree, or nothing placed: the whole laid out by one call, as before)
      if (!solids.length) { const lo = firstJson(await call(`${LAYOUT_RULE}${PROMPT_CUT}Request: ${request.slice(0, 600)}${treeText ? `\nWhat it is made of (place every part; name each solid by its path, as "subsystem > part"; x2 means two solids, mirrored or spaced as on the real thing):\n${treeText.slice(0, 6000)}` : ''}`, 'quick'), 'layout') as { solids?: unknown };
        solids = (Array.isArray(lo.solids) ? lo.solids.slice(0, 200) : []).map((r) => (Array.isArray(r) ? { name: r[0], shape: r[1], axis: r[2], size: [r[3], r[4], r[5]], at: [r[6], r[7], r[8]], mat: r[9], color: r[10], rot: [r[11] ?? 0, r[12] ?? 0, r[13] ?? 0] } : r)); if (!solids.length) throw new Error('no solids in the reply'); }
      { let poor = 0; const misfit: string[] = []; for (const x of solids) { if (typeof x.use !== 'string') continue; const target = (x.size as unknown[]).map((v) => Math.abs(Number(v)));
          const spanLen = Array.isArray(x.span) ? Math.max(...target) : 0, f = LIBRARY.has(x.use) ? await fitTool(x.use, target, spanLen || undefined) : undefined;
          // (within about a third on each side, summed: else the part is not the thing for that place, and a box stands in)
          if (f && f.err < 1.2 && (!spanLen || Math.abs(Math.max(...f.dims) / spanLen - 1) < 0.08)) { x.set = f.set; x.pre = f.pre; } else { poor++; misfit.push(`${String(x.use)} asked ${target.map((v: number) => Math.round(v)).join('x')} nearest ${f ? f.dims.map((v) => Math.round(v)).join('x') : 'none'}`); delete x.use; x.shape = spanLen ? 'rod' : 'box'; x.axis = 'y'; x.mat = 'steel-low'; x.color = '#8a8f98'; } }
        if (poor) say('features', `${poor} library part${poor === 1 ? '' : 's'} could not be made the size asked: drawn as plain solids (${misfit.slice(0, 3).join('; ')})`, false); }
      let b = emptyBoard(request.slice(0, 80)), st: ReturnType<Engine['state']['get']>, used = 0;
      for (let pass = 0; pass < 2; pass++) { b = emptyBoard(request.slice(0, 80));
        const tools = solids.filter((x) => typeof x.use === 'string' && LIBRARY.has(String(x.use))).slice(0, 120), drawn = solids.filter((x) => x.use === undefined);
        const idOf = (k: number) => `t${String(k).padStart(3, '0')}`;
        placeBlock(b, 'room.layout', 0, 0, { name: request.slice(0, 60), boxes: JSON.stringify([...drawn, ...tools.map((t, k) => ({ in: k, name: t.name, at: t.at, rot: t.rot, pre: t.pre, span: t.span }))]) }, 'layout'); placeBlock(b, 'space.show', 330, 0, {}, 'show'); wire(b, 'layout', 'thing', 'show', 'thing');
        tools.forEach((t, k) => { placeBlock(b, String(t.use), -330, k * 140, (t.set ?? {}) as Record<string, unknown>, idOf(k)); b.nodes[idOf(k)]!.label = String(t.name); wire(b, idOf(k), 'block', 'layout', 'blocks'); });
        const e = new Engine(b); await e.run(); st = e.state.get('layout'); used = tools.length;
        const bad = tools.filter((_t, k) => e.state.get(idOf(k))?.status !== 'ok');
        if (!bad.length) break;
        say('features', `${bad.length} library part${bad.length === 1 ? '' : 's'} did not build as asked and ${bad.length === 1 ? 'was' : 'were'} left out: ${bad.slice(0, 4).map((t) => `${String(t.use)} (${String(t.name)})`).join(', ')}`, false);
        solids = solids.filter((x) => !bad.includes(x)); }
      if (used) say('features', `${used} real library part${used === 1 ? '' : 's'} placed`);
      if (st?.status !== 'ok') throw new Error(String(st?.error ?? 'the layout did not build').slice(0, 160));
      skeleton = b; board = b; say('features', `laid out as ${solids.length} solids`);
      return done1(`Built: ${solids.length} solids${tree.length ? ` in ${tree.length} subsystems (${tree.map((n) => n.name).join(', ')})` : ''}. A model of plain solids placed as on the real thing: not yet real engineered parts.`); }
    catch (e) { say('features', `no layout: ${(e as Error).message.slice(0, 160)}`, false); }
  }
  const see = recog ? `${recognitionLines(recog)}\nEvery feature is shown by a part ("shows").${reqs.length ? `\n${requirementLines(reqs)}\nEach part the requirement falls on says it ("needs").` : ''}` : '';
  if (found.length) say('split', `found by what they do: ${found.map((f) => f.id).join(', ')}`);
  try { ({ parts, joins } = splitOf(await call(await splitAsk(request, o.blocks, mem, found, see), 'quick')));
    // (a feature no part shows: the split asked once more with those named; taken where it leaves fewer bare)
    const bare = cover();
    if (bare.length) { say('split', `no part shows: ${bare.map((f) => f.name).join(', ')}; the split asked again with those`, false);
      const was = { parts, joins };
      try { const again = splitOf(await call(await splitAsk(request, o.blocks, mem, found, `${see}\nYour split before: ${JSON.stringify({ parts: parts.map((p) => ({ name: p.name, is: p.is, from: p.from, ...(p.set ? { set: p.set } : {}), ...(p.shows ? { shows: p.shows } : {}), ...(p.needs ? { needs: p.needs } : {}) })), joins })}\nNo part of it shows: ${bare.map(featureLine).join('; ')}. Reply with the whole split again: a part added for each of these (from pieces where no assembly is it), or the feature named in the "shows" of the part that plainly shows it.`), 'quick'));
        ({ parts, joins } = again); if (cover().length >= bare.length) { ({ parts, joins } = was); cover(); } }
      catch (e) { say('split', `asked again: ${(e as Error).message.slice(0, 120)}`, false); } } }
  catch (e) { say('split', `Could not split it into parts: ${(e as Error).message}`, false); unmet.push('no parts: the split failed'); if (notReached.length) unmet.push(`the time budget (${Math.round(budget / 1000)} s) was spent: not reached: ${notReached.join(', ')}`); return done(`Nothing built: the split failed (${(e as Error).message}).`); }
  say('split', `${parts.length} part${parts.length === 1 ? '' : 's'}: ${parts.map((p) => `${p.name} (${p.is.slice(0, 50)}; from ${p.from || 'pieces'})`).join(', ')}${joins.length ? `; ${joins.map((j) => `${j.part} ${j.how} ${j.to}`).join(', ')}` : ''}${mem.length ? `; ${mem.length} part${mem.length === 1 ? '' : 's'} remembered offered` : ''}`);
  // (2 and 3. each part made and folded to one node, three side by side)
  const place = (p: ComposePart, f: { node: Board['nodes'][string] } | undefined, k: number, y = 0) => { if (!f) return; let nm = p.name; while (board.nodes[nm]) nm = `${nm}_${k + 2}`; board.nodes[nm] = { ...f.node, label: nm, x: k * 420, y }; p.node = nm; };
  // (with a recognition list, the parts the library gives are placed first (no call): the biggest is what the parts made
  // from pieces are sized beside, so the thing is in proportion; the size asked is held by the check, not by a guess here)
  const fromLibrary = (p: ComposePart) => { const d = block(p.from.trim().replace(/^["'`]|["'`:]$/g, '')); return !!d && buildsInSpace(d) && !OLD_BUILD.test(d.id); };
  const got: ({ node: Board['nodes'][string]; block: RoomOut } | undefined)[] = new Array(parts.length), firstK = recog ? parts.map((_, k) => k).filter((k) => fromLibrary(parts[k]!)) : [];
  for (const k of [...firstK]) { const p = parts[k]!, f = await makePart(p, 0, request), L = f ? longestOf(f.block) : undefined;
    // (an assembly more than twice the size of the whole asked cannot be a part of it: that part is built from pieces, at the size asked)
    if (f && L && recog?.longest && L > 2 * recog.longest) { say('part', `${p.name}: ${p.from} is ${metres(L)} on its longest side, more than twice the whole asked (${metres(recog.longest)}): not taken; built from pieces at the size asked`, false);
      p.is = `${p.is} (as ${p.from.replace(/^(seed|piece)\./, '').replace(/-/g, ' ')}, but small)`.slice(0, 300); p.from = 'aisle'; delete p.by; delete p.saved; p.names = []; firstK.splice(firstK.indexOf(k), 1); continue; }
    got[k] = f; }
  const big = firstK.filter((k) => got[k]).sort((a, b) => (longestOf(got[b]!.block) ?? 0) - (longestOf(got[a]!.block) ?? 0))[0];
  if (big !== undefined && firstK.length < parts.length) { const b = got[big]!.block, L = longestOf(b);
    if (L) { anchor = `The part "${parts[big]!.name}" (${parts[big]!.is.slice(0, 80)}) is already built: ${[0, 1, 2].map((k) => Math.round((b.hi![k]! - b.lo![k]!) * 1000)).join(' x ')} mm (x by y by z). Size this part beside THAT, in the proportion said, whatever size the whole was asked.`; say('part', `${parts[big]!.name} is ${metres(L)} on its longest side: the parts made from pieces are sized beside it`); } }
  const restK = parts.map((_, k) => k).filter((k) => !firstK.includes(k));
  (await eachAtMost(restK, 3, (k) => makePart(parts[k]!, 0, request))).forEach((f, i) => { got[restK[i]!] = f; });
  got.forEach((f, k) => place(parts[k]!, f, k));
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
    try { const o2 = firstJson(await call(`${GATE_RULE}\nAssemblies (from): ${ids.join(', ')}${PROMPT_CUT}${mem.length ? `Parts remembered (from): ${mem.map((x) => `${x.id} (${x.name})`).join(', ')}\n` : ''}Asked: ${request.slice(0, 600)}\nBuilt:\n${built}${top ? `\nThe whole: ${top[2].pieces.length} pieces` : ''}${cover().length ? `\nA person must see, and no part built shows (missing, each by its name here): ${cover().map(featureLine).join('; ')}` : ''}`, 'quick'), 'check');
      const have = new Set([...parts.map((p) => p.name), ...Object.keys(board.nodes)]);
      want = (Array.isArray(o2.missing) ? o2.missing : []).slice(0, 3).map((m, k) => { const x = (m ?? {}) as Record<string, unknown>; let name = String(x.name ?? `missing${k + 1}`).toLowerCase().replace(/\W+/g, '_').replace(/^_+|_+$/g, '') || `missing${k + 1}`; if (/^\d/.test(name)) name = `p${name}`; const asked = name, instead = parts.find((q) => q.name === asked && !q.node)?.name; while (have.has(name)) name = `${name}2`; have.add(name);
        return { name, is: String(x.is ?? name).slice(0, 300), from: String(x.from ?? '').slice(0, 120), names: [], failing: [], joins: String(x.joins ?? 'onto the whole').slice(0, 60), ...(instead ? { instead } : {}), ...(cover().some((f) => sameFeature(f.name, asked)) ? { shows: [asked] } : {}) }; }); }
    catch (x) { say('gate', `the final check could not be read: ${(x as Error).message.slice(0, 160)}`, false); break; }
    if (!want.length) { say('gate', `nothing missing${round ? ' now' : ''}: ${made().map((p) => p.name).join(', ')}`); break; }
    missing.push(...want.map((p) => p.name)); say('gate', `missing: ${want.map((p) => `${p.name} (${p.is.slice(0, 60)})`).join(', ')}; built and joined`, false);
    const fs = await eachAtMost(want, 3, (p) => makePart(p, 0, request)); want.forEach((p, k) => place(p, fs[k], k, 400 * (round + 1))); parts.push(...want);
    const fresh = want.filter((p) => p.node); if (!fresh.length) continue;
    e = new Engine(board); await e.run(); const now = biggest(board, e);
    const host: ComposePart | undefined = now ? { name: now[0], node: now[0], is: 'the whole built so far', from: '', names: namesOf(now[2]), failing: [] } : undefined;
    board = (await joinUp(board, [...(host ? [host] : []), ...fresh], fresh.map((p) => ({ part: p.name, how: p.joins, to: host?.name ?? 'the whole' })), request, host?.name)).board;
  }
  // (5b. the functional gate (acceptance 10): each driver asked joined to what it drives and to a supply (aitools.ts
  // working); refused with its reasons, and one call asked to make it work with only those; still refused, not met)
  const worksOn = async (b: Board): Promise<Working | undefined> => { const x = new Engine(b); await x.run(); const w = biggest(b, x)?.[2];
    return w ? working(w as unknown as Block, made().map((p) => ({ name: p.name, is: p.is, names: p.names, ...(p.node ? { node: p.node } : {}) }))) : undefined; };
  works = await worksOn(board);
  if (works && !works.ok) {
    say('gate', `not working: ${works.reasons.join('; ')}`, false);
    try { const plan = planOf(await planCall(`${guideHead}${PROMPT_CUT}${boardBrief(board)}\n\n${WORK_RULE}\nAsked: ${request.slice(0, 400)}\nWhy it does not work:\n${works.reasons.map((r) => `- ${r}`).join('\n')}`, 'default', board)); plans.push(plan);
      const ran = await runPlan(plan, board, o.blocks), after = await worksOn(ran.board);
      if (after && after.reasons.length < works.reasons.length) { board = ran.board; works = after; }
      say('gate', works.ok ? `working now: ${works.drives.map((d) => `${d.driver} drives ${d.load}`).join(', ')}` : `still not working: ${works.reasons.join('; ')}`, works.ok); }
    catch (x) { say('gate', `asked to make it work: ${(x as Error).message.slice(0, 160)}`, false); }
  // (a pass said as a check only where there was a driver to check; with none, the gate had nothing to say)
  } else if (works?.drives.length) say('check', `working: ${works.drives.map((d) => `${d.driver} drives ${d.load}`).join(', ')}${works.notes.length ? `; not checked: ${works.notes.join('; ')}` : ''}`);
  // (5c. a driver whose power line still reaches no supply, after the mend (whose joins the model may rewrite): by rule,
  // no call, a supply added by its terminals' voltage (parts/power.ts psuFor) and joined to them by a lead, P6's wire model
  // (circuit.ts LEAD: a round copper piece touching both), the three stacked supply, lead, driver; every input the
  // driver's block fed wired again in its order with the powered stack in its place; taken only where the gate then
  // gives fewer reasons, the supply then one of the parts)
  if (works && !works.ok) for (const reason of [...works.reasons]) {
    const m = /^(.+): its power line \((.+)\) is joined to no supply$/.exec(reason), d = m ? made().find((p) => p.name === m[1]) : undefined; if (!m || !d?.node || !works || works.ok) continue;
    const n = d.node, outs = edgesOf(board).filter((e) => e.from === n && e.out === 'block'); if (!outs.length) { say('gate', `${d.name}: no supply added: its block feeds nothing to put a supply under`, false); continue; }
    const [{ psuFor }, { LEAD, leadRadius }] = await Promise.all([import('./parts/power'), import('./circuit')]);
    const x = new Engine(board); await x.run(); const mb = x.state.get(n)?.out?.block as RoomOut | undefined;
    const pl = mb?.pieces.flatMap((pc) => (pc as unknown as Block['pieces'][number]).lines).find((l) => l.kind === 'power' && l.port === m[2]) as { size?: Record<string, unknown> } | undefined;
    const V = typeof pl?.size?.V === 'number' ? pl.size.V : undefined, A = typeof pl?.size?.A === 'number' ? pl.size.A : undefined, psu = psuFor(V, A);
    const used = new Set(nodesOf(board).map((q) => q.id)), id = (s: string) => { let k = `${n}_${s}`, i = 2; while (used.has(k)) k = `${n}_${s}${i++}`; used.add(k); return k; };
    const sup = id('supply'), lead = id('lead'), pw = id('powered'), ins = [...new Set(outs.map((e) => `${e.to}.${e.in}`))];
    const rewire = ins.flatMap((ti) => edgesOf(board).filter((e) => `${e.to}.${e.in}` === ti).map((e) => (e.from === n && e.out === 'block' ? `${pw}.block>${ti}` : `${e.from}.${e.out}>${ti}`)));
    const plan: AgentPlan = { tool: 'change', says: `a supply for ${d.name} (piece.psu ${psu.size}) joined to its terminals by a lead`, input: {
      add: { [sup]: { b: 'piece.psu', s: { size: psu.size } }, [lead]: { b: 'room.make', s: { name: `${d.name} supply lead`, shape: 'rod', mat: LEAD.mat, a: leadRadius() * 1000, b: LEAD.length * 1000 } }, [pw]: { b: 'room.stack', s: { name: `${d.name} powered`, axis: 'y', order: `${sup},${lead},${n}` } } },
      unwire: ins, wires: [`${sup}.block>${pw}.blocks`, `${lead}.block>${pw}.blocks`, `${n}.block>${pw}.blocks`, ...rewire] } };
    try { const ran = await runPlan(plan, board, o.blocks), y = new Engine(ran.board); await y.run(); const sb = y.state.get(sup)?.out?.block as RoomOut | undefined;
      const part: ComposePart = { name: parts.some((p) => p.name === 'supply') ? `supply ${parts.length + 1}` : 'supply', is: `a DC supply for ${d.name}`, from: 'piece.psu', by: 'assembly', set: { size: psu.size }, node: sup, names: sb ? namesOf(sb) : [], failing: [] };
      parts.push(part); const after = await worksOn(ran.board);
      if (after && after.reasons.length < works.reasons.length) { board = ran.board; works = after; plans.push(plan);
        say('gate', `${works.ok ? `working now: ${works.drives.map((q) => `${q.driver} drives ${q.load}`).join(', ')}` : `still not working: ${works.reasons.join('; ')}`}; ${d.name}'s power line (${m[2]}) joined to a supply by rule: piece.psu ${psu.says}, by a lead of ${LEAD.src}`, works.ok); }
      else { parts.splice(parts.indexOf(part), 1); say('gate', `${d.name}: a supply joined by rule left it as it was: ${(after?.reasons ?? ['the build did not run']).join('; ')}`, false); } }
    catch (e) { say('gate', `${d.name}: no supply added: ${(e as Error).message.slice(0, 160)}`, false); }
  }
  if (works && !works.ok) unmet.push(...works.reasons.map((r) => `not working: ${r}`));
  // (5e. the engineering check, with no model (lookat.ts engineeringOf): the mass from the geometry; each part with a
  // requirement on it, what its components' rows give against what it needs; the drivers against the supply; each part's
  // own report held to the minimum it states. A failed margin is the reason for one mend, taken where nothing fails and
  // fewer margins fail; what still fails is unmet, below)
  const engOn = async (b: Board): Promise<{ eng: Engineering; mass?: number } | undefined> => { const x = new Engine(b); await x.run(); const t = biggest(b, x); if (!t) return undefined;
    const w = t[2] as unknown as Block, own = piecesOfParts(w, made().map((p) => ({ name: p.name, is: p.is, names: p.names, ...(p.node ? { node: p.node } : {}) })));
    const outs = (id?: string) => Object.fromEntries(Object.entries((id ? x.state.get(id)?.out : undefined) ?? {}).filter(([k, v]) => k !== 'thing' && !isRoom(v)));
    const r = engineeringOf(made().map((p) => ({ name: p.name, role: roleOf(p), ...(p.needs ? { needs: p.needs } : {}), pieces: (own.get(p.name) ?? []).map((i) => w.pieces[i]!), outputs: outs(p.node) })));
    let m: number | undefined; try { const th = x.state.get(t[0])?.out?.thing; if (th) { const v = massOfAll(th as Assembly); if (Number.isFinite(v) && v > 0) m = v; } } catch { /* a thing that cannot be weighed: the mass is said as not measured */ }
    return { eng: r, ...(m !== undefined ? { mass: m } : {}) }; };
  if (recog) { const first = await engOn(board); eng = first?.eng; mass = first?.mass;
    if (eng?.reasons.length) { say('gate', `engineering: ${eng.reasons.join('; ')}`, false);
      try { const plan = planOf(await planCall(`${guideHead}${PROMPT_CUT}${boardBrief(board)}\n\n${ENG_RULE}\nAsked: ${request.slice(0, 400)}\n${requirementLines(reqs)}\nWhat fails:\n${eng.reasons.map((r) => `- ${r}`).join('\n')}`, 'default', board)); plans.push(plan);
        const ran = await runPlan(plan, board, o.blocks), after = ran.failing.length ? undefined : await engOn(ran.board);
        if (after && after.eng.reasons.length < eng.reasons.length) { board = ran.board; eng = after.eng; mass = after.mass; works = await worksOn(board) ?? works; }
        say('gate', eng.reasons.length ? `engineering, after the mend${after ? '' : ` (not taken: ${ran.failing[0]?.slice(0, 120) ?? 'it made no block'})`}: ${eng.reasons.join('; ')}` : `engineering now holds: ${eng.margins.map(marginLine).join('; ')}`, !eng.reasons.length); }
      catch (x) { say('gate', `asked to mend the engineering: ${(x as Error).message.slice(0, 160)}`, false); } }
    else if (eng) say('check', `engineering: ${eng.margins.length ? eng.margins.map(marginLine).join('; ') : 'no margin to hold (no part has a requirement its rows carry)'}${eng.notes.length ? `; not checked: ${eng.notes.join('; ')}` : ''}`); }
  // (a show of the whole, where the plan put none)
  const showWhole = async (): Promise<Engine> => { let x = new Engine(board); await x.run(); const top = biggest(board, x);
    if (top && !nodesOf(board).some((n) => board.nodes[n.id]!.block === 'space.show') && 'thing' in (x.state.get(top[0])?.out ?? {})) { const sh = board.nodes.show ? 'show_whole' : 'show'; placeBlock(board, 'space.show', 0, 0, {}, sh); wire(board, top[0], 'thing', sh, 'thing'); x = new Engine(board); await x.run(); }
    return x; };
  let e = await showWhole();
  // (5d. the eye, where the caller gives one (decision 0029, wave 14): the model is shown the picture of the build with
  // the recognition list and says, feature by feature, seen, not seen or wrong; what is not seen is the reason for one
  // mend (one change, run, taken where nothing fails, nothing falls apart, no piece is lost and the functional gate has no
  // more to say), then it looks again; two mends at most; what is still not seen is unmet, below)
  if (o.look && recog) {
    const list = recog; let pic: Uint8Array | undefined;
    const lookAt = async (): Promise<Looked | undefined> => {
      try { pic = (await o.look!(board))?.png; } catch (x) { pic = undefined; say('look', `no picture: ${(x as Error).message.slice(0, 160)}`, false); return undefined; }
      if (!pic) { say('look', 'no picture could be taken of the build', false); return undefined; }
      try { const l = lookedOf(firstJson(await call(`${LOOK_RULE}${PROMPT_CUT}Asked: ${request.slice(0, 400)}\n${recognitionLines(list)}`, 'default', [pic]), 'look'), list.features); looks++;
        for (const f of list.features) { const s = l.features.find((x) => x.name === f.name)!; f.seen = s.seen; if (s.note) f.note = s.note; else delete f.note; }
        const off = l.features.filter((f) => f.seen !== 'seen');
        say('look', `look ${looks}: ${l.features.map((f) => `${f.name} ${f.seen}${f.note ? ` (${f.note})` : ''}`).join('; ')}${l.proportions ? ` | ${l.proportions}` : ''}`, !off.length); return l; }
      catch (x) { say('look', `the look could not be read: ${(x as Error).message.slice(0, 160)}`, false); return undefined; } };
    let l = await lookAt();
    for (let round = 0; round < 2 && l; round++) {
      const off = list.features.filter((f) => f.seen && f.seen !== 'seen'); if (!off.length) break;
      const x0 = new Engine(board); await x0.run(); const t0 = biggest(board, x0), w0 = t0?.[2], size = sizeOff(longestOf(w0), list.longest); let taken = false;
      try { const mendAsk = `${guideHead}${PROMPT_CUT}${boardBrief(board)}\n\n${SEE_RULE}\nAsked: ${request.slice(0, 400)}\n${recognitionLines(list)}${t0 ? `\nThe whole now: ${t0[0]}.${t0[1]}: ${roomLine(t0[2])}` : ''}\nWhat a person does not see:\n${off.map((f) => `- ${f.seen}: ${featureLine(f)}${f.note ? `: ${f.note}` : ''}`).join('\n')}${size ? `\n- ${size}` : ''}`;
        let plan: AgentPlan;
        try { plan = planOf(await planCall(mendAsk, 'default', board, pic ? [pic] : undefined)); }
        catch (x) { plan = planOf(await planCall(`${mendAsk}\nYour reply before could not be read (${(x as Error).message.slice(0, 120)}): reply with the one JSON change and nothing else, no words before it.`, 'default', board, pic ? [pic] : undefined)); }
        plans.push(plan);
        const ran = await runPlan(plan, board, o.blocks), x1 = new Engine(ran.board); await x1.run(); const t1 = biggest(ran.board, x1), w1 = t1?.[2];
        const after = w1 ? await worksOn(ran.board) : undefined;
        const why = ran.failing.length ? `${ran.failing.length} line(s) failed: ${ran.failing[0]!.slice(0, 120)}` : !w1 ? 'it made no block' : groupsOf(w1) > (w0 ? groupsOf(w0) : 1) ? `it fell in ${groupsOf(w1)} groups` : w1.pieces.length < (w0?.pieces.length ?? 0) ? `it lost ${(w0?.pieces.length ?? 0) - w1.pieces.length} piece(s)` : (after?.reasons.length ?? 0) > (works?.reasons.length ?? 0) ? `it no longer works: ${after!.reasons[0]}` : '';
        if (!why && t1 && w1) { taken = true; board = ran.board; if (after) works = after;
          const left = new Map<string, number>(); for (const nm of w0 ? namesOf(w0) : []) left.set(nm, (left.get(nm) ?? 0) + 1);
          const added = namesOf(w1).filter((nm) => { const n = left.get(nm) ?? 0; if (n > 0) { left.set(nm, n - 1); return false; } return true; });
          if (added.length) { let nm = `seen${round + 1}`; while (parts.some((p) => p.name === nm)) nm = `${nm}_`; parts.push({ name: nm, is: `added for what was not seen: ${off.map((f) => f.name).join(', ')}`, from: '', by: 'plan', node: t1[0], names: added, failing: [], shows: off.map((f) => f.name) }); }
          say('look', `mended for what was not seen (${off.map((f) => f.name).join(', ')}): ${plan.says || 'a change'}; ${added.length} piece(s) added`); }
        else say('look', `the mend for what was not seen not taken: ${why}`, false); }
      catch (x) { say('look', `asked to mend what was not seen: ${(x as Error).message.slice(0, 160)}`, false); }
      if (!taken) break;
      e = await showWhole(); l = await lookAt();
    }
    e = await showWhole();
  }
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
  // (6b. the recognition list: each feature held to a part that is in the build, by that part's pieces being in the whole;
  // a feature no part shows is unmet by its name; what the eye still did not see; the build's bound beside the size asked)
  if ((o.features ?? !!o.look) && !recog) unmet.push('no recognition list: what a person must see was not written, so nothing was held to it');
  if (recog) { cover(); builtSize = longestOf(whole);
    for (const f of recog.features) { const p = parts.find((q) => q.name === f.part);
      if (!p) { unmet.push(`feature with no part: ${featureLine(f)}`); continue; }
      const left = new Map<string, number>(); for (const nm of whole ? namesOf(whole) : []) left.set(nm, (left.get(nm) ?? 0) + 1);
      const miss = p.names.filter((nm) => { const n = left.get(nm) ?? 0; if (n > 0) { left.set(nm, n - 1); return false; } return true; }).length;
      if (!p.node || !p.names.length || miss) unmet.push(`feature not in the build: ${f.name}: its part ${p.name} ${!p.node || !p.names.length ? 'was not made' : `has ${miss} of its ${p.names.length} pieces missing from the whole`}`);
      if (f.seen && f.seen !== 'seen') unmet.push(`not seen: ${f.name}${f.seen === 'wrong' ? ' (wrong)' : ''}${f.note ? `: ${f.note}` : ''}`); }
    const off = sizeOff(builtSize, recog.longest); if (off) unmet.push(off);
    if (o.look && !looks) unmet.push('not looked at: no picture of the build could be taken or read');
    // (6c. the engineering check on the build as it now stands (the eye's mends may have changed it): what fails is unmet)
    const last = await engOn(board); if (last) { eng = last.eng; mass = last.mass; } if (eng) unmet.push(...eng.reasons.map((r) => `engineering: ${r}`)); }
  // (the design summary the answer ends with: envelope, mass, payload, the drivers and their margins, what was assumed)
  const reqOf = (n: string) => reqs.find((r) => r.name === n), design = recog ? `\nDesign: envelope ${builtSize ? metres(builtSize) : 'not measured'} on its longest side${recog.longest ? ` (asked about ${metres(recog.longest)})` : ''}; mass ${mass !== undefined ? `${qty(mass, 'kg')} (from the geometry)` : 'not measured'}; ${reqOf('payload') ? requirementLine(reqOf('payload')!) : reqOf('force') ? requirementLine(reqOf('force')!) : 'no payload or working force stated'}; ${reqOf('power') ? `power ${reqOf('power')!.value}; ` : ''}margins: ${eng?.margins.length ? eng.margins.map((m) => `${marginLine(m)}${m.ok ? '' : ' FAILS'}`).join('; ') : 'none held (no part has a requirement its components\' rows carry)'}${eng?.notes.length ? `; not checked: ${eng.notes.join('; ')}` : ''}; assumed: ${reqs.filter((r) => r.from === 'assumed').map((r) => `${r.name} ${r.value}${r.unit ? ` ${r.unit}` : ''}`).join(', ') || 'nothing'}.` : '';
  // (the whole kept for later when it passes and is more than one library block placed)
  const before = savedParts().find((x) => x.tags.includes('whole') && x.from === request);
  if (keep && !unmet.length && whole && before) { used(before.id); say('remember', `the whole as kept before for this request, ${before.id}: used ${before.uses + 1} time${before.uses ? 's' : ''}`); }
  else if (keep && !unmet.length && whole && (made().length > 1 || made().some((p) => p.by === 'plan' || p.by === 'split'))) {
    const f = await foldPart(board, 'whole', true);
    if (f?.node.inner) try { const s = remember({ name: request.slice(0, 60), says: `${request.slice(0, 200)}: ${made().map((p) => p.name).join(', ')}`, graph: f.node.inner, from: request, checked: { pieces: whole.pieces.length, groups: 1, failing: 0 }, tags: ['whole', ...made().map((p) => p.name)], offers: offersIn(whole).slice(0, 20) });
      if (!remembered.includes(s.id)) remembered.push(s.id); say('remember', `the whole kept for later as ${s.id}`); } catch (x) { say('remember', `the whole could not be kept (${(x as Error).message.slice(0, 120)})`, false); }
  }
  if (notReached.length) unmet.push(`the time budget (${Math.round(budget / 1000)} s) was spent: not reached: ${notReached.join(', ')}`);
  say('check', unmet.length ? `Not met: ${unmet.join('; ')}` : `Checked: ${made().length} part${made().length === 1 ? '' : 's'} in one thing of ${whole!.pieces.length} pieces, nothing failing`, !unmet.length);
  const how = (p: ComposePart) => (p.by === 'assembly' ? 'a library assembly' : p.by === 'remembered' ? `remembered, ${p.saved}` : p.by === 'starter' ? 'a starter board' : p.by === 'split' ? `split into ${p.children?.filter((c) => c.node).length ?? 0} parts` : 'one plan');
  board.title = request.replace(/^./, (c) => c.toUpperCase()).slice(0, 80);
  return done(`${unmet.length ? 'Built in part' : 'Built'}: ${request.slice(0, 120)}, from ${made().map((p) => `${p.name} (${how(p)}, ${p.names.length} pieces)`).join(', ')}${whole ? `; the whole ${whole.pieces.length} pieces${g === 1 ? ', one thing' : ''}` : ''}.${remembered.length ? ` Kept for later: ${remembered.join(', ')}.` : ''}${unmet.length ? `\nNot met: ${unmet.join('; ')}` : ''}${design}`);
}

/** An Ask by the Node SDK (the relay): the prompt's head before PROMPT_CUT one cached system block, its tail the message;
 *  each call's tokens added to `tokens`. Under Node, where ANTHROPIC_API_KEY is. */
export function sdkAsk(o: { model?: string; signal?: AbortSignal; tokens?: AgentRun['tokens'] } = {}): Ask {
  return async (prompt, tier, images, format) => {
    if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the relay runs under Node with it set (the environment\'s secrets); a page holds no keys');
    const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), k = prompt.indexOf(PROMPT_CUT);
    const head = k >= 0 ? prompt.slice(0, k) : '', tail = k >= 0 ? prompt.slice(k + PROMPT_CUT.length) : prompt;
    if (format) {
      // (one closed format: the call made with that schema forced (one strict tool, tool_choice on it), thinking off, a
      // small max_tokens; the reply read from the tool's input, never from text. The models that refuse a forced tool
      // (the claude-api skill, read 2026-11-10: Fable 5.1 and 5.2, Mythos, Opus 5.5, Sonnet 5.5) are given the one strict tool and auto.)
      const model = o.model ?? AGENT_MODEL, forced = !/(fable-5-[12]|mythos|opus-5-5|sonnet-5-5)/.test(model), said = forced ? tail : `${tail}\nAnswer by calling the tool ${format.name}.`;
      const tool = { name: format.name, description: format.says, strict: true, input_schema: format.schema } as unknown as Anthropic.Tool;
      const rf = await client.messages.create({ model, max_tokens: format.maxTokens, ...(head ? { system: cachedSystem(head) } : {}), tools: [tool], output_config: { effort: 'low' },
        ...(forced ? { thinking: { type: 'disabled' as const }, tool_choice: { type: 'tool' as const, name: format.name } } : { tool_choice: { type: 'auto' as const } }),
        messages: [{ role: 'user', content: images?.length ? [...images.map((png) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: Buffer.from(png).toString('base64') } })), { type: 'text' as const, text: said }] : said }] }, { signal: o.signal ?? AbortSignal.timeout(90_000) });
      if (o.tokens) { o.tokens.in += rf.usage.input_tokens; o.tokens.out += rf.usage.output_tokens; o.tokens.cached += rf.usage.cache_read_input_tokens ?? 0; o.tokens.written += rf.usage.cache_creation_input_tokens ?? 0; }
      const use = rf.content.find((c) => c.type === 'tool_use') as { input?: unknown } | undefined;
      if (rf.stop_reason === 'max_tokens') throw new FormatError(format.name, `the reply was cut at ${format.maxTokens} tokens`);
      if (!use || !use.input || typeof use.input !== 'object') throw new FormatError(format.name, `no ${format.name} in the reply (stop: ${rf.stop_reason})`);
      return use.input as Record<string, unknown>;
    }
    const r = await client.messages.create({ model: o.model ?? AGENT_MODEL, max_tokens: 12_000, ...(head ? { system: cachedSystem(head) } : {}), output_config: { effort: tier === 'quick' ? 'low' : 'medium' }, messages: [{ role: 'user', content: images?.length ? [...images.map((png) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: Buffer.from(png).toString('base64') } })), { type: 'text' as const, text: tail }] : tail }] }, { signal: o.signal ?? AbortSignal.timeout(90_000) });
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

/** The blocks a graph call may place (the format's enum): the operations of the space and the joints, the common pieces,
 *  the show and the variant, the blocks already on the board, and the library blocks its prompt names by their ids. */
function graphBlocks(b: Board, prompt: string): string[] {
  const base = [...LIBRARY.keys()].filter((id) => /^(room|mate)\./.test(id)), on = nodesOf(b).map((n) => b.nodes[n.id]!.block).filter((x): x is string => !!x && !!block(x));
  const named = [...prompt.slice(Math.max(0, prompt.indexOf(PROMPT_CUT))).matchAll(/\b((?:piece|seed|solid)\.[\w.-]+)/g)].map((m) => m[1]!.replace(/[.:]+$/, '')).filter((id) => block(id));
  return [...new Set([...base, 'space.show', 'variant', ...CORE_PIECES, ...on, ...named])].filter((id) => block(id)).slice(0, 120);
}
/** A graph the wall passed, as the plan this path runs: a build on an empty board; else a change (a node of the board
 *  named again: its settings set). */
export function planFromGraph(g: Graph, b: Board): AgentPlan {
  const wires = g.edges.map(([f, out, t, inp]) => `${f}.${out}>${t}.${inp}`), live = new Set(nodesOf(b).map((n) => n.id));
  if (!live.size) return { tool: 'build', input: { nodes: Object.fromEntries(g.nodes.map((n) => [n.id, { b: n.block, ...(Object.keys(n.set).length ? { s: n.set } : {}) }])), ...(wires.length ? { wires } : {}) }, says: '' };
  const add = g.nodes.filter((n) => !live.has(n.id) || g.remove.includes(n.id)), set = g.nodes.filter((n) => live.has(n.id) && !g.remove.includes(n.id) && Object.keys(n.set).length);
  return { tool: 'change', input: { ...(g.remove.length ? { remove: g.remove } : {}), ...(add.length ? { add: Object.fromEntries(add.map((n) => [n.id, { b: n.block, ...(Object.keys(n.set).length ? { s: n.set } : {}) }])) } : {}), ...(set.length ? { set: Object.fromEntries(set.map((n) => [n.id, n.set])) } : {}), ...(wires.length ? { wires } : {}) }, says: '' };
}
