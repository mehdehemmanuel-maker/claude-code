// The practice gym (decision 0029, wave 14; the user: "generate, inspect, upgrade random generations each time so we
// actually get the flow down instead of templates"): N random machine requests (src/nexus/gym.ts randomRequest, from
// GYM_SEED on), each built by composeBuild with the real model and the eye on (as tests/evals/user20.eval.ts does), its
// result photographed from four sides through the built viewer and scored by the inspector (gym.ts inspect). Kept in
// EVAL_DIR: <k>.json (the run and the inspection), <k>.board.json, <k>.<view>.png. Then the lessons (plan/GYM-LESSONS.md,
// rewritten) and one line more in tests/evals/gym-history.json. Run:
//   GYM_N=10 GYM_SEED=1 EVAL_DIR=<dir> NODE_USE_ENV_PROXY=1 npx vitest run --config vitest.eval.config.ts tests/evals/gym.eval.ts
// (needs ANTHROPIC_API_KEY; costs real tokens). GYM_SET=user20 runs the user's twenty through the same inspection;
// GYM_PICK=2,5 some of the set; GYM_REINSPECT=1 builds nothing: the boards already in EVAL_DIR are photographed and
// inspected again (after the rubric changed); GYM_WRITE=0 leaves the lessons and the history as they are. The viewer is
// built once into EVAL_VIEW (or EVAL_DIR/view) and served on a port from 5940 to 5969; EVAL_PLAYWRIGHT names the module.
import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { composeBuild, sdkAsk } from '../../src/nexus/agent';
import { nodesOf, type Board } from '../../src/nexus/boards';
import { VIEWS, historyLine, inspect, lessonsMarkdown, lessonsOf, randomRequest, unread, type GymLine, type GymRun, type Inspection, type View } from '../../src/nexus/gym';
import type { Feature } from '../../src/nexus/lookat';

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.md': 'text/plain' };
type Shot = { screenshot(o: { type: 'png' }): Promise<Uint8Array> };
type Page = { setDefaultTimeout(ms: number): void; addInitScript(f: (bd: string) => void, a: string): Promise<void>; goto(u: string): Promise<unknown>; waitForTimeout(ms: number): Promise<void>; evaluate<T, A>(f: (a: A) => T, a: A): Promise<T>; click(s: string): Promise<void>; $(s: string): Promise<Shot | null>; close(): Promise<void> };
type Browser = { newPage(o: unknown): Promise<Page>; close(): Promise<void> };
/** What the page already exposes of its 3D view (view/dashboard.ts `window.dashboard.dock`, view/dock3d.ts): the view put
 *  somewhere looking at a point, a box framed whole from the side looked from, and the bounds of what is shown. */
type Dock = { look(from: number[], at: number[]): void; frameBox(b: unknown): void; view: { bounds(): { isEmpty(): boolean; min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } } };

/** The eye, with four sides: the built viewer served here, one browser. `shot` opens a board (through localStorage, as the
 *  app keeps its board) and photographs the 3D view as it is fitted (what composeBuild's `look` is given); `round` then
 *  turns the view's camera about the build by the page's own `dock.look` and `dock.frameBox`, once for each of VIEWS. */
