// Table tennis by real physics, against a robot. The ITTF's Laws set the things: a table 2.74 by 1.525 m with its top
// 76 cm up, a net 15.25 cm high, a ball 40 mm across and 2.7 g that bounces to about 23 cm off the table when dropped from
// 30 cm (its restitution off the table, with the air's drag on the way down and up, about 0.9: √(23/30) = 0.88 would be
// in a vacuum). In the air the ball is held back by drag (C_d about 0.5,
// typical of a sphere at its Reynolds numbers, about 10^4–10^5: its terminal speed is then about 8.3 m/s, so a hard hit
// slows fast) and pushed sideways by its spin (the Magnus force, its lift coefficient about half the spin parameter
// rω/v up to about 0.3: an estimate; free-flight measurements find lift dips at low spin, which is not modelled). Off the
// table and off a bat the ball's spin and its speed along the surface trade through friction until it rolls (a hollow
// sphere, I = ⅔ m r²) or the friction runs out. A bat's rubber sends the ball off at about 0.85 of their closing speed
// (an estimate for inverted rubber).
//
// The robot is better than you: it sees the ball's whole flight as soon as it is hit, reaches anywhere at its end, and
// sends the ball back fast with topspin to the corner farthest from where your bat is, its aim off by about 3 cm (an
// estimate of a good robot's spread). You can ask it to be gentler.

export type V3 = [number, number, number];
export const TT = { L: 2.74, W: 1.525, top: 0.76, net: 0.1525, netOver: 0.1525, r: 0.02, m: 0.0027, eTable: 0.9, muTable: 0.25, eBat: 0.85, muBat: 0.9, Cd: 0.5, rho: 1.225, batR: 0.08, g: 9.80665 } as const;
const A = Math.PI * TT.r ** 2;

export interface Ball { p: V3; v: V3; w: V3 }
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

/** The ball's acceleration in flight: gravity, drag against its motion, the Magnus push square to its spin and motion. */
export function accel(b: Ball, g: number = TT.g): V3 {
  const v = len(b.v), k = (0.5 * TT.rho * A) / TT.m;
  const drag = mul(b.v, -k * TT.Cd * v), wn = len(b.w);
  let mag: V3 = [0, 0, 0];
  if (wn > 1e-6 && v > 1e-6) { const S = (TT.r * wn) / v, CL = Math.min(0.3, 0.5 * S); mag = mul(norm(cross(b.w, b.v)), k * CL * v * v); }
  return add(add(drag, mag), [0, -g, 0]);
}
/** The terminal speed of a falling ball (no spin): where drag meets its weight. */
export const terminalSpeed = (g: number = TT.g) => Math.sqrt((2 * TT.m * g) / (TT.rho * TT.Cd * A));

/** A bounce off a surface of normal n (moving at velocity of `surf`): its speed into the surface reversed at e, and its
 *  speed along the surface and its spin traded by friction until the ball rolls (a hollow sphere) or the friction's
 *  impulse, μ times the normal one, runs out. */
export function bounce(b: Ball, n: V3, e: number, mu: number, surf: V3 = [0, 0, 0]): void {
  const vr = sub(b.v, surf), vn = dot(vr, n); if (vn >= 0) return;
  const Jn = -(1 + e) * vn; // per unit mass
  // the contact point's slip: the ball's speed along the surface plus its spin's at the contact (r ω × (−n))
  const vt = sub(vr, mul(n, vn)), slip = add(vt, cross(b.w, mul(n, -TT.r))), s = len(slip);
  let dvt: V3 = [0, 0, 0];
  if (s > 1e-9) {
    // to roll needs the slip gone: for a hollow sphere a tangential impulse J changes slip by J (1 + 3/2) = 2.5 J
    const need = s / 2.5, J = Math.min(need, mu * Jn); dvt = mul(norm(slip), -J);
    // the spin changes by the torque of that impulse: Δω = (r × J) / I, with r = −r n and I/m = ⅔ r²
    b.w = add(b.w, mul(cross(mul(n, -TT.r), dvt), 1 / ((2 / 3) * TT.r * TT.r)));
  }
  b.v = add(add(b.v, mul(n, Jn)), dvt);
}

