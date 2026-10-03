// The bridge: everything the ganglia already hold as structured, sourced data enters the substrate as entities and
// relations with provenance "derived from <module>": laws, materials with their numbers, the catalogue's datasheets,
// archetypes, ways, processes, part kinds, connectors, the storage manifolds, servos, motors and batteries. Nothing is
// restated by hand; the substrate reads it, so one source of truth stays one.
import { LAWS } from '../laws';
import { MATERIALS } from '../../data/materials';
import { CATALOG } from '../parts';
import { PROCESSES } from '../processes';
import { familyOfWord } from './seeds/materials';
import { ARCHETYPES } from '../blocks';
import { WAYS } from '../ways';
import { PART_KINDS } from '../../parts/registry';
import { CONNECTOR_KINDS } from '../../connectors/registry';
import { MANIFOLDS } from '../manifold/manifolds';
import { SERVOS } from '../../data/servos';
import { MOTORS, GEARHEADS } from '../../data/motors';
import { BATTERIES } from '../../data/batteries';
import type { Entity, Kind, Parameter, Provenance, Relation } from './model';
import { coverageFrom, Substrate } from './substrate';

const D = (module: string): Provenance => ({ derived: `src/${module}` });

function ent(id: string, kinds: Kind[], name: string, says: string, domains: string[], source: Provenance, params?: Parameter[], names: string[] = []): Entity {
  return { id, name, names: [name, ...names], kinds, domains, says, params, source, coverage: coverageFrom(source, 2) };
}
const rel = (from: string, kind: Relation['kind'], to: string, source: Provenance, says?: string): Relation => ({ from, kind, to, source, confidence: 0.9, says });

/** Property roles a stocked material earns by its numbers (the rule, with its threshold, is the provenance). */
function rolesByNumbers(m: (typeof MATERIALS)[number]): [string, string][] {
  const out: [string, string][] = [];
  if (m.conductivity >= 1e7) out.push(['role.electrical-conductor', `conductivity ${m.conductivity.toExponential(1)} S/m ≥ 1e7`]);
  if (m.conductivity >= 1e7 && m.density <= 9000) out.push(['role.thermal-conductor', 'the metals that conduct electricity best conduct heat best (Wiedemann-Franz)']);
  if (m.yield >= 200e6) out.push(['role.structural-member', `yield ${(m.yield / 1e6).toFixed(0)} MPa ≥ 200 MPa`]);
  if (m.ferromagnetic) out.push(['role.magnetic-core', 'ferromagnetic']);
  if (m.conductivity > 0 && m.conductivity < 1e-6) out.push(['role.insulator', `conductivity ${m.conductivity.toExponential(1)} S/m`]);
  if (m.elongation >= 0.1 && m.yield > 0) out.push(['role.formable', `elongation ${(m.elongation * 100).toFixed(0)} % ≥ 10 %`]);
  if (m.yield > 0 && m.density > 0 && m.yield / m.density >= 100e3) out.push(['role.light-structure', `yield over density ${(m.yield / m.density / 1e3).toFixed(0)} kJ/kg ≥ 100`]);
  if (m.friction > 0 && m.friction <= 0.3 && m.yield > 0) out.push(['role.bearing-surface', `friction coefficient ${m.friction} ≤ 0.3`]);
  return out;
}

/** Read every structured source into the substrate. */
/** The bridge's ways (how a thing is done) as refinements of the packs' functions (what is done), where a function names it. */
/** What the blocks no way embodies do, by the packs' functions: a conductor conducts, a coupling couples, a bolt clamps. */
export const BLOCK_FUNCTIONS: Record<string, string[]> = { 'power.conduct': ['fn.conduct.current'], 'transmission.couple': ['fn.couple.shafts', 'fn.transmit.torque'], 'support.rotate': ['fn.support.rotation', 'fn.support.load'], 'structure.member': ['fn.support.load'], 'fasten.bolt': ['fn.clamp.axial', 'fn.transmit.force'], 'protect.fuse': ['fn.protect.overcurrent'], 'connection.two-force': ['fn.transmit.force'], 'transmission.shaft': ['fn.transmit.torque', 'fn.support.load'], 'material.print': ['fn.support.load'], 'protect.guard': ['fn.isolate'] };

