// The ganglia's index: everything Ego knows, found by what you'd call it. `recall` ranks laws, processes, parts,
// workflows, building blocks and principles by the words of a question (names, tags, statements, formulas, reasons);
// `explain` says one in full, with its source; `linked` follows a workflow to the laws, part families and processes it
// uses, and a part family back to the workflows that choose from it.

import { LAWS, lawById } from './laws';
import { PROCESSES, processById } from './processes';
import { CATALOG, itemById } from './parts';
import { WORKFLOWS, workflowById } from './workflows';
import { MATERIALS, type Material } from '../data/materials';
import { CONNECTOR_KINDS, type ConnectorKind } from '../connectors/registry';
import { PART_KINDS, type PartKind } from '../parts/registry';
import type { CatalogItem, Law, Process, Workflow, WorkflowResult } from './types';
import { neighbours as neighboursOf } from './graph';
import { MACHINES, breakdown, nodesOf, type Machine } from './machines';
import { ARCHETYPES, blocksByArchetype, type Archetype } from './blocks';
import { PRINCIPLES, explainPrinciple, principleById, type Principle } from './principles';
import { WAYS, buildable, type Way } from './ways';

/**
 * Everything she knows. Besides the ganglia's own laws, processes, parts and workflows, the world's materials (each
 * with its handbook source), its joints (each with how it is rated) and its shapes of stock are knowledge too, and
 * are found the same way.
 */
export type Knowledge =
  | { kind: 'law'; item: Law }
  | { kind: 'process'; item: Process }
  | { kind: 'part'; item: CatalogItem }
  | { kind: 'workflow'; item: Workflow }
  | { kind: 'material'; item: Material }
  | { kind: 'joint'; item: ConnectorKind }
  | { kind: 'shape'; item: PartKind }
  | { kind: 'machine'; item: Machine }
  /** A building block: what a thing does, whoever makes it. */
  | { kind: 'block'; item: Archetype }
  /** Why things are done the way they are. */
  | { kind: 'principle'; item: Principle }
  /** A physical way to turn one flow into another. */
  | { kind: 'way'; item: Way };

let all: Knowledge[] | null = null;
export function everything(): Knowledge[] {
  return (all ??= [
    ...LAWS.map((item) => ({ kind: 'law' as const, item })),
    ...PROCESSES.map((item) => ({ kind: 'process' as const, item })),
    ...CATALOG.map((item) => ({ kind: 'part' as const, item })),
    ...WORKFLOWS.map((item) => ({ kind: 'workflow' as const, item })),
    ...MATERIALS.map((item) => ({ kind: 'material' as const, item })),
    ...CONNECTOR_KINDS.map((item) => ({ kind: 'joint' as const, item })),
    ...PART_KINDS.map((item) => ({ kind: 'shape' as const, item })),
    ...MACHINES.map((item) => ({ kind: 'machine' as const, item })),
    ...ARCHETYPES.map((item) => ({ kind: 'block' as const, item })),
    ...PRINCIPLES.map((item) => ({ kind: 'principle' as const, item })),
    ...WAYS.map((item) => ({ kind: 'way' as const, item })),
  ]);
}

/** A piece of knowledge's name, as she'd say it. */
export function nameOf(k: Knowledge): string {
  switch (k.kind) {
    case 'part': case 'machine': return k.item.label;
    case 'joint': case 'shape': return k.item.label;
    case 'block': return blockName(k.item);
    case 'way': return k.item.name;
    case 'principle': return principleName(k.item);
    default: return k.item.name;
  }
}

/** "support.rotate" → "rotary support"; "bearing-near-load" → "bearing near load". */
export const blockName = (a: Archetype) => BLOCK_NAMES[a.id] ?? a.id;
export const principleName = (p: Principle) => p.id.replace(/-/g, ' ');
const BLOCK_NAMES: Record<string, string> = {
  'power.store': 'energy store', 'power.control': 'motor controller', 'power.conduct': 'conductor', 'actuation.rotary': 'rotary actuator',
  'transmission.reduce': 'speed reducer', 'transmission.couple': 'shaft coupling', 'transmission.flexible': 'chain drive', 'support.rotate': 'rotary support',
  'connection.two-force': 'two-force link', 'material.print': 'printing material', 'transmission.shaft': 'shaft', 'transmission.wheel': 'wheel',
  'structure.member': 'frame member', 'machine.assembly': 'whole machine', 'protect.fuse': 'fuse', 'protect.guard': 'guard',
};

