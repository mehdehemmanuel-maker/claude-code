// Carriers: the conserved quantities, counted over regions. A flow is not primitive; what generates it is a
// quantity that is conserved: its content in a region changes only by what crosses the region's boundary and what
// is made inside it. Physics names the conserved quantities (energy from time-translation symmetry, momentum and
// angular momentum from translation and rotation, charge from gauge symmetry; the amount of each matter that does
// not react), so the list is the physics', as the dimension basis is: matter carriers are named by the intent (the
// water in its main, the PLA on its spool). Each carrier has a content, a potential that drives it and a flux; a
// quantity's kind is its role in its carrier. From one carrier the language generates its laws: a boundary passes
// flux in proportion to the potential difference across it, a region stores content in proportion to its
// potential, and where potential times flux is power, power, dissipation and stored energy follow by the binder.

import { dimOf, dimText, divDim, mulDim, sameDim, type Dim } from './dimension';
import { law, type Law } from './law';
import { cells, div, integral, k, mul, pow, variable } from './term';

export interface Carrier {
  id: string;
  /** What is counted, what drives it, what crosses a boundary per time. */
  content: string;
  potential: string | null;
  flux: string;
  /** Why it is conserved. */
  conserved: string;
  /** Potential times flux is power: computed from the units, not declared. */
  conjugate: boolean;
}

const W = dimOf('W');

export function carrier(id: string, content: string, potential: string | null, flux: string, conserved: string): Carrier {
  const c = dimOf(content), f = dimOf(flux);
  const perSecond = c.map((x, i) => x - (i === 2 ? 1 : 0)) as Dim;
  if (!sameDim(f, perSecond)) throw new Error(`${id}: the flux ${flux} is not the content ${content} per second`);
  const conjugate = potential !== null && sameDim(dimOf(potential).map((x, i) => x + f[i]!) as Dim, W);
  return { id, content, potential, flux, conserved, conjugate };
}

/** The carriers physics conserves whatever the intent: energy, charge, momentum, angular momentum, and light, which is energy that travels as radiation until a surface absorbs it. */
export const UNIVERSAL: Carrier[] = [
  carrier('energy', 'J', 'K', 'W', 'time-translation symmetry (Noether); heat flows from higher to lower temperature (second law)'),
  carrier('charge', 'C', 'V', 'A', 'gauge symmetry: charge is neither made nor destroyed'),
  carrier('momentum', 'N s', 'm/s', 'N', 'translation symmetry (Noether): a force is momentum crossing a boundary'),
  carrier('angular momentum', 'N m s', 'rad/s', 'N m', 'rotation symmetry (Noether): a torque is angular momentum crossing a boundary'),
  carrier('light', 'J', null, 'W', 'energy in transit as radiation: it crosses what is transparent to it and becomes heat where it is absorbed'),
];

/** A matter carrier named by the intent: the volume of a liquid, the amount of a species, the mass of a fuel. */
export function matter(id: string): Carrier {
  if (id.startsWith('volume of ')) return carrier(id, 'm^3', 'Pa', 'm^3/s', 'matter that does not react: an incompressible volume moves from higher to lower pressure');
  if (id.startsWith('amount of ')) return carrier(id, 'mol', 'mol/m^3', 'mol/s', 'a species that does not react: it diffuses from higher to lower concentration');
  if (id.startsWith('mass of ')) return carrier(id, 'kg', 'J/kg', 'kg/s', 'matter that carries energy in its chemistry until it is converted');
  throw new Error(`${id}: a matter carrier is a volume of, an amount of or a mass of a matter`);
}

export const carrierById = (id: string): Carrier => UNIVERSAL.find((c) => c.id === id) ?? matter(id);

export type Role = 'content' | 'potential' | 'flux' | 'flux density' | 'content density' | 'position' | 'acceleration' | 'power';

/** The role a quantity plays in its carrier, from its unit; null when the unit is none of the carrier's. */
export function roleOf(c: Carrier, unit: string): Role | null {
  const d = dimOf(unit);
  const is = (u: string | null) => u !== null && sameDim(d, dimOf(u));
  const perArea = (u: string) => dimOf(u).map((x, i) => x - (i === 1 ? 2 : 0)) as Dim;
  const perVolume = (u: string) => dimOf(u).map((x, i) => x - (i === 1 ? 3 : 0)) as Dim;
  if (is(c.potential)) return 'potential';
  if (is(c.flux)) return 'flux';
  if (is(c.content)) return 'content';
  if (sameDim(d, perArea(c.flux))) return 'flux density';
  if (sameDim(d, perVolume(c.content))) return 'content density';
  if (c.id === 'momentum' && is('m')) return 'position';
  if (c.id === 'momentum' && is('m/s^2')) return 'acceleration';
  if (c.conjugate && is('W')) return 'power';
  return null;
}

