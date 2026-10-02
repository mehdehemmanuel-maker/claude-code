// The ganglia as one graph. Every piece of knowledge is a node with a namespaced id ("law:bearing.life.l10",
// "part:skf.6205", "process:tap", "workflow:drive.select", "material:steel.1018-cd", "joint:bolted",
// "shape:motor.dc") and every relation a typed edge:
//   uses          a workflow or process applies a law or a process
//   choosesFrom   a workflow picks among the parts of a family
//   ratedBy       a part is rated by a law (a bearing by its life, a wire by its resistance)
//   fittedBy      a part is fitted or made ready by a process (a bearing pressed on, a terminal crimped)
//   madeBy        a joint is made by a process (a bolted joint is drilled, a weld is welded)
//   works         a process works a material
//   runs, feeds   a machine runs a process, and is fed a material
// It is built once, and its integrity is a test: no edge points at nothing. `path` answers how two things relate
// (a bearing to the law that sizes it, a battery to the workflow that chooses it) by the shortest chain of relations.

import { LAWS } from './laws';
import { PROCESSES } from './processes';
import { CATALOG } from './parts';
import { WORKFLOWS } from './workflows';
import { MATERIALS } from '../data/materials';
import { CONNECTOR_KINDS } from '../connectors/registry';
import { PART_KINDS } from '../parts/registry';
import { MACHINES } from './machines';

export type EdgeType = 'uses' | 'choosesFrom' | 'ratedBy' | 'fittedBy' | 'madeBy' | 'works' | 'runs' | 'feeds';
export interface Edge { from: string; to: string; type: EdgeType }

/** What rates each part family, and what fits it. */
const FAMILY_LAWS: Record<string, string[]> = {
  bearing: ['bearing.life.l10', 'bearing.life.hours'], 'pillow block': ['bearing.life.l10', 'bearing.life.hours'],
  wire: ['wire.resistance', 'wire.drop', 'joule', 'copper.tempco'], 'dc motor': ['motor.torque', 'motor.back-emf', 'motor.current', 'motor.time-constant', 'copper.tempco', 'thermal.network'],
  gearhead: ['gear.output.torque'], battery: ['lead-acid.ocv', 'energy.electric'], 'roller chain': ['chain.speed', 'chain.pull'],
  coupling: ['power.rotary'], 'rod end': ['buckling.euler', 'buckling.johnson'], 'motor controller': ['motor.current', 'power.electric'],
  'printing material': ['composite.rule-of-mixtures', 'composite.transverse'],
};
const FAMILY_PROCESSES: Record<string, string[]> = {
  bearing: ['bearing.fit'], 'pillow block': ['bearing.fit', 'drill'], wire: ['crimp', 'solder'], coupling: ['bore'], 'rod end': ['tap', 'saw'],
  'dc motor': ['split-clamp'], 'roller chain': [], gearhead: [], battery: [], 'motor controller': ['crimp'], 'printing material': ['cff'],
};
const JOINT_PROCESSES: Record<string, string[]> = {
  bolted: ['drill', 'tap'], screwed: ['screw.wood', 'drill'], nailed: [], riveted: ['drill'], weld: ['weld.mig'], glued: ['glue'], soldered: ['solder'],
  clamp: ['split-clamp', 'bore', 'tap'], wire: ['crimp'], bearing: ['bearing.fit'], link: ['tap', 'saw'],
};

export interface Graph {
  nodes: Set<string>;
  edges: Edge[];
  out: Map<string, Edge[]>;
  into: Map<string, Edge[]>;
}

let built: Graph | null = null;

