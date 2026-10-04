// The first vertical slice (docs/NEXUS-RESTART.md Part XXV): a beam on two supports under a load, nothing more.
// Intent as given leaves; semantics as variables; laws as terms; a constraint system whose free variables are
// reported, filled only by a declared catalogue under a declared preference; construction as coupling solutions
// in a declared frame; realization on the rigid-body kernel under its contract; observation compared with the
// derivation; WHY total on every value. No table, no kind, no default, no coordinate written by hand, no number
// without an origin.

import { getMaterial } from '../data/materials';
import { LUMBER } from '../parts/registry';
import { BENDING_STRESS, EXTENT_FROM_MASS, FIRST_PERIOD, LINE_WEIGHT, NDS, PATCH_MOMENT, PATCH_SAG, RECT_AREA, RECT_I, RECT_MODULUS, SELF_MOMENT, SELF_SAG, TWO_SUPPORTS, WEIGHT } from './book';
import { coarse, coverage, domain, field, type Field } from './domain';
import { coordinate, ledger, restOn, standOn, topOf, type Prism, type RestCoupling } from './coupling';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { declareFrame, flatGround, gravity, observer, rigidDomain, type Frame, type Observer, type RigidDomain } from './field';
import { apply, law, type Law } from './law';
import { compare, Journal, type Comparison } from './observe';
import { realizeRigid, rigidContract, type Jolt, type Realization, type RigidContract } from './realize';
import { search, solve, type Choice, type Option, type Solution, type System } from './solve';
import { abs, add, div, ge, k, le, leaf, mul, neg, variable, type Leaf } from './term';

export interface BeamIntent {
  by: string;
  /** What is carried. */
  mass: Leaf;
  /** Between the supports' centres. */
  span: Leaf;
  /** The thing carried is this long along the beam, and this wide across it. */
  patch: Leaf;
  across: Leaf;
  /** The supports the person has. */
  supportHeight: Leaf;
  supportDepth: Leaf;
  /** Sag under span / this. */
  sagRatio: Leaf;
  /** Strength at this factor on the material's strength. */
  factor: Leaf;
}

export interface MaterialLeaves { id: string; density: Derivation; E: Derivation; strength: Derivation }

/** A kept material's constitutive values as measured leaves, each with the handbook that reports it. */
export function materialLeaves(id: string): MaterialLeaves {
  const m = getMaterial(id);
  const src = `${m.name}: ${m.source} (${m.confidence})`;
  const l = (name: string, v: number, unit: string) => ofLeaf(leaf(`${name} of ${m.name}`, v, unit, { class: 'measured', source: src }));
  return { id, density: l('density', m.density, 'kg/m^3'), E: l('modulus', m.E, 'Pa'), strength: l('strength (modulus of rupture)', m.ultimate, 'Pa') };
}

/** The sawn-lumber sizes as a catalogue: each dressed section in both orientations, configuration leaves with their source. */
export function lumberCatalogue(): Option[] {
  const src = 'dressed sawn-lumber sizes (kept parts/registry.ts LUMBER; PS 20 American Softwood Lumber Standard: a 2×4 is 38 × 89 mm)';
  const out: Option[] = [];
  for (const [size, [t, w]] of Object.entries(LUMBER)) {
    const l = (name: string, v: number) => leaf(name, v, 'm', { class: 'configuration', source: src });
    out.push({ label: `${size} on edge`, leaves: { b: l(`${size} breadth (on edge)`, t), h: l(`${size} depth (on edge)`, w) } });
    if (t !== w) out.push({ label: `${size} flat`, leaves: { b: l(`${size} breadth (flat)`, w), h: l(`${size} depth (flat)`, t) } });
  }
  return out;
}

/** The preference that fills the free section: least material, declared with who and why. */
export function leastMaterial(by: string): Law {
  const A = variable('A', 'm^2', 'section area');
  return law({
    id: 'preference.least-material', name: 'Least material', statement: 'Of the sections that satisfy every constraint, prefer the one with the least area.', formula: 'min A',
    inputs: [{ sym: 'A', unit: 'm^2', name: 'section area' }], output: { sym: 'A', unit: 'm^2', name: 'material per length of the chosen section' },
    term: A, domain: [], source: { cite: `declared by ${by}: the least timber that carries the load within its limits`, kind: 'declaration' },
  });
}

