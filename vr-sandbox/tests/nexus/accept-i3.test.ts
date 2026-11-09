// Integration of wave 11, group I3 (the bookkeeping and the AI): what the compose path's supply rule (agent.ts 5c) rests on,
// checked on its own. The supply is chosen by the motor's terminals (parts/power.ts psuFor); the lead it lays is P6's wire
// model (circuit.ts LEAD), so the circuit over supply, lead and motor stacked as the rule stacks them reads the lead as a
// wire of L / (σ A) and drives the motor by its own row. Acceptance 10 (accept-p10-ai.test.ts) runs the rule in a build.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf, specProblems } from '../../src/nexus/blocks';
import { made, stack, type Block } from '../../src/nexus/room';
import { MOTORS } from '../../src/data/motors';
import { LEAD, conductivityOf, leadRadius } from '../../src/nexus/circuit';
import { motorSize, psuFor } from '../../src/nexus/parts/power';

const node = async (id: string, set: Record<string, unknown> = {}, inputs: Record<string, unknown> = {}) => {
  const b = LIBRARY.get(id); if (!b) throw new Error(`no block ${id}`);
  return (await b.run!(inputs, { set: { ...defaultsOf(b), ...set } } as never)) as Record<string, any>;
};

describe('I3: the supply rule and the bookkeeping', () => {
  it('a supply chosen by the motor\'s voltage and current, said where it cannot be', () => {
    expect(psuFor(12).size).toBe('12 V 12.5 A');
    expect(psuFor(24, 6).size).toBe('24 V 6.5 A');
    expect(psuFor(24, 10).size).toBe('24 V 14.6 A');
    expect(psuFor(24, 20)).toMatchObject({ size: '24 V 14.6 A', says: expect.stringMatching(/rated below its 20 A/) });
    expect(psuFor(undefined).says).toMatch(/gives no voltage/);
    expect(psuFor(48).says).toMatch(/no row gives 48 V/);
  });

  it('the lead the rule lays is a wire to the circuit: supply, lead and a datasheet motor stacked, solved by the motor\'s own row', async () => {
    const m = MOTORS['motor.dc.coreless.d40-150w-24v']!, s = (await node('piece.psu', { size: psuFor(m.V, m.maxContinuousCurrent).size })).block as Block;
    const motor = (await node('piece.motor', { size: motorSize(m) })).block as Block;
    const b = stack('powered', 1, [{ b: s }, { b: made('motor supply lead', LEAD.mat, { cyl: [leadRadius(), LEAD.length] }) }, { b: motor }]);
    const r = await node('circuit.solve', { duty: 1, load: 0.05 }, { block: b });
    expect(r.refused, r.says).toBeUndefined();
    expect(r.wires.length).toBe(1);
    expect(r.wires[0].R).toBeCloseTo(LEAD.length / (conductivityOf('copper')!.sigma * LEAD.area), 12);
    expect(r.current).toBeGreaterThan(0); expect(r.speed).toBeGreaterThan(0);
  }, 30_000);

  it('the circuit node is specified, so navigation and the field checks read it', () => {
    expect(specProblems(LIBRARY.get('circuit.solve')!)).toEqual([]);
  });
});
