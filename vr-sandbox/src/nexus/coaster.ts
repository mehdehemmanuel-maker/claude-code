// A roller coaster by real physics. The track is laid as a coaster's designer lays it, piece by piece, each piece a
// straight or an arc of a stated radius (the radius is what sets the g you feel: v²/R): a station, tyres that push the
// train out, a chain lift to 40 m, a first drop at 62°, a teardrop loop (tight at the top, wide at the bottom, so the top
// is fast enough to hold you in and the bottom gentle enough to bear), a camelback hill for airtime, a banked helix, and
// a return over three low hills to the brakes and the station. The train is one rigid body along the track: gravity
// pulls it by the mean slope under its six cars, its wheels lose a little to friction as hard as the track presses on
// them, the air holds it back, the chain carries it up and the brakes stop it. What you feel in the front seat is the
// track's push: its acceleration less gravity, along the seat's own up, side and forward.
//
// Numbers are sourced where a source is named, else marked typical or an estimate:
// - a chain lift at about 2 m/s (chain lifts run about 1–3 m/s: a wooden coaster's about 2, typical; a patent for chain
//   drives gives 1–1.4 m/s for early-1980s rides and over 3 m/s for newer);
// - what riders bear: commonly cited design limits of about +6 g down into the seat at most, −1.5 to −2 g out of it and
//   ±1.5 g sideways (ASTM F2291 §7.1 sets them by how long they last and how riders are held; its tables were not read
//   here); this track is laid to stay within +5, −1.5 and ±1.5 g;
// - a train of six cars, 2.2 m apart, about 5.4 t with 24 riders (an estimate: 600 kg a car and 75 kg a rider);
// - its wheels' friction about 1.5 % of the force on them (an estimate for polyurethane wheels on steel tube); its air
//   drag C_d A about 2.5 m² (an estimate for a train of riders, mostly the front car's);
// - brakes that slow it at about 0.5 g (typical of magnetic brake runs).

export type V3 = [number, number, number];
export type Kind = 'brake' | 'station' | 'tyres' | 'lift' | 'free';
export const COASTER = { chain: 2.0, tyres: 2.0, mass: 5400, cars: 6, gap: 2.2, mu: 0.015, CdA: 2.5, rho: 1.225, brake: 4.9, brakeTo: 2.5, dwell: 6, gauge: 1.1 } as const;
export const LIMITS = { up: 5, down: -1.5, side: 1.5 } as const;

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** v turned about a unit axis by an angle (Rodrigues). */
const rot = (v: V3, k: V3, a: number): V3 => { const c = Math.cos(a), s = Math.sin(a); return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c))); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export interface Track { p: V3[]; t: V3[]; u: V3[]; c: V3[]; s: number[]; kind: Kind[]; length: number; ds: number; top: number; stop: number; piece: string[]; volcano: { at: V3; crater: number } | null }

