// The laws the beam slice rests on that are not in the kept book: definitions and derivations by superposition,
// each with the domain it holds in and an example checked at the book's own limits (tests/nexus/book.test.ts).

import { law, type Law } from '../law';
import { PI, add, and, div, ge, gt, k, le, leaf, max, mul, pow, sqrt, sub, variable, zero } from '../term';

export const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
export const ROARK = { cite: 'Young & Budynas, Roark\'s Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002, table 8.1', kind: 'handbook' as const };
export const PHYSICS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };
export const NDS = { cite: 'AWC, National Design Specification for Wood Construction, 2018, §4.4.1.2 (beam stability: sawn lumber, d/b ≤ 2 needs no lateral support)', kind: 'standard' as const };
export const SUPERPOSITION = { cite: 'Derived by superposition of the point-load influence line of a simply supported beam (Roark table 8.1 case 1e) over a central patch; the two limits (a point, the whole span) are the book\'s own cases', kind: 'derivation' as const };

const m = variable('m', 'kg', 'mass'), g = variable('g', 'm/s^2', 'gravity');
void m; void g;
const P = variable('P', 'N', 'load'), W = variable('W', 'N', 'self weight'), R = variable('R', 'N', 'reaction');
const L = variable('L', 'm', 'span'), Lt = variable('Lt', 'm', 'total length'), w = variable('w', 'm', 'patch width'), a = variable('a', 'm', 'station from mid-span');
const q = variable('q', 'N/m', 'weight per length'), rho = variable('rho', 'kg/m^3', 'density');
const b = variable('b', 'm', 'breadth'), h = variable('h', 'm', 'depth'), x = variable('x', 'm', 'extent x'), y = variable('y', 'm', 'extent y'), z = variable('z', 'm', 'extent z');
const E = variable('E', 'Pa', 'modulus'), I = variable('I', 'm^4', 'second moment'), A = variable('A', 'm^2', 'section area');
void R;

/** The slenderness below which shear deflection is left out of a beam's sag: an assumption with its grounds. */
export const SLENDER = leaf('slender bound', 20, '1', { class: 'assumed', by: 'the restart', grounds: 'shear deflection grows as (h/L)^2 and is a small fraction of bending deflection past L/h = 20; the Wood Handbook treats it separately below that' });
const slender = { says: 'slender: L/h ≥ 20, so shear deflection is left out (Euler–Bernoulli)', holds: ge(div(L, h), SLENDER) };
const inSpan = { says: 'the station lies within the span: a ≤ L/2', holds: le(a, div(L, k(2))) };
const patchInSpan = { says: 'the patch lies within the span and has width: 0 < w ≤ L', holds: and(gt(w, zero('m')), le(w, L)) };

export const PRISM_MASS = law({
  id: 'mass.prism', name: 'Mass of a rectangular prism', statement: 'A prism of uniform density has the mass of its density times its volume.', formula: 'm = ρ x y z',
  inputs: [{ sym: 'rho', unit: 'kg/m^3', name: 'density' }, { sym: 'x', unit: 'm', name: 'extent x' }, { sym: 'y', unit: 'm', name: 'extent y' }, { sym: 'z', unit: 'm', name: 'extent z' }], output: { sym: 'm', unit: 'kg', name: 'mass' },
  term: mul(rho, x, y, z), domain: [], source: { cite: 'definition of density', kind: 'textbook' }, example: { inputs: { rho: 7850, x: 0.1, y: 0.2, z: 0.3 }, output: 47.1, from: 'arithmetic' },
});

