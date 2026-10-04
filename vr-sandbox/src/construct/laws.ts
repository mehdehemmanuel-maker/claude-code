// The construction laws: the hierarchy of what a lawful configuration must answer (where, at what scale, with what
// geometry, orientation, spacing, connected how, of what, under what conditions, with what flows, for what intent),
// as data with a predicate for when each bears and, where this world can derive it, an executable derivation.
//
// Three things make this a language rather than a list:
//   - relevance is automatic: a law bears on a subject by its family's trigger (heat flows wake the thermal family,
//     contact and motion the mechanical, an organism the biological) and its own; `relevant(subject)` is never a
//     table of combinations
//   - what a law derives is typed: a spacing with its reason, a default size from the person, a limit, a relation for
//     the assembly solver (assembly.ts), an order; generators ask laws, they do not hold numbers
//   - the family grows from the law book by itself: every law of the book with a length among its inputs and a force,
//     a power, a heat flow or a field as its output is also a spacing law (the distance at which that effect falls
//     under a fraction of its value at contact), found by `discoverSpacing`, not written one by one
//
// The seed tree (docs/CONSTRUCTION-AUDIT.md) names every facet; `executable` says which ones this world derives today
// and which it only names, so the gap is data too.

import { LAWS, lawById } from '../ganglia/laws';
import { d, e, hash, q, r, type Structure } from '../ganglia/native/core';
import { lawHash } from '../ganglia/native/terms';
import type { Discovery, Entity, Relation } from '../ganglia/substrate/model';
import { coverageFrom } from '../ganglia/substrate/substrate';
import { dimensionOf, sameDim, DIMS } from '../ganglia/units';
import type { Law } from '../ganglia/types';
import { getMaterial, type Material } from '../data/materials';
import { PART_KINDS } from '../parts/registry';
import { PROCESSES } from '../ganglia/processes';
import { PERSON, round5 } from '../data/people';
import { rigidDomain } from '../ganglia/native/tsc';
import { TICK } from '../physics/protocol';

export type Family = 'existence' | 'spatial' | 'geometric' | 'scale' | 'material' | 'chemical' | 'mechanical' | 'electrical' | 'thermal' | 'fluid' | 'information' | 'control' | 'interface' | 'environmental' | 'manufacturing' | 'biological';

/** What a law is asked about: a part, a member, a machine, an organism, said by what it is, does, carries and touches. */
export interface Subject {
  id?: string;
  /** Substrate kinds and categories: 'component', 'structure', 'organism', 'wheel', 'motor', 'battery'… */
  kinds: string[];
  /** What it does in its assembly: support, carries, seat, stood-on, handhold, spans, braces, encloses, stacks, back. */
  roles: string[];
  /** Flows through it: electric, rotation, heat, signal, fluid, chemical, light, load. */
  flows: string[];
  materials: string[];
  moving?: boolean;
  contact?: boolean;
  /** Its characteristic length, m. */
  length?: number;
  /** Who it is for: a person uses it (sizes come from the person). */
  forPerson?: boolean;
  /** What failed on the stand, when a failure is in question: racking, member, joint, tipping. The laws say what to try. */
  failed?: string[];
}

/** What a law derives, typed. */
export type Derived =
  | { kind: 'spacing'; min: number; why: string; law: string }
  | { kind: 'default'; key: string; value: number; why: string }
  | { kind: 'limit'; what: string; value: number; why: string }
  | { kind: 'order'; before: string; after: string; why: string }
  | { kind: 'stock'; kinds: string[]; why: string }
  | { kind: 'factor'; what: string; value: number; why: string }
  | { kind: 'hypothesis'; what: string; change: Record<string, number | boolean>; why: string; says: string };

export interface ConstructionLaw {
  id: string;
  family: Family;
  facet: string;
  says: string;
  /** The law in Nex: what it constrains, influences or derives, as a structure with its evidence; its hash is its identity. */
  structure: Structure;
  /** When it bears, beyond its family's trigger. */
  bears?: (s: Subject) => boolean;
  /** What it derives for a subject, when this world can; absent, the law is named and not yet derived. */
  derive?: (s: Subject, env: Env) => Derived[];
  source: string;
  /** Laws of the book it rests on. */
  rests?: string[];
}

/** What the environment answers: the ground under a point, what is there, the tick, gravity. */
export interface Env {
  groundAt?: (x: number, z: number) => number;
  gravity?: number;
  tick?: number;
}

// ---- when a family bears -----------------------------------------------------------------------------------------

