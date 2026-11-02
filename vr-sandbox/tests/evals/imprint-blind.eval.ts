// The blind check of drag to imprint (spec 01, I16, step 14): the screenshots of tests/evals/imprint-drag.cjs, each alone,
// given to three readers told nothing (Gemini at temperature 1, through genai.see), with a prompt that never says bolt,
// screw, hole, cut, plate, preview or verdict, or what any colour means. A grader that sees only the readers' words and
// the facts hidden from them says, quoting the words, which facts each reader named and which of fault D16's faults. A shot
// passes when two of three readers name every fact; it fails when two or more name any D16 fault. Run apart from the gate
// (real tokens):  SHOTS=<the drag test's outDir> GEMINI_API_KEY=… npx vitest run --config vitest.eval.config.ts tests/evals/imprint-blind.eval.ts
// What it read and decided is written beside the shots (blind.json), word for word.
import { it } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { see as seeOnce } from '../../src/nexus/genai';

/** A call to the model, made again (up to three times, waiting longer each time) when the network drops it: a reset is not
 *  an answer. */
async function see(...a: Parameters<typeof seeOnce>): ReturnType<typeof seeOnce> {
  for (let k = 0; ; k++) { try { return await seeOnce(...a); } catch (e) { if (k >= 2 || !/fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(`${(e as Error).message} ${String((e as { cause?: unknown }).cause ?? '')}`)) throw e; await new Promise((r) => setTimeout(r, 4000 * (k + 1))); } }
}

const ASK = 'Here is a screenshot from a piece of software; you are told nothing else. Say in plain words: 1. what objects are shown and what each seems made of; 2. every coloured or see-through shape and what it seems to mean (read any legend); 3. what any text panel says, whether it reports something allowed or refused, and why; 4. what has just happened or is about to happen, and what the person can do next; 5. what is hard to read, too dark, floating, crossed by lines, faceted where it should be round, or looks wrong or fake. Where you cannot tell, say so. Answer as JSON {objects, overlays, text, happening, wrong}.';
const PAIR = 'Two screenshots of the same software, before and after: what changed? JSON {changed}';
/** What each shot shows, hidden from the readers. */
const FACTS: Record<string, string[]> = {
  'i16-0-before': ['a metal plate', 'a screw (or bolt) in a hole in it'],
  'i16-1-held': ['a screw (or bolt) about to go in, not yet placed', 'red as material to be removed or a hole to be cut', 'amber (yellow, orange) as room kept clear', 'green where the head seats or bears', 'a panel saying it fits, with distances'],
  'i16-2-pinned': ['a screw (or bolt) about to go in, not yet placed', 'red as material to be removed or a hole to be cut', 'amber (yellow, orange) as room kept clear', 'green where the head seats or bears', 'a panel saying it fits, with distances', 'that the next step is to confirm (cut it) or cancel'],
  'i16-3-cut': ['a second hole with its screw (or bolt)'],
  'i16-4-undone': ['a metal plate', 'a screw (or bolt) in a hole in it'],
  'i16-7-refused': ['refused because it is too close to the edge', 'with numbers (how far, how far is needed or how short)', 'that it cannot be confirmed (the cut button is disabled)'],
  'd16-paste': ['several metal parts (a plate, a round block, an angle)'],
  'd16-cover': ['a round plate or flange with bolts round a circle'],
};
const PAIRS: [string, string, string][] = [['i16-0-before', 'i16-3-cut', 'a screw (or bolt) added, with its hole'], ['i16-3-cut', 'i16-4-undone', 'a screw (or bolt) taken away, with its hole']];
const D16 = ['too dark', 'the grid missing, or drawn over the parts', 'the count of pieces unexplained or not matching what is seen', 'faceted where it should be round', 'lines crossing over the labels or text'];
const READERS = 3;

it('drag to imprint, read blind', async () => {
  const dir = process.env.SHOTS; if (!dir || !existsSync(join(dir, 'i16-1-held.png'))) throw new Error('SHOTS=<the drag test\'s outDir> with its screenshots');
  const png = (n: string) => readFileSync(join(dir, `${n}.png`)), out: Record<string, unknown> = {};
  // (each shot alone, its readers asked in an order that differs from shot to shot)
  const names = Object.keys(FACTS), order = names.map((n, i) => names[(i * 5 + 3) % names.length]!);
  const read: Record<string, string[]> = {};
  for (const n of order) { read[n] = await Promise.all(Array.from({ length: READERS }, async () => (await see([png(n)], ASK, { json: true, temperature: 1 })).text)); writeFileSync(join(dir, 'blind.json'), JSON.stringify({ read }, null, 1)); }
  const pairs: Record<string, string[]> = {};
  for (const [a, b] of PAIRS) pairs[`${a} → ${b}`] = await Promise.all(Array.from({ length: READERS }, async () => (await see([png(a), png(b)], PAIR, { json: true, temperature: 1 })).text));
  // (the grader: the readers' words and the hidden facts only, quoting the words for each call)
  const grade = async (words: string[], facts: string[]) => { const t = await see([], `Readers described a screenshot without being told anything about it. For each reader, decide for each fact whether that reader's words name it (the same meaning in other words counts; a guess offered as one of several does not), quoting the words that do; and for each listed fault whether the reader names it as a fault, quoting the words. Facts: ${JSON.stringify(facts)}. Faults: ${JSON.stringify(D16)}. Readers: ${JSON.stringify(words)}. Answer as JSON {readers: [{facts: [{fact, named: boolean, quote}], faults: [{fault, named: boolean, quote}], other: [string] (any other fault the reader names)}]}`, { json: true, temperature: 0 });
    return JSON.parse(t.text) as { readers: { facts: { fact: string; named: boolean; quote: string }[]; faults: { fault: string; named: boolean; quote: string }[]; other?: string[] }[] }; };
  let fails = 0;
  for (const n of names) {
    const g = await grade(read[n]!, FACTS[n]!), allNamed = g.readers.filter((r) => r.facts.every((f) => f.named)).length;
    const faults = D16.filter((f) => g.readers.filter((r) => r.faults.some((x) => x.fault === f && x.named)).length >= 2), pass = allNamed >= 2 && !faults.length; if (!pass) fails++;
    const others = g.readers.flatMap((r) => r.other ?? []);
    console.log(`${pass ? 'PASS' : 'FAIL'} ${n}: ${allNamed} of ${READERS} readers named every fact${faults.length ? `; D16 faults named by two or more: ${faults.join(', ')}` : ''}`);
    for (const r of g.readers) for (const f of r.facts) if (!f.named) console.log(`     missed: ${f.fact}`);
    if (others.length) console.log(`     other faults named: ${others.join(' | ')}`);
    out[n] = { read: read[n], graded: g, pass }; writeFileSync(join(dir, 'blind.json'), JSON.stringify(out, null, 1));
  }
  for (const [a, b, fact] of PAIRS) { const k = `${a} → ${b}`, g = await grade(pairs[k]!, [fact]), named = g.readers.filter((r) => r.facts.every((f) => f.named)).length; if (named < 2) fails++;
    console.log(`${named >= 2 ? 'PASS' : 'FAIL'} ${k}: ${named} of ${READERS} readers named "${fact}"`); out[k] = { read: pairs[k], graded: g, pass: named >= 2 }; }
  writeFileSync(join(dir, 'blind.json'), JSON.stringify(out, null, 1));
  console.log(`\n${fails ? `${fails} FAIL` : 'all pass'} (the readers' words kept in ${join(dir, 'blind.json')})`);
}, 1_800_000);
