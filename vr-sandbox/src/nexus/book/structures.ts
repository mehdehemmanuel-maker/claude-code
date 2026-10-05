// The book, structures: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { est } from './constants';
import { sub, mul, div, pow, sqrt, le, lt, k, PI } from '../term';

export const STRUCTURES = [
  L({
    id: "stress.axial", name: "Axial stress", statement: "A bar pulled or pushed along its length carries the force spread over its section.", formula: "σ = F / A",
    valid: "Away from holes and ends (stress concentrations raise it locally).",
    inputs: [["F", "N", "force"], ["A", "m^2", "section area"]], output: ["sigma", "Pa", "stress"],
    term: (v) => div(v.F, v.A),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"F":10000,"A":0.00007853981633974483}, output: 127323954.47351627 },
  }),
  L({
    id: "stress.bending", name: "Bending stress", statement: "A beam bent by a moment is stressed most at its outer fibre: the moment over its section modulus.", formula: "σ = M / S",
    valid: "Elastic, slender beams (Euler-Bernoulli); rectangle S = b h²/6, round S = π d³/32.",
    inputs: [["M", "N m", "bending moment"], ["S", "m^3", "section modulus I/c"]], output: ["sigma", "Pa", "stress"],
    term: (v) => div(v.M, v.S),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"M":100,"S":0.0000053333333333333345}, output: 18750000 },
  }),
  L({
    id: "beam.simply-supported.udl", name: "Sag of a simply supported beam under a spread load", statement: "A beam resting on supports at its ends, loaded evenly, sags most at mid-span by 5 w L^4 over 384 E I (w per metre).", formula: "δ = 5 w L⁴ / (384 E I)",
    valid: "Small, elastic sag of a slender beam.",
    inputs: [["w", "N/m", "load per length"], ["L", "m", "span"], ["E", "Pa", "modulus"], ["I", "m^4", "second moment"]], output: ["d", "m", "mid-span sag"],
    term: (v) => div(mul(k(5), v.w, pow(v.L, 4)), mul(k(384), v.E, v.I)),
    source: { cite: "Young & Budynas, Roark's Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002", kind: "handbook" }, example: { inputs: {"w":1000,"L":2,"E":200000000000,"I":1.0666666666666668e-7}, output: 0.009765625 },
  }),
  L({
    id: "beam.simply-supported.point", name: "Sag of a simply supported beam under a central load", statement: "A load at mid-span of a simply supported beam sags it by P L^3 over 48 E I.", formula: "δ = P L³ / (48 E I)",
    valid: "Small, elastic sag.",
    inputs: [["P", "N", "load"], ["L", "m", "span"], ["E", "Pa", "modulus"], ["I", "m^4", "second moment"]], output: ["d", "m", "mid-span sag"],
    term: (v) => div(mul(v.P, pow(v.L, 3)), mul(k(48), v.E, v.I)),
    source: { cite: "Young & Budynas, Roark's Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002", kind: "handbook" }, example: { inputs: {"P":1000,"L":2,"E":200000000000,"I":1.0666666666666668e-7}, output: 0.0078125 },
  }),
  L({
    id: "beam.cantilever.point", name: "Deflection of a cantilever under an end load", statement: "A beam fixed at one end and loaded at the other bends there by P L^3 over 3 E I.", formula: "δ = P L³ / (3 E I)",
    valid: "Small, elastic deflection; a truly fixed root.",
    inputs: [["P", "N", "end load"], ["L", "m", "length"], ["E", "Pa", "modulus"], ["I", "m^4", "second moment"]], output: ["d", "m", "tip deflection"],
    term: (v) => div(mul(v.P, pow(v.L, 3)), mul(k(3), v.E, v.I)),
    source: { cite: "Young & Budynas, Roark's Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002", kind: "handbook" }, example: { inputs: {"P":1000,"L":1,"E":200000000000,"I":1.0666666666666668e-7}, output: 0.015625 },
  }),
  L({
    id: "buckling.euler", name: "Euler buckling", statement: "A slender strut pushed end to end bows out sideways and collapses at π^2 E I over (K L)^2, K set by how its ends are held.", formula: "P_cr = π² E I / (K L)²",
    valid: "Slender struts (well past the Johnson range); K 1 pinned-pinned, 2 fixed-free, 0.7 fixed-pinned, 0.5 fixed-fixed.",
    inputs: [["E", "Pa", "modulus"], ["I", "m^4", "least second moment"], ["L", "m", "length"], ["K", "-", "effective length factor"]], output: ["P", "N", "buckling load"],
    term: (v) => div(mul(pow(PI(), 2), v.E, v.I), pow(mul(v.K, v.L), 2)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"E":200000000000,"I":7.853981633974483e-9,"L":1,"K":1}, output: 15503.138340149908 },
  }),
  L({
    id: "torsion.solid", name: "Shear stress in a twisted round shaft", statement: "A solid round shaft carrying a torque is sheared most at its surface: 16 T over π d^3.", formula: "τ = 16 T / (π d³)",
    valid: "Elastic, solid circular section (a keyway raises it).",
    inputs: [["T", "N m", "torque"], ["d", "m", "diameter"]], output: ["tau", "Pa", "surface shear stress"],
    term: (v) => div(mul(k(16), v.T), mul(PI(), pow(v.d, 3))),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"T":50,"d":0.02}, output: 31830988.61837906 },
  }),
  L({
    id: "torsion.twist", name: "Angle of twist", statement: "A shaft twists by its torque times its length over its shear modulus times its polar moment.", formula: "θ = T L / (G J)",
    valid: "Elastic; J = π d⁴/32 for a solid round shaft.",
    inputs: [["T", "N m", "torque"], ["L", "m", "length"], ["G", "Pa", "shear modulus"], ["J", "m^4", "polar moment"]], output: ["theta", "rad", "twist"],
    term: (v) => div(mul(v.T, v.L), mul(v.G, v.J)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"T":50,"L":1,"G":79300000000,"J":1.5707963267948965e-8}, output: 0.040139960426707526 },
  }),
  L({
    id: "buckling.johnson", name: "Johnson column formula", statement: "A strut too short for Euler's formula (stockier than the transition slenderness) fails by yielding and bowing together: A [S_y − (S_y K L / r)² / (4π² E)].", formula: "P_cr = A [S_y − (S_y K L/r)² / (4π² E)]",
    valid: "Slenderness K L/r below the transition √(2π² E/S_y); r = d/4 for a round bar.",
    inputs: [["A", "m^2", "section area"], ["Sy", "Pa", "yield strength"], ["E", "Pa", "modulus"], ["K", "-", "effective length factor"], ["L", "m", "length"], ["r", "m", "radius of gyration"]], output: ["P", "N", "critical load"],
    term: (v) => mul(v.A, sub(v.Sy, div(pow(mul(v.Sy, div(mul(v.K, v.L), v.r)), 2), mul(k(4), pow(PI(), 2), v.E)))),
    domain: (v) => [{ says: 'a slenderness below the transition √(2π²E/S_y): Euler\'s formula holds past it', holds: lt(div(mul(v.K, v.L), v.r), sqrt(div(mul(k(2), pow(PI(), 2), v.E), v.Sy))) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"A":0.000050265482457436686,"Sy":370000000,"E":200000000000,"K":1,"L":0.15,"r":0.002}, output: 13695.858374663472 },
  }),
  L({
    id: "slenderness.transition", name: "Euler-Johnson transition slenderness", statement: "Struts more slender than √(2π² E/S_y) buckle elastically (Euler); stockier ones yield first (Johnson).", formula: "(K L/r)₁ = √(2π² E / S_y)",
    valid: "Pin-ended columns of ductile material.",
    inputs: [["E", "Pa", "modulus"], ["Sy", "Pa", "yield strength"]], output: ["s", "-", "transition slenderness"],
    term: (v) => sqrt(div(mul(k(2), pow(PI(), 2), v.E), v.Sy)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"E":200000000000,"Sy":370000000}, output: 103.29493015522243 },
  }),
  L({
    id: "stress.hoop", name: "Hoop stress in a thin-walled cylinder", statement: "Pressure inside a thin tube pulls its wall round the circumference at pressure times radius over wall thickness.", formula: "σ = p r / t",
    valid: "Wall under a tenth of the radius; axial stress is half this.",
    inputs: [["p", "Pa", "internal pressure"], ["r", "m", "mean radius"], ["t", "m", "wall"]], output: ["sigma", "Pa", "hoop stress"],
    term: (v) => div(mul(v.p, v.r), v.t),
    domain: (v) => [{ says: 'a thin wall: under a tenth of the radius (Lamé past it)', holds: le(v.t, div(v.r, est('thin-wall ratio', 10, '1', 'a wall under a tenth of the radius is thin'))) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"p":1000000,"r":0.05,"t":0.002}, output: 25000000 },
  }),
  L({
    id: "weld.fillet.shear", name: "Shear in a fillet weld", statement: "A fillet weld carries its load as shear on its throat: 0.707 of its leg times its length.", formula: "τ = F / (0.707 a L)",
    valid: "Equal-leg fillet, load along or across it (the throat method).",
    inputs: [["F", "N", "load"], ["a", "m", "leg"], ["L", "m", "weld length"]], output: ["tau", "Pa", "throat shear"],
    term: (v) => div(v.F, mul(k(0.707, '0.707: the throat of a 45° fillet, the book\'s rounding of 1/√2'), v.a, v.L)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"F":10000,"a":0.005,"L":0.1}, output: 28288543.140028287 },
  }),
  L({
    id: "beam.plastic-moment", name: "Plastic moment of a section", statement: "A ductile beam bent until its whole section yields carries its plastic section modulus times its yield stress: the moment at which a plastic hinge forms and it folds.", formula: "M_p = Z σ_y",
    valid: "Ductile metals, compact sections that don't buckle locally first; Z is 1.5 S for a rectangle, about 1.7 S for a solid round, 1.1 to 1.2 S for an I-beam.",
    inputs: [["Z", "m^3", "plastic section modulus"], ["Sy", "Pa", "yield stress"]], output: ["Mp", "N m", "plastic moment"],
    term: (v) => mul(v.Z, v.Sy),
    source: { cite: "AISC 360-16, Specification for Structural Steel Buildings, F2 (Mp = Fy Zx)", kind: "standard" }, example: { inputs: {"Z":0.00001,"Sy":250000000}, output: 2500 },
  }),
];
