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
import { block, defaultsOf, portsOf, register, type BlockDef, type PortDef, type Type } from './blocks';
import { Engine, collapse, emptyBoard, groupBlock, makeBlock, placeBlock, wire } from './dataflow';
// (navigation and the starter boards are loaded when the agent runs, not when the library does: imported at the top they
// change the order the library's modules start in, and a worker that loads the whole library then fails to start)
import type { Board } from './boards';
import { edgesOf, nodesOf } from './boards';

/** The docs the agent may read, by topic: the router in CLAUDE.md, as files under docs/. */
const DOCS: Record<string, string> = { wanted: 'WANTED.md', owners: 'OWNERS.md', roadmap: 'ROADMAP.md', reality: 'REALITY.md', compiler: 'COMPILER.md', placement: 'PLACEMENT.md', life: 'LIFE.md', reconstruct: 'RECONSTRUCT.md', gaps: 'GAP-MAP.md', nodes: 'NODES.md', atlas: 'ATLAS.md' };

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
  { name: 'change', description: 'Changes to the board as it is, then run; lines back for what changed and what failed.', input_schema: { type: 'object', properties: { add: plan.nodes, set: { type: 'object', description: '{name:{key:value}}' }, remove: { type: 'array', items: { type: 'string' } }, wires: plan.wires, unwire: { type: 'array', items: { type: 'string' }, description: '"b.in": what feeds it, cut' } } } },
  { name: 'read', description: 'One output of a node, in full.', input_schema: { type: 'object', properties: { node: { type: 'string' }, out: { type: 'string' } }, required: ['node', 'out'] } },
  { name: 'fold', description: 'Nodes of the board folded into one new library block, saved: wires crossing in become its inputs, out its outputs (name them in outs). Omit nodes: all but the in.* nodes, which become its inputs. Its card back.', input_schema: { type: 'object', properties: { nodes: { type: 'array', items: { type: 'string' }, description: 'omit for all' }, outs: { type: 'array', items: { type: 'string' }, description: '"node.output": its outputs' }, name: { type: 'string' }, says: { type: 'string' } }, required: ['name', 'says'] } },
  { name: 'docs', description: `Lines of a document holding the words. Topics: ${Object.keys(DOCS).join(', ')}.`, input_schema: { type: 'object', properties: { topic: { type: 'string' }, find: { type: 'string' } }, required: ['topic', 'find'] } },
];

/** The agent's standing instructions: docs/FOR-AI.md itself, so what it is told and what a person reads are one text. */
let guide: string | undefined;
const guideOf = async (): Promise<string> => { if (guide) return guide; const { readFileSync } = await import(/* @vite-ignore */ 'node:fs'); return (guide = readFileSync(new URL('../../docs/FOR-AI.md', import.meta.url), 'utf8')); };

export interface AgentStep { tool: string; input: unknown; result: string; ms: number }
/** A block the agent folded and saved: enough to register it again anywhere (a page keeps it with the blocks you saved). */
export interface AgentBlock { id: string; name: string; says: string; domains: string[]; graph: Board }
export interface AgentRun { board: Board; steps: AgentStep[]; answer: string; model: string; tokens: { in: number; out: number; cached: number; written: number }; made: AgentBlock[]; checked?: string; stopped?: string }

/** A second model's reading of the answer against the steps it came from: each number traced to a tool's result, each
 *  claim to what was asked and done. It sees only the request, the steps (short) and the answer: a few thousand tokens. */
async function checkOf(client: InstanceType<typeof import('@anthropic-ai/sdk').default>, request: string, steps: AgentStep[], answer: string, model: string, used: (u: { input_tokens: number; output_tokens: number }) => void): Promise<string> {
  const said = steps.map((s, k) => `${k + 1}. ${s.tool} ${brief(s.input, 200)}\n=> ${s.result.slice(0, 300)}`).join('\n');
  const r = await client.messages.create({ model, max_tokens: 1500, output_config: { effort: 'low' }, system: 'You check another model\'s work. Given a request, the tool steps it took (each result is what the tool really returned) and its answer: list each number or claim in the answer that no step supports, and each part of the request not done. Then a last line: PASS if none, else FAULTS: and how many. Be short; quote, do not explain at length.', messages: [{ role: 'user', content: `Request: ${request}\n\nSteps:\n${said}\n\nAnswer:\n${answer}` }] }, { signal: AbortSignal.timeout(60_000) });
  used(r.usage); return r.content.map((b) => (b.type === 'text' ? b.text : '')).join('').trim();
}