// ---- a rally ----
export type Who = 'you' | 'robot';
export interface Rally {
  ball: Ball; live: boolean; hitBy: Who | null; bounces: { you: number; robot: number }; served: boolean; server: Who;
  score: { you: number; robot: number }; games: { you: number; robot: number }; said: string[]; t: number;
  robot: { at: V3; skill: number; speed: number; spin: number; wait: number; sent: number; plan: { t: number; p: V3 } | null; tossed: boolean };
}
/** Your end is −x, the robot's +x; the table's top at y = 0.76, its middle at the origin. */
export const sideOf = (x: number): Who => (x < 0 ? 'you' : 'robot');
export function newRally(skill = 1): Rally {
  return { ball: { p: [1.6, 1.05, 0], v: [0, 0, 0], w: [0, 0, 0] }, live: false, hitBy: null, bounces: { you: 0, robot: 0 }, served: false, server: 'robot', score: { you: 0, robot: 0 }, games: { you: 0, robot: 0 }, said: [], t: 0, robot: { at: [1.75, 1.0, 0], skill, speed: 9 + 5 * skill, spin: 40 + 60 * skill, wait: 1.5, sent: 0, plan: null, tossed: false } };
}

/** The ball moved on by dt (a millisecond or so): its flight, and what it meets, the table (a bounce), the net (stopped
 *  dead, nearly), the floor. A midpoint step: the forces change fast on a ball this light. */
export function advance(b: Ball, dt: number, g: number = TT.g): 'table' | 'net' | 'floor' | 'out' | null {
  const was = b.p, a1 = accel(b, g), mid: Ball = { p: add(b.p, mul(b.v, dt / 2)), v: add(b.v, mul(a1, dt / 2)), w: b.w };
  const a2 = accel(mid, g); b.p = add(b.p, mul(mid.v, dt)); b.v = add(b.v, mul(a2, dt)); b.w = mul(b.w, 1 - 0.05 * dt);
  const onTable = Math.abs(b.p[0]) <= TT.L / 2 && Math.abs(b.p[2]) <= TT.W / 2;
  if (onTable && b.p[1] - TT.r <= TT.top && b.v[1] < 0 && was[1] - TT.r >= TT.top - 0.01) { b.p = [b.p[0], TT.top + TT.r, b.p[2]]; bounce(b, [0, 1, 0], TT.eTable, TT.muTable); return 'table'; }
  // the net: a thin wall across the middle 15.25 cm high, its posts 15.25 cm out past the sides
  if (Math.sign(was[0]) !== Math.sign(b.p[0]) && b.p[1] - TT.r < TT.top + TT.net && Math.abs(b.p[2]) < TT.W / 2 + TT.netOver) {
    b.p = [Math.sign(was[0]) * (TT.r + 0.002), b.p[1], b.p[2]]; b.v = [-b.v[0] * 0.15, b.v[1] * 0.5, b.v[2] * 0.5]; b.w = mul(b.w, 0.3); return 'net';
  }
  if (b.p[1] < TT.r) return 'floor';
  if (Math.abs(b.p[0]) > 6 || Math.abs(b.p[2]) > 5) return 'out';
  return null;
}
/** One step of a rally: the ball moved on, and who wins the point when it lands, bounces twice, or falls. */
export function stepBall(R: Rally, dt: number, g: number = TT.g): void {
  if (!R.live) return; const hitWhat = advance(R.ball, dt, g); R.t += dt;
  if (hitWhat === 'table') land(R, sideOf(R.ball.p[0]));
  else if (hitWhat === 'floor' || hitWhat === 'out') end(R, hitWhat === 'floor' ? 'the floor' : 'out');
}
/** A flight ahead, nothing hitting it: its points every few milliseconds, where it bounces, until the floor, a plane, or
 *  a time. */
