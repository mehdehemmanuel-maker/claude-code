// Bar games by real physics. Pool on a 9-foot table as the WPA has it: its bed 2.54 by 1.27 m, 0.76 m up, balls 57.15 mm
// across and 170 g, the cushions' noses at about 63.5 % of a ball's height, the pockets' mouths 115 mm at the corners and
// 128 mm at the sides; a ball rebounds from another with about 0.93 of its speed and from a cushion with about 0.8, and the
// cloth holds it back with about 1 % of its weight as it rolls (typical: so a ball sent at 1.5 m/s rolls about 11 m). And
// darts: 22 g, let go at about 6 m/s from the throw line (typical), falling as anything thrown does, scored where they
// land by the board's own rings (src/nexus/view/place3d.ts).

import type { Jolt } from '../substrate/realize';

// ---- darts: the board's own figures and what a dart scores, which are the game's rules and not a drawing of it
// (src/nexus/view/place3d.ts draws the board from these) ------------------------------------------------------

/** A dartboard as the WDF has it: 451 mm across, the bull 12.7 mm and the outer bull 31.8 mm across, the treble ring 8 mm
 *  wide with its outside 107 mm from the middle, the double ring's outside 170 mm; twenty numbered segments, 20 at the top.
 *  Hung with the bull 1.73 m up. */
export const DARTBOARD = { r: 0.2255, bull: 0.00635, outerBull: 0.0159, trebleOut: 0.107, doubleOut: 0.17, ring: 0.008, height: 1.73, line: 2.37, order: [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5] };
/** What a dart scores where it sticks, by the board's rings and segments (x right, y up from the bull, metres). */
export function dartScore(x: number, y: number): { score: number; says: string } {
  const D = DARTBOARD, r = Math.hypot(x, y);
  if (r <= D.bull) return { score: 50, says: 'bull, 50' }; if (r <= D.outerBull) return { score: 25, says: 'outer bull, 25' }; if (r > D.doubleOut) return { score: 0, says: 'off the board' };
  const a = ((90 - Math.atan2(y, x) * 180 / Math.PI) + 9 + 360) % 360, n = D.order[Math.floor(a / 18) % 20]!;
  if (r > D.doubleOut - D.ring) return { score: 2 * n, says: `double ${n}, ${2 * n}` }; if (r > D.trebleOut - D.ring && r <= D.trebleOut) return { score: 3 * n, says: `treble ${n}, ${3 * n}` };
  return { score: n, says: String(n) };
}


export type V3 = [number, number, number];
export const POOL = { L: 2.54, W: 1.27, top: 0.76, r: 0.028575, m: 0.17, eBall: 0.93, eCushion: 0.8, roll: 0.01, slide: 0.2, nose: 0.635, corner: 0.115, side: 0.128 } as const;

/** Where the balls start: the fifteen racked in a triangle, its apex on the foot spot (a quarter of the length from the
 *  foot end), the cue ball on the head string. Table frame: x along its length, z across, y up from the floor. */
export function rack(): { n: number; at: V3 }[] {
  const r = POOL.r, out: { n: number; at: V3 }[] = [{ n: 0, at: [-POOL.L / 4, POOL.top + r, 0] }]; let k = 1;
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) out.push({ n: k++, at: [POOL.L / 4 + row * r * Math.sqrt(3), POOL.top + r, (i - row / 2) * 2 * r] });
  return out;
}
/** The six pockets' holes, table frame: a corner's behind the bed's corner (about 20 mm out along its diagonal), a side's
 *  behind the rail (about 30 mm out); a ball whose middle passes over the hole drops. */
export const POCKETS: [number, number][] = [[-POOL.L / 2 - 0.014, -POOL.W / 2 - 0.014], [0, -POOL.W / 2 - 0.03], [POOL.L / 2 + 0.014, -POOL.W / 2 - 0.014], [-POOL.L / 2 - 0.014, POOL.W / 2 + 0.014], [0, POOL.W / 2 + 0.03], [POOL.L / 2 + 0.014, POOL.W / 2 + 0.014]];

/** A pool table's balls in their own physics world, at 240 steps a second, each ball cast along its path (so a fast one
 *  does not pass through a cushion), the cloth's rolling resistance a steady force against its motion. */
