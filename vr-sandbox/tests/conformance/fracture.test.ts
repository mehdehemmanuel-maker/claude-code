// Breakable stock: segment bonds carry exact section forces, ductile metals yield into plastic hinges and tear
// at their ductility, brittle materials and wood snap at their strength. Generic laws, never specific builds.

import { afterEach, describe, expect, it } from 'vitest';
import { at, rig as makeRig, within, type Rig } from './helpers';
import { STANDARD_GRAVITY as g, getMaterial } from '../../src/data/materials';
import { makePart } from '../../src/doc/commands';
import type { PhysicsEvent } from '../../src/physics/protocol';
import type { Part, Quat, Vec3 } from '../../src/doc/types';
import { qconj, qmul, rotate } from '../../src/doc/math';

/** Torque-free rigid body: Euler's equations in the body frame plus quaternion kinematics, RK4 at 0.1 ms. */
function eulerReference(I: Vec3, w0: Vec3, T: number): Quat {
  let q: Quat = [0, 0, 0, 1];
  let w = rotate(qconj(q), w0);
  const h = 1e-4;
  const f = (qq: Quat, ww: Vec3) => ({
    dq: qmul(qq, [ww[0] / 2, ww[1] / 2, ww[2] / 2, 0]),
    dw: [((I[1] - I[2]) * ww[1] * ww[2]) / I[0], ((I[2] - I[0]) * ww[2] * ww[0]) / I[1], ((I[0] - I[1]) * ww[0] * ww[1]) / I[2]] as Vec3,
  });
  const addq = (a: Quat, b: Quat, s: number) => a.map((v, i) => v + s * b[i]!) as Quat;
  const addv = (a: Vec3, b: Vec3, s: number) => a.map((v, i) => v + s * b[i]!) as Vec3;
  for (let t = 0; t < T - 1e-9; t += h) {
    const k1 = f(q, w);
    const k2 = f(addq(q, k1.dq, h / 2), addv(w, k1.dw, h / 2));
    const k3 = f(addq(q, k2.dq, h / 2), addv(w, k2.dw, h / 2));
    const k4 = f(addq(q, k3.dq, h), addv(w, k3.dw, h));
    q = q.map((v, i) => v + (h / 6) * (k1.dq[i]! + 2 * k2.dq[i]! + 2 * k3.dq[i]! + k4.dq[i]!)) as Quat;
    w = w.map((v, i) => v + (h / 6) * (k1.dw[i]! + 2 * k2.dw[i]! + 2 * k3.dw[i]! + k4.dw[i]!)) as Vec3;
    const nq = Math.hypot(...q);
    q = q.map((v) => v / nq) as Quat;
  }
  return q;
}

const quatAngle = (a: Quat, b: Quat) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));

// every world is destroyed even when an assertion fails (WASM memory is not garbage collected)
const open: Rig[] = [];
async function rig(...args: Parameters<typeof makeRig>): Promise<Rig> {
  const r = await makeRig(...args);
  let alive = true;
  const done = r.done.bind(r);
  r.done = () => { if (alive) { alive = false; done(); } };
  open.push(r);
  return r;
}
afterEach(() => { for (const r of open.splice(0)) r.done(); });

interface Cantilever {
  r: Rig;
  bar: Part;
  events: PhysicsEvent[];
  n: number;
  tip: () => [number, number, number];
}

/**
 * A bar along +X clamped to the world at its left end, with a weight centred on its tip so the load acts at
 * the tip for any rotation. `ratio` sets the moment at bond 0 (one segment from the clamp) as a multiple of
 * that bond's capacity (Mp for ductile metals, S x strength for brittle ones), including the bar's own weight.
 */
async function cantilever(kind: string, material: string, params: Record<string, number | string>, ratio: number, capacity: 'Mp' | 'Me'): Promise<Cantilever & { M0: number; cap: number }> {
  const r = await rig({}, false);
  const L = Number(params['length']);
  const probe = makePart({ kind, pose: at(0, 0, 0), material, params });
  const bar = r.part(kind, at(L / 2, 1, 0), { material, params: probe.params });
  const n = r.world.segmentCount(bar.id);
  const segLen = L / n;
  const d = L - segLen;
  const cap = r.world.bondCapacityOf(bar.id)!;
  const C = capacity === 'Mp' ? cap.Mp[1] : cap.Me[1];
  const barMass = r.world.bodyMass(bar.id)!;
  const selfM = ((barMass * (n - 1)) / n) * g * (d / 2);
  const W = (ratio * C - selfM) / d;
  const weight = r.part('weight', at(L, 1, 0), { params: { mass: W / g } });
  r.connect('fixed', { part: bar, frame: at(-L / 2, 0, 0) }, null);
  r.connect('fixed', { part: bar, frame: at(L / 2, 0, 0) }, { part: weight, frame: at(0, 0, 0) });
  const events: PhysicsEvent[] = [];
  const origStep = r.world.step.bind(r.world);
  r.world.step = () => { const res = origStep(); events.push(...res.events); return res; };
  return { r, bar, events, n, tip: () => r.world.livePose(`${bar.id}#${n - 1}`)!.p, M0: ratio * C, cap: C };
}

