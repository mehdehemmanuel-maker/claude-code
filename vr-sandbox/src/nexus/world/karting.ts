// Go-karts by real physics. A rental kart: a Honda GX270 behind the seat (6.3 kW net at 3,600 rpm, its torque 19.1 N·m
// at 2,500 rpm: Honda's SAE J1349 figures), a chain to a solid rear axle, a centrifugal clutch, the engine governed at
// 3,600 rpm; the kart and its driver about 200 kg; tyres that grip up to about 1.1 g on dry asphalt and slide past it.
// The track is a closed loop 7 m wide (the CIK-FIA's second grade asks at least 7 m; its third, 6 m), kerbs on its
// corners, grass beyond them that grips about half as well, tyre walls round it all.
//
// The kart is a bicycle model (two tyres, front and rear, each with its own slip angle) whose tyres' side force grows
// with slip and saturates at μ times the load on them (a friction circle: the rear tyres' drive force takes from the grip
// they have for cornering). So a kart pushed too fast into a corner slides wide, or spins if the rear lets go first, and
// a kart driven at the limit goes round a corner at √(μ g / κ), its curvature κ. Other karts drive the same model,
// following the racing line by looking ahead along it, braking for each corner from the speed its curvature allows.
//
// Numbers are sourced where a source is named, else marked typical or an estimate:
// - the kart: 120 kg with its engine (an estimate for a rental kart; its engine alone is 25 kg, Honda), a driver 80 kg;
//   wheelbase 1.05 m (typical), 42 % of the weight on the front (typical), yaw inertia 45 kg·m² (an estimate);
// - the drive: 3.2 to 1 from engine to axle (an estimate: it puts the governed 3,600 rpm at about 60 km/h on 0.14 m tyres
//   [11 × 7.10-5, typical]); the chain and clutch 90 % efficient (typical); the clutch takes up at 2,200 rpm (typical);
// - the air: C_d A about 0.55 m² for a kart and its driver (an estimate from published kart tests of 0.5 to 0.7); rolling
//   resistance 0.02 on asphalt (typical of small hard tyres), 0.08 on grass (an estimate);
// - the brakes: a disc on the rear axle only, so braking is rear grip: at most about 0.9 g (an estimate) and then the rear
//   locks and slides.

export const KART = {
  mass: 200, wheelbase: 1.05, front: 0.42, Iz: 45, track: 1.0,
  power: 6300, torque: 19.1, rpmMax: 3600, rpmClutch: 2200, ratio: 3.2, rWheel: 0.14, eff: 0.9,
  CdA: 0.55, rho: 1.225, crr: 0.02, crrGrass: 0.08, mu: 1.1, muGrass: 0.55, brake: 0.9, slipPeak: 0.1, steerMax: 0.45,
} as const;

export type V2 = [number, number];
export interface KartState {
  x: number; z: number; heading: number; // world: heading 0 points along +x, turning towards +z (the driver's right: y is up)
  vx: number; vy: number; r: number; // body frame: forward, to the driver's right, and the yaw rate (+: turning right)
  steer: number; throttle: number; brake: number; rpm: number; onGrass: boolean;
  /** how far round the track (m from the line), laps done, when each lap started (s), its best */ s: number; laps: number; lapStart: number; best: number | null; last: number | null; t: number; hits: number; hitT: number;
}

// ---- the track: a closed loop through points, smoothed by a centripetal Catmull–Rom spline, sampled every metre ----
export interface Track { pts: V2[]; tan: V2[]; kappa: number[]; s: number[]; length: number; width: number; name: string; says: string[] }
/** The loop's points (m): a ~560 m club circuit: a start straight, a hairpin, an S, a long sweeper and back. */
const LOOP: V2[] = [[0, 0], [45, 0], [75, -6], [88, -22], [84, -40], [66, -46], [50, -36], [36, -40], [26, -58], [36, -76], [60, -84], [82, -90], [92, -108], [78, -122], [40, -124], [6, -118], [-20, -104], [-34, -80], [-26, -56], [-40, -36], [-34, -12], [-18, -2]];