export class Pool {
  readonly jolt: InstanceType<Jolt['JoltInterface']>; private ps: InstanceType<Jolt['PhysicsSystem']>; private bi: InstanceType<Jolt['BodyInterface']>;
  balls: { n: number; body: InstanceType<Jolt['Body']> | null; potted: boolean; was?: [number, number]; slideTo?: number }[] = []; private acc = 0; readonly hz = 240; potted: number[] = []; shots = 0;
  constructor(readonly J: Jolt, readonly g = 9.80665, o: { rack?: boolean } = {}) {
    const s = new J.JoltSettings(), pairs = new J.ObjectLayerPairFilterTable(2); pairs.EnableCollision(0, 1); pairs.EnableCollision(1, 1);
    const bp = new J.BroadPhaseLayerInterfaceTable(2, 2); bp.MapObjectToBroadPhaseLayer(0, new J.BroadPhaseLayer(0)); bp.MapObjectToBroadPhaseLayer(1, new J.BroadPhaseLayer(1));
    s.mObjectLayerPairFilter = pairs; s.mBroadPhaseLayerInterface = bp; s.mObjectVsBroadPhaseLayerFilter = new J.ObjectVsBroadPhaseLayerFilterTable(bp, 2, pairs, 2);
    this.jolt = new J.JoltInterface(s); J.destroy(s); this.ps = this.jolt.GetPhysicsSystem(); this.bi = this.ps.GetBodyInterface(); this.ps.SetGravity(new J.Vec3(0, -g, 0));
    const box = (half: V3, at: V3, e: number, f: number) => { const ss = new J.BoxShapeSettings(new J.Vec3(...half), 0.002), sh = ss.Create().Get(); J.destroy(ss); const cs = new J.BodyCreationSettings(sh, new J.RVec3(...at), new J.Quat(0, 0, 0, 1), J.EMotionType_Static, 0); cs.mRestitution = e; cs.mFriction = f; const b = this.bi.CreateBody(cs); J.destroy(cs); this.bi.AddBody(b.GetID(), J.EActivation_DontActivate); };
    const { L, W, top, r, nose, corner, side } = POOL, ch = r * 2 * nose;
    box([L / 2 + 0.1, 0.02, W / 2 + 0.1], [0, top - 0.02, 0], 0.5, 0.2); // the bed (slate under cloth)
    // the cushions, cut back at the pockets' mouths
    const cw = 0.05, segX = (L / 2 - corner / Math.SQRT2 - side / 2) / 2;
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) box([segX, ch / 2 + 0.002, cw / 2], [sx * (side / 2 + segX), top + ch / 2, sz * (W / 2 + cw / 2)], POOL.eCushion, 0.2);
    for (const sx of [-1, 1]) box([cw / 2, ch / 2 + 0.002, W / 2 - corner / Math.SQRT2], [sx * (L / 2 + cw / 2), top + ch / 2, 0], POOL.eCushion, 0.2);
    for (const b of o.rack === false ? [{ n: 0, at: [-POOL.L / 4, POOL.top + POOL.r, 0] as V3 }] : rack()) this.balls.push({ n: b.n, body: this.ball(b.at), potted: false });
  }
  private ball(at: V3): InstanceType<Jolt['Body']> {
    const J = this.J, ss = new J.SphereShapeSettings(POOL.r), sh = ss.Create().Get(); J.destroy(ss);
    const cs = new J.BodyCreationSettings(sh, new J.RVec3(...at), new J.Quat(0, 0, 0, 1), J.EMotionType_Dynamic, 1); cs.mRestitution = POOL.eBall; cs.mFriction = 0.06; cs.mLinearDamping = 0; cs.mAngularDamping = 0;
    // a ball stays on the bed: it moves across it and turns, never up or down (so it cannot sink into the cloth); the cloth's
    // hold on it is the rolling resistance below, and its spin (follow, draw, side) is not modelled
    cs.mAllowedDOFs = J.EAllowedDOFs_TranslationX | J.EAllowedDOFs_TranslationZ | J.EAllowedDOFs_RotationY;
    cs.mMotionQuality = J.EMotionQuality_LinearCast; cs.mOverrideMassProperties = J.EOverrideMassProperties_CalculateInertia; cs.mMassPropertiesOverride.mMass = POOL.m;
    const b = this.bi.CreateBody(cs); J.destroy(cs); this.bi.AddBody(b.GetID(), J.EActivation_Activate); return b;
  }
  /** Where each ball is (table frame), and whether it is moving. */
  where(): { n: number; at: V3; moving: boolean; potted: boolean }[] {
    return this.balls.map((b) => { if (!b.body) return { n: b.n, at: [0, -1, 0] as V3, moving: false, potted: true }; const p = b.body.GetPosition(), v = b.body.GetLinearVelocity(); return { n: b.n, at: [p.GetX(), p.GetY(), p.GetZ()] as V3, moving: Math.hypot(v.GetX(), v.GetZ()) > 0.005, potted: false }; });
  }
  moving(): boolean { return this.where().some((b) => b.moving); }
  /** The cue ball struck: sent off at so many m/s along a heading (radians from the table's length). Where it is struck
   *  (follow, draw, side) is not modelled: every ball goes as a rolling one does. */
  shoot(heading: number, speed: number, spin: 'roll' | 'stun' = 'roll'): string {
    const c = this.balls.find((b) => b.n === 0); if (!c?.body) return 'the cue ball is down: say "rack" to set the balls again';
    const vx = Math.cos(heading) * speed, vz = Math.sin(heading) * speed;
    void spin; this.bi.SetLinearAndAngularVelocity(c.body.GetID(), new this.J.Vec3(vx, 0, vz), new this.J.Vec3(0, 0, 0)); this.bi.ActivateBody(c.body.GetID()); this.shots++;
    return `the cue ball off at ${speed.toFixed(1)} m/s`;
  }
  /** The heading from the cue ball to a ball, to aim at it. */
  aimAt(n: number): number | null { const w = this.where(), c = w.find((b) => b.n === 0), t = w.find((b) => b.n === n); if (!c || !t || c.potted || t.potted) return null; return Math.atan2(t.at[2] - c.at[2], t.at[0] - c.at[0]); }
  step(dt: number): number[] {
    this.acc = Math.min(this.acc + dt, 0.1); const h = 1 / this.hz, dropped: number[] = [];
    while (this.acc >= h) {
      for (const b of this.balls) {
        if (!b.body) continue;
        const v0 = b.body.GetLinearVelocity(); let vx = v0.GetX(), vz = v0.GetZ(); const pos = b.body.GetPosition(), px = pos.GetX(), pz = pos.GetZ(), was = b.was ?? [0, 0];
        // off a cushion: Jolt takes the larger of two restitutions, so a ball (0.93) would leave a cushion at 0.93; it
        // leaves at the cushion's own (about 0.8): its speed away from the rail 0.8 of what it came in at
        const near = (d: number) => d < POOL.r + 0.004;
        if (near(POOL.L / 2 - Math.abs(px)) && Math.sign(vx) !== Math.sign(was[0]) && Math.sign(was[0]) === Math.sign(px) && Math.abs(was[0]) > 0.02) vx = -was[0] * POOL.eCushion;
        if (near(POOL.W / 2 - Math.abs(pz)) && Math.sign(vz) !== Math.sign(was[1]) && Math.sign(was[1]) === Math.sign(pz) && Math.abs(was[1]) > 0.02) vz = -was[1] * POOL.eCushion;
        // the cloth. A ball just struck (by the cue, another ball or a cushion) slides, held back by sliding friction (about
        // 0.2, typical), until it rolls at 5/7 of the speed it was struck to (a centre-struck ball's natural roll, the
        // textbook result: Alciatore, The Illustrated Principles of Pool and Billiards); rolling, it is held back by the
        // cloth's rolling resistance (about 0.01) until it stops
        const sp = Math.hypot(vx, vz);
        if (Math.hypot(vx - was[0], vz - was[1]) > 0.05 && sp > 0.05) b.slideTo = (5 / 7) * sp;
        let nv: number;
        if (b.slideTo && sp > b.slideTo) { nv = Math.max(b.slideTo, sp - POOL.slide * this.g * h); if (nv <= b.slideTo) b.slideTo = 0; }
        else { b.slideTo = 0; nv = Math.max(0, sp - POOL.roll * this.g * h); }
        const k = sp > 1e-6 ? nv / sp : 0; vx *= k; vz *= k; this.bi.SetLinearVelocity(b.body.GetID(), new this.J.Vec3(vx, 0, vz)); b.was = [vx, vz];
        const p = b.body.GetPosition(), x = p.GetX(), z = p.GetZ(), y = p.GetY();
        const inPocket = POCKETS.some(([px, pz], i) => Math.hypot(x - px, z - pz) < (i === 1 || i === 4 ? POOL.side : POOL.corner) * 0.5);
        if (inPocket || y < POOL.top - 0.05 || Math.abs(x) > POOL.L / 2 + 0.2 || Math.abs(z) > POOL.W / 2 + 0.2) { this.bi.RemoveBody(b.body.GetID()); this.bi.DestroyBody(b.body.GetID()); b.body = null; b.potted = true; this.potted.push(b.n); dropped.push(b.n); }
      }
      this.jolt.Step(h, 1); this.acc -= h;
    }
    return dropped;
  }
  /** The balls set again where they start. */
  rerack(): void { for (const b of this.balls) if (b.body) { this.bi.RemoveBody(b.body.GetID()); this.bi.DestroyBody(b.body.GetID()); } this.balls = rack().map((b) => ({ n: b.n, body: this.ball(b.at), potted: false })); this.potted = []; this.shots = 0; }
  dispose(): void { this.J.destroy(this.jolt); }
}

