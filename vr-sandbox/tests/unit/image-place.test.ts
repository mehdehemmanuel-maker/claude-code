// placement-critic: things placed in world space (tools/image/things.mjs place()), the camera that frames the
// subject (draw.mjs frameCamera()), and the critic that counts what is visible from the owner-id buffer.
import { describe, expect, it } from 'vitest';
import type { Image, Scene, ThingBox } from '../../tools/image.mjs';
import { FIT, NEAR_SHARE, SIZES, camera, frameCamera, paint, read, report } from '../../tools/image.mjs';

const CORRIDOR = SIZES.lanes * SIZES.lane; // metres either side of the road's centre kept free of all but vehicles
const ground = (img: Image) => img.layout.things.filter((t) => t.kind !== 'bird');
/** How much of the smaller of two footprints the other covers, in world space. */
function overlap(a: ThingBox, b: ThingBox) {
  const fa = a.footprint!, fb = b.footprint!;
  const dx = Math.min(a.xm! + fa.w / 2, b.xm! + fb.w / 2) - Math.max(a.xm! - fa.w / 2, b.xm! - fb.w / 2);
  const dz = Math.min(a.zm! + fa.d / 2, b.zm! + fb.d / 2) - Math.max(a.zm! - fa.d / 2, b.zm! - fb.d / 2);
  return Math.max(0, dx) * Math.max(0, dz) / Math.min(fa.w * fa.d, fb.w * fb.d);
}
/** The share of box b that box a covers, in pixels. */
function covers(a: ThingBox, b: ThingBox) {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return Math.max(0, dx) * Math.max(0, dy) / (b.w * b.h);
}
const asked = (scene: Scene) => {
  const out: Record<string, number> = {};
  for (const inst of scene.instances) if (inst.count > 0) out[inst.kind] = (out[inst.kind] ?? 0) + inst.count;
  return out;
};

describe('frameCamera', () => {
  it('fits a 20 m pine within 0.6 H at the near shore, and leaves a standing eye for a car on a road', () => {
    const W = 960, H = 540, scene = read('three pine trees by a lake under a full moon, snow');
    const framing = frameCamera(scene, scene.instances, { W, H, horizon: 0.58 });
    expect(framing.subject).toBe('trees');
    expect(framing.near).toBe(NEAR_SHARE.water);
    expect(framing.eye).toBeGreaterThan(SIZES.eye);
    const hy = 0.58 * H, cam = camera(W, H, hy, framing.equiv, framing.eye);
    const fy = hy + (H - hy) * framing.near, z = cam.groundZ(fy); // a pine standing at the near share
    expect(20 * cam.focal / z).toBeLessThanOrEqual(FIT.height * H + 1e-6);
    expect(20 * cam.focal / z).toBeGreaterThan(0.4 * H); // and not shrunk to nothing: the eye rose only as needed
    const road = read('a red car on a road');
    expect(frameCamera(road, road.instances, { W, H }).eye).toBe(SIZES.eye);
    const city = read('a city skyline at night');
    expect(frameCamera(city, city.instances, { W, H }).eye).toBe(SIZES.eye); // the skyline row does not raise it
  });

  it('shares the columns among a counted few: three beach houses take 0.4 / sqrt(3) of the width each', () => {
    const W = 960, H = 540, three = read('three houses on a beach'), one = read('a house on a beach');
    const f3 = frameCamera(three, three.instances, { W, H }), f1 = frameCamera(one, one.instances, { W, H });
    expect(f3.eye).toBeGreaterThan(f1.eye);
    const img = paint(three, { width: W, height: H, seed: 3 });
    const houses = img.layout.things.filter((t) => t.kind === 'house');
    expect(houses.length).toBe(3);
    for (const h of houses) expect(h.w / W).toBeLessThanOrEqual(FIT.house / Math.sqrt(3) + 0.02);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) expect(covers(houses[i]!, houses[j]!)).toBeLessThan(0.4);
    }
  });
});

