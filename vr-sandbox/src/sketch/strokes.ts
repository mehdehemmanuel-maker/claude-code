// Reading a drawing: the strokes you draw on the interpretation wall, read as the shapes you meant. Each stroke is
// simplified (Douglas-Peucker), then fitted: a straight line by total least squares, a circle by least squares
// (Kasa's algebraic fit, refined by Gauss-Newton on the geometric distance), a closed stroke by its corners (a
// triangle, a rectangle, or a polygon). Every fit says how well it fits (its error as a share of the shape's size),
// so what isn't clear is said to be unclear rather than guessed at.

export type P2 = [number, number];

export type Shape =
  | { kind: 'line'; a: P2; b: P2; length: number }
  | { kind: 'circle'; c: P2; r: number }
  | { kind: 'rect'; c: P2; w: number; h: number; angle: number }
  | { kind: 'triangle'; pts: [P2, P2, P2] }
  | { kind: 'polygon'; pts: P2[]; closed: boolean };

export interface Reading {
  shape: Shape;
  /** How well it fits: RMS distance of the stroke from the shape, as a share of the shape's size (0 is perfect). */
  error: number;
  /** Other readings that fit nearly as well, best first (for "no, it's a ..."). */
  alternatives: { shape: Shape; error: number }[];
}

const sub = (a: P2, b: P2): P2 => [a[0] - b[0], a[1] - b[1]];
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lengthOf = (pts: P2[]) => pts.slice(1).reduce((s, p, i) => s + dist(p, pts[i]!), 0);

/** Distance of p from the segment ab. */
export function segDist(p: P2, a: P2, b: P2): number {
  const ab = sub(b, a), ap = sub(p, a);
  const L2 = ab[0] * ab[0] + ab[1] * ab[1];
  const t = L2 > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1]) / L2)) : 0;
  return dist(p, [a[0] + t * ab[0], a[1] + t * ab[1]]);
}

/** Douglas-Peucker: the fewest points that keep the stroke within `eps` of itself. */
export function simplify(pts: P2[], eps: number): P2[] {
  if (pts.length < 3) return [...pts];
  let worst = 0, at = 0;
  const a = pts[0]!, b = pts[pts.length - 1]!;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segDist(pts[i]!, a, b);
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= eps) return [a, b];
  const left = simplify(pts.slice(0, at + 1), eps), right = simplify(pts.slice(at), eps);
  return [...left.slice(0, -1), ...right];
}

/** The straight line that best fits the points (principal axis), from the first point's end to the last's. */
export function fitLine(pts: P2[]): { shape: Shape; error: number } {
  const n = pts.length;
  const cx = pts.reduce((s, p) => s + p[0], 0) / n, cy = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const x = p[0] - cx, y = p[1] - cy; sxx += x * x; syy += y * y; sxy += x * y; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const d: P2 = [Math.cos(th), Math.sin(th)];
  const along = (p: P2) => (p[0] - cx) * d[0] + (p[1] - cy) * d[1];
  const ts = pts.map(along);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  // keep the direction you drew it in
  const [ta, tb] = along(pts[0]!) <= along(pts[n - 1]!) ? [t0, t1] : [t1, t0];
  const a: P2 = [cx + d[0] * ta, cy + d[1] * ta], b: P2 = [cx + d[0] * tb, cy + d[1] * tb];
  const length = Math.abs(t1 - t0);
  const rms = Math.sqrt(pts.reduce((s, p) => s + ((p[0] - cx) * -d[1] + (p[1] - cy) * d[0]) ** 2, 0) / n);
  return { shape: { kind: 'line', a, b, length }, error: rms / Math.max(length, 1e-9) };
}

/** The circle that best fits the points: Kasa's algebraic fit, then Gauss-Newton on the true distances. */
export function fitCircle(pts: P2[]): { shape: Shape; error: number } {
  const n = pts.length;
  // Kasa: minimise sum (x^2 + y^2 + D x + E y + F)^2, a linear least-squares problem
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sz = 0, sxz = 0, syz = 0;
  for (const [x, y] of pts) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sz += z; sxz += x * z; syz += y * z; }
  const M = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]], v = [-sxz, -syz, -sz];
  const sol = solve3(M, v);
  let c: P2 = sol ? [-sol[0] / 2, -sol[1] / 2] : [sx / n, sy / n];
  let r = sol ? Math.sqrt(Math.max(0, c[0] * c[0] + c[1] * c[1] - sol[2])) : 0;
  // Gauss-Newton on r_i = |p_i - c| - r
  for (let it = 0; it < 10; it++) {
    let a11 = 0, a12 = 0, a13 = 0, a22 = 0, a23 = 0, a33 = 0, b1 = 0, b2 = 0, b3 = 0;
    for (const p of pts) {
      const dx = p[0] - c[0], dy = p[1] - c[1], d = Math.hypot(dx, dy) || 1e-12;
      const j: [number, number, number] = [-dx / d, -dy / d, -1], res = d - r;
      a11 += j[0] * j[0]; a12 += j[0] * j[1]; a13 += j[0] * j[2]; a22 += j[1] * j[1]; a23 += j[1] * j[2]; a33 += j[2] * j[2];
      b1 -= j[0] * res; b2 -= j[1] * res; b3 -= j[2] * res;
    }
    const step = solve3([[a11, a12, a13], [a12, a22, a23], [a13, a23, a33]], [b1, b2, b3]);
    if (!step) break;
    c = [c[0] + step[0], c[1] + step[1]];
    r += step[2];
    if (Math.hypot(...step) < 1e-9 * Math.max(r, 1e-9)) break;
  }
  const rms = Math.sqrt(pts.reduce((s, p) => s + (dist(p, c) - r) ** 2, 0) / n);
  // a circle has to go most of the way round: an arc this short is a curve, not a circle
  const sweep = angularSweep(pts, c);
  const short = sweep < 1.6 * Math.PI ? (1.6 * Math.PI - sweep) / (1.6 * Math.PI) : 0;
  return { shape: { kind: 'circle', c, r: Math.abs(r) }, error: rms / Math.max(Math.abs(r), 1e-9) + short };
}

