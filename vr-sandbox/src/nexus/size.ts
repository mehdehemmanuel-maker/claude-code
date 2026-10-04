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
import { search, type Option, type System } from './solve';
import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { add, div, ge, k, le, leaf, ln, mul, pow, PI, variable } from './term';
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
export const DEFLECTION_LIMIT = 360;
/** The clear-wood strength is divided by a declared factor: codes reduce it further by grade and duration. */
export const STRENGTH_FACTOR = leaf('strength factor', 2, '1', { class: 'assumed', by: 'the generator', grounds: 'a declared factor of two against the clear-wood modulus of rupture; building codes take more, by grade and duration of load' });

/** Fewest support lines first: each one is a wall or a beam across the room. */
export const fewestSupports = (by: string): Law => law({
  id: 'preference.fewest-supports', name: 'Fewest supports', statement: 'Prefer the arrangement with the fewest support lines across the span.', formula: 'min k',
  inputs: [{ sym: 'k', unit: '1', name: 'support lines' }], output: { sym: 'k', unit: '1', name: 'support lines' }, term: variable('k', '1', 'support lines'), domain: [],
  source: { cite: `declared by ${by}: a clear room is preferred to one crossed by walls or beams`, kind: 'declaration' },
});
export const leastTimber = (by: string): Law => law({
  id: 'preference.least-timber', name: 'Least timber', statement: 'Of the arrangements that satisfy every constraint, prefer the least timber.', formula: 'min V',
  inputs: [{ sym: 'V', unit: 'm^3', name: 'timber' }], output: { sym: 'V', unit: 'm^3', name: 'timber' }, term: variable('V', 'm^3', 'timber'), domain: [],
  source: { cite: `declared by ${by}: the least timber that carries the face`, kind: 'declaration' },
});

/**
 * The system the members across a face make. A face of a span and a width under a load per area is carried by members
 * at a spacing, each taking the load on its strip and its own weight, over bays between the support lines. Each bay is
 * taken as simply supported, which is conservative for a member continuous over its supports. Its bending stress is
 * held below the matter's strength over the declared factor, and its deflection below its bay over 360.
 */
export function memberSystem(span: Derivation, width: Derivation, load: Derivation, matter: { density: Derivation; E: Derivation; strength: Derivation }, g: Derivation): System {
  const vars = [
    ['b', 'm', 'breadth'], ['h', 'm', 'depth'], ['s', 'm', 'spacing'], ['k', '1', 'support lines'], ['n', '1', 'members'], ['L', 'm', 'span'], ['W', 'm', 'width'],
    ['q', 'Pa', 'load per area'], ['rho', 'kg/m^3', 'density'], ['g', 'm/s^2', 'gravity'], ['E', 'Pa', 'modulus'], ['fu', 'Pa', 'clear-wood strength'], ['phi', '1', 'strength factor'],
    ['a', 'm', 'bay'], ['w', 'N/m', 'load per length'], ['M', 'N m', 'moment'], ['S', 'm^3', 'section modulus'], ['sig', 'Pa', 'bending stress'], ['I', 'm^4', 'second moment'],
    ['del', 'm', 'deflection'], ['lim', 'm', 'deflection allowed'], ['V', 'm^3', 'timber'], ['f', 'Pa', 'strength allowed'],
  ].map(([sym, unit, name]) => ({ sym: sym!, unit: unit!, name: name! }));
  const v = Object.fromEntries(vars.map((x) => [x.sym, variable(x.sym, x.unit, x.name)]));
  return {
    name: 'the members across a face',
    vars,
    relations: [
      { kind: 'term', sym: 'a', term: div(v['L']!, add(v['k']!, k(1))), name: 'bay', grounds: 'the span divided by the support lines across it' },
      { kind: 'term', sym: 'w', term: add(mul(v['q']!, v['s']!), mul(v['rho']!, v['g']!, v['b']!, v['h']!)), name: 'load per length', grounds: 'the face\'s load on the member\'s strip, and its own weight' },
      { kind: 'term', sym: 'M', term: div(mul(v['w']!, pow(v['a']!, 2)), k(8)), name: 'moment', grounds: 'a simply supported bay under a uniform load: w a² / 8' },
      { kind: 'term', sym: 'S', term: div(mul(v['b']!, pow(v['h']!, 2)), k(6)), name: 'section modulus', grounds: 'a rectangle: b h² / 6' },
      { kind: 'term', sym: 'sig', term: div(v['M']!, v['S']!), name: 'bending stress', grounds: 'the moment over the section modulus' },
      { kind: 'term', sym: 'I', term: div(mul(v['b']!, pow(v['h']!, 3)), k(12)), name: 'second moment', grounds: 'a rectangle: b h³ / 12' },
      { kind: 'term', sym: 'del', term: div(mul(k(5), v['w']!, pow(v['a']!, 4)), mul(k(384), v['E']!, v['I']!)), name: 'deflection', grounds: 'a simply supported bay under a uniform load: 5 w a⁴ / (384 E I)' },
      { kind: 'term', sym: 'lim', term: div(v['a']!, k(DEFLECTION_LIMIT)), name: 'deflection allowed', grounds: 'the bay over 360' },
      { kind: 'term', sym: 'f', term: div(v['fu']!, v['phi']!), name: 'strength allowed', grounds: 'the clear-wood strength over the declared factor' },
      { kind: 'term', sym: 'V', term: mul(v['n']!, v['b']!, v['h']!, v['L']!), name: 'timber', grounds: 'every member across the whole span' },
      { kind: 'constrain', holds: le(v['sig']!, v['f']!), says: 'each member\'s bending stress is within the strength allowed', role: 'design', source: 'the matter\'s strength over the declared factor' },
      { kind: 'constrain', holds: le(v['del']!, v['lim']!), says: 'each member deflects no more than its bay over 360', role: 'design', source: 'IBC Table 1604.3, its strictest limit for roof members' },
    ],
    bindings: { L: span, W: width, q: load, rho: matter.density, E: matter.E, fu: matter.strength, phi: ofLeaf(STRENGTH_FACTOR), g },
  };
}

/** Every section of the kept lumber, every spacing, and up to `most` support lines; each with its count of members across the width. */
export function memberOptions(width: number, sections: Option[], most = 4): Option[] {
  const out: Option[] = [];
  for (const sec of sections) for (const sp of SPACINGS) for (let k = 0; k <= most; k++) {
    const n = Math.ceil(width / sp.s - 1e-9) + 1;
    const c = (name: string, x: number, unit: string, source: string) => leaf(name, x, unit, { class: 'configuration', source });
    out.push({ label: `${sec.label} at ${sp.label}, ${k} support line${k === 1 ? '' : 's'}`, leaves: { ...sec.leaves, s: c(`spacing ${sp.label}`, sp.s, 'm', SPACINGS_SOURCE), k: c(`${k} support lines`, k, '1', 'the arrangement tried'), n: c(`${n} members`, n, '1', `a count: the width over the spacing, rounded up, plus one (${width.toFixed(2)} m at ${sp.label})`) } });
  }
  return out;
}

export function sizeMembers(span: Derivation, width: Derivation, load: Derivation, matter: { density: Derivation; E: Derivation; strength: Derivation }, g: Derivation, sections: Option[], by = 'the generator') {
  const system = memberSystem(span, width, load, matter, g);
  return { system, choice: search(system, memberOptions(width.value!, sections), [fewestSupports(by), leastTimber(by)]) };
}
