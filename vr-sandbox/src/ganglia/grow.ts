// Growing a machine, the way an organism grows. Biology does not draw a body; it carries a short genome and develops
// it, cell calling for cell, every tissue there because something needed it, every level checked by an immune system,
// built in an order, and the fittest of many variations kept. A machine is grown the same way:
//
//   genome       what is wanted (one flow into another) and the few numbers that size it: a short text, hashed
//   seed         a concept: a chain of physical ways that does the job (ways.ts), each done by a building block
//   development  each block calls for the blocks it can't work without, and says by which principle: a motor calls
//                for a controller that limits its current, a battery for a fuse at its terminal, a wheel for an axle
//                of its own, an axle for bearings, bearings for a frame to carry their load to the ground
//   embodiment   each block becomes a real part: chosen from the catalogue, or made from the world's stock
//   immunity     every level is checked: each connection (blocks.ts checkDesign), each part bought or made (rule
//                R11: catalogued, or a process that works its material and shape), energy from a source (R10)
//   order        the developmental order it is put together in: frame first, power last
//   selection    every buildable concept is grown and the fittest kept; the others stay, with what each trades
//
// The levels are biology's too (LEVELS): material is molecule, a feature made by one process a cell, a part tissue,
// a block an organ, a system an organ system, the machine the organism. And each level is a whole at its own scale:
// a block opened up (blocks.ts `inside`) is a system; a machine seen whole is one block (ways.ts `asWhole`).

import { archetypeById, checkDesign, designFromPowertrain, type Archetype, type Flow, type Problem } from './blocks';
import { conceive, type Concept, type Medium } from './ways';
import { itemById } from './parts';
import { PROCESSES } from './processes';
import { workflowById, type PowertrainChoice } from './workflows';
import { PART_KINDS } from '../parts/registry';
import { MATERIALS } from '../data/materials';
import { MOTORS, GEARHEADS } from '../data/motors';
import { BATTERIES } from '../data/batteries';
import type { WorkflowResult } from './types';

export const LEVELS = [
  { level: 'material', like: 'molecule', is: 'what everything is made of, with its properties', where: 'data/materials.ts' },
  { level: 'feature', like: 'cell', is: 'a hole, a thread, a bore, a bend, a bead: what one process makes', where: 'processes.ts' },
  { level: 'part', like: 'tissue', is: 'a bought item, or a part made from stock by features', where: 'parts.ts, parts/registry.ts' },
  { level: 'block', like: 'organ', is: 'a part known by what it does: its flows, ports and anatomy', where: 'blocks.ts' },
  { level: 'system', like: 'organ system', is: 'blocks doing one function together: power, drive, support, structure, protection, control', where: 'grow.ts' },
  { level: 'machine', like: 'organism', is: 'every system, put together, doing the job', where: 'grow.ts' },
] as const;

export type System = 'power' | 'drive' | 'support' | 'structure' | 'protection' | 'control' | 'material' | 'whole';
const SYSTEM: Record<Archetype['category'], System> = {
  power: 'power', actuation: 'drive', transmission: 'drive', support: 'support', connection: 'support', structure: 'structure', protection: 'protection', control: 'control', material: 'material', machine: 'whole',
};

/** One block of a grown machine: what it is, what it is made as, and why it is there. */
export interface Organ {
  id: string;
  block: string;
  /** What it is for here ("frame", "battery tray", "torque arm"). */
  role: string;
  system: System;
  /** Why it exists: the seed (it does the job), or the principle another organ called for it by. */
  because: { seed: string } | { principle: string; by: string };
  item?: string;
  made?: { shape: string; material: string; size?: string };
  count?: number;
}

export interface Finding { level: 'error' | 'warning' | 'gap'; organ?: string; principle?: string; rule?: string; message: string }

export interface Genome { from: Flow; to: Flow; spec: Record<string, number> }

