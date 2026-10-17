// placement-critic: things placed in world space (tools/image/things.mjs place()), the camera that frames the
// subject (draw.mjs frameCamera()), and the critic that counts what is visible from the owner-id buffer.
import { describe, expect, it } from 'vitest';
import type { Ctx, Image, Scene, ThingBox } from '../../tools/image.mjs';
import {
  FIT, NEAR_SHARE, SIZES, camera, families, frameCamera, paint, read, register, report,
} from '../../tools/image.mjs';

const CORRIDOR = SIZES.lanes * SIZES.lane / 2 + 0.5; // either side of the road's centre: its half width and some verge
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
/** Paints with a tap on the context (the road's centre, the shore line), as image-ground's helper does. */
function painted(scene: Scene, width: number, height: number, seed?: number) {
  let ctx: Ctx | null = null;
  const fam = families.find((f) => f.id === 'landscape')!;
  register('families', { ...fam, passes: [(c: Ctx) => { ctx = c; }, ...fam.passes] });
  try {
    return { img: paint(scene, { width, height, seed }), ctx: ctx! as Ctx };
  } finally {
    register('families', fam);
  }
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
    // the asked thing is the subject: the usual forest does not shrink the cabin (0.123 H when it set the eye)
    const cabin = read('a cabin in a foggy forest at dawn'), fc = frameCamera(cabin, cabin.instances, { W, H });
    expect(fc.subject).toBe('houses');
    expect(fc.eye).toBeLessThan(2); // the cabin's own fit (1.79 m), not the forest's 7 m
    const house = paint(cabin, { width: W, height: H }).layout.things.find((t) => t.kind === 'house')!;
    expect(house.h / H).toBeGreaterThanOrEqual(0.18);
    const forest = read('a foggy forest at dawn'); // nothing asked: framed for its largest usual kind
    expect(frameCamera(forest, forest.instances, { W, H }).subject).toBe('trees');
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

  it('keeps footprints apart, trees and houses off the road, reports every asked count: 5 prompts x 200 seeds', () => {
    for (const prompt of PROMPTS) { // 200 seeds: 7.3 s measured for the five at 160x90
      const scene = read(prompt), want = asked(scene);
      for (let seed = 1; seed <= 200; seed++) {
        const fresh = { ...scene, report: undefined } as Scene;
        const { img, ctx } = painted(fresh, 160, 90, seed), things = ground(img);
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
            const fy = a.y + a.h, centre = ctx.groundX(ctx.roadX!(fy), fy); // the drifted road's centre at its row
            const clear = Math.abs(a.xm! - centre) - a.footprint!.w / 2;
            expect(clear, `${tag}: ${a.kind} in the road`).toBeGreaterThanOrEqual(CORRIDOR - 1e-6);
          }
        }
        for (const t of img.layout.things) { // the critic: seen means at least half of what it painted is its own
          if (t.visible) expect(t.pixels!, `${tag}: ${t.kind} a sliver`).toBeGreaterThanOrEqual(0.5 * t.painted!);
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

  it('never counts a subject hidden behind another as seen: the boat behind the pine (seeds 4, 8) stands clear', () => {
    // the review's probe: before, 'five' seed 4 stood the sailboat wholly behind the tree with 8% of itself painted
    // and said 'boats 1/1'. Now an asked thing is never stood where a nearer one covers more than HIDE of its box,
    // and the critic wants half of what it painted
    const probes = [['a tree and a house and a car and a boat and a bird', [4, 8]],
      ['a boat and a house on the beach', [38]],
      ['an oak tree and two pine trees in a meadow at noon', [3, 11]]] as const;
    for (const [prompt, seeds] of probes) {
      for (const seed of seeds) {
        const img = paint(read(prompt), { width: 640, height: 360, seed });
        for (const t of ground(img)) {
          expect(t.visible, `${prompt} seed ${seed}: ${t.kind}`).toBe(true);
          expect(t.pixels! / t.painted!, `${prompt} seed ${seed}: ${t.kind} showing`).toBeGreaterThanOrEqual(0.5);
        }
      }
    }
  });

  it('stands a car in its lane on the drifted road: within 0.3 lane of ground-weather\'s roadX, seeds 1 to 5', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const { img, ctx } = painted(read('a red car on a road at dusk'), 640, 360, seed);
      const car = img.layout.things.find((t) => t.kind === 'car')!, fy = car.y + car.h;
      const centre = ctx.groundX(ctx.roadX!(fy), fy); // the road's centre at the car's row, in metres
      expect(Math.abs(Math.abs(car.xm! - centre) - SIZES.lane / 2), `seed ${seed}`).toBeLessThan(0.3 * SIZES.lane);
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
      const road = painted(read('a road through a forest'), 640, 360, seed);
      for (const t of road.img.layout.things.filter((t) => t.kind === 'tree')) {
        const fy = t.y + t.h, centre = road.ctx.groundX(road.ctx.roadX!(fy), fy);
        expect(Math.abs(t.xm! - centre) - t.footprint!.w / 2).toBeGreaterThanOrEqual(CORRIDOR - 1e-6);
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
    const huge = paint(read('a huge cabin, huge mountains'), { width: 640, height: 360, seed: 7 });
    const house = (img: Image) => img.layout.things.find((o) => o.kind === 'house')!;
    const metres = (img: Image) => {
      const t = house(img), eye = img.layout.camera!.eye;
      return t.h * eye / (t.y + t.h - img.layout.horizon * 360); // height over the foot's drop below the horizon
    };
    expect(metres(tiny)).toBeCloseTo((SIZES.cabin.wall + SIZES.cabin.rise) / 2, 1);
    expect(metres(big)).toBeCloseTo(SIZES.cabin.wall + SIZES.cabin.rise, 1);
    // and on the screen: the camera is framed for the plain cabin, so tiny is half as tall (0.254 / 0.508 H) and
    // huge taller, capped where its top meets the frame's top (0.625 H: a level camera with the horizon at 0.55 H
    // cannot show a 9.6 m thing from 1.9 m up any larger with its top in the picture)
    expect(house(tiny).h / house(big).h).toBeGreaterThan(0.4);
    expect(house(tiny).h / house(big).h).toBeLessThan(0.6);
    expect(house(huge).h / house(big).h).toBeGreaterThan(1.2);
    expect(house(huge).y).toBeGreaterThanOrEqual(0);
    expect(house(huge).h / 360).toBeLessThanOrEqual(0.96);
    const { img: cars, ctx } = painted(read('a red car and a blue car on a road'), 960, 540, 4);
    const both = cars.layout.things.filter((t) => t.kind === 'car');
    expect(both.length).toBe(2);
    const tint = (t: ThingBox) => { // the body's colour by a vote over its box (an oncoming car shows its grille)
      let red = 0, blue = 0;
      for (let y = Math.round(t.y); y < t.y + t.h; y++) {
        for (let x = Math.round(t.x); x < t.x + t.w; x++) {
          const i = (y * 960 + x) * 3, d = cars.data[i]! - cars.data[i + 2]!;
          if (d > 0.2) red++;
          else if (d < -0.2) blue++;
        }
      }
      return red > blue ? 'red' : 'blue';
    };
    expect(both.map(tint).sort()).toEqual(['blue', 'red']);
    for (const c of both) { // each in a lane of the drifted road (its box ends at its near wheels, a row nearer)
      const fy = c.y + c.h, centre = ctx.groundX(ctx.roadX!(fy), fy);
      expect(Math.abs(Math.abs(c.xm! - centre) - SIZES.lane / 2)).toBeLessThan(0.3 * SIZES.lane);
    }
  });

  it('stands a bus on the near shore of a lake it was named beside, never in the water (30 seeds)', () => {
    // 'a bus by a lake' had no shore word: the whole ground was water and the bus, drawn through the camera at the
    // far bank's depth, stood in the lake while the critic said 'buses 1/1'. The reader now brings the near shore
    const scene = read('a bus by a lake');
    expect(scene.beach).toBe(true);
    for (let seed = 1; seed <= 30; seed++) {
      const { img, ctx } = painted({ ...scene, report: undefined } as Scene, 320, 180, seed);
      const bus = img.layout.things.find((t) => t.kind === 'bus')!;
      expect(bus, `seed ${seed}: a bus`).toBeDefined();
      const foot = bus.y + bus.h, shore = ctx.shoreLine!;
      for (let x = Math.max(0, Math.ceil(bus.x)); x < Math.min(320, bus.x + bus.w); x++) {
        expect(foot, `seed ${seed}: the bus's foot at column ${x} is below the waterline`)
          .toBeGreaterThanOrEqual(shore[x]! - 1);
      }
    }
  });

  it('keeps three cows beside a farmhouse off the dirt road (30 seeds): the corridor is the road, not a field', () => {
    // the corridor was the whole road's width either side of its centre (14 m), which within 20 m of the camera left
    // nothing to stand on but the road, so the third cow was placed on it, crowded, and counted 3/3
    const scene = read('a farmhouse by a dirt road, three cows');
    for (let seed = 1; seed <= 30; seed++) {
      const { img, ctx } = painted({ ...scene, report: undefined } as Scene, 320, 180, seed);
      for (const cow of img.layout.things.filter((t) => t.kind === 'cow')) {
        const fy = cow.y + cow.h, centre = ctx.groundX(ctx.roadX!(fy), fy);
        expect(Math.abs(cow.xm! - centre) - cow.footprint!.w / 2, `seed ${seed}: a cow in the road`)
          .toBeGreaterThanOrEqual(CORRIDOR - 1e-6);
      }
    }
  });

  it('hangs an airliner inside the frame and counts it seen only when it is (30 seeds)', () => {
    // 'an airplane in the sky over the desert' once put a wing and part of the fuselage inside the right edge and
    // said 'airplanes 1/1': a flyer's column is now kept in by its width, and a flyer under 70% in frame is not seen
    for (let seed = 1; seed <= 30; seed++) {
      const scene = read('an airplane in the sky over the desert');
      const img = paint(scene, { width: 320, height: 180, seed });
      const plane = img.layout.things.find((t) => t.kind === 'airplane')!;
      const inside = Math.min(plane.x + plane.w, 320) - Math.max(plane.x, 0);
      expect(inside / plane.w, `seed ${seed}: the airplane's box in the frame`).toBeGreaterThanOrEqual(0.95);
      expect(plane.visible, `seed ${seed}: seen`).toBe(true);
      expect(scene.report!.visible!.airplanes).toEqual([1, 1]);
    }
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
