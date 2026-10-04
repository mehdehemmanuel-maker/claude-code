// Ego's Mind (src/mind): one event, a stand result on a design she built, becomes an observation, an anomaly, a
// hypothesis, a test, evidence, a belief and the next open question, each a commit in a journal, each derived from the
// one before; the same rule resumes the loop from the journal at any cut, and when nothing is left she rests. The
// stand here is a stand-in that answers the way the real one does for a table (tests/conformance/ego-mind.test.ts runs
// the real one): without aprons the leg joints break in bending under the push; with them it holds.

import { describe, expect, it } from 'vitest';
import { newDoc } from '../../src/doc/commands';
import type { StandResult, StandSetup } from '../../src/physics/stand';
import { gapsOf, lessonDiscovery, lessonId, gapId, lessonsOf, MemoryJournal, Mind, next, of, sayChanged, sayLesson, sayWorking, withLessons, type Commit } from '../../src/mind';
import { citations, stale } from '../../src/ganglia/dependencies';
import { constructionHash, lawOf } from '../../src/construct/laws';
import { ingest, substrate } from '../../src/ganglia/substrate';
import type { Report } from '../../src/ganglia/substrate';
import { text } from '../../src/ganglia/native/text';

const sim = { ...newDoc().sim, airDrag: false };

/** A stand that answers like the real one for a table: racks without aprons, holds with them, holds the proof load with less margin. */
function fakeStand(log: StandSetup[] = []) {
  return async (setup: StandSetup): Promise<StandResult> => {
    log.push(setup);
    const aprons = setup.parts.some((p) => /apron/.test(p.name));
    const kg = setup.loads.reduce((s, l) => s + l.kg, 0);
    const legJoint = setup.connections.find((c) => [c.a.part, c.b?.part].some((id) => /leg\d+$/.test(setup.parts.find((p) => p.id === id)?.name ?? '')))!;
    const base = { fractures: [], yielded: [], memberPeak: { part: setup.parts[0]!.id, u: 0.2 }, drop: 0.001, tilt: 0.002, seconds: 1.2, ms: 7 };
    if (!aprons) {
      const peak = Object.fromEntries(setup.connections.map((c) => [c.id, { u: c.id === legJoint.id ? 1.25 : 0.5, mode: 'bending', load: c.id === legJoint.id ? 60 : 24 }]));
      return { held: false, broken: [{ conn: legJoint.id, mode: 'bending', load: 60, capacity: 48 }], peak, worst: { conn: legJoint.id, ...peak[legJoint.id]! }, ...base };
    }
    const u = kg >= 90 ? 0.71 : 0.41;
    const peak = Object.fromEntries(setup.connections.map((c) => [c.id, { u, mode: 'bending', load: 20 * u }]));
    return { held: true, broken: [], peak, worst: { conn: legJoint.id, ...peak[legJoint.id]! }, ...base };
  };
}

const kinds = (cs: Commit[]) => cs.map((c) => `${c.kind}:${c.status}`);
const EXPECTED = ['observation:open', 'anomaly:open', 'hypothesis:testing', 'evidence:open', 'belief:open', 'question:testing', 'evidence:open', 'belief:resolved'];

/** The first event: a table for 60 kg built and put on the stand, with what she predicted for it. */
async function firstEvent(stand = fakeStand()) {
  const { buildTest, signatureOf } = await import('../../src/mind');
  const { setup, frag, roles } = buildTest({ spec: { what: 'table', load: 60 }, changes: [], factor: 1 }, sim);
  const result = await stand(setup);
  return { kind: 'stand-result' as const, inv: 'table-1', spec: { what: 'table' as const, load: 60 }, result, signature: signatureOf(result, frag, roles), predicted: { held: true, uMax: 2 / 3, model: 'foresight: static', laws: ['statics.load-path', 'joint.capacity'] }, since: performance.now() };
}

