// Prove it before you hand it over (as LEAP 71's Noyron does with every engine it designs). Ego's designer works a
// design out from first principles; then she builds it on her bench, sets the weight it is for on it, and runs it on
// the test stand, a world of its own with the same physics. What failed she fixes the way an engineer would: a joint
// that broke or worked near its limit gets the smallest change that carries 1.5x what it carried, a member that broke
// or yielded gets the design re-sized for more. Then she tests again. What she learns from each test she keeps: the
// joint upgrades her designs turned out to need, and how much extra margin each kind of design wants, so the next one
// starts closer to what works.

import { Bench } from '../app/bench';
import { getMaterial } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { connectionGeometry } from '../connectors/through';
import { fragmentOf, type Fragment } from '../doc/commands';
import type { Connection, SimSettings, Vec3 } from '../doc/types';
import { BuildHost } from '../forge/apphost';
import { run } from '../forge/forge';
import { effectiveParams, getPartKind } from '../parts/registry';
import { TILT_LIMIT, type StandLoad, type StandPush, type StandResult, type StandSetup } from '../physics/stand';
import { numberOf, type Params } from '../schema/params';
import { buildSheet, type BuildSheet } from './buildsheet';
import { design, type DesignSpec, type Plan } from './designer';
import { fixesFor, MARGIN } from './fixes';

/** A joint working at more than this share of its capacity on the stand is too close to its limit to hand over. */
export const JOINT_LIMIT = 1 / MARGIN;
const MAX_TRIES = 4;
const KEY = 'vrsb.stand';

/** What the tests taught her, kept on the headset. */
interface Learned {
  /** Per kind of design: the extra margin on its load that its members turned out to need. */
  margin: Record<string, number>;
  /** "This joint, as Best join makes it for this design, needs to be this instead." */
  joints: Record<string, { kind: string; params: Params }>;
  /** Kinds of design that turned out to need aprons. */
  aprons?: Record<string, boolean>;
  tests: number;
}

export class StandMemory {
  data: Learned = { margin: {}, joints: {}, tests: 0 };
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null) {
    try { const s = JSON.parse(this.storage?.getItem(KEY) ?? 'null'); if (s?.margin && s?.joints) this.data = s; } catch { /* start fresh */ }
  }
  margin(what: string) { return this.data.margin[what] ?? 1; }
  save() { try { this.storage?.setItem(KEY, JSON.stringify(this.data)); } catch { /* the storage watchdog says so */ } }
}

export interface Attempt { result: StandResult; changes: string[] }
export interface Proof {
  plan: Plan;
  /** The design as tested last, ready to place (the poses are where it was designed to stand). */
  fragment: Fragment;
  held: boolean;
  attempts: Attempt[];
  /** In words: how the tests went, try by try. */
  story: string[];
  /** What she learned this time, if anything. */
  learned: string[];
  loads: StandLoad[];
  /** Strong enough, but it tips over when pushed: it must be anchored (or its base made wider). */
  anchor: boolean;
  /** How to build it for real: every part, what it's cut from, every joint's hardware, the order, what was tested. */
  sheet: BuildSheet;
}

export type Stand = (setup: StandSetup) => Promise<StandResult>;

/** The weights a design is for, where they go: on a table's top, on every shelf; a wall or tower carries itself. */
export function standLoads(spec: DesignSpec, frag: Fragment): StandLoad[] {
  const kg = spec.load ?? (spec.what === 'bench' ? 150 : spec.what === 'table' ? 50 : spec.what === 'shelf' ? 20 : 0);
  if (!kg) return [];
  const top = (name: RegExp) => frag.parts.filter((p) => name.test(p.name));
  const onto = (p: Fragment['parts'][number], kgEach: number): StandLoad => {
    const k = getPartKind(p.kind);
    const d = k.dims(effectiveParams(k, p.params, getMaterial(p.material)));
    const half = d.b / 2;
    const w = Math.min(0.3, 0.6 * numberOf(p.params, 'length', 0.3)), dd = Math.min(0.3, 0.6 * numberOf(p.params, 'width', 0.3));
    return { kg: kgEach, at: [p.pose.p[0], p.pose.p[1] + half, p.pose.p[2]], size: [w, dd] };
  };
  if (spec.what === 'table' || spec.what === 'bench') return top(/top$/).map((p) => onto(p, kg));
  if (spec.what === 'shelf') return top(/shelf\d+$/).map((p) => onto(p, kg));
  return [];
}

/** A proof test: the design must also hold 1.5x its rated load and push (with the joints still under their limit). */
export const PROOF = 1.5;

