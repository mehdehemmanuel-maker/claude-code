// A LANGUAGE MODEL ON THE USER'S OWN HARDWARE, allowed to do exactly one kind of job.
//
// `tools/local-llm.sh` puts the model on the user's machine and serves it at 127.0.0.1. This is the client, and it
// is deliberately narrow: **it CHOOSES from vocabularies this engine already owns, and it never supplies a value.**
// CLAUDE.md's standing rule of 2026-10-21 says why, and this file is that rule written as code rather than prose:
//
//   - `choose` takes a closed list and returns only members of it. Whatever the model says, anything not in the
//     list is dropped before the caller sees it, so a hallucinated verb cannot reach the composer. That is a
//     guarantee from the filter, not a hope about the model, and it holds for any model at any size.
//   - There is NO function here that returns a number, and there must never be. A dimension, a mass, a price or a
//     step in a lesson out of a sampled token would be a guess wearing the clothes of a measurement, and the whole
//     worth of this tree is that it does not do that (ask 9).
//   - Every call can fail. The model is on a machine that may be asleep, busy or absent; `reachable()` is false and
//     every verb answers null. **The caller must work without it** — the regex readers stay, and the model only
//     ever sharpens them.
//
// Owner of: talking to a local model, and the boundary on what it is allowed to answer.

/** What a local model is asked to pick from: a closed list, and what the pick is about. */
export interface Choice<T extends string> {
  /** the only answers that will be accepted — anything else the model says is dropped */ from: readonly T[];
  /** the words to read */ text: string;
  /** what the list is, said to the model in one line */ about: string;
  /** more than one may apply */ many?: boolean;
}

export interface MindAt { url: string; model: string }

/** Where the model is, from the environment the user's own script sets. Null when nothing is configured, which is
 *  the ordinary case in this container and must stay unexceptional. */
