// The construction actions: the verbs of the engineering language. A construction is a sequence of them, each lawful
// or refused: SELECT a behaviour, REFINE to a child manifold, SPECIALIZE down a lineage, COMPOSE a store with a
// converter whose transformation touches its domain, CONNECT_PORTS of matching quantity and domain, PARAMETERIZE a
// manifold by a contract (its scaling laws make the member), REALIZE it by a datasheet, SATISFY a constraint, and
// INSTANTIATE into the world through the construction language. The sequence is the trace: every arrow of the
// construction tree is one of these, and nothing reaches the next level without one.
import type { Contract, Domain, Environment, Manifold, Member } from './language';
import { childrenOf, lineage, manifoldById } from './manifolds';

export type Verb = 'SELECT' | 'REFINE' | 'SPECIALIZE' | 'COMPOSE' | 'CONNECT_PORTS' | 'PARAMETERIZE' | 'REALIZE' | 'SATISFY' | 'ASSIGN_ROLE' | 'INSTANTIATE';

export interface Step { verb: Verb; from: string | null; to: string; says: string; law?: string }

export class ActionRefused extends Error {
  constructor(readonly verb: Verb, readonly at: string, readonly why: string, readonly law?: string, readonly constraint?: string) {
    super(`${verb} at ${at}: ${why}`);
  }
}

export interface Constraint { id: string; says: string; holds(): true | string; law?: string }

/** One construction in progress: where it stands in the tree, what it has composed, and every step it took. */
export class Construction {
  readonly steps: Step[] = [];
  at: string | null = null;
  readonly members = new Map<string, Member>();
  readonly connections: { a: string; b: string; quantity: string; domain: string }[] = [];

  private step(s: Step) { this.steps.push(s); return this; }

  /** Begin at a behaviour. */
  select(id: string): this {
    const m = manifoldById(id);
    if (!m) throw new ActionRefused('SELECT', id, 'no such manifold');
    if (m.level !== 'behavior') throw new ActionRefused('SELECT', id, `a construction begins at a behaviour, not a ${m.level}`);
    this.at = id;
    return this.step({ verb: 'SELECT', from: null, to: id, says: `the behaviour "${m.name}"` });
  }

  /** One level down the tree, to a child of where it stands. */
  refine(id: string): this {
    const m = manifoldById(id);
    if (!m) throw new ActionRefused('REFINE', id, 'no such manifold');
    if (!this.at || m.parent !== this.at) throw new ActionRefused('REFINE', id, `${id} is not a refinement of ${this.at ?? 'nothing'}: refinement follows the tree`);
    this.at = id;
    return this.step({ verb: 'REFINE', from: m.parent, to: id, says: `${m.level}: ${m.name}` });
  }

  /** Down the lineage to a descendant, one refinement at a time. */
  specialize(id: string): this {
    const line = lineage(id);
    const k = line.findIndex((m) => m.id === this.at);
    if (k < 0) throw new ActionRefused('SPECIALIZE', id, `${id} is not under ${this.at ?? 'nothing'}`);
    for (const m of line.slice(k + 1)) this.refine(m.id);
    return this;
  }

  /**
   * A converter onto a chain standing in a domain: lawful only when the converter takes that domain (run forwards,
   * or backwards when its transformation is reversible); the chain then stands in what it gives.
   */
  compose(at: Domain, prev: string, converter: Manifold, forward: boolean): Domain {
    const t = converter.transformation;
    if (!t) throw new ActionRefused('COMPOSE', converter.id, `${converter.name} is not a transformation`);
    if (!forward && !t.reversible) throw new ActionRefused('COMPOSE', converter.id, `${converter.name} runs one way (${t.from} to ${t.to}) and cannot be run backwards`, t.law);
    const takes = forward ? t.from : t.to, gives = forward ? t.to : t.from;
    if (takes !== at) throw new ActionRefused('COMPOSE', converter.id, `${converter.name} takes ${takes}; the chain stands in ${at}`, t.law);
    this.step({ verb: 'COMPOSE', from: prev, to: converter.id, says: `${converter.name}, ${takes} into ${gives}${forward ? '' : ' (run backwards)'}`, law: t.law });
    return gives;
  }

  /** Two ports joined: the same quantity in the same domain, one giving and one taking (or either way). */
  connect(a: { manifold: Manifold; port: string }, b: { manifold: Manifold; port: string }): this {
    const pa = a.manifold.ports.find((x) => x.name === a.port), pb = b.manifold.ports.find((x) => x.name === b.port);
    if (!pa) throw new ActionRefused('CONNECT_PORTS', a.manifold.id, `no port "${a.port}" on ${a.manifold.name}`);
    if (!pb) throw new ActionRefused('CONNECT_PORTS', b.manifold.id, `no port "${b.port}" on ${b.manifold.name}`);
    if (pa.quantity !== pb.quantity) throw new ActionRefused('CONNECT_PORTS', a.manifold.id, `${a.port} carries ${pa.quantity}, ${b.port} carries ${pb.quantity}`);
    if (pa.domain !== pb.domain) throw new ActionRefused('CONNECT_PORTS', a.manifold.id, `${a.port} is ${pa.domain}, ${b.port} is ${pb.domain}: a domain crosses only by a transformation`);
    if (pa.species && pb.species && pa.species !== pb.species) throw new ActionRefused('CONNECT_PORTS', a.manifold.id, `${a.port} carries ${pa.species}, ${b.port} ${pb.species}: not the same substance`);
    const ok = pa.direction === 'inout' || pb.direction === 'inout' || pa.direction !== pb.direction;
    if (!ok) throw new ActionRefused('CONNECT_PORTS', a.manifold.id, `${a.port} and ${b.port} both ${pa.direction === 'in' ? 'take' : 'give'}`);
    this.connections.push({ a: `${a.manifold.id}.${a.port}`, b: `${b.manifold.id}.${b.port}`, quantity: pa.quantity, domain: pa.domain });
    return this.step({ verb: 'CONNECT_PORTS', from: a.manifold.id, to: b.manifold.id, says: `${a.manifold.name}.${a.port} to ${b.manifold.name}.${b.port} (${pa.quantity}, ${pa.domain})` });
  }

  /** A member of a manifold for the contract, by its scaling laws; realised by a datasheet when one is stocked. */
  parameterize(m: Manifold, c: Contract, env: Environment): Member {
    if (!m.member) throw new ActionRefused('PARAMETERIZE', m.id, `${m.name} has no scaling yet: no member of it can be sized`);
    const r = m.member(c, env);
    if ('refused' in r) throw new ActionRefused('PARAMETERIZE', m.id, r.refused, r.law);
    this.members.set(m.id, r);
    this.step({ verb: 'PARAMETERIZE', from: m.id, to: m.id, says: r.says, law: r.laws[0] });
    if (r.realization) this.step({ verb: 'REALIZE', from: m.id, to: r.realization, says: `by the datasheet of ${r.realization}` });
    return r;
  }

  /** A constraint of the contract: held or the construction stops here. */
  satisfy(k: Constraint): this {
    const h = k.holds();
    if (h !== true) throw new ActionRefused('SATISFY', this.at ?? k.id, h, k.law, k.id);
    return this.step({ verb: 'SATISFY', from: this.at, to: k.id, says: k.says, law: k.law });
  }

  /** A manifold's child by a predicate, for refining by a property rather than a name. */
  childWhere(pred: (m: Manifold) => boolean): Manifold | undefined {
    return this.at ? childrenOf(this.at).find(pred) : undefined;
  }
}