export function flight(b0: Ball, o: { g?: number; dt?: number; tMax?: number; stop?: (b: Ball) => boolean } = {}): { path: Ball[]; bounces: V3[]; net: boolean } {
  const b: Ball = { p: [...b0.p], v: [...b0.v], w: [...b0.w] }, dt = o.dt ?? 0.002, path: Ball[] = [], bounces: V3[] = []; let net = false;
  for (let t = 0; t < (o.tMax ?? 3); t += dt) {
    const e = advance(b, dt, o.g ?? TT.g); path.push({ p: [...b.p], v: [...b.v], w: [...b.w] });
    if (e === 'table') bounces.push([...b.p]); if (e === 'net') net = true; if (e === 'floor' || e === 'out') break; if (o.stop?.(b)) break;
  }
  return { path, bounces, net };
}
/** The ball lands on a side's half: whether that is fair, a fault, or the second bounce that ends the point. */
function land(R: Rally, side: Who): void {
  R.bounces[side]++;
  const by = R.hitBy!, other: Who = by === 'you' ? 'robot' : 'you';
  // your serve may go straight over the net (a friendly serve: hard to make bounce first on your own side in a headset)
  if (!R.served && by === 'you' && side === other) { R.served = true; return; }
  if (!R.served) { // a serve bounces on the server's half, then the receiver's
    if (side === by && R.bounces[by] === 1) return; if (side === other && R.bounces[by] === 1 && R.bounces[other] === 1) { R.served = true; return; }
    point(R, other, side === by ? `${by === 'you' ? 'your' : "the robot's"} serve bounced twice on its own side` : 'a serve must bounce on its own side first'); return;
  }
  if (side === by) { point(R, other, `${by === 'you' ? 'you' : 'the robot'} hit it onto ${by === 'you' ? 'your' : 'its'} own side`); return; }
  if (R.bounces[other] >= 2) point(R, by, `it bounced twice on ${other === 'you' ? 'your' : "the robot's"} side`);
}
function end(R: Rally, where: string): void {
  const by = R.hitBy!, other: Who = by === 'you' ? 'robot' : 'you';
  if (R.bounces[other] >= 1 && (R.served || R.bounces[by] >= 1)) point(R, by, `${other === 'you' ? 'you' : 'the robot'} didn't return it`);
  else point(R, other, `${by === 'you' ? 'your' : "the robot's"} shot missed the table (${where})`);
}
/** A point won: the score, the serve (two each, then one each from 10–10), the game at 11 by two. */
export function point(R: Rally, to: Who, why: string): void {
  R.live = false; R.score[to]++;
  const { you, robot } = R.score, total = you + robot;
  let line = `Point to ${to === 'you' ? 'you' : 'the robot'}: ${why}. ${you}–${robot}.`;
  if ((you >= 11 || robot >= 11) && Math.abs(you - robot) >= 2) { const w: Who = you > robot ? 'you' : 'robot'; R.games[w]++; line += ` Game to ${w === 'you' ? 'you' : 'the robot'}, ${Math.max(you, robot)}–${Math.min(you, robot)}. Games ${R.games.you}–${R.games.robot}.`; R.score = { you: 0, robot: 0 }; }
  const t2 = R.score.you + R.score.robot;
  R.server = t2 >= 20 ? (t2 % 2 === 0 ? 'robot' : 'you') : Math.floor(t2 / 2) % 2 === 0 ? 'robot' : 'you'; void total;
  R.said.push(line); R.robot.wait = 1.6;
}

/** A bat's hit: its face's normal n and its velocity; the ball sent off at the rubber's restitution, its spin from the
 *  rubber's grip. */
