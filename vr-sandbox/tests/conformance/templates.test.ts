// Templates are ordinary builds: they must round-trip byte for byte, be stable at rest, and do what their
// "try this" cards promise purely through physics.

import { describe, expect, it } from 'vitest';
import { TEMPLATES, getTemplate } from '../../src/templates/templates';
import { decodeDoc, encodeDoc } from '../../src/persistence/codec';
import { jolt } from './helpers';
import { PhysicsWorld } from '../../src/physics/world';
import { workshopEnvironment } from '../../src/physics/environment';
import { MATERIALS } from '../../src/data/materials';
import type { BuildDoc } from '../../src/doc/types';
import { rotate } from '../../src/doc/math';
import { numberOf } from '../../src/schema/params';
import { getPartKind, massOf } from '../../src/parts/registry';
import { motorModel } from '../../src/engineering/dcmotor';
import { getGearhead, getMotor } from '../../src/data/motors';
import { within } from './helpers';

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

async function load(doc: BuildDoc) {
  const J = await jolt();
  const w = new PhysicsWorld(J, doc.sim);
  w.apply({ op: 'environment', boxes: workshopEnvironment(), materials });
  // the whole build enters as one construction (judged whole, its joints' bores known); a refusal is thrown here
  const refused = w.apply({ op: 'construct', parts: Object.values(doc.parts).map((p) => ({ part: p, material: doc.materials[p.material]! })), conns: Object.values(doc.connections).map((c) => ({ conn: c, materials: doc.materials })) });
  if (refused) throw new Error(`${refused.name}: ${refused.reason} [${refused.law}]`);
  return w;
}

const run = (w: PhysicsWorld, seconds: number) => {
  const breaks: string[] = [];
  for (let i = 0; i < Math.round(seconds * 90); i++) {
    for (const e of w.step().events) if (e.type === 'break' || e.type === 'fracture' || e.type === 'yield') breaks.push(e.note);
  }
  return breaks;
};

const byName = (doc: BuildDoc, name: string) => Object.values(doc.parts).filter((p) => p.name === name);

/** Step once, collecting every failure (break, fracture, yield, slip) with its note. */
const stepping = (w: PhysicsWorld, failures: string[]) => () => {
  for (const e of w.step().events) if (e.type === 'break' || e.type === 'fracture' || e.type === 'yield' || e.type === 'slip') failures.push(e.note);
};

