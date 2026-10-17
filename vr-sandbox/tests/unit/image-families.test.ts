// The scene-families package of the image tool: the families beyond the landscape (tools/image/families/space,
// abstract, portrait, underwater), the sky's phenomena (families/phenomena.mjs: rainbow, aurora, lightning) and the
// landforms (things/landforms.mjs: cactus, palm, volcano, waterfall). The twenty prompts the critique panel found
// painting the default meadow now read and paint differently, each family paints at any size and the same bytes
// twice, every word a family claims leaves scene.ignored and the ones it cannot use go back in order, the pictures
// hold what the words asked (measured on the pixels), and the landscape family paints the four header prompts
// exactly as it did before the package (layout and bytes).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Image, Scene, ThingBox } from '../../tools/image.mjs';
import { families, familyFor, paint, png, read, report, things } from '../../tools/image.mjs';

const md5 = (img: Image) => createHash('md5').update(png(img)).digest('hex');
const at = (prompt: string, width = 160, height = 90, seed?: number) => paint(read(prompt), { width, height, seed });
const lum = (d: Float32Array, i: number) => 0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!;
/** The share of the pixels in rows y0..y1 (shares of H) for which `test(r, g, b)` holds. */
function share(img: Image, test: (r: number, g: number, b: number) => boolean, y0 = 0, y1 = 1) {
  const { width: W, height: H, data } = img;
  let n = 0, hit = 0;
  for (let y = Math.floor(y0 * H); y < Math.ceil(y1 * H); y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      n++;
      if (test(data[i]!, data[i + 1]!, data[i + 2]!)) hit++;
    }
  }
  return hit / Math.max(1, n);
}
const kinds = (img: Image) => img.layout.things.map((t: ThingBox) => t.kind);
const without = (s: Scene) => ({ ...s, prompt: undefined });

/** The prompt-robustness critique's twenty prompts that painted the identical default meadow. */
const PANEL = [
  'a dragon over a castle', 'portrait of a woman', 'a cat on a sofa', 'abstract art, circles and triangles',
  'a logo for a coffee shop', 'Mars seen from orbit', 'a nebula and a rocket', 'underwater coral reef with fish',
  'a rainbow over a waterfall', 'a windmill in a tulip field', 'a snowman in a garden', 'a lighthouse',
  'a train on a bridge', 'an airplane in the sky', 'a hot air balloon over fields', 'sunflowers', 'a cheerful picture',
  'a sad picture', 'pixel art of a village', 'nothing',
];
/** The ones this package paints: these differ from the meadow at one fixed seed, not only by the words' seed. */
const OURS = ['portrait of a woman', 'abstract art, circles and triangles', 'Mars seen from orbit',
  'a nebula and a rocket', 'underwater coral reef with fish', 'a rainbow over a waterfall'];

const FAMILY_PROMPTS = [
  'Mars seen from orbit', 'Saturn', 'a nebula and stars', 'a galaxy', 'asteroids in space', 'a moonscape', 'Earth',
  'Jupiter', 'Venus', 'a planet', 'abstract art, circles and triangles, red and blue', 'a mandala', 'mondrian',
  'stripes', 'a gradient', 'op-art', 'bauhaus', 'squares', 'portrait of a woman with red hair',
  'a man with a beard and glasses', 'a smiling girl with blonde hair', 'a boy', 'underwater coral reef with fish',
  'scuba diving on a reef with three fish', 'an aquarium at night', 'a rainbow over a meadow after the rain',
  'the northern lights over a frozen lake', 'lightning over the sea in a storm', 'a cactus in the desert at noon',
  'a palm tree on a beach', 'a palm-tree', 'a volcano erupting at night', 'a volcano by a lake', 'a waterfall',
  'a waterfall in a forest', 'a rainbow over a waterfall',
];

