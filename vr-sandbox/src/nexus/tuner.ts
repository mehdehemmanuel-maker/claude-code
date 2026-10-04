// The scale tuner: scale as a change of generative regime, never a change of magnification. For any size, and any
// temperature, what the world must be for it to stay lawful there is derived from the constants and from what the
// derivation itself finds at smaller sizes, never from a list of regimes. Nothing here names an atom, a planet or a
// star; those words appear only in the tests, as the evidence the derivations are checked against.
//
// Four steps, each a derivation with its lineage:
//
// 1. How many independent scale axes reality leaves. The constants' dimension matrix decides it by linear algebra.
//    With the quantum of action, the speed of light and the Boltzmann constant, length, time, energy, temperature,
//    frequency and mass are one axis (L = ħc/E, t = ħ/E, T = E/k, m = E/c²): time is one face of it, not a coordinate
//    of its own. With gravitation as well, no free direction is left and the axis is anchored.
// 2. The energies a size has. An agent that carries an energy relation (a coupling, the quantum of action, the thermal
//    energy, the speed of light) combined with the masses and densities its dimension needs, as E(L) = M / L^n. Each
//    is an interaction (a coupling), a motion (action or heat), a rest energy (light's speed with a mass), or the
//    binding of a structure found below.
// 3. Where they meet. Two energies with one dependence on size have a ratio no change of scale alters: a coupling
//    strength. Two with different dependences cross at a size, and below and above it different energies win: a
//    regime boundary. Which kind wins on which side says what the boundary is: a size structures settle at (an
//    attraction wins above, a motion below), the size an attraction holds things within (it wins below, a motion
//    above), the size below which confining a mass costs more than its rest energy, the size above which a
//    structure's gravity exceeds its own binding.
// 4. Recursion. A size structures settle at is a structure: its size, its binding, its mass and its density are new
//    quantities, and every larger size is derived again with them. What the derivation finds at one level is the
//    environment of the next.
//
// At a target size and temperature (`regimeAt`) the tuner then derives what dominates and what is negligible, which
// state variables are needed (bound or free, quantum or classical, relativistic or not), every characteristic time and
// frequency, the causal latency, how each time and each boundary moves with temperature, and what an observer must
// spend to resolve that size. Factors of order one that the dimensions cannot see (2π, ½) are not claimed.

import { CONST } from './book/constants';
import { dimText, integerNullSpace, type Dim } from './dimension';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { app, div, k, leaf, mul, pow, variable, type Term } from './term';

/** What a quantity does in an energy relation: the role is declared once per quantity, never per size or per regime. */
export type Role = 'coupling' | 'action' | 'thermal' | 'speed' | 'mass' | 'density' | 'binding';
export interface Q {
  key: string; d: Derivation; role: Role; of: string;
  /** A particle's identity where it matters to an interaction: its charge, in units of the elementary charge. */
  charge?: number;
  /** A density's unit: the key of the mass of one unit of the matter it is the density of. */
  unit?: string;
}

const v = (key: string, d: Derivation) => variable(key, d.unit, d.name);
const dimOfQ = (q: Q) => q.d.dim as Dim;
const near = (x: number, y: number, rel = 1e-9) => Math.abs(x - y) <= rel * Math.max(Math.abs(x), Math.abs(y));

/**
 * The universe's quantities: the constants, and what the constants derive. The quantum of action is h over 2π; the
 * elementary charge is the Faraday constant over Avogadro's number, which is the gas constant over Boltzmann's; the
 * electric coupling of two unit charges is the Coulomb constant times it squared. A temperature, when one is given,
 * adds the thermal energy.
 */
