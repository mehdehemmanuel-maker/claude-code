// Package P6 of plan/AUDIT.md: electrical (acceptance test 6 of the directive of 2026-11-07). A supply, a driver and a
// motor made by their piece nodes, wired by copper leads, put together by the room's Stack; the circuit read from the
// block's power lines and solved: the stall current held at the driver's limit; at a load the motor's own row's laws,
// V = I R + K_e ω and T = K_t I, to 1e-9; a 12 V motor on a 24 V supply warned or refused, with why.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import { made, stack, type Block } from '../../src/nexus/room';
import { MOTORS } from '../../src/data/motors';
import { motorModel, windingR } from '../../src/engineering/dcmotor';
import { AMBIENT } from '../../src/engineering/thermal';
import { conductivityOf } from '../../src/nexus/circuit';
import { motorSize } from '../../src/nexus/parts/power';

const node = async (id: string, set: Record<string, unknown> = {}, inputs: Record<string, unknown> = {}) => {
  const b = LIBRARY.get(id); if (!b) throw new Error(`no block ${id}`);
  return (await b.run!(inputs, { set: { ...defaultsOf(b), ...set } } as never)) as Record<string, any>;
};
// (a lead of 1.5 mm² copper (a nominal section of IEC 60228), 300 mm long (typical of a bench lead): one core of its pair drawn)
const AREA = 1.5e-6, LEN = 0.3;
const lead = (name: string) => made(name, 'copper', { cyl: [Math.sqrt(AREA / Math.PI), LEN] });
const RE40_24 = MOTORS['motor.dc.coreless.d40-150w-24v']!, RE40_12 = MOTORS['motor.dc.coreless.d40-150w-12v']!;
async function wired(supply: string, driver: string, motor: string): Promise<Block> {
  const s = (await node('piece.psu', { size: supply })).block as Block, d = (await node('piece.driver', { size: driver })).block as Block, m = (await node('piece.motor', { size: motorSize(MOTORS[motor]!) })).block as Block;
  return stack('drive', 1, [{ b: s }, { b: lead('supply lead') }, { b: d }, { b: lead('motor lead') }, { b: m }]);
}