const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'what', 'how', 'do', 'does', 'is', 'are', 'i', 'you', 'me', 'my', 'about', 'tell', 'know', 'explain', 'with', 'it', 'that', 'this', 'whats', 'which', 'can', 'should', 'make', 'made', 'at', 'by', 'its', 'as', 'be', 'from', 'one', 'each']);

/** Words that mean the same thing to a builder: a question in either finds both. */
const SYNONYMS: Record<string, string[]> = {
  aluminium: ['aluminum'], aluminum: ['aluminium'], cable: ['wire'], wire: ['cable'], axle: ['shaft'], shaft: ['axle'],
  kart: ['vehicle', 'cart'], cart: ['kart', 'vehicle'], car: ['vehicle'], vehicle: ['kart'], robot: ['vehicle', 'drive'],
  pack: ['battery'], battery: ['pack'], amp: ['current'], current: ['amp'], volt: ['voltage'], voltage: ['volt'],
  heat: ['thermal', 'temperature'], thermal: ['heat'], temperature: ['heat'], hole: ['drill'], thread: ['tap'], tap: ['thread'],
  weld: ['welding'], welding: ['weld'], coil: ['spring'], stiffness: ['rate'], strength: ['capacity', 'rating'], strong: ['strength'],
  gearmotor: ['motor', 'gearhead'], gearbox: ['gearhead'], speed: ['velocity'], velocity: ['speed'], bend: ['bending'], sag: ['deflection'],
  deflection: ['sag'], column: ['buckling', 'strut'], leg: ['column'], strut: ['column'], grip: ['traction', 'friction'], slip: ['friction'],
  water: ['fluid'], air: ['drag'], magnet: ['magnetic'], steel: ['iron'], glue: ['adhesive'], adhesive: ['glue'], bolt: ['bolted', 'thread'],
  screw: ['screwed'], spin: ['rotation'], rotation: ['spin', 'inertia'], flywheel: ['inertia'], vibration: ['frequency'], hill: ['grade', 'slope'],
  slope: ['grade'], tyre: ['tire', 'wheel'], tire: ['tyre', 'wheel'], cost: ['price'], price: ['cost'],
};

