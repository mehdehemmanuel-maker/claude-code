// vehicles: every kind drawn by one rule from the VEHICLES table (tools/image/things/vehicles.mjs), read by its
// words, placed by the shared instance fields (colour, size, heading, xm, zm, instance), its length true through
// the camera, its lamps lit when the light is low, deterministic and fast.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Ctx, Heading, Image, Scene, ThingInstance } from '../../tools/image.mjs';
import {
  COLOURS, VEHICLES, VEHICLE_THINGS, VEHICLE_WORDS, drawVehicle, families, paint, png, read, register, things,
  vehicleParts, vehicleRow,
} from '../../tools/image.mjs';

const KART = 'a red go-kart on a wet road at dusk, mountains behind';
const HEADINGS: Heading[] = ['away', 'toward', 'side'];
const KINDS = Object.keys(VEHICLE_WORDS);
/** The thing a table row is drawn through: hatchback within car, pickup within truck. */
const kindOf = (row: string) => (row === 'hatchback' ? 'car' : row === 'pickup' ? 'truck' : row);

/**
 * Paints the landscape up to and including the ground, then stops, handing back the context: a bare ground to draw
 * vehicles on directly through the shared interface (no thingsPass, so nothing else stands in the picture).
 */
function ground(prompt: string, width = 320, height = 180, seed = 3) {
  let ctx: Ctx | null = null;
  const land = families.find((f) => f.id === 'landscape')!;
  const passes = [...land.passes.slice(0, 5), (c: Ctx) => { ctx = c; }];
  register('families', { id: 'landscape', detect: land.detect, passes });
  try {
    const img = paint(read(prompt), { width, height, seed });
    return { img, ctx: ctx! as Ctx };
  } finally {
    register('families', land);
  }
}
/** Draws one vehicle through its sprite, as thingsPass would. */
function draw(ctx: Ctx, kind: string, inst: ThingInstance) {
  return ctx.sprite(inst.zm!, () => drawVehicle(ctx, inst, kind));
}
/** The mean colour of a box's middle band (the body's flank), and how many pixels pass a test. */
type Box = { x: number; y: number; w: number; h: number };
type Test = (r: number, g: number, b: number) => boolean;
function sample(ctx: Ctx, box: Box, test?: Test) {
  const x0 = Math.max(0, Math.round(box.x + box.w * 0.3)), x1 = Math.min(ctx.W, Math.round(box.x + box.w * 0.7));
  const y0 = Math.max(0, Math.round(box.y + box.h * 0.4)), y1 = Math.min(ctx.H, Math.round(box.y + box.h * 0.75));
  const mean = [0, 0, 0];
  let n = 0, hits = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * ctx.W + x) * 3, r = ctx.data[i]!, g = ctx.data[i + 1]!, b = ctx.data[i + 2]!;
      mean[0] += r;
      mean[1] += g;
      mean[2] += b;
      n++;
      if (test?.(r, g, b)) hits++;
    }
  }
  return { mean: mean.map((v) => v / Math.max(1, n)), hits };
}
const count = (ctx: Ctx, box: Box, test: Test) => {
  let hits = 0;
  for (let y = Math.max(0, Math.floor(box.y)); y < Math.min(ctx.H, Math.ceil(box.y + box.h)); y++) {
    for (let x = Math.max(0, Math.floor(box.x)); x < Math.min(ctx.W, Math.ceil(box.x + box.w)); x++) {
      const i = (y * ctx.W + x) * 3;
      if (test(ctx.data[i]!, ctx.data[i + 1]!, ctx.data[i + 2]!)) hits++;
    }
  }
  return hits;
};
const RED = (r: number, g: number, b: number) => r > 0.8 && g < 0.35 && b < 0.3;
const WHITE = (r: number, g: number, b: number) => r > 0.85 && g > 0.85 && b > 0.75;

