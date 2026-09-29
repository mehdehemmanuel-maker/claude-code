// Spiderweb: the stress-test web. Every part kind, in its default material and a contrasting one, is put through the
// situations a user puts it through (lying at rest, dropped, stacked, thrown at a wall, held in either hand, held and
// turned), magnets are stuck to steel and to each other, every template is run, and a pile of mixed parts is dropped
// at once. The watchdog (watchdog.ts) checks every body on every tick of every run. The result is one report of what
// broke a physical invariant, where, how badly and when.

import type JoltNS from 'jolt-physics';
import { PhysicsWorld, TICK } from '../physics/world';
import { makePart, newDoc } from '../doc/commands';
import { seededIds } from '../doc/ids';
import { getMaterial, MATERIALS, type Material } from '../data/materials';
import { PART_KINDS, getPartKind, effectiveParams, type PartKind } from '../parts/registry';
import type { Params } from '../schema/params';
import { shapeBounds } from '../parts/shapes';
import { TEMPLATES } from '../templates/templates';
import { CONNECTOR_KINDS } from '../connectors/registry';
import { makeConnection } from '../doc/commands';
import { relativePose } from '../doc/math';
import { workshopEnvironment } from '../physics/environment';
import type { Part, Pose, Quat, SimSettings } from '../doc/types';
import type { EnvironmentBox, StepResult } from '../physics/protocol';
import { Watchdog, type Anomaly, type BodyInfo, type Vec3, type WatchOptions } from './watchdog';

export interface WebRun {
  /** Group in the web (parts, magnets, hands, templates, scale), and the node within it. */
  group: string;
  node: string;
  scenario: string;
  material: string;
  ticks: number;
  meanStepMs: number;
  maxStepMs: number;
  anomalies: Anomaly[];
  /** What happened that is right but worth knowing (a part too heavy for one hand drops, as it should). */
  notes: string[];
  status: 'pass' | 'warn' | 'fail';
}

export interface WebReport {
  created: string;
  runs: WebRun[];
  /** Against the previous report: runs that newly fail, and runs that no longer fail. */
  changes?: { newFail: string[]; fixed: string[] };
  /** The immune system's verdicts (immune.ts). */
  immune?: { id: string; guards: string; status: 'guarding' | 'open'; verdict: 'holds' | 'breached' | 'open'; cases: number; failed: string[]; found: string; cause: string; fix: string }[];
  totals: { runs: number; pass: number; warn: number; fail: number; seconds: number };
}

const materialsById = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
const Q_ID: Quat = [0, 0, 0, 1];
const aboutZ = (deg: number): Quat => [0, 0, Math.sin((deg * Math.PI) / 360), Math.cos((deg * Math.PI) / 360)];
const aboutX = (deg: number): Quat => [Math.sin((deg * Math.PI) / 360), 0, 0, Math.cos((deg * Math.PI) / 360)];
const qmul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

