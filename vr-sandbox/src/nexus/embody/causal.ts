// What causes what in a machine (docs/NEXUS-FROM-REALITY.md, section 30): its parts as a graph of the flows between
// them, derived from what they are and how they meet, for any machine, never drawn for one. A node is a subsystem of
// the tree (src/nexus/embody/tree.ts), keeping the ids of its parts so every node stays traceable to the hardware; its
// kind is read from the taxonomy of its parts' categories. The edges are what passes between subsystems:
//
//   power      along every conductor, from the end at a store or a source to the end at what it feeds
//   signal     from the controller to every converter it commands, from every sensor to the controller
//   drive      through what touches or is fastened into what, from a converter through what transmits to what acts
//              on the world (a wheel, a rotor, a propeller, a heating face), and along belts from end to end
//   support    up the load path from the ground: each subsystem from the one below it that holds it
//   decision   from each gate (src/nexus/embody/any.ts) to the subsystems it decided
//
// A failure is a node that breaks: a flaw lies in its parts, or a link a machine must have is missing (a converter no
// power reaches, a converter nothing commands, an effector nothing drives, a part the ground does not hold). Tracing
// a node backward gives what it depends on, forward what depends on it: the causal break, followed both ways.

import type { Gate, Machine } from './embody';
import { boxOf, type Flaw, type Part, type V3 } from './part';
import { contacts, loadPath, pathOf } from './tree';

export type CauseKind = 'environment' | 'store' | 'source' | 'conductor' | 'control' | 'sensor' | 'actuator' | 'transmission' | 'effector' | 'structure' | 'gate';
export type Carries = 'power' | 'signal' | 'drive' | 'support' | 'decision';
export interface CNode { id: string; kind: CauseKind; name: string; parts: string[]; at: V3; status: 'holds' | 'fails'; why: string[]; /** All its parts are runs of wire. */ wire?: boolean }
export interface CEdge { from: string; to: string; carries: Carries; via?: string }
export interface Causal { nodes: CNode[]; edges: CEdge[] }
export interface Break { node: string; says: string; law: string; upstream: string[]; downstream: string[] }

