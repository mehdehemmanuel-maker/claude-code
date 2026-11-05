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
import { LIBRARY, block, defaultsOf, portsOf, register, type BlockDef, type PortDef, type Type } from './blocks';
import { Engine, collapse, emptyBoard, groupBlock, makeBlock, placeBlock, wire } from './dataflow';
// (navigation and the starter boards are loaded when the agent runs, not when the library does: imported at the top they
// change the order the library's modules start in, and a worker that loads the whole library then fails to start)
import type { Board } from './boards';
import { edgesOf, nodesOf } from './boards';
import { certificatesOf, check, diffOf, type Certificate, type Verdict } from './certify';

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
  const ps = portsOf(d, defaultsOf(d)), port = (p: PortDef) => `${p.name}:${p.type}${p.unit ? `(${p.unit})` : ''}${p.optional ? '?' : ''}`;
  const sets = (d.settings ?? []).map((x) => `${x.key}=${brief(x.default, 30)}${x.choices ? ` [${x.choices.slice(0, 8).join('|')}${x.choices.length > 8 ? '|…' : ''}]` : ''}`);
  return `${d.id}: ${d.name} | in: ${ps.inputs.map(port).join(', ') || '-'} | out: ${ps.outputs.map(port).join(', ')} | set: ${sets.join('; ') || '-'} | ${(d.says ?? '').slice(0, 160)}`;
}

