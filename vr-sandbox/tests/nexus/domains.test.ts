// The gate (npm run gate, with the type check): one pass over every domain, under a minute. For each domain: every node
// in it resolves its ports, says its evidence, works in units the units parser reads and is dated; every node passes
// its own tests (each run once, though it is in several domains); one quick starter board of the domain's field runs
// with no node failing; and its nodes built before the update are listed, the queue to re-check (their tests may be
// flawed). The tests from before the update are the legacy suite: `npm run gate:full` and CI run them all.

import { afterAll, describe, expect, it } from 'vitest';
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
const tested = new Map<string, string[]>(), queue: Record<string, string[]> = {};
const unitOk = (u: string) => { if (/^(USD|EUR|GBP)$/.test(u)) return true; try { parseUnit(u); return true; } catch { return false; } };

describe('every domain, in one pass', () => {
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