export const EXTENT_FROM_MASS = law({
  id: 'extent.from-mass', name: 'Height of a prism of given mass and footprint', statement: 'A prism of a given mass on a given footprint is as tall as the mass over density times footprint.', formula: 'y = m / (ρ x z)',
  inputs: [{ sym: 'm', unit: 'kg', name: 'mass' }, { sym: 'rho', unit: 'kg/m^3', name: 'density' }, { sym: 'x', unit: 'm', name: 'extent x' }, { sym: 'z', unit: 'm', name: 'extent z' }], output: { sym: 'y', unit: 'm', name: 'height' },
  term: div(m, mul(rho, x, z)), domain: [], source: { cite: 'definition of density', kind: 'textbook' }, example: { inputs: { m: 47.1, rho: 7850, x: 0.1, z: 0.3 }, output: 0.2, from: 'arithmetic' },
});

export const LINE_WEIGHT = law({
  id: 'weight.per-length', name: 'Weight per length of a rectangular bar', statement: 'A bar of rectangular section weighs, per length, its density times its section times gravity.', formula: 'q = ρ b h g',
  inputs: [{ sym: 'rho', unit: 'kg/m^3', name: 'density' }, { sym: 'b', unit: 'm', name: 'breadth' }, { sym: 'h', unit: 'm', name: 'depth' }, { sym: 'g', unit: 'm/s^2', name: 'gravity' }], output: { sym: 'q', unit: 'N/m', name: 'weight per length' },
  term: mul(rho, b, h, g), domain: [], source: PHYSICS, example: { inputs: { rho: 530, b: 0.038, h: 0.089, g: 9.80665 }, output: 530 * 0.038 * 0.089 * 9.80665, from: 'arithmetic' },
});

export const TWO_SUPPORTS = law({
  id: 'statics.two-supports.symmetric', name: 'Reactions of a symmetric beam on two supports', statement: 'A beam symmetric about mid-span, loaded there, rests half of all its weight on each support (moment balance about either support).', formula: 'R = (P + W) / 2',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'W', unit: 'N', name: 'self weight' }], output: { sym: 'R', unit: 'N', name: 'reaction at each support' },
  term: div(add(P, W), k(2)), domain: [], source: PHYSICS, example: { inputs: { P: 100, W: 20 }, output: 60, from: 'arithmetic' },
});

export const PATCH_MOMENT = law({
  id: 'beam.simply-supported.central-patch.moment', name: 'Bending moment under a central patch load', statement: 'A load P spread over a central patch of width w on a simply supported span L bends the beam, at a station a from mid-span, by P/2 (L/2 − a) less the patch\'s own share where the station lies under it.', formula: 'M = (P/2)(L/2 − a) − P max(0, w/2 − a)² / (2 w)',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'L', unit: 'm', name: 'span' }, { sym: 'w', unit: 'm', name: 'patch width' }, { sym: 'a', unit: 'm', name: 'station from mid-span' }], output: { sym: 'M', unit: 'N m', name: 'bending moment' },
  term: sub(mul(div(P, k(2)), sub(div(L, k(2)), a)), div(mul(P, pow(max(zero('m'), sub(div(w, k(2)), a)), 2)), mul(k(2), w))),
  domain: [inSpan, patchInSpan], source: SUPERPOSITION, example: { inputs: { P: 1000, L: 2, w: 2, a: 0 }, output: 250, from: 'the whole-span limit: w L / 8 (Shigley table A-9 case 7)' },
});

export const SELF_MOMENT = law({
  id: 'beam.overhang.self-moment', name: 'Bending moment from a beam\'s own weight, with overhangs', statement: 'A beam of total length Lt weighing q per length on supports L apart bends, at a station a from mid-span, by its reaction times the lever less the weight beyond the station.', formula: 'M = (q Lt / 2)(L/2 − a) − q (Lt/2 − a)² / 2',
  inputs: [{ sym: 'q', unit: 'N/m', name: 'weight per length' }, { sym: 'L', unit: 'm', name: 'span' }, { sym: 'Lt', unit: 'm', name: 'total length' }, { sym: 'a', unit: 'm', name: 'station from mid-span' }], output: { sym: 'M', unit: 'N m', name: 'bending moment' },
  term: sub(mul(div(mul(q, Lt), k(2)), sub(div(L, k(2)), a)), div(mul(q, pow(sub(div(Lt, k(2)), a), 2)), k(2))),
  domain: [inSpan, { says: 'the beam reaches both supports: Lt ≥ L', holds: ge(Lt, L) }], source: { cite: 'static equilibrium of a beam with equal overhangs', kind: 'derivation' },
  example: { inputs: { q: 100, L: 2, Lt: 2, a: 0 }, output: 50, from: 'no overhang: q L² / 8 (Shigley table A-9 case 7)' },
});

