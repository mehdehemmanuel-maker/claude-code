// A design is makeable only if no part is placed where another is (M-4: two solids cannot share space; A-5: every
// structure makeable). Held for every creature the builders make: found when a walker's rubber feet were set 6 mm
// into the ends of its shanks and its servo cases nowhere near the joints they drove, and the renderer drew servos
// that were not there; a blind viewer called it blocks passing through each other, and it was.

import { describe, expect, it } from 'vitest';
import { buildSwimmer, buildWalker, SWIMMERS, WALKERS } from '../../src/world/creature';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { effectiveParams, getPartKind } from '../../src/parts/registry';
import { separation, type Solid } from '../../src/doc/overlap';
import { getMaterial } from '../../src/data/materials';

function overlaps(store: DocStore, ids: string[]): string[] {
  const solids = ids.map((id) => { const p = store.doc.parts[id]!; const k = getPartKind(p.kind)!; return { name: p.name, pose: p.pose, solid: k.collision(effectiveParams(k, p.params, getMaterial(p.material))) as Solid }; });
  const out: string[] = [];
  for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++) {
    const a = solids[i]!, b = solids[j]!;
    const sep = separation(a.pose, a.solid, b.pose, b.solid);
    if (sep < -1e-6) out.push(`${a.name} and ${b.name} overlap by ${(-sep * 1000).toFixed(2)} mm`);
  }
  return out;
}

describe('every creature is placed as it could be made: no part where another is', () => {
  for (const [name, plan] of Object.entries(WALKERS)) {
    it(`the ${name} walker, at every heading`, () => {
      for (const heading of [0, 1.1, -2.4]) {
        const store = new DocStore(newDoc('m'));
        const w = buildWalker(store, plan, [0.3, 0, -0.2], heading);
        expect(overlaps(store, w.parts)).toEqual([]);
      }
    });
  }
  for (const [name, plan] of Object.entries(SWIMMERS)) {
    it(`the ${name} swimmer`, () => {
      const store = new DocStore(newDoc('m'));
      const w = buildSwimmer(store, plan, [0, 0.5, 0], 0.4);
      expect(overlaps(store, w.parts)).toEqual([]);
    });
  }
});
