// An assembly: members with roles, and the relations between them. Coordinates are results. Only roots relate to the
// environment (a support stands on the ground under its footprint corner, a stile runs from its foot to the apex, a
// deck lies on a slope); every other member is on, under, between, across or from-to others, and the order the
// relations are resolved in is their dependency order (manufacturing.assembly-order), never a stage table.
//
// `toForge` writes the assembly as Forge for a host to resolve from the real parts' boxes (forge/apphost.ts), so the
// same language builds it in the headset, on the bench and on the stand. A support's length comes from the ground
// where it stands (environmental.terrain): the tops are level at the structure's height above the highest ground under
// its footprint, each support reaching down to its own ground.

import type { Env } from './laws';
import type { Material } from '../data/materials';

export type Role = 'support' | 'carries' | 'stood-on' | 'seat' | 'handhold' | 'spans' | 'braces' | 'encloses' | 'stacks' | 'back' | 'cap';

export interface Member { name: string; kind: string; params: string; material: string; role: Role }

export type Relation =
  | { how: 'stands'; member: string; at: [number, number]; top: number }
  | { how: 'from-to'; member: string; from: [number, number, number]; to: [number, number, number] }
  | { how: 'laid'; member: string; at: [number, number, number]; rot?: string }
  | { how: 'on'; member: string; onto: string[]; offset?: [number, number]; rot?: string }
  | { how: 'under'; member: string; below: string[]; rot?: string }
  | { how: 'between'; member: string; a: string; b: string; under?: string; flush?: string; height?: number; rot?: string }
  | { how: 'across'; member: string; a: string; b: string; side: 'x' | '-x' | 'z' | '-z'; rot?: string }
  | { how: 'join'; a: string; b: string };

export interface Assembly { members: Member[]; relations: Relation[] }

/** The ground as a thing to rest on: `on floor` in Forge, resolved to the real ground under the spot (environmental.terrain). */
export const FLOOR = 'floor';

/** What is said: the assembly, the laws it rests on, and the notes. */
export interface Structured { assembly: Assembly; laws: string[]; notes: string[] }

const f = (x: number) => String(+x.toFixed(4));

/**
 * A small builder for an assembly: members by role, relations in the order they are said. Every method is a relation
 * of the language (forge/forge.ts): nothing here is a coordinate but a root's spot on the ground.
 */
export class Builder {
  members: Member[] = [];
  relations: Relation[] = [];
  constructor(readonly tag: string) {}
  member(name: string, kind: string, params: string, material: string, role: Role): string { this.members.push({ name: `${this.tag}${name}`, kind, params, material, role }); return `${this.tag}${name}`; }
  /** A post (or a side on edge) standing on the ground at (x, z), its top `top` above the reference plane. */
  post(name: string, p: { kind: string; params: string }, m: Material, x: number, z: number, top: number, role: Role = 'support'): string {
    const n = this.member(name, p.kind, p.params, m.id, role);
    this.relations.push({ how: 'stands', member: n, at: [x, z], top });
    return n;
  }
  /** A member spanning between two others: under a deck, flush with their tops, or at a height above the plane; rolled as said. */
  between(name: string, kind: string, params: string, m: Material, a: string, b: string, at: { under: string } | { flush: string } | { height: number }, role: Role, rot?: string): string {
    const n = this.member(name, kind, params, m.id, role);
    this.relations.push({ how: 'between', member: n, a, b, ...('under' in at ? { under: at.under } : 'flush' in at ? { flush: at.flush } : { height: at.height }), ...(rot ? { rot } : {}) });
    return n;
  }
  /** A rail on edge between two posts. */
  rail(name: string, r: { kind: string; params: string }, m: Material, a: string, b: string, at: { under: string } | { flush: string } | { height: number }, role: Role = 'spans'): string {
    return this.between(name, r.kind, r.params, m, a, b, at, role, 'rot x 90');
  }
  /** A brace flat on the faces of two posts, on one side, low on the first to high on the second. */
  brace(name: string, b: { kind: string; params: string }, m: Material, a: string, c: string, side: 'x' | '-x' | 'z' | '-z'): string {
    const n = this.member(name, b.kind, b.params, m.id, 'braces');
    this.relations.push({ how: 'across', member: n, a, b: c, side, rot: 'rot x 90' });
    return n;
  }
  /** A member resting on others (or the floor), centred over them, shifted by an offset; turned as said. */
  on(name: string, kind: string, params: string, m: Material, onto: string[], role: Role, opts: { offset?: [number, number]; rot?: string } = {}): string {
    const n = this.member(name, kind, params, m.id, role);
    this.relations.push({ how: 'on', member: n, onto, ...opts });
    return n;
  }
  join(a: string, ...bs: string[]) { for (const b of bs) this.relations.push({ how: 'join', a, b }); }
  done(laws: string[], notes: string[]): Structured { return { assembly: { members: this.members, relations: this.relations }, laws, notes }; }
}