export const RECT_AREA = law({
  id: 'section.rect.area', name: 'Area of a rectangle', statement: 'Breadth times depth.', formula: 'A = b h',
  inputs: [{ sym: 'b', unit: 'm', name: 'breadth' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'A', unit: 'm^2', name: 'area' },
  term: mul(b, h), domain: [], source: SHIGLEY, example: { inputs: { b: 0.02, h: 0.04 }, output: 0.0008, from: 'arithmetic' },
});

export const RECT_MODULUS = law({
  id: 'section.rect.modulus', name: 'Section modulus of a rectangle', statement: 'About its breadth axis a rectangle has section modulus b h² / 6.', formula: 'S = b h² / 6',
  inputs: [{ sym: 'b', unit: 'm', name: 'breadth' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'S', unit: 'm^3', name: 'section modulus' },
  term: div(mul(b, pow(h, 2)), k(6)), domain: [], source: { ...SHIGLEY, cite: `${SHIGLEY.cite}, table A-18` }, example: { inputs: { b: 0.02, h: 0.04 }, output: (0.02 * 0.04 ** 2) / 6, from: 'ganglia/laws.ts stress.bending example' },
});

export const RECT_I = law({
  id: 'section.rect.second-moment', name: 'Second moment of a rectangle', statement: 'About its breadth axis a rectangle has second moment b h³ / 12.', formula: 'I = b h³ / 12',
  inputs: [{ sym: 'b', unit: 'm', name: 'breadth' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'I', unit: 'm^4', name: 'second moment' },
  term: div(mul(b, pow(h, 3)), k(12)), domain: [], source: { ...SHIGLEY, cite: `${SHIGLEY.cite}, table A-18` }, example: { inputs: { b: 0.02, h: 0.04 }, output: (0.02 * 0.04 ** 3) / 12, from: 'ganglia/laws.ts beam examples' },
});

export const PATCH_SAG = law({
  id: 'beam.simply-supported.central-patch.sag', name: 'Mid-span sag under a central patch load', statement: 'A load P spread over a central patch of width w sags a simply supported span L at mid-span by P (L³ − L w²/2 + w³/8) / (48 E I): the point load\'s sag at w → 0, the spread load\'s at w → L.', formula: 'δ = P (L³ − L w²/2 + w³/8) / (48 E I)',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'L', unit: 'm', name: 'span' }, { sym: 'w', unit: 'm', name: 'patch width' }, { sym: 'E', unit: 'Pa', name: 'modulus' }, { sym: 'I', unit: 'm^4', name: 'second moment' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'delta', unit: 'm', name: 'mid-span sag' },
  term: div(mul(P, add(sub(pow(L, 3), div(mul(L, pow(w, 2)), k(2))), div(pow(w, 3), k(8)))), mul(k(48), E, I)),
  domain: [{ says: 'the patch lies within the span: w ≤ L', holds: le(w, L) }, slender], source: SUPERPOSITION,
  example: { inputs: { P: 1000, L: 2, w: 0, E: 200e9, I: (0.02 * 0.04 ** 3) / 12, h: 0.04 }, output: 0.0078125, from: 'ganglia/laws.ts beam.simply-supported.point (the point limit)' },
});

export const SELF_SAG = law({
  id: 'beam.overhang.self-sag', name: 'Mid-span sag from a beam\'s own weight, with overhangs', statement: 'A beam weighing q per length sags 5 q L⁴ / (384 E I) over its span, less q c² L² / (16 E I) for the hogging moment of an overhang c at each end.', formula: 'δ = 5 q L⁴ / (384 E I) − q c² L² / (16 E I), c = (Lt − L)/2',
  inputs: [{ sym: 'q', unit: 'N/m', name: 'weight per length' }, { sym: 'L', unit: 'm', name: 'span' }, { sym: 'Lt', unit: 'm', name: 'total length' }, { sym: 'E', unit: 'Pa', name: 'modulus' }, { sym: 'I', unit: 'm^4', name: 'second moment' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'delta', unit: 'm', name: 'mid-span sag' },
  term: sub(div(mul(k(5), q, pow(L, 4)), mul(k(384), E, I)), div(mul(q, pow(div(sub(Lt, L), k(2)), 2), pow(L, 2)), mul(k(16), E, I))),
  domain: [{ says: 'the beam reaches both supports: Lt ≥ L', holds: ge(Lt, L) }, slender], source: { cite: `${ROARK.cite}, cases 2e (uniform load) and 1c (end moment), superposed`, kind: 'derivation' },
  example: { inputs: { q: 1000, L: 2, Lt: 2, E: 200e9, I: (0.02 * 0.04 ** 3) / 12, h: 0.04 }, output: 0.009765625, from: 'ganglia/laws.ts beam.simply-supported.udl (no overhang)' },
});

export const FIRST_PERIOD = law({
  id: 'beam.simply-supported.first-period', name: 'Period of the first mode of a simply supported beam', statement: 'A simply supported uniform beam vibrates in its first mode at ω₁ = (π/L)² √(E I / (ρ A)); its period is 2π over that.', formula: 'T₁ = 2 L² √(ρ A / (E I)) / π',
  inputs: [{ sym: 'L', unit: 'm', name: 'span' }, { sym: 'E', unit: 'Pa', name: 'modulus' }, { sym: 'I', unit: 'm^4', name: 'second moment' }, { sym: 'rho', unit: 'kg/m^3', name: 'density' }, { sym: 'A', unit: 'm^2', name: 'section area' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'T1', unit: 's', name: 'first period' },
  term: div(mul(k(2), pow(L, 2), sqrt(div(mul(rho, A), mul(E, I)))), PI()),
  domain: [slender], source: { cite: 'Blevins, Formulas for Natural Frequency and Mode Shape, Krieger 2001, table 8-1 (pinned–pinned beam, first mode)', kind: 'handbook' },
  example: { inputs: { L: 2, E: 200e9, I: (0.02 * 0.04 ** 3) / 12, rho: 7850, A: 0.0008, h: 0.04 }, output: (2 * Math.PI) / ((Math.PI / 2) ** 2 * Math.sqrt((200e9 * ((0.02 * 0.04 ** 3) / 12)) / (7850 * 0.0008))), from: 'ω₁ = (π/L)² √(EI/ρA), computed independently' },
});

// ---- a cantilever arm from a post, and the bolt group that holds it --------------------------------------------

const reach = variable('a', 'm', 'reach of the load from the root'), ell = variable('ell', 'm', 'length of the arm');
const d = variable('d', 'm', 'nominal diameter'), pitch = variable('p', 'm', 'thread pitch'), nb = variable('n', '1', 'bolts'), Rm = variable('Rm', 'Pa', 'tensile strength of the bolt'), As = variable('As', 'm^2', 'tensile stress area'), Ft = variable('Ft', 'N', 'tensile capacity of the group'), lever = variable('lever', 'm', 'lever of the group');
const ISO898 = { cite: 'ISO 898-1:2013, mechanical properties of fasteners; ISO 724 basic dimensions of metric threads', kind: 'standard' as const };

export const CANTILEVER_MOMENT = law({
  id: 'cantilever.root-moment', name: 'Moment at the root of a cantilever', statement: 'A load P at reach a and the arm\'s own weight q over its length ℓ bend the root by P a + q ℓ² / 2.', formula: 'M = P a + q ℓ² / 2',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'a', unit: 'm', name: 'reach of the load from the root' }, { sym: 'q', unit: 'N/m', name: 'weight per length' }, { sym: 'ell', unit: 'm', name: 'length of the arm' }], output: { sym: 'M', unit: 'N m', name: 'root moment' },
  term: add(mul(P, reach), div(mul(q, pow(ell, 2)), k(2))), domain: [{ says: 'the load is on the arm: a ≤ ℓ', holds: le(reach, ell) }], source: PHYSICS, example: { inputs: { P: 100, a: 0.5, q: 10, ell: 0.6 }, output: 51.8, from: 'arithmetic' },
});

export const CANTILEVER_SHEAR = law({
  id: 'cantilever.root-shear', name: 'Shear at the root of a cantilever', statement: 'The root carries the load and the arm\'s weight.', formula: 'V = P + q ℓ',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'q', unit: 'N/m', name: 'weight per length' }, { sym: 'ell', unit: 'm', name: 'length of the arm' }], output: { sym: 'V', unit: 'N', name: 'root shear' },
  term: add(P, mul(q, ell)), domain: [], source: PHYSICS, example: { inputs: { P: 100, q: 10, ell: 0.6 }, output: 106, from: 'arithmetic' },
});

