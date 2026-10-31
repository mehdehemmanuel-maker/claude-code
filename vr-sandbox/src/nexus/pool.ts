// Run many at once: trials of any block (a fit's, a sweep's, variants', a trade-off's, a sensitivity's) handed to workers,
// one for each core the machine has, each holding the whole library, so a batch whose trials are known before any of them
// runs is worked out side by side. In the page they are Web Workers; under Node (the tests, a script) worker threads, the
// worker bundled once by rolldown (Vite's own) into node_modules/.cache. A batch goes to the workers only when that pays:
// its first trial is timed where it is, and the rest go out only if they would take longer than a worker takes to start
// (it loads the library), so a law's trials stay where they are and an engine's go wide. Inside a worker a batch is run
// where it is (no workers within workers).
import type { Outputs } from './blocks';
import type { Board } from './boards';

export interface Job { block: string; inputs: Record<string, unknown>; set: Record<string, unknown> }
/** What a worker needs to run a block that is not built in (a pipeline folded by you): its board and its name. */
export interface Carry { id: string; name: string; graph: Board; says?: string; domains?: string[] }
type Reply = { id: number; out?: Outputs; error?: string };
interface Hand { post(m: unknown): void; on(f: (r: Reply) => void): void; stop(): void }

// (asked when a batch runs, not when this loads: a worker's imports load before it marks itself one)
const inWorker = (): boolean => typeof (globalThis as { importScripts?: unknown }).importScripts === 'function' || (globalThis as { __nexusWorker?: boolean }).__nexusWorker === true;
const isNode = typeof process !== 'undefined' && !!process.versions?.node && typeof (globalThis as { window?: unknown }).window === 'undefined';
/** Four workers took 825 ms to start and take their first trials under Node, the bundle kept (1,960 ms bundling it first),
 *  measured 2026-10-30 on 4 cores; a batch goes wide only when it would save more than this. */
export const START_MS = 800;

let hands: Hand[] = [], starting: Promise<Hand[]> | null = null, seq = 0;
const waiting = new Map<number, { ok: (o: Outputs) => void; no: (e: Error) => void }>();
const reply = (r: Reply) => { const w = waiting.get(r.id); if (!w) return; waiting.delete(r.id); if (r.error !== undefined) w.no(new Error(r.error)); else w.ok(r.out!); };

/** Everything run on one thread (NEXUS_ONE_THREAD=1 under Node): to measure what the workers gain against. */
const oneThread = (): boolean => isNode && !!process.env.NEXUS_ONE_THREAD;
/** How many trials can run at once here. */
export async function cores(): Promise<number> {
  if (isNode) { const os = await import(/* @vite-ignore */ 'node:' + 'os') as { availableParallelism?: () => number; cpus: () => unknown[] }; return os.availableParallelism?.() ?? os.cpus().length; }
  return (globalThis as { navigator?: { hardwareConcurrency?: number } }).navigator?.hardwareConcurrency ?? 1;
}
async function nodeHands(n: number): Promise<Hand[]> {
  const { Worker } = await import(/* @vite-ignore */ 'node:' + 'worker_threads') as typeof import('node:worker_threads');
  const path = await import(/* @vite-ignore */ 'node:' + 'path') as typeof import('node:path'), url = await import(/* @vite-ignore */ 'node:' + 'url') as typeof import('node:url'), fs = await import(/* @vite-ignore */ 'node:' + 'fs') as typeof import('node:fs');
  const here = path.dirname(url.fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), out = path.join(root, 'node_modules/.cache/nexus-trial-worker.mjs'), src = path.join(here, 'trial-worker.ts');
  // (bundled again when the source of anything it runs is newer than the bundle)
  const newest = (d: string): number => fs.readdirSync(d, { withFileTypes: true }).reduce((m, e) => Math.max(m, e.isDirectory() ? newest(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).mtimeMs), 0);
  if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < Math.max(newest(path.join(root, 'src')))) {
    const { build } = await import(/* @vite-ignore */ 'roll' + 'down') as { build(o: object): Promise<unknown> };
    await build({ input: src, platform: 'node', external: (id: string) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'), output: { file: out, format: 'esm', codeSplitting: false }, logLevel: 'silent' });
  }
  // (a worker that cannot start, or dies, fails what was waiting on the pool with why, and the pool is made again: never
  // a wait that does not end)
  return Array.from({ length: n }, () => { const w = new Worker(out); w.unref(); w.on('error', (e) => { const why = `a worker failed: ${(e as Error).message}`; for (const [id, x] of [...waiting]) { waiting.delete(id); x.no(new Error(why)); } hands = []; starting = null; }); return { post: (m) => w.postMessage(m), on: (f) => w.on('message', f), stop: () => void w.terminate() }; });
}
function pageHands(n: number): Hand[] {
  return Array.from({ length: n }, () => { const w = new Worker(new URL('./trial-worker.ts', import.meta.url), { type: 'module' }); return { post: (m) => w.postMessage(m), on: (f) => { w.onmessage = (e: MessageEvent<Reply>) => f(e.data); }, stop: () => w.terminate() }; });
}
async function pool(): Promise<Hand[]> {
  if (hands.length) return hands;
  starting ??= (async () => { const n = Math.max(1, await cores()); const h = isNode ? await nodeHands(n) : pageHands(n); for (const x of h) x.on(reply); hands = h; return h; })();
  return starting;
}

export interface ManyOptions { /** Run here, never on workers. */ here?: boolean; /** On the workers whatever the first trial took (a batch known to be long: every build in the library). */ wide?: boolean; /** A block not built in, carried to the workers. */ carry?: Carry }
export interface Many { results: (Outputs | Error)[]; wide: boolean; workers: number; ms: number }
/** Every job run, side by side where it pays, each its outputs or what went wrong, in the order given. `one` runs a job
 *  where it is (the caller's own runner, with what it keeps). */
export async function runMany(jobs: Job[], one: (j: Job) => Promise<Outputs>, o: ManyOptions = {}): Promise<Many> {
  const t0 = performance.now(), results: (Outputs | Error)[] = new Array(jobs.length);
  const here = async (k: number) => { try { results[k] = await one(jobs[k]!); } catch (e) { results[k] = e instanceof Error ? e : new Error(String(e)); } };
  if (!jobs.length) return { results, wide: false, workers: 0, ms: 0 };
  await here(0); const each = performance.now() - t0, n = inWorker() || o.here || oneThread() ? 1 : await cores();
  // (wide only when the rest, one after another, would take longer than starting the workers and running them side by side)
  const wide = n > 1 && jobs.length > 2 && (o.wide ||hands.length ? each * (jobs.length - 1) > 50 : each * (jobs.length - 1) > START_MS + (each * (jobs.length - 1)) / n);
  if (!wide) { for (let k = 1; k < jobs.length; k++) await here(k); return { results, wide: false, workers: 1, ms: performance.now() - t0 }; }
  const hs = await pool(); let next = 1;
  await Promise.all(hs.map(async (h) => { while (next < jobs.length) { const k = next++, id = ++seq;
    try { results[k] = await new Promise<Outputs>((ok, no) => { waiting.set(id, { ok, no }); h.post({ id, job: jobs[k], carry: o.carry }); }); } catch (e) { results[k] = e as Error; } } }));
  return { results, wide: true, workers: hs.length, ms: performance.now() - t0 };
}
