// The book, foundations (docs/REALITY.md, step 5): the laws the coverage map found missing that the rest join through,
// the definitions and the basic laws of each field a textbook opens with: strain, momentum, work, the kinematics of
// steady acceleration, gravitation and orbits, rotation, waves and sound, lenses, light and matter as quanta, charge and
// capacitance, the kinetic theory of gases. Every term is SI; each worked example is computed independently (Python, in
// the commit that adds it), its source the textbook named.

import { L } from './define';
import { CONST } from './constants';
import { abs, add, sub, mul, div, pow, sqrt, neg, log10, k, leaf, PI, gt, ge, le, lt, and, zero } from '../term';

/** The standard concentration pH is measured against, 1 mol/L (IUPAC Green Book, 3rd ed., 2007, §2.13). */
const C0 = leaf('standard concentration', 1, 'mol/L', { class: 'fundamental', source: 'IUPAC Green Book, 3rd ed., 2007: c° = 1 mol/L, a convention' });

const PHYS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };
const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
const HECHT = { cite: 'Hecht, Optics, 5th ed., Pearson 2017', kind: 'textbook' as const };
const KINSLER = { cite: 'Kinsler, Frey, Coppens & Sanders, Fundamentals of Acoustics, 4th ed., Wiley 2000', kind: 'textbook' as const };
const GRIFFITHS = { cite: 'Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017', kind: 'textbook' as const };
const GRIFFITHS_Q = { cite: 'Griffiths & Schroeter, Introduction to Quantum Mechanics, 3rd ed., Cambridge 2018', kind: 'textbook' as const };
const ATKINS = { cite: 'Atkins, de Paula & Keeler, Atkins\' Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' as const };
const ex = 'computed independently (Python) from the inputs shown';