/** A world with a floor (and optionally a wall), and the bookkeeping the watchdog needs. */
class Bench {
  world: PhysicsWorld;
  ids = seededIds(7);
  parts: Part[] = [];
  private slots: (string | null)[] = [];
  constructor(J: typeof JoltNS, sim: Partial<SimSettings>, boxes: EnvironmentBox[]) {
    const doc = newDoc('spiderweb', '2026-01-01T00:00:00Z');
    this.world = new PhysicsWorld(J, { ...doc.sim, ...sim });
    this.world.apply({ op: 'environment', boxes, materials: materialsById });
  }
  part(kind: string, pose: Pose, opts: { material?: string; params?: Params; frozen?: boolean } = {}) {
    const p = makePart({ kind, pose, material: opts.material, params: opts.params, frozen: opts.frozen }, this.ids);
    this.world.apply({ op: 'upsertPart', part: p, material: getMaterial(p.material), keepLivePose: false });
    this.parts.push(p);
    return p;
  }
  /** Bodies of the scene with their mass and a radius of gyration from their part's size. */
  info(): Map<string, BodyInfo> {
    const out = new Map<string, BodyInfo>();
    for (const p of this.parts) {
      const kind = getPartKind(p.kind);
      const d = kind.dims(effectiveParams(kind, p.params, getMaterial(p.material)));
      const gyr = Math.hypot(d.length, d.a, d.b) / Math.sqrt(12);
      for (const id of this.bodyIds(p)) out.set(id, { mass: this.world.bodyMass(id) ?? 1, gyration: gyr, inertia: () => this.world.bodyInertia(id) });
    }
    return out;
  }
  bodyIds(p: Part): string[] {
    return this.slots.filter((s): s is string => !!s && (s === p.id || s.startsWith(`${p.id}#`)));
  }
  step(): StepResult {
    const r = this.world.step();
    if (r.slots) this.slots = r.slots;
    return r;
  }
  states(r: StepResult) {
    const out = [];
    for (let i = 0; i < this.slots.length; i++) {
      const id = this.slots[i];
      if (!id) continue;
      const t = r.transforms, v = r.velocities;
      out.push({ id, p: [t[i * 7]!, t[i * 7 + 1]!, t[i * 7 + 2]!] as Vec3, v: [v[i * 6]!, v[i * 6 + 1]!, v[i * 6 + 2]!] as Vec3, w: [v[i * 6 + 3]!, v[i * 6 + 4]!, v[i * 6 + 5]!] as Vec3 });
    }
    return out;
  }
  done() { this.world.destroy(); }
}

/** A kind's parameters at their defaults. */
const defaults = (k: PartKind): Params => Object.fromEntries(k.params.map((pr) => [pr.key, pr.default])) as Params;

/** Lowest point below the part's origin at a rotation, so it can be placed on the floor. */
function restHeight(kind: string, params: Params | undefined, q: Quat, material: string) {
  const k = getPartKind(kind);
  const b = shapeBounds(k.collision(effectiveParams(k, params ?? defaults(k), getMaterial(material))));
  let lowest = Infinity;
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    // y of the rotated corner
    const [qx, qy, qz, qw] = q;
    const ty = 2 * (qz * x - qx * z), tx = 2 * (qy * z - qz * y), tz = 2 * (qx * y - qy * x);
    lowest = Math.min(lowest, y + qw * ty + (qz * tx - qx * tz));
  }
  return -lowest;
}

const floor: EnvironmentBox = { half: [30, 0.5, 30], pose: { p: [0, -0.5, 0], q: Q_ID }, material: 'concrete.c30' };
const wall: EnvironmentBox = { half: [0.05, 1.5, 1.5], pose: { p: [1.0, 1.5, 0], q: Q_ID }, material: 'concrete.c30' };

function contrasting(kind: string): string | null {
  const k = getPartKind(kind);
  const def = getMaterial(k.defaultMaterial);
  const ok = (m: Material) => !k.materialFilter || k.materialFilter(m);
  const pick = MATERIALS.find((m) => m.category !== def.category && m.category !== 'magnet' && ok(m) && ['steel', 'aluminum', 'wood', 'polymer'].includes(m.category));
  return pick?.id ?? null;
}

/** The procedure a case puts its subject through (antibodies select cases by it). */
export type Procedure = 'rest' | 'drop' | 'stack' | 'throw' | 'hold' | 'turn' | 'weld' | 'snap' | 'template' | 'pile' | 'extreme' | 'overlap' | 'joint' | 'chaos' | 'memory';

export interface Case {
  proc: Procedure;
  /** The part kind (or connector kind, for joints) the case is about, if one. */
  kind?: string;
  group: string;
  node: string;
  scenario: string;
  material: string;
  seconds: number;
  setup(J: typeof JoltNS): { bench: Bench; watch: Partial<WatchOptions>; each?: (tick: number) => void; check?: () => Anomaly[]; notes?: string[] };
}

