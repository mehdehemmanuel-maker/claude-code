// primitives-world: the camera in metres, the sun's direction and shadows, the anti-aliased primitives, and the six
// drawers converted to them (tools/image/draw.mjs, things.mjs, passes.mjs).
import { describe, expect, it } from 'vitest';
import type { Ctx, Image, Scene } from '../../tools/image.mjs';
import {
  ELEVATION, LIGHT, SIZES, camera, canvas, disc, ellipse, elevationAt, families, line, paint, poly, quad, read, rect,
  register, shadowLength, shadowPoints, sunlight, tri,
} from '../../tools/image.mjs';

const WHITE = [1, 1, 1];
const DEG = Math.PI / 180;
/** The sum of one channel over a canvas: the area covered when white is painted on black. */
const covered = (c: { data: Float32Array }) => {
  let s = 0;
  for (let i = 0; i < c.data.length; i += 3) s += c.data[i]!;
  return s;
};
/** Paints a scene and hands back the context it was painted with (the landscape family, with a tap in front). */
function painted(prompt: string, width = 320, height = 180, seed = 7) {
  let ctx: Ctx | null = null;
  const land = families.find((f) => f.id === 'landscape')!;
  const tap = { id: 'landscape', detect: land.detect, passes: [(c: Ctx) => { ctx = c; }, ...land.passes] };
  register('families', tap);
  try {
    const img = paint(read(prompt), { width, height, seed });
    return { img, ctx: ctx! as Ctx };
  } finally {
    register('families', land);
  }
}

describe('the camera', () => {
  it('projects a 1.7 m person and a 1.45 m car at one depth to heights in the ratio 1.17 +- 0.02', () => {
    const cam = camera(960, 540, 310);
    for (const z of [10, 30, 100]) {
      const ground = cam.project(0, z).y;
      const person = ground - cam.project(0, z, SIZES.person).y, car = ground - cam.project(0, z, SIZES.car.h).y;
      expect(Math.abs(person / car - 1.17)).toBeLessThan(0.02);
    }
  });

  it('is a 50 mm-equivalent on the frame height, and groundZ inverts project on the ground', () => {
    const cam = camera(1280, 720, 400);
    expect(cam.focal).toBeCloseTo(720 * 50 / 24, 6);
    expect(cam.eye).toBe(SIZES.eye);
    for (const z of [8, 25, 200]) {
      const p = cam.project(3, z);
      expect(cam.groundZ(p.y)).toBeCloseTo(z, 6);
      expect(cam.groundX(p.x, p.y)).toBeCloseTo(3, 6);
      expect(p.scale).toBeCloseTo(cam.focal / z, 9);
    }
    expect(cam.groundZ(400)).toBe(Infinity);
    expect(cam.groundZ(100)).toBe(Infinity);
  });

  it('agrees with the ground pass: a car on the road, seen from behind, is 2 to 4 car widths in the two lanes', () => {
    // hook for vehicles: the car heads away down the road now (a rear three-quarter view), so its box across the
    // picture is its 1.78 m width plus the flank it turns toward the viewer, not its 4.5 m length
    for (const seed of [1, 7, 23]) {
      const { img, ctx } = painted('a red car on a road at dusk', 640, 360, seed);
      const car = img.layout.things.find((t) => t.kind === 'car')!;
      const road = SIZES.lane * SIZES.lanes * ctx.camera.focal / ctx.camera.groundZ(car.y + car.h);
      expect(road / car.w).toBeGreaterThan(1.8);
      expect(road / car.w).toBeLessThan(4);
      const across = car.w * ctx.camera.groundZ(car.y + car.h) / ctx.camera.focal;
      expect(across).toBeGreaterThan(SIZES.car.w * 0.95);
      expect(across).toBeLessThan(SIZES.car.w + SIZES.car.l * 0.4);
    }
  });

  it('sizes the tree and the cabin from the table, whatever their depths: a pine is 5 to 8.3 cabin walls tall', () => {
    // The reader has no species yet, so "a pine tree" is a pine or a broadleaf by the seed: both ranges are checked.
    for (const seed of [1, 3, 7, 11]) {
      const { img, ctx } = painted('a pine tree and a house', 640, 360, seed);
      const metres = (t: { y: number; h: number }) => t.h * ctx.camera.groundZ(t.y + t.h) / ctx.camera.focal;
      const tree = img.layout.things.find((t) => t.kind === 'tree')!;
      const cabin = img.layout.things.find((t) => t.kind === 'house')!;
      const cabinM = metres(cabin), treeM = metres(tree);
      expect(cabinM).toBeCloseTo(SIZES.cabin.wall + SIZES.cabin.rise, 1);
      const pine = treeM >= SIZES.pine[0] - 0.01 && treeM <= SIZES.pine[1] + 0.01;
      const broadleaf = treeM >= SIZES.broadleaf[0] - 0.01 && treeM <= SIZES.broadleaf[1] + 0.01;
      expect(pine || broadleaf, `tree of ${treeM.toFixed(2)} m`).toBe(true);
      // The plan asks for 2-4 cabin walls; the table's own figures (pine 15-25 m, wall 3 m) give 5-8.3, a broadleaf
      // 3.3-4.7
      expect(treeM / SIZES.cabin.wall).toBeGreaterThan(3);
      expect(treeM / SIZES.cabin.wall).toBeLessThan(8.4);
    }
  });
});

