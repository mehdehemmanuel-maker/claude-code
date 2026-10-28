// What makes the forge alive: rules that start on what happens, the weather it reads, a robot that feels, moves as a
// machine moves and practises; and nodes that may be duplicated.

import { describe, expect, it } from 'vitest';
import { Servo, QServo, wheelSpeeds, pitchOf } from '../../src/nexus/motion';
import { freeName, type Board } from '../../src/nexus/boards';



describe('moving as a machine moves', () => {
  it('a servo speeds up no faster than it may, runs no faster than its top speed, and stops on its target', () => {
    const s = new Servo(0, 2, 4); let vmax = 0, last = 0, amax = 0;
    for (let i = 0; i < 400; i++) { s.step(1, 0.01); vmax = Math.max(vmax, Math.abs(s.vel)); if (s.pos !== 1) amax = Math.max(amax, Math.abs(s.vel - last) / 0.01); last = s.vel; }
    expect(s.pos).toBe(1); expect(s.vel).toBe(0); expect(vmax).toBeLessThanOrEqual(2 + 1e-9); expect(amax).toBeLessThanOrEqual(4 + 1e-6);
    // the time a trapezoid takes over 1 m at 2 m/s and 4 m/s² (a triangle, as it never reaches 2 m/s): 2 √(d / a) = 1 s
    const t = new Servo(0, 2, 4); let k = 0; while (t.pos !== 1 && k < 1000) { t.step(1, 0.001); k++; } expect(k * 0.001).toBeCloseTo(1, 1);
  });
  it('a turning joint steps as far as its profile lets, never past its target', () => {
    const q = new QServo(1, 2); let left = 1, steps = 0; while (left > 1e-6 && steps < 5000) { left -= q.step(left, 0.01); steps++; }
    expect(left).toBeLessThan(1e-6); expect(steps).toBeGreaterThan(100);
  });
  it('a differential drive turns its wheels opposite ways to turn in place, and alike to go straight', () => {
    const [l, r] = wheelSpeeds(0, 1, 0.5, 0.1); expect(l).toBeCloseTo(-2.5); expect(r).toBeCloseTo(2.5);
    const [l2, r2] = wheelSpeeds(1, 0, 0.5, 0.1); expect(l2).toBeCloseTo(10); expect(r2).toBeCloseTo(10);
    expect(pitchOf(-2)).toBeGreaterThan(0); expect(pitchOf(50)).toBe(-0.06);
  });
});



describe('nodes that may be duplicated', () => {
  const b: Board = { title: 't', nodes: { a: { label: 'Check', step: { kind: 'check', what: 'flaws = 0' }, x: 10, y: 20 }, b: { label: 'Run' }, c: { label: 'Check 2' } }, edges: { e1: { from: 'b', to: 'a', rel: 'flows to' } } };
  it('a name already on the board is numbered, the next free number', () => {
    expect(freeName(b, 'Run')).toBe('Run 2'); expect(freeName(b, 'Check')).toBe('Check 3'); expect(freeName(b, 'New')).toBe('New');
  });
  });
