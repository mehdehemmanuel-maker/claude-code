// How living things make more of themselves: each species' way (its sex system, its gametes and their sizes, where its
// eggs are fertilised, how many young and how long they take, its life cycle stage by stage) and why evolution favoured
// it. And the genetics of it run, not told: a species' genome crossed by its own rules (two parents by meiosis; a
// haplodiploid queen's unfertilised eggs making sons; a hermaphrodite both giving and taking sperm; a parthenogenetic
// mother cloning daughters; a fungus fusing with another of a different mating type), so what is said of each (ant
// sisters share three quarters of their genes; sex costs half the growth; almost any two strains of a mushroom can mate)
// is measured from the offspring made, not asserted. Humans are crossed with their own genome (genome.ts: childOf).
//
// Numbers are from the sources named; what is typical says so.

import { rng } from './genome';

export type SexSystem = 'XY' | 'haplodiploid' | 'hermaphrodite' | 'parthenogenetic' | 'mating types';
export interface Stage { name: string; lasts: string; shape: 'egg' | 'sperm' | 'spore' | 'ball' | 'larva' | 'pupa' | 'adult' | 'cocoon' | 'embryo' | 'hypha' | 'mushroom' | 'colony'; size: number; says: string }
export interface Species {
  id: string; name: string; latin: string; words: RegExp; system: SexSystem; chromosomes: string;
  /** egg and sperm (or spore) sizes, m, and what they are */ gametes: { egg?: number; sperm?: number; spore?: number; says: string };
  fertilisation: string; mating: string; young: string; develops: string;
  stages: Stage[];
  why: string[];
}

