// RUNNING A PIPELINE IN A PAGE. `substrate/flows.ts` owns what a pipeline IS — the steps, their order, what starts
// one, how a check is read, how a repeat goes round. It runs against a `FlowApi`, which is the hands: in the headset
// `view/forge.ts` gives it the room's. This gives it the ENGINE's, so a pipeline runs on a laptop with no room and no
// headset, and an action that genuinely needs the room says so instead of pretending.
//
// What an action does here is a real door, not a stand-in: `make` composes a machine, `buy` prices it from sellers'
// own offers, `hold` works out every way its heaviest joint can be held, `part` looks one up. The numbers are the
// numbers `npm run machine` prints, because they are the same functions.
//
// Owner of: the hands a pipeline runs with outside the room, and how a run is shown in a page.

import { composeMachine, everyUnit, machineText } from '../ask/machine';
import { Workshop, type Made, type PartRef } from '../ask/generate';
import { gravityMoment, holdsFor, holdText } from '../ask/hold';
import { heaviestJoint } from './make2d';
import { pack } from '../teach/buildpack';
import { INVENTORY } from '../parts/inventory';
import { PRICES, usd } from '../parts/prices';
import { say } from '../ask/mind';
import { mindFromBrowser } from './mind-box';
import type { FlowApi, FlowRun, StepRun } from '../substrate/flows';

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** What the run has worked out so far, so a later step reads what an earlier one made and a check has numbers to
 *  compare. Nothing here is written by a model: every figure is put in by an engine call. */
export interface Worked {
  words?: string; stages?: number; refusals?: number; lines?: number; unpriced?: number; usd?: number; stays?: number; free?: number;
  /** everything standing in the pipeline's own workshop, so the run can SHOW it rather than only say it */ shapes?: Made[];
  /** what a `count` step counted, in the order it counted them, so a loop can be drawn as it goes */ series?: { of: string; at: number[] };
}



/** ONE THING THAT HAPPENED INSIDE A STEP. The step's `output` is what it ended up saying; this is what it actually
 *  DID on the way there — the exact prompt a model was sent, the exact numbers a check read, the exact call the
 *  engine made and what came back. A run you can only read the endings of is a run you cannot learn from, and the
 *  whole point of a pipeline page is to be able to watch it work. */
export interface Trace {
  at: number; sort: 'call' | 'prompt' | 'answer' | 'facts' | 'math' | 'refused';
  /** one line, what this was */ says: string;
  /** the whole of it, where there is more: the prompt in full, the numbers, the working */ detail?: string;
  /** where it went, for a model call */ to?: string;
  ms?: number;
}