export function hit(R: Rally, who: Who, n: V3, batV: V3): void {
  const b = R.ball; bounce(b, norm(n), TT.eBat, TT.muBat, batV);
  R.hitBy = who; R.bounces = { you: 0, robot: 0 }; R.live = true;
}
/** Put the ball up to serve: in the server's hand, tossed (the robot's: it tosses and serves itself). */
export function serveBall(R: Rally): void {
  const x = R.server === 'you' ? -TT.L / 2 - 0.25 : TT.L / 2 + 0.25;
  R.ball = { p: [x, TT.top + 0.3, R.server === 'you' ? -0.3 : 0.2], v: [0, 2.2, 0], w: [0, 0, 0] }; R.live = true; R.hitBy = R.server; R.bounces = { you: 0, robot: 0 }; R.served = false; R.t = 0;
}

/** A shot's first bounce aimed at a target, from the ball's place at a speed with topspin: its launch angle found by
 *  halving the error, flight by flight (into the net or short: higher; past the end: lower). */
export function aimShot(from: V3, target: V3, speed: number, spin: number, g: number = TT.g): { v: V3; w: V3; lands: V3 } | null {
  const dx = target[0] - from[0], dz = target[2] - from[2], dir = norm([dx, 0, dz]), want = Math.hypot(dx, dz);
  // topspin: the top of the ball turning forwards, about the axis up × the way it goes
  const w = mul(norm(cross([0, 1, 0], dir)), spin * 2 * Math.PI);
  const fly = (el: number) => {
    const v: V3 = [dir[0] * Math.cos(el) * speed, Math.sin(el) * speed, dir[2] * Math.cos(el) * speed];
    const f = flight({ p: from, v, w }, { g, tMax: 2, stop: (b) => b.p[1] < TT.top }), at = f.bounces[0], last = f.path[f.path.length - 1];
    // how far it got along the aim: where it first bounced, or (past the end, or short into the floor) where it ended
    const reach = at ? dot(sub(at, from), dir) : last ? dot(sub(last.p, from), dir) : 0;
    return { v, at, net: f.net, reach: f.net ? -1 : reach };
  };
  // reach rises with the launch angle and then falls: find the low, rising branch where it first passes the aim (a
  // low, fast shot, as players hit), then halve the bracket
  let lo = -0.9, prev = fly(lo), hi = NaN;
  for (let el = lo + 0.05; el <= 1.0; el += 0.05) { const f = fly(el); if (prev.reach < want && f.reach >= want) { lo = el - 0.05; hi = el; break; } prev = f; }
  if (Number.isNaN(hi)) return null;
  for (let k = 0; k < 30; k++) { const el = (lo + hi) / 2; if (fly(el).reach < want) lo = el; else hi = el; }
  const f = fly(hi); if (!f.at || f.net) return null;
  return Math.abs(f.reach - want) < 0.05 ? { v: f.v, w, lands: f.at } : null;
}
/** A serve as the Laws have it: tossed, struck so it bounces first on the server's own half and then, over the net, on
 *  the receiver's: the first bounce aimed near the server's end, the speed the fastest whose second bounce lands deep in
 *  the receiver's half. */
export function serveShot(from: V3, toward: number, spin: number, g: number = TT.g): { v: V3; w: V3; lands: V3 } | null {
  const own = Math.sign(from[0]); let best: { v: V3; w: V3; lands: V3 } | null = null;
  for (let speed = 3; speed <= 9; speed += 0.25) {
    for (const first of [0.95, 0.8, 0.65, 0.5]) {
      const s = aimShot(from, [own * first, TT.top, from[2] + (toward - from[2]) * 0.3], speed, spin, g); if (!s) continue;
      const f = flight({ p: from, v: s.v, w: s.w }, { g, tMax: 2 }), second = f.bounces[1];
      if (f.net || !second || Math.sign(second[0]) === own || Math.abs(second[0]) < 0.35 || Math.abs(second[2]) > TT.W / 2 - 0.05) continue;
      best = { v: s.v, w: s.w, lands: second };
    }
  }
  return best;
}

/** The robot's skill set: how fast it hits, how much topspin, how close to its aim. */
export function setSkill(R: Rally, skill: number): void { const k = Math.max(0.2, Math.min(1.2, skill)); R.robot.skill = k; R.robot.speed = 9 + 5 * k; R.robot.spin = 40 + 60 * k; }

