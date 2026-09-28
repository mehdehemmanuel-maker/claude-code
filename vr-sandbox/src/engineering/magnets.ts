// Permanent magnet forces via the Gilbert (magnetic charge) model.
// A uniformly magnetised magnet is equivalent to surface charge sigma = M = Br / mu0 on its pole faces.
// Pairwise "Coulomb" forces F = mu0 q1 q2 / (4 pi r^2) between quadrature points give the full force and,
// summed about each centre of mass, the torque. It is finite at contact and exact in the far field.

export const MU0 = 4e-7 * Math.PI;

export interface MagnetGrade {
  id: string;
  label: string;
  /** Remanence Br, tesla (midpoint of the grade range). */
  Br: number;
  density: number;
  source: string;
}

export const MAGNET_GRADES: Record<string, MagnetGrade> = {
  N35: { id: 'N35', label: 'NdFeB N35', Br: 1.19, density: 7500, source: 'IEC 60404-8-1 / manufacturer grade tables, 1.17-1.21 T' },
  N42: { id: 'N42', label: 'NdFeB N42', Br: 1.3, density: 7500, source: 'IEC 60404-8-1 / manufacturer grade tables, 1.28-1.32 T' },
  N45: { id: 'N45', label: 'NdFeB N45', Br: 1.34, density: 7500, source: 'manufacturer grade tables, 1.32-1.36 T' },
  N52: { id: 'N52', label: 'NdFeB N52', Br: 1.455, density: 7500, source: 'manufacturer grade tables, 1.43-1.48 T' },
  C8: { id: 'C8', label: 'Ferrite C8 (Y30BH)', Br: 0.39, density: 4900, source: 'MMPA 0100 ceramic 8, 0.38-0.40 T' },
  SmCo: { id: 'SmCo', label: 'SmCo 2:17', Br: 1.08, density: 8400, source: 'manufacturer grade tables, 1.05-1.12 T' },
  AlNiCo5: { id: 'AlNiCo5', label: 'AlNiCo 5', Br: 1.25, density: 7300, source: 'MMPA 0100 AlNiCo 5' },
};

export type Vec3 = [number, number, number];

/**
 * A charged quadrature patch in world space. q in ampere-metres; rho is the radius of the disc-shaped
 * patch of pole face it stands for (so the near field stays finite and physical).
 */
export interface Charge {
  p: Vec3;
  q: number;
  rho: number;
}

/**
 * Equal-area ring quadrature on a disc of radius R with `rings` rings (1 -> 1 point, 2 -> 7, 3 -> 19,
 * 4 -> 37 ...). Returns in-plane offsets, weights (area fractions) and the equivalent patch radius.
 */
export function discQuadrature(R: number, rings: number): { u: number; v: number; w: number; rho: number }[] {
  const n = Math.max(1, Math.floor(rings));
  const counts = Array.from({ length: n }, (_, k) => (k === 0 ? 1 : 6 * k));
  const total = counts.reduce((a, b) => a + b, 0);
  const rho = R / Math.sqrt(total);
  const pts: { u: number; v: number; w: number; rho: number }[] = [];
  let cum = 0;
  for (let k = 0; k < n; k++) {
    const count = counts[k]!;
    const a0 = cum / total;
    const a1 = (cum + count) / total;
    const r = k === 0 ? 0 : R * Math.sqrt((a0 + a1) / 2);
    for (let j = 0; j < count; j++) {
      const th = (2 * Math.PI * j) / count + (k % 2) * (Math.PI / count);
      pts.push({ u: r * Math.cos(th), v: r * Math.sin(th), w: 1 / total, rho });
    }
    cum += count;
  }
  return pts;
}

/** Rectangular n x n grid quadrature on a w x h face. */
export function rectQuadrature(w: number, h: number, n: number) {
  const rho = Math.sqrt((w * h) / (n * n) / Math.PI);
  const pts: { u: number; v: number; w: number; rho: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      pts.push({ u: ((i + 0.5) / n - 0.5) * w, v: ((j + 0.5) / n - 0.5) * h, w: 1 / (n * n), rho });
    }
  }
  return pts;
}

/** Surface charge density of a pole face, A/m. */
export const poleDensity = (Br: number) => Br / MU0;

/**
 * Force on the charges of B due to the charges of A, and the torque on B about cB: [Fx,Fy,Fz, Tx,Ty,Tz].
 *
 * Kernel: each pair interacts as a uniformly charged disc patch (radius rho, rho^2 = mean of both patches)
 * acting on a point charge along the line between them:
 *   |F| = mu0 q_a q_b / (2 pi rho^2) * (1 - r / sqrt(r^2 + rho^2))
 * Far away this is exactly Coulomb's mu0 q_a q_b / (4 pi r^2); as r -> 0 it tends to the uniform-sheet
 * limit mu0 sigma_a q_b / 2, so touching pole faces give the textbook Br^2 A / (2 mu0) instead of infinity.
 */
export function chargeInteraction(A: Charge[], B: Charge[], cB: Vec3): number[] {
  let fx = 0, fy = 0, fz = 0, tx = 0, ty = 0, tz = 0;
  for (const b of B) {
    let bx = 0, by = 0, bz = 0;
    for (const a of A) {
      const dx = b.p[0] - a.p[0];
      const dy = b.p[1] - a.p[1];
      const dz = b.p[2] - a.p[2];
      const r2 = dx * dx + dy * dy + dz * dz;
      const r = Math.sqrt(r2);
      if (r < 1e-12) continue;
      const rho2 = 0.5 * (a.rho * a.rho + b.rho * b.rho);
      const mag = ((MU0 * a.q * b.q) / (2 * Math.PI * rho2)) * (1 - r / Math.sqrt(r2 + rho2));
      const s = mag / r;
      bx += s * dx;
      by += s * dy;
      bz += s * dz;
    }
    fx += bx; fy += by; fz += bz;
    const rx = b.p[0] - cB[0];
    const ry = b.p[1] - cB[1];
    const rz = b.p[2] - cB[2];
    tx += ry * bz - rz * by;
    ty += rz * bx - rx * bz;
    tz += rx * by - ry * bx;
  }
  return [fx, fy, fz, tx, ty, tz];
}

