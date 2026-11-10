// The app as a page on claude.ai (decision 0027: a link the person opens anywhere, and they are the check). There the
// session's relay is not reached, so what it did is done by the viewer's own Claude account (the page's `sample`
// capability, no key anywhere in the page), and what the person reports (a spot tapped in the view and a line of words,
// or a request the in-app AI sends) is kept in the page's shared store (`db`, read by the session with ArtifactData) and
// sent straight into the session that builds the app (the Claude Code Remote connector's send_message, as the viewer).
// Outside claude.ai none of this is present: every call answers null and the app runs on its relay as before.

type Use = (name: string) => Promise<unknown>;
// (the chat runs in a frame inside the main page: the main page's runtime is the one granted the capabilities, so the
// frame asks through it where it can reach it; its own otherwise)
const own = (globalThis as { claude?: { use?: Use } }).claude;
const above = (() => { try { return window.parent !== window ? (window.parent as unknown as { claude?: { use?: Use } }).claude : undefined; } catch { return undefined; } })();
const host = typeof above?.use === 'function' ? above : own;
let lastWhy = '';
/** The page is shown by a claude.ai viewer (its runtime is there before any script runs). */
export const inViewer = typeof host?.use === 'function';
const memo = new Map<string, Promise<unknown>>();
/** A capability's namespace, or null where this view cannot run it (asked once, kept). */
export function cap<T>(name: string): Promise<T | null> {
  if (!inViewer) return Promise.resolve(null);
  if (!memo.has(name)) memo.set(name, host!.use!(name).catch((e: unknown) => { memo.delete(name); lastWhy = `${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? String(e)}`.trim(); return null; }));
  return memo.get(name)! as Promise<T | null>;
}
/** The session that builds the app: where reports and the AI's requests go. */
export const SESSION = 'session_01L1AsfYyW1V3TvafPzcALqj';

type SampleTool = { name: string; description: string; inputSchema?: Record<string, unknown>; execute: (input: Record<string, unknown>) => unknown };
type Sample = ((input: string, o?: { modelTier?: 'quick' | 'default' | 'complex'; cache?: boolean; tools?: SampleTool[]; onText?: (u: { text: string }) => void; signal?: AbortSignal }) => Promise<{ text: string; truncated: boolean }>);
type Mcp = { callTool: (server: string, tool: string, input?: unknown) => Promise<{ payload?: unknown }> };
type DocSnap = { id: string; exists: boolean; data: () => Record<string, unknown> | undefined };
type Db = { collection: (path: string) => { add: (data: Record<string, unknown>) => Promise<{ id: string }>; get: () => Promise<{ docs: DocSnap[] }>; doc: (id: string) => { set: (data: Record<string, unknown>) => Promise<void>; delete: () => Promise<void> } } };
type User = { id?: () => Promise<string> };

/** What a refused call means for the person, by its code (never its message). */
export function whyNot(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return ({ not_granted: 'this page was not allowed to use Claude: allow it in the page\'s permissions', sampling_disabled: 'Claude is not available on this account here', rate_limited: 'too many calls just now: try again in a minute', session_expired: 'sign in to claude.ai again', refused: 'Claude declined that request: say it another way', empty_completion: 'Claude gave no answer: ask for less at a time', cancelled: 'stopped', tools_unavailable: 'this view cannot run the build tools: use Assist', not_in_manifest: 'the connector was not allowed for this page', server_not_connected: 'the Claude Code Remote connector is not connected for this account', approval_required: 'sending needs your approval: allow it when claude.ai asks' } as Record<string, string>)[code] ?? ((e as { message?: string })?.message || String(e));
}