describe('the families: the panel prompts, every size, determinism', () => {
  it('reads and paints each of the twenty formerly-default panel prompts apart from the default meadow', () => {
    const nothing = read('nothing'), meadow = md5(at('nothing')), meadowSeeded = md5(at('nothing', 160, 90, 1));
    for (const p of PANEL.filter((q) => q !== 'nothing')) {
      const s = read(p);
      expect(without(s), p).not.toEqual(without(nothing));
      expect(md5(at(p)), p).not.toBe(meadow); // the words seed the picture: this guards only the identical-bytes bug
      expect(s.ignored.filter((w) => familyFor(w)), `${p}: a family's word left ignored`).toEqual([]);
    }
    for (const p of OURS) { // at one seed, so the scene and not the seed makes the difference
      const s = read(p);
      expect(s.family ?? s.things.rainbow, p).toBeTruthy();
      expect(md5(at(p, 160, 90, 1)), p).not.toBe(meadowSeeded);
    }
  });

  it('paints every family and landform at 160x90, 1x1 and 3x2 without throwing, in 0..1, the same bytes twice', () => {
    for (const p of FAMILY_PROMPTS) {
      for (const [w, h] of [[160, 90], [1, 1], [3, 2]] as const) {
        const a = at(p, w, h, 3), b = at(p, w, h, 3);
        expect(a.data.length, `${p} ${w}x${h}`).toBe(w * h * 3);
        let ok = true;
        for (const v of a.data) if (!(v >= 0 && v <= 1)) ok = false;
        expect(ok, `${p} ${w}x${h}: a value outside 0..1`).toBe(true);
        expect(md5(a), `${p} ${w}x${h}: not deterministic`).toBe(md5(b));
      }
    }
  });

  it('registers the families before the landscape, the landforms and phenomena after the six built-ins', () => {
    const ids = families.map((f) => f.id);
    expect(ids.slice(-1)).toEqual(['landscape']);
    expect(ids).toEqual(expect.arrayContaining(['space', 'abstract', 'portrait', 'underwater']));
    const thingIds = things.map((t) => t.id);
    // the vehicles register first (core.mjs's hoisted `export *`), then the five built-ins and ground-weather's
    // flowers; the landforms and phenomena come after every one of those
    const at = thingIds.indexOf('tree');
    expect(thingIds.slice(at, at + 6)).toEqual(['tree', 'building', 'house', 'boat', 'bird', 'flowers']);
    for (const id of ['cactus', 'palm', 'volcano', 'waterfall', 'rainbow', 'aurora', 'lightning']) {
      expect(thingIds.indexOf(id), id).toBeGreaterThan(at + 5);
    }
    const landscape = families[families.length - 1]!, names = landscape.passes.map((p) => p.name);
    expect(names.indexOf('phenomenaPass')).toBe(names.indexOf('cloudPass') + 1);
  });
});

describe('the reader with the families: honesty', () => {
  it('claims a family word, puts an unusable one back among the ignored in the prompt order, and says so', () => {
    const woman = read('portrait of a woman with red hair');
    expect(woman.family).toBe('portrait');
    expect(woman.ignored).toEqual([]);
    expect(woman.notes?.some((n) => n.includes('a stylised face, not a likeness of anyone'))).toBe(true);
    expect(report(woman).some((l) => l.startsWith('note: ') && l.includes('not a likeness'))).toBe(true);
    // 'person' is left to creatures-flyers: the reader's own test keeps it ignored beside a forklift (a vehicle now)
    const forklift = read('a white forklift in a warehouse yard at noon, a person standing beside it');
    expect(forklift.ignored).toEqual(['warehouse', 'yard', 'person', 'standing', 'beside']);
    expect(forklift.things.forklifts).toBe(1);
    expect(forklift.family).toBeUndefined();
    expect(read('a man beside a forklift').ignored).toEqual(['man', 'beside']); // in the prompt's order
    expect(read('the north face of the mountain').family).toBeUndefined();
    expect(read('the north face of the mountain').ignored).toEqual(['north', 'face']);
    expect(read('a woman').family).toBe('portrait'); // alone, a person word is a portrait
    expect(read('a woman by a lake')).toMatchObject({ ground: 'water', ignored: ['woman'] }); // a scene: not alone
    expect(read('portrait of a woman at night').family).toBe('portrait'); // a head word claims whatever the hour
    expect(read('circles over a lake')).toMatchObject({ ground: 'water', ignored: ['circles'] }); // a lake is a thing
    expect(read('a mandala over a lake').family).toBe('abstract'); // a head word claims whatever else is named
    expect(read('city lights at night').ignored).toEqual(['lights']);
    expect(read('city lights at night').things.aurora).toBeUndefined();
    expect(read('the northern lights').ignored).toEqual([]);
    expect(read('the northern lights').things.aurora).toBe(1);
    expect(read('fish in a lake').ignored).toEqual(['fish']); // fish proper belongs to creatures-flyers
    expect(read('a reef with fish').underwater?.fish).toBe(6);
    expect(read('three fish on a reef')).toMatchObject({ family: 'underwater', ignored: [] });
    expect(read('three fish on a reef').underwater?.fish).toBe(3);
  });

  it('keeps the hour honest: an aurora turns the time to night, a rainbow turns a night to day, and says so', () => {
    const aurora = read('the northern lights over a frozen lake');
    expect(aurora.time).toBe('night');
    expect(aurora.overridden).toContainEqual({ what: 'time', from: 'day', to: 'night', because: 'aurora' });
    const bow = read('a rainbow at night');
    expect(bow.time).toBe('day');
    expect(bow.overridden).toContainEqual({ what: 'time', from: 'night', to: 'day', because: 'rainbow' });
    expect(read('a rainbow over a meadow after the rain').overridden.some((o) => o.because === 'rainbow')).toBe(false);
    expect(read('lightning over the sea in a storm')).toMatchObject({ storm: true, things: { lightning: 1 } });
    expect(read('a cactus in the desert at noon')).toMatchObject({ ground: 'sand', hour: 12, things: { cactus: 1 } });
    expect(read('a cactus').ground).toBe('sand'); // a cactus stands on sand unless a land is named
    expect(read('cacti').things.cactus).toBe(0); // bare, the usual three (the reader's /s$/ test misses 'cacti')
    expect(read('two cacti').things.cactus).toBe(2);
    expect(read('cactuses').things.cactus).toBe(0);
    expect(read('one cactus').things.cactus).toBe(1);
    expect(read('a cactus in a meadow').ground).toBe('grass');
    expect(read('a volcano erupting at night')).toMatchObject({ erupting: true, time: 'night', ignored: [] });
    expect(read('Mars seen from orbit').space).toMatchObject({ body: 'mars', orbit: true });
    expect(read('Saturn and Jupiter').space?.body).toBe('jupiter'); // the last named
    expect(read('a nebula and stars')).toMatchObject({ family: 'space', time: 'night' });
    expect(read('abstract art, circles and triangles, red and blue').abstract?.kinds).toEqual(['disc', 'tri']);
  });
});

