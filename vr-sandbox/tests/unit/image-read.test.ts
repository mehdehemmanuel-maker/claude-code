// The reader and the honest report (tools/image/read.mjs, the shell in tools/image.mjs): counts, colours and sizes bind
// to the right noun, compounds and scene words are read, every unknown word is said, every silent change is said, the
// shell refuses nonsense sizes and seeds, and the PNG carries its reading.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { afterAll, describe, expect, it } from 'vitest';
import { crc32 } from '../../src/persistence/codec';
import { COLOURS, generate, MOST, nounLooking, paint, png, read, report, strictRefusal } from '../../tools/image.mjs';
import type { Scene } from '../../tools/image.mjs';

const TOOL = fileURLToPath(new URL('../../tools/image.mjs', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'image-read-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Runs the shell; returns its exit status and both streams. */
const run = (...args: string[]) => {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const chunks = (file: Buffer) => { // every chunk: its type, its body, its stored CRC and the CRC of type + body
  const out: { type: string; body: Buffer; stored: number; actual: number }[] = [];
  for (let at = 8; at < file.length;) {
    const len = file.readUInt32BE(at), type = file.subarray(at + 4, at + 8).toString('ascii');
    const body = file.subarray(at + 8, at + 8 + len);
    const stored = file.readUInt32BE(at + 8 + len), actual = crc32(file.subarray(at + 4, at + 8 + len));
    out.push({ type, body, stored, actual });
    at += 12 + len;
  }
  return out;
};
const inst = (s: Scene, kind: string) => s.instances.filter((i) => i.kind === kind);

describe('the reader', () => {
  it.each<[string, (s: Scene) => void]>([
    ['blue sky, red car', (s) => { expect(s.colours).toEqual({ cars: 'red' }); expect(s.ignored).toEqual([]); }],
    ['a red car and trees', (s) => {
      expect(s.colours).toEqual({ cars: 'red' });
      expect(inst(s, 'trees')[0]!.colour).toBeUndefined();
    }],
    ['a red car and a blue car', (s) => {
      expect(inst(s, 'cars').map((i) => [i.count, i.colour])).toEqual([[1, 'red'], [1, 'blue']]);
      expect(s.things.cars).toBe(2);
    }],
    ['3 trees', (s) => expect(s.things.trees).toBe(3)],
    ['fifteen trees', (s) => expect(s.things.trees).toBe(15)],
    ['a hundred trees', (s) => { expect(s.things.trees).toBe(MOST); expect(MOST).toBe(40); }],
    ['no trees', (s) => {
      expect(inst(s, 'trees')[0]).toMatchObject({ count: 0, none: true });
      expect('trees' in s.things).toBe(false); // nothing for the painter's usual default to fill
    }],
    ['a pine forest', (s) => {
      expect(s.things.trees).toBe(0);
      expect(inst(s, 'trees')[0]).toMatchObject({ usual: true, count: 9 });
    }],
    ['two mountains', (s) => { expect(s.things.mountains).toBe(2); expect(inst(s, 'mountains')[0]!.count).toBe(2); }],
    ['a grey car on a sunny day', (s) => {
      expect(s.clouds).toBe(0.05);
      expect(s.colours.cars).toBe('grey');
      expect(s.time).toBe('day');
    }],
    ['a thunderstorm over the sea', (s) => {
      expect(s.storm).toBe(true);
      expect(s.ground).toBe('water');
      expect(s.ignored).toEqual([]);
    }],
    ['snow-capped mountains on a clear day', (s) => {
      expect(s.land).toBe('snow');
      expect(s.snow).toBe(0);
      expect(s.clouds).toBe(0.05);
    }],
    ['snow capped mountains on a clear day', (s) => {
      expect(s.land).toBe('snow');
      expect(s.snow).toBe(0);
      expect(s.ignored).toEqual([]);
    }],
    ['a moonlit forest', (s) => {
      expect(s.time).toBe('night');
      expect(s.things.moon).toBe(1);
      expect(s.things.trees).toBe(0);
    }],
    ['a farmhouse by a dirt road', (s) => {
      expect(s.things.houses).toBe(1);
      expect(inst(s, 'houses')[0]!.word).toBe('farmhouse');
      expect(s.road).toBe(true);
      expect(s.roadKind).toBe('dirt');
    }],
    ['a wet road after the rain, clear sky', (s) => {
      expect(s.wet).toBe(true);
      expect(s.rain).toBe(0);
      expect(s.road).toBe(true);
    }],
    ['a kitchen range', (s) => {
      expect('mountains' in s.things).toBe(false);
      expect(s.ignored).toEqual(['kitchen', 'range']);
    }],
    ['a mountain range at dawn', (s) => { expect(s.things.mountains).toBe(0); expect(s.ignored).toEqual([]); }],
    ['a bridge over a river in autumn', (s) => {
      expect(s.river).toBe(true);
      expect(s.ground).toBe('water');
      expect(s.season).toBe('autumn');
      expect(s.things.bridge).toBe(1); // hook for structures-skyline: a bridge is a thing now, not ignored
    }],
    ['a cityscape at golden hour', (s) => {
      expect(s.things.buildings).toBe(0);
      expect(s.time).toBe('sunset');
      expect(s.hour).toBe(17);
    }],
    ['a frozen lake', (s) => {
      expect(s.frozen).toBe(true);
      expect(s.ground).toBe('water');
      expect(s.land).toBe('snow');
      expect([s.waterWord, s.lake]).toEqual(['lake', true]); // the painter asks scene.lake, not the prompt
    }],
    ['two boats on the seas', (s) => { expect([s.waterWord, s.lake]).toEqual(['sea', false]); }],
    ['a bridge over a river', (s) => { expect([s.waterWord, s.lake]).toEqual(['river', false]); }],
    ['a house on the beach', (s) => { expect([s.waterWord, s.lake]).toEqual(['beach', false]); }],
    ['two sailboats', (s) => { expect([s.waterWord, s.ground]).toEqual([null, 'water']); }],
    ['the word HELLO in big letters', (s) => {
      expect(s.text).toBe('HELLO');
      expect(s.recognised).toBeGreaterThan(0);
    }],
    ['"Nexus" over a lake', (s) => { expect(s.text).toBe('Nexus'); expect(s.ground).toBe('water'); }],
    ['a tiny cabin, huge mountains', (s) => {
      expect(inst(s, 'houses')[0]!.size).toBe(0.5);
      expect(inst(s, 'mountains')[0]!.size).toBe(2);
    }],
    ['a movie star', (s) => {
      expect('stars' in s.things).toBe(false);
      expect(s.time).toBe('day');
      expect(s.ignored).toEqual(['movie', 'star']);
    }],
    ['a train track', (s) => { expect(s.road).toBe(true); expect(s.ignored).toEqual([]); }], // train licensed track
    ['a race track with karts', (s) => {
      expect(s.road).toBe(true);
      expect(s.things.karts).toBe(0); // hook for vehicles: karts are their own thing now
      expect(s.ignored).toEqual([]);
      expect(strictRefusal(s)).toBeNull();
    }],
    ['a storm, clear sky', (s) => {
      expect(s.storm).toBe(true);
      expect(s.overridden).toContainEqual({ what: 'clouds', from: 0.05, to: 0.95, because: 'storm outweighs clear' });
    }],
    ['a snowy desert', (s) => {
      expect(s.land).toBe('sand');
      expect(s.overridden).toContainEqual({ what: 'land', from: 'snow', to: 'sand', because: 'sand outweighs snowy' });
    }],
    ['a sign saying "OPEN" on a cabin', (s) => {
      expect(s.text).toBe('OPEN');
      expect(s.things.houses).toBe(1);
      expect(s.ignored).toEqual(['sign']); // 'saying' introduced the quote and is spent with it
    }],
    ['a gray wolf', (s) => { expect(s.clouds).toBe(0.35); expect(s.ignored).toEqual(['wolf']); }],
    ['a grey day', (s) => expect(s.clouds).toBe(0.9)],
    ['no clouds, trees', (s) => { expect(s.clouds).toBe(0.05); expect(s.things.trees).toBe(0); }],
    ['watercolour of a harbour', (s) => {
      expect(s.style).toBe('watercolour');
      expect(s.things).toEqual({ boats: 3, buildings: 4 });
      expect(s.land).toBe('pavement');
    }],
    ['a village at dusk', (s) => { expect(s.things.houses).toBe(6); expect(s.time).toBe('sunset'); }],
    ['a busy street with people and cars', (s) => {
      expect(s.road).toBe(true);
      expect(s.things.buildings).toBe(0);
      expect(s.ignored).toEqual(['busy', 'people']);
    }],
    ['a palm tree on a tropical island', (s) => {
      expect(s.ground).toBe('water');
      expect(s.land).toBe('sand');
      expect(s.things.trees).toBe(1);
    }],
    ['a crescent moon over the sea at noon', (s) => {
      expect(s.moonPhase).toBe('crescent');
      expect(s.time).toBe('day');
      expect(s.hour).toBe(12);
    }],
    ['two mountains in the distance, a cabin on the left', (s) => {
      expect(inst(s, 'mountains')[0]!.placement).toBe('far');
      expect(inst(s, 'houses')[0]!.placement).toBe('left');
    }],
    ['un café à Paris, 山と湖', (s) => {
      expect(s.ignored).toEqual(['un', 'café', 'à', 'paris', '山と湖']);
      expect(s.recognised).toBe(0);
    }],
  ])('reads %j', (prompt, check) => check(read(prompt)));

  it('says what it ignored, what it changed, and how much it understood', () => {
    const dragon = read('a dragon over a castle');
    expect(dragon.ignored).toEqual(['dragon']); // hook for structures-skyline: a castle is a thing now
    expect(dragon.recognised).toBe(1); // hook for structures-skyline: the castle
    expect(dragon.overridden).toEqual([
      { what: 'hills', from: 'none', to: 'the usual', because: 'nothing else breaks the horizon' },
    ]);
    const forklift = read('a white forklift in a warehouse yard at noon, a person standing beside it');
    expect(forklift.ignored).toEqual(['warehouse', 'yard', 'person', 'standing', 'beside']); // hook for vehicles
    expect(forklift.recognised).toBe(2); // noon, and the forklift
    expect(forklift.hour).toBe(12);
    const boat = read('a boat in the desert');
    expect(boat.overridden).toContainEqual({ what: 'ground', from: 'sand', to: 'water', because: 'boats' });
    expect(report(boat)[0]).toBe('read as: day, water with sand shore, boats 1');
    expect(read('three red cars').ignored).toEqual([]);
    const empty = read('');
    expect(empty.ignored).toEqual([]);
    expect(empty.recognised).toBe(0);
    expect(empty.instances).toEqual([]);
    const moon = read('a full moon over the sea'), city = read('buildings');
    expect(moon.overridden).toContainEqual({ what: 'time', from: 'day', to: 'night', because: 'moon' });
    expect(city.overridden).toContainEqual({ what: 'ground', from: 'grass', to: 'pavement', because: 'buildings' });
  });

  it('never throws, keeps every count in 0..40, every colour in COLOURS, and ignores only words of the prompt', () => {
    const check = (prompt: string) => {
      const s = read(prompt);
      for (const i of s.instances) {
        const whole = Number.isInteger(i.count) && i.count >= 0 && i.count <= 40;
        expect(whole, `${prompt}: ${i.kind} ${i.count}`).toBe(true);
      }
      for (const [, c] of Object.entries(s.colours)) expect(c in COLOURS, `${prompt}: colour ${c}`).toBe(true);
      for (const i of s.instances) if (i.colour) expect(i.colour in COLOURS).toBe(true);
      expect(new Set(s.ignored).size).toBe(s.ignored.length);
      expect(['day', 'dawn', 'sunset', 'night']).toContain(s.time);
      return s;
    };
    fc.assert(fc.property(fc.string(), (prompt) => {
      const s = check(prompt), lower = prompt.toLowerCase();
      for (const w of s.ignored) expect(lower.includes(w), `${JSON.stringify(prompt)} ignored ${w}`).toBe(true);
    }), { numRuns: 400 });
    fc.assert(fc.property(fc.string({ unit: 'grapheme' }), (prompt) => { check(prompt); }), { numRuns: 200 });
    const vocabulary = fc.constantFrom(
      'a', 'red', 'three', 'no', 'tiny', 'huge', 'cars', 'car', 'trees', 'forest', 'pine', 'and', 'on', 'wet', 'road',
      'at', 'dusk', 'noon', 'grey', 'snow', 'clear', 'boat', 'lake', 'river', 'harbour', 'the', 'moon', 'full',
      'dragon', 'street', 'village', 'in', 'autumn', 'hundred', '12', 'left', 'far', 'pixel', 'art', 'snow-capped',
      'movie', 'star',
    );
    fc.assert(fc.property(fc.array(vocabulary, { maxLength: 12 }), (ws) => { check(ws.join(' ')); }), { numRuns: 400 });
  });

  it('reads the four header prompts as before: the same things, time and ground', () => {
    const kart = read('a red go-kart on a wet road at dusk, mountains behind');
    expect([kart.things, kart.colours, kart.time, kart.ground, kart.road, kart.wet]).toEqual([
      { karts: 1, mountains: 0 }, { karts: 'red' }, 'sunset', 'grass', true, true, // hook for vehicles: a kart
    ]);
    expect(kart.rain).toBe(0); // the one change: a wet road is wet, it is not raining
    const lake = read('three pine trees by a lake under a full moon, snow');
    expect([lake.things, lake.time, lake.ground, lake.land, lake.beach, lake.snow, lake.moonPhase]).toEqual([
      { trees: 3, moon: 1 }, 'night', 'water', 'snow', true, 0.7, 'full',
    ]);
    const city = read('a city skyline at night in the rain');
    expect([city.things, city.time, city.ground, city.rain]).toEqual([{ buildings: 0 }, 'night', 'pavement', 0.6]);
    const cabin = read('a cabin in a foggy forest at dawn');
    expect([cabin.things, cabin.time, cabin.ground, cabin.fog]).toEqual([
      { houses: 1, trees: 0, hills: 0 }, 'dawn', 'grass', 0.6,
    ]);
    for (const s of [kart, lake, city, cabin]) expect(s.ignored).toEqual([]);
  });
});

describe('the honest shell', () => {
  it('says what it did not understand, paints the default anyway, and refuses under --strict', () => {
    const file = join(dir, 'dragon.png');
    const r = run('a dragon over a castle', '--out', file, '--size', '64x36');
    expect(r.status).toBe(0);
    expect(r.err).toContain('not understood: dragon'); // hook for structures-skyline: the castle is read
    const nothing = run('a dragon over a wyvern', '--out', file, '--size', '64x36'); // hook for structures-skyline
    expect(nothing.err).toContain('not understood: dragon, wyvern');
    expect(nothing.err).toContain('nothing in these words is understood (dragon, wyvern): painting the default day');
    expect(existsSync(file)).toBe(true);
    const strict = run('a dragon over a castle', '--out', join(dir, 'strict.png'), '--size', '64x36', '--strict');
    expect(strict.status).toBe(3);
    expect(existsSync(join(dir, 'strict.png'))).toBe(false);
    expect(strictRefusal(read('a quiet meadow'))).toContain('quiet');
    expect(strictRefusal(read('a meadow, softly'))).toBeNull(); // -ly is not noun-looking
    expect(nounLooking('forklift')).toBe(true);
    expect(nounLooking('ok')).toBe(false);
    const boat = run('a boat in the desert', '--out', join(dir, 'boat.png'), '--size', '64x36');
    expect(boat.err).toContain('read as: day, water with sand shore, boats 1');
    expect(boat.err).toContain('changed: ground sand -> water (boats)');
  });

  it('describes the reading as JSON with the honesty fields', () => {
    const forklift = 'a white forklift in a warehouse yard at noon, a person standing beside it';
    const j = JSON.parse(run(forklift, '--describe').out);
    expect(j.ignored).toEqual(['warehouse', 'yard', 'person', 'standing', 'beside']); // hook for vehicles
    const keys = ['instances', 'ignored', 'overridden', 'recognised', 'hour', 'season', 'river', 'frozen', 'roadKind'];
    keys.push('wet');
    for (const key of keys) expect(key in j, key).toBe(true);
    expect(j.recognised).toBe(2);
    const hello = JSON.parse(run('the word HELLO in big letters, pixel art', '--describe').out);
    expect(hello).toMatchObject({ text: 'HELLO', style: 'pixel' });
  });

  it('rejects nonsense sizes and seeds, writes nothing then, and takes -- before words that start with a dash', () => {
    for (const size of ['0x0', '640x0', '9000x10']) {
      const file = join(dir, `size-${size}.png`);
      const r = run('a tree', '--size', size, '--out', file);
      expect(r.status, size).toBe(1);
      expect(r.err).toMatch(/--size/);
      expect(existsSync(file)).toBe(false);
    }
    const seed = run('a tree', '--seed', 'abc', '--out', join(dir, 'seed.png'));
    expect(seed.status).toBe(1);
    expect(existsSync(join(dir, 'seed.png'))).toBe(false);
    const upper = run('a tree', '--size', '640X360', '--out', join(dir, 'upper.png'));
    expect(upper.status).toBe(0);
    expect(existsSync(join(dir, 'upper.png'))).toBe(true);
    const dash = run('--out', join(dir, 'dash.png'), '--size', '64x36', '--', '-a', 'cabin');
    expect(dash.status).toBe(0);
    expect(dash.err).toContain('houses 1');
    expect(existsSync(join(dir, 'dash.png'))).toBe(true);
    expect(execFileSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' })).toMatch(/--strict[\s\S]*--help/);
  });

  it('writes the reading into the PNG as tEXt chunks before the pixels, every CRC good', () => {
    const opts = { out: join(dir, 'text.png'), width: 48, height: 27, seed: 3 };
    const file = generate('a red car on a wet road at sunset, mountains', opts);
    const parts = chunks(readFileSync(file));
    expect(parts.map((c) => c.type)).toEqual(['IHDR', 'tEXt', 'tEXt', 'IDAT', 'IEND']);
    for (const c of parts) expect(c.actual, `${c.type} crc`).toBe(c.stored);
    const texts = Object.fromEntries(parts.filter((c) => c.type === 'tEXt').map((c) => {
      const zero = c.body.indexOf(0);
      return [c.body.subarray(0, zero).toString('latin1'), c.body.subarray(zero + 1).toString('latin1')];
    }));
    expect(texts['Software']).toBe('vr-sandbox image.mjs');
    const scene = JSON.parse(texts['Comment']!);
    for (const key of ['time', 'ground', 'things', 'ignored']) expect(key in scene, key).toBe(true);
    expect('prompt' in scene).toBe(false);
    expect(scene.things).toEqual({ cars: 1, mountains: 0 });
    const plain = png(paint(read('a tree'), { width: 4, height: 3, seed: 1 }));
    expect(chunks(plain).map((c) => c.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    const comment = { text: { Comment: JSON.stringify({ ignored: ['山と湖'] }) } };
    const foreign = png(paint(read('a tree'), { width: 4, height: 3, seed: 1 }), comment);
    const body = chunks(foreign)[1]!.body;
    expect(JSON.parse(body.subarray(body.indexOf(0) + 1).toString('latin1'))).toEqual({ ignored: ['山と湖'] });
  });

  it('paints the same bytes for the same words, with the reading inside', () => {
    const a = generate('a boat in the desert', { out: join(dir, 'same-a.png'), width: 32, height: 18 });
    const b = generate('a boat in the desert', { out: join(dir, 'same-b.png'), width: 32, height: 18 });
    expect(readFileSync(a).equals(readFileSync(b))).toBe(true);
  });
});
