import { describe, expect, it } from 'vitest';
import { leastSupport, tangents, type Entity, type Row } from '../../src/physics/rigid';
import type { Vec3 } from '../../src/doc/types';

// a 1 m x 0.6 m table's four feet, and what a solver's history can leave on them
const body: Entity = { origin: [0, 0.4, 0], v: [0, 0, 0], w: [0, 0, 0], invMass: 1 / 20, invI: [1, 0, 0, 0, 1, 0, 0, 0, 1] };
const feet: Vec3[] = [[-0.5, 0, -0.3], [0.5, 0, -0.3], [0.5, 0, 0.3], [-0.5, 0, 0.3]];
function support(normal: number[], fx: number[]) {
  const n: Vec3 = [0, 1, 0];
  const [t1, t2] = tangents(n);
  const rows: Row[] = [];
  const normals: Row[] = [];
  feet.forEach((p, i) => {
    const nr: Row = { a: body, b: null, kind: 'linear', pa: p, pb: p, dir: n, target: 0, lo: 0, hi: Infinity, acc: normal[i]! };
    normals.push(nr);
    rows.push(nr);
    // friction along x, split over the fixed tangents
    rows.push({ a: body, b: null, kind: 'linear', pa: p, pb: p, dir: t1, target: 0, lo: 0, hi: 0, frictionOf: nr, mu: 0.6, acc: fx[i]! * t1[0] });
    rows.push({ a: body, b: null, kind: 'linear', pa: p, pb: p, dir: t2, target: 0, lo: 0, hi: 0, frictionOf: nr, mu: 0.6, acc: fx[i]! * t2[0] });
  });
  return { rows, normals };
}
const net = (rows: Row[]) => rows.reduce((J, r) => [J[0] + r.dir[0] * r.acc, J[1] + r.dir[1] * r.acc, J[2] + r.dir[2] * r.acc], [0, 0, 0]);
const moment = (rows: Row[]) => rows.reduce((M, r) => {
  const f = r.dir.map((d) => d * r.acc) as Vec3, p = r.pa;
  return [M[0] + p[1] * f[2] - p[2] * f[1], M[1] + p[2] * f[0] - p[0] * f[2], M[2] + p[0] * f[1] - p[1] * f[0]];
}, [0, 0, 0]);

describe('a body on more supports than it needs', () => {
  it('shares its weight as real supports of equal stiffness do, and drops the friction that only cancels itself', () => {
    // 200 N·s of weight on one diagonal, the feet shoving each other apart at the limit of their friction
    const { rows, normals } = support([90, 10, 90, 10], [-6, 6, 6, -6]);
    const J0 = net(rows), M0 = moment(rows);
    leastSupport(normals, rows);
    for (const n of normals) expect(n.acc).toBeCloseTo(50, 9);
    for (const r of rows.filter((x) => x.frictionOf)) expect(Math.abs(r.acc)).toBeLessThan(1e-9);
    // it holds the body exactly as before: same net impulse, same moment
    net(rows).forEach((v, i) => expect(v).toBeCloseTo(J0[i]!, 9));
    moment(rows).forEach((v, i) => expect(v).toBeCloseTo(M0[i]!, 9));
  });

  it('keeps what really pushes sideways, and the moment of an off-centre load', () => {
    const { rows, normals } = support([80, 80, 40, 40], [10, 10, 10, 10]);
    const J0 = net(rows), M0 = moment(rows);
    leastSupport(normals, rows);
    net(rows).forEach((v, i) => expect(v).toBeCloseTo(J0[i]!, 9));
    moment(rows).forEach((v, i) => expect(v).toBeCloseTo(M0[i]!, 9));
    for (const n of normals) expect(n.acc).toBeGreaterThanOrEqual(0);
  });
});
