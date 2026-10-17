// The sky-light package of the image tool (tools/image/passes.mjs: celestialPass, cloudPass, landBehindPass): the
// flanks of the mountains that face the sun are the lit ones, a storm's sky has no blue holes, day clouds are never
// dark smudges and the top rows are not streaks, the sun sets orange and small by day, the moon shows its phase or
// stays away, the ranges are as many as the words count, the pictures stay the same bytes, and 960x540 stays under
// 1.5 s. Where a threshold guards against the old look, the comment gives the base code's measured value beside it.
import { describe, expect, it } from 'vitest';
import type { Ctx, Image, Scene } from '../../tools/image.d.mts';
import { families, paint, png, read, register } from '../../tools/image.mjs';

const W = 640, H = 360;
const lum = (d: Float32Array, i: number) => 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
const landscape = () => families.find((f) => f.id === 'landscape')!;

/** Paints with the landscape family's passes changed for one call: a probe pass first, or some passes left out. */
function paintWith(scene: Scene, opts: { seed?: number }, probe?: Ctx['probe'], drop: string[] = []): Image {
  const fam = landscape(), passes = fam.passes.filter((p) => !drop.includes(p.name));
  const hook = (ctx: Ctx) => { ctx.probe = probe; };
  register('families', { ...fam, passes: probe ? [hook, ...passes] : passes });
  try {
    return paint(scene, { width: W, height: H, ...opts });
  } finally {
    register('families', fam);
  }
}