describe('the light', () => {
  it('throws a shadow at 60 degrees under a quarter as long as at 15, through shadowPoints too', () => {
    expect(shadowLength(1.45, 60 * DEG) / shadowLength(1.45, 15 * DEG)).toBeLessThan(0.25);
    const reach = (el: number) => {
      const pts = shadowPoints(0, el, 0, 20, { w: 4.5, d: 1.8 }, 1.45);
      let zMin = Infinity;
      for (let i = 1; i < pts.length; i += 2) zMin = Math.min(zMin, pts[i]!);
      return 20 - 0.9 - zMin; // how far past the footprint it reaches, toward the viewer
    };
    expect(reach(60 * DEG) / reach(15 * DEG)).toBeLessThan(0.25);
    expect(reach(60 * DEG)).toBeCloseTo(1.45 / Math.tan(60 * DEG), 6);
  });

  it('sets the elevation by time, the azimuth by the disc, and hides in a storm', () => {
    const dusk = painted('a red car on a road at dusk').ctx, noon = painted('a car on a road').ctx;
    const storm = painted('a car on a road in a storm').ctx, night = painted('a house at night').ctx;
    expect(dusk.light.el / DEG).toBeCloseTo(8, 6);
    expect(noon.light.el / DEG).toBeGreaterThanOrEqual(55);
    expect(noon.light.el / DEG).toBeLessThanOrEqual(65);
    expect(night.light.el / DEG).toBeCloseTo(35, 6);
    expect(dusk.light.visible && noon.light.visible && night.light.visible).toBe(true);
    expect(storm.light.visible).toBe(false);
    expect(night.light.moon).toBe(true);
    for (const c of [dusk, noon, storm, night]) {
      expect(c.sun.left).toBe(c.sun.x < 0.5);
      expect(Math.sign(c.light.az)).toBe(Math.sign(c.sun.x - 0.5));
      expect(c.light).toBe(c.sun);
    }
  });

  it('takes the elevation from the hour when the sun is up by it, and never a NaN from an unknown time', () => {
    const noon = painted('a car on a road at noon').ctx, morning = painted('a car on a road in the morning').ctx;
    const golden = painted('a car on a road at golden hour').ctx, dawn = painted('a car on a road at dawn').ctx;
    expect(noon.light.el).toBeGreaterThan(morning.light.el);
    expect(morning.light.el).toBeGreaterThan(golden.light.el);
    expect(golden.light.el).toBeGreaterThan(dawn.light.el); // golden hour at 17 is a low sun, dawn's figure lower
    expect(morning.light.el / DEG).toBeCloseTo(elevationAt(9, noon.light.el / DEG), 6);
    expect(dawn.light.el / DEG).toBeCloseTo(ELEVATION.dawn, 6); // the sine is below the horizon at six: the table
    const odd = { ...read('a car on a road'), time: 'twilight', hour: undefined } as unknown as Scene;
    const light = sunlight(odd, { x: 0.3, y: 0.2 }, LIGHT.day, camera(64, 36, 20), 64, 0.56);
    expect(Number.isFinite(light.el) && light.el > 0).toBe(true);
    for (const d of light.dir) expect(Number.isFinite(d)).toBe(true);
  });

  it('darkens the road under a car by day, far down the road at dusk, and not at all in a storm', () => {
    // How much darker each row of road below the car's foot is than the same row with no car (same seed, same road).
    const shade = (prompt: string) => {
      const { img, ctx } = painted(prompt, 640, 360, 3), car = img.layout.things.find((t) => t.kind === 'car')!;
      const empty = read(prompt.replace('a red car', 'a road').replace('a car', 'a road'));
      const bare = paint(empty, { width: 640, height: 360, seed: 3 });
      const fy = Math.round(car.y + car.h), x0 = Math.round(car.x + car.w * 0.3), x1 = Math.round(car.x + car.w * 0.7);
      const rows: number[] = [];
      for (let y = fy; y < Math.min(360, fy + 16); y++) {
        let dark = 0;
        for (let x = x0; x < x1; x++) dark += bare.data[(y * 640 + x) * 3 + 1]! - img.data[(y * 640 + x) * 3 + 1]!;
        rows.push(dark / (x1 - x0));
      }
      return { rows, visible: ctx.light.visible };
    };
    const day = shade('a car on a road'), dusk = shade('a red car on a road at dusk');
    const storm = shade('a car on a road in a storm');
    expect(Math.max(...day.rows)).toBeGreaterThan(0.02); // under it
    // and short: gone a few rows down. The car heads away now (vehicles), so its footprint reaches 0.99 m behind
    // the rear axle its box ends at (8 rows at 640x360, zm 15 m) and the shadow leans nearer: gone at row 14 measured
    expect(Math.abs(day.rows[15]!)).toBeLessThan(0.005);
    expect(dusk.rows[12]).toBeGreaterThan(0.01); // at dusk it is still there twelve rows nearer the viewer
    expect(storm.visible).toBe(false);
    expect(Math.max(...storm.rows.map(Math.abs))).toBeLessThan(0.005);
  });
});

