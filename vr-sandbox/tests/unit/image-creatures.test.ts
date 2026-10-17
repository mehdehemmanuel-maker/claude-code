// creatures-flyers: animals, people, flyers, birds and sea creatures from tools/image/things/creatures.mjs, each a
// row in metres drawn by one rule, read by its words, placed by the shared instance fields, a person the scale a
// car is read against, the birds varied, the night dark, deterministic and fast.
import { describe, expect, it } from 'vitest';
import type { Ctx, Image, Scene, ThingInstance } from '../../tools/image.mjs';
import {
  BIRDS, CREATURES, CREATURE_THINGS, FIGURE, FLYERS, SIZES, SWIMMERS, bird, creature, families, figure, paint, png,
  read, register, swimmer, things,
} from '../../tools/image.mjs';

type CreatureKind = keyof typeof CREATURES;
const KINDS = Object.keys(CREATURES) as CreatureKind[];
const FLYER_IDS = ['airplane', 'cessna', 'helicopter', 'balloon', 'rocket', 'dragon', 'kite', 'bird', 'bat'];

/** Paints the landscape up to the ground and stops, handing back the context: bare ground to draw on directly. */
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
/** The pixels a sprite id owns in the context's owner buffer: what the drawer painted solidly and still shows. */
const owned = (ctx: Ctx, id: number) => {
  let n = 0;
  for (const v of ctx.owner!) if (v === id) n++;
  return n;
};
const finiteBox = (box: { x: number; y: number; w: number; h: number }, label: string) => {
  expect([box.x, box.y, box.w, box.h].every(Number.isFinite), label).toBe(true);
  expect(box.w > 0 && box.h > 0, label).toBe(true);
};
const inRange = (ctx: Ctx) => {
  for (const v of ctx.data) if (!(v >= 0 && v <= 1)) return false;
  return true;
};
const mean = (img: Image) => {
  let s = 0;
  for (const v of img.data) s += v;
  return s / img.data.length;
};

