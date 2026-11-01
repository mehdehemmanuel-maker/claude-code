// The one test (npm run gate, with the type check), under a minute: one pass over every domain. For each domain: every
// node in it resolves its ports (its evidence is read from what it is, so always says one), works in units the units parser reads and is dated; every node
// passes its own tests (each run once, though it is in several domains); one quick starter board of the domain's field
// runs with no node failing; and its nodes built before the update are listed, the queue to re-check (their tests may be
// flawed). And nothing outdated is kept: every source file is reached from the node app. With UPDATE_DOCS=1 it writes
// the generated docs first (tests/nexus/docs.ts). The tests from before the update were deleted (2026-10-28, the user:
// "we don't need all these tests"); commit f509152 holds them.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { placeholders, secrets, unsourced, unstated } from './scans';
import { EVIDENCE } from '../../src/nexus/evidence';
import { callTools, certifiedOf, certifiedView, gateOf, nearMissesOf, nearMissesView, relayBody, runOf, stepOf, toolsFor, turnOf, type AgentRun, type AgentStep } from '../../src/nexus/agent';
import { createHash } from 'node:crypto';
/** agentBuild's loop, its text pinned (the test "an open andon stops the line…" says why). */
const LOOP_PIN = 'e7c58c011e23a80e';
/** The most laws the kernel may still leave undecided (erf and integrals: not in it yet). */
const UNDECIDED_MOST = 3;
import { checkBudget, checkHonesty, checkLoop, checkPush, ownersFromPlan, progressOf, pushes, entriesOf } from '../../scripts/hooks/lib.mjs';
import { dirname, join, relative, resolve } from 'node:path';
import '../../src/nexus/seeds';
import { DOMAINS, LIBRARY, SPEC_FROM, defaultsOf, fits as fitsPorts, portsOf, specProblems, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { relate, UNITS, fromSI } from '../../src/ganglia/units';
import { check } from '../../src/kernel';
import { lawDims, lawWitness, wireDims } from '../../src/nexus/certify';
import { setting } from '../../src/nexus/lawgraph';
import { apply } from '../../src/nexus/law';
import { BOOK } from '../../src/nexus/book';
import { interfacesOf } from '../../src/nexus/interfaces';
import { DESIGNED, boltedJoint, exampleOf, use } from '../../src/nexus/components';
import { rulesOf } from '../../src/nexus/make/rules';
import { KITS, makeKit, type Part } from '../../src/nexus/kits';
import type { Assembly } from '../../src/nexus/assembly';
import { Engine, Memo, digest, emptyBoard, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { nodesOf } from '../../src/nexus/boards';
import { starterBoards } from '../../src/nexus/starters';
import { APP, fieldOf, search } from '../../src/nexus/navigate';
import { builtOf } from '../../src/nexus/evidence';
import { parseUnit } from '../../src/ganglia/units';
import { run } from '../../src/nexus/view/code-worker';
import { builtPieces, stockProblems } from '../../src/nexus/stock';

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
  // (the AI's guide shows a plan that must run as written: its wire goes into an input the block has, and a wire into an
  // input a block lacks, a folded block too, is refused where it is made, never carried silently (2026-10-31: the guide
  // wired a spring's output `rate` as an input, and the board ran on its defaults with no word said))
  // (a number goes along a wire only into its own kind of quantity (spec 10, T11; faults D1 to D3): a turn is a cycle, so
  // 60 rpm is 1 Hz, not 2π; an energy is not a torque though both are N·m; an absorbed dose is not a dose equivalent; a
  // level in dB goes only into dB; a temperature is not a temperature difference, so 10 °C of rise is 10 K, not 283.15)
  it('a value goes along a wire only into its own kind, converted rightly', () => {
    const near = (a: number, b: number) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));
    for (const [v, from, to, want] of [[60, 'rpm', 'Hz', 1], [1, 'Hz', 'rpm', 60], [1, 'Hz', 'rad/s', 2 * Math.PI], [60, 'rpm', 'rad/s', 2 * Math.PI], [2 * Math.PI, 'rad/s', 'Hz', 1],
      [10, 'ΔdegC', 'ΔK', 10], [9, 'ΔdegF', 'ΔK', 5], [20, 'degC', 'K', 293.15], [3, 'dB', 'dB', 3], [1, 'kWh', 'J', 3.6e6], [1, 'kN m', 'N m', 1000]] as const) {
      const r = relate(from, to); expect(r.ok, `${from} → ${to}: ${r.ok ? '' : r.why}`).toBe(true);
      if (r.ok) expect(near(r.convert(v), want), `${v} ${from} → ${to} gave ${r.convert(v)}, wants ${want}`).toBe(true);
    }
    for (const [from, to] of [['J', 'N m'], ['N m', 'kWh'], ['Gy', 'Sv'], ['Sv', 'krad'], ['dB', '1'], ['-', 'dB'], ['degC', 'ΔK'], ['ΔK', 'degC'], ['K', 'ΔK'], ['m', 'N']] as const)
      expect(relate(from, to).ok, `${from} → ${to} is refused`).toBe(false);
    // (the laws' temperature differences take a difference: a temperature wired in is refused, a rise in °C converts)
    const dT = portsOf(LIBRARY.get('law.heat.capacity')!, defaultsOf(LIBRARY.get('law.heat.capacity')!)).inputs.find((p) => p.name === 'dT')!;
    expect(dT.unit).toBe('ΔK');
    expect(fitsPorts({ name: 'T', type: 'number', unit: 'degC' }, dT).ok).toBe(false);
    expect(fitsPorts({ name: 'rise', type: 'number', unit: 'ΔdegC' }, dT).ok).toBe(true);
    // (a law's dimensionless input carries 1: a length is refused into it; a plain number goes in)
    const eta = portsOf(LIBRARY.get('law.carnot')!, { ...defaultsOf(LIBRARY.get('law.carnot')!), solve: 'Tc' }).inputs.find((p) => p.unit === '1');
    expect(eta, 'law.carnot solved for Tc takes its efficiency in 1').toBeTruthy();
    expect(fitsPorts({ name: 'L', type: 'number', unit: 'm' }, eta!).ok, 'a length into an efficiency').toBe(false);
    expect(fitsPorts({ name: 'x', type: 'number' }, eta!).ok).toBe(true);
  });
  // (early cutoff (spec 11, LW12; fault D5): a node run again that gives what it gave before leaves what it feeds alone,
  // counted; and a block that says it is pure reads no clock, chance, network or AI in its own run, unless what it reads
  // it gives only on ports that measure the run)
  it('a node that gives what it gave before reruns nothing below it, and pure blocks read no clock or chance', async () => {
    const b = emptyBoard('cutoff');
    placeBlock(b, 'in.number', 0, 0, { ...defaultsOf(LIBRARY.get('in.number')!), value: '2.1' }, 'x');
    placeBlock(b, 'math.expr', 0, 0, { expr: 'round(a)' }, 'r'); placeBlock(b, 'math.expr', 0, 0, { expr: 'b + 1' }, 'n');
    wire(b, 'x', 'value', 'r', 'a'); wire(b, 'r', 'result', 'n', 'b');
    const e = new Engine(b, env, new Memo()); await e.run(); expect(e.state.get('n')?.out?.result).toBe(3);
    b.nodes.x!.set = { ...b.nodes.x!.set, value: '2.2' }; e.touch('x');
    const r = await e.run();
    expect(e.state.get('r')?.cached, 'the rounding ran again: its input moved').toBe(false);
    expect(e.state.get('n')?.cached, 'what it feeds did not: its value came in the same').toBe(true);
    expect(r.ran).toBe(2);
    const reads: string[] = [];
    for (const d of LIBRARY.values()) { if (!d.pure || !d.run) continue; const src = d.run.toString().replace(/new Date\(0\)/g, '');
      if (/Math\.random|Date\.now|new Date\(|performance\.now|fetch\(|\bc\.ai\b/.test(src) && !portsOf(d, defaultsOf(d)).outputs.some((o) => o.measured)) reads.push(d.id); }
    expect(reads, 'pure blocks that read the clock, chance, the network or the AI: say pure: false, or give what they read as measured').toEqual([]);
  });
  // (what is written is scanned (spec 00, S4; constitution C7, C8, C17): every figure in a data file has a source or a label;
  // no placeholder in a data file; no key written anywhere in the repository or the built pages. Each scan is first run on
  // a planted case, which must fail it, so a scan that has stopped seeing is caught)
  it('every figure in data has a source, no placeholder stands in data, no key is written down', async () => {
    expect(unsourced({ PARTS: { m8: { d: 0.008, mass: 0.012 } } }, 'planted')).toHaveLength(1);
    expect(unsourced({ PARTS: { m8: { d: 0.008, source: 'ISO 4762' } } }, 'planted')).toEqual([]);
    expect(placeholders("  m8: { d: 0.008 }, // TODO the real pitch", 'planted')).toHaveLength(1);
    expect(secrets(`const k = 'sk-ant-${'a'.repeat(30)}';`, 'planted')).toHaveLength(1);
    // (and every figure has its claim status (spec 10, T3; C21), in the app's one vocabulary of evidence kinds)
    expect(unstated({ PARTS: { m8: { d: 0.008, source: 'ISO 4762' } } }, 'planted', EVIDENCE)).toHaveLength(1);
    expect(unstated({ PARTS: { m8: { d: 0.008, source: 'ISO 4762', status: 'specified' } } }, 'planted', EVIDENCE)).toEqual([]);
    expect(unstated({ P_STATUS: 'probably', PARTS: {} }, 'planted', EVIDENCE), 'a status not in the vocabulary').toHaveLength(1);
    // (figures held only in lists are figures: a record of number arrays, a bare table, a typed array (the evaluator's
    // plant E, 2026-11-01); a …_STATUS record names each export's status, and a wrong word or a name it does not hold fails)
    expect(unstated({ PARTS: { m8: { source: 'ISO 4762', pitches: [1.25, 1.5], loads: [[0.1, 0.2]] } } }, 'planted', EVIDENCE), 'number arrays only').toHaveLength(1);
    expect(unsourced({ PARTS: { m8: { pitches: [1.25, 1.5] } } }, 'planted'), 'number arrays, no source').toHaveLength(1);
    expect(unstated({ GRID: [380, 385], CURVE: new Float32Array([1, 2]) }, 'planted', EVIDENCE), 'a bare table and a typed array').toHaveLength(2);
    expect(unstated({ GRID: [380, 385], T_STATUS: { GRID: 'exact' } }, 'planted', EVIDENCE)).toEqual([]);
    expect(unstated({ GRID: [380, 385], T_STATUS: { GRID: 'probably' } }, 'planted', EVIDENCE), 'a wrong word for one export').toHaveLength(2);
    expect(unstated({ GRID: [380, 385], T_STATUS: { GRID: 'exact', CURVE: 'measured' } }, 'planted', EVIDENCE), 'a status for an export not there').toHaveLength(1);
    // (figures as [name, number] pairs, as a mix's parts; a number exported alone; each named in …_SOURCES and …_STATUS)
    expect(unstated({ MIX: { m1: { source: 'ACI 211.1', parts: [['cement', 330], ['water', 165]] } } }, 'planted', EVIDENCE), '[name, number] pairs').toHaveLength(1);
    expect(unsourced({ MIX: { m1: { parts: [['cement', 330]] } } }, 'planted'), '[name, number] pairs, no source').toHaveLength(1);
    expect([...unsourced({ LIMIT: 0.0073 }, 'planted'), ...unstated({ LIMIT: 0.0073 }, 'planted', EVIDENCE)], 'a number exported alone').toHaveLength(2);
    expect([...unsourced({ LIMIT: 0.0073, X_SOURCES: { LIMIT: 'ISO 286-1 Table 1' } }, 'planted'), ...unstated({ LIMIT: 0.0073, X_STATUS: { LIMIT: 'specified' } }, 'planted', EVIDENCE)]).toEqual([]);
    // (a number beside a text or a null in a list, a lone [name, number] pair, a [number, unit] pair, a bare tuple exported,
    // a Map's values: each a figure, each refused without a status (and without a source))
    for (const [what, mod] of [['a list with n/a', { P: { a: { source: 's', pitch: [1.25, 'n/a', 1.75] } } }], ['a list with a null', { P: { a: { source: 's', x: [1, null, 3] } } }],
      ['a lone pair', { P: { a: { source: 's', steel: ['steel', 7850] } } }], ['a number and its unit', { P: { a: { source: 's', t: [20, 'C'] } } }],
      ['a bare tuple exported', { T: ['steel', 7850] }], ['a Map', { M: new Map([['steel', { source: 's', rho: 7850 }]]) }]] as const) {
      expect(unstated(mod as Record<string, unknown>, 'planted', EVIDENCE).length, `${what}: no status`).toBeGreaterThan(0);
    }
    expect(unsourced({ P: { a: { pitch: [1.25, 'n/a'] } } }, 'planted').length, 'a list with n/a: no source').toBeGreaterThan(0);
    // (a Set, bare and in a record; a figure twelve levels down; a record that holds itself, met once)
    let deep: Record<string, unknown> = { x: 0.5 }; for (let i = 0; i < 12; i++) deep = { [`l${i}`]: deep };
    const loop: Record<string, unknown> = { source: 's', status: 'specified', x: 1 }; loop.self = loop;
    for (const [what, mod] of [['a Set', { S: new Set([1.5, 2.5]) }], ['a Set in a record', { P: { a: { source: 's', s: new Set([7850]) } } }], ['twelve levels down', { D: deep }]] as const)
      expect(unstated(mod as Record<string, unknown>, 'planted', EVIDENCE).length, `${what}: no status`).toBeGreaterThan(0);
    expect(unstated({ L: loop }, 'planted', EVIDENCE), 'a record that holds itself, met once').toEqual([]);
    const data = readdirSync(join(root, 'src/data')).filter((f) => f.endsWith('.ts')), bad: string[] = [];
    for (const f of data) { const m = await import(`../../src/data/${f}`); bad.push(...unsourced(m, `src/data/${f}`), ...unstated(m, `src/data/${f}`, EVIDENCE)); }
    for (const dir of ['src/data', 'src/nexus/kinds', 'src/nexus/book']) for (const f of readdirSync(join(root, dir)).filter((x) => x.endsWith('.ts'))) bad.push(...placeholders(readFileSync(join(root, dir, f), 'utf8'), `${dir}/${f}`));
    const tracked = execSync('git ls-files --cached --others --exclude-standard', { cwd: root, encoding: 'utf8' }).split('\n').filter((f) => f && !/\.(png|jpe?g|gif|webp|wasm|glb|gltf|bin|ico|woff2?|ttf|zip|gz)$/i.test(f) && existsSync(join(root, f)) && statSync(join(root, f)).isFile()); // (files only: a linked node_modules is listed as untracked (the evaluator's worktree, 2026-11-01))
    for (const f of tracked) { const t = readFileSync(join(root, f), 'utf8'); bad.push(...secrets(t, f)); }
    const built = join(root, 'dist-view'), walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : /\.(js|html|css|json|md)$/.test(e.name) ? [join(d, e.name)] : []);
    if (existsSync(built)) for (const f of walk(built)) bad.push(...secrets(readFileSync(f, 'utf8'), relative(root, f)));
    expect(bad).toEqual([]);
  }, 60_000);
  // (the plan's own rules hold their shape (spec 00, S1 and S8): every rule of the constitution names its check and its state,
  // and a rule not yet enforced names the task that will enforce it, which exists; every decision record has its context,
  // the options weighed, the choice, the assumption it rests on and when to test it again)
  it('every rule names its check and its task, and every decision its options, choice, assumption and re-test', () => {
    const ids = new Set<string>();
    for (const d of readdirSync(join(root, 'plan/specs'))) { const sp = d.slice(0, 2), dir = join(root, 'plan/specs', d);
      if (existsSync(join(dir, 'tasks.json'))) for (const t of JSON.parse(readFileSync(join(dir, 'tasks.json'), 'utf8')).tasks as { id: string }[]) ids.add(`${sp} ${t.id}`);
      if (existsSync(join(dir, 'spec.md'))) for (const m of readFileSync(join(dir, 'spec.md'), 'utf8').matchAll(/^\| ([A-Z]+\d+) \|/gm)) ids.add(`${sp} ${m[1]}`); }
    // (a rule row however its id is written (bold too), a check that is a word standing in for one refused, a decision's
    // sections not empty and every file in decisions/ named as one: gaps the evaluator found, 2026-11-01)
    const bad: string[] = [], rows = readFileSync(join(root, 'plan/CONSTITUTION.md'), 'utf8').split('\n').filter((l) => /^\|\s*\**C\d+\**\s*\|/.test(l));
    expect(rows.length).toBeGreaterThan(20);
    for (const r of rows) { const c = r.split('|').map((x) => x.trim()), [id, , check, state] = [c[1]!, c[2]!, c[3]!, c[4]!];
      if (!check || /^(tbd|todo|tba|none|n\/a|-|\?+|…|\.\.\.)$/i.test(check.replace(/\*/g, '').trim())) bad.push(`${id}: no check named`);
      if (!/^(\*\*unenforced\*\*|enforced|partly)/.test(state)) bad.push(`${id}: its state says neither enforced, partly nor unenforced`);
      if (/unenforced|^partly/.test(state)) { const named = [...state.matchAll(/spec (\d\d), tasks? ([A-Z]+\d+)(?: and ([A-Z]+\d+))?/g)];
        if (/unenforced/.test(state) && !named.length) bad.push(`${id}: unenforced and names no task that will enforce it`);
        for (const m of named) for (const t of [m[2], m[3]].filter(Boolean)) if (!ids.has(`${m[1]} ${t}`)) bad.push(`${id}: names spec ${m[1]} task ${t}, which does not exist`); } }
    // (every decision a task cites, by its number, exists: deleting one a task rests on fails here (the evaluator, 2026-11-01))
    const have = new Set(readdirSync(join(root, 'plan/decisions')).map((f) => f.slice(0, 4)));
    for (const d of readdirSync(join(root, 'plan/specs'))) for (const f of ['tasks.json', 'spec.md']) { const p = join(root, 'plan/specs', d, f); if (!existsSync(p)) continue;
      for (const m of readFileSync(p, 'utf8').matchAll(/\bdecisions? (\d{4})(?:(?:,| and) (\d{4}))*/g)) for (const n of m[0].match(/\d{4}/g) ?? []) if (!have.has(n)) bad.push(`${d}/${f} cites decision ${n}, which does not exist`); }
    for (const f of readdirSync(join(root, 'plan/decisions')).filter((x) => x.endsWith('.md') && x !== 'README.md')) { const t = readFileSync(join(root, 'plan/decisions', f), 'utf8');
      if (!/^\d{4}-[a-z0-9-]+\.md$/.test(f)) bad.push(`${f}: a decision is named NNNN-words.md`);
      for (const h of ['## Context', '## Options', '## Choice', '## The assumption it rests on', '## When to test it again']) {
        const body = new RegExp(`^${h}\\s*\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm').exec(t)?.[1]?.trim();
        if (!t.includes(h)) bad.push(`${f}: no "${h}"`); else if (!body) bad.push(`${f}: "${h}" is empty`); } }
    expect(bad).toEqual([]);
  });
  // (the hooks (spec 00, S3; C10 to C13), each tried once on purpose: a push of what the gate did not pass; a commit past
  // its task's owners or naming no task; a number written with no command or test; a fourth gate run after three failures)
  it('each hook refuses what it is there to refuse', () => {
    expect(checkPush(null, 'abc').ok, 'no stamp').toBe(false);
    expect(checkPush({ tree: 'abc' }, 'abd').ok, 'another tree').toBe(false);
    expect(checkPush({ tree: 'abc' }, 'abc').ok).toBe(true);
    const owners = ownersFromPlan(join(root, 'plan'));
    expect(owners('00.S3'), 'the plan gives S3 its owners').toContain('scripts/');
    expect(checkBudget('[00.S3] the hooks', ['scripts/gate.mjs', 'tests/nexus/domains.test.ts', 'plan/INDEX.md'], owners, []).ok).toBe(true);
    expect(checkBudget('[00.S3] the hooks', ['scripts/gate.mjs', 'src/nexus/blocks.ts'], owners, []).ok, 'past its owners').toBe(false);
    expect(checkBudget('tidy', ['src/nexus/blocks.ts'], owners, []).ok, 'code with no task named').toBe(false);
    expect(checkBudget('tidy, decision 0010', ['src/nexus/blocks.ts'], owners, ['0010']).ok, 'a decision named').toBe(true);
    expect(checkBudget('a verdict', ['plan/specs/00-structure/verdicts/00.S3.json'], owners, []).ok, 'the plan alone').toBe(true);
    expect(checkBudget('[99.Z9] x', ['src/nexus/blocks.ts'], owners, []).ok, 'a task with no owners written').toBe(false);
    expect(checkHonesty(['The gate passed, 33 tests in 65.0 s.']).ok, 'a number with no command').toBe(false);
    expect(checkHonesty(['The gate (`npm run gate`) passed, 33 tests in 65.0 s.']).ok).toBe(true);
    expect(checkHonesty(entriesOf('## one\n\nThe gate (`npm run gate`) passed, 33 tests.\n\n## two\n\nThe engine runs 40 % faster.')).ok, 'an entry added beside another').toBe(false);
    expect(checkHonesty(['Fault D12 and task 10.T11 noted on 2026-11-01 at commit 5eb0103 (spec 04, step 3).']).ok, 'dates and ids are not measurements').toBe(true);
    expect(checkLoop({ '00.S3': { fails: 3, note: '' } }, '00.S3', '').ok, 'a fourth try').toBe(false);
    expect(checkLoop({ '00.S3': { fails: 3, note: '' } }, '00.S3', 'no: three separate faults').ok, 'answered').toBe(true);
    expect(checkLoop({ '00.S3': { fails: 2, note: '' } }, '00.S3', '').ok).toBe(true);
    expect(progressOf('Task in hand: 00.S3\npipeline: 00.S3: no\npipeline: 00.S2: x')).toEqual({ task: '00.S3', note: 'no' });
    // (the Claude Code hook stops a command that pushes, not one that only says the word: it once stopped one that did)
    for (const [c, w] of [['git push -u origin x', true], ['cd a && git push', true], ['git -C .. push origin b', true], ['npm run gate && git push -q', true],
      ['bash -c "git push"', true], ['xargs git push < refs', true], ['/usr/bin/git push origin x', true], ['echo "git push"', true],
      ['cat <<EOF\ngit push now\nEOF', false], ["echo git's pre-push hook", false], ['git commit -m "push it"', false]] as const) expect(pushes(c), c).toBe(w);
    expect(checkBudget('tidy, decision 9999', ['src/nexus/blocks.ts'], owners, ['0010']).ok, 'a decision that does not exist').toBe(false);
  });
  // (stop the line (spec 00, S10; C25): an open andon keeps its task, and every task that waits on it, from passing; each near
  // miss has its kind and its response; the AI in the app logs the near misses its runs caught)
  it('an open andon stops the line, and every near miss has its kind and its response', async () => {
    const rows = (f: string) => readFileSync(join(root, 'plan', f), 'utf8').split('\n').filter((l) => /^\| /.test(l) && !/^\| (Id|Date) \|/.test(l) && !/^\| -/.test(l)).map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
    const andons = rows('ANDON.md'), open = andons.filter((r) => !/^closed/.test(r[4]!)).map((r) => r[2]!), bad: string[] = [];
    const git = (...a: string[]) => spawnSync('git', a, { cwd: root, encoding: 'utf8' }), deep = git('rev-parse', '-q', '--verify', 'HEAD~3^{commit}').status === 0;
    for (const r of andons) { if (!/^\d\d\.[A-Z]+\d+$/.test(r[2]!) || !r[3]) bad.push(`andon ${r[0]}: needs a task and what failed`);
      else if (!readFileSync(join(root, 'plan/INDEX.md'), 'utf8').includes(`| ${r[2]!.slice(3)} |`) || !readdirSync(join(root, 'plan/specs')).some((d) => d.startsWith(r[2]!.slice(0, 2)))) bad.push(`andon ${r[0]}: ${r[2]} is not a task`);
      // (closed only by the change that fixes it, named: "closed <date> by commit <sha>", and the commit is real)
      if (/^closed/.test(r[4]!)) { const c = /^closed \d{4}-\d\d-\d\d by commit ([0-9a-f]{7,40})\b/.exec(r[4]!);
        if (!c) bad.push(`andon ${r[0]}: closed without naming the commit that fixed it`); else if (deep && git('cat-file', '-e', `${c[1]}^{commit}`).status !== 0) bad.push(`andon ${r[0]}: closed by ${c[1]}, which is not a commit`); } }
    const vd = join(root, 'plan/specs/00-structure/verdicts'), passing = (k: string) => existsSync(join(vd, `${k}.json`)) && JSON.parse(readFileSync(join(vd, `${k}.json`), 'utf8')).verdict === 'pass';
    // ("after" in every way the specs write it: "S3", "02 N3", "spec 04 P4", "V3 to V6", a whole spec ("spec 03", "01 (…)");
    // a research pass waited on is not a task (the prose forms were missed: the evaluator, 2026-11-01))
    const raw = new Map<string, { sp: string; after: string[] }>();
    for (const d of readdirSync(join(root, 'plan/specs'))) { const sp = d.slice(0, 2), f = join(root, 'plan/specs', d, 'tasks.json'), md = join(root, 'plan/specs', d, 'spec.md');
      if (existsSync(f)) for (const t of JSON.parse(readFileSync(f, 'utf8')).tasks as { id: string; after: string[] }[]) raw.set(`${sp}.${t.id}`, { sp, after: t.after });
      if (existsSync(md)) for (const m of readFileSync(md, 'utf8').matchAll(/^\| ([A-Z]+\d+) \|[^|]*\|[^|]*\| ([^|]*) \|/gm)) raw.set(`${sp}.${m[1]}`, { sp, after: m[2]!.replace(/—/g, '').split(',').map((x) => x.trim()).filter(Boolean) }); }
    const keys = [...raw.keys()], keysOf = (sp: string, x: string): string[] => {
      const y = x.replace(/^spec\s+/, ''); let m;
      if ((m = /^(\d\d)\s+([A-Z]+\d+)$/.exec(y))) return [`${m[1]}.${m[2]}`];
      if ((m = /^([A-Z]+)(\d+) to (?:[A-Z]+)?(\d+)$/.exec(y))) { const out: string[] = []; for (let i = Number(m[2]); i <= Number(m[3]); i++) out.push(`${sp}.${m[1]}${i}`); return out; }
      if ((m = /^(\d\d)\b(\s*\(.*\))?$/.exec(y))) return keys.filter((k) => k.startsWith(`${m![1]}.`));
      if (/^[A-Z]+\d+$/.test(y)) return [`${sp}.${y}`];
      return []; };
    const waits = new Map<string, string[]>([...raw].map(([k, v]) => [k, v.after.flatMap((x) => keysOf(v.sp, x))]));
    expect(waits.get('11.LW8'), '"spec 04 P4" read as 04.P4').toContain('04.P4');
    expect(waits.get('03.W4'), '"spec 00 S3" read as 00.S3').toContain('00.S3');
    // (every task downstream, through the whole chain of "after": C25 says nothing downstream is called done (a task two
    // steps down passed while the line was stopped, the evaluator found, 2026-11-01))
    const downstream = (k: string): Set<string> => { const out = new Set<string>(), todo = [k]; while (todo.length) { const x = todo.pop()!; for (const [t, a] of waits) if (a.includes(x) && !out.has(t)) { out.add(t); todo.push(t); } } return out; };
    for (const k of open) { if (passing(k)) bad.push(`${k} passes with an open andon`); for (const t of downstream(k)) if (passing(t)) bad.push(`${t} passes while ${k}, which it waits on (directly or not), has an open andon`); }
    // (each kind with the response it calls for: a reckless act calls for stopping and telling the user)
    for (const r of rows('NEAR-MISS.md')) { if (!['error', 'at-risk', 'reckless'].includes(r[2]!)) bad.push(`near miss "${r[1]!.slice(0, 40)}": kind ${r[2]}`); if (!r[4]) bad.push(`near miss "${r[1]!.slice(0, 40)}": no response`);
      if (r[2] === 'reckless' && !(/\bstop/i.test(r[4]!) && /\buser\b/i.test(r[4]!))) bad.push(`near miss "${r[1]!.slice(0, 40)}": reckless, and its response is not to stop and tell the user`);
      // (an error's response is the fix and the check added; an at-risk act's, the process changed: each names a check, a
      // test, a hook, a gate, a refusal, a rule or a decision, or shows the code)
      if ((r[2] === 'error' || r[2] === 'at-risk') && !/\b(check\w*|test\w*|hooks?|gates?|refus\w*|fails?|failing|rules?|decision|andon)\b|`/i.test(r[4]!)) bad.push(`near miss "${r[1]!.slice(0, 40)}": ${r[2]}, and its response names no check or change of process`); }
    expect(bad).toEqual([]);
    // (the AI's own run: a refusal said back, a tool that failed, a node that failed, numbers with no board, and going on past
    // a refusal without a word of it (reckless))
    const misses = nearMissesOf([{ tool: 'build', input: {}, result: '! wire k.value>s.rate: no input "rate"\ns ok rate=11308', ms: 1 }], 'It weighs 19.6 N.', emptyBoard('x'));
    expect(misses.map((m) => m.kind)).toEqual(['error', 'at-risk', 'reckless']);
    expect(nearMissesOf([{ tool: 'card', input: {}, result: 'no block "nope"', ms: 1, failed: true }, { tool: 'build', input: {}, result: 'n1 failed: division by zero', ms: 1 }], 'No number here.', emptyBoard('x')).map((m) => `${m.kind} ${m.tool}`)).toEqual(['error card', 'error build']);
    expect(nearMissesOf([{ tool: 'build', input: {}, result: '! wire a.x>b.y: no input "y"', ms: 1 }, { tool: 'change', input: {}, result: 'b ok y=2', ms: 1 }], 'Done.', emptyBoard('x')).map((m) => m.kind), 'a refusal corrected by a later change is not reckless').toEqual(['error']);
    expect(nearMissesOf([{ tool: 'build', input: {}, result: '! wire a.x>b.y: no input "y"', ms: 1 }], 'The wire into b was refused: b has no input y.', emptyBoard('x')).map((m) => m.kind), 'nor one the answer owns up to').toEqual(['error']);
    // (a board of many nodes: its failure past the record's 300 characters still caught, as agentBuild keeps the step)
    const long = [...Array.from({ length: 21 }, (_, i) => `n${i} ok out=${i}`), 'div failed: divided by zero', '! wire a.x>b.y: no input "y"'].join('\n');
    expect(long.length, 'the result is longer than the record keeps').toBeGreaterThan(300);
    expect(nearMissesOf([stepOf('build', {}, long, 1)], 'It is refused at b: no input y.', emptyBoard('x')).map((m) => m.what.slice(0, 16)), 'a failure past the cut').toEqual(['node div failed:', 'wire a.x>b.y: no']);
    // (the page shows them beside the answer: the view used, and what it shows)
    const view = nearMissesView(misses, (x) => x);
    for (const m of misses) expect(view, `the page shows the ${m.kind} near miss, its kind and its response`).toContain(`<b>${m.kind}</b> ${m.what} (${m.response})`);
    // (the run's own code, run for real with no stand-in model (C8): the tools agentBuild uses, a turn of calls through
    // callTools as agentBuild makes each turn, and runOf as it ends: a build of 23 blocks with a refused wire and a block
    // that fails past the record's 300-character cut, a card for a block that does not exist, then an answer that says
    // nothing of the refusal still standing (the evaluator, 2026-11-01))
    const tools = await toolsFor(emptyBoard('t')), steps: AgentStep[] = [];
    const nodes: Record<string, { b: string; s?: Record<string, unknown> }> = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`n${i}`, { b: 'in.number', s: { value: i + 1 } }]));
    nodes.z = { b: 'in.number', s: { value: 0 } }; nodes.div = { b: 'math.divide' };
    await callTools([{ id: '1', name: 'build', input: { nodes, wires: ['n0.value>div.a', 'z.value>div.b', 'n1.value>n2.nope'] } }, { id: '2', name: 'card', input: { id: 'nope.nope' } }], tools.doTool, steps);
    expect(steps[0]!.result.length, 'the build\'s record is cut').toBeLessThanOrEqual(300);
    const run = await runOf({ start: emptyBoard('t'), board: tools.board(), steps, answer: 'All done. The sum is 4.', model: 'm', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: tools.made });
    expect(run.nearMisses.map((m) => `${m.kind} ${m.tool}`), 'a refused wire, a block failed past the cut, a tool failed, an answer past a standing refusal').toEqual(['error build', 'error build', 'error card', 'reckless answer']);
    expect(run.nearMisses[1]!.what, 'the block that failed').toMatch(/^node div failed/);
    // (and through runOf its answer reaches the near misses: numbers with no board are at-risk; a refusal the answer owns
    // up to is an error only, not reckless (the answer dropped at runOf's door passed before: the evaluator, 2026-11-01))
    const rec = (st: AgentStep[], answer: string) => runOf({ start: emptyBoard('t'), board: emptyBoard('t'), steps: st, answer, model: 'm', tokens: { in: 0, out: 0, cached: 0, written: 0 }, made: [] }).then((x) => x.nearMisses.map((m) => m.kind));
    expect(await rec([], 'The spring weighs 19.6 N.'), 'numbers with no board').toEqual(['at-risk']);
    expect(await rec([stepOf('build', {}, '! wire a.x>b.y: no input "y"', 1)], 'The wire into b was refused: it has no input y.'), 'a refusal owned up to').toEqual(['error']);
    // (the page shows each near miss with its kind and its response, open when one is reckless, and it is called with the
    // run's own (the guard of this was lost in a rewrite once: the evaluator, 2026-11-01))
    const pageView = nearMissesView(run.nearMisses, (x) => x);
    for (const m of run.nearMisses) expect(pageView, `the page shows the ${m.kind} near miss, its kind and its response`).toContain(`<b>${m.kind}</b> ${m.what} (${m.response})`);
    expect(pageView, 'open when one is reckless').toMatch(/^<details open>/);
    expect(nearMissesView(run.nearMisses.filter((m) => m.kind !== 'reckless'), (x) => x), 'and only then').toMatch(/^<details>/);
    expect(readFileSync(join(root, 'src/nexus/view/nodes.ts'), 'utf8'), 'the page puts the run\'s near misses beside the answer').toContain('${nearMissesView(r.nearMisses, esc)}');
    // (a model's reply read by turnOf, as agentBuild reads every one: its answer every text block in order; its tool calls;
    // a refusal an error)
    expect(turnOf({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'All ' }, { type: 'thinking' }, { type: 'text', text: 'done.' }] })).toEqual({ ends: true, answer: 'All done.' });
    expect(turnOf({ stop_reason: 'tool_use', content: [{ type: 'text', text: 'first' }, { type: 'tool_use', id: 't1', name: 'build', input: { a: 1 } }] })).toEqual({ ends: false, uses: [{ id: 't1', name: 'build', input: { a: 1 } }] });
    expect(() => turnOf({ stop_reason: 'refusal', stop_details: { explanation: 'no' }, content: [] })).toThrow(/declined/);
    // (agentBuild passes each turn through callTools and ends through runOf with its steps and its answer: read exactly)
    const agentSrc = readFileSync(join(root, 'src/nexus/agent.ts'), 'utf8'), body = agentSrc.slice(agentSrc.indexOf('export async function agentBuild'), agentSrc.indexOf('export async function toolsFor'));
    expect(body, 'answered, it ends with its steps and its answer').toContain('return runOf({ start, board: t.board(), steps, answer, model: r.model');
    expect(body, 'stopped, with its steps').toContain("return runOf({ start, board: t.board(), steps, answer: '', model");
    expect(body.match(/return /g)?.length, 'and no other way').toBe(2);
    for (const line of ['const turn = turnOf(r);', 'if (turn.ends) { const answer = turn.answer;', 'content: await callTools(turn.uses, t.doTool, steps)']) expect(body, 'every reply read by turnOf, its calls by callTools').toContain(line);
    // (its loop's text pinned: a change to it (a step dropped between turns, an answer garbled) fails here until the loop is
    // read again and its new text pinned on purpose)
    const loop = body.slice(body.indexOf('for (let turn = 0'), body.indexOf("return runOf({ start, board: t.board(), steps, answer: ''"));
    expect(createHash('sha256').update(loop).digest('hex').slice(0, 16), "agentBuild's loop changed: read it again (each reply through turnOf, each turn's calls through callTools, its end through runOf) and pin its new text").toBe(LOOP_PIN);
    const relay = readFileSync(join(root, 'vite.view.config.ts'), 'utf8');
    for (const line of ["const r = await m.agentBuild(String(request ?? ''), { model, effort, board, blocks, seconds: 180, steps: 40 });", "res.end(m.relayBody(r));"]) expect(relay, 'the relay sends the run as agentBuild made it').toContain(line);
    // (the relay sends the page all of the run: its near misses, diff and certificates)
    const sent = JSON.parse(relayBody(run)) as AgentRun; expect(sent.nearMisses.length).toBe(4); expect(sent).toHaveProperty('diff'); expect(sent).toHaveProperty('certificates');
    expect(readFileSync(join(root, 'vite.view.config.ts'), 'utf8'), 'the relay answers with relayBody').toMatch(/res\.end\(m\.relayBody\(r\)\)/);
    expect(readFileSync(join(root, 'tests/evals/agent.eval.ts'), 'utf8'), 'the evaluation set prints each').toMatch(/for \(const m of \(row\.near[^)]*\)[^)]*\)\s*console\.log\(`\s*near miss/);
    expect(readFileSync(join(root, 'tests/evals/one.eval.ts'), 'utf8'), 'the one test prints each').toMatch(/for \(const m of r\.nearMisses\) console\.log\(`near miss/);
  });
  // (the kernel (spec 10, T23; research 31): closed (it imports nothing outside its folder, touches no host but BigInt and
  // DataView, and no file of it passes 250 lines); its unit table is the units' own; each kind passes what is true and
  // refuses three planted wrong certificates; every law in the book is certified or refused as undecided, never wrong,
  // and its value moved a millionth is refused; and a second checker, written apart in Python, agrees on every one)
  it('the kernel: closed, exact, each kind refusing what is planted, and a second checker agreeing', () => {
    const kdir = join(root, 'src/kernel'), files = readdirSync(kdir).filter((f) => f.endsWith('.ts'));
    for (const f of files) {
      const t = readFileSync(join(kdir, f), 'utf8'), code = t.split('\n').filter((l) => l.trim() && !/^\s*\/\//.test(l));
      for (const m of t.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/gm)) expect(m[1], `${f} imports only from its own folder`).toMatch(/^\.\/[\w.-]+$/);
      expect(t, `${f} loads nothing at run time`).not.toMatch(/\bimport\s*\(/);
      expect(t, `${f} uses no host but BigInt and DataView`).not.toMatch(/\b(Math\.|Date\b|fetch\(|document\.|window\.|globalThis|process\.|require\(|eval\(|Function\(|setTimeout|localStorage|XMLHttpRequest)/);
      expect(code.length, `${f} within 250 lines`).toBeLessThanOrEqual(250);
    }
    const table = JSON.parse(readFileSync(join(kdir, 'units.json'), 'utf8')), want = Object.fromEntries(Object.entries(UNITS).map(([k, v]) => [k, v.dim]));
    if (process.env.UPDATE_DOCS && JSON.stringify(table) !== JSON.stringify(want)) writeFileSync(join(kdir, 'units.json'), JSON.stringify(want) + '\n');
    else expect(table, "the kernel's unit table is the units' own (UPDATE_DOCS=1 writes it)").toEqual(want);
    const C = (kind: string, claim: unknown) => ({ kind, claim, trustedBase: [], producer: 'test' });
    const W = (term: unknown, at: Record<string, string>, value: string, rel = '1e-12') => C('witness', { term, at, value, tol: { rel, abs: '0' } });
    const fma = ['mul', ['var', 'm'], ['var', 'a']];
    const right = [C('dims', { wire: { from: 'N m', to: 'J' } }), C('dims', { law: { term: fma, vars: { m: 'kg', a: 'm/s^2' }, out: 'N' } }),
      W(fma, { m: '2', a: '3' }, '6'), W(['exp', ['var', 'x']], { x: '1' }, '2.718281828459045'), W(['pow', ['var', 'x'], '1/3'], { x: '27' }, '3')];
    const planted = { dims: [C('dims', { wire: { from: 'N', to: 'J' } }), C('dims', { law: { term: fma, vars: { m: 'kg', a: 'm/s^2' }, out: 'J' } }), C('dims', { law: { term: ['add', ['var', 'm'], ['var', 'a']], vars: { m: 'kg', a: 'm/s^2' }, out: 'N' } })],
      witness: [W(fma, { m: '2', a: '3' }, '6.000001'), W(['exp', ['var', 'x']], { x: '1' }, '2.7182'), W(['ln', ['var', 'x']], { x: '2' }, '0.69')],
      malformed: [{ ...C('dims', { wire: { from: 'N', to: 'N' } }), extra: 1 }, C('farkas', {}), W(['num', 3], {}, '3')] };
    for (const c of right) expect(check(c), JSON.stringify(c).slice(0, 80)).toMatchObject({ ok: true });
    for (const [k, cs] of Object.entries(planted)) for (const c of cs) { const v = check(c); expect(v.ok, `a planted ${k} certificate refused: ${JSON.stringify(c).slice(0, 80)}`).toBe(false); expect(v.refused).toBe(k === 'malformed' ? 'malformed' : 'wrong'); }
    expect(check(C('judged', { verdict: 'fine' })), 'a judge never passes (C29)').toMatchObject({ ok: false, level: 'judged' });
    const book: unknown[] = []; let undecided = 0;
    for (const l of BOOK) {
      const d = check(lawDims(l)); book.push(lawDims(l));
      if (!d.ok) { expect(d.refused, `${l.id}: its dimensions ${d.why}`).toBe('undecided'); expect(d.why).toMatch(/not in the kernel/); undecided++; }
      const ex = l.example; if (!ex) continue;
      const env = Object.fromEntries(l.inputs.filter((p) => ex.inputs[p.sym] !== undefined).map((p) => [p.sym, setting(p.name, ex.inputs[p.sym]!, p.unit, 'the worked example')]));
      const r = apply(l, env); if (r.value === null) continue; const out = fromSI(r.value, l.output.unit);
      const w = check(lawWitness(l, ex.inputs, out)), moved = lawWitness(l, ex.inputs, out * (1 + 1e-6)); book.push(lawWitness(l, ex.inputs, out), moved);
      if (!w.ok) { expect(w.refused, `${l.id}: its value ${w.why}`).toBe('undecided'); continue; }
      expect(check(moved).refused, `${l.id}: its value moved a millionth is refused`).toBe('wrong');
    }
    expect(undecided, 'laws the kernel cannot yet decide (erf, integrals)').toBeLessThanOrEqual(UNDECIDED_MOST);
    // (at the tolerance's edge, so a checker more lax or more strict than the claim disagrees: half the band inside, one
    // and a half outside)
    const edge = (x: string, f: string, v: number, k: number) => W([f, ['var', 'x']], { x }, String(v * (1 + k * 1e-9)), '1e-9');
    const edges = [edge('2', 'ln', Math.log(2), 0.5), edge('2', 'ln', Math.log(2), 1.5), edge('3', 'exp', Math.exp(3), 0.5), edge('3', 'exp', Math.exp(3), -1.5), edge('7', 'sqrt', Math.sqrt(7), 1.5)];
    expect(edges.map((c) => check(c).ok), 'inside the band passes, outside is refused').toEqual([true, false, true, false, false]);
    // (each enclosure lies within 1e-25 of the value Python's decimal module works out at 60 digits (the kernel keeps about 29 digits): a series cut short, or a bound
    // dropped that matters at this precision, leaves it outside)
    const pts = [['exp', '1'], ['exp', '-40'], ['exp', '0.001'], ['exp', '25.5'], ['ln', '2'], ['ln', '1e-9'], ['ln', '123456.789'], ['sqrt', '2'], ['sqrt', '1e-7']] as const;
    const ref = spawnSync('python3', ['-c', `import json,sys\nfrom decimal import Decimal as D, getcontext\ngetcontext().prec=60\nprint(json.dumps([str(getattr(D(x), {'exp':'exp','ln':'ln','sqrt':'sqrt'}[f])()) for f,x in json.loads(sys.argv[1])]))`, JSON.stringify(pts)], { encoding: 'utf8' });
    expect(ref.status, ref.stderr).toBe(0);
    (JSON.parse(ref.stdout) as string[]).forEach((r, i) => { const [f, x] = pts[i]!, v = check(W([f, ['var', 'x']], { x }, r, '1e-25')); expect(v.ok, `${f}(${x}) encloses ${r}: ${v.why.slice(0, 200)}`).toBe(true); });
    // (every false certificate a red team made the kernel pass (tests/nexus/kernel.red.json, 2026-11-01: whole powers past
    // 2^31 worked in 32 bits, an invisible character inside a unit, a dims claim with a wire and a law), each now refused by
    // both checkers)
    const red = JSON.parse(readFileSync(join(root, 'tests/nexus/kernel.red.json'), 'utf8')) as unknown[];
    expect(red.length, 'the red teams\' certificates').toBeGreaterThan(15);
    for (const c of red) { const t0 = performance.now(), v = check(c), ms = performance.now() - t0; expect(v.ok, `a red team's false certificate refused: ${JSON.stringify(c).slice(0, 120)}`).toBe(false); expect(ms, `checked in time: ${JSON.stringify(c).slice(0, 120)}`).toBeLessThan(2000); }
    // (a check ends in time however its legal steps are stacked (the red team, 2026-11-01: a power of a power of a power
    // of two ran 8 s, a product of 4000 powers of two 75 s): every value at every step is held to 2^±MAX_BITS, past it
    // undecided, in both checkers; a product of 4000 twos, within the bound, is decided; and where the two checkers work a
    // power alike (a half's power of zero, a half's power past 1024, a power by exp past 1000, a fraction too long, an
    // exponent too large) they refuse alike. (A claim with no tolerance at all can pass the kernel, which works exactly,
    // where the second, in decimals, is undecided: sound both ways, and not in the corpus))
    const two4000 = (2n ** 4000n).toString(), P2 = ['pow', ['num', '2'], '1024'];
    const budget = [W(['mul', ...Array(4000).fill(P2)], {}, '1', '0'), W(['mul', ...Array(4000).fill(['num', '2'])], {}, `${two4000[0]}.${two4000.slice(1, 30)}e${two4000.length - 1}`, '1e-20'),
      W(['pow', P2, '17'], {}, '1', '0'), C('witness', { term: ['pow', ['var', 'x'], '3/2'], at: { x: '0' }, value: '0', tol: { rel: '0', abs: '1e-12' } }), W(['pow', ['var', 'x'], '1501/2'], { x: '2' }, '1', '0'),
      W(['pow', ['var', 'x'], '5/3'], { x: '1e1000' }, '1', '0'), W(['var', 'x'], { x: `1/${'7'.repeat(400)}` }, '0', '0'), W(['var', 'x'], { x: '1e5000' }, '1e5000', '0')];
    const ruled = budget.map((c) => { const t0 = performance.now(), v = check(c); return { v, ms: performance.now() - t0 }; });
    expect(ruled.map((r) => (r.v.ok ? 'ok' : r.v.refused)), ruled.map((r) => r.v.why).join('; ')).toEqual(['undecided', 'ok', 'undecided', 'ok', 'undecided', 'undecided', 'malformed', 'malformed']);
    expect(ruled.map((r) => r.ms).filter((ms) => ms >= 2000), 'each decided in under 2 s').toEqual([]);
    // (sine and its kin, at points across their range, in the corpus both checkers judge)
    const trig = [['sin', '1'], ['sin', '-2.5'], ['sin', '100'], ['cos', '0.3'], ['cos', '3.14159'], ['tan', '1.2'], ['atan', '0.5'], ['atan', '-7'], ['asin', '0.3'], ['asin', '1'], ['acos', '-0.9']].flatMap(([f, x]) => {
      const v = (Math as unknown as Record<string, (n: number) => number>)[f!]!(Number(x)); return [W([f, ['var', 'x']], { x: x! }, String(v), '1e-12'), W([f, ['var', 'x']], { x: x! }, String(v * (1 + 1e-6)), '1e-9')]; });
    expect(trig.map((c) => check(c).ok), 'each true value passes, each moved a millionth is refused').toEqual(trig.map((_, i) => i % 2 === 0));
    const corpus = [...right, ...Object.values(planted).flat(), C('judged', {}), ...edges, ...red, ...trig, ...budget, ...book];
    const two = spawnSync('python3', ['scripts/kernel2.py'], { cwd: root, input: JSON.stringify(corpus), encoding: 'utf8', maxBuffer: 1 << 26 });
    expect(two.status, two.stderr).toBe(0);
    const theirs = JSON.parse(two.stdout) as { ok: boolean; refused: string | null }[];
    expect(red.map((_, i) => theirs[right.length + Object.values(planted).flat().length + 1 + edges.length + i]!.ok).filter(Boolean).length, 'the second checker passes none of them either').toBe(0);
    // (they agree on each verdict and, where both refuse, on why: wrong, undecided or malformed (the red team, 2026-11-01:
    // the kernel said malformed where the second said undecided, and only the verdicts were compared))
    const said = (v: { ok: boolean; refused?: string | null }) => (v.ok ? 'ok' : v.refused);
    const differ = corpus.map((c, i) => [said(check(c)), said(theirs[i]!), i] as const).filter(([a, b]) => a !== b);
    expect(differ.map(([a, b, i]) => `${i}: kernel ${a}, second ${b}: ${JSON.stringify(corpus[i]).slice(0, 120)}`), 'the two checkers agree, and on why they refuse').toEqual([]);
  }, 60_000);
  // (propose, then certify (spec 10, T18; C29): a change's certificates come from the boards and the nodes' own runs; the
  // kernel checks them with no second model; a planted wrong one stops the board being taken; every starter board with
  // law nodes is certified or undecided, never wrong)
  it('an AI change is taken only when the kernel refuses none of its certificates', async () => {
    const after = emptyBoard('change'); placeBlock(after, 'law.newton.second', 0, 0, {}, 'f');
    placeBlock(after, 'in.number', -200, 0, { value: 3, unit: 'kg' }, 'm'); placeBlock(after, 'in.number', -200, 100, { value: 2.5, unit: 'm/s^2' }, 'a');
    wire(after, 'm', 'value', 'f', 'm'); wire(after, 'a', 'value', 'f', 'a');
    const cut = await certifiedOf(emptyBoard('before'), after);
    expect(cut.diff.added.sort()).toEqual(['a', 'f', 'm']);
    const g = gateOf(cut.certificates);
    expect(g.verdicts.length, 'a certificate for the law node').toBeGreaterThan(0);
    expect(g.take, g.verdicts.map((v) => `${v.what}: ${v.refused} ${v.why}`).join('; ')).toBe(true);
    for (const v of g.verdicts) expect(v.ok, `${v.what}: ${v.why}`).toBe(true);
    // (planted: the law node's value moved; its point moved; a wire of a force into an energy)
    const law = cut.certificates.find((c) => c.certificate.kind === 'witness')!;
    const moved = structuredClone(law), claim = moved.certificate.claim as { value: string; at: Record<string, string> };
    claim.value = String(Number(claim.value) * 1.001);
    const shifted = structuredClone(law), at = (shifted.certificate.claim as { at: Record<string, string> }).at; at[Object.keys(at)[0]!] = String(Number(at[Object.keys(at)[0]!]) * 2 + 1);
    for (const bad of [moved, shifted, { what: 'a force wired into an energy', certificate: wireDims('N', 'J') }]) {
      const gb = gateOf([...cut.certificates, bad]); expect(gb.take, `not taken with ${bad.what} planted`).toBe(false);
      expect(certifiedView(cut.diff, gb, (x) => x), 'the page says it was not taken').toMatch(/Not taken/);
    }
    let laws = 0;
    for (const [title, make] of starterBoards()) {
      const b = make(); if (!nodesOf(b).some((n) => b.nodes[n.id]?.block?.startsWith('law.'))) continue;
      const c = await certifiedOf(emptyBoard('none'), b), gs = gateOf(c.certificates); laws += c.certificates.filter((x) => x.certificate.kind === 'witness').length;
      expect(gs.verdicts.filter((v) => v.refused === 'wrong').map((v) => `${title}: ${v.what}: ${v.why}`), 'no starter board certificate wrong').toEqual([]);
    }
    expect(laws, 'law nodes on the starter boards certified at the point they ran').toBeGreaterThan(0);
  }, 60_000);
  // (the interface record (spec 01, I2): every port and every old interface of a thing read as exactly one interface, with
  // an id no other shares, nothing changed by the reading; the ids as the last build wrote them (tests/nexus/
  // interfaces.ids.json, UPDATE_DOCS=1 writes it), so a second build in another process gives the same ids. The corpus: every
  // designed component at its example and three machines; every starter board's things is the task's whole check, not run
  // here (see its REALITY entry))
  it('every port and old interface of a thing is one interface with a stable id', () => {
    const things: [string, Part | Assembly][] = DESIGNED.map((f) => [f, use(exampleOf(f))]);
    for (const [id, words] of [['go kart', 'a go kart'], ['atv', 'a honda rancher'], ['semi truck', 'a freightliner cascadia']] as const) { const k = KITS.find((x) => x.id === id); expect(k, `the ${id} kit`).toBeTruthy(); things.push([words, makeKit(k!, words, 7).part]); }
    expect(things.length, 'the corpus').toBeGreaterThan(40);
    const ids: Record<string, string[]> = {}, kinds = new Set<string>(); let said = 0, framed = 0;
    for (const [name, t] of things) {
      let ports = 0, ifaces = 0; const count = (p: Part | Assembly): void => { ports += p.ports?.length ?? 0; if ('items' in p) { for (const it of p.items) count(it.of); return; } ifaces += p.iface?.length ?? 0; for (const k of p.parts ?? []) count(k); };
      count(t); const before = digest(t), r = interfacesOf(t);
      expect(r.list.filter((x) => 'port' in x.from).length, `${name}: one interface per port`).toBe(ports);
      expect(r.list.filter((x) => 'iface' in x.from).length, `${name}: one interface per old interface`).toBe(ifaces);
      expect(r.clashes, `${name}: no id two share`).toEqual([]);
      expect(digest(t), `${name}: nothing changed by reading it`).toBe(before);
      ids[name] = r.list.map((x) => x.id).sort(); for (const x of r.list) kinds.add(x.kind);
      // (frames where they can be told: a bolt's and a nut's by the components' convention; a bore or a shaft only where
      // the round piece drawn agrees with the size said within 0.5 mm, else none and why)
      for (const x of r.list) { if (!('iface' in x.from)) continue; said++; if (x.frame) framed++;
        if (x.kind === 'thread.external' && (x.size.n ?? 1) === 1) expect(x.frame, `${name}: ${x.id}, a bolt's shank, framed`).not.toBeNull();
        if ((x.kind === 'bore' || x.kind === 'shaft') && x.frame) expect(Math.abs(Number(x.size.drawn) - Number(x.size.d)), `${name}: ${x.id} framed where drawn and said agree`).toBeLessThanOrEqual(0.0005 + 1e-9);
        if ((x.kind === 'bore' || x.kind === 'shaft') && !x.frame) expect(x.says ?? '', `${name}: ${x.id} unframed, and why`).toMatch(/drawn/); }
    }
    expect(framed, 'old interfaces framed').toBeGreaterThan(0);
    expect([...kinds].sort(), 'the kinds the corpus holds').toEqual(expect.arrayContaining(['bore', 'frame', 'holes', 'shaft', 'thread.external', 'thread.internal']));
    const file = join(root, 'tests/nexus/interfaces.ids.json');
    if (process.env.UPDATE_DOCS || !existsSync(file)) writeFileSync(file, JSON.stringify(ids, null, 1) + '\n');
    else expect(ids, 'the same ids as the build that wrote tests/nexus/interfaces.ids.json (UPDATE_DOCS=1 writes it again)').toEqual(JSON.parse(readFileSync(file, 'utf8')));
  }, 60_000);
  // (interference as a gate (spec 10, T24; fault D8): no piece excused by its name; a bolt is excused against a part only
  // where a hole is cut in it on the bolt's axis: a bolt through a plate with no hole is caught, the same bolt in the
  // plate's hole is not)
  it('a bolt crossing a wall it does not pass through is caught', () => {
    const plate = (cuts?: Part['cuts']): Part => ({ name: 'wall plate', item: 'flat bar 60x6', shape: { box: [0.06, 0.006, 0.06] }, at: [0, -0.003, 0], mat: 'steel-low', ...(cuts ? { cuts } : {}) });
    const bolt = { ...boltedJoint('M8', 0.006), name: 'the bolt' };
    const without = rulesOf({ name: 'joint', parts: [plate(), bolt] }).findings.filter((f) => f.rule === 'interference');
    expect(without.map((f) => `${f.a} × ${f.b}`), 'a bolt through a wall with no hole').not.toEqual([]);
    const withHole = rulesOf({ name: 'joint', parts: [plate([{ r: 0.0045, depth: 0.006, at: [0, 0.003, 0], dir: [0, -1, 0] }]), bolt] }).findings.filter((f) => f.rule === 'interference' && /wall plate/.test(`${f.a} ${f.b}`));
    expect(withHole.map((f) => `${f.a} × ${f.b}: ${f.says}`), 'the same bolt in the hole cut for it').toEqual([]);
    expect(readFileSync(join(root, 'src/nexus/make/rules.ts'), 'utf8'), 'nothing excused by a name').not.toMatch(/fastenerRe|\bfastens\(/);
  }, 60_000);
  // (probes are deleted before the gate: one left behind was run by it, and once committed (2026-11-01)); looked for
  // wherever the gate's own include reaches (vite.config.ts), every folder down, not only the top of tests/nexus (the
  // evaluator planted one in tests/unit, tests/golden and a folder under tests/nexus, 2026-11-01)
  it('no probe is left where the gate runs', () => {
    const inc = /include:\s*\['tests\/\{([^}]+)\}\/\*\*\/\*\.test\.ts'\]/.exec(readFileSync(join(root, 'vite.config.ts'), 'utf8'));
    expect(inc, "the gate's include, read from vite.config.ts").toBeTruthy();
    const walk = (d: string): string[] => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]) : [];
    expect(inc![1]!.split(',').flatMap((d) => walk(join(root, 'tests', d.trim()))).filter((f) => /(^|\/)zz_/.test(f)).map((f) => relative(root, f))).toEqual([]);
  });
  // (the hooks as installed, not only their functions (the evaluator found the wiring broken where the functions passed):
  // a throwaway repository with the real hook scripts, git's hooks on, and each refusal tried, in the clone and in a linked
  // worktree; and the push check given two branches, the one the gate did not pass first)
  it('the hooks, installed in a repository, refuse in a clone and in a linked worktree', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'hooks-')), top = join(tmp, 'repo'), proj = join(top, 'vr-sandbox'), env = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };
    for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) delete (env as Record<string, unknown>)[k];
    const sh = (cwd: string, ...a: string[]) => spawnSync('git', a, { cwd, env, encoding: 'utf8' });
    try {
      cpSync(join(root, 'scripts'), join(proj, 'scripts'), { recursive: true });
      for (const f of ['plan/specs/00-structure/tasks.json', 'plan/owners.json', 'plan/decisions/0010-consolidation.md']) cpSync(join(root, f), join(proj, f), { recursive: true });
      mkdirSync(join(proj, 'docs'), { recursive: true }); mkdirSync(join(proj, 'src'), { recursive: true });
      writeFileSync(join(proj, 'docs/REALITY.md'), '# log\n'); writeFileSync(join(proj, 'src/x.ts'), 'export const x = 1;\n'); writeFileSync(join(proj, '.gitignore'), '.gate-ok\n');
      sh(top, 'init', '-q'); sh(top, 'config', 'core.hooksPath', 'vr-sandbox/scripts/hooks/git'); sh(top, 'add', '-A'); expect(sh(top, 'commit', '-q', '--no-verify', '-m', 'start').status).toBe(0);
      const tryCommit = (cwd: string, file: string, text: string, msg: string) => { writeFileSync(join(cwd, file), text, { flag: 'a' }); sh(cwd, 'add', '-A'); const r = sh(cwd, 'commit', '-q', '-m', msg); if (r.status !== 0) sh(cwd, 'reset', '-q', '--hard'); else sh(cwd, 'reset', '-q', '--hard', 'HEAD~1'); return r; };
      expect(tryCommit(proj, 'src/x.ts', '// more\n', '[00.S3] past its owners').status, 'a commit past its owners').not.toBe(0);
      expect(tryCommit(proj, 'src/x.ts', '// more\n', 'decision 9999').status, 'a decision that does not exist').not.toBe(0);
      expect(tryCommit(proj, 'docs/REALITY.md', '\n## e\n\nIt runs 40 % faster.\n', 'a log entry').status, 'a number with no command').not.toBe(0);
      expect(tryCommit(proj, 'docs/REALITY.md', '\n## e\n\nIt passed (`npm run gate`), 40 tests.\n', 'a log entry').status, 'with its command').toBe(0);
      expect(sh(top, 'worktree', 'add', '-q', join(tmp, 'wt')).status).toBe(0);
      expect(tryCommit(join(tmp, 'wt', 'vr-sandbox'), 'src/x.ts', '// more\n', '[00.S3] past its owners, from a worktree').status, 'the same refusal in a linked worktree').not.toBe(0);
      // (the push check: a stamp of the tree at HEAD; an ungated commit pushed first beside it is refused)
      const head = sh(top, 'rev-parse', 'HEAD').stdout.trim(), tree = sh(top, 'rev-parse', 'HEAD:vr-sandbox').stdout.trim();
      writeFileSync(join(proj, '.gate-ok'), JSON.stringify({ tree }));
      writeFileSync(join(proj, 'src/x.ts'), '// ungated\n', { flag: 'a' }); sh(top, 'add', '-A'); sh(top, 'commit', '-q', '--no-verify', '-m', 'ungated'); const ungated = sh(top, 'rev-parse', 'HEAD').stdout.trim(); sh(top, 'reset', '-q', '--hard', head);
      const check = (refs: string[]) => spawnSync('node', [join(proj, 'scripts/hooks/push-check.mjs')], { cwd: top, env, input: refs.map((r) => `refs/heads/b ${r} refs/heads/b ${'0'.repeat(40)}`).join('\n'), encoding: 'utf8' }).status;
      expect(check([head]), 'the stamped commit').toBe(0);
      expect(check([ungated, head]), 'an ungated branch pushed beside a stamped one').not.toBe(0);
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  }, 60_000);
  // (the session's handoff (spec 00, S2): PROGRESS.md is short and true to where the work stands, so a fresh session finds the
  // spec in hand and the next task in two reads: the spec it names exists and holds the task in hand; the task in hand and
  // the next three exist and are not passing (the next three not claimed either, and from the start queue); the commit it
  // names is real, an ancestor of HEAD and at most three behind it; and CLAUDE.md still routes to it and holds the loop.
  // The states are read from plan/INDEX.md, which the next test proves is compiled from the plan as it stands. (A first
  // version checked the form only: a wrong spec, a passing task in hand, next tasks that do not exist, a commit 0000000
  // and a file six commits stale all passed it (the evaluator, 2026-11-01).))
  it('PROGRESS.md is short and true to where the work stands', () => {
    const t = readFileSync(join(root, 'PROGRESS.md'), 'utf8');
    expect(t.split('\n').length, 'under 40 lines').toBeLessThan(40);
    const index = readFileSync(join(root, 'plan/INDEX.md'), 'utf8'), state = new Map<string, string>();
    let spec = '';
    for (const l of index.split('\n')) { const h = /^### (\d\d)-/.exec(l); if (h) spec = h[1]!; const r = /^\| ([A-Z]+\d+) \|.*\| ([^|]+) \|$/.exec(l); if (spec && r) state.set(`${spec}.${r[1]}`, r[2]!.trim()); }
    expect(state.size, 'task states read from plan/INDEX.md').toBeGreaterThan(50);
    const m = /^Task in hand: (\d\d\.[A-Z]+\d+)/m.exec(t); expect(m, 'a "Task in hand: NN.ID" line').toBeTruthy();
    const inHand = m![1]!;
    expect(state.has(inHand), `task ${inHand} exists`).toBe(true);
    expect(state.get(inHand), `${inHand}, the task in hand, is not passing`).not.toMatch(/^passing/);
    const sp = /^Spec in hand: spec (\d\d)\b.*?`(plan\/specs\/[^`]+?)\/?`/m.exec(t); expect(sp, 'a "Spec in hand: spec NN, … (`plan/specs/NN-…/`)" line').toBeTruthy();
    expect(existsSync(join(root, sp![2]!)) && sp![2]!.startsWith(`plan/specs/${sp![1]}-`), `${sp![2]} is spec ${sp![1]}'s folder`).toBe(true);
    expect(inHand.startsWith(`${sp![1]}.`), `the task in hand, ${inHand}, is in the spec in hand, ${sp![1]}`).toBe(true);
    const next = /^## Next three[^\n]*\n([\s\S]*?)(?=^## )/m.exec(t)?.[1] ?? '', ids = [...new Set(next.match(/\b\d\d\.[A-Z]+\d+\b/g) ?? [])];
    expect(ids.length, 'the next three name tasks').toBeGreaterThan(0);
    const queue = /^## The start queue[\s\S]*?(?=^## )/m.exec(readFileSync(join(root, 'plan/README.md'), 'utf8'))?.[0] ?? '';
    const queued = [...queue.matchAll(/\b(\d\d\.[A-Z]+\d+)\b/g)].map((q) => q[1]!), open = queued.filter((k) => !/^(passing|claimed)/.test(state.get(k) ?? '') && k !== inHand);
    for (const k of ids) {
      expect(state.has(k), `${k}, named next, exists`).toBe(true);
      expect(k, 'the task in hand is not also named next').not.toBe(inHand);
      expect(state.get(k), `${k}, named next, is neither passing nor claimed`).not.toMatch(/^(passing|claimed)/);
      if (open.length >= 3) expect(queued, `${k}, named next, is in the start queue (plan/README.md), which still has ${open.length} open`).toContain(k);
    }
    const c = /^Last commit the gate passed: ([0-9a-f]{7,40})\b/m.exec(t); expect(c, 'a "Last commit the gate passed: <sha>" line').toBeTruthy();
    const git = (...a: string[]) => spawnSync('git', a, { cwd: root, encoding: 'utf8' });
    // (a shallow clone too short to hold three commits (CI checks out one) cannot judge the commit; any deeper history must)
    if (git('rev-parse', '-q', '--verify', 'HEAD~3^{commit}').status === 0) {
      expect(git('cat-file', '-e', `${c![1]}^{commit}`).status, `${c![1]} is a commit`).toBe(0);
      expect(git('merge-base', '--is-ancestor', c![1]!, 'HEAD').status, `${c![1]} is an ancestor of HEAD`).toBe(0);
      expect(Number(git('rev-list', '--count', `${c![1]}..HEAD`).stdout.trim()), `${c![1]} is at most three commits behind HEAD (rewrite PROGRESS.md as the loop says)`).toBeLessThanOrEqual(3);
    }
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8');
    expect(/^\| What is next[^\n]*`PROGRESS\.md`/m.test(claude), 'CLAUDE.md routes "what is next" to PROGRESS.md').toBe(true);
    expect(/read `PROGRESS\.md`[\s\S]*?then rewrite `PROGRESS\.md`/.test(claude), 'CLAUDE.md holds the session loop, from reading PROGRESS.md to rewriting it').toBe(true);
  });
  // (the plan's index is the plan as it stands: compiled again, nothing differs, and the plan has no problem)
  it('plan/INDEX.md is what the plan compiles to', () => {
    const r = spawnSync('python3', ['plan/compile.py', '--check'], { cwd: root, encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
  });
  // (only the evaluator passes a task (spec 00, S7): a task marked passing has the evaluator's pass in its verdict file)
  it('no task is marked passing but by the evaluator', () => {
    const vd = join(root, 'plan/specs/00-structure/verdicts'), bad: string[] = [];
    for (const d of readdirSync(join(root, 'plan/specs'))) { const f = join(root, 'plan/specs', d, 'tasks.json'); if (!existsSync(f)) continue;
      for (const t of JSON.parse(readFileSync(f, 'utf8')).tasks as { id: string; status: string }[]) if (/^passing/.test(t.status)) {
        const v = join(vd, `${d.slice(0, 2)}.${t.id}.json`); if (!existsSync(v) || JSON.parse(readFileSync(v, 'utf8')).verdict !== 'pass') bad.push(`${d.slice(0, 2)}.${t.id}`); } }
    for (const f of readdirSync(vd).filter((x) => x.endsWith('.json'))) { const v = JSON.parse(readFileSync(join(vd, f), 'utf8')); if (v.task !== f.replace(/\.json$/, '')) bad.push(`${f} names its task ${v.task}`); if (!['pass', 'fail'].includes(v.verdict)) bad.push(`${f}: verdict ${v.verdict}`); }
    expect(bad, 'marked passing with no pass from the evaluator').toEqual([]);
  });
  // (keys tell apart what the old writing could not (spec 11, LW15; fault D6): two Maps, two Sets, NaN and null, −0 and 0,
  // two functions, a typed array's kind; and the same value, built in another order, keys the same)
  // (the engine's keys use it: a node fed a Map changed to another Map, which the old writing wrote the same ({}), runs
  // again and gives the new answer; the evaluator found the gate passing with the old writing put back (2026-11-01))
  it('a node fed a Map that changes runs again', async () => {
    const mk = (id: string, ports: BlockDef['ports'], run: BlockDef['run']): BlockDef => ({ id, name: id, kind: 'calculator', ability: 'calculate', domains: [], says: 'a block for this test only', version: 1, by: 'a test', pure: true, ports, run } as unknown as BlockDef);
    LIBRARY.set('zz.map', mk('zz.map', { inputs: [], outputs: [{ name: 'm', type: 'any' }] }, (_i, c) => ({ m: new Map([['k', Number(c.set.n)]]) })));
    LIBRARY.set('zz.read', mk('zz.read', { inputs: [{ name: 'm', type: 'any' }], outputs: [{ name: 'v', type: 'number' }] }, (i) => ({ v: (i.m as Map<string, number>).get('k') })));
    try {
      const b = emptyBoard('map'); placeBlock(b, 'zz.map', 0, 0, { n: 1 }, 'a'); placeBlock(b, 'zz.read', 0, 0, {}, 'r'); wire(b, 'a', 'm', 'r', 'm');
      const e = new Engine(b, env, new Memo()); await e.run(); expect(e.state.get('r')?.out?.v).toBe(1);
      b.nodes.a!.set = { n: 2 }; e.touch('a'); await e.run();
      expect(e.state.get('r')?.out?.v, 'the reader saw the new Map').toBe(2);
    } finally { LIBRARY.delete('zz.map'); LIBRARY.delete('zz.read'); }
  });
  it('a value\'s digest tells apart what is different and only that', () => {
    const differ: [unknown, unknown][] = [[new Map([[1, 2]]), new Map()], [new Set([1]), new Set([2])], [NaN, null], [-0, 0], [() => 1, () => 1],
      [new Float32Array([1]), new Float64Array([1])], [{ a: undefined }, {}], [new Map([[1, 2]]), { 1: 2 }],
      [new Float64Array([1, 2]), new Float64Array([1, 3])], [new (class Bolt { d = 8 })(), new (class Nut { d = 8 })()]];
    for (const [a, b] of differ) expect(digest(a), `${digest(a)} against ${digest(b)}`).not.toBe(digest(b));
    expect(digest(new Map([[1, 'a'], [2, 'b']]))).toBe(digest(new Map([[2, 'b'], [1, 'a']])));
    expect(digest(new Set([3, 1]))).toBe(digest(new Set([1, 3])));
    expect(digest({ b: 1, a: [1, { c: 2 }] })).toBe(digest({ a: [1, { c: 2 }], b: 1 }));
    const loop: Record<string, unknown> = { a: 1 }; loop.self = loop; expect(digest(loop)).toContain('<loop');
  });
  it('the guide\'s plan runs, and a wire into a missing input is refused', async () => {
    const guide = readFileSync(join(root, 'docs/FOR-AI.md'), 'utf8'), plan = JSON.parse(/`(\{"nodes".*?\})`/.exec(guide)![1]!) as { nodes: Record<string, { b: string; s?: Record<string, unknown> }>; wires: string[] };
    const b = emptyBoard('guide');
    for (const [nm, n] of Object.entries(plan.nodes)) { const d = LIBRARY.get(n.b)!; expect(d, n.b).toBeTruthy(); placeBlock(b, d.id, 0, 0, { ...defaultsOf(d), ...(n.s ?? {}) }, nm); }
    for (const w of plan.wires) { const [f, t] = w.split('>'), [a, o] = f!.split('.'), [c, i] = t!.split('.'); wire(b, a!, o!, c!, i!); }
    const e = new Engine(b); await e.run(); expect([...e.state.values()].every((s) => s.status === 'ok')).toBe(true);
    expect(() => wire(b, 'k', 'value', 's', 'rate')).toThrow(/no input "rate"/);
  }, 60_000);
  // (the context's routing is absolute too: every source file is named in CLAUDE.md or docs/OWNERS.md, by its file or
  // its folder, so whoever works here is routed to every file by the owners table)
  it('every source file has an owner in the docs', () => {
    const said = readFileSync(join(root, 'CLAUDE.md'), 'utf8') + readFileSync(join(root, 'docs/OWNERS.md'), 'utf8');
    const orphan = sources().map((f) => relative(join(root, 'src'), f)).filter((f) => { const dir = dirname(f), base = f.split('/').pop()!;
      // (a file directly in src/nexus/ is named by its own name: a row naming the folder "nexus/" excused all of them, so
      // the test passed with interfaces.ts named or not (the evaluator, 2026-11-01); a subfolder may be named whole)
      if (dir === 'nexus' || dir === '.') return !said.includes(base);
      return !said.includes(base) && !said.includes(`${dir}/\``) && !said.includes(`${dir.replace(/^nexus\//, '')}/\``) && !said.includes(`\`${dir}/`) && !said.includes(`${dir.replace(/^nexus\//, '')}/\` `); });
    // (the interface record's owner named in both, as its task says (spec 01, I1))
    for (const doc of ['CLAUDE.md', 'docs/OWNERS.md']) expect(readFileSync(join(root, doc), 'utf8'), `${doc} names interfaces.ts`).toMatch(/interfaces\.ts/);
    expect(orphan, `files no owner row names: ${orphan.join(', ')}`).toEqual([]);
    // (and every document is routed to from CLAUDE.md's table, and every document it routes to is there)
    const claude = readFileSync(join(root, 'CLAUDE.md'), 'utf8'), docs = readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md'));
    expect(docs.filter((f) => !claude.includes(`docs/${f}`)), 'documents CLAUDE.md does not route to').toEqual([]);
    expect([...claude.matchAll(/docs\/([A-Z-]+\.md)/g)].map((m) => m[1]!).filter((f) => !docs.includes(f)), 'documents CLAUDE.md routes to that are not there').toEqual([]);
    // (the plan is routed the same way (spec 00, task S6): CLAUDE.md routes to plan/README.md; every file in plan/ is named
    // there by its name, or lies in a folder named there (a spec's folder, decisions/, research/); every path it names is there)
    expect(claude.includes('plan/README.md'), 'CLAUDE.md routes to plan/README.md').toBe(true);
    const planDir = join(root, 'plan'), readme = readFileSync(join(planDir, 'README.md'), 'utf8');
    const planFiles = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? planFiles(join(d, e.name)) : [relative(planDir, join(d, e.name))]);
    const routed = (f: string) => { const parts = f.split('/'); return parts.length === 1 ? readme.includes(`\`${f}\``) : ['decisions', 'research'].includes(parts[0]!) ? readme.includes(`${parts[0]}/`) : readme.includes(`${parts.slice(0, -1).join('/')}/`); };
    expect(planFiles(planDir).filter((f) => f !== 'README.md' && !f.includes('__pycache__') && !routed(f)), 'plan files plan/README.md does not route to').toEqual([]);
    const named = [...readme.matchAll(/`((?:specs|decisions|research)\/[\w./-]*|[A-Z][\w-]*\.(?:md|py)|[a-z]+\.py)`/g)].map((m) => m[1]!);
    expect(named.filter((f) => !f.includes('NN') && !existsSync(join(planDir, f.replace(/\/$/, '')))), 'paths plan/README.md names that are not there').toEqual([]);
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
        // (a cached run equals a fresh one (spec 11, LW15): every node touched and run again, served from the cache, gives
        // what it gave; and the board run anew with a cache of its own, nothing remembered, gives the same, node by node)
        // (a block not pure (it reads the clock, the gauntlet's state, the web) is never served from the cache, so it is not
        // compared; nor is a port that measures the run itself, its time or speed)
        const outs = (x: Engine) => new Map([...x.state].filter(([id, s]) => s.status === 'ok' && LIBRARY.get(x.board.nodes[id]!.block!)?.pure).map(([id, s]) => {
          const skip = new Set(x.ports(id).outputs.filter((p) => p.measured).map((p) => p.name));
          return [id, digest(Object.fromEntries(Object.entries(s.out ?? {}).filter(([k]) => !skip.has(k))))];
        }));
        const first = outs(e);
        for (const id of e.sequence) e.touch(id);
        await e.run();
        const again = outs(e), memo = new Memo(), f = new Engine(board![1](), env, memo); await f.run(); const fresh = outs(f);
        // (and a third engine on the fresh one's memo: every pure node served from that shared cache, never run)
        const h = new Engine(board![1](), env, memo); await h.run(); const hit = outs(h);
        const unserved = [...hit.keys()].filter((id) => !h.state.get(id)?.cached);
        if (unserved.length) bad.push(`board "${quick}": ${unserved.length} pure nodes ran again with their answers in the shared cache (${unserved.slice(0, 3).join(', ')})`);
        for (const [id, dg] of first) {
          if (again.get(id) !== dg) bad.push(`board "${quick}": ${b.nodes[id]?.label || id} gives another answer when run again from the cache`);
          if (fresh.get(id) !== dg) bad.push(`board "${quick}": ${b.nodes[id]?.label || id} gives another answer run fresh than from the cache`);
          if (hit.get(id) !== dg) bad.push(`board "${quick}": ${b.nodes[id]?.label || id} gives another answer served from the shared cache`);
        }
      }
      expect(bad).toEqual([]);
    }, 60_000);
  }
  afterAll(() => {
    const all = new Set(Object.values(queue).flat());
    console.log(`before the update, to re-check: ${all.size} of ${LIBRARY.size} nodes\n${Object.entries(queue).filter(([, q]) => q.length).map(([n, q]) => `  ${n}: ${q.length}`).join('\n')}`);
  });
});
