// The stages of a build and the wall each reply meets (decision 0029, wave 14). The user's words: "have a texture agent
// a shaping agent all sorts of agents in the pipeline loop until confidence is reached ... instead of templates it knows
// how to build everything from scratch", and "it's an application so it can't break it and just start talking; it only
// has specific output formats". So: every call of the staged compose path (agent.ts composeStaged) answers in ONE closed
// format (features, split, graph, inspect), forced where the model is called (sdkAsk: one strict tool) and read from the
// tool's input, never from text; a graph reply is the board itself as text (nodes and edges) and is checked here, with no
// model, before it touches the board (applyGraph: the wall). Each stage is a specialist: its own few lines of rule, its
// own blocks, its own acceptance. No model is called here and nothing is run: agent.ts makes the calls and runs boards.
import { block, defaultsOf, portsOf, type BlockDef } from './blocks';
import { Engine, placeBlock, wire } from './dataflow';
import { edgesOf, type Board } from './boards';
import { sameFeature, type Feature } from './lookat';

// ---- the formats: what a call may answer, and nothing else --------------------------------------------------------------

/** A closed output format: its name (the forced tool's), one line of what it is, its JSON schema (strict: every object
 *  closed), and the most tokens a reply in it may take. */
export interface Format { name: 'features' | 'split' | 'graph' | 'inspect'; says: string; schema: Record<string, unknown>; maxTokens: number }
const obj = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({ type: 'object', properties, required, additionalProperties: false });
const arr = (items: unknown) => ({ type: 'array', items }), str = { type: 'string' }, num = { type: 'number' }, oneOf = (xs: readonly string[]) => ({ type: 'string', enum: [...xs] });

/** The ways a part goes onto another (a join's `how`): a face of what it goes onto (x the length, +x the front; y up; z
 *  across), or a moving join (over: it turns on a shaft line; through: a pin or shaft through both). */
export const HOWS = ['onto +y', 'onto -y', 'onto +x', 'onto -x', 'onto +z', 'onto -z', 'over', 'through'] as const;
export const STAGE_NAMES = ['shape', 'mechanism', 'engineering', 'detail', 'surface'] as const;
export type StageName = (typeof STAGE_NAMES)[number];
const NEED_KEYS = ['force_N', 'payload_kg', 'span_m', 'speed_m_s', 'torque_Nm', 'power_W'];

export const FORMATS = {
  features: (): Format => ({ name: 'features', says: 'What a person must see, the requirements as numbers, the envelope', maxTokens: 1200,
    schema: obj({ features: arr(obj({ name: str, where: str, size: str })), requirements: arr(obj({ what: str, value: { anyOf: [num, str] }, unit: str, from: oneOf(['request', 'assumed']) })), envelope_m: num }) }),
  split: (ids: readonly string[]): Format => ({ name: 'split', says: 'The parts, what each shows and starts from, its envelope, and how each joins', maxTokens: 1500,
    schema: obj({ parts: arr(obj({ name: str, is: str, shows: arr(str), from: oneOf([...ids, 'scratch']), envelope_m: arr(num), needs: obj(Object.fromEntries(NEED_KEYS.map((k) => [k, num])), []) })), joins: arr(obj({ part: str, how: oneOf(HOWS), to: str })) }) }),
  graph: (blocks: readonly string[]): Format => ({ name: 'graph', says: 'Nodes and edges of the board, and the nodes removed', maxTokens: 2500,
    schema: obj({ nodes: arr(obj({ id: str, block: oneOf(blocks), set: arr(obj({ key: str, value: { anyOf: [str, num, { type: 'boolean' }] } })) })), edges: arr(arr(str)), remove: arr(str) }) }),
  inspect: (): Format => ({ name: 'inspect', says: 'What the picture shows, scored, and what to upgrade', maxTokens: 900,
    schema: obj({ features: arr(obj({ name: str, verdict: oneOf(['seen', 'not seen', 'wrong']) })), scores: obj({ silhouette: num, proportion: num, mechanism: num, surface: num }), confidence: num, upgrades: arr(obj({ stage: oneOf(STAGE_NAMES), part: str, do: str })) }) }),
};

