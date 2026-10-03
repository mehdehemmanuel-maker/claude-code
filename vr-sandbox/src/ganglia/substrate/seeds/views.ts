// Views: the decompositions a thing takes part in. One world, many descriptions (SC-5): the same shaft is in the
// mechanical view by its torque, in the thermal by its heat, in the manufacturing by how it is made. A law's domain
// names one view through VIEW_OF_DOMAIN, so there is one mechanical view, never 'mechanics' beside 'mechanical'.
import type { Source } from '../../types';
import { Pack } from '../dsl';

const PAHL: Source = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007 (function structures and physical domains)', kind: 'textbook' };
const CAMPBELL: Source = { cite: 'Urry, Cain, Wasserman, Minorsky & Orr, Campbell Biology, 12th ed., Pearson 2020', kind: 'textbook' };

/** The one view a law's or a phenomenon's domain word names. */
export const VIEW_OF_DOMAIN: Record<string, string> = {
  mechanics: 'view.mechanical', mechanical: 'view.mechanical', kinematics: 'view.kinematic', kinematic: 'view.kinematic', structures: 'view.structural', structural: 'view.structural',
  'machine elements': 'view.machine-elements', fluids: 'view.fluid', fluid: 'view.fluid', thermal: 'view.thermal', electrical: 'view.electrical', magnetism: 'view.magnetic', magnetic: 'view.magnetic',
  'solid state': 'view.solid-state', information: 'view.informational', informational: 'view.informational', computational: 'view.computational', control: 'view.control',
  chemical: 'view.chemical', chemistry: 'view.chemical', materials: 'view.materials', manufacturing: 'view.manufacturing', physics: 'view.physics', quantum: 'view.quantum', energetic: 'view.energetic', energy: 'view.energetic',
};
export const viewOfDomain = (domain: string): string => VIEW_OF_DOMAIN[domain.trim().toLowerCase()] ?? `view.${domain.trim().toLowerCase().replace(/ /g, '-')}`;

export function views(): Pack {
  const p = new Pack('views', PAHL);
  const v = (id: string, says: string, src: Source = PAHL) => p.e(id, 'architecture', says, { source: src });
  v('view.mechanical', 'The mechanical graph: forces, torques and motions, and the parts that carry them, in a machine or a body; Newton, Hooke and Coulomb read here.');
  v('view.kinematic', 'The kinematic graph: joints, degrees of freedom and the paths points trace, before any force; Grübler counts here.');
  v('view.structural', 'The structural graph: load paths, stresses, deflections and the margins to yield, buckling and fracture.');
  v('view.machine-elements', 'The machine-elements graph: shafts, bearings, gears, springs, belts and fasteners, and the sizing rule of each.');
  v('view.fluid', 'The fluid graph: pressures, flows and losses, and the forces a liquid or a gas puts on what holds it or moves through it.');
  v('view.thermal', 'The thermal graph: where heat is made, how it conducts, convects and radiates away, and the temperatures that result.');
  v('view.electrical', 'The electrical graph: what carries charge, at which voltage and current, and where the energy is dropped; Ohm, Kirchhoff and Joule read here.');
  v('view.magnetic', 'The magnetic graph: currents, fields, cores and magnets, and the forces and voltages between them; Ampère, Faraday and Lenz read here.');
  v('view.solid-state', 'The solid-state graph: junctions, carriers and band gaps, and the devices built on them.');
  v('view.computational', 'The computational graph: what computes, with which instructions, memory and time; Amdahl and Landauer read here.');
  v('view.physical-computation', 'The physical-computation graph: computation as switching devices, and the energy and time each switch costs.');
  v('view.abstract-computation', 'The abstract-computation graph: algorithms, complexity and what is computable at all, apart from any machine.');
  v('view.informational', 'The informational graph: signals, their bandwidth, noise and meaning, and who reads them, in a machine or a body; Shannon reads here.');
  v('view.control', 'The control graph: sensors, controllers and actuators closing loops, and whether the loops are stable; Nyquist reads here.');
  v('view.chemical', 'The chemical graph: reactions, their energies and rates, electrochemistry and corrosion; Gibbs, Nernst and Arrhenius read here.');
  v('view.materials', 'The materials graph: what things are made of, the properties that follow, and how those properties fail.');
  v('view.manufacturing', 'The manufacturing graph: the processes that make each part, their tolerances, costs and defects.');
  v('view.physics', 'The physics graph: the phenomena themselves, friction, elasticity, conduction, before any part embodies them.');
  v('view.quantum', 'The quantum graph: where discreteness and uncertainty set the rules, below about a nanometre; Planck and Schrödinger read here.');
  v('view.energetic', 'The energetic graph: where energy enters, is stored, converted and lost, in a machine or a body; the first and second laws read here.');
  // the views of a living thing: one organism, many graphs
  v('view.anatomical', 'The anatomical graph of a living thing: its organs and tissues, and how they are arranged.', CAMPBELL);
  v('view.cellular', 'The cellular graph of a living thing: its cells, their types and what each does.', CAMPBELL);
  v('view.molecular', 'The molecular graph of a living thing: proteins, lipids, nucleic acids and sugars, and what they build.', CAMPBELL);
  v('view.biochemical', 'The biochemical graph of a living thing: the reactions and pathways that make, break and move its molecules.', CAMPBELL);
  v('view.physiological', 'The physiological graph of a living thing: how its organs work together to hold the inside steady.', CAMPBELL);
  v('view.neurological', 'The neurological graph of a living thing: nerves, senses and the brain, and what signals pass between them.', CAMPBELL);
  v('view.developmental', 'The developmental graph of a living thing: how it grows from one cell to its shape.', CAMPBELL);
  v('view.behavioral', 'The behavioral graph of a living thing: what it does, when, and why it pays.', CAMPBELL);
  v('view.ecological', 'The ecological graph of a living thing: what it eats, what eats it, and where it lives.', CAMPBELL);
  v('view.evolutionary', 'The evolutionary graph of a living thing: where its traits came from and what selected them.', CAMPBELL);
  return p;
}
