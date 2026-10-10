// The rigid-body realization: the kept kernel wrapped as a morphism with a contract. This is the only module of the
// core that speaks to the engine. A body exists in the kernel if and only if a configuration body binds it; the
// kernel's words for things (its part kinds) live here and nowhere else. What the kernel cannot see, the contract
// says it cannot see: the sag of an elastic beam is unobserved by a realization whose bodies are rigid.

import type initJolt from 'jolt-physics/wasm-compat';
import { getMaterial, MATERIALS } from '../../data/materials';
import { makePart, newDoc } from '../../doc/commands';
import { seededIds } from '../../doc/ids';
import type { Part } from '../../doc/types';
import { CONTACT_TOLERANCE } from '../../ganglia/tree/gate';
import { PhysicsWorld } from '../../physics/world';
import type { Prism } from './coupling';
import { evaluate, measurement, ofLeaf, unobserved, type Derivation, type Window } from './evaluate';
import type { Ground, Observer } from './field';
import { add, and, div, k, leaf, mul, sub, variable, type Leaf } from './term';
import { resolution, type Resolution } from './domain';

export type Jolt = Awaited<ReturnType<typeof initJolt>>;

/** What the rigid-body kernel promises, every number with its grounds. */
export interface RigidContract {
  name: string;
  /** The gap left between faces placed in contact. */
  clearance: Derivation;
  /** A support is realized as a knife edge this wide, so the reaction line is determinate within it. */
  supportWidth: Derivation;
  /** The reaction line's offset over both supports: zero, uncertain by the knife-edge width. */
  reactionOffset: Derivation;
  /** The kernel's measured error on a bond's bending moment against statics. */
  momentError: Derivation;
  /** The kernel's measured error on a joint's reported loads against statics. */
  jointLoadError: Derivation;
  /** The kernel's measured error on the period of a bar on a free hinge, and the swing energy it loses per period. */
  periodError: Derivation;
  hingeDissipation: Derivation;
  /** Below this the kernel's positions say nothing (its penetration slop). */
  positionResolution: Derivation;
  /** Segments a breakable member is cut into: stations at Lt / n. */
  segments: Derivation;
  /** The ground field is sampled onto the kernel's height grid: this far across, at this cell. */
  terrainSpan: Derivation;
  terrainCell: Derivation;
  /** Still: slower than this, linear and angular, for the observer's quiet time (the stand's rule). */
  stillSpeed: Derivation;
  stillTurn: Derivation;
  /** What it does not realize. */
  unrealized: { what: string; because: string }[];
  /** Kernel words, declared: the material of a knife edge, the kinds a prism maps to. */
  words: { supportMaterial: string; beamKind: string; blockKind: string };
  hash: string;
}

export function rigidContract(): RigidContract {
  const c = (name: string, value: number, unit: string, source: string, uncertainty?: number) => ofLeaf(leaf(name, value, unit, { class: 'configuration', source }, uncertainty));
  const supportWidth = c('knife-edge width', 0.006, 'm', 'tests/conformance/fracture.test.ts (a plank on two supports): a 6 mm support makes the reaction line determinate; a wide rigid support leaves it indeterminate');
  const contract: Omit<RigidContract, 'hash'> = {
    name: 'rigid-body kernel (Jolt), as its conformance tests measure it',
    clearance: c('placement clearance', 0.0005, 'm', 'the kernel\'s conformance rig places resting parts 0.5 mm apart: inside its contact tolerance (2 mm), outside penetration'),
    supportWidth,
    reactionOffset: ofLeaf(leaf('reaction line offset over both supports', 0, 'm', { class: 'configuration', source: 'each reaction lies within its knife edge, so the span between reactions is within ± the knife-edge width of the centre distance' }, supportWidth.value!)),
    momentError: ofLeaf(leaf('bond moment error', 0.05, '1', { class: 'measured', source: 'tests/conformance/fracture.test.ts: bond bending moments on a plank over two supports hold within 5 % of statics' })),
    jointLoadError: ofLeaf(leaf('joint load error', 0.01, '1', { class: 'measured', source: 'tests/conformance/joins.test.ts: a bolted cantilever arm reports the root moment and shear of statics within 1 %' })),
    periodError: ofLeaf(leaf('period error of a free hinge', 0.005, '1', { class: 'measured', source: 'tests/conformance/laws.test.ts: a bar on a free hinge swings at the physical pendulum\'s period within 0.5 % at 30°' })),
    hingeDissipation: ofLeaf(leaf('swing energy lost per period at a free hinge', 0.02, '1', { class: 'measured', source: 'tests/conformance/laws.test.ts: a bar on a free hinge loses under 2 % of its swing energy per period at 30°' })),
    positionResolution: c('position resolution', CONTACT_TOLERANCE, 'm', 'ganglia/tree/gate.ts CONTACT_TOLERANCE: the kernel\'s penetration slop'),
    segments: c('segments of a breakable member', 6, '1', 'six segments: stations at Lt/6; the station under the load patch is not observed (how a resting mass shares itself between two segments at a seam is indeterminate)'),
    terrainSpan: c('terrain span', 8, 'm', 'the kernel\'s height grid covers eight metres square around the origin: more than the slice reaches'),
    terrainCell: c('terrain cell', 0.1, 'm', 'the kernel\'s height grid samples the ground field every 0.1 m; between samples the terrain is linear'),
    stillSpeed: c('still: linear speed under', 0.001, 'm/s', 'the stand\'s rule (kept physics/stand.ts): still is under 1 mm/s'),
    stillTurn: c('still: angular speed under', 0.01, 'rad/s', 'the stand\'s rule (kept physics/stand.ts): still is under 0.01 rad/s'),
    unrealized: [
      { what: 'elastic deflection', because: 'bodies are rigid and bonded segments hold their rest shape until they yield or break: a beam does not bend elastically here' },
      { what: 'air', because: 'air drag is off: the semantics has no air' },
    ],
    words: { supportMaterial: 'polymer.ptfe', beamKind: 'plate', blockKind: 'block' },
  };
  return { ...contract, hash: [contract.clearance, contract.supportWidth, contract.momentError, contract.positionResolution, contract.segments, contract.terrainCell].map((d) => d.hash).join('.') };
}

