// Pipelines you run (src/nexus/flows.ts): a board of steps, run in its own order. A check lets on only what its
// condition holds for; a repeat goes back along its loop until its condition holds; a step that fails stops the flow;
// a trigger starts it on its event. The world here counts what it is asked to do, and its numbers change as it acts,
// so a loop that converges does so on what the actions did.

import { describe, expect, it } from 'vitest';
import { evaluate, starts, triggerOf } from '../../src/nexus/flows';
import { Workshop } from '../../src/nexus/generate';

/** A room whose flaws go down by one each time it is built again, and whose AI says what it was asked. */

describe('triggers', () => {
  it('reads what starts it from its words', () => {
    expect(triggerOf('when I press run')).toEqual({ kind: 'run' });
    expect(triggerOf('when a build finishes')).toEqual({ kind: 'built' });
    expect(triggerOf('when a flaw is found')).toEqual({ kind: 'flaw' });
    expect(triggerOf('when a note is added')).toEqual({ kind: 'note' });
    expect(triggerOf('every 10 minutes')).toEqual({ kind: 'tick', every: 10 });
    expect(triggerOf('every 2 hours')).toEqual({ kind: 'tick', every: 120 });
    expect(triggerOf('when I say make it lighter')).toEqual({ kind: 'said', phrase: 'make it lighter' });
    expect(triggerOf('banana')).toBeNull();
  });
  it('starts on its own event: a phrase heard inside what is said, a timer when its minutes come round', () => {
    expect(starts({ kind: 'trigger', what: 'when I say go' }, { kind: 'said', text: 'ok go now' })).toBe(true);
    expect(starts({ kind: 'trigger', what: 'when I say go' }, { kind: 'built' })).toBe(false);
    expect(starts({ kind: 'trigger', what: 'every 10 minutes' }, { kind: 'tick', minutes: 20 })).toBe(true);
    expect(starts({ kind: 'trigger', what: 'every 10 minutes' }, { kind: 'tick', minutes: 15 })).toBe(false);
  });
});

describe('conditions', () => {
  const f = { flaws: 2, gaps: 0, parts: 120, mass: 80.4, rounds: 3, failures: 0, notes: 1 };
  it('reads numbers as they are said', () => {
    expect(evaluate('flaws = 0', f, '')).toMatchObject({ ok: false });
    expect(evaluate('flaws > 0', f, '')).toMatchObject({ ok: true });
    expect(evaluate('no flaws', f, '')).toMatchObject({ ok: false });
    expect(evaluate('no gaps', f, '')).toMatchObject({ ok: true });
    expect(evaluate('mass under 100', f, '')).toMatchObject({ ok: true });
    expect(evaluate('parts at most 100', f, '')).toMatchObject({ ok: false });
    expect(evaluate('until flaws = 0, at most 3 times', { ...f, flaws: 0 }, '')).toMatchObject({ ok: true });
    expect(evaluate('flaws > 0 and mass under 100', f, '')).toMatchObject({ ok: true });
    expect(evaluate('output contains frame', f, 'the frame bends')).toMatchObject({ ok: true });
  });
  });



describe('pipelines that make, offline', () => {
  const bearing = { name: 'front bearing 6204 (20×47×14 mm)', at: [0, 0.3, 0] as [number, number, number], w: 0.047, h: 0.047, d: 0.014, mass: 0.11, r: 0.0235, bore: 0.02, axis: 'z' as const };
        it('a check reads expressions with units, and what is made', () => {
    const w = new Workshop({ parts: () => [bearing] }); w.run('set load = 200 N'); w.run('place plate named cap on bearing');
    expect(evaluate('cap.mass under 50 g', w.facts(), '', w.reader())).toMatchObject({ ok: true });
    expect(evaluate('load over 100 N and gap(cap, bearing) at most 1 mm', w.facts(), '', w.reader())).toMatchObject({ ok: true });
  });
    });

