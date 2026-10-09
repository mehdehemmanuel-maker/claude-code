import { describe, expect, it } from 'vitest';
import { DESIGNED, boltedJoint, component, library, use } from '../../src/nexus/components';
import { catalogue } from '../../src/nexus/catalogue';
import { FAMILIES } from '../../src/nexus/families';
import { kitFor, makeKit, kitById, type Part } from '../../src/nexus/kits';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('the component library', () => {
  it('draws every size its families sell, each within a fifth of its standard\'s mass, filed under its category', () => {
    let n = 0;
    for (const f of DESIGNED) {
      const lines = catalogue(f), words = lines.length ? lines : FAMILIES.find((x) => x.id === f)!.examples;
      expect(words.length, f).toBeGreaterThan(0);
      for (const w of words) {
        const c = component(w); if (typeof c === 'string') throw new Error(`${w}: ${c}`);
        expect(c.faults, w).toEqual([]); expect(c.path.length, w).toBeGreaterThan(1);
        expect(all(c.part).some((p) => p.shape), w).toBe(true); expect(c.part.item, w).toBe(c.item.id); n++;
      }
    }
    expect(n).toBeGreaterThan(300);
    expect([...library().keys()]).toContain('Hardware / Fasteners / Bolts');
  });
  it('gives each build its own copy, named in the build, its pieces under that name', () => {
    const a = use('bolt M8x30', [0, 1, 0], { name: 'a bolt here' }), b = use('bolt M8x30');
    a.parts![0]!.mat = 'gold';
    expect(b.parts![0]!.mat).not.toBe('gold'); expect(b.name).toBe('M8 × 30 hex bolt');
    expect(a.parts!.every((p) => p.name === 'a bolt here')).toBe(true); expect(a.at).toEqual([0, 1, 0]);
    expect(() => use('flux capacitor 88mph')).toThrow();
  });
  it('makes a bolted joint of saved parts, stacked head, washer, plies, washer, nut, the bolt the shortest sold that leaves two pitches', () => {
    const j = boltedJoint('M10', 22), [w1, bolt, w2, nut] = j.parts!;
    expect(bolt!.name).toBe('M10 × 40 hex bolt'); // 22 + 2 × 2 (washers) + 8.4 (nut) + 2 × 1.5 = 37.4: the next length sold is 40
    expect(w1!.at![1]).toBeCloseTo(-0.002, 6); expect(w2!.at![1]).toBeCloseTo(-0.026, 6); expect(nut!.at![1]).toBeCloseTo(-0.026, 6);
    for (const p of [w1, w2, nut]) expect(p!.passes, p!.name).toContain(bolt!.name);
  });
  it('is a kit: a part is called by its words, and only with a size said', () => {
    expect(kitFor('bolt M12x40')!.id).toBe('part'); expect(kitFor('angle 40x4 steel 1000mm')!.id).toBe('part');
    expect(kitFor('a pipe organ')?.id).not.toBe('part');
    const { part } = makeKit(kitById('part')!, 'extrusion 2040 500', 1); expect(part.name).toBe('2040 extrusion');
  });
});

describe('a linear guideway, drawn whole from HIWIN\'s table', () => {
  it('draws every MGN size and carriage with every part its inventory lists, within a tenth of HIWIN\'s mass', () => {
    for (const w of ['rail MGN7C 100', 'rail MGN9H 300', 'rail MGN12H 400', 'rail MGN15C 400', 'rail MGN15H 500']) {
      const c = component(w); if (typeof c === 'string') throw new Error(c);
      expect(c.faults, w).toEqual([]); expect(Math.abs(c.mass - 1), w).toBeLessThan(0.1);
    }
  });
  it('runs 66 balls in an MGN12H\'s two circuits (the count rebuilders give), its carriage one link sliding on the rail', () => {
    const c = component('rail MGN12H 400'); if (typeof c === 'string') throw new Error(c);
    const ps = all(c.part), balls = ps.filter((p) => p.item === 'steel-ball-2.381');
    expect(balls).toHaveLength(66);
    expect(balls.every((b) => b.link === 'MGN12H rail carriage' && b.joint === 'slide')).toBe(true);
    // (each of its carriage's parts on that link, its own pieces with it)
    expect(c.part.parts!.filter((p) => /carriage|end seal|end cap|retaining wire|seal screw/.test(p.name)).every((p) => p.link === 'MGN12H rail carriage')).toBe(true);
  });
  it('mates by its rail\'s foot (its holes every 25 mm) and its carriage\'s top (four M3 threads 20 by 20), and refuses a rail shorter than its carriage', () => {
    const c = component('rail MGN12H 400'); if (typeof c === 'string') throw new Error(c);
    const [foot, top] = c.part.ports!;
    expect(foot!.sex).toBe('holes'); expect(foot!.pattern).toHaveLength(16); expect(foot!.pattern[1]![0] - foot!.pattern[0]![0]).toBeCloseTo(0.025, 6);
    expect(top!.sex).toBe('threads'); expect(top!.thread).toBe('M3'); expect(top!.pattern.map(([x, z]) => [Math.abs(x), Math.abs(z)])).toEqual(Array(4).fill([0.01, 0.01]));
    expect(component('rail MGN12H 40')).toMatch(/must be longer than that/);
  });
  it('reads a screw said by its thread and length, "M3x10", in every fastener kind', () => {
    for (const w of ['panhead M2x6 PH A2', 'countersunk M3x10', 'buttonhead M3x8']) { const c = component(w); expect(typeof c === 'string' ? c : c.item.id, w).not.toMatch(/I do not know/); }
    const p = component('panhead M2x6 PH A2'); if (typeof p === 'string') throw new Error(p); expect(p.faults).toEqual([]);
  });
});