export function universe(T?: Derivation): Q[] {
  const h = ofLeaf(CONST.h), R = ofLeaf(CONST.R), kB = ofLeaf(CONST.kB), F = ofLeaf(CONST.F), kC = ofLeaf(CONST.kC);
  const hbar = evaluate('the quantum of action ħ', div(v('h', h), k(2 * Math.PI, '2π')), { h }, { unit: 'J s', law: 'ħ = h / 2π' });
  const NA = evaluate('Avogadro number', div(v('R', R), v('kB', kB)), { R, kB }, { unit: '1/mol', law: 'N_A = R / k_B' });
  const e = evaluate('elementary charge', div(v('F', F), v('NA', NA)), { F, NA }, { unit: 'C', law: 'e = F / N_A' });
  const q2 = evaluate('electric coupling of two unit charges', mul(v('kC', kC), pow(v('e', e), 2)), { kC, e }, { unit: 'J m', law: 'k_C e²: the energy of two unit charges a metre apart, times a metre' });
  const qs: Q[] = [
    { key: 'G', d: ofLeaf(CONST.G), role: 'coupling', of: 'gravitation' },
    { key: 'q2', d: q2, role: 'coupling', of: 'the electric interaction' },
    { key: 'hbar', d: hbar, role: 'action', of: 'the quantum of action' },
    { key: 'c', d: ofLeaf(CONST.c), role: 'speed', of: 'the speed of light' },
    // a particle is a mass with the identities a change conserves; its charge decides whom the electric coupling joins
    { key: 'me', d: ofLeaf(CONST.me), role: 'mass', of: 'the electron', charge: -1 },
    { key: 'mu', d: ofLeaf(CONST.mu), role: 'mass', of: 'the nucleon that carries the positive charge', charge: 1 },
  ];
  if (T) qs.push({ key: 'kT', d: evaluate('thermal energy', mul(v('kB', kB), v('T', T)), { kB, T }, { unit: 'J', law: 'k_B T: the energy per degree of freedom' }), role: 'thermal', of: 'the temperature' });
  return qs;
}

// ---- 1. the scale axes ---------------------------------------------------------------------------------------------

/**
 * How many independent scale directions a set of constants leaves among mass, length, time and temperature: four less
 * the rank of their dimension matrix. And, where none is left, each base dimension as a monomial of the constants
 * (exponents from the matrix's null space with the target appended): the units the constants themselves set.
 */
export function axes(qs: Q[]): { free: number; units: { of: string; exponents: Record<string, number>; value: number }[] } {
  const rows = [0, 1, 2, 4].map((r) => qs.map((q) => dimOfQ(q)[r]!));
  const rank = qs.length - integerNullSpace(rows, qs.length).length;
  const free = 4 - rank;
  const units: { of: string; exponents: Record<string, number>; value: number }[] = [];
  if (free === 0) for (const [base, r] of [['length', 1], ['time', 2], ['mass', 0], ['temperature', 4]] as const) {
    // Π q^x = a unit of the base: the null vector of the matrix with −(the base) appended, scaled to 1 there
    const target = [0, 1, 2, 4].map((x) => (x === r ? -1 : 0));
    const ns = integerNullSpace(rows.map((row, i) => [...row, target[i]!]), qs.length + 1);
    const vec = ns.find((x) => x[qs.length] !== 0);
    if (!vec) continue;
    const exps = vec.slice(0, qs.length).map((x) => x / vec[qs.length]!);
    units.push({ of: base, exponents: Object.fromEntries(qs.map((q, i) => [q.key, exps[i]!]).filter(([, x]) => x !== 0)), value: qs.reduce((acc, q, i) => acc * q.d.value! ** exps[i]!, 1) });
  }
  return { free, units };
}

// ---- 2. the energies a size has -------------------------------------------------------------------------------------

export type Kind = 'interaction' | 'motion' | 'rest' | 'binding';
/** An energy at a size: E(L) = M / L^n, with M a product of quantities and its record. */
/**
 * What an energy is the energy of: one particle or a pair of them (a coupling between two, a motion of one, a rest
 * energy, a structure's binding), one unit inside a body (with a density and its unit's mass), or a whole body (with a
 * density alone). Dimensions cannot tell them apart; energies are compared only when they are of the same thing.
 */
export type Of = 'particle' | 'unit in a body' | 'body';
export interface Form { text: string; factors: { q: Q; p: number }[]; n: number; M: Derivation; kind: Kind; of: Of }

const kindOf = (role: Role): Kind | null => (role === 'coupling' ? 'interaction' : role === 'action' || role === 'thermal' ? 'motion' : role === 'speed' ? 'rest' : role === 'binding' ? 'binding' : null);

/**
 * Every energy a size has: one agent (a coupling, the action, the thermal energy, light's speed, a structure's
 * binding) to the first or second power, with up to two of the masses, densities and light's speed its dimension needs,
 * so that the product is an energy times a length to an integer power. Forms equal at every size are one.
 */