export interface BodyBinding { name: string; kernelId: string; role: 'beam' | 'support' | 'load' }

/** A bond's moment: a point sample in x (the seam), coarse-grained in t over the quiet window. */
export interface StationMoment { station: Derivation; moment: Derivation; bond: number }

export interface Realization {
  contract: RigidContract;
  bodies: BodyBinding[];
  window: Window;
  /** What the kernel resolves: a seam is a point in x, on a lattice of Lt/n; a sample is the mean over the quiet time. */
  resolution: Resolution;
  /** The bending moment measured at each observed station. */
  moments: StationMoment[];
  /** 1 when nothing fractured or yielded and nothing sank past the resolution. */
  stood: Derivation;
  /** 1 when the world was still for the observer's quiet time within its patience. */
  settled: Derivation;
  /** 1 when it settled and stood: at rest where it was configured, not fallen. */
  inPlace: Derivation;
  allowance: Derivation;
  drop: Derivation;
  sag: Derivation;
  events: string[];
}

export interface BeamBodies { beam: Prism; supports: [Prism, Prism]; load: Prism; totalLength: Derivation; patch: Derivation; gravity: Derivation; ground: Ground }

const val = (d: Derivation, what: string) => { if (d.value === null) throw new Error(`${what}: ${d.name} has no value (${d.status}); nothing is realized from an unknown`); return d.value; };

/** Run the configuration in the kernel under the contract and read what the contract says can be read. */
/** The kernel's world with the ground field projected onto it: flat within the position resolution, a floor slab; else its height grid. */
export function openWorld(J: Jolt, c: RigidContract, gravity: Derivation, ground: Ground): { world: PhysicsWorld; ids: ReturnType<typeof seededIds> } {
  const doc = newDoc('nexus realization', '2026-10-04T00:00:00Z');
  const g = val(gravity, 'gravity');
  const world = new PhysicsWorld(J, { ...doc.sim, gravity: [0, -g, 0], airDrag: false });
  const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
  const span = val(c.terrainSpan, 'terrain span'), cell = val(c.terrainCell, 'terrain cell');
  const nCells = Math.round(span / cell) + 1;
  const heights = new Float32Array(nCells * nCells);
  const at = (v: number, name: string) => ofLeaf(leaf(name, v, 'm', { class: 'configuration', source: `${c.name}: a node of its height grid` }));
  let lo = Infinity, hi = -Infinity;
  for (let zi = 0; zi < nCells; zi++) for (let xi = 0; xi < nCells; xi++) {
    const h = val(ground.height(at(-span / 2 + xi * cell, 'grid x'), at(-span / 2 + zi * cell, 'grid z')), 'ground');
    heights[zi * nCells + xi] = h; lo = Math.min(lo, h); hi = Math.max(hi, h);
  }
  if (hi - lo < val(c.positionResolution, 'resolution')) world.apply({ op: 'environment', boxes: [{ half: [50, 0.5, 50], pose: { p: [0, lo - 0.5, 0], q: [0, 0, 0, 1] }, material: 'concrete.c30' }], materials });
  else world.apply({ op: 'terrain', field: { n: nCells, size: span, heights }, material: getMaterial('concrete.c30') });
  return { world, ids: seededIds(1) };
}

