// The Meca500, Mecademic's six-axis arm ("the world's smallest, most compact and most precise six-axis industrial robot",
// its maker's words): its figures from its user manual, its kinematics, and the robot itself as its programming manual
// describes it: a controller that takes text commands (ActivateRobot, Home, MoveJoints, MovePose, MoveLin, …), answers
// in its codes ([2002][Homing done.], [1005][The robot is not activated.]), refuses a joint past its limit, and moves
// its joints over time at its joints' speeds. Programs written here run on it exactly as they are written for the real
// one, sent line by line to its port 10000; it is the robot drawn in the room (src/nexus/components.ts, `robotarm`).
//
// Frames are its own: the base's (BRF) z up along joint 1, x forward; poses are {x, y, z} mm and Euler angles {α, β, γ}
// degrees in its mobile XYZ convention (Rx·Ry·Rz), of its flange's frame (FRF), whose z is joint 6's axis, outward.
//
// Its answers: [2000], [2002], [1003], [1005]–[1007], [1011] and [3012] as its programming manual gives them; [2004],
// [2005], [2026] and [2027] typical of its manual's numbering, not checked line by line; where it refuses a pose or a
// line this simulator says so in its own words, marked as such.

export const MECA500 = {
  name: 'Mecademic Meca500', repeatability: 0.005, payload: 0.5, mass: 4.6, reach: 330,
  /** its joints' ranges, degrees (joint 6 ±100 turns) */ limits: [[-175, 175], [-70, 90], [-135, 70], [-170, 170], [-115, 115], [-36000, 36000]] as [number, number][],
  /** its joints' top speeds, °/s, by revision */ speed: { R3: [150, 150, 180, 300, 300, 500], R4: [225, 225, 225, 350, 350, 500] },
  /** its joints' peak torques, N·m (continuous half of these) */ torque: [16.6, 16.6, 16.6, 2.5, 2.5, 1.5],
  power: '24 V DC, up to 5.5 A (from its PS200 module, 90–250 V AC in)', ports: { control: 10000, monitoring: 10001 }, ip: 'IP40', body: 'anodized aluminium alloy',
  src: 'Mecademic, Meca500 user manual (2025.A), technical specifications; programming manual (TCP/IP communication, Basic theory and definitions)',
};
/** Its links, mm: base to shoulder, upper arm, the elbow's offset, forearm, wrist centre to flange (as its user manual's
 *  Figure 18 gives them for its Denavit–Hartenberg parameters; their chain, 135 + √(120² + 38²) + 70, is its 330 mm
 *  reach at the flange from the shoulder). */
export const LINK = { d1: 135, a2: 135, a3: 38, d4: 120, d6: 70 };