/**
 * The laws one carrier generates. Every one is the same mechanism read for this carrier: flux through a
 * boundary is its conductance times the potential difference; the conductance of a uniform path is its
 * conductivity times its section over its length; a region's content is its capacitance times its potential; a
 * storage drains through a conductance with time constant C/G. Where potential times flux is power: power is
 * potential times flux, a conductance dissipates flux times the potential drop, and a storage holds the integral
 * of its potential over its content, by the binder.
 */
export function family(c: Carrier): Law[] {
  if (c.potential === null) return [];
  const src = { cite: `generated from the carrier ${c.id}: ${c.conserved}`, kind: 'derivation' as const };
  const pot = c.potential, flux = c.flux, content = c.content;
  // the derived units are dimension arithmetic, written back as units the parser reads
  const unit = (d: Dim) => dimText(d);
  const uG = unit(divDim(dimOf(flux), dimOf(pot))), uSigma = unit(divDim(mulDim(dimOf(flux), dimOf('m')), mulDim(dimOf(pot), dimOf('m^2')))), uC = unit(divDim(dimOf(content), dimOf(pot)));
  const g = variable('G', uG, 'conductance'), de = variable('de', pot, 'potential difference');
  const sigma = variable('sigma', uSigma, 'conductivity'), A = variable('A', 'm^2', 'section'), L = variable('L', 'm', 'length');
  const C = variable('C', uC, 'capacitance'), e = variable('e', pot, 'potential');
  const out: Law[] = [
    law({ id: `${c.id}.conductance`, name: `flux of ${c.id} through a boundary`, statement: `${c.id} crosses a boundary at its conductance times the potential difference across it, from higher to lower`, formula: 'J = G Δe',
      inputs: [{ sym: 'G', unit: uG, name: 'conductance' }, { sym: 'de', unit: pot, name: 'potential difference' }], output: { sym: 'J', unit: flux, name: `flux of ${c.id}` }, term: mul(g, de), domain: [], source: src }),
    law({ id: `${c.id}.path-conductance`, name: `conductance of a uniform path for ${c.id}`, statement: 'a uniform path conducts by its conductivity times its section over its length', formula: 'G = σ A / L',
      inputs: [{ sym: 'sigma', unit: uSigma, name: 'conductivity' }, { sym: 'A', unit: 'm^2', name: 'section' }, { sym: 'L', unit: 'm', name: 'length' }], output: { sym: 'G', unit: uG, name: 'conductance' }, term: div(mul(sigma, A), L), domain: [], source: src }),
    law({ id: `${c.id}.storage`, name: `content of ${c.id} a region stores`, statement: 'a region holds content in proportion to its potential', formula: 'Q = C e',
      inputs: [{ sym: 'C', unit: uC, name: 'capacitance' }, { sym: 'e', unit: pot, name: 'potential' }], output: { sym: 'Q', unit: content, name: `content of ${c.id}` }, term: mul(C, e), domain: [], source: src }),
    law({ id: `${c.id}.time-constant`, name: `how fast a store of ${c.id} drains`, statement: 'a store drains through a conductance with time constant capacitance over conductance', formula: 'τ = C / G',
      inputs: [{ sym: 'C', unit: uC, name: 'capacitance' }, { sym: 'G', unit: uG, name: 'conductance' }], output: { sym: 'tau', unit: 's', name: 'time constant' }, term: div(C, g), domain: [], source: src }),
  ];
  if (c.conjugate) {
    const J = variable('J', flux, 'flux');
    const q = variable('q', content, 'content'), Q = variable('Q', content, 'content');
    out.push(
      law({ id: `${c.id}.power`, name: `power carried by ${c.id}`, statement: 'a flux at a potential carries power: potential times flux', formula: 'P = e J',
        inputs: [{ sym: 'e', unit: pot, name: 'potential' }, { sym: 'J', unit: flux, name: 'flux' }], output: { sym: 'P', unit: 'W', name: 'power' }, term: mul(e, J), domain: [], source: src }),
      law({ id: `${c.id}.dissipation`, name: `heat a conductance makes from ${c.id}`, statement: 'a flux through a conductance loses its potential drop times the flux, the square of the flux over the conductance, as heat', formula: 'P = J² / G',
        inputs: [{ sym: 'J', unit: flux, name: 'flux' }, { sym: 'G', unit: uG, name: 'conductance' }], output: { sym: 'P', unit: 'W', name: 'heat made' }, term: div(pow(J, 2), g), domain: [], source: src }),
      law({ id: `${c.id}.stored-energy`, name: `energy a store of ${c.id} holds`, statement: 'a linear store holds the integral of its potential over its content, from empty to full', formula: 'E = ∫₀^Q (q / C) dq',
        inputs: [{ sym: 'C', unit: uC, name: 'capacitance' }, { sym: 'Q', unit: content, name: 'content' }], output: { sym: 'E', unit: 'J', name: 'energy stored' },
        term: integral(q, mul(k(0), Q), Q, div(q, C), cells(2, 'the integrand is linear: Simpson is exact')), domain: [], source: src }),
    );
    // the dual store: a boundary that holds its flux (an inductor for charge, a spring for momentum), its potential difference the inertance times the flux's rate
    const uL = unit(divDim(mulDim(dimOf(pot), dimOf('s')), dimOf(flux)));
    const Lf = variable('Lf', uL, 'inertance'), j = variable('j', flux, 'flux');
    out.push(law({ id: `${c.id}.flux-stored-energy`, name: `energy a boundary holds in its flux of ${c.id}`, statement: 'a boundary whose potential difference is its inertance times the rate of its flux holds the integral of its potential difference over its momentum of flux: half the inertance times the flux squared', formula: 'E = ∫₀^J Lf j dj',
      inputs: [{ sym: 'Lf', unit: uL, name: 'inertance' }, { sym: 'J', unit: flux, name: 'flux' }], output: { sym: 'E', unit: 'J', name: 'energy stored' },
      term: integral(j, mul(k(0), J), J, mul(Lf, j), cells(2, 'the integrand is linear: Simpson is exact')), domain: [], source: src }));
  }
  return out;
}