export function forms(qs: Q[]): Form[] {
  const out: Form[] = [];
  const agents = qs.filter((q) => kindOf(q.role)), partners = qs.filter((q) => q.role === 'mass' || q.role === 'density' || q.role === 'speed');
  const powers = [2, 1, -1, -2];
  const consider = (fs: { q: Q; p: number }[]) => {
    // a density stands only with the mass of one unit of its own matter, or with itself: a body of that matter
    for (const f of fs) if (f.q.role === 'density' && !fs.every((g) => g === f || g.q.role === 'action' || g.q.role === 'coupling' || g.q.role === 'speed' || g.q.key === f.q.unit || g.q === f.q)) return;
    // light's speed with a density is a body's rest energy: the density alone
    if (fs[0]!.q.role === 'speed' && fs.some((f) => f.q.role === 'density') && fs.some((f) => f.q.role === 'mass')) return;
    // the electric coupling joins charges: what it is combined with must carry one
    if (fs[0]!.q.key === 'q2' && fs.slice(1).some((f) => { const unit = f.q.role === 'density' ? qs.find((x) => x.key === f.q.unit) : f.q; return f.q.role !== 'speed' && !(unit?.charge); })) return;
    // the quantum of action with a density would need the density to a fractional power (confinement among neighbours
    // goes as the number density to the two-thirds): integer powers cannot say it, and it is not generated (a located lack)
    if (fs[0]!.q.role === 'action' && fs.some((f) => f.q.role === 'density')) return;
    const d = fs.reduce((acc, f) => acc.map((x, i) => x + f.p * dimOfQ(f.q)[i]!) as Dim, [0, 0, 0, 0, 0] as Dim);
    if (d[0] !== 1 || d[2] !== -2 || d[3] !== 0 || d[4] !== 0) return;
    const n = d[1]! - 2;
    if (n < -5 || n > 3) return;
    const vars = Object.fromEntries(fs.map((f) => [f.q.key, v(f.q.key, f.q.d)]));
    const term: Term = fs.map((f): Term => (f.p === 1 ? vars[f.q.key]! : pow(vars[f.q.key]!, f.p))).reduce((a, b) => mul(a, b));
    const text = fs.map((f) => (f.p === 1 ? f.q.key : `${f.q.key}^${f.p}`)).join(' ');
    const M = evaluate(`energy form ${text} (times L^${n})`, term, Object.fromEntries(fs.map((f) => [f.q.key, f.q.d])), { unit: dimText(d), law: 'an energy a size has: an agent with what its dimension needs' });
    if (M.value === null || !(M.value > 0)) return;
    if (out.some((x) => x.n === n && near(x.M.value!, M.value!))) return;
    const dens = fs.filter((f) => f.q.role === 'density');
    const of: Of = !dens.length ? 'particle' : fs.some((f) => dens.some((d) => d.q.unit === f.q.key)) ? 'unit in a body' : 'body';
    out.push({ text, factors: fs, n, M, kind: kindOf(fs[0]!.q.role)!, of });
  };
  for (const a of agents) for (const pa of a.role === 'action' || a.role === 'speed' ? [1, 2] : [1]) {
    consider([{ q: a, p: pa }]);
    // a thermal energy and a structure's binding are energies already: they take nothing with them
    if (a.role === 'thermal' || a.role === 'binding') continue;
    for (let i = 0; i < partners.length; i++) for (const p of powers) {
      if (partners[i] === a) continue;
      consider([{ q: a, p: pa }, { q: partners[i]!, p }]);
      for (let j = i + 1; j < partners.length; j++) for (const p2 of powers) if (partners[j] !== a) consider([{ q: a, p: pa }, { q: partners[i]!, p }, { q: partners[j]!, p: p2 }]);
    }
  }
  // a form that is another with the same agent and the same dependence on size, times a ratio of partners that is
  // dimensionless (a mass ratio), is the same relation: only the form that needs the fewest partners is kept
  const sameAgent = (x: Form, y: Form) => x.factors[0]!.q === y.factors[0]!.q && x.factors[0]!.p === y.factors[0]!.p && x.n === y.n;
  return out.filter((f) => !out.some((g) => g !== f && sameAgent(f, g) && g.factors.length < f.factors.length)).sort((x, y) => x.factors.length - y.factors.length);
}

export const energyAt = (f: Form, L: number) => f.M.value! / L ** f.n;

// ---- 3. where the energies meet ---------------------------------------------------------------------------------------

export interface Invariant { a: Form; b: Form; ratio: Derivation }
export type Boundary = 'settles' | 'holds within' | 'holds beyond' | 'exceeds rest' | 'exceeds binding' | 'crosses';
export interface Crossing {
  a: Form; b: Form;
  /** The size where they are equal, and the energy there, as records. */
  L: Derivation; E: Derivation;
  /** What wins below the size and above it. */
  below: Form; above: Form;
  boundary: Boundary;
}