describe('the reader knows every vehicle by its words', () => {
  const inst = (s: Scene, kind: string) => s.instances.filter((i) => i.kind === kind);
  const cases: [string, (s: Scene) => void][] = [
    [KART, (s) => {
      expect(s.things).toEqual({ karts: 1, mountains: 0 });
      expect(s.colours).toEqual({ karts: 'red' });
      expect([s.road, s.wet, s.time, s.ignored]).toEqual([true, true, 'sunset', []]);
    }],
    ['a semi truck on a highway', (s) => {
      expect(s.things).toEqual({ semis: 1, hills: 0 });
      expect(s.ignored).toEqual([]);
    }],
    ['an 18-wheeler', (s) => expect(s.things.semis).toBe(1)],
    ['a dirt bike', (s) => { expect(s.things).toEqual({ dirtbikes: 1, hills: 0 }); expect(s.roadKind).toBeNull(); }],
    ['a yellow taxi', (s) => expect([s.things.taxis, s.colours.taxis]).toEqual([1, 'yellow'])],
    ['a pickup truck', (s) => {
      expect(s.things).toEqual({ trucks: 1, hills: 0 });
      expect(inst(s, 'trucks')[0]!.word).toBe('pickup truck');
      expect(vehicleRow('truck', 'pickup truck')).toBe(VEHICLES.pickup);
      expect(vehicleRow('truck', 'lorry')).toBe(VEHICLES.truck);
      expect(vehicleRow('car', 'hatchback')).toBe(VEHICLES.hatchback);
    }],
    ['a four wheeler', (s) => expect(s.things.atvs).toBe(1)],
    ['a white forklift', (s) => expect([s.things.forklifts, s.colours.forklifts]).toEqual([1, 'white'])],
    ['two bicycles and a motorbike', (s) => expect([s.things.bicycles, s.things.motorcycles]).toEqual([2, 1])],
    ['a bus at a stop', (s) => { // 'bus' ends in s and is one bus (SINGULAR_S), asked for, not the usual number
      expect(s.things.buses).toBe(1);
      expect(inst(s, 'buses')[0]!.usual).toBeUndefined();
      expect(s.ignored).toEqual(['stop']);
    }],
    ['a bike on a road', (s) => expect(s.things).toEqual({ motorcycles: 1, hills: 0 })], // a bike is a motorcycle
    ['a bike and a bicycle', (s) => expect(s.things).toEqual({ bicycles: 2, hills: 0 })], // unless bicycles are about
    ['two bikes, a cyclist', (s) => { // the cyclist is drawn as a bicycle too: three
      expect(s.things.bicycles).toBe(3);
      expect(s.things.motorcycles).toBeUndefined();
    }],
    ['a truck with a red cab', (s) => expect(s.things).toEqual({ trucks: 1, hills: 0 })], // a bare cab is no taxi
    ['a yellow cab', (s) => expect(s.things).toEqual({ taxis: 1, hills: 0 })],
    ['a taxi cab at night', (s) => expect(s.things.taxis).toBe(1)],
    ['a tractor trailer on a highway', (s) => expect(s.things).toEqual({ semis: 1, hills: 0 })], // not a tractor
    ['a tractor-trailer', (s) => expect(s.things.semis).toBe(1)],
    ['a red car and a blue car', (s) => {
      expect(s.things.cars).toBe(2);
      expect(inst(s, 'cars').map((i) => i.colour)).toEqual(['red', 'blue']);
    }],
    ['a jeep, a van, a coach, a tractor, a quad', (s) => {
      expect(s.things).toEqual({ suvs: 1, vans: 1, buses: 1, tractors: 1, atvs: 1, hills: 0 });
    }],
    ['a race track with karts', (s) => { expect(s.things.karts).toBe(0); expect(s.road).toBe(true); }],
  ];
  it.each(cases)('%s', (prompt, check) => check(read(prompt)));

  it('registers one thing per kind, on the road, with a depth band and a size, and keeps the five built-ins', () => {
    const ids = things.map((t) => t.id);
    for (const kind of KINDS) expect(ids).toContain(kind);
    // then the five built-ins and ground-weather's flowers in a run; scene-families' landforms and phenomena follow
    const at = ids.indexOf('tree');
    expect(ids.slice(at, at + 6)).toEqual(['tree', 'building', 'house', 'boat', 'bird', 'flowers']);
    expect(ids.slice(0, at)).toEqual(expect.arrayContaining([...KINDS]));
    expect(ids).not.toContain('cars');
    for (const e of VEHICLE_THINGS) {
      expect(e.onRoad).toBe(true);
      expect(e.depth![0]).toBeGreaterThan(0);
      expect(e.depth![1]).toBeGreaterThan(e.depth![0]);
      expect(e.size!.w).toBe(VEHICLES[e.id as keyof typeof VEHICLES].length);
      expect(e.usual).toBeGreaterThan(0);
    }
  });
});

