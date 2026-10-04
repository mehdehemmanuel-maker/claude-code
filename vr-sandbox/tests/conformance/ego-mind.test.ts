// Ego's Mind on the real stand: a table for 60 kg, designed and built as she builds it, put on the stand (a world of
// its own with the same physics), investigated to rest. The stand's old loop (prove.ts) found this table racks without
// aprons and holds with them; the Mind finds the same, as a journal of structures, resumable at any commit.

import { describe, expect, it } from 'vitest';
import { jolt } from './helpers';
import { PhysicsWorld } from '../../src/physics/world';
import { runStand, type StandSetup } from '../../src/physics/stand';
import { newDoc } from '../../src/doc/commands';
import { buildTest, MemoryJournal, Mind, of, overturning, PUSH, sayChanged, sayWorking, signatureOf } from '../../src/mind';

const sim = { ...newDoc().sim, airDrag: false };

describe("Ego's Mind on the stand", () => {
  it('a table for 60 kg: fails as built, the racking hypothesis is tested and confirmed, the proof load holds, the investigation resolves; cut after the hypothesis, it resumes to the same end', async () => {
    const J = await jolt();
    const stand = async (s: StandSetup) => { const w = new PhysicsWorld(J, s.sim); try { return runStand(w, s); } finally { w.destroy(); } };
    const { setup, frag, roles } = buildTest({ spec: { what: 'table', load: 60 }, changes: [], factor: 1 }, sim);
    const result = await stand(setup);
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand, sim });
    await mind.process({ kind: 'stand-result', inv: 'table-real', spec: { what: 'table', load: 60 }, result, signature: signatureOf(result, frag, roles), predicted: { held: true, uMax: 2 / 3, model: 'foresight: static', laws: ['statics.load-path', 'joint.capacity'] }, since: performance.now() });
    const cs = of(journal.commits, 'table-real');
    expect(cs.map((c) => `${c.kind}:${c.status}`)).toEqual(['observation:open', 'anomaly:open', 'hypothesis:testing', 'evidence:open', 'belief:open', 'question:testing', 'evidence:open', 'belief:resolved']);
    // as built it stood, but a leg joint worked past the 67% she allows: that is the failure, as the old loop found it
    expect(cs[0]!.validation.verdict).toBe('failed');
    expect((cs[0]!.data['outcome'] as { u: number }).u).toBeGreaterThan(2 / 3);
    expect(cs[2]!.data['change']).toEqual({ aprons: true });
    expect(mind.unresolved()).toEqual([]);
    expect(mind.stands.runs).toBe(2);
    expect(sayChanged(journal.commits)).toMatch(/^Resolved: a table for 60 kg with aprons .* holds 90 kg\./);
    expect(sayWorking(journal.commits)).toMatch(/Resolved: .* is proven at 90 kg/);
    // the cost, for the record: simulated seconds and wall ms per stand run
    console.log(`stand runs: ${mind.stands.runs}, ${mind.stands.seconds.toFixed(1)} s simulated, ${mind.stands.ms.toFixed(0)} ms wall; steps: ${mind.steps.map((s) => `${s.did} ${s.ms.toFixed(1)} ms`).join(', ')}`);
    // the cut: a fresh Mind over the journal up to the hypothesis runs the lost test again and reaches the same end
    const cut = new MemoryJournal(journal.commits.slice(0, 3));
    const again = new Mind(cut, { stand, sim }, undefined, 'later');
    const steps = await again.resume();
    expect(steps.map((s) => s.did)).toEqual(['test', 'judge', 'question', 'test', 'judge']);
    expect(cut.commits.map((c) => `${c.kind}:${c.status}`)).toEqual(cs.map((c) => `${c.kind}:${c.status}`));
    expect(cut.commits.slice(3).every((c) => c.session === 'later')).toBe(true);
  }, 120000);

  it('a shelf unit for 20 kg a shelf, free-standing: strong enough, not stable; pushed from the front at the top it tips in one piece at the first test, as the overturning law says, and the only hypothesis is anchoring, a design question held open with nothing the stand can test', async () => {
    const J = await jolt();
    const stand = async (s: StandSetup) => { const w = new PhysicsWorld(J, s.sim); try { return runStand(w, s); } finally { w.destroy(); } };
    const { setup, frag, roles } = buildTest({ spec: { what: 'shelf', load: 20 }, changes: [], factor: 1 }, sim);
    // the least favourable push (mechanical.overturning): across the depth, the shortest span of the footprint, at the top shelf; the unit stands at
    // reach height (scale.person) on a base one shelf deep, so with its shelves loaded the push it holds (W b/2 ÷ h) is a fraction of a person's
    const push = setup.pushes![0]!;
    expect(push.force).toEqual([0, 0, -PUSH]);
    const tip = overturning(frag, setup.loads, push, Math.hypot(...sim.gravity));
    expect(tip.ratio).toBeGreaterThan(1);
    expect(tip.takes).toBeLessThan(PUSH / 2);
    const result = await stand(setup);
    const journal = new MemoryJournal();
    const mind = new Mind(journal, { stand, sim });
    await mind.process({ kind: 'stand-result', inv: 'shelf-real', spec: { what: 'shelf', load: 20 }, result, signature: signatureOf(result, frag, roles), predicted: { held: true, uMax: 2 / 3, model: 'foresight: static', laws: ['statics.load-path', 'joint.capacity'] }, since: performance.now() });
    const cs = of(journal.commits, 'shelf-real');
    // the first look fails as the law said it would: the anomaly against a static prediction is the tilt, not a joint, and no test can settle anchoring
    expect(cs.map((c) => `${c.kind}:${c.status}`)).toEqual(['observation:open', 'anomaly:open', 'hypothesis:open']);
    expect(result.held).toBe(false);
    const o = cs[0]!.data['outcome'] as { held: boolean; broken: number; tilt: number; u: number };
    expect(cs[0]!.validation.verdict).toBe('failed');
    expect(o.broken).toBe(0);
    expect(o.tilt).toBeGreaterThan((5 * Math.PI) / 180);
    expect(o.u).toBeLessThanOrEqual(2 / 3);
    expect(cs[1]!.data['candidates']).toEqual(['anchor']);
    expect(cs[2]!.data['candidate']).toBe('anchor');
    expect(mind.unresolved()).toEqual(['shelf-real']);
    expect(mind.stands.runs).toBe(0);
    expect(sayWorking(journal.commits)).toMatch(/Open: it tipped over in one piece and nothing broke/);
  }, 120000);
});
