import { describe, expect, it } from 'vitest';
import { pickFrom, pickFromSaying, keepOnly, mindAt, reachable, type Ask } from '../../src/nexus/ask/mind';

const DOES = ['slide', 'turn', 'grip', 'deposit', 'cut', 'solder', 'see', 'think', 'hold'] as const;
const AT = { url: 'http://127.0.0.1:11434', model: 'test' };
/** A model that says whatever we tell it to, so the filter can be tested against one that misbehaves. A
 *  well-behaved model proves nothing: the guarantee is about what happens when it does not behave. */
const says = (s: string | null): Ask => async () => s;

describe('a local model is allowed to pickFrom, and nothing else', () => {
  it('reads where the model is from the environment, and null is the ordinary answer', () => {
    expect(mindAt({})).toBeNull();
    expect(mindAt({ NEXUS_MIND_URL: 'http://x:1', NEXUS_MIND_MODEL: 'm' })).toEqual({ url: 'http://x:1', model: 'm' });
    expect(mindAt({ NEXUS_MIND_URL: '127.0.0.1:11434/', NEXUS_MIND_MODEL: 'm' })!.url).toBe('http://127.0.0.1:11434');
    expect(mindAt({ NEXUS_MIND_URL: 'http://x:1' })).toBeNull();        // half-configured is not configured
  });

  // THE GUARANTEE. Whatever comes back, only members of the closed list come out — from the filter, not from the
  // model's good behaviour, so it holds for a 1.5B as well as a 70B.
  it('keeps ONLY what is in the closed list, however the model answers', () => {
    expect(keepOnly('{"pick":["cut","grip"]}', DOES)).toEqual(['grip', 'cut']);
    expect(keepOnly('["cut"]', DOES)).toEqual(['cut']);
    expect(keepOnly('the sentence asks it to cut and to grip', DOES)).toEqual(['grip', 'cut']);   // a sentence, not JSON
    expect(keepOnly('{"answer":{"verbs":["cut"]},"why":"because"}', DOES)).toEqual(['cut']);      // nested
  });

  it('drops a word the model invented, which is the whole point', () => {
    expect(keepOnly('{"pick":["weld","sinter","cut"]}', DOES)).toEqual(['cut']);
    expect(keepOnly('{"pick":["weld","sinter"]}', DOES)).toEqual([]);
    expect(keepOnly('it should probably use a laser', DOES)).toEqual([]);
  });

  // A KNOWN COST OF THE PROSE FALLBACK, asserted so it is visible rather than discovered later. Scanning a
  // sentence for vocabulary words cannot tell an ANSWER from an incidental use: "I think it should use a laser"
  // yields `think`, because `think` is a verb a machine can do. It is the price of accepting the answers small
  // models give in prose instead of refusing them on formatting, and it is bounded — the worst case is a word
  // from the closed list that the sentence did not mean, never a word that is not in the list and never a value.
  // JSON, which is what the prompt asks for and what `format: json` makes likely, does not have this problem.
  it('the prose fallback can be fooled by an incidental word, and that is the cost of having one', () => {
    expect(keepOnly('I think it should probably use a laser', DOES)).toEqual(['think']);
    expect(keepOnly('{"pick":[]}', DOES)).toEqual([]);     // the same model answering in JSON says nothing, rightly
  });

  it('drops numbers: no sampled token becomes a value, ever', () => {
    // a model asked for verbs that answers with sizes gets nothing through, because no number is in the list
    expect(keepOnly('{"pick":[400,300,80]}', DOES)).toEqual([]);
    expect(keepOnly('{"bore":"12.7mm","mass":"0.42kg"}', DOES)).toEqual([]);
    expect(keepOnly('{"pick":["cut"],"width_mm":400}', DOES)).toEqual(['cut']);   // the verb lands, the 400 does not
  });

  it('matches whole words only, so a longer word is not read as a shorter one', () => {
    expect(keepOnly('{"pick":["cutter"]}', DOES)).toEqual([]);
    expect(keepOnly('{"pick":["holder","slider"]}', DOES)).toEqual([]);
    expect(keepOnly('it will cut-to-length', DOES)).toEqual(['cut']);             // a hyphen is still a boundary
  });

  it('survives junk, empty and nothing at all without throwing', () => {
    for (const junk of ['', '{', 'null', '[]', '{"pick":null}', '<<<>>>']) expect(keepOnly(junk, DOES)).toEqual([]);
    expect(keepOnly(null, DOES)).toEqual([]);
  });
});

describe('no model is an ordinary state, not an error', () => {
  it('every verb answers empty when nothing is configured, and nothing throws', async () => {
    expect(await pickFrom({ from: DOES, text: 'a machine that cuts', about: 'verbs' }, null)).toEqual([]);
    expect(await reachable(null)).toBe(false);
  });

  it('a model that is configured but does not answer is the same as none', async () => {
    expect(await pickFrom({ from: DOES, text: 'a machine that cuts', about: 'verbs' }, AT, says(null))).toEqual([]);
    expect(await reachable(AT, says(null))).toBe(false);
    expect(await reachable(AT, says('{"ok":false}'))).toBe(false);
    expect(await reachable(AT, says('{"ok":true}'))).toBe(true);
  });

  it('one pick where one was asked for, many where many were', async () => {
    const ask = says('{"pick":["cut","grip","turn"]}');
    expect(await pickFrom({ from: DOES, text: 'x', about: 'v', many: true }, AT, ask)).toHaveLength(3);
    expect(await pickFrom({ from: DOES, text: 'x', about: 'v' }, AT, ask)).toHaveLength(1);
  });

  it('says who answered, so a round can report honestly which it was', async () => {
    const got = await pickFromSaying({ from: DOES, text: 'x', about: 'v', many: true }, AT, says('{"pick":["cut"]}'));
    expect(got.by).toBe('model'); expect(got.pick).toEqual(['cut']);
    const none = await pickFromSaying({ from: DOES, text: 'x', about: 'v', many: true }, null, says('{"pick":["cut"]}'));
    expect(none.by).toBe('nothing'); expect(none.pick).toEqual([]);
  });
});
