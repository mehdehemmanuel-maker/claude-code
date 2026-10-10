// The rigid-body kernel realizing a bar on a hinge: the hinge is a coupling with one degree of freedom, the angle,
// and the kernel's words for it (the connector kind, the pin) live here. Time is the coordinate: the angle is a
// lattice of point samples at the tick over the watch; the period is read from its zero crossings with the tick
// as its resolution; the swing energy is the ledger of the hinge coupling over time.

import { makeConnection } from '../../doc/commands';
import { axisAngle, rotate } from '../../doc/math';
import type { Prism } from './coupling';
import { resolution, type Resolution } from './domain';
import { evaluate, measurement, ofLeaf, type Derivation, type Window } from './evaluate';
import type { Ground, Observer } from './field';
import { extentsOf, openWorld, placePrism, type BodyBinding, type Jolt, type RigidContract } from './realize';
import { k, leaf, mul, variable, type Leaf } from './term';

export interface HingeSpec {
  onPivot: { x: Derivation; y: Derivation; z: Derivation };
  onBar: { x: Derivation; y: Derivation; z: Derivation };
  /** The bar's orientation about z at release: a coupling solution. */
  tilt: Derivation;
  /** The hinge's friction torque, as the intent gives it. */
  friction: Derivation;
}

export interface SwingBodies {
  pivot: Prism; bar: Prism; hinge: HingeSpec; gravity: Derivation; ground: Ground;
  /** How long to watch, s: a derivation from the predicted period. */
  watch: Derivation;
  /** The bar's inertia about the pivot, its mass and its centre's height at rest, for the ledger. */
  inertia: Derivation; mass: Derivation; restHeight: Derivation;
}

export interface SwingSample { t: Derivation; angle: Derivation; energy: Derivation }

export interface SwingRealization {
  contract: RigidContract;
  bodies: BodyBinding[];
  window: Window;
  resolution: Resolution;
  /** The angle over time: point samples on the lattice of ticks. */
  samples: SwingSample[];
  period: Derivation;
  /** The amplitude of the last full swing. */
  lastAmplitude: Derivation;
  /** The swing energy (above the rest energy) at the start and at the end of the watch. */
  swingEnergyStart: Derivation;
  swingEnergyEnd: Derivation;
  crossings: number;
  events: string[];
  /** The step the kernel integrated at: its tick, or finer where the generator asked. */
  integration: Derivation;
}

const val = (d: Derivation, what: string) => { if (d.value === null) throw new Error(`${what}: ${d.name} has no value (${d.status}); nothing is realized from an unknown`); return d.value; };

