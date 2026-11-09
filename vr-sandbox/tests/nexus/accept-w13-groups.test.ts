// Wave 13, job "groups" (decision 0029: every assembly one thing): every seed.* that makes a room block, placed at its
// defaults and at a second setting, is one group of pieces: each piece reached from every other through the faces the
// operations wrote (the union of faces the domains tests use, `groups` there). The second setting is read off the block's
// own inputs, not chosen by hand: its first input with choices at the choice after its default, or, with none, its first
// number input at one and a quarter times its default (rounded); a seed with no input is built once. A seed that holds a
// block wired in (seed.bolted-two, seed.bolted-four, seed.boxed, seed.standoffs: a fold of an operation) builds nothing
// alone and is not swept. What is not one group is listed, and the list is empty.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, portsOf, type BlockDef } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import type { Block } from '../../src/nexus/room';
import { motionOf } from '../../src/nexus/sim';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
const groups = (b: Block) => { const up = b.pieces.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i]!))); for (const f of b.faces) up[top(f.a)] = top(f.b); return new Set(b.pieces.map((_, i) => top(i))).size; };
/** The second setting, from the block's own inputs (see the head of this file); undefined where it has none. */
function second(d: BlockDef): Record<string, unknown> | undefined {
  const ins = portsOf(d).inputs, c = ins.find((x) => (x.choices?.length ?? 0) > 1);
  if (c) { const ch = c.choices!, k = ch.indexOf(String(c.default)); return { [c.name]: ch[(k + 1) % ch.length] }; }
  const n = ins.find((x) => x.type === 'number' && Number(x.default));
  return n ? { [n.name]: Math.round(Number(n.default) * 1.25) } : undefined;
}
async function built(id: string, set: Record<string, unknown>): Promise<{ block?: Block; failing: string[] }> {
  const b = emptyBoard(id); placeBlock(b, id, 0, 0, set, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
  return { block: e.state.get('x')?.out?.block as Block | undefined, failing: [...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.error}`) };
}
const SEEDS = [...LIBRARY.keys()].filter((id) => id.startsWith('seed.') && !portsOf(LIBRARY.get(id)!).inputs.some((p) => p.type === 'block')).sort();
const CHUNKS = 6, chunk = (k: number) => SEEDS.filter((_, i) => i % CHUNKS === k);

describe('wave 13, groups: every seed.* at two settings is one group of pieces', () => {
  for (let k = 0; k < CHUNKS; k++) it(`seeds, part ${k + 1} of ${CHUNKS}`, async () => {
    const bad: string[] = [];
    for (const id of chunk(k)) {
      const two = second(LIBRARY.get(id)!), sets = two ? [{}, two] : [{}];
      for (const set of sets) {
        const at = `${id} at ${JSON.stringify(set)}`, r = await built(id, set);
        if (r.failing.length) { bad.push(`${at}: failing ${r.failing.join('; ')}`); continue; }
        if (!r.block?.pieces) continue; // (a seed that places nothing: a coil spring made and loaded, a pack's figures)
        const g = groups(r.block); if (g !== 1) bad.push(`${at}: ${g} groups of pieces`);
      }
    }
    console.log(`part ${k + 1}: ${chunk(k).length} seeds; not one group: ${JSON.stringify(bad, null, 1)}`);
    expect(bad).toEqual([]);
  }, 30_000);
  // (the two the sweep found, as they should be: the helicopter's rotors each turning on its shaft, not held by the boom;
  // the rocket's three fins each on the tube's side at the same reach from its axis, a third of a turn apart)
  it('the helicopter\'s two rotors turn; the rocket\'s fins on its tube a third of a turn apart', async () => {
    const h = (await built('seed.helicopter', {})).block!, m = motionOf(h), turns = (re: RegExp) => m.joints.length > 0 && m.bodies.some((b) => !b.frozen && b.pieces.some((i) => re.test(h.pieces[i]!.name)));
    expect([turns(/^main hub$/), turns(/^tail hub$/)], `the main and tail rotors turn (${m.says})`).toEqual([true, true]);
    const r = (await built('seed.model-rocket', {})).block!, ax = r.pieces.find((p) => p.name === 'rocket body')!.solid.base.c;
    const fins = r.pieces.filter((p) => p.name === 'rocket fin').map((p) => { const c = p.solid.base.c; return [Math.round(((Math.atan2(c[2] - ax[2], c[0] - ax[0]) * 180) / Math.PI + 360) % 360), Math.round(Math.hypot(c[2] - ax[2], c[0] - ax[0]) * 1e6)]; }).sort((u, v) => u[0]! - v[0]!);
    expect([fins.map((f) => f[0]), new Set(fins.map((f) => f[1])).size], 'three fins at 0°, 120°, 240°, each as far from the axis').toEqual([[0, 120, 240], 1]);
  }, 30_000);
});
