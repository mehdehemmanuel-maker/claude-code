// Scale in the substrate: not a category, an axis. Scale transformations, observers, dimensionless groups, the
// cross-scale structures and the hypothesis are entities of the index; laws are linked to the transformations they
// are invariant or covariant under by the classification derived in ganglia/scale; descriptions are joined by
// coarse-graining; and things across the index carry their characteristic length and time (L_c, T_c) so a search
// for structural analogues can tell how many decades apart they are. The orders of magnitude are estimates, labelled.
import type { Source } from '../../types';
import { Pack, est, param } from '../dsl';
import { SIMILARITIES } from '../../scale/transform';
import { GROUPS, groupUnder } from '../../scale/groups';
import { OBSERVERS } from '../../scale/observer';
import { CROSS_SCALES } from '../../scale/crossscale';
import { classifyAll } from '../../scale/covariance';
import { universalScaleStructuralEquivalence } from '../../scale/hypothesis';

const BARENBLATT: Source = { cite: 'Barenblatt, Scaling, Self-similarity and Intermediate Asymptotics, Cambridge 1996', kind: 'textbook' };
const MCMAHON: Source = { cite: 'McMahon & Bonner, On Size and Life, Scientific American Library 1983; Schmidt-Nielsen, Scaling: Why is Animal Size so Important?, Cambridge 1984', kind: 'textbook' };

