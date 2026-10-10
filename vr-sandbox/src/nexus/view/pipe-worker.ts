// The pipeline, run off the page's own thread: a roof of hundreds of parts takes minutes to grow and make, and the room
// in the headset must not stop while it does. The physics is loaded here once, the first time a run asks for it.

import { runPipeline, type PipeEdits, type PipeWhere } from '../substrate/pipe';
import type { Jolt } from '../substrate/realize';

let J: Promise<Jolt> | null = null;
self.onmessage = async (e: MessageEvent<{ id: number; ask: string; edits: PipeEdits; where?: PipeWhere }>) => {
  const { id, ask, edits, where } = e.data;
  try {
    const phys = edits.physics ? await (J ??= import('jolt-physics/wasm-compat').then((m) => m.default() as unknown as Promise<Jolt>)) : null;
    self.postMessage({ id, run: runPipeline(ask, edits, phys, where ?? {}) });
  } catch (err) { self.postMessage({ id, error: (err as Error).message }); }
};