/** A reply where a format was asked that is not that format's object: a string (prose), nothing, a list. */
export class FormatError extends Error { constructor(readonly format: string, why: string) { super(`${format}: ${why}`); } }
/** What the run counts of its replies: calls by format, the wall's rejects by kind, prose where a format was asked,
 *  retries, and the tokens where the ask reports them. */
export interface Replies { calls: Record<string, number>; rejects: Record<string, number>; prose: number; retried: number }
export const newReplies = (): Replies => ({ calls: {}, rejects: {}, prose: 0, retried: 0 });
const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

/** A format's reply held to being its object (the schema is forced where the model is called; here only: an object, never
 *  text). A scripted ask returns the object itself. */
export function replyOf(format: Format, r: unknown, replies?: Replies): Record<string, unknown> {
  if (replies) bump(replies.calls, format.name);
  if (typeof r === 'string') { if (replies) replies.prose++; throw new FormatError(format.name, 'text where the format was asked (a reply is the format\'s object, read from the forced tool\'s input, never prose)'); }
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new FormatError(format.name, 'no object in the reply');
  return r as Record<string, unknown>;
}
/** For an ask that can only return text (the viewer's own account on claude.ai: no forced tool there): the format's schema
 *  sent with the prompt, and the first JSON object of the reply (fenced or wrapped in words) read as the format's object.
 *  `read` is agent.ts firstJson. Where the model can be forced (sdkAsk), this is not used. */
export const textFormat = (format: Format): string => `\n\nReply with ONE JSON object of the format "${format.name}" and nothing else. Its schema: ${JSON.stringify(format.schema)}`;

// ---- the graph format, and the wall ----------------------------------------------------------------------------------------

/** A graph reply as the app holds it: nodes (id, block, settings), edges (from, its output, to, its input), removes. */
export interface Graph { nodes: { id: string; block: string; set: Record<string, unknown> }[]; edges: [string, string, string, string][]; remove: string[] }
/** A graph reply read from its object: settings as a record or as the format's {key, value} list. */
export function graphOf(o: Record<string, unknown>): Graph {
  const nodes = (Array.isArray(o.nodes) ? o.nodes : []).map((n) => { const x = (n ?? {}) as Record<string, unknown>, s = x.set;
    const set: Record<string, unknown> = Array.isArray(s) ? Object.fromEntries(s.map((kv) => [String((kv as { key?: unknown })?.key ?? ''), (kv as { value?: unknown })?.value])) : s && typeof s === 'object' ? { ...(s as Record<string, unknown>) } : {};
    return { id: String(x.id ?? ''), block: String(x.block ?? ''), set }; });
  const edges = (Array.isArray(o.edges) ? o.edges : []).map((e) => (Array.isArray(e) ? e.map(String) : [String(e)]) as [string, string, string, string]);
  return { nodes, edges, remove: (Array.isArray(o.remove) ? o.remove : []).map(String) };
}
/** What a graph may touch: the blocks offered to this call (none given: any), the nodes that are the stage's own (it may
 *  remove them, set them, wire into them); every other node on the board may only be read from. */
export interface Wall { offered?: ReadonlySet<string>; own: ReadonlySet<string> }
export interface Applied { board: Board; rejects: string[]; kinds: string[] }
const SINK = new Set(['space.show', 'view.show']);
/** Why a wire may not be made (agent.ts wireRefused: the same check hand wiring uses), given by the caller so this file
 *  imports nothing of agent.ts. */
export type WireCheck = (board: Board, from: string, out: string, to: string, inp: string) => string | undefined;

/** The wall: a graph checked and applied on a copy of the board, with no model. Every block id exists and was offered;
 *  every setting key is one of that block's (its settings, its inputs) and its value of the setting's type or choices;
 *  ids are new or the stage's own; removes are the stage's own; every edge's ports exist and their types connect (the
 *  check wiring uses); an edge into a node that is not the stage's own only takes the place of a wire a removed node had
 *  there. One line per fault, in the format's own terms ("edges[2]: no input 'hsot' on room.over; inputs: host, sleeve"),
 *  never prose. No rejects: `board` is the board with the graph applied, unchanged; else it is the board as given. */