describe("Ego's Mind", () => {
  it('one stand result becomes observation, anomaly, hypothesis, test, evidence, belief and the next question, each derived from the last, until nothing is left and she rests', async () => {
    const log: StandSetup[] = [];
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(log), sim });
    expect(mind.active).toBe(false);
    await mind.process(await firstEvent(fakeStand()));
    const cs = of(journal.commits, 'table-1');
    expect(kinds(cs)).toEqual(EXPECTED);
    // recursion as data: every commit after the first derives from the one before it (and the hypothesis from the anomaly and the failed look)
    for (let i = 1; i < cs.length; i++) expect(cs[i]!.parents).toContain(cs[i - 1]!.seq);
    const [obs, anomaly, hyp, ev1, belief, question, ev2, done] = cs as [Commit, Commit, Commit, Commit, Commit, Commit, Commit, Commit];
    expect(obs.validation).toEqual({ by: 'test stand', verdict: 'failed' });
    expect(anomaly.data['sigma']).toBeGreaterThan(1);
    expect(anomaly.data['candidates']).toEqual(['racking', 'joints']);
    // the hypothesis is a structure in Nex with its mode unknown; the belief is the same structure held true by simulation
    expect(hyp.item.k === 'R' && hyp.item.c.mode).toBe('unknown');
    // the hypothesis is a construction law's, cited by id: the racking one
    expect(text(hyp.item)).toMatch(/construction\.mechanical\.triangulation/);
    expect(text(hyp.item)).toMatch(/failure:racking/);
    expect(hyp.data['change']).toEqual({ aprons: true });
    expect(ev1.validation.verdict).toBe('supported');
    expect(belief.item.k === 'R' && belief.item.c.mode).toBe('true');
    expect(belief.item.k === 'R' && belief.item.c.ev?.how).toBe('simulated');
    expect(belief.data['transition']).toEqual({ from: 'unknown', to: 'true' });
    expect(belief.data['hypothesisStatus']).toBe('confirmed');
    expect(belief.data['next']).toBe('proof');
    expect(question.item.k === 'R' && question.item.c.mode).toBe('unmeasured');
    expect(ev2.data['test']).toMatchObject({ factor: 1.5, changes: [{ aprons: true }] });
    expect(done.status).toBe('resolved');
    // the tests she ran: the design with aprons at the rated load, then at 1.5x (the proof load)
    expect(log.map((s) => [s.parts.some((p) => /apron/.test(p.name)), Math.round(s.loads.reduce((t, l) => t + l.kg, 0))])).toEqual([[true, 60], [true, 90]]);
    // dormant: nothing legal left, nothing scheduled
    expect(mind.active).toBe(false);
    expect(mind.unresolved()).toEqual([]);
    expect(next(journal.commits, 'table-1')).toEqual({ do: 'rest' });
    expect(journal.writes).toBe(8);
    expect(mind.stands).toMatchObject({ runs: 2 });
    expect(mind.steps.map((s) => s.did)).toEqual(['anomaly', 'hypothesise', 'test', 'judge', 'question', 'test', 'judge']);
    for (const s of mind.steps) expect(s.ms).toBeLessThan(2000);
  });

  it('cut at any commit and reopened by a fresh Mind, the journal resumes to the same end: the loop is a function of the data', async () => {
    const full = new MemoryJournal();
    await new Mind(full, { stand: fakeStand(), sim }).process(await firstEvent());
    for (let cut = 1; cut < full.commits.length; cut++) {
      const partial = new MemoryJournal(full.commits.slice(0, cut));
      const mind = new Mind(partial, { stand: fakeStand(), sim }, undefined, `s${cut}`);
      expect(mind.unresolved()).toEqual(['table-1']);
      const steps = await mind.resume();
      expect(steps.length).toBe(full.commits.length - cut);
      expect(kinds(partial.commits)).toEqual(EXPECTED);
      // what was done after the cut was done in the new session, derived from what the old one left
      expect(partial.commits.slice(cut).every((c) => c.session === `s${cut}`)).toBe(true);
      expect(partial.commits[cut]!.parents).toContain(partial.commits[cut - 1]!.seq);
      expect(mind.unresolved()).toEqual([]);
    }
    // a resolved journal resumes to nothing
    const again = new Mind(new MemoryJournal(full.commits), { stand: fakeStand(), sim });
    expect(await again.resume()).toEqual([]);
  });

  it('a test lost in flight (cut while the stand ran) is run again, not guessed', async () => {
    const full = new MemoryJournal();
    await new Mind(full, { stand: fakeStand(), sim }).process(await firstEvent());
    const atHypothesis = full.commits.findIndex((c) => c.kind === 'hypothesis') + 1;
    const log: StandSetup[] = [];
    const mind = new Mind(new MemoryJournal(full.commits.slice(0, atHypothesis)), { stand: fakeStand(log), sim });
    await mind.resume();
    expect(log.length).toBe(2);
    expect(log[0]!.parts.some((p) => /apron/.test(p.name))).toBe(true);
  });

  it('"what were you working on" and "what changed" are read off the journal, not kept as lines', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    expect(sayWorking(journal.commits)).toMatch(/^Nothing yet/);
    expect(sayChanged(journal.commits)).toMatch(/^Nothing/);
    await mind.process(await firstEvent());
    const working = sayWorking(journal.commits);
    expect(working).toMatch(/I was testing a table for 60 kg \(investigation table-1, 8 commits over 1 session\)/);
    expect(working).toMatch(/What happened: a table for 60 kg at 60 kg: 1 joint broke \(bending\), against my prediction of no joint past 67%/);
    expect(working).toMatch(/What I believe: a sideways push bends the leg joints.*\(confirmed: true\)/);
    expect(working).toMatch(/What was tested: a table for 60 kg with aprons .* at 60 kg: it held; the hardest-working joint at 41% of its capacity; a table for 60 kg with aprons .* at 90 kg \(1.5x, the proof load\): it held/);
    expect(working).toMatch(/Resolved: .* is proven at 90 kg\. Nothing left to do; I am idle\./);
    expect(working).toMatch(/In Nex: /);
    const changed = sayChanged(journal.commits);
    expect(changed).toMatch(/^Resolved: a table for 60 kg with aprons .* holds 90 kg\./);
    expect(changed).toMatch(/Test performed: .* at 90 kg \(1.5x, the proof load\): it held/);
    expect(changed).toMatch(/went from unmeasured to true/);
    expect(changed).toMatch(/Still uncertain: this is simulation evidence only, 1 run, never measured on a real piece, under physics /);
    // mid-way (after the first belief): the previous hypothesis, the test, the result, the transition, what remains
    const mid = new MemoryJournal(journal.commits.slice(0, 5));
    const c2 = sayChanged(mid.commits);
    expect(c2).toMatch(/^Before: I hypothesised that a sideways push bends the leg joints/);
    expect(c2).toMatch(/Test performed: a table for 60 kg with aprons .* at 60 kg: it held/);
    expect(c2).toMatch(/So the claim went from unknown to true .*; the hypothesis is confirmed\./);
    expect(c2).toMatch(/Next open question: the proof load\./);
    expect(sayWorking(mid.commits)).toMatch(/Unresolved: what to make of the last belief\. Next: ask the next question \(the proof load\)\./);
  });

  it('a request she cannot read is kept as a structure with no model behind it, never executed', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    await mind.process({ kind: 'request', text: 'please dance for me', since: performance.now() });
    const r = journal.commits[0]!;
    expect(r.kind).toBe('request');
    expect(r.item.k === 'R' && r.item.c.mode).toBe('unmodelled');
    expect(r.data['text']).toBe('please dance for me');
    expect(mind.unresolved()).toEqual([]);
    expect(sayWorking(journal.commits)).toMatch(/1 request I could not read is kept open \(the last: “please dance for me”\)/);
  });
});

