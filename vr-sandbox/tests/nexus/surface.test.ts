// The freeform surface tools against what is known exactly: a NURBS circle is a circle, a cylinder has no Gaussian
// curvature and a mean curvature of 1/(2R), a plane has none; a Coons patch keeps its boundary; a symmetric half
// crosses its mirror with one tangent plane; a dent is seen as a wobble and as broken zebra lines.
import { describe, expect, test } from 'vitest';
import { comb, coons, curvature, curveAt, curvatures, draft, fair, fairness, fromEdge, interpolate, pointAt, pull, seam, skinParams, skinThrough, split, surfaceAt, surfaceArea, symmetric, tessellate, zebra, type Curve, type Surface, type V3 } from '../../src/nexus/surface';

const r2 = Math.SQRT1_2;
const quarter: Curve = { P: [[1, 0, 0], [1, 1, 0], [0, 1, 0]], w: [1, r2, 1], p: 2 };

describe('curves', () => {
  test('a rational quadratic quarter is an exact circle: radius 1, curvature 1 everywhere', () => {
    for (const u of [0, 0.1, 0.33, 0.5, 0.77, 1]) { const { at } = curveAt(quarter, u); expect(Math.hypot(at[0], at[1])).toBeCloseTo(1, 9); expect(curvature(quarter, u)).toBeCloseTo(1, 6); }
  });
  test('a cubic through collinear points is the line, its tangent along it', () => {
    const c: Curve = { P: [[0, 0, 0], [1, 1, 0], [2, 2, 0], [3, 3, 0], [4, 4, 0]] };
    for (const u of [0.2, 0.6]) { const { at, d1 } = curveAt(c, u); expect(at[0]).toBeCloseTo(at[1], 9); expect(d1[0]).toBeCloseTo(d1[1], 9); expect(curvature(c, u)).toBeCloseTo(0, 9); }
    expect(curveAt(c, 0).at).toEqual([0, 0, 0]); expect(curveAt(c, 1).at[0]).toBeCloseTo(4, 12);
  });
});

describe('surfaces', () => {
  test('a cylinder of radius R: Gaussian curvature 0, mean curvature 1/(2R)', () => {
    const R = 0.5, row = (x: number): V3[] => [[x, 0, R], [x, R, R], [x, R, 0]];
    const s: Surface = { net: [row(0), row(0.5), row(1)], w: [[1, r2, 1], [1, r2, 1], [1, r2, 1]], p: 2, q: 2 };
    for (const [u, v] of [[0.3, 0.2], [0.5, 0.5], [0.8, 0.9]] as const) { const sp = surfaceAt(s, u, v), k = curvatures(sp); expect(Math.hypot(sp.at[1], sp.at[2])).toBeCloseTo(R, 9); expect(k.K).toBeCloseTo(0, 6); expect(Math.abs(k.H)).toBeCloseTo(1 / (2 * R), 6); }
  });
  test('a Coons patch from four straight edges of a square is the flat square, its area 1', () => {
    const line = (a: V3, b: V3): Curve => ({ P: [a, b], p: 1 });
    const s = coons(line([0, 0, 0], [1, 0, 0]), line([0, 1, 0], [1, 1, 0]), line([0, 0, 0], [0, 1, 0]), line([1, 0, 0], [1, 1, 0]), 4, 4);
    for (const [u, v] of [[0.25, 0.75], [0.6, 0.1]] as const) { const sp = surfaceAt(s, u, v); expect(sp.at[2]).toBeCloseTo(0, 12); expect(Math.abs(sp.n[2])).toBeCloseTo(1, 9); }
    expect(surfaceArea(s)).toBeCloseTo(1, 6);
  });
  test('a symmetric half crosses its mirror with one tangent plane (its normal there has no part across the mirror)', () => {
    const net: V3[][] = [0, 0.5, 1].map((x) => [[x, 0.3, 0.05], [x, 0.32, 0.2], [x, 0.2, 0.45], [x, 0, 0.5]]);
    const s = symmetric({ net }, 'first');
    for (const u of [0.2, 0.5, 0.9]) { const sp = surfaceAt(s, u, 0); expect(sp.at[2]).toBeCloseTo(0, 12); expect(sp.n[2]).toBeCloseTo(0, 9); }
    expect(s.mirror).toBe(true);
  });
});