export function applyGraph(g: Graph, board0: Board, wall: Wall, wireRefused: WireCheck): Applied {
  const board = JSON.parse(JSON.stringify(board0)) as Board, rejects: string[] = [], kinds: string[] = [];
  const no = (kind: string, line: string) => { rejects.push(line); kinds.push(kind); }, live = (id: string) => !!board.nodes[id] && !board.nodes[id]!.deleted;
  const own = (id: string) => wall.own.has(id) || SINK.has(board0.nodes[id]?.block ?? ''), freed = new Set<string>(), fresh = new Set<string>();
  g.remove.forEach((id, k) => {
    if (!live(id)) return no('remove', `remove[${k}]: no node '${id}'`);
    if (!own(id)) return no('remove', `remove[${k}]: '${id}' is not this stage's node; yours: ${[...wall.own].join(', ') || 'none'}`);
    for (const e of edgesOf(board)) { if (e.from === id) freed.add(`${e.to}.${e.in}`); if (e.from === id || e.to === id) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; }
    board.nodes[id] = { ...board.nodes[id]!, deleted: true }; });
  g.nodes.forEach((n, k) => {
    if (!/^\w+$/.test(n.id)) return no('id', `nodes[${k}].id: '${n.id}' (letters, digits, _ only)`);
    const d = block(n.block); if (!d) return no('block', `nodes[${k}].block: no block '${n.block}'`);
    if (wall.offered && !wall.offered.has(n.block)) return no('block', `nodes[${k}].block: '${n.block}' is not offered to this call; offered: ${[...wall.offered].join(', ')}`);
    const there = live(n.id);
    if (there && (!own(n.id) || board.nodes[n.id]!.block !== n.block)) return no('id', `nodes[${k}].id: '${n.id}' is on the board${own(n.id) ? ` as ${board.nodes[n.id]!.block}` : ' and not this stage\'s'}; a new id`);
    const set = settingsOf(d, n.set, `nodes[${k}].set`, no);
    if (there) board.nodes[n.id] = { ...board.nodes[n.id]!, set: { ...(board.nodes[n.id]!.set ?? {}), ...set } };
    else { if (board.nodes[n.id]) delete board.nodes[n.id]; placeBlock(board, d.id, 0, 0, { ...defaultsOf(d), ...set }, n.id); fresh.add(n.id); } });
  g.edges.forEach((e, k) => {
    if (e.length !== 4) return no('edge', `edges[${k}]: ${e.length} items; [from id, output, to id, input]`);
    const [from, out, to, inp] = e;
    if (!live(from)) return no('edge', `edges[${k}]: no node '${from}'`); if (!live(to)) return no('edge', `edges[${k}]: no node '${to}'`);
    const fd = board.nodes[from]!.block, td = board.nodes[to]!.block;
    const outs = portNames(board, from, 'outputs'), ins = portNames(board, to, 'inputs');
    if (outs.length && !outs.includes(out)) return no('port', `edges[${k}]: no output '${out}' on ${fd ?? from}; outputs: ${outs.join(', ')}`);
    if (!SINK.has(td ?? '') && !ins.includes(inp)) return no('port', `edges[${k}]: no input '${inp}' on ${td ?? to}; inputs: ${ins.join(', ') || 'none'}`);
    if (!fresh.has(to) && !own(to) && !freed.has(`${to}.${inp}`)) return no('edge', `edges[${k}]: '${to}' is not this stage's node; its input '${inp}' takes a wire only in place of one a removed node of yours had there`);
    const why = wireRefused(board, from, out, to, inp); if (why) return no('port', `edges[${k}]: ${why}`);
    if (why === undefined) { try { wire(board, from, out, to, inp); } catch (x) { no('port', `edges[${k}]: ${(x as Error).message}`); } } });
  return rejects.length ? { board: board0, rejects, kinds } : { board, rejects, kinds };
}
const portNames = (board: Board, id: string, side: 'inputs' | 'outputs'): string[] => new Engine(board).ports(id)[side].map((p) => p.name);
/** A node's settings held to its block: each key one of its settings or inputs, each value of the setting's type (a
 *  number, one of its choices, true or false; text takes anything said as text). */
