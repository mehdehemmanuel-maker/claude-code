// The test stand: a design run in a world of its own before it is handed over, the way an engine is test-fired. Real
// weights are set on it where it is meant to carry them, the world runs, and what happened is measured: which joints
// broke and how hard each one worked, which members fractured or yielded, how far anything sank or tipped. Nothing here
// is estimated: it is the same physics that runs in the headset.

import { MATERIALS, getMaterial, type Material } from '../data/materials';
import { makePart } from '../doc/commands';
import { quatConj, quatMul } from './rigid';
import { inverseTransformPoint, transformPoint } from '../doc/math';
import type { Connection, Part, SimSettings, Vec3 } from '../doc/types';
import type { PhysicsWorld } from './world';
import { TICK } from './world';

/** A weight set on the design: `kg` of steel, its underside centred on `at`, `size` m across. */
export interface StandLoad { kg: number; at: Vec3; size: [number, number] }

/** A push on the design: `force` N at `at` on `part` (the point moves with the part), from `from` to `to` s. */
export interface StandPush { part: string; at: Vec3; force: Vec3; from: number; to: number }

export interface StandSetup {
  parts: Part[];
  connections: Connection[];
  materials: Record<string, Material>;
  sim: SimSettings;
  loads: StandLoad[];
  pushes?: StandPush[];
  seconds: number;
}

export interface JointPeak { u: number; mode: string; load: number }

export interface StandResult {
  /** It stood: nothing broke, fractured or fell, and nothing sank or tipped past the limits. */
  held: boolean;
  broken: { conn: string; mode: string; load: number; capacity: number }[];
  /** The hardest each joint worked, as a share of its capacity, after the first moment of settling. */
  peak: Record<string, JointPeak>;
  worst: ({ conn: string } & JointPeak) | null;
  /** The hardest any member's own section worked (breakable stock), as a share of its strength. */
  memberPeak: { part: string; u: number } | null;
  fractures: { part: string; mode: string; note: string }[];
  yielded: string[];
  /** The furthest a part sank (m) and tipped (rad) from where it was built. */
  drop: number;
  tilt: number;
  seconds: number;
  /** Wall-clock time the run took, ms. */
  ms: number;
}

/** It sank or tipped too far to count as standing (a real piece of furniture you'd call broken). */
export const DROP_LIMIT = 0.02;
export const TILT_LIMIT = (5 * Math.PI) / 180;

const FLOOR = [{ half: [60, 0.5, 60] as Vec3, pose: { p: [0, -0.5, 0] as Vec3, q: [0, 0, 0, 1] as [number, number, number, number] }, material: 'concrete.c30' }];

const loadIn = (mode: string, l: { axial: number; shear: number; bending: number; torsion: number }) =>
  mode === 'tension' ? Math.max(0, l.axial) : mode === 'compression' ? Math.max(0, -l.axial) : mode === 'shear' ? l.shear : mode === 'bending' ? l.bending : mode === 'torsion' ? l.torsion : 0;

/** Still: slower than 1 mm/s and 0.01 rad/s, for this many ticks (0.3 s). */
const STILL_SPEED = 0.001, STILL_TURN = 0.01, QUIET = Math.round(0.3 / TICK);

/** A block of steel of `kg`, `size` across where it can be (shorter and wider for a light load, never under 5 mm). */
export function loadBlock(l: StandLoad): Part {
  const steel = getMaterial('steel.a36');
  let [w, d] = l.size;
  let h = l.kg / (steel.density * w * d);
  if (h < 0.01) { h = 0.01; const s = Math.sqrt(l.kg / (steel.density * h)); w = Math.max(0.005, s); d = Math.max(0.005, s); }
  return makePart({ kind: 'block', material: 'steel.a36', name: `test load ${l.kg} kg`, params: { x: w, y: h, z: d }, pose: { p: [l.at[0], l.at[1] + h / 2 + 0.0005, l.at[2]], q: [0, 0, 0, 1] } });
}

