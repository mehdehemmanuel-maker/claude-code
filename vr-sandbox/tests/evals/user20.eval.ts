// The user's own twenty requests (2026-11-10, in their words, docs/WANTED.md): each built by composeBuild with the real
// model, its board, steps and what the pipeline itself says is unmet kept in EVAL_DIR, to be photographed and judged by
// eye (no pattern scores these: the user judges the pictures). Run: `EVAL_DIR=<dir> npx vitest run --config
// vitest.eval.config.ts tests/evals/user20.eval.ts` (needs ANTHROPIC_API_KEY; costs real tokens); `EVAL_PICK=3,7` some.
// The pipeline is given an eye (`look`, decision 0029 wave 14): the built viewer (built once into EVAL_VIEW, or a
// directory under EVAL_DIR; an EVAL_VIEW already built is used as it is) served on a port from 5900 to 5999, each board
// opened in it by Playwright (one browser for the run; EVAL_PLAYWRIGHT names the module where it is not installed here)
// and its 3D view photographed; each request's final picture is kept as <k>.png. EVAL_LOOK=0 runs without the eye.
import { it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { composeBuild, sdkAsk } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { nodesOf, type Board } from '../../src/nexus/boards';

export const USER20 = ['One-Cubic-Meter Foam 3D Printer', 'Robotic Arm RC Car', 'Turret Go-Kart', 'Miniature RC Forklift', 'Transforming Furniture', 'RC Bulldozer', 'Kinetic Sculpture Machine', 'Giant Robotic Spider', 'Industrial Giant Claw', 'Personal Hovercraft',
  'RC Excavator Factory', 'Robotic Paint Booth', 'Mechanical Dinosaur', 'Automatic Sorting Machine', 'Wearable Third Arm', 'Follow-Me Cargo Robot', 'Rolling Robot Sphere', 'Portable Deployable Bridge', 'Modular RC Utility Vehicle', 'Pneumatic Walking Machine'];

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.md': 'text/plain' };
type Page = { on(e: string, f: (x: Error) => void): void; setDefaultTimeout(ms: number): void; addInitScript(f: (bd: string) => void, a: string): Promise<void>; goto(u: string): Promise<unknown>; waitForTimeout(ms: number): Promise<void>; evaluate<T>(f: () => T): Promise<T>; click(s: string): Promise<void>; $(s: string): Promise<{ screenshot(o: { type: 'png' }): Promise<Uint8Array> } | null>; close(): Promise<void> };
type Browser = { newPage(o: unknown): Promise<Page>; close(): Promise<void> };

/** The eye: the built viewer served here, one browser; `shot` opens a board in it (through localStorage, as the app
 *  keeps its board) and photographs the 3D view. */
async function eye(dir: string): Promise<{ shot: (board: Board) => Promise<{ png: Uint8Array } | undefined>; close: () => Promise<void> }> {
  const dist = resolve(process.env.EVAL_VIEW ?? join(dir, 'view'));
  if (!existsSync(join(dist, 'index.html'))) execFileSync('npx', ['vite', 'build', '--config', 'vite.view.config.ts', '--logLevel', 'error', '--outDir', dist], { stdio: 'inherit' });
  const server: Server = createServer((req, res) => { const u = decodeURIComponent((req.url ?? '/').split('?')[0]!), p = join(dist, u === '/' ? 'index.html' : u);
    if (!p.startsWith(dist) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  let port = 0;
  for (let p = 5971; p <= 5999 && !port; p++) await new Promise<void>((ok) => { server.once('error', () => ok()); server.listen(p, '127.0.0.1', () => { port = p; ok(); }); });
  if (!port) throw new Error('no free port from 5971 to 5999 for the viewer');
  const { chromium } = createRequire(import.meta.url)(process.env.EVAL_PLAYWRIGHT || 'playwright') as { chromium: { launch(): Promise<Browser> } }, browser = await chromium.launch();
  const shot = async (board: Board) => {
    const p = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 }); p.setDefaultTimeout(60_000);
    try {
      await p.addInitScript((bd) => { try { localStorage.clear(); localStorage.setItem('nexus.nodeboard.v1', bd); localStorage.setItem('nexus.nodeboard.chosen.v1', '1'); } catch { /* a page with no storage shows nothing */ } }, JSON.stringify(board));
      await p.goto(`http://127.0.0.1:${port}/index.html?full`); await p.waitForTimeout(1500);
      const tw = Date.now(); let calm = 0;
      while (Date.now() < tw + 90_000) { const settled = await p.evaluate(() => (window as unknown as { nexusNodes?: { settled?: () => boolean } }).nexusNodes?.settled?.() ?? false); calm = settled ? (calm || Date.now()) : 0; if (calm && Date.now() - calm > 1200) break; await p.waitForTimeout(300); }
      await p.click('#enter3d').catch(() => {}); await p.waitForTimeout(800); await p.click('#fit3d').catch(() => {}); await p.waitForTimeout(2500);
      const canvas = await p.$('#dock canvas'); if (!canvas) return undefined;
      return { png: new Uint8Array(await canvas.screenshot({ type: 'png' })) };
    } finally { await p.close(); }
  };
  return { shot, close: async () => { await browser.close(); server.close(); } };
}

it('the user\'s twenty requests, built', async () => {
  const dir = process.env.EVAL_DIR ?? '.'; mkdirSync(dir, { recursive: true });
  const pick = (process.env.EVAL_PICK ?? '').split(',').map(Number).filter(Boolean), model = process.env.EVAL_MODEL || undefined;
  const todo = USER20.map((r, k) => [r, k + 1] as const).filter(([, k]) => !pick.length || pick.includes(k));
  const see = process.env.EVAL_LOOK === '0' ? undefined : await eye(dir);
  const one = async (req: string, k: number) => {
    const t0 = Date.now(), tokens = { in: 0, out: 0, cached: 0, written: 0 }; let row: Record<string, unknown>;
    try {
      const r = await composeBuild(req, { ask: sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(600_000) }), ...(see ? { look: see.shot } : {}) });
      const e = new Engine(r.board); await e.run();
      const bad = nodesOf(r.board).filter((n) => e.state.get(n.id)?.status !== 'ok').map((n) => `${n.id}: ${String(e.state.get(n.id)?.error ?? e.state.get(n.id)?.status).slice(0, 120)}`);
      writeFileSync(join(dir, `${k}.board.json`), JSON.stringify(r.board));
      // (the final picture: the board as it was returned, photographed once more)
      const last = await see?.shot(r.board).catch(() => undefined); if (last) writeFileSync(join(dir, `${k}.png`), last.png);
      row = { k, request: req, asks: r.asks, nodes: nodesOf(r.board).length, bad, unmet: r.unmet, works: (r as { works?: unknown }).works ?? null, features: r.features ?? null, size: r.size ?? null, looks: r.looks ?? 0, picture: !!last, parts: r.parts.map((p) => `${p.name} (${p.by ?? '?'})`), steps: r.steps, ...tokens, s: +((Date.now() - t0) / 1000).toFixed(0) };
    } catch (x) { row = { k, request: req, failed: (x as Error).message.slice(0, 300), ...tokens, s: +((Date.now() - t0) / 1000).toFixed(0) }; }
    writeFileSync(join(dir, `${k}.json`), JSON.stringify(row, null, 1));
    console.log(`DONE ${k}. ${req} | ${row.failed ? `FAILED ${row.failed}` : `asks ${row.asks}, nodes ${row.nodes}, bad ${(row.bad as string[]).length}, unmet ${(row.unmet as string[]).length}, looks ${row.looks}`} | ${row.s} s`);
  };
  try { for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map(([r, k]) => one(r, k))); }
  finally { await see?.close(); }
}, 7_200_000);
