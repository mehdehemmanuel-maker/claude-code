// One command for the loop every round runs: build the viewer *only if it is stale*, say something in the forge, frame
// what came up, and save the picture. The round steps (CLAUDE.md, "what does a person see first? render it, framed so
// it can be seen whole, take a screenshot, and look at it") cost four tool calls every time — is dist-view older than
// src? build it (90 s); work out a camera by hand; run tools/forge-run.mjs — and three of those are mechanical.
//
//   node tools/shot.mjs wheel "show me the works" --at wheel --from 1.2,0.6,1.0
//   node tools/shot.mjs plan "fast plan: a box 100x100x100 at 0,0,0 \"a block\"; b can 50x80 at 0.2,0,0; a -> b"
//   node tools/shot.mjs forge "show me the works" --then "open the forge"
//
//   --at <station>   frame the works' own station by asking the room where it stands (worksWhere), never by arithmetic
//                    on the layout — which shot the wrong end of the shop three rounds running
//   --from x,y,z     where to stand relative to what is framed, metres (default 1.2, 0.7, 1.0)
//   --then <words>   said after the first, before the picture (opening a station, taking a thing apart)
//   --wait <ms>      how long to let the room settle (default 3500)
//   --build          build even if nothing is stale; --no-build never builds
// Its output directory is $SHOT_OUT or ./shots. It prints what the forge said and the file it wrote.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const has = (k) => args.includes(k);
const [name, words] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1]?.startsWith('--') && !['--build', '--no-build'].includes(args[i - 1])));
if (!name || !words) { console.log('node tools/shot.mjs <name> "<words>" [--at station] [--from x,y,z] [--then words] [--wait ms]'); process.exit(1); }

const newest = (dir, skip = /node_modules/) => {
  let t = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (skip.test(p)) continue; if (e.isDirectory()) walk(p); else t = Math.max(t, fs.statSync(p).mtimeMs); } };
  if (fs.existsSync(dir)) walk(dir);
  return t;
};
const src = Math.max(newest('src'), newest('view')), built = newest('dist-view');
if (!has('--no-build') && (has('--build') || src > built)) {
  console.log(built ? `the viewer is ${Math.round((src - built) / 1000)} s behind src: building` : 'no viewer yet: building');
  const r = spawnSync('npx', ['vite', 'build', '--config', 'vite.view.config.ts', '--logLevel', 'error'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
} else console.log('the viewer is up to date');

const out = process.env.SHOT_OUT ?? 'shots';
const steps = [`say:${words}`, `wait:${opt('--wait', '3500')}`];
if (opt('--then')) steps.push(`say:${opt('--then')}`, 'wait:2500');
// the camera is asked for, never worked out: the room says where a station stands
const at = opt('--at');
if (at) {
  const [dx, dy, dz] = (opt('--from', '1.2,0.7,1.0')).split(',').map(Number);
  steps.push(`js:(() => { const w = worksNow(); const p = w && w.where(${JSON.stringify(at)}); if (!p) return 'no ${at} standing'; `
    + `window.__shotView = [p[0] + ${dx}, ${dy}, p[2] + ${dz}, p[0], ${Math.max(0.3, dy - 0.3)}, p[2]]; return 'framing ' + ${JSON.stringify(at)}; })()`,
    'js:(() => { const v = window.__shotView; return v ? v.join(",") : "" })()');
}
steps.push(`shot:${name}`);
const r = spawnSync('node', ['tools/forge-run.mjs', 'dist-view', out, ...steps], { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
const said = r.stdout ?? '';
process.stdout.write(said);
// a framed shot needs the view applied before the picture: forge-run takes `view:` as a step, so the second pass uses it
const m = /→ "?(-?\d+(?:\.\d+)?,[^"\n]*)"?/.exec(said.split('\n').filter((l) => l.startsWith('(() => { const v')).join('\n'));
if (at && m) {
  const r2 = spawnSync('node', ['tools/forge-run.mjs', 'dist-view', out, `say:${words}`, 'wait:3500',
    ...(opt('--then') ? [`say:${opt('--then')}`, 'wait:2500'] : []), `view:${m[1]}`, 'wait:900', `shot:${name}`],
  { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8' });
  process.stdout.write(r2.stdout ?? '');
}
console.log(`\n${path.resolve(out, `${name}.png`)}`);
