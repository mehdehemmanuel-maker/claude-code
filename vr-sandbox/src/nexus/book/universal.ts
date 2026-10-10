// The book, universal: laws that hold for anything, living or made, so that a number about a body (how much urine it
// makes, how long its hair grows, how much acid its stomach can pump) is never a law of its own but a chain of these
// over what is measured of it. Conservation (of mass, of energy, of things counted), the Boltzmann factor, the random
// walk, equilibrium thermodynamics, geometry and least dissipation: each law here rests on one of them and says where
// else it holds. Every term is SI; each worked example is computed independently (Python, in the commit that adds it).

import { law, type Law, type Source } from '../substrate/law';
import { CONST } from './constants';
import { add, and, cbrt, cells, div, erfOf, exp, ge, gt, integral, k, le, leaf, ln, lt, mul, pow, sqrt, sub, variable, zero, PI, type Term, type Var } from '../substrate/term';
import type { DomainCheck } from '../substrate/evaluate';

type Port = [sym: string, unit: string, name: string];
interface Spec { id: string; name: string; statement: string; formula: string; valid: string; inputs: Port[]; output: Port; term: (v: Record<string, Var>) => Term; domain?: (v: Record<string, Var>) => DomainCheck[]; source: Source; example: { inputs: Record<string, number>; output: number; rel?: number } }
function U(s: Spec): Law {
  const v: Record<string, Var> = {};
  for (const [sym, unit, name] of s.inputs) v[sym] = variable(sym, unit, name);
  const [osym, ounit, oname] = s.output;
  return law({
    id: s.id, name: s.name, statement: s.statement, formula: s.formula, valid: s.valid,
    inputs: s.inputs.map(([sym, unit, name]) => ({ sym, unit, name })), output: { sym: osym, unit: ounit, name: oname },
    term: s.term(v), domain: s.domain?.(v) ?? [], source: s.source, example: { ...s.example, from: `book/universal.ts ${s.id}` },
  });
}
const empirical = (name: string, value: number, unit: string, source: string) => leaf(name, value, unit, { class: 'empirical', source });
const share = (x: Var, what: string): DomainCheck => ({ says: `${what} between 0 and 1`, holds: and(ge(x, k(0)), le(x, k(1))) });
const positive = (x: Var, what: string): DomainCheck => ({ says: `${what} above nothing`, holds: gt(x, zero(x.unit)) });

const MASS = { cite: 'Bird, Stewart & Lightfoot, Transport Phenomena, 2nd ed., Wiley 2002: the macroscopic mass balance', kind: 'textbook' as const };
const ATKINS = { cite: 'Atkins & de Paula, Physical Chemistry, 11th ed., Oxford University Press 2018', kind: 'textbook' as const };
const PHYS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };
const HEAT = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011', kind: 'textbook' as const };
const GEOMETRY = { cite: 'Euclidean geometry: the volume of a right circular cylinder', kind: 'derivation' as const };