function partCases(kind: string, material: string): Case[] {
  const k = getPartKind(kind);
  const q0 = k.spawnRotation;
  const size = (() => { const d = k.dims(effectiveParams(k, defaults(k), getMaterial(material))); return Math.max(d.length, d.a, d.b); })();
  const rest = (q: Quat) => restHeight(kind, undefined, q, material);
  const base = { group: `parts/${k.category}`, node: kind, material, kind };
  const bench = (J: typeof JoltNS, boxes = [floor]) => new Bench(J, { gravity: [0, -9.81, 0] }, boxes);
  /** The body a hand takes hold of: the part, or for a breakable part the piece nearest its middle. */
  const gripBody = (b: Bench, p: Part) => {
    const ids = b.bodyIds(p).filter((i) => i.includes('#'));
    if (!ids.length) return p.id;
    const c = p.pose.p;
    const dist = (i: string) => { const q = b.world.livePose(i)!.p; return Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]); };
    return ids.reduce((best, i) => (dist(i) < dist(best) ? i : best));
  };
  const hold = (hand: string, turn: boolean): Case => ({
    ...base, proc: turn ? 'turn' : 'hold', group: 'hands', node: `${kind}`, scenario: `held in the ${hand} hand${turn ? ', turned 90° over 0.3 s' : ''}`, seconds: 3,
    setup(J) {
      const b = bench(J);
      const p = b.part(kind, { p: [0, 1.2, 0], q: q0 }, { material });
      b.step();
      const body = gripBody(b, p), start = b.world.livePose(body)!;
      b.world.apply({ op: 'grab', hand, id: body, mode: 'physical', target: start, strength: 250 });
      // a real wrist turns over about a third of a second, not in one tick
      const each = turn ? (tick: number) => {
        const f = Math.min(1, tick / 27);
        b.world.apply({ op: 'grabTarget', hand, target: { p: start.p, q: qmul(aboutZ(90 * f), start.q) } });
      } : undefined;
      return { bench: b, watch: { held: new Set(b.bodyIds(p)), settleTicks: 90, flungSpeed: 10 }, each };
    },
  });
  // held still for welding: a hand with physiological tremor (about 0.5 mm at 10 Hz); the piece in the hand must
  // stay within 1.5 mm and 0.5 degrees of where the hand holds it
  const weld: Case = {
    ...base, proc: 'weld', group: 'hands', node: `${kind}`, scenario: 'held steady for welding', seconds: 3,
    setup(J) {
      const b = bench(J);
      const p = b.part(kind, { p: [0, 1.1, 0], q: q0 }, { material });
      b.step();
      const body = gripBody(b, p), start = b.world.livePose(body)!;
      const at = (t: number): Pose => ({
        p: [start.p[0] + 0.0005 * Math.sin(2 * Math.PI * 10 * t), start.p[1] + 0.0004 * Math.sin(2 * Math.PI * 9 * t + 1), start.p[2] + 0.0003 * Math.sin(2 * Math.PI * 11 * t + 2)],
        q: start.q,
      });
      b.world.apply({ op: 'grab', hand: 'left', id: body, mode: 'physical', target: at(0), strength: 250 });
      let worstP = 0, worstA = 0, tick = 0;
      const weight = b.bodyIds(p).reduce((m, i) => m + (i.includes('#') || b.bodyIds(p).length === 1 ? b.world.bodyMass(i) ?? 0 : 0), 0) * 9.81;
      if (weight > 250) {
        return { bench: b, watch: { flungSpeed: 5 }, notes: [`too heavy for one hand (${weight.toFixed(0)} N against 250 N): it drops, as it should`] };
      }
      return {
        bench: b, watch: { held: new Set(b.bodyIds(p)), settleTicks: 90, flungSpeed: 5 },
        each: (t: number) => {
          tick = t;
          const target = at(t * TICK);
          b.world.apply({ op: 'grabTarget', hand: 'left', target });
          if (t <= 90) return;
          const live = b.world.livePose(body)!;
          worstP = Math.max(worstP, Math.hypot(live.p[0] - target.p[0], live.p[1] - target.p[1], live.p[2] - target.p[2]));
          const d = Math.abs(live.q[0] * start.q[0] + live.q[1] * start.q[1] + live.q[2] * start.q[2] + live.q[3] * start.q[3]);
          worstA = Math.max(worstA, (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI);
        },
        check: () => {
          const out: Anomaly[] = [];
          if (worstP > 0.0015) out.push({ kind: 'unsteady', severity: 'critical', id: body, tick, value: worstP, limit: 0.0015, detail: `wanders ${(worstP * 1000).toFixed(1)} mm from the hand (a weld needs it within 1.5 mm)` });
          if (worstA > 0.5) out.push({ kind: 'unsteady', severity: 'critical', id: body, tick, value: worstA, limit: 0.5, detail: `tilts ${worstA.toFixed(2)}° in the hand (a weld needs it within 0.5°)` });
          return out;
        },
      };
    },
  };
  return [
    { ...base, proc: 'rest', scenario: 'lying at rest', seconds: 2.5, setup(J) {
      const b = bench(J);
      b.part(kind, { p: [0, rest(q0) + 0.002, 0], q: q0 }, { material });
      return { bench: b, watch: { passive: true, settleTicks: 120, flungSpeed: 3 } };
    } },
    { ...base, proc: 'drop', scenario: 'dropped from 0.5 m, tilted', seconds: 3, setup(J) {
      const b = bench(J);
      const q = qmul(aboutX(30), q0);
      b.part(kind, { p: [0, rest(q) + 0.5, 0], q }, { material });
      return { bench: b, watch: { passive: true, settleTicks: 200, flungSpeed: 6 } };
    } },
    { ...base, proc: 'stack', scenario: 'stacked two high', seconds: 3, setup(J) {
      const b = bench(J);
      const h = rest(q0);
      b.part(kind, { p: [0, h + 0.002, 0], q: q0 }, { material });
      b.part(kind, { p: [0, 3 * h + 0.006, 0], q: q0 }, { material });
      return { bench: b, watch: { passive: true, settleTicks: 200, flungSpeed: 4 } };
    } },
    { ...base, proc: 'throw', scenario: 'thrown at a wall at 10 m/s', seconds: 1.5, setup(J) {
      const b = bench(J, [floor, wall]);
      const p = b.part(kind, { p: [0, 0.6, 0], q: q0 }, { material });
      b.step();
      b.world.apply({ op: 'setPose', id: p.id, pose: { p: [0, 0.6, 0], q: q0 }, linear: [10, 0, 0], angular: [0, 0, 0] });
      return { bench: b, watch: { walls: [{ n: [-1, 0, 0], d: -0.95, margin: size / 2 + 0.01 }], flungSpeed: 15 } };
    } },
    hold('right', false),
    hold('left', false),
    hold('right', true),
    weld,
  ];
}

