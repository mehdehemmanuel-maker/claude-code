#!/usr/bin/env node
// An image from words: a prompt (and, if you give them, reference pictures) to a PNG, through the Runway image API.
// One file, no dependencies beyond Node 18+ (fetch, fs), so it can be copied anywhere; usable from a shell or imported
// (`import { generateImage } from './tools/image.mjs'`).
//
//   node tools/image.mjs "a red go-kart on a wet track at dusk"
//   node tools/image.mjs "a @kart seen from the front" --ref kart=./bench-out/kart.png --model gen4_image
//   node tools/image.mjs "@part as a product photo on white" --ref part=bench:part|kit=bolt%20M8x30
//   node tools/image.mjs --list
//
//   --out <file>        where to save (default: images/<date>-<slug>.png)
//   --model <id>        gemini_2.5_flash (default), gen4_image (best), gen4_image_turbo (cheapest; needs --ref)
//   --ratio W:H         e.g. 1344:768 (gemini default), 1280:720 (gen4 default), 1024:1024, 768:1344, 1920:1080
//   --ref tag=source    a reference picture named in the prompt as @tag (tag: 3–16 lowercase letters); up to three.
//                       source: a local file (uploaded for this job), an https URL, a runway:// URI, or
//                       bench:<name>|<query> to render a Nexus build first with tools/bench.mjs and use that picture
//   --seed <n>          repeatable results, where the model honours it
//   --json              print the task result as JSON on stdout instead of the path
//   --list              the models and what they cost
//
// The key is read from RUNWAYML_API_SECRET only (never a flag: flags land in shell history and process lists).
// Get one at https://dev.runwayml.com/. Set RUNWAY_ALLOWED_MEDIA_HOSTS=a.com,b.com to restrict URL references.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const API = 'https://api.dev.runwayml.com', VERSION = '2024-11-06';
const here = path.dirname(fileURLToPath(import.meta.url));

export const MODELS = {
  'gemini_2.5_flash': { cost: '5 credits', note: 'Google Gemini; the default', ratio: '1344:768', refs: 'optional' },
  gen4_image: { cost: '5–8 credits', note: 'highest quality', ratio: '1280:720', refs: 'optional' },
  gen4_image_turbo: { cost: '2 credits', note: 'fast and cheap', ratio: '1280:720', refs: 'required' },
};

const log = (s) => process.stderr.write(`${s}\n`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function key() {
  const k = process.env.RUNWAYML_API_SECRET;
  if (!k) throw new Error('RUNWAYML_API_SECRET is not set. Export it in your shell (never pass it as a flag); keys at https://dev.runwayml.com/');
  return k;
}
const headers = (k) => ({ Authorization: `Bearer ${k}`, 'X-Runway-Version': VERSION, 'Content-Type': 'application/json' });

async function describe(r) {
  const text = await r.text();
  let error = text.slice(0, 500), issues = [];
  try { const d = JSON.parse(text); error = d.error ?? d.message ?? error; issues = d.issues ?? []; } catch { /* not JSON */ }
  if (r.status === 400) return `invalid input: ${error}${issues.length ? ` [${issues.map((i) => `${(i.path ?? ['?']).at(-1)}: ${i.message}`).join('; ')}]` : ''}`;
  if (r.status === 401) return 'authentication failed; check RUNWAYML_API_SECRET';
  return `${r.status}: ${error}`;
}

// A call with retries on rate limits and overload (5 s, 15 s, 45 s), as the API asks.
async function call(k, method, route, body) {
  const delays = [5, 15, 45];
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(`${API}${route}`, { method, headers: headers(k), body: body && JSON.stringify(body) });
    if (r.ok) return r.json();
    if ([429, 502, 503, 504].includes(r.status) && attempt < delays.length) {
      log(`  ${await describe(r)}; retrying in ${delays[attempt]} s`); await sleep(delays[attempt] * 1000); continue;
    }
    throw new Error(`API ${method} ${route}: ${await describe(r)}`);
  }
}

async function poll(k, id, { interval = 5, timeout = 600 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout * 1000) {
    const t = await call(k, 'GET', `/v1/tasks/${id}`);
    if (t.status === 'SUCCEEDED') return t;
    if (t.status === 'FAILED') throw new Error(`task failed: ${t.failureCode ? `${t.failureCode}: ` : ''}${t.failure ?? 'unknown'}`);
    if (t.status === 'CANCELLED') throw new Error('task was cancelled');
    log(`  [${id.slice(0, 12)}] ${t.status} (${Math.round((Date.now() - start) / 1000)} s)`); await sleep(interval * 1000);
  }
  throw new Error(`task timed out after ${timeout} s`);
}

// A local file uploaded for this job (ephemeral), as a runway:// URI.
export async function upload(file, k = key()) {
  if (!fs.existsSync(file)) throw new Error(`file not found: ${file}`);
  const name = path.basename(file);
  const u = await call(k, 'POST', '/v1/uploads', { filename: name, type: 'ephemeral' });
  if (!u.uploadUrl || !u.runwayUri) throw new Error(`upload response missing uploadUrl or runwayUri: ${JSON.stringify(u)}`);
  const form = new FormData();
  for (const [f, v] of Object.entries(u.fields ?? {})) form.append(f, v);
  const ext = path.extname(name).toLowerCase();
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[ext] ?? 'application/octet-stream';
  form.append('file', new Blob([fs.readFileSync(file)], { type: mime }), name);
  const r = await fetch(u.uploadUrl, { method: 'POST', body: form });
  if (!r.ok) throw new Error(`upload failed: ${r.status} ${(await r.text()).slice(0, 500)}`);
  log(`  uploaded ${name} → ${u.runwayUri}`);
  return u.runwayUri;
}

