// The journal on a file (Node): one entry per line, appended and flushed as it is written, read back whole when a
// runtime opens on it. Nothing is ever rewritten in place.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { Sink } from './journal';

export class FileSink implements Sink {
  constructor(readonly path: string) {}
  load(): unknown[] {
    if (!existsSync(this.path)) return [];
    return readFileSync(this.path, 'utf8').split('\n').filter((l) => l.trim()).map((l, i) => {
      try { return JSON.parse(l) as unknown; } catch { throw new Error(`${this.path}: line ${i + 1} is not an entry`); }
    });
  }
  append(e: unknown) { appendFileSync(this.path, `${JSON.stringify(e)}\n`); }
}
