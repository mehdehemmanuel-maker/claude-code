// The third slice: time as a coordinate. A bar on a free hinge released from an angle. The hinge is a coupling with
// one degree of freedom; the angle over time is a field over t with the sampling law as its scale band; the period
// is derived from the bar's inertia and measured from the kernel's lattice of ticks; the swing energy is the
// coupling's ledger over time, and the kernel's dissipation is its contract, fixed by its own conformance test.

import { PERIOD_FACTOR, PHYSICAL_PENDULUM, PRISM_INERTIA, PRISM_MASS, lawById } from './book';
import { Language, type Judgement } from './abduce';
import { admitBy, materialLeaves, type MaterialLeaves } from './beam';
import { coordinate, type Prism } from './coupling';
import { coarse, domain, field, type Field } from './domain';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { declareFrame, flatGround, gravity, observer, rigidDomain, RIGID_BOUND, type Frame, type Ground, type Observer, type RigidDomain } from './field';
import type { Series } from './perceive';
import { apply } from './law';
import { compare, type Comparison } from './observe';
import { Journal } from './journal';
import { realizeSwing, type HingeSpec, type SwingRealization } from './realize-hinge';
import { rigidContract, type Jolt, type RigidContract } from './realize';
import { solve, type Solution, type System } from './solve';
import { add, cos, div, ge, gt, intentLeaf, k, leaf, mul, neg, sin, sub, variable, type Leaf, PI } from './term';

export interface SwingIntent {
  by: string;
  barLength: Leaf;
  /** The bar's section: along the swing, and across it. */
  deep: Leaf;
  thin: Leaf;
  release: Leaf;
  pivotHeight: Leaf;
  pivotSide: Leaf;
  /** The hinge's friction torque: a free hinge is zero. */
  friction: Leaf;
  /** Where the pin goes through the bar, from its end. */
  pivotFromEnd: Leaf;
  /** How many periods the observer watches. */
  periods: Leaf;
}

