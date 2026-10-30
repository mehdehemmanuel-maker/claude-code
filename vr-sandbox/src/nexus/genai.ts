// Models reached over the web (Google's Gemini API): pictures looked at and judged by a model told nothing else of them
// (blind), pictures drawn from words (ideas), and words tried against each other for what draws best. A judge's word is
// one draw of a noisy instrument, so a picture is judged by several judges apart, each told only the criteria, and what
// they say is gathered as a measurement: each criterion's mean, its spread and its 95 % interval, what they agree is wrong.
//
// The key is read where the work runs: under Node from GEMINI_API_KEY (the environment's secrets). A page holds no key
// (anything in a page is anyone's), so there these nodes say they cannot run. Nothing here is made up when a call fails:
// the failure is said as the service gave it (a model gone, busy, or the key's quota spent).
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { encodePng } from './reconstruct';

/** Models tried in order: the first that answers is used (a model retired or busy passes to the next). */
export const SEEING = ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.5-flash'];
export const DRAWING = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

function keyOf(): string {
  const k = typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined;
  if (!k) throw new Error('no Gemini key where this runs: it runs under Node with GEMINI_API_KEY set (the environment\'s secrets); a page holds no keys');
  return k;
}
const b64 = (u: Uint8Array): string => { if (typeof Buffer !== 'undefined') return Buffer.from(u).toString('base64'); let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s: string): Uint8Array => (typeof Buffer !== 'undefined' ? new Uint8Array(Buffer.from(s, 'base64')) : Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0)));

/** A picture as PNG bytes: PNG bytes as they are, a picture of pixels (a render's RGB, a photograph's RGBA), or a data URL. */
export function pngOf(x: unknown): Uint8Array {
  if (x instanceof Uint8Array) return x;
  if (typeof x === 'string' && x.startsWith('data:image/png;base64,')) return unb64(x.slice(22));
  const p = x as { w?: number; h?: number; rgb?: Uint8Array; rgba?: Uint8Array; png?: Uint8Array };
  if (p?.png instanceof Uint8Array) return p.png;
  if (p?.w && p.h && p.rgb) return encodePng(p.w, p.h, p.rgb);
  if (p?.w && p.h && p.rgba) { const rgb = new Uint8Array(p.w * p.h * 3); for (let k = 0; k < p.w * p.h; k++) rgb.set(p.rgba.subarray(k * 4, k * 4 + 3), k * 3); return encodePng(p.w, p.h, rgb); }
  throw new Error('not a picture (wire a render, a photograph or PNG bytes)');
}

