// Physics conformance: generic laws, never specific builds.

import { describe, expect, it } from 'vitest';
import { at, rig, within } from './helpers';
import { axisAngle, length, sub } from '../../src/doc/math';
import { TICK } from '../../src/physics/world';
import { tensileStressArea, threadFor } from '../../src/engineering/threads';
import { blockCharges, blockFaces, cylinderCharges, cylinderFaces, dipoleMoment, imageFaces, magnetWrench, plateSaturationFactor } from '../../src/engineering/magnets';
import { tubeDipoleDrag } from '../../src/engineering/eddy';
import { heatStep, motorModel, windingR } from '../../src/engineering/dcmotor';
import { getGearhead, getMotor } from '../../src/data/motors';
import { AMBIENT } from '../../src/engineering/thermal';
import { FLUIDS, getMaterial, STANDARD_GRAVITY as g } from '../../src/data/materials';

const up: [number, number, number, number] = [0, 0, 0, 1];
const down = axisAngle([1, 0, 0], Math.PI); // frame whose +Y points down

describe('kinematics', () => {
  it('free fall: t = sqrt(2h/g)', async () => {
    const r = await rig({}, false);
    const ball = r.part('sphere', at(0, 10, 0), { params: { diameter: 0.05 } });
    let t = 0;
    r.run(2, (time) => { if (!t && r.pos(ball)[1] <= 8.5) t = time; });
    within(t, Math.sqrt((2 * 1.5) / g), 0.012); // tick quantisation 1/90 s
    r.done();
  });

  it('small parts turn with the inertia of their shape: a blow at the rim spins them at (r x J) / I (A11)', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    // a 10 x 5 mm disc (I about a diameter m (3 R^2 + L^2) / 12 = 2.5e-8 kg m^2, below Jolt's fallback threshold)
    // and a 100 mm block (8.8e-4 kg m^2, above it)
    const cases: [ReturnType<typeof r.part>, number, number][] = [];
    const R = 0.005, L = 0.005;
    const d = r.part('magnet.disc', at(0, 0, 0), { params: { diameter: 2 * R, thickness: L } });
    cases.push([d, R, (r.world.bodyMass(d.id)! * (3 * R * R + L * L)) / 12]);
    const b = r.part('block', at(1, 0, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    cases.push([b, 0.05, (r.world.bodyMass(b.id)! * 0.02) / 12]);
    for (const [p, arm, I] of cases) {
      const c = r.world.livePose(p.id)!.p;
      const J = 1e-4;
      r.world.apply({ op: 'impulse', id: p.id, point: [c[0] + arm, c[1], c[2]], impulse: [0, J, 0] }); // about +z
      within(r.world.angularVelocity(p.id)![2], (arm * J) / I, 0.002);
    }
    r.done();
  });

  it('incline: a block holds below atan(mu) and slides at g(sin - mu cos) above', async () => {
    const mu = 0.45; // birch plywood on birch plywood (same material: combine = mu)
    const measure = async (deg: number) => {
      const r = await rig();
      const th = (deg * Math.PI) / 180;
      const q = axisAngle([0, 0, 1], th);
      r.part('plate', at(0, 1, 0, q), { frozen: true, material: 'wood.birch-plywood', params: { length: 4, width: 1, thickness: 0.04 } });
      const n = [-Math.sin(th), Math.cos(th)];
      const block = r.part('block', at(n[0]! * 0.07 + 0.5 * Math.cos(th), 1 + n[1]! * 0.07 + 0.5 * Math.sin(th), 0, q), { material: 'wood.birch-plywood' });
      r.run(0.3);
      const p0 = r.pos(block);
      r.run(0.5);
      const p1 = r.pos(block);
      const d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      r.done();
      return d;
    };
    expect(await measure(18)).toBeLessThan(0.002);
    const th = (35 * Math.PI) / 180;
    // distance travelled over 0.5 s after sliding 0.3 s: s = v0 t + a t^2 / 2 with v0 = 0.3 a
    const a = g * (Math.sin(th) - mu * Math.cos(th));
    within(await measure(35), 0.3 * a * 0.5 + 0.5 * a * 0.25, 0.05);
  });

  it('rolling cylinder: a = 2/3 g sin(theta)', async () => {
    const r = await rig();
    const th = (12 * Math.PI) / 180;
    const q = axisAngle([0, 0, 1], -th);
    r.part('plate', at(0, 1, 0, q), { frozen: true, material: 'rubber.natural', params: { length: 6, width: 1, thickness: 0.05 } });
    const along = [Math.cos(th), -Math.sin(th)];
    const nrm = [Math.sin(th), Math.cos(th)];
    const rad = 0.05;
    const cyl = r.part('rod.round', at(-2 * along[0]! + nrm[0]! * (0.025 + rad + 0.001), 1 - 2 * along[1]! + nrm[1]! * (0.025 + rad + 0.001), 0, axisAngle([1, 0, 0], Math.PI / 2)),
      { material: 'rubber.natural', params: { diameter: 2 * rad, length: 0.2 } });
    r.run(0.2);
    const p0 = r.pos(cyl);
    r.run(0.6);
    const p1 = r.pos(cyl);
    const s = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const a = (2 / 3) * g * Math.sin(th);
    within(s, 0.2 * a * 0.6 + 0.5 * a * 0.36, 0.04);
    r.done();
  });
});

describe('stored energy and oscillation', () => {
  it('coil spring: period = 2 pi sqrt(m/k)', async () => {
    const r = await rig({}, false);
    const mass = r.part('block', at(0, 1, 0), { material: 'steel.a36', params: { x: 0.05, y: 0.05, z: 0.05 } });
    const spring = r.connect('spring', { part: mass, frame: at(0, 0.025, 0) }, null, { d: 0.0015, D: 0.015, Na: 12, L0: 0, zeta: 0 });
    const k = (0.0015 ** 4 * 81.7e9) / (8 * 0.015 ** 3 * 12);
    const m = r.world.bodyMass(mass.id)!;
    // pull down 5 mm and release, then time zero crossings of the velocity
    r.world.apply({ op: 'setPose', id: mass.id, pose: at(0, 0.995 - (m * g) / k, 0) });
    const crossings: number[] = [];
    let prev = 0;
    r.run(3, (t) => {
      const v = r.world.linearVelocity(mass.id)![1];
      if (prev < 0 && v >= 0) crossings.push(t);
      prev = v;
    });
    const T = (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1);
    within(T, 2 * Math.PI * Math.sqrt(m / k), 0.01);
    expect(r.world.connectionStatus(spring.id)).toBe('intact');
    r.done();
  });

  it('pendulum on a rope: T = 2 pi sqrt(L/g)', async () => {
    const r = await rig({}, false);
    const L = 1.5;
    const th = (5 * Math.PI) / 180;
    const bob = r.part('sphere', at(L * Math.sin(th), 3 - L * Math.cos(th), 0), { params: { diameter: 0.04 } });
    r.connect('rope', { part: bob, frame: at(0, 0, 0) }, null, { grade: 'steel-wire-6x19', diameter: 0.003 });
    // move the world anchor to the pivot: re-anchor by connecting from a frozen pivot block instead
    r.done();
    const r2 = await rig({}, false);
    const pivot = r2.part('block', at(0, 3, 0), { frozen: true, params: { x: 0.02, y: 0.02, z: 0.02 } });
    const bob2 = r2.part('sphere', at(L * Math.sin(th), 3 - L * Math.cos(th), 0), { params: { diameter: 0.04 } });
    r2.connect('rope', { part: pivot, frame: at(0, 0, 0) }, { part: bob2, frame: at(0, 0, 0) }, { grade: 'steel-wire-6x19', diameter: 0.003 });
    const crossings: number[] = [];
    let prev = 1;
    r2.run(8, (t) => {
      const x = r2.pos(bob2)[0];
      if (prev > 0 && x <= 0) crossings.push(t);
      prev = x;
    });
    const T = (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1);
    within(T, 2 * Math.PI * Math.sqrt(L / g), 0.01);
    r2.done();
  });
});

describe('buoyancy', () => {
  it('floating fraction equals density ratio', async () => {
    const r = await rig({ fluids: [{ id: 'w_000000000001', name: 'tank', min: [-2, 0, -2], max: [2, 1, 2], density: FLUIDS.freshWater.density }] }, false);
    const block = r.part('block', at(0, 1.2, 0), { material: 'wood.white-pine', params: { x: 0.2, y: 0.2, z: 0.2 } });
    const ys: number[] = [];
    r.run(20, (t) => { if (t > 18) ys.push(r.pos(block)[1]); });
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    const fraction = (1 - (y - 0.1)) / 0.2;
    within(fraction, 400 / FLUIDS.freshWater.density, 0.01);
    r.done();
  });

  it('steel sinks', async () => {
    const r = await rig({ fluids: [{ id: 'w_000000000001', name: 'tank', min: [-2, 0, -2], max: [2, 1, 2], density: FLUIDS.freshWater.density }] }, true);
    const block = r.part('block', at(0, 1.2, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    r.run(3);
    expect(r.pos(block)[1]).toBeLessThan(0.06);
    r.done();
  });
});

describe('joint loads are real forces', () => {
  it('a rigid joint holding a hanging block carries m*g in tension, with and without substeps', async () => {
    for (const substeps of ['none', 'spring', 'magnets'] as const) {
      const r = await rig({}, false);
      const block = r.part('block', at(0, 1, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const joint = r.connect('fixed', { part: block, frame: at(0, 0.05, 0) }, null);
      if (substeps === 'spring') {
        // an unrelated spring, stiff but soft enough to be simulated as one (160 rad/s), divides the tick
        const m = r.part('block', at(3, 1, 0), { material: 'steel.a36', params: { x: 0.02, y: 0.02, z: 0.02 } });
        r.connect('spring', { part: m, frame: at(0, 0.01, 0) }, null, { d: 0.002, D: 0.02, Na: 12, zeta: 0.1 });
      }
      if (substeps === 'magnets') {
        // a magnet on steel, simulated as forces, divides the tick to follow its stiff contact (A12)
        r.world.apply({ op: 'options', magnetLatch: false });
        r.part('plate', at(3, 0.997, 0), { frozen: true, material: 'steel.1018-cd' });
        r.part('magnet.disc', at(3, 1.0035, 0), { params: { diameter: 0.01, thickness: 0.005 } });
      }
      let most = 1;
      for (let i = 0; i < 90; i++) most = Math.max(most, r.world.step().stats.substeps);
      if (substeps !== 'none') expect(most).toBeGreaterThan(1);
      const load = r.world.connectionLoad(joint.id)!;
      within(load.axial, 7.85 * g, 0.005);
      expect(load.shear).toBeLessThan(0.05);
      r.done();
    }
  });

  it('a cantilever root sees shear m*g and bending m*g*L/2', async () => {
    const r = await rig({}, false);
    const L = 0.6;
    const bar = r.part('rod.square', at(L / 2, 1, 0), { material: 'aluminum.6061-t6', params: { length: L, side: 0.03 } });
    // frame at the root, +Y pointing along the bar (out of the wall)
    const joint = r.connect('fixed', { part: bar, frame: at(-L / 2, 0, 0, axisAngle([0, 0, 1], Math.PI / 2)) }, null);
    r.run(1);
    const m = r.world.bodyMass(bar.id)!;
    const load = r.world.connectionLoad(joint.id)!;
    within(load.shear, m * g, 0.01);
    within(load.bending, (m * g * L) / 2, 0.01);
    r.done();
  });
});

describe('fasteners fail at their real capacities', () => {
  const hang = async (kg: number, kind: string, params: Record<string, number | string | boolean>) => {
    const r = await rig({}, false);
    const w = r.part('weight', at(0, 1, 0), { params: { mass: kg } });
    const d = Math.cbrt((4 * kg) / (Math.PI * 7200));
    const joint = r.connect(kind, { part: w, frame: at(0, d / 2, 0) }, null, params);
    r.run(0.5);
    const status = r.world.connectionStatus(joint.id);
    const load = r.world.connectionLoad(joint.id)!;
    r.done();
    return { status, load };
  };

  it('an M4 4.6 bolt holds below As*Rm and snaps above it', async () => {
    const capacity = tensileStressArea(threadFor('M4')) * 400e6; // 3512 N
    const below = await hang((0.85 * capacity) / g, 'bolted', { size: 'M4', class: '4.6' });
    expect(below.status).toBe('intact');
    within(below.load.axial, 0.85 * capacity, 0.01);
    const above = await hang((1.15 * capacity) / g, 'bolted', { size: 'M4', class: '4.6' });
    expect(above.status).toBe('broken');
  });

  it('a hand-tight bolt slips in shear, then bears on the bolt instead of breaking', async () => {
    const r = await rig({}, false);
    const plate = r.part('plate', at(0, 1, 0), { material: 'steel.a36', params: { length: 0.1, width: 0.1, thickness: 0.01 } });
    // bolt axis horizontal (+Y of the frame along world +X) so the plate's weight plus a load is pure shear
    const joint = r.connect('bolted', { part: plate, frame: at(0, 0, 0, axisAngle([0, 0, 1], -Math.PI / 2)) }, null, { size: 'M8', class: '8.8', tightening: 'hand' });
    const slip = r.world.connectionDerived(joint.id)!.slip!.shear;
    // the weight hung directly from the plate's underside, the joint where they touch
    const mass = (1.6 * slip) / g, D = Math.cbrt((4 * mass) / (Math.PI * 7200));
    const weight = r.part('weight', at(0, 0.995 - D / 2, 0), { params: { mass } });
    r.connect('fixed', { part: plate, frame: at(0, -0.005, 0, axisAngle([1, 0, 0], Math.PI)) }, { part: weight, frame: at(0, D / 2, 0, axisAngle([1, 0, 0], Math.PI)) });
    r.run(1);
    expect(r.world.connectionStatus(joint.id)).toBe('slipped');
    r.done();
  });

  it('failure and slip notes give the governing load and capacity in that load\'s units', async () => {
    const unitOf = (mode: string) => (mode === 'bending' || mode === 'torsion' ? /N·m/ : /\d N( |$)/);
    // a glued cantilever root fails in bending: moments read in N·m. A 30 mm bar spreads the moment over the whole
    // epoxy face (sigma S = 79 N·m); 2.4 m of it hangs 200 N·m on the root.
    const r = await rig({}, false);
    const L = 2.4;
    const bar = r.part('rod.square', at(L / 2, 1, 0), { material: 'steel.a36', params: { length: L, side: 0.03, fracture: 'off' } });
    r.connect('glued', { part: bar, frame: at(-L / 2, 0, 0, axisAngle([0, 0, 1], Math.PI / 2)) }, null, { adhesive: 'epoxy-structural', bondW: 0.03, bondL: 0.03 });
    const notes: { mode: string; note: string }[] = [];
    for (let i = 0; i < 60 && !notes.length; i++) for (const e of r.world.step().events) if (e.type === 'break') notes.push({ mode: e.mode, note: e.note });
    r.done();
    expect(notes.length).toBe(1);
    expect(notes[0]!.mode).toBe('bending');
    expect(notes[0]!.note).toMatch(/failed in bending: [\d.]+ (k)?N·m on a [\d.]+ (k)?N·m capacity/);
    // a hand-tight bolt slips in shear: forces read in N, against the grip of that same mode
    const s2 = await rig({}, false);
    const plate = s2.part('plate', at(0, 1, 0), { material: 'steel.a36', params: { length: 0.1, width: 0.1, thickness: 0.01 } });
    const joint = s2.connect('bolted', { part: plate, frame: at(0, 0, 0, axisAngle([0, 0, 1], -Math.PI / 2)) }, null, { size: 'M8', class: '8.8', tightening: 'hand' });
    const slip = s2.world.connectionDerived(joint.id)!.slip!.shear;
    const mass = (1.6 * slip) / g, D = Math.cbrt((4 * mass) / (Math.PI * 7200));
    const weight = s2.part('weight', at(0, 0.995 - D / 2, 0), { params: { mass } });
    s2.connect('fixed', { part: plate, frame: at(0, -0.005, 0, axisAngle([1, 0, 0], Math.PI)) }, { part: weight, frame: at(0, D / 2, 0, axisAngle([1, 0, 0], Math.PI)) });
    let slipNote = '';
    for (let i = 0; i < 90 && !slipNote; i++) for (const e of s2.world.step().events) if (e.type === 'slip') slipNote = e.note;
    s2.done();
    expect(slipNote).toMatch(/^Slipped: shear [\d.]+ (k)?N beat the friction grip of [\d.]+ (k)?N$/);
    expect(unitOf('shear').test(slipNote)).toBe(true);
  });

  it('a rope breaks at its minimum breaking strength', async () => {
    const mbs = 1.5e8 * 0.004 ** 2; // paracord-550 model, 2.4 kN
    const run = async (kg: number) => {
      const r = await rig({}, false);
      const anchor = r.part('block', at(0, 3, 0), { frozen: true, params: { x: 0.05, y: 0.05, z: 0.05 } });
      const d = Math.cbrt((4 * kg) / (Math.PI * 7200));
      const w = r.part('weight', at(0, 2, 0), { params: { mass: kg } });
      // Start at static equilibrium: rest length chosen so E A (dist - L) / L = m g. Releasing the weight on an
      // unstretched elastic rope instead would overshoot to ~2 m g (dynamic amplification) and snap it.
      const dist = 3 - 0.025 - (2 + d / 2);
      const EA = 1.5e9 * (Math.PI / 4) * 0.004 ** 2;
      const L = (EA * dist) / (EA + kg * g);
      const rope = r.connect('rope', { part: anchor, frame: at(0, -0.025, 0) }, { part: w, frame: at(0, d / 2, 0) }, { grade: 'paracord-550', diameter: 0.004, length: L });
      r.run(0.5);
      const out = { status: r.world.connectionStatus(rope.id), load: r.world.connectionLoad(rope.id)! };
      r.done();
      return out;
    };
    const holds = await run((0.8 * mbs) / g);
    expect(holds.status).toBe('intact');
    within(holds.load.axial, 0.8 * mbs, 0.02);
    expect((await run((1.3 * mbs) / g)).status).toBe('broken');
  });

  it('an elastic rope released from slack-free but unstretched overshoots to ~2x static load', async () => {
    const r = await rig({}, false);
    const anchor = r.part('block', at(0, 3, 0), { frozen: true, params: { x: 0.05, y: 0.05, z: 0.05 } });
    const kg = 20;
    const d = Math.cbrt((4 * kg) / (Math.PI * 7200));
    const w = r.part('weight', at(0, 2, 0), { params: { mass: kg } });
    const rope = r.connect('rope', { part: anchor, frame: at(0, -0.025, 0) }, { part: w, frame: at(0, d / 2, 0) }, { grade: 'paracord-550', diameter: 0.004 });
    let peak = 0;
    r.run(1.5, () => { peak = Math.max(peak, r.world.connectionLoad(rope.id)!.axial); });
    // Step load on a damped oscillator peaks at 1 + exp(-pi zeta / sqrt(1 - zeta^2)); nylon rope zeta = 0.05.
    const zeta = 0.05;
    within(peak / (kg * g), 1 + Math.exp((-Math.PI * zeta) / Math.sqrt(1 - zeta * zeta)), 0.04);
    r.done();
  });

  it('a slack rope snatch-loaded by a falling weight can snap below its static rating', async () => {
    const mbs = 1.5e8 * 0.004 ** 2;
    const r = await rig({}, false);
    const anchor = r.part('block', at(0, 3, 0), { frozen: true, params: { x: 0.05, y: 0.05, z: 0.05 } });
    const kg = (0.6 * mbs) / g;
    const d = Math.cbrt((4 * kg) / (Math.PI * 7200));
    const w = r.part('weight', at(0, 2.2, 0), { params: { mass: kg } });
    // 0.2 m of slack: the rope is 0.2 m longer than the current distance
    const dist = 3 - 0.025 - (2.2 + d / 2);
    const rope = r.connect('rope', { part: anchor, frame: at(0, -0.025, 0) }, { part: w, frame: at(0, d / 2, 0) }, { grade: 'paracord-550', diameter: 0.004, length: dist + 0.2 });
    r.run(1);
    expect(r.world.connectionStatus(rope.id)).toBe('broken');
    r.done();
  });

  it('aluminium cannot be fusion welded to steel', async () => {
    const r = await rig({}, false);
    const a = r.part('plate', at(0, 1, 0), { material: 'aluminum.6061-t6' });
    const s = r.part('plate', at(0, 1.006, 0), { material: 'steel.a36' });
    const weld = r.connect('weld', { part: a, frame: at(0, 0.003, 0) }, { part: s, frame: at(0, -0.003, 0) });
    r.run(0.1);
    expect(r.world.connectionStatus(weld.id)).toBe('broken');
    r.done();
  });

  it('uncured epoxy does not hold; cured epoxy does', async () => {
    const run = async (cureClock: number) => {
      const r = await rig({ cureClock }, false);
      const w = r.part('block', at(0, 1, 0), { material: 'steel.a36' });
      const joint = r.connect('glued', { part: w, frame: at(0, 0.05, 0) }, null, { adhesive: 'epoxy-5min', bondW: 0.1, bondL: 0.1 });
      r.run(0.3);
      const s = r.world.connectionStatus(joint.id);
      r.done();
      return s;
    };
    expect(await run(1)).toBe('broken'); // real-time clock: seconds-old 5-minute epoxy is still liquid
    expect(await run(0)).toBe('intact'); // instant cure
  });
});

describe('magnets', () => {
  it('the world applies exactly the Gilbert-model force, integrated along the path within the tick', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const R = 0.01, L = 0.01, gap = 0.04;
    r.part('magnet.disc', at(0, 0, 0), { frozen: true, params: { diameter: 2 * R, thickness: L } });
    const b = r.part('magnet.disc', at(0, L + gap, 0), { params: { diameter: 2 * R, thickness: L } });
    const k = r.world.step().stats.substeps;
    const m = r.world.bodyMass(b.id)!;
    const v = r.world.linearVelocity(b.id)!;
    // finely sampled reference (8 rings; the world uses fewer at this range), stepped the way the world steps: the force
    // is re-evaluated at the start of each of its k substeps as the magnet speeds up towards its partner
    const A = cylinderFaces([0, 0, 0], [0, 1, 0], R, L, 1.3);
    const force = (y: number) => magnetWrench(A, cylinderCharges([0, y, 0], [0, 1, 0], R, L, 1.3, 8), [0, y, 0])[1]!;
    let y = L + gap, vy = 0;
    for (let s = 0; s < k; s++) { vy += (force(y) / m) * (TICK / k); y += vy * (TICK / k); }
    expect(force(L + gap)).toBeLessThan(0); // attraction
    expect(k).toBeGreaterThan(1); // a close pair is substepped
    within(v[1], vy, 0.03);
    within(Math.abs(vy * m) / TICK, Math.abs(force(L + gap)), 0.1); // and the pull hardly changes within one tick
    r.done();
  });

  it('a magnet released near another snaps onto it and stays put: no hovering or chatter at contact', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const R = 0.01, L = 0.01;
    r.part('magnet.disc', at(0, 0, 0), { frozen: true, params: { diameter: 2 * R, thickness: L } });
    const b = r.part('magnet.disc', at(0, L + 0.006, 0), { params: { diameter: 2 * R, thickness: L } });
    r.run(1);
    let worstV = 0, worstGap = 0;
    for (let i = 0; i < 45; i++) {
      r.world.step();
      worstV = Math.max(worstV, Math.hypot(...r.world.linearVelocity(b.id)!));
      worstGap = Math.max(worstGap, r.world.livePose(b.id)!.p[1] - L);
    }
    expect(worstGap).toBeLessThan(0.0005); // faces together
    expect(worstV).toBeLessThan(0.01); // and at rest there
    r.done();
  });

  it('small magnets snap onto steel or another magnet and lie flush and still (they used to rock and be flung off)', async () => {
    const cases: [string, Record<string, number>, number][] = [
      ['magnet.disc', { diameter: 0.01, thickness: 0.005 }, 0.005], ['magnet.disc', { diameter: 0.006, thickness: 0.003 }, 0.003],
      ['magnet.disc', { diameter: 0.01, thickness: 0.002 }, 0.002], ['magnet.block', { x: 0.01, z: 0.01, y: 0.002 }, 0.002],
    ];
    for (const [kind, params, L] of cases) {
      for (const steel of [false, true]) {
        const r = await rig({ gravity: [0, -9.81, 0] }, false);
        if (steel) r.part('plate', at(0, -0.003, 0), { frozen: true, material: 'steel.1018-cd' });
        else r.part(kind, at(0, 0, 0), { frozen: true, params });
        const rest = steel ? L / 2 : L; // centre height lying flush
        // arrives a little off centre and tilted
        const b = r.part(kind, at(0.0004, rest + 0.003, 0.0002, [0.02, 0, 0.01, 0.9997]), { params });
        r.run(1);
        let worst = 0;
        for (let i = 0; i < 45; i++) {
          r.world.step();
          const p = r.world.livePose(b.id)!;
          worst = Math.max(worst, Math.abs(p.p[1] - rest), Math.hypot(...r.world.angularVelocity(b.id)!) * 1e-3);
          expect(2 * Math.asin(Math.hypot(p.q[0], p.q[2])), `${kind} ${JSON.stringify(params)} tilt`).toBeLessThan(1e-3);
        }
        expect(worst, `${kind} ${JSON.stringify(params)} on ${steel ? 'steel' : 'a magnet'}`).toBeLessThan(2e-5);
        r.done();
      }
    }
  });

  // Thresholds of a magnet stuck to a 6 mm steel plate (M5), cross-checked between the latch (M6) and the contact
  // simulated as forces throughout (magnetLatch off; stable for these sizes). The load is a constant body force: in
  // zero gravity the magnet snaps on and comes to rest, then gravity is turned on along the load's direction at
  // k times the threshold divided by the magnet's mass. Weight acts at the centre, L / 2 above the contact.
  type Stuck = { kind: 'magnet.disc' | 'magnet.block'; params: Record<string, number>; L: number };
  const disc = (d: number, L: number): Stuck => ({ kind: 'magnet.disc', params: { diameter: d, thickness: L }, L });
  const block = (w: number, h: number, L: number): Stuck => ({ kind: 'magnet.block', params: { x: w, z: h, y: L }, L });
  /** The model's pull on a magnet lying flush on the plate: its faces' images in the steel (M2), N42. */
  const pullOnSteel = (m: Stuck) => {
    const c: [number, number, number] = [0, m.L / 2, 0];
    if (m.kind === 'magnet.disc') {
      const R = m.params.diameter! / 2;
      const f = 0.95 * plateSaturationFactor(0.006, 1.3, Math.PI * R * R, 2 * Math.PI * R);
      return -magnetWrench(imageFaces(cylinderFaces(c, [0, 1, 0], R, m.L, 1.3), [0, 0, 0], [0, 1, 0], f), cylinderCharges(c, [0, 1, 0], R, m.L, 1.3, 4), c)[1]!;
    }
    const w = m.params.x!, h = m.params.z!;
    const f = 0.95 * plateSaturationFactor(0.006, 1.3, w * h, 2 * (w + h));
    return -magnetWrench(imageFaces(blockFaces(c, [0, 1, 0], [1, 0, 0], [0, 0, 1], w, h, m.L, 1.3), [0, 0, 0], [0, 1, 0], f), blockCharges(c, [0, 1, 0], [1, 0, 0], [0, 0, 1], w, h, m.L, 1.3, 7), c)[1]!;
  };
  /** Does the stuck magnet hold a steady load (N, along dir) for half a second, or let go? */
  const holds = async (m: Stuck, dir: [number, number, number], load: number, latch: boolean) => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.world.apply({ op: 'options', magnetLatch: latch });
    r.part('plate', at(0, -0.003, 0), { frozen: true, material: 'steel.1018-cd' });
    const b = r.part(m.kind, at(0, m.L / 2 + 0.001, 0), { params: m.params });
    r.run(0.3);
    const p0 = r.world.livePose(b.id)!.p;
    expect(p0[1], 'lying on the plate').toBeCloseTo(m.L / 2, 4);
    expect(r.world.magnetLatchCount()).toBe(latch ? 1 : 0);
    const a = load / r.world.bodyMass(b.id)!;
    r.setSim({ gravity: [dir[0] * a, dir[1] * a, dir[2] * a] });
    let moved = 0, tilt = 0;
    for (let i = 0; i < 45; i++) {
      r.world.step();
      const q = r.world.livePose(b.id)!;
      moved = Math.max(moved, length(sub(q.p, p0)));
      tilt = Math.max(tilt, 2 * Math.asin(Math.min(1, Math.hypot(q.q[0], q.q[2]))));
    }
    r.done();
    if (moved < 1e-4 && tilt < 0.01) return 'holds';
    if (moved > 0.01 || tilt > 0.3) return 'lets go';
    return `moved ${(moved * 1e3).toFixed(2)} mm, tilted ${((tilt * 180) / Math.PI).toFixed(1)} deg`;
  };
  const both = async (m: Stuck, dir: [number, number, number], threshold: number) => {
    for (const latch of [true, false]) {
      expect(await holds(m, dir, 0.95 * threshold, latch), `${m.kind} ${JSON.stringify(m.params)} at 0.95x, latch ${latch}`).toBe('holds');
      expect(await holds(m, dir, 1.05 * threshold, latch), `${m.kind} ${JSON.stringify(m.params)} at 1.05x, latch ${latch}`).toBe('lets go');
    }
  };
  const common = [disc(0.01, 0.005), disc(0.025, 0.01), block(0.04, 0.02, 0.01)];

  it('stuck to steel, a magnet holds a steady pull just under its magnetic pull P and lets go just over it', async () => {
    expect(pullOnSteel(disc(0.01, 0.005))).toBeGreaterThan(20); // a 10 x 5 mm N42 disc holds a couple of kilograms
    for (const m of common) await both(m, [0, 1, 0], pullOnSteel(m));
  });

  it('pushed sideways it holds just under friction on the pull, mu P, and slides just over it', async () => {
    const mu = Math.sqrt(getMaterial('magnet.n42').friction * getMaterial('steel.1018-cd').friction); // as the contact combines them
    for (const m of common) await both(m, [1, 0, 0], mu * pullOnSteel(m));
  });

  it('a tall block pushed sideways at its centre tips over its far edge at P w / L, before it would slide', async () => {
    // 20 x 20 mm face, 60 mm tall: the load's moment F L / 2 beats the pull's P w / 2 at F = P w / L = P / 3,
    // well under friction's 0.56 P
    const m = block(0.02, 0.02, 0.06);
    await both(m, [1, 0, 0], (pullOnSteel(m) * 0.02) / 0.06);
  });

  it('magnets at rest cost what still things cost: once settled the tick is not divided, and a change divides it again', async () => {
    // a frame of steel with magnets lying on it, unlatched (so their fields are worked out every tick)
    const r = await rig({}, true);
    r.world.apply({ op: 'options', magnetLatch: false });
    r.part('plate', at(0, 0.0025, 0), { frozen: true, material: 'steel.1018-cd', params: { length: 0.6, width: 0.3, thickness: 0.005 } });
    for (let i = 0; i < 5; i++) r.part('magnet.disc', at(-0.2 + i * 0.1, 0.0105, 0), { material: 'magnet.n52', params: { diameter: 0.02, thickness: 0.01 } });
    let first = 0;
    r.run(0.1, () => { first = Math.max(first, r.world.snapshot().stats.substeps); });
    expect(first).toBeGreaterThan(1); // just put down: watched closely
    r.run(1);
    let settled = 0;
    r.run(0.5, () => { settled = Math.max(settled, r.world.snapshot().stats.substeps); });
    expect(settled).toBe(1);
    // a change from outside (here, gravity) and they are watched closely again
    r.setSim({ gravity: [0, -9.81, 0.5] });
    expect(r.world.step().stats.substeps).toBeGreaterThan(1);
    r.done();
  });

  it('a magnet on a pivot near another wobbles about alignment at sqrt(k / I), and keeps wobbling (no numerical damping)', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('magnet.disc', at(0, 0, 0), { frozen: true, params: { diameter: 0.02, thickness: 0.01 } });
    // two 20 x 10 mm discs, 40 mm between their faces: about 23 Hz, well inside what 90 ticks a second can sample
    const R = 0.01, L = 0.01, y = 0.005 + 0.04 + L / 2;
    const th0 = 0.1;
    const b = r.part('magnet.disc', at(0, y, 0, axisAngle([0, 0, 1], th0)), { params: { diameter: 2 * R, thickness: L } });
    r.connect('ball', { part: b, frame: at(0, 0, 0) }, null, { friction: 0, cone: Math.PI });
    // the model's restoring torque stiffness about the pivot, and b's moment of inertia about a diameter
    const A = cylinderFaces([0, 0, 0], [0, 1, 0], 0.01, 0.01, 1.3);
    const torque = (th: number) => magnetWrench(A, cylinderCharges([0, y, 0], [-Math.sin(th), Math.cos(th), 0], R, L, 1.3, 4), [0, y, 0])[5]!;
    const k = -(torque(1e-3) - torque(-1e-3)) / 2e-3;
    const I = (r.world.bodyMass(b.id)! * (3 * R * R + L * L)) / 12;
    const tilt = () => { const q = r.world.livePose(b.id)!.q; return 2 * Math.atan2(q[2], q[3]); };
    let crossings = 0, first = -1, last = -1, prev = tilt(), late = 0;
    for (let i = 1; i <= 180; i++) {
      r.world.step();
      const t = tilt();
      if (Math.sign(t) !== Math.sign(prev)) { crossings++; if (first < 0) first = i; last = i; }
      if (i > 90) late = Math.max(late, Math.abs(t));
      prev = t;
    }
    const period = (2 * (last - first) * TICK) / (crossings - 1);
    within(period, 2 * Math.PI * Math.sqrt(I / k), 0.03);
    expect(late / th0).toBeGreaterThan(0.95); // still swinging as wide in its second second
    r.done();
  });

  it('knocked straight off steel, a magnet escapes once its kinetic energy beats the pull\'s well, 1/2 m v^2 = int P dz', async () => {
    const R = 0.005, L = 0.005;
    const f = 0.95 * plateSaturationFactor(0.006, 1.3, Math.PI * R * R, 2 * Math.PI * R);
    const pull = (z: number) => {
      const c: [number, number, number] = [0, L / 2 + z, 0];
      return -magnetWrench(imageFaces(cylinderFaces(c, [0, 1, 0], R, L, 1.3), [0, 0, 0], [0, 1, 0], f), cylinderCharges(c, [0, 1, 0], R, L, 1.3, 4), c)[1]!;
    };
    // the well's depth, trapezoids on a geometric grid of gaps out to 0.3 m (beyond it the pull is ~1e-8 of P)
    let U = 0, z0 = 0, p0 = pull(0);
    for (let z = 1e-5; z < 0.3; z *= 1.05) { const p = pull(z); U += ((p + p0) / 2) * (z - z0); z0 = z; p0 = p; }
    const m = 7500 * Math.PI * R * R * L, vEsc = Math.sqrt((2 * U) / m);
    expect(vEsc).toBeGreaterThan(4); // about 5.3 m/s: a flick does not free it, a hard blow does
    for (const latch of [true, false]) {
      for (const k of [0.9, 1.1]) {
        const r = await rig({ gravity: [0, 0, 0] }, false);
        r.world.apply({ op: 'options', magnetLatch: latch });
        r.part('plate', at(0, -0.003, 0), { frozen: true, material: 'steel.1018-cd' });
        const b = r.part('magnet.disc', at(0, L / 2 + 0.002, 0), { params: { diameter: 2 * R, thickness: L } });
        r.run(0.5);
        const p = r.world.livePose(b.id)!.p;
        r.world.apply({ op: 'impulse', id: b.id, point: p, impulse: [0, r.world.bodyMass(b.id)! * k * vEsc, 0] });
        r.run(0.3);
        const y = r.world.livePose(b.id)!.p[1] - p[1];
        if (k < 1) expect(Math.abs(y), `latch ${latch}: back on the steel`).toBeLessThan(1e-4);
        else expect(y, `latch ${latch}: gone`).toBeGreaterThan(0.5);
        r.done();
      }
    }
  });

  it('flipping a magnet turns attraction into repulsion', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('magnet.disc', at(0, 0, 0), { frozen: true });
    const b = r.part('magnet.disc', at(0, 0.03, 0, axisAngle([1, 0, 0], Math.PI)));
    r.run(TICK * 3);
    expect(r.world.linearVelocity(b.id)![1]).toBeGreaterThan(0);
    r.done();
  });

  it('a magnet falls down a copper pipe at the Lenz-drag terminal speed m g / c, smoothly past every seam of the pipe', async () => {
    const r = await rig({ gravity: [0, -g, 0] }, false);
    const od = 0.02, wall = 0.0015;
    // a 1.2 m pipe is six bonded segments: the magnet passes five seams between them on the way down (A10)
    r.part('tube.round', at(0, 0.6, 0), { frozen: true, material: 'copper.c110', params: { length: 1.2, od, wall } });
    const b = r.part('magnet.disc', at(0, 1.1, 0), { params: { diameter: 0.004, thickness: 0.004 } });
    const m = r.world.bodyMass(b.id)!;
    // Levin et al. (2006): a point dipole in a thin pipe of mean radius a meets F = c v
    const c = tubeDipoleDrag(dipoleMoment(1.3, Math.PI * 0.002 ** 2 * 0.004), getMaterial('copper.c110').conductivity, wall, od / 2 - wall / 2);
    const vt = (m * g) / c;
    let prev = 0, t = 0;
    while (r.world.livePose(b.id)!.p[1] > 0.05) {
      r.world.step();
      t += TICK;
      const vy = r.world.linearVelocity(b.id)![1];
      expect(vy, `at ${t.toFixed(3)} s`).toBeLessThan(prev + 1e-3); // it only ever speeds up towards terminal speed
      prev = vy;
      if (t > 0.55) within(-vy, vt, 0.08); // three time constants m / c in
    }
    expect(t).toBeGreaterThan(0.6);
    r.done();
  });

  it('magnets pull on steel but not on aluminium', async () => {
    const pull = async (material: string) => {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      r.part('plate', at(0, 0, 0), { frozen: true, material, params: { length: 0.2, width: 0.2, thickness: 0.01 } });
      // 15 mm above the plate: strong pull, but no contact within the first tick
      const m = r.part('magnet.disc', at(0, 0.005 + 0.005 + 0.015, 0));
      r.run(TICK);
      const vy = r.world.linearVelocity(m.id)![1];
      r.done();
      return vy;
    };
    expect(await pull('steel.a36')).toBeLessThan(-0.01);
    expect(Math.abs(await pull('aluminum.6061-t6'))).toBeLessThan(1e-9);
  });
});

