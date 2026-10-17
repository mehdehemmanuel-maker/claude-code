// The ground-weather package of the image tool (tools/image/passes.mjs: landPixel and the road, weatherFarPass and
// weatherPass; hooks in core.mjs, things.mjs and draw.mjs): dunes lit on the sun's side and shadowed in the lee,
// tufts in the near grass, two-tone flowers when the words name them, named hills that undulate the foreground, a
// dirt road with ruts and no dashes, grey asphalt by day that drifts across the picture with a dusty verge, the wet
// sheen on the grass beside a road, no rain after 'clear', snow settling on every sprite's top edges, rain in three
// layers with the far ones behind the near things, the autumn palette, the same bytes twice, and 960x540 in time.
import { describe, expect, it } from 'vitest';
import type { Ctx, Image, Scene } from '../../tools/image.mjs';
import { families, paint, png, read, register } from '../../tools/image.mjs';
import { RAIN_LAYERS, SNOW_LAYERS, duneAt, hillAt, reliefShade, roadDrift } from '../../tools/image/passes.mjs';

/** FNV-1a over a string, as math.mjs's hash() (not typed for a direct import). */
const hash = (str: string) => {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
/** The four header prompts' layout digests as placement-critic lays them out (see 'keeps the four header…'). */
const HEADER_LAYOUTS = [2773148169, 2255982723, 4279287698, 2033230310];

const W = 640, H = 360;
const lum = (d: Float32Array, i: number) => 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
const landscape = () => families.find((f) => f.id === 'landscape')!;

/** Paints with the landscape family: a tap first to keep the context, and some passes left out by name. */
function painted(scene: Scene, drop: string[] = [], size: [number, number] = [W, H], seed?: number) {
  let ctx: Ctx | null = null;
  const fam = landscape(), passes = fam.passes.filter((p) => !drop.includes(p.name));
  register('families', { ...fam, passes: [(c: Ctx) => { ctx = c; }, ...passes] });
  try {
    const img = paint(scene, { width: size[0], height: size[1], seed });
    return { img, ctx: ctx! as Ctx };
  } finally {
    register('families', fam);
  }
}
const horizonRow = (img: Image, h = H) => Math.ceil(img.layout.horizon * h);
/** A pixel of the painted centre line: yellowish, well over the asphalt or the dirt. */
const isPaint = (d: Float32Array, i: number) =>
  d[i]! > 0.55 && d[i + 1]! > 0.5 && d[i + 2]! < 0.45 && d[i]! - d[i + 2]! > 0.2;

describe('the ground', () => {
  it('shades dunes: the flanks facing the sun are lit, the lee is shadowed, by more than 0.05 (measured 0.29)', () => {
    const el = 60 * Math.PI / 180, dir = [0.4 * Math.cos(el), Math.sin(el), 0.9 * Math.cos(el)], o = [0, 0, 0];
    const lit: number[] = [], lee: number[] = [];
    for (let z = 5; z < 200; z += 1.3) {
      for (let x = -60; x < 60; x += 1.1) {
        duneAt(x, z, o);
        const facing = -o[1]! * dir[0]! - o[2]! * dir[2]!, s = reliefShade(dir, o[1]!, o[2]!, 0.4);
        if (facing > 0.03) lit.push(s);
        else if (facing < -0.03) lee.push(s);
      }
    }
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(lit.length).toBeGreaterThan(500);
    expect(lee.length).toBeGreaterThan(500);
    expect(mean(lit) - mean(lee)).toBeGreaterThan(0.05);
    expect(reliefShade(dir, 0, 0, 0.4)).toBeCloseTo(1, 6); // flat ground is unchanged
  });

  it('puts tufts in the near grass: darker strokes a few rows tall, hundreds of them, and none on snow', () => {
    const strokes = (prompt: string) => {
      const img = paint(read(prompt), { width: W, height: H }), d = img.data, hy = horizonRow(img);
      const y0 = hy + Math.round((H - hy) * 0.55); // the near band
      let n = 0;
      for (let y = y0; y < H - 3; y++) {
        for (let x = 8; x < W - 8; x++) {
          const here = lum(d, (y * W + x) * 3), below = lum(d, ((y + 1) * W + x) * 3);
          let around = 0;
          for (let k = -7; k <= 7; k++) if (k) around += lum(d, (y * W + x + k) * 3);
          around /= 14;
          if (around - here > 0.045 && around - below > 0.045) n++; // a dark stroke two rows tall at least
        }
      }
      return n;
    };
    const meadow = strokes('a quiet meadow at noon'), snow = strokes('a snowy plain on a clear day'); // land snow
    expect(meadow).toBeGreaterThan(300);
    expect(snow).toBeLessThan(meadow / 10);
  });

  it('reads flowers and sprinkles two tones over the near grass when the words name them', () => {
    const scene = read('a meadow with flowers');
    expect(scene.ignored).toEqual([]);
    expect('flowers' in scene.things).toBe(true); // 0 in the view: the usual count, one instance of one
    expect(scene.instances.find((i) => i.kind === 'flowers')?.count).toBe(1);
    const img = paint(scene, { width: W, height: H }), d = img.data, hy = horizonRow(img);
    let yellow = 0, pink = 0;
    for (let y = hy + Math.round((H - hy) * 0.4); y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3, r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
        if (r > 0.7 && g > 0.6 && b < 0.4) yellow++;
        else if (r > 0.6 && g < 0.5 && b > 0.35) pink++;
      }
    }
    expect(yellow).toBeGreaterThan(30);
    expect(pink).toBeGreaterThan(30);
    const plain = paint(read('a lawn at noon'), { width: W, height: H }).data; // grass, no meadow word, no flowers
    let stray = 0;
    for (let i = 0; i < plain.length; i += 3) {
      if (plain[i]! > 0.6 && plain[i + 1]! < 0.5 && plain[i + 2]! > 0.35) stray++;
    }
    expect(stray).toBe(0);
  });

  it('undulates the foreground when hills are named: long swells down the frame, wandering across it', () => {
    const o = [0, 0, 0, 0], down: number[] = [], along: number[] = [];
    for (let near = 0.05; near <= 0.6; near += 0.01) down.push(hillAt(0.3, near, 200, o)[3]!); // down one column
    for (let u = 0; u <= 1; u += 0.02) along.push(hillAt(u, 0.4, 200, o)[3]!); // along one row, mid-ground
    const spread = (a: number[]) => Math.max(...a) - Math.min(...a);
    expect(spread(down)).toBeGreaterThan(4); // rows of rise and fall down the frame (measured 5.7): swells
    expect(spread(along)).toBeGreaterThan(1); // a swell is not a straight band across: it wanders
    expect(Math.abs(hillAt(0.3, 1, 200, o)[3]!)).toBeLessThan(1e-9); // calm at the foot
    // In the picture: the ground's low-frequency luminance (blurred, each row's mean removed) varies more across the
    // frame with hills named than on the flat meadow (measured 0.035 against 0.010 at 960x540).
    const relief = (prompt: string) => {
      const img = paint(read(prompt), { width: W, height: H }), d = img.data, hy = horizonRow(img);
      const y0 = hy + Math.round((H - hy) * 0.33), L = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) L[i] = lum(d, i * 3);
      let sum = 0, sum2 = 0, n = 0;
      for (let y = y0; y < H - 8; y += 2) {
        const row: number[] = [];
        for (let x = 8; x < W - 8; x += 2) {
          let s = 0;
          for (let dy = -8; dy <= 8; dy += 2) for (let dx = -8; dx <= 8; dx += 2) s += L[(y + dy) * W + x + dx]!;
          row.push(s / 81);
        }
        const mean = row.reduce((s, v) => s + v, 0) / row.length;
        for (const v of row) {
          sum += v - mean;
          sum2 += (v - mean) ** 2;
          n++;
        }
      }
      return Math.sqrt(sum2 / n - (sum / n) ** 2);
    };
    expect(relief('rolling hills')).toBeGreaterThan(relief('a quiet meadow at noon') * 2);
  });

  it('paints a dirt road brown with ruts and no dashes, and asphalt grey by day with dashes that drift', () => {
    const dashes = (prompt: string) => {
      const { img, ctx } = painted(read(prompt)), d = img.data, hy = horizonRow(img);
      let n = 0;
      for (let y = hy + 10; y < H; y++) {
        const rc = ctx.roadX!(y + 0.5), half = ctx.W / 2 - Math.abs(rc - ctx.W / 2);
        for (let x = Math.max(0, Math.round(rc - half)); x < Math.min(W, rc + half); x++) {
          if (isPaint(d, (y * W + x) * 3)) n++;
        }
      }
      return { n, img, ctx };
    };
    expect(read('a farmhouse by a dirt road').roadKind).toBe('dirt');
    expect(dashes('a farmhouse by a dirt road').n).toBe(0);
    const { n, img, ctx } = dashes('a yellow truck on a desert highway at noon');
    expect(n).toBeGreaterThan(20);
    // the asphalt at the foot of the picture, beside the centre line, is grey and not near-black: 0.229 measured
    // from placement's road eye (2.5 m, the foot row 12 m away; 0.289 from a standing eye), the bug it guards
    // against (the knot grid asleep) gave 0.152
    const y = H - 4, rc = Math.round(ctx.roadX!(y)), i = (y * W + rc + 12) * 3;
    expect(lum(img.data, i)).toBeGreaterThan(0.2);
    expect(Math.abs(img.data[i]! - img.data[i + 2]!)).toBeLessThan(0.08);
    // the centre drifts: not the same column at every depth
    const xs = [0.2, 0.4, 0.6, 0.8].map((near) => roadDrift(near));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.005);
    expect(Math.abs(roadDrift(1))).toBeLessThan(1e-9); // and arrives at the foot where the camera is
    // the dirt road is brown: red over blue, between the ruts, at the foot
    const dirt = dashes('a farmhouse by a dirt road'), yd = H - 4, xd = Math.round(dirt.ctx.roadX!(yd));
    const j = (yd * W + xd) * 3;
    expect(dirt.img.data[j]! - dirt.img.data[j + 2]!).toBeGreaterThan(0.1);
  });

  it('wets the grass beside a road with the sky sheen, darkens everything below the horizon, and keeps no rain', () => {
    const scene = read('a wet road after the rain, clear sky');
    expect(scene.rain).toBe(0);
    expect(scene.wet).toBe(true);
    const dry = read('a road on a clear day'), wet = { ...dry, wet: true }; // the same seed: the same words
    const a = paint(dry, { width: W, height: H }), b = paint(wet, { width: W, height: H }), hy = horizonRow(a);
    let blueDry = 0, blueWet = 0, lumDry = 0, lumWet = 0, n = 0;
    for (let y = hy + Math.round((H - hy) * 0.5); y < H; y += 2) {
      for (const x of [20, 40, 60, W - 60, W - 40, W - 20]) { // the grass beside the road, well off the verge
        const i = (y * W + x) * 3;
        blueDry += a.data[i + 2]! / (a.data[i]! + a.data[i + 1]! + a.data[i + 2]! + 1e-6);
        blueWet += b.data[i + 2]! / (b.data[i]! + b.data[i + 1]! + b.data[i + 2]! + 1e-6);
        lumDry += lum(a.data, i);
        lumWet += lum(b.data, i);
        n++;
      }
    }
    expect(blueWet / n).toBeGreaterThan(blueDry / n + 0.01); // the sky's share in the grass: the sheen
    expect(lumWet / n).toBeLessThan(lumDry / n); // and wet is darker
    expect(read('snowy mountains over a lake on a clear day').snow).toBe(0); // the reader: no snow falls when clear
  });

  it('paints autumn: orange and rust broadleaf trees over straw grass, pines still green', () => {
    const scene = read('a road through a forest in autumn');
    expect(scene.season).toBe('autumn');
    const img = paint(scene, { width: W, height: H }), d = img.data;
    let orange = 0, green = 0;
    for (const t of img.layout.things.filter((t) => t.kind === 'tree')) {
      for (let y = Math.max(0, Math.floor(t.y)); y < Math.min(H, t.y + t.h * 0.6); y++) {
        for (let x = Math.max(0, Math.floor(t.x)); x < Math.min(W, t.x + t.w); x++) {
          const i = (y * W + x) * 3, r = d[i]!, g = d[i + 1]!, b = d[i + 2]!;
          // far crowns are hazed toward the air's grey: an autumn crown reads 0.46,0.35,0.30, a pine 0.29,0.40,0.34
          if (r > 0.4 && r > g * 1.2 && g > b * 1.05) orange++;
          else if (g > r * 1.2 && g > b * 1.1) green++;
        }
      }
    }
    expect(orange).toBeGreaterThan(200);
    expect(green).toBeGreaterThan(200);
    const hy = horizonRow(img), y = hy + Math.round((H - hy) * 0.8), i = (y * W + 30) * 3; // the grass at the foot
    expect(d[i]!).toBeGreaterThan(d[i + 1]!); // straw: red over green
    const summer = paint(read('a road through a forest in summer'), { width: W, height: H });
    const j = (y * W + 30) * 3;
    expect(summer.data[j + 1]!).toBeGreaterThan(summer.data[j]!); // green grass in summer
  });
});

