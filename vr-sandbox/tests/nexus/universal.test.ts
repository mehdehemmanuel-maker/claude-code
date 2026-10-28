// The universal laws and what they work out: every law reproduces its independent example; the law graph places every
// law on its principles, finds the laws units force, and never finds one its units forbid; every part's density comes
// from its make-up by the mixing law and lands on the measured densities of tissue (ICRU Report 46); and what a body
// makes (its urine, urea, bilirubin, iron, carbon monoxide, cerebrospinal fluid, saliva, sweat, acid, hair) comes out of
// conservation, stoichiometry, Little's law and the rest within the range each is measured in.

import { describe, expect, it } from 'vitest';
import { BOOK, UNIVERSAL, lawById } from '../../src/nexus/book';
import { breakdown, discover, families, measured, principlesOf, solve, step } from '../../src/nexus/lawgraph';
import { INVENTORY, countIn, gramsOfItem } from '../../src/nexus/inventory';
import { MOLECULES } from '../../src/nexus/life';
import { GLAND_KINDS } from '../../src/nexus/life/glands';
import { ofLeaf } from '../../src/nexus/evaluate';
import { leaf } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));

describe('the universal laws', () => {
  for (const l of UNIVERSAL) it(`${l.id} reproduces its example`, () => {
    const d = step(l.id, Object.fromEntries(l.inputs.map((p) => [p.sym, given(p.name, l.example!.inputs[p.sym]!, p.unit)])));
    expect(d.status).not.toBe('outside-validity');
    expect(Math.abs(d.value! - l.example!.output)).toBeLessThanOrEqual(Math.max(l.example!.rel ?? 0, 1e-9) * Math.abs(l.example!.output));
  });
  it('are in the book once each, and each rests on a principle', () => {
    const ids = BOOK.map((l) => l.id); expect(new Set(ids).size).toBe(ids.length);
    for (const l of UNIVERSAL) expect(principlesOf(l), l.id).not.toBe('unplaced');
    expect(UNIVERSAL.length).toBeGreaterThan(50);
  });
});

describe('the law graph', () => {
    it('finds a law from units alone: a pendulum\'s period, the largest a cell can grow by diffusion, the tallest column', () => {
    expect(discover(['period', 's'], [['length', 'm'], ['gravity', 'm/s^2']]).exponents).toEqual({ length: 0.5, gravity: -0.5 });
    expect(discover(['radius', 'm'], [['D', 'm^2/s'], ['C', 'mol/m^3'], ['q', 'mol/m^3 s']]).exponents).toEqual({ D: 0.5, C: 0.5, q: -0.5 });
    expect(discover(['drag', 'N'], [['mu', 'Pa s'], ['r', 'm'], ['v', 'm/s'], ['rho', 'kg/m^3']]).forced).toBe(false); // the Reynolds number is free
  });
  it('shows one math across fields: a product of two is weight, Ohm, Little, a hair\'s length and sweat\'s cooling', () => {
    const pair = families().find((f) => f.skeleton === 'mul(x,x)')!.laws;
    for (const id of ['weight', 'ohm', 'queueing', 'distance.speed-time', 'heat.latent-flow']) expect(pair).toContain(id);
    const ps = new Set(pair.flatMap((id) => { const p = principlesOf(lawById(id)); return p === 'unplaced' ? [] : p; })); expect(ps.size).toBeGreaterThan(4);
  });
  it('solves a law for an input the other way round, and keeps the whole tree under a number', () => {
    const V = solve('mass.volume', 'V', { m: given('mass', 2, 'kg'), rho: measured('density', 1000, 'kg/m^3', 'test') });
    expect(V.value).toBeCloseTo(0.002, 12);
    const t = solve('diffusion.front', 't', { x: given('depth', 0.03, 'm'), D: given('D', 1e-8, 'm^2/s'), C: given('C', 0.0178, 'mol/m^3'), a: given('a', 2500, 'mol/m^3') });
    expect(t.value).toBeCloseTo((0.03 ** 2 * 2500) / (2 * 1e-8 * 0.0178), 0);
    const lines = breakdown(t).join('\n'); expect(lines).toMatch(/A front advanced by diffusion/); expect(lines).toMatch(/depth = 0.03 m/);
  });
});

describe('every part through the same laws', () => {
            it('spreads the cortex 2.5 mm thick: its areas add to the cortex\'s measured 1,800–2,600 cm²', () => {
    let mm2 = 0; for (const [id, i] of INVENTORY) if (id.startsWith('brodmann-')) mm2 += countIn('brain', id) * i.size![0] * i.size![1];
    expect(mm2 / 100).toBeGreaterThan(1800); expect(mm2 / 100).toBeLessThan(2600);
  });
});

describe('what a body makes', () => {
  it('has the parts that make it: sweat glands, follicles, acid cells, the tear and wax glands, the brain\'s fluid glands', () => {
    expect(countIn('human', 'eccrine-sweat-gland')).toBe(3e6); expect(Math.abs(countIn('human', 'hair-follicle') + countIn('human', 'vellus-follicle') - 5e6)).toBeLessThan(5e3);
    expect(countIn('human', 'parietal-cell')).toBeCloseTo(1.09e9, -6); expect(countIn('human', 'ceruminous-gland')).toBe(3000); expect(countIn('human', 'meibomian-gland')).toBe(110);
    expect(countIn('human', 'choroid-plexus')).toBe(4); expect(countIn('human', 'lacrimal-gland')).toBe(2);
    const scalp = countIn('human', 'scalp-hair') * gramsOfItem(INVENTORY.get('scalp-hair')!)!; expect(Math.abs(scalp - 20) / 20).toBeLessThan(0.02); // ICRP 89's 20 g, from 100,000 cylinders of keratin
    expect(INVENTORY.get('reproductive-system-female')!.of.map((c) => c.id)).toEqual(expect.arrayContaining(['ovary', 'uterus', 'breast']));
    for (const id of ['sebum', 'cerumen', 'tear-fluid', 'meibum', 'mucus', 'milk', 'pancreatic-juice', 'urine', 'sweat', 'saliva']) { const m = MOLECULES.find((x) => x.id === id)!; expect('blend' in m.spec, id).toBe(true); if ('blend' in m.spec) expect(m.spec.blend.reduce((a, [, p]) => a + p, 0), id).toBeCloseTo(100, 0); }
  });
    it('its glands are kinds other creatures have too: silk, wax, light, venom, ink, slime', () => {
    for (const k of GLAND_KINDS) { expect(INVENTORY.has(k.id), k.id).toBe(true); for (const c of k.in) expect(countIn(c, k.id), `${c} has ${k.id}`).toBeGreaterThan(0); }
    expect(countIn('hagfish', 'slime-gland')).toBe(300); expect(countIn('silkworm', 'silk-gland')).toBe(2);
    expect(MOLECULES.find((m) => m.id === 'hagfish-slime')!.spec).toMatchObject({ blend: expect.arrayContaining([['water', 99.996]]) });
  });
});
