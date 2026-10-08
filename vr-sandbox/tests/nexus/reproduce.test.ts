// How living things make more of themselves, run rather than told: crossed by each species' own rules, the offspring
// show what is said of them. Full sisters share half their genes, ant sisters three quarters (haplodiploidy: their father
// gives each the same whole set); a mother passes half to each young; a parthenogenetic mother clones daughters only, so
// every young can lay (the twofold cost of sex, avoided); a hermaphrodite's young can all lay too; almost any two strains of
// a mushroom with two mating loci can mate. And a human couple's child is crossed from their own genomes by meiosis.

import { describe, expect, it } from 'vitest';
import { compatible, measure, SPECIES, speciesFor } from '../../src/nexus/life/reproduce';
import { childOf, randomGenome, phenotype } from '../../src/nexus/life/genome';

describe('each way of reproducing, measured on its offspring', () => {
  it('gives sisters half their genes in common, ant sisters three quarters', () => {
    const xy = measure('XY'), ant = measure('haplodiploid');
    expect(xy.sisters).toBeCloseTo(0.5, 1); expect(ant.sisters).toBeCloseTo(0.75, 1); expect(xy.motherToYoung).toBeCloseTo(0.5, 1);
    expect(xy.sons).toBeGreaterThan(0.4); expect(xy.sons).toBeLessThan(0.6); expect(ant.sons).toBeCloseTo(0.5, 1); // half the queen's eggs left unfertilised here
  });
  it('lets a clone make only daughters, all of whom can lay: no cost of sex, and no new combinations', () => {
    const clone = measure('parthenogenetic'), xy = measure('XY'), worm = measure('hermaphrodite');
    expect(clone.sons).toBe(0); expect(clone.layersPerYoung).toBe(1); expect(clone.motherToYoung).toBeCloseTo(1, 6); expect(clone.sisters).toBeCloseTo(1, 6);
    expect(clone.layersPerYoung / xy.layersPerYoung).toBeGreaterThan(1.7); expect(clone.layersPerYoung / xy.layersPerYoung).toBeLessThan(2.3); // twice as fast
    expect(worm.layersPerYoung).toBe(1); expect(worm.sisters).toBeCloseTo(0.5, 1);
  });
  it('lets a mushroom mate with almost any strain, its spores half alike', () => {
    expect(compatible([339, 64])).toBeGreaterThan(0.97); expect(compatible([2])).toBe(0.5); // two loci of many alleles, or one of two (as in yeasts)
    expect(measure('mating types').sisters).toBeCloseTo(0.5, 1);
  });
  it('knows each species asked about, with its gametes, its stages and why', () => {
    for (const [w, id] of [['how do ants reproduce', 'ant'], ['show me how flies mate', 'fly'], ['the life cycle of a pig', 'pig'], ['how do water bears reproduce', 'tardigrade'], ['how does mycelium reproduce', 'mycelium'], ['how do whales mate', 'whale'], ['earthworm reproduction', 'earthworm'], ['how are babies made', 'human']] as const) expect(speciesFor(w)?.id, w).toBe(id);
    for (const s of SPECIES) { expect(s.stages.length, s.id).toBeGreaterThan(2); expect(s.why.length, s.id).toBeGreaterThan(0); }
    const fly = SPECIES.find((s) => s.id === 'fly')!; expect(fly.gametes.sperm!).toBeGreaterThan(fly.gametes.egg!); // a fruit fly's sperm is longer than its egg
  });
});
describe("a human couple's child", () => {
  it('is crossed from their own genomes: half from each, each trait between and around theirs', () => {
    const mum = randomGenome(11, 'XX'), dad = randomGenome(12, 'XY'), kids = Array.from({ length: 40 }, (_, i) => childOf(mum, dad, 100 + i));
    expect(new Set(kids.map((k) => k.sex)).size).toBe(2);
    // each child's maternal copy all from its mother's two copies
    for (const k of kids.slice(0, 5)) for (let i = 0; i < k.mat.length; i += 997) expect([mum.mat[i], mum.pat[i]]).toContain(k.mat[i]);
    const h = (g: typeof mum) => phenotype(g).params.height!, mid = (h(mum) + h(dad)) / 2, mean = kids.reduce((a, k) => a + h(k), 0) / kids.length;
    expect(Math.abs(mean - mid)).toBeLessThan(0.08); // around the parents' middle (a son taller, a daughter shorter)
    expect(new Set(kids.map((k) => h(k).toFixed(3))).size).toBeGreaterThan(30); // and every child different
  });
});
