// Bar games by real physics: a pool ball rolls as far as the cloth's rolling resistance lets it (s = v² / 2μg), stops
// another dead when it hits it full (equal masses, restitution 0.93), and drops into the pocket it is sent at; a dart
// aimed lands where it was aimed, a casual thrower's spread scatters it, and it scores by the board's rings.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/substrate/realize';
import { aimDart, dartFlight, Pool, POOL, POCKETS, rack, targetOn, throwDart } from '../../src/nexus/world/games';
import { DARTBOARD } from '../../src/nexus/world/games';

let J: Jolt; beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const run = (p: Pool, s: number) => { for (let k = 0; k < s * 60; k++) p.step(1 / 60); };

describe('pool by the physics', () => {
  it('racks fifteen balls and the cue ball, touching, on the bed', () => {
    const r = rack(); expect(r.length).toBe(16); expect(r[1]!.at[0]).toBeCloseTo(POOL.L / 4, 6); expect(Math.hypot(r[2]!.at[0] - r[3]!.at[0], r[2]!.at[2] - r[3]!.at[2])).toBeCloseTo(2 * POOL.r, 6);
  });
  it('slides a struck ball until it rolls at 5/7 of its speed, then rolls as far as the cloth lets it', () => {
    const p = new Pool(J, 9.80665, { rack: false }); run(p, 0.3); const x0 = p.where()[0]!.at[0]; p.shoot(0, 0.45); run(p, 7);
    const g = 9.80665, v0 = 0.45, v1 = (5 / 7) * v0, want = (v0 ** 2 - v1 ** 2) / (2 * POOL.slide * g) + v1 ** 2 / (2 * POOL.roll * g), s = p.where()[0]!.at[0] - x0;
    expect(s).toBeGreaterThan(want * 0.9); expect(s).toBeLessThan(want * 1.1); p.dispose();
  });
  it('pots a few balls on a break, as breaks do, not most of them', () => {
    const counts: number[] = []; for (let k = 0; k < 6; k++) { const p = new Pool(J); run(p, 0.3); p.shoot((p.aimAt(1) ?? 0) + (k - 3) * 0.004, 8); run(p, 10); counts.push(p.potted.filter((n) => n !== 0).length); p.dispose(); }
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length; expect(mean).toBeLessThan(5); expect(Math.max(...counts)).toBeLessThan(9);
  });
  it('sends the ball it hits full on along its line, and pots what is sent at a pocket', () => {
    const p = new Pool(J); run(p, 0.3); const h = p.aimAt(1)!; expect(Math.abs(h)).toBeLessThan(1e-6); p.shoot(h, 3); run(p, 0.8);
    const moved = p.where().filter((b) => b.n !== 0 && !b.potted && (Math.abs(b.at[0] - rack()[b.n]!.at[0]) > 0.01 || Math.abs(b.at[2] - rack()[b.n]!.at[2]) > 0.01)); expect(moved.length).toBeGreaterThan(5); p.dispose(); // the break spreads the rack
    const q = new Pool(J, 9.80665, { rack: false }); run(q, 0.3); const c = q.where()[0]!.at, [px, pz] = POCKETS[0]!; q.shoot(Math.atan2(pz - c[2], px - c[0]), 1.5); run(q, 4); expect(q.potted).toContain(0); q.dispose();
  });
});
describe('darts by the physics', () => {
  it('lands a dart where it was aimed, and scores it by the board', () => {
    const from: [number, number, number] = [0, 1.6, 0], to: [number, number, number] = [DARTBOARD.line, DARTBOARD.height + 0.103, 0.0];
    const v = aimDart(from, to, 6, 9.80665)!, f = dartFlight(from, v, { x: DARTBOARD.line, y: DARTBOARD.height, z: 0 }, 9.80665)!;
    expect(f.hit[0]).toBeCloseTo(0, 4); expect(f.hit[1]).toBeCloseTo(0.103, 4); expect(f.t).toBeGreaterThan(0.35); expect(f.t).toBeLessThan(0.45); // 2.37 m at about 6 m/s
    expect(targetOn('treble 20')![1]).toBeCloseTo(0.103, 3); expect(targetOn('double 6')![0]).toBeCloseTo(0.166, 3); expect(targetOn('bull')).toEqual([0, 0]);
    let s = 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    expect(throwDart(targetOn('treble 20')!, r, 9.80665, 1000).score).toBe(60); // a perfect hand
    const casual = Array.from({ length: 200 }, () => throwDart(targetOn('bull')!, r)), bulls = casual.filter((d) => d.score >= 25).length;
    expect(bulls).toBeGreaterThan(5); expect(bulls).toBeLessThan(150); expect(casual.every((d) => d.hit !== null)).toBe(true);
  });
});