describe('the critic\'s eye', () => {
  const flat = (): Surface => ({ net: Array.from({ length: 7 }, (_, i) => Array.from({ length: 7 }, (_, j) => [i / 6, j / 6, 0] as V3)) });
  test('a plane is fair: no wobbles, no curvature, zebra lines unbroken', () => {
    const f = fairness(flat()); expect(f.wobbles).toBe(0); expect(Math.abs(f.Hmax)).toBeLessThan(1e-9);
  });
  test('a dent pulled into a gentle bump is seen: as wobbles, and as zebra lines breaking where it is', () => {
    const bump = pull(fair(pull(flat(), 3, 3, [0, 0, 0.12], 0.6), 2, 0.3), 3, 3, [0, 0, 0], 0.1), dent = pull(bump, 2, 4, [0, 0, -0.08], 0.2);
    const fb = fairness(bump), fd = fairness(dent); expect(fd.wobbles).toBeGreaterThan(fb.wobbles);
    const zb = zebra(bump), zd = zebra(dent); expect(zd.breaks).toBeGreaterThan(zb.breaks);
  });
  test('fairing a dented net makes it fairer', () => {
    const rough = pull(pull(flat(), 2, 2, [0, 0, 0.1], 0.18), 4, 3, [0, 0, -0.1], 0.18);
    expect(fairness(fair(rough, 6, 0.5)).roughness).toBeLessThan(fairness(rough).roughness);
  });
  test('a seam between a patch and its neighbour carried on smoothly: no gap, no angle', () => {
    const a = flat(), b: Surface = { net: a.net.map((row) => row.map(([x, y, z]) => [x + 1, y, z] as V3)) };
    const s = seam(a, 'u1', b, 'u0'); expect(s.gap).toBeCloseTo(0, 9); expect(s.angle).toBeCloseTo(0, 6);
  });
});

describe('through given points', () => {
  test('an interpolated curve passes through its points; through points on a circle its curvature is the circle\'s', () => {
    const R = 0.35, Q: V3[] = Array.from({ length: 13 }, (_, k) => { const a = (k / 12) * Math.PI; return [R * Math.cos(a), R * Math.sin(a), 0]; });
    const c = interpolate(Q), t = [0]; for (let k = 1; k < Q.length; k++) t.push(t[k - 1]! + Math.hypot(Q[k]![0] - Q[k - 1]![0], Q[k]![1] - Q[k - 1]![1]));
    Q.forEach((q, k) => { const p = curveAt(c, t[k]! / t[12]!).at; expect(Math.hypot(p[0] - q[0], p[1] - q[1])).toBeLessThan(1e-9); });
    for (const u of [0.3, 0.5, 0.7]) expect(Math.abs(curvature(c, u) * R - 1)).toBeLessThan(0.01);
    expect(comb(c).inflections).toBe(0);
  });
  test('a skin through sections passes through every point of every section', () => {
    const rows: V3[][] = [0, 0.4, 0.9, 1.5, 2].map((x) => [0, 0.3, 0.6, 0.85, 1].map((f) => [x, f * (1 + 0.2 * Math.sin(x)), 0.4 * Math.sin(f * Math.PI) * (1 + 0.1 * x)] as V3));
    const s = skinThrough(rows), { u, v } = skinParams(rows);
    rows.forEach((r, i) => r.forEach((q, j) => { const p = surfaceAt(s, u[i]!, v[j]!).at; expect(Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])).toBeLessThan(1e-8); }));
  });
});