/** The hands. One instance per run, because what a step worked out is read by the steps after it. */
export function engineHands(worked: Worked = {}, parts: PartRef[] = []): FlowApi & { worked: Worked; trace: Trace[]; shop: Workshop } {
  // THE PIPELINE'S OWN WORKSHOP. `ask/generate.ts`'s Workshop is what runs every call in the catalogue — values with
  // units, matters, shapes, where they go, how they turn, patterns, joins, rules, energy, motors. It is the same
  // runner the room uses and the same one `substrate/calltest.ts` proves each call against, so a call that works
  // anywhere works here. It is given THIS pipeline's parts, which is what makes a step able to act on one build
  // rather than on the app: hand it a composed machine's parts and `place a cap on the spindle` means that spindle.
  const build: PartRef[] = [...parts];
  const shop = new Workshop({ parts: () => build });
  const trace: Trace[] = [];
  const log = (t: Omit<Trace, 'at'>) => { trace.push({ at: Date.now(), ...t }); };
  const hands = {
    worked,
    trace,
    shop,
    async act(what: string, input: string): Promise<string> {
      const t = what.trim(), low = t.toLowerCase();
      const t0 = Date.now();
      log({ sort: 'call', says: `the engine is asked: ${t}`, detail: input ? `with what the step before it said:\n${input}` : undefined });
      try { const out = await this.did(t, low, input); log({ sort: 'math', says: `it answered in ${Date.now() - t0} ms`, detail: out, ms: Date.now() - t0 }); return out; }
      catch (e) { log({ sort: 'refused', says: 'it refused', detail: (e as Error).message }); throw e; }
    },
    async did(t: string, low: string, input: string): Promise<string> {
      const rest = t.replace(/^\s*\S+\s*/, '').trim() || input.trim() || worked.words || '';
      if (/^(make|build|compose|design)\b/i.test(low)) {
        if (!rest) throw new Error('say what to make: "make a machine that cuts 400x300x80"');
        const m = composeMachine(rest);
        worked.words = rest; worked.stages = m.stages.length; worked.refusals = m.refusals.length;
        if (!m.stages.length) return `nothing was composed from those words.${m.refusals.length ? ` It will not: ${m.refusals.join('; ')}` : ''}`;
        return machineText(m);
      }
      if (/^(buy|price|cost|pack|bill)\b/i.test(low)) {
        const words = rest || worked.words;
        if (!words) throw new Error('nothing has been made yet, and no words were given to price');
        const p = pack(words);
        const lines = p.lines.filter((l) => l.section !== 'have');
        worked.lines = lines.length; worked.unpriced = lines.filter((l) => l.usd == null).length; worked.usd = p.total.all[0];
        log({ sort: 'math', says: 'the bill, added up', detail:
          `${lines.length} lines, of which ${worked.unpriced} have no seller's price kept.\n`
          + `cheapest offers:  ${usd(p.total.all[0])}\n`
          + `dearest offers:   ${usd(p.total.all[1])}\n`
          + `Every priced line is a seller's own page and the day it was seen; a line with no price is left out of`
          + ` the total and said so, rather than being guessed at.` });
        return `${lines.length} lines, ${worked.unpriced} with no seller's price, ${usd(p.total.all[0])}–${usd(p.total.all[1])}\n`
          + lines.slice(0, 12).map((l) => `  ${l.n} × ${l.what} — ${l.usd == null ? 'no price kept' : usd(l.usd)}`).join('\n');
      }
      if (/^(hold|stay|balance)\b/i.test(low)) {
        const words = rest || worked.words;
        if (!words) throw new Error('nothing has been made yet, so there is no joint to hold');
        const j = heaviestJoint(composeMachine(words));
        // the law itself, with its numbers in it, because "what math is being triggered" is a fair question
        const want = gravityMoment(j);
        log({ sort: 'math', says: 'the moment gravity puts on the joint', detail:
          `M = m · g · r\n  = ${j.kg} kg × 9.80665 m/s² × ${(j.armMm / 1000).toFixed(3)} m\n  = ${want.toFixed(2)} N·m\n`
          + `(g is the standard figure, CGPM 1901. r is the unit's own longest side, ${j.armMm} mm.)` });
        const stays = holdsFor(j);
        log({ sort: 'math', says: `${stays.length} ways of holding it were worked out`, detail: stays.map((x) => `${x.cannot ? '✗' : '✓'} ${x.name}${x.watts ? ` — ${x.watts} W` : x.cannot ? '' : ' — no power'}`).join('\n') });
        worked.stays = stays.filter((s) => !s.cannot).length;
        worked.free = stays.filter((s) => !s.cannot && !s.watts).length;
        return holdText(j);
      }
      if (/^(part|look ?up|find)\b/i.test(low)) {
        if (!rest) throw new Error('say which part');
        const q = rest.toLowerCase();
        const hits = [...INVENTORY.values()].filter((i) => i.id.includes(q) || i.name.toLowerCase().includes(q)).slice(0, 8);
        if (!hits.length) return `nothing in the library of ${INVENTORY.size.toLocaleString('en')} matches "${rest}"`;
        return hits.map((i) => `${i.id} — ${i.name} (${i.path.join(' › ')})${PRICES[i.id] ? ', priced' : ''}`).join('\n');
      }
      if (/^count\b/i.test(low)) {
        // a loop's step: count one more, and keep the run of them so the page can draw it going round
        const of = rest || 'rounds';
        const sr = worked.series && worked.series.of === of ? worked.series : { of, at: [] };
        sr.at.push(sr.at.length + 1); worked.series = sr;
        return `${of}: ${sr.at.length}`;
      }
      if (/^(say|note|report|store|board|if|rule|calc|set)\b/i.test(low)) return rest || input || t;
      if (/^wait\b/i.test(low)) { const s = Number(t.match(/([\d.]+)\s*s/)?.[1] ?? 1); await new Promise((ok) => setTimeout(ok, Math.min(5, s) * 1000)); return `waited ${Math.min(5, s)} s`; }
      // EVERYTHING ELSE GOES TO THE WORKSHOP, which is the whole call catalogue (`substrate/calls.ts`) rather than a
      // list I chose. A call it cannot read says so in its own words, which name what it could not read and why —
      // far better than a list of six verbs, and it grows whenever the catalogue does.
      const before = shop.all().made.length;
      const said = shop.run(t, 'this pipeline');
      const now = shop.all();
      worked.shapes = now.made;
      if (now.made.length !== before) {
        const last = now.made.at(-1);
        if (last) log({ sort: 'math', says: `${last.name}: where it is and what it weighs`, detail:
          `kind      ${last.kind} (${last.word})\n`
          + `size      ${(last.local.w * 1e3).toFixed(1)} × ${(last.local.h * 1e3).toFixed(1)} × ${(last.local.d * 1e3).toFixed(1)} mm\n`
          + `at        ${last.at.map((v) => `${(v * 1e3).toFixed(0)} mm`).join(', ')}\n`
          + `volume    ${(last.volume * 1e9).toFixed(0)} mm³\n`
          + `matter    ${last.matter?.name ?? 'not said'}${last.matter ? ` (${last.matter.density} kg/m³)` : ''}\n`
          + `mass      ${last.mass >= 1 ? `${last.mass.toFixed(3)} kg` : `${(last.mass * 1e3).toFixed(1)} g`}`
          + `${last.matter ? `  = volume × density` : ''}` });
      }
      if (now.failed.length) log({ sort: 'refused', says: `${now.failed.length} could not be worked out`, detail: now.failed.map((f) => `${f.name}: ${f.why}`).join('\n') });
      return said;
    },
    async ai(prompt: string, input: string): Promise<{ text: string; by: 'claude' | 'nexus' }> {
      const at = mindFromBrowser();
      const t0 = Date.now();
      // THE PROMPT AS SENT, after {input} has been filled in by the engine — not the words typed in the step, which
      // are a template. Seeing the difference is most of what makes a model's answer readable.
      log({ sort: 'prompt', says: at ? `sent to ${at.model}` : 'would be sent, but no model is set up', to: at ? `${at.url} · ${at.model}` : undefined, detail: input.trim() ? `${prompt}\n\n${input}` : prompt });
      const text = await say(prompt, input, at);
      log({ sort: 'answer', says: text ? `answered in ${Date.now() - t0} ms` : 'nothing came back', detail: text ?? undefined, ms: Date.now() - t0 });
      if (text) return { text, by: 'claude' };
      return { text: at ? `the model at ${at.url} did not answer` : 'no local model is set up, so this step was not answered — set one up under “Local model”', by: 'nexus' };
    },
    facts(): Record<string, number> {
      const f = this.numbers();
      log({ sort: 'facts', says: 'a check read the engine\'s numbers', detail: Object.entries(f).map(([k, v]) => `${k} = ${v}`).join('\n') });
      return f;
    },
    /** WHAT A CHECK READS AS AN EXPRESSION: the workshop's own scope. This is what lets a check say
     *  `body.mass > 1 kg` or `cap.w - body.w` — every value a step set, every size of every thing made, every
     *  matter's properties, with units. It is the Workshop's own reader, so a check and the step before it are
     *  looking at exactly the same numbers. */
    reader() { return shop.reader(); },
    /** Every number a check may compare by name, each worked out by the engine — never one a model wrote. */
    numbers(): Record<string, number> {
      const made = shop.all().made.filter((m) => !m.unseen);
      return {
        // what the pipeline's own workshop is holding, which is what a step that places something changes
        made: made.length,
        mass: made.reduce((t, m) => t + m.mass, 0),
        volume: made.reduce((t, m) => t + m.volume, 0),
        broken: made.filter((m) => m.broken).length,
        failed: shop.all().failed.length,
        parts: INVENTORY.size, priced: Object.keys(PRICES).length, units: everyUnit().length,
        stages: worked.stages ?? 0, refusals: worked.refusals ?? 0,
        flaws: shop.all().failed.length + (worked.refusals ?? 0),
        lines: worked.lines ?? 0, unpriced: worked.unpriced ?? 0, usd: Math.round(worked.usd ?? 0),
        stays: worked.stays ?? 0, free: worked.free ?? 0,
        shapes: made.length, rounds: worked.series?.at.length ?? 0,
      };
    },
  };
  return hands;
}

