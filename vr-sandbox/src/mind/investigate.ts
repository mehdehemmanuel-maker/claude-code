// The loop, as data and one rule. An investigation is a run of commits in the journal: an observation (a stand result
// against what she predicted), the anomaly it opens, the hypothesis she picks for it, the evidence its test returns,
// the belief that evidence leaves her with, and the question still open. `next` reads the last commit of an
// investigation and says the one legal action after it; `perform` does that action and commits what it produced,
// derived (parents) from what it read. Nothing here is a control flow that runs to completion inside one call: every
// step is a commit, so the loop can stop at any commit (the page closed) and the same rule resumes it from the journal.
//
// The one effect is a test on the stand (physics/stand.ts): a world of its own with the same physics, run on the
// design rebuilt from its spec with the changes the hypothesis asks for. The design is a function of the spec, so a
// test lost in flight (the page closed while the stand ran) is run again, not guessed.
//
// Candidate explanations are the ones the stand's old loop (assistant/prove.ts) ran as branches: a table racking
// without aprons, members sized for too little, joints too weak. Here each is a structure with its cause, its
// mechanism, the change that would settle it and what that change predicts; the generic skeptic (native/discovery.ts)
// is kept beside them as the candidates without a test here.

import { d, e, q, r, type R, type Structure } from '../ganglia/native/core';
import { anomaly as anomalyOf, type Explanation } from '../ganglia/native/discovery';
import { design, type DesignSpec } from '../assistant/designer';
import { JOINT_LIMIT, PROOF, standLoads, standPushes } from '../assistant/prove';
import { fixesFor } from '../assistant/fixes';
import { Bench } from '../app/bench';
import { BuildHost } from '../forge/apphost';
import { run } from '../forge/forge';
import { fragmentOf, type Fragment } from '../doc/commands';
import type { SimSettings } from '../doc/types';
import { getConnectorKind } from '../connectors/registry';
import { connectionGeometry } from '../connectors/through';
import type { StandResult, StandSetup } from '../physics/stand';
import { last, of, type Commit, type Journal, type Kind, type Status, type Validation } from './journal';

/** The physics this build runs (vite.config.ts): a commit is learned under it, and only under it. */
export const PHYSICS = typeof __PHYSICS__ === 'string' ? __PHYSICS__ : 'unstamped';

/** The stand's own scatter on a joint's share of capacity (estimate: settling noise and contact chatter), used as the tolerance of an observation. */
export const TOLERANCE = 0.1;

// ---- what a test is, and what it showed -------------------------------------------------------------------

/** A change to a design that a hypothesis asks to test. */
export type Change = { aprons: true } | { margin: number } | { upgrade: { kind: string; mode: string; load: number } };
/** A test on the stand: the design (its spec with these changes), at this multiple of its rated load and push. */
export interface TestSpec { spec: DesignSpec; changes: Change[]; factor: number }
/** What a test predicts when it tests a hypothesis: it holds, and no joint past this share of its capacity. */
export interface Prediction { held: boolean; uMax: number; model: string; laws: string[] }
/** A stand result, as the numbers the loop reads (the full result stays in the physics). */
export interface Outcome {
  held: boolean;
  /** The hardest any joint worked (a broken joint counts as 1), and which. */
  u: number;
  worst: { conn: string; mode: string; load: number } | null;
  broken: number;
  fractures: number;
  yielded: number;
  memberU: number;
  drop: number;
  tilt: number;
  seconds: number;
  ms: number;
}
/** What failed, read off the result and the design it ran on: which candidate explanations apply. */
export interface Signature {
  /** A leg's joint to the top broke or worked near its limit in bending: racking. */
  legBending: boolean;
  /** A member fractured or yielded. */
  members: boolean;
  /** The joint kind that broke or worked hardest, and how (for an upgrade), if any. */
  joint: { kind: string; mode: string; load: number } | null;
  tipped: boolean;
}

