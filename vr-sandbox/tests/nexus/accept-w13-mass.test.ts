// Wave 13, job 'mass' (plan/AUDIT.md section 2, "4C" and "4B"; section 3, "Loft"): honest masses. An envelope (a part
// drawn as its box) weighs its table row's mass where the row gives one, in what physics reads (madeof.ts massProperties,
// and the parts sim.ts weighs with massOfAll), its inertia its box's scaled to that mass; where the row gives none it says
// "mass unknown: drawn as a solid box" and the pieces carry the flag. And one loft: the hull's exact solid (brep.ts), its
// mass (mass.ts loftVolume) and its drawing (kit3d.ts) one definition, agreeing to 0.5 %.
// The rows' masses are the families' own (parts/machine.ts, parts/electronics.ts: each labelled typical or a maker's
// figure there); nothing here is a new number but the 0.5 % the brief asks.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { PART_FAMILIES, build, checkRow, massGauge } from '../../src/nexus/parts/maker';
import { partOfBlock, Block } from '../../src/nexus/room';
import { massProperties, madeOf } from '../../src/nexus/madeof';
import { massOfAll } from '../../src/nexus/assembly';
import { densityKg, drawnMassOf, massOf } from '../../src/nexus/mass';
import { loftVolume } from '../../src/nexus/form';
import type { Part } from '../../src/nexus/kits';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
const node = async (id: string, set: Record<string, unknown> = {}) => { const b = LIBRARY.get(id); if (!b) throw new Error(`no block ${id}`); return (await b.run!({}, { set: { ...defaultsOf(b), ...set } } as never)) as { block: Block; thing: Part; says: string }; };
const rel = (a: number, b: number) => Math.abs(a / b - 1);
const rowMass = (id: string, size: string) => { const f = PART_FAMILIES.get(id)!; return f.expect!(f.rows[size], size, Object.fromEntries((f.settings ?? []).map((s) => [s.key, s.default]))).mass; };

