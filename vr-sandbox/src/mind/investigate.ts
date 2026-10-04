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
import { fixesFor, MARGIN } from '../assistant/fixes';
import { DEFAULTS } from '../assistant/designer';
import { transformPoint } from '../doc/math';
import { effectiveParams, getPartKind, massOf } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';
import { PERSON } from '../data/people';
import { derive, type Subject } from '../construct/laws';
import { getMaterial } from '../data/materials';
import { numberOf } from '../schema/params';
import { hashesOfLaws } from '../ganglia/dependencies';
import { rigidDomain } from '../ganglia/native/tsc';
import type { Anomaly } from '../diagnostics/watchdog';
import { Bench } from '../app/bench';
import { BuildHost } from '../forge/apphost';
import { run } from '../forge/forge';
import { fragmentOf, type Fragment } from '../doc/commands';
import type { SimSettings, Vec3 } from '../doc/types';
import { getConnectorKind } from '../connectors/registry';
import { connectionGeometry } from '../connectors/through';
import { TILT_LIMIT, type StandLoad, type StandPush, type StandResult, type StandSetup } from '../physics/stand';
import { last, of, type Commit, type Journal, type Kind, type Status, type Validation } from './journal';

/** The physics this build runs (vite.config.ts): a commit is learned under it, and only under it. */
export const PHYSICS = typeof __PHYSICS__ === 'string' ? __PHYSICS__ : 'unstamped';

// ---- the stand's loads and pushes (from the old prove loop, which the Mind replaced) ----------------------------------

/** A joint working at more than this share of its capacity on the stand is too close to its limit to hand over. */
export const JOINT_LIMIT = 1 / MARGIN;
/** A proof test: the design must also hold 1.5x its rated load and push (with the joints still under their limit). */
export const PROOF = 1.5;
/** A firm two-handed shove, the person's (data/people.ts: push, an estimate from the pushing tables), N. */
export const PUSH = PERSON.push.value;

/** A part's box in the world, axis-aligned, from its real collision shape turned and placed as it is. */
export function worldBox(p: Fragment['parts'][number]): { min: Vec3; max: Vec3 } {
  const k = getPartKind(p.kind);
  const b = shapeBounds(k.collision(effectiveParams(k, p.params, getMaterial(p.material))));
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    const c = transformPoint(p.pose, [x!, y!, z!]);
    for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, c[i]!); max[i] = Math.max(max[i]!, c[i]!); }
  }
  return { min, max };
}

/** The box round a whole structure: its footprint and its height. */
export function footprint(frag: Fragment): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of frag.parts) { const b = worldBox(p); for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, b.min[i]!); max[i] = Math.max(max[i]!, b.max[i]!); } }
  return { min, max };
}

/**
 * Whether a free-standing structure tips under a push (construct/laws.ts mechanical.overturning: moment balance about
 * the toe): the push's moment about the edge it drives the structure toward, against the weight's about the same
 * edge, what it carries weighing on it too. Over 1 it tips; `takes` is the push it would hold.
 */
export function overturning(frag: Fragment, loads: StandLoad[], push: StandPush, gravity: number): { ratio: number; takes: number; base: number; height: number; weight: number } {
  const fp = footprint(frag);
  const k: 0 | 2 = Math.abs(push.force[0]) >= Math.abs(push.force[2]) ? 0 : 2;
  let m = 0, mx = 0;
  for (const p of frag.parts) { const kind = getPartKind(p.kind), mat = getMaterial(p.material); const pm = massOf(kind, effectiveParams(kind, p.params, mat), mat); m += pm; mx += pm * p.pose.p[k]; }
  for (const l of loads) { m += l.kg; mx += l.kg * l.at[k]; }
  const weight = m * gravity;
  const toe = push.force[k] < 0 ? fp.min[k] : fp.max[k];
  const lever = Math.abs(mx / m - toe);
  const height = push.at[1] - fp.min[1];
  const F = Math.abs(push.force[k]);
  return { ratio: (F * height) / (weight * lever), takes: (weight * lever) / height, base: fp.max[k] - fp.min[k], height, weight };
}

