import { describe, expect, it } from 'vitest';
import { evaluate, parse, quantity, run, type ForgeHost, MAX_PARTS } from '../../src/forge/forge';
import { resolveKind, resolveMaterial } from '../../src/forge/catalog';
import { HabitGraph } from '../../src/assistant/habits';
import { fixesFor } from '../../src/assistant/fixes';
import { getConnectorKind } from '../../src/connectors/registry';
import { getMaterial } from '../../src/data/materials';
import { planJoin } from '../../src/connectors/plan';

/** A host that records what Forge asked for. */
function recorder() {
  const parts: { id: string; kind: string; params: Record<string, unknown>; material: string; at: number[] | null; name?: string }[] = [];
  const joins: [string, string | null, string | undefined][] = [];
  const host: ForgeHost = {
    kind: (w) => resolveKind(w),
    material: (k, w) => resolveMaterial(k, w),
    place: (kind, params, material, at, _rot, name) => { const id = `p${parts.length}`; parts.push({ id, kind, params, material, at, name }); return id; },
    join: (a, b, k) => { joins.push([a, b, k]); return 'joined'; },
    set: () => {}, remove: () => {}, freeze: () => {}, select: () => {},
    command: (c) => c,
    find: (ref) => (ref === 'last' ? parts[parts.length - 1]?.id ?? null : parts.find((p) => p.name === ref || p.id === ref)?.id ?? null),
  };
  return { host, parts, joins };
}

describe('Forge', () => {
  it('reads quantities in builder units, into SI', () => {
    expect(quantity('38mm')).toBeCloseTo(0.038, 12);
    expect(quantity('1.2m')).toBe(1.2);
    expect(quantity('60%')).toBeCloseTo(0.6, 12);
    expect(quantity('90deg')).toBeCloseTo(Math.PI / 2, 12);
    expect(quantity('2kN')).toBe(2000);
    expect(quantity('3furlongs')).toBeNull();
  });

  it('does arithmetic without eval: units, the loop counter, precedence and parentheses', () => {
    expect(evaluate('i*0.3+0.1', { i: 2 }, 1)).toBeCloseTo(0.7, 12);
    expect(evaluate('(1+2)*50cm', {}, 1)).toBeCloseTo(1.5, 12);
    expect(evaluate('-i/2', { i: 3 }, 1)).toBe(-1.5);
    expect(() => evaluate('alert(1)', {}, 1)).toThrow();
    expect(() => evaluate('1/0', {}, 1)).toThrow(/finite/);
  });

  it('parses a build: parts with parameters, materials, places and names; joints; commands', () => {
    const prog = parse('place lumber size=2x4 length=1.2m mat oak at 0 0.9 0 as rail\njoin rail floor with bolted · play');
    expect(prog.map((s) => s.op)).toEqual(['place', 'join', 'do']);
    const p = prog[0] as Extract<(typeof prog)[number], { op: 'place' }>;
    expect(p.params).toEqual({ size: { word: '2x4' }, length: { num: 1.2 } });
    expect(p.material).toBe('oak');
    expect(p.name).toBe('rail');
  });

  it('says where and what is wrong', () => {
    expect(() => parse('place block at 0 0')).toThrow(/line 1: expected z/);
    expect(() => parse('fly away')).toThrow(/don't know how to "fly"/);
    expect(() => parse('repeat 3 { place block')).toThrow(/missing \}/);
    expect(() => parse('place block length=3furlongs')).toThrow(/known unit/);
  });

  it('builds in bulk: repeat numbers each pass, names get the count, and refs inside find their own', () => {
    const r = recorder();
    const res = run('repeat 4 { place lumber at (i*0.4) 0.35 -1 as leg · join leg floor }', r.host);
    expect(res.ok, res.error).toBe(true);
    expect(r.parts.map((p) => p.name)).toEqual(['leg0', 'leg1', 'leg2', 'leg3']);
    expect(r.parts.map((p) => p.at![0])).toEqual([0, 0.4, 0.8, 1.2000000000000002]);
    expect(r.joins).toEqual([['p0', null, undefined], ['p1', null, undefined], ['p2', null, undefined], ['p3', null, undefined]]);
  });

  it('resolves builder words to the catalog, within what the part can be made of', () => {
    expect(resolveKind('pipe')).toBe('tube.round');
    expect(resolveKind('electromagnet')).toBe('magnet.electro');
    expect(resolveMaterial('lumber', 'oak')).toMatch(/^wood\./);
    expect(resolveMaterial('block', 'a36')).toBe('steel.a36');
    expect(() => resolveMaterial('lumber', 'a36')).toThrow(/can't be made of/);
  });

  it('cannot run away with the headset', () => {
    const r = recorder();
    const res = run('repeat 1000 { place block }', r.host);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/stopped after/);
    expect(r.parts.length).toBe(MAX_PARTS);
  });
});

describe('habit graph', () => {
  const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

  it('learns what follows what, and remembers it next session', () => {
    const store = memory();
    const h = new HabitGraph(store);
    for (let n = 0; n < 5; n++) { h.see('place:lumber'); h.see('join:auto'); }
    h.see('place:lumber');
    expect(h.predict(1)[0]!.token).toBe('join:auto');
    const again = new HabitGraph(store);
    again.see('place:lumber');
    expect(again.predict(1)[0]!.token).toBe('join:auto');
  });

  it('two steps of history outrank one once they have been seen enough', () => {
    const h = new HabitGraph(memory());
    // after place:plate, the next is usually play; but after weld then place:plate it is always join:weld
    for (let n = 0; n < 4; n++) { h.see('place:plate'); h.see('play'); }
    for (let n = 0; n < 3; n++) { h.see('join:weld'); h.see('place:plate'); h.see('join:weld'); }
    h.see('join:weld'); h.see('place:plate');
    expect(h.predict(1)[0]!.token).toBe('join:weld');
  });
});

describe('fixes', () => {
  const fir = getMaterial('wood.douglas-fir');
  const g = { thicknessA: 0.1, thicknessB: 0.038, bondW: 0.089, bondL: 0.038 };
  it('what would have held: every fix carries 1.5x the load that broke the joint, smallest change first', () => {
    const plan = planJoin('screwed', fir, fir, g);
    const cap = getConnectorKind('screwed').derive({ params: plan.params, matA: fir, matB: fir, thicknessA: 0.1, thicknessB: 0.038, distance: 0, cure: 1e12 }).capacities.bending;
    const fixes = fixesFor({ kind: 'screwed', params: plan.params, mode: 'bending', load: cap * 1.1 }, fir, fir, g);
    expect(fixes.length).toBeGreaterThan(0);
    for (const f of fixes) expect(f.capacity).toBeGreaterThan(1.5 * cap * 1.1);
    expect(fixes[0]!.kind).toBe('screwed'); // more screws before another process
  });

  it('a joint that could never hold (a weld on wood) is fixed by one that can', () => {
    const fixes = fixesFor({ kind: 'weld', params: {}, mode: 'instant', load: 0 }, fir, fir, g);
    expect(fixes.length).toBeGreaterThan(0);
    expect(fixes.every((f) => f.kind !== 'weld')).toBe(true);
  });
});
