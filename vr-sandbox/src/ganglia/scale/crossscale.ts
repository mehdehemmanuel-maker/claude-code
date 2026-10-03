// Cross-scale dynamics as first-class middle structures. A description at one scale is joined to the next by steps:
// microstate → interaction → transition → collective state → emergent variable → macrostate, each step saying what it
// carries between the scales (energy, information, momentum, matter, causality) and by which law; and the reverse
// path: macro constraint → allowed microconfigurations → micro dynamics → realisation. Emergence is not one-way.
// Heat is the worked case: never a static object, but STATE + GRADIENT + TRANSPORT + INTERACTION at each scale.
import type { Source } from '../types';
import type { Epistemic } from './transform';

export type Carries = 'energy' | 'information' | 'momentum' | 'matter' | 'causality';

export interface Level { scale: 'micro' | 'meso' | 'macro'; name: string; description: string; variables: string[]; characteristicLength: number; characteristicTime: number }
export interface Step { from: string; to: string; via: 'interaction' | 'transition' | 'collective' | 'emergent-variable' | 'constraint' | 'configuration' | 'dynamics' | 'realisation'; carries: Carries[]; says: string; law?: string }

export interface CrossScale {
  id: string;
  name: string;
  says: string;
  levels: Level[];
  /** Upward: how the macro description comes from the micro one. */
  up: Step[];
  /** Downward: how a macro constraint selects micro configurations. */
  down: Step[];
  /** What is lost in coarse-graining, what appears, what stays. */
  disappears: string[];
  appears: string[];
  invariant: string[];
  /** Where the macro description stops holding. */
  breaks: string[];
  status: Epistemic;
  source: Source;
}

const REIF: Source = { cite: 'Reif, Fundamentals of Statistical and Thermal Physics, McGraw-Hill 1965, ch. 2 to 7; Incropera et al., ch. 1 and 2', kind: 'textbook' };
const LANDAU: Source = { cite: 'Landau & Lifshitz, Theory of Elasticity, 3rd ed., 1986, §1 and §22; Goldstein, Classical Mechanics, 3rd ed., ch. 5 (rigid bodies)', kind: 'textbook' };
const ASHCROFT: Source = { cite: 'Ashcroft & Mermin, Solid State Physics, 1976, ch. 1 (Drude model) and ch. 13', kind: 'textbook' };