function catmull(p: V2[], step = 1): V2[] {
  const n = p.length, out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n]!, p1 = p[i]!, p2 = p[(i + 1) % n]!, p3 = p[(i + 2) % n]!;
    const d = (a: V2, b: V2) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const seg = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < seg; k++) {
      const t = t1 + ((t2 - t1) * k) / seg, L = (a: V2, b: V2, ta: number, tb: number): V2 => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
      const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3), B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
      out.push(L(B1, B2, t1, t2));
    }
  }
  return out;
}
/** The track: its centre line every metre or so, the direction along it, how sharply it bends there (1/m, + to the right), how far round. */
export function makeTrack(points: V2[] = LOOP, width = 7): Track {
  const pts = catmull(points), n = pts.length, tan: V2[] = [], kappa: number[] = [], s: number[] = [0];
  for (let i = 0; i < n; i++) { const a = pts[(i - 1 + n) % n]!, b = pts[(i + 1) % n]!, l = Math.hypot(b[0] - a[0], b[1] - a[1]); tan.push([(b[0] - a[0]) / l, (b[1] - a[1]) / l]); }
  for (let i = 0; i < n; i++) {
    // the curvature from three points: the circle through them (Menger curvature), + bending to the right (towards +z)
    const a = pts[(i - 2 + n) % n]!, b = pts[i]!, c = pts[(i + 2) % n]!, ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); kappa.push((2 * cross) / Math.max(1e-9, ab * bc * ca));
    if (i) s.push(s[i - 1]! + Math.hypot(b[0] - pts[i - 1]![0], b[1] - pts[i - 1]![1]));
  }
  const length = s[n - 1]! + Math.hypot(pts[0]![0] - pts[n - 1]![0], pts[0]![1] - pts[n - 1]![1]);
  const tight = Math.max(...kappa.map(Math.abs)), corners = countCorners(kappa);
  return { pts, tan, kappa, s, length, width, name: 'a go-kart track', says: [`a ${Math.round(length)} m loop ${width} m wide (the CIK-FIA asks at least 6–8 m by grade), ${corners} corners, its tightest ${(1 / tight).toFixed(0)} m in radius`] };
}
function countCorners(k: number[]): number { let c = 0, inC = false; for (const x of k) { const now = Math.abs(x) > 1 / 40; if (now && !inC) c++; inC = now; } return c; }

/** The nearest point of the track to a place: its index, how far round, how far off the centre line (+ to the right), the
 *  direction along it there. Searched near a guess when one is given (a kart moves a few metres a step). */
export function nearest(tr: Track, x: number, z: number, guess?: number): { i: number; s: number; off: number; tan: V2 } {
  const n = tr.pts.length; let best = 0, bd = Infinity;
  const look = (i: number) => { const p = tr.pts[i]!, d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < bd) { bd = d; best = i; } };
  if (guess === undefined) for (let i = 0; i < n; i++) look(i); else for (let k = -30; k <= 30; k++) look((guess + k + n) % n);
  const p = tr.pts[best]!, t = tr.tan[best]!, dx = x - p[0], dz = z - p[1], along = dx * t[0] + dz * t[1], off = -dx * t[1] + dz * t[0];
  return { i: best, s: (tr.s[best]! + along + tr.length) % tr.length, off, tan: t };
}

// ---- the kart ----
/** A kart standing on the grid: so many places back from the line, in two columns. */
export function onGrid(tr: Track, place: number): KartState {
  const back = 6 + place * 4, want = tr.length - back, i = Math.max(0, tr.s.findIndex((x) => x >= want)), p = tr.pts[i]!, t = tr.tan[i]!, side = (place % 2 ? -1 : 1) * 1.6;
  return { x: p[0] - t[1] * side, z: p[1] + t[0] * side, heading: Math.atan2(t[1], t[0]), vx: 0, vy: 0, r: 0, steer: 0, throttle: 0, brake: 0, rpm: 0, onGrass: false, s: tr.length - back, laps: -1, lapStart: 0, best: null, last: null, t: 0, hits: 0, hitT: -9 };
}

/** The drive force at the rear tyres for a road speed and throttle: the engine's torque through the gearing, cut back to
 *  its power, nothing over the governed speed, the clutch slipping at a stand (the engine held at its take-up speed). */
