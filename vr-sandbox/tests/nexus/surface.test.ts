// The freeform surface tools against what is known exactly: a NURBS circle is a circle, a cylinder has no Gaussian
// curvature and a mean curvature of 1/(2R), a plane has none; a Coons patch keeps its boundary; a symmetric half
// crosses its mirror with one tangent plane; a dent is seen as a wobble and as broken zebra lines.
import { describe, expect, test } from 'vitest';
import { coons, curvature, curveAt, curvatures, fair, fairness, pull, seam, surfaceAt, surfaceArea, symmetric, zebra, type Curve, type Surface, type V3 } from '../../src/nexus/surface';

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
