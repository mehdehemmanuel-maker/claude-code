// Depth (docs/NEXUS-FROM-REALITY.md, section 24): how far down anything must be followed to explain it or to generate
// it, decided by what is asked of it, never by a list of layers or a count of them. Water showed the requirement;
// nothing here is about water, or about any kind of thing. A level is whatever the scale tuner's ladder derives as
// holding together at the temperature: each structure that settles, each particle (held together by its rest energy:
// above it, particles are made and unmade), and beneath them the length the constants set by themselves, below which
// no kept law holds. How many levels there are is the ladder's to find, and it finds more when it is given more (a
// coupling, a particle): the descent reads whatever is there. Where the phenomenon's matter is named, what the kept
// species say of it comes first, each as a level with its source: a crystal's cohesion and lattice
// (src/nexus/substrate/solid.ts), a liquid's crossing to its vapour (src/nexus/substrate/phase.ts), a molecule's bonds
// (src/nexus/substrate/compose.ts). Water, iron and hydrogen go down the same way, as far as each is asked to.
//
// Two questions take a phenomenon down.
//
// - A process (heat at a temperature, a potential across a charge, a motion at a speed, over a time) changes the
//   levels its energy per unit reaches. Heat takes apart a fraction e^(−E_b/kT) of a level's units; a potential or a
//   motion takes apart every unit whose binding is below the energy it gives one unit, and none above. Time decides
//   as much as energy. Every level has its own clock, ħ/E_b, and under heat a lifetime: attempted at the thermal rate
//   kT/h and succeeding with the Boltzmann factor of its binding (Eyring's rate, src/nexus/substrate/rate.ts), so
//   τ = (h/kT) e^(E_b/kT). A process that lasts less than a level's lifetime has not yet taken
//   the units apart that the heat would, so what it changes is the lesser of the two: the heat's share, or the share
//   of lifetimes its duration covers. Where a kept law says what the share is, it is that law's: a liquid's
//   arrangement is apart where its vapour has the lesser Gibbs energy; a pair held by attraction is apart by Saha's
//   balance where the density of its units is known, since the room a freed constituent gains raises the share as
//   the matter thins. Elsewhere it is the Boltzmann factor of one unit, with what is taken apart assumed to re-form
//   at least as fast as it parts.
//   And a process faster than a level's own clock resolves the inside of that level
//   even where it breaks none of it. The
//   descent passes every level the process changes or resolves, and stops at the first it leaves whole to within the
//   tolerance asked: that level enters as a unit (its mass, its size, its binding), and nothing below it can change
//   the outcome by more than the tolerance. That is sufficiency shown, not assumed. A process that reaches past every
//   level ends at the floor, and the gap is in the laws.
// - A quantity (a density, a stiffness, a conductivity, a temperature, a time) is explained at the level whose size,
//   mass and binding set its scale: the one product of their powers (with the charge quantum and Boltzmann's constant
//   where the dimension needs them) that has the quantity's dimension. Within the factor the dimensions cannot see,
//   it is explained there, with that level's lineage; off by more, that level sets the wrong scale and the descent
//   goes on. Off at every level, the gap is located: between the level that comes closest and the phenomenon,
//   something the ladder does not hold sets it, and the gap says by how many decades and in which direction.
//
// Up is the other direction: the boundaries above the phenomenon's size, where what contains it changes regime.
//
// Every stop is one of three: explained, sufficient, or a gap of a stated kind.

import { CONST } from '../book/constants';
import { dimOf, scaleOf } from '../lang/dimension';
import { ladderAt, reached0, type Crossing, type Q } from './tuner';
import { ofLeaf, type Derivation } from '../lang/evaluate';
import { leaf } from '../lang/term';
import { BONDS, BONDS_SOURCE, CRYSTALS, ELEMENTS, MOLECULES } from '../../data/species';
import { atomicVolume } from './solid';
import { conductionDensity, fermiEnergy, thermalShare } from './fermi';
import { meltingPoint } from './melt';
import { P0, T0, boilingPoint, phaseAt, phasesOf, vaporizationEnthalpy } from './phase';

