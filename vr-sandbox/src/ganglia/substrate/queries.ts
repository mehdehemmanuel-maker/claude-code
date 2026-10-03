// The final test's questions, each answered by traversing the substrate, never by retrieving a document: every way to
// store energy, every mechanism for a function, materials for a role with their tradeoffs, the variants a manifold
// generates, the parts of a thing and what makes them and what makes that, analogues across domains, structures in
// two views at once, the lineage of a thing from physical primitives, and the construction path to a missing part.
import type { Entity, Relation } from './model';
import { normalizeId } from './model';
import type { Substrate } from './substrate';

export interface Found { entity: Entity; how: string; depth: number }

/** Everything under an entity by refinement (is-a, read backwards), with the entity itself. */
export function family(s: Substrate, id: string, depth = 6): Entity[] {
  const root = s.get(id);
  if (!root) return [];
  return [root, ...s.traverse(id, ['generalizes'], depth).map((x) => x.entity)];
}

/** What implements a function: things that do it, or do a function refined from it, and their own refinements. */
export function implementations(s: Substrate, fn: string): Found[] {
  const out = new Map<string, Found>();
  for (const f of family(s, fn, 4)) {
    const doers = [...s.reach(f.id, 'done-by'), ...s.reach(f.id, 'transformed-by')];
    for (const d of doers) {
      if (!out.has(d.id)) out.set(d.id, { entity: d, how: f.id === fn ? `does ${fn}` : `does ${f.id}, a refinement of ${fn}`, depth: 1 });
      for (const sub of s.traverse(d.id, ['generalizes'], 3)) if (!out.has(sub.entity.id)) out.set(sub.entity.id, { entity: sub.entity, how: `is a ${d.id}, which does ${f.id}`, depth: 1 + sub.depth });
    }
  }
  return [...out.values()].sort((a, b) => a.depth - b.depth || a.entity.id.localeCompare(b.entity.id));
}

/** Every known way to store a quantity: the mechanisms under the function and everything that implements it. */
export function waysToStore(s: Substrate, quantity = 'energy'): { mechanisms: Entity[]; implementations: Found[] } {
  const fn = `store.${quantity}`;
  const mechanisms = family(s, fn, 6).filter((e) => e.kinds.includes('mechanism') || e.kinds.includes('architecture') || e.kinds.includes('component')).filter((e) => e.id !== fn);
  return { mechanisms, implementations: implementations(s, fn) };
}

export interface MaterialRow { entity: Entity; conductivity?: number; density?: number; yieldStrength?: number; perMass?: number; why: string; /** set when the numbers are those of the family's members, not its own */ derivedFrom?: string[] }

/** Materials that can fill a role, with the numbers that trade off between them. */
export function materialsForRole(s: Substrate, role: string): MaterialRow[] {
  const rows: MaterialRow[] = [];
  for (const r of s.into(role, 'plays')) {
    const e = s.entities.get(r.from)!;
    if (!e.kinds.includes('material')) continue;
    const own = (x: Entity, sym: string) => x.params?.find((p) => p.sym === sym)?.low;
    let conductivity = own(e, 'sigma'), density = own(e, 'rho'), yieldStrength = own(e, 'sigma_y');
    let derivedFrom: string[] | undefined;
    if (conductivity === undefined) {
      // a family (copper alloys, metals) has no number of its own: the best of its members stands for it, and says so
      const members = s.traverse(e.id, ['generalizes'], 3).map((t) => t.entity).filter((m) => own(m, 'sigma') !== undefined);
      if (members.length) {
        const best = members.reduce((a, b) => (own(b, 'sigma')! > own(a, 'sigma')! ? b : a));
        conductivity = own(best, 'sigma'); density ??= own(best, 'rho'); yieldStrength ??= own(best, 'sigma_y');
        derivedFrom = members.map((m) => m.id);
      }
    }
    rows.push({ entity: e, conductivity, density, yieldStrength, perMass: conductivity && density ? conductivity / density : undefined, why: r.says ?? `plays ${role}`, ...(derivedFrom ? { derivedFrom } : {}) });
  }
  const rank = (r: MaterialRow) => (r.conductivity === undefined ? 2 : r.derivedFrom ? 1 : 0);
  return rows.sort((a, b) => rank(a) - rank(b) || (b.conductivity ?? 0) - (a.conductivity ?? 0) || (b.yieldStrength ?? 0) - (a.yieldStrength ?? 0));
}