export const UNIVERSAL: Law[] = [
  // ---- conservation: what goes in, comes out or stays ----------------------------------------------------------------
  U({
    id: 'balance.steady', name: 'Steady mass balance', statement: 'In a steady state what leaves is what came in less what was taken back: a kidney\'s urine, a filter\'s permeate, a river below its offtakes.', formula: 'Q = Q_in (1 − f)',
    valid: 'Steady (nothing accumulating); f the share taken back or kept, between 0 and 1.',
    inputs: [['Qin', 'm^3/s', 'flow in'], ['f', '-', 'share taken back']], output: ['Q', 'm^3/s', 'flow out'],
    term: (v) => mul(v.Qin, sub(k(1), v.f)), domain: (v) => [share(v.f, 'the share taken back')],
    source: MASS, example: { inputs: { Qin: 125e-6 / 60, f: 0.99167 }, output: 1.735416666666656e-8 },
  }),
  U({
    id: 'residence.stock', name: 'Stock, flow and residence time', statement: 'What a steady system holds is what flows through it times how long each part stays (Little\'s law for a continuum): the fluid round a brain, the water in a lake, the stock on a shelf.', formula: 'V = Q τ',
    valid: 'Steady state, any mixing.',
    inputs: [['Q', 'm^3/s', 'flow through'], ['tau', 's', 'residence time']], output: ['V', 'm^3', 'volume held'],
    term: (v) => mul(v.Q, v.tau),
    source: { cite: 'Little 1961, Operations Research 9:383; the same balance for a continuum, Bird, Stewart & Lightfoot 2002', kind: 'paper' }, example: { inputs: { Q: 0.35e-6 / 60, tau: 25714.2857142857 }, output: 1.5e-4 },
  }),
  U({
    id: 'balance.difference', name: 'What is left of a flow', statement: 'Mass is conserved: in a steady state what leaves by one way is what came in less what left by the others, so a body\'s urine is its water in less what its breath, skin and gut lose.', formula: 'Q = Q_in − Q_other',
    valid: 'Steady state (nothing accumulating).',
    inputs: [['Qin', 'm^3/s', 'flow in'], ['Qout', 'm^3/s', 'flow out by the other ways']], output: ['Q', 'm^3/s', 'flow left'],
    term: (v) => sub(v.Qin, v.Qout),
    source: MASS, example: { inputs: { Qin: 2300e-6 / 86400, Qout: 900e-6 / 86400 }, output: 1.6203703703703702e-8 },
  }),
  U({
    id: 'junction.sum', name: 'Flows meeting at a junction', statement: 'Mass is conserved where flows meet, so they add: two veins into one, a day\'s saliva from its resting and eating flows, Kirchhoff\'s currents.', formula: 'Q = Q₁ + Q₂',
    valid: 'Incompressible, steady.',
    inputs: [['Q1', 'm^3/s', 'one flow'], ['Q2', 'm^3/s', 'the other']], output: ['Q', 'm^3/s', 'flow together'],
    term: (v) => add(v.Q1, v.Q2),
    source: MASS, example: { inputs: { Q1: 1e-6, Q2: 2e-6 }, output: 3e-6 },
  }),
  U({
    id: 'transport.advection', name: 'What a flow carries', statement: 'A flow carries what is in it: its flow times the difference in concentration between what goes in and what comes out is what it takes away — water in breath, oxygen in blood, salt in a river, a kidney\'s clearance.', formula: 'ṅ = Q Δc',
    valid: 'Well mixed in and out.',
    inputs: [['Q', 'm^3/s', 'flow'], ['dc', 'mol/m^3', 'concentration out less in']], output: ['n', 'mol/s', 'amount carried'],
    term: (v) => mul(v.Q, v.dc),
    source: MASS, example: { inputs: { Q: 6e-3 / 60, dc: 1.776 }, output: 0.0001776 },
  }),
  U({
    id: 'concentration.difference', name: 'Difference of two concentrations', statement: 'What drives diffusion, or what a flow carries away, is the difference between the concentration where it goes and where it came from.', formula: 'Δc = c₁ − c₂',
    valid: 'The same substance in both.',
    inputs: [['c1', 'mol/m^3', 'one concentration'], ['c2', 'mol/m^3', 'the other']], output: ['dc', 'mol/m^3', 'difference'],
    term: (v) => sub(v.c1, v.c2),
    source: ATKINS, example: { inputs: { c1: 2.2, c2: 0.43 }, output: 1.7700000000000002 },
  }),
  U({
    id: 'flux.area', name: 'A flux over an area', statement: 'What crosses a surface is its flux a square metre times the area: water through skin, heat through a wall, light onto a leaf.', formula: 'ṁ = J A',
    valid: 'A uniform flux (else integrate over the area).',
    inputs: [['J', 'kg/m^2 s', 'flux'], ['A', 'm^2', 'area']], output: ['m', 'kg/s', 'mass crossing'],
    term: (v) => mul(v.J, v.A),
    source: MASS, example: { inputs: { J: 7e-3 / 3600, A: 1.9 }, output: 3.694444444444444e-6 },
  }),
  U({
    id: 'total.mass', name: 'The mass of many', statement: 'Things counted weigh their count times what one weighs: red cells in blood, haemoglobin in a cell, bricks in a wall.', formula: 'm = n m₁',
    valid: 'Each the same (or m₁ their mean).',
    inputs: [['n', '-', 'count'], ['m1', 'kg', 'mass of one']], output: ['m', 'kg', 'mass of all'],
    term: (v) => mul(v.n, v.m1),
    source: { cite: 'Counting: the mass of n things each of m₁', kind: 'derivation' }, example: { inputs: { n: 2.65e13, m1: 2.9e-14 }, output: 0.7685000000000001 },
  }),
  U({
    id: 'total.volume', name: 'The room many take', statement: 'Things counted take their count times the room one takes: the 23 ligamenta flava, both tonsils, the vesicles in a bouton.', formula: 'V = n V₁',
    valid: 'Each the same (or V₁ their mean).',
    inputs: [['n', '-', 'count'], ['V1', 'm^3', 'volume of one']], output: ['V', 'm^3', 'volume of all'],
    term: (v) => mul(v.n, v.V1),
    source: { cite: 'Counting: the volume of n things each of V₁', kind: 'derivation' }, example: { inputs: { n: 23, V1: 7.07e-7 }, output: 1.6261e-5 },
  }),
  U({
    id: 'total.flow', name: 'The flow of many', statement: 'Many alike each making a flow make their count times it: sweat glands, nephrons, the cylinders of an engine.', formula: 'Q = n q',
    valid: 'Each the same (or q their mean).',
    inputs: [['n', '-', 'count'], ['q', 'm^3/s', 'flow of one']], output: ['Q', 'm^3/s', 'flow of all'],
    term: (v) => mul(v.n, v.q),
    source: { cite: 'Counting: n things each making q', kind: 'derivation' }, example: { inputs: { n: 3e6, q: 10e-15 / 60 }, output: 4.999999999999999e-10 },
  }),
  U({
    id: 'total.rate', name: 'The rate of many', statement: 'Many alike each doing something at a rate do it at their count times that rate: acid cells pumping protons, enzymes turning over, people arriving.', formula: 'r = n r₁',
    valid: 'Each the same (or r₁ their mean).',
    inputs: [['n', '-', 'count'], ['r1', '1/s', 'rate of one']], output: ['r', '1/s', 'rate of all'],
    term: (v) => mul(v.n, v.r1),
    source: { cite: 'Counting: n things each at r₁', kind: 'derivation' }, example: { inputs: { n: 1.09e9, r1: 23e-3 / 3600 / 1e9 }, output: 6.963888888888888e-6 },
  }),
  U({
    id: 'rate.per-mass', name: 'A flow from a mass that makes it', statement: 'A tissue that makes a flow at a rate a gram makes its mass times that rate: a gland\'s secretion, a muscle\'s heat, a reactor\'s output per kilogram of catalyst.', formula: 'Q = q m',
    valid: 'Uniform tissue.',
    inputs: [['q', 'm^3/s kg', 'flow a kilogram'], ['m', 'kg', 'mass']], output: ['Q', 'm^3/s', 'flow'],
    term: (v) => mul(v.q, v.m),
    source: { cite: 'Counting by mass: a specific rate times the mass that has it', kind: 'derivation' }, example: { inputs: { q: 0.2e-6 / 60 / 1e-3, m: 2e-3 }, output: 6.666666666666666e-9 },
  }),
  U({
    id: 'share.of', name: 'A share of a mass', statement: 'A part that is a share of a whole by mass weighs that share of it: nitrogen in protein, carbon in wood, gold in an ore.', formula: 'm = w M',
    valid: 'w the mass share, between 0 and 1.',
    inputs: [['w', '-', 'share'], ['M', 'kg', 'whole']], output: ['m', 'kg', 'part'],
    term: (v) => mul(v.w, v.M), domain: (v) => [share(v.w, 'the share')],
    source: MASS, example: { inputs: { w: 0.16, M: 0.08 }, output: 0.0128 },
  }),
  U({
    id: 'residence.mass', name: 'A stock of mass and its turnover', statement: 'A steady stock of a substance is its outflow times how long it stays: the bile acid pool and its loss a day, the carbon in a forest and its yearly fall.', formula: 'm = ṁ τ',
    valid: 'Steady state.',
    inputs: [['mdot', 'kg/s', 'flow through'], ['tau', 's', 'residence time']], output: ['m', 'kg', 'stock'],
    term: (v) => mul(v.mdot, v.tau),
    source: { cite: 'Little 1961, Operations Research 9:383, for a stock of mass', kind: 'paper' }, example: { inputs: { mdot: 0.5e-3 / 86400, tau: 6 * 86400 }, output: 0.0029999999999999996 },
  }),
  U({
    id: 'amount.concentration', name: 'Amount in a volume', statement: 'A volume holds its concentration times its volume of a substance: the albumin in plasma, the salt in the sea.', formula: 'n = c V',
    valid: 'Uniform concentration.',
    inputs: [['c', 'mol/m^3', 'concentration'], ['V', 'm^3', 'volume']], output: ['n', 'mol', 'amount'],
    term: (v) => mul(v.c, v.V),
    source: ATKINS, example: { inputs: { c: 0.6316, V: 1.5e-4 }, output: 9.474e-5 },
  }),
  U({
    id: 'power.molar', name: 'Power of a flow of moles', statement: 'Moles moving or reacting at a rate, each costing or giving an energy, make a power: an acid pump against its gradient, a fire by its fuel, a cell by its ATP.', formula: 'P = ṅ E',
    valid: 'E the energy a mole at the conditions it runs at.',
    inputs: [['n', 'mol/s', 'rate'], ['E', 'J/mol', 'energy a mole']], output: ['P', 'W', 'power'],
    term: (v) => mul(v.n, v.E),
    source: { cite: 'The first law, for a reaction or a transport at a rate', kind: 'derivation' }, example: { inputs: { n: 25e-3 / 3600, E: 38595 }, output: 0.2680208333333333 },
  }),
  U({
    id: 'stoichiometry.mass', name: 'Stoichiometry by mass', statement: 'Atoms are conserved through a reaction, so a mass of what reacts makes ν times its moles of a product, at the product\'s molar mass: haem to bilirubin, lime to chalk, fuel to CO₂.', formula: 'm_p = m ν M_p / M_r',
    valid: 'Complete conversion of the reactant; ν the moles of product a mole of reactant makes.',
    inputs: [['m', 'kg', 'reactant'], ['nu', '-', 'moles made a mole'], ['Mp', 'g/mol', 'molar mass of the product'], ['Mr', 'g/mol', 'molar mass of the reactant']], output: ['mp', 'kg', 'product'],
    term: (v) => div(mul(v.m, v.nu, v.Mp), v.Mr),
    source: { cite: 'Conservation of mass in reactions (Lavoisier 1789); IUPAC Compendium of Chemical Terminology, "stoichiometry"', kind: 'derivation' }, example: { inputs: { m: 0.0066, nu: 4, Mp: 584.66, Mr: 64500 }, output: 0.00023930269767441858 },
  }),
  U({
    id: 'stoichiometry.moles', name: 'Stoichiometry by moles', statement: 'Atoms and binding sites are counted: a mole of something that holds or makes ν of another holds or makes ν moles of it, four O₂ to a haemoglobin, two hydrogens to a water.', formula: 'n_p = ν n_r',
    valid: 'ν the number each one holds or makes.',
    inputs: [['nu', '-', 'how many each'], ['n', 'mol', 'moles of it']], output: ['np', 'mol', 'moles of the other'],
    term: (v) => mul(v.nu, v.n),
    source: { cite: 'Conservation of atoms and sites: IUPAC Compendium, "stoichiometry"', kind: 'derivation' }, example: { inputs: { nu: 4, n: 0.0118 }, output: 0.0472 },
  }),
  U({
    id: 'saturation.share', name: 'A share of what it can hold', statement: 'A carrier filled to a share of its capacity holds that share of it: haemoglobin\'s saturation, a binding site\'s occupancy, a battery\'s state of charge.', formula: 'c = θ c_max',
    valid: 'θ between 0 and 1.',
    inputs: [['theta', '-', 'share filled'], ['cmax', 'mol/m^3', 'capacity']], output: ['c', 'mol/m^3', 'held'],
    term: (v) => mul(v.theta, v.cmax), domain: (v) => [share(v.theta, 'the share filled')],
    source: ATKINS, example: { inputs: { theta: 0.98, cmax: 8.9 }, output: 8.722 },
  }),
  U({
    id: 'heat.latent-flow', name: 'Heat carried by a phase change', statement: 'Energy is conserved: evaporating or freezing a flow of mass carries its latent heat with it, so sweat cools a body, a cooling tower a plant, ice a drink.', formula: 'P = ṁ L',
    valid: 'All the flow changes phase; L at the temperature it changes at (water 2.42 MJ/kg at 35 °C, 2.26 at 100 °C).',
    inputs: [['mdot', 'kg/s', 'mass flow'], ['L', 'J/kg', 'latent heat']], output: ['P', 'W', 'heat carried'],
    term: (v) => mul(v.mdot, v.L),
    source: { cite: 'The first law; water\'s latent heat from IAPWS-95 (Wagner & Pruss 2002, J Phys Chem Ref Data 31:387)', kind: 'paper' }, example: { inputs: { mdot: 1 / 3600, L: 2.42e6 }, output: 672.2222222222222 },
  }),
  U({
    id: 'reaction.rate-from-power', name: 'Reaction rate from its power', statement: 'Energy is conserved, so a reaction giving off ΔH a mole runs at its power over ΔH: the oxygen a tissue burns from the heat it makes (about 450 kJ a mole of O₂), the fuel an engine burns from its output.', formula: 'q = P / (V ΔH)',
    valid: 'One reaction carrying the power (a body\'s mixed fuel gives 440–470 kJ a mole of O₂).',
    inputs: [['P', 'W', 'power'], ['V', 'm^3', 'volume it runs in'], ['dH', 'J/mol', 'energy a mole']], output: ['q', 'mol/m^3 s', 'rate a volume'],
    term: (v) => div(v.P, mul(v.V, v.dH)),
    source: { cite: 'The first law; the oxycaloric equivalent from Brouwer 1957, Acta Physiol Pharmacol Neerl 6:795 (20.1 kJ a litre of O₂)', kind: 'paper' }, example: { inputs: { P: 17.4, V: 0.0017, dH: 4.5e5 }, output: 0.022745098039215685 },
  }),
  // ---- motion and geometry ------------------------------------------------------------------------------------------------
  U({
    id: 'distance.speed-time', name: 'Distance at a steady speed', statement: 'A thing moving at a steady speed covers its speed times the time: a hair grows its growth rate times its growing phase, a nail, a crack, a glacier.', formula: 'x = v t',
    valid: 'A steady speed (else integrate it).',
    inputs: [['v', 'm/s', 'speed'], ['t', 's', 'time']], output: ['x', 'm', 'distance'],
    term: (v) => mul(v.v, v.t),
    source: PHYS, example: { inputs: { v: 0.35e-3 / 86400, t: 3 * 31556952 }, output: 0.38350462500000004 },
  }),
  U({
    id: 'volume.cylinder', name: 'Volume of a cylinder', statement: 'A cylinder holds π times its radius squared times its length: a hair, a capillary, a wire, a tree trunk.', formula: 'V = π r² L',
    valid: 'A right circular cylinder (a taper takes the mean of r²).',
    inputs: [['r', 'm', 'radius'], ['L', 'm', 'length']], output: ['V', 'm^3', 'volume'],
    term: (v) => mul(PI(), pow(v.r, 2), v.L),
    source: GEOMETRY, example: { inputs: { r: 35e-6, L: 0.04 }, output: 1.5393804002589985e-10 },
  }),
  U({
    id: 'volume.ellipsoid', name: 'Volume of an ellipsoid', statement: 'An ellipsoid fills π/6 of the box round it: a cell, an egg, a kidney, a planet, each as its three extents.', formula: 'V = (π/6) a b c',
    valid: 'a, b, c the full extents (diameters) along its three axes.',
    inputs: [['a', 'm', 'extent'], ['b', 'm', 'width'], ['c', 'm', 'height']], output: ['V', 'm^3', 'volume'],
    term: (v) => mul(div(PI(), k(6)), v.a, v.b, v.c),
    source: { cite: 'Euclidean geometry: the volume of an ellipsoid, (4/3)π times its three semi-axes', kind: 'derivation' }, example: { inputs: { a: 0.21, b: 0.16, c: 0.11 }, output: 0.0019352210746113123 },
  }),
  U({
    id: 'volume.of-box', name: 'Volume by shape in a box', statement: 'A shape fills a fixed share of the box round it: a box all of it, a cylinder π/4, an ellipsoid π/6, a cone π/12. So a thing\'s size and kind of shape give its volume.', formula: 'V = φ a b c',
    valid: 'a, b, c the box\'s extents; φ the shape\'s share of it.',
    inputs: [['phi', '-', 'share of its box'], ['a', 'm', 'extent'], ['b', 'm', 'width'], ['c', 'm', 'height']], output: ['V', 'm^3', 'volume'],
    term: (v) => mul(v.phi, v.a, v.b, v.c), domain: (v) => [share(v.phi, 'the share of the box')],
    source: GEOMETRY, example: { inputs: { phi: Math.PI / 4, a: 0.1, b: 0.02, c: 0.02 }, output: 3.1415926535897935e-5 },
  }),
  U({
    id: 'area.sphere-of-volume', name: 'The least surface a volume can have', statement: 'Of all shapes a sphere holds a volume in the least surface, (36π)^(1/3) V^(2/3): so surface grows as volume to the two-thirds, and a big body has less skin for its bulk (Galileo\'s square–cube law), which is why mice must eat to keep warm and elephants must shed heat.', formula: 'A = (36π)^(1/3) V^(2/3)',
    valid: 'A sphere; a real body has more surface, by a shape factor (a person about 2.3 times its sphere\'s).',
    inputs: [['V', 'm^3', 'volume']], output: ['A', 'm^2', 'surface'],
    term: (v) => mul(pow(mul(k(36), PI()), 1 / 3), pow(v.V, 2 / 3)),
    source: { cite: 'The isoperimetric inequality (Schwarz 1884); the square–cube law (Galileo, Two New Sciences, 1638)', kind: 'derivation' }, example: { inputs: { V: 0.07 }, output: 0.8213901385550366 },
  }),
  U({
    id: 'area.shaped', name: 'A shape\'s surface over its sphere\'s', statement: 'A body of a given volume has more surface than the sphere of that volume by its shape factor: limbs, ears, fins and leaves are surface added.', formula: 'A = s A_sphere',
    valid: 's at least 1 (the sphere is the least).',
    inputs: [['s', '-', 'shape factor'], ['A0', 'm^2', 'the sphere\'s surface']], output: ['A', 'm^2', 'surface'],
    term: (v) => mul(v.s, v.A0), domain: (v) => [{ says: 'a shape factor of at least 1', holds: ge(v.s, k(1)) }],
    source: GEOMETRY, example: { inputs: { s: 2.3, A0: 0.8214 }, output: 1.88922 },
  }),
  U({
    id: 'power.per-mass', name: 'Power from a mass that gives it', statement: 'A mass that gives a power a kilogram gives its mass times that: muscle at about 200 W/kg, a motor at its power-to-weight, a battery at its specific power.', formula: 'P = p m',
    valid: 'p the sustained specific power.',
    inputs: [['p', 'W/kg', 'power a kilogram'], ['m', 'kg', 'mass']], output: ['P', 'W', 'power'],
    term: (v) => mul(v.p, v.m),
    source: { cite: 'Counting by mass: a specific power times the mass that has it', kind: 'derivation' }, example: { inputs: { p: 200, m: 0.0051 }, output: 1.02 },
  }),
  U({
    id: 'mass.volume', name: 'Mass of a volume', statement: 'A volume of a uniform thing weighs its density times its volume.', formula: 'm = ρ V',
    valid: 'Uniform density (else integrate it).',
    inputs: [['rho', 'kg/m^3', 'density'], ['V', 'm^3', 'volume']], output: ['m', 'kg', 'mass'],
    term: (v) => mul(v.rho, v.V),
    source: PHYS, example: { inputs: { rho: 1310, V: 1.5393804002589985e-10 }, output: 2.0165883243392883e-7 },
  }),
  U({
    id: 'mass.flow', name: 'Mass flow of a volume flow', statement: 'A volume flowing at a rate carries its density times it in mass.', formula: 'ṁ = ρ Q',
    valid: 'Uniform density.',
    inputs: [['rho', 'kg/m^3', 'density'], ['Q', 'm^3/s', 'volume flow']], output: ['mdot', 'kg/s', 'mass flow'],
    term: (v) => mul(v.rho, v.Q),
    source: PHYS, example: { inputs: { rho: 1200, Q: 0.5e-3 }, output: 0.6 },
  }),
  U({
    id: 'molar.mass-flow', name: 'Mass flow of a molar flow', statement: 'Moles flowing at a rate weigh their molar mass times it.', formula: 'ṁ = ṅ M',
    valid: 'Any substance of one molar mass.',
    inputs: [['n', 'mol/s', 'molar flow'], ['M', 'kg/mol', 'molar mass']], output: ['mdot', 'kg/s', 'mass flow'],
    term: (v) => mul(v.n, v.M),
    source: ATKINS, example: { inputs: { n: 1e-4, M: 0.018015 }, output: 1.8015e-6 },
  }),
  U({
    id: 'mixing.density', name: 'Density of a mixture', statement: 'Where volumes add (each part keeping its own partial specific volume), a mixture\'s density is one over the mass-weighted sum of its parts\' specific volumes: a tissue from its water, protein, fat and mineral; an alloy; a concrete.', formula: 'ρ = 1 / (w/ρ₁ + (1 − w)/ρ₂)',
    valid: 'Ideal mixing (no volume change on mixing); a mixture of many parts folds pairwise, since the rule is associative.',
    inputs: [['w', '-', 'mass share of the first'], ['rho1', 'kg/m^3', 'density of the first'], ['rho2', 'kg/m^3', 'density of the second']], output: ['rho', 'kg/m^3', 'density'],
    term: (v) => div(k(1), add(div(v.w, v.rho1), div(sub(k(1), v.w), v.rho2))), domain: (v) => [share(v.w, 'the mass share')],
    source: { cite: 'Ideal mixing of partial specific volumes (Cohn & Edsall, Proteins, Amino Acids and Peptides, Reinhold 1943: protein about 0.73 ml/g)', kind: 'textbook' }, example: { inputs: { w: 0.75, rho1: 1000, rho2: 1370 }, output: 1072.4070450097847 },
  }),
  // ---- flow through things ---------------------------------------------------------------------------------------------
  U({
    id: 'starling.filtration', name: 'Filtration through a membrane (Starling)', statement: 'Fluid crosses a membrane at its hydraulic conductance times the pressure pushing it less the osmotic pressure pulling it back: a kidney\'s glomeruli, every capillary, a reverse-osmosis filter.', formula: 'J = K_f (ΔP − Δπ)',
    valid: 'A membrane that holds back the solute making Δπ (reflection coefficient 1); a leaky one multiplies Δπ by its reflection coefficient.',
    inputs: [['Kf', 'm^3/s Pa', 'filtration coefficient'], ['dP', 'Pa', 'hydraulic pressure difference'], ['dPi', 'Pa', 'osmotic pressure difference']], output: ['J', 'm^3/s', 'filtration rate'],
    term: (v) => mul(v.Kf, sub(v.dP, v.dPi)),
    source: { cite: 'Starling 1896, J Physiol 19:312; the glomerular values (K_f 12.5 ml/min/mmHg, 60 − 18 − 32 mmHg) from Hall, Guyton and Hall Textbook of Medical Physiology, 14th ed., Elsevier 2021, ch. 27', kind: 'textbook' }, example: { inputs: { Kf: 1.5626282830117838e-9, dP: 5599.540271430001, dPi: 4266.31639728 }, output: 2.083333333333334e-6 },
  }),
  U({
    id: 'poiseuille', name: 'Laminar flow in a tube (Hagen–Poiseuille)', statement: 'A viscous fluid flows through a tube at π r⁴ ΔP over 8 μ L: halve a vessel\'s radius and its flow falls sixteenfold; capillaries, xylem, sweat ducts, pipes.', formula: 'Q = π r⁴ ΔP / (8 μ L)',
    valid: 'Laminar (Re below about 2000), a Newtonian fluid, a long rigid tube; blood in capillaries is not quite Newtonian.',
    inputs: [['r', 'm', 'radius'], ['dP', 'Pa', 'pressure drop'], ['mu', 'Pa s', 'viscosity'], ['L', 'm', 'length']], output: ['Q', 'm^3/s', 'flow'],
    term: (v) => div(mul(PI(), pow(v.r, 4), v.dP), mul(k(8), v.mu, v.L)),
    source: { cite: 'Hagen 1839, Poiseuille 1840; Bird, Stewart & Lightfoot 2002, §2.3', kind: 'textbook' }, example: { inputs: { r: 4e-6, dP: 2000, mu: 3.5e-3, L: 1e-3 }, output: 5.744626566564191e-14 },
  }),
  U({
    id: 'murray.branching', name: 'Murray\'s law of branching', statement: 'A vessel that splits with least work (pumping against viscosity plus keeping its volume filled) keeps the sum of its radii cubed: blood vessels, airways, xylem, river deltas.', formula: 'r₀ = ∛(r₁³ + r₂³)',
    valid: 'Laminar flow (Poiseuille) and a cost proportional to the volume; large arteries, where flow pulses, keep their area instead.',
    inputs: [['r1', 'm', 'radius of one branch'], ['r2', 'm', 'radius of the other']], output: ['r0', 'm', 'radius of the parent'],
    term: (v) => cbrt(add(pow(v.r1, 3), pow(v.r2, 3))),
    source: { cite: 'Murray 1926, PNAS 12:207', kind: 'paper' }, example: { inputs: { r1: 0.004, r2: 0.003 }, output: 0.0044979414452754165 },
  }),
  U({
    id: 'network.scaling', name: 'The exponent of a space-filling network', statement: 'A network that branches n ways at each level, its radii by β and lengths by γ, fills space and ends in a fixed terminal unit (a capillary, a leaf, a cell); what it delivers then scales with the mass it serves to the power ln n / −ln(γ β²). Area-preserving branching (β = n^−½) in three dimensions (γ = n^−⅓) gives ¾: Kleiber\'s exponent, from geometry.', formula: 'a = ln n / −ln(γ β²)',
    valid: 'Many levels of self-similar branching; the small vessels\' area-increasing branching (β = n^−⅓) gives 1 for the smallest creatures, so real exponents lie between.',
    inputs: [['n', '-', 'branches at each level'], ['beta', '-', 'radius ratio'], ['gamma', '-', 'length ratio']], output: ['a', '-', 'scaling exponent'],
    term: (v) => div(ln(v.n), mul(k(-1), ln(mul(v.gamma, pow(v.beta, 2))))),
    source: { cite: 'West, Brown & Enquist 1997, Science 276:122', kind: 'paper' }, example: { inputs: { n: 2, beta: 2 ** -0.5, gamma: 2 ** (-1 / 3) }, output: 0.7500000000000003 },
  }),
  U({
    id: 'kleiber.scaling', name: 'Metabolic scaling (Kleiber)', statement: 'A creature at rest burns a coefficient times its mass to the network\'s exponent: a mouse, a man and an elephant on one line, at about 3.4 W a kg^¾ for mammals.', formula: 'B = B₀ (M / 1 kg)^a',
    valid: 'Resting, thermoneutral, adult; B₀ 3.39 W for placental mammals (Kleiber\'s 70 kcal a day), lower for reptiles and higher for birds.',
    inputs: [['B0', 'W', 'coefficient'], ['M', 'kg', 'body mass'], ['a', '-', 'exponent']], output: ['B', 'W', 'resting power'],
    term: (v) => mul(v.B0, exp(mul(v.a, ln(div(v.M, leaf('one kilogram', 1, 'kg', { class: 'fundamental', source: 'the unit the coefficient is fitted in' })))))),
    source: { cite: 'Kleiber 1947, Physiol Rev 27:511', kind: 'paper' }, example: { inputs: { B0: 3.39, M: 73, a: 0.75 }, output: 84.66264711922338 },
  }),
  // ---- diffusion: the random walk -------------------------------------------------------------------------------------
  U({
    id: 'diffusion.front', name: 'A front advanced by diffusion', statement: 'Where a gas or solute diffuses through what it has already reacted with to react at a front, the front goes in as √(2 D C t / a): concrete carbonating, silicon oxidising, a metal tarnishing, a fruit browning.', formula: 'x = √(2 D C t / a)',
    valid: 'Pseudo-steady (the front slow against the diffusion), a sharp front, C held at the surface; a the reactive capacity behind the front.',
    inputs: [['D', 'm^2/s', 'diffusivity through the reacted layer'], ['C', 'mol/m^3', 'concentration at the surface'], ['t', 's', 'time'], ['a', 'mol/m^3', 'capacity to react']], output: ['x', 'm', 'depth of the front'],
    term: (v) => sqrt(div(mul(k(2), v.D, v.C, v.t), v.a)),
    source: { cite: 'Crank 1975, the moving boundary; for concrete Papadakis, Vayenas & Fardis 1991, ACI Mater J 88:363; for silicon Deal & Grove 1965, J Appl Phys 36:3770', kind: 'textbook' }, example: { inputs: { D: 3.6e-9, C: 0.0175, t: 50 * 31556952, a: 3000 }, output: 0.008140614178303748 },
  }),
  U({
    id: 'diffusion.erf', name: 'Diffusion in from a held surface (Fick\'s second law)', statement: 'Where a surface is held at a concentration and nothing reacts, what diffuses in reaches a depth as the error function says: chloride into concrete to its steel, carbon into case-hardened steel, heat into the ground, a dye into a gel.', formula: 'C = C_s (1 − erf(x / (2√(D t))))',
    valid: 'A semi-infinite body, D constant, the surface held at C_s from time nought.',
    inputs: [['Cs', '-', 'at the surface'], ['x', 'm', 'depth'], ['D', 'm^2/s', 'diffusivity'], ['t', 's', 'time']], output: ['C', '-', 'at that depth'],
    term: (v) => mul(v.Cs, sub(k(1), erfOf(div(v.x, mul(k(2), sqrt(mul(v.D, v.t))))))),
    source: { cite: 'Crank, The Mathematics of Diffusion, 2nd ed., Oxford University Press 1975, eq. 2.45; for chloride in concrete, Collepardi, Marcialis & Turriziani 1972', kind: 'textbook' }, example: { inputs: { Cs: 0.003, x: 0.03, D: 1e-12, t: 3e8 }, output: 0.0006620140857595405 },
  }),
  U({
    id: 'diffusion.sphere-limit', name: 'The largest a sphere can live by diffusion', statement: 'A sphere that consumes at a rate q a volume and is fed only by diffusion from its surface runs out at its centre past √(6 D C / q): why cells are small, why a tumour spheroid dies at its core past a few tenths of a millimetre, why anything bigger needs vessels or gills.', formula: 'R = √(6 D C / q)',
    valid: 'Uniform zero-order consumption, C held at the surface, steady.',
    inputs: [['D', 'm^2/s', 'diffusivity'], ['C', 'mol/m^3', 'concentration at the surface'], ['q', 'mol/m^3 s', 'consumption a volume']], output: ['R', 'm', 'largest radius'],
    term: (v) => sqrt(div(mul(k(6), v.D, v.C), v.q)),
    source: { cite: 'Hill 1928, Proc R Soc B 104:39 (the diffusion of oxygen and lactic acid through tissues)', kind: 'paper' }, example: { inputs: { D: 2e-9, C: 0.2, q: 0.026 }, output: 0.0003038218101251 },
  }),
  // ---- equilibrium thermodynamics ------------------------------------------------------------------------------------------
  U({
    id: 'osmotic.van-t-hoff', name: 'Osmotic pressure (van \'t Hoff)', statement: 'Dissolved particles pull water across a membrane that holds them back with a pressure of their concentration times R T, as if they were a gas: plasma proteins in capillaries, sap in a root, brine against a desalination membrane.', formula: 'π = c R T',
    valid: 'Dilute (ideal) solutions; charged proteins pull about twice this, by the Donnan effect and crowding.',
    inputs: [['c', 'mol/m^3', 'concentration of particles'], ['T', 'K', 'temperature']], output: ['pi', 'Pa', 'osmotic pressure'],
    term: (v) => mul(v.c, CONST.R, v.T),
    source: { cite: 'van \'t Hoff 1887, Z Phys Chem 1:481; Atkins & de Paula 2018, §5C', kind: 'textbook' }, example: { inputs: { c: 1, T: 310.15 }, output: 2578.7305809727 },
  }),
  U({
    id: 'free-energy.gradient', name: 'The free energy of a gradient', statement: 'Moving a mole up a concentration ratio and across a voltage costs R T ln(ratio) + z F ψ: what a pump must pay to make stomach acid, a nerve to hold its potassium, a mitochondrion to store its protons.', formula: 'ΔG = R T ln(c₂/c₁) + z F Δψ',
    valid: 'Ideal solutions (activities as concentrations); at equilibrium ΔG = 0, which is the Nernst equation.',
    inputs: [['T', 'K', 'temperature'], ['ratio', '-', 'concentration ratio, to over from'], ['z', '-', 'charge'], ['psi', 'V', 'voltage, to less from']], output: ['dG', 'J/mol', 'free energy a mole'],
    term: (v) => add(mul(CONST.R, v.T, ln(v.ratio)), mul(v.z, CONST.F, v.psi)), domain: (v) => [positive(v.ratio, 'the ratio')],
    source: ATKINS, example: { inputs: { T: 310.15, ratio: 10 ** 6.5, z: 1, psi: 0 }, output: 38595.35286487149 },
  }),
  U({
    id: 'henry.solubility', name: 'Gas dissolved in a liquid (Henry)', statement: 'A gas dissolves in a liquid in proportion to its partial pressure over it: oxygen in blood plasma and sea water, CO₂ in a soda.', formula: 'C = p / k_H',
    valid: 'Dilute, no reaction with the solvent; k_H rises with temperature (gases are less soluble warm) and salt.',
    inputs: [['p', 'Pa', 'partial pressure'], ['kH', 'Pa m^3/mol', 'Henry constant']], output: ['C', 'mol/m^3', 'dissolved concentration'],
    term: (v) => div(v.p, v.kH),
    source: { cite: 'Henry 1803; values from Sander 2015, Atmos Chem Phys 15:4399 (oxygen in water at 25 °C: 1.3 × 10⁻³ mol/l atm)', kind: 'paper' }, example: { inputs: { p: 0.2095 * 101325, kH: 769.23e-3 * 101325 }, output: 0.2723502723502723 },
  }),
  U({
    id: 'gas.concentration', name: 'Concentration of a gas', statement: 'An ideal gas at a mole fraction x holds x p / R T moles a cubic metre: the CO₂ that carbonates concrete, the oxygen a lung takes in.', formula: 'c = x p / (R T)',
    valid: 'An ideal gas (any air near atmospheric pressure).',
    inputs: [['x', '-', 'mole fraction'], ['p', 'Pa', 'pressure'], ['T', 'K', 'temperature']], output: ['c', 'mol/m^3', 'concentration'],
    term: (v) => div(mul(v.x, v.p), mul(CONST.R, v.T)), domain: (v) => [share(v.x, 'the mole fraction')],
    source: { cite: 'The ideal gas law (Clapeyron 1834); CO₂ at 420 ppm (NOAA Global Monitoring Laboratory, 2023 mean 419.3 ppm)', kind: 'textbook' }, example: { inputs: { x: 420e-6, p: 101325, T: 288.15 }, output: 0.017762868219573503 },
  }),
  U({
    id: 'vapour.pressure', name: 'Vapour pressure (Clausius–Clapeyron, integrated)', statement: 'A liquid\'s vapour pressure rises exponentially with temperature by its latent heat: why sweat evaporates in dry heat and not in a sauna, why water boils lower on a mountain.', formula: 'p = p₀ exp(L M / R (1/T₀ − 1/T))',
    valid: 'L taken constant over the span (water from 25 °C: within 1 % from 0 to 50 °C).',
    inputs: [['p0', 'Pa', 'vapour pressure at the reference'], ['T0', 'K', 'reference temperature'], ['T', 'K', 'temperature'], ['L', 'J/kg', 'latent heat'], ['M', 'kg/mol', 'molar mass']], output: ['p', 'Pa', 'vapour pressure'],
    term: (v) => mul(v.p0, exp(mul(div(mul(v.L, v.M), CONST.R), sub(div(k(1), v.T0), div(k(1), v.T))))),
    source: { cite: 'Clausius 1850, Clapeyron 1834; water at 25 °C, 3169.9 Pa and 2.442 MJ/kg, from IAPWS-95 (Wagner & Pruss 2002)', kind: 'paper' }, example: { inputs: { p0: 3169.9, T0: 298.15, T: 308.15, L: 2.442e6, M: 0.018015 }, output: 5638.41086961863 },
  }),
  U({
    id: 'sorption.gab', name: 'Water held by a material (GAB isotherm)', statement: 'A material takes up water from the air in layers (a first bound layer, then more loosely) as Guggenheim, Anderson and de Boer showed: wood, hair, skin, food, paper, concrete each by their own three constants.', formula: 'M = M_m C K h / ((1 − K h)(1 − K h + C K h))',
    valid: 'Relative humidity h up to about 0.95; constants for the material and temperature (wood at 21 °C: M_m 0.065, C 8, K 0.78, fitted here to the Wood Handbook\'s table within 0.3 points).',
    inputs: [['Mm', '-', 'monolayer water content'], ['C', '-', 'first-layer constant'], ['K', '-', 'multilayer constant'], ['h', '-', 'relative humidity']], output: ['M', '-', 'water content (mass over dry mass)'],
    term: (v) => { const Kh = mul(v.K, v.h); return div(mul(v.Mm, v.C, Kh), mul(sub(k(1), Kh), add(sub(k(1), Kh), mul(v.C, Kh)))); },
    domain: (v) => [share(v.h, 'the relative humidity'), { says: 'K h below 1', holds: lt(mul(v.K, v.h), k(1)) }],
    source: { cite: 'van den Berg & Bruin 1981 (GAB); wood\'s equilibrium moisture from USDA FPL, Wood Handbook, GTR-282, 2021, table 4-2', kind: 'handbook' }, example: { inputs: { Mm: 0.065, C: 8, K: 0.78, h: 0.65 }, output: 0.11755698709165066 },
  }),
  // ---- the Boltzmann factor and first-order change ------------------------------------------------------------------------
  U({
    id: 'arrhenius.ratio', name: 'Arrhenius factor between two temperatures', statement: 'A process whose step needs an activation energy runs faster warm by the Boltzmann factor\'s ratio: rust, rot, hydrolysis, a cricket\'s chirp, a battery\'s ageing.', formula: 'f = exp(−E_a/R (1/T − 1/T_ref))',
    valid: 'One rate-limiting step; Ea about 50 kJ/mol doubles a rate every 10 °C near room temperature.',
    inputs: [['Ea', 'J/mol', 'activation energy'], ['T', 'K', 'temperature'], ['Tref', 'K', 'reference temperature']], output: ['f', '-', 'rate over its rate at the reference'],
    term: (v) => exp(mul(k(-1), div(v.Ea, CONST.R), sub(div(k(1), v.T), div(k(1), v.Tref)))),
    source: { cite: 'Arrhenius 1889, Z Phys Chem 4:226; Laidler 1984, J Chem Educ 61:494', kind: 'paper' }, example: { inputs: { Ea: 50000, T: 303.15, Tref: 293.15 }, output: 1.9673506745225726 },
  }),
  U({
    id: 'decay.first-order', name: 'First-order decay', statement: 'What is lost at a rate proportional to what is left falls exponentially: radioactive nuclei, a drug in the blood, a polymer\'s chains cut by water, a population with a constant hazard.', formula: 'N = N₀ e^(−k t)',
    valid: 'A constant rate constant k.',
    inputs: [['N0', '-', 'amount at the start'], ['k', '1/s', 'rate constant'], ['t', 's', 'time']], output: ['N', '-', 'amount left'],
    term: (v) => mul(v.N0, exp(mul(k(-1), v.k, v.t))),
    source: ATKINS, example: { inputs: { N0: 100, k: 1e-6, t: 1e6 }, output: 36.787944117144235 },
  }),
  U({
    id: 'loss.first-order', name: 'Loss at a first-order rate', statement: 'What is lost in proportion to what is there leaves at its rate constant times the stock, so a steady stock is made at that rate too: albumin in plasma, a drug, a forest\'s carbon.', formula: 'ṁ = k m',
    valid: 'First-order loss; at steady state, making equals losing.',
    inputs: [['k', '1/s', 'rate constant'], ['m', 'kg', 'stock']], output: ['mdot', 'kg/s', 'loss (and making, when steady)'],
    term: (v) => mul(v.k, v.m),
    source: ATKINS, example: { inputs: { k: 1e-6, m: 2 }, output: 2e-6 },
  }),
  U({
    id: 'half-life', name: 'Half-life', statement: 'A first-order loss halves in ln 2 over its rate constant.', formula: 't½ = ln 2 / k',
    valid: 'First-order loss.',
    inputs: [['k', '1/s', 'rate constant']], output: ['t', 's', 'half-life'],
    term: (v) => div(k(Math.LN2, 'ln 2'), v.k), domain: (v) => [positive(v.k, 'the rate constant')],
    source: ATKINS, example: { inputs: { k: 1e-6 }, output: 693147.1805599453 },
  }),
  U({
    id: 'growth.doubling', name: 'Growth by doubling', statement: 'A population that divides at a fixed doubling time grows as 2^(t/t_d): bacteria, yeast, a tumour while unchecked, money at compound interest.', formula: 'N = N₀ 2^(t/t_d)',
    valid: 'Unlimited food and room (exponential phase); a culture levels off as it runs out (logistic).',
    inputs: [['N0', '-', 'count at the start'], ['t', 's', 'time'], ['td', 's', 'doubling time']], output: ['N', '-', 'count'],
    term: (v) => mul(v.N0, exp(mul(k(Math.LN2, 'ln 2'), div(v.t, v.td)))),
    source: { cite: 'Monod 1949, Annu Rev Microbiol 3:371', kind: 'paper' }, example: { inputs: { N0: 1, t: 3600, td: 1200 }, output: 8 },
  }),
  U({
    id: 'mortality.gompertz', name: 'Mortality rising with age (Gompertz)', statement: 'In an adult animal, and in many redundant systems that wear, the hazard of dying rises exponentially with age: for people it doubles about every 8 years.', formula: 'μ = A e^(G t)',
    valid: 'Adult ages (about 30 to 95 in people); a constant Makeham term adds deaths that do not depend on age.',
    inputs: [['A', '1/s', 'hazard at age nought'], ['G', '1/s', 'Gompertz rate'], ['t', 's', 'age']], output: ['mu', '1/s', 'hazard'],
    term: (v) => mul(v.A, exp(mul(v.G, v.t))),
    source: { cite: 'Gompertz 1825, Phil Trans R Soc 115:513; as a property of redundant systems, Gavrilov & Gavrilova 2001, J Theor Biol 213:527', kind: 'paper' }, example: { inputs: { A: 6e-5 / 31556952, G: Math.LN2 / (8 * 31556952), t: 80 * 31556952 }, output: 1.9469560938584942e-9 },
  }),
  U({
    id: 'time.scaled-by-rate', name: 'Time at a faster rate', statement: 'A process that runs f times as fast takes 1/f the time: a rate\'s factor (by temperature, moisture, a catalyst) is a lifetime\'s divisor.', formula: 't = t₀ / f',
    valid: 'The same process, only faster or slower.',
    inputs: [['t0', 's', 'time at the reference'], ['f', '-', 'rate over the reference rate']], output: ['t', 's', 'time'],
    term: (v) => div(v.t0, v.f), domain: (v) => [positive(v.f, 'the rate factor')],
    source: { cite: 'Kinetics: time to a fixed extent is inversely proportional to the rate (Atkins & de Paula 2018)', kind: 'textbook' }, example: { inputs: { t0: 4 * 31556952, f: 1.5 }, output: 84151872 },
  }),
  U({
    id: 'stages.series', name: 'Stages one after another', statement: 'A process of stages in series takes their times added: carbonation to the steel, then rust to cracking; a journey\'s legs.', formula: 't = t₁ + t₂',
    valid: 'Each stage starts when the one before ends.',
    inputs: [['t1', 's', 'first stage'], ['t2', 's', 'second stage']], output: ['t', 's', 'whole time'],
    term: (v) => add(v.t1, v.t2),
    source: { cite: 'Counting: times in series add', kind: 'derivation' }, example: { inputs: { t1: 100, t2: 50 }, output: 150 },
  }),
  U({
    id: 'moles.of-mass', name: 'Moles in a mass', statement: 'A mass of a substance is its mass over its molar mass in moles: the lime in a cubic metre of concrete, the glucose in a meal.', formula: 'n = m / M',
    valid: 'One substance of one molar mass.',
    inputs: [['m', 'kg', 'mass'], ['M', 'kg/mol', 'molar mass']], output: ['n', 'mol', 'amount'],
    term: (v) => div(v.m, v.M),
    source: ATKINS, example: { inputs: { m: 0.5, M: 0.056077 }, output: 8.916311500258573 },
  }),
  U({
    id: 'faraday.flux', name: 'Current from a flux of reactant (Faraday)', statement: 'Charge is conserved: a reaction fed by a molar flux, each mole taking n electrons, carries n F times it as current: oxygen reaching a rusting surface, fuel reaching a fuel cell\'s electrode.', formula: 'i = n F J',
    valid: 'Every mole that arrives reacts (a diffusion-limited current).',
    inputs: [['n', '-', 'electrons a mole'], ['J', 'mol/m^2 s', 'molar flux']], output: ['i', 'A/m^2', 'current density'],
    term: (v) => mul(v.n, CONST.F, v.J),
    source: { cite: 'Faraday 1834; Bard & Faulkner, Electrochemical Methods, 2nd ed., Wiley 2001 (the limiting current)', kind: 'textbook' }, example: { inputs: { n: 4, J: 5.7e-7 }, output: 0.21998655723360003 },
  }),
  U({
    id: 'radiation.linear', name: 'Radiation as a conductance', statement: 'Near room temperature a surface radiates to its surroundings about 4 ε σ T³ watts a square metre a kelvin of difference: about 6 for skin, which is why still air loses heat half by radiation.', formula: 'h_r = 4 ε σ T³',
    valid: 'Small differences against the mean absolute temperature T.',
    inputs: [['eps', '-', 'emissivity'], ['T', 'K', 'mean temperature']], output: ['hr', 'W/m^2 K', 'radiative coefficient'],
    term: (v) => mul(k(4), v.eps, CONST.sigmaSB, pow(v.T, 3)), domain: (v) => [share(v.eps, 'the emissivity')],
    source: HEAT, example: { inputs: { eps: 0.97, T: 300 }, output: 5.9402842413444 },
  }),
  U({
    id: 'conductance.parallel', name: 'Paths in parallel', statement: 'Heat leaving by two paths side by side meets the sum of their conductances: convection and radiation from skin, two wires in parallel.', formula: 'h = h₁ + h₂',
    valid: 'Paths at the same temperatures.',
    inputs: [['h1', 'W/m^2 K', 'one path'], ['h2', 'W/m^2 K', 'the other']], output: ['h', 'W/m^2 K', 'both'],
    term: (v) => add(v.h1, v.h2),
    source: HEAT, example: { inputs: { h1: 3, h2: 5.9 }, output: 8.9 },
  }),
  U({
    id: 'power.net', name: 'Net power', statement: 'Energy is conserved: what a body gains or loses is its power out less its power in.', formula: 'P = P_out − P_in',
    valid: 'Any system.',
    inputs: [['Pout', 'W', 'power out'], ['Pin', 'W', 'power in']], output: ['P', 'W', 'net power out'],
    term: (v) => sub(v.Pout, v.Pin),
    source: PHYS, example: { inputs: { Pout: 848, Pin: 300 }, output: 548 },
  }),
  U({
    id: 'power.sum', name: 'Powers together', statement: 'Energy is conserved: heat coming in by two ways comes in at their sum.', formula: 'P = P₁ + P₂',
    valid: 'Any system.',
    inputs: [['P1', 'W', 'one'], ['P2', 'W', 'the other']], output: ['P', 'W', 'together'],
    term: (v) => add(v.P1, v.P2),
    source: PHYS, example: { inputs: { P1: 57, P2: 95 }, output: 152 },
  }),
  U({
    id: 'energy.power-time', name: 'Energy at a power over a time', statement: 'A steady power over a time is an energy: how long a store lasts is its energy over the power drawing it.', formula: 'E = P t',
    valid: 'A steady power (else integrate it).',
    inputs: [['P', 'W', 'power'], ['t', 's', 'time']], output: ['E', 'J', 'energy'],
    term: (v) => mul(v.P, v.t),
    source: PHYS, example: { inputs: { P: 100, t: 3600 }, output: 360000 },
  }),
  U({
    id: 'dose.time', name: 'Dose at a dose rate', statement: 'A steady dose rate over a time is a dose: radiation, a drug infusion.', formula: 'D = Ḋ t',
    valid: 'A steady rate.',
    inputs: [['rate', 'Gy/s', 'dose rate'], ['t', 's', 'time']], output: ['D', 'Gy', 'dose'],
    term: (v) => mul(v.rate, v.t),
    source: { cite: 'ICRU Report 85 (2011): absorbed dose and dose rate', kind: 'standard' }, example: { inputs: { rate: 1e-6, t: 1e6 }, output: 1 },
  }),
  U({
    id: 'life.expectancy.gompertz-makeham', name: 'Years left by the Gompertz–Makeham law', statement: 'With a hazard λ + A e^(G t), the chance of living from age a to t is exp(−λ(t − a) − (A/G)(e^(Gt) − e^(Ga))), and the years left are its integral: a population\'s life expectancy from its hazard alone.', formula: 'e(a) = ∫ₐ^(a+120 yr) exp(−λ(t−a) − (A/G)(e^(Gt) − e^(Ga))) dt',
    valid: 'Adult ages; the integral taken 120 years on, past which survival is nil.',
    inputs: [['lam', '1/s', 'hazard that does not age (Makeham)'], ['A', '1/s', 'hazard at age nought'], ['G', '1/s', 'Gompertz rate'], ['a', 's', 'age now']], output: ['e', 's', 'years left'],
    term: (v) => { const t = variable('t', 's', 'age'); const S = exp(sub(mul(k(-1), v.lam, sub(t, v.a)), mul(div(v.A, v.G), sub(exp(mul(v.G, t)), exp(mul(v.G, v.a)))))); return integral(t, v.a, add(v.a, leaf('120 years', 120, 'yr', { class: 'fundamental', source: 'a horizon past every recorded life' })), S, cells(400, 'Simpson over 120 years: halving the panels changes it by under 10⁻⁹')); },
    source: { cite: 'Gompertz 1825; Makeham 1860, J Inst Actuaries 8:301', kind: 'paper' }, example: { inputs: { lam: 3e-4 / 31556952, A: 6e-5 / 31556952, G: Math.LN2 / (8 * 31556952), a: 30 * 31556952 }, output: 1498539166.8400671, rel: 1e-6 },
  }),
  U({
    id: 'humidity.vapour-pressure', name: 'Vapour pressure at a humidity', statement: 'Relative humidity is the vapour\'s pressure over the most the air could hold at its temperature, so the vapour pressure is the humidity times the saturation pressure.', formula: 'p_v = φ p_sat',
    valid: 'φ between 0 and 1.',
    inputs: [['phi', '-', 'relative humidity'], ['psat', 'Pa', 'saturation vapour pressure']], output: ['pv', 'Pa', 'vapour pressure'],
    term: (v) => mul(v.phi, v.psat), domain: (v) => [share(v.phi, 'the humidity')],
    source: { cite: 'WMO Guide to Instruments and Methods of Observation (WMO-No. 8), 2018: the definition of relative humidity', kind: 'standard' }, example: { inputs: { phi: 0.45, psat: 2339 }, output: 1052.55 },
  }),
  U({
    id: 'rates.add', name: 'Independent rates add', statement: 'Independent ways of a thing happening add their rates: hazards of dying of different causes, decays by two paths, two taps filling one tank.', formula: 'r = r₁ + r₂',
    valid: 'Independent processes (competing risks).',
    inputs: [['r1', '1/s', 'one rate'], ['r2', '1/s', 'the other']], output: ['r', '1/s', 'together'],
    term: (v) => add(v.r1, v.r2),
    source: { cite: 'Competing risks: independent hazards add (Kalbfleisch & Prentice, The Statistical Analysis of Failure Time Data, 2nd ed., Wiley 2002)', kind: 'textbook' }, example: { inputs: { r1: 3e-4, r2: 5e-5 }, output: 0.00035 },
  }),
  U({
    id: 'hazard.dose', name: 'Hazard from a dose rate', statement: 'Below a few grays, harm from radiation adds a hazard in proportion to the dose rate: about 5.5 % of cancers a sievert (ICRP 103).', formula: 'h = k Ḋ',
    valid: 'Low doses and dose rates (the linear no-threshold model, a protection standard).',
    inputs: [['k', '1/Gy', 'risk a gray'], ['rate', 'Gy/s', 'dose rate']], output: ['h', '1/s', 'hazard'],
    term: (v) => mul(v.k, v.rate),
    source: { cite: 'ICRP Publication 103 (2007): nominal risk coefficient 5.5 × 10⁻² Sv⁻¹', kind: 'standard' }, example: { inputs: { k: 0.055, rate: 1e-3 }, output: 5.5e-5 },
  }),
  // ---- strength --------------------------------------------------------------------------------------------------------
  U({
    id: 'column.self-weight', name: 'The tallest column that holds its own weight', statement: 'A column crushes under its own weight when its height reaches its strength over its weight a volume: Galileo\'s square–cube reason giants, trees and towers have limits.', formula: 'H = σ / (ρ g)',
    valid: 'A uniform prism in compression only; a slender one buckles far sooner (Greenhill: trees about a quarter of this).',
    inputs: [['sigma', 'Pa', 'compressive strength'], ['rho', 'kg/m^3', 'density']], output: ['H', 'm', 'height'],
    term: (v) => div(v.sigma, mul(v.rho, CONST.g)),
    source: { cite: 'Galileo, Two New Sciences, 1638; Gordon, Structures, Penguin 1978', kind: 'textbook' }, example: { inputs: { sigma: 170e6, rho: 1900 }, output: 9123.776642434095 },
  }),
  U({
    id: 'fatigue.basquin', name: 'Fatigue life (Basquin)', statement: 'A part cycled at a stress amplitude lasts a power of it: steel, aluminium, bone and tendon alike, each with its own fatigue strength and exponent.', formula: 'N = ½ (σ_a / σ′_f)^(1/b)',
    valid: 'High-cycle fatigue (above about 10³ cycles) and below yield; steels have an endurance limit about half their strength below which they do not fail.',
    inputs: [['sa', 'Pa', 'stress amplitude'], ['sf', 'Pa', 'fatigue strength coefficient'], ['b', '-', 'fatigue strength exponent']], output: ['N', '-', 'cycles to failure'],
    term: (v) => mul(k(0.5), exp(div(ln(div(v.sa, v.sf)), v.b))),
    source: { cite: 'Basquin 1910, Proc ASTM 10:625; σ′_f about UTS + 345 MPa, b about −0.09 for steels (Budynas & Nisbett, Shigley\'s, 10th ed.)', kind: 'paper' }, example: { inputs: { sa: 400e6, sf: 845e6, b: -0.09 }, output: 2031.5261751499306 },
  }),
  // ---- heat and mass at a surface ----------------------------------------------------------------------------------------
  U({
    id: 'conduction.series', name: 'Heat through two layers in series', statement: 'Heat crossing two layers in series meets the sum of their resistances: a body\'s core through its tissue and then the water or air round it, a wall and its air film.', formula: 'q = A ΔT / (1/h₁ + 1/h₂)',
    valid: 'Steady, one-dimensional.',
    inputs: [['A', 'm^2', 'area'], ['dT', 'K', 'temperature difference'], ['h1', 'W/m^2 K', 'first conductance'], ['h2', 'W/m^2 K', 'second conductance']], output: ['q', 'W', 'heat flow'],
    term: (v) => div(mul(v.A, v.dT), add(div(k(1), v.h1), div(k(1), v.h2))),
    source: HEAT, example: { inputs: { A: 1.9, dT: 32, h1: 15, h2: 200 }, output: 848.3720930232557 },
  }),
  U({
    id: 'evaporation.max', name: 'The most a wet skin can evaporate', statement: 'A wet surface evaporates at most its mass-transfer coefficient (by the Lewis relation, 16.5 K/kPa times its heat-transfer coefficient) times the vapour pressure it has over what the air has: sweat in dry heat, a wet bulb, a swamp cooler.', formula: 'E = LR h_c (p_sk − p_a) A',
    valid: 'The Lewis relation for air near room conditions; a fully wet skin (a partly wet one evaporates its wet share of this).',
    inputs: [['hc', 'W/m^2 K', 'convective heat-transfer coefficient'], ['psk', 'Pa', 'vapour pressure at the skin'], ['pa', 'Pa', 'vapour pressure in the air'], ['A', 'm^2', 'area']], output: ['E', 'W', 'heat evaporated'],
    term: (v) => mul(empirical('Lewis relation', 0.0165, 'K/Pa', 'ASHRAE Handbook—Fundamentals 2017, ch. 9: LR about 16.5 K/kPa for air near room conditions'), v.hc, sub(v.psk, v.pa), v.A),
    source: { cite: 'ASHRAE Handbook—Fundamentals 2017, ch. 9 (thermal comfort)', kind: 'handbook' }, example: { inputs: { hc: 3, psk: 5628, pa: 0.15 * 9595, A: 1.9 }, output: 393.9519375 },
  }),
  U({
    id: 'laplace.pressure', name: 'Pressure in a curved surface (Young–Laplace)', statement: 'A surface under tension pushes in with twice its tension over its radius: why small alveoli would collapse into large ones without surfactant, why small bubbles dissolve, why a cell\'s membrane is taut.', formula: 'ΔP = 2 γ / r',
    valid: 'A sphere (a cylinder has γ/r).',
    inputs: [['gamma', 'N/m', 'surface tension'], ['r', 'm', 'radius']], output: ['dP', 'Pa', 'pressure inside over outside'],
    term: (v) => div(mul(k(2), v.gamma), v.r),
    source: { cite: 'Young 1805, Laplace 1806; de Gennes, Brochard-Wyart & Quéré, Capillarity and Wetting Phenomena, Springer 2004', kind: 'textbook' }, example: { inputs: { gamma: 0.025, r: 100e-6 }, output: 500 },
  }),
  U({
    id: 'stokes.drag', name: 'Drag at low Reynolds number (Stokes)', statement: 'A small sphere moving slowly through a viscous fluid feels 6π μ r v: bacteria, sperm and plankton live in this world, where nothing coasts.', formula: 'F = 6 π μ r v',
    valid: 'Reynolds number well below 1.',
    inputs: [['mu', 'Pa s', 'viscosity'], ['r', 'm', 'radius'], ['v', 'm/s', 'speed']], output: ['F', 'N', 'drag'],
    term: (v) => mul(k(6), PI(), v.mu, v.r, v.v),
    source: { cite: 'Stokes 1851, Trans Camb Phil Soc 9:8; Purcell 1977, Am J Phys 45:3 (Life at low Reynolds number)', kind: 'paper' }, example: { inputs: { mu: 1e-3, r: 1e-6, v: 30e-6 }, output: 5.654866776461627e-13 },
  }),
  // ---- electrochemistry ------------------------------------------------------------------------------------------------
  U({
    id: 'corrosion.penetration', name: 'Corrosion rate from its current (Faraday)', statement: 'A metal dissolving at a current density loses thickness at i M / (n F ρ): every metal by its own molar mass, valence and density, from the one current that measures it.', formula: 'v = i M / (n F ρ)',
    valid: 'Uniform corrosion; pitting goes deeper in places.',
    inputs: [['i', 'A/m^2', 'corrosion current density'], ['M', 'g/mol', 'molar mass of the metal'], ['n', '-', 'electrons an atom gives up'], ['rho', 'kg/m^3', 'density of the metal']], output: ['v', 'm/s', 'loss of thickness a second'],
    term: (v) => div(mul(v.i, v.M), mul(v.n, CONST.F, v.rho)),
    source: { cite: 'Faraday 1834; ASTM G102-89 (2015), calculation of corrosion rates from electrochemical measurements', kind: 'standard' }, example: { inputs: { i: 0.01, M: 55.845, n: 2, rho: 7874 }, output: 3.675340608164955e-13 },
  }),
  // ---- the empirical laws of particular materials, kept as fits with their data ----------------------------------------------
  U({
    id: 'porosity.powers', name: 'Capillary porosity of cement paste (Powers)', statement: 'Cement takes up water as it hydrates and its products fill less space than cement and water did, so what is left as capillary pores is set by the water–cement ratio and how far it has hydrated.', formula: 'ε = (w/c − 0.36 α) / (w/c + 0.32)',
    valid: 'Portland cement paste, sealed curing; α the degree of hydration (about 0.8 after a year).',
    inputs: [['wc', '-', 'water–cement ratio'], ['alpha', '-', 'degree of hydration']], output: ['eps', '-', 'capillary porosity'],
    term: (v) => div(sub(v.wc, mul(empirical('water bound a gram of cement hydrated', 0.36, '1', 'Powers & Brownyard 1947, J ACI 43 (volumes of hydration)'), v.alpha)), add(v.wc, empirical('cement\'s volume a gram over water\'s', 0.32, '1', 'Powers & Brownyard 1947: the specific volume of cement, 0.32 ml/g'))),
    domain: (v) => [share(v.alpha, 'the degree of hydration')],
    source: { cite: 'Powers & Brownyard 1947, J ACI 43; Taylor, Cement Chemistry, 2nd ed., Thomas Telford 1997, §8.3', kind: 'paper' }, example: { inputs: { wc: 0.55, alpha: 0.8 }, output: 0.3011494252873564 },
  }),
  U({
    id: 'diffusivity.papadakis', name: 'CO₂ diffusivity in concrete (Papadakis)', statement: 'CO₂ diffuses through the air in concrete\'s pores, so its diffusivity rises with the paste\'s porosity and falls as the pores fill with water.', formula: 'D = 1.64 × 10⁻⁶ ε^1.8 (1 − RH)^2.2',
    valid: 'Ordinary Portland cement concretes at RH 0.4–0.95; ε the hardened paste\'s porosity.',
    inputs: [['eps', '-', 'paste porosity'], ['rh', '-', 'relative humidity']], output: ['D', 'm^2/s', 'effective CO₂ diffusivity'],
    term: (v) => mul(empirical('Papadakis coefficient', 1.64e-6, 'm^2/s', 'Papadakis, Vayenas & Fardis 1991, ACI Mater J 88:363'), pow(v.eps, 1.8), pow(sub(k(1), v.rh), 2.2)),
    domain: (v) => [share(v.eps, 'the porosity'), share(v.rh, 'the relative humidity')],
    source: { cite: 'Papadakis, Vayenas & Fardis 1991, ACI Mater J 88:363', kind: 'paper' }, example: { inputs: { eps: 0.3011, rh: 0.65 }, output: 1.8770373114382666e-8, rel: 1e-6 },
  }),
];