export const FOUNDATIONS = [
  // ---- mechanics: the definitions and steady acceleration -------------------------------------------------------------
  L({
    id: 'strain.definition', name: 'Strain', statement: 'Strain is how much a length grows, over the length it was.', formula: 'ε = ΔL / L',
    valid: 'Small strains (engineering strain); a large one is better measured as ln(L₁/L₀).',
    inputs: [['dL', 'm', 'extension'], ['L', 'm', 'length']], output: ['eps', '-', 'strain'],
    term: (v) => div(v.dL, v.L), domain: (v) => [{ says: 'a length above nothing', holds: gt(v.L, zero('m')) }],
    source: SHIGLEY, example: { inputs: { dL: 0.001, L: 2 }, output: 5e-4, from: ex },
  }),
  L({
    id: 'momentum.definition', name: 'Momentum', statement: 'A body\'s momentum is its mass times its velocity: what a collision conserves.', formula: 'p = m v',
    valid: 'Speeds far below light\'s (relativistic momentum is γ m v).',
    inputs: [['m', 'kg', 'mass'], ['v', 'm/s', 'speed']], output: ['p', 'kg m/s', 'momentum'],
    term: (v) => mul(v.m, v.v), domain: (v) => [{ says: 'below a tenth of light\'s speed, where m v is within half a per cent of γ m v', holds: lt(abs(v.v), mul(k(0.1), CONST.c)) }],
    source: PHYS, example: { inputs: { m: 2, v: 3 }, output: 6, from: ex },
  }),
  L({
    id: 'impulse', name: 'Impulse', statement: 'A force held for a time changes a body\'s momentum by the force times the time.', formula: 'J = F Δt',
    valid: 'A steady force; for a varying one, its integral over the time.',
    inputs: [['F', 'N', 'force'], ['t', 's', 'time']], output: ['J', 'N s', 'impulse'],
    term: (v) => mul(v.F, v.t), source: PHYS, example: { inputs: { F: 10, t: 0.5 }, output: 5, from: ex },
  }),
  L({
    id: 'work.definition', name: 'Work of a force', statement: 'A force does work equal to the force times the distance moved along it.', formula: 'W = F d',
    valid: 'A steady force along the motion; at an angle, F d cos θ.',
    inputs: [['F', 'N', 'force'], ['d', 'm', 'distance']], output: ['W', 'J', 'work'],
    term: (v) => mul(v.F, v.d), source: PHYS, example: { inputs: { F: 10, d: 3 }, output: 30, from: ex },
  }),
  L({
    id: 'kinematics.velocity', name: 'Speed under steady acceleration', statement: 'Under a steady acceleration a body\'s speed grows by the acceleration times the time.', formula: 'v = v₀ + a t',
    valid: 'A steady acceleration along a straight line.',
    inputs: [['v0', 'm/s', 'initial speed'], ['a', 'm/s^2', 'acceleration'], ['t', 's', 'time']], output: ['v', 'm/s', 'final speed'],
    term: (v) => add(v.v0, mul(v.a, v.t)), source: PHYS, example: { inputs: { v0: 2, a: 3, t: 4 }, output: 14, from: ex },
  }),
  L({
    id: 'kinematics.displacement', name: 'Distance under steady acceleration', statement: 'Under a steady acceleration a body goes its first speed times the time, and half the acceleration times the time squared.', formula: 'x = v₀ t + ½ a t²',
    valid: 'A steady acceleration along a straight line.',
    inputs: [['v0', 'm/s', 'initial speed'], ['a', 'm/s^2', 'acceleration'], ['t', 's', 'time']], output: ['x', 'm', 'distance'],
    term: (v) => add(mul(v.v0, v.t), mul(k(0.5), v.a, pow(v.t, 2))), source: PHYS, example: { inputs: { v0: 2, a: 3, t: 4 }, output: 32, from: ex },
  }),
  L({
    id: 'kinematics.timeless', name: 'Speed after a distance under steady acceleration', statement: 'Under a steady acceleration the square of the speed grows by twice the acceleration times the distance.', formula: 'v = √(v₀² + 2 a x)',
    valid: 'A steady acceleration along a straight line; v₀² + 2 a x not below nothing.',
    inputs: [['v0', 'm/s', 'initial speed'], ['a', 'm/s^2', 'acceleration'], ['x', 'm', 'distance']], output: ['v', 'm/s', 'final speed'],
    term: (v) => sqrt(add(pow(v.v0, 2), mul(k(2), v.a, v.x))), source: PHYS, example: { inputs: { v0: 2, a: 3, x: 32 }, output: 14, from: ex },
  }),
  // ---- rotation ------------------------------------------------------------------------------------------------------
  L({
    id: 'angular-momentum', name: 'Angular momentum', statement: 'A body turning about a fixed axis carries its moment of inertia times its angular speed.', formula: 'L = I ω',
    valid: 'Rotation about a fixed axis (a principal axis of the body).',
    inputs: [['I', 'kg m^2', 'moment of inertia'], ['w', 'rad/s', 'angular speed']], output: ['Lw', 'kg m^2/s', 'angular momentum'],
    term: (v) => mul(v.I, v.w), source: PHYS, example: { inputs: { I: 2, w: 3 }, output: 6, from: ex },
  }),
  L({
    id: 'newton.rotational', name: 'Newton\'s second law for rotation', statement: 'The net torque on a body turning about a fixed axis is its moment of inertia times its angular acceleration.', formula: 'T = I α',
    valid: 'A rigid body about a fixed axis, in an inertial frame.',
    inputs: [['I', 'kg m^2', 'moment of inertia'], ['alpha', 'rad/s^2', 'angular acceleration']], output: ['T', 'N m', 'net torque'],
    term: (v) => mul(v.I, v.alpha), source: PHYS, example: { inputs: { I: 2, alpha: 3 }, output: 6, from: ex },
  }),
  // ---- gravitation ---------------------------------------------------------------------------------------------------
  L({
    id: 'gravitation.newton', name: 'Newton\'s law of gravitation', statement: 'Two masses attract with a force in proportion to each and falling as the square of the distance between their centres.', formula: 'F = G m₁ m₂ / r²',
    valid: 'Spherical bodies or points, weak fields and slow speeds (general relativity beyond).',
    inputs: [['m1', 'kg', 'one mass'], ['m2', 'kg', 'the other mass'], ['r', 'm', 'distance between centres']], output: ['F', 'N', 'gravitational force'],
    term: (v) => div(mul(CONST.G, v.m1, v.m2), pow(v.r, 2)), domain: (v) => [{ says: 'a distance above nothing', holds: gt(v.r, zero('m')) }],
    source: PHYS, example: { inputs: { m1: 5.972e24, m2: 7.342e22, r: 3.844e8 }, output: 1.9804922390990566e20, rel: 1e-9, from: `${ex}: the Earth and the Moon` },
  }),
  L({
    id: 'orbit.circular-speed', name: 'Speed in a circular orbit', statement: 'A body circling a much larger mass moves at the speed whose centripetal acceleration its gravity gives.', formula: 'v = √(G M / r)',
    valid: 'A circular orbit of a body much lighter than what it circles, no drag.',
    inputs: [['M', 'kg', 'central mass'], ['r', 'm', 'orbital radius']], output: ['v', 'm/s', 'orbital speed'],
    term: (v) => sqrt(div(mul(CONST.G, v.M), v.r)), source: PHYS, example: { inputs: { M: 5.972e24, r: 6.771e6 }, output: 7672.4904132836045, rel: 1e-9, from: `${ex}: 400 km above the Earth` },
  }),
  L({
    id: 'escape.speed', name: 'Escape speed', statement: 'The speed at which a body\'s kinetic energy equals the work to climb out of a mass\'s gravity for good.', formula: 'v = √(2 G M / r)',
    valid: 'From the surface of a spherical mass, no drag, the escaping body much lighter.',
    inputs: [['M', 'kg', 'central mass'], ['r', 'm', 'radius']], output: ['v', 'm/s', 'escape speed'],
    term: (v) => sqrt(div(mul(k(2), CONST.G, v.M), v.r)), source: PHYS, example: { inputs: { M: 5.972e24, r: 6.371e6 }, output: 11185.97789184991, rel: 1e-9, from: `${ex}: the Earth` },
  }),
  L({
    id: 'kepler.third', name: 'Kepler\'s third law', statement: 'The square of an orbit\'s period grows as the cube of its size: one law for every planet round one sun.', formula: 'T = 2π √(a³ / (G M))',
    valid: 'A body much lighter than what it orbits (else G(M + m)); a the semi-major axis.',
    inputs: [['a', 'm', 'semi-major axis'], ['M', 'kg', 'central mass']], output: ['T', 's', 'orbital period'],
    term: (v) => mul(k(2), PI(), sqrt(div(pow(v.a, 3), mul(CONST.G, v.M)))), source: PHYS, example: { inputs: { a: 1.496e11, M: 1.989e30 }, output: 31554187.747615103, rel: 1e-9, from: `${ex}: the Earth round the Sun (a sidereal year, 365.2 days)` },
  }),
  L({
    id: 'mass-energy', name: 'Mass–energy equivalence', statement: 'Mass is energy: a body at rest holds its mass times the square of the speed of light.', formula: 'E = m c²',
    valid: 'Rest energy; everywhere tested.',
    inputs: [['m', 'kg', 'mass']], output: ['E', 'J', 'rest energy'],
    term: (v) => mul(v.m, pow(CONST.c, 2)), source: PHYS, example: { inputs: { m: 1e-3 }, output: 89875517873681.77, rel: 1e-12, from: ex },
  }),
  // ---- solids ----------------------------------------------------------------------------------------------------------
  L({
    id: 'spring.hooke', name: 'Hooke\'s law of a spring', statement: 'A linear spring pushes back with its rate times how far it is moved.', formula: 'F = k x',
    valid: 'Within the spring\'s linear range.',
    inputs: [['k', 'N/m', 'stiffness'], ['x', 'm', 'deflection']], output: ['F', 'N', 'spring force'],
    term: (v) => mul(v.k, v.x), source: PHYS, example: { inputs: { k: 200, x: 0.05 }, output: 10, from: ex },
  }),
  L({
    id: 'shear-modulus.isotropic', name: 'Shear modulus of an isotropic solid', statement: 'In a material the same every way, its shear modulus follows from its Young\'s modulus and Poisson\'s ratio.', formula: 'G = E / (2 (1 + ν))',
    valid: 'Isotropic, linear elastic; −1 < ν ≤ 0.5.',
    inputs: [['E', 'Pa', 'modulus'], ['nu', '-', 'Poisson\'s ratio']], output: ['G', 'Pa', 'shear modulus'],
    term: (v) => div(v.E, mul(k(2), add(k(1), v.nu))), domain: (v) => [{ says: 'a Poisson\'s ratio above −1 and at most 0.5', holds: and(gt(v.nu, k(-1)), le(v.nu, k(0.5))) }],
    source: SHIGLEY, example: { inputs: { E: 200e9, nu: 0.3 }, output: 76923076923.07692, rel: 1e-12, from: ex },
  }),
  L({
    id: 'poisson.lateral', name: 'Poisson contraction', statement: 'A bar stretched one way narrows the other ways by Poisson\'s ratio times its strain.', formula: 'ε_t = −ν ε',
    valid: 'Isotropic, linear elastic.',
    inputs: [['nu', '-', 'Poisson\'s ratio'], ['eps', '-', 'strain']], output: ['epst', '-', 'lateral strain'],
    term: (v) => neg(mul(v.nu, v.eps)), source: SHIGLEY, example: { inputs: { nu: 0.3, eps: 1e-3 }, output: -3e-4, from: ex },
  }),
  L({
    id: 'thermal.stress', name: 'Thermal stress in a held bar', statement: 'A bar held at both ends and warmed is pushed by the stress that would undo the growth it is not allowed.', formula: 'σ = E α ΔT',
    valid: 'Fully restrained, linear elastic, uniform temperature; below yield and buckling.',
    inputs: [['E', 'Pa', 'modulus'], ['alpha', '1/K', 'expansion coefficient'], ['dT', 'K', 'temperature rise']], output: ['sigma', 'Pa', 'thermal stress'],
    term: (v) => mul(v.E, v.alpha, v.dT), source: SHIGLEY, example: { inputs: { E: 200e9, alpha: 12e-6, dT: 50 }, output: 120e6, rel: 1e-12, from: ex },
  }),
  L({
    id: 'pressure.definition', name: 'Pressure', statement: 'Pressure is the force a fluid pushes with over the area it pushes on.', formula: 'p = F / A',
    valid: 'A force spread evenly, normal to the area.',
    inputs: [['F', 'N', 'force'], ['A', 'm^2', 'area']], output: ['p', 'Pa', 'pressure'],
    term: (v) => div(v.F, v.A), source: PHYS, example: { inputs: { F: 100, A: 0.01 }, output: 1e4, from: ex },
  }),
  // ---- waves and sound -------------------------------------------------------------------------------------------------
  L({
    id: 'wave.speed', name: 'Wave speed', statement: 'A wave moves one wavelength in each cycle: its speed is its frequency times its wavelength.', formula: 'v = f λ',
    valid: 'Any periodic wave in a medium that does not disperse at that frequency.',
    inputs: [['f', 'Hz', 'frequency'], ['lambda', 'm', 'wavelength']], output: ['v', 'm/s', 'wave speed'],
    term: (v) => mul(v.f, v.lambda), source: PHYS, example: { inputs: { f: 440, lambda: 0.78 }, output: 343.2, from: ex },
  }),
  L({
    id: 'sound.speed.gas', name: 'Speed of sound in a gas', statement: 'Sound in an ideal gas moves at a speed set by its temperature and its molar mass, not its pressure.', formula: 'c = √(γ R T / M)',
    valid: 'An ideal gas, adiabatic sound (γ = 1.4 for air); small amplitudes.',
    inputs: [['gamma', '-', 'heat capacity ratio'], ['T', 'K', 'temperature'], ['M', 'kg/mol', 'molar mass']], output: ['c', 'm/s', 'speed of sound'],
    term: (v) => sqrt(div(mul(v.gamma, CONST.R, v.T), v.M)), source: KINSLER, example: { inputs: { gamma: 1.4, T: 293.15, M: 0.0289647 }, output: 343.2349805813274, rel: 1e-9, from: `${ex}: dry air at 20 °C` },
  }),
  L({
    id: 'doppler.source', name: 'Doppler shift of an approaching source', statement: 'A source moving toward a still listener is heard higher: each wave is sent from nearer.', formula: 'f′ = f c / (c − v_s)',
    valid: 'The source slower than sound, moving straight toward the listener; still air.',
    inputs: [['f', 'Hz', 'frequency sent'], ['c', 'm/s', 'speed of sound'], ['vs', 'm/s', 'source speed']], output: ['fh', 'Hz', 'frequency heard'],
    term: (v) => div(mul(v.f, v.c), sub(v.c, v.vs)), domain: (v) => [{ says: 'a source slower than sound', holds: lt(v.vs, v.c) }],
    source: KINSLER, example: { inputs: { f: 440, c: 343, vs: 30 }, output: 482.17252396166134, rel: 1e-12, from: ex },
  }),
  L({
    id: 'sound.level', name: 'Sound intensity level', statement: 'Loudness is said in decibels: ten times the base-ten logarithm of an intensity over the faintest a young ear hears.', formula: 'L = 10 log₁₀(I / I₀), I₀ = 10⁻¹² W/m²',
    valid: 'Intensity of a sound in air; the reference is a convention (ISO 1683).',
    inputs: [['I', 'W/m^2', 'sound intensity']], output: ['Lv', 'dB', 'sound intensity level'],
    term: (v) => mul(k(10), log10(div(v.I, CONST.I0))), domain: (v) => [{ says: 'an intensity above nothing', holds: gt(v.I, zero('W/m^2')) }],
    source: KINSLER, example: { inputs: { I: 1e-6 }, output: 60, rel: 1e-12, from: ex },
  }),
  // ---- light -----------------------------------------------------------------------------------------------------------
  L({
    id: 'thin.lens', name: 'Thin lens equation', statement: 'A thin lens brings light from an object to an image where the reciprocals of the distances add to the reciprocal of its focal length.', formula: '1/f = 1/d_o + 1/d_i',
    valid: 'Paraxial rays (near the axis), a lens thin beside its focal length; a real image beyond the focal point.',
    inputs: [['f', 'm', 'focal length'], ['do', 'm', 'object distance']], output: ['di', 'm', 'image distance'],
    term: (v) => div(k(1), sub(div(k(1), v.f), div(k(1), v.do))), domain: (v) => [{ says: 'the object beyond the focal point', holds: gt(v.do, v.f) }],
    source: HECHT, example: { inputs: { f: 0.05, do: 0.2 }, output: 0.06666666666666667, rel: 1e-12, from: ex },
  }),
  L({
    id: 'photon.energy.frequency', name: 'Energy of a photon', statement: 'Light comes in quanta, each with the Planck constant times its frequency.', formula: 'E = h f',
    valid: 'Every photon.',
    inputs: [['f', 'Hz', 'frequency']], output: ['E', 'J', 'photon energy'],
    term: (v) => mul(CONST.h, v.f), source: GRIFFITHS_Q, example: { inputs: { f: 5e14 }, output: 3.313035075e-19, rel: 1e-12, from: ex },
  }),
  L({
    id: 'de-broglie', name: 'de Broglie wavelength', statement: 'Matter is a wave too: a moving body\'s wavelength is the Planck constant over its momentum.', formula: 'λ = h / (m v)',
    valid: 'Speeds far below light\'s (else the relativistic momentum).',
    inputs: [['m', 'kg', 'mass'], ['v', 'm/s', 'speed']], output: ['lambda', 'm', 'wavelength'],
    term: (v) => div(CONST.h, mul(v.m, v.v)), domain: (v) => [{ says: 'a speed above nothing', holds: gt(v.v, zero('m/s')) }],
    source: GRIFFITHS_Q, example: { inputs: { m: 9.1093837015e-31, v: 1e6 }, output: 7.273895103253709e-10, rel: 1e-12, from: `${ex}: an electron at 1000 km/s` },
  }),
  L({
    id: 'wien', name: 'Wien\'s displacement law', statement: 'A hot body glows brightest at a wavelength that shortens as it warms.', formula: 'λ_max = b / T',
    valid: 'A black body (a grey one too: the peak does not move with emissivity).',
    inputs: [['T', 'K', 'temperature']], output: ['lambda', 'm', 'peak wavelength'],
    term: (v) => div(CONST.b, v.T), domain: (v) => [{ says: 'a temperature above absolute zero', holds: gt(v.T, zero('K')) }],
    source: { cite: 'CODATA 2018 (b); Planck\'s law maximised, as in Atkins, Physical Chemistry, 11th ed., 2018', kind: 'textbook' }, example: { inputs: { T: 5772 }, output: 5.020394932432432e-7, rel: 1e-12, from: `${ex}: the Sun's effective temperature` },
  }),
  L({
    id: 'hydrogen.levels', name: 'Energy levels of hydrogen', statement: 'The electron of a hydrogen atom can have only the energies −13.6 eV over the square of a whole number.', formula: 'E_n = −R_y / n²',
    valid: 'Hydrogen (one electron), fine structure and the nucleus\'s motion left out (parts in 10⁴); n = 1, 2, 3…',
    inputs: [['n', '-', 'principal quantum number']], output: ['E', 'eV', 'energy'],
    term: (v) => neg(div(CONST.Ry, pow(v.n, 2))), domain: (v) => [{ says: 'a whole number from 1', holds: ge(v.n, k(1)) }],
    source: GRIFFITHS_Q, example: { inputs: { n: 2 }, output: -3.4014232807485, rel: 1e-12, from: ex },
  }),
  L({
    id: 'radioactive.activity', name: 'Activity of a radioactive sample', statement: 'A sample decays at its decay constant times the number of nuclei left.', formula: 'A = λ N',
    valid: 'One radionuclide; λ = ln 2 / t½.',
    inputs: [['lambda', '1/s', 'decay constant'], ['N', '-', 'nuclei']], output: ['A', '1/s', 'activity'],
    term: (v) => mul(v.lambda, v.N), source: PHYS, example: { inputs: { lambda: 1e-3, N: 1e6 }, output: 1000, from: ex },
  }),
  // ---- charge ----------------------------------------------------------------------------------------------------------
  L({
    id: 'charge.definition', name: 'Charge carried by a current', statement: 'A steady current carries its amperes times the seconds it flows in coulombs.', formula: 'Q = I t',
    valid: 'A steady current; for a varying one, its integral over the time.',
    inputs: [['I', 'A', 'current'], ['t', 's', 'time']], output: ['Q', 'C', 'charge'],
    term: (v) => mul(v.I, v.t), source: GRIFFITHS, example: { inputs: { I: 2, t: 3 }, output: 6, from: ex },
  }),
  L({
    id: 'capacitor.charge', name: 'Charge on a capacitor', statement: 'A capacitor holds its capacitance times the voltage across it.', formula: 'Q = C V',
    valid: 'A linear capacitor.',
    inputs: [['C', 'F', 'capacitance'], ['V', 'V', 'voltage']], output: ['Q', 'C', 'charge'],
    term: (v) => mul(v.C, v.V), source: GRIFFITHS, example: { inputs: { C: 1e-6, V: 5 }, output: 5e-6, rel: 1e-12, from: ex },
  }),
  L({
    id: 'capacitance.plates', name: 'Capacitance of parallel plates', statement: 'Two plates hold more charge the larger they are and the closer, by the permittivity between them.', formula: 'C = ε₀ ε_r A / d',
    valid: 'Plates wide beside their gap (fringing left out).',
    inputs: [['er', '-', 'relative permittivity'], ['A', 'm^2', 'plate area'], ['d', 'm', 'gap']], output: ['C', 'F', 'capacitance'],
    term: (v) => div(mul(CONST.eps0, v.er, v.A), v.d), source: GRIFFITHS, example: { inputs: { er: 1, A: 0.01, d: 1e-3 }, output: 8.8541878128e-11, rel: 1e-12, from: ex },
  }),
  L({
    id: 'lorentz.charge', name: 'Magnetic force on a moving charge', statement: 'A charge moving across a magnetic field is pushed sideways by its charge times its speed times the field.', formula: 'F = q v B',
    valid: 'The motion across the field (else times the sine of the angle).',
    inputs: [['q', 'C', 'charge'], ['v', 'm/s', 'speed'], ['B', 'T', 'flux density']], output: ['F', 'N', 'magnetic force'],
    term: (v) => mul(v.q, v.v, v.B), source: GRIFFITHS, example: { inputs: { q: 1.602176634e-19, v: 1e6, B: 1 }, output: 1.6021766339999998e-13, rel: 1e-12, from: ex },
  }),
  // ---- heat and gases --------------------------------------------------------------------------------------------------
  L({
    id: 'heat-engine.efficiency', name: 'Efficiency of a heat engine', statement: 'A heat engine\'s efficiency is the work it gives over the heat it takes in.', formula: 'η = W / Q_h',
    valid: 'Over whole cycles; never above Carnot\'s 1 − T_c/T_h.',
    inputs: [['W', 'J', 'work out'], ['Qh', 'J', 'heat in']], output: ['eta', '-', 'efficiency'],
    term: (v) => div(v.W, v.Qh), source: PHYS, example: { inputs: { W: 300, Qh: 1000 }, output: 0.3, from: ex },
  }),
  L({
    id: 'gas.molecular-energy', name: 'Mean kinetic energy of a gas molecule', statement: 'In a gas each molecule moves with three halves of the Boltzmann constant times the temperature, on average.', formula: 'E = (3/2) k_B T',
    valid: 'An ideal gas in equilibrium; translational energy only.',
    inputs: [['T', 'K', 'temperature']], output: ['E', 'J', 'mean kinetic energy'],
    term: (v) => mul(k(1.5), CONST.kB, v.T), source: ATKINS, example: { inputs: { T: 300 }, output: 6.2129205000000004e-21, rel: 1e-12, from: ex },
  }),
  L({
    id: 'gas.rms-speed', name: 'Root-mean-square speed of a gas', statement: 'Gas molecules move faster the warmer the gas and the lighter they are.', formula: 'v = √(3 R T / M)',
    valid: 'An ideal gas in equilibrium.',
    inputs: [['T', 'K', 'temperature'], ['M', 'kg/mol', 'molar mass']], output: ['v', 'm/s', 'rms speed'],
    term: (v) => sqrt(div(mul(k(3), CONST.R, v.T), v.M)), source: ATKINS, example: { inputs: { T: 300, M: 0.028 }, output: 516.9628460053972, rel: 1e-12, from: `${ex}: nitrogen at 300 K` },
  }),
  // ---- chemistry -------------------------------------------------------------------------------------------------------
  L({
    id: 'ph', name: 'pH', statement: 'How acid a solution is: minus the base-ten logarithm of its hydrogen ions in moles a litre.', formula: 'pH = −log₁₀([H⁺] / 1 mol/L)',
    valid: 'Dilute solutions, where activity is close to concentration (below about 0.1 mol/L); defined by activity.',
    inputs: [['c', 'mol/m^3', 'hydrogen ion concentration']], output: ['pH', '-', 'pH'],
    term: (v) => neg(log10(div(v.c, C0))), domain: (v) => [{ says: 'a concentration above nothing', holds: gt(v.c, zero('mol/m^3')) }],
    source: ATKINS, example: { inputs: { c: 1e-4 }, output: 7, rel: 1e-12, from: `${ex}: pure water at 25 °C, 10⁻⁷ mol/L` },
  }),
];
