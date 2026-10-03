// The rules of this world: what can't happen in real life can't happen here. Each was found broken once, in a fixture,
// a design or the physics itself, and is held here for every build there is, so that kind of break can't come back
// (ARCHITECTURE.md, "Rules", says where each came from). When a new break is found, its rule goes here, stated for
// everything, not the one build that showed it.

import { describe, expect, it } from 'vitest';
import { machine, rig } from './helpers';
import { ConstructionRefused } from '../../src/ganglia/tree/gate';
import { shapeBounds } from '../../src/parts/shapes';
import { effectiveParams, getPartKind } from '../../src/parts/registry';
import { getServo, SHAFT_Q } from '../../src/data/servos';
import { qmul } from '../../src/doc/math';
import type { Quat } from '../../src/doc/types';
import type { Solid } from '../../src/construct/build';
import { TICK } from '../../src/physics/world';
import { axisAngle, composePose, dot, length, relativePose, rotate, sub } from '../../src/doc/math';
import type { Pose, Vec3 } from '../../src/doc/types';
import { getMaterial, MATERIALS } from '../../src/data/materials';
import { CONNECTOR_KINDS, getConnectorKind } from '../../src/connectors/registry';
import { spans, throughOf, unreachable } from '../../src/connectors/through';
import { planJoin } from '../../src/connectors/plan';
import { isStockScrew } from '../../src/engineering/fasteners';
import { makePart, newDoc } from '../../src/doc/commands';
import { TEMPLATES } from '../../src/templates/templates';
import { buildSheet } from '../../src/assistant/buildsheet';
import { design, type DesignSpec } from '../../src/assistant/designer';
import { Bench } from '../../src/app/bench';
import { BuildHost } from '../../src/forge/apphost';
import { run } from '../../src/forge/forge';
import { numberOf } from '../../src/schema/params';

const Y_TO_X = axisAngle([0, 0, 1], -Math.PI / 2);
const pose = (p: Vec3, q: Pose['q'] = [0, 0, 0, 1]): Pose => ({ p, q });

