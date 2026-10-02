// Why things are the way they are. A principle is a design rule with its reason: what to do, why physically (the laws
// behind it), what it applies to (archetypes, processes, joints), where it comes from, and, where this world has
// shown it, the case that did. They are grouped by the question they answer: where loads go, how a thing is held, how
// much margin, how it fails over time, how it is made and put together and kept running, how heat and current are
// managed, how it stays safe and upright. Ego answers "why" from them, and her building blocks name the principle
// each problem breaks.

import type { Source } from './types';

export type PrincipleCategory =
  | 'load path' | 'determinacy' | 'strength margin' | 'stiffness' | 'fatigue' | 'stress concentration' | 'stability'
  | 'materials' | 'fits and tolerances' | 'manufacturing' | 'assembly' | 'service' | 'thermal' | 'electrical' | 'safety'
  | 'cost and mass' | 'standard parts' | 'motion';

export interface Principle {
  id: string;
  category: PrincipleCategory;
  /** What to do. */
  rule: string;
  /** Why, physically. */
  why: string;
  /** The laws that make it so. */
  laws: string[];
  /** Archetypes, processes and joints it governs (ids as in blocks.ts, processes.ts, connectors/registry.ts). */
  appliesTo: string[];
  source: Source;
  /** Where this world showed it. */
  seen?: string;
}

const PAHL = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007', kind: 'textbook' as const };
const DFMA = { cite: 'Boothroyd, Dewhurst & Knight, Product Design for Manufacture and Assembly, 3rd ed., CRC 2011', kind: 'textbook' as const };
const SHIGLEY = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' as const };
const PETERSON = { cite: 'Pilkey & Pilkey, Peterson\'s Stress Concentration Factors, 3rd ed., Wiley 2008', kind: 'handbook' as const };
const SKF = { cite: 'SKF, Rolling bearings catalogue (bearing arrangements, fits)', kind: 'maker' as const };
const WIRING = { cite: 'ABYC E-11 AC and DC Electrical Systems on Boats; NFPA 70 (NEC) Article 240 overcurrent protection', kind: 'standard' as const };
const GILLESPIE = { cite: 'Gillespie, Fundamentals of Vehicle Dynamics, SAE 1992', kind: 'textbook' as const };
const COMPOSITES = { cite: 'Hull & Clyne, An Introduction to Composite Materials, 2nd ed., Cambridge 1996', kind: 'textbook' as const };
const CORROSION = { cite: 'MIL-STD-889 Dissimilar Metals (galvanic compatibility)', kind: 'standard' as const };
const MACHINERY = { cite: 'Oberg et al., Machinery\'s Handbook, 31st ed., Industrial Press 2020', kind: 'handbook' as const };
const SAFETY = { cite: 'ISO 12100 Safety of machinery — risk assessment and risk reduction; ISO 13857 safety distances', kind: 'standard' as const };

