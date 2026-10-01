import { describe, expect, it } from 'vitest';
import { BuildLibrary, SaveError } from '../../src/app/library';

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

  it('survives corrupt storage, and never says a build is saved when the browser did not keep it', () => {
    const bad = { getItem: () => '{not json', setItem: () => {} };
    expect(new BuildLibrary(bad).list()).toEqual([]);
    // storage full: the save fails out loud and the library is as it was
    const full = { getItem: () => null, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } };
    const lib = new BuildLibrary(full);
    expect(() => lib.save('A')).toThrow(/storage for this app is full/);
    expect(lib.list()).toEqual([]);
    // a browser that silently drops what it's given is caught by reading the save back
    expect(() => new BuildLibrary(bad).save('A')).toThrow(SaveError);
  });

  it('keeps builds compressed: a big build takes a fraction of the space, and older plain saves still open', () => {
    const store = memory();
    const text = Array.from({ length: 400 }, (_, i) => `part p${i} block 0.215 0.065 0.1025 ceramic.clay-brick at ${i * 0.22} 0.03 0`).join('\n');
    new BuildLibrary(store).save(text);
    const raw = store.getItem('vrsb.library')!;
    expect(raw.length).toBeLessThan(text.length / 4);
    expect(new BuildLibrary(store).list()[0]!.text).toBe(text);
    const legacy = memory();
    legacy.setItem('vrsb.library', JSON.stringify([{ id: 'b1', name: 'Build 1', saved: '2026-09-01T00:00:00Z', text: 'OLD' }]));
    expect(new BuildLibrary(legacy).list()[0]!.text).toBe('OLD');
  });
});
