// Pipelines you run (src/nexus/substrate/flows.ts): a board of steps, run in its own order. A check lets on only what its
// condition holds for; a repeat goes back along its loop until its condition holds; a step that fails stops the flow;
// a trigger starts it on its event. The world here counts what it is asked to do, and its numbers change as it acts,
// so a loop that converges does so on what the actions did.

import { describe, expect, it } from 'vitest';
import { ACTIONS, SUGGEST, TEMPLATES, boardOfClip, boardOfTemplate, clipOf, evaluate, graphOf, guessStep, keptRun, maxRounds, orderFrom, pasteOf, runFlow, starts, triggerOf, triggersOf, type FlowApi } from '../../src/nexus/substrate/flows';
import { addNode, deepMerge, link, nodesOf, type Board } from '../../src/nexus/substrate/boards';
import { Workshop } from '../../src/nexus/ask/generate';
import { ALL_CALLS, CALLS } from '../../src/nexus/substrate/calls';

/** A room whose flaws go down by one each time it is built again, and whose AI says what it was asked. */
function room(flaws = 2): FlowApi & { done: string[] } {
  const done: string[] = [], facts = { flaws, gaps: 0, parts: 120, mass: 80, rounds: 3, failures: 0, notes: 0 };
  return {
    done,
    async act(what) {
      done.push(what);
      if (/^flaws\b/.test(what)) return facts.flaws ? `${facts.flaws} flaws: the frame bends; the motor overheats` : 'No flaws.';
      if (/^again\b/.test(what)) { facts.flaws = Math.max(0, facts.flaws - 1); return `Built again: ${facts.flaws} flaws left.`; }
      if (/^say\b/.test(what)) return what.slice(4);
      throw new Error(`I do not know how to "${what}"`);
    },
    async ai(prompt) { done.push(`ai: ${prompt}`); return { text: 'make the frame deeper', by: 'nexus' }; },
    facts: () => ({ ...facts }),
  };
}
const id = (b: Board, l: string) => nodesOf(b).find((n) => n.label === l)!.id;

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
  it('says what it cannot read, and which numbers it can', () => {
    expect(evaluate('happiness > 3', f, '')).toEqual({ error: expect.stringMatching(/I do not know the number "happiness": I read flaws, gaps/) });
    expect(evaluate('when the moon is blue', f, '')).toEqual({ error: expect.stringMatching(/cannot read the condition/) });
    expect(maxRounds('until flaws = 0, at most 5 times')).toBe(5); expect(maxRounds('until flaws = 0')).toBe(3);
  });
});