describe('the reader knows every creature, person, flyer and swimmer by its words', () => {
  const cases: [string, (s: Scene) => void][] = [
    ['horses in a field at sunrise', (s) => {
      expect(s.things.horses).toBe(3); // the usual three
      expect(s.instances.find((i) => i.kind === 'horses')!.count).toBe(3);
      expect([s.time, s.ignored]).toEqual(['dawn', []]);
    }],
    ['a deer in a misty forest', (s) => expect([s.things.deer, s.things.trees, s.fog]).toEqual([1, 9, 0.6])],
    ['deer in a forest', (s) => expect(s.instances.find((i) => i.kind === 'deer')!.count).toBe(2)], // irregular
    ['a shepherd and his sheep on a hill', (s) => { // 'sheep' is the usual six, 'his' a stop word
      expect(s.things).toEqual({ people: 1, sheep: 6, hills: 1 });
      expect(s.instances.find((i) => i.kind === 'sheep')!.count).toBe(6);
      expect(s.ignored).toEqual([]);
    }],
    ['a sheep', (s) => expect(s.things.sheep).toBe(1)],
    ['two cows, a goat and three wolves', (s) => expect(s.things).toMatchObject({ cows: 2, goats: 1, wolves: 3 })],
    ['an elephant and a camel in the desert', (s) => {
      expect(s.things).toMatchObject({ elephants: 1, camels: 1 });
      expect(s.ground).toBe('sand');
    }],
    ['a cat on a wall at night', (s) => expect([s.things.cats, s.time, s.ignored]).toEqual([1, 'night', ['wall']])],
    ['a busy street with people and cars', (s) => { // people: the usual four, on the pavement
      expect(s.things).toEqual({ people: 4, cars: 2, buildings: 11, streetlamp: 4 }); // structures: a street's lamps
      expect(s.instances.find((i) => i.kind === 'people')!.count).toBe(4);
    }],
    ['a person standing beside a car', (s) => {
      expect(s.things).toMatchObject({ people: 1, cars: 1 });
      expect(s.pose).toBe('standing');
      expect(s.ignored).toEqual(['beside']);
    }],
    ['two women and a child sitting', (s) => expect([s.things.people, s.pose]).toEqual([3, 'sitting'])],
    ['a crowd in a city square', (s) => expect(s.things).toMatchObject({ crowds: 1, buildings: 11 })],
    ['a woman', (s) => expect([s.family, s.ignored]).toEqual(['portrait', []])], // alone: the portrait's
    ['a man', (s) => expect(s.family).toBe('portrait')],
    ['a woman by a lake', (s) => expect([s.family, s.things.people, s.ignored]).toEqual([undefined, 1, []])],
    ['a man beside a forklift', (s) => expect([s.things.people, s.things.forklifts]).toEqual([1, 1])],
    ['portrait of a man', (s) => { // a head word: the portrait's whatever else is said
      expect(s.family).toBe('portrait');
      expect(s.portrait!.words).toContain('man');
      expect(s.notes!.some((n) => n.includes('a stylised face, not a likeness of anyone'))).toBe(true);
    }],
    ['a man at the north face', (s) => expect([s.family, s.things.people]).toEqual([undefined, 1])],
    ['an airplane in the sky', (s) => expect(s.things).toEqual({ airplanes: 1, hills: 2 })],
    ['a jet and a propeller plane', (s) => expect(s.things).toMatchObject({ airplanes: 1, cessnas: 1 })],
    ['a helicopter over the city', (s) => expect(s.things).toMatchObject({ helicopters: 1 })],
    ['a hot air balloon over fields', (s) => expect(s.things).toMatchObject({ balloons: 1 })],
    ['balloons at dawn', (s) => expect(s.instances.find((i) => i.kind === 'balloons')!.count).toBe(3)],
    ['a rocket launching at night', (s) => expect([s.things.rockets, s.launching, s.time]).toEqual([1, true, 'night'])],
    ['a dragon flying over a castle', (s) => { // the castle is structures-skyline's
      expect([s.things.dragons, s.things.castle, s.ignored]).toEqual([1, 1, ['flying']]);
    }],
    ['a boy flying a kite on a beach', (s) => expect(s.things).toMatchObject({ people: 1, kites: 1 })],
    ['seagulls over the sea', (s) => expect([s.things.birds, s.ground]).toEqual([7, 'water'])],
    ['three crows', (s) => expect(s.things.birds).toBe(3)],
    ['bats', (s) => { // an unsaid hour turns to night, and is said
      expect([s.things.bats, s.time]).toEqual([5, 'night']);
      expect(s.overridden.some((o) => o.what === 'time' && o.because === 'bats')).toBe(true);
    }],
    ['bats at noon', (s) => expect(s.time).toBe('day')],
    ['whales in the ocean', (s) => expect([s.things.whales, s.ground, s.beach]).toEqual([2, 'water', false])],
    ['a whale', (s) => { // a sea creature brings its water
      expect([s.things.whales, s.ground]).toEqual([1, 'water']);
      expect(s.overridden.some((o) => o.what === 'ground' && o.because === 'whale')).toBe(true);
    }],
    ['dolphins and a shark', (s) => expect(s.things).toMatchObject({ dolphins: 3, sharks: 1 })],
    ['fish in a lake', (s) => expect([s.things.fish, s.family]).toEqual([4, undefined])],
    // review fixes: a collective noun binds to the creature after it or is ignored; a bare person word leaves the
    // prompt as bare as it found it (the space family claims 'space'); a pose needs figures; a pose is a scene's
    ['a flock of birds over the sea', (s) => expect([s.things, s.ignored]).toEqual([{ birds: 7 }, []])],
    ['a flock of seagulls', (s) => expect([s.things.birds, s.things.sheep, s.ignored]).toEqual([7, undefined, []])],
    ['a herd of elephant', (s) => expect([s.things.elephants, s.ignored]).toEqual([3, []])],
    ['a flock at dusk', (s) => expect([s.ignored, s.recognised]).toEqual([['flock'], 1])],
    ['a man in space', (s) => expect([s.family, s.ignored, s.things.people]).toEqual(['space', [], 1])],
    ['people in space', (s) => expect([s.family, s.ignored]).toEqual(['space', []])],
    ['a woman in space', (s) => expect(s.notes!.some((n) => n.startsWith('people not drawn'))).toBe(true)],
    ['a man walking', (s) => expect([s.family, s.things.people, s.pose]).toEqual([undefined, 1, 'walking'])],
    ['a man', (s) => expect(s.family).toBe('portrait')],
    ['a sitting cat', (s) => expect([s.ignored, s.pose, s.recognised]).toEqual([['sitting'], undefined, 1])],
    ['a dog running on a beach at sunset', (s) => expect([s.ignored, s.pose]).toEqual([['running'], undefined])],
    ['three fish on a coral reef', (s) => { // the underwater family keeps its own fish
      expect(s.family).toBe('underwater');
      expect(s.underwater!.fish).toBe(3);
      expect(s.things.fish).toBeUndefined();
    }],
  ];
  it.each(cases)('%s', (prompt, check) => check(read(prompt)));

  it('registers the creatures after the six with sizes in metres, the flyers in the sky, the swimmers on water', () => {
    const ids = things.map((t) => t.id);
    for (const kind of KINDS) expect(ids).toContain(kind);
    expect(ids.indexOf('horse')).toBeGreaterThan(ids.indexOf('tree'));
    expect(ids.filter((id) => id === 'bird')).toEqual(['bird']); // one bird drawer: this package's
    for (const e of CREATURE_THINGS) {
      if (e.sky) expect(e.depth![0]).toBeGreaterThan(0);
      else expect(e.size!.h).toBeGreaterThan(0);
      expect(e.usual).toBeGreaterThan(0);
    }
    expect(CREATURE_THINGS.filter((e) => e.onWater).map((e) => e.id)).toEqual(['whale', 'dolphin', 'shark', 'fish']);
    expect(CREATURE_THINGS.filter((e) => e.sky).map((e) => e.id)).toEqual(FLYER_IDS);
    for (const kind of KINDS) { // every row cites its source and keeps its shoulder over its leg
      const C = CREATURES[kind];
      expect(C.source.length, kind).toBeGreaterThan(10);
      expect(C.shoulder, kind).toBeGreaterThan(C.leg.len);
    }
    expect(FIGURE.adult.h).toBe(SIZES.person);
    expect(FIGURE.child.h).toBe(1.2);
    for (const row of Object.values(FLYERS)) expect(row.source.length).toBeGreaterThan(5);
  });
});

