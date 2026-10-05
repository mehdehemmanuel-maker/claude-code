// The solver's firewalls (FOUNDATIONS.md; laws F-1.1.1, F-2.6.1 to F-2.6.3). Not examples: hundreds of random
// compositions of rows (any pairing, bounds, targets, softness, pass count, order, and warm starts chosen to do harm),
// each checked against an identity that must hold for all of them.

import { describe, expect, it } from 'vitest';
import { inverse3, solveRows, type Entity, type Row } from '../../src/physics/rigid';
import type { Vec3 } from '../../src/doc/types';

function random(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type R = () => number;
const span = (r: R, a: number) => (2 * r() - 1) * a;
const vec = (r: R, a: number): Vec3 => [span(r, a), span(r, a), span(r, a)];
const unit = (r: R): Vec3 => { const v = vec(r, 1); const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mat = (m: number[], v: Vec3): Vec3 => [m[0]! * v[0] + m[1]! * v[1] + m[2]! * v[2], m[3]! * v[0] + m[4]! * v[1] + m[5]! * v[2], m[6]! * v[0] + m[7]! * v[1] + m[8]! * v[2]];

/** A body with a random mass, a random inertia in a random frame, somewhere, moving. Its origin is its centre of mass. */
function body(r: R): Entity & { I: number[] } {
  const m = 0.01 + 10 * r();
  const d = [1e-5 + r(), 1e-5 + r(), 1e-5 + r()];
  const [x, y, z] = unit(r), th = 2 * Math.PI * r(), c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  const Q = [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
  const I = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) I[3 * i + j]! += Q[3 * i + k]! * d[k]! * Q[3 * j + k]!;
  return { origin: vec(r, 1), v: vec(r, 2), w: vec(r, 3), invMass: 1 / m, invI: inverse3(I), I };
}

type Kind = 'bilateral' | 'contact' | 'box' | 'friction';

/** A random row between two of the bodies (or a body and the world when `world`), with the joint's two ends apart a little. */
function row(r: R, bodies: Entity[], kind: Kind, opts: { target?: boolean; soft?: boolean; world?: boolean } = {}, normal?: Row): Row {
  const i = Math.floor(r() * bodies.length);
  let j = Math.floor(r() * (bodies.length - 1));
  if (j >= i) j++;
  const a = bodies[i]!, b = opts.world ? null : bodies[j]!;
  const pa = vec(r, 1.2), pb: Vec3 = [pa[0] + span(r, 0.01), pa[1] + span(r, 0.01), pa[2] + span(r, 0.01)];
  const angular = !normal && r() < 0.3;
  const bounds = kind === 'bilateral' ? [-Infinity, Infinity] : kind === 'contact' ? [0, Infinity] : kind === 'box' ? [-(span(r, 1) ** 2) - 1e-3, span(r, 1) ** 2 + 1e-3] : [0, 0];
  return {
    a: normal?.a ?? a, b: normal ? normal.b : b, kind: angular ? 'angular' : 'linear', pa: normal?.pa ?? pa, pb: normal?.pb ?? pb, dir: unit(r),
    target: opts.target ? span(r, 1) : 0, lo: bounds[0]!, hi: bounds[1]!, acc: 0, soft: opts.soft && r() < 0.5 ? r() * 10 : undefined,
    key: `k${Math.floor(r() * 1e9)}`, ...(kind === 'friction' && normal ? { frictionOf: normal, mu: r() } : {}),
  };
}

function momentum(bodies: (Entity & { I: number[] })[]) {
  const p: Vec3 = [0, 0, 0], L: Vec3 = [0, 0, 0];
  for (const e of bodies) {
    const m = 1 / e.invMass, lin = mat([m, 0, 0, 0, m, 0, 0, 0, m], e.v), spin = mat(e.I, e.w), orb = cross(e.origin, lin);
    for (let k = 0; k < 3; k++) { p[k]! += lin[k]!; L[k]! += orb[k]! + spin[k]!; }
  }
  return { p, L };
}

const kinetic = (bodies: (Entity & { I: number[] })[]) => bodies.reduce((s, e) => s + 0.5 * dot(e.v, e.v) / e.invMass + 0.5 * dot(e.w, mat(e.I, e.w)), 0);

/** A row's relative velocity, computed here, independently of the solver: about the point midway between its two ends. */
function relative(row: Row): number {
  const mid: Vec3 = [(row.pa[0] + row.pb[0]) / 2, (row.pa[1] + row.pb[1]) / 2, (row.pa[2] + row.pb[2]) / 2];
  const at = (e: Entity | null) => {
    if (!e) return 0;
    if (row.kind === 'angular') return dot(row.dir, e.w);
    return dot(row.dir, e.v) + dot(row.dir, cross(e.w, [mid[0] - e.origin[0], mid[1] - e.origin[1], mid[2] - e.origin[2]]));
  };
  return at(row.b) - at(row.a);
}

function scene(seed: number, kinds: Kind[], opts: { target?: boolean; soft?: boolean; world?: boolean } = {}) {
  const r = random(seed);
  const bodies = Array.from({ length: 2 + Math.floor(r() * 5) }, () => body(r));
  const rows: Row[] = [];
  const count = 1 + Math.floor(r() * 24);
  for (let k = 0; k < count; k++) {
    const kind = kinds[Math.floor(r() * kinds.length)]!;
    if (kind === 'friction') {
      const n = row(r, bodies, 'contact', { ...opts, target: false });
      rows.push(n, row(r, bodies, 'friction', { ...opts, target: false, soft: false }, n));
    } else rows.push(row(r, bodies, kind, opts));
    // some rows share a group: solved as one block
    if (r() < 0.2 && rows.length > 1 && kind === 'bilateral') rows[rows.length - 1]!.group = rows[rows.length - 2]!.group = `g${k}`;
  }
  // a warm start chosen to do harm: impulses of either sign, large, on rows that may now be separating
  const warm = new Map<string, number>();
  if (r() < 0.7) for (const w of rows) if (r() < 0.6) warm.set(w.key!, span(r, 5));
  return { r, bodies, rows, warm, passes: 1 + Math.floor(r() * 40) };
}

const TRIALS = 300;

describe('F-1.1.1: no row between two bodies changes their momentum', () => {
  it('linear and angular, for any rows, bounds, targets, softness, warm start, pass count and order', () => {
    for (let t = 1; t <= TRIALS; t++) {
      const s = scene(t, ['bilateral', 'contact', 'box', 'friction'], { target: true, soft: true });
      const before = momentum(s.bodies);
      solveRows(s.rows, s.passes, s.warm);
      const after = momentum(s.bodies);
      const scale = 1 + Math.hypot(...before.p) + Math.hypot(...before.L) + s.rows.reduce((m, w) => m + Math.abs(w.acc), 0) * 10;
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(after.p[k]! - before.p[k]!)).toBeLessThan(1e-12 * scale * 1e3);
        expect(Math.abs(after.L[k]! - before.L[k]!)).toBeLessThan(1e-12 * scale * 1e3);
      }
    }
  });

  it('and a long sequence of such solves on the same bodies keeps it to rounding, as composition must', () => {
    const r = random(77);
    const bodies = Array.from({ length: 6 }, () => body(r));
    const start = momentum(bodies);
    for (let k = 0; k < 200; k++) {
      const rows: Row[] = [];
      for (let q = 0; q < 10; q++) rows.push(row(r, bodies, (['bilateral', 'contact', 'box'] as Kind[])[q % 3]!, { target: true, soft: true }));
      solveRows(rows, 1 + Math.floor(r() * 10));
    }
    const end = momentum(bodies);
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(end.p[k]! - start.p[k]!)).toBeLessThan(1e-8);
      expect(Math.abs(end.L[k]! - start.L[k]!)).toBeLessThan(1e-8);
    }
  });
});

