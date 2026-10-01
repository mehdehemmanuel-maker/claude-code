import { describe, expect, it } from 'vitest';
import { KERF, packLengths, packSheets, SHEET, buildSheet, sheetText } from '../../src/assistant/buildsheet';
import { biggerNail, biggerScrew, chooseNail, chooseScrew, COMMON_NAILS, fastenerName, isStockScrew } from '../../src/engineering/fasteners';
import { Bench } from '../../src/app/bench';
import { BuildHost } from '../../src/forge/apphost';
import { run } from '../../src/forge/forge';

describe('build sheet', () => {
  it('cuts lengths from the fewest boards, kerf between cuts, and never a cut longer than the board', () => {
    const cuts = [1.2, 1.2, 1.2, 0.6, 0.6, 0.3].map((length, i) => ({ label: `c${i}`, length }));
    const bins = packLengths(cuts, 2.438);
    // 1.2 + 1.2 + kerf fits 2.438; then 1.2 + 0.6 + 0.6 (+2 kerf), then the 0.3 joins one with room
    expect(bins).toHaveLength(3);
    for (const b of bins) expect(b.reduce((s, c) => s + c.length, 0) + KERF * (b.length - 1)).toBeLessThanOrEqual(2.438 + 1e-9);
    expect(packLengths([{ label: 'too long', length: 5 }], 2.438)).toEqual([]);
  });

  it('lays rectangles out on 8 x 4 sheets, turned to fit', () => {
    const pieces = [{ label: 'a', w: 1.2, h: 0.6 }, { label: 'b', w: 0.6, h: 1.2 }, { label: 'd', w: 2.4, h: 0.3 }];
    const sheets = packSheets(pieces, SHEET);
    // a row of the two 1200 x 600 (one turned), a row of the 2400 x 300: 906 mm of the 1220
    expect(sheets).toHaveLength(1);
    expect(sheets[0]!.map((p) => p.label).sort()).toEqual(['a', 'b', 'd']);
    // a third 1200 x 600 needs a row of its own the sheet hasn't room for
    expect(packSheets([...pieces, { label: 'c', w: 1.2, h: 0.6 }], SHEET)).toHaveLength(2);
    expect(packSheets([{ label: 'huge', w: 3, h: 2 }], SHEET)).toEqual([]);
  });

  it('only buys fasteners that are sold: screws in stocked lengths, common nails by pennyweight', () => {
    expect(isStockScrew(0.004, 0.07)).toBe(true);
    expect(isStockScrew(0.004, 0.074)).toBe(false);
    // through 18 mm into a leg's end: the stocked screw whose bite lands nearest what was wanted
    const s = chooseScrew(0.004, 0.018, 0.7, 0.056, 0.024)!;
    expect(isStockScrew(s.diameter, s.length)).toBe(true);
    expect(s.length - 0.018).toBeGreaterThanOrEqual(0.024);
    // nothing reaches without coming out the far side: no screw (the planner picks another process)
    expect(chooseScrew(0.0035, 0.006, 0.0057, 0.0054, 0.0054)).toBeNull();
    const n = chooseNail(0.038, 0.089, 0.059, 0.033)!;
    expect(COMMON_NAILS.some((c) => Math.abs(c.length / 1000 - n.length) < 1e-9 && Math.abs(c.diameter / 1000 - n.diameter) < 1e-9)).toBe(true);
    expect(fastenerName('nailed', n.diameter, n.length)).toMatch(/^\d+d common nail/);
    // a stronger fix steps to the next stocked size, never to a scaled one
    const up = biggerScrew(0.004, 0.07)!, nail = biggerNail(0.00333, 0.0635)!;
    expect(up.diameter).toBeCloseTo(0.0045, 9);
    expect(up.length).toBeCloseTo(0.07, 9);
    expect(nail.diameter).toBeCloseTo(0.00376, 9);
    expect(nail.length).toBeCloseTo(0.0762, 9);
    expect(fastenerName('screwed', 0.004, 0.074)).toMatch(/not a stock size/);
  });

  it('maps a built design to assemblies, parts, what each is cut from, and the hardware in every joint', () => {
    const bench = new Bench();
    const src = [
      'place plate length=1.2 width=0.6 thickness=0.018 mat wood.douglas-fir at 0 0.75 0 as top',
      'place lumber size=2x2 length=0.741 mat wood.douglas-fir at -0.55 0.3705 -0.25 rot z 90 as leg',
      'join leg top with screwed',
      'place plate length=0.3 width=0.3 thickness=0.01 mat steel.a36 at 2 0.005 0 as base',
      'place block x=0.1 y=0.2 z=0.1 mat steel.a36 at 2 0.11 0 as post',
      'join post base with bolted',
    ].join('\n');
    const r = run(src, new BuildHost(bench));
    expect(r.ok, r.error).toBe(true);
    const sheet = buildSheet(bench.doc, (p) => bench.materialOf(p), undefined, { title: 'Bench test' });
    expect(sheet.assemblies).toHaveLength(2);
    const wood = sheet.assemblies.find((a) => a.parts.some((p) => p.name === 'top'))!;
    const top = wood.parts.find((p) => p.name === 'top')!;
    expect(top.from).toMatch(/glued-up Douglas-fir/);
    expect(top.sub[0]).toMatch(/^5 × 1x6 .* boards/);
    expect(wood.joints[0]!.sub[0]).toMatch(/× \d(\.\d)? × \d+ mm wood screw$/);
    // a 200 mm steel post is too thick to bolt through along its height: a tapped hole in it
    const steel = sheet.assemblies.find((a) => a.parts.some((p) => p.name === 'post'))!;
    const bolt = steel.joints[0]!;
    expect(bolt.sub.join(' | ')).toMatch(/tapped hole in post/);
    expect(bolt.notes.join(' ')).toMatch(/tighten to \d/);
    expect(sheet.cuts.some((c) => /2x2 Douglas-fir/.test(c))).toBe(true);
    expect(sheet.problems).toEqual([]);
    expect(sheetText(sheet)[0]).toMatch(/^BUILD SHEET: Bench test/);
  });
});
