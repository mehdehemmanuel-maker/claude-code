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
export interface Worked {
  words?: string; stages?: number; refusals?: number; lines?: number; unpriced?: number; usd?: number; stays?: number; free?: number;
  /** what a `shape` step made, so the run can SHOW it rather than only say it */ shapes?: Placed[];
  /** what a `count` step counted, in the order it counted them, so a loop can be drawn as it goes */ series?: { of: string; at: number[] };
}

/** A shape a step made: what it is, how big, where, and how many. Every figure is a number the step was given or
 *  worked out — never a sampled one, which is the rule a model may not cross (CLAUDE.md, 2026-10-21). */
export interface Placed { of: 'sphere' | 'box' | 'cylinder' | 'cone'; mm: [number, number, number]; at: [number, number, number]; of_n: number; material?: string }

/** `shape 5 spheres 40mm spaced 60mm` — the whole grammar, said once here so the page can show the same words.
 *  It is deliberately small and deliberately NOT a language: a step says a shape, a size, a count and a spacing, and
 *  anything else it is given is reported as not understood rather than guessed at. */
export function readPlaced(words: string): { shapes: Placed[]; says: string } | { error: string } {
  const t = words.toLowerCase();
  const of = (['sphere', 'box', 'cylinder', 'cone'] as const).find((k) => new RegExp(`\\b${k}s?\\b`).test(t));
  if (!of) return { error: `say which shape: a sphere, a box, a cylinder or a cone. "${words}" names none of them.` };
  const n = Math.max(1, Math.min(400, Number(/\b(\d+)\s*(?:x\s*)?(?=\s*\w*\b(?:sphere|box|cylinder|cone))/.exec(t)?.[1] ?? 1)));
  const size = Number(/(\d+(?:\.\d+)?)\s*mm\b/.exec(t)?.[1] ?? 40);
  const gap = Number(/spac\w*\s+(\d+(?:\.\d+)?)\s*mm/.exec(t)?.[1] ?? size * 1.6);
  const material = /\b(steel|aluminium|aluminum|brass|copper|abs|pla|nylon|glass)\b/.exec(t)?.[1];
  const per = Math.max(1, Math.round(Math.sqrt(n)));               // a square-ish grid, so 25 is 5 × 5 and not a line
  const shapes: Placed[] = [];
  for (let i = 0; i < n; i++) {
    const c = i % per, r = Math.floor(i / per);
    shapes.push({ of, mm: [size, size, size], at: [(c - (per - 1) / 2) * gap, 0, (r - (Math.ceil(n / per) - 1) / 2) * gap], of_n: 1, material });
  }
  return { shapes, says: `${n} ${of}${n === 1 ? '' : 's'} of ${size} mm${n > 1 ? `, ${gap} mm apart in a ${per} × ${Math.ceil(n / per)} grid` : ''}${material ? `, ${material}` : ''}` };
}

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
      if (/^(shape|place|draw|sphere|box|cylinder|cone)\b/i.test(low)) {
        const got = readPlaced(t.replace(/^\s*(shape|place|draw)\s*/i, '') || input);
        if ('error' in got) throw new Error(got.error);
        worked.shapes = [...(worked.shapes ?? []), ...got.shapes];
        return `made ${got.says}`;
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
        shapes: worked.shapes?.length ?? 0, rounds: worked.series?.at.length ?? 0,
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