function settingsOf(d: BlockDef, set: Record<string, unknown>, at: string, no: (kind: string, line: string) => void): Record<string, unknown> {
  const out: Record<string, unknown> = {}, ss = d.settings ?? [], ins = portsOf(d, defaultsOf(d)).inputs.filter((p) => p.type !== 'block' && p.type !== 'assembly');
  for (const [k, v] of Object.entries(set)) { const s = ss.find((x) => x.key === k), p = ins.find((x) => x.name === k);
    if (!s && !p) { no('key', `${at}: no setting '${k}' on ${d.id}; settings: ${[...ss.map((x) => x.key), ...ins.map((x) => x.name)].join(', ') || 'none'}`); continue; }
    const type = s?.type ?? (p!.type === 'number' || p!.type === 'integer' ? 'number' : 'text'), cs = s?.choices?.map(String);
    if (type === 'number') { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN; if (!Number.isFinite(n)) { no('value', `${at}.${k}: a number, not ${JSON.stringify(v)}`); continue; } out[k] = n; }
    else if (type === 'boolean') { if (typeof v !== 'boolean') { no('value', `${at}.${k}: true or false, not ${JSON.stringify(v)}`); continue; } out[k] = v; }
    else if (cs?.length && type === 'choice') { const c = cs.find((x) => x === String(v)); if (c === undefined) { no('value', `${at}.${k}: ${JSON.stringify(v)} is not one of ${cs.slice(0, 24).join(', ')}${cs.length > 24 ? ', …' : ''}`); continue; } out[k] = typeof s!.choices![cs.indexOf(c)] === 'number' ? Number(c) : c; }
    else out[k] = typeof v === 'string' ? v : String(v); }
  return out;
}
/** A board said for a graph call: each node an id, its block and what was set; each wire; the stage's own marked. */
export function boardText(b: Board, own: ReadonlySet<string> = new Set(), room = 3000): string {
  const ns = Object.entries(b.nodes).filter(([, n]) => !n.deleted).map(([id, n]) => { const d = n.block ? block(n.block) : undefined, def = d ? defaultsOf(d) : {};
    const set = Object.entries(n.set ?? {}).filter(([k, v]) => d && JSON.stringify(def[k]) !== JSON.stringify(v) && v !== '' && v !== 0);
    return `${id}${own.has(id) ? '*' : ''} ${n.block ?? 'part'}${set.length ? ` ${JSON.stringify(Object.fromEntries(set))}` : ''}`; });
  const es = edgesOf(b).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`);
  return `nodes (* yours):\n${ns.join('\n')}\nedges: ${es.join(' ')}`.slice(0, room);
}

// ---- the stages: each a specialist --------------------------------------------------------------------------------------

/** A stage: its name, its rule (a few lines; the cards of its blocks are sent with it, nothing else), and the blocks its
 *  graphs may place (the library parts found for the part in hand are offered with them, call by call). */
export interface Stage { name: StageName; rule: string; blocks: string[] }
const AXES = 'Axes: x the length (+x the front), y up, z across. Sizes in mm.';
export const STAGES: Record<StageName, Stage> = {
  shape: { name: 'shape', blocks: ['room.make', 'room.onto', 'room.stack', 'room.turn', 'room.through', 'room.over', 'room.ring', 'room.between'],
    rule: `SHAPE: build ONE part's form from scratch. Reply: graph. ${AXES}
- room.make: one solid each, named for what it is ("cab roof", "track belt"); 3 to 12 solids, every sub-form a person would see its own solid (box, rod, tube, cone, sphere, lathe, section prism, loft), never one box for the whole part.
- join them: room.onto (host, child, face: the host's face the child goes against; end lo|hi to sit low or high on it), room.stack, room.turn to lay a rod along x or z, room.through/room.over on a line the host offers. Each operation's block feeds the next; ONE last block holds every solid.
- a library part offered below (a wheel, a bearing, a cylinder, a motor, a section) before a drawn solid.
- fill the envelope given (its x, y, z); materials by what each solid is (mat: steel-low, al-6061, nbr rubber, glass, abs, ...). No space.show.`
  },
  mechanism: { name: 'mechanism', blocks: ['room.over', 'room.through', 'room.onto', 'room.make', 'room.turn', 'room.key'],
    rule: `MECHANISM: make ONE part move on what holds it. Reply: graph. ${AXES}
- remove your fixed join (marked *), and join the part again so it turns or pivots: room.over (host: what offers the line, sleeve: what turns on it; line: a line the host offers, as listed; fit slide or clear) or room.through (host, passer: a pin or axle through a line of the host, fit clear).
- no line offered where it must turn: room.make a rod (an axle, a pin) and put it room.onto or room.through the host first; then room.over the part on the rod's axis.
- wire your last operation's block where the removed join's block went. Touch no other node.`
  },
  engineering: { name: 'engineering', blocks: [],
    rule: `ENGINEERING: make ONE part strong enough. Reply: graph. Set the part's node (marked *) again with the same block and larger size settings (a larger bore, frame, rating: only values its card lists), nothing else. edges [] and remove [] unless a component is replaced by a larger of its kind wired the same way.`
  },
  detail: { name: 'detail', blocks: ['mate.bolted', 'room.through', 'room.over', 'room.make', 'piece.bolt', 'piece.nut', 'piece.washer', 'piece.bearing'],
    rule: `DETAIL: fasten ONE joint. Reply: graph. ${AXES}
- a structural joint of two materials that are not welded: mate.bolted (held: the joined block; line: a hole line it offers), or a piece.bolt room.through a hole line with a piece.nut room.over its shank.
- a pivot with no pin: a pin (room.make rod, or a library pin) room.through the pivot's line, fit clear, a bushing (room.make tube) or piece.bearing room.over it.
- your new operation takes the block your removed node (marked *) gave, and gives its block where that went. Touch no other node.`
  },
  surface: { name: 'surface', blocks: ['variant'],
    rule: `SURFACE: give every piece the look of the real machine. Reply: graph of variant nodes only; edges [] and remove [] (the app chains them between the whole and its show).
- one variant per look: set path (a pattern of the piece names it covers, "cab|hood|body"), color (#rrggbb as the real machine is: painted body colours, black rubber #1c1c1c, glass #9fc4d8, bare aluminium left as it is), finish (paint for painted steel, polished, brushed, ...), mat only where a piece's material is wrong for what it is.
- every piece listed as grey is covered by a path, each once; a piece that is bare metal on the real machine is left out.`
  },
};
/** The features call's rule. */
export const FEATURES_RULE = `FEATURES: what a person must SEE to say "that is one", before anything is built. Reply: features.
- features: 5 to 8 visible things, each name one short word of its own; where: its place on the whole (in front low, on top toward the rear, one each side); size: its shape and its size beside the rest (as long as the body, a third of its height).
- requirements: an engineered working machine, never a toy: each of envelope (m), payload (kg) or force (N), speed (m/s), duty (%), power (electric, hydraulic, pneumatic or engine), environment, once; from "request" where the words give it, else "assumed" (typical for such a machine at this size).
- envelope_m: the whole's longest side in metres from the request's size words (giant: several; industrial: 1 to several; personal or ridden: 1 to 2.5; RC means radio controlled, a working machine of a metre or more unless miniature or model is said; miniature 0.1 to 0.3; a stated size as stated).`;
/** The split call's rule. */
export const SPLIT_STAGE_RULE = `SPLIT: the parts of what is asked. Reply: split. Axes: x the length (+x the front), y up, z across.
- parts: 2 to 6 things a person names, each name one short word of its own; is: what it is and its form, in a few words; shows: the features it makes visible (every feature shown by a part); a thing on both sides is two parts (track_left, track_right).
- from: "scratch" (built from primitives by the shape stage) unless a menu entry IS that part at about its size (the menu gives each entry's size); a whole-machine assembly is never a part of a different machine.
- envelope_m: the part's own size [x, y, z] in metres, so the parts together make the whole at the envelope asked, in the proportions the features say.
- needs: the requirement that falls on the part (force_N, payload_kg, span_m, speed_m_s, torque_Nm, power_W), only those that do.
- joins: every part but the first (the body everything goes onto) once: how "onto ±x|±y|±z" the face of \`to\` it sits against, "over" where it turns on \`to\` (a wheel, a roller, a rotor), "through" where it pivots on a pin through \`to\` (a boom, an arm, a leg, a blade's push arms).`;
/** The inspector's rule. */
export const INSPECT_RULE = `INSPECT: the picture is what was built, as the 3D view shows it. Reply: inspect. Judge only what the picture shows.
- features: every listed feature once by its name: seen (plainly there, in its place, about its proportion), not seen, or wrong (something is there a person would not take for it).
- scores 0 to 1: silhouette (the outline reads as the thing asked), proportion (the parts' sizes beside each other), mechanism (what should move is visibly jointed: wheels on axles, a boom on a pivot), surface (colours and materials read as the real machine, not bare grey).
- confidence 0 to 1: a person shown this picture says "that is a <the request>".
- upgrades: at most 3, the worst first: the stage that owns it (shape: a form missing, wrong or out of proportion; mechanism; engineering; detail; surface: colour or material), the part by its name as listed, do: what to change in 12 words or fewer.`;

