// Decision 0029, wave 13, job "context" (plan/CRITIQUE-2.md, finding 10 and section 3, the context tiers): CLAUDE.md is
// loaded on every turn of every agent, so it is cut to the checks, the "never" list, a module map of rows of 80 characters
// or less, the live decision numbers (5 at most) and the routes. What it held besides moved word for word to
// docs/CRITIC.md (the critic, speed and promises) and docs/OWNERS.md (the long owner rows). Held here: its size, that every
// file it routes to is there, and that every heading it lost is found in its new home.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../..');
const read = (f: string) => readFileSync(join(root, f), 'utf8');
const claude = read('CLAUDE.md');
// (the headings of CLAUDE.md at 4fe0284, the commit before the cut, copied from it: the H1, then every H2)
const BEFORE = [
  'Nexus and the space: read this before any work here',
  'What is wanted (the summary; every word the user said is in `docs/WANTED.md`)',
  'Build only with the operations (decision 0021; the user, 2026-11-02)',
  'The critic, every session (the user, 2026-11-02: "why do I have to say all of this")',
  'Where to read for what (targeted context: read only what the work needs)',
  'When work is slow: step back',
  'What can honestly be promised',
  'One owner per concern: extend these, never write a second one',
  'Before writing a new file or function',
  'The drift gate: before spending a round on a fix',
  'Every round, ask these, then act on the answers',
  'Speed (the user, 2026-11-07: "I want it fast ... there never a need for a digital entity to be taking hours on a task unless it\'s populating"; the panel\'s critique, `plan/CRITIQUE.md`)',
  'Working here',
];
const headings = (t: string) => [...t.matchAll(/^#{1,3} (.+)$/gm)].map((m) => m[1]!);

describe('wave 13, context: CLAUDE.md is the loaded-every-turn tier', () => {
  it('is 6,000 characters or less, its module map rows 80 or less, at most 5 live decisions', () => {
    expect(claude.length, 'CLAUDE.md characters').toBeLessThanOrEqual(6000);
    const map = claude.slice(claude.indexOf('## Module map'));
    const rows = map.split('\n').filter((l) => l.startsWith('|'));
    expect(rows[0], 'the map is a table of concern | file | node prefix').toMatch(/^\| Concern \| File \| Nodes \|$/);
    expect(rows.length, 'a row per concern').toBeGreaterThanOrEqual(40);
    expect(claude.split('\n').filter((l) => l.startsWith('|') && l.length > 80), 'table rows over 80 characters').toEqual([]);
    const live = /## Live decisions[^\n]*\n\n([\s\S]*?)\n\n/.exec(claude);
    expect(live, 'a live decisions section').toBeTruthy();
    const nums = [...new Set([...live![1]!.matchAll(/\b(\d{4})\b/g)].map((m) => m[1]!))];
    expect(nums.length).toBeGreaterThan(0); expect(nums.length, 'live decisions').toBeLessThanOrEqual(5);
    const decisions = readdirSync(join(root, 'plan/decisions'));
    expect(nums.filter((n) => !decisions.some((f) => f.startsWith(`${n}-`))), 'live decisions with no record').toEqual([]);
    // (the checks and the pointers it was cut to: the gate, the type check, the probe rule, the "never" list, and one
    // "search, don't read" pointer each to WANTED, OWNERS, REALITY and FIX-PLAN)
    for (const s of ['npm run gate', 'npx tsc --noEmit', 'zz_probe_', '## Never', "## Search, don't read"]) expect(claude, s).toContain(s);
    const search = claude.slice(claude.indexOf("## Search, don't read"), claude.indexOf('## Checks'));
    for (const f of ['docs/WANTED.md', 'docs/OWNERS.md', 'docs/REALITY.md', 'plan/FIX-PLAN.md']) expect(search, `a pointer to ${f}`).toContain(`\`${f}\``);
  });

  it('every file it routes to exists', () => {
    // (a path in backticks, alone or in a command: docs/, plan/, scripts/, tests/, src/ and PROGRESS.md from vr-sandbox/;
    // data/, engineering/, ganglia/, kernel/ under src/; any other path under src/nexus/, as the map's own line says)
    const words = [...claude.matchAll(/`([^`\n]+)`/g)].flatMap((m) => m[1]!.split(/\s+/)).filter((w) => /^[\w.-]+(\/[\w.-]+)*(\.(md|ts|mjs|cjs)|\/)$/.test(w) && !w.startsWith('.'));
    const where = (w: string) => /^(docs|plan|scripts|tests|src)\/|^PROGRESS\.md$/.test(w) ? w : /^(data|engineering|ganglia|kernel)\//.test(w) ? `src/${w}` : `src/nexus/${w}`;
    expect(words.length, 'paths found').toBeGreaterThan(60);
    expect([...new Set(words)].filter((w) => !existsSync(join(root, where(w)))), 'paths CLAUDE.md names that are not there').toEqual([]);
    // (the two routes the PROGRESS.md check in domains.test.ts reads, held here too: that check stops earlier when
    // PROGRESS.md names a commit more than three behind HEAD)
    expect(claude, 'CLAUDE.md routes "what is next" to PROGRESS.md').toMatch(/^\| What is next[^\n]*`PROGRESS\.md`/m);
    expect(claude, 'CLAUDE.md holds the session loop').toMatch(/read `PROGRESS\.md`[\s\S]*?then rewrite `PROGRESS\.md`/);
    expect(existsSync(join(root, 'docs/CRITIC.md')), 'docs/CRITIC.md').toBe(true);
  });

  it('every heading removed from it is found in its new home, and every section it lost, word for word', () => {
    const now = new Set(headings(claude)), homes = read('docs/CRITIC.md') + '\n' + read('docs/OWNERS.md');
    const home = new Set(headings(homes));
    const gone = BEFORE.filter((h) => !now.has(h));
    expect(gone.length, 'headings that moved').toBeGreaterThanOrEqual(10);
    expect(gone.filter((h) => !home.has(h)), 'headings removed from CLAUDE.md found in neither docs/CRITIC.md nor docs/OWNERS.md').toEqual([]);
    // (word for word: each section's body, as it stood at 4fe0284, is in its new home; read from git where the history
    // holds that commit (a clone of depth 1 does not, and there only the headings above are held))
    const old = spawnSync('git', ['show', '4fe0284:vr-sandbox/CLAUDE.md'], { cwd: root, encoding: 'utf8' });
    if (old.status !== 0) return;
    expect(headings(old.stdout), 'the headings copied above are 4fe0284\'s').toEqual(BEFORE);
    const sections = old.stdout.split(/^(?=## )/m), lost: string[] = [];
    for (const s of sections) {
      const [head, ...body] = s.trimEnd().split('\n'), h = head!.replace(/^#+ /, '');
      const text = body.join('\n').trim();
      if (text && !homes.includes(text)) lost.push(`${h}: ${text.slice(0, 80)}`);
    }
    expect(lost, 'sections of the old CLAUDE.md not found word for word in docs/CRITIC.md or docs/OWNERS.md').toEqual([]);
  });
});