export const PRINCIPLES: Principle[] = [
  // ------------------------------------------------------------------ load path
  {
    id: 'bearing-near-load', category: 'load path', rule: 'Put a shaft\'s supports as close to its loads as you can.',
    why: 'A load hung out past its support bends the shaft by force times overhang, and the supports\' reactions grow with the overhang over their spacing; close supports keep both small.',
    laws: ['stress.bending', 'beam.cantilever.point'], appliesTo: ['support.rotate', 'bearing.fit'], source: SHIGLEY,
    seen: 'The kart\'s hangers sit at 0.30 m with the wheels at 0.36 m: the gearmotor end sees about a third of the wheel load.',
  },
  {
    id: 'short-load-path', category: 'load path', rule: 'Carry every load to the ground by the shortest, most direct path, through the stiffest parts.',
    why: 'Each part a load passes through adds bending and deflection; a direct path loads members in tension and compression, where they are strongest and stiffest.',
    laws: ['stress.axial', 'stress.bending'], appliesTo: ['structure.member'], source: PAHL,
  },
  {
    id: 'gearhead-takes-torque-not-load', category: 'load path', rule: 'Let a gearmotor\'s output shaft carry torque only; carry the wheel\'s weight on bearings of its own.',
    why: 'A gearhead\'s output bearings are rated for small radial loads (hundreds of newtons at a dozen millimetres); a wheel\'s load and its bending moment would wear them out or snap the shaft.',
    laws: ['bearing.life.l10', 'stress.bending'], appliesTo: ['transmission.reduce', 'actuation.rotary'], source: SKF,
    seen: 'The first real kart broke its 12 mm gearhead shafts at 98 to 286 N·m of bending: the shaft was one of two rigid supports on its axle.',
  },
  // ------------------------------------------------------------------ determinacy
  {
    id: 'support-once', category: 'determinacy', rule: 'Hold each body exactly as much as it needs (statically determinate), or share the load between supports deliberately by their stiffness.',
    why: 'Redundant rigid supports fight: how the load splits between them is set by tiny misalignments and deflections, not by the design, and one of them can take far more than planned.',
    laws: ['newton.second'], appliesTo: ['support.rotate', 'structure.member'], source: PAHL,
    seen: 'Two moment-carrying supports on one half-axle split its bending arbitrarily in the solver; made determinate, every load is known.',
  },
  {
    id: 'torque-arm', category: 'determinacy', rule: 'Hang a shaft-mounted gearmotor on its shaft and stop its housing turning with a torque arm, a single link, and nothing more.',
    why: 'The housing then has exactly one constraint left to take, its reaction torque, as a push or pull of T over the arm\'s radius; nothing else loads the gearhead\'s bearings.',
    laws: ['wheel.torque', 'stress.axial'], appliesTo: ['actuation.rotary', 'connection.two-force'], source: PAHL,
    seen: 'The kart\'s torque arms push about 158 N at 37 mm for 5.8 N·m.',
  },
  {
    id: 'two-force-member', category: 'determinacy', rule: 'A link pinned at both ends carries load only along its line: size it for pull, and for buckling when pushed.',
    why: 'Pins pass no moment, so the only force a two-pinned link can carry is along the line between its pins.',
    laws: ['stress.axial', 'buckling.euler', 'buckling.johnson'], appliesTo: ['connection.two-force', 'link'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ strength margin
  {
    id: 'strength-margin', category: 'strength margin', rule: 'Choose a safety factor by how bad failure would be and how well the loads and materials are known: about 1.5 to 2 for well-known steady loads, 3 or more where people are carried or loads are uncertain.',
    why: 'Real loads, material strengths and dimensions scatter; the factor covers the scatter so the weakest real part still outlasts the worst real load.',
    laws: ['shaft.diameter.static'], appliesTo: ['structure.member', 'support.rotate', 'transmission.couple'], source: SHIGLEY,
  },
  {
    id: 'weakest-link', category: 'strength margin', rule: 'Check every part in the load path, joints and fasteners included: the assembly is as strong as its weakest one.',
    why: 'Load passes through each part and joint in turn; the first to reach its capacity fails the whole.',
    laws: ['stress.axial'], appliesTo: ['bolted', 'weld', 'screwed', 'structure.member'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ stiffness
  {
    id: 'stiffness-by-depth', category: 'stiffness', rule: 'Make a beam deep in the direction it bends.',
    why: 'Its stiffness goes as its depth cubed (I = b h³/12) and its strength as depth squared, but its weight only as depth.',
    laws: ['beam.simply-supported.udl', 'stress.bending'], appliesTo: ['structure.member'], source: SHIGLEY,
  },
  {
    id: 'closed-sections-for-torsion', category: 'stiffness', rule: 'Use closed sections (tubes, boxes) where a member is twisted.',
    why: 'A closed section carries torque round its whole perimeter; an open one (an angle, a channel) of the same weight twists tens of times more.',
    laws: ['torsion.twist'], appliesTo: ['structure.member'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ fatigue
  {
    id: 'cycling-needs-endurance', category: 'fatigue', rule: 'Check anything that is loaded back and forth (a turning shaft under bending, a vibrating bracket) against its endurance limit, not its static strength.',
    why: 'Cyclic stress grows cracks a little each cycle; steel survives endlessly only below about half its tensile strength, and less for a rough or large part.',
    laws: ['fatigue.endurance.steel', 'stress.von-mises'], appliesTo: ['transmission.shaft', 'support.rotate'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ stress concentration
  {
    id: 'fillet-internal-corners', category: 'stress concentration', rule: 'Round internal corners and shoulders; keep keyways, holes and notches out of the most stressed places.',
    why: 'Stress crowds round a sharp change of section: a sharp shoulder can multiply it two to three times (K_t), and cracks start there.',
    laws: ['stress.bending'], appliesTo: ['turn', 'mill', 'structure.member'], source: PETERSON,
  },
  // ------------------------------------------------------------------ stability
  {
    id: 'low-centre-of-mass', category: 'stability', rule: 'Keep the centre of mass low and well inside the base; on a vehicle, low against its track width.',
    why: 'A body tips when the resultant of its weight and inertia forces passes outside its base: a vehicle rolls over in a turn when its sideways acceleration passes g × half-track over centre-of-mass height.',
    laws: ['centripetal', 'cornering.limit'], appliesTo: ['machine.assembly', 'structure.member'], source: GILLESPIE,
  },
  {
    id: 'slender-in-compression', category: 'stability', rule: 'Check slender members in compression for buckling before their strength.',
    why: 'A slender strut bows out and collapses far below its crushing load (Euler); a stocky one yields first (Johnson), the transition set by √(2π² E/S_y).',
    laws: ['buckling.euler', 'buckling.johnson', 'slenderness.transition'], appliesTo: ['structure.member', 'connection.two-force'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ materials
  {
    id: 'load-composites-along-fibres', category: 'materials', rule: 'Lay fibres along the loads.',
    why: 'Along its fibres a composite is nearly as stiff as its fibres in proportion to their share; across them it is barely stiffer than its matrix.',
    laws: ['composite.rule-of-mixtures', 'composite.transverse'], appliesTo: ['cff', 'material.print'], source: COMPOSITES,
  },
  {
    id: 'print-loads-in-plane', category: 'materials', rule: 'Orient a printed part so its loads run along its layers.',
    why: 'Printed layers bond to each other weaker than the material within a layer; continuous fibre lies only in-plane.',
    laws: ['composite.transverse'], appliesTo: ['cff', 'metal.fff', 'material.print'], source: COMPOSITES,
  },
  {
    id: 'galvanic-isolation', category: 'materials', rule: 'Keep dissimilar metals apart where water can bridge them (aluminium on steel or copper); isolate, coat or seal the joint.',
    why: 'Two metals far apart in the galvanic series form a cell in an electrolyte; the less noble one (aluminium, zinc) corrodes fast.',
    laws: [], appliesTo: ['bolted', 'riveted', 'structure.member'], source: CORROSION,
  },
  {
    id: 'allow-thermal-growth', category: 'materials', rule: 'Allow for different expansion where materials are joined or a part runs hot (slots, floating supports, one fixed bearing and one free).',
    why: 'Aluminium grows about twice as much as steel per kelvin; restrained, the difference becomes stress or binding.',
    laws: ['thermal.expansion'], appliesTo: ['support.rotate', 'structure.member'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ fits and tolerances
  {
    id: 'interference-on-rotating-ring', category: 'fits and tolerances', rule: 'Press-fit the bearing ring that turns relative to the load; make the other a sliding fit.',
    why: 'A ring loaded all round its circumference by a turning load creeps and wears its seat unless it is held by interference.',
    laws: [], appliesTo: ['support.rotate', 'bearing.fit'], source: SKF,
  },
  {
    id: 'match-shaft-to-bore', category: 'fits and tolerances', rule: 'Make each shaft or axle to its bore: a bearing\'s bore exactly (to its fit), a coupling\'s within its range.',
    why: 'A shaft too small in a bearing rattles and fret-wears; too big won\'t go in. A coupling hub bores only up to its size.',
    laws: [], appliesTo: ['support.rotate', 'transmission.couple', 'turn'], source: MACHINERY,
    seen: 'The kart\'s axle is Ø25 mm though its strength needs only about 10 mm: it is made to its bearing\'s 25 mm bore.',
  },
  {
    id: 'tolerance-stack', category: 'fits and tolerances', rule: 'Budget clearances so the worst-case stack of every part\'s tolerance still assembles and works.',
    why: 'Tolerances add along a chain of parts; at their extremes a clearance designed for nominal sizes can vanish or open.',
    laws: [], appliesTo: ['machine.assembly'], source: MACHINERY,
  },
  // ------------------------------------------------------------------ manufacturing
  {
    id: 'use-stock-sizes', category: 'manufacturing', rule: 'Design to sizes that are sold: bar, tube, sheet and lumber in stock sizes, fasteners in stocked lengths.',
    why: 'Stock is cheap and quick; a non-stock size is cut or machined down from the next one up, wasting material and time.',
    laws: [], appliesTo: ['saw', 'structure.member'], source: DFMA,
  },
  {
    id: 'respect-process-limits', category: 'manufacturing', rule: 'Keep to each process\'s limits: bend radii, hole edge distances, thread engagement, weldable pairs.',
    why: 'Below a material\'s bend radius it cracks; a hole too near an edge tears out; too little thread strips before the bolt breaks.',
    laws: [], appliesTo: ['bend', 'drill', 'tap', 'weld.mig'], source: MACHINERY,
  },
  {
    id: 'uniform-sections', category: 'manufacturing', rule: 'Keep wall thicknesses even in printed, cast, moulded and sintered parts.',
    why: 'Thick and thin sections cool, cure or shrink at different rates; the difference warps the part or cracks it.',
    laws: ['sinter.scale'], appliesTo: ['metal.fff', 'cff'], source: DFMA,
  },
  {
    id: 'one-setup-for-aligned-features', category: 'manufacturing', rule: 'Machine features that must line up (bearing seats, bores) in one setup.',
    why: 'Each time a part is re-clamped its position is lost by a little; features cut together share one datum.',
    laws: [], appliesTo: ['bore', 'turn', 'mill'], source: MACHINERY,
  },
  // ------------------------------------------------------------------ assembly
  {
    id: 'minimise-part-count', category: 'assembly', rule: 'Give each part a reason to be separate: it moves relative to its neighbours, is a different material, or must come off for service. Otherwise make it one with its neighbour.',
    why: 'Every separate part costs a fastener, a handling, an alignment and a failure point (the Boothroyd-Dewhurst minimum part count).',
    laws: [], appliesTo: ['machine.assembly'], source: DFMA,
  },
  {
    id: 'top-down-assembly', category: 'assembly', rule: 'Assemble from one direction, gravity helping, with features that locate each part.',
    why: 'Turning a part over or holding it in place while fastening is slow and error-prone; self-locating parts can only go together one way.',
    laws: [], appliesTo: ['machine.assembly'], source: DFMA,
  },
  {
    id: 'tool-access', category: 'assembly', rule: 'Leave room for the tool on every fastener, and for a hand to hold the part.',
    why: 'A fastener that can\'t be reached with a wrench or driver can\'t be tightened to its torque, or undone.',
    laws: [], appliesTo: ['bolted', 'screwed', 'clamp'], source: DFMA,
  },
  {
    id: 'no-holes-in-bought-items', category: 'assembly', rule: 'Fix a bought item only by its own mounting features, or clamp or strap it; never drill, screw, weld or glue into it.',
    why: 'Its maker rates it as made: a hole in a battery case lets out acid, one in a motor housing reaches its windings or magnets.',
    laws: [], appliesTo: ['actuation.rotary', 'power.store', 'clamp'], source: PAHL,
    seen: 'Rule R11: the first real kart had bolts through its battery case and a lug bolted into a gearhead with no holes.',
  },
  {
    id: 'bolt-through-thinner', category: 'assembly', rule: 'Drive a screw or bolt through the part that is thinner along its path, into the other.',
    why: 'The fastener\'s grip comes from the part it threads or bites into; through the thin part it reaches the thick one with the most engagement.',
    laws: [], appliesTo: ['screwed', 'bolted'], source: SHIGLEY, seen: 'Rule R2.',
  },
  {
    id: 'coupling-takes-misalignment', category: 'assembly', rule: 'Join two shafts that each run in their own bearings with a flexible coupling, sized for the torque times a service factor.',
    why: 'Two shafts are never perfectly in line; a rigid joint between them bends both and loads their bearings; a flexible one passes torque and takes up the error.',
    laws: ['power.rotary'], appliesTo: ['transmission.couple'], source: SHIGLEY,
  },
  // ------------------------------------------------------------------ service
  {
    id: 'wear-parts-replaceable', category: 'service', rule: 'Make the parts that wear (bearings, belts, chains, brushes, tyres, spiders) reachable and replaceable without taking everything else apart.',
    why: 'They will need replacing; if they are buried the whole machine is scrapped or stripped for a cheap part.',
    laws: ['bearing.life.l10'], appliesTo: ['support.rotate', 'transmission.flexible', 'transmission.couple'], source: PAHL,
  },
  // ------------------------------------------------------------------ thermal
  {
    id: 'derate-for-heat', category: 'thermal', rule: 'Run a motor at or below its continuous current, and above it only for as long as its thermal time constants allow.',
    why: 'Copper loss goes as current squared; the winding\'s temperature rises by that loss times its thermal resistances, and past its insulation\'s limit it burns out.',
    laws: ['joule', 'thermal.network', 'copper.tempco'], appliesTo: ['actuation.rotary', 'power.control'], source: { cite: 'maxon, Key information on motor data (thermal data, operating range)', kind: 'maker' },
    seen: 'A stalled motor at 20 A burns out in about the time its two-node thermal model gives.',
  },
  {
    id: 'heat-path', category: 'thermal', rule: 'Give every hot part a path for its heat: conduction to a sink, air over it.',
    why: 'Every watt lost has to leave; a part heats until its loss is carried away by conduction, convection and radiation.',
    laws: ['convection', 'conduction', 'radiation', 'thermal.resistance.conduction'], appliesTo: ['actuation.rotary', 'power.control', 'power.store'], source: { cite: 'Bergman, Lavine, Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, 7th ed.', kind: 'textbook' },
  },
  // ------------------------------------------------------------------ electrical
  {
    id: 'fuse-at-source', category: 'electrical', rule: 'Put a fuse or breaker as close to the battery as you can, rated above the load\'s normal draw and below the wire\'s ampacity.',
    why: 'A short draws the battery\'s whole current through the wire; the fuse must open before the wire\'s I²R heating melts its insulation, and it can only protect the wire downstream of it.',
    laws: ['joule', 'ohm'], appliesTo: ['power.store', 'power.conduct'], source: WIRING,
  },
  {
    id: 'size-wire-by-drop-and-ampacity', category: 'electrical', rule: 'Choose a wire by both its current rating and the voltage it drops over its run.',
    why: 'Its rating keeps its insulation below its temperature limit; its resistance times the current, out and back, steals voltage from the load.',
    laws: ['wire.drop', 'wire.resistance', 'joule'], appliesTo: ['power.conduct'], source: WIRING,
  },
  {
    id: 'current-limit-motors', category: 'electrical', rule: 'Limit a motor\'s current at its controller, below what its winding, its gearhead and its controller can take.',
    why: 'Stalled, a DC motor draws its supply voltage over its winding resistance, many times its rated current; that torque can break its gearhead and that current burn it or its controller.',
    laws: ['motor.current', 'motor.torque'], appliesTo: ['power.control', 'actuation.rotary'], source: { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013', kind: 'textbook' },
  },
  {
    id: 'match-voltage', category: 'electrical', rule: 'Match the supply to what each part is rated for, at the supply\'s highest (a charged battery reads above its nominal).',
    why: 'Over its rating a controller\'s transistors and capacitors fail; under it a motor runs slow and weak.',
    laws: ['lead-acid.ocv'], appliesTo: ['power.store', 'power.control', 'actuation.rotary'], source: WIRING,
  },
  // ------------------------------------------------------------------ safety
  {
    id: 'guard-moving-parts', category: 'safety', rule: 'Guard pinch points and anything that turns or runs: chains, belts, gears, shafts with set screws.',
    why: 'They catch fingers, hair and clothes faster than anyone can react.',
    laws: [], appliesTo: ['transmission.flexible', 'transmission.couple'], source: SAFETY,
  },
  {
    id: 'fail-safe', category: 'safety', rule: 'Arrange that a failure leaves it safe: power cut, brakes on, loads lowered.',
    why: 'Parts and power will fail some day; what happens then should not hurt anyone.',
    laws: [], appliesTo: ['power.control'], source: SAFETY,
  },
  // ------------------------------------------------------------------ cost and mass
  {
    id: 'mass-where-it-moves', category: 'cost and mass', rule: 'Take mass out where it moves most: wheels, rotors, arms, anything accelerated.',
    why: 'Moving mass costs force (F = m a) and energy, and stresses everything that drives or holds it; spinning mass far from its axis costs most (I = m r²).',
    laws: ['newton.second', 'energy.rotational', 'inertia.disc'], appliesTo: ['transmission.wheel', 'actuation.rotary', 'structure.member'], source: PAHL,
  },
  // ------------------------------------------------------------------ standard parts
  {
    id: 'standard-parts-first', category: 'standard parts', rule: 'Use standard bought parts to a recognised designation (ISO bearing sizes, ANSI chain, metric fasteners) before making special ones.',
    why: 'They are tested, rated, cheap and replaceable anywhere; a special part needs designing, making and stocking.',
    laws: [], appliesTo: ['support.rotate', 'transmission.flexible', 'bolted'], source: DFMA,
  },
  // ------------------------------------------------------------------ motion
  {
    id: 'weight-on-driven-wheels', category: 'motion', rule: 'Put weight over the driven wheels.',
    why: 'They can push no harder than tyre grip times the weight on them; past that they spin.',
    laws: ['traction.limit'], appliesTo: ['transmission.wheel', 'machine.assembly'], source: GILLESPIE,
  },
  {
    id: 'gearing-match', category: 'motion', rule: 'Gear a motor so the job sits near its rated speed and current.',
    why: 'Geared too low, it pushes hard but never reaches speed; too high, it draws heavy current to push and overheats; near rated, it is efficient and cool.',
    laws: ['gear.output.torque', 'motor.current', 'motor.back-emf'], appliesTo: ['actuation.rotary', 'transmission.reduce'], source: { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013', kind: 'textbook' },
  },
];

export const principleById = (id: string) => PRINCIPLES.find((p) => p.id === id);
export const CATEGORIES = [...new Set(PRINCIPLES.map((p) => p.category))];

/** A principle said whole: the rule, why, the laws behind it, where this world showed it. */
export function explainPrinciple(p: Principle, lawName: (id: string) => string | undefined): string {
  const laws = p.laws.map(lawName).filter(Boolean);
  return `${p.rule} Why: ${p.why}${laws.length ? ` (${laws.join(', ')})` : ''}${p.seen ? ` Seen here: ${p.seen}` : ''} [${p.category}; ${p.source.cite}]`;
}