/**
 * Two carriers coupled without loss: flux on one side is n times flux on the other, potential the other way, so
 * power in is power out (potential times flux on both sides). A motor couples charge to angular momentum (torque
 * is n times current, voltage is n times angular speed), a gear couples angular momentum to itself, a wheel couples
 * angular momentum to momentum. With an efficiency below one the difference leaves as heat. The two laws are the
 * same for every pair of conjugate carriers: one mechanism, not a motor, a gear and a wheel.
 */
export function coupling(a: Carrier, b: Carrier): Law[] {
  if (!a.conjugate || !b.conjugate) throw new Error(`${a.id} to ${b.id}: a lossless coupling needs both carriers' potential times flux to be power`);
  const src = { cite: `generated from the carriers ${a.id} and ${b.id}: power is conserved across a coupling that stores nothing`, kind: 'derivation' as const };
  const un = dimText(divDim(dimOf(b.flux), dimOf(a.flux)));
  const n = variable('n', un, 'ratio'), Ja = variable('Ja', a.flux, `flux of ${a.id}`), eb = variable('eb', b.potential!, `potential of ${b.id}`), eta = variable('eta', '1', 'efficiency');
  return [
    law({ id: `${a.id}->${b.id}.flux`, name: `flux of ${b.id} from flux of ${a.id}`, statement: 'across a coupling the flux on the far side is the ratio times the flux on the near side, less what is lost as heat', formula: 'J_b = η n J_a',
      inputs: [{ sym: 'eta', unit: '1', name: 'efficiency' }, { sym: 'n', unit: un, name: 'ratio' }, { sym: 'Ja', unit: a.flux, name: `flux of ${a.id}` }], output: { sym: 'Jb', unit: b.flux, name: `flux of ${b.id}` }, term: mul(eta, n, Ja), domain: [], source: src }),
    law({ id: `${a.id}->${b.id}.potential`, name: `potential of ${a.id} from potential of ${b.id}`, statement: 'across a coupling the potential on the near side is the ratio times the potential on the far side: power in is power out', formula: 'e_a = n e_b',
      inputs: [{ sym: 'n', unit: un, name: 'ratio' }, { sym: 'eb', unit: b.potential!, name: `potential of ${b.id}` }], output: { sym: 'ea', unit: a.potential!, name: `potential of ${a.id}` }, term: mul(n, eb), domain: [], source: src }),
  ];
}