describe('every row renders', () => {
  it('each creature at three depths, standing and grazing, by day and by night, without throwing, in the frame', () => {
    for (const words of ['a meadow at noon', 'a meadow at night']) {
      const { ctx } = ground(words), { W, H, hy } = ctx;
      for (const kind of KINDS) {
        for (const pose of ['standing', 'grazing'] as const) {
          for (const near of [0.2, 0.5, 0.9]) {
            const fy = hy + near * (H - hy), zm = ctx.groundZ(fy);
            const inst = { ux: 0.5, fy, zm, xm: 0, pose, instance: { word: kind, kind: `${kind}s` } } as ThingInstance;
            const id = ctx.tops.length, box = ctx.sprite(zm, () => creature(ctx, inst, kind));
            const label = `${kind} ${pose} near ${near} (${words})`;
            finiteBox(box, label);
            expect(owned(ctx, id), `${label}: paints nothing`).toBeGreaterThan(0);
            const inFrame = box.x < W && box.x + box.w > 0 && box.y < H && box.y + box.h > 0;
            expect(inFrame, `${label}: in the frame`).toBe(true);
            expect(box.pose, label).toBe(pose);
          }
        }
      }
      for (const pose of ['standing', 'walking', 'sitting'] as const) { // and the people, adult and child
        for (const word of ['person', 'child']) {
          const fy = hy + 0.5 * (H - hy), zm = ctx.groundZ(fy);
          const child = word === 'child', inst = { ux: 0.4, fy, zm, instance: { word } } as ThingInstance;
          const person = { x0: 0.4 * W, fy, s: ctx.camera.focal / zm, h: child ? 1.2 : 1.7, pose, dir: 1, child };
          const box = ctx.sprite(zm, () => figure(ctx, inst, person));
          finiteBox(box, `${word} ${pose}`);
          expect(box.pose).toBe(pose);
        }
      }
      expect(inRange(ctx), `${words}: every pixel finite and in 0..1`).toBe(true);
    }
  });

  it('each flyer at three depths in the sky, each swimmer on the water, without throwing', () => {
    const { ctx } = ground('a meadow at noon'), { W, H } = ctx;
    for (const id of FLYER_IDS) {
      const entry = CREATURE_THINGS.find((e) => e.id === id)!, [zNear, zFar] = entry.depth!;
      for (const zm of [zNear, (zNear + zFar) / 2, zFar]) {
        const word = id === 'bird' ? 'gulls' : id;
        const inst = { ux: 0.5, uy: 0.3, fy: 0, zm, instance: { word } } as ThingInstance;
        const sprite = ctx.tops.length, box = ctx.sprite(zm, () => entry.draw(ctx, inst));
        finiteBox(box, `${id} at ${zm} m`);
        expect(owned(ctx, sprite), `${id} at ${zm} m: paints nothing`).toBeGreaterThan(0);
        expect(box.x < W && box.x + box.w > 0 && box.y < H, `${id} at ${zm} m: in the frame`).toBe(true);
      }
    }
    const sea = ground('the sea at noon');
    for (const kind of ['whale', 'dolphin', 'shark', 'fish'] as const) {
      for (const near of [0.2, 0.5, 0.9]) {
        const fy = sea.ctx.hy + near * (sea.ctx.H - sea.ctx.hy), zm = sea.ctx.groundZ(fy);
        const inst = { ux: 0.5, fy, zm, xm: 0 } as ThingInstance;
        const box = sea.ctx.sprite(zm, () => swimmer(sea.ctx, inst, kind));
        finiteBox(box, `${kind} near ${near}`);
        expect(box.species).toBe(kind);
      }
    }
    expect(inRange(ctx) && inRange(sea.ctx)).toBe(true);
    // a rocket launching stands on its plume at the horizon
    const launch = ground('a rocket launching at night');
    const rocket = CREATURE_THINGS.find((e) => e.id === 'rocket')!;
    const inst = { ux: 0.5, uy: 0.3, fy: 0, zm: 600 } as ThingInstance;
    const box = launch.ctx.sprite(600, () => rocket.draw(launch.ctx, inst));
    expect(box.launching).toBe(true);
    expect(box.y + box.h).toBeGreaterThan(launch.ctx.hy - 2); // its foot and smoke at the horizon
  });
});