/**
 * Where every pair of energies meets. One dependence on size: a ratio no scale alters, a coupling strength. Two: a
 * size, with what wins on each side and what that makes the size.
 */
export function meet(fs: Form[]): { invariants: Invariant[]; crossings: Crossing[] } {
  const invariants: Invariant[] = [], crossings: Crossing[] = [];
  for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
    const a = fs[i]!, b = fs[j]!;
    // a particle's, a pair's and a unit's energies are energies of one unit, comparable; a body's only with a body's
    if ((a.of === 'body') !== (b.of === 'body')) continue;
    const A = variable('A', a.M.unit, a.text), B = variable('B', b.M.unit, b.text);
    if (a.n === b.n) {
      // only between an interaction and something else is the ratio a coupling's strength; between two of one kind it is a ratio of masses
      if (a.kind === b.kind) continue;
      invariants.push({ a, b, ratio: evaluate(`${a.text} over ${b.text}`, div(A, B), { A: a.M, B: b.M }, { unit: '1', law: 'two energies with one dependence on size: their ratio is the same at every size' }) });
      continue;
    }
    const L = evaluate(`size where ${a.text} meets ${b.text}`, pow(div(A, B), 1 / (a.n - b.n)), { A: a.M, B: b.M }, { unit: 'm', law: 'where two energies of a size are equal: (M_a / M_b)^(1/(n_a − n_b))' });
    if (L.value === null || !Number.isFinite(L.value)) continue;
    const Lv = variable('L', 'm', 'the size');
    const E = evaluate(`energy where ${a.text} meets ${b.text}`, div(A, pow(Lv, a.n)), { A: a.M, L }, { unit: 'J', law: 'the energy there' });
    if (!sameUnit(a, b, L.value)) continue;
    const below = a.n > b.n ? a : b, above = below === a ? b : a;
    const boundary: Boundary =
      above.kind === 'interaction' && below.kind === 'motion' && above.n > 0 ? 'settles'
      : below.kind === 'interaction' && above.kind === 'motion' ? 'holds within'
      : (below.kind === 'rest') !== (above.kind === 'rest') ? 'exceeds rest'
      : above.kind === 'interaction' && above.n < 0 && below.kind === 'binding' ? 'exceeds binding'
      : above.kind === 'interaction' && above.n < 0 && below.kind === 'motion' ? 'holds beyond'
      : 'crosses';
    crossings.push({ a, b, L, E, below, above, boundary });
  }
  return { invariants, crossings };
}

/**
 * Whether two energies that meet at a size are energies of one unit there, so that their meeting is a boundary and not
 * a false analogy. Each form is the energy of the units its masses, densities and bindings are of. Two forms of named
 * units must share one. A form of no unit belongs to whichever unit it can act on: the thermal energy to any; the
 * electric coupling alone to a charged one; the quantum of action with light's speed (ħc/L) to a unit only where the
 * size is within its Compton length, where its motion is that. And a unit's own quantum motion ħ²/(m L²) is its motion
 * only outside that length.
 */
function sameUnit(a: Form, b: Form, L: number): boolean {
  const hbar = CONST.h.value! / (2 * Math.PI), c = CONST.c.value!;
  // the Compton length, with the boundary itself on both sides of it: the two motions meet there
  const compton = (m: number) => hbar / (m * c), inside = (m: number) => L < compton(m) * (1 - 1e-9), within = (m: number) => L <= compton(m) * (1 + 1e-9);
  const units = (f: Form) => new Set(f.factors.filter((x) => x.q.role === 'mass' || x.q.role === 'density' || x.q.role === 'binding').map((x) => x.q.of));
  const masses = (f: Form) => f.factors.filter((x) => x.q.role === 'mass').map((x) => x.q);
  const lightMotion = (f: Form) => f.kind === 'motion' && f.factors[0]!.q.role === 'action' && f.factors.some((x) => x.q.role === 'speed') && !masses(f).length;
  const heavyMotion = (f: Form) => f.kind === 'motion' && f.factors[0]!.q.role === 'action' && masses(f).length > 0;
  const bareElectric = (f: Form) => f.factors.length === 1 && f.factors[0]!.q.key === 'q2';
  for (const f of [a, b]) if (heavyMotion(f) && masses(f).some((m) => inside(m.d.value!))) return false;
  const [ua, ub] = [units(a), units(b)];
  if (ua.size && ub.size) return [...ua].some((x) => ub.has(x));
  const free = ua.size ? b : a, named = free === a ? b : a;
  if (free.kind === 'motion' && free.factors[0]!.q.role === 'thermal') return true;
  if (lightMotion(free)) { const ms = masses(named); return !ms.length || within(Math.min(...ms.map((m) => m.d.value!))); }
  if (bareElectric(free)) return masses(named).every((m) => !!m.charge);
  return true;
}