const has = (xs: string[], ...ys: string[]) => ys.some((y) => xs.includes(y));
export const FAMILY_BEARS: Record<Family, (s: Subject) => boolean> = {
  existence: () => true,
  spatial: () => true,
  geometric: () => true,
  scale: () => true,
  material: (s) => s.materials.length > 0,
  chemical: (s) => has(s.flows, 'chemical') || has(s.kinds, 'battery', 'reaction', 'electrolyte'),
  mechanical: (s) => !!s.contact || !!s.moving || has(s.roles, 'support', 'carries', 'spans', 'braces', 'stood-on', 'seat') || has(s.flows, 'load', 'rotation', 'translation', 'travel'),
  electrical: (s) => has(s.flows, 'electric', 'signal') || has(s.kinds, 'motor', 'battery', 'conductor', 'controller'),
  thermal: (s) => has(s.flows, 'heat', 'electric') || has(s.kinds, 'motor', 'battery', 'resistor'),
  fluid: (s) => has(s.flows, 'fluid') || has(s.kinds, 'pipe', 'pump', 'hull', 'swimmer'),
  information: (s) => has(s.flows, 'signal') || has(s.kinds, 'controller', 'sensor', 'receiver'),
  control: (s) => has(s.flows, 'signal') && (!!s.moving || has(s.kinds, 'servo', 'motor')),
  interface: (s) => has(s.flows, 'electric', 'rotation', 'translation', 'heat', 'signal', 'fluid') || s.roles.length > 0,
  environmental: () => true,
  manufacturing: (s) => s.materials.length > 0,
  biological: (s) => has(s.kinds, 'organism', 'creature', 'cell', 'tissue'),
};

/** Whether a law bears on a subject: its family's trigger and its own. */
export const bears = (law: ConstructionLaw, s: Subject) => FAMILY_BEARS[law.family](s) && (!law.bears || law.bears(s));

// ---- the seed tree, every facet named; the executable ones derive ------------------------------------------------

const F = (family: Family, facets: string[], source: string): ConstructionLaw[] => facets.map((facet) => {
  const id = `${family}.${facet.replace(/\s+/g, '-')}`;
  return { id, family, facet, says: `${family}: ${facet}`, source, structure: r('kind', [d(`construction:${id}`), d(`construction:${family}`)], { mode: 'unknown', ev: { how: 'hypothesized' } }) };
});
const SEED = 'the seed taxonomy of construction laws (docs/CONSTRUCTION-AUDIT.md): named, to be derived';

const NAMED: ConstructionLaw[] = [
  ...F('existence', ['existence', 'identity', 'persistence', 'state', 'lifecycle'], SEED),
  ...F('spatial', ['position', 'orientation', 'distance', 'spacing', 'containment', 'adjacency', 'separation', 'alignment', 'symmetry', 'topology', 'connectivity', 'accessibility'], SEED),
  ...F('geometric', ['shape', 'dimensions', 'aspect ratio', 'curvature', 'thickness', 'volume', 'surface', 'clearance', 'tolerance', 'fit', 'deformation'], SEED),
  ...F('scale', ['characteristic length', 'characteristic time', 'characteristic frequency', 'resolution', 'propagation time', 'response time', 'coarse-graining', 'refinement', 'cross-scale coupling'], SEED),
  ...F('material', ['composition', 'phase', 'compatibility', 'strength', 'conductivity', 'thermal behavior', 'chemical stability', 'corrosion', 'diffusion', 'bonding', 'degradation'], SEED),
  ...F('chemical', ['composition', 'reaction', 'stoichiometry', 'equilibrium', 'kinetics', 'diffusion', 'concentration', 'compatibility', 'reaction pathways'], SEED),
  ...F('mechanical', ['force', 'torque', 'stress', 'strain', 'inertia', 'friction', 'contact', 'vibration', 'stability', 'load paths'], SEED),
  ...F('electrical', ['voltage', 'current', 'impedance', 'power', 'grounding', 'insulation', 'electromagnetic coupling', 'energy storage'], SEED),
  ...F('thermal', ['temperature', 'conduction', 'convection', 'radiation', 'thermal gradients', 'thermal expansion', 'heat rejection'], SEED),
  ...F('fluid', ['pressure', 'flow', 'viscosity', 'turbulence', 'buoyancy', 'interfaces', 'transport'], SEED),
  ...F('information', ['signal', 'bandwidth', 'latency', 'propagation', 'storage', 'computation', 'feedback'], SEED),
  ...F('control', ['sensing', 'actuation', 'feedback', 'stability', 'latency', 'authority', 'observability'], SEED),
  ...F('interface', ['mechanical interface', 'electrical interface', 'thermal interface', 'chemical interface', 'fluid interface', 'optical interface', 'information interface', 'biological interface'], SEED),
  ...F('environmental', ['gravity', 'atmosphere', 'temperature', 'pressure', 'radiation', 'terrain', 'surrounding objects', 'boundary conditions'], SEED),
  ...F('manufacturing', ['process capability', 'tool access', 'assembly order', 'tolerances', 'material processing', 'joining', 'curing', 'machining', 'inspection'], SEED),
  ...F('biological', ['growth', 'differentiation', 'self-assembly', 'replication', 'adaptation', 'signaling', 'resource allocation', 'emergent organization'], SEED),
];