/** A firm sideways shove, about what an adult leans or pushes with (N). */
export const PUSH = 300;

/**
 * How a design is pushed on the stand. Furniture fails sideways (racking) far more than straight down: a table's top
 * bears on its legs, but a push at its edge bends every leg joint. So a table or bench is pushed along its length at
 * the top's end, and a shelf unit across its width at the top shelf, half a second in, for a second and a half.
 */
export function standPushes(spec: DesignSpec, frag: Fragment): StandPush[] {
  const end = (p: Fragment['parts'][number]): StandPush => ({ part: p.id, at: [p.pose.p[0] + numberOf(p.params, 'length', 0) / 2, p.pose.p[1], p.pose.p[2]], force: [-PUSH, 0, 0], from: 0.5, to: 2 });
  if (spec.what === 'table' || spec.what === 'bench') return frag.parts.filter((p) => /top$/.test(p.name)).map(end);
  if (spec.what === 'shelf') {
    const shelves = frag.parts.filter((p) => /shelf\d+$/.test(p.name)).sort((a, b) => b.pose.p[1] - a.pose.p[1]);
    return shelves.length ? [end(shelves[0]!)] : [];
  }
  return [];
}

const sig = (what: string, c: Connection) => `${what}|${c.kind}|${JSON.stringify(c.params)}`;

/**
 * Design, build on the bench, test, fix and test again, until it holds with margin (or she has tried what she knows).
 * `stand` runs a test: in the headset, a world of its own in a worker; in tests, a world in the test runner.
 */