/** The robot, a step (dt s): it serves when it is its serve; when your shot comes it reads the whole flight at once,
 *  picks where to meet it (the top of its bounce, or before the ball passes it), takes its bat there at up to 6 m/s, and
 *  sends it back to the corner farthest from your bat, its aim off by about 3 cm over its skill. */
export function robotStep(R: Rally, dt: number, you: V3, rand: () => number = Math.random, g: number = TT.g): void {
  const B = R.robot, b = R.ball, gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const move = (to: V3) => { const d = sub(to, B.at), l = len(d), step = 6 * dt; B.at = l <= step ? to : add(B.at, mul(d, step / l)); };
  if (!R.live) { B.plan = null; B.tossed = false; move([TT.L / 2 + 0.35, TT.top + 0.3, 0]); if (R.server === 'robot') { B.wait -= dt; if (B.wait <= 0) { serveBall(R); B.tossed = true; } } return; }
  // its serve: struck as the toss falls past 25 cm above the table
  if (B.tossed && R.hitBy === 'robot' && !R.served && b.v[1] < 0 && b.p[1] <= TT.top + 0.25) {
    const sv = serveShot(b.p, -Math.sign(you[2] || 1) * 0.5, 15 + 20 * B.skill, g);
    if (sv) { b.v = sv.v; b.w = sv.w; } B.tossed = false; R.bounces = { you: 0, robot: 0 }; return;
  }
  if (B.tossed) { move(add(b.p, [0.05, 0, 0])); return; }
  // your shot coming: where to meet it
  if (R.hitBy === 'you' && b.v[0] > 0 && !B.plan) {
    const f = flight(b, { g, tMax: 1.5 }); let t = 0, pick: V3 | null = null, bounced = false;
    for (let i = 0; i < f.path.length; i++) {
      const q = f.path[i]!; t += 0.002; if (!bounced && f.bounces.some((x) => Math.abs(x[0] - q.p[0]) < 1e-6 && Math.abs(x[2] - q.p[2]) < 1e-6)) bounced = q.p[0] > 0;
      if (bounced && q.p[0] > 0 && ((q.v[1] <= 0 && q.p[1] > TT.top + 0.08) || q.p[0] > TT.L / 2 + 0.3)) { pick = q.p; break; }
    }
    B.plan = pick ? { t: R.t + t, p: pick } : { t: Infinity, p: [TT.L / 2 + 0.35, TT.top + 0.3, 0] };
  }
  if (B.plan) move(B.plan.p);
  if (B.plan && R.hitBy === 'you' && len(sub(b.p, B.plan.p)) < 0.06 && len(sub(B.at, b.p)) < 0.08) {
    // the better it is, the wider it goes: a corner your bat (at 4 m/s on a screen) may not reach in time
    const target: V3 = [-(0.95 + 0.25 * B.skill) + gauss() * (0.03 / B.skill), TT.top, -Math.sign(you[2] || 1) * Math.min(0.68, 0.35 + 0.3 * B.skill) + gauss() * (0.03 / B.skill)];
    // if it can't make that shot from there (too low and close for so fast a ball, or too far for a slower one), slower,
    // then shorter
    const short: V3 = [target[0] * 0.65, target[1], target[2] * 0.8];
    for (const [speed, to] of [[B.speed, target], [B.speed * 0.8, target], [B.speed * 0.6, target], [B.speed * 0.8, short], [B.speed * 0.6, short]] as [number, V3][]) { const sh = aimShot(b.p, to, speed, B.spin, g); if (sh) { b.v = sh.v; b.w = sh.w; R.hitBy = 'robot'; R.bounces = { you: 0, robot: 0 }; B.sent = speed; break; } }
    B.plan = null;
  }
}
/** Your bat at this moment (its face's middle, its face's normal, its velocity): if the ball is against its face, coming
 *  in, it is hit. */
