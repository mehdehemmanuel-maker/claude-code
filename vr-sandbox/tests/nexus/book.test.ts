// Part XXIV 5: laws as terms. Every law's example reproduces from its term; the derived laws reduce to the book's
// cases at their limits; a law inverts from the same term; every hash is content.

import { describe, expect, it } from 'vitest';
import { BOOK, CANTILEVER_TIP_SAG, KEPT, PATCH_MOMENT, PATCH_SAG, RECT_I, SELF_MOMENT, SELF_SAG, SLICE, UNIVERSAL as UNIVERSAL_LAWS, WEIGHT, lawById } from '../../src/nexus/book';
import { ofLeaf, type Derivation } from '../../src/nexus/evaluate';
import { apply, invert, law } from '../../src/nexus/law';
import { LAWS } from '../../src/ganglia/laws';
import { parseUnit } from '../../src/ganglia/units';
import { leaf, mul, variable } from '../../src/nexus/term';
import { leavesUnder } from '../../src/nexus/why';
import { carrierById, coupling, family } from '../../src/nexus/carrier';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));
const env = (l: { inputs: readonly { sym: string; unit: string; name: string }[] }, values: Record<string, number>): Record<string, Derivation> =>
  Object.fromEntries(l.inputs.map((p) => [p.sym, given(p.name, values[p.sym]!, p.unit)]));

/** A worked example's output in SI: the kept data writes it in the output port's unit. */
const inSI = (value: number, unit: string) => { const u = parseUnit(unit); return value * u.scale + (u.offset ?? 0); };

describe('the derived laws of the slice', () => {
  for (const l of SLICE) {
    it(`${l.id} reproduces its example (${l.example?.from})`, () => {
      const d = apply(l, env(l, l.example!.inputs));
      expect(d.status).not.toBe('outside-validity');
      expect(d.value).not.toBeNull();
      const rel = l.example!.rel ?? 1e-9;
      expect(Math.abs(d.value! - l.example!.output)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(l.example!.output)));
    });
  }
});

describe('the kept book as terms: every law, by its own example', () => {
  const kept = Object.fromEntries(LAWS.map((l) => [l.id, l]));
  it('holds every kept law once, with the kept ports in the kept order, and nothing twice', () => {
    expect(LAWS.length).toBe(148);
    const ids = Object.values(KEPT).flat().map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(LAWS.map((l) => l.id).sort());
    for (const id of ids) {
      const t = lawById(id), k = kept[id]!;
      expect(t.inputs.map((p) => [p.sym, p.unit]), id).toEqual(k.inputs.map((p) => [p.sym, p.unit]));
      expect([t.output.sym, t.output.unit], id).toEqual([k.output.sym, k.output.unit]);
      expect(t.statement).toBe(k.statement);
      expect(t.source.cite).toBe(k.source.cite);
    }
  });
  for (const k of LAWS) {
    it(`${k.id}: the term reproduces the kept example in SI${k.outside ? ', and the domain is a predicate' : ''}`, () => {
      const t = lawById(k.id);
      const d = apply(t, env(t, k.example.inputs));
      const expected = inSI(k.example.output, k.output.unit);
      expect(d.status, `${k.id}: ${d.refusal?.domain ?? d.because ?? ''}`).not.toBe('outside-validity');
      expect(d.value).not.toBeNull();
      const rel = Math.max(k.example.rel ?? 0, 1e-9);
      expect(Math.abs(d.value! - expected), `${k.id}: ${d.value} vs ${expected}`).toBeLessThanOrEqual(rel * Math.max(Math.abs(expected), 1e-300));
      // the kept validity function and the term's domain predicates agree on the example
      expect(t.domain.length > 0).toBe(!!k.outside);
      if (k.outside) {
        expect(k.outside(k.example.inputs)).toBeNull();
        for (const dc of t.domain) expect(dc.says.length).toBeGreaterThan(8);
      }
      // every constant the term holds is a leaf with its source
      for (const l of leavesUnder(d)) expect(l.origin.source ?? l.origin.grounds ?? l.origin.by, `${k.id}: ${l.name}`).toBeTruthy();
    });
  }
  it('refuses outside a predicate domain, with the domain named, for a law that had a validity function', () => {
    const t = lawById('carnot');
    const d = apply(t, env(t, { Tc: 600, Th: 300 }));
    expect(d.status).toBe('outside-validity');
    expect(d.refusal?.domain).toMatch(/colder/);
    const c = lawById('copper.tempco');
    expect(apply(c, env(c, { R0: 0.317, T: 250, T0: 25 })).status).toBe('outside-validity');
    expect(apply(c, env(c, { R0: 0.317, T: 100, T0: 25 })).value).toBeCloseTo(0.41043575, 9);
  });
  it('unit conventions live at the ports: rpm, rev and hours are converted, the term is SI', () => {
    const h = lawById('bearing.life.hours');
    const d = apply(h, env(h, { L: 3241792000, n: 600 }));
    expect(d.value).toBeCloseTo(90049.7777777778 * 3600, 3);
    expect(d.unit).toBe('h');
  });

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

  it('the cantilever tip sag under a patch narrows to the book\'s point load, and the elastic line agrees with the patch form', () => {
    const at = (w: number) => apply(CANTILEVER_TIP_SAG, env(CANTILEVER_TIP_SAG, { P: 1000, a: 0.5, w, ell: 1, q: 0, E: 200e9, I: 1.0666666666666668e-7, h: 0.04 })).value!;
    expect(at(1e-6)).toBeCloseTo((1000 * 0.25 * 2.5) / (6 * 200e9 * 1.0666666666666668e-7), 9);
    // the influence of a load grows faster than linearly with its reach, so spreading it raises the tip sag
    expect(at(0.2)).toBeGreaterThan(at(1e-6));
    expect(apply(CANTILEVER_TIP_SAG, env(CANTILEVER_TIP_SAG, { P: 1000, a: 0.95, w: 0.2, ell: 1, q: 0, E: 200e9, I: 1e-7, h: 0.04 })).status).toBe('outside-validity');
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

  it('the book is evidence, not a ceiling: it holds every kept law, and the language states laws for any matter it is told of that no one wrote', () => {
    // the kept laws are the sourced instances generated laws are checked against (carrier.test.ts reproduces 22 of them); their number is the kept data's, not the language's
    expect(BOOK.length).toBe(Object.values(KEPT).flat().length + SLICE.length + UNIVERSAL_LAWS.length);
    const told = ['volume of honey', 'amount of carbon dioxide', 'mass of hydrogen', 'volume of lava', 'amount of a species not yet named'];
    const power = told.filter((id) => carrierById(id).conjugate);
    const generated = told.flatMap((id) => [...family(carrierById(id)), ...power.filter((x) => x !== id && power.includes(id)).flatMap((x) => coupling(carrierById(id), carrierById(x)))]);
    // a concentration times a molar flux is not power: no lossless coupling to it is stated, and asking for one is refused
    expect(() => coupling(carrierById('amount of carbon dioxide'), carrierById('volume of honey'))).toThrow(/power/);
    expect(generated.length).toBeGreaterThan(told.length * family(carrierById('charge')).length);
    expect(new Set(generated.map((l) => l.id)).size).toBe(generated.length);
    for (const l of generated) { expect(BOOK.some((b) => b.id === l.id)).toBe(false); expect(l.source.kind).toBe('derivation'); }
  });
});