export function driveForce(v: number, throttle: number): { F: number; rpm: number } {
  const k = KART, wheelRpm = (Math.max(0, v) / k.rWheel) * (60 / (2 * Math.PI)), rpm = Math.max(k.rpmClutch * Math.min(1, throttle * 2), wheelRpm * k.ratio);
  if (throttle <= 0) return { F: 0, rpm: Math.max(1400, wheelRpm * k.ratio) };
  const govern = Math.max(0, Math.min(1, (k.rpmMax - rpm) / 150)), w = (rpm * 2 * Math.PI) / 60;
  const T = Math.min(k.torque, k.power / Math.max(w, 1)) * throttle * govern;
  return { F: (T * k.ratio * k.eff) / k.rWheel, rpm: Math.min(rpm, k.rpmMax + 50) };
}
/** A tyre's side force for its slip angle: rising almost linearly, flattening at its peak, μ times its load. */
const tyre = (alpha: number, load: number, mu: number) => mu * load * Math.tanh(alpha / KART.slipPeak * 1.2);

/** One step of a kart (dt s): its tyres' forces, the engine, the brakes, the air, the ground it is on, the walls. */
export function stepKart(k: KartState, tr: Track, dt: number, g = 9.80665): void {
  const K = KART, m = K.mass, a = K.wheelbase * (1 - K.front), b = K.wheelbase * K.front; // a: front axle to the centre of mass
  const at = nearest(tr, k.x, k.z, Math.round(((k.s % tr.length) / tr.length) * tr.pts.length) % tr.pts.length);
  const half = tr.width / 2; k.onGrass = Math.abs(at.off) > half + 0.6; // the kerbs are 0.6 m wide and grip like the track
  const mu = k.onGrass ? K.muGrass : K.mu, crr = k.onGrass ? K.crrGrass : K.crr;
  const Ff = m * g * K.front, Fr = m * g * (1 - K.front), v = k.vx;
  const delta = k.steer * K.steerMax;
  // the engine and the brake, at the rear; the rear's grip is shared between them and cornering (the friction circle)
  const d = driveForce(v, k.throttle); k.rpm = d.rpm;
  let Fx = d.F - (v > 0.05 ? k.brake * K.brake * Fr : 0);
  if (Math.abs(v) < 0.05 && k.brake > 0) Fx = Math.min(Fx, 0);
  Fx = Math.max(-mu * Fr, Math.min(mu * Fr, Fx));
  let ax: number, ay: number, rd: number;
  const speed = Math.hypot(k.vx, k.vy), beta = Math.atan2(k.vy, Math.abs(k.vx));
  if (speed < 1.5) {
    // slow: the tyres roll where they point (the slip-angle model has no meaning at a stand); a kart rolling backwards
    // (after a spin) is stopped by its tyres
    const vv = Math.max(0, v); k.vy -= Math.sign(k.vy) * Math.min(Math.abs(k.vy), mu * g * dt); k.r = (vv * Math.tan(delta)) / K.wheelbase; // sliding sideways: stopped by friction, μ g at most
    ax = (Fx - crr * m * g * Math.sign(vv) - 0.5 * K.rho * K.CdA * vv * vv) / m; ay = 0; rd = 0;
    if (v < 0) ax = Math.min(-v / dt, mu * g); else if (vv <= 0 && ax < 0) ax = 0;
  } else if (v < 0.5 || Math.abs(beta) > 0.6) {
    // spinning or sideways: every tyre sliding, each axle's friction against its own way through the air (rubber sliding
    // grips about 0.8 of its peak: typical), the air against the whole
    const muK = mu * 0.8, fx = v, fy = k.vy + a * k.r, rx = v, ry = k.vy - b * k.r, fn = Math.hypot(fx, fy) || 1, rn = Math.hypot(rx, ry) || 1;
    const Ffx = (-muK * Ff * fx) / fn, Ffy = (-muK * Ff * fy) / fn, Frx = (-muK * Fr * rx) / rn, Fry = (-muK * Fr * ry) / rn, dr = 0.5 * K.rho * K.CdA * speed;
    ax = (Ffx + Frx - dr * v) / m + k.vy * k.r; ay = (Ffy + Fry - dr * k.vy) / m - v * k.r; rd = (a * Ffy - b * Fry) / K.Iz;
  } else {
    const af = delta - Math.atan2(k.vy + a * k.r, v), ar = -Math.atan2(k.vy - b * k.r, v);
    const rearLeft = Math.sqrt(Math.max(0, (mu * Fr) ** 2 - Fx * Fx)); // what grip the rear has left beside its drive
    const Fyf = tyre(af, Ff, mu), Fyr = (rearLeft / Math.max(1e-6, mu * Fr)) * tyre(ar, Fr, mu);
    const drag = 0.5 * K.rho * K.CdA * v * Math.abs(v) + crr * m * g * Math.sign(v);
    ax = (Fx - Fyf * Math.sin(delta) - drag) / m + k.vy * k.r;
    ay = (Fyr + Fyf * Math.cos(delta)) / m - v * k.r;
    rd = (a * Fyf * Math.cos(delta) - b * Fyr) / K.Iz;
  }
  k.vx += ax * dt; k.vy += ay * dt; k.r += rd * dt;
  const c = Math.cos(k.heading), s = Math.sin(k.heading);
  k.x += (k.vx * c - k.vy * s) * dt; k.z += (k.vx * s + k.vy * c) * dt; k.heading += k.r * dt; k.t += dt;
  // the tyre walls, 3 m beyond the kerbs: a kart that reaches one stops against it, most of its speed taken (tyre walls
  // absorb: about 0.3 of the speed into them comes back, an estimate)
  const after = nearest(tr, k.x, k.z, at.i), wall = half + 0.6 + 3;
  if (Math.abs(after.off) > wall) {
    const n: V2 = [-after.tan[1] * Math.sign(after.off), after.tan[0] * Math.sign(after.off)], push = Math.abs(after.off) - wall;
    k.x -= n[0] * push; k.z -= n[1] * push;
    const wx = k.vx * c - k.vy * s, wz = k.vx * s + k.vy * c, into = wx * n[0] + wz * n[1];
    if (into > 0) { const nx = wx - 1.3 * into * n[0], nz = wz - 1.3 * into * n[1]; k.vx = (nx * c + nz * s) * 0.7; k.vy = (-nx * s + nz * c) * 0.7; k.r *= 0.3; if (k.t - k.hitT > 0.5 && into > 1) k.hits++; k.hitT = k.t; }
  }
  // laps: across the line going forwards
  const was = k.s; k.s = after.s;
  if (was > tr.length - 20 && k.s < 20) { if (k.laps >= 0) { k.last = k.t - k.lapStart; k.best = k.best === null ? k.last : Math.min(k.best, k.last); } k.laps++; k.lapStart = k.t; }
  else if (was < 20 && k.s > tr.length - 20) { k.laps--; } // backwards over it
}

