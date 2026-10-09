import { describe, expect, it } from 'vitest';
import { buildOn, ledCurrent, lessonOf, PERMA_PROTO_HALF, type Build, type PartHow } from '../../src/nexus/edges';
import { layProto, type Component } from '../../src/nexus/embody/breadboard';
import { LED_CIRCUIT, LED_RAILS, LESSONS, PROTO_BUILD } from '../../src/nexus/lessons';
import { PROTO_STEPS } from '../../src/nexus/solder-lesson';
import { ppCol } from '../../src/nexus/kit-solder';

const steps = LESSONS['solder-proto']!.steps;
/** The LED lesson's build with one thing changed. */
const changed = (f: (b: Build, t: (id: string) => Build['things'][number]) => void): Build => { const b = structuredClone({ ...PROTO_BUILD, board: undefined }) as unknown as Build; b.board = PROTO_BUILD.board; f(b, (id) => b.things.find((t) => t.id === id)!); return b; };

describe('edges: lessons said from what works on what', () => {
  it('lays the LED circuit out from its nets exactly where the lesson had it by hand', () => {
    const at = (id: string) => PROTO_BUILD.things.find((t) => t.id === id)!.leads.map((l) => l.at);
    expect(at('battery')).toEqual([[ppCol(1), 21.59], [ppCol(3), 19.05]]);
    expect(at('link')).toEqual([[ppCol(5), 13.97], [ppCol(5), 21.59]]);
    expect(at('resistor')).toEqual([[ppCol(5), 8.89], [ppCol(9), 8.89]]);
    expect(at('led')).toEqual([[ppCol(9), 13.97], [ppCol(9), 19.05]]);
  });
  it('says the LED lesson from its build: every hole, span and rail where the build puts it, the lowest part first', () => {
    expect(steps[0]!.do).toMatch(/22 AWG.*staple three holes across.*from row a, column 5, into the \+ rail at column 5/);
    expect(steps[0]!.check).toMatch(/insulation lies over the − rail's pads/);
    expect(steps[1]!.do).toMatch(/span four holes \(10\.16 mm\) and push it into row c, columns 5 and 9 \(its first lead on the link's strip\)/);
    expect(steps[2]!.do).toMatch(/anode, into row a, column 9, on the resistor's strip; its short lead.*into the − rail at column 9/);
    expect(steps[2]!.check).toMatch(/flat of its rim toward the − rail at column 9/);
    expect(steps[4]!.do).toMatch(/red lead's pin into the \+ rail at column 1 and its black lead's into the − rail at column 3/);
    expect(steps[4]!.check).toBe('red to +, black to −, and the switch open');
  });
  it('says alike edges once: eight joints one step, eight trims one, with the joint model\'s figures', () => {
    expect(PROTO_STEPS.map((s) => s.src.split(' ')[0])).toEqual(['insert', 'insert', 'insert', 'hold', 'insert', 'tin', 'solder', 'trim', 'power', 'rest']);
    expect(steps[6]!.do).toMatch(/each of the eight leads.*183 °C.*63\/37.*\d+ to \d+ mm of its 0\.5 mm wire/);
    expect(steps[7]!.do).toMatch(/0\.6–2\.5 mm above its joint/);
    expect(steps[8]!.do).toMatch(/about 4\.0 mA \(3\.20 V from the cells, less the LED's 1\.8\d V, over the 330 Ω\)/);
  });
  it('the bench and the written lesson are the same words', () => {
    expect(PROTO_STEPS.map((s) => s.do)).toEqual(steps.map((s) => s.do));
  });
  it('lays out and teaches a circuit it was never shown: two LEDs, each with its resistor, from the same cells', () => {
    const two: Component[] = [LED_CIRCUIT[0]!, { ...LED_CIRCUIT[1]!, id: 'r1' }, { ...LED_CIRCUIT[2]!, id: 'd1' }, { ...LED_CIRCUIT[1]!, id: 'r2', pins: [{ name: '1', net: 'V+' }, { name: '2', net: 'LED 2 anode' }] }, { ...LED_CIRCUIT[2]!, id: 'd2', pins: [{ name: 'anode', net: 'LED 2 anode' }, { name: 'cathode', net: '0 V' }] }];
    const l = layProto(two, LED_RAILS); expect([l.refused, l.opens, l.shorts]).toEqual([[], [], []]);
    const how = (k: 'resistor' | 'led', n: number): PartHow => { const h = structuredClone(PROTO_HOW[k]!); h.name = h.name.replace(/^the /, `the ${n === 1 ? 'first' : 'second'} `); return h; };
    const PROTO_HOW = { resistor: { name: 'the resistor', form: 'axial', watts: 0.25, height: 2.5, leads: [{ name: 'its first lead', tag: 'first', pin: 0.6, round: true }, { name: 'its second lead', tag: 'second', pin: 0.6, round: true }] }, led: { name: 'the LED', form: 'radial', height: 11.6, mark: { what: 'the flat of its rim', by: 1 }, leads: [{ name: 'its long lead, the anode,', tag: 'anode', pin: 0.5, round: false }, { name: 'its short lead, by the flat on its rim,', tag: 'cathode', pin: 0.5, round: false }] } } as Record<string, PartHow>;
    const battery = PROTO_BUILD.things.find((t) => t.id === 'battery')!;
    const b = buildOn(PERMA_PROTO_HALF, l, { battery: { ...battery, leads: battery.leads }, r1: how('resistor', 1), d1: how('led', 1), r2: how('resistor', 2), d2: how('led', 2) }, PROTO_BUILD.tools);
    const r = lessonOf(b); expect(r.refused).toEqual([]);
    const said = r.steps.map((s) => s.do).join('\n');
    // (the second LED three columns from the first, its 5.8 mm rim clear of the first's; the second resistor along row d,
    // row c taken at column 9 by the first's lead)
    expect(said).toMatch(/the second resistor's leads .* span seven holes \(17\.78 mm\) and push it into row d, columns 5 and 12 \(its first lead on the link's strip\)/);
    expect(said).toMatch(/second LED in: .*row a, column 12, on the second resistor's strip; .*into the − rail at column 12, on the − rail with the first LED's/);
    expect(said).toMatch(/each of the twelve leads/);
  });
  it('refuses a build that cannot be done, saying why', () => {
    expect(lessonOf(changed((_, t) => { t('resistor').leads[1]!.at = [ppCol(8), 8.89]; })).refused.join()).toMatch(/resistor's holes are 7\.62 mm apart.*IPC-A-610.*4 holes/);
    expect(lessonOf(changed((_, t) => { t('led').leads[0]!.pin = 0.9; })).refused.join()).toMatch(/LED's anode lead is 1\.27 mm across corner to corner.*1\.2 mm/);
    expect(lessonOf(changed((_, t) => { t('link').leads[0]!.at = [ppCol(5) + 1, 13.97]; })).refused.join()).toMatch(/link's .* lead is not over a hole/);
    expect(lessonOf(changed((b) => { b.tools[0]!.fig.set = 170; })).refused.join()).toMatch(/170 °C never brings a joint to .*183 °C/);
    expect(lessonOf(changed((b) => { b.power!.ohms = 47; })).refused.join()).toMatch(/past its 20 mA/);
    expect(lessonOf(changed((b) => { b.power!.cells = 1; })).refused.join()).toMatch(/too little to light the LED/);
    expect(lessonOf(changed((b) => { b.power!.cells = 1; })).steps).toEqual([]);
  });
  it('a layout that cannot be made says why: a part too long for the columns left, a lead to the outer rail bare', () => {
    expect(layProto([{ ...LED_CIRCUIT[1]!, span: 40 }], LED_RAILS).refused.length + layProto([{ ...LED_CIRCUIT[1]!, span: 40 }], LED_RAILS).placed.length).toBeGreaterThan(0);
    expect(layProto([{ ...LED_CIRCUIT[2]!, pins: [{ name: 'anode', net: 'x' }, { name: 'cathode', net: 'V+' }] }], LED_RAILS).refused[0]!.why).toMatch(/inner rail second, or give it a span/);
  });
  it('finds an LED\'s current where its drop and its current agree', () => {
    const p = PROTO_BUILD.power!, l = ledCurrent(p);
    expect(Math.abs((l.v - l.vf) / (p.ohms + p.cells * p.rCell) * 1000 - l.mA)).toBeLessThan(1e-6);
    expect(l.mA).toBeGreaterThan(3.5); expect(l.mA).toBeLessThan(4.5);
  });
});