describe('breakable stock: section forces', () => {
  it('bond moments and shears are exact statics along a segmented cantilever', async () => {
    const c = await cantilever('rod.square', 'steel.1018-cd', { length: 0.6, side: 0.02, fracture: '6' }, 0.3, 'Mp');
    c.r.run(1);
    const states = c.r.world.bondStates(c.bar.id);
    const L = 0.6, segLen = 0.1;
    const W = (c.M0 - (c.r.world.bodyMass(c.bar.id)! * 5 / 6) * g * 0.25) / 0.5;
    const perLen = (c.r.world.bodyMass(c.bar.id)! / L) * g;
    states.forEach((s, k) => {
      const d = L - segLen * (k + 1); // bond k to tip
      within(s.loads!.M2, W * d + (perLen * d * d) / 2, 0.01);
      within(s.loads!.V, W + perLen * d, 0.01);
      expect(Math.abs(s.loads!.N)).toBeLessThan(0.02 * W);
      expect(s.state).toBe('intact');
    });
    // and the bar stays straight: rigid stock does not sag under an iterative solver
    expect(1 - c.tip()[1]).toBeLessThan(0.002);
    c.r.done();
  });

  it('a hanging rod carries its load in pure tension', async () => {
    const r = await rig({}, false);
    const L = 0.8;
    // local +X turned to point up: segment 0 at the bottom, segment 3 at the top
    const rod = r.part('rod.square', at(0, 2, 0, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: L, side: 0.01, fracture: '4' } });
    r.connect('fixed', { part: rod, frame: at(L / 2, 0, 0) }, null);
    const w = r.part('weight', at(0, 2 - L / 2, 0), { params: { mass: 50 } });
    // both joint frames share one world orientation (as the Join tool makes them)
    r.connect('fixed', { part: rod, frame: at(-L / 2, 0, 0) }, { part: w, frame: at(0, 0, 0, [0, 0, Math.SQRT1_2, Math.SQRT1_2]) });
    r.run(1);
    const perSeg = (r.world.bodyMass(rod.id)! / 4) * g;
    r.world.bondStates(rod.id).forEach((s, k) => {
      within(s.loads!.N, 50 * g + perSeg * (k + 1), 0.005);
      expect(s.loads!.V).toBeLessThan(0.5);
      expect(Math.hypot(s.loads!.M1, s.loads!.M2)).toBeLessThan(0.2);
    });
    r.done();
  });
});