const x1 = sub(reach, div(w, k(2))), x2 = add(reach, div(w, k(2)));
export const CANTILEVER_TIP_SAG = law({
  id: 'cantilever.tip-sag', name: 'Tip deflection of a cantilever under a patch load at reach a and its own weight', statement: 'A load P spread over a patch of width w centred at reach a bends the tip by P (ℓ (x₂³ − x₁³) − (x₂⁴ − x₁⁴)/4) / (6 E I w), x₁ and x₂ the patch\'s ends: P a² (3ℓ − a) / (6 E I) as the patch narrows; the arm\'s own weight adds q ℓ⁴ / (8 E I).', formula: 'δ = P (ℓ (x₂³ − x₁³) − (x₂⁴ − x₁⁴)/4) / (6 E I w) + q ℓ⁴ / (8 E I)',
  inputs: [{ sym: 'P', unit: 'N', name: 'load' }, { sym: 'a', unit: 'm', name: 'reach of the load from the root' }, { sym: 'w', unit: 'm', name: 'patch width' }, { sym: 'ell', unit: 'm', name: 'length of the arm' }, { sym: 'q', unit: 'N/m', name: 'weight per length' }, { sym: 'E', unit: 'Pa', name: 'modulus' }, { sym: 'I', unit: 'm^4', name: 'second moment' }, { sym: 'h', unit: 'm', name: 'depth' }], output: { sym: 'delta', unit: 'm', name: 'tip sag' },
  term: add(div(mul(P, sub(mul(ell, sub(pow(x2, 3), pow(x1, 3))), div(sub(pow(x2, 4), pow(x1, 4)), k(4)))), mul(k(6), E, I, w)), div(mul(q, pow(ell, 4)), mul(k(8), E, I))),
  domain: [{ says: 'the patch lies on the arm and has width: 0 < w, 0 ≤ a − w/2, a + w/2 ≤ ℓ', holds: and(and(gt(w, zero('m')), ge(x1, zero('m'))), le(x2, ell)) }, { says: 'slender: ℓ/h ≥ 20, so shear deflection is left out (Euler–Bernoulli)', holds: ge(div(ell, h), SLENDER) }],
  source: { cite: `${ROARK.cite}, case 1a (point load) integrated over the patch, and case 2a (uniform load), on a cantilever`, kind: 'derivation' },
  example: { inputs: { P: 1000, a: 0.5, w: 0.2, ell: 1, q: 0, E: 200e9, I: (0.02 * 0.04 ** 3) / 12, h: 0.04 }, output: (1000 / (6 * 200e9 * ((0.02 * 0.04 ** 3) / 12) * 0.2)) * (1 * (0.6 ** 3 - 0.4 ** 3) - (0.6 ** 4 - 0.4 ** 4) / 4), from: 'the integral of the point-load influence over the patch, computed independently' },
});

