// Every call in the catalogue, run for real: each in a room of its own (a bearing and a rail, with the things the
// calls name made first), offline, with what it did or why it could not. A call that acts on the build standing in
// the forge, or asks Claude, cannot be run here without doing it to your build or asking: it says so, and is not
// counted as working or broken.

import { CALLS } from './calls';
import { evaluate, triggerOf } from './flows';
import { Workshop, type PartRef } from './generate';

export interface CallTest { group: string; i: number; label: string; text: string; ok: boolean | null; how: string; said: string }

const ROOM: PartRef[] = [
  { name: 'front bearing 6204 (20×47×14 mm)', at: [0, 0.3, 0], w: 0.047, h: 0.047, d: 0.014, mass: 0.11, r: 0.0235, bore: 0.02, axis: 'z' },
  { name: 'frame rail', at: [0, 0.1, 0], w: 0.5, h: 0.02, d: 0.02, mass: 0.4 },
];
/** What the calls name, made first: values, a cap on the bearing, a shaft through it, a cube s, three cubes in a row,
 *  two walls that meet, and a base to scatter on. */
export const PRELUDE = [
  'set load = 200 N', 'set torque = 20 N·m', 'set B = 3', 'set D = 4', 'material aluminium',
  'place plate named cap on bearing', 'place shaft named axle through bearing', 'place cube named s at 0.3 m, 0.8 m, 0.3 m size 40 mm',
  'place cube named a at 1 m, 0.8 m, 0 size 100 mm', 'place cube named b at 1.1 m, 0.8 m, 0 size 100 mm', 'place cube named c at 1.2 m, 0.8 m, 0 size 100 mm',
  'place wall named wall1 at 2.6 m, 1 m, 0 size 1000 x 100 x 2000 mm', 'place wall named wall2 at 3.05 m, 1 m, 550 mm size 100 x 1000 x 2000 mm',
  'place plate named base at -0.8 m, 0.5 m, 0 size 400 x 400 x 10 mm',
];
const FACTS = { flaws: 0, gaps: 0, parts: 2, mass: 0.51, rounds: 1, failures: 0, notes: 0 };
const ROOM_VERBS = /^(make|build|again|operate|flaws|show|note|say|board|wait)\b/i;

/** A room of the calls' own, its things made. */
export function testRoom(seed = 7): Workshop { const w = new Workshop({ parts: () => ROOM }, seed); for (const t of PRELUDE) w.run(t); return w; }

/** One call, run as a step of its kind would run it. */
export function testCall(group: string, i: number): CallTest {
  const g = CALLS.find((x) => x.id === group)!, c = g.calls[i]!, base = { group, i, label: c.label, text: c.text };
  if (g.kind === 'ai') return { ...base, ok: null, how: 'asks Claude', said: 'asks Claude where Claude can be reached; not run here' };
  if (g.kind === 'trigger') { const t = triggerOf(c.text); return { ...base, ok: !!t, how: 'read as a trigger', said: t ? `starts it ${t.kind === 'cond' ? `the moment ${t.cond} holds` : t.kind === 'tick' ? `every ${+(t.every! * 60).toPrecision(3)} s` : `on ${t.kind}`}` : 'not read as anything that starts a pipeline' }; }
  if (ROOM_VERBS.test(c.text) && !Workshop.handles(c.text)) return { ...base, ok: null, how: 'acts on the build', said: 'done to the build standing in the forge; not run here, so as not to change it' };
  const w = testRoom();
  try {
    if (/\bwalls\b/.test(c.text) && !/^join\b/.test(c.text)) w.run('join wall1 and wall2 as walls');
    if (Workshop.handles(c.text)) return { ...base, ok: true, how: 'done offline', said: w.run(c.text) };
    // a check or a repeat: read against the room as it stands
    const cond = c.text.replace(/^until\s+/i, '').replace(/,?\s*at most \d+ times?$/i, '');
    const r = evaluate(cond, { ...FACTS, ...w.facts() }, '', w.reader());
    return 'error' in r ? { ...base, ok: false, how: 'read as a check', said: r.error } : { ...base, ok: true, how: g.kind === 'check' && /^until\b/i.test(c.text) ? 'read as a repeat' : 'read as a check', said: `${r.ok ? 'holds' : 'does not hold'} here: ${r.says}` };
  } catch (e) {
    // a rule that finds this room breaks it has done its work: it is read, and it judged
    const why = (e as Error).message; if (/^rules?\b/i.test(c.text) && /^That would break the rule/.test(why)) return { ...base, ok: true, how: 'done offline', said: `works: in this room it finds ${why.replace(/^That would break the rules?: /, '').replace(/ Undone\.$/, '')}, so a step that did this would be undone` };
    return { ...base, ok: false, how: 'done offline', said: why };
  }
}
/** Every call, run. */
export function testCalls(): CallTest[] { return CALLS.flatMap((g) => g.calls.map((_, i) => testCall(g.id, i))); }
