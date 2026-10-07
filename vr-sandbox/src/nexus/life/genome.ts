// A body grown from a genome, the way bodies are: two parents' haplotypes, a gamete from each by meiosis (each
// chromosome's pair crossed over at random points, about one a hundred million base pairs, then one of each pair
// taken), and its shape from what it inherited: each trait a sum over many loci (a polygenic score) plus what its
// life did to it, in the shares heritability gives (twin studies). Height has 12,111 loci, as mapped (Yengo et al.
// 2022); the rest have estimated numbers of loci, and say so. Every body made this way is a different one: a couple
// alone can make 2⁴⁶ (about 70 trillion) different sets of chromosomes before crossing over adds more.

import { CHROMOSOMES } from './cells';
import type { BodyParams } from '../anatomy';

/** A seeded random stream (mulberry32): the same seed, the same genome. */
export function rng(seed: number): () => number { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/** A trait, as genes and life make it: its mean and spread in men and women, its heritability, how many loci. */
export interface Trait { key: keyof BodyParams; name: string; mean: [number, number]; sd: [number, number]; h2: number; loci: number; says: string }
export const TRAITS: Trait[] = [
  { key: 'height', name: 'height (m)', mean: [1.76, 1.63], sd: [0.07, 0.065], h2: 0.8, loci: 12111, says: 'means ICRP 89\'s reference man and woman, spread typical; heritability about 0.8 (twin studies); 12,111 loci (Yengo et al. 2022)' },
  { key: 'mass', name: 'mass (kg) as BMI', mean: [23.6, 22.6], sd: [3.5, 4], h2: 0.6, loci: 3000, says: 'body mass index, ICRP 89\'s means; heritability about 0.4–0.8 (0.6 here); its loci an estimate' },
  { key: 'shoulders', name: 'shoulder width', mean: [1, 0.92], sd: [0.04, 0.04], h2: 0.6, loci: 1000, says: 'over a man\'s 0.259 × height; estimates' },
  { key: 'hips', name: 'hip width', mean: [1, 1.08], sd: [0.05, 0.05], h2: 0.6, loci: 1000, says: 'over a man\'s 0.191 × height; estimates' },
  { key: 'legs', name: 'leg length', mean: [1, 1], sd: [0.025, 0.025], h2: 0.6, loci: 1000, says: 'leg over stature; estimates' },
  { key: 'arms', name: 'arm length', mean: [1, 0.98], sd: [0.02, 0.02], h2: 0.6, loci: 800, says: 'estimates' },
  { key: 'head', name: 'head size', mean: [1, 0.96], sd: [0.03, 0.03], h2: 0.75, loci: 800, says: 'estimates' },
  { key: 'muscle', name: 'muscle', mean: [1, 0.7], sd: [0.12, 0.1], h2: 0.5, loci: 1000, says: 'women about 17.5 kg of muscle to men\'s 29 (ICRP 89); spread and heritability estimates' },
  { key: 'fat', name: 'fat', mean: [1, 1.25], sd: [0.3, 0.3], h2: 0.5, loci: 1000, says: 'women about 22.5 kg of fat tissue to men\'s 18.2 (ICRP 89); spread and heritability estimates' },
  ...([['eyesApart', 'eyes apart', 0.04], ['eyeSize', 'eye size', 0.04], ['noseLength', 'nose length', 0.07], ['noseWidth', 'nose width', 0.08], ['mouthWidth', 'mouth width', 0.06], ['lips', 'lips', 0.15], ['jaw', 'jaw width', 0.05], ['chin', 'chin', 0.1], ['brow', 'brow', 0.15], ['cheeks', 'cheekbones', 0.05], ['ears', 'ears', 0.06]] as const).map(([key, name, sd]): Trait => ({ key, name, mean: [1, key === 'jaw' || key === 'brow' ? 0.9 : 1], sd: [sd, sd], h2: 0.65, loci: 400, says: 'the face is highly heritable (twin studies, about 0.5–0.8); its spreads and loci estimates' })),
];

/** Where the loci are: each trait's spread over the 22 autosomes by their lengths, each with its allele frequency and
 *  its effect, scaled so the trait's genetic variance is its heritability times its variance. The same for everyone:
 *  it is the population's map, drawn once from a fixed seed. */
export interface Locus { trait: number; chr: number; pos: number; p: number; beta: number }
const AUTO = CHROMOSOMES.filter(([c]) => /^\d+$/.test(c)), AUTO_LEN = AUTO.reduce((a, [, bp]) => a + bp, 0);
export const LOCI: Locus[] = (() => {
  const r = rng(20221012), out: Locus[] = [];
  TRAITS.forEach((t, ti) => {
    const raw: Locus[] = [];
    for (let k = 0; k < t.loci; k++) { let x = r() * AUTO_LEN, chr = 0; while (x > AUTO[chr]![1]) { x -= AUTO[chr]![1]; chr++; } raw.push({ trait: ti, chr, pos: x, p: 0.05 + 0.9 * r(), beta: gauss(r) }); }
    const v = raw.reduce((a, l) => a + 2 * l.p * (1 - l.p) * l.beta * l.beta, 0), k = Math.sqrt(t.h2) / Math.sqrt(v); // in sd units
    for (const l of raw) { l.beta *= k; out.push(l); }
  });
  // by chromosome and position: meiosis walks them in order
  return out.sort((a, b) => a.chr - b.chr || a.pos - b.pos);
})();
const byChr: number[][] = AUTO.map(() => []); LOCI.forEach((l, i) => byChr[l.chr]!.push(i));

/** A genome: its two haplotypes' alleles at every locus (0 or 1), its sex chromosomes, and the seed of its life (what
 *  its environment did to it). */
export interface Genome { mat: Uint8Array; pat: Uint8Array; sex: 'XX' | 'XY'; life: number; name?: string }
/** A genome drawn from the population (each allele by its frequency: Hardy–Weinberg). */
export function randomGenome(seed: number, sex?: 'XX' | 'XY'): Genome {
  const r = rng(seed), mat = new Uint8Array(LOCI.length), pat = new Uint8Array(LOCI.length);
  for (let i = 0; i < LOCI.length; i++) { const p = LOCI[i]!.p; mat[i] = r() < p ? 1 : 0; pat[i] = r() < p ? 1 : 0; }
  return { mat, pat, sex: sex ?? (r() < 0.5 ? 'XX' : 'XY'), life: Math.floor(r() * 2 ** 31) };
}
/** A gamete by meiosis: for each autosome, its two copies crossed over at points spaced as a Poisson process of about
 *  one per 100 million base pairs (about 1 cM per Mb, so about 35 crossovers a meiosis), starting on either copy. */
export function gamete(g: Genome, r: () => number): Uint8Array {
  const out = new Uint8Array(LOCI.length);
  for (let c = 0; c < AUTO.length; c++) {
    const L = AUTO[c]![1], cross: number[] = []; let x = 0;
    for (;;) { x += -Math.log(1 - r()) * 1e8; if (x >= L) break; cross.push(x); }
    let on = r() < 0.5 ? 0 : 1, k = 0;
    for (const i of byChr[c]!) { while (k < cross.length && cross[k]! < LOCI[i]!.pos) { on ^= 1; k++; } out[i] = on ? g.pat[i]! : g.mat[i]!; }
  }
  return out;
}
/** A child of two: a gamete from each, an X from its mother and an X or a Y from its father. */
export function childOf(mother: Genome, father: Genome, seed: number): Genome {
  const r = rng(seed); return { mat: gamete(mother, r), pat: gamete(father, r), sex: r() < 0.5 ? 'XX' : 'XY', life: Math.floor(r() * 2 ** 31) };
}
/** Each trait's polygenic score, in standard deviations from the mean (its expected value taken off). */
export function scores(g: Genome): number[] {
  const s = TRAITS.map(() => 0);
  for (let i = 0; i < LOCI.length; i++) { const l = LOCI[i]!; s[l.trait]! += l.beta * (g.mat[i]! + g.pat[i]! - 2 * l.p); }
  return s;
}
/** The body a genome grows into: each trait its mean, plus its genes' score, plus what its life added (the rest of its
 *  variance: 1 − h²), as the parameters the body is laid out from. */
export function phenotype(g: Genome): { params: Partial<BodyParams>; traits: { name: string; value: number; genes: number; life: number }[] } {
  const sx = g.sex === 'XX' ? 1 : 0, sc = scores(g), r = rng(g.life), params: Partial<BodyParams> = {}, traits: { name: string; value: number; genes: number; life: number }[] = [];
  TRAITS.forEach((t, i) => {
    // BMI is skewed to the heavy side as populations are: log-normal about its mean; the rest normal
    const env = gauss(r) * Math.sqrt(1 - t.h2), z = sc[i]! + env, cv = t.sd[sx]! / t.mean[sx]!, v = t.key === 'mass' ? t.mean[sx]! * Math.exp(z * cv - (cv * cv) / 2) : t.mean[sx]! + z * t.sd[sx]!;
    traits.push({ name: t.name, value: v, genes: sc[i]!, life: env });
    if (t.key === 'mass') return; params[t.key] = v as never;
  });
  const bmi = traits.find((t) => t.name.startsWith('mass'))!.value, h = params.height!;
  params.mass = bmi * h * h; params.sex = sx;
  return { params, traits };
}
/** How many bodies there could be: from one couple, from the loci here, and per meiosis. */
export const possibilities = { perCouple: 2 ** 46, perMeiosisCrossovers: 35, genotypes: `3^${LOCI.length}`, says: 'a couple can make 2²³ × 2²³ ≈ 7 × 10¹³ sets of chromosomes before crossing over; with about 35 crossovers a meiosis, effectively every child is new; over the loci here alone there are 3^n genotypes' };
