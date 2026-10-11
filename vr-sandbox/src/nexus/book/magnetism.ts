// The book, magnetism: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST, est } from './constants';
import { mul, div, pow, sqrt, le, k, PI } from '../lang/term';

export const MAGNETISM = [
  L({
    id: "lorentz.force", name: "Lorentz force on a conductor", statement: "A conductor carrying current across a magnetic field is pushed sideways by the flux density times the current times the length in the field: how every motor, rotary or linear, makes force.", formula: "F = B I L",
    valid: "Conductor at right angles to a uniform field; a motor sums it over every conductor in its gap (K_t = B L r × conductors).",
    inputs: [["B", "T", "flux density"], ["I", "A", "current"], ["L", "m", "conductor length in the field"]], output: ["F", "N", "force"],
    term: (v) => mul(v.B, v.I, v.L),
    domain: (v) => [{ says: 'a field iron can carry: it saturates near 2 T', holds: le(v.B, est('saturation of iron', 2.2, 'T', 'iron saturates near 2 T')) }],
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"B":1,"I":10,"L":0.5}, output: 5 },
  }),
  L({
    id: "magnetic.pull", name: "Magnetic pull across a gap (Maxwell)", statement: "A magnetic field crossing a gap between iron faces pulls them together by the flux density squared times the area over twice the permeability of free space: how solenoids, relays and electromagnets pull.", formula: "F = B² A / (2 μ₀)",
    valid: "Uniform field across a small gap between flat iron faces; the field itself falls as the gap opens, so the pull falls steeply with stroke.",
    inputs: [["B", "T", "flux density in the gap"], ["A", "m^2", "pole face area"]], output: ["F", "N", "pull"],
    term: (v) => div(mul(pow(v.B, 2), v.A), mul(k(2), CONST.mu0)),
    domain: (v) => [{ says: 'a field iron can carry: it saturates near 2 T', holds: le(v.B, est('saturation of iron', 2.2, 'T', 'iron saturates near 2 T')) }],
    source: { cite: "Hughes, Electric Motors and Drives, 4th ed., Newnes 2013, ch. 1 (force on iron)", kind: "textbook" }, example: { inputs: {"B":1,"A":0.0001}, output: 39.788735751313816 },
  }),
  L({
    id: "skin.depth", name: "Skin depth", statement: "An alternating field or current reaches into a conductor only about one skin depth, shrinking with frequency and conductivity: why an eddy-current brake works at the surface, and thick copper buys nothing at high frequency.", formula: "δ = 1 / √(π f μ₀ σ)",
    valid: "Non-magnetic conductors (μr = 1); in iron it is thinner by √μr.",
    inputs: [["f", "Hz", "frequency"], ["sigma", "S/m", "conductivity"]], output: ["delta", "m", "skin depth"],
    term: (v) => div(k(1), sqrt(mul(PI(), v.f, CONST.mu0, v.sigma))),
    source: { cite: "Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017 (skin depth)", kind: "textbook" }, example: { inputs: {"f":50,"sigma":58000000}, output: 0.009345900061927292 },
  }),
  L({
    id: "ampere.law", name: "Ampère's law (a long solenoid)", statement: "A current makes a magnetic field round it; inside a long coil the field is μ₀ times the turns per length times the current.", formula: "B = μ₀ N I / L",
    valid: "Length well over the diameter, air core; an iron core multiplies it by its relative permeability until it saturates.",
    inputs: [["N", "-", "turns"], ["I", "A", "current"], ["L", "m", "coil length"]], output: ["B", "T", "field inside"],
    term: (v) => div(mul(CONST.mu0, v.N, v.I), v.L),
    source: { cite: "Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017", kind: "textbook" }, example: { inputs: {"N":100,"I":2,"L":0.1}, output: 0.0025132741228718345 },
  }),
  L({
    id: "faraday.induction", name: "Faraday's law of induction", statement: "A changing magnetic flux through a loop induces a voltage round it equal to the rate of change, times the turns: generators, transformers, inductors.", formula: "V = N A dB/dt",
    valid: "A uniform field normal to the loop.",
    inputs: [["N", "-", "turns"], ["A", "m^2", "loop area"], ["dBdt", "T/s", "rate of change of the field"]], output: ["V", "V", "induced voltage"],
    term: (v) => mul(v.N, v.A, v.dBdt),
    source: { cite: "Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017", kind: "textbook" }, example: { inputs: {"N":100,"A":0.001,"dBdt":10}, output: 1 },
  }),
];