async function eye(dir: string): Promise<{ shot: (board: Board) => Promise<{ png: Uint8Array } | undefined>; round: (board: Board) => Promise<View[]>; close: () => Promise<void> }> {
  const dist = resolve(process.env.EVAL_VIEW ?? join(dir, 'view'));
  if (!existsSync(join(dist, 'index.html'))) execFileSync('npx', ['vite', 'build', '--config', 'vite.view.config.ts', '--logLevel', 'error', '--outDir', dist], { stdio: 'inherit' });
  const server: Server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]!), p = join(dist, u === '/' ? 'index.html' : u);
    if (!p.startsWith(dist) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  let port = 0;
  for (let p = 5940; p <= 5969 && !port; p++) await new Promise<void>((ok) => { server.once('error', () => ok()); server.listen(p, '127.0.0.1', () => { port = p; ok(); }); });
  if (!port) throw new Error('no free port from 5940 to 5969 for the viewer');
  const { chromium } = createRequire(import.meta.url)(process.env.EVAL_PLAYWRIGHT || 'playwright') as { chromium: { launch(): Promise<Browser> } }, browser = await chromium.launch();
  const open = async <T>(board: Board, then: (p: Page) => Promise<T>): Promise<T> => {
    const p = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 }); p.setDefaultTimeout(60_000);
    try {
      await p.addInitScript((bd) => { try { localStorage.clear(); localStorage.setItem('nexus.nodeboard.v1', bd); localStorage.setItem('nexus.nodeboard.chosen.v1', '1'); } catch { /* a page with no storage shows nothing */ } }, JSON.stringify(board));
      await p.goto(`http://127.0.0.1:${port}/index.html?full`); await p.waitForTimeout(1500);
      const tw = Date.now(); let calm = 0;
      while (Date.now() < tw + 90_000) { const settled = await p.evaluate(() => (window as unknown as { nexusNodes?: { settled?: () => boolean } }).nexusNodes?.settled?.() ?? false, 0); calm = settled ? (calm || Date.now()) : 0; if (calm && Date.now() - calm > 1200) break; await p.waitForTimeout(300); }
      await p.click('#enter3d').catch(() => {}); await p.waitForTimeout(800); await p.click('#fit3d').catch(() => {}); await p.waitForTimeout(2500);
      return await then(p);
    } finally { await p.close(); }
  };
  const snap = async (p: Page) => { const canvas = await p.$('#dock canvas'); return canvas ? new Uint8Array(await canvas.screenshot({ type: 'png' })) : undefined; };
  return { shot: (board) => open(board, async (p) => { const png = await snap(p); return png ? { png } : undefined; }),
    round: (board) => open(board, async (p) => { const out: View[] = [];
      for (const v of VIEWS) {
        const shown = await p.evaluate(({ az, el }) => { const dock = (window as unknown as { dashboard?: { dock?: Dock } }).dashboard?.dock, b = dock?.view.bounds(); if (!dock || !b || b.isEmpty()) return false;
          const c = [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2], a = az * Math.PI / 180, e = el * Math.PI / 180;
          // (the scene's up is +y: a direction from its turn about the upright and its height above level; frameBox then
          // stands the camera off far enough to see the bound whole from that side)
          dock.look([c[0]! + Math.sin(a) * Math.cos(e), c[1]! + Math.sin(e), c[2]! + Math.cos(a) * Math.cos(e)], c); dock.frameBox(b); return true; }, { az: v.azimuth, el: v.elevation });
        if (!shown) break; await p.waitForTimeout(900); const png = await snap(p); if (png) out.push({ name: v.name, png }); }
      return out; }),
    close: async () => { await browser.close(); server.close(); } };
}

/** The user's twenty, read from where they are kept (importing that file would run its test here). */
const user20 = (): string[] => [.../export const USER20 = \[([^\]]+)\]/.exec(readFileSync(resolve('tests/evals/user20.eval.ts'), 'utf8'))![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!);

