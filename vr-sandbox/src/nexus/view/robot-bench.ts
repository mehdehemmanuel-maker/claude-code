// The robot at the soldering bench: the robot its design draws (robot.ts, components.ts), standing with the bench's
// things on its own table, doing the LED lesson by the bench's own words (the same ones a person says, in the order the
// lesson's steps put them), its arms following, by their own inverse kinematics (dharm.ts), where the bench puts the
// iron, the wire's held end and the cutters. What it did said, step by step.
// Owner of: the robot doing a bench lesson in the room.

import * as THREE from 'three';
import { kitView, type KitView } from './kit3d';
import type { SolderBench } from './solder-bench';
import { robotPart, ROBOT_CELL } from '../components';
import { ik, UR5E } from '../dharm';
import { robotFor, TASKS, type Robot } from '../robot';
import { PROTO } from '../solder-lesson';
import { grade } from '../solder-joint';

type Side = 'left' | 'right';
/** A step: the bench's words, and when it is done (the joint good, or the time it takes). */
interface Step { words: string; done: (s: SolderBench, t: number) => boolean; skip?: (s: SolderBench) => boolean }
const after = (sec: number) => (_s: SolderBench, t: number) => t >= sec;

export class RobotAtBench {
  readonly group: THREE.Group;
  /** what it did, step by step: its words and the bench's answer */
  readonly said: { words: string; answer: string }[] = [];
  private view: KitView;
  private jointsOf: Record<Side, THREE.Object3D[]> = { left: [], right: [] };
  private q: Record<Side, number[]> = { left: [], right: [] };
  private ready: Record<Side, number[]> = { left: [], right: [] };
  private steps: Step[]; private i = -1; private t = 0;
  /** each arm's base in the robot's frame (mm) */
  private base: Record<Side, [number, number, number]> = { left: [-250, ROBOT_CELL.top, -ROBOT_CELL.back], right: [250, ROBOT_CELL.top, -ROBOT_CELL.back] };

  constructor(readonly bench: SolderBench, design: Robot = robotFor(TASKS.map((t) => t.id)).robot) {
    const part = robotPart(design); if (typeof part === 'string') throw new Error(part);
    this.view = kitView(part, { maxLights: 0 }); this.group = this.view.group;
    // (its table's top where the bench's was, the board in the helping hands where its work point is)
    const w = ROBOT_CELL.work, h = PROTO.hands; this.group.position.set((h[0] - w[0]) / 1000, -ROBOT_CELL.top / 1000, (h[2] - w[2]) / 1000);
    bench.group.add(this.group); bench.ownTable(false); bench.from = 'back';
    for (const side of ['left', 'right'] as Side[]) {
      const arm = this.group.getObjectByName(`${part.name} ${side} arm`); if (!arm) continue;
      for (let k = 1; k <= 6; k++) { const o = arm.getObjectByName(`${part.name} ${side} arm joint ${k}`); if (o) this.jointsOf[side].push(o); }
      this.q[side] = this.jointsOf[side].map((o) => o.rotation.z); this.ready[side] = [...this.q[side]];
    }
    this.steps = this.plan();
  }

  /** The lesson as the robot does it: the bench's words in its steps' order, each joint heated until it takes solder
   *  and fed until it is good, each lead trimmed, the switch closed. */
  private plan(): Step[] {
    const n = this.bench.bench.joints.length, good = (k: number) => (s: SolderBench, t: number) => grade(s.bench.joints[k]!.j, s.bench.joints[k]!.shape).grade === 'good' || t > 6;
    const hot = (k: number) => (s: SolderBench, t: number) => s.bench.joints[k]!.j.T > 200 || t > 4;
    return [
      { words: 'place all', done: after(1.5) }, { words: 'board in the hands', done: after(1.5) }, { words: 'place the battery', done: after(1.5) },
      { words: 'take the iron', done: after(1) }, { words: 'take the solder', done: after(0.8) }, { words: 'tin the tip', done: after(1.5) }, { words: 'wipe', done: after(0.8) },
      // (more wire paid out whenever less than a joint's 12 mm stands out of the fingers, as a person pulls more)
      ...Array.from({ length: n }, (_, k) => [{ words: 'more solder', done: after(0.3), skip: (s: SolderBench) => s.bench.wire.out >= 12 }, { words: `heat joint ${k + 1}`, done: hot(k) }, { words: `feed joint ${k + 1}`, done: good(k) }, { words: 'lift', done: after(0.4) }]).flat(),
      { words: 'iron down', done: after(1) }, { words: 'take the cutters', done: after(1) },
      ...Array.from({ length: n }, (_, k) => ({ words: `cut lead ${k + 1} at 1.5`, done: after(0.7) })), { words: 'cutters down', done: after(1) },
      { words: 'close the switch', done: after(1) },
    ];
  }
  /** Done when every step is. */
  get finished(): boolean { return this.i >= this.steps.length; }

