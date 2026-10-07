// What an item gives: its bill flat, its mass, where it is used, an OpenSCAD model the room builds, it beside another,
// the entries words find, and its type.

import { describe, expect, it } from 'vitest';
import { bomCsv, compare, flatBom, massOf, scadOf, search, typeOf, types, usedIn } from '../../src/nexus/outputs';
import { INVENTORY, resolve, type Item } from '../../src/nexus/inventory';
import { scadToSteps } from '../../src/nexus/languages';

describe('outputs', () => {
  it('a flat bill of materials, added up across the tree, and as CSV', () => {
    const q = flatBom('quadcopter'); expect(q.buy.length).toBeGreaterThan(10); expect(q.buy.find((r) => r.id === 'magnet-ndfeb')!.n).toBeGreaterThanOrEqual(56);
    expect(bomCsv('skateboard').split('\n')[0]).toBe('id,name,quantity,how');
  });
  it('mass added up where it is known; where a part is used', () => {
    expect(massOf('nema17').g).toBe(280); expect(massOf('skateboard').known).toBeGreaterThan(0);
    expect(usedIn('bearing-608').products.map((i) => i.id)).toContain('alternator');
  });
  it('an OpenSCAD model at its sizes, which the room\'s reader builds', () => {
    for (const w of ['screw M4x20', 'bolt M8x30', 'bearing 6201', 'gear m1 z12 b5', 'ibeam IPE100 1m', 'spring d1 D10 L30 n8']) { const sc = scadOf(resolve(w) as Item); expect(scadToSteps(sc).steps.length, w).toBeGreaterThan(0); }
    expect(scadOf(resolve('ibeam IPE100 1m') as Item)).toMatch(/cube\(\[55, 1000, 5\.7\]\)/);
  });
  it('words find entries, and each entry has a type by what it does', () => {
    expect(search('brushless motor')[0]!.id).toBe('bldc-outrunner');
    expect(typeOf(INVENTORY.get('drill-cordless')!)).toBe('tool'); expect(typeOf(INVENTORY.get('bicycle')!)).toBe('vehicle'); expect(typeOf(INVENTORY.get('el-fe')!)).toBe('element');
    expect(types().size).toBeGreaterThan(12);
    expect(compare(INVENTORY.get('drill-cordless')!, INVENTORY.get('desk-fan')!)[0]).toMatch(/^kind: cordless drill/);
  });
});
