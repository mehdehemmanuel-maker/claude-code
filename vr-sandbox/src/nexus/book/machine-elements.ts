// The book, machine elements: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST, est } from './constants';
import { add, sub, mul, div, pow, sqrt, cbrt, le, ge, and, exp, ln, cos, tan, atan, k, PI } from '../substrate/term';

export const MACHINE_ELEMENTS = [
  L({
    id: "shaft.diameter.static", name: "Shaft diameter for bending and torque (static)", statement: "A solid shaft carrying moment M and torque T needs a diameter of [16 n / (π S_y) · root(4 M^2 + 3 T^2)]^(1/3) for a safety factor n against yield.", formula: "d = [16 n √(4M² + 3T²) / (π S_y)]^(1/3)",
    valid: "Steady loads (distortion energy); a rotating shaft also needs a fatigue check.",
    inputs: [["M", "N m", "bending moment"], ["T", "N m", "torque"], ["n", "-", "safety factor"], ["Sy", "Pa", "yield strength"]], output: ["d", "m", "least diameter"],
    term: (v) => cbrt(mul(div(mul(k(16), v.n), mul(PI(), v.Sy)), sqrt(add(mul(k(4), pow(v.M, 2)), mul(k(3), pow(v.T, 2)))))),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"M":30,"T":20,"n":2,"Sy":370000000}, output: 0.012401465232986781 },
  }),
  L({
    id: "bearing.life.l10", name: "Bearing rating life (L10)", statement: "Ninety per cent of a group of identical bearings outlast (C/P)^p million revolutions: p = 3 for ball bearings, 10/3 for roller bearings.", formula: "L10 = (C / P)^p × 10⁶ rev",
    valid: "Clean, well-lubricated bearings at normal temperature (ISO 281 basic rating life; a modified life a_ISO adjusts it).",
    inputs: [["C", "N", "basic dynamic load rating"], ["P", "N", "equivalent dynamic load"], ["p", "-", "life exponent"]], output: ["L", "rev", "rating life"],
    term: (v) => mul(exp(mul(v.p, ln(div(v.C, v.P)))), k(1e6), CONST.REV),
    domain: (v) => [{ says: 'the load is within half the dynamic rating, where rating life is used', holds: le(v.P, mul(k(0.5), v.C)) }],
    source: { cite: "ISO 281:2007 Rolling bearings — Dynamic load ratings and rating life", kind: "standard" }, example: { inputs: {"C":14.8,"P":1,"p":3}, output: 3241792000 },
  }),
  L({
    id: "bearing.life.hours", name: "Bearing life in hours", statement: "A rating life in revolutions, turned at n rpm, lasts L10 / (60 n) hours.", formula: "L10h = L10 / (60 n)",
    valid: "Constant speed.",
    inputs: [["L", "rev", "rating life"], ["n", "rpm", "speed"]], output: ["h", "h", "rating life"],
    term: (v) => div(v.L, v.n),
    source: { cite: "ISO 281:2007 Rolling bearings — Dynamic load ratings and rating life", kind: "standard" }, example: { inputs: {"L":3241792000,"n":600}, output: 90049.7777777778 },
  }),
  L({
    id: "spring.rate", name: "Helical spring rate", statement: "A coil spring's rate is G d^4 over 8 D^3 n: wire diameter d, coil diameter D, n active coils.", formula: "k = G d⁴ / (8 D³ n)",
    valid: "Close-coiled helical springs, spring index 4 to 12.",
    inputs: [["G", "Pa", "shear modulus"], ["d", "m", "wire diameter"], ["D", "m", "mean coil diameter"], ["n", "-", "active coils"]], output: ["k", "N/m", "rate"],
    term: (v) => div(mul(v.G, pow(v.d, 4)), mul(k(8), pow(v.D, 3), v.n)),
    domain: (v) => [{ says: 'a spring index D/d between 4 and 12: below it a coil is hard to wind, above it the spring buckles and tangles', holds: and(ge(div(v.D, v.d), est('least spring index', 4, '1', 'below it a coil is hard to wind')), le(div(v.D, v.d), est('greatest spring index', 12, '1', 'above it the spring buckles and tangles'))) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"G":79300000000,"d":0.005,"D":0.04,"n":8}, output: 12100.219726562498 },
  }),
  L({
    id: "capstan", name: "Capstan (belt friction) equation", statement: "A rope or belt wrapped round a drum holds a tension ratio of e^(μ θ) between its ends before slipping.", formula: "T₁ / T₂ = e^(μ θ)",
    valid: "Flat belt or rope, no bending stiffness; a V-belt's grip is larger by 1/sin(half its groove angle).",
    inputs: [["mu", "-", "friction coefficient"], ["theta", "rad", "wrap angle"]], output: ["r", "-", "tension ratio"],
    term: (v) => exp(mul(v.mu, v.theta)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"mu":0.3,"theta":3.141592653589793}, output: 2.566332395208135 },
  }),
  L({
    id: "chain.speed", name: "Chain speed", statement: "A chain moves at the sprocket's teeth times the pitch times its revolutions per second.", formula: "v = z p n / 60",
    valid: "Average speed (it varies by chordal action, more with few teeth).",
    inputs: [["z", "-", "sprocket teeth"], ["p", "m", "pitch"], ["n", "rpm", "speed"]], output: ["v", "m/s", "chain speed"],
    term: (v) => div(mul(v.z, v.p, v.n), mul(k(2), PI())),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"z":12,"p":0.0127,"n":1000}, output: 2.54 },
  }),
  L({
    id: "chain.pull", name: "Chain pull", statement: "A chain carrying power P at speed v is pulled at P over v on its tight side.", formula: "F = P / v",
    valid: "Steady load; shocks need a service factor.",
    inputs: [["P", "W", "power"], ["v", "m/s", "chain speed"]], output: ["F", "N", "tight-side pull"],
    term: (v) => div(v.P, v.v),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"P":150,"v":2.54}, output: 59.05511811023623 },
  }),
  L({
    id: "gear.output.torque", name: "Torque through a gear train", statement: "A gear train multiplies torque by its ratio, less its losses.", formula: "T_out = T_in i η",
    valid: "Driving forward; driven backwards the losses go the other way (T_in = T_out η / i).",
    inputs: [["T", "N m", "input torque"], ["i", "-", "ratio"], ["eta", "-", "efficiency"]], output: ["Tout", "N m", "output torque"],
    term: (v) => mul(v.T, v.i, v.eta),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"T":0.6,"i":12,"eta":0.81}, output: 5.832 },
  }),
  L({
    id: "bolt.torque.nut-factor", name: "Bolt tightening torque (nut factor)", statement: "Tightening a bolt to a preload takes about a nut factor (0.2 dry steel) times the preload times its diameter.", formula: "T = K F d",
    valid: "Quick estimate; the world uses VDI 2230 (thread and head friction separately).",
    inputs: [["K", "-", "nut factor"], ["F", "N", "preload"], ["d", "m", "nominal diameter"]], output: ["T", "N m", "wrench torque"],
    term: (v) => mul(v.K, v.F, v.d),
    domain: (v) => [{ says: 'a nut factor between 0.1 (lubricated) and 0.35 (dry, rough)', holds: and(ge(v.K, est('nut factor, lubricated', 0.1, '1', 'the least friction a thread sees')), le(v.K, est('nut factor, dry and rough', 0.35, '1', 'the most'))) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"K":0.2,"F":10000,"d":0.008}, output: 16 },
  }),
  L({
    id: "belt.speed", name: "Belt or rim speed", statement: "A pulley's rim moves at pi times its diameter times its revolutions per second.", formula: "v = π D n / 60",
    valid: "No slip.",
    inputs: [["D", "m", "diameter"], ["n", "rpm", "speed"]], output: ["v", "m/s", "rim speed"],
    term: (v) => div(mul(v.D, v.n), k(2)),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"D":0.1,"n":1500}, output: 7.853981633974483 },
  }),
  L({
    id: "screw.force", name: "Force from a power screw", statement: "A screw turned with a torque pushes its nut along by 2π times its efficiency times the torque over its lead.", formula: "F = 2π η T / l",
    valid: "Acme or trapezoidal lead screws η about 0.2 to 0.5 (below about 0.5 they hold their load without a brake); ball screws about 0.9.",
    inputs: [["T", "N m", "torque"], ["eta", "-", "efficiency"], ["l", "m", "lead"]], output: ["F", "N", "axial force"],
    term: (v) => div(mul(k(2), PI(), v.eta, v.T), v.l),
    domain: (v) => [{ says: 'an efficiency no better than a ball screw\'s (about 0.9)', holds: le(v.eta, est('efficiency of a ball screw', 0.95, '1', 'about 0.9 for a ball screw')) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"T":1,"eta":0.3,"l":0.002}, output: 942.4777960769379 },
  }),
  L({
    id: "gear.lewis", name: "Gear tooth bending stress (Lewis)", statement: "A gear tooth, a cantilever loaded at its tip by the force between the gears, is stressed at its root by that tangential force over its face width, its module and its Lewis form factor.", formula: "σ = W_t / (b m Y)",
    valid: "Root bending only, one tooth carrying the load, 20° full-depth teeth (Y from Shigley Table 14-2); AGMA adds dynamic, size and surface (pitting) factors.",
    inputs: [["Wt", "N", "tangential load"], ["b", "m", "face width"], ["m", "m", "module"], ["Y", "-", "Lewis form factor"]], output: ["sigma", "Pa", "root bending stress"],
    term: (v) => div(v.Wt, mul(v.b, v.m, v.Y)),
    domain: (v) => [{ says: 'a face width of 8 to 16 modules', holds: and(ge(div(v.b, v.m), est('least face width', 8, '1', 'in modules')), le(div(v.b, v.m), est('greatest face width', 16, '1', 'in modules'))) }],
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"Wt":1000,"b":0.02,"m":0.002,"Y":0.322}, output: 77639751.55279502 },
  }),
  L({
    id: "spring.torsion.rate", name: "Helical torsion spring rate", statement: "A helical torsion spring's rate is its wire diameter to the fourth times its modulus over 10.8 times its coil diameter times its turns, per turn; per radian, over 2π more.", formula: "k' = d⁴ E / (10.8 D N) per turn",
    valid: "Shigley eq. 10-51: 10.8 in place of the ideal 10.2 for friction between the coils.",
    inputs: [["d", "m", "wire diameter"], ["D", "m", "mean coil diameter"], ["N", "-", "active turns"], ["E", "Pa", "modulus"]], output: ["k", "N m/rad", "rate"],
    term: (v) => div(mul(pow(v.d, 4), v.E), mul(k(10.8, '10.8: Shigley eq. 10-51, in place of the ideal 10.2, for friction between the coils'), v.D, v.N, k(2), PI())),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"d":0.002,"D":0.02,"N":5,"E":200000000000}, output: 0.471570201753764 },
  }),
  L({
    id: "screw.efficiency", name: "Efficiency of a power screw", statement: "A screw's thread is a ramp wrapped round it: the steeper the ramp against its friction, the more of the torque becomes push. Below about half, it holds its load without a brake.", formula: "η = tan λ / tan(λ + atan(μ / cos α)), tan λ = l / (π d₂)",
    valid: "Raising the load; trapezoidal threads have α = 15°, square threads 0. Collar friction, if the screw bears on one, is extra.",
    inputs: [["l", "m", "lead"], ["d2", "m", "pitch diameter"], ["mu", "-", "friction coefficient"], ["alpha", "rad", "thread half-angle"]], output: ["eta", "-", "efficiency"],
    term: (v) => div(tan(atan(div(v.l, mul(PI(), v.d2)))), tan(add(atan(div(v.l, mul(PI(), v.d2))), atan(div(v.mu, cos(v.alpha)))))),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, §8-2 (power screws)", kind: "textbook" }, example: { inputs: {"l":0.004,"d2":0.014,"mu":0.1,"alpha":0.2617993877991494}, output: 0.46324813129085995 },
  }),
  L({
    id: "hertz.contact", name: "Hertzian contact (a sphere on a flat)", statement: "Two curved elastic bodies pressed together touch over a small area with a peak pressure that rises as the cube root of the load.", formula: "p₀ = (6 F E*² / (π³ R²))^⅓",
    valid: "Elastic, frictionless, contact small against the radius; E* = 1 / ((1 − ν₁²)/E₁ + (1 − ν₂²)/E₂), about 1.1 × 10¹¹ Pa for steel on steel.",
    inputs: [["F", "N", "load"], ["Estar", "Pa", "contact modulus"], ["R", "m", "sphere radius"]], output: ["p0", "Pa", "peak contact pressure"],
    term: (v) => cbrt(div(mul(k(6), v.F, pow(v.Estar, 2)), mul(pow(PI(), 3), pow(v.R, 2)))),
    source: { cite: "Budynas & Nisbett, Shigley's Mechanical Engineering Design, 10th ed., McGraw-Hill 2015", kind: "textbook" }, example: { inputs: {"F":100,"Estar":110000000000,"R":0.005}, output: 2107895117.920457 },
  }),
  L({
    id: "grubler", name: "Gruebler's equation (planar)", statement: "A planar mechanism's degrees of freedom are three per moving link less two per full joint and one per half joint.", formula: "M = 3 (n − 1) − 2 j₁ − j₂",
    valid: "Planar; a four-bar linkage (n = 4, j₁ = 4) has one.",
    inputs: [["n", "-", "links, the ground among them"], ["j1", "-", "full joints (pins, sliders)"], ["j2", "-", "half joints (cam, gear contacts)"]], output: ["M", "-", "degrees of freedom"],
    term: (v) => sub(sub(mul(k(3), sub(v.n, k(1))), mul(k(2), v.j1)), v.j2),
    source: { cite: "Norton, Design of Machinery, 6th ed., McGraw-Hill 2020 (Gruebler's equation)", kind: "textbook" }, example: { inputs: {"n":4,"j1":4,"j2":0}, output: 1 },
  }),
];
