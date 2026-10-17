// structures-skyline: houses by kind in three-quarter view, towers, the city's skyline, and the built things
// (lighthouse, rocks, windmill, castle, church, bridge, tent, campfire, fence, streetlamp, pole, bench) from
// tools/image/things/structures.mjs: read by their words, keyed as before, drawn at any depth and heading without
// throwing, the beam only at night or in a storm, the skyline dense, the night dark, deterministic and fast.
import { describe, expect, it } from 'vitest';
import type { Ctx, Heading, Image, Scene, ThingInstance } from '../../tools/image.mjs';
import {
  BUILDING_THING, HOUSES, HOUSE_THING, STRUCTURES, STRUCTURE_THINGS, citySkyline, families, houseKind, paint, png,
  read, register, things,
} from '../../tools/image.mjs';

const HEADINGS: Heading[] = ['side', 'away'];
const CITY = 'a city skyline at night in the rain';

/** Paints the landscape up to and including the ground, then stops, handing back the context to draw on. */
function ground(prompt: string, width = 320, height = 180, seed = 3) {
  let ctx: Ctx | null = null;
  const land = families.find((f) => f.id === 'landscape')!;
  const at = land.passes.findIndex((p) => p.name === 'groundPass');
  const passes = [...land.passes.slice(0, at + 1), (c: Ctx) => { ctx = c; }];
  register('families', { id: 'landscape', detect: land.detect, passes });
  try {
    const img = paint(read(prompt), { width, height, seed });
    return { img, ctx: ctx! as Ctx };
  } finally {
    register('families', land);
  }
}
/** The luminance of a pixel. */
const lum = (d: Float32Array, i: number) => d[i]! * 0.2126 + d[i + 1]! * 0.7152 + d[i + 2]! * 0.0722;

