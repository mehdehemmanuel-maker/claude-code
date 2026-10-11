// Every kit made at three seeds, shard 1 of 3: the one sweep that proves the kit makers hold up over their whole
// space rather than on the examples someone had in mind. Which kits this shard takes, and why the sweep is dealt over
// files at all, is in tests/nexus/sweep.ts.

import { describe, expect, it } from 'vitest';
import { countParts, KITS, makeKit, massOf, type Part } from '../../src/nexus/parts/kits';
import { INVENTORY } from '../../src/nexus/parts/inventory';
import { shard, timed } from './sweep';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('what the kits make (1 of 3)', () => {
  it('makes every kit of this shard, its parts made of materials the inventory knows, with mass', () => {
    const known = new Set([...INVENTORY.values()].filter((i) => i.kind === 'material').map((i) => i.id));
    for (const k of shard(0, 3)) timed(k.id, () => { for (const seed of [1, 2, 3]) {
      const { part } = makeKit(k, '', seed); expect(countParts(part), k.id).toBeGreaterThan(1);
      if (!['galaxy', 'solar system'].includes(k.id)) expect(massOf(part), k.id).toBeGreaterThan(0);
      for (const p of all(part)) if (p.mat && /^(steel|al-|copper|wood|glass|brick|concrete|granite|rubber|abs|pp|pc|pmma|nylon|cotton|cast-iron)/.test(p.mat)) expect(known.has(p.mat), `${k.id}: ${p.name} of ${p.mat}`).toBe(true);
    } });
  }, 180_000); // (the car park alone is 22 s of it: slow under load, not stuck)

  // the shards must be the whole catalogue and no kit twice: a kit that fell out of every shard would stop being swept
  // without anything failing, which is the one way a sweep dealt over files can quietly stop proving what it is for
  it('deals every kit to exactly one shard', () => {
    const dealt = [0, 1, 2].flatMap((i) => shard(i, 3).map((k) => k.id));
    expect(dealt.slice().sort()).toEqual(KITS.map((k) => k.id).sort());
    expect(new Set(dealt).size).toBe(KITS.length);
  });
});
