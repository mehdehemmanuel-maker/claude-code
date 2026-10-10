// The second slice: a bracket. An arm bolted to the side of a post carries a load at a reach. The joint is a
// coupling whose shared boundary variables, the root moment and shear, are read from the solution, bounded by the
// bolt group's capacity at a declared factor, and measured by the kernel. Nothing here is a kind: the post, the arm
// and the load are prisms; the joint is a relation between two faces.

import { getMaterial } from '../../data/materials';
import { PROPERTY_CLASSES } from '../../engineering/threads';
import { BENDING_STRESS, CANTILEVER_MOMENT, CANTILEVER_SHEAR, CANTILEVER_TIP_SAG, EXTENT_FROM_MASS, GROUP_BENDING, GROUP_TENSION, LINE_WEIGHT, NDS, RECT_AREA, RECT_I, RECT_MODULUS, STRESS_AREA, WEIGHT } from '../book';
import { admitBy, leastMaterial, lumberCatalogue, materialLeaves, type MaterialLeaves } from './beam';
import { Language, type Judgement } from './abduce';
import { coordinate, ledger, restOn, restStability, standOn, topOf, type Prism, type RestCoupling, type RestStability } from './coupling';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { declareFrame, flatGround, gravity, observer, type Frame, type Ground, type Observer } from './field';
import { apply, law, type Law } from './law';
import { compare, type Comparison } from './observe';
import { Journal } from './journal';
import { realizeBracket, type JointRealization, type JointSpec } from './realize-joint';
import { rigidContract, type Jolt, type RigidContract } from './realize';
import { elasticContract, realizeCantilever, type CantileverRealization } from './elastic';
import { search, solve, type Choice, type Option, type Solution, type System } from './solve';
import { add, div, intentLeaf, k, le, leaf, max, min, mul, neg, sub, variable, type Leaf } from './term';

export interface BracketIntent {
  by: string;
  mass: Leaf;
  /** The load's centre from the post's face. */
  reach: Leaf;
  armLength: Leaf;
  patch: Leaf;
  across: Leaf;
  postHeight: Leaf;
  postSide: Leaf;
  sagRatio: Leaf;
  factor: Leaf;
}

/** Metric coarse bolts of one property class, one or two of them: configuration leaves with their standards. */
export function boltCatalogue(): Option[] {
  const sizes: [string, number, number][] = [['M6', 0.006, 0.001], ['M8', 0.008, 0.00125], ['M10', 0.01, 0.0015], ['M12', 0.012, 0.00175]];
  const out: Option[] = [];
  for (const [name, d, p] of sizes) for (const n of [1, 2]) {
    out.push({
      label: `${name} ×${n}`,
      leaves: {
        d: leaf(`${name} nominal diameter`, d, 'm', { class: 'configuration', source: 'ISO 262 metric coarse threads' }),
        p: leaf(`${name} pitch`, p, 'm', { class: 'configuration', source: 'ISO 262 metric coarse threads' }),
        Rm: leaf('tensile strength, property class 8.8', PROPERTY_CLASSES['8.8']!.Rm, 'Pa', { class: 'configuration', source: PROPERTY_CLASSES['8.8']!.source }),
        nb: leaf(`${n} bolt${n > 1 ? 's' : ''}`, n, '1', { class: 'configuration', source: 'the bolts the person can fit on the face' }),
      },
    });
  }
  return out;
}

/** Every section with every bolt group: the product of the two catalogues. */
export function bracketCatalogue(): Option[] {
  const out: Option[] = [];
  for (const s of lumberCatalogue()) for (const b of boltCatalogue()) out.push({ label: `${s.label} + ${b.label}`, leaves: { ...s.leaves, ...b.leaves } });
  return out;
}