type Reply = { candidates?: { content?: { parts?: { text?: string; inlineData?: { mimeType: string; data: string } }[] } }[]; error?: { status?: string; message?: string } };
/** One call to the first of `models` that answers. A model gone or busy passes to the next; anything else is said. */
async function call(models: string[], body: object, signal?: AbortSignal): Promise<{ r: Reply; model: string; ms: number }> {
  // (each model has its own quota: one spent, gone or busy passes to the next; a quota by the minute, asked to wait,
  // waited once, up to a minute)
  const key = keyOf(), said: string[] = [];
  for (let round = 0; round < 2; round++) {
    let wait = 0; said.length = 0;
    for (const m of models) {
      const t0 = Date.now(), res = await fetch(`${API}/${m}:generateContent`, { method: 'POST', headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
      const r = await res.json() as Reply & { error?: { details?: { retryDelay?: string }[] } };
      if (!r.error) return { r, model: m, ms: Date.now() - t0 };
      said.push(`${m}: ${r.error.status} ${String(r.error.message ?? '').split('.')[0]}`);
      if (!/NOT_FOUND|UNAVAILABLE|INTERNAL|RESOURCE_EXHAUSTED/.test(r.error.status ?? '')) { round = 2; break; }
      const d = r.error.details?.find((x) => x.retryDelay)?.retryDelay; if (d) wait = Math.max(wait, parseFloat(d) * 1000);
    }
    if (round > 0 || !wait || wait > 60_000) break;
    await new Promise((ok) => setTimeout(ok, wait + 500));
  }
  throw new Error(`Gemini did not answer: ${said.join('; ')}`);
}

/** Pictures looked at, and a question about them answered in words (or JSON, asked for). */
export async function see(pictures: unknown[], prompt: string, o: { json?: boolean; temperature?: number; signal?: AbortSignal } = {}): Promise<{ text: string; model: string; ms: number }> {
  const parts = [...pictures.map((x) => ({ inline_data: { mime_type: 'image/png', data: b64(pngOf(x)) } })), { text: prompt }];
  const { r, model, ms } = await call(SEEING, { contents: [{ parts }], generationConfig: { ...(o.json ? { responseMimeType: 'application/json' } : {}), temperature: o.temperature ?? 1 } }, o.signal);
  return { text: r.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '', model, ms };
}
/** A picture drawn from words: its PNG (or what the model gave), and whatever it said with it. */
export async function draw(prompt: string, o: { signal?: AbortSignal } = {}): Promise<{ png: Uint8Array; said: string; model: string; ms: number }> {
  const { r, model, ms } = await call(DRAWING, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }, o.signal);
  const parts = r.candidates?.[0]?.content?.parts ?? [], im = parts.find((p) => p.inlineData);
  if (!im?.inlineData) throw new Error(`${model} drew nothing${parts.length ? `: ${parts.map((p) => p.text ?? '').join(' ').slice(0, 160)}` : ''}`);
  return { png: unb64(im.inlineData.data), said: parts.map((p) => p.text ?? '').join(' ').trim(), model, ms };
}

// ---- judged blind, as a measurement --------------------------------------------------------------------------------------
export interface Criterion { name: string; says: string }
/** Criteria as lines, "name: what it means" (the name alone where it says itself). */
export const criteriaOf = (text: string): Criterion[] => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const k = l.indexOf(':'); return k > 0 ? { name: l.slice(0, k).trim(), says: l.slice(k + 1).trim() } : { name: l, says: '' }; });
/** Student's t at 97.5 % for n − 1 degrees of freedom (n judges): the 95 % interval's half-width is t s / √n. */
const T975 = [NaN, NaN, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262];
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !['look', 'looks', 'appear', 'appears', 'with', 'that', 'than', 'this', 'from', 'they', 'which', 'there', 'their', 'rather'].includes(w)));
export interface Judged { what: string[]; rows: { criterion: string; mean: number; sd: number; lo: number; hi: number; n: number }[]; overall: number; agreement: number; faults: { fault: string; judges: number }[]; model: string; ms: number; raw: unknown[] }
/** Pictures judged on criteria by `judges` judges apart, each told nothing but the pictures and the criteria. */
export async function judgeBlind(pictures: unknown[], criteria: Criterion[], judges = 3, signal?: AbortSignal): Promise<Judged> {
  if (!pictures.length) throw new Error('give it a picture to judge'); if (!criteria.length) throw new Error('give it criteria, a line each');
  const ask = `You are shown ${pictures.length} picture${pictures.length > 1 ? 's' : ''} (numbered 1 to ${pictures.length} in the order given) and are told nothing else about them. First say plainly what the thing is. Then score it 0 to 10 on each criterion below: 0 absent or plainly wrong, 5 passable but plainly made, 10 as good as the best real example. Be strict, and score only what you can see.\n${criteria.map((c) => `- ${c.name}${c.says ? `: ${c.says}` : ''}`).join('\n')}\nThen list what is wrong, each fault in a few words. Answer only as JSON: {"what": "...", "scores": {${criteria.map((c) => `"${c.name}": 0`).join(', ')}}, "faults": ["..."]}`;
  const t0 = Date.now(), raw: unknown[] = []; let model = '';
  const answers = await Promise.all(Array.from({ length: Math.max(1, judges) }, async () => { const r = await see(pictures, ask, { json: true, temperature: 1, signal }); model = r.model; const j = JSON.parse(r.text.replace(/^```json|```$/g, '')) as { what?: string; scores?: Record<string, number>; faults?: string[] }; raw.push(j); return j; }));
  const rows = criteria.map((c) => { const xs = answers.map((a) => Number(a.scores?.[c.name])).filter(Number.isFinite), n = xs.length, mean = n ? xs.reduce((s, x) => s + x, 0) / n : NaN, sd = n > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0, half = n > 1 ? ((T975[Math.min(n, 10)] ?? 2) * sd) / Math.sqrt(n) : NaN;
    return { criterion: c.name, mean: +mean.toFixed(2), sd: +sd.toFixed(2), lo: +Math.max(0, mean - half).toFixed(2), hi: +Math.min(10, mean + half).toFixed(2), n }; });
  // (a fault two judges both name, in words they share, said once with how many named it)
  const all = answers.flatMap((a, j) => (a.faults ?? []).map((f) => ({ f: String(f), j, w: words(String(f)) }))), groups: { fault: string; js: Set<number>; w: Set<string> }[] = [];
  for (const x of all) { const g = groups.find((q) => { let both = 0; for (const w of x.w) if (q.w.has(w)) both++; return both >= 2 || (both >= 1 && Math.min(x.w.size, q.w.size) <= 2); }); if (g) { g.js.add(x.j); for (const w of x.w) g.w.add(w); } else groups.push({ fault: x.f, js: new Set([x.j]), w: new Set(x.w) }); }
  const ok = rows.filter((r) => Number.isFinite(r.mean)), overall = ok.length ? ok.reduce((s, r) => s + r.mean, 0) / ok.length : NaN, agreement = ok.length ? 1 - Math.min(1, ok.reduce((s, r) => s + r.sd, 0) / ok.length / 5) : 0;
  return { what: answers.map((a) => String(a.what ?? '')), rows, overall: +overall.toFixed(2), agreement: +agreement.toFixed(2), faults: groups.sort((a, b) => b.js.size - a.js.size).map((g) => ({ fault: g.fault, judges: g.js.size })), model, ms: Date.now() - t0, raw };
}