describe('a person is the scale a car is read against', () => {
  it('draws a 1.70 m figure 1.17 +- 0.05 times the height of a 1.45 m car at the same depth', () => {
    const { ctx } = ground('a meadow at noon', 640, 360);
    for (const near of [0.3, 0.6, 0.9]) {
      const fy = ctx.hy + near * (ctx.H - ctx.hy), zm = ctx.groundZ(fy);
      const inst = { ux: 0.5, fy, zm, xm: 0, instance: { word: 'person' } } as ThingInstance;
      const pose = 'standing' as const;
      const person = { x0: 0.5 * ctx.W, fy, s: ctx.camera.focal / zm, h: 1.7, pose, dir: 1, child: false };
      const box = ctx.sprite(zm, () => figure(ctx, inst, person));
      const car = ctx.project(0, zm, 0).y - ctx.project(0, zm, SIZES.car.h).y;
      expect(Math.abs(box.h / car - 1.17), `near ${near}: ${(box.h / car).toFixed(3)}`).toBeLessThan(0.05);
    }
  });

  it('paints the person beside the car at 1.1-1.3 times its height when both stand at one depth', () => {
    const img = paint(read('a person standing beside a car'), { width: 960, height: 540, seed: 7 });
    const person = img.layout.things.find((t) => t.kind === 'person')!;
    const car = img.layout.things.find((t) => t.kind === 'car')!;
    expect(person.visible && car.visible).toBe(true);
    const ratio = (person.h / car.h) * (person.zm! / car.zm!); // the heights brought to one depth
    expect(ratio).toBeGreaterThan(1.1);
    expect(ratio).toBeLessThan(1.3);
  });

  it('puts the usual four people on a busy street\'s pavement, off the road, and a crowd of 8-20 in a square', () => {
    const img = paint(read('a busy street with people and cars'), { width: 640, height: 360, seed: 7 });
    const people = img.layout.things.filter((t) => t.kind === 'person');
    expect(people.length).toBe(4);
    for (const p of people) expect(Math.abs(p.xm!)).toBeGreaterThan(SIZES.lane * SIZES.lanes / 2 + 0.5); // off the road
    expect(read('a busy street with people and cars').report).toBeUndefined(); // the critic reports after painting
    const crowd = paint(read('a crowd in a city square'), { width: 640, height: 360, seed: 7 });
    const c = crowd.layout.things.find((t) => t.kind === 'crowd')!;
    expect(c.people).toBeGreaterThanOrEqual(8);
    expect(c.people).toBeLessThanOrEqual(20);
  });
});

