import { describe, expect, it } from 'vitest';
import { advance, aimShot, assistHit, batHit, bounce, flight, meetPoint, newRally, point, robotStep, serveBall, serveShot, setSkill, stepBall, terminalSpeed, TT, type Ball, type V3 } from '../../src/nexus/pingpong';
import { readPlace } from '../../src/nexus/places';
import { readPlain } from '../../src/nexus/directive';

const g = 9.80665;
const seeded = (s0: number) => { let s = s0 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

describe('the ball, the table and the air', () => {
  it('bounces back to about 23 cm when dropped from 30 cm (ITTF Law 2.1.3), drag included', () => {
    const b: Ball = { p: [0.5, TT.top + TT.r + 0.3, 0], v: [0, 0, 0], w: [0, 0, 0] }; let up = false, peak = 0;
    for (let i = 0; i < 4000; i++) { if (advance(b, 0.0005) === 'table') up = true; if (up) { peak = Math.max(peak, b.p[1] - TT.top - TT.r); if (b.v[1] < 0) break; } }
    expect(peak).toBeGreaterThan(0.22); expect(peak).toBeLessThan(0.24);
  });
  it('falls no faster than about 8.3 m/s: so light a ball is mostly held up by the air', () => {
    expect(terminalSpeed()).toBeGreaterThan(8); expect(terminalSpeed()).toBeLessThan(8.7);
  });
  it('dips with topspin: the same launch lands shorter', () => {
    const from: V3 = [1.6, TT.top + 0.25, 0], v: V3 = [-9, 1.2, 0];
    const flat = flight({ p: from, v, w: [0, 0, 0] }).bounces[0]!, top = flight({ p: from, v, w: [0, 0, 60 * 2 * Math.PI] }).bounces[0]!;
    expect(top[0]).toBeGreaterThan(flat[0]); // lands nearer the robot's end it left from (−x is your end)
  });
  it('kicks forward off the table with topspin and checks with backspin', () => {
    // landing steeply enough that a ball without spin rolls off the table; spun, it slides the whole contact
    const go = (w: number) => { const b: Ball = { p: [0, TT.top + TT.r, 0], v: [1.5, -3, 0], w: [0, 0, w] }; bounce(b, [0, 1, 0], TT.eTable, TT.muTable); return b.v[0]; };
    expect(go(-100 * 2 * Math.PI)).toBeGreaterThan(go(0)); expect(go(100 * 2 * Math.PI)).toBeLessThan(go(0)); // −z spin is topspin going +x
  });
});

describe('aiming and serving', () => {
  it('lands a shot within 5 cm of where it is aimed, clear of the net, from 8 to 14 m/s', () => {
    for (const speed of [8, 10, 12, 14]) {
      const s = aimShot([1.75, TT.top + 0.25, 0.3], [-1.0, TT.top, -0.5], speed, 60)!; expect(s).not.toBeNull();
      expect(Math.hypot(s.lands[0] + 1.0, s.lands[2] + 0.5)).toBeLessThan(0.05);
      expect(flight({ p: [1.75, TT.top + 0.25, 0.3], v: s.v, w: s.w }).net).toBe(false);
    }
  });
  it('cannot reach a deep target at 6 m/s with heavy topspin: the air takes too much (it says so, rather than pretend)', () => {
    expect(aimShot([1.75, TT.top + 0.25, 0.3], [-1.0, TT.top, -0.5], 6, 60)).toBeNull();
  });
  it('serves as the Laws ask: first on its own half, then over the net on the receiver’s', () => {
    const s = serveShot([1.6, TT.top + 0.25, 0.2], -0.5, 30)!; expect(s).not.toBeNull();
    const f = flight({ p: [1.6, TT.top + 0.25, 0.2], v: s.v, w: s.w }); expect(f.bounces[0]![0]).toBeGreaterThan(0); expect(f.bounces[1]![0]).toBeLessThan(0); expect(f.net).toBe(false);
  });
});

describe('the rules', () => {
  const live = (by: 'you' | 'robot', p: V3, v: V3) => { const R = newRally(); R.ball = { p, v, w: [0, 0, 0] }; R.live = true; R.hitBy = by; R.served = true; return R; };
  const play = (R: ReturnType<typeof newRally>) => { for (let i = 0; i < 4000 && R.live; i++) stepBall(R, 0.001); return R.said.join(' '); };
  it('a ball into the net is the other side’s point', () => { expect(play(live('you', [-1.2, TT.top + 0.1, 0], [6, 0, 0]))).toMatch(/^Point to the robot/); });
  it('a ball that bounces twice on the receiver’s side is the hitter’s point', () => { expect(play(live('you', [-1.0, TT.top + 0.3, 0], [3.2, 1.5, 0]))).toMatch(/^Point to you: it bounced twice/); });
  it('a ball hit onto your own side loses you the point', () => { expect(play(live('you', [-1.0, TT.top + 0.3, 0], [1, -1, 0]))).toMatch(/^Point to the robot: you hit it onto your own side/); });
  it('a ball hit off the end without touching the table loses you the point', () => { expect(play(live('you', [-1.0, TT.top + 0.3, 0], [12, 2, 0]))).toMatch(/^Point to the robot: your shot missed the table/); });
  it('a game is to 11 by two, and the serve changes every two points (every point from 10–10)', () => {
    const R = newRally(); const servers: string[] = [];
    for (let i = 0; i < 4; i++) { point(R, 'robot', 'x'); servers.push(R.server); } expect(servers).toEqual(['robot', 'you', 'you', 'robot']);
    R.score = { you: 10, robot: 10 }; point(R, 'you', 'x'); expect(R.games.you).toBe(0); const a = R.server; point(R, 'robot', 'x'); expect(R.server).not.toBe(a);
    point(R, 'you', 'x'); point(R, 'you', 'x'); expect(R.games.you).toBe(1); expect(R.score).toEqual({ you: 0, robot: 0 });
  });
});

describe('the robot', () => {
  it('serves and wins every point against a bat that never moves, 11–0', () => {
    const R = newRally(1), rand = seeded(5); R.robot.wait = 0.2;
    for (let i = 0; i < 1000 * 120 && R.games.robot < 1; i++) { if (!R.live && R.server === 'you') { R.robot.wait -= 0.001; if (R.robot.wait <= 0) { serveBall(R); } } stepBall(R, 0.001); robotStep(R, 0.001, [-1.6, 1, 0], rand); }
    expect(R.games.robot).toBe(1); expect(R.games.you).toBe(0);
  });
  it('returns well-timed shots onto your half, wider the better it is, and never misses one', () => {
    const width: Record<number, number> = {};
    for (const skill of [0.5, 1]) {
      const R = newRally(skill), rand = seeded(9); setSkill(R, skill); R.robot.wait = 0.2; let bat: V3 = [-1.62, 0.96, 0], armed = 0, returns = 0; const wide: number[] = [];
      for (let i = 0; i < 1000 * 40; i++) {
        if (!R.live && R.server === 'you') { R.robot.wait -= 0.001; if (R.robot.wait <= 0) serveBall(R); }
        const m = meetPoint(R, 'you'); if (m) bat = m; // a bat that is always there
        if (armed <= 0 && m && R.live) { const f = flight(R.ball, { tMax: 0.5 }), k = f.path.findIndex((x) => Math.hypot(x.p[0] - m[0], x.p[1] - m[1], x.p[2] - m[2]) < 0.05); if (k >= 0 && k * 0.002 <= 0.121 && k * 0.002 >= 0.1) armed = 0.25; }
        if (armed > 0) { if (assistHit(R, bat, armed, 0, g, rand)) armed = 0; armed -= 0.001; }
        const was = R.hitBy; stepBall(R, 0.001); robotStep(R, 0.001, bat, rand); if (was === 'you' && R.hitBy === 'robot') { returns++; const f = flight(R.ball); if (f.bounces[0]) { expect(f.bounces[0][0]).toBeLessThan(0); wide.push(Math.abs(f.bounces[0][2])); } }
      }
      expect(returns).toBeGreaterThan(20); expect(R.said.filter((x) => /^Point to you/.test(x))).toHaveLength(0);
      width[skill] = wide.reduce((a, b) => a + b, 0) / wide.length;
    }
    expect(width[1]!).toBeGreaterThan(width[0.5]! + 0.1); expect(width[1]!).toBeGreaterThan(0.55);
  });
});

describe('your bat', () => {
  it('in a headset: a bat swung forward at 5 m/s sends the ball back faster than it came, over the net', () => {
    const R = newRally(); R.ball = { p: [-1.5, TT.top + 0.2, 0], v: [-6, 0, 0], w: [0, 0, 0] }; R.live = true; R.hitBy = 'robot'; R.served = true; R.bounces = { you: 1, robot: 0 };
    expect(batHit(R, [-1.5 - TT.r - 0.005, TT.top + 0.2, 0], [1, 0.3, 0], [5, 0, 0])).toBe(true);
    expect(R.hitBy).toBe('you'); expect(R.ball.v[0]).toBeGreaterThan(6); expect(R.ball.v[0]).toBeLessThan(5 + 0.85 * 11 + 0.5);
  });
  it('on a screen: a swing in time sends it back; one begun too early is over before the ball comes', () => {
    const R = newRally(); R.ball = { p: [-1.5, TT.top + 0.2, 0], v: [-1, 0, 0], w: [0, 0, 0] }; R.live = true; R.hitBy = 'robot'; R.served = true; R.bounces = { you: 1, robot: 0 };
    expect(assistHit(R, [-1.52, TT.top + 0.2, 0], 0.13, 0)).toMatch(/Clean/); expect(R.hitBy).toBe('you'); expect(R.ball.v[0]).toBeGreaterThan(0);
    const S = newRally(); S.ball = { p: [-0.5, TT.top + 0.2, 0], v: [-6, 0, 0], w: [0, 0, 0] }; S.live = true; S.hitBy = 'robot'; S.served = true; S.bounces = { you: 1, robot: 0 };
    expect(assistHit(S, [-1.52, TT.top + 0.2, 0], 0.13, 0)).toBeNull(); // the ball is a metre away: no hit
  });
});

describe('the place', () => {
  it('ping pong against a robot way better than you: a table tennis hall, the robot at its best', () => {
    const p = readPlace("I want to play ping pong against a robot that's way better than me")!;
    expect(p.name).toBe('a table tennis hall'); expect(p.props.find((x) => x.kind === 'ping pong')!.s).toBe(1);
    expect(readPlace('table tennis, something easy')!.props.find((x) => x.kind === 'ping pong')!.s).toBeLessThan(0.6);
    for (const w of ["I want to play ping pong against a robot that's way better than me", "let's play table tennis"]) expect(readPlain(w).directive.act).toBe('place');
  });
});
