// Proximity: each thing carries the room it needs, kept clear by one node that knows no kind of thing (src/nexus/placement/proximity.ts), and a body drawn from its measured segments with its math on it
// (src/nexus/act/body.ts, src/nexus/life/segments.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import '../../src/nexus/seeds';
import type { Part } from '../../src/nexus/kits';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import { partOf, type Assembly } from '../../src/nexus/assembly';
import { layout } from '../../src/nexus/make/space';
import { inZone, proximity, zoneFor, MEANT_ANYWHERE } from '../../src/nexus/placement/proximity';
import { inForce, matesOf, measure, outBy } from '../../src/nexus/placement/relate';
import { ACTORS } from '../../src/nexus/aware/tags';
import { bodyParts, poseOf, rigFor } from '../../src/nexus/act/body';

const room = async (set: Record<string, string>): Promise<Part> => { const b = emptyBoard('r'); placeBlock(b, 'seed.room', 0, 0, set, 'r'); const e = new Engine(b); await e.run(); const o = e.state.get('r')!.out!; return partOf(o[Object.keys(o)[0]!] as Assembly); };

describe('proximity: the room each thing needs, on the thing', () => {
  it('a zone is worked out from the thing\'s own size: in front of a face, or swept from a hinge, its radius the leaf\'s width', () => {
    const box = new THREE.Box3(new THREE.Vector3(-0.45, -1.05, -0.06), new THREE.Vector3(0.45, 1.05, 0.06)), sw = zoneFor(box, { kind: 'swing', face: '+z', hinge: 'left', r: 0.86, name: 'swing', why: '' });
    expect(sw.at).toEqual([-0.45, 0, 0.06]); expect(sw.r).toBe(0.86);
    const id = new THREE.Matrix4(), at = (x: number, z: number) => new THREE.Box3(new THREE.Vector3(x - 0.05, -1, z - 0.05), new THREE.Vector3(x + 0.05, 0, z + 0.05));
    // (inside the quarter disc, outside its radius, behind the door, past the hinge)
    expect(inZone(sw, id, at(0, 0.4))).toBe(true); expect(inZone(sw, id, at(0.4, 0.8))).toBe(false); expect(inZone(sw, id, at(0, -0.3))).toBe(false); expect(inZone(sw, id, at(-0.7, 0.3))).toBe(false);
  });
  it('a living room with its door behind the television: the television and its stand move together, out of the door\'s zones, and stay in the room', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'door' }), before = proximity(r, { move: false });
    expect(before.found.map((b) => b.thing)).toContain('tv stand'); expect(before.found[0]!.of).toBe('door');
    const after = proximity(r);
    expect(after.moved).toBeGreaterThanOrEqual(2); expect(proximity(after.tree, { move: false }).found).toHaveLength(0);
    const ns = layout(after.tree), tv = ns.find((n) => n.p.name === 'television')!.sub!, st = ns.find((n) => n.p.name === 'tv stand')!.sub!;
    expect(tv.min.y).toBeCloseTo(st.max.y, 1); expect(tv.getCenter(new THREE.Vector3()).setY(0).distanceTo(st.getCenter(new THREE.Vector3()).setY(0))).toBeLessThan(0.25);
  }, 60000);
  it('the zones come with the things: the door\'s sweep and approach, the toilet\'s and basin\'s clear floor (IRC R307.1), the kitchen\'s aisle (NKBA)', async () => {
    const ns = layout(await room({ type: 'bathroom', front: 'wall', back: 'door' })), names = ns.flatMap((n) => (n.p.keep ?? []).map((k) => `${n.p.name}: ${k.name}`));
    expect(names).toEqual(expect.arrayContaining(['door: swing', 'door: approach', 'toilet: clear floor', 'pedestal sink: clear floor']));
    expect(ns.find((n) => n.p.name === 'toilet' && n.p.keep)!.p.keep![0]!.why).toMatch(/R307\.1/);
    const k = layout(await room({ type: 'kitchen', front: 'wall', back: 'window' })); expect(k.some((n) => n.p.keep?.some((z) => z.name === 'work aisle' && /NKBA/.test(z.why)))).toBe(true);
  }, 60000);
  it('what is there on purpose is left, and said', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'door' }), ns = layout(r), stand = ns.find((n) => n.p.name === 'tv stand')!;
    const mark = (p: Part, path = ''): Part => (path === stand.path ? { ...p, meant: [MEANT_ANYWHERE] } : p.parts ? { ...p, parts: p.parts.map((k, i) => mark(k, `${path}/${i}`)) } : p);
    expect(proximity(mark(r)).found.find((b) => b.thing === 'tv stand')!.did).toMatch(/meant/);
  }, 60000);
  it('every house plan comes out of its seed with every zone clear and every mate held', async () => {
    for (const plan of ['studio', '1 bed', '2 bed', '3 bed']) { const b = emptyBoard('h'); placeBlock(b, 'seed.house', 0, 0, { plan }, 'h'); const e = new Engine(b); await e.run(); const h = partOf(e.state.get('h')!.out!.house as Assembly);
      const p = proximity(h, { move: false }); expect(p.found).toHaveLength(0); expect(p.zones).toBeGreaterThan(10); expect(matesOf(h).every((m) => m.holds)).toBe(true); }
  }, 120000);
});

