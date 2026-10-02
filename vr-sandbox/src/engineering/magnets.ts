// Permanent magnet forces via the Gilbert (magnetic charge) model.
// A uniformly magnetised magnet is equivalent to surface charge sigma = M = Br / mu0 on its pole faces. The force on
// magnet B is the field of magnet A's faces acting on B's face charge: F = mu0 sum_b q_b H_A(p_b). A's field is taken
// exactly (magnetField.ts: the closed-form field of a charged disc or rectangle), and B's faces are sampled by an
// equal-area quadrature. Since A's field is exact and derives from a potential, the force is conservative, it does not
// depend on how B's sample points happen to line up with A (touching faces pull with the sheet value sigma / 2 over
// their overlap wherever they sit), and it is exact in the far field. Torque follows from the same sum about B's
// centre, and the reaction on A is exactly opposite (the world applies it, with the moment of the couple).

import { discFieldFast, rectField } from './magnetField';

export const MU0 = 4e-7 * Math.PI;

export type Vec3 = [number, number, number];

/**
 * A sample of a pole face's charge in world space: q in ampere-metres, rho the radius of the patch of face it stands
 * for (it sets how closely the sample may approach another face's edge before the edge is smoothed).
 */
export interface Charge {
  p: Vec3;
  q: number;
  rho: number;
}

/**
 * A uniformly charged flat pole face in world space: centre c, outward normal o, in-plane axes t1, t2; a disc of
 * radius a or a rectangle of half-sizes hw (along t1) and hh (along t2); charge density sigma in A/m (+Br/mu0 on the
 * north face). `depth` is the length of magnet behind the face.
 */