/** The agent given a request: its board, its steps, its answer. At most `steps` tool calls and `seconds` of time. */
export async function agentBuild(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; steps?: number; seconds?: number; board?: Board; blocks?: AgentBlock[]; check?: string | false; signal?: AbortSignal } = {}): Promise<AgentRun> {
  if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the agent runs under Node with it set (the environment\'s secrets); a page holds no keys');
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' }), system = await guideOf();
  const model = o.model ?? 'claude-haiku-5-5', steps: AgentStep[] = [], t0 = Date.now(), until = t0 + 1000 * (o.seconds ?? 180);
  let board: Board = o.board ?? emptyBoard(request.slice(0, 60)), engine: Engine | undefined, tokIn = 0, tokOut = 0, cached = 0, written = 0, stopped: string | undefined;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: request }];
  const [{ search }, { starterBoards }] = await Promise.all([import('./navigate'), import('./starters')]), made: AgentBlock[] = [];
  // (blocks a person saved, sent with the request: the agent can place them like any other)
  for (const x of o.blocks ?? []) if (!block(x.id)) register(groupBlock(x.graph, { id: x.id, name: x.name, says: x.says, domains: x.domains, by: 'you' }));
  /** The board run, and a line a node: its status and a short reading of its outputs (those asked first; failures always). */
  const runLines = async (only?: Set<string>): Promise<string[]> => {
    engine = new Engine(board); await engine.run();
    const ids = nodesOf(board).map((n) => n.id), out: string[] = [];
    for (const id of ids) { const st = engine.state.get(id), bad = st?.status !== 'ok'; if (only && !only.has(id) && !bad) continue;
      if (bad) { out.push(`${id} ${st?.status ?? '?'}: ${(st?.error ?? '').slice(0, 160)}`); continue; }
      out.push(`${id} ok ${Object.entries(st!.out ?? {}).filter(([k]) => k !== 'says').slice(0, 6).map(([k, v]) => `${k}=${brief(v, 50)}`).join(' ')}`); }
    return out.length > 40 ? [...out.slice(0, 40), `… and ${out.length - 40} more nodes, all ok`] : out;
  };
  /** Nodes placed on the board from a plan's names, each block's settings checked against it: what was wrong, said. */
  const place = (nodes: Record<string, { b?: string; s?: Record<string, unknown> }>, bad: string[]) => {
    for (const [nm, n] of Object.entries(nodes)) { const d = block(String(n.b)); if (!d) { bad.push(`${nm}: no block "${n.b}"`); continue; }
      const keys = new Set((d.settings ?? []).map((x) => x.key)), wrong = Object.keys(n.s ?? {}).filter((k) => !keys.has(k)); if (wrong.length) bad.push(`${nm}: ${d.id} has no setting ${wrong.join(', ')} (it has ${[...keys].join(', ') || 'none'})`);
      placeBlock(board, d.id, 0, 0, { ...defaultsOf(d), ...Object.fromEntries(Object.entries(n.s ?? {}).filter(([k]) => keys.has(k))) }, nm); board.nodes[nm]!.label = nm; }
  };
  const wireAll = (ws: string[], bad: string[]) => { for (const w of ws) { const m = /^(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)$/.exec(String(w).trim()); if (!m) { bad.push(`wire "${w}": write it a.out>b.in`); continue; } try { wire(board, m[1]!, m[2]!, m[3]!, m[4]!); } catch (e) { bad.push(`wire ${w}: ${(e as Error).message}`); } } };
  const doTool = async (name: string, a: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'find': return search(String(a.q ?? ''), 10).map((f) => (f.board ? `board "${f.board}" | ${f.says.slice(0, 90)}` : `${f.add?.block ?? f.id}${f.add?.set ? ` ${JSON.stringify(f.add.set)}` : ''} | ${f.name} | ${f.says.slice(0, 90)}`)).join('\n') || 'nothing matches';
      case 'card': { const d = block(String(a.id)); if (!d) throw new Error(`no block "${a.id}"`); return cardOf(d); }
      case 'build': { const bad: string[] = []; board = emptyBoard(board.title); place((a.nodes ?? {}) as never, bad); wireAll((a.wires ?? []) as string[], bad); return [...bad.map((x) => `! ${x}`), ...(await runLines())].join('\n'); }
      case 'open': { const t = String(a.title ?? '').toLowerCase(), hit = starterBoards().find(([title]) => title.toLowerCase().startsWith(t)) ?? starterBoards().find(([title]) => title.toLowerCase().includes(t));
        if (!hit) throw new Error(`no starter board "${a.title}": find it first`); board = hit[1](); return [`opened "${hit[0].slice(0, 80)}"`, ...(await runLines())].join('\n'); }
      case 'change': { const bad: string[] = [], touched = new Set<string>();
        for (const id of (a.remove ?? []) as string[]) { if (!board.nodes[id]) { bad.push(`no node ${id}`); continue; } board.nodes[id] = { ...board.nodes[id]!, deleted: true }; for (const e of edgesOf(board)) if (e.from === id || e.to === id) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; }
        for (const w of (a.unwire ?? []) as string[]) { const [to, inp] = String(w).split('.'); const hit = edgesOf(board).filter((e) => e.to === to && e.in === inp); if (!hit.length) bad.push(`nothing feeds ${w}`); for (const e of hit) board.edges[e.id] = { ...board.edges[e.id]!, deleted: true }; touched.add(to!); }
        for (const [id, kv] of Object.entries((a.set ?? {}) as Record<string, Record<string, unknown>>)) { const n = board.nodes[id], d = n?.block ? block(n.block) : undefined; if (!n || !d) { bad.push(`no node ${id}`); continue; }
          const keys = new Set((d.settings ?? []).map((x) => x.key)); for (const [k, v] of Object.entries(kv)) { if (!keys.has(k)) { bad.push(`${id}: no setting ${k} (it has ${[...keys].join(', ')})`); continue; } n.set = { ...(n.set ?? {}), [k]: v }; } touched.add(id); }
        const add = (a.add ?? {}) as Record<string, { b?: string }>; place(add as never, bad); Object.keys(add).forEach((k) => touched.add(k));
        const ws = (a.wires ?? []) as string[]; wireAll(ws, bad); ws.forEach((w) => touched.add(String(w).split('>')[1]?.trim().split('.')[0] ?? ''));
        // (what the changes reach downstream is said too: a setting moved shows where it went)
        for (const e of edgesOf(board)) if (touched.has(e.from)) touched.add(e.to);
        return [...bad.map((x) => `! ${x}`), ...(await runLines(touched))].join('\n'); }
      case 'fold': {
        // (by default every node but the inputs (in.number, in.text, …): those stay outside, so what they feed becomes the new block's inputs)
        const ids = ((a.nodes as string[] | undefined) ?? nodesOf(board).filter((n) => !board.nodes[n.id]!.block?.startsWith('in.')).map((n) => n.id)).filter((id) => board.nodes[id] && !board.nodes[id]!.deleted);
        // (each output asked for is given a reader outside, so the wire to it crosses the fold and becomes the block's output)
        for (const o2 of (a.outs ?? []) as string[]) { const [n, port] = String(o2).split('.'); if (!board.nodes[n!]) throw new Error(`no node ${n}`); const sh = `${n}_${port}`; placeBlock(board, 'view.show', 0, 0, {}, sh); board.nodes[sh]!.label = `${port}`; wire(board, n!, port!, sh, 'value'); }
        const f = collapse(board, ids, String(a.name)), r = makeBlock(f.board, f.id, { name: String(a.name), says: String(a.says ?? ''), by: 'you' });
        board = r.board; const d = r.block; made.push({ id: d.id, name: d.name, says: d.says ?? '', domains: d.domains ?? ['software'], graph: d.graph! });
        return `${r.duplicateOf ? `does what ${r.duplicateOf} does already: that one placed. ` : 'saved. '}${cardOf(d)}`; }
      case 'read': { const st = engine?.state.get(String(a.node)); if (!st) throw new Error('build first'); if (!st.out || !(String(a.out) in st.out)) throw new Error(`${a.node} has no output ${a.out}`); const v = st.out[String(a.out)];
        return (Array.isArray(v) ? v.slice(0, 60).map((x) => brief(x, 240)).join('\n') + (v.length > 60 ? `\n… ${v.length - 60} more rows` : '') : brief(v, 2000)).slice(0, 6000); }
      case 'docs': { const f = DOCS[String(a.topic)]; if (!f) throw new Error(`no topic "${a.topic}"`); const { readFileSync } = await import(/* @vite-ignore */ 'node:fs');
        const lines = readFileSync(new URL(`../../docs/${f}`, import.meta.url), 'utf8').split('\n'), w = String(a.find ?? '').toLowerCase(), hits = lines.map((l, k) => (l.toLowerCase().includes(w) ? k : -1)).filter((k) => k >= 0).slice(0, 4);
        return hits.length ? hits.map((k) => lines.slice(Math.max(0, k - 1), k + 3).join('\n')).join('\n…\n').slice(0, 2500) : `nothing in ${f} holds "${a.find}"`; }
    }
    throw new Error(`no tool ${name}`);
  };
  for (let turn = 0; ; turn++) {
    if (steps.length >= (o.steps ?? 30)) { stopped = `stopped at ${steps.length} steps`; break; }
    if (Date.now() > until) { stopped = `stopped at ${Math.round((Date.now() - t0) / 1000)} s`; break; }
    // (the guide and the tools are the same every call: cached, read again at a tenth of the price)
    const r = await client.messages.create({ model, max_tokens: 8000, cache_control: { type: 'ephemeral' }, system, tools: TOOLS, output_config: { effort: o.effort ?? 'low' }, messages }, { signal: o.signal ?? AbortSignal.timeout(Math.max(5000, until - Date.now())) });
    tokIn += r.usage.input_tokens; tokOut += r.usage.output_tokens; cached += r.usage.cache_read_input_tokens ?? 0; written += r.usage.cache_creation_input_tokens ?? 0; messages.push({ role: 'assistant', content: r.content });
    if (r.stop_reason === 'refusal') throw new Error(`declined: ${r.stop_details?.explanation ?? ''}`);
    if (r.stop_reason !== 'tool_use') { const answer = r.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
      const checked = o.check === false ? undefined : await checkOf(client, request, steps, answer, o.check ?? 'claude-sonnet-5-5', (u) => { tokIn += u.input_tokens; tokOut += u.output_tokens; }).catch((e) => `not checked: ${(e as Error).message}`);
      return { board, steps, answer, model: r.model, tokens: { in: tokIn, out: tokOut, cached, written }, made, ...(checked ? { checked } : {}) }; }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const b of r.content) if (b.type === 'tool_use') { const s0 = Date.now(); let out: string, err = false; try { out = await doTool(b.name, (b.input ?? {}) as Record<string, unknown>); } catch (e) { out = (e as Error).message; err = true; }
      steps.push({ tool: b.name, input: b.input, result: out.slice(0, 300), ms: Date.now() - s0 }); results.push({ type: 'tool_result', tool_use_id: b.id, content: out, ...(err ? { is_error: true } : {}) }); }
    messages.push({ role: 'user', content: results });
  }
  return { board, steps, answer: '', model, tokens: { in: tokIn, out: tokOut, cached, written }, made, stopped };
}

