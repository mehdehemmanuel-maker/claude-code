// Pipelines you run: a flow is a node board whose nodes are steps. A trigger starts it (you press Run, a build
// finishes, a flaw is found, a note is added, every so many minutes, or you say a phrase); an AI call asks Claude, or
// Nexus where Claude cannot be reached, and says which answered; an action does something to the room through Nexus
// (make, try again, operate, list the flaws, note, show a panel, a board of the build); a check lets the flow on only
// where its condition holds; a repeat sends it back along its loop until its condition holds. The order is the board's
// own: a "flows to" link runs its ends in order, and a "feeds back to" link from a repeat is the way back.
//
// Nothing here acts by itself: the engine walks the board and calls what it is given (FlowApi), so a flow does exactly
// what its steps say, through the same world the person acts on, and every step's output, failure and time is kept.

import { BACK, BEFORE, STRUCT, derive, edgesOf, nodesOf, type Board } from './boards';

export type StepKind = 'trigger' | 'ai' | 'action' | 'check' | 'repeat';
export interface Step { kind: StepKind; what: string }
export type FlowEventKind = 'run' | 'built' | 'flaw' | 'note' | 'tick' | 'said';
export interface FlowEvent { kind: FlowEventKind; text?: string; minutes?: number }
export interface FlowApi {
  /** Do something in the room: returns what happened, in words; throws with why where it cannot. */
  act(what: string, input: string, signal?: AbortSignal): Promise<string>;
  /** Ask: Claude where it can be reached, else Nexus; says which answered. */
  ai(prompt: string, input: string, signal?: AbortSignal): Promise<{ text: string; by: 'claude' | 'nexus' }>;
  /** The numbers a check reads, as they stand now: flaws, gaps, parts, mass, rounds, failures, notes. */
  facts(): Record<string, number>;
}
export interface StepRun { node: string; label: string; kind: StepKind | 'plain'; status: 'ok' | 'no' | 'failed' | 'skipped'; output: string; ms: number; round: number; by?: 'claude' | 'nexus' }
export interface FlowRun { trigger: string; why: string; started: number; ended?: number; status: 'running' | 'done' | 'stopped' | 'failed'; rounds: number; steps: StepRun[] }

// ---- triggers --------------------------------------------------------------------------------------------------------
export const TRIGGERS = ['when I press run', 'when a build finishes', 'when a flaw is found', 'when a note is added', 'every 10 minutes', 'when I say go'] as const;
/** What starts a trigger, from its words. */
export function triggerOf(what: string): { kind: FlowEventKind; every?: number; phrase?: string } | null {
  const t = what.toLowerCase().trim();
  if (/\b(press|run|start|manual|button|by hand)\b/.test(t) && !/\bsay\b/.test(t)) return { kind: 'run' };
  if (/\b(build|built|made|finish|done)\b/.test(t)) return { kind: 'built' };
  if (/\bflaws?\b|\bproblem/.test(t)) return { kind: 'flaw' };
  if (/\bnotes?\b|\breport/.test(t)) return { kind: 'note' };
  const ev = t.match(/every\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hours?|s|sec|seconds?)\b/);
  if (ev) { const n = Number(ev[1]), u = ev[2]!; return { kind: 'tick', every: /^h/.test(u) ? n * 60 : /^s/.test(u) ? n / 60 : n }; }
  const say = t.match(/\bsay\s+["“]?(.+?)["”]?$/);
  if (say) return { kind: 'said', phrase: say[1]!.replace(/[.!?]+$/, '').trim() };
  return null;
}
/** Whether an event starts a trigger: a phrase is heard inside what was said; a timer when its minutes come round. */
export function starts(trigger: Step, e: FlowEvent): boolean {
  const t = triggerOf(trigger.what); if (!t || t.kind !== e.kind) return false;
  if (t.kind === 'said') return !!t.phrase && (e.text ?? '').toLowerCase().includes(t.phrase.toLowerCase());
  if (t.kind === 'tick') return !!t.every && (e.minutes ?? 0) > 0 && Math.abs((e.minutes! / t.every) - Math.round(e.minutes! / t.every)) < 1e-6;
  return true;
}