/** What a gap is a gap in: a measurement, a resolution, a relation between known things, a state variable, an operation the language lacks, a law, or a primitive nothing derives. */
export type GapKind = 'data' | 'resolution' | 'relationship' | 'variable' | 'operator' | 'law' | 'primitive';
export interface DepthGap { kind: GapKind; says: string }

/** A level a phenomenon can be followed down to: what holds one unit of it together, and what that unit is. */
export interface Level {
  what: string;
  /** A named matter's own arrangement (a crystal, a liquid) and molecule, from the kept species; what the ladder settles; a particle; the floor. */
  kind: 'arrangement' | 'molecule' | 'structure' | 'particle' | 'floor';
  /** Its size, the energy that takes one unit of it apart, the mass of one unit, its own clock ħ/E_b. */
  size: number; binding: number; mass: number; clock: number;
  /** The mass a force on charges moves in it: its lightest charged constituent; null where it carries none. */
  carrier: number | null;
  /** The derivations its size and binding come from. */
  record: Derivation[];
  /** The share of its units heat at T takes apart, where a kept law states it (a phase's Gibbs energy, Saha's balance); else the Boltzmann factor. */
  apart?: (T: number) => number;
}

const hbarOf = (qs: Q[]) => qs.find((q) => q.key === 'hbar')!.d.value!;

/**
 * Every level the ladder derives at a temperature, from the weakest bound to the strongest: the structures, then the
 * particles, then the floor. With no temperature, the floor of the universe's own background.
 */
/**
 * Saha's balance for a pair that parts into two (Saha, Phil. Mag. 40, 472, 1920): the share x apart satisfies
 * x²/(1 − x) = (1/n) (2π μ kT/h²)^(3/2) e^(−E_b/kT). The room the freed parts gain, their thermal wavelength cubed against
 * the volume each unit has, stands against the binding: the thinner the matter, the more of it is apart at one heat.
 * The parts' inner states (spins, rotations, vibrations) are not counted, which a statistical weight would add.
 */
export function sahaShare(mu: number, Eb: number, n: number, T: number): number {
  const k = CONST.kB.value!, h = CONST.h.value!;
  const r = (1 / n) * ((2 * Math.PI * mu * k * T) / (h * h)) ** 1.5 * Math.exp(-Eb / (k * T));
  if (!Number.isFinite(r)) return 1;
  // x² + r x − r = 0, written so it keeps its precision when r is small
  return r > 1e-8 ? (-r + Math.sqrt(r * r + 4 * r)) / 2 : Math.sqrt(r);
}

/**
 * Whether a named matter is a gas at a heat and a pressure. Its phase is the one of least Gibbs energy, but the kept
 * phases are extrapolated from 298 K with their heat capacities held, and far above, a liquid's larger heat capacity
 * makes its entropy pass its vapour's, which no matter does: the vapour always has more room. So once its vapour wins
 * on heating at a pressure, it stays won: the matter is a gas at and above its boiling point.
 */
const boils = new Map<string, number>();
export function isGas(name: string, T: number, p: number): boolean {
  const ps = phasesOf(name);
  if (!ps.length) return false;
  if (ps.some((s) => s.phase === 'gas') && ps.some((s) => s.phase === 'liquid')) {
    const key = `${name}|${p}`;
    if (!boils.has(key)) boils.set(key, boilingPoint(name, p));
    return T >= boils.get(key)!;
  }
  return phaseAt(name, T, p) === 'gas';
}

/** What a descent is of: a named matter (a molecule's name or an element's symbol in the kept species), the number density of its units, its pressure. */
export interface Of { matter?: string; n?: number; p?: number }