export function swingSystem(intent: SwingIntent, mat: MaterialLeaves, g: Derivation): System {
  const vars = [
    ['ell', 'm', 'bar length'], ['deep', 'm', 'extent along the swing'], ['thin', 'm', 'extent across the swing'], ['rho', 'kg/m^3', 'density'], ['g', 'm/s^2', 'gravity'],
    ['m', 'kg', 'mass'], ['Icm', 'kg m^2', 'inertia about the centre'], ['p', 'm', 'pin from the end'], ['d', 'm', 'pivot to centre of mass'], ['I', 'kg m^2', 'inertia about the pivot'],
    ['T0', 's', 'small-swing period'], ['theta0', 'rad', 'release angle'], ['f', '1', 'period factor'], ['T', 's', 'period'], ['omega', 'rad/s', 'angular frequency'],
    ['E', 'J', 'swing energy'], ['n', '1', 'periods watched'], ['watch', 's', 'watch'], ['H', 'm', 'height of the pivot'],
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  return {
    name: 'a bar on a free hinge, released from an angle',
    vars,
    relations: [
      { kind: 'law', sym: 'm', law: PRISM_MASS, args: { rho: 'rho', x: 'ell', y: 'deep', z: 'thin' } },
      { kind: 'law', sym: 'Icm', law: PRISM_INERTIA, args: { m: 'm', a: 'ell', b: 'deep' } },
      { kind: 'term', sym: 'd', term: sub(div(v['ell']!, k(2)), v['p']!), name: 'pivot to centre of mass', grounds: 'the centre of a uniform bar is at its middle; the pin is p from the end' },
      { kind: 'law', sym: 'I', law: lawById('parallel-axis'), args: { Icm: 'Icm', m: 'm', d: 'd' } },
      { kind: 'law', sym: 'T0', law: PHYSICAL_PENDULUM, args: { I: 'I', m: 'm', g: 'g', d: 'd' } },
      { kind: 'law', sym: 'f', law: PERIOD_FACTOR, args: { theta0: 'theta0' } },
      { kind: 'term', sym: 'T', term: mul(v['T0']!, v['f']!), name: 'period', grounds: 'the small-swing period lengthened by the swing' },
      { kind: 'term', sym: 'omega', term: div(mul(k(2), PI()), v['T']!), name: 'angular frequency', grounds: '2π over the period' },
      { kind: 'term', sym: 'E', term: mul(v['m']!, v['g']!, v['d']!, sub(k(1), cos(v['theta0']!))), name: 'swing energy', grounds: 'the centre of mass raised by d (1 − cos θ₀) at release, all of it potential' },
      { kind: 'term', sym: 'watch', term: mul(v['n']!, v['T']!), name: 'watch', grounds: 'the observer watches the declared number of periods' },
      // the floor is a body too: a bar that reaches it swings against it, and no free swing is what is realized
      { kind: 'constrain', holds: gt(v['H']!, sub(v['ell']!, v['p']!)), says: 'the bar clears the floor: the pivot stands higher than the bar reaches below it', role: 'design', source: 'the floor is a body: a bar that reaches it swings against it' },
    ],
    bindings: { ell: ofLeaf(intent.barLength), deep: ofLeaf(intent.deep), thin: ofLeaf(intent.thin), rho: mat.density, g, theta0: ofLeaf(intent.release), n: ofLeaf(intent.periods), p: ofLeaf(intent.pivotFromEnd), H: ofLeaf(intent.pivotHeight) },
  };
}

export interface SwingConfiguration {
  frame: Frame;
  ground: Ground;
  bodies: { pivot: Prism; bar: Prism };
  hinge: HingeSpec;
  restHeight: Derivation;
  rigid: RigidDomain;
  /** The angle over time the derivation predicts: θ₀ cos ω t, with the sampling law as its scale band. */
  angle: Field;
}

export function constructSwing(intent: SwingIntent, mat: MaterialLeaves, bound: Record<string, Derivation>, contract: RigidContract, frame: Frame, ground: Ground, obs: Observer): SwingConfiguration {
  const need = (sym: string) => { const d = bound[sym]; if (!d) throw new Error(`${sym} is not bound`); return d; };
  const zero = coordinate('across: the frame\'s centre line', frame, 'z', neg(variable('o', 'm')), {});
  const origin = coordinate('along: under the pivot', frame, 'x', neg(variable('o', 'm')), {});
  const side = ofLeaf(intent.pivotSide), H = ofLeaf(intent.pivotHeight);
  // the pivot block stands on a post of its own height: here the block is the top of a given fixed post, so it is placed at the given height
  const pivot: Prism = { name: 'the pivot block', extents: { x: side, y: side, z: side }, material: mat.id, density: mat.density };
  const pivotY = coordinate('y of the pivot block: the given height', frame, 'y', variable('H', 'm', 'pivot height'), { H });
  pivot.centre = { x: origin, y: pivotY, z: zero };
  const ell = need('ell'), deep = need('deep'), thin = need('thin'), theta0 = need('theta0'), d = need('d');
  const bar: Prism = { name: 'the bar', extents: { x: ell, y: deep, z: thin }, material: mat.id, density: mat.density };
  const S = variable('s', 'm', 'pivot side'), Tn = variable('t', 'm', 'thin'), C = variable('c', 'm', 'clearance'), D = variable('d', 'm'), TH = variable('th', 'rad');
  // the bar hangs beside the block, faces a clearance apart; the hinge where they meet, half way across the gap
  const zoff = evaluate('z of the bar: beside the block, a clearance away', add(add(div(S, k(2)), div(Tn, k(2))), C), { s: side, t: thin, c: contract.clearance }, { unit: 'm', law: 'coupling: the bar\'s face a clearance from the block\'s' });
  const zPin = evaluate('z of the hinge: half way across the gap', add(div(S, k(2)), div(C, k(2))), { s: side, c: contract.clearance }, { unit: 'm', law: 'coupling: the pin where the faces meet' });
  const sinTh = evaluate('sin θ₀', sin(TH), { th: theta0 }, { unit: '1', law: 'trigonometry' }), cosTh = evaluate('cos θ₀', cos(TH), { th: theta0 }, { unit: '1', law: 'trigonometry' });
  const x = coordinate('x of the bar: d sin θ₀ from the pivot', frame, 'x', mul(D, variable('sn', '1')), { d, sn: sinTh });
  const y = evaluate('y of the bar: d cos θ₀ below the pivot', sub(variable('p', 'm'), mul(D, variable('cs', '1'))), { p: pivotY, d, cs: cosTh }, { unit: 'm', law: 'coupling: the bar hangs from the pin' });
  bar.centre = { x, y, z: zoff };
  const tilt = evaluate('tilt of the bar about z: θ₀ − π/2, its length pointing down and out', sub(TH, div(PI(), k(2))), { th: theta0 }, { unit: 'rad', law: 'coupling: the bar\'s length points from the pin to its tip' });
  const hinge: HingeSpec = {
    onPivot: { x: evaluate('hinge on the block: its centre', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the pin through the block\'s centre' }), y: evaluate('hinge on the block: its centre', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the pin through the block\'s centre' }), z: zPin },
    onBar: { x: evaluate('hinge on the bar: its end', neg(D), { d }, { unit: 'm', law: 'the pin through the bar\'s end' }), y: evaluate('hinge on the bar: its centre line', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the pin on the bar\'s centre line' }), z: evaluate('hinge on the bar: the gap side', sub(variable('p', 'm'), variable('o', 'm')), { p: zPin, o: zoff }, { unit: 'm', law: 'the pin in the bar\'s coordinates' }) },
    tilt, friction: ofLeaf(intent.friction),
  };
  const restHeight = evaluate('height of the centre of mass at rest', sub(variable('p', 'm'), D), { p: pivotY, d }, { unit: 'm', law: 'hanging straight down, the centre is d below the pin' });
  const rigid = rigidDomain(mat.E, mat.density, ell, obs);
  // the angle over time, with the sampling band: the lattice on t must be finer than half the period (Shannon)
  const T = need('T'), omega = need('omega');
  const t = variable('t', 's', 'coordinate t');
  const fsNeeded = apply(lawById('shannon.sampling'), { fmax: evaluate('frequency of the swing', div(k(1), variable('T', 's')), { T }, { unit: 'Hz', law: 'one over the period' }) }, 'sampling rate the swing needs');
  const over = domain(frame, { t }, { t: { lo: evaluate('start of the watch', neg(variable('o', 's')), { o: ofLeaf(leaf('zero time', 0, 's', { class: 'configuration', source: 'the release' })) }, { unit: 's', law: 'the watch starts at the release' }), hi: need('watch') } },
    [{ says: 'sampled: the lattice on t resolves the swing, at least two samples a period (Shannon)', holds: ge(div(k(1), variable('lt', 's', 'lattice on t')), variable('fs', 'Hz')), env: { fs: fsNeeded } }]);
  const angle = field('angle over time', 'rad', over, { theta0, omega }, [], () => mul(variable('theta0', 'rad'), cos(mul(variable('omega', 'rad/s'), t))));
  return { frame, ground, bodies: { pivot, bar }, hinge, restHeight, rigid, angle };
}

