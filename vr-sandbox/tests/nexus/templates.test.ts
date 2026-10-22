// EVERY TEMPLATE A PERSON CAN OPEN, RUN FOR REAL — the same proof `calltest.ts` gives every call in the catalogue,
// for the worked boards the page offers as the way in.
//
// Written because the first button on the page did not work. "Make a sphere (start here)" said `shape 1 sphere 60mm`,
// which is not a call: the Workshop answered *I cannot do "shape 1 sphere 60mm"*, the check after it was skipped,
// nothing was made and nothing was drawn in 3D. Ten more templates behind it refused at their first step for a
// different reason — they were written for the forge room's hands and offered on the page, where there is no room.
// Nothing caught either, because a template was data nobody ran, and a step's words are only wrong when they run.
//
// So: every template says which hands it needs (`Template.needs`), and this holds that honest in both directions.
// A template that says it needs nothing must RUN HERE, end to end, with nothing refused. One that says it needs the
// room must really have a step these hands cannot take — the mark cannot be used to excuse a plain bug.

import { describe, expect, it } from 'vitest';
import { TEMPLATES, boardOfTemplate, runFlow, stepOf, triggerOf, type FlowApi } from '../../src/nexus/substrate/flows';
import { engineHands, handsTake, traced } from '../../src/nexus/view/flow2d';
import { nodesOf } from '../../src/nexus/substrate/boards';

/** What the page's own hands can run: the room's templates, and the ones that ask a model, are not run here. */
const HERE = TEMPLATES.filter((t) => (t.needs ?? 'nothing') === 'nothing' && !t.steps.some((s) => s.step?.kind === 'ai'));
const ROOM = TEMPLATES.filter((t) => t.needs === 'the room');

const runIt = async (t: typeof TEMPLATES[number]) => {
  const b = boardOfTemplate(t);
  const start = nodesOf(b).find((n) => stepOf(b, n.id)?.kind === 'trigger')?.id ?? nodesOf(b)[0]!.id;
  const hands = engineHands();
  const r = await runFlow(b, start, hands, 'the template test');
  return { r, hands };
};

describe('every template the page offers', () => {
  it('every trigger reads as one', () => {
    const bad = TEMPLATES.flatMap((t) => t.steps.filter((s) => s.step?.kind === 'trigger' && !triggerOf(s.step.what))
      .map((s) => `${t.id} / ${s.label}: "${s.step!.what}"`));
    expect(bad).toEqual([]);
  });

  it('every action of a template that needs nothing is words these hands can take', () => {
    const cannot = TEMPLATES.filter((t) => (t.needs ?? 'nothing') === 'nothing')
      .flatMap((t) => t.steps.filter((s) => s.step?.kind === 'action' && !handsTake(s.step.what))
        .map((s) => `${t.id} / ${s.label}: "${s.step!.what}"`));
    expect(cannot).toEqual([]);
  });

  // THE WHOLE RUN, not the steps one at a time: the order the links give it, each step's output fed to the next.
  it.each(HERE.map((t) => [t.id, t] as const))('%s runs end to end with nothing refused', async (_id, t) => {
    const { r } = await runIt(t);
    expect(r.steps.filter((x) => x.status === 'failed').map((x) => `${x.label}: ${x.output}`)).toEqual([]);
    expect(r.steps.filter((x) => x.status === 'skipped').map((x) => `${x.label}: ${x.output}`)).toEqual([]);
    expect(r.steps.length).toBeGreaterThanOrEqual(t.steps.length - 1);
  });

  it('the first board on the page makes something the 3D view can draw', async () => {
    expect(TEMPLATES[0]!.id).toBe('a-sphere');
    const { hands } = await runIt(TEMPLATES[0]!);
    expect(hands.worked.shapes?.length ?? 0).toBeGreaterThan(0);
    expect(hands.facts().shapes).toBeGreaterThan(0);
  });

  it("a template marked 'the room' really has a step these hands cannot take", () => {
    const wrongly = ROOM.filter((t) => t.steps.every((s) => s.step?.kind !== 'action' || handsTake(s.step.what))).map((t) => t.id);
    expect(wrongly).toEqual([]);
  });

  // THE TRANSFER ITSELF. `needs: 'the room'` says WHERE a board runs, not that it is withheld for good: the same
  // board, from the same store, is mounted in the forge on the room's own hands (view/forge-bar.ts), and `traced`
  // is what lets any hands carry the end-to-end picture the page's had. Proved here on a stand-in for the room
  // rather than on forge.ts, which is a whole 3D room and cannot be loaded in a test.
  it.each(ROOM.map((t) => [t.id, t] as const))('%s runs end to end on hands that have the room', async (_id, t) => {
    const asked: string[] = [];
    const room: FlowApi = {
      act: async (what) => { asked.push(what); return `the room did: ${what}`; },
      ai: async () => ({ text: 'pipeline new a test: when I press run -> say done', by: 'nexus' }),
      facts: () => ({ cell_busy: 0, pipeline_failed: 0, failures: 0, flaws: 0, parts: 2, rounds: 1, shapes: 1, made: 1 }),
    };
    const hands = traced(room);
    const b = boardOfTemplate(t);
    const start = nodesOf(b).find((n) => stepOf(b, n.id)?.kind === 'trigger')?.id ?? nodesOf(b)[0]!.id;
    const r = await runFlow(b, start, hands, 'the template test');
    expect(r.steps.filter((x) => x.status === 'failed').map((x) => `${x.label}: ${x.output}`)).toEqual([]);
    expect(asked.length).toBeGreaterThan(0);
    // and the picture travelled with them: the call, what came back, and any numbers a check read
    expect(hands.trace.some((x) => x.sort === 'call')).toBe(true);
    expect(hands.trace.some((x) => x.sort === 'math')).toBe(true);
  });

  it('says how many of each, so the page cannot quietly fill with boards that do not run', () => {
    expect(ROOM.length).toBe(9);
    expect(HERE.length).toBe(TEMPLATES.length - ROOM.length - TEMPLATES.filter((t) => (t.needs ?? 'nothing') === 'nothing' && t.steps.some((s) => s.step?.kind === 'ai')).length);
  });
});