/** How far round the centre the stroke goes, radians. */
function angularSweep(pts: P2[], c: P2) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a0 = Math.atan2(pts[i - 1]![1] - c[1], pts[i - 1]![0] - c[0]), a1 = Math.atan2(pts[i]![1] - c[1], pts[i]![0] - c[0]);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    total += d;
  }
  return Math.abs(total);
}

function solve3(A: number[][], b: number[]): [number, number, number] | null {
  const m = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-14) return null;
    [m[col], m[piv]] = [m[piv]!, m[col]!];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r]![col]! / m[col]![col]!;
      for (let k = col; k < 4; k++) m[r]![k]! -= f * m[col]![k]!;
    }
  }
  return [m[0]![3]! / m[0]![0]!, m[1]![3]! / m[1]![1]!, m[2]![3]! / m[2]![2]!];
}

/** A closed stroke read by its corners: a triangle, a rectangle (its best-fitting rectangle), or a polygon. */
export function fitPolygon(pts: P2[], closed: boolean): { shape: Shape; error: number } {
  const size = Math.max(1e-9, lengthOf(pts) / (closed ? 4 : 1));
  let corners = simplify(pts, 0.06 * size);
  if (closed && corners.length > 2 && dist(corners[0]!, corners[corners.length - 1]!) < 0.15 * size) corners = corners.slice(0, -1);
  // a vertex where the stroke hardly turns is not a corner
  if (closed) corners = corners.filter((p, i) => {
    const a = corners[(i - 1 + corners.length) % corners.length]!, b = corners[(i + 1) % corners.length]!;
    const u = sub(a, p), v = sub(b, p);
    const cos = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v) || 1);
    return cos > -0.94; // turns by more than about 20 degrees
  });
  const edgeErr = (poly: P2[]) => {
    const segs = poly.map((p, i) => [p, poly[(i + 1) % poly.length]!] as [P2, P2]).slice(0, closed ? poly.length : poly.length - 1);
    return Math.sqrt(pts.reduce((s, p) => s + Math.min(...segs.map(([a, b]) => segDist(p, a, b))) ** 2, 0) / pts.length);
  };
  if (closed && corners.length === 3) return { shape: { kind: 'triangle', pts: corners as [P2, P2, P2] }, error: edgeErr(corners) / size };
  if (closed && corners.length === 4) {
    // the rectangle with the stroke's principal orientation that best fits the corners
    const c: P2 = [corners.reduce((s, p) => s + p[0], 0) / 4, corners.reduce((s, p) => s + p[1], 0) / 4];
    const e0 = sub(corners[1]!, corners[0]!), e1 = sub(corners[2]!, corners[1]!);
    const angle = Math.atan2(e0[1], e0[0]);
    const w = (Math.hypot(...e0) + dist(corners[3]!, corners[2]!)) / 2, h = (Math.hypot(...e1) + dist(corners[0]!, corners[3]!)) / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const rect = ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as P2[]).map(([u, v]) => [c[0] + (u * w * ca - v * h * sa) / 2, c[1] + (u * w * sa + v * h * ca) / 2] as P2);
    return { shape: { kind: 'rect', c, w, h, angle }, error: edgeErr(rect) / size };
  }
  return { shape: { kind: 'polygon', pts: corners, closed }, error: edgeErr(corners) / size + 0.05 };
}

/** What a stroke is: every reading that applies, the best first. */
export function readStroke(pts: P2[]): Reading | null {
  if (pts.length < 2) return null;
  const len = lengthOf(pts);
  if (len < 1e-6) return null;
  const closed = pts.length > 4 && dist(pts[0]!, pts[pts.length - 1]!) < 0.15 * len;
  const options = [fitLine(pts)];
  if (pts.length >= 5) options.push(fitCircle(pts));
  if (pts.length >= 4) options.push(fitPolygon(pts, closed));
  // a closed stroke can't be a line
  if (closed) options[0]!.error += 1;
  options.sort((a, b) => a.error - b.error);
  const [best, ...rest] = options;
  return { shape: best!.shape, error: best!.error, alternatives: rest.filter((x) => x.error < best!.error + 0.3) };
}
