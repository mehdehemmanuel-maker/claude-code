// Wave 14, job "kit-machines" (decision 0029: a fuller library of the mid-level blocks machines are made of): every seed of
// assemblies/kit-machines.ts builds at its defaults and at a small and a large setting with every node ok, is one group of
// pieces (each reached from every other through the faces the operations wrote, as accept-w13-groups counts them), its
// bound grows with its inputs, the ones that move give a joint (motionOf), and plain words find it (searchByFunction).
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import type { Block } from '../../src/nexus/room';
import { motionOf } from '../../src/nexus/sim';
import { searchByFunction } from '../../src/nexus/aitools';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
const groups = (b: Block) => { const up = b.pieces.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i]!))); for (const f of b.faces) up[top(f.a)] = top(f.b); return new Set(b.pieces.map((_, i) => top(i))).size; };
async function built(id: string, set: Record<string, unknown>): Promise<{ block?: Block; failing: string[] }> {
  const b = emptyBoard(id); placeBlock(b, id, 0, 0, set, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
  return { block: e.state.get('x')?.out?.block as Block | undefined, failing: [...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.error}`) };
}
/** Each seed: a small and a large setting, whether it moves, and the plain words that should find it. */
const KIT: Record<string, { small: Record<string, unknown>; large: Record<string, unknown>; moves: boolean; words: string }> = {
  'seed.tracked-base': { small: { length: 200, width: 150, track: 35 }, large: { length: 6000, width: 4200, track: 900 }, moves: true, words: 'tracks' },
  'seed.dozer-blade': { small: { width: 200, height: 60, arm: 100 }, large: { width: 5000, height: 1800, arm: 3000 }, moves: false, words: 'bulldozer blade' },
  'seed.cab': { small: { width: 80, depth: 90, height: 100 }, large: { width: 2400, depth: 2600, height: 2400 }, moves: false, words: 'operator cab' },
  'seed.lift-mast': { small: { lift: 150, fork: 80, width: 70 }, large: { lift: 6000, fork: 1800, width: 1400 }, moves: true, words: 'forklift mast' },
  'seed.turret': { small: { diameter: 60, barrel: 80 }, large: { diameter: 2500, barrel: 4000 }, moves: true, words: 'turret' },
  'seed.wheeled-chassis': { small: { wheelbase: 100, track: 80, wheel: 30 }, large: { wheelbase: 4500, track: 2200, wheel: 1200, wheels: '6' }, moves: true, words: 'chassis with wheels' },
  'seed.cube-frame': { small: { x: 200, y: 200, z: 200, section: 20 }, large: { x: 4000, y: 3000, z: 5000, section: 80 }, moves: false, words: 'frame of extrusions' },
  'seed.booth': { small: { w: 300, d: 250, h: 300 }, large: { w: 5000, d: 4000, h: 3000 }, moves: false, words: 'enclosure' },
  'seed.conveyor': { small: { length: 200, width: 40, height: 60 }, large: { length: 10000, width: 1200, height: 1200 }, moves: true, words: 'conveyor' },
  'seed.chute': { small: { length: 100, width: 40 }, large: { length: 4000, width: 1500 }, moves: false, words: 'chute' },
  'seed.bin': { small: { w: 60, d: 40, h: 30 }, large: { w: 2400, d: 1600, h: 1200 }, moves: false, words: 'bin' },
  'seed.claw': { small: { reach: 50, fingers: 2 }, large: { reach: 2000, fingers: 5 }, moves: true, words: 'claw' },
  'seed.cargo-bed': { small: { length: 120, width: 70, side: 12 }, large: { length: 6000, width: 2400, side: 600 }, moves: false, words: 'cargo bed' },
  'seed.hover-skirt-hull': { small: { length: 300, width: 150 }, large: { length: 6000, width: 3000 }, moves: true, words: 'hovercraft hull' },
};
const size = (b: Block) => Math.max(...[0, 1, 2].map((k) => b.hi[k]! - b.lo[k]!));

describe('wave 14, kit-machines: the machine sub-assemblies build small, default and large, each one group', () => {
  for (const [id, k] of Object.entries(KIT)) it(id, async () => {
    expect(LIBRARY.has(id), `${id} is in the library`).toBe(true);
    const sizes: number[] = [];
    for (const set of [k.small, {}, k.large]) {
      const at = `${id} at ${JSON.stringify(set)}`, r = await built(id, set);
      expect(r.failing, `${at}: every node ok`).toEqual([]);
      const b = r.block!; expect(groups(b), `${at}: one group of pieces`).toBe(1);
      if (k.moves) expect(motionOf(b).joints.length, `${at}: it moves by a joint (${motionOf(b).says}; ${b.faces.map((f) => `${b.pieces[f.a]!.name}-${b.pieces[f.b]!.name}:${f.kind}/${f.fit ?? ''}/${f.joint ?? ''}`).join(', ')})`).toBeGreaterThan(0);
      sizes.push(size(b));
    }
    expect(sizes[0]! < sizes[1]! && sizes[1]! < sizes[2]!, `${id}: its bound grows with its inputs (${sizes.map((s) => (s * 1000).toFixed(0)).join(' < ')} mm)`).toBe(true);
    expect(searchByFunction(k.words, 8).map((f) => f.id), `"${k.words}" finds ${id}`).toContain(id);
  }, 30_000);
});