/** Run the design on the stand, in `world` (a fresh one: the stand owns it while it runs). */
export function runStand(world: PhysicsWorld, s: StandSetup): StandResult {
  const t0 = performance.now();
  const materials = { ...Object.fromEntries(MATERIALS.map((m) => [m.id, m])), ...s.materials };
  world.apply({ op: 'environment', boxes: FLOOR, materials });
  world.apply({ op: 'sim', sim: s.sim });
  const weights = s.loads.map(loadBlock);
  for (const p of [...s.parts, ...weights]) world.apply({ op: 'upsertPart', part: { ...p, frozen: p.frozen }, material: materials[p.material] ?? getMaterial(p.material), keepLivePose: false });
  for (const c of s.connections) world.apply({ op: 'upsertConnection', conn: c, materials });
  const start = new Map(s.parts.map((p) => [p.id, p.pose]));
  const out: StandResult = { held: false, broken: [], peak: {}, worst: null, memberPeak: null, fractures: [], yielded: [], drop: 0, tilt: 0, seconds: s.seconds, ms: 0 };
  const ticks = Math.round(s.seconds / TICK), settle = Math.round(0.15 / TICK);
  const pushes = (s.pushes ?? []).map((p) => ({ ...p, local: inverseTransformPoint(start.get(p.part)!, p.at) })).filter((p) => start.has(p.part));
  // a test is over once nothing more can happen: every push done, and everything still for a while (a world at rest
  // stays at rest, so the seconds left would change nothing but the time it takes)
  const pushedUntil = Math.max(0, ...pushes.map((p) => p.to));
  let still = 0, ran = ticks;
  for (let i = 0; i < ticks; i++) {
    const t = i * TICK;
    if (t > Math.max(pushedUntil, 0.5) && still >= QUIET) { ran = i; break; }
    for (const p of pushes) {
      if (t < p.from || t >= p.to) continue;
      const pose = world.livePose(p.part);
      if (pose) world.apply({ op: 'impulse', id: p.part, point: transformPoint(pose, p.local), impulse: [p.force[0] * TICK, p.force[1] * TICK, p.force[2] * TICK] });
    }
    const r = world.step();
    for (const e of r.events) {
      if (e.type === 'break') out.broken.push({ conn: e.conn, mode: e.mode, load: e.load, capacity: e.capacity });
      else if (e.type === 'fracture' && !out.fractures.some((f) => f.part === e.part)) out.fractures.push({ part: e.part, mode: e.mode, note: e.note });
      else if (e.type === 'yield' && !out.yielded.includes(e.part)) out.yielded.push(e.part);
    }
    if (i < settle) continue;
    for (const l of r.loads) {
      const prev = out.peak[l.id];
      if (!prev || l.u > prev.u) out.peak[l.id] = { u: l.u, mode: l.mode, load: loadIn(l.mode, l) };
    }
    for (const [part, us] of Object.entries(r.bonds ?? {})) {
      const u = Math.max(...us.map((x) => (x < 0 ? Infinity : x)));
      if (!out.memberPeak || u > out.memberPeak.u) out.memberPeak = { part, u };
    }
    const moving = s.parts.some((p) => {
      const v = world.linearVelocity(p.id), w = world.angularVelocity(p.id);
      return (!!v && Math.hypot(...v) > STILL_SPEED) || (!!w && Math.hypot(...w) > STILL_TURN);
    });
    still = moving ? 0 : still + 1;
  }
  out.seconds = Math.round(ran * TICK * 100) / 100;
  for (const p of s.parts) {
    const now = world.livePose(p.id), was = start.get(p.id);
    if (!now || !was) continue;
    out.drop = Math.max(out.drop, was.p[1] - now.p[1]);
    const dq = quatMul(now.q, quatConj(was.q));
    out.tilt = Math.max(out.tilt, 2 * Math.acos(Math.min(1, Math.abs(dq[3]))));
  }
  for (const [conn, p] of Object.entries(out.peak)) if (!out.worst || p.u > out.worst.u) out.worst = { conn, ...p };
  out.held = !out.broken.length && !out.fractures.length && out.drop < DROP_LIMIT && out.tilt < TILT_LIMIT;
  out.ms = performance.now() - t0;
  return out;
}
