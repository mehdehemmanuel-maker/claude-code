// Structures from function and constraints (src/assistant/grammar.ts): every kind is Forge that builds one connected
// piece; every member is sized by the laws for its share; what is asked in words becomes the spec; a revision rebuilds
// the last design from its spec; and the stand knows where to load and push each of them.

import { describe, expect, it } from 'vitest';
import { DEFAULTS, design, sizeOf, type Design } from '../../src/assistant/designer';
import { railFor, STRUCTURES } from '../../src/assistant/grammar';
import { interpret } from '../../src/assistant/intent';
import { parse, run, type ForgeHost } from '../../src/forge/forge';
import { resolveKind, resolveMaterial } from '../../src/forge/catalog';
import { getMaterial } from '../../src/data/materials';
import { buildTest, standLoads, standPushes } from '../../src/mind';
import { newDoc } from '../../src/doc/commands';

function recorder() {
  const parts: { id: string; kind: string; params: Record<string, unknown>; name?: string }[] = [];
  const joins: [string, string | null][] = [];
  const host: ForgeHost = {
    kind: (w) => resolveKind(w), material: (k, w) => resolveMaterial(k, w),
    place: (kind, params, _m, _at, _rot, name) => { const id = `p${parts.length}`; parts.push({ id, kind, params, name }); return id; },
    join: (a, b) => { joins.push([a, b]); return 'joined'; },
    set: () => {}, remove: () => {}, freeze: () => {}, select: () => {}, command: (c) => c,
    find: (ref) => parts.find((p) => p.name === ref || p.id === ref)?.id ?? null,
  };
  return { host, parts, joins };
}
const ALL: Design[] = ['table', 'bench', 'crate', 'shelf', 'wall', 'tower', ...STRUCTURES];
const sim = { ...newDoc().sim, airDrag: false };