/** The gap between touching faces placed by relation: inside the contact slop (5 mm), outside the physics' penetration (none). */
export const CLEAR = 0.0005;

/** The stock shapes and the processes that make each into a part (the manufacturing law of stock). */
export const SHAPE_PROCESSES: Record<string, string[]> = {
  'rod.round': ['saw', 'turn'], 'rod.square': ['saw', 'mill'], 'tube.round': ['saw', 'drill', 'weld.mig'], 'tube.square': ['saw', 'drill', 'weld.mig'],
  angle: ['saw', 'drill', 'weld.mig'], plate: ['saw', 'drill', 'bend'], lumber: ['saw', 'drill', 'screw.wood'], wheel: [],
};

/** The stock kinds a material comes in and can be worked here: sold as that stock in its category, with a process that works it. */
export function stockFor(m: Material): string[] {
  return PART_KINDS.filter((k) => k.stock?.includes(m.category) && (!k.materialFilter || k.materialFilter(m)))
    .filter((k) => (SHAPE_PROCESSES[k.id] ?? []).some((pid) => PROCESSES.find((p) => p.id === pid)?.materials.includes(m.category)))
    .map((k) => k.id);
}

const P = (k: string) => d(`person:${k}`);
const add = (...xs: Structure[]) => r('apply', [d('op:add'), ...xs], {});
const sub = (a: Structure, b: Structure) => r('apply', [d('op:sub'), a, b], {});
const mul = (a: Structure, b: Structure) => r('apply', [d('op:mul'), a, b], {});
const derived = (src: string[]) => ({ how: 'derived' as const, src });

