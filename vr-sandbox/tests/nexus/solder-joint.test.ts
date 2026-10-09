import { describe, expect, it } from 'vitest';
import { ALLOYS, freshJoint, grade, idealVolume, PICO_PIN, step, timeToMelt, type Hands, type JointState } from '../../src/nexus/solder-joint';

/** The hands held so for `s` seconds, solder fed at `rate` mm³/s: the joint after. */
function hold(j: JointState, h: Omit<Hands, 'feed'>, s: number, rate = 0): JointState {
  const dt = 0.02; for (let t = 0; t < s - 1e-9; t += dt) j = step(j, { ...h, feed: rate * dt }, dt); return j;
}
const tinned = { touching: true, tip: 330, tinned: true }, away = { touching: false, tip: 330, tinned: true };

describe('a hand-soldered through-hole joint', () => {
  it('melts its solder about a second after a tinned 330 °C tip meets it, and barely ever through a dry one', () => {
    const wet = timeToMelt(330, true), dry = timeToMelt(330, false);
    expect(wet).toBeGreaterThan(0.7); expect(wet).toBeLessThan(1.6);
    expect(dry).toBeGreaterThan(5 * wet);
    expect(timeToMelt(250, false)).toBe(Infinity);
  });
  it('holds as much solder as a hole filled round its pin and a concave fillet: under a cubic millimetre for a Pico pin', () => {
    const v = idealVolume(PICO_PIN); expect(v).toBeGreaterThan(0.4); expect(v).toBeLessThan(1.2);
  });
  it('is good heated first, then fed its volume, then left to cool', () => {
    const v = idealVolume(PICO_PIN);
    let j = hold(freshJoint(), tinned, 1.5); expect(j.T).toBeGreaterThan(ALLOYS.Sn60Pb40!.liquidus);
    j = hold(j, tinned, 0.5, v / 0.5); j = hold(j, away, 3);
    const g = grade(j); expect(g.grade).toBe('good'); expect(j.T).toBeLessThan(ALLOYS.Sn60Pb40!.solidus);
  });
  it('is cold when the solder is fed before the joint is hot', () => {
    const v = idealVolume(PICO_PIN); let j = hold(freshJoint(), tinned, 0.3, v / 0.3);
    expect(grade(j).grade).toBe('cold'); j = hold(j, away, 2); expect(grade(j).grade).toBe('cold');
  });
  it('is too little or too much by its fill', () => {
    const v = idealVolume(PICO_PIN), hot = hold(freshJoint(), tinned, 1.5);
    expect(grade(hold(hot, tinned, 0.3, (0.3 * v) / 0.3)).grade).toBe('too little');
    expect(grade(hold(hot, tinned, 0.6, (2.2 * v) / 0.6)).grade).toBe('too much');
  });
  it('is overheated when held over 300 °C for more than five seconds (a 400 °C tip held on)', () => {
    const v = idealVolume(PICO_PIN); let j = hold(freshJoint(), { ...tinned, tip: 400 }, 1.5); j = hold(j, { ...tinned, tip: 400 }, 0.4, v / 0.4);
    j = hold(j, { ...tinned, tip: 400 }, 9); expect(grade(j).grade).toBe('overheated');
    // (at 330 °C it never gets there: its steady temperature is under 300)
    let k = hold(freshJoint(), tinned, 20); expect(k.hotFor).toBe(0);
  });
  it('says nothing is soldered before any solder reaches it', () => { expect(grade(freshJoint()).grade).toBe('not soldered'); });
});
