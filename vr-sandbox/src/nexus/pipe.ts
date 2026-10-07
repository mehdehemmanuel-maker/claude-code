// The pipeline Claude runs on every ask, as stages you can watch, run yourself, edit, and tell Claude about. An ask is
// read into what it must do; that is read into conditions (its loads, what holds it, how far it reaches, its limits);
// a frame is grown to them, as a living network grows where what it carries flows; it is made from what can be had;
// it is checked against every law and limit; and its law of scale is said. Each stage keeps what it found, so a run
// can be read stage by stage, and two runs of the same ask compared: an edit is kept only where more of it holds.

import { answersFrom, conceive, designs, GROW_TRACE, READING, scaleSay } from './conceive';
import type { Jolt } from './realize';

/** What you may change in the pipeline: which lawful design is drawn first, what its frame may be made of, whether it
 *  is grown from its conditions at all, and whether it is let go and pushed in the physics. */
export interface PipeEdits { seed: number; matter: Matter; grow: boolean; physics: boolean }
export type Matter = 'any' | 'steel' | 'aluminium' | 'wood' | 'carbon';
export const MATTERS: Matter[] = ['any', 'steel', 'aluminium', 'wood', 'carbon'];
/** The pipeline as Claude runs it. */
export const EDITS0: PipeEdits = { seed: 101, matter: 'any', grow: true, physics: true };
const MATTER_ID: Record<Exclude<Matter, 'any'>, string> = { steel: 'steel.a36', aluminium: 'aluminum.6061-t6', wood: 'wood.douglas-fir', carbon: 'composite.cfrp' };

export type StageId = 'read' | 'conditions' | 'grow' | 'make' | 'check' | 'scale';
export interface PipeStage { id: StageId; title: string; /** what this stage does, plainly */ does: string; /** passed, failed, or not reached */ ok: boolean | null; line: string; lines: string[] }
export interface PipeRun { ask: string; edits: PipeEdits; stages: PipeStage[]; checks: number; failed: number; verdict: string; kg: number | null; ms: number }

export const STAGES: { id: StageId; title: string; does: string }[] = [
  { id: 'read', title: 'Read', does: 'the words are read into what it must do: hold, carry, span, stand, move, keep warm' },
  { id: 'conditions', title: 'Conditions', does: 'what it must do is read into physics: its loads and where, what holds it, how far it reaches, the wind, the limits said' },
  { id: 'grow', title: 'Grow', does: 'every way a strut could go is laid down; each is sized by what flows through it, and the least used are given up, round by round, as a living network grows' },
  { id: 'make', title: 'Make', does: 'it is made from what can be had: kept tube and timber sizes, sheets as sold, plates and footings, each part placed under the laws' },
  { id: 'check', title: 'Check', does: 'every law and limit is checked: strength, buckling, sag, tipping, wind, weight, size' },
  { id: 'scale', title: 'Scale', does: 'how it changes made bigger or smaller: what fails first, and at what size' },
];

