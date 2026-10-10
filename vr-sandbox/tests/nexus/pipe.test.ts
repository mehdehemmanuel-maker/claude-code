// The pipeline as the phone runs it: stage by stage, with your edits, two runs compared, and a note for Claude.

import { describe, expect, it } from 'vitest';
import { compare, EDITS0, noteFor, runPipeline, STAGES } from '../../src/nexus/substrate/pipe';
import { TEST_ASKS } from '../../src/nexus/ask/test-asks';
import { READING } from '../../src/nexus/ask/conceive';

const ASK = 'a wall bracket that holds a 17 kg camera 400 mm out from the wall';

describe('the pipeline, run stage by stage', () => {
  it('runs an ask through every stage: read, conditions, grow, make, check, scale', () => {
    const r = runPipeline(ASK, { ...EDITS0, physics: false });
    expect(r.stages.map((s) => s.id)).toEqual(STAGES.map((s) => s.id));
    expect(r.stages.find((s) => s.id === 'read')!.ok).toBe(true);
    expect(r.stages.find((s) => s.id === 'conditions')!.lines.join(' ')).toMatch(/400 mm out from what holds it/);
    // the growth is watched round by round, and what was grown is said
    const grow = r.stages.find((s) => s.id === 'grow')!;
    expect(grow.line).toMatch(/^a frame of 3 struts/); expect(grow.lines.some((l) => /round \d+: \d+ struts/.test(l))).toBe(true);
    expect(r.checks).toBeGreaterThan(0); expect(r.verdict).toMatch(/HOLDS|FAILS/);
    expect(r.stages.find((s) => s.id === 'check')!.lines.every((l) => /^[✓✗] /.test(l))).toBe(true);
  }, 120000);
  it('an edit changes what it makes: of steel only, the frame is steel; with the conditions reading off, it says so; and the switch is put back', () => {
    const steel = runPipeline(ASK, { ...EDITS0, matter: 'steel', physics: false });
    expect(steel.stages.find((s) => s.id === 'grow')!.line).toMatch(/Structural steel/);
    const off = runPipeline('a clamp-on arm for a 32 mm post that holds a 2 kg lamp 300 mm out', { ...EDITS0, grow: false, physics: false });
    expect(off.stages.find((s) => s.id === 'conditions')!.line).toMatch(/off \(your edit\)/);
    expect(READING.conditions).toBe(true);
  }, 120000);
  it('two runs of an ask compared: fewer failed is better, more is worse, a different ask is not compared', () => {
    const r = runPipeline(ASK, { ...EDITS0, physics: false });
    expect(compare(r, { ...r, failed: r.failed + 1 }).is).toBe('worse');
    expect(compare({ ...r, failed: r.failed + 2 }, r)).toEqual({ is: 'better', why: '2 fewer checks fail' });
    expect(compare(r, { ...r, kg: (r.kg ?? 1) * 0.5 }).is).toBe('better');
    expect(compare(r, { ...r, ask: 'another' }).is).toBe('same');
  }, 120000);
  it('a note on a stage carries the stage, the ask, the edits and what the run found, and asks that it be kept only if more hold', () => {
    const r = runPipeline(ASK, { ...EDITS0, physics: false });
    const n = noteFor(r, 'grow', 'try fewer joints');
    expect(n).toMatch(/^Pipeline note on the Grow stage: try fewer joints/);
    expect(n).toMatch(/The ask: "a wall bracket/); expect(n).toMatch(/seed 101, matter any, grow from conditions on, physics off/);
    expect(n).toMatch(/keep it only if more of them hold/);
  }, 120000);
  it('the testers\' asks are kept with what each last made', () => {
    expect(TEST_ASKS.length).toBe(20);
    for (const t of TEST_ASKS) { expect(t.ask.length).toBeGreaterThan(40); expect(t.by).toMatch(/^an? /); expect(t.last).toMatch(/^(holds|nothing made|\d+ failed: )/); }
  });
});
