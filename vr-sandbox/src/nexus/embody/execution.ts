// The execution graph of a run: what actually ran to make what stands, from the records the run kept as it ran, and
// nothing drawn for show. Its nodes are what was wanted (the ask's wants, and the quantities the designers read of it),
// what the generator derived (each element a designer read, the rule and the laws it rests on, and the want or element
// that needed it, back to the want), what is missing (the generator's gaps), what the designers did (every step of the
// trace in the order it ran; a decision with its question, inputs, law, what else it tried and what it chose), what
// they made (the subsystems their parts form), what they found (each flaw, with its check and the law it breaks), the
// rounds before this one (what was found and changed), what operating it did (each event, with what asked it and what
// supplied it) and what that taught (the evidence the next design starts from).
//
// Its edges are the dependencies those records state: a read feeds the step it was read for; an element was derived
// for a want or for another element; a step ran after the one before it; a step made a subsystem; a subsystem depends
// on another for power, signal, drive or support; a check found a flaw, which lies in a subsystem. Each node sits at the
// depth of its longest chain of dependencies: the order to walk it in is the graph's own, not a fixed list of stages.
// A domain is not a taxonomy laid over it: it is read from what each node is about (the carrier an element is of, the
// kind of the parts a subsystem is made of).

import type { Intent } from '../want';
import type { Structure } from '../manifold';
import type { Machine } from './embody';
import { causalOf, type Causal } from './causal';
import type { Learned } from './any';
import type { Operation } from './operate';

export type ExecKind = 'want' | 'fact' | 'generated' | 'law' | 'gap' | 'step' | 'decision' | 'built' | 'failure' | 'round' | 'executed' | 'evidence' | 'demand' | 'change' | 'result';
export type Relation = 'reads' | 'derived for' | 'rests on' | 'then' | 'makes' | 'power' | 'signal' | 'drive' | 'support' | 'decision' | 'finds' | 'lies in' | 'controls' | 'redesigned' | 'ran' | 'teaches' | 'asks' | 'changes' | 'results';
export interface ExecNode {
  id: string; kind: ExecKind; label: string;
  /** Why it is: the rule, the law, the question it answered, what asked it. */
  why: string;
  law?: string;
  /** What it is about, read from it: a carrier, a part's kind, the check's name. */
  domain: string;
  value?: { v: number | null; unit: string };
  /** For a decision: every way it tried, and what came of each. */
  tried?: string[];
  /** Where it rests on an estimate or an assumption rather than the ask or a source: the grounds. */
  assumed?: string;
  /** What is not known here: the gap. */
  unknown?: string;
  /** For a check or a decision: whether it held. */
  held?: boolean;
  /** Its depth along the longest chain of what it depends on. */
  depth: number;
  /** On a retry: what it was the time before. */
  was?: string;
  /** What the run recorded of it, by what is asked of it: its geometry, material, scale, position, interfaces, energy, information, timing. */
  facts?: Partial<Record<Fact, string>>;
}
export type Fact = 'geometry' | 'material' | 'scale' | 'position' | 'interface' | 'energy' | 'information' | 'timing';
export interface ExecEdge { from: string; to: string; rel: Relation }
export interface Execution { nodes: ExecNode[]; edges: ExecEdge[]; domains: string[] }

const short = (t: string, n = 140) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
const lawId = (t: string) => `law:${t.slice(0, 80)}`;

