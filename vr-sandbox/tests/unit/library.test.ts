import { describe, expect, it } from 'vitest';
import { BuildLibrary } from '../../src/app/library';

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe('My builds', () => {
  it('starts empty: nothing pre-made', () => {
    expect(new BuildLibrary(memory()).list()).toEqual([]);
  });

  it('saves new builds as Build 1, Build 2, and over the open one when asked', () => {
    const lib = new BuildLibrary(memory());
    const a = lib.save('A', null, new Date('2026-09-30T10:00:00Z'));
    const b = lib.save('B', null, new Date('2026-09-30T11:00:00Z'));
    expect([a.name, b.name]).toEqual(['Build 1', 'Build 2']);
    lib.save('A2', a.id, new Date('2026-09-30T12:00:00Z'));
    expect(lib.list().map((e) => [e.name, e.text])).toEqual([['Build 1', 'A2'], ['Build 2', 'B']]); // newest first
  });

  it('keeps builds across a reload, and forgets a deleted one', () => {
    const store = memory();
    const lib = new BuildLibrary(store);
    const a = lib.save('A');
    lib.save('B');
    lib.remove(a.id);
    const again = new BuildLibrary(store);
    expect(again.list().map((e) => e.text)).toEqual(['B']);
    // the next new name never repeats one still in use
    expect(again.save('C').name).toBe('Build 3');
  });

  it('survives corrupt storage and a browser that keeps none', () => {
    const bad = { getItem: () => '{not json', setItem: () => {} };
    expect(new BuildLibrary(bad).list()).toEqual([]);
    const none = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    const lib = new BuildLibrary(none);
    lib.save('A');
    expect(lib.persistent).toBe(false);
    expect(lib.list().length).toBe(1);
  });
});