export interface Organism {
  genome: Genome;
  key: string;
  concept: Concept;
  organs: Organ[];
  findings: Finding[];
  /** Organ ids in the order they go together, each with why it comes there. */
  order: { organ: string; why: string }[];
  fitness: { errors: number; gaps: number; warnings: number; organs: number; parts: number; cost: Record<string, number> };
  /** The sizing it was embodied by, when a workflow sizes this concept. */
  sized?: WorkflowResult<PowertrainChoice>;
}

// ------------------------------------------------------------------------------------------------ development

interface Rule { from: string; needs: string; role: string; principle: string; unless?: (has: (block: string) => boolean) => boolean }

/** What each block can't work without. */
export const DEVELOPMENT: Rule[] = [
  { from: 'actuation.rotary', needs: 'power.control', role: 'controller', principle: 'current-limit-motors' },
  { from: 'power.control', needs: 'power.store', role: 'energy store', principle: 'energy-from-a-source' },
  { from: 'actuation.rotary', needs: 'power.store', role: 'energy store', principle: 'energy-from-a-source' },
  { from: 'power.store', needs: 'protect.fuse', role: 'fuse', principle: 'fuse-at-source' },
  { from: 'power.store', needs: 'power.conduct', role: 'wiring', principle: 'size-wire-by-drop-and-ampacity' },
  { from: 'power.store', needs: 'structure.member', role: 'battery tray', principle: 'no-holes-in-bought-items' },
  { from: 'transmission.reduce', needs: 'connection.two-force', role: 'torque arm', principle: 'torque-arm' },
  { from: 'actuation.rotary', needs: 'structure.member', role: 'motor mount', principle: 'no-holes-in-bought-items', unless: (has) => has('transmission.reduce') },
  { from: 'transmission.wheel', needs: 'transmission.shaft', role: 'axle', principle: 'gearhead-takes-torque-not-load' },
  { from: 'transmission.shaft', needs: 'support.rotate', role: 'bearings', principle: 'bearing-near-load' },
  { from: 'transmission.shaft', needs: 'transmission.couple', role: 'coupling', principle: 'coupling-takes-misalignment', unless: (has) => !has('transmission.reduce') && !has('actuation.rotary') },
  { from: 'support.rotate', needs: 'structure.member', role: 'frame', principle: 'short-load-path' },
  { from: 'connection.two-force', needs: 'structure.member', role: 'frame', principle: 'torque-arm' },
  { from: 'transmission.flexible', needs: 'protect.guard', role: 'chain guard', principle: 'guard-moving-parts' },
  { from: 'transmission.flexible', needs: 'support.rotate', role: 'bearings', principle: 'bearing-near-load' },
  { from: 'logic.bistable', needs: 'structure.member', role: 'frame', principle: 'short-load-path' },
  { from: 'transmission.screw', needs: 'transmission.couple', role: 'coupling', principle: 'coupling-takes-misalignment' },
  { from: 'transmission.screw', needs: 'structure.member', role: 'frame', principle: 'short-load-path' },
];


/** A concept's seed organs, then every organ they call for, until nothing more is needed. */
export function develop(c: Concept): Organ[] {
  const organs: Organ[] = [];
  const key = (block: string, role: string) => `${block}|${role}`;
  const seen = new Set<string>();
  const add = (o: Omit<Organ, 'id' | 'system'>) => {
    if (seen.has(key(o.block, o.role))) return null;
    seen.add(key(o.block, o.role));
    const a = archetypeById(o.block)!;
    const organ: Organ = { ...o, id: o.role.replace(/\s+/g, '-'), system: SYSTEM[a.category] };
    organs.push(organ);
    return organ;
  };
  for (const w of c.ways) for (const b of w.embodiedBy.slice(0, 1)) add({ block: b, role: archetypeById(b)!.role, because: { seed: w.id } });
  const has = (block: string) => organs.some((o) => o.block === block);
  for (let i = 0; i < organs.length; i++) {
    const o = organs[i]!;
    for (const r of DEVELOPMENT) {
      if (r.from !== o.block || r.unless?.(has)) continue;
      if (r.role === 'energy store' && has('power.store')) continue;
      add({ block: r.needs, role: r.role, because: { principle: r.principle, by: o.id } });
    }
  }
  return organs;
}