/** The track laid piece by piece: its centre line, its direction, its up (banked where it turns), the bend's curvature. */
class Layer {
  p: V3 = [0, 1, 0]; t: V3 = [1, 0, 0]; u0: V3 = [0, 1, 0]; bank = 0; kind: Kind = 'brake'; piece = 'brakes'; side = { by: 0, over: 1, gone: 0 };
  out: { p: V3; u: V3; kind: Kind; piece: string }[] = [];
  private step(ds: number, turn?: { axis: V3; da: number }, bankTo?: number) {
    if (turn) { this.t = rot(this.t, turn.axis, turn.da / 2); this.u0 = rot(this.u0, turn.axis, turn.da / 2); }
    this.p = add(this.p, mul(this.t, ds));
    if (this.side.by && this.side.gone < this.side.over) { const S = this.side, r = norm(cross(this.t, this.u0)), k = (S.by * Math.PI) / (2 * S.over) * Math.sin((Math.PI * (S.gone + ds / 2)) / S.over); this.p = add(this.p, mul(r, k * ds)); S.gone += ds; }
    if (turn) { this.t = rot(this.t, turn.axis, turn.da / 2); this.u0 = rot(this.u0, turn.axis, turn.da / 2); }
    if (bankTo !== undefined) this.bank = bankTo;
    this.out.push({ p: this.p, u: rot(this.u0, this.t, this.bank), kind: this.kind, piece: this.piece });
  }
  as(kind: Kind, piece: string) { this.kind = kind; this.piece = piece; return this; }
  straight(L: number, ds = 0.5) { for (let d = 0; d < L; d += ds) this.step(Math.min(ds, L - d)); return this; }
  /** straight on until the centre line is above (or below) a height */
  until(y: number, ds = 0.5) { const up = this.t[1] > 0; for (let i = 0; i < 4000 && (up ? this.p[1] < y : this.p[1] > y); i++) this.step(ds); return this; }
  /** an arc in the track's own vertical plane: + noses up, − down; R its radius (m) */
  pitch(R: number, deg: number, ds = 0.5) { const a = (deg * Math.PI) / 180, n = Math.max(1, Math.ceil((Math.abs(a) * R) / ds)); for (let i = 0; i < n; i++) this.step((Math.abs(a) * R) / n, { axis: norm(cross(this.t, this.u0)), da: a / n }); return this; }
  /** a level turn: + to the right, R its tightest radius. Its curvature eases in over its first quarter and out over its
   *  last (a transition, as real track has: no sudden sideways jerk), and at every point it is banked for the speed v it
   *  is taken at, tan φ = v² κ / g, so what you feel stays down through the seat */
  yaw(R: number, deg: number, v: number, g = 9.80665, ds = 0.5) {
    const a = (deg * Math.PI) / 180, arc = (Math.abs(a) * R) / 0.75, n = Math.max(4, Math.ceil(arc / ds)), h = arc / n;
    const e = Array.from({ length: n }, (_, i) => { const f = (i + 0.5) / n; return f < 0.25 ? f / 0.25 : f > 0.75 ? (1 - f) / 0.25 : 1; }), sum = e.reduce((x, y) => x + y, 0);
    for (let i = 0; i < n; i++) { const da = (a * e[i]!) / sum, k = Math.abs(da) / h; this.step(h, { axis: this.u0, da: -da }, Math.sign(a) * Math.min((80 * Math.PI) / 180, Math.atan((v * v * k) / g))); }
    this.bank = 0; return this;
  }
  /** straight on (level) until its x is past a value, going −x */
  untilX(x: number, ds = 0.5) { for (let i = 0; i < 4000 && this.p[0] > x; i++) this.step(ds); return this; }
  /** move sideways by so much over the next so many metres, easing in and out (a loop must come out beside where it went
   *  in; eased, the sideways shift asks almost nothing of the riders) */
  drift(m: number, over: number) { this.side = { by: m, over, gone: 0 }; return this; }
}

/** The track: laid, then laid again with each turn banked for the speed the train really takes it at (found by running
 *  the train over the first laying), then measured every 0.5 m. A volcano, if asked, stands over the helix: the train
 *  runs round inside its crater. */
