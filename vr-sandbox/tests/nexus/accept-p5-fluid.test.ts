// Acceptance test 5 (plan/AUDIT.md §1, package P5): a pump, two pipes, a valve and a reservoir built by the room's
// operations on a board, their fluid ends written and checked, the network solved by fluid.network.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { Engine, Memo, emptyBoard, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { over, type Block } from '../../src/nexus/room';
import { interfacesOf } from '../../src/nexus/interfaces';
import { fluidJoinCheck, solveNetwork } from '../../src/nexus/fluidnet';
import { PUMP_ROWS } from '../../src/nexus/parts/fluid';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
async function board(opening: number, ends = 'compression') {
  const b = emptyBoard('acceptance 5');
  placeBlock(b, 'piece.tank', 0, 0, { size: '10 L', port: 15 }, 'tk');
  placeBlock(b, 'piece.pump', 0, 0, { size: 'circulator 15-60' }, 'pm');
  placeBlock(b, 'piece.cutube', 0, 0, { size: '15×0.7', length: 500 }, 'pa');
  placeBlock(b, 'room.turn', 0, 0, { axis: 'z', degrees: 90 }, 'pax'); wire(b, 'pa', 'block', 'pax', 'block');
  placeBlock(b, 'piece.ballvalve', 0, 0, { size: 'G1/2', ends }, 'vl');
  placeBlock(b, 'piece.cutube', 0, 0, { size: '15×0.7', length: 1000 }, 'pb');
  placeBlock(b, 'room.turn', 0, 0, { axis: 'z', degrees: 90 }, 'pbx'); wire(b, 'pb', 'block', 'pbx', 'block');
  placeBlock(b, 'room.stack', 0, 0, { name: 'pump loop', axis: 'x', fit: 'touch', level: 'on the ground', order: 'tk,pm,pax,vl,pbx' }, 'row');
  for (const id of ['tk', 'pm', 'pax', 'vl', 'pbx']) wire(b, id, 'block', 'row', 'blocks');
  placeBlock(b, 'fluid.network', 0, 0, { opening }, 'net'); wire(b, 'row', 'block', 'net', 'block');
  const e = new Engine(b, env, new Memo()); await e.run();
  const row = e.state.get('row')!, net = e.state.get('net')!;
  if (row.status !== 'ok') throw new Error(`row: ${row.status} ${row.error}`);
  if (net.status !== 'ok') throw new Error(`net: ${net.status} ${net.error}`);
  return { block: (row.out as { block: Block }).block, net: net.out as { flow: number; head: number; pressures: number[]; says: string } };
}
/** The pump's curve at a flow, interpolated here apart from the solver: straight between its row's points. */
const curve = (Q: number) => { const c = PUMP_ROWS['circulator 15-60']!.curve.map(([q, h]) => [q / 60000, h] as const);
  for (let i = 1; i < c.length; i++) if (Q <= c[i]![0]) return c[i - 1]![1] + ((c[i]![1] - c[i - 1]![1]) * (Q - c[i - 1]![0])) / (c[i]![0] - c[i - 1]![0]);
  return NaN; };