describe('the reader knows every structure by its words, keyed as before', () => {
  it('keeps houses and buildings as the keys in scene.things, through the registered rows', () => {
    expect(read('a cabin in a foggy forest at dawn').things).toEqual({ houses: 1, trees: 9, hills: 2 });
    expect(read('a farmhouse by a dirt road').instances[0]).toMatchObject({ kind: 'houses', word: 'farmhouse' });
    expect(read(CITY).things).toEqual({ buildings: 11 });
    expect(read('four buildings').things).toEqual({ buildings: 4 });
    expect(read('a village at dusk').things.houses).toBe(6);
    expect(things.find((t) => t.id === 'house')).toBe(HOUSE_THING);
    expect(things.find((t) => t.id === 'building')).toBe(BUILDING_THING);
    const ids = things.map((t) => t.id), at = ids.indexOf('tree');
    expect(ids.slice(at, at + 5)).toEqual(['tree', 'building', 'house', 'boat', 'flowers']); // the order holds
    for (const e of STRUCTURE_THINGS) expect(ids.indexOf(e.id), e.id).toBeGreaterThan(at + 4); // the bird is creatures'
  });

  it('reads every new kind with nothing ignored', () => {
    const cases: [string, Record<string, number>][] = [
      ['a lighthouse on a rocky coast in a storm', { lighthouse: 1, rocks: 1 }],
      ['a windmill in a tulip field', { windmill: 1, flowers: 1, hills: 2 }], // a tulip: the flowers thing, one
      ['a castle on a hill', { castle: 1, hills: 1 }],
      ['a bridge over a river', { bridge: 1 }],
      ['a campfire and a tent under the stars', { campfire: 1, tent: 1, stars: 1, hills: 2 }],
      ['a church in a village at dusk', { church: 1, houses: 6, hills: 2 }],
      ['a chapel', { church: 1, hills: 2 }],
      ['a fence and a bench in a meadow, telegraph poles along a road', { fence: 1, bench: 1, pole: 5, hills: 2 }],
      ['boulders in a meadow', { rocks: 4, hills: 2 }],
      ['three streetlamps', { streetlamp: 3, hills: 2 }],
    ];
    for (const [prompt, want] of cases) {
      const s = read(prompt);
      expect(s.things, prompt).toEqual(want);
      expect(s.ignored, prompt).toEqual([]);
    }
  });

  it('brings the readings that come with the words: a coast, a shore for the rocks, a street\'s lamps', () => {
    const coast = read('a lighthouse on a rocky coast in a storm');
    expect([coast.ground, coast.beach, coast.storm, coast.land]).toEqual(['water', true, true, 'sand']);
    const alone = read('a lighthouse');
    expect([alone.ground, alone.beach]).toEqual(['water', true]);
    expect(alone.overridden).toContainEqual({ what: 'ground', from: 'grass', to: 'water', because: 'lighthouse' });
    expect(read('a lighthouse by a lake').overridden.some((o) => o.because === 'lighthouse')).toBe(false);
    const street = read('a busy street with cars');
    expect(street.things).toEqual({ cars: 2, buildings: 11, streetlamp: 4 });
    expect(street.ignored).toEqual(['busy']);
    expect(read('a dragon over a castle').ignored).toEqual([]); // the dragon is creatures-flyers'
    expect(houseKind('cabin')).toBe('cabin');
    expect(houseKind('log cabin')).toBe('cabin');
    expect(houseKind('farmhouse')).toBe('farmhouse');
    expect(houseKind('cottage')).toBe('house'); // the cottage is drawn as the house (its thatch did not read)
    expect(houseKind('house')).toBe('house');
    expect(houseKind('village')).toBe('house');
    expect(Object.keys(HOUSES)).toEqual(['house', 'cabin', 'farmhouse']);
  });

  it('does not read a bare fire, pole, lamp, mill, rock or town as a structure; reads the two-word names', () => {
    const none: [string, string[]][] = [
      ['a forest fire at night', ['fire']], ['a house on fire', ['fire']], ['a lamp on a table', ['lamp', 'table']],
      ['a paper mill', ['paper', 'mill']], ['a rock concert', ['rock', 'concert']],
      ['a penguin at the north pole', ['penguin', 'north', 'pole']],
    ];
    const kinds = STRUCTURE_THINGS.map((e) => e.id);
    for (const [prompt, ignored] of none) {
      const s = read(prompt);
      expect(s.ignored, prompt).toEqual(ignored);
      expect(Object.keys(s.things).filter((k) => kinds.includes(k)), prompt).toEqual([]);
    }
    expect(read('telegraph poles along a road').things).toMatchObject({ pole: 5 });
    expect(read('utility poles').things).toMatchObject({ pole: 5 });
    expect(read('lamp posts in the fog').things).toMatchObject({ streetlamp: 4 });
    const lamps = read('street lamps at night'); // the lamps, and the street they stand on
    expect([lamps.things.streetlamp, lamps.things.buildings, lamps.road, lamps.ignored]).toEqual([4, 11, true, []]);
    expect(read('a windmill').things.windmill).toBe(1);
    expect(read('a bonfire on the beach').things.campfire).toBe(1);
    expect(read('pylons across a field').things.pole).toBe(5);
    const town = read('a small town in the hills at dusk'); // a town is the usual buildings, not a city's skyline
    expect(town.things).toEqual({ buildings: 11, hills: 2 });
    expect(citySkyline(town)).toBe(false);
    expect(paint(town, { width: 160, height: 90, seed: 7 }).layout.skyline).toBeUndefined();
  });

  it('says a city when the buildings are the usual or a city word, not for a harbour\'s four', () => {
    expect(citySkyline(read(CITY))).toBe(true);
    expect(citySkyline(read('a busy street with cars'))).toBe(true);
    expect(citySkyline(read('the town at dusk'))).toBe(false); // a town: the usual eleven, no skyline
    expect(citySkyline(read('watercolour of a harbour'))).toBe(false);
    expect(citySkyline(read('four buildings'))).toBe(false);
    expect(citySkyline(read('a quiet meadow'))).toBe(false);
  });
});

describe('the tables', () => {
  it('hold every house kind to the cabin envelope the placement frames, and cite a source per row', () => {
    for (const [kind, row] of Object.entries(HOUSES)) {
      expect(row.wall + row.rise, kind).toBeCloseTo(HOUSE_THING.size!.h, 6);
      expect(row.source.length, kind).toBeGreaterThan(10);
    }
    for (const [kind, row] of Object.entries(STRUCTURES)) expect(row.source.length, kind).toBeGreaterThan(10);
    expect(STRUCTURES.lighthouse.h).toBe(30);
    expect(STRUCTURES.windmill.sail).toBe(24);
    for (const e of STRUCTURE_THINGS) {
      expect(e.size!.w > 0 && e.size!.h > 0 && e.match instanceof RegExp, e.id).toBe(true);
    }
  });
});