export function mindAt(env: Record<string, string | undefined> = globalThis.process?.env ?? {}): MindAt | null {
  const url = env.NEXUS_MIND_URL?.replace(/\/+$/, ''), model = env.NEXUS_MIND_MODEL;
  return url && model ? { url: /^https?:\/\//.test(url) ? url : `http://${url}`, model } : null;
}

/** The transport, injectable so the boundary can be TESTED against a model that misbehaves — which is the only way
 *  to know the filter holds, since a well-behaved model proves nothing about what happens when one is not. */
export type Ask = (at: MindAt, prompt: string, ms: number, /** ask for JSON back: true where the answer is a pick, false where it is prose */ json?: boolean) => Promise<string | null>;

/** ollama's own endpoint. `format: json` asks for JSON; `temperature: 0` asks for the same answer twice. Neither is
 *  trusted — both only raise the odds that the filter below has something to keep. */
export const askOllama: Ask = async (at, prompt, ms, json = true) => {
  const stop = new AbortController(), t = setTimeout(() => stop.abort(), ms);
  try {
    const r = await fetch(`${at.url}/api/generate`, {
      method: 'POST', signal: stop.signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: at.model, prompt, stream: false, ...(json ? { format: 'json' } : {}), options: { temperature: json ? 0 : 0.4, num_predict: json ? 160 : 700 } }),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { response?: unknown };
    return typeof j.response === 'string' ? j.response : null;
  } catch { return null; } finally { clearTimeout(t); }
};

/** Is there a model to talk to, and does it answer? Never throws, and false is an ordinary answer. */
export async function reachable(at: MindAt | null = mindAt(), ask: Ask = askOllama, ms = 20_000): Promise<boolean> {
  if (!at) return false;
  const got = await ask(at, 'Reply only {"ok":true}', ms);
  return typeof got === 'string' && /"ok"\s*:\s*true/i.test(got);
}

/** THE FILTER, and the whole guarantee. Every string the model produced, anywhere in its answer, intersected with
 *  the closed list — so the result is a subset of `from` by construction and cannot be anything else.
 *
 *  It reads the answer three ways because a small model writes JSON three ways: a bare array, an object with one
 *  array in it, and a sentence with the words in it. The last is why it falls back to scanning for whole words
 *  rather than failing: a model that answers `the verbs are cut and grip` has told us what we asked, and refusing
 *  that on formatting grounds would throw away a right answer. A word is matched whole (`\bcut\b`), so `cutter`
 *  does not count as `cut`.
 *
 *  THE COST OF THAT THIRD SHAPE, said rather than hidden: scanning a sentence cannot tell an ANSWER from an
 *  incidental use, so "I think it should use a laser" yields `think`, because `think` is a verb a machine can do
 *  and the sentence contains it. It is bounded — the worst case is a word FROM the closed list that the sentence
 *  did not mean, never an invented word and never a value — and JSON, which the prompt asks for and `format: json`
 *  makes likely, does not have it. A test asserts the false positive so it stays visible. */
export function keepOnly<T extends string>(said: string | null, from: readonly T[]): T[] {
  if (!said) return [];
  const out: T[] = [];
  let pool = said;
  try {
    const j: unknown = JSON.parse(said);
    const flat = (v: unknown): string[] =>
      typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(flat)
        : v && typeof v === 'object' ? Object.values(v as Record<string, unknown>).flatMap(flat) : [];
    const words = flat(j);
    if (words.length) pool = words.join(' ');
  } catch { /* not JSON: scan the sentence, which is the third shape */ }
  for (const k of from) {
    const safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${safe}([^a-z0-9]|$)`, 'i').test(pool) && !out.includes(k)) out.push(k);
  }
  return out;
}

/** Pick from a closed list. Returns the members the model chose, [] where it chose none, and [] where there is no
 *  model — the caller cannot tell the last two apart on purpose, because both mean "decide it yourself". */
export async function pickFrom<T extends string>(c: Choice<T>, at: MindAt | null = mindAt(), ask: Ask = askOllama, ms = 60_000): Promise<T[]> {
  if (!at) return [];
  const list = c.from.join(', ');
  const prompt = [
    `${c.about}`,
    `The only allowed answers are: ${list}`,
    `Sentence: ${c.text}`,
    c.many ? `Which allowed answers does the sentence ask for? There may be more than one, or none.`
           : `Which ONE allowed answer fits the sentence best? There may be none.`,
    `Reply with JSON only, in the form {"pick":[...]}, using only words from the allowed list. No explanation.`,
  ].join('\n');
  const said = await ask(at, prompt, ms);
  const kept = keepOnly(said, c.from);
  return c.many ? kept : kept.slice(0, 1);
}

/** What a choice cost and whether a model made it — for a door that has to say which answered, the model or the
 *  pattern. A round that cannot tell them apart cannot report honestly on either. */
export interface Chosen<T extends string> { pick: T[]; by: 'model' | 'nothing'; ms: number; at: MindAt | null }

export async function pickFromSaying<T extends string>(c: Choice<T>, at: MindAt | null = mindAt(), ask: Ask = askOllama): Promise<Chosen<T>> {
  const t0 = Date.now();
  const pick = await pickFrom(c, at, ask);
  return { pick, by: at && pick.length ? 'model' : 'nothing', ms: Date.now() - t0, at };
}

// ---- free words, for the one job that is words ------------------------------------------------------------------

/** WHAT A LOCAL MODEL MAY WRITE IN ITS OWN WORDS, and why this is not a hole in the rule above.
 *
 *  A pipeline's `ai` step produces PROSE — a note, a review, a summary of what the run found — and prose is the one
 *  thing a sampled token legitimately is. The rule that matters is unchanged, and it is enforced downstream rather
 *  than promised here: `substrate/flows.ts`'s `evaluate` reads a step's output ONLY as a substring test ("output
 *  contains wheel"); every number a check compares comes from `api.facts()`, which the engine computes. So there is
 *  no path from this text to a dimension, a mass or a price, and a model saying "the mass is 400 kg" cannot make the
 *  mass 400 kg — it can only put those words on a card.
 *
 *  Returns null where there is no model, where it is unreachable, or where it answered nothing: the caller shows the
 *  step as unanswered rather than inventing one. */
export async function say(prompt: string, input: string, at: MindAt | null = mindAt(), ask: Ask = askOllama, ms = 120_000): Promise<string | null> {
  if (!at) return null;
  const said = await ask(at, input.trim() ? `${prompt.trim()}\n\n${input.trim()}` : prompt.trim(), ms, false);
  const text = (said ?? '').trim();
  if (!text) return null;
  // Prose is asked for without `format: json`, but a model told to be helpful still sometimes wraps it in
  // {"...": "..."} — unwrap it to the longest string it holds rather than showing the person a JSON object.
  try {
    const j: unknown = JSON.parse(text);
    const flat = (v: unknown): string[] => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(flat)
      : v && typeof v === 'object' ? Object.values(v as Record<string, unknown>).flatMap(flat) : [];
    const longest = flat(j).sort((a, b) => b.length - a.length)[0];
    if (longest && longest.trim()) return longest.trim();
  } catch { /* not JSON, which is the ordinary case for prose */ }
  return text;
}
