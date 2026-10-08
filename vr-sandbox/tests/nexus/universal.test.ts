// The universal laws and what they work out: every law reproduces its independent example; the law graph places every
// law on its principles, finds the laws units force, and never finds one its units forbid; every part's density comes
// from its make-up by the mixing law and lands on the measured densities of tissue (ICRU Report 46); and what a body
// makes (its urine, urea, bilirubin, iron, carbon monoxide, cerebrospinal fluid, saliva, sweat, acid, hair) comes out of
// conservation, stoichiometry, Little's law and the rest within the range each is measured in.

import { describe, expect, it } from 'vitest';
import { BOOK, UNIVERSAL, lawById } from '../../src/nexus/book';
import { breakdown, discover, families, forcedByUnits, graphSummary, leavesUnder, lawsUnder, measured, principlesOf, solve, step, valueIn } from '../../src/nexus/lawgraph';
import { densityOf, profile, profileFaults } from '../../src/nexus/derive';
import { flowsOf } from '../../src/nexus/life/flows';
import { INVENTORY, countIn, gramsOfItem } from '../../src/nexus/inventory';
import { MOLECULES } from '../../src/nexus/life';
import { GLAND_KINDS } from '../../src/nexus/life/glands';
import { ofLeaf } from '../../src/nexus/evaluate';
import { leaf } from '../../src/nexus/term';
import { holding } from '../../src/nexus/boxfill';

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
  it('places every law, finds the ones units force, and none its units forbid', () => {
    const g = graphSummary();
    expect(g.byPrinciple.unplaced ?? []).toEqual([]);
    expect(g.units['contradicts its units'] ?? []).toEqual([]);
    expect(g.units.forced!.length).toBeGreaterThan(60);
    for (const id of ['weight', 'pendulum.period', 'diffusion.time', 'henry.solubility', 'column.self-weight', 'diffusion.sphere-limit']) expect(g.units.forced, id).toContain(id);
    // what units cannot know: Kleiber's exponent, Basquin's, the Gompertz rate
    for (const id of ['kleiber.scaling', 'fatigue.basquin', 'network.scaling']) expect(forcedByUnits(lawById(id)).verdict, id).not.toBe('forced');
  });
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
  it('its density from its make-up: tissues within a few % of ICRU 46, the body about 1.05', () => {
    const rho = (id: string) => valueIn(densityOf(id)!, 'kg/m^3')!;
    for (const [id, want] of [['skeletal-muscle-tissue', 1050], ['adipose-tissue', 950], ['cortical-bone', 1920], ['blood', 1060], ['brain', 1040], ['liver', 1060]] as const) { const r = rho(id); expect(Math.abs(r - want) / want, `${id}: ${r.toFixed(0)} against ${want}`).toBeLessThan(0.035); }
    expect(rho('human')).toBeGreaterThan(1030); expect(rho('human')).toBeLessThan(1080);
    expect(rho('red-blood-cell')).toBeGreaterThan(1070); expect(rho('red-blood-cell')).toBeLessThan(1120); // measured about 1.10
  });
  it('whether it could live without vessels, by Hill\'s diffusion limit on what it burns', () => {
    expect(profile('liver')!.oxygen!.needsVessels).toBe(true); expect(profile('brain')!.oxygen!.needsVessels).toBe(true);
    expect(profile('hepatocyte')!.oxygen!.needsVessels).toBe(false); expect(profile('e-coli')!.oxygen!.needsVessels).toBe(false);
    const r = valueIn(profile('liver')!.oxygen!.reach, 'mm')!; expect(r).toBeGreaterThan(0.05); expect(r).toBeLessThan(0.5); // a few tenths of a mm: why capillaries are that far apart
    expect(lawsUnder(profile('liver')!.oxygen!.reach).map((l) => l.id)).toEqual(expect.arrayContaining(['mixing.density', 'mass.volume', 'reaction.rate-from-power', 'henry.solubility', 'diffusion.sphere-limit']));
  });
  it('finds no part whose size and mass disagree', () => {
    expect(profileFaults().map((f) => f.says)).toEqual([]);
  });
  it('counts a set by its members: the 23 ligamenta flava, the tendons of a forearm, both tonsils', () => {
    const lf = profile('ligamenta-flava')!; expect(lawsUnder(lf.box!).map((l) => l.id)).toEqual(expect.arrayContaining(['total.volume', 'volume.of-box']));
    expect(lf.fill!).toBeGreaterThan(0.85); expect(lf.fill!).toBeLessThan(1.15);
    // a band's mass is its size's volume at its tissue's density: the Achilles tendon, 150 × 15 × 6 mm, about 12 g
    expect(gramsOfItem(INVENTORY.get('achilles-tendon')!)!).toBeCloseTo(12, 0);
    expect(countIn('human', 'parotid-gland')).toBe(2); expect(gramsOfItem(INVENTORY.get('salivary-glands')!)).toBe(85); // ICRP 89's 85 g, three pairs
  });
  it('grows a cell\'s size until it holds the volume it is measured to have', () => {
    expect(holding([10, 10, 10], 524, 'cell')).toEqual([10, 10, 10]); // an ellipsoid 10 µm across holds 524 µm³
    const k = holding([15, 15, 7], 1500, 'cell'); expect((Math.PI / 6) * k[0] * k[1] * k[2]).toBeCloseTo(1500, -1); expect(k[0] / k[2]).toBeCloseTo(15 / 7, 1);
    for (const id of ['keratinocyte', 'osteoclast', 'alveolar-cell-2', 'hepatocyte']) expect(profile(id)!.fill!, id).toBeLessThanOrEqual(1.05);
  });
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
  it('works out each flow by the universal laws, within the range it is measured in', () => {
    const fs = flowsOf();
    for (const f of fs) if (f.measured) { const v = valueIn(f.rate, f.unit)!; expect(v, `${f.name}: ${v} ${f.unit}`).toBeGreaterThanOrEqual(f.measured.lo); expect(v, `${f.name}: ${v} ${f.unit}`).toBeLessThanOrEqual(f.measured.hi); }
    expect(fs.filter((f) => f.measured).length).toBeGreaterThan(12);
    const urine = fs.find((f) => f.id === 'urine')!;
    expect(lawsUnder(urine.rate).map((l) => l.id)).toEqual(expect.arrayContaining(['balance.difference', 'junction.sum', 'transport.advection', 'vapour.pressure', 'gas.concentration', 'flux.area']));
    const bili = fs.find((f) => f.id === 'bilirubin')!;
    expect(lawsUnder(bili.rate).map((l) => l.id)).toEqual(expect.arrayContaining(['queueing', 'total.mass', 'stoichiometry.mass']));
    expect(leavesUnder(bili.rate).every((d) => d.term.kind === 'leaf')).toBe(true);
    // breath and blood by the same laws: the oxygen burnt from resting power, the heart's output by Fick's principle
    const heart = fs.find((f) => f.id === 'cardiac-output')!;
    expect(lawsUnder(heart.rate).map((l) => l.id)).toEqual(expect.arrayContaining(['power.molar', 'transport.advection', 'stoichiometry.moles', 'saturation.share', 'amount.concentration', 'total.mass']));
    const alb = fs.find((f) => f.id === 'albumin')!; expect(lawsUnder(alb.rate).map((l) => l.id)).toEqual(expect.arrayContaining(['loss.first-order', 'half-life', 'share.of']));
    const hair = fs.find((f) => f.id === 'hair')!; const longest = valueIn(hair.also[0]!.d, 'cm')!; expect(longest).toBeGreaterThan(20); expect(longest).toBeLessThan(80); // its growth rate times its growing phase
  });
  it('its glands are kinds other creatures have too: silk, wax, light, venom, ink, slime', () => {
    for (const k of GLAND_KINDS) { expect(INVENTORY.has(k.id), k.id).toBe(true); for (const c of k.in) expect(countIn(c, k.id), `${c} has ${k.id}`).toBeGreaterThan(0); }
    expect(countIn('hagfish', 'slime-gland')).toBe(300); expect(countIn('silkworm', 'silk-gland')).toBe(2);
    expect(MOLECULES.find((m) => m.id === 'hagfish-slime')!.spec).toMatchObject({ blend: expect.arrayContaining([['water', 99.996]]) });
  });
});