/** The weights a design is for, where they go: on a table's top, on every shelf; a wall or tower carries itself. */
/**
 * The weights a design is for, where they go (construct/laws.ts mechanical.load-case): what carries takes the rated
 * load spread over it (each shelf its own), a seat or a rung takes a person on it (a rung half way up), a bare frame's
 * carrying rails share it. Nothing here is a kind of design: a member's role says what loads it.
 */
export function standLoads(spec: DesignSpec, frag: Fragment, roles: Record<string, string>): StandLoad[] {
  const kg = spec.load ?? DEFAULTS[spec.what].load;
  if (!kg) return [];
  const role = (p: Fragment['parts'][number]) => roles[p.name] ?? '';
  const onto = (p: Fragment['parts'][number], kgEach: number): StandLoad => {
    const k = getPartKind(p.kind);
    const dd = k.dims(effectiveParams(k, p.params, getMaterial(p.material)));
    const half = dd.b / 2;
    const w = Math.min(0.3, 0.6 * numberOf(p.params, 'length', 0.3)), depth = Math.min(0.3, 0.6 * numberOf(p.params, 'width', 0.3));
    // a sloped deck takes its load a little above its middle, where it rests
    const lift = Math.abs(p.pose.q[2]) > 1e-3 ? numberOf(p.params, 'length', 1) * Math.sin(Math.abs(p.pose.q[2]) * 2) / 2 + 0.05 : 0;
    return { kg: kgEach, at: [p.pose.p[0], p.pose.p[1] + half + lift, p.pose.p[2]], size: [w, depth] };
  };
  const carries = frag.parts.filter((p) => role(p) === 'carries');
  if (carries.length) {
    // a carrying surface is the carrying members at one level (two rails side by side are one surface; shelves one
    // above another are each a surface): the rated load goes on every surface, shared across it
    const levels: Fragment['parts'][number][][] = [];
    for (const p of carries) { const b = worldBox(p); const l = levels.find((g) => g.some((o) => { const ob = worldBox(o); return ob.min[1] <= b.max[1] && b.min[1] <= ob.max[1]; })); if (l) l.push(p); else levels.push([p]); }
    return levels.flatMap((l) => l.map((p) => onto(p, kg / l.length)));
  }
  const seat = frag.parts.find((p) => role(p) === 'seat');
  if (seat) return [onto(seat, kg)];
  const rungs = frag.parts.filter((p) => role(p) === 'stood-on').sort((a, b) => a.pose.p[1] - b.pose.p[1]);
  // one side's rungs (the lower-named side), the middle one takes the person
  const side = rungs.filter((p) => /A\d+$/.test(p.name));
  const mid = (side.length ? side : rungs)[Math.floor((side.length ? side : rungs).length / 2)];
  return mid ? [{ kg, at: [mid.pose.p[0], mid.pose.p[1] + 0.03, mid.pose.p[2]], size: [0.1, 0.25] }] : [];
}

/**
 * How a design is pushed on the stand: furniture fails sideways (racking, tipping) far more than straight down, so
 * the push is a person's firm shove (scale.person) at the top of the highest thing they would push on, what carries,
 * a back, a handhold, the top rung; in the least favourable direction (mechanical.overturning): across the shortest
 * span of the footprint, where the base resists the moment least; half a second in, for a second and a half. Nothing
 * here is a kind of design.
 */
export function standPushes(spec: DesignSpec, frag: Fragment, roles: Record<string, string>): StandPush[] {
  void spec;
  const role = (p: Fragment['parts'][number]) => roles[p.name] ?? '';
  const candidates = frag.parts.filter((p) => ['carries', 'back', 'handhold', 'stood-on', 'seat'].includes(role(p)));
  if (!candidates.length) return [];
  const boxes = new Map(candidates.map((p) => [p.id, worldBox(p)]));
  const target = candidates.reduce((m, p) => (boxes.get(p.id)!.max[1] > boxes.get(m.id)!.max[1] ? p : m), candidates[0]!);
  const fp = footprint(frag);
  const k: 0 | 2 = fp.max[0] - fp.min[0] <= fp.max[2] - fp.min[2] ? 0 : 2;
  const box = boxes.get(target.id)!;
  // at the top of the target's far face, pushed back across the structure
  const at: Vec3 = [target.pose.p[0], box.max[1], target.pose.p[2]];
  at[k] = box.max[k];
  const force: Vec3 = [0, 0, 0];
  force[k] = -PUSH;
  return [{ part: target.id, at, force, from: 0.5, to: 2 }];
}

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

