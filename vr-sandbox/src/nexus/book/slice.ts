// The laws the beam slice rests on that are not in the kept book: definitions and derivations by superposition,
// each with the domain it holds in and an example checked at the book's own limits (tests/nexus/book.test.ts).

import { law, type Law } from '../law';
import { add, and, div, ge, gt, k, le, leaf, max, mul, pow, sub, variable, zero } from '../term';

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
const E = variable('E', 'Pa', 'modulus'), I = variable('I', 'm^4', 'second moment');
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

/** The derived laws of the slice. */
export const SLICE: Law[] = [PRISM_MASS, EXTENT_FROM_MASS, LINE_WEIGHT, TWO_SUPPORTS, PATCH_MOMENT, SELF_MOMENT, RECT_AREA, RECT_MODULUS, RECT_I, PATCH_SAG, SELF_SAG];