/** A placed prism into the kernel as the part the contract's words name; refused parts are errors here. */
export function placePrism(world: PhysicsWorld, ids: ReturnType<typeof seededIds>, p: Prism, part: Omit<Parameters<typeof makePart>[0], 'pose'>, q: [number, number, number, number] = [0, 0, 0, 1]): Part {
  if (!p.centre) throw new Error(`${p.name} is not placed: no coordinate binds it`);
  const made = makePart({ ...part, pose: { p: [val(p.centre.x, p.name), val(p.centre.y, p.name), val(p.centre.z, p.name)], q } }, ids);
  const r = world.apply({ op: 'upsertPart', part: made, material: getMaterial(made.material), keepLivePose: false });
  if (r) throw new Error(`the kernel refused ${p.name}: ${r.reason}`);
  return made;
}

export const extentsOf = (p: Prism) => ({ x: val(p.extents.x, p.name), y: val(p.extents.y, p.name), z: val(p.extents.z, p.name) });

export interface Watched { ran: number; wasStill: boolean; events: string[]; quietTicks: number; tick: number; quietSeconds: number }

/** Step the world until the watched bodies are still for the observer's quiet time, within its patience; `onTick` sees every step. */
export function watchStill(world: PhysicsWorld, c: RigidContract, obs: Observer, watched: string[], onTick?: (r: ReturnType<PhysicsWorld['step']>) => void): Watched {
  const stillSpeed = val(c.stillSpeed, 'still'), stillTurn = val(c.stillTurn, 'still');
  const tick = val(obs.tick, 'tick'), quietTicks = Math.round(val(obs.quiet, 'quiet') / tick), maxTicks = Math.round(val(obs.patience, 'patience') / tick);
  const events: string[] = [];
  let still = 0, ran = 0;
  for (let i = 0; i < maxTicks; i++) {
    const r = world.step();
    ran = i + 1;
    for (const e of r.events) if (e.type === 'fracture' || e.type === 'yield' || e.type === 'break') events.push(`${e.type}: ${'note' in e ? e.note : ''}`);
    onTick?.(r);
    const moving = watched.some((id) => { const v = world.linearVelocity(id), w = world.angularVelocity(id); return (!!v && Math.hypot(...v) > stillSpeed) || (!!w && Math.hypot(...w) > stillTurn); });
    still = moving ? 0 : still + 1;
    if (still >= quietTicks) break;
  }
  return { ran, wasStill: still >= quietTicks, events, quietTicks, tick, quietSeconds: Math.min(ran, quietTicks) * tick };
}

/** A time sample: the mean over the quiet ticks, uncertain by half the range. */
export function timeSample(history: number[], quietTicks: number): { mean: number; halfRange: number } {
  const h = history.slice(-quietTicks).filter((v) => Number.isFinite(v));
  if (!h.length) return { mean: NaN, halfRange: NaN };
  return { mean: h.reduce((p, q) => p + q, 0) / h.length, halfRange: (Math.max(...h) - Math.min(...h)) / 2 };
}