export function executionOf(intent: Intent, s: Structure, m: Machine, o: { operation?: Operation; learned?: Learned; assumed?: string[] } = {}): Execution {
  const nodes = new Map<string, ExecNode>(), edges: ExecEdge[] = [];
  const add = (n: Omit<ExecNode, 'depth'>) => { if (!nodes.has(n.id)) nodes.set(n.id, { ...n, depth: 0 }); return n.id; };
  const link = (from: string, to: string, rel: Relation) => { if (from !== to && nodes.has(from) && nodes.has(to) && !edges.some((e) => e.from === from && e.to === to && e.rel === rel)) edges.push({ from, to, rel }); };

  // ---- what was wanted ----
  for (const w of intent.wants) {
    const b = w.lo ?? w.hi;
    add({ id: `want:${w.id}`, kind: 'want', label: w.says, why: `the person's ask: ${w.quantity.name} ${w.lo ? 'at least' : 'at most'} ${b?.value ?? '?'} ${b?.unit ?? ''}`.trim(), domain: w.quantity.carrier ?? w.quantity.name, value: b ? { v: b.value, unit: b.unit } : undefined, ...(b && /estimat|assum/.test(b.origin.class) ? { assumed: b.origin.grounds ?? b.origin.class } : {}) });
  }
  // ---- what the generator derived, back along each element's lineage to the want that asked it ----
  const elements = new Map(s.elements.map((e) => [e.id, e]));
  const element = (id: string, depthGuard = 0): string | null => {
    const e = elements.get(id); if (!e || depthGuard > 24) return null;
    const nid = add({ id: `el:${e.id}`, kind: 'generated', label: short(e.says, 90), why: `${e.why.rule}${e.why.laws.length ? `, resting on ${e.why.laws.join(', ')}` : ''}`, domain: e.carrier || e.kind });
    for (const l of e.why.laws) { add({ id: `gen:${l}`, kind: 'law', label: l, why: 'a law the generator derived for this ask', domain: e.carrier || e.kind, law: l }); link(`gen:${l}`, nid, 'rests on'); }
    if (e.why.parent) { const p = element(e.why.parent, depthGuard + 1); if (p) link(p, nid, 'derived for'); }
    else if (e.why.want) link(`want:${e.why.want}`, nid, 'derived for');
    return nid;
  };
  for (const g of s.gaps) {
    const id = add({ id: `gap:${g.want ?? ''}:${g.element ?? ''}:${g.lacks.slice(0, 40)}`, kind: 'gap', label: short(`lacks ${g.lacks}`, 90), why: `the generator found no ${g.kind ?? 'law'} for it`, unknown: g.lacks, domain: g.carrier ?? g.distinction ?? 'unknown' });
    if (g.element && element(g.element)) link(`el:${g.element}`, id, 'derived for'); else if (g.want) link(`want:${g.want}`, id, 'derived for');
  }

  // ---- what the designers did, step by step, and what each read ----
  const gates = new Map((m.gates ?? []).map((g) => [g.id, g]));
  const stepIds = m.trace.map((st, i) => {
    const g = st.stage === 'choose' ? gates.get(st.where) : undefined;
    const id = add({ id: `step:${i}`, kind: g ? 'decision' : 'step', label: short(st.says, 110), why: g ? `${g.question}: ${g.outcome}` : `${st.stage} of ${st.where}${st.remedy ? `, remedied by ${st.remedy}` : ''}`, ...(g ? { law: g.law, tried: g.tried, held: g.held } : { held: !st.flaws.length }), domain: st.where === 'learned' ? 'learned' : st.stage === 'choose' ? st.where.split(':')[0]!.split('/')[0]! : st.where.split('/')[0]! });
    if (g) { const l = add({ id: lawId(g.law), kind: 'law', label: short(g.law, 110), why: 'the law this decision was taken by', law: g.law, domain: nodes.get(id)!.domain }); link(l, id, 'controls'); }
    if (i > 0) link(`step:${i - 1}`, id, 'then');
    return id;
  });
  for (const r of m.reads ?? []) {
    const to = stepIds[Math.min(r.step, stepIds.length - 1)]; if (!to) continue;
    let from: string | null = null;
    if (r.kind === 'want') from = nodes.has(`want:${r.id}`) ? `want:${r.id}` : null;
    else if (r.kind === 'element') from = element(r.id);
    else {
      const leaf = intent.regions.find((x) => x.id === r.id)?.quantities;
      const l = leaf && Object.values(leaf).find((x) => x.name === r.name);
      from = add({ id: `fact:${r.id}:${r.name}`, kind: 'fact', label: `${r.name}: ${r.value ?? '?'} ${r.unit}`, why: l ? `${l.origin.class}${l.origin.source ? `: ${l.origin.source}` : ''}${l.origin.grounds ? `: ${l.origin.grounds}` : ''}` : 'a quantity of the ask', domain: r.id, value: { v: r.value, unit: r.unit }, ...(l && /estimat|assum/.test(l.origin.class) ? { assumed: l.origin.grounds ?? l.origin.class } : {}) });
    }
    if (from) link(from, to, 'reads');
  }

  // ---- what they made: the subsystems, and what each depends on ----
  const causal: Causal = causalOf(m);
  const subOf = new Map<string, string>();
  for (const n of causal.nodes) {
    const kinds = new Map<string, number>();
    for (const pid of n.parts) { const p = m.parts.find((x) => x.id === pid); const k = p?.category.split('/')[0] ?? n.kind; kinds.set(k, (kinds.get(k) ?? 0) + 1); subOf.set(pid, n.id); }
    const domain = [...kinds].sort((a, b) => b[1] - a[1])[0]?.[0] ?? n.kind;
    add({ id: `sub:${n.id}`, kind: 'built', label: `${n.name}: ${n.parts.length} part${n.parts.length === 1 ? '' : 's'}`, why: `${n.kind}${n.why.length ? `: ${n.why.join('; ')}` : ''}`, domain, held: n.status === 'holds', facts: factsOf(m.parts.filter((p) => n.parts.includes(p.id))) });
  }
  for (const e of causal.edges) link(`sub:${e.from}`, `sub:${e.to}`, e.carries as Relation);
  // what passes in and out of each subsystem: its interfaces, its energy, its information
  for (const n of causal.nodes) {
    const node = nodes.get(`sub:${n.id}`)!, f = node.facts ?? (node.facts = {});
    const io = (c: string) => causal.edges.filter((e) => e.carries === c && (e.from === n.id || e.to === n.id)).map((e) => `${e.from === n.id ? 'to' : 'from'} ${causal.nodes.find((k) => k.id === (e.from === n.id ? e.to : e.from))?.name ?? '?'}${e.via ? ` by ${e.via}` : ''}`);
    const all = causal.edges.filter((e) => e.from === n.id || e.to === n.id);
    if (all.length) f.interface = `${all.length}: ${[...new Set(all.map((e) => e.carries))].join(', ')}${all.some((e) => e.via) ? `, through ${[...new Set(all.filter((e) => e.via).map((e) => e.via))].slice(0, 3).join(', ')}` : ''}`;
    if (io('power').length) f.energy = `power ${io('power').slice(0, 4).join('; ')}`;
    if (io('signal').length || io('decision').length) f.information = [...io('signal'), ...io('decision')].slice(0, 4).join('; ');
  }
  m.trace.forEach((st, i) => {
    const head = st.where.split(':')[0]!;
    for (const n of causal.nodes) if (n.id === head || n.id.startsWith(`${head}/`) || head.startsWith(`${n.id}/`) || n.id.split('/')[0] === head) link(`step:${i}`, `sub:${n.id}`, 'makes');
  });

  // ---- what they found ----
  const failure = (f: Machine['flaws'][number], key: string, from: string | undefined) => {
    const id = add({ id: `flaw:${key}`, kind: 'failure', label: short(f.says, 110), why: `the ${f.check} check: ${f.value} against ${f.limit}`, law: f.law, domain: f.check, held: false, ...(f.remedy ? {} : { unknown: 'no remedy a rule knows' }) });
    if (from) link(from, id, 'finds');
    const l = add({ id: lawId(f.law), kind: 'law', label: short(f.law, 110), why: 'the law the check holds it to', law: f.law, domain: f.check }); link(l, id, 'controls');
    for (const pid of f.parts ?? []) { const sub = subOf.get(pid); if (sub) link(id, `sub:${sub}`, 'lies in'); }
    return id;
  };
  const seen = new Set<string>();
  m.trace.forEach((st, i) => st.flaws.forEach((f, k) => { seen.add(`${f.check}|${f.where}|${f.says}`); failure(f, `${i}:${k}`, `step:${i}`); }));
  const last = stepIds.at(-1);
  m.flaws.forEach((f, k) => { if (!seen.has(`${f.check}|${f.where}|${f.says}`)) failure(f, `whole:${k}`, last); });

  // ---- the rounds before this one ----
  m.rounds.slice(0, -1).forEach((r) => {
    const id = add({ id: `round:${r.n}`, kind: 'round', label: `round ${r.n}: ${r.flaws.length} flaw${r.flaws.length === 1 ? '' : 's'}, ${r.mass.toFixed(1)} kg`, why: r.remedies.length ? `changed for the next: ${r.remedies.join('; ')}` : 'nothing a rule remedies', domain: 'rounds', held: !r.flaws.length });
    if (r.n > 1) link(`round:${r.n - 1}`, id, 'redesigned');
  });
  const lastRound = m.rounds.length > 1 ? `round:${m.rounds.at(-2)!.n}` : null;
  if (lastRound && stepIds[0]) link(lastRound, stepIds[0], 'redesigned');

  // ---- what operating it did, and what that taught ----
  o.operation?.events.forEach((ev, i) => {
    const sub0 = causal.nodes.find((n) => n.id === ev.node || ev.node.startsWith(n.id)); if (sub0) { const f = nodes.get(`sub:${sub0.id}`)!.facts ??= {}; f.timing = `${f.timing ? `${f.timing}; ` : ''}${ev.t.toFixed(1)} s into "${o.operation!.duty}": ${ev.says}`.slice(0, 300); }
    const id = add({ id: `event:${i}`, kind: 'executed', label: short(`${ev.t.toFixed(1)} s: ${ev.says}`, 110), why: `asked by ${ev.demand.join(', ') || 'its duty'}; supplied by ${ev.supply.join(', ') || 'nothing named'}`, law: ev.law, domain: ev.check, held: false });
    const sub = causal.nodes.find((n) => n.id === ev.node || ev.node.startsWith(n.id)); if (sub) link(`sub:${sub.id}`, id, 'ran');
  });
  (o.learned?.why ?? []).forEach((w, i) => {
    const id = add({ id: `learned:${i}`, kind: 'evidence', label: short(w, 110), why: 'what operating it found the design must meet', domain: 'learned' });
    o.operation?.events.forEach((_, k) => link(`event:${k}`, id, 'teaches'));
    m.trace.forEach((st, k) => { if (st.where === 'learned') link(id, `step:${k}`, 'teaches'); });
  });

  // ---- what it came to ----
  const mass = m.parts.reduce((a, p) => a + p.mass, 0);
  const result = add({ id: 'result', kind: 'result', label: `${m.name}: ${m.parts.length} parts, ${mass.toFixed(mass >= 100 ? 0 : 2)} kg, ${m.flaws.length} flaw${m.flaws.length === 1 ? '' : 's'} left`, why: `after ${m.rounds.length} round${m.rounds.length === 1 ? '' : 's'}`, domain: 'result', held: !m.flaws.length });
  if (last) link(last, result, 'results');
  for (const n of nodes.values()) if (n.kind === 'failure' || n.kind === 'executed') link(n.id, result, 'results');
  for (const a of o.assumed ?? []) { const id = add({ id: `assumed:${a.slice(0, 60)}`, kind: 'fact', label: short(`assumed: ${a}`, 100), why: 'not in the words: an estimate on stated grounds', assumed: a, domain: 'ask' }); for (const w of intent.wants) link(id, `want:${w.id}`, 'asks'); }

  depthOf([...nodes.values()], edges);
  return { nodes: [...nodes.values()], edges, domains: [...new Set([...nodes.values()].map((n) => n.domain))] };
}