/** The laws this world derives from. */
const DERIVED: ConstructionLaw[] = [
  {
    id: 'geometric.clearance', family: 'geometric', facet: 'clearance', structure: r('constrain', [d('faces-placed-together'), r('quantity', [d('gap'), q(CLEAR, 'm')], {})], { mode: 'true', under: ['contact slop 5 mm', 'penetration 0'], ev: derived(['tools/contact.ts', 'K-5']) }), says: 'two faces placed against each other are left a gap inside the joint\'s contact slop and outside the physics\' penetration: they touch for a joint and never start inside each other',
    derive: () => [{ kind: 'spacing', min: CLEAR, why: 'contact slop 5 mm (tools/contact.ts TOUCH) above, penetration 0 below', law: 'geometric.clearance' }],
    source: 'tools/contact.ts TOUCH; ganglia/tree/gate.ts K-5', rests: [],
  },
  {
    id: 'spatial.footprint', family: 'spatial', facet: 'position', structure: r('constrain', [d('support'), r('quantity', [d('inset-from-footprint-corner'), add(mul(q(0.5, ''), d('support:width')), q(0.01, 'm'))], {})], { mode: 'true', mech: 'the edge above overhangs its support', ev: derived(['statics.load-path']) }), says: 'the supports of a structure stand at the corners of its footprint, inset by half their width and a clearance, so the deck\'s edge covers them',
    bears: (s) => has(s.roles, 'support'),
    derive: (s) => [{ kind: 'factor', what: 'inset', value: (s.length ?? 0) / 2 + 0.01, why: 'half the support\'s width plus 10 mm so the edge above overhangs it' }],
    source: 'statics: a support under an edge carries it without a cantilever', rests: ['statics.load-path'],
  },
  {
    id: 'environmental.terrain', family: 'environmental', facet: 'terrain', structure: r('constrain', [d('support'), r('quantity', [d('support:length'), sub(add(d('ground:highest-under-footprint'), d('structure:height')), d('ground:under-support'))], {})], { mode: 'true', ev: derived(['world/place.ts groundAt']) }), says: 'a support reaches from the ground where it stands to the level the structure needs: its length is the difference, not a number of the plan',
    bears: (s) => has(s.roles, 'support'),
    derive: () => [{ kind: 'limit', what: 'reference plane', value: 0, why: 'the highest ground under the footprint; every support is cut to reach it' }],
    source: 'world/place.ts groundAt', rests: [],
  },
  {
    id: 'scale.rigid-domain', family: 'scale', facet: 'propagation time', structure: r('constrain', [d('rigid-body-model'), r('quantity', [d('part:length'), mul(d('sound-speed'), d('tick'))], {})], { mode: 'true', mech: 'sound crossing against the tick', ev: derived(['tsc.rigid-domain', 'sound.speed']) }), says: 'a rigid body stands for a part only while sound crosses it within one tick; past that length the model extrapolates',
    derive: (s, env) => s.materials.map((mid) => { const d = rigidDomain(mid, s.length ?? 0, env.tick ?? TICK); return { kind: 'limit' as const, what: `rigid length in ${mid}`, value: d.critical, why: `sound at ${d.cSound.toFixed(0)} m/s crosses ${d.critical.toFixed(2)} m in one ${((env.tick ?? TICK) * 1000).toFixed(1)} ms tick` }; }),
    source: 'ganglia/native/tsc.ts rigidDomain', rests: ['sound.speed'],
  },
  {
    id: 'scale.resolution', family: 'scale', facet: 'resolution', structure: r('constrain', [d('resolved-motion'), r('quantity', [d('part:speed'), r('apply', [d('op:div'), d('part:size'), d('tick')], {})], {})], { mode: 'true', ev: derived(['tsc.coarse-graining', 'shannon.sampling']) }), says: 'a motion is resolved only while a part moves less than its own size in one tick; faster, the tick sees a different thing',
    bears: (s) => !!s.moving,
    derive: (s, env) => [{ kind: 'limit', what: 'resolved speed', value: (s.length ?? 0) / (env.tick ?? TICK), why: 'size over the tick' }],
    source: 'ganglia/native/tsc.ts averagingCheck', rests: ['shannon.sampling'],
  },
  {
    id: 'mechanical.triangulation', family: 'mechanical', facet: 'stability', structure: r('influence', [d('diagonal-across-bay'), d('bay-of-posts-and-rails:racks')], { polarity: '-', necessity: 'sufficient', mech: 'four pin-jointed bars are a mechanism; a fifth across the diagonal makes two triangles', mode: 'true', ev: derived(['statics.load-path']) }), says: 'a bay of posts and rails with joints that bend is a mechanism under a sideways push until a diagonal triangulates it; the taller the bay for its width, the sooner it racks',
    bears: (s) => has(s.roles, 'support', 'spans'),
    derive: (s) => (has(s.failed ?? [], 'racking') ? [{ kind: 'hypothesis', what: 'racking', change: { aprons: true }, why: 'a diagonal (or a rail set) turns the bay into a truss', says: 'a sideways push bends the leg joints because nothing but those joints resists it (racking); aprons, rails between the legs under the top, would take it' }] : []),
    source: 'statics: four pin-jointed bars are a mechanism; a fifth across the diagonal makes two triangles', rests: ['statics.load-path'],
  },
  {
    id: 'mechanical.overturning', family: 'mechanical', facet: 'stability', structure: r('constrain', [d('structure:stands'), r('compare', [mul(d('push'), d('push:height')), mul(d('weight'), mul(q(0.5, ''), d('base:width')))], { dir: -1 })], { mode: 'true', mech: 'moment balance about the toe', ev: derived(['statics.overturning']) }), says: 'a structure tips when a push at its top makes a moment about the far edge of its base greater than its weight makes about the same edge: wider base, lower push, or anchor',
    bears: (s) => has(s.roles, 'support'),
    // tipping is the explanation only when nothing broke: strong enough, not stable
    derive: (s) => (has(s.failed ?? [], 'tipping') && (s.failed ?? []).length === 1 ? [{ kind: 'hypothesis', what: 'tipping', change: { anchor: true }, why: 'F h > m g b/2: anchor it, widen the base, or lower what is pushed', says: 'it tipped over in one piece and nothing broke: strong enough, not stable; anchoring it to a wall (or widening its base) settles it, and that is a design question the stand cannot test' }] : []),
    source: 'statics: moment balance about the toe', rests: ['statics.overturning'],
  },
  {
    id: 'mechanical.member-sizing', family: 'mechanical', facet: 'stress', structure: r('influence', [d('member:sized-under-its-load'), d('member:fracture-or-yield')], { polarity: '+', necessity: 'sufficient', mech: 'bending stress past strength', mode: 'true', ev: derived(['stress.bending']) }), says: 'a member sized for less than it carries breaks or yields; sized for more, it holds',
    bears: (s) => has(s.roles, 'support', 'carries', 'spans', 'stood-on', 'seat'),
    derive: (s) => (has(s.failed ?? [], 'member') ? [{ kind: 'hypothesis', what: 'members', change: { margin: 1.5 }, why: 'the members are sized for less than they carry', says: 'the members are sized for less than they carry; sizing them for 1.5x the load would hold' }] : []),
    source: 'bending stress against strength (any mechanics of materials text)', rests: ['stress.bending'],
  },
  {
    id: 'mechanical.end-fixity', family: 'mechanical', facet: 'stress', structure: r('state', [r('quantity', [d('column:free-to-sway:K'), q(2, '')], {}), r('quantity', [d('column:braced:K'), q(1, '')], {}), r('quantity', [d('column:fixed-both:K'), q(0.7, '')], {})], { mode: 'true', ev: derived(['buckling.euler']) }), says: 'a column\'s buckling length depends on how its ends are held: free to sway at the top it buckles as a cantilever (K = 2); held square at both ends and braced, as half its length (K = 0.7); pinned both ends, as itself (K = 1)',
    bears: (s) => has(s.roles, 'support'),
    derive: (s) => [{ kind: 'factor', what: 'K', value: has(s.roles, 'braced') ? 1 : 2, why: has(s.roles, 'braced') ? 'braced against sway: pinned-pinned' : 'free to sway at the top: a cantilever' }],
    source: 'Euler buckling with effective length (any mechanics of materials text)', rests: ['buckling.euler'],
  },
  {
    id: 'mechanical.load-case', family: 'mechanical', facet: 'load paths', structure: r('state', [r('function', [d('role:carries'), d('rated-load-spread-over-it')], {}), r('function', [d('role:seat'), d('a-person')], {}), r('function', [d('role:stood-on'), d('a-person')], {}), r('function', [d('role:highest-handhold'), d('the-push')], {})], { mode: 'true', ev: derived(['EN 1335', 'EN 131', 'EN 581']) }), says: 'what a member is for says what loads it: a surface that carries takes its rated load spread over it; a seat or a rung takes a person; the highest handhold takes the push; a wall takes the wind or a lean',
    bears: (s) => has(s.roles, 'carries', 'seat', 'stood-on', 'handhold', 'back'),
    derive: (s) => [
      ...(has(s.roles, 'seat', 'stood-on') ? [{ kind: 'default' as const, key: 'person', value: PERSON.designMass.value, why: PERSON.designMass.source }] : []),
      { kind: 'default', key: 'push', value: PERSON.push.value, why: PERSON.push.source },
    ],
    source: 'EN 1335, EN 131, EN 581 (furniture test loads): the load cases of use', rests: [],
  },
  {
    id: 'manufacturing.stock', family: 'manufacturing', facet: 'material processing', structure: r('constrain', [d('member'), r('kind', [d('member:stock'), d('stock-sold-in-its-material-and-worked-by-a-process-for-it')], {})], { mode: 'true', ev: derived(['ganglia/processes.ts', 'parts/registry.ts stock']) }), says: 'a member is made from the stock its material comes in, by a process that works that material: wood as lumber and sheet, metal as tube, bar, angle and plate',
    derive: (s) => s.materials.map((mid) => ({ kind: 'stock' as const, kinds: stockFor(getMaterial(mid)), why: `processes that work ${getMaterial(mid).category}` })),
    source: 'ganglia/processes.ts', rests: [],
  },
  {
    id: 'manufacturing.assembly-order', family: 'manufacturing', facet: 'assembly order', structure: r('state', [r('constrain', [d('what-carries'), d('before-what-it-carries')], {}), r('constrain', [d('energy-source'), d('last')], {})], { mode: 'true', mech: 'the dependency order of the relations', ev: derived(['grow.ts STAGE generalised']) }), says: 'what carries is made before what it carries; what spans after both its ends; energy sources last, so nothing is live while it is built',
    derive: () => [{ kind: 'order', before: 'support', after: 'carried', why: 'a part is placed onto what holds it' }, { kind: 'order', before: 'everything', after: 'power', why: 'fail-safe: the fuse goes in last' }],
    source: 'grow.ts STAGE, generalised: the order is the dependency order of the relations', rests: [],
  },
  {
    id: 'scale.person', family: 'scale', facet: 'characteristic length', structure: r('state', [r('quantity', [d('seat-height'), add(P('popliteal-height'), P('shoe'))], {}), r('quantity', [d('work-surface-height'), add(P('popliteal-height'), P('shoe'), P('elbow-rest-height'))], {}), r('quantity', [d('standing-surface-height'), sub(P('elbow-height'), q(0.05, 'm'))], {}), r('quantity', [d('passage-width'), add(P('shoulder-breadth'), mul(q(2, ''), P('clearance')))], {}), r('quantity', [d('place-at-a-table'), add(P('shoulder-breadth'), P('elbow-room'))], {}), r('quantity', [d('seat-width'), add(P('hip-breadth'), q(0.05, 'm'))], {}), r('quantity', [d('seat-depth'), sub(P('buttock-popliteal'), q(0.05, 'm'))], {}), r('quantity', [d('rung-pitch'), P('rung-pitch')], {}), r('quantity', [d('reach-height'), P('shoulder-height')], {}), r('quantity', [d('work-surface-depth'), P('forward-reach')], {}), r('quantity', [d('reach'), P('forward-reach')], {})], { mode: 'true', ev: { how: 'measured', src: [PERSON.stature.source] } }), says: 'an artefact for a person takes its sizes from the person: a seat is popliteal height and a shoe, a work surface the seat and the elbow above it, a standing surface just under the elbow, a passage the shoulders and clearance, a rung pitch a step, a reach the arm',
    bears: (s) => !!s.forPerson,
    derive: () => {
      const seat = PERSON.poplitealHeight.value + PERSON.shoe.value;
      return [
        { kind: 'default', key: 'seat height', value: round5(seat), why: `${PERSON.poplitealHeight.name} + ${PERSON.shoe.name}` },
        { kind: 'default', key: 'seat width', value: round5(PERSON.hipBreadth.value + 0.05), why: `${PERSON.hipBreadth.name} + 50 mm` },
        { kind: 'default', key: 'seat depth', value: round5(PERSON.buttockPopliteal.value - 0.05), why: `${PERSON.buttockPopliteal.name} − 50 mm so the knee is clear` },
        { kind: 'default', key: 'work surface height', value: round5(seat + PERSON.elbowRestHeight.value), why: `seat + ${PERSON.elbowRestHeight.name}` },
        { kind: 'default', key: 'work surface depth', value: round5(PERSON.forwardReach.value), why: PERSON.forwardReach.name },
        { kind: 'default', key: 'place at a table', value: round5(PERSON.shoulderBreadth.value + PERSON.elbowRoom.value), why: `${PERSON.shoulderBreadth.name} + ${PERSON.elbowRoom.name}` },
        { kind: 'default', key: 'standing surface height', value: round5(PERSON.elbowHeight.value - 0.05), why: `${PERSON.elbowHeight.name} − 50 mm` },
        { kind: 'default', key: 'passage width', value: round5(PERSON.shoulderBreadth.value + 2 * PERSON.clearance.value), why: `${PERSON.shoulderBreadth.name} + clearance each side` },
        { kind: 'default', key: 'rung pitch', value: PERSON.rungPitch.value, why: PERSON.rungPitch.source },
        { kind: 'default', key: 'reach height', value: round5(PERSON.shoulderHeight.value), why: `${PERSON.shoulderHeight.name}: a shelf's top reached without stretching` },
        { kind: 'default', key: 'reach', value: round5(PERSON.forwardReach.value), why: `${PERSON.forwardReach.name}: a thing you use stands with its near face within your reach` },
        { kind: 'default', key: 'person', value: PERSON.designMass.value, why: PERSON.designMass.source },
      ];
    },
    source: PERSON.stature.source, rests: [],
  },
  {
    id: 'interface.coincidence', family: 'interface', facet: 'mechanical interface', structure: r('same', [d('port:a:frame'), d('port:b:frame')], { mode: 'true', under: ['connected ports'], ev: derived(['construct/build.ts horn, drive']) }), says: 'two ports connected are one place: a shaft\'s frame and the bore it drives coincide, a lead leaves where its header is; the connection has no length of its own unless it is a wire, a rope or a spring',
    bears: (s) => has(s.flows, 'rotation', 'electric', 'signal'),
    derive: () => [{ kind: 'spacing', min: 0, why: 'a joint is made where the parts are (connectors/through.ts REACH 6 mm)', law: 'interface.coincidence' }],
    source: 'construct/build.ts horn and drive: frames checked to 20 µm', rests: [],
  },
  {
    id: 'interface.joint-capacity', family: 'interface', facet: 'mechanical interface', structure: r('constrain', [d('joint:load-in-a-mode'), d('joint:capacity-in-that-mode')], { mode: 'true', mech: 'a joint carries each mode up to its capacity; past it, it fails in that mode', ev: { how: 'measured', src: ['connectors: capacities by kind and mode'] } }), says: 'a joint carrying more in a mode (shear, bending, tension) than its capacity fails in that mode; the smallest stronger joint holds',
    bears: (s) => s.roles.length > 0,
    derive: (s) => (has(s.failed ?? [], 'joint') ? [{ kind: 'hypothesis', what: 'joints', change: { upgrade: true }, why: 'load in a mode past the joint\'s capacity in it', says: 'the {joint} joints carry more {mode} than they can; the smallest stronger joint would hold' }] : []),
    source: 'the connector catalogue: capacities by kind and mode (connectors/*.ts)', rests: [],
  },
];