/** Words of things that move on what holds them: a part or feature said with one is expected to have a joint. */
export const MOVES = /\b(wheels?|tracks?|treads?|rollers?|sprockets?|propellers?|props?|rotors?|fans?|booms?|arms?|legs?|jaws?|claws?|grippers?|fingers?|hinges?|pivots?|turrets?|doors?|lids?|buckets?|forks?|blades?|cranks?|axles?|gears?|pulleys?|joints?|casters?|castors?|turntables?|swivels?)\b/i;
/** Does this part move on its host: its join says so (over, through), or its words do. */
export const moves = (p: { name: string; is: string }, how?: string): boolean => how === 'over' || how === 'through' || MOVES.test(`${p.name.replace(/_/g, ' ')} ${p.is}`);

/** The shape stage's acceptance: it ran with nothing failing, made one thing, of more than one solid, at about the
 *  envelope asked (its longest side within 2 times). Each reason a terse line the stage is asked again with. */
export function acceptShape(x: { failing: readonly string[]; pieces: number; groups: number; loose?: string; size?: readonly number[]; envelope?: readonly number[]; library?: boolean }): string[] {
  const out = x.failing.slice(0, 4).map((l) => `failed: ${l.slice(0, 200)}`);
  if (!x.pieces) return [...out, 'no block: the graph made no solid (room.make nodes joined by operations)'];
  if (x.groups > 1) out.push(`${x.groups} groups, not one thing: ${x.loose ?? 'some solids touch nothing of the rest'}; join each by room.onto, room.stack, room.over or room.through into the last block`);
  if (x.pieces < 2 && !x.library) out.push('1 solid: a part is 3 to 12 solids, each sub-form a person would see its own');
  const L = x.size ? Math.max(...x.size) : 0, E = x.envelope?.length ? Math.max(...x.envelope) : 0;
  if (L && E && (L > 2 * E || L < E / 2)) out.push(`size: ${x.size!.map((v) => Math.round(v * 1000)).join(' x ')} mm built, envelope ${x.envelope!.map((v) => Math.round(v * 1000)).join(' x ')} mm (x y z): ${L > E ? 'smaller' : 'larger'} sizes`);
  return out;
}
/** The mechanism stage's acceptance: each part expected to move has a joint (sim.ts motionOf) with one of its pieces on
 *  it, and the functional gate (aitools.ts working) holds. `joints`: each joint's two bodies as piece indices. */