describe('mates as numbers: proximity, sense and conditional', () => {
  const box = (x: number, z: number, w = 1, d = 0.5, h = 1) => new THREE.Box3(new THREE.Vector3(x - w / 2, 0, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2));
  it('each measure from where things are: a distance, a gap, an angle off a front, a share seen past what is between', () => {
    const a = { box: box(0, 0), m: new THREE.Matrix4() }, b = box(0, 3);
    expect(measure({ name: '', to: '', measure: 'distance', why: '' }, a, b)).toBeCloseTo(3, 9);
    expect(measure({ name: '', to: '', measure: 'gap', why: '' }, a, b)).toBeCloseTo(2.5, 9);
    expect(measure({ name: '', to: '', measure: 'facing', face: '+z', why: '' }, a, b)).toBeCloseTo(0, 6);
    expect(measure({ name: '', to: '', measure: 'facing', face: '-z', why: '' }, a, b)).toBeCloseTo(180, 6);
    expect(measure({ name: '', to: '', measure: 'facing', face: '+z', why: '' }, a, box(3, 3))).toBeCloseTo(45, 6);
    const sees = { name: '', to: '', measure: 'sees' as const, eye: 0.5, why: '' };
    expect(measure(sees, a, b, [])).toBe(1); expect(measure(sees, a, b, [box(0, 1.5, 3, 0.2, 3)])).toBe(0);
    expect(outBy({ name: '', to: '', measure: 'distance', min: 2, max: 2.5, why: '' }, 3)).toBeCloseTo(0.5, 9);
  });
  it('a mate in force only while its state holds', () => { expect(inForce('watching', '*')).toBe(true); expect(inForce('watching', 'cooking, watching')).toBe(true); expect(inForce('watching', 'cooking')).toBe(false); expect(inForce(undefined, 'cooking')).toBe(true); });
  it('a living room: the sofa sits too far from its television (3.1 m, past SMPTE\'s 1.87 screen widths); drawn up to it, its table with it, it faces it, sees it, and every mate holds', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'window' }), before = matesOf(r);
    expect(before.find((m) => m.mate === 'viewing distance')!.holds).toBe(false);
    const p = proximity(r), after = matesOf(p.tree);
    expect(after.every((m) => m.holds)).toBe(true); const d = after.find((m) => m.mate === 'viewing distance')!; expect(d.value).toBeGreaterThanOrEqual(1.37 * 1.44 - 1e-3); expect(d.value).toBeLessThanOrEqual(1.87 * 1.44 + 1e-3);
    // (not while nobody watches: then nothing is out)
    expect(proximity(r, { state: 'cooking' }).found).toHaveLength(0);
  }, 60000);
  it('a door behind the television: the sofa, its table and the television turn as one arrangement out of the door\'s zones; every zone clear and every mate held after', async () => {
    const r = await room({ type: 'living', front: 'wall', back: 'door' }), p = proximity(r);
    expect(p.found[0]!.did).toMatch(/turned.*television.*sofa seat.*coffee table/);
    expect(proximity(p.tree, { move: false }).found).toHaveLength(0); expect(matesOf(p.tree).every((m) => m.holds)).toBe(true);
  }, 60000);
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