type M3 = number[]; type V3 = [number, number, number];
const D = Math.PI / 180;
const Rx = (a: number): M3 => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)];
const Ry = (a: number): M3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const Rz = (a: number): M3 => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1];
const mul = (...ms: M3[]): M3 => ms.reduce((A, B) => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => A[i * 3]! * B[j]! + A[i * 3 + 1]! * B[3 + j]! + A[i * 3 + 2]! * B[6 + j]!)));
const T = (A: M3): M3 => [A[0]!, A[3]!, A[6]!, A[1]!, A[4]!, A[7]!, A[2]!, A[5]!, A[8]!];
const ap = (A: M3, v: V3): V3 => [A[0]! * v[0] + A[1]! * v[1] + A[2]! * v[2], A[3]! * v[0] + A[4]! * v[1] + A[5]! * v[2], A[6]! * v[0] + A[7]! * v[1] + A[8]! * v[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const FLANGE = Ry(Math.PI / 2);

/** A rotation from its mobile XYZ Euler angles, degrees. */
export const fromEuler = (a: number, b: number, c: number): M3 => mul(Rx(a * D), Ry(b * D), Rz(c * D));
/** A rotation's mobile XYZ Euler angles, degrees (at β = ±90°, α taken as 0, as its controller reports the zero pose). */
export function toEuler(R: M3): V3 {
  const sb = Math.max(-1, Math.min(1, R[2]!)), b = Math.asin(sb);
  if (Math.abs(Math.cos(b)) < 1e-9) return [0, b / D, Math.atan2(R[3]!, R[4]!) / D];
  return [Math.atan2(-R[5]!, R[8]!) / D, b / D, Math.atan2(-R[1]!, R[0]!) / D];
}
/** Its flange's pose at joints q (degrees): position mm, its rotation, its wrist centre. */
export function fk(q: number[]): { p: V3; R: M3; wrist: V3; elbow: V3; shoulder: V3 } {
  const [t1, t2, t3, t4, t5, t6] = q.map((x) => x * D) as [number, number, number, number, number, number];
  const A = Rz(t1), B = mul(A, Ry(t2)), C = mul(A, Ry(t2 + t3)), shoulder: V3 = [0, 0, LINK.d1];
  const elbow = add(shoulder, ap(B, [0, 0, LINK.a2])), wrist = add(elbow, ap(C, [LINK.d4, 0, LINK.a3]));
  const R6 = mul(C, Rx(t4), Ry(t5), Rx(t6)), p = add(wrist, ap(R6, [LINK.d6, 0, 0]));
  return { p, R: mul(R6, FLANGE), wrist, elbow, shoulder };
}
/** Its pose at joints q, as its controller gives it: {x, y, z, α, β, γ}. */
export const poseOf = (q: number[]): number[] => { const f = fk(q); return [...f.p, ...toEuler(f.R)]; };
export const inLimits = (q: number[]): number => q.findIndex((x, i) => x < MECA500.limits[i]![0] - 1e-6 || x > MECA500.limits[i]![1] + 1e-6);
const wrap = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;
/** The joints that put its flange at a pose, nearest those it has (each of its eight postures tried: shoulder front or
 *  back, elbow up or down, wrist flipped or not; joint 6 the turn nearest), or why none can. */
export function ik(pose: number[], near: number[] = [0, 0, 0, 0, 0, 0]): number[] | string {
  const [x, y, z, a, b, c] = pose as [number, number, number, number, number, number];
  const R = fromEuler(a, b, c), zf: V3 = [R[2]!, R[5]!, R[8]!], w: V3 = [x - LINK.d6 * zf[0], y - LINK.d6 * zf[1], z - LINK.d6 * zf[2]];
  const L2 = LINK.a2, L3 = Math.hypot(LINK.d4, LINK.a3), phi = Math.atan2(LINK.a3, LINK.d4), out: number[][] = [];
  for (const back of [false, true]) {
    const t1 = Math.atan2(w[1], w[0]) + (back ? Math.PI : 0), r = w[0] * Math.cos(t1) + w[1] * Math.sin(t1), h = w[2] - LINK.d1;
    const Dc = (r * r + h * h - L2 * L2 - L3 * L3) / (2 * L2 * L3); if (Math.abs(Dc) > 1 + 1e-9) continue;
    for (const s of [1, -1]) {
      const g = s * Math.acos(Math.max(-1, Math.min(1, Dc))), beta = Math.atan2(h, r) - Math.atan2(L3 * Math.sin(g), L2 + L3 * Math.cos(g));
      const t2 = Math.PI / 2 - beta, alpha = -(g + beta), t3 = alpha + phi - t2;
      const W = mul(T(mul(Rz(t1), Ry(t2 + t3))), R, T(FLANGE));
      const cb = Math.max(-1, Math.min(1, W[0]!));
      for (const f of [1, -1]) {
        const t5 = f * Math.acos(cb); let t4: number, t6: number;
        if (Math.abs(Math.sin(t5)) < 1e-7) { t4 = near[3]! * D; t6 = Math.atan2(W[7]!, W[4]!) - t4 * Math.sign(Math.cos(t5) || 1); }
        else { t4 = Math.atan2(W[3]! / Math.sin(t5), -W[6]! / Math.sin(t5)); t6 = Math.atan2(W[1]! / Math.sin(t5), W[2]! / Math.sin(t5)); }
        const q = [t1, t2, t3, t4, t5, t6].map((v) => v / D);
        for (let i = 0; i < 5; i++) q[i] = wrap(q[i]!);
        q[5] = q[5]! + 360 * Math.round((near[5]! - q[5]!) / 360);
        out.push(q);
      }
    }
  }
  const ok = out.filter((q) => inLimits(q) < 0 && Math.hypot(...fk(q).p.map((v, i) => v - pose[i]!)) < 1e-3);
  if (!ok.length) return out.length ? 'every posture that reaches it puts a joint past its limit' : 'out of its reach';
  return ok.sort((p, q) => p.reduce((s, v, i) => s + (v - near[i]!) ** 2, 0) - q.reduce((s, v, i) => s + (v - near[i]!) ** 2, 0))[0]!;
}

// ---- the robot, as its controller takes commands ---------------------------------------------------------------------
/** Where its joints are over time: a frame each step of a motion (s, degrees). */
export interface Frame { t: number; q: number[] }
export class Meca500 {
  q = [0, 0, 0, 0, 0, 0]; active = false; homed = false; error = false; t = 0;
  /** its joint velocity, % of top speed, and its tool's linear speed, mm/s (SetJointVel, SetCartLinVel; started at 25 %
   *  and 150 mm/s here, typical, not checked against its manual's defaults) */ jointVel = 25; linVel = 150;
  frames: Frame[] = [{ t: 0, q: [0, 0, 0, 0, 0, 0] }];
  constructor(readonly rev: 'R3' | 'R4' = 'R3') {}
  private moveTo(q1: number[]): void {
    const q0 = this.q, dt = Math.max(...q1.map((v, i) => Math.abs(v - q0[i]!) / ((MECA500.speed[this.rev][i]! * this.jointVel) / 100))), n = Math.max(1, Math.ceil(dt / 0.05));
    for (let k = 1; k <= n; k++) this.frames.push({ t: this.t + (dt * k) / n, q: q0.map((v, i) => v + ((q1[i]! - v) * k) / n) });
    this.t += dt; this.q = q1;
  }
  private ready(): string | null { return !this.active ? '[1005][The robot is not activated.]' : !this.homed ? '[1006][The robot is not homed.]' : this.error ? '[1011][The robot is already in error.]' : null; }
  /** One command, as sent to port 10000: what it answers. */
  send(line: string): string[] {
    const m = /^\s*(?:\d+\s+)?([A-Za-z]+)\s*(?:\(([^)]*)\))?\s*;?\s*$/.exec(line); if (!m) return [`[1003][Argument error. - Command: '${line.trim()}'.]`];
    const cmd = m[1]!, args = (m[2] ?? '').split(',').map((s) => s.trim()).filter(Boolean).map(Number);
    const six = () => args.length === 6 && args.every(Number.isFinite);
    switch (cmd) {
      case 'ActivateRobot': this.active = true; return ['[2000][Motors activated.]'];
      case 'DeactivateRobot': this.active = false; this.homed = false; return ['[2004][Motors deactivated.]'];
      case 'Home': if (!this.active) return ['[1005][The robot is not activated.]']; this.homed = true; return ['[2002][Homing done.]'];
      case 'ResetError': this.error = false; return ['[2005][The error was reset.]'];
      case 'SetJointVel': if (args.length !== 1 || !(args[0]! > 0 && args[0]! <= 100)) return [`[1003][Argument error. - Command: '${line.trim()}'.]`]; this.jointVel = args[0]!; return [];
      case 'SetCartLinVel': if (args.length !== 1 || !(args[0]! > 0)) return [`[1003][Argument error. - Command: '${line.trim()}'.]`]; this.linVel = Math.min(1000, args[0]!); return [];
      case 'Delay': if (args.length !== 1 || !(args[0]! >= 0)) return [`[1003][Argument error. - Command: '${line.trim()}'.]`]; this.t += args[0]!; this.frames.push({ t: this.t, q: [...this.q] }); return [];
      case 'GetJoints': case 'GetRtJointPos': return [`[2026][${this.q.map((v) => v.toFixed(3)).join(', ')}]`];
      case 'GetPose': case 'GetRtCartPos': return [`[2027][${poseOf(this.q).map((v) => v.toFixed(3)).join(', ')}]`];
      case 'MoveJoints': case 'MoveJointsRel': {
        const no = this.ready(); if (no) return [no]; if (!six()) return [`[1003][Argument error. - Command: '${line.trim()}'.]`];
        const q1 = cmd === 'MoveJoints' ? args : this.q.map((v, i) => v + args[i]!), j = inLimits(q1);
        if (j >= 0) { this.error = true; return [`[1007][Joint over limit (${q1[j]!.toFixed(1)} is not in range [${MECA500.limits[j]!.join(',')}] for joint ${j + 1}). - Command: '${line.trim()}'.]`]; }
        this.moveTo(q1); return [];
      }
      case 'MovePose': {
        const no = this.ready(); if (no) return [no]; if (!six()) return [`[1003][Argument error. - Command: '${line.trim()}'.]`];
        const q1 = ik(args, this.q); if (typeof q1 === 'string') { this.error = true; return [`[3014][Pose not reachable: ${q1}. - Command: '${line.trim()}'.] (this simulator's words for its refusal)`]; }
        this.moveTo(q1); return [];
      }
      case 'MoveLin': {
        // (its tool's centre along a straight line, its orientation turned along the way: every step of it reachable, or
        // it does not start)
        const no = this.ready(); if (no) return [no]; if (!six()) return [`[1003][Argument error. - Command: '${line.trim()}'.]`];
        const p0 = poseOf(this.q), dist = Math.hypot(args[0]! - p0[0]!, args[1]! - p0[1]!, args[2]! - p0[2]!), n = Math.max(2, Math.ceil(dist / 2)), path: number[][] = [];
        let near = this.q;
        for (let k = 1; k <= n; k++) { const f = k / n, pose = p0.map((v, i) => (i < 3 ? v + (args[i]! - v) * f : v + wrap(args[i]! - v) * f)); const q = ik(pose, near); if (typeof q === 'string') { this.error = true; return [`[3014][Linear path not possible: at ${(f * 100).toFixed(0)} % of the way ${q}. - Command: '${line.trim()}'.] (this simulator's words for its refusal)`]; } if (q.some((v, i) => Math.abs(v - near[i]!) > 30)) { this.error = true; return [`[3014][Linear path not possible: it passes through a singularity. - Command: '${line.trim()}'.] (this simulator's words)`]; } path.push(q); near = q; }
        const dt = dist / this.linVel;
        path.forEach((q, k) => this.frames.push({ t: this.t + (dt * (k + 1)) / n, q }));
        this.t += dt; this.q = path[path.length - 1]!; return [];
      }
      default: return [`[1000][Command not found: '${cmd}'.] (this simulator knows ActivateRobot, Home, MoveJoints, MoveJointsRel, MovePose, MoveLin, Delay, SetJointVel, SetCartLinVel, GetJoints, GetPose, ResetError, DeactivateRobot)`];
    }
  }
  /** A program, a command a line (its manual's numbered lines, or one per line, or separated by ;): everything it
   *  answered, and when its motion queue ran empty, [3012][End of block.]. */
  run(program: string): string[] {
    const out: string[] = [];
    for (const raw of program.split(/\n|;(?![^(]*\))/)) { const line = raw.replace(/(#|\/\/).*$/, '').trim(); if (!line) continue; const said = this.send(line); out.push(...said.map((s) => `${line.padEnd(34)} → ${s}`)); if (this.error) break; }
    if (!this.error && this.frames.length > 1) out.push('[3012][End of block.]');
    return out;
  }
}
