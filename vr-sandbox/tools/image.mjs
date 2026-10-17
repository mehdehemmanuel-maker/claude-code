#!/usr/bin/env node
// An image from words, generated here: no model, no service, no key. The words are read into a scene (the time of day,
// the weather, the ground, what stands on it and how many), the scene is painted pixel by pixel (sky, sun or moon and
// stars, clouds, ranges of mountains fading into the air, water, ground, trees in their season's colours, houses,
// buildings, a car, a boat, birds, weather, grain), and the pixels are written as a PNG by this file's own encoder.
// The ground: grass with tufts and flowers, sand in dunes with lit crests and shadowed lees, snow, rolling swells when
// hills are named, a road that drifts (grey asphalt, or dirt with ruts) and rises with them, wet on every surface.
// The water: a shoreline that wanders with a foam line and wet sand, mirroring the sky, the ranges and the far bank
// and what stands at its edge or on it, whitecaps and no glitter in a storm, flat ice when frozen, a river between
// two banks; rain and snow fall in three depths, snow settles on every top edge, fog thickens with depth.
// Things stand in metres through a camera 1.6 m up (a 4.5 m car on a two-lane road, a 6 m cabin, a 15-25 m
// pine), with anti-aliased edges and a shadow thrown by the sun or the moon at the hour's height; the sun a small
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
//   --describe       print what the words were read as (JSON) and stop, no picture
//   --strict         write nothing and exit 3 when nothing in the words is understood, or when an ignored word looks
//                    like a noun (three letters or more, not ending in -ly: it cannot tell nouns from adjectives)
//   --help           this text. `--` ends the options, so the words may begin with a dash.
//
// After every painting the shell says on stderr what it read (`read as: day, water with sand shore, boats 1`), what it
// could not (`not understood: dragon, castle`), what it changed (`changed: ground sand -> water (boats)`), and when
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
// city/town/skyline/cityscape/downtown/towers, car/kart/truck/van/jeep/taxi, boat/ship/sailboat/yacht/ferry/canoe,
// birds/gulls/crows, flowers/poppies/tulips/daisies (dots over the grass, as a meadow or a field has), sun, moon and
// its phase, stars) with counts ("three trees", "15 trees", "a hundred" is forty,
// "no trees"), colours and sizes before things ("red car", "tiny cabin", "huge mountains"), places (near, far, left,
// right, centre), a style word (pixel art/8-bit, poster/flat/cartoon, minimalist, sketch/pencil/line art,
// watercolour/painting, black and white/mono/greyscale, sepia, vintage/retro/old photo) and a text to write ("the
// word HELLO", a quoted phrase, "saying ..."). "no" before a word cancels it (no clouds, no trees). Words that name
// the picture itself (photo, scene, sky) are passed over. Anything else in the words is ignored, and --describe
// shows exactly what was kept: every ignored word, every silent change, and how much was recognised.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { clamp } from './image/math.mjs';
import { nounLooking, read } from './image/read.mjs';
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

/**
 * Words to a PNG file, its reading in a tEXt chunk. Returns the path written. `style` and `text` stand in when the
 * words name none; `painted(image)` is called with the painting before it is written, for the shell's notes on the
 * caption (textNotes) or any other look at the layout.
 */
export function generate(prompt, { out, width, height, seed, style, text, scene, painted } = {}) {
  const read_ = scene ?? read(prompt), image = paint(read_, { width, height, seed, style, text });
  painted?.(image);
  const { prompt: _, ...reading } = read_; // the words are the file's name and the caller's; the reading is new
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
  const file = path.resolve(out ?? path.join('images', `${stamp}-${slug}.png`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(image, { text: { Software: SOFTWARE, Comment: JSON.stringify(reading) } }));
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
  bits.push((scene.river ? 'river' : scene.ground) + (scene.beach ? ` with ${scene.land} shore` : ''));
  if (scene.road) bits.push(scene.roadKind === 'dirt' ? 'dirt road' : 'road');
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
      console.log(JSON.stringify(scene, null, 2));
      process.exit(0);
    }
    for (const line of report(scene)) process.stderr.write(`${line}\n`);
    const refusal = o.strict && strictRefusal(scene);
    if (refusal) {
      process.stderr.write(`--strict: ${refusal}; nothing written\n`);
      process.exit(3);
    }
    const painted = (image) => { for (const line of textNotes(image.layout)) process.stderr.write(`${line}\n`); };
    const t = Date.now(), file = generate(prompt, { ...o, scene, painted });
    process.stderr.write(`${file} (${((Date.now() - t) / 1000).toFixed(1)} s)\n`);
    console.log(file);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }
}
