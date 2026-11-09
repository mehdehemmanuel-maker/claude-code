// Wave 11 integration, group I1: the assemblies that fell apart once over wrote a face only where a bore is within the
// fit's gap (P2's true faces). The root: recipes drew a hub, a pod, a drum, a disc, a knuckle or a coupling with a bore
// wider than what it goes on, so no face was written and the pieces were no longer one group. Each is now drawn with no
// bore (over bores it at its fit), or with its bore at the fit (a coupling), or touching (a cable's extruded insulation).
// Each check here: the thing is one group of pieces, and the sleeve's face on its shaft carries no more than the fit's gap.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { LIBRARY, testBlock } from '../../src/nexus/blocks';
import { PIPES, boltedJoint, coupling, pipe, plate } from '../../src/nexus/common';
import { fitGap, over, type Block } from '../../src/nexus/room';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
const groups = (b: Block) => { const up = b.pieces.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i]!))); for (const f of b.faces) up[top(f.a)] = top(f.b); return new Set(b.pieces.map((_, i) => top(i))).size; };
async function built(id: string, set: Record<string, unknown>): Promise<Block> {
  const b = emptyBoard(id); placeBlock(b, id, 0, 0, set, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
  expect([...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.error}`), `${id}: every node runs`).toEqual([]);
  return e.state.get('x')!.out!.block as Block;
}
/** The faces between a piece named `sleeve` and one named `shaft` (either way round), each with its gap. */
const facesOn = (b: Block, sleeve: RegExp, shaft: RegExp) => b.faces.filter((f) => { const A = b.pieces[f.a]!.name, B = b.pieces[f.b]!.name; return (sleeve.test(A) && shaft.test(B)) || (sleeve.test(B) && shaft.test(A)); });

describe('wave 11 integration I1: assemblies one group again, each sleeve bored at its fit', () => {
  // (seed, settings, the sleeve and its shaft by name, how many such faces, the fit's gap at the shaft's diameter (mm))
  const CASES: [string, Record<string, unknown>, RegExp, RegExp, number, number][] = [
    ['seed.boat', {}, /^motor pod$/, /^Ø10 shaft$/, 1, 10],
    ['seed.boat', { length: 3000 }, /^motor pod$/, /^Ø10 shaft$/, 1, 10],
    ['seed.quadcopter', { size: '250' }, /^prop hub$/, /^motor \d shaft$/, 4, 5],
    ['seed.quadcopter', { size: '450', stack: 10 }, /^prop hub$/, /^motor \d shaft$/, 4, 5],
    ['seed.lamp-arm', {}, /^knuckle$/, /^pivot pin$/, 2, 6],
    ['seed.winch', {}, /^(winch drum|drum flange)$/, /^Ø12 shaft$/, 3, 12],
    ['seed.truck', {}, /^truck rim$/, /^stub axle /, 4, 44],
    ['seed.truck', { wheels: '6' }, /^truck rim$/, /^stub axle /, 6, 44],
    ['seed.turntable', {}, /^platter$/, /^Ø10 shaft$/, 1, 10],
    ['seed.turntable', { platter: 80 }, /^platter$/, /^Ø10 shaft$/, 1, 10],
    ['seed.catapult', {}, /^catapult arm$/, /^Ø10 shaft$/, 1, 10],
  ];
  for (const [id, set, sleeve, shaft, n, d] of CASES) {
    it(`${id} at ${JSON.stringify(set)}: one group, each ${sleeve.source} on its ${shaft.source} by a face within the clear fit's gap`, async () => {
      const b = await built(id, set);
      expect(groups(b), `${id}: one group of pieces`).toBe(1);
      const fs = facesOn(b, sleeve, shaft), g = fitGap('clear', d / 1000);
      expect(fs.length, `${id}: faces of ${sleeve.source} on ${shaft.source}`).toBe(n);
      for (const f of fs) expect(f.gap, `${id}: a face's gap against the clear fit's ${(g * 1e6).toFixed(1)} µm at Ø${d}`).toBeLessThanOrEqual(g + 1e-12);
    }, 30_000);
  }
  it('a coupling over its pipe: its bore the pipe\'s outside and the slide fit\'s gap, so over writes its face', () => {
    for (const size of ['copper 15×0.7', 'copper 22×0.9']) {
      const p = pipe(size, 0.2), c = coupling(size), od = PIPES[size as keyof typeof PIPES].od / 1000, g = fitGap('slide', od);
      const ri = (c.pieces[0]!.solid.base as { ri?: number }).ri!;
      expect(ri - od / 2, `${size}: the coupling's bore stands the slide fit's gap off the pipe`).toBeCloseTo(g, 12);
      const b = over(p, `${size} pipe/axis`, c, 'hi', 'slide');
      expect([b.faces.length, groups(b)], `${size}: one face, one group`).toEqual([1, 1]);
      expect(b.faces[0]!.gap).toBeCloseTo(g, 12);
    }
  });
  it('room.key, piece.refline and piece.powercable pass their own tests: the hub, the foam and the insulation each have their face', async () => {
    for (const id of ['room.key', 'piece.refline', 'piece.powercable', 'room.over']) expect((await testBlock(LIBRARY.get(id)!)).fails, id).toEqual([]);
  }, 30_000);
  // (over writes a face where a piece of the sleeve ends on a piece of the host, touching: a washer slid up against the
  // plate it clamps. Its ISO 7089 bore, 8.4 mm, stands 200 µm off an M8 shank, so no face is written round the shank)
  it('a bolted joint: each washer has its face on the plate it clamps and none round the shank; mate.bolted and mate.plate pass their own tests', async () => {
    const pl = plate('plate', 0.08, 0.005, 0.05, 'al-6061', [[-0.025, 0], [0.025, 0]], 0.009);
    const b = boltedJoint(boltedJoint(pl, 'plate/holes', 'M8', 0), 'plate/holes', 'M8', 1);
    expect([b.faces.length, groups(b)], 'two joints: twelve faces, one group').toEqual([12, 1]);
    const onPlate = facesOn(b, /^M8 washer$/, /^plate$/), onShank = facesOn(b, /^M8 washer$/, /^M8 shank/);
    expect([onPlate.length, onPlate.every((f) => f.kind === 'contact' && f.gap === 0 && f.area > 0), onShank.length], 'washers on the plate, touching; none round the shank').toEqual([2, true, 0]);
    for (const id of ['mate.bolted', 'mate.plate']) expect((await testBlock(LIBRARY.get(id)!)).fails, id).toEqual([]);
  }, 30_000);
});