/** One call to Claude on the viewer's account: the whole prompt in, its text out (streamed to onText). */
// ---- the person's own key, on their own site (the static site has no relay and no claude.ai host) ---------------------
// Kept only in this browser's storage, sent only to api.anthropic.com; never in the repo, never in the page's code.
const KEY_AT = 'nexus.anthropic.key';
export const keyHere = (): string => { try { return localStorage.getItem(KEY_AT) ?? ''; } catch { return ''; } };
/** Ask once for the key (a prompt box); an empty answer forgets it. True when a key is held after. */
export function askForKey(): boolean {
  const k = window.prompt('Your Anthropic API key (kept only in this browser, sent only to api.anthropic.com). Leave empty to forget it.', keyHere());
  if (k === null) return !!keyHere();
  try { if (k.trim()) localStorage.setItem(KEY_AT, k.trim()); else localStorage.removeItem(KEY_AT); } catch { /* no storage */ }
  return !!keyHere();
}
/** Claude is reachable from this page: the claude.ai host, or the person's own key. */
export const aiHere = (): boolean => inViewer || !!keyHere();
const KEY_MODEL = { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5', complex: 'claude-sonnet-5-5' } as const;
type Block = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
async function askByKey(prompt: string, o: { tier?: 'quick' | 'default' | 'complex'; tools?: SampleTool[]; onText?: (t: string) => void; signal?: AbortSignal }): Promise<string> {
  const messages: { role: 'user' | 'assistant'; content: unknown }[] = [{ role: 'user', content: prompt }]; let said = '';
  for (let turn = 0; turn < 40; turn++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', ...(o.signal ? { signal: o.signal } : {}),
      headers: { 'content-type': 'application/json', 'x-api-key': keyHere(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: KEY_MODEL[o.tier ?? 'quick'], max_tokens: 8000, messages, ...(o.tools ? { tools: o.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema ?? { type: 'object', properties: {} } })) } : {}) }) });
    if (!res.ok) throw new Error(res.status === 401 ? 'the key was refused (tap the key button to change it)' : `Claude answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = await res.json() as { content: Block[]; stop_reason: string };
    const text = body.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''); if (text) { said += text; o.onText?.(said); }
    const uses = body.content.filter((b) => b.type === 'tool_use'); if (body.stop_reason !== 'tool_use' || !uses.length || !o.tools) return said;
    messages.push({ role: 'assistant', content: body.content });
    const results = []; for (const u of uses) { let out: unknown; try { out = await o.tools.find((t) => t.name === u.name)?.execute(u.input ?? {}); } catch (e) { out = `failed: ${(e as Error).message}`; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: typeof out === 'string' ? out : JSON.stringify(out ?? null) }); }
    messages.push({ role: 'user', content: results });
  }
  return said;
}

export async function askClaude(prompt: string, o: { tier?: 'quick' | 'default' | 'complex'; tools?: SampleTool[]; onText?: (t: string) => void; signal?: AbortSignal } = {}): Promise<string> {
  if (!inViewer && keyHere()) return askByKey(prompt, o);
  const sample = await cap<Sample>('sample'); if (!sample) throw new Error(`Claude is not reachable from this view${lastWhy ? ` (${lastWhy})` : ''}`);
  const r = await sample(prompt, { modelTier: o.tier ?? 'quick', ...(o.tools ? { tools: o.tools } : { cache: false }), ...(o.onText ? { onText: (u) => o.onText!(u.text) } : {}), ...(o.signal ? { signal: o.signal } : {}) });
  return r.text;
}

/** The parts remembered as the page's shared store keeps them (decision 0028): memory.ts's remote, and a part taken out. */
export type PartsStore = import('../memory').Remote & { drop: (id: string) => Promise<void> };
/** The page's shared store of parts remembered: the db capability's collection 'parts', one document a part under its
 *  id, its graph as JSON text (a board nests deeper than a document may, and is read back whole). Null outside claude.ai
 *  or where this view cannot run db. A document that no longer reads as a part is left out. */
export async function partsStore(): Promise<PartsStore | null> {
  const db = await cap<Db>('db'); if (!db) return null;
  const parts = db.collection('parts');
  return {
    all: async () => (await parts.get()).docs.filter((d) => d.exists).flatMap((d) => { const x = d.data() ?? {};
      try { const graph = typeof x.graph === 'string' ? JSON.parse(x.graph) as unknown : x.graph; return graph && typeof graph === 'object' ? [{ ...x, id: String(x.id ?? d.id), graph } as import('../memory').SavedPart] : []; } catch { return []; } }),
    put: async (p) => { await parts.doc(p.id).set({ ...p, graph: JSON.stringify(p.graph) } as unknown as Record<string, unknown>); },
    drop: async (id) => { await parts.doc(id).delete(); },
  };
}

/** A report: the words, and where (the piece tapped and the point on it, in mm), with the board it was on. */
export interface Report { text: string; piece?: string; point?: [number, number, number]; board?: string; title?: string; from: 'person' | 'in-app AI' }
/** Kept in the page's store and sent into the session; says which of the two went through. */
export async function sendReport(r: Report): Promise<{ saved: boolean; sent: boolean; why?: string }> {
  const at = new Date().toISOString(), out: { saved: boolean; sent: boolean; why?: string } = { saved: false, sent: false };
  const db = await cap<Db>('db'), user = await cap<User>('user');
  if (db) { try { const by = await user?.id?.().catch(() => undefined); await db.collection('reports').add({ ...r, at, ...(by ? { by } : {}) }); out.saved = true; } catch (e) { out.why = whyNot(e); } }
  const mcp = await cap<Mcp>('mcp');
  if (mcp) {
    const where = r.piece || r.point ? `\nWhere: ${r.piece || 'a spot'}${r.point ? ` at (${r.point.map((v) => v.toFixed(1)).join(', ')}) mm` : ''}` : '';
    const message = `Report from the Nexus page, ${r.from === 'person' ? 'typed by the person using it' : 'sent by the in-app AI for the person using it'}, ${at}:\n${r.text}${where}${r.title ? `\nBoard: ${r.title}` : ''}${r.board ? `\n${r.board.slice(0, 3000)}` : ''}`;
    try { await mcp.callTool('Claude Code Remote', 'send_message', { session_id: SESSION, message }); out.sent = true; } catch (e) { out.why = whyNot(e); }
  }
  if (!db && !mcp) out.why = 'reports go out from the page on claude.ai; this copy has no store';
  return out;
}

/** Auto on the viewer's own Claude: the AI's own eight tools, run here in the page, each tool call a round of one call;
 *  each step said as it runs. The dashboard's Ask Claude and the phone page's Auto use it on claude.ai. */
export async function autoOnViewer(request: string, board: import('../boards').Board, blocks: import('../agent').AgentBlock[], o: { onStep?: (line: string, ok: boolean) => void; onBoard?: (b: import('../boards').Board) => void; extra?: SampleTool[] } = {}): Promise<{ answer: string; board: import('../boards').Board; steps: number }> {
  const { TOOLS, boardBrief, guideOf, toolsFor } = await import('../agent'), { nodesOf } = await import('../boards');
  const t = await toolsFor(structuredClone(board), blocks), guide = await guideOf(); let steps = 0;
  const tools: SampleTool[] = [...TOOLS.map((d) => ({ name: d.name, description: d.description ?? d.name, inputSchema: d.input_schema as Record<string, unknown>, execute: async (a: Record<string, unknown>) => {
    steps++; try { const out = await t.doTool(d.name, a), bad = /^(! |FAILS |NOT TAKEN)/m.test(out); o.onStep?.(`${d.name}${bad ? ': something failed, mending it' : ''}`, !bad);
      if (['build', 'change', 'open'].includes(d.name)) o.onBoard?.(t.board()); return out.slice(0, 24000); }
    catch (e) { o.onStep?.(`${d.name}: ${(e as Error).message.slice(0, 90)}`, false); throw e; } } })), ...(o.extra ?? [])];
  const answer = await askClaude(`${guide}\n\n---\n\n${nodesOf(board).length ? `${boardBrief(board)}\n\n` : ''}Request: ${request}\n\nWork through the tools: build it, read what failed, change it until nothing fails, then answer in two or three short sentences what was built.`, { tier: 'default', tools });
  return { answer, board: t.board(), steps };
}