export function acceptMechanism(x: { expected: readonly string[]; pieces: ReadonlyMap<string, readonly number[]>; joints: readonly { a: readonly number[]; b: readonly number[] }[]; working?: readonly string[] }): string[] {
  const out: string[] = [];
  for (const p of x.expected) { const mine = new Set(x.pieces.get(p) ?? []); if (!mine.size) continue;
    if (!x.joints.some((j) => j.a.some((i) => mine.has(i)) || j.b.some((i) => mine.has(i)))) out.push(`${p}: no joint: it is fixed to what holds it; join it by room.over on a shaft line (fit slide or clear) or on a pin room.through both`); }
  return [...out, ...(x.working ?? []).map((r) => `not working: ${r.slice(0, 200)}`)];
}
/** Metals that weld to their own kind (matter.ts ids by their family): a structural joint of two of one family in contact
 *  is stated as welded by this rule, never by a model; any other pair needs a fastener. */
const WELDS: [RegExp, string][] = [[/^steel-|^stainless-/, 'steel'], [/^al-/, 'aluminium']];
export const weldOf = (a: string, b: string): string | undefined => { const fa = WELDS.find(([re]) => re.test(a)), fb = WELDS.find(([re]) => re.test(b)); return fa && fb && fa[1] === fb[1] ? `${a} to ${b}: fillet welded (by rule: both ${fa[1]})` : undefined; };
const FASTENER = /\b(bolt|screw|nut|rivet|pin|stud|clamp|key)\b/i;
/** The detail stage's acceptance: each pivot has a pin (a joint made on a piece: a shaft, an axle, a pin), each structural
 *  joint a fastener among the pieces at it or a weld stated by rule. */