/** What a set of parts is, as they were made: their shapes and extent, their materials, their largest size, where they stand. */
function factsOf(ps: Machine['parts']): Partial<Record<Fact, string>> {
  if (!ps.length) return {};
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const half = (p: Machine['parts'][number]): [number, number, number] => { const sh = p.shape; return sh.kind === 'block' ? [sh.size[0] / 2, sh.size[1] / 2, sh.size[2] / 2] : sh.kind === 'round' ? [Math.max(sh.r, sh.length / 2), Math.max(sh.r, sh.length / 2), Math.max(sh.r, sh.length / 2)] : [0.005, 0.005, 0.005]; };
  for (const p of ps) {
    const pts = p.shape.kind === 'wire' ? p.shape.points : [p.at];
    for (const q of pts) { const h = p.shape.kind === 'wire' ? [0, 0, 0] : half(p); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k]!, q[k]! - h[k]!); hi[k] = Math.max(hi[k]!, q[k]! + h[k]!); } }
  }
  const ext = hi.map((h, k) => h - lo[k]!), kinds = new Map<string, number>(), mats = new Map<string, number>();
  for (const p of ps) { kinds.set(p.shape.kind, (kinds.get(p.shape.kind) ?? 0) + 1); mats.set(p.material, (mats.get(p.material) ?? 0) + 1); }
  const mm = (x: number) => (x >= 1 ? `${x.toFixed(2)} m` : `${(x * 1e3).toFixed(0)} mm`);
  return {
    geometry: `${[...kinds].map(([k, c]) => `${c} ${k}`).join(', ')}, spanning ${ext.map(mm).join(' × ')}`,
    material: [...mats].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, c]) => `${k}${c > 1 ? ` (${c})` : ''}`).join('; '),
    scale: `${mm(Math.max(...ext))} at its largest, ${ps.reduce((a, p) => a + p.mass, 0).toFixed(2)} kg`,
    position: `centred at (${lo.map((l, k) => ((l + hi[k]!) / 2).toFixed(2)).join(', ')}) m`,
  };
}

