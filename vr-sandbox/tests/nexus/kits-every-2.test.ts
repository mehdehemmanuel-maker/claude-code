// Every kit made at three seeds, shard 2 of 3: the one sweep that proves the kit makers hold up over their whole
// space rather than on the examples someone had in mind. Which kits this shard takes, and why the sweep is dealt over
// files at all, is in tests/nexus/sweep.ts.

import { describe, expect, it } from 'vitest';
import { countParts, makeKit, massOf, type Part } from '../../src/nexus/parts/kits';
import { INVENTORY } from '../../src/nexus/parts/inventory';
import { shard, timed } from './sweep';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('what the kits make (2 of 3)', () => {
  it('makes every kit of this shard, its parts made of materials the inventory knows, with mass', () => {
    const known = new Set([...INVENTORY.values()].filter((i) => i.kind === 'material').map((i) => i.id));
    for (const k of shard(1, 3)) timed(k.id, () => { for (const seed of [1, 2, 3]) {
      const { part } = makeKit(k, '', seed); expect(countParts(part), k.id).toBeGreaterThan(1);
      if (!['galaxy', 'solar system'].includes(k.id)) expect(massOf(part), k.id).toBeGreaterThan(0);
      for (const p of all(part)) if (p.mat && /^(steel|al-|copper|wood|glass|brick|concrete|granite|rubber|abs|pp|pc|pmma|nylon|cotton|cast-iron)/.test(p.mat)) expect(known.has(p.mat), `${k.id}: ${p.name} of ${p.mat}`).toBe(true);
    } });
  }, 180_000); // (the car park alone is 22 s of it: slow under load, not stuck)
});
