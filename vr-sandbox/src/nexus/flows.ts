// Pipelines you run: a flow is a node board whose nodes are steps. A trigger starts it (you press Run, a build
// finishes, a flaw is found, a note is added, every so many minutes, or you say a phrase); an AI call asks Claude, or
// Nexus where Claude cannot be reached, and says which answered; an action does something to the room through Nexus
// (make, try again, operate, list the flaws, note, show a panel, a board of the build); a check lets the flow on only
// where its condition holds; a repeat sends it back along its loop until its condition holds. The order is the board's
// own: a "flows to" link runs its ends in order, and a "feeds back to" link from a repeat is the way back.
//
// Nothing here acts by itself: the engine walks the board and calls what it is given (FlowApi), so a flow does exactly
// what its steps say, through the same world the person acts on, and every step's output, failure and time is kept.

import { scopeOf, truth, type Scope } from './generate';

export type StepKind = 'trigger' | 'ai' | 'action' | 'check' | 'repeat';
export interface Step { kind: StepKind; what: string }
export type FlowEventKind = 'run' | 'built' | 'flaw' | 'note' | 'tick' | 'said' | 'made' | 'start' | 'cond';
export interface FlowEvent { kind: FlowEventKind; text?: string; minutes?: number }
export interface FlowApi {
  /** Do something in the room: returns what happened, in words; throws with why where it cannot. */
  act(what: string, input: string, signal?: AbortSignal, /** the board it runs on: what it makes, and its rules, are its own */ who?: string): Promise<string>;
  /** Ask: Claude where it can be reached, else Nexus; says which answered. */
  ai(prompt: string, input: string, signal?: AbortSignal): Promise<{ text: string; by: 'claude' | 'nexus' }>;
  /** The numbers a check reads, as they stand now: flaws, gaps, parts, mass, rounds, failures, notes. */
  facts(): Record<string, number>;
  /** What a condition reads as an expression: the facts, and the things made, to measure between. */
  reader?(): Scope;
}
export interface StepRun { node: string; label: string; kind: StepKind | 'plain'; status: 'ok' | 'no' | 'failed' | 'skipped'; output: string; ms: number; round: number; by?: 'claude' | 'nexus' }
export interface FlowRun { trigger: string; why: string; started: number; ended?: number; status: 'running' | 'done' | 'stopped' | 'failed'; rounds: number; steps: StepRun[] }

/** What starts a trigger, from its words: a press, a build, a flaw, a note, a shape made, the forge opening, a timer, a
 *  phrase said, or a condition the moment it turns true. */
export function triggerOf(what: string): { kind: FlowEventKind; every?: number; phrase?: string; cond?: string } | null {
  const raw = what.trim(), t = raw.toLowerCase();
  const say = t.match(/\bsay\s+["“]?(.+?)["”]?$/);
  if (say) return { kind: 'said', phrase: say[1]!.replace(/[.!?]+$/, '').trim() };
  if (/\b(forge|room|app)\b.*\b(opens?|starts?|begins?|loads?)\b|\b(opens?|starts?)\b.*\b(forge|room|app)\b|\bat (the )?start\b/.test(t)) return { kind: 'start' };
  if (/\b(shape|thing|something)s?\b.*\b(is |are )?(made|placed|changed|generated)\b/.test(t)) return { kind: 'made' };
  if (/\b(press|run|start|manual|button|by hand)\b/.test(t)) return { kind: 'run' };
  if (/\b(build|built|made|finish|done)\b/.test(t)) return { kind: 'built' };
  if (/\bflaws?\b|\bproblem/.test(t)) return { kind: 'flaw' };
  if (/\bnotes?\b|\breport/.test(t)) return { kind: 'note' };
  const ev = t.match(/every\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minutes?|h|hours?|s|sec|seconds?)\b/);
  if (ev) { const n = Number(ev[1]), u = ev[2]!; return { kind: 'tick', every: /^h/.test(u) ? n * 60 : /^s/.test(u) ? n / 60 : n }; }
  // a condition: started the moment it turns true ("when load over 500 N", "whenever cap.mass > 50 g")
  const cond = /^(?:when|whenever|as soon as|once|if)\s+(.+)$/i.exec(raw);
  if (cond && /<|>|=|\b(under|over|above|below|at most|at least|is|less than|more than)\b/i.test(cond[1]!)) return { kind: 'cond', cond: cond[1]!.trim() };
  return null;
}
/** Whether an event starts a trigger: a phrase is heard inside what was said; a timer when its minutes come round. */
export function starts(trigger: Step, e: FlowEvent): boolean {
  const t = triggerOf(trigger.what); if (!t || t.kind !== e.kind || t.kind === 'cond') return false;
  if (t.kind === 'said') return !!t.phrase && (e.text ?? '').toLowerCase().includes(t.phrase.toLowerCase());
  if (t.kind === 'tick') return !!t.every && (e.minutes ?? 0) > 0 && Math.abs((e.minutes! / t.every) - Math.round(e.minutes! / t.every)) < 1e-6;
  return true;
}