// ---- 4. recursion: what settles below is the environment above --------------------------------------------------

export interface Structure { key: string; at: Crossing; size: Derivation; binding: Derivation; mass: Derivation; density: Derivation; level: number; charge: number; parts: Q[] }

/**
 * Structures and the ladder they make. A size where an attraction wins above and a motion below is where things
 * settle: a structure. Its mass is its constituents', the masses the quantity set holds (a declared assumption: the
 * attraction joins the lightest particle to the heaviest, as opposite charges must be carried by something). Its
 * density and its binding are new quantities, and the energies and crossings are derived again with them. How many
 * levels there are is the derivation's to find: it stops at the level that settles nothing new. `depth` only caps it
 * where a caller wants fewer, and `closed` says whether the ladder stopped by itself.
 */
export function ladder(base: Q[], depth = Infinity): { levels: { qs: Q[]; forms: Form[]; invariants: Invariant[]; crossings: Crossing[]; structures: Structure[] }[]; closed: boolean } {
  const levels: ReturnType<typeof ladder>['levels'] = [];
  let qs = base, closed = false;
  const seen = new Set<string>();
  // a guard, not a depth: a ladder that has not closed after this many levels is reported open, never cut silently
  const guard = Math.min(depth, 64);
  for (let level = 0; level <= guard; level++) {
    const fs = forms(qs), { invariants, crossings } = meet(fs);
    const structures: Structure[] = [];
    // heat takes apart what binds weaker than the thermal energy around it; with no temperature given, nothing in
    // contact with the universe is colder than what it sees, the cosmic background
    const thermal = qs.find((q) => q.role === 'thermal')?.d.value ?? CONST.kB.value! * CONST.Tcmb.value!;
    for (const c of crossings.filter((x) => x.boundary === 'settles')) {
      // what moves is the particle of the motion's mass; what holds it must attract it to something. The electric
      // coupling attracts only opposite charges; gravitation attracts any mass, the particle to another like it
      const moving = c.below.factors.find((f) => f.q.role === 'mass')?.q;
      if (!moving) continue;
      const coupling = c.above.factors[0]!.q;
      const electric = coupling.key === 'q2';
      const partner = electric ? qs.find((q) => q.role === 'mass' && q !== moving && moving.charge !== undefined && q.charge !== undefined && Math.sign(q.charge) === -Math.sign(moving.charge) && moving.charge !== 0) : moving;
      if (!partner) continue;
      // one pair settles once: its motion is the lighter particle's, which sets the larger size. The pair is chosen
      // first, and then tested whole against the heat around it
      const key = [coupling.key, ...[moving.key, partner.key].sort()].join('|');
      if (seen.has(key)) continue;
      const lighter = crossings.filter((x) => x.boundary === 'settles' && x.above === c.above).filter((x) => { const mv = x.below.factors.find((f) => f.q.role === 'mass')?.q; return mv === moving || mv === partner; }).sort((x, y) => y.L.value! - x.L.value!)[0]!;
      if (lighter !== c) continue;
      seen.add(key);
      if (c.E.value! <= thermal) continue;
      const parts = partner === moving ? [moving, moving] : [moving, partner];
      const mvars = { m1: v('m1', parts[0]!.d), m2: v('m2', parts[1]!.d) };
      const mass = evaluate(`mass of what settles at ${c.L.name}`, app('add', [mvars.m1, mvars.m2]), { m1: parts[0]!.d, m2: parts[1]!.d }, { unit: 'kg', law: 'a structure\'s mass is its constituents\'' });
      const Lv = variable('L', 'm', 'its size'), mv = variable('m', 'kg', 'its mass');
      const density = evaluate(`density of what settles at ${c.L.name}`, div(mv, pow(Lv, 3)), { m: mass, L: c.L }, { unit: 'kg/m^3', law: 'its mass over its size cubed' });
      structures.push({ key, at: c, size: c.L, binding: c.E, mass, density, level, charge: (parts[0]!.charge ?? 0) + (parts[1]!.charge ?? 0), parts });
    }
    levels.push({ qs, forms: fs, invariants, crossings, structures });
    if (!structures.length) { closed = true; break; }
    qs = [...qs, ...structures.flatMap((s, i) => {
      const of = `what settles at ${Number(s.size.value!.toPrecision(3))} m`;
      return [
        { key: `m${level}${i}`, d: s.mass, role: 'mass' as Role, of, charge: s.charge },
        { key: `rho${level}${i}`, d: s.density, role: 'density' as Role, of, unit: `m${level}${i}` },
        { key: `Eb${level}${i}`, d: s.binding, role: 'binding' as Role, of },
      ];
    })];
  }
  return { levels, closed };
}