export function batHit(R: Rally, at: V3, n: V3, batV: V3): boolean {
  if (!R.live || R.hitBy === 'you' && R.served) return false; const b = R.ball, d = sub(b.p, at), side = dot(d, n), nn = side >= 0 ? n : mul(n, -1);
  if (Math.abs(side) > TT.r + 0.012) return false; const across = sub(d, mul(n, dot(d, n))); if (len(across) > TT.batR) return false;
  if (dot(sub(b.v, batV), nn) >= 0) return false; // going away from the face already
  b.p = add(at, add(across, mul(nn, TT.r + 0.012))); hit(R, 'you', nn, batV); if (!R.served && R.server === 'you') { /* a serve struck */ } return true;
}

/** The robot's skill said: how fast and with how much topspin it hits, how close to its aim. */
export const pingSkillSaid = (k: number) => `it hits at ${(9 + 5 * k).toFixed(0)} m/s with ${(40 + 60 * k).toFixed(0)} rev/s of topspin, its aim off by about ${(3 / k).toFixed(0)} cm${k >= 1 ? ' (you asked for one far better than you)' : k < 0.6 ? ' (a gentle one)' : ''}`;

// ---- on a screen: the bat taken to the ball, the swing timed by you ----
/** Where the ball will meet a bat at a side's end: after it bounces on that side, the top of that bounce, or as it
 *  passes the end; for your toss, just under the ball. Null if it is not coming to that side. */
export function meetPoint(R: Rally, side: Who, g: number = TT.g): V3 | null {
  const b = R.ball, s = side === 'you' ? -1 : 1;
  if (!R.live) return null;
  if (R.hitBy === side && !R.served) return [b.p[0] - s * 0.03, Math.min(b.p[1], TT.top + 0.25), b.p[2]]; // the toss
  if (R.hitBy === side || Math.sign(b.v[0]) !== s) return null;
  const f = flight(b, { g, tMax: 1.5 }), first = f.bounces.find((y) => Math.sign(y[0]) === s);
  const i0 = first ? f.path.findIndex((x) => x.p[0] === first[0] && x.p[2] === first[2]) : R.bounces[side] >= 1 ? 0 : -1;
  const q = i0 >= 0 ? f.path.slice(i0).find((x) => x.v[1] <= 0 || s * x.p[0] > TT.L / 2 + 0.1) : undefined;
  return q ? [q.p[0] + s * 0.03, q.p[1], q.p[2]] : null;
}
/** A swing that meets the ball (within 12 cm of the bat's middle while the swing is on): struck back to where you aim,
 *  cleaner and faster the better the timing (best begun 0.12 s before the ball arrives: `left` is the swing's time left). */
export function assistHit(R: Rally, bat: V3, left: number, aim: number, g: number = TT.g, rand: () => number = Math.random): string | null {
  const b = R.ball, ours = (R.hitBy === 'robot' && R.bounces.you >= 1) || (R.hitBy === 'you' && !R.served);
  if (!R.live || !ours || len(sub(b.p, bat)) > 0.12) return null;
  // a swing badly timed sends the ball off its aim: about 25 cm × (1 − how well timed), each way (an estimate)
  const q = Math.max(0.2, 1 - Math.abs(0.25 - left - 0.12) / 0.13), off = () => (rand() - 0.5) * 0.5 * (1 - q), target: V3 = [0.55 + 0.6 * q + off(), TT.top, Math.max(-0.7, Math.min(0.7, aim + off()))];
  for (const speed of [6 + 6 * q, 6, 4.5, 3.5]) { const s = aimShot(b.p, target, speed, 30 + 30 * q, g); if (s) { b.v = s.v; b.w = s.w; R.hitBy = 'you'; R.bounces = { you: 0, robot: 0 }; return `${q > 0.7 ? 'Clean' : q > 0.4 ? 'Good' : 'Scrappy'} — ${speed.toFixed(0)} m/s.`; } }
  return 'Mis-hit.';
}