function magnetCases(): Case[] {
  const sizes: [string, Record<string, number>][] = [
    ['magnet.disc', { diameter: 0.01, thickness: 0.005 }], ['magnet.disc', { diameter: 0.006, thickness: 0.003 }],
    ['magnet.disc', { diameter: 0.01, thickness: 0.002 }], ['magnet.disc', { diameter: 0.02, thickness: 0.01 }],
    ['magnet.block', { x: 0.01, z: 0.01, y: 0.002 }], ['magnet.block', { x: 0.04, z: 0.02, y: 0.01 }],
  ];
  const out: Case[] = [];
  for (const [kind, params] of sizes) {
    const L = params['thickness'] ?? params['y']!;
    const label = `${kind} ${Object.values(params).map((v) => v * 1000).join('x')} mm`;
    for (const on of ['steel', 'a magnet'] as const) {
      out.push({
        proc: 'snap', kind, group: 'magnets', node: label, scenario: `snaps onto ${on}`, material: 'magnet.n42', seconds: 2.5,
        setup(J) {
          const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
          if (on === 'steel') b.part('plate', { p: [0, 0.1, 0], q: Q_ID }, { material: 'steel.1018-cd', frozen: true });
          else b.part(kind, { p: [0, 0.1, 0], q: Q_ID }, { params, frozen: true });
          const top = on === 'steel' ? 0.103 : 0.1 + L / 2;
          b.part(kind, { p: [0.0004, top + L / 2 + 0.003, 0.0002], q: [0.02, 0, 0.01, 0.9997] }, { params });
          return { bench: b, watch: { settleTicks: 120, flungSpeed: 5 } };
        },
      });
    }
  }
  return out;
}