describe('place', () => {
  const PROMPTS = [
    'three pine trees by a lake under a full moon, snow', 'a cabin in a foggy forest at dawn',
    'a road through a forest', 'two sailboats at sunset', 'a tree and a house and a car and a boat and a bird',
  ];

  it('keeps footprints apart, trees and houses off the road, reports every asked count: 5 prompts x 100 seeds', () => {
    for (const prompt of PROMPTS) {
      const scene = read(prompt), want = asked(scene);
      for (let seed = 1; seed <= 100; seed++) {
        const fresh = { ...scene, report: undefined } as Scene;
        const img = paint(fresh, { width: 160, height: 90, seed }), things = ground(img);
        const tag = `${prompt} seed ${seed}`;
        for (let i = 0; i < things.length; i++) {
          const a = things[i]!;
          if (a.crowded) continue;
          for (let j = i + 1; j < things.length; j++) {
            const b = things[j]!;
            const farBank = a.y + a.h < img.layout.horizon * 90 || b.y + b.h < img.layout.horizon * 90;
            if (b.crowded || farBank) continue;
            expect(overlap(a, b), `${tag}: ${a.kind} over ${b.kind}`).toBeLessThanOrEqual(0.4 + 1e-9);
          }
          if (scene.road && (a.kind === 'tree' || a.kind === 'house' || a.kind === 'building')) {
            const clear = Math.abs(a.xm!) - a.footprint!.w / 2;
            expect(clear, `${tag}: ${a.kind} in the road`).toBeGreaterThanOrEqual(CORRIDOR);
          }
        }
        const visible = fresh.report!.visible!;
        for (const [kind, n] of Object.entries(want)) {
          if (!visible[kind]) continue; // a kind with no drawer (moon) is not counted
          expect(visible[kind]![1], `${tag}: ${kind} asked`).toBe(n);
          expect(visible[kind]![0], `${tag}: ${kind} seen`).toBeLessThanOrEqual(n);
        }
      }
    }
  });

  it('terminates for forty trees on a 160x90 frame, placing all forty', () => {
    const t0 = performance.now(), img = paint(read('forty trees'), { width: 160, height: 90, seed: 3 });
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(img.layout.things.filter((t) => t.kind === 'tree').length).toBe(40);
  });

  it('stands three pines on the near snow shore, apart, at a readable size; the shell says visible: trees 3/3', () => {
    for (const seed of [1, 2, 3, 5, 8]) {
      const scene = read('three pine trees by a lake under a full moon, snow'), H = 360;
      const img = paint(scene, { width: 640, height: H, seed });
      const trees = img.layout.things.filter((t) => t.kind === 'tree');
      expect(trees.length).toBe(3);
      for (const t of trees) {
        expect(t.visible, `seed ${seed}: visible`).toBe(true);
        expect(t.y + t.h, `seed ${seed}: on the near shore`).toBeGreaterThan(img.layout.shore! * H);
        expect(t.h / H, `seed ${seed}: readable`).toBeGreaterThanOrEqual(0.25);
        // the fit is made for the kind's typical 20 m; a pine grows 15-25 m, so the tallest is a quarter over it,
        // and one stood past the deepest wander of the shore (ashore) is nearer than the mean shore row: 0.767 seen
        expect(t.h / H, `seed ${seed}: framed`).toBeLessThanOrEqual(FIT.height * SIZES.pine[1] / 20 + 0.03);
      }
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) expect(overlap(trees[i]!, trees[j]!)).toBeLessThanOrEqual(0.4);
      }
      expect(scene.report!.visible!.trees).toEqual([3, 3]);
      expect(report(scene)).toContain('visible: trees 3/3');
    }
  });

  it('puts no tree before the cabin door, none on the carriageway, both sailboats inside the middle 70%', () => {
    for (const seed of [1, 2, 3, 5, 8]) {
      const cabin = paint(read('a cabin in a foggy forest at dawn'), { width: 640, height: 360, seed });
      const house = cabin.layout.things.find((t) => t.kind === 'house')!, door = house.x + house.w / 2;
      expect(house.visible).toBe(true);
      for (const t of cabin.layout.things.filter((t) => t.kind === 'tree' && t.zm! < house.zm!)) {
        const overDoor = t.x < door && t.x + t.w > door && t.y + t.h > house.y + house.h * 0.5;
        expect(overDoor, `seed ${seed}: a tree in front of the door`).toBe(false);
      }
      const road = paint(read('a road through a forest'), { width: 640, height: 360, seed });
      for (const t of road.layout.things.filter((t) => t.kind === 'tree')) {
        expect(Math.abs(t.xm!) - t.footprint!.w / 2).toBeGreaterThanOrEqual(CORRIDOR);
      }
      const sea = paint(read('two sailboats at sunset'), { width: 640, height: 360, seed });
      const boats = sea.layout.things.filter((t) => t.kind === 'boat');
      expect(boats.length).toBe(2);
      for (const b of boats) {
        const cx = (b.x + b.w / 2) / 640;
        expect(cx, `seed ${seed}: inside the middle 70%`).toBeGreaterThan(0.15);
        expect(cx).toBeLessThan(0.85);
        expect(b.y + b.h).toBeLessThan(sea.layout.horizon * 360 + (360 - sea.layout.horizon * 360) * 0.98); // on water
      }
    }
  });

  it('frames the five: the house 40 px tall on the near shore, the boat not over the car, the bird counted', () => {
    const scene = read('a tree and a house and a car and a boat and a bird');
    const img = paint(scene, { width: 960, height: 540 });
    const by = (k: string) => img.layout.things.find((t) => t.kind === k)!;
    const house = by('house'), car = by('car'), boat = by('boat');
    expect(house.h).toBeGreaterThanOrEqual(40);
    expect(house.y + house.h).toBeGreaterThan(img.layout.shore! * 540);
    expect(boat.y + boat.h).toBeLessThan(img.layout.shore! * 540);
    expect(covers(boat, car)).toBeLessThan(0.05);
    const one: [number, number] = [1, 1];
    expect(scene.report!.visible).toEqual({ trees: one, houses: one, cars: one, boats: one, birds: one });
  });

  it('keeps a beach house under 0.4 W on the sand, whole; a tiny cabin half-size; two cars in their colours', () => {
    for (const seed of [1, 3, 7]) {
      const beach = paint(read('a blue house on the beach'), { width: 960, height: 540, seed });
      const house = beach.layout.things.find((t) => t.kind === 'house')!;
      // the fit is judged at the mean shore row; the house stands past the deepest wander under it (0.423 seen)
      expect(house.w / 960).toBeLessThanOrEqual(FIT.house + 0.03);
      expect(house.y + house.h).toBeGreaterThan(beach.layout.shore! * 540);
      expect(house.x).toBeGreaterThanOrEqual(0);
      expect(house.x + house.w).toBeLessThanOrEqual(960);
      const px = ((Math.round(house.y + house.h * 0.7) * 960) + Math.round(house.x + house.w * 0.3)) * 3;
      expect(beach.data[px + 2]!).toBeGreaterThan(beach.data[px]!); // a blue wall
    }
    const tiny = paint(read('a tiny cabin, huge mountains'), { width: 640, height: 360, seed: 7 });
    const big = paint(read('a cabin, huge mountains'), { width: 640, height: 360, seed: 7 });
    const metres = (img: Image) => {
      const t = img.layout.things.find((o) => o.kind === 'house')!, eye = img.layout.camera!.eye;
      return t.h * eye / (t.y + t.h - img.layout.horizon * 360); // height over the foot's drop below the horizon
    };
    expect(metres(tiny)).toBeCloseTo((SIZES.cabin.wall + SIZES.cabin.rise) / 2, 1);
    expect(metres(big)).toBeCloseTo(SIZES.cabin.wall + SIZES.cabin.rise, 1);
    const cars = paint(read('a red car and a blue car on a road'), { width: 960, height: 540, seed: 4 });
    const both = cars.layout.things.filter((t) => t.kind === 'car');
    expect(both.length).toBe(2);
    const tint = (t: ThingBox) => {
      const i = (Math.round(t.y + t.h * 0.55) * 960 + Math.round(t.x + t.w * 0.5)) * 3;
      return cars.data[i]! > cars.data[i + 2]! ? 'red' : 'blue';
    };
    expect(both.map(tint).sort()).toEqual(['blue', 'red']);
    for (const c of both) expect(Math.abs(Math.abs(c.xm!) - SIZES.lane / 2)).toBeLessThan(1e-6); // in a lane
  });

  it('paints the same words into the same bytes, and the critic marks what it hid', () => {
    const a = paint(read('a cabin in a foggy forest at dawn'), { width: 320, height: 180, seed: 2 });
    const b = paint(read('a cabin in a foggy forest at dawn'), { width: 320, height: 180, seed: 2 });
    expect(Buffer.from(a.data.buffer).equals(Buffer.from(b.data.buffer))).toBe(true);
    const seen = (img: Image) => img.layout.things.map((t) => [t.kind, t.visible, t.pixels]);
    expect(seen(a)).toEqual(seen(b));
    for (const t of a.layout.things) expect(typeof t.visible).toBe('boolean');
    expect(a.layout.things.some((t) => t.pixels! > 0)).toBe(true);
  });
});
