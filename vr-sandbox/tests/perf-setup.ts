// A sampled profile from inside the worker, for `npm run perf -- profile <test file>`. vitest's workers swallow
// node's own --cpu-prof (it profiles the runner's processes, which come out 96 % idle in module loading), so the
// profiler is started in the worker that actually runs the tests. Inert unless PERF_PROFILE names a directory: the
// gate loads this file for every one of its 171 test files and must pay nothing for it.

import { afterAll, beforeAll } from 'vitest';

const dir = process.env.PERF_PROFILE;
if (dir) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any, post: (m: string, p?: object) => Promise<any>;
  beforeAll(async () => {
    const { Session } = await import('node:inspector');
    session = new Session(); session.connect();
    post = (m, p) => new Promise((res, rej) => session.post(m, p as never, (e: unknown, r: unknown) => (e ? rej(e) : res(r))));
    await post('Profiler.enable'); await post('Profiler.setSamplingInterval', { interval: 200 }); await post('Profiler.start');
  });
  afterAll(async () => {
    const { profile } = await post('Profiler.stop');
    const { appendFileSync } = await import('node:fs'), { join } = await import('node:path');
    const by = new Map<number, { functionName: string; url: string; lineNumber: number }>();
    for (const n of profile.nodes) by.set(n.id, n.callFrame);
    const hits = new Map<number, number>();
    for (const id of profile.samples) hits.set(id, (hits.get(id) ?? 0) + 1);
    const self = new Map<string, number>(), total = profile.samples.length;
    for (const [id, n] of hits) {
      const f = by.get(id); if (!f) continue;
      const key = `${f.functionName || '(anon)'} ${String(f.url).replace(/^.*vr-sandbox\//, '')}`;
      self.set(key, (self.get(key) ?? 0) + n);
    }
    const file = (globalThis as { __vitest_worker__?: { filepath?: string } }).__vitest_worker__?.filepath ?? 'run';
    const lines = [`${total} samples at 200 µs over ${((total * 200) / 1e6).toFixed(1)} s of ${file.split('/').pop()}`];
    for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 30)) lines.push(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`);
    appendFileSync(join(dir, `${file.split('/').pop()}.txt`), lines.join('\n') + '\n');
  });
}
