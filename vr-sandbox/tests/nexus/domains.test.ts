// The one test (npm run gate, with the type check), under a minute: one pass over every domain. For each domain: every
// node in it resolves its ports, says its evidence, works in units the units parser reads and is dated; every node
// passes its own tests (each run once, though it is in several domains); one quick starter board of the domain's field
// runs with no node failing; and its nodes built before the update are listed, the queue to re-check (their tests may be
// flawed). And nothing outdated is kept: every source file is reached from the node app. With UPDATE_DOCS=1 it writes
// the generated docs first (tests/nexus/docs.ts). The tests from before the update were deleted (2026-10-28, the user:
// "we don't need all these tests"); commit f509152 holds them.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { DOMAINS, LIBRARY, defaultsOf, portsOf, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { Engine, type Env } from '../../src/nexus/dataflow';
import { starterBoards } from '../../src/nexus/starters';
import { fieldOf } from '../../src/nexus/navigate';
import { EVIDENCE, builtOf, evidenceOf } from '../../src/nexus/evidence';
import { parseUnit } from '../../src/ganglia/units';
import { run } from '../../src/nexus/view/code-worker';

// a board's code blocks run here as the page's worker runs them
const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
// one quick board for each field a starter board is read as (measured 2026-10-28; a field's slow boards stay in the
// legacy suite): what a person opens first in that field
const QUICK: Record<string, string> = {
  electrical: 'Electrical: a resistor heating', electronics: 'The 6502 from its transistors', finance: 'Business: cash flow',
  manufacturing: 'A battery built from its parts', mechanical: 'Physics: a steel ball let go', science: 'A body from its measured segments',
  software: 'The gauntlet as nodes', structural: 'What it is made of, and what it carries', vehicles: 'Power as nodes',
};
const root = resolve(__dirname, '../..');
const resolveFrom = (dir: string, spec: string): string | null => {
  if (!spec.startsWith('.')) return null;
  const b = resolve(dir, spec);
  for (const c of [b, `${b}.ts`, join(b, 'index.ts')]) if (existsSync(c) && statSync(c).isFile()) return c;
  return null;
};
const IMPORTS = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]|new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g;

function reached(): Set<string> {
  const seen = new Set<string>();
  const walk = (f: string) => {
    if (seen.has(f)) return; seen.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(IMPORTS)) { const r = resolveFrom(dirname(f), m[1] ?? m[2] ?? m[3] ?? m[4]!); if (r) walk(r); }
  };
  const pages = readdirSync(join(root, 'view')).filter((f) => f.endsWith('.html'));
  for (const p of pages) for (const m of readFileSync(join(root, 'view', p), 'utf8').matchAll(/src="([^"]+\.ts)"/g)) walk(resolve(root, 'view', m[1]!));
  walk(join(root, 'src/nexus/breakdown-main.ts'));
  return seen;
}
function sources(d = join(root, 'src'), out: string[] = []): string[] {
  for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) sources(p, out); else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) out.push(p); }
  return out;
}

const tested = new Map<string, string[]>(), queue: Record<string, string[]> = {};
const unitOk = (u: string) => { if (/^(USD|EUR|GBP)$/.test(u)) return true; try { parseUnit(u); return true; } catch { return false; } };

describe('every domain, in one pass', () => {
  beforeAll(async () => { if (process.env.UPDATE_DOCS) (await import('./docs')).writeDocs(); }, 600_000);
  it('nothing outdated is kept: every source file is reached from the node app', () => {
    const seen = reached(), stray = sources().filter((f) => !seen.has(f)).map((f) => relative(root, f));
    expect(stray, `reached by nothing in the node app; delete them, or reach them from a node: ${stray.join(', ')}`).toEqual([]);
  });
  for (const d of DOMAINS) {
    it(d.name, async () => {
      const nodes = [...LIBRARY.values()].filter((b: BlockDef) => b.domains.includes(d.id));
      const bad: string[] = [];
      for (const b of nodes) {
        let ps; try { ps = portsOf(b, defaultsOf(b)); } catch (e) { bad.push(`${b.id}: its ports do not resolve (${(e as Error).message})`); continue; }
        for (const p of [...ps.inputs, ...ps.outputs]) if (p.unit && !unitOk(p.unit)) bad.push(`${b.id}.${p.name}: "${p.unit}" is not a unit the parser reads`);
        const e = evidenceOf(b); if (!EVIDENCE.includes(e.kind)) bad.push(`${b.id}: no evidence`);
        if (!builtOf(b.id).at && !b.id.startsWith('group.')) bad.push(`${b.id}: not dated (UPDATE_BUILT=1)`);
        if (!tested.has(b.id)) { const r = b.tests?.length ? await testBlock(b) : { ok: true, fails: [] }; tested.set(b.id, r.ok ? [] : r.fails); }
        for (const f of tested.get(b.id)!) bad.push(`${b.id}: ${f}`);
      }
      queue[d.name] = nodes.filter((b) => builtOf(b.id).before).map((b) => b.id);
      const quick = QUICK[d.id], board = quick ? starterBoards().find(([t]) => t.startsWith(quick)) : undefined;
      if (quick) {
        expect(board, `no starter board "${quick}"`).toBeDefined();
        const b = board![1](), e = new Engine(b, env); await e.run();
        expect(fieldOf(b)).toBe(d.id);
        for (const [id, s] of e.state) if (s.status === 'failed') bad.push(`board "${quick}": ${b.nodes[id]?.label || id} failed: ${s.error}`);
      }
      expect(bad).toEqual([]);
    }, 60_000);
  }
  afterAll(() => {
    const all = new Set(Object.values(queue).flat());
    console.log(`before the update, to re-check: ${all.size} of ${LIBRARY.size} nodes\n${Object.entries(queue).filter(([, q]) => q.length).map(([n, q]) => `  ${n}: ${q.length}`).join('\n')}`);
  });
});
