// Physics conformance: generic laws, never specific builds.

import { describe, expect, it } from 'vitest';
import { at, rig, within } from './helpers';
import { axisAngle } from '../../src/doc/math';
import { TICK } from '../../src/physics/world';
import { tensileStressArea, threadFor } from '../../src/engineering/threads';
import { cylinderCharges, cylinderFaces, dipoleMoment, imageFaces, magnetWrench, plateSaturationFactor } from '../../src/engineering/magnets';
import { tubeDipoleDrag } from '../../src/engineering/eddy';
import { dcMotorSpecs } from '../../src/engineering/mechanics';
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
    for (const stiffSpring of [false, true]) {
      const r = await rig({}, false);
      const block = r.part('block', at(0, 1, 0), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
      const joint = r.connect('fixed', { part: block, frame: at(0, 0.05, 0) }, null);
      if (stiffSpring) {
        // an unrelated stiff spring forces the world onto multiple substeps
        const m = r.part('block', at(3, 1, 0), { material: 'steel.a36', params: { x: 0.02, y: 0.02, z: 0.02 } });
        r.connect('spring', { part: m, frame: at(0, 0.01, 0) }, null, { d: 0.004, D: 0.02, Na: 3, zeta: 0.1 });
      }
      r.run(1);
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
    const weight = r.part('weight', at(0, 0.6, 0), { params: { mass: (1.6 * slip) / g } });
    r.connect('fixed', { part: plate, frame: at(0, -0.005, 0, axisAngle([1, 0, 0], Math.PI)) }, { part: weight, frame: at(0, 0.6 - 0.995 + 0.3, 0) });
    r.run(1);
    expect(r.world.connectionStatus(joint.id)).toBe('slipped');
    r.done();
  });

  it('failure and slip notes give the governing load and capacity in that load\'s units', async () => {
    const unitOf = (mode: string) => (mode === 'bending' || mode === 'torsion' ? /N·m/ : /\d N( |$)/);
    // a glued cantilever root fails in bending: moments read in N·m
    const r = await rig({}, false);
    const L = 0.6;
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
    const weight = s2.part('weight', at(0, 0.6, 0), { params: { mass: (1.6 * slip) / g } });
    s2.connect('fixed', { part: plate, frame: at(0, -0.005, 0, axisAngle([1, 0, 0], Math.PI)) }, { part: weight, frame: at(0, 0.6 - 0.995 + 0.3, 0) });
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

  /** A 10 x 5 mm N42 disc stuck to a 6 mm steel plate, in zero gravity, and the model's pull on it lying flush. */
  const stuckToSteel = async (L = 0.005) => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('plate', at(0, -0.003, 0), { frozen: true, material: 'steel.1018-cd' });
    const b = r.part('magnet.disc', at(0, L / 2 + 0.002, 0), { params: { diameter: 0.01, thickness: L } });
    r.run(0.5);
    expect(r.world.magnetLatchCount()).toBe(1);
    const c: [number, number, number] = [0, L / 2, 0];
    const factor = 0.95 * plateSaturationFactor(0.006, 1.3, Math.PI * 0.005 ** 2, 2 * Math.PI * 0.005);
    const faces = imageFaces(cylinderFaces(c, [0, 1, 0], 0.005, L, 1.3), [0, 0, 0], [0, 1, 0], factor);
    const pull = -magnetWrench(faces, cylinderCharges(c, [0, 1, 0], 0.005, L, 1.3, 4), c)[1]!;
    return { r, b, pull };
  };
  /** Ramp a force on b (at `point` above its centre) until the latch lets go; returns the force then. */
  const rampUntilReleased = (r: Awaited<ReturnType<typeof rig>>, id: string, dir: [number, number, number], rate: number, point: [number, number, number]) => {
    for (let i = 1; i < 2000; i++) {
      const F = rate * i * TICK;
      const p = r.world.livePose(id)!.p;
      r.world.apply({ op: 'impulse', id, point: [p[0] + point[0], p[1] + point[1], p[2] + point[2]], impulse: [dir[0] * F * TICK, dir[1] * F * TICK, dir[2] * F * TICK] });
      r.world.step();
      if (r.world.magnetLatchCount() === 0) return F;
    }
    return Infinity;
  };

  it('pulled straight off, a stuck magnet lets go at its magnetic pull, not before', async () => {
    const { r, b, pull } = await stuckToSteel();
    expect(pull).toBeGreaterThan(5); // a 10 x 5 mm N42 disc holds a few kilograms on steel
    const F = rampUntilReleased(r, b.id, [0, 1, 0], pull / 1.5, [0, 0, 0]);
    expect(F / pull).toBeGreaterThan(0.99);
    expect(F / pull).toBeLessThan(1.04);
    r.done();
  });

  it('pushed sideways it slides once the push beats friction on the pull (mu N), and a tall one tips over first', async () => {
    const mu = Math.sqrt(0.5 * 0.62); // nickel-plated magnet on steel, as the contact combines them
    {
      const { r, b, pull } = await stuckToSteel();
      const F = rampUntilReleased(r, b.id, [1, 0, 0], pull / 1.5, [0, 0, 0]);
      expect(F / (mu * pull)).toBeGreaterThan(0.99);
      expect(F / (mu * pull)).toBeLessThan(1.04);
      r.done();
    }
    {
      // 10 mm across, 20 mm tall, pushed at its top face: the push's moment about the far edge, F L, beats the
      // pull's, P R, at F = P R / L = P / 4, well before friction (0.56 P) would let it slide
      const L = 0.02;
      const { r, b, pull } = await stuckToSteel(L);
      const F = rampUntilReleased(r, b.id, [1, 0, 0], pull / 1.5, [0, L / 2, 0]);
      expect(F / ((pull * 0.005) / L)).toBeGreaterThan(0.9);
      expect(F / ((pull * 0.005) / L)).toBeLessThan(1.1);
      r.done();
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
  it('a free DC motor spins up to its no-load speed', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const disc = r.part('disc', at(0, 1, 0), { material: 'aluminum.6061-t6', params: { diameter: 0.1, thickness: 0.01 } });
    const params = { V: 12, Kv: 800, R: 0.4, ratio: 20, efficiency: 0.8, channel: 'always' };
    r.connect('motor', { part: disc, frame: at(0, 0, 0) }, null, params);
    r.run(3);
    const w = r.world.angularVelocity(disc.id)![1];
    const w0 = dcMotorSpecs({ V: 12, Kv: 800, R: 0.4, ratio: 20, efficiency: 0.8 }).noLoadSpeed;
    within(Math.abs(w), w0, 0.03);
    r.done();
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
