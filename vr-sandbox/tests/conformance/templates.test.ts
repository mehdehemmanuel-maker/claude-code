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

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

async function load(doc: BuildDoc) {
  const J = await jolt();
  const w = new PhysicsWorld(J, doc.sim);
  w.apply({ op: 'environment', boxes: workshopEnvironment(), materials });
  for (const p of Object.values(doc.parts)) w.apply({ op: 'upsertPart', part: p, material: doc.materials[p.material]!, keepLivePose: false });
  for (const c of Object.values(doc.connections)) w.apply({ op: 'upsertConnection', conn: c, materials: doc.materials });
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
    for (let i = 0; i < 270; i++) {
      w.step();
      const p = w.livePose(ball.id)!.p;
      reach = Math.max(reach, Math.hypot(p[0] - start[0], p[2] - start[2]));
      speed = Math.max(speed, Math.hypot(...w.linearVelocity(ball.id)!));
    }
    expect(speed).toBeGreaterThan(7);
    expect(reach).toBeGreaterThan(2);
    w.destroy();
  });

  it('spring launcher: erasing the latch launches the ball upward', async () => {
    const doc = getTemplate('spring-launcher').build();
    const w = await load(doc);
    run(w, 0.3);
    const latch = Object.values(doc.connections).find((c) => c.kind === 'rope')!;
    w.apply({ op: 'removeConnection', id: latch.id });
    const ball = byName(doc, 'Ball')[0]!;
    let maxY = 0;
    for (let i = 0; i < 180; i++) { w.step(); maxY = Math.max(maxY, w.livePose(ball.id)!.p[1]); }
    expect(maxY).toBeGreaterThan(0.6);
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
    for (let i = 0; i < 90; i++) { w.step(); maxX = Math.max(maxX, w.livePose(last.id)!.p[0]); }
    expect(maxX - x0).toBeGreaterThan(0.05);
    w.destroy();
  });

  it('raft floats and the steel block sinks', async () => {
    const doc = getTemplate('raft').build();
    const w = await load(doc);
    run(w, 8);
    for (const p of byName(doc, 'Plank')) expect(Math.abs(w.livePose(p.id)!.p[1] - 0.9)).toBeLessThan(0.05);
    expect(w.livePose(byName(doc, 'Steel block')[0]!.id)!.p[1]).toBeLessThan(0.2);
    expect(w.livePose(byName(doc, 'Balsa')[0]!.id)!.p[1]).toBeGreaterThan(0.88);
    expect(w.livePose(byName(doc, 'PTFE')[0]!.id)!.p[1]).toBeLessThan(0.2);
    w.destroy();
  });

  it('go-kart: throttle drives it forward and steering turns it', async () => {
    const doc = getTemplate('go-kart').build();
    const w = await load(doc);
    run(w, 0.5);
    const chassis = byName(doc, 'Chassis')[0]!;
    const start = w.livePose(chassis.id)!.p;
    // Short straight run: the kart starts pointed at the pool, whose wall is ~6 m away.
    w.apply({ op: 'controls', channels: { throttle: 1, steer: 0 } });
    run(w, 1.2);
    const mid = w.livePose(chassis.id)!.p;
    expect(mid[0] - start[0]).toBeGreaterThan(1.5);
    w.apply({ op: 'controls', channels: { throttle: 0.6, steer: 1 } });
    run(w, 1.5);
    const end = w.livePose(chassis.id)!.p;
    expect(Math.abs(end[2] - mid[2])).toBeGreaterThan(0.5);
    w.destroy();
  });

  it('magnet bench: the eddy-braked disc swings far less than the free one', async () => {
    const doc = getTemplate('magnets').build();
    const w = await load(doc);
    const free = byName(doc, 'Free disc')[0]!;
    const braked = byName(doc, 'Eddy-braked disc')[0]!;
    let freePeak = 0, brakedPeak = 0;
    for (let i = 0; i < 180; i++) {
      w.step();
      freePeak = Math.max(freePeak, Math.abs(w.angularVelocity(free.id)![2]));
      brakedPeak = Math.max(brakedPeak, Math.abs(w.angularVelocity(braked.id)![2]));
    }
    expect(freePeak).toBeGreaterThan(3 * brakedPeak);
    w.destroy();
  });
});
