import { describe, expect, it } from 'vitest';
import { ledCurrent, lessonOf, type Build } from '../../src/nexus/edges';
import { LESSONS, PROTO_BUILD } from '../../src/nexus/lessons';
import { PROTO_STEPS } from '../../src/nexus/solder-lesson';
import { ppCol } from '../../src/nexus/kit-solder';

const steps = LESSONS['solder-proto']!.steps;
/** The LED lesson's build with one thing changed. */
const changed = (f: (b: Build) => void): Build => { const b = structuredClone({ ...PROTO_BUILD, board: undefined }) as unknown as Build; b.board = PROTO_BUILD.board; f(b); return b; };

describe('edges: lessons said from what works on what', () => {
  it('says the LED lesson from its build: every hole, span and rail where the build puts it', () => {
    expect(steps[0]!.do).toMatch(/span four holes \(10\.16 mm\) and push it into row c, columns 5 and 9/);
    expect(steps[1]!.do).toMatch(/anode, into row a, column 9, on the resistor's strip; its short lead.*into the − rail at column 9/);
    expect(steps[1]!.check).toMatch(/flat of its rim toward the − rail at column 9/);
    expect(steps[2]!.do).toMatch(/22 AWG.*staple three holes across.*from row a, column 5, into the \+ rail at column 5/);
    expect(steps[2]!.check).toMatch(/insulation lies over the − rail's pads/);
    expect(steps[4]!.do).toMatch(/red lead's pin into the \+ rail at column 1 and its black lead's into the − rail at column 3/);
    expect(steps[4]!.check).toBe('red to +, black to −, and the switch open');
  });
  it('says alike edges once: eight joints one step, eight trims one, with the joint model\'s figures', () => {
    const k = PROTO_STEPS.map((s) => s.src.split(' ')[0]);
    expect(k).toEqual(['insert', 'insert', 'insert', 'hold', 'insert', 'tin', 'solder', 'trim', 'power', 'rest']);
    expect(steps[6]!.do).toMatch(/each of the eight leads.*183 °C.*63\/37.*\d+ to \d+ mm of its 0\.5 mm wire/);
    expect(steps[7]!.do).toMatch(/0\.6–2\.5 mm above its joint/);
    expect(steps[8]!.do).toMatch(/about 4\.0 mA \(3\.20 V from the cells, less the LED's 1\.8\d V, over the 330 Ω\)/);
  });
  it('the bench and the written lesson are the same words', () => {
    expect(PROTO_STEPS.map((s) => s.do)).toEqual(steps.map((s) => s.do));
  });
  it('refuses a build that cannot be done, saying why', () => {
    expect(lessonOf(changed((b) => { b.things[0]!.leads[1]!.at = [ppCol(8), 8.89]; })).refused.join()).toMatch(/resistor's holes are 7\.62 mm apart.*IPC-A-610.*4 holes/);
    expect(lessonOf(changed((b) => { b.things[1]!.leads[0]!.pin = 0.9; })).refused.join()).toMatch(/LED's anode lead is 1\.27 mm across corner to corner.*1\.2 mm/);
    expect(lessonOf(changed((b) => { b.things[2]!.leads[0]!.at = [ppCol(5) + 1, 13.97]; })).refused.join()).toMatch(/link's row a lead is not over a hole/);
    expect(lessonOf(changed((b) => { b.tools[0]!.fig.set = 170; })).refused.join()).toMatch(/170 °C never brings a joint to .*183 °C/);
    expect(lessonOf(changed((b) => { b.power!.ohms = 47; })).refused.join()).toMatch(/past its 20 mA/);
    expect(lessonOf(changed((b) => { b.power!.cells = 1; })).refused.join()).toMatch(/too little to light the LED/);
    expect(lessonOf(changed((b) => { b.power!.cells = 1; })).steps).toEqual([]);
  });
  it('finds an LED\'s current where its drop and its current agree', () => {
    const p = PROTO_BUILD.power!, l = ledCurrent(p);
    expect(Math.abs((l.v - l.vf) / (p.ohms + p.cells * p.rCell) * 1000 - l.mA)).toBeLessThan(1e-6);
    expect(l.mA).toBeGreaterThan(3.5); expect(l.mA).toBeLessThan(4.5);
  });
});
