import { describe, expect, it } from 'vitest';
import { RigidFit, inverse3, mat3Mul, pointRows, angularRows, solveRows, type Entity, type Row, ID3, worldInertia, quatFromRotationVector, rotationVector } from '../../src/physics/rigid';
import type { Vec3 } from '../../src/doc/types';

const box = (m: number, x: number, y: number, z: number): number[] => [m * (y * y + z * z) / 12, 0, 0, 0, m * (x * x + z * z) / 12, 0, 0, 0, m * (x * x + y * y) / 12];

describe('rigid toolkit', () => {
  it('inverse3 inverts', () => {
    const m = [4, 1, 0.5, 1, 3, 0.2, 0.5, 0.2, 2];
    const p = mat3Mul(m, inverse3(m));
    p.forEach((v, i) => expect(v).toBeCloseTo(ID3[i]!, 12));
  });

  it('rotation vectors round-trip', () => {
    const v: Vec3 = [0.3, -1.1, 0.7];
    rotationVector(quatFromRotationVector(v)).forEach((x, i) => expect(x).toBeCloseTo(v[i]!, 12));
  });

  it('a mass-weighted fit conserves linear and angular momentum', () => {
    // two point-ish bodies moving apart and spinning: the fit's rigid motion carries the same P and L
    const bodies = [
      { p: [-1, 0, 0] as Vec3, v: [0, 1, 0] as Vec3, w: [0, 0, 2] as Vec3, m: 2 },
      { p: [1, 0, 0] as Vec3, v: [0, -1, 0.5] as Vec3, w: [0, 0, 1] as Vec3, m: 1 },
    ];
    const com: Vec3 = [(-2 + 1) / 3, 0, 0];
    const fit = new RigidFit(com);
    for (const b of bodies) {
      fit.point(b.p, b.m, b.v);
      fit.rotation(worldInertia(box(b.m, 0.1, 0.1, 0.1), [0, 0, 0, 1]), b.w);
    }
    const u = fit.solve();
    const P = bodies.reduce((a, b) => a.map((x, i) => x + b.m * b.v[i]!), [0, 0, 0]);
    expect(u.v[0] * 3).toBeCloseTo(P[0]!, 12);
    expect(u.v[1] * 3).toBeCloseTo(P[1]!, 12);
    expect(u.v[2] * 3).toBeCloseTo(P[2]!, 12);
  });

  it('a block anchor holds a pinned bar exactly in one pass', () => {
    // a 1 m bar pinned at one end, falling at 1 m/s: one block row set stops it completely
    const m = 3, L = 1;
    const I = inverse3(box(m, L, 0.05, 0.05));
    const bar: Entity = { origin: [L / 2, 0, 0], v: [0, -1, 0], w: [0, 0, 0], invMass: 1 / m, invI: I };
    const rows: Row[] = [...pointRows(bar, null, [0, 0, 0], [0, 0, 0], ID3, [0, 0, 0], null, 'pin'), ...angularRows(bar, null, ID3, [0, 0, 0], null, 'pin')];
    solveRows(rows, 1);
    for (const x of [...bar.v, ...bar.w]) expect(Math.abs(x)).toBeLessThan(1e-9);
  });

  it('a heavy box on a light box on the ground: warm-started contacts converge to statics', () => {
    const g = 9.81, dt = 1 / 90;
    const light: Entity = { origin: [0, 0.05, 0], v: [0, 0, 0], w: [0, 0, 0], invMass: 1 / 1, invI: inverse3(box(1, 0.1, 0.1, 0.1)) };
    const heavy: Entity = { origin: [0, 0.15, 0], v: [0, 0, 0], w: [0, 0, 0], invMass: 1 / 50, invI: inverse3(box(50, 0.1, 0.1, 0.1)) };
    const warm = new Map<string, number>();
    let ground = 0;
    for (let t = 0; t < 60; t++) {
      light.v = [light.v[0], light.v[1] - g * dt, light.v[2]];
      heavy.v = [heavy.v[0], heavy.v[1] - g * dt, heavy.v[2]];
      const rows: Row[] = [];
      for (const [i, x] of [-0.05, 0.05].entries()) for (const [j, z] of [-0.05, 0.05].entries()) {
        rows.push({ a: light, b: null, kind: 'linear', pa: [x, 0, z], pb: [x, 0, z], dir: [0, -1, 0], target: 0, lo: 0, hi: Infinity, acc: 0, key: `g${i}${j}`, tag: 'g' });
        rows.push({ a: light, b: heavy, kind: 'linear', pa: [x, 0.1, z], pb: [x, 0.1, z], dir: [0, 1, 0], target: 0, lo: 0, hi: Infinity, acc: 0, key: `s${i}${j}`, tag: 's' });
      }
      solveRows(rows, 24, warm);
      ground = rows.filter((r) => r.tag === 'g').reduce((s, r) => s + r.acc, 0);
    }
    expect(ground / dt).toBeCloseTo(51 * g, 3);
    expect(Math.abs(heavy.v[1])).toBeLessThan(1e-6);
  });
});