export function outcomeOf(res: StandResult): Outcome {
  const u = Math.max(res.worst?.u ?? 0, res.broken.length ? 1 : 0);
  return {
    held: res.held, u, worst: res.worst ? { conn: res.worst.conn, mode: res.worst.mode, load: res.worst.load } : res.broken[0] ? { conn: res.broken[0].conn, mode: res.broken[0].mode, load: res.broken[0].load } : null,
    broken: res.broken.length, fractures: res.fractures.length, yielded: res.yielded.length, memberU: res.memberPeak?.u ?? 0,
    drop: res.drop, tilt: res.tilt, seconds: res.seconds, ms: res.ms,
  };
}

export function signatureOf(res: StandResult, frag: Fragment, limit = JOINT_LIMIT): Signature {
  const conns = new Map(frag.connections.map((c) => [c.id, c]));
  const parts = new Map(frag.parts.map((p) => [p.id, p]));
  const sick = [...res.broken.map((b) => ({ conn: b.conn, mode: b.mode, load: b.load })), ...Object.entries(res.peak).filter(([, p]) => p.u > limit && p.mode).map(([conn, p]) => ({ conn, mode: p.mode, load: p.load }))];
  const legBending = sick.some((x) => x.mode === 'bending' && /leg\d+$/.test(parts.get(conns.get(x.conn)?.a.part ?? '')?.name ?? ''));
  const hardest = sick.sort((a, b) => b.load - a.load)[0];
  const kind = hardest ? conns.get(hardest.conn)?.kind : undefined;
  return { legBending, members: res.fractures.length > 0 || res.yielded.length > 0, joint: hardest && kind && getConnectorKind(kind).model === 'rigid' ? { kind, mode: hardest.mode, load: hardest.load } : null, tipped: res.tilt >= (5 * Math.PI) / 180 && !res.broken.length };
}

/** The design a test asks for, built on a bench, with its loads and pushes: the stand's setup, and the fragment it is. */
export function buildTest(test: TestSpec, sim: SimSettings): { setup: StandSetup; frag: Fragment } {
  const margin = test.changes.reduce((f, c) => ('margin' in c ? f * c.margin : f), 1);
  const spec: DesignSpec = { ...test.spec, aprons: test.spec.aprons || test.changes.some((c) => 'aprons' in c), load: test.spec.load !== undefined ? test.spec.load * margin : undefined };
  const plan = design(spec, 0, 2, 'm-');
  const bench = new Bench(sim);
  const built = run(plan.forge, new BuildHost(bench));
  if (!built.ok) throw new Error(`the design did not build: ${built.error}`);
  for (const c of test.changes) {
    if (!('upgrade' in c)) continue;
    for (const conn of Object.values(bench.doc.connections)) {
      if (conn.kind !== c.upgrade.kind || getConnectorKind(conn.kind).model !== 'rigid') continue;
      const pa = bench.doc.parts[conn.a.part]!, pb = conn.b ? bench.doc.parts[conn.b.part] ?? null : null;
      const fix = fixesFor({ kind: conn.kind, params: conn.params, mode: c.upgrade.mode, load: c.upgrade.load }, bench.materialOf(pa), pb ? bench.materialOf(pb) : null, connectionGeometry(bench.doc, conn, (p) => bench.materialOf(p)), 1)[0];
      if (fix) bench.store.transact('fit a stronger joint', (tx) => tx.update('connections', conn.id, { kind: fix.kind, params: fix.params }));
    }
  }
  const frag = fragmentOf(bench.doc, Object.keys(bench.doc.parts), (id) => bench.doc.parts[id]!.pose, { p: [0, 0, 0], q: [0, 0, 0, 1] });
  const loads = standLoads(test.spec, frag).map((l) => ({ ...l, kg: l.kg * test.factor }));
  const pushes = standPushes(test.spec, frag).map((p) => ({ ...p, force: p.force.map((f) => f * test.factor) as [number, number, number] }));
  return { setup: { parts: frag.parts, connections: frag.connections, materials: bench.doc.materials, sim, loads, pushes, seconds: 3 }, frag };
}

// ---- candidate explanations -----------------------------------------------------------------------------------

export interface Candidate {
  id: 'racking' | 'members' | 'joints';
  /** The claim, in Nex: a cause raising an effect by a mechanism; mode unknown until tested. */
  claim: R;
  says: string;
  change: Change;
}

