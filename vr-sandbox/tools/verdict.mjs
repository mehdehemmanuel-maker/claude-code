// EVERY CHECK SAYS PASS OR FAIL AS ITS LAST LINE — and says how much work it did, because an exit code alone cannot.
//
// `npm run tidy 2>&1 | tail -3` once "verified" this project while the gate failed on the same rule, because **a pipe
// replaces the exit status**: the command exits with `tail`'s 0 whatever the check did, so it could not fail at any
// truncation. `tail -100` would have passed too. Banning the pipe bans a spelling — `npm run tidy > /tmp/x;
// tail -3 /tmp/x` has none and fails the same way — so instead the mistake is removed: the last line is the answer.
//
// THE VERDICT COMES FROM THE EXIT STATUS, never from the child's own words, because a check that reports on itself is
// the fault one level up. But an exit status alone is a check that cannot fail:
//
//     vitest run tests/nexus/tidy.test.ts -t "no_such_name"  →  16 skipped, 0 run, exit 0  →  "TIDY: PASS"
//
// sixteen skipped, nothing run, and a pass with my name on it (docs/MANNY.md #100). So a COUNT is carried too — and a
// count is evidence, not a verdict, so it may come from a structured artefact the child writes to a path THIS tool
// chooses. `0 ran` is a FAIL whatever the status said. With no `--ran`, the verdict says so rather than implying work.
//
// NO VERDICT LINE IS NOT A PASS, IT IS NO ANSWER. A log cut from the top, a killed run, a crashed wrapper: none of
// them print one. A reader who does not find the line has not been told the check passed.
import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

const argv = process.argv.slice(2), name = argv.shift();
let ran = null;
if (argv[0] === '--ran') { argv.shift(); ran = argv.shift(); }
// (several commands, separated by `--`, run in order and stopped at the first failure: a chain without a shell, so
//  there is no second script holding the real command for someone to run instead — docs/MANNY.md #102)
const cmds = argv.reduce((a, t) => (t === '--' ? [...a, []] : [...a.slice(0, -1), [...a[a.length - 1], t]]), [[]]).filter((c) => c.length);
if (!name || !cmds.length) { console.log('node tools/verdict.mjs <NAME> [--ran <file.json>] <command> [args…] [-- <command> …]'); process.exit(2); }

const t0 = Date.now();
const say = (verdict) => console.log(`${name}: ${verdict} — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
/** How many tests actually RAN, from the artefact the child was told to write. Unreadable means unknown, not zero.
 *  `numTotalTests` is not the figure: it counts skipped tests, so the first version of this printed
 *  `PASS (0 of 16 ran)` on the exact run it was built to catch. A test that PASSED cannot be faked by skipping. */
const counted = () => { if (!ran) return null; try { const j = JSON.parse(readFileSync(ran, 'utf8')); return typeof j.numTotalTests === 'number' ? { total: j.numTotalTests, passed: j.numPassedTests ?? 0 } : null; } catch { return null; } };
const done = (code, signal) => {
  if (signal) { say(`FAIL (killed by ${signal})`); process.exit(1); }
  if (code !== 0) { say(`FAIL (exit ${code})`); process.exit(code ?? 1); }
  const c = counted();
  if (!ran) say('PASS (no work counted)');
  else if (!c) say('FAIL (passed, but wrote no count of what it ran, so the pass is unverified)'), process.exit(1);
  else if (c.passed === 0) say(`FAIL (exit 0 but nothing ran: 0 of ${c.total} tests passed, the rest skipped)`), process.exit(1);
  else say(`PASS (${c.passed} of ${c.total} ran)`);
  process.exit(0);
};
if (ran) try { rmSync(ran, { force: true }); } catch { /* a stale count must not be read as this run's */ }
const step = (i) => {
  const kid = spawn(cmds[i][0], cmds[i].slice(1), { stdio: 'inherit' });
  kid.on('error', (e) => { say(`FAIL (could not run \`${cmds[i].join(' ')}\`: ${e.message})`); process.exit(127); });
  kid.on('exit', (code, signal) => (code === 0 && !signal && i + 1 < cmds.length ? step(i + 1) : done(code, signal)));
};
step(0);
