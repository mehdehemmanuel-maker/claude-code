// Main-thread handle on the physics simulation. Same interface whether physics runs in a worker (default)
// or inline on the main thread (?physics=inline, used for debugging and deterministic tests).

import type { SimSettings } from '../doc/types';
import type { PhysicsOp } from './protocol';
import type { AdvanceResult } from './runner';

export type ResultHandler = (r: AdvanceResult) => void;

export class PhysicsClient {
  private ops: PhysicsOp[] = [];
  private inFlight = false;
  private worker: Worker | null = null;
  private inline: import('./runner').Runner | null = null;
  private handler: ResultHandler = () => {};
  private pendingDt = 0;
  /** Of pendingDt, what had passed when the first of the queued edits was made. */
  private preDt = 0;
  private pendingStep = false;
  readonly mode: 'worker' | 'inline';
  lastError: string | null = null;

  private constructor(mode: 'worker' | 'inline') {
    this.mode = mode;
  }

  static async create(sim: SimSettings, mode: 'worker' | 'inline' = 'worker'): Promise<PhysicsClient> {
    const c = new PhysicsClient(mode);
    if (mode === 'worker') {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      c.worker = worker;
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (e) => {
          const m = e.data;
          if (m.type === 'ready') resolve();
          else if (m.type === 'result') {
            c.inFlight = false;
            c.handler(m.result);
          } else if (m.type === 'error') {
            c.lastError = m.message;
            console.error('[physics worker]', m.message);
            reject(new Error(m.message));
          }
        };
        worker.onerror = (e) => reject(new Error(e.message));
        worker.postMessage({ type: 'init', sim });
      });
    } else {
      const [{ default: initJolt }, { default: wasmUrl }, { Runner }] = await Promise.all([
        import('jolt-physics/wasm'),
        import('jolt-physics/jolt-physics.wasm.wasm?url'),
        import('./runner'),
      ]);
      const J = await initJolt({ locateFile: () => wasmUrl } as never);
      c.inline = Runner.create(J, sim);
    }
    return c;
  }

  onResult(fn: ResultHandler) {
    this.handler = fn;
  }

  send(op: PhysicsOp) {
    // time banked while a step was in flight passed before this edit: it is simulated before it, not after
    if (!this.ops.length) this.preDt = this.pendingDt;
    this.ops.push(op);
  }

  /** Request a physics advance of dt simulated seconds. Worker mode coalesces while a step is in flight. */
  advance(dt: number, singleStep = false) {
    this.pendingDt += dt;
    this.pendingStep ||= singleStep;
    if (this.inFlight) return;
    const ops = this.ops;
    this.ops = [];
    const pre = ops.length ? Math.min(this.preDt, this.pendingDt) : 0;
    const msg = { type: 'advance' as const, pre, ops, dt: this.pendingDt - pre, singleStep: this.pendingStep, maxTicks: 4 };
    this.pendingDt = 0;
    this.preDt = 0;
    this.pendingStep = false;
    if (this.worker) {
      this.inFlight = true;
      this.worker.postMessage(msg);
    } else if (this.inline) {
      this.handler(this.inline.run(msg.pre, ops, msg.dt, msg.maxTicks, msg.singleStep));
    }
  }

  dispose() {
    this.worker?.terminate();
    this.inline?.world.destroy();
  }
}