/** The members a relation needs in place before it can be resolved. */
export function needs(r: Relation): string[] {
  switch (r.how) {
    case 'stands': case 'from-to': case 'laid': return [];
    case 'on': return r.onto.filter((n) => n !== FLOOR);
    case 'under': return r.below;
    case 'between': return [r.a, r.b, ...(r.under ? [r.under] : []), ...(r.flush ? [r.flush] : [])];
    case 'across': return [r.a, r.b];
    case 'join': return [r.a, r.b];
  }
}
const placed = (r: Relation): string | null => (r.how === 'join' ? null : r.member);

/**
 * The relations in dependency order: a member after everything it rests on or spans between, a joint after both its
 * parts; among the ready, placements before joints, and in the order written. A cycle (two members each on the other)
 * is refused by name: nothing can be built that way.
 */
export function order(a: Assembly): Relation[] {
  const out: Relation[] = [];
  const done = new Set<string>();
  let rest = [...a.relations];
  while (rest.length) {
    const ready = rest.filter((r) => needs(r).every((n) => done.has(n)));
    if (!ready.length) throw new Error(`these relations wait on each other: ${rest.map((r) => (r.how === 'join' ? `join ${r.a} ${r.b}` : `${r.member} ${r.how} ${needs(r).join(' ')}`)).join('; ')}`);
    const next = ready.find((r) => r.how !== 'join') ?? ready[0]!;
    out.push(next);
    const m = placed(next);
    if (m) done.add(m);
    rest = rest.filter((r) => r !== next);
  }
  return out;
}

/** The assembly as Forge, in dependency order, every root on the real ground (environmental.terrain). */
export function toForge(a: Assembly, env: Env = {}): string {
  const ground = env.groundAt ?? (() => 0);
  const by = new Map(a.members.map((m) => [m.name, m]));
  const member = (name: string) => { const m = by.get(name); if (!m) throw new Error(`no member called ${name}`); return m; };
  // the reference plane: the highest ground under any root, so every top is level and nothing is buried
  const roots = a.relations.filter((r): r is Extract<Relation, { how: 'stands' }> => r.how === 'stands');
  const plane = roots.length ? Math.max(...roots.map((r) => ground(r.at[0], r.at[1]))) : 0;
  const lines: string[] = [];
  for (const r of order(a)) {
    if (r.how === 'join') { lines.push(`join ${r.a} ${r.b}`); continue; }
    const m = member(r.member);
    const head = `place ${m.kind} ${m.params} mat ${m.material}`;
    switch (r.how) {
      case 'stands': {
        const g = ground(r.at[0], r.at[1]);
        const length = plane + r.top - g;
        lines.push(`${head} length=${f(length)} at ${f(r.at[0])} ${f(g + length / 2)} ${f(r.at[1])} rot z 90 as ${m.name}`);
        break;
      }
      case 'from-to': lines.push(`${head} from ${r.from.map(f).join(' ')} to ${r.to.map(f).join(' ')} as ${m.name}`); break;
      case 'laid': lines.push(`${head} at ${r.at.map(f).join(' ')}${r.rot ? ` ${r.rot}` : ''} as ${m.name}`); break;
      case 'on': lines.push(`${head} on ${r.onto.join(' ')}${r.offset ? ` offset ${f(r.offset[0])} ${f(r.offset[1])}` : ''}${r.rot ? ` ${r.rot}` : ''} as ${m.name}`); break;
      case 'under': lines.push(`${head} under ${r.below.join(' ')}${r.rot ? ` ${r.rot}` : ''} as ${m.name}`); break;
      // a height is said above the reference plane, as a post's top is
      case 'between': lines.push(`${head} between ${r.a} ${r.b}${r.under ? ` under ${r.under}` : r.flush ? ` flush ${r.flush}` : r.height !== undefined ? ` height ${f(plane + r.height)}` : ''}${r.rot ? ` ${r.rot}` : ''} as ${m.name}`); break;
      case 'across': lines.push(`${head} across ${r.a} ${r.b} side ${r.side}${r.rot ? ` ${r.rot}` : ''} as ${m.name}`); break;
    }
  }
  return lines.join('\n');
}

/** Every member's role, by name: what the stand loads and pushes by (mechanical.load-case). */
export const rolesOf = (a: Assembly): Record<string, Role> => Object.fromEntries(a.members.map((m) => [m.name, m.role]));
