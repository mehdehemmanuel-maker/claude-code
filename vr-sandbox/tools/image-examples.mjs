#!/usr/bin/env node
// The gallery of the image tool, from one table: every picture under docs/images/ and the generated parts of the
// README's "Pictures from words" section (the gallery with its captions and folded --describe JSON, the vocabulary
// paragraph copied from tools/image.mjs's header) come from EXAMPLES below, painted through the same read(), paint()
// and encode() the shell uses, at fixed seeds, so they are the tool's own output and nothing is retouched.
//
//   npm run image:examples              paint every example into docs/images/ and rewrite the README's generated
//                                       regions (between the <!-- image-examples --> and <!-- image-vocabulary -->
//                                       markers); prints each file with its size and the total
//   npm run image:examples -- --check   paint each one again into memory and compare its sha256 with the committed
//                                       file (and each README region with its text): 'same' or 'DRIFT' per file,
//                                       'EXTRA' for a file under docs/images/ no row makes; exit 1 on any drift,
//                                       missing or extra file, so anyone can prove the pictures are what the tool
//                                       paints today and nothing stale is shown
//
// A row of EXAMPLES: { file, prompt, size, seed, caption } paints one picture; `describe: true` also saves the
// --describe JSON beside it (<file>.json) and folds it under the picture in the README; `strip: n` paints n seeds
// side by side (the shell's --strip); `styles: [...]` paints the prompt once per style into a grid of `cols`
// columns, each cell labelled in the tool's own font; `cells: [{ prompt, seed, label }]` paints one prompt per
// cell into such a grid; `stderr: true` runs the real shell on the prompt and saves what it said on stderr beside
// the picture (<file>.txt), quoted in the README. Pictures are 960x540 for the two leads and 640x360 or 400x225
// cells elsewhere: a 960x540 PNG from this tool is 0.6-0.8 MB (the grain fights deflate), and the whole gallery is
// kept under about 6 MB. This is a Node script in tools/, like bench.mjs; the painter it imports has no Node in it.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compose, encode, paint, read } from './image.mjs';
import { drawText } from './image/text.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(ROOT, 'docs', 'images');
const TOOL = path.join(ROOT, 'tools', 'image.mjs');
const README = path.join(ROOT, 'README.md');
const LEAD = [960, 540], HALF = [640, 360], CELL = [400, 225];
const STYLES = ['pixel', 'poster', 'minimalist', 'sketch', 'watercolour', 'mono', 'sepia', 'vintage'];

