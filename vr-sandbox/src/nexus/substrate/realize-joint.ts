// The rigid-body kernel realizing a bracket: a post standing on the ground, an arm bolted to its side, a load
// resting on the arm. The joint is a coupling the kernel reports loads for; its words (the connector kind, the
// bolt size names) live here and nowhere else. The joint's loads are time samples over the quiet ticks.

import { getMaterial } from '../../data/materials';
import { makeConnection } from '../../doc/commands';
import { axisAngle } from '../../doc/math';
import { METRIC_COARSE } from '../../engineering/threads';
import type { Prism } from './coupling';
import { resolution, type Resolution } from './domain';
import { evaluate, measurement, ofLeaf, unobserved, type Derivation, type Window } from './evaluate';
import type { Ground, Observer } from './field';
import { extentsOf, openWorld, placePrism, timeSample, watchStill, type BodyBinding, type Jolt, type RigidContract } from './realize';
import { add, and, k, leaf, mul, sub, variable, type Leaf } from './term';

export interface JointSpec {
  /** Where the joint sits in each body's own frame: coupling solutions. */
  onPost: { x: Derivation; y: Derivation; z: Derivation };
  onArm: { x: Derivation; y: Derivation; z: Derivation };
  /** The bolt group: nominal diameter (a catalogue leaf), bolts, and the bonded face's extents. */
  diameter: Derivation;
  count: Derivation;
  bondW: Derivation;
  bondL: Derivation;
  /** Kernel words for the bolt's property class. */
  propertyClass: string;
}

export interface BracketBodies { post: Prism; arm: Prism; load: Prism; joint: JointSpec; gravity: Derivation; ground: Ground }

export interface JointRealization {
  contract: RigidContract;
  bodies: BodyBinding[];
  window: Window;
  resolution: Resolution;
  /** The joint's loads as the kernel reports them: time samples over the quiet ticks. */
  moment: Derivation;
  shear: Derivation;
  axial: Derivation;
  utilisation: Derivation;
  /** 1 while the joint is intact at the end of the watch. */
  holds: Derivation;
  stood: Derivation;
  settled: Derivation;
  inPlace: Derivation;
  sag: Derivation;
  events: string[];
  /** The kernel's own word for what governed the joint. */
  mode: string;
}

const val = (d: Derivation, what: string) => { if (d.value === null) throw new Error(`${what}: ${d.name} has no value (${d.status}); nothing is realized from an unknown`); return d.value; };

/** The kernel's name for a bolt of this nominal diameter. */
export function boltSizeOf(d: number): string {
  const hit = Object.entries(METRIC_COARSE).find(([, t]) => Math.abs(t.d - d) < 1e-9);
  if (!hit) throw new Error(`no stocked metric thread of diameter ${d} m`);
  return hit[0];
}

