// The book, materials: the kept laws as terms (closures in src/ganglia/laws.ts until docs/REALITY.md step 3). Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST, est } from './constants';
import { add, sub, mul, div, pow, sqrt, min, max, le, ge, lt, gt, and, acos, k, PI } from '../term';

export const MATERIALS = [
  L({
    id: "hooke", name: "Hooke's law", statement: "Below yield, stress is the elastic modulus times strain.", formula: "σ = E ε",
    valid: "Linear elastic range (below the proportional limit).",
    inputs: [["E", "Pa", "elastic modulus"], ["eps", "-", "strain"]], output: ["sigma", "Pa", "stress"],
    term: (v) => mul(v.E, v.eps),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"E":200000000000,"eps":0.001}, output: 200000000 },
  }),
  L({
    id: "bar.axial-stiffness", name: "Axial stiffness of a bar", statement: "A bar pulled or pushed along its length gives by the force times its length over its modulus and its section, so its stiffness is E A over L: Hooke's law over the whole bar.", formula: "k = E A / L",
    valid: "Linear elastic range; a uniform bar loaded along its axis, not buckled.",
    inputs: [["E", "Pa", "elastic modulus"], ["A", "m^2", "section"], ["L", "m", "length"]], output: ["k", "N/m", "stiffness"],
    term: (v) => div(mul(v.E, v.A), v.L),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, eq. 4-4", kind: "textbook" }, example: { inputs: {"E":200000000000,"A":0.0001,"L":1}, output: 20000000 },
  }),
  // (what a frame's beams are made of, each from the book: Frame analysis reads every section and stiffness through these)
  L({
    id: "section.circle.area", name: "Area of a circle", statement: "A round section of radius r has area π r².", formula: "A = π r²",
    valid: "A solid round section.", inputs: [["r", "m", "radius"]], output: ["A", "m^2", "area"],
    term: (v) => mul(PI(), pow(v.r, 2)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, table A-18", kind: "textbook" }, example: { inputs: { r: 0.01 }, output: 0.0003141592653589793 },
  }),
  L({
    id: "section.circle.second-moment", name: "Second moment of a circle", statement: "About any diameter a solid round section has second moment π r⁴ / 4.", formula: "I = π r⁴ / 4",
    valid: "A solid round section.", inputs: [["r", "m", "radius"]], output: ["I", "m^4", "second moment"],
    term: (v) => div(mul(PI(), pow(v.r, 4)), k(4)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, table A-18", kind: "textbook" }, example: { inputs: { r: 0.01 }, output: 7.853981633974483e-09 },
  }),
  L({
    id: "section.circle.polar-moment", name: "Polar moment of a circle", statement: "About its axis a solid round section has polar moment π r⁴ / 2, which is also its torsion constant.", formula: "J = π r⁴ / 2",
    valid: "A solid round section.", inputs: [["r", "m", "radius"]], output: ["J", "m^4", "polar moment"],
    term: (v) => div(mul(PI(), pow(v.r, 4)), k(2)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, table A-18", kind: "textbook" }, example: { inputs: { r: 0.01 }, output: 1.5707963267948965e-08 },
  }),
  L({
    id: "section.rect.torsion-constant", name: "Torsion constant of a rectangle", statement: "A solid rectangle twisted resists as its torsion constant, a c³ (1/3 − 0.21 (c/a)(1 − c⁴ / 12 a⁴)), a its longer side and c its shorter: less than its polar moment, as its corners carry little.", formula: "J = a c³ (1/3 − 0.21 (c/a)(1 − c⁴/(12 a⁴)))",
    valid: "A solid rectangle, a ≥ c; within about 4 % of the exact series.", inputs: [["a", "m", "longer side"], ["c", "m", "shorter side"]], output: ["J", "m^4", "torsion constant"],
    term: (v) => mul(mul(v.a, pow(v.c, 3)), sub(k(1 / 3), mul(mul(k(0.21), div(v.c, v.a)), sub(k(1), div(pow(v.c, 4), mul(k(12), pow(v.a, 4))))))),
    domain: (v) => [{ says: "its longer side given as a", holds: ge(v.a, v.c) }],
    source: { cite: "Young & Budynas, Roark's Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002, table 10.7 (solid rectangular section)", kind: "textbook" }, example: { inputs: { a: 0.04, c: 0.02 }, output: 7.324166666666669e-08, rel: 1e-12 },
  }),
  L({
    id: "shaft.torsional-stiffness", name: "Torsional stiffness of a bar", statement: "A uniform bar twisted turns by the torque times its length over G J, so its stiffness in twist is G J over L.", formula: "k = G J / L",
    valid: "Linear elastic; a uniform bar twisted about its axis, its ends free to warp.", inputs: [["G", "Pa", "shear modulus"], ["J", "m^4", "torsion constant"], ["L", "m", "length"]], output: ["k", "N m", "stiffness in twist, per radian"],
    term: (v) => div(mul(v.G, v.J), v.L),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, ch. 4 (torsion)", kind: "textbook" }, example: { inputs: { G: 80e9, J: 1e-8, L: 1 }, output: 800 },
  }),
  L({
    id: "beam.flexural-stiffness", name: "Flexural stiffness of a beam", statement: "A uniform beam bent between its two ends resists as E I over L: each of its end stiffnesses is a whole multiple of it, 4 E I/L and 2 E I/L turning, 6 E I/L² and 12 E I/L³ across.", formula: "k = E I / L",
    valid: "Linear elastic, small movements, slender (shear left out: Euler and Bernoulli).", inputs: [["E", "Pa", "elastic modulus"], ["I", "m^4", "second moment"], ["L", "m", "length"]], output: ["k", "N m", "flexural stiffness"],
    term: (v) => div(mul(v.E, v.I), v.L),
    source: { cite: "Przemieniecki, Theory of Matrix Structural Analysis, McGraw-Hill 1968, ch. 5 (the beam element's stiffness)", kind: "textbook" }, example: { inputs: { E: 200e9, I: 1e-8, L: 1 }, output: 2000 },
  }),
  L({
    id: "stress.von-mises", name: "Von Mises stress", statement: "A ductile metal under bending and twisting together yields when root(σ^2 + 3 τ^2) reaches its yield strength.", formula: "σ' = √(σ² + 3τ²)",
    valid: "Ductile materials (distortion-energy theory); brittle ones need another criterion.",
    inputs: [["sigma", "Pa", "normal stress"], ["tau", "Pa", "shear stress"]], output: ["s", "Pa", "equivalent stress"],
    term: (v) => sqrt(add(pow(v.sigma, 2), mul(k(3), pow(v.tau, 2)))),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"sigma":100000000,"tau":50000000}, output: 132287565.55322953 },
  }),
  L({
    id: "thermal.expansion", name: "Thermal expansion", statement: "A part grows by its expansion coefficient times its length times its temperature rise.", formula: "ΔL = α L ΔT",
    valid: "Moderate temperature changes (α itself varies with temperature).",
    inputs: [["alpha", "1/K", "expansion coefficient"], ["L", "m", "length"], ["dT", "K", "temperature rise"]], output: ["dL", "m", "growth"],
    term: (v) => mul(v.alpha, v.L, v.dT),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"alpha":0.0000236,"L":1,"dT":50}, output: 0.00118 },
  }),
  L({
    id: "fatigue.endurance.steel", name: "Endurance limit of steel", statement: "A polished steel test bar survives endless reversed bending below about half its tensile strength (700 MPa at most).", formula: "S_e' = 0.5 S_ut (S_ut ≤ 1400 MPa)",
    valid: "Steels, polished specimen: a real part takes surface, size, load and reliability factors (Marin) below it.",
    inputs: [["Sut", "Pa", "tensile strength"]], output: ["Se", "Pa", "rotating-beam endurance limit"],
    term: (v) => min(mul(k(0.5), v.Sut), CONST.SeMax),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"Sut":440000000}, output: 220000000 },
  }),
  L({
    id: "composite.rule-of-mixtures", name: "Rule of mixtures (along the fibre)", statement: "Loaded along its fibres, a composite is as stiff as its fibre and matrix in proportion to how much of each it holds.", formula: "E₁ = V_f E_f + (1 − V_f) E_m",
    valid: "Continuous, aligned, well-bonded fibre (Voigt bound); printed parts hold fibre only in some layers, so the part's V_f is the fibre's share of the whole.",
    inputs: [["Vf", "-", "fibre volume fraction"], ["Ef", "Pa", "fibre modulus"], ["Em", "Pa", "matrix modulus"]], output: ["E", "Pa", "longitudinal modulus"],
    term: (v) => add(mul(v.Vf, v.Ef), mul(sub(k(1), v.Vf), v.Em)),
    domain: (v) => [{ says: 'a fibre fraction between 0 and about 0.7 (what can be packed)', holds: and(ge(v.Vf, k(0)), le(v.Vf, est('greatest fibre fraction', 0.7, '1', 'the most fibre that can be packed'))) }],
    source: { cite: "Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996", kind: "textbook" }, example: { inputs: {"Vf":0.3,"Ef":60000000000,"Em":2400000000}, output: 19680000000 },
  }),
  L({
    id: "composite.transverse", name: "Inverse rule of mixtures (across the fibre)", statement: "Loaded across its fibres, a composite is barely stiffer than its matrix: fibre and matrix act in series.", formula: "1/E₂ = V_f/E_f + (1 − V_f)/E_m",
    valid: "A lower (Reuss) bound; carbon fibre is itself much less stiff across than along, which lowers it further.",
    inputs: [["Vf", "-", "fibre volume fraction"], ["Ef", "Pa", "fibre modulus (transverse)"], ["Em", "Pa", "matrix modulus"]], output: ["E", "Pa", "transverse modulus"],
    term: (v) => div(k(1), add(div(v.Vf, v.Ef), div(sub(k(1), v.Vf), v.Em))),
    domain: (v) => [{ says: 'a fibre fraction between 0 and about 0.7 (what can be packed)', holds: and(ge(v.Vf, k(0)), le(v.Vf, est('greatest fibre fraction', 0.7, '1', 'the most fibre that can be packed'))) }],
    source: { cite: "Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996", kind: "textbook" }, example: { inputs: {"Vf":0.3,"Ef":60000000000,"Em":2400000000}, output: 3370786516.853933 },
  }),
  L({
    id: "sinter.scale", name: "Scale-up for sintering shrinkage", statement: "A part that shrinks by a fraction s as it sinters is printed 1/(1 − s) times its final size.", formula: "k = 1 / (1 − s)",
    valid: "Uniform shrinkage (gravity and friction on the setter make it slightly uneven in practice).",
    inputs: [["s", "-", "linear sintering shrinkage"]], output: ["k", "-", "print scale"],
    term: (v) => div(k(1), sub(k(1), v.s)),
    domain: (v) => [{ says: 'a shrinkage in (0, 0.4): sintered metal shrinks about 0.1 to 0.25', holds: and(gt(v.s, k(0)), lt(v.s, est('greatest sinter shrinkage', 0.4, '1', 'beyond any sintered metal\'s'))) }],
    source: { cite: "German, Sintering: From Empirical Observations to Scientific Principles, Elsevier 2014", kind: "textbook" }, example: { inputs: {"s":0.167}, output: 1.2004801920768309 },
  }),
  L({
    id: "piezo.stroke", name: "Piezo stack stroke", statement: "A stack of piezoelectric layers grows by the number of layers times its charge constant times the voltage on each: micrometres, with great force.", formula: "ΔL = n d₃₃ V",
    valid: "Free stroke (no load); held still it pushes its blocked force instead. PZT d33 about 300 to 600 pm/V.",
    inputs: [["n", "-", "layers"], ["d33", "m/V", "piezoelectric charge constant"], ["V", "V", "voltage per layer"]], output: ["dL", "m", "free stroke"],
    term: (v) => mul(v.n, v.d33, v.V),
    domain: (v) => [{ says: 'a d33 no larger than the softest PZT\'s (about 600 pm/V)', holds: le(v.d33, est('d33 of the softest PZT', 1e-9, 'm/V', 'about 600 pm/V for soft PZT')) }],
    source: { cite: "Uchino, Piezoelectric Actuators and Ultrasonic Motors, Kluwer 1997", kind: "textbook" }, example: { inputs: {"n":100,"d33":5e-10,"V":100}, output: 0.000005 },
  }),
  L({
    id: "young.contact", name: "Contact angle (Young)", statement: "A drop on a flat surface settles at the angle where its surface tensions balance: water beads (above 90°) only on surfaces of low energy.", formula: "cos θ = (γ_sv − γ_sl) / γ_lv",
    valid: "Ideally flat, clean, rigid surfaces; no flat surface beads water much past 120° (fluorinated): beyond that takes roughness (the lotus effect), which wears away.",
    inputs: [["gsv", "J/m^2", "solid-vapour surface energy"], ["gsl", "J/m^2", "solid-liquid surface energy"], ["glv", "J/m^2", "liquid surface tension"]], output: ["theta", "rad", "contact angle"],
    term: (v) => acos(max(k(-1), min(k(1), div(sub(v.gsv, v.gsl), v.glv)))),
    source: { cite: "de Gennes, Brochard-Wyart & Quéré, Capillarity and Wetting Phenomena, Springer 2004", kind: "textbook" }, example: { inputs: {"gsv":0.02,"gsl":0.04,"glv":0.072}, output: 1.8522764000257415 },
  }),
  L({
    id: "carbonation.capacity", name: "Carbon dioxide a lime can hold", statement: "Calcium oxide takes up carbon dioxide to become calcium carbonate, one molecule for one: at most the ratio of their molar masses, 0.785 kg of CO₂ per kg of lime, and then no more.", formula: "m_CO₂ = m_CaO × M_CO₂ / M_CaO",
    valid: "Full carbonation; concrete carbonates only from its surface inward, over years, and holds only what its calcium allows.",
    inputs: [["m", "kg", "calcium oxide"]], output: ["mCO2", "kg", "CO₂ held for good"],
    term: (v) => mul(v.m, div(CONST.MCO2, CONST.MCaO)),
    source: { cite: "CaO + CO₂ → CaCO₃ (stoichiometry; IUPAC atomic weights)", kind: "textbook" }, example: { inputs: {"m":1}, output: 0.7847959056297591 },
  }),
  L({
    id: "griffith", name: "Griffith criterion", statement: "A crack grows when the energy released exceeds the surface energy made: brittle strength falls with the square root of flaw size.", formula: "σ_f = √(2 E γ / (π a))",
    valid: "Brittle (no plastic zone); for a ductile material γ becomes the plastic work per area, a thousand times more.",
    inputs: [["E", "Pa", "Young's modulus"], ["gamma", "J/m^2", "surface energy"], ["a", "m", "crack length"]], output: ["sigma", "Pa", "fracture stress"],
    term: (v) => sqrt(div(mul(k(2), v.E, v.gamma), mul(PI(), v.a))),
    source: { cite: "Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018", kind: "textbook" }, example: { inputs: {"E":70000000000,"gamma":1,"a":0.000001}, output: 211100412.28223762 },
  }),
  L({
    id: "hall-petch", name: "Hall-Petch relation", statement: "Yield strength rises with the inverse square root of grain size: fine grains are strong.", formula: "σ_y = σ₀ + k_y d^−½",
    valid: "Grains from about 100 nm to a millimetre; below that the trend reverses.",
    inputs: [["sigma0", "Pa", "friction stress"], ["ky", "Pa m^0.5", "Hall-Petch coefficient"], ["d", "m", "grain size"]], output: ["sigma", "Pa", "yield strength"],
    term: (v) => add(v.sigma0, mul(v.ky, pow(v.d, -0.5))),
    source: { cite: "Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018", kind: "textbook" }, example: { inputs: {"sigma0":70000000,"ky":740000,"d":0.000025}, output: 218000000 },
  }),
];
