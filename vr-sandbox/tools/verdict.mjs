// EVERY CHECK SAYS PASS OR FAIL AS ITS LAST LINE, FROM ITS EXIT CODE.
//
// `npm run tidy` was once "verified" in this project with `npm run tidy 2>&1 | tail -3`, which passed while the gate
// failed on the same rule four minutes later. The lesson first written down was "three lines was too few" — and that
// lesson is wrong: `tail -100` would have passed too, and so would `head -20`, because **a pipe replaces the exit
// status**. The command exits with `tail`'s 0 whatever the check did, so it could not fail at any truncation
// (docs/ROUNDS.md Run 7j–7m, docs/MANNY.md #98).
//
// A hook forbidding the pipe was the obvious answer and the wrong one: it bans a spelling, not the cause —
// `npm run tidy > /tmp/x; tail -3 /tmp/x` has no pipe, keeps `$?`, and ends in the same false conclusion. So instead
// the mistake is REMOVED: a check's last line is its verdict, taken from the exit code and nothing else. Then
// `tail -3` is correct. `tail -1` is correct. A log read a week later is correct. A future tool that truncates is
// correct. It survives `tee`, a shell function, a script, and being re-quoted by someone who never read this file.
//
// The verdict is never parsed out of the child's own output, because that would be the same fault one level up: a
// check that reports on itself. The only input is the exit status, which is also passed through unchanged, so
// `&&`, `set -e` and CI keep working exactly as before.
import { spawn } from 'node:child_process';

const [name, ...cmd] = process.argv.slice(2);
if (!name || !cmd.length) { console.log('node tools/verdict.mjs <NAME> <command> [args…]'); process.exit(2); }
const t0 = Date.now();
const say = (verdict) => console.log(`${name}: ${verdict} — ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const kid = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
kid.on('error', (e) => { say(`FAIL (could not run \`${cmd.join(' ')}\`: ${e.message})`); process.exit(127); });
kid.on('exit', (code, signal) => {
  // (a signal is a failure however it arrived: a killed check has not passed)
  if (signal) { say(`FAIL (killed by ${signal})`); process.exit(1); }
  say(code === 0 ? 'PASS' : `FAIL (exit ${code})`);
  process.exit(code ?? 1);
});
