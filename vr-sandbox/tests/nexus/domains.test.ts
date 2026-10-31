// The one test (npm run gate, with the type check), under a minute: one pass over every domain. For each domain: every
// node in it resolves its ports (its evidence is read from what it is, so always says one), works in units the units parser reads and is dated; every node
// passes its own tests (each run once, though it is in several domains); one quick starter board of the domain's field
// runs with no node failing; and its nodes built before the update are listed, the queue to re-check (their tests may be
// flawed). And nothing outdated is kept: every source file is reached from the node app. With UPDATE_DOCS=1 it writes
// the generated docs first (tests/nexus/docs.ts). The tests from before the update were deleted (2026-10-28, the user:
// "we don't need all these tests"); commit f509152 holds them.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { DOMAINS, LIBRARY, SPEC_FROM, defaultsOf, portsOf, specProblems, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { Engine, type Env } from '../../src/nexus/dataflow';
import { starterBoards } from '../../src/nexus/starters';
import { APP, fieldOf, search } from '../../src/nexus/navigate';
import { builtOf } from '../../src/nexus/evidence';
import { parseUnit } from '../../src/ganglia/units';
import { run } from '../../src/nexus/view/code-worker';
import { builtPieces, stockProblems } from '../../src/nexus/stock';
import { KITS, makeKit } from '../../src/nexus/kits';

