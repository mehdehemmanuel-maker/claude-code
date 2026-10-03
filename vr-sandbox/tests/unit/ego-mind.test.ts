// Ego's Mind (src/mind): one event, a stand result on a design she built, becomes an observation, an anomaly, a
// hypothesis, a test, evidence, a belief and the next open question, each a commit in a journal, each derived from the
// one before; the same rule resumes the loop from the journal at any cut, and when nothing is left she rests. The
// stand here is a stand-in that answers the way the real one does for a table (tests/conformance/ego-mind.test.ts runs
// the real one): without aprons the leg joints break in bending under the push; with them it holds.

import { describe, expect, it } from 'vitest';
import { newDoc } from '../../src/doc/commands';
import type { StandResult, StandSetup } from '../../src/physics/stand';
import { MemoryJournal, Mind, next, of, sayChanged, sayWorking, type Commit } from '../../src/mind';
import { text } from '../../src/ganglia/native/text';

const sim = { ...newDoc().sim, airDrag: false };

/** A stand that answers like the real one for a table: racks without aprons, holds with them, holds the proof load with less margin. */
function fakeStand(log: StandSetup[] = []) {
  return async (setup: StandSetup): Promise<StandResult> => {
    log.push(setup);
    const aprons = setup.parts.some((p) => /apron/.test(p.name));
    const kg = setup.loads.reduce((s, l) => s + l.kg, 0);
    const legJoint = setup.connections.find((c) => /leg\d+$/.test(setup.parts.find((p) => p.id === c.a.part)?.name ?? ''))!;
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
  const { setup, frag } = buildTest({ spec: { what: 'table', load: 60 }, changes: [], factor: 1 }, sim);
  const result = await stand(setup);
  return { kind: 'stand-result' as const, inv: 'table-1', spec: { what: 'table' as const, load: 60 }, result, signature: signatureOf(result, frag), predicted: { held: true, uMax: 2 / 3, model: 'foresight: static', laws: ['statics.load-path', 'joint.capacity'] }, since: performance.now() };
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
    expect(text(hyp.item)).toMatch(/design:table-without-aprons/);
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