describe('patches and the factory\'s eye', () => {
  const flat = (): Surface => ({ net: Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => [i / 3, j / 3, 0] as V3)) });
  test('a quarter of a square is a quarter of its area, and its triangles face the way its normals do', () => {
    expect(surfaceArea({ s: flat(), uv: [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]] })).toBeCloseTo(0.25, 9);
    for (const uv of [[[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]], [[0, 0], [0, 0.5], [0.5, 0.5], [0.5, 0]]] as [number, number][][]) {
      const t = tessellate({ s: flat(), uv: uv as never }, 4, 4);
      for (let k = 0; k < t.idx.length; k += 3) { const [a, b, c] = [t.idx[k]!, t.idx[k + 1]!, t.idx[k + 2]!].map((i) => [t.pos[3 * i]!, t.pos[3 * i + 1]!, t.pos[3 * i + 2]!]); const n = (b![0]! - a![0]!) * (c![1]! - a![1]!) - (b![1]! - a![1]!) * (c![0]! - a![0]!); expect(n * t.nor[3 * t.idx[k]! + 2]!).toBeGreaterThan(0); }
    }
  });
  test('draft: a flat plate parts at 90°; a half barrel at 0°; more than half a barrel locks in any die', () => {
    expect(draft(flat()).least * 180 / Math.PI).toBeCloseTo(90, 1);
    // (a barrel, not a straight channel: a straight one pulls out along its length)
    const arc = (a0: number, a1: number): Surface => { const pts = (x: number) => Array.from({ length: 9 }, (_, k) => { const a = a0 + (a1 - a0) * k / 8, r = 0.3 * (1 + 0.6 * x * (1 - x)); return [x, Math.sin(a) * r, Math.cos(a) * r] as V3; }); return skinThrough([pts(0), pts(0.25), pts(0.5), pts(0.75), pts(1)]); };
    expect(Math.abs(draft(arc(-Math.PI / 2, Math.PI / 2)).least * 180 / Math.PI)).toBeLessThan(1.5);
    const over = draft(arc(-Math.PI * 0.7, Math.PI * 0.7)); expect(over.least).toBeLessThan(-0.05); expect(over.undercut).toBeGreaterThan(0);
  });
});

describe('skins built on each other', () => {
  const rows: V3[][] = [0, 0.3, 0.7, 1.1, 1.6, 2].map((x) => [0, 0.3, 0.6, 1].map((f) => [x, f * (1 + 0.15 * Math.sin(2 * x)), 0.3 * Math.sin(f * Math.PI) + 0.05 * x] as V3));
  test('a skin split between two places is the same surface there, exactly (a rational one too)', () => {
    const s = skinThrough(rows, { fit: { n: 5, lambda: 0.1 } }), piece = split(s, 0.23, 0.81);
    for (const t of [0, 0.1, 0.5, 0.77, 1]) for (const v of [0, 0.4, 1]) { const a = pointAt(piece, t, v), b = pointAt(s, 0.23 + 0.58 * t, v); expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-9); }
    const R = 0.5, row = (x: number): V3[] => [[x, 0, R], [x, R, R], [x, R, 0]], cyl: Surface = { net: [row(0), row(0.4), row(0.7), row(1)], w: [[1, Math.SQRT1_2, 1], [1, Math.SQRT1_2, 1], [1, Math.SQRT1_2, 1], [1, Math.SQRT1_2, 1]], p: 3, q: 2 }, cp = split(cyl, 0.4, 1);
    for (const t of [0, 0.3, 1]) for (const v of [0.2, 0.6]) { const a = pointAt(cp, t, v), b = pointAt(cyl, 0.4 + 0.6 * t, v); expect(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])).toBeLessThan(1e-9); expect(Math.hypot(a[1], a[2])).toBeCloseTo(R, 9); }
  });
  test('a skin built on another\'s edge meets it along all of it, in one tangent plane, not only where sections were drawn', () => {
    const s = skinThrough(rows, { fit: { n: 5, lambda: 0.1 } }), lid = fromEdge(split(s, 0.2, 0.9), (E, d) => [E, [E[0] + d[0] * 1.5, E[1] + d[1] * 1.5, E[2] + d[2] * 1.5], [E[0], E[1] + 0.2, E[2] * 0.5], [E[0], E[1] + 0.2, 0]]);
    for (const t of [0, 0.13, 0.5, 0.88, 1]) {
      const a = surfaceAt(lid, t, 0), b = surfaceAt(s, 0.2 + 0.7 * t, 1);
      expect(Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1], a.at[2] - b.at[2])).toBeLessThan(1e-9);
      expect(Math.abs(a.n[0] * b.n[0] + a.n[1] * b.n[1] + a.n[2] * b.n[2])).toBeGreaterThan(1 - 1e-9);
    }
  });
});