export const STRESS_AREA = law({
  id: 'bolt.tensile-stress-area', name: 'Tensile stress area of a metric thread', statement: 'The area that carries a bolt\'s tension is a circle of diameter (d₂ + d₃)/2, with d₂ = d − 0.6495 p and d₃ = d − 1.2269 p.', formula: 'A_s = (π/4) ((d − 0.9382 p)/1)²',
  inputs: [{ sym: 'd', unit: 'm', name: 'nominal diameter' }, { sym: 'p', unit: 'm', name: 'thread pitch' }], output: { sym: 'As', unit: 'm^2', name: 'tensile stress area' },
  term: mul(div(PI(), k(4)), pow(sub(d, mul(k(0.9381940, '(0.649519 + 1.226869)/2'), pitch)), 2)), domain: [], source: ISO898,
  example: { inputs: { d: 0.008, p: 0.00125 }, output: (Math.PI / 4) * ((0.008 - 0.649519 * 0.00125 + 0.008 - 1.226869 * 0.00125) / 2) ** 2, from: 'ISO 898-1 A_s for M8: 36.6 mm²' },
});

export const GROUP_TENSION = law({
  id: 'bolt-group.tension', name: 'Tensile capacity of a bolt group', statement: 'n bolts carry n times the stress area times the tensile strength.', formula: 'F_t = n A_s R_m',
  inputs: [{ sym: 'n', unit: '1', name: 'bolts' }, { sym: 'As', unit: 'm^2', name: 'tensile stress area' }, { sym: 'Rm', unit: 'Pa', name: 'tensile strength of the bolt' }], output: { sym: 'Ft', unit: 'N', name: 'tensile capacity of the group' },
  term: mul(nb, As, Rm), domain: [], source: ISO898, example: { inputs: { n: 2, As: 36.6e-6, Rm: 800e6 }, output: 58560, from: 'arithmetic' },
});

