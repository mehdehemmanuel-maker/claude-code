// The size a standard designation denotes. These are not measurements to check against a datasheet; they are
// DEFINITIONS, so the test is that the rule reads the standard correctly and refuses anything it cannot complete.
import { describe, expect, it } from 'vitest';
import { denotedSize } from '../../src/nexus/parts/designation';
import { INVENTORY, sizeOf } from '../../src/nexus/parts/inventory';
import { METRIC } from '../../src/nexus/parts/threads';

describe('a cylindrical cell code is its size, by IEC 60086', () => {
  it('reads the first two digits as the diameter and the rest as tenths of a millimetre', () => {
    const cells = 'Electrical/Power/Cells';
    // 18650: 18 mm across, 650 tenths = 65.0 mm long. The code MEANS this.
    expect(denotedSize('cell-18650', 'lithium-ion cell 18650', cells)!.mm).toEqual([18, 18, 65]);
    // the same rule on a four-digit code: CR2032 is 20 mm across and 32 tenths = 3.2 mm thick
    expect(denotedSize('cell-cr2032', 'lithium coin cell CR2032', cells)!.mm).toEqual([20, 20, 3.2]);
    // and on the other common cylindricals
    expect(denotedSize('x', 'cell 21700', cells)!.mm).toEqual([21, 21, 70]);
    expect(denotedSize('x', 'cell 14500', cells)!.mm).toEqual([14, 14, 50]);
  });

  it('and never fires where the digits are not a cell code', () => {
    // 6061 is an aluminium alloy, not a 60 mm cell 6.1 mm tall. The guard is the item's OWN path, not a judgement
    // made here: the rule applies where the inventory already says the thing is a cell.
    expect(denotedSize('al-6061', '6061-T6 aluminium', 'Materials/Metals/Aluminium')).toBeNull();
    expect(denotedSize('fr4', 'FR4 1.6 mm', 'Materials/Composites')).toBeNull();
    // and an out-of-range code is refused rather than producing a nonsense size
    expect(denotedSize('x', 'cell 99999', 'Electrical/Power/Cells')).toBeNull();
  });
});

describe('a metric screw is its size, by ISO 4762', () => {
  it('takes the head from the thread table and the shank from the designation', () => {
    const d = denotedSize('screw-m3', 'M3 × 10 socket head cap screw', 'Mechanical/Fasteners')!;
    // M3 head is 5.5 mm across and 3 mm high in ISO 4762, over a 10 mm shank
    expect(METRIC['M3']!.dk).toBe(5.5);
    expect(d.mm).toEqual([5.5, 5.5, 10 + METRIC['M3']!.k]);
    const m6 = denotedSize('screw-m6', 'M6 × 16 socket head cap screw', 'Mechanical/Fasteners')!;
    expect(m6.mm).toEqual([METRIC['M6']!.dk, METRIC['M6']!.dk, 16 + METRIC['M6']!.k]);
  });

  it('refuses a designation with no length, because that is not a complete one', () => {
    // "M2 pan head screw" fixes the thread and says nothing about the shank. Two of three is refused, not guessed.
    expect(denotedSize('screw-m2', 'M2 pan head screw', 'Mechanical/Fasteners')).toBeNull();
    // and a thread the table does not hold
    expect(denotedSize('x', 'M99 × 10 screw', 'Mechanical/Fasteners')).toBeNull();
  });
});

describe('figures the name states outright', () => {
  it('reads a ring as its outside across twice by its width', () => {
    // ISO 15 gives a 608 bearing as 8 bore / 22 outside / 7 wide, and the name says so. The box it fills is the
    // OUTSIDE twice by the width — reading it as 8 × 22 × 7 would make the box smaller than the part.
    const d = denotedSize('bearing-608', 'ball bearing 608 (8 × 22 × 7)', 'Mechanical/Bearings')!;
    expect(d.mm).toEqual([22, 22, 7]);
    expect(d.how).toMatch(/read as a ring/);
  });

  it('and a plain box as stated', () => {
    const d = denotedSize('x', 'a block (10 × 8 × 3)', 'Whatever')!;
    expect(d.mm).toEqual([10, 8, 3]);
    expect(d.how).not.toMatch(/ring/);
  });

  it('refuses what states no three figures', () => {
    expect(denotedSize('x', 'a thing', 'Whatever')).toBeNull();
    expect(denotedSize('x', 'a thing (10 × 8)', 'Whatever')).toBeNull();
  });
});

describe('and the inventory uses it ahead of the drawing', () => {
  it('a designation outranks a typical size, because one is a definition and the other an estimate', () => {
    const i = INVENTORY.get('cell-18650')!;
    const s = sizeOf('cell-18650', i)!;
    expect(s.typical, 'a definition is not an estimate').toBe(false);
    expect(s.how).toMatch(/IEC 60086/);
    expect(s.mm).toEqual([18, 18, 65]);
  });

  it('and every non-material item now has a geometry, or is one of the seven that is named', () => {
    let without = 0;
    for (const [id, i] of INVENTORY) {
      if (i.kind === 'material' || i.kind === 'element') continue;
      if (!sizeOf(id, i)) without++;
    }
    // 1,949 non-material rows: 1,261 state a size, 6 are denoted by a designation, 675 take a typical size from
    // looks.ts, and SEVEN have nothing anywhere. Those seven are named in ROUNDS.md rather than invented.
    expect(without).toBe(7);
  });
});