describe('every row renders', () => {
  it('at near 0.2, 0.5 and 0.9, at all three headings, by day and by night, without throwing and in the frame', () => {
    for (const words of ['a road at noon', 'a road at night']) {
      const { ctx } = ground(words), { W, H, hy } = ctx;
      for (const row of Object.keys(VEHICLES)) {
        for (const heading of HEADINGS) {
          for (const near of [0.2, 0.5, 0.9]) {
            const fy = hy + near * (H - hy), zm = ctx.groundZ(fy);
            const xm = heading === 'side' ? 0 : 1.75;
            const inst = { xm, zm, fy, heading, instance: { word: row } } as ThingInstance;
            const box = draw(ctx, kindOf(row), inst);
            const label = `${row} ${heading} near ${near} (${words})`;
            expect([box.x, box.y, box.w, box.h].every(Number.isFinite), label).toBe(true);
            expect(box.w > 0 && box.h > 0, label).toBe(true);
            const inFrame = box.x < W && box.x + box.w > 0 && box.y < H && box.y + box.h > 0;
            expect(inFrame, `${label}: in the frame`).toBe(true);
          }
        }
      }
      let ok = true;
      for (const v of ctx.data) if (!(v >= 0 && v <= 1)) ok = false;
      expect(ok, `${words}: every pixel finite and in 0..1`).toBe(true);
    }
  });

  it('builds the semi as an 18-wheeler and the forklift from its mast, forks and counterweight', () => {
    const wheels = (row: keyof typeof VEHICLES) =>
      vehicleParts(VEHICLES[row], [1, 0, 0]).filter((p) => p.kind === 'wheel');
    expect(wheels('semi').length).toBe(18);
    expect(wheels('kart').length).toBe(4);
    expect(wheels('dirtbike').length).toBe(2);
    expect(wheels('truck').length).toBe(6);
    const fork = vehicleParts(VEHICLES.forklift, [1, 1, 1]);
    expect(fork.some((p) => p.kind === 'prism' && p.axis === 'h')).toBe(true); // the counterweight, in plan
    expect(fork.filter((p) => p.kind === 'wheel').map((p) => p.r)).toEqual([0.2665, 0.2665, 0.203, 0.203]);
    expect(vehicleParts(VEHICLES.kart, [1, 0, 0]).some((p) => p.kind === 'lamp')).toBe(false); // a kart has no lamps
    expect(vehicleParts(VEHICLES.car, [1, 0, 0]).filter((p) => p.kind === 'lamp').length).toBe(4);
  });
});

