// Part XXIV 5: laws as terms. Every law's example reproduces from its term; the derived laws reduce to the book's
// cases at their limits; a law inverts from the same term; every hash is content.

import { describe, expect, it } from 'vitest';
import { BOOK, PATCH_MOMENT, PATCH_SAG, RECT_I, SELF_MOMENT, SELF_SAG, WEIGHT } from '../../src/nexus/book';
import { ofLeaf, type Derivation } from '../../src/nexus/evaluate';
import { apply, invert, law } from '../../src/nexus/law';
import { LAWS } from '../../src/ganglia/laws';
import { leaf, mul, variable } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));
const env = (l: { inputs: readonly { sym: string; unit: string; name: string }[] }, values: Record<string, number>): Record<string, Derivation> =>
  Object.fromEntries(l.inputs.map((p) => [p.sym, given(p.name, values[p.sym]!, p.unit)]));

describe('the book as terms', () => {
  for (const l of BOOK) {
    it(`${l.id} reproduces its example (${l.example?.from})`, () => {
      const d = apply(l, env(l, l.example!.inputs));
      expect(d.status).not.toBe('outside-validity');
      expect(d.value).not.toBeNull();
      const rel = l.example!.rel ?? 1e-9;
      expect(Math.abs(d.value! - l.example!.output)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(l.example!.output)));
    });
  }

  it('the examples taken from the kept law data are that data\'s own', () => {
    const kept = Object.fromEntries(LAWS.map((l) => [l.id, l]));
    expect(apply(WEIGHT, env(WEIGHT, kept['weight']!.example.inputs)).value).toBeCloseTo(kept['weight']!.example.output, 9);
    const point = kept['beam.simply-supported.point']!.example;
    expect(apply(PATCH_SAG, env(PATCH_SAG, { ...point.inputs, w: 0, h: 0.04 })).value).toBeCloseTo(point.output, 12);
    const udl = kept['beam.simply-supported.udl']!.example;
    expect(apply(SELF_SAG, env(SELF_SAG, { q: udl.inputs['w']!, L: udl.inputs['L']!, Lt: udl.inputs['L']!, E: udl.inputs['E']!, I: udl.inputs['I']!, h: 0.04 })).value).toBeCloseTo(udl.output, 12);
    // a patch the whole span wide is the spread load
    expect(apply(PATCH_SAG, env(PATCH_SAG, { P: udl.inputs['w']! * udl.inputs['L']!, L: udl.inputs['L']!, w: udl.inputs['L']!, E: udl.inputs['E']!, I: udl.inputs['I']!, h: 0.04 })).value).toBeCloseTo(udl.output, 12);
  });

  it('the patch moment reduces to P L / 4 at a point and w L / 8 over the span, and falls off linearly outside the patch', () => {
    const at = (w: number, a: number) => apply(PATCH_MOMENT, env(PATCH_MOMENT, { P: 1000, L: 2, w, a })).value!;
    expect(at(1e-6, 0)).toBeCloseTo(500, 3);
    expect(at(2, 0)).toBeCloseTo(250, 9);
    expect(at(0.1, 0)).toBeCloseTo(500 - 1000 * 0.1 / 8, 9);
    expect(at(0.1, 0.5)).toBeCloseTo(500 * 0.5, 9);
    expect(at(0.1, 0.05)).toBeCloseTo(500 * 0.95, 9);
    expect(apply(PATCH_MOMENT, env(PATCH_MOMENT, { P: 1000, L: 2, w: 0.1, a: 1.5 })).status).toBe('outside-validity');
  });

  it('the self-weight moment with overhangs: the overhang relieves mid-span', () => {
    const noOverhang = apply(SELF_MOMENT, env(SELF_MOMENT, { q: 100, L: 2, Lt: 2, a: 0 })).value!;
    const overhang = apply(SELF_MOMENT, env(SELF_MOMENT, { q: 100, L: 2, Lt: 2.4, a: 0 })).value!;
    expect(noOverhang).toBeCloseTo(50, 9);
    expect(overhang).toBeCloseTo((100 * 2.4 / 2) * 1 - (100 * 1.2 ** 2) / 2, 9);
    expect(overhang).toBeLessThan(noOverhang);
  });

  it('a law inverts from the same term: the depth that gives a second moment', () => {
    const I = apply(RECT_I, env(RECT_I, { b: 0.02, h: 0.04 })).value!;
    const h = invert(RECT_I, 'h', I, { b: given('b', 0.02, 'm') }, [1e-4, 1], (n, v, u) => given(n, v, u));
    expect(h).toBeCloseTo(0.04, 9);
    expect(invert(RECT_I, 'h', -1, { b: given('b', 0.02, 'm') }, [1e-4, 1], (n, v, u) => given(n, v, u))).toBeNull();
  });

  it('a law is its content: the same term, domain, statement and source hash alike, a changed term does not', () => {
    const m = variable('m', 'kg', 'mass'), g = variable('g', 'm/s^2', 'gravity');
    const again = law({ ...WEIGHT, term: mul(g, m) });
    expect(again.hash).toBe(WEIGHT.hash);
    const other = law({ ...WEIGHT, term: mul(m, mul(g, variable('k', '1'))), inputs: [...WEIGHT.inputs, { sym: 'k', unit: '1', name: 'k' }] });
    expect(other.hash).not.toBe(WEIGHT.hash);
    expect(() => law({ ...WEIGHT, output: { sym: 'W', unit: 'kg', name: 'weight' } })).toThrow(/dimension|kg/);
  });

  it('counts what of the kept book is a term', () => {
    const asTerms = new Set(BOOK.map((l) => l.id));
    const keptIds = LAWS.map((l) => l.id);
    const covered = keptIds.filter((id) => asTerms.has(id));
    expect(covered.sort()).toEqual(['sound.speed', 'stress.bending', 'weight']);
    expect(LAWS.length).toBe(144);
  });
});