describe('breakable stock: loads through contacts', () => {
  it('a plank on two supports carries a resting weight: level, not sinking, section forces from statics', async () => {
    const r = await rig({}, true);
    const L = 1.2, span = 1.0;
    // PTFE supports: with real friction two rigid supports can hold any self-balanced squeeze on the plank
    // (statically indeterminate), which shifts the moments; near-frictionless supports make the load path unique
    // narrow (6 mm) knife-edge supports: where a reaction sits within a wide rigid support is indeterminate too
    for (const x of [-span / 2, span / 2]) r.part('block', at(x, 0.25, 0), { frozen: true, material: 'polymer.ptfe', params: { x: 0.006, y: 0.5, z: 0.2 } });
    const beam = r.part('lumber', at(0, 0.5 + 0.019 + 0.0005, 0), { material: 'wood.douglas-fir', params: { length: L, size: '2x4', fracture: '6' } });
    const P = 40;
    const w = r.part('weight', at(0, 0.5 + 0.038 + 0.0962 + 0.001, 0), { params: { mass: P } });
    r.run(2);
    // it holds the weight up and stays level on its supports
    expect(r.world.livePose(w.id)!.p[1]).toBeGreaterThan(0.63);
    for (const k of [0, 5]) expect(Math.abs(r.world.livePose(`${beam.id}#${k}`)!.p[1] - 0.519)).toBeLessThan(0.002);
    const q = (r.world.bodyMass(beam.id)! / L) * g;
    const R = (P * g + q * L) / 2;
    r.world.bondStates(beam.id).forEach((s, k) => {
      const a = Math.abs(-L / 2 + (L / 6) * (k + 1));
      if (a < 1e-9) return; // midspan: how the weight's round base shares itself between two segments is indeterminate
      within(s.loads!.V, R - q * (L / 2 - a), 0.03);
      within(Math.hypot(s.loads!.M1, s.loads!.M2), R * (span / 2 - a) - (q * (L / 2 - a) ** 2) / 2, 0.05);
    });
    r.done();
  });

  it('a servo turns a segmented bar exactly like a solid one', async () => {
    const angles = async (fracture: string) => {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      const base = r.part('block', at(0, 1, 0), { frozen: true, material: 'steel.a36', params: { x: 0.3, y: 0.05, z: 0.3 } });
      const bar = r.part('rod.square', at(0, 0.9, 0, [0, Math.SQRT1_2, 0, Math.SQRT1_2]), { material: 'steel.1018-cd', params: { length: 0.62, side: 0.05, fracture } });
      const c = r.connect('servo', { part: base, frame: at(0, -0.05, 0) }, { part: bar, frame: { p: [0, 0.05, 0], q: [0, -Math.SQRT1_2, 0, Math.SQRT1_2] } }, { maxTorque: 80, range: 0.5, channel: 'steer', pin: 0.02 });
      r.world.apply({ op: 'controls', channels: { steer: 1 } });
      const out: number[] = [];
      for (let i = 0; i < 45; i++) { r.world.step(); if (i % 5 === 4) out.push(r.world.connectionLoad(c.id)!.extent); }
      r.done();
      return out;
    };
    const solid = await angles('off');
    const seg = await angles('3');
    seg.forEach((a, i) => expect(Math.abs(a - solid[i]!)).toBeLessThan(0.01));
  });
});

describe('breakable stock: ductile metal', () => {
  it('holds below the plastic moment', async () => {
    const c = await cantilever('rod.square', 'steel.1018-cd', { length: 0.6, side: 0.012, fracture: '6' }, 0.8, 'Mp');
    c.r.run(2);
    expect(c.events.filter((e) => e.type === 'yield' || e.type === 'fracture')).toEqual([]);
    expect(1 - c.tip()[1]).toBeLessThan(0.003);
    c.r.done();
  });

  it('yields into a plastic hinge and comes to rest where gravity work equals plastic work (M0 sin t = Mp t)', async () => {
    const ratio = 1.1;
    const c = await cantilever('rod.square', 'steel.1018-cd', { length: 0.6, side: 0.012, fracture: '6' }, ratio, 'Mp');
    c.r.run(3);
    expect(c.events.some((e) => e.type === 'yield')).toBe(true);
    expect(c.events.some((e) => e.type === 'fracture')).toBe(false);
    expect(c.r.world.bondStates(c.bar.id)[0]!.state).toBe('plastic');
    // solve ratio sin t = t
    let t = 1;
    for (let i = 0; i < 50; i++) t = t - (ratio * Math.sin(t) - t) / (ratio * Math.cos(t) - 1);
    // the hinge sits at bond 0, one 0.1 m segment from the clamp; the outboard is straight and rigid
    const hinge = c.r.world.livePose(`${c.bar.id}#0`)!.p[0] + 0.05;
    const tip = c.tip();
    const angle = Math.atan2(1 - tip[1], tip[0] - hinge);
    within(angle, t, 0.03);
    c.r.done();
  });

  it('tears once the hinge rotation passes the material ductility', async () => {
    // 6061-T6: 12% elongation -> 0.72 rad capacity; at 1.15 Mp the hinge would need ~0.93 rad to arrest
    const c = await cantilever('rod.square', 'aluminum.6061-t6', { length: 0.6, side: 0.012, fracture: '6' }, 1.15, 'Mp');
    const y0 = c.tip()[1];
    c.r.run(2);
    const f = c.events.find((e) => e.type === 'fracture');
    expect(f && f.type === 'fracture' && f.bond).toBe(0);
    expect(f && f.type === 'fracture' && f.mode).toBe('bending');
    expect(y0 - c.tip()[1]).toBeGreaterThan(1); // the torn-off piece falls away
    c.r.done();
  });
});