/** The kind of what a part does, from where it stands in the taxonomy. */
export function kindOf(p: Part): CauseKind {
  const c = p.category;
  if (/^energy\//.test(c)) return 'store';
  if (/^(circuits\/power|interconnect\/protection)/.test(c)) return 'source';
  if (/^(interconnect\/(conductors|containment|connectors|identification)|fluid\/pipes)/.test(c)) return 'conductor';
  if (/^control\//.test(c)) return 'control';
  if (/^sensing\//.test(c)) return 'sensor';
  if (/^(motion\/actuators|thermal\/heating|thermal\/heat-pump|circuits\/lighting|fluid\/air)/.test(c)) return 'actuator';
  if (/^motion\/(transmission|guides)/.test(c)) return 'transmission';
  if (/^(motion\/(wheels|rotors|brakes|suspension)|thermal\/cooling)/.test(c)) return 'effector';
  return 'structure';
}
const ORDER: CauseKind[] = ['environment', 'store', 'source', 'conductor', 'control', 'sensor', 'actuator', 'transmission', 'effector', 'structure', 'gate'];
/** Where a part's subsystem is: its assembly and what it was made for, the motor whole; each conductor its own, since each feeds one thing. */
const nodeIdOf = (p: Part) => (p.shape.kind === 'wire' && kindOf(p) === 'conductor' ? p.id : pathOf(p).slice(0, 2).join('/'));
// what a subsystem does: the first of these its parts do a quarter of, else what most of them do
const PRECEDENCE: CauseKind[] = ['actuator', 'effector', 'transmission', 'sensor', 'control', 'store', 'source', 'conductor', 'structure'];

export function causalOf(m: Machine): Causal {
  const parts = m.parts, byNode = new Map<string, Part[]>();
  for (const p of parts) { const id = nodeIdOf(p); const l = byNode.get(id) ?? []; l.push(p); byNode.set(id, l); }
  const nodes: CNode[] = [], nodeOfPart = new Map<string, string>();
  for (const [id, ps] of byNode) {
    // a subsystem is what most of its parts do; one that converts power is a converter whatever else it holds
    const counts = new Map<CauseKind, number>(); for (const p of ps) counts.set(kindOf(p), (counts.get(kindOf(p)) ?? 0) + 1);
    const kind: CauseKind = PRECEDENCE.find((k) => (counts.get(k) ?? 0) >= 0.25 * ps.length) ?? [...counts].sort((a, b) => b[1] - a[1] || ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))[0]![0];
    const c: V3 = [0, 0, 0]; for (const p of ps) { const b = boxOf(p).c; c[0] += b[0]; c[1] += b[1]; c[2] += b[2]; }
    nodes.push({ id, kind, name: (ps.length === 1 && ps[0]!.shape.kind === 'wire' ? ps[0]!.name.split(':')[0]! : id.replace(/\//g, ' · ')).replace(/-/g, ' '), parts: ps.map((p) => p.id), at: c.map((x) => x / ps.length) as V3, status: 'holds', why: [], ...(ps.every((p) => p.shape.kind === 'wire') ? { wire: true } : {}) });
    for (const p of ps) nodeOfPart.set(p.id, id);
  }
  const ground: CNode = { id: 'the ground', kind: 'environment', name: 'the ground', parts: [], at: [0, 0, 0], status: 'holds', why: [] };
  nodes.push(ground);
  const node = (id: string) => nodes.find((n) => n.id === id)!;
  const edges: CEdge[] = [], seen = new Set<string>();
  const link = (from: string, to: string, carries: Carries, via?: string) => { if (from === to) return; const k = `${from}>${to}>${carries}`; if (seen.has(k)) return; seen.add(k); edges.push({ from, to, carries, ...(via ? { via } : {}) }); };
  // what a run of wire starts and ends at: the subsystem with a part nearest each end
  const solid = parts.filter((p) => p.shape.kind !== 'wire');
  // a conductor ends at what uses or gives power, where one is near: a beam it is tied along is not its end
  const ELECTRIC: CauseKind[] = ['store', 'source', 'control', 'sensor', 'actuator'];
  const gap = (pt: V3, p: Part) => { const b = boxOf(p); return Math.hypot(...[0, 1, 2].map((k) => Math.max(0, Math.abs(pt[k]! - b.c[k]!) - b.h[k]!)) as [number, number, number]); };
  const nearest = (pt: V3, not: string, electric: boolean) => {
    let best: Part | null = null, d = Infinity, bestE: Part | null = null, dE = Infinity;
    for (const p of solid) { if (nodeOfPart.get(p.id) === not) continue; const dd = gap(pt, p); if (dd < d) { d = dd; best = p; } if (electric && ELECTRIC.includes(kindOf(p)) && dd < dE) { dE = dd; bestE = p; } }
    const pick = bestE && dE <= Math.max(0.25, 3 * d) ? bestE : best;
    return pick ? nodeOfPart.get(pick.id)! : null;
  };
  for (const w of parts.filter((p) => p.shape.kind === 'wire')) {
    const pts = (w.shape as { points: V3[] }).points, self = nodeOfPart.get(w.id)!;
    const electric = kindOf(w) === 'conductor';
    const a = nearest(pts[0]!, self, electric), b = nearest(pts[pts.length - 1]!, self, electric);
    if (!a || !b) continue;
    if (kindOf(w) === 'conductor') {
      // power runs from the end at a store or a source
      const up = (k: CauseKind) => ['store', 'source', 'control'].indexOf(k);
      const [from, to] = up(node(b).kind) >= 0 && (up(node(a).kind) < 0 || up(node(b).kind) < up(node(a).kind)) ? [b, a] : [a, b];
      link(from, self, 'power', w.id); link(self, to, 'power', w.id);
    } else {
      const [from, to] = ORDER.indexOf(node(a).kind) <= ORDER.indexOf(node(b).kind) ? [a, b] : [b, a];
      link(from, to, 'drive', w.id);
    }
  }
  // drive through what touches or is fastened into what, along the chain a converter's motion takes
  const touching = contacts(parts), CHAIN: CauseKind[] = ['actuator', 'transmission', 'effector'];
  for (const [pid, others] of touching) for (const q of others) {
    const a = nodeOfPart.get(pid), b = nodeOfPart.get(q); if (!a || !b || a === b) continue;
    const ka = CHAIN.indexOf(node(a).kind), kb = CHAIN.indexOf(node(b).kind);
    if (ka >= 0 && kb >= 0 && ka < kb) link(a, b, 'drive');
  }
  // the controller commands every converter; every sensor reports to it
  const controls = nodes.filter((n) => n.kind === 'control');
  for (const c of controls) { for (const n of nodes) { if (n.kind === 'actuator') link(c.id, n.id, 'signal'); if (n.kind === 'sensor') link(n.id, c.id, 'signal'); } }
  // support: each subsystem from the one below it on the load path
  const { depth } = loadPath(parts), nodeDepth = new Map<string, number>();
  for (const n of nodes) { const ds = n.parts.map((id) => depth.get(id)).filter((d): d is number => d !== undefined); if (ds.length) nodeDepth.set(n.id, Math.min(...ds)); }
  for (const n of nodes) {
    const d = nodeDepth.get(n.id); if (d === undefined) continue;
    if (d === 0) { link(ground.id, n.id, 'support'); continue; }
    const below = new Map<string, number>();
    for (const pid of n.parts) for (const q of touching.get(pid) ?? []) { const o = nodeOfPart.get(q); const od = o ? nodeDepth.get(o) : undefined; if (o && o !== n.id && od !== undefined && od < d) below.set(o, od); }
    const parent = [...below].sort((a, b) => a[1] - b[1])[0];
    if (parent) link(parent[0], n.id, 'support');
  }
  // the gates, each to what it decided
  for (const g of m.gates ?? []) {
    const gid = `gate: ${g.id}`;
    nodes.push({ id: gid, kind: 'gate', name: `${g.id}: ${g.outcome}`, parts: [], at: [0, 0, 0], status: g.held ? 'holds' : 'fails', why: g.held ? [] : [`${g.question}: ${g.outcome}`] });
    for (const t of decided(g, nodes)) link(gid, t, 'decision');
  }
  // the flaws, in the subsystems their parts or their place lie in
  for (const f of m.flaws) for (const id of flawNodes(f, nodes, nodeOfPart)) { const n = node(id); n.status = 'fails'; n.why.push(`${f.check}: ${f.says}`); }
  return { nodes, edges };
}
function decided(g: Gate, nodes: CNode[]): string[] {
  const unit = g.id.split(/[:/]/)[0]!.trim(), sub = g.id.split(':')[0]!.trim();
  const exact = nodes.filter((n) => n.kind !== 'gate' && (n.id === sub || n.id.startsWith(`${sub}/`)));
  if (exact.length) return exact.map((n) => n.id);
  if (/bus$/.test(g.id)) return nodes.filter((n) => n.kind === 'conductor' || n.kind === 'actuator').map((n) => n.id);
  if (g.id === 'reduction') return nodes.filter((n) => n.kind === 'transmission' && /drive|belt/.test(n.id)).map((n) => n.id);
  if (g.id === 'store') return nodes.filter((n) => n.kind === 'store').map((n) => n.id);
  return nodes.filter((n) => n.kind !== 'gate' && n.id.split('/')[0] === unit).map((n) => n.id);
}
function flawNodes(f: Flaw, nodes: CNode[], nodeOfPart: Map<string, string>): string[] {
  if (f.parts?.length) return [...new Set(f.parts.map((id) => nodeOfPart.get(id)).filter((x): x is string => !!x))];
  const w = f.where;
  const direct = nodeOfPart.get(w); if (direct) return [direct];
  const hits = nodes.filter((n) => n.kind !== 'gate' && (n.id === w || n.id.startsWith(`${w}/`) || n.parts.some((id) => id.startsWith(`${w}/`))));
  return hits.map((n) => n.id);
}

/** Every node a node depends on (up) or that depends on it (down), nearest first. */
export function trace(c: Causal, id: string, dir: 'up' | 'down', carries?: Carries[]): string[] {
  const out: string[] = [], q = [id], seen = new Set([id]);
  while (q.length) {
    const n = q.shift()!;
    for (const e of c.edges) {
      if (carries && !carries.includes(e.carries)) continue;
      const next = dir === 'up' ? (e.to === n ? e.from : null) : (e.from === n ? e.to : null);
      if (next && !seen.has(next)) { seen.add(next); out.push(next); q.push(next); }
    }
  }
  return out;
}

/** The causal breaks: what fails, and the links a machine must have and lacks, each with what it hangs from and what hangs from it. */
export function breaks(c: Causal): Break[] {
  const out: Break[] = [], has = (to: string, k: Carries) => c.edges.some((e) => e.to === to && e.carries === k);
  const flow: Carries[] = ['power', 'signal', 'drive', 'support'];
  const add = (node: string, says: string, law: string) => out.push({ node, says, law, upstream: trace(c, node, 'up', flow), downstream: trace(c, node, 'down', flow) });
  const powered = c.nodes.some((n) => n.kind === 'store' || n.kind === 'source');
  for (const n of c.nodes) {
    if (n.kind === 'gate') { if (n.status === 'fails') add(n.id, n.why[0] ?? 'a gate found nothing that holds', 'a decision is taken by its law'); continue; }
    if (n.status === 'fails') add(n.id, n.why[0] ?? 'it fails', 'every check of its laws holds');
    if (n.kind === 'actuator' && powered && !has(n.id, 'power')) add(n.id, 'no power reaches it', 'every converter has a source');
    if (n.kind === 'actuator' && c.nodes.some((x) => x.kind === 'control') && !has(n.id, 'signal')) add(n.id, 'nothing commands it', 'every converter is commanded');
    // runs of wire are held where they are tied, not by touch
    if (n.kind !== 'environment' && n.parts.length && !n.wire && !has(n.id, 'support')) add(n.id, 'the ground does not hold it', 'every part has a load path to the ground');
  }
  // an effector that moves the machine, with converters about, is driven by one
  if (c.nodes.some((n) => n.kind === 'actuator')) for (const n of c.nodes.filter((x) => x.kind === 'effector' && /wheel|rotor|propeller/.test(x.id))) if (!has(n.id, 'drive') && !c.edges.some((e) => e.to === n.id && e.carries === 'drive')) {
    // a wheel need not be driven where its axle is not; a rotor or a propeller must be
    if (!/wheel/.test(n.id)) add(n.id, 'nothing drives it', 'what acts on the world is driven by a converter');
  }
  return out;
}