/** The second preference: the least bolt steel, which breaks ties among sections of equal area. */
export function leastSteel(by: string): Law {
  return law({
    id: 'preference.least-bolt-steel', name: 'Least bolt steel', statement: 'Among what carries the load, the fewest and smallest bolts.', formula: 'min n A_s',
    inputs: [{ sym: 'nb', unit: '1', name: 'bolts' }, { sym: 'As', unit: 'm^2', name: 'tensile stress area' }], output: { sym: 'steel', unit: 'm^2', name: 'bolt steel per length of thread' },
    term: mul(variable('nb', '1', 'bolts'), variable('As', 'm^2', 'tensile stress area')), domain: [], source: { cite: `declared by ${by}: the fewest and smallest bolts that hold`, kind: 'declaration' },
  });
}

export function bracketSystem(intent: BracketIntent, mat: MaterialLeaves, g: Derivation, jointConstraint = true): System {
  const vars = [
    ['m', 'kg', 'mass carried'], ['g', 'm/s^2', 'gravity'], ['P', 'N', 'load'], ['ell', 'm', 'arm length'], ['a', 'm', 'reach'], ['w', 'm', 'patch width'],
    ['rho', 'kg/m^3', 'density'], ['E', 'Pa', 'modulus'], ['MOR', 'Pa', 'strength'], ['b', 'm', 'breadth'], ['h', 'm', 'depth'],
    ['q', 'N/m', 'weight per length'], ['M', 'N m', 'root moment'], ['V', 'N', 'root shear'],
    ['A', 'm^2', 'section area'], ['S', 'm^3', 'section modulus'], ['I', 'm^4', 'second moment'], ['sigma', 'Pa', 'bending stress'],
    ['f', '1', 'factor'], ['sigmaAllow', 'Pa', 'allowable stress'], ['delta', 'm', 'tip sag'], ['n', '1', 'sag ratio'], ['deltaLim', 'm', 'sag limit'],
    ['d', 'm', 'bolt diameter'], ['p', 'm', 'thread pitch'], ['Rm', 'Pa', 'bolt tensile strength'], ['nb', '1', 'bolts'], ['As', 'm^2', 'tensile stress area'],
    ['Ft', 'N', 'tensile capacity of the group'], ['side', 'm', 'post side'], ['bondW', 'm', 'bonded face width'], ['lever', 'm', 'lever of the group'], ['Mcap', 'N m', 'bending capacity of the joint'], ['Mneed', 'N m', 'root moment at the factor'],
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  const ratioLimit = leaf('depth to breadth limit of an unbraced sawn beam', 2, '1', { class: 'configuration', source: NDS.cite });
  return {
    name: 'an arm bolted to a post, carrying a load at a reach',
    vars,
    relations: [
      { kind: 'law', sym: 'P', law: WEIGHT, args: { m: 'm', g: 'g' } },
      { kind: 'law', sym: 'q', law: LINE_WEIGHT, args: { rho: 'rho', b: 'b', h: 'h', g: 'g' } },
      { kind: 'law', sym: 'M', law: CANTILEVER_MOMENT, args: { P: 'P', a: 'a', q: 'q', ell: 'ell' } },
      { kind: 'law', sym: 'V', law: CANTILEVER_SHEAR, args: { P: 'P', q: 'q', ell: 'ell' } },
      { kind: 'law', sym: 'A', law: RECT_AREA, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'S', law: RECT_MODULUS, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'I', law: RECT_I, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'sigma', law: BENDING_STRESS, args: { M: 'M', S: 'S' } },
      { kind: 'term', sym: 'sigmaAllow', term: div(v['MOR']!, v['f']!), name: 'allowable stress', grounds: 'the strength over the declared factor' },
      { kind: 'law', sym: 'delta', law: CANTILEVER_TIP_SAG, args: { P: 'P', a: 'a', w: 'w', ell: 'ell', q: 'q', E: 'E', I: 'I', h: 'h' } },
      { kind: 'term', sym: 'deltaLim', term: div(v['ell']!, v['n']!), name: 'sag limit', grounds: 'the arm over the declared ratio' },
      { kind: 'law', sym: 'As', law: STRESS_AREA, args: { d: 'd', p: 'p' } },
      { kind: 'law', sym: 'Ft', law: GROUP_TENSION, args: { n: 'nb', As: 'As', Rm: 'Rm' } },
      { kind: 'term', sym: 'bondW', term: min(v['b']!, v['side']!), name: 'bonded face width', grounds: 'the arm\'s end meets the post\'s face: the lesser of the two across' },
      { kind: 'term', sym: 'lever', term: div(max(v['bondW']!, v['h']!), k(2)), name: 'lever of the group', grounds: 'half the larger extent of the bonded face' },
      { kind: 'law', sym: 'Mcap', law: GROUP_BENDING, args: { Ft: 'Ft', lever: 'lever' } },
      { kind: 'term', sym: 'Mneed', term: mul(v['M']!, v['f']!), name: 'root moment at the factor', grounds: 'the root moment times the declared factor' },
      { kind: 'constrain', holds: le(v['sigma']!, v['sigmaAllow']!), says: 'strength: the bending stress is within the strength at the declared factor', role: 'design', source: 'the intent' },
      { kind: 'constrain', holds: le(v['delta']!, v['deltaLim']!), says: 'stiffness: the tip sag is within the declared limit', role: 'design', source: 'the intent' },
      ...(jointConstraint ? [{ kind: 'constrain' as const, holds: le(v['Mneed']!, v['Mcap']!), says: 'the joint: the bolt group carries the root moment at the declared factor', role: 'design' as const, source: 'the intent' }] : []),
      { kind: 'constrain', holds: le(div(v['h']!, v['b']!), ratioLimit), says: 'lateral stability of an unbraced sawn beam: d/b ≤ 2 needs no lateral support', role: 'validity', source: NDS.cite },
    ],
    bindings: {
      m: ofLeaf(intent.mass), g, ell: ofLeaf(intent.armLength), a: ofLeaf(intent.reach), w: ofLeaf(intent.patch),
      rho: mat.density, E: mat.E, MOR: mat.strength, f: ofLeaf(intent.factor), n: ofLeaf(intent.sagRatio), side: ofLeaf(intent.postSide),
    },
  };
}

export interface BracketConfiguration {
  frame: Frame;
  ground: Ground;
  bodies: { post: Prism; arm: Prism; load: Prism };
  joint: JointSpec;
  couplings: RestCoupling[];
  balance: ReturnType<typeof ledger>;
  rests: Derivation;
  /** The joint is expected to hold: the derivation's answer, 1 or 0. */
  jointHolds: Derivation;
  stability: Record<string, RestStability>;
}

/** The post stands at the origin; the arm's end is bolted to its side, its top flush with the post's; the load rests on the arm at its reach. */
export function constructBracket(intent: BracketIntent, mat: MaterialLeaves, bound: Record<string, Derivation>, contract: RigidContract, frame: Frame, ground: Ground): BracketConfiguration {
  const need = (sym: string) => { const d = bound[sym]; if (!d) throw new Error(`${sym} is not bound: nothing is built from a free variable`); return d; };
  const zero = coordinate('across: the frame\'s centre line', frame, 'z', neg(variable('o', 'm')), {});
  const origin = coordinate('along: the post\'s centre', frame, 'x', neg(variable('o', 'm')), {});
  const side = ofLeaf(intent.postSide), H = ofLeaf(intent.postHeight);
  const post: Prism = { name: 'the post', extents: { x: side, y: H, z: side }, material: mat.id, density: mat.density };
  standOn(post, ground.height(origin, zero), origin, zero);
  const ell = need('ell'), b = need('b'), h = need('h');
  const arm: Prism = { name: 'the arm', extents: { x: ell, y: h, z: b }, material: mat.id, density: mat.density };
  const S = variable('s', 'm', 'post side'), L = variable('l', 'm', 'arm length'), Hh = variable('h', 'm', 'arm depth');
  const armX = coordinate('x of the arm: half the post past its centre, then half the arm', frame, 'x', add(div(S, k(2)), div(L, k(2))), { s: side, l: ell });
  const postTop = topOf(post);
  const armY = evaluate('y of the arm: its top flush with the post\'s top', sub(variable('t', 'm', 'post top'), div(Hh, k(2))), { t: postTop, h }, { unit: 'm', law: 'coupling: the arm\'s top face meets the post\'s top edge' });
  arm.centre = { x: armX, y: armY, z: zero };
  // the joint's frames in each body's own coordinates: coupling solutions
  const joint: JointSpec = {
    onPost: {
      x: evaluate('joint on the post: its side face', div(S, k(2)), { s: side }, { unit: 'm', law: 'the face is half the side from the centre' }),
      y: evaluate('joint on the post: the arm\'s height above the post\'s centre', sub(variable('a', 'm', 'arm y'), variable('p', 'm', 'post y')), { a: armY, p: post.centre!.y }, { unit: 'm', law: 'the joint sits at the arm\'s centre height' }),
      z: evaluate('joint on the post: its centre line', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the joint is centred across' }),
    },
    onArm: {
      x: evaluate('joint on the arm: its root end', neg(div(L, k(2))), { l: ell }, { unit: 'm', law: 'the root is half the arm before its centre' }),
      y: evaluate('joint on the arm: its centre height', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the joint is centred on the arm\'s end face' }),
      z: evaluate('joint on the arm: its centre line', neg(variable('z', 'm')), { z: zero }, { unit: 'm', law: 'the joint is centred across' }),
    },
    diameter: need('d'), count: need('nb'), bondW: need('bondW'), bondL: h, propertyClass: boltClassOf(need('Rm')),
  };
  const steel = materialLeaves('steel.a36');
  const w = need('w'), across = ofLeaf(intent.across);
  const hl = apply(EXTENT_FROM_MASS, { m: need('m'), rho: steel.density, x: w, z: across }, 'height of the load');
  const load: Prism = { name: 'the load', extents: { x: w, y: hl, z: across }, material: steel.id, density: steel.density };
  const loadX = coordinate('x of the load: half the post past its centre, then the reach', frame, 'x', add(div(S, k(2)), variable('a', 'm', 'reach')), { s: side, a: need('a') });
  const couplings = [restOn(load, arm, topOf(arm), contract.clearance, loadX, zero)];
  const balance = ledger('the joint carries the load and the arm', [need('V')], evaluate('all the weight', add(variable('P', 'N'), variable('W', 'N')), { P: need('P'), W: evaluate('weight of the arm', mul(variable('q', 'N/m'), variable('l', 'm')), { q: need('q'), l: ell }, { unit: 'N', law: 'weight per length over the length' }) }, { unit: 'N', law: 'the load and the arm\'s own weight' }));
  const rests = evaluate('rests: the joint carries all the weight, so the configuration is in static equilibrium', le(variable('r', 'N', 'residual'), variable('tol', 'N', 'tolerance')), { r: balance.residual, tol: evaluate('a tolerance of nothing', mul(k(1e-9), variable('W', 'N')), { W: need('P') }, { unit: 'N', law: 'rounding' }) }, { unit: '1', law: 'statics: a balanced ledger is equilibrium' });
  const jointHolds = evaluate('the joint holds: the root moment is within the group\'s capacity', le(variable('M', 'N m'), variable('C', 'N m')), { M: need('M'), C: need('Mcap') }, { unit: '1', law: GROUP_BENDING.hash });
  const stability = { 'the load on the arm': restStability(load, arm) };
  return { frame, ground, bodies: { post, arm, load }, joint, couplings, balance, rests, jointHolds, stability };
}

/** The kernel's name for a property class of this tensile strength. */
export function boltClassOf(Rm: Derivation): string {
  const hit = Object.values(PROPERTY_CLASSES).find((c) => Math.abs(c.Rm - (Rm.value ?? NaN)) < 1);
  if (!hit) throw new Error(`no property class of tensile strength ${Rm.value} Pa`);
  return hit.id;
}

export interface BracketSlice {
  intent: BracketIntent;
  frame: Frame;
  observer: Observer;
  contract: RigidContract;
  system: System;
  open: Solution;
  choice: Choice;
  configuration: BracketConfiguration | null;
  realization: JointRealization | null;
  /** The second realization: the arm's elastic line from a fixed root, which observes the tip sag. */
  elastic: CantileverRealization | null;
  comparisons: Comparison[];
  admission: { coupling: string; judgement: Judgement }[];
  refusedBy: string[];
  journal: Journal;
}

/** The bracket's couplings' quantities as the language's relations name them: the joint, and the load's rest on the arm. */
export function bracketQuantities(c: BracketConfiguration, bound: Record<string, Derivation>, g: Derivation, obs: Observer): Record<string, Record<string, Derivation>> {
  const out: Record<string, Record<string, Derivation>> = { 'the arm on the post': { M: bound['M']!, V: bound['V']!, d: bound['d']!, nb: bound['nb']!, Rm: bound['Rm']!, lever: bound['lever']! } };
  for (const [name, st] of Object.entries(c.stability)) out[name] = { hcm: st.hcm, halfX: st.halfX, halfZ: st.halfZ, g, patience: obs.patience, mass: bound['m']! };
  return out;
}

export function bracketOnPost(intent: BracketIntent, material: MaterialLeaves, catalogue: Option[], J?: Jolt, opts: { jointConstraint?: boolean; language?: Language } = {}): BracketSlice {
  const journal = new Journal();
  const frame = declareFrame(intent.by, 'x along the arm, y opposite gravity, z across; origin on the ground at the post\'s centre');
  const obs = observer('rigid-body kernel');
  const contract = rigidContract();
  const g = gravity();
  const ground = flatGround(frame, intent.by, 'a level floor');
  const system = bracketSystem(intent, material, g, opts.jointConstraint ?? true);
  for (const d of Object.values(system.bindings)) journal.append({ kind: 'record', record: d });
  const open = solve(system);
  for (const f of open.free) journal.append({ kind: 'note', text: `free: ${f.name} (${f.sym})` });
  const choice = search(system, catalogue, [leastMaterial(intent.by), leastSteel(intent.by)]);
  for (const c of choice.candidates) if (!c.admissible) journal.append({ kind: 'refusal', what: c.option.label, domain: [...c.refused, ...c.unsatisfied, ...c.undecided].join('; ') });
  if (choice.pick) journal.append({ kind: 'choice', why: choice.why!, among: choice.manifold.length, label: choice.pick.option.label });
  let configuration: BracketConfiguration | null = null, realization: JointRealization | null = null, elastic: CantileverRealization | null = null;
  let admission: BracketSlice['admission'] = [], refusedBy: string[] = [];
  const comparisons: Comparison[] = [];
  if (choice.pick) {
    const bound = choice.pick.solution.bound;
    for (const d of Object.values(bound)) journal.append({ kind: 'record', record: d });
    configuration = constructBracket(intent, material, bound, contract, frame, ground);
    for (const body of Object.values(configuration.bodies)) for (const d of Object.values(body.centre!)) journal.append({ kind: 'record', record: d });
    for (const d of [...Object.values(configuration.joint.onPost), ...Object.values(configuration.joint.onArm), configuration.balance.residual, configuration.rests, configuration.jointHolds]) journal.append({ kind: 'record', record: d });
    ({ admission, refusedBy } = admitBy(opts.language ?? new Language(), bracketQuantities(configuration, bound, g, obs)));
    for (const a of admission) journal.append({ kind: 'record', record: a.judgement.holds });
    for (const r of refusedBy) journal.append({ kind: 'refusal', what: 'the configuration', domain: r });
    // the elastic realization: the arm's line from a fixed root, pinned by nothing else; it sees the sag the kernel cannot
    elastic = realizeCantilever(elasticContract(), { frame, P: bound['P']!, a: bound['a']!, w: bound['w']!, q: bound['q']!, ell: bound['ell']!, E: bound['E']!, I: bound['I']! });
    const exact = ofLeaf(leaf('no error beyond what the realization measured on itself', 0, '1', { class: 'configuration', source: elastic.contract.name }));
    for (const [name, derived, measured] of [['tip sag (elastic)', bound['delta']!, elastic.tipSag], ['root moment (elastic)', bound['M']!, elastic.rootMoment], ['root shear (elastic)', bound['V']!, elastic.rootShear]] as const) {
      const c = compare(name, derived, measured, { name: elastic.contract.name, relative: exact });
      comparisons.push(c);
      journal.append({ kind: 'comparison', comparison: c });
    }
    if (J && !refusedBy.length) {
      realization = realizeBracket(J, contract, { ...configuration.bodies, joint: configuration.joint, gravity: g, ground }, obs);
      const binary = ofLeaf(leaf('no tolerance on a yes or no', 0, '1', { class: 'configuration', source: 'a binary outcome either agrees or does not' }));
      const pairs: [string, Derivation, Derivation, Derivation][] = [
        ['root moment at the joint', bound['M']!, realization.moment, contract.jointLoadError],
        ['root shear at the joint', bound['V']!, realization.shear, contract.jointLoadError],
        ['the joint holds', configuration.jointHolds, realization.holds, binary],
        ['rests', configuration.rests, realization.inPlace, binary],
        ['utilisation of the joint', evaluate('utilisation of the joint, derived', div(variable('M', 'N m'), variable('C', 'N m')), { M: bound['M']!, C: bound['Mcap']! }, { unit: '1', law: 'the root moment over the group\'s bending capacity' }), realization.utilisation, contract.jointLoadError],
        ['tip sag', bound['delta']!, realization.sag, contract.jointLoadError],
      ];
      for (const [name, derived, measured, relative] of pairs) { const c = compare(name, derived, measured, { name: contract.name, relative }); comparisons.push(c); journal.append({ kind: 'comparison', comparison: c }); }
      for (const d of [realization.stood, realization.settled, realization.axial]) journal.append({ kind: 'record', record: d });
    }
  }
  return { intent, frame, observer: obs, contract, system, open, choice, configuration, realization, elastic, comparisons, admission, refusedBy, journal };
}

/** A bracket as a person asks for it. */
export function bracketIntent(by = 'the person', over: Partial<Record<'mass' | 'reach' | 'armLength' | 'patch' | 'across' | 'postSide', number>> = {}): BracketIntent {
  const given = (name: string, v: number | undefined, fallback: number, unit: string, grounds: string) => intentLeaf(by, name, v, fallback, unit, grounds);
  return {
    by,
    mass: given('mass to carry', over.mass, 20, 'kg', 'a load a person carries'),
    reach: given('reach of the load from the post\'s face', over.reach, 0.5, 'm', 'half a metre out'),
    armLength: given('length of the arm', over.armLength, 1.0, 'm', 'a metre of arm, inside the slender domain'),
    patch: given('length of the thing carried, along the arm', over.patch, 0.1, 'm', 'a hand-sized patch'),
    across: given('width of the thing carried, across the arm', over.across, 0.1, 'm', 'a hand-sized patch'),
    postHeight: given('height of the post', undefined, 1, 'm', 'a post of a metre'),
    postSide: given('side of the square post', over.postSide, 0.1, 'm', 'a square post of a decimetre'),
    sagRatio: leaf('sag ratio', 180, '1', { class: 'assumed', by, grounds: 'span/180 is the customary serviceability limit for a cantilever, twice a span\'s L/360 (building codes; a declared limit, not a law)' }),
    factor: leaf('factor on strength', 3, '1', { class: 'assumed', by, grounds: 'clear-wood strength is a mean and a bolt group\'s prying model is crude; a factor of three covers both for a single member' }),
  };
}

export const bracketMaterial = (id = 'wood.douglas-fir') => materialLeaves(id);
void getMaterial;
