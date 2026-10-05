// The book, fluids: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST } from './constants';
import { add, sub, mul, div, pow, cbrt, gt, ln, log10, k } from '../term';

export const FLUIDS = [
  L({
    id: "drag.aero", name: "Aerodynamic drag", statement: "Air pushes back on a moving body with half the air density times its drag coefficient, frontal area and speed squared.", formula: "F = ½ ρ C_d A v²",
    valid: "Turbulent flow (Reynolds above about 10^4); air at 20 °C is 1.204 kg/m^3.",
    inputs: [["rho", "kg/m^3", "air density"], ["Cd", "-", "drag coefficient"], ["A", "m^2", "frontal area"], ["v", "m/s", "speed"]], output: ["F", "N", "drag"],
    term: (v) => mul(k(0.5), v.rho, v.Cd, v.A, pow(v.v, 2)),
    source: { cite: "Hoerner, Fluid-Dynamic Drag, 1965", kind: "textbook" }, example: { inputs: {"rho":1.204,"Cd":0.9,"A":0.5,"v":10}, output: 27.09 },
  }),
  L({
    id: "lift.aero", name: "Aerodynamic lift", statement: "A surface moved through a fluid is pushed across the flow by half the fluid density times its lift coefficient, planform area and speed squared; the coefficient grows with the angle of attack up to the stall.", formula: "L = ½ ρ C_L A v²",
    valid: "Below the stall angle; C_L from the section and angle (about 0.3 to 1.5 for a wing in flight).",
    inputs: [["rho", "kg/m^3", "fluid density"], ["CL", "-", "lift coefficient"], ["A", "m^2", "planform area"], ["v", "m/s", "speed"]], output: ["L", "N", "lift"],
    term: (v) => mul(k(0.5), v.rho, v.CL, v.A, pow(v.v, 2)),
    source: { cite: "Anderson, Introduction to Flight, 8th ed., McGraw-Hill 2016", kind: "textbook" }, example: { inputs: {"rho":1.225,"CL":1,"A":10,"v":50}, output: 15312.5 },
  }),
  L({
    id: "gas.isothermal-work", name: "Work in a compressed gas (isothermal)", statement: "A volume of gas at pressure p, let down slowly enough to stay at its temperature, does work of p V ln(p / p0) expanding to p0.", formula: "W = p V ln(p / p0)",
    valid: "Ideal gas, isothermal (slow) expansion; a fast (adiabatic) expansion gives less, the difference leaving as cooled gas.",
    inputs: [["p", "Pa", "stored pressure"], ["V", "m^3", "stored volume"], ["p0", "Pa", "pressure let down to"]], output: ["W", "J", "work"],
    term: (v) => mul(v.p, v.V, ln(div(v.p, v.p0))),
    domain: (v) => [{ says: 'the stored pressure exceeds what it is let down to', holds: gt(v.p, v.p0) }],
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"p":2000000,"V":0.01,"p0":100000}, output: 59914.64547107982, rel: 1e-9 },
  }),
  L({
    id: "reynolds", name: "Reynolds number", statement: "Flow is smooth (laminar) or churning (turbulent) by the ratio of inertia to viscosity: density times speed times size over viscosity.", formula: "Re = ρ v L / μ",
    valid: "Pipe flow laminar below about 2300, turbulent above about 4000.",
    inputs: [["rho", "kg/m^3", "density"], ["v", "m/s", "speed"], ["L", "m", "size"], ["mu", "Pa s", "dynamic viscosity"]], output: ["Re", "-", "Reynolds number"],
    term: (v) => div(mul(v.rho, v.v, v.L), v.mu),
    source: { cite: "White, Fluid Mechanics, 8th ed., McGraw-Hill 2016", kind: "textbook" }, example: { inputs: {"rho":1000,"v":2,"L":0.05,"mu":0.001}, output: 100000 },
  }),
  L({
    id: "darcy-weisbach", name: "Pressure drop in a pipe (Darcy-Weisbach)", statement: "Flow down a pipe loses pressure by its friction factor times length over diameter times the dynamic pressure.", formula: "Δp = f (L/D) ρ v² / 2",
    valid: "Fully developed flow; f = 64/Re laminar, from the Moody chart (Colebrook) turbulent.",
    inputs: [["f", "-", "Darcy friction factor"], ["L", "m", "length"], ["D", "m", "bore"], ["rho", "kg/m^3", "density"], ["v", "m/s", "mean speed"]], output: ["dp", "Pa", "pressure drop"],
    term: (v) => div(mul(v.f, div(v.L, v.D), v.rho, pow(v.v, 2)), k(2)),
    source: { cite: "White, Fluid Mechanics, 8th ed., McGraw-Hill 2016", kind: "textbook" }, example: { inputs: {"f":0.02,"L":10,"D":0.05,"rho":1000,"v":2}, output: 8000 },
  }),
  L({
    id: "buoyancy", name: "Archimedes' principle", statement: "A body in a fluid is pushed up by the weight of the fluid it displaces.", formula: "F = ρ g V",
    valid: "Fluid at rest.",
    inputs: [["rho", "kg/m^3", "fluid density"], ["V", "m^3", "displaced volume"]], output: ["F", "N", "buoyancy"],
    term: (v) => mul(v.rho, CONST.g, v.V),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"rho":1000,"V":0.001}, output: 9.80665 },
  }),
  L({
    id: "hydrostatic", name: "Hydrostatic pressure", statement: "Pressure in a still liquid rises with depth by its density times gravity times the depth.", formula: "p = ρ g h",
    valid: "Incompressible, at rest.",
    inputs: [["rho", "kg/m^3", "density"], ["h", "m", "depth"]], output: ["p", "Pa", "gauge pressure"],
    term: (v) => mul(v.rho, CONST.g, v.h),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"rho":1000,"h":2}, output: 19613.3 },
  }),
  L({
    id: "thrust.ideal-static", name: "Ideal static thrust of a rotor (momentum theory)", statement: "A propeller or rotor of disc area A, putting power P into still fluid of density ρ, can at most push (2 ρ A P²)^⅓: a bigger disc gives more thrust per watt.", formula: "T = (2 ρ A P²)^(1/3)",
    valid: "Ideal actuator disc, hovering or static, uniform inflow: a real propeller makes about 60 to 80% of the ideal (its figure of merit), and less as it moves forward.",
    inputs: [["rho", "kg/m^3", "fluid density"], ["A", "m^2", "disc area"], ["P", "W", "shaft power"]], output: ["T", "N", "thrust"],
    term: (v) => cbrt(mul(k(2), v.rho, v.A, pow(v.P, 2))),
    source: { cite: "Leishman, Principles of Helicopter Aerodynamics, 2nd ed., Cambridge 2006, ch. 2 (momentum theory)", kind: "textbook" }, example: { inputs: {"rho":1.225,"A":0.07068583470577035,"P":100}, output: 12.008796675640253 },
  }),
  L({
    id: "acoustic.mass-law", name: "Sound insulation of a wall (mass law)", statement: "A wall stops airborne sound mainly by its mass: about 20 log₁₀ of its mass per area times the frequency, less 47 dB. Low notes and light layers pass through.", formula: "TL ≈ 20 log₁₀(m f) − 47 dB",
    valid: "Field incidence, a single limp panel below its coincidence frequency; absorptive coatings reduce echo, not what passes through.",
    inputs: [["m", "kg/m^2", "mass per area"], ["f", "Hz", "frequency"]], output: ["TL", "dB", "transmission loss"],
    term: (v) => mul(k(20), log10(div(mul(v.m, v.f), CONST.mf0))),
    source: { cite: "Long, Architectural Acoustics, 2nd ed., Academic Press 2014 (mass law)", kind: "textbook" }, example: { inputs: {"m":460,"f":100}, output: 46.25515663363147 },
  }),
  L({
    id: "diffusion.time", name: "Time to diffuse a distance", statement: "A molecule wandering by diffusion alone covers a distance in a time that grows with its square: microns in moments, a metre in hours. Anything faster is carried by a flow.", formula: "t = x² / (2 D)",
    valid: "One-dimensional mean square displacement (Einstein); about 1e-5 m²/s for small molecules in air, 1e-9 in water.",
    inputs: [["x", "m", "distance"], ["D", "m^2/s", "diffusion coefficient"]], output: ["t", "s", "time"],
    term: (v) => div(pow(v.x, 2), mul(k(2), v.D)),
    source: { cite: "Berg, Random Walks in Biology, Princeton 1993, ch. 1", kind: "textbook" }, example: { inputs: {"x":1,"D":0.00001}, output: 50000 },
  }),
  L({
    id: "bernoulli", name: "Bernoulli's equation", statement: "Along a streamline of an ideal fluid, pressure plus kinetic plus potential energy per volume is constant: where it speeds up, the pressure falls.", formula: "p₂ = p₁ + ½ ρ (v₁² − v₂²)",
    valid: "Inviscid, incompressible, steady, same height; losses add a term (Darcy-Weisbach).",
    inputs: [["p1", "Pa", "pressure upstream"], ["rho", "kg/m^3", "density"], ["v1", "m/s", "speed upstream"], ["v2", "m/s", "speed downstream"]], output: ["p2", "Pa", "pressure downstream"],
    term: (v) => add(v.p1, mul(k(0.5), v.rho, sub(pow(v.v1, 2), pow(v.v2, 2)))),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"p1":101325,"rho":1000,"v1":1,"v2":3}, output: 97325 },
  }),
  L({
    id: "continuity", name: "Continuity equation", statement: "Mass flow in equals mass flow out of a steady volume: a pipe narrowing speeds its flow by the ratio of areas.", formula: "v₂ = v₁ A₁ / A₂",
    valid: "Incompressible, steady.",
    inputs: [["v1", "m/s", "speed upstream"], ["A1", "m^2", "area upstream"], ["A2", "m^2", "area downstream"]], output: ["v2", "m/s", "speed downstream"],
    term: (v) => div(mul(v.v1, v.A1), v.A2),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"v1":1,"A1":0.01,"A2":0.0025}, output: 4 },
  }),
];