/** The candidates a failure signature admits, not yet tried, in the order an engineer tries them (the design before the fastener). */
export function candidatesOf(sig: Signature, tried: Change[]): Candidate[] {
  const has = (p: (c: Change) => boolean) => tried.some(p);
  const out: Candidate[] = [];
  if (sig.legBending && !has((c) => 'aprons' in c)) out.push({
    id: 'racking', change: { aprons: true },
    claim: r('influence', [d('design:table-without-aprons'), d('failure:leg-joint-bending')], { polarity: '+', necessity: 'sufficient', mech: 'racking', mode: 'unknown', ev: { how: 'hypothesized' } }),
    says: 'a sideways push bends the leg joints because nothing but those joints resists it (racking); aprons, rails between the legs under the top, would take it',
  });
  if (sig.members && !has((c) => 'margin' in c)) out.push({
    id: 'members', change: { margin: 1.5 },
    claim: r('influence', [d('design:member-undersized'), d('failure:member-fracture')], { polarity: '+', necessity: 'sufficient', mech: 'bending stress past strength', mode: 'unknown', ev: { how: 'hypothesized' } }),
    says: 'the members are sized for less than they carry; sizing them for 1.5x the load would hold',
  });
  if (sig.joint && !has((c) => 'upgrade' in c && c.upgrade.kind === sig.joint!.kind)) out.push({
    id: 'joints', change: { upgrade: sig.joint },
    claim: r('influence', [d(`joint:${sig.joint.kind}:undersized`), d(`failure:joint-${sig.joint.mode}`)], { polarity: '+', necessity: 'sufficient', mech: 'load past capacity', mode: 'unknown', ev: { how: 'hypothesized' } }),
    says: `the ${getConnectorKind(sig.joint.kind).label.toLowerCase()} joints carry more ${sig.joint.mode} than they can; the smallest stronger joint would hold`,
  });
  return out;
}

// ---- the rule: what comes next -----------------------------------------------------------------------------------

export type Action =
  | { do: 'anomaly'; from: Commit }
  | { do: 'hypothesise'; from: Commit }
  | { do: 'test'; of: Commit }
  | { do: 'judge'; of: Commit }
  | { do: 'question'; from: Commit }
  | { do: 'rest' };

/** The one legal action after the last commit of an investigation: a function of the journal, nothing else. */
export function next(commits: Commit[], inv: string): Action {
  const c = last(commits, inv);
  if (!c) return { do: 'rest' };
  if (c.status === 'resolved' || c.status === 'closed') return { do: 'rest' };
  switch (c.kind) {
    case 'observation': return c.validation.verdict === 'failed' ? { do: 'anomaly', from: c } : { do: 'question', from: c };
    case 'anomaly': return { do: 'hypothesise', from: c };
    case 'hypothesis': return c.status === 'testing' ? { do: 'test', of: c } : { do: 'rest' };
    case 'question': return c.status === 'testing' ? { do: 'test', of: c } : { do: 'rest' };
    case 'evidence': return { do: 'judge', of: c };
    case 'belief': {
      const after = c.data['next'];
      if (after === 'anomaly') { const ev = commits.find((x) => x.seq === c.parents[1]); return ev ? { do: 'anomaly', from: ev } : { do: 'rest' }; }
      return after === 'proof' ? { do: 'question', from: c } : after === 'retry' ? { do: 'hypothesise', from: c } : { do: 'rest' };
    }
    default: return { do: 'rest' };
  }
}

// ---- performing an action: each one a commit ------------------------------------------------------------------

export interface Effects { stand(setup: StandSetup): Promise<StandResult>; sim: SimSettings }
export interface Clock { now(): number; iso(): string }

/** What a stand result becomes when it answers a test (an observation when it is the first look, evidence when it tests a claim). */
export function resultStructure(inv: string, o: Outcome): Structure {
  return r('state', [
    r('quantity', [d(`${inv}:held`), q(o.held ? 1 : 0, '')], {}),
    r('quantity', [d(`${inv}:joint-utilisation`), q(o.u, '')], {}),
    r('quantity', [d(`${inv}:member-utilisation`), q(o.memberU, '')], {}),
    r('quantity', [d(`${inv}:drop`), q(o.drop, 'm')], {}),
    r('quantity', [d(`${inv}:tilt`), q(o.tilt, 'rad')], {}),
  ], {});
}