/** What a datasheet says a catalogue part is made of, by family: the label names the grade, this names the material. */
export const CATALOG_MATERIALS: Record<string, string[]> = {
  'hollow section': ['material.steel'], bolt: ['material.steel'], 'roller chain': ['material.steel'], bearing: ['steel.52100'], 'pillow block': ['cast-iron.gray-30', 'steel.52100'],
  'rod end': ['material.steel'], 'lead screw': ['material.steel', 'material.bronze'], coupling: ['material.aluminium-alloy', 'material.steel'], gearhead: ['material.steel'],
  wire: ['copper.c110', 'material.pvc'], fuse: ['element.zinc', 'polymer.nylon66'], 'motor controller': ['material.semiconductor', 'substrate.fr4'], 'dc motor': ['steel.electrical', 'copper.c110', 'material.ferrite-hard'],
};
export const CATALOG_MATERIAL_BY_ID: Record<string, string[]> = { 'filament.nylon-microcarbon': ['polymer.nylon-microcarbon'], 'fibre.carbon-continuous': ['material.carbon'], 'fibre.carbon-continuous-fr': ['material.carbon'] };

export const WAY_FUNCTIONS: Record<string, string[]> = {
  'motor.rotary': ['fn.actuate.electromagnetic', 'fn.transmit.torque'], 'motor.hub': ['fn.actuate.electromagnetic', 'fn.roll'], 'motor.linear': ['fn.actuate.electromagnetic', 'fn.move'], 'voice-coil': ['fn.actuate.electromagnetic', 'fn.move'], solenoid: ['fn.actuate.electromagnetic'],
  piezo: ['fn.move'], electrostatic: ['fn.move'], 'thermal.actuator': ['fn.move'], 'ion.thruster': ['fn.move'], 'joule.heating': ['fn.heat'], combustion: ['fn.heat'], muscle: ['fn.transmit.force', 'fn.move'],
  'light.emit': ['fn.emit.light'], bioluminescence: ['fn.emit.light'], 'sense.light': ['fn.detect.light', 'fn.sense'], 'sense.sound': ['fn.sense'], 'sense.strain': ['fn.measure.force', 'fn.sense'], 'sense.thermocouple': ['fn.sense'], 'sense.encoder': ['fn.sense'],
  'switch.transistor': ['fn.switch'], 'logic.transistor': ['fn.compute'], 'logic.relay': ['fn.compute'], 'logic.mechanical': ['fn.compute'],
  'gear.reduce': ['fn.change.speed-ratio', 'fn.transmit.torque'], 'chain.drive': ['fn.transmit.torque', 'fn.change.speed-ratio'], 'belt.drive': ['fn.transmit.torque', 'fn.change.speed-ratio'],
  wheel: ['fn.roll', 'fn.support.load'], track: ['fn.roll', 'fn.spread.load'], legs: ['fn.move'], propeller: ['fn.move.fluid'], paddle: ['fn.move.fluid'], winch: ['fn.transmit.force'], 'rack.pinion': ['fn.convert.rotation.translation'], 'lead.screw': ['fn.convert.rotation.translation'],
};