describe('F-2.6.1: the kinetic energy a solve changes is exactly the sum of its rows\' work', () => {
  it('ΔK = Σ λ (w⁻ + w⁺)/2, for any rows', () => {
    for (let t = 1; t <= TRIALS; t++) {
      const s = scene(1000 + t, ['bilateral', 'contact', 'box', 'friction'], { target: true, soft: true, world: t % 3 === 0 });
      const k0 = kinetic(s.bodies);
      const out = solveRows(s.rows, s.passes, s.warm);
      const k1 = kinetic(s.bodies);
      const sum = s.rows.reduce((m, w) => m + (w.work ?? 0), 0);
      expect(Math.abs(k1 - k0 - sum)).toBeLessThan(1e-9 * (1 + k0 + k1));
      expect(Math.abs(out.dK - sum)).toBeLessThan(1e-12 * (1 + Math.abs(sum)));
    }
  });
});

describe('F-2.6.2, F-2.6.3 and F-2.6.4: rows with nothing to drive them never add energy', () => {
  it('rows with no target and fixed bounds holding zero never raise kinetic energy, at any pass count, however they are warm-started', () => {
    for (let t = 1; t <= TRIALS; t++) {
      const s = scene(2000 + t, ['bilateral', 'contact', 'box'], { soft: true, world: t % 4 === 0 });
      const k0 = kinetic(s.bodies);
      solveRows(s.rows, s.passes, s.warm);
      expect(kinetic(s.bodies) - k0).toBeLessThanOrEqual(1e-10 * (1 + k0));
    }
  });

  it('a warm start that would push apart what is separating adds nothing: the first pass takes it back, or the exit check does', () => {
    const r = random(5);
    const a = body(r), b = body(r);
    a.origin = [0, 0, 0]; b.origin = [1, 0, 0];
    a.v = [-1, 0, 0]; b.v = [1, 0, 0]; a.w = [0, 0, 0]; b.w = [0, 0, 0];
    const contact: Row = { a, b, kind: 'linear', pa: [0.5, 0, 0], pb: [0.5, 0, 0], dir: [1, 0, 0], target: 0, lo: 0, hi: Infinity, acc: 0, key: 'c' };
    const k0 = kinetic([a, b]);
    const out = solveRows([contact], 1, new Map([['c', 3]]));
    expect(out.dK).toBeLessThanOrEqual(1e-12);
    expect(kinetic([a, b])).toBeLessThanOrEqual(k0 + 1e-12);
  });

  it('with targets, it adds no more than the targets pay for: ΔK ≤ Σ λ t', () => {
    for (let t = 1; t <= TRIALS; t++) {
      const s = scene(3000 + t, ['bilateral', 'contact', 'box'], { target: true, soft: true });
      const k0 = kinetic(s.bodies);
      solveRows(s.rows, s.passes, s.warm);
      const paid = s.rows.reduce((m, w) => m + w.acc * w.target, 0);
      expect(kinetic(s.bodies) - k0).toBeLessThanOrEqual(paid + 1e-10 * (1 + k0));
    }
  });

  it('whatever the rows, friction included and stopped early, it adds no more than its impulses\' work against the velocity they leave', () => {
    for (let t = 1; t <= TRIALS; t++) {
      const s = scene(4000 + t, ['bilateral', 'contact', 'box', 'friction'], { target: true, soft: true, world: t % 2 === 0 });
      const k0 = kinetic(s.bodies);
      solveRows(s.rows, s.passes, s.warm);
      const against = s.rows.reduce((m, w) => m + Math.max(0, w.acc * relative(w)), 0);
      expect(kinetic(s.bodies) - k0).toBeLessThanOrEqual(against + 1e-10 * (1 + k0));
    }
  });

  it('solved to convergence, contacts and joints leave no such work: each impulse opposes the motion it leaves, or that motion is zero', () => {
    // Without friction the solve is a convex quadratic programme, which projected Gauss-Seidel converges on, and at its
    // fixed point every row's λ w⁺ ≤ 0 (the KKT conditions). With friction it is not (its bounds move with the normal
    // impulse): there the general bound above is the claim, and `leak` measures what is left. Convergence is linear
    // at a rate set by the conditioning, so the bodies here are alike in mass and inertia and the leak is checked to
    // shrink with the passes, to a fixed point where it is gone.
    for (let t = 1; t <= 60; t++) {
      const r = random(5000 + t);
      const alike = () => { const e = body(r); const m = 1 + r(); e.invMass = 1 / m; e.I = [m, 0, 0, 0, m, 0, 0, 0, m]; e.invI = inverse3(e.I); return e; };
      const bodies = Array.from({ length: 2 + Math.floor(r() * 4) }, alike);
      const rows: Row[] = [];
      const count = 1 + Math.floor(r() * 12);
      for (let k = 0; k < count; k++) rows.push(row(r, bodies, (['contact', 'bilateral', 'box'] as Kind[])[Math.floor(r() * 3)]!, {}));
      const copy = () => rows.map((w) => ({ ...w, acc: 0 }));
      const bodies0 = bodies.map((e) => ({ ...e, v: [...e.v] as Vec3, w: [...e.w] as Vec3 }));
      const run = (passes: number) => {
        for (let i = 0; i < bodies.length; i++) { bodies[i]!.v = [...bodies0[i]!.v] as Vec3; bodies[i]!.w = [...bodies0[i]!.w] as Vec3; }
        return solveRows(copy(), passes, undefined, 0).leak;
      };
      const early = run(5), late = run(3000);
      const scale = rows.length * (1 + bodies.reduce((m, e) => m + Math.hypot(...e.v) + Math.hypot(...e.w), 0)) ** 2;
      expect(late).toBeLessThanOrEqual(Math.max(1e-7 * scale, 1e-3 * early));
    }
  });
});