describe('the watchdog as an event of her Mind', () => {
  const anomaly = (id: string, kind: 'jitter' | 'fell' = 'jitter') => ({ kind, severity: 'warning' as const, id, tick: 10, value: 0.3, limit: 0.05, detail: kind === 'jitter' ? 'shaking at 0.3 m/s with nothing moving it' : '0.3 m below the floor' });
  const event = (inv: string, part: { id: string; name: string; material: string; longest: number } | null, kind: 'jitter' | 'fell' = 'jitter') => ({ kind: 'watchdog' as const, inv, anomaly: anomaly(part?.id ?? '', kind), part, obligation: 'ML-3 (no energy without a source)', since: performance.now() });

  it('a finding is delivered to whoever listens the moment it is flagged, never polled for', async () => {
    const { LiveState } = await import('../../src/app/live');
    const live = new LiveState();
    const got: { kind: string; at: number }[] = [];
    live.onAnomaly.push((a) => got.push(a));
    live.flag(anomaly('p1'));
    expect(got).toHaveLength(1);
    expect(got[0]!.at).toBe(live.ticks);
    expect(live.health).toHaveLength(1);
  });

  it('jitter on a rubber band a metre long: the rigid model is outside its domain for it (sound crosses it in longer than a tick), derived, resolved, said', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    await mind.process(event('watch:jitter:p1', { id: 'p1', name: 'Band', material: 'rubber.natural', longest: 1 }));
    const cs = of(journal.commits, 'watch:jitter:p1');
    expect(kinds(cs)).toEqual(['observation:open', 'anomaly:open', 'hypothesis:testing', 'evidence:open', 'belief:resolved']);
    expect(cs[0]!.validation.verdict).toBe('failed');
    expect(cs[0]!.validation.margin).toBeCloseTo(6, 9);
    expect(cs[1]!.data['candidates']).toEqual(['rigid-domain']);
    expect(cs[2]!.data['lawHashes']).toHaveLength(1);
    expect((cs[3]!.data['outcome'] as { inside: boolean; ratio: number }).inside).toBe(false);
    expect((cs[3]!.data['outcome'] as { ratio: number }).ratio).toBeGreaterThan(2);
    expect(cs[4]!.item.k === 'R' && cs[4]!.item.c.mode).toBe('true');
    expect(mind.unresolved()).toEqual([]);
    expect(mind.stands.runs).toBe(0);
    expect(sayWorking(journal.commits)).toMatch(/looking into a watchdog finding \(jitter\) on Band/);
    expect(sayWorking(journal.commits)).toMatch(/Resolved: the finding is the rigid model extrapolating past its domain, not physics/);
    expect(sayChanged(journal.commits)).toMatch(/^Resolved: the rigid model is outside its domain for a 1\.00 m part in rubber\.natural/);
    expect(text(cs[4]!.item)).toContain('part:p1');
  });

  it('jitter on a steel block inside the rigid domain: the hypothesis is rejected, no other candidate, the question stays open as an anomaly of the physics', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    await mind.process(event('watch:jitter:p2', { id: 'p2', name: 'Block', material: 'steel.a36', longest: 0.5 }));
    const cs = of(journal.commits, 'watch:jitter:p2');
    expect(kinds(cs)).toEqual(['observation:open', 'anomaly:open', 'hypothesis:testing', 'evidence:open', 'belief:open', 'question:open']);
    expect(cs[3]!.validation.verdict).toBe('contradicted');
    expect(cs[4]!.data['next']).toBe('retry');
    expect(cs[5]!.data['asks']).toBe('unexplained');
    expect(mind.unresolved()).toEqual(['watch:jitter:p2']);
    expect(sayChanged(journal.commits)).toMatch(/^The part is inside the rigid domain; the finding stands/);
  });

  it('a part through the floor has no candidate she can test: observation, anomaly, open question; and a part admitted outside the rigid domain is noted, resolved, not an investigation', async () => {
    const { rigidDomain } = await import('../../src/ganglia/native/tsc');
    const { investigations } = await import('../../src/mind');
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    await mind.process(event('watch:fell:p3', { id: 'p3', name: 'Plank', material: 'wood.mdf', longest: 2 }, 'fell'));
    expect(kinds(of(journal.commits, 'watch:fell:p3'))).toEqual(['observation:open', 'anomaly:open', 'question:open']);
    await mind.process({ kind: 'construct', part: { id: 'p4', name: 'Band', material: 'rubber.natural', longest: 1 }, domain: rigidDomain('rubber.natural', 1), since: performance.now() });
    // the same part admitted again (a build loaded again) is not a second note
    await mind.process({ kind: 'construct', part: { id: 'p4', name: 'Band', material: 'rubber.natural', longest: 1 }, domain: rigidDomain('rubber.natural', 1), since: performance.now() });
    const note = of(journal.commits, 'construct:p4');
    expect(kinds(note)).toEqual(['observation:resolved']);
    expect(note[0]!.validation.verdict).toBe('contradicted');
    expect(investigations(journal.commits)).toEqual(['watch:fell:p3']);
    expect(mind.unresolved()).toEqual(['watch:fell:p3']);
    // the note is not what she is on; and said as a note, not as a test
    expect(mind.current()).toBe('watch:fell:p3');
    const { sayBrief } = await import('../../src/mind');
    expect(sayBrief(journal.commits, 'construct:p4', 'Noted')).toMatch(/^Noted, a note: Band \(1\.00 m of rubber\.natural\) is outside the rigid model's domain/);
    // resumed from the journal, the open question is still open and nothing runs
    const again = new Mind(new MemoryJournal(journal.commits), { stand: fakeStand(), sim }, undefined, 'later');
    expect(await again.resume()).toEqual([]);
    expect(again.unresolved()).toEqual(['watch:fell:p3']);
  });
});