export async function prove(spec: DesignSpec, ox: number, oz: number, tag: string, sim: SimSettings, stand: Stand, memory = new StandMemory()): Promise<Proof> {
  const attempts: Attempt[] = [];
  const story: string[] = [];
  const learned: string[] = [];
  // what earlier tests taught her about this kind of design
  if (memory.data.aprons?.[spec.what]) spec = { ...spec, aprons: true };
  let factor = memory.margin(spec.what);
  let plan: Plan = design({ ...spec, load: spec.load !== undefined ? spec.load * factor : undefined }, ox, oz, tag);
  let bench = build(plan, sim);
  let changes: string[] = [];
  // what earlier tests taught her about her own joints, before this one is even tested
  for (const c of Object.values(bench.doc.connections)) {
    const fix = memory.data.joints[sig(spec.what, c)];
    if (fix) { setJoint(bench, c.id, fix.kind, fix.params); changes.push(`fitted ${describe(fix.kind, fix.params)} where her last test of a ${spec.what} needed it`); }
  }
  for (let t = 1; t <= MAX_TRIES; t++) {
    const frag = fragmentOf(bench.doc, Object.keys(bench.doc.parts), (id) => bench.doc.parts[id]!.pose, { p: [0, 0, 0], q: [0, 0, 0, 1] });
    const loads = standLoads(spec, frag), pushes = standPushes(spec, frag);
    const test = (ls: StandLoad[], ps: StandPush[]) => stand({ parts: frag.parts, connections: frag.connections, materials: bench.doc.materials, sim, loads: ls, pushes: ps, seconds: 3 });
    let result = await test(loads, pushes);
    let proof = false;
    // passed at its rated load: then the proof test, 1.5x the load and 1.5x the push, as a test house proves a part
    if (result.held && !Object.values(result.peak).some((p) => p.u > JOINT_LIMIT)) {
      const r2 = await test(loads.map((l) => ({ ...l, kg: l.kg * PROOF })), pushes.map((p) => ({ ...p, force: p.force.map((f) => f * PROOF) as Vec3 })));
      memory.data.tests++;
      proof = true;
      result = r2;
    }
    memory.data.tests++;
    attempts.push({ result, changes });
    const what = proof
      ? `proof test at ${PROOF}x: ${loads.length ? `${loads.map((l) => `${Math.round(l.kg * PROOF)} kg`).join(' + ')} on it` : 'its own weight'}${pushes.length ? `, pushed sideways with ${Math.round(PUSH * PROOF)} N at the top` : ''}`
      : `${loads.length ? `${loads.map((l) => `${Math.round(l.kg)} kg`).join(' + ')} on it` : 'its own weight'}${pushes.length ? `, pushed sideways with ${PUSH} N at the top` : ''}`;
    const worst = result.worst;
    // at the rated load a joint must stay under 1/1.5 of its capacity; at the proof load, under its capacity
    const nearLimit = Object.entries(result.peak).filter(([, p]) => p.u > (proof ? 1 : JOINT_LIMIT) && p.mode);
    const pct = (u: number) => `${Math.round(u * 100)}%`;
    if (result.held && !nearLimit.length) {
      story.push(`Test ${t}: ${what} for ${result.seconds} s. It held${worst ? `; the hardest-working joint at ${pct(worst.u)} of its ${worst.mode} capacity` : ''}${result.memberPeak ? `, the hardest-working member at ${pct(result.memberPeak.u)}` : ''}.`);
      // relax a margin that wasn't needed (never under 1: the designer's own 3x stays)
      if (factor > 1 && (result.memberPeak?.u ?? 0) < 0.3) { memory.data.margin[spec.what] = Math.max(1, factor * 0.9); }
      memory.save();
      return { plan, fragment: frag, held: true, attempts, story, learned, loads, anchor: false, sheet: sheetOf(spec, bench, result, story) };
    }
    // it went over in one piece: nothing broke, it's the whole thing that tipped. That is stability, not strength: no
    // joint fixes it. A real piece like this is anchored (or made wider at the base)
    if (!result.broken.length && !result.fractures.length && !result.yielded.length && result.tilt >= TILT_LIMIT && !nearLimit.length) {
      story.push(`Test ${t}: ${what}: it tipped over in one piece (${Math.round((result.tilt * 180) / Math.PI)}°), nothing broke. It's strong enough, but not stable: anchor it to the wall, as a real ${spec.what === 'shelf' ? 'bookcase' : spec.what} this tall needs (an anti-tip strap), or make its base wider.`);
      memory.save();
      return { plan, fragment: frag, held: true, attempts, story, learned, loads, anchor: true, sheet: sheetOf(spec, bench, result, story) };
    }
    const why: string[] = [];
    for (const b of result.broken) why.push(`the ${jointName(bench, b.conn)} broke in ${b.mode}`);
    for (const f of result.fractures) why.push(`${bench.doc.parts[f.part]?.name ?? 'a member'} fractured (${f.mode})`);
    for (const p of result.yielded) why.push(`${bench.doc.parts[p]?.name ?? 'a member'} bent past yield`);
    if (!result.broken.length && nearLimit.length) why.push(`${nearLimit.length} joint${nearLimit.length === 1 ? '' : 's'} worked above ${pct(JOINT_LIMIT)} of capacity`);
    if (result.drop >= 0.02) why.push(`it sank ${Math.round(result.drop * 1000)} mm`);
    if (result.tilt >= TILT_LIMIT) why.push(`it tipped ${Math.round((result.tilt * 180) / Math.PI)}°`);
    story.push(`Test ${t}: ${what}: ${why.join('; ') || 'it failed'}.`);
    if (t === MAX_TRIES) break;
    changes = [];
    // members that broke or yielded: the design re-sized for more, and remembered for this kind of design
    if (result.fractures.length || result.yielded.length) {
      factor *= 1.5;
      memory.data.margin[spec.what] = factor;
      learned.push(`a ${spec.what}'s members need ${factor.toFixed(2)}x the load I size them for`);
      plan = design({ ...spec, load: (spec.load ?? standLoads(spec, frag).reduce((s, l) => s + l.kg, 0)) * factor }, ox, oz, tag);
      bench = build(plan, sim);
      changes.push(`re-sized the members for ${factor.toFixed(2)}x the load`);
      continue;
    }
    // a table racking (its leg joints failing in bending under the push) is a design problem before it is a fastener
    // one: real tables have aprons, rails between the legs that take the racking. Add them first.
    const racking = (spec.what === 'table' || spec.what === 'bench') && !spec.aprons
      && [...result.broken.map((b) => ({ conn: b.conn, mode: b.mode })), ...nearLimit.map(([conn, p]) => ({ conn, mode: p.mode }))]
        .some((x) => x.mode === 'bending' && /leg\d+$/.test(bench.doc.parts[bench.doc.connections[x.conn]?.a.part ?? '']?.name ?? ''));
    if (racking) {
      spec = { ...spec, aprons: true };
      memory.data.aprons = { ...(memory.data.aprons ?? {}), [spec.what]: true };
      learned.push(`a ${spec.what} needs aprons to stand a sideways push`);
      plan = design({ ...spec, load: spec.load !== undefined ? spec.load * factor : undefined }, ox, oz, tag);
      bench = build(plan, sim);
      changes.push('added aprons: rails between the legs under the top, as real tables have');
      continue;
    }
    // joints that broke or worked too hard: the smallest change that carries 1.5x what they carried
    const sick = new Map<string, { mode: string; load: number }>();
    for (const b of result.broken) sick.set(b.conn, { mode: b.mode, load: b.load });
    for (const [id, p] of nearLimit) if (!sick.has(id)) sick.set(id, { mode: p.mode, load: p.load });
    // joints made alike (the four legs of a table) are fixed alike, for the hardest any of them worked, as a builder
    // would: one fix, sized for the worst, on every one
    const groups = new Map<string, { ids: string[]; mode: string; load: number }>();
    for (const c of Object.values(bench.doc.connections)) {
      const k = sig(spec.what, c), f = sick.get(c.id);
      const gr = groups.get(k) ?? groups.set(k, { ids: [], mode: '', load: 0 }).get(k)!;
      gr.ids.push(c.id);
      if (f && f.load * (f.mode === 'bending' || f.mode === 'torsion' ? 1 : 1) >= gr.load) { gr.mode = f.mode; gr.load = f.load; }
    }
    let fixed = 0;
    const upgraded = new Set<string>();
    for (const [key, gr] of groups) {
      if (!gr.mode) continue;
      const c = bench.doc.connections[gr.ids[0]!]!;
      if (getConnectorKind(c.kind).model !== 'rigid') continue;
      const { a, b, g } = geometry(bench, c);
      const fix = fixesFor({ kind: c.kind, params: c.params, mode: gr.mode, load: gr.load }, a, b, g, 1)[0];
      if (!fix) continue;
      upgraded.add(getConnectorKind(c.kind).label.toLowerCase());
      for (const id of gr.ids) setJoint(bench, id, fix.kind, fix.params);
      memory.data.joints[key] = { kind: fix.kind, params: fix.params };
      changes.push(`fitted ${fix.label} to ${gr.ids.length === 1 ? `the ${jointName(bench, gr.ids[0]!)}` : `all ${gr.ids.length} ${getConnectorKind(c.kind).label.toLowerCase()} joints like ${jointName(bench, gr.ids[0]!).replace(/^[a-z]+ joint, /, '')}`}`);
      fixed++;
    }
    if (fixed) { learned.push(`a ${spec.what}'s ${[...upgraded].join(' and ')} joints need upgrading`); continue; }
    story.push("I don't have a fix for that: it needs a different design.");
    break;
  }
  memory.save();
  const last = fragmentOf(bench.doc, Object.keys(bench.doc.parts), (id) => bench.doc.parts[id]!.pose, { p: [0, 0, 0], q: [0, 0, 0, 1] });
  return { plan, fragment: last, held: false, attempts, story, learned, loads: standLoads(spec, last), anchor: false, sheet: sheetOf(spec, bench, attempts[attempts.length - 1]?.result ?? null, story) };
}

