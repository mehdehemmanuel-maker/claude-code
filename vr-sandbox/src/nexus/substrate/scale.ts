// Scale. What can be resolved of a system is a relation between a distance, how fast something crosses it, and the
// system's own time: never a size alone. A matter's quantities, and its site's and the universe's, generate the
// mechanisms by their dimensions: a quantity whose dimension already holds a time is a mechanism by itself (a speed,
// a diffusivity, an acceleration, a rate); two quantities that hold no time alone make one by their ratio or product
// (a viscosity over a density, a surface tension over a density, a stiffness over a viscosity). Each mechanism has a
// time that grows with the region's size L as a power, τ = (L^a / P)^(1/b), and nothing here names one.
//
// From the mechanisms everything else follows, generated: where two of them cross (a length the matter makes); which
// pairs never cross (a ratio that no change of scale alters); the regime numbers, as ratios of times at one size;
// the levels, as gaps in the spectrum of times; and what an observer can see, by its support, its window, how long
// it watches and how fast what it learns from travels. Light in vacuum bounds the last: nothing that carries
// information crosses L sooner than L / c, so a mechanism faster than that cannot be seen as one state across L.

import { CONST } from '../book/constants';
import { dimText, type Dim } from './dimension';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { app, variable, type Term } from './term';

/** A quantity a mechanism is made from, and where it comes from: one molecule's quantities describe a body of the molecule's size. */
export interface Quantity { d: Derivation; of: string; molecular?: boolean }

export interface Mechanism {
  /** The factors, as the quantities' names with their powers: the mechanism's whole identity. */
  text: string;
  factors: { name: string; power: number; of: string }[];
  /** P = Π factor^power, of dimension L^a T^-b, with its record. */
  P: Derivation;
  a: number; b: number;
  /** How its time grows with the size: τ ∝ L^(a/b). */
  exponent: number;
  /** One molecule's mechanism: its size is the molecule's, so its time does not grow with the region's. */
  molecular: boolean;
  /** Where its quantities come from: the matter, the site, the universe, the motion. */
  of: string[];
}

export interface Length { text: string; factors: Mechanism['factors']; value: number; record: Derivation; of: string[] }

const MASS = 0, LEN = 1, TIME = 2, CURRENT = 3, TEMP = 4;
const timeless = (d: Dim) => d[TIME] === 0;
const near = (x: number, y: number, rel = 1e-9) => Math.abs(x - y) <= rel * Math.max(Math.abs(x), Math.abs(y));

const termOf = (fs: { name: string; power: number }[], vars: Record<string, Term>): Term => fs.map((f) => (f.power === 1 ? vars[f.name]! : app('pow', [vars[f.name]!], f.power))).reduce((acc, t) => app('mul', [acc, t]));

/**
 * The mechanisms and lengths a set of quantities generates. Singles: a quantity whose dimension is L^a T^-b. Pairs:
 * two quantities that hold no time alone, combined by ±1 powers to L^a T^-b (a time) or L^a (a length) with no mass,
 * current or temperature left. A pair with a quantity that is a mechanism alone is where two mechanisms cross, and
 * is found by `crossings`, not here. Two mechanisms with the same time law are one.
 */