export function graph(): Graph {
  if (built) return built;
  const nodes = new Set<string>(), edges: Edge[] = [];
  for (const l of LAWS) nodes.add(`law:${l.id}`);
  for (const p of PROCESSES) nodes.add(`process:${p.id}`);
  for (const c of CATALOG) nodes.add(`part:${c.id}`);
  for (const w of WORKFLOWS) nodes.add(`workflow:${w.id}`);
  for (const m of MATERIALS) nodes.add(`material:${m.id}`);
  for (const k of CONNECTOR_KINDS) nodes.add(`joint:${k.id}`);
  for (const k of PART_KINDS) nodes.add(`shape:${k.id}`);
  for (const m of MACHINES) nodes.add(`machine:${m.id}`);
  const e = (from: string, to: string, type: EdgeType) => edges.push({ from, to, type });
  for (const w of WORKFLOWS) {
    for (const l of w.uses.laws) e(`workflow:${w.id}`, `law:${l}`, 'uses');
    for (const p of w.uses.processes) e(`workflow:${w.id}`, `process:${p}`, 'uses');
    for (const c of CATALOG) if (w.uses.families.includes(c.family)) e(`workflow:${w.id}`, `part:${c.id}`, 'choosesFrom');
  }
  for (const p of PROCESSES) {
    for (const l of p.uses?.laws ?? []) e(`process:${p.id}`, `law:${l}`, 'uses');
    for (const m of MATERIALS) if (p.materials.includes(m.category)) e(`process:${p.id}`, `material:${m.id}`, 'works');
  }
  for (const c of CATALOG) {
    for (const l of FAMILY_LAWS[c.family] ?? []) e(`part:${c.id}`, `law:${l}`, 'ratedBy');
    for (const p of FAMILY_PROCESSES[c.family] ?? []) e(`part:${c.id}`, `process:${p}`, 'fittedBy');
  }
  for (const [joint, ps] of Object.entries(JOINT_PROCESSES)) for (const p of ps) e(`joint:${joint}`, `process:${p}`, 'madeBy');
  for (const m of MACHINES) {
    for (const p of m.runs) e(`machine:${m.id}`, `process:${p}`, 'runs');
    for (const f of m.feeds) e(`machine:${m.id}`, `part:${f}`, 'feeds');
  }
  const out = new Map<string, Edge[]>(), into = new Map<string, Edge[]>();
  for (const x of edges) {
    (out.get(x.from) ?? out.set(x.from, []).get(x.from)!).push(x);
    (into.get(x.to) ?? into.set(x.to, []).get(x.to)!).push(x);
  }
  built = { nodes, edges, out, into };
  return built;
}

/** Edges that point at nothing (the graph's integrity: empty when it holds). */
export function dangling(): Edge[] {
  const g = graph();
  return g.edges.filter((x) => !g.nodes.has(x.from) || !g.nodes.has(x.to));
}

/** A node's neighbours, either way, optionally of one relation. */
export function neighbours(id: string, type?: EdgeType): string[] {
  const g = graph();
  const o = (g.out.get(id) ?? []).filter((x) => !type || x.type === type).map((x) => x.to);
  const i = (g.into.get(id) ?? []).filter((x) => !type || x.type === type).map((x) => x.from);
  return [...new Set([...o, ...i])];
}

/** The shortest chain of relations from one node to another (either direction), or null. */
export function path(from: string, to: string, maxDepth = 6): { node: string; via: EdgeType | null }[] | null {
  const g = graph();
  if (!g.nodes.has(from) || !g.nodes.has(to)) return null;
  const prev = new Map<string, { node: string; via: EdgeType }>();
  const seen = new Set([from]);
  let frontier = [from];
  for (let d = 0; d < maxDepth && frontier.length; d++) {
    const next: string[] = [];
    for (const n of frontier) {
      for (const x of [...(g.out.get(n) ?? []).map((y) => ({ to: y.to, type: y.type })), ...(g.into.get(n) ?? []).map((y) => ({ to: y.from, type: y.type }))]) {
        if (seen.has(x.to)) continue;
        seen.add(x.to);
        prev.set(x.to, { node: n, via: x.type });
        if (x.to === to) {
          const chain: { node: string; via: EdgeType | null }[] = [{ node: to, via: x.type }];
          let c = n;
          while (c !== from) { const p = prev.get(c)!; chain.unshift({ node: c, via: p.via }); c = p.node; }
          chain.unshift({ node: from, via: null });
          return chain;
        }
        next.push(x.to);
      }
    }
    frontier = next;
  }
  return null;
}
