// Kits: makers of things whose kinds multiply, every part made of a material the inventory knows, every edge as it is
// made. The count of what there is is the product of every choice, times every kit used to the times it is used (a
// street's eight houses each any house): well past a trillion. The words pick the choices they name; the rest are drawn.
// Real sizes come out as their sources give them (a queen mattress 152 by 203 cm, a 225/45R18 tyre 659 mm across, a tree's
// trunk as thick as H^1.5 asks, a sandwich's energy from what is in it).

import { describe, expect, it } from 'vitest';
import { countParts, KITS, makeKit, massOf, type Part } from '../../src/nexus/kits';
import { edgeRadius, ruleFor, setEdge, EDGE_RULES } from '../../src/nexus/finish';
import { INVENTORY } from '../../src/nexus/inventory';

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
describe('edges as things are made', () => {
  it('rounds every edge by how its material is made, never past a third of its thinnest side', () => {
    expect(edgeRadius('steel-low', 0.01)).toBeCloseTo(0.0005, 6); expect(edgeRadius('concrete', 0.3)).toBeCloseTo(0.02, 6); expect(edgeRadius('wood', 0.02)).toBeCloseTo(0.002, 6);
    expect(edgeRadius('abs', 0.002)).toBeCloseTo(0.003 > 0.002 / 3 ? 0.002 / 3 : 0.003, 6); expect(edgeRadius('foam', 0.2)).toBeCloseTo(0.05, 6); expect(edgeRadius('concrete', 0.03)).toBeCloseTo(0.01, 6);
    expect(ruleFor('mystery').id).toBe('anything else'); for (const r of EDGE_RULES) expect(r.source.length, r.id).toBeGreaterThan(5);
    expect(setEdge('edges wood 4 mm')).toMatch(/4 mm/); expect(edgeRadius('wood', 0.05)).toBeCloseTo(0.004, 6); setEdge('edges wood 2 mm');
  });
});