const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
register({ version: 1, by: 'built in', pure: false, id: 'agent.build', name: 'Claude builds a board', kind: 'ai', ability: 'ask', domains: ['intelligence', 'pipelines', 'software', 'everyday'],
  spec: { gloss: 'What board does Claude build, run and check for this request, through the node system alone?', discipline: 'intelligence.agents.tools', role: 'data source', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010178.10010219', label: 'Computing methodologies: distributed artificial intelligence (agents)' }] },
  says: 'A request in words handed to Claude, which works only through the node system\'s own five tools (docs/FOR-AI.md, its whole instruction): find blocks, read a block\'s card, build a whole board from a short plan and run it, read an output, read the docs by topic; it fixes what failed and builds again. Its board, every step it took (the tool, what it asked, what came back), and its answer, each number with the node it came from. Claude Haiku 5.5 at low effort unless more is asked; at most so many steps and seconds. Under Node, where ANTHROPIC_API_KEY is',
  settings: [{ key: 'request', label: 'What to build', type: 'code', default: 'A coil spring with a rate of about 40000 N/m: build it and give its mass' }, { key: 'model', label: 'Model (the cheapest unless the task needs more)', type: 'choice', default: 'claude-haiku-5-5', choices: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] }, { key: 'effort', label: 'Effort', type: 'choice', default: 'low', choices: ['low', 'medium', 'high'] }, { key: 'steps', label: 'At most, steps', type: 'number', default: 30 }, { key: 'seconds', label: 'At most, seconds', type: 'number', default: 180 }],
  ports: { inputs: [P('request', 'text', { optional: true })], outputs: [P('board', 'record', { label: 'the board it built' }), P('steps', 'table', { label: 'each step: tool, what it asked, what came back' }), P('answer', 'text'), P('says', 'text')] },
  run: async (i, c) => { const t0 = Date.now(), r = await agentBuild(String(i.request ?? c.set.request), { model: String(c.set.model), effort: c.set.effort as 'low', steps: Number(c.set.steps), seconds: Number(c.set.seconds), signal: c.signal });
    return { board: r.board, steps: r.steps.map((s, k) => ({ step: k + 1, tool: s.tool, asked: brief(s.input, 160), got: s.result.slice(0, 200), ms: s.ms })), answer: r.answer || r.stopped || '', says: `${r.model}: ${Object.keys(r.board.nodes).length} nodes, ${r.steps.length} steps, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${r.tokens.in + r.tokens.written} tokens in (${r.tokens.cached} more read from cache at a tenth) and ${r.tokens.out} out${r.stopped ? `; ${r.stopped}` : ''}` }; } } as BlockDef);
