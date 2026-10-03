// What she says about her own work, read off the journal: never a canned line. "What were you working on?" walks the
// current investigation's commits; "What changed?" reads the last belief and what it was derived from. The Nex of the
// structure she holds is said after the words, as everywhere else (docs/EGO-NATIVE-LANGUAGE.md).

import { text } from '../ganglia/native/text';
import type { Commit } from './journal';
import { investigations, of } from './journal';
import { describeChange, next, type Change, type Outcome, type Prediction, type TestSpec } from './investigate';

const pct = (u: number) => `${Math.round(u * 100)}%`;
const kg = (t: TestSpec) => t.spec.load !== undefined ? `${Math.round(t.spec.load * t.factor)} kg` : 'its own weight';

/** A design, said from its spec. */
export function sayDesign(t: TestSpec): string {
  const ch = t.changes.map(describeChange);
  return `a ${t.spec.what}${t.spec.load !== undefined ? ` for ${t.spec.load} kg` : ''}${ch.length ? ` with ${ch.join(' and ')}` : ''}`;
}

function sayOutcome(o: Outcome): string {
  if (o.held) return `it held; the hardest-working joint at ${pct(o.u)} of its capacity`;
  const why: string[] = [];
  if (o.broken) why.push(`${o.broken} joint${o.broken === 1 ? '' : 's'} broke${o.worst ? ` (${o.worst.mode})` : ''}`);
  if (o.fractures) why.push(`${o.fractures} member${o.fractures === 1 ? '' : 's'} fractured`);
  if (o.yielded) why.push(`${o.yielded} bent past yield`);
  if (o.tilt >= (5 * Math.PI) / 180) why.push(`it tipped ${Math.round((o.tilt * 180) / Math.PI)}°`);
  if (o.drop >= 0.02) why.push(`it sank ${Math.round(o.drop * 1000)} mm`);
  return why.join(', ') || 'it failed';
}

/** The subject of an investigation: a design on the stand, or a part the watchdog flagged. */
function subjectOf(c: Commit): string {
  if (c.data['of'] === 'watchdog') { const a = c.data['anomaly'] as { kind: string }, p = c.data['part'] as { name: string } | null; return `a watchdog finding (${a.kind}) on ${p?.name ?? 'the scene'}`; }
  return sayDesign(c.data['test'] as TestSpec);
}

function sayTest(c: Commit): string {
  if (c.data['of'] === 'watchdog') {
    if (c.kind === 'observation') { const a = c.data['anomaly'] as { kind: string; value: number; limit: number; detail: string }; return `${a.kind}: ${a.detail} (${a.value.toPrecision(3)} against ${a.limit.toPrecision(3)})`; }
    const o = c.data['outcome'] as { crossing: number; tick: number; ratio: number; inside: boolean; critical: number };
    return `the sound crossing against the tick: ${(o.crossing * 1000).toFixed(1)} ms against ${(o.tick * 1000).toFixed(1)} ms (ratio ${o.ratio.toFixed(2)}): ${o.inside ? 'inside the rigid domain' : `outside it, past ${o.critical.toFixed(2)} m`}`;
  }
  const t = c.data['test'] as TestSpec, o = c.data['outcome'] as Outcome;
  return `${sayDesign(t)} at ${kg(t)}${t.factor > 1 ? ` (${t.factor}x, the proof load)` : ''}: ${sayOutcome(o)}`;
}