function templateCases(): Case[] {
  return TEMPLATES.map((t) => ({
    proc: 'template' as const, group: 'templates', node: t.id, scenario: 'settles and runs', material: '', seconds: 4,
    setup(J) {
      const doc = t.build();
      const b = new Bench(J, doc.sim, workshopEnvironment());
      for (const p of Object.values(doc.parts)) { b.world.apply({ op: 'upsertPart', part: p, material: doc.materials[p.material]!, keepLivePose: false }); b.parts.push(p); }
      for (const c of Object.values(doc.connections)) b.world.apply({ op: 'upsertConnection', conn: c, materials: doc.materials });
      return { bench: b, watch: { flungSpeed: 25 } };
    },
  }));
}

function scaleCase(): Case {
  return {
    proc: 'pile', group: 'scale', node: 'pile of 60 parts', scenario: 'dropped at once', material: 'mixed', seconds: 4,
    setup(J) {
      const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
      const kinds = PART_KINDS.filter((k) => k.category !== 'Magnets' && k.category !== 'Test').map((k) => k.id);
      for (let i = 0; i < 60; i++) {
        const kind = kinds[i % kinds.length]!;
        const x = ((i * 37) % 11) / 11 - 0.5, z = ((i * 53) % 13) / 13 - 0.5;
        b.part(kind, { p: [x * 1.5, 0.3 + (i % 6) * 0.25, z * 1.5], q: aboutX((i * 29) % 180) });
      }
      return { bench: b, watch: { passive: true, flungSpeed: 12, budgetMs: 11 } };
    },
  };
}

/** A small seeded random generator (mulberry32), so every chaos scene can be replayed from its seed. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const allowed = (k: PartKind) => MATERIALS.filter((m) => !k.materialFilter || k.materialFilter(m));

/** Weird geometry: every geometric parameter of every kind at its minimum and at its maximum. */
function extremeCases(): Case[] {
  const out: Case[] = [];
  for (const k of PART_KINDS) {
    if (k.category === 'Test') continue;
    for (const pr of k.params) {
      if (pr.type !== 'number' || (pr as { group?: string }).group !== 'Geometry') continue;
      for (const end of ['min', 'max'] as const) {
        const params = { ...defaults(k), [pr.key]: end === 'min' ? pr.min : pr.max } as Params;
        const label = `${k.id} ${pr.key} = ${end} (${+(((end === 'min' ? pr.min : pr.max) * 1000).toPrecision(3))} mm)`;
        const q0 = k.spawnRotation;
        for (const drop of [false, true]) {
          out.push({
            proc: 'extreme', kind: k.id, group: 'extremes', node: label, scenario: drop ? 'dropped from 0.5 m, tilted' : 'lying at rest', material: k.defaultMaterial, seconds: 2.5,
            setup(J) {
              const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
              const q = drop ? qmul(aboutX(30), q0) : q0;
              b.part(k.id, { p: [0, restHeight(k.id, params, q, k.defaultMaterial) + (drop ? 0.5 : 0.002), 0], q }, { params });
              return { bench: b, watch: { passive: k.category !== 'Magnets', settleTicks: 180, flungSpeed: 8, budgetMs: 11 } };
            },
          });
        }
      }
    }
  }
  return out;
}

/**
 * Overlap: every kind, and every kind with its geometry at each extreme, placed through a fixed block in zero gravity.
 * Two solids cannot share space and pushing them apart supplies no energy: the scene's energy (all kinetic, with
 * nothing to fall) must stay what it was, zero.
 */
