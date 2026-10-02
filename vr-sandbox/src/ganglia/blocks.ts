// Building blocks. Everything Ego builds with is a block of some archetype, known by what it does, not who makes it:
// a store of electrical energy, a controller, a conductor, a rotary actuator, a speed reducer, a coupling, a rotary
// support, a two-force link, a shaft made from bar, a frame member cut from stock, a wheel, a fuse, a guard. Each is a
// whole system in itself: its anatomy (`inside`) says what it is made of and what each piece does, down to the law
// that piece works by. Three levels, as in systematic design (Pahl & Beitz):
//   - concept: each archetype takes and gives flows (electric power, rotation, translation, travel, load to the
//     frame, signal, heat, stock); which physical ways turn one flow into another, and which blocks embody them, is
//     ways.ts
//   - embodiment: each archetype has typed ports (DC in and out, shaft out, bore, mount...) whose ratings come from
//     the catalogued item it is, or from the laws for one that is made
//   - check: a design is blocks wired port to port, each connection carrying what it carries (volts, amps, torque,
//     speed, force), checked connection by connection: the voltage within the range, the current within the rating,
//     the shaft in the bore, the torque within the coupling, the radial load where a bearing can take it
// Each problem names the principle (principles.ts) it breaks, so the answer to "why not" is always there.

import { CATALOG, itemById } from './parts';
import { MOTORS, GEARHEADS } from '../data/motors';
import { BATTERIES } from '../data/batteries';
import { motorModel } from '../engineering/dcmotor';
import { packOCV } from '../engineering/battery';
import { getMaterial } from '../data/materials';
import { apply } from './laws';
import type { CatalogItem, Source } from './types';
import type { PowertrainChoice } from './workflows';

export type PortKind = 'dc-out' | 'dc-in' | 'conduct' | 'shaft-out' | 'shaft-in' | 'shaft' | 'bore' | 'mount' | 'thread' | 'signal-in';

export interface Port {
  name: string;
  kind: PortKind;
  /** Its ratings, SI: V, Vmin, Vmax, I, Ipeak, d (diameter), dMax, T (torque), w (speed), F (force), radial, C, C0... */
  r: Record<string, number>;
  /** Items it accepts (a gearhead's input takes the motors it is made to fit). */
  accepts?: string[];
}

/**
 * What passes between blocks (energy, material and signal flows, after Pahl & Beitz). Translation is a stroke (a
 * part moving within the machine); travel is the whole machine moving against its surroundings.
 */
export type Flow = 'electric' | 'rotation' | 'translation' | 'travel' | 'load' | 'signal' | 'heat' | 'stock';

/** One piece of a block's anatomy: what it is, what it does, and the law it works by. */
export interface Piece { name: string; does: string; law?: string; material?: string }

export interface Archetype {
  id: string;
  /** What it does, as a verb phrase. */
  does: string;
  category: 'power' | 'actuation' | 'transmission' | 'support' | 'structure' | 'connection' | 'protection' | 'material' | 'machine';
  /** The flows it takes and gives. */
  takes: Flow[];
  gives: Flow[];
  /** Catalogue families that are this archetype (bought), or the world's shapes it is made from (made). */
  families: string[];
  shapes?: string[];
  /** Laws that rate it, and principles that govern how it is used. */
  laws: string[];
  principles: string[];
  ports(item: CatalogItem): Port[];
  /** What it is made of, piece by piece, and where that is from. */
  inside: Piece[];
  insideSource: Source;
}

const n = (c: CatalogItem, k: string) => Number(c.specs[k]);