describe('the drawers in the world', () => {
  const kinds = ['house', 'building', ...STRUCTURE_THINGS.map((e) => e.id)];
  const words: Record<string, string[]> = {
    house: ['house', 'cabin', 'cottage', 'farmhouse', 'village'], building: ['building'], rocks: ['rocks', 'cliffs'],
    church: ['church', 'chapel'],
  };

  it('draws every kind at three depths and two headings without throwing, with a finite box in the frame', () => {
    const scenes = ['a meadow at noon', 'a meadow at night', 'a beach in a storm', 'a road at dusk'];
    for (const prompt of scenes) {
      const { ctx } = ground(prompt, 320, 180, 5), H = ctx.H, hy = ctx.hy;
      for (const kind of kinds) {
        const entry = things.find((t) => t.id === kind)!;
        for (const word of words[kind] ?? [kind]) {
          for (const u of [0.2, 0.5, 0.9]) {
            for (const heading of HEADINGS) {
              const fy = hy + (H - hy) * u, zm = ctx.groundZ(fy);
              const inst: ThingInstance = {
                ux: 0.3 + u * 0.4, fy, zm, xm: ctx.groundX((0.3 + u * 0.4) * 320, fy), heading,
                instance: { kind, count: 1, size: 1, modifiers: [], word, index: 0 },
              };
              const tag = `${kind} (${word}) in ${prompt} at ${u} ${heading}`;
              const id = ctx.tops.length, box = ctx.sprite(zm, () => entry.draw(ctx, inst));
              expect(Number.isFinite(box.x) && Number.isFinite(box.y) && box.w > 0 && box.h > 0, tag).toBe(true);
              let owned = 0; // the sprite wrote its id where it painted solidly: a drawer that paints nothing fails
              for (const v of ctx.owner!) if (v === id) owned++;
              if (u <= 0.5) expect(owned, `${tag}: paints nothing`).toBeGreaterThan(0); // 0.9 is inside the near plane
              // a thing that stands itself at the kerb of a road may stand outside a frame this near
              const inFrame = box.x < 320 && box.x + box.w > 0 && box.y < 180;
              if (!ctx.scene.road || !box.stood) expect(inFrame, tag).toBe(true);
            }
          }
        }
      }
      for (const v of ctx.data) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('draws a far-bank house and a tiny and a huge one', () => {
    const lake = paint(read('a house by a lake at sunset'), { width: 640, height: 360, seed: 3 });
    const far = lake.layout.things.find((t) => t.kind === 'house')!;
    expect(far.y + far.h).toBeLessThan(lake.layout.horizon * 360);
    expect(far.h / 360).toBeGreaterThanOrEqual(0.12);
    const tiny = paint(read('a tiny cabin, huge mountains'), { width: 320, height: 180, seed: 7 });
    const huge = paint(read('a huge cabin, huge mountains'), { width: 320, height: 180, seed: 7 });
    const h = (img: Image) => img.layout.things.find((t) => t.kind === 'house')!.h;
    expect(h(huge) / h(tiny)).toBeGreaterThan(2);
  });

  it('paints the blue house blue on its walls, the cabin in log brown, the farmhouse red', () => {
    const wall = (prompt: string) => { // the mean colour of the lower middle of the house's box: mostly wall
      const img = paint(read(prompt), { width: 480, height: 270, seed: 7 });
      const t = img.layout.things.find((o) => o.kind === 'house')!, mean = [0, 0, 0];
      let n = 0;
      for (let y = Math.round(t.y + t.h * 0.55); y < t.y + t.h * 0.95; y++) {
        for (let x = Math.round(t.x + t.w * 0.2); x < t.x + t.w * 0.8; x++) {
          const i = (y * 480 + x) * 3;
          mean[0] += img.data[i]!;
          mean[1] += img.data[i + 1]!;
          mean[2] += img.data[i + 2]!;
          n++;
        }
      }
      return mean.map((v) => v / n);
    };
    const blue = wall('a blue house on the beach');
    expect(blue[2]).toBeGreaterThan(blue[0]);
    const log = wall('a cabin in a meadow at noon');
    expect(log[0]).toBeGreaterThan(log[2] * 1.3); // brown: red over blue
    const barn = wall('a farmhouse by a dirt road');
    expect(barn[0]).toBeGreaterThan(barn[1] * 1.4); // barn red
  });
});

describe('the lighthouse', () => {
  it('lights its beam at night or in a storm only, and stands in the water on its rock', () => {
    const beam = (prompt: string) => paint(read(prompt), { width: 320, height: 180, seed: 2 }).layout.lighthouse!.beam;
    expect(beam('a lighthouse on a rocky coast at noon')).toBe(false);
    expect(beam('a lighthouse on a rocky coast at night')).toBe(true);
    expect(beam('a lighthouse on a rocky coast in a storm')).toBe(true);
    const img = paint(read('a lighthouse on a rocky coast in a storm'), { width: 480, height: 270, seed: 7 });
    const t = img.layout.things.find((o) => o.kind === 'lighthouse')!;
    expect(t.visible).toBe(true);
    expect(t.h / 270).toBeGreaterThan(0.3); // a lighthouse one can see
    // off the near shore at the end of a reef running out from it: the box reaches the shore's band, no farther
    expect(img.layout.lighthouse!.headland).toBe(true);
    expect(t.y + t.h).toBeGreaterThan(img.layout.horizon * 270 + 4);
    expect(t.y + t.h).toBeLessThan((img.layout.shore! + 0.1) * 270 + 2);
    const lake = paint(read('a lighthouse by a lake at noon'), { width: 480, height: 270, seed: 7 });
    expect(lake.layout.shore).not.toBeNull(); // a lighthouse brings the lake a shore (of grass)
    expect(lake.layout.lighthouse!.headland).toBe(true);
    expect(STRUCTURES.lighthouse.rock.h).toBeGreaterThanOrEqual(5); // a rock mass that reads at 100 m and more
  });

  it('keeps the skyline\'s silhouettes under a named ridge, so the hills or mountains asked for show', () => {
    const img = paint(read('a city in the mountains'), { width: 640, height: 360, seed: 7 });
    const { skyline, ranges, horizon } = img.layout, hy = horizon * 360;
    expect(skyline!.under).toBe('mountains');
    const ridge = (x: number) => Math.min(hy, ...ranges!.map((g) => g.top[x]!));
    for (const t of skyline!.towers) {
      let low = 0;
      for (let x = Math.max(0, t.x); x < Math.min(640, t.x + t.w); x++) low = Math.max(low, ridge(x));
      expect(t.y, `tower at ${t.x}`).toBeGreaterThanOrEqual(low + 0.012 * 360 - 1.01);
    }
    expect(paint(read('a city'), { width: 320, height: 180, seed: 7 }).layout.skyline!.under).toBeNull();
  });

  it('counts a kerb tower seen when what the next one leaves of it still spans rows and columns', () => {
    const img = paint(read('a busy street with cars'), { width: 640, height: 360, seed: 7 });
    const [seen, asked] = img.layout.things.length ? img.layout.things[0]!.kind && (() => {
      const t = img.layout.things.filter((o) => o.kind === 'building');
      return [t.filter((o) => o.visible).length, t.length];
    })() : [0, 0];
    expect(asked).toBe(11);
    expect(seen).toBeGreaterThanOrEqual(5); // six or more blocks are plainly in the picture; 2/11 was the old count
  });
});

describe('the skyline', () => {
  it('draws 25 to 40 adjoining silhouettes across the full width for a city, none for a meadow', () => {
    const city = paint(read('a city'), { width: 640, height: 360, seed: 7 }).layout.skyline!;
    expect(city.count).toBeGreaterThanOrEqual(25);
    expect(city.count).toBeLessThanOrEqual(40);
    expect(city.towers.length).toBe(city.count);
    const covered = new Uint8Array(640);
    for (const t of city.towers) for (let x = Math.max(0, t.x); x < Math.min(640, t.x + t.w); x++) covered[x] = 1;
    expect(covered.every((v) => v === 1)).toBe(true); // unbroken across the horizon
    expect(paint(read('a quiet meadow'), { width: 160, height: 90 }).layout.skyline).toBeUndefined();
    expect(paint(read('watercolour of a harbour'), { width: 160, height: 90 }).layout.skyline).toBeUndefined();
  });

  it('glows warm over the horizon at night and keeps the night dark; the glow is in the wet pavement', () => {
    const img = paint(read(CITY), { width: 640, height: 360, seed: 7 }), hy = img.layout.horizon * 360;
    expect(img.layout.skyline!.glow).toBe(true);
    expect(img.layout.skyline!.lamps).toBeGreaterThan(20);
    const open = (x: number, y: number) => !img.layout.things.some((t) => x >= t.x && x < t.x + t.w && y >= t.y);
    const row = (y: number) => { // the open sky of the row: the towers (0.5 H tall here) are not the sky's glow
      let r = 0, g = 0, b = 0, n = 0;
      for (let x = 0; x < 640; x++) {
        if (!open(x, y)) continue;
        const i = (Math.round(y) * 640 + x) * 3;
        r += img.data[i]!;
        g += img.data[i + 1]!;
        b += img.data[i + 2]!;
        n++;
      }
      expect(n, `open sky columns at row ${y}`).toBeGreaterThan(20);
      return [r / n, g / n, b / n];
    };
    const near = row(hy - 0.26 * 360), high = row(30); // just over the silhouettes, and the top of the sky
    expect(near[0]).toBeGreaterThan(high[0] + 0.03); // warmer and brighter than the sky above
    expect(near[0] - near[2]).toBeGreaterThan(high[0] - high[2]);
    let top = 0;
    for (let y = 0; y < 60; y++) for (let x = 0; x < 640; x++) top += lum(img.data, (y * 640 + x) * 3);
    expect(top / (60 * 640)).toBeLessThan(0.12); // the night stays dark
    const day = paint(read('a city skyline at noon'), { width: 160, height: 90 }).layout.skyline!;
    expect(day.glow).toBe(false);
    expect(day.lamps).toBe(0);
  });

  it('stands the usual buildings of a street along both kerbs and says where they stood', () => {
    let ctx: Ctx | null = null;
    const fam = families.find((f) => f.id === 'landscape')!;
    register('families', { ...fam, passes: [(c: Ctx) => { ctx = c; }, ...fam.passes] });
    let img: Image;
    try {
      img = paint(read('a busy street with cars'), { width: 640, height: 360, seed: 7 });
    } finally {
      register('families', fam);
    }
    const c = ctx! as Ctx, centre = (t: { y: number; h: number }) => c.groundX(c.roadX!(t.y + t.h), t.y + t.h);
    const towers = img.layout.things.filter((t) => t.kind === 'building');
    expect(towers.length).toBe(11);
    const sides = new Set(towers.map((t) => Math.sign(t.stood!.xm - centre(t))));
    expect(sides).toEqual(new Set([-1, 1]));
    for (const t of towers) expect(Math.abs(t.stood!.xm - centre(t))).toBeGreaterThan(4.5); // off the carriageway
    const lamps = img.layout.things.filter((t) => t.kind === 'streetlamp');
    expect(lamps.length).toBe(4);
    for (const l of lamps) expect(Math.abs(l.stood!.xm - centre(l))).toBeLessThan(6); // at the kerb
  });
});

describe('on the ridge, in the water', () => {
  it('stands the castle on the hills\' ridge and the bridge in the river\'s band', () => {
    const castle = paint(read('a castle on a hill'), { width: 480, height: 270, seed: 7 });
    const c = castle.layout.things.find((t) => t.kind === 'castle')!;
    expect(c.y + c.h).toBeLessThan(castle.layout.horizon * 270 + 4); // its foot on the ridge, over the horizon
    expect(c.visible).toBe(true);
    const river = paint(read('a bridge over a river'), { width: 480, height: 270, seed: 7 });
    const b = river.layout.things.find((t) => t.kind === 'bridge')!, H = 270;
    expect(b.y + b.h).toBeGreaterThan(river.layout.farShore! * H);
    expect(b.y + b.h).toBeLessThan(river.layout.shore! * H);
    expect(b.stood).toBeDefined();
    expect(b.w / 480).toBeLessThan(0.8);
  });
});

describe('determinism and speed', () => {
  it('paints the same words into the same bytes, at 960x540 under 1.5 s (median of 3)', () => {
    for (const p of [CITY, 'a castle on a hill', 'a lighthouse on a rocky coast in a storm']) {
      const once = png(paint(read(p), { width: 160, height: 90, seed: 4 }));
      const twice = png(paint(read(p), { width: 160, height: 90, seed: 4 }));
      expect(once.equals(twice), p).toBe(true);
    }
    const scene: Scene = read(CITY), times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      paint(scene, { width: 960, height: 540, seed: 7 });
      times.push(performance.now() - t0);
    }
    const median = times.sort((x, y) => x - y)[1]!;
    expect(median, `960x540 took ${median.toFixed(0)} ms`).toBeLessThan(1500);
  });
});