/** The build sheet for the design as last tested, with how hard each joint worked in that test. */
function sheetOf(spec: DesignSpec, bench: Bench, result: StandResult | null, story: string[]): BuildSheet {
  const tested: Record<string, { u: number; mode: string }> = {};
  for (const [id, p] of Object.entries(result?.peak ?? {})) if (p.mode) tested[id] = { u: p.u, mode: p.mode };
  return buildSheet(bench.doc, (p) => bench.materialOf(p), undefined, { title: `Ego's ${spec.what}`, tested, testStory: story });
}

function build(plan: Plan, sim: SimSettings) {
  const bench = new Bench(sim);
  const r = run(plan.forge, new BuildHost(bench));
  if (!r.ok) throw new Error(`the design didn't build: ${r.error}`);
  return bench;
}

function setJoint(bench: Bench, id: string, kind: string, params: Params) {
  bench.store.transact('fit a stronger joint', (tx) => tx.update('connections', id, { kind, params }));
}

function geometry(bench: Bench, c: Connection) {
  const pa = bench.doc.parts[c.a.part]!, pb = c.b ? bench.doc.parts[c.b.part] ?? null : null;
  return { a: bench.materialOf(pa), b: pb ? bench.materialOf(pb) : null, g: connectionGeometry(bench.doc, c, (p) => bench.materialOf(p)) };
}

function jointName(bench: Bench, id: string) {
  const c = bench.doc.connections[id];
  if (!c) return 'joint';
  const n = (pid: string) => bench.doc.parts[pid]?.name.replace(/^[a-z]+\d+-/, '') ?? 'a part';
  return `${getConnectorKind(c.kind).label.toLowerCase()} joint, ${n(c.a.part)}–${c.b ? n(c.b.part) : 'floor'}`;
}

function describe(kind: string, params: Params) {
  return `${getConnectorKind(kind).label.toLowerCase()}${'count' in params ? ` ×${params['count']}` : ''}`;
}