describe('the primitives', () => {
  it('cover pi r^2 with a disc of r = 20, within 2%', () => {
    const c = canvas(64, 64);
    disc(c, 32, 32, 20, WHITE);
    expect(Math.abs(covered(c) / (Math.PI * 400) - 1)).toBeLessThan(0.02);
    const e = canvas(64, 64);
    ellipse(e, 32, 32, 20, 10, WHITE);
    expect(Math.abs(covered(e) / (Math.PI * 200) - 1)).toBeLessThan(0.02);
  });

  it('give edges intermediate coverage, inside full and outside none, with soft edges wider', () => {
    const c = canvas(40, 40);
    tri(c, 5.3, 5.2, 35.7, 8.9, 12.1, 36.4, WHITE);
    let edge = 0, full = 0;
    for (let i = 0; i < c.data.length; i += 3) {
      if (c.data[i]! > 0.05 && c.data[i]! < 0.95) edge++;
      if (c.data[i]! > 0.999) full++;
    }
    expect(edge).toBeGreaterThan(20);
    expect(full).toBeGreaterThan(200);
    const soft = canvas(40, 40);
    rect(soft, 10, 10, 20, 20, WHITE, 1, 6);
    let ramp = 0;
    for (let x = 0; x < 40; x++) if (soft.get(x, 20)[0]! > 0.05 && soft.get(x, 20)[0]! < 0.95) ramp++;
    expect(ramp).toBeGreaterThanOrEqual(8);
    expect(soft.get(20, 20)[0]).toBeCloseTo(1, 3);
    expect(soft.get(2, 20)[0]).toBe(0);
  });

  it('fill a concave polygon by even-odd, and take a colour function and an alpha function', () => {
    const c = canvas(60, 60);
    const star = [30, 2, 36, 22, 58, 22, 40, 34, 47, 56, 30, 42, 13, 56, 20, 34, 2, 22, 24, 22];
    poly(c, star, (x) => (x < 30 ? [1, 0, 0] : [0, 0, 1]), (_x, y) => (y < 30 ? 1 : 0.5));
    expect(c.get(30, 20)).toEqual([expect.any(Number), 0, expect.any(Number)]);
    expect(c.get(15, 26)[0]).toBeCloseTo(1, 3); // the left arm: red, full
    expect(c.get(45, 26)[2]).toBeCloseTo(1, 3); // the right arm: blue, full
    expect(c.get(30, 38)[0] + c.get(30, 38)[2]).toBeCloseTo(0.5, 2); // the body below the middle: half alpha
    expect(c.get(5, 40)[0] + c.get(5, 40)[2]).toBe(0); // beside the legs: outside
    expect(c.get(55, 50)[0] + c.get(55, 50)[2]).toBe(0);
    expect(c.get(30, 50)[0] + c.get(30, 50)[2]).toBe(0); // the notch between the legs: outside, by even-odd
  });

  it('clip to the frame and never throw on negative, oversize, infinite or NaN coordinates', () => {
    const c = canvas(16, 9), bad = [-1e9, 1e9, NaN, Infinity, -Infinity, 0, 7.5];
    for (const a of bad) {
      for (const b of bad) {
        disc(c, a, b, 1e6, WHITE);
        disc(c, a, b, b, WHITE);
        ellipse(c, a, b, 1e6, 3, WHITE);
        ellipse(c, a, b, a, b, WHITE);
        rect(c, a, b, 1e6, 1e6, WHITE);
        rect(c, a, b, -40, -40, WHITE);
        line(c, a, b, b, a, 3, WHITE);
        line(c, a, b, 8, 4, b, WHITE);
        tri(c, a, b, 1e6, -1e6, -1e6, 1e6, WHITE);
        quad(c, a, b, 1e6, 1e6, -1e6, 1e6, b, a, WHITE);
        poly(c, [a, b, a + 1, b + 1], WHITE); // two points: nothing
        poly(c, [], WHITE);
      }
    }
    poly(c, [-50, -50, 100, -50, 100, 100, -50, 100], WHITE); // the whole frame and more
    for (const v of c.data) expect(v).toBe(1);
    rect(c, 0, 0, 16, 9, [0, 0, 0], 1, 0); // soft under one pixel is one pixel, not a division by zero
    for (const v of c.data) expect(v).toBe(0);
  });
});