describe('the sky, the sun and moon, and the light on the mountains', () => {
  it('lights the mountain flanks that face the sun, for a sun on either side (mean face gap at least 0.25)', () => {
    for (const seed of [3, 5, 11, 12]) {
      const rows: { face: number; slope: number }[] = [];
      const img = paintWith(read('mountains on a clear day'), { seed }, (name, _r, _x, face, slope) => {
        if (name === 'face') rows.push({ face, slope });
      });
      const sunLeft = img.layout.sun[0] < 0.5, lit: number[] = [], far: number[] = [];
      for (const { face, slope } of rows) {
        if (Math.abs(slope) < 0.1) continue; // a flat stretch faces neither way
        ((slope > 0) === sunLeft ? lit : far).push(face); // slope > 0 rises to the right: the flank faces left
      }
      const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      expect(lit.length).toBeGreaterThan(100);
      expect(far.length).toBeGreaterThan(100);
      expect(mean(lit) - mean(far), `seed ${seed} (${sunLeft ? 'sun left' : 'sun right'})`).toBeGreaterThan(0.25);
    }
  });

  it('paints a storm sky grey: under 2% of the sky is blue-dominant and bright', () => {
    for (const p of ['a storm over the desert', 'a lighthouse in a storm']) {
      const img = paint(read(p), { width: W, height: H }), hy = Math.floor(img.layout.horizon * H);
      let blue = 0;
      for (let i = 0; i < hy * W * 3; i += 3) {
        if (img.data[i + 2]! > 0.5 && img.data[i + 2]! > img.data[i]! + 0.15) blue++;
      }
      expect(blue / (hy * W), p).toBeLessThan(0.02);
    }
  });

  it('keeps day clouds bright (no mostly-cloud pixel under 0.6 luminance) and the top rows free of streaks', () => {
    for (const p of ['a quiet meadow at noon', 'a yellow truck on a desert highway at noon']) {
      const scene = read(p);
      const a = paintWith(scene, {}, undefined, ['finishPass']); // before the vignette and grain
      const b = paintWith(scene, {}, undefined, ['finishPass', 'cloudPass']);
      const hy = Math.floor(a.layout.horizon * H);
      // A cloud pixel is one the clouds moved by more than 0.15 luminance from the cloudless sky: mostly cloud. The
      // fringe pixels that moved 0.10-0.15 are the anti-aliased edge over the dark blue zenith and go down to 0.58,
      // so the 0.6 floor is asked of the cloud, not of its edge (measured: darkest 0.633 and 0.631 at 0.15).
      let clouds = 0, darkest = 1;
      const fringe = new Uint8Array(40 * W); // the top rows' cloud mask at the wider 0.10 definition, for the runs
      for (let i = 0; i < hy * W * 3; i += 3) {
        const la = lum(a.data, i), moved = Math.abs(la - lum(b.data, i));
        if (moved > 0.15) {
          clouds++;
          darkest = Math.min(darkest, la);
        }
        if (moved > 0.10 && i < 40 * W * 3) fringe[i / 3] = 1;
      }
      expect(clouds, `${p}: some cloud`).toBeGreaterThan(50);
      expect(darkest, `${p}: darkest cloud pixel`).toBeGreaterThanOrEqual(0.6);
      // Streaks are long in x and thin in y. Two measures over the top 40 rows, each with the value the base code
      // (6528e7c, the cloud plane's vanishing point at the top-left corner) gave on these two prompts at 640x360,
      // measured with the same mask: the vertical over horizontal roughness was 4.15 and 4.30 there (3.02 and 2.83
      // now), and the mean vertical run of cloud pixels was 2.7 and 3.0 px (6.0 and 5.7 now): the base's clouds
      // were three-pixel scratches.
      let dx = 0, dy = 0, runTotal = 0, runs = 0;
      for (let y = 0; y < 40; y++) {
        for (let x = 0; x < W - 1; x++) {
          const i = (y * W + x) * 3;
          dx += Math.abs(lum(a.data, i + 3) - lum(a.data, i));
          dy += Math.abs(lum(a.data, i + W * 3) - lum(a.data, i));
        }
      }
      for (let x = 0; x < W; x++) {
        let run = 0;
        for (let y = 0; y <= 40; y++) {
          if (y < 40 && fringe[y * W + x]) run++;
          else if (run) {
            runTotal += run;
            runs++;
            run = 0;
          }
        }
      }
      expect(dx, `${p}: the top rows vary along x`).toBeGreaterThan(0);
      expect(dy / dx, `${p}: top-row roughness, vertical over horizontal (base 4.15)`).toBeLessThan(3.5);
      expect(runTotal / runs, `${p}: mean vertical run of cloud pixels (base 2.7 px)`).toBeGreaterThan(4.5);
    }
  });

  it('sets an orange sun whose centre is r > 0.9, g < 0.7, b < 0.4, and paints a small one at noon', () => {
    const dusk = paint(read('two sailboats at sunset'), { width: W, height: H });
    const [sx, sy] = dusk.layout.sun, i = (Math.round(sy * H) * W + Math.round(sx * W)) * 3;
    expect(dusk.data[i]!).toBeGreaterThan(0.9);
    expect(dusk.data[i + 1]!).toBeLessThan(0.7);
    expect(dusk.data[i + 2]!).toBeLessThan(0.4);
    const noon = paint(read('a quiet meadow at noon'), { width: W, height: H });
    const [nx, ny] = noon.layout.sun, row = Math.round(ny * H) * W * 3;
    let wide = 0;
    for (let x = 0; x < W; x++) if (lum(noon.data, row + x * 3) > 0.85) wide++;
    expect(wide).toBeGreaterThan(0.05 * H); // a disc, not a pin
    expect(wide).toBeLessThan(0.1 * H); // 0.035 H in radius, with its edge: not the 0.07 H moon-sized disc of before
    expect(nx).toBeGreaterThan(0);
  });

  it('shades the moon by its phase, draws none when moonless, and a pale one by day beside the dawn sun', () => {
    const sea = read('a crescent moon over the sea');
    const brightMoon = (img: Image) => {
      if (!img.layout.moon) return 0;
      const [mx, my] = img.layout.moon, r = 0.05 * H;
      let n = 0;
      for (let y = Math.floor(my * H - r); y <= my * H + r; y++) {
        for (let x = Math.floor(mx * W - r); x <= mx * W + r; x++) {
          if (x >= 0 && y >= 0 && x < W && y < H && lum(img.data, (y * W + x) * 3) > 0.55) n++;
        }
      }
      return n;
    };
    const at = (phase: Scene['moonPhase']) => brightMoon(paint({ ...sea, moonPhase: phase }, { width: W, height: H }));
    const full = at('full'), half = at('half'), crescent = at('crescent');
    expect(at(null)).toBe(full); // no word (the reader's null): the full moon, as before
    expect(full).toBeGreaterThan(0.6 * Math.PI * (0.05 * H) ** 2);
    expect(half).toBeGreaterThan(0.35 * full);
    expect(half).toBeLessThan(0.65 * full);
    expect(crescent).toBeGreaterThan(0.05 * full);
    expect(crescent).toBeLessThan(0.3 * full);
    expect(at('moonless')).toBe(0);
    expect(at('new')).toBe(0);
    expect(paint({ ...sea, moonPhase: 'moonless' }, { width: W, height: H }).layout.moon).toBeNull();
    const dawn = read('the moon at dawn');
    expect(dawn.time).toBe('dawn');
    const img = paint(dawn, { width: W, height: H });
    expect(img.layout.moon).not.toBeNull();
    const [mx, my] = img.layout.moon!, i = (Math.round(my * H) * W + Math.round(mx * W)) * 3;
    expect(mx > 0.5 !== img.layout.sun[0] > 0.5).toBe(true); // across the sky from the sun
    expect(lum(img.data, i) - lum(img.data, i + Math.round(0.12 * H) * 3)).toBeGreaterThan(0.05); // pale, but there
  });

  it('paints as many ranges as the words count: one for a mountain, two for two, three for mountains', () => {
    const ranges = (p: string) => paint(read(p), { width: 160, height: 90 }).layout.ranges!.map((r) => r.kind);
    expect(ranges('a mountain by a lake')).toEqual(['mountains']);
    expect(ranges('two mountains in the distance')).toEqual(['mountains', 'mountains']);
    expect(ranges('mountains and hills')).toEqual(['mountains', 'mountains', 'mountains', 'hills', 'hills']);
    expect(ranges('seven mountains')).toHaveLength(4);
  });

  it('puts snow only on the upper parts of the far range and keeps the near range darker, with no striping', () => {
    const scene = read('snowy mountains over a lake on a clear day');
    const img = paint(scene, { width: W, height: H });
    const hy = img.layout.horizon * H, [r0, r1, r2] = img.layout.ranges!;
    expect(img.layout.ranges!.length).toBe(3);
    const far = (x: number, y: number) => y > r0!.top[x]! + 3 && y < Math.min(r1!.top[x]!, r2!.top[x]!) - 3;
    const near = (x: number, y: number) => y > r2!.top[x]! + 3 && y < hy - 3;
    const over = (inBand: (x: number, y: number) => boolean) => {
      let sum = 0, n = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (!inBand(x, y)) continue;
          sum += lum(img.data, (y * W + x) * 3);
          n++;
        }
      }
      return { mean: sum / n, n };
    };
    const a = over(far), b = over(near);
    expect(a.n).toBeGreaterThan(2000);
    expect(b.n).toBeGreaterThan(2000);
    expect(a.mean - b.mean, 'the near range darker than the far').toBeGreaterThan(0.15);
    // Striping: how much of the faces' variation is per column. The mountain pixels are those landBehindPass changed
    // (painted with and without it, before the finish), at least 3 rows under their column's ridge and 3 over the
    // horizon; the between-column share of their luminance variance (variance of the column means over the pooled
    // variance) is 1 for pure stripes. The base code (6528e7c, its face term per column from the ridge's slope) gave
    // 0.451 on this prompt at 640x360; the 2D facets and the wandering gullies give 0.170.
    const plain = paintWith(scene, {}, undefined, ['finishPass']);
    const sky = paintWith(scene, {}, undefined, ['finishPass', 'landBehindPass']);
    const top = new Int32Array(W).fill(-1), colSum = new Float64Array(W), colN = new Float64Array(W);
    let all = 0, allSq = 0, allN = 0;
    const rows = Math.floor(hy);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3, l = lum(plain.data, i);
        if (Math.abs(l - lum(sky.data, i)) <= 0.02) continue;
        if (top[x]! < 0) top[x] = y;
        if (y < top[x]! + 3 || y >= rows - 3) continue;
        colSum[x] += l;
        colN[x]++;
        all += l;
        allSq += l * l;
        allN++;
      }
    }
    const mean = all / allN, pooled = allSq / allN - mean * mean;
    let between = 0, bn = 0;
    for (let x = 0; x < W; x++) {
      if (colN[x]! < 4) continue;
      between += (colSum[x]! / colN[x]! - mean) ** 2 * colN[x]!;
      bn += colN[x]!;
    }
    expect(allN).toBeGreaterThan(10000);
    expect(between / bn / pooled, 'between-column share of the faces\' variance (base 0.451)').toBeLessThan(0.3);
    const snowy = (lo: number, hi: number) => { // share of white pixels on the far range between two heights
      let s = 0, n = 0;
      for (let y = 0; y < hy; y++) {
        for (let x = 0; x < W; x++) {
          const up = (hy - y) / H;
          if (!far(x, y) || up < lo || up >= hi) continue;
          const i = (y * W + x) * 3, d = img.data;
          const sat = Math.max(d[i]!, d[i + 1]!, d[i + 2]!) - Math.min(d[i]!, d[i + 1]!, d[i + 2]!);
          n++;
          if (lum(d, i) > 0.72 && sat < 0.12) s++;
        }
      }
      return n ? s / n : 0;
    };
    expect(snowy(0.22, 0.4)).toBeGreaterThan(snowy(0.1, 0.16) + 0.15);
  });

  it('paints the same bytes twice and stays under 1.5 s at 960x540 (median of 3)', () => {
    const words = 'snowy mountains over a lake at sunset, two sailboats, clouds';
    const once = png(paint(read(words), { width: 320, height: 180 }));
    expect(once.equals(png(paint(read(words), { width: 320, height: 180 })))).toBe(true);
    const scene = read('a red car on a wet road at sunset, mountains, trees, a house, a boat, birds');
    paint(scene, { width: 960, height: 540, seed: 7 });
    const t = [0, 1, 2].map(() => {
      const t0 = performance.now();
      paint(scene, { width: 960, height: 540, seed: 7 });
      return performance.now() - t0;
    }).sort((p, q) => p - q);
    expect(t[1]!, `960x540 took ${t[1]!.toFixed(0)} ms`).toBeLessThan(1500);
  });
});