// ------------------------------------------------------------------------------------------------ embodiment

import { SHAPE_PROCESSES } from '../construct/laws';

const DEFAULT_MADE: Record<string, { shape: string; material: string }> = {
  'structure.member': { shape: 'tube.square', material: 'steel.a36' }, 'transmission.shaft': { shape: 'rod.round', material: 'steel.1018-cd' },
  'transmission.wheel': { shape: 'wheel', material: 'rubber.natural' }, 'protect.guard': { shape: 'plate', material: 'steel.a36' },
  'logic.bistable': { shape: 'plate', material: 'aluminum.6061-t6' },
};

/**
 * Frames, mounts and trays sized from stock. The genome says what the machine must carry, not how its frame is laid
 * out, so each is sized on a stated layout, and says so. A vehicle's frame is a cross-member over the track with the
 * driven weight at its middle; an actuator's frame carries its screw's push along it as a strut, or its torque arm's
 * pull at the end of a 100 mm bracket; a motor mount holds the motor's reaction at 50 mm on a 100 mm bracket; a
 * battery tray is a member under the battery carrying its weight at its middle.
 */
function sizeMembers(organs: Organ[], p: PowertrainChoice, spec: Record<string, number>, vehicle: boolean): Finding[] {
  const out: Finding[] = [];
  const member = workflowById('member.size')!, strut = workflowById('strut.size')!;
  for (const o of organs) {
    if (o.block !== 'structure.member') continue;
    const bat = BATTERIES[p.drive.battery]!;
    const stroke = spec['stroke'] ?? 0.3;
    const job: { run: () => WorkflowResult<{ section: string }>; said: string } = o.role === 'battery tray'
      ? { run: () => member.run({ span: Math.max(...bat.dims) * p.drive.series, load: bat.mass * p.drive.series * 9.80665 }) as WorkflowResult<{ section: string }>, said: `a member under the battery carrying its ${(bat.mass * p.drive.series).toFixed(1)} kg at its middle` }
      : vehicle
        ? { run: () => member.run({ span: spec['track'] ?? 0.6, load: (spec['mass'] ?? 100) * 9.80665 * (spec['driven'] ?? 0.5) }) as WorkflowResult<{ section: string }>, said: `a cross-member over the ${((spec['track'] ?? 0.6) * 1000).toFixed(0)} mm track with the driven weight at its middle` }
        : o.role === 'motor mount'
          ? { run: () => member.run({ span: 0.1, load: p.torque / 0.05, cantilever: 1 }) as WorkflowResult<{ section: string }>, said: 'a 100 mm bracket holding the motor\'s reaction at 50 mm' }
          : p.screw
            ? { run: () => strut.run({ length: stroke, load: p.screw!.force }) as WorkflowResult<{ section: string }>, said: `a strut along the ${(stroke * 1000).toFixed(0)} mm stroke carrying the screw's push` }
            : { run: () => member.run({ span: 0.1, load: p.torqueArm?.force ?? p.torque / 0.04, cantilever: 1 }) as WorkflowResult<{ section: string }>, said: 'a 100 mm bracket holding the torque arm\'s pull at its end' };
    const r = job.run();
    if (!r.ok || !r.choice) { out.push({ level: 'error', organ: o.id, message: `${o.id}: ${r.summary}` }); continue; }
    o.item = r.choice.section;
    delete o.made;
    out.push({ level: 'warning', organ: o.id, message: `${o.id}: sized as ${job.said} (the genome doesn't say its layout): ${r.summary}` });
  }
  return out;
}