/** Run the configuration in the kernel under the contract and read what the contract says can be read. */
export function realizeRigid(J: Jolt, c: RigidContract, bodies: BeamBodies, obs: Observer): Realization {
  const { world, ids } = openWorld(J, c, bodies.gravity, bodies.ground);
  const n = val(c.segments, 'segments');
  const bindings: BodyBinding[] = [];
  for (const s of bodies.supports) {
    const e = extentsOf(s);
    const part = placePrism(world, ids, s, { kind: c.words.blockKind, material: c.words.supportMaterial, name: s.name, frozen: true, params: { x: e.x, y: e.y, z: e.z } });
    bindings.push({ name: s.name, kernelId: part.id, role: 'support' });
  }
  const be = extentsOf(bodies.beam);
  const beam = placePrism(world, ids, bodies.beam, { kind: c.words.beamKind, material: bodies.beam.material, name: bodies.beam.name, params: { length: be.x, thickness: be.y, width: be.z, fracture: String(n) } });
  bindings.push({ name: bodies.beam.name, kernelId: beam.id, role: 'beam' });
  const le = extentsOf(bodies.load);
  const load = placePrism(world, ids, bodies.load, { kind: c.words.blockKind, material: bodies.load.material, name: bodies.load.name, params: { x: le.x, y: le.y, z: le.z } });
  bindings.push({ name: bodies.load.name, kernelId: load.id, role: 'load' });

  // watch until still, as the observer says; every bond's moment is kept for the time sample
  const y0 = world.livePose(load.id)!.p[1];
  const history: number[][] = [];
  const w = watchStill(world, c, obs, [load.id, beam.id], () => {
    world.bondStates(beam.id).forEach((s, kk) => { (history[kk] ??= []).push(s.loads ? Math.hypot(s.loads.M1, s.loads.M2) : NaN); });
  });
  const { ran, wasStill, events, quietTicks, tick, quietSeconds } = w;
  const window: Window = { tick, seconds: quietSeconds, instrument: c.name };
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);

  // the moments at the observed stations
  const Lt = val(bodies.totalLength, 'total length'), patch = val(bodies.patch, 'patch');
  const moments: StationMoment[] = [];
  const LtV = variable('Lt', 'm', 'total length'), nV = variable('n', '1', 'segments');
  const quiet = evaluate('quiet time of a sample', mul(k(Math.min(ran, quietTicks), `${Math.min(ran, quietTicks)} ticks`), variable('tick', 's')), { tick: obs.tick }, { unit: 's', law: 'the sample is the mean over the ticks the world was still' });
  const spacing = evaluate('lattice of seams', div(LtV, nV), { Lt: bodies.totalLength, n: c.segments }, { unit: 'm', law: 'the realization cuts a member into n segments' });
  const res = resolution(c.name, { t: quiet }, { x: spacing });
  world.bondStates(beam.id).forEach((s, kk) => {
    const x = -Lt / 2 + (Lt * (kk + 1)) / n;
    if (Math.abs(x) < patch / 2 + 1e-9) return;
    if (!s.loads) return;
    const station = evaluate(`seam of bond ${kk}`, add(div(LtV, k(-2, '−2')), div(mul(LtV, k(kk + 1)), nV)), { Lt: bodies.totalLength, n: c.segments }, { unit: 'm', law: 'the realization cuts a member into n segments: bond k lies at −Lt/2 + Lt (k+1)/n' });
    const { mean, halfRange } = timeSample(history[kk]!, quietTicks);
    const moment = measurement(`bending moment at bond ${kk}`, mean, 'N m', { instrument: `${c.name}: section force of a segment bond, mean over the quiet time`, window, uncertainty: halfRange }, mk);
    moments.push({ station, moment, bond: kk });
  });
  const y1 = world.livePose(load.id)!.p[1];
  const drop = measurement('drop of the load', y0 - y1, 'm', { instrument: `${c.name}: position of the load`, window }, mk);
  const allowance = evaluate('settling allowance of the load', mul(k(2, 'two rest couplings under the load'), add(variable('c', 'm', 'clearance'), variable('s', 'm', 'slop'))), { c: c.clearance, s: c.positionResolution }, { unit: 'm', law: 'each rest coupling settles by at most its clearance above and the kernel\'s penetration slop below the semantic boundary' });
  const stood = measurement('stood', events.length === 0 && y0 - y1 < allowance.value! ? 1 : 0, '1', { instrument: `${c.name}: no fracture, yield or break; the load sank less than its settling allowance (${allowance.value} m)`, window }, mk);
  const settled = measurement('settled', wasStill ? 1 : 0, '1', { instrument: `${c.name}: still (under ${val(c.stillSpeed, 'still')} m/s and ${val(c.stillTurn, 'still')} rad/s) for the quiet time within the patience of ${val(obs.patience, 'patience')} s`, window }, mk);
  const inPlace = evaluate('rests in place', and(variable('settled', '1'), variable('stood', '1')), { settled, stood }, { unit: '1', law: 'at rest where it was configured: still within the patience, and not fallen or broken' });
  const sag = unobserved('mid-span sag', 'm', `${c.name} does not realize ${c.unrealized[0]!.what}: ${c.unrealized[0]!.because}`, window, sub(variable('y', 'm'), variable('y0', 'm')));
  world.destroy();
  return { contract: c, bodies: bindings, window, resolution: res, moments, stood, settled, inPlace, allowance, drop, sag, events };
}