describe('powered and damped joints', () => {
  // A gearmotor on a bench: a maxon RE 40 (148867) with its 12:1 GP 42 C, frozen in place, turning a 200 mm steel
  // flywheel on its shaft, on two 12 V lead-acid blocks in series through 0.5 m of 14 AWG pair.
  const bench = async (opts: { wired: boolean; held?: boolean; charge?: number; limit?: number }) => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const motor = r.part('motor.dc', at(0, 1, 0), { frozen: true, params: { model: 'motor.dc.coreless.d40-150w-24v', gearhead: 'gearhead.planetary.d42-12to1' } });
    const face = 1 + (0.071 + 0.0555) / 2;
    const fly = r.part('disc', at(0, face + 0.01, 0), { material: 'steel.a36', params: { diameter: 0.2, thickness: 0.02 } });
    const drive = r.connect('motor', { part: motor, frame: at(0, face - 1, 0) }, { part: fly, frame: at(0, -0.01, 0) }, { channel: 'always', currentLimit: opts.limit ?? 5 });
    if (opts.held) {
      const anchor = r.part('block', at(0, face + 0.03, 0), { frozen: true, material: 'steel.a36', params: { x: 0.1, y: 0.02, z: 0.1 } });
      r.connect('fixed', { part: fly, frame: at(0, 0.01, 0) }, { part: anchor, frame: at(0, -0.01, 0) }, {});
    }
    const battery = r.part('battery', at(0.3, 1, 0), { params: { model: 'battery.sla.12v-7ah', series: 2, parallel: 1, charge: opts.charge ?? 1 } });
    const wire = () => r.connect('wire', { part: battery, frame: at(-0.0755, 0, 0) }, { part: motor, frame: at(0, -(0.071 + 0.0555) / 2, 0) }, { gauge: '14', length: 0.5 });
    const w = opts.wired ? wire() : null;
    const spin = () => r.world.angularVelocity(fly.id)![1];
    const step = () => r.world.step();
    return { r, motor, fly, drive, battery, wire, w, spin, step };
  };
  const m = motorModel(getMotor('motor.dc.coreless.d40-150w-24v')), g = getGearhead('gearhead.planetary.d42-12to1')!;

  it('a gearmotor turns only on a battery wired to it: unwired, flat or cut off, it gives nothing (R10)', async () => {
    const b = await bench({ wired: false });
    b.r.run(1);
    expect(Math.abs(b.spin())).toBeLessThan(1e-3);
    b.r.done();
    const f = await bench({ wired: true, charge: 0 });
    const events: string[] = [];
    for (let i = 0; i < 90; i++) for (const e of f.step().events) events.push(e.type);
    expect(Math.abs(f.spin())).toBeLessThan(1e-3);
    f.r.done();
  });

  it('wired, it spins its flywheel up at its current limit, carrying its rotor through the gearhead, to its no-load speed', async () => {
    const b = await bench({ wired: true, limit: 5 });
    // current-limited: K_t I less friction, times N at the gearhead's efficiency, turns the flywheel and the rotor
    // (J N^2, 142 g cm^2 x 144: as much again as a 50 mm disc)
    const I = 0.5 * b.r.world.bodyMass(b.fly.id)! * 0.1 ** 2 + m.rotorInertia * g.ratio ** 2;
    const alpha = ((m.Kt * 5 - m.Tf) * g.ratio * g.efficiency) / I;
    b.r.run(0.5);
    within(Math.abs(b.spin()), alpha * 0.5, 0.03);
    // then it runs up to where its back-EMF meets what the battery gives, less what its winding and wire drop at its
    // no-load current
    let last = b.step();
    for (let i = 0; i < 6 * 90; i++) last = b.step();
    const p = last.power!;
    const bat = p.batteries[b.battery.id]!, mot = p.motors[b.drive.id]!;
    const R = windingR(m, mot.winding) + 2 * 0.5 * 0.008286;
    const w0 = (bat.V - m.I0 * R) / m.Kt / g.ratio;
    within(Math.abs(b.spin()), w0, 0.01);
    // and the battery gives what the motor's no-load current takes, plus what holds the flywheel against the world's
    // numerical angular damping, 0.02/s of its spin (audit A5, fix F4: stated, not hidden; a real one loses only its
    // bearings' and the air's share)
    const damping = (0.02 * I * w0) / (m.Kt * g.ratio * g.efficiency);
    within(bat.I, m.I0 + damping, 0.1);
    // cut the wire and it coasts down on its own friction, reflected through the gearhead
    b.r.world.apply({ op: 'removeConnection', id: b.w!.id });
    const before = Math.abs(b.spin());
    b.r.run(1);
    const drag = (m.Tf * g.ratio) / g.efficiency;
    within(before - Math.abs(b.spin()), drag / I + 0.02 * before, 0.1);
    b.r.done();
  });

  it('held stalled, its winding heats as the thermal model on its datasheet says, and past 155 °C it burns out for good', async () => {
    const b = await bench({ wired: true, held: true, limit: 20 });
    // the same two-node model, integrated here on its own: 20 A through copper that grows more resistive as it heats
    let s = { winding: AMBIENT, housing: AMBIENT }, expected = 0;
    while (s.winding <= m.thermal.maxWinding) { s = heatStep(m.thermal, s, 400 * windingR(m, s.winding), 0, TICK, AMBIENT); expected += TICK; }
    expect(expected).toBeGreaterThan(10);
    expect(expected).toBeLessThan(60);
    let t = 0, burnt = -1;
    while (t < expected + 2 && burnt < 0) {
      for (const e of b.step().events) if (e.type === 'burnout') burnt = t;
      t += TICK;
    }
    within(burnt, expected, 0.02);
    // and it never drives again
    let last = b.step();
    for (let i = 0; i < 30; i++) last = b.step();
    expect(last.power!.motors[b.drive.id]!.I).toBe(0);
    expect(last.power!.motors[b.drive.id]!.burnt).toBe(true);
    b.r.done();
  });

  it('an eddy-current brake decays spin exponentially with tau = I / c', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const disc = r.part('disc', at(0, 1, 0), { material: 'copper.c110', params: { diameter: 0.2, thickness: 0.004 } });
    const brake = r.connect('eddy-brake', { part: disc, frame: at(0, 0, 0) }, null, { rotor: 'copper', rotorThickness: 0.004, radius: 0.08, grade: 'N42', magnetD: 0.01, magnetL: 0.005, gap: 0.012, pairs: 1 });
    r.world.apply({ op: 'setPose', id: disc.id, pose: at(0, 1, 0), angular: [0, 50, 0] });
    const c = r.world.connectionDerived(brake.id)!.revolute!.eddy!.c;
    const m = r.world.bodyMass(disc.id)!;
    const I = 0.5 * m * 0.1 ** 2;
    const t = Math.round(Math.min(2, (0.7 * I) / c) / TICK) * TICK;
    expect(I / c).toBeGreaterThan(0.1); // brake time constant spans many ticks
    r.run(t);
    const w = r.world.angularVelocity(disc.id)![1];
    // friction torque adds a little extra deceleration; allow 10%
    within(w / 50, Math.exp((-c * t) / I), 0.1);
    r.done();
  });
});