const kept = new Map<string, Level[]>();
export function levelsAt(T: number | null, of: Of = {}): Level[] {
  const key = `${T}|${of.matter ?? ''}|${of.n ?? ''}|${of.p ?? ''}`;
  const was = kept.get(key);
  if (was) return was;
  const lad = ladderAt(T);
  const qs = lad.levels.at(-1)!.qs, hbar = hbarOf(qs), c = CONST.c.value!;
  const out: Level[] = [];
  for (const s of lad.levels.flatMap((l) => l.structures)) {
    const charged = s.parts.filter((p) => p.charge).sort((a, b) => a.d.value! - b.d.value!)[0];
    // a pair held by attraction, among units at a known density, is apart by Saha's balance
    const [p1, p2] = s.parts.map((q) => q.d.value!), Eb = s.binding.value!;
    // at a stated density, or, in a named matter that is a gas at the heat and pressure, at the gas's own p/kT
    const gasAt = (Tx: number) => of.matter !== undefined && isGas(of.matter, Tx, of.p ?? P0);
    const nAt = (Tx: number) => of.n ?? (gasAt(Tx) ? (of.p ?? P0) / (CONST.kB.value! * Tx) : null);
    const saha = s.parts.length === 2 && (of.n !== undefined || of.matter !== undefined) ? (Tx: number) => { const n = nAt(Tx); return n === null ? Math.exp(-Eb / (CONST.kB.value! * Tx)) : sahaShare((p1! * p2!) / (p1! + p2!), Eb, n, Tx); } : undefined;
    out.push({ what: `what settles at ${Number(s.size.value!.toPrecision(3))} m`, kind: 'structure', size: s.size.value!, binding: Eb, mass: s.mass.value!, clock: hbar / Eb, carrier: charged ? charged.d.value! : null, record: [s.size, s.binding, s.mass], ...(saha ? { apart: saha } : {}) });
  }
  // a particle is held together by its rest energy: below it, it is a unit; above it, particles are made. Its size is
  // the length its rest energy confines: its reduced Compton length ħ / (m c)
  for (const q of qs.filter((x) => x.role === 'mass' && x.d.law === undefined)) {
    const m = q.d.value!;
    out.push({ what: q.of, kind: 'particle', size: hbar / (m * c), binding: m * c * c, mass: m, clock: hbar / (m * c * c), carrier: q.charge ? m : null, record: [q.d] });
  }
  const least = reached0().least, EP = (hbar * c) / least;
  out.push({ what: 'the length the constants set by themselves', kind: 'floor', size: least, binding: EP, mass: EP / (c * c), clock: least / c, carrier: null, record: [] });
  if (of.matter) out.push(...matterLevels(of.matter, of.p ?? P0, hbar));
  out.sort((a, b) => a.binding - b.binding);
  kept.set(key, out);
  return out;
}

/**
 * A named matter's own levels, from the kept species and the laws that read them: the crystal an element takes (its
 * cohesive energy per atom, the room an atom has in its cell), the liquid a molecule makes (the enthalpy its vapour
 * takes in, per molecule; apart where the vapour has the lesser Gibbs energy), the molecule itself (held by its weakest
 * bond, the first heat breaks). What the species do not state, the level does not have: a molecule's size is not
 * stated, so it is NaN, and no quantity that needs one is explained there.
 */
