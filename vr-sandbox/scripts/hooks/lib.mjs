// The hooks (spec 00, task S3; constitution C10 to C13): checks that refuse, so the rules hold by running rather than by
// being remembered. Each check is a pure function of what it is given (what the gate stamped, a commit's tree, a message
// and its files, the text a commit adds, the failures counted), so the one test can try each one on purpose; the small
// scripts beside it (`git/`, `claude-push.mjs`, `../gate.mjs`) only gather what it needs from git and the disk.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ---- push gate (C11): no push of a commit whose content the gate did not pass --------------------------------------
/** The push may go when the commit's tree (of this project's folder) is the tree the gate passed on. */
export function checkPush(stamp, commitTree) {
  if (!stamp) return { ok: false, why: 'no gate stamp: run `npm run gate`, and push only what it passed' };
  if (stamp.tree !== commitTree) return { ok: false, why: `the commit is not what the gate passed (gate passed tree ${String(stamp.tree).slice(0, 10)}, the commit has ${String(commitTree).slice(0, 10)}): run \`npm run gate\` on exactly what is committed` };
  return { ok: true };
}

/**
 * Whether a shell command runs `git push` (as a command, after `;`, `&&`, `||`, `|`, `(` or a line break, with git's own
 * options before it), not merely says the words: text in a here-document or in quotes is not run, and "git's pre-push
 * hook" in a sentence is not a push (2026-11-01: a looser pattern stopped a command that only wrote such a sentence).
 */
export function pushes(cmd) {
  const run = cmd.replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\s*(?=\n|$)/g, ' ').replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, ' ');
  return /(?:^|[\n;&|(])\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*git\s+(?:(?:-C|-c)\s+\S+\s+|--?[a-z-]+(?:=\S+)?\s+)*push\b/.test(run);
}