/** What the Mind knows of a part for the rigid domain: its material and its longest dimension. */
export interface PartInfo { id: string; name: string; material: string; longest: number }

export function outcomeOf(res: StandResult): Outcome {
  const u = Math.max(res.worst?.u ?? 0, res.broken.length ? 1 : 0);
  return {
    held: res.held, u, worst: res.worst ? { conn: res.worst.conn, mode: res.worst.mode, load: res.worst.load } : res.broken[0] ? { conn: res.broken[0].conn, mode: res.broken[0].mode, load: res.broken[0].load } : null,
    broken: res.broken.length, fractures: res.fractures.length, yielded: res.yielded.length, memberU: res.memberPeak?.u ?? 0,
    drop: res.drop, tilt: res.tilt, seconds: res.seconds, ms: res.ms,
  };
}

export function signatureOf(res: StandResult, frag: Fragment, roles: Record<string, string>, limit = JOINT_LIMIT): Signature {
  const conns = new Map(frag.connections.map((c) => [c.id, c]));
  const parts = new Map(frag.parts.map((p) => [p.id, p]));
  const role = (id: string | undefined) => roles[parts.get(id ?? '')?.name ?? ''] ?? '';
  // racking: a support's joint to what it holds up (a top, a cap, a seat, a rail) worked in bending (mechanical.triangulation)
  const racks = (conn: string) => { const c = conns.get(conn); if (!c) return false; const ends = [c.a.part, c.b?.part]; return ends.some((p) => role(p) === 'support') && ends.some((p) => ['carries', 'cap', 'seat', 'spans'].includes(role(p))); };
  const sick = [...res.broken.map((b) => ({ conn: b.conn, mode: b.mode, load: b.load })), ...Object.entries(res.peak).filter(([, p]) => p.u > limit && p.mode).map(([conn, p]) => ({ conn, mode: p.mode, load: p.load }))];
  const legBending = sick.some((x) => x.mode === 'bending' && racks(x.conn));
  const hardest = sick.sort((a, b) => b.load - a.load)[0];
  const kind = hardest ? conns.get(hardest.conn)?.kind : undefined;
  return { legBending, members: res.fractures.length > 0 || res.yielded.length > 0, joint: hardest && kind && getConnectorKind(kind).model === 'rigid' ? { kind, mode: hardest.mode, load: hardest.load } : null, tipped: res.tilt >= (5 * Math.PI) / 180 && !res.broken.length };
}

/** The design a test asks for, built on a bench, with its loads and pushes: the stand's setup, and the fragment it is. */
export function buildTest(test: TestSpec, sim: SimSettings): { setup: StandSetup; frag: Fragment; roles: Record<string, string> } {
  const margin = test.changes.reduce((f, c) => ('margin' in c ? f * c.margin : f), 1);
  const spec: DesignSpec = { ...test.spec, aprons: test.spec.aprons || test.changes.some((c) => 'aprons' in c), load: test.spec.load !== undefined ? test.spec.load * margin : undefined };
  const plan = design(spec, 0, 2, 'm-');
  const roles = plan.roles;
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
  const loads = standLoads(test.spec, frag, roles).map((l) => ({ ...l, kg: l.kg * test.factor }));
  const pushes = standPushes(test.spec, frag, roles).map((p) => ({ ...p, force: p.force.map((f) => f * test.factor) as [number, number, number] }));
  return { setup: { parts: frag.parts, connections: frag.connections, materials: bench.doc.materials, sim, loads, pushes, seconds: 3 }, frag, roles };
}

// ---- candidate explanations -----------------------------------------------------------------------------------

export interface Candidate {
  id: 'racking' | 'members' | 'joints' | 'anchor';
  /** The claim, in Nex: a cause raising an effect by a mechanism; mode unknown until tested. */
  claim: R;
  says: string;
  change: Change;
}