/** The gallery, in the order the README shows it. */
export const EXAMPLES = [
  {
    file: 'kart-dusk.png', prompt: 'a red go-kart on a wet road at dusk, mountains behind', size: LEAD, seed: 7,
    describe: true, lead: true,
    caption: 'The header\'s first example. The kart is 1.8 m long on a 3.5 m lane, seen from behind as it goes ' +
      'away down a road that drifts; the wet asphalt mirrors the dusk sky and the mountains fade into the air. ' +
      'In the JSON below, `things` carries the count painted ("mountains" named none, so the usual three) and ' +
      'the instance says `usual: true`.',
  },
  {
    file: 'lake-moon.png', prompt: 'three pine trees by a lake under a full moon, snow', size: LEAD, seed: 3,
    describe: true, lead: true,
    caption: 'Three pines counted and placed apart on the near shore, snow on every top edge, the full moon with ' +
      'its glow laid on the lake and a far bank of small trees beyond it; "moon" turned the time to night and the ' +
      'tool said so (overridden, below).',
  },
  {
    file: 'city-rain.png', prompt: 'a city skyline at night in the rain', size: HALF, seed: 5, pair: 'left',
    describe: true,
    caption: 'The header\'s third example: a skyline row at the horizon with lit windows, nearer towers, rain in ' +
      'three depths, wet pavement.',
  },
  {
    file: 'cabin-fog.png', prompt: 'a cabin in a foggy forest at dawn', size: HALF, seed: 2, pair: 'right',
    describe: true,
    caption: 'The header\'s fourth example. Fog thickens with depth: the far trees go first, the ranges behind them ' +
      'are a band in the air, and the cabin stands clear on the near grass with its shadow thrown by the low sun.',
  },
  {
    file: 'sailboats-strip.png', prompt: 'two sailboats at sunset', size: [320, 180], seed: 1, strip: 6,
    caption: 'One prompt, six seeds side by side (`--strip 6`): the boats and the sun move; the clouds are the same ' +
      'field, and the reading is the same. Each cell can be had alone with `--seed`.',
  },
  {
    file: 'styles-grid.png', prompt: 'a mountain lake with a red cabin', size: CELL, seed: 4, styles: STYLES, cols: 4,
    caption: 'The eight finishes over one picture (`--style`, or the word in the prompt): pixel, poster, ' +
      'minimalist, sketch, watercolour, mono, sepia, vintage. The labels are the tool\'s own 5x7 font.',
  },
  {
    file: 'mars-orbit.png', prompt: 'mars from orbit', size: HALF, seed: 11, pair: 'left',
    caption: 'The space family: a sphere shaded from the light\'s side, in Mars\'s known colours (not a photograph), ' +
      'the limb across the bottom third because "orbit" puts the eye low over it.',
  },
  {
    file: 'mandala.png', prompt: 'a blue and gold mandala', size: HALF, seed: 9, pair: 'right',
    caption: 'The abstract family: rotational symmetry from the seed, the palette from the colour words.',
  },
  {
    file: 'portrait.png', prompt: 'a portrait of a woman with red hair and glasses', size: HALF, seed: 6, pair: 'left',
    caption: 'The portrait family: a stylised face in adult-head proportions, the hair from the colour word, the ' +
      'glasses from theirs; never a likeness of anyone, and the picture\'s notes say so.',
  },
  {
    file: 'reef.png', prompt: 'a coral reef with five fish and a diver', size: HALF, seed: 8, pair: 'right',
    caption: 'The underwater family: light rays, caustics on the sand, coral, bubbles, the five fish counted, a diver.',
  },
  {
    file: 'vehicles-sheet.png', size: CELL, cols: 3,
    cells: [
      { prompt: 'a red go-kart on a road', seed: 2, label: 'go-kart' },
      { prompt: 'a blue pickup truck on a road', seed: 3, label: 'pickup truck' },
      { prompt: 'a white semi on a highway', seed: 5, label: 'semi' },
      { prompt: 'a yellow forklift on a road', seed: 4, label: 'forklift' },
      { prompt: 'a bus on a road', seed: 6, label: 'bus' },
      { prompt: 'a green jeep on a dirt road', seed: 7, label: 'jeep (a crossover)' },
    ],
    caption: 'Vehicles from a figures table (tools/image/things/vehicles.mjs: length, wheelbase, wheel sizes, cab ' +
      'and bed in metres, each with its source), seen from behind on the road. The kart has no roll hoop because ' +
      'the sourced rental kart has none; "jeep" draws the crossover the project holds.',
  },
  {
    file: 'honesty-dragon.png', prompt: 'a dragon over a castle, a wizard on the drawbridge', size: HALF, seed: 1,
    stderr: true,
    caption: 'What the tool does with words it does not understand: it says so on stderr (below, captured from the ' +
      'real run: the wizard and the drawbridge), keeps the ignored words in the PNG\'s tEXt chunk, and paints what ' +
      'it did understand (the dragon and the castle, counted as visible); with `--strict` it writes nothing and ' +
      'exits 3 instead.',
  },
];

// ── Painting ───────────────────────

/** Puts the tool's own text at the top left of a cell of a composed picture. */
function label(image, cell, text) {
  const { width: W, height: H, data } = image;
  const put = (x, y, c, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = ((y | 0) * W + (x | 0)) * 3;
    for (let k = 0; k < 3; k++) data[i + k] += (c[k] - data[i + k]) * a;
  };
  drawText({ W, H, put }, text, { x: cell.x + 8, y: cell.y + 8, scale: 2 });
}