export interface BeamSemantics { system: System; station: Derivation }

/** The variables and relations of a beam on two supports: what every value is, before any is known. */
export function beamSystem(intent: BeamIntent, mat: MaterialLeaves, g: Derivation, contract: RigidContract): BeamSemantics {
  const vars = [
    ['m', 'kg', 'mass carried'], ['g', 'm/s^2', 'gravity'], ['P', 'N', 'load'], ['L', 'm', 'span'], ['w', 'm', 'patch width'], ['s', 'm', 'knife-edge width'],
    ['Lt', 'm', 'beam length'], ['rho', 'kg/m^3', 'density'], ['E', 'Pa', 'modulus'], ['MOR', 'Pa', 'strength'], ['b', 'm', 'breadth'], ['h', 'm', 'depth'],
    ['q', 'N/m', 'weight per length'], ['Wself', 'N', 'self weight'], ['R', 'N', 'reaction at each support'], ['a0', 'm', 'mid-span station'],
    ['Mload', 'N m', 'moment from the load'], ['Mself', 'N m', 'moment from self weight'], ['M', 'N m', 'moment at mid-span'],
    ['A', 'm^2', 'section area'], ['S', 'm^3', 'section modulus'], ['I', 'm^4', 'second moment'], ['sigma', 'Pa', 'bending stress'],
    ['f', '1', 'factor'], ['sigmaAllow', 'Pa', 'allowable stress'], ['dload', 'm', 'sag from the load'], ['dself', 'm', 'sag from self weight'], ['delta', 'm', 'sag'],
    ['n', '1', 'sag ratio'], ['deltaLim', 'm', 'sag limit'],
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  const station = ofLeaf(leaf('mid-span', 0, 'm', { class: 'given', by: intent.by, grounds: 'the load is carried at the middle of the span' }));
  const ratioLimit = leaf('depth to breadth limit of an unbraced sawn beam', 2, '1', { class: 'configuration', source: NDS.cite });
  const system: System = {
    name: 'a beam on two supports under a load',
    vars,
    relations: [
      { kind: 'law', sym: 'P', law: WEIGHT, args: { m: 'm', g: 'g' } },
      { kind: 'term', sym: 'Lt', term: add(v['L']!, v['s']!), name: 'beam length', grounds: 'the beam reaches the outer edge of each knife edge: the span plus one knife-edge width' },
      { kind: 'law', sym: 'q', law: LINE_WEIGHT, args: { rho: 'rho', b: 'b', h: 'h', g: 'g' } },
      { kind: 'term', sym: 'Wself', term: mul(v['q']!, v['Lt']!), name: 'self weight', grounds: 'weight per length over the whole length' },
      { kind: 'law', sym: 'R', law: TWO_SUPPORTS, args: { P: 'P', W: 'Wself' } },
      { kind: 'law', sym: 'Mload', law: PATCH_MOMENT, args: { P: 'P', L: 'L', w: 'w', a: 'a0' } },
      { kind: 'law', sym: 'Mself', law: SELF_MOMENT, args: { q: 'q', L: 'L', Lt: 'Lt', a: 'a0' } },
      { kind: 'term', sym: 'M', term: add(v['Mload']!, v['Mself']!), name: 'moment at mid-span', grounds: 'superposition of the load\'s and the beam\'s own moments (linear elastic)' },
      { kind: 'law', sym: 'A', law: RECT_AREA, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'S', law: RECT_MODULUS, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'I', law: RECT_I, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'sigma', law: BENDING_STRESS, args: { M: 'M', S: 'S' } },
      { kind: 'term', sym: 'sigmaAllow', term: div(v['MOR']!, v['f']!), name: 'allowable stress', grounds: 'the strength over the declared factor' },
      { kind: 'law', sym: 'dload', law: PATCH_SAG, args: { P: 'P', L: 'L', w: 'w', E: 'E', I: 'I', h: 'h' } },
      { kind: 'law', sym: 'dself', law: SELF_SAG, args: { q: 'q', L: 'L', Lt: 'Lt', E: 'E', I: 'I', h: 'h' } },
      { kind: 'term', sym: 'delta', term: add(v['dload']!, v['dself']!), name: 'sag', grounds: 'superposition (linear elastic)' },
      { kind: 'term', sym: 'deltaLim', term: div(v['L']!, v['n']!), name: 'sag limit', grounds: 'the span over the declared ratio' },
      { kind: 'constrain', holds: le(v['sigma']!, v['sigmaAllow']!), says: 'strength: the bending stress is within the strength at the declared factor', role: 'design', source: 'the intent' },
      { kind: 'constrain', holds: le(v['delta']!, v['deltaLim']!), says: 'stiffness: the sag is within the declared limit', role: 'design', source: 'the intent' },
      { kind: 'constrain', holds: le(div(v['h']!, v['b']!), ratioLimit), says: 'lateral stability of an unbraced sawn beam: d/b ≤ 2 needs no lateral support', role: 'validity', source: NDS.cite },
    ],
    bindings: {
      m: ofLeaf(intent.mass), g, L: ofLeaf(intent.span), w: ofLeaf(intent.patch), s: contract.supportWidth,
      rho: mat.density, E: mat.E, MOR: mat.strength, f: ofLeaf(intent.factor), n: ofLeaf(intent.sagRatio), a0: station,
    },
  };
  return { system, station };
}

export interface BeamConfiguration {
  frame: Frame;
  bodies: { beam: Prism; supports: [Prism, Prism]; load: Prism };
  couplings: RestCoupling[];
  reactions: [Derivation, Derivation];
  balance: ReturnType<typeof ledger>;
  totalLength: Derivation;
  rigid: RigidDomain;
}

/** Construction: the bodies and every coordinate as a coupling solution in the declared frame. */
export function construct(intent: BeamIntent, mat: MaterialLeaves, bound: Record<string, Derivation>, contract: RigidContract, frame: Frame, groundAt: (x: Derivation, z: Derivation) => Derivation, obs: Observer): BeamConfiguration {
  const need = (sym: string) => { const d = bound[sym]; if (!d) throw new Error(`${sym} is not bound: nothing is built from a free variable`); return d; };
  const steel = materialLeaves('steel.a36');
  const zero = coordinate('across: the frame\'s centre line', frame, 'z', neg(variable('o', 'm')), {});
  const zeroX = coordinate('along: mid-span', frame, 'x', neg(variable('o', 'm')), {});
  const L = need('L'), Lt = need('Lt'), b = need('b'), h = need('h'), w = need('w');
  const beam: Prism = { name: 'the beam', extents: { x: Lt, y: h, z: b }, material: mat.id, density: mat.density };
  const H = ofLeaf(intent.supportHeight), D = ofLeaf(intent.supportDepth);
  const supports: [Prism, Prism] = [
    { name: 'the left support', extents: { x: contract.supportWidth, y: H, z: D }, material: contract.words.supportMaterial, density: materialLeaves(contract.words.supportMaterial).density },
    { name: 'the right support', extents: { x: contract.supportWidth, y: H, z: D }, material: contract.words.supportMaterial, density: materialLeaves(contract.words.supportMaterial).density },
  ];
  const Lv = variable('L', 'm', 'span');
  const xs = [coordinate('x of the left support: half a span before mid-span', frame, 'x', neg(div(Lv, k(2))), { L }), coordinate('x of the right support: half a span past mid-span', frame, 'x', div(Lv, k(2)), { L })];
  supports.forEach((s, i) => standOn(s, groundAt(xs[i]!, zero), xs[i]!, zero));
  const couplings: RestCoupling[] = [];
  const tops = supports.map(topOf);
  // the beam rests on both: one coupling each, the same boundary height by symmetry (checked by the ledger below)
  const c1 = restOn(beam, supports[0], tops[0]!, contract.clearance, zeroX, zero);
  const c2: RestCoupling = { ...restOn({ ...beam }, supports[1], tops[1]!, contract.clearance, zeroX, zero), above: beam.name };
  couplings.push(c1, c2);
  const across = ofLeaf(intent.across);
  const hl = apply(EXTENT_FROM_MASS, { m: need('m'), rho: steel.density, x: w, z: across }, 'height of the load');
  const load: Prism = { name: 'the load', extents: { x: w, y: hl, z: across }, material: steel.id, density: steel.density };
  couplings.push(restOn(load, beam, topOf(beam), contract.clearance, zeroX, zero));
  const R = need('R');
  c1.reaction = R; c2.reaction = R;
  const balance = ledger('the supports carry the load and the beam', [R, R], evaluate('all the weight', add(variable('P', 'N'), variable('W', 'N')), { P: need('P'), W: need('Wself') }, { unit: 'N', law: 'the load and the beam\'s own weight' }));
  const rigid = rigidDomain(mat.E, mat.density, Lt, obs);
  return { frame, bodies: { beam, supports, load }, couplings, reactions: [R, R], balance, totalLength: Lt, rigid };
}

export interface Slice {
  intent: BeamIntent;
  frame: Frame;
  observer: Observer;
  contract: RigidContract;
  semantics: BeamSemantics;
  /** The system solved with the section free: what is bound without it, and what is reported free. */
  open: Solution;
  choice: Choice;
  configuration: BeamConfiguration | null;
  realization: Realization | null;
  /** The bending moment as a field over the span, with its quasi-static scale band. */
  moment: Field | null;
  comparisons: Comparison[];
  /** The share of the span the kernel observes: zero, for seams are points. */
  observed: Derivation | null;
  journal: Journal;
}

/** The bound on loading time over the first period below which a static derivation does not hold: an assumption with grounds. */
export const QUASI_STATIC = leaf('quasi-static bound', 10, '1', { class: 'assumed', by: 'the restart', grounds: 'a load that settles over ten periods of the first mode excites it little: the static derivation holds at that window; faster, the beam rings and the moment is not the static one' });

/**
 * The bending moment as a field over the span: the load's and the beam's own moments composed over the coordinate
 * x, in the domain between the reaction lines, holding at windows slower than the beam's first period.
 */
export function momentField(frame: Frame, bound: Record<string, Derivation>, spanRealized: Derivation, T1: Derivation): Field {
  const x = variable('x', 'm', 'coordinate x');
  const L2 = variable('L', 'm', 'span');
  const lo = evaluate('left reaction line', neg(div(L2, k(2))), { L: spanRealized }, { unit: 'm', law: 'the span is centred on the frame origin' });
  const hi = evaluate('right reaction line', div(L2, k(2)), { L: spanRealized }, { unit: 'm', law: 'the span is centred on the frame origin' });
  const over = domain(frame, { x: { lo, hi } }, [{ says: 'quasi-static: the sample\'s time support covers at least the declared number of first periods', holds: ge(variable('dt', 's', 'time support'), mul(QUASI_STATIC, variable('T1', 's', 'first period'))), env: { T1 } }]);
  return field('bending moment along the span', 'N m', over, { x }, { P: bound['P']!, L: spanRealized, w: bound['w']!, q: bound['q']!, Lt: bound['Lt']! },
    [{ law: PATCH_MOMENT, bind: { a: abs(x) } }, { law: SELF_MOMENT, bind: { a: abs(x) } }], ([load, self]) => add(load!, self!));
}

/** The slice end to end. Without a kernel instance it stops after construction. */
export function beamOnTwoSupports(intent: BeamIntent, material: MaterialLeaves, catalogue: Option[], J?: Jolt): Slice {
  const journal = new Journal();
  const frame = declareFrame(intent.by, 'x along the span, y opposite gravity, z across; origin on the ground midway between the supports');
  const obs = observer('rigid-body kernel');
  const contract = rigidContract();
  const g = gravity();
  const ground = flatGround(frame, intent.by, 'the supports stand on a level floor');
  const semantics = beamSystem(intent, material, g, contract);
  for (const d of Object.values(semantics.system.bindings)) journal.append({ kind: 'record', record: d });
  const open = solve(semantics.system);
  for (const f of open.free) journal.append({ kind: 'note', text: `free: ${f.name} (${f.sym}); would be bound by ${f.wouldBind.map((w) => `${w.by} waiting on ${w.waitingOn.join(', ')}`).join('; ') || 'nothing in the system'}` });
  const choice = search(semantics.system, catalogue, leastMaterial(intent.by));
  for (const c of choice.candidates) if (!c.admissible) journal.append({ kind: 'refusal', what: c.option.label, domain: [...c.refused, ...c.unsatisfied, ...c.undecided].join('; ') });
  if (choice.pick) journal.append({ kind: 'choice', why: choice.why!, among: choice.manifold.length, label: choice.pick.option.label });
  let configuration: BeamConfiguration | null = null, realization: Realization | null = null, moment: Field | null = null, observed: Derivation | null = null;
  const comparisons: Comparison[] = [];
  if (choice.pick) {
    const bound = choice.pick.solution.bound;
    for (const d of Object.values(bound)) journal.append({ kind: 'record', record: d });
    configuration = construct(intent, material, bound, contract, frame, ground.height, obs);
    for (const body of [configuration.bodies.beam, ...configuration.bodies.supports, configuration.bodies.load]) for (const d of Object.values(body.centre!)) journal.append({ kind: 'record', record: d });
    journal.append({ kind: 'record', record: configuration.balance.residual });
    journal.append({ kind: 'record', record: configuration.rigid.holds });
    if (J && configuration.rigid.rigid) {
      realization = realizeRigid(J, contract, { ...configuration.bodies, totalLength: configuration.totalLength, patch: bound['w']!, gravity: g, ground: ground.height(frame.origin.x, frame.origin.z) }, obs);
      // the moment as a field over the span, with the span as the realization holds it (reaction lines within the knife edges)
      const Lr = evaluate('span as realized', add(variable('L', 'm'), variable('o', 'm')), { L: bound['L']!, o: contract.reactionOffset }, { unit: 'm', law: 'the span between reaction lines: the centre distance plus the knife-edge offset' });
      const T1 = apply(FIRST_PERIOD, { L: bound['L']!, E: bound['E']!, I: bound['I']!, rho: bound['rho']!, A: bound['A']!, h: bound['h']! });
      moment = momentField(frame, bound, Lr, T1);
      journal.append({ kind: 'record', record: T1 });
      for (const sm of realization.moments) {
        // the field as the kernel resolves it: a point in x, the quiet time in t; refused if that window is not quasi-static
        const derived = coarse(moment, realization.resolution, { x: sm.station }, `bending moment at bond ${sm.bond}, derived`);
        const cmp = compare(`moment at bond ${sm.bond}`, derived, sm.moment, { name: contract.name, relative: contract.momentError });
        comparisons.push(cmp);
        journal.append({ kind: 'comparison', comparison: cmp });
      }
      observed = coverage(moment.over, realization.resolution, realization.moments.map((sm) => ({ x: sm.station })), 'x');
      journal.append({ kind: 'record', record: observed });
      const sagCmp = compare('mid-span sag', bound['delta']!, realization.sag, { name: contract.name, relative: contract.momentError });
      comparisons.push(sagCmp);
      journal.append({ kind: 'comparison', comparison: sagCmp });
      journal.append({ kind: 'record', record: realization.stood });
      journal.append({ kind: 'record', record: realization.drop });
    }
  }
  return { intent, frame, observer: obs, contract, semantics, open, choice, configuration, realization, moment, comparisons, observed, journal };
}

/** The intent of Part XXV, as the person gives it. */
export function partXXV(by = 'the person'): BeamIntent {
  const given = (name: string, v: number, unit: string, grounds?: string) => leaf(name, v, unit, { class: 'given', by, ...(grounds ? { grounds } : {}) });
  return {
    by,
    mass: given('mass to carry', 60, 'kg'),
    span: given('span between the supports', 1.2, 'm'),
    patch: given('length of the thing carried, along the beam', 0.1, 'm'),
    across: given('width of the thing carried, across the beam', 0.3, 'm'),
    supportHeight: given('height of the supports', 0.5, 'm', 'the supports the person has'),
    supportDepth: given('depth of the supports across the beam', 0.2, 'm', 'the supports the person has'),
    sagRatio: leaf('sag ratio', 300, '1', { class: 'assumed', by, grounds: 'span/300 is the customary serviceability limit for perceptible sag in floors (building codes; a declared limit, not a law)' }),
    factor: leaf('factor on strength', 3, '1', { class: 'assumed', by, grounds: 'clear-wood strength is a mean; a factor of three covers grade, moisture and duration of load for a single member (the NDS adjustment factors compound to about that for sawn lumber)' }),
  };
}