const made = new Map<string, Track>();
export function makeCoaster(o: { volcano?: boolean; g?: number } = {}): Track {
  const key = `${!!o.volcano}|${o.g ?? 9.80665}`, kept = made.get(key); if (kept) return kept; // the same asked twice is the same track
  const g = o.g ?? 9.80665;
  let tr = measure(...lay({ helix: 22, home: 14 }, g), o.volcano ?? false);
  const r = newRide(tr), seen: Record<string, number[]> = {};
  for (let i = 0; i < 200 * 300 && r.rides < 1; i++) { stepRide(r, tr, 0.005, g); if (r.phase === 'running') (seen[at(tr, r.s).piece] ??= []).push(r.v); }
  const mean = (k: string, d: number) => (seen[k]?.length ? seen[k]!.reduce((x, y) => x + y, 0) / seen[k]!.length : d);
  tr = measure(...lay({ helix: mean('the helix', 22), home: mean('the turn home', 14) }, g), o.volcano ?? false);
  made.set(key, tr); return tr;
}
type Raw = { p: V3; u: V3; kind: Kind; piece: string }[];
function lay(v: { helix: number; home: number }, g: number): [Raw, number] {
  const L = new Layer(); let top = 40;
  L.as('brake', 'brakes').straight(36).as('station', 'station').straight(28).as('tyres', 'tyres').straight(8);
  L.as('lift', 'the chain lift').pitch(18, 40).until(top - 16 * (1 - Math.cos((40 * Math.PI) / 180)));
  top = L.p[1] + 16 * (1 - Math.cos((40 * Math.PI) / 180));
  // the chain runs on over the top to level (a train must be over the crest before it is let go, or it rolls back)
  L.as('lift', 'the crest').pitch(16, -40).as('free', 'the crest').pitch(16, -62);
  const pull = 26 * (1 - Math.cos((62 * Math.PI) / 180));
  L.as('free', 'the first drop').until(2 + pull).pitch(26, 62).straight(12);
  // the teardrop loop: wide at the bottom, tight at the top, coming out 5.5 m to the side of where it went in
  L.as('free', 'the loop').drift(5.5, Math.PI * (2 * 24 * (60 / 180) + 2 * 14 * (45 / 180) + 8 * (150 / 180)));
  L.pitch(24, 60).pitch(14, 45).pitch(8, 150).pitch(14, 45).pitch(24, 60).straight(15);
  L.as('free', 'the camelback').pitch(30, 32).straight(10).pitch(24, -64).straight(10).pitch(30, 32).straight(12);
  L.as('free', 'the helix').yaw(20, 180, v.helix, g).straight(12);
  // home: three low hills (a last float over each), then a turn back round behind the station, sized to come out in
  // line with it, and a short easing curve onto the brakes
  L.as('free', 'the return');
  for (let k = 0; k < 3; k++) L.pitch(40, 15).straight(6).pitch(40, -30).straight(6).pitch(40, 15).straight(16);
  L.untilX(-30);
  const dry = new Layer(); dry.yaw(1, 180, 0); const across = Math.abs(dry.p[2]), R = Math.max(10, L.p[2] / across);
  L.as('free', 'the turn home').yaw(R, 180, v.home, g).straight(4);
  const P0 = L.p, T0 = L.t, P1: V3 = [0, 1, 0], T1: V3 = [1, 0, 0], m = Math.hypot(...sub(P1, P0));
  for (let i = 1; i < 400; i++) {
    const s = i / 400, h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
    L.out.push({ p: add(add(mul(P0, h00), mul(T0, m * h10)), add(mul(P1, h01), mul(T1, m * h11))), u: [0, 1, 0], kind: 'brake', piece: 'brakes' });
  }
  return [L.out, top];
}

/** Resampled every 0.5 m along its length; its direction and the curvature of its bend found from the points
 *  themselves (so what the train feels is what was laid), its up kept square to its direction. */