function overlapCases(): Case[] {
  const out: Case[] = [];
  for (const k of PART_KINDS) {
    if (k.category === 'Test' || k.category === 'Magnets') continue;
    const variants: [string, Params][] = [['default size', defaults(k)]];
    for (const pr of k.params) {
      if (pr.type !== 'number' || (pr as { group?: string }).group !== 'Geometry') continue;
      for (const end of ['min', 'max'] as const) variants.push([`${pr.key} = ${end}`, { ...defaults(k), [pr.key]: end === 'min' ? pr.min : pr.max } as Params]);
    }
    for (const [label, params] of variants) {
      out.push({
        proc: 'overlap', kind: k.id, group: 'overlap', node: `${k.id} ${label}`, scenario: 'placed through a fixed block, zero g', material: k.defaultMaterial, seconds: 1,
        setup(J) {
          const b = new Bench(J, { gravity: [0, 0, 0] }, []);
          b.part('block', { p: [0.03, 1.02, 0.01], q: Q_ID }, { material: 'steel.a36', frozen: true, params: { x: 0.2, y: 0.2, z: 0.2 } });
          b.part(k.id, { p: [0, 1, 0], q: qmul(aboutZ(20), k.spawnRotation) }, { params });
          // no floor here, so nothing can fall out of the world: only energy, speed and numbers are watched
          return { bench: b, watch: { gravity: [0, 0, 0], floorY: -Infinity, passive: true, flungSpeed: 5, budgetMs: 11 } };
        },
      });
    }
  }
  return out;
}

/**
 * Chaos: seeded random scenes of random parts (random kinds, sizes over each parameter's whole range, materials,
 * poses), randomly joined by every kind of connector, with magnets and steel among them, dropped together. Anything
 * physical may happen (joints break, parts fly apart under a motor); what must not is a crash, a non-number, something
 * leaving the world or moving impossibly fast, or a tick blowing the budget.
 */
function chaosCases(seeds: number): Case[] {
  const kinds = PART_KINDS.filter((k) => k.category !== 'Test');
  const conns = CONNECTOR_KINDS;
  return Array.from({ length: seeds }, (_, s) => s + 1).map((seed) => ({
    proc: 'chaos' as const, group: 'chaos', node: `seed ${seed}`, scenario: 'random parts, joints and magnets dropped together', material: 'mixed', seconds: 4,
    setup(J) {
      const R = rng(seed);
      const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
      const n = 6 + Math.floor(R() * 12);
      const made: Part[] = [];
      for (let i = 0; i < n; i++) {
        const k = kinds[Math.floor(R() * kinds.length)]!;
        const params: Params = { ...defaults(k) };
        for (const pr of k.params) {
          if (pr.type !== 'number' || R() < 0.4) continue;
          // log-uniform over the parameter's range (sizes span decades)
          const lo = Math.max(pr.min, 1e-6), hi = Math.max(pr.max, lo * 1.0001);
          (params as Record<string, number>)[pr.key] = Math.min(pr.max, Math.max(pr.min, Math.exp(Math.log(lo) + R() * (Math.log(hi) - Math.log(lo)))));
        }
        const mats = allowed(k);
        const material = R() < 0.5 ? k.defaultMaterial : mats[Math.floor(R() * mats.length)]!.id;
        const q = normalizeQ([R() - 0.5, R() - 0.5, R() - 0.5, R() - 0.5]);
        made.push(b.part(k.id, { p: [(R() - 0.5) * 1.2, 0.2 + R() * 1.2, (R() - 0.5) * 1.2], q }, { material, params }));
      }
      for (let i = 0; i < n / 2; i++) {
        const a = made[Math.floor(R() * n)]!, c = made[Math.floor(R() * n)]!;
        if (a === c) continue;
        const kind = conns[Math.floor(R() * conns.length)]!;
        const mid: Pose = { p: [(a.pose.p[0] + c.pose.p[0]) / 2, (a.pose.p[1] + c.pose.p[1]) / 2, (a.pose.p[2] + c.pose.p[2]) / 2], q: Q_ID };
        const conn = makeConnection({ kind: kind.id, a: { part: a.id, frame: relativePose(a.pose, mid) }, b: { part: c.id, frame: relativePose(c.pose, mid) } }, b.ids);
        b.world.apply({ op: 'upsertConnection', conn, materials: materialsById });
      }
      return { bench: b, watch: { flungSpeed: 40, budgetMs: 15 } };
    },
  }));
}

