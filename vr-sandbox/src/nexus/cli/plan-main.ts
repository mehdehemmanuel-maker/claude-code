// `npm run plan` — the fast plan: an invention sketched as labelled blocks and pins, printed, weighed, and thrown at
// the works, before anything in it is designed.
//
// It is the sketch's own door (src/nexus/ask/sketch.ts), written for the same reason as `npm run works` and
// `npm run machine`: the alternative is a throwaway test whose only job is to print what the engine says.
//
//   npm run plan -- <file>            the plan read, said back, and its envelope and mass
//   npm run plan -- <file> works      and what the $3,000 works would have to do to build it
//   npm run plan -- <file> bill       its bill of materials alone
//   echo "..." | npm run plan -- -    the plan on standard input
import { readFileSync } from 'node:fs';
import { sketchOf, sketchText } from '../ask/sketch';
import { billOfSketch, jobText, planJob, worksUnder } from '../works';

const args = process.argv.slice(2);
const src = args[0] && args[0] !== '-' ? readFileSync(args[0], 'utf8') : readFileSync(0, 'utf8');
const s = sketchOf(src);
console.log(sketchText(s));
const bill = billOfSketch(s);
if (args.includes('bill')) {
  console.log('\nbill of materials');
  for (const l of bill) console.log(`  ${String(l.n).padStart(3)} × ${l.name}  ${l.size ? l.size.join(' × ') + ' mm' : '(no size)'}  ${l.mat}${l.cm3 ? `  ${l.cm3} cm³` : ''}`);
}
if (args.includes('works')) {
  console.log('');
  console.log(jobText(planJob(s.title, bill, worksUnder(3000).ids)));
}
