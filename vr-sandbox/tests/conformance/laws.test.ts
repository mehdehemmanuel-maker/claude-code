// Physics conformance: generic laws, never specific builds.

import { describe, expect, it } from 'vitest';
import { at, rig, within } from './helpers';
import { axisAngle } from '../../src/doc/math';
import { TICK } from '../../src/physics/world';
import { tensileStressArea, threadFor } from '../../src/engineering/threads';
import { chargeInteraction, cylinderCharges, ringsForGap } from '../../src/engineering/magnets';
import { dcMotorSpecs } from '../../src/engineering/mechanics';
import { FLUIDS, STANDARD_GRAVITY as g } from '../../src/data/materials';

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
  it('the world applies exactly the Gilbert-model force', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    // Gap large enough that the magnet does not reach its partner within the measured tick.
    const R = 0.01, L = 0.01, gap = 0.04;
    r.part('magnet.disc', at(0, 0, 0), { frozen: true, params: { diameter: 2 * R, thickness: L } });
    const b = r.part('magnet.disc', at(0, L + gap, 0), { params: { diameter: 2 * R, thickness: L } });
    r.run(TICK);
    const m = r.world.bodyMass(b.id)!;
    const v = r.world.linearVelocity(b.id)!;
    const rings = 8; // converged reference; the world uses fewer rings at this range
    void ringsForGap;
    const expected = chargeInteraction(cylinderCharges([0, 0, 0], [0, 1, 0], R, L, 1.3, rings), cylinderCharges([0, L + gap, 0], [0, 1, 0], R, L, 1.3, rings), [0, L + gap, 0])[1]!;
    expect(expected).toBeLessThan(0); // attraction
    within((m * v[1]) / TICK, expected, 0.03);
    r.done();
  });

  it('flipping a magnet turns attraction into repulsion', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('magnet.disc', at(0, 0, 0), { frozen: true });
    const b = r.part('magnet.disc', at(0, 0.03, 0, axisAngle([1, 0, 0], Math.PI)));
    r.run(TICK * 3);
    expect(r.world.linearVelocity(b.id)![1]).toBeGreaterThan(0);
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
