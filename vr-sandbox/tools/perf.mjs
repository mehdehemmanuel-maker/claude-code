// `npm run perf` — the half of the measuring tool that runs vitest rather than the engine (the other half, the benches
// and the dumps, is src/nexus/cli/perf-main.ts, built by vite like every other command here).
//
//   npm run perf -- time [pattern]     every test file's own time, longest first, and the ten slowest tests
//   npm run perf -- profile <file>     a sampled profile from inside the worker (vitest's workers swallow --cpu-prof),
//                                      the top of it by self time
//   npm run perf -- bench [case]       a fixed workload, the least of three runs
//   npm run perf -- dump [case]        every generator's numbers as one hash a case: the proof a refactor changed none
//
// Why this exists: five rounds in a row opened by hand-writing a probe test that printed what the engine costs or what
// it makes, and then deleting it. CLAUDE.md: a thing worked out by hand twice is a tool.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [verb, ...rest] = process.argv.slice(2);
const run = (cmd, args, env) => execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
const quiet = (cmd, args, env) => { try { execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, ...env } }); } catch { /* a failing test still leaves its times */ } };

if (verb === 'time') {
  quiet('npx', ['vitest', 'run', ...rest, '--reporter=json']);
  const out = JSON.parse(readFileSync('.vitest/json/output.json', 'utf8'));
  const files = out.testResults.map((f) => ({ name: f.name.split('/').pop(), ms: (f.endTime ?? 0) - (f.startTime ?? 0), tests: f.assertionResults })).sort((a, b) => b.ms - a.ms);
  const total = files.reduce((s, f) => s + f.ms, 0);
  console.log(`${files.length} files, ${(total / 1000).toFixed(0)} s of test time\n`);
  for (const f of files.slice(0, 25)) console.log(`${(f.ms / 1000).toFixed(1).padStart(7)} s  ${f.name}`);
  const tests = files.flatMap((f) => f.tests.map((t) => ({ ms: t.duration ?? 0, name: `${f.name} › ${t.title}` }))).sort((a, b) => b.ms - a.ms);
  console.log('\nthe slowest tests:');
  for (const t of tests.slice(0, 10)) console.log(`${(t.ms / 1000).toFixed(1).padStart(7)} s  ${t.name.slice(0, 110)}`);
} else if (verb === 'profile') {
  if (!rest.length) { console.error('which test file?'); process.exit(1); }
  const dir = mkdtempSync(join(tmpdir(), 'perf-'));
  run('npx', ['vitest', 'run', ...rest], { PERF_PROFILE: dir });
  for (const f of rest) {
    const path = join(dir, `${f.split('/').pop()}.txt`);
    if (existsSync(path)) console.log(`\n${readFileSync(path, 'utf8')}`);
    else console.log(`\n(no profile for ${f}: is it a test file this run executed?)`);
  }
} else if (verb === 'bench' || verb === 'dump' || verb === 'cases') {
  run('npx', ['vite', 'build', '--config', 'vite.nexus.config.ts', '--logLevel', 'error']);
  run('node', ['dist-nexus/perf.mjs', verb === 'cases' ? 'help' : verb, ...rest]);
} else {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
}