/** An ask through the pipeline, with your edits: each stage and what it found. */
export function runPipeline(ask: string, edits: PipeEdits = EDITS0, J: Jolt | null = null): PipeRun {
  const t0 = Date.now(), rounds: string[] = [], was = READING.conditions, watch = GROW_TRACE.on;
  READING.conditions = edits.grow;
  GROW_TRACE.on = (r) => { rounds.push(`${r.matter.replace(/\..*/, '')}, round ${r.round}: ${r.struts} struts at ${r.joints} joints, ${+r.mass.toPrecision(3)} kg${r.ok ? '' : ', not holding yet'}`); };
  const stage = (id: StageId, ok: boolean | null, line: string, lines: string[]): PipeStage => ({ ...STAGES.find((s) => s.id === id)!, ok, line, lines });
  try {
    let c = conceive(ask), all: Record<string, string> = {};
    for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(ask, all); }
    if (edits.matter !== 'any') { const id = MATTER_ID[edits.matter]; c = { ...c, matter: id, wants: c.wants.map((w) => (w.cond ? { ...w, cond: { ...w.cond, matter: id } } : w)) }; }
    const read = stage('read', c.wants.length > 0, c.wants.length ? c.wants.map((w) => w.says).join('; ') : 'nothing in it is something made yet', [...c.heard, ...c.unread.map((u) => `not made: ${u}`), ...c.dropped.map((d) => `not used: ${d}`)]);
    if (!c.wants.length) return finish([read, ...(['conditions', 'grow', 'make', 'check', 'scale'] as StageId[]).map((id) => stage(id, null, 'not reached', []))], 0, 0, 'NOTHING MADE', null);
    const d = designs(c, 1, { seed: edits.seed, physics: edits.physics ? J : null })[0];
    if (!d) return finish([read, ...(['conditions', 'grow', 'make', 'check', 'scale'] as StageId[]).map((id) => stage(id, null, 'not reached', []))], 0, 0, 'NOTHING MADE', null);
    const grown = d.choices.find((x) => /^a frame of \d+ struts/.test(x)), made = d.checks.find((x) => x.what === 'it can be made under the laws');
    const failed = d.checks.filter((x) => !x.ok);
    const stages = [
      read,
      stage('conditions', d.conditions ? true : null, !edits.grow ? `reading the ask into conditions is off (your edit)${d.conditions ? `; the way kept for what it is called set ${d.conditions.length}` : ''}` : d.conditions ? `${d.conditions.length} conditions it is grown to meet` : 'a drawn way does what it asks: not grown from conditions', d.conditions ?? []),
      stage('grow', grown ? true : null, grown ? grown.replace(/: grown from .*$/, '') : 'not grown: made by a drawn way', [...(grown ? [grown] : []), ...rounds]),
      stage('make', made ? made.ok : d.parts > 0, `${d.parts} parts, ${+d.mass.toPrecision(3)} kg${made && !made.ok ? ': not made under the laws' : ''}`, [...(made ? [`${made.ok ? '✓' : '✗'} ${made.what}: ${made.says}`] : []), ...d.choices, ...d.gaps.map((g) => `not yet: ${g}`)]),
      stage('check', failed.length === 0, `${d.checks.length - failed.length} of ${d.checks.length} checks pass`, d.checks.map((x) => `${x.ok ? '✓' : '✗'} ${x.what}: ${x.says}`)),
      stage('scale', null, (() => { const law = scaleSay(d); return law.length ? 'how it changes made bigger or smaller' : 'no law of scale for what is drawn'; })(), scaleSay(d)),
    ];
    return finish(stages, d.checks.length, failed.length, d.ok ? 'HOLDS' : d.holds ? 'HOLDS, A LIMIT MISSED' : 'FAILS', d.mass);
  } finally { READING.conditions = was; GROW_TRACE.on = watch; }
  function finish(stages: PipeStage[], checks: number, failed: number, verdict: string, kg: number | null): PipeRun { return { ask, edits, stages, checks, failed, verdict, kg, ms: Date.now() - t0 }; }
}

/** Two runs of the same ask, the second after an edit: better where fewer checks fail, or as many fail and it is lighter
 *  by more than a hundredth; worse the other way; else the same. */
export function compare(before: PipeRun, after: PipeRun): { is: 'better' | 'worse' | 'same'; why: string } {
  if (before.ask !== after.ask) return { is: 'same', why: 'a different ask: nothing to compare' };
  const made = (r: PipeRun) => r.verdict !== 'NOTHING MADE';
  if (made(after) && !made(before)) return { is: 'better', why: 'something is made where nothing was' };
  if (!made(after) && made(before)) return { is: 'worse', why: 'nothing is made where something was' };
  if (after.failed < before.failed) return { is: 'better', why: `${before.failed - after.failed} fewer checks fail` };
  if (after.failed > before.failed) return { is: 'worse', why: `${after.failed - before.failed} more checks fail` };
  if (before.kg && after.kg && after.kg < before.kg * 0.99) return { is: 'better', why: `as many hold, ${+(before.kg - after.kg).toPrecision(3)} kg lighter` };
  if (before.kg && after.kg && after.kg > before.kg * 1.01) return { is: 'worse', why: `as many hold, ${+(after.kg - before.kg).toPrecision(3)} kg heavier` };
  return { is: 'same', why: 'as many hold, about as heavy' };
}

/** What you say about a stage, as a note Claude can act on: the stage, the ask, your edits, and what the run found. Claude
 *  tries it on the asks the testers wrote and keeps it only where more of them hold. */
export function noteFor(run: PipeRun, id: StageId, text: string): string {
  const s = run.stages.find((x) => x.id === id)!, e = run.edits;
  return `Pipeline note on the ${s.title} stage: ${text.trim()}\n\nThe ask: "${run.ask.slice(0, 400)}"\nEdits: seed ${e.seed}, matter ${e.matter}, grow from conditions ${e.grow ? 'on' : 'off'}, physics ${e.physics ? 'on' : 'off'}.\nThat run: ${run.verdict}, ${run.failed} of ${run.checks} checks failed${run.kg ? `, ${+run.kg.toPrecision(3)} kg` : ''}. ${s.title}: ${s.line}.\n\nTry it on the test asks; keep it only if more of them hold.`;
}