/** The real shell's stderr for a prompt, without its last line (the file's path and the seconds it took). */
function shellStderr(prompt, [width, height], seed) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-examples-'));
  try {
    const args = [prompt, '--size', `${width}x${height}`, '--seed', String(seed)];
    const r = spawnSync(process.execPath, [TOOL, ...args, '--out', path.join(dir, 'x.png')], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`the shell failed on "${prompt}": ${r.stderr}`);
    const lines = r.stderr.trimEnd().split('\n').filter((l) => !/ \(\d+\.\d s\)$/.test(l));
    const shown = args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
    const text = `$ node tools/image.mjs ${shown}\n${lines.join('\n')}\n`;
    return { text, png: fs.readFileSync(path.join(dir, 'x.png')) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Paints one example into memory: a Map from each file it makes (relative to docs/images/) to its bytes. The
 * picture is encoded through encode(), so the bytes are the shell's; the JSON is what --describe prints.
 */
export function render(ex) {
  const out = new Map(), [width, height] = ex.size;
  if (ex.cells) {
    const images = ex.cells.map((c) => paint(read(c.prompt), { width, height, seed: c.seed }));
    const sheet = compose(images, ex.cols ?? images.length);
    ex.cells.forEach((c, i) => label(sheet, sheet.layout.cells[i], c.label ?? c.prompt));
    const scene = { prompt: '', cells: ex.cells.map((c) => ({ prompt: c.prompt, seed: c.seed })) };
    out.set(ex.file, encode(sheet, scene));
    return out;
  }
  const scene = read(ex.prompt);
  if (ex.stderr) {
    const { text, png } = shellStderr(ex.prompt, ex.size, ex.seed);
    out.set(ex.file, png);
    out.set(ex.file.replace(/\.png$/, '.txt'), Buffer.from(text, 'utf8'));
    return out;
  }
  if (ex.strip) {
    const seeds = Array.from({ length: ex.strip }, (_, i) => (ex.seed + i) >>> 0);
    const images = seeds.map((seed) => paint(scene, { width, height, seed }));
    out.set(ex.file, encode(compose(images), scene, { text: { Seeds: seeds.join(' ') } }));
    return out;
  }
  if (ex.styles) {
    const images = ex.styles.map((style) => paint(scene, { width, height, seed: ex.seed, style }));
    const grid = compose(images, ex.cols ?? images.length);
    ex.styles.forEach((style, i) => label(grid, grid.layout.cells[i], style));
    out.set(ex.file, encode(grid, scene, { text: { Styles: ex.styles.join(' ') } }));
    return out;
  }
  const image = paint(scene, { width, height, seed: ex.seed });
  out.set(ex.file, encode(image, scene));
  if (ex.describe) out.set(ex.file.replace(/\.png$/, '.json'), Buffer.from(JSON.stringify(scene, null, 2) + '\n'));
  return out;
}

// ── The README's generated regions ──

export const MARK = {
  leads: ['<!-- image-leads: written by `npm run image:examples` from EXAMPLES in tools/image-examples.mjs -->',
    '<!-- /image-leads -->'],
  gallery: ['<!-- image-examples: written by `npm run image:examples` from EXAMPLES in tools/image-examples.mjs -->',
    '<!-- /image-examples -->'],
  vocabulary: ['<!-- image-vocabulary: copied from the header of tools/image.mjs by `npm run image:examples` -->',
    '<!-- /image-vocabulary -->'],
};

/** The header's vocabulary paragraph ("What is understood: ..." to "... how much was recognised."), reflowed. */
export function vocabulary(source = fs.readFileSync(TOOL, 'utf8')) {
  const head = [];
  for (const line of source.split('\n').slice(1)) {
    if (!line.startsWith('//')) break;
    head.push(line.slice(3));
  }
  const from = head.findIndex((l) => l.startsWith('What is understood:'));
  const to = head.findIndex((l, i) => i >= from && /how much was recognised\.$/.test(l));
  if (from < 0 || to < 0) throw new Error('the header has no vocabulary paragraph');
  return wrap(head.slice(from, to + 1).join(' ').replace(/\s+/g, ' ').replace(/\/ /g, '/'), 118);
}

const wrap = (text, width) => text.split(' ').reduce((lines, w) => {
  const last = lines[lines.length - 1];
  if (last.length + 1 + w.length > width) lines.push(w);
  else lines[lines.length - 1] = last ? `${last} ${w}` : w;
  return lines;
}, ['']).join('\n');

const img = (ex, width) => `<img src="docs/images/${ex.file}" alt="${ex.prompt}" width="${width}">`;
const cite = (ex) => wrap(`*\`${ex.prompt}\`* (seed ${ex.seed}) — ${ex.caption}`, 118);

/**
 * The gallery as markdown, from the files render() made (for the JSON and stderr it quotes): the two leads
 * (`lead: true`, shown before the README's paragraph) or the rest.
 */
export function gallery(files, leads = false) {
  const parts = [], rows = EXAMPLES.filter((ex) => !!ex.lead === leads);
  const folded = (ex) => { // the --describe JSON under a picture, folded; the real stderr, quoted
    const out = [];
    if (ex.describe) {
      const json = files.get(ex.file.replace(/\.png$/, '.json')).toString('utf8').trimEnd();
      out.push(`<details><summary><code>--describe</code>: what the words were read as</summary>`, '',
        '```json', json, '```', '', '</details>', '');
    }
    if (ex.stderr) {
      const text = files.get(ex.file.replace(/\.png$/, '.txt')).toString('utf8').trimEnd();
      out.push('```', text, '```', '');
    }
    return out;
  };
  for (let i = 0; i < rows.length; i++) {
    const ex = rows[i];
    if (ex.pair === 'left') { // two half-size pictures side by side, their captions (and JSON) under them
      const right = rows[i + 1];
      parts.push('<table><tr>', `<td width="50%">${img(ex, 640)}</td>`, `<td width="50%">${img(right, 640)}</td>`,
        '</tr><tr><td valign="top">', '', cite(ex), '', ...folded(ex), '</td><td valign="top">', '', cite(right), '',
        ...folded(right), '</td></tr></table>', '');
      i++;
      continue;
    }
    parts.push(`![${ex.prompt ?? ex.file}](docs/images/${ex.file})`, '');
    if (ex.cells) parts.push(wrap(`*${ex.cells.map((c) => `\`${c.prompt}\``).join(', ')}* — ${ex.caption}`, 118), '');
    else parts.push(cite(ex), '');
    parts.push(...folded(ex));
  }
  return parts.join('\n').trimEnd();
}

/** The README with a marked region's body replaced; an Error when the markers are missing. */
export function withRegion(readme, [open, close], body) {
  const a = readme.indexOf(open), b = readme.indexOf(close);
  if (a < 0 || b < a) throw new Error(`README.md has no ${open.slice(0, 24)}... region`);
  return `${readme.slice(0, a + open.length)}\n${body}\n${readme.slice(b)}`;
}

/** The body of a marked region as the README holds it now, or null. */
export function region(readme, [open, close]) {
  const a = readme.indexOf(open), b = readme.indexOf(close);
  return a < 0 || b < a ? null : readme.slice(a + open.length, b).replace(/^\n/, '').replace(/\n$/, '');
}

// ── The shell ──────────────────────

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

function main(argv) {
  const check = argv.includes('--check');
  const files = new Map();
  for (const ex of EXAMPLES) for (const [name, bytes] of render(ex)) files.set(name, bytes);
  const readme = fs.readFileSync(README, 'utf8');
  const regions = { leads: gallery(files, true), gallery: gallery(files), vocabulary: vocabulary() };
  let drift = 0, total = 0;
  if (check) {
    for (const [name, bytes] of files) {
      const file = path.join(DIR, name);
      const same = fs.existsSync(file) && sha(fs.readFileSync(file)) === sha(bytes);
      console.log(`${same ? 'same ' : 'DRIFT'}  docs/images/${name}`);
      if (!same) drift++;
      total += bytes.length;
    }
    for (const [key, body] of Object.entries(regions)) {
      const same = region(readme, MARK[key]) === body;
      console.log(`${same ? 'same ' : 'DRIFT'}  README.md ${key} region`);
      if (!same) drift++;
    }
    const stale = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => !files.has(f)) : [];
    for (const f of stale) console.log(`EXTRA  docs/images/${f} (not in EXAMPLES: remove it, or add a row)`);
    const bad = drift + stale.length;
    console.log(`${files.size} files, ${kb(total)} in all${bad ? `, ${drift} drifted, ${stale.length} extra` : ''}`);
    return bad ? 1 : 0;
  }
  fs.mkdirSync(DIR, { recursive: true });
  for (const [name, bytes] of files) {
    fs.writeFileSync(path.join(DIR, name), bytes);
    console.log(`${kb(bytes.length).padStart(8)}  docs/images/${name}`);
    total += bytes.length;
  }
  let next = readme;
  for (const [key, body] of Object.entries(regions)) next = withRegion(next, MARK[key], body);
  if (next !== readme) fs.writeFileSync(README, next);
  console.log(`${files.size} files, ${kb(total)} in all; README.md ${next === readme ? 'unchanged' : 'updated'}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