describe('the birds and the flock', () => {
  it('draws seven gulls over the sea in at least three wing phases, as a flock about one spot, each a species', () => {
    const img = paint(read('seagulls over the sea'), { width: 960, height: 540, seed: 7 });
    const birds = img.layout.things.filter((t) => t.kind === 'bird');
    expect(birds.length).toBe(7);
    expect(new Set(birds.map((b) => b.phase)).size).toBeGreaterThanOrEqual(3);
    expect(birds.every((b) => b.species === 'gull')).toBe(true);
    expect(birds.every((b) => b.visible)).toBe(true);
    const xs = birds.map((b) => b.x + b.w / 2), ys = birds.map((b) => b.y + b.h / 2);
    const spreadX = Math.max(...xs) - Math.min(...xs), spreadY = Math.max(...ys) - Math.min(...ys);
    expect(spreadX).toBeLessThan(0.6 * img.width); // a flock, not a scatter over the whole sky
    expect(spreadY).toBeLessThan(0.6 * img.layout.horizon! * img.height);
  });

  it('reads the species from the word: crows inland, gulls by the sea, sparrows small, bats at night', () => {
    const species = (prompt: string) => paint(read(prompt), { width: 320, height: 180, seed: 2 }).layout.things
      .filter((t) => t.kind === 'bird' || t.kind === 'bat').map((t) => t.species);
    expect(new Set(species('three crows over a field'))).toEqual(new Set(['crow']));
    expect(new Set(species('birds over a field'))).toEqual(new Set(['crow']));
    expect(new Set(species('birds over the sea'))).toEqual(new Set(['gull']));
    expect(new Set(species('sparrows in a meadow'))).toEqual(new Set(['sparrow']));
    expect(new Set(species('bats over a field'))).toEqual(new Set(['bat']));
    expect(BIRDS.sparrow.span).toBeLessThan(BIRDS.gull.span / 4);
  });

  it('leaves a picture without birds or creatures its own: the header kart\'s layout holds the kart alone', () => {
    const scene = read('a red go-kart on a wet road at dusk, mountains behind');
    expect(scene.instances.map((i) => i.kind)).toEqual(['karts', 'mountains']);
    const img = paint(scene, { width: 320, height: 180, seed: 7 });
    expect(img.layout.things.map((t) => t.kind)).toEqual(['kart']);
  });
});