/** Lowercase words without their endings ("bearings" → "bearing", "welded" → "weld"), stop words dropped. */
export function tokens(t: string): string[] {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);
}
function stem(w: string): string {
  if (w.length <= 4 || /\d/.test(w)) return w;
  if (w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.endsWith('ing') && w.length > 6) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 5) return w.slice(0, -2);
  if (w.endsWith('es') && /(ss|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function text(k: Knowledge): { name: string; body: string; tags: string[] } {
  switch (k.kind) {
    case 'law': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.statement} ${k.item.formula} ${k.item.domain}`, tags: k.item.tags };
    case 'process': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.makes} ${k.item.tools.join(' ')} ${k.item.limits.join(' ')}`, tags: k.item.tags };
    case 'part': return { name: `${k.item.label} ${k.item.id.replace(/[.-]/g, ' ')} ${k.item.family}`, body: `${Object.keys(k.item.specs).join(' ')} ${k.item.source.cite}`, tags: k.item.tags };
    case 'workflow': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.goal} ${k.item.steps.join(' ')}`, tags: k.item.tags };
    case 'material': return { name: `${k.item.name} ${k.item.id.replace(/[.-]/g, ' ')}`, body: `${k.item.category} ${k.item.source}`, tags: [k.item.category, ...(k.item.ferromagnetic ? ['magnetic'] : []), k.item.weld !== 'none' ? 'weldable' : ''] };
    case 'joint': return { name: `${k.item.label} ${k.item.id}`, body: `${k.item.blurb} ${k.item.model}`, tags: [k.item.category, 'joint', 'connect', 'join'] };
    case 'shape': return { name: `${k.item.label} ${k.item.id.replace(/\./g, ' ')}`, body: k.item.category, tags: [k.item.category, 'part'] };
    case 'machine': return { name: `${k.item.label} ${k.item.id.replace(/[.-]/g, ' ')}`, body: `${k.item.does} ${nodesOf(k.item).map((n) => `${n.name} ${n.is}`).join(' ')} ${k.item.example ?? ''} ${k.item.source.cite}`, tags: [...k.item.tags, 'machine'] };
    case 'block': return { name: `${blockName(k.item)} ${k.item.id.replace(/[.-]/g, ' ')}`, body: `${k.item.does} ${k.item.families.join(' ')} ${(k.item.shapes ?? []).join(' ')}`, tags: [k.item.category, 'block', 'building block', ...k.item.takes, ...k.item.gives] };
    case 'principle': return { name: principleName(k.item), body: `${k.item.rule} ${k.item.why} ${k.item.seen ?? ''}`, tags: [k.item.category, ...k.item.appliesTo.map((x) => x.replace(/[.-]/g, ' ')), 'principle'] };
    case 'way': return { name: `${k.item.name} ${k.item.id.replace(/[.-]/g, ' ')}`, body: `${k.item.effect} ${k.item.range}`, tags: [...k.item.takes, ...k.item.gives, k.item.against ?? '', 'way', 'working principle'] };
  }
}

/** The index, built once: each document's weighted term counts (a name word counts 3, a tag 2, the rest 1), BM25F. */
interface Index { docs: Knowledge[]; ids: string[][]; tf: Map<string, number>[]; len: number[]; avg: number; df: Map<string, number>; vocab: string[] }
let index: Index | null = null;
function build(): Index {
  const docs = everything();
  const tf: Map<string, number>[] = [], len: number[] = [], df = new Map<string, number>();
  for (const k of docs) {
    const t = text(k), m = new Map<string, number>();
    let l = 0;
    const put = (ws: string[], w: number) => { for (const x of ws) { m.set(x, (m.get(x) ?? 0) + w); l += w; } };
    put(tokens(t.name), 3);
    put(t.tags.flatMap(tokens), 2);
    put(tokens(t.body), 1);
    tf.push(m);
    len.push(l);
    for (const x of m.keys()) df.set(x, (df.get(x) ?? 0) + 1);
  }
  const ids = docs.map((k) => tokens(k.item.id.replace(/[.-]/g, ' ')));
  return { docs, ids, tf, len, avg: len.reduce((a, b) => a + b, 0) / Math.max(1, len.length), df, vocab: [...df.keys()] };
}

/**
 * What she knows about a question, best first (BM25F over names, tags and text). Each word of the question counts by
 * how rare it is across everything she knows; its synonyms count half, and a word that only begins a known one (a
 * stem typed short) counts most of a match.
 */
export function recall(question: string, limit = 6, kinds?: Knowledge['kind'][]): Knowledge[] {
  const ix = (index ??= build());
  const q = new Map<string, number>();
  const ws = tokens(question);
  // two words said apart that are one word to it ("mark forged" is Markforged, "fly wheel" a flywheel)
  for (let i = 0; i + 1 < ws.length; i++) { const joined = ws[i]! + ws[i + 1]!; if (ix.df.has(joined)) q.set(joined, 1); }
  for (const w of ws) {
    q.set(w, Math.max(q.get(w) ?? 0, 1));
    for (const s of SYNONYMS[w] ?? []) for (const t of tokens(s)) q.set(t, Math.max(q.get(t) ?? 0, 0.5));
    if (!ix.df.has(w) && w.length >= 4) for (const v of ix.vocab) if (v.startsWith(w)) q.set(v, Math.max(q.get(v) ?? 0, 0.7));
  }
  if (!q.size) return [];
  const N = ix.docs.length, k1 = 1.2, b = 0.75;
  const scored: { i: number; s: number }[] = [];
  for (let i = 0; i < N; i++) {
    if (kinds && !kinds.includes(ix.docs[i]!.kind)) continue;
    let s = 0;
    for (const [w, wq] of q) {
      const f = ix.tf[i]!.get(w);
      if (!f) continue;
      const d = ix.df.get(w)!;
      const idf = Math.log(1 + (N - d + 0.5) / (d + 0.5));
      s += wq * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * ix.len[i]!) / ix.avg)));
    }
    // a word that is part of its id ("fx10", "6205", "ucp205") names it outright
    const id = ix.ids[i]!;
    for (const w of q.keys()) if (id.includes(w) && w.length >= 3 && /\d/.test(w)) s *= 2;
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, limit).map((x) => ix.docs[x.i]!);
}

/** One piece of knowledge, said in full. */
export function explain(k: Knowledge): string {
  switch (k.kind) {
    case 'law': {
      const l = k.item;
      return `${l.name}: ${l.statement} ${l.formula}, with ${l.inputs.map((i) => `${i.sym} ${i.name} (${i.unit})`).join(', ')} giving ${l.output.name} (${l.output.unit}). Holds: ${l.valid} Source: ${l.source.cite}.`;
    }
    case 'process': {
      const p = k.item;
      return `${p.name} makes ${p.makes}, in ${p.materials.join(', ')}, with ${p.tools.join(', ')}. Limits: ${p.limits.join(' ')} Source: ${p.source.cite}.`;
    }
    case 'part': {
      const c = k.item;
      const specs = Object.entries(c.specs).map(([key, v]) => `${key} ${typeof v === 'number' ? Number(v.toPrecision(4)) : v}`).join(', ');
      const rated = neighboursOf(`part:${c.id}`, 'ratedBy').map((x) => lawById(x.slice(4))?.name).filter(Boolean);
      const fitted = neighboursOf(`part:${c.id}`, 'fittedBy').map((x) => processById(x.slice(8))?.name.toLowerCase()).filter(Boolean);
      return `${c.label} (${c.family}): ${specs}.${c.price ? ` About ${c.price.currency} ${c.price.amount} (${c.price.note}, ${c.price.seen}).` : ''}${rated.length ? ` Rated by: ${rated.join(', ')}.` : ''}${fitted.length ? ` Fitted by ${fitted.join(', ')}.` : ''} Source: ${c.source.cite}.`;
    }
    case 'workflow': {
      const w = k.item;
      return `${w.name}: ${w.goal} It asks ${w.asks.map((a) => `${a.name} (${a.unit}${a.default !== undefined ? `, ${a.default} if not said` : ''})`).join(', ')}. Steps: ${w.steps.join(' ')}`;
    }
    case 'material': {
      const m = k.item, MPa = 1e6;
      return `${m.name}: ${m.density} kg/m³, E ${Number((m.E / 1e9).toPrecision(3))} GPa, yield ${Math.round(m.yield / MPa)} MPa, ultimate ${Math.round(m.ultimate / MPa)} MPa, ${m.ductile ? 'ductile' : 'brittle'}${m.ferromagnetic ? ', magnetic' : ''}${m.weld !== 'none' ? `, welds as ${m.weld}` : ''}. Source: ${m.source} (${m.confidence}).`;
    }
    case 'joint': {
      const made = neighboursOf(`joint:${k.item.id}`, 'madeBy').map((x) => processById(x.slice(8))?.name.toLowerCase()).filter(Boolean);
      return `${k.item.label}: ${k.item.blurb}${made.length ? ` Made by ${made.join(', ')}.` : ''}`;
    }
    case 'machine': return breakdown(k.item).join(' ');
    case 'shape': return `${k.item.label} (${k.item.category}): made with ${k.item.params.map((p) => p.label.toLowerCase()).join(', ')}${k.item.bought ? `; bought whole: ${k.item.bought.why}` : ''}.`;
    case 'block': {
      const a = k.item, items = blocksByArchetype()[a.id] ?? [];
      const flows = a.takes.length || a.gives.length ? ` It takes ${a.takes.join(' and ') || 'nothing'} and gives ${a.gives.join(' and ')}.` : '';
      const from = items.length ? ` In the catalogue: ${items.map((id) => itemById(id)?.label ?? id).join('; ')}.` : a.shapes?.length ? ` Made here from ${a.shapes.join(', ')}.` : '';
      const laws = a.laws.map((l) => lawById(l)?.name).filter(Boolean);
      const rules = a.principles.map((p) => principleById(p)?.rule).filter(Boolean);
      const inside = a.inside.map((x) => `${x.name} (${x.does})`).join('; ');
      return `A ${blockName(a)} ${a.does}.${flows}${from} Inside: ${inside}.${laws.length ? ` Rated by ${laws.join(', ')}.` : ''}${rules.length ? ` Rules: ${rules.join(' ')}` : ''}`;
    }
    case 'principle': return explainPrinciple(k.item, (id) => lawById(id)?.name);
    case 'way': {
      const w = k.item, laws = w.laws.map((l) => lawById(l)?.name).filter(Boolean);
      return `${w.name}: turns ${w.takes.join(' or ')} into ${w.gives.join(' or ')}${w.against ? `, pushing against ${w.against === 'reaction mass' ? 'mass it throws away' : `the ${w.against}`}` : ''}. ${w.effect} ${w.range}${laws.length ? ` By ${laws.join(', ')}.` : ''} ${buildable(w) ? 'I can build it here.' : 'Physically possible, but its parts aren\'t catalogued yet, so I can\'t place it.'} Source: ${w.source.cite}.`;
    }
  }
}

/** What a piece of knowledge links to: a workflow's laws, families and processes; a law's or family's workflows. */
export function linked(id: string): Knowledge[] {
  const w = workflowById(id);
  if (w) {
    return [
      ...w.uses.laws.map((l) => lawById(l)).filter((x): x is Law => !!x).map((item) => ({ kind: 'law' as const, item })),
      ...w.uses.processes.map((p) => processById(p)).filter((x): x is Process => !!x).map((item) => ({ kind: 'process' as const, item })),
      ...CATALOG.filter((c) => w.uses.families.includes(c.family)).map((item) => ({ kind: 'part' as const, item })),
    ];
  }
  const fam = itemById(id)?.family;
  return WORKFLOWS.filter((x) => x.uses.laws.includes(id) || x.uses.processes.includes(id) || (fam && x.uses.families.includes(fam))).map((item) => ({ kind: 'workflow' as const, item }));
}

/** How much she knows, by kind. */
export const census = () => ({ laws: LAWS.length, processes: PROCESSES.length, parts: CATALOG.length, workflows: WORKFLOWS.length, materials: MATERIALS.length, joints: CONNECTOR_KINDS.length, shapes: PART_KINDS.length, machines: MACHINES.length, blocks: ARCHETYPES.length, principles: PRINCIPLES.length, ways: WAYS.length });

export { LAWS, PROCESSES, CATALOG, WORKFLOWS, lawById, processById, itemById, workflowById };
export { solveFor, sensitivity, uncertainty, showWork, show } from './analysis';
export { graph, neighbours, path, dangling } from './graph';
export { findQuantities, parseUnit, toSI, fromSI } from './units';
export { MACHINES, breakdown, machineById } from './machines';
export { ARCHETYPES, archetypeById, blocksByArchetype, checkDesign, designFromPowertrain, portsOf, type Design, type Flow, type Problem } from './blocks';
export { PRINCIPLES, CATEGORIES, principleById, explainPrinciple } from './principles';
export { WAYS, wayById, conceive, byMedium, asWhole, buildable, type Concept, type Way, type Medium } from './ways';
export { grow, growConcept, develop, anatomyOf, compression, genomeKey, LEVELS, DEVELOPMENT, type Organism, type Organ, type Genome } from './grow';
export { CHALLENGES, attempt, report, challengeById, flowOfWord, FLOW_WORDS, type Attempt, type Challenge } from './challenges';

// ------------------------------------------------------------------------------------------------ remembered answers

/**
 * A question's fingerprint: the workflow and its spec, keys sorted and numbers to 12 significant figures, hashed
 * (FNV-1a, two 32-bit lanes). The same question asked in any order of words hashes the same.
 */
export function fingerprint(workflow: string, spec: Record<string, number | string>): string {
  const canon = workflow + JSON.stringify(Object.keys(spec).sort().map((k) => [k, typeof spec[k] === 'number' ? Number((spec[k] as number).toPrecision(12)) : spec[k]]));
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < canon.length; i++) {
    const c = canon.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x01000193 + 2) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

const answered = new Map<string, WorkflowResult>();
const MEMO = 256;

/** A workflow's answer, worked once per question: asked again, the same answer comes back at once (least used dropped first). */
export function solve(workflow: string, spec: Record<string, number | string>): { key: string; result: WorkflowResult; cached: boolean } {
  const w = workflowById(workflow);
  if (!w) throw new Error(`No workflow ${workflow}`);
  const key = fingerprint(workflow, spec);
  const hit = answered.get(key);
  if (hit) { answered.delete(key); answered.set(key, hit); return { key, result: hit, cached: true }; }
  const result = Object.freeze(w.run(spec)) as WorkflowResult;
  answered.set(key, result);
  if (answered.size > MEMO) answered.delete(answered.keys().next().value!);
  return { key, result, cached: false };
}
