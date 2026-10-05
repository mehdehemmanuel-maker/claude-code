import { describe, expect, it } from 'vitest';
import { frontalAreas, type CollisionShape } from '../../src/parts/shapes';
import type { Vec3 } from '../../src/doc/types';

describe('the area a body shows a fluid (F-4.7)', () => {
  it('a sphere shows π r² every way, a cylinder its rectangle across and its disc along, a box its faces', () => {
    expect(frontalAreas({ type: 'sphere', radius: 0.1 })).toEqual([Math.PI * 0.01, Math.PI * 0.01, Math.PI * 0.01]);
    expect(frontalAreas({ type: 'cylinder', radius: 0.1, halfHeight: 0.25 })).toEqual([0.1, Math.PI * 0.01, 0.1]);
    const box = frontalAreas({ type: 'box', half: [0.1, 0.2, 0.3] });
    expect(box[0]).toBeCloseTo(0.24, 12); expect(box[1]).toBeCloseTo(0.12, 12); expect(box[2]).toBeCloseTo(0.08, 12);
  });

  it('a hull shows the silhouette of its points: a box of corners its faces, a sphere of points π r² within three percent', () => {
    const corners: Vec3[] = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) corners.push([x * 0.1, y * 0.2, z * 0.3]);
    const box = frontalAreas({ type: 'hull', points: corners });
    expect(box[0]).toBeCloseTo(0.24, 12); expect(box[1]).toBeCloseTo(0.12, 12); expect(box[2]).toBeCloseTo(0.08, 12);
    const n = 400, pts: Vec3[] = [];
    for (let k = 0; k < n; k++) { const y = 1 - (2 * (k + 0.5)) / n, r = Math.sqrt(1 - y * y), a = k * 2.399963229728653; pts.push([0.1 * r * Math.cos(a), 0.1 * y, 0.1 * r * Math.sin(a)]); }
    for (const a of frontalAreas({ type: 'hull', points: pts })) expect(Math.abs(a / (Math.PI * 0.01) - 1)).toBeLessThan(0.03);
  });

  it('a compound shows the convex outline of its children together: two cubes side by side are one brick, not a box twice their size', () => {
    const two: CollisionShape = { type: 'compound', children: [{ shape: { type: 'box', half: [0.1, 0.1, 0.1] }, p: [-0.1, 0, 0], q: [0, 0, 0, 1] }, { shape: { type: 'box', half: [0.1, 0.1, 0.1] }, p: [0.1, 0, 0], q: [0, 0, 0, 1] }] };
    const a = frontalAreas(two);
    expect(a[0]).toBeCloseTo(0.04, 12); expect(a[1]).toBeCloseTo(0.08, 12); expect(a[2]).toBeCloseTo(0.08, 12);
    // a sphere in a compound still shows π r², not its box
    const ball = frontalAreas({ type: 'compound', children: [{ shape: { type: 'sphere', radius: 0.1 }, p: [0, 0, 0], q: [0, 0, 0, 1] }] });
    for (const x of ball) expect(Math.abs(x / (Math.PI * 0.01) - 1)).toBeLessThan(0.03);
  });
});