export function realizeSwing(J: Jolt, c: RigidContract, b: SwingBodies, obs: Observer, step?: Derivation): SwingRealization {
  const { world, ids } = openWorld(J, c, b.gravity, b.ground);
  // the integration step is the generator's to choose: the world is still read once a tick
  if (step) world.resolveTime(val(step, 'integration step'));
  const bindings: BodyBinding[] = [];
  const pe = extentsOf(b.pivot);
  const pivot = placePrism(world, ids, b.pivot, { kind: c.words.blockKind, material: b.pivot.material, name: b.pivot.name, frozen: true, params: { x: pe.x, y: pe.y, z: pe.z } });
  bindings.push({ name: b.pivot.name, kernelId: pivot.id, role: 'support' });
  const be = extentsOf(b.bar);
  const bar = placePrism(world, ids, b.bar, { kind: c.words.beamKind, material: b.bar.material, name: b.bar.name, params: { length: be.x, thickness: be.y, width: be.z, fracture: 'off' } }, axisAngle([0, 0, 1], val(b.hinge.tilt, 'tilt')));
  bindings.push({ name: b.bar.name, kernelId: bar.id, role: 'beam' });
  const yToZ = axisAngle([1, 0, 0], Math.PI / 2);
  const h = b.hinge;
  const conn = makeConnection({
    kind: 'hinge',
    a: { part: pivot.id, frame: { p: [val(h.onPivot.x, 'hinge'), val(h.onPivot.y, 'hinge'), val(h.onPivot.z, 'hinge')], q: yToZ } },
    b: { part: bar.id, frame: { p: [val(h.onBar.x, 'hinge'), val(h.onBar.y, 'hinge'), val(h.onBar.z, 'hinge')], q: yToZ } },
    params: { pin: 0.008, friction: val(h.friction, 'friction') },
  }, ids);
  const refused = world.apply({ op: 'upsertConnection', conn, materials: {} });
  if (refused) throw new Error(`the kernel refused the hinge: ${refused.reason}`);

  const tick = val(obs.tick, 'tick'), ticks = Math.round(val(b.watch, 'watch') / tick);
  const I = val(b.inertia, 'inertia'), m = val(b.mass, 'mass'), g = val(b.gravity, 'gravity');
  const angles: number[] = [], energies: number[] = [], events: string[] = [];
  let stepTaken = Infinity;
  for (let i = 0; i < ticks; i++) {
    const r = world.step();
    stepTaken = Math.min(stepTaken, world.integrationStep);
    for (const e of r.events) if (e.type === 'break' || e.type === 'fracture') events.push(`${e.type}: ${e.note}`);
    const pose = world.livePose(bar.id)!, d = rotate(pose.q, [1, 0, 0]), w = world.angularVelocity(bar.id)!;
    angles.push(Math.atan2(d[0], -d[1]));
    energies.push(0.5 * I * w[2] * w[2] + m * g * pose.p[1]);
  }
  world.destroy();
  const window: Window = { tick, seconds: ticks * tick, instrument: c.name, ...(stepTaken < tick ? { step: stepTaken } : {}) };
  const mk = (name: string, value: number, unit: string, origin: Leaf['origin'], u?: number) => leaf(name, value, unit, origin, u);
  // the kernel resolves time to its tick and no finer: a sample is the state somewhere within its step
  const res = resolution(c.name, { t: obs.tick }, { t: obs.tick });
  const samples: SwingSample[] = angles.map((a, i) => ({
    t: evaluate(`tick ${i + 1}`, mul(k(i + 1, `${i + 1} ticks`), variable('tick', 's')), { tick: obs.tick }, { unit: 's', law: 'the lattice of ticks' }),
    angle: measurement(`angle at tick ${i + 1}`, a, 'rad', { instrument: `${c.name}: the bar's orientation`, window }, mk),
    energy: measurement(`energy at tick ${i + 1}`, energies[i]!, 'J', { instrument: `${c.name}: half I ω² from the angular velocity, plus m g y of the centre`, window }, mk),
  }));
  // the period from the zero crossings, each placed by linear interpolation between ticks: resolved to the tick
  const crossings: number[] = [];
  for (let i = 1; i < angles.length; i++) if ((angles[i - 1]! > 0) !== (angles[i]! > 0)) { const a0 = angles[i - 1]!, a1 = angles[i]!; crossings.push(i * tick + tick * (a0 / (a0 - a1))); }
  const n = crossings.length;
  const T = n >= 2 ? (2 * (crossings[n - 1]! - crossings[0]!)) / (n - 1) : NaN;
  const period = measurement('period', T, 's', { instrument: `${c.name}: two spans between first and last of ${n} zero crossings over ${n - 1} half swings`, window, uncertainty: n >= 2 ? (Math.SQRT2 * tick) / (n - 1) : NaN }, mk);
  const peaks = angles.filter((a, i) => i > 0 && i < angles.length - 1 && a > angles[i - 1]! && a > angles[i + 1]!);
  const lastAmplitude = measurement('amplitude of the last swing', peaks.at(-1) ?? NaN, 'rad', { instrument: `${c.name}: the last peak of the angle, sampled at the tick`, window, uncertainty: 0.5 * (peaks.at(-1) ?? 0) * (2 * Math.PI / T) ** 2 * (tick / 2) ** 2 }, mk);
  const Emin = m * g * val(b.restHeight, 'rest height');
  const first = energies[0]! - Emin, last = Math.max(...energies.slice(-Math.round(T / tick))) - Emin;
  const swingEnergyStart = measurement('swing energy at the start', first, 'J', { instrument: `${c.name}: the energy above rest at the first tick`, window }, mk);
  const swingEnergyEnd = measurement('swing energy at the end', last, 'J', { instrument: `${c.name}: the greatest energy above rest in the last period`, window }, mk);
  const integration = measurement('integration step', stepTaken, 's', { instrument: `${c.name}: its tick over the substeps it took`, window }, mk);
  return { contract: c, bodies: bindings, window, resolution: res, samples, period, lastAmplitude, swingEnergyStart, swingEnergyEnd, crossings: n, events, integration };
}

export const hingeLeaf = (name: string, v: number, unit: string, source: string) => ofLeaf(leaf(name, v, unit, { class: 'configuration', source }));