// ---- the regime at a size -------------------------------------------------------------------------------------------

export interface Regime {
  L: number; T: number | null;
  /** The energies of one unit at the size (a particle, a pair, a unit inside a body), largest first, and the strongest of each kind. */
  energies: { f: Form; E: number }[];
  strongest: Partial<Record<Kind, { f: Form; E: number }>>;
  /** A whole body's energies at the size, apart: they decide whether a body of that size collapses. */
  bodies: { f: Form; E: number }[];
  /** Unit energies more than the gap below the largest: negligible here. */
  negligible: Form[];
  /** What the state at this size must say, each decided by which energies win. */
  state: {
    /** whether the electric attraction holds its lightest charge at this size, against that particle's own motion and the heat */
    bound: boolean | null;
    /** whether the lightest particle's confinement exceeds the heat: discrete states, not a continuum of them */
    quantum: boolean | null;
    /** whether confining the lightest particle costs more than its rest energy: particles can be made */
    relativistic: boolean;
    /** whether a unit's gravity in a body of this size exceeds the unit's own binding */
    crushed: boolean | null;
    /** whether a unit's gravity in a body of this size exceeds the heat: the body holds itself together */
    selfHeld: boolean | null;
    /** whether a body's own gravity exceeds its rest energy */
    collapses: boolean | null;
    /** whether the size lies below the length the constants set by themselves, where no kept law holds */
    lawless: boolean;
  };
  /** Every characteristic time: each unit energy's quantum time, the time it moves its mass across the size, light's crossing. */
  times: { of: string; t: number; tempExponent: number }[];
  /** Boundaries within a decade of the size: a regime changes near here. */
  near: Crossing[];
  /** What it takes to resolve the size, and whether that breaks the most fragile structure found. */
  observer: { byLight: number; byElectron: number; weakestBinding: number | null; disturbs: boolean };
  /** Every structure the ladder found, at every level. */
  structures: Structure[];
}

/**
 * The sizes the derivation reaches. Below: the length the constants set by themselves, once gravitation joins the
 * quantum, light and heat and no scale direction is left free (step 1). There a confined energy's own gravity is as
 * large as the energy, and the quantum and gravitation can no longer be told apart: no kept law describes it. Above:
 * the largest boundary the ladder derives; past it nothing new is found, which is not the same as nothing new being
 * there.
 */
export function reach(depth = Infinity): { least: number; most: number } {
  const [G, , hbar, c] = universe();
  const kB: Q = { key: 'kB', d: ofLeaf(CONST.kB), role: 'thermal', of: 'the Boltzmann constant' };
  const least = axes([hbar!, c!, G!, kB]).units.find((u) => u.of === 'length')!.value;
  const most = Math.max(...ladder(universe(), depth).levels.flatMap((l) => l.crossings.map((x) => x.L.value!)));
  return { least, most };
}
let reached: { least: number; most: number } | null = null;
/** The sizes the derivation reaches, derived once. */
export const reached0 = () => (reached ??= reach());

/** A ladder is a pure function of its temperature and depth: derived once for each. */
const ladders = new Map<string, ReturnType<typeof ladder>>();
/** The ladder at a temperature (none: the universe's background), derived once and kept. */
export function ladderAt(T: number | null, depth = Infinity): ReturnType<typeof ladder> {
  const key = `${T}|${depth}`;
  let l = ladders.get(key);
  if (!l) { l = ladder(universe(T === null ? undefined : ofLeaf(leaf('temperature', T, 'K', { class: 'given', by: 'the tuner', grounds: 'the temperature the regime is derived at' }))), depth); ladders.set(key, l); }
  return l;
}