// ---- driving: what a driver does, from the racing line ahead ----
/** The fastest a kart can take each point of the track: the corner's own limit √(μ g / κ), then what braking from the
 *  corners ahead and accelerating out of those behind allow (a speed profile, forward and back passes). */
export function speedProfile(tr: Track, skill = 1, g = 9.80665): number[] {
  const n = tr.pts.length, K = KART, vTop = (K.rpmMax / K.ratio / 60) * 2 * Math.PI * K.rWheel;
  const v = tr.kappa.map((x) => Math.min(vTop, Math.sqrt((K.mu * skill * g) / Math.max(1e-6, Math.abs(x)))));
  const ds = (i: number) => Math.max(0.2, tr.s[(i + 1) % n]! - tr.s[i]! + (i === n - 1 ? tr.length : 0));
  for (let pass = 0; pass < 2; pass++) {
    for (let i = n - 1; i >= 0; i--) { const j = (i + 1) % n; v[i] = Math.min(v[i]!, Math.sqrt(v[j]! ** 2 + 2 * K.brake * (1 - K.front) * 0.85 * skill * g * ds(i))); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; v[j] = Math.min(v[j]!, Math.sqrt(v[i]! ** 2 + 2 * 2.0 * ds(i))); }
  }
  return v;
}
/** A kart run for a frame's time in 2 ms steps (its tyres' forces change fast at low speed: an explicit step must be
 *  shorter than their time constant, about 15 ms at a walking pace). */