/** The variation space of a thing: its parameters, its refinements, and what generates them. */
export function variants(s: Substrate, id: string): { entity: Entity; parameters: NonNullable<Entity['params']>; kinds: Entity[]; manifolds: Entity[] } | null {
  const e = s.get(id);
  if (!e) return null;
  const kinds = s.traverse(id, ['generalizes'], 2).map((x) => x.entity);
  const manifolds = [...s.reach(id, 'is-a'), ...s.reach(id, 'varies-by')].filter((m) => m.kinds.includes('manifold') || m.kinds.includes('parameter'));
  return { entity: e, parameters: e.params ?? [], kinds, manifolds };
}

export interface Tree { entity: Entity; via: string; children: Tree[] }

/** A thing decomposed: its parts and what it is made of, to a depth, each level labelled by how it was reached. */
export function decompose(s: Substrate, id: string, depth = 4, seen = new Set<string>()): Tree | null {
  const e = s.get(id);
  if (!e) return null;
  seen.add(e.id);
  const children: Tree[] = [];
  if (depth > 0) {
    for (const r of [...s.outOf(e.id, 'has-part'), ...s.outOf(e.id, 'made-of')]) {
      if (seen.has(r.to)) continue;
      const sub = decompose(s, r.to, depth - 1, seen);
      if (sub) children.push({ ...sub, via: r.kind });
    }
  }
  return { entity: e, via: 'root', children };
}

/** The leaves of a decomposition: what it is made of when nothing further is known. */
export function leavesOf(t: Tree): Entity[] { return t.children.length ? t.children.flatMap(leavesOf) : [t.entity]; }

export interface ProducerStep { entity: Entity; by: Entity[]; depth: number }

/**
 * What can produce a thing, and what can produce that: processes and the machines they require, followed until the
 * chain repeats (a machine tool among the makers of machine tools) or runs out.
 */
export function producers(s: Substrate, id: string, depth = 4): { steps: ProducerStep[]; cycle: string[] } {
  const steps: ProducerStep[] = [];
  const seen = new Set<string>();
  const cycle: string[] = [];
  let frontier = [normalizeId(id)];
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: string[] = [];
    for (const f of frontier) {
      const e = s.entities.get(f);
      if (!e) continue;
      const by = [...s.reach(f, 'produced-by'), ...(e.kinds.includes('process') ? s.reach(f, 'requires').filter((x) => x.kinds.includes('constructor') || x.kinds.includes('system')) : [])];
      if (!by.length) continue;
      steps.push({ entity: e, by, depth: d });
      for (const b of by) {
        if (seen.has(b.id)) { if (b.kinds.includes('constructor') && !cycle.includes(b.id)) cycle.push(b.id); continue; }
        seen.add(b.id);
        next.push(b.id);
      }
    }
    frontier = next;
  }
  return { steps, cycle };
}

/** Analogues of a thing in another domain: said directly, or found by sharing a function with something there. */
export function analogues(s: Substrate, id: string, domain?: string): { entity: Entity; why: string }[] {
  const out = new Map<string, { entity: Entity; why: string }>();
  for (const r of [...s.outOf(id, 'analogous-to'), ...s.into(id, 'analogous-to')]) {
    const other = s.entities.get(r.from === normalizeId(id) ? r.to : r.from)!;
    if (!domain || other.domains.includes(domain)) out.set(other.id, { entity: other, why: r.says ?? 'said to be analogous' });
  }
  // by function: anything doing a function this thing does, in the asked domain
  for (const fn of s.reach(id, 'does')) for (const d of s.reach(fn.id, 'done-by')) if (d.id !== normalizeId(id) && (!domain || d.domains.includes(domain)) && !out.has(d.id)) out.set(d.id, { entity: d, why: `both do ${fn.id}` });
  // by what it is: a biological thing that is-a mechanical kind, or the reverse
  for (const k of s.reach(id, 'is-a')) for (const other of s.reach(k.id, 'generalizes')) if (other.id !== normalizeId(id) && (!domain || other.domains.includes(domain)) && !out.has(other.id)) out.set(other.id, { entity: other, why: `both are a ${k.id}` });
  return [...out.values()];
}

/**
 * Structures in a system that take part in two views at once (a bone is mechanical and biological). A criterion is a
 * view id (`view.mechanical`) or a domain (`biology`): a thing meets a domain when it is of that domain.
 */
export function dualRole(s: Substrate, system: string, viewA: string, viewB: string): { entity: Entity; views: string[] }[] {
  const parts = decompose(s, system, 5);
  if (!parts) return [];
  const all = new Map<string, Entity>();
  const walk = (t: Tree) => { all.set(t.entity.id, t.entity); t.children.forEach(walk); };
  walk(parts);
  const out: { entity: Entity; views: string[] }[] = [];
  for (const e of all.values()) {
    const views = s.reach(e.id, 'in-view').map((v) => v.id);
    const has = (v: string) => (v.startsWith('view.') ? views.includes(v) : e.domains.includes(v));
    if (has(viewA) && has(viewB)) out.push({ entity: e, views });
  }
  return out;
}