  update(dt: number): void {
    // (the next step once this one is done)
    this.t += dt;
    if (this.i < 0 || (!this.finished && this.steps[this.i]!.done(this.bench, this.t))) {
      this.i++; this.t = 0; while (!this.finished && this.steps[this.i]!.skip?.(this.bench)) this.i++;
      if (!this.finished) { const w = this.steps[this.i]!.words; this.said.push({ words: w, answer: this.bench.act(w) }); }
    }
    // (each hand where what it holds is: the right over the iron's grip or the cutters, the left over the wire's held
    // end; reaching for the board while parts go in; else back to ready)
    // (each hand behind what it holds and along it, the way the bench holds it from the robot's side: its flange back
    // from the grip by the changer and the hand's own length to its fingers' middle, 52.4 + 130 mm, its fingers round the
    // handle; over the board, pointing down and clear of it, while parts go in)
    const b = this.bench.bench, words = this.finished ? '' : this.steps[this.i]!.words, down = new THREE.Vector3(0, -1, 0), turn = this.bench.group.getWorldQuaternion(new THREE.Quaternion());
    const along = (at: THREE.Vector3, way: THREE.Vector3) => ({ at: at.addScaledVector(way, -0.18), dir: way });
    const iron = this.bench.way('iron').applyQuaternion(turn), wire = this.bench.way('wire').applyQuaternion(turn), jaws = this.at('jaws').sub(this.at('cutters')).normalize();
    const over = (dx: number) => ({ at: this.at('proto').add(new THREE.Vector3(dx, 0.3, 0)), dir: down });
    const right = /^(place|board)/.test(words) ? over(0.06) : b.iron.inHand ? along(this.at('iron'), iron) : /cut/.test(words) ? along(this.at('cutters'), jaws) : null;
    const left = /^(place|board)/.test(words) ? over(-0.12) : b.wire.inHand ? along(this.at('wire'), wire) : null;
    this.reach('right', right, dt); this.reach('left', left, dt);
  }
  /** Where a thing is held, in the room: the iron by its grip, the cutters by their jaws, the board by its middle, the
   *  wire where it comes out of the fingers (its end less what is paid out, along the way the bench draws it). */
  private at(what: 'iron' | 'wire' | 'jaws' | 'proto' | 'cutters'): THREE.Vector3 {
    const p = new THREE.Vector3(...this.bench.point(what)); if (what !== 'wire') return p;
    const d = this.bench.way('wire').applyQuaternion(this.bench.group.getWorldQuaternion(new THREE.Quaternion()));
    return p.addScaledVector(d, -this.bench.bench.wire.out / 1000);
  }
  /** An arm's flange moved toward a point in the room (its tool pointing down), or back to ready: its joints turned at
   *  most 1.5 rad/s toward the angles its inverse kinematics finds. */
  private reach(side: Side, target: { at: THREE.Vector3; dir: THREE.Vector3 } | null, dt: number): void {
    const js = this.jointsOf[side]; if (js.length < 6) return;
    let goal = this.ready[side];
    if (target) {
      // (into the arm's own frame: its x toward the robot's back, its y to its left, its z up)
      const l = this.group.worldToLocal(target.at.clone()).multiplyScalar(1000), b = this.base[side], d = target.dir.clone().applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()).invert());
      const r = ik(UR5E, [-(l.z - b[2]), -(l.x - b[0]), l.y - b[1]], [-d.z, -d.x, d.y], this.q[side]);
      if (r.miss < 5 && r.off < 3) goal = r.q;
    }
    const step = 1.5 * dt; this.q[side] = this.q[side].map((v, k) => { let d = goal[k]! - v; d = Math.atan2(Math.sin(d), Math.cos(d)); return v + Math.max(-step, Math.min(step, d)); });
    js.forEach((o, k) => { o.rotation.z = this.q[side][k]!; });
  }
  dispose(): void { this.group.removeFromParent(); this.bench.ownTable(true); this.view.dispose?.(); }
}