export interface PoleFace {
  c: Vec3;
  o: Vec3;
  t1: Vec3;
  t2: Vec3;
  shape: 'disc' | 'rect';
  a: number;
  hw: number;
  hh: number;
  sigma: number;
  depth: number;
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

/** Pole faces of an axially magnetised cylinder: centre c, unit axis n (S to N), radius R, length L. */
export function cylinderFaces(c: Vec3, n: Vec3, R: number, L: number, Br: number): PoleFace[] {
  const [t1, t2] = orthonormalBasis(n);
  return [1, -1].map((sign) => ({
    c: [c[0] + (n[0] * sign * L) / 2, c[1] + (n[1] * sign * L) / 2, c[2] + (n[2] * sign * L) / 2] as Vec3,
    o: [n[0] * sign, n[1] * sign, n[2] * sign] as Vec3,
    t1, t2, shape: 'disc' as const, a: R, hw: 0, hh: 0, sigma: sign * poleDensity(Br), depth: L,
  }));
}

/** Pole faces of a block magnetised along n, face w (along t1) x h (along t2), length L. */
export function blockFaces(c: Vec3, n: Vec3, t1: Vec3, t2: Vec3, w: number, h: number, L: number, Br: number): PoleFace[] {
  return [1, -1].map((sign) => ({
    c: [c[0] + (n[0] * sign * L) / 2, c[1] + (n[1] * sign * L) / 2, c[2] + (n[2] * sign * L) / 2] as Vec3,
    o: [n[0] * sign, n[1] * sign, n[2] * sign] as Vec3,
    t1, t2, shape: 'rect' as const, a: 0, hw: w / 2, hh: h / 2, sigma: sign * poleDensity(Br), depth: L,
  }));
}

/** Charge samples of an axially magnetised cylinder's two faces (`rings` of the equal-area quadrature). */
export function cylinderCharges(c: Vec3, n: Vec3, R: number, L: number, Br: number, rings: number): Charge[] {
  return faceSamples(cylinderFaces(c, n, R, L, Br), discQuadrature(R, rings));
}

/** Charge samples of a block magnet's two faces on a grid x grid quadrature. */
export function blockCharges(c: Vec3, n: Vec3, t1: Vec3, t2: Vec3, w: number, h: number, L: number, Br: number, grid: number): Charge[] {
  return faceSamples(blockFaces(c, n, t1, t2, w, h, L, Br), rectQuadrature(w, h, grid));
}

function faceSamples(faces: PoleFace[], quad: { u: number; v: number; w: number; rho: number }[]): Charge[] {
  const out: Charge[] = [];
  for (const f of faces) {
    const Q = f.sigma * (f.shape === 'disc' ? Math.PI * f.a * f.a : 4 * f.hw * f.hh);
    for (const qp of quad) {
      out.push({
        p: [f.c[0] + f.t1[0] * qp.u + f.t2[0] * qp.v, f.c[1] + f.t1[1] * qp.u + f.t2[1] * qp.v, f.c[2] + f.t1[2] * qp.u + f.t2[2] * qp.v],
        q: Q * qp.w,
        rho: qp.rho,
      });
    }
  }
  return out;
}

/** Rotation by the rotation vector `rot` (axis times angle). */
function rotator(rot: Vec3) {
  const th = Math.hypot(rot[0], rot[1], rot[2]);
  if (th === 0) return (v: Vec3) => v;
  const k: Vec3 = [rot[0] / th, rot[1] / th, rot[2] / th];
  const c = Math.cos(th), s = Math.sin(th);
  return (v: Vec3): Vec3 => {
    const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
    const x: Vec3 = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [v[0] * c + x[0] * s + k[0] * kv * (1 - c), v[1] * c + x[1] * s + k[1] * kv * (1 - c), v[2] * c + x[2] * s + k[2] * kv * (1 - c)];
  };
}

/** Charges moved rigidly: rotated by the small rotation vector `rot` about `center`, then translated by `dx`. */
export function transformCharges(charges: Charge[], center: Vec3, dx: Vec3, rot: Vec3): Charge[] {
  const turn = rotator(rot);
  return charges.map((ch) => {
    const r = turn([ch.p[0] - center[0], ch.p[1] - center[1], ch.p[2] - center[2]]);
    return { p: [center[0] + r[0] + dx[0], center[1] + r[1] + dx[1], center[2] + r[2] + dx[2]], q: ch.q, rho: ch.rho };
  });
}

/** Faces moved rigidly, as transformCharges. */
export function transformFaces(faces: PoleFace[], center: Vec3, dx: Vec3, rot: Vec3): PoleFace[] {
  const turn = rotator(rot);
  return faces.map((f) => {
    const r = turn([f.c[0] - center[0], f.c[1] - center[1], f.c[2] - center[2]]);
    return { ...f, c: [center[0] + r[0] + dx[0], center[1] + r[1] + dx[1], center[2] + r[2] + dx[2]], o: turn(f.o), t1: turn(f.t1), t2: turn(f.t2) };
  });
}

/**
 * Image faces for a (highly permeable, unsaturated) ferromagnetic half-space bounded by the plane through o with
 * outward unit normal m: each face mirrored with opposite charge. `factor` accounts for finite permeability and
 * saturation of thin plates (0..1).
 */
export function imageFaces(faces: PoleFace[], o: Vec3, m: Vec3, factor: number): PoleFace[] {
  const mirrorDir = (v: Vec3): Vec3 => {
    const d = v[0] * m[0] + v[1] * m[1] + v[2] * m[2];
    return [v[0] - 2 * d * m[0], v[1] - 2 * d * m[1], v[2] - 2 * d * m[2]];
  };
  return faces.map((f) => {
    const d = (f.c[0] - o[0]) * m[0] + (f.c[1] - o[1]) * m[1] + (f.c[2] - o[2]) * m[2];
    return { ...f, c: [f.c[0] - 2 * d * m[0], f.c[1] - 2 * d * m[1], f.c[2] - 2 * d * m[2]], o: mirrorDir(f.o), t1: mirrorDir(f.t1), t2: mirrorDir(f.t2), sigma: -f.sigma * factor };
  });
}

// Edge smoothing: a sample stands for a patch of radius rho, so within about a patch of a face's edge it takes the
// face's potential a little further off the face, at height w + soft with
//   soft = EDGE_SOFT rho exp(-(e / (EDGE_REACH rho))^2 - (w / (EDGE_FADE rho))^2)
// (e the sample's sideways distance from the edge, w its height over the face). That spreads the edge's step and its
// logarithmic in-plane field over the patch instead of letting a single sample catch them. The force is the exact
// gradient of that smoothed potential (chain rule through soft), so it still derives from a potential: the stiffness
// stays symmetric and no work is created round a closed path. Away from edges, and above the face, soft vanishes and
// the field is exact: faces touching over their whole area pull with the exact sheet value.
const EDGE_SOFT = 0.3;
const EDGE_REACH = 0.5;
const EDGE_FADE = 1;

/**
 * Force per unit charge (A/m, the field H, smoothed at edges as above) on a sample of patch radius rho at p, from
 * one face. A point less than half the magnet's depth behind the face is inside the magnet, where only contact
 * penetration can put it: it is taken as touching the face.
 */
export function faceField(f: PoleFace, p: Vec3, rho: number): Vec3 {
  const dx = p[0] - f.c[0], dy = p[1] - f.c[1], dz = p[2] - f.c[2];
  let z = dx * f.o[0] + dy * f.o[1] + dz * f.o[2];
  const u = dx * f.t1[0] + dy * f.t1[1] + dz * f.t1[2];
  const v = dx * f.t2[0] + dy * f.t2[1] + dz * f.t2[2];
  if (z < 0 && z > -f.depth / 2) z = 0;
  const sgn = z < 0 ? -1 : 1, w = Math.abs(z);
  // sideways distance e from the edge and its in-plane gradient (eu, ev)
  let e: number, eu = 0, ev = 0, sr = 0;
  if (f.shape === 'disc') {
    sr = Math.hypot(u, v);
    e = Math.abs(sr - f.a);
    if (sr > 0) { const k = (sr > f.a ? 1 : -1) / sr; eu = k * u; ev = k * v; }
  } else {
    const ou = Math.abs(u) - f.hw, ov = Math.abs(v) - f.hh;
    if (ou < 0 && ov < 0) {
      if (-ou < -ov) { e = -ou; eu = -Math.sign(u); } else { e = -ov; ev = -Math.sign(v); }
    } else {
      e = Math.hypot(Math.max(ou, 0), Math.max(ov, 0));
      if (e > 0) { eu = (Math.max(ou, 0) * Math.sign(u)) / e; ev = (Math.max(ov, 0) * Math.sign(v)) / e; }
    }
  }
  const re = EDGE_REACH * rho, rw = EDGE_FADE * rho;
  const soft = EDGE_SOFT * rho * Math.exp(-((e / re) ** 2) - (w / rw) ** 2);
  const dSoftDe = (-2 * e * soft) / (re * re), dSoftDw = (-2 * w * soft) / (rw * rw);
  const zs = sgn * (w + soft);
  let hn: number, hu: number, hv: number;
  if (f.shape === 'disc') {
    const [n, r] = discFieldFast(f.a, sr, zs);
    hn = n;
    hu = sr > 0 ? (r * u) / sr : 0;
    hv = sr > 0 ? (r * v) / sr : 0;
  } else {
    [hu, hv, hn] = rectField(f.hw, f.hh, u, v, zs);
  }
  // gradient of the smoothed potential phi(u, v, sgn (w + soft(u, v, w)))
  const fn = hn * (1 + dSoftDw);
  const fu = hu + sgn * hn * dSoftDe * eu;
  const fv = hv + sgn * hn * dSoftDe * ev;
  const k = f.sigma;
  return [
    k * (fn * f.o[0] + fu * f.t1[0] + fv * f.t2[0]),
    k * (fn * f.o[1] + fu * f.t1[1] + fv * f.t2[1]),
    k * (fn * f.o[2] + fu * f.t1[2] + fv * f.t2[2]),
  ];
}

/**
 * Force and torque on the magnet whose face charge is sampled by `B` (torque about cB) from the field of the pole
 * faces `A`: [Fx, Fy, Fz, Tx, Ty, Tz].
 */
export function magnetWrench(A: PoleFace[], B: Charge[], cB: Vec3): number[] {
  let fx = 0, fy = 0, fz = 0, tx = 0, ty = 0, tz = 0;
  for (const b of B) {
    let hx = 0, hy = 0, hz = 0;
    for (const f of A) {
      const h = faceField(f, b.p, b.rho);
      hx += h[0]; hy += h[1]; hz += h[2];
    }
    const k = MU0 * b.q;
    const bx = k * hx, by = k * hy, bz = k * hz;
    fx += bx; fy += by; fz += bz;
    const rx = b.p[0] - cB[0], ry = b.p[1] - cB[1], rz = b.p[2] - cB[2];
    tx += ry * bz - rz * by;
    ty += rz * bx - rx * bz;
    tz += rx * by - ry * bx;
  }
  return [fx, fy, fz, tx, ty, tz];
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
 * Continuous quadrature level for a gap: 4 rings up to one radius, easing to 3 at 4 radii, 2 at 12 and 1 at 36
 * (linear in log gap), capped at `max`. The force is blended between the two neighbouring integer levels, so it
 * changes smoothly as magnets approach instead of stepping each time the quadrature changes.
 */
export function ringLevel(gap: number, R: number, max = 4) {
  const x = gap / Math.max(R, 1e-9);
  const knots: [number, number][] = [[1, 4], [4, 3], [12, 2], [36, 1]];
  let nu = 1;
  if (x <= knots[0]![0]) nu = knots[0]![1];
  else {
    for (let i = 1; i < knots.length; i++) {
      const [x0, n0] = knots[i - 1]!, [x1, n1] = knots[i]!;
      if (x <= x1) { nu = n0 + ((n1 - n0) * Math.log(x / x0)) / Math.log(x1 / x0); break; }
    }
  }
  return Math.max(1, Math.min(max, nu));
}

/** Force and torque at a continuous ring level: the blend of the two neighbouring integer levels. */
export function blendedInteraction(level: number, pair: (rings: number) => number[]) {
  const lo = Math.floor(level), a = level - lo;
  const f = pair(lo);
  if (a < 1e-6) return f;
  const g = pair(lo + 1);
  return f.map((v, i) => v * (1 - a) + g[i]! * a);
}

export interface PoleGeometry {
  shape: 'cylinder' | 'block';
  radius: number;
  w: number;
  h: number;
  length: number;
}

/**
 * What a magnet holds lying flush on a steel plate of thickness t, N: the pull of its pole faces' images in the steel
 * (M2), the same model the world applies. A maker's "pull force" is measured on thick steel (t >= 10 mm).
 */
export function pullOnSteel(g: PoleGeometry, Br: number, t = 0.02): number {
  if (Br <= 0) return 0;
  const c: Vec3 = [0, g.length / 2, 0];
  const up: Vec3 = [0, 1, 0];
  if (g.shape === 'cylinder') {
    const f = 0.95 * plateSaturationFactor(t, Br, Math.PI * g.radius ** 2, 2 * Math.PI * g.radius);
    return -magnetWrench(imageFaces(cylinderFaces(c, up, g.radius, g.length, Br), [0, 0, 0], up, f), cylinderCharges(c, up, g.radius, g.length, Br, 4), c)[1]!;
  }
  const f = 0.95 * plateSaturationFactor(t, Br, g.w * g.h, 2 * (g.w + g.h));
  return -magnetWrench(imageFaces(blockFaces(c, up, [1, 0, 0], [0, 0, 1], g.w, g.h, g.length, Br), [0, 0, 0], up, f), blockCharges(c, up, [1, 0, 0], [0, 0, 1], g.w, g.h, g.length, Br, 7), c)[1]!;
}

/**
 * The magnetisation that makes an electromagnet's pole hold its rated force on thick steel at full power. The field
 * acts as a uniformly magnetised cylinder of the pole's size, so its pull on steel goes as Br^2: Br = Br1 sqrt(F / F1).
 * Current sets it (B ~ N I below saturation, so the hold goes as the square of the power) and the soft-steel core
 * caps it: past about 1.6 T the core saturates and more current adds almost nothing (estimated knee of low-carbon
 * steel). How far the field reaches off the pole follows from the same equivalent magnet: estimated.
 */
export const CORE_SATURATION = 1.6;
export function electromagnetBr(g: PoleGeometry, rating: number): number {
  const F1 = pullOnSteel(g, 1);
  if (!(F1 > 0) || !(rating > 0)) return 0;
  return Math.min(CORE_SATURATION, Math.sqrt(rating / F1));
}