export interface SwingSlice {
  intent: SwingIntent;
  frame: Frame;
  observer: Observer;
  contract: RigidContract;
  system: System;
  solution: Solution;
  configuration: SwingConfiguration | null;
  realization: SwingRealization | null;
  comparisons: Comparison[];
  admission: { coupling: string; judgement: Judgement }[];
  /** The relations of the language that refused the configuration before it was realized. */
  refusedBy: string[];
  /** The quantities the language judged it on, the observer's among them. */
  judgedOn: Record<string, Derivation>;
  /** The representation it was generated in. */
  representation: Representation;
  /** The language it was judged under, by hash: when the language grows, the slice is stale. */
  language: string;
  journal: Journal;
}

/** How a slice is represented where the generator may choose: the step the realization integrates at. */
export interface Representation { step?: Derivation }

export function barOnHinge(intent: SwingIntent, material: MaterialLeaves, J?: Jolt, language = new Language(), representation: Representation = {}): SwingSlice {
  const journal = new Journal();
  const frame = declareFrame(intent.by, 'x along the swing, y opposite gravity, z along the pin; origin on the ground under the pivot');
  const obs = observer('rigid-body kernel');
  const contract = rigidContract();
  const g = gravity();
  const ground = flatGround(frame, intent.by, 'a level floor');
  const system = swingSystem(intent, material, g);
  for (const d of Object.values(system.bindings)) journal.append({ kind: 'record', record: d });
  const solution = solve(system);
  for (const d of Object.values(solution.bound)) journal.append({ kind: 'record', record: d });
  const comparisons: Comparison[] = [];
  let configuration: SwingConfiguration | null = null, realization: SwingRealization | null = null;
  let admission: SwingSlice['admission'] = [];
  let refusedBy: string[] = [];
  let judgedOn: Record<string, Derivation> = {};
  // a configuration is constructed only where the system's constraints hold: what fails one is refused, not realized
  if (solution.free.length === 0 && Object.values(solution.bound).every((d) => d.value !== null) && solution.satisfied !== false) {
    const bound = solution.bound;
    configuration = constructSwing(intent, material, bound, contract, frame, ground, obs);
    for (const d of [...Object.values(configuration.bodies.bar.centre!), configuration.hinge.tilt, ...Object.values(configuration.hinge.onPivot), ...Object.values(configuration.hinge.onBar), configuration.restHeight, configuration.rigid.holds]) journal.append({ kind: 'record', record: d });
    // the observer is in what is judged: a relation learned over the kernel's window speaks of its tick and the period it watches
    // what the realization will integrate at: the step the representation asks, or the tick the observer reads at
    const watched = { tick: obs.tick, step: representation.step ?? obs.tick, T: bound['T']!, theta0: bound['theta0']!, E0: bound['E']!, m: bound['m']!, g: bound['g']!, d: bound['d']! };
    judgedOn = watched;
    ({ admission, refusedBy } = admitBy(language, { 'the bar on the pin, watched at the kernel\'s tick': watched }));
    if (J && configuration.rigid.rigid && !refusedBy.length) {
      realization = realizeSwing(J, contract, { ...configuration.bodies, hinge: configuration.hinge, gravity: g, ground, watch: bound['watch']!, inertia: bound['I']!, mass: bound['m']!, restHeight: configuration.restHeight }, obs, representation.step);
      const r = realization;
      const periodCmp = compare('period', bound['T']!, r.period, { name: contract.name, relative: contract.periodError });
      comparisons.push(periodCmp);
      // the ledger over time: the swing energy after the watch against the energy at release, within the dissipation the contract declares per period
      const allowed = evaluate('dissipation allowed over the watch', mul(variable('per', '1'), variable('n', '1')), { per: contract.hingeDissipation, n: bound['n']! }, { unit: '1', law: 'the contract\'s dissipation per period over the periods watched' });
      comparisons.push(compare('swing energy at the end of the watch', bound['E']!, r.swingEnergyEnd, { name: contract.name, relative: allowed }));
      comparisons.push(compare('swing energy at release', bound['E']!, r.swingEnergyStart, { name: contract.name, relative: contract.periodError }));
      // the angle field at the kernel's lattice: a sample every quarter period, within the amplitude the dissipation allows by then
      const every = Math.max(1, Math.round(r.samples.length / (4 * bound['n']!.value!)));
      for (let i = every - 1; i < r.samples.length; i += every) {
        const s = r.samples[i]!;
        const derived = coarse(configuration.angle, r.resolution, { t: s.t }, `angle at tick ${i + 1}, derived`);
        const elapsed = evaluate('periods elapsed', div(variable('t', 's'), variable('T', 's')), { t: s.t, T: bound['T']! }, { unit: '1', law: 'time over the period' });
        // what the contract allows by then, in angle: the amplitude lost to dissipation, and the phase drifted by the period error
        const drift = evaluate('angle the contract allows by then', mul(variable('th', 'rad'), add(mul(variable('per', '1'), variable('p', '1')), mul(k(2), PI(), variable('q', '1'), variable('p', '1')))), { th: bound['theta0']!, per: contract.hingeDissipation, p: elapsed, q: contract.periodError }, { unit: 'rad', law: 'the amplitude times the dissipation over the periods elapsed, plus the phase the period error drifts over them' });
        comparisons.push(compare(`angle at tick ${i + 1}`, derived, s.angle, { name: contract.name, relative: contract.periodError, absolute: drift }));
      }
      for (const c of comparisons) journal.append({ kind: 'comparison', comparison: c });
    }
  }
  return { intent, frame, observer: obs, contract, system, solution, configuration, realization, comparisons, admission, refusedBy, judgedOn, journal, representation, language: language.hash };
}