export const SPECIES: Species[] = [
  {
    id: 'human', name: 'humans', latin: 'Homo sapiens', words: /\b(humans?|people|person|man|woman|babies|baby)\b/, system: 'XY', chromosomes: '2n = 46 (22 pairs and XX or XY)',
    gametes: { egg: 120e-6, sperm: 55e-6, says: 'the egg about 0.12 mm across (one of the largest human cells), the sperm about 0.055 mm long, its head 5 µm (typical)' },
    fertilisation: 'internal: a sperm reaches the egg in the fallopian tube; the fertilised egg implants in the uterus 6 to 10 days later',
    mating: 'pairs, usually for long stretches; ovulation is concealed (no outward sign), one egg a cycle of about 28 days',
    young: 'one at a time (twins about 1 in 60 births, typical)', develops: 'about 266 days from fertilisation to birth, then about 18 years to adulthood',
    stages: [
      { name: 'egg and sperm', lasts: 'the egg lives about a day after ovulation', shape: 'egg', size: 120e-6, says: 'the egg about 2 times as long as the sperm, and some 100,000 times its volume' },
      { name: 'zygote', lasts: 'a day', shape: 'ball', size: 120e-6, says: 'one cell, its genome half from each parent (by meiosis: each chromosome pair crossed over about 1–3 times)' },
      { name: 'blastocyst', lasts: 'days 5 to 9', shape: 'ball', size: 200e-6, says: 'about 100 cells, a hollow ball that implants' },
      { name: 'embryo', lasts: 'weeks 3 to 8', shape: 'embryo', size: 0.016, says: 'its organs laid down; about 16 mm long at 8 weeks' },
      { name: 'fetus', lasts: 'weeks 9 to 38', shape: 'embryo', size: 0.5, says: 'grows from 3 cm to about 50 cm and 3.4 kg' },
      { name: 'child', lasts: 'about 12 years', shape: 'adult', size: 1.2, says: 'the longest childhood of any animal relative to its life' },
      { name: 'adult', lasts: 'decades', shape: 'adult', size: 1.7, says: 'fertile from puberty; a woman\'s fertility ends at menopause, about 51' },
    ],
    why: ['Big brains are born early: a head that must pass the pelvis is born unfinished, so human young need years of care (the obstetrical dilemma, Washburn 1960).', 'That long care favours pairs that stay together and both raise the young; concealed ovulation may keep a partner near across the cycle (one hypothesis of several).', 'One child at a time, a lot put into each: a K-strategy, as in whales and elephants.'],
  },
  {
    id: 'whale', name: 'humpback whales', latin: 'Megaptera novaeangliae', words: /\b(whales?|humpbacks?|cetaceans?)\b/, system: 'XY', chromosomes: '2n = 44',
    gametes: { egg: 120e-6, sperm: 60e-6, says: 'a mammal\'s egg, about 0.1 mm (typical of mammals), from an animal of 30 tonnes' },
    fertilisation: 'internal, in winter breeding grounds in warm water (Hawaii, the Caribbean), after migrations of up to 8,000 km',
    mating: 'males sing long songs and compete in "heat runs" of many males chasing one female (NOAA)',
    young: 'one calf every 2 to 3 years', develops: 'about 11.5 months of gestation; a calf of 4–5 m and about 1 tonne, nursed for about a year on milk of about 35 % fat (NOAA; typical)',
    stages: [
      { name: 'egg and sperm', lasts: 'one ovulation a breeding season', shape: 'egg', size: 120e-6, says: 'about the size of a human egg' },
      { name: 'fetus', lasts: 'about 11.5 months', shape: 'embryo', size: 4.5, says: 'grows to 4–5 m in the womb' },
      { name: 'calf', lasts: 'a year nursing', shape: 'adult', size: 5, says: 'drinks rich milk, up to hundreds of litres a day (an estimate)' },
      { name: 'adult', lasts: 'about 45–100 years', shape: 'adult', size: 15, says: 'about 15 m and 30 t; females mature at about 5 years' },
    ],
    why: ['Few young, each very costly: the calf must be big and fat enough to survive cold water and the migration back to feeding grounds.', 'Breeding in warm, food-poor water spares the calf the cold; feeding in cold, rich water feeds the mother: the migration is the trade.', 'Males compete for few fertile females (most females are pregnant or nursing in any year), so song and chasing are favoured (sexual selection).'],
  },
  {
    id: 'pig', name: 'pigs', latin: 'Sus scrofa domesticus', words: /\b(pigs?|swine|hogs?|sows?|boars?|piglets?)\b/, system: 'XY', chromosomes: '2n = 38',
    gametes: { egg: 120e-6, sperm: 50e-6, says: 'eggs of a mammal, about 0.12 mm; a boar\'s ejaculate about 200–300 mL with tens of billions of sperm (typical)' },
    fertilisation: 'internal; the sow ovulates 15–25 eggs at once', mating: 'promiscuous in the wild: a sow in heat (oestrus, every 21 days) mates with one or more boars',
    young: 'a litter of about 10–12 piglets (typical of commercial breeds)', develops: '114 days of gestation ("three months, three weeks and three days"); weaned at 3–5 weeks',
    stages: [
      { name: 'egg and sperm', lasts: 'oestrus 2–3 days', shape: 'egg', size: 120e-6, says: 'many eggs at once' },
      { name: 'embryos', lasts: '114 days', shape: 'embryo', size: 0.25, says: 'a dozen or so in the two horns of the uterus' },
      { name: 'piglets', lasts: 'about 4 weeks nursing', shape: 'adult', size: 0.3, says: 'about 1.4 kg at birth (typical)' },
      { name: 'adult', lasts: '15–20 years', shape: 'adult', size: 1.2, says: 'mature at 5–6 months' },
    ],
    why: ['Large litters of small young: a strategy toward the r end, uncommon in big mammals; wild boar live where predation and hard winters kill many young.', 'Huge ejaculates are what sperm competition favours: where a female mates with several males, the most sperm wins most often (Parker 1970).'],
  },
  {
    id: 'fly', name: 'fruit flies', latin: 'Drosophila melanogaster', words: /\b(fruit ?flies|fruit ?fly|flies|fly|drosophila)\b/, system: 'XY', chromosomes: '2n = 8 (sex set by the number of X: XX female, XY male)',
    gametes: { egg: 0.5e-3, sperm: 1.8e-3, says: 'its egg about 0.5 mm long, its sperm about 1.8 mm long, nearly the fly\'s own length (2.5 mm); D. bifurca\'s sperm are 58 mm (Pitnick et al. 1995)' },
    fertilisation: 'internal; the female stores sperm and fertilises each egg as she lays it on rotting fruit', mating: 'the male courts by dancing and "singing" with one vibrating wing; the female chooses',
    young: 'about 400 eggs in her life (typical, 30–50 a day)', develops: 'egg to adult in about 10 days at 25 °C: a day as an egg, 4 as a larva, 4–5 as a pupa',
    stages: [
      { name: 'egg', lasts: 'about a day', shape: 'egg', size: 0.5e-3, says: 'laid on rotting fruit' },
      { name: 'larva', lasts: 'about 4 days, three instars', shape: 'larva', size: 4e-3, says: 'eats and grows about 200 times its mass' },
      { name: 'pupa', lasts: '4–5 days', shape: 'pupa', size: 3e-3, says: 'its body rebuilt inside the case (metamorphosis)' },
      { name: 'adult', lasts: '40–50 days', shape: 'adult', size: 2.5e-3, says: 'fertile within a day of hatching' },
    ],
    why: ['Speed: a generation in 10 days lets a fly population follow rotting fruit wherever it appears.', 'Females mate more than once and store sperm, so the males\' sperm compete inside her; long sperm and the long tubes of her tract evolved together (Miller & Pitnick 2002).'],
  },
  {
    id: 'ant', name: 'ants', latin: 'Lasius niger', words: /\b(ants?|ant colony|queen ant|termites?)\b/, system: 'haplodiploid', chromosomes: 'females 2n = 30 (diploid), males n = 15 (haploid, from unfertilised eggs)',
    gametes: { egg: 0.5e-3, sperm: 0.15e-3, says: 'the queen\'s eggs about 0.5 mm; she stores a lifetime of sperm (millions) from one mating flight in her spermatheca' },
    fertilisation: 'internal, once: on a summer "nuptial flight" winged queens and males mate in the air; the queen then sheds her wings and never mates again',
    mating: 'males die after the flight; the queen lives up to 28 years (L. niger in a lab: Kutter & Stumper 1969), choosing for each egg whether to fertilise it',
    young: 'a fertilised egg becomes a female (a worker, or a queen if fed more); an unfertilised one a male', develops: 'egg to adult worker in about 6–8 weeks',
    stages: [
      { name: 'nuptial flight', lasts: 'a few hours on a warm day', shape: 'adult', size: 9e-3, says: 'winged queens and males from many nests at once' },
      { name: 'egg', lasts: 'about 3 weeks', shape: 'egg', size: 0.5e-3, says: 'fertilised: a daughter; not: a son' },
      { name: 'larva', lasts: 'about 3 weeks', shape: 'larva', size: 3e-3, says: 'fed by workers' },
      { name: 'pupa', lasts: 'about 3 weeks', shape: 'pupa', size: 3e-3, says: 'in a silk cocoon' },
      { name: 'colony', lasts: 'decades', shape: 'colony', size: 0.3, says: 'thousands of sterile sisters raising their mother\'s eggs' },
    ],
    why: ['Haplodiploidy: a son has only his mother\'s genes, so sisters share all their father\'s and half their mother\'s: three quarters on average, more than they would share with daughters of their own (one half).', 'So raising sisters can pass on more of a worker\'s genes than having young herself: Hamilton\'s rule, rB > C (Hamilton 1964), favours the sterile worker caste. (Monogamous queens, as here, matter as much: with one father, sisters stay at 0.75.)'],
  },
  {
    id: 'earthworm', name: 'earthworms', latin: 'Lumbricus terrestris', words: /\b(earthworms?|worms?|nightcrawlers?)\b/, system: 'hermaphrodite', chromosomes: '2n = 36',
    gametes: { egg: 0.1e-3, sperm: 0.05e-3, says: 'each worm makes both eggs and sperm (typical sizes)' },
    fertilisation: 'external, in a cocoon: two worms lie head to tail and swap sperm; later each one\'s clitellum (the band) slides off as a ring, collecting its own eggs and the partner\'s stored sperm, and closes into a cocoon',
    mating: 'at night on the surface, often each from its own burrow', young: 'one hatchling a cocoon, many cocoons a year (typical of L. terrestris)', develops: 'about 3–4 months in the cocoon; about a year to sexual maturity',
    stages: [
      { name: 'mating', lasts: 'about an hour', shape: 'adult', size: 0.2, says: 'two worms, each giving and taking sperm' },
      { name: 'cocoon', lasts: '3–4 months', shape: 'cocoon', size: 6e-3, says: 'about 6 mm, lemon-shaped' },
      { name: 'hatchling', lasts: 'months', shape: 'larva', size: 0.03, says: 'a small worm, no larva' },
      { name: 'adult', lasts: 'up to 6 years', shape: 'adult', size: 0.2, says: 'mature when its clitellum shows' },
    ],
    why: ['When meeting a mate is rare (a slow animal underground), being both sexes means any worm met is a mate, and both partners leave with fertilised eggs (Ghiselin 1969, the low-density model).', 'It still crosses with another worm rather than selfing, keeping sex\'s recombination.'],
  },
  {
    id: 'tardigrade', name: 'water bears', latin: 'Hypsibius exemplaris', words: /\b(water ?bears?|tardigrades?|moss piglets?)\b/, system: 'parthenogenetic', chromosomes: '2n = 10 (an estimate for this strain)',
    gametes: { egg: 70e-6, says: 'eggs about 70 µm across (an estimate), laid without any male: this lab strain is all female' },
    fertilisation: 'none: parthenogenesis, eggs developing without sperm (other tardigrades mate, and some are hermaphrodite)',
    mating: 'no mating in this strain', young: 'a few eggs at a time, often laid in the skin it sheds (its exuvia) as it moults', develops: 'about 4–5 days to hatch at 20 °C; juveniles grow by moulting, without a larva',
    stages: [
      { name: 'eggs in the shed skin', lasts: 'about 4–5 days', shape: 'egg', size: 70e-6, says: 'laid as she moults' },
      { name: 'juvenile', lasts: 'about 2 weeks', shape: 'adult', size: 0.15e-3, says: 'a small adult; grows by moulting' },
      { name: 'adult', lasts: 'months', shape: 'adult', size: 0.3e-3, says: 'about 0.3 mm; can dry to a "tun" and revive' },
    ],
    why: ['Without males every one of them lays eggs, so an asexual line grows twice as fast as a sexual one that must make sons: the twofold cost of sex (Maynard Smith 1978).', 'The price is no new combinations of genes: harmful mutations pile up and cannot be shed (Muller\'s ratchet), and a clone cannot keep up with fast-changing parasites (the Red Queen). So sex wins in most animals; parthenogenesis where colonising fast matters.'],
  },
  {
    id: 'mycelium', name: 'mushrooms and their mycelium', latin: 'Schizophyllum commune', words: /\b(mycelium|mycelia|mushrooms?|fung(?:us|i)|hyphae|spores?|split ?gill)\b/, system: 'mating types', chromosomes: 'haploid, n = 11; two nuclei per cell after mating (a dikaryon)',
    gametes: { spore: 4e-6, says: 'no eggs or sperm: haploid spores about 4 by 1.5 µm (typical of S. commune), billions from one cap' },
    fertilisation: 'two hyphae of different mating types fuse (plasmogamy); their nuclei live side by side for the life of the mycelium and only fuse (karyogamy) in the gills\' basidia, just before meiosis makes the spores',
    mating: 'any two strains whose mating-type genes differ at both of its two loci (A and B): over 23,000 mating types (Raper 1966), so almost any two can mate',
    young: 'four spores from each basidium; billions from one mushroom', develops: 'spore to fruiting body in weeks, when the mycelium has fed enough',
    stages: [
      { name: 'spore', lasts: 'until it lands on wood', shape: 'spore', size: 4e-6, says: 'haploid, one nucleus' },
      { name: 'monokaryon', lasts: 'days', shape: 'hypha', size: 0.01, says: 'a haploid hypha growing through wood' },
      { name: 'dikaryon', lasts: 'months to years', shape: 'hypha', size: 0.1, says: 'two compatible hyphae fused: each cell two nuclei' },
      { name: 'mushroom', lasts: 'days to weeks', shape: 'mushroom', size: 0.03, says: 'its gills lined with basidia where nuclei fuse, then meiosis' },
    ],
    why: ['With so many mating types, nearly every other strain met is a mate (about 98 % with S. commune\'s two loci), while a strain can never mate with itself or a sibling with the same types: outcrossing is all but guaranteed.', 'Keeping two nuclei apart for so long lets the mycelium grow and feed as a diploid would, and choose its moment to make spores.'],
  },
];

