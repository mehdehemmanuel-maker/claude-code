// The laws Ego reasons with: each an equation that runs, in SI, with where it holds and where it comes from, and a
// worked example it must reproduce (computed independently: ganglia.test.ts). Where the world itself runs a law,
// `implementedIn` names the module, and the law here calls the same function, so what Ego reasons with and what the
// physics does are one thing.

import { eulerBucklingLoad, cantileverDeflection } from '../engineering/beams';
import { capstanRatio, dragForce } from '../engineering/mechanics';
import { cellOCV } from '../engineering/battery';
import { COPPER_ALPHA } from '../engineering/dcmotor';
import { STANDARD_GRAVITY as g } from '../data/materials';
import type { Law, Quantity } from './types';

const q = (sym: string, name: string, unit: string): Quantity => ({ sym, name, unit });

/** Resistivity of annealed copper at 20 deg C, ohm m (IEC 60028: 1/58 ohm mm^2/m). */
export const COPPER_RHO = 1 / 58e6;
/** Stefan-Boltzmann constant, W/m^2 K^4 (CODATA 2018). */
export const SIGMA_SB = 5.670374419e-8;

const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
const ROARK = { cite: 'Young & Budynas, Roark\'s Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002', kind: 'handbook' as const };
const INCROPERA = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011', kind: 'textbook' as const };
const PHYSICS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' as const };
const GILLESPIE = { cite: 'Gillespie, Fundamentals of Vehicle Dynamics, SAE 1992, ch. 4 (rolling resistance); Engineering ToolBox, Rolling Resistance', url: 'https://www.engineeringtoolbox.com/rolling-friction-resistance-d_1303.html', kind: 'textbook' as const };
const ISO281 = { cite: 'ISO 281:2007 Rolling bearings — Dynamic load ratings and rating life', kind: 'standard' as const };
const G = { g: { value: g, unit: 'm/s^2', name: 'standard gravity (ISO 80000-3)' } };