const verdictOf = (o: Outcome, p: Prediction): Validation => {
  const ok = o.held === p.held && o.u <= p.uMax;
  // margin: how far the observed share of capacity sits from the predicted bound, in tolerances
  return { by: 'test stand', verdict: ok ? 'supported' : 'contradicted', margin: Math.abs(o.u - p.uMax) / TOLERANCE };
};

export class Investigator {
  constructor(private journal: Journal, private effects: Effects, private session: string, private clock: Clock, private physics = PHYSICS) {}

  private async commit(inv: string, kind: Kind, item: Structure, parents: number[], data: Record<string, unknown>, validation: Validation, status: Status, origin: Commit['origin'], since: number): Promise<Commit> {
    return this.journal.append({ at: this.clock.iso(), session: this.session, inv, kind, origin, parents, item, data, validation, status, physics: this.physics, ms: Math.max(0, this.clock.now() - since) });
  }

  /** The first look: a stand result on a design as built, against what she predicted for it. */
  async observe(inv: string, test: TestSpec, res: StandResult, sig: Signature, predicted: Prediction, since: number): Promise<Commit> {
    const o = outcomeOf(res);
    const held = o.held && o.u <= predicted.uMax;
    return this.commit(inv, 'observation', e(resultStructure(inv, o), 'simulated', 'test stand', { by: this.physics }), [], { test, outcome: o, signature: sig, predicted }, { by: 'test stand', verdict: held ? 'held' : 'failed' }, 'open', 'event:stand', since);
  }

  /** An unmatched request: kept as a structure with no model behind it yet, so the gap persists. */
  async request(text: string, since: number): Promise<Commit> {
    return this.commit('requests', 'request', r('state', [d('request')], { mode: 'unmodelled' }), [], { text }, { by: 'none', verdict: 'none' }, 'open', 'event:ask', since);
  }

