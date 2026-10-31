// The book, the rest of each field's core (docs/REALITY.md, step 5): the laws `fields.ts` named missing after the
// foundations, each from the textbook its field's list cites. Every term is SI; each worked example is computed
// independently (Python, in the commit that adds it). Colebrook's friction factor is implicit (f on both sides) and is
// not a term: Haaland's explicit fit to it is here, said as an approximation.

import { L } from './define';
import { CONST } from './constants';
import { add, sub, mul, div, pow, sqrt, neg, exp, ln, log2, log10, sin, cos, k, PI, gt, ge, le, lt, and } from '../term';
import type { Term } from '../term';

const PHYS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };
const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
const CALLISTER = { cite: 'Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018', kind: 'textbook' as const };
const FOX = { cite: 'Fox, McDonald & Pritchard, Introduction to Fluid Mechanics, 9th ed., Wiley 2015', kind: 'textbook' as const };
const INCROPERA = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011', kind: 'textbook' as const };
const CENGEL = { cite: 'Çengel & Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill 2019', kind: 'textbook' as const };
const KINSLER = { cite: 'Kinsler, Frey, Coppens & Sanders, Fundamentals of Acoustics, 4th ed., Wiley 2000', kind: 'textbook' as const };
const HECHT = { cite: 'Hecht, Optics, 5th ed., Pearson 2017', kind: 'textbook' as const };
const GRIFFITHS = { cite: 'Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017', kind: 'textbook' as const };
const HH = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015, ch. 1', kind: 'textbook' as const };
const GRIFFITHS_Q = { cite: 'Griffiths & Schroeter, Introduction to Quantum Mechanics, 3rd ed., Cambridge 2018', kind: 'textbook' as const };
const ATKINS = { cite: 'Atkins, de Paula & Keeler, Atkins\' Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' as const };
const COVER = { cite: 'Cover & Thomas, Elements of Information Theory, 2nd ed., Wiley 2006', kind: 'textbook' as const };
const ex = 'computed independently (Python) from the inputs shown';
const tanh = (x: Term) => div(sub(exp(mul(k(2), x)), k(1)), add(exp(mul(k(2), x)), k(1)));
/** 1/√(1 − v²/c²) */
const gammaOf = (v: Term) => div(k(1), sqrt(sub(k(1), pow(div(v, CONST.c), 2))));
const below = (v: Term) => ({ says: 'slower than light', holds: lt(v, CONST.c) });