describe('running a flow', () => {
  it("Nexus's own loop runs until the build is clean: flaws, ask, build again, round and round", async () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), w = room(2), seen: number[] = [];
    const r = await runFlow(b, id(b, 'Run'), w, 'pressed', (x) => seen.push(x.steps.length));
    // two flaws, one fixed a round: clean after two rounds, and the repeat says so
    expect(r.status).toBe('done'); expect(r.rounds).toBe(2);
    expect(w.done.filter((d) => d.startsWith('again'))).toEqual(['again make the frame deeper', 'again make the frame deeper']);
    // the AI was asked with the flaws the action listed, not with its own words
    expect(w.done.find((d) => d.startsWith('ai:'))).toMatch(/2 flaws: the frame bends/);
    expect(r.steps.at(-1)).toMatchObject({ label: 'Until clean', status: 'ok', output: 'Done: flaws is 0' });
    expect(seen.length).toBeGreaterThan(5);
  });
  it('a check that does not hold lets nothing after it on', async () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), w = room(0);
    const r = await runFlow(b, id(b, 'Run'), w, 'pressed');
    expect(r.status).toBe('done'); expect(r.rounds).toBe(1);
    expect(r.steps.map((s) => `${s.label}:${s.status}`)).toEqual(['Run:ok', 'List the flaws:ok', 'Any flaws?:no', 'Ask how to fix:skipped', 'Build again with it:skipped', 'Until clean:skipped']);
    expect(w.done).toEqual(['flaws']);
  });
  it('a repeat stops at its most rounds, and says it stopped', async () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), w = room(10);
    const r = await runFlow(b, id(b, 'Run'), w, 'pressed');
    expect(r.status).toBe('stopped'); expect(r.rounds).toBe(3);
    expect(r.steps.at(-1)!.output).toMatch(/Stopped after 3 rounds: flaws is 7/);
  });
  it('a step that fails stops the flow, with why', async () => {
    let b: Board = { title: 'f', kind: 'flow', nodes: {}, edges: {} };
    const t = addNode('Go'), a = addNode('Do a backflip');
    b = deepMerge(deepMerge(b, t.patch), a.patch);
    b.nodes[t.id]!.step = { kind: 'trigger', what: 'when I press run' }; b.nodes[a.id]!.step = { kind: 'action', what: 'backflip' };
    b = deepMerge(b, link(b, t.id, a.id, 'flows to')!);
    const r = await runFlow(b, t.id, room(), 'pressed');
    expect(r.status).toBe('failed'); expect(r.steps.at(-1)).toMatchObject({ label: 'Do a backflip', status: 'failed', output: 'I do not know how to "backflip"' });
  });
  it('runs in the order its links say, a node after everything that leads to it', () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), g = graphOf(b);
    expect(orderFrom(b, g, id(b, 'Run')).map((x) => b.nodes[x]!.label)).toEqual(['Run', 'List the flaws', 'Any flaws?', 'Ask how to fix', 'Build again with it', 'Until clean']);
    expect(g.back.get(id(b, 'Until clean'))).toBe(id(b, 'List the flaws'));
  });
  it('can be stopped from outside', async () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), ac = new AbortController(); ac.abort();
    expect((await runFlow(b, id(b, 'Run'), room(), 'pressed', undefined, ac.signal)).status).toBe('stopped');
  });
  it('Stop cuts a step short: the run is stopped, not failed, and nothing after it runs', async () => {
    let b: Board = { title: 'f', kind: 'flow', nodes: {}, edges: {} };
    const t = addNode('Go'), w = addNode('Wait'), s = addNode('Say');
    b = deepMerge(deepMerge(deepMerge(b, t.patch), w.patch), s.patch);
    b.nodes[t.id]!.step = { kind: 'trigger', what: 'when I press run' }; b.nodes[w.id]!.step = { kind: 'action', what: 'wait' }; b.nodes[s.id]!.step = { kind: 'action', what: 'say done' };
    b = deepMerge(deepMerge(b, link(b, t.id, w.id, 'flows to')!), link(b, w.id, s.id, 'flows to')!);
    const ac = new AbortController(), said: string[] = [];
    const api: FlowApi = { act: (what, _i, signal) => (what === 'wait' ? new Promise((_, no) => signal!.addEventListener('abort', () => no(new Error('stopped')))) : (said.push(what), Promise.resolve(what))), ai: async () => ({ text: '', by: 'nexus' }), facts: () => ({}) };
    const p = runFlow(b, t.id, api, 'pressed', undefined, ac.signal); setTimeout(() => ac.abort(), 20);
    const r = await p;
    expect(r.status).toBe('stopped'); expect(r.steps.map((x) => `${x.label}:${x.status}`)).toEqual(['Go:ok', 'Wait:skipped']); expect(said).toEqual([]);
  });
  it('every template is a flow with a trigger to start it', () => {
    for (const t of TEMPLATES) { const b = boardOfTemplate(t); expect(b.kind).toBe('flow'); expect(triggersOf(b)).toHaveLength(1); expect(triggerOf(triggersOf(b)[0]!.step.what)).not.toBeNull(); }
  });
});

describe('a step from one word', () => {
  it('reads what the word does, and leaves a word it cannot read as a plain step', () => {
    expect(guessStep('flaws')).toEqual({ kind: 'action', what: 'flaws' });
    expect(guessStep('List the flaws')).toEqual({ kind: 'action', what: 'flaws' });
    expect(guessStep('Operate')).toEqual({ kind: 'action', what: 'operate' });
    expect(guessStep('Any flaws?')).toEqual({ kind: 'check', what: 'any flaws' });
    expect(guessStep('until no flaws')).toEqual({ kind: 'repeat', what: 'until no flaws, at most 3 times' });
    expect(guessStep('when a build finishes')).toEqual({ kind: 'trigger', what: 'when a build finishes' });
    expect(guessStep('Ask how to fix it')).toEqual({ kind: 'ai', what: 'how to fix it: {input}' });
    expect(guessStep('banana')).toBeNull();
  });
  it('every suggestion reads as what it is', () => {
    for (const [, t] of SUGGEST.trigger) expect(triggerOf(t)).not.toBeNull();
    const f = { flaws: 1, gaps: 0, parts: 1, mass: 1, rounds: 1, failures: 0, notes: 0 };
    for (const [, c] of [...SUGGEST.check, ...SUGGEST.repeat]) expect(evaluate(c, f, 'a wheel')).not.toHaveProperty('error');
    for (const [, a] of SUGGEST.action) expect(ACTIONS).toContain(a.split(' ')[0]);
  });
  it('keeps a run short enough to store', () => {
    const r = { trigger: 't', why: 'x', started: 0, status: 'done' as const, rounds: 1, steps: Array.from({ length: 50 }, (_, i) => ({ node: `n${i}`, label: 'L', kind: 'action' as const, status: 'ok' as const, output: 'y'.repeat(500), ms: 1, round: 1 })) };
    const k = keptRun(r); expect(k.steps).toHaveLength(40); expect(k.steps[0]!.output).toHaveLength(240); expect(r.steps).toHaveLength(50);
  });
});

