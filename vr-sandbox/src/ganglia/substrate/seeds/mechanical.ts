// Mechanical elements: fasteners (the whole engineering space round a screw), bearings, shafts, springs, gears, belts,
// chains, couplings, clutches, brakes, cams, linkages, seals, valves, pistons, wheels, pumps, fans, turbines. Each is
// said by what it does, what it is made of, what makes it, what it varies by, what it fails by, what it is standardised
// by, and what else does the same job, in and out of engineering.
import { METRIC_COARSE, PROPERTY_CLASSES } from '../../../engineering/threads';
import type { Source } from '../../types';
import { Pack, param } from '../dsl';

const SHIGLEY: Source = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015', kind: 'textbook' };
const OBERG: Source = { cite: 'Oberg et al., Machinery\'s Handbook, 30th ed., Industrial Press 2016', kind: 'handbook' };
const ISO898: Source = { cite: 'ISO 898-1:2013 Mechanical properties of fasteners made of carbon steel and alloy steel, Part 1: bolts, screws and studs', kind: 'standard' };
const ISO68: Source = { cite: 'ISO 68-1:1998 ISO general purpose screw threads, basic profile; ISO 261:1998 general plan; ISO 262:1998 selected sizes', kind: 'standard' };
const ISO4762: Source = { cite: 'ISO 4762:2004 hexagon socket head cap screws; ISO 4014/4017 hexagon head bolts and screws; ISO 4032 hexagon nuts; ISO 7089 plain washers', kind: 'standard' };
const WOODHB: Source = { cite: 'USDA Forest Products Laboratory, Wood Handbook: Wood as an Engineering Material, FPL-GTR-190 (2010), ch. 8 eq. 8-5', kind: 'handbook' };
const HARRIS: Source = { cite: 'Harris & Kotzalas, Rolling Bearing Analysis, 5th ed., CRC 2007; ISO 281:2007', kind: 'textbook' };

