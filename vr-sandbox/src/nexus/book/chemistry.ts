// The book, chemistry: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST } from './constants';
import { add, sub, mul, div, neg, exp, ln } from '../lang/term';

export const CHEMISTRY = [
  L({
    id: "fick.diffusion", name: "Fick's law of diffusion", statement: "Flux is proportional to the concentration gradient; a distance L takes a time of order L²/D.", formula: "J = D ΔC / L",
    valid: "Steady, dilute, one dimension; D of ions in water about 10^-9 m²/s, of carbon in hot iron 10^-11.",
    inputs: [["D", "m^2/s", "diffusivity"], ["dC", "mol/m^3", "concentration difference"], ["L", "m", "distance"]], output: ["J", "mol/m^2 s", "flux"],
    term: (v) => div(mul(v.D, v.dC), v.L),
    source: { cite: "Atkins, de Paula & Keeler, Atkins' Physical Chemistry, 11th ed., Oxford 2018", kind: "textbook" }, example: { inputs: {"D":1e-9,"dC":100,"L":0.001}, output: 0.0001 },
  }),
  L({
    id: "nernst", name: "Nernst equation", statement: "An electrode's potential shifts from its standard value by (RT/zF) ln of the reaction quotient: cell voltages, membrane potentials, corrosion.", formula: "E = E⁰ − (R T / z F) ln Q",
    valid: "Activities as concentrations (dilute); z whole.",
    inputs: [["E0", "V", "standard potential"], ["T", "K", "temperature"], ["z", "-", "electrons transferred"], ["Q", "-", "reaction quotient"]], output: ["E", "V", "potential"],
    term: (v) => sub(v.E0, mul(div(mul(CONST.R, v.T), mul(v.z, CONST.F)), ln(v.Q))),
    source: { cite: "Atkins, de Paula & Keeler, Atkins' Physical Chemistry, 11th ed., Oxford 2018", kind: "textbook" }, example: { inputs: {"E0":1.1,"T":298.15,"z":2,"Q":10}, output: 1.0704203251571394 },
  }),
  L({
    id: "gibbs.energy", name: "Gibbs free energy", statement: "A reaction goes forward when G falls: enthalpy minus temperature times entropy; its minimum is equilibrium.", formula: "ΔG = ΔH − T ΔS",
    valid: "Constant temperature and pressure.",
    inputs: [["dH", "J/mol", "enthalpy change"], ["T", "K", "temperature"], ["dS", "J/mol K", "entropy change"]], output: ["dG", "J/mol", "free energy change"],
    term: (v) => sub(v.dH, mul(v.T, v.dS)),
    source: { cite: "Atkins, de Paula & Keeler, Atkins' Physical Chemistry, 11th ed., Oxford 2018", kind: "textbook" }, example: { inputs: {"dH":-92000,"T":298.15,"dS":-199}, output: -32668.15 },
  }),
  L({
    id: "michaelis-menten", name: "Michaelis-Menten kinetics", statement: "An enzyme's rate rises with substrate and saturates at its maximum; at the Michaelis constant it runs at half.", formula: "v = V_max S / (K_m + S)",
    valid: "A single substrate, steady state, enzyme far below substrate.",
    inputs: [["Vmax", "mol/m^3 s", "maximum rate"], ["S", "mol/m^3", "substrate concentration"], ["Km", "mol/m^3", "Michaelis constant"]], output: ["v", "mol/m^3 s", "rate"],
    term: (v) => div(mul(v.Vmax, v.S), add(v.Km, v.S)),
    source: { cite: "Atkins, de Paula & Keeler, Atkins' Physical Chemistry, 11th ed., Oxford 2018", kind: "textbook" }, example: { inputs: {"Vmax":1,"S":2,"Km":1}, output: 0.6666666666666666 },
  }),
  L({
    id: "faraday.electrolysis", name: "Faraday's laws of electrolysis", statement: "The mass deposited or dissolved is the charge passed times the molar mass over the electrons per ion and the Faraday constant: plating, refining, batteries.", formula: "m = M I t / (z F)",
    valid: "At the current efficiency of the bath (100 % here).",
    inputs: [["M", "kg/mol", "molar mass"], ["I", "A", "current"], ["t", "s", "time"], ["z", "-", "electrons per ion"]], output: ["m", "kg", "mass"],
    term: (v) => div(mul(v.M, v.I, v.t), mul(v.z, CONST.F)),
    source: { cite: "Bard & Faulkner, Electrochemical Methods, 2nd ed., Wiley 2001", kind: "textbook" }, example: { inputs: {"M":0.06355,"I":2,"t":3600,"z":2}, output: 0.0023711376120410035 },
  }),
  L({
    id: "butler-volmer", name: "Butler-Volmer equation", statement: "Electrode current rises exponentially with overpotential in both directions, by the transfer coefficients over the thermal voltage R T / F (25.7 mV at 25 °C): why a cell's voltage sags under load.", formula: "i = i₀ (e^(α_a η / V_T) − e^(−α_c η / V_T))",
    valid: "Kinetics only, before mass transport limits the current; V_T = R T / F, 25.7 mV at 25 °C.",
    inputs: [["i0", "A/m^2", "exchange current density"], ["eta", "V", "overpotential"], ["Vt", "V", "thermal voltage R T / F"], ["alphaA", "-", "anodic transfer coefficient"], ["alphaC", "-", "cathodic transfer coefficient"]], output: ["i", "A/m^2", "current density"],
    term: (v) => mul(v.i0, sub(exp(div(mul(v.alphaA, v.eta), v.Vt)), exp(neg(div(mul(v.alphaC, v.eta), v.Vt))))),
    source: { cite: "Bard & Faulkner, Electrochemical Methods, 2nd ed., Wiley 2001", kind: "textbook" }, example: { inputs: {"i0":1,"eta":0.1,"Vt":0.025692579121493725,"alphaA":0.5,"alphaC":0.5}, output: 6.85840779126327 },
  }),
];
