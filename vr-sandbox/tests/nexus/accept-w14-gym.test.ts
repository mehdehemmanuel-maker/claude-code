// Wave 14, the gym (decision 0029): random requests that are the same for the same seed and never the user's twenty; the
// inspector's reply read strictly (a scripted Ask stands in for the model: no model calls, no browser); the recurring
// faults of many runs grouped by stage and by root.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Ask } from '../../src/nexus/agent';
import { historyLine, inspect, inspectionOf, lessonsMarkdown, lessonsOf, randomRequest, unread, type GymRun, type Inspection } from '../../src/nexus/gym';

const FEATURES = [{ name: 'boom', is: 'a long lattice boom, twice the body', where: 'on top, raised' }, { name: 'tracks', is: 'two crawler tracks as long as the body', where: 'low, each side' }];
const good = { stranger: 'a crane on tracks', named: true, features: [{ name: 'boom', seen: 'seen', note: 'a long arm up' }, { name: 'Tracks', seen: 'wrong', note: 'two thin bars' }], scores: { silhouette: 6, proportion: 5, mechanism: 3, surface: 2 }, confidence: 0.6,
  upgrades: [{ stage: 'mechanism', what: 'a cylinder under the boom', root: 'no visible actuators' }, { stage: 'surface', what: 'paint the body yellow', root: 'everything one grey material' }, { stage: 'shape', what: 'widen the tracks', root: 'feature far too small' }, { stage: 'detail', what: 'a fourth, dropped', root: 'no cab' }] };
const png = new Uint8Array([137, 80, 78, 71]), views = ['three-quarter', 'side', 'top', 'rear'].map((name) => ({ name, png }));