/**
 * Charges of an axially magnetised cylinder (disc) magnet.
 * centre c, unit axis n (pointing from S to N face), radius R, length L.
 */
export function cylinderCharges(c: Vec3, n: Vec3, R: number, L: number, Br: number, rings: number): Charge[] {
  const quad = discQuadrature(R, rings);
  const faceQ = poleDensity(Br) * Math.PI * R * R;
  const [t1, t2] = orthonormalBasis(n);
  const out: Charge[] = [];
  for (const sign of [1, -1]) {
    const fc: Vec3 = [c[0] + n[0] * sign * L / 2, c[1] + n[1] * sign * L / 2, c[2] + n[2] * sign * L / 2];
    for (const qp of quad) {
      out.push({
        p: [fc[0] + t1[0] * qp.u + t2[0] * qp.v, fc[1] + t1[1] * qp.u + t2[1] * qp.v, fc[2] + t1[2] * qp.u + t2[2] * qp.v],
        q: sign * faceQ * qp.w,
        rho: qp.rho,
      });
    }
  }
  return out;
}

/** Charges of a block magnet magnetised along local axis n with face size w x h and length L. */
export function blockCharges(c: Vec3, n: Vec3, t1: Vec3, t2: Vec3, w: number, h: number, L: number, Br: number, grid: number): Charge[] {
  const quad = rectQuadrature(w, h, grid);
  const faceQ = poleDensity(Br) * w * h;
  const out: Charge[] = [];
  for (const sign of [1, -1]) {
    const fc: Vec3 = [c[0] + n[0] * sign * L / 2, c[1] + n[1] * sign * L / 2, c[2] + n[2] * sign * L / 2];
    for (const qp of quad) {
      out.push({
        p: [fc[0] + t1[0] * qp.u + t2[0] * qp.v, fc[1] + t1[1] * qp.u + t2[1] * qp.v, fc[2] + t1[2] * qp.u + t2[2] * qp.v],
        q: sign * faceQ * qp.w,
        rho: qp.rho,
      });
    }
  }
  return out;
}

/**
 * Image charges for a (highly permeable, unsaturated) ferromagnetic half-space bounded by the plane
 * through point o with outward unit normal m: each charge is mirrored with opposite sign.
 * `factor` accounts for finite permeability and saturation of thin plates (0..1).
 */
export function imageCharges(charges: Charge[], o: Vec3, m: Vec3, factor: number): Charge[] {
  return charges.map((ch) => {
    const d = (ch.p[0] - o[0]) * m[0] + (ch.p[1] - o[1]) * m[1] + (ch.p[2] - o[2]) * m[2];
    return { p: [ch.p[0] - 2 * d * m[0], ch.p[1] - 2 * d * m[1], ch.p[2] - 2 * d * m[2]], q: -ch.q * factor, rho: ch.rho };
  });
}

/**
 * Saturation factor for a steel plate of thickness t facing a magnet pole of area Apole with remanence Br.
 * The plate must carry the pole flux sideways through its cross-section before saturating (Bsat ~ 2.0 T
 * for low-carbon steel). Estimated model: factor = min(1, t Bsat P / (Br Apole)) with P the pole perimeter.
 */
export function plateSaturationFactor(t: number, Br: number, poleArea: number, polePerimeter: number, Bsat = 2.0) {
  return Math.min(1, (t * Bsat * polePerimeter) / Math.max(Br * poleArea, 1e-12));
}

/** Far-field point-dipole force between two coaxial magnets: F = 3 mu0 m1 m2 / (2 pi r^4). */
export function coaxialDipoleForce(m1: number, m2: number, r: number) {
  return (3 * MU0 * m1 * m2) / (2 * Math.PI * r ** 4);
}

/** Dipole moment of a uniformly magnetised volume: m = Br V / mu0. */
export const dipoleMoment = (Br: number, volume: number) => (Br * volume) / MU0;

/**
 * Point-charge approximation for two identical coaxial cylinders (radius R, length h, gap x),
 * F = (pi mu0 / 4) M^2 R^4 [1/x^2 + 1/(x+2h)^2 - 2/(x+h)^2]. Accurate when x >> R.
 */
export function coaxialCylinderPointChargeForce(Br: number, R: number, h: number, x: number) {
  const M = Br / MU0;
  return ((Math.PI * MU0) / 4) * M * M * R ** 4 * (1 / x ** 2 + 1 / (x + 2 * h) ** 2 - 2 / (x + h) ** 2);
}

export function orthonormalBasis(n: Vec3): [Vec3, Vec3] {
  const a: Vec3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const t1 = normalize(cross(n, a));
  const t2 = cross(n, t1);
  return [t1, t2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function normalize(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

/**
 * Quadrature rings to use for a pair of magnets at a given face gap, trading accuracy for cost.
 * Measured against a 14-ring reference: within ~12% at gaps below R/4, ~6% below R, ~3% beyond.
 */
export function ringsForGap(gap: number, R: number) {
  if (gap < 0.25 * R) return 6;
  if (gap < R) return 4;
  if (gap < 4 * R) return 3;
  if (gap < 12 * R) return 2;
  return 1;
}