describe('pipelines that make, offline', () => {
  const bearing = { name: 'front bearing 6204 (20×47×14 mm)', at: [0, 0.3, 0] as [number, number, number], w: 0.047, h: 0.047, d: 0.014, mass: 0.11, r: 0.0235, bore: 0.02, axis: 'z' as const };
  it('every template that makes runs to its end with nothing but the workshop: an AI that is never reached', async () => {
    for (const id of ['cap', 'shaft', 'walls', 'random']) {
      const w = new Workshop({ parts: () => [bearing] }, 5), api: FlowApi = { act: async (x) => w.run(x), ai: async () => { throw new Error('no one is asked'); }, facts: () => w.facts(), reader: () => w.reader() };
      const b = boardOfTemplate(TEMPLATES.find((t) => t.id === id)!), r = await runFlow(b, triggersOf(b)[0]!.id, api, 'pressed');
      expect(r.status, `${id}: ${r.steps.map((s) => `${s.label}: ${s.output}`).join(' | ')}`).toBe('done');
      expect(r.steps.every((s) => s.status !== 'failed' && s.kind !== 'ai')).toBe(true);
    }
  });
  it('run again, it makes again, rather than failing on a name it made', async () => {
    const w = new Workshop({ parts: () => [bearing] }), api: FlowApi = { act: async (x) => w.run(x), ai: async () => ({ text: '', by: 'nexus' }), facts: () => w.facts(), reader: () => w.reader() };
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'cap')!);
    await runFlow(b, triggersOf(b)[0]!.id, api, 'pressed'); const r = await runFlow(b, triggersOf(b)[0]!.id, api, 'pressed');
    expect(r.status).toBe('done'); expect(w.facts().made).toBe(1);
  });
  it('reads the new triggers, and a condition that starts it the moment it holds', () => {
    expect(triggerOf('when a shape is made')).toEqual({ kind: 'made' }); expect(triggerOf('when the forge opens')).toEqual({ kind: 'start' });
    expect(triggerOf('every 30 seconds')).toEqual({ kind: 'tick', every: 0.5 }); expect(triggerOf('when load over 500 N')).toEqual({ kind: 'cond', cond: 'load over 500 N' });
    expect(triggerOf('when a flaw is found')).toEqual({ kind: 'flaw' });
    for (const g of CALLS.find((x) => x.id === 'start')!.calls) expect(triggerOf(g.text), g.text).not.toBeNull();
  });
  it('a check reads expressions with units, and what is made', () => {
    const w = new Workshop({ parts: () => [bearing] }); w.run('set load = 200 N'); w.run('place plate named cap on bearing');
    expect(evaluate('cap.mass under 50 g', w.facts(), '', w.reader())).toMatchObject({ ok: true });
    expect(evaluate('load over 100 N and gap(cap, bearing) at most 1 mm', w.facts(), '', w.reader())).toMatchObject({ ok: true });
  });
  it('a step said in generation\'s words is an action, as it was said', () => {
    expect(guessStep('place plate named cap on bearing')).toEqual({ kind: 'action', what: 'place plate named cap on bearing' });
    expect(guessStep('if load > 500 N then material steel')).toEqual({ kind: 'action', what: 'if load > 500 N then material steel' });
    expect(guessStep('B x D =')).toEqual({ kind: 'action', what: 'B x D =' });
  });
  it('every call in the catalogue is one a step can do', () => {
    for (const g of CALLS) for (const x of g.calls) {
      if (g.kind === 'action') expect(Workshop.handles(x.text) || (ACTIONS as readonly string[]).includes(x.text.split(' ')[0]!), `${g.id}: ${x.text}`).toBe(true);
    }
    const names = ALL_CALLS.map((x) => `${x.group}/${x.label}`); expect(new Set(names).size).toBe(names.length);
    expect(CALLS.length).toBeGreaterThanOrEqual(14);
  });
});

describe('a pipeline carried from board to board', () => {
  it('copied from a step on, pasted after a step on another board, it runs there in its own order', async () => {
    const from = boardOfTemplate(TEMPLATES.find((t) => t.id === 'improve')!), c = clipOf(from, id(from, 'List the flaws'));
    expect(c.nodes.map((n) => n.label)).toEqual(['List the flaws', 'Any flaws?', 'Ask how to fix', 'Build again with it', 'Until clean']);
    expect(c.links.map(([, , r]) => r)).toContain('feeds back to');
    let to = boardOfTemplate(TEMPLATES.find((t) => t.id === 'blank')!);
    to = deepMerge(to, pasteOf(c, id(to, 'Run')).patch);
    const g = graphOf(to); expect(orderFrom(to, g, id(to, 'Run')).map((x) => to.nodes[x]!.label)).toEqual(['Run', 'List the flaws', 'Any flaws?', 'Ask how to fix', 'Build again with it', 'Until clean']);
    const r = await runFlow(to, id(to, 'Run'), room(2), 'pressed'); expect(r.status).toBe('done'); expect(r.rounds).toBe(2);
  });
  it('kept whole, a board is made from it again, every step as it was', () => {
    const b = boardOfTemplate(TEMPLATES.find((t) => t.id === 'cap')!), again = boardOfClip(clipOf(b));
    expect(nodesOf(again).map((n) => [n.label, again.nodes[n.id]!.step?.what]).sort()).toEqual(nodesOf(b).map((n) => [n.label, b.nodes[n.id]!.step?.what]).sort());
    expect(triggersOf(again)).toHaveLength(1);
  });
});