describe('acceptance 5', () => {
  it('acceptance 5', async () => {
    const open = await board(1);
    // (the pieces carry fluid interface records: the tank, the pump, both pipes and the valve)
    const fl = interfacesOf(open.block).list.filter((x) => x.kind === 'fluid');
    console.log(`fluid records: ${fl.map((x) => `${x.id} ${JSON.stringify(x.size)}`).join(' | ')}`);
    expect(fl.length).toBeGreaterThanOrEqual(5);
    // (copper 15 mm on G1/2 refused with why: by the check, and by Over a shaft, the joining operation)
    const pipe = open.block.pieces.find((p) => /tube$/.test(p.name))!.lines[0]!;
    const g = { port: 'G1/2 socket port 1/axis', kind: 'fluid' as const, size: { thread: 'G1/2', major: 0.020955 }, std: 'ISO 228-1' };
    const j = fluidJoinCheck(pipe, g); expect(j.ok).toBe(false); if (!j.ok) { console.log(`refused: ${j.why}`); expect(j.why).toMatch(/15 mm.*G1\/2.*does not screw into a thread/); }
    const b = emptyBoard('copper on G1/2'); placeBlock(b, 'piece.cutube', 0, 0, { size: '15×0.7', length: 200 }, 'cu'); placeBlock(b, 'piece.gfitting', 0, 0, { size: 'G1/2', type: 'socket' }, 'gs');
    placeBlock(b, 'room.over', 0, 0, { line: 'copper 15×0.7 tube/axis', where: 'hi', fit: 'slide' }, 'on'); wire(b, 'cu', 'block', 'on', 'host'); wire(b, 'gs', 'block', 'on', 'sleeve');
    const eo = new Engine(b, env, new Memo()); await eo.run(); const on = eo.state.get('on')!;
    console.log(`over: ${on.status} ${on.error}`); expect(on.status).not.toBe('ok'); expect(String(on.error)).toMatch(/does not screw into a thread/);
    const cu = eo.state.get('cu')!.out as { block: Block }, gs = eo.state.get('gs')!.out as { block: Block };
    expect(() => over(cu.block, 'copper 15×0.7 tube/axis', gs.block, 'hi')).toThrow(/G1\/2/);
    // (the same size joins: the pipe and the valve's compression end)
    const vend = open.block.pieces.flatMap((p) => p.lines).find((l) => l.size?.role === 'valve')!; expect(fluidJoinCheck(pipe, vend).ok).toBe(true);
    // (solved: flow conserved to 1e-6 at every node)
    const n = solveNetwork(open.block); console.log(`open: ${n.says}`); console.log(`nodes: ${n.nodes.join(' / ')}; links ${n.links.map((l) => `${l.name} ${l.role} ${(l.Q * 60000).toFixed(4)} L/min Δh ${l.dh.toFixed(4)} m`).join(' | ')}`);
    expect(n.flow).toBeGreaterThan(0); expect(n.nodes.length).toBeGreaterThanOrEqual(3); expect(n.residual).toBeLessThanOrEqual(1e-6 * n.flow);
    for (const node of n.nodes) { const s = n.links.reduce((a, l) => a + (l.to === node ? l.Q : l.from === node ? -l.Q : 0), 0); expect(Math.abs(s)).toBeLessThanOrEqual(1e-6 * n.flow); }
    expect(open.net.flow).toBeCloseTo(n.flow, 12);
    // (the pump's operating point on its curve: the head across it, from the heads either side, against the curve read here)
    const pl = n.links.find((l) => l.role === 'pump')!, H = (node: string) => (n.nodes.includes(node) ? n.pressures[n.nodes.indexOf(node)]! / (998.2 * 9.80665) : 0);
    const across = H(pl.to) - H(pl.from); console.log(`pump: ${(pl.Q * 60000).toFixed(3)} L/min, head across ${across.toFixed(6)} m, curve ${curve(pl.Q).toFixed(6)} m`);
    expect(Math.abs(across - curve(pl.Q))).toBeLessThan(1e-6); expect(Math.abs(n.head - curve(pl.Q))).toBeLessThan(1e-9);
    // (closing the valve lowers the flow; shut, nothing flows)
    const part = await board(0.2), shut = await board(0); console.log(`opening 0.2: ${part.net.says.split(';')[0]}; shut: ${shut.net.says.split(';')[0]}`);
    expect(part.net.flow).toBeLessThan(open.net.flow); expect(part.net.flow).toBeGreaterThan(0); expect(Math.abs(shut.net.flow)).toBeLessThan(1e-12);
    // (the same loop with the valve's female G1/2 ends against the copper pipes: the network refuses the join, saying why)
    await expect(board(1, 'female G')).rejects.toThrow(/plain 15 mm end.*G1\/2 thread.*does not screw into a thread/);
  }, 30000);
});
