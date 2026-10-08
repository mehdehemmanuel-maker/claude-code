// What is said, read into one directive: any make word builds (generate, spawn, summon, create, give me, I want…), any
// remove word takes away (remove it, delete that, get rid of the chair, undo, clear everything), people and fights are
// their own, and what is none of these (a question, "make it bigger", "show the flaws") passes on as it was said. And
// Claude's answer is checked before it is acted on.

import { describe, expect, it } from 'vitest';
import { checkDirective, directivePrompt, readPlain } from '../../src/nexus/directive';

const act = (t: string) => readPlain(t).directive;

describe('a directive read here, by rule', () => {
  it('reads every way of asking for a thing as making it', () => {
    for (const t of ['generate a car', 'spawn a dog', 'summon a sword', 'create a guitar', 'give me a chair', 'I want a drone', 'can you make a table', 'please build me a house', 'Nexus, generate a bike', 'show me a kettle', 'put a box here', 'a lamp']) {
      const d = act(t); expect(d.act, t).toBe('make');
    }
    expect(act('generate a car')).toMatchObject({ act: 'make', what: 'car', n: 1 });
    expect(act('make 3 chairs')).toMatchObject({ act: 'make', what: 'chairs', n: 3 }); expect(act('build a chair instead please')).toMatchObject({ act: 'make', what: 'chair' });
    expect(act('build a cart that carries 150 kg at 8 km/h')).toMatchObject({ act: 'make', what: 'cart that carries 150 kg at 8 km/h' });
  });
  it('reads every way of taking a thing away', () => {
    for (const t of ['remove it', 'delete it', 'get rid of it', 'undo', 'throw it away', 'despawn that', 'take it away']) expect(act(t), t).toMatchObject({ act: 'remove', what: 'last' });
    expect(act('remove the chair')).toMatchObject({ act: 'remove', what: 'chair' }); expect(act('make a box for a man').act).toBe('make');
    for (const t of ['clear everything', 'delete all', 'remove it all']) expect(act(t), t).toMatchObject({ act: 'remove', what: 'all' });
  });
  it('reads people and fights as their own', () => {
    expect(act('spawn an MMA fighter')).toMatchObject({ act: 'person', who: 'fighter', n: 1 });
    expect(act('generate 5 random people')).toMatchObject({ act: 'person', who: 'person', n: 5 });
    expect(act('make a woman')).toMatchObject({ act: 'person', who: 'woman', sex: 'XX' });
    expect(act('spawn a female fighter')).toMatchObject({ act: 'person', who: 'fighter', sex: 'XX' });
    expect(act('fight')).toMatchObject({ act: 'fight' });
  });
  it('passes on what is not a directive, as it was said', () => {
    for (const t of ['make it bigger', 'build it step by step', 'show me the flaws', 'show the pipeline', 'why is this 9 mm?', 'close the 3d view', 'what can a mouse do', 'hello']) expect(act(t).act, t).toBe('pass');
  });
});

describe('a directive read by Claude', () => {
  it('asks Claude for one directive, with what is in the room and what it asked before', () => {
    const q = directivePrompt('generate a car', { made: ['chair'], people: [], pending: { directive: { act: 'make', what: 'car', n: 1, words: 'make a car' }, questions: ['How fast?'], answers: [] } });
    expect(q).toMatch(/"make"/); expect(q).toMatch(/chair/); expect(q).toMatch(/How fast\?/); expect(q).toMatch(/generate a car/);
  });
  it('acts only on an answer it can check', () => {
    expect(checkDirective({ directive: { act: 'make', what: 'a red car for two', n: 2 }, questions: [] }, 'x')).toMatchObject({ directive: { act: 'make', what: 'a red car for two', n: 2 }, questions: [], by: 'claude' });
    expect(checkDirective({ directive: { act: 'person', who: 'fighter', n: 99 }, questions: ['Which weight class?'] }, 'x')).toMatchObject({ directive: { act: 'person', who: 'fighter', n: 12 }, questions: ['Which weight class?'] });
    expect(checkDirective({ directive: { act: 'remove' } }, 'x')).toMatchObject({ directive: { act: 'remove', what: 'last' } });
    for (const bad of [null, 'make a car', { directive: { act: 'fly' } }, { directive: { act: 'make', what: '' } }]) expect(checkDirective(bad, 'x')).toBeNull();
  });
});
