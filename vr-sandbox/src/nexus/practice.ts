// The robot practising the pipeline: on the asks the testers wrote, it tries an edit it has not tried (another matter, the
// next seed, the conditions reading off), keeps whichever run did best for that ask (fewer checks failed, or as many and
// lighter), and says what it learned. Searching for the best of an ask is the same thing done at once: every matter at
// two seeds, the best kept. An ask that took over a minute is not practised again, so practice stays light.

import { compare, MATTERS, type PipeEdits, type PipeRun } from './pipe';

export interface Trial { ask: string; edits: PipeEdits; verdict: string; failed: number; checks: number; kg: number | null; ms: number; at: number }
export interface Practice { trials: Trial[]; best: Record<string, Trial>; slow: string[] }
export const newPractice = (): Practice => ({ trials: [], best: {}, slow: [] });
const key = (e: PipeEdits) => `${e.matter}|${e.seed}|${e.grow ? 1 : 0}`;
export const trialOf = (r: PipeRun, at = Date.now()): Trial => ({ ask: r.ask, edits: { ...r.edits }, verdict: r.verdict, failed: r.failed, checks: r.checks, kg: r.kg, ms: r.ms, at });
const asRun = (t: Trial): PipeRun => ({ ask: t.ask, edits: t.edits, stages: [], checks: t.checks, failed: t.failed, verdict: t.verdict, kg: t.kg, ms: t.ms });
const short = (s: string) => (s.length > 60 ? `${s.slice(0, 58)}…` : s);

/** What to try next: the ask practised least (of those that run in under a minute), and on it the first edit not yet tried
 *  (each matter at the seed it starts from, then the next seed of the best so far, then reading off); null when every ask
 *  has had every edit. */
export function nextTry(p: Practice, asks: string[], base: PipeEdits, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): { ask: string; edits: PipeEdits; why: string } | null {
  const open = asks.filter((a) => !p.slow.includes(a)), tried = (a: string) => p.trials.filter((t) => t.ask === a);
  const order = [...open].sort((x, y) => tried(x).length - tried(y).length);
  const least = order.filter((a) => tried(a).length === tried(order[0] ?? '').length), first = least.length ? least[pick(least.length)]! : null;
  for (const ask of first ? [first, ...order.filter((a) => a !== first)] : order) {
    const done = new Set(tried(ask).map((t) => key(t.edits))), best = p.best[ask]?.edits ?? base;
    const cands: [PipeEdits, string][] = [
      ...MATTERS.map((m): [PipeEdits, string] => [{ ...base, physics: false, matter: m }, m === 'any' ? `how "${short(ask)}" does as Claude runs it` : `whether ${m} would do better on "${short(ask)}"`]),
      [{ ...best, physics: false, seed: best.seed + 1 }, `whether the next seed draws "${short(ask)}" better`],
      [{ ...best, physics: false, grow: false }, `what "${short(ask)}" comes to without its conditions read`],
    ];
    const c = cands.find(([e]) => !done.has(key(e)));
    if (c) return { ask, edits: c[0], why: c[1] };
  }
  return null;
}

/** A trial learned from: kept, its ask marked slow where it took over a minute, and the best for its ask replaced where
 *  it did better. Says whether it was better than the best before it, and why. */
export function learn(p: Practice, t: Trial): { better: boolean; first: boolean; why: string } {
  p.trials.push(t); if (p.trials.length > 300) p.trials.shift();
  if (t.ms > 60_000 && !p.slow.includes(t.ask)) p.slow.push(t.ask);
  const was = p.best[t.ask];
  if (!was) { p.best[t.ask] = t; return { better: false, first: true, why: `${t.verdict.toLowerCase()} with ${t.failed} failed, ${t.edits.matter}` }; }
  const c = compare(asRun(was), asRun(t));
  if (c.is === 'better') { p.best[t.ask] = t; return { better: true, first: false, why: `${t.edits.matter}, seed ${t.edits.seed}${t.edits.grow ? '' : ', conditions off'}: ${c.why}` }; }
  return { better: false, first: false, why: c.is === 'worse' ? `${t.edits.matter} did worse: ${c.why}` : `${t.edits.matter} made no difference` };
}

/** What practice has taught it: which matter did best on how many of the asks it practised, and how many it got to hold. */
export function lessons(p: Practice): string[] {
  const best = Object.values(p.best); if (!best.length) return ['Nothing practised yet: when I am bored I try an edit on a test ask.'];
  const by = new Map<string, number>(); for (const t of best) by.set(t.edits.matter, (by.get(t.edits.matter) ?? 0) + 1);
  const held = best.filter((t) => t.failed === 0).length;
  return [
    `${p.trials.length} tries on ${best.length} asks; ${held} of them hold at their best.`,
    ...[...by].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m === 'any' ? 'Claude\'s own pick of matter' : m} did best on ${n} ask${n === 1 ? '' : 's'}.`),
    ...(p.slow.length ? [`${p.slow.length} ask${p.slow.length === 1 ? '' : 's'} took over a minute; I leave ${p.slow.length === 1 ? 'it' : 'them'} to you.`] : []),
  ];
}

/** The edits a search for the best of an ask tries: every matter at its seed and the next, the physics off to be quick. */
export function variants(base: PipeEdits): PipeEdits[] {
  return [base.seed, base.seed + 1].flatMap((seed) => MATTERS.map((matter) => ({ ...base, seed, matter, physics: false })));
}
/** The best of several runs of an ask. */
export const bestOf = (runs: PipeRun[]): PipeRun | null => runs.reduce<PipeRun | null>((b, r) => (!b || compare(b, r).is === 'better' ? r : b), null);
