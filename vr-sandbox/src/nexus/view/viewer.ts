// The app as a page on claude.ai (decision 0027: a link the person opens anywhere, and they are the check). There the
// session's relay is not reached, so what it did is done by the viewer's own Claude account (the page's `sample`
// capability, no key anywhere in the page), and what the person reports (a spot tapped in the view and a line of words,
// or a request the in-app AI sends) is kept in the page's shared store (`db`, read by the session with ArtifactData) and
// sent straight into the session that builds the app (the Claude Code Remote connector's send_message, as the viewer).
// Outside claude.ai none of this is present: every call answers null and the app runs on its relay as before.

type Use = (name: string) => Promise<unknown>;
const host = (globalThis as { claude?: { use?: Use } }).claude;
/** The page is shown by a claude.ai viewer (its runtime is there before any script runs). */
export const inViewer = typeof host?.use === 'function';
const memo = new Map<string, Promise<unknown>>();
/** A capability's namespace, or null where this view cannot run it (asked once, kept). */
export function cap<T>(name: string): Promise<T | null> {
  if (!inViewer) return Promise.resolve(null);
  if (!memo.has(name)) memo.set(name, host!.use!(name).catch(() => null));
  return memo.get(name)! as Promise<T | null>;
}
/** The session that builds the app: where reports and the AI's requests go. */
export const SESSION = 'session_01L1AsfYyW1V3TvafPzcALqj';

type SampleTool = { name: string; description: string; inputSchema?: Record<string, unknown>; execute: (input: Record<string, unknown>) => unknown };
type Sample = ((input: string, o?: { modelTier?: 'quick' | 'default' | 'complex'; cache?: boolean; tools?: SampleTool[]; onText?: (u: { text: string }) => void; signal?: AbortSignal }) => Promise<{ text: string; truncated: boolean }>);
type Mcp = { callTool: (server: string, tool: string, input?: unknown) => Promise<{ payload?: unknown }> };
type Db = { collection: (path: string) => { add: (data: Record<string, unknown>) => Promise<{ id: string }> } };
type User = { id?: () => Promise<string> };

/** What a refused call means for the person, by its code (never its message). */
export function whyNot(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  return ({ not_granted: 'this page was not allowed to use Claude: allow it in the page\'s permissions', sampling_disabled: 'Claude is not available on this account here', rate_limited: 'too many calls just now: try again in a minute', session_expired: 'sign in to claude.ai again', refused: 'Claude declined that request: say it another way', empty_completion: 'Claude gave no answer: ask for less at a time', cancelled: 'stopped', tools_unavailable: 'this view cannot run the build tools: use Assist', not_in_manifest: 'the connector was not allowed for this page', server_not_connected: 'the Claude Code Remote connector is not connected for this account', approval_required: 'sending needs your approval: allow it when claude.ai asks' } as Record<string, string>)[code] ?? ((e as { message?: string })?.message || String(e));
}

/** One call to Claude on the viewer's account: the whole prompt in, its text out (streamed to onText). */
export async function askClaude(prompt: string, o: { tier?: 'quick' | 'default' | 'complex'; tools?: SampleTool[]; onText?: (t: string) => void; signal?: AbortSignal } = {}): Promise<string> {
  const sample = await cap<Sample>('sample'); if (!sample) throw new Error('Claude is not reachable from this view');
  const r = await sample(prompt, { modelTier: o.tier ?? 'quick', ...(o.tools ? { tools: o.tools } : { cache: false }), ...(o.onText ? { onText: (u) => o.onText!(u.text) } : {}), ...(o.signal ? { signal: o.signal } : {}) });
  return r.text;
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