// ---- nodes -------------------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
const node = (b: Omit<BlockDef, 'version' | 'by' | 'pure'>) => register({ version: 1, by: 'built in', pure: false, ...b } as BlockDef);
const MODEL_CODE = { scheme: 'ACM CCS 2012' as const, code: '10010147.10010178.10010224', label: 'Computing methodologies: computer vision' };
const listOf = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);
const CRITERIA = 'recognisable: a person names it at a glance\nproportions: its sizes and spacing plausible for a real one\nsurface: its skin smooth, even and true where it should be\ndetail: the parts a real one has, drawn\nfit: nothing floating, detached, intersecting or tacked on';

node({ id: 'ai.judge', name: 'Blind judge (vision model)', kind: 'critic', ability: 'check', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday', 'software', 'intelligence'],
  spec: { gloss: 'What does someone who knows nothing of it say it is, and how good is it, on each criterion?', discipline: 'intelligence.evaluation.judge', role: 'assessment', codes: [MODEL_CODE],
    model: { equations: ['each criterion: x̄ over n judges, s their spread, x̄ ± t₀.₉₇₅,ₙ₋₁ s / √n its 95 % interval', 'agreement = 1 − mean s / 5'], class: 'empirical', time: 'steady', linear: false, method: 'n independent calls to a vision model (Gemini), each shown only the pictures and the criteria; their scores gathered as a measurement', references: ['Student, The probable error of a mean, Biometrika 6, 1 (1908)', 'Zheng et al., Judging LLM-as-a-judge, NeurIPS 2023 (judges disagree; several are pooled)'] } },
  says: 'Pictures of anything (a render of a build from several sides, a photograph, a picture an image model drew) shown to a vision model that is told nothing but the criteria, several times apart: what it says the thing is, each criterion scored 0 to 10 as a measurement (its mean, spread and 95 % interval), how far the judges agree, and the faults they name, the most named first. Runs where a Gemini key is (under Node, GEMINI_API_KEY)',
  settings: [{ key: 'criteria', label: 'Criteria, a line each: name: what it means', type: 'code', default: CRITERIA }, { key: 'judges', label: 'Judges', type: 'number', default: 3 }],
  ports: { inputs: [P('pictures', 'any', { label: 'a picture, or several (views round it)' })], outputs: [P('scores', 'table'), P('overall', 'number', { label: 'mean of the criteria, 0 to 10' }), P('agreement', 'number', { label: '0 to 1' }), P('what', 'list<text>', { label: 'what each judge says it is' }), P('faults', 'table'), P('says', 'text')] },
  run: async (i, c) => { const pics = listOf(i.pictures); const j = await judgeBlind(pics, criteriaOf(String(c.set.criteria ?? CRITERIA)), Math.max(1, Math.min(10, Math.round(Number(c.set.judges ?? 3)))), c.signal);
    return { scores: j.rows, overall: j.overall, agreement: j.agreement, what: j.what, faults: j.faults, says: `${j.rows[0]?.n ?? 0} judges (${j.model}, ${(j.ms / 1000).toFixed(1)} s) call it ${j.what[0] ?? '?'}: ${j.overall}/10 overall, agreement ${j.agreement}; most named: ${j.faults.slice(0, 2).map((f) => `${f.fault} (${f.judges})`).join('; ') || 'nothing'}` }; } });

node({ id: 'ai.draw', name: 'Picture from words (image model)', kind: 'generator', ability: 'generate', domains: ['vehicles', 'mechanical', 'manufacturing', 'everyday', 'software', 'intelligence'],
  spec: { gloss: 'What does an image model draw for these words?', discipline: 'intelligence.generative', role: 'data source', codes: [MODEL_CODE] },
  says: 'Words sent to an image model (Gemini\'s), a picture back for each try: ideas to look at, judge, and model from. Its tries are separate calls, so they differ. Runs where a Gemini key with image quota is (under Node, GEMINI_API_KEY); without quota it says so, and draws nothing',
  settings: [{ key: 'prompt', label: 'Words', type: 'code', default: 'A side view of a coupe with a red aerodynamic body kit, studio light, plain grey background, the whole car in frame' }, { key: 'tries', label: 'Pictures', type: 'number', default: 1 }],
  ports: { inputs: [P('prompt', 'text', { optional: true, label: 'words (the setting, if not wired)' })], outputs: [P('pictures', 'list<record>'), P('says', 'text')] },
  run: async (i, c) => { const words = String(i.prompt ?? c.set.prompt), n = Math.max(1, Math.min(8, Math.round(Number(c.set.tries ?? 1))));
    const got = await Promise.all(Array.from({ length: n }, () => draw(words, { signal: c.signal })));
    return { pictures: got.map((g) => ({ png: g.png, said: g.said, model: g.model })), says: `${n} drawn by ${got[0]!.model} in ${(Math.max(...got.map((g) => g.ms)) / 1000).toFixed(1)} s` }; } });

