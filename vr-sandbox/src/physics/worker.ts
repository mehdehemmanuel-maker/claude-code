/// <reference lib="webworker" />
// Physics Web Worker: owns the Jolt world so the render thread never waits on simulation.

import initJolt from 'jolt-physics/wasm';
import wasmUrl from 'jolt-physics/jolt-physics.wasm.wasm?url';
import type { SimSettings } from '../doc/types';
import type { PhysicsOp } from './protocol';
import { Runner } from './runner';

export type ToWorker =
  | { type: 'init'; sim: SimSettings }
  | { type: 'advance'; ops: PhysicsOp[]; dt: number; singleStep: boolean; maxTicks: number };

let runner: Runner | null = null;
const queue: MessageEvent<ToWorker>[] = [];
let ready = false;

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(msg, transfer);

async function handle(msg: ToWorker) {
  if (msg.type === 'init') {
    const J = await initJolt({ locateFile: () => wasmUrl } as never);
    runner = Runner.create(J, msg.sim);
    ready = true;
    post({ type: 'ready' });
    for (const q of queue.splice(0)) await handle(q.data);
    return;
  }
  if (!ready || !runner) {
    return;
  }
  runner.apply(msg.ops);
  const r = runner.advance(msg.dt, msg.maxTicks, msg.singleStep);
  // The runner keeps its arrays for interpolation, so transfer copies (a few KB).
  const result = { ...r, transforms: r.transforms.slice(), prevTransforms: r.prevTransforms.slice(), velocities: r.velocities.slice() };
  post({ type: 'result', result }, [result.transforms.buffer, result.prevTransforms.buffer, result.velocities.buffer]);
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  if (!ready && e.data.type !== 'init') {
    queue.push(e);
    return;
  }
  handle(e.data).catch((err) => post({ type: 'error', message: String(err?.stack ?? err) }));
};