  async perform(a: Action, inv: string): Promise<Commit | null> {
    const since = this.clock.now();
    const all = this.journal.commits;
    switch (a.do) {
      case 'rest': return null;
      case 'anomaly': {
        const o = a.from.data['outcome'] as Outcome, p = a.from.data['predicted'] as Prediction, sig = a.from.data['signature'] as Signature;
        const an = anomalyOf(`${inv}:${a.from.seq}`, { value: o.u, tolerance: TOLERANCE, names: ['joint utilisation'], instrument: 'test stand', environment: this.physics }, { value: p.uMax, lawAncestry: p.laws, modelVersion: p.model });
        const tried = ((a.from.data['test'] as TestSpec).changes);
        const cands = candidatesOf(sig, tried);
        const generic = an.candidates.map((x: Explanation) => ({ kind: x.kind, says: x.says, settledBy: x.settledBy }));
        return this.commit(inv, 'anomaly', an.structure, [a.from.seq], { sigma: an.sigma, status: an.status, candidates: cands.map((c) => c.id), generic, tried }, { by: 'comparison', verdict: 'contradicted', margin: an.sigma }, 'open', 'ego', since);
      }
      case 'hypothesise': {
        // the anomaly this is for: the one the belief retried from, or the one in hand
        const an = a.from.kind === 'anomaly' ? a.from : of(all, inv).filter((c) => c.kind === 'anomaly').at(-1)!;
        const failed = of(all, inv).filter((c) => (c.kind === 'observation' || c.kind === 'evidence') && (c.validation.verdict === 'failed' || c.validation.verdict === 'contradicted')).at(-1)!;
        const sig = failed.data['signature'] as Signature;
        const tried = of(all, inv).filter((c) => c.kind === 'hypothesis').flatMap((h) => ((h.data['test'] as TestSpec).changes));
        const cand = candidatesOf(sig, tried)[0];
        if (!cand) {
          // nothing she knows settles it: the anomaly stays alive, the question stays open, and she rests
          return this.commit(inv, 'question', r('state', [an.item], { mode: 'unknown', instrument: 'test stand' }), [an.seq], { asks: 'unexplained', says: 'no change I know would settle it; it needs a different design' }, { by: 'none', verdict: 'none' }, 'open', 'ego', since);
        }
        const base = (failed.data['test'] as TestSpec);
        const test: TestSpec = { spec: base.spec, changes: [...base.changes, cand.change], factor: 1 };
        const predict: Prediction = { held: true, uMax: JOINT_LIMIT, model: `the design with ${describeChange(cand.change)}`, laws: ['statics', 'joint.capacity'] };
        return this.commit(inv, 'hypothesis', cand.claim, [an.seq, failed.seq], { candidate: cand.id, says: cand.says, change: cand.change, test, predict }, { by: 'none', verdict: 'none' }, 'testing', 'ego', since);
      }
      case 'test': {
        const test = a.of.data['test'] as TestSpec, predict = a.of.data['predict'] as Prediction;
        const { setup, frag } = buildTest(test, this.effects.sim);
        const res = await this.effects.stand(setup);
        const o = outcomeOf(res), sig = signatureOf(res, frag);
        return this.commit(inv, 'evidence', e(resultStructure(inv, o), 'simulated', 'test stand', { by: this.physics }), [a.of.seq], { test, outcome: o, signature: sig, predicted: predict, tests: a.of.kind }, verdictOf(o, predict), 'open', 'event:stand', since);
      }
      case 'judge': {
        const tested = all.find((c) => c.seq === a.of.parents[0])!;
        const supported = a.of.validation.verdict === 'supported';
        const o = a.of.data['outcome'] as Outcome, test = a.of.data['test'] as TestSpec;
        if (tested.kind === 'hypothesis') {
          const claim = structuredClone(tested.item) as R;
          claim.c = { ...claim.c, mode: supported ? 'true' : 'false', ev: { how: 'simulated', src: ['test stand'] }, margin: a.of.validation.margin };
          const next = supported ? 'proof' : 'retry';
          return this.commit(inv, 'belief', claim, [tested.seq, a.of.seq], { hypothesis: tested.seq, transition: { from: 'unknown', to: supported ? 'true' : 'false' }, hypothesisStatus: supported ? 'confirmed' : o.held ? 'retained' : 'rejected', outcome: o, test, next, uncertainty: { species: 'simulation', replication: 1, measured: false, physics: this.physics } }, a.of.validation, 'open', 'ego', since);
        }
        // a question (the proof test): answered either way; held, the investigation is resolved; failed, this result opens a new anomaly
        const claim = r('constrain', [d(`${inv}:design`), q((test.spec.load ?? 0) * test.factor, 'kg')], { mode: supported ? 'true' : 'false', ev: { how: 'simulated', src: ['test stand'] }, margin: a.of.validation.margin });
        return this.commit(inv, 'belief', claim, [tested.seq, a.of.seq], { question: tested.seq, transition: { from: 'unmeasured', to: supported ? 'true' : 'false' }, outcome: o, test, changes: test.changes, next: supported ? 'done' : 'anomaly', uncertainty: { species: 'simulation', replication: 1, measured: false, physics: this.physics } }, a.of.validation, supported ? 'resolved' : 'open', 'ego', since);
      }
      case 'question': {
        // what remains after it held at its rated load: does it hold the proof load, 1.5x, as a test house proves a part?
        const base = (a.from.kind === 'belief' ? (a.from.data['test'] as TestSpec) : (a.from.data['test'] as TestSpec));
        const test: TestSpec = { spec: base.spec, changes: base.changes, factor: PROOF };
        const predict: Prediction = { held: true, uMax: 1, model: `the design at ${PROOF}x its rated load and push`, laws: ['statics', 'joint.capacity'] };
        return this.commit(inv, 'question', r('constrain', [d(`${inv}:design`), q((test.spec.load ?? 0) * PROOF, 'kg')], { mode: 'unmeasured', instrument: 'test stand' }), [a.from.seq], { asks: 'proof', test, predict }, { by: 'none', verdict: 'none' }, 'testing', 'ego', since);
      }
    }
  }
}

export function describeChange(c: Change): string {
  return 'aprons' in c ? 'aprons (rails between the legs under the top)' : 'margin' in c ? `members sized for ${c.margin}x the load` : `${getConnectorKind(c.upgrade.kind).label.toLowerCase()} joints upgraded for ${c.upgrade.mode}`;
}