/** Characteristic length (m) and time (s) of things across the index: orders of magnitude, as estimates. */
const SCALES: [string, number, number, string][] = [
  ['phys.proton', 1e-15, 1e-24, 'the proton: a femtometre; strong-interaction times'],
  ['phys.electron', 1e-15, 1e-21, 'the electron: no measured size; its classical radius is 2.8 fm'],
  ['chem.atom', 1e-10, 1e-16, 'an atom: the Bohr radius; an orbital period'],
  ['chem.molecule', 1e-9, 1e-13, 'a small molecule; a vibration'],
  ['chem.reaction', 1e-9, 1e-12, 'a bond breaking: a vibrational period'],
  ['bio.protein', 5e-9, 1e-6, 'a protein: 5 nm; folding in microseconds to seconds'],
  ['bio.atp-synthase', 1e-8, 1e-2, 'the rotary motor of ATP synthase: 10 nm, about 100 turns a second'],
  ['bio.bacterial-flagellar-motor', 4.5e-8, 1e-2, 'the flagellar motor: 45 nm, 100 turns a second'],
  ['bio.ribosome', 2.5e-8, 5e-2, 'a ribosome: 25 nm, 20 amino acids a second'],
  ['bio.gene-regulation', 1e-6, 1e3, 'gene regulation: in a cell, over minutes to hours'],
  ['bio.virus', 1e-7, 1e4, 'a virus: 100 nm, a replication cycle of hours'],
  ['bio.bacteria', 1e-6, 1.2e3, 'a bacterium: a micron, dividing in 20 minutes'],
  ['bio.mitochondrion', 1e-6, 1e-3, 'a mitochondrion: a micron; membrane potential dynamics in milliseconds'],
  ['bio.sarcomere', 2e-6, 1e-2, 'a sarcomere: 2 µm, contracting in tens of milliseconds'],
  ['bio.cell', 1e-5, 8.6e4, 'a human cell: 10 µm, dividing in a day'],
  ['bio.capillary', 1e-5, 1, 'a capillary: 10 µm across, blood crossing it in a second'],
  ['bio.neuron', 1e-4, 1e-3, 'a neuron body: 100 µm; a spike in a millisecond'],
  ['bio.pacemaker-cells', 1e-4, 1, 'the pacemaker: a cluster firing once a second'],
  ['bio.insect-wing-hinge', 1e-3, 5e-3, 'an insect wing hinge: a millimetre, 200 beats a second'],
  ['bio.insect-leg', 5e-3, 1e-1, 'an insect leg: millimetres, a step in a tenth of a second'],
  ['bio.blood-vessel', 1e-2, 1, 'an artery: a centimetre, a pulse a second'],
  ['bio.synovial-joint', 5e-2, 1, 'a joint: 5 cm, a stride a second'],
  ['bio.heart', 1e-1, 1, 'a heart: 10 cm, a beat a second'],
  ['bio.skeletal-muscle', 1e-1, 1e-1, 'a muscle: 10 cm, a twitch in a tenth of a second'],
  ['bio.homeostasis', 1.7, 1e3, 'homeostasis: a body, over minutes'],
  ['bio.human', 1.7, 1, 'a person: 1.7 m, a stride a second'],
  ['bio.ant-colony', 1e1, 3e7, 'an ant colony: 10 m, a year'],
  ['bio.tree-growth', 1e1, 3e8, 'a tree: 10 m, a decade of growth'],
  ['bio.plant-root', 1, 1e6, 'a root: a metre, growing over weeks'],
  ['bio.photosynthesis', 1e-5, 1e-3, 'a chloroplast: 10 µm, electron transport in milliseconds'],
  ['bio.evolution', 1e3, 3e13, 'a population over a landscape, a million years'],
  ['earth.ecosystem', 1e4, 3e7, 'an ecosystem: 10 km, a year'],
  ['transistor', 1e-7, 1e-10, 'a transistor: 100 nm, switching in 100 ps'],
  ['ic', 1e-2, 1e-9, 'a chip: a centimetre, a nanosecond clock'],
  ['cpu', 2e-2, 3e-10, 'a processor: 2 cm, 3 GHz'],
  ['circuit.oscillator', 1e-2, 1e-6, 'an oscillator: a centimetre, a microsecond'],
  ['circuit.feedback-controller', 1e-2, 1e-3, 'a controller: a board, a millisecond loop'],
  ['bearing.ball', 3e-2, 1e-2, 'a ball bearing: 3 cm, a turn in 10 ms'],
  ['bearing', 3e-2, 1e-2, 'a bearing: 3 cm, a turn in 10 ms'],
  ['gear.spur', 5e-2, 1e-2, 'a gear: 5 cm, a turn in 10 ms'],
  ['spring.helical', 5e-2, 1e-2, 'a spring: 5 cm, ringing at 100 Hz'],
  ['servo', 4e-2, 1e-1, 'a servo: 4 cm, a tenth of a second to its position'],
  ['motor.electric', 1e-1, 1e-2, 'a motor: 10 cm, a turn in 10 ms'],
  ['electromagnet', 5e-2, 1e-2, 'an electromagnet: 5 cm, its L/R in 10 ms'],
  ['flywheel.disc', 3e-1, 1e-2, 'a flywheel: 30 cm, a turn in 10 ms'],
  ['pump.centrifugal', 3e-1, 1e-2, 'a pump: 30 cm, a turn in 10 ms'],
  ['pump.piston', 1e-1, 1e-1, 'a piston pump: 10 cm, a stroke in a tenth of a second'],
  ['frame', 1, 1e-2, 'a frame: a metre, ringing at 100 Hz'],
  ['vehicle.drone', 3e-1, 1e-1, 'a drone: 30 cm, correcting ten times a second'],
  ['vehicle.car', 4, 1, 'a car: 4 m, a second to react'],
  ['vehicle.electric', 4, 1, 'an electric car: 4 m, a second to react'],
  ['machine.lathe', 2, 1e-2, 'a lathe: 2 m, a spindle turn in 10 ms'],
  ['turbine', 1e1, 1e-1, 'a turbine: 10 m, a turn in a tenth of a second'],
  ['vehicle.aircraft', 3e1, 1, 'an aircraft: 30 m, a second'],
  ['vehicle.ship', 1e2, 1e1, 'a ship: 100 m, ten seconds'],
  ['energy.wind', 1e2, 1, 'a wind turbine: 100 m, a turn in seconds'],
  ['earth.river', 1e5, 1e6, 'a river: 100 km, a flood in weeks'],
  ['earth.weather', 1e5, 1e5, 'a weather system: 100 km, a day'],
  ['earth.tide', 1e6, 4.5e4, 'a tide: an ocean basin, 12.4 hours'],
  ['earth.ocean', 1e6, 3e9, 'an ocean: 1000 km, a century of overturning'],
  ['earth.climate', 1e7, 3e9, 'the climate: the planet, a century'],
  ['earth.plate-tectonics', 1e7, 3e15, 'plate tectonics: the planet, a hundred million years'],
  ['earth', 1.3e7, 8.6e4, 'the Earth: 13 000 km, a day'],
  ['bio.cilia', 1e-5, 2e-2, 'a cilium: 10 µm, beating 50 times a second'],
  ['bio.myosin', 2e-8, 1e-3, 'a myosin head: 20 nm, a stroke in a millisecond'],
  ['bio.kinesin', 1e-8, 1e-2, 'kinesin: 10 nm, 100 steps a second'],
  ['bio.tendon', 1e-1, 1e-1, 'a tendon: 10 cm, loaded each stride'],
  ['bio.bone', 3e-1, 1, 'a long bone: 30 cm, loaded each stride'],
  ['bio.cartilage', 3e-3, 1, 'cartilage: millimetres thick, loaded each stride'],
  ['bio.skin', 2e-3, 1e5, 'skin: 2 mm, renewed over weeks'],
  ['bio.blood', 1e-5, 1, 'a red cell: 8 µm, a circuit in a minute'],
  ['bio.axon', 1, 1e-2, 'an axon: a metre, an impulse along it in 10 ms'],
  ['bio.synapse', 1e-6, 1e-3, 'a synapse: a micron, a millisecond'],
  ['bio.arthropod', 1e-2, 1e-2, 'an arthropod: a centimetre, a wingbeat in 10 ms'],
  ['bio.mammal', 1, 1, 'a mammal: a metre, a stride a second'],
  ['screw', 1e-2, 1, 'a screw: a centimetre, tightened in a second'],
  ['bolt', 2e-2, 1, 'a bolt: 2 cm, tightened in a second'],
  ['nut', 1e-2, 1, 'a nut: a centimetre'],
  ['washer', 1e-2, 1, 'a washer: a centimetre'],
  ['gear', 5e-2, 1e-2, 'a gear: 5 cm, a turn in 10 ms'],
  ['belt', 1, 1e-1, 'a belt: a metre, a lap in a tenth of a second'],
  ['chain', 1, 1e-1, 'a chain: a metre, a lap in a tenth of a second'],
  ['coupling', 5e-2, 1e-2, 'a coupling: 5 cm, a turn in 10 ms'],
  ['clutch', 1e-1, 1e-1, 'a clutch: 10 cm, engaging in a tenth of a second'],
  ['brake', 2e-1, 1, 'a brake: 20 cm, a stop in a second'],
  ['cam', 5e-2, 1e-2, 'a cam: 5 cm, a turn in 10 ms'],
  ['linkage', 2e-1, 1e-1, 'a linkage: 20 cm, a cycle in a tenth of a second'],
  ['valve', 5e-2, 1e-1, 'a valve: 5 cm, opening in a tenth of a second'],
  ['piston', 8e-2, 1e-2, 'a piston: 8 cm, a stroke in 10 ms'],
  ['fan', 3e-1, 2e-2, 'a fan: 30 cm, a turn in 20 ms'],
  ['propeller', 1, 5e-2, 'a propeller: a metre, a turn in 50 ms'],
  ['wheel', 5e-1, 1e-1, 'a wheel: half a metre, a turn in a tenth of a second'],
  ['tyre', 5e-1, 1e-1, 'a tyre: half a metre, a turn in a tenth of a second'],
  ['shaft', 3e-1, 1e-2, 'a shaft: 30 cm, a turn in 10 ms'],
  ['hinge', 5e-2, 1, 'a hinge: 5 cm, a swing in a second'],
  ['resistor', 5e-3, 1e-9, 'a resistor: 5 mm, responding in nanoseconds'],
  ['capacitor', 1e-2, 1e-3, 'a capacitor: a centimetre, charging in milliseconds'],
  ['inductor', 2e-2, 1e-3, 'an inductor: 2 cm, an L/R in milliseconds'],
  ['transformer', 1e-1, 2e-2, 'a transformer: 10 cm, a mains cycle'],
  ['diode', 3e-3, 1e-8, 'a diode: 3 mm, recovering in tens of nanoseconds'],
  ['relay', 2e-2, 1e-2, 'a relay: 2 cm, switching in 10 ms'],
  ['switch', 2e-2, 1e-2, 'a switch: 2 cm, thrown in 10 ms'],
  ['fuse', 2e-2, 1e-1, 'a fuse: 2 cm, blowing in a tenth of a second'],
  ['solenoid', 3e-2, 1e-2, 'a solenoid: 3 cm, pulling in 10 ms'],
  ['battery', 1e-1, 3.6e3, 'a battery: 10 cm, discharged over an hour'],
  ['cell.electrochemical', 5e-2, 3.6e3, 'a cell: 5 cm, discharged over an hour'],
  ['wire', 1, 5e-9, 'a wire: a metre, a signal along it in nanoseconds'],
  ['pcb', 1e-1, 1e-9, 'a circuit board: 10 cm, a nanosecond'],
  ['microcontroller', 1e-2, 1e-8, 'a microcontroller: a centimetre, an instruction in tens of nanoseconds'],
  ['sensor', 1e-2, 1e-3, 'a sensor: a centimetre, a reading in a millisecond'],
  ['sensor.encoder', 3e-2, 1e-4, 'an encoder: 3 cm, a count in a tenth of a millisecond'],
  ['heatsink', 5e-2, 1e2, 'a heatsink: 5 cm, a time constant of minutes'],
  ['antenna', 1e-1, 1e-9, 'an antenna: 10 cm, a gigahertz'],
  ['engine.internal-combustion', 5e-1, 2e-2, 'an engine: half a metre, a revolution in 20 ms'],
  ['vehicle.motorcycle', 2, 1, 'a motorcycle: 2 m, a second'],
  ['vehicle.bicycle', 1.8, 1, 'a bicycle: 1.8 m, a pedal stroke a second'],
  ['vehicle.train', 2e2, 1e1, 'a train: 200 m, ten seconds'],
  ['vehicle.rocket', 5e1, 1, 'a rocket: 50 m, a second'],
  ['vehicle.submarine', 1e2, 1e1, 'a submarine: 100 m, ten seconds'],
  ['robot.arm', 1, 1e-1, 'a robot arm: a metre, a move in a tenth of a second'],
  ['robot.gripper', 1e-1, 1e-1, 'a gripper: 10 cm, closing in a tenth of a second'],
  ['machine.press', 3, 1, 'a press: 3 m, a stroke a second'],
  ['machine.3d-printer', 5e-1, 1e-2, 'a printer: half a metre, a step in 10 ms'],
  ['machine.cnc', 2, 1e-2, 'a machining centre: 2 m, a spindle turn in 10 ms'],
  ['energy.solar', 1, 8.6e4, 'a solar panel: a metre, a day'],
  ['energy.hydro', 1e2, 1e1, 'a dam: 100 m, ten seconds of turbine'],
  ['energy.nuclear', 1e1, 1e-9, 'a reactor core: 10 m, a neutron generation in nanoseconds'],
  ['earth.wind', 1e3, 1e3, 'a gust: a kilometre, minutes'],
  ['earth.wave', 1e2, 1e1, 'an ocean wave: 100 m, ten seconds'],
  ['earth.atmosphere', 1e4, 8.6e4, 'the atmosphere: 10 km deep, a day'],
  ['earth.core', 3.5e6, 3e10, 'the core: 3500 km, a thousand years of convection'],
  ['earth.mantle', 2.9e6, 3e15, 'the mantle: 2900 km, a hundred million years'],
];

