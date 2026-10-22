// THE LOCAL MODEL'S CONTROLS, in a page. The model runs on the person's own machine (`bash tools/local-llm.sh` puts
// it there and serves it); this is where the page is told its address, and where it says whether it answers.
//
// It is kept apart from `ask/mind.ts` on purpose: that file owns talking to a model and the boundary on what a model
// is allowed to answer, and it must stay runnable with no browser (the CLI uses it). This owns the browser side —
// where the address is kept, and the one control that shows whether it is reachable.
//
// Owner of: the local model's address in a page, and the panel that sets it.

import { mindAt, reachable, type MindAt } from '../ask/mind';

const URL_KEY = 'nexus-mind-url', MODEL_KEY = 'nexus-mind-model';
/** ollama's own default, so the ordinary case needs nothing typed. */
export const DEFAULT_URL = 'http://127.0.0.1:11434';

const read = (k: string): string | undefined => { try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; } };
const keep = (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage refused */ } };

/** Where the model is, as this browser was told. Null is the ordinary answer and every caller works without one. */
export function mindFromBrowser(): MindAt | null {
  return mindAt({ NEXUS_MIND_URL: read(URL_KEY) ?? DEFAULT_URL, NEXUS_MIND_MODEL: read(MODEL_KEY) });
}

/** Models worth trying first on a machine with a GPU, smallest last, with what each one needs. The names are
 *  ollama's own tags; `tools/local-llm.sh` picks from the same list by what the hardware has. */
export const MODELS: [string, string][] = [
  ['qwen3:8b', 'about 6 GB — a good reader if the GPU has the room'],
  ['qwen3:4b', 'about 3 GB — the one to start with'],
  ['llama3.2:3b', 'about 2 GB'],
  ['qwen3:1.7b', 'about 1.4 GB — runs on CPU alone'],
  ['gemma3:1b', 'about 0.8 GB — the smallest that still picks words reliably'],
];

export function mindBoxHtml(): string {
  const at = mindFromBrowser();
  return `<details class="mind" ${at ? '' : 'open'}>
    <summary>Local model <span class="pill" id="mindsay">${at ? `${at.model}` : 'not set up'}</span></summary>
    <p class="hint">It runs on your own machine and costs nothing per call. One command sets it up:
      <code>bash tools/local-llm.sh</code> — it looks at your GPU and memory, picks a model that fits, installs
      <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama</a>, serves it, and prints the two lines below.
      Nothing here needs it: a pipeline's <b>ask</b> step is the only thing that uses it, and every size, force and
      price is worked out by the engine either way.</p>
    <div class="row">
      <label>at <input id="mindurl" placeholder="${DEFAULT_URL}" value="${read(URL_KEY) ?? ''}" spellcheck="false"></label>
      <label>model <input id="mindmodel" list="mindlist" placeholder="qwen3:4b" value="${read(MODEL_KEY) ?? ''}" spellcheck="false"></label>
      <datalist id="mindlist">${MODELS.map(([m, w]) => `<option value="${m}">${w}</option>`).join('')}</datalist>
      <button id="mindtest" type="button">Test</button>
    </div>
    <p class="hint">Serving it to a page needs one more thing, because a browser will not call a port it was not
      invited to: start it with <code>OLLAMA_ORIGINS='*' ollama serve</code> (the script does this for you).</p>
  </details>`;
}

/** Wire the panel up. `onChange` is called when the address changes, so a page can re-draw what depends on it. */
export function wireMindBox(el: ParentNode, onChange: () => void = () => undefined): void {
  const url = el.querySelector<HTMLInputElement>('#mindurl'), model = el.querySelector<HTMLInputElement>('#mindmodel');
  const say = el.querySelector<HTMLElement>('#mindsay'), test = el.querySelector<HTMLElement>('#mindtest');
  if (!url || !model || !say || !test) return;
  const settled = () => {
    keep(URL_KEY, url.value.trim()); keep(MODEL_KEY, model.value.trim());
    const at = mindFromBrowser();
    say.textContent = at ? at.model : 'not set up';
    onChange();
  };
  url.addEventListener('change', settled); model.addEventListener('change', settled);
  test.addEventListener('click', async () => {
    settled();
    const at = mindFromBrowser();
    if (!at) { say.textContent = 'say which model'; return; }
    say.textContent = 'asking…';
    const t0 = Date.now();
    const ok = await reachable(at);
    say.textContent = ok ? `${at.model}, answered in ${Date.now() - t0} ms` : `${at.model} did not answer`;
  });
}
