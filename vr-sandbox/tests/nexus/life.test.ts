// Life built from its parts: the human body down to molecules and elements, checked against what is measured: its
// organ masses (ICRP 89), its cell counts (Sender et al. 2016, Azevedo et al. 2009, Buenzli & Sims 2015), its
// elements (ICRP 23's Reference Man) and its tissues' elements (ICRU Report 46); bacteria, viruses and the rest by the
// numbers their sources give.

import { describe, expect, it } from 'vitest';
import { INVENTORY, fundamentals, massMakeup, resolve, routeOf, treeLines } from '../../src/nexus/inventory';
import { LIFE, LIFE_FAULTS, MOLECULES, daltonsOf } from '../../src/nexus/life';

const g = (id: string) => INVENTORY.get(id)!.g!;
const near = (x: number, want: number, rel: number) => { expect(x).toBeGreaterThan(want * (1 - rel)); expect(x).toBeLessThan(want * (1 + rel)); };

describe('life, settled', () => {
  it('every mass adds up: no part heavier than what holds it, every part known, nothing inside itself', () => {
    expect(LIFE_FAULTS).toEqual([]);
    expect(LIFE.length).toBeGreaterThan(600); expect(MOLECULES.length).toBeGreaterThan(200);
    for (const e of LIFE) { expect(e.g, e.id).toBeGreaterThan(0); for (const c of e.of) expect(INVENTORY.has(c.id), `${e.id} has ${c.id}`).toBe(true); }
    expect(routeOf(INVENTORY.get('human')!).why).toMatch(/^grown/);
  });
  it('molecules weigh their formulas: haemoglobin about 64.5 kDa, insulin 5,808 Da, a base pair 618 Da', () => {
    const da = (id: string) => daltonsOf(MOLECULES.find((m) => m.id === id)!)!;
    near(da('haemoglobin'), 64500, 0.02); near(da('insulin'), 5808, 0.005); near(da('dna') / 2, 618, 0.01); near(da('glucose'), 180.16, 0.001); near(da('atp'), 507.18, 0.001);
    expect(INVENTORY.get('thyroxine')!.makeup!.find((m) => m.id === 'el-i')!.pct).toBeCloseTo(65.4, 0);
  });
});

describe('the human body', () => {
  it('weighs its systems as ICRP 89 has them, and adds to its 73 kg', () => {
    for (const [id, want] of [['muscles', 29000], ['adipose', 14500], ['skeleton', 10500], ['skin', 3300], ['blood', 5600], ['brain', 1450], ['liver', 1800], ['heart', 330]] as const) near(g(id), want, 0.012);
    near(g('human'), 73000, 0.02); // its 18.2 kg of adipose tissue counts the yellow marrow too: counted once, the parts add to 73 kg
  });
      it('comes down to the elements a body is made of (ICRP 23 Reference Man), tissue by tissue as ICRU 46 measures them', () => {
    const body = massMakeup('human')!, pct = (m: Record<string, number>, el: string) => 100 * (m[el] ?? 0);
    // ICRP 23: O 61, C 23, H 10, N 2.6, Ca 1.4, P 1.1 % (a leaner man: ICRP 89's has more fat, so more carbon)
    near(pct(body, 'O'), 61, 0.1); near(pct(body, 'C'), 23, 0.2); near(pct(body, 'H'), 10, 0.05); near(pct(body, 'N'), 2.6, 0.15); near(pct(body, 'Ca'), 1.4, 0.25); near(pct(body, 'P'), 1.1, 0.25);
    expect(pct(body, 'Fe')).toBeGreaterThan(0.003); expect(pct(body, 'I')).toBeGreaterThan(0);
    const icru: [string, Record<string, number>][] = [
      ['skeletal-muscle-tissue', { H: 10.2, C: 14.3, N: 3.4, O: 71.0 }], ['adipose-tissue', { H: 11.4, C: 59.8, N: 0.7, O: 27.8 }], ['cortical-bone', { H: 3.4, C: 15.5, N: 4.2, O: 43.5, P: 10.3, Ca: 22.5 }],
      ['blood', { H: 10.2, C: 11.0, N: 3.3, O: 74.5 }], ['brain', { H: 10.7, C: 14.5, N: 2.2, O: 71.2 }], ['dermis-tissue', { H: 10.0, C: 20.4, N: 4.2, O: 64.5 }], ['liver-tissue', { H: 10.2, C: 13.9, N: 3.0, O: 71.6 }], ['lung-tissue', { H: 10.3, C: 10.5, N: 3.1, O: 74.9 }],
    ];
    for (const [id, want] of icru) { const m = massMakeup(id)!; for (const [el, w] of Object.entries(want)) expect(Math.abs(pct(m, el) - w), `${id} ${el}: ${pct(m, el).toFixed(1)} against ${w}`).toBeLessThan(el === 'H' || el === 'N' ? 1.2 : 3.5); }
  });
    it('reads as a tree from the body to its elements, and comes down to them by fundamentals', () => {
    const t = treeLines('human', 40).join('\n');
    expect(t).toMatch(/human body — grown/); expect(t).toMatch(/million × nucleosome/); expect(t).toMatch(/= carbon/);
    const els = fundamentals('human').map((f) => f.id); for (const e of ['el-c', 'el-o', 'el-h', 'el-n', 'el-ca', 'el-p', 'el-fe', 'el-i', 'el-k', 'el-na']) expect(els).toContain(e);
    expect(resolve('human')).toMatchObject({ id: 'human' }); expect(resolve('red blood cell')).toMatchObject({ id: 'red-blood-cell' });
  });
});

