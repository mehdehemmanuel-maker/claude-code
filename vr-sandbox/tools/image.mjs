#!/usr/bin/env node
// An image from words, generated here: no model, no service, no key. The words are read into a scene (the time of day,
// the weather, the ground, what stands on it and how many), the scene is painted pixel by pixel (sky, sun or moon and
// stars, clouds, ranges of mountains fading into the air, water with a reflection, grass, sand, snow, a road, trees,
// houses, buildings, a car, a boat, birds, rain, snow, fog, grain), and the pixels are written as a PNG by this file's
// own encoder. Node 18+, nothing to install; usable from a shell or imported (`paint`, `read`, `png`, `generate`).
// This file is the shell and the PNG encoder; the painting is tools/image/ (math, read, core, passes, things), which
// has nothing of Node in it, so the same core paints in a browser (`toImageData`); core.mjs says what each file owns.
//
//   node tools/image.mjs "a red go-kart on a wet road at dusk, mountains behind"
//   node tools/image.mjs "three pine trees by a lake under a full moon, snow"
//   node tools/image.mjs "a city skyline at night in the rain" --size 1920x1080 --seed 7
//   node tools/image.mjs "a cabin in a foggy forest at dawn" --describe
//
//   --out <file>     where to save (default: images/<date>-<slug>.png)
//   --size WxH       picture size (default 1280x720)
//   --seed <n>       the random choices (default: from the words, so the same words give the same picture)
//   --describe       print what the words were read as (JSON) and stop, no picture
//
// What is understood: time (dawn, day, sunset/dusk, night), weather (clear, cloudy, overcast, storm, fog/mist, rain,
// snow), ground (grass/meadow, desert/sand, snow, sea/ocean/lake/water, beach, road/track/street, city), things
// (mountains, hills, trees/forest/pines, house/cabin/barn, buildings/city/skyline, car/kart/truck, boat/ship, birds,
// sun, moon, stars) with counts ("three trees", "two houses") and colours before things ("red car", "blue house").
// Anything else in the words is ignored, and --describe shows exactly what was kept.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { clamp } from './image/math.mjs';
import { read } from './image/read.mjs';
import { paint } from './image/core.mjs';

export * from './image/core.mjs';
export * from './image/read.mjs';

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

/** Encodes { width, height, data (rgb floats 0..1) } as a PNG (8-bit RGB, no filter, deflated). */
export function png({ width, height, data }) {
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
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  return Buffer.concat([signature, chunk('IHDR', ihdr), idat, chunk('IEND', Buffer.alloc(0))]);
}

/** Words to a PNG file. Returns the path written. */
export function generate(prompt, { out, width, height, seed } = {}) {
  const scene = read(prompt), image = paint(scene, { width, height, seed });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
  const file = path.resolve(out ?? path.join('images', `${stamp}-${slug}.png`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(image));
  return file;
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

function parse(argv) {
  const o = { words: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === '--out' || a === '-o') o.out = next();
    else if (a === '--size' || a === '-s') {
      const m = /^(\d+)x(\d+)$/.exec(next());
      if (!m) throw new Error('--size wants WxH, e.g. 1280x720');
      o.width = +m[1];
      o.height = +m[2];
    } else if (a === '--seed') o.seed = Number(next()) >>> 0;
    else if (a === '--describe') o.describe = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('-') && a.length > 1) throw new Error(`unknown option ${a}`);
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
    if (o.describe) {
      console.log(JSON.stringify(read(prompt), null, 2));
      process.exit(0);
    }
    const t = Date.now(), file = generate(prompt, o);
    process.stderr.write(`${file} (${((Date.now() - t) / 1000).toFixed(1)} s)\n`);
    console.log(file);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }
}
