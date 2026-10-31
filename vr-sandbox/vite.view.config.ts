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
    try { const { request, model, effort } = JSON.parse(body || '{}'); await load(seeds); const m = await load(agent);
      const r = await m.agentBuild(String(request ?? ''), { model, effort, seconds: 180, steps: 40 });
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(r)); }
    catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: (e as Error).message })); }
  };
  let dev: ViteDevServer | undefined;
  return { name: 'nexus-relay', configureServer(s) { dev = s; s.middlewares.use(handle((id) => s.ssrLoadModule(id))); },
    configurePreviewServer(s) { s.middlewares.use(handle(async (id) => (dev ?? (dev = await (await import('vite')).createServer({ configFile: false, root: 'view', server: { middlewareMode: true }, appType: 'custom' }))).ssrLoadModule(id))); } };
};

// The Nexus pages (view/): the dashboard (index.html), the space (space.html, on a screen or through WebXR in a
// headset), the part viewer (look.html), the gauntlet (gauntlet.html). Relative base, so it runs from any path.
export default defineConfig({
  root: 'view',
  base: './',
  publicDir: 'public',
  // (the pool's workers (src/nexus/pool.ts) as modules: each loads the whole library, and waits on it at its top level)
  worker: { format: 'es' },
  plugins: [relay()],
  build: { outDir: '../dist-view', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 4000, rollupOptions: { input: { index: 'view/index.html', space: 'view/space.html', look: 'view/look.html', nodes: 'view/nodes.html', gauntlet: 'view/gauntlet.html' } } },
});