export function mechanical(): Pack {
  const p = new Pack('mechanical', SHIGLEY);

  // ---------------------------------------------------------------------------------------------- functions and roles
  p.e('fn.clamp.axial', 'function', 'Hold two parts together by a sustained axial force across their joint.');
  p.e('fn.locate', 'function', 'Fix the position of one part relative to another.');
  p.e('fn.transmit.torque', 'function', 'Carry torque from one rotating member to another.');
  p.e('fn.transmit.force', 'function', 'Carry a force from one member to another.');
  p.e('fn.support.rotation', 'function', 'Let one part turn relative to another while carrying load, with little friction.');
  p.e('fn.support.translation', 'function', 'Let one part slide relative to another while carrying load, with little friction.');
  p.e('fn.support.load', 'function', 'Carry a load to ground without failing or deflecting too far.');
  p.e('fn.change.speed-ratio', 'function', 'Trade speed for torque (or force) between an input and an output.');
  p.e('fn.change.axis', 'function', 'Carry motion to another axis or direction.');
  p.e('fn.convert.rotation.translation', 'function', 'Turn rotation into a stroke along a line, or the reverse.');
  p.e('fn.couple.shafts', 'function', 'Join two shafts end to end so they turn together.');
  p.e('fn.engage.disengage', 'function', 'Connect or disconnect a drive while running.');
  p.e('fn.dissipate.motion', 'function', 'Take kinetic energy out of a moving part as heat.');
  p.e('fn.seal', 'function', 'Keep a fluid on one side of a boundary between parts that may move.');
  p.e('fn.control.flow', 'function', 'Open, close or throttle the passage of a fluid.');
  p.e('fn.contain.pressure', 'function', 'Hold a fluid at a pressure different from outside.');
  p.e('fn.move.fluid', 'function', 'Raise a fluid\'s pressure or drive its flow.');
  p.e('fn.extract.fluid-energy', 'function', 'Take work out of a moving or expanding fluid.');
  p.e('fn.roll', 'function', 'Carry a load over a surface by rolling instead of sliding.');
  p.e('fn.program.motion', 'function', 'Impose a motion profile on a follower from a rotating input.');
  p.e('fn.guide.motion', 'function', 'Constrain a part to one path of motion.');
  p.e('fn.store.elastic', 'function', 'Hold energy by elastic deformation and give it back.');
  p.e('fn.prevent.loosening', 'function', 'Keep a fastener from backing off under vibration.');
  p.e('fn.spread.load', 'function', 'Spread a concentrated force over a larger area.');
  p.link('fn.store.elastic', { 'is-a': ['store.energy'] });
  p.link('fn.convert.rotation.translation', { 'is-a': ['convert.rotational.translational'] });

  const ROLES: [string, string][] = [
    ['role.fastener', 'A part whose job is to hold other parts together.'], ['role.structural-member', 'A part whose job is to carry load.'],
    ['role.bearing-surface', 'A surface another slides or rolls on.'], ['role.wear-part', 'A part meant to wear and be replaced.'],
    ['role.energy-converter', 'A part that turns one form of energy into another.'], ['role.actuator', 'A part that makes motion on command.'],
    ['role.rotational-source', 'A part that supplies rotation.'], ['role.control-target', 'A part a controller commands.'],
    ['role.constructor-input', 'A part or material a construction process takes in.'], ['role.consumable', 'A thing used up by a process.'],
  ];
  for (const [id, says] of ROLES) p.e(id, 'role', says);

  // ---------------------------------------------------------------------------------------------- the fastener space
  p.e('fastener', ['component', 'manifold'], 'A part that joins others by mechanical force: threaded, driven, formed or clamped.', { names: ['fasteners'] });
  p.link('fastener', { does: ['fn.clamp.axial', 'fn.locate'], plays: ['role.fastener'], 'varies-by': ['param.joint-type', 'param.material', 'param.size'], 'fails-by': ['failure.loosening', 'failure.fatigue', 'failure.overload', 'failure.corrosion'] });
  p.e('thread.helix', 'geometry', 'A helical ridge of a given profile, pitch and hand wound on a cylinder or in a hole: the geometry every threaded joint shares.', { names: ['screw thread', 'thread'] });
  p.link('thread.helix', { 'is-a': ['geometry.helix'], 'varies-by': ['param.thread-form', 'param.pitch', 'param.diameter', 'param.hand', 'param.starts', 'param.tolerance-class'], 'governed-by': ['screw.force', 'screw.efficiency', 'friction.coulomb'], 'standardized-by': ['std.iso-68-1', 'std.iso-261', 'std.asme-b1.1'] });
  p.e('thread.iso-metric', ['geometry', 'standard', 'manifold'], 'The ISO 60° V thread: basic profile per ISO 68-1, coarse pitches per ISO 261, sizes M1 to M68.', { names: ['metric thread', 'M thread'], source: ISO68, params: [
    param('d', 'nominal diameter', ISO68, { unit: 'm', values: Object.keys(METRIC_COARSE) }), param('P', 'pitch', ISO68, { unit: 'm', low: Math.min(...Object.values(METRIC_COARSE).map((t) => t.P)), high: Math.max(...Object.values(METRIC_COARSE).map((t) => t.P)) }),
    param('angle', 'flank angle', ISO68, { unit: 'deg', low: 60, high: 60 }), param('class', 'tolerance class', ISO68, { values: ['4g6g', '6g', '6H', '6e'] }),
  ] });
  p.link('thread.iso-metric', { 'is-a': ['thread.helix'], 'standardized-by': ['std.iso-68-1', 'std.iso-261'], 'connects-to': ['nut', 'hole.tapped'] }, ISO68);
  p.e('thread.iso-fine', ['geometry', 'standard'], 'Metric threads with finer pitches (ISO 262) for thin walls, fine adjustment and better fatigue.', { source: ISO68 });
  p.link('thread.iso-fine', { 'is-a': ['thread.helix'], 'improved-by': [['thread.iso-metric', 'a finer pitch gives a larger stress area and more resistance to loosening at the cost of easier cross-threading']] }, ISO68);
  p.e('thread.unified', ['geometry', 'standard'], 'The 60° inch thread (UNC coarse, UNF fine) of ASME B1.1.', { names: ['UNC', 'UNF', 'unified thread'], source: { cite: 'ASME B1.1-2003 Unified inch screw threads', kind: 'standard' } });
  p.link('thread.unified', { 'is-a': ['thread.helix'] });
  p.e('thread.acme', ['geometry', 'standard'], 'A 29° trapezoidal thread for power screws: strong, easy to cut, a wide flat crest.', { source: OBERG });
  p.e('thread.trapezoidal', ['geometry', 'standard'], 'The 30° metric trapezoidal thread (ISO 2904) of lead screws.', { source: OBERG });
  p.e('thread.buttress', 'geometry', 'An asymmetric thread carrying load one way with a near-square flank: presses, vices.', { source: OBERG });
  p.e('thread.square', 'geometry', 'A square-profile power thread: the most efficient, the hardest to cut.', { source: SHIGLEY });
  p.e('thread.pipe', ['geometry', 'standard'], 'Tapered (NPT, BSPT) and parallel (BSPP) threads that seal on their flanks or a gasket.', { names: ['NPT', 'BSP', 'pipe thread'], source: OBERG });
  p.e('thread.wood', 'geometry', 'A coarse, sharp, deep thread that cuts its own mating thread in wood or plastic.', { source: OBERG });
  p.e('thread.self-tapping', 'geometry', 'A hardened thread that forms or cuts its mating thread in sheet or plastic as it is driven.', { source: OBERG });
  p.each(['thread.acme', 'thread.trapezoidal', 'thread.buttress', 'thread.square'], { 'is-a': ['thread.helix'], does: ['fn.convert.rotation.translation'] }, OBERG);
  p.each(['thread.pipe', 'thread.wood', 'thread.self-tapping'], { 'is-a': ['thread.helix'] }, OBERG);
  p.link('thread.pipe', { does: ['fn.seal'] });

  p.e('screw', ['component', 'manifold'], 'A threaded fastener driven into a mating thread (a nut, a tapped hole or a thread it forms itself), turning rotation at its head into axial clamping.', { names: ['machine screw', 'cap screw'], params: [
    param('d', 'nominal diameter', ISO68, { unit: 'm', values: Object.keys(METRIC_COARSE) }), param('L', 'length', ISO4762, { unit: 'm', low: 0.002, high: 0.3 }),
    param('head', 'head geometry', ISO4762, { values: ['socket cap', 'hex', 'pan', 'flat countersunk', 'button', 'cheese', 'oval', 'truss', 'fillister', 'set (headless)'] }),
    param('drive', 'drive geometry', OBERG, { values: ['hex socket', 'external hex', 'slot', 'Phillips', 'Pozidriv', 'Torx (hexalobular)', 'square (Robertson)', 'tri-wing', 'spanner'] }),
    param('class', 'property class', ISO898, { values: Object.keys(PROPERTY_CLASSES) }), param('material', 'material', ISO898, { values: ['carbon steel', 'alloy steel', 'stainless A2', 'stainless A4', 'brass', 'titanium', 'nylon', 'aluminium'] }),
    param('coating', 'coating', OBERG, { values: ['none', 'zinc electroplate', 'zinc flake', 'black oxide', 'hot-dip galvanised', 'phosphate', 'cadmium', 'PTFE'] }),
    param('thread', 'thread form', ISO68, { values: ['ISO metric coarse', 'ISO metric fine', 'UNC', 'UNF', 'self-tapping', 'wood'] }),
  ] });
  p.link('screw', {
    'is-a': ['fastener'], 'has-part': ['screw.head', 'screw.shank', 'thread.helix', 'screw.point'],
    does: ['fn.clamp.axial', 'fn.locate', 'fn.convert.rotation.translation'], transforms: ['convert.rotational.translational'],
    requires: ['thread.helix', 'param.torque', 'param.preload', 'friction.coulomb'],
    'interacts-with': ['nut', 'hole.tapped', 'washer', 'param.torque', 'param.preload', 'friction.coulomb', 'load.structural', 'joint.bolted', 'thread-locker'],
    'connects-to': ['nut', 'hole.tapped', 'insert.threaded'],
    'governed-by': ['bolt.torque.nut-factor', 'stress.axial', 'screw.force', 'screw.efficiency', 'friction.coulomb', 'fatigue.endurance.steel', 'hooke'],
    'made-of': ['steel.1018-cd', 'steel.4140-ann', 'stainless.304', 'stainless.316', 'brass.c360', 'titanium.ti6al4v', 'aluminum.6061-t6'],
    'produced-by': ['process.cold-heading', 'process.thread-rolling', 'process.thread-cutting', 'process.heat-treatment.quench-temper', 'process.plating.zinc', 'process.turn-and-thread'],
    'standardized-by': ['std.iso-4762', 'std.iso-4017', 'std.iso-898-1', 'std.din-912', 'std.asme-b18'],
    'fails-by': ['failure.thread-stripping', 'failure.fatigue', 'failure.loosening', 'failure.overload', 'failure.hydrogen-embrittlement', 'failure.galvanic-corrosion', 'failure.cam-out', 'failure.cross-threading', 'failure.galling'],
    'varies-by': ['param.size', 'param.pitch', 'param.length', 'param.head-geometry', 'param.drive-geometry', 'param.material', 'param.coating', 'param.property-class'],
    plays: ['role.fastener', 'role.constructor-input'], 'in-view': ['view.mechanical', 'view.manufacturing'],
    'analogous-to': [['bio.tendon-insertion', 'both anchor one body to another by a sustained tension across an interface'], ['bio.plant-root', 'a self-formed anchor whose grip grows with embedment, as a wood screw\'s does']],
    'improved-by': [['washer', 'spreads the head load and gives a known friction face'], ['thread-locker', 'fills the thread clearance so vibration cannot walk it back'], ['screw.flanged', 'a head with its own washer face']],
  });
  p.e('bolt', ['component', 'manifold'], 'A screw meant to pass through clearance holes and clamp with a nut; the joint is the bolt in tension and the parts in compression.', { names: ['hex bolt'] });
  p.link('bolt', { 'is-a': ['screw'], requires: ['nut', 'hole.clearance'], 'interacts-with': ['nut', 'washer', 'joint.bolted'], 'governed-by': ['bolt.torque.nut-factor', 'stress.axial'], 'standardized-by': ['std.iso-4014', 'std.iso-4017'] });
  p.e('screw.set', 'component', 'A headless screw that locks a collar or hub to a shaft by its point.', { names: ['set screw', 'grub screw'] });
  p.link('screw.set', { 'is-a': ['screw'], does: ['fn.locate', 'fn.transmit.torque'], 'interacts-with': ['shaft', 'hub'], 'fails-by': ['failure.slip', 'failure.shaft-marring'], 'standardized-by': ['std.iso-4026'] });
  p.e('woodscrew', 'component', 'A tapered, coarse-threaded screw that cuts its own thread in wood.', { names: ['wood screw'] });
  p.e('screw.withdrawal', 'law', 'Withdrawal resistance of a wood screw from side grain: p = 108.25 G^2 D L (p lbf; D, L inches; G specific gravity of the wood at 12 % moisture), valid for L at least 7 D; two-thirds of the thread length engaged. Cited, not run.', { source: WOODHB, names: ['wood screw withdrawal'], unknowns: ['not yet an executable law in laws.ts: cited, not run'] });
  p.link('woodscrew', { 'is-a': ['screw'], 'has-part': ['thread.wood'], 'interacts-with': ['wood.douglas-fir', 'wood.birch-plywood'], 'produced-by': ['process.thread-rolling', 'process.cold-heading'], 'governed-by': ['screw.withdrawal'] });
  p.e('screw.self-tapping', 'component', 'A hardened screw that forms or cuts its mating thread in sheet metal or plastic.', { names: ['self-tapping screw', 'thread-forming screw'] });
  p.link('screw.self-tapping', { 'is-a': ['screw'], 'has-part': ['thread.self-tapping'], 'produced-by': ['process.heat-treatment.case-hardening'] });
  p.e('screw.lead', ['component', 'mechanism'], 'A power screw whose nut travels along it by its lead each turn: a transmission, not a fastener.', { names: ['lead screw', 'power screw'] });
  p.link('screw.lead', { 'has-part': ['thread.trapezoidal', 'nut.lead'], does: ['fn.convert.rotation.translation', 'fn.change.speed-ratio'], transforms: ['convert.rotational.translational'], 'governed-by': ['screw.force', 'screw.efficiency'], 'fails-by': ['failure.wear', 'failure.buckling', 'failure.backlash'], 'improved-by': [['screw.ball', 'rolling elements between screw and nut raise efficiency from 30 % to 90 %']], 'analogous-to': [['bio.bacterial-flagellum', 'a rotating helix driving translation through a medium']] });
  p.e('screw.ball', 'component', 'A lead screw with recirculating balls between screw and nut: high efficiency, backdrivable, preloadable.', { names: ['ball screw'] });
  p.link('screw.ball', { 'is-a': ['screw.lead'], 'has-part': ['bearing.ball', 'nut.ball'], 'governed-by': ['screw.efficiency', 'bearing.life.l10'] });
  p.e('screw.head', 'geometry', 'The part of a screw its driver bears on and its clamping face.');
  p.link('screw.head', { 'varies-by': ['param.head-geometry', 'param.drive-geometry'], 'fails-by': ['failure.cam-out', 'failure.head-shear'] });
  p.e('screw.shank', 'geometry', 'The unthreaded length between head and thread, in tension in the joint.');
  p.e('screw.point', 'geometry', 'The end of a screw: chamfered, cone, cup, dog, or self-drilling.');
  p.e('nut', ['component', 'manifold'], 'An internally threaded part a bolt is tightened against: the other half of the joint.', { params: [param('style', 'style', ISO4762, { values: ['hex', 'thin (jam)', 'nyloc', 'flanged', 'castle', 'wing', 'cap (acorn)', 'T-slot', 'weld', 'rivet (insert)', 'all-metal prevailing-torque'] })] });
  p.link('nut', { 'is-a': ['fastener'], 'has-part': ['thread.helix'], does: ['fn.clamp.axial'], 'connects-to': ['bolt', 'screw'], 'interacts-with': ['washer', 'bolt'], 'standardized-by': ['std.iso-4032'], 'made-of': ['steel.1018-cd', 'stainless.304', 'brass.c360'], 'produced-by': ['process.cold-heading', 'process.tapping', 'process.hot-forging'], 'fails-by': ['failure.thread-stripping', 'failure.loosening'], 'varies-by': ['param.size', 'param.nut-style', 'param.property-class'] });
  p.e('nut.lock', 'component', 'A nut that resists backing off: a nylon insert, a deformed thread, a serrated flange.', { names: ['lock nut', 'nyloc'] });
  p.link('nut.lock', { 'is-a': ['nut'], does: ['fn.prevent.loosening'], 'governed-by': ['friction.coulomb'] });
  p.e('washer', ['component', 'manifold'], 'A ring under a head or nut: spreads the load, protects the surface, gives a known friction face, or springs to hold preload.', { params: [param('style', 'style', ISO4762, { values: ['plain', 'spring (split)', 'Belleville (conical)', 'wave', 'tooth (star)', 'fender', 'sealing'] })] });
  p.link('washer', { 'is-a': ['fastener'], does: ['fn.spread.load', 'fn.prevent.loosening'], 'interacts-with': ['screw', 'nut', 'bolt'], 'standardized-by': ['std.iso-7089'], 'produced-by': ['process.stamping'], 'made-of': ['steel.1018-cd', 'stainless.304', 'polymer.nylon-microcarbon'], 'governed-by': ['stress.axial'] });
  p.e('washer.belleville', 'component', 'A conical spring washer: high force in little space, stackable in series or parallel.', { names: ['Belleville washer', 'disc spring'] });
  p.link('washer.belleville', { 'is-a': ['washer', 'spring'], does: ['fn.store.elastic'], 'governed-by': ['hooke', 'spring.energy'] });
  p.e('hole.tapped', ['geometry', 'interface'], 'An internal thread cut or formed in a part: the mate of a screw without a nut.', { names: ['tapped hole', 'threaded hole'] });
  p.link('hole.tapped', { 'has-part': ['thread.helix'], 'produced-by': ['tap', 'drill', 'process.thread-forming'], 'connects-to': ['screw'], 'fails-by': ['failure.thread-stripping'], 'governed-by': ['stress.axial'], requires: ['drill'] });
  p.e('hole.clearance', ['geometry', 'interface'], 'A hole a bolt passes through freely: medium series per ISO 273.', { names: ['clearance hole'], source: OBERG });
  p.link('hole.clearance', { 'produced-by': ['drill', 'process.punching'], 'connects-to': ['bolt'], 'standardized-by': ['std.iso-273'] });
  p.e('insert.threaded', 'component', 'A metal thread set into a weaker material: heat-set in plastic, helical coil (Helicoil) in aluminium, rivet nut in sheet.', { names: ['threaded insert', 'helicoil', 'rivnut'] });
  p.link('insert.threaded', { 'is-a': ['fastener'], 'has-part': ['thread.helix'], 'connects-to': ['screw'], 'interacts-with': ['polymer.nylon-microcarbon', 'aluminum.6061-t6', 'plate'], 'produced-by': ['process.cold-heading', 'process.coiling'] });
  p.e('thread-locker', ['chemical', 'component'], 'An anaerobic adhesive that cures in the thread clearance and holds the fastener against vibration.', { names: ['thread locking compound'] });
  p.link('thread-locker', { does: ['fn.prevent.loosening'], 'interacts-with': ['screw', 'nut'], 'is-a': ['adhesive'] });
  p.e('joint.bolted', ['subsystem', 'mechanism'], 'A bolt in tension and the parts in compression: the bolt sees only a fraction of an external load until the joint separates.', { names: ['bolted joint'] });
  p.link('joint.bolted', { 'has-part': ['bolt', 'nut', 'washer', 'hole.clearance'], does: ['fn.clamp.axial', 'fn.transmit.force'], 'governed-by': ['bolt.torque.nut-factor', 'stress.axial', 'friction.coulomb', 'fatigue.endurance.steel'], 'fails-by': ['failure.joint-separation', 'failure.slip', 'failure.fatigue', 'failure.loosening'], 'varies-by': ['param.preload', 'param.joint-stiffness', 'param.bolt-count'], 'in-view': ['view.mechanical'], 'improved-by': [['param.preload', 'a higher preload means a smaller share of the external load reaches the bolt']] });
  p.e('param.torque', 'parameter', 'The twist applied to a fastener, N m: what sets its preload through the nut factor.');
  p.e('param.preload', 'parameter', 'The tension left in a fastener after tightening, N: the joint\'s clamping force.');
  p.link('param.torque', { 'governed-by': ['bolt.torque.nut-factor'], 'interacts-with': ['param.preload', 'friction.coulomb'] });
  p.link('param.preload', { 'governed-by': ['bolt.torque.nut-factor', 'stress.axial'], 'measured-by': ['instrument.torque-wrench', 'instrument.ultrasonic-bolt-gauge'] });
  for (const id of ['param.size', 'param.pitch', 'param.length', 'param.head-geometry', 'param.drive-geometry', 'param.material', 'param.coating', 'param.property-class', 'param.joint-type', 'param.nut-style', 'param.joint-stiffness', 'param.bolt-count', 'param.thread-form', 'param.diameter', 'param.hand', 'param.starts', 'param.tolerance-class']) p.e(id, 'parameter', `A dimension of a fastener's variation space: its ${id.slice(6).replace(/-/g, ' ')}.`);
  for (const [id, says] of [['std.iso-68-1', 'ISO 68-1: basic profile of ISO general purpose metric screw threads.'], ['std.iso-261', 'ISO 261: general plan of metric screw threads.'], ['std.iso-273', 'ISO 273: clearance holes for bolts and screws.'], ['std.iso-898-1', 'ISO 898-1: property classes of steel bolts and screws (4.6 to 12.9).'], ['std.iso-4762', 'ISO 4762: hexagon socket head cap screws.'], ['std.iso-4014', 'ISO 4014: hexagon head bolts, product grades A and B.'], ['std.iso-4017', 'ISO 4017: hexagon head screws.'], ['std.iso-4032', 'ISO 4032: hexagon regular nuts.'], ['std.iso-4026', 'ISO 4026: hexagon socket set screws with flat point.'], ['std.iso-7089', 'ISO 7089: plain washers, normal series.'], ['std.din-912', 'DIN 912: socket head cap screws (the ISO 4762 predecessor).'], ['std.asme-b18', 'ASME B18: inch fasteners.'], ['std.asme-b1.1', 'ASME B1.1: unified inch screw threads.'], ['std.iso-281', 'ISO 281: dynamic load ratings and rating life of rolling bearings.'], ['std.iso-6336', 'ISO 6336: calculation of load capacity of spur and helical gears.'], ['std.agma-2001', 'AGMA 2001: fundamental rating factors for involute spur and helical gear teeth.']] as [string, string][]) p.e(id, 'standard', says, { source: { cite: says, kind: 'standard' } });
  p.e('std.iso-898-1', 'standard', 'ISO 898-1: property classes of steel bolts and screws, each a tensile strength and a yield ratio.', { source: ISO898, params: [param('class', 'property class', ISO898, { values: Object.keys(PROPERTY_CLASSES) })] });

  // failures
  const FAIL: [string, string, string[]][] = [
    ['failure.thread-stripping', 'The engaged threads shear before the bolt breaks: too few engaged threads, or a weak nut material.', ['stress.axial']],
    ['failure.fatigue', 'A crack grows under repeated load below the yield stress, at a stress raiser (a thread root, a fillet), until the section fails.', ['fatigue.endurance.steel']],
    ['failure.loosening', 'Vibration or transverse slip walks a fastener back, losing its preload.', ['friction.coulomb']],
    ['failure.overload', 'The load exceeds the part\'s strength: it yields, then breaks.', ['stress.axial', 'stress.von-mises']],
    ['failure.hydrogen-embrittlement', 'Hydrogen absorbed in plating or pickling makes a high-strength steel brittle: delayed fracture under static load, worst above class 10.9.', ['arrhenius']],
    ['failure.galvanic-corrosion', 'Two metals in contact in an electrolyte: the more active corrodes (zinc, aluminium) to protect the nobler (steel, stainless, copper).', ['nernst']],
    ['failure.corrosion', 'A metal reacts with its surroundings and is lost from the surface.', ['nernst']],
    ['failure.cam-out', 'A cross or slot drive climbs out of its recess under torque, rounding it.', ['friction.coulomb']],
    ['failure.cross-threading', 'A fastener started misaligned cuts across its mating thread.', []],
    ['failure.galling', 'Clean metal surfaces under pressure weld and tear: stainless on stainless, titanium.', ['friction.coulomb']],
    ['failure.slip', 'A friction-held joint moves under a transverse load larger than the friction capacity.', ['friction.coulomb']],
    ['failure.joint-separation', 'An external load exceeds the preload and the clamped faces part: the bolt now sees the whole load.', ['stress.axial']],
    ['failure.wear', 'Surfaces in relative motion lose material by abrasion, adhesion or fatigue of their asperities.', ['friction.coulomb']],
    ['failure.buckling', 'A slender compressed member bows sideways at a load below its crushing strength.', ['buckling.euler', 'buckling.johnson']],
    ['failure.backlash', 'Clearance between mating elements lets the output move without the input: lost motion.', []],
    ['failure.head-shear', 'The head shears off under tensile overload at the head-to-shank fillet.', ['stress.axial']],
    ['failure.shaft-marring', 'A set screw point gouges the shaft, raising a burr that stops the hub coming off.', []],
    ['failure.brinelling', 'Rolling elements dent a stationary raceway under impact or static overload.', ['young.contact']],
    ['failure.spalling', 'Rolling-contact fatigue flakes the raceway or tooth surface after enough cycles.', ['bearing.life.l10']],
    ['failure.pitting', 'Surface fatigue pits form on gear flanks under repeated Hertzian contact.', ['young.contact', 'gear.lewis']],
    ['failure.tooth-breakage', 'A gear tooth breaks at its root under bending.', ['gear.lewis', 'stress.bending']],
    ['failure.scuffing', 'Lubricant film breaks down and tooth flanks weld and tear.', ['friction.coulomb']],
    ['failure.creep', 'A material deforms slowly under a sustained stress, fast when warm (polymers at room temperature, metals above half their melting temperature).', ['arrhenius']],
    ['failure.relaxation', 'A spring or preloaded joint loses its force over time at stress or temperature.', ['arrhenius']],
    ['failure.resonance', 'A drive excites a natural frequency and the amplitude grows until something breaks.', ['natural.frequency']],
    ['failure.leak', 'A sealed boundary passes fluid: a worn lip, a scored shaft, a lost preload.', ['hydrostatic']],
    ['failure.cavitation', 'Local pressure falls below the vapour pressure, bubbles form and collapse, pitting surfaces.', ['bernoulli']],
    ['failure.belt-slip', 'A belt\'s friction grip on its pulley is exceeded and it slides.', ['capstan']],
    ['failure.chain-elongation', 'Chain pins and bushings wear and the pitch grows until the chain rides up the sprocket.', ['chain.pull']],
    ['failure.imbalance', 'A rotor\'s mass centre is off its axis: a once-per-revolution force that grows with speed squared.', ['centripetal']],
    ['failure.burst', 'A rotor or vessel exceeds its hoop strength and flies apart.', ['stress.hoop', 'flywheel.specific-energy']],
    ['failure.fretting', 'Small oscillating slip between clamped surfaces wears and cracks them.', ['friction.coulomb']],
  ];
  for (const [id, says, laws] of FAIL) { p.e(id, 'failure', says); if (laws.length) p.link(id, { 'governed-by': laws }); }

  // ---------------------------------------------------------------------------------------------- other joining elements
  p.e('rivet', 'component', 'A pin with a head, set by forming a second head: a permanent, shear-carrying joint in sheet and plate.', { params: [param('type', 'type', OBERG, { values: ['solid', 'blind (pop)', 'tubular', 'semi-tubular', 'drive', 'structural blind'] })] });
  p.link('rivet', { 'is-a': ['fastener'], does: ['fn.clamp.axial', 'fn.transmit.force'], 'produced-by': ['process.cold-heading'], 'interacts-with': ['plate', 'hole.clearance'], 'fails-by': ['failure.shear', 'failure.fatigue', 'failure.bearing-yield'], 'standardized-by': ['std.iso-14589'], 'made-of': ['aluminum.2024-t3', 'steel.1018-cd', 'copper.c110'], requires: ['process.riveting'], 'analogous-to': [['bio.suture', 'a joint formed in place that cannot be undone without destroying it']] });
  p.e('pin', ['component', 'manifold'], 'A plain cylinder in a hole: locates, hinges or shears to protect.', { params: [param('type', 'type', OBERG, { values: ['dowel', 'spring (roll)', 'taper', 'clevis', 'cotter (split)', 'grooved', 'shear'] })] });
  p.link('pin', { 'is-a': ['fastener'], does: ['fn.locate', 'fn.transmit.force'], 'interacts-with': ['hole.reamed'], 'produced-by': ['process.grinding', 'turn', 'process.stamping'], 'fails-by': ['failure.shear', 'failure.wear'], 'governed-by': ['stress.von-mises'] });
  p.e('pin.dowel', 'component', 'A hardened, ground pin in a reamed hole: the most precise location between parts.', { names: ['dowel pin'] });
  p.link('pin.dowel', { 'is-a': ['pin'], does: ['fn.locate'], 'produced-by': ['process.grinding', 'process.heat-treatment.quench-temper'], requires: ['hole.reamed'], 'made-of': ['steel.52100'] });
  p.e('pin.shear', 'component', 'A pin sized to break at a set load, protecting what it drives.', { names: ['shear pin'] });
  p.link('pin.shear', { 'is-a': ['pin'], does: ['fn.prevent.overload'], 'governed-by': ['stress.von-mises'] });
  p.e('hole.reamed', ['geometry', 'interface'], 'A hole finished to size and roundness by a reamer, for a dowel or bearing fit.');
  p.link('hole.reamed', { 'produced-by': ['process.reaming', 'drill'] });
  p.e('key', 'component', 'A bar in matching keyways of shaft and hub, carrying torque by shear and bearing.', { names: ['shaft key', 'parallel key', 'woodruff key'] });
  p.link('key', { does: ['fn.transmit.torque', 'fn.locate'], 'interacts-with': ['shaft', 'hub', 'keyway'], 'governed-by': ['stress.von-mises', 'torsion.solid'], 'fails-by': ['failure.shear', 'failure.bearing-yield', 'failure.fretting'], 'standardized-by': ['std.iso-773', 'std.din-6885'], 'produced-by': ['mill', 'process.key-stock'] });
  p.e('spline', ['geometry', 'interface'], 'Many keys cut into the shaft itself: torque over the whole circumference, with sliding allowed.');
  p.link('spline', { does: ['fn.transmit.torque', 'fn.guide.motion'], 'is-a': ['key'], 'produced-by': ['process.hobbing', 'process.broaching'], 'standardized-by': ['std.iso-14', 'std.din-5480'] });
  p.e('clamp.split', 'component', 'A bored hub slit and squeezed by a screw: holds a round body by friction without marring it.', { names: ['split clamp', 'clamp collar'] });
  p.link('clamp.split', { does: ['fn.locate', 'fn.transmit.torque'], 'governed-by': ['friction.coulomb', 'bolt.torque.nut-factor'], 'interacts-with': ['shaft', 'motor.dc'], 'produced-by': ['bore', 'split-clamp', 'drill', 'tap'], 'fails-by': ['failure.slip'] });
  p.e('fit.interference', ['interface', 'mechanism'], 'A shaft larger than its hole, pressed or shrunk in: the elastic hoop stress holds by friction.', { names: ['press fit', 'shrink fit'] });
  p.link('fit.interference', { does: ['fn.transmit.torque', 'fn.locate'], 'governed-by': ['stress.hoop', 'friction.coulomb', 'thermal.expansion'], 'produced-by': ['process.pressing', 'process.shrink-fitting'], 'fails-by': ['failure.slip', 'failure.fretting'], 'standardized-by': ['std.iso-286'] });
  p.e('adhesive', ['chemical', 'component'], 'A substance that joins surfaces by adhesion to each and cohesion in itself.', { names: ['glue'] });
  p.link('adhesive', { does: ['fn.clamp.axial', 'fn.seal'], 'produced-by': ['glue'], 'varies-by': ['param.cure', 'param.chemistry'], 'fails-by': ['failure.adhesive-failure', 'failure.cohesive-failure', 'failure.creep'], 'analogous-to': [['bio.mussel-byssus', 'a protein adhesive that cures under water'], ['bio.gecko-adhesion', 'adhesion by van der Waals forces over a hierarchy of hairs, reversible']] });

  // ---------------------------------------------------------------------------------------------- bearings
  p.e('bearing', ['component', 'manifold'], 'A part that lets one member turn or slide on another while carrying load, by rolling elements or a lubricant film.', { params: [param('type', 'type', HARRIS, { values: ['deep-groove ball', 'angular-contact ball', 'thrust ball', 'cylindrical roller', 'tapered roller', 'spherical roller', 'needle roller', 'plain (journal)', 'sleeve (bushing)', 'hydrodynamic', 'hydrostatic', 'aerostatic', 'magnetic', 'flexure'] }), param('d', 'bore', HARRIS, { unit: 'm', low: 0.001, high: 2 }), param('C', 'dynamic load rating', HARRIS, { unit: 'N' })] });
  p.link('bearing', { does: ['fn.support.rotation', 'fn.support.load'], plays: ['role.bearing-surface', 'role.wear-part'], 'governed-by': ['bearing.life.l10', 'bearing.life.hours', 'friction.coulomb', 'young.contact', 'reynolds'], 'fails-by': ['failure.spalling', 'failure.brinelling', 'failure.wear', 'failure.lubricant-starvation', 'failure.overheating'], 'interacts-with': ['shaft', 'housing', 'lubricant', 'seal'], 'standardized-by': ['std.iso-281', 'std.iso-15'], 'analogous-to': [['bio.synovial-joint', 'a hydrodynamic bearing: cartilage on cartilage with synovial fluid, friction coefficient about 0.002'], ['bio.bacterial-flagellar-motor', 'a rotary bearing of proteins at the nanometre scale']], 'in-view': ['view.mechanical'] });
  p.e('bearing.ball', 'component', 'Balls between two grooved races: low friction, radial and some axial load, speeds to tens of thousands of rpm.', { names: ['ball bearing', 'deep-groove ball bearing'] });
  p.link('bearing.ball', { 'is-a': ['bearing'], 'has-part': ['bearing.race', 'bearing.ball-element', 'bearing.cage', 'seal', 'lubricant'], 'made-of': ['steel.52100'], 'produced-by': ['process.forging', 'turn', 'process.heat-treatment.quench-temper', 'process.grinding', 'process.honing', 'process.assembly'], 'governed-by': ['bearing.life.l10', 'young.contact'] });
  p.e('bearing.roller', 'component', 'Rollers instead of balls: line contact, far more load, less speed.', { names: ['roller bearing', 'cylindrical roller bearing'] });
  p.link('bearing.roller', { 'is-a': ['bearing'], 'made-of': ['steel.52100'], 'governed-by': ['bearing.life.l10'] });
  p.e('bearing.tapered-roller', 'component', 'Rollers on a cone: radial and axial load together, set in opposed pairs with a preload (a car\'s wheel hubs).', { names: ['tapered roller bearing'] });
  p.link('bearing.tapered-roller', { 'is-a': ['bearing.roller'], requires: ['param.preload'] });
  p.e('bearing.needle', 'component', 'Long thin rollers: high load in a thin radial section.', { names: ['needle bearing'] });
  p.link('bearing.needle', { 'is-a': ['bearing.roller'] });
  p.e('bearing.plain', 'component', 'A shaft in a plain bore: sliding on a boundary film, a solid lubricant, or a full hydrodynamic film at speed.', { names: ['plain bearing', 'journal bearing', 'bushing', 'sleeve bearing'] });
  p.link('bearing.plain', { 'is-a': ['bearing'], 'made-of': ['brass.c360', 'material.bronze', 'material.ptfe', 'material.babbitt', 'material.oil-impregnated-bronze', 'polymer.nylon-microcarbon'], 'governed-by': ['reynolds', 'friction.coulomb'], 'produced-by': ['turn', 'bore', 'process.sintering', 'process.injection-molding'], 'fails-by': ['failure.wear', 'failure.seizure'], 'varies-by': ['param.pv-limit', 'param.clearance'] });
  p.e('bearing.hydrodynamic', 'mechanism', 'A converging wedge of lubricant dragged in by the moving surface builds a pressure that carries the load with no metal contact.', { names: ['hydrodynamic lubrication'] });
  p.link('bearing.hydrodynamic', { 'is-a': ['bearing.plain'], 'governed-by': ['reynolds', 'darcy-weisbach'], requires: ['lubricant', 'param.speed'], 'analogous-to': [['bio.synovial-joint', 'synovial fluid builds the same film']] });
  p.e('bearing.magnetic', 'mechanism', 'A rotor held in a magnetic field with no contact: no wear, needs active control or superconductors.', { names: ['magnetic bearing'] });
  p.link('bearing.magnetic', { 'is-a': ['bearing'], 'governed-by': ['magnetic.pull', 'lorentz.force'], requires: ['circuit.feedback-controller', 'sensor.position'], 'fails-by': ['failure.control-loss'] });
  p.e('bearing.flexure', 'mechanism', 'A thin elastic blade allowing rotation over a small angle with no friction or backlash.', { names: ['flexure bearing', 'flexure pivot'] });
  p.link('bearing.flexure', { 'is-a': ['bearing', 'spring'], 'governed-by': ['hooke', 'stress.bending', 'fatigue.endurance.steel'], 'analogous-to': [['bio.insect-wing-hinge', 'resilin, an elastic protein, stores and returns the wing stroke\'s energy']] });
  p.e('bearing.linear', 'component', 'Balls or a plain bush between a rod or rail and a carriage: translation with little friction.', { names: ['linear bearing', 'linear guide', 'linear rail'] });
  p.link('bearing.linear', { 'is-a': ['bearing'], does: ['fn.support.translation', 'fn.guide.motion'], 'interacts-with': ['rail', 'shaft'] });
  p.e('bearing.pillow-block', 'component', 'A bearing in a housing with mounting feet: a self-aligning bearing bolted to a frame.', { names: ['pillow block', 'hanger bearing'] });
  p.link('bearing.pillow-block', { 'is-a': ['bearing'], 'has-part': ['bearing.ball', 'housing', 'screw.set'], 'produced-by': ['process.casting.sand', 'bore', 'drill', 'process.assembly'], 'made-of': ['cast-iron.gray-30'] });
  p.e('bearing.race', 'component', 'The hardened, ground ring a rolling element runs on.');
  p.e('bearing.ball-element', 'component', 'A sphere ground and lapped to a micrometre, grade by grade.');
  p.e('bearing.cage', 'component', 'A retainer keeping rolling elements spaced so they do not rub each other.');
  p.link('bearing.race', { 'made-of': ['steel.52100'], 'produced-by': ['process.forging', 'turn', 'process.heat-treatment.quench-temper', 'process.grinding', 'process.honing'] });
  p.link('bearing.ball-element', { 'made-of': ['steel.52100', 'material.silicon-nitride'], 'produced-by': ['process.cold-heading', 'process.grinding', 'process.lapping'], 'standardized-by': ['std.iso-3290'] });
  p.link('bearing.cage', { 'made-of': ['steel.1018-cd', 'brass.c360', 'polymer.nylon-microcarbon'], 'produced-by': ['process.stamping', 'process.injection-molding'] });
  p.e('lubricant', ['chemical', 'material'], 'An oil or grease between surfaces: it separates them by a film, carries heat and wear away.', { names: ['oil', 'grease'] });
  p.link('lubricant', { does: ['fn.reduce.friction'], 'interacts-with': ['bearing', 'gear', 'seal'], 'varies-by': ['param.viscosity', 'param.base-oil', 'param.thickener'], 'governed-by': ['reynolds', 'arrhenius'], 'fails-by': ['failure.oxidation', 'failure.contamination'], 'analogous-to': [['bio.synovial-fluid', 'hyaluronan and lubricin lubricate joints']] });
  p.e('seal', ['component', 'manifold'], 'A barrier against fluid between parts, static or moving: lip, O-ring, mechanical face, labyrinth, gasket.', { params: [param('type', 'type', SHIGLEY, { values: ['O-ring', 'lip (rotary shaft)', 'mechanical face', 'labyrinth', 'gasket', 'piston ring', 'bellows', 'packing (gland)'] })] });
  p.link('seal', { does: ['fn.seal', 'fn.contain.pressure'], 'interacts-with': ['shaft', 'housing', 'lubricant', 'fluid'], 'made-of': ['rubber.natural', 'material.nitrile', 'material.fluoroelastomer', 'material.ptfe', 'material.silicone'], 'produced-by': ['process.compression-molding', 'process.injection-molding'], 'fails-by': ['failure.leak', 'failure.wear', 'failure.extrusion', 'failure.compression-set'], 'governed-by': ['hydrostatic', 'friction.coulomb'], 'standardized-by': ['std.iso-3601'], 'analogous-to': [['bio.sphincter', 'a muscular ring sealing a passage'], ['bio.cell-membrane', 'a lipid bilayer that seals a cell\'s contents while letting chosen things through']] });
  p.e('gasket', 'component', 'A compliant sheet between two static faces, squeezed by bolts to fill their roughness.');
  p.link('gasket', { 'is-a': ['seal'], requires: ['joint.bolted', 'param.preload'], 'made-of': ['rubber.natural', 'material.cork-rubber', 'material.graphite-sheet', 'copper.c110'] });

  // ---------------------------------------------------------------------------------------------- shafts, springs, gears
  p.e('shaft', ['component', 'manifold'], 'A rotating member carrying torque and bending between its bearings; a hub, gear or pulley is keyed, splined, clamped or pressed onto it.', { params: [param('d', 'diameter', SHIGLEY, { unit: 'm', low: 0.001, high: 1 }), param('L', 'length', SHIGLEY, { unit: 'm' })] });
  p.link('shaft', { does: ['fn.transmit.torque', 'fn.support.load'], 'has-part': ['keyway', 'shoulder', 'fillet'], 'governed-by': ['torsion.solid', 'stress.bending', 'shaft.diameter.static', 'fatigue.endurance.steel', 'natural.frequency', 'stress.von-mises'], 'made-of': ['steel.1018-cd', 'steel.4140-ann', 'stainless.304', 'aluminum.6061-t6', 'titanium.ti6al4v'], 'produced-by': ['turn', 'process.grinding', 'mill', 'process.heat-treatment.quench-temper', 'process.wire-drawing'], 'interacts-with': ['bearing', 'key', 'coupling', 'gear', 'pulley', 'seal'], 'fails-by': ['failure.fatigue', 'failure.resonance', 'failure.wear', 'failure.fretting'], 'varies-by': ['param.diameter', 'param.length', 'param.material', 'param.surface-finish'], 'standardized-by': ['std.iso-286'], plays: ['role.structural-member'], 'analogous-to': [['bio.long-bone', 'a hollow beam carrying bending and torsion, with the most material furthest from the axis']] });
  p.e('axle', 'component', 'A shaft that carries bending only: the wheels turn on it, or with it, but no torque passes along it.');
  p.link('axle', { 'is-a': ['shaft'], does: ['fn.support.load'], 'interacts-with': ['wheel', 'bearing'] });
  p.e('hub', 'component', 'The bore of a wheel, gear or pulley where it mounts on its shaft.');
  p.link('hub', { 'interacts-with': ['shaft', 'key', 'screw.set', 'fit.interference', 'clamp.split'], 'produced-by': ['bore', 'process.broaching'] });
  p.e('keyway', 'geometry', 'The slot a key sits in: a stress raiser on the shaft.');
  p.link('keyway', { 'produced-by': ['mill', 'process.broaching'], 'governed-by': ['fatigue.endurance.steel'] });
  p.e('shoulder', 'geometry', 'A step in a shaft that locates a bearing or hub axially.');
  p.e('fillet', 'geometry', 'The rounded corner at a step: its radius sets the stress concentration.');
  p.link('fillet', { 'governed-by': ['fatigue.endurance.steel'], 'improved-by': [['process.grinding', 'a smooth, round fillet lowers the stress concentration']] });

  p.e('spring', ['component', 'manifold', 'mechanism'], 'An elastic element that deflects under load and returns: stores energy, applies a force, absorbs a shock, measures a force.', { params: [param('type', 'type', SHIGLEY, { values: ['helical compression', 'helical extension', 'helical torsion', 'leaf', 'Belleville (disc)', 'wave', 'constant-force (spiral)', 'gas', 'torsion bar', 'elastomer'] }), param('k', 'rate', SHIGLEY, { unit: 'N/m' })] });
  p.link('spring', { does: ['fn.store.elastic', 'fn.transmit.force', 'fn.measure.force'], 'governed-by': ['hooke', 'spring.rate', 'spring.energy', 'spring.torsion.rate', 'torsion.solid', 'fatigue.endurance.steel'], 'made-of': ['steel.music-wire', 'stainless.304', 'material.phosphor-bronze', 'material.beryllium-copper', 'titanium.ti6al4v', 'rubber.natural', 'composite.gfrp'], 'produced-by': ['process.coiling', 'process.heat-treatment.stress-relief', 'process.shot-peening', 'process.wire-drawing'], 'fails-by': ['failure.fatigue', 'failure.relaxation', 'failure.buckling', 'failure.resonance'], 'varies-by': ['param.wire-diameter', 'param.coil-diameter', 'param.active-coils', 'param.free-length', 'param.material'], 'interacts-with': ['shaft', 'cam', 'valve', 'damper'], 'standardized-by': ['std.din-2095', 'std.en-13906'], 'analogous-to': [['bio.tendon', 'collagen storing and returning stride energy'], ['bio.resilin', 'an elastic protein in insect hinges'], ['bio.cartilage', 'a compliant cushion between bones']], 'in-view': ['view.mechanical'] });
  p.e('spring.helical-compression', 'component', 'Round wire coiled and squeezed along its axis: the wire is in torsion.', { names: ['compression spring', 'coil spring'] });
  p.link('spring.helical-compression', { 'is-a': ['spring', 'spring.helical'], 'governed-by': ['spring.rate', 'torsion.solid'] });
  p.e('spring.helical-extension', 'component', 'A coil spring with end hooks, pulled along its axis, often wound with initial tension.', { names: ['extension spring'] });
  p.link('spring.helical-extension', { 'is-a': ['spring'], 'fails-by': ['failure.hook-fatigue'] });
  p.e('spring.torsion', 'component', 'A coil spring loaded by a moment about its axis: the wire is in bending.', { names: ['torsion spring'] });
  p.link('spring.torsion', { 'is-a': ['spring'], 'governed-by': ['spring.torsion.rate', 'stress.bending'] });
  p.e('spring.leaf', 'component', 'A stack of flat strips in bending: a vehicle axle spring that also locates the axle.', { names: ['leaf spring'] });
  p.link('spring.leaf', { 'is-a': ['spring'], 'governed-by': ['stress.bending', 'beam.cantilever.point'], 'interacts-with': ['axle', 'vehicle.chassis'] });
  p.e('spring.gas', 'component', 'Gas compressed in a cylinder by a piston rod: a near-constant force over its stroke.', { names: ['gas spring', 'gas strut'] });
  p.link('spring.gas', { 'is-a': ['spring'], 'has-part': ['cylinder.pneumatic', 'piston', 'seal'], 'governed-by': ['gas.isothermal-work', 'hydrostatic'] });
  p.e('damper', 'component', 'A device that resists motion with a force proportional to velocity, turning vibration into heat.', { names: ['shock absorber', 'dashpot'] });
  p.link('damper', { does: ['fn.dissipate.motion'], 'governed-by': ['darcy-weisbach', 'natural.frequency'], 'has-part': ['piston', 'cylinder.hydraulic', 'valve', 'seal', 'fluid.hydraulic'], 'interacts-with': ['spring'], 'fails-by': ['failure.leak', 'failure.overheating'], 'analogous-to': [['bio.intervertebral-disc', 'a viscoelastic cushion'], ['bio.muscle-eccentric', 'muscle lengthening under load dissipates energy']] });

  p.e('gear', ['component', 'manifold'], 'A toothed wheel meshing with another: torque and speed exchanged in a fixed ratio by rolling-sliding contact of involute teeth.', { params: [param('type', 'type', SHIGLEY, { values: ['spur', 'helical', 'double helical (herringbone)', 'bevel (straight, spiral)', 'hypoid', 'worm and wheel', 'rack and pinion', 'internal (ring)', 'planetary set', 'harmonic (strain wave)', 'cycloidal'] }), param('m', 'module', SHIGLEY, { unit: 'm', low: 0.0002, high: 0.05 }), param('z', 'tooth count', SHIGLEY, { low: 6, high: 400 }), param('alpha', 'pressure angle', SHIGLEY, { unit: 'deg', values: ['14.5', '20', '25'] })] });
  p.link('gear', { does: ['fn.change.speed-ratio', 'fn.transmit.torque', 'fn.change.axis'], 'has-part': ['gear.tooth', 'hub', 'gear.rim'], 'governed-by': ['gear.output.torque', 'gear.lewis', 'young.contact', 'power.rotary', 'friction.coulomb'], 'made-of': ['steel.4140-ann', 'steel.1018-cd', 'cast-iron.gray-30', 'brass.c360', 'polymer.nylon-microcarbon', 'material.acetal', 'material.sintered-steel'], 'produced-by': ['process.hobbing', 'process.shaping', 'process.broaching', 'process.grinding', 'process.injection-molding', 'process.sintering', 'process.heat-treatment.case-hardening', 'mill'], 'fails-by': ['failure.tooth-breakage', 'failure.pitting', 'failure.scuffing', 'failure.wear', 'failure.backlash'], 'interacts-with': ['shaft', 'bearing', 'lubricant', 'key'], 'standardized-by': ['std.iso-6336', 'std.agma-2001', 'std.iso-1328'], 'varies-by': ['param.module', 'param.tooth-count', 'param.pressure-angle', 'param.face-width', 'param.helix-angle'], 'in-view': ['view.mechanical'], 'analogous-to': [['bio.issus-gear', 'the planthopper nymph Issus has interlocking gear teeth on its hind legs that synchronise its jump (Burrows & Sutton 2013)']] });
  p.e('gear.spur', 'component', 'Straight teeth parallel to the axis: simple, noisy, no axial thrust.', { names: ['spur gear'] });
  p.e('gear.helical', 'component', 'Teeth cut at an angle: smoother, quieter, more teeth in contact, an axial thrust to carry.', { names: ['helical gear'] });
  p.e('gear.bevel', 'component', 'Teeth on a cone: shafts that meet at an angle, usually 90°.', { names: ['bevel gear'] });
  p.e('gear.worm', 'component', 'A screw driving a wheel: large ratio in one stage, sliding contact, often self-locking.', { names: ['worm gear', 'worm drive'] });
  p.e('gear.rack', 'component', 'A gear of infinite radius: rotation into translation along a bar.', { names: ['rack and pinion'] });
  p.e('gear.planetary', ['subsystem', 'mechanism'], 'A sun, planets on a carrier and a ring: coaxial, compact, high torque, three members to drive or hold.', { names: ['planetary gear', 'epicyclic gear'] });
  p.e('gear.harmonic', ['subsystem', 'mechanism'], 'A flexible toothed cup deformed by an elliptical wave generator inside a rigid ring: zero backlash, ratios of 50 to 160, a robot joint\'s reducer.', { names: ['harmonic drive', 'strain wave gear'] });
  p.e('gear.cycloidal', ['subsystem', 'mechanism'], 'A lobed disc rolling eccentrically inside pins: high ratio, high shock capacity, low backlash.', { names: ['cycloidal drive'] });
  p.each(['gear.spur', 'gear.helical', 'gear.bevel', 'gear.worm', 'gear.rack', 'gear.planetary', 'gear.harmonic', 'gear.cycloidal'], { 'is-a': ['gear'] });
  p.link('gear.helical', { 'interacts-with': ['bearing.tapered-roller'] });
  p.link('gear.worm', { 'governed-by': ['screw.efficiency', 'friction.coulomb'], 'made-of': ['material.bronze', 'steel.4140-ann'], 'fails-by': ['failure.wear', 'failure.overheating'] });
  p.link('gear.rack', { does: ['fn.convert.rotation.translation'], transforms: ['convert.rotational.translational'] });
  p.link('gear.planetary', { 'has-part': ['gear.spur', 'gear.carrier', 'gear.ring'] });
  p.link('gear.harmonic', { 'has-part': ['gear.flexspline', 'gear.wave-generator', 'gear.ring'], 'governed-by': ['hooke', 'fatigue.endurance.steel'], 'interacts-with': ['robot.joint'] });
  p.e('gear.tooth', 'geometry', 'An involute profile: the line of action is straight, so the ratio stays constant through the mesh.');
  p.link('gear.tooth', { 'governed-by': ['gear.lewis', 'young.contact'], 'fails-by': ['failure.tooth-breakage', 'failure.pitting'] });
  p.e('gearhead', ['component', 'subsystem'], 'A gear train in a housing bolted to a motor\'s face: speed down, torque up, by its ratio and efficiency.', { names: ['gearbox', 'gear reducer', 'speed reducer'] });
  p.link('gearhead', { 'is-a': ['gear.planetary'], does: ['fn.change.speed-ratio'], 'has-part': ['gear', 'shaft', 'bearing', 'housing', 'seal', 'lubricant'], 'interacts-with': ['motor.dc', 'coupling'], 'governed-by': ['gear.output.torque', 'power.rotary'], 'fails-by': ['failure.tooth-breakage', 'failure.overheating', 'failure.backlash'] });

  // ---------------------------------------------------------------------------------------------- belts, chains, couplings, clutches, brakes
  p.e('belt', ['component', 'manifold'], 'A flexible loop running over pulleys: torque between shafts by friction (flat, V) or by teeth (synchronous).', { params: [param('type', 'type', SHIGLEY, { values: ['flat', 'V', 'poly-V (serpentine)', 'synchronous (timing)', 'round'] })] });
  p.link('belt', { does: ['fn.transmit.torque', 'fn.change.speed-ratio', 'fn.change.axis'], 'governed-by': ['capstan', 'belt.speed', 'friction.coulomb', 'power.rotary'], 'interacts-with': ['pulley', 'tensioner', 'shaft'], 'made-of': ['rubber.natural', 'material.polyurethane', 'material.neoprene', 'material.aramid-cord', 'steel.music-wire'], 'produced-by': ['process.compression-molding', 'process.extrusion', 'process.lamination'], 'fails-by': ['failure.belt-slip', 'failure.fatigue', 'failure.wear', 'failure.tooth-skipping'], 'varies-by': ['param.width', 'param.pitch', 'param.length', 'param.material'], 'standardized-by': ['std.iso-4184', 'std.iso-5296'], 'analogous-to': [['bio.tendon-over-pulley', 'a tendon running over a bony groove redirects muscle force, as a belt over an idler']] });
  p.e('belt.timing', 'component', 'A toothed belt on toothed pulleys: no slip, exact phase, the drive of 3D printers and camshafts.', { names: ['timing belt', 'synchronous belt', 'GT2 belt'] });
  p.link('belt.timing', { 'is-a': ['belt'], 'interacts-with': ['pulley.toothed', 'printer.3d', 'engine.camshaft'], 'fails-by': ['failure.tooth-skipping'] });
  p.e('pulley', 'component', 'A wheel a belt or rope runs over: grooved, flat, toothed, or an idler.');
  p.link('pulley', { 'interacts-with': ['belt', 'rope', 'shaft', 'bearing'], does: ['fn.change.axis', 'fn.change.speed-ratio'], 'produced-by': ['turn', 'process.die-casting', 'process.injection-molding', 'process.stamping'], 'made-of': ['aluminum.6061-t6', 'cast-iron.gray-30', 'steel.1018-cd', 'polymer.nylon-microcarbon'] });
  p.e('pulley.toothed', 'component', 'A pulley with teeth for a synchronous belt.', { names: ['timing pulley'] });
  p.link('pulley.toothed', { 'is-a': ['pulley'] });
  p.e('tensioner', 'component', 'A sprung idler keeping a belt or chain taut as it wears and warms.');
  p.link('tensioner', { 'has-part': ['pulley', 'spring', 'bearing'], 'interacts-with': ['belt', 'chain'] });
  p.e('chain', ['component', 'manifold'], 'Links on pins running over sprockets: torque between shafts with no slip, at higher load and lower speed than a belt.', { names: ['roller chain'], params: [param('pitch', 'pitch', OBERG, { unit: 'm', values: ['0.00635', '0.009525', '0.0127', '0.015875', '0.01905', '0.0254'] })] });
  p.link('chain', { does: ['fn.transmit.torque', 'fn.change.speed-ratio'], 'has-part': ['chain.link', 'chain.pin', 'chain.bushing', 'chain.roller'], 'governed-by': ['chain.speed', 'chain.pull', 'friction.coulomb'], 'interacts-with': ['sprocket', 'lubricant', 'tensioner'], 'made-of': ['steel.1018-cd', 'stainless.304'], 'produced-by': ['process.stamping', 'process.cold-heading', 'process.heat-treatment.case-hardening', 'process.assembly'], 'fails-by': ['failure.chain-elongation', 'failure.fatigue', 'failure.wear'], 'standardized-by': ['std.iso-606', 'std.ansi-b29.1'] });
  p.e('sprocket', 'component', 'A toothed wheel a chain engages.');
  p.link('sprocket', { 'interacts-with': ['chain', 'shaft'], 'produced-by': ['process.laser-cutting', 'process.hobbing', 'process.stamping'], 'made-of': ['steel.1018-cd'] });
  p.e('coupling', ['component', 'manifold'], 'A connection between two shafts in line: rigid, or flexible to take up misalignment and shock.', { params: [param('type', 'type', SHIGLEY, { values: ['rigid sleeve', 'rigid flange', 'jaw (elastomer spider)', 'beam (helical)', 'bellows', 'disc', 'Oldham', 'universal (Cardan)', 'constant-velocity', 'gear', 'fluid', 'magnetic'] })] });
  p.link('coupling', { does: ['fn.couple.shafts', 'fn.transmit.torque'], 'interacts-with': ['shaft', 'motor.dc', 'screw.lead'], 'governed-by': ['torsion.solid', 'power.rotary', 'natural.frequency'], 'fails-by': ['failure.fatigue', 'failure.wear', 'failure.misalignment'], 'varies-by': ['param.bore', 'param.torque-rating', 'param.misalignment-allowed', 'param.torsional-stiffness'], 'made-of': ['aluminum.6061-t6', 'stainless.304', 'steel.1018-cd', 'material.polyurethane'], 'produced-by': ['turn', 'process.laser-cutting', 'process.injection-molding', 'process.edm'] });
  p.e('coupling.universal', 'component', 'Two yokes on a cross: shafts at an angle, speed fluctuating twice per turn unless paired.', { names: ['universal joint', 'Cardan joint', 'U-joint'] });
  p.link('coupling.universal', { 'is-a': ['coupling'], 'has-part': ['bearing.needle', 'pin'], 'interacts-with': ['vehicle.driveshaft'] });
  p.e('coupling.cv', 'component', 'A constant-velocity joint: balls in curved grooves keep the output speed steady through an angle, a front-wheel drive\'s half shaft.', { names: ['CV joint'] });
  p.link('coupling.cv', { 'is-a': ['coupling'], 'has-part': ['bearing.ball-element', 'seal', 'lubricant'], 'fails-by': ['failure.leak', 'failure.wear'] });
  p.e('clutch', ['component', 'mechanism'], 'A coupling that can be engaged and disengaged: friction plates pressed together, or a one-way sprag, or a magnetic field.', { params: [param('type', 'type', SHIGLEY, { values: ['friction plate', 'cone', 'centrifugal', 'one-way (sprag, roller)', 'electromagnetic', 'dog', 'fluid', 'slip (torque limiter)'] })] });
  p.link('clutch', { does: ['fn.engage.disengage', 'fn.transmit.torque', 'fn.prevent.overload'], 'governed-by': ['friction.coulomb', 'power.rotary', 'joule'], 'has-part': ['clutch.plate', 'spring', 'actuator'], 'fails-by': ['failure.wear', 'failure.overheating', 'failure.slip'], 'interacts-with': ['shaft', 'gearhead', 'engine'], 'made-of': ['material.friction-lining', 'steel.1018-cd'] });
  p.e('brake', ['component', 'mechanism'], 'A clutch to ground: kinetic energy into heat by friction (disc, drum), or by eddy currents, or back into a battery.', { params: [param('type', 'type', SHIGLEY, { values: ['disc (caliper)', 'drum', 'band', 'eddy-current', 'regenerative', 'hydraulic retarder', 'parking (spring-applied)'] })] });
  p.link('brake', { does: ['fn.dissipate.motion', 'fn.locate'], 'governed-by': ['friction.coulomb', 'energy.kinetic', 'joule', 'braking.distance', 'heat.capacity'], 'has-part': ['brake.disc', 'brake.pad', 'brake.caliper', 'piston', 'fluid.hydraulic'], 'fails-by': ['failure.wear', 'failure.overheating', 'failure.fade', 'failure.leak'], 'made-of': ['cast-iron.gray-30', 'material.friction-lining', 'composite.carbon-ceramic'], 'interacts-with': ['wheel', 'vehicle', 'eddy-brake'], 'analogous-to': [['bio.muscle-eccentric', 'antagonist muscles brake a limb by lengthening under load']] });
  p.e('brake.eddy-current', 'mechanism', 'A conductor moving through a magnetic field has currents induced in it whose field opposes the motion: a brake with no contact and no wear, weak at low speed.', { names: ['eddy-current brake'] });
  p.link('brake.eddy-current', { 'is-a': ['brake'], 'governed-by': ['lorentz.force', 'skin.depth', 'joule'], requires: ['magnet', 'copper.c110'], 'produced-by': ['eddy-brake'] });

  // ---------------------------------------------------------------------------------------------- cams, linkages, joints
  p.e('cam', ['component', 'mechanism'], 'A profiled rotating part whose surface drives a follower through a programmed displacement each turn.', { params: [param('type', 'type', SHIGLEY, { values: ['plate (disc)', 'cylindrical (barrel)', 'face', 'linear'] }), param('follower', 'follower', SHIGLEY, { values: ['knife', 'flat', 'roller', 'spherical'] })] });
  p.link('cam', { does: ['fn.program.motion', 'fn.convert.rotation.translation'], 'has-part': ['cam.profile', 'cam.follower', 'spring'], 'governed-by': ['young.contact', 'friction.coulomb', 'newton.second'], 'fails-by': ['failure.wear', 'failure.pitting', 'failure.follower-jump'], 'produced-by': ['mill', 'process.grinding', 'process.heat-treatment.case-hardening'], 'interacts-with': ['engine.camshaft', 'valve', 'spring'], 'analogous-to': [['bio.heart-valve', 'a profile-driven opening and closing each cycle']] });
  p.e('linkage', ['mechanism', 'manifold'], 'Rigid links joined by pins or sliders: a four-bar turns rotation into oscillation, a slider-crank into a stroke, a pantograph scales a path.', { params: [param('type', 'type', SHIGLEY, { values: ['four-bar', 'slider-crank', 'Scotch yoke', 'pantograph', 'Watt', 'Chebyshev', 'Peaucellier', 'toggle', 'Geneva', 'ratchet and pawl'] })] });
  p.link('linkage', { does: ['fn.convert.rotation.translation', 'fn.program.motion', 'fn.change.speed-ratio', 'fn.transmit.force'], 'has-part': ['link', 'joint.revolute', 'joint.prismatic'], 'governed-by': ['newton.second', 'power.rotary', 'grashof'], 'fails-by': ['failure.wear', 'failure.backlash', 'failure.buckling', 'failure.dead-point'], 'analogous-to': [['bio.four-bar-jaw', 'the jaws of many fish and the knee of a horse are four-bar linkages'], ['bio.insect-leg', 'a chain of revolute joints driven by antagonist muscles']] });
  p.e('linkage.slider-crank', 'mechanism', 'A crank, a connecting rod and a slider: the piston engine\'s mechanism, and a compressor\'s.', { names: ['slider-crank', 'crank mechanism'] });
  p.link('linkage.slider-crank', { 'is-a': ['linkage'], 'has-part': ['crankshaft', 'connecting-rod', 'piston'], 'interacts-with': ['engine.internal-combustion', 'compressor.piston', 'pump.piston'] });
  p.e('joint.revolute', ['interface', 'mechanism'], 'One rotational degree of freedom between two bodies: a pin in a bore, a bearing.', { names: ['revolute joint', 'hinge', 'pin joint'] });
  p.e('joint.prismatic', ['interface', 'mechanism'], 'One translational degree of freedom: a slider on a guide.', { names: ['prismatic joint', 'slider'] });
  p.e('joint.spherical', ['interface', 'mechanism'], 'Three rotational degrees of freedom: a ball in a socket.', { names: ['spherical joint', 'ball joint', 'rod end'] });
  p.e('joint.universal', ['interface', 'mechanism'], 'Two rotational degrees of freedom: a cross between two yokes.');
  p.each(['joint.revolute', 'joint.prismatic', 'joint.spherical', 'joint.universal'], { 'is-a': ['joint.kinematic'], 'has-part': ['bearing'], 'in-view': ['view.mechanical', 'view.kinematic'] });
  p.e('joint.kinematic', ['interface', 'manifold'], 'A connection between two bodies that leaves some degrees of freedom and takes the rest: the vocabulary of every mechanism.', { names: ['kinematic pair'] });
  p.link('joint.kinematic', { 'varies-by': ['param.degrees-of-freedom'], 'governed-by': ['grubler'], 'analogous-to': [['bio.synovial-joint', 'hinge (elbow), pivot (radioulnar), ball-and-socket (hip), saddle (thumb), condyloid (wrist), plane (carpals)']] });
  p.link('joint.revolute', { 'analogous-to': [['bio.elbow', 'a hinge joint of bone, cartilage and ligament']], 'produced-by': ['hinge'] });
  p.link('joint.spherical', { 'analogous-to': [['bio.hip-joint', 'a ball-and-socket joint']], 'produced-by': ['ball'] });
  p.link('joint.prismatic', { 'produced-by': ['slider'], 'has-part': ['bearing.linear'] });
  p.e('hinge', ['component'], 'Two leaves on a pin: a revolute joint for doors, lids and flaps.');
  p.link('hinge', { 'is-a': ['joint.revolute'], 'produced-by': ['process.stamping', 'process.assembly'], 'made-of': ['steel.1018-cd', 'brass.c360', 'stainless.304'] });
  p.e('actuator.linear', ['component', 'mechanism'], 'A device giving a stroke on command: a motor on a lead screw, a hydraulic or pneumatic cylinder, a solenoid, a voice coil, a piezo stack, a muscle.', { names: ['linear actuator'] });
  p.link('actuator.linear', { does: ['fn.convert.rotation.translation', 'fn.transmit.force'], plays: ['role.actuator', 'role.control-target'], 'has-part': ['motor.dc', 'screw.lead', 'bearing.linear', 'housing', 'sensor.position'], 'analogous-to': [['bio.skeletal-muscle', 'a linear actuator that only pulls, 100 to 300 kPa, strain 20 to 40 %']], 'in-view': ['view.mechanical', 'view.control'] });

  // ---------------------------------------------------------------------------------------------- fluid machines
  p.e('valve', ['component', 'manifold'], 'A part that opens, closes or throttles a fluid passage: a gate, globe, ball, butterfly, needle, check, relief, solenoid or poppet.', { params: [param('type', 'type', OBERG, { values: ['gate', 'globe', 'ball', 'butterfly', 'needle', 'check (non-return)', 'relief (safety)', 'solenoid', 'poppet', 'spool', 'diaphragm', 'pinch'] })] });
  p.link('valve', { does: ['fn.control.flow', 'fn.contain.pressure', 'fn.prevent.backflow'], 'has-part': ['valve.body', 'valve.seat', 'valve.stem', 'seal', 'spring', 'actuator'], 'governed-by': ['bernoulli', 'darcy-weisbach', 'hydrostatic'], 'fails-by': ['failure.leak', 'failure.cavitation', 'failure.wear', 'failure.sticking'], 'made-of': ['brass.c360', 'stainless.316', 'cast-iron.gray-30', 'material.pvc', 'material.ptfe'], 'produced-by': ['process.casting.sand', 'process.forging', 'turn', 'mill', 'process.injection-molding'], 'interacts-with': ['pipe', 'pump', 'cylinder.hydraulic', 'fluid'], 'analogous-to': [['bio.heart-valve', 'a passive check valve of collagen leaflets'], ['bio.venous-valve', 'check valves along the veins'], ['bio.stomata', 'guard cells throttling gas exchange in a leaf']], 'in-view': ['view.fluid'] });
  p.e('piston', 'component', 'A disc sealed in a cylinder: pressure on its face becomes force on its rod, or the reverse.');
  p.link('piston', { does: ['fn.transmit.force', 'fn.contain.pressure'], transforms: ['convert.pneumatic.translational'], 'has-part': ['seal', 'piston.ring', 'piston.rod'], 'interacts-with': ['cylinder.hydraulic', 'cylinder.pneumatic', 'connecting-rod', 'crankshaft'], 'governed-by': ['hydrostatic', 'friction.coulomb'], 'fails-by': ['failure.leak', 'failure.wear', 'failure.seizure'], 'made-of': ['aluminum.6061-t6', 'cast-iron.gray-30', 'steel.1018-cd'], 'produced-by': ['process.forging', 'process.casting.die', 'turn', 'process.grinding'] });
  p.e('cylinder.hydraulic', ['component', 'mechanism'], 'A piston in a tube driven by oil: force equal to pressure times area, to tens of tonnes.', { names: ['hydraulic cylinder', 'hydraulic ram'] });
  p.e('cylinder.pneumatic', ['component', 'mechanism'], 'A piston driven by compressed air: fast, light, compliant, a tenth of a hydraulic cylinder\'s force.', { names: ['pneumatic cylinder', 'air cylinder'] });
  p.each(['cylinder.hydraulic', 'cylinder.pneumatic'], { 'is-a': ['actuator.linear'], 'has-part': ['piston', 'seal', 'cylinder.barrel', 'piston.rod', 'valve'], 'governed-by': ['hydrostatic', 'power.linear'], 'fails-by': ['failure.leak', 'failure.buckling'], 'made-of': ['steel.1018-cd', 'aluminum.6061-t6', 'stainless.304'], 'produced-by': ['process.honing', 'turn', 'process.hard-chrome-plating'] });
  p.link('cylinder.hydraulic', { requires: ['pump.hydraulic', 'fluid.hydraulic', 'valve'], 'interacts-with': ['machine.excavator', 'machine.press'] });
  p.link('cylinder.pneumatic', { requires: ['compressor', 'valve'], 'interacts-with': ['robot.gripper'] });
  p.e('pump', ['component', 'manifold'], 'A machine that raises a fluid\'s pressure or moves it: positive displacement (gear, piston, diaphragm, screw, peristaltic) or dynamic (centrifugal, axial).', { params: [param('type', 'type', OBERG, { values: ['centrifugal', 'axial', 'gear', 'piston', 'diaphragm', 'screw', 'peristaltic', 'vane', 'lobe'] })] });
  p.link('pump', { does: ['fn.move.fluid'], transforms: ['convert.rotational.hydraulic'], plays: ['role.energy-converter'], 'governed-by': ['bernoulli', 'power.linear', 'darcy-weisbach', 'hydrostatic'], 'has-part': ['impeller', 'housing', 'shaft', 'bearing', 'seal', 'motor.dc'], 'fails-by': ['failure.cavitation', 'failure.leak', 'failure.wear', 'failure.dry-running'], 'interacts-with': ['pipe', 'valve', 'fluid'], 'analogous-to': [['bio.heart', 'a positive-displacement pump of muscle with check valves'], ['bio.cilia', 'beating hairs moving fluid along a surface']], 'in-view': ['view.fluid'] });
  p.e('pump.centrifugal', 'component', 'An impeller flinging fluid outward: head from velocity, continuous flow, no valves.', { names: ['centrifugal pump'] });
  p.link('pump.centrifugal', { 'is-a': ['pump'], 'has-part': ['impeller', 'volute'], 'governed-by': ['bernoulli', 'centripetal'] });
  p.e('pump.piston', 'component', 'A piston drawing and pushing fluid through check valves: high pressure, pulsing flow.', { names: ['piston pump', 'reciprocating pump'] });
  p.link('pump.piston', { 'is-a': ['pump'], 'has-part': ['piston', 'valve', 'linkage.slider-crank'], 'analogous-to': [['bio.heart', 'the same cycle: fill, close the inlet, compress, open the outlet']] });
  p.e('pump.hydraulic', 'component', 'A pump for oil at 100 to 350 bar: gear, vane or axial piston.', { names: ['hydraulic pump'] });
  p.link('pump.hydraulic', { 'is-a': ['pump'] });
  p.e('compressor', ['component', 'manifold'], 'A pump for gas: piston, screw, scroll, centrifugal, axial.', { names: ['air compressor'] });
  p.link('compressor', { 'is-a': ['pump'], does: ['fn.move.fluid', 'fn.contain.pressure'], transforms: ['convert.electrical.pneumatic'], 'governed-by': ['gas.isothermal-work', 'carnot'], 'fails-by': ['failure.overheating', 'failure.wear', 'failure.leak'], 'has-part': ['piston', 'valve', 'cylinder.pneumatic', 'motor.dc', 'vessel.cylindrical'] });
  p.e('fan', 'component', 'A rotor moving air at low pressure rise: axial for volume, centrifugal for pressure.', { names: ['blower'] });
  p.link('fan', { 'is-a': ['pump'], does: ['fn.move.fluid', 'fn.cool'], 'has-part': ['impeller', 'motor.dc', 'bearing', 'housing'], 'governed-by': ['bernoulli', 'thrust.ideal-static', 'convection'], 'made-of': ['polymer.nylon-microcarbon', 'aluminum.6061-t6', 'steel.1018-cd'], 'produced-by': ['process.injection-molding', 'process.die-casting', 'process.stamping'], 'fails-by': ['failure.imbalance', 'failure.wear', 'failure.resonance'] });
  p.e('turbine', ['component', 'manifold'], 'A rotor taking work out of a moving or expanding fluid: steam, gas, water, wind.', { params: [param('type', 'type', OBERG, { values: ['steam (impulse, reaction)', 'gas', 'hydraulic (Pelton, Francis, Kaplan)', 'wind (horizontal, vertical axis)', 'tidal'] })] });
  p.link('turbine', { does: ['fn.extract.fluid-energy'], transforms: ['convert.hydraulic.rotational', 'convert.thermal.rotational'], plays: ['role.energy-converter', 'role.rotational-source'], 'governed-by': ['bernoulli', 'carnot', 'thrust.ideal-static', 'power.rotary', 'betz'], 'has-part': ['turbine.blade', 'turbine.rotor', 'shaft', 'bearing', 'housing', 'turbine.nozzle'], 'fails-by': ['failure.fatigue', 'failure.creep', 'failure.cavitation', 'failure.burst', 'failure.erosion'], 'made-of': ['material.nickel-superalloy', 'stainless.316', 'composite.gfrp', 'titanium.ti6al4v'], 'produced-by': ['process.casting.investment', 'process.forging', 'mill', 'process.lamination'], 'interacts-with': ['generator', 'compressor', 'engine.gas-turbine'] });
  p.e('impeller', 'component', 'The bladed rotor of a pump, fan or compressor that gives the fluid its energy.');
  p.link('impeller', { 'governed-by': ['bernoulli', 'centripetal'], 'fails-by': ['failure.cavitation', 'failure.imbalance', 'failure.erosion'], 'produced-by': ['process.casting.investment', 'mill', 'process.injection-molding'] });
  p.e('propeller', 'component', 'Blades on a hub screwing through a fluid: thrust from momentum given to the fluid, in air or water.');
  p.link('propeller', { does: ['fn.move.fluid'], transforms: ['convert.rotational.travel'], 'governed-by': ['thrust.ideal-static', 'bernoulli', 'drag.aero'], 'fails-by': ['failure.cavitation', 'failure.fatigue', 'failure.imbalance'], 'made-of': ['aluminum.6061-t6', 'material.bronze', 'composite.cfrp', 'wood.birch-plywood'], 'produced-by': ['process.casting.sand', 'mill', 'process.injection-molding', 'process.lamination'], 'interacts-with': ['motor.dc', 'engine.internal-combustion', 'vehicle.drone', 'vehicle.ship'], 'analogous-to': [['bio.bacterial-flagellum', 'a rotating helix making thrust'], ['bio.fish-tail', 'oscillating foils make thrust by the same momentum exchange']] });

  // ---------------------------------------------------------------------------------------------- wheels, frames, mounts
  p.e('wheel', ['component', 'manifold'], 'A disc or spoked ring turning on an axle, carrying a load over a surface by rolling.', { params: [param('d', 'diameter', SHIGLEY, { unit: 'm', low: 0.01, high: 4 })] });
  p.link('wheel', { does: ['fn.roll', 'fn.support.load'], transforms: ['convert.rotational.travel'], 'has-part': ['rim', 'tyre', 'hub', 'spoke', 'bearing'], 'governed-by': ['rolling.resistance', 'traction.limit', 'wheel.torque', 'friction.coulomb', 'inertia.disc'], 'fails-by': ['failure.fatigue', 'failure.imbalance', 'failure.wear', 'failure.puncture'], 'interacts-with': ['axle', 'brake', 'tyre', 'ground', 'bearing'], 'made-of': ['steel.1018-cd', 'aluminum.6061-t6', 'polymer.nylon-microcarbon', 'rubber.natural', 'wood.birch-plywood'], 'produced-by': ['process.casting.die', 'process.forging', 'process.stamping', 'process.injection-molding', 'process.spinning'], 'analogous-to': [['bio.rolling-organisms', 'a few animals roll (the pangolin, the wheel spider) but no organism grows a free-turning wheel: a wheel needs a bearing and nothing can feed it across the gap']] });
  p.e('rim', 'component', 'The outer ring of a wheel the tyre seats on.');
  p.e('tyre', 'component', 'A rubber ring, pneumatic or solid, giving grip, cushioning and a contact patch.', { names: ['tire'] });
  p.link('tyre', { does: ['fn.transmit.force', 'fn.store.elastic'], 'governed-by': ['friction.coulomb', 'rolling.resistance', 'traction.limit', 'hydrostatic'], 'made-of': ['rubber.natural', 'material.synthetic-rubber', 'steel.music-wire', 'material.aramid-cord'], 'produced-by': ['process.compression-molding', 'process.vulcanization', 'process.lamination'], 'fails-by': ['failure.puncture', 'failure.wear', 'failure.hydroplaning'], 'has-part': ['tyre.tread', 'tyre.belt', 'tyre.bead'] });
  p.e('track', 'component', 'A continuous belt of plates over wheels: a vehicle lays its own road, low ground pressure.', { names: ['continuous track', 'caterpillar track'] });
  p.link('track', { does: ['fn.roll', 'fn.support.load'], transforms: ['convert.rotational.travel'], 'has-part': ['track.link', 'sprocket', 'idler', 'roller'], 'governed-by': ['traction.limit', 'friction.coulomb'], 'interacts-with': ['ground'], 'analogous-to': [['bio.caterpillar-locomotion', 'a wave of contact travelling along a body']] });
  p.e('frame', ['component', 'subsystem'], 'The structure everything else mounts to: beams, tubes, plates or castings joined into a stiff whole.', { names: ['chassis', 'structure'] });
  p.link('frame', { does: ['fn.support.load', 'fn.locate'], plays: ['role.structural-member'], 'has-part': ['beam.i', 'tube.square', 'plate', 'bracket', 'joint.bolted', 'weld'], 'governed-by': ['stress.bending', 'buckling.euler', 'natural.frequency', 'beam.simply-supported.udl'], 'made-of': ['steel.a36', 'aluminum.6061-t6', 'composite.cfrp', 'wood.douglas-fir'], 'produced-by': ['weld.mig', 'saw', 'drill', 'process.laser-cutting', 'process.extrusion', 'process.assembly'], 'fails-by': ['failure.fatigue', 'failure.buckling', 'failure.resonance', 'failure.corrosion'], 'analogous-to': [['bio.skeleton', 'an endoskeleton of bone carrying load and locating muscles'], ['bio.exoskeleton', 'an arthropod\'s chitin shell: structure outside, muscle inside']], 'in-view': ['view.mechanical'] });
  p.e('bracket', 'component', 'A bent or machined piece that holds one part to another at an angle.');
  p.link('bracket', { does: ['fn.locate', 'fn.support.load'], 'produced-by': ['bend', 'process.laser-cutting', 'process.stamping', 'mill', 'process.injection-molding'], 'made-of': ['steel.1018-cd', 'aluminum.6061-t6', 'polymer.nylon-microcarbon'], 'interacts-with': ['screw', 'frame'] });
  p.e('mount', 'component', 'A fixing that carries a part on a frame, often through an elastomer to isolate vibration.', { names: ['vibration mount', 'engine mount'] });
  p.link('mount', { does: ['fn.locate', 'fn.isolate.vibration'], 'has-part': ['rubber.natural', 'screw', 'bracket'], 'governed-by': ['natural.frequency', 'hooke'] });
  p.e('housing', 'component', 'The enclosure a mechanism runs in: locates its bearings, holds its lubricant, keeps dirt out.', { names: ['casing', 'enclosure'] });
  p.link('housing', { does: ['fn.locate', 'fn.contain.pressure', 'fn.isolate'], 'produced-by': ['process.casting.sand', 'process.casting.die', 'process.injection-molding', 'mill', 'bend'], 'made-of': ['cast-iron.gray-30', 'aluminum.6061-t6', 'polymer.nylon-microcarbon', 'steel.1018-cd'], 'interacts-with': ['bearing', 'seal', 'screw'] });

  // ---------------------------------------------------------------------------------------------- deep expansions (the deep path)
  p.deep('screw', 'variants', (q) => {
    for (const [size, t] of Object.entries(METRIC_COARSE)) {
      q.e(`screw.iso-${size.toLowerCase()}`, 'component', `An ISO metric ${size} screw: ${(t.d * 1000).toFixed(1)} mm diameter, ${(t.P * 1000).toFixed(2)} mm pitch.`, { source: ISO68, depth: 2 });
      q.link(`screw.iso-${size.toLowerCase()}`, { 'is-a': ['screw'], 'has-part': ['thread.iso-metric'], 'connects-to': [`nut.iso-${size.toLowerCase()}`] }, ISO68);
      q.e(`nut.iso-${size.toLowerCase()}`, 'component', `An ISO ${size} hexagon nut.`, { source: ISO4762, depth: 2 });
      q.link(`nut.iso-${size.toLowerCase()}`, { 'is-a': ['nut'] }, ISO4762);
    }
    for (const [cls, c] of Object.entries(PROPERTY_CLASSES)) {
      q.e(`class.${cls}`, 'standard', `Property class ${cls}: ${(c.Rm / 1e6).toFixed(0)} MPa tensile, ${(c.Rp / 1e6).toFixed(0)} MPa yield (ISO 898-1).`, { source: ISO898, depth: 2 });
      q.link(`class.${cls}`, { 'standardized-by': ['std.iso-898-1'] }, ISO898);
      q.link('screw', { 'varies-by': [`class.${cls}`] }, ISO898);
    }
  });
  p.deep('bearing', 'variants', (q) => {
    for (const [id, says] of [['bearing.6000-series', 'ISO 15 deep-groove ball bearings, dimension series 10: 10 mm bore up.'], ['bearing.6200-series', 'ISO 15 deep-groove ball bearings, dimension series 02: 10 to 100 mm bore, the stock bearing.'], ['bearing.608', 'The 8 × 22 × 7 mm skate bearing: the most made bearing in the world.'], ['bearing.angular-contact', 'Races offset so the balls carry axial load one way; paired for both.'], ['bearing.thrust', 'Balls or rollers between two washers: axial load only.'], ['bearing.spherical-roller', 'Barrel rollers in a spherical outer race: heavy load, self-aligning.']] as [string, string][]) {
      q.e(id, 'component', says, { source: HARRIS, depth: 2 });
      q.link(id, { 'is-a': ['bearing.ball'] }, HARRIS);
    }
  });
  return p;
}