export const speciesFor = (words: string): Species | null => { const t = words.toLowerCase(); return SPECIES.filter((s) => s.id !== 'human').find((s) => s.words.test(t)) ?? (SPECIES[0]!.words.test(t) ? SPECIES[0]! : null); };

// ---- genetics by each sex system, run on a small genome (so many loci on so many chromosomes), the offspring measured ----
export interface Ind { a: Uint8Array; b: Uint8Array | null; sex: 'F' | 'M' | 'H' }
const L = 400, CHR = 5;
/** Alleles that carry where they came from: each founder's each copy its own label, so relatedness can be counted. */
export function founder(id: number, sex: Ind['sex'], haploid = false): Ind { const a = new Uint8Array(L).fill(id * 2), b = haploid ? null : new Uint8Array(L).fill(id * 2 + 1); return { a, b, sex }; }
/** One gamete by meiosis: each chromosome crossed over about once (a Poisson count, mean 1), starting on either copy. */
export function meiosis(p: Ind, r: () => number): Uint8Array {
  if (!p.b) return p.a.slice(); const out = new Uint8Array(L), per = L / CHR;
  for (let c = 0; c < CHR; c++) { let on = r() < 0.5, next = c * per + Math.floor(-Math.log(1 - r()) * per); for (let i = c * per; i < (c + 1) * per; i++) { if (i >= next) { on = !on; next = i + Math.floor(-Math.log(1 - r()) * per) + 1; } out[i] = on ? p.a[i]! : p.b[i]!; } }
  return out;
}
/** The young of one mating (or none), by the species' system. */
export function offspring(sys: SexSystem, mother: Ind, father: Ind | null, r: () => number, fertilise = true): Ind {
  switch (sys) {
    case 'XY': return { a: meiosis(mother, r), b: meiosis(father!, r), sex: r() < 0.5 ? 'F' : 'M' };
    case 'haplodiploid': return fertilise && father ? { a: meiosis(mother, r), b: father.a.slice(), sex: 'F' } : { a: meiosis(mother, r), b: null, sex: 'M' };
    case 'hermaphrodite': return { a: meiosis(mother, r), b: meiosis(father!, r), sex: 'H' };
    case 'parthenogenetic': return { a: mother.a.slice(), b: mother.b ? mother.b.slice() : null, sex: 'F' }; // apomixis: a clone
    case 'mating types': return { a: meiosis({ a: mother.a, b: father!.a, sex: 'H' }, r), b: null, sex: 'H' }; // a spore: one of the dikaryon's meioses
  }
}
/** The share of their genes two share by descent (Wright's r, counted: the chance an allele drawn from one is found in the
 *  other at the same place, counting each's copies by their ploidy). */
