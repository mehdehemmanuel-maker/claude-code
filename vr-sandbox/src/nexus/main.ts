// Nexus, running: a runtime opened on a journal file, fed by the text channel on standard input, answering on
// standard output. Stop it at any point and start it again on the same journal: the state is rebuilt from it.
//
//   npm run nexus -- path/to/journal.jsonl < lines.jsonl

import { createInterface } from 'node:readline';
import { answer, project, read } from './channel-text';
import { Runtime } from './runtime';
import { FileSink } from './sink-file';

const path = process.argv[2];
if (!path) { process.stderr.write('usage: npm run nexus -- <journal.jsonl>\n'); process.exit(2); }
const rt = Runtime.open(new FileSink(path));
process.stdout.write(`opened ${path}: ${rt.journal.contributions().length} contributions, ${rt.addresses().length} addresses bound, ${rt.gaps().length} gaps\n`);

const lines = createInterface({ input: process.stdin, terminal: false });
lines.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const m = read(line);
    const out = 'contribution' in m ? project(rt, rt.admit(m.contribution)) : answer(rt, m);
    process.stdout.write(`${out.join('\n')}\n`);
  } catch (err) {
    process.stdout.write(`refused: ${(err as Error).message}\n`);
  }
});