function embody(organs: Organ[], p: PowertrainChoice | null, motors: number) {
  const k = motors;
  for (const o of organs) {
    const made = DEFAULT_MADE[o.block];
    if (made) o.made = { ...made };
    if (!p) continue;
    const d = p.drive;
    switch (o.block) {
      case 'power.store': o.item = d.battery; o.count = d.series; break;
      case 'power.control': o.item = d.controller; o.count = d.controllers; break;
      case 'actuation.rotary': o.item = d.motor; o.count = k; break;
      case 'transmission.reduce': if (d.gearhead) { o.item = d.gearhead; o.count = k; } break;
      case 'power.conduct': if (p.wire) { o.item = `awg.${p.wire.gauge}`; o.count = k; } break;
      case 'protect.fuse': if (p.fuse) { o.item = p.fuse; o.count = k; } break;
      case 'transmission.couple': if (p.coupling) { o.item = p.coupling; o.count = k; } break;
      case 'connection.two-force': if (p.torqueArm) { o.item = p.torqueArm.rodEnd; o.count = 2 * k; } break;
      case 'support.rotate': if (p.bearing) { o.item = p.bearing; o.count = k; } break;
      case 'transmission.shaft': if (p.axle) { o.made = { shape: 'rod.round', material: p.axleMaterial ?? 'steel.1018-cd', size: `Ø${(p.axle * 1000).toFixed(0)} mm` }; o.count = k; } break;
      case 'transmission.wheel': o.count = k; break;
      case 'transmission.screw': if (p.screw) { o.item = p.screw.item; o.count = k; } break;
    }
  }
}

// ------------------------------------------------------------------------------------------------ immunity

/** Every organ bought or made (R11), every connection checked, energy from a source (R10). */
function immune(organs: Organ[], design: Problem[] | null, c: Concept): Finding[] {
  const out: Finding[] = [];
  for (const o of organs) {
    const a = archetypeById(o.block)!;
    if (o.made) {
      const kind = PART_KINDS.find((k) => k.id === o.made!.shape);
      const mat = MATERIALS.find((m) => m.id === o.made!.material);
      if (!kind || !mat) { out.push({ level: 'error', organ: o.id, rule: 'R11', message: `${o.id}: no shape ${o.made.shape} or material ${o.made.material} in the world` }); continue; }
      const can = (SHAPE_PROCESSES[kind.id] ?? []).filter((pid) => PROCESSES.find((p) => p.id === pid)?.materials.includes(mat.category));
      if (!can.length) out.push({ level: 'gap', organ: o.id, rule: 'R11', message: `${o.id}: ${mat.name.toLowerCase()} ${kind.label.toLowerCase()} — no process I know makes it, and none is catalogued to buy: it can't honestly be placed` });
      if (!o.made.size && o.block !== 'transmission.wheel') out.push({ level: 'gap', organ: o.id, message: `${o.id}: not sized yet (no workflow sizes a ${a.id.split('.')[1]} for this)` });
    } else if (a.families.length) {
      if (!o.item) out.push({ level: 'gap', organ: o.id, message: `${o.id}: not chosen (no workflow sizes it for this concept)` });
      else if (!itemById(o.item)) out.push({ level: 'error', organ: o.id, rule: 'R11', message: `${o.id}: ${o.item} isn't catalogued` });
    }
  }
  for (const p of design ?? []) out.push({ level: p.severity, principle: p.principle, message: p.message });
  const powered = c.ways.some((w) => w.takes.includes('electric'));
  if (powered && !organs.some((o) => o.block === 'power.store')) out.push({ level: 'error', rule: 'R10', principle: 'energy-from-a-source', message: 'nothing stores or supplies its energy' });
  return out;
}

// ------------------------------------------------------------------------------------------------ order