// ---- conditions ------------------------------------------------------------------------------------------------------
const ALIAS: Record<string, string> = { flaw: 'flaws', problem: 'flaws', problems: 'flaws', gap: 'gaps', part: 'parts', weight: 'mass', kg: 'mass', round: 'rounds', failure: 'failures', fails: 'failures', note: 'notes', reports: 'notes' };
const OPS: [RegExp, string][] = [[/\bis not\b|\bisn'?t\b|!=|≠/, '!='], [/\bat least\b|>=|≥/, '>='], [/\bat most\b|<=|≤/, '<='], [/\bmore than\b|\bover\b|\babove\b|>/, '>'], [/\bless than\b|\bunder\b|\bbelow\b|\bfewer than\b|</, '<'], [/==|=|\bis\b|\bequals?\b/, '=']];
/** Whether a condition holds: "flaws = 0", "no flaws", "mass under 500", "parts at most 200", "output contains wheel". */
export function evaluate(cond: string, facts: Record<string, number>, input: string, scope?: Scope): { ok: boolean; says: string } | { error: string } {
  const plain = readPlain(cond, facts, input);
  if (!('error' in plain)) return plain;
  // read as an expression: units, and, or, sizes and masses of what is made, the gap between two things
  const t = cond.trim().replace(/^(if|until|when|while|only if)\s+/i, '').replace(/,?\s*at most \d+ (times|rounds?)\.?$/i, '').trim();
  try { const ok = truth(t, scope ?? scopeOf(facts)); return { ok, says: `${t}: ${ok ? 'holds' : 'does not hold'}` }; }
  catch (e) { return /cannot read the condition/.test(plain.error) ? { error: `${plain.error} Read as an expression: ${(e as Error).message}` } : plain; }
}
function readPlain(cond: string, facts: Record<string, number>, input: string): { ok: boolean; says: string } | { error: string } {
  let t = cond.toLowerCase().trim().replace(/^(if|until|when|while|only if)\s+/, '').replace(/,?\s*at most \d+ (times|rounds?)\.?$/, '').trim();
  if (!t || /^(yes|always|true|ok)$/.test(t)) return { ok: true, says: 'always' };
  const parts = t.split(/\s+and\s+/);
  if (parts.length > 1) { const rs = parts.map((p) => readPlain(p, facts, input)); const bad = rs.find((r) => 'error' in r); if (bad) return bad; const ok = rs.every((r) => (r as { ok: boolean }).ok); return { ok, says: rs.map((r) => (r as { says: string }).says).join(' and ') }; }
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

// ---- a step from one word -------------------------------------------------------------------------------------------
/** An event, in words: why a flow started. */
export const saidOf = (e: FlowEvent): string => (e.kind === 'run' ? 'pressed ▶ Run' : e.kind === 'built' ? 'a build finished' : e.kind === 'flaw' ? `a flaw was found${e.text ? `: ${e.text}` : ''}` : e.kind === 'note' ? `a note was added${e.text ? `: ${e.text}` : ''}` : e.kind === 'tick' ? `${Number.isInteger(e.minutes) ? `${e.minutes} min` : `${Math.round((e.minutes ?? 0) * 60)} s`} in` : e.kind === 'start' ? 'the forge opened' : e.kind === 'made' ? `a shape was made${e.text ? `: ${e.text}` : ''}` : e.kind === 'cond' ? `it came true${e.text ? `: ${e.text}` : ''}` : `you said "${e.text ?? ''}"`);

// ---- a pipeline carried from one board to another, or kept ------------------------------------------------------------
/** A board made from a kept pipeline. */
