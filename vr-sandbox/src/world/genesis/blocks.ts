// The building blocks people are made from. No village, bazaar or colony is stored: each request is composed on the
// spot from these (compose.ts) and its history simulated fresh (history.ts), so every one is new. A block is one
// interchangeable piece of how a people lives: how they die, bear children and marry, what they call each other, what
// work there is, what can befall them, and how each one is tempered. Each says where its numbers come from: measured
// (with its source), estimated (said so), or invented (for peoples nobody has measured, said so too).

export type Basis = 'measured' | 'estimated' | 'invented';

// ------------------------------------------------------------------------------------------------- how they die

/**
 * A life table as Siler's competing hazards: μ(x) = a1 e^(−b1 x) + a2 + a3 e^(b3 x), per year at age x: infant and
 * child deaths falling away, a constant hazard, and ageing rising (Siler, Ecology 60, 1979). Each fitted here to
 * what was measured of that people.
 */
export interface LifeBlock {
  id: string;
  name: string;
  siler: [number, number, number, number, number];
  basis: Basis;
  source: string;
  /** Time runs this much slower for them (an invented long-lived people): the same law, stretched. */
  stretch?: number;
}

export const LIVES: Record<string, LifeBlock> = {
  medieval: {
    id: 'medieval', name: 'a medieval peasant life', siler: [1.0, 3, 0.005, 0.0012, 0.08], basis: 'estimated',
    source: 'fitted to about 28% dying in their first year, a life expectancy at birth near 30, and adults living to about 50 (Razi, Life, Marriage and Death in a Medieval Parish: Halesowen 1270-1400, 1980); medieval figures are estimates, not counts',
  },
  forager: {
    id: 'forager', name: 'a forager life', siler: [0.52, 1.6, 0.016, 0.00005, 0.1], basis: 'measured',
    source: 'fitted to Gurven & Kaplan, Longevity among hunter-gatherers, Population and Development Review 33 (2007): life expectancy at birth about 30, 57% reaching 15, adult deaths most often at 68 to 78',
  },
  modern: {
    id: 'modern', name: 'a modern life', siler: [0.035, 10, 0.0004, 0.000015, 0.1], basis: 'measured',
    source: 'fitted to the UK national life tables 2020-2022 (ONS): life expectancy at birth 78.6 (men) and 82.6 (women), 3.9 infant deaths per 1000 births',
  },
  'long-lived': {
    id: 'long-lived', name: 'a long-lived people', siler: [0.035, 10, 0.0004, 0.000015, 0.1], basis: 'invented', stretch: 3,
    source: 'invented: a modern life table with time running a third as fast for them',
  },
};

/** The hazard of dying at age x, per year. */
export function hazard(l: LifeBlock, x: number): number {
  const s = l.stretch ?? 1, y = x / s;
  const [a1, b1, a2, a3, b3] = l.siler;
  return (a1 * Math.exp(-b1 * y) + a2 + a3 * Math.exp(b3 * y)) / s;
}

/** The chance of dying within the year from age x, with the hazard multiplied by `m`. */
export function dyingWithin(l: LifeBlock, x: number, m = 1): number {
  let H = 0;
  for (let k = 0; k < 4; k++) H += hazard(l, x + (k + 0.5) / 4) / 4;
  return 1 - Math.exp(-H * m);
}

/** The life table a block gives: first-year deaths, life expectancy at birth and at 20, share reaching 15. */
export function lifeTable(l: LifeBlock): { q0: number; e0: number; e20: number; s15: number } {
  const dx = 0.01, S = [1];
  let s = 1;
  for (let i = 1; i <= 360 / dx; i++) {
    s *= Math.exp(-hazard(l, (i - 0.5) * dx) * dx);
    if (i % 100 === 0) S.push(s);
  }
  const ex = (a: number) => { let t = 0; for (let y = a; y < S.length - 1; y++) t += (S[y]! + S[y + 1]!) / 2; return t / S[a]!; };
  return { q0: 1 - S[1]!, e0: ex(0), e20: ex(20), s15: S[15]! };
}

// -------------------------------------------------------------------------------------------- how they bear children

/**
 * Marital fertility as Coale & Trussell's model, r(a) = M n(a) e^(m v(a)) per married woman-year (Population Index 40,
 * 1974; 44, 1978): n(a) the natural fertility of populations that did not limit births (from Henry, 1961), v(a) how
 * limiting births departs from it with age, m how much they limit, M the level.
 */