describe('the weather', () => {
  it('settles snow on a car\'s top edges when the land is snow: rim pixels brighter than the car under them', () => {
    const scene = read('a car in the snow');
    const { img, ctx } = painted(scene), bare = painted(scene, ['weatherPass']).img;
    const car = img.layout.things.findIndex((t) => t.kind === 'car');
    expect(car).toBeGreaterThanOrEqual(0);
    const tops = ctx.tops[car]!;
    let rim = 0, columns = 0;
    for (let x = 0; x < W; x++) {
      if (tops[x]! < 0) continue;
      columns++;
      const i = (tops[x]! * W + x) * 3;
      if (lum(img.data, i) - lum(bare.data, i) > 0.08) rim++;
    }
    expect(columns).toBeGreaterThan(50);
    expect(rim).toBeGreaterThan(columns * 0.3);
    // and none when the land is grass, on the same car
    const dry = painted(read('a car on a sunny day'));
    const dryBare = painted(read('a car on a sunny day'), ['weatherPass']).img;
    const k = dry.img.layout.things.findIndex((t) => t.kind === 'car'), dt = dry.ctx.tops[k]!;
    let none = 0;
    for (let x = 0; x < W; x++) {
      if (dt[x]! < 0) continue;
      const i = (dt[x]! * W + x) * 3;
      if (lum(dry.img.data, i) - lum(dryBare.data, i) > 0.08) none++;
    }
    expect(none).toBe(0);
  });

  it('settles snow on a boat\'s deck in winter, and not on a bird', () => {
    const scene = read('a boat and a bird on a lake in winter');
    expect(scene.land).toBe('snow');
    const { img, ctx } = painted(scene), bare = painted(scene, ['weatherPass']).img;
    const count = (kind: string) => {
      const id = img.layout.things.findIndex((t) => t.kind === kind), tops = ctx.tops[id]!;
      let n = 0;
      for (let x = 0; x < W; x++) {
        if (tops[x]! < 0) continue;
        const i = (tops[x]! * W + x) * 3;
        if (lum(img.data, i) - lum(bare.data, i) > 0.06) n++;
      }
      return n;
    };
    expect(count('boat')).toBeGreaterThan(10);
    expect(count('bird')).toBe(0);
  });

  it('rains in three layers: the near streaks longer and brighter, the far ones hidden by the nearest building', () => {
    const [far, , near] = RAIN_LAYERS as [typeof RAIN_LAYERS[0], unknown, typeof RAIN_LAYERS[0]];
    expect(near.len[0]).toBeGreaterThan(far.len[1]);
    expect(near.alpha).toBeGreaterThan(far.alpha);
    expect(near.bright).toBeGreaterThan(far.bright);
    expect(SNOW_LAYERS[2]!.r).toBeGreaterThan(SNOW_LAYERS[0]!.r);
    const scene = read('a city at night in the rain');
    const full = paint(scene, { width: W, height: H }), noFar = painted(scene, ['weatherFarPass']).img;
    const noNear = painted(scene, ['weatherPass']).img;
    const nearest = [...full.layout.things].sort((a, b) => b.y + b.h - (a.y + a.h))[0]!; // the lowest foot
    let inside = 0, farChanged = 0, nearChanged = 0, skyChanged = 0;
    for (let y = Math.ceil(nearest.y) + 2; y < nearest.y + nearest.h - 2; y++) {
      for (let x = Math.ceil(nearest.x) + 2; x < nearest.x + nearest.w - 2; x++) {
        const i = (y * W + x) * 3;
        inside++;
        if (Math.abs(full.data[i]! - noFar.data[i]!) > 1e-6) farChanged++; // the far layers under the building
        if (Math.abs(full.data[i]! - noNear.data[i]!) > 1e-6) nearChanged++; // the near layer over it
      }
    }
    for (let i = 0; i < Math.floor(full.layout.horizon * H) * W * 3; i += 3) {
      if (Math.abs(full.data[i]! - noFar.data[i]!) > 1e-6) skyChanged++; // the far layers are there, on the sky
    }
    expect(inside).toBeGreaterThan(500);
    expect(farChanged).toBe(0);
    expect(nearChanged).toBeGreaterThan(0);
    expect(skyChanged).toBeGreaterThan(100);
  });

  it('thickens the fog on every thing by its depth through ctx.fogK, and never past the frame', () => {
    const { ctx } = painted(read('a cabin in a foggy forest at dawn'));
    expect(ctx.fogK).toBeCloseTo(1 + 0.6 * 0.25, 6);
    expect(painted(read('a cabin in a forest at dawn')).ctx.fogK).toBe(1);
  });

  it('fogs the header\'s cabin no more than the band alone did: its walls and roof still read', () => {
    // The per-thing fog replaces the band over a thing's pixels (fog() at BAND_ON_THINGS). On the base (90c157f), at
    // 960x540 seed 7, the house box's luminance sd is 0.0307 and its wall is 0.0315 darker than the ground beside it;
    // stacked (fogK 1.72 over the full band) the house was a white cutout. Measured now: 0.0329 and 0.0319.
    const img = paint(read('a cabin in a foggy forest at dawn, birds'), { width: 960, height: 540, seed: 7 });
    const t = img.layout.things.find((o) => o.kind === 'house')!, box: number[] = [], wall: number[] = [];
    const beside: number[] = [], y0 = Math.ceil(t.y + t.h * 0.45), y1 = Math.floor(t.y + t.h) - 1;
    const at = (x: number, y: number) => lum(img.data, (y * 960 + x) * 3);
    for (let y = Math.ceil(t.y); y <= y1; y++) for (let x = Math.ceil(t.x); x < t.x + t.w; x++) box.push(at(x, y));
    for (let y = y0; y <= y1; y++) {
      for (let x = Math.ceil(t.x + t.w * 0.2); x < t.x + t.w * 0.8; x++) wall.push(at(x, y));
      for (const [a, b] of [[t.x - 0.3 * t.w, t.x - 0.05 * t.w], [t.x + 1.05 * t.w, t.x + 1.3 * t.w]]) {
        for (let x = Math.max(0, Math.ceil(a!)); x < Math.min(960, b!); x++) beside.push(at(x, y));
      }
    }
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const sd = Math.sqrt(mean(box.map((v) => (v - mean(box)) ** 2)));
    expect(sd, 'the box\'s own contrast').toBeGreaterThan(0.9 * 0.0307);
    expect(Math.abs(mean(wall) - mean(beside)), 'the wall against the ground').toBeGreaterThan(0.8 * 0.0315);
  });

  it('shows a crest at noon: the strongest 30 px span per mid-ground row exceeds 0.08 (base 0.017, now 0.097)', () => {
    // The dunes' form shading (duneForm) is independent of the sun's height: the lee flank is darkened by its slope.
    // Measured on a 5 px box blur of the luminance, rows 0.3-0.6 of the ground band, 960x540 seed 7.
    const img = paint(read('a cactus in the desert at noon'), { width: 960, height: 540, seed: 7 });
    const Wd = 960, Hd = 540, hy = img.layout.horizon * Hd, band = Hd - hy, L = new Float32Array(Wd * Hd);
    for (let i = 0; i < Wd * Hd; i++) L[i] = lum(img.data, i * 3);
    const blur = (x: number, y: number) => {
      let s = 0, n = 0;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < Wd && yy >= 0 && yy < Hd) {
          s += L[yy * Wd + xx]!;
          n++;
        }
      }
      return s / n;
    };
    const rows: number[] = [];
    for (let y = Math.round(hy + 0.3 * band); y < hy + 0.6 * band; y += 6) {
      const f: number[] = [];
      for (let x = 0; x < Wd; x += 2) f.push(blur(x, y));
      let best = 0;
      for (let k = 0; k + 15 <= f.length; k += 5) {
        const win = f.slice(k, k + 15);
        best = Math.max(best, Math.max(...win) - Math.min(...win));
      }
      rows.push(best);
    }
    rows.sort((a, b) => a - b);
    expect(rows[rows.length >> 1]!, 'the median row\'s crest').toBeGreaterThan(0.08);
  });

  it('keeps the four header compositions as placement-critic laid them out, at 960x540 with no seed', () => {
    // A digest of each prompt's layout (horizon, sun and every thing's box as shares, 3 decimals): the FNV hash of
    // its JSON. The ground, the weather and the water change no random draw before the things are placed, so the
    // layouts stay to the pixel. When placement changes on purpose, print the JSON and update the digests.
    const digests: Record<string, number> = {
      'a red go-kart on a wet road at dusk, mountains behind': HEADER_LAYOUTS[0]!,
      'three pine trees by a lake under a full moon, snow': HEADER_LAYOUTS[1]!,
      'a city skyline at night in the rain': HEADER_LAYOUTS[2]!,
      'a cabin in a foggy forest at dawn': HEADER_LAYOUTS[3]!,
    };
    for (const [p, want] of Object.entries(digests)) {
      const L = paint(read(p), { width: 960, height: 540 }).layout;
      const json = JSON.stringify({
        horizon: +L.horizon.toFixed(4), sun: L.sun.map((v) => +v.toFixed(4)), shore: L.shore,
        things: L.things.map((t) => [t.kind, +(t.x / 960).toFixed(3), +(t.y / 540).toFixed(3), +(t.w / 960).toFixed(3),
          +(t.h / 540).toFixed(3)]),
      });
      expect(hash(json), `${p}: ${json}`).toBe(want);
    }
  });

  it('paints the same bytes twice, keeps the things where they stood without the snow, and 960x540 under 1.5 s', () => {
    for (const p of ['a storm over the desert', 'a car in the snow', 'a city at night in the rain', 'rolling hills']) {
      const a = png(paint(read(p), { width: 160, height: 90 })), b = png(paint(read(p), { width: 160, height: 90 }));
      expect(a.equals(b), p).toBe(true);
    }
    // the weather's placing is from the sun's seeded place, not ctx.rand: the things stand where they stood
    const snowy = read('three pine trees by a lake under a full moon, snow'), calm = { ...snowy, snow: 0 };
    const withSnow = paint(snowy, { width: W, height: H }).layout.things;
    expect(withSnow).toEqual(paint(calm, { width: W, height: H }).layout.things);
    const scene = read('a storm over the desert');
    paint(scene, { width: 960, height: 540 });
    const t = [0, 1, 2].map(() => {
      const t0 = performance.now();
      paint(scene, { width: 960, height: 540 });
      return performance.now() - t0;
    });
    const median = t.sort((a, b) => a - b)[1]!;
    expect(median, `960x540 took ${median.toFixed(0)} ms`).toBeLessThan(1500);
  });
});
