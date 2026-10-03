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

const ALBERTS: Source = { cite: 'Alberts et al., Molecular Biology of the Cell, 6th ed., Garland 2015, ch. 16; Hill, "The heat of shortening and the dynamic constants of muscle", Proc. R. Soc. B 126 (1938) 136', kind: 'textbook' };
const KANDEL: Source = { cite: 'Kandel et al., Principles of Neural Science, 5th ed., McGraw-Hill 2013, ch. 2 and 67; Goodfellow, Bengio & Courville, Deep Learning, MIT 2016, ch. 6; Hornik, Stinchcombe & White, Neural Networks 2 (1989) 359', kind: 'textbook' };
const HORTON: Source = { cite: 'Horton, "Erosional development of streams and their drainage basins", GSA Bulletin 56 (1945) 275; Strahler (1952); Rodríguez-Iturbe & Rinaldo, Fractal River Basins, Cambridge 1997', kind: 'paper' };
const SHIGLEY: Source = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., ch. 13 and 14 (gears); Hertz (1882) on contact', kind: 'textbook' };

export const CROSS_SCALES: CrossScale[] = [
  { id: 'cross.neural-network', name: 'a neural network, from a synapse to a function', says: 'A function is computed by nothing that computes it: synapses weight, neurons threshold, layers compose, and a mapping emerges that no single unit holds.',
    levels: [
      { scale: 'micro', name: 'a synapse and a neuron', description: 'A synapse scales an input by a weight that use changes; a neuron sums its inputs and fires past a threshold: a weighted sum against a step, a millisecond at a time.', variables: ['weights', 'membrane potential', 'threshold', 'firing rate'], characteristicLength: 1e-6, characteristicTime: 1e-3 },
      { scale: 'meso', name: 'a layer', description: 'Many units on the same inputs make a layer: a linear map followed by a nonlinearity; a population code that no unit carries alone.', variables: ['activation vector', 'weight matrix', 'nonlinearity', 'population code'], characteristicLength: 1e-3, characteristicTime: 1e-2 },
      { scale: 'macro', name: 'a function', description: 'Layers composed: a mapping from inputs to outputs that approximates any continuous function given width (the universal approximation theorem), learned by moving the weights down a loss.', variables: ['the mapping', 'loss', 'generalisation', 'representation'], characteristicLength: 1e-1, characteristicTime: 1e-1 },
    ],
    up: [
      { from: 'an input and a weight', to: 'a weighted contribution', via: 'interaction', carries: ['information'], says: 'A synapse multiplies: the signal arrives scaled by a number that experience set.', law: 'hebb.rule' },
      { from: 'contributions summed', to: 'a firing decision', via: 'transition', carries: ['information', 'energy'], says: 'The membrane integrates and crosses or does not cross its threshold: a nonlinearity, where the computation lives.', law: 'hodgkin-huxley' },
      { from: 'many units', to: 'a population code', via: 'collective', carries: ['information'], says: 'Together the units span a space; a feature is a direction in it, held by no unit alone.' },
      { from: 'layers composed', to: 'a function', via: 'emergent-variable', carries: ['information', 'causality'], says: 'Composition makes the mapping; with enough width it can approximate any continuous function on a compact set.', law: 'universal.approximation' },
    ],
    down: [
      { from: 'a macro constraint: this input must map to that output', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'The loss constrains the weights to a region; countless weight settings realise the same mapping.' },
      { from: 'the loss', to: 'micro dynamics', via: 'dynamics', carries: ['information'], says: 'Each weight moves against the gradient of the loss: learning is micro dynamics driven by a macro error.' },
      { from: 'trained weights', to: 'a realisation', via: 'realisation', carries: ['matter', 'energy'], says: 'In a brain, synapses grown and pruned; in silicon, numbers in memory read by multipliers, watts per inference.' },
    ],
    disappears: ['any one weight\'s value', 'which unit fired', 'the timing of a spike'],
    appears: ['a feature', 'a representation', 'generalisation', 'the function itself'],
    invariant: ['the mapping under permutation of units in a layer', 'the number of parameters'],
    breaks: ['outside the training distribution: the function is not the one wanted', 'with too little width or depth: no approximation', 'when weights saturate: no gradient, no learning'],
    status: 'theorem', source: KANDEL },
  { id: 'cross.river-basin', name: 'a river basin, from a raindrop to a drainage network', says: 'Water falling at random on a slope organises itself into a tree of channels whose branching obeys the same ratios from a rill to the Amazon.',
    levels: [
      { scale: 'micro', name: 'raindrops on a slope', description: 'Drops land, infiltrate or run off; the runoff of a square metre finds the lowest path, and a rill a centimetre wide forms where flow concentrates enough to move grains.', variables: ['rainfall rate', 'infiltration', 'slope', 'grain size', 'shear stress'], characteristicLength: 1e-2, characteristicTime: 1e2 },
      { scale: 'meso', name: 'channels joining', description: 'Rills join into streams; each junction adds discharge; the channel widens and deepens with the flow it carries: hydraulic geometry.', variables: ['discharge', 'channel width and depth', 'stream order', 'junction angle'], characteristicLength: 1e3, characteristicTime: 1e5 },
      { scale: 'macro', name: 'the basin and its network', description: 'A tree of channels draining an area: the number, length and area of streams of each order go in constant ratios (Horton), the basin is self-similar, and discharge at the mouth integrates the rain over the area and the time of travel.', variables: ['drainage area', 'bifurcation ratio about 4', 'length ratio about 2', 'discharge at the outlet', 'time of concentration'], characteristicLength: 1e5, characteristicTime: 1e6 },
    ],
    up: [
      { from: 'a drop and the ground', to: 'runoff or infiltration', via: 'interaction', carries: ['matter', 'energy'], says: 'What does not soak in flows downhill, carrying potential energy to spend on moving sediment.', law: 'energy.potential' },
      { from: 'runoff concentrating', to: 'a rill', via: 'transition', carries: ['matter', 'momentum'], says: 'Where the shear stress on the bed passes the grains\' threshold a channel cuts itself: a positive feedback, flow deepening what collects flow.' },
      { from: 'rills joining', to: 'stream orders', via: 'collective', carries: ['matter'], says: 'Two streams of an order make the next: Strahler ordering, and the ratios between orders settle to the same numbers everywhere.' },
      { from: 'the network', to: 'Horton\'s laws and the basin\'s response', via: 'emergent-variable', carries: ['information', 'matter'], says: 'Bifurcation ratio about 4, length ratio about 2, area ratio about 5: a self-similar tree, and a hydrograph that is the network\'s width function convolved with the rain.' },
    ],
    down: [
      { from: 'a macro constraint: this rain on this basin', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'The outlet discharge fixes how much water moved, not which paths it took: any network of the same width function gives the same hydrograph.' },
      { from: 'the network', to: 'micro dynamics', via: 'dynamics', carries: ['energy'], says: 'Each reach adjusts its slope and section toward the least energy spent per unit discharge (optimal channel networks).' },
      { from: 'adjusted channels', to: 'a realisation', via: 'realisation', carries: ['matter'], says: 'The landscape itself: the basin is the record of a million years of the micro rule.' },
    ],
    disappears: ['where any drop fell', 'which rill formed first', 'the grain that moved'],
    appears: ['stream order', 'Horton\'s ratios', 'the hydrograph', 'a drainage density'],
    invariant: ['water and sediment mass', 'the branching ratios across orders (self-similarity)', 'the fractal dimension of the network near 1.8'],
    breaks: ['on rock that fractures along joints: the network follows the joints, not the ratios', 'under ice or in karst: drainage goes underground', 'at the scale of a single rill: no statistics to be self-similar'],
    status: 'empirical-law', source: HORTON },
  { id: 'cross.muscle', name: 'muscle, from myosin heads to a limb', says: 'A muscle is a billion molecular ratchets in series and parallel: a nanometre step at the bottom, a stroke at the top, with the force-velocity curve emerging between.',
    levels: [
      { scale: 'micro', name: 'myosin heads on actin', description: 'A myosin head binds actin, swings 5 to 10 nm on ATP hydrolysis, releases, rebinds: a stochastic ratchet.', variables: ['head state (bound, swung, released)', 'ATP concentration', 'step 5 nm', 'force per head 2 to 5 pN'], characteristicLength: 1e-8, characteristicTime: 1e-3 },
      { scale: 'meso', name: 'sarcomeres in a fibre', description: 'Thousands of sarcomeres in series shorten together; many heads in parallel sum their forces; calcium gates the cycle.', variables: ['sarcomere length 2 µm', 'overlap', 'calcium', 'fibre tension'], characteristicLength: 2e-6, characteristicTime: 1e-2 },
      { scale: 'macro', name: 'a muscle on a lever', description: 'Bundles of fibres pulling a tendon on a bone: a stroke of centimetres, a force of hundreds of newtons, a force-velocity curve (Hill), 20 to 25 % efficient.', variables: ['force', 'shortening velocity', 'stroke', 'power', 'heat'], characteristicLength: 1e-1, characteristicTime: 1e-1 },
    ],
    up: [
      { from: 'a myosin head and ATP', to: 'a power stroke', via: 'interaction', carries: ['energy', 'momentum'], says: 'Chemical energy of one ATP becomes a few piconewton-nanometres of work.' },
      { from: 'many heads, asynchronous', to: 'a steady sliding force', via: 'collective', carries: ['momentum', 'information'], says: 'Stochastic strokes sum to a smooth force proportional to the overlap and the fraction bound.' },
      { from: 'force against sliding speed', to: 'the force-velocity curve', via: 'emergent-variable', carries: ['energy'], says: 'Faster sliding leaves fewer heads bound: force falls with speed as Hill\'s hyperbola, with its optimum power at a third of the maximum speed.', law: 'hill.muscle' },
      { from: 'sarcomeres in series and fibres in parallel', to: 'stroke and force of the whole', via: 'collective', carries: ['energy'], says: 'Stroke adds along the series, force across the parallel: the architecture sets the lever the muscle is.' },
    ],
    down: [
      { from: 'a macro constraint: lift this load at this speed', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'The nervous system recruits enough fibres and fires fast enough: which heads bind is not chosen, how many are.' },
      { from: 'recruitment', to: 'micro dynamics', via: 'dynamics', carries: ['energy'], says: 'Calcium released, ATP consumed, heat made at the rate the stroke demands.' },
      { from: 'repeated demand', to: 'a realisation', via: 'realisation', carries: ['matter'], says: 'Use grows the muscle: more sarcomeres in parallel, a constructor at the macro level answering the micro one.' },
    ],
    disappears: ['which head is bound', 'the timing of any stroke', 'the step of 5 nm'],
    appears: ['a smooth force', 'the force-velocity curve', 'efficiency', 'fatigue'],
    invariant: ['energy', 'the force per cross-section (about 300 kPa, the same from a mouse to a whale)', 'the step per ATP'],
    breaks: ['at a single head: no smooth force, a stochastic one', 'past the overlap: no force at all', 'at speeds above the unloaded shortening speed'],
    status: 'theorem', source: ALBERTS },
  { id: 'cross.gear-train', name: 'a gear train, from tooth contact to a ratio', says: 'A ratio is a number; it is made by steel touching steel under Hertzian pressure a thousand times a second.',
    levels: [
      { scale: 'micro', name: 'tooth contact', description: 'Two involute flanks touch along a line under a Hertzian pressure of hundreds of megapascals, rolling and sliding through a film of oil microns thick.', variables: ['contact pressure', 'film thickness', 'sliding speed', 'surface roughness'], characteristicLength: 1e-4, characteristicTime: 1e-4 },
      { scale: 'meso', name: 'a mesh', description: 'Pairs of teeth share the load in turn; the involute keeps the ratio constant through the engagement; the tooth root bends as a cantilever.', variables: ['contact ratio', 'tooth bending stress (Lewis)', 'transmission error', 'backlash'], characteristicLength: 1e-2, characteristicTime: 1e-3 },
      { scale: 'macro', name: 'a train and its ratio', description: 'Shafts, bearings and a housing: a ratio, an efficiency of 97 to 99 % per mesh, a torque capacity, a life.', variables: ['ratio', 'torque', 'efficiency', 'inertia', 'life'], characteristicLength: 1e-1, characteristicTime: 1e-2 },
    ],
    up: [
      { from: 'two flanks', to: 'Hertzian contact', via: 'interaction', carries: ['momentum', 'energy'], says: 'The load is carried on an elliptical patch whose pressure the curvatures set.', law: 'young.contact' },
      { from: 'contact through the engagement', to: 'constant ratio', via: 'collective', carries: ['causality'], says: 'The involute\'s property: the line of action is fixed, so the angular velocity ratio is constant whatever the centre distance.' },
      { from: 'teeth taking turns', to: 'bending stress and life', via: 'emergent-variable', carries: ['energy'], says: 'Each tooth is loaded once per revolution: a fatigue cycle; Lewis gives the root stress.', law: 'gear.lewis' },
      { from: 'meshes in series', to: 'the train\'s ratio and efficiency', via: 'emergent-variable', carries: ['energy', 'information'], says: 'Ratios multiply, efficiencies multiply, inertias reflect by the ratio squared.', law: 'gear.output.torque' },
    ],
    down: [
      { from: 'a macro constraint: this ratio at this torque', to: 'allowed microconfigurations', via: 'constraint', carries: ['information'], says: 'Module and face width are chosen so the root stress and the contact pressure stay below their limits: the micro is sized from the macro.' },
      { from: 'module and width', to: 'micro dynamics', via: 'dynamics', carries: ['energy'], says: 'The contact pressure and sliding set the oil film and the wear.' },
      { from: 'the sized teeth', to: 'a realisation', via: 'realisation', carries: ['matter'], says: 'Hobbed, hardened and ground: the constructor chain of a gear.' },
    ],
    disappears: ['the contact patch', 'the film', 'which tooth carries the load'],
    appears: ['a ratio', 'an efficiency', 'backlash', 'a life'],
    invariant: ['energy less the mesh loss', 'the velocity ratio through the engagement'],
    breaks: ['when the film fails: scuffing', 'when the contact pressure passes the surface fatigue limit: pitting', 'when the tooth root passes its bending fatigue limit'],
    status: 'theorem', source: SHIGLEY },
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
