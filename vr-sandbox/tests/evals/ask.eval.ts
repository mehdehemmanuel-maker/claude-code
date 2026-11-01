// The page shows the AI's near misses (spec 00, task S10): the dashboard driven in a browser, its Ask Claude panel answered
// by the relay's own body (relayBody) of a run the AI's real tools made (toolsFor, callTools, runOf: no model, no stand-in,
// C8), and every near miss that run caught read off the panel as a person sees it: visible, with its kind, beside the
// answer, and still there once the board the answer opened has run. Text pins of the page were widened twelve times and a
// fault was always found one line past them (the evaluator, 2026-11-01): this runs the page instead. Run:
// `npm run eval:ask` (builds the pages first; no key needed).
import { it, expect } from 'vitest';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { callTools, relayBody, runOf, toolsFor, type AgentStep } from '../../src/nexus/agent';
import { emptyBoard } from '../../src/nexus/dataflow';

const DIST = resolve(__dirname, '../../dist-view'), TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

it('the page shows every near miss the run caught, with its kind, beside the answer', async () => {
  expect(existsSync(join(DIST, 'index.html')), 'the pages built (npm run eval:ask builds them)').toBe(true);
  // (a run the real tools make: a build with a refused wire and a node that fails, a card for a block not there, and an
  // answer given past the standing refusal: an error, an error, an error and a reckless near miss)
  const tools = await toolsFor(emptyBoard('asked')), steps: AgentStep[] = [];
  await callTools([{ id: '1', name: 'build', input: { nodes: { a: { b: 'in.number', s: { value: 6 } }, z: { b: 'in.number', s: { value: 0 } }, q: { b: 'math.divide' } }, wires: ['a.value>q.a', 'z.value>q.b', 'a.value>q.nope'] } }, { id: '2', name: 'card', input: { id: 'no.such.block' } }], tools.doTool, steps);
  const run = await runOf({ start: emptyBoard('asked'), board: tools.board(), steps, answer: 'Done: the quotient is on the board.', model: 'none (the real tools, no model)', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: tools.made });
  expect(run.nearMisses.map((m) => m.kind), 'the run caught them').toEqual(['error', 'error', 'error', 'reckless']);
  const body = relayBody(run);
  const server = createServer((req, res) => { const p = join(DIST, decodeURIComponent((req.url ?? '/').split('?')[0]!) === '/' ? 'index.html' : decodeURIComponent((req.url ?? '/').split('?')[0]!));
    if (!p.startsWith(DIST) || !existsSync(p) || statSync(p).isDirectory()) { res.statusCode = 404; res.end(); return; } res.setHeader('Content-Type', TYPES[extname(p)] ?? 'application/octet-stream'); res.end(readFileSync(p)); });
  await new Promise<void>((ok) => server.listen(0, ok)); const port = (server.address() as { port: number }).port;
  // (Playwright as the headset's run loads it: preinstalled, found by require, not by import)
  const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: { launch: () => Promise<any> } }; const browser = await chromium.launch(); // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); let asked = 0;
    // (the relay answers with its own body for this run: what the page is sent, exactly)
    await page.route('**/api/agent', (r: { fulfill: (o: unknown) => Promise<void> }) => { asked++; return r.fulfill({ status: 200, contentType: 'application/json', body }); });
    await page.goto(`http://127.0.0.1:${port}/index.html`); await page.waitForSelector('#iAskGo', { timeout: 60_000 });
    await page.fill('#iAsk', 'Divide six by zero and tell me the quotient.'); await page.click('#iAskGo');
    await page.waitForFunction(() => /Near misses caught/.test(document.getElementById('iAskOut')?.innerText ?? ''), null, { timeout: 30_000 });
    // (and once the board the answer opened has run and the panel has been drawn again)
    await page.waitForTimeout(3000);
    const seen = await page.evaluate(() => { const o = document.getElementById('iAskOut'); if (!o) return null; o.querySelectorAll('details').forEach((d) => { (d as HTMLDetailsElement).open = true; }); const r = o.getBoundingClientRect(), cs = getComputedStyle(o);
      return { text: o.innerText, visible: !o.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0, open: !!o.querySelector('details[open]') }; });
    expect(asked, 'the page asked the relay once').toBe(1); expect(seen, 'the Ask Claude panel is there').toBeTruthy(); expect(seen!.visible, 'and seen').toBe(true);
    expect(seen!.text, 'the answer beside them').toContain('the quotient is on the board');
    expect(seen!.text, 'their count, each kind').toContain(`Near misses caught: ${run.nearMisses.length} (3 error, 0 at-risk, 1 reckless)`);
    // (each read as its kind and then what it was, as the panel draws it: "error wire a.value>q.nope: …")
    const flat = seen!.text.replace(/\s+/g, ' ');
    for (const m of run.nearMisses) expect(flat, `the ${m.kind} near miss "${m.what.slice(0, 40)}" shown with its kind`).toContain(`${m.kind} ${m.what.replace(/\s+/g, ' ').slice(0, 50)}`);
    console.log(`the panel shows: ${seen!.text.replace(/\s+/g, ' ').slice(0, 400)}`);
  } finally { await browser.close(); server.close(); }
}, 180_000);