describe('the shared instance fields', () => {
  it('paints the words\' colour through paint(): the header kart red, a yellow truck yellow, red and blue cars', () => {
    const red = (r: number, g: number, b: number) => r > 1.8 * g && r > 1.8 * b && r > 0.12;
    const share = (img: Image, t: Box, test: Test) => {
      let n = 0, all = 0;
      for (let y = Math.round(t.y); y < t.y + t.h; y++) {
        for (let x = Math.round(t.x); x < t.x + t.w; x++) {
          const i = (y * img.width + x) * 3;
          all++;
          if (test(img.data[i]!, img.data[i + 1]!, img.data[i + 2]!)) n++;
        }
      }
      return n / all;
    };
    const kart = paint(read(KART), { width: 640, height: 360 });
    expect(share(kart, kart.layout.things.find((t) => t.kind === 'kart')!, red)).toBeGreaterThan(0.15); // 0.3 seen
    const truck = paint(read('a yellow truck on a desert highway at noon'), { width: 640, height: 360 });
    const yellow = (r: number, g: number, b: number) => r > b + 0.2 && g > b + 0.15;
    expect(share(truck, truck.layout.things.find((t) => t.kind === 'truck')!, yellow)).toBeGreaterThan(0.3);
    const cars = paint(read('a red car and a blue car'), { width: 640, height: 360 });
    const blue = (r: number, g: number, b: number) => b > r + 0.15;
    const both = cars.layout.things.filter((t) => t.kind === 'car');
    const shares = both.map((t) => [share(cars, t, red), share(cars, t, blue)]); // the glass is bluish on both
    expect(shares.length).toBe(2);
    expect(shares.some(([r, b]) => r > 0.3 && b < r / 3)).toBe(true); // 0.42 red, 0.10 blue seen
    expect(shares.some(([r, b]) => b > 0.3 && r < 0.05)).toBe(true); // 0.54 blue, 0.03 red
  });

  it('colours each instance from inst.colour: a red car and a blue car, side by side', () => {
    const { ctx } = ground('a meadow at noon', 480, 270);
    const zm = 16, fy = ctx.project(0, zm).y;
    const red = draw(ctx, 'car', { xm: -3.2, zm, fy, heading: 'side', colour: COLOURS.red } as ThingInstance);
    const blue = draw(ctx, 'car', { xm: 3.2, zm, fy, heading: 'side', colour: COLOURS.blue } as ThingInstance);
    const r = sample(ctx, red).mean, b = sample(ctx, blue).mean;
    expect(r[0]).toBeGreaterThan(r[2]! + 0.15);
    expect(b[2]).toBeGreaterThan(b[0]! + 0.1);
    expect(red.x + red.w).toBeLessThan(blue.x + 1); // two cars, not one
  });

  it('picks two uncoloured cars different colours from the palette, by the seed', () => {
    let differ = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { ctx } = ground('a meadow at noon', 480, 270, seed), zm = 16, fy = ctx.project(0, zm).y;
      const a = sample(ctx, draw(ctx, 'car', { xm: -3.2, zm, fy, heading: 'side' } as ThingInstance)).mean;
      const b = sample(ctx, draw(ctx, 'car', { xm: 3.2, zm, fy, heading: 'side' } as ThingInstance)).mean;
      if (Math.abs(a[0]! - b[0]!) + Math.abs(a[1]! - b[1]!) + Math.abs(a[2]! - b[2]!) > 0.1) differ++;
    }
    expect(differ).toBeGreaterThanOrEqual(5); // eight paints: a pair matches one time in eight
  });

  it('scales with inst.size: a tiny kart is half as long on the screen', () => {
    const { ctx } = ground('a meadow at noon', 480, 270), zm = 14, fy = ctx.project(0, zm).y;
    const whole = draw(ctx, 'kart', { xm: 0, zm, fy, heading: 'side' } as ThingInstance);
    const tiny = draw(ctx, 'kart', { xm: 0, zm, fy, heading: 'side', size: 0.5 } as ThingInstance);
    expect(tiny.w / whole.w).toBeGreaterThan(0.45);
    expect(tiny.w / whole.w).toBeLessThan(0.55);
  });

  it('draws the kart 1.85 m long through the camera: its ends project where the table says, within 1 px', () => {
    const { ctx } = ground('a meadow at noon', 640, 360), K = VEHICLES.kart;
    for (const zm of [12, 20]) {
      const box = draw(ctx, 'kart', { xm: 0, zm, fy: ctx.project(0, zm).y, heading: 'side' } as ThingInstance);
      // side-on, the nose to the left: its tip (u 0, 0.25 m off the centre line) and its rear bumper's near corner
      // (u 1.85, 0.675 m off) are the ends, each at its own depth on the near side
      const nose = ctx.project(-K.length / 2, zm - 0.25).x, tail = ctx.project(K.length / 2, zm - K.width / 2).x;
      const label = `at ${zm} m: ${box.w.toFixed(2)} vs ${(tail - nose).toFixed(2)}`;
      expect(Math.abs(box.w - (tail - nose)), label).toBeLessThanOrEqual(1);
    }
    const far = draw(ctx, 'kart', { xm: 0, zm: 60, fy: ctx.project(0, 60).y, heading: 'side' } as ThingInstance);
    expect(Math.abs(far.w - K.length * ctx.camera.focal / 60)).toBeLessThanOrEqual(1); // far off, the depth is one
  });

  it('stands on the road heading away by default, its box low and inside the frame, and in the layout', () => {
    const img = paint(read(KART), { width: 640, height: 360, seed: 7 });
    const kart = img.layout.things.find((t) => t.kind === 'kart')!;
    expect(kart).toBeDefined();
    expect(kart.h / kart.w).toBeLessThan(0.7); // low: wider than it is tall, even in a three-quarter view
    expect(kart.x >= 0 && kart.x + kart.w <= 640 && kart.y + kart.h <= 360).toBe(true);
    expect(kart.y + kart.h).toBeGreaterThan(img.layout.horizon * 360); // on the ground
  });
});