describe('templates', () => {
  for (const t of TEMPLATES) {
    it(`${t.id}: round-trips byte for byte and is deterministic`, () => {
      const bytes = encodeDoc(t.build());
      expect(Buffer.from(encodeDoc(decodeDoc(bytes))).equals(Buffer.from(bytes))).toBe(true);
      expect(Buffer.from(encodeDoc(t.build())).equals(Buffer.from(bytes))).toBe(true);
    });
    it(`${t.id}: settles without spurious failures or explosions`, async () => {
      const doc = t.build();
      const w = await load(doc);
      const breaks = run(w, 3);
      expect(breaks).toEqual([]);
      for (const p of Object.values(doc.parts)) {
        const pose = w.livePose(p.id)!;
        for (const v of pose.p) expect(Number.isFinite(v)).toBe(true);
        expect(pose.p[1]).toBeGreaterThan(-0.05);
        expect(Math.hypot(pose.p[0], pose.p[2])).toBeLessThan(40);
      }
      w.destroy();
    });
  }

  it('catapult: erasing the latch wire throws the projectile', async () => {
    const doc = getTemplate('catapult').build();
    const w = await load(doc);
    run(w, 0.5);
    const latch = Object.values(doc.connections).find((c) => c.kind === 'rope')!;
    w.apply({ op: 'removeConnection', id: latch.id });
    const ball = byName(doc, 'Projectile')[0]!;
    // no stop bar: the rigid cup carries the ball over the top, so measure the throw in either direction
    const start = w.livePose(ball.id)!.p;
    let reach = 0, speed = 0;
    const failures: string[] = [];
    const step = stepping(w, failures);
    for (let i = 0; i < 270; i++) {
      step();
      const p = w.livePose(ball.id)!.p;
      reach = Math.max(reach, Math.hypot(p[0] - start[0], p[2] - start[2]));
      speed = Math.max(speed, Math.hypot(...w.linearVelocity(ball.id)!));
    }
    expect(speed).toBeGreaterThan(7);
    expect(reach).toBeGreaterThan(2);
    // the card promises a throw, not a wreck: nothing fails while the arm swings and settles
    for (let i = 0; i < 270; i++) step();
    expect(failures).toEqual([]);
    w.destroy();
  });

  // Fire a catapult build: failures during the throw and three seconds after, and where the ball first lands.
  const fireCatapult = async (edit: (d: BuildDoc) => void = () => {}) => {
    const doc = getTemplate('catapult').build();
    edit(doc);
    const w = await load(doc);
    const failures = run(w, 0.5);
    w.apply({ op: 'removeConnection', id: Object.values(doc.connections).find((c) => c.kind === 'rope')!.id });
    const ball = byName(doc, 'Projectile')[0]!;
    const arm = byName(doc, 'Throwing arm')[0]!;
    const s = w.livePose(ball.id)!.p;
    const step = stepping(w, failures);
    let landed = NaN, spin = 0;
    for (let i = 0; i < 360; i++) {
      step();
      const p = w.livePose(ball.id)!.p;
      if (i < 120) spin = Math.max(spin, Math.abs(w.angularVelocity(`${arm.id}#0`)![2]));
      if (Number.isNaN(landed) && i > 20 && p[1] < 0.06) landed = Math.hypot(p[0] - s[0], p[2] - s[2]);
    }
    w.destroy();
    return { failures, landed, spin };
  };
  const counterweightBolts = (d: BuildDoc) => {
    const cw = byName(d, 'Counterweight')[0]!;
    return Object.values(d.connections).find((c) => c.kind === 'bolted' && c.b?.part === cw.id)!;
  };

  // A different counterweight, bolted where the last one was: its bottom on the arm (a lighter one is smaller, so it
  // sits lower), and its bolts at its new bottom face.
  const counterweight = (d: BuildDoc, kg: number) => {
    const cw = byName(d, 'Counterweight')[0]!;
    const D = (m: number) => Math.cbrt((4 * m) / (Math.PI * 7200));
    const was = D(numberOf(cw.params, 'mass', 80)), now = D(kg);
    const up = rotate(cw.pose.q, [0, 1, 0]);
    cw.params['mass'] = kg;
    cw.pose = { ...cw.pose, p: [cw.pose.p[0] + (up[0] * (now - was)) / 2, cw.pose.p[1] + (up[1] * (now - was)) / 2, cw.pose.p[2] + (up[2] * (now - was)) / 2] };
    const bolts = counterweightBolts(d);
    bolts.b = { ...bolts.b!, frame: { ...bolts.b!.frame, p: [0, -now / 2, 0] } };
  };

  // More counterweight is more energy: the arm always swings faster. The range is another matter: with no stop bar
  // the ball leaves the cup where the swing lets it go, and a faster swing lets it go earlier, lower and flatter, so
  // the range rises with the counterweight, peaks (about 100 kg here) and falls again, as a real one's does.
  it('catapult card: more counterweight swings the arm faster, the range changes with it, and 40 to 150 kg all fit the frame', async () => {
    const throws = [];
    for (const kg of [40, 80, 150]) throws.push(await fireCatapult((d) => counterweight(d, kg)));
    for (const t of throws) expect(t.failures).toEqual([]);
    expect(throws[0]!.spin).toBeLessThan(throws[1]!.spin);
    expect(throws[1]!.spin).toBeLessThan(throws[2]!.spin);
    expect(throws[0]!.landed).toBeLessThan(throws[1]!.landed);
  });

  it('catapult card: hand-tight counterweight bolts slip, and the throw falls short', async () => {
    const tight = await fireCatapult();
    const loose = await fireCatapult((d) => { counterweightBolts(d).params['tightening'] = 'hand'; });
    expect(loose.failures.length).toBeGreaterThan(0);
    expect(loose.failures.every((f) => f.startsWith('Slipped: shear'))).toBe(true);
    // the slip takes energy out of the swing: the arm turns slower and the throw falls short
    expect(loose.spin).toBeLessThan(tight.spin);
    expect(loose.landed).toBeLessThan(tight.landed);
  });

  it('spring launcher: erasing the latch launches the ball upward', async () => {
    const doc = getTemplate('spring-launcher').build();
    const w = await load(doc);
    run(w, 0.3);
    const latch = Object.values(doc.connections).find((c) => c.kind === 'rope')!;
    w.apply({ op: 'removeConnection', id: latch.id });
    const ball = byName(doc, 'Ball')[0]!;
    let maxY = 0;
    const failures: string[] = [];
    const step = stepping(w, failures);
    for (let i = 0; i < 270; i++) { step(); maxY = Math.max(maxY, w.livePose(ball.id)!.p[1]); }
    expect(maxY).toBeGreaterThan(0.6);
    expect(failures).toEqual([]);
    w.destroy();
  });

  it("newton's cradle: releasing the first ball sets the last one swinging", async () => {
    const doc = getTemplate('newtons-cradle').build();
    const w = await load(doc);
    const first = byName(doc, 'Ball 1')[0]!;
    const last = byName(doc, 'Ball 5')[0]!;
    const x0 = w.livePose(last.id)!.p[0];
    w.apply({ op: 'upsertPart', part: { ...first, frozen: false }, material: doc.materials[first.material]!, keepLivePose: true });
    let maxX = x0;
    const failures: string[] = [];
    const step = stepping(w, failures);
    for (let i = 0; i < 270; i++) { step(); maxX = Math.max(maxX, w.livePose(last.id)!.p[0]); }
    expect(maxX - x0).toBeGreaterThan(0.05);
    expect(failures).toEqual([]);
    w.destroy();
  });

  it('raft floats and the steel block sinks', async () => {
    const doc = getTemplate('raft').build();
    const w = await load(doc);
    expect(run(w, 8)).toEqual([]);
    for (const p of byName(doc, 'Plank')) expect(Math.abs(w.livePose(p.id)!.p[1] - 0.9)).toBeLessThan(0.05);
    expect(w.livePose(byName(doc, 'Steel block')[0]!.id)!.p[1]).toBeLessThan(0.2);
    expect(w.livePose(byName(doc, 'Balsa')[0]!.id)!.p[1]).toBeGreaterThan(0.88);
    expect(w.livePose(byName(doc, 'PTFE')[0]!.id)!.p[1]).toBeLessThan(0.2);
    w.destroy();
  });

  it('go-kart: it accelerates as its motors, gearheads and battery say, and steering turns it', async () => {
    const doc = getTemplate('go-kart').build();
    const w = await load(doc);
    run(w, 0.5);
    const chassis = byName(doc, 'Chassis')[0]!;
    const start = w.livePose(chassis.id)!.p;
    // Newton's second law from the datasheets: each motor at its controller's limit gives K_t I less its friction,
    // through 12:1 at 81%, at the 125 mm wheel; it moves the kart's mass plus what spins with it (each wheel I / r^2,
    // each rotor J N^2 / r^2)
    const m = motorModel(getMotor('motor.dc.coreless.d40-150w-24v'));
    const g = getGearhead('gearhead.planetary.d42-12to1')!;
    const r = 0.125, limit = 20;
    let M = 0, spin = 0;
    for (const p of Object.values(doc.parts)) {
      const k = getPartKind(p.kind), mass = massOf(k, p.params, doc.materials[p.material]!);
      M += mass;
      if (p.kind === 'wheel') spin += (0.5 * mass * r * r) / (r * r);
    }
    spin += (2 * m.rotorInertia * g.ratio ** 2) / (r * r);
    const force = (2 * (m.Kt * limit - m.Tf) * g.ratio * g.efficiency) / r;
    const a = force / (M + spin);
    w.apply({ op: 'controls', channels: { throttle: 1, steer: 0 } });
    const e0 = w.energies();
    const failures = run(w, 1.5);
    const v = w.linearVelocity(chassis.id)![0];
    within(v, a * 1.5, 0.03);
    // every joule the batteries gave is in the kart's motion or is heat: in the windings, wires and cells, and in
    // the motors' and gearheads' friction (the 19% the gearhead loses), with next to nothing left unexplained
    const e = w.energies();
    const gave = e.work.batteries - e0.work.batteries;
    const motion = e.kinetic + e.potential - (e0.kinetic + e0.potential);
    const heat = Object.values(e.heat).reduce((s, x) => s + x, 0) - Object.values(e0.heat).reduce((s, x) => s + x, 0);
    within(motion + heat, gave, 0.01);
    expect(e.heat.friction - e0.heat.friction).toBeLessThan(0.1 * gave);
    const mid = w.livePose(chassis.id)!.p;
    expect(mid[0] - start[0]).toBeGreaterThan(0.5 * a * 1.5 ** 2 * 0.95);
    w.apply({ op: 'controls', channels: { throttle: 0.6, steer: 1 } });
    failures.push(...run(w, 2));
    expect(failures).toEqual([]);
    const end = w.livePose(chassis.id)!.p;
    expect(Math.abs(end[2] - mid[2])).toBeGreaterThan(0.3);
    w.destroy();
  });

  it('magnet bench: the eddy-braked disc swings far less than the free one', async () => {
    const doc = getTemplate('magnets').build();
    const w = await load(doc);
    const free = byName(doc, 'Free disc')[0]!;
    const braked = byName(doc, 'Eddy-braked disc')[0]!;
    let freePeak = 0, brakedPeak = 0;
    const failures: string[] = [];
    const step = stepping(w, failures);
    for (let i = 0; i < 180; i++) {
      step();
      freePeak = Math.max(freePeak, Math.abs(w.angularVelocity(free.id)![2]));
      brakedPeak = Math.max(brakedPeak, Math.abs(w.angularVelocity(braked.id)![2]));
    }
    expect(freePeak).toBeGreaterThan(3 * brakedPeak);
    expect(failures).toEqual([]);
    w.destroy();
  });
});