function matterLevels(name: string, p: number, hbar: number): Level[] {
  const NA = CONST.R.value! / CONST.kB.value!, u = CONST.mu.value!, me = CONST.me.value!;
  const src = (what: string, v: number, unit: string, source: string) => ofLeaf(leaf(what, v, unit, { class: 'measured', source }));
  const out: Level[] = [];
  const species = MOLECULES.filter((s) => s.name === name);
  const single = species.map((s) => Object.entries(s.counts)).find((c) => c.length === 1 && c[0]![1] === 1)?.[0]?.[0];
  const crystal = CRYSTALS.find((c) => c.element === name || c.element === single);
  if (crystal) {
    const size = atomicVolume(crystal) ** (1 / 3);
    // it keeps its shape until it melts (src/nexus/substrate/melt.ts); past that its arrangement is apart, though its atoms stay
    // together, and below it heat takes atoms off it only by the Boltzmann factor of their cohesion
    const melt = meltingPoint(crystal).T;
    out.push({ what: `the crystal of ${crystal.element}`, kind: 'arrangement', size, binding: crystal.cohesive, mass: crystal.mass, clock: hbar / crystal.cohesive, carrier: me, record: [src(`cohesive energy of ${crystal.element}`, crystal.cohesive, 'J', 'src/data/species.ts CRYSTALS: Kittel table 3.1'), src(`lattice constant of ${crystal.element}`, crystal.a, 'm', 'src/data/species.ts CRYSTALS: Kittel table 1.4')], apart: (Tx) => (Tx >= melt ? 1 : Math.exp(-crystal.cohesive / (CONST.kB.value! * Tx))) });
    // its conduction electrons, where their count is stated: a gas that cannot share states (src/nexus/substrate/fermi.ts),
    // held at the energy of the last one in, its spacing the density's, and heat moving only a share kT/E_F of it
    const n = conductionDensity(crystal);
    if (n !== null) {
      const EF = fermiEnergy(n);
      out.push({ what: `the conduction electrons of ${crystal.element}`, kind: 'arrangement', size: n ** (-1 / 3), binding: EF, mass: me, clock: hbar / EF, carrier: me, record: [src(`conduction electrons per atom of ${crystal.element}`, crystal.free!, '1', 'src/data/species.ts CRYSTALS: Kittel table 6.1')], apart: (Tx) => thermalShare(n, Tx) });
    }
  }
  const gas = species.find((s) => s.phase === 'gas'), liquid = species.find((s) => s.phase === 'liquid');
  const molecular = gas ?? liquid;
  if (molecular && Object.values(molecular.bonds ?? {}).length) {
    const mass = Object.entries(molecular.counts).reduce((m, [el, k]) => m + k * (ELEMENTS[el]?.A ?? NaN) * u, 0);
    if (gas && liquid) {
      const Ev = vaporizationEnthalpy(name, T0) / NA;
      out.push({ what: `the liquid of ${name}`, kind: 'arrangement', size: NaN, binding: Ev, mass, clock: hbar / Ev, carrier: null, record: [src(`enthalpy of vaporization of ${name}`, Ev * NA, 'J/mol', `src/data/species.ts: ${gas.source}; ${liquid.source}`)], apart: (Tx) => (isGas(name, Tx, p) ? 1 : 0) });
    }
    const bond = Object.keys(molecular.bonds!).filter((b) => BONDS[b] !== undefined).sort((a, b) => BONDS[a]! - BONDS[b]!)[0];
    if (bond) {
      const weakest = BONDS[bond]! / NA;
      // where the matter is a gas at the heat and the pressure, its molecules are p/kT to a volume, and the weakest bond
      // parts by Saha's balance into the bond's two sides, taken here as its two atoms' masses (a stated approximation)
      const [x, y] = bond.split(/[–=≡]/).map((el) => (ELEMENTS[el]?.A ?? NaN) * u);
      const muBond = (x! * y!) / (x! + y!);
      const apart = (Tx: number) => (isGas(name, Tx, p) && Number.isFinite(muBond) ? sahaShare(muBond, weakest, p / (CONST.kB.value! * Tx), Tx) : Math.exp(-weakest / (CONST.kB.value! * Tx)));
      out.push({ what: `the molecule of ${name}`, kind: 'molecule', size: NaN, binding: weakest, mass, clock: hbar / weakest, carrier: null, record: [src(`weakest bond of ${name} (${bond})`, weakest * NA, 'J/mol', BONDS_SOURCE)], apart });
    }
  }
  return out;
}

// ---- a process -------------------------------------------------------------------------------------------------------

/** A process: the energy it gives one unit of a level, whether that energy is heat (a distribution) or given whole, and how long it lasts (null: as long as it takes). */
export interface Process {
  says: string; thermal: boolean; time: number | null; lawful?: boolean;
  /** For heat, its temperature: the laws that state a share read it. */
  T?: number;
  /** The energy it gives one unit of a level: all of it, or, where `least` is stated too, the most it can. */
  perUnit: (lv: Level) => number;
  /** The least it gives one unit, where that differs from the most: between them, the matter decides. */
  least?: (lv: Level) => number;
}

