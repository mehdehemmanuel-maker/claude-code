import { describe, expect, it } from 'vitest';
import { fk, ik, Meca500, MECA500, poseOf } from '../../src/nexus/machines/meca';

describe('the Meca500', () => {
  it('stands at its zero joints with its flange at 190, 0, 308 mm, its tool axis forward (0, 90, 0)', () => {
    const p = poseOf([0, 0, 0, 0, 0, 0]);
    expect(p.map((v) => +v.toFixed(6))).toEqual([190, 0, 308, 0, 90, 0]);
  });
  it('finds the joints for any pose it can reach, and its flange goes back to that pose', () => {
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 300; k++) {
      const q = MECA500.limits.map(([lo, hi], i) => (i === 5 ? -180 + 360 * rnd() : lo * 0.8 + (hi - lo) * 0.8 * rnd()));
      if (Math.abs(q[4]!) < 3) continue; // (its wrist's singularity: any split of joints 4 and 6 is as good)
      const pose = poseOf(q), back = ik(pose, q);
      expect(typeof back, `pose of ${q.map((v) => v.toFixed(1))}`).not.toBe('string');
      const p2 = poseOf(back as number[]);
      expect(Math.hypot(...p2.slice(0, 3).map((v, i) => v - pose[i]!))).toBeLessThan(1e-6);
    }
  });
  it('reaches no further than its 330 mm at the flange from its shoulder', () => {
    expect(typeof ik([0, 0, 135 + 331, 0, 0, 0])).toBe('string');
    // (straight up: joint 3 lays the forearm's 120 and 38 mm along the upper arm, joint 5 the flange along them)
    const t3 = -Math.atan2(120, 38) * 180 / Math.PI, up = fk([0, 0, t3, 0, -90 - t3, 0]);
    expect(Math.hypot(up.p[0], up.p[2] - 135)).toBeCloseTo(135 + Math.hypot(120, 38) + 70, 6);
  });
  it('runs its manual\'s square path as written, answering as its manual says', () => {
    const r = new Meca500(), said = r.run(['1 ActivateRobot', '2 Home', '3 MoveJoints(0,0,0,0,0,0)', '4 MovePose(140,-100,250,0,90,0)', '5 MoveLin(140,100,250,0,90,0)', '6 MoveLin(270,100,250,0,90,0)', '7 MoveLin(270,-100,250,0,90,0)', '8 MoveLin(140,-100,250,0,90,0)', '9 MoveJoints(0,0,0,0,0,0)'].join('\n'));
    expect(said.some((l) => l.includes('[2000]'))).toBe(true); expect(said.some((l) => l.includes('[2002][Homing done.]'))).toBe(true);
    expect(said[said.length - 1]).toBe('[3012][End of block.]'); expect(r.error).toBe(false);
    // (its tool's centre went round the square: a frame at each corner)
    for (const [x, y] of [[140, 100], [270, 100], [270, -100]]) expect(r.frames.some((f) => { const p = poseOf(f.q); return Math.abs(p[0]! - x) < 0.01 && Math.abs(p[1]! - y) < 0.01 && Math.abs(p[2]! - 250) < 0.01; }), `${x}, ${y}`).toBe(true);
  });
  it('refuses a move before it is activated or homed, and a joint past its limit, in its own codes', () => {
    const r = new Meca500();
    expect(r.send('MoveJoints(0,0,0,0,0,0)')).toEqual(['[1005][The robot is not activated.]']);
    r.send('ActivateRobot'); expect(r.send('MoveJoints(0,0,0,0,0,0)')).toEqual(['[1006][The robot is not homed.]']);
    r.send('Home'); expect(r.send('MoveJoints(0,100,0,0,0,0)')[0]).toMatch(/^\[1007\]\[Joint over limit \(100\.0 is not in range \[-70,90\] for joint 2\)/);
  });
  it('takes as long as its joints\' speeds allow: joint 1 through 150° at 25 % of 150°/s is 4 s on an R3', () => {
    const r = new Meca500('R3'); r.run('ActivateRobot\nHome\nMoveJoints(150,0,0,0,0,0)');
    expect(r.t).toBeCloseTo(4, 6);
  });
});
