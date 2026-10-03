// The laws Ego reasons with: each an equation that runs, in SI, with where it holds and where it comes from, and a
// worked example it must reproduce (computed independently: ganglia.test.ts). Where the world itself runs a law,
// `implementedIn` names the module, and the law here calls the same function, so what Ego reasons with and what the
// physics does are one thing.

import { eulerBucklingLoad, cantileverDeflection, plasticMoment } from '../engineering/beams';
import { capstanRatio, dragForce, lewisStress, skinDepth } from '../engineering/mechanics';
import { torsionSpringRate } from '../engineering/springs';
import { heatInput } from '../engineering/joining';
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
const HH = { cite: 'Horowitz & Hill, The Art of Electronics, 3rd ed., Cambridge 2015', kind: 'textbook' as const };
const ANDERSON = { cite: 'Anderson, Introduction to Flight, 8th ed., McGraw-Hill 2016', kind: 'textbook' as const };
const HOLMAN = { cite: 'Holman, Heat Transfer, 10th ed., McGraw-Hill 2010, table 7-2 (simplified equations for free convection in air)', kind: 'textbook' as const };
const GRIFFITHS = { cite: 'Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017', kind: 'textbook' as const };
const ATKINS = { cite: 'Atkins, de Paula & Keeler, Atkins\' Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' as const };
const CALLISTER = { cite: 'Callister & Rethwisch, Materials Science and Engineering: An Introduction, 10th ed., Wiley 2018', kind: 'textbook' as const };
const COVER = { cite: 'Cover & Thomas, Elements of Information Theory, 2nd ed., Wiley 2006', kind: 'textbook' as const };
const BARD = { cite: 'Bard & Faulkner, Electrochemical Methods, 2nd ed., Wiley 2001', kind: 'textbook' as const };
const KITTEL = { cite: 'Kittel, Introduction to Solid State Physics, 8th ed., Wiley 2005', kind: 'textbook' as const };
const MCMAHON = { cite: 'McMahon, Muscles, Reflexes, and Locomotion, Princeton 1984 (Hill\'s equation, the Froude number of gait)', kind: 'textbook' as const };
const NORTON = { cite: 'Norton, Design of Machinery, 6th ed., McGraw-Hill 2020 (Gruebler\'s equation)', kind: 'textbook' as const };
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
    implementedIn: 'engineering/mechanics.ts dragForce; physics/world.ts applyAirDrag with the frontal area by shape (frontalAreas): a sphere π r², a cylinder its rectangle across and its disc along, a box its faces',
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
    implementedIn: 'engineering/battery.ts cellOCV (SG from charge: ' + cellOCV('lead-acid-vrla', 1).toFixed(2) + ' V charged)',
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
    id: 'convection.natural', name: 'Free convection in still air', domain: 'thermal', statement: 'A surface in still air loses heat at a coefficient that rises with the fourth root of its temperature excess over its size: hotter and smaller things shed heat faster per area, so a thing twice the size cools more than twice as slowly.', formula: 'h = 1.42 (ΔT / L)^¼',
    inputs: [q('dT', 'temperature excess', 'K'), q('L', 'size', 'm')], output: q('h', 'heat transfer coefficient', 'W/m^2 K'), constants: { C: { value: 1.42, unit: 'W/m^1.75 K^1.25', name: 'the laminar air coefficient (Holman table 7-2), with its fractional units' } }, eval: ({ dT, L, C }) => C! * Math.pow(Math.abs(dT!) / L!, 0.25),
    valid: 'Laminar (Gr Pr below about 10^9: sizes under a metre, excesses under a few hundred kelvin), still air at atmospheric pressure; the simplified laminar correlation, within about 20 % of the full one. The engine holds L at no less than 10 mm.', example: { inputs: { dT: 50, L: 0.1 }, output: 6.7147654239225485 }, source: HOLMAN, tags: ['heat', 'cooling', 'air', 'size'],
    implementedIn: 'engineering/thermal.ts heatLoss',
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
    id: 'rc.time-constant', name: 'RC time constant', domain: 'electrical', statement: 'A capacitor charges or discharges through a resistance toward its final voltage with time constant R C: 63 % of the way in one, 95 % in three.', formula: 'τ = R C',
    inputs: [q('R', 'resistance', 'ohm'), q('C', 'capacitance', 'F')], output: q('tau', 'time constant', 's'), eval: ({ R, C }) => R! * C!,
    valid: 'A linear resistance and capacitance, a source that holds its voltage.', example: { inputs: { R: 10e3, C: 100e-6 }, output: 1 }, source: HH, tags: ['capacitor', 'filter', 'decoupling', 'time'],
  },
  {
    id: 'lift.aero', name: 'Aerodynamic lift', domain: 'fluids', statement: 'A surface moved through a fluid is pushed across the flow by half the fluid density times its lift coefficient, planform area and speed squared; the coefficient grows with the angle of attack up to the stall.', formula: 'L = ½ ρ C_L A v²',
    inputs: [q('rho', 'fluid density', 'kg/m^3'), q('CL', 'lift coefficient', '-'), q('A', 'planform area', 'm^2'), q('v', 'speed', 'm/s')], output: q('L', 'lift', 'N'), eval: ({ rho, CL, A, v }) => 0.5 * rho! * CL! * A! * v! * v!,
    valid: 'Below the stall angle; C_L from the section and angle (about 0.3 to 1.5 for a wing in flight).', example: { inputs: { rho: 1.225, CL: 1, A: 10, v: 50 }, output: 15312.5 }, source: ANDERSON, tags: ['wing', 'lift', 'flight', 'rotor'],
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
    id: 'flywheel.specific-energy', name: 'Energy a flywheel can hold per kilogram', domain: 'mechanics',
    statement: 'A rotor\'s energy per unit mass is bounded by its material\'s allowable stress over its density, times a shape factor: 0.606 for a constant-thickness solid disc, 0.5 for a thin rim, 1 for a constant-stress disc.',
    formula: 'e = K σ / ρ', inputs: [q('K', 'shape factor', '-'), q('sigma', 'allowable stress', 'Pa'), q('rho', 'density', 'kg/m^3')], output: q('e', 'specific energy', 'J/kg'),
    eval: ({ K, sigma, rho }) => (K! * sigma!) / rho!, outside: ({ K }) => (K! <= 0 || K! > 1 ? `K ${K} is outside any rotor shape (0 to 1)` : null),
    valid: 'Isotropic rotors at the speed where the peak stress reaches σ; the shape factor is the rotor\'s geometry alone (Genta).',
    example: { inputs: { K: 0.606, sigma: 185e6, rho: 7870 }, output: 14245.23506988564, rel: 1e-9 },
    source: { cite: 'Genta, Kinetic Energy Storage: Theory and Practice of Advanced Flywheel Systems, Butterworths 1985, ch. 2', kind: 'textbook' }, tags: ['flywheel', 'energy', 'rotor', 'storage'],
  },
  {
    id: 'gas.isothermal-work', name: 'Work in a compressed gas (isothermal)', domain: 'fluids',
    statement: 'A volume of gas at pressure p, let down slowly enough to stay at its temperature, does work of p V ln(p / p0) expanding to p0.',
    formula: 'W = p V ln(p / p0)', inputs: [q('p', 'stored pressure', 'Pa'), q('V', 'stored volume', 'm^3'), q('p0', 'pressure let down to', 'Pa')], output: q('W', 'work', 'J'),
    eval: ({ p, V, p0 }) => p! * V! * Math.log(p! / p0!), outside: ({ p, p0 }) => (p! <= p0! ? 'the stored pressure must exceed what it is let down to' : null),
    valid: 'Ideal gas, isothermal (slow) expansion; a fast (adiabatic) expansion gives less, the difference leaving as cooled gas.',
    example: { inputs: { p: 2e6, V: 0.01, p0: 1e5 }, output: 59914.64547107982, rel: 1e-9 },
    source: PHYSICS, tags: ['gas', 'compressed air', 'work', 'storage'],
  },
  {
    id: 'spring.energy', name: 'Energy in a spring', domain: 'mechanics', statement: 'A spring stretched or squeezed from rest holds half its rate times the stretch squared.',
    formula: 'E = ½ k x²', inputs: [q('k', 'rate', 'N/m'), q('x', 'deflection', 'm')], output: q('E', 'stored energy', 'J'),
    eval: ({ k, x }) => 0.5 * k! * x! * x!, valid: 'Linear spring, below its solid length and its yield.', example: { inputs: { k: 12100, x: 0.02 }, output: 2.42 }, source: PHYSICS, tags: ['spring', 'launcher', 'energy'], implementedIn: 'physics/energy.ts springEnergy',
  },
  {
    id: 'capacitor.energy', name: 'Energy in a capacitor', domain: 'electrical', statement: 'A charged capacitor holds half its capacitance times the voltage across it squared.',
    formula: 'E = ½ C V²', inputs: [q('C', 'capacitance', 'F'), q('V', 'voltage', 'V')], output: q('E', 'stored energy', 'J'),
    eval: ({ C, V }) => 0.5 * C! * V! * V!, valid: 'A linear dielectric below its breakdown voltage.', example: { inputs: { C: 100e-6, V: 12 }, output: 7.2e-3 }, source: PHYSICS, tags: ['energy', 'capacitor', 'store'],
  },
  {
    id: 'inductor.energy', name: 'Energy in an inductor', domain: 'electrical', statement: 'A current-carrying inductor holds half its inductance times the current squared.',
    formula: 'E = ½ L I²', inputs: [q('L', 'inductance', 'H'), q('I', 'current', 'A')], output: q('E', 'stored energy', 'J'),
    eval: ({ L, I }) => 0.5 * L! * I! * I!, valid: 'A linear core below saturation.', example: { inputs: { L: 10e-3, I: 2 }, output: 0.02 }, source: PHYSICS, tags: ['energy', 'inductor', 'store'],
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
  {
    id: 'rayleigh.resolution', name: 'Resolution of optical lithography (Rayleigh)', domain: 'information',
    statement: 'The smallest half-pitch a projection lens can print is a process factor k₁ times the wavelength over the numerical aperture: why lithography went to 13.5 nm light and to wider apertures.',
    formula: 'CD = k₁ λ / NA', inputs: [q('k1', 'process factor', '-'), q('lambda', 'wavelength', 'm'), q('NA', 'numerical aperture', '-')], output: q('CD', 'smallest half-pitch', 'm'),
    eval: ({ k1, lambda, NA }) => (k1! * lambda!) / NA!, outside: ({ k1, NA }) => (k1! < 0.25 ? `k₁ of ${k1} is under the single-exposure limit of 0.25` : NA! >= 1 ? 'a dry lens has NA below 1' : null),
    valid: 'Single exposure; k₁ about 0.3 to 0.4 in production, 0.25 its theoretical floor. Depth of focus falls as λ/NA².', example: { inputs: { k1: 0.32, lambda: 13.5e-9, NA: 0.33 }, output: 1.3090909090909092e-8 },
    source: { cite: 'Mack, Fundamental Principles of Optical Lithography, Wiley 2007', kind: 'textbook' }, tags: ['lithography', 'euv', 'chip', 'resolution', 'optics', 'semiconductor'],
  },
  // ---------------------------------------------------------------- the world's own engineering, as laws
  {
    id: 'beam.plastic-moment', name: 'Plastic moment of a section', domain: 'structures',
    statement: 'A ductile beam bent until its whole section yields carries its plastic section modulus times its yield stress: the moment at which a plastic hinge forms and it folds.',
    formula: 'M_p = Z σ_y', inputs: [q('Z', 'plastic section modulus', 'm^3'), q('Sy', 'yield stress', 'Pa')], output: q('Mp', 'plastic moment', 'N m'),
    eval: ({ Z, Sy }) => plasticMoment(Z!, Sy!), valid: 'Ductile metals, compact sections that don\'t buckle locally first; Z is 1.5 S for a rectangle, about 1.7 S for a solid round, 1.1 to 1.2 S for an I-beam.',
    example: { inputs: { Z: 1e-5, Sy: 250e6 }, output: 2500 }, source: { cite: 'AISC 360-16, Specification for Structural Steel Buildings, F2 (Mp = Fy Zx)', kind: 'standard' }, tags: ['beam', 'plastic hinge', 'collapse', 'frame'],
    implementedIn: 'engineering/beams.ts plasticMoment',
  },
  {
    id: 'gear.lewis', name: 'Gear tooth bending stress (Lewis)', domain: 'machine elements',
    statement: 'A gear tooth, a cantilever loaded at its tip by the force between the gears, is stressed at its root by that tangential force over its face width, its module and its Lewis form factor.',
    formula: 'σ = W_t / (b m Y)', inputs: [q('Wt', 'tangential load', 'N'), q('b', 'face width', 'm'), q('m', 'module', 'm'), q('Y', 'Lewis form factor', '-')], output: q('sigma', 'root bending stress', 'Pa'),
    eval: ({ Wt, b, m, Y }) => lewisStress(Wt!, b!, m!, Y!), outside: ({ b, m }) => (b! / m! < 8 || b! / m! > 16 ? `a face width of ${(b! / m!).toFixed(1)} modules is outside the usual 8 to 16` : null),
    valid: 'Root bending only, one tooth carrying the load, 20° full-depth teeth (Y from Shigley Table 14-2); AGMA adds dynamic, size and surface (pitting) factors.',
    example: { inputs: { Wt: 1000, b: 0.02, m: 0.002, Y: 0.322 }, output: 77639751.55279502 }, source: SHIGLEY, tags: ['gear', 'tooth', 'strength', 'spur gear', 'module'],
    implementedIn: 'engineering/mechanics.ts lewisStress',
  },
  {
    id: 'skin.depth', name: 'Skin depth', domain: 'magnetism',
    statement: 'An alternating field or current reaches into a conductor only about one skin depth, shrinking with frequency and conductivity: why an eddy-current brake works at the surface, and thick copper buys nothing at high frequency.',
    formula: 'δ = 1 / √(π f μ₀ σ)', inputs: [q('f', 'frequency', 'Hz'), q('sigma', 'conductivity', 'S/m')], output: q('delta', 'skin depth', 'm'),
    constants: { mu0: { value: 4e-7 * Math.PI, unit: 'N/A^2', name: 'permeability of free space' } },
    eval: ({ f, sigma, mu0 }) => skinDepth(f!, sigma!, mu0!), valid: 'Non-magnetic conductors (μr = 1); in iron it is thinner by √μr.',
    example: { inputs: { f: 50, sigma: 5.8e7 }, output: 0.009345900061927292 }, source: { cite: 'Griffiths, Introduction to Electrodynamics, 4th ed., Cambridge 2017 (skin depth)', kind: 'textbook' }, tags: ['eddy current', 'brake', 'induction', 'copper', 'magnet'],
    implementedIn: 'engineering/mechanics.ts skinDepth',
  },
  {
    id: 'spring.torsion.rate', name: 'Helical torsion spring rate', domain: 'machine elements',
    statement: 'A helical torsion spring\'s rate is its wire diameter to the fourth times its modulus over 10.8 times its coil diameter times its turns, per turn; per radian, over 2π more.',
    formula: "k' = d⁴ E / (10.8 D N) per turn", inputs: [q('d', 'wire diameter', 'm'), q('D', 'mean coil diameter', 'm'), q('N', 'active turns', '-'), q('E', 'modulus', 'Pa')], output: q('k', 'rate', 'N m/rad'),
    eval: ({ d, D, N, E }) => torsionSpringRate(d!, D!, N!, E!), valid: 'Shigley eq. 10-51: 10.8 in place of the ideal 10.2 for friction between the coils.',
    example: { inputs: { d: 0.002, D: 0.02, N: 5, E: 200e9 }, output: 0.471570201753764 }, source: SHIGLEY, tags: ['spring', 'torsion', 'hinge', 'clip'],
    implementedIn: 'engineering/springs.ts torsionSpringRate',
  },
  {
    id: 'weld.heat-input', name: 'Arc welding heat input', domain: 'thermal',
    statement: 'An arc puts into the joint its efficiency times its volts times its amps over its travel speed, per metre of weld: too little and it doesn\'t fuse, too much and it burns through thin plate.',
    formula: 'Q = η V I / v', inputs: [q('eta', 'arc efficiency', '-'), q('V', 'arc voltage', 'V'), q('I', 'current', 'A'), q('v', 'travel speed', 'm/s')], output: q('Q', 'heat input', 'J/m'),
    eval: ({ eta, V, I, v }) => heatInput(eta!, V!, I!, v!), valid: 'Arc efficiency about 0.8 for MIG and stick, 0.6 for TIG (EN 1011-1).',
    example: { inputs: { eta: 0.8, V: 20, I: 150, v: 0.005 }, output: 480000 }, source: { cite: 'EN 1011-1 (welding: heat input and thermal efficiency factors)', kind: 'standard' }, tags: ['weld', 'mig', 'heat', 'fusion', 'burn-through'],
    implementedIn: 'engineering/joining.ts heatInput',
  },
  // ---------------------------------------------------------------- the frontier: laws that bound what can be made
  {
    id: 'time.dilation.gravity', name: 'Gravitational time dilation', domain: 'mechanics',
    statement: 'A clock deep in a gravity well runs slow against one far away, by √(1 − 2GM/(r c²)): only near a black hole is the difference large.',
    formula: 'τ/t = √(1 − 2 G M / (r c²))', inputs: [q('M', 'mass', 'kg'), q('r', 'distance from its centre', 'm')], output: q('k', 'clock rate against far away', '-'),
    constants: { G: { value: 6.6743e-11, unit: 'm^3/kg s^2', name: 'gravitational constant (CODATA 2018)' }, c: { value: 299792458, unit: 'm/s', name: 'speed of light (exact)' } },
    eval: ({ M, r, G, c }) => Math.sqrt(1 - (2 * G! * M!) / (r! * c! * c!)), outside: ({ M, r, G, c }) => ((2 * G! * M!) / (r! * c! * c!) >= 1 ? 'inside the horizon of a black hole: no clock there can be read from outside' : null),
    valid: 'A static clock outside a non-rotating, spherical mass (Schwarzschild).', example: { inputs: { M: 5.972e24, r: 6.371e6 }, output: 0.9999999993038922 },
    source: { cite: 'Misner, Thorne & Wheeler, Gravitation, Freeman 1973 (Schwarzschild metric)', kind: 'textbook' }, tags: ['time', 'gravity', 'relativity', 'black hole'],
  },
  {
    id: 'arrhenius', name: 'Arrhenius rate', domain: 'thermal',
    statement: 'A reaction, ageing a battery or spoiling food, runs at a rate that falls exponentially as the temperature drops but never reaches zero above absolute zero.',
    formula: 'k = A e^(−E_a / R T)', inputs: [q('A', 'pre-exponential factor', '1/s'), q('Ea', 'activation energy', 'J/mol'), q('T', 'temperature', 'K')], output: q('k', 'rate', '1/s'),
    constants: { R: { value: 8.314462618, unit: 'J/mol K', name: 'gas constant (exact, SI 2019)' } },
    eval: ({ A, Ea, T, R }) => A! * Math.exp(-Ea! / (R! * T!)), valid: 'One rate-limiting step; real ageing is several in parallel, each with its own Ea.',
    example: { inputs: { A: 1e13, Ea: 50e3, T: 298 }, output: 17217.4875757281 }, source: { cite: 'Atkins & de Paula, Physical Chemistry, 11th ed., Oxford 2018', kind: 'textbook' }, tags: ['ageing', 'battery', 'degradation', 'chemistry', 'shelf life'],
  },
  {
    id: 'young.contact', name: 'Contact angle (Young)', domain: 'materials',
    statement: 'A drop on a flat surface settles at the angle where its surface tensions balance: water beads (above 90°) only on surfaces of low energy.',
    formula: 'cos θ = (γ_sv − γ_sl) / γ_lv', inputs: [q('gsv', 'solid-vapour surface energy', 'J/m^2'), q('gsl', 'solid-liquid surface energy', 'J/m^2'), q('glv', 'liquid surface tension', 'J/m^2')], output: q('theta', 'contact angle', 'rad'),
    eval: ({ gsv, gsl, glv }) => Math.acos(Math.max(-1, Math.min(1, (gsv! - gsl!) / glv!))), valid: 'Ideally flat, clean, rigid surfaces; no flat surface beads water much past 120° (fluorinated): beyond that takes roughness (the lotus effect), which wears away.',
    example: { inputs: { gsv: 0.02, gsl: 0.04, glv: 0.072 }, output: 1.8522764000257415 }, source: { cite: 'de Gennes, Brochard-Wyart & Quéré, Capillarity and Wetting Phenomena, Springer 2004', kind: 'textbook' }, tags: ['water', 'hydrophobic', 'coating', 'wetting', 'clean'],
  },
  {
    id: 'carbonation.capacity', name: 'Carbon dioxide a lime can hold', domain: 'materials',
    statement: 'Calcium oxide takes up carbon dioxide to become calcium carbonate, one molecule for one: at most the ratio of their molar masses, 0.785 kg of CO₂ per kg of lime, and then no more.',
    formula: 'm_CO₂ = m_CaO × M_CO₂ / M_CaO', inputs: [q('m', 'calcium oxide', 'kg')], output: q('mCO2', 'CO₂ held for good', 'kg'),
    constants: { MCO2: { value: 44.009, unit: '-', name: 'molar mass of CO₂, g/mol' }, MCaO: { value: 56.077, unit: '-', name: 'molar mass of CaO, g/mol' } },
    eval: ({ m, MCO2, MCaO }) => (m! * MCO2!) / MCaO!, valid: 'Full carbonation; concrete carbonates only from its surface inward, over years, and holds only what its calcium allows.',
    example: { inputs: { m: 1 }, output: 0.7847959056297591 }, source: { cite: 'CaO + CO₂ → CaCO₃ (stoichiometry; IUPAC atomic weights)', kind: 'textbook' }, tags: ['carbon capture', 'concrete', 'co2', 'brick', 'climate'],
  },
  {
    id: 'absorbed.solar', name: 'Sunlight a surface absorbs', domain: 'thermal',
    statement: 'A surface absorbs the sunlight it doesn\'t reflect: one minus its albedo, times the sunlight on it, times its area.',
    formula: 'P = (1 − a) G A', inputs: [q('a', 'albedo (reflected share)', '-'), q('G', 'sunlight', 'W/m^2'), q('A', 'area', 'm^2')], output: q('P', 'absorbed power', 'W'),
    eval: ({ a, G, A }) => (1 - a!) * G! * A!, outside: ({ a }) => (a! < 0 || a! > 1 ? 'an albedo is between 0 and 1' : null), valid: 'Shortwave balance only; a cover also insulates and changes the longwave balance.',
    example: { inputs: { a: 0.9, G: 1000, A: 1 }, output: 99.99999999999997 }, source: { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed. (radiation balance)', kind: 'textbook' }, tags: ['sun', 'glacier', 'reflective', 'albedo', 'cooling'],
  },
  {
    id: 'diffraction.limit', name: 'Diffraction limit of an aperture', domain: 'information',
    statement: 'No lens or eye of diameter D can see detail finer than about 1.22 λ / D radians: long waves need huge apertures to make any image at all.',
    formula: 'θ = 1.22 λ / D', inputs: [q('lambda', 'wavelength', 'm'), q('D', 'aperture diameter', 'm')], output: q('theta', 'smallest angle resolved', 'rad'),
    eval: ({ lambda, D }) => (1.22 * lambda!) / D!, outside: ({ lambda, D }) => ((1.22 * lambda!) / D! > Math.PI ? 'wider than the whole sky: no image at all' : null),
    valid: 'A circular aperture, the Rayleigh criterion.', example: { inputs: { lambda: 1, D: 0.05 }, output: 24.4 }, source: { cite: 'Hecht, Optics, 5th ed., Pearson 2017', kind: 'textbook' }, tags: ['optics', 'vision', 'radio', 'telescope', 'resolution'],
  },
  {
    id: 'acoustic.mass-law', name: 'Sound insulation of a wall (mass law)', domain: 'fluids',
    statement: 'A wall stops airborne sound mainly by its mass: about 20 log₁₀ of its mass per area times the frequency, less 47 dB. Low notes and light layers pass through.',
    formula: 'TL ≈ 20 log₁₀(m f) − 47 dB', inputs: [q('m', 'mass per area', 'kg/m^2'), q('f', 'frequency', 'Hz')], output: q('TL', 'transmission loss', 'dB'),
    constants: { mf0: { value: 223.872113856834, unit: 'kg/m^2 s', name: 'the reference product (47 dB)' } },
    eval: ({ m, f, mf0 }) => 20 * Math.log10((m! * f!) / mf0!), valid: 'Field incidence, a single limp panel below its coincidence frequency; absorptive coatings reduce echo, not what passes through.',
    example: { inputs: { m: 460, f: 100 }, output: 46.25515663363147 }, source: { cite: 'Long, Architectural Acoustics, 2nd ed., Academic Press 2014 (mass law)', kind: 'textbook' }, tags: ['sound', 'soundproof', 'acoustic', 'wall', 'noise'],
  },
  {
    id: 'diffusion.time', name: 'Time to diffuse a distance', domain: 'fluids',
    statement: 'A molecule wandering by diffusion alone covers a distance in a time that grows with its square: microns in moments, a metre in hours. Anything faster is carried by a flow.',
    formula: 't = x² / (2 D)', inputs: [q('x', 'distance', 'm'), q('D', 'diffusion coefficient', 'm^2/s')], output: q('t', 'time', 's'),
    eval: ({ x, D }) => (x! * x!) / (2 * D!), valid: 'One-dimensional mean square displacement (Einstein); about 1e-5 m²/s for small molecules in air, 1e-9 in water.',
    example: { inputs: { x: 1, D: 1e-5 }, output: 50000 }, source: { cite: 'Berg, Random Walks in Biology, Princeton 1993, ch. 1', kind: 'textbook' }, tags: ['diffusion', 'scent', 'smell', 'oxygen', 'tissue', 'mixing'],
  },
  {
    id: 'separation.work', name: 'Least work to take out a trace', domain: 'thermal',
    statement: 'Taking a substance out of a mixture costs at least R T ln(1/x) a mole, where x is how much is left: each tenfold cleaner costs as much again, and taking out the very last of it would cost without end.',
    formula: 'W = R T ln(1/x)', inputs: [q('T', 'temperature', 'K'), q('x', 'share left (mole fraction)', '-')], output: q('W', 'least work a mole', 'J/mol'),
    constants: { R: { value: 8.314462618, unit: 'J/mol K', name: 'gas constant (exact, SI 2019)' } },
    eval: ({ T, x, R }) => R! * T! * Math.log(1 / x!), outside: ({ x }) => (x! <= 0 ? 'nothing left at all: that would take endless work' : x! >= 1 ? 'a share left is under one' : null),
    valid: 'An ideal dilute mixture at constant temperature; every real filter needs many times this.', example: { inputs: { T: 298, x: 1e-6 }, output: 34230.82673266793 },
    source: { cite: 'Çengel & Boles, Thermodynamics: An Engineering Approach, 9th ed., McGraw-Hill 2019, ch. 16 (minimum separation work)', kind: 'textbook' }, tags: ['filter', 'separation', 'purify', 'water', 'clean'],
  },
  {
    id: 'screw.efficiency', name: 'Efficiency of a power screw', domain: 'machine elements',
    statement: 'A screw\'s thread is a ramp wrapped round it: the steeper the ramp against its friction, the more of the torque becomes push. Below about half, it holds its load without a brake.',
    formula: 'η = tan λ / tan(λ + atan(μ / cos α)), tan λ = l / (π d₂)', inputs: [q('l', 'lead', 'm'), q('d2', 'pitch diameter', 'm'), q('mu', 'friction coefficient', '-'), q('alpha', 'thread half-angle', 'rad')], output: q('eta', 'efficiency', '-'),
    eval: ({ l, d2, mu, alpha }) => { const lam = Math.atan(l! / (Math.PI * d2!)); return Math.tan(lam) / Math.tan(lam + Math.atan(mu! / Math.cos(alpha!))); },
    valid: 'Raising the load; trapezoidal threads have α = 15°, square threads 0. Collar friction, if the screw bears on one, is extra.', example: { inputs: { l: 0.004, d2: 0.014, mu: 0.1, alpha: 0.2617993877991494 }, output: 0.46324813129085995 },
    source: { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, §8-2 (power screws)', kind: 'textbook' }, tags: ['lead screw', 'efficiency', 'self-locking', 'screw jack', 'linear actuator'],
  },
  // ---- the laws the seeds cited and could not run, now executable ------------------------------------------------
  {
    id: 'griffith', name: 'Griffith criterion', domain: 'materials', statement: 'A crack grows when the energy released exceeds the surface energy made: brittle strength falls with the square root of flaw size.', formula: 'σ_f = √(2 E γ / (π a))',
    inputs: [q('E', 'Young\'s modulus', 'Pa'), q('gamma', 'surface energy', 'J/m^2'), q('a', 'crack length', 'm')], output: q('sigma', 'fracture stress', 'Pa'), eval: ({ E, gamma, a }) => Math.sqrt((2 * E! * gamma!) / (Math.PI * a!)),
    valid: 'Brittle (no plastic zone); for a ductile material γ becomes the plastic work per area, a thousand times more.', example: { inputs: { E: 70e9, gamma: 1, a: 1e-6 }, output: 211100412.28223762 }, source: CALLISTER, tags: ['crack', 'glass', 'ceramic', 'fracture'],
  },
  {
    id: 'fick.diffusion', name: 'Fick\'s law of diffusion', domain: 'chemistry', statement: 'Flux is proportional to the concentration gradient; a distance L takes a time of order L²/D.', formula: 'J = D ΔC / L',
    inputs: [q('D', 'diffusivity', 'm^2/s'), q('dC', 'concentration difference', 'mol/m^3'), q('L', 'distance', 'm')], output: q('J', 'flux', 'mol/m^2 s'), eval: ({ D, dC, L }) => (D! * dC!) / L!,
    valid: 'Steady, dilute, one dimension; D of ions in water about 10^-9 m²/s, of carbon in hot iron 10^-11.', example: { inputs: { D: 1e-9, dC: 100, L: 1e-3 }, output: 0.0001 }, source: ATKINS, tags: ['diffusion', 'membrane', 'doping', 'case hardening'],
  },
  {
    id: 'bernoulli', name: 'Bernoulli\'s equation', domain: 'fluids', statement: 'Along a streamline of an ideal fluid, pressure plus kinetic plus potential energy per volume is constant: where it speeds up, the pressure falls.', formula: 'p₂ = p₁ + ½ ρ (v₁² − v₂²)',
    inputs: [q('p1', 'pressure upstream', 'Pa'), q('rho', 'density', 'kg/m^3'), q('v1', 'speed upstream', 'm/s'), q('v2', 'speed downstream', 'm/s')], output: q('p2', 'pressure downstream', 'Pa'), eval: ({ p1, rho, v1, v2 }) => p1! + 0.5 * rho! * (v1! * v1! - v2! * v2!),
    valid: 'Inviscid, incompressible, steady, same height; losses add a term (Darcy-Weisbach).', example: { inputs: { p1: 101325, rho: 1000, v1: 1, v2: 3 }, output: 97325.0 }, source: PHYSICS, tags: ['venturi', 'pump', 'valve', 'lift', 'cavitation'],
  },
  {
    id: 'nernst', name: 'Nernst equation', domain: 'chemistry', statement: 'An electrode\'s potential shifts from its standard value by (RT/zF) ln of the reaction quotient: cell voltages, membrane potentials, corrosion.', formula: 'E = E⁰ − (R T / z F) ln Q',
    inputs: [q('E0', 'standard potential', 'V'), q('T', 'temperature', 'K'), q('z', 'electrons transferred', '-'), q('Q', 'reaction quotient', '-')], output: q('E', 'potential', 'V'), constants: { R: { value: 8.314462618, unit: 'J/mol K', name: 'gas constant' }, F: { value: 96485.33212, unit: 'C/mol', name: 'Faraday constant' } },
    eval: ({ E0, T, z, Q, R: r, F: f }) => E0! - ((r! * T!) / (z! * f!)) * Math.log(Q!),
    valid: 'Activities as concentrations (dilute); z whole.', example: { inputs: { E0: 1.1, T: 298.15, z: 2, Q: 10 }, output: 1.0704203251571394 }, source: ATKINS, tags: ['battery', 'corrosion', 'membrane', 'neuron'],
  },
  {
    id: 'ampere.law', name: 'Ampère\'s law (a long solenoid)', domain: 'magnetism', statement: 'A current makes a magnetic field round it; inside a long coil the field is μ₀ times the turns per length times the current.', formula: 'B = μ₀ N I / L',
    inputs: [q('N', 'turns', '-'), q('I', 'current', 'A'), q('L', 'coil length', 'm')], output: q('B', 'field inside', 'T'), constants: { mu0: { value: 1.2566370614359173e-06, unit: 'N/A^2', name: 'permeability of free space' } }, eval: ({ N, I, L, mu0: m }) => (m! * N! * I!) / L!,
    valid: 'Length well over the diameter, air core; an iron core multiplies it by its relative permeability until it saturates.', example: { inputs: { N: 100, I: 2, L: 0.1 }, output: 0.0025132741228718345 }, source: GRIFFITHS, tags: ['solenoid', 'electromagnet', 'winding', 'inductor'],
  },
  {
    id: 'hertz.contact', name: 'Hertzian contact (a sphere on a flat)', domain: 'machine elements', statement: 'Two curved elastic bodies pressed together touch over a small area with a peak pressure that rises as the cube root of the load.', formula: 'p₀ = (6 F E*² / (π³ R²))^⅓',
    inputs: [q('F', 'load', 'N'), q('Estar', 'contact modulus', 'Pa'), q('R', 'sphere radius', 'm')], output: q('p0', 'peak contact pressure', 'Pa'), eval: ({ F, Estar, R }) => Math.cbrt((6 * F! * Estar! * Estar!) / (Math.PI ** 3 * R! * R!)),
    valid: 'Elastic, frictionless, contact small against the radius; E* = 1 / ((1 − ν₁²)/E₁ + (1 − ν₂²)/E₂), about 1.1 × 10¹¹ Pa for steel on steel.', example: { inputs: { F: 100, Estar: 1.1e11, R: 0.005 }, output: 2107895117.920457 }, source: SHIGLEY, tags: ['bearing', 'ball', 'gear tooth', 'brinelling'],
  },
  {
    id: 'coulomb.law', name: 'Coulomb\'s law', domain: 'electrical', statement: 'Charges attract or repel with a force proportional to their product over the distance squared.', formula: 'F = k q₁ q₂ / r²',
    inputs: [q('q1', 'charge', 'C'), q('q2', 'charge', 'C'), q('r', 'distance', 'm')], output: q('F', 'force', 'N'), constants: { k: { value: 8987551792.3, unit: 'N m^2/C^2', name: 'Coulomb constant' } }, eval: ({ q1, q2, r, k: kk }) => (kk! * q1! * q2!) / (r! * r!),
    valid: 'Point charges at rest in vacuum (air within 0.06 %).', example: { inputs: { q1: 1e-6, q2: 1e-6, r: 0.1 }, output: 0.8987551792299996 }, source: PHYSICS, tags: ['charge', 'electrostatic', 'ion', 'bond'],
  },
  {
    id: 'gibbs.energy', name: 'Gibbs free energy', domain: 'chemistry', statement: 'A reaction goes forward when G falls: enthalpy minus temperature times entropy; its minimum is equilibrium.', formula: 'ΔG = ΔH − T ΔS',
    inputs: [q('dH', 'enthalpy change', 'J/mol'), q('T', 'temperature', 'K'), q('dS', 'entropy change', 'J/mol K')], output: q('dG', 'free energy change', 'J/mol'), eval: ({ dH, T, dS }) => dH! - T! * dS!,
    valid: 'Constant temperature and pressure.', example: { inputs: { dH: -92000, T: 298.15, dS: -199 }, output: -32668.15 }, source: ATKINS, tags: ['reaction', 'equilibrium', 'haber', 'metabolism'],
  },
  {
    id: 'ideal.gas', name: 'Ideal gas law', domain: 'thermal', statement: 'The pressure of a dilute gas is its amount times the gas constant times its temperature over its volume.', formula: 'p = n R T / V',
    inputs: [q('n', 'amount', 'mol'), q('T', 'temperature', 'K'), q('V', 'volume', 'm^3')], output: q('p', 'pressure', 'Pa'), constants: { R: { value: 8.314462618, unit: 'J/mol K', name: 'gas constant' } }, eval: ({ n, T, V, R: r }) => (n! * r! * T!) / V!,
    valid: 'Far from condensing and at pressures of a few atmospheres or less.', example: { inputs: { n: 1, T: 273.15, V: 0.0224 }, output: 101388.19036190625 }, source: PHYSICS, tags: ['gas', 'compressor', 'tyre', 'atmosphere'],
  },
  {
    id: 'michaelis-menten', name: 'Michaelis-Menten kinetics', domain: 'chemistry', statement: 'An enzyme\'s rate rises with substrate and saturates at its maximum; at the Michaelis constant it runs at half.', formula: 'v = V_max S / (K_m + S)',
    inputs: [q('Vmax', 'maximum rate', 'mol/m^3 s'), q('S', 'substrate concentration', 'mol/m^3'), q('Km', 'Michaelis constant', 'mol/m^3')], output: q('v', 'rate', 'mol/m^3 s'), eval: ({ Vmax, S, Km }) => (Vmax! * S!) / (Km! + S!),
    valid: 'A single substrate, steady state, enzyme far below substrate.', example: { inputs: { Vmax: 1, S: 2, Km: 1 }, output: 0.6666666666666666 }, source: ATKINS, tags: ['enzyme', 'metabolism', 'saturation'],
  },
  {
    id: 'hall-petch', name: 'Hall-Petch relation', domain: 'materials', statement: 'Yield strength rises with the inverse square root of grain size: fine grains are strong.', formula: 'σ_y = σ₀ + k_y d^−½',
    inputs: [q('sigma0', 'friction stress', 'Pa'), q('ky', 'Hall-Petch coefficient', 'Pa m^0.5'), q('d', 'grain size', 'm')], output: q('sigma', 'yield strength', 'Pa'), eval: ({ sigma0, ky, d }) => sigma0! + ky! / Math.sqrt(d!),
    valid: 'Grains from about 100 nm to a millimetre; below that the trend reverses.', example: { inputs: { sigma0: 70e6, ky: 0.74e6, d: 25e-6 }, output: 218000000.0 }, source: CALLISTER, tags: ['grain', 'steel', 'grain refinement', 'strength'],
  },
  {
    id: 'planck.energy', name: 'Planck relation', domain: 'optics', statement: 'A photon\'s energy is Planck\'s constant times the speed of light over its wavelength: colour is energy.', formula: 'E = h c / λ',
    inputs: [q('lambda', 'wavelength', 'm')], output: q('E', 'photon energy', 'J'), constants: { h: { value: 6.62607015e-34, unit: 'J s', name: 'Planck constant' }, c: { value: 299792458.0, unit: 'm/s', name: 'speed of light' } }, eval: ({ lambda, h: hh, c: cc }) => (hh! * cc!) / lambda!,
    valid: 'In vacuum.', example: { inputs: { lambda: 500e-9 }, output: 3.972891714297857e-19 }, source: PHYSICS, tags: ['light', 'led', 'photodiode', 'photosynthesis'],
  },
  {
    id: 'shannon.capacity', name: 'Shannon capacity', domain: 'information', statement: 'A channel carries at most its bandwidth times log₂(1 + signal to noise) bits a second, whatever the code.', formula: 'C = B log₂(1 + S/N)',
    inputs: [q('B', 'bandwidth', 'Hz'), q('snr', 'signal to noise power ratio', '-')], output: q('C', 'capacity (bits per second)', 'Hz'), eval: ({ B, snr }) => B! * Math.log2(1 + snr!),
    valid: 'Additive white Gaussian noise.', example: { inputs: { B: 1e6, snr: 1000 }, output: 9967226.258835994 }, source: COVER, tags: ['channel', 'network', 'bus', 'noise'],
  },
  {
    id: 'snell.law', name: 'Snell\'s law', domain: 'optics', statement: 'Light bends at an interface by the ratio of refractive indices: lenses, fibres, the eye.', formula: 'n₁ sin θ₁ = n₂ sin θ₂',
    inputs: [q('n1', 'index of the first medium', '-'), q('n2', 'index of the second', '-'), q('theta1', 'angle of incidence', 'rad')], output: q('theta2', 'angle of refraction', 'rad'), eval: ({ n1, n2, theta1 }) => Math.asin((n1! * Math.sin(theta1!)) / n2!),
    valid: 'Below the critical angle when going into the thinner medium; otherwise total internal reflection.', example: { inputs: { n1: 1, n2: 1.5, theta1: 0.5 }, output: 0.32532528522279924 }, source: PHYSICS, tags: ['lens', 'fibre', 'eye', 'refraction'],
  },
  {
    id: 'faraday.induction', name: 'Faraday\'s law of induction', domain: 'magnetism', statement: 'A changing magnetic flux through a loop induces a voltage round it equal to the rate of change, times the turns: generators, transformers, inductors.', formula: 'V = N A dB/dt',
    inputs: [q('N', 'turns', '-'), q('A', 'loop area', 'm^2'), q('dBdt', 'rate of change of the field', 'T/s')], output: q('V', 'induced voltage', 'V'), eval: ({ N, A, dBdt }) => N! * A! * dBdt!,
    valid: 'A uniform field normal to the loop.', example: { inputs: { N: 100, A: 1e-3, dBdt: 10 }, output: 1.0 }, source: GRIFFITHS, tags: ['generator', 'transformer', 'inductor', 'motor'],
  },
  {
    id: 'faraday.electrolysis', name: 'Faraday\'s laws of electrolysis', domain: 'chemistry', statement: 'The mass deposited or dissolved is the charge passed times the molar mass over the electrons per ion and the Faraday constant: plating, refining, batteries.', formula: 'm = M I t / (z F)',
    inputs: [q('M', 'molar mass', 'kg/mol'), q('I', 'current', 'A'), q('t', 'time', 's'), q('z', 'electrons per ion', '-')], output: q('m', 'mass', 'kg'), constants: { F: { value: 96485.33212, unit: 'C/mol', name: 'Faraday constant' } }, eval: ({ M, I, t, z, F: f }) => (M! * I! * t!) / (z! * f!),
    valid: 'At the current efficiency of the bath (100 % here).', example: { inputs: { M: 0.06355, I: 2, t: 3600, z: 2 }, output: 0.0023711376120410035 }, source: BARD, tags: ['plating', 'refining', 'battery', 'copper'],
  },
  {
    id: 'shockley.diode', name: 'Shockley diode equation', domain: 'electrical', statement: 'A junction\'s current rises exponentially with its forward voltage, by n times the thermal voltage kT/q (25.85 mV at 300 K) per e-fold.', formula: 'I = I_s (e^(V / n V_T) − 1)',
    inputs: [q('Is', 'saturation current', 'A'), q('V', 'forward voltage', 'V'), q('n', 'ideality factor', '-'), q('Vt', 'thermal voltage k T / q', 'V')], output: q('I', 'current', 'A'), eval: ({ Is, V, n, Vt }) => Is! * (Math.exp(V! / (n! * Vt!)) - 1),
    valid: 'Below the series-resistance knee; n from 1 (ideal) to 2; V_T = k T / q, 25.85 mV at 300 K.', example: { inputs: { Is: 1e-12, V: 0.6, n: 1, Vt: 0.025851999786435535 }, output: 0.01201036955312849 }, source: KITTEL, tags: ['diode', 'led', 'transistor', 'junction'],
  },
  {
    id: 'shannon.sampling', name: 'Nyquist-Shannon sampling theorem', domain: 'information', statement: 'A signal sampled above twice its highest frequency is recovered exactly; below that, higher frequencies alias into lower ones.', formula: 'f_s ≥ 2 f_max',
    inputs: [q('fmax', 'highest frequency in the signal', 'Hz')], output: q('fs', 'least sampling rate', 'Hz'), eval: ({ fmax }) => 2 * fmax!,
    valid: 'A band-limited signal; real converters sample a few times faster and filter first.', example: { inputs: { fmax: 20000 }, output: 40000.0 }, source: PHYSICS, tags: ['adc', 'sampling', 'aliasing', 'audio'],
  },
  {
    id: 'conservation.momentum', name: 'Conservation of momentum (two bodies that stick)', domain: 'mechanics', statement: 'The momentum of a closed system is constant: two bodies that collide and stick move on together at the momentum-weighted mean of their speeds.', formula: 'v = (m₁ v₁ + m₂ v₂) / (m₁ + m₂)',
    inputs: [q('m1', 'mass', 'kg'), q('v1', 'speed', 'm/s'), q('m2', 'mass', 'kg'), q('v2', 'speed', 'm/s')], output: q('v', 'common speed after', 'm/s'), eval: ({ m1, v1, m2, v2 }) => (m1! * v1! + m2! * v2!) / (m1! + m2!),
    valid: 'No outside force during the collision; along one line.', example: { inputs: { m1: 2, v1: 3, m2: 1, v2: 0 }, output: 2.0 }, source: PHYSICS, tags: ['collision', 'rocket', 'propeller', 'impact'],
  },
  {
    id: 'continuity', name: 'Continuity equation', domain: 'fluids', statement: 'Mass flow in equals mass flow out of a steady volume: a pipe narrowing speeds its flow by the ratio of areas.', formula: 'v₂ = v₁ A₁ / A₂',
    inputs: [q('v1', 'speed upstream', 'm/s'), q('A1', 'area upstream', 'm^2'), q('A2', 'area downstream', 'm^2')], output: q('v2', 'speed downstream', 'm/s'), eval: ({ v1, A1, A2 }) => (v1! * A1!) / A2!,
    valid: 'Incompressible, steady.', example: { inputs: { v1: 1, A1: 0.01, A2: 0.0025 }, output: 4.0 }, source: PHYSICS, tags: ['pipe', 'nozzle', 'venturi', 'valve'],
  },
  {
    id: 'clausius-clapeyron', name: 'Clausius-Clapeyron relation', domain: 'thermal', statement: 'A phase boundary\'s pressure rises with temperature by the latent heat over the temperature times the change of specific volume.', formula: 'dp/dT = L / (T Δv)',
    inputs: [q('L', 'latent heat', 'J/kg'), q('T', 'temperature', 'K'), q('dv', 'change of specific volume', 'm^3/kg')], output: q('dpdT', 'slope of the boundary', 'Pa/K'), eval: ({ L, T, dv }) => L! / (T! * dv!),
    valid: 'Along the coexistence line; for boiling at 100 °C, water\'s 2.26 MJ/kg and 1.67 m³/kg give 3.6 kPa/K.', example: { inputs: { L: 2.26e6, T: 373.15, dv: 1.672 }, output: 3622.335900169705 }, source: ATKINS, tags: ['boiling', 'melting', 'weather', 'phase'],
  },
  {
    id: 'hill.muscle', name: 'Hill\'s muscle equation', domain: 'mechanics', statement: 'A muscle\'s force falls with its shortening speed along a hyperbola, (F + a)(v + b) = (F₀ + a) b; its power peaks near a third of its maximum speed.', formula: 'F = (F₀ + a) b / (v + b) − a',
    inputs: [q('F0', 'isometric force', 'N'), q('a', 'Hill force constant', 'N'), q('b', 'Hill speed constant', 'm/s'), q('v', 'shortening speed', 'm/s')], output: q('F', 'force', 'N'), eval: ({ F0, a, b, v }) => ((F0! + a!) * b!) / (v! + b!) - a!,
    valid: 'Shortening only; a about F₀/4, b about a quarter of the maximum speed.', example: { inputs: { F0: 100, a: 25, b: 0.25, v: 0.5 }, output: 16.666666666666664 }, source: MCMAHON, tags: ['muscle', 'actuator', 'power', 'locomotion'],
  },
  {
    id: 'grubler', name: 'Gruebler\'s equation (planar)', domain: 'machine elements', statement: 'A planar mechanism\'s degrees of freedom are three per moving link less two per full joint and one per half joint.', formula: 'M = 3 (n − 1) − 2 j₁ − j₂',
    inputs: [q('n', 'links, the ground among them', '-'), q('j1', 'full joints (pins, sliders)', '-'), q('j2', 'half joints (cam, gear contacts)', '-')], output: q('M', 'degrees of freedom', '-'), eval: ({ n, j1, j2 }) => 3 * (n! - 1) - 2 * j1! - j2!,
    valid: 'Planar; a four-bar linkage (n = 4, j₁ = 4) has one.', example: { inputs: { n: 4, j1: 4, j2: 0 }, output: 1 }, source: NORTON, tags: ['linkage', 'mechanism', 'joint', 'kinematics'],
  },
  {
    id: 'boltzmann.distribution', name: 'Boltzmann distribution', domain: 'thermal', statement: 'The probability of a state falls as exp(−E/kT) with its energy: carrier populations, reaction rates, the folding of proteins.', formula: 'p₂/p₁ = e^(−ΔE / k T)',
    inputs: [q('dE', 'energy above the ground state', 'J'), q('T', 'temperature', 'K')], output: q('ratio', 'population ratio', '-'), constants: { k: { value: 1.380649e-23, unit: 'J/K', name: 'Boltzmann constant' } }, eval: ({ dE, T, k }) => Math.exp(-dE! / (k! * T!)),
    valid: 'Thermal equilibrium; 0.1 eV above the ground state at room temperature is one in fifty.', example: { inputs: { dE: 1.602176634e-20, T: 300 }, output: 0.020896518618090255 }, source: ATKINS, tags: ['statistics', 'semiconductor', 'reaction', 'protein'],
  },
  {
    id: 'queueing', name: 'Little\'s law', domain: 'information', statement: 'The items in a steady system equal their arrival rate times the time each spends in it: a queue, a network, a shop floor.', formula: 'L = λ W',
    inputs: [q('lambda', 'arrival rate', '1/s'), q('W', 'time in the system', 's')], output: q('L', 'items in the system', '-'), eval: ({ lambda, W }) => lambda! * W!,
    valid: 'Steady state, any arrival pattern.', example: { inputs: { lambda: 10, W: 0.5 }, output: 5.0 }, source: PHYSICS, tags: ['queue', 'network', 'latency', 'throughput'],
  },
  {
    id: 'first.law', name: 'First law of thermodynamics', domain: 'thermal', statement: 'Energy is conserved: heat in minus work out is the change in internal energy.', formula: 'ΔU = Q − W',
    inputs: [q('Q', 'heat in', 'J'), q('W', 'work out', 'J')], output: q('dU', 'change in internal energy', 'J'), eval: ({ Q, W }) => Q! - W!,
    valid: 'A closed system.', example: { inputs: { Q: 1000, W: 300 }, output: 700 }, source: PHYSICS, tags: ['energy', 'engine', 'metabolism', 'heat'],
  },
  {
    id: 'froude', name: 'Froude number of a gait', domain: 'mechanics', statement: 'Speed squared over gravity times leg length: animals of every size change gait at the same Froude number, walking to running near one half.', formula: 'Fr = v² / (g L)',
    inputs: [q('v', 'speed', 'm/s'), q('L', 'leg length', 'm')], output: q('Fr', 'Froude number', '-'), constants: G, eval: ({ v, L, g: gg }) => (v! * v!) / (gg! * L!),
    valid: 'Legged locomotion; the hip height as the leg length.', example: { inputs: { v: 1.5, L: 0.9 }, output: 0.25492905324448206 }, source: MCMAHON, tags: ['walking', 'gait', 'scale', 'legs'],
  },
  {
    id: 'butler-volmer', name: 'Butler-Volmer equation', domain: 'chemistry', statement: 'Electrode current rises exponentially with overpotential in both directions, by the transfer coefficients over the thermal voltage R T / F (25.7 mV at 25 °C): why a cell\'s voltage sags under load.', formula: 'i = i₀ (e^(α_a η / V_T) − e^(−α_c η / V_T))',
    inputs: [q('i0', 'exchange current density', 'A/m^2'), q('eta', 'overpotential', 'V'), q('Vt', 'thermal voltage R T / F', 'V'), q('alphaA', 'anodic transfer coefficient', '-'), q('alphaC', 'cathodic transfer coefficient', '-')], output: q('i', 'current density', 'A/m^2'),
    eval: ({ i0, eta, Vt, alphaA, alphaC }) => i0! * (Math.exp((alphaA! * eta!) / Vt!) - Math.exp((-alphaC! * eta!) / Vt!)),
    valid: 'Kinetics only, before mass transport limits the current; V_T = R T / F, 25.7 mV at 25 °C.', example: { inputs: { i0: 1, eta: 0.1, Vt: 0.025692579121493725, alphaA: 0.5, alphaC: 0.5 }, output: 6.85840779126327 }, source: BARD, tags: ['battery', 'electrode', 'overpotential', 'corrosion'],
  },
  {
    id: 'tsiolkovsky', name: 'Rocket equation', domain: 'mechanics', statement: 'Velocity gained is the exhaust speed times the log of the initial over the final mass.', formula: 'Δv = v_e ln(m₀ / m₁)',
    inputs: [q('ve', 'exhaust speed', 'm/s'), q('m0', 'initial mass', 'kg'), q('m1', 'final mass', 'kg')], output: q('dv', 'velocity gained', 'm/s'), eval: ({ ve, m0, m1 }) => ve! * Math.log(m0! / m1!),
    valid: 'No gravity or drag during the burn.', example: { inputs: { ve: 3000, m0: 10, m1: 1 }, output: 6907.7552789821375 }, source: PHYSICS, tags: ['rocket', 'propulsion', 'thrust'],
  },
  {
    id: 'bragg.law', name: 'Bragg\'s law', domain: 'optics', statement: 'Waves reflect from crystal planes only at angles where the path difference between planes is whole wavelengths: how structure is seen.', formula: 'n λ = 2 d sin θ',
    inputs: [q('d', 'plane spacing', 'm'), q('theta', 'glancing angle', 'rad'), q('n', 'order', '-')], output: q('lambda', 'wavelength', 'm'), eval: ({ d, theta, n }) => (2 * d! * Math.sin(theta!)) / n!,
    valid: 'Wavelength of the order of the spacing (X-rays for crystals).', example: { inputs: { d: 2.5e-10, theta: 0.3, n: 1 }, output: 1.4776010333066977e-10 }, source: KITTEL, tags: ['crystal', 'x-ray', 'diffraction', 'structure'],
  },
  {
    id: 'cable.equation', name: 'Cable equation (the length constant)', domain: 'electrical', statement: 'A leaky conductor\'s steady signal decays with distance over a length constant, the root of the membrane resistance per length over the inner resistance per length: the axon, the undersea cable.', formula: 'λ = √(r_m / r_i)',
    inputs: [q('rm', 'leak resistance of a unit length', 'ohm m'), q('ri', 'inner resistance per length', 'ohm/m')], output: q('lambda', 'length constant', 'm'), eval: ({ rm, ri }) => Math.sqrt(rm! / ri!),
    valid: 'Steady state; the time constant r_m c_m sets the spreading.', example: { inputs: { rm: 1, ri: 0.5 }, output: 1.4142135623730951 }, source: PHYSICS, tags: ['axon', 'cable', 'signal', 'neuron'],
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
