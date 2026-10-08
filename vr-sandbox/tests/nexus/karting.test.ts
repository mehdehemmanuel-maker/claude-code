import { describe, expect, it } from 'vitest';
import { bump, drive, driveForce, idealLap, KART, lapSaid, makeTrack, nearest, onGrid, order, runKart, speedProfile, topSpeed, type KartState } from '../../src/nexus/karting';
import { readPlace, sayPlace } from '../../src/nexus/places';
import { readPlain } from '../../src/nexus/directive';

const g = 9.80665;
// a track too wide to leave: the kart alone with its tyres, no grass or walls
const open = makeTrack(undefined, 300);
const at = (v: number): KartState => ({ ...onGrid(open, 0), vx: v });
// its velocity over the ground, and how fast that changes: friction can pull it no harder than μ g (plus the air's drag)
const worldV = (k: KartState): [number, number] => { const c = Math.cos(k.heading), s = Math.sin(k.heading); return [k.vx * c - k.vy * s, k.vx * s + k.vy * c]; };
const pull = (k: KartState, dt: number, step: () => void): number => { const a = worldV(k); step(); const b = worldV(k); return Math.hypot(b[0] - a[0], b[1] - a[1]) / dt; };

describe('the track', () => {
  const tr = makeTrack();
  it('is a closed club circuit of about 550 m, 7 m wide, its corners from a hairpin to sweepers', () => {
    expect(tr.length).toBeGreaterThan(500); expect(tr.length).toBeLessThan(600); expect(tr.width).toBe(7);
    const tight = 1 / Math.max(...tr.kappa.map(Math.abs)); expect(tight).toBeGreaterThan(6); expect(tight).toBeLessThan(15);
    expect(tr.says[0]).toMatch(/9 corners/);
  });
  it('never comes back near itself: its parts at least two run-offs and walls apart', () => {
    const clear = 2 * (tr.width / 2 + 0.6 + 3); let min = Infinity;
    for (let i = 0; i < tr.pts.length; i += 3) for (let j = i + 3; j < tr.pts.length; j += 3) {
      const ds = Math.abs(tr.s[i]! - tr.s[j]!); if (Math.min(ds, tr.length - ds) < 60) continue;
      min = Math.min(min, Math.hypot(tr.pts[i]![0] - tr.pts[j]![0], tr.pts[i]![1] - tr.pts[j]![1]));
    }
    expect(min).toBeGreaterThan(clear);
  });
  it('finds where a kart is on it: how far round and how far off the line', () => {
    const p = tr.pts[100]!, t = tr.tan[100]!, n = nearest(tr, p[0] - t[1] * 2, p[1] + t[0] * 2);
    expect(n.i).toBe(100); expect(n.off).toBeCloseTo(2, 1); expect(n.s).toBeCloseTo(tr.s[100]!, 0);
  });
});

describe('the engine and the drive', () => {
  it('pulls with the GX270 torque through the gearing at low speed: T·ratio·η / r', () => {
    expect(driveForce(0, 1).F).toBeCloseTo((KART.torque * KART.ratio * KART.eff) / KART.rWheel, 0);
  });
  it('is governed: no pull past 3,600 rpm, a top speed of about 59 km/h', () => {
    expect(topSpeed() * 3.6).toBeGreaterThan(55); expect(topSpeed() * 3.6).toBeLessThan(65);
    expect(driveForce(topSpeed() * 1.02, 1).F).toBe(0);
  });
  it('gets there: flat out on a straight from a stand it passes 50 km/h and never the governed speed', () => {
    const k = at(0); k.throttle = 1; let t = 0, at50 = 0;
    while (t < 20) { runKart(k, open, 1 / 60); t += 1 / 60; if (!at50 && k.vx * 3.6 > 50) at50 = t; }
    expect(at50).toBeGreaterThan(4); expect(at50).toBeLessThan(12); expect(k.vx).toBeLessThan(topSpeed() * 1.01);
  });
});

