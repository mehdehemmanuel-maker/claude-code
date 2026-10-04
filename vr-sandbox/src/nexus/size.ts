// Systems from elements. A generated element states bounds (a path must conduct at least this, a member must carry
// this, a store must last this long); it does not say what to build. The element is a configuration space: the
// quantities that would realize it are its variables, the laws of its carrier and its matter are its relations, its
// bounds and the limits of what it is made of are its constraints, what can be had is the catalogue, and a declared
// preference picks. The space then derives the configuration, as it does for any system, with every record cited.
//
// The first element sized this way is a path for charge: a wire's section. It must conduct at least the element's
// least conductance over the route it takes, and it must not run hotter than its insulation allows, carrying the
// current the element's power and drop give.

import { law, type Law } from './law';
import { search, type Choice, type Option, type System } from './solve';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { add, div, ge, k, le, leaf, ln, min, mul, pow, PI, variable, type Leaf } from './term';
import type { Element } from './manifold';
import { PVC, SECTIONS_MM2, SECTIONS_SOURCE, STILL_AIR_SURFACE } from '../data/conductors';

const value = (e: Element, startsWith: string) => { const v = e.values.find((x) => x.name.startsWith(startsWith)); if (!v) throw new Error(`${e.id}: no value ${startsWith}`); return v; };

/** A path that serves a region reaches across it: at least the diagonal of its plan. */
export function routeAcross(x: Derivation, z: Derivation): Derivation {
  const X = variable('x', 'm', 'plan extent x'), Z = variable('z', 'm', 'plan extent z');
  return evaluate('the route across the region served', pow(add(pow(X, 2), pow(Z, 2)), 0.5), { x, z }, { unit: 'm', law: 'a path that serves a region reaches across its plan: the diagonal' });
}

/** The least copper: of the sections that satisfy every constraint, the one with the least area. */
export const leastConductor = (by: string): Law => law({
  id: 'preference.least-conductor', name: 'Least conductor', statement: 'Of the sections that satisfy every constraint, prefer the one with the least area.', formula: 'min A',
  inputs: [{ sym: 'A', unit: 'm^2', name: 'section' }], output: { sym: 'A', unit: 'm^2', name: 'conductor per length of the chosen section' },
  term: variable('A', 'm^2', 'section'), domain: [], source: { cite: `declared by ${by}: the least conductor that keeps the path within its bounds`, kind: 'declaration' },
});

/** The standard sections as the options a section may take. */
export const sectionOptions = (): Option[] => SECTIONS_MM2.map((mm2) => ({ label: `${mm2} mm²`, leaves: { A: leaf(`${mm2} mm² section`, mm2 * 1e-6, 'm^2', { class: 'configuration', source: SECTIONS_SOURCE }) } }));

/**
 * The system a path for charge makes. From the element: its least conductance, and the current its heat at that
 * conductance implies (heat = I² / G). From the matter it is made of: its conductivity. From the region it serves:
 * the route across it, and the hottest that region's air is held at. From the insulation: the hottest the conductor may
 * run, its conductivity and thickness. The wire's heat per length crosses the insulation and the air's surface.
 */