// ---- conditions ------------------------------------------------------------------------------------------------------
const ALIAS: Record<string, string> = { flaw: 'flaws', problem: 'flaws', problems: 'flaws', gap: 'gaps', part: 'parts', weight: 'mass', kg: 'mass', round: 'rounds', failure: 'failures', fails: 'failures', note: 'notes', reports: 'notes' };
const OPS: [RegExp, string][] = [[/\bis not\b|\bisn'?t\b|!=|≠/, '!='], [/\bat least\b|>=|≥/, '>='], [/\bat most\b|<=|≤/, '<='], [/\bmore than\b|\bover\b|\babove\b|>/, '>'], [/\bless than\b|\bunder\b|\bbelow\b|\bfewer than\b|</, '<'], [/==|=|\bis\b|\bequals?\b/, '=']];
/** Whether a condition holds: "flaws = 0", "no flaws", "mass under 500", "parts at most 200", "output contains wheel". */
export function evaluate(cond: string, facts: Record<string, number>, input: string): { ok: boolean; says: string } | { error: string } {
  let t = cond.toLowerCase().trim().replace(/^(if|until|when|while|only if)\s+/, '').replace(/,?\s*at most \d+ (times|rounds?)\.?$/, '').trim();
  if (!t || /^(yes|always|true|ok)$/.test(t)) return { ok: true, says: 'always' };
  const parts = t.split(/\s+and\s+/);
  if (parts.length > 1) { const rs = parts.map((p) => evaluate(p, facts, input)); const bad = rs.find((r) => 'error' in r); if (bad) return bad; const ok = rs.every((r) => (r as { ok: boolean }).ok); return { ok, says: rs.map((r) => (r as { says: string }).says).join(' and ') }; }
  let m = t.match(/^(?:the )?(?:output|answer|it|input|result)?\s*(?:contains|says|mentions|has the word)\s+["“]?(.+?)["”]?$/);
  if (m) { const ok = input.toLowerCase().includes(m[1]!); return { ok, says: `the output ${ok ? 'says' : 'does not say'} "${m[1]}"` }; }
  m = t.match(/^(no|any|some|there are no|there are|there is a|there's a)\s+(\w+)$/);
  if (m) { const f = ALIAS[m[2]!] ?? m[2]!; if (!(f in facts)) return { error: `I do not know the number "${m[2]}": I read ${Object.keys(facts).join(', ')}` }; const v = facts[f]!, ok = /^(no|there are no)$/.test(m[1]!) ? v === 0 : v > 0; return { ok, says: `${f} is ${v}` }; }
  for (const [re, op] of OPS) {
    const mm = t.match(new RegExp(`^(?:the |number of )?([a-z]+)\\s*(?:${re.source})\\s*(-?\\d+(?:\\.\\d+)?)\\s*(?:kg|parts?|flaws?|gaps?|rounds?)?$`));
    if (!mm) continue;
    const f = ALIAS[mm[1]!] ?? mm[1]!; if (!(f in facts)) return { error: `I do not know the number "${mm[1]}": I read ${Object.keys(facts).join(', ')}` };
    const v = facts[f]!, n = Number(mm[2]);
    const ok = op === '=' ? v === n : op === '!=' ? v !== n : op === '>' ? v > n : op === '<' ? v < n : op === '>=' ? v >= n : v <= n;
    return { ok, says: `${f} is ${Number(v.toPrecision(4))}` };
  }
  return { error: `I cannot read the condition "${cond}". Say it like "flaws = 0", "no flaws", "mass under 500", "parts at most 200", or "output contains wheel".` };
}
/** A repeat's most rounds: "until flaws = 0, at most 3 times" is 3; else 3. */
export const maxRounds = (what: string) => Math.max(1, Math.min(20, Number(what.match(/at most (\d+)/i)?.[1] ?? 3)));

// ---- the order: what runs after what -----------------------------------------------------------------------------------
export interface FlowGraph { next: Map<string, string[]>; prev: Map<string, string[]>; back: Map<string, string> }
export function graphOf(b: Board): FlowGraph {
  const d = derive(b), next = new Map<string, string[]>(), prev = new Map<string, string[]>(), back = new Map<string, string>();
  const add = (f: string, t: string) => { if (f === t) return; if (!(next.get(f) ?? []).includes(t)) { next.set(f, [...(next.get(f) ?? []), t]); prev.set(t, [...(prev.get(t) ?? []), f]); } };
  for (const e of edgesOf(b)) {
    if (BACK.has(e.rel ?? '')) { back.set(e.from, e.to); continue; }
    if (STRUCT(e.rel)) { if (d.parent.get(e.to) === e.from) add(e.from, e.to); else if (d.parent.get(e.from) === e.to) add(e.to, e.from); continue; }
    const [f, t] = BEFORE(e); add(f, t);
  }
  return { next, prev, back };
}
/** Everything a node leads to, in an order where each comes after all that leads to it (ties by how connected it is). */
export function orderFrom(b: Board, g: FlowGraph, from: string): string[] {
  const reach = new Set<string>([from]), stack = [from];
  while (stack.length) for (const n of g.next.get(stack.pop()!) ?? []) if (!reach.has(n)) { reach.add(n); stack.push(n); }
  const rank = derive(b).rank, indeg = new Map([...reach].map((n) => [n, (g.prev.get(n) ?? []).filter((p) => reach.has(p)).length]));
  indeg.set(from, 0);
  const out: string[] = [], ready = [from];
  while (ready.length) {
    ready.sort((a, c) => (rank.get(a) ?? 0) - (rank.get(c) ?? 0));
    const n = ready.shift()!; out.push(n);
    for (const m of g.next.get(n) ?? []) { if (!reach.has(m)) continue; indeg.set(m, indeg.get(m)! - 1); if (indeg.get(m) === 0) ready.push(m); }
  }
  // a cycle without a feed back: what is left runs after, in rank order, so nothing is silently dropped
  for (const n of [...reach].sort((a, c) => (rank.get(a) ?? 0) - (rank.get(c) ?? 0))) if (!out.includes(n)) out.push(n);
  return out;
}
export const stepOf = (b: Board, id: string): Step | null => { const s = b.nodes[id]?.step; return s && s.kind ? s : null; };
/** The triggers of a board, and what starts each. */
export const triggersOf = (b: Board) => nodesOf(b).filter((n) => stepOf(b, n.id)?.kind === 'trigger').map((n) => ({ id: n.id, label: n.label, step: stepOf(b, n.id)! }));
const fill = (what: string, input: string) => what.replace(/\{input\}|\{it\}|\{output\}/gi, input).trim();

// ---- running --------------------------------------------------------------------------------------------------------
/** Run a flow from a trigger: each step in order, its output the next one's input; a check that does not hold stops
 *  what comes only through it; a repeat whose condition does not hold goes back along its feed back, at most so many
 *  rounds; a step that fails stops the flow. `on` hears the run after every step. */
export async function runFlow(b: Board, from: string, api: FlowApi, why: string, on: (r: FlowRun) => void = () => undefined, signal?: AbortSignal, maxSteps = 80): Promise<FlowRun> {
  const g = graphOf(b), order = orderFrom(b, g, from), label = (id: string) => b.nodes[id]?.label ?? id;
  const run: FlowRun = { trigger: from, why, started: Date.now(), status: 'running', rounds: 1, steps: [] };
  const state = new Map<string, { status: StepRun['status']; output: string }>();
  let i = 0, ran = 0;
  const tell = () => on({ ...run, steps: [...run.steps] });
  while (i < order.length) {
    if (signal?.aborted) { run.status = 'stopped'; break; }
    if (++ran > maxSteps) { run.status = 'stopped'; run.steps.push({ node: order[i]!, label: label(order[i]!), kind: 'plain', status: 'skipped', output: `Stopped: more than ${maxSteps} steps in one run.`, ms: 0, round: run.rounds }); break; }
    const id = order[i]!, step = stepOf(b, id), kind = step?.kind ?? 'plain', t0 = Date.now();
    const ins = (g.prev.get(id) ?? []).filter((p) => state.has(p));
    // it runs where something before it ran and let it on (the trigger runs first)
    if (id !== from && ins.length && ins.every((p) => state.get(p)!.status !== 'ok')) { state.set(id, { status: 'skipped', output: '' }); run.steps.push({ node: id, label: label(id), kind, status: 'skipped', output: 'Skipped: nothing before it let it on.', ms: 0, round: run.rounds }); tell(); i++; continue; }
    const input = id === from ? '' : ins.map((p) => state.get(p)!.output).filter(Boolean).join('\n');
    let r: StepRun;
    try {
      if (id === from) r = { node: id, label: label(id), kind, status: 'ok', output: why, ms: 0, round: run.rounds };
      else if (kind === 'ai') { const a = await api.ai(fill(step!.what || label(id), input), input, signal); r = { node: id, label: label(id), kind, status: 'ok', output: a.text, ms: 0, round: run.rounds, by: a.by }; }
      else if (kind === 'action') r = { node: id, label: label(id), kind, status: 'ok', output: await api.act(fill(step!.what || label(id), input), input, signal), ms: 0, round: run.rounds };
      else if (kind === 'check' || kind === 'repeat') {
        const e = evaluate(step!.what || label(id), api.facts(), input);
        if ('error' in e) throw new Error(e.error);
        if (kind === 'check') r = { node: id, label: label(id), kind, status: e.ok ? 'ok' : 'no', output: e.ok ? input || e.says : `Not on: ${e.says}`, ms: 0, round: run.rounds };
        else {
          const to = g.back.get(id), most = maxRounds(step!.what);
          if (e.ok) r = { node: id, label: label(id), kind, status: 'ok', output: `Done: ${e.says}`, ms: 0, round: run.rounds };
          else if (!to) throw new Error('A repeat needs a "feeds back to" link to the step it goes back to.');
          else if (run.rounds >= most) { r = { node: id, label: label(id), kind, status: 'no', output: `Stopped after ${most} rounds: ${e.says}`, ms: Date.now() - t0, round: run.rounds }; run.steps.push(r); state.set(id, r); run.status = 'stopped'; tell(); break; }
          else {
            r = { node: id, label: label(id), kind, status: 'ok', output: `Again (${e.says}): back to ${label(to)}`, ms: Date.now() - t0, round: run.rounds };
            run.steps.push(r); tell();
            // back along the loop: what follows the step it goes back to runs again
            const j = order.indexOf(to); if (j < 0) throw new Error(`It feeds back to ${label(to)}, which this run does not reach.`);
            for (const n of order.slice(j)) state.delete(n);
            run.rounds++; i = j; continue;
          }
        }
      } else if (kind === 'trigger') r = { node: id, label: label(id), kind, status: 'ok', output: input, ms: 0, round: run.rounds };
      else r = { node: id, label: label(id), kind, status: 'ok', output: input, ms: 0, round: run.rounds };
    } catch (err) {
      const cut = !!signal?.aborted;
      r = { node: id, label: label(id), kind, status: cut ? 'skipped' : 'failed', output: cut ? 'Stopped while it ran.' : (err as Error).message, ms: Date.now() - t0, round: run.rounds };
      run.steps.push(r); state.set(id, r); run.status = cut ? 'stopped' : 'failed'; tell(); break;
    }
    r.ms = Date.now() - t0; run.steps.push(r); state.set(id, { status: r.status, output: r.output }); tell(); i++;
  }
  if (run.status === 'running') run.status = 'done';
  run.ended = Date.now(); tell();
  return run;
}

// ---- a step from one word -------------------------------------------------------------------------------------------
/** What the room's actions are called: the first word of an action step. */
export const ACTIONS = ['make', 'build', 'again', 'operate', 'flaws', 'show', 'note', 'say', 'board', 'wait'] as const;
/** What a step added to a flow does, read from its word, so one word is enough: "flaws" lists the flaws, "operate"
 *  operates it, "when a build finishes" is a trigger, "any flaws?" a check, "until no flaws" a repeat, "ask how to fix"
 *  an AI call. A word that reads as none of these stays a plain step, which passes on what came to it. */
export function guessStep(word: string): Step | null {
  const w = word.trim(), t = w.toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  if (/^(when|whenever|every|on)\b/.test(t) && triggerOf(t)) return { kind: 'trigger', what: t };
  if (/^(until|repeat|loop|keep going)\b/.test(t)) { const c = t.replace(/^(repeat|loop|keep going)\s*(until\s*)?/, 'until ').replace(/^until\s*$/, 'until flaws = 0'); return { kind: 'repeat', what: /at most \d+/.test(c) ? c : `${c}, at most 3 times` }; }
  if (/^(if|check|only if|is|are|any|no)\b/.test(t) || /\?$/.test(t)) return { kind: 'check', what: t.replace(/^(check|only if|if)\s+(whether\s+)?/, '').replace(/\?+$/, '').trim() || 'flaws > 0' };
  if (/^(ask|ai|claude|think|explain|summari[sz]e|decide|suggest|why|how)\b/.test(t)) { const q = w.replace(/^(ask|ai|claude)\b\s*:?\s*/i, '').trim() || w; return { kind: 'ai', what: `${q.replace(/[.?!]+$/, '')}: {input}` }; }
  if (/^list (the )?flaws$|^find (the )?flaws$/.test(t)) return { kind: 'action', what: 'flaws' };
  if ((ACTIONS as readonly string[]).includes(t.split(' ')[0]!)) return { kind: 'action', what: t };
  return null;
}
/** What to put in a step, by kind: a few to press, each as it is written. */
export const SUGGEST: Record<StepKind, [string, string][]> = {
  trigger: TRIGGERS.map((t): [string, string] => [t, t]),
  ai: [['How to fix it', 'Say, in one sentence, the one change to the ask that fixes the worst of these: {input}'], ['Say it plainly', 'Say this plainly, in one sentence: {input}'], ['Which part, and why', 'Which part should change first, and why? {input}'], ['Make it lighter', 'Say one change that makes it lighter without a new flaw: {input}']],
  action: [['List the flaws', 'flaws'], ['Build again with it', 'again {input}'], ['Operate', 'operate'], ['Make a cart', 'make a cart'], ['Note it', 'note flaw: {input}'], ['Say it', 'say {input}'], ['Show the flaws', 'show flaws'], ['Board of the build', 'board'], ['Wait 5 s', 'wait 5 s']],
  check: ['flaws > 0', 'no flaws', 'no gaps', 'failures > 0', 'mass under 500', 'output contains wheel'].map((c): [string, string] => [c, c]),
  repeat: ['until flaws = 0, at most 3 times', 'until no gaps, at most 5 times', 'until failures = 0, at most 3 times'].map((c): [string, string] => [c, c]),
};
/** A run as it is kept on the board: each output cut to a length, and the last so many steps. */
export const keptRun = (r: FlowRun, chars = 240, steps = 40): FlowRun => ({ ...r, steps: r.steps.slice(-steps).map((x) => ({ ...x, output: x.output.length > chars ? `${x.output.slice(0, chars - 1)}…` : x.output })) });
/** An event, in words: why a flow started. */
export const saidOf = (e: FlowEvent): string => (e.kind === 'run' ? 'pressed ▶ Run' : e.kind === 'built' ? 'a build finished' : e.kind === 'flaw' ? `a flaw was found${e.text ? `: ${e.text}` : ''}` : e.kind === 'note' ? `a note was added${e.text ? `: ${e.text}` : ''}` : e.kind === 'tick' ? `${e.minutes} min in` : `you said "${e.text ?? ''}"`);

// ---- flows to start from --------------------------------------------------------------------------------------------
export interface Template { id: string; title: string; about: string; steps: { id: string; label: string; step?: Step }[]; links: [string, string, string?][] }
export const TEMPLATES: Template[] = [
  {
    id: 'improve', title: 'Improve it until it is clean', about: "Nexus's own loop as a pipeline: find the flaws, ask for the change that fixes the worst, build again with it, and go round until no flaw is left (at most 3 rounds).",
    steps: [
      { id: 't', label: 'Run', step: { kind: 'trigger', what: 'when I press run' } },
      { id: 'f', label: 'List the flaws', step: { kind: 'action', what: 'flaws' } },
      { id: 'c', label: 'Any flaws?', step: { kind: 'check', what: 'flaws > 0' } },
      { id: 'a', label: 'Ask how to fix', step: { kind: 'ai', what: 'These are the flaws of the build standing here: {input}. Say, in one sentence, the one change to the ask that fixes the worst of them.' } },
      { id: 'g', label: 'Build again with it', step: { kind: 'action', what: 'again {input}' } },
      { id: 'r', label: 'Until clean', step: { kind: 'repeat', what: 'until flaws = 0, at most 3 times' } },
    ],
    links: [['t', 'f'], ['f', 'c'], ['c', 'a'], ['a', 'g'], ['g', 'r'], ['r', 'f', 'feeds back to']],
  },
  {
    id: 'notes', title: 'Understand every note', about: 'When you add a note, it is read for what you mean and said back to you, and kept as a finding.',
    steps: [
      { id: 't', label: 'A note', step: { kind: 'trigger', what: 'when a note is added' } },
      { id: 'a', label: 'What do they mean', step: { kind: 'ai', what: 'The person wrote this note on the build: {input}. Say back, in one plain sentence, what they mean and what should change.' } },
      { id: 's', label: 'Say it back', step: { kind: 'action', what: 'say {input}' } },
    ],
    links: [['t', 'a'], ['a', 's']],
  },
  {
    id: 'watch', title: 'Operate it, and note what fails', about: 'Every 10 minutes: run the build through its duty; where anything fails, note it on the build for the next round of laws.',
    steps: [
      { id: 't', label: 'Every 10 minutes', step: { kind: 'trigger', what: 'every 10 minutes' } },
      { id: 'o', label: 'Operate', step: { kind: 'action', what: 'operate' } },
      { id: 'c', label: 'Did it fail?', step: { kind: 'check', what: 'failures > 0' } },
      { id: 'n', label: 'Note it', step: { kind: 'action', what: 'note flaw: {input}' } },
    ],
    links: [['t', 'o'], ['o', 'c'], ['c', 'n']],
  },
  {
    id: 'blank', title: 'A new pipeline', about: 'A trigger to start from: add steps after it, each an AI call, an action, a check or a repeat.',
    steps: [{ id: 't', label: 'Run', step: { kind: 'trigger', what: 'when I press run' } }],
    links: [],
  },
];
/** A template as a board: its steps as nodes, its order as "flows to" links (a loop's way back as "feeds back to"). */
export function boardOfTemplate(t: Template, at = Date.now(), uid: (p: string) => string = (p) => p + Math.random().toString(36).slice(2, 8)): Board {
  const ids = new Map(t.steps.map((s) => [s.id, uid('n')]));
  const b: Board = { title: t.title, kind: 'flow', about: t.about, nodes: {}, edges: {}, createdAt: at, updatedAt: at };
  for (const s of t.steps) b.nodes[ids.get(s.id)!] = { label: s.label, ...(s.step ? { step: { ...s.step } } : {}) };
  t.links.forEach(([f, to, rel], i) => { b.edges[`e${i}`] = { from: ids.get(f)!, to: ids.get(to)!, rel: rel ?? 'flows to' }; });
  return b;
}
