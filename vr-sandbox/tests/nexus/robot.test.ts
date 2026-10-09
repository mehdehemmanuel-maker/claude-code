import { describe, expect, it } from 'vitest';
import { ARMS, canDo, CHANGER, HANDS, pixelsAcross, robotFor, robotWords, SENSORS, TASKS, type Robot } from '../../src/nexus/robot';

const task = (id: string) => TASKS.find((t) => t.id === id)!, part = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id)!;

describe('the robot: what it can do, by its parts\' own figures', () => {
  it('designs the robot the user asked for and says yes to every task, with what does each', () => {
    const d = robotFor(['weld', 'solder', 'type', 'see', 'hear', 'smell', 'regrip', 'grab']);
    expect(d.parts.join()).toMatch(/two Universal Robots' UR5e arms.*RH56DFX.*QC-11/);
    for (const [id, c] of Object.entries(d.can)) expect(c.ok, `${id}: ${c.refused.join('; ')}`).toBe(true);
    expect(d.can.weld!.uses.join()).toMatch(/MIG torch through ATI's QC-11 \(1\.4\d kg of its 5\)/);
    expect(d.can.solder!.steps[0]).toMatch(/pen grip/); expect(d.can.solder!.steps.join(' ')).toMatch(/Solder each of the eight leads/);
    expect(d.can.hear!.uses.join()).toMatch(/27 dB above its own noise/);
  });
  it('refuses what a small arm and a gripper cannot do, and says why', () => {
    const small: Robot = { name: 'the small robot', arms: [{ arm: part(ARMS, 'meca500'), hand: part(HANDS, '2f-85'), changer: false }], senses: [part(SENSORS, 'cam3')] };
    const s = canDo(small, task('solder')).refused.join(' | ');
    expect(s).toMatch(/takes 2 hands; the small robot has 1/); expect(s).toMatch(/cannot hold the Pinecil in a pen grip/); expect(s).toMatch(/1\.00 kg: Mecademic Meca500 carries 0\.5 kg/);
    expect(canDo(small, task('weld')).refused.join()).toMatch(/bolts to the wrist: the small robot needs a tool changer/);
    expect(canDo(small, task('type')).refused.join()).toMatch(/no finger to press a key with/);
    expect(canDo(small, task('smell')).refused.join()).toMatch(/no sensor for it \(Bosch's BME688\)/);
    expect(canDo({ ...small, arms: [{ ...small.arms[0]!, arm: part(ARMS, 'ur5e'), changer: true }] }, task('weld')).ok).toBe(true);
  });
  it('sees by its pixels: a millimetre at half a metre from the Camera Module 3, not from the depth camera', () => {
    expect(pixelsAcross(part(SENSORS, 'cam3'), 1, 500)).toBeGreaterThan(3); expect(pixelsAcross(part(SENSORS, 'd435'), 1, 500)).toBeLessThan(3);
    expect(CHANGER.payload).toBe(16);
  });
  it('answers in words', () => {
    expect(robotWords('design a robot that can weld, solder and type on a computer')).toMatch(/^A robot for that: two Universal Robots' UR5e arms.*MIG weld a seam: yes/);
    expect(robotWords('hello')).toBeNull();
  });
});