describe('the look, the night, determinism and speed', () => {
  it('keeps the night dark: a cat at night and a rocket launching at night stay under a mean of 0.12', () => {
    for (const words of ['a cat on a wall at night', 'a rocket launching at night']) {
      const img = paint(read(words), { width: 480, height: 270, seed: 7 });
      expect(mean(img), words).toBeLessThan(0.12);
    }
  });

  it('ends a launch at the ground row, lights the helicopter by night, keeps the dragon in the sky', () => {
    const rocket = paint(read('a rocket launching at night'), { width: 480, height: 270, seed: 7 });
    const r = rocket.layout.things.find((t) => t.kind === 'rocket')!;
    expect(r.launching).toBe(true);
    expect(r.y + r.h).toBeLessThanOrEqual(r.ground! + 2);
    const heli = paint(read('a helicopter over a city at night'), { width: 480, height: 270, seed: 7 });
    const h = heli.layout.things.find((t) => t.kind === 'helicopter')!;
    expect([h.lights, h.visible]).toEqual([true, true]);
    expect(h.y).toBeGreaterThanOrEqual(0);
    let bright = 0; // its lights and lit cabin: pixels brighter than the night sky inside its box
    for (let y = Math.max(0, h.y | 0); y < Math.min(270, h.y + h.h); y++) {
      for (let x = Math.max(0, h.x | 0); x < Math.min(480, h.x + h.w); x++) {
        const i = (y * 480 + x) * 3;
        if (Math.max(heli.data[i]!, heli.data[i + 1]!, heli.data[i + 2]!) > 0.6) bright++;
      }
    }
    expect(bright).toBeGreaterThanOrEqual(4);
    for (const seed of [7, 11, 23]) {
      const img = paint(read('a dragon flying over a castle'), { width: 480, height: 270, seed });
      const d = img.layout.things.find((t) => t.kind === 'dragon')!;
      expect(d.y, `seed ${seed}`).toBeGreaterThanOrEqual(0);
      expect(d.y + d.h, `seed ${seed}`).toBeLessThanOrEqual(img.layout.horizon * 270 + 1);
    }
  });

  it('shows the whale at the surface with its box across the waterline, and the sheep as six white oblongs', () => {
    const whales = paint(read('whales in the ocean'), { width: 640, height: 360, seed: 7 });
    const w = whales.layout.things.filter((t) => t.kind === 'whale');
    expect(w.length).toBe(2);
    for (const t of w) {
      expect(t.visible).toBe(true);
      expect(t.y + t.h).toBeGreaterThan(whales.layout.horizon! * whales.height); // its foot on the water
    }
    const img = paint(read('a shepherd and his sheep on a hill'), { width: 640, height: 360, seed: 7 });
    const kinds = img.layout.things.map((t) => t.kind);
    expect(kinds.filter((k) => k === 'sheep').length).toBe(6);
    expect(kinds.filter((k) => k === 'person').length).toBe(1);
    expect(img.layout.things.filter((t) => t.kind === 'sheep').every((t) => t.visible)).toBe(true);
    expect(SWIMMERS.whale.len).toBe(14);
  });

  it('paints the same words into the same bytes, and another seed into other ones', () => {
    const prompts = ['a dragon flying over a castle', 'horses in a field at sunrise', 'a boy flying a kite on a beach'];
    for (const words of prompts) {
      const a = png(paint(read(words), { width: 240, height: 135, seed: 7 }));
      const b = png(paint(read(words), { width: 240, height: 135, seed: 7 }));
      expect(a.equals(b), words).toBe(true);
      const c = png(paint(read(words), { width: 240, height: 135, seed: 8 }));
      expect(a.equals(c), words).toBe(false);
    }
  });

  it('paints a busy street with people and cars at 960x540 in under 1.5 s', () => {
    const scene = read('a busy street with people and cars');
    paint(scene, { width: 320, height: 180, seed: 7 }); // warm the JIT, as a second picture would
    const t = performance.now();
    paint(scene, { width: 960, height: 540, seed: 7 });
    expect(performance.now() - t).toBeLessThan(1500);
  });

  it('draws a bird through its entry with a species and a phase on the box', () => {
    const { ctx } = ground('the sea at noon');
    const inst = { ux: 0.5, uy: 0.3, fy: 0, zm: 60, instance: { word: 'gulls' } } as ThingInstance;
    const box = ctx.sprite(60, () => bird(ctx, inst));
    expect(box.species).toBe('gull');
    expect(box.phase).toBeGreaterThanOrEqual(0);
    expect(box.phase).toBeLessThan(5);
  });
});
