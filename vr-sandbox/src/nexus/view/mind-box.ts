// THE MODEL'S CONTROLS, in a page. Two ways to have one, and the panel is honest about what each costs you.
//
//   IN THIS BROWSER   Qwen on WebGPU. One press, nothing installed, works on a laptop and in the Quest browser.
//                     The weights come down once (1.4–5.6 GB) and the browser keeps them.
//   ON THIS MACHINE   ollama at 127.0.0.1, which `tools/local-llm.sh` sets up. Faster, and the better answer where
//                     you have a terminal — but it cannot be reached from a page open on another device, because
//                     127.0.0.1 there is that device.
//
// It is kept apart from `ask/mind.ts` because that file owns talking to a model and the boundary on what one is
// allowed to answer, and must stay runnable with no browser at all (the CLI uses it). This owns the browser side.
//
// Owner of: which model this page uses, and the panel that chooses it.

import { mindAt, reachable, type Ask, type MindAt } from '../ask/mind';
import { IN_BROWSER, QWEN, askInBrowser, canRunHere, isLoaded, load, whatIsLoaded } from './mind-web';

const URL_KEY = 'nexus-mind-url', MODEL_KEY = 'nexus-mind-model', WAY_KEY = 'nexus-mind-way';
/** ollama's own default, so the ordinary case needs nothing typed. */
export const DEFAULT_URL = 'http://127.0.0.1:11434';
type Way = 'browser' | 'ollama';

const read = (k: string): string | undefined => { try { return localStorage.getItem(k) ?? undefined; } catch { return undefined; } };
const keep = (k: string, v: string) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* storage refused */ } };
const wayNow = (): Way => (read(WAY_KEY) === 'ollama' ? 'ollama' : 'browser');

/** Where the model is. For the in-browser one this answers only once it is actually loaded, so a step never waits
 *  on a download nobody started. */
export function mindFromBrowser(): MindAt | null {
  if (wayNow() === 'browser') {
    const id = read(MODEL_KEY + '-web') ?? QWEN[2]!.id;
    return isLoaded(id) ? { url: IN_BROWSER, model: id } : null;
  }
  return mindAt({ NEXUS_MIND_URL: read(URL_KEY) ?? DEFAULT_URL, NEXUS_MIND_MODEL: read(MODEL_KEY) });
}

/** Which transport that address needs — the one thing a caller must ask, and the only place the two differ. */
export function askFor(at: MindAt | null): Ask | undefined {
  return at?.url === IN_BROWSER ? askInBrowser : undefined;   // undefined = ask/mind.ts's own ollama transport
}

/** Models worth trying first with ollama, smallest last. */
export const MODELS: [string, string][] = [
  ['qwen3:8b', 'about 6 GB — a good reader if the GPU has the room'],
  ['qwen3:4b', 'about 3 GB — the one to start with'],
  ['qwen3:1.7b', 'about 1.4 GB — runs on CPU alone'],
  ['gemma3:1b', 'about 0.8 GB — the smallest that still picks words reliably'],
];