export function generate(qs: Record<string, Quantity>): { mechanisms: Mechanism[]; lengths: Length[] } {
  const names = Object.keys(qs);
  const vars = Object.fromEntries(names.map((n) => [n, variable(n, qs[n]!.d.unit, qs[n]!.d.name)]));
  const env = Object.fromEntries(names.map((n) => [n, qs[n]!.d]));
  const dim = (n: string) => qs[n]!.d.dim as Dim;
  const mechanisms: Mechanism[] = [];
  const lengths: Length[] = [];
  const consider = (fs: { name: string; power: number }[]) => {
    const d = fs.reduce((acc, f) => acc.map((x, i) => x + f.power * dim(f.name)[i]!) as Dim, [0, 0, 0, 0, 0] as Dim);
    if (d[MASS] !== 0 || d[CURRENT] !== 0 || d[TEMP] !== 0) return;
    const factors = fs.map((f) => ({ ...f, of: qs[f.name]!.of }));
    const text = fs.map((f) => (f.power === 1 ? qs[f.name]!.d.name : `1 / ${qs[f.name]!.d.name}`)).join(' · ');
    const of = [...new Set(factors.map((f) => f.of))];
    if (d[TIME] < 0) {
      const P = evaluate(text, termOf(fs, vars), env, { unit: dimText(d), law: 'a mechanism: the quantities\' product, of dimension L^a T^-b' });
      const pv = P.value;
      if (pv === null || !(pv > 0)) return;
      const a = d[LEN], b = -d[TIME];
      const m: Mechanism = { text, factors, P, a, b, exponent: a / b, molecular: fs.some((f) => qs[f.name]!.molecular), of };
      // two mechanisms with one time law are one: the same exponent and the same coefficient P^(1/b)
      if (!mechanisms.some((x) => near(x.exponent, m.exponent) && x.molecular === m.molecular && near(x.P.value! ** (1 / x.b), pv ** (1 / b)))) mechanisms.push(m);
    } else if (timeless(d) && d[LEN] > 0) {
      const record = evaluate(text, termOf(fs, vars), env, { unit: dimText(d), law: 'a length: the quantities\' product, of dimension L^a' });
      if (record.value === null || !(record.value > 0)) return;
      const value = record.value ** (1 / d[LEN]);
      if (!lengths.some((x) => near(x.value, value))) lengths.push({ text: d[LEN] === 1 ? text : `(${text})^(1/${d[LEN]})`, factors, value, record, of });
    }
  };
  // a single quantity, either way up: a speed is a mechanism, and so is a lifetime
  const alone = (n: string) => dim(n)[TIME] !== 0 && dim(n)[MASS] === 0 && dim(n)[TEMP] === 0 && dim(n)[CURRENT] === 0;
  for (const n of names) for (const p of [1, -1]) consider([{ name: n, power: p }]);
  // two quantities that hold no time alone, so that the time comes from their meeting
  const still = names.filter((n) => !alone(n));
  for (let i = 0; i < still.length; i++) for (let j = i + 1; j < still.length; j++) for (const p of [1, -1]) for (const q of [1, -1]) consider([{ name: still[i]!, power: p }, { name: still[j]!, power: q }]);
  return { mechanisms, lengths };
}

/** The molecule's own size, the length a molecular mechanism lives at: the cube root of the molecule's volume, when the lengths hold one. */
export const molecularSize = (lengths: Length[], qs: Record<string, Quantity>): Length | null => {
  const is = (f: Mechanism['factors'][number], d: Dim) => (qs[f.name]!.d.dim as Dim).every((x, i) => x === d[i]);
  return lengths.find((x) => x.factors.length === 2 && x.factors.some((f) => qs[f.name]!.molecular && is(f, [1, 0, 0, 0, 0])) && x.factors.some((f) => is(f, [1, -3, 0, 0, 0]))) ?? null;
};

/** A mechanism's time at a size: τ = (L^a / P)^(1/b). A molecular one is evaluated at the molecule's size, whatever the region's. */
export const timeOf = (m: Mechanism, L: number, molecule: number | null = null): number => {
  const at = m.molecular && molecule !== null ? molecule : L;
  return (at ** m.a / m.P.value!) ** (1 / m.b);
};

/** The time a mechanism's law gives at a size, as a record citing the mechanism. */
export function timeRecord(m: Mechanism, L: Derivation): Derivation {
  const Lv = variable('L', 'm', 'size'), Pv = variable('P', m.P.unit, m.text);
  return evaluate(`time of ${m.text} across ${L.name}`, app('pow', [app('div', [app('pow', [Lv], m.a), Pv])], 1 / m.b), { L, P: m.P }, { unit: 's', law: 'a mechanism\'s time at a size: (L^a / P)^(1/b)' });
}

