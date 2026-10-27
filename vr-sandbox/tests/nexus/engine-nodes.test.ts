import { describe, expect, it } from 'vitest';
import { Engine, emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';
import { engineBuilt, engineDims, HEAD_PIECES, headPiece, type EngineSpec } from '../../src/nexus/engines';
import type { Part } from '../../src/nexus/kits';
import { massOf } from '../../src/nexus/mass';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const spec: EngineSpec = { cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al', cams: 'dohc', valves: 4 };

describe('an engine built from nodes, each part wired into what it is in', () => {
  it('makes each of a head\'s pieces in its own frame, its seat at its origin', () => {
    for (const w of HEAD_PIECES) { const p = headPiece(spec, w); expect(massOf(p), w).toBeGreaterThan(0); expect(p.at ?? [0, 0, 0], w).toEqual([0, 0, 0]); }
  });
  it('builds the same engine whether its parts are made inside it or wired in', () => {
    const own = engineBuilt(spec), d = engineDims(spec);
    const wired = engineBuilt(spec, { head: undefined, piston: own.parts.piston, rod: own.parts.rod, crank: own.parts.crank, block: own.parts.block });
    expect(wired.kg).toBeCloseTo(own.kg, 9); expect(wired.pieces).toBe(own.pieces); void d;
  });
  it('carries a spring made by the coil node through the head into the engine: every valve gets it, and the engine weighs the change', async () => {
    const b = emptyBoard('engine from nodes'), e = { cylinders: 4, bore: 0.0805, stroke: 0.0976 };
    // (a heavier spring than the head would make for itself: 3.2 mm wire against its 2.6)
    placeBlock(b, 'make.coil', 0, 0, { name: 'valve spring', item: 'valve-spring', d: 0.0032, D: 0.0193, L: 0.037, n: 5 }, 'spr');
    placeBlock(b, 'engine.head', 0, 0, {}, 'hd'); wire(b, 'spr', 'spring', 'hd', 'valveSpring');
    placeBlock(b, 'engine.whole', 0, 0, {}, 'eng'); wire(b, 'hd', 'head', 'eng', 'head');
    placeBlock(b, 'engine.whole', 0, 0, {}, 'plain');
    for (const id of ['hd', 'eng', 'plain']) b.nodes[id]!.set = { ...(b.nodes[id]!.set ?? {}), ...Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v])) };
    const run = new Engine(b); await run.run();
    for (const id of ['spr', 'hd', 'eng', 'plain']) expect(run.state.get(id)?.status, `${id}: ${run.state.get(id)?.error}`).toBe('ok');
    const eng = run.state.get('eng')!.out!.engine as Part, plain = run.state.get('plain')!.out!.engine as Part;
    const springs = all(eng).filter((p) => p.name === 'valve spring');
    expect(springs.length).toBe(16); for (const sp of springs) expect((sp.says ?? '')).toMatch(/3\.2 mm wire/);
    const one = (q: Part) => massOf(all(q).find((p) => p.name === 'valve spring')!);
    expect(massOf(eng) - massOf(plain)).toBeCloseTo(16 * (one(eng) - one(plain)), 6); expect(massOf(eng)).toBeGreaterThan(massOf(plain));
  });
});
