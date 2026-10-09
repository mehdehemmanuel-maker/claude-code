// The breakdown queue as a program: every item in the inventory, and every size the catalogue sells, stored and broken
// down; what waits written as a report to work through.
// Run: npm run breakdown -- [report.md]

import { writeFileSync } from 'node:fs';
import { breakdown, sayBreakdown } from './breakdown';
import { catalogue } from './catalogue';
import { resolve } from './inventory';

for (const l of catalogue()) resolve(l);
const b = breakdown(), text = sayBreakdown(b), out = process.argv[2];
if (out) { writeFileSync(out, text); console.log(`${b.taken} taken, ${b.broken} broken down, ${b.made.length} made, ${b.waiting.length} waiting: ${out}`); }
else console.log(text);
