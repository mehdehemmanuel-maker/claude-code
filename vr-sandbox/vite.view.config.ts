import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import { fileURLToPath } from 'node:url';

// The relay: the page asks, this server (Node, where the key is) runs Claude through the node system and answers with
// the board it built, its steps and its answer. The key never reaches the page. Served by `npm run app` (and by
// `vite preview`); a page served without it says so.
const relay = (): Plugin => {
  const agent = fileURLToPath(new URL('./src/nexus/agent.ts', import.meta.url)), seeds = fileURLToPath(new URL('./src/nexus/seeds.ts', import.meta.url));
  const handle = (load: (id: string) => Promise<Record<string, any>>) => async (req: any, res: any, next: () => void) => {
    if (req.url !== '/api/agent' || req.method !== 'POST') return next();
    let body = ''; for await (const c of req) body += c;
    const asked = (() => { try { return JSON.parse(body || '{}'); } catch { return {}; } })(), { request, model, effort, board, blocks, stream, mode, check, failing } = asked;
    // (Assist, decision 0025: one call, a plan back for the page to show, let a person change and run itself; no tool loop,
    // no second model)
    if (mode === 'plan') {
      try { await load(seeds); const m = await load(agent);
        const p = await m.agentPlan(String(request ?? ''), { model, effort, board, failing: Array.isArray(failing) ? failing.map(String) : undefined, blocks, signal: AbortSignal.timeout(90_000) });
        res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(p)); }
      catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: (e as Error).message })); }
      return;
    }
    // (a thing of several things, built from its parts (decision 0027, composeBuild): a split call, a call a part that no
    // library assembly or starter board gives, a join call; each step's line streamed with the board as it stands, then
    // the run with what the calls cost)
    if (mode === 'compose') {
      res.setHeader('Content-Type', 'application/x-ndjson'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Accel-Buffering', 'no');
      const line = (o: unknown) => { if (!res.writableEnded) res.write(`${JSON.stringify(o)}\n`); }, t0 = Date.now(), gone = new AbortController();
      res.on('close', () => { if (!res.writableEnded) gone.abort(); });
      const alive = setInterval(() => line({ alive: Math.round((Date.now() - t0) / 1000) }), 10_000);
      try { await load(seeds); const m = await load(agent), tokens = { in: 0, out: 0, cached: 0, written: 0 };
        const r = await m.composeBuild(String(request ?? ''), { ask: m.sdkAsk({ model, tokens, signal: AbortSignal.any([gone.signal, AbortSignal.timeout(240_000)]) }), features: true, skeleton: true, board, blocks,
          onStep: (s: { stage: string; line: string; ok: boolean }, b: unknown) => line({ compose: s, board: b }) });
        line({ done: { ...r, tokens } }); }
      catch (e) { line({ error: (e as Error).message }); }
      finally { clearInterval(alive); res.end(); }
      return;
    }
    // (streamed, as the phone page asks: a line of JSON for each step as it is taken, with the board as it stands, then the
    // run; a line every 10 s while nothing else is said, so nothing between drops a quiet wait; the page gone, the run stopped.
    // On a phone (decision 0025): at most 16 steps and 120 s, and the second model's check only when asked for)
    if (stream) {
      res.setHeader('Content-Type', 'application/x-ndjson'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Accel-Buffering', 'no');
      const line = (o: unknown) => { if (!res.writableEnded) res.write(`${JSON.stringify(o)}\n`); }, t0 = Date.now(), gone = new AbortController();
      res.on('close', () => { if (!res.writableEnded) gone.abort(); });
      const alive = setInterval(() => line({ alive: Math.round((Date.now() - t0) / 1000) }), 10_000);
      try { await load(seeds); const m = await load(agent);
        const r = await m.agentBuild(String(request ?? ''), { model, effort, board, blocks, seconds: 120, steps: 16, check: check ? undefined : false, signal: AbortSignal.any([gone.signal, AbortSignal.timeout(180_000)]),
          onStep: (s: { tool: string; result: string; ms: number; failed?: true }, b: unknown) => line({ step: { tool: s.tool, result: s.result.slice(0, 400), ms: s.ms, ...(s.failed ? { failed: true } : {}) }, ...(['build', 'open', 'change'].includes(s.tool) && !s.failed ? { board: b } : {}) }),
          onSay: (text: string) => line({ say: text.slice(0, 600) }) });
        line({ done: JSON.parse(m.relayBody(r)) }); }
      catch (e) { line({ error: (e as Error).message }); }
      finally { clearInterval(alive); res.end(); }
      return;
    }
    try { await load(seeds); const m = await load(agent);
      const r = await m.agentBuild(String(request ?? ''), { model, effort, board, blocks, seconds: 180, steps: 40 });
      res.setHeader('Content-Type', 'application/json'); res.end(m.relayBody(r)); }
    catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: (e as Error).message })); }
  };
  let dev: ViteDevServer | undefined;
  return { name: 'nexus-relay', configureServer(s) { dev = s; s.middlewares.use(handle((id) => s.ssrLoadModule(id))); },
    configurePreviewServer(s) { s.middlewares.use(handle(async (id) => (dev ?? (dev = await (await import('vite')).createServer({ configFile: false, root: 'view', server: { middlewareMode: true }, appType: 'custom' }))).ssrLoadModule(id))); } };
};

// The Nexus pages (view/): the dashboard (index.html), the phone page (vibe.html: say what to build, see it built), the
// space (space.html, on a screen or through WebXR in a headset), the part viewer (look.html), the gauntlet
// (gauntlet.html). Relative base, so it runs from any path.
export default defineConfig({
  root: 'view',
  base: './',
  publicDir: 'public',
  // (the pool's workers (src/nexus/pool.ts) as modules: each loads the whole library, and waits on it at its top level)
  worker: { format: 'es' },
  plugins: [relay()],
  // (served to a phone through the session's preview, whose host name is not this machine's)
  preview: { allowedHosts: true },
  build: { outDir: '../dist-view', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000, rollupOptions: { input: { index: 'view/index.html', vibe: 'view/vibe.html', space: 'view/space.html', look: 'view/look.html', nodes: 'view/nodes.html', gauntlet: 'view/gauntlet.html' } } },
});