describe('wave 14, the gym', () => {
  it('a random request: the same for the same seed, varied, never one of the user\'s twenty', () => {
    const user20 = [.../export const USER20 = \[([^\]]+)\]/.exec(readFileSync(join(__dirname, '../evals/user20.eval.ts'), 'utf8'))![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!.toLowerCase());
    expect(user20.length).toBe(20);
    const all = Array.from({ length: 200 }, (_, k) => randomRequest(k + 1));
    expect(Array.from({ length: 200 }, (_, k) => randomRequest(k + 1))).toEqual(all);
    expect(new Set(all).size).toBeGreaterThanOrEqual(150);
    expect(new Set(Array.from({ length: 2000 }, (_, k) => randomRequest(k))).size).toBeGreaterThan(1500);
    const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (const r of all) { expect(r).toMatch(/^an? \S+ \S+/); for (const u of user20) expect(flat(r).includes(flat(u)), `${r} repeats ${u}`).toBe(false); }
    // (varied in form too: some with no twist, some with no power source, and many kinds)
    expect(new Set(all.map((r) => r.split(' ').length)).size).toBeGreaterThan(4);
    expect(randomRequest(1)).not.toBe(randomRequest(2));
  });

  it('the inspector: a reply in its form is read; a malformed one is asked for once more, then scored 0 with why', async () => {
    const x = inspectionOf(`Here it is:\n${JSON.stringify(good)}`, FEATURES);
    expect(x.scores).toEqual({ silhouette: 6, proportion: 5, mechanism: 3, surface: 2 }); expect(x.confidence).toBe(0.6); expect(x.named).toBe(true);
    expect(x.features).toEqual([{ name: 'boom', seen: 'seen', note: 'a long arm up' }, { name: 'tracks', seen: 'wrong', note: 'two thin bars' }]);
    expect(x.upgrades.map((u) => u.stage)).toEqual(['mechanism', 'surface', 'shape']);
    // (a stranger who did not name it: the confidence held to 0.3, the rule's own bound)
    expect(inspectionOf(JSON.stringify({ ...good, named: false, confidence: 0.8 }), FEATURES).confidence).toBe(0.3);
    // (refused, each with its reason)
    const bad: [Record<string, unknown>, RegExp][] = [[{ ...good, scores: { ...good.scores, surface: 12 } }, /scores\.surface/], [{ ...good, scores: { silhouette: 5 } }, /scores\.proportion/], [{ ...good, confidence: '0.5' }, /confidence/], [{ ...good, confidence: 1.4 }, /confidence/],
      [{ ...good, features: [good.features[0]] }, /"tracks" is said 0 times/], [{ ...good, features: [good.features[0], { name: 'tracks', seen: 'maybe' }] }, /seen/], [{ ...good, upgrades: [{ stage: 'paint', what: 'x', root: 'y' }] }, /stage/], [{ ...good, upgrades: [] }, /upgrades/],
      [{ ...good, stranger: '' }, /stranger/], [{ ...good, named: 'yes' }, /named/], [{ ...good, upgrades: [{ stage: 'shape', what: 'x' }] }, /no root/]];
    for (const [o, why] of bad) expect(() => inspectionOf(JSON.stringify(o), FEATURES)).toThrow(why);
    expect(() => inspectionOf('It looks like a fine crane to me.', FEATURES)).toThrow(/no JSON object/); expect(() => inspectionOf('{"scores": {', FEATURES)).toThrow();
    // (asked with the four pictures; a first reply that cannot be read asked for again with the reason; then read)
    const seen: { prompt: string; images: number }[] = [], replies = ['a fine crane, 8 of 10', JSON.stringify(good)];
    const ask: Ask = async (prompt, _t, images) => { seen.push({ prompt, images: images?.length ?? 0 }); return replies.shift() ?? 'nothing'; };
    const r = await inspect('a crane on tracks', FEATURES, views, ask);
    expect(r.failed).toBeUndefined(); expect(r.confidence).toBe(0.6); expect(seen.map((s) => s.images)).toEqual([4, 4]);
    expect(seen[0]!.prompt).toContain('The request: a crane on tracks'); expect(seen[0]!.prompt).toContain('- boom: a long lattice boom'); expect(seen[1]!.prompt).toContain('could not be read: no JSON object');
    // (twice unreadable: scored 0, with why, and no third call)
    let calls = 0; const z = await inspect('a crane', FEATURES, views, async () => { calls++; return '{"scores": 7}'; });
    expect(calls).toBe(2); expect(z.failed).toMatch(/twice.*scores/); expect(z.confidence).toBe(0); expect(Object.values(z.scores)).toEqual([0, 0, 0, 0]); expect(z.upgrades).toEqual([]);
    // (no pictures: nothing to look at, no call)
    calls = 0; expect((await inspect('a crane', FEATURES, [], async () => { calls++; return ''; })).failed).toMatch(/no pictures/); expect(calls).toBe(0);
  });

  it('the lessons: recurring faults grouped by stage and by root, counted, most frequent first', () => {
    const ins = (upgrades: [string, string][], features: Inspection['features'] = [], c = 0.2): Inspection => ({ features, stranger: 'blocks', named: false, scores: { silhouette: 2, proportion: 4, mechanism: 2, surface: 2 }, confidence: c,
      upgrades: upgrades.map(([stage, root]) => ({ stage: stage as 'shape', root, what: `do: ${root}` })) });
    const runs: GymRun[] = [
      { request: 'a crane', inspection: ins([['mechanism', 'no visible actuators'], ['surface', 'everything one grey material'], ['engineering', 'parts floating, not joined']], [{ name: 'hook', seen: 'not seen', note: 'no hook' }]) },
      { request: 'a loom', inspection: ins([['mechanism', 'joints with no actuators'], ['surface', 'all one grey material'], ['shape', 'a named feature missing']], [{ name: 'beam', seen: 'wrong', note: 'a speck' }, { name: 'frame', seen: 'seen', note: '' }]) },
      { request: 'a boat', inspection: ins([['mechanism', 'no actuator on the moving joint'], ['surface', 'grey material throughout'], ['engineering', 'floating parts not joined to the frame']], [{ name: 'hull', seen: 'not seen', note: 'a plate' }]) },
      { request: 'a kiln', inspection: unread('the build failed: no plan') }];
    const ls = lessonsOf(runs);
    expect(ls.map((l) => `${l.stage}/${l.count}`)).toEqual(['mechanism/3', 'surface/3', 'shape/2', 'engineering/2', 'shape/1', 'shape/1', 'engineering/1']);
    expect(ls[0]!.root).toMatch(/actuator/); expect(ls[0]!.requests).toEqual(['a crane', 'a loom', 'a boat']); expect(ls[0]!.words[0]).toBe('no visible actuators: do: no visible actuators');
    expect(ls[1]!.root).toMatch(/grey material|material grey/);
    expect(ls[2]).toMatchObject({ root: 'a named feature not seen', stage: 'shape', count: 2, requests: ['a crane', 'a boat'] });
    expect(ls[3]!.root).toMatch(/float/); expect(ls.find((l) => l.root === 'a named feature wrong')!.words).toEqual(['beam: a speck']);
    expect(ls.at(-1)).toMatchObject({ root: 'no reading of the build', stage: 'engineering', count: 1, requests: ['a kiln'] });
    // (the same fault in another stage is another root; the history line: the means, an unread run counted as 0)
    expect(lessonsOf([{ request: 'x', inspection: ins([['shape', 'no visible actuators'], ['mechanism', 'no visible actuators']]) }]).length).toBe(2);
    const line = historyLine(runs, '2026-11-10', 'random seed 1');
    expect(line).toEqual({ date: '2026-11-10', set: 'random seed 1', n: 4, confidence: 0.15, silhouette: 1.5, proportion: 3, mechanism: 1.5, surface: 1.5, unread: 1 });
    const md = lessonsMarkdown(ls, line); expect(md).toContain('| Root | Stage | Count |'); expect(md.split('\n').filter((l) => /^\| .* \| (shape|mechanism|engineering|detail|surface) \| \d+ \|/.test(l)).length).toBe(ls.length); expect(md).toContain('mean confidence 0.15');
  });
});