it('the gym: random requests built, photographed from four sides, inspected; the lessons and the history written', async () => {
  const dir = process.env.EVAL_DIR ?? '.'; mkdirSync(dir, { recursive: true });
  const n = Number(process.env.GYM_N ?? 6), seed = Number(process.env.GYM_SEED ?? 1), model = process.env.EVAL_MODEL || undefined, again = process.env.GYM_REINSPECT === '1';
  const set = process.env.GYM_SET === 'user20' ? 'user20' : `random, seeds ${seed} to ${seed + n - 1}`, pick = (process.env.GYM_PICK ?? '').split(',').map(Number).filter(Boolean);
  const todo = (process.env.GYM_SET === 'user20' ? user20() : Array.from({ length: n }, (_, k) => randomRequest(seed + k))).map((r, k) => [r, k + 1] as const).filter(([, k]) => !pick.length || pick.includes(k));
  const see = await eye(dir), runs: (GymRun & { k: number })[] = [];
  const one = async (req: string, k: number) => {
    const t0 = Date.now(), tokens = { in: 0, out: 0, cached: 0, written: 0 }; let row: Record<string, unknown> = {}, features: Feature[] = [], board: Board | undefined, inspection: Inspection;
    try {
      if (again) { const old = JSON.parse(readFileSync(join(dir, `${k}.json`), 'utf8')) as Record<string, unknown>; row = { ...old, inspection: undefined }; features = (old.features as Feature[] | null) ?? [];
        board = existsSync(join(dir, `${k}.board.json`)) ? JSON.parse(readFileSync(join(dir, `${k}.board.json`), 'utf8')) as Board : undefined; if (!board) throw new Error(String(old.failed ?? 'no board kept'));
      } else {
        const r = await composeBuild(req, { ask: sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(900_000) }), look: see.shot, features: true });
        board = r.board; features = r.features ?? []; writeFileSync(join(dir, `${k}.board.json`), JSON.stringify(r.board));
        row = { k, request: req, asks: r.asks, nodes: nodesOf(r.board).length, unmet: r.unmet, features: r.features ?? null, size: r.size ?? null, looks: r.looks ?? 0, parts: r.parts.map((p) => `${p.name} (${p.by ?? '?'})`), steps: r.steps };
      }
      const views = await see.round(board).catch(() => [] as View[]); for (const v of views) writeFileSync(join(dir, `${k}.${v.name}.png`), v.png);
      inspection = await inspect(req, features, views, sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(240_000) }));
    } catch (x) { inspection = unread(`nothing was built: ${(x as Error).message}`, features); row = { k, request: req, ...row, failed: (x as Error).message.slice(0, 300) }; }
    runs.push({ k, request: req, inspection });
    writeFileSync(join(dir, `${k}.json`), JSON.stringify({ ...row, inspection, ...tokens, s: +((Date.now() - t0) / 1000).toFixed(0) }, null, 1));
    console.log(`DONE ${k}. ${req} | confidence ${inspection.confidence}${inspection.failed ? ` | ${inspection.failed.slice(0, 160)}` : ` | a stranger: ${inspection.stranger}`} | ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  };
  try { for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(([r, k]) => one(r, k))); }
  finally { await see.close(); }
  runs.sort((a, b) => a.k - b.k);
  const s = (x: Inspection) => `${x.scores.silhouette}/${x.scores.proportion}/${x.scores.mechanism}/${x.scores.surface}`;
  console.log(['', '| k | request | confidence | silhouette/proportion/mechanism/surface | features seen | a stranger says | top upgrade |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...runs.map((r) => { const x = r.inspection; return `| ${r.k} | ${r.request} | ${x.confidence} | ${s(x)} | ${x.features.filter((f) => f.seen === 'seen').length} of ${x.features.length} | ${x.failed ? `(no reading: ${x.failed.slice(0, 80)})` : x.stranger} | ${x.upgrades[0] ? `${x.upgrades[0].stage}: ${x.upgrades[0].what}` : ''} |`; })].join('\n'));
  const line = historyLine(runs, new Date().toISOString().slice(0, 10), set), lessons = lessonsOf(runs);
  console.log(`\nMEANS ${JSON.stringify(line)}\n\nLESSONS\n${lessons.map((l) => `${l.count} x ${l.stage}: ${l.root}`).join('\n')}`);
  writeFileSync(join(dir, 'lessons.md'), lessonsMarkdown(lessons, line));
  if (process.env.GYM_WRITE !== '0' && !pick.length) {
    writeFileSync(resolve('plan/GYM-LESSONS.md'), lessonsMarkdown(lessons, line));
    const hist = resolve('tests/evals/gym-history.json'), before = existsSync(hist) ? JSON.parse(readFileSync(hist, 'utf8')) as GymLine[] : [];
    writeFileSync(hist, `[\n${[...before, line].map((l) => ` ${JSON.stringify(l)}`).join(',\n')}\n]\n`);
  }
}, 7_200_000);
