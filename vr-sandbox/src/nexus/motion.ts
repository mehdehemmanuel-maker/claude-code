// How a machine moves: never at once. Each joint is driven as a servo drives it, by a trapezoidal velocity profile (as
// industrial motion controllers do): it speeds up at no more than its acceleration, runs at no more than its top speed,
// and slows down in time to stop on its target (from speed v it needs v² / 2a to stop), so it starts and stops softly
// and never overshoots. A base on two driven wheels (a differential drive) turns each wheel by how far its side
// travels: v ∓ ω b / 2 over the wheel's radius, so turning in place spins them opposite ways.

/** One joint's motion along one coordinate (an angle, rad; or a distance, m): where it is, and how fast it goes. */
export class Servo {
  vel = 0;
  constructor(public pos: number, public vmax: number, public amax: number) {}
  /** dt s on toward a target: faster by at most amax dt, no faster than vmax, nor than lets it stop on the target. */
  step(target: number, dt: number): number {
    const gap = target - this.pos, dir = Math.sign(gap), dist = Math.abs(gap);
    if (dist < 1e-6 && Math.abs(this.vel) < 1e-6) { this.pos = target; this.vel = 0; return this.pos; }
    // the fastest it may go now and still stop in the distance left, at its deceleration
    const stopV = Math.sqrt(2 * this.amax * dist), want = dir * Math.min(this.vmax, stopV);
    const dv = Math.max(-this.amax * dt, Math.min(this.amax * dt, want - this.vel));
    this.vel += dv;
    const move = this.vel * dt;
    if (Math.abs(move) >= dist && Math.sign(move) === dir) { this.pos = target; this.vel = 0; } else this.pos += move;
    return this.pos;
  }
}

/** A joint turning in 3D (a quaternion), driven the same way along the angle between where it points and its target. */
export interface Quat { x: number; y: number; z: number; w: number }
export class QServo {
  vel = 0;
  constructor(public vmax: number, public amax: number) {}
  /** How far to turn this step (rad) toward a target the angle `left` away: the trapezoidal step. */
  step(left: number, dt: number): number {
    if (left < 1e-5 && this.vel < 1e-5) { this.vel = 0; return left; }
    const want = Math.min(this.vmax, Math.sqrt(2 * this.amax * left));
    this.vel += Math.max(-this.amax * dt, Math.min(this.amax * dt, want - this.vel));
    return Math.min(left, Math.max(0, this.vel * dt));
  }
}

/** The angular speed of each wheel of a differential drive (rad/s, left and right) for a speed forward v (m/s) and a
 *  turning rate ω (rad/s, positive to the left), its wheels b apart (m), each of radius r (m). */
export function wheelSpeeds(v: number, omega: number, b: number, r: number): [number, number] {
  return [(v - (omega * b) / 2) / r, (v + (omega * b) / 2) / r];
}

/** How far a body on wheels pitches when it speeds up or slows down: as far as its suspension gives under the inertial
 *  push, a / g of its stiffness angle (rad), forward when it brakes. */
export const pitchOf = (accel: number, give = 0.35) => Math.max(-0.06, Math.min(0.06, (-accel / 9.80665) * give));