/** The candidates a failure signature admits, not yet tried, in the order an engineer tries them (the design before the fastener). */
export function candidatesOf(sig: Signature, tried: Change[]): Candidate[] {
  const has = (p: (c: Change) => boolean) => tried.some(p);
  // the failure, as the laws read it (construct/laws.ts: Subject.failed); what to try is theirs to say
  const failed = [...(sig.legBending ? ['racking'] : []), ...(sig.members ? ['member'] : []), ...(sig.joint ? ['joint'] : []), ...(sig.tipped ? ['tipping'] : [])];
  const subject: Subject = { kinds: ['structure'], roles: ['support', 'carries', 'spans'], flows: ['load'], materials: [], failed };
  const out: Candidate[] = [];
  for (const { law, out: h } of derive(subject)) {
    if (h.kind !== 'hypothesis') continue;
    const change: Change | null = 'aprons' in h.change ? { aprons: true } : 'margin' in h.change ? { margin: Number(h.change['margin']) } : 'anchor' in h.change ? { margin: 1 } : 'upgrade' in h.change && sig.joint ? { upgrade: sig.joint } : null;
    if (!change) continue;
    const done = 'aprons' in change ? has((c) => 'aprons' in c) : 'upgrade' in change ? has((c) => 'upgrade' in c && c.upgrade.kind === sig.joint!.kind) : h.what === 'tipping' ? false : has((c) => 'margin' in c);
    if (done) continue;
    const id: Candidate['id'] = h.what === 'racking' ? 'racking' : h.what === 'members' ? 'members' : h.what === 'tipping' ? 'anchor' : 'joints';
    const says = sig.joint ? h.says.replace('{joint}', getConnectorKind(sig.joint.kind).label.toLowerCase()).replace('{mode}', sig.joint.mode) : h.says;
    out.push({ id, change, says, claim: r('influence', [d(`law:construction.${law}`), d(`failure:${h.what}`)], { polarity: '+', necessity: 'sufficient', mech: h.why, mode: 'unknown', ev: { how: 'hypothesized', src: [`construction.${law}`] } }) });
  }
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

export interface Effects { stand(setup: StandSetup): Promise<StandResult>; sim: SimSettings; /** The rigid domain of a part: a derived check, no world needed. */ rigid?: (material: string, longest: number) => ReturnType<typeof rigidDomain> }
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
    return this.commit(inv, 'observation', e(resultStructure(inv, o), 'simulated', 'test stand', { by: this.physics }), [], { of: 'stand', test, outcome: o, signature: sig, predicted, laws: predicted.laws, lawHashes: hashesOfLaws(predicted.laws) }, { by: 'test stand', verdict: held ? 'held' : 'failed' }, 'open', 'event:stand', since);
  }

  /** A watchdog finding on a part: the physics broke an obligation; the observation is the finding against its limit. */
  async observeWatchdog(inv: string, a: Anomaly, part: PartInfo | null, obligation: string, since: number): Promise<Commit> {
    const item = e(r('state', [r('quantity', [d(`${inv}:${a.kind}`), q(a.value, '')], {}), r('quantity', [d(`${inv}:limit`), q(a.limit, '')], {})], {}), 'simulated', 'watchdog', { by: this.physics });
    const margin = a.limit ? Math.abs(a.value) / Math.abs(a.limit) : 1;
    return this.commit(inv, 'observation', item, [], { of: 'watchdog', anomaly: { kind: a.kind, severity: a.severity, id: a.id, value: a.value, limit: a.limit, detail: a.detail }, part, obligation }, { by: 'comparison', verdict: 'failed', margin }, 'open', 'event:watchdog', since);
  }

  /** A part admitted that is outside the rigid realisation's domain: noted, resolved, said; nothing to investigate. */
  async observeConstruct(part: PartInfo, domain: ReturnType<typeof rigidDomain>, since: number): Promise<Commit> {
    // once per part, across sessions: a build loaded again admits the same parts again
    const already = of(this.journal.commits, `construct:${part.id}`)[0];
    if (already) return already;
    const item = r('constrain', [d(`part:${part.id}`), d('outside-rigid-domain')], { mode: 'true', ev: { how: 'derived', src: ['tsc.rigid-domain'] }, margin: domain.ratio });
    return this.commit(`construct:${part.id}`, 'observation', item, [], { of: 'construct', part, domain: { cSound: domain.cSound, crossing: domain.crossing, tick: domain.tick, ratio: domain.ratio, critical: domain.critical } }, { by: 'comparison', verdict: 'contradicted', margin: domain.ratio }, 'resolved', 'event:construct', since);
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
        if (a.from.data['of'] === 'watchdog') {
          const an = a.from.data['anomaly'] as { kind: string; value: number; limit: number }, part = a.from.data['part'] as PartInfo | null, obligation = a.from.data['obligation'] as string;
          const testable = !!part && ['jitter', 'restless', 'flung', 'energy', 'spin', 'drift'].includes(an.kind);
          const item = r('contradict', [a.from.item, r('quantity', [d(obligation), q(an.limit, '')], {})], { mode: 'contradictory', margin: a.from.validation.margin, under: [`obligation ${obligation}`, 'model rigid-body'] });
          return this.commit(inv, 'anomaly', item, [a.from.seq], { of: 'watchdog', candidates: testable ? ['rigid-domain'] : [], generic: [{ kind: 'numerical artifact', says: 'the solver, not the physics', settledBy: 'a smaller step' }], tried: [] }, { by: 'comparison', verdict: 'contradicted', margin: a.from.validation.margin }, 'open', 'ego', since);
        }
        const o = a.from.data['outcome'] as Outcome, p = a.from.data['predicted'] as Prediction, sig = a.from.data['signature'] as Signature;
        // what contradicted the prediction: a joint past its share, or (strong enough, not stable) the whole thing tipping
        const an = sig.tipped && o.u <= p.uMax
          ? anomalyOf(`${inv}:${a.from.seq}`, { value: o.tilt, tolerance: Math.PI / 180, names: ['tilt'], instrument: 'test stand', environment: this.physics }, { value: TILT_LIMIT, lawAncestry: [...p.laws, 'statics.overturning'], modelVersion: p.model })
          : anomalyOf(`${inv}:${a.from.seq}`, { value: o.u, tolerance: TOLERANCE, names: ['joint utilisation'], instrument: 'test stand', environment: this.physics }, { value: p.uMax, lawAncestry: p.laws, modelVersion: p.model });
        const tried = ((a.from.data['test'] as TestSpec).changes);
        const cands = candidatesOf(sig, tried);
        const generic = an.candidates.map((x: Explanation) => ({ kind: x.kind, says: x.says, settledBy: x.settledBy }));
        return this.commit(inv, 'anomaly', an.structure, [a.from.seq], { sigma: an.sigma, status: an.status, candidates: cands.map((c) => c.id), generic, tried }, { by: 'comparison', verdict: 'contradicted', margin: an.sigma }, 'open', 'ego', since);
      }
      case 'hypothesise': {
        // the anomaly this is for: the one the belief retried from, or the one in hand
        const an = a.from.kind === 'anomaly' ? a.from : of(all, inv).filter((c) => c.kind === 'anomaly').at(-1)!;
        if (an.data['of'] === 'watchdog') {
          const obs = of(all, inv).find((c) => c.kind === 'observation')!;
          const part = obs.data['part'] as PartInfo | null;
          const tried = of(all, inv).filter((c) => c.kind === 'hypothesis').map((h) => h.data['candidate'] as string);
          if (part && (an.data['candidates'] as string[]).includes('rigid-domain') && !tried.includes('rigid-domain')) {
            const claim = r('constrain', [d(`part:${part.id}`), d('rigid-realisation-domain')], { mode: 'unknown', mech: 'sound crossing against the tick', ev: { how: 'hypothesized' } });
            return this.commit(inv, 'hypothesis', claim, [an.seq, obs.seq], { candidate: 'rigid-domain', says: `${part.name} is longer than one tick of sound in its material, so the rigid body is outside its domain for it and the finding is the model's extrapolation, not physics`, test: { of: 'rigid', material: part.material, longest: part.longest }, predict: { inside: false }, laws: ['sound.speed'], lawHashes: hashesOfLaws(['sound.speed']) }, { by: 'none', verdict: 'none' }, 'testing', 'ego', since);
          }
          return this.commit(inv, 'question', r('state', [an.item], { mode: 'unknown', instrument: 'a smaller step, or a deformable part model' }), [an.seq], { asks: 'unexplained', says: 'nothing I can test settles it: the finding stays alive as an anomaly of the physics' }, { by: 'none', verdict: 'none' }, 'open', 'ego', since);
        }
        const failed = of(all, inv).filter((c) => (c.kind === 'observation' || c.kind === 'evidence') && (c.validation.verdict === 'failed' || c.validation.verdict === 'contradicted')).at(-1)!;
        const sig = failed.data['signature'] as Signature;
        const tried = of(all, inv).filter((c) => c.kind === 'hypothesis').flatMap((h) => ((h.data['test'] as TestSpec).changes));
        const cand = candidatesOf(sig, tried)[0];
        if (cand?.id === 'anchor') {
          // a design question, not a strength one: held open, with nothing the stand can test
          return this.commit(inv, 'hypothesis', cand.claim, [an.seq, failed.seq], { candidate: cand.id, says: cand.says, change: cand.change, test: { spec: (failed.data['test'] as TestSpec).spec, changes: (failed.data['test'] as TestSpec).changes, factor: 1 }, predict: { held: true, uMax: JOINT_LIMIT, model: 'anchored', laws: [] } }, { by: 'none', verdict: 'none' }, 'open', 'ego', since);
        }
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
        if ((a.of.data['test'] as { of?: string }).of === 'rigid') {
          const t2 = a.of.data['test'] as { material: string; longest: number }, predict = a.of.data['predict'] as { inside: boolean };
          const rd = (this.effects.rigid ?? rigidDomain)(t2.material, t2.longest);
          const item = e(r('state', [r('quantity', [d(`${inv}:crossing`), q(rd.crossing, 's')], {}), r('quantity', [d(`${inv}:tick`), q(rd.tick, 's')], {})], {}), 'derived', 'tsc.rigid-domain');
          return this.commit(inv, 'evidence', item, [a.of.seq], { of: 'watchdog', test: t2, outcome: { cSound: rd.cSound, crossing: rd.crossing, tick: rd.tick, ratio: rd.ratio, inside: rd.inside, critical: rd.critical }, predicted: predict, tests: a.of.kind }, { by: 'comparison', verdict: rd.inside === predict.inside ? 'supported' : 'contradicted', margin: rd.ratio }, 'open', 'ego', since);
        }
        const test = a.of.data['test'] as TestSpec, predict = a.of.data['predict'] as Prediction;
        const { setup, frag, roles } = buildTest(test, this.effects.sim);
        const res = await this.effects.stand(setup);
        const o = outcomeOf(res), sig = signatureOf(res, frag, roles);
        return this.commit(inv, 'evidence', e(resultStructure(inv, o), 'simulated', 'test stand', { by: this.physics }), [a.of.seq], { test, outcome: o, signature: sig, predicted: predict, tests: a.of.kind }, verdictOf(o, predict), 'open', 'event:stand', since);
      }
      case 'judge': {
        const tested = all.find((c) => c.seq === a.of.parents[0])!;
        const supported = a.of.validation.verdict === 'supported';
        if (tested.data['candidate'] === 'rigid-domain') {
          const claim = structuredClone(tested.item) as R;
          claim.c = { ...claim.c, mode: supported ? 'true' : 'false', ev: { how: 'derived', src: ['tsc.rigid-domain', 'sound.speed'] }, margin: a.of.validation.margin };
          return this.commit(inv, 'belief', claim, [tested.seq, a.of.seq], { hypothesis: tested.seq, transition: { from: 'unknown', to: supported ? 'true' : 'false' }, hypothesisStatus: supported ? 'confirmed' : 'rejected', outcome: a.of.data['outcome'], test: a.of.data['test'], next: supported ? 'done' : 'retry', uncertainty: { species: 'derivation', replication: 1, measured: false, physics: this.physics } }, a.of.validation, supported ? 'resolved' : 'open', 'ego', since);
        }
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