export function acceptDetail(x: { pivots: readonly { part: string; by: readonly string[] }[]; joints: readonly { part: string; to: string; mats: readonly [string, string]; pieces: readonly string[] }[] }): { reasons: string[]; welds: string[] } {
  const reasons: string[] = [], welds: string[] = [];
  for (const p of x.pivots) if (!p.by.length) reasons.push(`${p.part}: its pivot has no pin`);
  for (const j of x.joints) { if (j.pieces.some((n) => FASTENER.test(n))) continue; const w = weldOf(j.mats[0], j.mats[1]);
    if (w) welds.push(`${j.part} to ${j.to}: ${w}`); else reasons.push(`${j.part} to ${j.to}: ${j.mats[0]} to ${j.mats[1]}, no fastener and not a weldable pair`); }
  return { reasons, welds };
}
/** Materials that read as what they are with no coat (a reason to leave a piece as it is): the app's default grey is a
 *  bare low-carbon or alloy steel, or a plain plastic, with no colour of its own. */
const GREY = /^(steel-low|steel-alloy|abs|pla|petg|cast-iron)$/;
/** The surface stage's acceptance: no piece left the default grey without a reason. A piece is covered by a variant whose
 *  path finds its name and gives a colour or a material; or it has a colour of its own (a bought part's); or its
 *  material reads as itself (aluminium, brass, copper, glass, rubber). The names left grey, each once. */
export function acceptSurface(pieces: readonly { name: string; mat: string; color?: number }[], variants: readonly { path?: string; color?: string; mat?: string }[]): string[] {
  const res = variants.filter((v) => v.color || v.mat).map((v) => { try { return v.path ? new RegExp(v.path, 'i') : /./; } catch { return /$^/; } });
  return [...new Set(pieces.filter((p) => p.color === undefined && GREY.test(p.mat) && !res.some((re) => re.test(p.name))).map((p) => p.name))];
}

// ---- the loop: the inspector's word, and the stage that owns it ---------------------------------------------------------

/** What the inspector said (the `inspect` format, held to the recognition list): every feature once; scores and
 *  confidence within 0 to 1; upgrades with a stage of ours. */
export interface Inspected { features: { name: string; verdict: 'seen' | 'not seen' | 'wrong' }[]; scores: Record<'silhouette' | 'proportion' | 'mechanism' | 'surface', number>; confidence: number; upgrades: { stage: StageName; part: string; do: string }[] }
const unit = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0; };
export function inspectedOf(o: Record<string, unknown>, features: readonly Feature[]): Inspected {
  const said = (Array.isArray(o.features) ? o.features : []).map((f) => (f ?? {}) as Record<string, unknown>), sc = (o.scores ?? {}) as Record<string, unknown>;
  const fs = features.map((f) => { const x = said.find((s) => sameFeature(String(s.name ?? ''), f.name)), v = String(x?.verdict ?? x?.seen ?? '').toLowerCase().trim(); return { name: f.name, verdict: (v === 'seen' ? 'seen' : v === 'wrong' ? 'wrong' : 'not seen') as Inspected['features'][number]['verdict'] }; });
  // (the confidence is never more than the share of the list seen: a wrong one half, one not seen nothing)
  const share = fs.length ? fs.reduce((s, f) => s + (f.verdict === 'seen' ? 1 : f.verdict === 'wrong' ? 0.5 : 0), 0) / fs.length : 0;
  const ups = (Array.isArray(o.upgrades) ? o.upgrades : []).map((u) => (u ?? {}) as Record<string, unknown>).filter((u) => (STAGE_NAMES as readonly string[]).includes(String(u.stage))).slice(0, 3).map((u) => ({ stage: String(u.stage) as StageName, part: String(u.part ?? '').slice(0, 60), do: String(u.do ?? '').slice(0, 160) }));
  return { features: fs, scores: { silhouette: unit(sc.silhouette), proportion: unit(sc.proportion), mechanism: unit(sc.mechanism), surface: unit(sc.surface) }, confidence: Math.min(unit(o.confidence), share), upgrades: ups };
}
const SCORE_STAGE: Record<keyof Inspected['scores'], StageName> = { silhouette: 'shape', proportion: 'shape', mechanism: 'mechanism', surface: 'surface' };
/** The stage that owns what the inspector found worst, the part it runs on again and the inspector's words: the first
 *  feature not seen or wrong goes back to shape on the part that shows it (none shows it: a new part of that name); else
 *  the lowest score names its stage, with the inspector's upgrade for that stage where it gave one. Undefined: nothing
 *  to send back. */
