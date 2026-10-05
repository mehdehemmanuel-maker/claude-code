// Embodiment of anything (src/nexus/embody/any.ts): a car, a house and a flyer, each built as parts from what the
// generator derived of its ask, with no designer written for the thing by name; and what nothing designs yet, located.

import { describe, expect, it } from 'vitest';
import { car, house, printer } from '../../src/nexus/asked';
import { generate } from '../../src/nexus/manifold';
import { embodyAny } from '../../src/nexus/embody/any';
import { buildSteps, treeOf } from '../../src/nexus/embody/tree';
import { base, vehicle } from './families';

const val = (m: { values: { name: string; value: number }[] }, name: string) => m.values.find((v) => v.name === name)?.value ?? NaN;
const mass = (m: { parts: { mass: number }[] }) => m.parts.reduce((a, p) => a + p.mass, 0);

describe('embodiment of anything', () => {
  it('sends a printer to the printer\'s embodiment', () => {
    const i = printer(), m = embodyAny(i, generate(i))!;
    expect(m.hotEnd).not.toBeNull();
    expect(m.axes.length).toBeGreaterThanOrEqual(3);
  });

  it('builds a car from the car\'s ask: wheels, a motor at each driven wheel, brakes, a steered axle, a shell, a heat pump and a pack, every part held and every element designed or not chosen', () => {
    const i = car(), m = embodyAny(i, generate(i))!;
    const last = m.rounds.at(-1)!;
    expect(last.remedies).toEqual([]);
    expect(Math.abs(last.mass - m.rounds.at(-2)!.mass)).toBeLessThan(0.03 * last.mass + 0.05);
    // what it moves is what it carries and itself, the round before
    expect(val(m, 'mass it moves')).toBeCloseTo(400 + m.rounds.at(-2)!.mass, 3);
    expect(m.flaws.filter((f) => f.check === 'gap')).toEqual([]);
    expect(m.flaws.filter((f) => f.check === 'held')).toEqual([]);
    const ids = m.parts.map((p) => p.id);
    expect(ids.filter((id) => id.endsWith('/tyre'))).toHaveLength(4);
    expect(ids.filter((id) => id.endsWith('/brake-disc'))).toHaveLength(4);
    expect(new Set(ids.filter((id) => /\/motor\//.test(id)).map((id) => id.split('/')[0])).size).toBe(val(m, 'driven wheels'));
    for (const id of ['steering/rack', 'climate/heat-pump', 'battery/pack', 'body/roof']) expect(ids).toContain(id);
    // petrol is offered for the same store: not built, and said so
    expect(m.trace.some((t) => t.stage === 'choose' && /petrol/.test(t.says))).toBe(true);
    // the pack holds the energy asked
    const pack = m.parts.find((p) => p.id === 'battery/pack')!;
    const kWh = Number(pack.name.match(/([\d.]+) kWh/)![1]);
    expect(kWh * 3.6e6 * 0.9).toBeGreaterThanOrEqual(val(m, 'energy stored') * 0.999);
    // the force to accelerate is what the law says of the mass it moves
    expect(val(m, 'force to accelerate')).toBeCloseTo(val(m, 'mass it moves') * (2.78 + 0.01 * 9.80665 + 9.80665 * 0.06), 0);
    // assemblies by what they were designed in: a wheel with its motor as a subsystem
    const tree = treeOf(m.parts);
    const wheel = tree.children.find((c) => c.id === 'wheel-rear-left')!;
    expect(wheel.name).toBe('wheel rear left');
    expect(wheel.children.map((c) => c.id)).toContain('wheel-rear-left/motor');
  });

  it('frames a house from the members the generator sized: footings, joists, studs at their spacing, roof joists on bearing walls, insulated to its U values', () => {
    const i = house(), s = generate(i), m = embodyAny(i, s)!;
    expect(m.flaws.filter((f) => f.check === 'gap')).toEqual([]);
    expect(m.flaws.filter((f) => f.check === 'held')).toEqual([]);
    const count = (re: RegExp) => m.parts.filter((p) => re.test(p.id)).length;
    const sized = (id: string) => s.elements.find((e) => e.id === id)!.values.find((v) => v.name === 'members')!.value;
    expect(Math.abs(count(/^floor\/joist-/) - sized('members:inside:down'))).toBeLessThanOrEqual(2);
    expect(Math.abs(count(/^wall-[a-z]+\/stud-/) - sized('members:inside:side'))).toBeLessThanOrEqual(4);
    expect(Math.abs(count(/^roof\/joist-/) - sized('members:inside:up'))).toBeLessThanOrEqual(2);
    expect(count(/^bearing-wall-\d\/plate-top/)).toBe(s.elements.find((e) => e.id === 'members:inside:up')!.values.find((v) => /^support lines/.test(v.name))!.value);
    // insulation as thick as the U asks; heating makes up what the envelope and the air carry out
    expect(val(m, 'wall insulation')).toBeCloseTo(0.035 / 0.18, 6);
    expect(val(m, 'heating')).toBeGreaterThanOrEqual(val(m, 'heat lost through the envelope'));
    // it goes together from the ground up
    const steps = buildSteps(m.parts);
    expect(steps[0]!.node.startsWith('footings')).toBe(true);
    expect(steps.findIndex((x) => x.node.startsWith('roof'))).toBeGreaterThan(steps.findIndex((x) => x.node.startsWith('wall-front')));
  });

  it('flies a parcel: four rotors sized by momentum theory, motors, carbon arms and a pack, settling on its own mass', () => {
    const i = vehicle({ ...base, medium: 'air', mass: 2, speed: 15, range: 5000 }), m = embodyAny(i, generate(i))!;
    expect(m.rounds.at(-1)!.remedies).toEqual([]);
    expect(m.flaws.filter((f) => f.check === 'gap' || f.check === 'held' || f.check === 'mass')).toEqual([]);
    expect(m.parts.filter((p) => p.id.endsWith('/rotor'))).toHaveLength(4);
    const M = val(m, 'mass it moves'), T = (M * 9.80665) / 4, D = val(m, 'rotor diameter'), A = (Math.PI * D * D) / 4;
    expect(T / A).toBeCloseTo(250, 3);
    expect(val(m, 'hover power')).toBeCloseTo((4 * T ** 1.5) / Math.sqrt(2 * 1.2 * A) / 0.65, 3);
    expect(mass(m)).toBeLessThan(20);
  });

  it('says where it cannot yet build: a boat\'s push against water is a located gap, not a guess', () => {
    const i = vehicle({ ...base, medium: 'water' }), m = embodyAny(i, generate(i))!;
    const gaps = m.flaws.filter((f) => f.check === 'gap').map((f) => f.where);
    expect(gaps).toContain('thrust:the payload|the water');
  });
});