describe('structures from function and constraints', () => {
  it('every kind, in wood and in steel, is Forge that builds what it says, every part joined into one piece', () => {
    for (const what of ALL) for (const material of [undefined, 'steel.a36']) {
      const plan = design({ what, material }, 0, 2, 't-');
      expect(() => parse(plan.forge), `${what} ${material}`).not.toThrow();
      const r = recorder();
      const out = run(plan.forge, r.host);
      expect(out.ok, `${what} ${material}: ${out.ok ? '' : out.error}`).toBe(true);
      expect(r.parts.length, what).toBe(plan.parts);
      const seen = new Set([r.parts[0]!.id]);
      for (let pass = 0; pass < r.parts.length; pass++) for (const [a, b] of r.joins) if (b && (seen.has(a) || seen.has(b))) { seen.add(a); seen.add(b); }
      expect(seen.size, `${what} ${material} connected`).toBe(r.parts.length);
    }
  });

  it('members are sized by the law for their share: a heavier bridge gets a thicker deck and a stouter rail; a rail on edge is the smallest stock that holds', () => {
    const light = design({ what: 'bridge', load: 50 }, 0, 0), heavy = design({ what: 'bridge', load: 800 }, 0, 0);
    const thickness = (p: string) => Number(/thickness=([\d.]+)/.exec(p)![1]);
    expect(thickness(heavy.forge)).toBeGreaterThan(thickness(light.forge));
    const fir = getMaterial('wood.douglas-fir');
    const small = railFor(fir, 0.6, 200), big = railFor(fir, 2.4, 3000);
    expect(small.kind).toBe('lumber');
    expect(['1x4', '2x4', '2x6', '2x8'].indexOf(/size=(\w+)/.exec(big.params)![1]!)).toBeGreaterThan(['1x4', '2x4', '2x6', '2x8'].indexOf(/size=(\w+)/.exec(small.params)![1]!));
    const steel = railFor(getMaterial('steel.a36'), 2.4, 3000);
    expect(steel.kind).toBe('tube.square');
    // the sizes a design takes when none is said are one table
    expect(sizeOf({ what: 'ladder' }, 'height')).toBe(DEFAULTS.ladder.height);
  });

  it('a ladder has a rung every 300 mm a side and stands as a triangle; a ramp has a support every metre; a tall narrow frame is braced', () => {
    const ladder = design({ what: 'ladder', height: 1.8 }, 0, 0, 'l-');
    expect(ladder.forge.split('\n').filter((l) => /as l-rungA\d+$/.test(l)).length).toBe(6);
    expect(ladder.forge).toContain('join l-stileA0 l-stileB0');
    const ramp = design({ what: 'ramp', width: 3, height: 0.6 }, 0, 0, 'r-');
    expect(ramp.forge.split('\n').filter((l) => /as r-cap\d+$/.test(l)).length).toBeGreaterThanOrEqual(3);
    expect(ramp.forge).toMatch(/rot z 11\.31/);
    const squat = design({ what: 'frame', width: 1, depth: 1, height: 0.8 }, 0, 0, 'f-'), tall = design({ what: 'frame', width: 0.5, depth: 0.5, height: 1.6 }, 0, 0, 'f-');
    expect(squat.forge).not.toContain('brace');
    expect(tall.forge).toContain('as f-braceF');
    const chair = design({ what: 'chair' }, 0, 0, 'c-');
    expect(chair.parts).toBe(10);
    expect(chair.forge).toContain('as c-back');
  });

  it('asked in words: a bridge for a mass is a structure, a bracket for a force is a part grown by its loads', () => {
    expect(interpret('build a bridge 2 m long that holds 100 kg')).toEqual({ do: 'design', spec: { what: 'bridge', width: 2, load: 100 }, material: undefined });
    expect(interpret('build a ladder 2 m tall')).toEqual({ do: 'design', spec: { what: 'ladder', height: 2 }, material: undefined });
    expect(interpret('make a steel chair that holds 120 kg')).toEqual({ do: 'design', spec: { what: 'chair', load: 120 }, material: 'steel' });
    expect(interpret('build a ramp 3 m long and 50 cm high')).toEqual({ do: 'design', spec: { what: 'ramp', width: 3, height: 0.5 }, material: undefined });
    expect(interpret('build a stand 1.2 m tall for 30 kg')).toMatchObject({ do: 'design', spec: { what: 'stand', height: 1.2, load: 30 } });
    expect(interpret('invent a bracket that holds 500 N at 120 mm from the wall')).toMatchObject({ do: 'invent' });
  });

  it('a revision is read as a change to the last design: sizes scaled or shifted, a load, a material, bracing', () => {
    expect(interpret('make it taller')).toEqual({ do: 'revise', change: { height: { factor: 1.25 } } });
    expect(interpret('make it 20 cm wider')).toEqual({ do: 'revise', change: { width: { delta: 0.2 } } });
    expect(interpret('make it shorter by 10%')).toEqual({ do: 'revise', change: { height: { factor: 1 / 1.1 } } });
    expect(interpret('make it hold 200 kg')).toEqual({ do: 'revise', change: { load: { value: 200 } } });
    expect(interpret('make it out of oak')).toEqual({ do: 'revise', change: { material: 'oak' } });
    expect(interpret('make it stronger')).toEqual({ do: 'strengthen' });
    expect(interpret('make it with braces')).toEqual({ do: 'revise', change: { aprons: true } });
    expect(interpret('make it bigger')).toEqual({ do: 'revise', change: { all: { factor: 1.25 } } });
  });

  it('every structure, braced and unbraced, builds on the bench by relation: every rail spans its gap, every joint is where parts touch, nothing shares space', () => {
    for (const what of STRUCTURES) for (const aprons of [false, true]) {
      const { frag } = buildTest({ spec: { what, aprons }, changes: [], factor: 1 }, sim);
      expect(frag.parts.length, `${what}${aprons ? ' braced' : ''}`).toBe(design({ what, aprons }, 0, 0, 'm-').parts);
      // one connected piece
      const seen = new Set([frag.parts[0]!.id]);
      for (let pass = 0; pass < frag.parts.length; pass++) for (const c of frag.connections) if (c.b && (seen.has(c.a.part) || seen.has(c.b.part))) { seen.add(c.a.part); seen.add(c.b.part); }
      expect(seen.size, `${what}${aprons ? ' braced' : ''} connected`).toBe(frag.parts.length);
    }
  });

  it('the stand knows where to load and push every kind: on the deck, the seat, a rung half way up, and sideways at the far end', () => {
    for (const what of STRUCTURES) {
      const { setup, frag } = buildTest({ spec: { what }, changes: [], factor: 1 }, sim);
      expect(setup.loads.length, `${what} loads`).toBeGreaterThan(0);
      expect((setup.pushes ?? []).length, `${what} pushes`).toBeGreaterThan(0);
      expect(standLoads({ what }, frag).reduce((s, l) => s + l.kg, 0)).toBe(DEFAULTS[what].load);
      const push = standPushes({ what }, frag)[0]!;
      expect(frag.parts.some((p) => p.id === push.part)).toBe(true);
    }
    const { frag } = buildTest({ spec: { what: 'ladder', height: 1.8 }, changes: [], factor: 1 }, sim);
    const [load] = standLoads({ what: 'ladder', height: 1.8 }, frag);
    expect(load!.at[1]).toBeGreaterThan(0.6);
    expect(load!.at[1]).toBeLessThan(1.2);
  });
});