describe('P6: electrical', () => {
  it('acceptance 6', async () => {
    const b = await wired('24 V 6.5 A', '10 A', RE40_24.id);
    // the terminals are lines of kind power with their size, the motor's linked to its row
    const lines = b.pieces.flatMap((p) => p.lines).filter((l) => l.kind === 'power' || l.kind === 'signal');
    expect(lines.map((l) => l.port).sort()).toEqual(['10 A driver PCB/in', '10 A driver PCB/out', '10 A driver PCB/pwm', '24 V 6.5 A supply case/out', `${motorSize(RE40_24)} motor can/terminals`].sort());
    const term = lines.find((l) => l.port.endsWith('/terminals'))!;
    expect(term.size).toEqual({ V: 24, A: 6, pins: 2 }); expect(term.std).toBe(`data/motors.ts ${RE40_24.id}`);
    const m = motorModel(RE40_24);

    // held still: the stall current is the driver's limit
    const stall = await node('circuit.solve', { duty: 1, load: m.stallTorque }, { block: b });
    console.log('stall:', stall.says);
    expect(stall.refused).toBeUndefined(); expect(stall.stalled).toBe(true); expect(stall.limited).toBe('driver');
    expect(stall.current).toBeCloseTo(10, 9); expect(stall.speed).toBe(0);
    expect(24 / m.R25).toBeGreaterThan(10); // (unlimited, its winding alone would take V / R)

    // the wires: each core L / (σ A), σ copper's from the materials table
    const sigma = conductivityOf('copper')!.sigma, Rcore = LEN / (sigma * AREA);
    expect(stall.wires.length).toBe(2); for (const w of stall.wires) expect(w.R).toBeCloseTo(Rcore, 12);

    // at a load: the motor's own laws hold to 1e-9, and power balances (an ideal driver)
    const T = 0.05 /* N m, a light load (typical; below the row's own stall torque) */, run = await node('circuit.solve', { duty: 0.8, load: T }, { block: b });
    console.log('run:', run.says);
    expect(run.refused).toBeUndefined(); expect(run.stalled).toBe(false); expect(run.limited).toBe('none');
    const { current: I, voltage: V, speed: w, torque } = run as { current: number; voltage: number; speed: number; torque: number };
    expect(run.motor).toMatchObject({ R: RE40_24.published.terminalR, Kt: RE40_24.published.torqueConstant, Ke: RE40_24.published.torqueConstant });
    expect(Math.abs(V - (I * m.R25 + m.Kt * w))).toBeLessThan(1e-9);
    expect(Math.abs(torque - m.Kt * I)).toBeLessThan(1e-9);
    expect(Math.abs(torque - (T + m.Tf))).toBeLessThan(1e-9);
    expect(w).toBeGreaterThan(0); expect(w).toBeLessThan(m.noLoadSpeed);
    expect(Math.abs(run.power.supply - (V * I + run.power.wires))).toBeLessThan(1e-9);
    const motorT = run.terminals.find((t: { port: string }) => t.port.endsWith('/terminals'));
    expect(Math.abs(motorT.across - V)).toBeLessThan(1e-12);

    // a 12 V motor on a 24 V supply: warned within its rating, refused past it, each with why
    const b12 = await wired('24 V 6.5 A', '10 A', RE40_12.id);
    const over = await node('circuit.solve', { duty: 0.8, load: T }, { block: b12 });
    console.log('12 V at 0.8:', over.says);
    expect(over.refused).toMatch(/rated 12 V/); expect(over.refused).toMatch(/24 V/); expect(over.refused).toMatch(/0\.5/);
    const within = await node('circuit.solve', { duty: 0.4, load: T }, { block: b12 });
    console.log('12 V at 0.4:', within.says);
    expect(within.refused).toBeUndefined(); expect(within.warnings.join(' ')).toMatch(/rated 12 V.*24 V/);
    const m12 = motorModel(RE40_12);
    expect(Math.abs(within.voltage - (within.current * m12.R25 + m12.Kt * within.speed))).toBeLessThan(1e-9);
  }, 30000);

  it('the motor pieces carry their terminals as power lines', async () => {
    const lineOf = async (id: string, set: Record<string, unknown>, port: string) => ((await node(id, set)).block as Block).pieces.flatMap((p) => p.lines).find((l) => l.port === port);
    expect(await lineOf('piece.dcmotor', { size: '385' }, '385 motor can/terminals')).toMatchObject({ kind: 'power', size: { pins: 2 } });
    expect(await lineOf('piece.gearmotor', { size: 'N20' }, 'N20 gear motor can/terminals')).toMatchObject({ kind: 'power', size: { pins: 2 } });
    expect(await lineOf('piece.stepper', { size: '17' }, 'NEMA 17 body/leads')).toMatchObject({ kind: 'power', size: { pins: 4 } });
    const { interfacesOf } = await import('../../src/nexus/interfaces');
    const m = (await node('piece.motor', { size: motorSize(RE40_24) })).block as Block;
    expect(interfacesOf(m).list.filter((x) => x.kind === 'power').map((x) => x.name)).toEqual(['terminals']);
  }, 30000);

  it('a hinge driven by the motor the block holds: its own row\'s constants', async () => {
    const m = (await node('piece.motor', { size: motorSize(RE40_12) })).block as Block;
    const h = await node('hinge', { line: `${motorSize(RE40_12)} motor shaft/axis`, motor: 'its own' }, { block: m });
    const mm = motorModel(RE40_12);
    expect(h.joint.drive).toMatchObject({ name: RE40_12.label, V: 12, Kt: RE40_12.published.torqueConstant, Tf: mm.Tf });
    expect(h.joint.drive.R).toBeCloseTo(windingR(mm, AMBIENT), 15);
    // ('none' stays undriven)
    expect((await node('hinge', { line: `${motorSize(RE40_12)} motor shaft/axis` }, { block: m })).joint.drive).toBeUndefined();
  }, 30000);
});