/** The generative lineage of a thing from physical primitives upward: one path of made-of and has-part to the bottom, reversed. */
export function lineage(s: Substrate, id: string, maxDepth = 12): Entity[] {
  const path: Entity[] = [];
  const seen = new Set<string>();
  let cur = s.get(id);
  while (cur && path.length < maxDepth && !seen.has(cur.id)) {
    seen.add(cur.id);
    path.push(cur);
    // prefer what it is made of (substance) over what it has (structure); among those, the one with the deepest own lineage
    let next = [...s.reach(cur.id, 'made-of'), ...s.reach(cur.id, 'has-part')].filter((e) => !seen.has(e.id));
    // a thing with no parts said of it is what it is a kind of (an element is an atom, and an atom has parts)
    if (!next.length) next = s.reach(cur.id, 'is-a').filter((e) => !seen.has(e.id) && (s.outOf(e.id, 'has-part').length || s.outOf(e.id, 'made-of').length));
    if (!next.length) break;
    const deeper = next.map((e) => ({ e, n: s.outOf(e.id, 'made-of').length + s.outOf(e.id, 'has-part').length }));
    deeper.sort((a, b) => b.n - a.n);
    cur = deeper[0]!.e;
  }
  return path.reverse();
}

/** Mechanisms for a behaviour said in words, found through the function it names: nothing retrieved from a stored machine. */
export function mechanismsFor(s: Substrate, words: string): { function: Entity | null; mechanisms: Found[] } {
  const w = words.toLowerCase();
  const fns = s.ofKind('function').filter((f) => f.says.toLowerCase().includes(w) || f.name.toLowerCase().includes(w) || f.id.includes(w.replace(/\s+/g, '.')));
  const fn = fns[0] ?? null;
  return { function: fn, mechanisms: fn ? implementations(s, fn.id) : [] };
}

export interface PathStep { entity: Entity; need: 'have' | 'make' | 'acquire'; by: Entity[]; depth: number }

/**
 * The knowledge and manufacturing path to a missing thing: what it requires and what produces it, recursively, until
 * everything is something this world can run or place (in view "available here"), or a gap is named.
 */
export function constructionPath(s: Substrate, id: string, depth = 4): { steps: PathStep[]; gaps: Entity[] } {
  const steps: PathStep[] = [];
  const gaps: Entity[] = [];
  const seen = new Set<string>();
  const available = (e: Entity) => s.reach(e.id, 'in-view').some((v) => v.id === 'view.available-here');
  const walk = (eid: string, d: number) => {
    const e = s.entities.get(normalizeId(eid));
    if (!e || seen.has(e.id)) return;
    seen.add(e.id);
    if (available(e)) { steps.push({ entity: e, need: 'have', by: [], depth: d }); return; }
    const by = s.reach(e.id, 'produced-by');
    const needs = s.reach(e.id, 'requires');
    const parts = s.reach(e.id, 'has-part');
    if (!by.length && !parts.length && !needs.length) { steps.push({ entity: e, need: 'acquire', by: [], depth: d }); if (!e.kinds.includes('material') && !e.kinds.includes('law')) gaps.push(e); return; }
    steps.push({ entity: e, need: 'make', by, depth: d });
    if (d >= depth) return;
    for (const x of [...by, ...needs, ...parts]) walk(x.id, d + 1);
  };
  walk(id, 0);
  return { steps, gaps };
}

/** Everything about one thing, as the index answers it: each question with its answers. */
export function index(s: Substrate, id: string): { entity: Entity; answers: { asks: string; kind: Relation['kind']; entities: Entity[]; backwards: boolean }[] } | null {
  const e = s.get(id);
  if (!e) return null;
  const answers: { asks: string; kind: Relation['kind']; entities: Entity[]; backwards: boolean }[] = [];
  const kinds = new Map<string, { fwd: Entity[]; back: Entity[] }>();
  for (const r of s.outOf(e.id)) (kinds.get(r.kind) ?? kinds.set(r.kind, { fwd: [], back: [] }).get(r.kind)!).fwd.push(s.entities.get(r.to)!);
  for (const r of s.into(e.id)) (kinds.get(r.kind) ?? kinds.set(r.kind, { fwd: [], back: [] }).get(r.kind)!).back.push(s.entities.get(r.from)!);
  for (const [kind, v] of kinds) {
    if (v.fwd.length) answers.push({ asks: kind, kind: kind as Relation['kind'], entities: v.fwd, backwards: false });
    if (v.back.length) answers.push({ asks: kind, kind: kind as Relation['kind'], entities: v.back, backwards: true });
  }
  return { entity: e, answers };
}