function measure(raw: Raw, top: number, volcano: boolean): Track {
  const ds = 0.5, cum: number[] = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1]! + Math.hypot(...sub(raw[i]!.p, raw[i - 1]!.p)));
  const total = cum[cum.length - 1]! + Math.hypot(...sub(raw[0]!.p, raw[raw.length - 1]!.p)), n = Math.floor(total / ds);
  const p: V3[] = [], u0: V3[] = [], kind: Kind[] = [], piece: string[] = []; let j = 0;
  for (let i = 0; i < n; i++) {
    const want = i * ds; while (j < raw.length - 2 && cum[j + 1]! < want) j++;
    const k = Math.min(1, Math.max(0, (want - cum[j]!) / Math.max(1e-9, cum[j + 1]! - cum[j]!)));
    p.push(lerp3(raw[j]!.p, raw[j + 1]!.p, k)); u0.push(lerp3(raw[j]!.u, raw[j + 1]!.u, k)); kind.push(raw[j]!.kind); piece.push(raw[j]!.piece);
  }
  // the points a little smoothed (a three-point average, twice) so that where one arc meets the next the bend changes
  // over a metre or two, as a real track's transitions do, not at a point
  let q = p;
  for (let pass = 0; pass < 2; pass++) q = q.map((_, i) => mul(add(add(q[(i - 1 + n) % n]!, q[i]!), q[(i + 1) % n]!), 1 / 3));
  const t = q.map((_, i) => norm(sub(q[(i + 1) % n]!, q[(i - 1 + n) % n]!)));
  const c = t.map((_, i) => mul(sub(t[(i + 1) % n]!, t[(i - 1 + n) % n]!), 1 / (2 * ds)));
  const u = u0.map((x, i) => norm(sub(x, mul(t[i]!, dot(x, t[i]!)))));
  const stop = kind.lastIndexOf('station') * ds;
    // the volcano stands over the helix: its middle the helix's, its crater wide enough to clear it by 10 m
  const hx = q.filter((_, i) => piece[i] === 'the helix'), mid: V3 = hx.length ? [hx.reduce((a, x) => a + x[0], 0) / hx.length, 0, hx.reduce((a, x) => a + x[2], 0) / hx.length] : [0, 0, 0];
  const reach = Math.max(0, ...hx.map((x) => Math.hypot(x[0] - mid[0], x[2] - mid[2])));
  return { p: q, t, u, c, s: q.map((_, i) => i * ds), kind, length: n * ds, ds, top, stop, piece, volcano: volcano && hx.length ? { at: mid, crater: reach + 10 } : null };
}

/** What is at a point along the track, between its samples. */
export function at(tr: Track, s: number): { p: V3; t: V3; u: V3; c: V3; kind: Kind; piece: string } {
  const n = tr.p.length, x = (((s % tr.length) + tr.length) % tr.length) / tr.ds, i = Math.floor(x) % n, j = (i + 1) % n, k = x - Math.floor(x);
  return { p: lerp3(tr.p[i]!, tr.p[j]!, k), t: norm(lerp3(tr.t[i]!, tr.t[j]!, k)), u: norm(lerp3(tr.u[i]!, tr.u[j]!, k)), c: lerp3(tr.c[i]!, tr.c[j]!, k), kind: tr.kind[i]!, piece: tr.piece[i]! };
}

// ---- the train ----
export interface Ride {
  s: number; v: number; a: number; phase: 'waiting' | 'running'; dwell: number; t: number; rides: number; auto: boolean;
  /** felt in the front seat, in g: down into the seat (+), sideways (+ to the right), forwards (+ pushed back) */ g: { up: number; side: number; fwd: number };
  stats: { vMax: number; upMax: number; upMin: number; sideMax: number; air: number; time: number; at: { upMax: string; upMin: string; vMax: string }; /** upside down at the loop's top: the speed, what pressed you into the seat, how far over the seat was */ top: { v: number; up: number; uy: number } };
  last: Ride['stats'] | null;
}
const blank = (): Ride['stats'] => ({ vMax: 0, upMax: 0, upMin: 0, sideMax: 0, air: 0, time: 0, at: { upMax: '', upMin: '', vMax: '' }, top: { v: 0, up: 0, uy: 1 } });
export function newRide(tr: Track): Ride { return { s: tr.stop, v: 0, a: 0, phase: 'waiting', dwell: COASTER.dwell, t: 0, rides: 0, auto: true, g: { up: 1, side: 0, fwd: 0 }, stats: blank(), last: null }; }