// ---- laws of the book that are also spacing laws -------------------------------------------------------------

/** A law of the book read as a spacing law: a length input and an output that is a force, a power, a heat flow or a field. */
export interface SpacingLaw { id: string; law: string; distance: string; output: string; says: string; structure: Structure; /** The distance at which the output falls to `fraction` of its value at `near`, holding the example's other inputs. */ at(fraction: number, near?: number): number | null }

const FIELD_DIMS = [DIMS.force, DIMS.power, dimensionOf('T'), dimensionOf('V/m'), dimensionOf('W/m^2')];

export function discoverSpacing(laws: Law[] = LAWS): SpacingLaw[] {
  const out: SpacingLaw[] = [];
  for (const law of laws) {
    const dist = law.inputs.find((q) => { try { return sameDim(dimensionOf(q.unit), DIMS.length) && /distance|gap|separation|radius|spacing|thickness|length in|range/i.test(q.name); } catch { return false; } });
    let outDim; try { outDim = dimensionOf(law.output.unit); } catch { continue; }
    if (!dist || !FIELD_DIMS.some((d) => sameDim(d, outDim))) continue;
    const base = { ...law.example.inputs, ...Object.fromEntries(Object.entries(law.constants ?? {}).map(([k, c]) => [k, c.value])) };
    const f = (r: number) => { try { const v = law.eval({ ...base, [dist.sym]: r }); return Number.isFinite(v) ? Math.abs(v) : NaN; } catch { return NaN; } };
    // falling with distance (a field, a pull) or rising with it (a wall's resistance): only the falling kind spaces things apart
    const near0 = Math.max(1e-4, (law.example.inputs[dist.sym] ?? 0.01) / 10);
    if (!(f(near0) > f(near0 * 100))) continue;
    out.push({
      id: `spacing.${law.id}`, law: law.id, distance: dist.name, output: law.output.name,
      says: `${law.name}: ${law.output.name} falls with ${dist.name}; the separation at which it is a given fraction of its value near contact`,
      structure: r('influence', [d(`${law.id}:${dist.sym}`), d(`${law.id}:${law.output.sym}`)], { polarity: '-', necessity: 'sufficient', mech: law.id, mode: 'true', ev: { how: 'derived', src: [law.id] } }),
      at(fraction, near = near0) {
        const target = f(near) * fraction;
        if (!(target > 0)) return null;
        // bisection on log distance between near and 1e4 × near
        let lo = near, hi = near * 1e4;
        if (!(f(hi) <= target)) return null;
        for (let i = 0; i < 80; i++) { const mid = Math.sqrt(lo * hi); if (f(mid) > target) lo = mid; else hi = mid; }
        return Math.sqrt(lo * hi);
      },
    });
  }
  return out;
}