export function conductorSystem(e: Element, conductivity: Derivation, route: Derivation, ambient: Derivation): System {
  // the element's values are the generator's: records that cite the element they come from
  const of = (x: Element['values'][number], unit: string) => ofLeaf(leaf(x.name, x.value, unit, { class: 'configuration', source: `the generator: ${e.id}, from ${x.from}` }));
  const gLeast = of(value(e, 'least conductance'), 'S'), heat = of(value(e, 'heat it makes'), 'W');
  const current = evaluate('current the path carries: the root of its heat times its least conductance', pow(mul(variable('P', 'W', 'heat'), variable('G', 'S', 'least conductance')), 0.5), { P: heat, G: gLeast }, { unit: 'A', law: 'charge.dissipation inverted: heat = I² / G' });
  const est = (name: string, x: { value: number; unit: string; source: string }) => ofLeaf(leaf(name, x.value, x.unit, x.source.startsWith('estimate') ? { class: 'estimated', grounds: x.source } : { class: 'measured', source: x.source }));
  const vars = [
    ['A', 'm^2', 'section'], ['l', 'm', 'route'], ['sigma', 'S/m', 'conductivity'], ['I', 'A', 'current'], ['Gl', 'S', 'least conductance'], ['G', 'S', 'conductance'],
    ['t', 'm', 'insulation thickness'], ['ki', 'W/m K', 'insulation conductivity'], ['h', 'W/m^2 K', 'surface coefficient'], ['r1', 'm', 'conductor radius'], ['r2', 'm', 'outer radius'],
    ['q', 'W/m', 'heat per length'], ['R', 'm K/W', 'resistance to the air per length'], ['dT', 'K', 'rise above the air'], ['Ta', 'K', 'the air around it'], ['Tmax', 'K', 'the hottest it may run'], ['Tc', 'K', 'the conductor'],
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  return {
    name: `the section of ${e.id}`,
    vars,
    relations: [
      { kind: 'term', sym: 'G', term: div(mul(v['sigma']!, v['A']!), v['l']!), name: 'conductance of the route', grounds: 'charge.path-conductance: conductivity times section over length' },
      { kind: 'term', sym: 'r1', term: pow(div(v['A']!, PI()), 0.5), name: 'conductor radius', grounds: 'a round conductor of the section' },
      { kind: 'term', sym: 'r2', term: add(v['r1']!, v['t']!), name: 'outer radius', grounds: 'the conductor and its insulation' },
      { kind: 'term', sym: 'q', term: div(pow(v['I']!, 2), mul(v['sigma']!, v['A']!)), name: 'heat per length', grounds: 'charge.dissipation per length: the current squared over the conductance per length' },
      { kind: 'term', sym: 'R', term: add(div(ln(div(v['r2']!, v['r1']!)), mul(k(2), PI(), v['ki']!)), div(k(1), mul(v['h']!, k(2), PI(), v['r2']!))), name: 'resistance to the air per length', grounds: 'energy.path-conductance through a cylindrical layer, then the surface to the air' },
      { kind: 'term', sym: 'dT', term: mul(v['q']!, v['R']!), name: 'rise above the air', grounds: 'the heat per length across the resistance per length' },
      { kind: 'term', sym: 'Tc', term: add(v['Ta']!, v['dT']!), name: 'the conductor', grounds: 'the air plus the rise' },
      { kind: 'constrain', holds: ge(v['G']!, v['Gl']!), says: 'the path conducts at least the element\'s least conductance', role: 'design', source: e.id },
      { kind: 'constrain', holds: le(v['Tc']!, v['Tmax']!), says: 'the conductor runs no hotter than its insulation allows', role: 'design', source: PVC.hottest.source },
    ],
    bindings: {
      l: route, sigma: conductivity, Ta: ambient,
      I: current, Gl: gLeast,
      t: est('insulation thickness', PVC.thickness), ki: est('insulation conductivity', PVC.conductivity), h: est('surface coefficient of still air', STILL_AIR_SURFACE), Tmax: est('the hottest PVC insulation allows', PVC.hottest),
    },
  };
}

/** Size a path for charge: the system its element makes, searched over the standard sections for the least conductor. */
export function sizeConductor(e: Element, conductivity: Derivation, route: Derivation, ambient: Derivation, by = 'the generator') {
  const system = conductorSystem(e, conductivity, route, ambient);
  return { system, choice: search(system, sectionOptions(), leastConductor(by)) };
}

/** The same path with the heat left out: what the drop alone would choose. */
export function sizeByDropAlone(e: Element, conductivity: Derivation, route: Derivation, ambient: Derivation) {
  const s = conductorSystem(e, conductivity, route, ambient);
  const system: System = { ...s, relations: s.relations.filter((r) => !(r.kind === 'constrain' && /hotter/.test(r.says))) };
  return search(system, sectionOptions(), leastConductor('the drop alone'));
}

// ---- members across a face ------------------------------------------------------------------------------------

/** Common framing centres, m: members 12, 16 or 24 inches apart. */
export const SPACINGS = [{ s: 0.305, label: '12 in' }, { s: 0.406, label: '16 in' }, { s: 0.610, label: '24 in' }];
export const SPACINGS_SOURCE = 'framing practice: members at 12, 16 or 24 inches on centre';
/** A member under load deflects no more than its bay over 360: IBC Table 1604.3's strictest limit for roof members under snow (those carrying a plaster ceiling; L/240 for another ceiling, L/180 for none), and its limit for floors under live load. */
export const DEFLECTION_LIMIT = leaf('deflection allowed over the bay', 1 / 360, '1', { class: 'configuration', source: 'IBC Table 1604.3: the bay over 360, its strictest limit for roof members and its limit for floors' });
/** The clear-wood strength is divided by a declared factor: codes reduce it further by grade and duration. */
export const STRENGTH_FACTOR = leaf('strength factor', 2, '1', { class: 'assumed', by: 'the generator', grounds: 'a declared factor of two against the clear-wood modulus of rupture; building codes take more, by grade and duration of load' });
/** Where nothing rests at an unstated place, the weight carried at the worst place is none. */
export const NO_WEIGHT_AT_A_PLACE = leaf('no weight resting at a place not stated', 0, 'N', { class: 'configuration', source: 'nothing the intent states rests on this face' });

/** Fewest support lines first: each one is a wall or a beam across the room. */
export const fewestSupports = (by: string): Law => law({
  id: 'preference.fewest-supports', name: 'Fewest supports', statement: 'Prefer the arrangement with the fewest support lines across the span.', formula: 'min k',
  inputs: [{ sym: 'k', unit: '1', name: 'support lines' }], output: { sym: 'k', unit: '1', name: 'support lines' }, term: variable('k', '1', 'support lines'), domain: [],
  source: { cite: `declared by ${by}: a clear room is preferred to one crossed by walls or beams`, kind: 'declaration' },
});
/** Then the least mass: across matters as well as sections; within one matter it is the least timber. */
export const leastMass = (by: string): Law => law({
  id: 'preference.least-mass', name: 'Least mass', statement: 'Of the arrangements that satisfy every constraint, prefer the one whose members weigh least.', formula: 'min m',
  inputs: [{ sym: 'm', unit: 'kg', name: 'mass of the members' }], output: { sym: 'm', unit: 'kg', name: 'mass of the members' }, term: variable('m', 'kg', 'mass of the members'), domain: [],
  source: { cite: `declared by ${by}: the least mass that carries the face, which is also the least that the face below must carry`, kind: 'declaration' },
});

export interface MemberMatter { density: Derivation; E: Derivation; strength: Derivation }
export interface MemberLoads {
  /** The largest weight resting on the face at a place not stated: carried at the worst place, on one member. */
  P?: Derivation;
  /** A wanted most sag over the span, beside the code's. */
  sag?: Derivation;
  /** What bears on the members' ends along the run, per length: each member is pressed along its length by it over its spacing. */
  along?: Derivation;
}

/** Rows of blocking between the members, each bracing their thin axis where it crosses them: tried where the members are pressed along their length. */
export const BRACE_ROWS = [0, 1, 2];
/** The buckling load of a member pressed along its length, ends free to turn (Euler; effective length factor 1, the pinned case). */
export const EULER = 'Euler: a member pressed along its length, its ends free to turn, buckles at π² E I / l² (effective length factor 1)';

/**
 * The system the members across a face make. A face of a span and a width under a load per area is carried by members
 * at a spacing, each taking the load on its strip and its own weight, over bays between the support lines. Each bay is
 * taken as simply supported, which is conservative for a member continuous over its supports. A weight that rests at
 * a place not stated can be anywhere, so it is carried at the worst place, mid-bay, by one member: nothing that shares
 * it between members is generated. The bending stress is held below the matter's strength over the declared factor,
 * and the deflection below its bay over 360, and below a wanted sag where one is stated.
 */
export function memberSystem(span: Derivation, width: Derivation, load: Derivation, matter: MemberMatter, g: Derivation, loads: MemberLoads = {}): System {
  const vars = [
    ['b', 'm', 'breadth'], ['h', 'm', 'depth'], ['s', 'm', 'spacing'], ['k', '1', 'support lines'], ['n', '1', 'members'], ['L', 'm', 'span'], ['W', 'm', 'width'],
    ['q', 'Pa', 'load per area'], ['P', 'N', 'weight at the worst place'], ['rho', 'kg/m^3', 'density'], ['g', 'm/s^2', 'gravity'], ['E', 'Pa', 'modulus'], ['fu', 'Pa', 'clear-wood strength'], ['phi', '1', 'strength factor'],
    ['a', 'm', 'bay'], ['w', 'N/m', 'load per length'], ['M', 'N m', 'moment'], ['S', 'm^3', 'section modulus'], ['sig', 'Pa', 'bending stress'], ['I', 'm^4', 'second moment'],
    ['del', 'm', 'deflection'], ['r', '1', 'deflection allowed over the bay'], ['lim', 'm', 'deflection allowed'], ['V', 'm^3', 'timber'], ['m', 'kg', 'mass of the members'], ['f', 'Pa', 'strength allowed'],
    ...(loads.sag ? [['rw', '1', 'most sag over span wanted'], ['limw', 'm', 'sag wanted']] : []),
    ...(loads.along ? [['p', 'N/m', 'load per length on the members\' ends'], ['j', '1', 'rows bracing the thin axis'], ['N', 'N', 'force along each member'], ['Iw', 'm^4', 'second moment about the thin axis'], ['lw', 'm', 'length between braces'], ['Pw', 'N', 'buckling load between braces'], ['Pb', 'N', 'buckling load in the plane it bends in'], ['sa', 'Pa', 'stress pressed and bent']] : []),
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  return {
    name: 'the members across a face',
    vars,
    relations: [
      { kind: 'term', sym: 'a', term: div(v['L']!, add(v['k']!, k(1))), name: 'bay', grounds: 'the span divided by the support lines across it' },
      { kind: 'term', sym: 'w', term: add(mul(v['q']!, v['s']!), mul(v['rho']!, v['g']!, v['b']!, v['h']!)), name: 'load per length', grounds: 'the face\'s load on the member\'s strip, and its own weight' },
      { kind: 'term', sym: 'M', term: add(div(mul(v['w']!, pow(v['a']!, 2)), k(8)), div(mul(v['P']!, v['a']!), k(4))), name: 'moment', grounds: 'a simply supported bay under a uniform load and a weight at mid-bay: w a² / 8 + P a / 4' },
      { kind: 'term', sym: 'S', term: div(mul(v['b']!, pow(v['h']!, 2)), k(6)), name: 'section modulus', grounds: 'a rectangle: b h² / 6' },
      { kind: 'term', sym: 'sig', term: div(v['M']!, v['S']!), name: 'bending stress', grounds: 'the moment over the section modulus' },
      { kind: 'term', sym: 'I', term: div(mul(v['b']!, pow(v['h']!, 3)), k(12)), name: 'second moment', grounds: 'a rectangle: b h³ / 12' },
      { kind: 'term', sym: 'del', term: add(div(mul(k(5), v['w']!, pow(v['a']!, 4)), mul(k(384), v['E']!, v['I']!)), div(mul(v['P']!, pow(v['a']!, 3)), mul(k(48), v['E']!, v['I']!))), name: 'deflection', grounds: 'a simply supported bay under a uniform load and a weight at mid-bay: 5 w a⁴ / (384 E I) + P a³ / (48 E I)' },
      { kind: 'term', sym: 'lim', term: mul(v['a']!, v['r']!), name: 'deflection allowed', grounds: 'the bay times the deflection allowed over it' },
      { kind: 'term', sym: 'f', term: div(v['fu']!, v['phi']!), name: 'strength allowed', grounds: 'the clear-wood strength over the declared factor' },
      { kind: 'term', sym: 'V', term: loads.along ? add(mul(v['n']!, v['b']!, v['h']!, v['L']!), mul(v['j']!, v['W']!, v['b']!, v['h']!)) : mul(v['n']!, v['b']!, v['h']!, v['L']!), name: 'timber', grounds: loads.along ? 'every member across the whole span, and each row of blocking along the width' : 'every member across the whole span' },
      { kind: 'term', sym: 'm', term: mul(v['rho']!, v['V']!), name: 'mass of the members', grounds: 'the timber times its density' },
      { kind: 'constrain', holds: le(v['sig']!, v['f']!), says: 'each member\'s bending stress is within the strength allowed', role: 'design', source: 'the matter\'s strength over the declared factor' },
      { kind: 'constrain', holds: le(v['del']!, v['lim']!), says: 'each member deflects no more than its bay over 360', role: 'design', source: 'IBC Table 1604.3, its strictest limit for roof members' },
      ...(loads.along ? [
        { kind: 'term' as const, sym: 'N', term: mul(v['p']!, v['s']!), name: 'force along each member', grounds: 'what bears on the ends per length, over the spacing' },
        { kind: 'term' as const, sym: 'Iw', term: div(min(mul(v['b']!, pow(v['h']!, 3)), mul(v['h']!, pow(v['b']!, 3))), k(12)), name: 'second moment about the thin axis', grounds: 'a rectangle about its thinner axis' },
        { kind: 'term' as const, sym: 'lw', term: div(v['a']!, add(v['j']!, k(1))), name: 'length between braces', grounds: 'the bay divided by the rows that brace it' },
        { kind: 'term' as const, sym: 'Pw', term: div(mul(pow(PI(), 2), v['E']!, v['Iw']!), pow(v['lw']!, 2)), name: 'buckling load between braces', grounds: EULER },
        { kind: 'term' as const, sym: 'Pb', term: div(mul(pow(PI(), 2), v['E']!, v['I']!), pow(v['a']!, 2)), name: 'buckling load in the plane it bends in', grounds: `${EULER}; the rows brace only the thin axis` },
        { kind: 'term' as const, sym: 'sa', term: add(div(v['N']!, mul(v['b']!, v['h']!)), v['sig']!), name: 'stress pressed and bent', grounds: 'the force along it over its section, and its bending stress at the same fibre' },
        { kind: 'constrain' as const, holds: le(mul(v['N']!, v['phi']!), v['Pw']!), says: 'each member pressed along its length stays below its buckling load between braces, over the declared factor', role: 'design' as const, source: EULER },
        { kind: 'constrain' as const, holds: le(mul(v['N']!, v['phi']!), v['Pb']!), says: 'each member pressed along its length stays below its buckling load in the plane it bends in, over the declared factor', role: 'design' as const, source: EULER },
        { kind: 'constrain' as const, holds: le(v['sa']!, v['f']!), says: 'each member, pressed and bent, stays within the strength allowed', role: 'design' as const, source: 'the matter\'s strength over the declared factor' },
      ] : []),
      ...(loads.sag ? [
        { kind: 'term' as const, sym: 'limw', term: mul(v['a']!, v['rw']!), name: 'sag wanted', grounds: 'the bay times the most sag over span wanted' },
        { kind: 'constrain' as const, holds: le(v['del']!, v['limw']!), says: 'each member sags no more than is wanted', role: 'design' as const, source: loads.sag.name },
      ] : []),
    ],
    bindings: { L: span, W: width, q: load, P: loads.P ?? ofLeaf(NO_WEIGHT_AT_A_PLACE), rho: matter.density, E: matter.E, fu: matter.strength, phi: ofLeaf(STRENGTH_FACTOR), r: ofLeaf(DEFLECTION_LIMIT), g, ...(loads.sag ? { rw: loads.sag } : {}), ...(loads.along ? { p: loads.along } : {}) },
  };
}

/** How many members a run of a length takes at a spacing: the length over the spacing, rounded up, plus one. */
export const membersAlong = (length: number, s: number) => Math.ceil(length / s - 1e-9) + 1;

/**
 * Every section, every spacing, up to `most` support lines, and every matter offered; each with its count of members.
 * The width is one run, or several separate runs (the walls of a room, each with its own end members).
 */
export function memberOptions(width: number | number[], sections: Option[], most = 4, matters: { name: string; leaves: MemberMatter }[] = [], braces: number[] | null = null): Option[] {
  const runs = Array.isArray(width) ? width : [width];
  const out: Option[] = [];
  const each = matters.length ? matters : [null];
  for (const mat of each) for (const sec of sections) for (const sp of SPACINGS) for (let k = 0; k <= most; k++) for (const j of braces ?? [null]) {
    const n = runs.reduce((t, len) => t + membersAlong(len, sp.s), 0);
    const c = (name: string, x: number, unit: string, source: string) => leaf(name, x, unit, { class: 'configuration', source });
    const counted = runs.length > 1 ? `${runs.length} runs of ${runs.map((x) => x.toFixed(2)).join(', ')} m at ${sp.label}, each its length over the spacing, rounded up, plus one` : `the width over the spacing, rounded up, plus one (${runs[0]!.toFixed(2)} m at ${sp.label})`;
    out.push({
      label: `${mat ? `${mat.name} ` : ''}${sec.label} at ${sp.label}, ${k} support line${k === 1 ? '' : 's'}${j ? `, ${j} row${j === 1 ? '' : 's'} of blocking` : ''}`,
      leaves: { ...sec.leaves, ...(mat ? { rho: mat.leaves.density, E: mat.leaves.E, fu: mat.leaves.strength } : {}), s: c(`spacing ${sp.label}`, sp.s, 'm', SPACINGS_SOURCE), k: c(`${k} support lines`, k, '1', 'the arrangement tried'), n: c(`${n} members`, n, '1', `a count: ${counted}`), ...(j !== null ? { j: c(`${j} rows of blocking`, j, '1', 'the arrangement tried') } : {}) },
    });
  }
  return out;
}

export interface MemberSizing {
  by?: string;
  loads?: MemberLoads;
  /** Separate runs the members repeat along, in place of the one width. */
  runs?: number[];
  /** Matters offered beside the system's own: each option is then a matter as well as a section. */
  matters?: { name: string; leaves: MemberMatter }[];
}

/**
 * Size the members. The first preference is the fewest support lines, so the arrangements are tried a count of lines at
 * a time, fewest first: once a count has an admissible arrangement, no arrangement with more lines can be preferred,
 * and those are not tried. The candidates are every arrangement tried.
 */
export function sizeMembers(span: Derivation, width: Derivation, load: Derivation, matter: MemberMatter, g: Derivation, sections: Option[], o: MemberSizing = {}) {
  const by = o.by ?? 'the generator';
  const system = memberSystem(span, width, load, matter, g, o.loads);
  const options = memberOptions(o.runs ?? width.value!, sections, 4, o.matters, o.loads?.along ? BRACE_ROWS : null);
  const tried: Choice['candidates'] = [];
  let choice: Choice | null = null;
  for (const lines of [...new Set(options.map((x) => (x.leaves['k'] as Leaf).value!))].sort((a, b) => a - b)) {
    choice = search(system, options.filter((x) => (x.leaves['k'] as Leaf).value === lines), [fewestSupports(by), leastMass(by)]);
    tried.push(...choice.candidates);
    if (choice.manifold.length) break;
  }
  return { system, choice: { ...choice!, candidates: tried } };
}