describe('the tyres and brakes', () => {
  it('stops from 15 m/s in about 20 m: its brake is on the rear axle alone (about 0.5 g)', () => {
    const k = at(15); k.brake = 1; const x0 = k.x, z0 = k.z; let t = 0;
    while (k.vx > 0.05 && t < 10) { runKart(k, open, 1 / 60); t += 1 / 60; }
    const d = Math.hypot(k.x - x0, k.z - z0), a = KART.brake * (1 - KART.front) * g;
    expect(d).toBeLessThan((15 * 15) / (2 * a) * 1.05); expect(d).toBeGreaterThan((15 * 15) / (2 * a) * 0.8);
  });
  it('corners within its grip: what pulls it round never past μ g, even at full lock and in a slide', () => {
    for (const steer of [0.1, 0.3, 1]) {
      const k = at(13); k.throttle = 0.6; k.steer = steer; let most = 0;
      for (let i = 0; i < 180; i++) most = Math.max(most, pull(k, 1 / 60, () => runKart(k, open, 1 / 60)));
      expect(most).toBeLessThan(KART.mu * g * 1.08);
    }
  });
  it('holds a gentle corner with its tyres barely slipping', () => {
    const k = at(10); k.throttle = 0.5; k.steer = 0.15; for (let i = 0; i < 120; i++) runKart(k, open, 1 / 60);
    expect(Math.abs(Math.atan2(k.vy, k.vx))).toBeLessThan(0.08);
  });
  it('a kart thrown into a spin slides on all four tyres and comes to rest', () => {
    const k = at(12); k.r = 3; for (let i = 0; i < 300; i++) runKart(k, open, 1 / 60);
    expect(Math.hypot(k.vx, k.vy)).toBeLessThan(0.1); expect(Math.abs(k.r)).toBeLessThan(0.1);
  });
  it('the grass beyond the kerbs grips about half as well and holds it back more', () => {
    const tr = makeTrack(), p = tr.pts[30]!, t = tr.tan[30]!, h = Math.atan2(t[1], t[0]);
    const coast = (off: number) => { const k: KartState = { ...onGrid(tr, 0), x: p[0] - t[1] * off, z: p[1] + t[0] * off, heading: h, vx: 10, s: tr.s[30]! }; for (let i = 0; i < 30; i++) runKart(k, tr, 1 / 60); return k; };
    const road = coast(0), grass = coast(5.5);
    expect(grass.onGrass).toBe(true); expect(road.onGrass).toBe(false); expect(grass.vx).toBeLessThan(road.vx);
  });
});

describe('drivers and laps', () => {
  const tr = makeTrack();
  const race = (skill: number, laps = 3) => {
    const k = onGrid(tr, 0), prof = speedProfile(tr, skill); let lat = 0;
    for (let i = 0; i < 60 * 300 && k.laps < laps; i++) { drive(k, tr, prof, skill); const a = pull(k, 1 / 60, () => runKart(k, tr, 1 / 60)); if (k.vx > 3) lat = Math.max(lat, a); }
    return { k, lat };
  };
  it('a driver at the grip’s limit laps in about 40 s, near the perfect lap, never hitting a wall', () => {
    const { k, lat } = race(1), ideal = idealLap(tr);
    expect(k.laps).toBe(3); expect(k.best!).toBeGreaterThan(ideal * 0.95); expect(k.best!).toBeLessThan(ideal * 1.15);
    expect(k.hits).toBe(0); expect(lat).toBeLessThan(KART.mu * g * 1.08);
  });
  it('a slower driver is slower by about how much less of the grip it uses', () => {
    const fast = race(1).k.best!, slow = race(0.9).k.best!;
    expect(slow).toBeGreaterThan(fast * 1.04); expect(slow).toBeLessThan(fast * 1.2);
  });
  it('a lap counts once across the line, going forwards; its time said as a person reads it', () => {
    const { k } = race(1, 2); expect(k.laps).toBe(2); expect(k.last).not.toBeNull();
    expect(lapSaid(41.27)).toBe('41.3 s'); expect(lapSaid(75.4)).toBe('1:15.4'); expect(lapSaid(null)).toBe('—');
  });
  it('karts that touch are pushed apart, the speed between them shared as equal masses share it', () => {
    const a: KartState = { ...onGrid(open, 0), x: 0, z: 0, heading: 0, vx: 10 }, b: KartState = { ...onGrid(open, 0), x: 1, z: 0, heading: 0, vx: 4 };
    expect(bump(a, b)).toBe(true); expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(1.5, 5);
    expect(a.vx + b.vx).toBeCloseTo(14, 5); expect(b.vx - a.vx).toBeCloseTo(0.4 * 6, 5);
  });
  it('the order is most laps, then furthest round', () => {
    const a = { k: { ...onGrid(open, 0), laps: 2, s: 10 } }, b = { k: { ...onGrid(open, 0), laps: 2, s: 50 } }, c = { k: { ...onGrid(open, 0), laps: 3, s: 1 } };
    expect(order([a, b, c])).toEqual([c, b, a]);
  });
});

describe('the place', () => {
  it('a go-kart track is a place you are taken to, at it, with its track and its karts said', () => {
    for (const w of ['take me to a go-kart track', 'lets go karting', 'I want to race karts', 'take me to a race track']) {
      const p = readPlace(w)!; expect(p.name).toBe('a go-kart track'); expect(p.props.some((x) => x.kind === 'kart track')).toBe(true);
    }
    const p = readPlace('take me to a go-kart track')!; expect(sayPlace(p)).toMatch(/^You are at a go-kart track: a 5\d\d m loop 7 m wide/); expect(p.ground.relief).toBe(0);
  });
  it('asked as people ask it, it is a place to be taken to', () => {
    for (const w of ["let's go karting", 'lets go karting', 'I want to race karts', 'can we go karting', 'drive a go-kart', "let's play pool"]) expect(readPlain(w).directive.act).toBe('place');
    expect(readPlain('make a go-kart').directive.act).not.toBe('place');
  });
  it('a race car is a thing to make, not a place', () => {
    expect(readPlace('build a race car')).toBeNull();
  });
});
