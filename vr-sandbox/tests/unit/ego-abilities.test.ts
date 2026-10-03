import { describe, expect, it } from 'vitest';
import { Preferences } from '../../src/assistant/preferences';
import { findRepeat, generalize, SkillBook, skillProgram } from '../../src/assistant/skills';
import { foresee } from '../../src/assistant/foresight';
import { parse } from '../../src/forge/forge';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe('what she remembers of your choices', () => {
  it('remembers what you choose, once you have chosen it more than once, and keeps it next session (and what Ada or a levelled Ego had kept)', () => {
    const store = memory();
    const g = new Preferences(store);
    g.prefer('join:wood+wood', 'glued');
    expect(g.preferred('join:wood+wood')).toBeNull();
    g.prefer('join:wood+wood', 'glued');
    g.prefer('join:wood+wood', 'screwed');
    expect(g.preferred('join:wood+wood')).toBe('glued');
    expect(new Preferences(store).preferred('join:wood+wood')).toBe('glued');
    const old = memory();
    old.setItem('vrsb.ego', JSON.stringify({ v: 1, xp: 120, prefs: { 'join:steel+steel': { welded: 3 } } }));
    expect(new Preferences(old).preferred('join:steel+steel')).toBe('welded');
  });
});

describe('skills she teaches herself', () => {
  const round = (x: number) => [
    `place block mat wood.douglas-fir at ${x} 0.05 0 as b${x}a`,
    `place block mat wood.douglas-fir at ${x} 0.15 0 as b${x}b`,
    `join b${x}a b${x}b with screwed`,
  ];

  it('notices a run of steps you repeated, and makes it general: relative places, slots for names', () => {
    const journal = [...round(0), 'set b0a mat steel.a36', ...round(2)];
    const lines = findRepeat(journal)!;
    expect(lines).toEqual(round(2));
    expect(generalize(lines)).toEqual([
      'place block mat wood.douglas-fir at 0 0.05 0 as $1',
      'place block mat wood.douglas-fir at 0 0.15 0 as $2',
      'join $1 $2 with screwed',
    ]);
  });

  it('a skill runs anywhere as valid Forge, with fresh names', () => {
    const book = new SkillBook(memory());
    const sk = book.learn(round(0))!;
    expect(sk.name).toBe('block, block, screwed');
    const prog = skillProgram(sk, 3, -1, 'stack-7-');
    expect(prog).toContain('at 3 0.05 -1 as stack-7-1');
    expect(prog).toContain('join stack-7-1 stack-7-2 with screwed');
    expect(() => parse(prog)).not.toThrow();
  });

  it('does not learn steps that reach outside themselves, and never offers again once you say no', () => {
    expect(generalize(['place block mat x at 0 0 0 as a', 'join a someone-else with bolted'])).toBeNull();
    const book = new SkillBook(memory());
    book.decline('place:block|join:screwed');
    expect(book.knows('place:block|join:screwed')).toBe(true);
  });
});

describe('foresight', () => {
  // a 2 kg arm held off a pinned post by one joint, its centre 0.3 m out
  const parts = [
    { id: 'post', mass: 5, com: [0, 1, 0] as [number, number, number], grounded: true },
    { id: 'arm', mass: 2, com: [0.35, 1, 0] as [number, number, number], grounded: false },
  ];
  it('a joint that alone holds parts off the ground carries their weight, and its moment', () => {
    const [f] = foresee(parts, [{ id: 'j', a: 'post', b: 'arm', at: [0.05, 1, 0], shear: 1000, bending: 3 }], 9.81);
    expect(f!.mode).toBe('bending');
    expect(f!.load).toBeCloseTo(2 * 9.81 * 0.3, 9);
    expect(f!.u).toBeCloseTo((2 * 9.81 * 0.3) / 3, 9);
    expect(f!.carried).toEqual(['arm']);
  });

  it('stays instant however big the build: a 400-part chain and lattice in a few milliseconds', () => {
    const P = 400;
    const ps = Array.from({ length: P }, (_, i) => ({ id: `p${i}`, mass: 1, com: [i * 0.1, 1, 0] as [number, number, number], grounded: i === 0 }));
    // a chain (every joint a bridge) with a cross-braced lattice hung off its end (no bridges inside it)
    const js = Array.from({ length: P - 1 }, (_, i) => ({ id: `j${i}`, a: `p${i}`, b: `p${i + 1}`, at: [i * 0.1 + 0.05, 1, 0] as [number, number, number], shear: 1e9, bending: 1e9 }));
    for (let i = 300; i < P - 2; i++) js.push({ id: `x${i}`, a: `p${i}`, b: `p${i + 2}`, at: [i * 0.1, 1, 0] as [number, number, number], shear: 1e9, bending: 1e9 });
    const t = performance.now();
    const f = foresee(ps, js, 9.81);
    expect(performance.now() - t).toBeLessThan(50);
    // the chain's joints up to the lattice are bridges; the first carries everything but the grounded part
    expect(f.find((x) => x.id === 'j0')!.carried.length).toBe(P - 1);
    expect(f.some((x) => x.id === 'j350')).toBe(false);
    expect(f.some((x) => x.id.startsWith('x'))).toBe(false);
  });

  it('leaves shared load paths to the physics', () => {
    const loop = foresee(parts, [
      { id: 'j1', a: 'post', b: 'arm', at: [0.05, 1, 0], shear: 1000, bending: 3 },
      { id: 'j2', a: 'post', b: 'arm', at: [0.05, 1.1, 0], shear: 1000, bending: 3 },
    ], 9.81);
    expect(loop).toEqual([]);
  });
});

describe('complaints and reports', () => {
  it('reads your words as the trouble they describe', async () => {
    const { troubleOf, isComplaint } = await import('../../src/assistant/reports');
    expect(troubleOf("it's shaking like crazy")).toBe('jitter');
    expect(troubleOf('the block fell through the floor')).toBe('fell-through');
    expect(troubleOf('it just exploded')).toBe('flung');
    expect(troubleOf('the shelf came apart')).toBe('broke');
    expect(troubleOf('so laggy')).toBe('slow');
    expect(troubleOf("that wouldn't happen in real life")).toBe('unrealistic');
    expect(troubleOf("my build won't save")).toBe('save');
    expect(troubleOf('I lost my template')).toBe('save');
    expect(isComplaint('this is broken')).toBe(true);
    expect(isComplaint('place 4 steel blocks')).toBe(false);
  });

  it('a report reads as an issue Claude can act on, and the link stays short enough to open', async () => {
    const { reportText, issueUrl } = await import('../../src/assistant/reports');
    const r = { id: 'r1', at: '2026-09-30T03:40:00Z', words: 'it fell through the floor', trouble: 'fell-through' as const, seen: ['watchdog critical: tunnel on Block 1: 0.3 m below the floor'], fixed: 'put Block 1 back on the floor', version: 'abc1234', build: 'Untitled', shareCode: `VRSB1.${'x'.repeat(20000)}.00000000`, sent: false };
    const text = reportText([r], false);
    expect(text).toContain('“it fell through the floor”');
    expect(text).toContain('Ego fixed:** put Block 1 back on the floor');
    const url = issueUrl([r], 'owner/repo');
    expect(url.startsWith('https://github.com/owner/repo/issues/new?title=')).toBe(true);
    expect(url.length).toBeLessThan(7500); // the long build code is left out rather than break the link
  });
});