/** Frame first, then what it carries, then what turns, then what drives it; power last, so nothing is live while it is built. */
const STAGE: [string, number, string][] = [
  ['battery tray', 7, 'the battery tray onto the frame'],
  ['motor mount', 3, 'the motor mount onto the frame'],
  ['structure.member', 0, 'the frame first: everything else is held by it'],
  ['support.rotate', 1, 'bearings onto the frame'],
  ['transmission.shaft', 2, 'shafts into their bearings'],
  ['transmission.couple', 3, 'couplings onto the shafts'],
  ['transmission.reduce', 4, 'the gearhead onto its motor, then onto its coupling'],
  ['actuation.rotary', 4, 'the motor with its gearhead'],
  ['connection.two-force', 5, 'torque arms from the housing to the frame, once it is in place'],
  ['transmission.flexible', 5, 'chains onto their sprockets'],
  ['transmission.wheel', 6, 'wheels last of the mechanical parts, so it can sit on its own frame until then'],
  ['protect.guard', 7, 'guards over what moves'],
  ['power.store', 8, 'the battery into its tray'],
  ['power.control', 8, 'the controller'],
  ['power.conduct', 9, 'wiring'],
  ['protect.fuse', 10, 'the fuse in last: until it goes in, nothing is live (fail-safe)'],
  ['logic.bistable', 2, 'the levers onto their pivots on the frame, each set to its starting state'],
  ['transmission.screw', 2, 'the lead screw into its end bearing, its nut onto what it moves, square to the frame'],
];

function order(organs: Organ[]): { organ: string; why: string }[] {
  const at = (o: Organ) => STAGE.find((s) => s[0] === o.role) ?? STAGE.find((s) => s[0] === o.block) ?? [o.block, 5, 'where it fits'];
  return [...organs].sort((a, b) => at(a)[1] - at(b)[1]).map((o) => ({ organ: o.id, why: at(o)[2] }));
}

// ------------------------------------------------------------------------------------------------ genome, growth, selection

/** A genome's key: what is wanted and its numbers, keys sorted, hashed (FNV-1a). */
export function genomeKey(g: Genome): string {
  const canon = `${g.from}>${g.to}:${JSON.stringify(Object.keys(g.spec).sort().map((k) => [k, Number(g.spec[k]!.toPrecision(12))]))}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) h = Math.imul(h ^ canon.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

const ids = (c: Concept) => c.ways.map((w) => w.id).join('>');

/** One concept grown into a whole machine from a genome. */
export function growConcept(g: Genome, c: Concept): Organism {
  const organs = develop(c);
  // a vehicle driven by a rotary motor on wheels (geared or direct) is sized by the drivetrain workflow; a shaft
  // turned, or a push made through a lead screw, by the actuator workflow
  const vehicle = g.to === 'travel' && /^motor\.rotary(>gear\.reduce)?>wheel$/.test(ids(c));
  // (a signal or a cell may come before the motor, and levers it pushes after the screw: an electric computer's drive)
  const chain = c.ways.map((w) => w.id), at = chain.indexOf('motor.rotary');
  const actuator = !vehicle && at >= 0 && chain.slice(0, at).every((w) => w === 'switch.transistor' || w === 'cell.electrochemical')
    && chain.slice(at + 1).every((w) => w === 'gear.reduce' || w === 'lead.screw' || w === 'logic.mechanical');
  const pushes = chain.includes('lead.screw'), levers = chain.includes('logic.mechanical');
  const sized = vehicle ? (workflowById('powertrain.design')!.run({ ...g.spec, geared: ids(c).includes('gear.reduce') ? 1 : 0 }) as WorkflowResult<PowertrainChoice>)
    : actuator ? (workflowById('actuator.design')!.run({ ...g.spec, force: pushes ? (g.spec['force'] ?? (levers ? 20 : 500)) : 0 }) as WorkflowResult<PowertrainChoice>) : undefined;
  const p = sized?.ok ? sized.choice : null;
  embody(organs, p, Math.max(1, Math.round(g.spec['motors'] ?? (vehicle ? 2 : 1))));
  const sizing = p ? sizeMembers(organs, p, g.spec, vehicle) : [];
  const findings = [...immune(organs, p ? checkDesign(designFromPowertrain(p)) : null, c), ...sizing];
  if (!sized) findings.push({ level: 'gap', message: `no workflow sizes ${ids(c)} yet: its blocks are known, their sizes aren't` });
  else if (!sized.ok) findings.push({ level: 'error', message: sized.summary });
  const cost: Record<string, number> = {};
  for (const o of organs) {
    const priced = o.item ? (MOTORS[o.item] ?? GEARHEADS[o.item] ?? BATTERIES[o.item])?.price : undefined;
    if (priced) cost[priced.currency] = (cost[priced.currency] ?? 0) + priced.amount * (o.count ?? 1);
  }
  const count = (lv: Finding['level']) => findings.filter((f) => f.level === lv).length;
  return {
    genome: g, key: genomeKey(g), concept: c, organs, findings, order: order(organs), sized,
    fitness: { errors: count('error'), gaps: count('gap'), warnings: count('warning'), organs: organs.length, parts: organs.reduce((n, o) => n + (o.count ?? 1), 0), cost },
  };
}