export const CROSS_SCALES: CrossScale[] = [
  { id: 'cross.heat', name: 'heat, from molecules to a temperature field', says: 'Heat is a state (energy in molecular motion), a gradient (uneven across a body), a transport (conducted, convected, radiated), an interaction (collisions, phonons, photons) and a description at each scale.',
    levels: [
      { scale: 'micro', name: 'molecular and lattice energy states', description: 'Molecules and lattice vibrations each carry kinetic and potential energy; in a solid, quantised lattice waves (phonons) and electron states.', variables: ['velocity of each molecule', 'phonon occupation numbers', 'electron energies'], characteristicLength: 3e-10, characteristicTime: 1e-13 },
      { scale: 'meso', name: 'transport and local gradients', description: 'Over many mean free paths the energy spreads: a local temperature, a local heat flux proportional to the gradient, excitations scattering.', variables: ['local temperature T(x)', 'heat flux q(x)', 'mean free path', 'local equilibrium'], characteristicLength: 1e-7, characteristicTime: 1e-9 },
      { scale: 'macro', name: 'temperature field and conductivity', description: 'A body has a temperature field obeying the heat equation, a conductivity, a heat capacity, a time constant; it radiates by its surface and temperature.', variables: ['temperature field', 'heat flow', 'conductivity k', 'heat capacity c', 'time constant τ'], characteristicLength: 1e-2, characteristicTime: 1e2 },
    ],
    up: [
      { from: 'molecular energy states', to: 'collisions and phonon scattering', via: 'interaction', carries: ['energy', 'momentum'], says: 'Molecules exchange energy in collisions; lattice waves scatter on each other and on defects.' },
      { from: 'collisions', to: 'energy redistribution', via: 'transition', carries: ['energy'], says: 'Each collision moves energy from the faster to the slower on average: the distribution relaxes.' },
      { from: 'energy redistribution', to: 'the Maxwell-Boltzmann distribution', via: 'collective', carries: ['information'], says: 'After a few collision times the velocities take the one distribution with the most microstates for the energy: equilibrium.', law: 'boltzmann.distribution' },
      { from: 'the distribution', to: 'temperature', via: 'emergent-variable', carries: ['information'], says: 'Temperature is the parameter of that distribution: 3/2 k_B T of kinetic energy per molecule. It does not exist for one molecule.', law: 'landauer' },
      { from: 'temperature with a gradient', to: 'heat flux', via: 'collective', carries: ['energy'], says: 'Where temperature varies, more energy crosses a plane from the hot side than the cold: a flux proportional to the gradient, with the conductivity set by mean free path and carrier speed.', law: 'conduction' },
      { from: 'heat flux and heat capacity', to: 'the temperature field in time', via: 'emergent-variable', carries: ['energy', 'causality'], says: 'Energy conservation with Fourier\'s law gives the heat equation; a body cools with a time constant m c/(h A); the surface radiates as T⁴.', law: 'lumped.time-constant' },
    ],
    down: [
      { from: 'a macro constraint: this surface held at 300 K', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'Fixing the temperature fixes the distribution of molecular energies, not any molecule\'s energy: an enormous set of microstates is allowed, all with the same macro description.' },
      { from: 'allowed microconfigurations', to: 'micro dynamics', via: 'configuration', carries: ['energy'], says: 'Within that set the molecules still move and collide; the macro constraint is kept by the walls exchanging energy.' },
      { from: 'micro dynamics', to: 'a realisation', via: 'realisation', carries: ['matter', 'energy'], says: 'A heater, a heatsink and a controller make the constraint real: the macro variable is actuated through micro collisions at the surface.' },
    ],
    disappears: ['the velocity of any one molecule', 'the phase of any lattice wave', 'which collision happened'],
    appears: ['temperature', 'entropy', 'conductivity', 'heat capacity', 'a time constant', 'irreversibility (the arrow of time)'],
    invariant: ['energy', 'the number of molecules', 'the dimensionless groups Bi, Fo, Pr that decide the regime'],
    breaks: ['below a few mean free paths (Kn > 0.01): no local temperature, ballistic transport', 'faster than the collision time: no equilibrium distribution', 'at the quantum limit: phonons are discrete, specific heat falls (Debye)'],
    status: 'theorem', source: REIF },
  { id: 'cross.rigid-body', name: 'a rigid body, from atoms to the simulation', says: 'The engine\'s rigid body is a macro description: atoms in a lattice, elastic waves between them, and a continuum whose wave transit is faster than anything the engine resolves.',
    levels: [
      { scale: 'micro', name: 'atoms bound in a lattice', description: 'Atoms held by interatomic forces at fixed spacing; a displacement of one pulls its neighbours.', variables: ['atomic positions', 'bond forces'], characteristicLength: 2.5e-10, characteristicTime: 1e-13 },
      { scale: 'meso', name: 'elastic continuum', description: 'Over many atoms, a strain field and a stress field with a modulus; disturbances travel as elastic waves at the speed of sound.', variables: ['strain', 'stress', 'modulus E', 'density ρ', 'wave speed c'], characteristicLength: 1e-3, characteristicTime: 1e-6 },
      { scale: 'macro', name: 'rigid body', description: 'When the wave transit across the body is far shorter than the time step, every force acts on the whole body at once: six degrees of freedom, a mass, an inertia tensor.', variables: ['position', 'orientation', 'velocity', 'angular velocity', 'mass', 'inertia'], characteristicLength: 1e-1, characteristicTime: 1e-2 },
    ],
    up: [
      { from: 'atoms', to: 'bond forces', via: 'interaction', carries: ['momentum', 'energy'], says: 'Each atom pushes and pulls its neighbours.' },
      { from: 'bond forces', to: 'strain and stress fields', via: 'collective', carries: ['momentum'], says: 'Averaged over many atoms the displacements are a strain field and the forces a stress field: Hooke\'s law with a modulus.', law: 'hooke' },
      { from: 'stress field', to: 'elastic waves', via: 'transition', carries: ['energy', 'causality'], says: 'A stress at one place reaches another at the speed of sound c = √(E/ρ): nothing in a solid is instantaneous.' },
      { from: 'elastic waves faster than the step', to: 'rigidity', via: 'emergent-variable', carries: ['causality'], says: 'When L/c is far below the time step, the engine cannot tell the wave from an instantaneous transmission: the body is treated as rigid. Rigidity is a statement about the observer\'s time.', law: 'natural.frequency' },
    ],
    down: [
      { from: 'a macro constraint: this rod is rigid', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'Rigidity constrains the strain to be small: the atoms stay near their lattice sites, and the stress stays below yield.' },
      { from: 'small strain', to: 'elastic dynamics', via: 'dynamics', carries: ['energy'], says: 'The rod still rings at its natural frequencies; the engine does not see them, the energy ledger books them as heat.' },
      { from: 'elastic dynamics', to: 'a realisation', via: 'realisation', carries: ['matter'], says: 'A steel rod of this section, made by rolling and cutting, realises the rigid body to the tolerance the engine resolves.' },
    ],
    disappears: ['strain', 'stress waves', 'ringing', 'thermal expansion'],
    appears: ['a single pose', 'an inertia tensor', 'instantaneous force transmission', 'contact as impulse'],
    invariant: ['mass', 'momentum', 'the dimensionless ratio L/(c Δt) that decides whether rigidity holds'],
    breaks: ['when L/(c Δt) is not small: long structures, soft materials, fast impacts', 'when stress passes yield: the lattice slips', 'when the body is thin: it bends (the engine has segments for that)'],
    status: 'theorem', source: LANDAU },
  { id: 'cross.current', name: 'electric current, from electrons to Ohm\'s law', says: 'A current is electrons drifting through a lattice: a micro description with fields and collisions, a macro one with resistance and voltage.',
    levels: [
      { scale: 'micro', name: 'conduction electrons in a lattice', description: 'Electrons at the Fermi speed scatter on lattice vibrations and defects every few tens of femtoseconds.', variables: ['electron velocities', 'scattering time', 'field E'], characteristicLength: 4e-8, characteristicTime: 2.5e-14 },
      { scale: 'meso', name: 'drift and local conductivity', description: 'In a field the scattered electrons drift slowly against it; a local current density proportional to the field: conductivity.', variables: ['drift velocity', 'current density J', 'conductivity σ'], characteristicLength: 1e-6, characteristicTime: 1e-12 },
      { scale: 'macro', name: 'resistance, voltage, current', description: 'A wire has a resistance; a voltage across it drives a current; the signal itself crosses it near the speed of light while the electrons crawl.', variables: ['current I', 'voltage V', 'resistance R', 'power loss I²R'], characteristicLength: 1, characteristicTime: 1e-3 },
    ],
    up: [
      { from: 'electrons', to: 'scattering on the lattice', via: 'interaction', carries: ['momentum', 'energy'], says: 'An electron accelerated by the field loses its gained momentum on the next scattering: the energy goes to the lattice as heat.', law: 'joule' },
      { from: 'scattering', to: 'drift', via: 'collective', carries: ['momentum'], says: 'Averaged over scatterings, a steady drift against the field, millimetres per second.' },
      { from: 'drift', to: 'conductivity', via: 'emergent-variable', carries: ['information'], says: 'Current density proportional to field: σ = n e² τ/m (Drude).', law: 'ohm' },
      { from: 'conductivity and geometry', to: 'resistance', via: 'emergent-variable', carries: ['causality'], says: 'R = L/(σ A): a property of the wire, not of an electron.', law: 'wire.resistance' },
    ],
    down: [
      { from: 'a macro constraint: 2 A through this wire', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'Fixes the mean drift, not which electrons move; the field adjusts until the drift gives that current.' },
      { from: 'the drift', to: 'micro dynamics', via: 'dynamics', carries: ['energy'], says: 'Each electron still scatters at the same rate; the lattice warms at I²R.' },
      { from: 'warming', to: 'a realisation', via: 'realisation', carries: ['matter'], says: 'A wire gauge chosen for that current keeps the lattice below the insulation\'s limit.' },
    ],
    disappears: ['any one electron\'s path', 'the Fermi speed', 'the scattering time'],
    appears: ['resistance', 'Joule heating', 'the signal speed near c, unrelated to the drift'],
    invariant: ['charge', 'energy', 'the number of carriers'],
    breaks: ['at the skin depth for alternating current', 'at the mean free path for very thin films', 'at superconductivity: the scattering picture fails'],
    status: 'theorem', source: ASHCROFT },
];

export const crossScaleById = (id: string) => CROSS_SCALES.find((c) => c.id === id);

/** The questions the layer asks of any description: answered from a cross-scale structure. */
export function askOf(c: CrossScale, scale: Level['scale']) {
  const level = c.levels.find((l) => l.scale === scale)!;
  const i = c.levels.indexOf(level);
  return {
    validAt: `${level.name}: lengths about ${level.characteristicLength.toExponential(0)} m, times about ${level.characteristicTime.toExponential(0)} s`,
    variables: level.variables,
    disappearsGoingUp: i < c.levels.length - 1 ? c.disappears : [],
    appearsGoingUp: i < c.levels.length - 1 ? c.appears : [],
    invariant: c.invariant,
    carriesUp: c.up.flatMap((s) => s.carries).filter((x, k, a) => a.indexOf(x) === k),
    transformation: i < c.levels.length - 1 ? c.up.filter((s) => s.via === 'collective' || s.via === 'emergent-variable').map((s) => `${s.from} → ${s.to} (${s.via}${s.law ? `, ${s.law}` : ''})`) : [],
    breaks: c.breaks,
  };
}
