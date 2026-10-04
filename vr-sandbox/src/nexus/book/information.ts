// The book, information: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST, est } from './constants';
import { add, mul, div, le, ge, lt, and, ln, log2, k, PI } from '../term';

export const INFORMATION = [
  L({
    id: "landauer", name: "Landauer's limit", statement: "Erasing one bit of information, in anything that computes, releases at least Boltzmann's constant times the temperature times ln 2 as heat: the floor under every computer.", formula: "E = k T ln 2",
    valid: "Any computer that erases information (logically irreversible); reversible computing can in principle go below it per operation.",
    inputs: [["T", "K", "temperature"]], output: ["E", "J", "least energy per bit erased"],
    term: (v) => mul(CONST.kB, v.T, ln(k(2))),
    source: { cite: "Landauer, Irreversibility and heat generation in the computing process, IBM J. Res. Dev. 5(3), 1961", kind: "textbook" }, example: { inputs: {"T":300}, output: 2.870978885078724e-21 },
  }),
  L({
    id: "information.choices", name: "Information in a choice", statement: "Picking one of N equally likely things takes the base-2 logarithm of N bits: no code can say which in fewer (Shannon).", formula: "H = log₂ N",
    valid: "Equally likely choices; uneven ones carry less (H = −Σ p log₂ p).",
    inputs: [["N", "-", "number of choices"]], output: ["H", "-", "information (bits)"],
    term: (v) => log2(v.N),
    domain: (v) => [{ says: 'at least one choice', holds: ge(v.N, k(1)) }],
    source: { cite: "Shannon, A Mathematical Theory of Communication, Bell System Technical Journal 27, 1948", kind: "textbook" }, example: { inputs: {"N":1024}, output: 10 },
  }),
  L({
    id: "rayleigh.resolution", name: "Resolution of optical lithography (Rayleigh)", statement: "The smallest half-pitch a projection lens can print is a process factor k₁ times the wavelength over the numerical aperture: why lithography went to 13.5 nm light and to wider apertures.", formula: "CD = k₁ λ / NA",
    valid: "Single exposure; k₁ about 0.3 to 0.4 in production, 0.25 its theoretical floor. Depth of focus falls as λ/NA².",
    inputs: [["k1", "-", "process factor"], ["lambda", "m", "wavelength"], ["NA", "-", "numerical aperture"]], output: ["CD", "m", "smallest half-pitch"],
    term: (v) => div(mul(v.k1, v.lambda), v.NA),
    domain: (v) => [{ says: 'k₁ at or above the single-exposure limit 0.25, and a dry lens: NA below 1', holds: and(ge(v.k1, est('single-exposure k₁ limit', 0.25, '1', 'the least k₁ of a single exposure')), lt(v.NA, k(1))) }],
    source: { cite: "Mack, Fundamental Principles of Optical Lithography, Wiley 2007", kind: "textbook" }, example: { inputs: {"k1":0.32,"lambda":1.35e-8,"NA":0.33}, output: 1.3090909090909092e-8 },
  }),
  L({
    id: "diffraction.limit", name: "Diffraction limit of an aperture", statement: "No lens or eye of diameter D can see detail finer than about 1.22 λ / D radians: long waves need huge apertures to make any image at all.", formula: "θ = 1.22 λ / D",
    valid: "A circular aperture, the Rayleigh criterion.",
    inputs: [["lambda", "m", "wavelength"], ["D", "m", "aperture diameter"]], output: ["theta", "rad", "smallest angle resolved"],
    term: (v) => div(mul(k(1.22, '1.22: the first zero of the Airy pattern, 1.2197'), v.lambda), v.D),
    domain: (v) => [{ says: 'an angle within the sky: 1.22 λ / D ≤ π', holds: le(div(mul(k(1.22, '1.22: the first zero of the Airy pattern, 1.2197'), v.lambda), v.D), PI()) }],
    source: { cite: "Hecht, Optics, 5th ed., Pearson 2017 (the eye: green light through a 5 mm pupil)", kind: "textbook" }, example: { inputs: {"lambda":5.5e-7,"D":0.005}, output: 0.0001342 },
  }),
  L({
    id: "shannon.capacity", name: "Shannon capacity", statement: "A channel carries at most its bandwidth times log₂(1 + signal to noise) bits a second, whatever the code.", formula: "C = B log₂(1 + S/N)",
    valid: "Additive white Gaussian noise.",
    inputs: [["B", "Hz", "bandwidth"], ["snr", "-", "signal to noise power ratio"]], output: ["C", "Hz", "capacity (bits per second)"],
    term: (v) => mul(v.B, log2(add(k(1), v.snr))),
    source: { cite: "Cover & Thomas, Elements of Information Theory, 2nd ed., Wiley 2006", kind: "textbook" }, example: { inputs: {"B":1000000,"snr":1000}, output: 9967226.258835994 },
  }),
  L({
    id: "shannon.sampling", name: "Nyquist-Shannon sampling theorem", statement: "A signal sampled above twice its highest frequency is recovered exactly; below that, higher frequencies alias into lower ones.", formula: "f_s ≥ 2 f_max",
    valid: "A band-limited signal; real converters sample a few times faster and filter first.",
    inputs: [["fmax", "Hz", "highest frequency in the signal"]], output: ["fs", "Hz", "least sampling rate"],
    term: (v) => mul(k(2), v.fmax),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"fmax":20000}, output: 40000 },
  }),
  L({
    id: "queueing", name: "Little's law", statement: "The items in a steady system equal their arrival rate times the time each spends in it: a queue, a network, a shop floor.", formula: "L = λ W",
    valid: "Steady state, any arrival pattern.",
    inputs: [["lambda", "1/s", "arrival rate"], ["W", "s", "time in the system"]], output: ["L", "-", "items in the system"],
    term: (v) => mul(v.lambda, v.W),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"lambda":10,"W":0.5}, output: 5 },
  }),
];
