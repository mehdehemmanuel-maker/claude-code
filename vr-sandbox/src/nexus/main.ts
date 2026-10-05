// Nexus, running: a runtime opened on a journal file, fed by the text channel on standard input, answering on
// standard output. Stop it at any point and start it again on the same journal: the state is rebuilt from it.
//
//   npm run nexus -- path/to/journal.jsonl < lines.jsonl

import { createInterface } from 'node:readline';
import { answer, project, read, tune } from './channel-text';
import { evolve, notAtRest } from './evolve';
import type { Jolt } from './realize';
import { Runtime } from './runtime';
import { FileSink } from './sink-file';

// a reader that stops reading ends the process, not the state: the journal is already written
process.stdout.on('error', (err: NodeJS.ErrnoException) => { if (err.code === 'EPIPE') process.exit(0); throw err; });

const path = process.argv[2];
if (!path) { process.stderr.write('usage: npm run nexus -- <journal.jsonl>\n'); process.exit(2); }
const rt = Runtime.open(new FileSink(path));
process.stdout.write(`opened ${path}: ${rt.journal.contributions().length} contributions, ${rt.addresses().length} addresses bound, ${rt.gaps().length} gaps\n`);

// the kernel is loaded the first time something is evolved
let kernel: Promise<Jolt> | null = null;
const jolt = () => (kernel ??= import('jolt-physics/wasm-compat').then((m) => m.default() as Promise<Jolt>));

async function handle(line: string): Promise<string[]> {
  const m = read(line);
  if ('contribution' in m) return project(rt, rt.admit(m.contribution));
  if ('contributions' in m) return m.contributions.flatMap((c) => project(rt, rt.admit(c)));
  if ('tune' in m) return tune(m.tune);
  if ('evolve' in m) {
    const moving = notAtRest(rt);
    const e = evolve(await jolt(), rt);
    if (e.refused.length) return e.refused.map((r) => `refused: ${r.place} cannot be realized: ${r.because}`);
    const head = [`evolved ${e.seconds.toFixed(3)} s in the kernel (${e.still ? 'still' : 'not still within its patience'}); not at rest before: ${moving.join(', ') || 'none'}`];
    head.push(...e.moved.map((x) => `moved ${x.place}: ${(x.distance * 1000).toFixed(1)} mm, turned ${(x.angle * 180 / Math.PI).toFixed(1)}°`));
    return [...head, ...e.contributions.flatMap((c) => project(rt, rt.admit(c)))];
  }
  return answer(rt, m);
}

// lines are handled in order, each after the one before has finished
let queue = Promise.resolve();
const lines = createInterface({ input: process.stdin, terminal: false });
lines.on('line', (line) => {
  if (!line.trim()) return;
  queue = queue.then(() => handle(line)).then(
    (out) => { process.stdout.write(`${out.join('\n')}\n`); },
    (err) => { process.stdout.write(`refused: ${(err as Error).message}\n`); },
  );
});