/** The tree of the project's folder as it stands on disk (tracked and untracked, ignoring what .gitignore ignores). */
export function workingTree(repoRoot, prefix) {
  const idx = join(tmpdir(), `gate-index-${process.pid}-${Math.floor(performance.now())}`);
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  try {
    execFileSync('git', ['read-tree', '--empty'], { cwd: repoRoot, env });
    execFileSync('git', ['add', '-A', '--', prefix], { cwd: repoRoot, env });
    return execFileSync('git', ['write-tree', `--prefix=${prefix}/`], { cwd: repoRoot, env, encoding: 'utf8' }).trim();
  } finally { if (existsSync(idx)) rmSync(idx); }
}
/** The tree of the project's folder in a commit. */
export function commitTree(repoRoot, prefix, sha) {
  return execFileSync('git', ['rev-parse', `${sha}:${prefix}`], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

// ---- change budget (C12): a commit stays within its task's owners, or names a decision ----------------------------
/** Files anyone may change with any task: the plan, the docs, the tests, the handoff and the anchor. */
const ALWAYS = [/^plan\//, /^docs\//, /^tests\//, /^PROGRESS\.md$/, /^CLAUDE\.md$/, /^\.\.\/CLAUDE\.md$/];
/** The task ids a message names (`00.S3`, `[10.T11]`). */
export const taskIdsOf = (msg) => [...new Set([...msg.matchAll(/\b(\d\d)\.([A-Z]+\d+)\b/g)].map((m) => `${m[1]}.${m[2]}`))];
const within = (file, owner) => { const o = owner.trim().replace(/^\.\//, ''); if (!o) return false;
  return o.endsWith('/') ? file.startsWith(o) || file.includes(`/${o}`) : file === o || file.endsWith(`/${o}`) || file.endsWith(o.replace(/ \(.*\)$/, '')); };
/**
 * Whether a commit keeps to its budget. `files` are paths from the project's folder (`src/nexus/x.ts`; a file outside
 * the folder starts `../`). `owners` gives, for a task id, its owner paths, or undefined where the task has none
 * written. `decisions` are the decision records' numbers that exist.
 */
export function checkBudget(msg, files, owners, decisions) {
  const named = taskIdsOf(msg), decided = [...msg.matchAll(/\bdecision (\d{4})\b/gi)].map((m) => m[1]).filter((n) => decisions.includes(n));
  if (decided.length) return { ok: true, why: `decision ${decided.join(', ')} named` };
  const free = files.filter((f) => !ALWAYS.some((r) => r.test(f)));
  if (!free.length) return { ok: true };
  if (!named.length) return { ok: false, why: `it changes ${free.slice(0, 3).join(', ')}${free.length > 3 ? ` and ${free.length - 3} more` : ''} and names no task: put the task's id in the message (\`[10.T3]\`), or name a decision record` };
  const unknown = named.filter((t) => !owners(t));
  if (unknown.length) return { ok: false, why: `no owners written for ${unknown.join(', ')}: write them (its tasks.json "owner", or plan/owners.json) before changing code for it` };
  const all = named.flatMap((t) => owners(t)), past = free.filter((f) => !all.some((o) => within(f, o)));
  if (past.length) return { ok: false, why: `past the owners of ${named.join(', ')} (${all.join(', ')}): ${past.join(', ')}. Keep to them, or write a decision record and name it in the message` };
  return { ok: true };
}

/** Owners from the plan: a task's tasks.json "owner", or plan/owners.json for a task written in a spec's table. */
export function ownersFromPlan(planDir) {
  const map = new Map();
  for (const d of readdirSync(join(planDir, 'specs'))) { const f = join(planDir, 'specs', d, 'tasks.json'); if (!existsSync(f)) continue;
    for (const t of JSON.parse(readFileSync(f, 'utf8')).tasks) if (t.owner) map.set(`${d.slice(0, 2)}.${t.id}`, String(t.owner).split(',').map((x) => x.trim()).filter(Boolean)); }
  const extra = join(planDir, 'owners.json');
  if (existsSync(extra)) for (const [k, v] of Object.entries(JSON.parse(readFileSync(extra, 'utf8')))) if (!k.startsWith('_')) map.set(k, v);
  return (t) => map.get(t);
}

// ---- honesty (C10): a number written as done or measured carries the command or test it came from ------------------
/** What in a text is a number someone could be asked "where from?": not a date, an id, a version, a hash or a path. */
export function measuredNumbers(text) {
  const plain = text
    .replace(/`[^`]*`/g, ' ')                                  // inside code: paths, commands, symbols
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')                    // dates
    .replace(/\b(?:[A-Z]{1,3}\d+(?:\.\d+)?|Q\d+\.\d+|\d\d\.[A-Z]+\d+)\b/g, ' ') // ids: D12, S3, LW12, C29, Q20.2, 10.T11
    .replace(/\b[0-9a-f]{7,40}\b/g, ' ')                       // commit hashes
    .replace(/\b\d+\.\d+\.\d+\b/g, ' ')                        // versions
    .replace(/^\s*(?:#+|\d+\.)\s/gm, ' ')                      // headings, list numbers
    .replace(/\b(?:spec|task|tasks|decision|round|phase|step|chapter|item|research|pass|line|lines|Chapter|Spec|Step|Phase|Round) \d+\b/g, ' ');
  return [...plain.matchAll(/\d[\d,.]*/g)].map((m) => m[0]);
}
/** An added passage cut into the log's entries, one per `## ` heading (and what comes before the first): each is judged on
 *  its own, so an entry with no command is not let through by another added beside it in the same hunk (2026-11-01: a
 *  planted entry passed that way, on a live try). */
export const entriesOf = (text) => text.split(/^(?=## )/m).map((x) => x.trim()).filter(Boolean);
/** A command or a test named: `npm run …`, `npx …`, `node …`, `python3 …`, `git …`, a test by name. */
export const COMMAND = /`(?:npm |npx |node |python3 |git |vitest |EVAL_[A-Z]+=|UPDATE_DOCS=|CHECK=|cmd: )[^`]*`|the test "[^"]+"|it\('[^']+'|-t "[^"]+"/;
/**
 * The blocks a commit adds to the log: each must say how its numbers were got. `blocks` are the added hunks of
 * REALITY.md (an entry is one hunk) and the added lines of PROGRESS.md, each one on its own.
 */
export function checkHonesty(blocks) {
  const bad = blocks.filter((b) => measuredNumbers(b).length && !COMMAND.test(b));
  return bad.length ? { ok: false, why: `${bad.length} added passage(s) state numbers with no command or test they came from: "${bad[0].trim().slice(0, 140)}". Name the command (\`npm run gate\`, \`npx vitest run … -t "…"\`) or the test` } : { ok: true };
}

// ---- loop breaker (C13): three failed gate runs on one task, then stop and ask whether a pipeline is missing --------
/** The task in hand, and the pipeline notes written for it, from PROGRESS.md. */
export function progressOf(text) {
  const task = /^Task in hand: (\S+)/m.exec(text)?.[1] ?? '', notes = [...text.matchAll(/^pipeline: (\S+): (.+)$/gm)].filter((m) => m[1] === task).map((m) => m[2].trim());
  return { task, note: notes.join(' | ') };
}
/** Whether the gate may run: past three failures on the task in hand, only once a new pipeline note answers them. */
export function checkLoop(state, task, note) {
  const s = state[task] ?? { fails: 0, note: '' };
  if (note && note !== s.note) return { ok: true, reset: true };
  if (s.fails >= 3) return { ok: false, why: `three failed gate runs on ${task}: is a pipeline missing (the same judgement made by hand again and again)? Write the answer in PROGRESS.md as a line "pipeline: ${task}: …", then run the gate again` };
  return { ok: true };
}