/** The hash of a construction law: its structure's. */
export const constructionHash = (l: ConstructionLaw) => hash(l.structure);

/**
 * The construction laws as the substrate holds them: each law an entity of kind law in the domain construction, under
 * its family (is-a), over the laws of the book it rests on (governed-by); each spacing law found in the book over the
 * law it is read from (requires); the person's measures as quantities with their sources. What the Mind cites, the
 * law graph places and a correction reaches is this, not the TypeScript.
 */
export function discovery(): Discovery {
  const SRC = { estimate: 'construction laws (src/construct/laws.ts): the construction grammar\'s own hierarchy' };
  const families = [...new Set(CONSTRUCTION_LAWS.map((l) => l.family))];
  const entities: Entity[] = [
    ...families.map((fam): Entity => ({ id: `construction.${fam}-family`, name: `${fam} construction laws`, names: [`${fam} construction laws`], kinds: ['law'], domains: ['construction'], says: `the ${fam} family of construction laws: what a lawful configuration must answer about ${fam}`, source: SRC, coverage: coverageFrom(SRC, 1) })),
    ...CONSTRUCTION_LAWS.map((l): Entity => ({ id: `construction.${l.id}`, name: l.id, names: [`${l.family} ${l.facet} (construction)`], kinds: ['law'], domains: ['construction', l.family], says: `${l.says}${l.derive ? '' : ' [named, not yet derived]'}`, source: l.derive ? { derived: l.source } : SRC, coverage: coverageFrom(l.derive ? { derived: l.source } : SRC, l.derive ? 2 : 1) })),
    ...discoverSpacing().map((sp): Entity => ({ id: `construction.${sp.id}`, name: sp.id, names: [`${sp.output} against ${sp.distance}`], kinds: ['law'], domains: ['construction', 'spatial'], says: sp.says, source: { derived: `read from ${sp.law} (construct/laws.ts discoverSpacing)` }, coverage: coverageFrom({ derived: sp.law }, 2) })),
    ...Object.entries(PERSON).map(([k, m]): Entity => ({ id: `person.${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`, name: m.name, names: [k], kinds: ['quantity'], domains: ['construction', 'people'], says: `${m.name}: ${m.value} ${m.unit} (${m.source})`, source: m.kind === 'estimate' ? { estimate: m.source } : { cite: m.source, kind: m.kind }, coverage: coverageFrom(m.kind === 'estimate' ? { estimate: m.source } : { cite: m.source, kind: m.kind }, 1) })),
  ];
  const rel = (from: string, kind: Relation['kind'], to: string, says: string, confidence = 0.8): Relation => ({ from, kind, to, says, source: SRC, confidence });
  const relations: Relation[] = [
    ...CONSTRUCTION_LAWS.map((l) => rel(`construction.${l.id}`, 'is-a', `construction.${l.family}-family`, `a ${l.family} law`)),
    ...CONSTRUCTION_LAWS.flatMap((l) => (l.rests ?? []).filter((id) => lawById(id)).map((id) => rel(`construction.${l.id}`, 'governed-by', id, 'rests on it'))),
    ...discoverSpacing().map((sp) => rel(`construction.${sp.id}`, 'requires', sp.law, 'read from it: the separation is where its output falls')),
    ...discoverSpacing().map((sp) => rel(`construction.${sp.id}`, 'is-a', 'construction.spatial-family', 'a spacing law')),
    rel('construction.scale.person', 'requires', 'person.stature', 'the person is its source'),
  ];
  return { entities, relations, unknowns: [] };
}