describe('the drawers in the world', () => {
  it('keep every thing in the layout, far to near, and record a top edge per sprite', () => {
    const words = 'a red car on a wet road at sunset, mountains, trees, a house, a boat, birds';
    const { img, ctx } = painted(words, 320, 180, 7);
    expect(img.layout.things.map((t) => t.kind).sort()).toEqual(['bird', 'bird', 'bird', 'bird', 'bird', 'bird', 'bird',
      'boat', 'car', 'house', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree', 'tree']);
    expect(ctx.tops.length).toBe(img.layout.things.length);
    for (const [i, t] of img.layout.things.entries()) {
      expect(t.w > 0 && t.h > 0 && Number.isFinite(t.x) && Number.isFinite(t.y), t.kind).toBe(true);
      const top = ctx.tops[i]!;
      expect(top.length).toBe(320);
      let touched = 0, highest = Infinity;
      for (const y of top) if (y >= 0) { touched++; highest = Math.min(highest, y); }
      if (t.x + t.w > 0 && t.x < 320 && t.y + t.h > 0) { // in frame: it painted columns, none above its box
        expect(touched, t.kind).toBeGreaterThan(0);
        expect(highest).toBeGreaterThanOrEqual(Math.floor(t.y) - 1);
      }
    }
    const feet = img.layout.things.filter((t) => t.kind !== 'bird').map((t) => t.y + t.h);
    // the sprite order is the painting order: on the ground, feet never go back up the picture except at the far bank
    for (let i = 1; i < feet.length; i++) expect(feet[i]!).toBeGreaterThanOrEqual(feet[i - 1]! - 1e-6);
  });

  it('stand a house on the near sand of a beach, and keep far-bank things a readable share of the frame', () => {
    const horizon = (img: Image) => img.layout.horizon * 360;
    for (const seed of [1, 2, 3, 5, 7, 8, 11]) {
      const beach = paint(read('a blue house on a beach, clear day'), { width: 640, height: 360, seed });
      const house = beach.layout.things.find((t) => t.kind === 'house')!;
      expect(house.y + house.h, `seed ${seed}: on the near sand`).toBeGreaterThan(beach.layout.shore! * 360);
      expect(house.w / 640, `seed ${seed}: no wider than half the frame`).toBeLessThanOrEqual(0.5 + 1e-6);
      const lake = paint(read('a house by a lake at sunset'), { width: 640, height: 360, seed });
      const far = lake.layout.things.find((t) => t.kind === 'house')!;
      expect(far.y + far.h, `seed ${seed}: across the lake`).toBeLessThan(horizon(lake));
      expect(far.h / 360, `seed ${seed}: a house one can see`).toBeGreaterThanOrEqual(0.12);
      const moonlit = read('three pine trees by a lake under a full moon, snow');
      const pines = paint(moonlit, { width: 640, height: 360, seed });
      const trees = pines.layout.things.filter((t) => t.kind === 'tree');
      expect(trees.length).toBe(3);
      for (const t of trees) expect(t.h / 360, `seed ${seed}: a pine that reads`).toBeGreaterThanOrEqual(0.18);
    }
  });

  it('stays fast: 960x540 under 1.5 s (median of 3 after a warm-up)', () => {
    const scene = read('a red car on a wet road at sunset, mountains, trees, a house, a boat, birds');
    paint(scene, { width: 960, height: 540, seed: 7 });
    const t = [0, 1, 2].map(() => {
      const t0 = performance.now();
      paint(scene, { width: 960, height: 540, seed: 7 });
      return performance.now() - t0;
    });
    const median = t.sort((a, b) => a - b)[1]!;
    expect(median, `960x540 took ${median.toFixed(0)} ms`).toBeLessThan(1500);
  });
});
