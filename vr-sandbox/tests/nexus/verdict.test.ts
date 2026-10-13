// EVERY CHECK IN THIS PROJECT IS NOW READ THROUGH `tools/verdict.mjs`, and until this file nothing read it.
// Its four failure modes are each cheap to get wrong and silent when wrong, because every one of them only shows up
// on a day when something else is already going wrong: a killed child, a command that is not there, an exit code of
// `null`, and the status it must pass through untouched. The fifth is the one it was extended for — exit 0 having run
// nothing, which is a pass that cannot fail (docs/MANNY.md #100, #103).
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
/** Run the wrapper and give back its last line and its exit code — the two things a reader of a check ever has. */
function verdict(...args: string[]): { last: string; code: number } {
  try {
    const out = execFileSync('node', [join(ROOT, 'tools/verdict.mjs'), ...args], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { last: out.trimEnd().split('\n').pop() ?? '', code: 0 };
  } catch (e) {
    const err = e as { stdout?: string; status?: number };
    return { last: (err.stdout ?? '').trimEnd().split('\n').pop() ?? '', code: err.status ?? -1 };
  }
}

describe('the verdict line', () => {
  it('says PASS and exits 0 when the command succeeds', () => {
    const r = verdict('OK', 'node', '-e', 'process.exit(0)');
    expect(r.last).toMatch(/^OK: PASS \(no work counted\) — /);
    expect(r.code).toBe(0);
  });

  it('says FAIL and PASSES THE STATUS THROUGH, so && and set -e still work', () => {
    const r = verdict('NO', 'node', '-e', 'process.exit(3)');
    expect(r.last).toMatch(/^NO: FAIL \(exit 3\) — /);
    expect(r.code, 'the status must be the child\'s own, or every caller downstream is misinformed').toBe(3);
  });

  it('a killed child is a failure however it arrived', () => {
    const r = verdict('KILLED', 'node', '-e', "process.kill(process.pid, 'SIGKILL')");
    expect(r.last).toMatch(/^KILLED: FAIL \(killed by SIG/);
    expect(r.code).toBe(1);
  });

  it('a command that is not there is a failure, not a pass', () => {
    const r = verdict('GONE', 'no-such-command-aaaa');
    expect(r.last).toMatch(/^GONE: FAIL \(could not run/);
    expect(r.code).toBe(127);
  });

  it('runs commands in order and stops at the first failure', () => {
    const r = verdict('CHAIN', 'node', '-e', 'process.exit(0)', '--', 'node', '-e', 'process.exit(4)', '--', 'node', '-e', 'throw new Error("the third must never run")');
    expect(r.last).toMatch(/^CHAIN: FAIL \(exit 4\) — /);
    expect(r.code).toBe(4);
  });

  // THE ONE IT WAS EXTENDED FOR. `vitest … -t "no_such_name"` skips every test and exits 0, so a verdict taken from
  // the status alone printed PASS on a run that executed nothing. The count comes from an artefact the wrapper names
  // itself, and `numTotalTests` is NOT the figure — it counts skipped tests, so reading it printed `PASS (0 of 16
  // ran)` on the very run this exists to catch. What skipping cannot fake is a test that passed.
  it('exit 0 having run nothing is a FAIL, and an unwritten count is not a pass', () => {
    const f = join(ROOT, 'node_modules', '.verdict-selftest.json');
    const none = verdict('NONE', '--ran', f, 'node', '-e', `require('fs').writeFileSync(${JSON.stringify(f)}, JSON.stringify({ numTotalTests: 16, numPassedTests: 0 }))`);
    expect(none.last).toMatch(/^NONE: FAIL \(exit 0 but nothing ran: 0 of 16 tests passed/);
    expect(none.code).toBe(1);

    const some = verdict('SOME', '--ran', f, 'node', '-e', `require('fs').writeFileSync(${JSON.stringify(f)}, JSON.stringify({ numTotalTests: 16, numPassedTests: 16 }))`);
    expect(some.last).toMatch(/^SOME: PASS \(16 of 16 ran\) — /);
    expect(some.code).toBe(0);

    // (a check that was asked for a count and wrote none has not shown its work: that is a failure, not a pass. This
    //  also covers the stale-file case, since the wrapper deletes the artefact before the run.)
    const silent = verdict('SILENT', '--ran', f, 'node', '-e', 'process.exit(0)');
    expect(silent.last).toMatch(/^SILENT: FAIL \(passed, but wrote no count/);
    expect(silent.code).toBe(1);
  });
});