describe('what failure teaches is language, not a patch (construct/lessons.ts)', () => {
  it('a confirmed hypothesis is a lesson: read off the journal, under the law it tested in the substrate, cited by hash and stale when the law changes, and applied to the next design of that class before it is built', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    await mind.process(await firstEvent(fakeStand()));
    const lessons = lessonsOf(journal.commits);
    expect(lessons).toHaveLength(1);
    const l = lessons[0]!;
    expect(l).toMatchObject({ law: 'mechanical.triangulation', what: 'racking', of: 'table', change: { aprons: true }, verdict: 'confirmed' });
    expect(mind.lessons()).toEqual(lessons);
    // the next table takes aprons before it is built, and says why; a bench is another class, and learns nothing from it
    const table = withLessons({ what: 'table', load: 60 }, lessons);
    expect(table.spec).toEqual({ what: 'table', load: 60, aprons: true });
    expect(table.applied).toEqual([l]);
    expect(sayLesson(l)).toBe('A table like this racked on my stand before, and aprons (rails between the legs under the top) held it; this one has them from the start.');
    expect(withLessons({ what: 'bench' }, lessons)).toEqual({ spec: { what: 'bench' }, applied: [] });
    expect(withLessons({ what: 'table', aprons: true }, lessons).applied).toEqual([]);
    // in the substrate: the lesson under the law it tested, with the stand as its source
    const d = lessonDiscovery(journal.commits);
    expect(d.entities.map((e) => e.id)).toEqual([lessonId(l)]);
    expect(d.relations).toEqual([expect.objectContaining({ from: lessonId(l), kind: 'governed-by', to: 'construction.mechanical.triangulation' })]);
    const sub = substrate();
    const report: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
    ingest(sub, d, report);
    const e = sub.get(lessonId(l))!;
    expect(e.domains).toContain('lesson');
    expect(e.says).toMatch(/on a table, racking was explained by mechanical.triangulation: aprons .* held on the stand/);
    expect(sub.outOf(lessonId(l), 'governed-by').map((x) => x.to)).toEqual(['construction.mechanical.triangulation']);
    // cited by hash: the lesson rests on the law's hash; the law gone or changed, the lesson is stale
    const cits = citations({ commits: journal.commits });
    const lesson = cits.find((c) => c.kind === 'lesson')!;
    const triangulation = constructionHash(lawOf('mechanical.triangulation')!);
    expect(lesson).toMatchObject({ id: `lesson:${l.seq}`, cites: [triangulation] });
    const here = new Set(cits.map((c) => c.hash).filter((h) => h !== triangulation));
    expect(stale(cits, here).map((c) => c.id)).toContain(`lesson:${l.seq}`);
  });

  it('a failure no law explains is a gap: named in the family it would belong to, not yet derived', async () => {
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand: fakeStand(), sim });
    const fell = { kind: 'watchdog' as const, inv: 'watch:fell:p3', anomaly: { kind: 'fell' as const, severity: 'warning' as const, id: 'p3', tick: 10, value: 0.3, limit: 0.05, detail: '0.3 m below the floor' }, part: { id: 'p3', name: 'Plank', material: 'wood.mdf', longest: 2 }, obligation: 'ML-3 (no energy without a source)', since: performance.now() };
    await mind.process(fell);
    const gaps = gapsOf(journal.commits);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ inv: 'watch:fell:p3', family: 'existence' });
    expect(gaps[0]!.what).toMatch(/^Plank \(wood\.mdf\) fell: /);
    expect(mind.gaps()).toEqual(gaps);
    const d = lessonDiscovery(journal.commits);
    expect(d.entities.map((e) => e.id)).toEqual([gapId(gaps[0]!)]);
    expect(d.entities[0]!.coverage.depth).toBe(0);
    expect(d.relations).toEqual([expect.objectContaining({ from: gapId(gaps[0]!), kind: 'is-a', to: 'construction.existence-family' })]);
    expect(lessonsOf(journal.commits)).toEqual([]);
  });
});
