// Laws chained through the quantities they share (docs/REALITY.md, step 4): problems across fields with known answers,
// worked out by the law graph from what is given, each step said, every assumption said, disagreements shown.

import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { chain, setting } from '../../src/nexus/lawgraph';
import { BOOK } from '../../src/nexus/book';
import { runBlock } from '../../src/nexus/dataflow';

const k = (name: string, quantity: string, v: number, unit: string, pins?: string[]) => ({ name, quantity, d: setting(name, v, unit, 'test'), ...(pins ? { pins } : {}) });

describe('a chain of laws to what is wanted', () => {
  it('a steel rod holding a tonne: weight, stress, strain (mechanics into materials), gravity said as assumed', () => {
    const c = chain([k('mass', 'mass', 1000, 'kg'), k('section area', 'area', 1e-4, 'm^2'), k('modulus', 'modulus', 200e9, 'Pa')], { quantity: 'strain' });
    expect(c.result!.value).toBeCloseTo((1000 * 9.80665) / 1e-4 / 200e9, 15);
    expect(c.steps.map((s) => s.law)).toEqual(['weight', 'stress.axial', 'hooke']);
    // Hooke's law solved for its input, not its output
    expect(c.steps[2]!.solved).toBe('eps');
    expect(c.assumed).toContain('gravity is standard gravity, 9.80665 m/s² (ISO 80000-3)');
    expect(c.assumed.some((a) => /weight is taken as the force/.test(a))).toBe(true);
    expect(c.weakestKind).toBe('constitutive');
  });
  it('a wire carrying current: its resistance, its heat, its rise over the air (electrical into thermal), each area pinned to its own law', () => {
    const c = chain([k('resistivity', 'resistivity', 1.68e-8, 'ohm m'), k('length', 'length', 10, 'm'), k('section area', 'area', 1e-6, 'm^2', ['wire.resistance.A']), k('current', 'current', 5, 'A'), k('surface area', 'area', 0.01, 'm^2', ['convection.A']), k('heat transfer coefficient', 'heat-transfer-coefficient', 10, 'W/m^2 K')], { quantity: 'temperature-difference' });
    const R = (1.68e-8 * 10) / 1e-6, P = 25 * R;
    expect(c.result!.value).toBeCloseTo(P / (10 * 0.01), 9);
    expect(c.steps.map((s) => s.law)).toEqual(['wire.resistance', 'joule', 'convection']);
  });
  it("a length is never joined to a length of another role by its quantity alone: the wire's length is not a plate's size", () => {
    const c = chain([k('length', 'length', 10, 'm'), k('heat transfer coefficient', 'heat-transfer-coefficient', 10, 'W/m^2 K')], { quantity: 'temperature-difference' });
    expect(c.result).toBeNull(); expect(c.says).toMatch(/no chain of laws reaches/);
  });
  it("a pendulum's length from its period: a law solved backwards", () => {
    const c = chain([k('period', 'time', 2, 's')], { quantity: 'length' });
    expect(c.result!.value).toBeCloseTo(9.80665 / Math.PI ** 2, 9);
    expect(c.weakestKind).toBe('approximation');
  });
  it('two laws sharing two unknowns, solved together: voltage and current from power and resistance', () => {
    const laws = BOOK.filter((l) => ['ohm', 'power.electric'].includes(l.id));
    const c = chain([k('power', 'power', 100, 'W'), k('resistance', 'resistance', 4, 'ohm')], { quantity: 'current' }, { laws });
    expect(c.result!.value).toBeCloseTo(5, 9);
    expect(c.steps[0]!.lawName).toMatch(/with/);
  });
  it('inputs that contradict a law are shown, not smoothed over: a mass and a weight that do not agree', () => {
    const c = chain([k('mass', 'mass', 10, 'kg'), k('weight', 'force', 50, 'N'), k('section area', 'area', 1e-4, 'm^2')], { quantity: 'stress' });
    expect(c.result!.value).toBeCloseTo(50 / 1e-4, 6);
    expect(c.disagreements.some((d) => /Weight gives weight = 98\.07 N; the chain has 50 N/.test(d))).toBe(true);
  });
});

describe('the law.solve node', () => {
  it('knowns written one a line, a target, the chain and its assumptions out', async () => {
    const r = await runBlock('law.solve', { knowns: 'mass = 1000 kg\nsection area = 1 cm^2\nmodulus = 200 GPa', target: 'strain' });
    expect(r.value as number).toBeCloseTo(4.903325e-4, 10);
    expect(String(r.chain)).toMatch(/Hooke[\s\S]*Axial stress[\s\S]*Weight/);
    expect(r.assumed as string[]).toContain('gravity is standard gravity, 9.80665 m/s² (ISO 80000-3)');
  });
});