export function runKart(k: KartState, tr: Track, dt: number, g = 9.80665): void { const n = Math.max(1, Math.ceil(Math.min(dt, 0.1) / 0.002)), h = Math.min(dt, 0.1) / n; for (let i = 0; i < n; i++) stepKart(k, tr, h, g); }
/** A driver's hands and feet for this moment: steer towards a point on the line some way ahead (pure pursuit), throttle
 *  or brake to the speed the line allows there. */
export function drive(k: KartState, tr: Track, profile: number[], skill = 1): void {
  const n = tr.pts.length, at = nearest(tr, k.x, k.z, Math.round(((k.s % tr.length) / tr.length) * n) % n), look = Math.max(4, k.vx * 0.55);
  const j = (at.i + Math.round(look)) % n, p = tr.pts[j]!, dx = p[0] - k.x, dz = p[1] - k.z, c = Math.cos(k.heading), s = Math.sin(k.heading);
  const ly = -dx * s + dz * c, lx = dx * c + dz * s, ld = Math.hypot(lx, ly), curv = (2 * ly) / Math.max(1, ld * ld);
  k.steer = Math.max(-1, Math.min(1, Math.atan(curv * KART.wheelbase) / KART.steerMax));
  const want = profile[(at.i + Math.round(k.vx * 0.3)) % n]! * skill, dv = want - k.vx;
  k.throttle = dv > 0 ? Math.min(1, dv * 0.8 + 0.3) : 0; k.brake = dv < -0.5 ? Math.min(1, -dv * 0.4) : 0;
}

/** A lap at the limit all the way round: the speed profile's own time (what a perfect driver would take). */
export function idealLap(tr: Track, g = 9.80665): number {
  const v = speedProfile(tr, 1, g); let t = 0;
  for (let i = 0; i < tr.pts.length; i++) { const j = (i + 1) % tr.pts.length, ds = Math.hypot(tr.pts[j]![0] - tr.pts[i]![0], tr.pts[j]![1] - tr.pts[i]![1]); t += ds / Math.max(0.5, (v[i]! + v[j]!) / 2); }
  return t;
}
/** A lap's time said: "41.3 s". */
export const lapSaid = (t: number | null) => (t === null ? '—' : t >= 60 ? `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}` : `${t.toFixed(1)} s`);
/** The kart's top speed, governed (m/s). */
export const topSpeed = () => (KART.rpmMax / KART.ratio / 60) * 2 * Math.PI * KART.rWheel;

/** Two karts that touch (each about 1.5 m across: a circle 0.75 m round its middle, an estimate) pushed apart, the speed
 *  between them along the line of their middles exchanged as equal masses do, about 0.4 of it coming back (bumpers of
 *  moulded plastic over steel, an estimate). True if they touched. */
export function bump(a: KartState, b: KartState): boolean {
  const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), R = 1.5; if (d >= R || d < 1e-6) return false;
  const nx = dx / d, nz = dz / d, push = (R - d) / 2; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
  const w = (k: KartState): V2 => { const c = Math.cos(k.heading), s = Math.sin(k.heading); return [k.vx * c - k.vy * s, k.vx * s + k.vy * c]; };
  const set = (k: KartState, v: V2) => { const c = Math.cos(k.heading), s = Math.sin(k.heading); k.vx = Math.max(0, v[0] * c + v[1] * s); k.vy = -v[0] * s + v[1] * c; };
  const va = w(a), vb = w(b), closing = (va[0] - vb[0]) * nx + (va[1] - vb[1]) * nz; if (closing <= 0) return true;
  const j = ((1 + 0.4) / 2) * closing; set(a, [va[0] - j * nx, va[1] - j * nz]); set(b, [vb[0] + j * nx, vb[1] + j * nz]); return true;
}
/** The order of karts in a race: most laps, then furthest round. */
export const order = <T extends { k: KartState }>(ks: T[]): T[] => ks.slice().sort((p, q) => q.k.laps - p.k.laps || q.k.s - p.k.s);
