// Main-thread handle on the physics simulation. Same interface whether physics runs in a worker (default)
// or inline on the main thread (?physics=inline, used for debugging and deterministic tests).

import type { SimSettings } from '../doc/types';
import type { PhysicsOp } from './protocol';
import type { AdvanceResult } from './runner';
import type { StandResult, StandSetup } from './stand';

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
  /** Stand runs asked of the worker, waiting for their result, by id. */
  private stands = new Map<number, { resolve: (r: StandResult) => void; reject: (e: Error) => void }>();
  private standSeq = 0;
  /** The Jolt module, kept in inline mode so a stand can run a world of its own here. */
  private jolt: unknown = null;

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
          else if (m.type === 'stand') {
            const p = c.stands.get(m.id);
            c.stands.delete(m.id);
            p?.resolve(m.result as StandResult);
          } else if (m.type === 'result') {
            c.inFlight = false;
            c.handler(m.result);
          } else if (m.type === 'error') {
            c.lastError = m.message;
            console.error('[physics worker]', m.message);
            for (const p of c.stands.values()) p.reject(new Error(m.message));
            c.stands.clear();
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
      c.jolt = J;
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

  /**
   * A test on the stand (stand.ts): a world of its own with the same physics, in the worker beside the live world (the
   * frame never waits on it), or here in inline mode. The result comes back once, whole.
   */
  async stand(setup: StandSetup): Promise<StandResult> {
    if (this.worker) {
      const id = ++this.standSeq;
      const worker = this.worker;
      return new Promise<StandResult>((resolve, reject) => { this.stands.set(id, { resolve, reject }); worker.postMessage({ type: 'stand', id, setup }); });
    }
    const [{ PhysicsWorld }, { runStand }] = await Promise.all([import('./world'), import('./stand')]);
    const world = new PhysicsWorld(this.jolt as ConstructorParameters<typeof PhysicsWorld>[0], setup.sim);
    try { return runStand(world, setup); } finally { world.destroy(); }
  }

  dispose() {
    this.worker?.terminate();
    this.inline?.world.destroy();
  }
}
