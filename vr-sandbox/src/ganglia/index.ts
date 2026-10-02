// The ganglia's index: everything Ego knows, found by what you'd call it. `recall` ranks laws, processes, parts and
// workflows by the words of a question (names, tags, statements, formulas); `explain` says one in full, with its
// source; `linked` follows a workflow to the laws, part families and processes it uses, and a part family back to
// the workflows that choose from it.

import { LAWS, lawById } from './laws';
import { PROCESSES, processById } from './processes';
import { CATALOG, itemById } from './parts';
import { WORKFLOWS, workflowById } from './workflows';
import { MATERIALS, type Material } from '../data/materials';
import { CONNECTOR_KINDS, type ConnectorKind } from '../connectors/registry';
import { PART_KINDS, type PartKind } from '../parts/registry';
import type { CatalogItem, Law, Process, Workflow } from './types';

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
  | { kind: 'shape'; item: PartKind };

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
  ]);
}

/** A piece of knowledge's name, as she'd say it. */
export function nameOf(k: Knowledge): string {
  switch (k.kind) {
    case 'part': return k.item.label;
    case 'joint': case 'shape': return k.item.label;
    default: return k.item.name;
  }
}

const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'what', 'how', 'do', 'does', 'is', 'are', 'i', 'you', 'me', 'my', 'about', 'tell', 'know', 'explain', 'with', 'it', 'that', 'this', 'whats', 'which', 'can', 'should', 'make', 'made']);
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9.+ -]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => w.replace(/(ies)$/, 'y').replace(/([^s])s$/, '$1'));

function text(k: Knowledge): { name: string; body: string; tags: string[] } {
  switch (k.kind) {
    case 'law': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.statement} ${k.item.formula} ${k.item.domain}`, tags: k.item.tags };
    case 'process': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.makes} ${k.item.tools.join(' ')} ${k.item.limits.join(' ')}`, tags: k.item.tags };
    case 'part': return { name: `${k.item.label} ${k.item.id} ${k.item.family}`, body: Object.keys(k.item.specs).join(' '), tags: k.item.tags };
    case 'workflow': return { name: `${k.item.name} ${k.item.id}`, body: `${k.item.goal} ${k.item.steps.join(' ')}`, tags: k.item.tags };
    case 'material': return { name: `${k.item.name} ${k.item.id.replace(/[.-]/g, ' ')}`, body: `${k.item.category} ${k.item.source}`, tags: [k.item.category, ...(k.item.ferromagnetic ? ['magnetic'] : []), k.item.weld !== 'none' ? 'weldable' : ''] };
    case 'joint': return { name: `${k.item.label} ${k.item.id}`, body: `${k.item.blurb} ${k.item.model}`, tags: [k.item.category, 'joint', 'connect', 'join'] };
    case 'shape': return { name: `${k.item.label} ${k.item.id.replace(/\./g, ' ')}`, body: k.item.category, tags: [k.item.category, 'part'] };
  }
}

/** What she knows about a question, best first: a word in a name counts most, then in tags, then anywhere else. */
export function recall(question: string, limit = 6, kinds?: Knowledge['kind'][]): Knowledge[] {
  const ws = words(question);
  if (!ws.length) return [];
  const scored = everything().filter((k) => !kinds || kinds.includes(k.kind)).map((k) => {
    const t = text(k);
    const name = words(t.name), tags = t.tags.flatMap(words), body = words(t.body);
    let s = 0;
    for (const w of ws) {
      if (name.includes(w)) s += 3;
      else if (name.some((x) => x.startsWith(w) && w.length >= 3)) s += 2;
      if (tags.includes(w)) s += 2;
      if (body.includes(w)) s += 1;
    }
    return { k, s };
  }).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.k);
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
      return `${c.label} (${c.family}): ${specs}.${c.price ? ` About ${c.price.currency} ${c.price.amount} (${c.price.note}, ${c.price.seen}).` : ''} Source: ${c.source.cite}.`;
    }
    case 'workflow': {
      const w = k.item;
      return `${w.name}: ${w.goal} It asks ${w.asks.map((a) => `${a.name} (${a.unit}${a.default !== undefined ? `, ${a.default} if not said` : ''})`).join(', ')}. Steps: ${w.steps.join(' ')}`;
    }
    case 'material': {
      const m = k.item, MPa = 1e6;
      return `${m.name}: ${m.density} kg/m³, E ${Number((m.E / 1e9).toPrecision(3))} GPa, yield ${Math.round(m.yield / MPa)} MPa, ultimate ${Math.round(m.ultimate / MPa)} MPa, ${m.ductile ? 'ductile' : 'brittle'}${m.ferromagnetic ? ', magnetic' : ''}${m.weld !== 'none' ? `, welds as ${m.weld}` : ''}. Source: ${m.source} (${m.confidence}).`;
    }
    case 'joint': return `${k.item.label}: ${k.item.blurb}`;
    case 'shape': return `${k.item.label} (${k.item.category}): made with ${k.item.params.map((p) => p.label.toLowerCase()).join(', ')}${k.item.bought ? `; bought whole: ${k.item.bought.why}` : ''}.`;
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
export const census = () => ({ laws: LAWS.length, processes: PROCESSES.length, parts: CATALOG.length, workflows: WORKFLOWS.length, materials: MATERIALS.length, joints: CONNECTOR_KINDS.length, shapes: PART_KINDS.length });

export { LAWS, PROCESSES, CATALOG, WORKFLOWS, lawById, processById, itemById, workflowById };