export const GROUP_BENDING = law({
  id: 'bolt-group.bending', name: 'Bending capacity of a bolt group prying about the footprint edge', statement: 'The group\'s tension acting at the lever of the footprint: its moment capacity is F_t times the lever, half the larger extent of the bonded face.', formula: 'M_cap = F_t · lever',
  inputs: [{ sym: 'Ft', unit: 'N', name: 'tensile capacity of the group' }, { sym: 'lever', unit: 'm', name: 'lever of the group' }], output: { sym: 'Mcap', unit: 'N m', name: 'bending capacity' },
  term: mul(Ft, lever), domain: [], source: { cite: 'the kept kernel\'s joint model (connectors/registry.ts, engineering/bolts.ts): prying about the footprint edge, the group\'s tensile capacity acting at the arm', kind: 'derivation' },
  example: { inputs: { Ft: 58560, lever: 0.0445 }, output: 2605.92, from: 'arithmetic' },
});

// ---- a bar swinging on a hinge --------------------------------------------------------------------------------------

const Ip = variable('I', 'kg m^2', 'moment of inertia about the pivot'), dcm = variable('d', 'm', 'distance from the pivot to the centre of mass'), theta0 = variable('theta0', 'rad', 'release angle');

const ea = variable('a', 'm', 'extent along the swing'), eb = variable('b', 'm', 'extent across the swing, in its plane');
export const PRISM_INERTIA = law({
  id: 'inertia.prism.centre', name: 'Moment of inertia of a rectangular prism about its centre', statement: 'About an axis through its centre, a uniform rectangular prism has moment of inertia m (a² + b²) / 12, a and b its extents in the plane of rotation.', formula: 'I = m (a² + b²) / 12',
  inputs: [{ sym: 'm', unit: 'kg', name: 'mass' }, { sym: 'a', unit: 'm', name: 'extent along the swing' }, { sym: 'b', unit: 'm', name: 'extent across the swing, in its plane' }], output: { sym: 'I', unit: 'kg m^2', name: 'moment of inertia about the centre' },
  term: div(mul(m, add(pow(ea, 2), pow(eb, 2))), k(12)), domain: [], source: PHYSICS,
  example: { inputs: { m: 2, a: 1, b: 0.1 }, output: (2 * (1 + 0.01)) / 12, from: 'arithmetic' },
});

