// The rules of this world: what can't happen in real life can't happen here. Each was found broken once, in a fixture,
// a design or the physics itself, and is held here for every build there is, so that kind of break can't come back
// (ARCHITECTURE.md, "Rules", says where each came from). When a new break is found, its rule goes here, stated for
// everything, not the one build that showed it.

import { describe, expect, it } from 'vitest';
import { rig } from './helpers';
import { axisAngle, composePose, dot, length, relativePose, rotate, sub } from '../../src/doc/math';
import type { Pose, Vec3 } from '../../src/doc/types';
import { getMaterial } from '../../src/data/materials';
import { CONNECTOR_KINDS, getConnectorKind } from '../../src/connectors/registry';
import { REACH, spans, throughOf, unreachable } from '../../src/connectors/through';
import { planJoin } from '../../src/connectors/plan';
import { isStockScrew } from '../../src/engineering/fasteners';
import { makePart, newDoc } from '../../src/doc/commands';
import { TEMPLATES } from '../../src/templates/templates';
import { buildSheet } from '../../src/assistant/buildsheet';
import { design, type DesignSpec } from '../../src/assistant/designer';
import { Bench } from '../../src/app/bench';
import { BuildHost } from '../../src/forge/apphost';
import { run } from '../../src/forge/forge';
import { JoinRefused, makeRigidJoin } from '../../src/tools/tools';
import { numberOf } from '../../src/schema/params';

const Y_TO_X = axisAngle([0, 0, 1], -Math.PI / 2);
const pose = (p: Vec3, q: Pose['q'] = [0, 0, 0, 1]): Pose => ({ p, q });