function checkUrl(s) {
  const u = new URL(s);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error(`only http(s) URLs or runway:// URIs are allowed, not ${u.protocol}//`);
  const allowed = (process.env.RUNWAY_ALLOWED_MEDIA_HOSTS ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(u.hostname.toLowerCase())) throw new Error(`host ${u.hostname} is not in RUNWAY_ALLOWED_MEDIA_HOSTS (${allowed.join(', ')})`);
  if (u.protocol === 'http:') log(`  warning: insecure http:// reference (${u.hostname}); prefer https or a local file`);
  return s;
}

// A picture of a Nexus build, rendered by the critic's bench (tools/bench.mjs), as a file to reference.
function bench(job) {
  const name = job.split('|')[0];
  const out = process.env.BENCH_OUT ?? path.resolve('bench-out');
  log(`  rendering ${job} with tools/bench.mjs`);
  const r = spawnSync(process.execPath, [path.join(here, 'bench.mjs'), job], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, BENCH_OUT: out } });
  const file = path.join(out, `${name}.png`);
  if (r.status !== 0 || !fs.existsSync(file)) throw new Error(`bench did not produce ${file} (exit ${r.status}); is dist-view built? (npx vite build --config vite.view.config.ts)`);
  return file;
}

// Any way of naming a reference picture, to a URI the API can read.
export async function resolveRef(source, k) {
  if (source.startsWith('runway://')) return source;
  if (/^https?:\/\//.test(source)) return checkUrl(source);
  if (source.startsWith('bench:')) return upload(bench(source.slice(6)), k);
  return upload(source, k);
}

const slug = (s) => s.toLowerCase().replace(/@/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'image';
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');

/**
 * Generate one image. Returns { files, task }: the PNG path(s) written and the API's task record.
 * @param {object} o
 * @param {string} o.prompt   what to draw; reference pictures are named in it as @tag
 * @param {string} [o.out]    where to save; a second output of the same task is saved beside it as -2, -3…
 * @param {string} [o.model]  a key of MODELS (default gemini_2.5_flash)
 * @param {string} [o.ratio]  W:H the model accepts (default by model)
 * @param {Record<string,string>} [o.refs]  tag → source (file, https URL, runway:// URI, or bench:<name>|<query>)
 * @param {number} [o.seed]
 */
export async function generateImage({ prompt, out, model = 'gemini_2.5_flash', ratio, refs = {}, seed } = {}) {
  if (!prompt?.trim()) throw new Error('a prompt is needed');
  if (!MODELS[model]) throw new Error(`unknown model ${model}; one of ${Object.keys(MODELS).join(', ')}`);
  const tags = Object.keys(refs);
  if (tags.length > 3) throw new Error('at most three reference pictures');
  for (const t of tags) if (!/^[a-z][a-z0-9]{2,15}$/.test(t)) throw new Error(`reference tag "${t}" must be 3–16 lowercase letters or digits, starting with a letter`);
  if (!tags.length && MODELS[model].refs === 'required') throw new Error(`${model} needs at least one --ref`);
  const k = key();
  const body = { model, promptText: prompt, ratio: ratio ?? MODELS[model].ratio };
  if (seed !== undefined) body.seed = seed;
  if (tags.length) body.referenceImages = await Promise.all(tags.map(async (tag) => ({ tag, uri: await resolveRef(refs[tag], k) })));

  log(`generating with ${model} (${MODELS[model].cost}), ${body.ratio}…`);
  const task = await call(k, 'POST', '/v1/text_to_image', body);
  log(`  task ${task.id}`);
  const result = await poll(k, task.id);
  const urls = result.output ?? [];
  if (!urls.length) throw new Error('the task succeeded but returned no image');

  const file = path.resolve(out ?? path.join('images', `${stamp()}-${slug(prompt)}.png`));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const files = [];
  for (const [i, url] of urls.entries()) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed: ${r.status}`);
    const f = i === 0 ? file : file.replace(/(\.[^.]*)?$/, `-${i + 1}$1`);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
    files.push(f); log(`  saved ${f}`);
  }
  return { files, task: result };
}

function parse(argv) {
  const o = { refs: {}, words: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
    if (a === '--out' || a === '-o') o.out = next();
    else if (a === '--model' || a === '-m') o.model = next();
    else if (a === '--ratio' || a === '-r') o.ratio = next();
    else if (a === '--seed') o.seed = Number(next());
    else if (a === '--ref') { const v = next(), eq = v.indexOf('='); if (eq < 1) throw new Error(`--ref wants tag=source, got "${v}"`); o.refs[v.slice(0, eq)] = v.slice(eq + 1); }
    else if (a === '--json') o.json = true;
    else if (a === '--list') o.list = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a.startsWith('-') && a.length > 1) throw new Error(`unknown option ${a}`);
    else o.words.push(a);
  }
  o.prompt = o.words.join(' ');
  return o;
}

function usage() {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const head = [];
  for (const l of src.split('\n').slice(1)) { if (!l.startsWith('//')) break; head.push(l.slice(3)); }
  return head.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = parse(process.argv.slice(2));
    if (o.help || (!o.prompt && !o.list)) { console.log(usage()); process.exit(o.help ? 0 : 2); }
    if (o.list) { for (const [id, m] of Object.entries(MODELS)) console.log(`${id.padEnd(18)} ${m.cost.padEnd(12)} ${m.note}; default ratio ${m.ratio}; references ${m.refs}`); process.exit(0); }
    const { files, task } = await generateImage(o);
    console.log(o.json ? JSON.stringify({ files, task }, null, 2) : files.join('\n'));
  } catch (e) {
    log(`Error: ${e.message}`); process.exit(1);
  }
}