/**
 * Joint torture: every connector, holding a hanging block that is shaken, then pushed until the joint gives. The push
 * is a ram, as on a test rig: its force rises to 20 kN but it has a 25 mm stroke, so once the joint gives (or the
 * block swings away) it can do no more than force x stroke of work: a block that breaks free falls, it is not fired.
 */
const RAM_STROKE = 0.025;

function jointCases(): Case[] {
  return CONNECTOR_KINDS.map((kind) => ({
    proc: 'joint' as const, kind: kind.id, group: 'joints', node: kind.id, scenario: 'hung, shaken, then overloaded', material: 'steel.a36', seconds: 3,
    setup(J) {
      const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
      const a = b.part('block', { p: [0, 1.2, 0], q: Q_ID }, { material: 'steel.a36', frozen: true, params: { x: 0.1, y: 0.1, z: 0.1 } });
      const c = b.part('block', { p: [0, 1.05, 0], q: Q_ID }, { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const mid: Pose = { p: [0, 1.125, 0], q: Q_ID };
      const conn = makeConnection({ kind: kind.id, a: { part: a.id, frame: relativePose(a.pose, mid) }, b: { part: c.id, frame: relativePose(c.pose, mid) } }, b.ids);
      b.world.apply({ op: 'upsertConnection', conn, materials: materialsById });
      let ramFrom = 0;
      return {
        bench: b, watch: { flungSpeed: 30, budgetMs: 11 },
        each: (t) => {
          const pc = b.world.livePose(c.id)?.p;
          if (!pc) return;
          // 20 N shake at 2 Hz for two seconds, then the ram: rising to 20 kN over the last second, within its stroke
          if (t === 180) ramFrom = pc[0];
          const F = t < 180 ? 20 * Math.sin((2 * Math.PI * 2 * t) / 90) : pc[0] - ramFrom < RAM_STROKE ? 20000 * ((t - 180) / 90) : 0;
          if (F) b.world.apply({ op: 'impulse', id: c.id, point: pc, impulse: [F * TICK, 0, 0] });
        },
      };
    },
  }));
}

function normalizeQ(q: number[]): Quat {
  const l = Math.hypot(...q) || 1;
  return [q[0]! / l, q[1]! / l, q[2]! / l, q[3]! / l];
}

/** Memory: for every kind, worlds holding it are built, run and destroyed; what they took must all come back. */
function memoryCases(): Case[] {
  return PART_KINDS.filter((k) => k.category !== 'Test').map((k) => ({
    proc: 'memory' as const, kind: k.id, group: 'resources', node: k.id, scenario: 'worlds built, run and destroyed', material: k.defaultMaterial, seconds: 0,
    setup(J) {
      const heap = J as unknown as { JoltInterface: { prototype: { sGetTotalMemory(): number; sGetFreeMemory(): number } } };
      const used = () => heap.JoltInterface.prototype.sGetTotalMemory() - heap.JoltInterface.prototype.sGetFreeMemory();
      const once = () => {
        const b = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
        b.part(k.id, { p: [0, 0.5, 0], q: k.spawnRotation });
        for (let i = 0; i < 20; i++) b.step();
        b.done();
      };
      once();
      const base = used();
      for (let i = 0; i < 6; i++) once();
      const leak = (used() - base) / 6;
      const bench = new Bench(J, { gravity: [0, -9.81, 0] }, [floor]);
      return {
        bench, watch: {},
        check: () => (leak > 4096 ? [{ kind: 'leak' as const, severity: 'critical' as const, id: k.id, tick: 0, value: leak, limit: 4096, detail: `each world with a ${k.id} kept ${(leak / 1024).toFixed(0)} kB after it was destroyed` }] : []),
      };
    },
  }));
}

/** Every case in the web, optionally only those whose group/node/scenario contains `filter`. */
export function spiderwebCases(filter = ''): Case[] {
  const cases: Case[] = [];
  for (const k of PART_KINDS) {
    if (k.category === 'Magnets') continue;
    const mats = [k.defaultMaterial, contrasting(k.id)].filter((m): m is string => !!m);
    for (const m of mats) cases.push(...partCases(k.id, m));
  }
  cases.push(...magnetCases(), ...templateCases(), scaleCase(), ...extremeCases(), ...overlapCases(), ...jointCases(), ...chaosCases(Number(process.env['SPIDERWEB_SEEDS'] ?? 24)), ...memoryCases());
  const f = filter.toLowerCase();
  return f ? cases.filter((c) => `${c.group} ${c.node} ${c.scenario} ${c.material}`.toLowerCase().includes(f)) : cases;
}

export function runCase(J: typeof JoltNS, c: Case): WebRun {
  const steps = Math.round(c.seconds / TICK);
  let sum = 0, max = 0, ticks = 0;
  const extra: Anomaly[] = [];
  let notes: string[] = [];
  let wd: Watchdog | null = null;
  let bench: Bench | null = null;
  try {
    const s = c.setup(J);
    bench = s.bench;
    notes = s.notes ?? [];
    wd = new Watchdog(bench.info(), { gravity: [0, -9.81, 0], ...s.watch });
    for (let i = 0; i < steps; i++) {
      s.each?.(i);
      const r = bench.step();
      if (i === 0) (wd as unknown as { info: Map<string, BodyInfo> }).info = bench.info();
      ticks++;
      sum += r.stats.stepMs;
      max = Math.max(max, r.stats.stepMs);
      wd.observe(bench.states(r), r.stats.stepMs);
      // a contained fault is still a defect: the world put the body back, the web must still see it
      for (const e of r.events) if (e.type === 'fault') extra.push({ kind: 'nonfinite', severity: 'critical', id: e.body, tick: i, value: NaN, limit: 0, detail: `contained: ${e.note}` });
      for (const l of r.loads) {
        if (!Number.isFinite(l.u) || ![l.axial, l.shear, l.bending, l.torsion].every(Number.isFinite)) {
          extra.push({ kind: 'nonfinite', severity: 'critical', id: l.id, tick: i, value: NaN, limit: 0, detail: 'a joint load is not a number' });
          break;
        }
      }
    }
    extra.push(...(s.check?.() ?? []));
  } catch (e) {
    extra.push({ kind: 'crash', severity: 'critical', id: '', tick: ticks, value: 0, limit: 0, detail: `threw: ${String((e as Error)?.message ?? e).slice(0, 200)}` });
  }
  const anomalies = [...(wd?.anomalies() ?? []), ...dedupe(extra)];
  try { bench?.done(); } catch { /* a crashed world may not tear down */ }
  const status = anomalies.some((a) => a.severity === 'critical') ? 'fail' : anomalies.length ? 'warn' : 'pass';
  return { group: c.group, node: c.node, scenario: c.scenario, material: c.material, ticks, meanStepMs: sum / Math.max(1, ticks), maxStepMs: max, anomalies, notes, status };
}

const dedupe = (as: Anomaly[]) => [...new Map(as.map((a) => [`${a.kind}|${a.id}`, a])).values()];

export function runSpiderweb(J: typeof JoltNS, filter = '', onRun?: (r: WebRun, i: number, n: number) => void): WebReport & { cases: Case[] } {
  const t0 = performance.now();
  const cases = spiderwebCases(filter);
  const runs = cases.map((c, i) => { const r = runCase(J, c); onRun?.(r, i, cases.length); return r; });
  return {
    created: new Date().toISOString(),
    cases,
    runs,
    totals: {
      runs: runs.length, pass: runs.filter((r) => r.status === 'pass').length, warn: runs.filter((r) => r.status === 'warn').length,
      fail: runs.filter((r) => r.status === 'fail').length, seconds: (performance.now() - t0) / 1000,
    },
  };
}
