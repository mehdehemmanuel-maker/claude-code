import { describe, expect, it } from 'vitest';
import { design } from '../../src/assistant/designer';
import { interpret } from '../../src/assistant/intent';
import { parse, run, type ForgeHost } from '../../src/forge/forge';
import { resolveKind, resolveMaterial } from '../../src/forge/catalog';

function recorder() {
  const parts: { id: string; kind: string; params: Record<string, unknown>; name?: string }[] = [];
  const joins: [string, string | null][] = [];
  const host: ForgeHost = {
    kind: (w) => resolveKind(w),
    material: (k, w) => resolveMaterial(k, w),
    place: (kind, params, _m, _at, _rot, name) => { const id = `p${parts.length}`; parts.push({ id, kind, params, name }); return id; },
    join: (a, b) => { joins.push([a, b]); return 'joined'; },
    set: () => {}, remove: () => {}, freeze: () => {}, select: () => {},
    command: (c) => c,
    find: (ref) => parts.find((p) => p.name === ref || p.id === ref)?.id ?? null,
  };
  return { host, parts, joins };
}

describe('Ego designs', () => {
  it('reads what you want built, with sizes, load and material in your own units', () => {
    expect(interpret('build a table that holds 60 kg')).toEqual({ do: 'design', spec: { what: 'table', load: 60 }, material: undefined });
    expect(interpret('design an oak desk 90 cm tall')).toEqual({ do: 'design', spec: { what: 'table', height: 0.9 }, material: 'oak' });
    expect(interpret('make a shelf with 5 shelves out of steel')).toEqual({ do: 'design', spec: { what: 'shelf', count: 5 }, material: 'steel' });
    expect(interpret('build a brick wall 2 m long')).toEqual({ do: 'design', spec: { what: 'wall', width: 2 }, material: 'brick' });
    expect(resolveMaterial('block', 'brick')).toBe('ceramic.clay-brick');
    const lbs = interpret('build me a bench that holds 300 lbs');
    expect(lbs).toMatchObject({ do: 'design', spec: { what: 'bench' } });
    expect((lbs as { spec: { load: number } }).spec.load).toBeCloseTo(136.08, 1);
    // a single part is still a single part
    expect(interpret('place 4 steel blocks')).toEqual({ do: 'place', count: 4, kind: 'block', material: 'steel' });
  });

  it('every design is Forge that builds what it says, every part joined', () => {
    for (const what of ['table', 'bench', 'crate', 'shelf', 'wall', 'tower'] as const) {
      const plan = design({ what }, 0, 2, 't-');
      expect(() => parse(plan.forge), what).not.toThrow();
      const r = recorder();
      const out = run(plan.forge, r.host);
      expect(out.ok, `${what}: ${out.ok ? '' : out.error}`).toBe(true);
      expect(r.parts.length, what).toBe(plan.parts);
      // one connected piece: joins reach every part
      const seen = new Set([r.parts[0]!.id]);
      for (let pass = 0; pass < r.parts.length; pass++) for (const [a, b] of r.joins) if (b && (seen.has(a) || seen.has(b))) { seen.add(a); seen.add(b); }
      expect(seen.size, what).toBe(r.parts.length);
    }
  });

  it('sizes members to the load: a heavier table gets a thicker top and stouter legs', () => {
    const light = design({ what: 'table', load: 20 }, 0, 0);
    const heavy = design({ what: 'table', load: 400 }, 0, 0);
    const thickness = (p: string) => Number(/thickness=([\d.]+)/.exec(p)![1]);
    expect(thickness(heavy.forge)).toBeGreaterThan(thickness(light.forge));
    const size = (p: string) => /size=(\w+)/.exec(p)![1];
    expect(['2x2', '2x4', '4x4'].indexOf(size(heavy.forge)!)).toBeGreaterThanOrEqual(['2x2', '2x4', '4x4'].indexOf(size(light.forge)!));
    expect(light.notes.join(' ')).toContain('20 kg');
    // a margin a lesson taught (construct/lessons.ts) sizes it for more than it is rated for
    const taught = design({ what: 'table', load: 60, margin: 1.5 }, 0, 0);
    expect(taught.notes.join(' ')).toContain('for 90 kg');
    expect(thickness(taught.forge)).toBeGreaterThanOrEqual(thickness(design({ what: 'table', load: 60 }, 0, 0).forge));
  });

  it('a steel table stands on square tube, a wall is laid in running bond', () => {
    expect(design({ what: 'table', material: 'steel.a36' }, 0, 0).forge).toContain('place tube.square');
    const w = design({ what: 'wall', width: 0.86, height: 0.13 }, 0, 0);
    // 4 bricks, then 3 set over by half a brick, each bedded on the two under it
    expect(w.parts).toBe(7);
    expect(w.forge.split('\n').filter((l) => l.startsWith('join')).length).toBe(6);
  });
});
