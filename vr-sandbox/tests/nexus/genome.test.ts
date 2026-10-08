// A body grown from a genome as bodies are: two parents, meiosis with crossing over, a polygenic score for each trait
// with heritability's share, the rest the body's life; the heights it makes spread as men's do, a child between its
// parents, every child different, the body laid out from what it grew into.

import { describe, expect, it } from 'vitest';
import { LOCI, TRAITS, childOf, earwax, gamete, phenotype, possibilities, randomGenome, rng, scores } from '../../src/nexus/life/genome';
import { layOut } from '../../src/nexus/anatomy';

describe('a body from a genome', () => {
  it('maps height to 12,111 loci over the 22 autosomes, and every trait to its own', () => {
    expect(TRAITS.find((t) => t.key === 'height')!.loci).toBe(12111);
    expect(LOCI.length).toBe(TRAITS.reduce((a, t) => a + t.loci, 0)); expect(new Set(LOCI.map((l) => l.chr)).size).toBe(22);
  });
  it('grows men\'s heights with their mean and spread, from their genes and their lives in heritability\'s shares', () => {
    const hs: number[] = [], gs: number[] = [];
    for (let s = 1; s <= 300; s++) { const g = randomGenome(s, 'XY'), p = phenotype(g); hs.push(p.params.height!); gs.push(scores(g)[0]!); }
    const mean = hs.reduce((a, b) => a + b, 0) / hs.length, sd = Math.sqrt(hs.reduce((a, b) => a + (b - mean) ** 2, 0) / hs.length);
    expect(mean).toBeGreaterThan(1.74); expect(mean).toBeLessThan(1.78); expect(sd).toBeGreaterThan(0.055); expect(sd).toBeLessThan(0.085);
    const gm = gs.reduce((a, b) => a + b, 0) / gs.length, gv = gs.reduce((a, b) => a + (b - gm) ** 2, 0) / gs.length; expect(gv).toBeGreaterThan(0.6); expect(gv).toBeLessThan(1.0); // h² = 0.8 of the variance
  });
  it('makes a child by meiosis: half from each parent, about 35 crossovers, no two the same', () => {
    const mum = randomGenome(11, 'XX'), dad = randomGenome(22, 'XY'), a = childOf(mum, dad, 1), b = childOf(mum, dad, 2);
    let fromMum = 0; for (let i = 0; i < LOCI.length; i++) if (a.mat[i] === mum.mat[i] || a.mat[i] === mum.pat[i]) fromMum++;
    expect(fromMum).toBe(LOCI.length); // every maternal allele is one of the mother's two
    let same = 0; for (let i = 0; i < LOCI.length; i++) if (a.mat[i] === b.mat[i] && a.pat[i] === b.pat[i]) same++;
    expect(same / LOCI.length).toBeLessThan(0.9); expect(same / LOCI.length).toBeGreaterThan(0.4);
    // crossovers: where a gamete switches between the parent's two copies, along each chromosome
    const r = rng(5), gm = gamete(dad, r); let switches = 0, on = -1, chr = -1;
    for (let i = 0; i < LOCI.length; i++) { if (dad.mat[i] === dad.pat[i]) continue; const now = gm[i] === dad.pat[i] ? 1 : 0; if (LOCI[i]!.chr !== chr) { chr = LOCI[i]!.chr; on = now; continue; } if (now !== on) { switches++; on = now; } }
    expect(switches).toBeGreaterThan(15); expect(switches).toBeLessThan(70);
    const kid = phenotype(a).params.height!, mid = (phenotype(mum).params.height! * 176 / 163 + phenotype(dad).params.height!) / 2; expect(Math.abs((a.sex === 'XX' ? kid * 176 / 163 : kid) - mid)).toBeLessThan(0.2);
    expect(possibilities.perCouple).toBeCloseTo(7.04e13, -11);
  });
  it('lays a body out from what it grew into: its bones as long as its genes made it tall', () => {
    const g = randomGenome(99, 'XX'), p = phenotype(g), b = layOut(p.params);
    expect(b.params.sex).toBe(1); expect(b.H).toBeCloseTo(Math.min(2.1, Math.max(1.4, p.params.height!)), 6);
    expect(b.organs.some((o) => o.id === 'uterus')).toBe(true); expect(b.organs.some((o) => o.id === 'testis')).toBe(false);
  });
  it('pigments from genes, hair as long as it is let grow, earwax from one gene by Mendel', () => {
    const ps = Array.from({ length: 200 }, (_, i) => phenotype(randomGenome(1000 + i)).params);
    for (const k of ['hairDark', 'hairRed', 'skinDark', 'eyeDark'] as const) { const v = ps.map((p) => p[k]!); expect(Math.min(...v)).toBeGreaterThan(0); expect(Math.max(...v)).toBeLessThan(1); expect(Math.max(...v) - Math.min(...v), k).toBeGreaterThan(0.5); }
    for (const p of ps) { expect(p.hairLength!).toBeGreaterThan(0); expect(p.hairLength!).toBeLessThan(0.35e-3 * 365 * 7 + 1e-9); }
    // two dry-earwax parents have only dry-earwax children; the allele is recessive
    const dry = (seed: number) => { for (let s = seed; ; s++) { const g = randomGenome(s); if (earwax(g) === 'dry') return g; } };
    const m = dry(1), f = dry(5000); for (let k = 0; k < 20; k++) expect(earwax(childOf(m, f, k))).toBe('dry');
    const share = ps.length ? Array.from({ length: 400 }, (_, i) => earwax(randomGenome(9000 + i)) === 'dry').filter(Boolean).length / 400 : 0; expect(share).toBeGreaterThan(0.04); expect(share).toBeLessThan(0.16); // 0.3² by Hardy–Weinberg
    // and the body it grows into wears it: hair on its scalp, cut at its hairline; none when shaved
    expect(layOut({ hairLength: 0.04 }).hair.length).toBeGreaterThan(3); expect(layOut({ hairLength: 0 }).hair.length).toBe(0); expect(layOut({}).brows.length).toBe(2);
  });
});