export const heat = (T: number, time: number | null = null): Process => ({ says: `heat at ${Number(T.toPrecision(3))} K`, perUnit: () => CONST.kB.value! * T, thermal: true, time, T });
/**
 * A potential across a size gives a unit charge between two energies: at least the field's work across one unit of the
 * level (e·V·s/L: the field that pulls a unit's own charges apart), at most the whole drop (e·V: a charge that crosses
 * it without striking anything). Where it lands between is set by how far a charge moves freely, which is the
 * matter's, not the potential's. With no size, only the most is known.
 */
export const potential = (V: number, time: number | null = null, across: number | null = null): Process => ({
  says: `a potential of ${Number(V.toPrecision(3))} V${across === null ? '' : ` across ${Number(across.toPrecision(3))} m`}`, thermal: false, time,
  perUnit: () => elementary() * Math.abs(V),
  least: (lv) => (across === null ? 0 : elementary() * Math.abs(V) * Math.min(1, lv.size / across)),
});
/** A motion at a speed gives one unit (γ − 1) m c², written so it keeps its precision at slow speeds. */
export const motion = (v: number, time: number | null = null): Process => ({
  says: `motion at ${Number(v.toPrecision(3))} m/s`, thermal: false, time, lawful: Math.abs(v) < CONST.c.value!,
  perUnit: (lv) => { const c = CONST.c.value!, b2 = (v / c) ** 2; if (b2 >= 1) return Infinity; const r = Math.sqrt(1 - b2); return (lv.mass * c * c * b2) / (r * (1 + r)); },
});
const elementary = () => { const NA = CONST.R.value! / CONST.kB.value!; return CONST.F.value! / NA; };

export interface Step {
  level: Level; E: number;
  /** The share of the level's units the process takes apart over its duration. */
  changed: number;
  /** Under heat, how long one unit of the level lasts: its clock times e^(E_b/kT), as a power of ten (it overflows any float). */
  lifetimeDecades: number | null;
  resolved: boolean; verdict: 'changes' | 'resolved' | 'whole';
}
export interface Descent {
  says: string; tolerance: number; steps: Step[];
  /** Sufficient: a level stays whole. Gap: the process reaches past what is known. Refused: no lawful process is that. */
  stop: 'sufficient' | 'gap' | 'refused';
  /** The level the process leaves whole, which enters as a unit; null at a gap. */
  at: Level | null;
  gap: DepthGap | null;
  /** The boundaries above the size: what containing the phenomenon in something larger changes. */
  up: Crossing[];
}

/** A part in a hundred: the margin the tuner calls negligible. A want's own band replaces it where there is one. */
export const DEFAULT_TOLERANCE = 1e-2;