/** The agent's tools, each answering in as few words as will do (docs/FOR-AI.md says how they are used). */
const plan = { nodes: { type: 'object', description: '{name:{"b":blockId,"s":{settings}}}' }, wires: { type: 'array', items: { type: 'string' }, description: '"a.out>b.in"' } };
const TOOLS: Anthropic.Tool[] = [
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
const guideOf = async (): Promise<string> => { if (guide) return guide; const { readFileSync } = await import(/* @vite-ignore */ 'node:fs'); return (guide = `${readFileSync(new URL('../../docs/FOR-AI.md', import.meta.url), 'utf8')}\n\n${piecesCard()}`); };
/** The model the AI in the app runs on unless more is asked: the cheapest (its node's setting lists the others). */
export const AGENT_MODEL = 'claude-haiku-5-5';

export interface AgentStep { tool: string; input: unknown; result: string; ms: number; /** the tool threw: its result is the error */ failed?: true;
  /** the result's refusals and failed nodes, each line whole: kept apart from the result, which is cut to 300 characters
   *  (a failure past the cut was lost before: the evaluator, 2026-11-01) */ alerts?: string[] }
/** A tool call as the run keeps it: its result cut short for the record, its refusals and failures kept whole. */
export function stepOf(tool: string, input: unknown, out: string, ms: number, failed = false): AgentStep {
  const alerts = out.split('\n').filter((l) => l.startsWith('! ') || /^\S+ (failed|error): /.test(l)).map((l) => l.slice(0, 300));
  return { tool, input, result: out.slice(0, 300), ms, ...(failed ? { failed: true as const } : {}), ...(alerts.length ? { alerts } : {}) };
}
/** A block the agent folded and saved: enough to register it again anywhere (a page keeps it with the blocks you saved). */
export interface AgentBlock { id: string; name: string; says: string; domains: string[]; graph: Board }
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
      else { const f = /^(\S+) (failed|error): (.*)$/.exec(l); if (f) out.push({ step: k + 1, tool: s.tool, what: `node ${f[1]} failed: ${f[3]!.slice(0, 160)}`, ...caught('node failed') }); }
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
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), system = await guideOf();
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
  const [{ search }, { starterBoards }] = await Promise.all([import('./navigate'), import('./starters')]), made: AgentBlock[] = [];
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
      if (bad) { out.push(`${id} ${st?.status ?? '?'}: ${(st?.error ?? '').slice(0, 160)}`); continue; }
      out.push(`${id} ok ${Object.entries(st!.out ?? {}).filter(([k]) => k !== 'says').slice(0, 6).map(([k, v]) => `${k}=${brief(v, 50)}`).join(' ')}`); }
    return out.length > 40 ? [...out.slice(0, 40), `… and ${out.length - 40} more lines`] : out;
  };
  /** What a plan's `s` may give a block: its settings, and the value of any input left unwired (as the page sets it). */
  const keysOf = (d: BlockDef) => new Set([...(d.settings ?? []).map((x) => x.key), ...portsOf(d, defaultsOf(d)).inputs.map((p) => p.name)]);
  /** Nodes placed on the board from a plan's names, each block's settings checked against it: what was wrong, said. */
  const place = (given: unknown, bad: string[]): string[] => {
    // (nodes sent as text are read as JSON; anything but an object of named nodes is refused in one line, not one a character)
    let nodes = given; if (typeof nodes === 'string') { try { nodes = JSON.parse(nodes); } catch { /* said below */ } }
    if (!nodes || typeof nodes !== 'object' || Array.isArray(nodes)) { if (given !== undefined) bad.push('nodes: write them as an object, {"name": {"b": "block id", "s": {…}}}'); return []; }
    for (const [nm, n] of Object.entries(nodes as Record<string, { b?: string; s?: Record<string, unknown> }>)) { const d = block(String(n.b)); if (!d) { bad.push(`${nm}: no block "${n.b}"`); continue; }
      const keys = keysOf(d), wrong = Object.keys(n.s ?? {}).filter((k) => !keys.has(k)); if (wrong.length) bad.push(`${nm}: ${d.id} has no setting or input ${wrong.join(', ')} (it has ${[...keys].join(', ') || 'none'})`);
      placeBlock(board, d.id, 0, 0, { ...defaultsOf(d), ...Object.fromEntries(Object.entries(n.s ?? {}).filter(([k]) => keys.has(k))) }, nm); board.nodes[nm]!.label = nm; }
    return Object.keys(nodes).filter((nm) => board.nodes[nm]);
  };
  const wireAll = (ws: string[], bad: string[]) => { for (const w of ws) { const m = /^(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)$/.exec(String(w).trim()); if (!m) { bad.push(`wire "${w}": write it a.out>b.in`); continue; } try { wire(board, m[1]!, m[2]!, m[3]!, m[4]!); } catch (e) { bad.push(`wire ${w}: ${(e as Error).message}`); } } };
  const doTool = async (name: string, a: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'find': return search(String(a.q ?? ''), 10).map((f) => (f.board ? `board "${f.board}" | ${f.says.slice(0, 90)}` : `${f.add?.block ?? f.id}${f.add?.set ? ` ${JSON.stringify(f.add.set)}` : ''} | ${f.name} | ${f.says.slice(0, 90)}`)).join('\n') || 'nothing matches';
      case 'card': { const d = block(String(a.id)); if (!d) throw new Error(`no block "${a.id}"`); return cardOf(d); }
      case 'build': { const bad: string[] = []; board = emptyBoard(board.title); place(a.nodes ?? {}, bad); wireAll((a.wires ?? []) as string[], bad); return [...bad.map((x) => `! ${x}`), ...(await runLines())].join('\n'); }
      case 'open': { const t = String(a.title ?? '').toLowerCase(), hit = starterBoards().find(([title]) => title.toLowerCase().startsWith(t)) ?? starterBoards().find(([title]) => title.toLowerCase().includes(t));
        if (!hit) throw new Error(`no starter board "${a.title}": find it first`); board = hit[1](); return [`opened "${hit[0].slice(0, 80)}"`, ...(await runLines())].join('\n'); }
      case 'change': { const bad: string[] = [], touched = new Set<string>();
        // (made on a copy: the board open is replaced only when every check that held on it still holds (design §2.8))
        if (!engine) { engine = new Engine(board); await engine.run(); }
        const accepted = board, before = engine, held = heldOf(before, accepted); board = JSON.parse(JSON.stringify(board)) as Board;
        for (const id of (a.remove ?? []) as string[]) { if (!board.nodes[id]) { bad.push(`no node ${id}`); continue; } board.nodes[id] = { ...board.nodes[id]!, deleted: true }; for (const e of edgesOf(board)) if (e.from === id || e.to === id) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; }
        for (const w of (a.unwire ?? []) as string[]) { const [to, inp] = String(w).split('.'); const hit = edgesOf(board).filter((e) => e.to === to && e.in === inp); if (!hit.length) bad.push(`nothing feeds ${w}`); for (const e of hit) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; touched.add(to!); }
        for (const [id, kv] of Object.entries((a.set ?? {}) as Record<string, Record<string, unknown>>)) { const n = board.nodes[id], d = n?.block ? block(n.block) : undefined; if (!n || !d) { bad.push(`no node ${id}`); continue; }
          const keys = keysOf(d); for (const [k, v] of Object.entries(kv)) { if (!keys.has(k)) { bad.push(`${id}: no setting or input ${k} (it has ${[...keys].join(', ')})`); continue; } n.set = { ...(n.set ?? {}), [k]: v }; } touched.add(id); }
        for (const k of place(a.add, bad)) touched.add(k);
        const ws = (a.wires ?? []) as string[]; wireAll(ws, bad); ws.forEach((w) => touched.add(String(w).split('>')[1]?.trim().split('.')[0] ?? ''));
        // (what the changes reach downstream is said too: a setting moved shows where it went)
        for (const e of edgesOf(board)) if (touched.has(e.from)) touched.add(e.to);
        const lines = [...bad.map((x) => `! ${x}`), ...(await runLines(touched))], now = heldOf(engine!, board), broke = [...held].filter((id) => board.nodes[id] && !board.nodes[id]!.deleted && !now.has(id));
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
export function piecesCard(): string {
  const ids = [...LIBRARY.keys()].filter((id) => /^(piece|room)\./.test(id) || ['mate.bolted', 'space.show', 'measure', 'assert'].includes(id)).sort();
  const line = (d: BlockDef) => { const ps = portsOf(d, defaultsOf(d)), outs = ps.outputs.map((p) => p.name).join(',');
    const sets = (d.settings ?? []).map((x) => `${x.key}=${brief(x.default, 24)}${x.choices ? ` [${x.choices.slice(0, 8).join('|')}${x.choices.length > 8 ? '|…' : ''}]` : ''}`);
    return `${d.id}${ps.inputs.length ? `(${ps.inputs.map((p) => `${p.name}${p.optional ? '?' : ''}`).join(', ')})` : ''}${outs === ROOM_GIVES ? '' : ` → ${outs}`}${sets.length ? ` | ${sets.join('; ')}` : ''}`; };
  return `## The cards you need most (as \`card\` gives them; each piece and operation gives ${ROOM_GIVES} unless an arrow says)\n${ids.map((id) => line(block(id)!)).join('\n')}`;
}

/** The board as the model is told it, short: a line a node (its name, its block, the settings that are not the block's
 *  own), then its wires. Empty for an empty board. */
export function boardBrief(b: Board | undefined, room = 1600): string {
  const ns = b ? nodesOf(b) : []; if (!b || !ns.length) return '';
  const lines = ns.map((n) => { const x = b.nodes[n.id]!, d = x.block ? block(x.block) : undefined, def = d ? defaultsOf(d) : {};
    const set = Object.entries(x.set ?? {}).filter(([k, v]) => JSON.stringify(def[k]) !== JSON.stringify(v));
    return `${n.id}: ${x.block ?? 'a group'}${set.length ? ` ${JSON.stringify(Object.fromEntries(set))}` : ''}`; });
  const ws = edgesOf(b).filter((e) => e.out && e.in).map((e) => `${e.from}.${e.out}>${e.to}.${e.in}`);
  const t = `The board open (${ns.length} nodes; change it by these names):\n${lines.join('\n')}${ws.length ? `\nwires: ${ws.join(' ')}` : ''}`;
  return t.length > room ? `${t.slice(0, room)}\n… (cut)` : t;
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
export function planOf(text: string): AgentPlan {
  const s = text.replace(/```(?:json)?/g, ''), i = s.indexOf('{'); if (i < 0) throw new Error('no plan in the reply: it holds no JSON object');
  // (from its first brace to the one that closes it, minding braces in strings)
  let depth = 0, inStr = false, esc = false, j = -1;
  for (let k = i; k < s.length; k++) { const c = s[k];
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) { j = k; break; } }
  if (j < 0) throw new Error('no plan in the reply: its JSON object is not closed (the reply was cut short?)');
  let o: Record<string, unknown>; try { o = JSON.parse(s.slice(i, j + 1)) as Record<string, unknown>; } catch (e) { throw new Error(`no plan in the reply: ${(e as Error).message}`); }
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
 *  taken, a node that failed. What Assist asks again with, and only that. */
export const failingOf = (out: string): string[] => out.split('\n').filter((l) => /^(! |FAILS |NOT TAKEN)/.test(l) || /^\S+ (failed|error): /.test(l)).map((l) => l.slice(0, 300));

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
  return { tool: 'change', input: { add: { [p]: node, [op]: { b: join.op, ...(join.s && Object.keys(join.s).length ? { s: join.s } : {}) } }, wires }, says: `${what}, ${d.name.toLowerCase()} of ${join.host}` };
}

/** How Assist's one call is told to answer (after the guide and the cards, so it is cached with them). */
const PLAN_RULE = `## Here: one plan, no tools
In this call you have no tools and one reply. Reply with one JSON object and nothing else:
\`{"tool": "build", "nodes": {…}, "wires": […], "says": "…"}\` for a new board (the board is empty, or what is asked is new), or
\`{"tool": "change", "add": {…}, "set": {…}, "remove": […], "wires": […], "says": "…"}\` to edit the board listed, by its names.
Nodes and wires exactly as the build tool takes them; blocks and settings from the cards above (another block only if you
are sure of its id and inputs). \`says\`: one sentence of what it makes. Give no numbers of your own: the board, run, gives
them. Asked again with what failed: a change that mends only those lines.`;

/** What Assist's one call is sent: the board's short listing, then the request, or, asked again, only what failed. */
export function planAsk(request: string, board?: Board, failing?: string[]): string {
  return [boardBrief(board), failing?.length ? `Asked: ${request.slice(0, 400)}\nWhen the plan ran, these failed (mend only them, with a change):\n${failing.slice(0, 12).join('\n')}` : request].filter(Boolean).join('\n\n');
}

/** Assist (decision 0025): one call, no tool loop, no second model: the request answered by a plan in the build or change
 *  tool's own form, for the page to show, let a person change, and run itself (runPlan). Under Node, as agentBuild. */
export async function agentPlan(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; board?: Board; failing?: string[]; signal?: AbortSignal } = {}): Promise<PlanRun> {
  if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the agent runs under Node with it set (the environment\'s secrets); a page holds no keys');
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), t0 = Date.now();
  const r = await client.messages.create({ model: o.model ?? AGENT_MODEL, max_tokens: 4000, cache_control: { type: 'ephemeral' }, system: `${await guideOf()}\n\n${PLAN_RULE}`, output_config: { effort: o.effort ?? 'low' }, messages: [{ role: 'user', content: planAsk(request, o.board, o.failing) }] }, { signal: o.signal ?? AbortSignal.timeout(60_000) });
  const turn = turnOf(r), text = turn.ends ? turn.answer : '';
  const tokens = { in: r.usage.input_tokens, out: r.usage.output_tokens, cached: r.usage.cache_read_input_tokens ?? 0, written: r.usage.cache_creation_input_tokens ?? 0 };
  try { return { plan: planOf(text), text: text.slice(0, 4000), model: r.model, tokens, ms: Date.now() - t0 }; }
  catch (e) { return { error: (e as Error).message, text: text.slice(0, 4000), model: r.model, tokens, ms: Date.now() - t0 }; }
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
