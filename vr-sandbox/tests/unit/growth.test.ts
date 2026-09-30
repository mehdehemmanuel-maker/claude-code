import { describe, expect, it } from 'vitest';
import { Growth, LEVELS } from '../../src/assistant/growth';
import { findRepeat, generalize, SkillBook, skillProgram } from '../../src/assistant/skills';
import { foresee } from '../../src/assistant/foresight';
import { parse } from '../../src/forge/forge';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

describe('Ego grows', () => {
  it('starts with sight only, gains each ability at its level, and keeps it next session', () => {
    const store = memory();
    const g = new Growth(store);
    expect(g.level.level).toBe(1);
    expect(g.has('sight')).toBe(true);
    expect(g.has('skills')).toBe(false);
    const gained = g.earn(LEVELS[2]!.xp);
    expect(gained.map((l) => l.ability)).toEqual(['habits', 'skills']);
    expect(new Growth(store).has('skills')).toBe(true);
    expect(new Growth(store).has('foresight')).toBe(false);
  });

  it('remembers what you choose, once you have chosen it more than once', () => {
    const g = new Growth(memory());
    g.prefer('join:wood+wood', 'glued');
    expect(g.preferred('join:wood+wood')).toBeNull();
    g.prefer('join:wood+wood', 'glued');
    g.prefer('join:wood+wood', 'screwed');
    expect(g.preferred('join:wood+wood')).toBe('glued');
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

  it('leaves shared load paths to the physics', () => {
    const loop = foresee(parts, [
      { id: 'j1', a: 'post', b: 'arm', at: [0.05, 1, 0], shear: 1000, bending: 3 },
      { id: 'j2', a: 'post', b: 'arm', at: [0.05, 1.1, 0], shear: 1000, bending: 3 },
    ]);
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