/** Follow a process down from a size (or from the top, with none) until it leaves a level whole, or reaches past every level. */
export function descend(p: Process, o: { L?: number | null; T?: number | null; tolerance?: number; of?: Of } = {}): Descent {
  const tolerance = o.tolerance ?? DEFAULT_TOLERANCE, L = o.L ?? null, T = o.T ?? null;
  // a level whose size is not stated is taken as inside: it is the matter's own
  const all = levelsAt(T, o.of ?? {}), inside = all.filter((lv) => L === null || !(lv.size >= L) || lv.kind === 'floor');
  const steps: Step[] = [];
  const up = upFrom(L, T);
  if (p.lawful === false) return { says: p.says, tolerance, steps, stop: 'refused', at: null, up, gap: null };
  for (const lv of inside) {
    // at the floor there is no unit to give the energy to: what reaches it is the most any unit above it was given
    const E = lv.kind === 'floor' ? Math.max(0, ...steps.map((s) => s.E)) : p.perUnit(lv);
    if (lv.kind === 'floor') {
      // nothing the ladder holds fits inside the size: below the floor no law holds; above it, the particles are
      // what the ladder starts from, measured and never derived, and what is inside them it does not hold
      if (!steps.length) return L !== null && L < lv.size
        ? { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'law', says: `at ${L} m, below the length the constants set by themselves, no kept law holds` } }
        : { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'primitive', says: `nothing the ladder holds fits inside ${L} m: inside the smallest of its units are the particles it starts from, whose masses are measured and never derived, and what they are made of, if anything, no kept law holds` } };
      if (E >= lv.binding) return { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'law', says: `${p.says} gives one unit ${E.toExponential(2)} J, past the energy the constants set by themselves (${lv.binding.toExponential(2)} J): there the quantum and gravitation cannot be told apart, and no kept law says what happens` } };
      const made = steps.filter((s) => s.level.kind === 'particle' && s.verdict === 'changes');
      return { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'law', says: `${p.says} makes and unmakes every particle the ladder holds (${made.map((s) => s.level.what).join(', ')}), and no kept law says which particles a process makes or how many` } };
    }
    // heat: the share its law states (or e^(−E_b/kT)), and no more than the lifetimes its duration covers, 1 − e^(−D/τ),
    // with τ = (h/kT) e^(E_b/kT): attempted at the thermal rate, succeeding by the Boltzmann factor
    const lifetimeDecades = p.thermal ? Math.log10(CONST.h.value! / E) + lv.binding / E / Math.LN10 : null;
    const covered = p.thermal && p.time !== null ? -Math.expm1(-(10 ** (Math.log10(p.time) - lifetimeDecades!))) : 1;
    const heatShare = p.thermal ? (lv.apart && p.T !== undefined ? lv.apart(p.T) : Math.exp(-lv.binding / E)) : 0;
    const least = p.least ? (Number.isNaN(p.least(lv)) ? 0 : p.least(lv)) : E;
    if (!p.thermal && least < lv.binding && E >= lv.binding) {
      steps.push({ level: lv, E, changed: NaN, lifetimeDecades, resolved: false, verdict: 'changes' });
      return { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'data', says: `${p.says} gives a unit charge of ${lv.what} between ${least.toExponential(2)} J and ${E.toExponential(2)} J, and its binding (${lv.binding.toExponential(2)} J) lies between: whether it is taken apart is set by how far a charge moves freely before it strikes something, a datum of the matter's state that no kept matter states` } };
    }
    const changed = p.thermal ? Math.min(heatShare, covered) : least >= lv.binding ? 1 : 0;
    const resolved = p.time !== null && p.time < lv.clock;
    const verdict: Step['verdict'] = changed > tolerance ? 'changes' : resolved ? 'resolved' : 'whole';
    steps.push({ level: lv, E, changed, lifetimeDecades, resolved, verdict });
    if (verdict === 'whole') return { says: p.says, tolerance, steps, stop: 'sufficient', at: lv, gap: null, up };
  }
  return { says: p.says, tolerance, steps, stop: 'gap', at: null, up, gap: { kind: 'resolution', says: `no level the ladder holds lies below ${L} m` } };
}

/** The boundaries above a size, nearest first, one of each kind: where something larger that holds the phenomenon changes regime. */
function upFrom(L: number | null, T: number | null): Crossing[] {
  if (L === null) return [];
  const lad = ladderAt(T);
  const seen = new Set<string>();
  return lad.levels.at(-1)!.crossings.filter((c) => c.boundary !== 'crosses' && c.L.value! > L).sort((a, b) => a.L.value! - b.L.value!).filter((c) => { if (seen.has(c.boundary)) return false; seen.add(c.boundary); return true; });
}

// ---- a quantity --------------------------------------------------------------------------------------------------------

export interface Ask { name: string; value: number; unit: string }
export interface Explanation {
  ask: Ask;
  /** At each level tried, the scale it sets for the quantity and how many decades the datum lies from it (positive: above). */
  tried: { level: Level; predicted: number; decades: number }[];
  stop: 'explained' | 'gap';
  level: Level | null;
  gap: DepthGap | null;
  /** The powers of size, mass, binding, charge quantum and Boltzmann's constant whose product has the quantity's dimension. */
  powers: { size: number; mass: number; binding: number; charge: number; boltzmann: number };
}

/**
 * The factor the dimensions cannot see: a product of pure numbers like 2π, 4π/3, ½. A datum within a decade of the
 * scale a level sets is explained there to that factor; this is a stated assumption, not a derivation.
 */
export const UNSEEN_DECADES = 1;