node({ id: 'prompt.trial', name: 'Prompt trial (words against words)', kind: 'solver', ability: 'optimise', domains: ['software', 'vehicles', 'mechanical', 'everyday', 'intelligence'],
  spec: { gloss: 'Which way of asking draws best, and how sure is that?', discipline: 'intelligence.prompt.trial', role: 'assessment', codes: [MODEL_CODE],
    model: { equations: ['each wording: k pictures drawn, each judged blind by n judges; its score the mean over its pictures, ± its 95 % interval over them', 'a wording is better than another only where their intervals do not overlap'], class: 'empirical', time: 'steady', linear: false, method: 'drawn and judged in turn (ai.draw, ai.judge), the same criteria for every wording', references: ['Zheng et al., Judging LLM-as-a-judge, NeurIPS 2023'] } },
  says: 'Several ways of asking an image model for the same thing (a line each; {it} stands for the thing named), each drawn several times and every picture judged blind on the same criteria: the wordings ranked by their score with its 95 % interval, which beat which for certain (their intervals apart), and the best pictures. What draws its best, found by measuring, not by guessing',
  settings: [{ key: 'it', label: 'The thing ({it})', type: 'text', default: 'a sports coupe with an aerodynamic body kit' }, { key: 'wordings', label: 'Wordings, a line each', type: 'code', default: '{it}\nA side view of {it}, studio light, plain background, the whole of it in frame\nAn engineering concept render of {it}: every panel, vent and seam drawn as it would be made, side view, plain background\nInvent {it} no one has built yet, with a technology that makes it better, drawn as a real photograph' },
    { key: 'tries', label: 'Pictures for each wording', type: 'number', default: 3 }, { key: 'judges', label: 'Judges for each picture', type: 'number', default: 2 }, { key: 'criteria', label: 'Criteria, a line each', type: 'code', default: CRITERIA + '\ninvention: an idea in it that is new and would work' }],
  ports: { inputs: [], outputs: [P('ranked', 'table'), P('best', 'text', { label: 'the best wording' }), P('pictures', 'list<record>', { label: 'the best wording\'s pictures' }), P('says', 'text')] },
  run: async (_i, c) => {
    const it = String(c.set.it ?? ''), ws = String(c.set.wordings ?? '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/\{it\}/g, it)), k = Math.max(1, Math.min(6, Math.round(Number(c.set.tries ?? 3)))), n = Math.max(1, Math.min(5, Math.round(Number(c.set.judges ?? 2)))), crit = criteriaOf(String(c.set.criteria ?? CRITERIA));
    if (ws.length < 2) throw new Error('give it two wordings or more, a line each');
    const results: { wording: string; scores: number[]; pics: unknown[] }[] = [];
    for (const w of ws) { const pics: unknown[] = [], scores: number[] = [];
      for (let t = 0; t < k; t++) { const d = await draw(w, { signal: c.signal }); pics.push({ png: d.png }); scores.push((await judgeBlind([d.png], crit, n, c.signal)).overall); }
      results.push({ wording: w, scores, pics }); }
    const rows = results.map((r) => { const m = r.scores.reduce((s, x) => s + x, 0) / r.scores.length, sd = r.scores.length > 1 ? Math.sqrt(r.scores.reduce((s, x) => s + (x - m) ** 2, 0) / (r.scores.length - 1)) : 0, half = r.scores.length > 1 ? ((T975[Math.min(r.scores.length, 10)] ?? 2) * sd) / Math.sqrt(r.scores.length) : NaN;
      return { wording: r.wording, score: +m.toFixed(2), lo: +(m - half).toFixed(2), hi: +(m + half).toFixed(2), pictures: r.scores.length, pics: r.pics }; }).sort((a, b) => b.score - a.score);
    const top = rows[0]!, sure = rows.slice(1).every((r) => r.hi < top.lo);
    return { ranked: rows.map(({ pics: _p, ...r }) => r), best: top.wording, pictures: top.pics, says: `best of ${rows.length} wordings: "${top.wording.slice(0, 60)}" ${top.score}/10 (${top.lo} to ${top.hi}); ${sure ? 'better than every other for certain' : 'not certainly better than the next (their intervals overlap): more pictures would tell'}` };
  } });