export function scale(): Pack {
  const p = new Pack('scale', BARENBLATT);
  // scale transformations: operators, not categories
  for (const t of SIMILARITIES) p.e(t.id, ['scale', 'transformation'], `${t.says} Derivation: ${t.derivation} Regime: ${t.regime}. Status: ${t.status}.`, { names: [t.name], source: t.source, params: [param('m', 'mass exponent', t.source, { low: t.exponents[0], high: t.exponents[0] }), param('l', 'length exponent', t.source, { low: 1, high: 1 }), param('t', 'time exponent', t.source, { low: t.exponents[2], high: t.exponents[2] })] });
  p.e('scale.transformation', ['scale', 'manifold', 'transformation'], 'A scale transformation: an operator on quantities, states, laws, manifolds and observers that scales each base dimension by an exponent of λ and holds fixed what the regime holds (the material, the planet, the universe). Not a category a thing belongs to.', { names: ['scale transformation', 'similarity'] });
  p.each(SIMILARITIES.map((t) => t.id), { 'is-a': ['scale.transformation'] });
  // dimensionless groups: what decides a regime, and which transformation preserves each (derived)
  for (const g of GROUPS) {
    p.e(`group.${g.id}`, ['parameter', 'property'], `${g.name}: ${g.formula}; ${g.meaning}. ${g.boundaries.map((b) => `At ${b.at}: ${b.says}`).join(' ')}`, { names: [g.name, g.id], source: g.source });
    for (const t of SIMILARITIES) { const v = groupUnder(g, t); if (v.invariant) p.link(`group.${g.id}`, { 'invariant-under': [[t.id, v.says]] }, { derived: 'ganglia/scale/groups groupUnder' }); }
  }
  // laws under the similarities: derived from each law's own example (ganglia/scale/covariance)
  for (const t of SIMILARITIES) for (const c of classifyAll(t, 10)) {
    if (c.verdict === 'invariant' || c.verdict === 'covariant') p.link(c.law, { 'invariant-under': [[t.id, `${c.verdict}: ${c.why}`]] }, { derived: 'ganglia/scale/covariance classify' }, c.verdict === 'invariant' ? 0.95 : 0.9);
  }
  // observers: what gets which picture
  for (const o of OBSERVERS) p.e(o.id, ['observer', 'system'], `${o.says} Resolves ${o.spatialResolution} m and ${o.temporalResolution} s, samples at ${o.samplingRate} Hz, lags ${o.latency} s, holds ${o.memory} s.`, { names: [o.name], source: o.source, params: [param('dx', 'spatial resolution', o.source, { unit: 'm', low: o.spatialResolution, high: o.spatialResolution }), param('dt', 'temporal resolution', o.source, { unit: 's', low: o.temporalResolution, high: o.temporalResolution }), param('fs', 'sampling rate', o.source, { unit: 'Hz', low: o.samplingRate, high: o.samplingRate }), param('lat', 'latency', o.source, { unit: 's', low: o.latency, high: o.latency })] });
  p.e('observer', ['observer', 'manifold'], 'An observer: resolutions in space and time, a sampling rate, a latency, a processing time, a dynamic range, a memory and a model. What it records is reality projected through these; a difference between observers is not a difference in the thing.', { names: ['observer manifold'] });
  p.each(OBSERVERS.map((o) => o.id), { 'is-a': ['observer'] });
  p.link('observer.human', { 'is-a': ['bio.human'], 'has-part': ['bio.sensory-receptor', 'bio.brain'] });
  p.link('observer.neuron', { 'is-a': ['bio.neuron'] });
  p.link('observer.physics-step', { 'observes': ['rigid-body', 'joint.kinematic', 'frame', 'motor.electric', 'servo'], 'has-part': ['model.physical'] });
  p.link('observer.headset', { observes: ['observer.physics-step'], 'has-part': ['display'] });
  p.link('observer.human', { observes: ['observer.headset', 'vehicle.car', 'bio.human'] });
  // cross-scale structures: each level a description, joined by coarse-graining; the thermal one is the worked case
  for (const c of CROSS_SCALES) {
    for (const l of c.levels) p.e(`${c.id}.${l.scale}`, ['architecture', 'phenomenon'], `${l.name}: ${l.description} Variables: ${l.variables.join(', ')}.`, { names: [l.name], source: c.source, params: [param('L_c', 'characteristic length', c.source, { unit: 'm', low: l.characteristicLength, high: l.characteristicLength }), param('T_c', 'characteristic time', c.source, { unit: 's', low: l.characteristicTime, high: l.characteristicTime })] });
    for (let i = 0; i + 1 < c.levels.length; i++) p.link(`${c.id}.${c.levels[i]!.scale}`, { 'coarse-grains-to': [[`${c.id}.${c.levels[i + 1]!.scale}`, `${c.up.filter((s) => s.via === 'collective' || s.via === 'emergent-variable').map((s) => s.to).join('; ')}; disappears: ${c.disappears.join(', ')}; appears: ${c.appears.join(', ')}`]] }, c.source);
    for (const s of c.up) if (s.law) p.link(`${c.id}.macro`, { 'governed-by': [s.law] }, c.source);
    p.e(c.id, ['architecture', 'phenomenon'], `${c.says} Invariant across the levels: ${c.invariant.join('; ')}. Breaks: ${c.breaks.join('; ')}.`, { names: [c.name], source: c.source });
    p.link(c.id, { 'has-part': c.levels.map((l) => `${c.id}.${l.scale}`) }, c.source);
  }
  p.link('cross.heat.macro', { 'is-a': ['phys.heat'], 'observed-by': ['observer.human', 'observer.physics-step'] });
  p.link('cross.heat.micro', { 'is-a': ['chem.molecule'], 'observed-by': ['observer.neuron'] });
  p.link('cross.rigid-body.macro', { 'observed-by': ['observer.physics-step', 'observer.headset'] });
  p.link('cross.rigid-body.meso', { 'governed-by': ['hooke', 'natural.frequency'] });
  p.link('cross.rigid-body.micro', { 'is-a': ['chem.atom'] });
  p.link('cross.current.macro', { 'governed-by': ['ohm', 'wire.resistance', 'joule'], 'observed-by': ['observer.physics-step'] });
  p.link('cross.current.micro', { 'is-a': ['phys.electron'] });
  // the hypothesis, as a hypothesis
  const h = universalScaleStructuralEquivalence(10);
  p.e(h.id, ['hypothesis'], `${h.statement} Status: ${h.status}. Compatible: ${h.compatible.length} observations. Conflicting: ${h.conflicting.length}. Falsified by: ${h.falsification[0]}`, { names: ['universal scale structural equivalence'], source: h.source, unknowns: h.unresolved, depth: 2 });
  p.link(h.id, { 'governed-by': ['buckingham.pi'], requires: ['scale.transformation', 'observer'], 'prevented-by': ['planck.scale'] }, h.source);
  p.e('buckingham.pi', ['law'], 'Buckingham Π theorem: a physically meaningful relation among n quantities with k base dimensions can be written as a relation among n − k dimensionless groups; a law in such groups holds at every scale that keeps them. Cited, not run.', { names: ['Buckingham Π theorem'], source: { cite: 'Buckingham, Phys. Rev. 4 (1914) 345', kind: 'paper' }, unknowns: ['not yet an executable law in laws.ts: cited, not run'] });
  p.e('planck.scale', ['phenomenon', 'scale'], `The absolute scale set by c, ħ and G: a length of ${h.derived.planck.length.toExponential(2)} m, a time of ${h.derived.planck.time.toExponential(2)} s, a mass of ${h.derived.planck.mass.toExponential(2)} kg. ${h.derived.absolute.says}.`, { names: ['Planck scale'], source: h.derived.planck.source });
  p.link('planck.scale', { 'governed-by': ['planck.energy', 'newton.gravitation'] }, h.derived.planck.source);
  // characteristic scales across the index, as estimates
  // the scale attaches to the thing without describing it: an entity with nothing to say merges its parameters only
  for (const [id, L, T, says] of SCALES) p.e(id, [], '', { params: [param('L_c', 'characteristic length', est(says), { unit: 'm', low: L, high: L }), param('T_c', 'characteristic time', est(says), { unit: 's', low: T, high: T })], source: { estimate: `orders of magnitude: ${says} (${MCMAHON.cite})` } });
  // self-similar patterns across decades, by structure: said where the index knows them
  p.link('bio.atp-synthase', { 'analogous-to': [['turbine', 'a rotary machine driven by a flow (protons, steam) a billion times smaller']] }, MCMAHON);
  p.link('bio.homeostasis', { 'analogous-to': [['earth.climate', 'negative feedback holding a set point: sweating and ice-albedo are the same loop seven decades apart']] }, MCMAHON);
  p.link('bio.capillary', { 'analogous-to': [['earth.river', 'a branching transport network: Murray\'s law in vessels, Horton\'s in rivers']] }, MCMAHON);
  p.link('bio.pacemaker-cells', { 'analogous-to': [['circuit.oscillator', 'a relaxation oscillator: charge to a threshold, discharge, repeat']] }, MCMAHON);
  return p;
}