describe('rules', () => {
  it('a joint is only where it touches both parts: across a gap the world refuses it and says why', async () => {
    const holding = CONNECTOR_KINDS.filter((k) => !spans(k.model) && k.category !== 'Powered');
    expect(holding.length).toBeGreaterThan(10);
    const r = await rig({ gravity: [0, 0, 0] }, false);
    for (const k of holding) {
      const a = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const b = r.part('block', pose([0, 1.15, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      // the construction gate refuses it (K-8): nothing enters, and the reason names the gap
      let refusal: ConstructionRefused | null = null;
      try { r.connect(k.id, { part: a, frame: pose([0, 0.05, 0]) }, { part: b, frame: pose([0, -0.1, 0]) }, {}); } catch (e) { if (e instanceof ConstructionRefused) refusal = e; else throw e; }
      expect(refusal?.refusal.law, k.id).toBe('K-8');
      expect(refusal?.refusal.reason, k.id).toMatch(/50 mm from .*nothing physical joins them there/);
      r.world.apply({ op: 'removePart', id: a.id });
      r.world.apply({ op: 'removePart', id: b.id });
    }
    // and two ends each on its part but apart from each other would be an invisible rod
    {
      const a = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const b = r.part('block', pose([0, 1.1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      let refusal: ConstructionRefused | null = null;
      try { r.connect('bolted', { part: a, frame: pose([0.05, 0.05, 0]) }, { part: b, frame: pose([-0.05, -0.05, 0]) }, {}); } catch (e) { if (e instanceof ConstructionRefused) refusal = e; else throw e; }
      expect(refusal?.refusal.reason).toMatch(/two ends are 100 mm apart/);
    }
    r.done();
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
      // F-3.5 (docs/LAW-TREE.md): a bilateral row's residual is at most one tick of the relative acceleration it has
      // to transmit, a dt^2. The load swings down from horizontal on the arm: g along the arc at release, 2 g towards
      // the pivot at the bottom (v^2 = 2 g L there), so a <= 3 g. (A 2.3 mm gap seen here once was a slider dropped
      // from the mechanism for a tick as "misaligned" along its own free axis: docs/FRONTIER.md A-slider-residual.)
      const dt = 1 / 90, bound = 3 * 9.81 * dt * dt;
      expect(worst, `${kind}: anchors parted by ${(worst * 1000).toFixed(1)} mm`).toBeLessThan(bound);
      // and it really swung: the arm came down
      expect(r.world.livePose(weight.id)!.p[1]).toBeLessThan(0.6);
      r.done();
    });
  }

  const I: Quat = [0, 0, 0, 1];
  /** A servo standing on its narrow face, shaft face up: its horn turns about a vertical axis. */
  const UP: Quat = axisAngle([1, 0, 0], -Math.PI / 2);
  /** A horn's thickness between the shaft face and what it carries (the common nylon horn, an estimate). */
  const HORN = 0.003;

  for (const solid of [false, true]) it(`a servo turns everything bolted to it, and only through its travel (it has end stops): ${solid ? 'a solid' : 'a breakable'} arm`, async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    // a light 1 kg servo mount bolted to a heavy 60 kg free base, a large servo screwed to the mount, an arm on its
    // horn: the servo is sized by all of it, not by the mount alone, so it gets the arm to where it is told. Its
    // pack and the receiver your stick reaches it through stand on the bench beside it.
    const range = 0.4;
    const sv = getServo('servo.large-60kg'), [l, w, h] = sv.dims;
    const { out: horn } = machine(r, (b) => {
      const base = b.place('block', [0, 1, 0], I, { x: 0.2, y: 0.2, z: 0.25 }, 'base', { material: 'steel.a36' });
      const mount = b.place('block', [0, 1.125, 0], I, { x: 0.05, y: 0.05, z: 0.05 }, 'mount', { material: 'steel.a36' });
      mount.fasten({ thin: 0.05, at: [0, -0.025, 0] }, base, { thin: 0.2, at: [0, 0.1, 0] }, [0.05, 0.05], 'bolted');
      const servo = b.place('servo', [0, 1.15 + h / 2, 0], UP, { model: sv.id }, 'servo');
      servo.fasten({ thin: h, at: [0, 0, -h / 2] }, mount, { thin: 0.05, at: [0, 0.025, 0] }, [l, w], 'screwed');
      const shaft = servo.worldOf(servo.shaft).p;
      const arm = b.place('lumber', [shaft[0] + 0.3, shaft[1] + HORN + 0.019, 0], I, { size: '2x4', length: 0.6, ...(solid ? { fracture: 'off' } : {}) }, 'arm');
      const horn = servo.horn(arm, { p: [-0.3, -0.019 - HORN, 0], q: qmul(UP, SHAFT_Q) });
      const pack = b.place('battery', [-0.3, 1, 0], I, { model: 'battery.nimh.aa', series: 6, parallel: 1, charge: 1 }, 'pack', { frozen: true });
      const rx = b.place('receiver', [-0.3, 1.1, 0], I, {}, 'receiver', { frozen: true });
      pack.wire(servo);
      pack.wire(rx);
      rx.stick(servo, 'steer', range);
      return horn;
    });
    r.world.apply({ op: 'controls', channels: { steer: 1 } });
    let peak = 0, last = 0;
    for (let i = 0; i < 135; i++) {
      const res = r.world.step();
      last = res.loads.find((l) => l.id === horn)!.extent;
      peak = Math.max(peak, Math.abs(last));
    }
    expect(Math.abs(Math.abs(last) - range)).toBeLessThan(0.03);
    expect(peak).toBeLessThan(range + 0.02);
    r.done();
  });

  // A servo is a proportional controller that saturates (Wada et al., IEEE CCA 2009): it pushes back in proportion to
  // how far it is off, its stall torque `band` off, and its torque falls with speed to nothing at its no-load speed,
  // both at the volts its pack gives it. Found when a walker's legs folded under it (a 6 Hz loop on a 4 g thigh is
  // 0.006 N m/rad), then when a stiffer loop rang on a light bracket bolted to a heavy base (Jolt's motor saw only the
  // bracket). Held on both: a frozen mount (Jolt alone) and a light mount bolted to a heavy free base (the re-solve,
  // on true inertia). The servo lies on the mount with its shaft face sideways, so the arm hangs level and its weight
  // bears on the horn.
  const sv0 = getServo('servo.micro-9g');
  for (const free of [false, true]) {
    const servoArm = async (gravity: boolean, swing: number) => {
      const r = await rig(gravity ? {} : { gravity: [0, 0, 0] }, false);
      const sv = getServo('servo.micro-9g'), [l, w, h] = sv.dims;
      const { out, store } = machine(r, (b) => {
        let mount: Solid, base: Solid | null = null;
        if (free) {
          base = b.place('block', [0, 0.9, 0], I, { x: 0.2, y: 0.2, z: 0.25 }, 'base', { material: 'steel.a36' });
          mount = b.place('block', [0, 1.0125, 0], I, { x: 0.025, y: 0.025, z: 0.025 }, 'mount', { material: 'steel.a36' });
          mount.fasten({ thin: 0.025, at: [0, -0.0125, 0] }, base, { thin: 0.2, at: [0, 0.1, 0] }, [0.025, 0.025], 'bolted');
        } else mount = b.place('block', [0, 1.0125, 0], I, { x: 0.025, y: 0.025, z: 0.025 }, 'mount', { material: 'steel.a36', frozen: true });
        const servo = b.place('servo', [0, 1.025 + w / 2, 0], I, { model: sv.id }, 'servo');
        servo.fasten({ thin: w, at: [0, -w / 2, 0] }, mount, { thin: 0.025, at: [0, 0.0125, 0] }, [l, h], 'screwed');
        const shaft = servo.worldOf(servo.shaft).p;
        // a 20 cm aluminium arm, 54 g, held level from its end: 0.053 N m on the horn
        const arm = b.place('block', [shaft[0] + 0.1, shaft[1], shaft[2] + HORN + 0.005], I, { x: 0.2, y: 0.01, z: 0.01 }, 'arm', { material: 'aluminum.6061-t6' });
        const horn = servo.horn(arm, { p: [-0.1, 0, -0.005 - HORN], q: SHAFT_Q });
        const pack = b.place('battery', [-0.2, 1, 0], I, { model: 'battery.nimh.aa', series: 4, parallel: 1, charge: 1 }, 'pack', { frozen: true });
        const rx = b.place('receiver', [-0.2, 1.1, 0], I, {}, 'receiver', { frozen: true });
        pack.wire(servo);
        pack.wire(rx);
        rx.stick(servo, 'steer', swing);
        return { horn, base };
      });
      // held up by the bench, so only the servo is in question
      if (out.base) r.connect('fixed', { part: store.doc.parts[out.base.id]!, frame: pose([0, -0.1, 0]) }, null, {});
      return { r, horn: out.horn, sv };
    };
    it(`a servo sags under its load by what its stiffness says, stall torque over band at its volts, and no more (${free ? 'on a light mount bolted to a heavy base' : 'on a frozen mount'})`, async () => {
      const { r, horn, sv } = await servoArm(true, 0.5);
      let sag = 0, V = 0;
      for (let i = 0; i < 180; i++) { const res = r.world.step(); sag = res.loads.find((l) => l.id === horn)!.extent; V = res.power?.servos?.[horn]?.V ?? 0; }
      // 0.054 kg x 9.81 x 0.1 m / (0.176 (V / 4.8) / 0.1 N m/rad): 0.029 rad at 4.8 V, less at the pack's higher volts
      const expected = (0.054 * 9.81 * 0.1) / ((sv.stallTorque * (V / sv.V)) / sv.band);
      expect(V).toBeGreaterThan(4.8);
      expect(Math.abs(sag)).toBeGreaterThan(expected * 0.75);
      expect(Math.abs(sag)).toBeLessThan(expected * 1.3);
      r.done();
    });
    it(`a servo turns no faster than its no-load speed at its volts, and nearly that fast unloaded (${free ? 'on a light mount bolted to a heavy base' : 'on a frozen mount'})`, async () => {
      // a swing to its travel (90°): a short move never reaches the no-load speed before the loop slows it
      const { r, horn, sv } = await servoArm(false, sv0.travel);
      r.world.apply({ op: 'controls', channels: { steer: 1 } });
      let last = 0, fastest = 0, V = 0;
      for (let i = 0; i < 90; i++) {
        const res = r.world.step();
        const now = res.loads.find((l) => l.id === horn)!.extent;
        fastest = Math.max(fastest, Math.abs(now - last) / TICK);
        last = now;
        V = Math.max(V, res.power?.servos?.[horn]?.V ?? 0);
      }
      const speed = sv.noLoadSpeed * (V / sv.V);
      expect(fastest).toBeLessThan(speed * 1.05);
      expect(fastest).toBeGreaterThan(speed * 0.8);
      r.done();
    });
  }

  // A chain of assemblies (a walker's body with its servo cases, each thigh with its knee servo, each shank with its
  // foot) joined by servos: every joint holds, however fast the light ones swing. Found when a walker's knee pins
  // came 9 mm apart floating in zero gravity: each assembly was integrated on its own and only 20% of the gap was
  // taken out a tick, so the arc a fast light shank swings through outran it. Each island is now closed outward
  // from its heaviest (or held) assembly, as lone parts were.
  it('a chain of light assemblies on servos holds together: no pin comes apart, swinging free in zero gravity', async () => {
    const { buildWalker, WALKERS } = await import('../../src/world/creature');
    const { DocStore } = await import('../../src/doc/store');
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const store = new DocStore(newDoc('walker'));
    const w = buildWalker(store, WALKERS['dog']!, [0, 1, 0], 0);
    const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));
    for (const id of w.parts) r.world.apply({ op: 'upsertPart', part: store.doc.parts[id]!, material: getMaterial(store.doc.parts[id]!.material), keepLivePose: false });
    for (const id of w.joints) r.world.apply({ op: 'upsertConnection', conn: store.doc.connections[id]!, materials });
    const W = r.world as unknown as { conns: Map<string, unknown>; anchorWorld(c: unknown): Pose; anchorWorldB(c: unknown): Pose };
    let worst = 0, drifts = 0;
    for (let k = 0; k < 270; k++) {
      drifts += r.world.step().events.filter((e) => e.type === 'drift').length;
      for (const id of w.joints) { if (spans(getConnectorKind(store.doc.connections[id]!.kind).model)) continue; const c = W.conns.get(id); worst = Math.max(worst, length(sub(W.anchorWorldB(c).p, W.anchorWorld(c).p))); }
    }
    expect(drifts).toBe(0);
    expect(worst).toBeLessThan(0.001);
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
    let fake: ConstructionRefused | null = null;
    try { r.connect('motor', { part: block, frame: pose([0, 0.025, 0]) }, { part: disc2, frame: pose([0, -0.01, 0]) }, { channel: 'always' }); } catch (e) { if (e instanceof ConstructionRefused) fake = e; else throw e; }
    expect(fake?.refusal.law).toBe('K-9');
    expect(fake?.refusal.reason).toMatch(/motor drive is the output shaft of a motor/);
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
    const refused: string[] = [], made: string[] = [];
    let x = 0;
    for (const kind of ['bolted', 'screwed', 'nailed', 'riveted', 'weld', 'glued', 'soldered', 'fixed']) {
      for (const bought of ['motor.dc', 'battery'] as const) {
        x += 1;
        const item = r.part(bought, pose([x, 1, 0]), { frozen: true, params: bought === 'motor.dc' ? { model: 'motor.dc.coreless.d40-150w-24v' } : { model: 'battery.sla.12v-7ah', series: 1 } });
        // a plate laid on its top, touching
        const topOf = (p: { kind: string; params: Record<string, number | string | boolean>; material: string }) => { const k = getPartKind(p.kind); return shapeBounds(k.collision(effectiveParams(k, p.params, getMaterial(p.material)))).max[1]; };
        const top = topOf(item);
        const plate = r.part('block', pose([x, 1 + top + 0.005, 0]), { material: 'aluminum.6061-t6', params: { x: 0.03, y: 0.01, z: 0.03 } });
        const params: Record<string, number | string> = kind === 'bolted' ? { size: 'M4', count: 1, bondW: 0.02, bondL: 0.02 } : kind === 'screwed' ? { diameter: 0.004, length: 0.016, count: 1, bondW: 0.02, bondL: 0.02 } : kind === 'fixed' ? {} : { bondW: 0.02, bondL: 0.02 };
        let c = null;
        try { c = r.connect(kind, { part: plate, frame: pose([0, -0.005, 0], axisAngle([1, 0, 0], Math.PI)) }, { part: item, frame: pose([0, top, 0]) }, params); }
        catch (e) { if (e instanceof ConstructionRefused && e.refusal.law === 'K-7' && /can't be made on a/.test(e.refusal.reason)) refused.push(`${kind} on ${bought}`); else throw e; }
        if (c) made.push(`${kind} on ${bought}`);
      }
    }
    // what is refused and what is made is exactly what each maker's datasheet says: nothing else decides it
    const allowed = (bought: string, kind: string) => getPartKind(bought).bought!.accepts.includes(kind);
    for (const kind of ['bolted', 'screwed', 'nailed', 'riveted', 'weld', 'glued', 'soldered', 'fixed']) for (const bought of ['motor.dc', 'battery']) {
      expect(refused.includes(`${kind} on ${bought}`)).toBe(!allowed(bought, kind));
      expect(made.includes(`${kind} on ${bought}`)).toBe(allowed(bought, kind));
    }
    expect(refused.length + made.length).toBe(16);
    expect(refused.length).toBeGreaterThanOrEqual(12);
    // what its maker allows is made: a split clamp round the motor's body holds
    const { conns: [held] } = r.construct([
      { kind: 'motor.dc', pose: pose([0, 2, 0]), frozen: true, params: { model: 'motor.dc.coreless.d40-150w-24v' } },
      { kind: 'block', pose: pose([0, 2, 0]), material: 'aluminum.6061-t6', params: { x: 0.06, y: 0.025, z: 0.06 } },
    ], [{ kind: 'clamp', a: { part: 1, frame: pose([0, 0, 0]) }, b: { part: 0, frame: pose([0, 0, 0]) }, params: { size: 'M5', count: 2, bore: 0.04, width: 0.025 } }]);
    const broke = r.world.step().events.some((e) => (e.type === 'break' || e.type === 'refused') && ('conn' in e ? e.conn === held!.id : e.id === held!.id));
    expect(broke).toBe(false);
    r.done();
  });
});