// ---- how a run is shown ----------------------------------------------------------------------------------------

const MARK: Record<StepRun['status'], string> = { ok: '✓', no: '–', failed: '✗', skipped: '·' };
const SORT_SAYS: Record<Trace['sort'], string> = {
  call: 'asked', prompt: 'prompt', answer: 'answered', facts: 'numbers', math: 'worked out', refused: 'refused',
};

/** THE INSIDE OF ONE STEP, opened up: what it asked, what was sent to a model word for word, what numbers a check
 *  compared, what came back. Open by default while the run is going, because the point is to watch it. */
function traceHtml(ts: Trace[] | undefined, live: boolean): string {
  if (!ts?.length) return '';
  return `<details class="trace" ${live ? 'open' : ''}><summary>${ts.length} thing${ts.length === 1 ? '' : 's'} happened inside this step</summary>
    <ol>${ts.map((t) => `<li class="tr tr-${t.sort}">
      <span class="tag">${SORT_SAYS[t.sort]}</span>
      <div><b>${esc(t.says)}</b>${t.to ? ` <span class="to">${esc(t.to)}</span>` : ''}
        ${t.detail ? `<pre>${esc(t.detail)}</pre>` : ''}</div></li>`).join('')}</ol></details>`;
}

/** The run as it goes. `inside` is what the hands recorded for each step, by its place in the run — kept by the
 *  caller rather than by the engine, because `substrate/flows.ts` must stay a plain runner with no page in it. */