export const NATURAL = [0.46, 0.46, 0.431, 0.395, 0.322, 0.167, 0.024]; // 15-19 (taken as 20-24), 20-24 ... 45-49
export const CONTROL = [0, 0, -0.279, -0.667, -1.042, -1.414, -1.671];

export interface FertilityBlock { id: string; name: string; M: number; m: number; basis: Basis; source: string }

export const FERTILITIES: Record<string, FertilityBlock> = {
  natural: { id: 'natural', name: 'children as they come', M: 1, m: 0, basis: 'measured', source: 'Coale & Trussell\'s natural fertility schedule n(a), from Henry (1961)' },
  spaced: { id: 'spaced', name: 'children spaced by long nursing', M: 0.7, m: 0, basis: 'estimated', source: 'natural fertility at 70%: foragers\' long nursing spaces births (estimate)' },
  limited: { id: 'limited', name: 'families kept small', M: 0.9, m: 1.6, basis: 'estimated', source: 'Coale & Trussell\'s schedule with births limited (m 1.6, estimate), about two children a couple' },
};

/** Births per married woman-year at age a. */
export function fertilityAt(f: FertilityBlock, a: number): number {
  if (a < 15 || a >= 50) return 0;
  const k = Math.min(6, Math.floor((a - 15) / 5));
  return f.M * NATURAL[k]! * Math.exp(f.m * CONTROL[k]!);
}

// ------------------------------------------------------------------------------------------------ how they marry

export interface MarriageBlock {
  id: string;
  name: string;
  /** Mean age at first marriage, women and men; from what age they marry. */
  women: number;
  men: number;
  from: number;
  /** Whether a couple sets up their own household (and so waits for a holding) or lives with his parents. */
  ownHouse: boolean;
  basis: Basis;
  source: string;
}

export const MARRIAGES: Record<string, MarriageBlock> = {
  late: { id: 'late', name: 'late marriage, a house of their own', women: 26, men: 28, from: 17, ownHouse: true, basis: 'measured', source: 'England 1600-1750, Wrigley & Schofield: women married at 26 on average, men at 28 (the northwest European pattern, Hajnal 1965)' },
  early: { id: 'early', name: 'early marriage, in his parents\' house', women: 19, men: 24, from: 15, ownHouse: false, basis: 'estimated', source: 'outside the northwest European pattern most women married before 21 (Hajnal 1965); the ages are estimates' },
  modern: { id: 'modern', name: 'partnership in their thirties', women: 31, men: 33, from: 18, ownHouse: true, basis: 'estimated', source: 'estimate for recent Britain' },
};

// ----------------------------------------------------------------------------------------- what they call each other

export interface CultureBlock {
  id: string;
  name: string;
  /** Given names, with how common each was; or none, to invent a language's names from its sounds. */
  women?: [string, number][];
  men?: [string, number][];
  /** Surnames: from the work of the house, the father's name, or invented. */
  surnames: 'trade' | 'patronymic' | 'invented';
  basis: Basis;
  source: string;
}

export const CULTURES: Record<string, CultureBlock> = {
  'english-1300s': {
    id: 'english-1300s', name: 'English of the 1300s', surnames: 'trade', basis: 'measured',
    source: 'the poll taxes of 1377-81: John 35% of men, William 18%; Alice 17% of women, Agnes 14%, Joan 12% (Redmonds); the rest in rough order',
    men: [['John', 35], ['William', 18], ['Thomas', 9], ['Richard', 8], ['Robert', 7], ['Henry', 3], ['Roger', 3], ['Walter', 3], ['Adam', 3], ['Hugh', 2], ['Nicholas', 2], ['Geoffrey', 2], ['Ralph', 2], ['Simon', 2]],
    women: [['Alice', 17], ['Agnes', 14], ['Joan', 12], ['Margaret', 8], ['Matilda', 6], ['Isabel', 5], ['Emma', 4], ['Cecily', 3], ['Juliana', 2], ['Margery', 2], ['Edith', 2], ['Christina', 2], ['Beatrice', 2], ['Elena', 2]],
  },
  invented: { id: 'invented', name: 'a language of their own', surnames: 'invented', basis: 'invented', source: 'names made from a sound system drawn fresh for each people' },
};

