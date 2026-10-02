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

const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015' };
const ROARK = { cite: 'Young & Budynas, Roark\'s Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002' };
const INCROPERA = { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed., Wiley 2011' };
const PHYSICS = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019' };
const GILLESPIE = { cite: 'Gillespie, Fundamentals of Vehicle Dynamics, SAE 1992, ch. 4 (rolling resistance); Engineering ToolBox, Rolling Resistance', url: 'https://www.engineeringtoolbox.com/rolling-friction-resistance-d_1303.html' };

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
    eval: ({ Crr, N }) => Crr! * N!,
    valid: 'Steady rolling on a hard surface. C_rr: car tyres on asphalt or concrete 0.007 to 0.02 (about 0.012); soft rubber cart wheels on concrete 0.03 to 0.05.',
    example: { inputs: { Crr: 0.015, N: 120 * g }, output: 17.65197 }, source: GILLESPIE, tags: ['wheel', 'tyre', 'vehicle', 'drag', 'kart'],
  },
  {
    id: 'grade.force', name: 'Grade resistance', domain: 'mechanics',
    statement: 'On a slope, the part of the weight along it pulls a vehicle back.', formula: 'F = m g sin θ',
    inputs: [q('m', 'mass', 'kg'), q('theta', 'slope angle', 'rad')], output: q('F', 'grade force', 'N'),
    eval: ({ m, theta }) => m! * g * Math.sin(theta!), valid: 'A grade of p% is θ = atan(p/100).',
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
    eval: ({ mu, N }) => mu! * N!, valid: 'Dry rubber on asphalt μ about 0.7 to 0.9; less wet or on dust.', example: { inputs: { mu: 0.8, N: 600 }, output: 480 }, source: GILLESPIE, tags: ['grip', 'wheel', 'spin', 'vehicle'],
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
    eval: ({ m, h }) => m! * g * h!, valid: 'Uniform gravity.', example: { inputs: { m: 10, h: 2 }, output: 196.133 }, source: PHYSICS, tags: ['energy', 'height', 'lift'],
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
    eval: ({ mu, R }) => Math.sqrt(mu! * g * R!), valid: 'Flat, unbanked bend; ignores load transfer (and rollover, which a tall vehicle meets first).',
    example: { inputs: { mu: 0.8, R: 5 }, output: 6.2631142413339385 }, source: GILLESPIE, tags: ['turn', 'steering', 'vehicle', 'kart'],
  },
  {
    id: 'pendulum.period', name: 'Pendulum period', domain: 'mechanics', statement: 'A simple pendulum swings with period two pi root of its length over gravity.',
    formula: 'T = 2π √(L / g)', inputs: [q('L', 'length', 'm')], output: q('T', 'period', 's'),
    eval: ({ L }) => 2 * Math.PI * Math.sqrt(L! / g), valid: 'Small swings (under about 15°), a point mass on a light string.', example: { inputs: { L: 1 }, output: 2.0064092925890407 }, source: PHYSICS, tags: ['swing', 'oscillation', 'test'],
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
    eval: ({ Sut }) => (Sut! <= 1400e6 ? 0.5 * Sut! : 700e6), valid: 'Steels, polished specimen: a real part takes surface, size, load and reliability factors (Marin) below it.',
    example: { inputs: { Sut: 440e6 }, output: 220e6 }, source: SHIGLEY, tags: ['fatigue', 'shaft', 'vibration', 'life'],
  },
  // ---------------------------------------------------------------- machine elements
  {
    id: 'bearing.life.l10', name: 'Bearing rating life (L10)', domain: 'machine elements',
    statement: 'Ninety per cent of a group of identical bearings outlast (C/P)^p million revolutions: p = 3 for ball bearings, 10/3 for roller bearings.',
    formula: 'L10 = (C / P)^p × 10⁶ rev', inputs: [q('C', 'basic dynamic load rating', 'N'), q('P', 'equivalent dynamic load', 'N'), q('p', 'life exponent', '-')], output: q('L', 'rating life', 'rev'),
    eval: ({ C, P, p }) => (C! / P!) ** (p ?? 3) * 1e6, valid: 'Clean, well-lubricated bearings at normal temperature (ISO 281 basic rating life; a modified life a_ISO adjusts it).',
    example: { inputs: { C: 14.8, P: 1, p: 3 }, output: 3241792000 }, source: { cite: 'ISO 281:2007 Rolling bearings — Dynamic load ratings and rating life' }, tags: ['bearing', 'life', 'wheel', 'axle', 'pillow block'],
  },
  {
    id: 'bearing.life.hours', name: 'Bearing life in hours', domain: 'machine elements', statement: 'A rating life in revolutions, turned at n rpm, lasts L10 / (60 n) hours.',
    formula: 'L10h = L10 / (60 n)', inputs: [q('L', 'rating life', 'rev'), q('n', 'speed', 'rpm')], output: q('h', 'rating life', 'h'),
    eval: ({ L, n }) => L! / (60 * n!), valid: 'Constant speed.', example: { inputs: { L: 3241792000, n: 600 }, output: 90049.7777777778 }, source: { cite: 'ISO 281:2007' }, tags: ['bearing', 'life', 'hours'],
  },
  {
    id: 'spring.rate', name: 'Helical spring rate', domain: 'machine elements', statement: 'A coil spring\'s rate is G d^4 over 8 D^3 n: wire diameter d, coil diameter D, n active coils.',
    formula: 'k = G d⁴ / (8 D³ n)', inputs: [q('G', 'shear modulus', 'Pa'), q('d', 'wire diameter', 'm'), q('D', 'mean coil diameter', 'm'), q('n', 'active coils', '-')], output: q('k', 'rate', 'N/m'),
    eval: ({ G, d, D, n }) => (G! * d! ** 4) / (8 * D! ** 3 * n!), valid: 'Close-coiled helical springs, spring index 4 to 12.', example: { inputs: { G: 79.3e9, d: 0.005, D: 0.04, n: 8 }, output: 12100.219726562498 }, source: SHIGLEY, tags: ['spring', 'stiffness'],
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
    valid: 'DC; annealed copper 1/58 ohm mm²/m = 1.724e-8 ohm m at 20 °C (IEC 60028).', example: { inputs: { rho: 1.724e-8, L: 1, A: 2.08e-6 }, output: 0.00828846153846154 }, source: { cite: 'IEC 60028:1925 International standard of resistance for copper' }, tags: ['wire', 'cable', 'copper', 'AWG'],
  },
  {
    id: 'copper.tempco', name: 'Copper\'s resistance with temperature', domain: 'electrical', statement: 'Copper grows 0.393% more resistive per kelvin.', formula: 'R(T) = R₀ (1 + α (T − T₀))',
    inputs: [q('R0', 'resistance at T0', 'ohm'), q('T', 'temperature', 'degC'), q('T0', 'reference temperature', 'degC')], output: q('R', 'resistance', 'ohm'),
    eval: ({ R0, T, T0 }) => R0! * (1 + COPPER_ALPHA * (T! - T0!)), valid: 'About -50 to 200 °C; α = 0.00393/K at 20 °C.', example: { inputs: { R0: 0.317, T: 100, T0: 25 }, output: 0.41043575 }, source: { cite: 'IEC 60028' }, tags: ['motor', 'winding', 'heat', 'wire'],
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
    eval: ({ V, Ke, w, R }) => (V! - Ke! * w!) / R!, valid: 'Steady state (the winding\'s inductance only delays it, by L/R).', example: { inputs: { V: 24, Ke: 0.0302, w: 500, R: 0.299 }, output: 29.765886287625413 }, source: { cite: 'Hughes, Electric Motors and Drives, 4th ed.' }, tags: ['motor', 'current', 'battery'],
    implementedIn: 'physics/electric.ts loadCurrent',
  },
  {
    id: 'motor.time-constant', name: 'Mechanical time constant', domain: 'electrical', statement: 'An unloaded motor reaches 63% of its no-load speed in R J over K_t^2.', formula: 'τ_m = R J / K_t²',
    inputs: [q('R', 'winding resistance', 'ohm'), q('J', 'inertia', 'kg m^2'), q('Kt', 'torque constant', 'N m/A')], output: q('tau', 'time constant', 's'), eval: ({ R, J, Kt }) => (R! * J!) / (Kt! * Kt!),
    valid: 'No current limit, inertia J of all that turns (rotor plus load reflected through the gear as J/N²).', example: { inputs: { R: 0.299, J: 142e-7, Kt: 0.0302 }, output: 0.004655278277268541 }, source: { cite: 'maxon, Key information on motor data (mechanical time constant)' }, tags: ['motor', 'response', 'acceleration'],
  },
  {
    id: 'lead-acid.ocv', name: 'Lead-acid open-circuit voltage', domain: 'electrical', statement: 'A lead-acid cell rests at about 0.85 V plus its acid\'s specific gravity.', formula: 'V_cell ≈ 0.85 + SG',
    inputs: [q('SG', 'specific gravity of the acid', '-')], output: q('V', 'cell voltage', 'V'), eval: ({ SG }) => 0.85 + SG!,
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
    inputs: [q('h', 'heat transfer coefficient', 'W/m^2 K'), q('A', 'area', 'm^2'), q('dT', 'temperature excess', 'K')], output: q('q', 'heat flow', 'W'), eval: ({ h, A, dT }) => h! * A! * dT!,
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
    inputs: [q('eps', 'emissivity', '-'), q('A', 'area', 'm^2'), q('T', 'surface temperature', 'K'), q('Tinf', 'surroundings', 'K')], output: q('q', 'net heat flow', 'W'), eval: ({ eps, A, T, Tinf }) => eps! * SIGMA_SB * A! * (T! ** 4 - Tinf! ** 4),
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
    id: 'buoyancy', name: 'Archimedes\' principle', domain: 'fluids', statement: 'A body in a fluid is pushed up by the weight of the fluid it displaces.', formula: 'F = ρ g V',
    inputs: [q('rho', 'fluid density', 'kg/m^3'), q('V', 'displaced volume', 'm^3')], output: q('F', 'buoyancy', 'N'), eval: ({ rho, V }) => rho! * g * V!,
    valid: 'Fluid at rest.', example: { inputs: { rho: 1000, V: 0.001 }, output: 9.80665 }, source: PHYSICS, tags: ['water', 'float', 'raft'], implementedIn: 'physics/world.ts applyFluids',
  },
  {
    id: 'hydrostatic', name: 'Hydrostatic pressure', domain: 'fluids', statement: 'Pressure in a still liquid rises with depth by its density times gravity times the depth.', formula: 'p = ρ g h',
    inputs: [q('rho', 'density', 'kg/m^3'), q('h', 'depth', 'm')], output: q('p', 'gauge pressure', 'Pa'), eval: ({ rho, h }) => rho! * g * h!,
    valid: 'Incompressible, at rest.', example: { inputs: { rho: 1000, h: 2 }, output: 19613.3 }, source: PHYSICS, tags: ['water', 'tank', 'pressure'],
  },
];

export const lawById = (id: string) => LAWS.find((l) => l.id === id);

/** Run a law by id: its output for these inputs (throws on an unknown id or a missing input, so a workflow can't silently guess). */
export function apply(id: string, inputs: Record<string, number>): number {
  const law = lawById(id);
  if (!law) throw new Error(`No law ${id}`);
  for (const i of law.inputs) if (!(i.sym in inputs) && !(law.id === 'buckling.euler' && i.sym === 'K') && !(law.id === 'bearing.life.l10' && i.sym === 'p')) throw new Error(`${law.name} needs ${i.name} (${i.sym})`);
  return law.eval(inputs);
}
