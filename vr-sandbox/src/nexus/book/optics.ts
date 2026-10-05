// The book, optics: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST } from './constants';
import { mul, div, sin, asin, k } from '../term';

export const OPTICS = [
  L({
    id: "planck.energy", name: "Planck relation", statement: "A photon's energy is Planck's constant times the speed of light over its wavelength: colour is energy.", formula: "E = h c / λ",
    valid: "In vacuum.",
    inputs: [["lambda", "m", "wavelength"]], output: ["E", "J", "photon energy"],
    term: (v) => div(mul(CONST.h, CONST.c), v.lambda),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"lambda":5e-7}, output: 3.972891714297857e-19 },
  }),
  L({
    id: "snell.law", name: "Snell's law", statement: "Light bends at an interface by the ratio of refractive indices: lenses, fibres, the eye.", formula: "n₁ sin θ₁ = n₂ sin θ₂",
    valid: "Below the critical angle when going into the thinner medium; otherwise total internal reflection.",
    inputs: [["n1", "-", "index of the first medium"], ["n2", "-", "index of the second"], ["theta1", "rad", "angle of incidence"]], output: ["theta2", "rad", "angle of refraction"],
    term: (v) => asin(div(mul(v.n1, sin(v.theta1)), v.n2)),
    source: { cite: "Young & Freedman, University Physics, 15th ed., Pearson 2019", kind: "textbook" }, example: { inputs: {"n1":1,"n2":1.5,"theta1":0.5}, output: 0.32532528522279924 },
  }),
  L({
    id: "bragg.law", name: "Bragg's law", statement: "Waves reflect from crystal planes only at angles where the path difference between planes is whole wavelengths: how structure is seen.", formula: "n λ = 2 d sin θ",
    valid: "Wavelength of the order of the spacing (X-rays for crystals).",
    inputs: [["d", "m", "plane spacing"], ["theta", "rad", "glancing angle"], ["n", "-", "order"]], output: ["lambda", "m", "wavelength"],
    term: (v) => div(mul(k(2), v.d, sin(v.theta)), v.n),
    source: { cite: "Kittel, Introduction to Solid State Physics, 8th ed., Wiley 2005", kind: "textbook" }, example: { inputs: {"d":2.5e-10,"theta":0.3,"n":1}, output: 1.4776010333066977e-10 },
  }),
];