export function realizeBracket(J: Jolt, c: RigidContract, b: BracketBodies, obs: Observer): JointRealization {
  const { world, ids } = openWorld(J, c, b.gravity, b.ground);
  const bindings: BodyBinding[] = [];
  const pe = extentsOf(b.post);
  const post = placePrism(world, ids, b.post, { kind: c.words.blockKind, material: b.post.material, name: b.post.name, frozen: true, params: { x: pe.x, y: pe.y, z: pe.z } });
  bindings.push({ name: b.post.name, kernelId: post.id, role: 'support' });
  const ae = extentsOf(b.arm);
  const arm = placePrism(world, ids, b.arm, { kind: c.words.beamKind, material: b.arm.material, name: b.arm.name, params: { length: ae.x, thickness: ae.y, width: ae.z, fracture: String(val(c.segments, 'segments')) } });
  bindings.push({ name: b.arm.name, kernelId: arm.id, role: 'beam' });
  const le = extentsOf(b.load);
  const load = placePrism(world, ids, b.load, { kind: c.words.blockKind, material: b.load.material, name: b.load.name, params: { x: le.x, y: le.y, z: le.z } });
  bindings.push({ name: b.load.name, kernelId: load.id, role: 'load' });
  // the joint: its y along the face normal, +x of the frame
  const toX = axisAngle([0, 0, 1], -Math.PI / 2);
  const j = b.joint;
  const conn = makeConnection({
    kind: 'bolted',
    a: { part: post.id, frame: { p: [val(j.onPost.x, 'joint'), val(j.onPost.y, 'joint'), val(j.onPost.z, 'joint')], q: toX } },
    b: { part: arm.id, frame: { p: [val(j.onArm.x, 'joint'), val(j.onArm.y, 'joint'), val(j.onArm.z, 'joint')], q: toX } },
    params: { size: boltSizeOf(val(j.diameter, 'bolt')), class: j.propertyClass, count: Math.round(val(j.count, 'bolts')), bondW: val(j.bondW, 'bond'), bondL: val(j.bondL, 'bond') },
  }, ids);
  const refused = world.apply({ op: 'upsertConnection', conn, materials: Object.fromEntries([post.material, arm.material].map((m) => [m, getMaterial(m)])) });
  if (refused) throw new Error(`the kernel refused the joint: ${refused.reason}`);

  const y0 = world.livePose(load.id)!.p[1];
  const hist = { bending: [] as number[], shear: [] as number[], axial: [] as number[], u: [] as number[] };
  let mode = '';
  const w = watchStill(world, c, obs, [load.id, arm.id], (r) => {
    const l = r.loads.find((x) => x.id === conn.id);
    if (l) { hist.bending.push(l.bending); hist.shear.push(l.shear); hist.axial.push(l.axial); hist.u.push(l.u); mode = l.mode; }
  });
  const window: Window = { tick: w.tick, seconds: w.quietSeconds, instrument: c.name };
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
  const quiet = evaluate('quiet time of a sample', mul(k(Math.min(w.ran, w.quietTicks), `${Math.min(w.ran, w.quietTicks)} ticks`), variable('tick', 's')), { tick: obs.tick }, { unit: 's', law: 'the sample is the mean over the ticks the world was still' });
  const res = resolution(c.name, { t: quiet }, {});
  const sample = (name: string, h: number[], unit: string, what: string) => { const { mean, halfRange } = timeSample(h, w.quietTicks); return measurement(name, mean, unit, { instrument: `${c.name}: ${what}, mean over the quiet time`, window, uncertainty: halfRange }, mk); };
  const moment = sample('bending moment at the joint', hist.bending, 'N m', 'the joint\'s bending load');
  const shear = sample('shear at the joint', hist.shear, 'N', 'the joint\'s shear load');
  const axial = sample('axial load at the joint', hist.axial, 'N', 'the joint\'s axial load');
  const utilisation = sample('utilisation of the joint', hist.u, '1', 'the joint\'s governing load over its capacity');
  const intact = world.connectionStatus(conn.id) === 'intact';
  const holds = measurement('the joint holds', intact ? 1 : 0, '1', { instrument: `${c.name}: the joint's status at the end of the watch`, window }, mk);
  const y1 = world.livePose(load.id)!.p[1];
  const allowance = evaluate('settling allowance of the load', mul(k(1, 'one rest coupling under the load'), add(variable('c', 'm', 'clearance'), variable('s', 'm', 'slop'))), { c: c.clearance, s: c.positionResolution }, { unit: 'm', law: 'a rest coupling settles by at most its clearance above and the kernel\'s penetration slop below the semantic boundary' });
  const stood = measurement('stood', w.events.length === 0 && intact && y0 - y1 < allowance.value! ? 1 : 0, '1', { instrument: `${c.name}: no fracture, yield or break; the joint intact; the load sank less than its settling allowance (${allowance.value} m)`, window }, mk);
  const settled = measurement('settled', w.wasStill ? 1 : 0, '1', { instrument: `${c.name}: still for the quiet time within the patience of ${val(obs.patience, 'patience')} s`, window }, mk);
  const inPlace = evaluate('rests in place', and(variable('settled', '1'), variable('stood', '1')), { settled, stood }, { unit: '1', law: 'at rest where it was configured: still within the patience, and not fallen or broken' });
  const sag = unobserved('tip sag', 'm', `${c.name} does not realize ${c.unrealized[0]!.what}: ${c.unrealized[0]!.because}`, window, sub(variable('y', 'm'), variable('y0', 'm')));
  world.destroy();
  return { contract: c, bodies: bindings, window, resolution: res, moment, shear, axial, utilisation, holds, stood, settled, inPlace, sag, events: w.events, mode };
}

export const boltLeaf = (name: string, v: number, unit: string, source: string) => ofLeaf(leaf(name, v, unit, { class: 'configuration', source }));