/** The regime at size L (and temperature T): everything derived from the energies at that size. */
export function regimeAt(L: number, T: number | null, gap = 100, depth = Infinity): Regime {
  const build = (Tx: number | null) => ladderAt(Tx, depth);
  const lad = build(T), top = lad.levels.at(-1)!;
  const at = (fs: Form[]) => fs.map((f) => ({ f, E: energyAt(f, L) })).sort((a, b) => b.E - a.E);
  const energies = at(top.forms.filter((f) => f.of !== 'body')), bodies = at(top.forms.filter((f) => f.of === 'body'));
  const strongest: Regime['strongest'] = {};
  for (const e of energies) if (!strongest[e.f.kind]) strongest[e.f.kind] = e;
  const negligible = energies.filter((e) => e.E < energies[0]!.E / gap).map((e) => e.f);
  const hbar = top.qs.find((q) => q.key === 'hbar')!.d.value!, c = CONST.c.value!;
  const kT = T === null ? null : CONST.kB.value! * T;
  const masses = top.qs.filter((q) => q.role === 'mass').sort((a, b) => a.d.value! - b.d.value!);
  const lightest = masses[0]!, lightestCharged = masses.find((m) => m.charge) ?? null;
  // a particle confined to a size moves with the smaller of its two confinement energies: ħ²/(m L²) while that is below
  // its rest energy, and ħc/L once it is not (the switch is at its Compton length, derived, never set)
  const confine = (m: Q) => Math.min(hbar ** 2 / (m.d.value! * L ** 2), (hbar * c) / L);
  const electric = top.forms.find((f) => f.factors.length === 1 && f.factors[0]!.q.key === 'q2');
  const unitGravity = top.forms.find((f) => f.of === 'unit in a body' && f.kind === 'interaction' && f.factors[0]!.q.key === 'G');
  const binding = top.forms.find((f) => f.kind === 'binding');
  const bodyGravity = top.forms.find((f) => f.of === 'body' && f.kind === 'interaction'), bodyRest = top.forms.find((f) => f.of === 'body' && f.kind === 'rest');
  const state: Regime['state'] = {
    bound: electric && lightestCharged ? energyAt(electric, L) > Math.max(confine(lightestCharged), kT ?? 0) : null,
    quantum: kT === null ? null : confine(lightest) > kT,
    relativistic: hbar ** 2 / (lightest.d.value! * L ** 2) > lightest.d.value! * c ** 2,
    crushed: unitGravity && binding ? energyAt(unitGravity, L) > energyAt(binding, L) : null,
    selfHeld: unitGravity && kT !== null ? energyAt(unitGravity, L) > kT : null,
    collapses: bodyGravity && bodyRest ? energyAt(bodyGravity, L) > energyAt(bodyRest, L) : null,
    lawless: L < reached0().least,
  };
  // times of one unit: each energy's quantum time ħ/E; the time each energy moves the mass it acts on across L (the
  // mass in its form, or each particle's where the form holds none); light's crossing
  const timesAt = (Tx: number | null) => {
    const l2 = Tx === T ? top : build(Tx).levels.at(-1)!;
    const ms = l2.qs.filter((q) => q.role === 'mass');
    const out = new Map<string, number>();
    for (const f of l2.forms.filter((x) => x.of !== 'body' && x.kind !== 'rest')) {
      const E = energyAt(f, L);
      out.set(`ħ / (${f.text})`, hbar / E);
      const own = f.factors.filter((x) => x.q.role === 'mass').map((x) => x.q);
      for (const m of own.length ? own : ms) out.set(`L √(${m.key} / (${f.text}))`, L * Math.sqrt(m.d.value! / E));
    }
    out.set('L / c', L / c);
    return out;
  };
  const t0 = timesAt(T), t1 = T === null ? null : timesAt(T * 2);
  const times = [...t0].map(([of, t]) => ({ of, t, tempExponent: t1 ? Math.log2(t1.get(of)! / t) : 0 })).sort((a, b) => a.t - b.t);
  const seenNear = new Set<string>();
  const near = top.crossings.filter((x) => Math.abs(Math.log10(x.L.value! / L)) <= 1 && x.boundary !== 'crosses').filter((x) => { const k0 = `${x.boundary}@${x.L.value!.toPrecision(3)}`; if (seenNear.has(k0)) return false; seenNear.add(k0); return true; });
  const structures = lad.levels.flatMap((l) => l.structures);
  const weakestBinding = structures.length ? Math.min(...structures.map((x) => x.binding.value!)) : null;
  const h = CONST.h.value!;
  const byLight = (h * c) / L, byElectron = h ** 2 / (2 * CONST.me.value! * L ** 2);
  return { L, T, energies, strongest, bodies, negligible, state, times, near, observer: { byLight, byElectron, weakestBinding, disturbs: weakestBinding !== null && Math.min(byLight, byElectron) > weakestBinding }, structures };
}

