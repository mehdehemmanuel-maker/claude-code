// Eddy-current drag (Lenz's law) against exact results.

import { describe, expect, it } from 'vitest';
import { annulusMesh, boxMesh, eddyDamping, placeMesh, rigidBasis, tubeDipoleDrag, type Vec3 } from '../../src/engineering/eddy';
import { cylinderFaces, dipoleMoment, faceField, type PoleFace } from '../../src/engineering/magnets';

const MU0 = 4e-7 * Math.PI;
/** Exact field B of a magnet's pole faces at the mesh's cell centres. */
const fieldAt = (faces: PoleFace[], ps: Vec3[]) => ps.map((p) => {
  let b: Vec3 = [0, 0, 0];
  for (const f of faces) { const h = faceField(f, p, 1e-12); b = [b[0] + MU0 * h[0], b[1] + MU0 * h[1], b[2] + MU0 * h[2]]; }
  return b;
});
const identity = (v: Vec3) => v;

describe('eddy-current drag', () => {
  it('a small magnet in a thin copper tube: the point-dipole drag F = 45 mu0^2 m^2 sigma delta v / (1024 a^4)', () => {
    const R = 0.002, L = 0.004, a = 0.015, wall = 0.001, sigma = 5.8e7;
    const faces = cylinderFaces([0, 0, 0], [0, 1, 0], R, L, 1.3);
    const mesh = placeMesh(annulusMesh(a + wall / 2, a - wall / 2, 0.1, null, 6000, 1)!, [0, 0, 0], identity);
    const D = eddyDamping(mesh, sigma, fieldAt(faces, mesh.cells.map((c) => c.p)), rigidBasis([0, 0, 0]));
    const expected = tubeDipoleDrag(dipoleMoment(1.3, Math.PI * R * R * L), sigma, wall, a);
    expect(Math.abs(D[1 * 6 + 1]! / expected - 1)).toBeLessThan(0.08);
  });

  it('a disc spinning about its axis over a coaxial magnet carries no current (an open-circuit Faraday disc)', () => {
    const faces = cylinderFaces([0, 0, 0], [0, 1, 0], 0.005, 0.005, 1.3);
    // the conductor: a 10 x 5 mm disc stacked 0.5 mm above, meshed as a solid cylinder
    const mesh = placeMesh(annulusMesh(0.005, 0, 0.0025, null, 800, 4, 24)!, [0, 0.008, 0], identity);
    const D = eddyDamping(mesh, 6.7e5, fieldAt(faces, mesh.cells.map((c) => c.p)), rigidBasis([0, 0.008, 0]));
    const spin = D[4 * 6 + 4]!, tilt = D[3 * 6 + 3]!;
    expect(tilt).toBeGreaterThan(0);
    expect(spin / tilt).toBeLessThan(1e-3);
    // approaching or rocking it does induce currents: its motion is damped
    expect(D[1 * 6 + 1]!).toBeGreaterThan(0);
  });

  it('structured meshes are solved exactly: the transform solve agrees with conjugate gradients', () => {
    const faces = cylinderFaces([0.001, 0.003, 0.0005], [0.1, 0.99, 0], 0.002, 0.004, 1.3);
    const meshes = [
      annulusMesh(0.01, 0.0085, 0.034, null, 240)!, // a pipe's wall, one cell thick
      annulusMesh(0.01, 0.007, 0.02, null, 600, 3)!,
      annulusMesh(0.005, 0, 0.0025, null, 400, 4, 24)!, // a solid cylinder
      boxMesh([0.02, 0.003, 0.015], { lo: [-0.01, -1, -0.01], hi: [0.012, 1, 0.01] }, 240)!, // part of a plate
    ];
    for (const m0 of meshes) {
      expect(m0.grid).toBeDefined();
      const mesh = placeMesh(m0, [0.0003, -0.006, 0.0002], identity);
      const B = fieldAt(faces, mesh.cells.map((c) => c.p));
      const D = eddyDamping(mesh, 5.8e7, B, rigidBasis([0.001, 0.003, 0.0005]));
      const Dcg = eddyDamping({ cells: mesh.cells, faces: mesh.faces }, 5.8e7, B, rigidBasis([0.001, 0.003, 0.0005]));
      const scale = Math.max(...Dcg.map(Math.abs));
      for (let i = 0; i < 36; i++) expect(Math.abs(D[i]! - Dcg[i]!) / scale).toBeLessThan(1e-9);
    }
  });

  it('dissipation is never negative, and a uniform field induces nothing in straight translation', () => {
    const mesh = placeMesh(boxMesh([0.01, 0.002, 0.01], null, 400)!, [0, 0, 0], identity);
    const uniform = mesh.cells.map(() => [0, 0.5, 0.2] as Vec3);
    const D = eddyDamping(mesh, 5.8e7, uniform, rigidBasis([0, 0, 0]));
    for (let k = 0; k < 3; k++) expect(Math.abs(D[k * 6 + k]!)).toBeLessThan(1e-9);
    const faces = cylinderFaces([0, 0.004, 0], [0, 1, 0], 0.005, 0.005, 1.3);
    const Dm = eddyDamping(mesh, 5.8e7, fieldAt(faces, mesh.cells.map((c) => c.p)), rigidBasis([0, 0, 0]));
    // q^T D q >= 0 for random motions
    for (let t = 0; t < 20; t++) {
      const q = Array.from({ length: 6 }, (_, i) => Math.sin(12.9898 * (t + 1) * (i + 1)));
      let P = 0;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) P += q[i]! * Dm[i * 6 + j]! * q[j]!;
      expect(P).toBeGreaterThanOrEqual(-1e-12);
    }
  });
});