export function mindBoxHtml(): string {
  const way = wayNow(), webId = read(MODEL_KEY + '-web') ?? QWEN[2]!.id;
  const on = whatIsLoaded();
  const pill = way === 'browser'
    ? (on ? `${on.replace(/-q4f16_1-MLC$/, '')}, ready` : canRunHere() ? 'not started' : 'this browser cannot')
    : (read(MODEL_KEY) ? `${read(MODEL_KEY)}` : 'not set up');
  return `<details class="mind" ${on ? '' : 'open'}>
    <summary>Local model <span class="pill" id="mindsay">${pill}</span></summary>
    <p class="hint">A model of your own, on your own hardware, costing nothing per call. A pipeline's <b>ask</b> step
      is the only thing that uses it; every size, force and price is worked out by the engine either way.</p>
    <div class="ways">
      <button type="button" data-way="browser" class="${way === 'browser' ? 'on' : ''}">In this browser</button>
      <button type="button" data-way="ollama" class="${way === 'ollama' ? 'on' : ''}">On this machine</button>
    </div>
    ${way === 'browser' ? `
      <p class="hint">Qwen runs on your graphics card, here in the page. Nothing to install; the weights come down
        once and your browser keeps them. ${canRunHere() ? '' : '<b>This browser has no WebGPU</b> — use Chrome, Edge or the Quest browser, or the other way.'}</p>
      <div class="row">
        <label>which <select id="webmodel">${QWEN.map((q) => `<option value="${q.id}" ${q.id === webId ? 'selected' : ''}>${q.id.replace(/-q4f16_1-MLC$/, '')} · ${q.gb} GB · ${q.says}</option>`).join('')}</select></label>
        <button id="webload" type="button" ${canRunHere() ? '' : 'disabled'}>${on === webId ? 'loaded' : 'Start it'}</button>
      </div>
      <div class="bar-load" id="loadbar" hidden><span></span></div>
      <p class="hint" id="loadsay"></p>`
    : `
      <p class="hint">One command sets it up: <code>bash tools/local-llm.sh</code> — it looks at your GPU and memory,
        picks a model that fits, installs <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama</a>,
        serves it, and prints the two lines below. It must be the same machine this page is open on.</p>
      <div class="row">
        <label>at <input id="mindurl" placeholder="${DEFAULT_URL}" value="${read(URL_KEY) ?? ''}" spellcheck="false"></label>
        <label>model <input id="mindmodel" list="mindlist" placeholder="qwen3:4b" value="${read(MODEL_KEY) ?? ''}" spellcheck="false"></label>
        <datalist id="mindlist">${MODELS.map(([m, w]) => `<option value="${m}">${w}</option>`).join('')}</datalist>
        <button id="mindtest" type="button">Test</button>
      </div>
      <p class="hint">A browser will not call a port it was not invited to, so serve it with
        <code>OLLAMA_ORIGINS='*' ollama serve</code> (the script does this for you).</p>`}
  </details>`;
}

/** Wire the panel up. `onChange` is called when the model changes, so a page can re-draw what depends on it. */
export function wireMindBox(el: ParentNode, onChange: () => void = () => undefined): void {
  const say = el.querySelector<HTMLElement>('#mindsay');
  for (const b of el.querySelectorAll<HTMLElement>('[data-way]')) {
    b.addEventListener('click', () => { keep(WAY_KEY, b.dataset.way!); onChange(); });
  }

  // ---- in this browser
  const pick = el.querySelector<HTMLSelectElement>('#webmodel');
  const start = el.querySelector<HTMLElement>('#webload');
  const bar = el.querySelector<HTMLElement>('#loadbar'), lsay = el.querySelector<HTMLElement>('#loadsay');
  pick?.addEventListener('change', () => { keep(MODEL_KEY + '-web', pick.value); onChange(); });
  start?.addEventListener('click', () => {
    const id = pick?.value ?? QWEN[2]!.id;
    keep(MODEL_KEY + '-web', id);
    (start as HTMLButtonElement).disabled = true;
    if (bar) bar.hidden = false;
    void load(id, (l) => {
      const fill = bar?.firstElementChild as HTMLElement | undefined;
      if (fill) fill.style.width = `${l.pct}%`;
      if (lsay) lsay.textContent = l.says;
      if (say) say.textContent = l.pct >= 100 ? `${id.replace(/-q4f16_1-MLC$/, '')}, ready` : `${l.pct}%`;
    }).then(() => { if (lsay) lsay.textContent = 'ready — a pipeline\'s ask step will use it now'; onChange(); })
      .catch((e: Error) => { if (lsay) lsay.textContent = e.message; (start as HTMLButtonElement).disabled = false; });
  });

  // ---- on this machine
  const url = el.querySelector<HTMLInputElement>('#mindurl'), model = el.querySelector<HTMLInputElement>('#mindmodel');
  const test = el.querySelector<HTMLElement>('#mindtest');
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