export function relatedness(x: Ind, y: Ind): number {
  const copies = (p: Ind, i: number) => (p.b ? [p.a[i]!, p.b[i]!] : [p.a[i]!]); let s = 0;
  for (let i = 0; i < L; i++) { const cx = copies(x, i), cy = copies(y, i); s += cx.reduce((a, v) => a + (cy.includes(v) ? 1 : 0), 0) / cx.length; }
  return s / L;
}
/** What each system makes, measured: relatedness of siblings, of a mother to her young, the share of sons, and how fast a
 *  line grows (young per adult, counting only those who can lay). */
export function measure(sys: SexSystem, seed = 1, n = 400): { sisters: number; motherToYoung: number; sons: number; layersPerYoung: number } {
  const r = rng(seed), mum = founder(1, sys === 'XY' || sys === 'haplodiploid' ? 'F' : 'H', sys === 'mating types'), dad = sys === 'parthenogenetic' ? null : founder(2, sys === 'haplodiploid' ? 'M' : sys === 'XY' ? 'M' : 'H', sys === 'haplodiploid' || sys === 'mating types');
  const kids = Array.from({ length: n }, (_, i) => offspring(sys, mum, dad, r, sys !== 'haplodiploid' || i % 2 === 0));
  const daughters = kids.filter((k) => k.sex !== 'M'); let sis = 0, ns = 0;
  for (let i = 0; i + 1 < daughters.length && ns < 200; i += 2) { sis += relatedness(daughters[i]!, daughters[i + 1]!); ns++; }
  return { sisters: ns ? sis / ns : 0, motherToYoung: kids.slice(0, 50).reduce((a, k) => a + relatedness(mum, k), 0) / 50, sons: kids.filter((k) => k.sex === 'M').length / n, layersPerYoung: kids.filter((k) => k.sex !== 'M').length / n };
}
/** The share of strains a strain can mate with, with so many types at each of its mating loci (both must differ). */
export const compatible = (types: number[]): number => types.reduce((a, k) => a * (1 - 1 / k), 1);