describe('the review of the package: what a word claims, what the report says, what the header lists', () => {
  it("'northern' alone is not the aurora and does not force night: only 'northern lights', aurora or borealis", () => {
    const forest = read('a cabin in the northern forest at noon');
    expect(forest).toMatchObject({ time: 'day', hour: 12, ignored: ['northern'] });
    expect(forest.things.aurora).toBeUndefined();
    expect(forest.things.houses).toBe(1);
    expect(forest.overridden.some((o) => o.because === 'aurora')).toBe(false);
    expect(read('a northern forest at noon')).toMatchObject({ time: 'day', ignored: ['northern'] });
    expect(read('a northern town at noon').things.aurora).toBeUndefined();
    for (const p of ['the northern lights', 'northern-lights over the sea', 'the aurora', 'aurora borealis']) {
      expect(read(p), p).toMatchObject({ time: 'night', ignored: [] });
      expect([0, 1], p).toContain(read(p).things.aurora); // 0 is the usual one ('aurora borealis': two mentions merged)
    }
  });

  it("a family picture's report claims no grass and no hills: 'no ground, no horizon' in their place", () => {
    for (const p of ['Saturn', 'Mars seen from orbit', 'a mandala', 'portrait of a woman with red hair']) {
      const scene = read(p), lines = report(scene), readAs = lines[0]!;
      expect(scene.things.hills, p).toBeUndefined();
      expect(scene.overridden.some((o) => o.what === 'hills'), p).toBe(false);
      expect(readAs, p).not.toMatch(/grass|hills/);
      expect(readAs, p).toContain(`${scene.family} family (no ground, no horizon)`);
      expect(lines.join('\n'), p).not.toMatch(/grass|hills/);
    }
    expect(report(read('underwater coral reef with fish'))[0]).toContain('underwater family (no sky, no horizon)');
    expect(report(read('a meadow'))[0]).toContain('hills (added to break the horizon)'); // a landscape still says so
  });

  it('everyday words claim a family only in company: earth, space, face, coral', () => {
    expect(read('the earth after rain')).toMatchObject({ ignored: ['earth'], ground: 'grass' });
    expect(read('the earth after rain').family).toBeUndefined();
    expect(read('the earth after rain').rain).toBeGreaterThan(0);
    expect(read('the earth from orbit')).toMatchObject({ family: 'space', ignored: [], space: { body: 'earth' } });
    expect(read('planet earth')).toMatchObject({ family: 'space', space: { body: 'earth' } });
    expect(read('Mars and the earth').space?.body).toBe('earth'); // the last body named
    expect(read('a parking space')).toMatchObject({ ignored: ['parking', 'space'], recognised: 0 });
    expect(read('a parking space').family).toBeUndefined();
    for (const p of ['space', 'outer space', 'deep space', 'space and stars', 'deep-space']) {
      expect(read(p), p).toMatchObject({ family: 'space', ignored: [] });
    }
    expect(read('a cliff face at sunset')).toMatchObject({ time: 'sunset', ignored: ['cliff', 'face'] });
    expect(read('a cliff face at sunset').family).toBeUndefined();
    expect(read('the rock face').family).toBeUndefined();
    expect(read('a face').family).toBe('portrait');
    expect(read('a coral sunset over the sea')).toMatchObject({ ground: 'water', time: 'sunset', ignored: ['coral'] });
    expect(read('a coral sunset over the sea').family).toBeUndefined();
    expect(read('coral pink sky at dusk')).toMatchObject({ ignored: ['coral'] });
    expect(read('coral pink sky at dusk').family).toBeUndefined();
    expect(read('a coral reef')).toMatchObject({ family: 'underwater', ignored: [] });
    expect(read('a diver among coral')).toMatchObject({ family: 'underwater', ignored: [] });
  });

  it('counts a family word as recognised only when its family kept it', () => {
    expect(read('fish in a lake').recognised).toBe(read('a lake').recognised);
    expect(read('city lights at night').recognised).toBe(read('a city at night').recognised);
    expect(read('circles over a lake').recognised).toBe(read('a lake').recognised);
    expect(read('circles and triangles, abstract').recognised).toBe(3); // undropped once abstract claims them
    expect(read('a woman by a lake').recognised).toBe(read('a lake').recognised);
    expect(read('a woman').recognised).toBe(1);
  });

  it('the critic sees a phenomenon its pass painted (no sprite pixels), and not one the hour kept out', () => {
    const bow = read('a rainbow over a meadow'), img = paint(bow, { width: 160, height: 90, seed: 7 });
    expect(img.layout.things.find((t) => t.kind === 'rainbow')?.visible).toBe(true);
    expect(bow.report?.visible?.rainbow).toEqual([1, 1]);
    const lights = read('the northern lights over a frozen lake');
    paint(lights, { width: 160, height: 90, seed: 7 });
    expect(lights.report?.visible?.aurora).toEqual([1, 1]);
  });

  it('the waterfall sits in the land: a rock bank either side of its foot, not meadow up to the cliff', () => {
    const W = 320, H = 180, img = paint(read('a waterfall'), { width: W, height: H, seed: 7 }), d = img.data;
    const t = img.layout.things.find((t) => t.kind === 'waterfall')!;
    const green = (x: number, y: number) => {
      const i = ((y | 0) * W + (x | 0)) * 3;
      return d[i + 1]! / (d[i]! + d[i + 1]! + d[i + 2]!);
    };
    const row = t.y + t.h - 3 - 0.03 * t.h; // just above the pool's foot
    const meadow = Math.min(green(W * 0.03, row), green(W * 0.97, row)); // the grass at the frame's edges
    expect(meadow).toBeGreaterThan(0.39); // grass: 0.40-0.43 green share
    expect(green(t.x - 0.15 * t.w, row)).toBeLessThan(0.36); // the bank's rock: 0.335
    expect(green(t.x + 1.15 * t.w, row)).toBeLessThan(0.36);
    expect(t.visible).toBe(true);
  });

  it("the header (the --help text) lists every family word, every landform and phenomenon word", () => {
    const src = readFileSync(fileURLToPath(new URL('../../tools/image.mjs', import.meta.url)), 'utf8');
    const header = [];
    for (const line of src.split('\n').slice(1)) {
      if (!line.startsWith('//')) break;
      header.push(line.slice(3));
    }
    const text = header.join('\n').toLowerCase().replace(/-/g, '');
    expect(text).toContain('portrait');
    expect(text).toContain('rainbow');
    const alternatives = (re: RegExp) => re.source.replace(/^\^\(?/, '').replace(/\)?\$$/, '').split('|');
    const listed = (alt: string) => {
      const word = alt.replace(/[?()]/g, '').replace(/-/g, '');
      return [word, word.replace(/s$/, ''), word.replace(/es$/, '')].some((w) => text.includes(w));
    };
    const missing: string[] = [];
    for (const f of families) {
      if (!(f.words instanceof RegExp)) continue;
      for (const alt of alternatives(f.words)) if (!listed(alt)) missing.push(`${f.id}: ${alt}`);
    }
    const mine = ['cactus', 'palm', 'volcano', 'waterfall', 'rainbow', 'aurora', 'lightning'];
    for (const t of things.filter((t) => mine.includes(t.id))) {
      for (const alt of alternatives(t.match)) if (!listed(alt)) missing.push(`${t.id}: ${alt}`);
    }
    for (const w of ['erupting', 'northern lights', 'saguaro', 'coconut']) if (!text.includes(w)) missing.push(w);
    expect(missing).toEqual([]);
  });
});