/** The one product of a level's size, mass and binding (with e and k_B where needed) that has a dimension. */
export function powersFor(unit: string): Explanation['powers'] {
  const [dM, dL, dT, dI, dK] = dimOf(unit) as unknown as number[];
  const boltzmann = -dK!, charge = dI!;
  const binding = (charge - dT!) / 2 + dK!;
  const mass = dM! - binding - boltzmann;
  const size = dL! - 2 * binding - 2 * boltzmann;
  // + 0 so that no power reads as −0
  return { size: size + 0, mass: mass + 0, binding: binding + 0, charge: charge + 0, boltzmann: boltzmann + 0 };
}

/** Explain a quantity by depth: the coarsest level that sets its scale to within the unseen factor, or the located gap. */
export function explain(ask: Ask, T: number | null = null, of: Of = {}): Explanation {
  const pw = powersFor(ask.unit);
  const value = Math.abs(ask.value * scaleOf(ask.unit));
  const e = elementary(), kB = CONST.kB.value!;
  const levels = levelsAt(T, of).filter((lv) => lv.kind !== 'floor');
  if (!levels.some((lv) => lv.kind !== 'particle')) {
    return { ask, tried: [], stop: 'gap', level: null, powers: pw, gap: { kind: 'data', says: `at ${T} K nothing the ladder holds settles, so ${ask.name} is a datum of matter that does not hold together here: it was measured where it does` } };
  }
  const tried: Explanation['tried'] = [];
  for (const lv of levels) {
    // a response of charges is carried by the lightest charged constituent, whose acceleration under one force is the
    // largest; a response of the unit as a whole by its whole mass
    const m = pw.charge !== 0 ? lv.carrier : lv.mass;
    if (m === null) continue;
    const predicted = lv.size ** pw.size * m ** pw.mass * lv.binding ** pw.binding * e ** pw.charge * kB ** pw.boltzmann;
    // a level that does not state what the scale needs (a molecule's size) sets no scale for it
    if (!Number.isFinite(predicted) || predicted <= 0) continue;
    const decades = Math.log10(value / predicted);
    tried.push({ level: lv, predicted, decades });
    if (Math.abs(decades) <= UNSEEN_DECADES) return { ask, tried, stop: 'explained', level: lv, gap: null, powers: pw };
  }
  const best = tried.reduce((a, b) => (Math.abs(b.decades) < Math.abs(a.decades) ? b : a));
  const dir = best.decades < 0 ? 'below' : 'above';
  return {
    ask, tried, stop: 'gap', level: null, powers: pw,
    gap: { kind: 'relationship', says: `${ask.name} lies ${Math.abs(best.decades).toFixed(1)} decades ${dir} the scale ${best.level.what} sets, the closest of every level: something between that level (${Number.isNaN(best.level.size) ? 'whose size the species do not state' : `${best.level.size.toExponential(2)} m`}) and the phenomenon, which no level holds, sets it` },
  };
}

// ---- the hottest a matter bears -------------------------------------------------------------------------------------

/**
 * The hottest a named matter bears: the lowest heat at which the level that makes it that matter (its crystal, or its
 * molecule) comes apart past the tolerance, by that level's own law, found by bisection over temperature. A crystal
 * by its melting; a molecule by its weakest bond parting, by Saha's balance where it is a gas at the pressure. Null
 * where the kept species do not hold the matter, or hold no level of it.
 */
export function hottestOf(matter: string, o: { p?: number; tolerance?: number } = {}): { T: number; level: Level } | null {
  const tolerance = o.tolerance ?? DEFAULT_TOLERANCE, of: Of = { matter, ...(o.p !== undefined ? { p: o.p } : {}) };
  const own = levelsAt(null, of).filter((lv) => (lv.kind === 'arrangement' && lv.what.startsWith('the crystal')) || lv.kind === 'molecule');
  const level = own[0];
  if (!level) return null;
  const share = (T: number) => (level.apart ? level.apart(T) : Math.exp(-level.binding / (CONST.kB.value! * T)));
  let lo = 1, hi = 1e6;
  if (share(hi) <= tolerance) return null;
  for (let i = 0; i < 100; i++) { const mid = Math.sqrt(lo * hi); if (share(mid) > tolerance) hi = mid; else lo = mid; }
  return { T: hi, level };
}