/** "What were you working on?" from the journal: the current investigation, what it found, what it holds, what is still open, and the next legal action. */
export function sayWorking(commits: Commit[]): string {
  const invs = investigations(commits);
  const inv = invs.at(-1);
  const requests = commits.filter((c) => c.kind === 'request');
  if (!inv) return requests.length ? `Nothing of my own: ${requests.length} request${requests.length === 1 ? '' : 's'} I could not read ${requests.length === 1 ? 'is' : 'are'} kept open (the last: “${String(requests.at(-1)!.data['text']).slice(0, 60)}”).` : 'Nothing yet: I start an investigation when a design of mine is tested.';
  const cs = of(commits, inv);
  const first = cs[0]!;
  const parts: string[] = [];
  parts.push(`I was ${first.data['of'] === 'watchdog' ? 'looking into' : 'testing'} ${subjectOf(first)} (investigation ${inv}, ${cs.length} commit${cs.length === 1 ? '' : 's'} over ${new Set(cs.map((c) => c.session)).size} session${new Set(cs.map((c) => c.session)).size === 1 ? '' : 's'}).`);
  const obs = cs.find((c) => c.kind === 'observation')!;
  parts.push(`What happened: ${sayTest(obs)}${obs.validation.verdict === 'failed' && obs.data['of'] !== 'watchdog' ? `, against my prediction of no joint past ${pct((obs.data['predicted'] as Prediction).uMax)}` : obs.data['of'] === 'watchdog' ? `, against the obligation ${obs.data['obligation']}` : ''}.`);
  const hyps = cs.filter((c) => c.kind === 'hypothesis');
  const beliefs = cs.filter((c) => c.kind === 'belief');
  const evidence = cs.filter((c) => c.kind === 'evidence');
  if (hyps.length) {
    const h = hyps.at(-1)!;
    const judged = beliefs.find((b) => b.data['hypothesis'] === h.seq);
    parts.push(`What I believe: ${h.data['says']}${judged ? ` (${judged.data['hypothesisStatus']}: ${(judged.data['transition'] as { to: string }).to})` : ' (not yet tested)'}.`);
  }
  if (evidence.length) parts.push(`What was tested: ${evidence.map(sayTest).join('; ')}.`);
  const lastC = cs.at(-1)!;
  const action = next(commits, inv);
  if (lastC.status === 'resolved') parts.push(first.data['of'] === 'watchdog' ? `Resolved: ${(lastC.data['transition'] as { to: string }).to === 'true' ? 'the finding is the rigid model extrapolating past its domain, not physics' : 'the finding stands'}. Nothing left to do; I am idle.` : `Resolved: ${sayDesign(lastC.data['test'] as TestSpec)} is proven at ${kg(lastC.data['test'] as TestSpec)}. Nothing left to do; I am idle.`);
  else if (lastC.kind === 'question' && lastC.status === 'open') parts.push(`Unresolved: ${lastC.data['says']}. The anomaly stays open; I have no legal action until something changes.`);
  else if (lastC.kind === 'hypothesis' && lastC.status === 'open') parts.push(`Open: ${lastC.data['says']}. Nothing I can test; it waits on a design decision.`);
  else {
    const open = lastC.kind === 'question' ? `whether ${sayDesign((lastC.data['test'] as TestSpec))} holds ${kg(lastC.data['test'] as TestSpec)}` : lastC.kind === 'hypothesis' ? `whether ${describeChange(lastC.data['change'] as Change)} settles it` : `what to make of the last ${lastC.kind}`;
    parts.push(`Unresolved: ${open}. Next: ${sayAction(action)}.`);
  }
  if (requests.length) parts.push(`Also kept: ${requests.length} request${requests.length === 1 ? '' : 's'} I could not read.`);
  const held = beliefs.at(-1) ?? hyps.at(-1);
  if (held) parts.push(`In Nex: ${text(held.item)}.`);
  return parts.join(' ');
}

export function sayAction(a: ReturnType<typeof next>): string {
  switch (a.do) {
    case 'anomaly': return 'open the anomaly between what I predicted and what the stand showed';
    case 'hypothesise': return 'choose a hypothesis for it and the test that would settle it';
    case 'test': return 'run that test on the stand';
    case 'judge': return 'read the evidence against the hypothesis';
    case 'question': return 'ask the next question (the proof load)';
    case 'rest': return 'nothing: rest';
  }
}