describe('what the families paint, measured on the pixels', () => {
  const W = 320, H = 180;
  const big = (p: string, seed = 2) => paint(read(p), { width: W, height: H, seed });

  it('Mars from orbit: black star sky, no horizon, a red-orange surface, a curved limb, a day-night gradient', () => {
    const img = big('Mars seen from orbit'), { data } = img;
    expect(img.layout.horizon).toBeNull();
    expect(img.layout.planet).toMatchObject({ body: 'mars', orbit: true });
    expect(share(img, (r, g, b) => lum([r, g, b] as unknown as Float32Array, 0) < 0.12, 0, 0.2)).toBeGreaterThan(0.9);
    let stars = 0;
    for (let y = 0; y < H * 0.5; y++) for (let x = 0; x < W; x++) if (lum(data, (y * W + x) * 3) > 0.6) stars++;
    expect(stars).toBeGreaterThan(20);
    expect(share(img, (r, g, b) => r > 0.3 && r > 1.3 * g && r > 2 * b)).toBeGreaterThan(0.04);
    const firstLit = (x: number) => { // the limb: the first row down a column from which six rows in a row are
      for (let y = 0; y + 6 <= H; y++) { // not the black sky (a bright star's glow is two or three rows)
        if ([0, 1, 2, 3, 4, 5].every((k) => lum(data, ((y + k) * W + x) * 3) > 0.15)) return y;
      }
      return H;
    };
    expect(firstLit(W >> 1)).toBeLessThan(firstLit(2)); // higher in the middle: a curve
    expect(firstLit(W >> 1)).toBeGreaterThan(H * 0.5); // across the bottom third
    const row = Math.floor(H * 0.9), lums = [];
    for (let x = 0; x < W; x += 4) lums.push(lum(data, (row * W + x) * 3));
    expect(Math.max(...lums) / Math.max(0.01, Math.min(...lums))).toBeGreaterThan(2.5); // a terminator's gradient
  });

  it('Saturn has rings beside the disc; a nebula is coloured cloud over the stars; a galaxy, asteroids, moons', () => {
    const img = big('Saturn'), { data } = img, p = img.layout.planet!;
    expect(p.rings).not.toBeNull();
    const cx = p.cx * W, cy = p.cy * H, R = p.r * Math.min(W, H);
    const ringX = Math.round(cx + 1.75 * R), skyX = Math.round(cx + 2.6 * R);
    expect(ringX).toBeLessThan(W);
    expect(lum(data, (Math.round(cy) * W + ringX) * 3)).toBeGreaterThan(0.12);
    if (skyX < W) expect(lum(data, (Math.round(cy) * W + skyX) * 3)).toBeLessThan(0.1);
    const nebula = big('a nebula and stars');
    expect(share(nebula, (r, g, b) => Math.max(r, g, b) - Math.min(r, g, b) > 0.12 && Math.max(r, g, b) > 0.1))
      .toBeGreaterThan(0.08);
    expect(big('a galaxy').layout.family).toBe('space');
    expect(big('asteroids in space').layout.planet).toBeNull();
    const jupiter = big('Jupiter and its moons');
    expect(jupiter.layout.moons).toBeGreaterThanOrEqual(2);
    expect(read('Jupiter and its moons').ignored).toEqual([]);
  });

  it('abstract: red and blue shapes on a plain field with no horizon; a mandala has rotational symmetry', () => {
    const img = big('abstract art, circles and triangles, red and blue');
    expect(img.layout.horizon).toBeNull();
    expect(share(img, (r, g, b) => r > 0.5 && g < 0.35 && b < 0.35)).toBeGreaterThan(0.02);
    expect(share(img, (r, g, b) => b > 0.5 && r < 0.4)).toBeGreaterThan(0.02);
    const m = big('a mandala'), n = m.layout.mandala!.n, R = m.layout.mandala!.r * Math.min(W, H);
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(12);
    let same = 0, total = 0;
    for (let k = 0; k < 400; k++) {
      const r = R * (0.1 + 0.8 * ((k * 0.618) % 1)), th = k * 2.399;
      const a = lum(m.data, (Math.round(H / 2 + Math.sin(th) * r) * W + Math.round(W / 2 + Math.cos(th) * r)) * 3);
      const th2 = th + (2 * Math.PI) / n;
      const b = lum(m.data, (Math.round(H / 2 + Math.sin(th2) * r) * W + Math.round(W / 2 + Math.cos(th2) * r)) * 3);
      total++;
      if (Math.abs(a - b) < 0.1) same++;
    }
    expect(same / total).toBeGreaterThan(0.85);
  });

  it('portrait: a centred head with red hair over it, the note in the report', () => {
    const img = big('portrait of a woman with red hair'), f = img.layout.face!;
    expect(f.cx).toBe(0.5);
    expect(f.hair).toBe('red');
    const hairRows = [f.cy - f.h * 0.5, f.cy - f.h * 0.2] as const; // above the eye line, the hair over the brow
    expect(share(img, (r, g, b) => r > 0.3 && r > 1.5 * g && r > 2 * b, hairRows[0], hairRows[1]))
      .toBeGreaterThan(0.1);
    expect(img.layout.horizon).toBeNull();
    const man = big('a man with a beard and glasses');
    expect(man.layout.face!.hair).toBe('seeded');
  });

  it('underwater: blue water, rays, coral, fish, bubbles; the fish count from the words', () => {
    const img = big('underwater coral reef with fish'), { data } = img;
    expect(img.layout.horizon).toBeNull();
    let r = 0, b = 0;
    for (let i = 0; i < W * H * 0.3 * 3; i += 3) {
      r += data[i]!;
      b += data[i + 2]!;
    }
    expect(b).toBeGreaterThan(r * 2); // blue over red in the top third
    expect(img.layout.fish!.length).toBe(6);
    expect(img.layout.bubbles).toBeGreaterThan(0);
    expect(img.layout.corals).toBeGreaterThan(0);
    expect(share(img, (r_, g, b_) => r_ > 0.45 && r_ > 1.5 * b_ && g < 0.6, 0.7, 1)).toBeGreaterThan(0.003); // coral
    expect(big('scuba diving on a reef with three fish').layout.fish!.length).toBe(3);
    expect(read('a diver among coral'))
      .toMatchObject({ family: 'underwater', ignored: [], underwater: { diver: true } });
  });

  it('a rainbow: an arc of several hues above the horizon, in the layout as a thing', () => {
    const img = big('a rainbow over a meadow after the rain'), hy = img.layout.horizon! * H;
    const bow = img.layout.things.find((t) => t.kind === 'rainbow')!;
    expect(bow.w).toBeGreaterThan(W * 0.3);
    const bins = new Set<number>();
    for (let y = 0; y < hy; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 3, r = img.data[i]!, g = img.data[i + 1]!, b = img.data[i + 2]!;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx - mn < 0.25 || mx < 0.3) continue;
        const h = mx === r ? ((g - b) / (mx - mn) + 6) % 6
          : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
        bins.add(Math.floor(h));
      }
    }
    expect(bins.size).toBeGreaterThanOrEqual(4); // the sky is one hue; the bow brings red, yellow, green, violet
  });

  it('the northern lights: green curtains in the upper sky at night; lightning: a white fork under the storm', () => {
    const img = big('the northern lights over a frozen lake');
    expect(read('the northern lights over a frozen lake').time).toBe('night');
    expect(share(img, (r, g, b) => g > 0.2 && g > 1.3 * r && g > 1.1 * b, 0, 0.5)).toBeGreaterThan(0.01);
    expect(img.layout.things.find((t) => t.kind === 'aurora')!.w).toBe(W);
    const storm = big('lightning over the sea in a storm');
    const fork = storm.layout.things.find((t) => t.kind === 'lightning')!;
    expect(fork.h).toBeGreaterThan(H * 0.2);
    let bright = 0, top = H, bottom = 0;
    for (let y = 0; y < storm.layout.horizon! * H; y++) {
      for (let x = 0; x < W; x++) {
        if (lum(storm.data, (y * W + x) * 3) > 0.85) {
          bright++;
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    expect(bright).toBeGreaterThan(20);
    expect(bottom - top).toBeGreaterThan(H * 0.2);
  });

  it('landforms: three saguaros on sand at noon, a palm on the beach, a cone on the horizon, a white column', () => {
    const cacti = big('a cactus in the desert at noon');
    expect(kinds(cacti).filter((k) => k === 'cactus').length).toBe(1); // 'a cactus' is one (the condition's count)
    for (const t of cacti.layout.things) expect(t.h / t.w, 'taller than wide').toBeGreaterThan(1.2);
    expect(share(cacti, (r, g, b) => g > 0.3 && g > r * 1.1 && g > b * 1.3, 0.3, 0.9)).toBeGreaterThan(0.002);
    expect(kinds(big('three cacti')).filter((k) => k === 'cactus').length).toBe(3);
    const palm = big('a palm tree on a beach');
    expect(palm.layout.palms).toBe(1);
    expect(kinds(palm)).toContain('tree');
    expect(big('a palm-tree').layout.palms).toBe(1);
    expect(kinds(big('a palm-tree'))).toContain('palm');
    const volcano = big('a volcano erupting at night'), hy = volcano.layout.horizon! * H;
    const cone = volcano.layout.things.find((t) => t.kind === 'volcano')!;
    expect(cone.y).toBeLessThan(hy);
    expect(cone.y + cone.h).toBeGreaterThanOrEqual(hy - 2); // its foot on the horizon
    let glow = 0;
    for (let y = Math.max(0, cone.y) | 0; y < Math.min(H, cone.y + cone.h * 0.6); y++) {
      for (let x = Math.max(0, cone.x) | 0; x < Math.min(W, cone.x + cone.w); x++) {
        const i = (y * W + x) * 3;
        if (volcano.data[i]! > 0.45 && volcano.data[i]! > 1.5 * volcano.data[i + 1]!) glow++;
      }
    }
    expect(glow).toBeGreaterThan(5);
    const falls = big('a waterfall'), box = falls.layout.things.find((t) => t.kind === 'waterfall')!;
    let white = 0, area = 0;
    for (let y = Math.max(0, box.y) | 0; y < Math.min(H, box.y + box.h); y++) {
      for (let x = Math.max(0, box.x) | 0; x < Math.min(W, box.x + box.w); x++) {
        const i = (y * W + x) * 3, mx = Math.max(falls.data[i]!, falls.data[i + 1]!, falls.data[i + 2]!);
        area++;
        const mn = Math.min(falls.data[i]!, falls.data[i + 1]!, falls.data[i + 2]!);
        if (lum(falls.data, i) > 0.65 && mx - mn < 0.2) white++;
      }
    }
    expect(white / area).toBeGreaterThan(0.03); // the column, a fifth of the cliff's width
    expect(kinds(big('a waterfall in a forest'))).toContain('waterfall');
  });
});

describe('the landscape family as it was', () => {
  it('paints the four header prompts with the same layout.things and the same bytes as without the package', () => {
    const HEADERS = [
      'a red go-kart on a wet road at dusk, mountains behind', 'three pine trees by a lake under a full moon, snow',
      'a city skyline at night in the rain', 'a cabin in a foggy forest at dawn',
    ];
    const mine = ['cactus', 'palm', 'volcano', 'waterfall', 'rainbow', 'aurora', 'lightning'];
    const landscape = families[families.length - 1]!, passes = landscape.passes;
    const withPackage = HEADERS.map((p) => at(p, 160, 90, 7));
    const removed = things.filter((t) => mine.includes(t.id));
    for (const t of removed) things.splice(things.indexOf(t), 1);
    landscape.passes = passes.filter((p) => p.name !== 'phenomenaPass');
    let base: Image[];
    try {
      base = HEADERS.map((p) => at(p, 160, 90, 7));
    } finally {
      landscape.passes = passes;
      things.push(...removed);
    }
    HEADERS.forEach((p, i) => {
      expect(withPackage[i]!.layout.things, p).toEqual(base[i]!.layout.things);
      expect(md5(withPackage[i]!), p).toBe(md5(base[i]!));
    });
  });
});
