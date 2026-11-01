#!/usr/bin/env node
// The push gate for Claude Code (spec 00, S3; C11): a PreToolUse hook on Bash. A command that pushes is refused (exit 2,
// the reason on stderr, which Claude Code shows the agent) unless HEAD holds the tree `npm run gate` stamped. Kept beside
// git's own pre-push hook so a fresh clone, where `npm run hooks` has not been run, is held all the same.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pushes } from './lib.mjs';

let cmd = ''; try { cmd = String(JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command ?? ''); } catch { process.exit(0); }
if (!pushes(cmd)) process.exit(0);
const r = spawnSync('node', [join(dirname(fileURLToPath(import.meta.url)), 'push-check.mjs'), '--head'], { encoding: 'utf8' });
if (r.status !== 0) { process.stderr.write(r.stderr || 'push refused (the push gate)\n'); process.exit(2); }