export const PHYSICAL_PENDULUM = law({
  id: 'pendulum.physical.period', name: 'Period of a physical pendulum, small swings', statement: 'A rigid body swinging about a pivot has, for small swings, the period 2π √(I / (m g d)): its moment of inertia about the pivot over its weight times the distance from the pivot to its centre of mass.', formula: 'T₀ = 2π √(I / (m g d))',
  inputs: [{ sym: 'I', unit: 'kg m^2', name: 'moment of inertia about the pivot' }, { sym: 'm', unit: 'kg', name: 'mass' }, { sym: 'g', unit: 'm/s^2', name: 'gravity' }, { sym: 'd', unit: 'm', name: 'distance from the pivot to the centre of mass' }], output: { sym: 'T0', unit: 's', name: 'small-swing period' },
  term: mul(k(2), PI(), sqrt(div(Ip, mul(m, g, dcm)))), domain: [], source: PHYSICS,
  example: { inputs: { I: 2 / 3, m: 2, g: 9.80665, d: 0.5 }, output: 2 * Math.PI * Math.sqrt((2 / 3) / (2 * 9.80665 * 0.5)), from: 'a uniform 1 m bar of 2 kg: the simple pendulum of length 2L/3, computed independently' },
});

export const AMPLITUDE_FACTOR = law({
  id: 'pendulum.amplitude-factor', name: 'Lengthening of the period with the swing', statement: 'A pendulum released from θ₀ swings slower than the small-swing period by 1 + θ₀²/16 + 11 θ₀⁴/3072, the first terms of the complete elliptic integral; the next term is under 1e-4 up to 45°.', formula: 'T/T₀ = 1 + θ₀²/16 + 11 θ₀⁴/3072',
  inputs: [{ sym: 'theta0', unit: 'rad', name: 'release angle' }], output: { sym: 'f', unit: '1', name: 'period factor' },
  term: add(add(k(1), div(pow(theta0, 2), k(16))), div(mul(k(11), pow(theta0, 4)), k(3072))),
  domain: [{ says: 'a swing of at most 45°: the series\' next term, 173 θ₀⁶/737280, is under 1e-4 there', holds: le(theta0, leaf('45 degrees', 45, 'deg', { class: 'configuration', source: 'the truncation of the series: 173 θ⁶/737280 at 45° is 5.6e-5' })) }],
  source: { cite: `${PHYSICS.cite}; the series of 4 K(sin(θ₀/2)) / (2π) (Landau & Lifshitz, Mechanics, §11)`, kind: 'textbook' },
  example: { inputs: { theta0: Math.PI / 6 }, output: 1 + (Math.PI / 6) ** 2 / 16 + (11 * (Math.PI / 6) ** 4) / 3072, from: 'the series at 30°, computed independently' },
});

/** The derived laws of the slice. */
export const SLICE: Law[] = [PRISM_MASS, EXTENT_FROM_MASS, LINE_WEIGHT, TWO_SUPPORTS, PATCH_MOMENT, SELF_MOMENT, RECT_AREA, RECT_MODULUS, RECT_I, PATCH_SAG, SELF_SAG, FIRST_PERIOD, CANTILEVER_MOMENT, CANTILEVER_SHEAR, CANTILEVER_TIP_SAG, STRESS_AREA, GROUP_TENSION, GROUP_BENDING, PRISM_INERTIA, PHYSICAL_PENDULUM, AMPLITUDE_FACTOR];
