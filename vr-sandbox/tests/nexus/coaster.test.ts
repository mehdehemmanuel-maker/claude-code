import { describe, expect, it } from 'vitest';
import { at, COASTER, LIMITS, makeCoaster, newRide, runRide, stepRide, type Ride, type Track } from '../../src/nexus/world/coaster';
import { readPlace, sayPlace } from '../../src/nexus/world/places';
import { readPlain } from '../../src/nexus/substrate/directive';

const g = 9.80665;
/** One whole ride, from the station back to it, watched at every step. */
function rideOnce(tr: Track): { r: Ride; slowest: number; overEnergy: number } {
  const r = newRide(tr); r.dwell = 0; let slowest = Infinity, overEnergy = -Infinity;
  for (let i = 0; i < 200 * 300 && r.rides < 1; i++) {
    stepRide(r, tr, 0.005, g); const q = at(tr, r.s);
    if (r.phase === 'running' && q.kind === 'free') { slowest = Math.min(slowest, r.v); overEnergy = Math.max(overEnergy, r.v * r.v - (2 * g * (tr.top - q.p[1]) + COASTER.chain ** 2)); }
  }
  return { r, slowest, overEnergy };
}

describe('the track', () => {
  const tr = makeCoaster();
  it('is one closed circuit of about a kilometre, laid every half metre, its lift to 40 m', () => {
    expect(tr.length).toBeGreaterThan(800); expect(tr.length).toBeLessThan(1200); expect(tr.top).toBeGreaterThan(38); expect(tr.top).toBeLessThan(42);
    const n = tr.p.length; let most = 0;
    for (let i = 0; i < n; i++) { const a = tr.p[i]!, b = tr.p[(i + 1) % n]!; most = Math.max(most, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])); }
    expect(most).toBeLessThan(0.8);
  });
  it('never runs through itself: its parts clear each other by more than a car’s width', () => {
    let min = Infinity; const n = tr.p.length;
    for (let i = 0; i < n; i += 3) for (let j = i + 3; j < n; j += 3) {
      const ds = Math.abs(i - j) * tr.ds; if (Math.min(ds, tr.length - ds) < 30) continue;
      min = Math.min(min, Math.hypot(tr.p[i]![0] - tr.p[j]![0], tr.p[i]![1] - tr.p[j]![1], tr.p[i]![2] - tr.p[j]![2]));
    }
    expect(min).toBeGreaterThan(3.5);
  });
  it('its loop is a teardrop: tight at the top (8 m), wide at the bottom', () => {
    const loop = tr.p.map((_, i) => i).filter((i) => tr.piece[i] === 'the loop'), r = loop.map((i) => 1 / Math.hypot(...tr.c[i]!));
    const top = loop.reduce((a, i) => (tr.u[i]![1] < tr.u[a]![1] ? i : a), loop[0]!);
    expect(1 / Math.hypot(...tr.c[top]!)).toBeCloseTo(8, 0); expect(Math.max(...r.filter(Number.isFinite))).toBeGreaterThan(20);
  });
});

describe('a ride', () => {
  const tr = makeCoaster(), { r, slowest, overEnergy } = rideOnce(tr), S = r.last!;
  it('goes all the way round and back to the station in about two minutes, never stalling', () => {
    expect(r.rides).toBe(1); expect(S.time).toBeGreaterThan(90); expect(S.time).toBeLessThan(180); expect(slowest).toBeGreaterThan(1.5);
  });
  it('is never faster than its height allows: friction and the air only take energy away', () => {
    expect(overEnergy).toBeLessThan(0.5);
  });
  it('reaches nearly the speed of a free fall from the lift to the foot of the first drop', () => {
    const drop = tr.top - Math.min(...tr.p.filter((_, i) => tr.piece[i] === 'the first drop').map((x) => x[1]));
    expect(S.vMax / Math.sqrt(2 * g * drop)).toBeGreaterThan(0.88); expect(S.vMax / Math.sqrt(2 * g * drop)).toBeLessThan(1.0); expect(S.at.vMax).toBe('the first drop');
  });
  it('keeps what riders feel within the limits: under +5 g, above −1.5 g, under 1.5 g sideways', () => {
    expect(S.upMax).toBeLessThan(LIMITS.up); expect(S.upMin).toBeGreaterThan(LIMITS.down); expect(S.sideMax).toBeLessThan(LIMITS.side);
    expect(S.upMax).toBeGreaterThan(3); // a real coaster's loop: about 3.5–4 g at its foot
  });
  it('gives airtime over the camelback: the track falls away faster than you do', () => {
    expect(S.upMin).toBeLessThan(-0.3); expect(S.at.upMin).toBe('the camelback'); expect(S.air).toBeGreaterThan(0.5);
  });
  it('holds you in your seat upside down at the top of the loop: v²/R more than g', () => {
    expect(S.top.uy).toBeLessThan(-0.9); expect(S.top.up).toBeGreaterThan(0.2); expect(S.top.v ** 2 / 8).toBeGreaterThan(g);
  });
  it('banks its turns for their speed: hardly anything sideways in the helix or the turn home', () => {
    expect(S.sideMax).toBeLessThan(0.5);
  });
  it('is held in the station until sent, then sent by its tyres and the chain', () => {
    const w = newRide(tr); w.auto = false; for (let i = 0; i < 2000; i++) stepRide(w, tr, 0.005, g); expect(w.phase).toBe('waiting'); expect(w.v).toBe(0);
    w.auto = true; w.dwell = 0; runRide(w, tr, 0.1, g); for (let i = 0; i < 60 * 15; i++) runRide(w, tr, 1 / 60, g);
    expect(w.phase).toBe('running'); expect(at(tr, w.s).kind).toBe('lift'); expect(w.v).toBeCloseTo(COASTER.chain, 5);
  });
});

describe('through a volcano', () => {
  const tr = makeCoaster({ volcano: true });
  it('runs its helix round inside the crater', () => {
    const V = tr.volcano!; expect(V).not.toBeNull();
    for (let i = 0; i < tr.p.length; i++) if (tr.piece[i] === 'the helix') expect(Math.hypot(tr.p[i]![0] - V.at[0], tr.p[i]![2] - V.at[2])).toBeLessThan(V.crater);
  });
  it('is what "build a roller coaster that goes through a volcano" makes: a ride, not a plain volcano', () => {
    const p = readPlace('build a roller coaster that goes through a volcano')!;
    expect(p.name).toBe('a roller coaster'); expect(p.props.some((x) => x.kind === 'coaster volcano')).toBe(true); expect(sayPlace(p)).toMatch(/^You are on a roller coaster: .*the helix inside a volcano/);
  });
  it('is a place asked for as people ask', () => {
    for (const w of ['ride a roller coaster', 'I want to ride a rollercoaster', "let's go on a roller coaster", 'take me to a theme park']) expect(readPlain(w).directive.act).toBe('place');
    expect(readPlace('take me to a theme park')!.name).toBe('a roller coaster');
  });
});
