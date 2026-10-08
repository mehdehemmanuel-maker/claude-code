// People by real physics: the rig's segments carry de Leva's shares of the body's mass and stand where its centre of mass
// stands (about 55 % of its height); a body gone slack falls under gravity and lies there; held by its joints' muscles
// alone it stands, and a fighter holds its guard; its strikes reach the speeds fists are measured at, their speed what
// the muscles' torques make of the arm's mass; and what it senses is read out as the facts its rules use. Laid on its
// back it lies there, soft, not counted as knocked down; a hand that grabs it lifts what it holds; its strength is what
// it is told.

import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/realize';
import { People, legsFor, STANCES } from '../../src/nexus/person';
import { centreOfMass, rigOf } from '../../src/nexus/life/segments';
import { layOut } from '../../src/nexus/anatomy';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const FIGHTER = { muscle: 1.3, fat: 0.6, mass: 84 };
const run = (w: People, s: number) => { worlds.add(w); for (let k = 0; k < s * 60; k++) w.step(1 / 60); };
const worlds = new Set<People>(); afterEach(() => { for (const w of worlds) w.dispose(); worlds.clear(); });

describe('a body as the segments physics moves', () => {
  it('carries de Leva\'s shares of its mass, its centre of mass about 55 % of its height up', () => {
    for (const sex of [0, 1]) {
      const b = layOut({ sex, mass: sex ? 60 : 73, height: sex ? 1.63 : 1.76 }), rig = rigOf(b);
      expect(Math.abs(rig.mass - b.params.mass) / b.params.mass, `sex ${sex}`).toBeLessThan(0.001); // de Leva's women's shares add to 0.9999 as published
      const h = centreOfMass(rig)[1] / b.H; expect(h).toBeGreaterThan(0.52); expect(h).toBeLessThan(0.58);
      expect(rig.joints.length).toBe(15); expect(rig.segments.length).toBe(16);
    }
    // a woman's muscle (0.7 of a man's, ICRP 89) makes her joints' torques that much of his
    expect(rigOf(layOut({ sex: 1, muscle: 0.7 })).strength).toBeCloseTo(0.7, 6);
  });
  it('puts both feet flat on the floor in a stance, the stride no longer than the ankles allow', () => {
    const rig = rigOf(layOut(FIGHTER)), legs = legsFor(rig, STANCES.guard);
    for (const a of ['ankleL', 'ankleR']) expect(legs[a]![0]).toBeLessThanOrEqual(20);
  });
});

describe('a body in the room, by real physics', () => {
  it('falls when it goes slack, and lies where it falls', () => {
    const w = new People(J, 9.80665, 3), p = w.add('a', {}, { x: 0, z: 0, yaw: 0 }); p.ask('go limp'); run(w, 2.5);
    expect(p.down()).toBe(true); expect(p.headY()).toBeLessThan(0.3);
  });
  it('stands by its joints alone, and a fighter holds its guard', () => {
    const w = new People(J, 9.80665, 3), a = w.add('a', {}, { x: -2, z: 0, yaw: 0 }), b = w.add('b', FIGHTER, { x: 2, z: 0, yaw: 0 }, { fighter: true }); run(w, 5);
    for (const p of [a, b]) { const s = p.sense(); expect(s.down, p.name).toBe(false); expect(Math.hypot(...s.off), p.name).toBeLessThan(0.08); }
  });
  it('throws a jab and a cross at the speeds fists are measured at, and stays on its feet', () => {
    for (const [move, lo, hi] of [['jab', 5, 10], ['cross', 7, 13]] as const) {
      const w = new People(J, 9.80665, 3), p = w.add('a', FIGHTER, { x: 0, z: 0, yaw: 0 }, { fighter: true }); p.target = { point: [0, 1.64, 0.68] }; run(w, 0.5);
      let peak = 0; p.ask(move);
      for (let k = 0; k < 60; k++) { w.step(1 / 60); for (const id of ['handL', 'handR']) { const v = p.parts.find((x) => x.seg.id === id)!.body.GetLinearVelocity(); peak = Math.max(peak, Math.hypot(v.GetX(), v.GetY(), v.GetZ())); } }
      expect(peak, move).toBeGreaterThan(lo); expect(peak, move).toBeLessThan(hi); expect(p.down(), move).toBe(false);
    }
  });
  it('lies where it is laid, soft, and is not counted as knocked down', () => {
    const w = new People(J, 9.80665, 3), p = w.add('a', {}, { x: 0, z: 0, yaw: 0 }); run(w, 0.5); p.ask('lie down on his back'); run(w, 3);
    expect(p.down()).toBe(true); expect(p.headY()).toBeLessThan(0.3); expect(p.power).toBeLessThan(0.5); expect(p.downFor).toBe(0);
    p.ask('get up'); expect(p.laid).toBe(false); expect(p.power).toBe(1);
  });
  it('is lifted where a hand holds it, and is as strong as it is told', () => {
    const w = new People(J, 9.80665, 3), p = w.add('a', {}, { x: 0, z: 0, yaw: 0 }); p.ask('on his back'); run(w, 2.5);
    const h0 = p.at('handL'), g = w.grab(h0, 0.05)!; expect(g.seg).toBe('handL');
    w.hold(g.id, [h0[0], 0.9, h0[2]]); run(w, 2.5); expect(p.at('handL')[1]).toBeGreaterThan(0.6);
    w.letGo(g.id); run(w, 2); expect(p.at('handL')[1]).toBeLessThan(0.4);
    p.ask('strength 150%'); expect(p.power).toBeCloseTo(1.5, 6); p.ask('weaker'); expect(p.power).toBeLessThan(1.5);
  });
  it('reads out what it senses as facts its rules can use', () => {
    const w = new People(J, 9.80665, 3), p = w.add('Kai', FIGHTER, { x: 0, z: 0, yaw: 0 }, { fighter: true }); p.target = { point: [0, 1.64, 0.68] }; run(w, 0.3);
    const f = w.facts(); for (const k of ['kai_reach', 'kai_open', 'kai_hurt', 'kai_down', 'kai_balance', 'kai_stamina']) expect(f, k).toHaveProperty(k);
    expect(f.kai_open).toBe(1); expect(f.people).toBe(1);
  });
});
