// Doorways kept clear (src/nexus/placement/clear.ts), and a body drawn from its measured segments with its math on it
// (src/nexus/act/body.ts, src/nexus/life/segments.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../../src/nexus/seeds';
import type { Part } from '../../src/nexus/kits';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import { partOf, type Assembly } from '../../src/nexus/assembly';
import { layout } from '../../src/nexus/make/space';
import { keepClear, MEANT_IN_DOORWAY } from '../../src/nexus/placement/clear';
import { ACTORS } from '../../src/nexus/aware/tags';
import { bodyParts, poseOf, rigFor } from '../../src/nexus/act/body';

const room = async (set: Record<string, string>): Promise<Part> => { const b = emptyBoard('r'); placeBlock(b, 'seed.room', 0, 0, set, 'r'); const e = new Engine(b); await e.run(); const o = e.state.get('r')!.out!; return partOf(o[Object.keys(o)[0]!] as Assembly); };

describe('doorways kept clear', () => {
  it('a living room with its door behind the television: the stand and the television on it move together, out of the door\'s way, and stay in the room', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'door' }), before = keepClear(r, { move: false });
    expect(before.blocked.map((b) => b.thing)).toContain('tv stand');
    const after = keepClear(r);
    expect(after.moved).toBe(2);
    expect(keepClear(after.tree, { move: false }).blocked).toHaveLength(0);
    // (the television is still on its stand)
    const ns = layout(after.tree), tv = ns.find((n) => n.p.name === 'television')!.sub!, st = ns.find((n) => n.p.name === 'tv stand')!.sub!;
    expect(tv.min.y).toBeCloseTo(st.max.y, 1); expect(tv.getCenter(new THREE.Vector3()).setY(0).distanceTo(st.getCenter(new THREE.Vector3()).setY(0))).toBeLessThan(0.25);
  }, 60000);
  it('a kitchen whose run fills the wall its door is in is turned to the wall across, sink, stove and fridge with it', async () => {
    const r = keepClear(await room({ type: 'kitchen', front: 'wall', back: 'door' }));
    expect(r.blocked[0]!.did).toMatch(/turned to the wall across.*sink.*stove.*fridge/);
    expect(keepClear(r.tree, { move: false }).blocked).toHaveLength(0);
  }, 60000);
  it('what is there on purpose is left, and said', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'door' }), ns = layout(r), stand = ns.find((n) => n.p.name === 'tv stand')!;
    const mark = (p: Part, path = ''): Part => (path === stand.path ? { ...p, meant: [MEANT_IN_DOORWAY] } : p.parts ? { ...p, parts: p.parts.map((k, i) => mark(k, `${path}/${i}`)) } : p);
    const out = keepClear(mark(r));
    expect(out.blocked.find((b) => b.thing === 'tv stand')!.did).toMatch(/meant/);
  }, 60000);
  it('every house plan comes out of its seed with every door clear; to the ADA\'s wheelchair room, more is said', async () => {
    let ada = 0; for (const plan of ['studio', '1 bed', '2 bed', '3 bed']) { const b = emptyBoard('h'); placeBlock(b, 'seed.house', 0, 0, { plan }, 'h'); const e = new Engine(b); await e.run(); const h = partOf(e.state.get('h')!.out!.house as Assembly);
      expect(keepClear(h, { move: false }).blocked).toHaveLength(0); ada += keepClear(h, { move: false, standard: 'ada' }).blocked.length; }
    expect(ada).toBeGreaterThan(0);
  }, 120000);
});

describe('a body from its measured segments, its math on each part', () => {
  it('its segments are de Leva\'s shares of its mass; each long limb tapered so its centre of mass is where he measured it', () => {
    const b = rigFor(ACTORS.adult!), sum = b.math.reduce((s, m) => s + m.mass, 0);
    expect(sum).toBeCloseTo(75, 6);
    const thigh = b.math.find((m) => m.id === 'thighL')!;
    expect(thigh.share).toBe(0.1416); expect(thigh.com).toBe(0.4095); expect(thigh.taper!.R).toBeGreaterThan(thigh.taper!.r);
    // (a frustum's own centre, worked again from its radii: L (R² + 2Rr + 3r²) / 4 (R² + Rr + r²))
    const { R, r } = thigh.taper!; expect((R * R + 2 * R * r + 3 * r * r) / (4 * (R * R + R * r + r * r))).toBeCloseTo(0.4095, 6);
    // (its volume holds its mass at the body's density)
    expect((Math.PI * thigh.length * (R * R + R * r + r * r)) / 3 * b.rig.density).toBeCloseTo(thigh.mass, 6);
    // (its inertia across, for its shape, within 30 % of de Leva's measured)
    for (const id of ['upperArmL', 'forearmL', 'thighL', 'shankL']) { const m = b.math.find((x) => x.id === id)!; expect(Math.abs(m.Iacross / m.IacrossMeasured! - 1)).toBeLessThan(0.3); }
  });
  it('a capsule\'s inertia along its axis, summed from its parts, is m r² / 2 less what its round ends give back: between 2/5 and 1/2 of m r²', () => {
    const b = rigFor(ACTORS.adult!), h = b.math.find((m) => m.id === 'handL')!, r = (b.rig.segments.find((s) => s.id === 'handL')!.shape as { r: number }).r;
    expect(h.Ilong).toBeGreaterThan(0.4 * h.mass * r * r); expect(h.Ilong).toBeLessThan(0.5 * h.mass * r * r);
  });
  it('drawn, each part carries its numbers; reaching, its hand meets the point', () => {
    const b = rigFor(ACTORS.adult!), hand: [number, number, number] = [-0.3, 1.2, 0.5], { pose } = poseOf(b, { at: [0, 0, 0], facing: [0, 0, 1], floor: 0, hand }), p = bodyParts(b, pose);
    expect(p.parts).toHaveLength(16); expect(p.parts!.every((x) => typeof x.made?.mass === 'number' && x.says)).toBe(true);
    const tip = Object.entries(pose).filter(([k]) => /^forearm/.test(k)).map(([, v]) => v.b), wr = tip.map((t) => Math.hypot(t[0] - hand[0], t[1] - hand[1], t[2] - hand[2]));
    expect(Math.min(...wr)).toBeLessThan(0.08);
  });
  it('a child of 8 below the layout\'s range is said to be scaled, its segments its own 26 kg', () => {
    const c = rigFor(ACTORS.child!); expect(c.math.reduce((s, m) => s + m.mass, 0)).toBeCloseTo(26, 6); expect(c.says.join(' ')).toMatch(/estimate/);
  });
});
