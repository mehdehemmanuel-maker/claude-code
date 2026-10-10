import { describe, expect, it } from 'vitest';
import { breakdown, judge, sayBreakdown } from '../../src/nexus/parts/breakdown';
import { catalogue } from '../../src/nexus/parts/catalogue';
import { INVENTORY, resolve, type Item } from '../../src/nexus/parts/inventory';

const thing = (o: Partial<Item>): Item => ({ id: 'x', name: 'x', path: ['x'], kind: 'product', make: 'assemble', of: [], says: '', ...o }) as Item;
const find = (id: string) => INVENTORY.get(id);

describe('the breakdown queue', () => {
  it('takes every item stored off the queue and finds each thing in it in the table', () => {
    const first = breakdown();
    expect(first.taken).toBe(INVENTORY.size);
    expect(first.waiting.filter((w) => w.why === 'not in the table')).toEqual([]);
    // (a stepper stored now is queued: it, its bearing and its tie screws made to its sizes, broken down to their steel;
    // a size nothing in the inventory seeds, the Ender-3's 34 and 40 mm being stored already)
    expect(typeof resolve('stepper nema17 48')).toBe('object');
    const next = breakdown(); expect(next.taken).toBeGreaterThanOrEqual(1);
    expect(next.waiting.filter((w) => w.in === 'stepper-nema17-48')).toEqual([]);
    expect(INVENTORY.has('stepper-nema17-48') && INVENTORY.has('bearing-625zz')).toBe(true);
    expect(breakdown().taken).toBe(0); // nothing new stored, nothing to take
    expect(sayBreakdown(first)).toMatch(/^# Breakdown queue/);
  });
  it('judges what waits and why: joined of only materials, several materials shaped as one, nothing in it; and what is whole', () => {
    expect(judge(thing({ make: 'assemble', of: [{ id: 'steel-low', n: 1 }, { id: 'pvc', n: 1 }] }), find)).toBe('only its materials listed');
    expect(judge(thing({ make: 'mould', of: [{ id: 'nylon', n: 1 }, { id: 'phosphor-bronze', n: 1 }, { id: 'tin', n: 1 }] }), find)).toBe('several materials in one shaping');
    expect(judge(thing({ of: [] }), find)).toBe('nothing in it listed');
    expect(judge(thing({ make: 'roll-thread', of: [{ id: 'steel-alloy', n: 1 }, { id: 'zinc', n: 1 }] }), find)).toBeNull(); // a screw, zinc-plated: one piece
    expect(judge(thing({ make: 'assemble', of: [{ id: 'bearing-ring', n: 2 }, { id: 'steel-chrome', n: 1 }] }), find)).toBeNull(); // has parts
    expect(judge(thing({ kind: 'part', make: 'weld', of: [{ id: 'steel-low', n: 1 }] }), find)).toBeNull(); // a tube welded along its seam
  });
  it('breaks down every size the catalogue sells: nothing waits but what CLAUDE.md names as waiting', () => {
    // (the round's step: `npm run breakdown` leaves only these; a new part listed as bare materials fails here)
    for (const l of catalogue()) resolve(l);
    const b = breakdown(), waits = [...new Set(b.waiting.map((w) => w.in))].sort();
    expect(b.taken).toBeGreaterThan(1000);
    expect(waits.filter((w) => w !== 'joint-drive')).toEqual([]);
  }, 120_000);
});