// ---- 5. a copy at another scale: what "as above, so below" would need ------------------------------------------------

/** What a world scaled by `by` in size would need of the constants, for every ratio of its energies to be the same. */
export interface Copy {
  by: number;
  /** Each constant's factor as a power of `by`: the copy needs it times by^exponent. Zero: it may stay. */
  needs: { key: string; of: string; exponent: number; factor: number }[];
  /** Whether any assignment of the constants makes the copy: false when the energies' own dependences forbid it. */
  possible: boolean;
  /** How its clocks scale: every time in it is this factor times ours. */
  clocks: number;
  /** The boundaries a world of the measured constants passes between the size and the scaled size: why, with the constants as measured, the world at the other size is not a copy but another regime. */
  passed: Crossing[];
}

/**
 * A copy of the world at `by` times the size. The quantum of action and light's speed are held, since they are what
 * length is measured in (L = ħc/E): a copy then has every energy at its sizes 1/by of ours at ours, and so every
 * energy form M / L^n needs M times by^(n−1). That is one linear equation per form in the exponents of the constants'
 * factors, solved here; a consistent solution is the copy's constants, an inconsistent one says no copy exists. With
 * the constants as measured, none of the factors is there, and the world at the other size lies on the far side of
 * every boundary between the two sizes: the ladder lists them.
 */
export function copyAt(L: number, by: number, T?: number): Copy {
  const temp = T === undefined ? undefined : ofLeaf(leaf('temperature', T, 'K', { class: 'given', by: 'the tuner', grounds: 'the temperature the copy is derived at' }));
  const base = universe(temp), held = new Set(['hbar', 'c']);
  const unknown = base.filter((q) => !held.has(q.key));
  const rows: number[][] = [];
  for (const f of forms(base)) {
    const row = unknown.map((q) => f.factors.filter((x) => x.q === q).reduce((a, x) => a + x.p, 0));
    rows.push([...row, f.n - 1]);
  }
  const x = solve(rows, unknown.length);
  const lo = Math.min(L, L * by), hi = Math.max(L, L * by);
  const once = new Set<string>();
  const passed = ladder(base).levels.flatMap((l) => l.crossings).filter((c) => c.boundary !== 'crosses' && c.L.value! > lo && c.L.value! < hi).sort((a, b) => a.L.value! - b.L.value!).filter((c) => { const key = `${c.boundary}@${c.L.value!.toPrecision(3)}`; if (once.has(key)) return false; once.add(key); return true; });
  return {
    by, possible: x !== null, clocks: by, passed,
    needs: x === null ? [] : unknown.map((q, i) => ({ key: q.key, of: q.of, exponent: x[i]!, factor: by ** x[i]! })),
  };
}

/** Exact solution of a consistent linear system [A | b] (Gauss-Jordan), with free unknowns set to zero; null if inconsistent. */
function solve(rows: number[][], n: number): number[] | null {
  const m = rows.map((r) => [...r]);
  const pivots: number[] = [];
  let r = 0;
  for (let col = 0; col < n && r < m.length; col++) {
    let best = r;
    for (let i = r + 1; i < m.length; i++) if (Math.abs(m[i]![col]!) > Math.abs(m[best]![col]!)) best = i;
    if (Math.abs(m[best]![col]!) < 1e-12) continue;
    [m[r], m[best]] = [m[best]!, m[r]!];
    const pv = m[r]![col]!;
    m[r] = m[r]!.map((x) => x / pv);
    for (let i = 0; i < m.length; i++) if (i !== r && Math.abs(m[i]![col]!) > 0) { const f = m[i]![col]!; m[i] = m[i]!.map((x, j) => x - f * m[r]![j]!); }
    pivots.push(col); r++;
  }
  for (let i = r; i < m.length; i++) if (Math.abs(m[i]![n]!) > 1e-9) return null;
  const x = new Array<number>(n).fill(0);
  pivots.forEach((col, i) => { x[col] = m[i]![n]!; });
  return x;
}