export function ownerOf(i: Inspected, features: readonly Feature[]): { stage: StageName; part?: string; feature?: string; words: string } | undefined {
  const off = i.features.find((f) => f.verdict !== 'seen');
  if (off) { const f = features.find((x) => x.name === off.name), up = i.upgrades.find((u) => u.stage === 'shape' && (sameFeature(u.part, off.name) || (f?.part && sameFeature(u.part, f.part)))) ?? i.upgrades.find((u) => u.stage === 'shape');
    return { stage: 'shape', ...(f?.part ? { part: f.part } : {}), feature: off.name, words: `${off.verdict}: ${off.name}${f ? `: ${f.is}${f.where ? ` (${f.where})` : ''}` : ''}${up ? `; ${up.do}` : ''}` }; }
  const low = (Object.keys(i.scores) as (keyof Inspected['scores'])[]).reduce((a, b) => (i.scores[b] < i.scores[a] ? b : a));
  if (i.scores[low] >= 1 && !i.upgrades.length) return undefined;
  const stage = SCORE_STAGE[low], up = i.upgrades.find((u) => u.stage === stage) ?? i.upgrades[0];
  return { stage: up && !i.upgrades.some((u) => u.stage === stage) ? up.stage : stage, ...(up?.part ? { part: up.part } : {}), words: `${low} ${i.scores[low]}${up ? `; ${up.do}` : ''}` };
}
/** The face of the whole a feature's place words say ("in front, low": +x): for a part made for a feature no part showed. */
export const faceOf = (where: string): string => (/\b(front|ahead|nose)\b/i.test(where) ? 'onto +x' : /\b(rear|back|behind|tail)\b/i.test(where) ? 'onto -x' : /\b(under|below|beneath|bottom)\b/i.test(where) ? 'onto -y' : /\b(side|left|right|beside)\b/i.test(where) ? 'onto +z' : 'onto +y');

// ---- scale on the menu -----------------------------------------------------------------------------------------------------

const SIZE_KEY = /length|width|height|span|reach|size|scale|diameter|radius|wheelbase|track|long|tall|wide|deck|stroke|bore/i;
/** The settings and inputs of a block that change its size, by their keys and labels (numbers only): what a chosen
 *  block is scaled by to meet a part's envelope, and what the menu names beside its size. */
export function sizeKeys(d: BlockDef): { key: string; value: number }[] {
  const def = defaultsOf(d), out: { key: string; value: number }[] = [];
  for (const s of d.settings ?? []) if (s.type === 'number' && SIZE_KEY.test(`${s.key} ${s.label ?? ''}`) && typeof def[s.key] === 'number' && (def[s.key] as number) > 0) out.push({ key: s.key, value: def[s.key] as number });
  for (const p of portsOf(d, def).inputs) if ((p.type === 'number' || p.type === 'integer') && SIZE_KEY.test(`${p.name} ${p.label ?? ''}`) && typeof p.default === 'number' && p.default > 0 && !out.some((x) => x.key === p.name)) out.push({ key: p.name, value: p.default });
  return out;
}
/** A block's size said for the menu: its bound at its defaults (x by y by z, m) and what changes it. */
export const sizeLine = (size: readonly number[] | undefined, keys: readonly { key: string }[]): string => (size ? ` [${size.map((v) => +v.toPrecision(2)).join(' x ')} m at its defaults${keys.length ? `; sized by ${keys.slice(0, 4).map((k) => k.key).join(', ')}` : '; one size'}]` : '');
/** Is a block of this size taken for a part of that envelope: its longest side within 2 times the envelope's. */
export function sizeFits(size: readonly number[] | undefined, envelope: readonly number[] | undefined): { ok: boolean; k: number } {
  const L = size?.length ? Math.max(...size) : 0, E = envelope?.length ? Math.max(...envelope) : 0; if (!L || !E) return { ok: true, k: 1 };
  return { ok: L <= 2 * E && L >= E / 2, k: E / L };
}
