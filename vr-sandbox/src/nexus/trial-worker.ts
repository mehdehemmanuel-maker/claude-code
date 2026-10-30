// A worker of the pool (pool.ts): the whole library loaded once, then each trial it is handed run and its outputs sent back.
(globalThis as { __nexusWorker?: boolean }).__nexusWorker = true;
import './seeds';
import { block, register } from './blocks';
import { groupBlock, runnerOf } from './dataflow';
import type { Carry, Job } from './pool';

const runners = new Map<string, ReturnType<typeof runnerOf>>();
async function handle(m: { id: number; job: Job; carry?: Carry }): Promise<unknown> {
  try {
    if (m.carry && !block(m.carry.id)) register(groupBlock(m.carry.graph, { id: m.carry.id, name: m.carry.name, says: m.carry.says ?? '', domains: m.carry.domains ?? ['software'], by: 'you' }));
    const d = block(m.job.block); if (!d) throw new Error(`no block "${m.job.block}" in the library`);
    let r = runners.get(d.id); if (!r) { r = runnerOf(d); runners.set(d.id, r); }
    return { id: m.id, out: await r(m.job.inputs, m.job.set) };
  } catch (e) { return { id: m.id, error: e instanceof Error ? e.message : String(e) }; }
}
if (typeof (globalThis as { importScripts?: unknown }).importScripts === 'function' || typeof (globalThis as { onmessage?: unknown }).onmessage !== 'undefined' && typeof (globalThis as { process?: unknown }).process === 'undefined') {
  const send = (x: unknown) => (globalThis as unknown as { postMessage(x: unknown): void }).postMessage(x);
  globalThis.onmessage = async (e: MessageEvent) => { const r = await handle(e.data) as { id: number }; try { send(r); } catch (err) { send({ id: r.id, error: `its outputs could not be sent back: ${(err as Error).message}` }); } };
} else {
  const { parentPort } = await import(/* @vite-ignore */ 'node:' + 'worker_threads') as typeof import('node:worker_threads');
  parentPort?.on('message', async (m) => { const r = await handle(m) as { id: number }; try { parentPort.postMessage(r); } catch (err) { parentPort.postMessage({ id: r.id, error: `its outputs could not be sent back: ${(err as Error).message}` }); } });
}