export interface Crossing {
  a: Mechanism; b: Mechanism; length: number;
  /** Whether the length lies where the quantities that made it hold: above the molecule's size, within the largest size the site holds. */
  inside: boolean; beneath: boolean; beyond: boolean;
}
export interface Invariant { a: Mechanism; b: Mechanism; ratio: number }

/**
 * Where two mechanisms' times are equal: a length the matter makes. Two with one exponent never cross: their ratio
 * is scale-free. A molecular mechanism has the molecule's size, so its time is a constant. A length below the
 * molecule is beneath what the matter's averaged quantities describe; one beyond the largest size the site holds is
 * beyond what the site's uniform quantities describe.
 */
export function crossings(ms: Mechanism[], molecule: number | null = null, largest: number = Infinity): { crossings: Crossing[]; invariants: Invariant[] } {
  const crossings: Crossing[] = [], invariants: Invariant[] = [];
  // each mechanism as τ = L^e / c
  const law = (m: Mechanism) => (m.molecular ? { e: 0, c: 1 / timeOf(m, molecule ?? 0, molecule) } : { e: m.exponent, c: m.P.value! ** (1 / m.b) });
  const usable = ms.filter((m) => !m.molecular || molecule !== null);
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const a = usable[i]!, b = usable[j]!, la = law(a), lb = law(b);
    if (near(la.e, lb.e)) { invariants.push({ a, b, ratio: lb.c / la.c }); continue; }
    const length = (la.c / lb.c) ** (1 / (la.e - lb.e));
    const beneath = molecule !== null && length < molecule, beyond = length > largest;
    crossings.push({ a, b, length, inside: !beneath && !beyond, beneath, beyond });
  }
  return { crossings, invariants };
}

/** The causal bound: light in vacuum, the fastest anything that carries information crosses a size. */
export const causal = (): Quantity => ({ d: ofLeaf(CONST.c), of: 'the universe' });

/** The times at a size, fastest first. */
export const spectrum = (ms: Mechanism[], L: number, molecule: number | null) => ms.map((m) => ({ m, t: timeOf(m, L, molecule) })).sort((x, y) => x.t - y.t);

/**
 * Levels: bands of the spectrum separated by a gap. Where consecutive times differ by more than the gap, what is
 * faster is seen from above only by its averages, and what is slower only as fixed: a level of organization is a band
 * whose times are close to each other and far from the next. The gap is a declared judgment, never found.
 */
export function levels(ms: Mechanism[], L: number, molecule: number | null, gap: number): { m: Mechanism; t: number }[][] {
  const sp = spectrum(ms, L, molecule);
  const out: { m: Mechanism; t: number }[][] = [];
  for (const x of sp) { const last = out.at(-1); if (last && x.t / last.at(-1)!.t <= gap) last.push(x); else out.push([x]); }
  return out;
}

export interface Observer {
  name: string;
  /** The smallest size it tells apart. */
  support: number;
  /** The shortest time it tells apart. */
  window: number;
  /** How long it watches. */
  duration: number;
  /** How fast what it learns from travels. */
  speed: number;
}

export type Seen = 'averaged' | 'resolved' | 'fixed';
export interface Sight { m: Mechanism; t: number; seen: Seen; across: boolean }

/**
 * What an observer sees of each mechanism of a region of size L. Faster than its window, only the mechanism's average
 * reaches it: the mechanism is invisible and its effect is a constant of whatever law the observer writes. Slower than
 * its watch, the mechanism never acts: it is a fixed condition. Between, it is resolved. And a mechanism faster than
 * the time what the observer learns from takes to cross L changes before the region can be seen as one state.
 */
export function observe(ms: Mechanism[], L: number, molecule: number | null, o: Observer): { sights: Sight[]; unresolvedLengths: (lengths: Length[]) => Length[] } {
  const crossing = L / o.speed;
  const sights = spectrum(ms, L, molecule).map(({ m, t }) => ({ m, t, seen: (t < o.window ? 'averaged' : t > o.duration ? 'fixed' : 'resolved') as Seen, across: t < crossing }));
  return { sights, unresolvedLengths: (lengths) => lengths.filter((l) => l.value < o.support) };
}