/** Every construction law: the derived ones first, then the seed names not yet derived. */
export const CONSTRUCTION_LAWS: ConstructionLaw[] = [...DERIVED, ...NAMED.filter((n) => !DERIVED.some((d) => d.id === n.id))];
export const lawOf = (id: string) => CONSTRUCTION_LAWS.find((l) => l.id === id);
/** The laws that bear on a subject, derived ones first. */
export const relevant = (s: Subject): ConstructionLaw[] => CONSTRUCTION_LAWS.filter((l) => bears(l, s));
/** What the laws that bear on a subject derive for it. */
export const derive = (s: Subject, env: Env = {}): { law: string; out: Derived }[] => relevant(s).flatMap((l) => (l.derive ? l.derive(s, env).map((out) => ({ law: l.id, out })) : []));
/** One derived default by key, for a subject. */
export function defaultOf(s: Subject, key: string, env: Env = {}): number | undefined {
  for (const d of derive(s, env)) if (d.out.kind === 'default' && d.out.key === key) return d.out.value;
  return undefined;
}
/** What the construction laws cite, by hash: the book laws they rest on (dependencies.ts reads this). */
export function constructionCitations(): { id: string; hash: string; cites: string[] }[] {
  return [
    ...CONSTRUCTION_LAWS.map((l) => ({ id: `construction.${l.id}`, hash: constructionHash(l), cites: (l.rests ?? []).map((id) => lawHash(id)).filter((h): h is string => !!h) })),
    ...discoverSpacing().map((sp) => ({ id: `construction.${sp.id}`, hash: hash(sp.structure), cites: [lawHash(sp.law)].filter((h): h is string => !!h) })),
  ];
}
void e;

/** Which laws are derived here and which are only named: the gap, as data. */
export const executable = () => ({ derived: CONSTRUCTION_LAWS.filter((l) => l.derive).map((l) => l.id), named: CONSTRUCTION_LAWS.filter((l) => !l.derive).map((l) => l.id) });
