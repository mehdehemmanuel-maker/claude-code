// A round, run as a process: intents the manifold draws for itself, each generated from nothing.
//
//   npm run nexus:round -- [seed] [count] [bar]

import { report, runRound } from './round';

const [seed = '1', count = '200', bar = '2'] = process.argv.slice(2);
process.stdout.on('error', (err: NodeJS.ErrnoException) => { if (err.code === 'EPIPE') process.exit(0); throw err; });
process.stdout.write(`${report(runRound(Number(seed), Number(count), Number(bar))).join('\n')}\n`);
