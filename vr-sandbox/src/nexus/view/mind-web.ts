// QWEN, RUNNING IN THIS BROWSER. No install, no terminal, no server: WebGPU runs the model on your own graphics
// card, the weights are fetched once and kept in the browser's cache, and nothing you type leaves the machine.
//
// WHY THIS AND NOT ONLY OLLAMA. `tools/local-llm.sh` installs ollama and serves a model at 127.0.0.1, which is
// faster and better, and it stays. But it is a terminal, a download and an `OLLAMA_ORIGINS` flag before anything
// happens, and it cannot work at all from a page open on a phone or in a headset, because 127.0.0.1 there is the
// phone or the headset. This path asks for one press.
//
// THE BOUNDARY IS UNCHANGED AND IS NOT WEAKENED BY BEING EASY. What comes back is words: a pipeline's `ask` step,
// and `pickFrom`'s choice out of a closed list. No sampled token becomes a size, a mass, a price or a step in a
// lesson — `substrate/flows.ts`'s `evaluate` reads a step's text only as a substring test, and every number a check
// compares comes from the engine's own `facts()` (CLAUDE.md, 2026-10-21).
//
// Owner of: running a model inside the page, and what it costs to start one.

import type { Ask, MindAt } from '../ask/mind';

/** The address that means "in this browser" rather than a server. `ask/mind.ts` treats a MindAt as opaque, so this
 *  rides the same path as ollama with no special case anywhere else. */
export const IN_BROWSER = 'in-this-browser';
export const isInBrowser = (at: MindAt | null): boolean => at?.url === IN_BROWSER;

/** The Qwen builds worth offering, smallest first, with what each wants of the graphics card. The sizes are
 *  web-llm's own `vram_required_MB`, not figures typed here. */
export interface Build { id: string; says: string; gb: number }
export const QWEN: Build[] = [
  { id: 'Qwen3-0.6B-q4f16_1-MLC', says: 'tiny — runs on almost anything, and reads well enough to pick a word', gb: 1.4 },
  { id: 'Qwen3-1.7B-q4f16_1-MLC', says: 'small', gb: 2.0 },
  { id: 'Qwen3-4B-q4f16_1-MLC', says: 'the one to use if your card has the room', gb: 3.4 },
  { id: 'Qwen3-8B-q4f16_1-MLC', says: 'big — a good card only', gb: 5.6 },
];

/** Whether this browser can run one at all. WebGPU is the whole requirement; Chrome, Edge and the Quest browser
 *  have it, Safari has it from 18, and Firefox is still behind a flag at the time of writing. */
export function canRunHere(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

type Engine = { chat: { completions: { create(o: unknown): Promise<{ choices: { message: { content?: string } }[] }> } }; };
let engine: Engine | null = null;
let loadedId = '';
let loading: Promise<Engine> | null = null;

export interface Loading { pct: number; says: string }

/** Load a build, telling you how it is going. The first time pulls the weights (the gigabytes above) and the browser
 *  keeps them, so every time after is seconds. Loading the one already loaded does nothing. */
export async function load(id: string, on: (l: Loading) => void = () => undefined): Promise<Engine> {
  if (engine && loadedId === id) return engine;
  if (loading) return loading;
  if (!canRunHere()) throw new Error('this browser has no WebGPU, so it cannot run a model itself — use ollama, or open it in Chrome, Edge or the Quest browser');
  loading = (async () => {
    on({ pct: 0, says: 'starting…' });
    // loaded only now: a page that never asks for a model never pays for the library either
    const webllm = await import('@mlc-ai/web-llm');
    const made = await webllm.CreateMLCEngine(id, {
      initProgressCallback: (r: { progress: number; text: string }) =>
        on({ pct: Math.round((r.progress ?? 0) * 100), says: r.text ?? '' }),
    });
    engine = made as unknown as Engine; loadedId = id;
    on({ pct: 100, says: 'ready' });
    return engine;
  })().finally(() => { loading = null; });
  return loading;
}

export const isLoaded = (id?: string): boolean => !!engine && (!id || loadedId === id);
export const whatIsLoaded = (): string => (engine ? loadedId : '');

/** The transport, in the shape `ask/mind.ts` already talks: it does not know or care that this one is in the page.
 *  Refuses rather than loads, because a pipeline step must not quietly begin a 3 GB download — the person presses
 *  the button that starts that, once. */
export const askInBrowser: Ask = async (at, prompt, ms, json = true) => {
  if (!engine || loadedId !== at.model) return null;
  const stop = new AbortController(), t = setTimeout(() => stop.abort(), ms);
  try {
    const out = await engine.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      temperature: json ? 0 : 0.4,
      max_tokens: json ? 160 : 700,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    });
    return out.choices[0]?.message?.content ?? null;
  } catch { return null; } finally { clearTimeout(t); }
};