describe('the lamps', () => {
  it('burn red at the rear and white at the front when the light is low, and not at noon; a kart has none', () => {
    const night = ground('a road at night', 480, 270).ctx, zm = 14, fy = night.project(0, zm).y;
    const away = draw(night, 'car', { xm: 1.75, zm, fy, heading: 'away' } as ThingInstance);
    expect(count(night, away, RED)).toBeGreaterThan(6);
    const toward = draw(night, 'car', { xm: -1.75, zm, fy, heading: 'toward' } as ThingInstance);
    expect(count(night, toward, WHITE)).toBeGreaterThan(6);
    const noon = ground('a road at noon', 480, 270).ctx;
    const day = draw(noon, 'car', { xm: 1.75, zm, fy, heading: 'away', colour: COLOURS.white } as ThingInstance);
    expect(count(noon, day, RED)).toBe(0);
    const dusk = ground('a wet road at dusk', 480, 270).ctx;
    const kart = draw(dusk, 'kart', { xm: 1.75, zm, fy, heading: 'away', colour: COLOURS.red } as ThingInstance);
    // the kart is red itself: its paintwork under the dusk light is darker than a lit lamp
    expect(count(dusk, kart, (r, g, b) => r > 0.95 && g < 0.3 && b < 0.3)).toBe(0);
    expect(count(dusk, kart, (r, g, b) => r > 0.3 && r > g * 2 && r > b * 2)).toBeGreaterThan(20); // but red it is
  });
});

describe('the module', () => {
  it('paints the same words into the same bytes, other seeds into other bytes', () => {
    const bytes = (seed?: number) => png(paint(read(KART), { width: 160, height: 90, seed }));
    expect(bytes().equals(bytes())).toBe(true);
    expect(bytes(1).equals(bytes(2))).toBe(false);
    const cars = (seed: number) => png(paint(read('two cars on a road'), { width: 160, height: 90, seed }));
    expect(cars(1).equals(cars(1))).toBe(true);
    expect(cars(1).equals(cars(2))).toBe(false);
  });

  it('has nothing of Node in it and imports only draw, math and the registry', () => {
    const src = readFileSync(fileURLToPath(new URL('../../tools/image/things/vehicles.mjs', import.meta.url)), 'utf8');
    for (const banned of ['node:', 'Buffer', 'process.']) expect(src.includes(banned), banned).toBe(false);
    const imports = [...src.matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
    expect(imports.sort()).toEqual(['../draw.mjs', '../math.mjs', '../registry.mjs']);
    for (const line of src.split('\n')) expect(line.length, line).toBeLessThanOrEqual(120);
  });

  it('stays fast: the kart on its road at 960x540 under 1.5 s (median of 3 after a warm-up)', () => {
    const scene = read(KART);
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