/** Each node at the depth of its longest chain of what it depends on; a cycle (two subsystems holding each other) is cut where it closes. */
function depthOf(nodes: ExecNode[], edges: ExecEdge[]): void {
  const into = new Map<string, string[]>();
  for (const e of edges) into.set(e.to, [...(into.get(e.to) ?? []), e.from]);
  const memo = new Map<string, number>(), on = new Set<string>();
  const d = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (on.has(id)) return 0;
    on.add(id);
    const v = Math.max(0, ...(into.get(id) ?? []).map((f) => d(f) + 1));
    on.delete(id); memo.set(id, v); return v;
  };
  for (const n of nodes) n.depth = d(n.id);
}

/** A retry as part of the graph: what was there, what you asked, what that changed, and the new run, each node that differs marked with what it was. */
export function retryOf(before: Execution, demand: string, changed: string[], after: Execution): Execution {
  const was = new Map(before.nodes.map((n) => [n.id, n.label]));
  const nodes: ExecNode[] = after.nodes.map((n) => (was.has(n.id) && was.get(n.id) !== n.label ? { ...n, was: was.get(n.id)! } : n));
  const edges = [...after.edges];
  const prev = before.nodes.find((n) => n.id === 'result');
  nodes.push({ id: 'before', kind: 'result', label: `before: ${prev?.label ?? 'the last run'}`, why: 'what stood when you asked', domain: 'history', depth: 0, held: prev?.held });
  nodes.push({ id: 'demand', kind: 'demand', label: `you: ${short(demand, 100)}`, why: 'your critique, as input to the ask', domain: 'you', depth: 1 });
  edges.push({ from: 'before', to: 'demand', rel: 'asks' });
  changed.forEach((c, i) => {
    const id = `change:${i}`;
    nodes.push({ id, kind: 'change', label: c, why: 'what your demand changed in the ask', domain: 'you', depth: 2 });
    edges.push({ from: 'demand', to: id, rel: 'changes' });
    const kind = c.split(' ')[0]!;
    for (const n of nodes) if (n.kind === 'want' && new RegExp(kind === 'mass' ? 'mass|carr|load' : kind === 'speed' ? 'speed|veloc' : kind === 'range' ? 'distance|range' : kind, 'i').test(`${n.label} ${n.why}`)) edges.push({ from: id, to: n.id, rel: 'changes' });
  });
  if (!changed.length) {
    nodes.push({ id: 'change:none', kind: 'change', label: 'nothing in the ask changed: no law reads this yet', why: 'sent to Claude Code as the law to write', unknown: demand, domain: 'you', depth: 2 });
    edges.push({ from: 'demand', to: 'change:none', rel: 'changes' });
  }
  depthOf(nodes, edges);
  return { nodes, edges, domains: [...new Set(nodes.map((n) => n.domain))] };
}