export const CORE = [
  // ---- mechanics -------------------------------------------------------------------------------------------------------
  L({ id: 'projectile.range', name: 'Range of a projectile', statement: 'A body thrown over level ground lands at its speed squared times the sine of twice its angle, over gravity.', formula: 'R = v² sin 2θ / g',
    valid: 'Level ground, no drag, uniform gravity.', inputs: [['v', 'm/s', 'launch speed'], ['theta', 'rad', 'launch angle'], ['g', 'm/s^2', 'gravity']], output: ['R', 'm', 'range'],
    term: (v) => div(mul(pow(v.v, 2), sin(mul(k(2), v.theta))), v.g), domain: (v) => [{ says: 'an angle between 0 and 90°', holds: and(ge(v.theta, k(0)), le(v.theta, k(Math.PI / 2))) }],
    source: PHYS, example: { inputs: { v: 20, theta: 0.6, g: 9.80665 }, output: 38.01661468359639, rel: 1e-12, from: ex } }),
  L({ id: 'restitution', name: 'Coefficient of restitution', statement: 'How bouncy a collision is: the speed the bodies part at over the speed they met at.', formula: 'e = v_sep / v_app',
    valid: 'A collision along the line of centres; 0 (they stick) to 1 (no loss).', inputs: [['vsep', 'm/s', 'parting speed'], ['vapp', 'm/s', 'approach speed']], output: ['e', '-', 'coefficient of restitution'],
    term: (v) => div(v.vsep, v.vapp), source: PHYS, example: { inputs: { vsep: 3, vapp: 5 }, output: 0.6, rel: 1e-12, from: ex } }),
  L({ id: 'collision.elastic', name: 'Elastic collision of two bodies', statement: 'In a collision that keeps both momentum and energy, the first body leaves at this speed.', formula: 'v₁′ = ((m₁ − m₂) v₁ + 2 m₂ v₂) / (m₁ + m₂)',
    valid: 'Head-on, perfectly elastic, in one line.', inputs: [['m1', 'kg', 'first mass'], ['m2', 'kg', 'second mass'], ['v1', 'm/s', 'first speed'], ['v2', 'm/s', 'second speed']], output: ['v1p', 'm/s', 'first speed after'],
    term: (v) => div(add(mul(sub(v.m1, v.m2), v.v1), mul(k(2), v.m2, v.v2)), add(v.m1, v.m2)), source: PHYS, example: { inputs: { m1: 2, m2: 3, v1: 4, v2: -1 }, output: -2, rel: 1e-12, from: ex } }),
  L({ id: 'oscillator.damped', name: 'Damped oscillator', statement: 'A spring-mass system with light damping swings at nearly its own frequency while its swing dies away exponentially.', formula: 'x = A e^(−ζ ω t) cos(ω √(1 − ζ²) t)',
    valid: 'Underdamped (ζ < 1), linear, released from rest at A (the cosine part alone, without its small sine term).', inputs: [['A', 'm', 'amplitude'], ['zeta', '-', 'damping ratio'], ['w', 'rad/s', 'natural angular frequency'], ['t', 's', 'time']], output: ['x', 'm', 'displacement'],
    term: (v) => mul(v.A, exp(neg(mul(v.zeta, v.w, v.t))), cos(mul(v.w, sqrt(sub(k(1), pow(v.zeta, 2))), v.t))), domain: (v) => [{ says: 'underdamped: 0 ≤ ζ < 1', holds: and(ge(v.zeta, k(0)), lt(v.zeta, k(1))) }],
    source: PHYS, example: { inputs: { A: 0.1, zeta: 0.05, w: 10, t: 2 }, output: 0.015847875327136676, rel: 1e-12, from: ex } }),
  L({ id: 'precession', name: 'Gyroscopic precession', statement: 'A spinning wheel pushed by a torque does not fall: it turns about the vertical at the torque over its angular momentum.', formula: 'Ω = T / (I ω)',
    valid: 'Fast spin (ω much above Ω), steady precession.', inputs: [['T', 'N m', 'torque'], ['I', 'kg m^2', 'moment of inertia'], ['w', 'rad/s', 'spin speed']], output: ['Om', 'rad/s', 'precession rate'],
    term: (v) => div(v.T, mul(v.I, v.w)), source: PHYS, example: { inputs: { T: 0.5, I: 0.01, w: 300 }, output: 0.16666666666666666, rel: 1e-12, from: ex } }),
  L({ id: 'gravitation.potential', name: 'Gravitational potential energy of two masses', statement: 'Two masses far apart have less potential energy the closer they are: zero at infinity.', formula: 'U = −G M m / r',
    valid: 'Spherical bodies or points outside each other.', inputs: [['M', 'kg', 'central mass'], ['m', 'kg', 'mass'], ['r', 'm', 'distance between centres']], output: ['U', 'J', 'potential energy'],
    term: (v) => neg(div(mul(CONST.G, v.M, v.m), v.r)), source: PHYS, example: { inputs: { M: 5.972e24, m: 1000, r: 6.771e6 }, output: -58867109141.92882, rel: 1e-12, from: ex } }),
  L({ id: 'vis-viva', name: 'Vis-viva equation', statement: 'A body on any Keplerian orbit moves at the speed set by its distance and its orbit\'s size.', formula: 'v = √(G M (2/r − 1/a))',
    valid: 'A two-body orbit, the orbiting body much lighter.', inputs: [['M', 'kg', 'central mass'], ['r', 'm', 'distance between centres'], ['a', 'm', 'semi-major axis']], output: ['v', 'm/s', 'orbital speed'],
    term: (v) => sqrt(mul(CONST.G, v.M, sub(div(k(2), v.r), div(k(1), v.a)))), source: PHYS, example: { inputs: { M: 5.972e24, r: 6.771e6, a: 7e6 }, output: 7796.980477695961, rel: 1e-12, from: ex } }),
  // ---- relativity ------------------------------------------------------------------------------------------------------
  L({ id: 'lorentz.factor', name: 'Lorentz factor', statement: 'How much a moving clock slows and a moving ruler shortens, seen from where they move.', formula: 'γ = 1 / √(1 − v²/c²)',
    valid: 'Special relativity: inertial frames.', inputs: [['v', 'm/s', 'speed']], output: ['gamma', '-', 'Lorentz factor'],
    term: (v) => gammaOf(v.v), domain: (v) => [below(v.v)], source: PHYS, example: { inputs: { v: 179875474.8 }, output: 1.25, rel: 1e-12, from: `${ex}: 0.6 c` } }),
  L({ id: 'time.dilation.motion', name: 'Time dilation of motion', statement: 'A moving clock is seen to run slow: its own time stretched by the Lorentz factor.', formula: 'Δt = γ Δτ',
    valid: 'Special relativity: inertial frames.', inputs: [['v', 'm/s', 'speed'], ['tau', 's', 'proper time']], output: ['t', 's', 'time seen'],
    term: (v) => mul(gammaOf(v.v), v.tau), domain: (v) => [below(v.v)], source: PHYS, example: { inputs: { v: 179875474.8, tau: 1 }, output: 1.25, rel: 1e-12, from: ex } }),
  L({ id: 'length.contraction', name: 'Length contraction', statement: 'A moving body is shorter along its motion, seen from where it moves.', formula: 'L = L₀ √(1 − v²/c²)',
    valid: 'Special relativity: inertial frames.', inputs: [['v', 'm/s', 'speed'], ['L0', 'm', 'proper length']], output: ['Lc', 'm', 'length seen'],
    term: (v) => mul(v.L0, sqrt(sub(k(1), pow(div(v.v, CONST.c), 2)))), domain: (v) => [below(v.v)], source: PHYS, example: { inputs: { v: 179875474.8, L0: 10 }, output: 8, rel: 1e-12, from: ex } }),
  L({ id: 'momentum.relativistic', name: 'Relativistic momentum', statement: 'Near light\'s speed a body\'s momentum grows without bound: its mass times its speed times the Lorentz factor.', formula: 'p = γ m v',
    valid: 'Special relativity; reduces to m v far below c.', inputs: [['m', 'kg', 'mass'], ['v', 'm/s', 'speed']], output: ['p', 'kg m/s', 'momentum'],
    term: (v) => mul(gammaOf(v.v), v.m, v.v), domain: (v) => [below(v.v)], source: PHYS, example: { inputs: { m: 1, v: 179875474.8 }, output: 224844343.5, rel: 1e-12, from: ex } }),
  // ---- solids ----------------------------------------------------------------------------------------------------------
  L({ id: 'fracture.toughness', name: 'Stress intensity at a crack', statement: 'A crack concentrates stress at its tip by the square root of its length: it runs when this reaches the material\'s toughness K_Ic.', formula: 'K = Y σ √(π a)',
    valid: 'Linear elastic fracture mechanics: small-scale yielding at the tip; Y from the crack\'s shape (1.12 for an edge crack).', inputs: [['Y', '-', 'geometry factor'], ['sigma', 'Pa', 'stress'], ['a', 'm', 'crack length']], output: ['K', 'Pa m^0.5', 'stress intensity factor'],
    term: (v) => mul(v.Y, v.sigma, sqrt(mul(PI(), v.a))), source: CALLISTER, example: { inputs: { Y: 1.12, sigma: 100e6, a: 0.002 }, output: 8877853.146637466, rel: 1e-12, from: ex } }),
  L({ id: 'fatigue.goodman', name: 'Goodman line', statement: 'Under a steady stress and an alternating one together, a part is as safe as the factor that puts both on the line from its endurance limit to its ultimate strength.', formula: '1/n = σ_a/S_e + σ_m/S_ut',
    valid: 'Ductile metals, tensile mean stress, infinite life; conservative near yield.', inputs: [['sa', 'Pa', 'stress amplitude'], ['Se', 'Pa', 'endurance limit'], ['sm', 'Pa', 'mean stress'], ['Sut', 'Pa', 'tensile strength']], output: ['n', '-', 'safety factor'],
    term: (v) => div(k(1), add(div(v.sa, v.Se), div(v.sm, v.Sut))), source: SHIGLEY, example: { inputs: { sa: 100e6, Se: 300e6, sm: 150e6, Sut: 600e6 }, output: 1.7142857142857144, rel: 1e-12, from: ex } }),
  L({ id: 'creep.power-law', name: 'Power-law creep', statement: 'Hot metal under steady stress flows at a rate rising as a power of the stress and exponentially with temperature.', formula: 'ε̇ = A (σ/σ₀)ⁿ e^(−Q/RT)',
    valid: 'Steady (secondary) creep above about 0.4 of the melting point; A, n and Q fitted for each material.', inputs: [['A', '1/s', 'creep constant'], ['sigma', 'Pa', 'stress'], ['s0', 'Pa', 'reference stress'], ['n', '-', 'stress exponent'], ['Q', 'J/mol', 'activation energy'], ['T', 'K', 'temperature']], output: ['rate', '1/s', 'strain rate'],
    term: (v) => mul(v.A, exp(mul(v.n, ln(div(v.sigma, v.s0)))), exp(neg(div(v.Q, mul(CONST.R, v.T))))), source: CALLISTER, example: { inputs: { A: 1e-6, sigma: 100e6, s0: 1e6, n: 4, Q: 150000, T: 900 }, output: 1.969684405092872e-7, rel: 1e-12, from: ex } }),
  L({ id: 'strain-energy.density', name: 'Strain energy density', statement: 'A linearly stretched solid stores the stress squared over twice its modulus in each cubic metre.', formula: 'u = σ² / (2E)',
    valid: 'Linear elastic, uniaxial stress.', inputs: [['sigma', 'Pa', 'stress'], ['E', 'Pa', 'modulus']], output: ['u', 'J/m^3', 'strain energy density'],
    term: (v) => div(pow(v.sigma, 2), mul(k(2), v.E)), source: SHIGLEY, example: { inputs: { sigma: 200e6, E: 200e9 }, output: 100000, rel: 1e-12, from: ex } }),
  // ---- fluids ----------------------------------------------------------------------------------------------------------
  L({ id: 'terminal.speed', name: 'Terminal speed', statement: 'A falling body stops speeding up when the drag on it equals its weight.', formula: 'v = √(2 m g / (ρ C_d A))',
    valid: 'Quadratic drag (high Reynolds number), still air.', inputs: [['m', 'kg', 'mass'], ['g', 'm/s^2', 'gravity'], ['rho', 'kg/m^3', 'fluid density'], ['Cd', '-', 'drag coefficient'], ['A', 'm^2', 'frontal area']], output: ['v', 'm/s', 'terminal speed'],
    term: (v) => sqrt(div(mul(k(2), v.m, v.g), mul(v.rho, v.Cd, v.A))), source: FOX, example: { inputs: { m: 80, g: 9.80665, rho: 1.225, Cd: 1, A: 0.7 }, output: 42.77630471298285, rel: 1e-12, from: `${ex}: a skydiver spread out` } }),
  L({ id: 'friction-factor.haaland', name: 'Pipe friction factor (Haaland)', statement: 'The friction factor of turbulent flow in a rough pipe, explicitly: within 2 % of Colebrook\'s implicit law.', formula: '1/√f = −1.8 log₁₀((ε/D / 3.7)^1.11 + 6.9/Re)',
    valid: 'Turbulent flow, 4000 < Re < 10⁸, relative roughness 0 to 0.05.', inputs: [['eD', '-', 'relative roughness'], ['Re', '-', 'Reynolds number']], output: ['f', '-', 'Darcy friction factor'],
    term: (v) => pow(mul(k(-1.8), log10(add(exp(mul(k(1.11), ln(div(v.eD, k(3.7))))), div(k(6.9), v.Re)))), -2), domain: (v) => [{ says: 'turbulent: 4000 < Re < 10⁸', holds: and(gt(v.Re, k(4000)), lt(v.Re, k(1e8))) }, { says: 'a relative roughness above 0 and at most 0.05', holds: and(gt(v.eD, k(0)), le(v.eD, k(0.05))) }],
    source: { cite: 'Haaland, J. Fluids Eng. 105:89 (1983); Fox, McDonald & Pritchard, 9th ed., eq. 8.37b', kind: 'paper' }, example: { inputs: { eD: 1e-4, Re: 1e5 }, output: 0.018265053014793857, rel: 1e-12, from: ex } }),
  // ---- heat ------------------------------------------------------------------------------------------------------------
  L({ id: 'gas.adiabatic', name: 'Adiabatic compression of an ideal gas', statement: 'A gas squeezed with no heat in or out rises in pressure faster than by Boyle\'s law: as the volume ratio to the power γ.', formula: 'p₂ = p₁ (V₁/V₂)^γ',
    valid: 'An ideal gas, reversible and adiabatic (quick, insulated); γ = 1.4 for air.', inputs: [['p1', 'Pa', 'pressure before'], ['V1', 'm^3', 'volume before'], ['V2', 'm^3', 'volume after'], ['gamma', '-', 'heat capacity ratio']], output: ['p2', 'Pa', 'pressure after'],
    term: (v) => mul(v.p1, exp(mul(v.gamma, ln(div(v.V1, v.V2))))), source: CENGEL, example: { inputs: { p1: 101325, V1: 1, V2: 0.5, gamma: 1.4 }, output: 267398.278118127, rel: 1e-12, from: ex } }),
  L({ id: 'entropy.heating', name: 'Entropy gained in heating', statement: 'Warming a body at constant specific heat raises its entropy by its heat capacity times the log of the temperature ratio.', formula: 'ΔS = m c ln(T₂/T₁)',
    valid: 'Constant specific heat, no phase change, reversible path between the states.', inputs: [['m', 'kg', 'mass'], ['c', 'J/kg K', 'specific heat'], ['T1', 'K', 'temperature before'], ['T2', 'K', 'temperature after']], output: ['dS', 'J/K', 'entropy change'],
    term: (v) => mul(v.m, v.c, ln(div(v.T2, v.T1))), source: CENGEL, example: { inputs: { m: 1, c: 4186, T1: 293.15, T2: 353.15 }, output: 779.4686656535441, rel: 1e-12, from: `${ex}: a litre of water from 20 to 80 °C` } }),
  L({ id: 'fin.efficiency', name: 'Efficiency of a straight fin', statement: 'A fin carries less heat than if it were all at its base\'s temperature: by tanh(mL)/mL.', formula: 'η = tanh(m L) / (m L)',
    valid: 'A straight fin of uniform section with an insulated tip; m = √(h P/(k A)).', inputs: [['mL', '-', 'fin parameter']], output: ['eta', '-', 'efficiency'],
    term: (v) => div(tanh(v.mL), v.mL), domain: (v) => [{ says: 'a fin parameter above nothing', holds: gt(v.mL, k(0)) }], source: INCROPERA, example: { inputs: { mL: 1.5 }, output: 0.6034321690965776, rel: 1e-12, from: ex } }),
  L({ id: 'dittus-boelter', name: 'Dittus–Boelter correlation', statement: 'How well a turbulent flow in a smooth pipe carries heat from its wall, from its Reynolds and Prandtl numbers.', formula: 'Nu = 0.023 Re^0.8 Pr^0.4',
    valid: 'Fully developed turbulent flow in a smooth tube, Re > 10 000, 0.6 < Pr < 160, the fluid being heated (0.3 when cooled); about ±25 %.', inputs: [['Re', '-', 'Reynolds number'], ['Pr', '-', 'Prandtl number']], output: ['Nu', '-', 'Nusselt number'],
    term: (v) => mul(k(0.023), pow(v.Re, 0.8), pow(v.Pr, 0.4)), domain: (v) => [{ says: 'turbulent: Re above 10 000', holds: gt(v.Re, k(10000)) }, { says: 'a Prandtl number from 0.6 to 160', holds: and(ge(v.Pr, k(0.6)), le(v.Pr, k(160))) }],
    source: INCROPERA, example: { inputs: { Re: 1e5, Pr: 7 }, output: 500.9184776310397, rel: 1e-12, from: ex } }),
  // ---- waves -----------------------------------------------------------------------------------------------------------
  L({ id: 'string.harmonics', name: 'Harmonics of a string or pipe', statement: 'A string fixed at both ends (or a pipe open at both) sounds at whole multiples of the speed over twice its length.', formula: 'f_n = n v / (2L)',
    valid: 'Fixed–fixed string or open–open pipe, small amplitude.', inputs: [['n', '-', 'harmonic'], ['v', 'm/s', 'wave speed'], ['L', 'm', 'length']], output: ['f', 'Hz', 'frequency'],
    term: (v) => div(mul(v.n, v.v), mul(k(2), v.L)), source: KINSLER, example: { inputs: { n: 3, v: 343, L: 1.5 }, output: 343, rel: 1e-12, from: ex } }),
  L({ id: 'inverse-square', name: 'Inverse square spreading', statement: 'A source sending its power equally every way is spread over a sphere: its intensity falls as the square of the distance.', formula: 'I = P / (4π r²)',
    valid: 'A point source in free space, no absorption.', inputs: [['P', 'W', 'power'], ['r', 'm', 'distance']], output: ['I', 'W/m^2', 'intensity'],
    term: (v) => div(v.P, mul(k(4), PI(), pow(v.r, 2))), source: KINSLER, example: { inputs: { P: 100, r: 5 }, output: 0.3183098861837907, rel: 1e-12, from: ex } }),
  L({ id: 'string.wave-speed', name: 'Wave speed on a string', statement: 'A wave runs along a taut string faster the tighter it is and the lighter.', formula: 'v = √(T / μ)',
    valid: 'A flexible string, small amplitude.', inputs: [['T', 'N', 'tension'], ['mu', 'kg/m', 'mass per length']], output: ['v', 'm/s', 'wave speed'],
    term: (v) => sqrt(div(v.T, v.mu)), source: PHYS, example: { inputs: { T: 100, mu: 0.01 }, output: 100, rel: 1e-12, from: ex } }),
  // ---- light -----------------------------------------------------------------------------------------------------------
  L({ id: 'magnification', name: 'Magnification of a lens', statement: 'An image is as much larger than its object as it is farther from the lens, upside down if real.', formula: 'm = −d_i / d_o',
    valid: 'A thin lens, paraxial rays.', inputs: [['di', 'm', 'image distance'], ['do', 'm', 'object distance']], output: ['M', '-', 'magnification'],
    term: (v) => neg(div(v.di, v.do)), source: HECHT, example: { inputs: { di: 0.06666666666666667, do: 0.2 }, output: -0.3333333333333333, rel: 1e-12, from: ex } }),
  L({ id: 'double-slit', name: 'Fringes of two slits', statement: 'Light through two slits makes bright fringes spaced by the wavelength times the distance to the screen over the slits\' spacing.', formula: 'y = m λ L / d',
    valid: 'The screen far beside the slit spacing (small angles).', inputs: [['m', '-', 'order'], ['lambda', 'm', 'wavelength'], ['L', 'm', 'distance to the screen'], ['d', 'm', 'slit spacing']], output: ['y', 'm', 'fringe position'],
    term: (v) => div(mul(v.m, v.lambda, v.L), v.d), source: HECHT, example: { inputs: { m: 1, lambda: 500e-9, L: 2, d: 0.1e-3 }, output: 0.01, rel: 1e-9, from: ex } }),
  L({ id: 'malus', name: 'Malus\'s law', statement: 'Polarised light through a polariser keeps the square of the cosine of the angle between them.', formula: 'I = I₀ cos² θ',
    valid: 'Ideal polarisers, light fully polarised.', inputs: [['I0', 'W/m^2', 'intensity in'], ['theta', 'rad', 'angle between']], output: ['I', 'W/m^2', 'intensity out'],
    term: (v) => mul(v.I0, pow(cos(v.theta), 2)), source: HECHT, example: { inputs: { I0: 100, theta: Math.PI / 3 }, output: 25.00000000000001, rel: 1e-12, from: ex } }),
  L({ id: 'beer-lambert', name: 'Beer–Lambert law', statement: 'Light through an absorbing solution is absorbed in proportion to its path and its concentration.', formula: 'A = ε l c',
    valid: 'Dilute solutions, monochromatic light, no scattering; A = log₁₀ of incident over transmitted.', inputs: [['eps', 'm^2/mol', 'molar absorptivity'], ['l', 'm', 'path length'], ['c', 'mol/m^3', 'concentration']], output: ['A', '-', 'absorbance'],
    term: (v) => mul(v.eps, v.l, v.c), source: ATKINS, example: { inputs: { eps: 30, l: 0.01, c: 0.5 }, output: 0.15, rel: 1e-12, from: ex } }),
  // ---- electricity -----------------------------------------------------------------------------------------------------
  L({ id: 'wire.field', name: 'Magnetic field of a long wire', statement: 'A current in a long straight wire makes a field round it falling as the distance.', formula: 'B = μ₀ I / (2π r)',
    valid: 'A long straight wire, outside it.', inputs: [['I', 'A', 'current'], ['r', 'm', 'distance']], output: ['B', 'T', 'flux density'],
    term: (v) => div(mul(CONST.mu0, v.I), mul(k(2), PI(), v.r)), source: GRIFFITHS, example: { inputs: { I: 10, r: 0.05 }, output: 4.000000002177503e-5, rel: 1e-12, from: ex } }),
  L({ id: 'resistors.series', name: 'Resistors in series', statement: 'Resistors one after another add.', formula: 'R = R₁ + R₂',
    valid: 'The same current through both.', inputs: [['R1', 'ohm', 'one resistance'], ['R2', 'ohm', 'the other resistance']], output: ['R', 'ohm', 'series resistance'],
    term: (v) => add(v.R1, v.R2), source: HH, example: { inputs: { R1: 100, R2: 220 }, output: 320, rel: 1e-12, from: ex } }),
  L({ id: 'resistors.parallel', name: 'Resistors in parallel', statement: 'Resistors side by side add as their conductances.', formula: '1/R = 1/R₁ + 1/R₂',
    valid: 'The same voltage across both.', inputs: [['R1', 'ohm', 'one resistance'], ['R2', 'ohm', 'the other resistance']], output: ['R', 'ohm', 'parallel resistance'],
    term: (v) => div(k(1), add(div(k(1), v.R1), div(k(1), v.R2))), source: HH, example: { inputs: { R1: 100, R2: 220 }, output: 68.75, rel: 1e-12, from: ex } }),
  L({ id: 'transformer', name: 'Ideal transformer', statement: 'A transformer\'s voltages are in the ratio of its turns.', formula: 'V₂ = V₁ N₂ / N₁',
    valid: 'An ideal transformer: no leakage, no losses, AC.', inputs: [['V1', 'V', 'primary voltage'], ['N1', '-', 'primary turns'], ['N2', '-', 'secondary turns']], output: ['V2', 'V', 'secondary voltage'],
    term: (v) => div(mul(v.V1, v.N2), v.N1), source: HH, example: { inputs: { V1: 230, N1: 1000, N2: 50 }, output: 11.5, rel: 1e-12, from: ex } }),
  L({ id: 'lc.resonance', name: 'LC resonance', statement: 'An inductor and a capacitor together ring at one frequency.', formula: 'f = 1 / (2π √(L C))',
    valid: 'Ideal components, no resistance.', inputs: [['L', 'H', 'inductance'], ['C', 'F', 'capacitance']], output: ['f', 'Hz', 'resonant frequency'],
    term: (v) => div(k(1), mul(k(2), PI(), sqrt(mul(v.L, v.C)))), source: HH, example: { inputs: { L: 1e-3, C: 1e-6 }, output: 5032.921210448703, rel: 1e-12, from: ex } }),
  // ---- quantum ---------------------------------------------------------------------------------------------------------
  L({ id: 'photoelectric', name: 'Photoelectric effect', statement: 'Light frees electrons from a metal only if each photon has more than the metal\'s work function; the rest is the electron\'s energy.', formula: 'K_max = h f − φ',
    valid: 'A clean metal surface; f above the threshold φ/h.', inputs: [['f', 'Hz', 'frequency'], ['phi', 'eV', 'work function']], output: ['K', 'eV', 'kinetic energy'],
    term: (v) => sub(mul(CONST.h, v.f), v.phi), source: GRIFFITHS_Q, example: { inputs: { f: 1.5e15, phi: 4.5 }, output: 1.7035015453857885, rel: 1e-12, from: ex } }),
  L({ id: 'uncertainty.heisenberg', name: 'Heisenberg uncertainty', statement: 'A particle confined to a place has at least this spread in momentum.', formula: 'Δp ≥ ħ / (2 Δx)',
    valid: 'Every quantum state; the least spread, reached by a Gaussian.', inputs: [['dx', 'm', 'position spread']], output: ['dp', 'kg m/s', 'least momentum spread'],
    term: (v) => div(div(CONST.h, mul(k(2), PI())), mul(k(2), v.dx)), source: GRIFFITHS_Q, example: { inputs: { dx: 1e-10 }, output: 5.272859088230783e-25, rel: 1e-12, from: ex } }),
  L({ id: 'particle-in-box', name: 'Particle in a box', statement: 'A particle held between two walls can have only these energies, growing as the square of a whole number.', formula: 'E_n = n² h² / (8 m L²)',
    valid: 'Infinitely high walls, one dimension.', inputs: [['n', '-', 'quantum number'], ['m', 'kg', 'mass'], ['L', 'm', 'width']], output: ['E', 'eV', 'energy'],
    term: (v) => div(mul(pow(v.n, 2), pow(CONST.h, 2)), mul(k(8), v.m, pow(v.L, 2))), source: GRIFFITHS_Q, example: { inputs: { n: 1, m: 9.1093837015e-31, L: 1e-9 }, output: 0.37603016261673744, rel: 1e-12, from: `${ex}: an electron in a 1 nm well` } }),
  L({ id: 'compton', name: 'Compton shift', statement: 'X-rays scattered by electrons come off longer by an amount set only by the angle.', formula: 'Δλ = (h / (m_e c)) (1 − cos θ)',
    valid: 'Scattering by free electrons at rest.', inputs: [['theta', 'rad', 'scattering angle']], output: ['dl', 'm', 'wavelength shift'],
    term: (v) => mul(div(CONST.h, mul(CONST.me, CONST.c)), sub(k(1), cos(v.theta))), source: GRIFFITHS_Q, example: { inputs: { theta: Math.PI / 2 }, output: 2.4263102386830918e-12, rel: 1e-12, from: ex } }),
  // ---- chemistry -------------------------------------------------------------------------------------------------------
  L({ id: 'equilibrium.constant', name: 'Equilibrium constant from Gibbs energy', statement: 'A reaction goes as far as its standard Gibbs energy allows: the more negative, the further.', formula: 'K = e^(−ΔG° / R T)',
    valid: 'Ideal behaviour, standard states.', inputs: [['dG', 'J/mol', 'standard Gibbs energy change'], ['T', 'K', 'temperature']], output: ['K', '-', 'equilibrium constant'],
    term: (v) => exp(neg(div(v.dG, mul(CONST.R, v.T)))), source: ATKINS, example: { inputs: { dG: -10000, T: 298.15 }, output: 56.48383859029209, rel: 1e-12, from: ex } }),
  L({ id: 'raoult', name: 'Raoult\'s law', statement: 'A solvent\'s vapour pressure over a solution is its pure vapour pressure times its mole fraction.', formula: 'p = x p*',
    valid: 'Ideal solutions; best for the solvent of a dilute one.', inputs: [['x', '-', 'mole fraction'], ['ps', 'Pa', 'vapour pressure of the pure liquid']], output: ['p', 'Pa', 'vapour pressure'],
    term: (v) => mul(v.x, v.ps), source: ATKINS, example: { inputs: { x: 0.9, ps: 3169.9 }, output: 2852.9100000000003, rel: 1e-12, from: ex } }),
  L({ id: 'rate.second-order', name: 'Second-order rate law', statement: 'A reaction whose rate goes as the square of a concentration falls off more slowly than an exponential.', formula: '[A] = 1 / (1/[A]₀ + k t)',
    valid: 'Rate = k [A]², constant temperature.', inputs: [['A0', 'mol/m^3', 'concentration at the start'], ['k2', 'm^3/mol s', 'second-order rate constant'], ['t', 's', 'time']], output: ['A', 'mol/m^3', 'concentration'],
    term: (v) => div(k(1), add(div(k(1), v.A0), mul(v.k2, v.t))), source: ATKINS, example: { inputs: { A0: 1, k2: 0.5, t: 10 }, output: 0.16666666666666666, rel: 1e-12, from: ex } }),
  L({ id: 'vant-hoff', name: 'Van \'t Hoff equation', statement: 'An equilibrium shifts with temperature by its reaction enthalpy: away from the heat it gives.', formula: 'K₂ = K₁ e^(−ΔH/R (1/T₂ − 1/T₁))',
    valid: 'ΔH constant over the range.', inputs: [['K1', '-', 'equilibrium constant at the reference'], ['dH', 'J/mol', 'enthalpy change'], ['T1', 'K', 'reference temperature'], ['T2', 'K', 'temperature']], output: ['K2', '-', 'equilibrium constant'],
    term: (v) => mul(v.K1, exp(neg(mul(div(v.dH, CONST.R), sub(div(k(1), v.T2), div(k(1), v.T1)))))), source: ATKINS, example: { inputs: { K1: 2, dH: -50000, T1: 298.15, T2: 310 }, output: 0.9250951798474857, rel: 1e-12, from: ex } }),
  // ---- information -----------------------------------------------------------------------------------------------------
  L({ id: 'entropy.binary', name: 'Entropy of a yes-or-no', statement: 'How much a choice between two outcomes tells, by how likely the first is: a bit at even odds, nothing at certainty.', formula: 'H = −p log₂ p − (1 − p) log₂(1 − p)',
    valid: '0 < p < 1; two outcomes (Shannon\'s entropy of a distribution, for two).', inputs: [['p', '-', 'probability']], output: ['H', '-', 'information (bits)'],
    term: (v) => neg(add(mul(v.p, log2(v.p)), mul(sub(k(1), v.p), log2(sub(k(1), v.p))))), domain: (v) => [{ says: 'a probability strictly between 0 and 1', holds: and(gt(v.p, k(0)), lt(v.p, k(1))) }],
    source: COVER, example: { inputs: { p: 0.25 }, output: 0.8112781244591328, rel: 1e-12, from: ex } }),
  // ---- machine elements ------------------------------------------------------------------------------------------------
  L({ id: 'shaft.critical-speed', name: 'Critical speed of a shaft', statement: 'A shaft whirls at the speed of its own bending frequency: the root of its stiffness over the mass it carries.', formula: 'ω = √(k / m)',
    valid: 'One mass on a massless shaft (Rayleigh\'s single-mass estimate).', inputs: [['k', 'N/m', 'stiffness'], ['m', 'kg', 'mass']], output: ['w', 'rad/s', 'critical speed'],
    term: (v) => sqrt(div(v.k, v.m)), source: SHIGLEY, example: { inputs: { k: 1e6, m: 10 }, output: 316.22776601683796, rel: 1e-12, from: ex } }),
  L({ id: 'belt.power', name: 'Power through a belt', statement: 'A belt carries the difference of its tight and slack pulls times its speed.', formula: 'P = (T₁ − T₂) v',
    valid: 'Steady running, centrifugal tension left out.', inputs: [['T1', 'N', 'tight-side pull'], ['T2', 'N', 'slack-side pull'], ['v', 'm/s', 'belt speed']], output: ['P', 'W', 'power'],
    term: (v) => mul(sub(v.T1, v.T2), v.v), source: SHIGLEY, example: { inputs: { T1: 500, T2: 100, v: 10 }, output: 4000, rel: 1e-12, from: ex } }),
  L({ id: 'clutch.torque', name: 'Torque of a plate clutch (uniform wear)', statement: 'A worn-in plate clutch carries its friction times its clamp force times its mean radius.', formula: 'T = μ F (r_o + r_i) / 2',
    valid: 'One friction face, uniform wear (a run-in clutch); two faces double it.', inputs: [['mu', '-', 'friction coefficient'], ['F', 'N', 'clamp force'], ['ro', 'm', 'outer radius'], ['ri', 'm', 'inner radius']], output: ['T', 'N m', 'torque'],
    term: (v) => div(mul(v.mu, v.F, add(v.ro, v.ri)), k(2)), domain: (v) => [{ says: 'an inner radius below the outer', holds: lt(v.ri, v.ro) }], source: SHIGLEY, example: { inputs: { mu: 0.3, F: 1000, ro: 0.1, ri: 0.06 }, output: 24, rel: 1e-12, from: ex } }),
];