export const ARCHETYPES: Archetype[] = [
  {
    id: 'power.store', does: 'stores electrical energy and gives it as direct current', category: 'power', takes: [], gives: ['electric'], families: ['battery'],
    laws: ['lead-acid.ocv', 'energy.electric'], principles: ['fuse-at-source', 'size-wire-by-drop-and-ampacity'],
    inside: [
      { name: 'cells', does: 'each a pair of electrodes in an electrolyte, giving its chemistry\'s voltage (lead-acid about 2.1 V, so six make 12 V)', law: 'lead-acid.ocv' },
      { name: 'positive and negative plates', does: 'lead dioxide and spongy lead on lead-alloy grids: they react with the acid to give and take charge', material: 'lead' },
      { name: 'electrolyte and separator', does: 'dilute sulphuric acid held in an absorbent glass mat between the plates (AGM): ions pass, electrons can\'t' },
      { name: 'case and lid', does: 'holds the cells apart and the acid in (polypropylene or ABS)', material: 'abs' },
      { name: 'valve', does: 'lets gas out if it is overcharged, and keeps air out (valve-regulated)' },
      { name: 'terminals', does: 'where current leaves and returns; their resistance and the cells\' are its internal resistance', law: 'ohm' },
    ],
    insideSource: { cite: 'Linden & Reddy, Handbook of Batteries, 4th ed., McGraw-Hill 2011 (lead-acid, valve-regulated)', kind: 'handbook' },
    ports: (c): Port[] => {
      const b = BATTERIES[c.id]!;
      return [{ name: 'terminals', kind: 'dc-out', r: { V: b.V, Vmax: packOCV({ data: b, series: 1, parallel: 1 }, 1), Ah: n(c, 'Ah20') } }];
    },
  },
  {
    id: 'power.control', does: 'sets how much of the supply a motor gets, and limits its current', category: 'power', takes: ['electric', 'signal'], gives: ['electric'], families: ['motor controller'],
    laws: ['motor.current', 'power.electric'], principles: ['current-limit-motors', 'derate-for-heat'],
    inside: [
      { name: 'H-bridge', does: 'four transistors (MOSFETs) that connect the motor to the supply either way round, or short it to brake', law: 'ohm' },
      { name: 'gate drivers', does: 'switch the transistors fully on and off, fast, so they waste little', law: 'joule' },
      { name: 'PWM controller', does: 'switches thousands of times a second, setting the motor\'s average voltage by the fraction of time on' },
      { name: 'current sense', does: 'a shunt or sensor measuring motor current, so the controller can limit it', law: 'ohm' },
      { name: 'bus capacitors', does: 'smooth the supply against the switching' },
      { name: 'heat sink', does: 'carries the transistors\' losses to the air', law: 'convection' },
    ],
    insideSource: { cite: 'Mohan, Undeland & Robbins, Power Electronics: Converters, Applications and Design, 3rd ed., Wiley 2003 (DC motor drives)', kind: 'textbook' },
    ports: (c): Port[] => [
      { name: 'supply', kind: 'dc-in', r: { Vmin: n(c, 'vMin'), Vmax: n(c, 'vMax') } },
      { name: 'motor', kind: 'dc-out', r: { I: n(c, 'continuous'), Ipeak: n(c, 'peak'), channels: n(c, 'channels'), limit: c.specs['currentLimit'] === 'yes' ? 1 : 0 } },
      { name: 'command', kind: 'signal-in', r: {} },
    ],
  },
  {
    id: 'power.conduct', does: 'carries current from one place to another', category: 'power', takes: ['electric'], gives: ['electric'], families: ['wire'],
    laws: ['wire.resistance', 'wire.drop', 'joule'], principles: ['size-wire-by-drop-and-ampacity', 'fuse-at-source'],
    inside: [
      { name: 'conductor', does: 'stranded annealed copper: carries the current, dropping I R volts and heating by I² R', law: 'wire.resistance', material: 'copper' },
      { name: 'insulation', does: 'keeps the current in; its temperature limit sets the wire\'s current rating', law: 'joule' },
      { name: 'terminals', does: 'crimped lugs or connectors at each end, joining it to what it feeds' },
    ],
    insideSource: { cite: 'ASTM B258 (AWG sizes); ABYC E-11 (DC wiring)', kind: 'standard' },
    ports: (c): Port[] => [{ name: 'run', kind: 'conduct', r: { I: n(c, 'ampacity'), Rm: n(c, 'ohmPerM') } }],
  },
  {
    id: 'actuation.rotary', does: 'turns direct current into torque on a shaft', category: 'actuation', takes: ['electric'], gives: ['rotation', 'heat'], families: ['dc motor'],
    laws: ['motor.torque', 'motor.back-emf', 'motor.current', 'thermal.network'], principles: ['current-limit-motors', 'derate-for-heat', 'gearing-match'],
    inside: [
      { name: 'stator magnets', does: 'permanent magnets making the field the winding works in', material: 'ndfeb or ferrite' },
      { name: 'armature winding', does: 'copper coils on the rotor: current across the field pushes each conductor sideways (F = B I L), which at the rotor\'s radius is torque', law: 'lorentz.force', material: 'copper' },
      { name: 'commutator and brushes', does: 'switch which coils carry current as the rotor turns, so the torque keeps one way; they wear, and their friction is part of the no-load current', law: 'motor.torque' },
      { name: 'back-EMF', does: 'the turning winding generates a voltage against the supply, which is why current falls as speed rises', law: 'motor.back-emf' },
      { name: 'shaft', does: 'carries the torque out', law: 'torsion.solid', material: 'steel' },
      { name: 'bearings', does: 'hold the rotor centred in the field and let it spin' , law: 'bearing.life.l10' },
      { name: 'housing', does: 'holds the magnets, carries the reaction torque to its mount, and passes the winding\'s heat to the air', law: 'thermal.network' },
    ],
    insideSource: { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013, ch. 3 (conventional d.c. motors)', kind: 'textbook' },
    ports: (c): Port[] => {
      const m = MOTORS[c.id]!, mm = motorModel(m);
      return [
        { name: 'power', kind: 'dc-in', r: { V: m.V, Vmin: 0, Vmax: m.V * 1.1, I: m.maxContinuousCurrent, Ipeak: mm.stallCurrent } },
        { name: 'shaft', kind: 'shaft-out', r: { d: m.shaft, T: mm.Kt * (m.maxContinuousCurrent - mm.I0), w: mm.noLoadSpeed } },
        { name: 'body', kind: 'mount', r: { d: m.diameter } },
      ];
    },
  },
  {
    id: 'transmission.reduce', does: 'trades speed for torque between two shafts', category: 'transmission', takes: ['rotation'], gives: ['rotation'], families: ['gearhead'],
    laws: ['gear.output.torque'], principles: ['gearing-match', 'gearhead-takes-torque-not-load'],
    inside: [
      { name: 'sun gear', does: 'on the input shaft, drives the planets', law: 'gear.output.torque', material: 'steel' },
      { name: 'planet gears', does: 'share the load between them, rolling between the sun and the ring', material: 'steel' },
      { name: 'ring gear', does: 'the internal gear the planets roll in, fixed to the housing' },
      { name: 'planet carrier', does: 'holds the planets and turns slower, with the torque multiplied: the output (stages in series multiply their ratios)' },
      { name: 'output shaft and bearings', does: 'carry the torque out; the bearings take only small radial and axial loads', law: 'bearing.life.l10' },
      { name: 'housing', does: 'holds it all in line and carries the reaction torque to its mount' },
    ],
    insideSource: { cite: 'Radzevich (ed.), Dudley\'s Handbook of Practical Gear Design and Manufacture, 3rd ed., CRC 2016 (planetary gearing)', kind: 'handbook' },
    ports: (c): Port[] => {
      const g = GEARHEADS[c.id]!;
      return [
        { name: 'input', kind: 'shaft-in', r: {}, accepts: g.fits },
        { name: 'output', kind: 'shaft-out', r: { d: g.shaft, T: g.maxContinuousTorque, radial: g.maxRadial, axial: g.maxAxial, ratio: g.ratio, eta: g.efficiency } },
        { name: 'body', kind: 'mount', r: { d: g.diameter } },
      ];
    },
  },
  {
    id: 'transmission.couple', does: 'passes torque between two shafts in line, taking up small misalignment', category: 'transmission', takes: ['rotation'], gives: ['rotation'], families: ['coupling'],
    laws: ['power.rotary'], principles: ['coupling-takes-misalignment'],
    inside: [
      { name: 'two hubs', does: 'one on each shaft, bored to it and held by a set screw or key', material: 'aluminium or iron' },
      { name: 'elastomer spider', does: 'sits between the hubs\' jaws: passes the torque in compression and flexes to take up misalignment and shock', material: 'nbr rubber' },
    ],
    insideSource: { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015 (couplings)', kind: 'textbook' },
    ports: (c): Port[] => [
      { name: 'hub A', kind: 'bore', r: { dMax: n(c, 'maxBore'), T: n(c, 'torque') } },
      { name: 'hub B', kind: 'bore', r: { dMax: n(c, 'maxBore'), T: n(c, 'torque') } },
    ],
  },
  {
    id: 'transmission.flexible', does: 'carries torque between parallel shafts by a chain', category: 'transmission', takes: ['rotation'], gives: ['rotation'], families: ['roller chain'],
    laws: ['chain.speed', 'chain.pull'], principles: ['guard-moving-parts'],
    inside: [
      { name: 'inner and outer plates', does: 'carry the chain\'s pull from pin to pin', law: 'chain.pull', material: 'steel' },
      { name: 'pins and bushings', does: 'the joints the chain bends at; they wear and the chain stretches', material: 'steel' },
      { name: 'rollers', does: 'roll onto the sprocket teeth instead of sliding' },
      { name: 'sprockets', does: 'one on each shaft: the tooth counts set the ratio', law: 'chain.speed' },
    ],
    insideSource: { cite: 'ANSI/ASME B29.1 (precision power transmission roller chains)', kind: 'standard' },
    ports: (c): Port[] => [{ name: 'strand', kind: 'conduct', r: { F: n(c, 'tensileMin'), pitch: n(c, 'pitch') } }],
  },
  {
    id: 'support.rotate', does: 'holds a turning shaft in place, taking its loads to the frame', category: 'support', takes: ['load'], gives: ['load'], families: ['bearing', 'pillow block'],
    laws: ['bearing.life.l10', 'bearing.life.hours'], principles: ['bearing-near-load', 'interference-on-rotating-ring', 'support-once'],
    inside: [
      { name: 'inner ring', does: 'fits on the shaft, usually the ring that turns with the load', material: 'bearing steel (52100)' },
      { name: 'outer ring', does: 'fits in the housing', material: 'bearing steel (52100)' },
      { name: 'balls', does: 'roll between the rings\' raceways, carrying the load at small contacts; their fatigue sets its life', law: 'bearing.life.l10' },
      { name: 'cage', does: 'keeps the balls spaced' },
      { name: 'seals or shields', does: 'keep the grease in and dirt out' },
      { name: 'housing (pillow block)', does: 'bolts to the frame and holds the bearing; a set screw locks its inner ring to the shaft' },
    ],
    insideSource: { cite: 'SKF, Rolling bearings catalogue (design of bearing arrangements)', kind: 'maker' },
    ports: (c): Port[] => [
      { name: 'bore', kind: 'bore', r: { d: n(c, 'bore'), C: n(c, 'C'), C0: n(c, 'C0') } },
      { name: 'housing', kind: 'mount', r: {} },
    ],
  },
  {
    id: 'connection.two-force', does: 'holds a distance between two pins, pulling or pushing, free to swivel', category: 'connection', takes: ['load'], gives: ['load'], families: ['rod end'],
    laws: ['buckling.euler', 'buckling.johnson', 'stress.axial'], principles: ['two-force-member', 'torque-arm'],
    inside: [
      { name: 'eye (housing)', does: 'holds the ball, with a threaded shank to join the rod', material: 'steel' },
      { name: 'ball', does: 'swivels in the eye so no bending passes: the link takes only pull and push', law: 'stress.axial' },
      { name: 'liner', does: 'the sliding surface between ball and eye' },
      { name: 'rod', does: 'between two rod ends: in tension it can carry its whole section; in compression it can buckle', law: 'buckling.euler' },
    ],
    insideSource: { cite: 'ISO 12240-4 (rod ends, dimensions)', kind: 'standard' },
    ports: (c): Port[] => [{ name: 'eye', kind: 'bore', r: { d: n(c, 'bore'), C0: n(c, 'C0') } }, { name: 'shank', kind: 'thread', r: {} }],
  },
  {
    id: 'material.print', does: 'is fed to a printer to make parts', category: 'material', takes: [], gives: ['stock'], families: ['printing material'],
    laws: ['composite.rule-of-mixtures', 'composite.transverse'], principles: ['load-composites-along-fibres', 'print-loads-in-plane'],
    inside: [
      { name: 'matrix', does: 'the plastic laid layer by layer, holding everything together' , law: 'composite.transverse' },
      { name: 'reinforcement', does: 'continuous fibre laid in chosen layers, carrying the load along its length', law: 'composite.rule-of-mixtures' },
    ],
    insideSource: { cite: 'Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996', kind: 'textbook' },
    ports: (): Port[] => [],
  },
  // made here, from the world's stock shapes: rated by the laws, from their size and material
  {
    id: 'transmission.shaft', does: 'carries torque along its length and holds what turns on it, turned from round bar', category: 'transmission', takes: ['rotation'], gives: ['rotation', 'load'],
    families: [], shapes: ['rod.round'],
    laws: ['torsion.solid', 'shaft.diameter.static', 'fatigue.endurance.steel', 'stress.bending'], principles: ['match-shaft-to-bore', 'cycling-needs-endurance', 'fillet-internal-corners', 'bearing-near-load', 'strength-margin'],
    inside: [
      { name: 'bar', does: 'round bar turned to size: its diameter cubed sets the torque it carries', law: 'torsion.solid', material: 'steel' },
      { name: 'seats and shoulders', does: 'turned to each bearing\'s and hub\'s fit, with fillets so stress doesn\'t crowd at the step', law: 'stress.bending' },
      { name: 'key seat or flat', does: 'where a hub\'s key or set screw grips it to pass torque' },
    ],
    insideSource: { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, ch. 7 (shafts)', kind: 'textbook' },
    ports: (): Port[] => [],
  },
  {
    id: 'transmission.wheel', does: 'turns rotation into travel along the ground, by grip', category: 'transmission', takes: ['rotation'], gives: ['travel', 'load'],
    families: [], shapes: ['wheel'],
    laws: ['wheel.torque', 'traction.limit', 'rolling.resistance'], principles: ['weight-on-driven-wheels', 'mass-where-it-moves'],
    inside: [
      { name: 'tyre', does: 'grips the ground: its friction times the weight on it is the most it can push', law: 'traction.limit', material: 'rubber' },
      { name: 'rim', does: 'holds the tyre round and carries the load to the hub' },
      { name: 'hub', does: 'fixes the wheel to its axle, or turns on bearings round it', law: 'wheel.torque' },
      { name: 'flexing as it rolls', does: 'the tyre deforms at its contact, losing a little energy every turn', law: 'rolling.resistance' },
    ],
    insideSource: { cite: 'Gillespie, Fundamentals of Vehicle Dynamics, SAE 1992, ch. 10 (tires)', kind: 'textbook' },
    ports: (): Port[] => [],
  },
  {
    id: 'structure.member', does: 'carries loads between the parts it holds and to the ground: a frame member cut from stock bar, tube, angle or sheet', category: 'structure', takes: ['load'], gives: ['load'],
    families: [], shapes: ['plate', 'rod.round', 'rod.square', 'tube.round', 'tube.square', 'angle'],
    laws: ['stress.axial', 'stress.bending', 'beam.simply-supported.udl', 'buckling.euler', 'torsion.twist'], principles: ['short-load-path', 'stiffness-by-depth', 'closed-sections-for-torsion', 'slender-in-compression', 'use-stock-sizes', 'weakest-link'],
    inside: [
      { name: 'section', does: 'its shape (tube, box, angle, plate) sets how stiff and strong it is: depth against bending, a closed wall against twist', law: 'stress.bending' },
      { name: 'ends', does: 'cut to length, drilled, welded or bolted: where its load passes to the next part, and where it is weakest', law: 'weld.fillet.shear' },
    ],
    insideSource: { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015, ch. 3-4', kind: 'textbook' },
    ports: (): Port[] => [],
  },
  {
    id: 'machine.assembly', does: 'is a whole machine: blocks put together to do one job', category: 'machine', takes: [], gives: [],
    families: [],
    laws: [], principles: ['minimise-part-count', 'top-down-assembly', 'tolerance-stack', 'tool-access', 'wear-parts-replaceable', 'fail-safe', 'support-once'],
    inside: [
      { name: 'systems', does: 'power, drive, support, structure and protection: each a set of blocks doing one function together' },
      { name: 'joints', does: 'how the blocks are held to each other: welded, bolted, clamped, pinned' },
    ],
    insideSource: { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007 (function structures)', kind: 'textbook' },
    ports: (): Port[] => [],
  },
  // protection: what keeps a fault from becoming a fire or an injury
  {
    id: 'protect.fuse', does: 'opens the circuit when the current is past what its wire can carry, before the wire burns', category: 'protection', takes: ['electric'], gives: ['electric'],
    families: ['fuse'],
    laws: ['joule', 'ohm'], principles: ['fuse-at-source', 'size-wire-by-drop-and-ampacity'],
    inside: [
      { name: 'fusible element', does: 'a thin metal link that heats by I² R and melts past its rating, the faster the further past', law: 'joule', material: 'zinc or copper alloy' },
      { name: 'body', does: 'holds the element and contains the arc as it opens' },
      { name: 'blades', does: 'plug into its holder' },
    ],
    insideSource: { cite: 'ISO 8820-1/-3 (road vehicles: fuse-links)', kind: 'standard' },
    ports: (c): Port[] => [{ name: 'link', kind: 'conduct', r: { I: n(c, 'rating'), Vmax: n(c, 'voltage'), interrupt: n(c, 'interrupt'), fuse: 1 } }],
  },
  {
    id: 'protect.guard', does: 'keeps fingers, hair and clothes out of anything that turns or runs', category: 'protection', takes: [], gives: [],
    families: [], shapes: ['plate'],
    laws: [], principles: ['guard-moving-parts'],
    inside: [
      { name: 'cover', does: 'sheet or mesh round the moving part, far enough off that a finger can\'t reach through (ISO 13857 safety distances)' },
      { name: 'fixings', does: 'need a tool to undo, so it isn\'t left off' },
    ],
    insideSource: { cite: 'ISO 14120 (guards); ISO 13857 (safety distances)', kind: 'standard' },
    ports: (): Port[] => [],
  },
];

export const archetypeOf = (c: CatalogItem) => ARCHETYPES.find((a) => a.families.includes(c.family)) ?? null;
export const archetypeById = (id: string) => ARCHETYPES.find((a) => a.id === id);


/** A block in a design: a catalogued item (batteries in series and parallel), or a part made here (a shaft turned from bar). */
export type Block =
  | { id: string; item: string; series?: number; parallel?: number }
  | { id: string; made: 'shaft'; d: number; material: string };

export interface Link {
  a: [string, string];
  b: [string, string];
  /** What it carries: volts V, amps I, torque T (N m), speed w (rad/s), radial force F (N). */
  carries?: { V?: number; I?: number; T?: number; w?: number; F?: number };
  /** The conductor blocks it runs through: an electrical connection is made by a wire, and protected by a fuse. */
  via?: string[];
}

export interface Design { blocks: Block[]; links: Link[] }

export interface Problem { link: number; severity: 'error' | 'warning'; principle: string; message: string }

/** A block's ports: its archetype's, from its item; a made shaft's from its diameter and material. */
export function portsOf(b: Block): Port[] {
  if ('made' in b) {
    const m = getMaterial(b.material);
    // a solid shaft's torque at yield in shear (τ_y ≈ 0.577 S_y, distortion energy), from τ = 16 T / (π d³)
    const T = (0.577 * m.yield * Math.PI * b.d ** 3) / 16;
    return [{ name: 'shaft', kind: 'shaft', r: { d: b.d, T } }];
  }
  const c = itemById(b.item);
  if (!c) throw new Error(`No catalogued item ${b.item}`);
  const a = archetypeOf(c);
  const ports = a ? a.ports(c) : [];
  // cells in series add their volts, in parallel their amp-hours
  const s = b.series ?? 1, p = b.parallel ?? 1;
  if (a?.id === 'power.store' && (s !== 1 || p !== 1)) {
    return ports.map((x) => ({ ...x, r: { ...x.r, V: x.r['V']! * s, Vmax: x.r['Vmax']! * s, Ah: x.r['Ah']! * p } }));
  }
  return ports;
}

const port = (d: Design, [blk, name]: [string, string]) => {
  const b = d.blocks.find((x) => x.id === blk);
  if (!b) throw new Error(`No block ${blk}`);
  const p = portsOf(b).find((x) => x.name === name);
  if (!p) throw new Error(`${blk} has no port ${name}`);
  return { b, p };
};

/** Every connection in a design checked against its ports' ratings; each problem names the principle it breaks. */
export function checkDesign(d: Design): Problem[] {
  const out: Problem[] = [];
  // a controller gives its motor the supply it is fed: what reaches a block's DC input is what its DC output can give
  const fed = new Map<string, { V?: number; Vmax?: number }>();
  for (const l of d.links) {
    const A = port(d, l.a), B = port(d, l.b);
    if (A.p.kind === 'dc-out' && B.p.kind === 'dc-in') fed.set(B.b.id, { V: A.p.r['V'], Vmax: A.p.r['Vmax'] });
  }
  d.links.forEach((l, k) => {
    const A = port(d, l.a), B = port(d, l.b), c = l.carries ?? {};
    const err = (principle: string, message: string) => out.push({ link: k, severity: 'error', principle, message });
    const warn = (principle: string, message: string) => out.push({ link: k, severity: 'warning', principle, message });
    const kinds = `${A.p.kind}>${B.p.kind}`;
    const [src, snk] = [A.p.kind === 'dc-out' && A.p.r['V'] === undefined && fed.has(A.b.id) ? { ...A.p, r: { ...fed.get(A.b.id), ...A.p.r } as Record<string, number> } : A.p, B.p];
    if (l.via) {
      const through = l.via.map((id) => { const b = d.blocks.find((x) => x.id === id); if (!b) throw new Error(`No block ${id}`); return { id, p: portsOf(b).find((x) => x.kind === 'conduct') }; });
      const wires = through.filter((x) => x.p && !x.p.r['fuse']), fuses = through.filter((x) => x.p?.r['fuse']);
      for (const x of through) if (!x.p) err('size-wire-by-drop-and-ampacity', `${x.id} doesn't conduct`);
      for (const w of wires) if (c.I !== undefined && c.I > w.p!.r['I']!) err('size-wire-by-drop-and-ampacity', `${c.I.toFixed(1)} A through ${w.id}, rated ${w.p!.r['I']} A`);
      for (const f of fuses) {
        const r = f.p!.r;
        // above the load (continuous loads at 125%, NEC 210.20), below what the wire it protects can carry (NEC 240.4)
        if (c.I !== undefined && r['I']! < 1.25 * c.I) warn('fuse-at-source', `${f.id} at ${r['I']} A is under 125% of the ${c.I.toFixed(1)} A it carries: it would blow in normal running`);
        for (const w of wires) if (r['I']! > w.p!.r['I']!) err('fuse-at-source', `${f.id} at ${r['I']} A is past ${w.id}'s ${w.p!.r['I']} A: the wire would burn before it blew`);
        if (src.r['Vmax'] !== undefined && src.r['Vmax']! > r['Vmax']!) err('match-voltage', `${f.id} is rated ${r['Vmax']} V, below the ${src.r['Vmax']!.toFixed(1)} V it would have to break`);
      }
      if (A.p.kind === 'dc-out' && B.p.kind === 'dc-in' && 'item' in A.b && archetypeOf(itemById(A.b.item)!)?.id === 'power.store' && !fuses.length) err('fuse-at-source', `nothing protects the wire from ${A.b.id}: put a fuse at its terminal`);
    } else if (A.p.kind === 'dc-out' && B.p.kind === 'dc-in' && 'item' in A.b && archetypeOf(itemById(A.b.item)!)?.id === 'power.store') {
      err('fuse-at-source', `nothing protects the connection from ${A.b.id}: run it through a wire with a fuse at the terminal`);
    }
    if (kinds === 'dc-out>dc-in') {
      if (src.r['Vmax'] !== undefined && snk.r['Vmax'] !== undefined && src.r['Vmax']! > snk.r['Vmax']!) err('match-voltage', `${A.b.id} gives up to ${src.r['Vmax']!.toFixed(1)} V, more than ${B.b.id} takes (${snk.r['Vmax']} V)`);
      if (src.r['V'] !== undefined && snk.r['Vmin'] !== undefined && src.r['V']! < snk.r['Vmin']!) err('match-voltage', `${A.b.id} gives ${src.r['V']} V, less than ${B.b.id} needs (${snk.r['Vmin']} V)`);
      if (c.I !== undefined && src.r['I'] !== undefined && c.I > src.r['I']!) err('derate-for-heat', `${c.I.toFixed(1)} A is more than ${A.b.id} gives continuously (${src.r['I']} A)`);
      if (c.I !== undefined && snk.r['I'] !== undefined && c.I > snk.r['I']!) warn('derate-for-heat', `${c.I.toFixed(1)} A is ${(c.I / snk.r['I']!).toFixed(1)}× ${B.b.id}'s continuous ${snk.r['I']} A: only in bursts its windings can take`);
      // a controller with no current limit feeding a motor whose stall current is past what it gives: a stall burns one of them
      if (src.r['limit'] === 0 && snk.r['Ipeak'] !== undefined && snk.r['Ipeak']! > (src.r['Ipeak'] ?? 0)) warn('current-limit-motors', `${A.b.id} has no current limit, and ${B.b.id} stalls at ${snk.r['Ipeak']!.toFixed(0)} A, past its ${src.r['Ipeak']} A peak`);
    } else if (kinds === 'conduct>conduct' || A.p.kind === 'conduct' || B.p.kind === 'conduct') {
      const w = A.p.kind === 'conduct' ? A : B;
      if (c.I !== undefined && w.p.r['I'] !== undefined && c.I > w.p.r['I']!) err('size-wire-by-drop-and-ampacity', `${c.I.toFixed(1)} A through ${w.b.id}, rated ${w.p.r['I']} A`);
    } else if (kinds === 'shaft-out>shaft-in') {
      const motor = 'item' in A.b ? A.b.item : '';
      if (B.p.accepts && !B.p.accepts.includes(motor)) err('standard-parts-first', `${B.b.id} isn't made to fit ${A.b.id}`);
    } else if ((A.p.kind === 'shaft-out' || A.p.kind === 'shaft') && B.p.kind === 'bore') {
      const d = A.p.r['d']!;
      if (B.p.r['dMax'] !== undefined) {
        if (d > B.p.r['dMax']! + 1e-6) err('match-shaft-to-bore', `a Ø${(d * 1000).toFixed(0)} mm shaft won't go in ${B.b.id} (bored to ${(B.p.r['dMax']! * 1000).toFixed(1)} mm at most)`);
        if (c.T !== undefined && c.T * 1.5 > B.p.r['T']!) err('coupling-takes-misalignment', `${c.T.toFixed(1)} N·m × 1.5 service factor is past ${B.b.id}'s ${B.p.r['T']!.toFixed(1)} N·m`);
      } else if (B.p.r['d'] !== undefined && Math.abs(d - B.p.r['d']!) > 1e-4) {
        err('match-shaft-to-bore', `a Ø${(d * 1000).toFixed(1)} mm shaft in a ${(B.p.r['d']! * 1000).toFixed(1)} mm bearing bore: turn the shaft to the bore`);
      }
      if (A.p.r['radial'] !== undefined && c.F !== undefined && c.F > A.p.r['radial']!) err('gearhead-takes-torque-not-load', `${c.F.toFixed(0)} N radial on ${A.b.id}'s output, rated ${A.p.r['radial']} N: carry the load on its own bearings`);
      if (A.p.r['T'] !== undefined && c.T !== undefined && c.T > A.p.r['T']!) warn('derate-for-heat', `${c.T.toFixed(1)} N·m out of ${A.b.id}, past its continuous ${A.p.r['T']!.toFixed(1)} N·m (fine in bursts)`);
    }
    if (B.p.kind === 'bore' && B.p.r['C0'] !== undefined && c.F !== undefined && c.F > B.p.r['C0']!) err('strength-margin', `${c.F.toFixed(0)} N on ${B.b.id} is past its static rating ${B.p.r['C0']} N`);
    if (c.T !== undefined && (A.p.kind === 'shaft' || B.p.kind === 'shaft')) {
      const s = A.p.kind === 'shaft' ? A : B;
      if (c.T * 2 > s.p.r['T']!) err('strength-margin', `${c.T.toFixed(1)} N·m on the Ø${(s.p.r['d']! * 1000).toFixed(0)} mm shaft ${s.b.id} leaves less than 2× its ${s.p.r['T']!.toFixed(0)} N·m yield torque`);
    }
  });
  return out;
}

/**
 * One driven wheel of a powertrain (powertrain.design's answer) as blocks: the pack through its fuse and wire to the
 * controller, the controller through its wire to the motor, the motor into its gearhead, the gearhead's output into a
 * coupling, the coupling onto the axle, the axle in its bearing, and the gearhead's body held by a rod end (the torque
 * arm). Each connection carries what the drive puts through it, so `checkDesign` can say whether it holds.
 */
export function designFromPowertrain(p: PowertrainChoice): Design {
  const dr = p.drive;
  const blocks: Block[] = [
    { id: 'pack', item: dr.battery, series: dr.series }, { id: 'controller', item: dr.controller }, { id: 'motor', item: dr.motor },
    ...(p.wire ? [{ id: 'wire', item: `awg.${p.wire.gauge}` }] : []),
    ...(p.fuse ? [{ id: 'fuse', item: p.fuse }] : []),
    ...(dr.gearhead ? [{ id: 'gearhead', item: dr.gearhead }] : []),
    ...(p.coupling ? [{ id: 'coupling', item: p.coupling }] : []),
    ...(p.axle ? [{ id: 'axle', made: 'shaft' as const, d: p.axle, material: p.axleMaterial ?? 'steel.1018-cd' }] : []),
    ...(p.bearing ? [{ id: 'bearing', item: p.bearing }] : []),
    ...(p.torqueArm ? [{ id: 'torque arm', item: p.torqueArm.rodEnd }] : []),
  ];
  const has = (id: string) => blocks.some((b) => b.id === id);
  const wired = has('wire') ? ['wire'] : [];
  const fromPack = { via: [...(has('fuse') ? ['fuse'] : []), ...wired] }, toMotor = wired.length ? { via: wired } : {};
  const out = dr.gearhead ? 'gearhead' : 'motor';
  const shaftOut: [string, string] = [out, dr.gearhead ? 'output' : 'shaft'];
  const links: Link[] = [
    { a: ['pack', 'terminals'], b: ['controller', 'supply'], carries: { I: dr.currentLimit }, ...fromPack },
    { a: ['controller', 'motor'], b: ['motor', 'power'], carries: { I: dr.currentLimit }, ...toMotor },
    ...(dr.gearhead ? [{ a: ['motor', 'shaft'] as [string, string], b: ['gearhead', 'input'] as [string, string] }] : []),
    ...(has('coupling') ? [{ a: shaftOut, b: ['coupling', 'hub A'] as [string, string], carries: { T: p.torque } }] : []),
    ...(has('coupling') && has('axle') ? [{ a: ['axle', 'shaft'] as [string, string], b: ['coupling', 'hub B'] as [string, string], carries: { T: p.torque } }] : []),
    ...(has('axle') && has('bearing') ? [{ a: ['axle', 'shaft'] as [string, string], b: ['bearing', 'bore'] as [string, string], carries: { F: p.wheelLoad } }] : []),
    ...(has('torque arm') ? [{ a: [out, 'body'] as [string, string], b: ['torque arm', 'eye'] as [string, string], carries: { F: p.torqueArm!.force } }] : []),
  ];
  return { blocks, links };
}

/** Blocks the catalogue offers, by archetype. */
export function blocksByArchetype(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const c of CATALOG) { const a = archetypeOf(c); if (a) (out[a.id] ??= []).push(c.id); }
  return out;
}

/** Torque through a shaft by its own law, for a made one: τ for T on a solid round shaft. */
export const shaftStress = (T: number, d: number) => apply('torsion.solid', { T, d });
