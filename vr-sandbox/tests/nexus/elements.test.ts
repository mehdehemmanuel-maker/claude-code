// The fundamentals: every material made of the elements, by mass, exactly from its formula or by its grade's nominal
// composition; and every part's tree, followed down, ending in the same elements.

import { describe, expect, it } from 'vitest';
import { ELEMENTS, MATERIALS, elementsOf, formula, makeup } from '../../src/nexus/elements';
import { INVENTORY, boardOfTree, fundamentals, treeLines } from '../../src/nexus/inventory';

describe('the elements, and what is made of them', () => {
  it('a formula by mass, from the standard atomic weights: PLA, alumina, PTFE', () => {
    const pla = formula('C3H4O2'); expect(pla.C).toBeCloseTo(50.0, 1); expect(pla.H).toBeCloseTo(5.6, 1); expect(pla.O).toBeCloseTo(44.4, 1);
    expect(formula('Al2O3').Al).toBeCloseTo(52.93, 1); expect(formula('C2F4').F).toBeCloseTo(75.98, 1);
    expect(() => formula('Xx2')).toThrow(/no element Xx/);
  });
  it('every material of the inventory comes down to elements adding to 100 %; alloys by their grades, blends by what they are of', () => {
    for (const i of INVENTORY.values()) if (i.kind === 'material') {
      expect(MATERIALS[i.id], `${i.id} has a make-up`).toBeTruthy();
      const els = elementsOf(i.id), sum = Object.values(els).reduce((a, b) => a + b, 0);
      expect(sum, i.id).toBeGreaterThan(99.5); expect(sum, i.id).toBeLessThan(100.5);
      for (const el of Object.keys(els)) expect(ELEMENTS[el], `${i.id}: ${el}`).toBeTruthy();
    }
    expect(elementsOf('stainless-304')).toMatchObject({ Cr: 18.5, Ni: 9 }); expect(elementsOf('stainless-304').Fe).toBeCloseTo(70.45, 2);
    expect(makeup('fr4').map(([x]) => x)).toEqual(['fibreglass', 'epoxy']);
    for (const e of Object.values(ELEMENTS)) expect(e.from.length).toBeGreaterThan(5);
  });
  it('every part of the inventory ends in the same fundamentals: its tree and board go down to them, one node an element', () => {
    const els = new Set(Object.keys(ELEMENTS).map((s) => `el-${s.toLowerCase()}`));
    for (const i of INVENTORY.values()) { if (i.kind === 'element') continue; const f = fundamentals(i.id); expect(f.length, i.id).toBeGreaterThan(0); for (const e of f) expect(els.has(e.id)).toBe(true); }
    const bike = fundamentals('bicycle'); expect(bike.find((e) => e.id === 'el-fe')!.via.length).toBeGreaterThan(3);
    expect(treeLines('screw-m3').join('\n')).toMatch(/= iron 9\d\.\d %/);
    const b = boardOfTree('skateboard')!; expect(Object.keys(b.nodes).some((k) => k === 'fund/el-al')).toBe(true);
  });
});