export function bridge(s: Substrate): void {
  for (const l of LAWS) s.add(ent(l.id, ['law'], l.name, l.statement, ['physics'], l.source, l.inputs.map((q) => ({ sym: q.sym, name: q.name, unit: q.unit, of: l.source }))));
  // materials, with their numbers as parameters and roles by rule
  const ms = D('data/materials.ts');
  for (const m of MATERIALS) {
    const params: Parameter[] = [
      { sym: 'rho', name: 'density', unit: 'kg/m^3', low: m.density, high: m.density, of: ms }, { sym: 'E', name: 'Young\'s modulus', unit: 'Pa', low: m.E, high: m.E, of: ms },
      { sym: 'sigma_y', name: 'yield strength', unit: 'Pa', low: m.yield, high: m.yield, of: ms }, { sym: 'sigma_u', name: 'ultimate strength', unit: 'Pa', low: m.ultimate, high: m.ultimate, of: ms },
      { sym: 'eps', name: 'elongation at break', unit: '-', low: m.elongation, high: m.elongation, of: ms }, { sym: 'sigma', name: 'electrical conductivity', unit: 'S/m', low: m.conductivity, high: m.conductivity, of: ms },
      { sym: 'mu', name: 'friction coefficient', unit: '-', low: m.friction, high: m.friction, of: ms },
    ];
    s.add(ent(m.id, ['material'], m.name, `${m.name}: ${m.category}, ${m.density} kg/m³, yield ${(m.yield / 1e6).toFixed(0)} MPa, E ${(m.E / 1e9).toFixed(0)} GPa${m.conductivity >= 1e6 ? `, ${m.conductivity.toExponential(1)} S/m` : ''}.`, ['materials'], ms, params));
    for (const prop of ['prop.density', 'prop.youngs-modulus', 'prop.yield-strength', 'prop.tensile-strength', 'prop.elongation', 'prop.electrical-conductivity']) s.relate(rel(m.id, 'has-property', prop, ms));
    for (const [role, why] of rolesByNumbers(m)) s.relate(rel(m.id, 'plays', role, { derived: `data/materials.ts: ${why}` }, why));
    for (const law of ['hooke', 'stress.axial']) s.relate(rel(m.id, 'governed-by', law, ms));
    if (m.ductile) s.relate(rel(m.id, 'governed-by', 'fatigue.endurance.steel', ms)); else s.relate(rel(m.id, 'governed-by', 'griffith', ms));
  }
  for (const [id, says] of [['role.formable', 'Bends or draws without cracking.'], ['role.light-structure', 'Carries load at low mass: yield over density high.']] as [string, string][]) s.add(ent(id, ['role'], id.slice(5).replace(/-/g, ' '), says, ['materials'], ms));
  // archetypes: component manifolds with ports, laws and principles
  const bs = D('ganglia/blocks.ts');
  for (const a of ARCHETYPES) {
    s.add(ent(`block.${a.id}`, ['component', 'manifold'], a.name, `${a.does} (${a.category}; takes ${a.takes.join(', ')}, gives ${a.gives.join(', ')}).`, ['engineering'], a.insideSource, undefined));
    for (const l of a.laws) s.relate(rel(`block.${a.id}`, 'governed-by', l, bs));
    for (const fn of BLOCK_FUNCTIONS[a.id] ?? []) s.relate(rel(`block.${a.id}`, 'does', fn, bs, 'the block\'s function, said by the bridge'));
    for (const f of a.families) for (const c of CATALOG.filter((x) => x.family === f)) s.relate(rel(c.id, 'is-a', `block.${a.id}`, bs, `catalogue family ${f}`));
    for (const piece of a.inside) { const pid = `block.${a.id}.${piece.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`; s.add(ent(pid, ['component'], piece.name, piece.does, ['engineering'], a.insideSource)); s.relate(rel(`block.${a.id}`, 'has-part', pid, bs)); if (piece.law) s.relate(rel(pid, 'governed-by', piece.law, bs)); for (const m of piece.material ? [piece.material].flat() : []) s.relate(rel(pid, 'made-of', familyOfWord(m) ?? m, bs, Array.isArray(piece.material) ? 'one of the materials it may be' : undefined)); if (piece.kind) s.relate(rel(pid, 'is-a', piece.kind, bs, 'the block says what kind of thing its piece is')); for (const fn of piece.fn ?? []) s.relate(rel(pid, 'does', fn, bs, 'the block says what its piece does')); }
    for (const flow of a.takes) s.relate(rel(`block.${a.id}`, 'requires', `flow.${flow}`, bs));
    for (const flow of a.gives) s.relate(rel(`block.${a.id}`, 'enables', `flow.${flow}`, bs));
  }
  for (const flow of ['electric', 'rotation', 'translation', 'travel', 'load', 'signal', 'heat', 'stock', 'chemical', 'light', 'sound']) s.add(ent(`flow.${flow}`, ['signal'], flow, `The flow ${flow}, as blocks exchange it (Pahl & Beitz).`, ['engineering'], bs));
  // the catalogue: datasheets as realisations
  const cs = D('ganglia/parts.ts');
  for (const c of CATALOG) s.add(ent(c.id, ['component'], c.label, `${c.label} (${c.family}): ${Object.entries(c.specs).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(', ')}.`, ['catalogue'], c.source, Object.entries(c.specs).filter(([, v]) => typeof v === 'number').map(([k, v]) => ({ sym: k, name: k, low: v as number, high: v as number, of: c.source })), c.tags));
  for (const c of CATALOG) s.relate(rel(c.id, 'standardized-by', 'std.maker-datasheet', cs, 'its maker\'s published data'));
  for (const c of CATALOG) for (const m of CATALOG_MATERIAL_BY_ID[c.id] ?? CATALOG_MATERIALS[c.family] ?? []) s.relate(rel(c.id, 'made-of', m, c.source, 'what its datasheet says it is made of'));
  s.add(ent('std.maker-datasheet', ['standard'], 'maker\'s datasheet', 'What a maker publishes of a part: the only numbers a bought part has.', ['catalogue'], cs));
  // ways: transformations with the laws they run by and the blocks that embody them
  const ws = D('ganglia/ways.ts');
  for (const w of WAYS) {
    s.add(ent(`way.${w.id}`, ['transformation', 'mechanism'], w.name, `${w.effect} (${w.range})${w.against ? `; pushes against the ${w.against}` : ''}.`, ['engineering'], w.source));
    for (const l of w.laws) s.relate(rel(`way.${w.id}`, 'governed-by', l, ws));
    for (const b of w.embodiedBy) s.relate(rel(`block.${b}`, 'does', `way.${w.id}`, ws, 'embodies the way'));
    // the way is a refinement of the packs' function where one names it: implementations of the function then see the blocks
    for (const fn of WAY_FUNCTIONS[w.id] ?? []) s.relate(rel(`way.${w.id}`, 'is-a', fn, ws, 'the function this way is a way of'));
    for (const t of w.takes) s.relate(rel(`way.${w.id}`, 'requires', `flow.${t}`, ws));
    for (const g of w.gives) s.relate(rel(`way.${w.id}`, 'enables', `flow.${g}`, ws));
  }
  // processes
  const ps = D('ganglia/processes.ts');
  for (const pr of PROCESSES) {
    // a process's tags are search words, never its names: 'steel' on MIG welding must not make steel a weld
    s.add(ent(pr.id, ['process', 'constructor'], pr.name, `${pr.makes}. Limits: ${pr.limits.join('; ')}.`, ['manufacturing'], pr.source));
    for (const m of pr.materials) s.relate(rel(pr.id, 'interacts-with', familyOfWord(m) ?? m, ps, 'works this material'));
    for (const t of pr.tools) { const tid = `tool.${t.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`; s.add(ent(tid, ['constructor', 'thing'], t, `A tool: ${t}.`, ['manufacturing'], pr.source)); s.relate(rel(pr.id, 'requires', tid, ps)); }
    for (const l of pr.uses?.laws ?? []) s.relate(rel(pr.id, 'governed-by', l, ps));
    s.relate(rel(pr.id, 'plays', 'role.constructor', ps));
    s.relate(rel(pr.id, 'in-view', 'view.available-here', ps, 'a process this world can run'));
  }
  s.add(ent('view.available-here', ['architecture'], 'available here', 'What this world can run or place now: the processes of processes.ts and the part kinds of the registry.', ['engineering'], ps));
  // part kinds: geometry families the world can place
  const ks = D('parts/registry.ts');
  for (const k of PART_KINDS) {
    s.add(ent(`kind.${k.id}`, ['geometry', 'manifold'], k.label, `A part kind this world places: ${k.label} (${k.category}), varying by ${k.params.map((p) => p.key).join(', ')}.`, ['engineering'], ks, k.params.filter((p) => 'min' in p).map((p) => ({ sym: p.key, name: p.label, low: (p as { min: number }).min, high: (p as { max: number }).max, of: ks }))));
    s.relate(rel(`kind.${k.id}`, 'made-of', k.defaultMaterial, ks, 'its default material'));
    s.relate(rel(`kind.${k.id}`, 'in-view', 'view.available-here', ks));
    if (k.bought) for (const c of k.bought.accepts) s.relate(rel(`kind.${k.id}`, 'connects-to', `joint.${c}`, ks, 'a joint its maker allows'));
  }
  for (const [kind, name] of [['block', 'block'], ['plate', 'plate'], ['rod.round', 'rod.round'], ['rod.square', 'rod.square'], ['tube.round', 'tube.round'], ['tube.square', 'tube.square'], ['beam.i', 'beam.i'], ['angle', 'angle'], ['disc', 'disc'], ['wheel', 'wheel'], ['motor.dc', 'motor.dc'], ['battery', 'battery'], ['servo', 'servo'], ['controller', 'controller'], ['receiver', 'receiver'], ['lumber', 'lumber']]) if (s.has(name) && s.has(`kind.${kind}`)) s.relate(rel(name, 'in-view', 'view.available-here', ks, `placeable as kind ${kind}`));
  // connectors: the interfaces the world can make
  const cks = D('connectors/registry.ts');
  for (const c of CONNECTOR_KINDS) {
    s.add(ent(`joint.${c.id}`, ['interface', 'mechanism'], c.label, `A joint this world makes: ${c.label} (${c.category}, model ${c.model}).`, ['engineering'], cks));
    s.relate(rel(`joint.${c.id}`, 'in-view', 'view.available-here', cks));
  }
  for (const [j, e] of [['bolted', 'joint.bolted'], ['screwed', 'screw'], ['riveted', 'rivet'], ['glued', 'adhesive'], ['bearing', 'bearing'], ['hinge', 'joint.revolute'], ['ball', 'joint.spherical'], ['slider', 'joint.prismatic'], ['motor', 'motor.electric'], ['servo', 'servo'], ['wire', 'wire'], ['spring', 'spring'], ['rope', 'rope'], ['clamp', 'clamp.split'], ['weld', 'process.welding'], ['soldered', 'solder'], ['nailed', 'nail'], ['eddy-brake', 'brake.eddy-current']]) if (`joint.${j}` !== e) s.relate(rel(`joint.${j}`, 'is-a', e, cks, 'the engineering thing this joint realises'));
  // the storage manifolds
  const mfs = D('ganglia/manifold/manifolds.ts');
  for (const m of MANIFOLDS) {
    s.add(ent(m.id, ['manifold', m.transformation ? 'transformation' : m.level === 'mechanism' ? 'mechanism' : m.level === 'behavior' ? 'behavior' : m.level === 'function' ? 'function' : m.level === 'architecture' ? 'architecture' : 'component'], m.name, `${m.name} (${m.level}${m.mechanism ? `, ${m.mechanism}` : ''}${m.domain ? `, ${m.domain}` : ''}): ${m.invariants[0] ?? ''}`, ['engineering', 'energy'], m.source, m.parameters.map((p) => ({ sym: p.sym, name: p.name, unit: p.unit, low: p.low, high: p.high, of: p.of })), m.names ?? []));
    if (m.parent && !m.transformation) s.relate(rel(m.id, 'is-a', m.parent, mfs, 'refinement in the engineering language'));
    for (const l of m.laws) s.relate(rel(m.id, 'governed-by', l, mfs));
    for (const r of m.realizations ?? []) s.relate(rel(r, 'is-a', m.id, mfs, 'a stocked realisation'));
    if (m.transformation) { s.relate(rel(m.id, 'transforms', `domain.${m.transformation.from}`, mfs)); s.relate(rel(m.id, 'enables', `domain.${m.transformation.to}`, mfs)); }
    if (m.mechanism && m.level !== 'transformation') s.relate(rel(m.id, 'does', 'store.energy', mfs, 'a mechanism of storing energy'));
  }
  for (const d of ['electrical', 'rotational', 'translational', 'elastic', 'pneumatic', 'hydraulic', 'thermal', 'chemical', 'gravitational', 'electrostatic', 'magnetic', 'optical', 'informational']) s.add(ent(`domain.${d}`, ['signal'], d, `The ${d} domain of energy.`, ['engineering'], mfs));
  // datasheets: servos, motors, gearheads, batteries
  const ss = D('data/servos.ts');
  for (const sv of Object.values(SERVOS)) { s.add(ent(sv.id, ['component'], sv.label, sv.source, ['catalogue'], { cite: sv.source, kind: 'maker' }, [{ sym: 'T', name: 'stall torque', unit: 'N m', low: sv.stallTorque, high: sv.stallTorque, of: ss }, { sym: 'V', name: 'rated voltage', unit: 'V', low: sv.V, high: sv.V, of: ss }, { sym: 'm', name: 'mass', unit: 'kg', low: sv.mass, high: sv.mass, of: ss }])); s.relate(rel(sv.id, 'is-a', 'servo', ss)); }
  for (const sv of Object.values(SERVOS)) for (const m of (/metal gears|steel gears/.test(sv.label) ? ['material.steel', 'polymer.nylon66', 'copper.c110'] : ['polymer.nylon66', 'copper.c110'])) s.relate(rel(sv.id, 'made-of', m, ss, 'what its datasheet says it is made of: a plastic case and gear train, steel gears in the larger classes, a copper-wound motor'));
  const mos = D('data/motors.ts');
  for (const md of Object.values(MOTORS)) { s.add(ent(md.id, ['component'], md.label, md.source, ['catalogue'], { cite: md.source, kind: 'maker' }, [{ sym: 'V', name: 'nominal voltage', unit: 'V', low: md.V, high: md.V, of: mos }, { sym: 'm', name: 'mass', unit: 'kg', low: md.mass, high: md.mass, of: mos }])); s.relate(rel(md.id, 'is-a', 'motor.dc', mos)); s.relate(rel(md.id, 'is-a', 'convert.electrical.rotational', mos, 'a stocked realisation')); }
  for (const g of Object.values(GEARHEADS)) { s.add(ent(g.id, ['component'], g.label, `${g.label}: ratio ${g.ratio}, efficiency ${g.efficiency}.`, ['catalogue'], { cite: g.source, kind: 'maker' })); s.relate(rel(g.id, 'is-a', 'gearhead', mos)); for (const f of g.fits) s.relate(rel(g.id, 'connects-to', f, mos, 'made to fit')); }
  const bts = D('data/batteries.ts');
  for (const b of Object.values(BATTERIES)) { s.add(ent(b.id, ['component'], b.label, b.source, ['catalogue'], { cite: b.source, kind: 'maker' }, [{ sym: 'V', name: 'nominal voltage', unit: 'V', low: b.V, high: b.V, of: bts }, { sym: 'm', name: 'mass', unit: 'kg', low: b.mass, high: b.mass, of: bts }])); s.relate(rel(b.id, 'is-a', 'battery', bts)); s.relate(rel(b.id, 'is-a', b.chemistry === 'nimh' ? 'cell.nimh' : 'cell.lead-acid', bts)); }
}