/** Fitter first: fewest errors, then fewest gaps, then fewest organs (minimise part count), then cheapest. */
export const fitter = (a: Organism, b: Organism) =>
  a.fitness.errors - b.fitness.errors || a.fitness.gaps - b.fitness.gaps || a.fitness.organs - b.fitness.organs
  || (Object.values(a.fitness.cost)[0] ?? Infinity) - (Object.values(b.fitness.cost)[0] ?? Infinity);

const grown = new Map<string, ReturnType<typeof grow>>();

/**
 * Grow a machine from a genome: every concept for the job, the buildable ones grown whole and the fittest kept. Grown
 * once per genome (heredity: the same genome gives the same body at once).
 */
export function grow(g: Genome): { best: Organism | null; others: Organism[]; possible: { concept: Concept; missing: string[]; against: Medium | null }[] } {
  const key = genomeKey(g);
  const hit = grown.get(key);
  if (hit) return hit;
  const concepts = conceive(g.from, g.to);
  const bodies = concepts.filter((c) => c.buildable).slice(0, 8).map((c) => growConcept(g, c)).sort(fitter);
  const possible = concepts.filter((c) => !c.buildable).map((c) => ({ concept: c, missing: c.missing.map((w) => w.id), against: c.against }));
  const out = { best: bodies[0] ?? null, others: bodies.slice(1), possible };
  grown.set(key, out);
  return out;
}

/** The body, system by system, each organ with why it is there. */
export function anatomyOf(o: Organism): string[] {
  const systems = [...new Set(o.organs.map((x) => x.system))];
  return systems.map((s) => `${s}: ${o.organs.filter((x) => x.system === s).map((x) => `${x.role}${x.count && x.count > 1 ? ` ×${x.count}` : ''}${x.item ? ` (${itemById(x.item)?.label ?? x.item})` : x.made ? ` (made: ${x.made.size ? `${x.made.size} ` : ''}${x.made.shape} in ${x.made.material})` : ''} — ${'seed' in x.because ? `does the job (${x.because.seed})` : `${x.because.by} needs it: ${x.because.principle}`}`).join('; ')}`);
}

/** How small the genome is against the body it grows: the language it is said in, measured. */
export function compression(o: Organism): { genomeBytes: number; bodyBytes: number; ratio: number } {
  const genomeBytes = JSON.stringify(o.genome).length;
  const bodyBytes = JSON.stringify({ organs: o.organs, design: o.sized?.choice ? designFromPowertrain(o.sized.choice) : null, order: o.order }).length;
  return { genomeBytes, bodyBytes, ratio: bodyBytes / genomeBytes };
}