/** A dart's flight: from where it is let go at its velocity, falling at g, to the board's face (the plane at x = the
 *  board's, the dart going +x). Where it lands on the board (right, up from the bull) and when; null if it falls short. */
export function dartFlight(from: V3, v: V3, board: { x: number; y: number; z: number }, g: number): { hit: [number, number]; t: number } | null {
  if (v[0] <= 0) return null; const t = (board.x - from[0]) / v[0];
  const y = from[1] + v[1] * t - 0.5 * g * t * t, z = from[2] + v[2] * t; if (y < 0) return null;
  return { hit: [z - board.z, y - board.y], t }; // facing +x, your right is +z
}
/** The velocity to let a dart go at, at so many m/s, to land on a point of the board: the lower of the two arcs. */
export function aimDart(from: V3, to: V3, speed: number, g: number): V3 | null {
  const dx = to[0] - from[0], dz = to[2] - from[2], d = Math.hypot(dx, dz), dy = to[1] - from[1], v2 = speed * speed, disc = v2 * v2 - g * (g * d * d + 2 * dy * v2);
  if (disc < 0) return null; const th = Math.atan((v2 - Math.sqrt(disc)) / (g * d)), h = speed * Math.cos(th);
  return [(dx / d) * h, speed * Math.sin(th), (dz / d) * h];
}
/** Where on the board each named target is (right, up from the bull, m): "bull", "treble 20", "double 16", "20". */
export function targetOn(name: string): [number, number] | null {
  const t = name.toLowerCase().trim(), D = DARTBOARD;
  if (/^(bull|bullseye|bull's eye|the bull)$/.test(t)) return [0, 0]; if (/outer bull|25/.test(t) && !/\d{2,}/.test(t.replace('25', ''))) return [0, (D.bull + D.outerBull) / 2];
  const m = /^(?:(treble|triple|double|single)\s+)?(\d{1,2})$/.exec(t); if (!m) return null; const n = Number(m[2]), i = D.order.indexOf(n); if (i < 0) return null;
  const r = m[1] === 'treble' || m[1] === 'triple' ? D.trebleOut - D.ring / 2 : m[1] === 'double' ? D.doubleOut - D.ring / 2 : (D.outerBull + D.trebleOut - D.ring) / 2, a = Math.PI / 2 - (i * 18 * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
/** A dart thrown at a target from the throw line, as a person throws: let go 1.6 m up at about 6 m/s, aimed, with the
 *  spread of a thrower's hand (its angle off by about 0.6° and its speed by about 2 %, one standard deviation; an estimate
 *  for a casual player); where it lands and what it scores. */
export function throwDart(target: [number, number], r: () => number, g = 9.80665, skill = 1): { hit: [number, number] | null; score: number; says: string } {
  const board = { x: DARTBOARD.line, y: DARTBOARD.height, z: 0 }, from: V3 = [0, 1.6, 0], to: V3 = [board.x, board.y + target[1], target[0]];
  const v = aimDart(from, to, 6, g); if (!v) return { hit: null, score: 0, says: 'it cannot reach the board at that speed' };
  const gauss = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r()), sa = (0.6 * Math.PI) / 180 / skill, sv = 0.02 / skill;
  const k = 1 + gauss() * sv, up = gauss() * sa, side = gauss() * sa, vel: V3 = [v[0] * k, v[1] * k + up * 6, v[2] * k + side * 6];
  const f = dartFlight(from, vel, board, g); if (!f) return { hit: null, score: 0, says: 'it fell short' };
  const s = dartScore(f.hit[0], f.hit[1]); return { hit: f.hit, score: s.score, says: s.says };
}
