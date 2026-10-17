#!/usr/bin/env node
// An image from words, generated here: no model, no service, no key. The words are read into a scene (the time of day,
// the weather, the ground, what stands on it and how many), the scene is painted pixel by pixel (sky, sun or moon and
// stars, clouds, ranges of mountains fading into the air, water, ground, trees in their season's colours, houses,
// buildings, vehicles, a boat, birds, weather, grain), and the pixels are written as a PNG by this file's own encoder.
// The ground: grass with tufts and flowers, sand in dunes with lit crests and shadowed lees, snow, rolling swells when
// hills are named, a road that drifts (grey asphalt, or dirt with ruts) and rises with them, wet on every surface.
// The water: a shoreline that wanders with a foam line and wet sand, mirroring the sky, the ranges and the far bank
// and what stands at its edge or on it, whitecaps and no glitter in a storm, flat ice when frozen, a river between
// two banks; rain and snow fall in three depths, snow settles on every top edge, fog thickens with depth.
// Things stand in metres through a camera 1.6 m up that steps back and up to frame what was asked (a 4.6 m car on
// a two-lane road, a 6 m cabin, a 15-25 m pine), placed in world space (a named subject near a third line, nothing
// over another, nothing but vehicles on the road, boats on the water, a counted few staggered in depth), with
// anti-aliased edges and a shadow thrown by the sun or the moon at the hour's height; the sun a small
// warm disc by day and a deep orange ball when low, the moon by its phase, the mountains lit on the sun's side. A
// style can finish the whole (pixel art, a poster, a sketch, a watercolour, mono, sepia, vintage) and a caption can be
// written over it in the tool's own 5x7 bitmap font.
// Node 18+, nothing to install; usable from a shell or imported (`paint`, `read`, `png`, `generate`).
// This file is the shell and the PNG encoder; the painting is tools/image/ (math, registry, read, core, passes,
// things, draw, styles, text, font), which has nothing of Node in it, so the same core paints in a browser
// (`toImageData`); core.mjs says what each file owns. A package extends the tool through `register` (things,
// families, styles, conditions): a thing registered with its words is read and drawn with no edit here.
//
//   node tools/image.mjs "a red go-kart on a wet road at dusk, mountains behind"
//   node tools/image.mjs "three pine trees by a lake under a full moon, snow"
//   node tools/image.mjs "a city skyline at night in the rain" --size 1920x1080 --seed 7
//   node tools/image.mjs "a cabin in a foggy forest at dawn" --describe
//
//   --out <file>     where to save (default: images/<date>-<slug>.png)
//   --size WxH       picture size, each side 1 to 8192 (default 1280x720)
//   --seed <n>       the random choices, a whole number (default: from the words: the same words, the same picture)
//   --style <name>   a finish over the whole: pixel, poster, minimalist, sketch, watercolour, mono, sepia, vintage
//                    (the words can name one too: "a mountain lake, pixel art"; the flag wins over the word and stderr
//                    says so; an unknown name lists these, exit 1; minimalist also asks the scene for no clouds, no
//                    fog and a flat sky)
//   --text "..."     a caption in the 5x7 bitmap font, top- or bottom-centre away from the subject, two lines at
//                    most: a longer one is cut with ... and stderr says so, as it says of characters not in the font;
//                    the flag wins over a text in the words, and stderr says so
//   --count <n>      n pictures, <out>-1.png to <out>-n.png (1 to 64), each from its own seed: the base seed (--seed,
//                    or the words' own) plus i - 1, so -1 is the picture --seed alone gives, -2 is --seed <base+1>
//   --strip <n>      one wide picture of n seeds side by side (1 to 64), each cell at --size, the seeds as --count
//                    takes them and listed in a Seeds tEXt chunk; not together with --count
//   --format <f>     png (the default), or ppm: a binary P6 file, which has no text chunk, so the reading is said on
//                    stderr only
//   --describe       print what the words were read as (JSON) and stop, no picture saved (the picture is painted,
//                    at --size, so the critic's visible counts are in the JSON: about a second at 1280x720)
//   --strict         write nothing and exit 3 when nothing in the words is understood, or when an ignored word looks
//                    like a noun (three letters or more, not ending in -ly: it cannot tell nouns from adjectives)
//   --help           this text. `--` ends the options, so the words may begin with a dash.
//
// After every painting the shell says on stderr what it read (`read as: day, water with sand shore, boats 1`), what it
// could not (`not understood: dragon, castle`), what it changed (`changed: ground sand -> water (boats)`), what the
// critic could see once painted (`visible: trees 3/3, houses 1/2`: a thing hidden behind a nearer one or too small
// to read is not counted), and when
// nothing at all was understood it says so and paints the default day meadow. The PNG carries the same reading as a
// tEXt chunk named Comment (the scene JSON) beside a Software chunk, so any picture can be traced to its words.
//
// What is understood: time (dawn/sunrise, morning, day, noon/midday, afternoon, golden hour, sunset/dusk/evening,
// blue hour, night/midnight, moonlit, starlit), weather (clear/sunny, cloudy, overcast/grey, storm/thunderstorm/
// lightning, fog/mist/haze, rain/drizzle/showers, wet, snowing/snowfall/blizzard/flurries, snow, snowy/snow-capped,
// frozen/icy/ice, autumn/fall, spring, summer, winter), ground (grass/meadow/field, desert/sand/dunes, snow, pavement,
// road/highway/lane/street/avenue, dirt/gravel, a track after race, dirt or train), water (sea/ocean/lake/pond/bay/
// coast, river/stream/canal, harbour/port/marina, island/tropical/palm, beach/shore), things (mountains/peaks/mountain
// range, hills, trees/forest/woods/pines/firs/oaks/palms, house/cabin/cottage/barn/hut/farmhouse/village, buildings/
// city/town/skyline/cityscape/downtown/towers, vehicles from their published or typical figures, seen from behind on
// a road or side-on: car/sedan/hatchback, kart/go-kart, truck/pickup/lorry, semi/trailer/tractor-trailer/18-wheeler/
// rig, jeep/suv/4x4, van, bus/coach, taxi/yellow cab, forklift, motorcycle/motorbike/bike, dirt bike, bicycle (and a
// bike when cycling or a bicycle is named), atv/quad/four-wheeler, tractor/mower; boat/ship/sailboat/yacht/ferry/canoe,
// birds/gulls/crows, flowers/poppies/tulips/daisies (dots over the grass, as a meadow or a field has), sun, moon and
// its phase, stars) with counts ("three trees", "15 trees", "a hundred" is forty,
// "no trees"), colours and sizes before things ("red car", "tiny cabin", "huge mountains"), places (near, far, left,
// right, centre), a style word (pixel art/8-bit, poster/flat/cartoon, minimalist, sketch/pencil/line art,
// watercolour/painting, black and white/mono/greyscale, sepia, vintage/retro/old photo) and a text to write ("the
// word HELLO", a quoted phrase, "saying ..."). "no" before a word cancels it (no clouds, no trees). Words that name
// the picture itself (photo, scene, sky) are passed over.
// Families beyond the landscape (a family picture has no ground and no horizon; stderr says which family painted
// and what it is): space (mars, venus, jupiter, saturn, earth beside a space word, planet(s), orbit, moonscape,
// nebula, galaxy, space alone or outer/deep space, cosmos, asteroid(s), moons: a planet from its known colours, not
// a photograph), abstract (abstract, geometric/geometry, circle(s), triangle(s), square(s), shapes, pattern(s),
// gradient, mandala, stripes, bauhaus, mondrian, op-art), portrait (portrait, face, selfie, headshot; woman/man/
// girl/boy alone; hair, eyes, beard, glasses, smiling, blond/blonde, brunette, redhead as its details: a stylised
// face, not a likeness of anyone), underwater (underwater, undersea, coral(s), reef(s), diving, diver(s), scuba,
// seabed, aquarium; fish/fishes with a count). In a landscape: the sky's phenomena (rainbow(s) by day; aurora(s)/
// borealis/northern lights at night; lightning/thunderbolt(s) under a storm) and the landforms (cactus/cacti/
// cactuses/saguaro(s) on sand, palm-tree/palmtree/coconut-palm, volcano/volcanoes/volcanos with erupting/erupts/
// eruption(s) for lava, waterfall(s)/cascade(s)). Structures in metres (houses by kind in three-quarter view, a
// city's skyline, lighthouse, rocks, windmill, castle, church, bridge, tent, campfire, fence, streetlamp, telegraph
// pole, bench) and creatures (cat, dog, horse, deer, cow, sheep, goat, wolf, elephant, camel, people and crowds; in
// the sky airplane, cessna, helicopter, balloon, rocket, dragon, kite, birds by word, bats; whale, dolphin, shark,
// fish).
// Anything else in the words is ignored, and --describe shows exactly what was kept: every ignored word, every
// silent change, and how much was recognised.
// The longer read: README.md ("Pictures from words", a gallery tools/image-examples.mjs regenerates and checks) and
// docs/IMAGE-TOOL.md (the pipeline, the module map, how a thing, a family or a style is added, the decisions made).
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { clamp, hash } from './image/math.mjs';
import { nounLooking, read, words } from './image/read.mjs';
import { paint } from './image/core.mjs';