export type Question = 'why' | 'law' | 'depends' | 'remove' | 'assumed' | 'unknown' | 'failed' | 'alternatives' | 'changed' | 'here' | 'calls' | 'calledBy' | 'before' | 'after' | 'modified' | Fact;
/** What the graph says to a question about one of its nodes: from its own records and its edges, nothing else. */
export function explain(x: Execution, id: string, q: Question): string {
  const n = x.nodes.find((k) => k.id === id); if (!n) return 'No such node in this run.';
  const by = new Map(x.nodes.map((k) => [k.id, k]));
  const out = (from: string, skip: Relation[] = []) => x.edges.filter((e) => e.from === from && !skip.includes(e.rel));
  const inn = (to: string) => x.edges.filter((e) => e.to === to);
  const closure = (from: string, dir: 'down' | 'up', skip: Relation[]) => {
    const seen = new Set<string>(), stack = [from];
    while (stack.length) { const c = stack.pop()!; for (const e of dir === 'down' ? out(c, skip) : inn(c).filter((k) => !skip.includes(k.rel))) { const nx = dir === 'down' ? e.to : e.from; if (!seen.has(nx)) { seen.add(nx); stack.push(nx); } } }
    seen.delete(from); return [...seen].map((k) => by.get(k)!).filter(Boolean);
  };
  const names = (ns: ExecNode[], k = 5) => `${ns.slice(0, k).map((m) => m.label).join('; ')}${ns.length > k ? ` and ${ns.length - k} more` : ''}`;
  switch (q) {
    case 'why': return `${n.label}. ${n.why}.${inn(id).length ? ` It takes ${names(inn(id).map((e) => by.get(e.from)!).filter(Boolean), 4)}.` : ''}`;
    case 'here': { const ins = inn(id).filter((e) => e.rel !== 'then'); return ins.length ? `Here because ${names(ins.map((e) => by.get(e.from)!).filter(Boolean), 4)} ${ins.length === 1 ? 'leads' : 'lead'} to it (${[...new Set(ins.map((e) => e.rel))].join(', ')}), at depth ${n.depth} of the chain.` : 'Nothing comes before it: it is where this run starts.'; }
    case 'law': { const ls = inn(id).map((e) => by.get(e.from)!).filter((k) => k?.kind === 'law'); return n.law ? `${n.law}${ls.length > 1 ? `; and ${names(ls.slice(1), 3)}` : ''}` : ls.length ? names(ls, 3) : 'No law is recorded as controlling this node; what it rests on is what it read.'; }
    case 'depends': { const d = out(id, ['then']).map((e) => by.get(e.to)!).filter(Boolean); return d.length ? `${d.length} depend on it directly: ${names(d)}.` : 'Nothing depends on it.'; }
    case 'remove': { const d = closure(id, 'down', ['then', 'results']); return d.length ? `Without it, ${d.length} would lose what they rest on: ${names(d)}.` : 'Nothing rests on it: removing it changes nothing else here.'; }
    case 'assumed': { const a = [n, ...closure(id, 'up', ['then'])].filter((k) => k.assumed); return a.length ? a.slice(0, 4).map((k) => `${k.label} (${k.assumed})`).join('; ') : 'Nothing it rests on is an estimate or an assumption: all of it is the ask or a source.'; }
    case 'unknown': { const u = [n, ...closure(id, 'up', ['then']), ...closure(id, 'down', ['then'])].filter((k) => k.unknown); return u.length ? u.slice(0, 4).map((k) => `${k.label}: ${k.unknown}`).join('; ') : 'Nothing unknown on its chain.'; }
    case 'failed': { const f = [n, ...closure(id, 'down', ['then'])].filter((k) => k.kind === 'failure' || k.held === false); return f.length ? `${f.length} failed: ${names(f, 4)}.` : 'Every check on its chain held.'; }
    case 'alternatives': return n.tried?.length ? `Tried: ${n.tried.join(' | ')}. Chose: ${n.why.split(': ').slice(1).join(': ')}.` : 'No other way was tried here: it is the one the law gives.';
    case 'changed': return n.was ? `Before: ${n.was}. Now: ${n.label}.` : x.nodes.some((k) => k.id === 'demand') ? 'Unchanged on the retry.' : 'This is the first run: nothing to compare.';
    case 'calls': { const o2 = out(id, ['then']); return o2.length ? `It calls ${o2.length}: ${o2.slice(0, 5).map((e) => `${by.get(e.to)?.label} (${e.rel})`).join('; ')}${o2.length > 5 ? ` and ${o2.length - 5} more` : ''}.` : 'It calls nothing recorded.'; }
    case 'calledBy': { const i2 = inn(id).filter((e) => e.rel !== 'then'); return i2.length ? `Called by ${i2.length}: ${i2.slice(0, 5).map((e) => `${by.get(e.from)?.label} (${e.rel})`).join('; ')}${i2.length > 5 ? ` and ${i2.length - 5} more` : ''}.` : 'Nothing recorded calls it: it is where this run starts.'; }
    case 'before': { const u = closure(id, 'up', ['then']); return u.length ? `${u.length} must exist before it: ${names(u)}.` : 'Nothing must exist before it.'; }
    case 'after': { const d = closure(id, 'down', ['then']); return d.length ? `${d.length} become possible after it: ${names(d)}.` : 'Nothing is recorded as resting on it.'; }
    case 'modified': { const d = closure(id, 'down', ['then', 'results']).filter((k) => k.kind !== 'law'); return d.length ? `Change it and these are made again from it: ${names(d)}.` : 'Changing it changes nothing else recorded.'; }
    default: { const f = n.facts?.[q]; return f ? `Its ${q}: ${f}.` : `Its ${q} is not recorded for this ${n.kind}: a gap in what the run keeps, not an answer.`; }
  }
}