export const LAWS: Law[] = [
  // ---------------------------------------------------------------- mechanics
  {
    id: 'newton.second', name: 'Newton\'s second law', domain: 'mechanics',
    statement: 'The net force on a body is its mass times its acceleration.', formula: 'F = m a',
    inputs: [q('m', 'mass', 'kg'), q('a', 'acceleration', 'm/s^2')], output: q('F', 'net force', 'N'),
    eval: ({ m, a }) => m! * a!, valid: 'Rigid bodies at speeds far below light\'s; a is measured in an inertial frame.',
    example: { inputs: { m: 2, a: 3 }, output: 6 }, source: PHYSICS, tags: ['force', 'acceleration', 'mass', 'dynamics'],
    implementedIn: 'physics/world.ts (Jolt integrates it)',
  },
  {
    id: 'weight', name: 'Weight', domain: 'mechanics',
    statement: 'A mass weighs its mass times the local acceleration of gravity.', formula: 'W = m g',
    inputs: [q('m', 'mass', 'kg'), q('g', 'gravity', 'm/s^2')], output: q('W', 'weight', 'N'),
    eval: ({ m, g: gg }) => m! * gg!, valid: 'Near a planet\'s surface; standard gravity is 9.80665 m/s^2 (ISO 80000-3).',
    example: { inputs: { m: 10, g }, output: 98.0665 }, source: PHYSICS, tags: ['gravity', 'load', 'mass'],
  },
  {
    id: 'friction.coulomb', name: 'Coulomb friction', domain: 'mechanics',
    statement: 'Dry friction holds up to the friction coefficient times the normal force, and slides at about that force once moving.',
    formula: 'F ≤ μ N', inputs: [q('mu', 'friction coefficient', '-'), q('N', 'normal force', 'N')], output: q('F', 'friction force (limit)', 'N'),
    eval: ({ mu, N }) => mu! * N!, valid: 'Dry, unlubricated contact; μ depends on the pair and the surfaces, not on the contact area.',
    example: { inputs: { mu: 0.4, N: 500 }, output: 200 }, source: SHIGLEY, tags: ['friction', 'grip', 'slip', 'clamp'],
    implementedIn: 'physics/world.ts (contacts), connectors/registry.ts (bolted slip, clamp)',
  },
  {
    id: 'rolling.resistance', name: 'Rolling resistance', domain: 'mechanics',
    statement: 'A rolling wheel is held back by a force proportional to the load on it: the rolling resistance coefficient times the normal force.',
    formula: 'F = C_rr N', inputs: [q('Crr', 'rolling resistance coefficient', '-'), q('N', 'normal force', 'N')], output: q('F', 'rolling resistance', 'N'),
    eval: ({ Crr, N }) => Crr! * N!, outside: ({ Crr }) => (Crr! < 0.001 || Crr! > 0.3 ? `C_rr ${Crr} is outside anything that rolls (steel on rail 0.001, a tyre in sand 0.3)` : null),
    valid: 'Steady rolling on a hard surface. C_rr: car tyres on asphalt or concrete 0.007 to 0.02 (about 0.012); soft rubber cart wheels on concrete 0.03 to 0.05.',
    example: { inputs: { Crr: 0.015, N: 120 * g }, output: 17.65197 }, source: GILLESPIE, tags: ['wheel', 'tyre', 'vehicle', 'drag', 'kart'],
  },
  {
    id: 'grade.force', name: 'Grade resistance', domain: 'mechanics',
    statement: 'On a slope, the part of the weight along it pulls a vehicle back.', formula: 'F = m g sin θ',
    inputs: [q('m', 'mass', 'kg'), q('theta', 'slope angle', 'rad')], output: q('F', 'grade force', 'N'),
    constants: G, eval: ({ m, theta, g: gg }) => m! * gg! * Math.sin(theta!), valid: 'A grade of p% is θ = atan(p/100).',
    example: { inputs: { m: 120, theta: Math.atan(0.05) }, output: 58.7664877443385 }, source: GILLESPIE, tags: ['slope', 'hill', 'vehicle', 'kart'],
  },
  {
    id: 'drag.aero', name: 'Aerodynamic drag', domain: 'fluids',
    statement: 'Air pushes back on a moving body with half the air density times its drag coefficient, frontal area and speed squared.',
    formula: 'F = ½ ρ C_d A v²', inputs: [q('rho', 'air density', 'kg/m^3'), q('Cd', 'drag coefficient', '-'), q('A', 'frontal area', 'm^2'), q('v', 'speed', 'm/s')],
    output: q('F', 'drag', 'N'), eval: ({ rho, Cd, A, v }) => dragForce(rho!, Cd!, A!, v!),
    valid: 'Turbulent flow (Reynolds above about 10^4); air at 20 °C is 1.204 kg/m^3.',
    example: { inputs: { rho: 1.204, Cd: 0.9, A: 0.5, v: 10 }, output: 27.09 }, source: { cite: 'Hoerner, Fluid-Dynamic Drag, 1965' }, tags: ['air', 'speed', 'vehicle'],
    implementedIn: 'engineering/mechanics.ts dragForce',
  },
  {
    id: 'power.linear', name: 'Power of a force', domain: 'mechanics', statement: 'A force moving its point at a speed does work at force times speed.',
    formula: 'P = F v', inputs: [q('F', 'force', 'N'), q('v', 'speed', 'm/s')], output: q('P', 'power', 'W'),
    eval: ({ F, v }) => F! * v!, valid: 'Force and velocity along the same line.', example: { inputs: { F: 100, v: 3 }, output: 300 }, source: PHYSICS, tags: ['power', 'vehicle', 'work'],
  },
  {
    id: 'power.rotary', name: 'Power of a torque', domain: 'mechanics', statement: 'A torque turning at a speed does work at torque times angular speed.',
    formula: 'P = T ω', inputs: [q('T', 'torque', 'N m'), q('w', 'angular speed', 'rad/s')], output: q('P', 'power', 'W'),
    eval: ({ T, w }) => T! * w!, valid: 'ω in rad/s (rpm × 2π/60).', example: { inputs: { T: 5, w: 100 }, output: 500 }, source: PHYSICS, tags: ['power', 'motor', 'shaft'],
  },
  {
    id: 'wheel.torque', name: 'Torque at a wheel', domain: 'mechanics', statement: 'A wheel pushing with a force at its rim needs that force times its radius at its axle.',
    formula: 'T = F r', inputs: [q('F', 'tractive force', 'N'), q('r', 'wheel radius', 'm')], output: q('T', 'axle torque', 'N m'),
    eval: ({ F, r }) => F! * r!, valid: 'Rolling without slip (r the loaded radius).', example: { inputs: { F: 93.3, r: 0.125 }, output: 11.6625 }, source: GILLESPIE, tags: ['wheel', 'torque', 'vehicle', 'kart'],
  },
  {
    id: 'traction.limit', name: 'Traction limit', domain: 'mechanics',
    statement: 'Driven wheels can push no harder than the tyre\'s friction coefficient times the weight on them; past that they spin.',
    formula: 'F ≤ μ N_driven', inputs: [q('mu', 'tyre-road friction', '-'), q('N', 'load on driven wheels', 'N')], output: q('F', 'most tractive force', 'N'),
    eval: ({ mu, N }) => mu! * N!, outside: ({ mu }) => (mu! > 1.6 ? `μ ${mu} is above even racing slicks' (about 1.5)` : null), valid: 'Dry rubber on asphalt μ about 0.7 to 0.9; less wet or on dust.', example: { inputs: { mu: 0.8, N: 600 }, output: 480 }, source: GILLESPIE, tags: ['grip', 'wheel', 'spin', 'vehicle'],
  },
  {
    id: 'energy.kinetic', name: 'Kinetic energy', domain: 'mechanics', statement: 'A moving mass holds half its mass times its speed squared.',
    formula: 'E = ½ m v²', inputs: [q('m', 'mass', 'kg'), q('v', 'speed', 'm/s')], output: q('E', 'kinetic energy', 'J'),
    eval: ({ m, v }) => 0.5 * m! * v! * v!, valid: 'Translation only; a spinning body adds ½ I ω².', example: { inputs: { m: 120, v: 2.2 }, output: 290.4 }, source: PHYSICS, tags: ['energy', 'speed'],
    implementedIn: 'physics/energy.ts kineticEnergy',
  },
  {
    id: 'energy.potential', name: 'Gravitational potential energy', domain: 'mechanics', statement: 'A raised mass holds its weight times its height.',
    formula: 'E = m g h', inputs: [q('m', 'mass', 'kg'), q('h', 'height', 'm')], output: q('E', 'potential energy', 'J'),
    constants: G, eval: ({ m, h, g: gg }) => m! * gg! * h!, valid: 'Uniform gravity.', example: { inputs: { m: 10, h: 2 }, output: 196.133 }, source: PHYSICS, tags: ['energy', 'height', 'lift'],
    implementedIn: 'physics/energy.ts potentialEnergy',
  },
  {
    id: 'braking.distance', name: 'Stopping distance', domain: 'mechanics', statement: 'Braking steadily, a body stops in its speed squared over twice its deceleration.',
    formula: 'd = v² / (2 a)', inputs: [q('v', 'speed', 'm/s'), q('a', 'deceleration', 'm/s^2')], output: q('d', 'distance', 'm'),
    eval: ({ v, a }) => (v! * v!) / (2 * a!), valid: 'Constant deceleration, reaction time not included.', example: { inputs: { v: 10, a: 5 }, output: 10 }, source: PHYSICS, tags: ['brake', 'vehicle', 'safety'],
  },
  {
    id: 'cornering.limit', name: 'Cornering speed limit', domain: 'mechanics', statement: 'Round a flat bend a vehicle slides past the speed whose centripetal need equals its grip.',
    formula: 'v = √(μ g R)', inputs: [q('mu', 'tyre friction', '-'), q('R', 'bend radius', 'm')], output: q('v', 'most speed', 'm/s'),
    constants: G, eval: ({ mu, R, g: gg }) => Math.sqrt(mu! * gg! * R!), outside: ({ mu }) => (mu! > 1.6 ? `μ ${mu} is above even racing slicks' (about 1.5)` : null), valid: 'Flat, unbanked bend; ignores load transfer (and rollover, which a tall vehicle meets first).',
    example: { inputs: { mu: 0.8, R: 5 }, output: 6.2631142413339385 }, source: GILLESPIE, tags: ['turn', 'steering', 'vehicle', 'kart'],
  },
  {
    id: 'pendulum.period', name: 'Pendulum period', domain: 'mechanics', statement: 'A simple pendulum swings with period two pi root of its length over gravity.',
    formula: 'T = 2π √(L / g)', inputs: [q('L', 'length', 'm')], output: q('T', 'period', 's'),
    constants: G, eval: ({ L, g: gg }) => 2 * Math.PI * Math.sqrt(L! / gg!), valid: 'Small swings (under about 15°), a point mass on a light string.', example: { inputs: { L: 1 }, output: 2.0064092925890407 }, source: PHYSICS, tags: ['swing', 'oscillation', 'test'],
  },
  // ---------------------------------------------------------------- structures and materials
  {
    id: 'stress.axial', name: 'Axial stress', domain: 'structures', statement: 'A bar pulled or pushed along its length carries the force spread over its section.',
    formula: 'σ = F / A', inputs: [q('F', 'force', 'N'), q('A', 'section area', 'm^2')], output: q('sigma', 'stress', 'Pa'),
    eval: ({ F, A }) => F! / A!, valid: 'Away from holes and ends (stress concentrations raise it locally).', example: { inputs: { F: 10000, A: (Math.PI / 4) * 0.01 ** 2 }, output: 127323954.47351627 }, source: SHIGLEY, tags: ['stress', 'tension', 'compression', 'rod'],
  },
  {
    id: 'hooke', name: 'Hooke\'s law', domain: 'materials', statement: 'Below yield, stress is the elastic modulus times strain.',
    formula: 'σ = E ε', inputs: [q('E', 'elastic modulus', 'Pa'), q('eps', 'strain', '-')], output: q('sigma', 'stress', 'Pa'),
    eval: ({ E, eps }) => E! * eps!, valid: 'Linear elastic range (below the proportional limit).', example: { inputs: { E: 200e9, eps: 0.001 }, output: 200e6 }, source: SHIGLEY, tags: ['stiffness', 'elastic', 'stretch'],
  },
  {
    id: 'stress.bending', name: 'Bending stress', domain: 'structures', statement: 'A beam bent by a moment is stressed most at its outer fibre: the moment over its section modulus.',
    formula: 'σ = M / S', inputs: [q('M', 'bending moment', 'N m'), q('S', 'section modulus I/c', 'm^3')], output: q('sigma', 'stress', 'Pa'),
    eval: ({ M, S }) => M! / S!, valid: 'Elastic, slender beams (Euler-Bernoulli); rectangle S = b h²/6, round S = π d³/32.',
    example: { inputs: { M: 100, S: (0.02 * 0.04 ** 2) / 6 }, output: 18750000 }, source: SHIGLEY, tags: ['beam', 'bending', 'shelf', 'arm'],
  },
  {
    id: 'beam.simply-supported.udl', name: 'Sag of a simply supported beam under a spread load', domain: 'structures',
    statement: 'A beam resting on supports at its ends, loaded evenly, sags most at mid-span by 5 w L^4 over 384 E I (w per metre).',
    formula: 'δ = 5 w L⁴ / (384 E I)', inputs: [q('w', 'load per length', 'N/m'), q('L', 'span', 'm'), q('E', 'modulus', 'Pa'), q('I', 'second moment', 'm^4')], output: q('d', 'mid-span sag', 'm'),
    eval: ({ w, L, E, I }) => (5 * w! * L! ** 4) / (384 * E! * I!), valid: 'Small, elastic sag of a slender beam.', example: { inputs: { w: 1000, L: 2, E: 200e9, I: (0.02 * 0.04 ** 3) / 12 }, output: 0.009765625 }, source: ROARK, tags: ['beam', 'sag', 'shelf', 'table'],
  },
  {
    id: 'beam.simply-supported.point', name: 'Sag of a simply supported beam under a central load', domain: 'structures',
    statement: 'A load at mid-span of a simply supported beam sags it by P L^3 over 48 E I.', formula: 'δ = P L³ / (48 E I)',
    inputs: [q('P', 'load', 'N'), q('L', 'span', 'm'), q('E', 'modulus', 'Pa'), q('I', 'second moment', 'm^4')], output: q('d', 'mid-span sag', 'm'),
    eval: ({ P, L, E, I }) => (P! * L! ** 3) / (48 * E! * I!), valid: 'Small, elastic sag.', example: { inputs: { P: 1000, L: 2, E: 200e9, I: (0.02 * 0.04 ** 3) / 12 }, output: 0.0078125 }, source: ROARK, tags: ['beam', 'sag'],
  },
  {
    id: 'beam.cantilever.point', name: 'Deflection of a cantilever under an end load', domain: 'structures',
    statement: 'A beam fixed at one end and loaded at the other bends there by P L^3 over 3 E I.', formula: 'δ = P L³ / (3 E I)',
    inputs: [q('P', 'end load', 'N'), q('L', 'length', 'm'), q('E', 'modulus', 'Pa'), q('I', 'second moment', 'm^4')], output: q('d', 'tip deflection', 'm'),
    eval: ({ P, L, E, I }) => cantileverDeflection(P!, L!, E!, I!), valid: 'Small, elastic deflection; a truly fixed root.', example: { inputs: { P: 1000, L: 1, E: 200e9, I: (0.02 * 0.04 ** 3) / 12 }, output: 0.015625 }, source: ROARK, tags: ['beam', 'bracket', 'arm', 'shelf'],
    implementedIn: 'engineering/beams.ts cantileverDeflection',
  },
  {
    id: 'buckling.euler', name: 'Euler buckling', domain: 'structures',
    statement: 'A slender strut pushed end to end bows out sideways and collapses at π^2 E I over (K L)^2, K set by how its ends are held.',
    formula: 'P_cr = π² E I / (K L)²', inputs: [q('E', 'modulus', 'Pa'), q('I', 'least second moment', 'm^4'), q('L', 'length', 'm'), q('K', 'effective length factor', '-')], output: q('P', 'buckling load', 'N'),
    eval: ({ E, I, L, K }) => eulerBucklingLoad(E!, I!, L!, K ?? 1), valid: 'Slender struts (well past the Johnson range); K 1 pinned-pinned, 2 fixed-free, 0.7 fixed-pinned, 0.5 fixed-fixed.',
    example: { inputs: { E: 200e9, I: (Math.PI * 0.02 ** 4) / 64, L: 1, K: 1 }, output: 15503.138340149908 }, source: SHIGLEY, tags: ['column', 'leg', 'strut', 'tie rod', 'compression'],
    implementedIn: 'engineering/beams.ts eulerBucklingLoad',
  },
  {
    id: 'torsion.solid', name: 'Shear stress in a twisted round shaft', domain: 'structures',
    statement: 'A solid round shaft carrying a torque is sheared most at its surface: 16 T over π d^3.', formula: 'τ = 16 T / (π d³)',
    inputs: [q('T', 'torque', 'N m'), q('d', 'diameter', 'm')], output: q('tau', 'surface shear stress', 'Pa'),
    eval: ({ T, d }) => (16 * T!) / (Math.PI * d! ** 3), valid: 'Elastic, solid circular section (a keyway raises it).', example: { inputs: { T: 50, d: 0.02 }, output: 31830988.61837906 }, source: SHIGLEY, tags: ['shaft', 'axle', 'torque', 'twist'],
  },
  {
    id: 'torsion.twist', name: 'Angle of twist', domain: 'structures', statement: 'A shaft twists by its torque times its length over its shear modulus times its polar moment.',
    formula: 'θ = T L / (G J)', inputs: [q('T', 'torque', 'N m'), q('L', 'length', 'm'), q('G', 'shear modulus', 'Pa'), q('J', 'polar moment', 'm^4')], output: q('theta', 'twist', 'rad'),
    eval: ({ T, L, G, J }) => (T! * L!) / (G! * J!), valid: 'Elastic; J = π d⁴/32 for a solid round shaft.', example: { inputs: { T: 50, L: 1, G: 79.3e9, J: (Math.PI * 0.02 ** 4) / 32 }, output: 0.040139960426707526 }, source: SHIGLEY, tags: ['shaft', 'stiffness', 'twist'],
  },
  {
    id: 'stress.von-mises', name: 'Von Mises stress', domain: 'materials',
    statement: 'A ductile metal under bending and twisting together yields when root(σ^2 + 3 τ^2) reaches its yield strength.', formula: 'σ\' = √(σ² + 3τ²)',
    inputs: [q('sigma', 'normal stress', 'Pa'), q('tau', 'shear stress', 'Pa')], output: q('s', 'equivalent stress', 'Pa'),
    eval: ({ sigma, tau }) => Math.sqrt(sigma! ** 2 + 3 * tau! ** 2), valid: 'Ductile materials (distortion-energy theory); brittle ones need another criterion.', example: { inputs: { sigma: 100e6, tau: 50e6 }, output: 132287565.55322953 }, source: SHIGLEY, tags: ['yield', 'shaft', 'combined', 'strength'],
  },
  {
    id: 'shaft.diameter.static', name: 'Shaft diameter for bending and torque (static)', domain: 'machine elements',
    statement: 'A solid shaft carrying moment M and torque T needs a diameter of [16 n / (π S_y) · root(4 M^2 + 3 T^2)]^(1/3) for a safety factor n against yield.',
    formula: 'd = [16 n √(4M² + 3T²) / (π S_y)]^(1/3)', inputs: [q('M', 'bending moment', 'N m'), q('T', 'torque', 'N m'), q('n', 'safety factor', '-'), q('Sy', 'yield strength', 'Pa')], output: q('d', 'least diameter', 'm'),
    eval: ({ M, T, n, Sy }) => Math.cbrt(((16 * n!) / (Math.PI * Sy!)) * Math.sqrt(4 * M! ** 2 + 3 * T! ** 2)), valid: 'Steady loads (distortion energy); a rotating shaft also needs a fatigue check.',
    example: { inputs: { M: 30, T: 20, n: 2, Sy: 370e6 }, output: 0.012401465232986781 }, source: SHIGLEY, tags: ['shaft', 'axle', 'size', 'diameter'],
  },
  {
    id: 'thermal.expansion', name: 'Thermal expansion', domain: 'materials', statement: 'A part grows by its expansion coefficient times its length times its temperature rise.',
    formula: 'ΔL = α L ΔT', inputs: [q('alpha', 'expansion coefficient', '1/K'), q('L', 'length', 'm'), q('dT', 'temperature rise', 'K')], output: q('dL', 'growth', 'm'),
    eval: ({ alpha, L, dT }) => alpha! * L! * dT!, valid: 'Moderate temperature changes (α itself varies with temperature).', example: { inputs: { alpha: 23.6e-6, L: 1, dT: 50 }, output: 0.00118 }, source: SHIGLEY, tags: ['heat', 'fit', 'growth'],
  },
  {
    id: 'fatigue.endurance.steel', name: 'Endurance limit of steel', domain: 'materials',
    statement: 'A polished steel test bar survives endless reversed bending below about half its tensile strength (700 MPa at most).',
    formula: 'S_e\' = 0.5 S_ut (S_ut ≤ 1400 MPa)', inputs: [q('Sut', 'tensile strength', 'Pa')], output: q('Se', 'rotating-beam endurance limit', 'Pa'),
    constants: { Smax: { value: 1400e6, unit: 'Pa', name: 'tensile strength above which the limit stops rising' }, Se_max: { value: 700e6, unit: 'Pa', name: 'its ceiling' } },
    eval: ({ Sut, Smax, Se_max }) => (Sut! <= Smax! ? 0.5 * Sut! : Se_max!), valid: 'Steels, polished specimen: a real part takes surface, size, load and reliability factors (Marin) below it.',
    example: { inputs: { Sut: 440e6 }, output: 220e6 }, source: SHIGLEY, tags: ['fatigue', 'shaft', 'vibration', 'life'],
  },
  // ---------------------------------------------------------------- machine elements
  {
    id: 'bearing.life.l10', name: 'Bearing rating life (L10)', domain: 'machine elements',
    statement: 'Ninety per cent of a group of identical bearings outlast (C/P)^p million revolutions: p = 3 for ball bearings, 10/3 for roller bearings.',
    formula: 'L10 = (C / P)^p × 10⁶ rev', inputs: [q('C', 'basic dynamic load rating', 'N'), q('P', 'equivalent dynamic load', 'N'), q('p', 'life exponent', '-')], output: q('L', 'rating life', 'rev'),
    eval: ({ C, P, p }) => (C! / P!) ** (p ?? 3) * 1e6, valid: 'Clean, well-lubricated bearings at normal temperature (ISO 281 basic rating life; a modified life a_ISO adjusts it).',
    example: { inputs: { C: 14.8, P: 1, p: 3 }, output: 3241792000 }, source: ISO281,
    outside: ({ C, P }) => (P! > 0.5 * C! ? `a load past half the dynamic rating (P/C ${(P! / C!).toFixed(2)}) is beyond where rating life is normally used: choose a bigger bearing` : null), tags: ['bearing', 'life', 'wheel', 'axle', 'pillow block'],
  },
  {
    id: 'bearing.life.hours', name: 'Bearing life in hours', domain: 'machine elements', statement: 'A rating life in revolutions, turned at n rpm, lasts L10 / (60 n) hours.',
    formula: 'L10h = L10 / (60 n)', inputs: [q('L', 'rating life', 'rev'), q('n', 'speed', 'rpm')], output: q('h', 'rating life', 'h'),
    eval: ({ L, n }) => L! / (60 * n!), valid: 'Constant speed.', example: { inputs: { L: 3241792000, n: 600 }, output: 90049.7777777778 }, source: ISO281, tags: ['bearing', 'life', 'hours'],
  },
  {
    id: 'spring.rate', name: 'Helical spring rate', domain: 'machine elements', statement: 'A coil spring\'s rate is G d^4 over 8 D^3 n: wire diameter d, coil diameter D, n active coils.',
    formula: 'k = G d⁴ / (8 D³ n)', inputs: [q('G', 'shear modulus', 'Pa'), q('d', 'wire diameter', 'm'), q('D', 'mean coil diameter', 'm'), q('n', 'active coils', '-')], output: q('k', 'rate', 'N/m'),
    eval: ({ G, d, D, n }) => (G! * d! ** 4) / (8 * D! ** 3 * n!), outside: ({ d, D }) => (D! / d! < 4 || D! / d! > 12 ? `spring index ${(D! / d!).toFixed(1)} is outside 4 to 12, where it is hard to coil (low) or buckles and tangles (high)` : null), valid: 'Close-coiled helical springs, spring index 4 to 12.', example: { inputs: { G: 79.3e9, d: 0.005, D: 0.04, n: 8 }, output: 12100.219726562498 }, source: SHIGLEY, tags: ['spring', 'stiffness'],
    implementedIn: 'engineering/springs.ts springRate',
  },
  {
    id: 'capstan', name: 'Capstan (belt friction) equation', domain: 'machine elements',
    statement: 'A rope or belt wrapped round a drum holds a tension ratio of e^(μ θ) between its ends before slipping.', formula: 'T₁ / T₂ = e^(μ θ)',
    inputs: [q('mu', 'friction coefficient', '-'), q('theta', 'wrap angle', 'rad')], output: q('r', 'tension ratio', '-'),
    eval: ({ mu, theta }) => capstanRatio(mu!, theta!), valid: 'Flat belt or rope, no bending stiffness; a V-belt\'s grip is larger by 1/sin(half its groove angle).',
    example: { inputs: { mu: 0.3, theta: Math.PI }, output: 2.566332395208135 }, source: SHIGLEY, tags: ['rope', 'belt', 'winch', 'friction'], implementedIn: 'engineering/mechanics.ts capstanRatio',
  },
  {
    id: 'chain.speed', name: 'Chain speed', domain: 'machine elements', statement: 'A chain moves at the sprocket\'s teeth times the pitch times its revolutions per second.',
    formula: 'v = z p n / 60', inputs: [q('z', 'sprocket teeth', '-'), q('p', 'pitch', 'm'), q('n', 'speed', 'rpm')], output: q('v', 'chain speed', 'm/s'),
    eval: ({ z, p, n }) => (z! * p! * n!) / 60, valid: 'Average speed (it varies by chordal action, more with few teeth).', example: { inputs: { z: 12, p: 0.0127, n: 1000 }, output: 2.54 }, source: SHIGLEY, tags: ['chain', 'sprocket', 'drive'],
  },
  {
    id: 'chain.pull', name: 'Chain pull', domain: 'machine elements', statement: 'A chain carrying power P at speed v is pulled at P over v on its tight side.',
    formula: 'F = P / v', inputs: [q('P', 'power', 'W'), q('v', 'chain speed', 'm/s')], output: q('F', 'tight-side pull', 'N'),
    eval: ({ P, v }) => P! / v!, valid: 'Steady load; shocks need a service factor.', example: { inputs: { P: 150, v: 2.54 }, output: 59.05511811023623 }, source: SHIGLEY, tags: ['chain', 'drive', 'tension'],
  },
  {
    id: 'gear.output.torque', name: 'Torque through a gear train', domain: 'machine elements', statement: 'A gear train multiplies torque by its ratio, less its losses.',
    formula: 'T_out = T_in i η', inputs: [q('T', 'input torque', 'N m'), q('i', 'ratio', '-'), q('eta', 'efficiency', '-')], output: q('Tout', 'output torque', 'N m'),
    eval: ({ T, i, eta }) => T! * i! * eta!, valid: 'Driving forward; driven backwards the losses go the other way (T_in = T_out η / i).', example: { inputs: { T: 0.6, i: 12, eta: 0.81 }, output: 5.832 }, source: SHIGLEY, tags: ['gear', 'gearhead', 'ratio', 'motor'],
    implementedIn: 'engineering/dcmotor.ts throughGear',
  },
  // ---------------------------------------------------------------- electrical
  {
    id: 'ohm', name: 'Ohm\'s law', domain: 'electrical', statement: 'The voltage across a resistance is the current through it times the resistance.', formula: 'V = I R',
    inputs: [q('I', 'current', 'A'), q('R', 'resistance', 'ohm')], output: q('V', 'voltage', 'V'), eval: ({ I, R }) => I! * R!, valid: 'Ohmic conductors at a given temperature.',
    example: { inputs: { I: 20, R: 0.3 }, output: 6 }, source: PHYSICS, tags: ['voltage', 'current', 'wire', 'circuit'], implementedIn: 'physics/electric.ts',
  },
  {
    id: 'joule', name: 'Joule heating', domain: 'electrical', statement: 'Current through a resistance heats it at the current squared times the resistance.', formula: 'P = I² R',
    inputs: [q('I', 'current', 'A'), q('R', 'resistance', 'ohm')], output: q('P', 'heat', 'W'), eval: ({ I, R }) => I! * I! * R!, valid: 'Any conductor.',
    example: { inputs: { I: 20, R: 0.3 }, output: 120 }, source: PHYSICS, tags: ['heat', 'wire', 'motor', 'loss'], implementedIn: 'physics/world.ts bookDrive',
  },
  {
    id: 'wire.resistance', name: 'Resistance of a wire', domain: 'electrical', statement: 'A wire\'s resistance is its resistivity times its length over its cross-section.', formula: 'R = ρ L / A',
    inputs: [q('rho', 'resistivity', 'ohm m'), q('L', 'length', 'm'), q('A', 'section', 'm^2')], output: q('R', 'resistance', 'ohm'), eval: ({ rho, L, A }) => (rho! * L!) / A!,
    valid: 'DC; annealed copper 1/58 ohm mm²/m = 1.724e-8 ohm m at 20 °C (IEC 60028).', example: { inputs: { rho: 1.724e-8, L: 1, A: 2.08e-6 }, output: 0.00828846153846154 }, source: { cite: 'IEC 60028:1925 International standard of resistance for copper', kind: 'standard' }, tags: ['wire', 'cable', 'copper', 'AWG'],
  },
  {
    id: 'copper.tempco', name: 'Copper\'s resistance with temperature', domain: 'electrical', statement: 'Copper grows 0.393% more resistive per kelvin.', formula: 'R(T) = R₀ (1 + α (T − T₀))',
    inputs: [q('R0', 'resistance at T0', 'ohm'), q('T', 'temperature', 'degC'), q('T0', 'reference temperature', 'degC')], output: q('R', 'resistance', 'ohm'),
    constants: { alpha: { value: COPPER_ALPHA, unit: '1/K', name: 'temperature coefficient of copper' } },
    eval: ({ R0, T, T0, alpha }) => R0! * (1 + alpha! * (T! - T0!)), outside: ({ T }) => (T! < -50 || T! > 200 ? `${T} °C is outside where copper's coefficient is near constant (-50 to 200 °C)` : null), valid: 'About -50 to 200 °C; α = 0.00393/K at 20 °C.', example: { inputs: { R0: 0.317, T: 100, T0: 25 }, output: 0.41043575 }, source: { cite: 'IEC 60028', kind: 'standard' }, tags: ['motor', 'winding', 'heat', 'wire'],
    implementedIn: 'engineering/dcmotor.ts windingR',
  },
  {
    id: 'wire.drop', name: 'Voltage drop along a pair', domain: 'electrical', statement: 'A current out and back along two conductors drops I times twice the run times the resistance per metre.',
    formula: 'ΔV = 2 I L R\'', inputs: [q('I', 'current', 'A'), q('L', 'run length', 'm'), q('Rm', 'resistance per metre', 'ohm/m')], output: q('dV', 'drop', 'V'),
    eval: ({ I, L, Rm }) => 2 * I! * L! * Rm!, valid: 'DC; at the conductor\'s temperature.', example: { inputs: { I: 20, L: 1, Rm: 0.008286 }, output: 0.33144 }, source: PHYSICS, tags: ['wire', 'cable', 'battery', 'drop'],
  },
  {
    id: 'motor.torque', name: 'DC motor torque', domain: 'electrical', statement: 'A permanent-magnet DC motor\'s torque is its torque constant times its current.', formula: 'T = K_t I',
    inputs: [q('Kt', 'torque constant', 'N m/A'), q('I', 'current', 'A')], output: q('T', 'torque', 'N m'), eval: ({ Kt, I }) => Kt! * I!, valid: 'Below magnetic saturation; less its friction torque K_t I_0 at the shaft.',
    example: { inputs: { Kt: 0.0302, I: 20 }, output: 0.604 }, source: { cite: 'maxon, The selection of high-precision microdrives; Hughes, Electric Motors and Drives, 4th ed.' }, tags: ['motor', 'torque', 'current'],
    implementedIn: 'engineering/dcmotor.ts shaftTorque',
  },
  {
    id: 'motor.back-emf', name: 'Back-EMF', domain: 'electrical', statement: 'A turning DC motor makes a voltage against its supply: its speed constant times its speed (K_e = K_t in SI).', formula: 'E = K_e ω',
    inputs: [q('Ke', 'back-EMF constant', 'V s/rad'), q('w', 'speed', 'rad/s')], output: q('E', 'back-EMF', 'V'), eval: ({ Ke, w }) => Ke! * w!, valid: 'Any PMDC motor; K_e in V s/rad equals K_t in N m/A.',
    example: { inputs: { Ke: 0.0302, w: 500 }, output: 15.1 }, source: { cite: 'Hughes, Electric Motors and Drives, 4th ed.' }, tags: ['motor', 'speed', 'voltage'],
  },
  {
    id: 'motor.current', name: 'DC motor current', domain: 'electrical', statement: 'A motor draws what the applied voltage less its back-EMF drives through its winding.', formula: 'I = (V − K_e ω) / R',
    inputs: [q('V', 'applied voltage', 'V'), q('Ke', 'back-EMF constant', 'V s/rad'), q('w', 'speed', 'rad/s'), q('R', 'winding resistance', 'ohm')], output: q('I', 'current', 'A'),
    eval: ({ V, Ke, w, R }) => (V! - Ke! * w!) / R!, outside: ({ V, Ke, w }) => (Ke! * w! > V! ? 'turning faster than its no-load speed at this voltage, it generates instead of draws' : null), valid: 'Steady state (the winding\'s inductance only delays it, by L/R).', example: { inputs: { V: 24, Ke: 0.0302, w: 500, R: 0.299 }, output: 29.765886287625413 }, source: { cite: 'Hughes, Electric Motors and Drives, 4th ed.' }, tags: ['motor', 'current', 'battery'],
    implementedIn: 'physics/electric.ts loadCurrent',
  },
  {
    id: 'motor.time-constant', name: 'Mechanical time constant', domain: 'electrical', statement: 'An unloaded motor reaches 63% of its no-load speed in R J over K_t^2.', formula: 'τ_m = R J / K_t²',
    inputs: [q('R', 'winding resistance', 'ohm'), q('J', 'inertia', 'kg m^2'), q('Kt', 'torque constant', 'N m/A')], output: q('tau', 'time constant', 's'), eval: ({ R, J, Kt }) => (R! * J!) / (Kt! * Kt!),
    valid: 'No current limit, inertia J of all that turns (rotor plus load reflected through the gear as J/N²).', example: { inputs: { R: 0.299, J: 142e-7, Kt: 0.0302 }, output: 0.004655278277268541 }, source: { cite: 'maxon, Key information on motor data (mechanical time constant)' }, tags: ['motor', 'response', 'acceleration'],
  },
  {
    id: 'lead-acid.ocv', name: 'Lead-acid open-circuit voltage', domain: 'electrical', statement: 'A lead-acid cell rests at about 0.85 V plus its acid\'s specific gravity.', formula: 'V_cell ≈ 0.85 + SG',
    inputs: [q('SG', 'specific gravity of the acid', '-')], output: q('V', 'cell voltage', 'V'),
    constants: { V0: { value: 0.85, unit: 'V', name: 'offset of the rule' }, kSG: { value: 1, unit: 'V', name: 'volts per unit of specific gravity' } },
    eval: ({ SG, V0, kSG }) => V0! + kSG! * SG!, outside: ({ SG }) => (SG! < 1.05 || SG! > 1.32 ? `specific gravity ${SG} is outside a lead-acid cell's 1.05 (flat) to 1.32 (charged)` : null),
    valid: 'At rest (hours after charge or discharge), 25 °C; VRLA acid about 1.30 charged, 1.10 flat.', example: { inputs: { SG: 1.28 }, output: 2.13 }, source: { cite: 'Linden & Reddy, Handbook of Batteries, 3rd ed., ch. 23 (lead-acid)' }, tags: ['battery', 'charge', 'voltage'],
    implementedIn: 'engineering/battery.ts cellOCV (SG from charge: ' + cellOCV(1).toFixed(2) + ' V charged)',
  },
  {
    id: 'energy.electric', name: 'Electrical energy', domain: 'electrical', statement: 'Energy delivered is voltage times current times time.', formula: 'E = V I t',
    inputs: [q('V', 'voltage', 'V'), q('I', 'current', 'A'), q('t', 'time', 's')], output: q('E', 'energy', 'J'), eval: ({ V, I, t }) => V! * I! * t!, valid: 'Steady V and I (else integrate).',
    example: { inputs: { V: 24, I: 10, t: 3600 }, output: 864000 }, source: PHYSICS, tags: ['battery', 'energy', 'runtime'],
  },
  // ---------------------------------------------------------------- thermal
  {
    id: 'convection', name: 'Newton\'s law of cooling', domain: 'thermal', statement: 'A surface loses heat to a fluid at its heat transfer coefficient times its area times its temperature excess.', formula: 'q = h A ΔT',
    inputs: [q('h', 'heat transfer coefficient', 'W/m^2 K'), q('A', 'area', 'm^2'), q('dT', 'temperature excess', 'K')], output: q('q', 'heat flow', 'W'), eval: ({ h, A, dT }) => h! * A! * dT!, outside: ({ h }) => (h! < 2 || h! > 20000 ? `h ${h} W/m² K is outside still air (2) to boiling water (20000)` : null),
    valid: 'h: still air 2 to 25, moving air 25 to 250, water 50 to 20000 W/m² K.', example: { inputs: { h: 10, A: 0.1, dT: 50 }, output: 50 }, source: INCROPERA, tags: ['heat', 'cooling', 'motor', 'air'],
    implementedIn: 'engineering/thermal.ts heatLoss',
  },
  {
    id: 'conduction', name: 'Fourier\'s law', domain: 'thermal', statement: 'Heat conducts through a wall at its conductivity times its area times the temperature difference over its thickness.', formula: 'q = k A ΔT / L',
    inputs: [q('k', 'conductivity', 'W/m K'), q('A', 'area', 'm^2'), q('dT', 'temperature difference', 'K'), q('L', 'thickness', 'm')], output: q('q', 'heat flow', 'W'), eval: ({ k, A, dT, L }) => (k! * A! * dT!) / L!,
    valid: 'Steady, one-dimensional.', example: { inputs: { k: 200, A: 0.01, dT: 50, L: 0.1 }, output: 1000 }, source: INCROPERA, tags: ['heat', 'conduction'],
  },
  {
    id: 'radiation', name: 'Stefan-Boltzmann radiation', domain: 'thermal', statement: 'A surface radiates at its emissivity times σ times its area times the fourth powers of absolute temperature, less what it receives.', formula: 'q = ε σ A (T⁴ − T∞⁴)',
    inputs: [q('eps', 'emissivity', '-'), q('A', 'area', 'm^2'), q('T', 'surface temperature', 'K'), q('Tinf', 'surroundings', 'K')], output: q('q', 'net heat flow', 'W'), constants: { sigma: { value: SIGMA_SB, unit: 'W/m^2 K^4', name: 'Stefan-Boltzmann constant' } }, eval: ({ eps, A, T, Tinf, sigma }) => eps! * sigma! * A! * (T! ** 4 - Tinf! ** 4),
    outside: ({ eps }) => (eps! < 0 || eps! > 1 ? `emissivity ${eps} is outside 0 to 1` : null),
    valid: 'Grey surface seeing large surroundings.', example: { inputs: { eps: 0.9, A: 0.1, T: 373.15, Tinf: 293.15 }, output: 61.25474056958109 }, source: INCROPERA, tags: ['heat', 'glow', 'radiation'],
    implementedIn: 'engineering/thermal.ts heatLoss',
  },
  {
    id: 'heat.capacity', name: 'Heat capacity', domain: 'thermal', statement: 'Warming a mass takes its specific heat times its mass times the temperature rise.', formula: 'Q = m c ΔT',
    inputs: [q('m', 'mass', 'kg'), q('c', 'specific heat', 'J/kg K'), q('dT', 'temperature rise', 'K')], output: q('Q', 'heat', 'J'), eval: ({ m, c, dT }) => m! * c! * dT!,
    valid: 'No phase change.', example: { inputs: { m: 1, c: 460, dT: 10 }, output: 4600 }, source: INCROPERA, tags: ['heat', 'temperature'],
  },
  {
    id: 'lumped.time-constant', name: 'Lumped thermal time constant', domain: 'thermal', statement: 'A small, well-conducting body cools toward its surroundings with time constant m c over h A.', formula: 'τ = m c / (h A)',
    inputs: [q('m', 'mass', 'kg'), q('c', 'specific heat', 'J/kg K'), q('h', 'heat transfer coefficient', 'W/m^2 K'), q('A', 'area', 'm^2')], output: q('tau', 'time constant', 's'), eval: ({ m, c, h, A }) => (m! * c!) / (h! * A!),
    valid: 'Biot number h L/k below 0.1.', example: { inputs: { m: 1, c: 460, h: 10, A: 0.1 }, output: 460 }, source: INCROPERA, tags: ['heat', 'cooling', 'time'],
  },
  {
    id: 'thermal.network', name: 'Temperature rise through thermal resistances', domain: 'thermal', statement: 'A steady loss flowing through resistances in series raises the temperature by the loss times their sum.', formula: 'ΔT = P Σ R_th',
    inputs: [q('P', 'heat flow', 'W'), q('R', 'sum of thermal resistances', 'K/W')], output: q('dT', 'temperature rise', 'K'), eval: ({ P, R }) => P! * R!,
    valid: 'Steady state.', example: { inputs: { P: 10, R: 1.93 + 4.65 }, output: 65.8 }, source: INCROPERA, tags: ['motor', 'heat', 'winding'], implementedIn: 'engineering/dcmotor.ts heatStep',
  },
  // ---------------------------------------------------------------- fluids
  {
    id: 'buckling.johnson', name: 'Johnson column formula', domain: 'structures',
    statement: 'A strut too short for Euler\'s formula (stockier than the transition slenderness) fails by yielding and bowing together: A [S_y − (S_y K L / r)² / (4π² E)].',
    formula: 'P_cr = A [S_y − (S_y K L/r)² / (4π² E)]', inputs: [q('A', 'section area', 'm^2'), q('Sy', 'yield strength', 'Pa'), q('E', 'modulus', 'Pa'), q('K', 'effective length factor', '-'), q('L', 'length', 'm'), q('r', 'radius of gyration', 'm')], output: q('P', 'critical load', 'N'),
    eval: ({ A, Sy, E, K, L, r }) => A! * (Sy! - (Sy! * K! * L! / r!) ** 2 / (4 * Math.PI ** 2 * E!)),
    outside: ({ Sy, E, K, L, r }) => (K! * L! / r! >= Math.sqrt((2 * Math.PI ** 2 * E!) / Sy!) ? `slenderness ${(K! * L! / r!).toFixed(0)} is past the transition ${Math.sqrt((2 * Math.PI ** 2 * E!) / Sy!).toFixed(0)}: Euler\'s formula holds there` : null),
    valid: 'Slenderness K L/r below the transition √(2π² E/S_y); r = d/4 for a round bar.', example: { inputs: { A: (Math.PI / 4) * 0.008 ** 2, Sy: 370e6, E: 200e9, K: 1, L: 0.15, r: 0.002 }, output: 13695.858374663472 },
    source: SHIGLEY, tags: ['column', 'strut', 'tie rod', 'short', 'compression'],
  },
  {
    id: 'slenderness.transition', name: 'Euler-Johnson transition slenderness', domain: 'structures', statement: 'Struts more slender than √(2π² E/S_y) buckle elastically (Euler); stockier ones yield first (Johnson).',
    formula: '(K L/r)₁ = √(2π² E / S_y)', inputs: [q('E', 'modulus', 'Pa'), q('Sy', 'yield strength', 'Pa')], output: q('s', 'transition slenderness', '-'),
    eval: ({ E, Sy }) => Math.sqrt((2 * Math.PI ** 2 * E!) / Sy!), valid: 'Pin-ended columns of ductile material.', example: { inputs: { E: 200e9, Sy: 370e6 }, output: 103.29493015522243 }, source: SHIGLEY, tags: ['column', 'buckling', 'strut'],
  },
  {
    id: 'natural.frequency', name: 'Natural frequency of a mass on a spring', domain: 'mechanics', statement: 'A mass on a spring rings at one over two pi of the root of stiffness over mass.',
    formula: 'f = (1/2π) √(k/m)', inputs: [q('k', 'stiffness', 'N/m'), q('m', 'mass', 'kg')], output: q('f', 'frequency', 'Hz'),
    eval: ({ k, m }) => Math.sqrt(k! / m!) / (2 * Math.PI), valid: 'Undamped, single degree of freedom (damping lowers it by √(1 − ζ²)).', example: { inputs: { k: 10000, m: 2 }, output: 11.253953951963828 }, source: PHYSICS, tags: ['vibration', 'spring', 'resonance', 'suspension'],
  },
  {
    id: 'centripetal', name: 'Centripetal force', domain: 'mechanics', statement: 'Moving round a circle takes a force toward its centre of mass times speed squared over radius.',
    formula: 'F = m v² / r', inputs: [q('m', 'mass', 'kg'), q('v', 'speed', 'm/s'), q('r', 'radius', 'm')], output: q('F', 'centripetal force', 'N'),
    eval: ({ m, v, r }) => (m! * v! * v!) / r!, valid: 'Steady circular motion.', example: { inputs: { m: 120, v: 5, r: 10 }, output: 300 }, source: PHYSICS, tags: ['turn', 'circle', 'vehicle', 'rotation'],
  },
  {
    id: 'inertia.disc', name: 'Moment of inertia of a disc', domain: 'mechanics', statement: 'A solid disc or cylinder turning about its axis has half its mass times its radius squared.',
    formula: 'I = ½ m r²', inputs: [q('m', 'mass', 'kg'), q('r', 'radius', 'm')], output: q('I', 'moment of inertia', 'kg m^2'),
    eval: ({ m, r }) => 0.5 * m! * r! * r!, valid: 'Uniform solid disc about its own axis (a ring is m r²).', example: { inputs: { m: 3, r: 0.125 }, output: 0.0234375 }, source: PHYSICS, tags: ['inertia', 'wheel', 'flywheel', 'rotation'],
  },
  {
    id: 'inertia.rod-end', name: 'Moment of inertia of a rod about its end', domain: 'mechanics', statement: 'A slender rod swung about one end has a third of its mass times its length squared.',
    formula: 'I = m L² / 3', inputs: [q('m', 'mass', 'kg'), q('L', 'length', 'm')], output: q('I', 'moment of inertia', 'kg m^2'),
    eval: ({ m, L }) => (m! * L! * L!) / 3, valid: 'Slender uniform rod (about its middle it is m L²/12).', example: { inputs: { m: 2, L: 1 }, output: 0.6666666666666666 }, source: PHYSICS, tags: ['inertia', 'arm', 'lever', 'catapult'],
  },
  {
    id: 'parallel-axis', name: 'Parallel axis theorem', domain: 'mechanics', statement: 'About an axis a distance d from the centre of mass, the inertia is the central one plus mass times d squared.',
    formula: 'I = I_cm + m d²', inputs: [q('Icm', 'inertia about the centre of mass', 'kg m^2'), q('m', 'mass', 'kg'), q('d', 'offset', 'm')], output: q('I', 'moment of inertia', 'kg m^2'),
    eval: ({ Icm, m, d }) => Icm! + m! * d! * d!, valid: 'Parallel axes, rigid body.', example: { inputs: { Icm: 0.01, m: 2, d: 0.3 }, output: 0.19 }, source: PHYSICS, tags: ['inertia', 'rotation'],
  },
  {
    id: 'energy.rotational', name: 'Rotational kinetic energy', domain: 'mechanics', statement: 'A spinning body holds half its moment of inertia times its angular speed squared.',
    formula: 'E = ½ I ω²', inputs: [q('I', 'moment of inertia', 'kg m^2'), q('w', 'angular speed', 'rad/s')], output: q('E', 'energy', 'J'),
    eval: ({ I, w }) => 0.5 * I! * w! * w!, valid: 'Rigid body about a fixed axis.', example: { inputs: { I: 0.002, w: 100 }, output: 10 }, source: PHYSICS, tags: ['energy', 'flywheel', 'rotor', 'spin'],
  },
  {
    id: 'free-fall.speed', name: 'Speed after a fall', domain: 'mechanics', statement: 'Dropped from rest through a height, a body arrives at the root of twice gravity times the height.',
    formula: 'v = √(2 g h)', inputs: [q('h', 'height', 'm')], output: q('v', 'impact speed', 'm/s'), constants: G,
    eval: ({ h, g: gg }) => Math.sqrt(2 * gg! * h!), valid: 'No air drag (it matters past a few metres for light things).', example: { inputs: { h: 1.5 }, output: 5.424016039799293 }, source: PHYSICS, tags: ['drop', 'impact', 'fall'],
  },
  {
    id: 'spring.energy', name: 'Energy in a spring', domain: 'mechanics', statement: 'A spring stretched or squeezed from rest holds half its rate times the stretch squared.',
    formula: 'E = ½ k x²', inputs: [q('k', 'rate', 'N/m'), q('x', 'deflection', 'm')], output: q('E', 'stored energy', 'J'),
    eval: ({ k, x }) => 0.5 * k! * x! * x!, valid: 'Linear spring, below its solid length and its yield.', example: { inputs: { k: 12100, x: 0.02 }, output: 2.42 }, source: PHYSICS, tags: ['spring', 'launcher', 'energy'], implementedIn: 'physics/energy.ts springEnergy',
  },
  {
    id: 'stress.hoop', name: 'Hoop stress in a thin-walled cylinder', domain: 'structures', statement: 'Pressure inside a thin tube pulls its wall round the circumference at pressure times radius over wall thickness.',
    formula: 'σ = p r / t', inputs: [q('p', 'internal pressure', 'Pa'), q('r', 'mean radius', 'm'), q('t', 'wall', 'm')], output: q('sigma', 'hoop stress', 'Pa'),
    eval: ({ p, r, t }) => (p! * r!) / t!, outside: ({ r, t }) => (t! > r! / 10 ? `a wall of ${(t! / r!).toFixed(2)} of its radius is thick: use Lamé\'s equations` : null),
    valid: 'Wall under a tenth of the radius; axial stress is half this.', example: { inputs: { p: 1e6, r: 0.05, t: 0.002 }, output: 25e6 }, source: SHIGLEY, tags: ['pressure', 'tank', 'tube', 'pipe'],
  },
  {
    id: 'weld.fillet.shear', name: 'Shear in a fillet weld', domain: 'structures', statement: 'A fillet weld carries its load as shear on its throat: 0.707 of its leg times its length.',
    formula: 'τ = F / (0.707 a L)', inputs: [q('F', 'load', 'N'), q('a', 'leg', 'm'), q('L', 'weld length', 'm')], output: q('tau', 'throat shear', 'Pa'),
    eval: ({ F, a, L }) => F! / (0.707 * a! * L!), valid: 'Equal-leg fillet, load along or across it (the throat method).', example: { inputs: { F: 10000, a: 0.005, L: 0.1 }, output: 28288543.140028287 }, source: SHIGLEY, tags: ['weld', 'fillet', 'frame', 'steel'], implementedIn: 'engineering/joining.ts filletWeldCapacity',
  },
  {
    id: 'bolt.torque.nut-factor', name: 'Bolt tightening torque (nut factor)', domain: 'machine elements', statement: 'Tightening a bolt to a preload takes about a nut factor (0.2 dry steel) times the preload times its diameter.',
    formula: 'T = K F d', inputs: [q('K', 'nut factor', '-'), q('F', 'preload', 'N'), q('d', 'nominal diameter', 'm')], output: q('T', 'wrench torque', 'N m'),
    eval: ({ K, F, d }) => K! * F! * d!, outside: ({ K }) => (K! < 0.1 || K! > 0.35 ? `nut factor ${K} is outside 0.1 (lubricated) to 0.3 (dry, rough)` : null),
    valid: 'Quick estimate; the world uses VDI 2230 (thread and head friction separately).', example: { inputs: { K: 0.2, F: 10000, d: 0.008 }, output: 16 }, source: SHIGLEY, tags: ['bolt', 'torque', 'preload', 'wrench'], implementedIn: 'engineering/bolts.ts tighteningTorque (VDI 2230)',
  },
  {
    id: 'power.electric', name: 'Electrical power', domain: 'electrical', statement: 'Power is voltage times current.', formula: 'P = V I',
    inputs: [q('V', 'voltage', 'V'), q('I', 'current', 'A')], output: q('P', 'power', 'W'), eval: ({ V, I }) => V! * I!, valid: 'DC, or instantaneous.', example: { inputs: { V: 24, I: 10 }, output: 240 }, source: PHYSICS, tags: ['power', 'battery', 'motor'],
  },
  {
    id: 'belt.speed', name: 'Belt or rim speed', domain: 'machine elements', statement: 'A pulley\'s rim moves at pi times its diameter times its revolutions per second.',
    formula: 'v = π D n / 60', inputs: [q('D', 'diameter', 'm'), q('n', 'speed', 'rpm')], output: q('v', 'rim speed', 'm/s'),
    eval: ({ D, n }) => (Math.PI * D! * n!) / 60, valid: 'No slip.', example: { inputs: { D: 0.1, n: 1500 }, output: 7.853981633974483 }, source: SHIGLEY, tags: ['belt', 'pulley', 'wheel', 'speed'],
  },
  {
    id: 'reynolds', name: 'Reynolds number', domain: 'fluids', statement: 'Flow is smooth (laminar) or churning (turbulent) by the ratio of inertia to viscosity: density times speed times size over viscosity.',
    formula: 'Re = ρ v L / μ', inputs: [q('rho', 'density', 'kg/m^3'), q('v', 'speed', 'm/s'), q('L', 'size', 'm'), q('mu', 'dynamic viscosity', 'Pa s')], output: q('Re', 'Reynolds number', '-'),
    eval: ({ rho, v, L, mu }) => (rho! * v! * L!) / mu!, valid: 'Pipe flow laminar below about 2300, turbulent above about 4000.', example: { inputs: { rho: 1000, v: 2, L: 0.05, mu: 1.0e-3 }, output: 100000 }, source: { cite: 'White, Fluid Mechanics, 8th ed., McGraw-Hill 2016', kind: 'textbook' }, tags: ['water', 'air', 'flow', 'pipe'],
  },
  {
    id: 'darcy-weisbach', name: 'Pressure drop in a pipe (Darcy-Weisbach)', domain: 'fluids', statement: 'Flow down a pipe loses pressure by its friction factor times length over diameter times the dynamic pressure.',
    formula: 'Δp = f (L/D) ρ v² / 2', inputs: [q('f', 'Darcy friction factor', '-'), q('L', 'length', 'm'), q('D', 'bore', 'm'), q('rho', 'density', 'kg/m^3'), q('v', 'mean speed', 'm/s')], output: q('dp', 'pressure drop', 'Pa'),
    eval: ({ f, L, D, rho, v }) => (f! * (L! / D!) * rho! * v! * v!) / 2, valid: 'Fully developed flow; f = 64/Re laminar, from the Moody chart (Colebrook) turbulent.', example: { inputs: { f: 0.02, L: 10, D: 0.05, rho: 1000, v: 2 }, output: 8000 }, source: { cite: 'White, Fluid Mechanics, 8th ed., McGraw-Hill 2016', kind: 'textbook' }, tags: ['pipe', 'water', 'pump', 'pressure'],
  },
  {
    id: 'thermal.resistance.conduction', name: 'Thermal resistance of a wall', domain: 'thermal', statement: 'A wall resists heat by its thickness over its conductivity times its area.',
    formula: 'R_th = L / (k A)', inputs: [q('L', 'thickness', 'm'), q('k', 'conductivity', 'W/m K'), q('A', 'area', 'm^2')], output: q('R', 'thermal resistance', 'K/W'),
    eval: ({ L, k, A }) => L! / (k! * A!), valid: 'Steady, one-dimensional.', example: { inputs: { L: 0.1, k: 200, A: 0.01 }, output: 0.05 }, source: INCROPERA, tags: ['heat', 'insulation', 'heat sink'],
  },
  {
    id: 'composite.rule-of-mixtures', name: 'Rule of mixtures (along the fibre)', domain: 'materials',
    statement: 'Loaded along its fibres, a composite is as stiff as its fibre and matrix in proportion to how much of each it holds.',
    formula: 'E₁ = V_f E_f + (1 − V_f) E_m', inputs: [q('Vf', 'fibre volume fraction', '-'), q('Ef', 'fibre modulus', 'Pa'), q('Em', 'matrix modulus', 'Pa')], output: q('E', 'longitudinal modulus', 'Pa'),
    eval: ({ Vf, Ef, Em }) => Vf! * Ef! + (1 - Vf!) * Em!, outside: ({ Vf }) => (Vf! < 0 || Vf! > 0.7 ? `a fibre fraction of ${Vf} is outside what can be made (0 to about 0.7)` : null),
    valid: 'Continuous, aligned, well-bonded fibre (Voigt bound); printed parts hold fibre only in some layers, so the part\'s V_f is the fibre\'s share of the whole.',
    example: { inputs: { Vf: 0.3, Ef: 60e9, Em: 2.4e9 }, output: 19680000000 }, source: { cite: 'Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996', kind: 'textbook' }, tags: ['composite', 'carbon fiber', 'stiffness', '3d printing'],
  },
  {
    id: 'composite.transverse', name: 'Inverse rule of mixtures (across the fibre)', domain: 'materials',
    statement: 'Loaded across its fibres, a composite is barely stiffer than its matrix: fibre and matrix act in series.',
    formula: '1/E₂ = V_f/E_f + (1 − V_f)/E_m', inputs: [q('Vf', 'fibre volume fraction', '-'), q('Ef', 'fibre modulus (transverse)', 'Pa'), q('Em', 'matrix modulus', 'Pa')], output: q('E', 'transverse modulus', 'Pa'),
    eval: ({ Vf, Ef, Em }) => 1 / (Vf! / Ef! + (1 - Vf!) / Em!), valid: 'A lower (Reuss) bound; carbon fibre is itself much less stiff across than along, which lowers it further.',
    example: { inputs: { Vf: 0.3, Ef: 60e9, Em: 2.4e9 }, output: 3370786516.853933 }, source: { cite: 'Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996', kind: 'textbook' }, tags: ['composite', 'carbon fiber', 'anisotropy', '3d printing'],
  },
  {
    id: 'sinter.scale', name: 'Scale-up for sintering shrinkage', domain: 'materials', statement: 'A part that shrinks by a fraction s as it sinters is printed 1/(1 − s) times its final size.',
    formula: 'k = 1 / (1 − s)', inputs: [q('s', 'linear sintering shrinkage', '-')], output: q('k', 'print scale', '-'),
    eval: ({ s }) => 1 / (1 - s!), outside: ({ s }) => (s! <= 0 || s! >= 0.4 ? `a shrinkage of ${s} is outside sintered metal\'s (about 0.1 to 0.25)` : null),
    valid: 'Uniform shrinkage (gravity and friction on the setter make it slightly uneven in practice).', example: { inputs: { s: 0.167 }, output: 1.2004801920768309 },
    source: { cite: 'German, Sintering: From Empirical Observations to Scientific Principles, Elsevier 2014', kind: 'textbook' }, tags: ['sinter', 'metal', '3d printing', 'shrinkage'],
  },
  {
    id: 'buoyancy', name: 'Archimedes\' principle', domain: 'fluids', statement: 'A body in a fluid is pushed up by the weight of the fluid it displaces.', formula: 'F = ρ g V',
    inputs: [q('rho', 'fluid density', 'kg/m^3'), q('V', 'displaced volume', 'm^3')], output: q('F', 'buoyancy', 'N'), constants: G, eval: ({ rho, V, g: gg }) => rho! * gg! * V!,
    valid: 'Fluid at rest.', example: { inputs: { rho: 1000, V: 0.001 }, output: 9.80665 }, source: PHYSICS, tags: ['water', 'float', 'raft'], implementedIn: 'physics/world.ts applyFluids',
  },
  {
    id: 'hydrostatic', name: 'Hydrostatic pressure', domain: 'fluids', statement: 'Pressure in a still liquid rises with depth by its density times gravity times the depth.', formula: 'p = ρ g h',
    inputs: [q('rho', 'density', 'kg/m^3'), q('h', 'depth', 'm')], output: q('p', 'gauge pressure', 'Pa'), constants: G, eval: ({ rho, h, g: gg }) => rho! * gg! * h!,
    valid: 'Incompressible, at rest.', example: { inputs: { rho: 1000, h: 2 }, output: 19613.3 }, source: PHYSICS, tags: ['water', 'tank', 'pressure'],
  },
  // ---------------------------------------------------------------- ways of making motion (working principles)
  {
    id: 'lorentz.force', name: 'Lorentz force on a conductor', domain: 'magnetism',
    statement: 'A conductor carrying current across a magnetic field is pushed sideways by the flux density times the current times the length in the field: how every motor, rotary or linear, makes force.',
    formula: 'F = B I L', inputs: [q('B', 'flux density', 'T'), q('I', 'current', 'A'), q('L', 'conductor length in the field', 'm')], output: q('F', 'force', 'N'),
    eval: ({ B, I, L }) => B! * I! * L!, outside: ({ B }) => (B! > 2.2 ? `${B} T is past what iron carries (it saturates near 2 T)` : null),
    valid: 'Conductor at right angles to a uniform field; a motor sums it over every conductor in its gap (K_t = B L r × conductors).', example: { inputs: { B: 1, I: 10, L: 0.5 }, output: 5 }, source: PHYSICS, tags: ['motor', 'magnet', 'linear motor', 'voice coil', 'force'],
  },
  {
    id: 'magnetic.pull', name: 'Magnetic pull across a gap (Maxwell)', domain: 'magnetism',
    statement: 'A magnetic field crossing a gap between iron faces pulls them together by the flux density squared times the area over twice the permeability of free space: how solenoids, relays and electromagnets pull.',
    formula: 'F = B² A / (2 μ₀)', inputs: [q('B', 'flux density in the gap', 'T'), q('A', 'pole face area', 'm^2')], output: q('F', 'pull', 'N'),
    constants: { mu0: { value: 1.25663706212e-6, unit: 'N/A^2', name: 'permeability of free space (CODATA 2018)' } },
    eval: ({ B, A, mu0 }) => (B! * B! * A!) / (2 * mu0!), outside: ({ B }) => (B! > 2.2 ? `${B} T is past what iron carries (it saturates near 2 T)` : null),
    valid: 'Uniform field across a small gap between flat iron faces; the field itself falls as the gap opens, so the pull falls steeply with stroke.', example: { inputs: { B: 1, A: 1e-4 }, output: 39.788735751313816 }, source: { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013, ch. 1 (force on iron)', kind: 'textbook' }, tags: ['solenoid', 'electromagnet', 'magnet', 'relay', 'pull'],
  },
  {
    id: 'electrostatic.pull', name: 'Electrostatic pull between plates', domain: 'electrical',
    statement: 'Two plates at different voltages pull together by the permittivity times the area times the voltage squared over twice the gap squared: strong only across tiny gaps (MEMS, electroadhesion).',
    formula: 'F = ε₀ ε_r A V² / (2 d²)', inputs: [q('er', 'relative permittivity', '-'), q('A', 'plate area', 'm^2'), q('V', 'voltage', 'V'), q('d', 'gap', 'm')], output: q('F', 'pull', 'N'),
    constants: { eps0: { value: 8.8541878128e-12, unit: 'F/m', name: 'permittivity of free space (CODATA 2018)' } },
    eval: ({ er, A, V, d, eps0 }) => (eps0! * er! * A! * V! * V!) / (2 * d! * d!), outside: ({ V, d }) => (V! / d! > 3e6 ? `${(V! / d! / 1e6).toFixed(1)} MV/m is past air's breakdown (about 3 MV/m): it would arc` : null),
    valid: 'Parallel plates, gap small against their size.', example: { inputs: { er: 1, A: 0.01, V: 100, d: 1e-4 }, output: 0.04427093906400001 }, source: PHYSICS, tags: ['electrostatic', 'mems', 'capacitor', 'actuator'],
  },
  {
    id: 'piezo.stroke', name: 'Piezo stack stroke', domain: 'materials',
    statement: 'A stack of piezoelectric layers grows by the number of layers times its charge constant times the voltage on each: micrometres, with great force.',
    formula: 'ΔL = n d₃₃ V', inputs: [q('n', 'layers', '-'), q('d33', 'piezoelectric charge constant', 'm/V'), q('V', 'voltage per layer', 'V')], output: q('dL', 'free stroke', 'm'),
    eval: ({ n, d33, V }) => n! * d33! * V!, outside: ({ d33 }) => (d33! > 1e-9 ? `d33 of ${d33} m/V is past even soft PZT's (about 600 pm/V)` : null),
    valid: 'Free stroke (no load); held still it pushes its blocked force instead. PZT d33 about 300 to 600 pm/V.', example: { inputs: { n: 100, d33: 5e-10, V: 100 }, output: 5e-6 }, source: { cite: 'Uchino, Piezoelectric Actuators and Ultrasonic Motors, Kluwer 1997', kind: 'textbook' }, tags: ['piezo', 'actuator', 'precision', 'micro'],
  },
  {
    id: 'thrust.ideal-static', name: 'Ideal static thrust of a rotor (momentum theory)', domain: 'fluids',
    statement: 'A propeller or rotor of disc area A, putting power P into still fluid of density ρ, can at most push (2 ρ A P²)^⅓: a bigger disc gives more thrust per watt.',
    formula: 'T = (2 ρ A P²)^(1/3)', inputs: [q('rho', 'fluid density', 'kg/m^3'), q('A', 'disc area', 'm^2'), q('P', 'shaft power', 'W')], output: q('T', 'thrust', 'N'),
    eval: ({ rho, A, P }) => Math.cbrt(2 * rho! * A! * P! * P!),
    valid: 'Ideal actuator disc, hovering or static, uniform inflow: a real propeller makes about 60 to 80% of the ideal (its figure of merit), and less as it moves forward.', example: { inputs: { rho: 1.225, A: 0.07068583470577035, P: 100 }, output: 12.008796675640253 }, source: { cite: 'Leishman, Principles of Helicopter Aerodynamics, 2nd ed., Cambridge 2006, ch. 2 (momentum theory)', kind: 'textbook' }, tags: ['propeller', 'thrust', 'boat', 'drone', 'fan', 'fluid'],
  },
  {
    id: 'screw.force', name: 'Force from a power screw', domain: 'machine elements',
    statement: 'A screw turned with a torque pushes its nut along by 2π times its efficiency times the torque over its lead.',
    formula: 'F = 2π η T / l', inputs: [q('T', 'torque', 'N m'), q('eta', 'efficiency', '-'), q('l', 'lead', 'm')], output: q('F', 'axial force', 'N'),
    eval: ({ T, eta, l }) => (2 * Math.PI * eta! * T!) / l!, outside: ({ eta }) => (eta! > 0.95 ? `η ${eta} is past even a ball screw's (about 0.9)` : null),
    valid: 'Acme or trapezoidal lead screws η about 0.2 to 0.5 (below about 0.5 they hold their load without a brake); ball screws about 0.9.', example: { inputs: { T: 1, eta: 0.3, l: 0.002 }, output: 942.4777960769379 }, source: SHIGLEY, tags: ['lead screw', 'ball screw', 'linear actuator', 'screw', 'jack'],
  },
  // ---------------------------------------------------------------- information, and energy into and out of heat and light
  {
    id: 'landauer', name: 'Landauer\'s limit', domain: 'information',
    statement: 'Erasing one bit of information, in anything that computes, releases at least Boltzmann\'s constant times the temperature times ln 2 as heat: the floor under every computer.',
    formula: 'E = k T ln 2', inputs: [q('T', 'temperature', 'K')], output: q('E', 'least energy per bit erased', 'J'),
    constants: { k: { value: 1.380649e-23, unit: 'J/K', name: 'Boltzmann constant (exact, SI 2019)' } },
    eval: ({ T, k }) => k! * T! * Math.LN2, valid: 'Any computer that erases information (logically irreversible); reversible computing can in principle go below it per operation.',
    example: { inputs: { T: 300 }, output: 2.870978885078724e-21 }, source: { cite: 'Landauer, Irreversibility and heat generation in the computing process, IBM J. Res. Dev. 5(3), 1961', kind: 'textbook' }, tags: ['computer', 'bit', 'information', 'energy', 'logic'],
  },
  {
    id: 'cmos.dynamic', name: 'Switching power of CMOS logic', domain: 'electrical',
    statement: 'Logic gates draw power each time they switch: the fraction switching, times the capacitance they charge, times the supply voltage squared, times the clock rate.',
    formula: 'P = α C V² f', inputs: [q('alpha', 'fraction switching each cycle', '-'), q('C', 'switched capacitance', 'F'), q('V', 'supply voltage', 'V'), q('f', 'clock rate', 'Hz')], output: q('P', 'dynamic power', 'W'),
    eval: ({ alpha, C, V, f }) => alpha! * C! * V! * V! * f!, valid: 'Dynamic power only; leakage adds to it, more so in small, hot chips.', example: { inputs: { alpha: 0.1, C: 1e-9, V: 1, f: 1e9 }, output: 0.10000000000000002 },
    source: { cite: 'Weste & Harris, CMOS VLSI Design, 4th ed., Addison-Wesley 2010 (power)', kind: 'textbook' }, tags: ['computer', 'chip', 'logic', 'power', 'transistor'],
  },
  {
    id: 'information.choices', name: 'Information in a choice', domain: 'information',
    statement: 'Picking one of N equally likely things takes the base-2 logarithm of N bits: no code can say which in fewer (Shannon).',
    formula: 'H = log₂ N', inputs: [q('N', 'number of choices', '-')], output: q('H', 'information (bits)', '-'),
    eval: ({ N }) => Math.log2(N!), outside: ({ N }) => (N! < 1 ? 'fewer than one choice' : null), valid: 'Equally likely choices; uneven ones carry less (H = −Σ p log₂ p).', example: { inputs: { N: 1024 }, output: 10 },
    source: { cite: 'Shannon, A Mathematical Theory of Communication, Bell System Technical Journal 27, 1948', kind: 'textbook' }, tags: ['information', 'language', 'bits', 'compression', 'entropy'],
  },
  {
    id: 'carnot', name: 'Carnot efficiency', domain: 'thermal',
    statement: 'Heat flowing from a hot place to a cold one can be turned into work at most by one minus the cold over the hot absolute temperature: the ceiling on every heat engine.',
    formula: 'η = 1 − T_c / T_h', inputs: [q('Tc', 'cold side', 'K'), q('Th', 'hot side', 'K')], output: q('eta', 'most efficiency', '-'),
    eval: ({ Tc, Th }) => 1 - Tc! / Th!, outside: ({ Tc, Th }) => (Tc! >= Th! ? 'no work flows from cold to hot' : null), valid: 'Reversible limit; real engines reach about half to three quarters of it.',
    example: { inputs: { Tc: 300, Th: 600 }, output: 0.5 }, source: { cite: 'Çengel & Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill 2019', kind: 'textbook' }, tags: ['heat engine', 'efficiency', 'second law', 'thermodynamics'],
  },
  {
    id: 'seebeck', name: 'Seebeck voltage (thermocouple)', domain: 'electrical',
    statement: 'Two different metals joined at a hot and a cold end make a voltage of their Seebeck coefficient times the temperature difference: how thermocouples sense heat and thermoelectric generators make power.',
    formula: 'V = S ΔT', inputs: [q('S', 'Seebeck coefficient', 'V/K'), q('dT', 'temperature difference', 'K')], output: q('V', 'voltage', 'V'),
    eval: ({ S, dT }) => S! * dT!, valid: 'Small ranges (S varies with temperature); type K is about 41 µV/K.', example: { inputs: { S: 41e-6, dT: 100 }, output: 0.0041 },
    source: { cite: 'ASTM E230 / IEC 60584 (thermocouples); Rowe (ed.), CRC Handbook of Thermoelectrics, 1995', kind: 'standard' }, tags: ['thermocouple', 'sensor', 'temperature', 'thermoelectric'],
  },
  {
    id: 'strain.gauge', name: 'Strain gauge', domain: 'electrical',
    statement: 'A foil gauge stuck to a part changes its resistance by its gauge factor times the strain times its resistance: how load cells and scales sense force.',
    formula: 'ΔR = GF ε R', inputs: [q('GF', 'gauge factor', '-'), q('eps', 'strain', '-'), q('R', 'gauge resistance', 'ohm')], output: q('dR', 'change in resistance', 'ohm'),
    eval: ({ GF, eps, R }) => GF! * eps! * R!, valid: 'Metal foil gauges GF about 2; read in a Wheatstone bridge.', example: { inputs: { GF: 2, eps: 1e-3, R: 350 }, output: 0.7000000000000001 },
    source: { cite: 'Window (ed.), Strain Gauge Technology, 2nd ed., Elsevier 1992', kind: 'textbook' }, tags: ['sensor', 'load cell', 'force', 'scale', 'strain'],
  },
  {
    id: 'pv.power', name: 'Solar cell power', domain: 'electrical',
    statement: 'A solar panel gives its efficiency times the sunlight falling on it per square metre times its area.',
    formula: 'P = η G A', inputs: [q('eta', 'efficiency', '-'), q('G', 'irradiance', 'W/m^2'), q('A', 'area', 'm^2')], output: q('P', 'electric power', 'W'),
    eval: ({ eta, G, A }) => eta! * G! * A!, outside: ({ eta }) => (eta! > 0.47 ? `η ${eta} is past the best multi-junction cell's (about 47%)` : null),
    valid: 'Standard test conditions G = 1000 W/m² at 25 °C; less when hot or not facing the sun. Silicon panels about 0.2.', example: { inputs: { eta: 0.2, G: 1000, A: 1.6 }, output: 320 },
    source: { cite: 'IEC 61215 / IEC 60904 (photovoltaic modules, standard test conditions)', kind: 'standard' }, tags: ['solar', 'light', 'photovoltaic', 'panel', 'energy'],
  },
];

export const lawById = (id: string) => LAWS.find((l) => l.id === id);

/** A law's inputs with its constants filled in. */
export function withConstants(law: Law, inputs: Record<string, number>): Record<string, number> {
  const c: Record<string, number> = {};
  for (const [k, v] of Object.entries(law.constants ?? {})) c[k] = v.value;
  return { ...c, ...inputs };
}

/** Inputs a law may be run without (they have a sensible default inside it). */
const OPTIONAL: Record<string, string[]> = { 'buckling.euler': ['K'], 'bearing.life.l10': ['p'] };

/**
 * Run a law by id: its output, and a caution when the inputs leave the range it holds over. Throws on an unknown law or
 * a missing input, so a workflow can't silently guess.
 */
export function use(id: string, inputs: Record<string, number>): { value: number; caution: string | null } {
  const law = lawById(id);
  if (!law) throw new Error(`No law ${id}`);
  for (const i of law.inputs) if (!(i.sym in inputs) && !(OPTIONAL[id] ?? []).includes(i.sym)) throw new Error(`${law.name} needs ${i.name} (${i.sym})`);
  for (const [k, v] of Object.entries(inputs)) if (!Number.isFinite(v)) throw new Error(`${law.name}: ${k} is not a number`);
  const v = withConstants(law, inputs);
  return { value: law.eval(v), caution: law.outside?.(v) ?? null };
}

/** A law's output alone. */
export const apply = (id: string, inputs: Record<string, number>) => use(id, inputs).value;