/** A bar on a free hinge, as the person asks for it. */
export function swingIntent(by = 'the person', over: Partial<Record<'release' | 'barLength' | 'friction' | 'periods' | 'pivotFromEnd' | 'pivotHeight', number>> = {}): SwingIntent {
  const given = (name: string, v: number | undefined, fallback: number, unit: string, grounds: string) => intentLeaf(by, name, v, fallback, unit, grounds);
  return {
    by,
    barLength: given('length of the bar', over.barLength, 1, 'm', 'a bar of one metre'),
    deep: given('extent of the bar along the swing', undefined, 0.089, 'm', 'a 2x4 swung on its wide face'),
    thin: given('extent of the bar across the swing', undefined, 0.038, 'm', 'a 2x4 swung on its wide face'),
    release: given('release angle', over.release, 30, 'deg', 'a modest swing, inside the amplitude law\'s domain'),
    pivotHeight: given('height of the pivot', over.pivotHeight, 2, 'm', 'a pivot the bar clears the ground from'),
    pivotSide: given('side of the pivot block', undefined, 0.02, 'm', 'a small block to pin to'),
    friction: given('friction torque of the hinge', over.friction, 0, 'N m', 'a free hinge'),
    pivotFromEnd: given('the pin from the bar\'s end', over.pivotFromEnd, 0, 'm', 'pinned at the end'),
    periods: leaf('periods watched', over.periods ?? 5, '1', { class: 'configuration', source: 'the observer: five periods give nine or ten zero crossings to read the period from' }),
  };
}

export const swingMaterial = (id = 'wood.douglas-fir') => materialLeaves(id);

/**
 * The swing as the manifold holds it: the bar's tip across the line of sight over time, with the windows the
 * representation holds for. The kernel is read once a tick, so it holds nothing between ticks; the bar is realized
 * rigid, which holds only for windows the sound crossing it is short against.
 */
export function tipSeries(s: SwingSlice): Series | null {
  if (!s.realization || !s.configuration) return null;
  const L = s.intent.barLength.value!, r = s.realization, rigid = s.configuration.rigid;
  return {
    carrier: 'light', unit: 'm', kind: 'position',
    t: r.samples.map((x) => x.t.value!), v: r.samples.map((x) => L * Math.sin(x.angle.value!)),
    holds: [
      { finest: r.window.tick, because: `the kernel is read once a tick (${r.window.tick} s): nothing between ticks is held` },
      { finest: rigid.crossing.value! / RIGID_BOUND.value!, because: `the bar is realized rigid, which holds only for windows its sound crossing (${rigid.crossing.value!.toExponential(2)} s) is a tenth of or less: finer, it is elastic` },
    ],
  };
}