// a board's code blocks run here as the page's worker runs them
const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
// one quick board for each field a starter board is read as (measured 2026-10-28; a field's slow boards stay in the
// legacy suite): what a person opens first in that field
const QUICK: Record<string, string> = {
  electrical: 'Electrical: a resistor heating', electronics: 'The 6502 from its transistors', finance: 'Business: cash flow',
  manufacturing: 'A battery built from its parts', mechanical: 'Physics: a steel ball let go', life: 'A body from its measured segments',
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
  beforeAll(async () => { if (process.env.UPDATE_DOCS) await (await import('./docs')).writeDocs(process.env.UPDATE_DOCS === 'quick'); }, 600_000);
  it('nothing outdated is kept: every source file is reached from the node app', () => {
    const seen = reached(), stray = sources().filter((f) => !seen.has(f)).map((f) => relative(root, f));
    expect(stray, `reached by nothing in the node app; delete them, or reach them from a node: ${stray.join(', ')}`).toEqual([]);
  });
  // (navigation is absolute: every node by its name and its id, every starter board by its name, every feature of the
  // app by its name, found in the first three; and plain or misspelt words find what is meant. A sample of the nodes
  // here (every fourth); every one when the docs are written)
  it('navigation finds everything, by name, by id, and by plain or misspelt words', () => {
    const top = (q: string, ok: (f: ReturnType<typeof search>[number]) => boolean) => search(q, 3).some(ok), lost: string[] = [];
    const nodes = [...LIBRARY.values()].filter((d) => !d.id.startsWith('group.')).filter((_, k) => process.env.UPDATE_DOCS || k % 4 === 0);
    for (const d of nodes) for (const q of [d.name, d.id]) if (!top(q, (f) => f.id === d.id || f.add?.block === d.id)) lost.push(`node "${q}"`);
    for (const [t] of starterBoards()) { const q = t.split(':')[0]!; if (!top(q, (f) => f.board === t)) lost.push(`board "${q.slice(0, 50)}"`); }
    for (const [id, name] of APP) if (!top(name, (f) => f.id === id)) lost.push(`app "${name}"`);
    // (asked as a person asks: [what is typed, what must come in the first three])
    const ASKED: [string, string][] = [['buton', 'control.button'], ['joystick', 'control.stick'], ['intractable', 'control.button'], ['walk', 'app.walk'], ['make a house', 'seed.house'],
      ['scrape a website', 'api.zenrows'], ['exprt step', 'export.files'], ['wieght', 'law.weight'], ['ask claude', 'agent.build'], ['explode', 'explode'], ['take apart', 'explode'], ['collision', 'check.rules'],
      ['stres test', 'sweep.range'], ['sprng', 'load.spring'], ['city', 'seed.city'], ['person', 'body'], ['fold into a group', 'app.fold'], ['undo', 'app.undo'], ['slider', 'control.slider'], ['fit to a target', 'fit.target']];
    for (const [q, want] of ASKED) if (!top(q, (f) => f.id === want || f.add?.block === want)) lost.push(`asked "${q}" (wants ${want}; got ${search(q, 3).map((f) => f.add?.block ?? f.id).join(', ')})`);
    expect(lost, `not found in the first three: ${lost.join('; ')}`).toEqual([]);
  }, 120_000);
  // (the context's routing is absolute too: every source file is named in CLAUDE.md or docs/OWNERS.md, by its file or
  // its folder, so whoever works here is routed to every file by the owners table)
  it('every source file has an owner in the docs', () => {
    const said = readFileSync(join(root, 'CLAUDE.md'), 'utf8') + readFileSync(join(root, 'docs/OWNERS.md'), 'utf8');
    const orphan = sources().map((f) => relative(join(root, 'src'), f)).filter((f) => { const dir = dirname(f), base = f.split('/').pop()!;
      return !said.includes(base) && !said.includes(`${dir}/\``) && !said.includes(`${dir.replace(/^nexus\//, '')}/\``) && !said.includes(`\`${dir}/`) && !said.includes(`${dir.replace(/^nexus\//, '')}/\` `); });
    expect(orphan, `files no owner row names: ${orphan.join(', ')}`).toEqual([]);
    // (and every document is routed to from CLAUDE.md's table, and every document it routes to is there)
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8'), docs = readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md'));
    expect(docs.filter((f) => !claude.includes(`docs/${f}`)), 'documents CLAUDE.md does not route to').toEqual([]);
    expect([...claude.matchAll(/docs\/([A-Z-]+\.md)/g)].map((m) => m[1]!).filter((f) => !docs.includes(f)), 'documents CLAUDE.md routes to that are not there').toEqual([]);
  });
  // (the law of the built-parts library: every piece every build makes, at every depth, is taken from the library or
  // stored in it; nothing stored that no build makes; src/nexus/stock.ts)
  it('every piece built is in the built-parts library, and nothing in it is outdated', async () => {
    if (process.env.UPDATE_DOCS) return;
    const all = await builtPieces({ wide: true }), p = stockProblems(all), say = (n: { name: string }[]) => n.slice(0, 12).map((x) => x.name).join(', ') + (n.length > 12 ? ` and ${n.length - 12} more` : '');
    expect(p.unstored.length, `${p.unstored.length} pieces built and not stored (UPDATE_DOCS=quick stores them): ${say(p.unstored)}`).toBe(0);
    expect(p.outdated.length, `${p.outdated.length} pieces stored that no build makes any more (UPDATE_DOCS=quick deletes them): ${say(p.outdated)}`).toBe(0);
    expect(p.misplaced.length, `${p.misplaced.length} pieces stored where their build no longer has them (UPDATE_DOCS=quick): ${say(p.misplaced)}`).toBe(0);
  }, 120_000);
  // (a kit given words that name another kit's thing makes that thing and says so, never a random one of its own)
  it('words that name another kit are made by it, and it is said', () => {
    const car = KITS.find((k) => k.id === 'car')!;
    for (const [w, id] of [['rancher', 'atv'], ['cascadia', 'semi truck'], ['corolla', 'car']] as const) { const m = makeKit(car, w, 7); expect(m.kit.id, w).toBe(id); expect(!!m.moved, w).toBe(id !== 'car'); }
  });
  for (const d of DOMAINS) {
    it(d.name, async () => {
      const nodes = [...LIBRARY.values()].filter((b: BlockDef) => b.domains.includes(d.id));
      const bad: string[] = [];
      for (const b of nodes) {
        let ps; try { ps = portsOf(b, defaultsOf(b)); } catch (e) { bad.push(`${b.id}: its ports do not resolve (${(e as Error).message})`); continue; }
        for (const p of [...ps.inputs, ...ps.outputs]) if (p.unit && !unitOk(p.unit)) bad.push(`${b.id}.${p.name}: "${p.unit}" is not a unit the parser reads`);
        // (not while the dates are being written: this run read them before they were)
        if (!process.env.UPDATE_DOCS && !builtOf(b.id).at && !b.id.startsWith('group.')) bad.push(`${b.id}: not dated (UPDATE_DOCS=quick)`);
        // (changed since the taxonomy: specified, or it fails; docs/REALITY.md phase 2)
        const at = builtOf(b.id).at; if (!process.env.UPDATE_DOCS && b.kind !== 'law' && !b.alias && at && at >= SPEC_FROM) for (const p of specProblems(b)) bad.push(`${b.id}: ${p}`);
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