/** One step of the train (dt s). */
export function stepRide(r: Ride, tr: Track, dt: number, g = 9.80665): void {
  const C = COASTER, front = at(tr, r.s);
  if (r.phase === 'waiting') {
    r.v = 0; r.a = 0; r.g = { up: 1, side: 0, fwd: 0 }; r.dwell -= dt;
    if (r.dwell <= 0 && r.auto) { r.phase = 'running'; r.stats = blank(); r.v = 0.3; }
    return;
  }
  // gravity along the track under each car, and the push of the track on each (what its wheels' friction is a part of)
  let grav = 0, press = 0;
  for (let k = 0; k < C.cars; k++) {
    const q = at(tr, r.s - k * C.gap), gp: V3 = [-q.t[0] * -g * q.t[1], -g - q.t[1] * -g * q.t[1], -q.t[2] * -g * q.t[1]];
    grav += -g * q.t[1]; press += Math.hypot(...sub(mul(q.c, r.v * r.v), gp));
  }
  grav /= C.cars; press /= C.cars;
  const drag = (0.5 * C.rho * C.CdA * r.v * Math.abs(r.v)) / C.mass, fric = C.mu * press * Math.sign(r.v);
  let a = grav - fric - drag;
  const kinds = Array.from({ length: C.cars }, (_, k) => at(tr, r.s - k * C.gap).kind);
  if (kinds.includes('lift') && r.v <= C.chain) { r.v = C.chain; a = 0; } // the chain's dogs hold it at the chain's speed
  else if ((kinds.includes('tyres') || (front.kind === 'station' && r.t < 10)) && r.v < C.tyres) a = Math.max(a, 1.5); // drive tyres, the station's too, push it out
  if (front.kind === 'brake') { if (r.v > C.brakeTo) a -= C.brake; else a = Math.max(a, 1); } // magnetic brakes, then kicker tyres carry it in at that speed
  if (front.kind === 'station' && r.t > 10) { // coming home (a train just sent off is in the station too)
    const left = tr.stop - r.s;
    if (left > 0 && r.v > 0.05) a = Math.min(a, -(r.v * r.v) / (2 * Math.max(0.3, left)));
    if (left <= 0.05 || r.v <= 0.05) { r.v = 0; r.s = tr.stop; r.phase = 'waiting'; r.dwell = C.dwell; r.rides++; r.stats.time = r.t; r.last = { ...r.stats, at: { ...r.stats.at }, top: { ...r.stats.top } }; r.t = 0; return; }
  }
  r.a = a; r.v += a * dt; r.s += r.v * dt; r.t += dt;
  if (r.s >= tr.length) r.s -= tr.length;
  // what the front seat feels: the train's acceleration (along the track, and towards the bend's centre) less gravity
  const f: V3 = add(add(mul(front.t, a), mul(front.c, r.v * r.v)), [0, g, 0]), right = cross(front.t, front.u);
  r.g = { up: dot(f, front.u) / g, side: dot(f, right) / g, fwd: -dot(f, front.t) / g };
  const S = r.stats;
  if (r.v > S.vMax) { S.vMax = r.v; S.at.vMax = front.piece; }
  if (front.kind === 'free') {
    if (r.g.up > S.upMax) { S.upMax = r.g.up; S.at.upMax = front.piece; }
    if (r.g.up < S.upMin) { S.upMin = r.g.up; S.at.upMin = front.piece; }
    S.sideMax = Math.max(S.sideMax, Math.abs(r.g.side)); if (r.g.up < 0) S.air += dt;
    if (front.u[1] < S.top.uy) S.top = { v: r.v, up: r.g.up, uy: front.u[1] };
  }
}
/** The train run for a frame's time in 5 ms steps. */
export function runRide(r: Ride, tr: Track, dt: number, g = 9.80665): void { const n = Math.max(1, Math.ceil(Math.min(dt, 0.1) / 0.005)), h = Math.min(dt, 0.1) / n; for (let i = 0; i < n; i++) stepRide(r, tr, h, g); }

/** The track's facts said: its length, its lift's height, its first drop. */
export function sayCoaster(tr: Track): string {
  const drop = tr.top - Math.min(...tr.p.filter((_, i) => tr.piece[i] === 'the first drop').map((x) => x[1]));
  return `a steel coaster ${Math.round(tr.length)} m long: a chain lift to ${Math.round(tr.top)} m at ${COASTER.chain} m/s, a ${Math.round(drop)} m first drop at 62°, a teardrop loop, a camelback hill, a banked helix, three hills home${tr.volcano ? ', the helix inside a volcano' : ''}`;
}