// ------------------------------------------------------------------------------------------- what work there is

export interface Role { name: string; does: string; share: number; heritable: boolean }

export interface SettingBlock {
  id: string;
  name: string;
  /** Words in a request that call for it. */
  words: string[];
  /** The work there is, with how many households do it. */
  roles: Role[];
  /** The ground it stands on (world/place.ts), and its defaults. */
  place: string;
  life: string;
  fertility: string;
  marriage: string;
  culture: string;
  /** Households it has room for (holdings, stalls, berths), and how many found it. */
  homes: [number, number];
  /** What can befall it (event block ids). */
  events: string[];
  /** A home here is called... */
  home: string;
}

export const SETTINGS: Record<string, SettingBlock> = {
  village: {
    id: 'village', name: 'a farming village', words: ['village', 'villagers', 'hamlet', 'parish', 'peasants', 'manor', 'chronicle'],
    roles: [
      { name: 'husbandman', does: 'farm a holding', share: 0.6, heritable: true },
      { name: 'smith', does: 'work the forge', share: 0.08, heritable: true },
      { name: 'miller', does: 'grind the village\'s grain', share: 0.06, heritable: true },
      { name: 'carpenter', does: 'build and mend', share: 0.08, heritable: true },
      { name: 'weaver', does: 'weave cloth', share: 0.1, heritable: true },
      { name: 'brewer', does: 'brew the ale', share: 0.08, heritable: true },
    ],
    place: 'meadow', life: 'medieval', fertility: 'natural', marriage: 'late', culture: 'english-1300s', homes: [14, 20], events: ['dearth', 'famine', 'pestilence', 'fire', 'flood'], home: 'holding',
  },
  market: {
    id: 'market', name: 'a market town', words: ['market', 'bazaar', 'merchants', 'traders', 'stalls', 'town', 'townsfolk'],
    roles: [
      { name: 'trader', does: 'buy and sell', share: 0.35, heritable: true },
      { name: 'cook', does: 'cook for the market', share: 0.15, heritable: true },
      { name: 'porter', does: 'carry goods', share: 0.15, heritable: false },
      { name: 'tailor', does: 'make clothes', share: 0.1, heritable: true },
      { name: 'money-changer', does: 'change money', share: 0.05, heritable: true },
      { name: 'guard', does: 'keep the peace', share: 0.1, heritable: false },
      { name: 'carter', does: 'haul goods between towns', share: 0.1, heritable: true },
    ],
    place: 'meadow', life: 'medieval', fertility: 'natural', marriage: 'late', culture: 'english-1300s', homes: [18, 26], events: ['dearth', 'pestilence', 'fire', 'boom', 'slump'], home: 'stall',
  },
  band: {
    id: 'band', name: 'a forager band', words: ['band', 'tribe', 'foragers', 'hunters', 'gatherers', 'nomads', 'camp'],
    roles: [
      { name: 'hunter', does: 'hunt', share: 0.4, heritable: false },
      { name: 'gatherer', does: 'gather food', share: 0.45, heritable: false },
      { name: 'healer', does: 'heal the sick', share: 0.15, heritable: true },
    ],
    place: 'meadow', life: 'forager', fertility: 'spaced', marriage: 'early', culture: 'invented', homes: [6, 10], events: ['dearth', 'fever', 'flood', 'feud'], home: 'hearth',
  },
  colony: {
    id: 'colony', name: 'a settlement on a new world', words: ['colony', 'colonists', 'settlers', 'outpost', 'station', 'space-faring', 'civilizations', 'civilization'],
    roles: [
      { name: 'engineer', does: 'keep the machines running', share: 0.25, heritable: false },
      { name: 'grower', does: 'grow the food', share: 0.3, heritable: false },
      { name: 'pilot', does: 'fly the landers', share: 0.1, heritable: false },
      { name: 'medic', does: 'tend the sick', share: 0.1, heritable: false },
      { name: 'teacher', does: 'teach the children', share: 0.1, heritable: false },
      { name: 'miner', does: 'mine ore', share: 0.15, heritable: false },
    ],
    place: 'desert', life: 'modern', fertility: 'limited', marriage: 'modern', culture: 'invented', homes: [16, 24], events: ['fever', 'boom', 'slump', 'accident'], home: 'quarters',
  },
};