export function runHtml(r: FlowRun | null, inside?: Map<number, Trace[]>, now?: string | null): string {
  if (!r) return '';
  const ms = (r.ended ?? Date.now()) - r.started;
  const going = r.status === 'running';
  return `<div class="run ${r.status}">
    <div class="runhead"><b>${esc(going ? 'running' : r.status)}</b>
      <span>${esc(r.why)}</span><span class="ms">${r.steps.length} steps, ${(ms / 1000).toFixed(1)} s${r.rounds > 1 ? `, ${r.rounds} rounds` : ''}</span></div>
    ${r.steps.length ? `<ol class="steps">${r.steps.map((s, i) => `<li class="${s.status}">
      <span class="mark">${MARK[s.status]}</span>
      <div><b>${esc(s.label)}</b> <span class="k k-${s.kind}">${esc(s.kind)}</span>
        ${s.round > 1 ? `<span class="round">round ${s.round}</span>` : ''}
        <span class="ms">${s.ms} ms${s.by ? `, ${s.by === 'claude' ? 'the model' : 'the engine'}` : ''}</span>
        ${traceHtml(inside?.get(i), going && i === r.steps.length - 1)}
        ${s.output ? `<pre class="said">${esc(s.output)}</pre>` : ''}</div></li>`).join('')}
      ${going ? `<li class="doing"><span class="mark">▸</span><div><b>${esc(now ?? 'the next step')}</b>
        <span class="ms">running…</span></div></li>` : ''}</ol>`
      : `<p class="none">No step ran. A pipeline starts at a <b>trigger</b> — add one, or press ▶ on a step to start there.</p>`}
  </div>`;
}