describe('breakable stock: brittle and wood', () => {
  it('wood holds below its modulus of rupture and snaps above it', async () => {
    const hold = await cantilever('lumber', 'wood.douglas-fir', { length: 1.2, size: '2x4', fracture: '6' }, 0.85, 'Me');
    hold.r.run(1.5);
    expect(hold.events.filter((e) => e.type === 'fracture')).toEqual([]);
    hold.r.done();
    const snap = await cantilever('lumber', 'wood.douglas-fir', { length: 1.2, size: '2x4', fracture: '6' }, 1.2, 'Me');
    snap.r.run(1.5);
    const f = snap.events.find((e) => e.type === 'fracture');
    expect(f && f.type === 'fracture' && f.bond).toBe(0);
    expect(snap.events.some((e) => e.type === 'yield')).toBe(false); // wood does not yield plastically
    // weak-axis section modulus: 89 x 38^2 / 6 at MOR 85 MPa
    within(snap.cap, (0.089 * 0.038 ** 2 / 6) * 85e6, 1e-6);
    snap.r.done();
  });

  it('glass holds at 0.8x and snaps at 1.2x its tensile strength (M = S x 40 MPa)', async () => {
    for (const [ratio, breaks] of [[0.8, false], [1.2, true]] as const) {
      const c = await cantilever('rod.square', 'glass.soda-lime', { length: 0.4, side: 0.01, fracture: '4' }, ratio, 'Me');
      within(c.cap, (0.01 ** 3 / 6) * 40e6, 1e-6);
      c.r.run(1);
      expect(c.events.some((e) => e.type === 'fracture')).toBe(breaks);
      c.r.done();
    }
  });
});

