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
import { holdsFor, holdText } from '../ask/hold';
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
export interface Worked { words?: string; stages?: number; refusals?: number; lines?: number; unpriced?: number; usd?: number; stays?: number; free?: number }

const WANTS_ROOM = /^(place|move|rotate|flip|mirror|pattern|scatter|surface|material|operate|robot|cell|device|weather|reset|clear|show|expand|shrink|stretch|join|split|energy|seed)\b/i;

/** The hands. One instance per run, because what a step worked out is read by the steps after it. */
export function engineHands(worked: Worked = {}): FlowApi & { worked: Worked } {
  const hands = {
    worked,
    async act(what: string, input: string): Promise<string> {
      const t = what.trim(), low = t.toLowerCase();
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
        return `${lines.length} lines, ${worked.unpriced} with no seller's price, ${usd(p.total.all[0])}–${usd(p.total.all[1])}\n`
          + lines.slice(0, 12).map((l) => `  ${l.n} × ${l.what} — ${l.usd == null ? 'no price kept' : usd(l.usd)}`).join('\n');
      }
      if (/^(hold|stay|balance)\b/i.test(low)) {
        const words = rest || worked.words;
        if (!words) throw new Error('nothing has been made yet, so there is no joint to hold');
        const j = heaviestJoint(composeMachine(words));
        const stays = holdsFor(j);
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
      if (/^(say|note|report|store|board|if|rule|calc|set)\b/i.test(low)) return rest || input || t;
      if (/^wait\b/i.test(low)) { const s = Number(t.match(/([\d.]+)\s*s/)?.[1] ?? 1); await new Promise((ok) => setTimeout(ok, Math.min(5, s) * 1000)); return `waited ${Math.min(5, s)} s`; }
      if (WANTS_ROOM.test(low)) throw new Error(`"${t}" is something done in the room — open The forge for it. Here a step can make, price, hold, look a part up, say, note or wait.`);
      throw new Error(`I do not know the action "${t}". Here a step can make, price, hold, look a part up, say, note or wait.`);
    },
    async ai(prompt: string, input: string): Promise<{ text: string; by: 'claude' | 'nexus' }> {
      const at = mindFromBrowser();
      const text = await say(prompt, input, at);
      if (text) return { text, by: 'claude' };
      return { text: at ? `the model at ${at.url} did not answer` : 'no local model is set up, so this step was not answered — set one up under “Local model”', by: 'nexus' };
    },
    facts(): Record<string, number> {
      return {
        parts: INVENTORY.size, priced: Object.keys(PRICES).length, units: everyUnit().length,
        stages: worked.stages ?? 0, refusals: worked.refusals ?? 0, flaws: worked.refusals ?? 0,
        lines: worked.lines ?? 0, unpriced: worked.unpriced ?? 0, usd: Math.round(worked.usd ?? 0),
        mass: 0, stays: worked.stays ?? 0, free: worked.free ?? 0,
      };
    },
  };
  return hands;
}

// ---- how a run is shown ----------------------------------------------------------------------------------------

const MARK: Record<StepRun['status'], string> = { ok: '✓', no: '–', failed: '✗', skipped: '·' };

export function runHtml(r: FlowRun | null): string {
  if (!r) return '';
  const ms = (r.ended ?? Date.now()) - r.started;
  return `<div class="run ${r.status}">
    <div class="runhead"><b>${esc(r.status === 'running' ? 'running' : r.status)}</b>
      <span>${esc(r.why)}</span><span class="ms">${r.steps.length} steps, ${(ms / 1000).toFixed(1)} s${r.rounds > 1 ? `, ${r.rounds} rounds` : ''}</span></div>
    ${r.steps.length ? `<ol class="steps">${r.steps.map((s) => `<li class="${s.status}">
      <span class="mark">${MARK[s.status]}</span>
      <div><b>${esc(s.label)}</b> <span class="k k-${s.kind}">${esc(s.kind)}</span>
        <span class="ms">${s.ms} ms${s.by ? `, ${s.by === 'claude' ? 'the model' : 'the engine'}` : ''}</span>
        ${s.output ? `<pre>${esc(s.output)}</pre>` : ''}</div></li>`).join('')}</ol>`
      : `<p class="none">No step ran. A pipeline starts at a <b>trigger</b> — add one, or press ▶ on a step to start there.</p>`}
  </div>`;
}