/** "What changed?" from the journal: the last belief, the hypothesis before it, the test performed, its result, the transition, and what is still uncertain. */
export function sayChanged(commits: Commit[]): string {
  const b = commits.filter((c) => c.kind === 'belief').at(-1);
  if (!b) {
    const h = commits.filter((c) => c.kind === 'hypothesis').at(-1);
    return h ? `Nothing yet: I hold a hypothesis (${h.data['says']}) and its test has not come back.` : 'Nothing: no belief of mine has changed yet.';
  }
  const by = (seq: number) => commits.find((c) => c.seq === seq);
  const ev = by(b.parents[1] ?? -1);
  const tested = by(b.parents[0] ?? -1);
  const tr = b.data['transition'] as { from: string; to: string } | undefined;
  const u = b.data['uncertainty'] as { species: string; replication: number; measured: boolean } | undefined;
  const parts: string[] = [];
  const rigid = b.data['test'] as { material?: string; longest?: number } | undefined;
  if (rigid?.material !== undefined) parts.push(b.status === 'resolved' ? `Resolved: the rigid model is outside its domain for a ${rigid.longest!.toFixed(2)} m part in ${rigid.material}; the finding is its extrapolation, not physics.` : `The part is inside the rigid domain; the finding stands.`);
  else if (b.status === 'resolved') parts.push(`Resolved: ${sayDesign(b.data['test'] as TestSpec)} holds ${kg(b.data['test'] as TestSpec)}.`);
  else if (tested?.kind === 'hypothesis') parts.push(`Before: I hypothesised that ${tested.data['says']}.`);
  else if (tested?.kind === 'question') parts.push(`Before: it was unmeasured whether ${sayDesign(tested.data['test'] as TestSpec)} holds ${kg(tested.data['test'] as TestSpec)}.`);
  if (ev) parts.push(`Test performed: ${sayTest(ev)}.`);
  if (tr) parts.push(`So the claim went from ${tr.from} to ${tr.to}${b.validation.margin !== undefined ? ` (${b.validation.margin.toFixed(1)} tolerances past the bound)` : ''}${b.data['hypothesisStatus'] ? `; the hypothesis is ${b.data['hypothesisStatus']}` : ''}.`);
  if (u) parts.push(`Still uncertain: this is ${u.species} evidence only, ${u.replication} run${u.replication === 1 ? '' : 's'}, ${u.measured ? 'measured' : 'never measured on a real piece'}, under physics ${String((b.data['uncertainty'] as { physics?: string }).physics ?? b.physics)}.`);
  const after = b.data['next'];
  if (after === 'proof') parts.push('Next open question: the proof load.');
  else if (after === 'retry') parts.push('Next: another hypothesis for the same anomaly.');
  else if (after === 'anomaly') parts.push('Next: the proof test failed; a new anomaly.');
  parts.push(`In Nex: ${text(b.item)}.`);
  return parts.join(' ');
}

/** One line for the headset when the loop rests (or picks up): what the stand found, what she now holds, what is open. */
export function sayBrief(commits: Commit[], inv: string, lead: string): string {
  const cs = of(commits, inv);
  const obs = cs.find((c) => c.kind === 'observation');
  if (!obs) return `${lead}: nothing to say yet.`;
  const lastC = cs.at(-1)!;
  if (obs.data['of'] === 'watchdog') {
    const b = cs.filter((c) => c.kind === 'belief').at(-1);
    return `${lead}, ${subjectOf(obs)}: ${b ? ((b.data['transition'] as { to: string }).to === 'true' ? 'the rigid model is extrapolating past its domain for that part; the finding is not physics' : 'the part is inside the rigid domain; the finding stands as an anomaly') : lastC.kind === 'question' ? String(lastC.data['says']) : 'still open'}.`;
  }
  const o = obs.data['outcome'] as Outcome;
  const first = `${lead}, ${sayDesign(obs.data['test'] as TestSpec)} as built ${o.held ? 'held' : `failed (${sayOutcome(o)})`}`;
  if (lastC.status === 'resolved') return `${first}; ${sayDesign(lastC.data['test'] as TestSpec)} is proven at ${kg(lastC.data['test'] as TestSpec)}. Ask me what changed.`;
  if (lastC.kind === 'question' && lastC.status === 'open') return `${first}; ${lastC.data['says']}. The anomaly stays open.`;
  if (lastC.kind === 'hypothesis' && lastC.status === 'open') return `${first}; ${lastC.data['says']}.`;
  return `${first}; still open: ${sayAction(next(commits, inv))}.`;
}
