// Every kit made, at three seeds each: the one sweep that proves the kit makers hold up over their whole space rather
// than on the examples someone had in mind. It is a file of its own because it is the longest test in the gate (about
// a minute: the car alone is some 900 parts, and three seeds of every kit is thousands), and vitest runs files in
// parallel but a file's own tests one after another — so on its own it overlaps the other long sweep
// (tests/nexus/make-every.test.ts) instead of queueing behind it.

import { describe, expect, it } from 'vitest';
import { countParts, KITS, makeKit, massOf, type Part } from '../../src/nexus/parts/kits';
import { INVENTORY } from '../../src/nexus/parts/inventory';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('what the kits make', () => {
  it('makes every kit, its parts made of materials the inventory knows, with mass', () => {
    const known = new Set([...INVENTORY.values()].filter((i) => i.kind === 'material').map((i) => i.id));
    for (const k of KITS) for (const seed of [1, 2, 3]) {
      const { part } = makeKit(k, '', seed); expect(countParts(part), k.id).toBeGreaterThan(1);
      if (!['galaxy', 'solar system'].includes(k.id)) expect(massOf(part), k.id).toBeGreaterThan(0);
      for (const p of all(part)) if (p.mat && /^(steel|al-|copper|wood|glass|brick|concrete|granite|rubber|abs|pp|pc|pmma|nylon|cotton|cast-iron)/.test(p.mat)) expect(known.has(p.mat), `${k.id}: ${p.name} of ${p.mat}`).toBe(true);
    }
  }, 180_000); // (every kit at three seeds: the car alone is some 900 parts now; slow under load, not stuck)
});