// ------------------------------------------------------------------------------------------- what can befall them

export interface EventBlock {
  id: string;
  name: string;
  /** Its chance in any year (when it isn't fixed by history), and how long it lasts. */
  chance: number;
  years: number;
  /** What it does: the death hazard multiplied (children's by `young` more), a one-off chance of death, births multiplied. */
  hazard?: number;
  young?: number;
  kills?: number;
  births?: number;
  /** Homes lost (a fire, a flood) or gained (newcomers in a boom). */
  homesLost?: number;
  newcomers?: number;
  /** How people speak of it afterwards. */
  called: string;
  /** Who it falls on: everyone, or men of fighting age. */
  who?: 'all' | 'men';
  basis: Basis;
  source: string;
}

export const EVENTS: Record<string, EventBlock> = {
  dearth: { id: 'dearth', name: 'a bad harvest', chance: 0.08, years: 1, hazard: 1.4, young: 1.3, births: 0.85, called: 'the hungry year', basis: 'estimated', source: 'estimate: a poor harvest raised deaths and lowered births' },
  famine: { id: 'famine', name: 'a great famine', chance: 0.01, years: 3, hazard: 2, young: 1.2, births: 0.7, called: 'the great hunger', basis: 'measured', source: 'sized on the Great Famine of 1315-17: up to 10-15% of England\'s people died' },
  pestilence: { id: 'pestilence', name: 'a great pestilence', chance: 0.004, years: 1, kills: 0.42, called: 'the great pestilence', basis: 'measured', source: 'sized on the Black Death of 1348-50: 40-45% of England\'s people died' },
  fever: { id: 'fever', name: 'a fever among the children', chance: 0.02, years: 1, kills: 0.06, young: 3, called: 'the children\'s fever', basis: 'measured', source: 'sized on the plague of 1361-62: 10-20% died, children most (the children\'s plague)' },
  fire: { id: 'fire', name: 'a fire', chance: 0.02, years: 1, homesLost: 0.15, called: 'the fire', basis: 'estimated', source: 'estimate' },
  flood: { id: 'flood', name: 'a flood', chance: 0.02, years: 1, hazard: 1.1, homesLost: 0.1, called: 'the flood', basis: 'estimated', source: 'estimate' },
  boom: { id: 'boom', name: 'good years', chance: 0.05, years: 3, births: 1.1, newcomers: 0.15, called: 'the good years', basis: 'estimated', source: 'estimate' },
  slump: { id: 'slump', name: 'hard times', chance: 0.04, years: 2, hazard: 1.15, births: 0.9, called: 'the hard times', basis: 'estimated', source: 'estimate' },
  feud: { id: 'feud', name: 'a feud', chance: 0.03, years: 1, kills: 0.04, who: 'men', called: 'the feud', basis: 'estimated', source: 'estimate' },
  accident: { id: 'accident', name: 'an accident', chance: 0.03, years: 1, kills: 0.03, called: 'the accident', basis: 'estimated', source: 'estimate' },
};

/** History as it happened, for a request that names it: its dated events. */
export interface EraBlock { id: string; name: string; words: string[]; from: number; to: number; events: { year: number; event: string }[]; source: string }

export const ERAS: Record<string, EraBlock> = {
  'england-1300s': {
    id: 'england-1300s', name: 'England, 1290 to 1400', words: ['medieval', 'middle ages', '1300s', '14th century', 'black death', 'plague years', 'england'],
    from: 1290, to: 1400,
    events: [{ year: 1315, event: 'famine' }, { year: 1349, event: 'pestilence' }, { year: 1361, event: 'fever' }],
    source: 'the Great Famine 1315-17; the Black Death, which reached most of England in 1349; the second pestilence of 1361-62',
  },
};

// --------------------------------------------------------------------------------------------- how each is made

/**
 * Temperament as the five broad traits personality research finds (openness, conscientiousness, extraversion,
 * agreeableness, neuroticism): each a standard score, about half inherited (twin studies put 41-61% of each down
 * to genes: Jang, Livesley & Vernon, J. Personality 64, 1996), the rest each person's own.
 */
export const TRAITS = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
export type Trait = (typeof TRAITS)[number];
export const HERITABILITY: Record<Trait, number> = { openness: 0.61, conscientiousness: 0.44, extraversion: 0.53, agreeableness: 0.41, neuroticism: 0.41 };