describe('breakable stock: bookkeeping', () => {
  it('segments add up to the whole part and a frozen part never breaks', async () => {
    const r = await rig({}, false);
    const m = getMaterial('wood.douglas-fir');
    const beam = r.part('lumber', at(0, 1, 0), { material: m.id, frozen: true, params: { length: 2.4, size: '2x4' } });
    within(r.world.bodyMass(beam.id)!, 2.4 * 0.038 * 0.089 * m.density, 1e-9);
    expect(r.world.segmentCount(beam.id)).toBeGreaterThan(1);
    const w = r.part('weight', at(0, 1.2, 0), { params: { mass: 2000 } });
    const events: PhysicsEvent[] = [];
    for (let i = 0; i < 90; i++) events.push(...r.world.step().events);
    expect(events.filter((e) => e.type === 'fracture' || e.type === 'yield')).toEqual([]);
    expect(r.world.bondStates(beam.id).every((b) => b.state === 'intact')).toBe(true);
    void w;
    r.done();
  });

  it('a tumbling segmented rod stays straight and follows the torque-free Euler equations', async () => {
    const side = 0.02, L = 1;
    const m = 2700 * side * side * L;
    const I: Vec3 = [(m * 2 * side * side) / 12, (m * (L * L + side * side)) / 12, (m * (L * L + side * side)) / 12];
    const w0: Vec3 = [0.3, 4, 1];
    const T = 2;
    const exact = eulerReference(I, w0, T);
    const tumble = async (fracture: string) => {
      const r = await rig({ gravity: [0, 0, 0] }, false);
      const rod = r.part('rod.square', at(0, 1, 0), { material: 'aluminum.6061-t6', params: { length: L, side, fracture } });
      r.world.apply({ op: 'setPose', id: rod.id, pose: at(0, 1, 0), linear: [0, 0, 0], angular: w0 });
      r.run(T);
      const n = r.world.segmentCount(rod.id);
      let straight = 0;
      if (n > 1) {
        const p0 = r.world.livePose(`${rod.id}#0`)!, pn = r.world.livePose(`${rod.id}#${n - 1}`)!;
        straight = Math.abs(Math.hypot(pn.p[0] - p0.p[0], pn.p[1] - p0.p[1], pn.p[2] - p0.p[2]) - (L - L / n));
      }
      const q = r.world.livePose(rod.id)!.q;
      r.done();
      return { n, straight, err: quatAngle(q, exact) };
    };
    const seg = await tumble('4');
    expect(seg.n).toBe(4);
    expect(seg.straight).toBeLessThan(1e-4);
    expect(seg.err).toBeLessThan(0.08); // 2 s of tumbling at 4 rad/s
    const solid = await tumble('off');
    expect(solid.err).toBeLessThan(0.25); // Jolt's own gyroscopic integration, for comparison
  });

  it('a part glued to a spinning pinned arm carries exactly its centripetal force, whichever side of the joint it is', async () => {
    // A 1 m 2x4 on a bearing at one end (to a frozen post), no gravity, spinning, with two 30 mm steel cubes glued
    // on top near the far end: one as the glue joint's first part, one as its second. Tick by tick each glue line
    // must carry m w^2 r as shear, at the arm's actual spin rate, and exactly the moment of that force about the
    // glue line. Which side is "A" is bookkeeping: it must never change a load.
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const w0 = 4;
    const Zaxis: Quat = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // frame y along world z (the bearing axis)
    const arm = r.part('lumber', at(0.4, 1, 0), { params: { size: '2x4', length: 1, fracture: '6' } });
    // the post reaches the arm's back face: the bearing is where they touch (a joint across a gap holds nothing)
    const post = r.part('block', at(0, 1, -0.0445 - 0.05), { frozen: true, params: { x: 0.1, y: 0.1, z: 0.1 } });
    r.connect('bearing', { part: arm, frame: at(-0.4, 0, -0.0445, Zaxis) }, { part: post, frame: at(0, 0, 0.05, Zaxis) }, { bore: 0.025, staticRating: 10000 });
    const spin = (x: Vec3): Vec3 => [-w0 * (x[1] - 1), w0 * x[0], 0];
    r.world.apply({ op: 'setPose', id: arm.id, pose: at(0.4, 1, 0), linear: spin([0.4, 1, 0]), angular: [0, 0, w0] });
    const glue = { adhesive: 'epoxy-structural', bondW: 0.03, bondL: 0.03 };
    const cubes = ([[0.8, 0.02, 'cube is B'], [0.7, -0.02, 'cube is A']] as const).map(([x, z, side]) => {
      const p: Vec3 = [x, 1 + 0.019 + 0.015, z];
      const cube = r.part('block', at(...p), { material: 'steel.a36', params: { x: 0.03, y: 0.03, z: 0.03 } });
      const onArm = { part: arm, frame: at(x - 0.4, 0.019, z) }, onCube = { part: cube, frame: at(0, -0.015, 0) };
      const c = side === 'cube is B' ? r.connect('glued', onArm, onCube, glue) : r.connect('glued', onCube, onArm, glue);
      r.world.apply({ op: 'setPose', id: cube.id, pose: at(...p), linear: spin(p), angular: [0, 0, w0] });
      return { side, conn: c.id, m: r.world.bodyMass(cube.id)!, rc: Math.hypot(x, p[1] - 1), shear: 0, bending: 0 };
    });
    let n = 0;
    for (let i = 0; i < 180; i++) {
      const res = r.world.step();
      if (i < 20) continue; // let the first ticks settle the joint preload
      const w = r.world.angularVelocity(`${arm.id}#0`)![2];
      for (const c of cubes) {
        const l = res.loads.find((x) => x.id === c.conn)!;
        const F = c.m * w * w * c.rc;
        c.shear = Math.max(c.shear, Math.abs(l.shear / F - 1));
        c.bending = Math.max(c.bending, Math.abs(l.bending / (F * 0.015) - 1));
      }
      n++;
    }
    expect(n).toBeGreaterThan(100);
    for (const c of cubes) {
      expect(c.shear, c.side).toBeLessThan(0.02);
      // the glue line also carries the moment of that force about it: F x half the cube, exactly
      expect(c.bending, c.side).toBeLessThan(0.05);
    }
  });

  it('repair re-seats the pieces straight and bonds them intact', async () => {
    const c = await cantilever('lumber', 'wood.douglas-fir', { length: 1.2, size: '2x4', fracture: '6' }, 1.3, 'Me');
    c.r.run(0.5);
    expect(c.r.world.bondStates(c.bar.id)[0]!.state).toBe('broken');
    c.r.world.apply({ op: 'damage', id: c.bar.id, damage: { broken: [], segments: null } });
    expect(c.r.world.bondStates(c.bar.id).every((b) => b.state === 'intact')).toBe(true);
    const p0 = c.r.world.livePose(`${c.bar.id}#0`)!, p5 = c.r.world.livePose(`${c.bar.id}#5`)!;
    within(Math.hypot(p5.p[0] - p0.p[0], p5.p[1] - p0.p[1], p5.p[2] - p0.p[2]), 1.0, 1e-4);
    c.r.done();
  });
});