describe('wave 13, mass: envelopes weigh their rows; one loft', () => {
  it('three envelopes weigh their rows\' masses in massProperties and in what the physics weighs; their inertia their boxes\' scaled to it', async () => {
    // (the transformer drew 3,281 kg against its row's 420 kg, the outboard 209 kg against 52 kg (AUDIT 2, 4C); the
    // Raspberry Pi 4 111.7 g against 46 g (the critic, 2026-11-05))
    for (const [id, size, want] of [['piece.transformer', '100 kVA', 420], ['piece.outboard', '20 hp', 52], ['piece.devboard', 'Raspberry Pi 4 Model B', rowMass('piece.devboard', 'Raspberry Pi 4 Model B')]] as [string, string, number][]) {
      expect(rowMass(id, size), `${id} ${size}: its row gives a mass`).toBe(want);
      const out = await node(id, { size }), mp = massProperties(out.thing), drawn = drawnMassOf(out.thing);
      expect(rel(mp.mass, want), `${id} ${size}: massProperties ${mp.mass.toFixed(4)} kg, its row ${want} kg (drawn as solid ${drawn.toFixed(4)} kg)`).toBeLessThan(1e-9);
      expect(rel(drawn, want), `${id}: the drawing alone is not its row's mass (the fault this fixes)`).toBeGreaterThan(0.05);
      expect([mp.unknownMass, rel(mp.rowMass, want) < 1e-9], `${id}: none of it unknown, all of it its row's`).toEqual([0, true]);
      // (what sim.ts weighs each body's pieces by: massOfAll of the room's parts, partOfBlock afresh; and after an
      // operation, the envelope on a plate)
      expect(rel((partOfBlock(out.block).parts ?? []).reduce((t, p) => t + massOfAll(p), 0), want), `${id}: the parts physics weighs`).toBeLessThan(1e-9);
      const plate = Block.made('plate', 'steel-low', { box: [2, 0.01, 2] }), on = Block.onto(plate, '+y', out.block);
      expect(rel(massOfAll(partOfBlock(on)) - massOf(partOfBlock(plate)), want), `${id}: on a plate, still its row's mass`).toBeLessThan(1e-9);
      expect(String(out.says), `${id}: what it builds says`).toMatch(/an envelope: .*; weighed at its row's mass/);
      expect(checkRow(id, size).ok, `${id}: held to its row, its mass included`).toBe(true);
    }
    // (a DC motor drawn as its can: its datasheet row's own mass (src/data/motors.ts), which its family's expect does not repeat)
    const mf = PART_FAMILIES.get('piece.motor')!, mrow = mf.rows[mf.size] as { mass: number }, motor = await node('piece.motor');
    expect(rel(massProperties(motor.thing).mass, mrow.mass), `the motor ${mf.size}: its datasheet's ${mrow.mass} kg`).toBeLessThan(1e-9);
    // (the transformer, one box: its inertia a uniform box's of its row's mass, m (b² + c²) / 12 about x)
    const t = await node('piece.transformer', { size: '100 kVA' }), mp = massProperties(t.thing), [a, b, c] = [0.8, 0.95, 0.55], m = 420;
    const want = [m * (b * b + c * c) / 12, m * (a * a + c * c) / 12, m * (a * a + b * b) / 12].sort((x, y) => x - y);
    mp.principal.forEach((I, k) => expect(rel(I, want[k]!), `its principal moment ${k}: ${I.toFixed(3)} kg m², a ${m} kg box's ${want[k]!.toFixed(3)}`).toBeLessThan(1e-6));
    expect(massGauge([t.says], true), 'the gauge: the mass is the row\'s').toEqual({ label: 'Mass', sub: 'an envelope at its row\'s mass' });
  }, 30_000);

  it('an envelope whose row gives no mass is flagged: mass unknown, drawn as a solid box, in what it says and on its pieces', async () => {
    // (the fan coil's rows give its width, height and depth only (parts/machine.ts FANCOILS): it drew 1,450 kg)
    expect(rowMass('piece.fancoil', '5 kW'), 'the fan coil\'s row gives no mass').toBeUndefined();
    const fc = await node('piece.fancoil', { size: '5 kW' }), mp = massProperties(fc.thing), vol = 1.1 * 0.28 * 0.6;
    expect(String(fc.says), 'what it builds says').toMatch(/mass unknown: drawn as a solid box/);
    expect(rel(mp.mass, vol * densityKg('steel-low')!), 'it weighs as the solid box it is drawn as').toBeLessThan(1e-9);
    expect([rel(mp.unknownMass, mp.mass) < 1e-9, mp.rowMass, mp.unknown.length], 'all of its mass flagged unknown, none of it a row\'s').toEqual([true, 0, 1]);
    expect(mp.unknown[0], 'said').toMatch(/5 kW fan coil: mass unknown: drawn as a solid box/);
    expect(madeOf(fc.thing).unknown.join('; '), 'what it is made of says so').toMatch(/envelopes whose rows give no mass/);
    expect(massGauge([fc.says], true), 'the gauge').toEqual({ label: 'Mass, as drawn', sub: 'an envelope: mass unknown, drawn as a solid box' });
    expect(checkRow('piece.fancoil', '5 kW').says, 'its row check').toMatch(/its mass not checked: mass unknown: drawn as a solid box/);
    // (every envelope family says one or the other at its own size: its row's mass, or unknown)
    const envelopes = [...PART_FAMILIES.values()].filter((f) => f.envelope), said = { row: 0, unknown: 0 };
    for (const f of envelopes) { let b: Block; try { b = build(f, f.size, Object.fromEntries((f.settings ?? []).map((s) => [s.key, s.default]))); } catch { continue; }
      const s = String((await node(f.id, { size: f.size })).says); void b;
      expect(/weighed at its row's mass|mass unknown: drawn as a solid box/.test(s), `${f.id}: ${s}`).toBe(true); s.includes('mass unknown') ? said.unknown++ : said.row++; }
    expect(said.row + said.unknown, `the envelope families, ${said.row} at their rows' masses and ${said.unknown} unknown`).toBeGreaterThan(80);
  }, 30_000);

  it('the hull loft: its B-rep volume, its mass and its drawing are one definition, within 0.5 %', async () => {
    const b = emptyBoard('seed.hull'); placeBlock(b, 'seed.hull', 0, 0, {}, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
    const blk = e.state.get('x')!.out!.block as Block, hull = (partOfBlock(blk).parts ?? []).find((p) => p.name === 'hull')!;
    expect(hull.shape && 'loft' in hull.shape, 'the hull is a loft').toBe(true);
    const loft = (hull.shape as { loft: Parameters<typeof loftVolume>[0] }).loft, ours = massOf({ ...hull, at: [0, 0, 0], rot: undefined }) / densityKg('al-5052')!;
    const { solidsOf } = await import('../../src/nexus/brep'), s = await solidsOf({ ...hull, at: [0, 0, 0], rot: undefined, parts: [] }), occ = s.rows[0]!;
    const { geometry } = await import('../../src/nexus/view/kit3d'), g = geometry(hull.shape!, hull.mat)!, pos = g.attributes.position!, ix = g.index!;
    let mesh = 0; for (let i = 0; i < ix.count; i += 3) { const v = [0, 1, 2].map((k) => { const j = ix.getX(i + k); return [pos.getX(j), pos.getY(j), pos.getZ(j)]; });
      mesh += (v[0]![0]! * (v[1]![1]! * v[2]![2]! - v[1]![2]! * v[2]![1]!) - v[0]![1]! * (v[1]![0]! * v[2]![2]! - v[1]![2]! * v[2]![0]!) + v[0]![2]! * (v[1]![0]! * v[2]![1]! - v[1]![1]! * v[2]![0]!)) / 6; }
    const says = `B-rep ${occ.volume?.toFixed(5)} m³ (valid ${occ.valid}), massOf ${ours.toFixed(5)} m³, loftVolume ${loftVolume(loft).toFixed(5)} m³, drawn ${Math.abs(mesh).toFixed(5)} m³`;
    expect([occ.ok, occ.valid], `the kernel made it, valid: ${occ.why ?? ''}`).toEqual([true, true]);
    expect(rel(ours, occ.volume!), `massOf against the B-rep: ${says}`).toBeLessThan(0.005);
    expect(rel(Math.abs(mesh), occ.volume!), `the drawing against the B-rep: ${says}`).toBeLessThan(0.005);
    expect(rel(ours, loftVolume(loft)), 'massOf weighs loftVolume').toBeLessThan(1e-9);
  }, 30_000);
});
