import { describe, expect, it } from 'vitest';
import { use } from '../../src/nexus/parts/components';
import { STANDARD, assemble, fit, mate } from '../../src/nexus/parts/mate';
import type { Port } from '../../src/nexus/parts/kits';

const sq = (s: number): [number, number][] => [[-s, -s], [s, -s], [s, s], [-s, s]];
const p = (sex: Port['sex'], pattern: [number, number][], thread = 'M6'): Port => ({ name: sex, sex, thread, pattern, at: [0, 0, 0], n: [0, 1, 0], u: [1, 0, 0], t: 0.005 });

describe('parts placed by their mating faces', () => {
  it('mates a pattern with its mirror, turned: holes onto threads, holes onto holes, pins into holes; never like with like', () => {
    expect(fit(p('holes', sq(0.02)), p('threads', sq(0.02)))).toMatchObject({ turn: expect.any(Number) });
    expect(fit(p('holes', sq(0.02)), p('holes', sq(0.02)))).not.toBeTypeOf('string');
    expect(fit(p('pins', sq(0.02)), p('holes', sq(0.02)))).not.toBeTypeOf('string');
    expect(fit(p('threads', sq(0.02)), p('threads', sq(0.02)))).toBeTypeOf('string');
    expect(fit(p('holes', sq(0.02)), p('threads', sq(0.021)))).toBeTypeOf('string'); // a millimetre off is not a fit
    expect(fit(p('holes', sq(0.02)), p('threads', sq(0.02), 'M5'))).toBeTypeOf('string');
    // (a pattern that is not its own mirror fits only its mirror: an L of three holes, and the same L seen from behind)
    const L: [number, number][] = [[0, 0], [0.03, 0], [0, 0.02]], mirrored: [number, number][] = L.map(([x, y]) => [x, -y]);
    expect(fit(p('holes', L), p('threads', mirrored))).not.toBeTypeOf('string');
    expect(fit(p('holes', L), p('threads', L))).toBeTypeOf('string');
    expect(STANDARD['ISO 9409-1-50-4-M6']!.pattern).toHaveLength(4);
  });
  it('sets a NEMA 17 motor plate on its stepper\'s face by its four holes, with four cap screws the length its plies take', () => {
    const a = assemble('motor on its plate', [use('stepper nema17 40'), use('motorplate nema17 t4 aluminium')]);
    expect(a.unplaced).toEqual([]); expect(a.mates[0]).toMatch(/4 × M3 × 8 cap screws/);
    const [, plate, ...screws] = a.part.parts!;
    expect(plate!.at![1]).toBeCloseTo(0, 6); expect(screws).toHaveLength(4);
    for (const s of screws) expect(s.at![1]).toBeCloseTo(0.004, 6); // each head on the plate's top, 4 mm up
    expect(screws.map((s) => Math.hypot(s.at![0], s.at![2])).every((r) => Math.abs(r - 0.0155 * Math.SQRT2) < 1e-6)).toBe(true);
  });
  it('places nothing that does not fit, and says why', () => {
    const a = assemble('wrong plate', [use('stepper nema17 40'), use('motorplate nema23 t6 steel')]);
    expect(a.unplaced[0]).toMatch(/mates nothing/);
    expect(mate(use('stepper nema17 40'), 'front face', use('motorplate nema23 t6 steel'), 'motor face')).toMatch(/M3 is not M5/);
  });
});