export * from './image/core.mjs';
export * from './image/read.mjs';

/** What the PNG's Software chunk says wrote it. */
export const SOFTWARE = 'vr-sandbox image.mjs';

// ── PNG ─────────────────────────────

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}
/** A tEXt chunk: keyword, a zero, Latin-1 text (a character beyond Latin-1 is written as a JSON \uXXXX escape). */
function tEXt(keyword, text) {
  const latin = text.replace(/[^\x00-\xff]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return chunk('tEXt', Buffer.concat([Buffer.from(keyword, 'latin1'), Buffer.alloc(1), Buffer.from(latin, 'latin1')]));
}

/**
 * Encodes { width, height, data (rgb floats 0..1) } as a PNG (8-bit RGB, no filter, deflated). `text` adds a tEXt
 * chunk per entry before the pixels: the shell writes Software and Comment (the scene JSON) so a picture keeps its
 * reading; without it the file holds IHDR, IDAT and IEND only.
 */
export function png({ width, height, data }, { text } = {}) {
  const stride = width * 3 + 1, raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride, from = y * width * 3;
    raw[row] = 0; // the filter byte: none
    for (let i = 0; i < width * 3; i++) raw[row + 1 + i] = Math.round(clamp(data[from + i]) * 255);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB (the compression, filter and interlace bytes stay 0)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const texts = Object.entries(text ?? {}).map(([k, v]) => tEXt(k, v));
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  return Buffer.concat([signature, chunk('IHDR', ihdr), ...texts, idat, chunk('IEND', Buffer.alloc(0))]);
}

/** Encodes the painting as a binary PPM: 'P6\n<w> <h>\n255\n' then w*h*3 bytes. The format has no text chunk. */
export function ppm({ width, height, data }) {
  const head = Buffer.from(`P6\n${width} ${height}\n255\n`, 'ascii'), body = Buffer.alloc(width * height * 3);
  for (let i = 0; i < body.length; i++) body[i] = Math.round(clamp(data[i]) * 255);
  return Buffer.concat([head, body]);
}

/** The formats the shell writes, by the --format word, each a function of the painting and the text chunks. */
export const FORMATS = { png, ppm: (image) => ppm(image) };

/**
 * The file's bytes for a painting: a PNG with a Software chunk and a Comment chunk holding the scene's reading
 * (without the prompt: the words are the caller's), plus any `text` given (a strip's Seeds), or a PPM, which
 * carries no text. The gallery script encodes through this so its files are byte for byte the shell's.
 */
export function encode(image, scene, { format = 'png', text } = {}) {
  const writer = FORMATS[format];
  if (!writer) throw new Error(`no format named ${format} (png or ppm)`);
  const { prompt: _, ...reading } = scene;
  return writer(image, { text: { Software: SOFTWARE, Comment: JSON.stringify(reading), ...text } });
}

/**
 * Pictures of one size side by side in `cols` columns (one row when cols is their count: a --strip), the rest of a
 * short last row left black; layout.cells gives each one's box. The images' own layouts are not carried over.
 */
export function compose(images, cols = images.length) {
  const [first] = images, w = first.width, h = first.height, rows = Math.ceil(images.length / cols);
  const width = w * cols, height = h * rows, data = new Float32Array(width * height * 3), cells = [];
  images.forEach((img, i) => {
    if (img.width !== w || img.height !== h) throw new Error('compose wants pictures of one size');
    const cx = (i % cols) * w, cy = Math.floor(i / cols) * h;
    for (let y = 0; y < h; y++) data.set(img.data.subarray(y * w * 3, (y + 1) * w * 3), ((cy + y) * width + cx) * 3);
    cells.push({ x: cx, y: cy, w, h });
  });
  return { width, height, data, layout: { cells } };
}

/** Where a picture goes: `out`, or images/<date>-<slug>.<format>; resolved, its directory made. */
export function outFile(prompt, out, format = 'png') {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
  const file = path.resolve(out ?? path.join('images', `${stamp}-${slug}.${format}`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

/** The i-th of a --count: the file's name with -i before its extension (a.png -> a-1.png). */
export const numbered = (file, i) => file.replace(/(\.[A-Za-z0-9]+)?$/, `-${i}$1`);

/**
 * Words to a PNG (or, by `format`, a PPM) file, its reading in a tEXt chunk. Returns the path written. `style` and
 * `text` stand in when the words name none; `painted(image)` is called with the painting before it is written,
 * for the shell's notes on the caption (textNotes) or any other look at the layout.
 */
export function generate(prompt, { out, width, height, seed, style, text, scene, painted, format = 'png' } = {}) {
  const read_ = scene ?? read(prompt), image = paint(read_, { width, height, seed, style, text });
  painted?.(image);
  const file = outFile(prompt, out, format);
  fs.writeFileSync(file, encode(image, read_, { format }));
  return file;
}

// ── The report ──────────────────────

/** What the scene says in a line or three, for stderr: read as, not understood, nothing understood, changed. */
export function report(scene) {
  const bits = [scene.time];
  if (scene.storm) bits.push('storm');
  else if (scene.rain > 0) bits.push('rain');
  if (scene.snow > 0) bits.push('snow falling');
  if (scene.fog > 0) bits.push('fog');
  if (scene.wet && !scene.rain && !scene.storm) bits.push('wet');
  if (scene.clouds <= 0.05) bits.push('clear');
  else if (scene.storm) { /* a storm's clouds go without saying */ }
  else if (scene.clouds >= 0.9) bits.push('overcast');
  else if (scene.clouds >= 0.6) bits.push('cloudy');
  if (scene.season) bits.push(scene.season);
  if (scene.frozen) bits.push('frozen');
  if (scene.family) { // hook for scene-families: a family picture has no ground, no road and no horizon
    bits.push(`${scene.family} family (${scene.family === 'underwater' ? 'no sky' : 'no ground'}, no horizon)`);
  } else {
    bits.push((scene.river ? 'river' : scene.ground) + (scene.beach ? ` with ${scene.land} shore` : ''));
    if (scene.road) bits.push(scene.roadKind === 'dirt' ? 'dirt road' : 'road');
  }
  for (const inst of scene.instances) {
    if (inst.none) bits.push(`no ${inst.kind}`);
    else {
      const colour = inst.colour ? `${inst.colour} ` : '', usual = inst.usual ? ' (the usual)' : '';
      bits.push(`${colour}${inst.kind} ${inst.count}${usual}`);
    }
  }
  if (scene.overridden.some((o) => o.what === 'hills')) bits.push('hills (added to break the horizon)');
  if (scene.style) bits.push(`style ${scene.style}`);
  if (scene.text) bits.push(`text "${scene.text}"`);
  const lines = [`read as: ${bits.join(', ')}`];
  for (const n of scene.notes ?? []) lines.push(`note: ${n}`); // hook for scene-families: what a family says of itself
  const ignored = scene.ignored.join(', ');
  if (scene.ignored.length) lines.push(`not understood: ${ignored}`);
  if (scene.recognised === 0) {
    const which = ignored ? ` (${ignored})` : '';
    lines.push(`nothing in these words is understood${which}: painting the default day meadow`);
  }
  const changed = scene.overridden.filter((o) => o.what !== 'hills');
  const q = (o, v) => (o.what === 'text' ? JSON.stringify(v) : v); // a text in quotes: it may hold spaces
  const changes = changed.map((o) => `${o.what} ${q(o, o.from)} -> ${q(o, o.to)} (${o.because})`);
  if (changes.length) lines.push(`changed: ${changes.join('; ')}`);
  const visible = scene.report?.visible; // hook for placement-critic: what the critic could see, once painted
  const seen = Object.entries(visible ?? {}).map(([kind, [n, asked]]) => `${kind} ${n}/${asked}`);
  if (seen.length) lines.push(`visible: ${seen.join(', ')}`);
  return lines;
}

/** What the caption lost, for stderr: the second line it was cut to, the characters the font has no glyph for. */
export function textNotes(layout) {
  const t = layout.text, lines = [];
  if (!t) return lines;
  if (t.truncated && !t.lines.length) lines.push('text does not fit the picture: not drawn');
  else if (t.truncated) lines.push(`text cut to two lines: "${t.lines[1]}"`);
  if (t.substituted) lines.push(`text: ${t.substituted} characters outside the font drawn as ?`);
  return lines;
}

/** Why --strict refuses a scene, or null when it would paint. */
export function strictRefusal(scene) {
  if (scene.recognised === 0) return 'nothing in the words is understood';
  const nouns = scene.ignored.filter(nounLooking);
  return nouns.length ? `noun-looking words not understood: ${nouns.join(', ')}` : null;
}

// ── The shell ───────────────────────

/** The header comment of this file, as the help text. */
function usage() {
  const head = [];
  for (const line of fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1)) {
    if (!line.startsWith('//')) break;
    head.push(line.slice(3));
  }
  return head.join('\n');
}

export function parse(argv) {
  const o = { words: [] };
  let options = true;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (!options) o.words.push(a);
    else if (a === '--') options = false;
    else if (a === '--out' || a === '-o') o.out = next();
    else if (a === '--size' || a === '-s') {
      const v = next(), m = /^(\d+)[x×](\d+)$/i.exec(v);
      if (!m) throw new Error('--size wants WxH, e.g. 1280x720');
      o.width = +m[1];
      o.height = +m[2];
      if (o.width < 1 || o.height < 1 || o.width > 8192 || o.height > 8192) {
        throw new Error(`--size ${v}: each side must be 1 to 8192 pixels`);
      }
    } else if (a === '--seed') {
      const v = next();
      if (!/^-?\d+$/.test(v)) throw new Error(`--seed wants a whole number, not ${v}`);
      o.seed = Number(v) >>> 0;
    } else if (a === '--count' || a === '--strip') {
      const v = next();
      if (!/^\d+$/.test(v) || +v < 1 || +v > 64) throw new Error(`${a} wants a whole number from 1 to 64, not ${v}`);
      o[a.slice(2)] = +v;
    } else if (a === '--format') {
      const v = next();
      if (!(v in FORMATS)) throw new Error(`--format wants png or ppm, not ${v}`);
      o.format = v;
    } else if (a === '--style') o.style = next();
    else if (a === '--text') o.text = next();
    else if (a === '--describe') o.describe = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--help' || a === '-h') return { ...o, help: true }; // whatever follows, the help is the answer
    else if (a.startsWith('-') && a.length > 1) {
      throw new Error(`unknown option ${a} (put -- before words with a dash)`);
    }
    else o.words.push(a);
  }
  if (o.count && o.strip) throw new Error('--count and --strip together: n pictures, or one picture of n seeds');
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = parse(process.argv.slice(2)), prompt = o.words.join(' ').trim();
    if (o.help) {
      console.log(usage());
      process.exit(0);
    }
    if (!prompt) {
      console.log(usage());
      process.exit(2);
    }
    const scene = read(prompt);
    for (const [what, flag] of [['style', '--style'], ['text', '--text']]) { // a flag over the words: said, not silent
      if (o[what] !== undefined && scene[what] !== undefined && o[what] !== scene[what]) {
        scene.overridden.push({ what, from: scene[what], to: o[what], because: flag });
      }
    }
    if (o.describe) {
      paint(scene, o); // hook for placement-critic: the critic's report (scene.report.visible) is known once painted
      console.log(JSON.stringify(scene, null, 2));
      process.exit(0);
    }
    const early = report(scene);
    for (const line of early) process.stderr.write(`${line}\n`);
    const refusal = o.strict && strictRefusal(scene);
    if (refusal) {
      process.stderr.write(`--strict: ${refusal}; nothing written\n`);
      process.exit(3);
    }
    // the seeds: the base is --seed or the words' own (what paint() hashes); picture i of a count or a strip is
    // painted with base + i - 1, so the first is the plain picture and any cell can be had again with --seed
    const base = o.seed ?? hash(words(prompt).join(' ')), n = o.count ?? o.strip ?? 1;
    const seeds = Array.from({ length: n }, (_, i) => (base + i) >>> 0);
    const painted = (seed) => (image) => {
      const tag = n > 1 ? `seed ${seed}: ` : '';
      for (const line of textNotes(image.layout)) process.stderr.write(`${tag}${line}\n`);
      for (const line of report(scene).slice(early.length)) process.stderr.write(`${tag}${line}\n`); // the critic
    };
    const t = Date.now(), files = [];
    if (o.strip) {
      const cells = seeds.map((seed) => {
        const image = paint(scene, { ...o, seed });
        painted(seed)(image);
        return image;
      });
      const file = outFile(prompt, o.out, o.format);
      fs.writeFileSync(file, encode(compose(cells), scene, { format: o.format, text: { Seeds: seeds.join(' ') } }));
      files.push(file);
    } else if (o.count) {
      const file = outFile(prompt, o.out, o.format);
      seeds.forEach((seed, i) => {
        files.push(generate(prompt, { ...o, scene, seed, out: numbered(file, i + 1), painted: painted(seed) }));
      });
    } else files.push(generate(prompt, { ...o, scene, painted: painted(seeds[0]) }));
    const took = `(${((Date.now() - t) / 1000).toFixed(1)} s)`;
    process.stderr.write(`${files.length > 1 ? `${files.length} files, ${files.at(-1)}` : files[0]} ${took}\n`);
    for (const file of files) console.log(file);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }
}
