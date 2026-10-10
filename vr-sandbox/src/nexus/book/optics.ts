// The book, optics: the kept laws (src/ganglia/laws.ts) as terms. Every term is SI; the ports say the
// units people write. Metadata is the kept data's own; the terms and domains are written here.

import { L } from './define';
import { CONST } from './constants';
import { mul, div, sin, asin, exp, neg, pow, k } from '../term';

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
  L({
    id: "xray.cutoff", name: "Duane-Hunt law", statement: "An x-ray tube makes nothing shorter than the wavelength one whole electron's energy would be: the tube's voltage sets the hardest photon it can make, and nothing above it.", formula: "\u03bb_min = h c / (e V)",
    valid: "A tube accelerating electrons through V into a target; the voltage as applied, not the mean of a ripply supply.",
    inputs: [["V", "V", "tube voltage"]], output: ["lambda", "m", "shortest wavelength"],
    term: (v) => div(mul(CONST.h, CONST.c), mul(CONST.e, v.V)),
    source: { cite: "Attix, Introduction to Radiological Physics and Radiation Dosimetry, Wiley 1986, ch. 9", kind: "textbook" }, example: { inputs: {"V":100000}, output: 1.2398419843320027e-11 },
  }),
  L({
    id: "xray.efficiency", name: "thick-target x-ray yield", statement: "Almost all of an x-ray tube's power becomes heat: the share that leaves as x-rays is about a billionth of the target's atomic number times the volts, which at 100 kV into tungsten is under one per cent.", formula: "\u03b7 \u2248 1.1e-9 Z V",
    valid: "A thick target of one element, 30 kV to about 300 kV. It is a fit, not a derivation.",
    inputs: [["Z", "-", "atomic number of the target"], ["V", "V", "tube voltage"]], output: ["eta", "-", "share of the beam power radiated"],
    term: (v) => mul(CONST.kXray, v.Z, v.V),
    source: { cite: "Bushberg, Seibert, Leidholdt & Boone, The Essential Physics of Medical Imaging, 3rd ed., Lippincott 2011, ch. 6", kind: "textbook" }, example: { inputs: {"Z":74,"V":100000}, output: 0.00814 },
  }),
  L({
    id: "attenuation.exponential", name: "Beer-Lambert attenuation", statement: "A beam of photons through matter loses the same share in every equal layer, so what is left falls off exponentially with thickness: what an x-ray image is made of.", formula: "I = I\u2080 e^(-\u03bc x)",
    valid: "A narrow beam of one energy, no build-up from scatter. \u03bc is the material's linear attenuation coefficient at that energy (NIST XCOM).",
    inputs: [["I0", "W/m^2", "incident intensity"], ["mu", "1/m", "linear attenuation coefficient"], ["x", "m", "thickness"]], output: ["I", "W/m^2", "intensity left"],
    term: (v) => mul(v.I0, exp(neg(mul(v.mu, v.x)))),
    source: { cite: "Attix, Introduction to Radiological Physics and Radiation Dosimetry, Wiley 1986, ch. 3", kind: "textbook" }, example: { inputs: {"I0":1,"mu":17.07,"x":0.1}, output: 0.18140920470554706 },
  }),
  L({
    id: "lidar.time-of-flight", name: "time of flight", statement: "A pulse's echo comes back in twice the range over the speed of light: a lidar is a clock, and a nanosecond is 150 mm.", formula: "R = c t / 2",
    valid: "In air (the speed of light in air is lower by about 3 parts in 10,000, which is 30 mm in 100 m).",
    inputs: [["t", "s", "time from pulse to echo"]], output: ["R", "m", "range"],
    term: (v) => div(mul(CONST.c, v.t), k(2)),
    source: { cite: "Richmond & Cain, Direct-Detection LADAR Systems, SPIE Press 2010, ch. 2", kind: "textbook" }, example: { inputs: {"t":1e-6}, output: 149.896229 },
  }),
  L({
    id: "lidar.return", name: "lidar range equation", statement: "What comes back from a scattering surface is the transmitted power times its reflectance times the share of a hemisphere the receiver's aperture fills: it falls as the square of the range, so doubling the range asks four times the power.", formula: "P_r = P_t \u03c1 A \u03b7 / (\u03c0 R\u00b2)",
    valid: "A Lambertian target larger than the beam, filling the field of view, no atmospheric loss, the receiver normal to the return.",
    inputs: [["Pt", "W", "transmitted power"], ["rho", "-", "target reflectance"], ["A", "m^2", "receiver aperture area"], ["eta", "-", "optical efficiency"], ["R", "m", "range"]], output: ["Pr", "W", "power received"],
    term: (v) => div(mul(v.Pt, v.rho, v.A, v.eta), mul(k(Math.PI, "\u03c0"), pow(v.R, 2))),
    source: { cite: "Richmond & Cain, Direct-Detection LADAR Systems, SPIE Press 2010, ch. 2", kind: "textbook" }, example: { inputs: {"Pt":25,"rho":0.1,"A":2.8e-4,"eta":0.9,"R":100}, output: 2.005352282957881e-8 },
  }),
  L({
    id: "ftir.resolution", name: "interferometer resolution", statement: "An interferometer tells apart wavenumbers no closer than one over the path difference its mirror travels: to see 1 cm\u207b\u00b9 apart the mirror must move a centimetre.", formula: "\u0394\u03bd\u0303 = 1 / OPD",
    valid: "An unapodised spectrum; apodising to suppress its ringing widens the line by up to half as much again.",
    inputs: [["opd", "m", "optical path difference"]], output: ["dnu", "1/m", "resolution in wavenumber"],
    term: (v) => div(k(1), v.opd),
    source: { cite: "Griffiths & de Haseth, Fourier Transform Infrared Spectrometry, 2nd ed., Wiley 2007, ch. 2", kind: "textbook" }, example: { inputs: {"opd":0.01}, output: 100 },
  }),
];
