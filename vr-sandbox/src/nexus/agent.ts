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
import { Engine, emptyBoard, placeBlock, wire } from './dataflow';
// (navigation and the starter boards are loaded when the agent runs, not when the library does: imported at the top they
// change the order the library's modules start in, and a worker that loads the whole library then fails to start)
import type { Board } from './boards';

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

const portsSaid = (ps: PortDef[]) => ps.map((p) => ({ name: p.name, type: p.type, ...(p.unit ? { unit: p.unit } : {}), ...(p.optional ? { optional: true } : {}), ...(p.default !== undefined ? { default: brief(p.default, 60) } : {}), ...(p.choices ? { choices: p.choices.slice(0, 12) } : {}), ...(p.label ? { label: p.label } : {}) }));

/** The agent's tools: their names, what each does, what each takes. */
const TOOLS: Anthropic.Tool[] = [
  { name: 'search_library', description: 'Search every library (nodes, laws, seeds, starter boards, machines, materials, parts, references) by words. Returns ids, names and what each says. Search before placing anything.', input_schema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer' } }, required: ['query'] } },
  { name: 'describe_block', description: 'A node\'s full description by its id: what it says it does, its inputs, outputs and settings (names, types, units, defaults, choices). Describe a node before placing or wiring it.', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
  { name: 'example_boards', description: 'Starter boards whose titles match the words: worked examples of nodes wired together. Returns each title and the nodes and wires in it.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'read_docs', description: `The project's docs by topic (${Object.keys(DOCS).join(', ')}), only the lines that hold the words given (with a few around them): targeted, never whole.`, input_schema: { type: 'object', properties: { topic: { type: 'string', enum: Object.keys(DOCS) }, find: { type: 'string' } }, required: ['topic', 'find'] } },
  { name: 'place_node', description: 'Place a node on the board by its block id, with settings (only keys the block has). Returns the new node\'s id.', input_schema: { type: 'object', properties: { block: { type: 'string' }, settings: { type: 'object' }, label: { type: 'string' } }, required: ['block'] } },
  { name: 'wire', description: 'Wire one node\'s output to another node\'s input, by node ids and port names (as describe_block names them).', input_schema: { type: 'object', properties: { from: { type: 'string' }, output: { type: 'string' }, to: { type: 'string' }, input: { type: 'string' } }, required: ['from', 'output', 'to', 'input'] } },
  { name: 'set_setting', description: 'Change one setting of a placed node.', input_schema: { type: 'object', properties: { node: { type: 'string' }, key: { type: 'string' }, value: {} }, required: ['node', 'key', 'value'] } },
  { name: 'remove_node', description: 'Take a node, and its wires, off the board.', input_schema: { type: 'object', properties: { node: { type: 'string' } }, required: ['node'] } },
  { name: 'run_board', description: 'Run the board. Returns each node\'s status (ok or failed with its error) and a short reading of each output.', input_schema: { type: 'object', properties: {} } },
  { name: 'read_output', description: 'Read one output of a node after a run, in full (long values said short).', input_schema: { type: 'object', properties: { node: { type: 'string' }, output: { type: 'string' } }, required: ['node', 'output'] } },
];

const SYSTEM = `You build and run boards of nodes in Nexus, a node system that makes and checks real things (parts, machines, laws, materials). You act only through your tools; a board is what you make.

How to work, in order:
1. Find what exists: search_library and example_boards before anything else. Never invent a block id; use only ids your tools returned.
2. Read before you use: describe_block on every block before placing it or wiring it, and use its port and setting names exactly.
3. Build in small steps: place, wire, set. Settings only take keys the block lists.
4. Run the board, then check every node's status. A failed node is fixed (read its error, change what caused it) and run again, not left.
5. Answer only from what your tools returned: every number with the node and output it came from. Say plainly what you could not do and why. Never state a value you did not read.

Your answer at the end: what you built (each node, one line each), what it gave (the numbers, each with where it came from), and what is uncertain or left undone.`;

export interface AgentStep { tool: string; input: unknown; result: string; ms: number }
export interface AgentRun { board: Board; steps: AgentStep[]; answer: string; model: string; tokens: { in: number; out: number }; stopped?: string }

/** The agent given a request: its board, its steps, its answer. At most `steps` tool calls and `seconds` of time. */
export async function agentBuild(request: string, o: { model?: string; effort?: 'low' | 'medium' | 'high'; steps?: number; seconds?: number; board?: Board; signal?: AbortSignal } = {}): Promise<AgentRun> {
  if (typeof process === 'undefined' || !process.env?.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY where this runs: the agent runs under Node with it set (the environment\'s secrets); a page holds no keys');
  const { default: Sdk } = await import('@anthropic-ai/sdk'), client = new Sdk({ baseURL: 'https://api.anthropic.com' });
  const model = o.model ?? 'claude-haiku-5-5', board: Board = o.board ?? emptyBoard(request.slice(0, 60)), steps: AgentStep[] = [], t0 = Date.now(), until = t0 + 1000 * (o.seconds ?? 180);
  let engine: Engine | undefined, tokIn = 0, tokOut = 0, stopped: string | undefined;
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: request }];
  const [{ search }, { starterBoards }] = await Promise.all([import('./navigate'), import('./starters')]);
  const doTool = async (name: string, a: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'search_library': return JSON.stringify(search(String(a.query ?? ''), Math.min(25, Number(a.limit ?? 12))).map((f) => ({ id: f.add?.block ?? f.id, name: f.name, library: f.libraryName, says: f.says.slice(0, 160), ...(f.board ? { board: f.board } : {}) })));
      case 'describe_block': { const d = block(String(a.id)); if (!d) throw new Error(`no block "${a.id}": search for it`); const ps = portsOf(d, defaultsOf(d));
        return JSON.stringify({ id: d.id, name: d.name, says: d.says?.slice(0, 700), inputs: portsSaid(ps.inputs), outputs: portsSaid(ps.outputs), settings: (d.settings ?? []).map((s) => ({ key: s.key, label: s.label, type: s.type, default: brief(s.default, 80), ...(s.choices ? { choices: s.choices.slice(0, 15) } : {}) })) }); }
      case 'example_boards': { const q = String(a.query ?? '').toLowerCase().split(/\s+/).filter(Boolean), hits = starterBoards().filter(([t]) => q.every((w) => t.toLowerCase().includes(w))).slice(0, 3);
        if (!hits.length) return 'no starter board matches those words';
        return JSON.stringify(hits.map(([t, mk]) => { const b = mk(); return { title: t.slice(0, 200), nodes: Object.entries(b.nodes).map(([id, n]) => ({ id, block: n.block, set: n.set, label: n.label })), wires: Object.values(b.edges).map((e) => `${e.from}.${e.out} → ${e.to}.${e.in}`) }; })).slice(0, 6000); }
      case 'read_docs': { const f = DOCS[String(a.topic)]; if (!f) throw new Error(`no docs topic "${a.topic}"`); const { readFileSync } = await import(/* @vite-ignore */ 'node:fs');
        const lines = readFileSync(new URL(`../../docs/${f}`, import.meta.url), 'utf8').split('\n'), w = String(a.find ?? '').toLowerCase(), hits = lines.map((l, i) => (l.toLowerCase().includes(w) ? i : -1)).filter((i) => i >= 0).slice(0, 6);
        if (!hits.length) return `nothing in ${f} holds "${a.find}"`; return hits.map((i) => lines.slice(Math.max(0, i - 2), i + 4).join('\n')).join('\n…\n').slice(0, 5000); }
      case 'place_node': { const d = block(String(a.block)); if (!d) throw new Error(`no block "${a.block}": search for it`); const set = (a.settings ?? {}) as Record<string, unknown>, keys = new Set((d.settings ?? []).map((s) => s.key)), bad = Object.keys(set).filter((k) => !keys.has(k));
        if (bad.length) throw new Error(`${d.name} has no setting ${bad.join(', ')}: its settings are ${[...keys].join(', ') || 'none'}`);
        const id = placeBlock(board, d.id, 0, 0, { ...defaultsOf(d), ...set }); if (a.label) board.nodes[id]!.label = String(a.label); return `placed ${d.name} as ${id}`; }
      case 'wire': { wire(board, String(a.from), String(a.output), String(a.to), String(a.input)); return `wired ${a.from}.${a.output} → ${a.to}.${a.input}`; }
      case 'set_setting': { const n = board.nodes[String(a.node)]; if (!n) throw new Error(`no node ${a.node} on the board`); n.set = { ...(n.set ?? {}), [String(a.key)]: a.value }; return `${a.node}.${a.key} = ${brief(a.value, 80)}`; }
      case 'remove_node': { const id = String(a.node); if (!board.nodes[id]) throw new Error(`no node ${id}`); delete board.nodes[id]; for (const [k, e] of Object.entries(board.edges)) if (e.from === id || e.to === id) delete board.edges[k]; return `removed ${id}`; }
      case 'run_board': { engine = new Engine(board); await engine.run();
        return JSON.stringify(Object.keys(board.nodes).map((id) => { const s = engine!.state.get(id); return { node: id, block: board.nodes[id]!.block, status: s?.status, ...(s?.error ? { error: s.error.slice(0, 300) } : {}), ...(s?.out ? { outputs: Object.fromEntries(Object.entries(s.out).slice(0, 8).map(([k, v]) => [k, brief(v, 140)])) } : {}) }; })).slice(0, 8000); }
      case 'read_output': { const s = engine?.state.get(String(a.node)); if (!s) throw new Error('run the board first'); if (!s.out || !(String(a.output) in s.out)) throw new Error(`${a.node} has no output ${a.output} (${s.status}${s.error ? `: ${s.error}` : ''})`); return brief(s.out[String(a.output)], 3000); }
    }
    throw new Error(`no tool ${name}`);
  };
  for (let turn = 0; ; turn++) {
    if (steps.length >= (o.steps ?? 30)) { stopped = `stopped at ${steps.length} steps`; break; }
    if (Date.now() > until) { stopped = `stopped at ${Math.round((Date.now() - t0) / 1000)} s`; break; }
    const r = await client.messages.create({ model, max_tokens: 16000, system: SYSTEM, tools: TOOLS, output_config: { effort: o.effort ?? 'low' }, messages }, { signal: o.signal ?? AbortSignal.timeout(Math.max(5000, until - Date.now())) });
    tokIn += r.usage.input_tokens; tokOut += r.usage.output_tokens; messages.push({ role: 'assistant', content: r.content });
    if (r.stop_reason === 'refusal') throw new Error(`declined: ${r.stop_details?.explanation ?? ''}`);
    if (r.stop_reason !== 'tool_use') return { board, steps, answer: r.content.map((b) => (b.type === 'text' ? b.text : '')).join(''), model: r.model, tokens: { in: tokIn, out: tokOut } };
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const b of r.content) if (b.type === 'tool_use') { const s0 = Date.now(); let out: string, err = false; try { out = await doTool(b.name, (b.input ?? {}) as Record<string, unknown>); } catch (e) { out = (e as Error).message; err = true; }
      steps.push({ tool: b.name, input: b.input, result: out.slice(0, 300), ms: Date.now() - s0 }); results.push({ type: 'tool_result', tool_use_id: b.id, content: out, ...(err ? { is_error: true } : {}) }); }
    messages.push({ role: 'user', content: results });
  }
  return { board, steps, answer: '', model, tokens: { in: tokIn, out: tokOut }, stopped };
}

const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
register({ version: 1, by: 'built in', pure: false, id: 'agent.build', name: 'Claude builds a board', kind: 'ai', ability: 'ask', domains: ['intelligence', 'pipelines', 'software', 'everyday'],
  spec: { gloss: 'What board does Claude build, run and check for this request, through the node system alone?', discipline: 'intelligence.agents.tools', role: 'data source', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010178.10010219', label: 'Computing methodologies: distributed artificial intelligence (agents)' }] },
  says: 'A request in words handed to Claude, which works only through the node system\'s own tools: searching the library and the example boards, reading a node before it uses it, reading the docs by their router, placing, wiring and setting nodes, running the board, reading what came out and fixing what failed. Its board, every step it took (the tool, what it asked, what came back), and its answer, each number with the node it came from. Claude Haiku 5.5 at low effort unless more is asked; at most so many steps and seconds. Under Node, where ANTHROPIC_API_KEY is',
  settings: [{ key: 'request', label: 'What to build', type: 'code', default: 'A coil spring with a rate of about 40000 N/m: build it and give its mass' }, { key: 'model', label: 'Model (the cheapest unless the task needs more)', type: 'choice', default: 'claude-haiku-5-5', choices: ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] }, { key: 'effort', label: 'Effort', type: 'choice', default: 'low', choices: ['low', 'medium', 'high'] }, { key: 'steps', label: 'At most, steps', type: 'number', default: 30 }, { key: 'seconds', label: 'At most, seconds', type: 'number', default: 180 }],
  ports: { inputs: [P('request', 'text', { optional: true })], outputs: [P('board', 'record', { label: 'the board it built' }), P('steps', 'table', { label: 'each step: tool, what it asked, what came back' }), P('answer', 'text'), P('says', 'text')] },
  run: async (i, c) => { const t0 = Date.now(), r = await agentBuild(String(i.request ?? c.set.request), { model: String(c.set.model), effort: c.set.effort as 'low', steps: Number(c.set.steps), seconds: Number(c.set.seconds), signal: c.signal });
    return { board: r.board, steps: r.steps.map((s, k) => ({ step: k + 1, tool: s.tool, asked: brief(s.input, 160), got: s.result.slice(0, 200), ms: s.ms })), answer: r.answer || r.stopped || '', says: `${r.model}: ${Object.keys(r.board.nodes).length} nodes, ${r.steps.length} steps, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${r.tokens.in} tokens in and ${r.tokens.out} out${r.stopped ? `; ${r.stopped}` : ''}` }; } } as BlockDef);