describe('rules', () => {
  it('a joint is only where it touches both parts: across a gap the world refuses it and says why', async () => {
    const holding = CONNECTOR_KINDS.filter((k) => !spans(k.model));
    expect(holding.length).toBeGreaterThan(10);
    for (const k of holding) {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      const a = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const b = r.part('block', pose([0, 1.15, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      // the anchor on A's top face, 50 mm short of B's bottom face
      const conn = r.connect(k.id, { part: a, frame: pose([0, 0.05, 0]) }, { part: b, frame: pose([0, -0.1, 0]) }, {});
      const events = r.world.step().events.filter((e) => e.type === 'break' && e.conn === conn.id);
      expect(events.length, k.id).toBe(1);
      expect((events[0] as { note: string }).note, k.id).toMatch(/50 mm from .*nothing physical joins them there/);
      r.done();
    }
    // each end on its own part but the two ends apart is an invisible rod: refused too
    {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      const a = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const b = r.part('block', pose([0, 1.1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const conn = r.connect('bolted', { part: a, frame: pose([0.05, 0.05, 0]) }, { part: b, frame: pose([-0.05, -0.05, 0]) }, {});
      const notes = r.world.step().events.filter((e) => e.type === 'break' && e.conn === conn.id).map((e) => (e as { note: string }).note);
      expect(notes[0]).toMatch(/two ends are 100 mm apart/);
      r.done();
    }
    // and the tools won't make one: the Join tool's joint across a gap is refused before it exists
    const bench = new Bench();
    const host = new BuildHost(bench);
    run('place block x=0.1 y=0.1 z=0.1 mat steel.a36 at 0 0.05 0 as a\nplace block x=0.1 y=0.1 z=0.1 mat steel.a36 at 0 0.2 0 as b', host);
    const [ida, idb] = ['a', 'b'].map((n) => Object.values(bench.doc.parts).find((p) => p.name === n)!.id);
    expect(() => makeRigidJoin(bench, { part: ida!, point: [0, 0.1, 0], normal: [0, 1, 0], seg: null }, { part: idb!, seg: null }, 'hinge', [0, 0, 0, 1])).toThrow(JoinRefused);
    expect(Object.keys(bench.doc.connections)).toHaveLength(0);
    expect(REACH).toBeLessThan(0.01);
  });

  it('every fixture and every design can be built from what is sold: joints touch, hardware exists, fits and reaches', () => {
    const problems: string[] = [];
    for (const t of TEMPLATES) {
      const doc = t.build();
      const mat = (p: { material: string }) => doc.materials[p.material] ?? getMaterial(p.material);
      for (const c of Object.values(doc.connections)) {
        const k = getConnectorKind(c.kind), a = doc.parts[c.a.part]!, b = c.b ? doc.parts[c.b.part]! : null;
        const why = unreachable(k.model, k.label, a, mat(a), c.a.frame, b, b ? mat(b) : null, c.b?.frame ?? null);
        if (why) problems.push(`${t.id}: ${why}`);
      }
      for (const p of buildSheet(doc, mat).problems) problems.push(`${t.id}: ${p}`);
    }
    const materials = [undefined, 'steel.a36', 'aluminum.6061-t6', 'wood.birch-plywood', 'stone.granite'];
    for (const what of ['table', 'bench', 'shelf', 'crate', 'tower', 'wall'] as const) {
      for (const material of what === 'wall' || what === 'tower' ? [undefined] : materials) {
        for (const load of what === 'table' || what === 'bench' || what === 'shelf' ? [undefined, 300] : [undefined]) {
          const spec: DesignSpec = { what, material, load, ...(what === 'wall' ? { width: 1, height: 0.4 } : {}) };
          const bench = new Bench();
          const built = run(design(spec, 0, 0, 'd').forge, new BuildHost(bench));
          if (!built.ok) { problems.push(`${JSON.stringify(spec)}: doesn't build: ${built.error}`); continue; }
          for (const p of buildSheet(bench.doc, (x) => bench.materialOf(x)).problems) problems.push(`${JSON.stringify(spec)}: ${p}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('a screw goes through the part that is thin along its path, into the other, and knows end grain', () => {
    // a 2x2 leg standing under an 18 mm top, joined at the leg's end
    const doc = newDoc();
    const leg = makePart({ kind: 'lumber', material: 'wood.douglas-fir', params: { size: '2x2', length: 0.7 }, pose: pose([0, 0.35, 0], axisAngle([0, 0, 1], Math.PI / 2)) });
    const top = makePart({ kind: 'plate', material: 'wood.douglas-fir', params: { length: 0.6, width: 0.4, thickness: 0.018 }, pose: pose([0, 0.709, 0]) });
    const at = pose([0, 0.7, 0]);
    const t = throughOf(leg, getMaterial(leg.material), relativePose(leg.pose, at), top, getMaterial(top.material), relativePose(top.pose, at));
    expect(t.a).toBeCloseTo(0.7, 6);
    expect(t.endA).toBe(true);
    expect(t.b).toBeCloseTo(0.018, 6);
    expect(t.endB).toBe(false);
    // Best join drives a stocked screw down through the top into the leg's end grain, not sideways through the leg
    const fir = getMaterial('wood.douglas-fir');
    const plan = planJoin('screwed', fir, fir, { thicknessA: 0.038, thicknessB: 0.018, bondW: 0.038, bondL: 0.038, through: t });
    const d = numberOf(plan.params, 'diameter'), L = numberOf(plan.params, 'length');
    expect(plan.kind).toBe('screwed');
    expect(isStockScrew(d, L)).toBe(true);
    const k = getConnectorKind('screwed');
    const rated = k.derive({ params: plan.params, matA: fir, matB: fir, thicknessA: 0.038, thicknessB: 0.018, through: t, distance: 0, cure: 1e12 });
    expect(rated.readouts.find((r) => r.label === 'Penetration')!.value).toBe(`${Math.round((L - 0.018) * 1000)} mm (end grain)`);
    // a screw that can't reach the other part holds nothing, and says so
    const short = k.derive({ params: { ...plan.params, length: 0.016 }, matA: fir, matB: fir, thicknessA: 0.038, thicknessB: 0.018, through: t, distance: 0, cure: 1e12 });
    expect(short.instantFailure).toMatch(/can't reach through 18 mm/);
    expect(doc).toBeTruthy();
  });

  // The kart's hangers: a heavy load carried through a light part on a segmented one, all of it moving. Every joint
  // kind that holds must hold its anchors together through that, as a real one does.
  for (const kind of ['bolted', 'hinge', 'ball', 'slider'] as const) {
    it(`a ${kind} joint never drifts apart under the load it carries, even through a light part on a swinging arm`, async () => {
      const r = await rig({}, false);
      const post = r.part('block', pose([0, 1, 0]), { frozen: true, material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      // a 0.6 m steel rod (breakable stock: segments) pinned to the post's face, horizontal, free to swing down
      const rod = r.part('rod.round', pose([0.35, 1, 0], Y_TO_X), { material: 'steel.1018-cd', params: { length: 0.6, diameter: 0.02 } });
      const zAxis = axisAngle([1, 0, 0], Math.PI / 2);
      const pivot = pose([0.05, 1, 0], zAxis);
      r.connect('bearing', { part: rod, frame: relativePose(rod.pose, pivot) }, { part: post, frame: relativePose(post.pose, pivot) }, { bore: 0.02, staticRating: 8000 });
      // a 0.5 kg hanger bolted under its end, and 30 kg hung from the hanger by the joint under test
      const hanger = r.part('block', pose([0.62, 0.97, 0]), { material: 'steel.a36', params: { x: 0.04, y: 0.04, z: 0.04 } });
      const top = pose([0.62, 0.99, 0]);
      r.connect('bolted', { part: hanger, frame: relativePose(hanger.pose, top) }, { part: rod, frame: relativePose(rod.pose, top) }, { size: 'M8', count: 2, bondW: 0.02, bondL: 0.04 });
      const D = Math.cbrt((4 * 30) / (Math.PI * 7200));
      const weight = r.part('weight', pose([0.62, 0.95 - D / 2, 0]), { params: { mass: 30 } });
      const joint = pose([0.62, 0.95, 0], kind === 'slider' ? zAxis : [0, 0, 0, 1]);
      const fH = relativePose(hanger.pose, joint), fW = relativePose(weight.pose, joint);
      const params: Record<string, number | string> = kind === 'bolted' ? { size: 'M10', count: 2, bondW: 0.04, bondL: 0.04 } : {};
      const c = r.connect(kind, { part: hanger, frame: fH }, { part: weight, frame: fW }, params);
      let worst = 0;
      const failures: string[] = [];
      for (let i = 0; i < 180; i++) {
        for (const e of r.world.step().events) if ((e.type === 'break' || e.type === 'slip') && e.conn === c.id) failures.push(e.note);
        const ha = composePose(r.world.livePose(hanger.id)!, fH), hb = composePose(r.world.livePose(weight.id)!, fW);
        let gap = sub(hb.p, ha.p);
        // a slider is free along its axis
        if (kind === 'slider') { const ax = rotate(ha.q, [0, 1, 0]); gap = sub(gap, [ax[0] * dot(gap, ax), ax[1] * dot(gap, ax), ax[2] * dot(gap, ax)]); }
        worst = Math.max(worst, length(gap));
      }
      expect(failures).toEqual([]);
      expect(worst, `${kind}: anchors parted by ${(worst * 1000).toFixed(1)} mm`).toBeLessThan(0.002);
      // and it really swung: the arm came down
      expect(r.world.livePose(weight.id)!.p[1]).toBeLessThan(0.6);
      r.done();
    });
  }

  for (const solid of [false, true]) it(`a servo turns everything bolted to it, and only through its travel (it has end stops): ${solid ? 'a solid' : 'a breakable'} arm`, async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    // a light 1 kg servo mount bolted to a heavy 60 kg free base, an arm on the servo: the servo is sized by all of
    // it, not by the mount alone, so it gets the arm to where it is told
    const base = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.2, y: 0.2, z: 0.25 } });
    const mount = r.part('block', pose([0, 1.125, 0]), { material: 'steel.a36', params: { x: 0.05, y: 0.05, z: 0.05 } });
    const seat = pose([0, 1.1, 0]);
    r.connect('bolted', { part: mount, frame: relativePose(mount.pose, seat) }, { part: base, frame: relativePose(base.pose, seat) }, { size: 'M6', count: 4, bondW: 0.05, bondL: 0.05 });
    const arm = r.part('lumber', pose([0.25, 1.15 + 0.019, 0]), { params: { size: '2x4', length: 0.6, ...(solid ? { fracture: 'off' } : {}) } });
    const axis = pose([0, 1.15, 0]);
    const range = 0.4;
    const servo = r.connect('servo', { part: mount, frame: relativePose(mount.pose, axis) }, { part: arm, frame: relativePose(arm.pose, axis) }, { maxTorque: 40, range, channel: 'steer' });
    r.world.apply({ op: 'controls', channels: { steer: 1 } });
    let peak = 0, last = 0;
    for (let i = 0; i < 135; i++) {
      const res = r.world.step();
      last = res.loads.find((l) => l.id === servo.id)!.extent;
      peak = Math.max(peak, Math.abs(last));
    }
    expect(Math.abs(Math.abs(last) - range)).toBeLessThan(0.03);
    expect(peak).toBeLessThan(range + 0.02);
    r.done();
  });

  it('energy comes from a source: a motor runs on a battery wired to it and on nothing else (R10)', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const motor = r.part('motor.dc', pose([0, 1, 0]), { frozen: true, params: { model: 'motor.dc.coreless.d40-150w-24v', gearhead: 'gearhead.planetary.d42-12to1' } });
    const face = (0.071 + 0.0555) / 2;
    const fly = r.part('disc', pose([0, 1 + face + 0.01, 0]), { material: 'steel.a36', params: { diameter: 0.1, thickness: 0.02 } });
    const drive = r.connect('motor', { part: motor, frame: pose([0, face, 0]) }, { part: fly, frame: pose([0, -0.01, 0]) }, { channel: 'always', currentLimit: 5 });
    r.run(0.5);
    expect(Math.abs(r.world.angularVelocity(fly.id)![1])).toBeLessThan(1e-3);
    // a motor drive made on anything but a motor is no drive at all
    const block = r.part('block', pose([1, 1, 0]), { frozen: true, material: 'steel.a36', params: { x: 0.05, y: 0.05, z: 0.05 } });
    const disc2 = r.part('disc', pose([1, 1.035, 0]), { material: 'steel.a36', params: { diameter: 0.05, thickness: 0.02 } });
    const fake = r.connect('motor', { part: block, frame: pose([0, 0.025, 0]) }, { part: disc2, frame: pose([0, -0.01, 0]) }, { channel: 'always' });
    const notes = r.world.step().events.filter((e) => e.type === 'break' && e.conn === fake.id).map((e) => (e as { note: string }).note);
    expect(notes[0]).toMatch(/motor drive is the output shaft of a motor/);
    // wired, it turns
    const battery = r.part('battery', pose([0.3, 1, 0]), { params: { model: 'battery.sla.12v-7ah', series: 2, parallel: 1, charge: 1 } });
    r.connect('wire', { part: battery, frame: pose([-0.0755, 0, 0]) }, { part: motor, frame: pose([0, -face, 0]) }, { gauge: '14', length: 0.5 });
    r.run(0.5);
    expect(Math.abs(r.world.angularVelocity(fly.id)![1])).toBeGreaterThan(5);
    expect(drive).toBeTruthy();
    r.done();
  });

  it('if you can\'t make it you can\'t place it: a bought motor or battery takes only the joints its maker allows (R11)', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const refused: string[] = [];
    let x = 0;
    for (const kind of ['bolted', 'screwed', 'nailed', 'riveted', 'weld', 'glued', 'soldered', 'fixed']) {
      for (const bought of ['motor.dc', 'battery'] as const) {
        x += 1;
        const item = r.part(bought, pose([x, 1, 0]), { frozen: true, params: bought === 'motor.dc' ? { model: 'motor.dc.coreless.d40-150w-24v' } : { model: 'battery.sla.12v-7ah', series: 1 } });
        // a plate laid on its top, touching
        const top = bought === 'motor.dc' ? 0.071 / 2 : 0.0975 / 2;
        const plate = r.part('block', pose([x, 1 + top + 0.005, 0]), { material: 'aluminum.6061-t6', params: { x: 0.03, y: 0.01, z: 0.03 } });
        const params: Record<string, number | string> = kind === 'bolted' ? { size: 'M4', count: 1, bondW: 0.02, bondL: 0.02 } : kind === 'screwed' ? { diameter: 0.004, length: 0.016, count: 1, bondW: 0.02, bondL: 0.02 } : { bondW: 0.02, bondL: 0.02 };
        const c = r.connect(kind, { part: plate, frame: pose([0, -0.005, 0], axisAngle([1, 0, 0], Math.PI)) }, { part: item, frame: pose([0, top, 0]) }, params);
        for (const e of r.world.step().events) if (e.type === 'break' && e.conn === c.id && /can't be made on a/.test(e.note)) refused.push(`${kind} on ${bought}`);
      }
    }
    expect(refused.length).toBe(16);
    // what its maker allows is made: a split clamp round the motor's body holds
    const motor = r.part('motor.dc', pose([0, 2, 0]), { frozen: true, params: { model: 'motor.dc.coreless.d40-150w-24v' } });
    const clampBlock = r.part('block', pose([0, 2, 0]), { material: 'aluminum.6061-t6', params: { x: 0.06, y: 0.025, z: 0.06 } });
    const held = r.connect('clamp', { part: clampBlock, frame: pose([0, 0, 0]) }, { part: motor, frame: pose([0, 0, 0]) }, { size: 'M5', count: 2, bore: 0.04, width: 0.025 });
    const broke = r.world.step().events.some((e) => e.type === 'break' && e.conn === held.id);
    expect(broke).toBe(false);
    r.done();
  });
});

